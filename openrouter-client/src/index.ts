import { fetch } from 'undici';

export interface TaskType {
  type: 'simple' | 'complex' | 'coding' | 'analysis' | 'creative';
  description: string;
}

export interface ModelConfig {
  freeModels: string[];
  paidModels: string[];
  fallbackModel: string;
}

export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  modelConfig?: ModelConfig;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class SmartOpenRouterClient {
  private apiKey: string;
  private baseURL: string;
  private modelConfig: ModelConfig;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.modelConfig = config.modelConfig || {
      freeModels: [
        'meta-llama/llama-3.2-3b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free',
        'huggingfaceh4/zephyr-7b-beta:free'
      ],
      paidModels: [
        'openai/gpt-4',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4-turbo'
      ],
      fallbackModel: 'meta-llama/llama-3.2-3b-instruct:free'
    };
  }

  private detectTaskComplexity(prompt: string, context?: any): TaskType {
    const simpleKeywords = [
      'what is', 'define', 'explain simply', 'basic', 'simple',
      'quick question', 'short answer', 'summarize briefly'
    ];

    const complexKeywords = [
      'analyze', 'detailed analysis', 'comprehensive', 'in-depth',
      'complex', 'advanced', 'sophisticated', 'thorough'
    ];

    const codingKeywords = [
      'code', 'function', 'class', 'implement', 'debug', 'refactor',
      'typescript', 'javascript', 'react', 'api', 'database'
    ];

    const creativeKeywords = [
      'create', 'design', 'brainstorm', 'innovative', 'creative',
      'imagine', 'suggest ideas', 'invent'
    ];

    const lowerPrompt = prompt.toLowerCase();

    // Check for coding tasks
    if (codingKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return { type: 'coding', description: 'Programming/Development task' };
    }

    // Check for creative tasks
    if (creativeKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return { type: 'creative', description: 'Creative/Brainstorming task' };
    }

    // Check for complex analysis
    if (complexKeywords.some(keyword => lowerPrompt.includes(keyword)) || 
        prompt.length > 500 || 
        (context && Object.keys(context).length > 5)) {
      return { type: 'complex', description: 'Complex analysis task' };
    }

    // Check for simple tasks
    if (simpleKeywords.some(keyword => lowerPrompt.includes(keyword)) || 
        prompt.length < 100) {
      return { type: 'simple', description: 'Simple question/task' };
    }

    // Default to analysis for medium complexity
    return { type: 'analysis', description: 'General analysis task' };
  }

  private selectModel(taskType: TaskType): string {
    const { type } = taskType;
    const { freeModels, paidModels, fallbackModel } = this.modelConfig;

    switch (type) {
      case 'simple':
        return freeModels[0]; // Use first free model for simple tasks
      
      case 'coding':
      case 'complex':
      case 'creative':
        return paidModels[0]; // Use best paid model for complex tasks
      
      case 'analysis':
        // Use paid model for analysis if available, fallback to free
        return paidModels.length > 0 ? paidModels[1] || paidModels[0] : freeModels[1] || freeModels[0];
      
      default:
        return fallbackModel;
    }
  }

  async chat(
    messages: OpenRouterMessage[], 
    context?: any,
    forceModel?: string
  ): Promise<{ response: OpenRouterResponse; modelUsed: string; taskType: TaskType }> {
    
    const lastMessage = messages[messages.length - 1];
    const taskType = this.detectTaskComplexity(lastMessage.content, context);
    const model = forceModel || this.selectModel(taskType);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://genosync.com',
          'X-Title': 'GenoSync Development Assistant',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: taskType.type === 'creative' ? 0.9 : 0.7,
          max_tokens: taskType.type === 'simple' ? 500 : 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OpenRouterResponse;
      
      return {
        response: data,
        modelUsed: model,
        taskType
      };

    } catch (error) {
      // Fallback to fallback model if primary model fails
      if (model !== this.modelConfig.fallbackModel) {
        console.warn(`Primary model ${model} failed, trying fallback ${this.modelConfig.fallbackModel}`);
        return this.chat(messages, context, this.modelConfig.fallbackModel);
      }
      throw error;
    }
  }

  async simpleChat(prompt: string): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.chat(messages);
    return result.response.choices[0]?.message?.content || 'No response generated';
  }

  getModelInfo(): { free: string[]; paid: string[]; fallback: string } {
    return {
      free: this.modelConfig.freeModels,
      paid: this.modelConfig.paidModels,
      fallback: this.modelConfig.fallbackModel
    };
  }

  updateModelConfig(newConfig: Partial<ModelConfig>): void {
    this.modelConfig = { ...this.modelConfig, ...newConfig };
  }
}
