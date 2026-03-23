/**
 * Shared Service Type Definitions
 * Reusable types across all service files
 */

// Generic API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic API Error
export interface ApiError {
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

// Fetch Options
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | FormData;
  signal?: AbortSignal;
}

// Tool Function Definition
export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Tool Call
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Chat Message
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// LLM Request
export interface LLMRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolFunction[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// LLM Response
export interface LLMResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Monitoring Report
export interface MonitoringReport {
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  details: Record<string, unknown>;
  timestamp: string;
  issues?: string[];
  recommendations?: string[];
}

// System Metrics
export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network?: {
    rx: number;
    tx: number;
  };
}

// Service Configuration
export interface ServiceConfig {
  apiKey?: string;
  apiUrl?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
