import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/server/index.js';
import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from './mcp.service';

@Injectable()
export class MCPServer {
  private readonly logger = new Logger(MCPServer.name);
  private server: Server;

  constructor(private readonly mcpService: MCPService) {
    this.initializeServer();
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

    // Register tools
    this.registerTools();

    // Start the server
    this.server.connect(new StdioServerTransport());
  }

  private registerTools() {
    // Get all available functions and create tools
    const availableFunctions = this.mcpService.getAvailableFunctions();
    const tools = availableFunctions.map(funcName => this.createToolFromFunction(funcName));

    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools,
      };
    });

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.mcpService.handleMCPCall(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.logger.error(`Error executing MCP function ${name}:`, error);
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
    this.logger.log('MCP Server started');
  }

  async stop() {
    this.logger.log('MCP Server stopped');
  }
} 