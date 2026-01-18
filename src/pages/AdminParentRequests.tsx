import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageSquare,
  Send,
  Pencil,
  Users,
  Eye,
  Copy,
  Clock,
  Baby,
  Globe,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Archive
} from "lucide-react";
import { format } from "date-fns";
import { MatchCaregiverDialog } from "@/components/admin/MatchCaregiverDialog";
import { AdminMessagePanel } from "@/components/admin/AdminMessagePanel";

interface ParentRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  support_type: string | null;
  due_date: string | null;
  location: string | null;
  special_requirements: string | null;
  status: string;
  created_at: string;
  matched_caregiver_id: string | null;
  stage_of_journey: string | null;
  family_context: string | null;
  caregiver_preferences: string | null;
  language: string | null;
  preferred_communication: string | null;
  shared_identity_requests: string | null;
  budget: string | null;
  general_availability: string | null;
  specific_concerns: string | null;
}

interface Match {
  id: string;
  caregiver_id: string;
  parent_email: string;
  status: string;
  decline_reason: string | null;
  reviewed_at: string | null;
  caregiver_first_name?: string;
  caregiver_last_name?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "new":
      return "bg-blue-500";
    case "contacted":
      return "bg-yellow-500";
    case "matched":
      return "bg-green-500";
    case "closed":
      return "bg-gray-500";
    case "archived":
      return "bg-slate-400";
    default:
      return "bg-muted";
  }
};

// Generate a clean summary showing only the parent's actual responses (not the transcript)
const generateResponsesSummary = (request: ParentRequest): { label: string; value: string }[] => {
  const responses: { label: string; value: string }[] = [];
  
  // These fields contain actual answers, not the full transcript
  if (request.stage_of_journey) {
    responses.push({ label: "Stage", value: request.stage_of_journey });
  }
  
  if (request.family_context) {
    responses.push({ label: "Family context", value: request.family_context });
  }
  
  if (request.caregiver_preferences) {
    responses.push({ label: "Caregiver preferences", value: request.caregiver_preferences });
  }
  
  if (request.preferred_communication) {
    responses.push({ label: "Preferred communication", value: request.preferred_communication });
  }
  
  if (request.shared_identity_requests) {
    responses.push({ label: "Identity preferences", value: request.shared_identity_requests });
  }
  
  if (request.budget) {
    responses.push({ label: "Budget", value: request.budget });
  }
  
  if (request.general_availability) {
    responses.push({ label: "Availability", value: request.general_availability });
  }
  
  if (request.specific_concerns) {
    responses.push({ label: "Concerns", value: request.specific_concerns });
  }
  
  if (request.location) {
    responses.push({ label: "Location", value: request.location });
  }
  
  if (request.language) {
    responses.push({ label: "Language", value: request.language });
  }
  
  return responses;
};

// Generate a brief summary snippet for at-a-glance view
const generateSummarySnippet = (request: ParentRequest): string => {
  const parts: string[] = [];
  
  if (request.stage_of_journey && request.stage_of_journey.length < 40) {
    parts.push(request.stage_of_journey);
  }
  
  if (request.due_date) {
    try {
      parts.push(`Due ${format(new Date(request.due_date), "MMM d")}`);
    } catch {
      // Invalid date, skip
    }
  }
  
  if (request.location && request.location.length < 30) {
    parts.push(request.location);
  }
  
  if (parts.length === 0) {
    // Fallback: show first 60 chars of family context if available
    if (request.family_context) {
      return request.family_context.substring(0, 60) + "...";
    }
    return "Click to view details";
  }
  
  return parts.join(" • ");
};

