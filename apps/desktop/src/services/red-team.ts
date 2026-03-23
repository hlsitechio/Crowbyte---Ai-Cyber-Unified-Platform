/**
 * Red Team Operations Service
 * Manages penetration testing operations and security findings
 */

import { supabase } from '@/lib/supabase';

export interface RedTeamOperation {
  id: string;
  user_id: string;
  name: string;
  target: string;
  operation_type: 'pentest' | 'red_team' | 'vulnerability_assessment' | 'bug_bounty';
  description?: string;
  status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  progress: number;
  scope: unknown[];
  exclusions: unknown[];
  rules_of_engagement?: string;
  authorized_by?: string;
  authorization_document_url?: string;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  info_findings: number;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RedTeamFinding {
  id: string;
  operation_id: string;
  user_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'injection' | 'authentication' | 'authorization' | 'crypto' | 'config' | 'other';
  affected_component?: string;
  attack_vector?: string;
  proof_of_concept?: string;
  impact?: string;
  remediation?: string;
  cvss_score?: number;
  cvss_vector?: string;
  status: 'new' | 'confirmed' | 'false_positive' | 'remediated' | 'accepted_risk';
  verified: boolean;
  screenshots: string[];
  evidence_files: unknown[];
  cve_references: string[];
  cwe_references: string[];
  external_references: unknown[];
  discovered_at: string;
  verified_at?: string;
  remediated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOperationData {
  name: string;
  target: string;
  operation_type: RedTeamOperation['operation_type'];
  description?: string;
  scope?: unknown[];
  exclusions?: unknown[];
  rules_of_engagement?: string;
  authorized_by?: string;
  planned_start?: string;
  planned_end?: string;
  tags?: string[];
  notes?: string;
}

export interface CreateFindingData {
  operation_id: string;
  title: string;
  description: string;
  severity: RedTeamFinding['severity'];
  category: RedTeamFinding['category'];
  affected_component?: string;
  attack_vector?: string;
  proof_of_concept?: string;
  impact?: string;
  remediation?: string;
  cvss_score?: number;
  cvss_vector?: string;
  cve_references?: string[];
  cwe_references?: string[];
}

class RedTeamService {
  /**
   * Get all operations for current user
   */
  async getOperations(): Promise<RedTeamOperation[]> {
    const { data, error } = await supabase
      .from('red_team_operations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch operations:', error);
      throw new Error(`Failed to fetch operations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single operation by ID
   */
  async getOperation(id: string): Promise<RedTeamOperation> {
    const { data, error } = await supabase
      .from('red_team_operations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch operation:', error);
      throw new Error(`Failed to fetch operation: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new operation
   */
  async createOperation(operationData: CreateOperationData): Promise<RedTeamOperation> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('red_team_operations')
      .insert({
        user_id: user.id,
        ...operationData,
        scope: operationData.scope || [],
        exclusions: operationData.exclusions || [],
        tags: operationData.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create operation:', error);
      throw new Error(`Failed to create operation: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an operation
   */
  async updateOperation(id: string, updates: Partial<CreateOperationData>): Promise<RedTeamOperation> {
    const { data, error } = await supabase
      .from('red_team_operations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update operation:', error);
      throw new Error(`Failed to update operation: ${error.message}`);
    }

    return data;
  }

  /**
   * Update operation status and progress
   */
  async updateOperationStatus(
    id: string,
    status: RedTeamOperation['status'],
    progress?: number
  ): Promise<RedTeamOperation> {
    const updates: Record<string, unknown> = { status };

    if (progress !== undefined) {
      updates.progress = progress;
    }

    // Set actual start/end times based on status
    if (status === 'in_progress' && !updates.actual_start) {
      updates.actual_start = new Date().toISOString();
    } else if (status === 'completed' && !updates.actual_end) {
      updates.actual_end = new Date().toISOString();
      updates.progress = 100;
    }

    return this.updateOperation(id, updates);
  }

  /**
   * Delete an operation
   */
  async deleteOperation(id: string): Promise<void> {
    const { error } = await supabase
      .from('red_team_operations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete operation:', error);
      throw new Error(`Failed to delete operation: ${error.message}`);
    }
  }

  /**
   * Get all findings for an operation
   */
  async getFindings(operationId?: string): Promise<RedTeamFinding[]> {
    let query = supabase
      .from('red_team_findings')
      .select('*')
      .order('discovered_at', { ascending: false });

    if (operationId) {
      query = query.eq('operation_id', operationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch findings:', error);
      throw new Error(`Failed to fetch findings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single finding by ID
   */
  async getFinding(id: string): Promise<RedTeamFinding> {
    const { data, error } = await supabase
      .from('red_team_findings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch finding:', error);
      throw new Error(`Failed to fetch finding: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new finding
   */
  async createFinding(findingData: CreateFindingData): Promise<RedTeamFinding> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('red_team_findings')
      .insert({
        user_id: user.id,
        ...findingData,
        screenshots: [],
        evidence_files: [],
        cve_references: findingData.cve_references || [],
        cwe_references: findingData.cwe_references || [],
        external_references: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create finding:', error);
      throw new Error(`Failed to create finding: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a finding
   */
  async updateFinding(id: string, updates: Partial<CreateFindingData>): Promise<RedTeamFinding> {
    const { data, error } = await supabase
      .from('red_team_findings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update finding:', error);
      throw new Error(`Failed to update finding: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a finding
   */
  async deleteFinding(id: string): Promise<void> {
    const { error } = await supabase
      .from('red_team_findings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete finding:', error);
      throw new Error(`Failed to delete finding: ${error.message}`);
    }
  }

  /**
   * Get operation statistics
   */
  async getOperationStats(): Promise<{
    totalOperations: number;
    activeOperations: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
  }> {
    const operations = await this.getOperations();

    const totalOperations = operations.length;
    const activeOperations = operations.filter(
      op => op.status === 'in_progress' || op.status === 'planned'
    ).length;
    const totalFindings = operations.reduce((sum, op) => sum + op.total_findings, 0);
    const criticalFindings = operations.reduce((sum, op) => sum + op.critical_findings, 0);
    const highFindings = operations.reduce((sum, op) => sum + op.high_findings, 0);

    return {
      totalOperations,
      activeOperations,
      totalFindings,
      criticalFindings,
      highFindings,
    };
  }

  /**
   * Get findings by severity
   */
  async getFindingsBySeverity(operationId?: string): Promise<Record<string, number>> {
    const findings = await this.getFindings(operationId);

    return {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    };
  }
}

// Export singleton instance
export const redTeamService = new RedTeamService();
export default redTeamService;
