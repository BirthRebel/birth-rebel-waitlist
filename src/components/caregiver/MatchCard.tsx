import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, User, MapPin, Phone, Mail, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    status: "matched" | "booked" | "closed";
    created_at: string;
    caregiver_synopsis?: string | null;
  };
  parentRequest?: ParentRequest | null;
}

export const MatchCard = ({ match, parentRequest }: MatchCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Helper to display field if it has content
  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
        <Icon className="w-4 h-4 mt-1 text-[#E2725B] flex-shrink-0" />
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
          <p className="text-sm text-gray-700 mt-0.5">{value}</p>
        </div>
      </div>
    );
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
          {match.caregiver_synopsis && (
            <div className="mb-4 p-4 bg-[#E2725B]/5 rounded-lg border border-[#E2725B]/20">
              <h4 className="text-sm font-semibold text-[#E2725B] mb-2">Match Summary</h4>
              <p className="text-sm text-gray-700">{match.caregiver_synopsis}</p>
            </div>
          )}

          {parentRequest ? (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[#36454F] mb-3">Parent Request Details</h4>
              
              <InfoRow icon={MapPin} label="Location" value={parentRequest.location} />
              <InfoRow icon={Phone} label="Phone" value={parentRequest.phone} />
              <InfoRow icon={Mail} label="Email" value={parentRequest.email} />
              <InfoRow icon={Calendar} label="Stage of Journey" value={parentRequest.stage_of_journey} />
              <InfoRow icon={User} label="Family Context" value={parentRequest.family_context} />
              <InfoRow icon={MessageSquare} label="What They're Looking For" value={parentRequest.support_type} />
              <InfoRow icon={User} label="Caregiver Preferences" value={parentRequest.caregiver_preferences} />
              <InfoRow icon={MessageSquare} label="Preferred Communication" value={parentRequest.preferred_communication} />
              <InfoRow icon={User} label="Shared Identity Requests" value={parentRequest.shared_identity_requests} />
              <InfoRow icon={Clock} label="General Availability" value={parentRequest.general_availability} />
              <InfoRow icon={MessageSquare} label="Budget" value={parentRequest.budget} />
              <InfoRow icon={MessageSquare} label="Specific Concerns" value={parentRequest.specific_concerns} />
              <InfoRow icon={MessageSquare} label="Special Requirements" value={parentRequest.special_requirements} />
              <InfoRow icon={Calendar} label="Due Date" value={parentRequest.due_date} />
              <InfoRow icon={MessageSquare} label="Language" value={parentRequest.language} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No additional details available for this match.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
};