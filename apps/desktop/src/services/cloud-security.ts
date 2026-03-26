// ============================================================================
// Phase 7: Cloud Security Posture Management (CSPM)
// CrowByte Terminal — Cloud accounts, resource inventory, findings, SBOM
// ============================================================================

import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CloudProvider = "aws" | "azure" | "gcp";

export type AccountStatus =
  | "connected"
  | "disconnected"
  | "scanning"
  | "error";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "iam"
  | "storage"
  | "network"
  | "encryption"
  | "logging"
  | "compute";

export type FindingStatus =
  | "open"
  | "remediated"
  | "accepted_risk"
  | "false_positive"
  | "suppressed";

export type RemediationType = "terraform" | "cli" | "console" | "manual";

export type ComplianceFramework = "CIS" | "SOC2" | "PCI-DSS" | "HIPAA" | "NIST" | "ISO27001";

export type ExposureLevel = "internet" | "vpc" | "none";

export type SBOMFormat = "cyclonedx" | "spdx" | "syft";

export interface CloudAccount {
  id: string;
  user_id: string;
  provider: CloudProvider;
  account_name: string;
  account_id?: string;
  credentials: Record<string, unknown>;
  regions: string[];
  status: AccountStatus;
  last_scan_at?: string;
  total_resources: number;
  total_findings: number;
  critical_findings: number;
  created_at: string;
  updated_at: string;
}

