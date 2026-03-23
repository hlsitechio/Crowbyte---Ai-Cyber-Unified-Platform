/**
 * AI Tools Service
 * Manages security testing and analysis tools
 */

import { supabase } from '@/lib/supabase';

export interface Tool {
  id: string;
  user_id: string;
  name: string;
  category: 'reconnaissance' | 'scanning' | 'exploitation' | 'post-exploitation' | 'analysis';
  description?: string;
  tool_type: 'mcp_tool' | 'shell_script' | 'api_endpoint' | 'custom';
  config: Record<string, unknown>;
  endpoint_url?: string;
  command_template?: string;
  parameters: unknown[];
  status: 'active' | 'disabled' | 'error';
  icon: string;
  color: string;
  execution_count: number;
  last_execution_at?: string;
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface ToolExecution {
  id: string;
  tool_id: string;
  user_id: string;
  parameters: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
  duration_ms?: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateToolData {
  name: string;
  category: Tool['category'];
  description?: string;
  tool_type: Tool['tool_type'];
  config?: Record<string, unknown>;
  endpoint_url?: string;
  command_template?: string;
  parameters?: unknown[];
  icon?: string;
  color?: string;
}

export interface ExecuteToolData {
  tool_id: string;
  parameters?: Record<string, unknown>;
}

class ToolsService {
  /**
   * Get all tools for current user
   */
  async getTools(): Promise<Tool[]> {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tools:', error);
      throw new Error(`Failed to fetch tools: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: Tool['category']): Promise<Tool[]> {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch tools by category:', error);
      throw new Error(`Failed to fetch tools: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single tool by ID
   */
  async getTool(id: string): Promise<Tool> {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch tool:', error);
      throw new Error(`Failed to fetch tool: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new tool
   */
  async createTool(toolData: CreateToolData): Promise<Tool> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('tools')
      .insert({
        user_id: user.id,
        ...toolData,
        config: toolData.config || {},
        parameters: toolData.parameters || [],
        icon: toolData.icon || 'Wrench',
        color: toolData.color || '#3b82f6',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create tool:', error);
      throw new Error(`Failed to create tool: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a tool
   */
  async updateTool(id: string, updates: Partial<CreateToolData>): Promise<Tool> {
    const { data, error } = await supabase
      .from('tools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update tool:', error);
      throw new Error(`Failed to update tool: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a tool
   */
  async deleteTool(id: string): Promise<void> {
    const { error } = await supabase
      .from('tools')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete tool:', error);
      throw new Error(`Failed to delete tool: ${error.message}`);
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(data: ExecuteToolData): Promise<ToolExecution> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const startTime = Date.now();

    try {
      // Get tool details
      const tool = await this.getTool(data.tool_id);

      // Execute based on tool type
      let result: Record<string, unknown> = {};
      let status: 'success' | 'error' = 'success';
      let errorMessage: string | undefined;

      if (tool.tool_type === 'api_endpoint' && tool.endpoint_url) {
        // Execute API call
        try {
          const response = await fetch(tool.endpoint_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data.parameters || {}),
          });
          result = await response.json();
        } catch (error: unknown) {
          status = 'error';
          errorMessage = error instanceof Error ? error.message : 'API call failed';
          result = { error: errorMessage };
        }
      } else {
        // For other tool types, return a placeholder
        result = {
          message: `Tool type ${tool.tool_type} execution not yet implemented`,
          parameters: data.parameters,
        };
      }

      const duration = Date.now() - startTime;

      // Log execution
      const { data: execution, error: execError } = await supabase
        .from('tool_executions')
        .insert({
          tool_id: data.tool_id,
          user_id: user.id,
          parameters: data.parameters || {},
          result,
          status,
          error_message: errorMessage,
          duration_ms: duration,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (execError) {
        console.error('Failed to log tool execution:', execError);
        throw new Error(`Failed to log execution: ${execError.message}`);
      }

      return execution;
    } catch (error: unknown) {
      // Log failed execution
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const { data: execution } = await supabase
        .from('tool_executions')
        .insert({
          tool_id: data.tool_id,
          user_id: user.id,
          parameters: data.parameters || {},
          status: 'error',
          error_message: errorMessage,
          duration_ms: duration,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      throw error;
    }
  }

  /**
   * Get tool execution history
   */
  async getToolExecutions(toolId?: string, limit: number = 50): Promise<ToolExecution[]> {
    let query = supabase
      .from('tool_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (toolId) {
      query = query.eq('tool_id', toolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch tool executions:', error);
      throw new Error(`Failed to fetch executions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get tool statistics
   */
  async getToolStats(): Promise<{
    totalTools: number;
    activeTools: number;
    totalExecutions: number;
    successRate: number;
  }> {
    const tools = await this.getTools();

    const totalTools = tools.length;
    const activeTools = tools.filter(t => t.status === 'active').length;
    const totalExecutions = tools.reduce((sum, t) => sum + t.execution_count, 0);
    const totalSuccess = tools.reduce((sum, t) => sum + t.success_count, 0);
    const successRate = totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0;

    return {
      totalTools,
      activeTools,
      totalExecutions,
      successRate,
    };
  }
}

// Export singleton instance
export const toolsService = new ToolsService();
export default toolsService;
