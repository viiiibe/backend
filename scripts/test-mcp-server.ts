#!/usr/bin/env ts-node

import { StandaloneMCPServer } from '../src/mcp/standalone-mcp-server';

async function testMCPServer() {
  console.log('Testing MCP Server initialization...');
  
  try {
    const server = new StandaloneMCPServer();
    console.log('✅ MCP Server created successfully');
    
    await server.start();
    console.log('✅ MCP Server started successfully');
    
    await server.stop();
    console.log('✅ MCP Server stopped successfully');
    
    console.log('🎉 All tests passed! MCP Server is working correctly.');
  } catch (error) {
    console.error('❌ MCP Server test failed:', error);
    process.exit(1);
  }
}

testMCPServer(); 