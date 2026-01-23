import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-QUOTE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Get caregiver ID - now RLS will work properly with the auth context
    const { data: caregiver, error: caregiverError } = await supabaseClient
      .from("caregivers")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userData.user.id)
      .single();

    if (caregiverError || !caregiver) {
      throw new Error("Caregiver not found");
    }

    if (!caregiver.stripe_onboarding_complete) {
      throw new Error("Please complete your Stripe account setup before sending quotes");
    }

    logStep("Found caregiver", { caregiverId: caregiver.id });

    const { match_id, parent_email, items, total_amount, notes } = await req.json();

    if (!match_id || !parent_email || !items || !total_amount) {
      throw new Error("Missing required fields");
    }

    if (total_amount < 100) {
      throw new Error("Quote total must be at least £1");
    }

    // Verify the match belongs to this caregiver
    const { data: match, error: matchError } = await supabaseClient
      .from("matches")
      .select("id")
      .eq("id", match_id)
      .eq("caregiver_id", caregiver.id)
      .single();

    if (matchError || !match) {
      throw new Error("Match not found or doesn't belong to you");
    }

    logStep("Match verified", { matchId: match_id });

    // Create the quote using service role to bypass RLS for insert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .insert({
        match_id,
        caregiver_id: caregiver.id,
        parent_email,
        items,
        total_amount,
        notes,
        status: "sent",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (quoteError) {
      logStep("Error creating quote", { error: quoteError });
      throw new Error("Failed to create quote");
    }

    logStep("Quote created", { quoteId: quote.id });

    // Create admin notification
    await supabaseAdmin.from("admin_notifications").insert({
      type: "quote_sent",
      title: "New Quote Sent",
      message: `Caregiver sent a quote for £${(total_amount / 100).toFixed(2)} to ${parent_email}`,
      parent_email,
      match_id,
    });

    // TODO: Send email notification to parent with payment link

    return new Response(
      JSON.stringify({ success: true, quote }),
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
