import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  // Placeholder methods - will be implemented later
  async findByTopic(topicId: number) {
    return this.prisma.learningResource.findMany({
      where: {
        topicResources: {
          some: {
            topicId,
          },
        },
      },
    });
  }
} 