export interface CloudResource {
  id: string;
  account_id: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  region?: string;
  tags: Record<string, string>;
  config: Record<string, unknown>;
  is_public: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface ReachabilityPath {
  hops: Array<{ type: string; id: string; name?: string }>;
  exposure_level: ExposureLevel;
}

export interface CloudFinding {
  id: string;
  user_id: string;
  account_id: string;
  resource_id?: string;
  title: string;
  description?: string;
  severity: FindingSeverity;
  category: FindingCategory;
  compliance_frameworks: ComplianceFramework[];
  is_reachable?: boolean;
  reachability_path?: ReachabilityPath;
  adjusted_severity?: string;
  context_score?: number;
  remediation_type?: RemediationType;
  remediation_code?: string;
  auto_remediable: boolean;
  remediated_at?: string;
  status: FindingStatus;
  finding_engine_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SBOMImport {
  id: string;
  user_id: string;
  name: string;
  format: SBOMFormat;
  components: SBOMComponent[];
  total_deps: number;
  vuln_deps: number;
  reachable_vulns: number;
  unreachable_vulns: number;
  imported_at: string;
}

export interface SBOMComponent {
  name: string;
  version: string;
  type: string; // 'npm', 'pip', 'maven', 'cargo', 'go', 'nuget'
  license?: string;
  vulnerabilities?: Array<{
    cve_id: string;
    severity: FindingSeverity;
    is_reachable: boolean;
    fix_version?: string;
  }>;
}

// ─── CSPM Rule Engine ────────────────────────────────────────────────────────

export interface CSPMRule {
  id: string;
  title: string;
  description: string;
  provider: CloudProvider | "all";
  resource_type: string;
  category: FindingCategory;
  severity: FindingSeverity;
  compliance: ComplianceFramework[];
  check: (resource: CloudResource) => CSPMCheckResult;
  remediation: {
    type: RemediationType;
    code: string;
    description: string;
  };
}

export interface CSPMCheckResult {
  passed: boolean;
  detail?: string;
  evidence?: Record<string, unknown>;
}

// Built-in CSPM rules — CIS Benchmark subset
const CSPM_RULES: CSPMRule[] = [
  // ─── S3 / Storage ─────────────────────────────────────────────────
  {
    id: "cspm-s3-public-access",
    title: "S3 Bucket Public Access Enabled",
    description: "S3 bucket allows public access via ACL or bucket policy",
    provider: "aws",
    resource_type: "s3_bucket",
    category: "storage",
    severity: "critical",
    compliance: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const aclPublic = cfg.acl === "public-read" || cfg.acl === "public-read-write";
      const policyPublic = cfg.public_access_block !== true;
      return {
        passed: !aclPublic && !policyPublic,
        detail: aclPublic
          ? `ACL is ${cfg.acl}`
          : policyPublic
            ? "Public access block not enabled"
            : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `resource "aws_s3_bucket_public_access_block" "block" {
  bucket = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
      description: "Enable S3 public access block on the bucket",
    },
  },
  {
    id: "cspm-s3-encryption",
    title: "S3 Bucket Encryption Not Enabled",
    description: "S3 bucket does not have default server-side encryption",
    provider: "aws",
    resource_type: "s3_bucket",
    category: "encryption",
    severity: "high",
    compliance: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.encryption === true || cfg.sse_algorithm !== undefined,
        detail: !cfg.encryption ? "No default encryption configured" : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `resource "aws_s3_bucket_server_side_encryption_configuration" "enc" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}`,
      description: "Enable AES-256 or KMS encryption on S3 bucket",
    },
  },
  {
    id: "cspm-s3-versioning",
    title: "S3 Bucket Versioning Disabled",
    description: "S3 bucket does not have versioning enabled for data protection",
    provider: "aws",
    resource_type: "s3_bucket",
    category: "storage",
    severity: "medium",
    compliance: ["CIS", "SOC2"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.versioning === true,
        detail: !cfg.versioning ? "Versioning not enabled" : undefined,
      };
    },
    remediation: {
      type: "cli",
      code: "aws s3api put-bucket-versioning --bucket BUCKET_NAME --versioning-configuration Status=Enabled",
      description: "Enable versioning on S3 bucket",
    },
  },

  // ─── IAM ──────────────────────────────────────────────────────────
  {
    id: "cspm-iam-root-mfa",
    title: "Root Account MFA Not Enabled",
    description: "AWS root account does not have MFA enabled",
    provider: "aws",
    resource_type: "iam_root",
    category: "iam",
    severity: "critical",
    compliance: ["CIS", "SOC2", "PCI-DSS", "NIST"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.mfa_enabled === true,
        detail: !cfg.mfa_enabled ? "Root account MFA not enabled" : undefined,
      };
    },
    remediation: {
      type: "console",
      code: "Navigate to IAM > Security Credentials > Assign MFA device",
      description: "Enable MFA on root account via AWS Console",
    },
  },
  {
    id: "cspm-iam-admin-policy",
    title: "IAM Policy with Full Admin Access",
    description: "IAM policy grants * on * (full admin) — violates least privilege",
    provider: "aws",
    resource_type: "iam_policy",
    category: "iam",
    severity: "high",
    compliance: ["CIS", "SOC2", "NIST"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const statements = (cfg.statements as Array<Record<string, unknown>>) || [];
      const hasAdmin = statements.some(
        (s) => s.effect === "Allow" && s.action === "*" && s.resource === "*"
      );
      return {
        passed: !hasAdmin,
        detail: hasAdmin ? "Policy has Action:* Resource:* with Allow" : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `# Replace wildcard policy with scoped permissions
resource "aws_iam_policy" "scoped" {
  name   = "scoped-access"
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "arn:aws:s3:::my-bucket/*"
    }]
  })
}`,
      description: "Replace wildcard admin policy with scoped IAM policy",
    },
  },
  {
    id: "cspm-iam-unused-creds",
    title: "IAM Credentials Unused >90 Days",
    description: "IAM access keys or passwords not used in over 90 days",
    provider: "aws",
    resource_type: "iam_user",
    category: "iam",
    severity: "medium",
    compliance: ["CIS", "SOC2", "NIST"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const lastUsed = cfg.last_used_at ? new Date(cfg.last_used_at as string) : null;
      const daysSince = lastUsed
        ? (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      return {
        passed: daysSince <= 90,
        detail: daysSince > 90 ? `Credentials unused for ${Math.floor(daysSince)} days` : undefined,
      };
    },
    remediation: {
      type: "cli",
      code: "aws iam delete-access-key --user-name USER --access-key-id KEY_ID",
      description: "Deactivate or remove unused IAM credentials",
    },
  },

  // ─── Network / Security Groups ────────────────────────────────────
  {
    id: "cspm-sg-open-all",
    title: "Security Group Allows 0.0.0.0/0 Ingress",
    description: "Security group has an inbound rule open to the internet on all ports",
    provider: "aws",
    resource_type: "security_group",
    category: "network",
    severity: "critical",
    compliance: ["CIS", "SOC2", "PCI-DSS", "NIST"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const rules = (cfg.ingress_rules as Array<Record<string, unknown>>) || [];
      const openAll = rules.some(
        (r) =>
          (r.cidr === "0.0.0.0/0" || r.cidr === "::/0") &&
          r.from_port === 0 &&
          r.to_port === 65535
      );
      return {
        passed: !openAll,
        detail: openAll ? "Ingress rule open to 0.0.0.0/0 on all ports" : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `# Restrict security group to specific CIDR
