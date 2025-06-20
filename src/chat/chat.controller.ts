import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from '../common/dto/base.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send chat message' })
  @ApiResponse({ status: 200, description: 'Message processed' })
  async handleMessage(@Body() request: ChatRequestDto, @Req() req: any) {
    // Get userId from authenticated JWT token
    const userId = req.user.id;
    return this.chatService.handleMessage(request.message, userId);
  }
} 