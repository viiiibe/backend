import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { PrismaService } from '../db/prisma.service';
import { ProblemsService } from '../problems/problems.service';
import { UsersService } from '../users/users.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { ResourcesService } from '../resources/resources.service';
import { SandboxService } from '../sandbox/sandbox.service';
import type { ProblemComplexity } from '@prisma/client';

function jsonSchemaToZodShape(schema: any): any {
  const shape: any = {};
  if (!schema.properties) return shape;
  for (const key in schema.properties) {
    const prop = schema.properties[key];
    let zodType;
    switch (prop.type) {
      case 'string':
        zodType = prop.enum ? z.enum(prop.enum) : z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'array':
        zodType = z.array(z.string());
        break;
      default:
        zodType = z.any();
    }
    if (prop.description) zodType = zodType.describe(prop.description);
    if (!schema.required?.includes(key)) zodType = zodType.optional();
    if (prop.default) zodType = zodType.default(prop.default);
    shape[key] = zodType;
  }
  return shape;
}

class StandaloneMCPServer {
  private server: any;
  private prisma: PrismaService;
  private problemsService: ProblemsService;
  private usersService: UsersService;
  private submissionsService: SubmissionsService;
  private resourcesService: ResourcesService;
  private sandboxService: SandboxService;

  constructor() {
    this.prisma = {} as any; // No real PrismaService in standalone
    this.initializeServices();
    this.initializeServer();
  }

  private initializeServices() {
    this.problemsService = new ProblemsService(this.prisma);
    this.usersService = new UsersService(this.prisma);
    this.submissionsService = new SubmissionsService(this.prisma);
    this.resourcesService = new ResourcesService(this.prisma);
    this.sandboxService = new SandboxService({} as any);
  }

  private initializeServer() {
    this.server = new McpServer({
      name: 'vibe-backend-mcp-server',
      version: '1.0.0',
    });
    this.registerTools();
    this.server.connect(new StdioServerTransport());
  }

  private registerTools() {
    const availableFunctions = this.getAvailableFunctions();
    for (const funcName of availableFunctions) {
      const definition = this.getToolDefinition(funcName);
      this.server.registerTool(
        funcName,
        {
          description: definition.description,
          inputSchema: jsonSchemaToZodShape(definition.inputSchema),
        },
        async (args: any) => {
          try {
            const result = await this.handleMCPCall(funcName, args);
            return {
              content: [
                { type: 'text', text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (error) {
            console.error(`Error executing MCP function ${funcName}:`, error);
            return {
              content: [{ type: 'text', text: `Error: ${error.message}` }],
              isError: true,
            };
          }
        },
      );
    }
  }

  private getAvailableFunctions(): string[] {
    return [
      'get_problem_by_topic',
      'fetch_user_history',
      'fetch_learning_resources',
      'check_solution_history',
      'execute_code',
      'get_all_topics',
    ];
  }

  private async handleMCPCall(functionName: string, args: any) {
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
      case 'get_all_topics':
        return this.getAllTopics(args);
      default:
        throw new Error(`Unsupported MCP function: ${functionName}`);
    }
  }

  private async getProblemByTopic(args: any) {
    let { topic, complexity, excludeIds } = args ?? {};

    if (!topic) {
      const allTopics = await this.problemsService.findAllUniqueTopics();
      if (allTopics.length > 0) {
        topic = allTopics[Math.floor(Math.random() * allTopics.length)];
      } else {
        throw new Error('No topics available to choose from.');
      }
    }

    if (!complexity) {
      const complexities: ProblemComplexity[] = ['EASY', 'MEDIUM', 'HARD'];
      complexity =
        complexities[Math.floor(Math.random() * complexities.length)];
    }

    return this.problemsService.findOneByTopicAndDifficulty(
      topic,
      (complexity as string).toUpperCase() as ProblemComplexity,
      excludeIds,
    );
  }

  private async fetchUserHistory(args: any) {
    const { userId } = args ?? {};
    if (!userId) throw new Error('userId is required');
    const user = await this.usersService.findById(userId);
    const stats = await this.usersService.getUserStats(userId);
    return { user, stats };
  }

  private async fetchLearningResources(args: any) {
    const { topic } = args ?? {};
    if (!topic) throw new Error('topic is required');
    return this.resourcesService.findByTopic(topic);
  }

  private async checkSolutionHistory(args: any) {
    const { userId, limit = 10 } = args ?? {};
    if (!userId) throw new Error('userId is required');
    const submissions = await this.submissionsService.findByUser(userId);
    return submissions.slice(0, limit);
  }

  private async executeCode(args: any) {
    const { code } = args ?? {};
    const language = args.language ?? 'python';
    if (!code) {
      throw new Error('code is required');
    }
    const problem = await this.problemsService.findById(args.problemId);
    if (!problem) throw new Error('Invalid problemId');
    const execResult = await this.sandboxService.executeCode(
      code,
      language,
      problem.testCases,
    );
    await this.submissionsService.create({
      userId: args.userId,
      problemId: args.problemId,
      code,
      language,
      status: execResult.allPassed ? 'PASSED' : 'FAILED',
    });
    return execResult;
  }

  private async getAllTopics(_args: any) {
    return this.problemsService.findAllUniqueTopics();
  }

  private getToolDefinition(functionName: string): any {
    // Duplicated from mcp.service.ts for standalone usage.
    const toolDefinitions: Record<
      string,
      { description: string; inputSchema: any }
    > = {
      get_problem_by_topic: {
        description: 'Get a coding problem by topic and complexity level',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description:
                'The topic of the problem (e.g., arrays, dynamic programming)',
            },
            complexity: {
              type: 'string',
              enum: ['EASY', 'MEDIUM', 'HARD'],
              description: 'The complexity level of the problem',
            },
            excludeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Problem IDs to exclude from the search',
            },
          },
          required: ['topic', 'complexity'],
        },
      },
      fetch_user_history: {
        description: 'Fetch user history and statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      fetch_learning_resources: {
        description: 'Fetch learning resources for a specific topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'The topic to fetch resources for',
            },
          },
          required: ['topic'],
        },
      },
      check_solution_history: {
        description: 'Check user solution history',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of submissions to return',
              default: 10,
            },
          },
        },
      },
      execute_code: {
        description: 'Execute code in a sandbox environment',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The code to execute' },
          },
          required: ['code'],
        },
      },
      get_all_topics: {
        description: 'Get all available problem topics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    };
    return toolDefinitions[functionName];
  }

  async start() {
    console.log('MCP Server started');
  }

  async stop() {
    // (this.prisma as any)?.$disconnect?.();
    console.log('MCP Server stopped');
  }
}

if (require.main === module) {
  const server = new StandaloneMCPServer();
  server.start();
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

export { StandaloneMCPServer };
