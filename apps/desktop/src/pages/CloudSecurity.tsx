/**
 * UilCloud Security — UilCloud Security Posture Management (CSPM)
 * Phase 7 of the Cybersecurity Gaps Integration Plan.
 * UilCloud accounts, resource inventory, findings with reachability, SBOM, compliance.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UilShield, UilShieldCheck, UilShieldExclamation, UilCloud, UilDatabase, UilLock, UilEye, UilExclamationTriangle, UilCheckCircle, UilTimesCircle, UilPlus, UilTrashAlt, UilSync, UilDownloadAlt, UilPlug, UilSitemap, UilBox, UilBug, UilWrench, UilAngleRight, UilAngleDown, UilCopy, UilBolt, UilFilter, UilGlobe, UilWifi, UilServer, UilKeySkeleton, UilScroll, UilProcessor, UilTimes, UilHardHat, UilUpload, UilFileAlt } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types (local, matching service) ──────────────────────────────────────────

type CloudProvider = "aws" | "azure" | "gcp";
type AccountStatus = "connected" | "disconnected" | "scanning" | "error";
type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
type FindingCategory = "iam" | "storage" | "network" | "encryption" | "logging" | "compute";
type FindingStatus = "open" | "remediated" | "accepted_risk" | "false_positive" | "suppressed";
type ExposureLevel = "internet" | "vpc" | "none";
type ComplianceFramework = "CIS" | "SOC2" | "PCI-DSS" | "HIPAA" | "NIST" | "ISO27001";
type SBOMFormat = "cyclonedx" | "spdx" | "syft";

interface MockAccount {
  id: string;
  provider: CloudProvider;
  account_name: string;
  account_id: string;
  status: AccountStatus;
  regions: string[];
  total_resources: number;
  total_findings: number;
  critical_findings: number;
  last_scan_at: string | null;
}

interface MockFinding {
  id: string;
  account_id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  compliance_frameworks: ComplianceFramework[];
  exposure: ExposureLevel;
  resource_arn: string;
  resource_type: string;
  status: FindingStatus;
  auto_remediable: boolean;
  remediation_type: "terraform" | "cli" | "console" | "manual";
  remediation_code: string;
  created_at: string;
}

interface MockSBOM {
  id: string;
  name: string;
  format: SBOMFormat;
  total_deps: number;
  vuln_deps: number;
  reachable_vulns: number;
  imported_at: string;
  components: SBOMComponent[];
}

interface SBOMComponent {
  name: string;
  version: string;
  type: string;
  license: string;
  vulnerabilities: Array<{
    cve_id: string;
    severity: FindingSeverity;
    is_reachable: boolean;
    fix_version?: string;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-blue-500/20 text-blue-400",
  info: "bg-zinc-500/20 text-zinc-400",
};

const SEVERITY_DOT: Record<FindingSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  info: "bg-zinc-500",
};

const STATUS_COLORS: Record<FindingStatus, string> = {
  open: "bg-red-500/20 text-red-400",
  remediated: "bg-emerald-500/20 text-emerald-400",
  accepted_risk: "bg-yellow-500/20 text-yellow-400",
  false_positive: "bg-zinc-500/20 text-zinc-400",
  suppressed: "bg-purple-500/20 text-purple-400",
};

const STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  remediated: "Remediated",
  accepted_risk: "Accepted Risk",
  false_positive: "False Positive",
  suppressed: "Suppressed",
};

const PROVIDER_COLORS: Record<CloudProvider, { bg: string; text: string; label: string }> = {
  aws: { bg: "bg-orange-500/20", text: "text-orange-400", label: "AWS" },
  azure: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Azure" },
  gcp: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "GCP" },
};

const CATEGORY_ICONS: Record<FindingCategory, typeof UilShield> = {
  iam: UilKeySkeleton,
  storage: UilDatabase,
  network: UilGlobe,
  encryption: UilLock,
  logging: UilScroll,
  compute: UilProcessor,
};

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  iam: "IAM",
  storage: "Storage",
  network: "Network",
  encryption: "Encryption",
  logging: "Logging",
  compute: "Compute",
};

const EXPOSURE_CONFIG: Record<ExposureLevel, { color: string; icon: typeof UilGlobe; label: string }> = {
  internet: { color: "text-red-400", icon: UilGlobe, label: "Internet-Exposed" },
  vpc: { color: "text-yellow-400", icon: UilWifi, label: "VPC-Only" },
  none: { color: "text-emerald-400", icon: UilShieldCheck, label: "Not Reachable" },
};

const FRAMEWORK_LABELS: ComplianceFramework[] = ["CIS", "SOC2", "PCI-DSS", "HIPAA", "NIST", "ISO27001"];

const FORMAT_COLORS: Record<SBOMFormat, string> = {
  cyclonedx: "bg-cyan-500/20 text-cyan-400",
  spdx: "bg-purple-500/20 text-purple-400",
  syft: "bg-amber-500/20 text-amber-400",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: "acc-1",
    provider: "aws",
    account_name: "Production (AWS)",
    account_id: "491738204617",
    status: "connected",
    regions: ["us-east-1", "us-west-2", "eu-west-1"],
    total_resources: 187,
    total_findings: 14,
    critical_findings: 3,
    last_scan_at: "2026-03-26T08:14:00Z",
  },
  {
    id: "acc-2",
    provider: "azure",
    account_name: "Staging (Azure)",
    account_id: "a3f29bc1-7d4e-4a68-b5c3-92e10df84a27",
    status: "connected",
    regions: ["eastus", "westeurope"],
    total_resources: 64,
    total_findings: 8,
    critical_findings: 1,
    last_scan_at: "2026-03-25T22:30:00Z",
  },
  {
    id: "acc-3",
    provider: "gcp",
    account_name: "Dev (GCP)",
    account_id: "crowbyte-dev-384912",
    status: "disconnected",
    regions: ["us-central1"],
    total_resources: 23,
    total_findings: 0,
    critical_findings: 0,
    last_scan_at: null,
  },
];

const MOCK_FINDINGS: MockFinding[] = [
  {
    id: "f-1", account_id: "acc-1",
    title: "S3 Bucket Public Access Enabled",
    description: "S3 bucket 'prod-user-uploads' allows public access via ACL. Public-read ACL is set, exposing all objects to the internet.",
    severity: "critical", category: "storage",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    exposure: "internet",
    resource_arn: "arn:aws:s3:::prod-user-uploads",
    resource_type: "s3_bucket", status: "open", auto_remediable: true,
    remediation_type: "terraform",
    remediation_code: `resource "aws_s3_bucket_public_access_block" "block" {\n  bucket = aws_s3_bucket.prod_user_uploads.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}`,
    created_at: "2026-03-26T08:14:22Z",
  },
  {
    id: "f-2", account_id: "acc-1",
    title: "Root Account MFA Not Enabled",
    description: "AWS root account does not have MFA enabled. Compromised root credentials would grant full account access.",
    severity: "critical", category: "iam",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "NIST"],
    exposure: "internet",
    resource_arn: "arn:aws:iam::491738204617:root",
    resource_type: "iam_root", status: "open", auto_remediable: false,
    remediation_type: "console",
    remediation_code: "Navigate to IAM > Security Credentials > Assign MFA device",
    created_at: "2026-03-26T08:14:22Z",
  },
  {
    id: "f-3", account_id: "acc-1",
    title: "Security Group Allows 0.0.0.0/0 Ingress",
    description: "Security group 'sg-0a1b2c3d4e5f' has an inbound rule open to the internet on all ports (0-65535).",
    severity: "critical", category: "network",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "NIST"],
    exposure: "internet",
    resource_arn: "arn:aws:ec2:us-east-1:491738204617:security-group/sg-0a1b2c3d4e5f",
    resource_type: "security_group", status: "open", auto_remediable: true,
    remediation_type: "terraform",
    remediation_code: `resource "aws_security_group_rule" "restricted" {\n  type        = "ingress"\n  from_port   = 443\n  to_port     = 443\n  protocol    = "tcp"\n  cidr_blocks = ["10.0.0.0/8"]\n  security_group_id = aws_security_group.this.id\n}`,
    created_at: "2026-03-26T08:14:23Z",
  },
  {
    id: "f-4", account_id: "acc-1",
    title: "RDS Instance Not Encrypted",
    description: "RDS instance 'prod-db-primary' does not have encryption at rest enabled. Data at rest is unprotected.",
    severity: "critical", category: "encryption",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    exposure: "vpc",
    resource_arn: "arn:aws:rds:us-east-1:491738204617:db:prod-db-primary",
    resource_type: "rds_instance", status: "open", auto_remediable: false,
    remediation_type: "manual",
    remediation_code: "Create encrypted snapshot, restore from snapshot, switch DNS endpoint",
    created_at: "2026-03-26T08:14:23Z",
  },
  {
    id: "f-5", account_id: "acc-1",
    title: "S3 Bucket Encryption Not Enabled",
    description: "S3 bucket 'prod-logs-archive' does not have default server-side encryption configured.",
    severity: "high", category: "encryption",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    exposure: "none",
    resource_arn: "arn:aws:s3:::prod-logs-archive",
    resource_type: "s3_bucket", status: "open", auto_remediable: true,
    remediation_type: "terraform",
    remediation_code: `resource "aws_s3_bucket_server_side_encryption_configuration" "enc" {\n  bucket = aws_s3_bucket.prod_logs_archive.id\n  rule {\n    apply_server_side_encryption_by_default {\n      sse_algorithm = "aws:kms"\n    }\n  }\n}`,
    created_at: "2026-03-26T08:14:24Z",
  },
  {
    id: "f-6", account_id: "acc-1",
    title: "SSH (22) Open to Internet",
    description: "Security group 'sg-09f8e7d6c5b4' allows SSH access from 0.0.0.0/0.",
    severity: "high", category: "network",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS"],
    exposure: "internet",
    resource_arn: "arn:aws:ec2:us-east-1:491738204617:security-group/sg-09f8e7d6c5b4",
    resource_type: "security_group", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "aws ec2 revoke-security-group-ingress --group-id sg-09f8e7d6c5b4 --protocol tcp --port 22 --cidr 0.0.0.0/0",
    created_at: "2026-03-26T08:14:24Z",
  },
  {
    id: "f-7", account_id: "acc-1",
    title: "EC2 Instance Using IMDSv1",
    description: "EC2 instance 'i-0abc123def456' uses IMDSv1 which is vulnerable to SSRF credential theft.",
    severity: "high", category: "compute",
    compliance_frameworks: ["CIS", "SOC2"],
    exposure: "internet",
    resource_arn: "arn:aws:ec2:us-east-1:491738204617:instance/i-0abc123def456",
    resource_type: "ec2_instance", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "aws ec2 modify-instance-metadata-options --instance-id i-0abc123def456 --http-tokens required --http-endpoint enabled",
    created_at: "2026-03-26T08:14:25Z",
  },
  {
    id: "f-8", account_id: "acc-1",
    title: "IAM Policy with Full Admin Access",
    description: "IAM policy 'arn:aws:iam::491738204617:policy/LegacyAdmin' grants Action:* Resource:* with Allow.",
    severity: "high", category: "iam",
    compliance_frameworks: ["CIS", "SOC2", "NIST"],
    exposure: "none",
    resource_arn: "arn:aws:iam::491738204617:policy/LegacyAdmin",
    resource_type: "iam_policy", status: "open", auto_remediable: false,
    remediation_type: "terraform",
    remediation_code: `# Replace wildcard policy with scoped permissions\nresource "aws_iam_policy" "scoped" {\n  name   = "scoped-access"\n  policy = jsonencode({\n    Statement = [{\n      Effect   = "Allow"\n      Action   = ["s3:GetObject", "s3:PutObject"]\n      Resource = "arn:aws:s3:::my-bucket/*"\n    }]\n  })\n}`,
    created_at: "2026-03-26T08:14:25Z",
  },
  {
    id: "f-9", account_id: "acc-1",
    title: "CloudTrail Not Enabled",
    description: "AWS CloudTrail is not enabled for API activity logging in us-west-2 region.",
    severity: "critical", category: "logging",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "NIST", "HIPAA"],
    exposure: "none",
    resource_arn: "arn:aws:cloudtrail:us-west-2:491738204617:trail/none",
    resource_type: "cloudtrail", status: "open", auto_remediable: true,
    remediation_type: "terraform",
    remediation_code: `resource "aws_cloudtrail" "main" {\n  name                          = "main-trail"\n  s3_bucket_name                = aws_s3_bucket.trail.id\n  include_global_service_events = true\n  is_multi_region_trail         = true\n  enable_logging                = true\n}`,
    created_at: "2026-03-26T08:14:26Z",
  },
  {
    id: "f-10", account_id: "acc-1",
    title: "EBS Volume Not Encrypted",
    description: "EBS volume 'vol-0123456789abcdef0' is not encrypted at rest.",
    severity: "high", category: "encryption",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    exposure: "none",
    resource_arn: "arn:aws:ec2:us-east-1:491738204617:volume/vol-0123456789abcdef0",
    resource_type: "ebs_volume", status: "remediated", auto_remediable: true,
    remediation_type: "terraform",
    remediation_code: `resource "aws_ebs_volume" "encrypted" {\n  availability_zone = "us-east-1a"\n  size              = 40\n  encrypted         = true\n  kms_key_id        = aws_kms_key.ebs.arn\n}`,
    created_at: "2026-03-25T14:20:00Z",
  },
  {
    id: "f-11", account_id: "acc-1",
    title: "S3 Bucket Versioning Disabled",
    description: "S3 bucket 'prod-config-backups' does not have versioning enabled for data protection.",
    severity: "medium", category: "storage",
    compliance_frameworks: ["CIS", "SOC2"],
    exposure: "none",
    resource_arn: "arn:aws:s3:::prod-config-backups",
    resource_type: "s3_bucket", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "aws s3api put-bucket-versioning --bucket prod-config-backups --versioning-configuration Status=Enabled",
    created_at: "2026-03-26T08:14:26Z",
  },
  {
    id: "f-12", account_id: "acc-1",
    title: "IAM Credentials Unused >90 Days",
    description: "IAM user 'svc-legacy-deploy' has access keys not used in over 142 days.",
    severity: "medium", category: "iam",
    compliance_frameworks: ["CIS", "SOC2", "NIST"],
    exposure: "none",
    resource_arn: "arn:aws:iam::491738204617:user/svc-legacy-deploy",
    resource_type: "iam_user", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "aws iam delete-access-key --user-name svc-legacy-deploy --access-key-id AKIA3EXAMPLE1234",
    created_at: "2026-03-26T08:14:27Z",
  },
  {
    id: "f-13", account_id: "acc-1",
    title: "VPC Flow Logs Not Enabled",
    description: "VPC 'vpc-0abcdef1234567890' does not have flow logs enabled for network monitoring.",
    severity: "medium", category: "logging",
    compliance_frameworks: ["CIS", "SOC2", "NIST"],
    exposure: "none",
    resource_arn: "arn:aws:ec2:us-east-1:491738204617:vpc/vpc-0abcdef1234567890",
    resource_type: "vpc", status: "open", auto_remediable: true,
    remediation_type: "terraform",
    remediation_code: `resource "aws_flow_log" "vpc" {\n  vpc_id          = aws_vpc.main.id\n  traffic_type    = "ALL"\n  log_destination = aws_cloudwatch_log_group.flow.arn\n  iam_role_arn    = aws_iam_role.flow.arn\n}`,
    created_at: "2026-03-26T08:14:27Z",
  },
  {
    id: "f-14", account_id: "acc-1",
    title: "EC2 Instance Has Public IP",
    description: "EC2 instance 'i-0def456abc789' has a public IP address (54.82.193.47) assigned directly.",
    severity: "medium", category: "network",
    compliance_frameworks: ["CIS", "SOC2"],
    exposure: "internet",
    resource_arn: "arn:aws:ec2:us-east-1:491738204617:instance/i-0def456abc789",
    resource_type: "ec2_instance", status: "accepted_risk", auto_remediable: false,
    remediation_type: "manual",
    remediation_code: "Use NAT gateway + private subnets, remove public IP assignment",
    created_at: "2026-03-26T08:14:28Z",
  },
  {
    id: "f-15", account_id: "acc-2",
    title: "Azure Storage Account Public Access",
    description: "Storage account 'stagingblobstore01' allows public blob access.",
    severity: "high", category: "storage",
    compliance_frameworks: ["CIS", "SOC2"],
    exposure: "internet",
    resource_arn: "/subscriptions/a3f29bc1/resourceGroups/rg-staging/providers/Microsoft.Storage/storageAccounts/stagingblobstore01",
    resource_type: "storage_account", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "az storage account update --name stagingblobstore01 --resource-group rg-staging --allow-blob-public-access false",
    created_at: "2026-03-25T22:31:00Z",
  },
  {
    id: "f-16", account_id: "acc-2",
    title: "Azure NSG Allows RDP from Internet",
    description: "Network Security Group 'nsg-staging-vms' allows RDP (3389) from Any source.",
    severity: "high", category: "network",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS"],
    exposure: "internet",
    resource_arn: "/subscriptions/a3f29bc1/resourceGroups/rg-staging/providers/Microsoft.Network/networkSecurityGroups/nsg-staging-vms",
    resource_type: "nsg", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "az network nsg rule update --nsg-name nsg-staging-vms -g rg-staging -n AllowRDP --access Deny",
    created_at: "2026-03-25T22:31:01Z",
  },
  {
    id: "f-17", account_id: "acc-2",
    title: "Azure SQL Database TDE Disabled",
    description: "SQL UilDatabase 'staging-appdb' does not have Transparent Data Encryption enabled.",
    severity: "critical", category: "encryption",
    compliance_frameworks: ["CIS", "SOC2", "PCI-DSS", "HIPAA"],
    exposure: "vpc",
    resource_arn: "/subscriptions/a3f29bc1/resourceGroups/rg-staging/providers/Microsoft.Sql/servers/staging-sql01/databases/staging-appdb",
    resource_type: "sql_database", status: "open", auto_remediable: true,
    remediation_type: "cli",
    remediation_code: "az sql db tde set --database staging-appdb --server staging-sql01 --resource-group rg-staging --status Enabled",
    created_at: "2026-03-25T22:31:02Z",
  },
];

const MOCK_SBOMS: MockSBOM[] = [
  {
    id: "sbom-1",
    name: "crowbyte-api (backend)",
    format: "cyclonedx",
    total_deps: 67,
    vuln_deps: 8,
    reachable_vulns: 3,
    imported_at: "2026-03-25T10:00:00Z",
    components: [
      { name: "express", version: "4.18.2", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "lodash", version: "4.17.20", type: "npm", license: "MIT", vulnerabilities: [
        { cve_id: "CVE-2021-23337", severity: "high", is_reachable: true, fix_version: "4.17.21" },
      ]},
      { name: "jsonwebtoken", version: "9.0.0", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "axios", version: "0.21.1", type: "npm", license: "MIT", vulnerabilities: [
        { cve_id: "CVE-2023-45857", severity: "medium", is_reachable: false, fix_version: "1.6.0" },
      ]},
      { name: "pg", version: "8.11.3", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "helmet", version: "7.1.0", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "cors", version: "2.8.5", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "dotenv", version: "16.3.1", type: "npm", license: "BSD-2-Clause", vulnerabilities: [] },
      { name: "bcrypt", version: "5.1.0", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "node-fetch", version: "2.6.7", type: "npm", license: "MIT", vulnerabilities: [
        { cve_id: "CVE-2022-0235", severity: "high", is_reachable: true, fix_version: "2.6.8" },
      ]},
      { name: "xml2js", version: "0.4.23", type: "npm", license: "MIT", vulnerabilities: [
        { cve_id: "CVE-2023-0842", severity: "critical", is_reachable: true, fix_version: "0.5.0" },
      ]},
      { name: "multer", version: "1.4.5", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "uuid", version: "9.0.0", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "moment", version: "2.29.4", type: "npm", license: "MIT", vulnerabilities: [
        { cve_id: "CVE-2022-31129", severity: "medium", is_reachable: false, fix_version: "2.29.4" },
      ]},
      { name: "winston", version: "3.11.0", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "redis", version: "4.6.10", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "zod", version: "3.22.4", type: "npm", license: "MIT", vulnerabilities: [] },
      { name: "semver", version: "7.3.7", type: "npm", license: "ISC", vulnerabilities: [
        { cve_id: "CVE-2022-25883", severity: "high", is_reachable: false, fix_version: "7.5.2" },
      ]},
      { name: "tar", version: "6.1.11", type: "npm", license: "ISC", vulnerabilities: [
        { cve_id: "CVE-2024-28863", severity: "medium", is_reachable: false, fix_version: "6.2.1" },
      ]},
      { name: "cookie-parser", version: "1.4.6", type: "npm", license: "MIT", vulnerabilities: [] },
    ],
  },
  {
    id: "sbom-2",
    name: "crowbyte-scanner (python)",
    format: "spdx",
    total_deps: 54,
    vuln_deps: 5,
    reachable_vulns: 2,
    imported_at: "2026-03-24T16:30:00Z",
    components: [
      { name: "requests", version: "2.28.1", type: "pip", license: "Apache-2.0", vulnerabilities: [
        { cve_id: "CVE-2023-32681", severity: "medium", is_reachable: true, fix_version: "2.31.0" },
      ]},
      { name: "flask", version: "2.3.3", type: "pip", license: "BSD-3-Clause", vulnerabilities: [] },
      { name: "cryptography", version: "41.0.3", type: "pip", license: "Apache-2.0", vulnerabilities: [
        { cve_id: "CVE-2024-26130", severity: "high", is_reachable: false, fix_version: "42.0.4" },
      ]},
      { name: "pyyaml", version: "6.0.1", type: "pip", license: "MIT", vulnerabilities: [] },
      { name: "sqlalchemy", version: "2.0.21", type: "pip", license: "MIT", vulnerabilities: [] },
      { name: "celery", version: "5.3.4", type: "pip", license: "BSD-3-Clause", vulnerabilities: [] },
      { name: "paramiko", version: "3.3.1", type: "pip", license: "LGPL-2.1", vulnerabilities: [] },
      { name: "beautifulsoup4", version: "4.12.2", type: "pip", license: "MIT", vulnerabilities: [] },
      { name: "pillow", version: "10.0.0", type: "pip", license: "HPND", vulnerabilities: [
        { cve_id: "CVE-2023-44271", severity: "high", is_reachable: true, fix_version: "10.0.1" },
      ]},
      { name: "jinja2", version: "3.1.2", type: "pip", license: "BSD-3-Clause", vulnerabilities: [
        { cve_id: "CVE-2024-22195", severity: "medium", is_reachable: false, fix_version: "3.1.3" },
      ]},
      { name: "numpy", version: "1.26.0", type: "pip", license: "BSD-3-Clause", vulnerabilities: [] },
      { name: "boto3", version: "1.28.62", type: "pip", license: "Apache-2.0", vulnerabilities: [] },
      { name: "urllib3", version: "2.0.4", type: "pip", license: "MIT", vulnerabilities: [
        { cve_id: "CVE-2023-45803", severity: "medium", is_reachable: false, fix_version: "2.0.7" },
      ]},
      { name: "click", version: "8.1.7", type: "pip", license: "BSD-3-Clause", vulnerabilities: [] },
      { name: "rich", version: "13.5.3", type: "pip", license: "MIT", vulnerabilities: [] },
    ],
  },
];

// ─── Compliance Mock Data ─────────────────────────────────────────────────────

const COMPLIANCE_DATA: Record<ComplianceFramework, {
  score: number;
  sections: Array<{
    name: string;
    passed: number;
    failed: number;
    checks: Array<{ title: string; severity: FindingSeverity; passed: boolean }>;
  }>;
}> = {
  CIS: {
    score: 72,
    sections: [
      { name: "1. Identity and Access Management", passed: 5, failed: 3, checks: [
        { title: "1.1 Maintain current contact details", severity: "medium", passed: true },
        { title: "1.4 Ensure no root access keys exist", severity: "critical", passed: true },
        { title: "1.5 Ensure MFA is enabled for root", severity: "critical", passed: false },
        { title: "1.10 Ensure multi-factor auth for IAM users", severity: "high", passed: true },
        { title: "1.12 Ensure credentials unused 45+ days disabled", severity: "medium", passed: false },
        { title: "1.16 Ensure IAM policies attached only to groups", severity: "medium", passed: true },
        { title: "1.17 Ensure no inline policies", severity: "high", passed: false },
        { title: "1.22 Ensure no full admin IAM policies", severity: "high", passed: true },
      ]},
      { name: "2. Storage", passed: 4, failed: 3, checks: [
        { title: "2.1.1 Ensure S3 Bucket Policy denies HTTP", severity: "high", passed: true },
        { title: "2.1.2 Ensure MFA Delete is enabled", severity: "high", passed: false },
        { title: "2.1.4 Ensure S3 buckets encrypted at rest", severity: "high", passed: false },
        { title: "2.1.5 Ensure S3 deny public access", severity: "critical", passed: false },
        { title: "2.2.1 Ensure EBS encryption by default", severity: "high", passed: true },
        { title: "2.3.1 Ensure RDS encryption at rest", severity: "critical", passed: true },
        { title: "2.3.3 Ensure auto minor version upgrade", severity: "medium", passed: true },
      ]},
      { name: "3. Logging", passed: 3, failed: 2, checks: [
        { title: "3.1 Ensure CloudTrail enabled all regions", severity: "critical", passed: false },
        { title: "3.2 Ensure CloudTrail log validation", severity: "medium", passed: true },
        { title: "3.4 Ensure CloudTrail integrated with CloudWatch", severity: "medium", passed: true },
        { title: "3.7 Ensure VPC flow logging enabled", severity: "medium", passed: false },
        { title: "3.9 Ensure Config is enabled all regions", severity: "medium", passed: true },
      ]},
      { name: "4. Networking", passed: 4, failed: 3, checks: [
        { title: "4.1 Ensure no SG allows 0.0.0.0/0 to port 22", severity: "high", passed: false },
        { title: "4.2 Ensure no SG allows 0.0.0.0/0 to port 3389", severity: "high", passed: true },
        { title: "4.3 Ensure default SG restricts all traffic", severity: "medium", passed: false },
        { title: "4.4 Ensure routing tables for VPC peering least access", severity: "medium", passed: true },
        { title: "5.1 Ensure no Network ACLs allow 0.0.0.0/0 ingress", severity: "high", passed: false },
        { title: "5.2 Ensure VPC default SG restricts all", severity: "medium", passed: true },
        { title: "5.4 Ensure EC2 IMDSv2 is required", severity: "high", passed: true },
      ]},
    ],
  },
  SOC2: {
    score: 68,
    sections: [
      { name: "CC6 - Logical and Physical Access", passed: 4, failed: 4, checks: [
        { title: "CC6.1 Logical access security", severity: "high", passed: false },
        { title: "CC6.2 Prior to registering and authorizing", severity: "medium", passed: true },
        { title: "CC6.3 Role-based access", severity: "high", passed: false },
        { title: "CC6.6 Restriction of access", severity: "critical", passed: false },
        { title: "CC6.7 Transmission of data", severity: "high", passed: true },
        { title: "CC6.8 Prevent unauthorized software", severity: "medium", passed: true },
        { title: "CC7.1 Detection and monitoring", severity: "high", passed: false },
        { title: "CC7.2 Activity monitoring", severity: "high", passed: true },
      ]},
      { name: "CC7 - System Operations", passed: 3, failed: 2, checks: [
        { title: "CC7.3 Evaluate identified events", severity: "high", passed: true },
        { title: "CC7.4 Respond to identified events", severity: "high", passed: false },
        { title: "CC7.5 Identify and assess", severity: "medium", passed: true },
        { title: "CC8.1 Change management", severity: "medium", passed: true },
        { title: "A1.2 Environmental protections", severity: "high", passed: false },
      ]},
    ],
  },
  "PCI-DSS": {
    score: 81,
    sections: [
      { name: "Req 1 - Network Security Controls", passed: 5, failed: 2, checks: [
        { title: "1.2.1 Restrict inbound/outbound traffic", severity: "high", passed: false },
        { title: "1.3.1 Restrict inbound to CDE", severity: "critical", passed: true },
        { title: "1.3.2 Restrict outbound from CDE", severity: "high", passed: true },
        { title: "1.4.1 NSC between trusted and untrusted", severity: "high", passed: false },
        { title: "2.2.1 Vendor default accounts changed", severity: "high", passed: true },
        { title: "2.2.7 All non-console admin encrypted", severity: "medium", passed: true },
        { title: "3.5.1 PAN rendered unreadable", severity: "critical", passed: true },
      ]},
      { name: "Req 3 - Protect Stored Account Data", passed: 4, failed: 1, checks: [
        { title: "3.5.1.2 Disk-level encryption", severity: "critical", passed: false },
        { title: "3.6.1 Key management procedures", severity: "high", passed: true },
        { title: "4.2.1 Strong cryptography", severity: "high", passed: true },
        { title: "6.2.4 Software engineering techniques", severity: "medium", passed: true },
        { title: "8.3.1 User authentication to systems", severity: "high", passed: true },
      ]},
    ],
  },
  HIPAA: {
    score: 74,
    sections: [
      { name: "Administrative Safeguards", passed: 6, failed: 3, checks: [
        { title: "164.308(a)(1) Security Management", severity: "high", passed: true },
        { title: "164.308(a)(3) Workforce Security", severity: "high", passed: false },
        { title: "164.308(a)(4) Information Access", severity: "critical", passed: true },
        { title: "164.308(a)(5) Security Awareness", severity: "medium", passed: true },
        { title: "164.312(a)(1) Access Control", severity: "critical", passed: false },
        { title: "164.312(a)(2) Encryption at rest", severity: "critical", passed: false },
        { title: "164.312(b) Audit Controls", severity: "high", passed: true },
        { title: "164.312(c)(1) Integrity Controls", severity: "high", passed: true },
        { title: "164.312(e)(1) Transmission Security", severity: "high", passed: true },
      ]},
    ],
  },
  NIST: {
    score: 70,
    sections: [
      { name: "Identify (ID)", passed: 3, failed: 1, checks: [
        { title: "ID.AM-1 Physical devices inventoried", severity: "medium", passed: true },
        { title: "ID.AM-2 Software platforms inventoried", severity: "medium", passed: true },
        { title: "ID.AM-5 Resources prioritized", severity: "medium", passed: true },
        { title: "ID.RA-1 Vulnerabilities identified", severity: "high", passed: false },
      ]},
      { name: "Protect (PR)", passed: 4, failed: 3, checks: [
        { title: "PR.AC-1 Identities and credentials managed", severity: "high", passed: false },
        { title: "PR.AC-3 Remote access managed", severity: "high", passed: false },
        { title: "PR.AC-4 Access permissions managed", severity: "high", passed: true },
        { title: "PR.DS-1 Data-at-rest protected", severity: "critical", passed: false },
        { title: "PR.DS-2 Data-in-transit protected", severity: "high", passed: true },
        { title: "PR.IP-1 Config baselines", severity: "medium", passed: true },
        { title: "PR.PT-1 Audit/log records", severity: "high", passed: true },
      ]},
    ],
  },
  ISO27001: {
    score: 76,
    sections: [
      { name: "A.5 - Information Security Policies", passed: 5, failed: 2, checks: [
        { title: "A.5.1 Policies for information security", severity: "medium", passed: true },
        { title: "A.8.1 Responsibility for assets", severity: "medium", passed: true },
        { title: "A.9.1.2 Access to networks and services", severity: "high", passed: false },
        { title: "A.9.2.3 Management of privileged access", severity: "critical", passed: true },
        { title: "A.10.1.1 Policy on cryptographic controls", severity: "high", passed: false },
        { title: "A.12.4.1 Event logging", severity: "high", passed: true },
        { title: "A.13.1.1 Network controls", severity: "high", passed: true },
      ]},
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-yellow-500";
  return "stroke-red-500";
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.2 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreDonut({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
          strokeWidth={8} className="text-zinc-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className={scoreRingColor(score)} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}%</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-zinc-400" }: {
  label: string; value: string | number; icon: typeof UilShield; color?: string;
}) {
  return (
    <motion.div {...fadeIn}>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-zinc-800/80 ${color}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-lg font-semibold text-zinc-100">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SeverityBar({ label, count, max, color }: {
  label: string; count: number; max: number; color: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-16 text-right capitalize">{label}</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
      </div>
      <span className="text-xs text-zinc-300 w-8">{count}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CloudSecurity() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Accounts
  const [accounts] = useState<MockAccount[]>(MOCK_ACCOUNTS);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [newProvider, setNewProvider] = useState<CloudProvider>("aws");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountId, setNewAccountId] = useState("");

  // Findings
  const [findings, setFindings] = useState<MockFinding[]>(MOCK_FINDINGS);
  const [findingSevFilter, setFindingSevFilter] = useState<FindingSeverity | "all">("all");
  const [findingCatFilter, setFindingCatFilter] = useState<FindingCategory | "all">("all");
  const [findingStatusFilter, setFindingStatusFilter] = useState<FindingStatus | "all">("all");
  const [findingExpFilter, setFindingExpFilter] = useState<ExposureLevel | "all">("all");
  const [findingFrameworkFilter, setFindingFrameworkFilter] = useState<ComplianceFramework | "all">("all");
  const [findingSearch, setFindingSearch] = useState("");
  const [selectedFinding, setSelectedFinding] = useState<MockFinding | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());

  // SBOM
  const [sboms] = useState<MockSBOM[]>(MOCK_SBOMS);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [sbomName, setSbomName] = useState("");
  const [sbomFormat, setSbomFormat] = useState<SBOMFormat>("cyclonedx");
  const [sbomContent, setSbomContent] = useState("");
  const [selectedSBOM, setSelectedSBOM] = useState<MockSBOM | null>(null);

  // Compliance
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>("CIS");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ─── Computed ─────────────────────────────────────────────────────────────

  const openFindings = findings.filter(f => f.status === "open");
  const criticalCount = openFindings.filter(f => f.severity === "critical").length;
  const totalResources = accounts.reduce((s, a) => s + a.total_resources, 0);

  const sevCounts: Record<FindingSeverity, number> = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    openFindings.forEach(f => c[f.severity]++);
    return c;
  }, [openFindings]);

  const catCounts: Record<FindingCategory, number> = useMemo(() => {
    const c = { iam: 0, storage: 0, network: 0, encryption: 0, logging: 0, compute: 0 };
    openFindings.forEach(f => c[f.category]++);
    return c;
  }, [openFindings]);

  const exposureCounts = useMemo(() => {
    const c = { internet: 0, vpc: 0, none: 0 };
    openFindings.forEach(f => c[f.exposure]++);
    return c;
  }, [openFindings]);

  const maxSev = Math.max(...Object.values(sevCounts), 1);

  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      if (findingSevFilter !== "all" && f.severity !== findingSevFilter) return false;
      if (findingCatFilter !== "all" && f.category !== findingCatFilter) return false;
      if (findingStatusFilter !== "all" && f.status !== findingStatusFilter) return false;
      if (findingExpFilter !== "all" && f.exposure !== findingExpFilter) return false;
      if (findingFrameworkFilter !== "all" && !f.compliance_frameworks.includes(findingFrameworkFilter)) return false;
      if (findingSearch && !f.title.toLowerCase().includes(findingSearch.toLowerCase())
        && !f.resource_arn.toLowerCase().includes(findingSearch.toLowerCase())) return false;
      return true;
    });
  }, [findings, findingSevFilter, findingCatFilter, findingStatusFilter, findingExpFilter, findingFrameworkFilter, findingSearch]);

  const securityScore = useMemo(() => {
    const total = findings.length;
    const rem = findings.filter(f => f.status === "remediated").length;
    const accepted = findings.filter(f => f.status === "accepted_risk").length;
    if (total === 0) return 100;
    return Math.round(((rem + accepted * 0.5) / total) * 100);
  }, [findings]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRemediate = (id: string) => {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: "remediated" as FindingStatus } : f));
    toast({ title: "Finding remediated", description: "Status updated to remediated." });
    setSelectedFinding(null);
  };

  const handleBulkAction = (action: FindingStatus) => {
    if (selectedFindings.size === 0) return;
    setFindings(prev => prev.map(f => selectedFindings.has(f.id) ? { ...f, status: action } : f));
    toast({ title: `${selectedFindings.size} findings updated`, description: `Status set to ${STATUS_LABELS[action]}.` });
    setSelectedFindings(new Set());
  };

  const toggleSection = (name: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  const toggleFindingSelect = (id: string) => {
    setSelectedFindings(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ─── Tab: Dashboard ───────────────────────────────────────────────────────

  const renderDashboard = () => (
    <motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <div className="grid grid-cols-12 gap-4">
        <motion.div className="col-span-3" {...fadeIn}>
          <Card className="bg-zinc-900/50 border-zinc-800 h-full">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <ScoreDonut score={securityScore} size={140} />
              <p className="text-xs text-zinc-500 mt-2">Security Posture</p>
            </CardContent>
          </Card>
        </motion.div>
        <div className="col-span-9 grid grid-cols-3 gap-4">
          <StatCard label="UilCloud Accounts" value={accounts.length} icon={UilCloud} color="text-blue-400" />
          <StatCard label="Total Resources" value={totalResources} icon={UilServer} color="text-cyan-400" />
          <StatCard label="Open Findings" value={openFindings.length} icon={UilExclamationTriangle} color="text-yellow-400" />
          <StatCard label="Critical Findings" value={criticalCount} icon={UilShieldExclamation} color="text-red-400" />
          <StatCard label="Compliance (CIS)" value={`${COMPLIANCE_DATA.CIS.score}%`} icon={UilShieldCheck} color="text-emerald-400" />
          <StatCard label="Auto-Remediable" value={openFindings.filter(f => f.auto_remediable).length} icon={UilWrench} color="text-purple-400" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <motion.div className="col-span-4" {...fadeIn}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                <UilExclamationTriangle size={16} /> Findings by Severity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              <SeverityBar label="Critical" count={sevCounts.critical} max={maxSev} color="bg-red-500" />
              <SeverityBar label="High" count={sevCounts.high} max={maxSev} color="bg-orange-500" />
              <SeverityBar label="Medium" count={sevCounts.medium} max={maxSev} color="bg-yellow-500" />
              <SeverityBar label="Low" count={sevCounts.low} max={maxSev} color="bg-blue-500" />
              <SeverityBar label="Info" count={sevCounts.info} max={maxSev} color="bg-zinc-500" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="col-span-4" {...fadeIn}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                <UilSitemap size={16} /> Findings by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {(Object.entries(catCounts) as [FindingCategory, number][]).map(([cat, count]) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <Icon size={14} className="text-zinc-500" />
                    <span className="text-xs text-zinc-400 w-20 capitalize">{CATEGORY_LABELS[cat]}</span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-500/70"
                        style={{ width: `${maxSev > 0 ? (count / maxSev) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-zinc-300 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="col-span-4" {...fadeIn}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                <UilEye size={16} /> Reachability Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-center mb-3">
                <p className="text-3xl font-bold text-emerald-400">
                  {openFindings.length > 0 ? Math.round((exposureCounts.none / openFindings.length) * 100) : 0}%
                </p>
                <p className="text-xs text-zinc-500">of findings are NOT reachable from internet</p>
              </div>
              <div className="space-y-2">
                {(["internet", "vpc", "none"] as ExposureLevel[]).map(level => {
                  const cfg = EXPOSURE_CONFIG[level];
                  const ExpIcon = cfg.icon;
                  return (
                    <div key={level} className="flex items-center gap-2">
                      <ExpIcon size={14} className={cfg.color} />
                      <span className="text-xs text-zinc-400 flex-1">{cfg.label}</span>
                      <span className={`text-xs font-medium ${cfg.color}`}>{exposureCounts[level]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div {...fadeIn}>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
              <UilBolt size={16} /> Recent Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px]">
              <div className="divide-y divide-zinc-800/50">
                {findings.filter(f => f.status === "open").slice(0, 10).map(f => {
                  const ExpCfg = EXPOSURE_CONFIG[f.exposure];
                  const ExpIcon = ExpCfg.icon;
                  return (
                    <div key={f.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                      onClick={() => { setSelectedFinding(f); setActiveTab("findings"); }}>
                      <div className={`w-2 h-2 rounded-full ${SEVERITY_DOT[f.severity]}`} />
                      <span className="text-sm text-zinc-200 flex-1 truncate">{f.title}</span>
                      <ExpIcon size={14} className={ExpCfg.color} />
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[f.severity]}`}>
                        {f.severity}
                      </Badge>
                      <span className="text-[10px] text-zinc-600">{timeAgo(f.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  // ─── Tab: Accounts ────────────────────────────────────────────────────────

  const renderAccounts = () => (
    <motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">UilCloud Accounts</h2>
          <p className="text-xs text-zinc-500">{accounts.length} accounts configured</p>
        </div>
        <Button size="sm" onClick={() => setConnectDialogOpen(true)}
          className="gap-1.5 bg-cyan-600 hover:bg-cyan-700">
          <UilPlus size={14} /> Connect Account
        </Button>
      </div>

      <motion.div {...fadeIn}>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-6">
              <span className="text-xs text-zinc-500">Providers:</span>
              {(["aws", "azure", "gcp"] as CloudProvider[]).map(p => {
                const count = accounts.filter(a => a.provider === p).length;
                const cfg = PROVIDER_COLORS[p];
                return (
                  <div key={p} className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </div>
                    <span className="text-sm text-zinc-300">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const pCfg = PROVIDER_COLORS[acc.provider];
          const connected = acc.status === "connected";
          return (
            <motion.div key={acc.id} {...fadeIn}>
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${pCfg.bg}`}>
                        <UilCloud size={18} className={pCfg.text} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{acc.account_name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{acc.account_id}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={connected
                      ? "bg-emerald-500/20 text-emerald-400"
                      : acc.status === "scanning"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-zinc-600/20 text-zinc-400"
                    }>
                      {connected && <UilPlug size={10} className="mr-1" />}
                      {acc.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-lg font-semibold text-zinc-100">{acc.total_resources}</p>
                      <p className="text-[10px] text-zinc-500">Resources</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-lg font-semibold text-zinc-100">{acc.total_findings}</p>
                      <p className="text-[10px] text-zinc-500">Findings</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className={`text-lg font-semibold ${acc.critical_findings > 0 ? "text-red-400" : "text-zinc-100"}`}>
                        {acc.critical_findings}
                      </p>
                      <p className="text-[10px] text-zinc-500">Critical</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {acc.regions.map(r => (
                      <span key={r} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>

                  <Separator className="bg-zinc-800" />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600">
                      Last scan: {timeAgo(acc.last_scan_at)}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost"
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-cyan-400"
                        disabled={!connected}
                        onClick={() => toast({ title: "Scan started", description: `Scanning ${acc.account_name}...` })}>
                        <UilSync size={12} className="mr-1" /> Scan
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400"
                        onClick={() => toast({ title: "Disconnected", description: `${acc.account_name} removed.` })}>
                        <UilTrashAlt size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Connect UilCloud Account</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Add a new cloud provider account for CSPM scanning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-400 text-xs">Provider</Label>
              <Select value={newProvider} onValueChange={v => setNewProvider(v as CloudProvider)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="aws">AWS</SelectItem>
                  <SelectItem value="azure">Azure</SelectItem>
                  <SelectItem value="gcp">GCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Account Name</Label>
              <Input value={newAccountName} onChange={e => setNewAccountName(e.target.value)}
                className="bg-zinc-800 border-zinc-700" placeholder="e.g., Production (AWS)" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">
                {newProvider === "aws" ? "Account ID" : newProvider === "azure" ? "Subscription ID" : "Project ID"}
              </Label>
              <Input value={newAccountId} onChange={e => setNewAccountId(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                placeholder={newProvider === "aws" ? "123456789012" : newProvider === "azure" ? "a1b2c3d4-..." : "project-name-123456"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConnectDialogOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => {
              toast({ title: "Account connected", description: `${newAccountName || "New account"} added.` });
              setConnectDialogOpen(false);
              setNewAccountName(""); setNewAccountId("");
            }}>
              <UilPlug size={14} className="mr-1" /> Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );

  // ─── Tab: Findings ────────────────────────────────────────────────────────

  const renderFindings = () => (
    <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
      {/* Filters */}
      <motion.div {...fadeIn}>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <UilFilter size={14} className="text-zinc-500" />
              <Input placeholder="Search findings..." value={findingSearch}
                onChange={e => setFindingSearch(e.target.value)}
                className="bg-zinc-800 border-zinc-700 h-8 text-xs w-48" />
              <Select value={findingSevFilter} onValueChange={v => setFindingSevFilter(v as FindingSeverity | "all")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Severity</SelectItem>
                  {(["critical", "high", "medium", "low", "info"] as FindingSeverity[]).map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={findingCatFilter} onValueChange={v => setFindingCatFilter(v as FindingCategory | "all")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs w-32"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Category</SelectItem>
                  {(Object.keys(CATEGORY_LABELS) as FindingCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={findingStatusFilter} onValueChange={v => setFindingStatusFilter(v as FindingStatus | "all")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Status</SelectItem>
                  {(Object.keys(STATUS_LABELS) as FindingStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={findingExpFilter} onValueChange={v => setFindingExpFilter(v as ExposureLevel | "all")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs w-36"><SelectValue placeholder="Reachability" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Exposure</SelectItem>
                  {(["internet", "vpc", "none"] as ExposureLevel[]).map(e => (
                    <SelectItem key={e} value={e}>{EXPOSURE_CONFIG[e].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={findingFrameworkFilter} onValueChange={v => setFindingFrameworkFilter(v as ComplianceFramework | "all")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs w-32"><SelectValue placeholder="Framework" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Frameworks</SelectItem>
                  {FRAMEWORK_LABELS.map(fw => (
                    <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-zinc-600 ml-auto">{filteredFindings.length} results</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedFindings.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}>
            <Card className="bg-cyan-900/20 border-cyan-800/40">
              <CardContent className="p-2 flex items-center gap-2">
                <span className="text-xs text-cyan-400">{selectedFindings.size} selected</span>
                <Separator orientation="vertical" className="h-4 bg-cyan-800/40" />
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => handleBulkAction("remediated")}>Remediate</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => handleBulkAction("accepted_risk")}>Accept Risk</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-purple-400 hover:bg-purple-500/10"
                  onClick={() => handleBulkAction("suppressed")}>Suppress</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-zinc-400 hover:bg-zinc-500/10 ml-auto"
                  onClick={() => setSelectedFindings(new Set())}>
                  <UilTimes size={12} /> Clear
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Findings Table + Detail */}
      <div className="grid grid-cols-12 gap-4">
        <div className={selectedFinding ? "col-span-7" : "col-span-12"}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <div className="divide-y divide-zinc-800/50">
                  {filteredFindings.map(f => {
                    const ExpCfg = EXPOSURE_CONFIG[f.exposure];
                    const ExpIcon = ExpCfg.icon;
                    const CatIcon = CATEGORY_ICONS[f.category];
                    const isSelected = selectedFindings.has(f.id);
                    const isActive = selectedFinding?.id === f.id;
                    return (
                      <div key={f.id}
                        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                          isActive ? "bg-cyan-900/20 border-l-2 border-cyan-500"
                            : "hover:bg-zinc-800/30 border-l-2 border-transparent"
                        }`}
                        onClick={() => setSelectedFinding(f)}>
                        <div className="flex items-center"
                          onClick={e => { e.stopPropagation(); toggleFindingSelect(f.id); }}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                            isSelected ? "bg-cyan-500 border-cyan-500" : "border-zinc-600"
                          }`}>
                            {isSelected && <UilCheckCircle size={10} className="text-white" />}
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[f.severity]}`} />
                        <CatIcon size={13} className="text-zinc-500 flex-shrink-0" />
                        <span className="text-xs text-zinc-200 flex-1 truncate">{f.title}</span>
                        <ExpIcon size={13} className={`flex-shrink-0 ${ExpCfg.color}`} />
                        {f.auto_remediable && (
                          <UilWrench size={11} className="text-purple-400 flex-shrink-0" />
                        )}
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${SEVERITY_COLORS[f.severity]}`}>
                          {f.severity}
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[f.status]}`}>
                          {STATUS_LABELS[f.status]}
                        </Badge>
                      </div>
                    );
                  })}
                  {filteredFindings.length === 0 && (
                    <div className="p-8 text-center text-zinc-600 text-sm">No findings match filters.</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedFinding && (
            <motion.div className="col-span-5" initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-zinc-100">{selectedFinding.title}</CardTitle>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-zinc-500"
                      onClick={() => setSelectedFinding(null)}>
                      <UilTimes size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <p className="text-xs text-zinc-400">{selectedFinding.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-zinc-800/50 rounded p-2">
                      <span className="text-zinc-500">Severity</span>
                      <Badge variant="outline" className={`ml-2 text-[10px] ${SEVERITY_COLORS[selectedFinding.severity]}`}>
                        {selectedFinding.severity}
                      </Badge>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <span className="text-zinc-500">Category</span>
                      <span className="ml-2 text-zinc-300 capitalize">{CATEGORY_LABELS[selectedFinding.category]}</span>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <span className="text-zinc-500">Exposure</span>
                      <span className={`ml-2 ${EXPOSURE_CONFIG[selectedFinding.exposure].color}`}>
                        {EXPOSURE_CONFIG[selectedFinding.exposure].label}
                      </span>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <span className="text-zinc-500">Status</span>
                      <Badge variant="outline" className={`ml-2 text-[10px] ${STATUS_COLORS[selectedFinding.status]}`}>
                        {STATUS_LABELS[selectedFinding.status]}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">Resource</p>
                    <p className="text-[11px] text-zinc-300 font-mono bg-zinc-800/50 rounded px-2 py-1 break-all">
                      {selectedFinding.resource_arn}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">Reachability Path</p>
                    <div className="flex items-center gap-1 text-xs">
                      {selectedFinding.exposure === "internet" ? (
                        <>
                          <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px]">Internet</span>
                          <UilAngleRight size={10} className="text-zinc-600" />
                          <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[10px]">Firewall/SG</span>
                          <UilAngleRight size={10} className="text-zinc-600" />
                          <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px]">
                            {selectedFinding.resource_type}
                          </span>
                        </>
                      ) : selectedFinding.exposure === "vpc" ? (
                        <>
                          <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-[10px]">VPC Peering</span>
                          <UilAngleRight size={10} className="text-zinc-600" />
                          <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px]">
                            {selectedFinding.resource_type}
                          </span>
                        </>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">
                          Not reachable from internet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {selectedFinding.compliance_frameworks.map(fw => (
                      <Badge key={fw} variant="outline"
                        className="text-[9px] bg-zinc-800/50 text-zinc-400 border-zinc-700">{fw}</Badge>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <UilWrench size={12} className="text-purple-400" />
                      <p className="text-[10px] text-zinc-500">
                        Remediation ({selectedFinding.remediation_type})
                      </p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded p-3 relative group">
                      <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap overflow-x-auto">
                        {selectedFinding.remediation_code}
                      </pre>
                      <Button size="sm" variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 p-0 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedFinding.remediation_code);
                          toast({ title: "Copied", description: "Remediation code copied to clipboard." });
                        }}>
                        <UilCopy size={12} />
                      </Button>
                    </div>
                  </div>

                  {selectedFinding.status === "open" && (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm gap-1.5"
                      onClick={() => handleRemediate(selectedFinding.id)}>
                      <UilBolt size={14} />
                      {selectedFinding.auto_remediable ? "Auto-Remediate" : "Mark Remediated"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  // ─── Tab: SBOM ────────────────────────────────────────────────────────────

  const renderSBOM = () => (
    <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Software Bill of Materials</h2>
          <p className="text-xs text-zinc-500">
            {sboms.length} imports, {sboms.reduce((s, b) => s + b.total_deps, 0)} total components
          </p>
        </div>
        <Button size="sm" onClick={() => setImportDialogOpen(true)}
          className="gap-1.5 bg-cyan-600 hover:bg-cyan-700">
          <UilUpload size={14} /> Import SBOM
        </Button>
      </div>

      <motion.div className="grid grid-cols-4 gap-4" {...fadeIn}>
        <StatCard label="Total Components"
          value={sboms.reduce((s, b) => s + b.total_deps, 0)} icon={UilBox} color="text-cyan-400" />
        <StatCard label="Vulnerable Deps"
          value={sboms.reduce((s, b) => s + b.vuln_deps, 0)} icon={UilBug} color="text-red-400" />
        <StatCard label="Reachable Vulns"
          value={sboms.reduce((s, b) => s + b.reachable_vulns, 0)} icon={UilGlobe} color="text-orange-400" />
        <StatCard label="Reachable %"
          value={`${Math.round(
            (sboms.reduce((s, b) => s + b.reachable_vulns, 0) /
              Math.max(sboms.reduce((s, b) => s + b.vuln_deps, 0), 1)) * 100
          )}%`} icon={UilEye} color="text-yellow-400" />
      </motion.div>

      <div className="grid grid-cols-12 gap-4">
        <div className={selectedSBOM ? "col-span-5" : "col-span-12"}>
          <div className="space-y-3">
            {sboms.map(sbom => (
              <motion.div key={sbom.id} {...fadeIn}>
                <Card className={`bg-zinc-900/50 border-zinc-800 cursor-pointer transition-colors ${
                  selectedSBOM?.id === sbom.id ? "border-cyan-500/50" : "hover:border-zinc-700"
                }`} onClick={() => setSelectedSBOM(selectedSBOM?.id === sbom.id ? null : sbom)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <UilFileAlt size={18} className="text-cyan-400" />
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{sbom.name}</p>
                          <p className="text-[10px] text-zinc-500">Imported {timeAgo(sbom.imported_at)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${FORMAT_COLORS[sbom.format]}`}>
                        {sbom.format}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className="text-base font-semibold text-zinc-100">{sbom.total_deps}</p>
                        <p className="text-[10px] text-zinc-500">Deps</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className={`text-base font-semibold ${sbom.vuln_deps > 0 ? "text-red-400" : "text-zinc-100"}`}>
                          {sbom.vuln_deps}
                        </p>
                        <p className="text-[10px] text-zinc-500">Vuln</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded p-2">
                        <p className={`text-base font-semibold ${sbom.reachable_vulns > 0 ? "text-orange-400" : "text-zinc-100"}`}>
                          {sbom.reachable_vulns}
                        </p>
                        <p className="text-[10px] text-zinc-500">Reachable</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Component Tree */}
        <AnimatePresence>
          {selectedSBOM && (
            <motion.div className="col-span-7" initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-zinc-100">
                      <UilBox size={14} className="inline mr-1 text-cyan-400" />
                      {selectedSBOM.name} -- Dependencies
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-zinc-500"
                      onClick={() => setSelectedSBOM(null)}>
                      <UilTimes size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[440px]">
                    <div className="divide-y divide-zinc-800/50">
                      {selectedSBOM.components.map((comp, i) => {
                        const hasVulns = comp.vulnerabilities.length > 0;
                        const reachableVulns = comp.vulnerabilities.filter(v => v.is_reachable);
                        return (
                          <div key={i} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <UilBox size={12}
                                className={hasVulns ? "text-red-400" : "text-zinc-600"} />
                              <span className="text-xs text-zinc-200 font-mono">{comp.name}</span>
                              <span className="text-[10px] text-zinc-600">@{comp.version}</span>
                              <Badge variant="outline"
                                className="text-[9px] bg-zinc-800/50 text-zinc-500 border-zinc-700 px-1 py-0">
                                {comp.type}
                              </Badge>
                              {comp.license && (
                                <span className="text-[9px] text-zinc-600 ml-auto">{comp.license}</span>
                              )}
                              {hasVulns && (
                                <Badge variant="outline"
                                  className="text-[9px] bg-red-500/20 text-red-400 px-1 py-0">
                                  {comp.vulnerabilities.length} vuln{comp.vulnerabilities.length > 1 ? "s" : ""}
                                </Badge>
                              )}
                              {reachableVulns.length > 0 && (
                                <Badge variant="outline"
                                  className="text-[9px] bg-orange-500/20 text-orange-400 px-1 py-0">
                                  {reachableVulns.length} reachable
                                </Badge>
                              )}
                            </div>
                            {hasVulns && (
                              <div className="ml-6 mt-1 space-y-0.5">
                                {comp.vulnerabilities.map((v, vi) => (
                                  <div key={vi} className="flex items-center gap-2 text-[10px]">
                                    <UilBug size={10}
                                      className={v.is_reachable ? "text-orange-400" : "text-zinc-500"} />
                                    <span className="text-zinc-400 font-mono">{v.cve_id}</span>
                                    <Badge variant="outline"
                                      className={`text-[8px] px-1 py-0 ${SEVERITY_COLORS[v.severity]}`}>
                                      {v.severity}
                                    </Badge>
                                    {v.is_reachable ? (
                                      <span className="text-orange-400">reachable</span>
                                    ) : (
                                      <span className="text-zinc-600">unreachable</span>
                                    )}
                                    {v.fix_version && (
                                      <span className="text-emerald-500">fix: {v.fix_version}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Import SBOM</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Upload a CycloneDX, SPDX, or Syft JSON file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-400 text-xs">Name</Label>
              <Input value={sbomName} onChange={e => setSbomName(e.target.value)}
                className="bg-zinc-800 border-zinc-700" placeholder="e.g., my-api (backend)" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Format</Label>
              <Select value={sbomFormat} onValueChange={v => setSbomFormat(v as SBOMFormat)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="cyclonedx">CycloneDX</SelectItem>
                  <SelectItem value="spdx">SPDX</SelectItem>
                  <SelectItem value="syft">Syft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">SBOM Content (JSON)</Label>
              <Textarea value={sbomContent} onChange={e => setSbomContent(e.target.value)}
                className="bg-zinc-800 border-zinc-700 font-mono text-xs h-40"
                placeholder='{ "bomFormat": "CycloneDX", "components": [...] }' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportDialogOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => {
              toast({ title: "SBOM imported", description: `${sbomName || "SBOM"} parsed successfully.` });
              setImportDialogOpen(false);
              setSbomName(""); setSbomContent("");
            }}>
              <UilUpload size={14} className="mr-1" /> Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );

  // ─── Tab: Compliance ──────────────────────────────────────────────────────

  const renderCompliance = () => {
    const data = COMPLIANCE_DATA[selectedFramework];
    const totalChecks = data.sections.reduce((s, sec) => s + sec.passed + sec.failed, 0);
    const totalPassed = data.sections.reduce((s, sec) => s + sec.passed, 0);
    const totalFailed = data.sections.reduce((s, sec) => s + sec.failed, 0);

    return (
      <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
        <motion.div {...fadeIn}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <UilShieldCheck size={16} className="text-emerald-400" />
                <span className="text-xs text-zinc-400">Framework:</span>
                <div className="flex gap-1">
                  {FRAMEWORK_LABELS.map(fw => (
                    <Button key={fw} size="sm"
                      variant={selectedFramework === fw ? "default" : "ghost"}
                      className={`h-7 text-xs ${selectedFramework === fw
                        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      onClick={() => { setSelectedFramework(fw); setExpandedSections(new Set()); }}>
                      {fw}
                    </Button>
                  ))}
                </div>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost"
                    className="h-7 text-xs gap-1 text-zinc-400 hover:text-cyan-400"
                    onClick={() => toast({
                      title: "Report exported",
                      description: `${selectedFramework} compliance report downloaded.`,
                    })}>
                    <UilDownloadAlt size={12} /> Export Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-12 gap-4">
          <motion.div className="col-span-4" {...fadeIn}>
            <Card className="bg-zinc-900/50 border-zinc-800 h-full">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full gap-4">
                <ScoreDonut score={data.score} size={160} />
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-200">{selectedFramework} Compliance</p>
                  <p className="text-xs text-zinc-500 mt-1">{totalChecks} checks evaluated</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-2">
                  <div className="text-center bg-emerald-500/10 rounded-lg p-3">
                    <p className="text-xl font-bold text-emerald-400">{totalPassed}</p>
                    <p className="text-[10px] text-zinc-500">Passed</p>
                  </div>
                  <div className="text-center bg-red-500/10 rounded-lg p-3">
                    <p className="text-xl font-bold text-red-400">{totalFailed}</p>
                    <p className="text-[10px] text-zinc-500">Failed</p>
                  </div>
                </div>
                <div className="w-full">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Pass Rate</span>
                    <span>{data.score}%</span>
                  </div>
                  <Progress value={data.score} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="col-span-8 space-y-4">
            <motion.div {...fadeIn}>
              <div className="grid grid-cols-6 gap-2">
                {FRAMEWORK_LABELS.map(fw => {
                  const s = COMPLIANCE_DATA[fw].score;
                  return (
                    <Card key={fw} className={`bg-zinc-900/50 cursor-pointer transition-colors ${
                      selectedFramework === fw ? "border-cyan-500/50" : "border-zinc-800 hover:border-zinc-700"
                    }`} onClick={() => { setSelectedFramework(fw); setExpandedSections(new Set()); }}>
                      <CardContent className="p-3 text-center">
                        <p className={`text-lg font-bold ${scoreColor(s)}`}>{s}%</p>
                        <p className="text-[10px] text-zinc-500">{fw}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            <motion.div {...fadeIn}>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    Sections -- {selectedFramework}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[380px]">
                    <div className="divide-y divide-zinc-800/50">
                      {data.sections.map((section, si) => {
                        const isExpanded = expandedSections.has(section.name);
                        const secScore = Math.round(
                          (section.passed / (section.passed + section.failed)) * 100
                        );
                        return (
                          <div key={si}>
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                              onClick={() => toggleSection(section.name)}>
                              {isExpanded
                                ? <UilAngleDown size={12} className="text-zinc-500" />
                                : <UilAngleRight size={12} className="text-zinc-500" />}
                              <span className="text-xs text-zinc-200 flex-1">{section.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-400">{section.passed} passed</span>
                                <span className="text-[10px] text-red-400">{section.failed} failed</span>
                                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${secScore}%` }} />
                                </div>
                                <span className={`text-[10px] font-medium ${scoreColor(secScore)}`}>
                                  {secScore}%
                                </span>
                              </div>
                            </div>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden">
                                  <div className="bg-zinc-900/50 px-4 py-2 space-y-1">
                                    {section.checks.map((check, ci) => (
                                      <div key={ci} className="flex items-center gap-2 py-1">
                                        {check.passed ? (
                                          <UilCheckCircle size={12}
                                            className="text-emerald-400 flex-shrink-0" />
                                        ) : (
                                          <UilTimesCircle size={12}
                                            className="text-red-400 flex-shrink-0" />
                                        )}
                                        <span className={`text-[11px] flex-1 ${
                                          check.passed ? "text-zinc-400" : "text-zinc-200"
                                        }`}>
                                          {check.title}
                                        </span>
                                        <Badge variant="outline"
                                          className={`text-[8px] px-1 py-0 ${SEVERITY_COLORS[check.severity]}`}>
                                          {check.severity}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <UilShield size={22} className="text-cyan-400" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">UilCloud Security</h1>
            <p className="text-xs text-zinc-500">UilCloud Security Posture Management (CSPM)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-400">
            {accounts.filter(a => a.status === "connected").length} connected
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${
            criticalCount > 0
              ? "bg-red-500/10 text-red-400"
              : "bg-zinc-800 text-zinc-400"
          }`}>
            {criticalCount} critical
          </Badge>
        </div>
      </motion.div>

      {/* Preview Banner */}
      <div className="mx-6 mt-4 mb-0 rounded-lg border bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
        <UilHardHat size={16} />
        <span>UilCloud Security is in preview — sample data shown. Connect your cloud provider in Settings to enable live scanning.</span>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-3 border-b border-zinc-800/50">
            <TabsList className="bg-zinc-900/50 border border-zinc-800">
              <TabsTrigger value="dashboard" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
                <UilShield size={13} /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
                <UilCloud size={13} /> Accounts
              </TabsTrigger>
              <TabsTrigger value="findings" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
                <UilExclamationTriangle size={13} /> Findings
                {openFindings.length > 0 && (
                  <span className="ml-1 bg-red-500/20 text-red-400 text-[9px] px-1.5 rounded-full">
                    {openFindings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sbom" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
                <UilBox size={13} /> SBOM
              </TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
                <UilShieldCheck size={13} /> Compliance
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <TabsContent value="dashboard" className="mt-0">{renderDashboard()}</TabsContent>
              <TabsContent value="accounts" className="mt-0">{renderAccounts()}</TabsContent>
              <TabsContent value="findings" className="mt-0">{renderFindings()}</TabsContent>
              <TabsContent value="sbom" className="mt-0">{renderSBOM()}</TabsContent>
              <TabsContent value="compliance" className="mt-0">{renderCompliance()}</TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
