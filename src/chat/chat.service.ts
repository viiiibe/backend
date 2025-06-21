import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ChatMessagesResponseDto } from '../common/dto/base.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async handleMessage(message: string, userId: string) {
    // Generate a response (placeholder for now)
    const response =
      'This is a placeholder response. Chat functionality will be implemented later.';

    // Store the message in the database
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        message,
        response,
        isRead: false,
      },
    });

    return {
      response,
      actions: [],
      messageId: chatMessage.id,
    };
  }

  async getChatMessages(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ChatMessagesResponseDto> {
    const skip = (page - 1) * limit;

    const [messages, total, unreadCount] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.chatMessage.count({
        where: { userId },
      }),
      this.prisma.chatMessage.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      messages: messages.map((msg) => ({
        id: msg.id,
        message: msg.message,
        response: msg.response,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      })),
      total,
      unreadCount,
    };
  }

  async clearChatMessages(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<{ deletedCount: number }> {
    const whereClause = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const result = await this.prisma.chatMessage.deleteMany({
      where: whereClause,
    });

    return { deletedCount: result.count };
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await this.prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        userId, // Ensure user can only mark their own messages as read
      },
      data: {
        isRead: true,
      },
    });
  }
}
