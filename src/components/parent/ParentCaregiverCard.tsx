import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Calendar, User, Video, MessageCircle, Receipt, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { useToast } from "@/hooks/use-toast";

interface Caregiver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  is_doula: boolean;
  is_private_midwife: boolean;
  is_lactation_consultant: boolean;
  is_sleep_consultant: boolean;
  is_hypnobirthing_coach: boolean;
  is_bereavement_councillor: boolean;
  cal_link: string | null;
}

interface Quote {
  id: string;
  status: string;
  total_amount: number;
  items: any[];
  notes: string | null;
  created_at: string;
}

interface Match {
  id: string;
  status: string;
  support_type: string;
  created_at: string;
  caregiver_synopsis: string | null;
  meeting_link: string | null;
  caregiver_id: string;
  caregivers: Caregiver;
  quote: Quote | null;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface ParentCaregiverCardProps {
  match: Match;
  parentEmail: string;
  defaultExpanded?: boolean;
  onUnreadCountChange?: (matchId: string, count: number) => void;
}

export const ParentCaregiverCard = ({ match, parentEmail, defaultExpanded = false, onUnreadCountChange }: ParentCaregiverCardProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const { toast } = useToast();

  const caregiver = match.caregivers;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "matched":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "booked":
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "declined":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { color: "bg-green-100 text-green-800 border-green-200", label: "Paid" };
      case "accepted":
        return { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Payment Processing" };
      case "sent":
        return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Awaiting Payment" };
      default:
        return { color: "bg-gray-100 text-gray-800 border-gray-200", label: status };
    }
  };

