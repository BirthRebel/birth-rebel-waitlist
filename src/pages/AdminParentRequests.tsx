import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";

interface ParentRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  support_type: string | null;
  due_date: string | null;
  location: string | null;
  special_requirements: string | null;
  status: string;
  created_at: string;
  matched_caregiver_id: string | null;
}

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

const AdminParentRequests = () => {
  const [requests, setRequests] = useState<ParentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("parent_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching parent requests:", error);
      toast({
        title: "Error",
        description: "Failed to load parent requests",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("parent_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );

      toast({
        title: "Status updated",
        description: `Request marked as ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const search = searchQuery.toLowerCase();
    return (
      !search ||
      r.email.toLowerCase().includes(search) ||
      r.first_name?.toLowerCase().includes(search) ||
      r.last_name?.toLowerCase().includes(search) ||
      r.location?.toLowerCase().includes(search) ||
      r.support_type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-48 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Parent Requests
              </h1>
              <p className="text-muted-foreground">
                {filteredRequests.length} of {requests.length} requests from
                Formless.ai
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, location, or support type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No parent requests found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === request.id ? null : request.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {request.first_name}{" "}
                            {request.last_name && request.last_name}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.email}
                            </span>
                            {request.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {request.phone}
                              </span>
                            )}
                            {request.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        {request.support_type && (
                          <Badge variant="outline">
                            <Heart className="h-3 w-3 mr-1" />
                            {request.support_type}
                          </Badge>
                        )}
                        {expandedId === request.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedId === request.id && (
                    <CardContent className="border-t pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">
                              Due Date
                            </h4>
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {request.due_date
                                ? format(new Date(request.due_date), "PPP")
                                : "Not specified"}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">
                              Submitted
                            </h4>
                            <p>
                              {format(new Date(request.created_at), "PPP 'at' p")}
                            </p>
                          </div>

                          {request.special_requirements && (
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                                Special Requirements
                              </h4>
                              <p className="text-sm bg-muted p-3 rounded-md">
                                {request.special_requirements}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              Update Status
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {["new", "contacted", "matched", "closed"].map(
                                (status) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={
                                      request.status === status
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus(request.id, status);
                                    }}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Button>
                                )
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `mailto:${request.email}`;
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </Button>
                            {request.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${request.phone}`;
                                }}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminParentRequests;
