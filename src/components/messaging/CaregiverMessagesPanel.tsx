import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  subject: string | null;
  parent_email: string;
  status: string;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface CaregiverMessagesPanelProps {
  caregiverId?: string;
}

export const CaregiverMessagesPanel = ({ caregiverId }: CaregiverMessagesPanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (caregiverId) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [caregiverId]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const channel = supabase
      .channel(`caregiver-messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            return exists ? prev : [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  const fetchConversations = async () => {
    if (!caregiverId) return;
    
    try {
      // Only fetch conversations where this caregiver is a participant
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("caregiver_id", caregiverId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);

      // Auto-select first conversation
      if (data && data.length > 0) {
        setSelectedConversation(data[0]);
        fetchMessages(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        content,
        sender_type: "caregiver",
      });

      if (error) throw error;

      setShouldAutoScroll(true);
      fetchMessages(selectedConversation.id);

      // Send email notification to admin/parent
      supabase.functions.invoke("send-message-notification", {
        body: {
          conversationId: selectedConversation.id,
          messageContent: content,
          senderType: "caregiver",
        },
      }).then(({ error: notifError }) => {
        if (notifError) {
          console.error("Failed to send notification:", notifError);
        }
      });

      toast({
        title: "Message sent",
        description: "Birth Rebel will respond soon.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="h-5 w-5" style={{ color: "#E2725B" }} />
          <h2 className="text-lg font-semibold" style={{ color: "#36454F" }}>
            Messages
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5" style={{ color: "#E2725B" }} />
          <h2 className="text-lg font-semibold" style={{ color: "#36454F" }}>
            Messages
          </h2>
          <span className="text-sm text-muted-foreground">
            ({conversations.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-[500px]" : "max-h-0"
        )}
      >
        <div className="border-t border-border">
          {/* Conversation Tabs */}
          {conversations.length > 1 && (
            <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    fetchMessages(conv.id);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                    selectedConversation?.id === conv.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {conv.subject || conv.parent_email}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="h-64 flex flex-col">
            <MessageThread
              messages={messages}
              currentUserType="caregiver"
              isLoading={messagesLoading}
              shouldAutoScroll={shouldAutoScroll}
            />
          </div>

          {/* Input */}
          <MessageInput
            onSend={handleSendMessage}
            placeholder="Reply to Birth Rebel..."
          />
        </div>
      </div>
    </div>
  );
};
