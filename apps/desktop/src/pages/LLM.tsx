import { useState, useEffect } from"react";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { UilBrain, UilChartGrowth, UilBolt, UilSync, UilStar, UilRobot, UilCheckCircle, UilTimesCircle } from "@iconscout/react-unicons";
import { useToast } from"@/hooks/use-toast";
import { testConnection as aiTestConnection } from "@/services/ai";

const LLM = () => {
 const [openClawConnected, setOpenClawConnected] = useState(false);
 const [loading, setLoading] = useState(true);
 const { toast } = useToast();

 const checkConnections = async () => {
 setLoading(true);
 try {
 const ok = await aiTestConnection();
 setOpenClawConnected(ok);
 } catch {
 setOpenClawConnected(false);
 }
 setLoading(false);
 };

 useEffect(() => { checkConnections(); }, []);

 const allModels = [{ id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'CrowByte AI' }];
 const totalModels = allModels.length;

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
 <UilSync size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>

 <div className="grid gap-4 md:grid-cols-3">
 <Card className="">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">Total Models</CardTitle>
 <UilBrain size={16} className="text-primary" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{totalModels}</div>
 <p className="text-xs text-muted-foreground">Across 2 providers</p>
 </CardContent>
 </Card>

 <Card className="">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">NVIDIA Free</CardTitle>
 <UilBolt size={16} className="text-emerald-500" />
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
 <UilStar size={16} className="text-violet-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{claudeModels.length}</div>
 <p className="text-xs text-muted-foreground">Claude UilBracketsCurly CLI</p>
 </CardContent>
 </Card>
 </div>

 {/* Claude Models */}
 <div>
 <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
 <UilStar size={20} className="text-violet-500" />
 Anthropic (Claude UilBracketsCurly CLI)
 </h2>
 <div className="grid gap-3">
 {claudeModels.map((model) => (
 <Card key={model.id} className="hover:border-transparent transition-colors">
 <CardContent className="flex items-center justify-between py-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
 <UilStar size={20} className="text-violet-500" />
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
 <UilRobot size={20} className="text-emerald-500" />
 OpenClaw (NVIDIA Free)
 {openClawConnected ? (
 <UilCheckCircle size={16} className="text-emerald-500" />
 ) : (
 <UilTimesCircle size={16} className="text-red-500" />
 )}
 </h2>
 <div className="grid gap-3">
 {openClawModels.map((model) => (
 <Card key={model.id} className="hover:border-transparent transition-colors">
 <CardContent className="flex items-center justify-between py-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
 <UilRobot size={20} className="text-emerald-500" />
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
