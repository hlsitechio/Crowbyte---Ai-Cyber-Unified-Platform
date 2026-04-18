import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { UilCommentDots, UilPlus, UilTrashAlt, UilPen, UilFolderPlus, UilFolder, UilAngleRight, UilAngleDown, UilCheck, UilTimes, UilCheckSquare, UilSquare, UilSearch } from "@iconscout/react-unicons";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Conversation {
 id: string;
 title: string;
 folder_id: string | null;
 updated_at: string;
}

interface FolderType {
 id: string;
 name: string;
 conversations: Conversation[];
}

interface ConversationsSidebarProps {
 currentConversationId: string | null;
 onSelectConversation: (conversationId: string) => void;
 onNewConversation: () => void;
}

export function ConversationsSidebar({
 currentConversationId,
 onSelectConversation,
 onNewConversation,
}: ConversationsSidebarProps) {
 const [folders, setFolders] = useState<FolderType[]>([]);
 const [unorganizedConversations, setUnorganizedConversations] = useState<Conversation[]>([]);
 const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editingName, setEditingName] = useState("");
 const [deleteId, setDeleteId] = useState<string | null>(null);
 const [deleteType, setDeleteType] = useState<"conversation" | "folder">("conversation");
 const [isCreatingFolder, setIsCreatingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState("");
 const [selectionMode, setSelectionMode] = useState(false);
 const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
 const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
 const [searchQuery, setSearchQuery] = useState("");
 const { toast } = useToast();

 // Require 8px drag distance before activating — prevents click-to-select from triggering drag
 const pointerSensor = useSensor(PointerSensor, {
   activationConstraint: { distance: 8 },
 });
 const sensors = useSensors(pointerSensor);

 // Search filter
 const filteredConversations = useMemo(() => {
   if (!searchQuery.trim()) return unorganizedConversations;
   const q = searchQuery.toLowerCase();
   return unorganizedConversations.filter(c => c.title?.toLowerCase().includes(q));
 }, [unorganizedConversations, searchQuery]);

 const filteredFolders = useMemo(() => {
   if (!searchQuery.trim()) return folders;
   const q = searchQuery.toLowerCase();
   return folders.map(f => ({
     ...f,
     conversations: f.conversations.filter(c => c.title?.toLowerCase().includes(q)),
   })).filter(f => f.name.toLowerCase().includes(q) || f.conversations.length > 0);
 }, [folders, searchQuery]);

 useEffect(() => {
 fetchData();
 }, []);

 const fetchData = async () => {
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 // Folders feature disabled until table is created via migration
 // TODO: Enable after running: CREATE TABLE folders (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users, name text, created_at timestamptz default now());
 let foldersData: any[] | null = null;

 // Fetch all conversations — try with folder_id, fall back without
 let conversationsData: any[] | null = null;
 const convRes = await supabase
 .from('conversations')
 .select('id, title, updated_at')
 .eq('user_id', user.id)
 .order('updated_at', { ascending: false });
 conversationsData = convRes.data;

 if (conversationsData) {
 if (foldersData && foldersData.length > 0) {
 const foldersWithConversations: FolderType[] = foldersData.map((folder: any) => ({
 ...folder,
 conversations: conversationsData!.filter((c: any) => c.folder_id === folder.id)
 }));
 setFolders(foldersWithConversations);
 setUnorganizedConversations(conversationsData.filter((c: any) => !c.folder_id));
 } else {
 setFolders([]);
 setUnorganizedConversations(conversationsData.map((c: any) => ({ ...c, folder_id: null })));
 }
 }
 };

 const toggleFolder = (folderId: string) => {
 setExpandedFolders(prev => {
 const next = new Set(prev);
 if (next.has(folderId)) {
 next.delete(folderId);
 } else {
 next.add(folderId);
 }
 return next;
 });
 };

 const handleRename = async (id: string, type: "conversation" | "folder") => {
 if (!editingName.trim()) return;

 const table = type === "conversation" ? "conversations" : "folders";
 const column = type === "conversation" ? "title" : "name";

 const { error } = await supabase
 .from(table)
 .update({ [column]: editingName })
 .eq('id', id);

 if (error) {
 toast({
 title: "Error",
 description: `Failed to rename ${type}`,
 variant: "destructive",
 });
 } else {
 toast({
 title: "Success",
 description: `${type === "conversation" ? "Chat" : "Folder"} renamed successfully`,
 });
 setEditingId(null);
 fetchData();
 }
 };

 const handleDelete = async () => {
 if (!deleteId) return;

 const table = deleteType === "conversation" ? "conversations" : "folders";

 const { error } = await supabase
 .from(table)
 .delete()
 .eq('id', deleteId);

 if (error) {
 toast({
 title: "Error",
 description: `Failed to delete ${deleteType}`,
 variant: "destructive",
 });
 } else {
 toast({
 title: "Success",
 description: `${deleteType === "conversation" ? "Chat" : "Folder"} deleted successfully`,
 });
 fetchData();
 }
 setDeleteId(null);
 };

 const handleCreateFolder = async () => {
 if (!newFolderName.trim()) return;

 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 const { error } = await supabase
 .from('folders')
 .insert({ user_id: user.id, name: newFolderName });

 if (error) {
 toast({
 title: "Error",
 description: "Failed to create folder",
 variant: "destructive",
 });
 } else {
 toast({
 title: "Success",
 description: "Folder created successfully",
 });
 setIsCreatingFolder(false);
 setNewFolderName("");
 fetchData();
 }
 };

 const handleMoveToFolder = async (conversationId: string, folderId: string | null) => {
 const { error } = await supabase
 .from('conversations')
 .update({ folder_id: folderId })
 .eq('id', conversationId);

 if (error) {
 toast({
 title: "Error",
 description: "Failed to move conversation",
 variant: "destructive",
 });
 } else {
 toast({
 title: "Success",
 description: "Chat moved successfully",
 });
 fetchData();
 }
 };

 const toggleSelection = (conversationId: string) => {
 setSelectedConversations(prev => {
 const next = new Set(prev);
 if (next.has(conversationId)) {
 next.delete(conversationId);
 } else {
 next.add(conversationId);
 }
 return next;
 });
 };

 const getAllConversationIds = () => {
 const allConvos: string[] = [];
 folders.forEach(folder => {
 folder.conversations.forEach(conv => allConvos.push(conv.id));
 });
 unorganizedConversations.forEach(conv => allConvos.push(conv.id));
 return allConvos;
 };

 const handleSelectAll = () => {
 const allIds = getAllConversationIds();
 if (selectedConversations.size === allIds.length) {
 setSelectedConversations(new Set());
 } else {
 setSelectedConversations(new Set(allIds));
 }
 };

 const handleBulkDelete = async () => {
 if (selectedConversations.size === 0) return;

 const conversationIds = Array.from(selectedConversations);

 const { error } = await supabase
 .from('conversations')
 .delete()
 .in('id', conversationIds);

 if (error) {
 toast({
 title: "Error",
 description: "Failed to delete conversations",
 variant: "destructive",
 });
 } else {
 toast({
 title: "Success",
 description: `Deleted ${conversationIds.length} conversation(s)`,
 });
 setSelectedConversations(new Set());
 setSelectionMode(false);
 fetchData();
 }
 };

 const handleBulkMoveToFolder = async (folderId: string | null) => {
 if (selectedConversations.size === 0) return;

 const conversationIds = Array.from(selectedConversations);

 const { error } = await supabase
 .from('conversations')
 .update({ folder_id: folderId })
 .in('id', conversationIds);

 if (error) {
 toast({
 title: "Error",
 description: "Failed to move conversations",
 variant: "destructive",
 });
 } else {
 toast({
 title: "Success",
 description: `Moved ${conversationIds.length} conversation(s)`,
 });
 setSelectedConversations(new Set());
 setSelectionMode(false);
 fetchData();
 }
 };

 const handleDragEnd = async (event: DragEndEvent) => {
 const { active, over } = event;
 setActiveConversation(null);

 if (!over || active.id === over.id) return;

 const conversationId = active.id as string;
 const targetFolderId = over.id === 'unorganized' ? null : (over.id as string);

 await handleMoveToFolder(conversationId, targetFolderId);
 };

 const handleDragStart = (event: DragStartEvent) => {
 const conversation = [...folders.flatMap(f => f.conversations), ...unorganizedConversations]
 .find(c => c.id === event.active.id);
 setActiveConversation(conversation || null);
 };

 const DroppableFolderZone = ({ folderId, children }: { folderId: string; children: React.ReactNode }) => {
 const { setNodeRef, isOver } = useDroppable({
 id: folderId,
 });

 return (
 <div
 ref={setNodeRef}
 className={`transition-colors ${isOver ? "bg-primary/10 rounded-lg" : ""}`}
 >
 {children}
 </div>
 );
 };

 const DraggableConversationItem = ({ conversation, showFolder = false }: { conversation: Conversation; showFolder?: boolean }) => {
 const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
 id: conversation.id,
 disabled: selectionMode,
 });

 const style = transform ? {
 transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
 } : undefined;

 const isSelected = selectedConversations.has(conversation.id);

 return (
 <div
 ref={setNodeRef}
 style={style}
 {...attributes}
 {...listeners}
 className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
 currentConversationId === conversation.id
 ? "bg-primary/20 border border-primary/40"
 : isSelected
 ? "bg-primary/10 border border-primary/30"
 : "hover:bg-muted/50"
 } ${isDragging ? "opacity-50" : ""}`}
 >
 {selectionMode && (
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0 shrink-0"
 onClick={(e) => {
 e.stopPropagation();
 toggleSelection(conversation.id);
 }}
 >
 {isSelected ? (
 <UilCheckSquare size={16} className="text-primary" />
 ) : (
 <UilSquare size={16} />
 )}
 </Button>
 )}
 <div
 className="flex-1 min-w-0"
 onClick={() => !selectionMode && onSelectConversation(conversation.id)}
 >
 {editingId === conversation.id ? (
 <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
 <Input
 value={editingName}
 onChange={(e) => setEditingName(e.target.value)}
 className="h-7 text-sm"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === "Enter") handleRename(conversation.id, "conversation");
 if (e.key === "Escape") setEditingId(null);
 }}
 />
 <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleRename(conversation.id, "conversation")}>
 <UilCheck size={12} />
 </Button>
 <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
 <UilTimes size={12} />
 </Button>
 </div>
 ) : (
 <p className="text-sm truncate text-foreground">{conversation.title || "Untitled Chat"}</p>
 )}
 </div>
 {!selectionMode && (
 <div className="flex gap-1 opacity-0 group-hover:opacity-100">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
 <UilFolder size={12} />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent>
 <DropdownMenuItem onClick={() => handleMoveToFolder(conversation.id, null)}>
 No Folder
 </DropdownMenuItem>
 {folders.map(folder => (
 <DropdownMenuItem key={folder.id} onClick={() => handleMoveToFolder(conversation.id, folder.id)}>
 {folder.name}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0"
 onClick={() => {
 setEditingId(conversation.id);
 setEditingName(conversation.title || "");
 }}
 >
 <UilPen size={12} />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0 hover:text-destructive"
 onClick={() => {
 setDeleteId(conversation.id);
 setDeleteType("conversation");
 }}
 >
 <UilTrashAlt size={12} />
 </Button>
 </div>
 )}
 </div>
 );
 };

 return (
 <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
 <div className="w-72 border-r border-white/[0.04] bg-black/20 backdrop-blur-md flex flex-col h-full">
 <div className="p-3 border-b border-white/[0.04] space-y-2">
 {/* Search */}
 <div className="relative">
 <UilSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search chats..."
 className="h-8 pl-8 text-xs bg-zinc-900/50 border-white/[0.06] placeholder:text-zinc-700"
 />
 </div>
 {!selectionMode ? (
 <>
 <Button onClick={onNewConversation} className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white">
 <UilPlus size={14} className="mr-1.5" />
 New Chat
 </Button>
 <div className="flex gap-2">
 <Button
 onClick={() => setIsCreatingFolder(true)}
 variant="outline"
 className="flex-1"
 >
 <UilFolderPlus size={16} className="mr-2" />
 New Folder
 </Button>
 <Button
 onClick={() => setSelectionMode(true)}
 variant="outline"
 className="flex-1"
 >
 <UilCheckSquare size={16} className="mr-2" />
 Select
 </Button>
 </div>
 </>
 ) : (
 <>
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm text-muted-foreground">
 {selectedConversations.size} selected
 </span>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setSelectionMode(false);
 setSelectedConversations(new Set());
 }}
 >
 <UilTimes size={16} className="mr-1" />
 Cancel
 </Button>
 </div>
 <Button
 onClick={handleSelectAll}
 variant="outline"
 className="w-full"
 >
 {selectedConversations.size === getAllConversationIds().length ? (
 <>
 <UilSquare size={16} className="mr-2" />
 Deselect All
 </>
 ) : (
 <>
 <UilCheckSquare size={16} className="mr-2" />
 Select All
 </>
 )}
 </Button>
 <div className="flex gap-2">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="outline"
 className="flex-1"
 disabled={selectedConversations.size === 0}
 >
 <UilFolder size={16} className="mr-2" />
 Move
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent>
 <DropdownMenuItem onClick={() => handleBulkMoveToFolder(null)}>
 No Folder
 </DropdownMenuItem>
 {folders.map(folder => (
 <DropdownMenuItem key={folder.id} onClick={() => handleBulkMoveToFolder(folder.id)}>
 {folder.name}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 <Button
 onClick={handleBulkDelete}
 variant="destructive"
 className="flex-1"
 disabled={selectedConversations.size === 0}
 >
 <UilTrashAlt size={16} className="mr-2" />
 Delete
 </Button>
 </div>
 </>
 )}
 </div>

 {isCreatingFolder && (
 <div className="p-4 border-b border-border bg-primary/5">
 <div className="flex gap-2">
 <Input
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 placeholder="Folder name"
 className="flex-1"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === "Enter") handleCreateFolder();
 if (e.key === "Escape") setIsCreatingFolder(false);
 }}
 />
 <Button size="sm" onClick={handleCreateFolder}>
 <UilCheck size={16} />
 </Button>
 <Button size="sm" variant="outline" onClick={() => setIsCreatingFolder(false)}>
 <UilTimes size={16} />
 </Button>
 </div>
 </div>
 )}

 <ScrollArea className="flex-1">
 <div className="p-4 space-y-2">
 {filteredFolders.map(folder => (
 <DroppableFolderZone key={folder.id} folderId={folder.id}>
 <div>
 <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group">
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0"
 onClick={() => toggleFolder(folder.id)}
 >
 {expandedFolders.has(folder.id) ? (
 <UilAngleDown size={16} />
 ) : (
 <UilAngleRight size={16} />
 )}
 </Button>
 <UilFolder size={16} className="text-primary" />
 {editingId === folder.id ? (
 <div className="flex gap-1 flex-1">
 <Input
 value={editingName}
 onChange={(e) => setEditingName(e.target.value)}
 className="h-7 text-sm"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === "Enter") handleRename(folder.id, "folder");
 if (e.key === "Escape") setEditingId(null);
 }}
 />
 <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleRename(folder.id, "folder")}>
 <UilCheck size={12} />
 </Button>
 </div>
 ) : (
 <span className="flex-1 text-sm font-medium text-foreground">{folder.name}</span>
 )}
 <div className="flex gap-1 opacity-0 group-hover:opacity-100">
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0"
 onClick={(e) => {
 e.stopPropagation();
 setEditingId(folder.id);
 setEditingName(folder.name);
 }}
 >
 <UilPen size={12} />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="h-6 w-6 p-0 hover:text-destructive"
 onClick={(e) => {
 e.stopPropagation();
 setDeleteId(folder.id);
 setDeleteType("folder");
 }}
 >
 <UilTrashAlt size={12} />
 </Button>
 </div>
 </div>
 {expandedFolders.has(folder.id) && (
 <div className="ml-6 mt-1 space-y-1">
 {folder.conversations.map(conv => (
 <DraggableConversationItem key={conv.id} conversation={conv} />
 ))}
 </div>
 )}
 </div>
 </DroppableFolderZone>
 ))}

 {filteredConversations.length > 0 && (
 <DroppableFolderZone folderId="unorganized">
 <div className="mt-4">
 <div className="flex items-center gap-2 px-2 py-1 mb-1">
 <UilCommentDots size={16} className="text-muted-foreground" />
 <span className="text-xs font-medium text-muted-foreground uppercase">Unorganized</span>
 </div>
 <div className="space-y-1">
 {filteredConversations.map(conv => (
 <DraggableConversationItem key={conv.id} conversation={conv} showFolder />
 ))}
 </div>
 </div>
 </DroppableFolderZone>
 )}
 </div>
 </ScrollArea>

 <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Delete {deleteType === "conversation" ? "Chat" : "Folder"}?</AlertDialogTitle>
 <AlertDialogDescription>
 {deleteType === "conversation"
 ? "This will permanently delete this conversation and all its messages."
 : "This will delete the folder. Conversations inside will be moved to unorganized."}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
 Delete
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>

 <DragOverlay>
 {activeConversation ? (
 <div className="p-2 rounded-lg bg-primary/20 border border-primary/40 shadow-lg backdrop-blur-sm">
 <p className="text-sm truncate text-foreground">{activeConversation.title || "Untitled Chat"}</p>
 </div>
 ) : null}
 </DragOverlay>
 </DndContext>
 );
}
