# Deployment Guide - MCP Server Options

This guide explains the different ways you can deploy the MCP server with your backend application.

## Overview

You have several options for running the MCP server in production:

1. **Integrated with Main API** (Recommended for most cases)
2. **Separate MCP Server** (For high-load scenarios)
3. **Local Development Setup**

## Option 1: Integrated with Main API (Recommended)

### How It Works
The MCP server runs as part of your main NestJS application. When you start your API, it automatically starts the MCP server too.

### Advantages
- ✅ **Simplest deployment** - only one service to manage
- ✅ **Shared database connection** - no connection overhead
- ✅ **Single deployment** - deploy once, everything works
- ✅ **Cost effective** - no additional infrastructure needed
- ✅ **Easier monitoring** - all logs in one place

### Deployment on Render.com

1. **Update your `render.yaml`** (if using Blueprint):
```yaml
services:
  - type: web
    name: vibe-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      # Add other environment variables
```

2. **Or use the Render Dashboard**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Environment: `Node`

3. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=your-database-url
   PORT=10000
   # Add other required environment variables
   ```

### Usage
Once deployed, your MCP server will be available at the same domain as your API. Ollama will automatically connect to it when you run:

```bash
# From your local machine or any machine that can reach your API
ollama run qwen2.5:3b
```

## Option 2: Separate MCP Server (Advanced)

### When to Use This
- High-load scenarios where you need to scale MCP separately
- Different teams managing API vs MCP
- Need different resource allocation

### How to Deploy

1. **Create a separate service on Render**:
```yaml
services:
  - type: web
    name: vibe-backend-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false

  - type: web
    name: vibe-backend-mcp
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:mcp-server
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
```

2. **Update your Ollama configuration** to point to the MCP server URL.

### Advantages
- 🔄 **Independent scaling** - scale MCP and API separately
- 🔄 **Resource isolation** - different resource limits
- 🔄 **Team separation** - different teams can manage each service

### Disadvantages
- ❌ **More complex** - two services to manage
- ❌ **Higher cost** - two services instead of one
- ❌ **Connection overhead** - separate database connections

## Option 3: Local Development Setup

For development, you can run the MCP server separately:

```bash
# Terminal 1: Start the main API
npm run start:dev

# Terminal 2: Start the MCP server
npm run start:mcp-server

# Terminal 3: Start Ollama
ollama run qwen2.5:3b
```

## Production Recommendations

### For Most Use Cases (Recommended)
Use **Option 1** (Integrated with Main API):
- Deploy your main API normally
- MCP server runs automatically
- Ollama connects to your API domain

### For High-Load Scenarios
Use **Option 2** (Separate MCP Server):
- Monitor MCP function call volume
- If you see high usage, consider separating
- Use load balancing if needed

## Environment Variables

Make sure these are set in your production environment:

```bash
# Required
DATABASE_URL=your-production-database-url
NODE_ENV=production

# Optional
PORT=10000
API_PREFIX=api
CORS_ORIGIN=https://your-frontend-domain.com

# Database
DATABASE_URL=postgresql://...

# Auth (if using Auth0)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-audience
AUTH0_ISSUER=https://your-domain.auth0.com/

# LLM (if using external LLM)
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000

# Sandbox (if using ACI)
ACI_API_KEY=your-aci-api-key
ACI_WORKSPACE_ID=your-workspace-id
```

## Monitoring and Logs

### Integrated Setup
All logs go to your main application logs:
- MCP function calls
- Database queries
- API requests
- Errors and debugging

### Separate Setup
Monitor both services:
- API service logs
- MCP service logs
- Database connection health

## Security Considerations

### Network Security
- Ensure your database is not publicly accessible
- Use environment variables for sensitive data
- Consider using a VPN or private network for database access

### MCP Server Security
- The MCP server has full database access
- Validate all input parameters
- Implement proper authentication if needed
- Monitor for unusual function call patterns

## Troubleshooting

### Common Issues

1. **MCP Server not starting**
   - Check database connection
   - Verify environment variables
   - Check application logs

2. **Ollama can't connect**
   - Ensure your API is publicly accessible
   - Check firewall settings
   - Verify the MCP server is running

3. **Function calls failing**
   - Check database permissions
   - Verify service dependencies
   - Check MCP server logs

### Debug Mode
For debugging in production:
```bash
# Add to your start command temporarily
DEBUG=* npm run start:prod
```

## Cost Optimization

### Render.com Pricing
- **Integrated Setup**: 1 service = 1 instance cost
- **Separate Setup**: 2 services = 2 instance costs

### Recommendations
- Start with integrated setup
- Monitor usage and performance
- Only separate if you have specific scaling needs

## Migration Guide

### From Separate to Integrated
1. Update your main.ts (already done)
2. Deploy the integrated version
3. Remove the separate MCP service
4. Update any client configurations

### From Integrated to Separate
1. Create separate MCP service
2. Update Ollama configurations
3. Deploy both services
4. Monitor performance 