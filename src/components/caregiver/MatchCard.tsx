import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Calendar, User, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchMessaging } from "@/components/messaging/MatchMessaging";
import { QuoteBuilder } from "@/components/caregiver/QuoteBuilder";
import { supabase } from "@/integrations/supabase/client";

interface ParentRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  support_type: string | null;
  stage_of_journey: string | null;
  family_context: string | null;
  caregiver_preferences: string | null;
  preferred_communication: string | null;
  shared_identity_requests: string | null;
  budget: string | null;
  general_availability: string | null;
  specific_concerns: string | null;
  special_requirements: string | null;
  due_date: string | null;
  language: string | null;
}

interface MatchCardProps {
  match: {
    id: string;
    parent_first_name: string;
    parent_email: string;
    support_type: string;
    status: string;
    created_at: string;
    caregiver_synopsis?: string | null;
    meeting_link?: string | null;
  };
  parentRequest?: ParentRequest | null;
  caregiverEmail?: string;
}

export const MatchCard = ({ match, parentRequest, caregiverEmail }: MatchCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [isLoadingSynopsis, setIsLoadingSynopsis] = useState(false);
  const [synopsisError, setSynopsisError] = useState<string | null>(null);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "matched":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "booked":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fetch synopsis when expanded and we have a parentRequest - only for booked/approved matches
  useEffect(() => {
    const canViewDetails = ["booked", "approved"].includes(match.status);
    if (isExpanded && parentRequest && !synopsis && !isLoadingSynopsis && canViewDetails) {
      fetchSynopsis();
    }
  }, [isExpanded, parentRequest, match.status]);

  const fetchSynopsis = async () => {
    if (!parentRequest) return;
    
    setIsLoadingSynopsis(true);
    setSynopsisError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-request-synopsis', {
        body: { request: parentRequest }
      });
      
      if (error) throw error;
      
      if (data?.synopsis) {
        setSynopsis(data.synopsis);
      } else {
        setSynopsisError("Unable to generate summary");
      }
    } catch (error) {
      console.error("Error fetching synopsis:", error);
      setSynopsisError("Failed to load summary");
    } finally {
      setIsLoadingSynopsis(false);
    }
  };

  return (
    <Card className="mb-4 overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader 
        className="cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#E2725B]/10 flex items-center justify-center">
              <User className="w-6 h-6 text-[#E2725B]" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-[#36454F]">
                {match.parent_first_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getStatusBadgeColor(match.status)} border capitalize`}>
                  {match.status}
                </Badge>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(match.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {isExpanded ? "Hide details" : "View details"}
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
        <CardContent className="bg-gray-50 border-t border-gray-100">
          {/* For "matched" status - parent hasn't accepted yet, don't show details */}
          {match.status === "matched" && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Pending Confirmation</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                This parent has been matched with you, but hasn't confirmed the match yet. 
                Once they accept, and you have an active subscription, you'll be able to see their details and start messaging.
              </p>
            </div>
          )}

          {/* Parent Request Summary - only show for booked or approved matches */}
          {["booked", "approved"].includes(match.status) && (
            <>
              <div className="p-4 bg-[#E2725B]/5 rounded-lg border border-[#E2725B]/20">
                <h4 className="text-sm font-semibold text-[#E2725B] mb-3">About This Parent</h4>
                
                {isLoadingSynopsis ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[#E2725B]" />
                    <span className="ml-2 text-sm text-gray-500">Generating summary...</span>
                  </div>
                ) : synopsis ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{synopsis}</p>
                ) : synopsisError ? (
                  <p className="text-sm text-gray-500 italic">{synopsisError}</p>
                ) : !parentRequest ? (
                  <p className="text-sm text-gray-500 italic">Parent request details are not available.</p>
                ) : null}
              </div>

              {/* Quote Builder */}
              {showQuoteBuilder ? (
                <div className="mt-4">
                  <QuoteBuilder
                    matchId={match.id}
                    parentEmail={match.parent_email}
                    parentName={match.parent_first_name}
                    onQuoteSent={() => setShowQuoteBuilder(false)}
                    onCancel={() => setShowQuoteBuilder(false)}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <Button 
                    onClick={() => setShowQuoteBuilder(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Send Quote
                  </Button>
                </div>
              )}

              {/* Messaging and Video Call - for booked or approved matches */}
              {caregiverEmail && (
                <MatchMessaging
                  matchId={match.id}
                  senderEmail={caregiverEmail}
                  senderType="caregiver"
                  matchStatus={match.status}
                  initialMeetingLink={match.meeting_link}
                />
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};
