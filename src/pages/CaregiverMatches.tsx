import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CaregiverMessagesPanel } from "@/components/messaging/CaregiverMessagesPanel";
import { MatchCard } from "@/components/caregiver/MatchCard";
import type { User } from "@supabase/supabase-js";

interface Match {
  id: string;
  parent_first_name: string;
  parent_email: string;
  support_type: string;
  status: "matched" | "booked" | "closed";
  created_at: string;
  caregiver_synopsis?: string | null;
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [parentRequests, setParentRequests] = useState<Record<string, ParentRequest>>({});
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for subscription success/cancel from URL params
  useEffect(() => {
    const subscription = searchParams.get("subscription");
    if (subscription === "success") {
      toast({
        title: "Subscription activated!",
        description: "Thank you for subscribing. You can now receive matches.",
      });
    } else if (subscription === "cancelled") {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription was not completed.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

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
        .select("id")
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

      // Fetch matches for this caregiver (including caregiver_synopsis)
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("id, parent_first_name, parent_email, support_type, status, created_at, caregiver_synopsis")
        .eq("caregiver_id", caregiver.id)
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

          {/* Messages Section */}
          <div className="mb-8">
            <CaregiverMessagesPanel />
          </div>

          {/* Matches Section */}
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#36454F' }}>
            My Matches
          </h2>

          {matches.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p style={{ color: '#36454F' }}>No matches yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  parentRequest={parentRequests[match.parent_email] || null}
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

export default CaregiverMatches;
