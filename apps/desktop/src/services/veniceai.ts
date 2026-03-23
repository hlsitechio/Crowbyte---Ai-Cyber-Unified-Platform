/**
 * Venice.ai API Service
 * Handles chat completions and model management via Supabase Edge Functions
 * This version uses Supabase proxy for automatic usage tracking and rate limiting
 * Includes intelligent caching via Supabase for response reuse
 */

import { edgeFunctions } from './supabase-edge-functions';
import { cacheService } from './cache';
import type { LLMResponse } from '@/types/service-types';

export interface VeniceMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VeniceChatRequest {
  model: string;
  messages: VeniceMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface VeniceModel {
  id: string;
  name: string;
  context_length: number;
  type: string;
  capabilities: string[];
  pricing?: {
    input: number;
    output: number;
  };
}

class VeniceAIService {
  private apiKey: string;
  private baseUrl = 'https://api.venice.ai/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_VENICE_API_KEY || '';
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Fetch available models from Venice.ai (with caching)
   */
  async getModels(type?: string): Promise<VeniceModel[]> {
    if (!this.apiKey) {
      throw new Error('Venice.ai API key not configured');
    }

    // Use cache with automatic key generation
    return cacheService.cacheWithInput(
      { type: type || 'all', endpoint: 'models' },
      async () => {
        const url = new URL(`${this.baseUrl}/models`);
        if (type) {
          url.searchParams.append('type', type);
        }

        const response = await fetch(url.toString(), {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data || [];
      },
      'api_response',
      {
        ttl: 3600 * 24, // Cache models for 24 hours
        namespace: 'venice_models',
        userSpecific: false, // Models are same for all users
        metadata: { type, service: 'venice.ai' },
      }
    );
  }

  /**
   * Create a chat completion (non-streaming) via Supabase Edge Function
   * Includes intelligent caching for identical requests
   */
  async createChatCompletion(request: VeniceChatRequest): Promise<LLMResponse> {
    try {
      // Use cache with automatic key generation based on full request
      return await cacheService.cacheWithInput(
        {
          model: request.model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens,
          endpoint: 'chat',
        },
        async () => {
          // Use Supabase edge function proxy for automatic usage tracking
          const response = await edgeFunctions.venice.chat({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            stream: false,
          });

          return response;
        },
        'conversation',
        {
          ttl: 3600 * 6, // Cache conversations for 6 hours
          namespace: 'venice_chat',
          userSpecific: true, // User-specific conversations
          metadata: {
            model: request.model,
            message_count: request.messages.length,
            service: 'venice.ai',
          },
        }
      );
    } catch (error: unknown) {
      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Daily API limit exceeded')) {
        throw new Error('Venice.ai daily limit exceeded. Please try again tomorrow.');
      }
      throw error;
    }
  }

  /**
   * Create a streaming chat completion via Supabase Edge Function
   */
  async *createStreamingChatCompletion(request: VeniceChatRequest): AsyncGenerator<string> {
    try {
      // Use Supabase edge function proxy for automatic usage tracking
      const generator = edgeFunctions.venice.chatStream({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
      });

      for await (const content of generator) {
        yield content;
      }
    } catch (error: unknown) {
      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Daily API limit exceeded')) {
        throw new Error('Venice.ai daily limit exceeded. Please try again tomorrow.');
      }
      throw error;
    }
  }

  // MCP methods removed - use veniceai-electron.ts for Electron with MCP support

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getModels('text');
      return true;
    } catch (error) {
      console.error('Venice.ai connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const veniceAI = new VeniceAIService();
export default veniceAI;
