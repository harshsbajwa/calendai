"use client";

import { type Message as VercelChatMessage } from "ai/react";
import { useChat } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { User, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "~/components/ui/tooltip";

function ChatMessageBubble({
  message,
  isUser,
}: {
  message: VercelChatMessage;
  isUser: boolean;
}) {
  const Icon = isUser ? User : Sparkles;
  const bubbleClasses = cn(
    "max-w-[80%] rounded-xl px-4 py-2.5 text-sm md:text-base shadow-md",
    isUser
      ? "bg-primary text-primary-foreground"
      : "bg-muted dark:bg-card/80 text-foreground",
  );
  const alignmentClasses = cn(
    "mb-4 flex items-end gap-2.5",
    isUser ? "justify-end" : "justify-start",
  );
  const iconContainerClasses = cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
    isUser
      ? "bg-muted text-muted-foreground dark:bg-muted/60"
      : "bg-primary text-primary-foreground dark:bg-primary/80",
  );

  return (
    <div className={alignmentClasses}>
      {!isUser && (
        <div className={iconContainerClasses}>
          <Icon className="h-4 w-4 animate-pulse" />
        </div>
      )}
      <div className={bubbleClasses}>
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i !== message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
      {isUser && (
        <div className={iconContainerClasses}>
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

interface AIChatPanelProps {
  isExpanded: boolean;
  toggleChatPanel: () => void;
}

export function AIChatPanel({ isExpanded, toggleChatPanel }: AIChatPanelProps) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: "/api/chat/calendar-rag",
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  if (isExpanded) {
    return (
      <div className="flex h-full flex-col bg-transparent">
        <div className="border-border/50 my-1.5 flex h-16 flex-shrink-0 items-center justify-between px-4 py-2">
          <h2 className="dream-text text-2xl sm:text-4xl">Chat</h2>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                disabled={isLoading}
              >
                Clear
              </Button>
            )}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group h-8 w-8"
                    onClick={toggleChatPanel}
                    aria-label="Collapse Chat"
                  >
                    <Sparkles className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Collapse Chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div
          className="custom-scrollbar flex-grow overflow-y-auto p-4"
          ref={scrollRef}
        >
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-lg font-semibold">Chat with CalendAI</p>
              <p className="text-muted-foreground text-sm">
                Ask about your upcoming events!
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessageBubble
              key={m.id}
              message={m}
              isUser={m.role === "user"}
            />
          ))}
          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="mb-4 flex items-end justify-start gap-2.5">
                <div className="bg-primary text-primary-foreground dark:bg-primary/80 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div className="bg-muted dark:bg-card/80 text-foreground max-w-[70%] rounded-lg px-3 py-2 shadow-md">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
        </div>

        {error && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive p-3 text-center text-sm dark:text-red-400">
            <p>Error: {error.message}</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-destructive h-auto p-0 dark:text-red-400"
            >
              Reload
            </Button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="border-border/50 flex items-center gap-2 p-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask CalendAI..."
            className="bg-background dark:bg-input/50 flex-grow rounded-full focus-visible:ring-offset-0"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 rounded-full"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CornerDownLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Send</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </div>
    );
  } else {
    return (
      <div className="flex h-full w-full cursor-pointer items-start justify-end p-3 pt-3.5">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="group h-8 w-8"
                onClick={toggleChatPanel}
                aria-label="Expand Chat"
              >
                <Sparkles className="h-5 w-5 animate-pulse transition-transform group-hover:scale-110" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Expand Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
}
