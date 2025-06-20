import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from '../common/dto/base.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send chat message' })
  @ApiResponse({ status: 200, description: 'Message processed' })
  async handleMessage(@Body() request: ChatRequestDto) {
    // TODO: Get userId from JWT token
    const userId = 'placeholder-user-id';
    return this.chatService.handleMessage(request.message, userId);
  }
} 