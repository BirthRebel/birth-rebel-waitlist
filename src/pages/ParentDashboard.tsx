import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Heart } from "lucide-react";
import { format } from "date-fns";
import { ParentMessagesPanel } from "@/components/messaging/ParentMessagesPanel";
import { PendingMatchesCard } from "@/components/parent/PendingMatchesCard";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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

const ParentDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [parentRequest, setParentRequest] = useState<ParentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    }
  }, [user]);

  const fetchParentData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      // Fetch parent request by email using edge function
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
            <PendingMatchesCard parentEmail={user.email} />
          )}

          {/* Messages Section */}
          {user?.email && (
            <div className="mb-8">
              <ParentMessagesPanel parentEmail={user.email} />
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ParentDashboard;
