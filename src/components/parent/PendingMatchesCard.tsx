import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DeclineMatchDialog } from "./DeclineMatchDialog";

interface Match {
  id: string;
  status: string;
  support_type: string;
  created_at: string;
  caregiver_synopsis: string | null;
  decline_reason: string | null;
  reviewed_at: string | null;
}

interface PendingMatchesCardProps {
  parentEmail: string;
  onMatchResponse?: () => void;
}

export function PendingMatchesCard({ parentEmail, onMatchResponse }: PendingMatchesCardProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [parentEmail]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-parent-matches", {
        body: { email: parentEmail },
      });

      if (error) throw error;
      setMatches(data?.matches || []);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (matchId: string) => {
    setActionLoading(matchId);
    try {
      const { data, error } = await supabase.functions.invoke("parent-match-response", {
        body: {
          matchId,
          action: "approve",
          parentEmail,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Match approved!");
      fetchMatches();
      onMatchResponse?.();
    } catch (error: any) {
      console.error("Error approving match:", error);
      toast.error("Failed to approve match. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineClick = (matchId: string) => {
    setSelectedMatchId(matchId);
    setDeclineDialogOpen(true);
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!selectedMatchId) return;

    setActionLoading(selectedMatchId);
    try {
      const { data, error } = await supabase.functions.invoke("parent-match-response", {
        body: {
          matchId: selectedMatchId,
          action: "decline",
          declineReason: reason,
          parentEmail,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Match declined. We'll find you a better match.");
      setDeclineDialogOpen(false);
      setSelectedMatchId(null);
      fetchMatches();
      onMatchResponse?.();
    } catch (error: any) {
      console.error("Error declining match:", error);
      toast.error("Failed to decline match. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "matched":
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "declined":
        return <Badge className="bg-red-500">Declined</Badge>;
      case "booked":
        return <Badge className="bg-blue-500">Booked</Badge>;
      default:
        return <Badge className="bg-muted">{status}</Badge>;
    }
  };


  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Loading your matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  // Only show pending matches - booked matches are now shown in ParentCaregiverCard
  const pendingMatches = matches.filter(m => m.status === "matched");

  // Only render if there are pending matches
  if (pendingMatches.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-2 border-amber-400 mb-6 shadow-lg shadow-amber-500/10 overflow-hidden">
        <CardHeader className="bg-amber-50 border-b border-amber-200">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <div className="p-1.5 bg-amber-100 rounded-full">
              <Heart className="h-5 w-5 text-amber-600" />
            </div>
            <span className="flex-1">
              Your Caregiver Match{pendingMatches.length > 1 ? "es" : ""}
            </span>
            <Badge className="bg-amber-500 text-white border-0 animate-pulse">
              Action Required
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {pendingMatches.map((match) => (
            <div key={match.id} className="border-2 border-amber-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold capitalize">{match.support_type} Support</p>
                  <p className="text-sm text-muted-foreground">
                    Matched on {format(new Date(match.created_at), "PPP")}
                  </p>
                </div>
                {getStatusBadge(match.status)}
              </div>

              {match.caregiver_synopsis ? (
                <div className="bg-[#E2725B]/5 rounded-lg p-4 mb-4 border border-[#E2725B]/20">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1 text-[#E2725B]">
                    <Clock className="h-4 w-4" />
                    About Your Matched Caregiver
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {match.caregiver_synopsis}
                  </p>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    We've found a caregiver who matches your needs. Review their profile and let us know if you'd like to proceed!
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleDeclineClick(match.id)}
                  disabled={actionLoading === match.id}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
                <Button
                  onClick={() => handleApprove(match.id)}
                  disabled={actionLoading === match.id}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4" />
                  {actionLoading === match.id ? "Processing..." : "Approve Match"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <DeclineMatchDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onConfirm={handleDeclineConfirm}
        loading={actionLoading !== null}
      />
    </>
  );
}
