import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RefreshCw,
  User,
  Mail,
  Calendar,
  Phone,
  MapPin,
  ChevronDown,
  Send,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";

interface Match {
  id: string;
  parent_email: string;
  parent_first_name: string;
  support_type: string;
  status: string;
  created_at: string;
  caregiver_id: string;
  caregiver?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    city_town: string | null;
  };
  parent_request?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    phone: string | null;
    location: string | null;
    due_date: string | null;
    support_type: string | null;
    stage_of_journey: string | null;
    special_requirements: string | null;
  };
}

const AdminMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState<{ [key: string]: { parent: string; caregiver: string } }>({});
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [sendingSubscriptionLink, setSendingSubscriptionLink] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          caregiver:caregivers(id, first_name, last_name, email, phone, city_town)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch parent requests for each match
      const matchesWithParents = await Promise.all(
        (data || []).map(async (match) => {
          const { data: parentRequest } = await supabase
            .from("parent_requests")
            .select("*")
            .eq("email", match.parent_email)
            .maybeSingle();
          return { ...match, parent_request: parentRequest };
        })
      );

      setMatches(matchesWithParents);
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const sendSubscriptionLink = async (match: Match) => {
    if (!match.caregiver) return;
    
    setSendingSubscriptionLink(match.id);
    try {
      // Get checkout session URL
      const { data, error } = await supabase.functions.invoke("create-caregiver-subscription", {
        body: {
          caregiver_email: match.caregiver.email,
          caregiver_name: `${match.caregiver.first_name || ""} ${match.caregiver.last_name || ""}`.trim(),
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Failed to generate subscription link");

      const subscriptionUrl = data.url;

      // Find or create conversation with caregiver
      let { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("caregiver_id", match.caregiver.id)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            caregiver_id: match.caregiver.id,
            parent_email: match.parent_email,
            subject: `Subscription for ${match.parent_first_name}`,
          })
          .select("id")
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      // Send message with subscription link
      const messageText = `Hi ${match.caregiver.first_name},\n\nWe have a match for you with ${match.parent_first_name}! Before we can connect you, please complete your Birth Rebel subscription (£25/month) using this link:\n\n${subscriptionUrl}\n\nOnce your subscription is active, we'll introduce you to ${match.parent_first_name}.\n\nThank you!\nThe Birth Rebel Team`;

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: messageText,
        sender_type: "admin",
      });

      if (msgError) throw msgError;

      // Send email notification
      await supabase.functions.invoke("send-message-notification", {
        body: {
          conversationId: conversation.id,
          messageContent: messageText,
          senderType: "admin",
        },
      });

      toast({
        title: "Subscription link sent",
        description: `Subscription link sent to ${match.caregiver.first_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingSubscriptionLink(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "matched":
        return "bg-yellow-100 text-yellow-800";
      case "booked":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const updateStatus = async (matchId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({ status: newStatus })
        .eq("id", matchId);

      if (error) throw error;

      toast({ title: "Status updated" });
      fetchMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendMessageToParent = async (match: Match) => {
    const content = messageContent[match.id]?.parent;
    if (!content?.trim()) return;

    setSendingMessage(`${match.id}-parent`);
    try {
      // Find or create conversation with parent
      let { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("parent_email", match.parent_email)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            parent_email: match.parent_email,
            parent_request_id: match.parent_request?.id,
            subject: `Regarding your ${match.support_type} support request`,
          })
          .select("id")
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      // Send message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: content.trim(),
        sender_type: "admin",
      });

      if (msgError) throw msgError;

      // Send email notification to parent
      const { error: notifyError } = await supabase.functions.invoke(
        "send-parent-message-notification",
        {
          body: {
            parentEmail: match.parent_email,
            parentName: match.parent_first_name,
            messageContent: content.trim(),
          },
        }
      );

      if (notifyError) {
        console.error("Failed to send email notification:", notifyError);
      }

      toast({ title: "Message sent to parent" });
      setMessageContent((prev) => ({
        ...prev,
        [match.id]: { ...prev[match.id], parent: "" },
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(null);
    }
  };

  const sendMessageToCaregiver = async (match: Match) => {
    const content = messageContent[match.id]?.caregiver;
    if (!content?.trim() || !match.caregiver) return;

    setSendingMessage(`${match.id}-caregiver`);
    try {
      // Find or create conversation with caregiver
      let { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("caregiver_id", match.caregiver.id)
        .eq("parent_email", match.parent_email)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            caregiver_id: match.caregiver.id,
            parent_email: match.parent_email,
            subject: `Match: ${match.parent_first_name} - ${match.support_type}`,
          })
          .select("id")
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      // Send message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: content.trim(),
        sender_type: "admin",
      });

      if (msgError) throw msgError;

      // Send email notification to caregiver
      const { error: notifyError } = await supabase.functions.invoke(
        "send-message-notification",
        {
          body: {
            conversationId: conversation.id,
            messageContent: content.trim(),
            senderType: "admin",
          },
        }
      );

      if (notifyError) {
        console.error("Failed to send email notification:", notifyError);
      }

      toast({ title: "Message sent to caregiver" });
      setMessageContent((prev) => ({
        ...prev,
        [match.id]: { ...prev[match.id], caregiver: "" },
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#E2725B" }}>
                Matches
              </h1>
              <p className="text-muted-foreground mt-1">
                {matches.length} total matches
              </p>
            </div>
            <Button onClick={fetchMatches} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading && matches.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-muted-foreground">No matches found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <Collapsible
                  key={match.id}
                  open={expandedMatch === match.id}
                  onOpenChange={(open) => setExpandedMatch(open ? match.id : null)}
                >
                  <div className="bg-white rounded-lg shadow">
                    <CollapsibleTrigger className="w-full p-6 text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold" style={{ color: "#36454F" }}>
                              {match.parent_first_name} ↔{" "}
                              {match.caregiver?.first_name || "Unknown"}
                            </h3>
                            <Badge className={getStatusColor(match.status)}>
                              {match.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(match.created_at), "MMM d, yyyy")}
                            </span>
                            <Badge variant="outline">{match.support_type}</Badge>
                          </div>
                        </div>

                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            expandedMatch === match.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-6 pb-6 border-t pt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Parent Details */}
                          <div className="space-y-4">
                            <h4 className="font-semibold flex items-center gap-2" style={{ color: "#E2725B" }}>
                              <User className="h-4 w-4" />
                              Parent Details
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                              <p className="font-medium">
                                {match.parent_request?.first_name}{" "}
                                {match.parent_request?.last_name}
                              </p>
                              <p className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {match.parent_email}
                              </p>
                              {match.parent_request?.phone && (
                                <p className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  {match.parent_request.phone}
                                </p>
                              )}
                              {match.parent_request?.location && (
                                <p className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  {match.parent_request.location}
                                </p>
                              )}
                              {match.parent_request?.due_date && (
                                <p className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  Due: {format(new Date(match.parent_request.due_date), "PPP")}
                                </p>
                              )}
                              {match.parent_request?.special_requirements && (
                                <p className="text-sm mt-2">
                                  <span className="font-medium">Notes:</span>{" "}
                                  {match.parent_request.special_requirements}
                                </p>
                              )}
                            </div>

                            {/* Message Parent */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Message Parent
                              </label>
                              <Textarea
                                placeholder="Type a message to the parent..."
                                value={messageContent[match.id]?.parent || ""}
                                onChange={(e) =>
                                  setMessageContent((prev) => ({
                                    ...prev,
                                    [match.id]: {
                                      ...prev[match.id],
                                      parent: e.target.value,
                                    },
                                  }))
                                }
                                rows={3}
                              />
                              <Button
                                size="sm"
                                onClick={() => sendMessageToParent(match)}
                                disabled={
                                  !messageContent[match.id]?.parent?.trim() ||
                                  sendingMessage === `${match.id}-parent`
                                }
                                style={{ backgroundColor: "#E2725B" }}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {sendingMessage === `${match.id}-parent` ? "Sending..." : "Send"}
                              </Button>
                            </div>
                          </div>

                          {/* Caregiver Details */}
                          <div className="space-y-4">
                            <h4 className="font-semibold flex items-center gap-2" style={{ color: "#E2725B" }}>
                              <User className="h-4 w-4" />
                              Caregiver Details
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                              {match.caregiver ? (
                                <>
                                  <p className="font-medium">
                                    {match.caregiver.first_name} {match.caregiver.last_name}
                                  </p>
                                  <p className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    {match.caregiver.email}
                                  </p>
                                  {match.caregiver.phone && (
                                    <p className="flex items-center gap-2 text-sm">
                                      <Phone className="h-4 w-4 text-muted-foreground" />
                                      {match.caregiver.phone}
                                    </p>
                                  )}
                                  {match.caregiver.city_town && (
                                    <p className="flex items-center gap-2 text-sm">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      {match.caregiver.city_town}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-muted-foreground">Caregiver not found</p>
                              )}
                            </div>

                            {/* Message Caregiver */}
                            {match.caregiver && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Message Caregiver
                                </label>
                                <Textarea
                                  placeholder="Type a message to the caregiver..."
                                  value={messageContent[match.id]?.caregiver || ""}
                                  onChange={(e) =>
                                    setMessageContent((prev) => ({
                                      ...prev,
                                      [match.id]: {
                                        ...prev[match.id],
                                        caregiver: e.target.value,
                                      },
                                    }))
                                  }
                                  rows={3}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => sendMessageToCaregiver(match)}
                                  disabled={
                                    !messageContent[match.id]?.caregiver?.trim() ||
                                    sendingMessage === `${match.id}-caregiver`
                                  }
                                  style={{ backgroundColor: "#E2725B" }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  {sendingMessage === `${match.id}-caregiver` ? "Sending..." : "Send"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subscription Link Section */}
                        {match.caregiver && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="font-semibold flex items-center gap-2 mb-3" style={{ color: "#E2725B" }}>
                              <CreditCard className="h-4 w-4" />
                              Caregiver Subscription
                            </h4>
                            <div className="flex items-center gap-4">
                              <p className="text-sm text-muted-foreground">
                                Send subscription link to {match.caregiver.first_name} (£25/month)
                              </p>
                              <Button
                                size="sm"
                                onClick={() => sendSubscriptionLink(match)}
                                disabled={sendingSubscriptionLink === match.id}
                                style={{ backgroundColor: "#E2725B" }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {sendingSubscriptionLink === match.id ? "Sending..." : "Send Subscription Link"}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Status Actions */}
                        <div className="mt-6 pt-4 border-t flex flex-wrap gap-2">
                          <span className="text-sm font-medium mr-2 self-center">Update status:</span>
                          {["matched", "booked", "closed"].map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={match.status === status ? "default" : "outline"}
                              onClick={() => updateStatus(match.id, status)}
                              disabled={match.status === status}
                              className="capitalize"
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminMatches;
