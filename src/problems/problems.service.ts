import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  // Placeholder methods - will be implemented later
  async findAll() {
    return this.prisma.problem.findMany({
      include: {
        topic: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.problem.findUnique({
      where: { id },
      include: {
        topic: true,
        testCases: true,
      },
    });
  }
} 