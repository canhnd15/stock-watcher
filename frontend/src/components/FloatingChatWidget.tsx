import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles } from "lucide-react";
import StockChat from "./StockChat";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const FloatingChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Only show widget for authenticated users
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating Button with Text */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
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
            isHovered || isOpen
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4 pointer-events-none"
          )}
        >
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold whitespace-nowrap">
            AI Assistant
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Powered by Gemini
          </Badge>
        </div>
      </div>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[600px] md:w-[700px] p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-lg w-full">
                <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg border-2 border-primary/20">
                  <Bot className="h-6 w-6 text-primary-foreground" />
                  <Sparkles className="absolute -top-0.5 -right-0.5 h-4 w-4 text-yellow-400" />
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">AI Stock Assistant</span>
                    <Badge variant="default" className="text-[10px] px-2 py-0 bg-gradient-to-r from-purple-500 to-pink-500 border-0">
                      AI
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-normal">
                      Ask me anything about stocks, trading, or market analysis
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Gemini
                    </Badge>
                  </div>
                </div>
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            <StockChat />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FloatingChatWidget;

