/**
 * Organization Service — Multi-Tenant Workspace Management
 *
 * Manages organizations, memberships, invitations, and subscriptions.
 * All operations go through Supabase with RLS enforced.
 *
 * Numbering:
 *   Client:     CB-XXXXX  (all customers)
 *   Workspace:  WS-XXXX   (per workspace)
 *   Enterprise: ENT-XXXX  (enterprise only)
 */

import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrgTier = 'community' | 'professional' | 'team' | 'enterprise';
export type OrgStatus = 'active' | 'suspended' | 'cancelled' | 'trial' | 'pending';
export type MemberRole = 'owner' | 'admin' | 'operator' | 'analyst' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SubStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'paused' | 'expired';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  client_number: string;
  enterprise_number: string | null;
  logo_url: string | null;
  website: string | null;
  billing_email: string;
  technical_email: string | null;
  country_code: string | null;
  tier: OrgTier;
  status: OrgStatus;
  trial_ends_at: string | null;
  max_members: number | null;
  max_endpoints: number | null;
  max_targets: number | null;
  industry: string | null;
  company_size: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  status: string;
  display_name: string | null;
  job_title: string | null;
  department: string | null;
  joined_at: string;
  last_active_at: string | null;
}

export interface Workspace {
  id: string;
  org_id: string;
  name: string;
  workspace_number: string;
  description: string | null;
  is_default: boolean;
  environment: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: MemberRole;
  token: string;
  status: InviteStatus;
  message: string | null;
  expires_at: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  org_id: string;
  license_key: string | null;
  tier: OrgTier;
  status: SubStatus;
  billing_provider: string | null;
  amount_cents: number | null;
  currency: string;
  billing_interval: string;
  current_period_start: string | null;
  current_period_end: string | null;
  seats_purchased: number;
  seats_used: number;
  created_at: string;
}

export interface OrgDashboard {
  org_id: string;
  name: string;
  client_number: string;
  enterprise_number: string | null;
  tier: OrgTier;
  status: OrgStatus;
  seats_purchased: number;
  seats_used: number;
  subscription_expires: string | null;
  subscription_status: SubStatus;
  workspace_count: number;
  member_count: number;
  pending_invites: number;
}

// Tier limits (defaults — can be overridden per org)
export const TIER_LIMITS: Record<OrgTier, {
  maxMembers: number;
  maxEndpoints: number;
  maxTargets: number;
  maxAgents: number;
  maxWorkspaces: number;
  priceRange: string;
}> = {
  community: { maxMembers: 1, maxEndpoints: 3, maxTargets: 3, maxAgents: 0, maxWorkspaces: 1, priceRange: 'Free' },
  professional: { maxMembers: 1, maxEndpoints: 25, maxTargets: -1, maxAgents: 5, maxWorkspaces: 3, priceRange: '$299-499/yr' },
  team: { maxMembers: 25, maxEndpoints: -1, maxTargets: -1, maxAgents: -1, maxWorkspaces: 10, priceRange: '$799-1,499/yr' },
  enterprise: { maxMembers: -1, maxEndpoints: -1, maxTargets: -1, maxAgents: -1, maxWorkspaces: -1, priceRange: 'Custom' },
};

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<MemberRole, {
  canManageMembers: boolean;
  canManageBilling: boolean;
  canRunScans: boolean;
  canViewResults: boolean;
  canExportReports: boolean;
  canManageAgents: boolean;
  canAccessFleet: boolean;
  canAccessRemoteDesktop: boolean;
}> = {
  owner:    { canManageMembers: true, canManageBilling: true, canRunScans: true, canViewResults: true, canExportReports: true, canManageAgents: true, canAccessFleet: true, canAccessRemoteDesktop: true },
  admin:    { canManageMembers: true, canManageBilling: true, canRunScans: true, canViewResults: true, canExportReports: true, canManageAgents: true, canAccessFleet: true, canAccessRemoteDesktop: true },
  operator: { canManageMembers: false, canManageBilling: false, canRunScans: true, canViewResults: true, canExportReports: true, canManageAgents: true, canAccessFleet: true, canAccessRemoteDesktop: true },
  analyst:  { canManageMembers: false, canManageBilling: false, canRunScans: true, canViewResults: true, canExportReports: true, canManageAgents: false, canAccessFleet: false, canAccessRemoteDesktop: false },
  viewer:   { canManageMembers: false, canManageBilling: false, canRunScans: false, canViewResults: true, canExportReports: false, canManageAgents: false, canAccessFleet: false, canAccessRemoteDesktop: false },
};

// ─── Service ────────────────────────────────────────────────────────────────

class OrganizationService {

  // ─── Organization CRUD ──────────────────────────────────────────

  /** Create org via RPC (handles client_number, workspace, membership) */
  async createOrganization(params: {
    name: string;
    billingEmail: string;
    tier?: OrgTier;
    countryCode?: string;
    industry?: string;
    companySize?: string;
  }): Promise<{ orgId: string; clientNumber: string; enterpriseNumber: string | null; workspaceId: string; workspaceNumber: string }> {
    const { data, error } = await supabase.rpc('create_organization', {
      p_name: params.name,
      p_billing_email: params.billingEmail,
      p_tier: params.tier || 'community',
      p_country_code: params.countryCode || null,
      p_industry: params.industry || null,
      p_company_size: params.companySize || null,
    });

    if (error) throw new Error(`Failed to create organization: ${error.message}`);

    return {
      orgId: data.org_id,
      clientNumber: data.client_number,
      enterpriseNumber: data.enterprise_number,
      workspaceId: data.workspace_id,
      workspaceNumber: data.workspace_number,
    };
  }

