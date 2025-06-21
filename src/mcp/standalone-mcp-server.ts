import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/server/index.js';
import { PrismaClient } from '@prisma/client';
import { ProblemsService } from '../problems/problems.service';
import { UsersService } from '../users/users.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { ResourcesService } from '../resources/resources.service';
import { SandboxService } from '../sandbox/sandbox.service';

// Standalone MCP server that doesn't depend on NestJS
class StandaloneMCPServer {
  private server: Server;
  private prisma: PrismaClient;
  private problemsService: ProblemsService;
  private usersService: UsersService;
  private submissionsService: SubmissionsService;
  private resourcesService: ResourcesService;
  private sandboxService: SandboxService;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeServices();
    this.initializeServer();
  }

  private initializeServices() {
    this.problemsService = new ProblemsService(this.prisma);
    this.usersService = new UsersService(this.prisma);
    this.submissionsService = new SubmissionsService(this.prisma);
    this.resourcesService = new ResourcesService(this.prisma);
    this.sandboxService = new SandboxService();
  }

  private initializeServer() {
    this.server = new Server(
      {
        name: 'vibe-backend-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.registerTools();
    this.server.connect(new StdioServerTransport());
  }

  private registerTools() {
    const availableFunctions = this.getAvailableFunctions();
    const tools = availableFunctions.map(funcName => this.createToolFromFunction(funcName));

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.handleMCPCall(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error executing MCP function ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
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
    const { topic, complexity, excludeIds } = args ?? {};
    if (!topic || !complexity) {
      throw new Error('topic and complexity are required');
    }
    const comp = (complexity as string).toUpperCase();
    const problem = await this.problemsService.findOneByTopicAndDifficulty(
      topic,
      comp,
      excludeIds,
    );
    return problem;
  }

  private async fetchUserHistory(args: any) {
    const { userId } = args ?? {};
    if (!userId) throw new Error('userId required');
    const user = await this.usersService.findById(userId);
    const stats = await this.usersService.getUserStats(userId);
    return { user, stats };
  }

  private async fetchLearningResources(args: any) {
    const { topic } = args ?? {};
    if (!topic) throw new Error('topic required');
    return this.resourcesService.findByTopic(topic);
  }

  private async checkSolutionHistory(args: any) {
    const { userId, limit = 10 } = args ?? {};
    if (!userId) throw new Error('userId required');
    const submissions = await this.submissionsService.findByUser(userId);
    return submissions.slice(0, limit);
  }

  private async executeCode(args: any) {
    const { code, language, problemId, userId } = args ?? {};
    if (!code || !language || !problemId || !userId) {
      throw new Error('code, language, problemId, and userId are required');
    }
    
    const problem = await this.problemsService.findById(problemId);
    if (!problem) throw new Error('Invalid problemId');
    
    const execResult = await this.sandboxService.executeCode(
      code,
      language,
      problem.testCases,
    );

    // Persist submission
    let status: string;
    let failedTestCaseId: number | null = null;

    if (execResult.compileError) {
      status = 'ERROR';
    } else if (execResult.allPassed) {
      status = 'PASSED';
    } else {
      status = 'FAILED';
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

  private async getAllTopics(_args: any) {
    return this.problemsService.findAllUniqueTopics();
  }

  private createToolFromFunction(functionName: string): Tool {
    const toolDefinitions = {
      get_problem_by_topic: {
        description: 'Get a coding problem by topic and complexity level',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'The topic of the problem (e.g., arrays, dynamic programming)',
            },
            complexity: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
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
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID to fetch history for',
            },
          },
          required: ['userId'],
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
            userId: {
              type: 'string',
              description: 'The user ID to check history for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of submissions to return',
              default: 10,
            },
          },
          required: ['userId'],
        },
      },
      execute_code: {
        description: 'Execute code in a sandbox environment',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to execute',
            },
            language: {
              type: 'string',
              description: 'The programming language',
            },
            problemId: {
              type: 'string',
              description: 'The problem ID for context',
            },
            userId: {
              type: 'string',
              description: 'The user ID executing the code',
            },
          },
          required: ['code', 'language', 'problemId', 'userId'],
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

    const definition = toolDefinitions[functionName];
    if (!definition) {
      throw new Error(`No tool definition found for function: ${functionName}`);
    }

    return {
      name: functionName,
      description: definition.description,
      inputSchema: definition.inputSchema,
    };
  }

  async start() {
    console.log('MCP Server started');
  }

  async stop() {
    await this.prisma.$disconnect();
    console.log('MCP Server stopped');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new StandaloneMCPServer();
  
  process.on('SIGINT', async () => {
    console.log('Shutting down MCP Server...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Shutting down MCP Server...');
    await server.stop();
    process.exit(0);
  });
}

export { StandaloneMCPServer }; 