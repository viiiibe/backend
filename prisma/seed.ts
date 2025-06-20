import { PrismaClient, ProblemComplexity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create topics
  const topics = [
    { name: 'Arrays', description: 'Array manipulation and algorithms' },
    { name: 'Strings', description: 'String processing and manipulation' },
    { name: 'Linked Lists', description: 'Linked list data structure' },
    { name: 'Trees', description: 'Tree data structures and algorithms' },
    { name: 'Graphs', description: 'Graph algorithms and traversal' },
    { name: 'Dynamic Programming', description: 'Dynamic programming problems' },
    { name: 'Binary Search', description: 'Binary search algorithms' },
    { name: 'Two Pointers', description: 'Two pointer technique' },
    { name: 'Sliding Window', description: 'Sliding window technique' },
    { name: 'Stack', description: 'Stack data structure' },
    { name: 'Queue', description: 'Queue data structure' },
    { name: 'Heap', description: 'Heap data structure' },
  ];

  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { name: topic.name },
      update: {},
      create: topic,
    });
  }

  console.log('✅ Topics created');

  // Get topic IDs for problem creation
  const arraysTopic = await prisma.topic.findUnique({ where: { name: 'Arrays' } });
  const stringsTopic = await prisma.topic.findUnique({ where: { name: 'Strings' } });
  const dpTopic = await prisma.topic.findUnique({ where: { name: 'Dynamic Programming' } });

  // Create sample problems
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
      topicId: arraysTopic!.id,
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
      topicId: stringsTopic!.id,
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
      topicId: dpTopic!.id,
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
      title: 'Introduction to Algorithms (CLRS) - Chapter 1: The Role of Algorithms in Computing',
      url: 'https://mitpress.mit.edu/books/introduction-algorithms-third-edition',
      metadata: { isbn: '978-0262033848', chapter: 1 },
    },
    {
      type: 'COURSE_LECTURE' as const,
      title: 'MIT 6.006 Introduction to Algorithms - Lecture 1: Algorithmic Thinking',
      url: 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-006-introduction-to-algorithms-fall-2011/',
      metadata: { course: 'MIT 6.006', lecture: 1 },
    },
    {
      type: 'ARTICLE' as const,
      title: 'Big O Notation Explained',
      url: 'https://www.freecodecamp.org/news/big-o-notation-explained-with-examples/',
      metadata: { author: 'freeCodeCamp' },
    },
  ];

  for (const resource of resources) {
    await prisma.learningResource.upsert({
      where: { url: resource.url },
      update: {},
      create: resource,
    });
  }

  console.log('✅ Learning resources created');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 