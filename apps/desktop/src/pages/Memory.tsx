import { useState, useEffect, useCallback } from"react";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Badge } from"@/components/ui/badge";
import { useToast } from"@/hooks/use-toast";
import { UilBrain, UilSearch, UilDatabase, UilBookOpen, UilClock, UilChartGrowth, UilPlus, UilSave, UilTimes, UilSpinner, UilSync, UilChannel, UilCommentDots, UilFolderOpen, UilStar, UilExclamationCircle } from "@iconscout/react-unicons";
import { memoryEngine } from"@/services/memory-engine";
import type {
 MemoryStats,
 SearchResult,
 KnowledgeEntry,
 TopicEntry,
 SessionEntry,
 ProjectEntry,
} from"@/services/memory-engine";

// ─── Stats Dashboard ───────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color ="text-primary" }: {
 label: string; value: string | number; icon: any; color?: string;
}) {
 return (
 <Card className="bg-card/50">
 <CardContent className="flex items-center gap-3 p-4">
 <div className={`rounded-md bg-primary/10 p-2 ${color}`}>
 <Icon size={20} />
 </div>
 <div>
 <p className="text-2xl font-bold text-foreground">{value}</p>
 <p className="text-xs text-muted-foreground">{label}</p>
 </div>
 </CardContent>
 </Card>
 );
}

// ─── Search Tab ────────────────────────────────────────────────────────────

function SearchTab() {
 const [query, setQuery] = useState("");
 const [results, setResults] = useState<SearchResult[]>([]);
 const [loading, setLoading] = useState(false);
 const [mode, setMode] = useState<"fts" |"semantic">("fts");

 const handleSearch = async () => {
 if (!query.trim()) return;
 setLoading(true);
 try {
 if (mode ==="semantic") {
 const data = await memoryEngine.semanticSearch(query, { limit: 20 });
 setResults(data.results.map((r) => ({
 content: r.content,
 role: r.role ||"unknown",
 session_id: r.session_id ||"",
 timestamp: r.timestamp,
 })));
 } else {
 const data = await memoryEngine.search(query, { limit: 20 });
 setResults(data.results);
 }
 } catch {
 setResults([]);
 }
 setLoading(false);
 };

 return (
 <div className="space-y-4">
 <div className="flex gap-2">
 <Input
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 onKeyDown={(e) => e.key ==="Enter" && handleSearch()}
 placeholder="Search 88K+ conversation entries..."
 className="flex-1 bg-background"
 />
 <Button
 variant={mode ==="fts" ?"default" :"outline"}
 size="sm"
 onClick={() => setMode("fts")}
 className="text-xs"
 >
 <UilSearch size={12} className="mr-1" />
 Keyword
 </Button>
 <Button
 variant={mode ==="semantic" ?"default" :"outline"}
 size="sm"
 onClick={() => setMode("semantic")}
 className="text-xs"
 >
 <UilStar size={12} className="mr-1" />
 Semantic
 </Button>
 <Button onClick={handleSearch} disabled={loading || !query.trim()} aria-label="Search memory"
 className="bg-primary text-primary-foreground hover:bg-primary/90">
 {loading ? <UilSpinner size={16} className="animate-spin" /> : <UilSearch size={16} />}
 </Button>
 </div>

 <ScrollArea className="h-[500px]">
 {results.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 {query ?"No results found" :"Search across all conversation history"}
 </div>
 ) : (
 <div className="space-y-3">
 {results.map((r, i) => (
 <Card key={i} className="p-3 bg-muted/20">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] uppercase text-zinc-400">{r.role}</span>
 {r.session_id && (
 <span className="text-[10px] text-muted-foreground font-mono">
 {r.session_id.slice(0, 8)}
 </span>
 )}
 {r.timestamp && (
 <span className="text-[10px] text-muted-foreground">
 {r.timestamp.slice(0, 16)}
 </span>
 )}
 </div>
 <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-4">
 {r.content?.slice(0, 500)}
 </p>
 </Card>
 ))}
 </div>
 )}
 </ScrollArea>
 </div>
 );
}

// ─── Knowledge Tab ─────────────────────────────────────────────────────────

