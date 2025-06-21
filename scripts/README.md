# LeetCode Problems Import Script

This script allows you to import LeetCode problems from a JSON file into your database.

## Usage

1. **Prepare your JSON file** with LeetCode problems in the following format:
```json
{
  "problems": [
    {
      "acRate": 55.77939635288257,
      "content": "<p>Given an array of integers...</p>",
      "difficulty": "Easy",
      "frontendQuestionId": "1",
      "hasSolution": true,
      "hasVideoSolution": true,
      "isFavor": false,
      "paidOnly": false,
      "status": "ac",
      "title": "Two Sum",
      "titleSlug": "two-sum",
      "topicTags": [
        {
          "id": "VG9waWNUYWdOb2RlOjU=",
          "name": "Array",
          "slug": "array"
        }
      ]
    }
  ]
}
```

2. **Run the import script**:
```bash
npm run import-problems <path-to-your-json-file>
```

Example:
```bash
npm run import-problems ./data/leetcode-problems.json
```

## What the script does

- **Maps LeetCode data to your database schema**:
  - `title` → `Problem.title`
  - `content` → `Problem.description` (with HTML cleaned)
  - `difficulty` → `Problem.complexity` (Easy/Medium/Hard)
  - `topicTags` → `Problem.topics` (array of topic names)

- **Extracts test cases** from the problem content using regex patterns
- **Skips existing problems** to avoid duplicates
- **Creates test cases** for each problem (both visible and hidden)
- **Provides detailed logging** of the import process

## Features

- ✅ **Duplicate detection**: Won't import problems that already exist
- ✅ **HTML cleaning**: Removes HTML tags from problem descriptions
- ✅ **Test case extraction**: Automatically extracts examples from problem content
- ✅ **Error handling**: Continues processing even if individual problems fail
- ✅ **Progress tracking**: Shows import progress and summary statistics
- ✅ **Type safety**: Full TypeScript support with proper interfaces

## Output

The script will show:
- Progress for each problem being imported
- Number of test cases created per problem
- Summary statistics at the end
- Any errors encountered during the process

## Database Schema Mapping

| LeetCode Field | Database Field | Notes |
|----------------|----------------|-------|
| `title` | `Problem.title` | Direct mapping |
| `content` | `Problem.description` | HTML cleaned |
| `difficulty` | `Problem.complexity` | Mapped to enum |
| `topicTags[].name` | `Problem.topics` | Array of topic names |
| `frontendQuestionId` | Not stored | Can be added if needed |
| `acRate` | Not stored | Can be added if needed |

## Troubleshooting

- **File not found**: Make sure the JSON file path is correct
- **Database connection**: Ensure your database is running and accessible
- **Permission errors**: Check that the script has read access to the JSON file
- **Import errors**: Check the console output for specific error messages 