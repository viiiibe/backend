#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LLMService } from '../src/llm/llm.service';

async function testMCPIntegration() {
  console.log('Testing MCP Integration...');
  
  try {
    // Create a minimal app context
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get the LLM service
    const llmService = app.get(LLMService);
    
    console.log('✅ LLM Service created successfully');
    
    // Test with a simple message that should trigger MCP functions
    const testMessage = "Can you get me an easy array problem?";
    const testUserId = "test-user-123";
    const testHistory = [];
    
    console.log(`Testing with message: "${testMessage}"`);
    
    const result = await llmService.generateResponse(
      testMessage,
      testHistory,
      testUserId
    );
    
    console.log('✅ LLM Service response generated');
    console.log(`Response: ${result.response}`);
    console.log(`Actions executed: ${result.actions.length}`);
    
    if (result.actions.length > 0) {
      console.log('MCP Actions:');
      result.actions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action.functionName}: ${action.success ? 'SUCCESS' : 'FAILED'}`);
        if (action.success && action.result) {
          console.log(`     Result: ${JSON.stringify(action.result, null, 2)}`);
        } else if (!action.success && action.error) {
          console.log(`     Error: ${action.error}`);
        }
      });
    }
    
    await app.close();
    console.log('🎉 MCP Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ MCP Integration test failed:', error);
    process.exit(1);
  }
}

testMCPIntegration(); 