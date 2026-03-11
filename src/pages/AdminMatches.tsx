import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminMatches } from "@/hooks/useAdminData";
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
  ExternalLink,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { AdminNotificationsPanel } from "@/components/admin/AdminNotificationsPanel";

interface Match {
  id: string;
  parent_email: string;
  parent_first_name: string;
  support_type: string;
  status: string;
  created_at: string;
  caregiver_id: string;
  decline_reason?: string | null;
  caregiver_synopsis?: string | null;
  reviewed_at?: string | null;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading: loading, refetch } = useAdminMatches();

  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState<{
    [key: string]: { parent: string; caregiver: string };
  }>({});
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [sendingSubscriptionLink, setSendingSubscriptionLink] = useState<
    string | null
  >(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    Record<string, { subscribed: boolean; subscription_end?: string }>
  >({});

  const fetchSubscriptionStatus = async (emails: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "check-caregiver-subscription",
        { body: { emails } },
      );
      if (error) throw error;
      if (data?.subscriptions) {
        setSubscriptionStatus(data.subscriptions);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  // Fetch subscription status when matches load
  useEffect(() => {
    if (matches.length > 0) {
      const caregiverEmails = matches
        .map((m) => m.caregiver?.email)
        .filter((email): email is string => !!email);
      if (caregiverEmails.length > 0) {
        fetchSubscriptionStatus([...new Set(caregiverEmails)]);
      }
    }
  }, [matches]);

  const sendSubscriptionLink = async (match: Match) => {
    if (!match.caregiver) return;

    setSendingSubscriptionLink(match.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-caregiver-subscription",
        {
          body: {
            caregiver_email: match.caregiver.email,
            caregiver_name: `${match.caregiver.first_name || ""} ${
              match.caregiver.last_name || ""
            }`.trim(),
          },
        },
      );

      if (error) throw error;
      if (!data?.url) throw new Error("Failed to generate subscription link");

      const subscriptionUrl = data.url;

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

      const messageText = `Hi ${match.caregiver.first_name},\n\nWe have a match for you with ${match.parent_first_name}! Before we can connect you, please complete your Birth Rebel subscription (£25/month) using this link:\n\n${subscriptionUrl}\n\nOnce your subscription is active, we'll introduce you to ${match.parent_first_name}.\n\nThank you!\nThe Birth Rebel Team`;

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: messageText,
        sender_type: "admin",
      });

      if (msgError) throw msgError;

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
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "declined":
        return "bg-red-100 text-red-800";
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
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to delete this match?")) return;

    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (error) throw error;

      toast({ title: "Match deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
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

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: content.trim(),
        sender_type: "admin",
      });

      if (msgError) throw msgError;

      const { error: notifyError } = await supabase.functions.invoke(
        "send-parent-message-notification",
        {
          body: {
            parentEmail: match.parent_email,
            parentName: match.parent_first_name,
            messageContent: content.trim(),
          },
        },
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

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: content.trim(),
        sender_type: "admin",
      });

      if (msgError) throw msgError;

      const { error: notifyError } = await supabase.functions.invoke(
        "send-message-notification",
        {
          body: {
            conversationId: conversation.id,
            messageContent: content.trim(),
            senderType: "admin",
          },
        },
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
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#FFFAF5" }}
    >
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
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="mb-8">
            <AdminNotificationsPanel />
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
                  onOpenChange={(open) =>
                    setExpandedMatch(open ? match.id : null)
                  }
                >
                  <div className="bg-white rounded-lg shadow">
                    <CollapsibleTrigger className="w-full p-6 text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3
                              className="text-lg font-semibold"
                              style={{ color: "#36454F" }}
                            >
                              <Link
                                to={`/admin/parent-requests?email=${encodeURIComponent(
                                  match.parent_email,
                                )}`}
                                className="hover:underline hover:text-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {match.parent_first_name}
                              </Link>
                              {" ↔ "}
                              <Link
                                to={`/admin/caregivers?id=${match.caregiver_id}`}
                                className="hover:underline hover:text-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {match.caregiver?.first_name || "Unknown"}
                              </Link>
                            </h3>
                            <Badge className={getStatusColor(match.status)}>
                              {match.status}
                            </Badge>
                            {match.caregiver?.email &&
                              subscriptionStatus[match.caregiver.email]
                                ?.subscribed && (
                                <Badge className="bg-green-500 text-white hover:bg-green-600">
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Subscribed
                                </Badge>
                              )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(
                                new Date(match.created_at),
                                "MMM d, yyyy",
                              )}
                            </span>
                            <Badge variant="outline">
                              {match.support_type}
                            </Badge>
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
                            <h4
                              className="font-semibold flex items-center gap-2"
                              style={{ color: "#E2725B" }}
                            >
                              <User className="h-4 w-4" />
                              Parent Details
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                              <Link
                                to={`/admin/parent-requests?email=${encodeURIComponent(
                                  match.parent_email,
                                )}`}
                                className="font-medium hover:underline hover:text-primary flex items-center gap-1"
                              >
                                {match.parent_request?.first_name}{" "}
                                {match.parent_request?.last_name}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
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
                                  Due:{" "}
                                  {format(
                                    new Date(match.parent_request.due_date),
                                    "PPP",
                                  )}
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
                                {sendingMessage === `${match.id}-parent`
                                  ? "Sending..."
                                  : "Send"}
                              </Button>
                            </div>
                          </div>

                          {/* Caregiver Details */}
                          <div className="space-y-4">
                            <h4
                              className="font-semibold flex items-center gap-2"
                              style={{ color: "#E2725B" }}
                            >
                              <User className="h-4 w-4" />
                              Caregiver Details
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                              {match.caregiver ? (
                                <>
                                  <Link
                                    to={`/admin/caregivers?id=${match.caregiver.id}`}
                                    className="font-medium hover:underline hover:text-primary flex items-center gap-1"
                                  >
                                    {match.caregiver.first_name}{" "}
                                    {match.caregiver.last_name}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
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
                                <p className="text-muted-foreground">
                                  Caregiver not found
                                </p>
                              )}
                            </div>

                            {match.caregiver && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Message Caregiver
                                </label>
                                <Textarea
                                  placeholder="Type a message to the caregiver..."
                                  value={
                                    messageContent[match.id]?.caregiver || ""
                                  }
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
                                    !messageContent[
                                      match.id
                                    ]?.caregiver?.trim() ||
                                    sendingMessage === `${match.id}-caregiver`
                                  }
                                  style={{ backgroundColor: "#E2725B" }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  {sendingMessage === `${match.id}-caregiver`
                                    ? "Sending..."
                                    : "Send"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subscription Link Section */}
                        {match.caregiver && (
                          <div className="mt-6 pt-4 border-t">
                            <h4
                              className="font-semibold flex items-center gap-2 mb-3"
                              style={{ color: "#E2725B" }}
                            >
                              <CreditCard className="h-4 w-4" />
                              Caregiver Subscription
                            </h4>
                            <div className="flex items-center gap-4">
                              <p className="text-sm text-muted-foreground">
                                Send subscription link to{" "}
                                {match.caregiver.first_name} (£25/month)
                              </p>
                              <Button
                                size="sm"
                                onClick={() => sendSubscriptionLink(match)}
                                disabled={sendingSubscriptionLink === match.id}
                                style={{ backgroundColor: "#E2725B" }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {sendingSubscriptionLink === match.id
                                  ? "Sending..."
                                  : "Send Subscription Link"}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Status Actions */}
                        <div className="mt-6 pt-4 border-t flex flex-wrap gap-2 items-center justify-between">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm font-medium mr-2 self-center">
                              Update status:
                            </span>
                            {["matched", "booked", "closed"].map((status) => (
                              <Button
                                key={status}
                                size="sm"
                                variant={
                                  match.status === status
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => updateStatus(match.id, status)}
                                disabled={match.status === status}
                                className="capitalize"
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMatch(match.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Match
                          </Button>
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
