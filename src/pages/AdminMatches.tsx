import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, User, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Match {
  id: string;
  parent_email: string;
  parent_first_name: string;
  support_type: string;
  status: string;
  created_at: string;
  caregiver_id: string;
  caregiver?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

const AdminMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          caregiver:caregivers(first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const getStatusColor = (status: string) => {
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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#E2725B" }}>
                Matches
              </h1>
              <p className="text-muted-foreground mt-1">
                {matches.length} total matches
              </p>
            </div>
            <Button
              onClick={fetchMatches}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading && matches.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-muted-foreground">No matches found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold" style={{ color: "#36454F" }}>
                          {match.parent_first_name}
                        </h3>
                        <Badge className={getStatusColor(match.status)}>
                          {match.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{match.parent_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(match.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium" style={{ color: "#36454F" }}>
                          Matched Caregiver:
                        </p>
                        {match.caregiver ? (
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {match.caregiver.first_name} {match.caregiver.last_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({match.caregiver.email})
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unknown caregiver</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">{match.support_type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminMatches;
