import { useState, useEffect, useMemo } from"react";
import { UilPlus, UilTrashAlt, UilShield, UilSearch, UilExternalLinkAlt, UilClock, UilTag, UilCheckSquare, UilSquare, UilMinusSquare, UilTimes, UilExclamationTriangle, UilShieldExclamation, UilShieldCheck, UilShieldSlash, UilAngleDown, UilAngleRight, UilCopy, UilBookmark, UilGrid, UilListUl, UilArrowsV, UilFire, UilBug, UilFileAlt, UilSortAmountUp, UilSortAmountDown } from "@iconscout/react-unicons";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import {
 Dialog, DialogContent, DialogDescription, DialogFooter,
 DialogHeader, DialogTitle, DialogTrigger,
} from"@/components/ui/dialog";
import { Label } from"@/components/ui/label";
import {
 Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from"@/components/ui/select";
import { Separator } from"@/components/ui/separator";
import { supabase } from"@/lib/supabase";
import { useAuth } from"@/contexts/auth";
import { useToast } from"@/hooks/use-toast";
import { motion, AnimatePresence } from"framer-motion";
import { formatDistanceToNow } from"date-fns";

interface CVE {
 id: string;
 user_id: string;
 cve_id: string;
 title: string;
 description: string | null;
 severity: string | null;
 cvss_score: number | null;
 cvss_vector: string | null;
 published_date: string | null;
 modified_date: string | null;
 affected_products: string[];
 reference_urls: string[];
 cwe_ids: string[];
 exploitability: string | null;
 patch_available: boolean;
 patch_url: string | null;
 tags: string[];
 notes: string | null;
 is_bookmarked: boolean;
 created_at: string;
 updated_at: string;
}

type SortField ="date" |"cvss" |"cve_id";
type SortDir ="asc" |"desc";
type ViewMode ="grouped" |"list";

const SEVERITY_ORDER = ["CRITICAL","HIGH","MEDIUM","LOW"] as const;

const SEVERITY_CONFIG: Record<string, {
 color: string; bg: string; border: string;
 icon: typeof UilShield; label: string; cardBorder: string;
}> = {
 CRITICAL: {
 color:"text-red-500", bg:"bg-transparent border-transparent text-red-500",
 border:"border-transparent", icon: UilShieldSlash, label:"Critical",
 cardBorder:"bg-transparent backdrop-blur",
 },
 HIGH: {
 color:"text-orange-500", bg:"bg-transparent border-transparent text-orange-500",
 border:"border-transparent", icon: UilShieldExclamation, label:"High",
 cardBorder:"bg-transparent backdrop-blur",
 },
 MEDIUM: {
 color:"text-amber-500", bg:"bg-transparent border-transparent text-amber-500",
 border:"border-transparent", icon: UilExclamationTriangle, label:"Medium",
 cardBorder:"bg-transparent backdrop-blur",
 },
 LOW: {
 color:"text-emerald-500", bg:"bg-transparent border-transparent text-emerald-500",
 border:"border-transparent", icon: UilShieldCheck, label:"Low",
 cardBorder:"bg-transparent backdrop-blur",
 },
};

const CVEPage = () => {
 const { user } = useAuth();
 const [cves, setCves] = useState<CVE[]>([]);
 const [loading, setLoading] = useState(true);
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingCve, setEditingCve] = useState<CVE | null>(null);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [selectionMode, setSelectionMode] = useState(false);
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
 const [viewMode, setViewMode] = useState<ViewMode>("grouped");
 const [sortField, setSortField] = useState<SortField>("date");
 const [sortDir, setSortDir] = useState<SortDir>("desc");
 const { toast } = useToast();

 const [formData, setFormData] = useState({
 cve_id:"", title:"", description:"", severity:"MEDIUM",
 cvss_score:"", cvss_vector:"", published_date:"", affected_products:"",
 reference_urls:"", cwe_ids:"", tags:"", notes:"", nvd_uuid:"",
 });

 useEffect(() => { fetchCVEs(); }, []);

 const fetchCVEs = async () => {
 try {
 const { data, error } = await supabase
 .from("cves")
 .select("*")
 .order("created_at", { ascending: false });
 if (error) throw error;
 setCves(data || []);
 } catch (error: unknown) {
 toast({ title:"Error", description: error instanceof Error ? error.message :"Failed to fetch CVEs", variant:"destructive" });
 } finally {
 setLoading(false);
 }
 };

 const filteredCves = useMemo(() => {
 let filtered = cves;
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 filtered = filtered.filter(c =>
 c.cve_id.toLowerCase().includes(q) ||
 c.title.toLowerCase().includes(q) ||
 c.description?.toLowerCase().includes(q) ||
 c.tags.some(t => t.toLowerCase().includes(q)) ||
 c.affected_products.some(p => p.toLowerCase().includes(q))
 );
 }
 return filtered;
 }, [cves, searchQuery]);

 const sortedCves = useMemo(() => {
 const sorted = [...filteredCves];
 sorted.sort((a, b) => {
 let cmp = 0;
 if (sortField ==="cvss") cmp = (a.cvss_score || 0) - (b.cvss_score || 0);
 else if (sortField ==="cve_id") cmp = a.cve_id.localeCompare(b.cve_id);
 else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
 return sortDir ==="desc" ? -cmp : cmp;
 });
 return sorted;
 }, [filteredCves, sortField, sortDir]);

 const groupedBySeverity = useMemo(() => {
 const groups: Record<string, CVE[]> = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [], UNKNOWN: [] };
 sortedCves.forEach(c => {
 const sev = c.severity?.toUpperCase() ||"UNKNOWN";
 if (groups[sev]) groups[sev].push(c);
 else groups.UNKNOWN.push(c);
 });
 return groups;
 }, [sortedCves]);

 const stats = useMemo(() => {
 const s = { total: cves.length, critical: 0, high: 0, medium: 0, low: 0, bookmarked: 0, exploitable: 0 };
 cves.forEach(c => {
 const sev = c.severity?.toUpperCase();
 if (sev ==="CRITICAL") s.critical++;
 else if (sev ==="HIGH") s.high++;
 else if (sev ==="MEDIUM") s.medium++;
 else if (sev ==="LOW") s.low++;
 if (c.is_bookmarked) s.bookmarked++;
 if (c.exploitability) s.exploitable++;
 });
 return s;
 }, [cves]);

 const resetForm = () => {
 setFormData({ cve_id:"", title:"", description:"", severity:"MEDIUM", cvss_score:"", cvss_vector:"", published_date:"", affected_products:"", reference_urls:"", cwe_ids:"", tags:"", notes:"", nvd_uuid:"" });
 setEditingCve(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 let cvssVectorVal = formData.cvss_vector ||"";
 if (formData.nvd_uuid) {
 cvssVectorVal = cvssVectorVal ? `${cvssVectorVal}|NVD:${formData.nvd_uuid}` : `NVD:${formData.nvd_uuid}`;
 }
 const payload = {
 cve_id: formData.cve_id,
 title: formData.title,
 description: formData.description || null,
 severity: formData.severity,
 cvss_score: formData.cvss_score ? parseFloat(formData.cvss_score) : null,
 cvss_vector: cvssVectorVal || null,
 published_date: formData.published_date || null,
 affected_products: formData.affected_products ? formData.affected_products.split(",").map(s => s.trim()) : [],
 reference_urls: formData.reference_urls ? formData.reference_urls.split("\n").map(s => s.trim()).filter(Boolean) : [],
 cwe_ids: formData.cwe_ids ? formData.cwe_ids.split(",").map(s => s.trim()) : [],
 tags: formData.tags ? formData.tags.split(",").map(s => s.trim().toLowerCase()) : [],
 notes: formData.notes || null,
 };
 if (editingCve) {
 const { error } = await supabase.from("cves").update(payload).eq("id", editingCve.id);
 if (error) throw error;
 toast({ title:"CVE updated" });
 } else {
 const { error } = await supabase.from("cves").insert({ ...payload, user_id: user?.id ?? "" });
 if (error) throw error;
 toast({ title:"CVE added" });
 }
 setIsDialogOpen(false);
 resetForm();
 fetchCVEs();
 } catch (error: unknown) {
 toast({ title:"Error", description: error instanceof Error ? error.message :"Failed", variant:"destructive" });
 }
 };

 const getNvdUuid = (cve: CVE): string => {
 const match = cve.cvss_vector?.match(/NVD:([A-F0-9-]+)/i);
 return match?.[1] ||"";
 };

 const getCvssVector = (cve: CVE): string => {
 return cve.cvss_vector?.replace(/\|?NVD:[A-F0-9-]+/i,"").trim() ||"";
 };

 const handleEdit = (cve: CVE) => {
 setEditingCve(cve);
 setFormData({
 cve_id: cve.cve_id, title: cve.title, description: cve.description ||"",
 severity: cve.severity ||"MEDIUM", cvss_score: cve.cvss_score?.toString() ||"",
 cvss_vector: getCvssVector(cve),
 published_date: cve.published_date ? new Date(cve.published_date).toISOString().split("T")[0] :"",
 affected_products: cve.affected_products.join(","),
 reference_urls: cve.reference_urls.join("\n"),
 cwe_ids: cve.cwe_ids.join(","),
 tags: cve.tags.join(","),
 notes: cve.notes ||"",
 nvd_uuid: getNvdUuid(cve),
 });
 setIsDialogOpen(true);
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Delete this CVE?")) return;
 try {
 const { error } = await supabase.from("cves").delete().eq("id", id);
 if (error) throw error;
 setCves(cves.filter(c => c.id !== id));
 toast({ title:"CVE deleted" });
 } catch (error: unknown) {
 toast({ title:"Error", description: error instanceof Error ? error.message :"Failed", variant:"destructive" });
 }
 };

 const toggleBookmark = async (id: string, current: boolean) => {
 const { error } = await supabase.from("cves").update({ is_bookmarked: !current }).eq("id", id);
 if (!error) setCves(cves.map(c => c.id === id ? { ...c, is_bookmarked: !current } : c));
 };

 const toggleSelect = (id: string) => {
 setSelectedIds(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id); else next.add(id);
 return next;
 });
 };

 const selectAll = () => {
 if (selectedIds.size === filteredCves.length) setSelectedIds(new Set());
 else setSelectedIds(new Set(filteredCves.map(c => c.id)));
 };

 const handleBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 if (!confirm(`Delete ${selectedIds.size} CVEs?`)) return;
 try {
 setLoading(true);
 await Promise.all(Array.from(selectedIds).map(id =>
 supabase.from("cves").delete().eq("id", id)
 ));
 setCves(cves.filter(c => !selectedIds.has(c.id)));
 toast({ title:"Deleted", description: `${selectedIds.size} CVEs removed` });
 setSelectedIds(new Set());
 setSelectionMode(false);
 } catch {
 toast({ title:"Error", description:"Failed to delete some CVEs", variant:"destructive" });
 } finally {
 setLoading(false);
 }
 };

 const getSevConfig = (severity: string | null) => {
 return SEVERITY_CONFIG[severity?.toUpperCase() ||""] || SEVERITY_CONFIG.MEDIUM;
 };

 const copyCveId = (id: string) => {
 navigator.clipboard.writeText(id);
 toast({ title:"Copied", description: id });
 };

 const toggleGroup = (sev: string) => {
 setCollapsedGroups(prev => {
 const next = new Set(prev);
 if (next.has(sev)) next.delete(sev); else next.add(sev);
 return next;
 });
 };

 const toggleSort = (field: SortField) => {
 if (sortField === field) setSortDir(d => d ==="asc" ?"desc" :"asc");
 else { setSortField(field); setSortDir("desc"); }
 };

 // Render a single CVE row
 const renderCveRow = (cve: CVE) => {
 const sev = getSevConfig(cve.severity);
 const isExpanded = expandedId === cve.id;
 return (
 <motion.div key={cve.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
 <div className={`border rounded-lg transition-all group relative ${selectedIds.has(cve.id) ?"ring-1 ring-primary border-primary/50 bg-primary/5" :"ring-1 ring-white/[0.04] hover:ring-white/[0.08] bg-card/30"}`}>
 {/* UilTimes delete on hover */}
 <button
 onClick={e => { e.stopPropagation(); handleDelete(cve.id); }}
 className="h-6 w-6 absolute top-2 right-2 rounded-full hover:bg-red-500/80 text-zinc-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
 >
 <UilTimes size={14} />
 </button>

 <div className="px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : cve.id)}>
 <div className="flex items-start gap-3">
 {selectionMode && (
 <button onClick={e => { e.stopPropagation(); toggleSelect(cve.id); }} className="mt-0.5 shrink-0">
 {selectedIds.has(cve.id)
 ? <UilCheckSquare size={16} className="text-primary" />
 : <UilSquare size={16} className="text-zinc-600 hover:text-zinc-400" />
 }
 </button>
 )}

 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <button onClick={e => { e.stopPropagation(); copyCveId(cve.cve_id); }} className="hover:text-primary transition-colors">
 <span className="font-mono text-xs font-semibold text-white hover:text-primary">{cve.cve_id}</span>
 </button>
 {cve.cvss_score != null && cve.cvss_score > 0 && (
 <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5">
 {cve.cvss_score.toFixed(1)}
 </Badge>
 )}
 {cve.exploitability && (
 <Badge className="text-[10px] bg-transparent text-red-500 border-transparent h-5 px-1.5">
 <UilFire size={10} className="mr-0.5" />{cve.exploitability}
 </Badge>
 )}
 {cve.patch_available && (
 <Badge className="text-[10px] bg-transparent text-emerald-500 border-transparent h-5 px-1.5">patched</Badge>
 )}
 {getNvdUuid(cve) && (
 <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(getNvdUuid(cve)); toast({ title:"Copied NVD UUID" }); }} title="NVD UUID">
 <span className="text-[10px] font-mono text-zinc-400 cursor-pointer hover:text-zinc-300">
 NVD:{getNvdUuid(cve).slice(0, 8)}
 </span>
 </button>
 )}
 </div>
 <h3 className="text-sm text-muted-foreground mt-1 line-clamp-1">{cve.title}</h3>
 <div className="flex items-center gap-3 mt-1.5">
 {cve.published_date && (
 <span className="flex items-center gap-1 text-[11px] text-zinc-500">
 <UilClock size={12} />
 {formatDistanceToNow(new Date(cve.published_date), { addSuffix: true })}
 </span>
 )}
 {cve.affected_products.length > 0 && (
 <span className="text-[11px] text-zinc-500 truncate max-w-[250px]">
 {cve.affected_products.join(",")}
 </span>
 )}
 {cve.tags.length > 0 && (
 <div className="flex gap-1 ml-auto">
 {cve.tags.slice(0, 4).map((tag, i) => (
 <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1">{tag}</Badge>
 ))}
 {cve.tags.length > 4 && <span className="text-[9px] text-zinc-600">+{cve.tags.length - 4}</span>}
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-1 shrink-0">
 <button onClick={e => { e.stopPropagation(); toggleBookmark(cve.id, cve.is_bookmarked); }} className="p-1 rounded hover:bg-white/[0.05] transition-colors">
 {cve.is_bookmarked
 ? <UilBookmark size={14} className="fill-yellow-500 text-yellow-500" />
 : <UilBookmark size={14} className="text-zinc-600 hover:text-zinc-400" />
 }
 </button>
 <UilAngleDown size={14} className={`text-zinc-500 transition-transform ${isExpanded ?"rotate-180" :""}`} />
 </div>
 </div>
 </div>

 {/* Expanded details */}
 {isExpanded && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height:"auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
 <div className="px-4 py-3 space-y-3">
 {cve.description && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Description</div>
 <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{cve.description}</p>
 </div>
 )}
 {cve.notes && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Notes</div>
 <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{cve.notes}</p>
 </div>
 )}
 <div className="grid grid-cols-2 gap-3">
 {cve.cwe_ids.length > 0 && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">CWE</div>
 <div className="flex flex-wrap gap-1">{cve.cwe_ids.map((c, i) => <span key={i} className="text-[10px] font-mono text-zinc-400">{c}</span>)}</div>
 </div>
 )}
 {cve.affected_products.length > 0 && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Products</div>
 <div className="flex flex-wrap gap-1">{cve.affected_products.map((p, i) => <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>)}</div>
 </div>
 )}
 </div>
 {cve.reference_urls.length > 0 && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">References</div>
 <div className="space-y-0.5">
 {cve.reference_urls.map((url, i) => (
 <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-500 truncate">
 <UilExternalLinkAlt size={10} className="shrink-0" />{url}
 </a>
 ))}
 </div>
 </div>
 )}
 <div className="grid grid-cols-2 gap-3">
 {getCvssVector(cve) && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">CVSS Vector</div>
 <code className="text-[10px] text-muted-foreground">{getCvssVector(cve)}</code>
 </div>
 )}
 {getNvdUuid(cve) && (
 <div>
 <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">NVD UUID</div>
 <div className="flex items-center gap-2">
 <code className="text-[10px] text-muted-foreground font-mono">{getNvdUuid(cve)}</code>
 <a href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`} target="_blank" rel="noopener noreferrer"
 className="text-[10px] text-blue-500 hover:text-blue-500 flex items-center gap-0.5"
 onClick={e => e.stopPropagation()}
 >
 <UilExternalLinkAlt size={10} /> NVD
 </a>
 </div>
 </div>
 )}
 </div>
 <Separator className="opacity-50" />
 <div className="flex gap-2">
 <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(cve)}>Edit</Button>
 <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyCveId(cve.cve_id)}>
 <UilCopy size={12} className="mr-1" /> UilCopy ID
 </Button>
 {cve.patch_url && (
 <a href={cve.patch_url} target="_blank" rel="noopener noreferrer">
 <Button size="sm" variant="outline" className="h-7 text-xs"><UilExternalLinkAlt size={12} className="mr-1" /> Patch</Button>
 </a>
 )}
 </div>
 </div>
 </motion.div>
 )}
 </div>
 </motion.div>
 );
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-full">
 <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full" />
 </div>
 );
 }

 return (
 <div className="space-y-6 p-6 animate-fade-in">
 {/* Bulk action bar */}
 {selectionMode && (
 <div className="sticky top-0 z-50 flex items-center gap-3 bg-zinc-900/95 backdrop-blur ring-1 ring-white/[0.06] rounded-lg px-4 py-2.5">
 <Button size="sm" variant={selectedIds.size === filteredCves.length ?"secondary" :"outline"} onClick={selectAll} className="gap-2">
 {selectedIds.size === filteredCves.length
 ? <UilCheckSquare size={16} className="text-primary" />
 : selectedIds.size > 0 ? <UilMinusSquare size={16} className="text-primary" /> : <UilSquare size={16} />
 }
 {selectedIds.size === filteredCves.length ?"Deselect All" :"Select All"}
 </Button>
 <span className="text-sm font-medium text-white">
 {selectedIds.size} <span className="text-muted-foreground">of {filteredCves.length} selected</span>
 </span>
 <div className="flex-1" />
 {selectedIds.size > 0 && (
 <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
 <UilTrashAlt size={14} className="mr-1" /> Delete {selectedIds.size}
 </Button>
 )}
 <Button size="sm" variant="ghost" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>Cancel</Button>
 </div>
 )}

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-bold text-gradient-silver flex items-center gap-3">
 <UilBug size={40} className="text-primary animate-pulse" />
 CVE UilDatabase
 </h1>
 <p className="text-sm text-muted-foreground terminal-text mt-2">
 {stats.total} vulnerabilities tracked across all severity levels
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant={selectionMode ?"secondary" :"outline"} size="sm"
 onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
 className="border-primary/30 hover:bg-primary/10"
 >
 <UilCheckSquare size={16} className="mr-2" /> Select
 </Button>
 <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
 <DialogTrigger asChild>
 <Button className="bg-primary/20 hover:bg-primary/30 ring-1 ring-primary/20">
 <UilPlus size={16} className="mr-2" /> Add CVE
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{editingCve ?"Edit CVE" :"Add New CVE"}</DialogTitle>
 <DialogDescription>{editingCve ?"Update CVE details" :"Enter CVE information"}</DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>CVE ID *</Label>
 <Input placeholder="CVE-2026-XXXXX" value={formData.cve_id} onChange={e => setFormData({ ...formData, cve_id: e.target.value })} required />
 </div>
 <div className="space-y-2">
 <Label>CVSS Score</Label>
 <Input type="number" step="0.1" min="0" max="10" placeholder="9.8" value={formData.cvss_score} onChange={e => setFormData({ ...formData, cvss_score: e.target.value })} />
 </div>
 </div>
 <div className="space-y-2">
 <Label>Title *</Label>
 <Input placeholder="Vulnerability title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
 </div>
 <div className="space-y-2">
 <Label>Description</Label>
 <Textarea rows={4} placeholder="Detailed description..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="font-mono text-sm" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Severity</Label>
 <Select value={formData.severity} onValueChange={v => setFormData({ ...formData, severity: v })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="CRITICAL">Critical</SelectItem>
 <SelectItem value="HIGH">High</SelectItem>
 <SelectItem value="MEDIUM">Medium</SelectItem>
 <SelectItem value="LOW">Low</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>Published Date</Label>
 <Input type="date" value={formData.published_date} onChange={e => setFormData({ ...formData, published_date: e.target.value })} />
 </div>
 </div>
 <div className="space-y-2">
 <Label>Affected Products (comma-separated)</Label>
 <Input placeholder="Apache 2.4, nginx 1.18" value={formData.affected_products} onChange={e => setFormData({ ...formData, affected_products: e.target.value })} />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>CWE IDs (comma-separated)</Label>
 <Input placeholder="CWE-79, CWE-89" value={formData.cwe_ids} onChange={e => setFormData({ ...formData, cwe_ids: e.target.value })} />
 </div>
 <div className="space-y-2">
 <Label>NVD UUID</Label>
 <Input placeholder="AE7F4726-7A25-F111-836A-0EBF96DE670D" value={formData.nvd_uuid} onChange={e => setFormData({ ...formData, nvd_uuid: e.target.value })} className="font-mono text-xs" />
 </div>
 </div>
 <div className="space-y-2">
 <Label>CVSS Vector</Label>
 <Input placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" value={formData.cvss_vector} onChange={e => setFormData({ ...formData, cvss_vector: e.target.value })} className="font-mono text-xs" />
 </div>
 <div className="space-y-2">
 <Label>Tags (comma-separated)</Label>
 <Input placeholder="rce, auth-bypass, critical" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
 </div>
 <div className="space-y-2">
 <Label>Reference URLs (one per line)</Label>
 <Textarea rows={3} placeholder="https://nvd.nist.gov/vuln/detail/CVE-..." value={formData.reference_urls} onChange={e => setFormData({ ...formData, reference_urls: e.target.value })} className="font-mono text-sm" />
 </div>
 <div className="space-y-2">
 <Label>Notes</Label>
 <Textarea rows={3} placeholder="Internal notes, exploitation details..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
 </div>
 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
 <Button type="submit">{editingCve ?"Update" :"Add"} CVE</Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xs font-medium text-zinc-400">Critical</CardTitle>
 <UilShieldSlash size={16} className="text-red-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
 <p className="text-[10px] text-zinc-500">CVSS 9.0 - 10.0</p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xs font-medium text-zinc-400">High</CardTitle>
 <UilShieldExclamation size={16} className="text-orange-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-orange-500">{stats.high}</div>
 <p className="text-[10px] text-zinc-500">CVSS 7.0 - 8.9</p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xs font-medium text-zinc-400">Medium</CardTitle>
 <UilExclamationTriangle size={16} className="text-amber-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-amber-500">{stats.medium}</div>
 <p className="text-[10px] text-zinc-500">CVSS 4.0 - 6.9</p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xs font-medium text-zinc-400">Low</CardTitle>
 <UilShieldCheck size={16} className="text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-emerald-500">{stats.low}</div>
 <p className="text-[10px] text-zinc-500">CVSS 0.1 - 3.9</p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xs font-medium text-zinc-400">Bookmarked</CardTitle>
 <UilBookmark size={16} className="text-yellow-300" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-yellow-300">{stats.bookmarked}</div>
 <p className="text-[10px] text-zinc-500">Saved for review</p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xs font-medium text-zinc-400">Exploitable</CardTitle>
 <UilFire size={16} className="text-red-300" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-red-300">{stats.exploitable}</div>
 <p className="text-[10px] text-zinc-500">Known exploits</p>
 </CardContent>
 </Card>
 </div>

 {/* Search + Controls */}
 <Card className="bg-card/50 backdrop-blur">
 <CardContent className="pt-4 pb-3">
 <div className="flex items-center gap-3">
 <div className="relative flex-1">
 <UilSearch size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
 <Input
 placeholder="Search CVEs, products, tags, descriptions..."
 className="pl-10 bg-background/50 border-border/50 h-9"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 {searchQuery && (
 <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5">
 <UilTimes size={16} className="text-zinc-500 hover:text-white" />
 </button>
 )}
 </div>

 <Separator orientation="vertical" className="h-6 opacity-30" />

 {/* Sort buttons */}
 <div className="flex items-center gap-1">
 <Button variant={sortField ==="date" ?"secondary" :"ghost"} size="sm" className="h-8 text-xs gap-1" onClick={() => toggleSort("date")}>
 <UilClock size={12} /> Date
 {sortField ==="date" && (sortDir ==="desc" ? <UilSortAmountDown size={12} /> : <UilSortAmountUp size={12} />)}
 </Button>
 <Button variant={sortField ==="cvss" ?"secondary" :"ghost"} size="sm" className="h-8 text-xs gap-1" onClick={() => toggleSort("cvss")}>
 <UilArrowsV size={12} /> CVSS
 {sortField ==="cvss" && (sortDir ==="desc" ? <UilSortAmountDown size={12} /> : <UilSortAmountUp size={12} />)}
 </Button>
 <Button variant={sortField ==="cve_id" ?"secondary" :"ghost"} size="sm" className="h-8 text-xs gap-1" onClick={() => toggleSort("cve_id")}>
 <UilFileAlt size={12} /> ID
 {sortField ==="cve_id" && (sortDir ==="desc" ? <UilSortAmountDown size={12} /> : <UilSortAmountUp size={12} />)}
 </Button>
 </div>

 <Separator orientation="vertical" className="h-6 opacity-30" />

 {/* View mode */}
 <div className="flex items-center gap-1">
 <Button variant={viewMode ==="grouped" ?"secondary" :"ghost"} size="sm" className="h-8 px-2" onClick={() => setViewMode("grouped")} title="Group by severity">
 <UilGrid size={14} />
 </Button>
 <Button variant={viewMode ==="list" ?"secondary" :"ghost"} size="sm" className="h-8 px-2" onClick={() => setViewMode("list")} title="Flat list">
 <UilListUl size={14} />
 </Button>
 </div>
 </div>
 {searchQuery && (
 <p className="text-[11px] text-zinc-500 mt-2 pl-1">
 {filteredCves.length} result{filteredCves.length !== 1 ?"s" :""} for"{searchQuery}"
 </p>
 )}
 </CardContent>
 </Card>

 {/* CVE Content */}
 {filteredCves.length === 0 ? (
 <Card className="bg-card/50 backdrop-blur">
 <CardContent className="flex flex-col items-center justify-center py-16">
 <UilBug size={64} className="text-primary/50 mb-4" />
 <h3 className="text-lg font-semibold text-white mb-2">No CVEs Found</h3>
 <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
 {searchQuery ?"No CVEs match your search query" :"Start building your CVE database by adding vulnerabilities"}
 </p>
 {!searchQuery && (
 <Button onClick={() => setIsDialogOpen(true)}>
 <UilPlus size={16} className="mr-2" /> Add First CVE
 </Button>
 )}
 </CardContent>
 </Card>
 ) : viewMode ==="grouped" ? (
 /* Grouped by Severity */
 <div className="space-y-4">
 {SEVERITY_ORDER.map(sev => {
 const group = groupedBySeverity[sev] || [];
 if (group.length === 0) return null;
 const config = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.MEDIUM;
 const isCollapsed = collapsedGroups.has(sev);

 return (
 <Card key={sev} className={config.cardBorder}>
 <CardHeader
 className="cursor-pointer py-3 px-4"
 onClick={() => toggleGroup(sev)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 {isCollapsed
 ? <UilAngleRight size={16} className={`${config.color}`} />
 : <UilAngleDown size={16} className={`${config.color}`} />
 }
 <config.icon size={20} className={`${config.color}`} />
 <CardTitle className={`text-sm font-semibold ${config.color}`}>
 {config.label}
 </CardTitle>
 <Badge className={`${config.bg} text-[10px] h-5`}>
 {group.length}
 </Badge>
 </div>
 <CardDescription className="text-[11px]">
 {group.filter(c => c.cvss_score).length > 0 && (
 <>Avg CVSS: {(group.reduce((sum, c) => sum + (c.cvss_score || 0), 0) / group.filter(c => c.cvss_score).length).toFixed(1)}</>
 )}
 </CardDescription>
 </div>
 </CardHeader>
 {!isCollapsed && (
 <CardContent className="pt-0 pb-3 px-4">
 <div className="space-y-2">
 <AnimatePresence>
 {group.map(cve => renderCveRow(cve))}
 </AnimatePresence>
 </div>
 </CardContent>
 )}
 </Card>
 );
 })}

 {/* Unknown severity group */}
 {(groupedBySeverity.UNKNOWN || []).length > 0 && (
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="cursor-pointer py-3 px-4" onClick={() => toggleGroup("UNKNOWN")}>
 <div className="flex items-center gap-3">
 {collapsedGroups.has("UNKNOWN")
 ? <UilAngleRight size={16} className="text-zinc-400" />
 : <UilAngleDown size={16} className="text-zinc-400" />
 }
 <UilShield size={20} className="text-zinc-400" />
 <CardTitle className="text-sm font-semibold text-zinc-400">Unclassified</CardTitle>
 <span className="text-[10px] text-zinc-400">{groupedBySeverity.UNKNOWN.length}</span>
 </div>
 </CardHeader>
 {!collapsedGroups.has("UNKNOWN") && (
 <CardContent className="pt-0 pb-3 px-4">
 <div className="space-y-2">
 <AnimatePresence>
 {groupedBySeverity.UNKNOWN.map(cve => renderCveRow(cve))}
 </AnimatePresence>
 </div>
 </CardContent>
 )}
 </Card>
 )}
 </div>
 ) : (
 /* Flat List View */
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="py-3 px-4">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-2">
 <UilFileAlt size={16} className="text-primary" />
 All Vulnerabilities
 </CardTitle>
 <CardDescription className="text-[11px]">{sortedCves.length} CVEs</CardDescription>
 </div>
 </CardHeader>
 <CardContent className="pt-0 pb-3 px-4">
 <div className="space-y-2">
 <AnimatePresence>
 {sortedCves.map(cve => renderCveRow(cve))}
 </AnimatePresence>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 );
};

export default CVEPage;
