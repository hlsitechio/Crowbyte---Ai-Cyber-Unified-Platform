import { useState, useEffect } from"react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { Brain, TrendUp, Lightning, ArrowsClockwise, Sparkle, Robot, CheckCircle, XCircle } from"@phosphor-icons/react";
import { useToast } from"@/hooks/use-toast";
import openClaw from"@/services/openclaw";
import claudeProvider from"@/services/claude-provider";

const LLM = () => {
 const [openClawConnected, setOpenClawConnected] = useState(false);
 const [loading, setLoading] = useState(true);
 const { toast } = useToast();

 const checkConnections = async () => {
 setLoading(true);
 try {
 const health = await openClaw.healthCheck();
 setOpenClawConnected(health.ok);
 } catch {
 setOpenClawConnected(false);
 }
 setLoading(false);
 };

 useEffect(() => { checkConnections(); }, []);

 const openClawModels = openClaw.getModels();
 const claudeModels = claudeProvider.getModels();
 const totalModels = openClawModels.length + claudeModels.length;

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-white">LLM Models</h1>
 <p className="text-muted-foreground terminal-text mt-2">
 Available AI models across all providers
 </p>
 </div>
 <Button
 onClick={checkConnections}
 variant="outline"
 className="border-border text-white hover:bg-primary/10"
 disabled={loading}
 >
 <ArrowsClockwise size={16} weight="bold" className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>

 <div className="grid gap-4 md:grid-cols-3">
 <Card className="">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">Total Models</CardTitle>
 <Brain size={16} weight="bold" className="text-primary" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{totalModels}</div>
 <p className="text-xs text-muted-foreground">Across 2 providers</p>
 </CardContent>
 </Card>

 <Card className="">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">NVIDIA Free</CardTitle>
 <Lightning size={16} weight="bold" className="text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{openClawModels.length}</div>
 <p className="text-xs text-muted-foreground">
 {openClawConnected ? 'VPS Online — $0/token' : 'VPS Offline'}
 </p>
 </CardContent>
 </Card>

 <Card className="">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">Anthropic</CardTitle>
 <Sparkle size={16} weight="bold" className="text-violet-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{claudeModels.length}</div>
 <p className="text-xs text-muted-foreground">Claude Code CLI</p>
 </CardContent>
 </Card>
 </div>

 {/* Claude Models */}
 <div>
 <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
 <Sparkle size={20} weight="duotone" className="text-violet-500" />
 Anthropic (Claude Code CLI)
 </h2>
 <div className="grid gap-3">
 {claudeModels.map((model) => (
 <Card key={model.id} className="hover:border-transparent transition-colors">
 <CardContent className="flex items-center justify-between py-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
 <Sparkle size={20} weight="duotone" className="text-violet-500" />
 </div>
 <div>
 <p className="text-sm font-medium text-white">{model.name}</p>
 <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Badge className="bg-transparent text-violet-500">{model.provider}</Badge>
 <Badge className="bg-transparent text-violet-300 text-[10px]">
 200K context • Full tools
 </Badge>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>

 {/* OpenClaw Models */}
 <div>
 <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
 <Robot size={20} weight="duotone" className="text-emerald-500" />
 OpenClaw (NVIDIA Free)
 {openClawConnected ? (
 <CheckCircle size={16} weight="bold" className="text-emerald-500" />
 ) : (
 <XCircle size={16} weight="bold" className="text-red-500" />
 )}
 </h2>
 <div className="grid gap-3">
 {openClawModels.map((model) => (
 <Card key={model.id} className="hover:border-transparent transition-colors">
 <CardContent className="flex items-center justify-between py-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
 <Robot size={20} weight="duotone" className="text-emerald-500" />
 </div>
 <div>
 <p className="text-sm font-medium text-white">{model.name}</p>
 <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Badge className="bg-transparent text-emerald-500">{model.provider}</Badge>
 <Badge className="bg-transparent text-emerald-500 text-[10px]">$0 Free</Badge>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 </div>
 );
};

export default LLM;
