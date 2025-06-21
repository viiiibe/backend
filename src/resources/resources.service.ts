import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTopic(topic: string) {
    return this.prisma.learningResource.findMany({
      where: {
        topics: {
          has: topic,
        },
      },
    });
  }

  async findByTopics(topics: string[]) {
    return this.prisma.learningResource.findMany({
      where: {
        topics: {
          hasSome: topics,
        },
      },
    });
  }

  async findAll() {
    return this.prisma.learningResource.findMany();
  }
}
