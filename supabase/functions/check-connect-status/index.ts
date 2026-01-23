import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CONNECT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Use service role to bypass RLS for querying caregiver data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Also create a client with the user's token to verify auth
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth failed", { error: userError?.message });
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Get caregiver record using service role to bypass RLS
    const { data: caregiver, error: caregiverError } = await supabaseAdmin
      .from("caregivers")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userData.user.id)
      .single();

    if (caregiverError) {
      logStep("Caregiver query error", { error: caregiverError.message });
      throw new Error("Caregiver not found");
    }

    if (!caregiver) {
      logStep("No caregiver record found for user");
      throw new Error("Caregiver not found");
    }

    logStep("Found caregiver", { caregiverId: caregiver.id, stripeAccountId: caregiver.stripe_account_id });

    if (!caregiver.stripe_account_id) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          onboardingComplete: false,
          payoutsEnabled: false,
          chargesEnabled: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(caregiver.stripe_account_id);
    logStep("Retrieved Stripe account", { 
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });

    const isComplete = account.charges_enabled && account.payouts_enabled;

    // Update database if status changed
    if (isComplete && !caregiver.stripe_onboarding_complete) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseAdmin
        .from("caregivers")
        .update({ stripe_onboarding_complete: true })
        .eq("id", caregiver.id);

      logStep("Updated onboarding status to complete");
    }

    return new Response(
      JSON.stringify({ 
        connected: true,
        onboardingComplete: isComplete,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        accountId: caregiver.stripe_account_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
