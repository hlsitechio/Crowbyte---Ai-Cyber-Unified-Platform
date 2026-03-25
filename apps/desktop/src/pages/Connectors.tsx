/**
 * Connectors Page — Where companies integrate their security infrastructure
 *
 * Features:
 * - Browse available connectors by category
 * - Connect/disconnect platforms with OAuth2 or API keys
 * - See which AI agents auto-activate per connector
 * - Manage permissions (what agents can do)
 * - Real-time health monitoring of connected platforms
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldWarning, UserCheck, Laptop, Bird, Fire, MagnifyingGlass, Stack, Eye, Bug, Plug, PlugsConnected, CaretRight, GearSix, Pulse, Robot, Lock, LockOpen, Warning, CheckCircle, XCircle, Clock, Lightning, ArrowRight, ArrowSquareOut, Key, Globe, DesktopTower, Database, ChartBar, Users, FileX, Funnel, GridFour, ListBullets, Monitor, Terminal, ShippingContainer, TreeStructure } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CONNECTOR_REGISTRY } from '../connectors/registry';
import { getAgentsForConnector } from '../agents/soc/agent-registry';
import { AGENT_REGISTRY } from '../agents/soc/agent-registry';
import type { ConnectorManifest, ConnectorCategory, ConnectorStatus, AgentPermissionLevel, AgentRole } from '../connectors/types';

// ─── Icon Mapping ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
 Shield, ShieldCheck, ShieldWarning, UserCheck, Laptop, Bird, Fire,
 MagnifyingGlass, Stack, Eye, Bug, Monitor, Terminal, ShippingContainer, TreeStructure,
 DesktopTower, Globe,
};

const CATEGORY_META: Record<ConnectorCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
 siem: { label: 'SIEM', icon: MagnifyingGlass, color: 'text-blue-500' },
 edr: { label: 'EDR', icon: ShieldCheck, color: 'text-red-500' },
 identity: { label: 'Identity', icon: UserCheck, color: 'text-violet-500' },
 cloud: { label: 'Cloud Security', icon: Globe, color: 'text-cyan-500' },
 vuln: { label: 'Vulnerability Mgmt', icon: Bug, color: 'text-orange-500' },
 network: { label: 'Network Security', icon: DesktopTower, color: 'text-emerald-500' },
 mdm: { label: 'Device Management', icon: Laptop, color: 'text-amber-500' },
 ticketing: { label: 'Ticketing', icon: FileX, color: 'text-pink-500' },
 'threat-intel': { label: 'Threat Intel', icon: Database, color: 'text-emerald-500' },
 infrastructure: { label: 'Infrastructure', icon: DesktopTower, color: 'text-sky-500' },
 container: { label: 'Containers', icon: Stack, color: 'text-indigo-500' },
 'cloud-infra': { label: 'Cloud Infra', icon: Globe, color: 'text-teal-500' },
};

const PERMISSION_COLORS: Record<AgentPermissionLevel, string> = {
 observe: 'text-blue-500',
 triage: 'text-amber-500',
 respond: 'text-orange-500',
 contain: 'text-red-500',
 admin: 'text-violet-500',
};

const STATUS_META: Record<ConnectorStatus, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
 disconnected: { icon: XCircle, color: 'text-zinc-500', label: 'Disconnected' },
 connecting: { icon: Clock, color: 'text-amber-500', label: 'Connecting...' },
 connected: { icon: CheckCircle, color: 'text-emerald-500', label: 'Connected' },
 error: { icon: Warning, color: 'text-red-500', label: 'Error' },
 degraded: { icon: Warning, color: 'text-amber-500', label: 'Degraded' },
};

// ─── Mock State (will be replaced with Supabase) ─────────────────────────────

interface ConnectorState {
 status: ConnectorStatus;
 alertCount24h: number;
 lastSync?: string;
 agentPermissions: Record<string, AgentPermissionLevel>;
}

const INITIAL_STATE: Record<string, ConnectorState> = {};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Connectors() {
 const [search, setSearch] = useState('');
 const [categoryFilter, setCategoryFilter] = useState<ConnectorCategory | 'all'>('all');
 const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
 const [connectorStates, setConnectorStates] = useState<Record<string, ConnectorState>>(INITIAL_STATE);
 const [selectedConnector, setSelectedConnector] = useState<ConnectorManifest | null>(null);
 const [connectDialogOpen, setConnectDialogOpen] = useState(false);
 const [agentConfigOpen, setAgentConfigOpen] = useState(false);
 const [selectedAgent, setSelectedAgent] = useState<AgentRole | null>(null);

 // Filter connectors
 const filteredConnectors = useMemo(() => {
 return CONNECTOR_REGISTRY.filter(c => {
 const matchesSearch = !search ||
 c.name.toLowerCase().includes(search.toLowerCase()) ||
 c.vendor.toLowerCase().includes(search.toLowerCase()) ||
 c.description.toLowerCase().includes(search.toLowerCase());
 const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
 return matchesSearch && matchesCategory;
 });
 }, [search, categoryFilter]);

 // Stats
 const connectedCount = Object.values(connectorStates).filter(s => s.status === 'connected').length;
 const totalAlerts = Object.values(connectorStates).reduce((sum, s) => sum + s.alertCount24h, 0);
 const activeAgentIds = new Set(
 Object.entries(connectorStates)
 .filter(([_, s]) => s.status === 'connected')
 .flatMap(([id]) => {
 const manifest = CONNECTOR_REGISTRY.find(c => c.id === id);
 return manifest?.activatesAgents ?? [];
 })
 );

 const getState = (id: string): ConnectorState => connectorStates[id] ?? { status: 'disconnected', alertCount24h: 0, agentPermissions: {} };

 // ─── Connect Flow ────────────────────────────────────────────────────────

 const handleConnect = (connector: ConnectorManifest) => {
 setSelectedConnector(connector);
 setConnectDialogOpen(true);
 };

 const handleDisconnect = (connectorId: string) => {
 setConnectorStates(prev => {
 const next = { ...prev };
 delete next[connectorId];
 return next;
 });
 };

 const handleSubmitConnection = (auth: Record<string, string>) => {
 if (!selectedConnector) return;

 // Set to connecting, then connected after delay (simulated)
 setConnectorStates(prev => ({
 ...prev,
 [selectedConnector.id]: {
 status: 'connecting',
 alertCount24h: 0,
 agentPermissions: {},
 },
 }));

 setTimeout(() => {
 const agents = getAgentsForConnector(selectedConnector.id);
 const defaultPermissions: Record<string, AgentPermissionLevel> = {};
 agents.forEach(a => { defaultPermissions[a.id] = a.permissionLevel; });

 setConnectorStates(prev => ({
 ...prev,
 [selectedConnector.id]: {
 status: 'connected',
 alertCount24h: Math.floor(Math.random() * 150),
 lastSync: new Date().toISOString(),
 agentPermissions: defaultPermissions,
 },
 }));
 }, 2000);

 setConnectDialogOpen(false);
 };

 // ─── Render ──────────────────────────────────────────────────────────────

 return (
 <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
 {/* Header */}
 <div className="shrink-0 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-sm">
 <div className="px-6 py-4">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h1 className="text-2xl font-bold text-white flex items-center gap-2">
 <PlugsConnected size={24} weight="duotone" className="text-emerald-500" />
 Connectors
 </h1>
 <p className="text-sm text-zinc-400 mt-1">
 Integrate your security infrastructure — AI agents auto-activate on connection
 </p>
 </div>

 <div className="flex items-center gap-4">
 {/* Stats */}
 <div className="flex items-center gap-6 mr-4">
 <div className="text-center">
 <div className="text-2xl font-bold text-emerald-500">{connectedCount}</div>
 <div className="text-xs text-zinc-500">Connected</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-blue-500">{activeAgentIds.size}</div>
 <div className="text-xs text-zinc-500">Active Agents</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-amber-500">{totalAlerts}</div>
 <div className="text-xs text-zinc-500">Alerts (24h)</div>
 </div>
 </div>
 </div>
 </div>

 {/* Search + Filters */}
 <div className="flex items-center gap-3">
 <div className="relative flex-1 max-w-md">
 <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
 <Input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search connectors..."
 className="pl-9 bg-zinc-900 border-zinc-700 text-white"
 />
 </div>

 <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as ConnectorCategory | 'all')}>
 <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
 <Funnel size={16} weight="bold" className="mr-2 text-zinc-400" />
 <SelectValue placeholder="All Categories" />
 </SelectTrigger>
 <SelectContent className="bg-zinc-900 border-zinc-700">
 <SelectItem value="all">All Categories</SelectItem>
 {Object.entries(CATEGORY_META).map(([key, meta]) => (
 <SelectItem key={key} value={key}>
 <span className={meta.color}>{meta.label}</span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <div className="flex items-center bg-transparent rounded-md">
 <Button
 variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
 size="icon"
 className="h-9 w-9"
 onClick={() => setViewMode('grid')}
 >
 <GridFour size={16} weight="bold" />
 </Button>
 <Button
 variant={viewMode === 'list' ? 'secondary' : 'ghost'}
 size="icon"
 className="h-9 w-9"
 onClick={() => setViewMode('list')}
 >
 <ListBullets size={16} weight="bold" />
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <ScrollArea className="flex-1">
 <div className="p-6">
 {/* Active Agents Banner (when connectors are connected) */}
 {activeAgentIds.size > 0 && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mb-6 p-4 rounded-lg bg-transparent"
 >
 <div className="flex items-center gap-2 mb-3">
 <Robot size={20} weight="duotone" className="text-emerald-500" />
 <span className="font-semibold text-emerald-500">Active AI Agents</span>
 <span className="flex items-center gap-1.5 text-xs ml-2">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-emerald-500">{activeAgentIds.size} running</span>
 </span>
 </div>
 <div className="flex flex-wrap gap-2">
 {AGENT_REGISTRY.filter(a => activeAgentIds.has(a.id)).map(agent => (
 <Button
 key={agent.id}
 variant="ghost"
 size="sm"
 className="h-8 text-xs bg-transparent hover:bg-white/[0.03]"
 onClick={() => { setSelectedAgent(agent); setAgentConfigOpen(true); }}
 >
 <Robot size={12} weight="bold" className="mr-1.5 text-emerald-500" />
 {agent.name}
 <span className={`ml-2 text-[10px] ${PERMISSION_COLORS[agent.permissionLevel]}`}>
 {agent.permissionLevel}
 </span>
 </Button>
 ))}
 </div>
 </motion.div>
 )}

 {/* Connector Grid */}
 <div className={viewMode === 'grid'
 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
 : 'flex flex-col gap-3'
 }>
 <AnimatePresence mode="popLayout">
 {filteredConnectors.map((connector, i) => {
 const state = getState(connector.id);
 const agents = getAgentsForConnector(connector.id);
 const IconComponent = ICON_MAP[connector.icon] ?? Shield;
 const catMeta = CATEGORY_META[connector.category];
 const statusMeta = STATUS_META[state.status];
 const StatusIcon = statusMeta.icon;

 return (
 <motion.div
 key={connector.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ delay: i * 0.05 }}
 >
 <Card className={`bg-transparent hover:bg-white/[0.03] transition-all cursor-pointer group ${
 state.status === 'connected' ? 'bg-transparent' : ''
 }`}>
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-lg bg-white/[0.05]">
 <IconComponent size={24} weight="duotone" className={`${catMeta.color}`} />
 </div>
 <div>
 <CardTitle className="text-white text-base">{connector.name}</CardTitle>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-xs text-zinc-500">{connector.vendor}</span>
 <span className={`text-[10px] ${catMeta.color}`}>
 {catMeta.label}
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-1.5">
 <StatusIcon size={16} weight="bold" className={`${statusMeta.color}`} />
 <span className={`text-xs ${statusMeta.color}`}>{statusMeta.label}</span>
 </div>
 </div>
 </CardHeader>

 <CardContent>
 <p className="text-xs text-zinc-400 mb-4 line-clamp-2">
 {connector.description}
 </p>

 {/* Capabilities */}
 <div className="flex flex-wrap gap-1.5 mb-4">
 {connector.capabilities.slice(0, 4).map(cap => (
 <span key={cap.id} className="text-[10px] text-zinc-400">
 {cap.name}
 </span>
 ))}
 {connector.capabilities.length > 4 && (
 <span className="text-[10px] text-zinc-500">
 +{connector.capabilities.length - 4} more
 </span>
 )}
 </div>

 {/* Agents that activate */}
 <div className="flex items-center gap-2 mb-4">
 <Robot size={14} weight="bold" className="text-zinc-500" />
 <span className="text-xs text-zinc-500">Activates:</span>
 <div className="flex flex-wrap gap-1">
 {agents.map(agent => (
 <span key={agent.id} className="text-[10px] text-emerald-500/80">
 {agent.name}{agents.indexOf(agent) < agents.length - 1 ? ',' : ''}
 </span>
 ))}
 </div>
 </div>

 {/* MCP Tools count */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4 text-xs text-zinc-500">
 <span className="flex items-center gap-1">
 <Lightning size={12} weight="bold" /> {connector.mcpTools.length} MCP tools
 </span>
 <span className="flex items-center gap-1">
 <Pulse size={12} weight="bold" /> {connector.dataStreams.length} data streams
 </span>
 </div>
 {state.status === 'connected' && (
 <span className="text-xs text-amber-500">
 {state.alertCount24h} alerts/24h
 </span>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-2">
 {state.status === 'connected' ? (
 <>
 <Button
 size="sm"
 variant="outline"
 className="flex-1 text-xs border-white/[0.06] hover:border-white/[0.1]"
 onClick={(e) => { e.stopPropagation(); setSelectedConnector(connector); setAgentConfigOpen(true); }}
 >
 <GearSix size={12} weight="bold" className="mr-1.5" /> Configure
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="text-xs text-red-500 hover:text-red-300 hover:bg-transparent"
 onClick={(e) => { e.stopPropagation(); handleDisconnect(connector.id); }}
 >
 <XCircle size={12} weight="bold" className="mr-1.5" /> Disconnect
 </Button>
 </>
 ) : state.status === 'connecting' ? (
 <Button size="sm" disabled className="flex-1 text-xs">
 <Clock size={12} weight="bold" className="mr-1.5 animate-spin" /> Connecting...
 </Button>
 ) : (
 <Button
 size="sm"
 className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
 onClick={(e) => { e.stopPropagation(); handleConnect(connector); }}
 >
 <Plug size={12} weight="bold" className="mr-1.5" /> Connect
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 </motion.div>
 );
 })}
 </AnimatePresence>
 </div>

 {filteredConnectors.length === 0 && (
 <div className="text-center py-20">
 <MagnifyingGlass size={48} weight="duotone" className="text-zinc-700 mx-auto mb-4" />
 <p className="text-zinc-500">No connectors match your search</p>
 </div>
 )}
 </div>
 </ScrollArea>

 {/* ─── Connect Dialog ─────────────────────────────────────────────── */}
 <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
 <DialogContent className="bg-zinc-900 border-white/[0.08] text-white max-w-lg">
 {selectedConnector && (
 <>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Plug size={20} weight="duotone" className="text-emerald-500" />
 Connect {selectedConnector.name}
 </DialogTitle>
 <DialogDescription className="text-zinc-400">
 Enter your credentials to connect. AI agents will auto-activate once connected.
 </DialogDescription>
 </DialogHeader>

 <ConnectForm
 connector={selectedConnector}
 onSubmit={handleSubmitConnection}
 onCancel={() => setConnectDialogOpen(false)}
 />
 </>
 )}
 </DialogContent>
 </Dialog>

 {/* ─── Agent Config Dialog ────────────────────────────────────────── */}
 <Dialog open={agentConfigOpen} onOpenChange={setAgentConfigOpen}>
 <DialogContent className="bg-zinc-900 border-white/[0.08] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
 {(selectedConnector || selectedAgent) && (
 <>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Robot size={20} weight="duotone" className="text-emerald-500" />
 {selectedAgent ? `${selectedAgent.name} — Configuration` : `Agents for ${selectedConnector?.name}`}
 </DialogTitle>
 <DialogDescription className="text-zinc-400">
 Configure AI agent permissions and behavior. SOC managers control what each agent can do.
 </DialogDescription>
 </DialogHeader>

 <AgentConfigPanel
 connector={selectedConnector}
 agent={selectedAgent}
 connectorStates={connectorStates}
 onUpdatePermission={(agentId, level) => {
 if (!selectedConnector) return;
 setConnectorStates(prev => ({
 ...prev,
 [selectedConnector.id]: {
 ...prev[selectedConnector.id],
 agentPermissions: {
 ...prev[selectedConnector.id]?.agentPermissions,
 [agentId]: level,
 },
 },
 }));
 }}
 />
 </>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}

// ─── Connect Form ────────────────────────────────────────────────────────────

function ConnectForm({
 connector,
 onSubmit,
 onCancel,
}: {
 connector: ConnectorManifest;
 onSubmit: (auth: Record<string, string>) => void;
 onCancel: () => void;
}) {
 const [authMethod, setAuthMethod] = useState(connector.authMethods[0]);
 const [fields, setFields] = useState<Record<string, string>>({});

 const updateField = (key: string, value: string) => setFields(prev => ({ ...prev, [key]: value }));

 const renderAuthFields = () => {
 switch (authMethod) {
 case 'service_principal':
 return (
 <>
 <div className="space-y-2">
 <Label className="text-zinc-300">Tenant ID</Label>
 <Input className="bg-zinc-800 border-zinc-700" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={fields.tenantId ?? ''} onChange={e => updateField('tenantId', e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label className="text-zinc-300">Client ID</Label>
 <Input className="bg-zinc-800 border-zinc-700" placeholder="App registration client ID" value={fields.clientId ?? ''} onChange={e => updateField('clientId', e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label className="text-zinc-300">Client Secret</Label>
 <Input type="password" className="bg-zinc-800 border-zinc-700" placeholder="App registration secret" value={fields.clientSecret ?? ''} onChange={e => updateField('clientSecret', e.target.value)} />
 </div>
 </>
 );
 case 'api_key':
 return (
 <>
 <div className="space-y-2">
 <Label className="text-zinc-300">API Base URL</Label>
 <Input className="bg-zinc-800 border-zinc-700" placeholder="https://api.example.com" value={fields.baseUrl ?? ''} onChange={e => updateField('baseUrl', e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label className="text-zinc-300">API Key</Label>
 <Input type="password" className="bg-zinc-800 border-zinc-700" placeholder="Your API key" value={fields.apiKey ?? ''} onChange={e => updateField('apiKey', e.target.value)} />
 </div>
 </>
 );
 case 'bearer_token':
 return (
 <div className="space-y-2">
 <Label className="text-zinc-300">Bearer Token</Label>
 <Input type="password" className="bg-zinc-800 border-zinc-700" placeholder="Token" value={fields.token ?? ''} onChange={e => updateField('token', e.target.value)} />
 </div>
 );
 case 'basic':
 return (
 <>
 <div className="space-y-2">
 <Label className="text-zinc-300">API Base URL</Label>
 <Input className="bg-zinc-800 border-zinc-700" placeholder="https://api.example.com" value={fields.baseUrl ?? ''} onChange={e => updateField('baseUrl', e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label className="text-zinc-300">Username</Label>
 <Input className="bg-zinc-800 border-zinc-700" value={fields.username ?? ''} onChange={e => updateField('username', e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label className="text-zinc-300">Password</Label>
 <Input type="password" className="bg-zinc-800 border-zinc-700" value={fields.password ?? ''} onChange={e => updateField('password', e.target.value)} />
 </div>
 </>
 );
 case 'oauth2':
 return (
 <div className="p-4 rounded-lg bg-transparent text-center">
 <Globe size={32} weight="duotone" className="text-blue-500 mx-auto mb-2" />
 <p className="text-sm text-zinc-300 mb-3">Click below to authenticate via OAuth2</p>
 <Button className="bg-blue-600 hover:bg-blue-500">
 <ArrowSquareOut size={16} weight="bold" className="mr-2" /> Authorize with {connector.vendor}
 </Button>
 </div>
 );
 default:
 return null;
 }
 };

 const agents = getAgentsForConnector(connector.id);

 return (
 <div className="space-y-4">
 {/* Auth method selector */}
 {connector.authMethods.length > 1 && (
 <div className="space-y-2">
 <Label className="text-zinc-300">Authentication Method</Label>
 <Select value={authMethod} onValueChange={v => setAuthMethod(v as any)}>
 <SelectTrigger className="border-zinc-700">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="border-zinc-700">
 {connector.authMethods.map(m => (
 <SelectItem key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 {renderAuthFields()}

 {/* Credential Setup Guide */}
 {connector.authGuide && (
 <div className="p-3 rounded-lg bg-transparent">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <Key size={16} weight="bold" className="text-blue-500" />
 <span className="text-xs font-medium text-blue-500">Get Your Credentials</span>
 </div>
 {connector.authGuide.credentialUrl && (
 <a
 href={connector.authGuide.credentialUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-500 transition-colors"
 >
 {connector.authGuide.credentialLabel} <ArrowSquareOut size={12} weight="bold" />
 </a>
 )}
 </div>

 {/* Setup steps */}
 <ol className="space-y-1 mb-2">
 {connector.authGuide.steps.map((step, i) => (
 <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
 <span className="text-blue-500/70 font-mono mt-0.5 shrink-0">{i + 1}.</span>
 <span>{step}</span>
 </li>
 ))}
 </ol>

 {/* Notes/warnings */}
 {connector.authGuide.notes && connector.authGuide.notes.length > 0 && (
 <div className="mt-2 pt-2 border-t border-white/[0.04]">
 {connector.authGuide.notes.map((note, i) => (
 <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-500/70 mb-1">
 <Warning size={12} weight="bold" className="mt-0.5 shrink-0" />
 <span>{note}</span>
 </div>
 ))}
 </div>
 )}

 {/* Token format & expiry */}
 <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/[0.04]">
 {connector.authGuide.tokenFormat && (
 <span className="text-[10px] text-zinc-500">
 Format: <code className="text-zinc-400 bg-white/[0.05] px-1 rounded">{connector.authGuide.tokenFormat}</code>
 </span>
 )}
 {connector.authGuide.tokenExpiry && (
 <span className="text-[10px] text-zinc-500">
 Expires: <span className="text-zinc-400">{connector.authGuide.tokenExpiry}</span>
 </span>
 )}
 </div>

 {/* Setup docs link */}
 {connector.authGuide.setupDocsUrl && (
 <a
 href={connector.authGuide.setupDocsUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
 >
 Full setup documentation <ArrowSquareOut size={10} weight="bold" />
 </a>
 )}
 </div>
 )}

 {/* Required permissions info */}
 {connector.requiredPermissions && (
 <div className="p-3 rounded-lg bg-transparent">
 <div className="flex items-center gap-2 mb-2">
 <Key size={16} weight="bold" className="text-amber-500" />
 <span className="text-xs font-medium text-zinc-300">Required Permissions</span>
 </div>
 <div className="flex flex-wrap gap-1">
 {connector.requiredPermissions.map(p => (
 <span key={p} className="text-[10px] text-zinc-400">{p}</span>
 ))}
 </div>
 </div>
 )}

 {/* Agents that will activate */}
 <div className="p-3 rounded-lg bg-transparent">
 <div className="flex items-center gap-2 mb-2">
 <Robot size={16} weight="bold" className="text-emerald-500" />
 <span className="text-xs font-medium text-emerald-500">AI Agents (auto-activate on connect)</span>
 </div>
 <div className="space-y-1.5">
 {agents.map(agent => (
 <div key={agent.id} className="flex items-center justify-between">
 <span className="text-xs text-zinc-300">{agent.name}</span>
 <span className={`text-[10px] ${PERMISSION_COLORS[agent.permissionLevel]}`}>{agent.permissionLevel}</span>
 </div>
 ))}
 </div>
 </div>

 <DialogFooter>
 <Button variant="ghost" onClick={onCancel} className="text-zinc-400">Cancel</Button>
 <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => onSubmit(fields)}>
 <PlugsConnected size={16} weight="bold" className="mr-2" /> Connect & Activate Agents
 </Button>
 </DialogFooter>
 </div>
 );
}

// ─── Agent Config Panel ──────────────────────────────────────────────────────

function AgentConfigPanel({
 connector,
 agent: singleAgent,
 connectorStates,
 onUpdatePermission,
}: {
 connector: ConnectorManifest | null;
 agent: AgentRole | null;
 connectorStates: Record<string, ConnectorState>;
 onUpdatePermission: (agentId: string, level: AgentPermissionLevel) => void;
}) {
 const agents = singleAgent
 ? [singleAgent]
 : connector
 ? getAgentsForConnector(connector.id)
 : [];

 const permissionLevels: AgentPermissionLevel[] = ['observe', 'triage', 'respond', 'contain', 'admin'];

 return (
 <div className="space-y-4">
 {agents.map(agent => (
 <Card key={agent.id} className="bg-transparent">
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Robot size={16} weight="bold" className="text-emerald-500" />
 <CardTitle className="text-sm text-white">{agent.name}</CardTitle>
 </div>
 <Switch defaultChecked={agent.enabled} />
 </div>
 <CardDescription className="text-xs text-zinc-400">{agent.description}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 {/* Permission Level */}
 <div className="space-y-1.5">
 <Label className="text-xs text-zinc-400">Permission Level</Label>
 <Select
 defaultValue={agent.permissionLevel}
 onValueChange={v => onUpdatePermission(agent.id, v as AgentPermissionLevel)}
 >
 <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-700">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-zinc-900 border-zinc-700">
 {permissionLevels.map(level => (
 <SelectItem key={level} value={level}>
 <div className="flex items-center gap-2">
 {level === 'observe' && <Eye size={12} weight="bold" className="text-blue-500" />}
 {level === 'triage' && <Funnel size={12} weight="bold" className="text-amber-500" />}
 {level === 'respond' && <Lightning size={12} weight="bold" className="text-orange-500" />}
 {level === 'contain' && <Lock size={12} weight="bold" className="text-red-500" />}
 {level === 'admin' && <Key size={12} weight="bold" className="text-violet-500" />}
 <span className="capitalize">{level}</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Allowed Tools */}
 <div className="space-y-1.5">
 <Label className="text-xs text-zinc-400">MCP Tools ({agent.allowedTools.length})</Label>
 <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
 {agent.allowedTools.map(tool => (
 <span key={tool} className="text-[10px] text-zinc-400 font-mono">{tool}</span>
 ))}
 </div>
 </div>

 {/* Requires Approval */}
 {agent.requiresApprovalFor.length > 0 && (
 <div className="space-y-1.5">
 <Label className="text-xs text-amber-500 flex items-center gap-1">
 <Warning size={12} weight="bold" /> Requires Human Approval
 </Label>
 <div className="flex flex-wrap gap-1">
 {agent.requiresApprovalFor.map(tool => (
 <span key={tool} className="text-[10px] text-red-500 font-mono">{tool}</span>
 ))}
 </div>
 </div>
 )}

 {/* Escalation */}
 {agent.escalatesTo && (
 <div className="flex items-center gap-2 text-xs text-zinc-500">
 <ArrowRight size={12} weight="bold" />
 Escalates to: <span className="text-zinc-300">{AGENT_REGISTRY.find(a => a.id === agent.escalatesTo)?.name}</span>
 </div>
 )}

 {/* Model */}
 <div className="flex items-center justify-between text-xs text-zinc-500">
 <span>Model: <span className="text-zinc-300 font-mono">{agent.model}</span></span>
 <span>Max actions/incident: <span className="text-zinc-300">{agent.maxActionsPerIncident}</span></span>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}
