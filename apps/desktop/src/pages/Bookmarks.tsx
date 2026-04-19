import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { bookmarksService, type Bookmark, type BookmarkCategory, DEFAULT_CATEGORIES } from "@/services/bookmarks";
import { UilBookmark, UilSearch, UilPlus, UilTrashAlt, UilExternalLinkAlt, UilFolder, UilFolderPlus } from "@iconscout/react-unicons";
import { motion } from "framer-motion";

const Bookmarks = () => {
 const { toast } = useToast();
 const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
 const [categories, setCategories] = useState<BookmarkCategory[]>([]);
 const [selectedCategory, setSelectedCategory] = useState<string>("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [loading, setLoading] = useState(true);

 // Add bookmark dialog state
 const [addDialogOpen, setAddDialogOpen] = useState(false);
 const [newBookmark, setNewBookmark] = useState({
 title: "",
 url: "",
 description: "",
 category: "General",
 tags: "",
 });

 // Add category dialog state
 const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
 const [newCategory, setNewCategory] = useState({
 name: "",
 icon: "UilFolder",
 color: "#6b7280",
 });

 // Load bookmarks and categories
 useEffect(() => {
 loadData();
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 const loadData = async () => {
 try {
 setLoading(true);

 // Initialize default categories and bookmarks if needed
 await bookmarksService.initializeDefaultCategories();
 await bookmarksService.initializeDefaultBookmarks();

 const [bookmarksData, categoriesData] = await Promise.all([
 bookmarksService.getBookmarks(),
 bookmarksService.getCategories(),
 ]);

 setBookmarks(bookmarksData);
 setCategories(categoriesData);
 } catch (error: unknown) {
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : 'An error occurred',
 variant: "destructive",
 });
 } finally {
 setLoading(false);
 }
 };

 // Filter bookmarks
 const filteredBookmarks = bookmarks.filter(bookmark => {
 const matchesCategory = selectedCategory === "all" || bookmark.category === selectedCategory;
 const matchesSearch = searchQuery === "" ||
 bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (bookmark.description && bookmark.description.toLowerCase().includes(searchQuery.toLowerCase()));

 return matchesCategory && matchesSearch;
 });

 // Add bookmark
 const handleAddBookmark = async () => {
 try {
 if (!newBookmark.title || !newBookmark.url) {
 toast({
 title: "Error",
 description: "Title and URL are required",
 variant: "destructive",
 });
 return;
 }

 const favicon_url = bookmarksService.getFaviconUrl(newBookmark.url);

 await bookmarksService.createBookmark({
 title: newBookmark.title,
 url: newBookmark.url,
 description: newBookmark.description || undefined,
 category: newBookmark.category,
 tags: newBookmark.tags ? newBookmark.tags.split(',').map(t => t.trim()) : [],
 favicon_url,
 });

 toast({
 title: "Success",
 description: "Bookmark added successfully",
 });

 setAddDialogOpen(false);
 setNewBookmark({ title: "", url: "", description: "", category: "General", tags: "" });
 loadData();
 } catch (error: unknown) {
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : 'An error occurred',
 variant: "destructive",
 });
 }
 };

 // Delete bookmark
 const handleDeleteBookmark = async (id: string) => {
 try {
 await bookmarksService.deleteBookmark(id);
 toast({
 title: "Success",
 description: "Bookmark deleted",
 });
 loadData();
 } catch (error: unknown) {
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : 'An error occurred',
 variant: "destructive",
 });
 }
 };

 // Add category
 const handleAddCategory = async () => {
 try {
 if (!newCategory.name) {
 toast({
 title: "Error",
 description: "Category name is required",
 variant: "destructive",
 });
 return;
 }

 await bookmarksService.createCategory(newCategory);

 toast({
 title: "Success",
 description: "Category added successfully",
 });

 setCategoryDialogOpen(false);
 setNewCategory({ name: "", icon: "UilFolder", color: "#6b7280" });
 loadData();
 } catch (error: unknown) {
 toast({
 title: "Error",
 description: error instanceof Error ? error.message : 'An error occurred',
 variant: "destructive",
 });
 }
 };

 // Get category color
 const getCategoryColor = (categoryName: string): string => {
 const category = categories.find(c => c.name === categoryName);
 return category?.color || DEFAULT_CATEGORIES.find(c => c.name === categoryName)?.color || "#6b7280";
 };

 return (
 <div className="space-y-6 p-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-bold text-gradient-silver flex items-center gap-3">
 <UilBookmark size={40} className="text-primary" />
 Bookmarks
 </h1>
 <p className="text-sm text-muted-foreground mt-2">
 Organize your cybersecurity resources
 </p>
 </div>

 <div className="flex gap-2">
 <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
 <DialogTrigger asChild>
 <Button variant="outline">
 <UilFolderPlus size={16} className="mr-2" />
 New Category
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Add New Category</DialogTitle>
 <DialogDescription>
 Create a new category to organize your bookmarks
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label htmlFor="category-name">Name</Label>
 <Input
 id="category-name"
 value={newCategory.name}
 onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
 placeholder="e.g., Pentesting Tools"
 />
 </div>
 <div>
 <Label htmlFor="category-color">Color</Label>
 <Input
 id="category-color"
 type="color"
 value={newCategory.color}
 onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
 <Button onClick={handleAddCategory}>Add Category</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
 <DialogTrigger asChild>
 <Button>
 <UilPlus size={16} className="mr-2" />
 Add Bookmark
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Add New Bookmark</DialogTitle>
 <DialogDescription>
 Save a new resource to your bookmarks
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label htmlFor="title">Title *</Label>
 <Input
 id="title"
 value={newBookmark.title}
 onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
 placeholder="e.g., OWASP Top 10"
 />
 </div>
 <div>
 <Label htmlFor="url">URL *</Label>
 <Input
 id="url"
 value={newBookmark.url}
 onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
 placeholder="https://..."
 />
 </div>
 <div>
 <Label htmlFor="description">Description</Label>
 <Textarea
 id="description"
 value={newBookmark.description}
 onChange={(e) => setNewBookmark({ ...newBookmark, description: e.target.value })}
 placeholder="Brief description..."
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="category">Category *</Label>
 <Select value={newBookmark.category} onValueChange={(value) => setNewBookmark({ ...newBookmark, category: value })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {categories.map(cat => (
 <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label htmlFor="tags">Tags (comma-separated)</Label>
 <Input
 id="tags"
 value={newBookmark.tags}
 onChange={(e) => setNewBookmark({ ...newBookmark, tags: e.target.value })}
 placeholder="web, security, tools"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
 <Button onClick={handleAddBookmark}>Add Bookmark</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </div>

 {/* Search and Filters */}
 <Card>
 <CardHeader>
 <CardTitle className="text-sm">Search & Filter</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="relative">
 <UilSearch size={16} className="absolute left-3 top-3 text-muted-foreground" />
 <Input
 placeholder="Search bookmarks..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10"
 />
 </div>

 <div className="flex flex-wrap gap-2">
 <Button
 variant={selectedCategory === "all" ? "default" : "outline"}
 size="sm"
 onClick={() => setSelectedCategory("all")}
 >
 All ({bookmarks.length})
 </Button>
 {categories.map(category => {
 const count = bookmarks.filter(b => b.category === category.name).length;
 return (
 <Button
 key={category.id}
 variant={selectedCategory === category.name ? "default" : "outline"}
 size="sm"
 onClick={() => setSelectedCategory(category.name)}
 style={{
 borderColor: selectedCategory === category.name ? category.color : undefined,
 }}
 >
 {category.name} ({count})
 </Button>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Bookmarks Grid */}
 {loading ? (
 <div className="text-center py-12 text-muted-foreground">Loading bookmarks...</div>
 ) : filteredBookmarks.length === 0 ? (
 <Card>
 <CardContent className="text-center py-12">
 <UilBookmark size={64} className="mx-auto mb-4 text-muted-foreground/50" />
 <p className="text-muted-foreground">
 {searchQuery ? "No bookmarks match your search" : "No bookmarks yet. Add your first bookmark!"}
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredBookmarks.map((bookmark, idx) => (
 <motion.div
 key={bookmark.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: idx * 0.05 }}
 >
 <Card className="transition-all group">
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-start gap-3 flex-1 min-w-0">
 {bookmark.favicon_url && (
 <img
 src={bookmark.favicon_url}
 alt=""
 className="h-6 w-6 rounded flex-shrink-0 mt-1"
 onError={(e) => {
 (e.target as HTMLImageElement).style.display = 'none';
 }}
 />
 )}
 <div className="flex-1 min-w-0">
 <CardTitle className="text-sm line-clamp-2">{bookmark.title}</CardTitle>
 <CardDescription className="text-xs mt-1 line-clamp-1">
 {new URL(bookmark.url).hostname}
 </CardDescription>
 </div>
 </div>
 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button
 variant="ghost"
 size="sm" className="h-7 w-7 p-0"
 onClick={() => window.open(bookmark.url, '_blank')}
 >
 <UilExternalLinkAlt size={12} />
 </Button>
 <Button
 variant="ghost"
 size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-300"
 onClick={() => handleDeleteBookmark(bookmark.id)}
 >
 <UilTrashAlt size={12} />
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {bookmark.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
 {bookmark.description}
 </p>
 )}
 <div className="flex flex-wrap gap-1">
 <Badge
 variant="outline"
 className="text-xs"
 style={{
 borderColor: getCategoryColor(bookmark.category),
 color: getCategoryColor(bookmark.category),
 }}
 >
 <UilFolder size={12} className="mr-1" />
 {bookmark.category}
 </Badge>
 {bookmark.tags.map(tag => (
 <Badge key={tag} variant="secondary" className="text-xs">
 <Tag size={12} className="mr-1" />
 {tag}
 </Badge>
 ))}
 </div>
 </CardContent>
 </Card>
 </motion.div>
 ))}
 </div>
 )}
 </div>
 );
};

export default Bookmarks;
