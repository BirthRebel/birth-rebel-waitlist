import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCaregiverProfile } from "@/hooks/useCaregiverProfile";
import {
  useCaregiverMatchesList,
  useParentRequestsByEmails,
} from "@/hooks/useCaregiverMatches";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { MatchCard } from "@/components/caregiver/MatchCard";
import { QuotesPanel } from "@/components/caregiver/QuotesPanel";
import { CodeOfConductDialog } from "@/components/caregiver/CodeOfConductDialog";
import { OnboardingChecklist } from "@/components/caregiver/OnboardingChecklist";
import { ActionRequiredBanner } from "@/components/ActionRequiredBanner";
import {
  Users,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  FileText,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CaregiverMatches = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showCoCDialog, setShowCoCDialog] = useState(false);
  const [matchesExpanded, setMatchesExpanded] = useState(true);
  const [quotesExpanded, setQuotesExpanded] = useState(true);

  // Cascading queries
  const { data: caregiverData, isLoading: caregiverLoading } =
    useCaregiverProfile(user?.id);
  const caregiverId = caregiverData?.id;
  const caregiverEmail = caregiverData?.email;

  const { data: matches = [], isLoading: matchesLoading } =
    useCaregiverMatchesList(caregiverId);

  const emails = matches.map((m) => m.parent_email);
  const { data: parentRequests = {} } = useParentRequestsByEmails(emails);

  const loading = caregiverLoading || (!!caregiverId && matchesLoading);

  // Show CoC dialog once caregiver data loads
  useEffect(() => {
    if (caregiverData && !caregiverData.code_of_conduct_accepted) {
      setShowCoCDialog(true);
    }
  }, [caregiverData?.id, caregiverData?.code_of_conduct_accepted]);

  // Handle subscription success/cancel from URL params
  useEffect(() => {
    const subscription = searchParams.get("subscription");

    const autoBookMatches = async () => {
      if (subscription === "success" && caregiverEmail) {
        try {
          const { data, error } = await supabase.functions.invoke(
            "auto-book-matches",
            {
              body: { caregiver_email: caregiverEmail },
            },
          );

          if (error) {
            console.error("Auto-book error:", error);
            toast({
              title: "Subscription activated!",
              description:
                "Thank you for subscribing. You can now receive matches.",
            });
          } else if (data?.booked_count > 0) {
            toast({
              title: "You're all set! 🎉",
              description: `Your subscription is active and ${data.booked_count} match(es) have been confirmed. You can now message your matched parent(s).`,
            });
            queryClient.invalidateQueries({ queryKey: ["caregiver-matches"] });
          } else {
            toast({
              title: "Subscription activated!",
              description:
                "Thank you for subscribing. You can now receive matches.",
            });
          }
        } catch (err) {
          console.error("Auto-book error:", err);
          toast({
            title: "Subscription activated!",
            description:
              "Thank you for subscribing. You can now receive matches.",
          });
        }
      } else if (subscription === "cancelled") {
        toast({
          title: "Subscription cancelled",
          description: "Your subscription was not completed.",
          variant: "destructive",
        });
      }
    };

    autoBookMatches();
  }, [searchParams, caregiverEmail, toast, queryClient]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
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

  if (!caregiverData) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "#FFFAF5" }}
      >
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p className="text-muted-foreground">
            No caregiver profile found. Please contact support.
          </p>
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

      {caregiverId && (
        <CodeOfConductDialog
          open={showCoCDialog}
          caregiverId={caregiverId}
          onAccepted={() => setShowCoCDialog(false)}
        />
      )}

      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold" style={{ color: "#E2725B" }}>
              My Dashboard
            </h1>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>

          <OnboardingChecklist caregiver={caregiverData} />

          {matches.filter((m) => m.status === "matched").length > 0 && (
            <ActionRequiredBanner
              title={`${matches.filter((m) => m.status === "matched").length} Match${
                matches.filter((m) => m.status === "matched").length > 1
                  ? "es"
                  : ""
              } Awaiting Parent Confirmation`}
              description="These parents have been matched with you but haven't confirmed yet. You'll be able to message them once they accept."
              variant="info"
              icon={<Clock className="h-6 w-6 text-blue-600" />}
            />
          )}

          {/* My Profile Section */}
          <button
            onClick={() => navigate("/caregiver/profile")}
            className="w-full mb-6 bg-white rounded-lg shadow overflow-hidden hover:bg-accent/50 transition-colors"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5" style={{ color: "#E2725B" }} />
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "#36454F" }}
                >
                  My Profile
                </h2>
                <span className="text-sm text-muted-foreground">
                  View and edit your details
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
            </div>
          </button>

          {/* Matches Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setMatchesExpanded(!matchesExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5" style={{ color: "#E2725B" }} />
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "#36454F" }}
                >
                  My Matches
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({matches.length})
                </span>
              </div>
              {matchesExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                matchesExpanded ? "max-h-[2000px]" : "max-h-0",
              )}
            >
              <div className="border-t border-border p-4">
                {matches.length === 0 ? (
                  <p className="text-center py-4" style={{ color: "#36454F" }}>
                    No matches yet. Check back soon!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        parentRequest={
                          parentRequests[match.parent_email] || null
                        }
                        caregiverEmail={caregiverEmail || undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quotes Section */}
          {caregiverId && (
            <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
              <button
                onClick={() => setQuotesExpanded(!quotesExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" style={{ color: "#E2725B" }} />
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "#36454F" }}
                  >
                    My Quotes
                  </h2>
                </div>
                {quotesExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  quotesExpanded ? "max-h-[2000px]" : "max-h-0",
                )}
              >
                <div className="border-t border-border p-4">
                  <QuotesPanel caregiverId={caregiverId} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverMatches;
