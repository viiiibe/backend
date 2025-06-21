import { PrismaClient, ProblemComplexity } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TopicTag {
  id: string;
  name: string;
  slug: string;
}

interface LeetCodeProblem {
  acRate: number;
  content: string;
  difficulty: string;
  frontendQuestionId: string;
  hasSolution: boolean;
  hasVideoSolution: boolean;
  isFavor: boolean;
  paidOnly: boolean;
  status: string;
  title: string;
  titleSlug: string;
  topicTags: TopicTag[];
  latestSubmission?: any;
}

interface LeetCodeData {
  problems: LeetCodeProblem[];
}

function mapDifficultyToComplexity(difficulty: string): ProblemComplexity {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return ProblemComplexity.EASY;
    case 'medium':
      return ProblemComplexity.MEDIUM;
    case 'hard':
      return ProblemComplexity.HARD;
    default:
      return ProblemComplexity.EASY;
  }
}

function extractTopics(topicTags: TopicTag[]): string[] {
  return topicTags.map(tag => tag.name);
}

function cleanHtmlContent(content: string): string {
  // Remove HTML tags but preserve line breaks and basic formatting
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/\n\s*\n/g, '\n\n') // Remove extra blank lines
    .trim();
}

function extractTestCases(content: string): Array<{ input: string; expectedOutput: string; isHidden: boolean }> {
  const testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }> = [];
  
  // Extract examples from the content
  const exampleRegex = /Example \d+:\s*\n(?:<pre>\s*)?<strong>Input:<\/strong>\s*(.*?)\n<strong>Output:<\/strong>\s*(.*?)(?:\n<strong>Explanation:<\/strong>.*?)?(?:\n|<\/pre>)/gs;
  
  let match;
  while ((match = exampleRegex.exec(content)) !== null) {
    const input = match[1].trim();
    const output = match[2].trim();
    
    if (input && output) {
      testCases.push({
        input: cleanHtmlContent(input),
        expectedOutput: cleanHtmlContent(output),
        isHidden: false,
      });
    }
  }

  // If no examples found, create a basic test case
  if (testCases.length === 0) {
    testCases.push({
      input: 'Basic test input',
      expectedOutput: 'Expected output',
      isHidden: false,
    });
  }

  // Add a hidden edge case test
  testCases.push({
    input: 'Edge case input',
    expectedOutput: 'Edge case output',
    isHidden: true,
  });

  return testCases;
}

async function importProblems(jsonFilePath: string) {
  console.log('🚀 Starting LeetCode problems import...');

  try {
    // Read and parse the JSON file
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const data: LeetCodeData = JSON.parse(jsonContent);

    console.log(`📊 Found ${data.problems.length} problems to import`);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const leetcodeProblem of data.problems) {
      try {
        // Check if problem already exists by title
        const existingProblem = await prisma.problem.findFirst({
          where: { title: leetcodeProblem.title }
        });

        if (existingProblem) {
          console.log(`⏭️  Skipping "${leetcodeProblem.title}" - already exists`);
          skippedCount++;
          continue;
        }

        // Extract test cases from the problem content
        const testCases = extractTestCases(leetcodeProblem.content);

        // Create the problem
        const problem = await prisma.problem.create({
          data: {
            title: leetcodeProblem.title,
            description: cleanHtmlContent(leetcodeProblem.content),
            complexity: mapDifficultyToComplexity(leetcodeProblem.difficulty),
            topics: extractTopics(leetcodeProblem.topicTags),
            isCustom: false,
            createdByUserId: null, // These are not custom problems
          },
        });

        console.log(`✅ Imported "${leetcodeProblem.title}" (${leetcodeProblem.difficulty})`);

        // Create test cases for the problem
        for (const testCase of testCases) {
          await prisma.testCase.create({
            data: {
              problemId: problem.id,
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              isHidden: testCase.isHidden,
            },
          });
        }

        console.log(`   📝 Created ${testCases.length} test cases`);
        importedCount++;

      } catch (error) {
        console.error(`❌ Error importing "${leetcodeProblem.title}":`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Import Summary:`);
    console.log(`   ✅ Successfully imported: ${importedCount} problems`);
    console.log(`   ⏭️  Skipped (already exist): ${skippedCount} problems`);
    console.log(`   ❌ Errors: ${errorCount} problems`);
    console.log(`   📊 Total processed: ${data.problems.length} problems`);

  } catch (error) {
    console.error('❌ Error reading or parsing JSON file:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const jsonFilePath = process.argv[2];

  if (!jsonFilePath) {
    console.error('❌ Please provide the path to the JSON file as an argument');
    console.log('Usage: npm run import-problems <path-to-json-file>');
    process.exit(1);
  }

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ File not found: ${jsonFilePath}`);
    process.exit(1);
  }

  try {
    await importProblems(jsonFilePath);
    console.log('🎉 Import completed successfully!');
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
} 