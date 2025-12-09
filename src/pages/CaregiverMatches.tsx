import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CaregiverMessagesPanel } from "@/components/messaging/CaregiverMessagesPanel";
import type { User } from "@supabase/supabase-js";

interface Match {
  id: string;
  parent_first_name: string;
  parent_email: string;
  support_type: string;
  status: "matched" | "booked" | "closed";
  created_at: string;
}

const CaregiverMatches = () => {
  const [user, setUser] = useState<User | null>(null);
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
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

    // Check session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      if (session?.user) {
        setUser(session.user);
      } else {
        // No session - redirect to auth
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
      subscription.unsubscribe();
    };
  }, [navigate]);

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

      // Fetch matches for this caregiver
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("caregiver_id", caregiver.id)
        .order("created_at", { ascending: false });

      if (matchesError) {
        console.error("Matches fetch error:", matchesError);
      } else {
        setMatches((matchesData || []) as Match[]);
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "matched":
        return "bg-yellow-100 text-yellow-800";
      case "booked":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead style={{ backgroundColor: '#DED9CD' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#36454F' }}>Parent</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#36454F' }}>Support Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#36454F' }}>Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#36454F' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} className="border-t border-gray-200">
                      <td className="px-4 py-4" style={{ color: '#36454F' }}>
                        {match.parent_first_name}
                      </td>
                      <td className="px-4 py-4 capitalize" style={{ color: '#36454F' }}>
                        {match.support_type}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(match.status)}`}>
                          {match.status}
                        </span>
                      </td>
                      <td className="px-4 py-4" style={{ color: '#36454F' }}>
                        {new Date(match.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverMatches;
