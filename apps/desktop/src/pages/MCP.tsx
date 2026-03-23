import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Network, Link, Server, Activity, RefreshCw, Search, Zap, FileText, AlertCircle, Shield, Bookmark, Play, Square, Copy, Check, Settings } from "lucide-react";
import { toast } from "sonner";
import tavilyService, { TavilySearchResult } from "@/services/tavily";
import { bookmarksService, type BookmarkCategory } from "@/services/bookmarks";

const connectors: Array<{
  name: string;
  type: string;
  status: string;
  endpoint: string;
  lastSync: string;
  dataFlow: string;
  description: string;
  capabilities: string[];
}> = [
  {
    name: "Tavily CyberSec Search",
    type: "AI Search",
    status: "Connected",
    endpoint: "https://mcp.tavily.com/mcp/",
    lastSync: "Real-time",
    dataFlow: "Bidirectional",
    description: "AI-powered cybersecurity search and threat intelligence",
    capabilities: ["Web Search", "Q&A", "Content Extraction", "Threat Intel", "CVE Lookup"]
  }
];

// MCP Server Interface
interface MCPServerMetadata {
  package?: string;
  version?: string;
  registry?: string;
  official?: boolean;
  source?: string;
  language?: string;
  fileSize?: string;
  platform?: string;
  apiKey?: string;
  storageType?: string;
  allowedPaths?: string[];
}

interface MCPServer {
  id: string;
  name: string;
  runtime: string;
  type: 'binary' | 'npx';
  description: string;
  command: string;
  args: string[];
  metadata?: MCPServerMetadata;
  config: {
    mcpServers: {
      [key: string]: {
        command: string;
        args: string[];
        env?: Record<string, string>;
        cwd?: string;
      };
    };
  };
  tools: string[];
  usedBy: string[];
}

// MCP Servers Configuration
const mcpServers: MCPServer[] = [
  {
    id: 'monitor',
    name: 'PC Monitor',
    runtime: 'Binary',
    type: 'binary',
    description: 'System monitoring (CPU, memory, disk, network, processes)',
    command: '/usr/local/bin/mcp-monitor',
    args: [],
    metadata: {
      source: 'https://github.com/seekrays/mcp-monitor',
      version: 'v0.0.2',
      language: 'Go (87.1%)',
      fileSize: '7.2 MB',
      platform: 'Linux x64'
    },
    config: {
      mcpServers: {
        monitor: {
          command: '/usr/local/bin/mcp-monitor',
          args: [],
          env: {
            // No environment variables required
          },
          cwd: '/mnt/bounty/Claude/crowbyte'
        }
      }
    },
    tools: ['get_cpu_info', 'get_memory_info', 'get_disk_info', 'get_network_info', 'get_process_info', 'get_host_info'],
    usedBy: ['CyberSec Agent', 'CrowByte Monitor']
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    runtime: 'NPX',
    type: 'npx',
    description: 'Web search with AI-generated answers',
    command: 'npx',
    args: ['-y', 'tavily-mcp@0.1.3'],
    metadata: {
      package: 'tavily-mcp',
      version: '0.1.3',
      registry: 'npm',
      apiKey: 'Required (TAVILY_API_KEY)'
    },
    config: {
      mcpServers: {
        tavily: {
          command: 'npx',
          args: ['-y', 'tavily-mcp@0.1.3'],
          env: {
            TAVILY_API_KEY: import.meta.env.VITE_TAVILY_API_KEY || 'your-tavily-key'
          }
        }
      }
    },
    tools: ['search'],
    usedBy: ['CyberSec Agent', 'CrowByte Agent', 'Search Agent', 'All custom agents with web search']
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    runtime: 'NPX',
    type: 'npx',
    description: 'Secure file operations (/mnt/bounty, /home/rainkode)',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/mnt/bounty/', '/home/rainkode/'],
    metadata: {
      package: '@modelcontextprotocol/server-filesystem',
      version: 'latest',
      registry: 'npm',
      official: true,
      allowedPaths: ['/mnt/bounty/', '/home/rainkode/']
    },
    config: {
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/mnt/bounty/', '/home/rainkode/'],
          env: {
            // No environment variables required
          }
        }
      }
    },
    tools: ['read_file', 'write_file', 'list_directory', 'create_directory', 'move_file', 'delete_file', 'search_files'],
    usedBy: ['Custom Agents', 'Agent Builder (file access enabled)']
  },
  {
    id: 'memory',
    name: 'Memory',
    runtime: 'NPX',
    type: 'npx',
    description: 'Knowledge graph and conversation memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    metadata: {
      package: '@modelcontextprotocol/server-memory',
      version: 'latest',
      registry: 'npm',
      official: true,
      storageType: 'SQLite-based knowledge graph'
    },
    config: {
      mcpServers: {
        memory: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
          env: {
            // No environment variables required
          },
          cwd: '/mnt/bounty/Claude/crowbyte'
        }
      }
    },
    tools: ['create_entities', 'create_relations', 'search_nodes', 'open_nodes', 'delete_entities', 'add_observations'],
    usedBy: ['Custom Agents', 'Agent Builder (MCP enabled)', 'ByteRover Knowledge System']
  }
];

