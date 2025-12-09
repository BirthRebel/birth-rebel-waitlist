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
  status: string;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface ParentMessagesPanelProps {
  parentEmail: string;
}

export const ParentMessagesPanel = ({ parentEmail }: ParentMessagesPanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (parentEmail) {
      fetchConversations();
    }
  }, [parentEmail]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!selectedConversation?.id || !parentEmail) return;

    const interval = setInterval(() => {
      fetchMessagesQuiet(selectedConversation.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedConversation?.id, parentEmail]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (selectedConversation?.id) {
        fetchMessagesQuiet(selectedConversation.id);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [selectedConversation?.id]);

  // Quiet fetch that doesn't show loading state
  const fetchMessagesQuiet = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("get-parent-messages", {
        body: { conversation_id: conversationId, parent_email: parentEmail },
      });

      if (error) throw error;
      const newMessages = data?.messages || [];
      
      // Only update if there are new messages
      setMessages((prev) => {
        if (newMessages.length !== prev.length) {
          return newMessages;
        }
        // Check if last message is different
        const lastNew = newMessages[newMessages.length - 1];
        const lastPrev = prev[prev.length - 1];
        if (lastNew?.id !== lastPrev?.id) {
          return newMessages;
        }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      // Use edge function to fetch conversations for parent
      const { data, error } = await supabase.functions.invoke("get-parent-conversations", {
        body: { parent_email: parentEmail },
      });

      if (error) throw error;
      
      const convs = data?.conversations || [];
      setConversations(convs);

      // Auto-select first conversation and expand
      if (convs.length > 0) {
        setSelectedConversation(convs[0]);
        fetchMessages(convs[0].id);
        setExpanded(true);
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
      const { data, error } = await supabase.functions.invoke("get-parent-messages", {
        body: { conversation_id: conversationId, parent_email: parentEmail },
      });

      if (error) throw error;
      setMessages(data?.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-parent-message", {
        body: {
          conversation_id: selectedConversation.id,
          parent_email: parentEmail,
          content,
        },
      });

      if (error) throw error;

      // Refresh messages
      fetchMessages(selectedConversation.id);

      toast({
        title: "Message sent",
        description: "We'll respond as soon as possible.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
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
        <p className="text-muted-foreground text-sm">
          No messages yet. We'll notify you when we have updates about your request.
        </p>
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
          expanded ? "max-h-[600px]" : "max-h-0"
        )}
      >
        <div className="border-t border-border">

          {/* Messages */}
          <div className="h-80 flex flex-col">
            <MessageThread
              messages={messages}
              currentUserType="parent"
              isLoading={messagesLoading}
            />
          </div>

          {/* Input */}
          <MessageInput
            onSend={handleSendMessage}
            placeholder="Type your message..."
            disabled={sending}
          />
        </div>
      </div>
    </div>
  );
};
