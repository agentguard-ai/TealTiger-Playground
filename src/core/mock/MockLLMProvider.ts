import { generatePIIResponse } from './patterns/pii';
import { generateInjectionResponse } from './patterns/injection';

export interface MockRequest {
  provider: 'openai' | 'anthropic' | 'gemini' | 'bedrock';
  model: string;
  prompt: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  testType?: 'pii' | 'injection' | 'normal';
}

export interface MockResponse {
  content: string;
  metadata: {
    tokens: { prompt: number; completion: number; total: number };
    latency: number;
    cost: number;
    model: string;
  };
}

export interface MockChunk {
  content: string;
  isComplete: boolean;
  metadata?: MockResponse['metadata'];
}

export class MockLLMProvider {
  async generateResponse(request: MockRequest): Promise<MockResponse> {
    const startTime = performance.now();

    // Generate content based on test type
    let content: string;
    switch (request.testType) {
      case 'pii':
        content = generatePIIResponse(request.prompt);
        break;
      case 'injection':
        content = generateInjectionResponse(request.prompt);
        break;
      default:
        content = this.generateNormalResponse(request.prompt);
    }

    // Simulate response metadata
    const tokens = {
      prompt: this.estimateTokens(request.prompt),
      completion: this.estimateTokens(content),
      total: 0,
    };
    tokens.total = tokens.prompt + tokens.completion;

    const latency = performance.now() - startTime;
    const cost = this.calculateCost(tokens.total, request.model);

    return {
      content,
      metadata: {
        tokens,
        latency,
        cost,
        model: request.model,
      },
    };
  }

  async *generateStreamingResponse(request: MockRequest): AsyncGenerator<MockChunk> {
    const response = await this.generateResponse(request);
    const words = response.content.split(' ');

    for (let i = 0; i < words.length; i++) {
      await this.delay(50); // 50ms between chunks

      yield {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        isComplete: i === words.length - 1,
        metadata: i === words.length - 1 ? response.metadata : undefined,
      };
    }
  }

  private generateNormalResponse(prompt: string): string {
    // Simple keyword-based response generation
    const keywords = prompt.toLowerCase();

    if (keywords.includes('hello') || keywords.includes('hi')) {
      return 'Hello! How can I assist you today?';
    } else if (keywords.includes('weather')) {
      return "I don't have access to real-time weather data, but I can help you find weather information.";
    } else if (keywords.includes('code') || keywords.includes('program')) {
      return 'I can help you with coding questions. What programming language are you working with?';
    } else if (keywords.includes('policy')) {
      return 'I can help you understand TealTiger policies. What would you like to know?';
    } else {
      return 'I understand your request. Let me help you with that.';
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateCost(tokens: number, model: string): number {
    const pricing: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.0015,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003,
      'gemini-pro': 0.00025,
      'claude-v2': 0.008,
    };

    const pricePerK = pricing[model] || 0.001;
    return (tokens / 1000) * pricePerK;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
