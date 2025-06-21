#!/usr/bin/env ts-node

import { StandaloneMCPServer } from '../src/mcp/standalone-mcp-server';

async function bootstrap() {
  console.log('Starting MCP Server...');
  
  try {
    const server = new StandaloneMCPServer();
    await server.start();
    
    console.log('MCP Server started successfully');
    
    // Keep the process running
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
    
  } catch (error) {
    console.error('Failed to start MCP Server:', error);
    process.exit(1);
  }
}

bootstrap(); 