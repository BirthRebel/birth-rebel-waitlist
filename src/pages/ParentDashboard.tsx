import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Heart, Users, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { PendingMatchesCard } from "@/components/parent/PendingMatchesCard";
import { ParentCaregiverCard } from "@/components/parent/ParentCaregiverCard";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface ParentRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  support_type: string | null;
  due_date: string | null;
  location: string | null;
  status: string;
  created_at: string;
  matched_caregiver_id: string | null;
}

interface Match {
  id: string;
  status: string;
  support_type: string;
  created_at: string;
  caregiver_synopsis: string | null;
  meeting_link: string | null;
  caregiver_id: string;
  caregivers: {
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
  };
  quote: {
    id: string;
    status: string;
    total_amount: number;
    items: any[];
    notes: string | null;
    created_at: string;
  } | null;
}

const ParentDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [parentRequest, setParentRequest] = useState<ParentRequest | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const handleUnreadCountChange = useCallback((matchId: string, count: number) => {
    setUnreadCounts(prev => ({ ...prev, [matchId]: count }));
  }, []);

  const getTotalUnreadCount = () => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setLoading(false);
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
        navigate("/auth");
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, loading]);

  useEffect(() => {
    if (user?.email) {
      fetchParentData();
      fetchMatches();
    }
  }, [user]);

  const fetchParentData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-parent-request", {
        body: { email: user.email },
      });

      if (error) {
        console.error("Parent request fetch error:", error);
      } else {
        setParentRequest(data?.request || null);
      }
    } catch (error: any) {
      console.error("Error fetching parent data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-parent-matches", {
        body: { email: user.email },
      });

      if (error) {
        console.error("Error fetching matches:", error);
      } else {
        setMatches(data?.matches || []);
      }
    } catch (error: any) {
      console.error("Error fetching matches:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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
      default:
        return "bg-muted";
    }
  };

  // Filter matches - pending ones shown in PendingMatchesCard, active ones shown in caregiver cards
  const activeMatches = matches.filter(m => ["booked", "approved"].includes(m.status));
  const declinedMatches = matches.filter(m => m.status === "declined");

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#E2725B" }}>
                Welcome{parentRequest?.first_name ? `, ${parentRequest.first_name}` : ""}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Your Birth Rebel Dashboard
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>

          {/* Pending Matches Section - Priority */}
          {user?.email && (
            <PendingMatchesCard parentEmail={user.email} onMatchResponse={fetchMatches} />
          )}

          {/* My Caregivers Section - Active Connections */}
          {activeMatches.length > 0 && (
            <div className={cn(
              "mb-8 p-4 rounded-xl transition-all duration-300",
              getTotalUnreadCount() > 0 && "bg-red-50 ring-2 ring-red-500/30"
            )}>
              <div className="flex items-center gap-3 mb-4">
                <Users className={cn(
                  "h-5 w-5",
                  getTotalUnreadCount() > 0 ? "text-red-500" : ""
                )} style={getTotalUnreadCount() === 0 ? { color: "#E2725B" } : undefined} />
                <h2 className="text-xl font-semibold" style={{ color: "#36454F" }}>
                  My Caregivers
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({activeMatches.length})
                </span>
                {getTotalUnreadCount() > 0 && (
                  <span className="flex items-center gap-1.5 text-sm bg-red-500 text-white px-3 py-1 rounded-full font-medium animate-pulse shadow-lg">
                    <MessageCircle className="h-4 w-4" />
                    {getTotalUnreadCount()} new message{getTotalUnreadCount() > 1 ? "s" : ""}
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

          {/* Request Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" style={{ color: "#E2725B" }} />
                Your Support Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parentRequest ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(parentRequest.status)}>
                      {parentRequest.status}
                    </Badge>
                  </div>
                  {parentRequest.support_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Support Type</p>
                      <p className="font-medium capitalize">{parentRequest.support_type}</p>
                    </div>
                  )}
                  {parentRequest.due_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(parentRequest.due_date), "PPP")}
                      </p>
                    </div>
                  )}
                  {parentRequest.location && (
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{parentRequest.location}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    You don't have an active support request yet. Please contact us to get matched with a caregiver.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past/Declined Matches - collapsed by default */}
          {declinedMatches.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Past Matches</h3>
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
