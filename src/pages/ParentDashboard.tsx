import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Calendar, Heart, User } from "lucide-react";
import { format } from "date-fns";
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

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  subject: string | null;
  status: string;
  created_at: string;
  messages: Message[];
}

const ParentDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [parentRequest, setParentRequest] = useState<ParentRequest | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Fetch parent request by email
      const { data: request, error: requestError } = await supabase
        .from("parent_requests")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (requestError) {
        console.error("Parent request fetch error:", requestError);
      } else {
        setParentRequest(request);
      }

      // Fetch conversations for this parent
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select(`
          id,
          subject,
          status,
          created_at,
          messages (
            id,
            content,
            sender_type,
            created_at,
            read_at
          )
        `)
        .eq("parent_email", user.email)
        .order("updated_at", { ascending: false });

      if (convError) {
        console.error("Conversations fetch error:", convError);
      } else {
        setConversations(convData || []);
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

  const getUnreadCount = (messages: Message[]) => {
    return messages.filter(
      (m) => m.sender_type === "admin" && !m.read_at
    ).length;
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

          {/* Request Status Card */}
          <Card className="mb-8">
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
                  <p className="text-muted-foreground mb-4">
                    You don't have an active support request yet.
                  </p>
                  <Button
                    onClick={() => navigate("/find-caregiver")}
                    style={{ backgroundColor: "#E2725B" }}
                  >
                    Find a Caregiver
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: "#E2725B" }} />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No messages yet. We'll notify you when we have updates about your request.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversations.map((conv) => {
                    const unreadCount = getUnreadCount(conv.messages);
                    const latestMessage = conv.messages[conv.messages.length - 1];

                    return (
                      <div
                        key={conv.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {conv.subject || "Birth Rebel Team"}
                            </span>
                            {unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {unreadCount} new
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(conv.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        {latestMessage && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {latestMessage.content}
                          </p>
                        )}
                      </div>
                    );
                  })}
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
