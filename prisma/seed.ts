import { PrismaClient, ProblemComplexity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample problems with topics as string arrays
  const problems = [
    {
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]

Constraints:
- 2 <= nums.length <= 104
- -109 <= nums[i] <= 109
- -109 <= target <= 109
- Only one valid answer exists.`,
      complexity: ProblemComplexity.EASY,
      topics: ['Arrays', 'Hash Table'],
      testCases: [
        { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
        { input: '[3,2,4]\n6', expectedOutput: '[1,2]' },
        { input: '[3,3]\n6', expectedOutput: '[0,1]' },
      ],
    },
    {
      title: 'Valid Parentheses',
      description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
Input: s = "()"
Output: true

Example 2:
Input: s = "()[]{}"
Output: true

Example 3:
Input: s = "(]"
Output: false

Constraints:
- 1 <= s.length <= 104
- s consists of parentheses only '()[]{}'`,
      complexity: ProblemComplexity.EASY,
      topics: ['Strings', 'Stack'],
      testCases: [
        { input: '"()"', expectedOutput: 'true' },
        { input: '"()[]{}"', expectedOutput: 'true' },
        { input: '"(]"', expectedOutput: 'false' },
        { input: '"([)]"', expectedOutput: 'false' },
      ],
    },
    {
      title: 'Climbing Stairs',
      description: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

Example 1:
Input: n = 2
Output: 2
Explanation: There are two ways to climb to the top.
1. 1 step + 1 step
2. 2 steps

Example 2:
Input: n = 3
Output: 3
Explanation: There are three ways to climb to the top.
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step

Constraints:
- 1 <= n <= 45`,
      complexity: ProblemComplexity.EASY,
      topics: ['Dynamic Programming', 'Math'],
      testCases: [
        { input: '2', expectedOutput: '2' },
        { input: '3', expectedOutput: '3' },
        { input: '4', expectedOutput: '5' },
      ],
    },
  ];

  for (const problem of problems) {
    const { testCases, ...problemData } = problem;
    
    // Check if problem already exists by title
    const existingProblem = await prisma.problem.findFirst({
      where: { title: problemData.title }
    });
    
    const createdProblem = existingProblem || await prisma.problem.create({
      data: problemData,
    });

    // Create test cases for the problem
    for (const testCase of testCases) {
      await prisma.testCase.upsert({
        where: {
          problemId_input: {
            problemId: createdProblem.id,
            input: testCase.input,
          },
        },
        update: {},
        create: {
          problemId: createdProblem.id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
        },
      });
    }
  }

  console.log('✅ Sample problems created');

  // Create sample learning resources
  const resources = [
    {
      type: 'BOOK_CHAPTER' as const,
      title: 'Introduction to Algorithms - Chapter 1: Foundations',
      url: 'https://mitpress.mit.edu/books/introduction-algorithms-third-edition',
      topics: ['Algorithms', 'Data Structures'],
      metadata: {
        isbn: '978-0262033848',
        chapter: 1,
        author: 'Thomas H. Cormen'
      }
    },
    {
      type: 'COURSE_LECTURE' as const,
      title: 'MIT 6.006 Introduction to Algorithms - Lecture 1: Algorithmic Thinking',
      url: 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-006-introduction-to-algorithms-fall-2011/lecture-videos/lecture-1-algorithmic-thinking/',
      topics: ['Algorithms', 'Problem Solving'],
      metadata: {
        course: 'MIT 6.006',
        instructor: 'Prof. Erik Demaine',
        year: 2011
      }
    },
    {
      type: 'ARTICLE' as const,
      title: 'Dynamic Programming: From Novice to Advanced',
      url: 'https://topcoder.com/community/competitive-programming/tutorials/dynamic-programming-from-novice-to-advanced/',
      topics: ['Dynamic Programming'],
      metadata: {
        author: 'TopCoder',
        difficulty: 'Intermediate'
      }
    }
  ];

  for (const resource of resources) {
    await prisma.learningResource.upsert({
      where: { url: resource.url },
      update: {},
      create: resource,
    });
  }

  console.log('✅ Sample learning resources created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 