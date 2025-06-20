import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Placeholder methods - will be implemented later
  async create(data: any) {
    return this.prisma.submission.create({
      data,
    });
  }

  async findByUser(userId: string) {
    return this.prisma.submission.findMany({
      where: { userId },
      include: {
        problem: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
} 