function KnowledgeTab() {
 const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [isAdding, setIsAdding] = useState(false);
 const [newTopic, setNewTopic] = useState("");
 const [newSummary, setNewSummary] = useState("");
 const [newDetails, setNewDetails] = useState("");
 const [newAgent, setNewAgent] = useState("crowbyte-ui");
 const [newTags, setNewTags] = useState("");
 const { toast } = useToast();

 const loadKnowledge = useCallback(async () => {
 setLoading(true);
 try {
 const data = await memoryEngine.searchKnowledge("", { limit: 50 });
 setEntries(data.results || []);
 } catch {
 setEntries([]);
 }
 setLoading(false);
 }, []);

 useEffect(() => { loadKnowledge(); }, [loadKnowledge]);

 const handleSave = async () => {
 if (!newTopic.trim() || !newSummary.trim()) {
 toast({ title:"Validation", description:"Topic and summary required", variant:"destructive" });
 return;
 }
 try {
 const result = await memoryEngine.saveKnowledge({
 topic: newTopic,
 summary: newSummary,
 details: newDetails,
 agent: newAgent,
 tags: newTags,
 });
 toast({ title:"Saved", description: `Knowledge ${result.action}: ${newTopic}` });
 setIsAdding(false);
 setNewTopic(""); setNewSummary(""); setNewDetails(""); setNewTags("");
 loadKnowledge();
 } catch (err: any) {
 toast({ title:"Error", description: err.message, variant:"destructive" });
 }
 };

 return (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <p className="text-sm text-muted-foreground">{entries.length} knowledge entries</p>
 <div className="flex gap-2">
 <Button size="sm" variant="outline" onClick={loadKnowledge}>
 <UilSync size={12} className="mr-1" /> Refresh
 </Button>
 <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
 <UilPlus size={12} className="mr-1" /> Add
 </Button>
 </div>
 </div>

 {isAdding && (
 <Card className="p-4 bg-primary/5">
 <div className="space-y-3">
 <div>
 <Label>Topic</Label>
 <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
 placeholder="e.g., WAF Bypass — Cloudflare" className="bg-background" />
 </div>
 <div>
 <Label>Summary</Label>
 <Input value={newSummary} onChange={(e) => setNewSummary(e.target.value)}
 placeholder="One-line summary" className="bg-background" />
 </div>
 <div>
 <Label>Details</Label>
 <Textarea value={newDetails} onChange={(e) => setNewDetails(e.target.value)}
 placeholder="Detailed notes..." className="bg-background min-h-[80px]" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label>Agent</Label>
 <Input value={newAgent} onChange={(e) => setNewAgent(e.target.value)}
 className="bg-background" />
 </div>
 <div>
 <Label>Tags</Label>
 <Input value={newTags} onChange={(e) => setNewTags(e.target.value)}
 placeholder="comma,separated" className="bg-background" />
 </div>
 </div>
 <div className="flex gap-2">
 <Button onClick={handleSave} size="sm"><UilSave size={12} className="mr-1" /> Save</Button>
 <Button onClick={() => setIsAdding(false)} size="sm" variant="outline"><UilTimes size={12} className="mr-1" /> Cancel</Button>
 </div>
 </div>
 </Card>
 )}

 <ScrollArea className="h-[450px]">
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <UilSpinner size={24} className="animate-spin text-muted-foreground" />
 </div>
 ) : entries.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 No knowledge entries yet. Add one or let the AI learn.
 </div>
 ) : (
 <div className="space-y-3">
 {entries.map((entry) => (
 <Card key={entry.id} className="p-3 bg-muted/20">
 <div className="flex justify-between items-start mb-1">
 <h3 className="font-semibold text-foreground text-sm">{entry.topic}</h3>
 <Badge variant={entry.status ==="ACTIVE" ?"default" :"secondary"}
 className="text-[10px]">
 {entry.status}
 </Badge>
 </div>
 <p className="text-sm text-muted-foreground">{entry.summary}</p>
 {entry.details && (
 <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{entry.details}</p>
 )}
 <div className="flex items-center gap-2 mt-2">
 {entry.agent && (
 <span className="text-[10px] text-zinc-400">{entry.agent}</span>
 )}
 {entry.tags && entry.tags.split(",").map((tag) => (
 <span key={tag.trim()} className="text-[10px] text-primary/70">{tag.trim()}</span>
 ))}
 <span className="text-[10px] text-muted-foreground ml-auto">
 {entry.updated_at?.slice(0, 16)}
 </span>
 </div>
 </Card>
 ))}
 </div>
 )}
 </ScrollArea>
 </div>
 );
}

// ─── Topics Tab ────────────────────────────────────────────────────────────

