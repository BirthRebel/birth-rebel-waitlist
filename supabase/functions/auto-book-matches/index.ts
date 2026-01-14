import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-BOOK-MATCHES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { caregiver_email } = await req.json();
    if (!caregiver_email) {
      throw new Error("caregiver_email is required");
    }
    logStep("Checking for caregiver", { email: caregiver_email });

    // Step 1: Check if caregiver has active Stripe subscription
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: caregiver_email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({ success: false, message: "No subscription found", booked_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      return new Response(
        JSON.stringify({ success: false, message: "No active subscription", booked_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Active subscription confirmed", { subscriptionId: subscriptions.data[0].id });

    // Step 2: Get caregiver ID from email
    const { data: caregiver, error: caregiverError } = await supabaseAdmin
      .from("caregivers")
      .select("id")
      .eq("email", caregiver_email)
      .maybeSingle();

    if (caregiverError || !caregiver) {
      logStep("Caregiver not found", { error: caregiverError });
      throw new Error("Caregiver not found");
    }

    logStep("Found caregiver", { caregiverId: caregiver.id });

    // Step 3: Find all "matched" status matches for this caregiver
    const { data: pendingMatches, error: matchError } = await supabaseAdmin
      .from("matches")
      .select("id, parent_first_name, parent_email")
      .eq("caregiver_id", caregiver.id)
      .eq("status", "matched");

    if (matchError) {
      logStep("Error fetching matches", { error: matchError });
      throw new Error("Failed to fetch pending matches");
    }

    if (!pendingMatches || pendingMatches.length === 0) {
      logStep("No pending matches to book");
      return new Response(
        JSON.stringify({ success: true, message: "No pending matches to book", booked_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found pending matches", { count: pendingMatches.length });

    // Step 4: Update all pending matches to "booked"
    const matchIds = pendingMatches.map(m => m.id);
    const { error: updateError } = await supabaseAdmin
      .from("matches")
      .update({ status: "booked" })
      .in("id", matchIds);

    if (updateError) {
      logStep("Error updating matches", { error: updateError });
      throw new Error("Failed to book matches");
    }

    logStep("Successfully booked matches", { matchIds });

    // Step 5: Create admin notification for each booked match
    const notifications = pendingMatches.map(match => ({
      type: "match_auto_booked",
      title: "Match Auto-Booked",
      message: `${caregiver_email} completed subscription - match with ${match.parent_first_name} is now booked`,
      parent_email: match.parent_email,
      match_id: match.id,
    }));

    await supabaseAdmin.from("admin_notifications").insert(notifications);
    logStep("Created admin notifications");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully booked ${pendingMatches.length} match(es)`,
        booked_count: pendingMatches.length,
        booked_matches: matchIds
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message, success: false, booked_count: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
