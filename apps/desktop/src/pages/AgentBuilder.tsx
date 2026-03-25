import { useState, useEffect } from"react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from"@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Card } from"@/components/ui/card";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Button } from"@/components/ui/button";
import { Switch } from"@/components/ui/switch";
import { Badge } from"@/components/ui/badge";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Plus, UploadSimple, Trash, GearSix, PaperPlaneTilt, Robot, Code, MagnifyingGlass, Image, Database, Shield } from "@phosphor-icons/react";
import { Separator } from"@/components/ui/separator";
import { useToast } from"@/hooks/use-toast";
import { customAgentsService, type CustomAgent } from"@/services/custom-agents";
import { customAgentExecutor } from"@/services/custom-agent-executor";

interface Tool {
 id: string;
 name: string;
 description: string;
 endpoint: string;
}

const AgentBuilder = () => {
 const { toast } = useToast();
 const [activeTab, setActiveTab] = useState("configure");
 const [agentName, setAgentName] = useState("");
 const [description, setDescription] = useState("");
 const [instructions, setInstructions] = useState("");
 const [selectedModel, setSelectedModel] = useState("llama-3.3-70b");
 const [category, setCategory] = useState("security");
 const [conversationStarters, setConversationStarters] = useState<string[]>([""]);
 const [tools, setTools] = useState<Tool[]>([]);
 const [capabilities, setCapabilities] = useState({
 webSearch: false,
 codeExecution: false,
 mcpTools: false,
 fileAccess: false,
 });
 const [previewMessages, setPreviewMessages] = useState<Array<{ role: string; content: string }>>([
 { role:"assistant", content:"Agent preview will appear here once configured." },
 ]);
 const [previewInput, setPreviewInput] = useState("");
 const [saving, setSaving] = useState(false);
 const [agents, setAgents] = useState<CustomAgent[]>([]);
 const [isPreviewLoading, setIsPreviewLoading] = useState(false);

 useEffect(() => {
 loadAgents();
 }, []);

 const loadAgents = async () => {
 // TODO: Enable when custom_agents table exists in Supabase
 // CREATE TABLE custom_agents (id uuid PK, user_id uuid, name text, description text,
 // system_prompt text, model text, category text, example_prompts text[], capabilities jsonb,
 // enable_web_search bool, enable_code_execution bool, enable_file_upload bool,
 // status text DEFAULT 'active', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
 //
 // Uncomment when table is created:
 // try {
 // const data = await customAgentsService.getAgents();
 // setAgents(data);
 // } catch { /* silent */ }
 };

 const handleSaveAgent = async () => {
 try {
 if (!agentName || !instructions) {
 toast({
 title:"Validation Error",
 description:"Name and instructions are required",
 variant:"destructive",
 });
 return;
 }

 setSaving(true);

 await customAgentsService.createAgent({
 name: agentName,
 description: description || undefined,
 system_prompt: instructions,
 model: selectedModel,
 category,
 example_prompts: conversationStarters.filter(s => s.trim() !==""),
 enable_web_search: capabilities.webSearch,
 enable_code_execution: capabilities.codeExecution,
 enable_mcp: capabilities.mcpTools,
 enable_file_access: capabilities.fileAccess,
 tools: tools.map(t => ({
 name: t.name,
 description: t.description,
 endpoint: t.endpoint,
 })),
 });

 toast({
 title:"Success",
 description:"Agent saved successfully",
 });

 // Reset form
 setAgentName("");
 setDescription("");
 setInstructions("");
 setConversationStarters([""]);
 setTools([]);
 setCapabilities({
 webSearch: false,
 codeExecution: false,
 mcpTools: false,
 fileAccess: false,
 });

 loadAgents();
 } catch (error: unknown) {
 toast({
 title:"Error",
 description: error instanceof Error ? error.message : 'Failed to save agent',
 variant:"destructive",
 });
 } finally {
 setSaving(false);
 }
 };

 const addConversationStarter = () => {
 setConversationStarters([...conversationStarters,""]);
 };

 const updateConversationStarter = (index: number, value: string) => {
 const updated = [...conversationStarters];
 updated[index] = value;
 setConversationStarters(updated);
 };

 const removeConversationStarter = (index: number) => {
 setConversationStarters(conversationStarters.filter((_, i) => i !== index));
 };

 const addTool = () => {
 const newTool: Tool = {
 id: `tool-${Date.now()}`,
 name:"",
 description:"",
 endpoint:"",
 };
 setTools([...tools, newTool]);
 };

 const updateTool = (id: string, field: keyof Tool, value: string) => {
 setTools(tools.map((tool) => (tool.id === id ? { ...tool, [field]: value } : tool)));
 };

 const removeTool = (id: string) => {
 setTools(tools.filter((tool) => tool.id !== id));
 };

 const sendPreviewMessage = async () => {
 if (!previewInput.trim() || isPreviewLoading) return;

 const userMessage = previewInput;

 // Add user message
 setPreviewMessages(prev => [
 ...prev,
 { role:"user", content: userMessage }
 ]);
 setPreviewInput("");
 setIsPreviewLoading(true);

 try {
 // Check if agent is configured
 if (!instructions.trim()) {
 toast({
 title:"Agent Not Configured",
 description:"Please add instructions for your agent first",
 variant:"destructive",
 });
 setPreviewMessages(prev => [
 ...prev,
 { role:"assistant", content:"⚠️ Please configure agent instructions before testing." }
 ]);
 setIsPreviewLoading(false);
 return;
 }

 // Build temporary agent from current form state
 const tempAgent: CustomAgent = {
 id: 'preview',
 user_id: 'preview',
 name: agentName || 'Preview Agent',
 description: description || undefined,
 avatar_icon: 'Bot',
 color: '#8b5cf6',
 system_prompt: instructions,
 model: selectedModel,
 temperature: 0.7,
 max_tokens: 2000,
 tools: [],
 knowledge_sources: [],
 example_prompts: [],
 enable_mcp: capabilities.mcpTools,
 enable_web_search: capabilities.webSearch,
 enable_code_execution: capabilities.codeExecution,
 enable_file_access: capabilities.fileAccess,
 status: 'active',
 is_public: false,
 execution_count: 0,
 tags: [],
 category: category,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };

 // Get conversation history (exclude initial message)
 const history = previewMessages
 .filter((m, i) => i > 0) // Skip initial assistant message
 .map(m => ({
 role: m.role === 'user' ? 'user' as const : 'assistant' as const,
 content: m.content
 }));

 // Add streaming assistant message
 setPreviewMessages(prev => [
 ...prev,
 { role:"assistant", content:"" }
 ]);

 // Execute with streaming
 let fullResponse = '';
 for await (const chunk of customAgentExecutor.executeStream(tempAgent, userMessage, history)) {
 fullResponse += chunk;
 setPreviewMessages(prev => {
 const newMessages = [...prev];
 newMessages[newMessages.length - 1] = {
 role:"assistant",
 content: fullResponse
 };
 return newMessages;
 });
 }

 } catch (error) {
 console.error('Preview error:', error);
 toast({
 title:"Preview Error",
 description: error instanceof Error ? error.message :"Failed to generate response",
 variant:"destructive",
 });

 setPreviewMessages(prev => [
 ...prev,
 { role:"assistant", content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
 ]);
 } finally {
 setIsPreviewLoading(false);
 }
 };

 return (
 <div className="h-[calc(100vh-8rem)] animate-fade-in">
 <div className="mb-4">
 <h1 className="text-3xl font-bold text-white">AI Agent Builder</h1>
 <p className="text-muted-foreground terminal-text mt-2">
 Create custom AI agents for security operations
 </p>
 </div>

 <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg ring-1 ring-white/[0.06]">
 <ResizablePanel defaultSize={50} minSize={30}>
 <div className="h-full bg-card/50">
 <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
 <div className="border-b border-white/[0.04] px-4 pt-4">
 <TabsList className="bg-background ">
 <TabsTrigger value="create">Create</TabsTrigger>
 <TabsTrigger value="configure">Configure</TabsTrigger>
 </TabsList>
 </div>

 <TabsContent value="create" className="flex-1 mt-0">
 <ScrollArea className="h-full p-6">
 <div className="space-y-4">
 <Card className="p-4">
 <p className="text-sm text-white">
 Hi! I'll help you build a new AI Agent. You can describe what you want, like:
 </p>
 <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
 <li>"Create a penetration testing assistant"</li>
 <li>"Make an exploit development helper"</li>
 <li>"Build a vulnerability analyzer"</li>
 </ul>
 </Card>

 <div className="space-y-3">
 <Input
 placeholder="Describe your AI agent..."
 className="bg-background border-border terminal-text"
 />
 <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
 Generate Configuration
 </Button>
 </div>
 </div>
 </ScrollArea>
 </TabsContent>

 <TabsContent value="configure" className="flex-1 mt-0">
 <ScrollArea className="h-full p-6">
 <div className="space-y-6">
 {/* Avatar */}
 <div>
 <Label className="text-white">Agent Avatar</Label>
 <div className="mt-2 flex items-center gap-4">
 <div className="h-20 w-20 rounded-full border-2 border-dashed border-border flex items-center justify-center">
 <Robot size={32} weight="duotone" className="text-muted-foreground" />
 </div>
 <Button variant="outline" size="sm" className="border-border text-white hover:bg-primary/10">
 <UploadSimple size={12} weight="bold" className="mr-2" />
 Upload
 </Button>
 </div>
 </div>

 <Separator />

 {/* Name */}
 <div>
 <Label className="text-white">Name</Label>
 <Input
 value={agentName}
 onChange={(e) => setAgentName(e.target.value)}
 placeholder="Name your agent"
 className="mt-2 bg-background border-border terminal-text"
 />
 </div>

 {/* Description */}
 <div>
 <Label className="text-white">Description</Label>
 <Input
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="A short description about what this agent does"
 className="mt-2 bg-background border-border"
 />
 </div>

 {/* Instructions */}
 <div>
 <Label className="text-white">Instructions</Label>
 <Textarea
 value={instructions}
 onChange={(e) => setInstructions(e.target.value)}
 placeholder="What does this agent do? How does it behave? What should it avoid doing?"
 className="mt-2 min-h-[200px] bg-background border-border terminal-text"
 />
 <p className="text-xs text-muted-foreground mt-2">
 Conversations can potentially include part or all of the instructions provided.
 </p>
 </div>

 <Separator />

 {/* Conversation Starters */}
 <div>
 <Label className="text-white">Conversation Starters</Label>
 <div className="mt-2 space-y-2">
 {conversationStarters.map((starter, index) => (
 <div key={index} className="flex gap-2">
 <Input
 value={starter}
 onChange={(e) => updateConversationStarter(index, e.target.value)}
 placeholder="Example: Scan this network for vulnerabilities"
 className="bg-background border-border"
 />
 <Button
 variant="outline"
 size="icon"
 onClick={() => removeConversationStarter(index)}
 className="border-border text-white hover:bg-destructive/10"
 >
 <Trash size={16} weight="bold" />
 </Button>
 </div>
 ))}
 <Button
 variant="outline"
 size="sm"
 onClick={addConversationStarter}
 className="border-border text-white hover:bg-primary/10"
 >
 <Plus size={12} weight="bold" className="mr-2" />
 Add Starter
 </Button>
 </div>
 </div>

 <Separator />

 {/* Knowledge */}
 <div>
 <Label className="text-white">Knowledge</Label>
 <p className="text-xs text-muted-foreground mt-1">
 Upload files that the agent can reference during conversations.
 </p>
 <Button
 variant="outline"
 size="sm"
 className="mt-2 border-border text-white hover:bg-primary/10"
 >
 <UploadSimple size={12} weight="bold" className="mr-2" />
 Upload Files
 </Button>
 </div>

 <Separator />

 {/* Model Selection */}
 <div>
 <Label className="text-white">AI Model</Label>
 <Select value={selectedModel} onValueChange={setSelectedModel}>
 <SelectTrigger className="mt-2 bg-background border-border text-white">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="llama-3.3-70b">Llama 3.3 70B</SelectItem>
 <SelectItem value="llama-3.1-405b">Llama 3.1 405B</SelectItem>
 <SelectItem value="qwen-2.5-72b">Qwen 2.5 72B</SelectItem>
 <SelectItem value="deepseek-v3">DeepSeek V3</SelectItem>
 <SelectItem value="mistral-large">Mistral Large</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <Separator />

 {/* Category */}
 <div>
 <Label className="text-white">Category</Label>
 <Select value={category} onValueChange={setCategory}>
 <SelectTrigger className="mt-2 bg-background border-border text-white">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="security">Security</SelectItem>
 <SelectItem value="development">Development</SelectItem>
 <SelectItem value="research">Research</SelectItem>
 <SelectItem value="analysis">Analysis</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <Separator />

 {/* Capabilities */}
 <div>
 <Label className="text-white">Capabilities</Label>
 <div className="mt-3 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <MagnifyingGlass size={16} weight="bold" className="text-primary" />
 <span className="text-sm text-white">Web Search</span>
 </div>
 <Switch
 checked={capabilities.webSearch}
 onCheckedChange={(checked) =>
 setCapabilities({ ...capabilities, webSearch: checked })
 }
 />
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Code size={16} weight="bold" className="text-primary" />
 <span className="text-sm text-white">Code Execution</span>
 </div>
 <Switch
 checked={capabilities.codeExecution}
 onCheckedChange={(checked) =>
 setCapabilities({ ...capabilities, codeExecution: checked })
 }
 />
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Shield size={16} weight="bold" className="text-primary" />
 <span className="text-sm text-white">MCP Tools</span>
 </div>
 <Switch
 checked={capabilities.mcpTools}
 onCheckedChange={(checked) =>
 setCapabilities({ ...capabilities, mcpTools: checked })
 }
 />
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Database size={16} weight="bold" className="text-primary" />
 <span className="text-sm text-white">File Access</span>
 </div>
 <Switch
 checked={capabilities.fileAccess}
 onCheckedChange={(checked) =>
 setCapabilities({ ...capabilities, fileAccess: checked })
 }
 />
 </div>
 </div>
 </div>

 <Separator />

 {/* Custom Tools */}
 <div>
 <div className="flex items-center justify-between">
 <Label className="text-white">Security Tools</Label>
 <Button
 variant="outline"
 size="sm"
 onClick={addTool}
 className="border-border text-white hover:bg-primary/10"
 >
 <Plus size={12} weight="bold" className="mr-2" />
 Add Tool
 </Button>
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Custom security tools the agent can call during operations.
 </p>
 <div className="mt-3 space-y-4">
 {tools.map((tool) => (
 <Card key={tool.id} className="p-4 ring-1 ring-white/[0.06] space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Shield size={16} weight="bold" className="text-primary" />
 <Badge variant="secondary">Custom Tool</Badge>
 </div>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => removeTool(tool.id)}
 className="h-8 w-8 text-muted-foreground hover:text-destructive"
 >
 <Trash size={16} weight="bold" />
 </Button>
 </div>
 <Input
 value={tool.name}
 onChange={(e) => updateTool(tool.id,"name", e.target.value)}
 placeholder="Tool name (e.g., port_scanner)"
 className="bg-background border-border terminal-text"
 />
 <Input
 value={tool.description}
 onChange={(e) => updateTool(tool.id,"description", e.target.value)}
 placeholder="Description (e.g., Scans target for open ports)"
 className="bg-background border-border"
 />
 <Input
 value={tool.endpoint}
 onChange={(e) => updateTool(tool.id,"endpoint", e.target.value)}
 placeholder="API endpoint (e.g., /api/tools/scan)"
 className="bg-background border-border terminal-text"
 />
 </Card>
 ))}
 </div>
 </div>

 <Separator />

 <Button
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
 onClick={handleSaveAgent}
 disabled={saving}
 >
 <GearSix size={16} weight="bold" className="mr-2" />
 {saving ?"Saving..." :"Save Configuration"}
 </Button>
 </div>
 </ScrollArea>
 </TabsContent>
 </Tabs>
 </div>
 </ResizablePanel>

 <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

 <ResizablePanel defaultSize={50} minSize={30}>
 <div className="h-full bg-card/30 flex flex-col">
 <div className="border-b border-white/[0.04] p-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <h3 className="text-lg font-semibold text-white">Preview</h3>
 {agentName && <Badge variant="secondary">{agentName ||"Unnamed Agent"}</Badge>}
 </div>
 <Select defaultValue="gemini-flash">
 <SelectTrigger className="w-[220px] bg-background border-border text-white">
 <SelectValue placeholder="Select model" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="gemini-flash">Model 5 (Flash)</SelectItem>
 <SelectItem value="gemini-pro">Model 5 (Pro)</SelectItem>
 <SelectItem value="gpt-5">GPT-5</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <ScrollArea className="flex-1 p-6">
 <div className="space-y-4">
 {previewMessages.map((message, index) => (
 <div
 key={index}
 className={`flex ${message.role ==="user" ?"justify-end" :"justify-start"}`}
 >
 <div
 className={`max-w-[80%] rounded-lg p-3 ${
 message.role ==="user"
 ?"bg-primary/20 ring-1 ring-primary/15"
 :"bg-muted"
 }`}
 >
 <p className="text-sm text-white terminal-text">{message.content}</p>
 </div>
 </div>
 ))}
 </div>
 </ScrollArea>

 <div className="border-t border-white/[0.04] p-4">
 <div className="flex gap-2">
 <Input
 value={previewInput}
 onChange={(e) => setPreviewInput(e.target.value)}
 onKeyDown={(e) => e.key ==="Enter" && sendPreviewMessage()}
 placeholder="Test your agent..."
 className="terminal-text bg-background border-border"
 />
 <Button
 onClick={sendPreviewMessage}
 className="bg-primary hover:bg-primary/90 text-primary-foreground"
 >
 <PaperPlaneTilt size={16} weight="bold" />
 </Button>
 </div>
 </div>
 </div>
 </ResizablePanel>
 </ResizablePanelGroup>
 </div>
 );
};

export default AgentBuilder;
