import { SmartOpenRouterClient } from './src/index';

async function demonstrateModelSwitching() {
  const client = new SmartOpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    modelConfig: {
      freeModels: [
        'meta-llama/llama-3.2-3b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free'
      ],
      paidModels: [
        'openai/gpt-4',
        'anthropic/claude-3.5-sonnet'
      ],
      fallbackModel: 'meta-llama/llama-3.2-3b-instruct:free'
    }
  });

  console.log('🤖 Smart OpenRouter Client Demo');
  console.log('=====================================\n');

  // Test 1: Simple task (should use free model)
  console.log('📝 Test 1: Simple Question');
  const simpleTask = await client.simpleChat('What is React?');
  console.log('Response:', simpleTask.substring(0, 100) + '...\n');

  // Test 2: Complex task (should use paid model)
  console.log('🧠 Test 2: Complex Analysis');
  const complexTask = await client.simpleChat('Analyze the architectural patterns used in modern microservices and provide a comprehensive comparison with monolithic approaches, including performance implications, scalability considerations, and team productivity impacts.');
  console.log('Response:', complexTask.substring(0, 100) + '...\n');

  // Test 3: Coding task (should use paid model)
  console.log('💻 Test 3: Coding Task');
  const codingTask = await client.simpleChat('Implement a TypeScript function that validates email addresses using regex and provides detailed error messages for different types of invalid inputs.');
  console.log('Response:', codingTask.substring(0, 100) + '...\n');

  // Test 4: Creative task (should use paid model)
  console.log('🎨 Test 4: Creative Task');
  const creativeTask = await client.simpleChat('Brainstorm innovative features for a health tracking app that integrates with blockchain technology.');
  console.log('Response:', creativeTask.substring(0, 100) + '...\n');

  // Test 5: Show model selection details
  console.log('🔍 Test 5: Model Selection Details');
  const messages = [
    { role: 'user' as const, content: 'Debug this React component that is not re-rendering when props change' }
  ];
  
  const result = await client.chat(messages);
  console.log(`Task Type: ${result.taskType.type}`);
  console.log(`Description: ${result.taskType.description}`);
  console.log(`Model Used: ${result.modelUsed}`);
  console.log(`Is Free Model: ${result.modelUsed.includes(':free')}\n`);

  // Show available models
  console.log('📋 Available Models:');
  const modelInfo = client.getModelInfo();
  console.log('Free Models:', modelInfo.free);
  console.log('Paid Models:', modelInfo.paid);
  console.log('Fallback Model:', modelInfo.fallback);
}

// Advanced usage example
async function advancedUsageExample() {
  const client = new SmartOpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here'
  });

  // Custom model configuration for different use cases
  client.updateModelConfig({
    freeModels: ['meta-llama/llama-3.2-3b-instruct:free'],
    paidModels: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4-turbo'],
    fallbackModel: 'microsoft/phi-3-mini-128k-instruct:free'
  });

  // Example with context
  const projectContext = {
    projectType: 'solana-dapp',
    technologies: ['react', 'typescript', 'anchor'],
    complexity: 'high'
  };

  const messages = [
    {
      role: 'system' as const,
      content: 'You are a Solana development expert helping with a health data platform.'
    },
    {
      role: 'user' as const,
      content: 'How should I structure the data models for storing genomic health data on Solana while ensuring privacy and compliance?'
    }
  ];

  const result = await client.chat(messages, projectContext);
  
  console.log('\n🔧 Advanced Usage Example:');
  console.log(`Selected Model: ${result.modelUsed}`);
  console.log(`Task Complexity: ${result.taskType.type}`);
  console.log(`Response: ${result.response.choices[0]?.message?.content?.substring(0, 200)}...`);
}

// Run examples
if (require.main === module) {
  demonstrateModelSwitching()
    .then(() => advancedUsageExample())
    .catch(console.error);
}

export { demonstrateModelSwitching, advancedUsageExample };
