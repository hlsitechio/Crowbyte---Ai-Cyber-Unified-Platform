/**
 * Setup Wizard — First-Run Onboarding Experience
 *
 * Multi-step wizard that runs on first launch:
 * 1. Welcome + EULA acceptance
 * 2. License key activation
 * 3. Infrastructure config (Supabase)
 * 4. VPS/Fleet setup (optional)
 * 5. Workspace config
 * 6. Ready — launch dashboard
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Database, DesktopTower, BuildingOffice, Rocket, CaretRight, CaretLeft, Check, X, CircleNotch, ArrowSquareOut, Copy, Eye, EyeSlash, Lightning, Crown, Users, Terminal as TerminalIcon, Warning, CheckCircle, XCircle, Info, ArrowRight, Sparkle } from "@phosphor-icons/react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { setupService, type SetupConfig } from '@/services/setupService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StepProps {
 onNext: () => void;
 onBack: () => void;
 config: SetupConfig;
}

const EULA_VERSION = '1.0.0';

const STEPS = [
 { id: 'welcome', label: 'Welcome', icon: Shield },
 { id: 'license', label: 'License', icon: Key },
 { id: 'database', label: 'Database', icon: Database },
 { id: 'vps', label: 'VPS Setup', icon: DesktopTower },
 { id: 'workspace', label: 'Workspace', icon: BuildingOffice },
 { id: 'ready', label: 'Launch', icon: Rocket },
];

// ─── Step 1: Welcome + EULA ────────────────────────────────────────────────

function WelcomeStep({ onNext }: StepProps) {
 const [eulaAccepted, setEulaAccepted] = useState(false);
 const [aupAccepted, setAupAccepted] = useState(false);
 const [showEula, setShowEula] = useState(false);

 const handleAccept = () => {
 if (!eulaAccepted || !aupAccepted) {
 toast.error('You must accept both the EULA and Acceptable Use Policy');
 return;
 }
 setupService.acceptEula(EULA_VERSION);
 onNext();
 };

 return (
 <div className="space-y-6">
 <div className="text-center space-y-3">
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', stiffness: 200, damping: 15 }}
 className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
 >
 <Shield className="w-10 h-10 text-white" />
 </motion.div>
 <h2 className="text-2xl font-bold text-white">Welcome to CrowByte Terminal</h2>
 <p className="text-zinc-400 max-w-md mx-auto">
 Offensive security command center for penetration testing, vulnerability assessment, and red team operations.
 </p>
 </div>

 <Separator className="bg-white/[0.06]" />

 {/* Version + Legal */}
 <div className="space-y-4">
 <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900 border">
 <div>
 <p className="text-sm font-medium text-white">CrowByte Terminal v2.0.0</p>
 <p className="text-xs text-zinc-500">HLSITech — Proprietary License</p>
 </div>
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
 <span className="text-blue-400">First Run</span>
 </span>
 </div>

 {/* EULA Preview */}
 <div className="space-y-2">
 <Button
 variant="ghost"
 className="w-full justify-between text-sm text-zinc-400 hover:text-white"
 onClick={() => setShowEula(!showEula)}
 >
 <span>End User License Agreement (EULA v{EULA_VERSION})</span>
 {showEula ? <CaretLeft size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
 </Button>
 <AnimatePresence>
 {showEula && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="max-h-48 overflow-y-auto rounded-lg bg-zinc-950 border p-4 text-xs text-zinc-400 font-mono">
 <p className="text-amber-500 font-bold mb-2">DUAL-USE SOFTWARE WARNING</p>
 <p className="mb-2">
 CrowByte Terminal contains offensive security tools that can damage target systems.
 You MUST obtain explicit, written authorization from system owners before any testing.
 </p>
 <p className="mb-2">
 By accepting this agreement, you acknowledge that:
 </p>
 <ul className="list-disc pl-4 space-y-1 mb-2">
 <li>You will only use CrowByte for authorized security testing</li>
 <li>You are solely responsible for compliance with all applicable laws</li>
 <li>You accept full liability for any damage caused by your use</li>
 <li>You will not use CrowByte for unauthorized access, surveillance, or malware development</li>
 <li>CrowByte is subject to U.S. export controls (EAR/ECCN 5D002)</li>
 </ul>
 <p className="text-zinc-500">
 Full EULA, Privacy Policy, and Acceptable Use Policy available at crowbyte.io/legal
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Checkboxes */}
 <div className="space-y-3 px-1">
 <label className="flex items-start gap-3 cursor-pointer group">
 <Checkbox
 checked={eulaAccepted}
 onCheckedChange={(v) => setEulaAccepted(v === true)}
 className="mt-0.5"
 />
 <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
 I have read and accept the <span className="text-blue-400 underline">End User License Agreement</span> and <span className="text-blue-400 underline">Privacy Policy</span>
 </span>
 </label>

 <label className="flex items-start gap-3 cursor-pointer group">
 <Checkbox
 checked={aupAccepted}
 onCheckedChange={(v) => setAupAccepted(v === true)}
 className="mt-0.5"
 />
 <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
 I accept the <span className="text-blue-400 underline">Acceptable Use Policy</span> and confirm I will only use CrowByte for <span className="text-amber-500">authorized security testing</span>
 </span>
 </label>
 </div>
 </div>

 <Button
 className="w-full bg-blue-600 hover:bg-blue-500 text-white"
 disabled={!eulaAccepted || !aupAccepted}
 onClick={handleAccept}
 >
 Accept & Continue
 <CaretRight size={16} weight="bold" className="ml-2" />
 </Button>
 </div>
 );
}

