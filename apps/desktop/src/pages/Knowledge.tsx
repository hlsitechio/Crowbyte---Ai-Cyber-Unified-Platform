/**
 * Knowledge Base Page
 * Comprehensive cybersecurity knowledge management with AI-powered tagging
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { knowledgeService, type KnowledgeEntry, type CreateKnowledgeInput } from "@/services/knowledge";
import {
  BookOpen,
  Search,
  Plus,
  Star,
  Eye,
  ExternalLink,
  Tag,
  Clock,
  Folder,
  Trash2,
  Edit,
  Sparkles,
  BookMarked,
  Filter,
  TrendingUp,
  X,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { id: 'all', name: 'All Knowledge', icon: BookOpen, color: 'text-blue-500' },
  { id: 'research', name: 'Research', icon: TrendingUp, color: 'text-purple-500' },
  { id: 'vulnerabilities', name: 'Vulnerabilities', icon: BookMarked, color: 'text-red-500' },
  { id: 'tools', name: 'Tools & Techniques', icon: Sparkles, color: 'text-green-500' },
  { id: 'documentation', name: 'Documentation', icon: Folder, color: 'text-yellow-500' },
  { id: 'general', name: 'General', icon: BookOpen, color: 'text-gray-500' },
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
        title: "Error",
        description: "Failed to load knowledge entries",
        variant: "destructive",
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
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      toast({
        title: "Processing with AI...",
        description: "Generating summary and extracting tags",
      });

      const createdEntry = await knowledgeService.create(newEntry as CreateKnowledgeInput);

      toast({
        title: "Success!",
        description: `Knowledge entry created with ${createdEntry.tags.length} AI-generated tags`,
      });

      setIsAddDialogOpen(false);
      setNewEntry({ title: '', content: '', category: 'general', importance: 3 });
      loadEntries();
    } catch (error) {
      console.error('Failed to create entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create knowledge entry",
        variant: "destructive",
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
        title: currentState ? "Removed from favorites" : "Added to favorites",
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
        title: "Deleted",
        description: "Knowledge entry deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
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
      toast({ title: "Deleted", description: `${selectedIds.size} entries removed` });
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete some entries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bulk action bar */}
      {selectionMode && (
        <div className="sticky top-0 z-50 flex items-center gap-3 bg-zinc-900/95 backdrop-blur border border-border rounded-lg px-4 py-2.5">
          <Button size="sm" variant={selectedIds.size === filteredEntries.length ? "secondary" : "outline"} onClick={selectAll} className="gap-2">
            {selectedIds.size === filteredEntries.length
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : selectedIds.size > 0
                ? <MinusSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />
            }
            {selectedIds.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm font-medium text-white">
            {selectedIds.size} <span className="text-muted-foreground">of {filteredEntries.length} selected</span>
          </span>
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
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
            variant={selectionMode ? "secondary" : "outline"}
            onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Select
          </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
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
                  <Sparkles className="h-3 w-3 inline mr-1" />
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
                      <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
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
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge base..."
                className="pl-10 terminal-text bg-background border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
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
                <Icon className={`h-4 w-4 mr-2 ${cat.color}`} />
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
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-4">Loading knowledge...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchQuery ? 'No Results Found' : 'No Knowledge Entries'}
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Start building your knowledge base by adding entries'}
                  </p>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
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
                      <Card className={`border-border hover:border-primary/30 transition-all duration-300 h-full flex flex-col relative group ${selectedIds.has(entry.id) ? 'ring-1 ring-primary border-primary/50 bg-primary/5' : ''}`}>
                        {/* X delete button — top right corner */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-zinc-800/80 hover:bg-red-500/80 text-zinc-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <X className="h-3.5 w-3.5" />
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
                                  ? <CheckSquare className="h-5 w-5 text-primary" />
                                  : <Square className="h-5 w-5 text-zinc-600 hover:text-zinc-400" />
                                }
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-white text-base line-clamp-2">
                                {entry.title}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={() => handleToggleFavorite(entry.id, entry.is_favorite)}
                            >
                              <Star className={`h-4 w-4 ${entry.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
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
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {entry.tags.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{entry.tags.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Meta info */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {entry.view_count}
                            </span>
                            {entry.importance && (
                              <Badge
                                variant={entry.importance >= 4 ? "destructive" : "secondary"}
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
                                <ExternalLink className="h-3 w-3" />
                                Source
                              </a>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-3 w-3 mr-1" />
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
    </div>
  );
}
