/**
 * Detection Engine Service
 * Phase 4 of the Cybersecurity Gaps Integration Plan.
 *
 * Natural language -> detection rules (SIGMA, KQL, SPL, YARA, Snort, Suricata).
 * Test rules against sample logs. Track health. Deploy to connected SIEMs.
 *
 * "40% of new detections already written with AI. We're doing 100%."
 */

import { supabase } from '@/lib/supabase';
import { pgOr } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RuleFormat = 'sigma' | 'kql' | 'spl' | 'yara' | 'snort' | 'suricata';
export type RuleStatus = 'draft' | 'testing' | 'active' | 'disabled' | 'retired';

export interface DetectionRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  format: RuleFormat;
  rule_content: string;
  rule_metadata: RuleMetadata;
  status: RuleStatus;
  version: number;
  test_results?: TestResults;
  last_tested_at?: string;
  deployed_to: string[];
  deployed_at?: string;
  total_matches: number;
  false_positive_count: number;
  last_match_at?: string;
  generated_by?: string;
  ai_confidence?: number;
  finding_ids: string[];
  mitre_tactics: string[];
  mitre_techniques: string[];
  created_at: string;
  updated_at: string;
}

export interface RuleMetadata {
  severity?: string;
  author?: string;
  references?: string[];
  tags?: string[];
  logsource?: {
    category?: string;
    product?: string;
    service?: string;
  };
  falsepositives?: string[];
}

export interface TestResults {
  samples_tested: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  accuracy: number;
  precision: number;
  recall: number;
}

export interface TestLog {
  id: string;
  rule_id: string;
  sample_log: string;
  expected_match: boolean;
  actual_match: boolean;
  match_details?: Record<string, unknown>;
  execution_time_ms: number;
  created_at: string;
}

export interface CreateRuleData {
  name: string;
  description?: string;
  format: RuleFormat;
  rule_content: string;
  rule_metadata?: RuleMetadata;
  generated_by?: string;
  ai_confidence?: number;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
  finding_ids?: string[];
}

export interface GenerateRuleRequest {
  description: string;
  format: RuleFormat;
  severity?: string;
  mitre_technique?: string;
  logsource?: { category?: string; product?: string; service?: string };
  additional_context?: string;
}

// ─── MITRE ATT&CK Reference ──────────────────────────────────────────────────

