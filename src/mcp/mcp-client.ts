import {
  Client,
  StdioClientTransport,
} from '@modelcontextprotocol/sdk/dist/cjs/client';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MCPClient {
  private readonly logger = new Logger(MCPClient.name);
  private client: Client;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      name: 'vibe-backend-mcp-client',
      version: '1.0.0',
    });

    this.client.connect(new StdioClientTransport());
  }

  async listTools() {
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      this.logger.error('Error listing tools:', error);
      throw error;
    }
  }

  async callTool(name: string, arguments_: any) {
    try {
      const response = await this.client.callTool({
        name,
        arguments: arguments_,
      });
      return response;
    } catch (error) {
      this.logger.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  }

  async disconnect() {
    await this.client.close();
  }
} 