// Generate formatted summary for sharing with caregivers
const generateCaregiverSummary = (request: ParentRequest): string => {
  const lines: string[] = [];
  
  lines.push(`=== Parent Support Request ===`);
  lines.push(`Name: ${request.first_name}${request.last_name ? ` ${request.last_name}` : ""}`);
  
  if (request.location) {
    lines.push(`Location: ${request.location}`);
  }
  
  lines.push("");
  lines.push("--- Support Needs ---");
  
  if (request.support_type) {
    lines.push(`Type: ${request.support_type}`);
  }
  
  if (request.stage_of_journey) {
    lines.push(`Stage: ${request.stage_of_journey}`);
  }
  
  if (request.due_date) {
    try {
      lines.push(`Due Date: ${format(new Date(request.due_date), "MMMM d, yyyy")}`);
    } catch {
      // Invalid date
    }
  }
  
  if (request.general_availability) {
    lines.push(`Availability: ${request.general_availability}`);
  }
  
  if (request.family_context) {
    lines.push("");
    lines.push("--- Family Context ---");
    lines.push(request.family_context);
  }
  
  if (request.caregiver_preferences) {
    lines.push("");
    lines.push("--- Preferences ---");
    lines.push(request.caregiver_preferences);
  }
  
  if (request.specific_concerns) {
    lines.push("");
    lines.push("--- Specific Concerns ---");
    lines.push(request.specific_concerns);
  }
  
  if (request.language) {
    lines.push("");
    lines.push(`Language: ${request.language}`);
  }
  
  if (request.shared_identity_requests) {
    lines.push(`Identity Preferences: ${request.shared_identity_requests}`);
  }
  
  return lines.join("\n");
};

const AdminParentRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ParentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ParentRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<ParentRequest | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSharingWithCaregiver, setIsSharingWithCaregiver] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [messagePanelRequest, setMessagePanelRequest] = useState<ParentRequest | null>(null);
  const [synopses, setSynopses] = useState<Record<string, string>>({});
  const [loadingSynopsis, setLoadingSynopsis] = useState<string | null>(null);
  const [matchesByEmail, setMatchesByEmail] = useState<Record<string, Match[]>>({});
  const [newRequest, setNewRequest] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    support_type: "",
    stage_of_journey: "",
    family_context: "",
    caregiver_preferences: "",
    language: "",
    preferred_communication: "",
    shared_identity_requests: "",
    budget: "",
    general_availability: "",
    specific_concerns: "",
  });
  const { toast } = useToast();

  const resetForm = () => {
    setNewRequest({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      support_type: "",
      stage_of_journey: "",
      family_context: "",
      caregiver_preferences: "",
      language: "",
      preferred_communication: "",
      shared_identity_requests: "",
      budget: "",
      general_availability: "",
      specific_concerns: "",
    });
  };

  const handleAddRequest = async () => {
    if (!newRequest.first_name || !newRequest.email) {
      toast({
        title: "Missing fields",
        description: "First name and email are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("parent_requests")
        .insert({
          first_name: newRequest.first_name,
          last_name: newRequest.last_name || null,
          email: newRequest.email?.toLowerCase() || null,
          phone: newRequest.phone || null,
          support_type: newRequest.support_type || null,
          stage_of_journey: newRequest.stage_of_journey || null,
          family_context: newRequest.family_context || null,
          caregiver_preferences: newRequest.caregiver_preferences || null,
          language: newRequest.language || null,
          preferred_communication: newRequest.preferred_communication || null,
          shared_identity_requests: newRequest.shared_identity_requests || null,
          budget: newRequest.budget || null,
          general_availability: newRequest.general_availability || null,
          specific_concerns: newRequest.specific_concerns || null,
          status: "new",
        })
        .select()
        .single();

      if (error) throw error;

      setRequests((prev) => [data, ...prev]);
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Request added",
        description: `Parent request for ${newRequest.first_name} has been created`,
      });
    } catch (error: any) {
      console.error("Error adding request:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleEditRequest = async () => {
    if (!editingRequest) return;

    if (!editingRequest.first_name || !editingRequest.email) {
      toast({
        title: "Missing fields",
        description: "First name and email are required",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("parent_requests")
        .update({
          first_name: editingRequest.first_name,
          last_name: editingRequest.last_name || null,
          email: editingRequest.email,
          phone: editingRequest.phone || null,
          support_type: editingRequest.support_type || null,
          stage_of_journey: editingRequest.stage_of_journey || null,
          family_context: editingRequest.family_context || null,
          caregiver_preferences: editingRequest.caregiver_preferences || null,
          language: editingRequest.language || null,
          preferred_communication: editingRequest.preferred_communication || null,
          shared_identity_requests: editingRequest.shared_identity_requests || null,
          budget: editingRequest.budget || null,
          general_availability: editingRequest.general_availability || null,
          specific_concerns: editingRequest.specific_concerns || null,
        })
        .eq("id", editingRequest.id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => (r.id === editingRequest.id ? editingRequest : r))
      );
      setIsEditDialogOpen(false);
      setEditingRequest(null);
      toast({
        title: "Request updated",
        description: `Parent request for ${editingRequest.first_name} has been updated`,
      });
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const handleSendMessage = async () => {
    if (!selectedRequest || !messageContent.trim()) {
      toast({
        title: "Missing message",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    setIsSendingMessage(true);
    try {
      // First, find or create a conversation for this parent request
      let conversationId: string;
      
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("parent_request_id", selectedRequest.id)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create a new conversation
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            parent_request_id: selectedRequest.id,
            parent_email: selectedRequest.email?.toLowerCase(),
            subject: `Support request from ${selectedRequest.first_name}`,
            status: "open",
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Insert the message
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content: messageContent,
          sender_type: "admin",
        });

      if (msgError) throw msgError;

      // Send email notification to parent
      const { error: emailError } = await supabase.functions.invoke(
        "send-parent-message-notification",
        {
          body: {
            parentEmail: selectedRequest.email,
            parentName: selectedRequest.first_name,
            messageContent: messageContent,
          },
        }
      );

      if (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the whole operation if email fails
      }

      // Update status to contacted if it was new
      if (selectedRequest.status === "new") {
        await updateStatus(selectedRequest.id, "contacted");
      }

      toast({
        title: "Message sent",
        description: "Your message has been sent and an email notification was delivered",
      });

      setIsMessageDialogOpen(false);
      setMessageContent("");
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsSendingMessage(false);
  };

  const handleShareWithCaregiver = async (request: ParentRequest) => {
    if (!request.matched_caregiver_id) {
      toast({
        title: "No caregiver matched",
        description: "Please match a caregiver first before sharing",
        variant: "destructive",
      });
      return;
    }

    setIsSharingWithCaregiver(request.id);
    try {
      // Get caregiver details for the message
      const { data: caregiver, error: caregiverError } = await supabase
        .from("caregivers")
        .select("first_name, last_name, email")
        .eq("id", request.matched_caregiver_id)
        .single();

      if (caregiverError) throw caregiverError;

      // Find or create a conversation between admin and this caregiver for this parent
      let conversationId: string;
      
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("caregiver_id", request.matched_caregiver_id)
        .eq("parent_request_id", request.id)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create a new conversation linking the caregiver to this parent request
        // Use a clean subject - just the parent name
        const cleanSubject = `Match: ${request.first_name}${request.last_name ? ` ${request.last_name}` : ""}`;
        
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            caregiver_id: request.matched_caregiver_id,
            parent_request_id: request.id,
            parent_email: request.email?.toLowerCase(),
            subject: cleanSubject,
            status: "open",
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Generate AI synopsis for the SMS
      let synopsis: string | null = null;
      try {
        const { data: synopsisData, error: synopsisError } = await supabase.functions.invoke("generate-request-synopsis", {
          body: { requestId: request.id },
        });
        if (!synopsisError && synopsisData?.synopsis) {
          synopsis = synopsisData.synopsis;
        }
      } catch (synopsisErr) {
        console.error("Error generating synopsis:", synopsisErr);
      }

      // Generate and send the summary as a message
      const summary = generateCaregiverSummary(request);
      const messageContent = `Hi ${caregiver.first_name},\n\nYou've been matched with a new parent. Here are the details:\n\n${summary}\n\nPlease review and reach out to discuss next steps.`;

      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content: messageContent,
          sender_type: "admin",
        });

      if (msgError) throw msgError;

      // Send email + SMS notification to caregiver (this is a match notification)
      const { error: emailError } = await supabase.functions.invoke(
        "send-message-notification",
        {
          body: {
            conversationId: conversationId,
            messageContent: messageContent,
            senderType: "admin",
            synopsis: synopsis,
            notificationType: "match", // This is a new match notification
          },
        }
      );

      if (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Shared with caregiver",
        description: `Parent summary sent to ${caregiver.first_name} ${caregiver.last_name || ""} via platform messaging`,
      });
    } catch (error: any) {
      console.error("Error sharing with caregiver:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsSharingWithCaregiver(null);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("parent_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      
      // Fetch matches for all parent emails
      if (data && data.length > 0) {
        const emails = data.map(r => r.email).filter(Boolean);
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id, caregiver_id, parent_email, status, decline_reason, reviewed_at")
          .in("parent_email", emails);
        
        if (!matchesError && matchesData) {
          // Get caregiver names
          const caregiverIds = [...new Set(matchesData.map(m => m.caregiver_id))];
          const { data: caregivers } = await supabase
            .from("caregivers")
            .select("id, first_name, last_name")
            .in("id", caregiverIds);
          
          const caregiverMap = new Map(caregivers?.map(c => [c.id, c]) || []);
          
          // Group matches by parent email
          const grouped: Record<string, Match[]> = {};
          matchesData.forEach(match => {
            const caregiver = caregiverMap.get(match.caregiver_id);
            const enrichedMatch: Match = {
              ...match,
              caregiver_first_name: caregiver?.first_name || undefined,
              caregiver_last_name: caregiver?.last_name || undefined,
            };
            if (!grouped[match.parent_email]) {
              grouped[match.parent_email] = [];
            }
            grouped[match.parent_email].push(enrichedMatch);
          });
          setMatchesByEmail(grouped);
        }
      }
    } catch (error: any) {
      console.error("Error fetching parent requests:", error);
      toast({
        title: "Error",
        description: "Failed to load parent requests",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const fetchSynopsis = async (request: ParentRequest) => {
    // Don't fetch if we already have it
    if (synopses[request.id]) return;
    
    setLoadingSynopsis(request.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-request-synopsis", {
        body: { request },
      });

      if (error) throw error;

      if (data?.synopsis) {
        setSynopses((prev) => ({ ...prev, [request.id]: data.synopsis }));
      }
    } catch (error: any) {
      console.error("Error generating synopsis:", error);
      // Silently fail - we still have the raw data
    }
    setLoadingSynopsis(null);
  };

  // Fetch synopsis when a card is expanded
  useEffect(() => {
    if (expandedId) {
      const request = requests.find((r) => r.id === expandedId);
      if (request) {
        fetchSynopsis(request);
      }
    }
  }, [expandedId]);

  const handleMatchCreated = (requestId: string, caregiverId: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, matched_caregiver_id: caregiverId, status: "matched" }
          : r
      )
    );
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("parent_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );

      toast({
        title: "Status updated",
        description: `Request marked as ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteRequest = async (id: string, firstName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the request from ${firstName}? This cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("parent_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== id));

      toast({
        title: "Request deleted",
        description: `Request from ${firstName} has been permanently deleted`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const archiveRequest = async (id: string, firstName: string) => {
    try {
      const { error } = await supabase
        .from("parent_requests")
        .update({ status: "archived" })
        .eq("id", id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "archived" } : r))
      );

      toast({
        title: "Request archived",
        description: `Request from ${firstName} has been archived`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const search = searchQuery.toLowerCase();
    return (
      !search ||
      r.email.toLowerCase().includes(search) ||
      r.first_name?.toLowerCase().includes(search) ||
      r.last_name?.toLowerCase().includes(search) ||
      r.location?.toLowerCase().includes(search) ||
      r.support_type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-48 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Parent Requests
              </h1>
              <p className="text-muted-foreground">
                {filteredRequests.length} of {requests.length} requests from
                Formless.ai
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Parent Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={newRequest.first_name}
                          onChange={(e) =>
                            setNewRequest({ ...newRequest, first_name: e.target.value })
                          }
                          placeholder="Jane"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={newRequest.last_name}
                          onChange={(e) =>
                            setNewRequest({ ...newRequest, last_name: e.target.value })
                          }
                          placeholder="Smith"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newRequest.email}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, email: e.target.value })
                        }
                        placeholder="jane@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newRequest.phone}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, phone: e.target.value })
                        }
                        placeholder="+44 7123 456789"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="support_type">Support Type</Label>
                      <Select
                        value={newRequest.support_type}
                        onValueChange={(value) =>
                          setNewRequest({ ...newRequest, support_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select support type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doula">Doula</SelectItem>
                          <SelectItem value="lactation">Lactation Consultant</SelectItem>
                          <SelectItem value="sleep">Sleep Consultant</SelectItem>
                          <SelectItem value="hypnobirthing">Hypnobirthing</SelectItem>
                          <SelectItem value="postnatal">Postnatal Support</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stage_of_journey">Stage of Pregnancy / Postpartum</Label>
                      <Input
                        id="stage_of_journey"
                        value={newRequest.stage_of_journey}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, stage_of_journey: e.target.value })
                        }
                        placeholder="e.g., 32 weeks pregnant, 3 months postpartum"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="family_context">Birth and Family Context</Label>
                      <Textarea
                        id="family_context"
                        value={newRequest.family_context}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, family_context: e.target.value })
                        }
                        placeholder="Family background, birth situation..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="caregiver_preferences">Caregiver Preferences</Label>
                      <Textarea
                        id="caregiver_preferences"
                        value={newRequest.caregiver_preferences}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, caregiver_preferences: e.target.value })
                        }
                        placeholder="What are you looking for in a caregiver?"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Input
                        id="language"
                        value={newRequest.language}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, language: e.target.value })
                        }
                        placeholder="Preferred language(s)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferred_communication">Preferred Way to Communicate</Label>
                      <Input
                        id="preferred_communication"
                        value={newRequest.preferred_communication}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, preferred_communication: e.target.value })
                        }
                        placeholder="e.g., Email, WhatsApp, Phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shared_identity_requests">Requests for Shared Identity</Label>
                      <Textarea
                        id="shared_identity_requests"
                        value={newRequest.shared_identity_requests}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, shared_identity_requests: e.target.value })
                        }
                        placeholder="Any shared identity preferences..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget</Label>
                      <Input
                        id="budget"
                        value={newRequest.budget}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, budget: e.target.value })
                        }
                        placeholder="Budget range"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="general_availability">General Availability</Label>
                      <Input
                        id="general_availability"
                        value={newRequest.general_availability}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, general_availability: e.target.value })
                        }
                        placeholder="When are you available?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specific_concerns">Specific Concerns</Label>
                      <Textarea
                        id="specific_concerns"
                        value={newRequest.specific_concerns}
                        onChange={(e) =>
                          setNewRequest({ ...newRequest, specific_concerns: e.target.value })
                        }
                        placeholder="Any specific concerns or needs..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddRequest} disabled={isSubmitting}>
                        {isSubmitting ? "Adding..." : "Add Request"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={fetchRequests} variant="outline" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, location, or support type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No parent requests found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
                    onClick={() =>
                      setExpandedId(expandedId === request.id ? null : request.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Top row: Name, status badges, and expand icon */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">
                              {request.first_name}{" "}
                              {request.last_name && request.last_name}
                            </CardTitle>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                            {request.support_type && request.support_type.length < 50 && (
                              <Badge variant="outline" className="hidden sm:flex max-w-[200px] truncate">
                                <Heart className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{request.support_type}</span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const summary = generateCaregiverSummary(request);
                                navigator.clipboard.writeText(summary);
                                toast({
                                  title: "Copied to clipboard",
                                  description: "Parent summary ready to share with caregivers",
                                });
                              }}
                              title="Copy summary for caregivers"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {expandedId === request.id ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Summary snippet - the key at-a-glance info */}
                        <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                          {generateSummarySnippet(request)}
                        </p>

                        {/* Key info pills - only show if data is reasonable length */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {request.location && request.location.length < 50 && (
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full max-w-[150px]">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{request.location}</span>
                            </span>
                          )}
                          {request.due_date && (
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
                              <Baby className="h-3 w-3" />
                              Due {format(new Date(request.due_date), "MMM d")}
                            </span>
                          )}
                          {request.general_availability && request.general_availability.length < 100 && (
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full max-w-[180px]">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {request.general_availability.length > 25 
                                  ? request.general_availability.substring(0, 25) + "..." 
                                  : request.general_availability}
                              </span>
                            </span>
                          )}
                          {request.language && request.language.length < 50 && (
                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full max-w-[120px]">
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{request.language}</span>
                            </span>
                          )}
                          {/* Show support type as pill on mobile - only if short */}
                          {request.support_type && request.support_type.length < 50 && (
                            <span className="flex sm:hidden items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full max-w-[150px]">
                              <Heart className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{request.support_type}</span>
                            </span>
                          )}
                        </div>

                        {/* Match Status Display */}
                        {matchesByEmail[request.email] && matchesByEmail[request.email].length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-2">Match Status:</p>
                            <div className="flex flex-wrap gap-2">
                              {matchesByEmail[request.email].map((match) => (
                                <button 
                                  key={match.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Navigate to caregivers page with search for this caregiver
                                    const caregiverName = match.caregiver_first_name || '';
                                    navigate(`/admin/caregivers?search=${encodeURIComponent(caregiverName)}`);
                                  }}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                                    match.status === 'approved' || match.status === 'booked'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : match.status === 'declined'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}
                                  title={`Click to view ${match.caregiver_first_name || 'caregiver'}'s profile`}
                                >
                                  {match.status === 'approved' || match.status === 'booked' ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : match.status === 'declined' ? (
                                    <XCircle className="h-3 w-3" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                  <span className="font-medium underline">
                                    {match.caregiver_first_name || 'Caregiver'}
                                  </span>
                                  <span>
                                    {match.status === 'approved' ? 'Confirmed' : 
                                     match.status === 'booked' ? 'Booked' :
                                     match.status === 'declined' ? 'Declined' : 'Pending'}
                                  </span>
                                  {match.status === 'declined' && match.decline_reason && (
                                    <span className="text-red-600 dark:text-red-400 truncate max-w-[100px]" title={match.decline_reason}>
                                      ({match.decline_reason})
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedId === request.id && (
                    <CardContent className="border-t pt-6">
                      {/* Contact info row */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6 pb-4 border-b">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {request.email}
                        </span>
                        {request.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {request.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Submitted {format(new Date(request.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Column 1: AI Synopsis */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-foreground border-b pb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Synopsis
                          </h4>
                          
                          {/* AI-generated synopsis */}
                          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg text-sm">
                            {loadingSynopsis === request.id ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Generating synopsis...
                              </div>
                            ) : synopses[request.id] ? (
                              <p className="text-foreground leading-relaxed">{synopses[request.id]}</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-muted-foreground italic">Synopsis not yet generated</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchSynopsis(request);
                                  }}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Generate
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Collapsible raw data section */}
                          <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">
                              View full transcript
                            </summary>
                            <div className="mt-2 bg-muted/30 p-3 rounded-lg max-h-[300px] overflow-y-auto">
                              {request.support_type ? (
                                <p className="text-foreground text-xs whitespace-pre-wrap">{request.support_type}</p>
                              ) : (
                                <p className="text-muted-foreground italic text-xs">No transcript available</p>
                              )}
                            </div>
                          </details>
                        </div>

                        {/* Column 2: Actions */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-foreground border-b pb-2">Actions</h4>
                          
                          {/* Status buttons */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                            <div className="flex flex-wrap gap-2">
                              {["new", "contacted", "matched", "closed"].map(
                                (status) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={
                                      request.status === status
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(request.id, status);
                                    }}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Share with matched caregiver - only shows when matched */}
                          {request.matched_caregiver_id && (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                              disabled={isSharingWithCaregiver === request.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareWithCaregiver(request);
                              }}
                            >
                              {isSharingWithCaregiver === request.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Share with Matched Caregiver
                                </>
                              )}
                            </Button>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRequest(request);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessagePanelRequest(request);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Messages
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                                setIsMessageDialogOpen(true);
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Quick Message
                            </Button>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={request.matched_caregiver_id ? "secondary" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                                setIsMatchDialogOpen(true);
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              {request.matched_caregiver_id ? "Rematch" : "Match Caregiver"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `mailto:${request.email}`;
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </Button>
                            {request.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${request.phone}`;
                                }}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call
                              </Button>
                            )}
                          </div>
                          
                          {/* Archive and Delete buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                            {request.status !== "archived" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveRequest(request.id, request.first_name);
                                }}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRequest(request.id, request.first_name);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Send Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Send Message to {selectedRequest?.first_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                This will send an in-app message and email notification to{" "}
                <strong>{selectedRequest?.email}</strong> with instructions to
                log in and view your message.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Hi! Thank you for reaching out to Birth Rebel..."
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMessageDialogOpen(false);
                  setMessageContent("");
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isSendingMessage || !messageContent.trim()}
              >
                {isSendingMessage ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Parent Request</DialogTitle>
          </DialogHeader>
          {editingRequest && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name *</Label>
                  <Input
                    id="edit_first_name"
                    value={editingRequest.first_name}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={editingRequest.last_name || ""}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_email">Email *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingRequest.email}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={editingRequest.phone || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_support_type">Support Type</Label>
                <Select
                  value={editingRequest.support_type || ""}
                  onValueChange={(value) =>
                    setEditingRequest({ ...editingRequest, support_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select support type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doula">Doula</SelectItem>
                    <SelectItem value="lactation">Lactation Consultant</SelectItem>
                    <SelectItem value="sleep">Sleep Consultant</SelectItem>
                    <SelectItem value="hypnobirthing">Hypnobirthing</SelectItem>
                    <SelectItem value="postnatal">Postnatal Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_stage_of_journey">Stage of Pregnancy / Postpartum</Label>
                <Input
                  id="edit_stage_of_journey"
                  value={editingRequest.stage_of_journey || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, stage_of_journey: e.target.value })
                  }
                  placeholder="e.g., 32 weeks pregnant, 3 months postpartum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_family_context">Birth and Family Context</Label>
                <Textarea
                  id="edit_family_context"
                  value={editingRequest.family_context || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, family_context: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_caregiver_preferences">Caregiver Preferences</Label>
                <Textarea
                  id="edit_caregiver_preferences"
                  value={editingRequest.caregiver_preferences || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, caregiver_preferences: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_language">Language</Label>
                <Input
                  id="edit_language"
                  value={editingRequest.language || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, language: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_preferred_communication">Preferred Way to Communicate</Label>
                <Input
                  id="edit_preferred_communication"
                  value={editingRequest.preferred_communication || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, preferred_communication: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_shared_identity_requests">Requests for Shared Identity</Label>
                <Textarea
                  id="edit_shared_identity_requests"
                  value={editingRequest.shared_identity_requests || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, shared_identity_requests: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_budget">Budget</Label>
                <Input
                  id="edit_budget"
                  value={editingRequest.budget || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, budget: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_general_availability">General Availability</Label>
                <Input
                  id="edit_general_availability"
                  value={editingRequest.general_availability || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, general_availability: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_specific_concerns">Specific Concerns</Label>
                <Textarea
                  id="edit_specific_concerns"
                  value={editingRequest.specific_concerns || ""}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, specific_concerns: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingRequest(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditRequest} disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Caregiver Dialog */}
      <MatchCaregiverDialog
        open={isMatchDialogOpen}
        onOpenChange={setIsMatchDialogOpen}
        parentRequest={selectedRequest}
        onMatchCreated={handleMatchCreated}
      />

      {/* Message side panel */}
      <AdminMessagePanel
        isOpen={!!messagePanelRequest}
        onClose={() => setMessagePanelRequest(null)}
        parentRequestId={messagePanelRequest?.id}
        parentEmail={messagePanelRequest?.email}
        parentName={
          messagePanelRequest
            ? `${messagePanelRequest.first_name} ${messagePanelRequest.last_name || ""}`.trim()
            : undefined
        }
      />
    </div>
  );
};

export default AdminParentRequests;