function TopicsTab() {
 const [topics, setTopics] = useState<TopicEntry[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 (async () => {
 try {
 const data = await memoryEngine.getTopics(5, 40);
 setTopics(data.topics || []);
 } catch {
 setTopics([]);
 }
 setLoading(false);
 })();
 }, []);

 const maxCount = topics.length > 0 ? topics[0].count : 1;

 return (
 <ScrollArea className="h-[540px]">
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <UilSpinner size={24} className="animate-spin text-muted-foreground" />
 </div>
 ) : topics.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">No topics found</div>
 ) : (
 <div className="space-y-1">
 {topics.map((t, i) => (
 <div key={t.word} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/30">
 <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}</span>
 <span className="text-sm font-mono text-foreground w-40 truncate">{t.word}</span>
 <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
 <div
 className="h-full bg-primary/60 rounded"
 style={{ width: `${(t.count / maxCount) * 100}%` }}
 />
 </div>
 <span className="text-xs text-muted-foreground w-12 text-right">{t.count}</span>
 </div>
 ))}
 </div>
 )}
 </ScrollArea>
 );
}

// ─── Sessions Tab ──────────────────────────────────────────────────────────

function SessionsTab() {
 const [sessions, setSessions] = useState<SessionEntry[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 (async () => {
 try {
 const data = await memoryEngine.getSessions(30);
 setSessions(data.sessions || []);
 } catch {
 setSessions([]);
 }
 setLoading(false);
 })();
 }, []);

 return (
 <ScrollArea className="h-[540px]">
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <UilSpinner size={24} className="animate-spin text-muted-foreground" />
 </div>
 ) : sessions.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">No sessions found</div>
 ) : (
 <div className="space-y-2">
 {sessions.map((s) => (
 <Card key={s.id} className="p-3 bg-muted/20 hover:bg-muted/30 transition-colors">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <UilCommentDots size={16} className="text-primary/60" />
 <span className="font-mono text-sm text-foreground">{s.id.slice(0, 12)}</span>
 </div>
 <Badge variant={s.status ==="done" ?"default" :"secondary"} className="text-[10px]">
 {s.status}
 </Badge>
 </div>
 <div className="flex items-center gap-4 mt-1">
 <span className="text-xs text-muted-foreground">
 {s.started_at?.slice(0, 16) ||"—"}
 </span>
 <span className="text-xs text-muted-foreground">
 {s.entries} entries
 </span>
 </div>
 </Card>
 ))}
 </div>
 )}
 </ScrollArea>
 );
}

// ─── Projects Tab ──────────────────────────────────────────────────────────

