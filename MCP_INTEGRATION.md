# MCP (Model Context Protocol) Integration

This document explains how to set up and use the MCP integration with Ollama for the Vibe Backend.

## Overview

The MCP integration allows Ollama to call functions from our backend services through the standard Model Context Protocol. This enables the LLM to:

- Fetch coding problems by topic and complexity
- Get user learning history and statistics
- Access learning resources
- Check solution history
- Execute code in a sandbox environment
- Get all available problem topics

## Architecture

```
Ollama (with MCP-enabled model) <-> MCP Protocol <-> Standalone MCP Server <-> Backend Services
```

## How It Works

1. **MCP Server**: Our standalone server exposes backend functions through the MCP protocol
2. **Ollama Model**: MCP-enabled models (like qwen2.5) automatically detect and connect to MCP servers
3. **Function Calling**: When you ask the model to do something that requires backend data, it will automatically call the appropriate MCP function
4. **Direct Execution**: MCP functions are executed directly in the LLM service, not extracted from text responses

## Setup

### 1. Install Dependencies

The MCP SDK is already installed. Make sure you have the following:

```bash
npm install
```

### 2. Set up Ollama

If you haven't installed Ollama yet:

```bash
# Install Ollama (follow instructions at https://ollama.ai/download)
curl -fsSL https://ollama.ai/install.sh | sh
```

### 3. Get an MCP-enabled Model

Run the setup script to get an MCP-enabled model:

```bash
npm run setup:ollama-mcp
```

This will:
- Check if Ollama is installed
- Pull `qwen2.5:3b` (or use it if already available)
- Set up the necessary configuration

**Available MCP-enabled models:**
- `qwen2.5:3b` (recommended - fast and efficient)
- `qwen2.5:7b` (better performance)
- `qwen2.5:14b` (best performance, larger size)
- `llama3.2:3b`
- `llama3.2:8b`

### 4. Environment Configuration

Make sure your environment variables are set up correctly:

```bash
# Database
DATABASE_URL="your-database-url"

# LLM Configuration
LLM_USE_OLLAMA=true  # Enable Ollama integration
LLM_MODEL=qwen2.5:3b  # Model to use with Ollama

# Other required environment variables
# (see .env.example for full list)
```

## Usage

### Option 1: Start Everything Together

```bash
# Using qwen2.5:3b (recommended)
npm run start:ollama-mcp

# Using qwen2.5:7b
npm run start:ollama-mcp:7b

# Using qwen2.5:14b
npm run start:ollama-mcp:14b
```

This will start both the MCP server and Ollama in parallel.

### Option 2: Start Components Separately

1. Start the MCP server:
```bash
npm run start:mcp-server
```

2. In another terminal, start Ollama with any MCP-enabled model:
```bash
# Using qwen2.5:3b (recommended)
ollama run qwen2.5:3b

# Or use other MCP-enabled models
ollama run qwen2.5:7b
ollama run qwen2.5:14b
ollama run llama3.2:3b
ollama run llama3.2:8b
```

### Option 3: Integrated with Main API

The MCP server is now integrated with your main NestJS application. When you start your API, the MCP server starts automatically:

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## Testing

### Test MCP Server
```bash
npm run test:mcp-server
```

### Test MCP Integration
```bash
npm run test:mcp-integration
```

### Test with Ollama

Start Ollama with an MCP-enabled model and try asking questions like:

- "Can you get me an easy array problem?"
- "What's my learning history?"
- "Show me resources for dynamic programming"
- "Execute this code: console.log('Hello World')"

The model will automatically detect when it needs to call MCP functions and will do so seamlessly.

## Available MCP Functions

### 1. get_problem_by_topic
Get a coding problem by topic and complexity level.

**Parameters:**
- `topic` (string, required): The topic of the problem (e.g., arrays, dynamic programming)
- `complexity` (string, required): The complexity level (easy, medium, hard)
- `excludeIds` (array, optional): Problem IDs to exclude from the search

**Example:**
```json
{
  "topic": "arrays",
  "complexity": "easy"
}
```

### 2. fetch_user_history
Fetch user history and statistics.

**Parameters:**
- `userId` (string, required): The user ID to fetch history for

