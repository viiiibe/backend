I'm writing an app for a hackathon. I will give you as many details as possible, but feel free to ask me any clarifying questions. I have only two days to complete the project, so the resulting design should be very detailed so we can use its parts for implementation. I will be implementing the project 100% using AI and LLM coding agents, so writing lots of code shouldn't be a problem.

The project is an AI assistant which will prove a personalised approach to preparing for a FAANG coding interview. I strongly believe that the future of education is tailored for an individual student. The existing platforms such as leetcode just assume the average knowledge level of the user and try to propose standard courses, which fit this average user. However, in reality I personally often run into situations when the learning content is either too shallow and covers only basic details which I already know, while I'm looking for something more advanced, or too hard from the beginning because they assume some previous knowledge, which I might not have. Sometimes it is both. So ideally if the system knows what I already know and what I don't know, it can lead me through the process and give me material which is a little bit challenging and at the time not too easy or completely new to me. To some extent the existing LLMs can do this already, but the tricky part is that I still need to tell the system everything that I know in advance, which might take a lot of time. Also the existing LLMs are too general-purpose, so they don't have access to the tools required for this specific task of preparation for the coding interview (mainly validating the solution of an algorithmic problem by running tests).

The project will try to resolve this problem by integrating LLM more tightly with some 3rd party tools to both provide more context to the model and give the ability to run different tools, which will help to validate the student's progress.

In particular, the following integrations will be required:

1. Fetch a count of solved problems by topic from the leetcode (given the username)  
2. Fetch a list of solved problems. Hidden behind the user auth, so may be not available. In case it is not available, we will need some way, such as a chrome extension or something to export a list of the solved problems from leetcode, so the user doesn't have to give their leetcode cookie to us  
3. Execute code and run test cases

Also, we need to provide extra context to the user if we found any gaps in their knowledge, such as:

1. Links to the recommended courses (maybe even specific lectures in those courses)  
2. Links to the chapters in the recommended books  
3. Links to the solutions of the problems from leetcode. It will be ideal if we can get those into the DB and then use RAG to add these solutions to the context  
4. I'll manually create a graph of dependencies for the recommended sequence of learning topics.

Here are some of the journeys that we'll have in the system

1. Problem suggestion and submitting a solution  
* When a user asks for a new problem to solve LLM needs to detect it and pull all the previous user's solution history (including their solutions code) in the context. It needs to do that via MCP by calling a server  
* Based on all of the information, the LLM needs to decide which task to do. For that it needs to determine the topic, where the user needs improvement (based on their history) and suggest the next topic and the complexity of the problem. It then needs to query the question bank via MCP for the problems from this topic and with this complexity, which the user didn't solve  
* Finally, it should show the description of the problem to the user and a field to enter the user's solution.  
* When the user submits the solution, the model has to call (via MCP) the service which provides code execution sandbox, execute code and run test cases against the user's solution. If the test cases pass we start over from the beginning. If they don't we should consider giving the user some slight hints, without giving away the solution, and wait for the user to submit a better solution  
2. Solve a specific problem  
   1. The user might ask to solve a specific problem. The journey is mostly the same as the previous just the problem selection part is skipped  
3. Displaying user profile  
   1. The user will be able to see the profile page with their username, list of the solved problems, statistics of the solved problems, etc  
3. List all the problems with filters by difficulty, topic, etc

The system will consist of the following components:

* Frontend, which will provide an interface for a user, in particular it will  
  * Suggest the next problem to solve (personalised)  
  * Allow the user to submit the solution  
  * Show the submission result and give the user hints about the correct solution  
  * When the submission is successful, mark the problem as solved and give the user some additional information, such as  
    * Papers with real-world systems built using this algorithm  
    * Chapters from the recommended books related to this algorithm  
  * Show the list of all the available problems, including the already solved or attempted problems  
  * Have a separate page for the user profile showing all the information available about the user  
* Backend service, which will serve queries necessary for the backend. It will primarily serve queries using LLM, which will run queries to MCP servers to decide what the user needs to do  
* Chrome/Firefox extension to fetch the user's problems from leetcode and export it in the JSON format. This will be needed to bootstrap the user account, so we can give informed recommendations.

# Database requirements summary

This design is normalized to reduce data redundancy, uses appropriate data types for efficiency, and includes the necessary relationships to power all the features you've described. It's structured to be easily translated into DDL (Data Definition Language) by a coding agent.

### **Core Tables**

1. users: Stores user information, linked to your Auth0 authentication provider.  
2. topics: A central list of all coding topics (e.g., "Arrays", "Graphs", "Dynamic Programming").  
3. problems: The main table for all coding problems, both from the shared bank and custom ones uploaded by users.  
4. test\_cases: Stores the individual test cases for each problem.  
5. submissions: The most critical table for personalization. It tracks every attempt a user makes on a problem.  
6. learning\_resources: A repository of external learning materials like book chapters, articles, and courses.  
7. topic\_dependencies: Models the prerequisite graph you mentioned, defining the learning path.  
8. topic\_resources\_link: A join table to link multiple resources to multiple topics.

---

### **Visual Schema (Mermaid Diagram)**

This diagram shows the relationships between the tables.

