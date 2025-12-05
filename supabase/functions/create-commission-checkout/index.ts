import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("create-commission-checkout called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const { commission_id } = await req.json();
    console.log("Commission ID:", commission_id);

    if (!commission_id) {
      throw new Error("Missing commission_id");
    }

    // Use service role to fetch commission data (bypasses RLS for reading)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get commission details
    const { data: commission, error: commissionError } = await supabaseAdmin
      .from("commissions")
      .select("*, caregivers!inner(user_id, email)")
      .eq("id", commission_id)
      .single();

    if (commissionError || !commission) {
      console.error("Commission fetch error:", commissionError);
      throw new Error("Commission not found");
    }

    // Verify the commission belongs to the authenticated user
    if (commission.caregivers.user_id !== userData.user.id) {
      throw new Error("Unauthorized access to this commission");
    }

    if (commission.commission_paid) {
      throw new Error("Commission already paid");
    }

    console.log("Commission amount:", commission.commission_amount);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Convert amount to pence (GBP)
    const amountInPence = Math.round(commission.commission_amount * 100);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: commission.caregivers.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Birth Rebel commission payment",
            },
            unit_amount: amountInPence,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/caregiver/matches?payment=success`,
      cancel_url: `${req.headers.get("origin")}/caregiver/matches?payment=cancelled`,
      metadata: {
        commission_id: commission_id,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});