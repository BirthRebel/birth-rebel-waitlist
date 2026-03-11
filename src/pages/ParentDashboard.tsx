import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useParentRequest, useParentMatches } from "@/hooks/useParentDashboard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle } from "lucide-react";
import { PendingMatchesCard } from "@/components/parent/PendingMatchesCard";
import { ParentCaregiverCard } from "@/components/parent/ParentCaregiverCard";
import { ActionRequiredBanner } from "@/components/ActionRequiredBanner";
import { cn } from "@/lib/utils";
import { useState } from "react";

const ParentDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const { data: parentRequest, isLoading: requestLoading } = useParentRequest(
    user?.email,
  );
  const {
    data: matches = [],
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = useParentMatches(user?.email);

  const loading = requestLoading || matchesLoading;

  const handleUnreadCountChange = useCallback(
    (matchId: string, count: number) => {
      setUnreadCounts((prev) => ({ ...prev, [matchId]: count }));
    },
    [],
  );

  const getTotalUnreadCount = () => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const pendingMatches = matches.filter((m) => m.status === "matched");
  const activeMatches = matches.filter((m) =>
    ["booked", "approved"].includes(m.status),
  );
  const declinedMatches = matches.filter((m) => m.status === "declined");

  const quotesNeedingPayment = activeMatches.filter(
    (m) => m.quote?.status === "sent",
  );

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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#FFFAF5" }}
    >
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#E2725B" }}>
                Welcome
                {parentRequest?.first_name
                  ? `, ${parentRequest.first_name}`
                  : ""}
                !
              </h1>
              <p className="text-muted-foreground mt-1">
                Your Birth Rebel Dashboard
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>

          {pendingMatches.length > 0 && (
            <ActionRequiredBanner
              title={`${pendingMatches.length} Caregiver Match${
                pendingMatches.length > 1 ? "es" : ""
              } Awaiting Your Review`}
              description="You've been matched with a caregiver! Please review and confirm below to start communicating."
              variant="warning"
            />
          )}

          {quotesNeedingPayment.length > 0 && (
            <ActionRequiredBanner
              title={`${quotesNeedingPayment.length} Quote${
                quotesNeedingPayment.length > 1 ? "s" : ""
              } Ready for Payment`}
              description="Your caregiver has sent you a quote. Review the details and pay to confirm your booking."
              variant="info"
            />
          )}

          {user?.email && (
            <PendingMatchesCard
              parentEmail={user.email}
              onMatchResponse={refetchMatches}
            />
          )}

          {activeMatches.length > 0 && (
            <div
              className={cn(
                "mb-8 p-4 rounded-xl transition-all duration-300",
                getTotalUnreadCount() > 0 && "bg-red-50 ring-2 ring-red-500/30",
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <Users
                  className={cn(
                    "h-5 w-5",
                    getTotalUnreadCount() > 0 ? "text-red-500" : "",
                  )}
                  style={
                    getTotalUnreadCount() === 0
                      ? { color: "#E2725B" }
                      : undefined
                  }
                />
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#36454F" }}
                >
                  My Caregivers
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({activeMatches.length})
                </span>
                {getTotalUnreadCount() > 0 && (
                  <span className="flex items-center gap-1.5 text-sm bg-red-500 text-white px-3 py-1 rounded-full font-medium animate-pulse shadow-lg">
                    <MessageCircle className="h-4 w-4" />
                    {getTotalUnreadCount()} new message
                    {getTotalUnreadCount() > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {activeMatches.map((match, index) => (
                <ParentCaregiverCard
                  key={match.id}
                  match={match}
                  parentEmail={user?.email || ""}
                  defaultExpanded={index === 0 || getTotalUnreadCount() > 0}
                  onUnreadCountChange={handleUnreadCountChange}
                />
              ))}
            </div>
          )}

          {matches.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#E2725B]/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-[#E2725B]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                We're Finding Your Perfect Match
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Our team is reviewing your request and will match you with a
                caregiver who fits your needs. You'll receive an email when your
                match is ready for review.
              </p>
            </div>
          )}

          {declinedMatches.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Past Matches
              </h3>
              {declinedMatches.map((match) => (
                <ParentCaregiverCard
                  key={match.id}
                  match={match}
                  parentEmail={user?.email || ""}
                  defaultExpanded={false}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ParentDashboard;