Generated mermaid  
     erDiagram  
    users {  
        text id PK "Auth0 User ID"  
        text email UK  
        text name  
        text picture\_url  
        timestamp created\_at  
    }

    topics {  
        serial id PK  
        text name UK  
        text description  
    }

    problems {  
        uuid id PK  
        text title  
        text description  
        problem\_complexity complexity  
        integer topic\_id FK  
        boolean is\_custom  
        text created\_by\_user\_id FK "Nullable"  
        timestamp created\_at  
    }

    test\_cases {  
        serial id PK  
        uuid problem\_id FK  
        text input  
        text expected\_output  
        boolean is\_hidden "For private tests"  
    }

    submissions {  
        uuid id PK  
        text user\_id FK  
        uuid problem\_id FK  
        text code  
        text language  
        submission\_status status  
        integer failed\_test\_case\_id FK "Nullable"  
        timestamp submitted\_at  
    }

    learning\_resources {  
        serial id PK  
        resource\_type type  
        text title  
        text url  
        jsonb metadata "e.g., book ISBN, chapter, course name"  
    }

    topic\_dependencies {  
        integer prerequisite\_topic\_id PK, FK  
        integer dependent\_topic\_id PK, FK  
    }

    topic\_resources\_link {  
        integer topic\_id PK, FK  
        integer resource\_id PK, FK  
    }

    users ||--o{ submissions : "has"  
    users ||--o{ problems : "creates custom"  
    topics ||--o{ problems : "has"  
    problems ||--o{ test\_cases : "has"  
    problems ||--o{ submissions : "has"  
    test\_cases ||--o{ submissions : "can fail"

    topics }|--|| topic\_dependencies : "is prerequisite for"  
    topics }|--|| topic\_dependencies : "depends on"  
    topics }o--o{ learning\_resources : "has"  
    topic\_resources\_link }o--|| topics : "links"  
    topic\_resources\_link }o--|| learning\_resources : "links"  
     
---

### **SQL DDL for Table Creation**

Here is the SQL code to create the tables, including custom types, constraints, and indexes. This is ready for an implementation agent.

Generated sql  
     \-- Create ENUM types for controlled vocabularies  
CREATE TYPE problem\_complexity AS ENUM ('EASY', 'MEDIUM', 'HARD');  
CREATE TYPE submission\_status AS ENUM ('PENDING', 'PASSED', 'FAILED', 'ERROR');  
CREATE TYPE resource\_type AS ENUM ('BOOK\_CHAPTER', 'COURSE\_LECTURE', 'ARTICLE', 'VIDEO', 'PAPER');

\-- 1\. Users Table  
\-- Stores primary user data, using the Auth0 ID as the primary key.  
CREATE TABLE users (  
    id TEXT PRIMARY KEY, \-- From Auth0, e.g., 'auth0|65a...' or 'github|12345'  
    email TEXT UNIQUE NOT NULL,  
    name TEXT,  
    picture\_url TEXT,  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 2\. Topics Table  
\-- The master list of all topics available for study.  
CREATE TABLE topics (  
    id SERIAL PRIMARY KEY,  
    name TEXT UNIQUE NOT NULL,  
    description TEXT,  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    updated\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 3\. Problems Table  
\-- Contains all problems, linked to a topic.  
CREATE TABLE problems (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    title TEXT NOT NULL,  
    description TEXT NOT NULL, \-- Can store Markdown  
    complexity problem\_complexity NOT NULL,  
    topic\_id INTEGER NOT NULL REFERENCES topics(id),  
    is\_custom BOOLEAN NOT NULL DEFAULT FALSE,  
    created\_by\_user\_id TEXT REFERENCES users(id) ON DELETE SET NULL, \-- Null if not custom or user deleted  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    updated\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    CONSTRAINT fk\_custom\_problem\_user CHECK ( (is\_custom IS TRUE AND created\_by\_user\_id IS NOT NULL) OR (is\_custom IS FALSE) )  
);

\-- 4\. Test Cases Table  
\-- Stores inputs and expected outputs for each problem.  
CREATE TABLE test\_cases (  
    id SERIAL PRIMARY KEY,  
    problem\_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,  
    input TEXT NOT NULL,  
    expected\_output TEXT NOT NULL,  
    is\_hidden BOOLEAN NOT NULL DEFAULT FALSE, \-- To distinguish public vs. validation tests  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 5\. Submissions Table  
\-- Logs every single code submission from users. This is the key table for personalization.  
CREATE TABLE submissions (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    problem\_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,  
    code TEXT NOT NULL,  
    language VARCHAR(50) NOT NULL,  
    status submission\_status NOT NULL DEFAULT 'PENDING',  
    failed\_test\_case\_id INTEGER REFERENCES test\_cases(id), \-- Null if passed or errored before tests  
    submitted\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 6\. Learning Resources Table  
\-- A catalog of helpful books, articles, videos, etc.  
CREATE TABLE learning\_resources (  
    id SERIAL PRIMARY KEY,  
    type resource\_type NOT NULL,  
    title TEXT NOT NULL,  
    url TEXT UNIQUE NOT NULL,  
    \-- Flexible metadata field for resource-specific info (e.g., ISBN, chapter, author)  
    metadata JSONB,  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 7\. Topic Dependencies Table (The Learning Graph)  
\-- A self-referencing join table on topics to create a directed graph of prerequisites.  
CREATE TABLE topic\_dependencies (  
    prerequisite\_topic\_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,  
    dependent\_topic\_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,  
    PRIMARY KEY (prerequisite\_topic\_id, dependent\_topic\_id),  
    CONSTRAINT check\_no\_self\_dependency CHECK (prerequisite\_topic\_id \<\> dependent\_topic\_id)  
);

\-- 8\. Topic-Resources Link Table  
\-- A many-to-many join table connecting topics and learning resources.  
CREATE TABLE topic\_resources\_link (  
    topic\_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,  
    resource\_id INTEGER NOT NULL REFERENCES learning\_resources(id) ON DELETE CASCADE,  
    PRIMARY KEY (topic\_id, resource\_id)  
);

\-- Create Indexes for Performance  
\-- Indexes are crucial for fast lookups on foreign keys and frequently filtered columns.  
CREATE INDEX idx\_problems\_topic\_id ON problems(topic\_id);  
CREATE INDEX idx\_problems\_complexity ON problems(complexity);  
CREATE INDEX idx\_submissions\_user\_id ON submissions(user\_id);  
CREATE INDEX idx\_submissions\_problem\_id ON submissions(problem\_id);  
CREATE INDEX idx\_submissions\_user\_problem ON submissions(user\_id, problem\_id); \-- For finding user's past submissions on a problem  
CREATE INDEX idx\_test\_cases\_problem\_id ON test\_cases(problem\_id);  
CREATE INDEX idx\_topic\_resources\_link\_resource\_id ON topic\_resources\_link(resource\_id);  
     
IGNORE\_WHEN\_COPYING\_START  
content\_copy download  
Use code [with caution](https://support.google.com/legal/answer/13505487). SQL  
IGNORE\_WHEN\_COPYING\_END

### **Design Rationale**

* **User ID as Primary Key**: Using the stable, unique ID from Auth0 (users.id) is the best practice. It prevents user duplication if they change their email and simplifies integration.  
* **UUID for Public-Facing Entities**: problems and submissions use UUIDs as primary keys. This prevents malicious users from guessing URLs (e.g., /problems/124) to scrape all your content.  
* **ENUMs for Controlled State**: Using ENUM types for complexity, status, and resource\_type ensures data integrity and is more efficient than using strings.  
* **No Redundant Statistics**: User statistics (like "number of problems solved by topic") are not stored directly in the database. They should be **calculated on the fly** with SQL queries (e.g., SELECT topic\_id, COUNT(DISTINCT problem\_id) ... FROM submissions WHERE status \= 'PASSED' ... GROUP BY topic\_id). This avoids data synchronization issues and is always up-to-date.  
* **JSONB for Flexibility**: The metadata column in learning\_resources is a JSONB field. This allows you to store different kinds of structured data for different resource types (e.g., ISBN for books, course name for videos) without changing the database schema.  
* **Cascading Deletes**: ON DELETE CASCADE is used where it makes sense (e.g., if a problem is deleted, its test cases and submissions should also be deleted) to maintain data consistency.

# Server Requirements Summary

### 1\. Core Functionality

* User requests a new problem:  
  * The server, with LLM assistance, selects an appropriate problem based on the user’s history, weaknesses, and unsolved topics.Returns: Problem details and a justification for the selection.  
* User submits a solution:  
  * The server evaluates the solution using a code execution sandbox, runs test cases, and returns the result.Returns: Pass/fail status, the first failed test case (if any), and hints.  
* User can view the question bank:  
  * The server provides a list of available problems, filterable by topic, complexity, and whether the user has solved them.  
* User can view their solved problems and submission history:  
  * The server provides endpoints to list all problems a user has solved and all their submissions for a given problem.  
* User can upload custom problems:  
  * Users can add their own problems, which are visible only to them.  
* User (or admin) can bulk upload solution history:  
  * For demo/import purposes, the server supports bulk uploading of past solutions.

---

### 2\. API Endpoints

| Endpoint | Method | Purpose | Notes |
| :---- | :---- | :---- | :---- |
| /api/problems/:problemId | GET | Get problem details |  |
| /api/problems/upload | POST | Upload a new (custom) problem | Visible only to uploader |
| /api/users/:userId/solved | GET | List solved problems for user |  |
| /api/solutions | GET | List submissions for a problem/user |  |
| /api/solutions/upload | POST | Bulk upload solution history | For demo/import Server design prompt |
| /api/chat | POST | Free-form chat/query endpoint |  |

---

### 3\. Data & Security Considerations

* User authentication is handled by an external identity provider; endpoints expect a userId (or will use auth tokens in production).  
* Custom problems are visible only to the user who uploaded them.  
* Shared question bank problems are visible to all users; the server ensures not to propose already-solved shared problems.  
* Test case feedback: Only the first failed test case is returned to the user after evaluation.  
* No endpoints for editing/deleting problems or solutions, favoriting/bookmarking, or tracking extra metadata like time spent or number of attempts.

---

### 4\. LLM Orchestration

* The server is responsible for:  
* Fetching user history and context.  
* Passing this context to the LLM to select the next problem and generate a justification.  
* Ensuring the LLM does not propose already-solved shared problems.

---

### 5\. Code Execution

* The server uses an external code execution sandbox (e.g., Judge0) to safely run user-submitted code and evaluate test cases.

---

### 6\. Problem Linking

* The server returns a problemId for each problem; the frontend forms URLs using this ID (e.g., /problems/:problemId).

---

Let me know if you want a visual diagram, data model suggestions, or to move on to another part of the system\!

## API Endpoint Declarations

---

### Get Problem by ID

### http GET /api/problems/:problemId

Response:  
\`\`\`  
{  
"problemId": "string",  
"title": "string",  
"description": "string",  
"topic": "string",  
"complexity": "string",  
"isCustom": true | false  
}  
\`\`\`

### List Problems (Question Bank)

### http GET /api/problems

Query Parameters:

* topic (optional)  
* complexity (optional)  
* userId (optional, for solved status)  
* isCustom (optional, boolean)

Response:  
\`\`\`  
\[  
{  
"problemId": "string",  
"title": "string",  
"topic": "string",  
"complexity": "string",  
"solved": true | false,  
"isCustom": true | false  
}  
\]  
\`\`\`

### Upload a Custom Problem

### http POST /api/problems/upload

Request Body:  
\`\`\`  
{  
"userId": "string",  
"title": "string",  
"description": "string",  
"topic": "string",  
"complexity": "string",  
"testCases": \[  
{ "input": "string", "expectedOutput": "string" }  
\]  
}  
\`\`\`  
Response:  
\`\`\`  
{  
"problemId": "string"  
}  
\`\`\`

### List User’s Solved Problems

### http GET /api/users/:userId/solved

Response:  
\`\`\`  
\[  
{  
"problemId": "string",  
"title": "string",  
"dateSolved": "ISO8601 string",  
"isCustom": true | false  
}  
\]  
\`\`\`

### List User’s Submissions for a Problem

### http GET /api/solutions?userId=...\&problemId=...

Response:  
\`\`\`  
\[  
{  
"submissionId": "string",  
"code": "string",  
"language": "string",  
"result": "passed" | "failed",  
"timestamp": "ISO8601 string"  
}  
\]  
\`\`\`

### Bulk Upload Solution History

### http POST /api/solutions/upload

Request Body:  
\`\`\`  
\[  
{  
"userId": "string",  
"problemId": "string",  
"code": "string",  
"language": "string",  
"result": "passed" | "failed",  
"timestamp": "ISO8601 string"  
}  
\]  
\`\`\`  
Response:  
\`\`\`  
{  
"success": true  
}  
\`\`\`

### Endpoint: /api/chat

Purpose:  
Allow the frontend to send arbitrary user queries (e.g., “Explain Dijkstra’s algorithm”, “What’s my weakest topic?”, “Suggest a book for dynamic programming”, etc.).  
The backend will orchestrate LLM, context fetching, and tool calls as needed.

Example Request:  
\`\`\`  
{  
"userId": "user123",  
"message": "What is my weakest topic?",  
"context": {}  
}  
\`\`\`

Example Response:  
\`\`\`  
{  
"response": "Based on your recent submissions, your weakest topic is Dynamic Programming. Would you like to practice more problems in this area?",  
"actions": \[  
{ "type": "fetch\_user\_history", "details": { "solved": 12, "failed": 5 } }  
\]  
\`\`\`

## OpenAPI definition

openapi: 3.0.0    
info:    
  title: LeetCode-like LLM Service API    
  version: 1.0.0    
  description: API for a LeetCode-like service with LLM-driven problem selection and code evaluation.  
servers:    
  \- url: https://your-api-domain.com  
paths:    
  /api/problems/{problemId}:    
    get:    
      summary: Get problem details by ID    
      parameters:    
        \- in: path    
          name: problemId    
          required: true    
          schema:    
            type: string    
      responses:    
        '200':    
          description: Problem details    
          content:    
            application/json:    
              schema:    
                $ref: '\#/components/schemas/ProblemDetails'  
  /api/problems:    
    get:    
      summary: List problems (filterable, custom/shared)    
      parameters:    
        \- in: query    
          name: topic    
          schema:    
            type: string    
        \- in: query    
          name: complexity    
          schema:    
            type: string    
        \- in: query    
          name: userId    
          schema:    
            type: string    
        \- in: query    
          name: isCustom    
          schema:    
            type: boolean    
      responses:    
        '200':    
          description: List of problems    
          content:    
            application/json:    
              schema:    
                type: array    
                items:    
                  $ref: '\#/components/schemas/ProblemListItem'  
  /api/problems/upload:    
    post:    
      summary: Upload a new (custom) problem    
      requestBody:    
        required: true    
        content:    
          application/json:    
            schema:    
              $ref: '\#/components/schemas/UploadProblem'    
      responses:    
        '200':    
          description: Problem uploaded    
          content:    
            application/json:    
              schema:    
                $ref: '\#/components/schemas/UploadProblemResponse'  
  /api/users/{userId}/solved:    
    get:    
      summary: List solved problems for user    
      parameters:    
        \- in: path    
          name: userId    
          required: true    
          schema:    
            type: string    
      responses:    
        '200':    
          description: List of solved problems    
          content:    
            application/json:    
              schema:    
                type: array    
                items:    
                  $ref: '\#/components/schemas/SolvedProblem'  
  /api/solutions:    
    get:    
      summary: List submissions for a problem/user    
      parameters:    
        \- in: query    
          name: userId    
          required: true    
          schema:    
            type: string    
        \- in: query    
          name: problemId    
          required: true    
          schema:    
            type: string    
      responses:    
        '200':    
          description: List of submissions    
          content:    
            application/json:    
              schema:    
                type: array    
                items:    
                  $ref: '\#/components/schemas/SolutionSubmission'  
  /api/solutions/upload:    
    post:    
      summary: Bulk upload solution history    
      requestBody:    
        required: true    
        content:    
          application/json:    
            schema:    
              type: array    
              items:    
                $ref: '\#/components/schemas/BulkSolutionUploadItem'    
      responses:    
        '200':    
          description: Bulk upload result    
          content:    
            application/json:    
              schema:    
                $ref: '\#/components/schemas/BulkUploadResponse'  
  /api/chat:    
    post:    
      summary: Free-form chat/query endpoint    
      requestBody:    
        required: true    
        content:    
          application/json:    
            schema:    
              $ref: '\#/components/schemas/ChatRequest'    
      responses:    
        '200':    
          description: LLM-generated response    
          content:    
            application/json:    
              schema:    
                $ref: '\#/components/schemas/ChatResponse'  
components:    
  schemas:    
    ChatRequest:    
      type: object    
      required: \[userId, message\]    
      properties:    
        userId:    
          type: string    
        message:    
          type: string    
        context:    
          type: object    
          description: Optional extra context (e.g., current problemId, etc.)    
    ChatResponse:    
      type: object    
      properties:    
        response:    
          type: string    
        actions:    
          type: array    
          description: Optional list of actions the LLM took (for debugging/UI)    
          items:    
            type: object    
            properties:    
              type:    
                type: string    
              details:    
                type: object  
    RequestNewProblem:    
      type: object    
      required: \[userId\]    
      properties:    
        userId:    
          type: string  
    ProblemWithJustification:    
      type: object    
      properties:    
        problemId:    
          type: string    
        title:    
          type: string    
        description:    
          type: string    
        topic:    
          type: string    
        complexity:    
          type: string    
        justification:    
          type: string  
    SubmitSolution:    
      type: object    
      required: \[userId, problemId, code, language\]    
      properties:    
        userId:    
          type: string    
        problemId:    
          type: string    
        code:    
          type: string    
        language:    
          type: string  
    SolutionResult:    
      type: object    
      properties:    
        result:    
          type: string    
          enum: \[passed, failed\]    
        failedTestCase:    
          type: object    
          nullable: true    
          properties:    
            input:    
              type: string    
            expected:    
              type: string    
            output:    
              type: string    
        hints:    
          type: array    
          items:    
            type: string  
    ProblemDetails:    
      type: object    
      properties:    
        problemId:    
          type: string    
        title:    
          type: string    
        description:    
          type: string    
        topic:    
          type: string    
        complexity:    
          type: string    
        isCustom:    
          type: boolean  
    ProblemListItem:    
      type: object    
      properties:    
        problemId:    
          type: string    
        title:    
          type: string    
        topic:    
          type: string    
        complexity:    
          type: string    
        solved:    
          type: boolean    
        isCustom:    
          type: boolean  
    UploadProblem:    
      type: object    
      required: \[userId, title, description, topic, complexity, testCases\]    
      properties:    
        userId:    
          type: string    
        title:    
          type: string    
        description:    
          type: string    
        topic:    
          type: string    
        complexity:    
          type: string    
        testCases:    
          type: array    
          items:    
            type: object    
            properties:    
              input:    
                type: string    
              expectedOutput:    
                type: string  
    UploadProblemResponse:    
      type: object    
      properties:    
        problemId:    
          type: string  
    SolvedProblem:    
      type: object    
      properties:    
        problemId:    
          type: string    
        title:    
          type: string    
        dateSolved:    
          type: string    
          format: date-time    
        isCustom:    
          type: boolean  
    SolutionSubmission:    
      type: object    
      properties:    
        submissionId:    
          type: string    
        code:    
          type: string    
        language:    
          type: string    
        result:    
          type: string    
          enum: \[passed, failed\]    
        timestamp:    
          type: string    
          format: date-time  
    BulkSolutionUploadItem:    
      type: object    
      properties:    
        userId:    
          type: string    
        problemId:    
          type: string    
        code:    
          type: string    
        language:    
          type: string    
        result:    
          type: string    
          enum: \[passed, failed\]    
        timestamp:    
          type: string    
          format: date-time  
    BulkUploadResponse:    
      type: object    
      properties:    
        success:    
          type: boolean  

### Frontend: Core Pages Structure

1. **Landing Page / Home (`/`)**  
     
   - Welcome message and getting started guide  
   - Quick stats dashboard for logged-in users  
   - Call-to-action for new users to sign up/login

   

2. **Chat Interface (Main Page) (`/chat`)**  
     
   - Primary interaction point for all user activities  
   - Dynamic UI components that appear based on context:  
       
     \+----------------------------------+  
     |             Header               |  
     \+----------------------------------+  
     |                                  |  
     |         Chat History            |  
     |    \+----------------------+      |  
     |    | User Message        |      |  
     |    \+----------------------+      |  
     |    | AI Response         |      |  
     |    \+----------------------+      |  
     |    | Problem Description |      |  
     |    | (When requested)    |      |  
     |    \+----------------------+      |  
     |    | Code Editor         |      |  
     |    | (When needed)       |      |  
     |    \+----------------------+      |  
     |                                  |  
     \+----------------------------------+  
     |        Message Input            |  
     \+----------------------------------+

     
3. **User Profile Page (`/profile`)**  
     
   - User information  
   - Solved problems statistics  
   - Topic-wise progress  
   - Recent activity  
   - Learning path progress  
   - Weakest/strongest topics visualization

### 2\. Dynamic Chat Components

1. **Message Types**  
     
   - Text messages (user/AI)  
   - Problem descriptions  
   - Code submission requests  
   - Test results  
   - Hints  
   - Resource links  
   - Progress updates

   

2. **Code Editor Component**  
     
   \+----------------------------------+  
     
   |    Language Selector | Submit    |  
     
   \+----------------------------------+  
     
   |                                  |  
     
   |        Monaco Editor            |  
     
   |                                  |  
     
   \+----------------------------------+  
     
   |           Test Results           |  
     
   \+----------------------------------+  
     
   - Appears when:  
     - AI requests code submission  
     - User wants to modify previous submission  
   - Collapses when not needed

   

3. **Problem Display Component**  
     
   \+----------------------------------+  
     
   |         Problem Title            |  
     
   \+----------------------------------+  
     
   |      Problem Description         |  
     
   |                                  |  
     
   \+----------------------------------+  
     
   |          Examples               |  
     
   \+----------------------------------+  
     
   |         Constraints             |  
     
   \+----------------------------------+  
     
   - Embedded within chat flow  
   - Collapsible for reference  
   - Sticky option while coding

   

4. **Resource Panel**  
     
   \+----------------------------------+  
     
   |        Related Resources         |  
     
   \+----------------------------------+  
     
   | • Book References                |  
     
   | • Similar Problems               |  
     
   | • Helpful Articles               |  
     
   | • Video Tutorials                |  
     
   \+----------------------------------+  
     
   - Appears alongside relevant AI responses  
   - Contextual to current topic/problem

### Frontend: Chat Flow States

1. **Initial State**  
     
   - Welcome message  
   - Suggested actions  
   - Previous chat history

   

2. **Problem Selection State**  
     
   - AI analyzing user level  
   - Problem suggestions  
   - Justification for selection

   

3. **Problem Solving State**  
     
   - Problem description  
   - Code editor  
   - Test results  
   - Hints (if requested)

   

4. **Review State**  
     
   - Solution feedback  
   - Additional resources  
   - Next steps suggestions

### Fronend: UI/UX Considerations

1. **Message Grouping**  
     
   - Group related messages (problem \+ code editor \+ results)  
   - Collapsible sections for better navigation  
   - Clear visual hierarchy

   

2. **Context Persistence**  
     
   - Keep relevant problem info visible while coding  
   - Maintain chat history for reference  
   - Save code drafts automatically

   

3. **Progressive Disclosure**  
     
   - Show UI elements only when needed  
   - Smooth transitions between states  
   - Clear visual cues for available actions

   

4. **Responsive Design**  
     
   - Adapt complex UI components for mobile  
   - Maintain usability on smaller screens  
   - Touch-friendly interactions

### Frontend: Technical Implementation

1. **Component Architecture**  
     
   interface ChatMessage {  
     
     type: 'text' | 'problem' | 'code-request' | 'result' | 'resource';  
     
     content: any;  
     
     metadata?: {  
     
       problemId?: string;  
     
       submissionId?: string;  
     
       timestamp: string;  
     
     };  
     
   }  
     
2. **State Management**  
     
   interface ChatState {  
     
     messages: ChatMessage\[\];  
     
     currentContext?: {  
     
       problemId?: string;  
     
       editorVisible: boolean;  
     
       problemVisible: boolean;  
     
       activeSubmission?: string;  
     
     };  
     
     userProfile: UserProfile;  
     
   }  
     
3. **API Integration**  
     
   - WebSocket for real-time chat  
   - REST for user data and history  
   - File upload for code submissions

### Backend: High-Level Architecture

Here's the proposed server architecture with key components:

src/

├── api/                    \# API route handlers

├── services/              \# Business logic services

├── models/                \# Data models and interfaces

├── llm/                   \# LLM integration components

├── sandbox/               \# Code execution integration

├── db/                    \# Database access layer

├── utils/                \# Utility functions

└── config/               \# Configuration files

### Backend: Core Technologies

1. **Framework & Runtime**  
     
   - NestJS (TypeScript-first framework with excellent dependency injection)  
   - Node.js runtime

   

2. **LLM Integration**  
     
   - Langchain.js for LLM orchestration  
   - Support for multiple LLM providers (OpenAI, Ollama, Gemini)

   

3. **Database**  
     
   - PostgreSQL with Prisma ORM  
   - Redis for caching and rate limiting

   

4. **Code Execution**  
     
   - Daytona.io integration via ACI.dev for secure code execution  
   - Fallback to Judge0 API if needed

### Backend: Key Components Design

Let me show you the core components and their interactions:

1. **LLM Service**

// src/llm/llm.service.ts

import { LangChain } from 'langchain';

import { ChatOpenAI } from 'langchain/chat\_models';

export class LLMService {

  private model: ChatOpenAI;

  

  async suggestNextProblem(userId: string): Promise\<ProblemSuggestion\> {

    const userContext \= await this.getUserContext(userId);

    const prompt \= this.buildPrompt(userContext);

    const response \= await this.model.predict(prompt);

    return this.parseLLMResponse(response);

  }

  async evaluateAndProvideHints(

    submission: CodeSubmission

  ): Promise\<EvaluationResult\> {

    // Evaluate code and generate helpful hints

  }

}

2. **Code Execution Service**

// src/sandbox/code-execution.service.ts

import { DaytonaClient } from '@aci/daytona';

export class CodeExecutionService {

  private daytonaClient: DaytonaClient;

  async executeCode(

    submission: CodeSubmission

  ): Promise\<ExecutionResult\> {

    const sandbox \= await this.daytonaClient.createSandbox({

      language: submission.language,

    });

    const result \= await sandbox.execute({

      code: submission.code,

      testCases: submission.testCases,

    });

    return this.processExecutionResult(result);

  }

}

3. **Problem Service**

// src/services/problem.service.ts

export class ProblemService {

  constructor(

    private readonly llmService: LLMService,

    private readonly executionService: CodeExecutionService,

    private readonly prisma: PrismaClient

  ) {}

  async suggestNextProblem(userId: string): Promise\<Problem\> {

    const suggestion \= await this.llmService.suggestNextProblem(userId);

    return this.prisma.problem.findUnique({

      where: { id: suggestion.problemId }

    });

  }

  async evaluateSubmission(

    submission: SubmitSolutionDto

  ): Promise\<SolutionResult\> {

    const executionResult \= await this.executionService

      .executeCode(submission);

    

    if (\!executionResult.passed) {

      const hints \= await this.llmService

        .generateHints(submission, executionResult);

      return { ...executionResult, hints };

    }

    return executionResult;

  }

}

4. **Chat Service**

// src/services/chat.service.ts

export class ChatService {

  constructor(

    private readonly llmService: LLMService,

    private readonly problemService: ProblemService

  ) {}

  async handleMessage(

    request: ChatRequest

  ): Promise\<ChatResponse\> {

    const intent \= await this.llmService.detectIntent(request.message);

    

    switch (intent.type) {

      case 'REQUEST\_PROBLEM':

        return this.handleProblemRequest(request.userId);

      case 'SUBMIT\_SOLUTION':

        return this.handleSolutionSubmission(request);

      case 'REQUEST\_HELP':

        return this.handleHelpRequest(request);

      default:

        return this.handleGeneralQuery(request);

    }

  }

}

### 4\. Data Models

// src/models/problem.model.ts

interface Problem {

  id: string;

  title: string;

  description: string;

  difficulty: 'EASY' | 'MEDIUM' | 'HARD';

  topics: string\[\];

  testCases: TestCase\[\];

  isCustom: boolean;

  createdBy?: string;

}

// src/models/submission.model.ts

interface Submission {

  id: string;

  userId: string;

  problemId: string;

  code: string;

  language: string;

  status: 'PASSED' | 'FAILED';

  executionTime?: number;

  memoryUsed?: number;

  failedTestCase?: TestCase;

  createdAt: Date;

}

### 5\. API Controllers

// src/api/chat.controller.ts

@Controller('api/chat')

export class ChatController {

  constructor(private readonly chatService: ChatService) {}

  @Post()

  async handleChat(@Body() request: ChatRequest): Promise\<ChatResponse\> {

    return this.chatService.handleMessage(request);

  }

}

// src/api/problems.controller.ts

@Controller('api/problems')

export class ProblemsController {

  constructor(private readonly problemService: ProblemService) {}

  @Get(':id')

  async getProblem(@Param('id') id: string): Promise\<ProblemDetails\> {

    return this.problemService.getProblem(id);

  }

  @Post('upload')

  async uploadProblem(@Body() problem: UploadProblem): Promise\<UploadProblemResponse\> {

    return this.problemService.createProblem(problem);

  }

}

### 6\. Integration with ACI.dev

// src/config/aci.config.ts

import { ACIClient } from '@aci/sdk';

export const aciClient \= new ACIClient({

  apiKey: process.env.ACI\_API\_KEY,

  integrations: {

    daytona: true,

    // other integrations as needed

  }

});

Ah yes, let me explain how we'll integrate MCP into the architecture. MCP will be the protocol for communication between the LLM and various tools/services. Here's how we'll implement it:

### 1\. MCP Service Layer

// src/mcp/mcp.service.ts

export class MCPService {

  constructor(

    private readonly problemService: ProblemService,

    private readonly executionService: CodeExecutionService,

    private readonly userService: UserService,

    private readonly resourceService: ResourceService

  ) {}

  // MCP function registry

  private mcpFunctions \= {

    'fetch\_user\_history': this.fetchUserHistory.bind(this),

    'execute\_code': this.executeCode.bind(this),

    'get\_problem\_by\_topic': this.getProblemByTopic.bind(this),

    'fetch\_learning\_resources': this.fetchLearningResources.bind(this),

    'check\_solution\_history': this.checkSolutionHistory.bind(this)

  };

  async handleMCPCall(functionName: string, args: any): Promise\<any\> {

    const mcpFunction \= this.mcpFunctions\[functionName\];

    if (\!mcpFunction) {

      throw new Error(\`Unknown MCP function: ${functionName}\`);

    }

    return mcpFunction(args);

  }

  private async fetchUserHistory(args: { userId: string }): Promise\<UserHistory\> {

    const history \= await this.userService.getUserHistory(args.userId);

    return {

      solvedProblems: history.solvedProblems,

      topicProgress: history.topicProgress,

      recentSubmissions: history.recentSubmissions

    };

  }

  private async executeCode(args: CodeExecutionArgs): Promise\<ExecutionResult\> {

    return this.executionService.executeCode(args);

  }

  private async getProblemByTopic(args: { 

    topic: string, 

    difficulty: string,

    excludeIds: string\[\]

  }): Promise\<Problem\> {

    return this.problemService.findProblemByTopicAndDifficulty(args);

  }

}

### 2\. LLM Integration with MCP

// src/llm/llm.service.ts

export class LLMService {

  constructor(

    private readonly mcpService: MCPService,

    private readonly langchain: LangChain

  ) {}

  private async buildContext(userId: string): Promise\<LLMContext\> {

    // Use MCP to fetch user context

    const userHistory \= await this.mcpService.handleMCPCall(

      'fetch\_user\_history',

      { userId }

    );

    return {

      userHistory,

      availableTools: this.mcpService.getAvailableFunctions()

    };

  }

  async suggestNextProblem(userId: string): Promise\<ProblemSuggestion\> {

    const context \= await this.buildContext(userId);

    

    // Configure LLM with MCP function calling capabilities

    const llm \= this.configureLLMWithMCP();

    

    const response \= await llm.predict({

      context,

      availableFunctions: \[

        'fetch\_user\_history',

        'get\_problem\_by\_topic'

      \]

    });

    return this.processSuggestion(response);

  }

  private configureLLMWithMCP(): ChatOpenAI {

    return new ChatOpenAI({

      functionCallBehavior: {

        allowedFunctions: this.mcpService.getAvailableFunctions(),

        handler: async (functionName, args) \=\> {

          return this.mcpService.handleMCPCall(functionName, args);

        }

      }

    });

  }

}

### Backend: Chat Service with MCP Integration

// src/services/chat.service.ts

export class ChatService {

  constructor(

    private readonly llmService: LLMService,

    private readonly mcpService: MCPService

  ) {}

  async handleMessage(request: ChatRequest): Promise\<ChatResponse\> {

    // First, let's build the context for the LLM using MCP

    const context \= await this.buildMessageContext(request);

    

    const llmResponse \= await this.llmService.processMessage(

      request.message,

      context

    );

    // Handle any MCP function calls that the LLM wants to make

    if (llmResponse.mcpCalls) {

      for (const mcpCall of llmResponse.mcpCalls) {

        const result \= await this.mcpService.handleMCPCall(

          mcpCall.function,

          mcpCall.args

        );

        

        // Add results to context for next LLM call if needed

        context.mcpResults.push({

          function: mcpCall.function,

          result

        });

      }

    }

    return this.formatResponse(llmResponse, context);

  }

  private async buildMessageContext(request: ChatRequest): Promise\<MessageContext\> {

    // Use MCP to fetch all necessary context

    const \[userHistory, recentSubmissions\] \= await Promise.all(\[

      this.mcpService.handleMCPCall('fetch\_user\_history', {

        userId: request.userId

      }),

      this.mcpService.handleMCPCall('check\_solution\_history', {

        userId: request.userId,

        limit: 5

      })

    \]);

    return {

      userHistory,

      recentSubmissions,

      mcpResults: \[\]

    };

  }

}

### 4\. Example MCP Function Calls

Here's how the LLM might use MCP functions in different scenarios:

// Example 1: When suggesting a new problem

const mcpCalls \= \[

  {

    function: 'fetch\_user\_history',

    args: { userId: 'user123' }

  },

  {

    function: 'get\_problem\_by\_topic',

    args: {

      topic: 'dynamic\_programming',

      difficulty: 'medium',

      excludeIds: \['prob1', 'prob2'\]

    }

  }

\];

// Example 2: When evaluating a solution

const mcpCalls \= \[

  {

    function: 'execute\_code',

    args: {

      code: submission.code,

      language: submission.language,

      testCases: problem.testCases

    }

  },

  {

    function: 'fetch\_learning\_resources',

    args: {

      topic: 'binary\_search',

      difficulty: 'medium',

      context: 'optimization'

    }

  }

\];

### Backend: MCP Types

// src/types/mcp.types.ts

export interface MCPFunction {

  name: string;

  description: string;

  parameters: Record\<string, unknown\>;

  required: string\[\];

}

export interface MCPCallResult {

  function: string;

  result: any;

  error?: string;

}

export interface MCPContext {

  availableFunctions: MCPFunction\[\];

  mcpResults: MCPCallResult\[\];

}

The MCP layer acts as a bridge between the LLM and various services in our system. It provides a structured way for the LLM to:

1. Fetch user history and context  
2. Execute code in sandboxes  
3. Query problems based on topics and difficulty  
4. Access learning resources  
5. Check solution history

This allows the LLM to make informed decisions about:

- Which problems to suggest  
- What hints to provide  
- What resources to recommend  
- How to evaluate user progress

### Frontend: Technology Stack Selection

1. **Core Framework**: Next.js 14  
     
   - Server-side rendering for better SEO and initial load performance  
   - App Router for modern routing and layouts  
   - Built-in API routes for backend communication  
   - TypeScript support out of the box

   

2. **UI Framework**: Tailwind CSS \+ shadcn/ui  
     
   - Highly customizable components  
   - Built-in dark mode support  
   - Excellent accessibility  
   - Modern design system

   

3. **State Management**:  
     
   - Zustand for global state  
   - React Query for server state management  
   - Local storage for persisting user preferences

   

4. **Authentication**:  
     
   - NextAuth.js for authentication  
   - Support for multiple providers (GitHub, Google, etc.)  
   - JWT-based session management

   

5. **Code Editor**:  
     
   - Monaco Editor (same as VS Code)  
   - Support for multiple languages  
   - Built-in syntax highlighting  
   - Code completion

   

6. **Real-time Communication**:  
     
   - Socket.io for real-time chat  
   - Server-sent events for notifications

Let me create a detailed project structure:

// Project structure

src/

├── app/                     \# Next.js 14 app directory

│   ├── (auth)/             \# Authentication routes

│   │   ├── login/

│   │   └── register/

│   ├── (dashboard)/        \# Protected routes

│   │   ├── chat/          \# Main coding interface

│   │   ├── problems/      \# Problem listing

│   │   └── profile/       \# User profile

│   ├── api/                \# API routes

│   └── layout.tsx          \# Root layout

├── components/             \# Reusable components

│   ├── ui/                \# UI components

│   ├── chat/              \# Chat components

│   ├── code/              \# Code editor components

│   └── problems/          \# Problem-related components

├── lib/                    \# Utilities and configurations

├── hooks/                  \# Custom React hooks

├── store/                  \# State management

└── types/                  \# TypeScript types

Let's implement the authentication using NextAuth.js:

// src/app/api/auth/\[...nextauth\]/route.ts

import NextAuth from 'next-auth';

import GithubProvider from 'next-auth/providers/github';

import GoogleProvider from 'next-auth/providers/google';

export const authOptions \= {

  providers: \[

    GithubProvider({

      clientId: process.env.GITHUB\_ID,

      clientSecret: process.env.GITHUB\_SECRET,

    }),

    GoogleProvider({

      clientId: process.env.GOOGLE\_ID,

      clientSecret: process.env.GOOGLE\_SECRET,

    }),

  \],

  callbacks: {

    async session({ session, token }) {

      // Add user ID to session

      session.user.id \= token.sub;

      return session;

    },

    async jwt({ token, user }) {

      if (user) {

        token.id \= user.id;

      }

      return token;

    },

  },

};

const handler \= NextAuth(authOptions);

export { handler as GET, handler as POST };

Now, let's create the main chat interface component:

// src/components/chat/ChatInterface.tsx

import { useState } from 'react';

import { useChat } from '@/hooks/useChat';

import { CodeEditor } from '@/components/code/CodeEditor';

import { ProblemView } from '@/components/problems/ProblemView';

export const ChatInterface \= () \=\> {

  const { messages, sendMessage, isLoading } \= useChat();

  const \[input, setInput\] \= useState('');

  return (

    \<div className="flex h-screen"\>

      {/\* Chat Messages \*/}

      \<div className="flex-1 overflow-auto p-4"\>

        \<div className="space-y-4"\>

          {messages.map((message) \=\> (

            \<ChatMessage key={message.id} message={message} /\>

          ))}

        \</div\>

      \</div\>

      {/\* Problem View / Code Editor \*/}

      \<div className="w-1/2 border-l"\>

        {currentProblem && \<ProblemView problem={currentProblem} /\>}

        {showEditor && \<CodeEditor /\>}

      \</div\>

      {/\* Input Area \*/}

      \<div className="border-t p-4"\>

        \<textarea

          value={input}

          onChange={(e) \=\> setInput(e.target.value)}

          className="w-full rounded-lg border p-2"

          placeholder="Type your message..."

        /\>

        \<button

          onClick={() \=\> sendMessage(input)}

          disabled={isLoading}

          className="mt-2 rounded-lg bg-blue-500 px-4 py-2 text-white"

        \>

          Send

        \</button\>

      \</div\>

    \</div\>

  );

};

For state management, let's use Zustand:

// src/store/chatStore.ts

import create from 'zustand';

interface ChatState {

  messages: Message\[\];

  currentProblem: Problem | null;

  isEditorVisible: boolean;

  addMessage: (message: Message) \=\> void;

  setCurrentProblem: (problem: Problem | null) \=\> void;

  toggleEditor: () \=\> void;

}

export const useChatStore \= create\<ChatState\>((set) \=\> ({

  messages: \[\],

  currentProblem: null,

  isEditorVisible: false,

  addMessage: (message) \=\>

    set((state) \=\> ({ messages: \[...state.messages, message\] })),

  setCurrentProblem: (problem) \=\> set({ currentProblem: problem }),

  toggleEditor: () \=\>

    set((state) \=\> ({ isEditorVisible: \!state.isEditorVisible })),

}));

For the code editor component:

// src/components/code/CodeEditor.tsx

import { useEffect, useRef } from 'react';

import \* as monaco from 'monaco-editor';

import { useCodeExecution } from '@/hooks/useCodeExecution';

export const CodeEditor \= () \=\> {

  const editorRef \= useRef\<monaco.editor.IStandaloneCodeEditor\>();

  const { executeCode, isExecuting, result } \= useCodeExecution();

  useEffect(() \=\> {

    editorRef.current \= monaco.editor.create(containerRef.current\!, {

      value: '',

      language: 'javascript',

      theme: 'vs-dark',

      automaticLayout: true,

    });

    return () \=\> editorRef.current?.dispose();

  }, \[\]);

  const handleSubmit \= async () \=\> {

    const code \= editorRef.current?.getValue();

    if (code) {

      await executeCode(code);

    }

  };

  return (

    \<div className="h-full flex flex-col"\>

      \<div className="flex justify-between p-2 border-b"\>

        \<select className="rounded border p-1"\>

          \<option value="javascript"\>JavaScript\</option\>

          \<option value="python"\>Python\</option\>

          \<option value="java"\>Java\</option\>

        \</select\>

        \<button

          onClick={handleSubmit}

          disabled={isExecuting}

          className="bg-green-500 text-white px-4 py-1 rounded"

        \>

          Run Code

        \</button\>

      \</div\>

      \<div ref={containerRef} className="flex-1" /\>

      {result && (

        \<div className="border-t p-2"\>

          \<pre\>{JSON.stringify(result, null, 2)}\</pre\>

        \</div\>

      )}

    \</div\>

  );

};

For API communication:

// src/lib/api.ts

import axios from 'axios';

const api \= axios.create({

  baseURL: '/api',

  headers: {

    'Content-Type': 'application/json',

  },

});

export const chatApi \= {

  sendMessage: async (message: string) \=\> {

    const response \= await api.post('/chat', { message });

    return response.data;

  },

  

  submitSolution: async (problemId: string, code: string) \=\> {

    const response \= await api.post(\`/problems/${problemId}/submit\`, { code });

    return response.data;

  },

  

  getUserProfile: async () \=\> {

    const response \= await api.get('/profile');

    return response.data;

  },

};

This architecture provides:

1. **Secure Authentication**: Multiple provider support with NextAuth.js  
2. **Real-time Interaction**: WebSocket integration for chat  
3. **Responsive UI**: Modern components with Tailwind and shadcn/ui  
4. **Code Execution**: Integrated Monaco editor with syntax highlighting  
5. **State Management**: Efficient state handling with Zustand  
6. **Type Safety**: Full TypeScript support  
7. **API Integration**: Clean API communication layer

Instead of github or google auth, we'll be using Auth0

1. **Free Tier Generous Limits**:  
     
   - 25,000 monthly active users (MAUs)  
   - Unlimited social connections (GitHub, Google, etc.)  
   - No credit card required for basic usage  
   - Custom domain support (though this requires card for validation)  
   - Passwordless authentication included

   

2. **Quick Setup**:  
     
   - No review process needed like with Google/GitHub OAuth  
   - Ready-to-use SDKs and documentation  
   - Can be set up in minutes

   

3. **Features Available in Free Tier**:  
     
   - Social logins (70+ providers)  
   - Database authentication  
   - Passwordless authentication  
   - Custom branded login  
   - Basic security features (brute force protection, suspicious IP throttling)  
   - 5 Actions \+ Forms for customization

Let me modify our frontend architecture to integrate Auth0:

// src/lib/auth.ts

import { Auth0Provider } from '@auth0/auth0-react';

import { Auth0Client } from '@auth0/auth0-spa-js';

export const auth0Config \= {

  domain: process.env.NEXT\_PUBLIC\_AUTH0\_DOMAIN\!,

  clientId: process.env.NEXT\_PUBLIC\_AUTH0\_CLIENT\_ID\!,

  redirectUri: typeof window \!== 'undefined' ? window.location.origin : '',

};

// src/app/layout.tsx

import { Auth0Provider } from '@auth0/auth0-react';

export default function RootLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  return (

    \<html lang="en"\>

      \<body\>

        \<Auth0Provider {...auth0Config}\>

          {children}

        \</Auth0Provider\>

      \</body\>

    \</html\>

  );

}

// src/components/auth/LoginButton.tsx

import { useAuth0 } from '@auth0/auth0-react';

export const LoginButton \= () \=\> {

  const { loginWithRedirect } \= useAuth0();

  return (

    \<button

      onClick={() \=\> loginWithRedirect()}

      className="rounded-lg bg-blue-500 px-4 py-2 text-white"

    \>

      Log In

    \</button\>

  );

};

// src/components/auth/UserProfile.tsx

import { useAuth0 } from '@auth0/auth0-react';

export const UserProfile \= () \=\> {

  const { user, isAuthenticated, isLoading } \= useAuth0();

  if (isLoading) {

    return \<div\>Loading...\</div\>;

  }

  if (\!isAuthenticated) {

    return null;

  }

  return (

    \<div\>

      \<img src={user?.picture} alt={user?.name} /\>

      \<h2\>{user?.name}\</h2\>

      \<p\>{user?.email}\</p\>

    \</div\>

  );

};

// src/middleware.ts

import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config \= {

  matcher: \[

    '/chat/:path\*',

    '/problems/:path\*',

    '/profile/:path\*',

  \],

};

To set this up:

1. Create an Auth0 account at auth0.com  
     
2. Create a new application in the Auth0 dashboard:  
     
   - Choose "Single Page Application"  
   - Set Allowed Callback URLs to `http://localhost:3000/callback`  
   - Set Allowed Logout URLs to `http://localhost:3000`  
   - Set Allowed Web Origins to `http://localhost:3000`

   

3. Create a `.env.local` file:

NEXT\_PUBLIC\_AUTH0\_DOMAIN=your-domain.auth0.com

NEXT\_PUBLIC\_AUTH0\_CLIENT\_ID=your-client-id

4. Install dependencies:

npm install @auth0/auth0-react @auth0/auth0-spa-js

This setup provides:

- Social login with multiple providers  
- Protected routes with middleware  
- User profile information  
- Token management  
- Logout functionality

The free tier should be more than sufficient for your hackathon project. You'll get:

- Secure authentication  
- Multiple social providers  
- User management  
- Basic analytics  
- No need for complex review processes
