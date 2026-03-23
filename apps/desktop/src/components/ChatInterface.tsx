import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use chat with memory persistence",
          variant: "destructive",
        });
        return;
      }

      // Create a new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'New Conversation' })
        .select()
        .single();

      if (error) {
        console.error('Failed to create conversation:', error);
        return;
      }

      setConversationId(data.id);
    };

    initConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the chat",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Save user message to database
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.content
      });
    }

    let assistantContent = "";

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: "google/gemini-2.5-flash",
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message that will be updated
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch (e) {
            console.error("Failed to parse SSE:", e);
          }
        }
      }

      // Save assistant message to database
      if (conversationId && assistantContent) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantContent
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to AI",
        variant: "destructive",
      });
      
      // Remove the empty assistant message if streaming failed
      setMessages((prev) => prev.filter((m, i) => i !== prev.length - 1 || m.content !== ""));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] border-border bg-card/50 backdrop-blur">
      <div className="border-b border-border p-4 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">CrowByte Terminal</h3>
        </div>
        <p className="text-xs text-muted-foreground terminal-text mt-1">Elite Cybersecurity Assistant • Encrypted Channel</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-stream`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-primary/20 border border-primary/40 shadow-lg shadow-primary/10"
                    : "bg-muted/50 border border-border backdrop-blur-sm"
                }`}
              >
                <p className="text-sm terminal-text whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex justify-start animate-stream">
              <div className="bg-muted/50 border border-border rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground terminal-text">Processing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4 bg-background/50 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Enter command, query, or security task... (Shift+Enter for new line)"
            className="terminal-text bg-background border-border focus:border-primary min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-[60px] px-6"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
