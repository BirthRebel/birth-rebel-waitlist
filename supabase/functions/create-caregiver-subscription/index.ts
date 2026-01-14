import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Test price: £1/month (change back to price_1ScZg23ga4Czi574xacMfjl7 for production £25/month)
const CAREGIVER_SUBSCRIPTION_PRICE_ID = "price_1SpXA23ga4Czi574gkmXMlkO";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caregiver_email, caregiver_name } = await req.json();
    
    if (!caregiver_email) {
      throw new Error("Caregiver email is required");
    }

    console.log("Creating subscription checkout for:", caregiver_email);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer already exists for this caregiver
    const customers = await stripe.customers.list({ 
      email: caregiver_email, 
      limit: 1 
    });
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    }

    // Always use the published domain for redirects
    const origin = "https://birth-rebel-waitlist.lovable.app";

    // Create a checkout session for the subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : caregiver_email,
      line_items: [
        {
          price: CAREGIVER_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/caregiver/matches?subscription=success`,
      cancel_url: `${origin}/caregiver/matches?subscription=cancelled`,
      metadata: {
        caregiver_email,
        caregiver_name: caregiver_name || "",
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating subscription checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
