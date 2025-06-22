# Thinking Process UI Implementation

This document describes how to implement the expandable thinking process UI for the chat responses.

## Response Structure

The chat response now includes a `thinkingProcess` field with the following structure:

```typescript
interface ChatResponse {
  response: string;
  actions: any[];
  thinkingProcess?: {
    totalTurns: number;
    turns: ThinkingProcessTurn[];
    totalToolCalls: number;
    processingTimeMs: number;
  };
  messageId: string;
}

interface ThinkingProcessTurn {
  turnNumber: number;
  assistantMessage: string;
  toolCalls: any[];
  toolResults: any[];
  timestamp: Date;
}
```

## UI Implementation Example

Here's how you can implement the expandable thinking process in your frontend:

### React Component Example

```tsx
import React, { useState } from 'react';

interface ThinkingProcessProps {
  thinkingProcess: any;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thinkingProcess }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinkingProcess) return null;

  return (
    <div className="thinking-process">
      <button 
        className="thinking-process-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>🧠</span>
        <span>Show Thinking Process</span>
        <span className="stats">
          ({thinkingProcess.totalTurns} turns, {thinkingProcess.totalToolCalls} tool calls, {thinkingProcess.processingTimeMs}ms)
        </span>
        <span className="arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="thinking-process-details">
          <div className="thinking-process-summary">
            <p>Processing completed in {thinkingProcess.totalTurns} turns</p>
            <p>Total tool calls: {thinkingProcess.totalToolCalls}</p>
            <p>Processing time: {thinkingProcess.processingTimeMs}ms</p>
          </div>
          
          {thinkingProcess.turns.map((turn, index) => (
            <div key={index} className="thinking-turn">
              <h4>Turn {turn.turnNumber}</h4>
              <div className="turn-timestamp">
                {new Date(turn.timestamp).toLocaleTimeString()}
              </div>
              
              <div className="assistant-message">
                <strong>Assistant:</strong>
                <p>{turn.assistantMessage}</p>
              </div>
              
              {turn.toolCalls.length > 0 && (
                <div className="tool-calls">
                  <strong>Tool Calls ({turn.toolCalls.length}):</strong>
                  {turn.toolCalls.map((toolCall, toolIndex) => (
                    <div key={toolIndex} className="tool-call">
                      <code>{toolCall.function.name}</code>
                      <pre>{JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}</pre>
                    </div>
                  ))}
                </div>
              )}
              
              {turn.toolResults.length > 0 && (
                <div className="tool-results">
                  <strong>Tool Results:</strong>
                  {turn.toolResults.map((result, resultIndex) => (
                    <div key={resultIndex} className="tool-result">
                      <div className={`result-status ${result.success ? 'success' : 'error'}`}>
                        {result.success ? '✅' : '❌'} {result.functionName}
                      </div>
                      {result.success ? (
                        <pre>{JSON.stringify(result.result, null, 2)}</pre>
                      ) : (
                        <div className="error-message">{result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThinkingProcess;
```

### CSS Styling Example

```css
.thinking-process {
  margin-top: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.thinking-process-toggle {
  width: 100%;
  padding: 12px 16px;
  background: #f8f9fa;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.thinking-process-toggle:hover {
  background: #e9ecef;
}

.thinking-process-toggle .stats {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.thinking-process-details {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.thinking-process-summary {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
}

.thinking-turn {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
}

.thinking-turn h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.turn-timestamp {
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
}

.assistant-message {
  margin-bottom: 12px;
}

.assistant-message p {
  margin: 8px 0 0 0;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.tool-calls, .tool-results {
  margin-top: 12px;
}

.tool-call, .tool-result {
  margin: 8px 0;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.tool-call code {
  display: block;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 4px;
}

.tool-call pre, .tool-result pre {
  margin: 0;
  font-size: 12px;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}

.result-status {
  font-weight: bold;
  margin-bottom: 4px;
}

.result-status.success {
  color: #28a745;
}

.result-status.error {
  color: #dc3545;
}

.error-message {
  color: #dc3545;
  font-style: italic;
}
```

## Usage in Chat Component

```tsx
const ChatMessage: React.FC<{ message: ChatResponse }> = ({ message }) => {
  return (
    <div className="chat-message">
      <div className="message-content">
        {message.response}
      </div>
      
      {/* Show thinking process if available */}
      {message.thinkingProcess && (
        <ThinkingProcess thinkingProcess={message.thinkingProcess} />
      )}
    </div>
  );
};
```

## Benefits

1. **Transparency**: Users can see exactly how the AI arrived at its response
2. **Debugging**: Developers can understand the AI's reasoning process
3. **Learning**: Users can learn from the AI's step-by-step approach
4. **Trust**: Increased transparency builds user trust in the system

## Notes

- The thinking process is hidden by default to avoid cluttering the UI
- Users can expand it when they want to see the detailed reasoning
- The data includes timing information for performance analysis
- Tool calls and results are clearly separated for easy understanding 