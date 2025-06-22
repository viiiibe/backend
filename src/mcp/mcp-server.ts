import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { MCPService } from './mcp.service';

function jsonSchemaToZodShape(schema: any): any {
  const shape: any = {};
  if (!schema.properties) {
    return shape;
  }
  for (const key in schema.properties) {
    const prop = schema.properties[key];
    let zodType;
    switch (prop.type) {
      case 'string':
        if (prop.enum) {
          zodType = z.enum(prop.enum);
        } else {
          zodType = z.string();
        }
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'array':
        // Assuming string array based on existing definitions
        zodType = z.array(z.string());
        break;
      default:
        zodType = z.any();
    }
    if (prop.description) {
      zodType = zodType.describe(prop.description);
    }
    if (!schema.required?.includes(key)) {
      zodType = zodType.optional();
    }
    if (prop.default) {
      zodType = zodType.default(prop.default);
    }
    shape[key] = zodType;
  }
  return shape;
}

@Injectable()
export class MCPServer {
  private readonly logger = new Logger(MCPServer.name);
  private server: any;

  constructor(private readonly mcpService: MCPService) {
    this.initializeServer();
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
    const availableFunctions = this.mcpService.getAvailableFunctions();

    for (const funcName of availableFunctions) {
      const definition = this.getToolDefinition(funcName);
      if (!definition) {
        this.logger.warn(`No tool definition found for function: ${funcName}`);
        continue;
      }

      const handler = async (args: any) => {
        try {
          const result = await this.mcpService.handleMCPCall(funcName, args);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          this.logger.error(`Error executing MCP function ${funcName}:`, error);
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      };

      this.server.registerTool(
        funcName,
        {
          description: definition.description,
          inputSchema: jsonSchemaToZodShape(definition.inputSchema),
        },
        handler,
      );
    }
  }

  private getToolDefinition(functionName: string): any {
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
            code: {
              type: 'string',
              description: 'The code to execute',
            },
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
    this.logger.log('MCP Server started');
  }

  async stop() {
    this.logger.log('MCP Server stopped');
  }
}
