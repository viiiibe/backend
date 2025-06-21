import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCPService } from '../mcp/mcp.service';

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
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

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpService: MCPService,
  ) {
    this.apiUrl = this.buildApiUrl();
    this.model = this.configService.get<string>('llm.model');
    this.temperature = this.configService.get<number>('llm.temperature');
    this.maxTokens = this.configService.get<number>('llm.maxTokens');

    if (!this.apiUrl) {
      this.logger.warn('LLM API URL not found. LLM functionality will be limited.');
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
      if (!this.apiUrl) {
        return {
          response: 'LLM service is not configured. Please set LLM_API_URL environment variable.',
          actions: [],
        };
      }

      // Get available MCP functions
      const availableFunctions = this.mcpService.getAvailableFunctions();
      
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
      };

      // Debug logging for all information sent to LLM
      this.logger.debug('=== LLM REQUEST DEBUG ===');
      this.logger.debug(`API URL: ${this.apiUrl}`);
      this.logger.debug(`Model: ${this.model}`);
      this.logger.debug(`Temperature: ${this.temperature}`);
      this.logger.debug(`Max Tokens: ${this.maxTokens}`);
      this.logger.debug(`User ID: ${userId}`);
      this.logger.debug(`Available MCP Functions: ${JSON.stringify(availableFunctions, null, 2)}`);
      this.logger.debug(`System Prompt: ${systemPrompt}`);
      this.logger.debug(`Chat History: ${JSON.stringify(chatHistory, null, 2)}`);
      this.logger.debug(`User Message: ${message}`);
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
      this.logger.debug(`Full Response: ${JSON.stringify(response, null, 2)}`);
      this.logger.debug('=== END LLM RESPONSE DEBUG ===');

      if (!response.ok) {
        throw new Error(`LLM API request failed: ${response.status} ${response.statusText}`);
      }

      const data: LLMResponse = await response.json();
      const llmResponse = data.choices[0]?.message?.content || 'No response generated';
      
      
      // Extract any MCP function calls from the response
      const actions = this.extractMCPActions(llmResponse);
      
      // Debug logging for extracted actions
      if (actions.length > 0) {
        this.logger.debug('=== EXTRACTED MCP ACTIONS ===');
        this.logger.debug(`Actions: ${JSON.stringify(actions, null, 2)}`);
        this.logger.debug('=== END EXTRACTED MCP ACTIONS ===');
      }
      
      return {
        response: llmResponse,
        actions,
      };
    } catch (error) {
      this.logger.error('Error generating LLM response:', error);
      return {
        response: 'I apologize, but I encountered an error while processing your message. Please try again.',
        actions: [],
      };
    }
  }

  private convertHistoryToMessages(chatHistory: Array<{ message: string; response: string }>) {
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

  private buildSystemPrompt(availableFunctions: string[]): string {
    return `You are an AI assistant for a coding education platform. You help users learn programming by providing guidance, explanations, and suggestions.

Available MCP (Model Context Protocol) functions you can use:
${availableFunctions.map(func => `- ${func}`).join('\n')}

When a user asks for help with coding problems, learning resources, or wants to practice, you can use these functions to provide more personalized assistance.

Guidelines:
1. Be helpful and encouraging
2. Provide clear explanations
3. Suggest appropriate practice problems based on user's skill level
4. Use MCP functions when relevant to enhance your responses
5. Keep responses concise but informative

If you need to use an MCP function, format your response like this:
[MCP_CALL:function_name:{"param1": "value1", "param2": "value2"}]

Then provide your response based on the function result.

Example MCP function calls:
- To get a problem by topic: [MCP_CALL:get_problem_by_topic:{"topic": "arrays", "complexity": "easy"}]
- To fetch user history: [MCP_CALL:fetch_user_history:{"userId": "user123"}]
- To get learning resources: [MCP_CALL:fetch_learning_resources:{"topic": "dynamic programming"}]
- To check solution history: [MCP_CALL:check_solution_history:{"userId": "user123", "limit": 5}]
- To execute code: [MCP_CALL:execute_code:{"code": "console.log('Hello')", "language": "javascript", "problemId": "prob123"}]`;
  }

  private extractMCPActions(response: string): any[] {
    const actions: any[] = [];
    const mcpCallRegex = /\[MCP_CALL:([^:]+):(\{[^}]+\})\]/g;
    
    let match;
    while ((match = mcpCallRegex.exec(response)) !== null) {
      try {
        const functionName = match[1];
        const args = JSON.parse(match[2]);
        actions.push({ functionName, args });
      } catch (error) {
        this.logger.warn('Failed to parse MCP action:', error);
      }
    }
    
    return actions;
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
