import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminConversations,
  useConversationMessages,
  useSendMessage,
} from "@/hooks/useAdminData";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { NewConversationModal } from "@/components/messaging/NewConversationModal";
import { Plus, ArrowLeft, Mail } from "lucide-react";

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

const AdminMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useAdminConversations();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectOnLoad, setSelectOnLoad] = useState<string | null>(null);

  const { data: messages = [], isLoading: messagesLoading } =
    useConversationMessages(selectedConversation?.id ?? null);

  const sendMessage = useSendMessage();

  // Handle pending conversation selection after refetch
  useEffect(() => {
    if (selectOnLoad && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === selectOnLoad);
      if (conv) {
        setSelectedConversation(conv);
        setSelectOnLoad(null);
      }
    }
  }, [conversations, selectOnLoad]);

  const handleSelectConversation = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setSelectedConversation(conv);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    sendMessage.mutate(
      {
        conversationId: selectedConversation.id,
        content,
        caregiverId: selectedConversation.caregiver_id,
      },
      {
        onSuccess: () => {
          toast({
            title: "Message sent",
            description: selectedConversation.caregiver_id
              ? "The caregiver has been notified by email."
              : "Message saved. Consider sending an email to the parent.",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error sending message",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleConversationCreated = (conversationId: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    setSelectOnLoad(conversationId);
    setShowNewModal(false);
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "#FFFAF5" }}
      >
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#FFFAF5" }}
    >
      <Header />
      <main className="flex-1 pt-24 pb-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: "#E2725B" }}
            >
              Messages
            </h1>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-220px)] flex">
            {/* Conversation List */}
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
                isLoading={isLoading}
              />
            </div>

            {/* Message Thread */}
            <div
              className={`flex-1 flex flex-col ${
                !selectedConversation ? "hidden md:flex" : ""
              }`}
            >
              {selectedConversation ? (
                <>
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-1 hover:bg-accent rounded"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {selectedConversation.subject ||
                          selectedConversation.parent_email}
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
