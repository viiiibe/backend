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
    const userSubmissions = await this.prisma.submission.findMany({
      where: { userId },
      include: {
        problem: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    });

    // If no submissions found for user, return all submissions with one per problem
    if (userSubmissions.length === 0) {
      return this.getAllSubmissionsWithOnePerProblem();
    }

    return userSubmissions;
  }

  async getAllSubmissionsWithOnePerProblem() {
    // Get all submissions with one unique submission per problem ID
    // Using a subquery to get the latest submission for each problem
    const submissions = await this.prisma.$queryRaw`
      SELECT DISTINCT ON (s.problem_id) 
        s.id,
        s.user_id,
        s.problem_id,
        s.code,
        s.language,
        s.status,
        s.failed_test_case_id,
        s.submitted_at,
        p.title as problem_title,
        p.description as problem_description,
        p.complexity as problem_complexity,
        p.topics as problem_topics
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      ORDER BY s.problem_id, s.submitted_at DESC
      LIMIT 20
    ` as any[];

    // Transform the raw query result to match the expected format
    return submissions.map((submission: any) => ({
      id: submission.id,
      userId: submission.user_id,
      problemId: submission.problem_id,
      code: submission.code,
      language: submission.language,
      status: submission.status,
      failedTestCaseId: submission.failed_test_case_id,
      submittedAt: submission.submitted_at,
      problem: {
        id: submission.problem_id,
        title: submission.problem_title,
        description: submission.problem_description,
        complexity: submission.problem_complexity,
        topics: submission.problem_topics,
      },
    }));
  }
}
