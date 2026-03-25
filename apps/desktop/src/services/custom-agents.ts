/**
 * Custom AI Agents Service
 * Manages custom AI agents and their conversations
 */

import { supabase } from '@/lib/supabase';

export interface CustomAgent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  avatar_icon: string;
  color: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  tools: unknown[];
  knowledge_sources: unknown[];
  example_prompts: string[];
  enable_mcp: boolean;
  enable_web_search: boolean;
  enable_code_execution: boolean;
  enable_file_access: boolean;
  status: 'draft' | 'active' | 'archived';
  is_public: boolean;
  execution_count: number;
  last_used_at?: string;
  tags: string[];
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentConversation {
  id: string;
  agent_id: string;
  user_id: string;
  title: string;
  messages: unknown[];
  status: 'active' | 'archived';
  message_count: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  avatar_icon?: string;
  color?: string;
  system_prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  knowledge_sources?: unknown[];
  example_prompts?: string[];
  enable_mcp?: boolean;
  enable_web_search?: boolean;
  enable_code_execution?: boolean;
  enable_file_access?: boolean;
  tags?: string[];
  category?: string;
}

export interface CreateConversationData {
  agent_id: string;
  title?: string;
}

export interface AddMessageData {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
}

class CustomAgentsService {
  /**
   * Get all agents for current user
   */
  async getAgents(includePublic: boolean = false): Promise<CustomAgent[]> {
    let query = supabase
      .from('custom_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includePublic) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq('user_id', user.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get agents by category
   */
  async getAgentsByCategory(category: string): Promise<CustomAgent[]> {
    const { data, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('category', category)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch agents by category:', error);
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single agent by ID
   */
  async getAgent(id: string): Promise<CustomAgent> {
    const { data, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch agent:', error);
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new agent
   */
  async createAgent(agentData: CreateAgentData): Promise<CustomAgent> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('custom_agents')
      .insert({
        user_id: user.id,
        ...agentData,
        avatar_icon: agentData.avatar_icon || 'Bot',
        color: agentData.color || '#8b5cf6',
        model: agentData.model || 'llama-3.3-70b',
        temperature: agentData.temperature ?? 0.7,
        max_tokens: agentData.max_tokens || 2000,
        tools: agentData.tools || [],
        knowledge_sources: agentData.knowledge_sources || [],
        example_prompts: agentData.example_prompts || [],
        tags: agentData.tags || [],
        enable_mcp: agentData.enable_mcp ?? false,
        enable_web_search: agentData.enable_web_search ?? false,
        enable_code_execution: agentData.enable_code_execution ?? false,
        enable_file_access: agentData.enable_file_access ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create agent:', error);
      throw new Error(`Failed to create agent: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an agent
   */
  async updateAgent(id: string, updates: Partial<CreateAgentData>): Promise<CustomAgent> {
    const { data, error } = await supabase
      .from('custom_agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update agent:', error);
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return data;
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(id: string, status: CustomAgent['status']): Promise<CustomAgent> {
    return this.updateAgent(id, { status });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete agent:', error);
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
  }

  /**
   * Get all conversations for an agent
   */
  async getConversations(agentId?: string): Promise<AgentConversation[]> {
    let query = supabase
      .from('agent_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch conversations:', error);
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single conversation by ID
   */
  async getConversation(id: string): Promise<AgentConversation> {
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch conversation:', error);
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new conversation
   */
  async createConversation(conversationData: CreateConversationData): Promise<AgentConversation> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('agent_conversations')
      .insert({
        user_id: user.id,
        agent_id: conversationData.agent_id,
        title: conversationData.title || 'New Conversation',
        messages: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create conversation:', error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data;
  }

  /**
   * Add message to conversation
   */
  async addMessage(messageData: AddMessageData): Promise<AgentConversation> {
    // Get current conversation
    const conversation = await this.getConversation(messageData.conversation_id);

    // Add new message
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.push({
      role: messageData.role,
      content: messageData.content,
      timestamp: new Date().toISOString(),
    });

    // Update conversation
    const { data, error } = await supabase
      .from('agent_conversations')
      .update({
        messages,
        message_count: messages.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageData.conversation_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to add message:', error);
      throw new Error(`Failed to add message: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const { error } = await supabase
      .from('agent_conversations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalConversations: number;
    totalExecutions: number;
  }> {
    const agents = await this.getAgents();
    const conversations = await this.getConversations();

    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const totalConversations = conversations.length;
    const totalExecutions = agents.reduce((sum, a) => sum + a.execution_count, 0);

    return {
      totalAgents,
      activeAgents,
      totalConversations,
      totalExecutions,
    };
  }

  /**
   * Clone an existing agent
   */
  async cloneAgent(id: string, newName: string): Promise<CustomAgent> {
    const original = await this.getAgent(id);

    const cloneData: CreateAgentData = {
      name: newName,
      description: original.description,
      avatar_icon: original.avatar_icon,
      color: original.color,
      system_prompt: original.system_prompt,
      model: original.model,
      temperature: original.temperature,
      max_tokens: original.max_tokens,
      tools: original.tools,
      knowledge_sources: original.knowledge_sources,
      example_prompts: original.example_prompts,
      enable_mcp: original.enable_mcp,
      enable_web_search: original.enable_web_search,
      enable_code_execution: original.enable_code_execution,
      enable_file_access: original.enable_file_access,
      tags: [...original.tags, 'cloned'],
      category: original.category,
    };

    return this.createAgent(cloneData);
  }
}

// Export singleton instance
export const customAgentsService = new CustomAgentsService();
export default customAgentsService;
