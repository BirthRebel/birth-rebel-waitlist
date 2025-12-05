import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { NewConversationModal } from "@/components/messaging/NewConversationModal";
import { Plus, ArrowLeft, Mail } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

const AdminMessages = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminRole(session.user.id);
        } else {
          navigate("/caregiver/auth");
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        navigate("/caregiver/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchConversations();
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch caregiver names for conversations
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv) => {
          let caregiverName = "";
          if (conv.caregiver_id) {
            const { data: cgData } = await supabase.functions.invoke("get-all-caregivers");
            const caregiver = cgData?.caregivers?.find((c: any) => c.id === conv.caregiver_id);
            caregiverName = caregiver ? `${caregiver.first_name || ""} ${caregiver.last_name || ""}`.trim() : "";
          }

          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            caregiver_name: caregiverName,
            last_message: lastMsg?.content,
          };
        })
      );

      setConversations(conversationsWithDetails);
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

  const handleSelectConversation = async (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setSelectedConversation(conv);
      fetchMessages(conversationId);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        content,
        sender_type: "admin",
      });

      if (error) throw error;

      // Refresh messages
      fetchMessages(selectedConversation.id);

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      // Send email notification to caregiver (if conversation has one)
      if (selectedConversation.caregiver_id) {
        supabase.functions.invoke("send-message-notification", {
          body: {
            conversationId: selectedConversation.id,
            messageContent: content,
            senderType: "admin",
          },
        }).then(({ error: notifError }) => {
          if (notifError) {
            console.error("Failed to send notification:", notifError);
          }
        });
      }

      toast({
        title: "Message sent",
        description: selectedConversation.caregiver_id
          ? "The caregiver has been notified by email."
          : "Message saved. Consider sending an email to the parent.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConversationCreated = (conversationId: string) => {
    fetchConversations();
    handleSelectConversation(conversationId);
    setShowNewModal(false);
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
      <Header />
      <main className="flex-1 pt-24 pb-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#E2725B" }}>
              Messages
            </h1>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-220px)] flex">
            {/* Conversation List - Hidden on mobile when conversation selected */}
            <div
              className={`w-full md:w-80 border-r border-border flex-shrink-0 overflow-y-auto ${
                selectedConversation ? "hidden md:block" : ""
              }`}
            >
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Conversations</h2>
              </div>
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id || null}
                onSelect={handleSelectConversation}
                isLoading={loading}
              />
            </div>

            {/* Message Thread */}
            <div className={`flex-1 flex flex-col ${!selectedConversation ? "hidden md:flex" : ""}`}>
              {selectedConversation ? (
                <>
                  {/* Thread Header */}
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-1 hover:bg-accent rounded"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {selectedConversation.subject || selectedConversation.parent_email}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.caregiver_name
                          ? `With ${selectedConversation.caregiver_name}`
                          : `Parent: ${selectedConversation.parent_email}`}
                      </p>
                    </div>
                    {!selectedConversation.caregiver_id && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${selectedConversation.parent_email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email Parent
                        </a>
                      </Button>
                    )}
                  </div>

                  <MessageThread
                    messages={messages}
                    currentUserType="admin"
                    isLoading={messagesLoading}
                  />

                  <MessageInput
                    onSend={handleSendMessage}
                    placeholder={
                      selectedConversation.caregiver_id
                        ? "Message the caregiver..."
                        : "Add a note (use Email button to contact parent)..."
                    }
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <NewConversationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleConversationCreated}
      />
    </div>
  );
};

export default AdminMessages;
