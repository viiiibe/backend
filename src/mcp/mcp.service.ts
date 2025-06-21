import { Injectable, BadRequestException } from '@nestjs/common';
import { ProblemsService } from '../problems/problems.service';
import { UsersService } from '../users/users.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { ResourcesService } from '../resources/resources.service';
import { SandboxService } from '../sandbox/sandbox.service';
import { ProblemComplexity, SubmissionStatus } from '@prisma/client';

@Injectable()
export class MCPService {
  constructor(
    private readonly problemsService: ProblemsService,
    private readonly usersService: UsersService,
    private readonly submissionsService: SubmissionsService,
    private readonly resourcesService: ResourcesService,
    private readonly sandboxService: SandboxService,
  ) {}

  async handleMCPCall(functionName: string, args: any) {
    switch (functionName) {
      case 'get_problem_by_topic':
        return this.getProblemByTopic(args);
      case 'fetch_user_history':
        return this.fetchUserHistory(args);
      case 'fetch_learning_resources':
        return this.fetchLearningResources(args);
      case 'check_solution_history':
        return this.checkSolutionHistory(args);
      case 'execute_code':
        return this.executeCode(args);
      default:
        throw new BadRequestException(
          `Unsupported MCP function: ${functionName}`,
        );
    }
  }

  getAvailableFunctions() {
    return [
      'get_problem_by_topic',
      'fetch_user_history',
      'fetch_learning_resources',
      'check_solution_history',
      'execute_code',
    ];
  }

  private async getProblemByTopic(args: any) {
    const { topic, complexity, excludeIds } = args ?? {};
    if (!topic || !complexity) {
      throw new BadRequestException('topic and complexity are required');
    }
    const comp = (complexity as string).toUpperCase() as ProblemComplexity;
    const problem = await this.problemsService.findOneByTopicAndDifficulty(
      topic,
      comp,
      excludeIds,
    );
    return problem;
  }

  private async fetchUserHistory(args: any) {
    const { userId } = args ?? {};
    if (!userId) throw new BadRequestException('userId required');
    const user = await this.usersService.findById(userId);
    const stats = await this.usersService.getUserStats(userId);
    return { user, stats };
  }

  private async fetchLearningResources(args: any) {
    const { topic } = args ?? {};
    if (!topic) throw new BadRequestException('topic required');
    return this.resourcesService.findByTopic(topic);
  }

  private async checkSolutionHistory(args: any) {
    const { userId, limit = 10 } = args ?? {};
    if (!userId) throw new BadRequestException('userId required');
    const submissions = await this.submissionsService.findByUser(userId);
    return submissions.slice(0, limit);
  }

  private async executeCode(args: any) {
    const { code, language, problemId, userId } = args ?? {};
    if (!code || !language || !problemId || !userId) {
      throw new BadRequestException(
        'code, language, problemId, and userId are required',
      );
    }
    // fetch problem test cases
    const problem = await this.problemsService.findById(problemId);
    if (!problem) throw new BadRequestException('Invalid problemId');
    const execResult = await this.sandboxService.executeCode(
      code,
      language,
      problem.testCases,
    );

    // Persist submission
    let status: SubmissionStatus;
    let failedTestCaseId: number | null = null;

    if (execResult.compileError) {
      status = SubmissionStatus.ERROR;
    } else if (execResult.allPassed) {
      status = SubmissionStatus.PASSED;
    } else {
      status = SubmissionStatus.FAILED;
      const failedTest = execResult.results.find((r) => !r.passed);
      if (failedTest && failedTest.id) {
        failedTestCaseId = failedTest.id;
      }
    }

    await this.submissionsService.create({
      userId,
      problemId,
      code,
      language,
      status,
      failedTestCaseId,
    });

    return execResult;
  }
}
