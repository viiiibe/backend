import { Injectable, BadRequestException } from '@nestjs/common';
import { ProblemsService } from '../problems/problems.service';
import { ProblemComplexity } from '@prisma/client';

@Injectable()
export class MCPService {
  constructor(private readonly problemsService: ProblemsService) {}

  async handleMCPCall(functionName: string, args: any) {
    switch (functionName) {
      case 'get_problem_by_topic':
        return this.getProblemByTopic(args);
      default:
        throw new BadRequestException(`Unsupported MCP function: ${functionName}`);
    }
  }

  getAvailableFunctions() {
    return ['get_problem_by_topic'];
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
} 