/**
 * Mission Plans Service
 * Handle CRUD operations for strategic mission plans
 */

import { supabase } from '@/integrations/supabase/client';

export interface MissionPlan {
  id: string;
  user_id: string;
  name: string;
  type: 'offensive' | 'defensive' | 'pentest' | 'incident_response';
  status: 'draft' | 'planning' | 'approved' | 'active' | 'completed' | 'failed';
  objective: string;
  target_scope?: string;
  start_date?: string;
  end_date?: string;
  estimated_duration?: number; // hours
  phases: any[];
  risks: any[];
  success_criteria: string[];
  failure_scenarios: string[];
  ai_assessment: {
    feasibilityScore: number;
    riskScore: number;
    successProbability: number;
    recommendations: string[];
    warnings?: string[];
  };
  attack_diagram?: any;
  notes?: string;
  lessons_learned?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateMissionPlanData {
  name: string;
  type: MissionPlan['type'];
  objective: string;
  target_scope?: string;
  phases?: any[];
  risks?: any[];
  success_criteria?: string[];
  failure_scenarios?: string[];
}

class MissionPlansService {
  /**
   * Get all mission plans for current user
   */
  async getPlans(): Promise<MissionPlan[]> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mission plans:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a single mission plan by ID
   */
  async getPlan(id: string): Promise<MissionPlan | null> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching mission plan:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create a new mission plan
   */
  async createPlan(planData: CreateMissionPlanData): Promise<MissionPlan> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('mission_plans')
      .insert({
        user_id: user.id,
        name: planData.name,
        type: planData.type,
        objective: planData.objective,
        target_scope: planData.target_scope,
        phases: planData.phases || [],
        risks: planData.risks || [],
        success_criteria: planData.success_criteria || [],
        failure_scenarios: planData.failure_scenarios || [],
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating mission plan:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update a mission plan
   */
  async updatePlan(id: string, updates: Partial<MissionPlan>): Promise<MissionPlan> {
    const { data, error } = await supabase
      .from('mission_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mission plan:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a mission plan
   */
  async deletePlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('mission_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting mission plan:', error);
      throw error;
    }
  }

  /**
   * Get mission plans statistics
   */
  async getStats(): Promise<{
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    failedPlans: number;
    avgSuccessProbability: number;
    avgRiskScore: number;
  }> {
    const { data, error } = await supabase
      .from('mission_plans_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching stats:', error);
      // Return default stats if error
      return {
        totalPlans: 0,
        activePlans: 0,
        completedPlans: 0,
        failedPlans: 0,
        avgSuccessProbability: 0,
        avgRiskScore: 0,
      };
    }

    return {
      totalPlans: data.total_plans || 0,
      activePlans: data.active_plans || 0,
      completedPlans: data.completed_plans || 0,
      failedPlans: data.failed_plans || 0,
      avgSuccessProbability: data.avg_success_probability || 0,
      avgRiskScore: data.avg_risk_score || 0,
    };
  }

  /**
   * Update plan status
   */
  async updateStatus(id: string, status: MissionPlan['status']): Promise<void> {
    const updates: any = { status };

    // If marking as completed, set completed_at timestamp
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    await this.updatePlan(id, updates);
  }

  /**
   * Update AI assessment
   */
  async updateAIAssessment(
    id: string,
    assessment: MissionPlan['ai_assessment']
  ): Promise<void> {
    await this.updatePlan(id, { ai_assessment: assessment });
  }

  /**
   * Get plans by type
   */
  async getPlansByType(type: MissionPlan['type']): Promise<MissionPlan[]> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plans by type:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get active plans
   */
  async getActivePlans(): Promise<MissionPlan[]> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active plans:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Search plans by name or objective
   */
  async searchPlans(query: string): Promise<MissionPlan[]> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .or(`name.ilike.%${query}%,objective.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching plans:', error);
      throw error;
    }

    return data || [];
  }
}

// Export singleton instance
export const missionPlansService = new MissionPlansService();
export default missionPlansService;
