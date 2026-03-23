import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Target, Activity, AlertTriangle, CheckCircle, Plus, Trash2, Flag } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { redTeamService, type RedTeamOperation, type CreateOperationData, type CreateFindingData } from "@/services/red-team";
import { motion } from "framer-motion";

const RedTeam = () => {
  const { toast } = useToast();
  const [operations, setOperations] = useState<RedTeamOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOperations: 0,
    activeOperations: 0,
    totalFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
  });

  // Add operation dialog state
  const [addOpDialogOpen, setAddOpDialogOpen] = useState(false);
  const [newOperation, setNewOperation] = useState<CreateOperationData>({
    name: "",
    target: "",
    operation_type: "pentest",
    description: "",
  });

  // Add finding dialog state
  const [addFindingDialogOpen, setAddFindingDialogOpen] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string>("");
  const [newFinding, setNewFinding] = useState<CreateFindingData>({
    operation_id: "",
    title: "",
    description: "",
    severity: "medium",
    category: "other",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [operationsData, statsData] = await Promise.all([
        redTeamService.getOperations(),
        redTeamService.getOperationStats(),
      ]);

      setOperations(operationsData);
      setStats(statsData);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load operations',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOperation = async () => {
    try {
      if (!newOperation.name || !newOperation.target) {
        toast({
          title: "Validation Error",
          description: "Name and target are required",
          variant: "destructive",
        });
        return;
      }

      await redTeamService.createOperation(newOperation);

      toast({
        title: "Success",
        description: "Operation created successfully",
      });

      setAddOpDialogOpen(false);
      setNewOperation({
        name: "",
        target: "",
        operation_type: "pentest",
        description: "",
      });

      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create operation',
        variant: "destructive",
      });
    }
  };

  const handleDeleteOperation = async (id: string) => {
    try {
      await redTeamService.deleteOperation(id);

      toast({
        title: "Success",
        description: "Operation deleted successfully",
      });

      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete operation',
        variant: "destructive",
      });
    }
  };

  const handleAddFinding = async () => {
    try {
      if (!newFinding.title || !newFinding.description) {
        toast({
          title: "Validation Error",
          description: "Title and description are required",
          variant: "destructive",
        });
        return;
      }

      await redTeamService.createFinding({
        ...newFinding,
        operation_id: selectedOperationId,
      });

      toast({
        title: "Success",
        description: "Finding added successfully",
      });

      setAddFindingDialogOpen(false);
      setNewFinding({
        operation_id: "",
        title: "",
        description: "",
        severity: "medium",
        category: "other",
      });
      setSelectedOperationId("");

      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add finding',
        variant: "destructive",
      });
    }
  };

  const openAddFindingDialog = (operationId: string) => {
    setSelectedOperationId(operationId);
    setAddFindingDialogOpen(true);
  };

  const getStatusBadgeClass = (status: RedTeamOperation['status']) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'planned':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'paused':
        return 'bg-orange-500/20 text-orange-400';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getSeverityColor = (critical: number, high: number) => {
    if (critical > 0) return 'text-red-500';
    if (high > 0) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Red Team Operations</h1>
          <p className="text-muted-foreground terminal-text mt-2">
            Active security assessments and penetration testing
          </p>
        </div>

        <Dialog open={addOpDialogOpen} onOpenChange={setAddOpDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Operation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-white">New Operation</DialogTitle>
              <DialogDescription>
                Create a new penetration test or security assessment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="op-name">Operation Name</Label>
                <Input
                  id="op-name"
                  value={newOperation.name}
                  onChange={(e) => setNewOperation({ ...newOperation, name: e.target.value })}
                  placeholder="e.g., Web App Pentest"
                  className="terminal-text"
                />
              </div>

              <div>
                <Label htmlFor="op-target">Target</Label>
                <Input
                  id="op-target"
                  value={newOperation.target}
                  onChange={(e) => setNewOperation({ ...newOperation, target: e.target.value })}
                  placeholder="e.g., example.com or 192.168.1.0/24"
                  className="terminal-text"
                />
              </div>

              <div>
                <Label htmlFor="op-type">Operation Type</Label>
                <Select
                  value={newOperation.operation_type}
                  onValueChange={(v) => setNewOperation({ ...newOperation, operation_type: v as CreateOperationData['operation_type'] })}
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pentest">Penetration Test</SelectItem>
                    <SelectItem value="red_team">Red Team Assessment</SelectItem>
                    <SelectItem value="vulnerability_assessment">Vulnerability Assessment</SelectItem>
                    <SelectItem value="bug_bounty">Bug Bounty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="op-description">Description</Label>
                <Textarea
                  id="op-description"
                  value={newOperation.description}
                  onChange={(e) => setNewOperation({ ...newOperation, description: e.target.value })}
                  placeholder="Brief description of the operation..."
                  className="terminal-text"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddOperation} className="bg-primary hover:bg-primary/90">
                Create Operation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Finding Dialog */}
        <Dialog open={addFindingDialogOpen} onOpenChange={setAddFindingDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Add Finding</DialogTitle>
              <DialogDescription>
                Document a new security finding or vulnerability
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="finding-title">Title</Label>
                <Input
                  id="finding-title"
                  value={newFinding.title}
                  onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                  placeholder="e.g., SQL Injection in Login Form"
                  className="terminal-text"
                />
              </div>

              <div>
                <Label htmlFor="finding-severity">Severity</Label>
                <Select
                  value={newFinding.severity}
                  onValueChange={(v) => setNewFinding({ ...newFinding, severity: v as CreateFindingData['severity'] })}
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="info">Informational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="finding-category">Category</Label>
                <Select
                  value={newFinding.category}
                  onValueChange={(v) => setNewFinding({ ...newFinding, category: v as CreateFindingData['category'] })}
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injection">Injection</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="authorization">Authorization</SelectItem>
                    <SelectItem value="crypto">Cryptography</SelectItem>
                    <SelectItem value="config">Configuration</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="finding-description">Description</Label>
                <Textarea
                  id="finding-description"
                  value={newFinding.description}
                  onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                  placeholder="Detailed description of the vulnerability..."
                  className="terminal-text min-h-24"
                />
              </div>

              <div>
                <Label htmlFor="finding-poc">Proof of Concept (Optional)</Label>
                <Textarea
                  id="finding-poc"
                  value={newFinding.proof_of_concept || ""}
                  onChange={(e) => setNewFinding({ ...newFinding, proof_of_concept: e.target.value })}
                  placeholder="Steps to reproduce..."
                  className="terminal-text"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddFindingDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFinding} className="bg-primary hover:bg-primary/90">
                Add Finding
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalOperations}</div>
            <p className="text-xs text-muted-foreground">{stats.activeOperations} active</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalFindings}</div>
            <p className="text-xs text-muted-foreground">All operations</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Critical Findings</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.criticalFindings}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">High Findings</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.highFindings}</div>
            <p className="text-xs text-muted-foreground">High priority issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations List */}
      {loading ? (
        <Card className="border-border">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading operations...</div>
          </CardContent>
        </Card>
      ) : operations.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Active Operations</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start a new penetration test or security assessment
            </p>
            <Button
              variant="outline"
              className="border-border text-white hover:bg-primary/10"
              onClick={() => setAddOpDialogOpen(true)}
            >
              <Target className="h-4 w-4 mr-2" />
              New Operation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {operations.map((op) => (
            <motion.div
              key={op.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border hover:border-primary/30 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white">{op.name}</CardTitle>
                      <CardDescription className="terminal-text mt-1">
                        Target: {op.target} | Type: {op.operation_type.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getStatusBadgeClass(op.status)}>
                        {op.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/20"
                        onClick={() => handleDeleteOperation(op.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-white terminal-text">{op.progress}%</span>
                    </div>
                    <Progress value={op.progress} className="h-2" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Findings</p>
                      <p className={`text-lg font-bold ${getSeverityColor(op.critical_findings, op.high_findings)}`}>
                        {op.total_findings}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Critical</p>
                      <p className="text-lg font-bold text-red-500">{op.critical_findings}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">High</p>
                      <p className="text-lg font-bold text-orange-500">{op.high_findings}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Medium</p>
                      <p className="text-lg font-bold text-yellow-500">{op.medium_findings}</p>
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90"
                        onClick={() => openAddFindingDialog(op.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Finding
                      </Button>
                    </div>
                  </div>
                  {op.description && (
                    <p className="text-sm text-muted-foreground pt-2 border-t border-border">
                      {op.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RedTeam;
