import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        submissions: {
          take: 10,
          orderBy: { submittedAt: 'desc' },
        },
        solvedProblems: {
          include: {
            problem: true,
          },
        },
      },
    });
  }

  async getUserStats(userId: string) {
    const [totalSubmissions, passedSubmissions, solvedProblems] = await Promise.all([
      this.prisma.submission.count({
        where: { userId },
      }),
      this.prisma.submission.count({
        where: { userId, status: 'PASSED' },
      }),
      this.prisma.solvedProblem.count({
        where: { userId },
      }),
    ]);

    return {
      totalSubmissions,
      passedSubmissions,
      solvedProblems,
      successRate: totalSubmissions > 0 ? (passedSubmissions / totalSubmissions) * 100 : 0,
    };
  }
} 