function ProjectsTab() {
 const [projects, setProjects] = useState<ProjectEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [isAdding, setIsAdding] = useState(false);
 const [newName, setNewName] = useState("");
 const [newDesc, setNewDesc] = useState("");
 const [newTags, setNewTags] = useState("");
 const { toast } = useToast();

 const loadProjects = useCallback(async () => {
 setLoading(true);
 try {
 const data = await memoryEngine.getProjects();
 setProjects(data.projects || []);
 } catch {
 setProjects([]);
 }
 setLoading(false);
 }, []);

 useEffect(() => { loadProjects(); }, [loadProjects]);

 const handleCreate = async () => {
 if (!newName.trim()) return;
 try {
 await memoryEngine.createProject({ name: newName, description: newDesc, tags: newTags });
 toast({ title:"Created", description: `Project"${newName}" created` });
 setIsAdding(false);
 setNewName(""); setNewDesc(""); setNewTags("");
 loadProjects();
 } catch (err: any) {
 toast({ title:"Error", description: err.message, variant:"destructive" });
 }
 };

 return (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <p className="text-sm text-muted-foreground">{projects.length} projects</p>
 <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
 <UilPlus size={12} className="mr-1" /> New Project
 </Button>
 </div>

 {isAdding && (
 <Card className="p-4 bg-primary/5">
 <div className="space-y-3">
 <div>
 <Label>Name</Label>
 <Input value={newName} onChange={(e) => setNewName(e.target.value)}
 placeholder="e.g., Samsung VRP" className="bg-background" />
 </div>
 <div>
 <Label>Description</Label>
 <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
 placeholder="What is this project about?" className="bg-background" />
 </div>
 <div>
 <Label>Tags</Label>
 <Input value={newTags} onChange={(e) => setNewTags(e.target.value)}
 placeholder="mobile,android,samsung" className="bg-background" />
 </div>
 <div className="flex gap-2">
 <Button onClick={handleCreate} size="sm"><UilSave size={12} className="mr-1" /> Create</Button>
 <Button onClick={() => setIsAdding(false)} size="sm" variant="outline"><UilTimes size={12} className="mr-1" /> Cancel</Button>
 </div>
 </div>
 </Card>
 )}

 <ScrollArea className="h-[450px]">
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <UilSpinner size={24} className="animate-spin text-muted-foreground" />
 </div>
 ) : projects.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 No projects yet. Create one to organize sessions by bounty program.
 </div>
 ) : (
 <div className="space-y-3">
 {projects.map((p) => (
 <Card key={p.id} className="p-3 bg-muted/20">
 <div className="flex items-center gap-2 mb-1">
 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
 <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
 <span className="flex items-center gap-1.5 text-[10px] ml-auto">
 <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
 <span className={p.status === 'active' ? 'text-emerald-500' : 'text-zinc-400'}>{p.status}</span>
 </span>
 </div>
 {p.description && (
 <p className="text-xs text-muted-foreground">{p.description}</p>
 )}
 <div className="flex items-center gap-2 mt-1">
 {p.tags && p.tags.split(",").map((tag) => (
 <span key={tag.trim()} className="text-[10px] text-primary/70">{tag.trim()}</span>
 ))}
 <span className="text-[10px] text-muted-foreground ml-auto">
 {p.session_count ?? 0} sessions
 </span>
 </div>
 </Card>
 ))}
 </div>
 )}
 </ScrollArea>
 </div>
 );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Memory() {
 const [stats, setStats] = useState<MemoryStats | null>(null);
 const [healthy, setHealthy] = useState<boolean | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 (async () => {
 try {
 const data = await memoryEngine.getStats();
 setStats(data);
 setHealthy(true);
 } catch {
 setHealthy(false);
 }
 setLoading(false);
 })();
 }, []);

 return (
 <div className="space-y-6 animate-fade-in">
 {/* Header */}
 <div className="flex items-center gap-3">
 <UilBrain size={32} className="text-primary" />
 <div>
 <h1 className="text-3xl font-bold text-foreground">Memory Engine</h1>
 <p className="text-muted-foreground text-sm">
 Persistent brain database — search, knowledge, sessions, projects
 </p>
 </div>
 {healthy === false && (
 <Badge variant="destructive" className="ml-auto">
 <UilExclamationCircle size={12} className="mr-1" /> Offline
 </Badge>
 )}
 {healthy === true && (
 <Badge variant="default" className="ml-auto bg-blue-600/80">
 Connected
 </Badge>
 )}
 </div>

 {/* Stats Bar */}
 {stats && !loading && (
 <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
 <StatCard label="Entries" value={stats.entries.toLocaleString()} icon={UilDatabase} />
 <StatCard label="Knowledge" value={stats.knowledge} icon={UilBookOpen} />
 <StatCard label="Sessions" value={`${stats.sessions_done}/${stats.sessions_total}`} icon={UilClock} />
 <StatCard label="Agents" value={Object.keys(stats.by_agent).length} icon={UilBrain} />
 </div>
 )}

 {loading && (
 <div className="flex items-center justify-center py-12">
 <UilSpinner size={32} className="animate-spin text-primary" />
 </div>
 )}

 {/* Tabs */}
 {!loading && (
 <Tabs defaultValue="search" className="w-full">
 <TabsList className="grid w-full grid-cols-5 bg-muted/30">
 <TabsTrigger value="search" className="text-xs gap-1">
 <UilSearch size={12} /> Search
 </TabsTrigger>
 <TabsTrigger value="knowledge" className="text-xs gap-1">
 <UilBookOpen size={12} /> Knowledge
 </TabsTrigger>
 <TabsTrigger value="topics" className="text-xs gap-1">
 <UilChartGrowth size={12} /> Topics
 </TabsTrigger>
 <TabsTrigger value="sessions" className="text-xs gap-1">
 <UilChannel size={12} /> Sessions
 </TabsTrigger>
 <TabsTrigger value="projects" className="text-xs gap-1">
 <UilFolderOpen size={12} /> Projects
 </TabsTrigger>
 </TabsList>

 <TabsContent value="search" className="mt-4">
 <SearchTab />
 </TabsContent>

 <TabsContent value="knowledge" className="mt-4">
 <KnowledgeTab />
 </TabsContent>

 <TabsContent value="topics" className="mt-4">
 <TopicsTab />
 </TabsContent>

 <TabsContent value="sessions" className="mt-4">
 <SessionsTab />
 </TabsContent>

 <TabsContent value="projects" className="mt-4">
 <ProjectsTab />
 </TabsContent>
 </Tabs>
 )}
 </div>
 );
}