// ─── Step 2: License Key ───────────────────────────────────────────────────

function LicenseStep({ onNext, onBack }: StepProps) {
 const [licenseKey, setLicenseKey] = useState('');
 const [loading, setLoading] = useState(false);
 const [showKey, setShowKey] = useState(false);
 const [result, setResult] = useState<{ valid: boolean; tier: string; error?: string } | null>(null);

 const tiers = [
 {
 id: 'community',
 name: 'Community',
 price: 'Free',
 icon: TerminalIcon,
 color: 'text-zinc-400',
 bg: 'bg-white/[0.05]',
 features: ['3 targets', '3 endpoints', 'AI chat', 'Core scanning tools', 'CVE database'],
 },
 {
 id: 'professional',
 name: 'Professional',
 price: '$299-499/yr',
 icon: Lightning,
 color: 'text-blue-500',
 bg: 'bg-transparent',
 features: ['Unlimited targets', '25 endpoints', 'VPS agents', 'Fleet management', 'Remote desktop', 'API access', 'Export reports'],
 },
 {
 id: 'team',
 name: 'Team',
 price: '$799-1,499/yr',
 icon: Users,
 color: 'text-violet-500',
 bg: 'bg-transparent',
 features: ['Everything in Pro', 'Unlimited endpoints', 'Team collaboration', 'Custom agents', 'Priority support'],
 },
 {
 id: 'enterprise',
 name: 'Enterprise',
 price: 'Custom',
 icon: Crown,
 color: 'text-amber-500',
 bg: 'bg-transparent',
 features: ['Everything in Team', 'SSO/SAML', 'SLA', 'On-prem option', 'Dedicated support'],
 },
 ];

 const handleActivate = async () => {
 setLoading(true);
 setResult(null);
 try {
 const res = await setupService.activateLicense(licenseKey);
 setResult(res);
 if (res.valid) {
 toast.success(`License activated — ${res.tier} tier`);
 }
 } catch (err) {
 setResult({ valid: false, tier: 'community', error: 'Activation failed' });
 } finally {
 setLoading(false);
 }
 };

 const handleCommunity = async () => {
 setLoading(true);
 const res = await setupService.activateLicense('community');
 setResult(res);
 setLoading(false);
 toast.success('Community tier activated');
 };

 return (
 <div className="space-y-6">
 <div className="text-center space-y-2">
 <h2 className="text-xl font-bold text-white">Activate Your License</h2>
 <p className="text-sm text-zinc-400">Enter your license key or continue with the free Community tier.</p>
 </div>

 {/* Tier cards */}
 <div className="grid grid-cols-2 gap-3">
 {tiers.map((tier) => (
 <Card key={tier.id} className={`${tier.bg} hover:transition-colors cursor-default`}>
 <CardContent className="p-3 space-y-2">
 <div className="flex items-center gap-2">
 <tier.icon size={16} weight="bold" className={`${tier.color}`} />
 <span className={`text-sm font-semibold ${tier.color}`}>{tier.name}</span>
 </div>
 <p className="text-xs font-mono text-zinc-300">{tier.price}</p>
 <ul className="text-[10px] text-zinc-500 space-y-0.5">
 {tier.features.map((f) => (
 <li key={f} className="flex items-center gap-1">
 <Check size={10} weight="bold" className="text-blue-400 flex-shrink-0" />
 {f}
 </li>
 ))}
 </ul>
 </CardContent>
 </Card>
 ))}
 </div>

 <Separator className="bg-white/[0.06]" />

 {/* License key input */}
 <div className="space-y-3">
 <Label className="text-sm text-zinc-300">License Key</Label>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Input
 type={showKey ? 'text' : 'password'}
 placeholder="CB-PRO-XXXX-XXXX-XXXX-XXXX"
 value={licenseKey}
 onChange={(e) => { setLicenseKey(e.target.value); setResult(null); }}
 className="bg-zinc-900 border-zinc-700 text-white font-mono pr-10"
 />
 <Button
 variant="ghost"
 size="sm" className="h-7 w-7 absolute right-1 top-1/2 -translate-y-1/2 p-0"
 onClick={() => setShowKey(!showKey)}
 >
 {showKey ? <EyeSlash size={14} weight="bold" /> : <Eye size={14} weight="bold" />}
 </Button>
 </div>
 <Button
 onClick={handleActivate}
 disabled={!licenseKey || loading}
 className="bg-blue-600 hover:bg-blue-500"
 >
 {loading ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : 'Activate'}
 </Button>
 </div>

 {/* Result */}
 {result && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
 result.valid ? 'bg-transparent text-blue-400' : 'bg-transparent text-red-500'
 }`}
 >
 {result.valid ? <CheckCircle size={16} weight="bold" /> : <XCircle size={16} weight="bold" />}
 {result.valid ? `Activated: ${result.tier} tier` : result.error}
 </motion.div>
 )}

 <p className="text-xs text-zinc-600">
 Don't have a key? <button className="text-blue-400 hover:underline" onClick={handleCommunity}>Start with Community (free)</button> or <a href="https://crowbyte.io/pricing" target="_blank" className="text-blue-400 hover:underline">purchase a license</a>.
 </p>
 </div>

 {/* Nav */}
 <div className="flex justify-between">
 <Button variant="ghost" onClick={onBack} className="text-zinc-400">
 <CaretLeft size={16} weight="bold" className="mr-2" /> Back
 </Button>
 <Button
 onClick={onNext}
 disabled={!result?.valid}
 className="bg-blue-600 hover:bg-blue-500"
 >
 Continue <CaretRight size={16} weight="bold" className="ml-2" />
 </Button>
 </div>
 </div>
 );
}

// ─── Step 3: Database (Supabase) ───────────────────────────────────────────

function DatabaseStep({ onNext, onBack }: StepProps) {
 const [supabaseUrl, setSupabaseUrl] = useState('');
 const [anonKey, setAnonKey] = useState('');
 const [testing, setTesting] = useState(false);
 const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [errorMsg, setErrorMsg] = useState('');
 const [useHosted, setUseHosted] = useState(false);

 const handleTest = async () => {
 if (!supabaseUrl || !anonKey) {
 toast.error('Both URL and Anon Key are required');
 return;
 }
 setTesting(true);
 setStatus('idle');
 const result = await setupService.configureSupabase(supabaseUrl, anonKey);
 setTesting(false);
 if (result.connected) {
 setStatus('success');
 toast.success('Supabase connected');
 } else {
 setStatus('error');
 setErrorMsg(result.error || 'Connection failed');
 toast.error(result.error || 'Connection failed');
 }
 };

 const handleHosted = () => {
 setUseHosted(true);
 setSupabaseUrl('https://hosted.crowbyte.io');
 setAnonKey('managed');
 setStatus('success');
 toast.success('Using CrowByte hosted database');
 };

 return (
 <div className="space-y-6">
 <div className="text-center space-y-2">
 <h2 className="text-xl font-bold text-white">Connect Your Database</h2>
 <p className="text-sm text-zinc-400">CrowByte uses Supabase (PostgreSQL) for CVEs, knowledge base, bookmarks, and more.</p>
 </div>

 {/* Options */}
 <div className="grid grid-cols-2 gap-3">
 <Card
 className={`cursor-pointer transition-all ${useHosted ? 'border-blue-500 bg-transparent' : ' hover:'}`}
 onClick={handleHosted}
 >
 <CardContent className="p-4 text-center space-y-2">
 <Sparkle size={32} weight="duotone" className="text-blue-400 mx-auto" />
 <p className="text-sm font-semibold text-white">CrowByte Hosted</p>
 <p className="text-[10px] text-zinc-500">We manage everything. Zero config.</p>
 <span className="text-[10px] text-blue-400">Recommended</span>
 </CardContent>
 </Card>

 <Card
 className={`cursor-pointer transition-all ${!useHosted && supabaseUrl ? 'border-blue-500 bg-transparent' : ' hover:'}`}
 onClick={() => setUseHosted(false)}
 >
 <CardContent className="p-4 text-center space-y-2">
 <Database size={32} weight="duotone" className="text-blue-500 mx-auto" />
 <p className="text-sm font-semibold text-white">Self-Hosted</p>
 <p className="text-[10px] text-zinc-500">Your own Supabase instance.</p>
 <span className="text-[10px] text-blue-500">Enterprise</span>
 </CardContent>
 </Card>
 </div>

 {/* Self-hosted config */}
 {!useHosted && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="space-y-3"
 >
 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">Supabase Project URL</Label>
 <Input
 placeholder="https://your-project.supabase.co"
 value={supabaseUrl}
 onChange={(e) => { setSupabaseUrl(e.target.value); setStatus('idle'); }}
 className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">Anon (Public) Key</Label>
 <Input
 placeholder="eyJhbGciOiJIUzI1NiIs..."
 value={anonKey}
 onChange={(e) => { setAnonKey(e.target.value); setStatus('idle'); }}
 className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
 />
 </div>
 <Button
 variant="outline"
 className="w-full border-zinc-700"
 onClick={handleTest}
 disabled={testing || !supabaseUrl || !anonKey}
 >
 {testing ? <CircleNotch size={16} weight="bold" className="animate-spin mr-2" /> : <Database size={16} weight="bold" className="mr-2" />}
 Test Connection
 </Button>
 </motion.div>
 )}

 {/* Status */}
 {status !== 'idle' && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
 status === 'success' ? 'bg-transparent text-blue-400' : 'bg-transparent text-red-500'
 }`}
 >
 {status === 'success' ? <CheckCircle size={16} weight="bold" /> : <XCircle size={16} weight="bold" />}
 {status === 'success' ? (useHosted ? 'CrowByte hosted database selected' : 'Database connected') : errorMsg}
 </motion.div>
 )}

 <div className="flex justify-between">
 <Button variant="ghost" onClick={onBack} className="text-zinc-400">
 <CaretLeft size={16} weight="bold" className="mr-2" /> Back
 </Button>
 <Button
 onClick={onNext}
 disabled={status !== 'success'}
 className="bg-blue-600 hover:bg-blue-500"
 >
 Continue <CaretRight size={16} weight="bold" className="ml-2" />
 </Button>
 </div>
 </div>
 );
}

