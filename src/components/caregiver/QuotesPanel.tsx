import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface Quote {
  id: string;
  parent_email: string;
  total_amount: number;
  caregiver_payout: number;
  status: string;
  created_at: string;
  items: any[];
}

interface QuotesPanelProps {
  caregiverId: string;
}

export const QuotesPanel = ({ caregiverId }: QuotesPanelProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, [caregiverId]);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("caregiver_id", caregiverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes((data as Quote[]) || []);
    } catch (err) {
      console.error("Error fetching quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" /> Sent</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Processing</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
      case "expired":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No quotes sent yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create quotes from your match cards to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Quotes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quotes.map((quote) => (
            <div 
              key={quote.id} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{quote.parent_email}</p>
                  {getStatusBadge(quote.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(quote.created_at).toLocaleDateString()} · 
                  {quote.items.length} item{quote.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="font-semibold">£{(quote.total_amount / 100).toFixed(2)}</p>
                {quote.status === "paid" && (
                  <p className="text-xs text-green-600">
                    You earned £{(quote.caregiver_payout / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
