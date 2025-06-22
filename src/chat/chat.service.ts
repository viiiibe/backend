import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { LLMService } from '../llm/llm.service';
import { MCPService } from '../mcp/mcp.service';
import { ChatMessagesResponseDto } from '../common/dto/base.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly mcpService: MCPService,
  ) {}

  async handleMessage(message: string, userId: string) {
    // Fetch chat history for context
    const chatHistory = await this.getChatHistoryForContext(userId);

    console.log('chatHistory', chatHistory);

    // Generate response using LLM with chat history and MCPs
    const { response, actions } = await this.llmService.generateResponse(
      message,
      chatHistory,
      userId,
    );

    console.log('response', response);
    console.log('actions', actions);

    // Enhance response with MCP results if any actions were executed
    let enhancedResponse = response;
    if (actions && actions.length > 0) {
      enhancedResponse = this.enhanceResponseWithMCPResults(response, actions);
    }

    // Store the message in the database
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        message,
        response: enhancedResponse,
        isRead: false,
      },
    });

    return {
      response: enhancedResponse,
      actions: actions || [],
      messageId: chatMessage.id,
    };
  }

  private async getChatHistoryForContext(
    userId: string,
  ): Promise<Array<{ message: string; response: string }>> {
    // Fetch the last 10 messages for context
    const messages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        message: true,
        response: true,
      },
    });

    // Reverse to get chronological order
    return messages.reverse();
  }

  private enhanceResponseWithMCPResults(
    originalResponse: string,
    actions: Array<{
      functionName: string;
      args: any;
      result?: any;
      success: boolean;
      error?: string;
    }>,
  ): string {
    try {
      const successfulResults = actions.filter((r) => r.success);
      const failedResults = actions.filter((r) => !r.success);

      let enhancedResponse = originalResponse;

      if (successfulResults.length > 0) {
        const resultsText = successfulResults
          .map((r) => {
            const resultStr =
              typeof r.result === 'object'
                ? JSON.stringify(r.result, null, 2)
                : String(r.result);
            return `**${r.functionName}**:\n${resultStr}`;
          })
          .join('\n\n');

        enhancedResponse += `\n\n--- MCP Results ---\n${resultsText}`;
      }

      if (failedResults.length > 0) {
        const errorText = failedResults
          .map((r) => `**${r.functionName}**: Error - ${r.error}`)
          .join('\n');

        enhancedResponse += `\n\n--- MCP Errors ---\n${errorText}`;
      }

      return enhancedResponse;
    } catch (error) {
      console.error('Error enhancing response with MCP results:', error);
      return originalResponse;
    }
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
