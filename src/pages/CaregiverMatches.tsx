import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookingModal } from "@/components/BookingModal";
import type { User } from "@supabase/supabase-js";

interface Match {
  id: string;
  parent_first_name: string;
  parent_email: string;
  support_type: string;
  status: "matched" | "booked" | "closed";
  created_at: string;
}

interface Commission {
  id: string;
  match_id: string;
  commission_amount: number;
  commission_paid: boolean;
  paid_at: string | null;
}

const CaregiverMatches = () => {
  const [user, setUser] = useState<User | null>(null);
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [payingCommissionId, setPayingCommissionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/caregiver/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/caregiver/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchCaregiverData();
    }
  }, [user]);

  const fetchCaregiverData = async () => {
    try {
      // Get caregiver record
      const { data: caregiver, error: caregiverError } = await supabase
        .from("caregivers")
        .select("id")
        .single();

      if (caregiverError) {
        if (caregiverError.code === "PGRST116") {
          toast({
            title: "Not a caregiver",
            description: "Your account is not registered as a caregiver.",
            variant: "destructive",
          });
        }
        throw caregiverError;
      }

      setCaregiverId(caregiver.id);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Fetch commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select("*");

      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsBooked = async (matchId: string, bookingValue: number) => {
    if (!caregiverId) return;

    try {
      // Update match status
      const { error: updateError } = await supabase
        .from("matches")
        .update({ status: "booked" })
        .eq("id", matchId);

      if (updateError) throw updateError;

      // Create commission
      const commissionAmount = bookingValue * 0.12;
      const { error: insertError } = await supabase
        .from("commissions")
        .insert({
          match_id: matchId,
          caregiver_id: caregiverId,
          booking_value: bookingValue,
          commission_rate: 0.12,
          commission_amount: commissionAmount,
        });

      if (insertError) throw insertError;

      toast({
        title: "Booking confirmed",
        description: `Commission of £${commissionAmount.toFixed(2)} is now due.`,
      });

      fetchCaregiverData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayCommission = async (commissionId: string) => {
    setPayingCommissionId(commissionId);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-commission-checkout", {
        body: { commission_id: commissionId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Payment error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPayingCommissionId(null);
    }
  };

  const getCommissionForMatch = (matchId: string) => {
    return commissions.find((c) => c.match_id === matchId);
  };

  const getCommissionStatus = (matchId: string) => {
    const commission = getCommissionForMatch(matchId);
    if (!commission) return "Not created";
    if (commission.commission_paid) return "Paid";
    return "Due";
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
              My Matches
            </h1>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>

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
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#36454F' }}>Commission</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#36454F' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => {
                    const commission = getCommissionForMatch(match.id);
                    const commissionStatus = getCommissionStatus(match.id);
                    
                    return (
                      <tr key={match.id} className="border-t border-gray-200">
                        <td className="px-4 py-4" style={{ color: '#36454F' }}>
                          {match.parent_first_name}
                        </td>
                        <td className="px-4 py-4 capitalize" style={{ color: '#36454F' }}>
                          {match.support_type}
                        </td>
                        <td className="px-4 py-4 capitalize" style={{ color: '#36454F' }}>
                          {match.status}
                        </td>
                        <td className="px-4 py-4" style={{ color: '#36454F' }}>
                          {commissionStatus === "Due" && commission && (
                            <span>£{commission.commission_amount.toFixed(2)} due</span>
                          )}
                          {commissionStatus === "Paid" && commission && (
                            <span className="text-green-600">
                              Paid on {new Date(commission.paid_at!).toLocaleDateString()}
                            </span>
                          )}
                          {commissionStatus === "Not created" && <span>-</span>}
                        </td>
                        <td className="px-4 py-4">
                          {match.status === "matched" && !commission && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedMatchId(match.id)}
                              style={{ backgroundColor: '#E2725B' }}
                            >
                              Mark as booked
                            </Button>
                          )}
                          {commission && !commission.commission_paid && (
                            <Button
                              size="sm"
                              onClick={() => handlePayCommission(commission.id)}
                              disabled={payingCommissionId === commission.id}
                              style={{ backgroundColor: '#E2725B' }}
                            >
                              {payingCommissionId === commission.id ? "Loading..." : "Pay commission"}
                            </Button>
                          )}
                          {commission?.commission_paid && (
                            <span className="text-green-600 text-sm">✓ Complete</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <BookingModal
        isOpen={!!selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
        onConfirm={(bookingValue) => {
          if (selectedMatchId) {
            handleMarkAsBooked(selectedMatchId, bookingValue);
            setSelectedMatchId(null);
          }
        }}
      />
    </div>
  );
};

export default CaregiverMatches;