import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Trash2, Edit2, Plus, Save, X } from "lucide-react";
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

interface MemoryFact {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function Memory() {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMemoryFacts();
  }, []);

  const fetchMemoryFacts = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view memory",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('memory_facts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch memory facts:', error);
      toast({
        title: "Error",
        description: "Failed to load memory facts",
        variant: "destructive",
      });
    } else {
      setFacts(data || []);
    }
    setIsLoading(false);
  };

  const handleEdit = (fact: MemoryFact) => {
    setEditingId(fact.id);
    setEditKey(fact.key);
    setEditValue(fact.value);
    setIsAdding(false);
  };

  const handleSaveEdit = async () => {
    if (!editKey.trim() || !editValue.trim()) {
      toast({
        title: "Validation Error",
        description: "Both key and value are required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('memory_facts')
      .update({ key: editKey, value: editValue })
      .eq('id', editingId);

    if (error) {
      console.error('Failed to update memory fact:', error);
      toast({
        title: "Error",
        description: "Failed to update memory fact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Memory fact updated successfully",
      });
      setEditingId(null);
      fetchMemoryFacts();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditKey("");
    setEditValue("");
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast({
        title: "Validation Error",
        description: "Both key and value are required",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('memory_facts')
      .insert({ user_id: user.id, key: newKey, value: newValue });

    if (error) {
      console.error('Failed to add memory fact:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "A memory with this key already exists" 
          : "Failed to add memory fact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Memory fact added successfully",
      });
      setIsAdding(false);
      setNewKey("");
      setNewValue("");
      fetchMemoryFacts();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('memory_facts')
      .delete()
      .eq('id', deleteId);

    if (error) {
      console.error('Failed to delete memory fact:', error);
      toast({
        title: "Error",
        description: "Failed to delete memory fact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Memory fact deleted successfully",
      });
      fetchMemoryFacts();
    }
    setDeleteId(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Memory Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage persistent memory facts that CrowByte AI remembers across sessions
        </p>
      </div>

      <Card className="p-6 mb-6 border-border bg-card/50 backdrop-blur">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">Stored Memories</h2>
          <Button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Memory
          </Button>
        </div>

        {isAdding && (
          <Card className="p-4 mb-4 border-primary/50 bg-primary/5">
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-key">Key</Label>
                <Input
                  id="new-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g., name, preferred_language, company"
                  className="bg-background"
                />
              </div>
              <div>
                <Label htmlFor="new-value">Value</Label>
                <Textarea
                  id="new-value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter the value to remember"
                  className="bg-background min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewKey("");
                    setNewValue("");
                  }}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading memories...</div>
          ) : facts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No memories stored yet. Add your first memory or ask CrowByte AI to remember something!
            </div>
          ) : (
            <div className="space-y-4">
              {facts.map((fact) => (
                <Card key={fact.id} className="p-4 border-border bg-muted/30">
                  {editingId === fact.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`edit-key-${fact.id}`}>Key</Label>
                        <Input
                          id={`edit-key-${fact.id}`}
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-value-${fact.id}`}>Value</Label>
                        <Textarea
                          id={`edit-value-${fact.id}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-background min-h-[100px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} size="sm" className="bg-primary hover:bg-primary/90">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">{fact.key}</h3>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {fact.value}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleEdit(fact)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => setDeleteId(fact.id)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated: {new Date(fact.updated_at).toLocaleString()}
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be undone.
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
  );
}
