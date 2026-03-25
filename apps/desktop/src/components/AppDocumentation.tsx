/**
 * Comprehensive App Documentation Component
 * Provides clear user guidance on all features, beta status, and capabilities
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
 Shield,
 Brain,
 Terminal,
 ChatDots,
 Database,
 Lightning,
 CheckCircle,
 Warning,
 Clock,
 GearSix,
 Code,
 TreeStructure,
 Pulse
} from "@phosphor-icons/react";

export function AppDocumentation() {
 return (
 <div className="space-y-6 pb-8">
 {/* Header */}
 <div className="space-y-2">
 <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
 <Shield size={32} weight="duotone" className="text-primary" />
 CrowByte Terminal - Documentation
 </h1>
 <p className="text-muted-foreground">
 Complete guide to features, capabilities, and development status
 </p>
 </div>

 <Separator />

 {/* Feature Status Legend */}
 <Card className="border-primary/30">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Pulse size={20} weight="duotone" />
 Feature Status Legend
 </CardTitle>
 </CardHeader>
 <CardContent className="grid gap-3">
 <div className="flex items-center gap-2">
 <span className="flex items-center gap-1 text-xs text-emerald-500">
 <CheckCircle size={12} weight="bold" />
 READY
 </span>
 <span className="text-sm">Fully implemented and tested</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="flex items-center gap-1 text-xs text-yellow-500">
 <Clock size={12} weight="bold" />
 BETA
 </span>
 <span className="text-sm">Functional but may have limitations</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="flex items-center gap-1 text-xs text-orange-500">
 <Warning size={12} weight="bold" />
 DEV
 </span>
 <span className="text-sm">Under active development</span>
 </div>
 </CardContent>
 </Card>

 {/* CrowByte Security Terminal */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Brain size={20} weight="duotone" className="text-primary" />
 CrowByte Security Terminal
 <span className="flex items-center gap-1 text-xs text-yellow-500">
 <Clock size={12} weight="bold" />
 BETA
 </span>
 </CardTitle>
 <CardDescription>
 AI-powered PC security monitoring and threat analysis
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">What It Does:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Real-time security monitoring of your PC</li>
 <li>Anomaly detection and threat analysis</li>
 <li>Automatic scans every 5 minutes (when enabled)</li>
 <li>On-demand security scans with "Scan Now" button</li>
 <li>Incident memory system (remembers last 50 security events)</li>
 <li>Powered by DeepSeek V3.1 (671B parameters) via Ollama Cloud</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Current Status:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm">
 <li className="text-emerald-500">✓ DeepSeek V3.1 671B AI integration working</li>
 <li className="text-emerald-500">✓ Auto-monitoring toggle functional</li>
 <li className="text-emerald-500">✓ On-demand scanning operational</li>
 <li className="text-emerald-500">✓ Incident memory system active</li>
 <li className="text-yellow-500">⚠ Real-time metrics integration in development</li>
 <li className="text-yellow-500">⚠ MCP-based monitoring requires Electron main process</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">How to Use:</h4>
 <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
 <li>Go to Dashboard page</li>
 <li>Find "CrowByte Security Terminal" card</li>
 <li>Click "Scan Now" for immediate security analysis</li>
 <li>Toggle "Auto ON" to enable 5-minute automatic monitoring</li>
 <li>View AI analysis results in the card</li>
 </ol>
 </div>

 <div className="p-3 bg-transparent border border-transparent rounded-md">
 <p className="text-sm">
 <strong>Note:</strong> PC monitoring tools are currently in development.
 Full metrics integration will use Ollama-based MCP in Electron main process (future enhancement).
 </p>
 </div>
 </CardContent>
 </Card>

 {/* OpenClaw AI Chat */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <ChatDots size={20} weight="duotone" className="text-primary" />
 OpenClaw AI Chat with MCP Tools
 <span className="flex items-center gap-1 text-xs text-emerald-500">
 <CheckCircle size={12} weight="bold" />
 READY
 </span>
 </CardTitle>
 <CardDescription>
 Intelligent AI assistant with tool calling capabilities
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">What It Does:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Chat with OpenClaw models (DeepSeek, Qwen, etc.)</li>
 <li>MCP (Model Context Protocol) tool integration</li>
 <li>Streaming responses for real-time feedback</li>
 <li>Context-aware conversations</li>
 <li>Web search capabilities (via OpenClaw)</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Available Models:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>llama-3.3-70b (recommended)</li>
 <li>llama-3.1-405b</li>
 <li>deepseek-r1</li>
 <li>qwen-2.5-coder-32b</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">How to Use:</h4>
 <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
 <li>Go to Chat page</li>
 <li>Select your preferred AI model from dropdown</li>
 <li>Type your message in the input box</li>
 <li>Press Enter or click Send</li>
 <li>AI will respond with streaming output</li>
 </ol>
 </div>

 <div className="p-3 bg-transparent border border-transparent rounded-md">
 <p className="text-sm">
 <strong>✓ Fully Functional:</strong> OpenClaw chat is production-ready and uses native fetch (no SDK dependencies).
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Supabase Integration */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Database size={20} weight="duotone" className="text-primary" />
 Supabase Backend
 <span className="flex items-center gap-1 text-xs text-emerald-500">
 <CheckCircle size={12} weight="bold" />
 READY
 </span>
 </CardTitle>
 <CardDescription>
 Real-time database, authentication, and storage
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">What It Provides:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>PostgreSQL database with real-time subscriptions</li>
 <li>Row Level Security (RLS) for data protection</li>
 <li>Edge Functions for serverless backend logic</li>
 <li>Storage for files and media</li>
 <li>Built-in authentication system</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Database Tables:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>profiles - User profile data</li>
 <li>messages - Chat history</li>
 <li>settings - User preferences</li>
 <li>monitoring_logs - Security scan results</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Connection Details:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Project URL: Configured via VITE_SUPABASE_URL env var</li>
 <li>Dashboard: https://supabase.com/dashboard/project/&lt;PROJECT_REF&gt;</li>
 </ul>
 </div>
 </CardContent>
 </Card>

 {/* Terminal Emulator */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Terminal size={20} weight="duotone" className="text-primary" />
 Integrated Terminal
 <span className="flex items-center gap-1 text-xs text-emerald-500">
 <CheckCircle size={12} weight="bold" />
 READY
 </span>
 </CardTitle>
 <CardDescription>
 Full-featured terminal emulator with xterm.js
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">Features:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Full terminal emulation powered by xterm.js</li>
 <li>Command execution in local shell</li>
 <li>Search functionality (Ctrl+F)</li>
 <li>Web links detection and click support</li>
 <li>Auto-fit to window size</li>
 <li>Monospace font (JetBrains Mono)</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">How to Use:</h4>
 <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
 <li>Go to Terminal page</li>
 <li>Terminal loads automatically</li>
 <li>Type commands like a normal terminal</li>
 <li>Press Ctrl+F to search</li>
 <li>Click on URLs to open in browser</li>
 </ol>
 </div>
 </CardContent>
 </Card>

 {/* MCP Servers */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <TreeStructure size={20} weight="duotone" className="text-primary" />
 Model Context Protocol (MCP) Servers
 <span className="flex items-center gap-1 text-xs text-yellow-500">
 <Clock size={12} weight="bold" />
 BETA
 </span>
 </CardTitle>
 <CardDescription>
 LLM tool integration via MCP standard
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">Configured Servers:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Supabase MCP - Database operations (Cloud-hosted)</li>
 <li>ByteRover Memory - Long-term memory for AI</li>
 <li>Filesystem - File operations</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Current Status:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm">
 <li className="text-emerald-500">✓ Supabase MCP Cloud working in Electron</li>
 <li className="text-emerald-500">✓ OpenClaw can use MCP tools via Electron IPC</li>
 <li className="text-yellow-500">⚠ Browser context has limited MCP access (Node-only packages)</li>
 <li className="text-yellow-500">⚠ Additional MCP servers planned for Ollama integration</li>
 </ul>
 </div>

 <div className="p-3 bg-transparent border border-transparent rounded-md">
 <p className="text-sm">
 <strong>Note:</strong> MCP servers work best in Electron main process.
 Browser access is limited due to Node.js dependencies.
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Ollama Cloud Integration */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Lightning size={20} weight="duotone" className="text-primary" />
 Ollama Cloud (DeepSeek V3.1)
 <span className="flex items-center gap-1 text-xs text-emerald-500">
 <CheckCircle size={12} weight="bold" />
 READY
 </span>
 </CardTitle>
 <CardDescription>
 671B parameter model for intelligent monitoring
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">Details:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Model: DeepSeek V3.1 (671B total params, 37B active)</li>
 <li>Subscription: Ollama Turbo ($20/month)</li>
 <li>Usage: UNLIMITED during preview period</li>
 <li>Tool calling: Fully supported</li>
 <li>Streaming: Real-time responses</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Use Cases:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>CrowByte Security Terminal analysis</li>
 <li>Complex reasoning tasks</li>
 <li>Security threat assessment</li>
 <li>Code analysis and generation</li>
 </ul>
 </div>

 <div className="p-3 bg-transparent border border-transparent rounded-md">
 <p className="text-sm">
 <strong>✓ Active:</strong> DeepSeek V3.1 671B is configured and ready to use for monitoring tasks.
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Development & Configuration */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Code size={20} weight="duotone" className="text-primary" />
 Development & Configuration
 </CardTitle>
 <CardDescription>
 Technical details and environment setup
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">Technology Stack:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>Framework: React 18 + TypeScript</li>
 <li>Desktop: Electron 39</li>
 <li>Build Tool: Vite 7</li>
 <li>UI Components: Radix UI + Tailwind CSS v3</li>
 <li>Terminal: xterm.js</li>
 <li>Backend: Supabase (PostgreSQL + Edge Functions)</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Environment Variables (.env):</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>VITE_SUPABASE_URL - Supabase project URL</li>
 <li>VITE_SUPABASE_ANON_KEY - Public API key</li>
 <li>VITE_OPENCLAW_ENDPOINT - OpenClaw VPS endpoint</li>
 <li>VITE_OLLAMA_API_KEY - Ollama Cloud API key</li>
 <li>VITE_MCP_CLOUD_URL - MCP Cloud server URL</li>
 <li>VITE_MCP_CLOUD_AUTH - MCP Cloud authorization token</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Package Status:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm">
 <li className="text-emerald-500">✓ All dependencies installed (886 packages)</li>
 <li className="text-emerald-500">✓ Zero security vulnerabilities (npm audit)</li>
 <li className="text-emerald-500">✓ OpenAI SDK removed (replaced with native fetch)</li>
 <li className="text-emerald-500">✓ LangChain packages removed (not needed)</li>
 <li className="text-emerald-500">✓ Tailwind CSS v3 (stable)</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Build Commands:</h4>
 <div className="space-y-1 text-sm font-mono bg-muted p-3 rounded">
 <div>npm run dev - Start development server</div>
 <div>npm run build - Build for production</div>
 <div>npm run build:electron:win - Build Windows installer</div>
 <div>npm run lint - Run ESLint</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Future Enhancements */}
 <Card className="border-transparent">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <GearSix size={20} weight="duotone" className="text-orange-500" />
 Future Enhancements
 <span className="flex items-center gap-1 text-xs text-orange-500">
 <Warning size={12} weight="bold" />
 PLANNED
 </span>
 </CardTitle>
 <CardDescription>
 Features planned for future development
 </CardDescription>
 </CardHeader>
 <CardContent>
 <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
 <li>
 <strong>Ollama-based PC Monitoring:</strong> Direct MCP integration with Ollama
 for real-time PC metrics and system monitoring in CrowByte terminal
 </li>
 <li>
 <strong>Authentication System:</strong> Supabase Auth integration for user management
 </li>
 <li>
 <strong>Chat History:</strong> Persist conversations to Supabase database
 </li>
 <li>
 <strong>Settings Persistence:</strong> Save user preferences across sessions
 </li>
 <li>
 <strong>Multiple Chat Sessions:</strong> Support for multiple conversation threads
 </li>
 <li>
 <strong>File Upload:</strong> Attach files to chat conversations
 </li>
 <li>
 <strong>Code Execution:</strong> Run code snippets safely in sandbox
 </li>
 <li>
 <strong>Custom MCP Servers:</strong> User-configurable MCP server connections
 </li>
 <li>
 <strong>Monitoring Alerts:</strong> Push notifications for critical security events
 </li>
 <li>
 <strong>Export Reports:</strong> Download monitoring reports as PDF/JSON
 </li>
 </ul>
 </CardContent>
 </Card>

 {/* Support & Resources */}
 <Card>
 <CardHeader>
 <CardTitle>Support & Resources</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <h4 className="font-semibold mb-2">Documentation:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
 <li>OpenClaw: Configured via VITE_OPENCLAW_HOSTNAME env var</li>
 <li>Ollama Cloud: https://ollama.com</li>
 <li>Supabase: https://supabase.com/dashboard</li>
 <li>MCP Protocol: https://modelcontextprotocol.io</li>
 <li>MCP Cloud: https://mcp-cloud.ai</li>
 </ul>
 </div>

 <div>
 <h4 className="font-semibold mb-2">Key Files:</h4>
 <ul className="list-disc list-inside space-y-1 text-sm font-mono text-muted-foreground">
 <li>.env - Environment configuration</li>
 <li>electron/main.js - Electron main process</li>
 <li>src/services/monitoring-agent.ts - CrowByte agent</li>
 <li>src/lib/supabase.ts - Supabase client</li>
 <li>package.json - Dependencies</li>
 </ul>
 </div>

 <div className="p-4 bg-primary/10 border border-primary/30 rounded-md">
 <p className="text-sm">
 <strong>Version:</strong> 1.0.0<br />
 <strong>Product Name:</strong> CrowByte Terminal<br />
 <strong>License:</strong> Private<br />
 <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