  /** Get current user's organization */
  async getCurrentOrg(): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as Organization;
  }

  /** Get org dashboard view */
  async getDashboard(): Promise<OrgDashboard | null> {
    const { data, error } = await supabase
      .from('org_dashboard')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as OrgDashboard;
  }

  /** Update organization */
  async updateOrg(orgId: string, updates: Partial<Pick<Organization, 'name' | 'logo_url' | 'website' | 'billing_email' | 'technical_email'>>): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId);

    if (error) throw new Error(`Failed to update org: ${error.message}`);
  }

  // ─── Members ────────────────────────────────────────────────────

  /** List members in the org */
  async getMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch members: ${error.message}`);
    return (data || []) as OrgMember[];
  }

  /** Update member role */
  async updateMemberRole(memberId: string, role: MemberRole): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId);

    if (error) throw new Error(`Failed to update role: ${error.message}`);
  }

  /** Remove member */
  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) throw new Error(`Failed to remove member: ${error.message}`);
  }

  /** Get current user's role */
  async getMyRole(): Promise<MemberRole | null> {
    const { data, error } = await supabase.rpc('get_user_role');
    if (error || !data) return null;
    return data as MemberRole;
  }

  // ─── Invitations ────────────────────────────────────────────────

  /** Invite a user to the org */
  async inviteMember(orgId: string, email: string, role: MemberRole, message?: string): Promise<Invitation> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        org_id: orgId,
        email,
        role,
        message,
        invited_by: user?.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to invite: ${error.message}`);
    return data as Invitation;
  }

  /** List pending invitations */
  async getInvitations(orgId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch invitations: ${error.message}`);
    return (data || []) as Invitation[];
  }

  /** Revoke an invitation */
  async revokeInvitation(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) throw new Error(`Failed to revoke: ${error.message}`);
  }

  /** Accept an invitation (by token) */
  async acceptInvitation(token: string): Promise<{ orgId: string; role: string }> {
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
    if (error) throw new Error(`Failed to accept: ${error.message}`);
    if (!data.success) throw new Error(data.error || 'Failed to accept invitation');
    return { orgId: data.org_id, role: data.role };
  }

  // ─── Workspaces ─────────────────────────────────────────────────

  /** List workspaces in the org */
  async getWorkspaces(orgId: string): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('org_id', orgId)
      .order('is_default', { ascending: false });

    if (error) throw new Error(`Failed to fetch workspaces: ${error.message}`);
    return (data || []) as Workspace[];
  }

  /** Create a new workspace */
  async createWorkspace(orgId: string, name: string, environment: string = 'production'): Promise<Workspace> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ org_id: orgId, name, environment, created_by: user?.id })
      .select()
      .single();

    if (error) throw new Error(`Failed to create workspace: ${error.message}`);
    return data as Workspace;
  }

  // ─── Subscription ──────────────────────────────────────────────

  /** Get org subscription */
  async getSubscription(orgId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as Subscription;
  }

  // ─── Audit Log ──────────────────────────────────────────────────

  /** Log an action */
  async logAction(orgId: string, action: string, category: string, description?: string, metadata?: Record<string, unknown>): Promise<void> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: user?.id,
      action,
      category,
      description,
      metadata: metadata || {},
    });
  }

  /** Get audit log */
  async getAuditLog(orgId: string, limit: number = 50): Promise<Array<{
    id: string; action: string; category: string; severity: string;
    description: string | null; metadata: Record<string, unknown>;
    created_at: string; user_id: string | null;
  }>> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch audit log: ${error.message}`);
    return data || [];
  }

  // ─── Utility ────────────────────────────────────────────────────

  /** Check if user has completed onboarding */
  async hasCompletedOnboarding(): Promise<boolean> {
    const { data } = await supabase
      .from('onboarding')
      .select('completed')
      .eq('completed', true)
      .limit(1)
      .single();

    return !!data?.completed;
  }

  /** Save onboarding progress */
  async saveOnboardingProgress(orgId: string, step: number, stepsCompleted: string[], config: Record<string, unknown>): Promise<void> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const { error } = await supabase
      .from('onboarding')
      .upsert({
        org_id: orgId,
        user_id: user?.id,
        current_step: step,
        steps_completed: stepsCompleted,
        config,
      }, { onConflict: 'org_id,user_id' });

    if (error) console.error('[OrgService] Failed to save onboarding:', error);
  }

  /** Mark onboarding complete */
  async completeOnboarding(orgId: string, eulaVersion: string): Promise<void> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    await supabase
      .from('onboarding')
      .upsert({
        org_id: orgId,
        user_id: user?.id,
        completed: true,
        completed_at: new Date().toISOString(),
        eula_accepted: true,
        eula_version: eulaVersion,
        eula_accepted_at: new Date().toISOString(),
      }, { onConflict: 'org_id,user_id' });
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
