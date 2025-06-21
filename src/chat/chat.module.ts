import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { DatabaseModule } from '../db/database.module';
import { LLMModule } from '../llm/llm.module';
import { MCPModule } from '../mcp/mcp.module';

@Module({
  imports: [DatabaseModule, LLMModule, MCPModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