  const getCaregiverRole = () => {
    const roles = [];
    if (caregiver?.is_doula) roles.push("Doula");
    if (caregiver?.is_private_midwife) roles.push("Midwife");
    if (caregiver?.is_lactation_consultant) roles.push("Lactation Consultant");
    if (caregiver?.is_sleep_consultant) roles.push("Sleep Consultant");
    if (caregiver?.is_hypnobirthing_coach) roles.push("Hypnobirthing Coach");
    if (caregiver?.is_bereavement_councillor) roles.push("Bereavement Counsellor");
    return roles.join(", ") || "Birth Support Professional";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fetch conversation on mount to get unread counts (even when collapsed)
  useEffect(() => {
    if (["booked", "approved"].includes(match.status)) {
      fetchConversation();
    }
  }, [match.status]);

  // Mark messages as read when card is expanded
  useEffect(() => {
    if (isExpanded && conversationId && unreadCount > 0 && !hasBeenViewed) {
      markMessagesAsRead();
    }
  }, [isExpanded, conversationId, unreadCount, hasBeenViewed]);

  // Poll for messages when expanded
  useEffect(() => {
    if (!conversationId) return;
    
    // Poll more frequently when expanded, less frequently when collapsed
    const interval = setInterval(() => {
      fetchMessagesQuiet();
    }, isExpanded ? 3000 : 15000);

    return () => clearInterval(interval);
  }, [conversationId, isExpanded]);

  const markMessagesAsRead = async () => {
    if (!conversationId) return;
    try {
      await supabase.functions.invoke("mark-messages-read", {
        body: { conversation_id: conversationId, reader_type: "parent" },
      });
      setHasBeenViewed(true);
      setUnreadCount(0);
      onUnreadCountChange?.(match.id, 0);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const fetchConversation = async () => {
    try {
      // Find conversation for this caregiver
      const { data, error } = await supabase.functions.invoke("get-parent-conversations", {
        body: { parent_email: parentEmail },
      });

      if (error) throw error;

      const conversations = data?.conversations || [];
      // Find conversation with this caregiver (via caregiver_id)
      const conv = conversations.find((c: any) => c.caregiver_id === match.caregiver_id);
      
      if (conv) {
        setConversationId(conv.id);
        fetchMessages(conv.id);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  const fetchMessages = async (convId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-parent-messages", {
        body: { conversation_id: convId, parent_email: parentEmail },
      });

      if (error) throw error;
      
      const msgs = data?.messages || [];
      setMessages(msgs);
      
      // Count unread messages and notify parent
      const unread = msgs.filter((m: Message) => m.sender_type === "caregiver" && !m.read_at).length;
      setUnreadCount(unread);
      onUnreadCountChange?.(match.id, unread);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchMessagesQuiet = async () => {
    if (!conversationId) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-parent-messages", {
        body: { conversation_id: conversationId, parent_email: parentEmail },
      });

      if (!error) {
        const msgs = data?.messages || [];
        setMessages(msgs);
        
        // Only update unread count if not already viewed - prevents red border from reappearing
        if (!hasBeenViewed) {
          const unread = msgs.filter((m: Message) => m.sender_type === "caregiver" && !m.read_at).length;
          setUnreadCount(unread);
          onUnreadCountChange?.(match.id, unread);
        }
      }
    } catch (error) {
      console.error("Error polling messages:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!conversationId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-parent-message", {
        body: {
          conversation_id: conversationId,
          parent_email: parentEmail,
          content,
        },
      });

      if (error) throw error;
      fetchMessages(conversationId);
      toast({ title: "Message sent" });
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

  const canMessage = ["booked", "approved"].includes(match.status);
  const caregiverName = caregiver?.first_name 
    ? `${caregiver.first_name}${caregiver.last_name ? ` ${caregiver.last_name}` : ""}`
    : "Your Caregiver";

  // Show red border only if unread AND not yet viewed
  const showUnreadIndicator = unreadCount > 0 && !hasBeenViewed;

  return (
    <Card className={cn(
      "mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300",
      showUnreadIndicator 
        ? "border-2 border-red-500 ring-2 ring-red-500/20" 
        : "border border-gray-200"
    )}>
      <CardHeader 
        className="cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden",
              showUnreadIndicator ? "ring-2 ring-red-500" : ""
            )}>
              {caregiver?.profile_photo_url ? (
                <img 
                  src={caregiver.profile_photo_url} 
                  alt={caregiverName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#E2725B]/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-[#E2725B]" />
                </div>
              )}
              {showUnreadIndicator && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-[#36454F] flex items-center gap-2">
                {caregiverName}
                {showUnreadIndicator && (
                  <span className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                    <MessageCircle className="h-3 w-3" />
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">{getCaregiverRole()}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`${getStatusBadgeColor(match.status)} border capitalize text-xs`}>
                  {match.status}
                </Badge>
                {match.quote && (
                  <Badge className={`${getQuoteStatusBadge(match.quote.status).color} border text-xs`}>
                    {getQuoteStatusBadge(match.quote.status).label}
                  </Badge>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(match.created_at)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">
              {isExpanded ? "Hide" : "View"}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="bg-gray-50 border-t border-gray-100 space-y-4 pt-4">
          {/* 1. About Caregiver - moved to top */}
          {match.caregiver_synopsis && canMessage && (
            <div className="bg-[#E2725B]/5 p-4 rounded-lg border border-[#E2725B]/20">
              <h4 className="text-sm font-semibold text-[#E2725B] mb-2">About {caregiver?.first_name || "Your Caregiver"}</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{match.caregiver_synopsis}</p>
            </div>
          )}

          {/* 2. Quote Details */}
          {match.quote && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-[#E2725B]" />
                <h4 className="font-semibold text-sm">Quote Details</h4>
                <Badge className={`${getQuoteStatusBadge(match.quote.status).color} border text-xs ml-auto`}>
                  {getQuoteStatusBadge(match.quote.status).label}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                {(match.quote.items as any[]).map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.description} {item.quantity > 1 && `x${item.quantity}`}
                    </span>
                    <span className="font-medium">£{((item.unit_price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>£{(match.quote.total_amount / 100).toFixed(2)}</span>
                </div>
              </div>

              {match.quote.status === "sent" && (
                <Button 
                  className="w-full mt-4 bg-[#E2725B] hover:bg-[#d4614b]"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/quote/${match.quote?.id}`, "_blank");
                  }}
                >
                  Pay Now
                </Button>
              )}
            </div>
          )}

          {/* 3. Book a Call (Cal.com) */}
          {caregiver?.cal_link && canMessage && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#E2725B]" />
                  <h4 className="font-semibold text-sm">Book a Call</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = caregiver.cal_link!.startsWith('http') 
                      ? caregiver.cal_link! 
                      : `https://${caregiver.cal_link!}`;
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Schedule on Cal.com
                </Button>
              </div>
            </div>
          )}

          {/* 4. Video Session Link */}
          {match.meeting_link && canMessage && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#E2725B]" />
                  <h4 className="font-semibold text-sm">Video Session</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = match.meeting_link!.startsWith('http') 
                      ? match.meeting_link! 
                      : `https://${match.meeting_link!}`;
                    navigator.clipboard.writeText(url);
                    toast({
                      title: "Link copied!",
                      description: "Open a new browser tab and paste the link to join the call.",
                    });
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Copy Meeting Link
                </Button>
              </div>
            </div>
          )}

          {/* 4. Messaging - moved to bottom with scroll fix */}
          {canMessage && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#E2725B]" />
                <h4 className="font-semibold text-sm">Messages with {caregiver?.first_name || "Caregiver"}</h4>
              </div>
              
              <div className="h-64 overflow-y-auto">
                <MessageThread
                  messages={messages}
                  currentUserType="parent"
                  isLoading={messagesLoading}
                  shouldAutoScroll={false}
                />
              </div>
              
              <MessageInput
                onSend={handleSendMessage}
                placeholder={`Message ${caregiver?.first_name || "your caregiver"}...`}
                disabled={sending}
              />
            </div>
          )}

          {/* Pending status message */}
          {match.status === "matched" && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 font-medium">Awaiting Your Confirmation</p>
              <p className="text-sm text-yellow-700 mt-1">
                Please confirm this match above to start communicating with {caregiver?.first_name || "your caregiver"}.
              </p>
            </div>
          )}

          {match.status === "declined" && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800 font-medium">Match Declined</p>
              <p className="text-sm text-red-700 mt-1">
                This match was not accepted. Please contact Birth Rebel if you'd like to be matched with another caregiver.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
