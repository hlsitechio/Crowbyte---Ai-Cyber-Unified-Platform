/**
 * Knowledge Base Page
 * Comprehensive cybersecurity knowledge management with AI-powered tagging
 */

import { useState, useEffect } from"react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Input } from"@/components/ui/input";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from"@/components/ui/dialog";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { useToast } from"@/hooks/use-toast";
import { knowledgeService, type KnowledgeEntry, type CreateKnowledgeInput } from"@/services/knowledge";
import { supabase } from "@/lib/supabase";
import { UilBookOpen, UilSearch, UilPlus, UilStar, UilEye, UilExternalLinkAlt, UilTag, UilClock, UilFolder, UilTrashAlt, UilPen, UilBook, UilFilter, UilChartGrowth, UilTimes, UilCheckSquare, UilSquare, UilMinusSquare, UilShieldCheck, UilLink, UilCalendarAlt, UilUser, UilChannel, UilArrowLeft, UilCopy, UilCheck } from "@iconscout/react-unicons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from"framer-motion";
import { formatDistanceToNow } from"date-fns";

const CATEGORIES = [
 { id: 'all', name: 'All Knowledge', icon: UilBookOpen, color: 'text-blue-500' },
 { id: 'research', name: 'Research', icon: UilChartGrowth, color: 'text-purple-500' },
 { id: 'vulnerabilities', name: 'Vulnerabilities', icon: UilBook, color: 'text-red-500' },
 { id: 'tools', name: 'Tools & Techniques', icon: UilStar, color: 'text-emerald-500' },
 { id: 'documentation', name: 'Documentation', icon: UilFolder, color: 'text-yellow-500' },
 { id: 'general', name: 'General', icon: UilBookOpen, color: 'text-gray-500' },
];

