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
}

export function PendingMatchesCard({ parentEmail }: PendingMatchesCardProps) {
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

  const pendingMatches = matches.filter(m => m.status === "matched");
  const otherMatches = matches.filter(m => m.status !== "matched");

  return (
    <>
      {pendingMatches.length > 0 && (
        <Card className="border-2 border-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" style={{ color: "#E2725B" }} />
              Your Caregiver Match{pendingMatches.length > 1 ? "es" : ""} - Review Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingMatches.map((match) => (
              <div key={match.id} className="border rounded-lg p-4 bg-white">
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
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      About Your Matched Caregiver
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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

                <div className="flex gap-3 justify-end">
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
                    className="flex items-center gap-2"
                    style={{ backgroundColor: "#E2725B" }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {actionLoading === match.id ? "Processing..." : "Approve Match"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {otherMatches.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" style={{ color: "#E2725B" }} />
              Past Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherMatches.map((match) => (
              <div key={match.id} className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold capitalize">{match.support_type} Support</p>
                    <p className="text-sm text-muted-foreground">
                      {match.reviewed_at 
                        ? `Reviewed on ${format(new Date(match.reviewed_at), "PPP")}`
                        : `Matched on ${format(new Date(match.created_at), "PPP")}`}
                    </p>
                    {match.status === "declined" && match.decline_reason && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Decline reason:</strong> {match.decline_reason}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(match.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DeclineMatchDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onConfirm={handleDeclineConfirm}
        loading={actionLoading !== null}
      />
    </>
  );
}
