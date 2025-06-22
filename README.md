# AI Coding Coach

**Your personal AI assistant for acing FAANG interviews.**

AI Coding Coach is a next-generation learning platform designed to provide a personalized preparation path for software engineering interviews at top tech companies. It addresses the common pitfalls of one-size-fits-all platforms by tailoring the learning experience to your individual knowledge and skill level.

## The Problem

Traditional coding platforms like LeetCode are fantastic resources, but they often present a generic curriculum. Users might find content that is either too basic or too advanced, leading to inefficient study sessions and knowledge gaps. Furthermore, these platforms lack a truly interactive and adaptive guide to navigate the vast landscape of topics and problems.

## Our Solution

AI Coding Coach leverages the power of Large Language Models (LLMs) to create a dynamic and personalized learning journey. By initially integrating your coding history from platforms such as LeetCode (currently used for demo purposes), our AI assistant analyzes your submissions on our platform. In the future, we plan to transition to open-source problem banks, using platforms like LeetCode solely for bootstrapping user history.

---

## How It Works

The system is composed of three main components:

1.  **Frontend**: A responsive web application (built with Next.js and Tailwind CSS) that provides the chat interface, code editor, and user profile pages.
2.  **Backend**: A robust NestJS server that orchestrates the core logic. It handles user requests, manages the database, and communicates with the LLM and other services.
3.  **LLM & MCP (Model-Controller-Plugin)**: The brain of the operation. The LLM uses a custom MCP layer to interact with various "tools," such as fetching user data, querying the problem database, and calling the code execution sandbox. This enables complex, multi-step reasoning to deliver a truly intelligent experience.

## User Stories

-   **As a new user**, I want to import my LeetCode history so the system can immediately understand my current skill level.
-   **As a student**, I want to ask the AI "What should I work on today?" and receive a relevant problem that targets my weakest topic.
-   **As a developer**, I want to submit my solution to a problem and get instant feedback on whether it's correct and efficient.
-   **As a learner**, if my solution fails, I want to receive a small hint about the edge case I might be missing, not the full answer.
-   **As a goal-oriented user**, I want to view my profile to see a visual breakdown of the topics I've mastered and where I need more practice.

## Technology Stack

-   **Frontend**: Next.js, React, Tailwind CSS, Auth0, Monaco Editor, Socket.io
-   **Backend**: NestJS, PostgreSQL, Prisma, Redis, Anthropic SDK
-   **Code Execution**: ACI -> Daytona integration
-   **Deployment**: Docker

---

## 🚀 Getting Started: Local Setup

Follow these instructions to get the project running locally for development and testing.

### Prerequisites

-   [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
-   [Node.js](https://nodejs.org/en/) (for interacting with Prisma CLI, optional)
-   An [Auth0 Account](https://auth0.com/) (the free tier is sufficient)
-   API keys for an LLM provider (e.g., OpenAI)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <your-repository-name>
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example file:

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values.

#### `.env` File Setup

```ini
# Application
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
API_PREFIX=api

# Code Execution Sandbox (ACI/Daytona)
ACI_API_KEY="your-aci-api-key"
ACI_WORKSPACE_ID="your-aci-workspace-id"

# Database (matches docker-compose.yml)
DATABASE_URL="postgresql://postgres:password@db:5432/faang-coach?schema=public"

# Redis (matches docker-compose.yml)
REDIS_URL="redis://redis:6379"

# Auth0 - Get these from your Auth0 Application settings
# Make sure to set up a "Regular Web Application" in Auth0
AUTH0_DOMAIN="your-auth0-domain.auth0.com"
AUTH0_AUDIENCE="your-api-audience" # e.g., http://localhost:3001
AUTH0_ISSUER="https://your-auth0-domain.auth0.com/"
AUTH0_CLIENT_ID="your-auth0-client-id" # For backend machine-to-machine auth if needed
AUTH0_CLIENT_SECRET="your-auth0-client-secret"
AUTH0_CALLBACK_URL="http://localhost:3000/api/auth/callback"

# LLM Provider - Choose and configure one
# 'anthropic' or 'ollama'
LLM_PROVIDER="anthropic"
LLM_API_URL="ollama url if using ollama"
LLM_MODEL=qwen2.5:32b # if using local model
# For Anthropic, the API key is read from ANTHROPIC_API_KEY
ANTHROPIC_API_KEY="your api key"
ANTHROPIC_MODEL=claude-sonnet-4-20250514
# No key needed for Ollama if running locally.

# Logging & Rate Limiting
LOG_LEVEL=info
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```
**Note:** For the frontend, you will also need a `.env.local` file with the public Auth0 variables (`NEXT_PUBLIC_AUTH0_DOMAIN`, `NEXT_PUBLIC_AUTH0_CLIENT_ID`) for the Auth0 React SDK.

### 3. Build and Run with Docker Compose

This command will build the Docker images for the backend, database, and other services and start them.

```bash
docker-compose up --build
```

The backend server will be available at `http://localhost:3001`.

### 4. Apply Database Migrations

With the services running, open a new terminal and run the Prisma migration command to set up the database schema.

```bash
docker-compose exec app npx prisma migrate dev --name init
```

You can also seed the database with initial data (topics, problems, etc.) if a seed script is configured:

```bash
docker-compose exec app npx prisma db seed
```

### 5. Accessing the Application

-   **Backend API**: `http://localhost:3001`
-   **Frontend App**: `http://localhost:3000` (once you build and run it)
-   **Swagger API Docs**: `http://localhost:3001/api-docs` (if configured)

You are now ready to start developing!

---
## Future Work

-   **Team/Group Features**: Allow users to form study groups and compete on leaderboards.
-   **More Integrations**: Add support for importing history from other platforms like HackerRank or Codeforces.
-   **Advanced Visualizations**: Create more in-depth graphs and charts to visualize learning paths and progress over time.
-   **Mock Interviews**: Simulate a full mock interview experience with a timer and a sequence of questions generated by the AI.
