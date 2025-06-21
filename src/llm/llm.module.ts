import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMService } from './llm.service';
import { MCPModule } from '../mcp/mcp.module';

@Module({
  imports: [ConfigModule, MCPModule],
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