**Example:**
```json
{
  "userId": "auth0|123456789"
}
```

### 3. fetch_learning_resources
Fetch learning resources for a specific topic.

**Parameters:**
- `topic` (string, required): The topic to fetch resources for

**Example:**
```json
{
  "topic": "dynamic programming"
}
```

### 4. check_solution_history
Check user solution history.

**Parameters:**
- `userId` (string, required): The user ID to check history for
- `limit` (number, optional): Maximum number of submissions to return (default: 10)

**Example:**
```json
{
  "userId": "auth0|123456789",
  "limit": 5
}
```

### 5. execute_code
Execute code in a sandbox environment.

**Parameters:**
- `code` (string, required): The code to execute
- `language` (string, required): The programming language
- `problemId` (string, required): The problem ID for context
- `userId` (string, required): The user ID executing the code

**Example:**
```json
{
  "code": "console.log('Hello, World!');",
  "language": "javascript",
  "problemId": "prob123",
  "userId": "auth0|123456789"
}
```

### 6. get_all_topics
Get all available problem topics.

**Parameters:** None

**Example:**
```json
{}
```

## Key Improvements

### Direct Function Execution
- **Before**: MCP functions were extracted from text responses using regex
- **Now**: MCP functions are executed directly when the LLM makes tool calls
- **Benefit**: More reliable, faster, and cleaner integration

### Dual LLM Support
- **Ollama**: Use `LLM_USE_OLLAMA=true` to use Ollama with MCP
- **External APIs**: Use `LLM_API_URL` to use external LLM APIs (OpenAI, etc.)
- **Benefit**: Flexibility to use different LLM providers

### Integrated Deployment
- **Before**: Separate MCP server process
- **Now**: MCP server runs with main API
- **Benefit**: Simpler deployment and management

## Troubleshooting

### Common Issues

1. **MCP Server not starting**
   - Check that all environment variables are set
   - Ensure the database is accessible
   - Check the logs for specific error messages

2. **Ollama can't connect**
   - Make sure the MCP server is running before starting Ollama
   - Check that the path to the MCP server script is correct
   - Verify that ts-node is installed globally or locally

3. **Function calls failing**
   - Check the database connection
   - Verify that the required services are properly initialized
   - Check the MCP server logs for detailed error messages

4. **Model doesn't use MCP functions**
   - Ensure you're using an MCP-enabled model (qwen2.5, llama3.2, etc.)
   - Make sure the MCP server is running
   - Try being more explicit in your requests

5. **LLM_USE_OLLAMA not working**
   - Set `LLM_USE_OLLAMA=true` in your environment variables
   - Make sure Ollama is running on `localhost:11434`
   - Check that the model is available (`ollama list`)

### Debug Mode

To run with debug logging:

```bash
DEBUG=* npm run start:mcp-server
```

### Logs

The MCP server logs all function calls and errors. Check the console output for debugging information.

## Model Recommendations

### For Development/Testing
- **qwen2.5:3b**: Fast, efficient, good for quick testing
- **llama3.2:3b**: Good balance of speed and capability

### For Production
- **qwen2.5:7b**: Better reasoning and function calling
- **qwen2.5:14b**: Best performance, but requires more resources

## Development

### Adding New MCP Functions

1. Add the function to the `getAvailableFunctions()` method in `StandaloneMCPServer`
2. Add the function handler in the `handleMCPCall()` method
3. Add the tool definition in `createToolFromFunction()`
4. Test the new function

### Modifying Existing Functions

1. Update the function handler in `StandaloneMCPServer`
2. Update the tool definition if parameters change
3. Test the modified function

## Security Considerations

- The MCP server runs with full access to the database
- Ensure proper authentication and authorization
- Validate all input parameters
- Sanitize code execution in the sandbox
- Use environment variables for sensitive configuration

## Performance

- The MCP server maintains a database connection
- Consider connection pooling for high load
- Monitor function execution times
- Implement caching where appropriate

## Contributing

When contributing to the MCP integration:

1. Follow the existing code structure
2. Add proper error handling
3. Include comprehensive logging
4. Test with both the MCP Inspector and Ollama
5. Update this documentation 