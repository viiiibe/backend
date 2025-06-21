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

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(private readonly aciService: AciService) {}

  /**
   * Executes user code in an isolated Daytona workspace via the ACI platform.
   */
  async executeCode(
    code: string,
    language: 'python' | 'cpp',
    testCases: TestCase[],
  ): Promise<ExecutionResult> {
    // 1. Spin up a workspace
    const workspaceId = await this.createWorkspace(language);

    try {
      // 2. Write code & (for C++) compile
      if (language === 'cpp') {
        const compileErr = await this.prepareCppWorkspace(workspaceId, code);
        if (compileErr) {
          return { compileError: compileErr, results: [], allPassed: false };
        }
      } else {
        await this.writeCodeToFile(workspaceId, 'main.py', code);
      }

      // 3. Execute against each test case
      const results: TestCaseResult[] = [];
      for (const tc of testCases) {
        const result = await this.runSingleTest(workspaceId, language, tc);
        results.push(result);
      }

      const allPassed = results.every((r) => r.passed);
      return { compileError: null, results, allPassed };
    } finally {
      // 4. Always clean up the workspace
      await this.deleteWorkspace(workspaceId);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helper methods
  // ---------------------------------------------------------------------------

  private async createWorkspace(language: 'python' | 'cpp'): Promise<string> {
    const name = `sub-${randomUUID()}`;

    const createResp = await this.aciService.client.functions.execute({
      function_name: 'DAYTONA__CREATE_WORKSPACE',
      function_parameters: {
        workspace_name: name,
        language, // Daytona supports language shortcut for common images
      },
      linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
    });

    if (!createResp.success) {
      this.logger.error(`Failed to create workspace: ${createResp.error}`);
      throw new Error('Workspace creation failed');
    }

    const workspaceId = createResp.data?.workspace_id ?? createResp.data?.id;

    // Start workspace (required before commands)
    await this.aciService.client.functions.execute({
      function_name: 'DAYTONA__START_WORKSPACE',
      function_parameters: { workspace_id: workspaceId },
      linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
    });

    return workspaceId;
  }

  private async deleteWorkspace(workspaceId: string) {
    if (!workspaceId) return;
    try {
      await this.aciService.client.functions.execute({
        function_name: 'DAYTONA__DELETE_WORKSPACE',
        function_parameters: { workspace_id: workspaceId },
        linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
      });
    } catch (err) {
      this.logger.warn(`Failed to delete workspace ${workspaceId}: ${err}`);
    }
  }

  private async writeCodeToFile(
    workspaceId: string,
    filename: string,
    contents: string,
  ) {
    const b64 = Buffer.from(contents, 'utf-8').toString('base64');
    const cmd = `echo '${b64}' | base64 -d > ${filename}`;
    await this.executeCommand(workspaceId, cmd);
  }

  private async prepareCppWorkspace(
    workspaceId: string,
    code: string,
  ): Promise<string | null> {
    await this.writeCodeToFile(workspaceId, 'main.cpp', code);

    const compile = await this.executeCommand(
      workspaceId,
      'g++ main.cpp -std=c++17 -O2 -pipe -static -s -o main',
      30,
    );

    if (compile.exitCode !== 0) {
      return compile.result as string;
    }
    return null;
  }

  private async runSingleTest(
    workspaceId: string,
    language: 'python' | 'cpp',
    testCase: TestCase,
  ): Promise<TestCaseResult> {
    const start = Date.now();
    const inputB64 = Buffer.from(testCase.input, 'utf-8').toString('base64');

    const runCmd =
      language === 'cpp'
        ? `echo '${inputB64}' | base64 -d | ./main`
        : `echo '${inputB64}' | base64 -d | python3 main.py`;

    const exec = await this.executeCommand(workspaceId, runCmd, 10);
    const executionTime = Date.now() - start;

    const stdout: string = (exec.result as string) ?? '';
    const trimmedOut = stdout.trim();
    const trimmedExpected = testCase.expectedOutput.trim();

    return {
      passed: trimmedOut === trimmedExpected && exec.exitCode === 0,
      output: stdout,
      expectedOutput: testCase.expectedOutput,
      error: exec.exitCode === 0 ? null : stdout,
      executionTime,
    };
  }

  private async executeCommand(
    workspaceId: string,
    command: string,
    timeoutSeconds = 10,
  ): Promise<{ exitCode: number; result: any }> {
    const res: FunctionExecutionResult =
      await this.aciService.client.functions.execute({
        function_name: 'DAYTONA__EXECUTE_COMMAND',
        function_parameters: {
          workspace_id: workspaceId,
          command,
          timeout_seconds: timeoutSeconds,
        },
        linked_account_owner_id: AciService.LINKED_ACCOUNT_OWNER_ID,
      });

    if (!res.success) {
      throw new Error(`Command failed: ${res.error}`);
    }

    // The exact data shape depends on Daytona.  We defensively pick fields.
    const exitCode = (res.data?.exit_code ?? res.data?.exitCode ?? 0) as number;

    return {
      exitCode,
      result: res.data?.stdout ?? res.data?.result ?? '',
    };
  }
}