export default function Knowledge() {
 const { toast } = useToast();
 const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
 const [filteredEntries, setFilteredEntries] = useState<KnowledgeEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedCategory, setSelectedCategory] = useState("all");
 const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
 const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
 const [categoryStats, setCategoryStats] = useState<Map<string, number>>(new Map());
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [selectionMode, setSelectionMode] = useState(false);
 const [viewEntry, setViewEntry] = useState<KnowledgeEntry | null>(null);
 const [copied, setCopied] = useState(false);

 // Form state
 const [newEntry, setNewEntry] = useState<Partial<CreateKnowledgeInput>>({
 title: '',
 content: '',
 category: 'general',
 importance: 3,
 });

 /**
 * Load knowledge entries
 */
 const loadEntries = async () => {
 try {
 setLoading(true);
 const data = await knowledgeService.getAll();
 setEntries(data);
 setFilteredEntries(data);

 // Calculate category stats
 const stats = new Map<string, number>();
 data.forEach(entry => {
 stats.set(entry.category, (stats.get(entry.category) || 0) + 1);
 });
 setCategoryStats(stats);
 } catch (error) {
 console.error('Failed to load knowledge entries:', error);
 toast({
 title:"Error",
 description:"Failed to load knowledge entries",
 variant:"destructive",
 });
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadEntries();
 }, []);

 /**
 * Filter entries based on search, category, and favorites
 */
 useEffect(() => {
 let filtered = entries;

 // Filter by category
 if (selectedCategory !== 'all') {
 filtered = filtered.filter(entry => entry.category === selectedCategory);
 }

 // Filter by favorites
 if (showFavoritesOnly) {
 filtered = filtered.filter(entry => entry.is_favorite);
 }

 // Filter by search query
 if (searchQuery.trim()) {
 const query = searchQuery.toLowerCase();
 filtered = filtered.filter(entry =>
 entry.title.toLowerCase().includes(query) ||
 entry.content.toLowerCase().includes(query) ||
 entry.summary?.toLowerCase().includes(query) ||
 entry.tags.some(tag => tag.toLowerCase().includes(query))
 );
 }

 setFilteredEntries(filtered);
 }, [entries, selectedCategory, showFavoritesOnly, searchQuery]);

 /**
 * Create new knowledge entry
 */
 const handleCreateEntry = async () => {
 if (!newEntry.title || !newEntry.content) {
 toast({
 title:"Validation Error",
 description:"Title and content are required",
 variant:"destructive",
 });
 return;
 }

 try {
 setLoading(true);

 toast({
 title:"Processing with AI...",
 description:"Generating summary and extracting tags",
 });

 const createdEntry = await knowledgeService.create(newEntry as CreateKnowledgeInput);

 toast({
 title:"Success!",
 description: `Knowledge entry created with ${createdEntry.tags.length} AI-generated tags`,
 });

 setIsAddDialogOpen(false);
 setNewEntry({ title: '', content: '', category: 'general', importance: 3 });
 loadEntries();
 } catch (error) {
 console.error('Failed to create entry:', error);
 toast({
 title:"Error",
 description: error instanceof Error ? error.message :"Failed to create knowledge entry",
 variant:"destructive",
 });
 } finally {
 setLoading(false);
 }
 };

 /**
 * Toggle favorite
 */
 const handleToggleFavorite = async (id: string, currentState: boolean) => {
 try {
 await knowledgeService.toggleFavorite(id, !currentState);
 setEntries(entries.map(e => e.id === id ? { ...e, is_favorite: !currentState } : e));
 toast({
 title: currentState ?"Removed from favorites" :"Added to favorites",
 });
 } catch (error) {
 console.error('Failed to toggle favorite:', error);
 }
 };

 /**
 * Delete entry
 */
 const handleDelete = async (id: string) => {
 if (!confirm('Are you sure you want to delete this knowledge entry?')) return;

 try {
 await knowledgeService.delete(id);
 setEntries(entries.filter(e => e.id !== id));
 toast({
 title:"Deleted",
 description:"Knowledge entry deleted successfully",
 });
 } catch (error) {
 console.error('Failed to delete entry:', error);
 toast({
 title:"Error",
 description:"Failed to delete entry",
 variant:"destructive",
 });
 }
 };

 /**
  * Open document viewer
  */
 const handleView = async (entry: KnowledgeEntry) => {
   setViewEntry(entry);
   setCopied(false);
   // Increment view count
   try {
     await supabase.from('knowledge_base').update({ view_count: (entry.view_count || 0) + 1 }).eq('id', entry.id);
     setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, view_count: (e.view_count || 0) + 1 } : e));
   } catch {}
 };

 const handleCopyContent = () => {
   if (!viewEntry) return;
   navigator.clipboard.writeText(viewEntry.content || '');
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
 };

 const toggleSelect = (id: string) => {
 setSelectedIds(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const selectAll = () => {
 if (selectedIds.size === filteredEntries.length) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set(filteredEntries.map(e => e.id)));
 }
 };

 const handleBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 if (!confirm(`Delete ${selectedIds.size} entries?`)) return;
 try {
 setLoading(true);
 await Promise.all(Array.from(selectedIds).map(id => knowledgeService.delete(id)));
 setEntries(entries.filter(e => !selectedIds.has(e.id)));
 toast({ title:"Deleted", description: `${selectedIds.size} entries removed` });
 setSelectedIds(new Set());
 setSelectionMode(false);
 } catch (error) {
 toast({ title:"Error", description:"Failed to delete some entries", variant:"destructive" });
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="space-y-6 animate-fade-in">
 {/* Bulk action bar */}
 {selectionMode && (
 <div className="sticky top-0 z-50 flex items-center gap-3 bg-zinc-900/95 backdrop-blur ring-1 ring-white/[0.06] rounded-lg px-4 py-2.5">
 <Button size="sm" variant={selectedIds.size === filteredEntries.length ?"secondary" :"outline"} onClick={selectAll} className="gap-2">
 {selectedIds.size === filteredEntries.length
 ? <UilCheckSquare size={16} className="text-primary" />
 : selectedIds.size > 0
 ? <UilMinusSquare size={16} className="text-primary" />
 : <UilSquare size={16} />
 }
 {selectedIds.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
 </Button>
 <span className="text-sm font-medium text-white">
 {selectedIds.size} <span className="text-muted-foreground">of {filteredEntries.length} selected</span>
 </span>
 <div className="flex-1" />
 {selectedIds.size > 0 && (
 <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
 <UilTrashAlt size={14} className="mr-1" />
 Delete {selectedIds.size}
 </Button>
 )}
 <Button size="sm" variant="ghost" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
 Cancel
 </Button>
 </div>
 )}

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
 <p className="text-muted-foreground terminal-text mt-2">
 AI-powered cybersecurity intelligence repository
 </p>
 </div>
 <div className="flex gap-2">
 <Button
 variant={selectionMode ?"secondary" :"outline"}
 onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
 >
 <UilCheckSquare size={16} className="mr-2" />
 Select
 </Button>
 <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
 <DialogTrigger asChild>
 <Button className="bg-primary hover:bg-primary/90">
 <UilPlus size={16} className="mr-2" />
 Add Knowledge
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>Add New Knowledge Entry</DialogTitle>
 <DialogDescription>
 Create a new entry with AI-powered auto-tagging and summarization
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="title">Title</Label>
 <Input
 id="title"
 placeholder="E.g., OWASP Top 10 Vulnerabilities 2024"
 value={newEntry.title || ''}
 onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="category">Category</Label>
 <Select
 value={newEntry.category}
 onValueChange={(value) => setNewEntry({ ...newEntry, category: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
 <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="importance">Importance (1-5)</Label>
 <Select
 value={newEntry.importance?.toString()}
 onValueChange={(value) => setNewEntry({ ...newEntry, importance: parseInt(value) })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {[1, 2, 3, 4, 5].map(num => (
 <SelectItem key={num} value={num.toString()}>
 {num} {num === 5 ? '(Critical)' : num === 1 ? '(Low)' : ''}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="content">Content</Label>
 <Textarea
 id="content"
 rows={8}
 placeholder="Paste article content, research notes, or documentation..."
 value={newEntry.content || ''}
 onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
 className="font-mono text-sm"
 />
 <p className="text-xs text-muted-foreground">
 <UilStar size={12} className="inline mr-1" />
 AI will automatically generate summary and extract relevant tags
 </p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="source">Source URL (optional)</Label>
 <Input
 id="source"
 type="url"
 placeholder="https://..."
 value={newEntry.source_url || ''}
 onChange={(e) => setNewEntry({ ...newEntry, source_url: e.target.value })}
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
 Cancel
 </Button>
 <Button onClick={handleCreateEntry} disabled={loading}>
 {loading ? (
 <>
 <div className="h-4 w-4 animate-spin border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
 Processing with AI...
 </>
 ) : (
 <>
 <UilStar size={16} className="mr-2" />
 Create with AI
 </>
 )}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </div>

 {/* Search and Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="flex gap-2">
 <div className="relative flex-1">
 <UilSearch size={16} className="absolute left-3 top-3 text-muted-foreground" />
 <Input
 placeholder="Search knowledge base..."
 className="pl-10 terminal-text bg-background border-border"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 <Button
 variant={showFavoritesOnly ?"default" :"outline"}
 onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
 >
 <UilStar size={16} className={`${showFavoritesOnly ? 'fill-current' : ''}`} />
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Category Tabs */}
 <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
 <TabsList className="grid w-full grid-cols-6">
 {CATEGORIES.map(cat => {
 const Icon = cat.icon;
 const count = cat.id === 'all' ? entries.length : categoryStats.get(cat.id) || 0;
 return (
 <TabsTrigger key={cat.id} value={cat.id} className="relative">
 <Icon size={16} className={`mr-2 ${cat.color}`} />
 {cat.name}
 {count > 0 && (
 <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
 {count}
 </Badge>
 )}
 </TabsTrigger>
 );
 })}
 </TabsList>

 {CATEGORIES.map(cat => (
 <TabsContent key={cat.id} value={cat.id} className="space-y-4 mt-6">
 {loading ? (
 <div className="text-center py-12">
 <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto" />
 <p className="text-muted-foreground mt-4">Loading knowledge...</p>
 </div>
 ) : filteredEntries.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-12">
 <UilBookOpen size={64} className="text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold text-white mb-2">
 {searchQuery ? 'No Results Found' : 'No Knowledge Entries'}
 </h3>
 <p className="text-muted-foreground text-center mb-4">
 {searchQuery
 ? 'Try adjusting your search query'
 : 'Start building your knowledge base by adding entries'}
 </p>
 <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
 <UilPlus size={16} className="mr-2" />
 Add First Entry
 </Button>
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 <AnimatePresence>
 {filteredEntries.map((entry) => (
 <motion.div
 key={entry.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 >
 <Card className={`border-border hover:transition-all duration-300 h-full flex flex-col relative group ${selectedIds.has(entry.id) ? 'ring-1 ring-primary bg-primary/5' : ''}`}>
 {/* UilTimes delete button — top right corner */}
 <button
 onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
 className="h-6 w-6 absolute top-2 right-2 rounded-full hover:bg-red-500/80 text-zinc-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
 >
 <UilTimes size={14} />
 </button>
 <CardHeader>
 <div className="flex items-start justify-between gap-2">
 {/* Checkbox for multi-select */}
 {selectionMode && (
 <button
 onClick={(e) => { e.stopPropagation(); toggleSelect(entry.id); }}
 className="mt-0.5 shrink-0"
 >
 {selectedIds.has(entry.id)
 ? <UilCheckSquare size={20} className="text-primary" />
 : <UilSquare size={20} className="text-zinc-600 hover:text-zinc-400" />
 }
 </button>
 )}
 <div className="flex-1 min-w-0">
 <CardTitle className="text-white text-base line-clamp-2">
 {entry.title}
 </CardTitle>
 <CardDescription className="text-xs mt-1">
 <UilClock size={12} className="inline mr-1" />
 {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
 </CardDescription>
 </div>
 <Button
 variant="ghost"
 size="sm" className="h-8 w-8 p-0 shrink-0"
 onClick={() => handleToggleFavorite(entry.id, entry.is_favorite)}
 >
 <UilStar size={16} className={`${entry.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
 </Button>
 </div>
 </CardHeader>
 <CardContent className="flex-1 flex flex-col gap-3">
 {entry.summary && (
 <p className="text-sm text-muted-foreground line-clamp-3">
 {entry.summary}
 </p>
 )}

 {/* Tags */}
 {entry.tags.length > 0 && (
 <div className="flex flex-wrap gap-1">
 {entry.tags.slice(0, 5).map((tag, idx) => (
 <Badge key={idx} variant="secondary" className="text-xs">
 <UilTag size={12} className="mr-1" />
 {tag}
 </Badge>
 ))}
 {entry.tags.length > 5 && (
 <span className="text-xs text-zinc-400">+{entry.tags.length - 5}</span>
 )}
 </div>
 )}

 {/* Meta info */}
 <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-white/[0.04]">
 <span className="flex items-center gap-1">
 <UilEye size={12} />
 {entry.view_count}
 </span>
 {entry.importance && (
 <Badge
 variant={entry.importance >= 4 ?"destructive" :"secondary"}
 className="text-xs h-5"
 >
 P{entry.importance}
 </Badge>
 )}
 {entry.source_url && (
 <a
 href={entry.source_url}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
 onClick={(e) => e.stopPropagation()}
 >
 <UilExternalLinkAlt size={12} />
 Source
 </a>
 )}
 </div>

 {/* Actions */}
 <div className="flex gap-2 mt-2">
 <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); handleView(entry); }}>
 <UilEye size={12} className="mr-1" />
 View
 </Button>
 </div>
 </CardContent>
 </Card>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 )}
 </TabsContent>
 ))}
 </Tabs>

 {/* ─── Document Viewer Dialog ──────────────────────────────────────── */}
 <Dialog open={!!viewEntry} onOpenChange={(open) => { if (!open) setViewEntry(null); }}>
   <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 bg-zinc-900 border-zinc-800">
     {viewEntry && (
       <>
         {/* Header */}
         <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-white/[0.06] shrink-0">
           <div className="flex-1 min-w-0">
             <DialogTitle className="text-lg font-semibold text-zinc-100 leading-tight">
               {viewEntry.title}
             </DialogTitle>
             <DialogDescription className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
               <span className="flex items-center gap-1">
                 <UilClock size={12} />
                 {formatDistanceToNow(new Date(viewEntry.created_at), { addSuffix: true })}
               </span>
               {viewEntry.category && (
                 <span className="flex items-center gap-1">
                   <UilFolder size={12} />
                   {viewEntry.category}
                 </span>
               )}
               {viewEntry.source_type && (
                 <span className="flex items-center gap-1">
                   <UilChannel size={12} />
                   {viewEntry.source_type}
                 </span>
               )}
               {viewEntry.importance > 0 && (
                 <Badge variant={viewEntry.importance >= 4 ? "destructive" : "secondary"} className="text-xs h-5">
                   P{viewEntry.importance}
                 </Badge>
               )}
               {viewEntry.is_verified && (
                 <Badge variant="outline" className="text-xs h-5 text-emerald-400">
                   <UilShieldCheck size={10} className="mr-1" />
                   Verified
                 </Badge>
               )}
             </DialogDescription>
           </div>
           <div className="flex items-center gap-1 shrink-0">
             <Button
               variant="ghost"
               size="sm"
               className="h-8 w-8 p-0"
               onClick={handleCopyContent}
             >
               {copied ? <UilCheck size={14} className="text-emerald-400" /> : <UilCopy size={14} />}
             </Button>
             {viewEntry.source_url && (
               <a
                 href={viewEntry.source_url}
                 target="_blank"
                 rel="noopener noreferrer"
               >
                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                   <UilExternalLinkAlt size={14} />
                 </Button>
               </a>
             )}
           </div>
         </div>

         {/* Tags bar */}
         {viewEntry.tags.length > 0 && (
           <div className="flex flex-wrap gap-1.5 px-6 py-3 border-b border-white/[0.04] shrink-0">
             {viewEntry.tags.map((tag, idx) => (
               <Badge key={idx} variant="secondary" className="text-xs">
                 <UilTag size={10} className="mr-1" />
                 {tag}
               </Badge>
             ))}
           </div>
         )}

         {/* Related CVEs bar */}
         {viewEntry.related_cves && viewEntry.related_cves.length > 0 && (
           <div className="flex flex-wrap gap-1.5 px-6 py-2.5 border-b border-white/[0.04] bg-red-500/[0.03] shrink-0">
             <span className="text-xs text-zinc-500 mr-1 self-center">Related CVEs:</span>
             {viewEntry.related_cves.map((cve, idx) => (
               <Badge key={idx} variant="destructive" className="text-xs">
                 {cve}
               </Badge>
             ))}
           </div>
         )}

         {/* Content — scrollable markdown body */}
         <ScrollArea className="flex-1 min-h-0">
           <div className="px-6 py-6">
             {viewEntry.summary && (
               <div className="mb-6 p-4 rounded-lg bg-blue-500/[0.04] border border-blue-500/10">
                 <p className="text-xs font-medium text-blue-400 mb-1">Summary</p>
                 <p className="text-sm text-zinc-300 leading-relaxed">{viewEntry.summary}</p>
               </div>
             )}
             <div className="prose prose-invert prose-sm max-w-none
               prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:border-b prose-headings:border-white/[0.06] prose-headings:pb-2 prose-headings:mb-4
               prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
               prose-p:text-zinc-300 prose-p:leading-relaxed
               prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
               prose-strong:text-zinc-200
               prose-code:text-emerald-400 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
               prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-lg
               prose-blockquote:border-l-blue-500/50 prose-blockquote:bg-blue-500/[0.03] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
               prose-li:text-zinc-300
               prose-table:border-collapse prose-th:bg-zinc-900 prose-th:text-zinc-300 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-white/[0.06]
               prose-hr:border-white/[0.06]
               prose-img:rounded-lg prose-img:border prose-img:border-white/[0.06]"
             >
               <ReactMarkdown remarkPlugins={[remarkGfm]}>
                 {viewEntry.content || '*No content available*'}
               </ReactMarkdown>
             </div>
           </div>
         </ScrollArea>

         {/* Footer metadata */}
         <div className="flex items-center gap-4 px-6 py-3 border-t border-white/[0.06] text-xs text-zinc-600 shrink-0">
           <span className="flex items-center gap-1">
             <UilEye size={12} />
             {viewEntry.view_count} views
           </span>
           {viewEntry.author && (
             <span className="flex items-center gap-1">
               <UilUser size={12} />
               {viewEntry.author}
             </span>
           )}
           {viewEntry.published_date && (
             <span className="flex items-center gap-1">
               <UilCalendarAlt size={12} />
               Published {new Date(viewEntry.published_date).toLocaleDateString()}
             </span>
           )}
           <span className="ml-auto">
             Updated {formatDistanceToNow(new Date(viewEntry.updated_at), { addSuffix: true })}
           </span>
         </div>
       </>
     )}
   </DialogContent>
 </Dialog>
 </div>
 );
}
