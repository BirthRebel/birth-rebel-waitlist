import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

interface ConnectStatus {
  connected: boolean;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  accountId?: string;
}

export const StripeConnectCard = () => {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  // Check for return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success") === "true") {
      toast({
        title: "Stripe account connected!",
        description: "Your payment account setup is complete.",
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      checkStatus();
    } else if (params.get("stripe_refresh") === "true") {
      toast({
        title: "Please complete setup",
        description: "Click the button below to continue setting up your payment account.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("check-connect-status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setStatus(data);
    } catch (err: any) {
      console.error("Error checking connect status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Error connecting:", err);
      toast({
        title: "Connection failed",
        description: err.message || "Failed to start Stripe setup",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isComplete = status?.onboardingComplete;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Account
          {isComplete && (
            <Badge variant="default" className="ml-2 bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isComplete 
            ? "You're all set to receive payments from parents"
            : "Connect your bank account to receive payments for your services"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isComplete ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>Your Stripe account is connected and ready to receive payments.</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open("https://dashboard.stripe.com/", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Stripe Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Payment setup required</p>
                <p className="text-amber-600 mt-1">
                  To receive payments from parents, you need to connect your bank account through Stripe.
                  This is a secure, one-time setup.
                </p>
              </div>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full sm:w-auto"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {status?.connected ? "Complete Stripe Setup" : "Connect Stripe Account"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
