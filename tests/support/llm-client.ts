import OpenAI from 'openai';
import { getLiteLLMPort } from './litellm-helper.mjs';

/**
 * LLM Client for communicating with LiteLLM Proxy
 * Provides a simple interface for chat completions and tool calls
 */
export class LLMClient {
  private client: OpenAI;
  private baseURL: string;
  private apiKey: string;

  constructor(
    baseURL: string = process.env.LITELLM_PROXY_URL || 'http://localhost:4000',
    apiKey: string = process.env.LITELLM_PROXY_API_KEY || 'sk-test-bmad-1234',
  ) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
    });
  }

  /**
   * Initialize with the detected LiteLLM port
   */
  static async create(
    apiKey: string = process.env.LITELLM_PROXY_API_KEY || 'sk-test-bmad-1234',
  ): Promise<LLMClient> {
    const port = await getLiteLLMPort();
    const baseURL = `http://localhost:${port}`;
    return new LLMClient(baseURL, apiKey);
  }

  /**
   * Send a chat completion request
   */
  async chat(
    model: string,
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>,
    options: {
      temperature?: number;
      max_tokens?: number;
      tools?: Array<any>;
    } = {},
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return await this.client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.max_tokens,
      tools: options.tools,
    });
  }

  /**
   * Get the response text from a completion
   */
  getResponseText(completion: OpenAI.Chat.Completions.ChatCompletion): string {
    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Get tool calls from a completion
   */
  getToolCalls(completion: OpenAI.Chat.Completions.ChatCompletion) {
    return completion.choices[0]?.message?.tool_calls || [];
  }

  /**
   * Check if the proxy is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health/readiness`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
