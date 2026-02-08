import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle, Clock, XCircle, FileText } from "lucide-react";

interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Quote {
  id: string;
  items: QuoteItem[];
  total_amount: number;
  platform_fee: number;
  caregiver_payout: number;
  status: string;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
  caregivers: {
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
    bio: string | null;
  };
}

const QuoteView = () => {
  const { quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("cancelled") === "true") {
      toast({
        title: "Payment cancelled",
        description: "You can try again when you're ready.",
      });
    }
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    if (!quoteId) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-quote", {
        body: null,
        headers: {},
        method: "GET",
      });

      // Use query params approach since GET with body doesn't work well
      const response = await fetch(
        `https://zjbzjtljoxwreyhlrjbq.supabase.co/functions/v1/get-quote?quote_id=${quoteId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setQuote(result.quote);
    } catch (err: any) {
      console.error("Error fetching quote:", err);
      toast({
        title: "Quote not found",
        description: "This quote may have expired or been removed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!quote) return;

    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("pay-quote", {
        body: { quote_id: quote.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Error initiating payment:", err);
      toast({
        title: "Payment failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" /> Awaiting Payment</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Processing</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
      case "expired":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32 px-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
              <p className="text-muted-foreground">This quote may have expired or been removed.</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date();
  const canPay = (quote.status === "sent" || quote.status === "accepted") && !isExpired;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={quote.caregivers.profile_photo_url || undefined} />
                    <AvatarFallback>
                      {quote.caregivers.first_name?.[0]}{quote.caregivers.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Quote from {quote.caregivers.first_name} {quote.caregivers.last_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Created {new Date(quote.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(quote.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Caregiver Bio */}
              {quote.caregivers.bio && (
                <p className="text-sm text-muted-foreground italic">"{quote.caregivers.bio}"</p>
              )}

              {/* Line Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-medium">Service</th>
                      <th className="text-center px-4 py-2 text-sm font-medium w-20">Qty</th>
                      <th className="text-right px-4 py-2 text-sm font-medium w-28">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-3 text-sm">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          £{((item.unit_price * item.quantity) / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr className="border-t-2">
                      <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Total</td>
                      <td className="px-4 py-3 text-right font-semibold text-lg">
                        £{(quote.total_amount / 100).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {quote.notes && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">Note from your caregiver:</p>
                  <p className="text-sm text-muted-foreground">{quote.notes}</p>
                </div>
              )}

              {/* Expiry Warning */}
              {quote.expires_at && !isExpired && quote.status === "sent" && (
                <p className="text-sm text-muted-foreground text-center">
                  This quote expires on {new Date(quote.expires_at).toLocaleDateString()}
                </p>
              )}

              {isExpired && quote.status === "sent" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-700 font-medium">This quote has expired</p>
                  <p className="text-sm text-red-600 mt-1">Please contact your caregiver for a new quote.</p>
                </div>
              )}
            </CardContent>
            {canPay && (
              <CardFooter>
                <Button 
                  onClick={handlePay} 
                  disabled={paying} 
                  className="w-full" 
                  size="lg"
                >
                  {paying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Pay £{(quote.total_amount / 100).toFixed(2)}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuoteView;
