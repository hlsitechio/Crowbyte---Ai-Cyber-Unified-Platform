import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UilBolt, UilPlus, UilTrashAlt, UilCog, UilGlobe, UilShield, UilSearch, UilBracketsCurly, UilSpinner, UilCheck } from "@iconscout/react-unicons";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { IS_WEB } from "@/lib/platform";

interface BuiltinTool {
  name: string;
  category: string;
  description: string;
  requires_key: boolean;
  builtin: true;
}

interface UserTool {
  id: string;
  name: string;
  type: string;
  description: string;
  config: Record<string, any>;
  enabled: boolean;
  created_at: string;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

const CATEGORY_ICONS: Record<string, typeof UilBolt> = {
  Recon: UilSearch,
  Intel: UilShield,
  Web: UilGlobe,
  Scanning: UilBracketsCurly,
};

export default function MCPSettings() {
  const [builtinTools, setBuiltinTools] = useState<BuiltinTool[]>([]);
  const [userTools, setUserTools] = useState<UserTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTool, setNewTool] = useState({ name: "", type: "http_endpoint", description: "", url: "", apiKey: "", method: "GET" });
  const [saving, setSaving] = useState(false);

  const loadTools = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch("/api/user-tools", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBuiltinTools(data.builtin || []);
        setUserTools(data.custom || []);
      }
    } catch (err) {
      console.error("Failed to load tools:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTools(); }, []);

  const handleAddTool = async () => {
    if (!newTool.name.trim()) { toast.error("Tool name required"); return; }
    setSaving(true);
    const token = await getAuthToken();
    try {
      const config: Record<string, any> = {};
      if (newTool.type === "http_endpoint") {
        config.url = newTool.url;
        config.method = newTool.method || "GET";
        if (newTool.apiKey) config.api_key = newTool.apiKey;
      } else if (newTool.type === "api_key") {
        config.api_key = newTool.apiKey;
        config.service = newTool.name;
      }

      const res = await fetch("/api/user-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newTool.name.toLowerCase().replace(/\s+/g, "_"),
          type: newTool.type,
          description: newTool.description,
          config,
        }),
      });

      if (res.ok) {
        toast.success(`Tool "${newTool.name}" added`);
        setAddDialogOpen(false);
        setNewTool({ name: "", type: "http_endpoint", description: "", url: "", apiKey: "", method: "GET" });
        loadTools();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add tool");
      }
    } catch {
      toast.error("Failed to add tool");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTool = async (tool: UserTool) => {
    const token = await getAuthToken();
    try {
      await fetch(`/api/user-tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !tool.enabled }),
      });
      setUserTools(prev => prev.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t));
    } catch {
      toast.error("Failed to toggle tool");
    }
  };

  const handleDeleteTool = async (tool: UserTool) => {
    const token = await getAuthToken();
    try {
      await fetch(`/api/user-tools/${tool.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserTools(prev => prev.filter(t => t.id !== tool.id));
      toast.success(`Removed "${tool.name}"`);
    } catch {
      toast.error("Failed to delete tool");
    }
  };

  const groupedBuiltin = builtinTools.reduce((acc, tool) => {
    const cat = tool.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {} as Record<string, BuiltinTool[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <UilSpinner size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white font-['JetBrains_Mono']">MCP Tools</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Tools CrowByte AI can use during chat — recon, scanning, intel gathering
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <UilPlus size={14} />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/[0.06]">
            <DialogHeader>
              <DialogTitle className="text-white">Add Custom Tool</DialogTitle>
              <DialogDescription>Add an HTTP endpoint or API key as a tool CrowByte AI can call</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-300">Name</Label>
                <Input
                  value={newTool.name}
                  onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                  placeholder="my_custom_tool"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Type</Label>
                <Select value={newTool.type} onValueChange={(v) => setNewTool({ ...newTool, type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http_endpoint">HTTP Endpoint</SelectItem>
                    <SelectItem value="api_key">API UilKeySkeleton Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Description</Label>
                <Textarea
                  value={newTool.description}
                  onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                  placeholder="What does this tool do?"
                  rows={2}
                  className="mt-1"
                />
              </div>
              {newTool.type === "http_endpoint" && (
                <div>
                  <Label className="text-zinc-300">Endpoint URL</Label>
                  <Input
                    value={newTool.url}
                    onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                    placeholder="https://api.example.com/tool"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label className="text-zinc-300">API UilKeySkeleton (optional)</Label>
                <Input
                  type="password"
                  value={newTool.apiKey}
                  onChange={(e) => setNewTool({ ...newTool, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddTool} disabled={saving}>
                {saving ? <UilSpinner size={14} className="mr-1 animate-spin" /> : <UilPlus size={14} className="mr-1" />}
                Add Tool
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white font-['JetBrains_Mono']">{builtinTools.length}</p>
            <p className="text-[10px] text-zinc-500">Built-in Tools</p>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400 font-['JetBrains_Mono']">{userTools.length}</p>
            <p className="text-[10px] text-zinc-500">Custom Tools</p>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400 font-['JetBrains_Mono']">
              {builtinTools.length + userTools.filter(t => t.enabled).length}
            </p>
            <p className="text-[10px] text-zinc-500">Active in Chat</p>
          </CardContent>
        </Card>
      </div>

      {/* Built-in Tools */}
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <UilBolt size={16} className="text-blue-400" />
            Built-in Tools
          </CardTitle>
          <CardDescription className="text-xs">
            Always available — CrowByte AI calls these server-side during chat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedBuiltin).map(([category, tools]) => {
              const Icon = CATEGORY_ICONS[category] || UilBolt;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} className="text-zinc-500" />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{category}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-zinc-700 text-zinc-500">{tools.length}</Badge>
                  </div>
                  <div className="grid gap-1.5">
                    {tools.map((tool) => (
                      <div key={tool.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <UilCheck size={12} className="text-emerald-500" />
                          <span className="text-xs font-mono text-zinc-300">{tool.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 max-w-[50%] truncate">{tool.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Tools */}
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <UilCog size={16} className="text-violet-400" />
            Custom Tools
          </CardTitle>
          <CardDescription className="text-xs">
            Your own HTTP endpoints and API services — toggled per-user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userTools.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-zinc-600">No custom tools yet</p>
              <p className="text-[10px] text-zinc-700 mt-1">Add HTTP endpoints or API keys that CrowByte AI can call</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userTools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={() => handleToggleTool(tool)}
                    />
                    <div>
                      <span className="text-xs font-mono text-zinc-300">{tool.name}</span>
                      <p className="text-[10px] text-zinc-600">{tool.description || tool.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-zinc-700 text-zinc-500">{tool.type}</Badge>
                    <button
                      onClick={() => handleDeleteTool(tool)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <UilTrashAlt size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
