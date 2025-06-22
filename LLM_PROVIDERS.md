# LLM Providers Configuration

This document explains how to configure and use different LLM providers in the Vibe Backend.

## Overview

The Vibe Backend supports multiple LLM providers:

1. **OpenAI** - External OpenAI-compatible APIs
2. **Anthropic** - Claude models via Anthropic API
3. **Ollama** - Local LLM models with MCP integration

## Configuration

### Environment Variables

Set the following environment variables to configure your LLM provider:

```bash
# LLM Provider Selection
LLM_PROVIDER="openai"  # Options: "openai", "anthropic", "ollama"

# OpenAI Configuration
LLM_API_URL="https://api.openai.com/v1/chat/completions"
LLM_MODEL="gpt-4"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000

# Anthropic Configuration
ANTHROPIC_API_KEY="your-anthropic-api-key"
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_MAX_TOKENS=4000

# Ollama Configuration
LLM_USE_OLLAMA=true  # Set to true to use Ollama instead of external APIs
```

## Provider Details

### 1. OpenAI Provider

**Use Case**: External OpenAI-compatible APIs (OpenAI, Azure OpenAI, etc.)

**Configuration**:
```bash
LLM_PROVIDER="openai"
LLM_API_URL="https://api.openai.com/v1/chat/completions"
LLM_MODEL="gpt-4"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
```

**Features**:
- ✅ Function calling support
- ✅ Tool integration
- ✅ Chat history support
- ✅ Configurable parameters

**Supported Models**:
- GPT-4, GPT-4 Turbo
- GPT-3.5 Turbo
- Any OpenAI-compatible model

### 2. Anthropic Provider

**Use Case**: Claude models via Anthropic API

**Configuration**:
```bash
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="your-anthropic-api-key"
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_MAX_TOKENS=4000
LLM_TEMPERATURE=0.7
```

**Features**:
- ✅ Tool use support (Anthropic's function calling)
- ✅ Chat history support
- ✅ Configurable parameters
- ✅ High-quality reasoning

**Supported Models**:
- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`

### 3. Ollama Provider

**Use Case**: Local LLM models with MCP integration

**Configuration**:
```bash
LLM_PROVIDER="ollama"  # or use LLM_USE_OLLAMA=true
LLM_USE_OLLAMA=true
LLM_MODEL="qwen2.5:3b"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
```

**Features**:
- ✅ MCP (Model Context Protocol) integration
- ✅ Local execution (no API costs)
- ✅ Function calling via MCP
- ✅ Offline capability

**Supported Models**:
- `qwen2.5:3b` (recommended)
- `qwen2.5:7b`
- `qwen2.5:14b`
- `llama3.2:3b`
- `llama3.2:8b`

## Provider Selection Logic

The system uses the following logic to determine which provider to use:

1. **If `LLM_USE_OLLAMA=true`**: Use Ollama provider
2. **If `LLM_PROVIDER="anthropic"`**: Use Anthropic provider
3. **Otherwise**: Use OpenAI provider

## Function Calling Support

### OpenAI
- Uses standard OpenAI function calling format
- Functions are defined in `tools` array
- Tool calls are returned in `tool_calls` field

### Anthropic
- Uses Anthropic's tool use format
- Tools are defined with `input_schema`
- Tool uses are returned in `content` array with `type: "tool_use"`

### Ollama
- Uses MCP (Model Context Protocol)
- Functions are automatically discovered
- Direct function execution without text parsing

## Example Configurations

### Development with OpenAI
```bash
LLM_PROVIDER="openai"
LLM_API_URL="https://api.openai.com/v1/chat/completions"
LLM_MODEL="gpt-4"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
```

### Production with Anthropic
```bash
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-api03-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_MAX_TOKENS=4000
LLM_TEMPERATURE=0.7
```

### Local Development with Ollama
```bash
LLM_PROVIDER="ollama"
LLM_USE_OLLAMA=true
LLM_MODEL="qwen2.5:3b"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
```

## Migration Guide

### From OpenAI to Anthropic

1. Update environment variables:
```bash
# Remove OpenAI config
# LLM_API_URL="https://api.openai.com/v1/chat/completions"
# LLM_MODEL="gpt-4"

# Add Anthropic config
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="your-anthropic-api-key"
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
```

2. Restart your application

### From External API to Ollama

1. Install Ollama and pull a model:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull qwen2.5:3b
```

2. Update environment variables:
```bash
LLM_PROVIDER="ollama"
LLM_USE_OLLAMA=true
LLM_MODEL="qwen2.5:3b"
```

3. Start Ollama:
```bash
ollama serve
```

## Troubleshooting

### Common Issues

1. **Provider not working**
   - Check `LLM_PROVIDER` environment variable
   - Verify API keys are set correctly
   - Check application logs for errors

2. **Function calling not working**
   - Ensure you're using a model that supports function calling
   - Check tool definitions in the code
   - Verify MCP server is running (for Ollama)

3. **API rate limits**
   - Monitor your API usage
   - Consider using Ollama for development
   - Implement rate limiting if needed

### Debug Mode

Enable debug logging to see detailed request/response information:

```bash
LOG_LEVEL=debug npm run start:dev
```

### Health Checks

Test your LLM provider configuration:

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "userId": "test-user"}'
```

## Cost Considerations

### OpenAI
- Pay per token usage
- GPT-4 is more expensive than GPT-3.5
- Consider using GPT-3.5 for development

### Anthropic
- Pay per token usage
- Claude 3.5 Sonnet is cost-effective
- Claude 3.5 Haiku is the cheapest option

### Ollama
- Free to use (local execution)
- Requires local compute resources
- No API rate limits or costs

## Recommendations

### Development
- **Ollama**: Fast iteration, no costs, MCP integration
- **Anthropic**: Good reasoning, reasonable costs

### Production
- **Anthropic**: High quality, reliable, good function calling
- **OpenAI**: Widely supported, good documentation

### Testing
- **Ollama**: Consistent behavior, no external dependencies
- **Anthropic**: Real-world API testing 