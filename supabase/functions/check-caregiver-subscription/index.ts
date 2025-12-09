import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails } = await req.json();
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ subscriptions: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking subscription status for emails:", emails);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const subscriptions: Record<string, { subscribed: boolean; subscription_end?: string }> = {};

    // Check each email for active subscriptions
    for (const email of emails) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        
        if (customers.data.length === 0) {
          subscriptions[email] = { subscribed: false };
          continue;
        }

        const customerId = customers.data[0].id;
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subs.data.length > 0) {
          const sub = subs.data[0];
          subscriptions[email] = {
            subscribed: true,
            subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
          };
        } else {
          subscriptions[email] = { subscribed: false };
        }
      } catch (err) {
        console.error(`Error checking subscription for ${email}:`, err);
        subscriptions[email] = { subscribed: false };
      }
    }

    console.log("Subscription results:", subscriptions);

    return new Response(
      JSON.stringify({ subscriptions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking caregiver subscriptions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
