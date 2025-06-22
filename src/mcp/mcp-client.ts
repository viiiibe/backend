import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MCPClient {
  private readonly logger = new Logger(MCPClient.name);
  private client: any;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      name: 'vibe-backend-mcp-client',
      version: '1.0.0',
    });
    // Do not connect here automatically. The consumer of this service
    // should be responsible for establishing a connection with a
    // specific transport when needed.
  }

  async listTools() {
    if (!this.client || !this.client.isConnected) {
      this.logger.error('Attempted to list tools while disconnected.');
      throw new Error('MCP client is not connected');
    }
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      this.logger.error('Error listing tools:', error);
      throw error;
    }
  }

  async callTool(name: string, arguments_: any) {
    if (!this.client || !this.client.isConnected) {
      this.logger.error(`Attempted to call tool ${name} while disconnected.`);
      throw new Error('MCP client is not connected');
    }
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
    if (this.client?.isConnected) {
      await this.client.close();
    }
  }
} 