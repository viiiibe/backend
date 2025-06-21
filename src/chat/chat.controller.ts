import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  ChatRequestDto,
  ChatMessagesResponseDto,
  ClearChatMessagesDto,
  PaginationDto,
} from '../common/dto/base.dto';

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

  @Get('messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all chat messages for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of chat messages',
    type: ChatMessagesResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  async getChatMessages(
    @Query() pagination: PaginationDto,
    @Req() req: any,
  ): Promise<ChatMessagesResponseDto> {
    const userId = req.user.id;
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));

    return this.chatService.getChatMessages(userId, page, limit);
  }

  @Delete('messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all chat messages (mark them as read)' })
  @ApiResponse({ status: 200, description: 'Messages cleared successfully' })
  async clearChatMessages(
    @Body() clearRequest: ClearChatMessagesDto,
    @Req() req: any,
  ): Promise<{ deletedCount: number }> {
    const userId = req.user.id;
    return this.chatService.clearChatMessages(userId, clearRequest.unreadOnly);
  }

  @Post('messages/:messageId/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a specific message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markMessageAsRead(
    @Param('messageId') messageId: string,
    @Req() req: any,
  ): Promise<void> {
    const userId = req.user.id;
    return this.chatService.markMessageAsRead(messageId, userId);
  }
}
