import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AciService } from '../aci/aci.service';
import { FunctionExecutionResult } from '@aci-sdk/aci';

interface TestCase {
  id?: number;
  input: string;
  expectedOutput?: string;
}

export interface TestCaseResult {
  id?: number;
  passed: boolean;
  output: string;
  expectedOutput: string;
  error: string | null;
  executionTime: number; // milliseconds
}

export interface ExecutionResult {
  compileError: string | null;
  results: TestCaseResult[];
  allPassed: boolean;
}

// A mapping from our internal language name to the Daytona Image ID.
const LANGUAGE_TO_IMAGE_ID: Record<'python' | 'cpp', string> = {
  python: 'daytonaio/sandbox:0.3.0',
  cpp: 'daytonaio/sandbox:0.3.0',
};

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(private readonly aciService: AciService) {}

  /**
   * Executes user's Python code against a set of test cases using a single
   * command in a Daytona workspace.
   */
  async executeCode(
    code: string,
    language: 'python' | 'cpp',
    testCases: TestCase[],
  ): Promise<ExecutionResult> {
    if (language !== 'python') {
      throw new Error(
        'Code execution is currently only supported for Python.',
      );
    }

    const workspaceId = await this.createWorkspace(language);

    try {
      // Build unified command with sh -c to ensure proper pipe handling
      const command = this.buildPythonExecutionCommand(code, testCases);
      this.logger.log(`[DEBUG] Executing harness command: ${command}`);

      // Execute the harness with generous timeout
      const { exitCode, result } = await this.executeCommand(
        workspaceId,
        command,
        120,
      );

      this.logger.log(`[DEBUG] Harness result raw: exitCode=${exitCode}, stdout/err length=${result.length}`);

      if (exitCode !== 0) {
        // This indicates the test runner script itself crashed.
        this.logger.error(`Test harness failed with exit code ${exitCode}`);
        return {
          compileError: `Test harness execution failed. Error: ${result}`,
          results: [],
          allPassed: false,
        };
      }

      try {
        const results: TestCaseResult[] = JSON.parse(result);
        const allPassed = results.every(r=>r.passed);
        return {compileError:null, results, allPassed};
      } catch(e){
        this.logger.error('JSON parse error',e);
        return {compileError:'Malformed harness output',results:[],allPassed:false};
      }
    } finally {
      // CRITICAL: Always clean up the workspace
      await this.deleteWorkspace(workspaceId);
    }
  }

  /**
   * Generates a self-contained shell command that writes the user's code and a
   * test runner to files, executes the runner, and prints JSON results.
   */
  private buildPythonExecutionCommand(
    code: string,
    testCases: TestCase[],
  ): string {
    let finalTestCases: TestCase[] = testCases ?? [];
    if (finalTestCases.length === 0) {
      this.logger.warn(
        'No test cases supplied for problem – inserting dummy assert True.',
      );
      finalTestCases = [{ input: 'assert True' }];
    }

    // ---------------------------------------------------------------------
    // 2. Build the harness script
    // ---------------------------------------------------------------------
    const userCodeB64 = Buffer.from(code, 'utf-8').toString('base64');

    /*
      Harness strategy:
        – Decode user code and attempt to exec once in `user_globals`.
          Any exception here is treated as a compile/runtime error and causes
          immediate exit (non-zero) with the traceback printed to stderr.
        – Iterate over TEST_CASES.  Each case may be one of two styles:
            a) assertion-style:   input starts with the keyword "assert"
            b) stdin/stdout style: expectedOutput is provided
          For (a) we simply exec the assertion in the same globals and mark
          pass/fail depending on raised AssertionError / other Exception.
          For (b) we replicate the previous behaviour of piping stdin and
          comparing captured stdout to expectedOutput.
        – Results are appended to a list and finally JSON-dumped to stdout so
          the outer service can parse it.
    */

    const harnessScript = `
import sys, json, time, traceback, io, base64, contextlib

# ---------------- USER CODE ----------------
USER_CODE_SRC = base64.b64decode('${userCodeB64}').decode('utf-8')
user_globals = {}
try:
    # Suppress any prints during initial import/definition phase
    with contextlib.redirect_stdout(io.StringIO()):
        exec(USER_CODE_SRC, user_globals)
except Exception:
    # Early failure – treat as compile/runtime error before tests start.
    sys.stderr.write(traceback.format_exc())
    sys.exit(1)

# ---------------- TEST HARNESS ------------
TEST_CASES = json.loads("""${JSON.stringify(finalTestCases)}""")

results = []
if not TEST_CASES:
    TEST_CASES = [{"input": "assert True", "expectedOutput": ""}]

for case in TEST_CASES:
    start_time = time.time()
    inp = case.get('input', '')
    expected = case.get('expectedOutput', None)
    res = {
        'id': case.get('id'),
        'passed': False,
        'output': '',
        'expectedOutput': expected,
        'error': None,
        'executionTime': 0,
    }

    try:
        if inp.strip().startswith('assert'):
            # Style (a): assertion provided directly
            with contextlib.redirect_stdout(io.StringIO()):
                exec(inp, user_globals)
            res['passed'] = True
        else:
            # Style (b): stdin/stdout comparison
            stdout_buf = io.StringIO()
            old_stdout, old_stdin = sys.stdout, sys.stdin
            sys.stdout = stdout_buf
            sys.stdin = io.StringIO(inp)
            try:
                # Re-exec user code so main-guard style solutions run each time
                exec(USER_CODE_SRC, user_globals)
            finally:
                sys.stdout = old_stdout
                sys.stdin = old_stdin

            res['output'] = stdout_buf.getvalue().strip()
            res['passed'] = (expected is None) or (res['output'] == str(expected).strip())
    except AssertionError as ae:
        res['error'] = 'AssertionError: ' + str(ae)
    except Exception:
        res['error'] = traceback.format_exc()
    finally:
        res['executionTime'] = int((time.time() - start_time) * 1000)
        results.append(res)

print(json.dumps(results))`;

    const combinedB64 = Buffer.from(harnessScript, 'utf-8').toString('base64');

    const shellCommand = `sh -c "echo '${combinedB64}' | base64 -d | python3 -"`;

    return shellCommand;
  }

  // ---------------------------------------------------------------------------
  // Internal helper methods
  // ---------------------------------------------------------------------------

  private async createWorkspace(language: 'python' | 'cpp'): Promise<string> {
    const name = `sub-${randomUUID()}`;
    const imageId = LANGUAGE_TO_IMAGE_ID[language];
    if (!imageId) {
      throw new Error(`Unsupported language for sandbox: ${language}`);
    }

    const createResp = await this.aciService.client.functions.execute({
      function_name: 'DAYTONA__CREATE_WORKSPACE',
      function_parameters: {
        body: {
          name,
          imageId,
        },
      },
      linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
    });

    if (!createResp.success) {
      this.logger.error(`Failed to create workspace: ${createResp.error}`);
      throw new Error('Workspace creation failed');
    }

    const workspaceId = createResp.data?.id ?? createResp.data?.workspace_id;

    if (!workspaceId) {
      this.logger.error(
        `Workspace creation succeeded but no ID was returned. Response: ${JSON.stringify(
          createResp.data,
        )}`,
      );
      throw new Error('Workspace creation failed to return an ID');
    }

    // Start workspace (required before commands)
    await this.aciService.client.functions.execute({
      function_name: 'DAYTONA__START_WORKSPACE',
      function_parameters: {
        path: {
          workspaceId: workspaceId,
        },
      },
      linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
    });

    return workspaceId;
  }

  private async deleteWorkspace(workspaceId: string) {
    if (!workspaceId) return;
    try {
      await this.aciService.client.functions.execute({
        function_name: 'DAYTONA__DELETE_WORKSPACE',
        function_parameters: {
          path: {
            workspaceId: workspaceId,
          },
          query: {
            force: true, // Required by the function schema
          },
        },
        linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
      });
    } catch (err) {
      this.logger.warn(`Failed to delete workspace ${workspaceId}: ${err}`);
    }
  }

  private async executeCommand(
    workspaceId: string,
    command: string,
    timeoutSeconds = 10,
  ): Promise<{ exitCode: number; result: any }> {
    this.logger.log(`Executing command in workspace ${workspaceId}: ${command}`);

    const res: FunctionExecutionResult =
      await this.aciService.client.functions.execute({
        function_name: 'DAYTONA__EXECUTE_COMMAND',
        function_parameters: {
          path: {
            workspaceId: workspaceId,
          },
          body: {
            command,
            timeout: timeoutSeconds,
          },
        },
        linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
      });

    this.logger.log(`ACI response: ${JSON.stringify(res, null, 2)}`);

    if (!res.success) {
      throw new Error(`Command failed: ${res.error}`);
    }

    // The exact data shape depends on Daytona. We defensively pick fields.
    const exitCode = (res.data?.exit_code ?? res.data?.exitCode ?? -1) as number;
    const stdout = res.data?.stdout ?? res.data?.result ?? '';
    const stderr = res.data?.stderr ?? '';

    // If the command failed, stderr is the most likely place for the error message.
    const result = exitCode === 0 ? stdout : stderr || stdout;

    return {
      exitCode,
      result,
    };
  }
}