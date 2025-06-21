# Vibe Backend

Vibe backend service.

## Features

- **Personalized Problem Selection**: AI-driven problem recommendations based on user history and weaknesses
- **Code Execution**: Secure sandbox for running and testing user solutions
- **Progress Tracking**: Comprehensive user progress and statistics
- **Learning Resources**: Curated learning materials and resources
- **MCP Integration**: Model Context Protocol for LLM-tool communication
- **Auth0 Authentication**: Secure user authentication and authorization

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: Auth0
- **LLM**: OpenAI-compatible API endpoint
- **Code Execution**: Daytona/ACI.dev integration
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (if running locally)
- Redis (if running locally)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd backend
cp env.example .env.local
```

### 2. Environment Configuration

Edit `.env.local` with your configuration:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vibe?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Auth0 Configuration
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_AUDIENCE="your-api-identifier"
AUTH0_ISSUER="https://your-domain.auth0.com/"

# LLM Configuration
LLM_API_URL="https://your-openai-compatible-api.com/v1/chat/completions"
LLM_MODEL="gpt-4"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000

# Code Execution (Daytona/ACI)
ACI_API_KEY="your-aci-api-key"
ACI_WORKSPACE_ID="your-workspace-id"
```

### 3. Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### 4. Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run start:dev
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/health

## Database Schema

The application uses the following main entities:

- **Users**: User profiles and authentication
- **Problems**: Coding problems with test cases and topic arrays
- **Submissions**: User code submissions and results
- **Learning Resources**: Books, courses, articles with topic arrays
- **Solved Problems**: User progress tracking

## Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start in development mode
npm run start:debug        # Start with debugger

# Database
npm run db:generate        # Generate Prisma client
npm run db:push           # Push schema to database
npm run db:migrate        # Run migrations
npm run db:studio         # Open Prisma Studio

# Code Quality
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run test              # Run tests
npm run test:watch        # Run tests in watch mode
```

### Project Structure

```
src/
├── api/                    # API route handlers
├── auth/                   # Authentication & authorization
├── chat/                   # Chat interface
├── common/                 # Shared DTOs and utilities
├── config/                 # Configuration files
├── db/                     # Database layer (Prisma)
├── llm/                    # LLM integration
├── mcp/                    # Model Context Protocol
├── problems/               # Problem management
├── resources/              # Learning resources
├── sandbox/                # Code execution
├── submissions/            # Code submissions
├── users/                  # User management
├── app.module.ts           # Main application module
└── main.ts                 # Application entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Auth0
- `GET /api/auth/callback` - Auth0 callback
- `GET /api/auth/profile` - Get user profile

### Problems
- `GET /api/problems` - List problems
- `GET /api/problems/:id` - Get problem details
- `POST /api/problems/upload` - Upload custom problem

### Submissions
- `POST /api/submissions` - Submit solution
- `GET /api/submissions/user/:userId` - Get user submissions

### Chat
- `POST /api/chat` - Send chat message

### Users
- `GET /api/users/:id` - Get user details
- `GET /api/users/:id/stats` - Get user statistics

### Resources
- `GET /api/resources/topic/:topic` - Get resources by topic

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 