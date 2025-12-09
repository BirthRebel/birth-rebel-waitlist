import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { useToast } from "@/hooks/use-toast";
import { X, MessageSquare, Send, Mail } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  subject: string | null;
  parent_email: string;
  caregiver_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AdminMessagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  // For caregiver messages
  caregiverId?: string;
  caregiverName?: string;
  caregiverEmail?: string;
  // For parent messages
  parentRequestId?: string;
  parentEmail?: string;
  parentName?: string;
}

export const AdminMessagePanel = ({
  isOpen,
  onClose,
  caregiverId,
  caregiverName,
  caregiverEmail,
  parentRequestId,
  parentEmail,
  parentName,
}: AdminMessagePanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const { toast } = useToast();

  const isCaregiver = !!caregiverId;
  const targetEmail = isCaregiver ? caregiverEmail : parentEmail;
  const targetName = isCaregiver ? caregiverName : parentName;

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, caregiverId, parentRequestId]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
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
    setLoading(true);
    try {
      let query = supabase.from("conversations").select("*");

      if (isCaregiver && caregiverId) {
        query = query.eq("caregiver_id", caregiverId);
      } else if (parentRequestId) {
        query = query.eq("parent_request_id", parentRequestId);
      } else if (parentEmail) {
        query = query.eq("parent_email", parentEmail);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;

      setConversations(data || []);
      
      // Auto-select first conversation if exists
      if (data && data.length > 0) {
        setSelectedConversation(data[0]);
        fetchMessages(data[0].id);
      } else {
        setSelectedConversation(null);
        setMessages([]);
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

  const createConversation = async () => {
    try {
      const conversationData: {
        parent_email: string;
        subject: string;
        status: string;
        caregiver_id?: string;
        parent_request_id?: string;
      } = {
        parent_email: parentEmail || "admin@birthrebel.com",
        subject: `Conversation with ${targetName || targetEmail}`,
        status: "open",
      };

      if (isCaregiver && caregiverId) {
        conversationData.caregiver_id = caregiverId;
      }
      if (parentRequestId) {
        conversationData.parent_request_id = parentRequestId;
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert(conversationData)
        .select()
        .single();

      if (error) throw error;

      setConversations((prev) => [data, ...prev]);
      setSelectedConversation(data);
      setMessages([]);

      return data.id;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSendMessage = async (content: string) => {
    let conversationId = selectedConversation?.id;

    // Create conversation if none exists
    if (!conversationId) {
      conversationId = await createConversation();
      if (!conversationId) return;
    }

    try {
      const { data: newMessage, error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        content,
        sender_type: "admin",
      }).select().single();

      if (error) throw error;

      // Optimistically add message to state (real-time might also add it, so we check for duplicates)
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMessage.id);
        return exists ? prev : [...prev, newMessage];
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Send notification based on recipient type
      if (isCaregiver && caregiverId) {
        supabase.functions.invoke("send-message-notification", {
          body: {
            conversationId,
            messageContent: content,
            senderType: "admin",
          },
        });
      } else if (parentEmail) {
        supabase.functions.invoke("send-parent-message-notification", {
          body: {
            parentEmail,
            parentName: parentName || "Parent",
            messageContent: content,
          },
        });
      }

      toast({
        title: "Message sent",
        description: "Email notification sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">
              Messages with {targetName || "Unknown"}
            </h3>
            <p className="text-xs text-muted-foreground">{targetEmail}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Conversation tabs (if multiple) */}
      {conversations.length > 1 && (
        <div className="flex gap-2 p-2 border-b overflow-x-auto">
          {conversations.map((conv) => (
            <Button
              key={conv.id}
              variant={selectedConversation?.id === conv.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedConversation(conv);
                fetchMessages(conv.id);
              }}
              className="whitespace-nowrap text-xs"
            >
              {conv.subject || format(new Date(conv.created_at), "MMM d")}
            </Button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      ) : (
        <>
          {/* Message thread */}
          <MessageThread
            messages={messages}
            currentUserType="admin"
            isLoading={messagesLoading}
          />

          {/* Message input */}
          <div className="border-t">
            {!isCaregiver && parentEmail && (
              <div className="px-4 pt-2">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={`mailto:${parentEmail}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email {parentName || "Parent"} Directly
                  </a>
                </Button>
              </div>
            )}
            <MessageInput
              onSend={handleSendMessage}
              placeholder={
                isCaregiver
                  ? `Message ${caregiverName || "caregiver"}...`
                  : `Message ${parentName || "parent"}...`
              }
            />
          </div>
        </>
      )}
    </div>
  );
};
