import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, Play, Settings, Plus, Trash2, Activity, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toolsService, type Tool, type CreateToolData } from "@/services/tools";
import { motion } from "framer-motion";

const Tools = () => {
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTools: 0,
    activeTools: 0,
    totalExecutions: 0,
    successRate: 0,
  });

  // Add tool dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTool, setNewTool] = useState<CreateToolData>({
    name: "",
    category: "analysis",
    description: "",
    tool_type: "api_endpoint",
    endpoint_url: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [toolsData, statsData] = await Promise.all([
        toolsService.getTools(),
        toolsService.getToolStats(),
      ]);

      setTools(toolsData);
      setStats(statsData);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load tools',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = async () => {
    try {
      if (!newTool.name || !newTool.category) {
        toast({
          title: "Validation Error",
          description: "Name and category are required",
          variant: "destructive",
        });
        return;
      }

      await toolsService.createTool(newTool);

      toast({
        title: "Success",
        description: "Tool added successfully",
      });

      setAddDialogOpen(false);
      setNewTool({
        name: "",
        category: "analysis",
        description: "",
        tool_type: "api_endpoint",
        endpoint_url: "",
      });

      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add tool',
        variant: "destructive",
      });
    }
  };

  const handleDeleteTool = async (id: string) => {
    try {
      await toolsService.deleteTool(id);

      toast({
        title: "Success",
        description: "Tool deleted successfully",
      });

      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete tool',
        variant: "destructive",
      });
    }
  };

  const handleExecuteTool = async (toolId: string) => {
    try {
      const execution = await toolsService.executeTool({ tool_id: toolId });

      if (execution.status === 'success') {
        toast({
          title: "Tool Executed",
          description: "Tool executed successfully",
        });
      } else {
        toast({
          title: "Execution Failed",
          description: execution.error_message || 'Tool execution failed',
          variant: "destructive",
        });
      }

      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to execute tool',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Tools</h1>
          <p className="text-muted-foreground terminal-text mt-2">
            AI-powered security testing and analysis tools
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Tool</DialogTitle>
              <DialogDescription>
                Create a new security testing or analysis tool
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Tool Name</Label>
                <Input
                  id="name"
                  value={newTool.name}
                  onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                  placeholder="e.g., Nmap Port Scanner"
                  className="terminal-text"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTool.category}
                  onValueChange={(v) => setNewTool({ ...newTool, category: v as CreateToolData['category'] })}
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reconnaissance">Reconnaissance</SelectItem>
                    <SelectItem value="scanning">Scanning</SelectItem>
                    <SelectItem value="exploitation">Exploitation</SelectItem>
                    <SelectItem value="post-exploitation">Post-Exploitation</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTool.description}
                  onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                  placeholder="Brief description..."
                  className="terminal-text"
                />
              </div>

              <div>
                <Label htmlFor="tool_type">Tool Type</Label>
                <Select
                  value={newTool.tool_type}
                  onValueChange={(v) => setNewTool({ ...newTool, tool_type: v as CreateToolData['tool_type'] })}
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_endpoint">API Endpoint</SelectItem>
                    <SelectItem value="shell_script">Shell Script</SelectItem>
                    <SelectItem value="mcp_tool">MCP Tool</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newTool.tool_type === 'api_endpoint' && (
                <div>
                  <Label htmlFor="endpoint_url">API Endpoint URL</Label>
                  <Input
                    id="endpoint_url"
                    value={newTool.endpoint_url}
                    onChange={(e) => setNewTool({ ...newTool, endpoint_url: e.target.value })}
                    placeholder="https://api.example.com/scan"
                    className="terminal-text"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTool} className="bg-primary hover:bg-primary/90">
                Add Tool
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Tools</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalTools}</div>
            <p className="text-xs text-muted-foreground">{stats.activeTools} active</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Executions</CardTitle>
            <Play className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Successful executions</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Categories</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">5</div>
            <p className="text-xs text-muted-foreground">Tool categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <Card className="border-border">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tools...</div>
          </CardContent>
        </Card>
      ) : tools.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No AI Tools Configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add security testing and analysis tools to enhance AI capabilities
            </p>
            <Button
              variant="outline"
              className="border-border text-white hover:bg-primary/10"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border hover:border-primary/30 transition-all duration-300 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {tool.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-white mt-4">{tool.name}</CardTitle>
                  <CardDescription className="text-sm">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Executions</span>
                    <span className="text-white terminal-text">{tool.execution_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant="default"
                      className={`text-xs ${
                        tool.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {tool.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="text-white terminal-text">
                      {tool.execution_count > 0
                        ? ((tool.success_count / tool.execution_count) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleExecuteTool(tool.id)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-white hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => handleDeleteTool(tool.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

export default Tools;
