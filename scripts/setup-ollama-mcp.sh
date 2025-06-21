#!/bin/bash

# Setup script for Ollama with MCP integration using existing models

set -e

echo "Setting up Ollama with MCP integration using existing models..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Please install Ollama first."
    echo "Visit: https://ollama.ai/download"
    exit 1
fi

# List available models that support MCP
echo "Available MCP-enabled models:"
echo "1. qwen2.5:3b (recommended)"
echo "2. qwen2.5:7b"
echo "3. qwen2.5:14b"
echo "4. llama3.2:3b"
echo "5. llama3.2:8b"
echo ""

# Check if qwen2.5:3b is available
if ollama list | grep -q "qwen2.5:3b"; then
    echo "✅ qwen2.5:3b is already available"
    MODEL_NAME="qwen2.5:3b"
else
    echo "📥 Pulling qwen2.5:3b (this may take a few minutes)..."
    ollama pull qwen2.5:3b
    MODEL_NAME="qwen2.5:3b"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To use the MCP server with Ollama:"
echo "1. Start the MCP server: npm run start:mcp-server"
echo "2. In another terminal, run: ollama run $MODEL_NAME"
echo ""
echo "Or use the combined script: npm run start:ollama-mcp"
echo ""
echo "The model will automatically detect and use the MCP server when it's running." 