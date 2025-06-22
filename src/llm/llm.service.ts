import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCPService } from '../mcp/mcp.service';
import { MCPClient } from '../mcp/mcp-client';
import Anthropic from '@anthropic-ai/sdk';

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
  private readonly provider: string;
  private readonly maxTurns: number;
  private readonly anthropicConfig: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  private readonly anthropicClient: Anthropic;
  private userLastProblemId = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpService: MCPService,
    private readonly mcpClient: MCPClient,
  ) {
    this.provider = this.configService.get<string>('llm.provider') || 'openai';
    this.apiUrl = this.buildApiUrl();
    this.model = this.configService.get<string>('llm.model');
    this.temperature = this.configService.get<number>('llm.temperature');
    this.maxTokens = this.configService.get<number>('llm.maxTokens');
    this.useOllama = this.configService.get<boolean>('llm.useOllama') || false;
    this.maxTurns = this.configService.get<number>('llm.maxTurns') || 5;
    this.anthropicConfig = {
      apiKey: this.configService.get<string>('llm.anthropic.apiKey'),
      model: this.configService.get<string>('llm.anthropic.model'),
      maxTokens: this.configService.get<number>('llm.anthropic.maxTokens'),
    };

    // Initialize Anthropic client if API key is available
    if (this.anthropicConfig.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: this.anthropicConfig.apiKey,
      });
    }

    if (!this.apiUrl && !this.useOllama && this.provider !== 'anthropic') {
      this.logger.warn(
        'LLM API URL not found and Ollama not enabled. LLM functionality will be limited.',
      );
    }

    if (this.provider === 'anthropic' && !this.anthropicConfig.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY environment variable is not set');
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
        return this.generateResponseWithMultiTurnOllama(message, chatHistory, userId);
      } else if (this.provider === 'anthropic') {
        return this.generateResponseWithMultiTurnAnthropic(message, chatHistory, userId);
      } else {
        return this.generateResponseWithMultiTurnExternalAPI(
          message,
          chatHistory,
          userId,
        );
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

  private async generateResponseWithMultiTurnOllama(
    message: string,
    chatHistory: Array<{ message: string; response: string }>,
    userId: string,
  ): Promise<{ response: string; actions: any[] }> {
    let currentTurn = 0;
    let allActions: any[] = [];
    let conversationMessages = [
      {
        role: 'system' as const,
        content: this.buildSystemPrompt(this.mcpService.getAvailableFunctions()),
      },
      ...this.convertHistoryToMessages(chatHistory),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    while (currentTurn < this.maxTurns) {
      currentTurn++;
      this.logger.debug(`=== OLLAMA TURN ${currentTurn} ===`);

      // Get available MCP functions
      const availableFunctions = this.mcpService.getAvailableFunctions();
      const tools = this.buildToolsSchema(availableFunctions);

      // Prepare the request payload for Ollama
      const payload = {
        model: this.model || 'qwen2.5:3b',
        messages: conversationMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        tools: tools,
        tool_choice: 'auto',
      };

      this.logger.debug(`Turn ${currentTurn} - Making Ollama API call`);
      this.logger.debug(`Messages: ${JSON.stringify(conversationMessages, null, 2)}`);

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
        this.logger.error(
          `Ollama API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error Response: ${errorText}`);
        throw new Error(
          `Ollama API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      this.logger.debug(`Turn ${currentTurn} - Ollama Response: ${JSON.stringify(data, null, 2)}`);

      const llmResponse = data.message?.content || 'No response generated';
      const toolCalls = data.tool_calls || [];

      // Add the assistant's response to conversation history
      conversationMessages.push({
        role: 'assistant' as const,
        content: llmResponse,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
      });

      // Execute MCP function calls and collect results
      if (toolCalls.length > 0) {
        this.logger.debug(`Turn ${currentTurn} - Executing ${toolCalls.length} tool calls`);
        const turnActions = await this.executeMCPActions(toolCalls, userId);
        allActions.push(...turnActions);

        // Add tool results to conversation history
        const toolResults = toolCalls.map((toolCall, index) => ({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(turnActions[index]?.result || { error: 'Tool execution failed' }),
        }));

        conversationMessages.push(...toolResults);
        this.logger.debug(`Turn ${currentTurn} - Added tool results to conversation`);
      } else {
        // No more tool calls, we're done
        this.logger.debug(`Turn ${currentTurn} - No tool calls, conversation complete`);
        break;
      }
    }

    // Get the final response from the last assistant message
    const finalResponse = conversationMessages
      .filter(msg => msg.role === 'assistant')
      .pop()?.content || 'No response generated';

    this.logger.debug(`Multi-turn conversation completed in ${currentTurn} turns`);
    this.logger.debug(`Total actions executed: ${allActions.length}`);

    return {
      response: finalResponse,
      actions: allActions,
    };
  }

  private async generateResponseWithMultiTurnAnthropic(
    message: string,
    chatHistory: Array<{ message: string; response: string }>,
    userId: string,
  ): Promise<{ response: string; actions: any[] }> {
    if (!this.anthropicConfig.apiKey || !this.anthropicClient) {
      return {
        response:
          'Anthropic API is not configured. Please set ANTHROPIC_API_KEY environment variable.',
        actions: [],
      };
    }

    let currentTurn = 0;
    let allActions: any[] = [];
    let conversationMessages = this.convertHistoryToAnthropicMessages(chatHistory, message);

    while (currentTurn < this.maxTurns) {
      currentTurn++;
      this.logger.debug(`=== ANTHROPIC TURN ${currentTurn} ===`);

      // Get available MCP functions
      const availableFunctions = this.mcpService.getAvailableFunctions();
      const tools = this.buildAnthropicToolsSchema(availableFunctions);

      // Build system prompt with MCP context
      const systemPrompt = this.buildSystemPrompt(availableFunctions);

      this.logger.debug(`Turn ${currentTurn} - Making Anthropic API call`);
      this.logger.debug(`Messages: ${JSON.stringify(conversationMessages, null, 2)}`);

      // Make the API call using Anthropic SDK
      const response = await this.anthropicClient.messages.create({
        model: this.anthropicConfig.model,
        max_tokens: this.anthropicConfig.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: conversationMessages,
        tools: tools,
      });

      this.logger.debug(`Turn ${currentTurn} - Anthropic Response: ${JSON.stringify(response, null, 2)}`);

      // Extract text content and tool calls from Anthropic response
      let llmResponse = '';
      const toolCalls = [];

      for (const content of response.content) {
        if (content.type === 'text' && content.text) {
          llmResponse += content.text;
        } else if (content.type === 'tool_use' && content.id && content.name) {
          const toolCall = {
            id: content.id,
            type: 'function',
            function: {
              name: content.name,
              arguments: JSON.stringify(content.input || {}),
            },
          };
          toolCalls.push(toolCall);
        }
      }

      if (!llmResponse) {
        llmResponse = 'No response generated';
      }

      // Add the assistant's response to conversation history
      conversationMessages.push({
        role: 'assistant' as const,
        content: response.content,
      });

      // Execute MCP function calls and collect results
      if (toolCalls.length > 0) {
        this.logger.debug(`Turn ${currentTurn} - Executing ${toolCalls.length} tool calls`);
        const turnActions = await this.executeMCPActions(toolCalls, userId);
        allActions.push(...turnActions);

        // Add tool results to conversation history
        const toolResults = toolCalls.map((toolCall, index) => ({
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              content: JSON.stringify(turnActions[index]?.result || { error: 'Tool execution failed' }),
            },
          ],
        }));

        conversationMessages.push(...toolResults);
        this.logger.debug(`Turn ${currentTurn} - Added tool results to conversation`);
      } else {
        // No more tool calls, we're done
        this.logger.debug(`Turn ${currentTurn} - No tool calls, conversation complete`);
        break;
      }
    }

    // Get the final response from the last assistant message
    const finalResponse = conversationMessages
      .filter(msg => msg.role === 'assistant')
      .pop()?.content || 'No response generated';

    // Extract text content from the final response
    let finalTextResponse = '';
    if (Array.isArray(finalResponse)) {
      for (const content of finalResponse) {
        if (content.type === 'text' && content.text) {
          finalTextResponse += content.text;
        }
      }
    } else if (typeof finalResponse === 'string') {
      finalTextResponse = finalResponse;
    }

    if (!finalTextResponse) {
      finalTextResponse = 'No response generated';
    }

    this.logger.debug(`Multi-turn conversation completed in ${currentTurn} turns`);
    this.logger.debug(`Total actions executed: ${allActions.length}`);

    return {
      response: finalTextResponse,
      actions: allActions,
    };
  }

  private async generateResponseWithMultiTurnExternalAPI(
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

    let currentTurn = 0;
    let allActions: any[] = [];
    let conversationMessages = [
      {
        role: 'system' as const,
        content: this.buildSystemPrompt(this.mcpService.getAvailableFunctions()),
      },
      ...this.convertHistoryToMessages(chatHistory),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    while (currentTurn < this.maxTurns) {
      currentTurn++;
      this.logger.debug(`=== EXTERNAL API TURN ${currentTurn} ===`);

      // Get available MCP functions and their schemas
      const availableFunctions = this.mcpService.getAvailableFunctions();
      const tools = this.buildToolsSchema(availableFunctions);

      // Prepare the request payload
      const payload = {
        model: this.model,
        messages: conversationMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        tools: tools,
        tool_choice: 'auto',
      };

      this.logger.debug(`Turn ${currentTurn} - Making external API call`);
      this.logger.debug(`Messages: ${JSON.stringify(conversationMessages, null, 2)}`);

      // Make the API call
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.debug(`Error Response: ${errorText}`);
        throw new Error(
          `LLM API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: LLMResponse = await response.json();
      this.logger.debug(`Turn ${currentTurn} - External API Response: ${JSON.stringify(data, null, 2)}`);

      const llmResponse = data.choices[0]?.message?.content || 'No response generated';
      const toolCalls = data.choices[0]?.message?.tool_calls || [];

      // Add the assistant's response to conversation history
      conversationMessages.push({
        role: 'assistant' as const,
        content: llmResponse,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
      });

      // Execute MCP function calls and collect results
      if (toolCalls.length > 0) {
        this.logger.debug(`Turn ${currentTurn} - Executing ${toolCalls.length} tool calls`);
        const turnActions = await this.executeMCPActions(toolCalls, userId);
        allActions.push(...turnActions);

        // Add tool results to conversation history
        const toolResults = toolCalls.map((toolCall, index) => ({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(turnActions[index]?.result || { error: 'Tool execution failed' }),
        }));

        conversationMessages.push(...toolResults);
        this.logger.debug(`Turn ${currentTurn} - Added tool results to conversation`);
      } else {
        // No more tool calls, we're done
        this.logger.debug(`Turn ${currentTurn} - No tool calls, conversation complete`);
        break;
      }
    }

    // Get the final response from the last assistant message
    const finalResponse = conversationMessages
      .filter(msg => msg.role === 'assistant')
      .pop()?.content || 'No response generated';

    this.logger.debug(`Multi-turn conversation completed in ${currentTurn} turns`);
    this.logger.debug(`Total actions executed: ${allActions.length}`);

    return {
      response: finalResponse,
      actions: allActions,
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
    let lastProblemId: string | undefined = this.userLastProblemId.get(userId);

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        // Inject userId if missing
        if (!args.userId) {
          args.userId = userId;
        }

        // Inject problemId for execute_code if missing
        if (functionName === 'execute_code') {
          if (!args.problemId && lastProblemId) {
            args.problemId = lastProblemId;
          }
          if (!args.language) {
            args.language = 'python';
          }
        }

        this.logger.debug(
          `Executing MCP function: ${functionName} with args: ${JSON.stringify(args)}`,
        );

        // Call the MCP function directly
        const result = await this.mcpService.handleMCPCall(functionName, args);

        // Capture and persist problemId from get_problem_by_topic results
        if (functionName === 'get_problem_by_topic' && result?.id) {
          lastProblemId = result.id;
          this.userLastProblemId.set(userId, lastProblemId);
        }

        actions.push({
          functionName,
          args,
          result,
          success: true,
        });

        this.logger.debug(
          `MCP function ${functionName} executed successfully: ${JSON.stringify(result)}`,
        );
      } catch (error) {
        this.logger.error(
          `Error executing MCP function ${toolCall.function.name}:`,
          error,
        );
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

  private convertHistoryToAnthropicMessages(
    chatHistory: Array<{ message: string; response: string }>,
    currentMessage: string,
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

    // Add the current message
    messages.push({
      role: 'user' as const,
      content: currentMessage,
    });

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
                description:
                  'The topic of the problem (e.g., arrays, dynamic programming)',
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
            properties: {},
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
              limit: {
                type: 'number',
                description: 'Maximum number of submissions to return',
                default: 10,
              },
            },
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
            },
            required: ['code'],
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

    return availableFunctions
      .map((funcName) => toolDefinitions[funcName])
      .filter(Boolean);
  }

  private buildAnthropicToolsSchema(availableFunctions: string[]) {
    const toolDefinitions = {
      get_problem_by_topic: {
        name: 'get_problem_by_topic',
        description: 'Get a coding problem by topic and complexity level',
        input_schema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description:
                'The topic of the problem (e.g., arrays, dynamic programming)',
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
      fetch_learning_resources: {
        name: 'fetch_learning_resources',
        description: 'Fetch learning resources for a specific topic',
        input_schema: {
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
        name: 'check_solution_history',
        description: 'Check user solution history',
        input_schema: {
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
        name: 'execute_code',
        description: 'Execute code in a sandbox environment',
        input_schema: {
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
        name: 'get_all_topics',
        description: 'Get all available problem topics',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
    };

    return availableFunctions
      .map((funcName) => toolDefinitions[funcName])
      .filter(Boolean);
  }

  private buildSystemPrompt(availableFunctions: string[]): string {
    return `You are an AI assistant for a coding education platform. You help users learn programming by providing guidance, explanations, and suggestions.

Available MCP (Model Context Protocol) functions you can use:
${availableFunctions.map((func) => `- ${func}`).join('\n')}

MULTI-TURN CAPABILITY: You can make multiple sequential tool calls to gather all the information needed for a comprehensive response. The system will automatically continue the conversation until you have all the information you need.

When a user asks for help with coding problems, learning resources, or wants to practice, you can use these functions to provide more personalized assistance.

EXAMPLES OF MULTI-TURN WORKFLOWS:
1. User asks for a problem recommendation:
   - First call: check_solution_history() to see if the user has any previous submissions, we'll use this information to figure out if the user has some gaps in their knowledge to focus on those topics
   - Second call: get_all_topics() to see available topics
   - Third call: get_problem_by_topic() with appropriate complexity based on their history

   3. User submits code for evaluation:
   - execute_code() to run their solution
2. User asks for learning resources:
   - First call: get_all_topics() to confirm the topic exists
   - Second call: fetch_learning_resources() to get the actual resources

Guidelines:
1. Be helpful and encouraging
2. Provide clear explanations
3. Suggest appropriate practice problems based on user's skill level
4. Use MCP functions when relevant to enhance your responses
5. Keep responses concise but informative
6. Make multiple tool calls when you need different pieces of information
7. Always consider the user's history and preferences when making recommendations
8. Don't hesitate to make 2-3 sequential calls if needed to provide the best response

You have access to the following functions that you can call when needed:
- get_all_topics: Get all available problem topics. Use this first to understand what topics are available.
- get_problem_by_topic: Get a coding problem by topic and complexity
- fetch_learning_resources: Get learning resources for a specific topic
- check_solution_history: Check user's recent solution submissions
- execute_code: Execute code in a sandbox environment

Use these functions to provide personalized and contextual assistance to users. You can call multiple functions in sequence to gather all necessary information before providing your final response.`;
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
