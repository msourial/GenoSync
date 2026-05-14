# Smart OpenRouter Client

A cost-optimized OpenRouter client that automatically switches between free and paid models based on task complexity.

## Features

- **Automatic Model Selection**: Intelligently chooses between free and paid models
- **Task Complexity Detection**: Analyzes prompts to determine optimal model
- **Cost Optimization**: Uses free models for simple tasks, paid models for complex ones
- **Fallback Handling**: Automatic fallback to reliable models on errors
- **TypeScript Support**: Full type safety and IntelliSense

## Model Selection Logic

| Task Type | Models Used | Examples |
|-----------|-------------|----------|
| **Simple** | Free Models | "What is React?", "Define API", "Quick question" |
| **Complex** | Paid Models | "Analyze architecture", "Comprehensive review", "In-depth analysis" |
| **Coding** | Paid Models | "Implement function", "Debug code", "Refactor component" |
| **Creative** | Paid Models | "Brainstorm ideas", "Design system", "Create concept" |
| **Analysis** | Paid → Free | Medium complexity tasks, general analysis |

## Installation

```bash
cd openrouter-client
npm install
npm run build
```

## Usage

### Basic Usage

```typescript
import { SmartOpenRouterClient } from '@genosync/openrouter-client';

const client = new SmartOpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY
});

// Simple chat with automatic model selection
const response = await client.simpleChat('What is React?');
```

### Advanced Usage

```typescript
const client = new SmartOpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  modelConfig: {
    freeModels: ['meta-llama/llama-3.2-3b-instruct:free'],
    paidModels: ['openai/gpt-4', 'anthropic/claude-3.5-sonnet'],
    fallbackModel: 'meta-llama/llama-3.2-3b-instruct:free'
  }
});

// Get detailed information about model selection
const messages = [
  { role: 'user', content: 'Implement a TypeScript API client' }
];

const result = await client.chat(messages);
console.log(`Model Used: ${result.modelUsed}`);
console.log(`Task Type: ${result.taskType.type}`);
console.log(`Response: ${result.response.choices[0].message.content}`);
```

## Environment Variables

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## Examples

Run the demo to see model switching in action:

```bash
OPENROUTER_API_KEY=your_key npm run test
```

This will demonstrate:
- Simple questions using free models
- Complex analysis using paid models
- Coding tasks using premium models
- Creative tasks using advanced models

## Cost Optimization Tips

1. **Simple Questions**: Automatically routed to free models
2. **Quick Lookups**: Perfect for documentation and definitions
3. **Complex Tasks**: Invest in paid models for better quality
4. **Coding**: Use paid models for accurate, secure code
5. **Batch Processing**: Process multiple simple tasks together on free models

## Configuration

### Default Free Models
- `meta-llama/llama-3.2-3b-instruct:free`
- `microsoft/phi-3-mini-128k-instruct:free`
- `huggingfaceh4/zephyr-7b-beta:free`

### Default Paid Models
- `openai/gpt-4`
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo`

### Custom Configuration

```typescript
client.updateModelConfig({
  freeModels: ['your-preferred-free-model'],
  paidModels: ['your-preferred-paid-model'],
  fallbackModel: 'reliable-fallback-model'
});
```

## Task Detection Algorithm

The client analyzes:
- **Keywords**: Specific terms indicating complexity
- **Length**: Longer prompts suggest complexity
- **Context**: Amount of contextual data provided
- **Intent**: Coding, creative, analytical, or simple queries

## Error Handling

- Automatic fallback to reliable models
- Graceful degradation on API failures
- Detailed error logging for debugging

## Development

```bash
# Development mode with watch
npm run dev

# Run tests and examples
npm test

# Build for production
npm run build
```
