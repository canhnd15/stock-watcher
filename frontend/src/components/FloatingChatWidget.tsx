import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, X, Minimize2 } from "lucide-react";
import StockChat from "./StockChat";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const FloatingChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close (optional - you can remove this if you want)
  useEffect(() => {
    if (!user) return; // Early return inside effect is fine
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
        isOpen &&
        !isMinimized
      ) {
        // Don't close on outside click - let user explicitly close
      }
    };

    if (isOpen && !isMinimized) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isMinimized, user]);

  const handleToggle = () => {
    if (isOpen && isMinimized) {
      setIsMinimized(false);
    } else if (isOpen && !isMinimized) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // Only show widget for authenticated users
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Window - Messenger Style */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={cn(
            "fixed bottom-6 right-6 z-[100] flex flex-col",
            "bg-background border border-border rounded-lg shadow-2xl",
            "transition-all duration-300 ease-in-out",
            isMinimized
              ? "w-80 h-16"
              : "w-full sm:w-[420px] md:w-[500px] h-[600px] max-h-[80vh]",
            isOpen && !isMinimized
              ? "animate-in fade-in slide-in-from-bottom-4"
              : ""
          )}
          style={{
            maxWidth: isMinimized ? "320px" : "calc(100vw - 3rem)",
          }}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 flex-shrink-0 flex items-center justify-between gap-3 rounded-t-lg">
            <div
              className={cn(
                "flex items-center gap-3 flex-1 min-w-0",
                isMinimized && "cursor-pointer hover:opacity-80 transition-opacity"
              )}
              onClick={isMinimized ? () => setIsMinimized(false) : undefined}
            >
              <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg border-2 border-primary/20 flex-shrink-0">
                <Bot className="h-5 w-5 text-primary-foreground" />
                <Sparkles className="absolute -top-0.5 -right-0.5 h-3 w-3 text-yellow-400" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
              </div>
              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base truncate">AI Stock Assistant</span>
                    <Badge
                      variant="default"
                      className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-purple-500 to-pink-500 border-0 flex-shrink-0"
                    >
                      AI
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-normal truncate">
                      Ask me anything about stocks
                    </span>
                  </div>
                </div>
              )}
              {isMinimized && (
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm truncate">AI Stock Assistant</span>
                  <span className="text-xs text-muted-foreground block">Click to expand</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={handleMinimize}
                  aria-label="Minimize chat"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={handleClose}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
              <StockChat />
            </div>
          )}
        </div>
      )}

      {/* Floating Button - Only show when chat is closed or minimized */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2",
          isOpen && !isMinimized && "hidden"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={cn(
                "group relative h-16 w-16 rounded-full shadow-2xl",
                "bg-gradient-to-br from-primary via-primary/90 to-primary/80",
                "hover:from-primary hover:via-primary/95 hover:to-primary/90",
                "transition-all duration-300 hover:scale-110 hover:shadow-primary/50",
                "flex items-center justify-center",
                "animate-in fade-in slide-in-from-bottom-4",
                "border-2 border-primary/20 hover:border-primary/40"
              )}
              size="icon"
              aria-label="Open AI Stock Market Assistant"
            >
              {/* AI Icon with Sparkle Effect */}
              <div className="relative">
                <Bot className="h-7 w-7 text-primary-foreground transition-transform group-hover:scale-110" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
              </div>

              {/* Online Indicator */}
              {!isOpen && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background animate-pulse shadow-lg" />
              )}

              {/* AI Badge */}
              <Badge
                variant="default"
                className="absolute -top-2 -left-2 text-[10px] px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 border-0 shadow-md"
              >
                AI
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-primary text-primary-foreground">
            <p className="font-semibold">AI Stock Assistant</p>
            <p className="text-xs opacity-90">Ask me anything about stocks</p>
          </TooltipContent>
        </Tooltip>

        {/* Text Label that appears on hover */}
        <div
          className={cn(
            "flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border",
            "transition-all duration-300",
            isHovered
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4 pointer-events-none"
          )}
        >
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold whitespace-nowrap">
            AI Assistant
          </span>
        </div>
      </div>
    </>
  );
};

export default FloatingChatWidget;

