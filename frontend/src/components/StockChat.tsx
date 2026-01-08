import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const StockChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your stock market assistant. Ask me anything about stocks, trading, market analysis, or your portfolio!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Send last 10 messages (5 user + 5 assistant pairs) for context
      // Exclude the welcome message and the current message we just added
      const conversationHistory = messages
        .filter(msg => msg.id !== "1") // Exclude welcome message
        .slice(-10) // Get last 10 messages
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const response = await api.post("/api/chat", {
        message: currentInput,
        conversationHistory: conversationHistory,
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error?.message || "Failed to send message");
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md"
                    : "bg-muted/80 backdrop-blur-sm border border-border/50 rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                <p className={`text-xs mt-2 ${
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-in fade-in">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3 border border-border/50">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t bg-background/95 backdrop-blur-sm p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about stocks, trading, or market analysis..."
            disabled={isLoading}
            className="flex-1 border-2 focus:border-primary/50 transition-colors"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-md hover:shadow-lg hover:scale-105"
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
  );
};

export default StockChat;