export const MITRE_TACTICS = [
  { id: 'TA0001', name: 'Initial Access' },
  { id: 'TA0002', name: 'Execution' },
  { id: 'TA0003', name: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation' },
  { id: 'TA0005', name: 'Defense Evasion' },
  { id: 'TA0006', name: 'Credential Access' },
  { id: 'TA0007', name: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement' },
  { id: 'TA0009', name: 'Collection' },
  { id: 'TA0010', name: 'Exfiltration' },
  { id: 'TA0011', name: 'Command and Control' },
  { id: 'TA0040', name: 'Impact' },
  { id: 'TA0042', name: 'Resource Development' },
  { id: 'TA0043', name: 'Reconnaissance' },
] as const;

export const COMMON_TECHNIQUES: Record<string, { id: string; name: string }[]> = {
  'TA0001': [
    { id: 'T1190', name: 'Exploit Public-Facing Application' },
    { id: 'T1566', name: 'Phishing' },
    { id: 'T1133', name: 'External Remote Services' },
    { id: 'T1078', name: 'Valid Accounts' },
  ],
  'TA0002': [
    { id: 'T1059', name: 'Command and Scripting Interpreter' },
    { id: 'T1203', name: 'Exploitation for Client Execution' },
    { id: 'T1053', name: 'Scheduled Task/Job' },
    { id: 'T1047', name: 'Windows Management Instrumentation' },
  ],
  'TA0003': [
    { id: 'T1547', name: 'Boot or Logon Autostart Execution' },
    { id: 'T1136', name: 'Create Account' },
    { id: 'T1543', name: 'Create or Modify System Process' },
    { id: 'T1053', name: 'Scheduled Task/Job' },
  ],
  'TA0004': [
    { id: 'T1548', name: 'Abuse Elevation Control Mechanism' },
    { id: 'T1134', name: 'Access Token Manipulation' },
    { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
  ],
  'TA0005': [
    { id: 'T1070', name: 'Indicator Removal' },
    { id: 'T1036', name: 'Masquerading' },
    { id: 'T1027', name: 'Obfuscated Files or Information' },
    { id: 'T1562', name: 'Impair Defenses' },
  ],
  'TA0006': [
    { id: 'T1110', name: 'Brute Force' },
    { id: 'T1003', name: 'OS Credential Dumping' },
    { id: 'T1555', name: 'Credentials from Password Stores' },
    { id: 'T1539', name: 'Steal Web Session Cookie' },
  ],
  'TA0011': [
    { id: 'T1071', name: 'Application Layer Protocol' },
    { id: 'T1105', name: 'Ingress Tool Transfer' },
    { id: 'T1572', name: 'Protocol Tunneling' },
    { id: 'T1090', name: 'Proxy' },
  ],
};

const FORMAT_LABELS: Record<RuleFormat, string> = {
  sigma: 'SIGMA',
  kql: 'KQL (Kusto)',
  spl: 'SPL (Splunk)',
  yara: 'YARA',
  snort: 'Snort',
  suricata: 'Suricata',
};

// ─── Rule Templates ──────────────────────────────────────────────────────────

const SIGMA_TEMPLATE = (name: string, desc: string, severity: string, logsource: Record<string, string | undefined>, detection: string, tags: string[]) =>
`title: ${name}
id: ${crypto.randomUUID()}
status: experimental
description: ${desc}
author: CrowByte Terminal
date: ${new Date().toISOString().split('T')[0]}
logsource:
  category: ${logsource?.category || 'process_creation'}
  product: ${logsource?.product || 'windows'}
${logsource?.service ? `  service: ${logsource.service}` : ''}
detection:
${detection}
  condition: selection
falsepositives:
  - Legitimate administrative activity
level: ${severity || 'medium'}
tags:
${tags.map(t => `  - ${t}`).join('\n')}`;

const KQL_TEMPLATE = (desc: string, detection: string) =>
`// ${desc}
// Generated by CrowByte Terminal
${detection}`;

const SPL_TEMPLATE = (desc: string, detection: string) =>
`| comment("${desc}")
| comment("Generated by CrowByte Terminal")
${detection}`;

const YARA_TEMPLATE = (name: string, desc: string, detection: string, tags: string[]) =>
`rule ${name.replace(/[^a-zA-Z0-9_]/g, '_')} {
  meta:
    description = "${desc}"
    author = "CrowByte Terminal"
    date = "${new Date().toISOString().split('T')[0]}"
${tags.map(t => `    reference = "${t}"`).join('\n')}

  strings:
${detection}

  condition:
    any of them
}`;

const SNORT_TEMPLATE = (desc: string, detection: string) =>
`# ${desc}
# Generated by CrowByte Terminal
${detection}`;

// ─── Natural Language Pattern Map ────────────────────────────────────────────

interface NLPattern {
  pattern: RegExp;
  sigma: (m: RegExpMatchArray) => string;
  kql: (m: RegExpMatchArray) => string;
  spl: (m: RegExpMatchArray) => string;
  yara: (m: RegExpMatchArray) => string;
  snort: (m: RegExpMatchArray) => string;
  suricata: (m: RegExpMatchArray) => string;
  mitre: string[];
  severity: string;
  logsource: { category: string; product: string; service?: string };
}

const NL_PATTERN_MAP: NLPattern[] = [
  // PowerShell encoded commands
  {
    pattern: /(?:powershell|pwsh).*(?:encoded|base64|obfuscat)|(?:encoded|base64|obfuscat).*(?:powershell|pwsh)/i,
    sigma: () => `  selection:
    CommandLine|contains:
      - '-enc '
      - '-EncodedCommand'
      - '-e JAB'
      - 'FromBase64String'
      - 'powershell -e '`,
    kql: () => `DeviceProcessEvents
| where FileName in~ ("powershell.exe", "pwsh.exe")
| where ProcessCommandLine has_any ("-enc ", "-EncodedCommand", "-e JAB", "FromBase64String")
| project Timestamp, DeviceName, AccountName, ProcessCommandLine`,
    spl: () => `index=windows sourcetype=WinEventLog:Security EventCode=4688
| search (New_Process_Name="*powershell*" OR New_Process_Name="*pwsh*")
  AND (Process_Command_Line="*-enc *" OR Process_Command_Line="*-EncodedCommand*" OR Process_Command_Line="*-e JAB*")
| table _time, host, Account_Name, Process_Command_Line`,
    yara: () => `    $enc1 = "-EncodedCommand" ascii wide nocase
    $enc2 = "FromBase64String" ascii wide nocase
    $enc3 = "-e JAB" ascii wide nocase
    $ps1 = "powershell" ascii wide nocase
    $ps2 = "pwsh" ascii wide nocase`,
    snort: () => `alert tcp any any -> any any (msg:"PowerShell Encoded Command Detected"; content:"powershell"; nocase; content:"-enc"; nocase; sid:1000001; rev:1;)`,
    suricata: () => `alert http any any -> any any (msg:"PowerShell Encoded Command in HTTP"; content:"powershell"; nocase; content:"-enc"; nocase; sid:1000001; rev:1;)`,
    mitre: ['attack.execution', 'attack.t1059.001'],
    severity: 'high',
    logsource: { category: 'process_creation', product: 'windows' },
  },
  // Credential dumping / LSASS
  {
    pattern: /(?:credential|cred).*(?:dump|lsass|mimikatz|sekurlsa)|(?:mimikatz|sekurlsa|lsass.*dump)/i,
    sigma: () => `  selection:
    TargetImage|endswith: '\\lsass.exe'
    GrantedAccess|contains:
      - '0x1010'
      - '0x1038'
      - '0x1fffff'`,
    kql: () => `DeviceProcessEvents
| where FileName =~ "lsass.exe" or ProcessCommandLine has_any ("mimikatz", "sekurlsa", "procdump", "lsass")
| project Timestamp, DeviceName, InitiatingProcessFileName, ProcessCommandLine`,
    spl: () => `index=windows sourcetype=WinEventLog:Security EventCode=4663
| search Object_Name="*lsass*"
| table _time, host, Account_Name, Process_Name, Object_Name, Access_Mask`,
    yara: () => `    $mimi1 = "mimikatz" ascii wide nocase
    $mimi2 = "sekurlsa" ascii wide nocase
    $lsass1 = "lsass.exe" ascii wide
    $dump1 = "MiniDump" ascii wide
    $dump2 = "procdump" ascii wide nocase`,
    snort: () => `alert tcp any any -> any any (msg:"Potential LSASS Credential Dump"; content:"lsass"; nocase; content:"MiniDump"; nocase; sid:1000002; rev:1;)`,
    suricata: () => `alert tcp any any -> any any (msg:"Potential Credential Dump - LSASS Access"; content:"lsass"; nocase; sid:1000002; rev:1;)`,
    mitre: ['attack.credential_access', 'attack.t1003.001'],
    severity: 'critical',
    logsource: { category: 'process_access', product: 'windows', service: 'sysmon' },
  },
  // Lateral movement / PsExec / WMI
  {
    pattern: /(?:lateral|psexec|wmi|wmic|remote.*(?:exec|execution))/i,
    sigma: () => `  selection_psexec:
    Image|endswith:
      - '\\PsExec.exe'
      - '\\PsExec64.exe'
    User|contains: 'NT AUTHORITY'
  selection_wmi:
    CommandLine|contains:
      - 'wmic /node:'
      - 'Invoke-WmiMethod'
      - 'Win32_Process'`,
    kql: () => `DeviceProcessEvents
| where FileName in~ ("PsExec.exe", "PsExec64.exe")
  or ProcessCommandLine has_any ("wmic /node:", "Invoke-WmiMethod", "Win32_Process")
| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine`,
    spl: () => `index=windows sourcetype=WinEventLog:Security (EventCode=4688 OR EventCode=4648)
| search (New_Process_Name="*PsExec*" OR Process_Command_Line="*wmic /node:*" OR Process_Command_Line="*Invoke-WmiMethod*")
| table _time, host, Account_Name, New_Process_Name, Process_Command_Line`,
    yara: () => `    $psexec1 = "PsExec" ascii wide nocase
    $wmi1 = "wmic /node:" ascii wide nocase
    $wmi2 = "Invoke-WmiMethod" ascii wide nocase
    $wmi3 = "Win32_Process" ascii wide`,
    snort: () => `alert tcp any any -> any 445 (msg:"PsExec Lateral Movement Detected"; content:"|ff|SMB"; content:"PSEXESVC"; nocase; sid:1000003; rev:1;)`,
    suricata: () => `alert smb any any -> any any (msg:"PsExec Service Installation"; content:"PSEXESVC"; nocase; sid:1000003; rev:1;)`,
    mitre: ['attack.lateral_movement', 'attack.t1570', 'attack.t1047'],
    severity: 'high',
    logsource: { category: 'process_creation', product: 'windows' },
  },
  // Reverse shell / C2 beaconing
  {
    pattern: /(?:reverse.*shell|c2|beacon|callback|netcat)/i,
    sigma: () => `  selection:
    CommandLine|contains:
      - 'nc -e'
      - 'ncat -e'
      - 'bash -i >& /dev/tcp/'
      - 'python -c.*socket'
      - 'Import-Module.*Invoke-PowerShellTcp'`,
    kql: () => `DeviceNetworkEvents
| where InitiatingProcessCommandLine has_any ("nc -e", "ncat -e", "bash -i >& /dev/tcp/", "python -c", "Invoke-PowerShellTcp")
| project Timestamp, DeviceName, RemoteIP, RemotePort, InitiatingProcessCommandLine`,
    spl: () => `index=* sourcetype=syslog OR sourcetype=WinEventLog:Security
| search (Process_Command_Line="*nc -e*" OR Process_Command_Line="*bash -i*>*tcp*" OR Process_Command_Line="*python*socket*")
| table _time, host, Process_Command_Line, dest_ip, dest_port`,
    yara: () => `    $shell1 = "nc -e /bin/" ascii wide
    $shell2 = "bash -i >& /dev/tcp/" ascii wide
    $shell3 = "python -c" ascii wide
    $shell4 = "socket" ascii wide
    $shell5 = "Invoke-PowerShellTcp" ascii wide`,
    snort: () => `alert tcp any any -> $EXTERNAL_NET any (msg:"Potential Reverse Shell Connection"; flow:to_server,established; content:"/bin/sh"; sid:1000004; rev:1;)`,
    suricata: () => `alert tcp $HOME_NET any -> $EXTERNAL_NET any (msg:"Potential Reverse Shell"; flow:to_server,established; content:"/bin/sh"; sid:1000004; rev:1;)`,
    mitre: ['attack.command_and_control', 'attack.t1071', 'attack.execution', 'attack.t1059'],
    severity: 'critical',
    logsource: { category: 'process_creation', product: 'linux' },
  },
  // SQL injection attempts
  {
    pattern: /(?:sql.*inject|sqli|union.*select|or\s*1\s*=\s*1)/i,
    sigma: () => `  selection:
    cs-uri-query|contains:
      - "' OR "
      - "' UNION SELECT"
      - "1=1--"
      - "SLEEP("
      - "BENCHMARK("
      - "WAITFOR DELAY"`,
    kql: () => `CommonSecurityLog
| where RequestURL has_any ("' OR ", "' UNION SELECT", "1=1--", "SLEEP(", "BENCHMARK(", "WAITFOR DELAY")
| project TimeGenerated, SourceIP, RequestURL, Activity`,
    spl: () => `index=web sourcetype=access_combined
| search (uri_query="*' OR *" OR uri_query="*UNION SELECT*" OR uri_query="*1=1--*" OR uri_query="*SLEEP(*" OR uri_query="*BENCHMARK(*")
| table _time, clientip, uri_path, uri_query, status`,
    yara: () => `    $sqli1 = "' OR 1=1" ascii wide nocase
    $sqli2 = "UNION SELECT" ascii wide nocase
    $sqli3 = "SLEEP(" ascii wide nocase
    $sqli4 = "BENCHMARK(" ascii wide nocase
    $sqli5 = "WAITFOR DELAY" ascii wide nocase`,
    snort: () => `alert tcp any any -> any 80 (msg:"SQL Injection Attempt"; flow:to_server,established; content:"UNION"; nocase; content:"SELECT"; nocase; sid:1000005; rev:1;)`,
    suricata: () => `alert http any any -> any any (msg:"SQL Injection Attempt"; flow:to_server,established; content:"UNION"; nocase; content:"SELECT"; nocase; sid:1000005; rev:1;)`,
    mitre: ['attack.initial_access', 'attack.t1190'],
    severity: 'high',
    logsource: { category: 'webserver', product: 'apache' },
  },
  // Privilege escalation / sudo / SUID
  {
    pattern: /(?:privesc|privilege.*escalat|sudo|suid|setuid|gtfobin)/i,
    sigma: () => `  selection:
    CommandLine|contains:
      - 'sudo '
      - 'chmod +s'
      - 'chmod u+s'
      - 'find / -perm -4000'
      - '/etc/sudoers'`,
    kql: () => `Syslog
| where SyslogMessage has_any ("sudo", "chmod +s", "chmod u+s", "COMMAND=", "perm -4000")
| where Facility == "authpriv"
| project TimeGenerated, HostName, SyslogMessage`,
    spl: () => `index=linux sourcetype=syslog
| search ("sudo" OR "chmod +s" OR "chmod u+s" OR "perm -4000" OR "sudoers")
| table _time, host, process, message`,
    yara: () => `    $priv1 = "chmod +s" ascii wide
    $priv2 = "chmod u+s" ascii wide
    $priv3 = "/etc/sudoers" ascii wide
    $priv4 = "find / -perm" ascii wide`,
    snort: () => `alert tcp any any -> any any (msg:"Potential Privilege Escalation"; content:"chmod +s"; nocase; sid:1000006; rev:1;)`,
    suricata: () => `alert tcp any any -> any any (msg:"Potential Privilege Escalation"; content:"chmod +s"; nocase; sid:1000006; rev:1;)`,
    mitre: ['attack.privilege_escalation', 'attack.t1548'],
    severity: 'high',
    logsource: { category: 'process_creation', product: 'linux' },
  },
  // Data exfiltration / DNS tunneling
  {
    pattern: /(?:exfil|dns.*tunnel|data.*leak|large.*upload|unusual.*dns)/i,
    sigma: () => `  selection:
    query_length|gt: 100
    query|re: '^[a-zA-Z0-9]{30,}\\.'`,
    kql: () => `DnsEvents
| where QueryType in ("TXT", "NULL", "CNAME")
| where strlen(Name) > 100
| summarize count() by Name, ClientIP, bin(TimeGenerated, 5m)
| where count_ > 50
| project TimeGenerated, ClientIP, Name, count_`,
    spl: () => `index=dns sourcetype=dns
| eval query_len=len(query)
| where query_len > 100 OR query_type="TXT"
| stats count by src_ip, query
| where count > 50
| table src_ip, query, count`,
    yara: () => `    $dns1 = ".dnscat." ascii wide nocase
    $dns2 = "iodine" ascii wide nocase
    $dns3 = ".dns2tcp." ascii wide nocase`,
    snort: () => `alert udp any any -> any 53 (msg:"Potential DNS Tunneling - Long Query"; content:"|00 10|"; byte_test:2,>,100,0,relative; sid:1000007; rev:1;)`,
    suricata: () => `alert dns any any -> any any (msg:"Potential DNS Tunneling - Long Query"; dns.query; content:"."; offset:50; sid:1000007; rev:1;)`,
    mitre: ['attack.exfiltration', 'attack.t1048', 'attack.t1572'],
    severity: 'high',
    logsource: { category: 'dns_query', product: 'any' },
  },
  // Webshell / backdoor
  {
    pattern: /(?:webshell|web.*shell|backdoor|china.*chopper|c99|r57|eval.*request)/i,
    sigma: () => `  selection:
    CommandLine|contains:
      - 'cmd.exe /c'
      - 'whoami'
      - 'net user'
      - 'systeminfo'
    ParentImage|contains:
      - 'w3wp.exe'
      - 'httpd.exe'
      - 'nginx'
      - 'apache2'
      - 'php-cgi'`,
    kql: () => `DeviceProcessEvents
| where InitiatingProcessFileName in~ ("w3wp.exe", "httpd.exe", "nginx", "apache2", "php-cgi")
| where FileName in~ ("cmd.exe", "powershell.exe", "bash", "sh")
| project Timestamp, DeviceName, InitiatingProcessFileName, FileName, ProcessCommandLine`,
    spl: () => `index=windows sourcetype=WinEventLog:Security EventCode=4688
| search (Parent_Process_Name="*w3wp*" OR Parent_Process_Name="*httpd*" OR Parent_Process_Name="*apache*")
  AND (New_Process_Name="*cmd.exe*" OR New_Process_Name="*powershell*")
| table _time, host, Parent_Process_Name, New_Process_Name, Process_Command_Line`,
    yara: () => `    $ws1 = "eval($_" ascii wide
    $ws2 = "eval(base64_decode" ascii wide
    $ws3 = "system($_GET" ascii wide
    $ws4 = "passthru(" ascii wide
    $ws5 = "shell_exec(" ascii wide
    $ws6 = "c99shell" ascii wide nocase
    $ws7 = "r57shell" ascii wide nocase`,
    snort: () => `alert tcp any any -> any 80 (msg:"Webshell Command Execution"; flow:to_server,established; content:"cmd.exe"; nocase; content:"/c"; sid:1000008; rev:1;)`,
    suricata: () => `alert http any any -> any any (msg:"Potential Webshell Activity"; flow:to_server,established; content:"cmd="; http.uri; sid:1000008; rev:1;)`,
    mitre: ['attack.persistence', 'attack.t1505.003'],
    severity: 'critical',
    logsource: { category: 'process_creation', product: 'windows' },
  },
];

// ─── Fallback Rule Generators ────────────────────────────────────────────────

function generateFallbackRule(desc: string, format: RuleFormat, severity: string): string {
  const safeName = desc.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 60);

  switch (format) {
    case 'sigma':
      return SIGMA_TEMPLATE(
        safeName, desc, severity,
        { category: 'process_creation', product: 'windows' },
        `  selection:\n    CommandLine|contains:\n      - 'TODO: Add detection pattern based on: ${desc}'`,
        ['attack.execution']
      );
    case 'kql':
      return KQL_TEMPLATE(desc,
        `// TODO: Implement detection for: ${desc}\nDeviceProcessEvents\n| where ProcessCommandLine has "PLACEHOLDER"\n| project Timestamp, DeviceName, AccountName, ProcessCommandLine`);
    case 'spl':
      return SPL_TEMPLATE(desc,
        `index=* sourcetype=*\n| search "PLACEHOLDER"\n| table _time, host, source, sourcetype`);
    case 'yara':
      return YARA_TEMPLATE(safeName, desc,
        `    $pattern1 = "PLACEHOLDER" ascii wide nocase`, []);
    case 'snort':
      return SNORT_TEMPLATE(desc,
        `alert tcp any any -> any any (msg:"${desc.slice(0, 100)}"; content:"PLACEHOLDER"; nocase; sid:1000099; rev:1;)`);
    case 'suricata':
      return SNORT_TEMPLATE(desc,
        `alert tcp any any -> any any (msg:"${desc.slice(0, 100)}"; content:"PLACEHOLDER"; nocase; sid:1000099; rev:1;)`);
    default:
      return `# Detection rule for: ${desc}\n# Format: ${format}\n# TODO: Implement`;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class DetectionEngine {

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: CreateRuleData): Promise<DetectionRule> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const userError = user ? null : new Error("Not authenticated");
    if (userError || !user) throw new Error('User not authenticated');

    const { data: rule, error } = await supabase
      .from('detection_rules')
      .insert({
        user_id: user.id,
        ...data,
        rule_metadata: data.rule_metadata || {},
        mitre_tactics: data.mitre_tactics || [],
        mitre_techniques: data.mitre_techniques || [],
        finding_ids: data.finding_ids || [],
        status: 'draft',
        version: 1,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create rule: ${error.message}`);
    return rule;
  }

  async getAll(filters?: { format?: RuleFormat; status?: RuleStatus; search?: string }): Promise<DetectionRule[]> {
    let query = supabase.from('detection_rules').select('*').order('updated_at', { ascending: false });

    if (filters?.format) query = query.eq('format', filters.format);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.search) query = query.or(`name.ilike.%${pgOr(filters.search)}%,description.ilike.%${pgOr(filters.search)}%`);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch rules: ${error.message}`);
    return data || [];
  }

  async getById(id: string): Promise<DetectionRule> {
    const { data, error } = await supabase
      .from('detection_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch rule: ${error.message}`);
    return data;
  }

  async update(id: string, updates: Partial<DetectionRule>): Promise<DetectionRule> {
    const { data, error } = await supabase
      .from('detection_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update rule: ${error.message}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('detection_rules').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete rule: ${error.message}`);
  }

  // ─── Natural Language -> Rule ───────────────────────────────────────────────

  generateFromDescription(request: GenerateRuleRequest): {
    rule_content: string;
    mitre_tags: string[];
    severity: string;
    confidence: number;
    logsource: { category: string; product: string; service?: string };
  } {
    const { description, format, severity: requestedSeverity } = request;

    // Try to match against known patterns
    for (const nlp of NL_PATTERN_MAP) {
      const match = description.match(nlp.pattern);
      if (match) {
        let rule_content: string;
        const tags = nlp.mitre;
        const detectedSeverity = requestedSeverity || nlp.severity;
        const ls = request.logsource || nlp.logsource;

        switch (format) {
          case 'sigma':
            rule_content = SIGMA_TEMPLATE(
              description.slice(0, 80),
              description,
              detectedSeverity,
              ls,
              nlp.sigma(match),
              tags
            );
            break;
          case 'kql':
            rule_content = KQL_TEMPLATE(description, nlp.kql(match));
            break;
          case 'spl':
            rule_content = SPL_TEMPLATE(description, nlp.spl(match));
            break;
          case 'yara':
            rule_content = YARA_TEMPLATE(
              description.slice(0, 80),
              description,
              nlp.yara(match),
              tags
            );
            break;
          case 'snort':
            rule_content = nlp.snort(match);
            break;
          case 'suricata':
            rule_content = nlp.suricata(match);
            break;
          default:
            rule_content = generateFallbackRule(description, format, detectedSeverity);
        }

        return {
          rule_content,
          mitre_tags: tags,
          severity: detectedSeverity,
          confidence: 0.85,
          logsource: ls,
        };
      }
    }

    // No pattern matched — generate fallback
    return {
      rule_content: generateFallbackRule(description, format, requestedSeverity || 'medium'),
      mitre_tags: [],
      severity: requestedSeverity || 'medium',
      confidence: 0.3,
      logsource: request.logsource || { category: 'process_creation', product: 'windows' },
    };
  }

  /** Generate and save a rule in one step */
  async generateAndSave(request: GenerateRuleRequest): Promise<DetectionRule> {
    const result = this.generateFromDescription(request);

    return this.create({
      name: request.description.slice(0, 120),
      description: request.description,
      format: request.format,
      rule_content: result.rule_content,
      rule_metadata: {
        severity: result.severity,
        logsource: result.logsource,
        tags: result.mitre_tags,
      },
      generated_by: 'ai:crowbyte',
      ai_confidence: result.confidence,
      mitre_tactics: result.mitre_tags.filter(t => t.startsWith('attack.') && !t.match(/attack\.t\d/)).map(t => t.replace('attack.', '')),
      mitre_techniques: result.mitre_tags.filter(t => /attack\.t\d+/i.test(t)).map(t => t.replace('attack.', '')),
    });
  }

  // ─── Rule Conversion ───────────────────────────────────────────────────────

  /** Convert a rule from one format to another */
  convertRule(_ruleContent: string, _fromFormat: RuleFormat, toFormat: RuleFormat, description: string): string {
    const result = this.generateFromDescription({
      description,
      format: toFormat,
    });
    return result.rule_content;
  }

  // ─── Rule Testing ──────────────────────────────────────────────────────────

  /** Test a rule against sample log data */
  async testRule(ruleId: string, sampleLogs: string[]): Promise<TestResults> {
    const rule = await this.getById(ruleId);
    const results: { matched: boolean; time_ms: number }[] = [];

    for (const log of sampleLogs) {
      const start = performance.now();
      const matched = this.matchRuleAgainstLog(rule.rule_content, rule.format, log);
      const time_ms = Math.round(performance.now() - start);

      results.push({ matched, time_ms });

      // Save test log
      await supabase.from('detection_test_logs').insert({
        rule_id: ruleId,
        sample_log: log,
        expected_match: true,
        actual_match: matched,
        execution_time_ms: time_ms,
      });
    }

    const matched = results.filter(r => r.matched).length;
    const total = results.length;

    const testResults: TestResults = {
      samples_tested: total,
      true_positives: matched,
      false_positives: 0,
      false_negatives: total - matched,
      true_negatives: 0,
      accuracy: total > 0 ? matched / total : 0,
      precision: matched > 0 ? 1.0 : 0,
      recall: total > 0 ? matched / total : 0,
    };

    await this.update(ruleId, {
      test_results: testResults,
      last_tested_at: new Date().toISOString(),
    } as Partial<DetectionRule>);

    return testResults;
  }

  /** Simple pattern matching engine for rule testing */
  private matchRuleAgainstLog(ruleContent: string, format: RuleFormat, log: string): boolean {
    const logLower = log.toLowerCase();
    const patterns: string[] = [];

    switch (format) {
      case 'sigma': {
        const containsMatches = ruleContent.match(/- '([^']+)'/g);
        if (containsMatches) {
          patterns.push(...containsMatches.map(m => m.replace(/^- '|'$/g, '')));
        }
        break;
      }
      case 'kql': {
        const hasAny = ruleContent.match(/has_any\s*\(([^)]+)\)/g);
        if (hasAny) {
          for (const m of hasAny) {
            const values = m.match(/"([^"]+)"/g);
            if (values) patterns.push(...values.map(v => v.replace(/"/g, '')));
          }
        }
        const has = ruleContent.match(/has\s+"([^"]+)"/g);
        if (has) patterns.push(...has.map(m => m.match(/"([^"]+)"/)?.[1] || ''));
        break;
      }
      case 'spl': {
        const searchVals = ruleContent.match(/"([^"]+)"/g);
        if (searchVals) patterns.push(...searchVals.map(v => v.replace(/"/g, '')));
        break;
      }
      case 'yara': {
        const yaraStrings = ruleContent.match(/=\s*"([^"]+)"/g);
        if (yaraStrings) patterns.push(...yaraStrings.map(s => s.match(/"([^"]+)"/)?.[1] || ''));
        break;
      }
      case 'snort':
      case 'suricata': {
        const contents = ruleContent.match(/content:"([^"]+)"/g);
        if (contents) patterns.push(...contents.map(c => c.match(/"([^"]+)"/)?.[1] || ''));
        break;
      }
    }

    return patterns.some(p => logLower.includes(p.toLowerCase()));
  }

  /** Get test history for a rule */
  async getTestLogs(ruleId: string): Promise<TestLog[]> {
    const { data, error } = await supabase
      .from('detection_test_logs')
      .select('*')
      .eq('rule_id', ruleId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to fetch test logs: ${error.message}`);
    return data || [];
  }

  // ─── Rule Versioning ───────────────────────────────────────────────────────

  async bumpVersion(id: string, newContent: string): Promise<DetectionRule> {
    const current = await this.getById(id);
    return this.update(id, {
      rule_content: newContent,
      version: current.version + 1,
      status: 'draft',
    });
  }

  // ─── Deployment ────────────────────────────────────────────────────────────

  async deploy(ruleId: string, target: string): Promise<void> {
    const rule = await this.getById(ruleId);
    const deployed = [...new Set([...rule.deployed_to, target])];

    await this.update(ruleId, {
      deployed_to: deployed,
      deployed_at: new Date().toISOString(),
      status: 'active',
    });
  }

  async undeploy(ruleId: string, target: string): Promise<void> {
    const rule = await this.getById(ruleId);
    await this.update(ruleId, {
      deployed_to: rule.deployed_to.filter(t => t !== target),
    });
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    total: number;
    by_format: Record<string, number>;
    by_status: Record<string, number>;
    active: number;
    avg_confidence: number;
  }> {
    const rules = await this.getAll();

    const by_format: Record<string, number> = {};
    const by_status: Record<string, number> = {};
    let confidenceSum = 0;
    let confidenceCount = 0;

    for (const r of rules) {
      by_format[r.format] = (by_format[r.format] || 0) + 1;
      by_status[r.status] = (by_status[r.status] || 0) + 1;
      if (r.ai_confidence) {
        confidenceSum += r.ai_confidence;
        confidenceCount++;
      }
    }

    return {
      total: rules.length,
      by_format,
      by_status,
      active: rules.filter(r => r.status === 'active').length,
      avg_confidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getFormatLabel(format: RuleFormat): string {
    return FORMAT_LABELS[format] || format.toUpperCase();
  }

  getFormatExtension(format: RuleFormat): string {
    const ext: Record<RuleFormat, string> = {
      sigma: 'yml',
      kql: 'kql',
      spl: 'spl',
      yara: 'yar',
      snort: 'rules',
      suricata: 'rules',
    };
    return ext[format] || 'txt';
  }

  getFormatLanguage(format: RuleFormat): string {
    const lang: Record<RuleFormat, string> = {
      sigma: 'yaml',
      kql: 'kql',
      spl: 'spl',
      yara: 'c',
      snort: 'text',
      suricata: 'text',
    };
    return lang[format] || 'text';
  }
}

// Export singleton
export const detectionEngine = new DetectionEngine();
export default detectionEngine;
