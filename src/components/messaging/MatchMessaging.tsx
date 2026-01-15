import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Video, ChevronDown, ChevronUp, Link2, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface MatchMessagingProps {
  matchId: string;
  senderEmail: string;
  senderType: "caregiver" | "parent";
  matchStatus: string;
  initialMeetingLink?: string | null;
}

export const MatchMessaging = ({
  matchId,
  senderEmail,
  senderType,
  matchStatus,
  initialMeetingLink,
}: MatchMessagingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [meetingLink, setMeetingLink] = useState(initialMeetingLink || "");
  const [editingLink, setEditingLink] = useState(false);
  const [linkInput, setLinkInput] = useState(initialMeetingLink || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const canMessage = ["booked", "approved"].includes(matchStatus);

  useEffect(() => {
    if (canMessage) {
      fetchMessages();
      // Poll for new messages
      pollInterval.current = setInterval(fetchMessages, 5000);
    } else {
      setLoading(false);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [matchId, canMessage]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-match-messages", {
        body: { match_id: matchId, sender_email: senderEmail, sender_type: senderType },
      });

      if (error) throw error;
      
      setMessages(data?.messages || []);
      if (data?.meeting_link !== undefined) {
        setMeetingLink(data.meeting_link || "");
        setLinkInput(data.meeting_link || "");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!canMessage) return;
    
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-match-message", {
        body: {
          match_id: matchId,
          sender_type: senderType,
          sender_email: senderEmail,
          content,
        },
      });

      if (error) throw error;

      await fetchMessages();
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
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

  const handleSaveLink = async () => {
    setSavingLink(true);
    try {
      // Normalize the link - add https:// if missing
      let normalizedLink = linkInput.trim();
      if (normalizedLink && !normalizedLink.startsWith("http://") && !normalizedLink.startsWith("https://")) {
        normalizedLink = "https://" + normalizedLink;
      }

      const { error } = await supabase.functions.invoke("update-meeting-link", {
        body: {
          match_id: matchId,
          meeting_link: normalizedLink || null,
          caregiver_email: senderEmail,
        },
      });

      if (error) throw error;

      setMeetingLink(normalizedLink);
      setLinkInput(normalizedLink);
      setEditingLink(false);
      toast({
        title: "Meeting link saved",
        description: linkInput.trim() ? "Your video call link has been saved." : "Meeting link removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving link",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingLink(false);
    }
  };

  if (!canMessage) {
    return null;
  }

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: "#E2725B" }} />
          <span className="font-medium text-sm" style={{ color: "#36454F" }}>
            Messages & Video Call
          </span>
          {messages.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
          {/* Meeting Link Section */}
          <div className="p-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4" style={{ color: "#E2725B" }} />
              <span className="text-sm font-medium">Video Call</span>
            </div>

            {senderType === "caregiver" ? (
              // Caregiver can edit the link
              editingLink ? (
                <div className="flex gap-2">
                  <Input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Paste your Google Meet or Zoom link..."
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveLink}
                    disabled={savingLink}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingLink(false);
                      setLinkInput(meetingLink);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {meetingLink ? (
                    <>
                      <a
                        href={meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 truncate flex-1"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{meetingLink}</span>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingLink(true)}
                      >
                        <Link2 className="h-4 w-4" />
                        Edit
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingLink(true)}
                      className="w-full justify-center"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Add Video Call Link
                    </Button>
                  )}
                </div>
              )
            ) : (
              // Parent can only view the link
              meetingLink ? (
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Video className="h-4 w-4" />
                  Join Video Call
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your caregiver hasn't added a video call link yet.
                </p>
              )
            )}
          </div>

          {/* Messages */}
          <div className="h-64 flex flex-col">
            <MessageThread
              messages={messages}
              currentUserType={senderType}
              isLoading={loading}
            />
          </div>

          {/* Input */}
          <MessageInput
            onSend={handleSendMessage}
            placeholder={`Message your ${senderType === "caregiver" ? "client" : "caregiver"}...`}
            disabled={sending}
          />
        </div>
      </div>
    </div>
  );
};