resource "aws_security_group_rule" "restricted" {
  type        = "ingress"
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = ["10.0.0.0/8"]
  security_group_id = aws_security_group.this.id
}`,
      description: "Replace open 0.0.0.0/0 rule with specific CIDR ranges",
    },
  },
  {
    id: "cspm-sg-ssh-open",
    title: "SSH (22) Open to Internet",
    description: "Security group allows SSH access from 0.0.0.0/0",
    provider: "aws",
    resource_type: "security_group",
    category: "network",
    severity: "high",
    compliance: ["CIS", "SOC2", "PCI-DSS"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const rules = (cfg.ingress_rules as Array<Record<string, unknown>>) || [];
      const sshOpen = rules.some(
        (r) =>
          (r.cidr === "0.0.0.0/0" || r.cidr === "::/0") &&
          ((r.from_port as number) <= 22 && (r.to_port as number) >= 22)
      );
      return {
        passed: !sshOpen,
        detail: sshOpen ? "SSH (port 22) open to 0.0.0.0/0" : undefined,
      };
    },
    remediation: {
      type: "cli",
      code: `aws ec2 revoke-security-group-ingress --group-id SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0`,
      description: "Remove SSH access from 0.0.0.0/0, use VPN or bastion",
    },
  },
  {
    id: "cspm-sg-rdp-open",
    title: "RDP (3389) Open to Internet",
    description: "Security group allows RDP access from 0.0.0.0/0",
    provider: "aws",
    resource_type: "security_group",
    category: "network",
    severity: "high",
    compliance: ["CIS", "SOC2", "PCI-DSS"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const rules = (cfg.ingress_rules as Array<Record<string, unknown>>) || [];
      const rdpOpen = rules.some(
        (r) =>
          (r.cidr === "0.0.0.0/0" || r.cidr === "::/0") &&
          ((r.from_port as number) <= 3389 && (r.to_port as number) >= 3389)
      );
      return {
        passed: !rdpOpen,
        detail: rdpOpen ? "RDP (port 3389) open to 0.0.0.0/0" : undefined,
      };
    },
    remediation: {
      type: "cli",
      code: `aws ec2 revoke-security-group-ingress --group-id SG_ID --protocol tcp --port 3389 --cidr 0.0.0.0/0`,
      description: "Remove RDP access from 0.0.0.0/0",
    },
  },

  // ─── Encryption ───────────────────────────────────────────────────
  {
    id: "cspm-ebs-unencrypted",
    title: "EBS Volume Not Encrypted",
    description: "EBS volume is not encrypted at rest",
    provider: "aws",
    resource_type: "ebs_volume",
    category: "encryption",
    severity: "high",
    compliance: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.encrypted === true,
        detail: !cfg.encrypted ? "EBS volume not encrypted" : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `resource "aws_ebs_volume" "encrypted" {
  availability_zone = "us-east-1a"
  size              = 40
  encrypted         = true
  kms_key_id        = aws_kms_key.ebs.arn
}`,
      description: "Create encrypted EBS volume with KMS key",
    },
  },
  {
    id: "cspm-rds-unencrypted",
    title: "RDS Instance Not Encrypted",
    description: "RDS database instance does not have encryption at rest",
    provider: "aws",
    resource_type: "rds_instance",
    category: "encryption",
    severity: "critical",
    compliance: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.storage_encrypted === true,
        detail: !cfg.storage_encrypted ? "RDS storage not encrypted" : undefined,
      };
    },
    remediation: {
      type: "manual",
      code: "Create encrypted snapshot, restore from snapshot, switch DNS",
      description: "RDS encryption must be enabled at creation — migrate to encrypted instance",
    },
  },

  // ─── Logging ──────────────────────────────────────────────────────
  {
    id: "cspm-cloudtrail-disabled",
    title: "CloudTrail Not Enabled",
    description: "AWS CloudTrail is not enabled for API activity logging",
    provider: "aws",
    resource_type: "cloudtrail",
    category: "logging",
    severity: "critical",
    compliance: ["CIS", "SOC2", "PCI-DSS", "NIST", "HIPAA"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.is_logging === true,
        detail: !cfg.is_logging ? "CloudTrail logging disabled" : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `resource "aws_cloudtrail" "main" {
  name                          = "main-trail"
  s3_bucket_name                = aws_s3_bucket.trail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
}`,
      description: "Enable CloudTrail with multi-region logging",
    },
  },
  {
    id: "cspm-vpc-flow-logs",
    title: "VPC Flow Logs Not Enabled",
    description: "VPC does not have flow logs enabled for network monitoring",
    provider: "aws",
    resource_type: "vpc",
    category: "logging",
    severity: "medium",
    compliance: ["CIS", "SOC2", "NIST"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: cfg.flow_logs_enabled === true,
        detail: !cfg.flow_logs_enabled ? "VPC flow logs not enabled" : undefined,
      };
    },
    remediation: {
      type: "terraform",
      code: `resource "aws_flow_log" "vpc" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  log_destination = aws_cloudwatch_log_group.flow.arn
  iam_role_arn    = aws_iam_role.flow.arn
}`,
      description: "Enable VPC flow logs to CloudWatch",
    },
  },

  // ─── Compute ──────────────────────────────────────────────────────
  {
    id: "cspm-ec2-imdsv1",
    title: "EC2 Instance Using IMDSv1",
    description: "EC2 instance metadata service v1 is enabled (SSRF risk)",
    provider: "aws",
    resource_type: "ec2_instance",
    category: "compute",
    severity: "high",
    compliance: ["CIS", "SOC2"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      const metadata = cfg.metadata_options as Record<string, unknown> | undefined;
      const imdsv2 = metadata?.http_tokens === "required";
      return {
        passed: imdsv2,
        detail: !imdsv2 ? "IMDSv1 enabled — vulnerable to SSRF credential theft" : undefined,
      };
    },
    remediation: {
      type: "cli",
      code: `aws ec2 modify-instance-metadata-options --instance-id INSTANCE_ID --http-tokens required --http-endpoint enabled`,
      description: "Enforce IMDSv2 to prevent SSRF-based credential theft",
    },
  },
  {
    id: "cspm-ec2-public-ip",
    title: "EC2 Instance Has Public IP",
    description: "EC2 instance has a public IP address assigned",
    provider: "aws",
    resource_type: "ec2_instance",
    category: "network",
    severity: "medium",
    compliance: ["CIS", "SOC2"],
    check: (resource) => {
      const cfg = resource.config as Record<string, unknown>;
      return {
        passed: !cfg.public_ip,
        detail: cfg.public_ip ? `Public IP: ${cfg.public_ip}` : undefined,
      };
    },
    remediation: {
      type: "manual",
      code: "Use NAT gateway + private subnets, remove public IP assignment",
      description: "Move instance to private subnet, use NAT for outbound",
    },
  },
];

// ─── Cloud Account CRUD ──────────────────────────────────────────────────────

export async function createCloudAccount(
  account: Omit<CloudAccount, "id" | "created_at" | "updated_at" | "total_resources" | "total_findings" | "critical_findings">
): Promise<CloudAccount> {
  const { data, error } = await supabase
    .from("cloud_accounts")
    .insert(account)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCloudAccounts(userId: string): Promise<CloudAccount[]> {
  const { data, error } = await supabase
    .from("cloud_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateCloudAccount(
  id: string,
  updates: Partial<CloudAccount>
): Promise<CloudAccount> {
  const { data, error } = await supabase
    .from("cloud_accounts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCloudAccount(id: string): Promise<void> {
  const { error } = await supabase.from("cloud_accounts").delete().eq("id", id);
  if (error) throw error;
}

// ─── Cloud Resource CRUD ─────────────────────────────────────────────────────

export async function upsertCloudResources(
  resources: Omit<CloudResource, "id" | "created_at">[]
): Promise<CloudResource[]> {
  const { data, error } = await supabase
    .from("cloud_resources")
    .upsert(
      resources.map((r) => ({ ...r, last_seen_at: new Date().toISOString() })),
      { onConflict: "account_id,resource_id" }
    )
    .select();
  if (error) throw error;
  return data || [];
}

export async function getCloudResources(
  accountId: string,
  filters?: { resource_type?: string; is_public?: boolean; region?: string }
): Promise<CloudResource[]> {
  let query = supabase
    .from("cloud_resources")
    .select("*")
    .eq("account_id", accountId);

  if (filters?.resource_type) query = query.eq("resource_type", filters.resource_type);
  if (filters?.is_public !== undefined) query = query.eq("is_public", filters.is_public);
  if (filters?.region) query = query.eq("region", filters.region);

  const { data, error } = await query.order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Cloud Findings CRUD ─────────────────────────────────────────────────────

export async function createCloudFinding(
  finding: Omit<CloudFinding, "id" | "created_at" | "updated_at">
): Promise<CloudFinding> {
  const { data, error } = await supabase
    .from("cloud_findings")
    .insert(finding)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCloudFindings(
  userId: string,
  filters?: {
    account_id?: string;
    severity?: FindingSeverity;
    category?: FindingCategory;
    status?: FindingStatus;
    is_reachable?: boolean;
  }
): Promise<CloudFinding[]> {
  let query = supabase
    .from("cloud_findings")
    .select("*")
    .eq("user_id", userId);

  if (filters?.account_id) query = query.eq("account_id", filters.account_id);
  if (filters?.severity) query = query.eq("severity", filters.severity);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.is_reachable !== undefined) query = query.eq("is_reachable", filters.is_reachable);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateCloudFinding(
  id: string,
  updates: Partial<CloudFinding>
): Promise<CloudFinding> {
  const { data, error } = await supabase
    .from("cloud_findings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function remediateCloudFinding(id: string): Promise<CloudFinding> {
  return updateCloudFinding(id, {
    status: "remediated",
    remediated_at: new Date().toISOString(),
  });
}

// ─── SBOM CRUD ───────────────────────────────────────────────────────────────

export async function importSBOM(
  sbom: Omit<SBOMImport, "id" | "imported_at">
): Promise<SBOMImport> {
  const { data, error } = await supabase
    .from("sbom_imports")
    .insert(sbom)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSBOMImports(userId: string): Promise<SBOMImport[]> {
  const { data, error } = await supabase
    .from("sbom_imports")
    .select("*")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteSBOM(id: string): Promise<void> {
  const { error } = await supabase.from("sbom_imports").delete().eq("id", id);
  if (error) throw error;
}

// ─── CSPM Scan Engine ────────────────────────────────────────────────────────

export interface ScanResult {
  total_resources: number;
  total_findings: number;
  findings_by_severity: Record<FindingSeverity, number>;
  findings_by_category: Record<FindingCategory, number>;
  compliance_gaps: Record<ComplianceFramework, number>;
  findings: Array<{
    rule: CSPMRule;
    resource: CloudResource;
    result: CSPMCheckResult;
  }>;
}

export function runCSPMScan(resources: CloudResource[]): ScanResult {
  const findings: ScanResult["findings"] = [];
  const bySeverity: Record<FindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  const byCategory: Record<FindingCategory, number> = {
    iam: 0,
    storage: 0,
    network: 0,
    encryption: 0,
    logging: 0,
    compute: 0,
  };
  const complianceGaps: Record<string, number> = {};

  for (const resource of resources) {
    const applicableRules = CSPM_RULES.filter(
      (rule) =>
        (rule.provider === "all" || rule.provider === getProviderFromResource(resource)) &&
        rule.resource_type === resource.resource_type
    );

    for (const rule of applicableRules) {
      const result = rule.check(resource);
      if (!result.passed) {
        findings.push({ rule, resource, result });
        bySeverity[rule.severity]++;
        byCategory[rule.category]++;
        for (const framework of rule.compliance) {
          complianceGaps[framework] = (complianceGaps[framework] || 0) + 1;
        }
      }
    }
  }

  return {
    total_resources: resources.length,
    total_findings: findings.length,
    findings_by_severity: bySeverity,
    findings_by_category: byCategory,
    compliance_gaps: complianceGaps as Record<ComplianceFramework, number>,
    findings,
  };
}

function getProviderFromResource(_resource: CloudResource): CloudProvider {
  // In real impl, would look up the account's provider
  return "aws";
}

// ─── Reachability Analysis ───────────────────────────────────────────────────
// The 82% fix — most "critical" cloud findings aren't reachable from internet

export function analyzeReachability(
  resource: CloudResource,
  allResources: CloudResource[]
): ReachabilityPath {
  const hops: ReachabilityPath["hops"] = [];

  // Check if resource is directly public
  if (resource.is_public) {
    return {
      hops: [{ type: "internet", id: "0.0.0.0/0", name: "Internet" }],
      exposure_level: "internet",
    };
  }

  // Check if any related security group is open
  const securityGroups = allResources.filter(
    (r) =>
      r.resource_type === "security_group" &&
      r.region === resource.region
  );

  for (const sg of securityGroups) {
    const cfg = sg.config as Record<string, unknown>;
    const rules = (cfg.ingress_rules as Array<Record<string, unknown>>) || [];
    const hasPublicRule = rules.some(
      (r) => r.cidr === "0.0.0.0/0" || r.cidr === "::/0"
    );
    if (hasPublicRule) {
      hops.push({ type: "security_group", id: sg.resource_id, name: sg.resource_name });
    }
  }

  // Check if behind load balancer
  const loadBalancers = allResources.filter(
    (r) => r.resource_type === "elb" || r.resource_type === "alb"
  );
  for (const lb of loadBalancers) {
    if (lb.is_public) {
      hops.push({ type: "load_balancer", id: lb.resource_id, name: lb.resource_name });
    }
  }

  if (hops.length > 0) {
    return { hops, exposure_level: "internet" };
  }

  // Check VPC peering / transit gateway
  const vpcPeerings = allResources.filter(
    (r) => r.resource_type === "vpc_peering"
  );
  if (vpcPeerings.length > 0) {
    return {
      hops: vpcPeerings.map((p) => ({
        type: "vpc_peering",
        id: p.resource_id,
        name: p.resource_name,
      })),
      exposure_level: "vpc",
    };
  }

  return { hops: [], exposure_level: "none" };
}

export function adjustSeverity(
  originalSeverity: FindingSeverity,
  reachability: ReachabilityPath
): { adjusted: FindingSeverity; score: number } {
  const severityWeights: Record<FindingSeverity, number> = {
    critical: 10,
    high: 8,
    medium: 5,
    low: 3,
    info: 1,
  };

  const exposureMultiplier: Record<ExposureLevel, number> = {
    internet: 1.0,
    vpc: 0.6,
    none: 0.3,
  };

  const baseScore = severityWeights[originalSeverity];
  const adjustedScore = baseScore * exposureMultiplier[reachability.exposure_level];

  let adjusted: FindingSeverity;
  if (adjustedScore >= 9) adjusted = "critical";
  else if (adjustedScore >= 7) adjusted = "high";
  else if (adjustedScore >= 4) adjusted = "medium";
  else if (adjustedScore >= 2) adjusted = "low";
  else adjusted = "info";

  return { adjusted, score: Math.round(adjustedScore * 100) / 100 };
}

// ─── SBOM Parser ─────────────────────────────────────────────────────────────

export function parseSBOM(
  content: string,
  format: SBOMFormat
): { components: SBOMComponent[]; total_deps: number } {
  try {
    const parsed = JSON.parse(content);

    if (format === "cyclonedx") {
      return parseCycloneDX(parsed);
    } else if (format === "spdx") {
      return parseSPDX(parsed);
    } else if (format === "syft") {
      return parseSyft(parsed);
    }

    return { components: [], total_deps: 0 };
  } catch {
    return { components: [], total_deps: 0 };
  }
}

function parseCycloneDX(data: Record<string, unknown>): {
  components: SBOMComponent[];
  total_deps: number;
} {
  const rawComponents = (data.components as Array<Record<string, unknown>>) || [];
  const components: SBOMComponent[] = rawComponents.map((c) => ({
    name: (c.name as string) || "unknown",
    version: (c.version as string) || "0.0.0",
    type: mapPurl(c.purl as string),
    license: extractLicense(c.licenses as unknown[]),
    vulnerabilities: [],
  }));

  // Map vulnerabilities
  const vulns = (data.vulnerabilities as Array<Record<string, unknown>>) || [];
  for (const v of vulns) {
    const affects = (v.affects as Array<Record<string, unknown>>) || [];
    for (const a of affects) {
      const ref = a.ref as string;
      const comp = components.find(
        (c) => ref?.includes(c.name) || ref?.includes(`${c.name}@${c.version}`)
      );
      if (comp) {
        comp.vulnerabilities = comp.vulnerabilities || [];
        const ratings = (v.ratings as Array<Record<string, unknown>>) || [];
        const severity = ratings[0]?.severity as string || "medium";
        comp.vulnerabilities.push({
          cve_id: (v.id as string) || "unknown",
          severity: severity as FindingSeverity,
          is_reachable: false, // Default, needs analysis
          fix_version: undefined,
        });
      }
    }
  }

  return { components, total_deps: components.length };
}

function parseSPDX(data: Record<string, unknown>): {
  components: SBOMComponent[];
  total_deps: number;
} {
  const packages = (data.packages as Array<Record<string, unknown>>) || [];
  const components: SBOMComponent[] = packages
    .filter((p) => p.name !== (data.name as string)) // Skip root package
    .map((p) => ({
      name: (p.name as string) || "unknown",
      version: (p.versionInfo as string) || "0.0.0",
      type: mapExternalRef(p.externalRefs as unknown[]),
      license: (p.licenseDeclared as string) || undefined,
      vulnerabilities: [],
    }));

  return { components, total_deps: components.length };
}

function parseSyft(data: Record<string, unknown>): {
  components: SBOMComponent[];
  total_deps: number;
} {
  const artifacts = (data.artifacts as Array<Record<string, unknown>>) || [];
  const components: SBOMComponent[] = artifacts.map((a) => ({
    name: (a.name as string) || "unknown",
    version: (a.version as string) || "0.0.0",
    type: (a.type as string) || "unknown",
    license: extractSyftLicense(a.licenses as unknown[]),
    vulnerabilities: [],
  }));

  return { components, total_deps: components.length };
}

function mapPurl(purl?: string): string {
  if (!purl) return "unknown";
  if (purl.startsWith("pkg:npm")) return "npm";
  if (purl.startsWith("pkg:pypi")) return "pip";
  if (purl.startsWith("pkg:maven")) return "maven";
  if (purl.startsWith("pkg:cargo")) return "cargo";
  if (purl.startsWith("pkg:golang")) return "go";
  if (purl.startsWith("pkg:nuget")) return "nuget";
  if (purl.startsWith("pkg:gem")) return "gem";
  return "unknown";
}

function mapExternalRef(refs?: unknown[]): string {
  if (!refs || !Array.isArray(refs)) return "unknown";
  const purl = refs.find(
    (r) => (r as Record<string, unknown>).referenceType === "purl"
  ) as Record<string, unknown> | undefined;
  return purl ? mapPurl(purl.referenceLocator as string) : "unknown";
}

function extractLicense(licenses?: unknown[]): string | undefined {
  if (!licenses || !Array.isArray(licenses)) return undefined;
  const first = licenses[0] as Record<string, unknown> | undefined;
  if (!first) return undefined;
  const lic = first.license as Record<string, unknown> | undefined;
  return (lic?.id as string) || (lic?.name as string) || undefined;
}

function extractSyftLicense(licenses?: unknown[]): string | undefined {
  if (!licenses || !Array.isArray(licenses)) return undefined;
  const first = licenses[0] as Record<string, unknown> | undefined;
  return (first?.value as string) || undefined;
}

// ─── Compliance Report Generator ─────────────────────────────────────────────

export interface ComplianceReport {
  framework: ComplianceFramework;
  total_checks: number;
  passed: number;
  failed: number;
  score: number; // percentage
  findings_by_severity: Record<FindingSeverity, number>;
  sections: Array<{
    name: string;
    passed: number;
    failed: number;
    findings: Array<{ rule_id: string; title: string; severity: FindingSeverity; status: string }>;
  }>;
}

export function generateComplianceReport(
  scanResult: ScanResult,
  framework: ComplianceFramework
): ComplianceReport {
  const relevantFindings = scanResult.findings.filter((f) =>
    f.rule.compliance.includes(framework)
  );

  const totalRules = CSPM_RULES.filter((r) => r.compliance.includes(framework)).length;
  const failedCount = relevantFindings.length;
  const passedCount = totalRules - failedCount;

  const bySeverity: Record<FindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  // Group by category for sections
  const sectionMap = new Map<string, ComplianceReport["sections"][0]>();
  for (const f of relevantFindings) {
    bySeverity[f.rule.severity]++;
    const section = sectionMap.get(f.rule.category) || {
      name: f.rule.category.toUpperCase(),
      passed: 0,
      failed: 0,
      findings: [],
    };
    section.failed++;
    section.findings.push({
      rule_id: f.rule.id,
      title: f.rule.title,
      severity: f.rule.severity,
      status: "failed",
    });
    sectionMap.set(f.rule.category, section);
  }

  // Add passed counts per category
  for (const rule of CSPM_RULES) {
    if (!rule.compliance.includes(framework)) continue;
    const section = sectionMap.get(rule.category);
    if (section) {
      const isFailed = relevantFindings.some((f) => f.rule.id === rule.id);
      if (!isFailed) section.passed++;
    }
  }

  return {
    framework,
    total_checks: totalRules,
    passed: passedCount,
    failed: failedCount,
    score: totalRules > 0 ? Math.round((passedCount / totalRules) * 100) : 100,
    findings_by_severity: bySeverity,
    sections: Array.from(sectionMap.values()),
  };
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface CloudDashboardStats {
  accounts: { total: number; connected: number; scanning: number; error: number };
  resources: { total: number; public: number; by_type: Record<string, number> };
  findings: {
    total: number;
    open: number;
    remediated: number;
    by_severity: Record<FindingSeverity, number>;
    by_category: Record<FindingCategory, number>;
    reachable: number;
    unreachable: number;
  };
  sbom: { total_imports: number; total_deps: number; vuln_deps: number };
  compliance_scores: Record<string, number>;
}

export async function getCloudDashboardStats(
  userId: string
): Promise<CloudDashboardStats> {
  const [accounts, findings, sboms] = await Promise.all([
    getCloudAccounts(userId),
    getCloudFindings(userId),
    getSBOMImports(userId),
  ]);

  const stats: CloudDashboardStats = {
    accounts: {
      total: accounts.length,
      connected: accounts.filter((a) => a.status === "connected").length,
      scanning: accounts.filter((a) => a.status === "scanning").length,
      error: accounts.filter((a) => a.status === "error").length,
    },
    resources: {
      total: accounts.reduce((sum, a) => sum + a.total_resources, 0),
      public: 0, // Would need resources query
      by_type: {},
    },
    findings: {
      total: findings.length,
      open: findings.filter((f) => f.status === "open").length,
      remediated: findings.filter((f) => f.status === "remediated").length,
      by_severity: {
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length,
        medium: findings.filter((f) => f.severity === "medium").length,
        low: findings.filter((f) => f.severity === "low").length,
        info: findings.filter((f) => f.severity === "info").length,
      },
      by_category: {
        iam: findings.filter((f) => f.category === "iam").length,
        storage: findings.filter((f) => f.category === "storage").length,
        network: findings.filter((f) => f.category === "network").length,
        encryption: findings.filter((f) => f.category === "encryption").length,
        logging: findings.filter((f) => f.category === "logging").length,
        compute: findings.filter((f) => f.category === "compute").length,
      },
      reachable: findings.filter((f) => f.is_reachable === true).length,
      unreachable: findings.filter((f) => f.is_reachable === false).length,
    },
    sbom: {
      total_imports: sboms.length,
      total_deps: sboms.reduce((sum, s) => sum + s.total_deps, 0),
      vuln_deps: sboms.reduce((sum, s) => sum + s.vuln_deps, 0),
    },
    compliance_scores: {},
  };

  return stats;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const cspmRules = CSPM_RULES;
export const ruleCount = CSPM_RULES.length;
