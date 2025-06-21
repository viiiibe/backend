import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AciService } from '../aci/aci.service';
import { FunctionExecutionResult } from '@aci-sdk/aci';

interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface TestCaseResult {
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
    const userCodeB64 = Buffer.from(code, 'utf-8').toString('base64');

    // Build a standalone python script that first execs user code then runs tests
    const combinedScript = `\n# --- user code start ---\nimport sys, json, time, subprocess, types, io, base64\nUSER_CODE_SRC = base64.b64decode('${userCodeB64}').decode('utf-8')\n# --- harness start ---\nTEST_CASES = json.loads("""${JSON.stringify(testCases)}""")\nresults = []\nfor case in TEST_CASES:\n    start=time.time()\n    test_input = case.get('input','')\n    expected = case.get('expectedOutput','').strip()\n    stdout_capture = io.StringIO()\n    stderr_capture = io.StringIO()\n    try:\n        old_stdin, old_stdout, old_stderr = sys.stdin, sys.stdout, sys.stderr\n        sys.stdin = io.StringIO(test_input)\n        sys.stdout = stdout_capture\n        sys.stderr = stderr_capture\n        exec(USER_CODE_SRC, {})\n        passed_output = stdout_capture.getvalue().strip()\n        passed = (passed_output == expected)\n        results.append({\n            'passed': passed,\n            'output': stdout_capture.getvalue(),\n            'expectedOutput': expected,\n            'error': stderr_capture.getvalue() or None,\n            'executionTime': int((time.time()-start)*1000)\n        })\n    except Exception as e:\n        results.append({\n            'passed': False,\n            'output': stdout_capture.getvalue(),\n            'expectedOutput': expected,\n            'error': str(e),\n            'executionTime': int((time.time()-start)*1000)\n        })\n    finally:\n        sys.stdin, sys.stdout, sys.stderr = old_stdin, old_stdout, old_stderr\nprint(json.dumps(results))`;

    const combinedB64 = Buffer.from(combinedScript, 'utf-8').toString('base64');

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