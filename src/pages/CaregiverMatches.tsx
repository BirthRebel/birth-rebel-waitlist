import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { MatchCard } from "@/components/caregiver/MatchCard";
import { Users, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface Match {
  id: string;
  parent_first_name: string;
  parent_email: string;
  support_type: string;
  status: "matched" | "booked" | "closed";
  created_at: string;
  caregiver_synopsis?: string | null;
  meeting_link?: string | null;
}

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

const CaregiverMatches = () => {
  const [user, setUser] = useState<User | null>(null);
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [caregiverEmail, setCaregiverEmail] = useState<string | null>(null);
  const [matchesExpanded, setMatchesExpanded] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [parentRequests, setParentRequests] = useState<Record<string, ParentRequest>>({});
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for subscription success/cancel from URL params and auto-book matches
  useEffect(() => {
    const subscription = searchParams.get("subscription");
    
    const autoBookMatches = async () => {
      if (subscription === "success" && caregiverEmail) {
        try {
          const { data, error } = await supabase.functions.invoke("auto-book-matches", {
            body: { caregiver_email: caregiverEmail },
          });

          if (error) {
            console.error("Auto-book error:", error);
            toast({
              title: "Subscription activated!",
              description: "Thank you for subscribing. You can now receive matches.",
            });
          } else if (data?.booked_count > 0) {
            toast({
              title: "You're all set! 🎉",
              description: `Your subscription is active and ${data.booked_count} match(es) have been confirmed. You can now message your matched parent(s).`,
            });
            // Refresh matches to show updated status
            fetchCaregiverData();
          } else {
            toast({
              title: "Subscription activated!",
              description: "Thank you for subscribing. You can now receive matches.",
            });
          }
        } catch (err) {
          console.error("Auto-book error:", err);
          toast({
            title: "Subscription activated!",
            description: "Thank you for subscribing. You can now receive matches.",
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
  }, [searchParams, caregiverEmail, toast]);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout for mobile - prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Auth check timeout - redirecting to auth");
        setLoading(false);
        navigate("/caregiver/auth", { replace: true });
      }
    }, 8000);

    // Check session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      if (session?.user) {
        setUser(session.user);
      } else {
        // No session - redirect to auth
        clearTimeout(timeout);
        setLoading(false);
        navigate("/caregiver/auth", { replace: true });
      }
    }).catch((error) => {
      console.error("Session check error:", error);
      if (isMounted) {
        clearTimeout(timeout);
        setLoading(false);
        navigate("/caregiver/auth", { replace: true });
      }
    });

    // Listen for sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT') {
          navigate("/caregiver/auth", { replace: true });
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, loading]);

  useEffect(() => {
    if (user) {
      fetchCaregiverData();
    }
  }, [user]);

  const fetchCaregiverData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Query with explicit user_id filter
      const { data: caregiver, error: caregiverError } = await supabase
        .from("caregivers")
        .select("id, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (caregiverError) {
        console.error("Caregiver fetch error:", caregiverError);
        setLoading(false);
        return;
      }

      if (!caregiver) {
        setLoading(false);
        toast({
          title: "No caregiver profile found",
          description: "Please contact support if you believe this is an error.",
          variant: "destructive",
        });
        return;
      }

      setCaregiverId(caregiver.id);
      setCaregiverEmail(caregiver.email);

      // Fetch matches for this caregiver - only show confirmed matches (not declined)
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("id, parent_first_name, parent_email, support_type, status, created_at, caregiver_synopsis, meeting_link")
        .eq("caregiver_id", caregiver.id)
        .in("status", ["matched", "booked", "approved"])
        .order("created_at", { ascending: false });

      if (matchesError) {
        console.error("Matches fetch error:", matchesError);
      } else {
        const typedMatches = (matchesData || []) as Match[];
        setMatches(typedMatches);

        // Fetch parent requests for each match by email
        if (typedMatches.length > 0) {
          const emails = typedMatches.map(m => m.parent_email);
          const { data: requestsData, error: requestsError } = await supabase
            .from("parent_requests")
            .select("*")
            .in("email", emails);

          if (requestsError) {
            console.error("Parent requests fetch error:", requestsError);
          } else if (requestsData) {
            const requestsMap: Record<string, ParentRequest> = {};
            requestsData.forEach((req) => {
              requestsMap[req.email] = req as ParentRequest;
            });
            setParentRequests(requestsMap);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAF5' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAF5' }}>
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold" style={{ color: '#E2725B' }}>
              My Dashboard
            </h1>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>

          {/* My Profile Section - Prominent Card */}
          <button
            onClick={() => navigate("/caregiver/profile")}
            className="w-full mb-6 bg-white rounded-lg shadow overflow-hidden hover:bg-accent/50 transition-colors"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5" style={{ color: "#E2725B" }} />
                <h2 className="text-lg font-semibold" style={{ color: "#36454F" }}>
                  My Profile
                </h2>
                <span className="text-sm text-muted-foreground">
                  View and edit your details
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
            </div>
          </button>

          {/* Matches Section - Collapsible */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setMatchesExpanded(!matchesExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5" style={{ color: "#E2725B" }} />
                <h2 className="text-lg font-semibold" style={{ color: "#36454F" }}>
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

            {/* Expandable Content */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                matchesExpanded ? "max-h-[2000px]" : "max-h-0"
              )}
            >
              <div className="border-t border-border p-4">
                {matches.length === 0 ? (
                  <p className="text-center py-4" style={{ color: '#36454F' }}>
                    No matches yet. Check back soon!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <MatchCard 
                        key={match.id} 
                        match={match} 
                        parentRequest={parentRequests[match.parent_email] || null}
                        caregiverEmail={caregiverEmail || undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverMatches;
