#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LLMService } from '../src/llm/llm.service';

async function testMultiTurnLLM() {
  console.log('🧪 Testing Multi-Turn LLM Functionality...');
  
  try {
    // Create a minimal app context
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get the LLM service
    const llmService = app.get(LLMService);
    
    console.log('✅ LLM Service created successfully');
    
    // Test with a complex message that should trigger multiple MCP functions
    const testMessage = "I want to practice dynamic programming. Can you recommend a medium difficulty problem and also show me some learning resources?";
    const testUserId = "test-user-123";
    const testHistory = [
      { message: "Hello!", response: "Hi there! I'm here to help you with coding practice." }
    ];
    
    console.log(`📝 Testing with message: "${testMessage}"`);
    console.log(`👤 User ID: ${testUserId}`);
    console.log(`🔄 Expected workflow: get_all_topics → fetch_user_history → get_problem_by_topic → fetch_learning_resources`);
    
    const startTime = Date.now();
    const result = await llmService.generateResponse(
      testMessage,
      testHistory,
      testUserId
    );
    const endTime = Date.now();
    
    console.log('✅ Multi-turn LLM response generated');
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`📄 Final Response: ${result.response}`);
    console.log(`🔧 Total Actions executed: ${result.actions.length}`);
    
    if (result.actions.length > 0) {
      console.log('\n📋 MCP Actions executed:');
      result.actions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action.functionName}: ${action.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (action.success && action.result) {
          console.log(`     📊 Result: ${JSON.stringify(action.result, null, 2).substring(0, 200)}...`);
        } else if (!action.success && action.error) {
          console.log(`     ❌ Error: ${action.error}`);
        }
      });
    }
    
    // Test a simpler case
    console.log('\n🧪 Testing simpler case...');
    const simpleMessage = "What topics are available for practice?";
    const simpleResult = await llmService.generateResponse(
      simpleMessage,
      testHistory,
      testUserId
    );
    
    console.log(`📄 Simple Response: ${simpleResult.response}`);
    console.log(`🔧 Actions: ${simpleResult.actions.length}`);
    
    await app.close();
    console.log('🎉 Multi-turn LLM test completed successfully!');
    
  } catch (error) {
    console.error('❌ Multi-turn LLM test failed:', error);
    process.exit(1);
  }
}

testMultiTurnLLM(); 