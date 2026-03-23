import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Plus,
  Play,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Swords,
  Brain,
  FileText,
  Trash2,
  Edit,
  Copy,
  BarChart3,
  Network,
  Calendar,
  ListChecks
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface MissionPlan {
  id: string;
  name: string;
  type: 'offensive' | 'defensive' | 'pentest' | 'incident_response';
  status: 'draft' | 'planning' | 'approved' | 'active' | 'completed' | 'failed';
  objective: string;
  targetScope: string;
  timeline: {
    startDate?: Date;
    endDate?: Date;
    phases: Phase[];
  };
  risks: Risk[];
  successCriteria: string[];
  failureScenarios: string[];
  aiAssessment: {
    feasibilityScore: number;
    riskScore: number;
    successProbability: number;
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  duration: number; // hours
  dependencies: string[];
  tasks: Task[];
  status: 'pending' | 'active' | 'completed' | 'failed';
}

interface Task {
  id: string;
  name: string;
  description: string;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Risk {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100
  impact: number; // 0-100
  mitigation: string;
}

const PLAN_TEMPLATES = [
  {
    id: 'web_app_pentest',
    name: 'Web Application Pentest',
    type: 'pentest' as const,
    description: 'Comprehensive web application penetration test',
    objective: 'Identify and exploit vulnerabilities in web applications',
    phases: [
      { name: 'Reconnaissance', duration: 8 },
      { name: 'Vulnerability Scanning', duration: 4 },
      { name: 'Exploitation', duration: 16 },
      { name: 'Post-Exploitation', duration: 8 },
      { name: 'Reporting', duration: 8 },
    ]
  },
  {
    id: 'network_attack',
    name: 'Network Infrastructure Attack',
    type: 'offensive' as const,
    description: 'Red team network penetration operation',
    objective: 'Gain unauthorized access to network infrastructure',
    phases: [
      { name: 'External Reconnaissance', duration: 16 },
      { name: 'Initial Access', duration: 12 },
      { name: 'Lateral Movement', duration: 16 },
      { name: 'Privilege Escalation', duration: 8 },
      { name: 'Persistence', duration: 8 },
      { name: 'Exfiltration', duration: 8 },
    ]
  },
  {
    id: 'incident_response',
    name: 'Incident Response Plan',
    type: 'defensive' as const,
    description: 'Security incident response and containment',
    objective: 'Detect, contain, and remediate security incidents',
    phases: [
      { name: 'Detection & Analysis', duration: 2 },
      { name: 'Containment', duration: 4 },
      { name: 'Eradication', duration: 8 },
      { name: 'Recovery', duration: 8 },
      { name: 'Post-Incident Review', duration: 4 },
    ]
  },
  {
    id: 'cloud_security_audit',
    name: 'Cloud Security Audit',
    type: 'defensive' as const,
    description: 'Comprehensive cloud infrastructure security assessment',
    objective: 'Assess and improve cloud security posture',
    phases: [
      { name: 'Asset Discovery', duration: 8 },
      { name: 'Configuration Review', duration: 16 },
      { name: 'Access Control Audit', duration: 8 },
      { name: 'Vulnerability Assessment', duration: 16 },
      { name: 'Remediation Planning', duration: 8 },
    ]
  }
];

const MissionPlanner = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<MissionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MissionPlan | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiPlannerDialogOpen, setAiPlannerDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    type: 'pentest' as const,
    objective: '',
    targetScope: '',
  });

  useEffect(() => {
    // Load plans from localStorage for demo
    const savedPlans = localStorage.getItem('mission_plans');
    if (savedPlans) {
      setPlans(JSON.parse(savedPlans));
    }
  }, []);

  const savePlans = (updatedPlans: MissionPlan[]) => {
    localStorage.setItem('mission_plans', JSON.stringify(updatedPlans));
    setPlans(updatedPlans);
  };

  const createPlanFromTemplate = (templateId: string) => {
    const template = PLAN_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setNewPlan({
      name: template.name,
      type: template.type,
      objective: template.objective,
      targetScope: '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreatePlan = () => {
    if (!newPlan.name || !newPlan.objective) {
      toast({
        title: "Validation Error",
        description: "Name and objective are required",
        variant: "destructive",
      });
      return;
    }

    const plan: MissionPlan = {
      id: Date.now().toString(),
      ...newPlan,
      status: 'draft',
      timeline: {
        phases: [],
      },
      risks: [],
      successCriteria: [],
      failureScenarios: [],
      aiAssessment: {
        feasibilityScore: 0,
        riskScore: 0,
        successProbability: 0,
        recommendations: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPlans = [...plans, plan];
    savePlans(updatedPlans);
    setCreateDialogOpen(false);
    setSelectedPlan(plan);

    toast({
      title: "Mission Plan Created",
      description: `${plan.name} has been created successfully`,
    });
  };

  const deletePlan = (id: string) => {
    const updatedPlans = plans.filter(p => p.id !== id);
    savePlans(updatedPlans);
    if (selectedPlan?.id === id) {
      setSelectedPlan(null);
    }
    toast({
      title: "Plan Deleted",
      description: "Mission plan has been removed",
    });
  };

  const getStatusColor = (status: MissionPlan['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'planning': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'active': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return '';
    }
  };

  const getTypeIcon = (type: MissionPlan['type']) => {
    switch (type) {
      case 'offensive': return <Swords className="h-4 w-4 text-red-400" />;
      case 'defensive': return <Shield className="h-4 w-4 text-blue-400" />;
      case 'pentest': return <Target className="h-4 w-4 text-purple-400" />;
      case 'incident_response': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gradient-silver flex items-center gap-3">
            <Target className="h-10 w-10 text-primary animate-pulse" />
            Mission Planner
          </h1>
          <p className="text-sm text-muted-foreground terminal-text mt-2">
            Strategic planning for offensive & defensive operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAiPlannerDialogOpen(true)}
            className="border-primary/30 hover:bg-primary/10"
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Planner Agent
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary/20 hover:bg-primary/30 border border-primary/50">
                <Plus className="h-4 w-4 mr-2" />
                New Mission Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Mission Plan</DialogTitle>
                <DialogDescription>
                  Define your operation objectives and parameters
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mission Name</Label>
                  <Input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Operation Nightfall"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newPlan.type}
                    onValueChange={(value: any) => setNewPlan({ ...newPlan, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offensive">Offensive (Red Team)</SelectItem>
                      <SelectItem value="defensive">Defensive (Blue Team)</SelectItem>
                      <SelectItem value="pentest">Penetration Test</SelectItem>
                      <SelectItem value="incident_response">Incident Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea
                    value={newPlan.objective}
                    onChange={(e) => setNewPlan({ ...newPlan, objective: e.target.value })}
                    placeholder="Primary mission objective..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Scope</Label>
                  <Input
                    value={newPlan.targetScope}
                    onChange={(e) => setNewPlan({ ...newPlan, targetScope: e.target.value })}
                    placeholder="IP ranges, domains, systems..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlan}>Create Plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{plans.length}</div>
            <p className="text-xs text-muted-foreground">
              {plans.filter(p => p.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {plans.filter(p => p.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {plans.filter(p => p.status === 'active' || p.status === 'planning').length}
            </div>
            <p className="text-xs text-muted-foreground">Active operations</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {plans.filter(p => p.status === 'failed').length}
            </div>
            <p className="text-xs text-muted-foreground">Unsuccessful missions</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Templates */}
      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Quick Start Templates
          </CardTitle>
          <CardDescription>Pre-configured mission plans for common scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className="border-primary/20 bg-card/30 hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => createPlanFromTemplate(template.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    {getTypeIcon(template.type)}
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      {template.phases.length} phases
                    </Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <Button variant="ghost" size="sm" className="w-full text-xs group-hover:bg-primary/10">
                    <Plus className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mission Plans List */}
      {plans.length > 0 && (
        <Card className="border-primary/30 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Your Mission Plans</CardTitle>
            <CardDescription>Manage and execute your operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition-all bg-card/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(plan.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{plan.name}</h3>
                          <Badge variant="outline" className={getStatusColor(plan.status)}>
                            {plan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{plan.objective}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                          {plan.timeline.phases.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Network className="h-3 w-3" />
                              {plan.timeline.phases.length} phases
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlan(plan)}
                        className="text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePlan(plan.id)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {plans.length === 0 && (
        <Card className="border-primary/30 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-primary/50 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Mission Plans Yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              Create your first mission plan using a template above or start from scratch
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Planner Agent Dialog */}
      <Dialog open={aiPlannerDialogOpen} onOpenChange={setAiPlannerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Mission Planner Agent
            </DialogTitle>
            <DialogDescription>
              Get AI-powered strategic planning assistance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="border-primary/30 bg-card/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <Brain className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-2">Strategic Planning AI</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      The AI Planner Agent will analyze your objectives and generate:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Comprehensive attack/defense strategies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Risk assessment and mitigation plans</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Success probability scoring</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Timeline and resource optimization</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="text-center">
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    Coming Soon — OpenClaw & NVIDIA Free Integration
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiPlannerDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissionPlanner;