// ─── Step 4: VPS Setup (Optional) ──────────────────────────────────────────

function VpsStep({ onNext, onBack, config }: StepProps) {
 const [vpsHost, setVpsHost] = useState('');
 const [vpsIp, setVpsIp] = useState('');
 const [vpsPort, setVpsPort] = useState('18789');
 const [testing, setTesting] = useState(false);
 const [status, setStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle');
 const [statusMsg, setStatusMsg] = useState('');

 const isPro = config.licenseTier !== 'community';

 const handleTest = async () => {
 setTesting(true);
 setStatus('idle');
 const result = await setupService.configureVps(vpsHost, vpsIp, parseInt(vpsPort));
 setTesting(false);
 if (result.reachable) {
 setStatus('success');
 setStatusMsg('VPS gateway reachable');
 } else {
 setStatus('warning');
 setStatusMsg(result.error || 'Config saved but VPS unreachable');
 }
 };

 const handleSkip = () => {
 setupService.configureVps('', '', 0);
 onNext();
 };

 return (
 <div className="space-y-6">
 <div className="text-center space-y-2">
 <h2 className="text-xl font-bold text-white">VPS Agent Swarm</h2>
 <p className="text-sm text-zinc-400">
 Connect to a remote VPS for AI agent orchestration, remote desktop, and distributed scanning.
 </p>
 </div>

 {!isPro && (
 <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-transparent">
 <Warning size={20} weight="duotone" className="text-amber-500 flex-shrink-0" />
 <div className="text-sm">
 <p className="text-amber-500 font-medium">Professional+ Required</p>
 <p className="text-amber-500/70 text-xs">VPS agents are available on Professional, Team, and Enterprise plans.</p>
 </div>
 </div>
 )}

 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">Hostname</Label>
 <Input
 placeholder="vps.example.com"
 value={vpsHost}
 onChange={(e) => setVpsHost(e.target.value)}
 disabled={!isPro}
 className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">IP Address</Label>
 <Input
 placeholder="10.0.0.1"
 value={vpsIp}
 onChange={(e) => setVpsIp(e.target.value)}
 disabled={!isPro}
 className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">Gateway Port</Label>
 <Input
 placeholder="18789"
 value={vpsPort}
 onChange={(e) => setVpsPort(e.target.value)}
 disabled={!isPro}
 className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm w-32"
 />
 </div>

 {isPro && (
 <Button
 variant="outline"
 className="w-full border-zinc-700"
 onClick={handleTest}
 disabled={testing || (!vpsHost && !vpsIp)}
 >
 {testing ? <CircleNotch size={16} weight="bold" className="animate-spin mr-2" /> : <DesktopTower size={16} weight="bold" className="mr-2" />}
 Test VPS Connection
 </Button>
 )}
 </div>

 {status !== 'idle' && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
 status === 'success' ? 'bg-transparent text-blue-400' :
 status === 'warning' ? 'bg-transparent text-amber-500' :
 'bg-transparent text-red-500'
 }`}
 >
 {status === 'success' ? <CheckCircle size={16} weight="bold" /> :
 status === 'warning' ? <Info size={16} weight="bold" /> :
 <XCircle size={16} weight="bold" />}
 {statusMsg}
 </motion.div>
 )}

 <div className="flex justify-between">
 <Button variant="ghost" onClick={onBack} className="text-zinc-400">
 <CaretLeft size={16} weight="bold" className="mr-2" /> Back
 </Button>
 <div className="flex gap-2">
 <Button variant="ghost" onClick={handleSkip} className="text-zinc-500">
 Skip for now
 </Button>
 <Button
 onClick={onNext}
 disabled={isPro && !vpsHost && !vpsIp && status === 'idle'}
 className="bg-blue-600 hover:bg-blue-500"
 >
 Continue <CaretRight size={16} weight="bold" className="ml-2" />
 </Button>
 </div>
 </div>
 </div>
 );
}

// ─── Step 5: Workspace ─────────────────────────────────────────────────────

function WorkspaceStep({ onNext, onBack }: StepProps) {
 const [workspaceName, setWorkspaceName] = useState('');
 const [adminEmail, setAdminEmail] = useState('');

 const handleContinue = () => {
 if (!workspaceName) {
 toast.error('Workspace name is required');
 return;
 }
 setupService.setWorkspace(workspaceName, adminEmail);
 onNext();
 };

 return (
 <div className="space-y-6">
 <div className="text-center space-y-2">
 <h2 className="text-xl font-bold text-white">Name Your Workspace</h2>
 <p className="text-sm text-zinc-400">This is your security operations home base.</p>
 </div>

 <div className="space-y-4">
 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">Workspace Name</Label>
 <Input
 placeholder="ACME Red Team"
 value={workspaceName}
 onChange={(e) => setWorkspaceName(e.target.value)}
 className="bg-zinc-900 border-zinc-700 text-white text-lg"
 autoFocus
 />
 <p className="text-xs text-zinc-600">Displayed in the sidebar and title bar.</p>
 </div>

 <div className="space-y-2">
 <Label className="text-sm text-zinc-300">Admin Email <span className="text-zinc-600">(optional)</span></Label>
 <Input
 type="email"
 placeholder="admin@example.com"
 value={adminEmail}
 onChange={(e) => setAdminEmail(e.target.value)}
 className="bg-zinc-900 border-zinc-700 text-white"
 />
 <p className="text-xs text-zinc-600">For license management and support.</p>
 </div>
 </div>

 <div className="flex justify-between">
 <Button variant="ghost" onClick={onBack} className="text-zinc-400">
 <CaretLeft size={16} weight="bold" className="mr-2" /> Back
 </Button>
 <Button
 onClick={handleContinue}
 disabled={!workspaceName}
 className="bg-blue-600 hover:bg-blue-500"
 >
 Continue <CaretRight size={16} weight="bold" className="ml-2" />
 </Button>
 </div>
 </div>
 );
}

// ─── Step 6: Ready ─────────────────────────────────────────────────────────

function ReadyStep({ onNext, config }: StepProps) {
 const handleLaunch = () => {
 setupService.completeSetup();
 onNext();
 };

 const tierColors: Record<string, string> = {
 community: 'text-zinc-400',
 professional: 'text-blue-500',
 team: 'text-violet-500',
 enterprise: 'text-amber-500',
 };

 return (
 <div className="space-y-6">
 <div className="text-center space-y-3">
 <motion.div
 initial={{ scale: 0, rotate: -180 }}
 animate={{ scale: 1, rotate: 0 }}
 transition={{ type: 'spring', stiffness: 200, damping: 15 }}
 className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
 >
 <Rocket className="w-10 h-10 text-white" />
 </motion.div>
 <h2 className="text-2xl font-bold text-white">You're All Set</h2>
 <p className="text-sm text-zinc-400">CrowByte Terminal is configured and ready to launch.</p>
 </div>

 {/* Summary */}
 <div className="space-y-2 bg-zinc-900 rounded-lg border p-4">
 <div className="flex justify-between items-center">
 <span className="text-sm text-zinc-500">License</span>
 <span className={`text-sm font-semibold capitalize ${tierColors[config.licenseTier]}`}>
 {config.licenseTier}
 </span>
 </div>
 <Separator className="bg-white/[0.06]" />
 <div className="flex justify-between items-center">
 <span className="text-sm text-zinc-500">Database</span>
 <span className="text-sm text-blue-400">
 {config.supabaseUrl ? 'Connected' : 'Hosted'}
 </span>
 </div>
 <Separator className="bg-white/[0.06]" />
 <div className="flex justify-between items-center">
 <span className="text-sm text-zinc-500">VPS</span>
 <span className="text-sm text-zinc-300">
 {config.vpsEnabled ? `${config.vpsHost || config.vpsIp}` : 'Not configured'}
 </span>
 </div>
 <Separator className="bg-white/[0.06]" />
 <div className="flex justify-between items-center">
 <span className="text-sm text-zinc-500">Workspace</span>
 <span className="text-sm text-white font-medium">{config.workspaceName}</span>
 </div>
 </div>

 <Button
 className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-semibold shadow-lg shadow-blue-500/20"
 onClick={handleLaunch}
 >
 <Rocket size={20} weight="duotone" className="mr-2" />
 Launch CrowByte
 </Button>

 <p className="text-center text-xs text-zinc-600">
 You can change these settings anytime in Settings → Configuration
 </p>
 </div>
 );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
 const [currentStep, setCurrentStep] = useState(0);
 const [config, setConfig] = useState<SetupConfig>(setupService.getConfig());

 const refreshConfig = useCallback(() => {
 setConfig(setupService.getConfig());
 }, []);

 const goNext = () => {
 refreshConfig();
 if (currentStep === STEPS.length - 1) {
 onComplete();
 return;
 }
 setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
 };

 const goBack = () => {
 setCurrentStep((s) => Math.max(s - 1, 0));
 };

 const stepComponents = [
 WelcomeStep,
 LicenseStep,
 DatabaseStep,
 VpsStep,
 WorkspaceStep,
 ReadyStep,
 ];

 const CurrentStepComponent = stepComponents[currentStep];

 return (
 <div className="min-h-screen bg-black flex items-center justify-center p-4">
 {/* Background grid effect */}
 <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
 <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="relative z-10 w-full max-w-xl"
 >
 {/* Progress bar */}
 <div className="mb-6">
 <div className="flex items-center justify-between mb-3">
 {STEPS.map((step, i) => {
 const Icon = step.icon;
 const isActive = i === currentStep;
 const isDone = i < currentStep;
 return (
 <div key={step.id} className="flex items-center">
 <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
 isActive ? 'bg-transparent text-blue-400' :
 isDone ? 'text-blue-400' : 'text-zinc-600'
 }`}>
 {isDone ? (
 <Check size={14} weight="bold" />
 ) : (
 <Icon size={14} weight="bold" />
 )}
 <span className="hidden sm:inline">{step.label}</span>
 </div>
 {i < STEPS.length - 1 && (
 <div className={`w-4 sm:w-8 h-px mx-1 ${isDone ? 'bg-blue-500' : 'bg-white/[0.08]'}`} />
 )}
 </div>
 );
 })}
 </div>
 {/* Progress line */}
 <div className="h-0.5 bg-white/[0.08] rounded-full overflow-hidden">
 <motion.div
 className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
 animate={{ width: `${((currentStep) / (STEPS.length - 1)) * 100}%` }}
 transition={{ duration: 0.3 }}
 />
 </div>
 </div>

 {/* Step content */}
 <div className="bg-zinc-950 border rounded-xl p-6 shadow-2xl">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentStep}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.2 }}
 >
 <CurrentStepComponent onNext={goNext} onBack={goBack} config={config} />
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Footer */}
 <p className="text-center text-[10px] text-zinc-700 mt-4">
 CrowByte Terminal v2.0.0 — HLSITech — crowbyte.io
 </p>
 </motion.div>
 </div>
 );
}
