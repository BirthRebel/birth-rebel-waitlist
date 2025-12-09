import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserType: "admin" | "caregiver" | "parent";
  isLoading?: boolean;
}

// Helper to convert URLs in text to clickable links
const renderContentWithLinks = (content: string, isCurrentUser: boolean) => {
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex after test
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline break-all",
            isCurrentUser ? "text-primary-foreground hover:text-primary-foreground/80" : "text-primary hover:text-primary/80"
          )}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const MessageThread = ({
  messages,
  currentUserType,
  isLoading,
}: MessageThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender_type === currentUserType;
        
        return (
          <div
            key={message.id}
            className={cn(
              "flex",
              isCurrentUser ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2",
                isCurrentUser
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">
                {renderContentWithLinks(message.content, isCurrentUser)}
              </p>
              <p
                className={cn(
                  "text-xs mt-1",
                  isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {format(new Date(message.created_at), "MMM d, h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
