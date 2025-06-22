import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCPService } from '../mcp/mcp.service';
import { MCPClient } from '../mcp/mcp-client';

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly useOllama: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpService: MCPService,
    private readonly mcpClient: MCPClient,
  ) {
    this.apiUrl = this.buildApiUrl();
    this.model = this.configService.get<string>('llm.model');
    this.temperature = this.configService.get<number>('llm.temperature');
    this.maxTokens = this.configService.get<number>('llm.maxTokens');
    this.useOllama = this.configService.get<boolean>('llm.useOllama') || false;

    if (!this.apiUrl && !this.useOllama) {
      this.logger.warn(
        'LLM API URL not found and Ollama not enabled. LLM functionality will be limited.',
      );
    }
  }

  private buildApiUrl(): string {
    const baseUrl = this.configService.get<string>('llm.apiUrl');

    if (!baseUrl) {
      this.logger.warn('LLM_API_URL environment variable is not set');
      return '';
    }

    try {
      // If the URL already contains a path, use it as is
      if (baseUrl.includes('/v1/') || baseUrl.includes('/api/')) {
        this.logger.debug(`Using provided API URL as-is: ${baseUrl}`);
        return baseUrl;
      }

      // If it's just a base URL, append the standard OpenAI chat completions endpoint
      const url = new URL(baseUrl);
      if (!url.pathname || url.pathname === '/') {
        url.pathname = '/v1/chat/completions';
        this.logger.debug(`Constructed API URL: ${url.toString()}`);
      }
      return url.toString();
    } catch (error) {
      this.logger.error('Invalid LLM API URL format:', error);
      this.logger.error(`Provided URL: ${baseUrl}`);
      return '';
    }
  }

  // Public method to get the constructed API URL for debugging
  getApiUrl(): string {
    return this.apiUrl;
  }

  async generateResponse(
    message: string,
    chatHistory: Array<{ message: string; response: string }>,
    userId: string,
  ): Promise<{ response: string; actions: any[] }> {
    try {
      if (this.useOllama) {
        return this.generateResponseWithOllama(message, chatHistory, userId);
      } else {
        return this.generateResponseWithExternalAPI(message, chatHistory, userId);
      }
    } catch (error) {
      this.logger.error('Error generating LLM response:', error);
      return {
        response:
          'I apologize, but I encountered an error while processing your message. Please try again.',
        actions: [],
      };
    }
  }

  private async generateResponseWithOllama(
    message: string,
    chatHistory: Array<{ message: string; response: string }>,
    userId: string,
  ): Promise<{ response: string; actions: any[] }> {
    try {
      // Get available MCP functions
      const availableFunctions = this.mcpService.getAvailableFunctions();
      const tools = this.buildToolsSchema(availableFunctions);

      // Build system prompt with MCP context
      const systemPrompt = this.buildSystemPrompt(availableFunctions);

      // Prepare the request payload for Ollama
      const payload = {
        model: this.model || 'qwen2.5:3b',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...this.convertHistoryToMessages(chatHistory),
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        tools: tools,
        tool_choice: 'auto',
      };

      // Debug logging
      this.logger.debug('=== OLLAMA REQUEST DEBUG ===');
      this.logger.debug(`Model: ${payload.model}`);
      this.logger.debug(`Temperature: ${this.temperature}`);
      this.logger.debug(`Max Tokens: ${this.maxTokens}`);
      this.logger.debug(`User ID: ${userId}`);
      this.logger.debug(`Tools Schema: ${JSON.stringify(tools, null, 2)}`);
      this.logger.debug(`System Prompt: ${systemPrompt}`);
      this.logger.debug(`User Message: ${message}`);
      this.logger.debug(`Full Payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.debug('=== END OLLAMA REQUEST DEBUG ===');

      // Make the API call to Ollama
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Ollama API request failed: ${response.status} ${response.statusText}`);
        this.logger.error(`Error Response: ${errorText}`);
        throw new Error(`Ollama API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.logger.debug(`Ollama Response: ${JSON.stringify(data, null, 2)}`);

      const llmResponse = data.message?.content || 'No response generated';
      const toolCalls = data.tool_calls || [];

      // Execute MCP function calls directly
      const actions = await this.executeMCPActions(toolCalls, userId);

      return {
        response: llmResponse,
        actions,
      };
    } catch (error) {
      this.logger.error('Error generating Ollama response:', error);
      throw error;
    }
  }

  private async generateResponseWithExternalAPI(
    message: string,
    chatHistory: Array<{ message: string; response: string }>,
    userId: string,
  ): Promise<{ response: string; actions: any[] }> {
    if (!this.apiUrl) {
      return {
        response:
          'LLM service is not configured. Please set LLM_API_URL environment variable or enable Ollama.',
        actions: [],
      };
    }

    // Get available MCP functions and their schemas
    const availableFunctions = this.mcpService.getAvailableFunctions();
    const tools = this.buildToolsSchema(availableFunctions);

    // Build system prompt with MCP context
    const systemPrompt = this.buildSystemPrompt(availableFunctions);

    // Prepare the request payload
    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...this.convertHistoryToMessages(chatHistory),
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      tools: tools,
      tool_choice: 'auto', // Let the model decide when to use tools
    };

    // Debug logging for all information sent to LLM
    this.logger.debug('=== LLM REQUEST DEBUG ===');
    this.logger.debug(`API URL: ${this.apiUrl}`);
    this.logger.debug(`Model: ${this.model}`);
    this.logger.debug(`Temperature: ${this.temperature}`);
    this.logger.debug(`Max Tokens: ${this.maxTokens}`);
    this.logger.debug(`User ID: ${userId}`);
    this.logger.debug(
      `Available MCP Functions: ${JSON.stringify(availableFunctions, null, 2)}`,
    );
    this.logger.debug(`System Prompt: ${systemPrompt}`);
    this.logger.debug(
      `Chat History: ${JSON.stringify(chatHistory, null, 2)}`,
    );
    this.logger.debug(`User Message: ${message}`);
    this.logger.debug(`Tools Schema: ${JSON.stringify(tools, null, 2)}`);
    this.logger.debug(`Full Payload: ${JSON.stringify(payload, null, 2)}`);
    this.logger.debug('=== END LLM REQUEST DEBUG ===');

    // Make the API call
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Debug logging for LLM response
    this.logger.debug('=== LLM RESPONSE DEBUG ===');
    this.logger.debug(`Request URL: ${this.apiUrl}`);
    this.logger.debug(`Response Status: ${response.status}`);
    this.logger.debug(`Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      this.logger.debug(`Error Response: ${errorText}`);
      throw new Error(
        `LLM API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: LLMResponse = await response.json();
    this.logger.debug(`Full Response: ${JSON.stringify(data, null, 2)}`);
    this.logger.debug('=== END LLM RESPONSE DEBUG ===');

    const llmResponse = data.choices[0]?.message?.content || 'No response generated';
    const toolCalls = data.choices[0]?.message?.tool_calls || [];

    // Execute MCP function calls directly
    const actions = await this.executeMCPActions(toolCalls, userId);

    return {
      response: llmResponse,
      actions,
    };
  }

  private async executeMCPActions(
    toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>,
    userId: string,
  ): Promise<any[]> {
    const actions = [];

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        // Add userId to the arguments if not already present
        if (!args.userId) {
          args.userId = userId;
        }

        this.logger.debug(`Executing MCP function: ${functionName} with args: ${JSON.stringify(args)}`);
        
        // Call the MCP function directly
        const result = await this.mcpService.handleMCPCall(functionName, args);
        
        actions.push({
          functionName,
          args,
          result,
          success: true,
        });

        this.logger.debug(`MCP function ${functionName} executed successfully: ${JSON.stringify(result)}`);
      } catch (error) {
        this.logger.error(`Error executing MCP function ${toolCall.function.name}:`, error);
        actions.push({
          functionName: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
          error: error.message,
          success: false,
        });
      }
    }

    return actions;
  }

  private convertHistoryToMessages(
    chatHistory: Array<{ message: string; response: string }>,
  ) {
    const messages = [];

    for (const entry of chatHistory) {
      messages.push({
        role: 'user' as const,
        content: entry.message,
      });
      messages.push({
        role: 'assistant' as const,
        content: entry.response,
      });
    }

    return messages;
  }

  private buildToolsSchema(availableFunctions: string[]) {
    const toolDefinitions = {
      get_problem_by_topic: {
        type: 'function',
        function: {
          name: 'get_problem_by_topic',
          description: 'Get a coding problem by topic and complexity level',
          parameters: {
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
      },
      fetch_user_history: {
        type: 'function',
        function: {
          name: 'fetch_user_history',
          description: 'Fetch user history and statistics',
          parameters: {
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
      },
      fetch_learning_resources: {
        type: 'function',
        function: {
          name: 'fetch_learning_resources',
          description: 'Fetch learning resources for a specific topic',
          parameters: {
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
      },
      check_solution_history: {
        type: 'function',
        function: {
          name: 'check_solution_history',
          description: 'Check user solution history',
          parameters: {
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
      },
      execute_code: {
        type: 'function',
        function: {
          name: 'execute_code',
          description: 'Execute code in a sandbox environment',
          parameters: {
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
      },
      get_all_topics: {
        type: 'function',
        function: {
          name: 'get_all_topics',
          description: 'Get all available problem topics',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
    };

    return availableFunctions.map(funcName => toolDefinitions[funcName]).filter(Boolean);
  }

  private buildSystemPrompt(availableFunctions: string[]): string {
    return `You are an AI assistant for a coding education platform. You help users learn programming by providing guidance, explanations, and suggestions.

Available MCP (Model Context Protocol) functions you can use:
${availableFunctions.map((func) => `- ${func}`).join('\n')}

When a user asks for help with coding problems, learning resources, or wants to practice, you can use these functions to provide more personalized assistance.

Guidelines:
1. Be helpful and encouraging
2. Provide clear explanations
3. Suggest appropriate practice problems based on user's skill level
4. Use MCP functions when relevant to enhance your responses
5. Keep responses concise but informative

You have access to the following functions that you can call when needed:
- get_all_topics: Get all available problem topics. Always use this function to get the list of topics before calling any other function.
- get_problem_by_topic: Get a coding problem by topic and complexity
- fetch_user_history: Get user's learning history and statistics
- fetch_learning_resources: Get learning resources for a specific topic
- check_solution_history: Check user's recent solution submissions
- execute_code: Execute code in a sandbox environment

Use these functions to provide personalized and contextual assistance to users.`;
  }

  // Placeholder methods - will be implemented later
  async suggestNextProblem(userId: string) {
    return {
      problemId: 'placeholder-problem-id',
      justification: 'This is a placeholder suggestion.',
    };
  }

  async evaluateAndProvideHints(submission: any) {
    return {
      passed: false,
      hints: ['This is a placeholder hint.'],
    };
  }
}
