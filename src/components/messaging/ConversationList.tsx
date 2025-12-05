import { MessageSquare, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  subject: string | null;
  parent_email: string;
  caregiver_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  caregiver_name?: string;
  unread_count?: number;
  last_message?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "w-full p-4 text-left hover:bg-accent/50 transition-colors",
            selectedId === conv.id && "bg-accent"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {conv.caregiver_id ? (
                <User className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate text-foreground">
                  {conv.subject || conv.parent_email}
                </p>
                {conv.unread_count && conv.unread_count > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.caregiver_name || "Parent message"}
              </p>
              {conv.last_message && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {conv.last_message}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
