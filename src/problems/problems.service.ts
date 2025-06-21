import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ProblemComplexity } from '@prisma/client';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  // Placeholder methods - will be implemented later
  async findAll() {
    return this.prisma.problem.findMany({
      include: {
        testCases: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: true,
      },
    });
  }

  async findByTopic(topic: string) {
    return this.prisma.problem.findMany({
      where: {
        topics: {
          has: topic,
        },
      },
      include: {
        testCases: true,
      },
    });
  }

  async findByTopicsAndComplexity(topics: string[], complexity?: string) {
    const where: any = {
      topics: {
        hasSome: topics,
      },
    };

    if (complexity) {
      where.complexity = complexity;
    }

    return this.prisma.problem.findMany({
      where,
      include: {
        testCases: true,
      },
    });
  }

  /**
   * Returns a single problem that matches the given topic and complexity,
   * excluding any IDs supplied in the excludeIds array.
   */
  async findOneByTopicAndDifficulty(
    topic: string,
    complexity: ProblemComplexity,
    excludeIds?: string[],
  ) {
    const where: any = {
      complexity,
      topics: {
        has: topic,
      },
    };

    if (excludeIds?.length) {
      where.id = { notIn: excludeIds };
    }

    return this.prisma.problem.findFirst({
      where,
      include: {
        testCases: true,
      },
    });
  }

  /**
   * Returns all unique topics from the problems table.
   */
  async findAllUniqueTopics() {
    const result = await this.prisma.$queryRaw<Array<{ unique_topic: string }>>`
      SELECT DISTINCT unnest(topics) AS unique_topic
      FROM problems
      WHERE topics IS NOT NULL
      ORDER BY unique_topic;
    `;

    return result.map((row) => row.unique_topic);
  }
}