const MCP = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TavilySearchResult[]>([]);
  const [searchAnswer, setSearchAnswer] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [qnaAnswer, setQnaAnswer] = useState("");
  const [qnaQuery, setQnaQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Bookmark state
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [newBookmark, setNewBookmark] = useState({
    title: "",
    url: "",
    description: "",
    category: "General",
    tags: "",
  });

  // MCP Server state
  const [serverStatuses, setServerStatuses] = useState<Record<string, 'running' | 'stopped'>>({
    monitor: 'running',
    tavily: 'running',
    filesystem: 'running',
    memory: 'running',
  });
  const [copiedConfig, setCopiedConfig] = useState<string | null>(null);

  // MCP Server handlers
  const handleStartServer = (serverId: string) => {
    setServerStatuses(prev => ({ ...prev, [serverId]: 'running' }));
    toast.success(`${mcpServers.find(s => s.id === serverId)?.name} server started`);
  };

  const handleStopServer = (serverId: string) => {
    setServerStatuses(prev => ({ ...prev, [serverId]: 'stopped' }));
    toast.warning(`${mcpServers.find(s => s.id === serverId)?.name} server stopped`);
  };

  const handleCopyConfig = (serverId: string) => {
    const server = mcpServers.find(s => s.id === serverId);
    if (server) {
      const configText = JSON.stringify(server.config, null, 2);
      navigator.clipboard.writeText(configText);
      setCopiedConfig(serverId);
      toast.success('Configuration copied to clipboard');
      setTimeout(() => setCopiedConfig(null), 2000);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      const response = await tavilyService.search({
        query: searchQuery,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: true,
      });

      setSearchResults(response.data.results);
      setSearchAnswer(response.data.answer || "");
      toast.success("Search completed successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Search failed");
      console.error("Tavily search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!qnaQuery.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setIsAsking(true);
    try {
      const response = await tavilyService.askQuestion({
        query: qnaQuery,
        search_depth: 'advanced',
      });

      setQnaAnswer(response.data.answer);
      toast.success("Answer retrieved successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Q&A failed");
      console.error("Tavily Q&A error:", error);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSearchCVE = async (cveId: string) => {
    setIsSearching(true);
    setSearchQuery(cveId);
    try {
      const response = await tavilyService.searchCVE(cveId);
      setSearchResults(response.data.results);
      setSearchAnswer(response.data.answer || "");
      toast.success(`CVE ${cveId} information retrieved`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "CVE search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Load categories when opening bookmark dialog
  const loadCategories = async () => {
    try {
      await bookmarksService.initializeDefaultCategories();
      const cats = await bookmarksService.getCategories();
      setCategories(cats);
    } catch (error: unknown) {
      console.error("Failed to load categories:", error);
    }
  };

  // Handle opening bookmark dialog with pre-filled data
  const handleBookmarkResult = (result: TavilySearchResult) => {
    setNewBookmark({
      title: result.title,
      url: result.url,
      description: result.content.substring(0, 200), // First 200 chars
      category: "General",
      tags: searchQuery, // Use search query as tag
    });
    loadCategories();
    setBookmarkDialogOpen(true);
  };

  // Handle saving bookmark
  const handleSaveBookmark = async () => {
    try {
      if (!newBookmark.title || !newBookmark.url) {
        toast.error("Title and URL are required");
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

      toast.success("Bookmark added successfully");
      setBookmarkDialogOpen(false);
      setNewBookmark({ title: "", url: "", description: "", category: "General", tags: "" });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to add bookmark");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">MCP Connectors</h1>
        <p className="text-muted-foreground terminal-text mt-2">
          Model Context Protocol integration endpoints
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">MCP Servers</CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{mcpServers.length}</div>
            <p className="text-xs text-muted-foreground">Total installed</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Running Servers</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Object.values(serverStatuses).filter(status => status === 'running').length}/{mcpServers.length}
            </div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Tools Available</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {mcpServers.reduce((acc, s) => acc + s.tools.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">MCP server tools</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">NPX Servers</CardTitle>
            <Network className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {mcpServers.filter(s => s.type === 'npx').length}/{mcpServers.length}
            </div>
            <p className="text-xs text-muted-foreground">Node.js based</p>
          </CardContent>
        </Card>
      </div>

      {/* MCP Connectors List */}
      <div className="grid gap-4">
        {connectors.map((connector) => (
          <Card key={connector.name} className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 mt-1">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{connector.name}</CardTitle>
                    <CardDescription className="terminal-text mt-1">{connector.description}</CardDescription>
                    <CardDescription className="terminal-text mt-1 text-xs">{connector.endpoint}</CardDescription>
                  </div>
                </div>
                <Badge
                  variant={connector.status === "Connected" ? "default" : "secondary"}
                  className={connector.status === "Connected" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                >
                  {connector.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium text-white">{connector.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
                  <p className="text-sm font-medium text-white terminal-text">{connector.lastSync}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data Flow</p>
                  <p className="text-sm font-medium text-white">{connector.dataFlow}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Capabilities</p>
                  <p className="text-sm font-medium text-white">{connector.capabilities.length}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Available Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {connector.capabilities.map((capability) => (
                    <Badge key={capability} variant="outline" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MCP Server Management */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-white">MCP Server Management</CardTitle>
          </div>
          <CardDescription>
            Control and configure individual MCP servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {mcpServers.map((server) => (
              <Card key={server.id} className="border-border bg-card/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`rounded-md p-2 mt-1 ${server.type === 'binary' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                        <Server className={`h-5 w-5 ${server.type === 'binary' ? 'text-orange-400' : 'text-blue-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-white">{server.name}</CardTitle>
                          <Badge variant="outline" className={server.type === 'binary' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}>
                            {server.runtime}
                          </Badge>
                          <Badge variant={serverStatuses[server.id] === 'running' ? 'default' : 'secondary'} className={serverStatuses[server.id] === 'running' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
                            {serverStatuses[server.id] === 'running' ? '● Running' : '○ Stopped'}
                          </Badge>
                        </div>
                        <CardDescription className="terminal-text mt-1">{server.description}</CardDescription>
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">Tools:</span>
                            <Badge variant="secondary" className="text-xs">{server.tools.length}</Badge>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground font-medium mt-0.5">Used by:</span>
                            <div className="flex flex-wrap gap-1">
                              {server.usedBy.map((agent) => (
                                <Badge key={agent} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                  {agent}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {serverStatuses[server.id] === 'running' ? (
                        <Button variant="destructive" size="sm" onClick={() => handleStopServer(server.id)}>
                          <Square className="h-3 w-3 mr-1" />
                          Stop
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={() => handleStartServer(server.id)}>
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleCopyConfig(server.id)}>
                        {copiedConfig === server.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Config
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-white mb-2">Available Tools</p>
                      <div className="flex flex-wrap gap-1">
                        {server.tools.map((tool) => (
                          <Badge key={tool} variant="outline" className="text-xs font-mono">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Metadata Display */}
                    {server.metadata && (
                      <div>
                        <p className="text-xs font-medium text-white mb-2">Server Metadata</p>
                        <div className="bg-card border border-border rounded-md p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {server.metadata.package && (
                              <div>
                                <span className="text-muted-foreground">Package:</span>
                                <p className="text-white font-mono mt-0.5">{server.metadata.package}</p>
                              </div>
                            )}
                            {server.metadata.version && (
                              <div>
                                <span className="text-muted-foreground">Version:</span>
                                <p className="text-white font-mono mt-0.5">{server.metadata.version}</p>
                              </div>
                            )}
                            {server.metadata.source && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Source:</span>
                                <a href={server.metadata.source} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-mono text-xs block mt-0.5 break-all">
                                  {server.metadata.source}
                                </a>
                              </div>
                            )}
                            {server.metadata.language && (
                              <div>
                                <span className="text-muted-foreground">Language:</span>
                                <p className="text-white mt-0.5">{server.metadata.language}</p>
                              </div>
                            )}
                            {server.metadata.fileSize && (
                              <div>
                                <span className="text-muted-foreground">File Size:</span>
                                <p className="text-white mt-0.5">{server.metadata.fileSize}</p>
                              </div>
                            )}
                            {server.metadata.platform && (
                              <div>
                                <span className="text-muted-foreground">Platform:</span>
                                <p className="text-white mt-0.5">{server.metadata.platform}</p>
                              </div>
                            )}
                            {server.metadata.registry && (
                              <div>
                                <span className="text-muted-foreground">Registry:</span>
                                <p className="text-white mt-0.5">{server.metadata.registry}</p>
                              </div>
                            )}
                            {server.metadata.apiKey && (
                              <div>
                                <span className="text-muted-foreground">API Key:</span>
                                <Badge variant="outline" className="text-xs mt-0.5">{server.metadata.apiKey}</Badge>
                              </div>
                            )}
                            {server.metadata.official !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Official:</span>
                                <Badge variant={server.metadata.official ? "default" : "secondary"} className="text-xs mt-0.5">
                                  {server.metadata.official ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            )}
                            {server.metadata.storageType && (
                              <div>
                                <span className="text-muted-foreground">Storage:</span>
                                <p className="text-white mt-0.5">{server.metadata.storageType}</p>
                              </div>
                            )}
                            {server.metadata.allowedPaths && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Allowed Paths:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {server.metadata.allowedPaths.map((path: string) => (
                                    <Badge key={path} variant="outline" className="text-xs font-mono">
                                      {path}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-white">Server Configuration</p>
                        <Badge variant="secondary" className="text-xs">JSON</Badge>
                      </div>
                      <pre className="bg-black/50 border border-border rounded-md p-3 text-xs overflow-x-auto">
                        <code className="text-green-400 font-mono">{JSON.stringify(server.config, null, 2)}</code>
                      </pre>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-card border border-border rounded-md p-2">
                        <p className="text-muted-foreground">Command</p>
                        <p className="text-white font-mono mt-1">{server.command}</p>
                      </div>
                      <div className="bg-card border border-border rounded-md p-2">
                        <p className="text-muted-foreground">Arguments</p>
                        <p className="text-white font-mono mt-1 text-xs break-all">{server.args.join(' ')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tavily CyberSec Search Interface */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-white">CyberSecurity AI Search Agent</CardTitle>
          </div>
          <CardDescription>
            AI-powered cybersecurity research using Tavily MCP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Web Search
              </TabsTrigger>
              <TabsTrigger value="qna">
                <FileText className="h-4 w-4 mr-2" />
                Q&A
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search-query" className="text-white">Search Query</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="search-query"
                      placeholder="e.g., latest ransomware attacks, zero-day vulnerabilities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1"
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Search
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearchCVE("CVE-2024")}
                    disabled={isSearching}
                  >
                    Latest CVEs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("latest cybersecurity threats 2024");
                      handleSearch();
                    }}
                    disabled={isSearching}
                  >
                    Recent Threats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("penetration testing tools");
                      handleSearch();
                    }}
                    disabled={isSearching}
                  >
                    Pentest Tools
                  </Button>
                </div>

                {searchAnswer && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        AI Answer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-white text-sm leading-relaxed">{searchAnswer}</p>
                    </CardContent>
                  </Card>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white">Search Results ({searchResults.length})</h3>
                    {searchResults.map((result, index) => (
                      <Card key={index} className="border-border hover:border-primary/30 transition-colors">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-white line-clamp-2">{result.title}</CardTitle>
                          <CardDescription className="text-xs terminal-text">{result.url}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">{result.content}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              Score: {(result.score * 100).toFixed(0)}%
                            </Badge>
                            {result.published_date && (
                              <Badge variant="outline" className="text-xs">
                                {new Date(result.published_date).toLocaleDateString()}
                              </Badge>
                            )}
                            <div className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBookmarkResult(result)}
                                title="Add to bookmarks"
                              >
                                <Bookmark className="h-3 w-3 mr-1" />
                                Bookmark
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(result.url, '_blank')}
                              >
                                <Link className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Q&A Tab */}
            <TabsContent value="qna" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="qna-query" className="text-white">Ask a Question</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="qna-query"
                      placeholder="e.g., What is a zero-day exploit?"
                      value={qnaQuery}
                      onChange={(e) => setQnaQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      className="flex-1"
                    />
                    <Button onClick={handleAskQuestion} disabled={isAsking}>
                      {isAsking ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Ask
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQnaQuery("What is the MITRE ATT&CK framework?");
                      handleAskQuestion();
                    }}
                    disabled={isAsking}
                  >
                    MITRE ATT&CK
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQnaQuery("How does SQL injection work?");
                      handleAskQuestion();
                    }}
                    disabled={isAsking}
                  >
                    SQL Injection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQnaQuery("What are common ransomware attack vectors?");
                      handleAskQuestion();
                    }}
                    disabled={isAsking}
                  >
                    Ransomware
                  </Button>
                </div>

                {qnaAnswer && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Answer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{qnaAnswer}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bookmark Dialog */}
      <Dialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bookmark</DialogTitle>
            <DialogDescription>
              Save this search result to your bookmarks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bookmark-title">Title *</Label>
              <Input
                id="bookmark-title"
                value={newBookmark.title}
                onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                placeholder="Bookmark title"
              />
            </div>
            <div>
              <Label htmlFor="bookmark-url">URL *</Label>
              <Input
                id="bookmark-url"
                value={newBookmark.url}
                onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="bookmark-description">Description</Label>
              <Textarea
                id="bookmark-description"
                value={newBookmark.description}
                onChange={(e) => setNewBookmark({ ...newBookmark, description: e.target.value })}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="bookmark-category">Category *</Label>
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
              <Label htmlFor="bookmark-tags">Tags (comma-separated)</Label>
              <Input
                id="bookmark-tags"
                value={newBookmark.tags}
                onChange={(e) => setNewBookmark({ ...newBookmark, tags: e.target.value })}
                placeholder="security, tools, research"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookmarkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBookmark}>Save Bookmark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCP;
