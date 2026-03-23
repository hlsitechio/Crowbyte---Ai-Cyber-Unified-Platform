/**
 * AI Agent Page
 * LangChain-powered intelligent search agent for cybersecurity research
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { searchAgent, type SearchAgentResponse } from "@/services/searchAgent";
import {
  Bot,
  Send,
  Shield,
  Wrench,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Brain,
  Search,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  steps?: Array<{
    action: string;
    observation: string;
  }>;
  timestamp: Date;
}

export default function AIAgent() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-initialize on mount
  useEffect(() => {
    initializeAgent();
  }, []);

  /**
   * Initialize the AI Agent
   */
  const initializeAgent = async () => {
    setIsInitializing(true);
    try {
      // Get API key from environment
      const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY;

      if (!tavilyApiKey) {
        toast({
          title: "Configuration Error",
          description: "Tavily API key not found. Please add VITE_TAVILY_API_KEY to your .env file.",
          variant: "destructive",
        });
        return;
      }

      await searchAgent.initialize({
        tavilyApiKey,
        maxResults: 5,
      });

      setIsInitialized(true);
      console.log('✅ Search AI Agent initialized successfully');

      // Add welcome message
      setMessages([{
        id: crypto.randomUUID(),
        role: 'agent',
        content: `👋 **Search AI Agent Online**\n\nI'm your intelligent cybersecurity research assistant powered by Tavily AI Search. I can help you with:

🔍 **Web Research** - Deep dive into any security topic with real-time web search
🛡️ **CVE Analysis** - Detailed vulnerability assessments with exploitation status
🔧 **Tool Discovery** - Find and compare security tools with recommendations
⚠️ **Threat Intelligence** - Research threat actors, TTPs, and defensive measures

Just ask me anything, or use the quick action buttons below!`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      toast({
        title: "Initialization Failed",
        description: error instanceof Error ? error.message : "Failed to start AI Agent",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Send a message to the agent
   */
  const sendMessage = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the agent
      const response: SearchAgentResponse = await searchAgent.search({
        query: messageText,
      });

      // Add agent response
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: response.answer,
        sources: response.sources,
        steps: response.steps,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);

      toast({
        title: "Search Complete",
        description: `Found ${response.sources.length} sources in ${(response.totalTime / 1000).toFixed(1)}s`,
      });
    } catch (error) {
      console.error('Agent error:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to process query",
        variant: "destructive",
      });

      // Add error message
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'agent',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Quick action buttons
   */
  const quickActions = [
    {
      label: "Analyze CVE",
      icon: Shield,
      prompt: "Analyze the latest critical CVEs from this week",
      color: "text-red-500",
    },
    {
      label: "Find Tools",
      icon: Wrench,
      prompt: "What are the best penetration testing tools for web applications?",
      color: "text-blue-500",
    },
    {
      label: "Threat Intel",
      icon: AlertTriangle,
      prompt: "Research recent ransomware threat actors and their tactics",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Search AI Agent
              </h1>
              <p className="text-sm text-muted-foreground">
                Powered by LangChain + Tavily
              </p>
            </div>
          </div>
          {!isInitialized && (
            <Button
              onClick={initializeAgent}
              disabled={isInitializing}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Initialize Agent
                </>
              )}
            </Button>
          )}
          {isInitialized && (
            <Badge variant="outline" className="border-green-500/50 text-green-400">
              <Bot className="h-3 w-3 mr-1" />
              Agent Online
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isInitialized ? (
          /* Initialization Screen */
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="max-w-2xl w-full border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-purple-400" />
                  Welcome to Search AI Agent
                </CardTitle>
                <CardDescription>
                  An intelligent research assistant that combines LangChain's reasoning with Tavily's web search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Search className="h-4 w-4 text-blue-400" />
                      Smart Search
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Uses LangChain to break down complex queries and search intelligently
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      CVE Analysis
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive vulnerability research with exploitability assessment
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-purple-400" />
                      Tool Discovery
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Find and compare security tools with recommendations
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      Threat Intel
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Research threat actors, TTPs, and defensive measures
                    </p>
                  </div>
                </div>

                <Button
                  onClick={initializeAgent}
                  disabled={isInitializing}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Initializing Agent...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Initialize Search AI Agent
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Chat Interface */
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="max-w-4xl mx-auto space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <Card className={`max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-secondary/50 border-border/50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {message.role === 'agent' && (
                              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                                <Bot className="h-5 w-5 text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                {message.content.split('\n').map((line, i) => (
                                  <p key={i}>{line}</p>
                                ))}
                              </div>

                              {/* Sources */}
                              {message.sources && message.sources.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Sources ({message.sources.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {message.sources.map((source, idx) => (
                                      <a
                                        key={idx}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors text-sm border border-border/30"
                                      >
                                        <div className="font-medium text-primary">{source.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {source.content}
                                        </div>
                                        <div className="text-xs text-blue-400 mt-1">{source.url}</div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Reasoning Steps */}
                              {message.steps && message.steps.length > 0 && (
                                <Tabs defaultValue="sources" className="mt-4">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="sources">Sources</TabsTrigger>
                                    <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="reasoning" className="space-y-2">
                                    {message.steps.map((step, idx) => (
                                      <div key={idx} className="p-2 rounded-lg bg-background/30 text-xs">
                                        <div className="font-medium text-purple-400">{step.action}</div>
                                        <div className="text-muted-foreground mt-1">{step.observation}</div>
                                      </div>
                                    ))}
                                  </TabsContent>
                                </Tabs>
                              )}

                              <div className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <Card className="bg-secondary/50 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                          <span className="text-sm text-muted-foreground">Agent is thinking...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="border-t border-border/40 p-4 bg-background/95 backdrop-blur">
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(action.prompt)}
                      disabled={isLoading}
                      className="whitespace-nowrap"
                    >
                      <action.icon className={`h-4 w-4 mr-2 ${action.color}`} />
                      {action.label}
                    </Button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask me anything about cybersecurity..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
