/**
 * Mission Planner Service
 * Supabase CRUD for mission_plans table
 */

import { supabase } from '@/lib/supabase';

export interface MissionPlan {
  id: string;
  user_id: string;
  name: string;
  type: string;
  objective?: string;
  target_scope?: string;
  status: 'draft' | 'planning' | 'approved' | 'active' | 'completed' | 'failed';
  phases: any[];
  risks: any[];
  success_criteria: any[];
  failure_scenarios: any[];
  timeline?: string;
  ai_assessment?: {
    feasibilityScore: number;
    riskScore: number;
    successProbability: number;
    recommendations: string[];
    warnings?: string[];
  };
  strategy?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMissionPlanData {
  name: string;
  type: string;
  objective?: string;
  target_scope?: string;
  status?: MissionPlan['status'];
  phases?: any[];
  risks?: any[];
  success_criteria?: any[];
  failure_scenarios?: any[];
  timeline?: string;
  ai_assessment?: MissionPlan['ai_assessment'];
  strategy?: string;
  tags?: string[];
  notes?: string;
}

class MissionPlannerService {
  async getPlans(): Promise<MissionPlan[]> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch plans: ${error.message}`);
    return data || [];
  }

  async getPlan(id: string): Promise<MissionPlan | null> {
    const { data, error } = await supabase
      .from('mission_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
    return data;
  }

  async createPlan(planData: CreateMissionPlanData): Promise<MissionPlan> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('mission_plans')
      .insert({
        user_id: user.id,
        name: planData.name,
        type: planData.type,
        objective: planData.objective || '',
        target_scope: planData.target_scope,
        status: planData.status || 'draft',
        phases: planData.phases || [],
        risks: planData.risks || [],
        success_criteria: planData.success_criteria || [],
        failure_scenarios: planData.failure_scenarios || [],
        timeline: planData.timeline,
        ai_assessment: planData.ai_assessment || null,
        strategy: planData.strategy,
        tags: planData.tags || [],
        notes: planData.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create plan: ${error.message}`);
    return data;
  }

  async updatePlan(id: string, updates: Partial<CreateMissionPlanData>): Promise<MissionPlan> {
    const { data, error } = await supabase
      .from('mission_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update plan: ${error.message}`);
    return data;
  }

  async deletePlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('mission_plans')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete plan: ${error.message}`);
  }

  async getPlanStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    try {
      const plans = await this.getPlans();
      return {
        total: plans.length,
        active: plans.filter(p => p.status === 'active' || p.status === 'planning').length,
        completed: plans.filter(p => p.status === 'completed').length,
        failed: plans.filter(p => p.status === 'failed').length,
      };
    } catch {
      return { total: 0, active: 0, completed: 0, failed: 0 };
    }
  }
}

export const missionPlannerService = new MissionPlannerService();
export default missionPlannerService;
