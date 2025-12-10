import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user's JWT and get their ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the caregiver ID for this user
    const { data: caregiver, error: caregiverError } = await supabase
      .from("caregivers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (caregiverError || !caregiver) {
      console.error("Caregiver lookup error:", caregiverError);
      return new Response(JSON.stringify({ error: "Caregiver profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { match_id, booking_value } = await req.json();

    if (!match_id || booking_value === undefined) {
      return new Response(JSON.stringify({ error: "match_id and booking_value are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate booking_value is a positive number
    const bookingAmount = Number(booking_value);
    if (isNaN(bookingAmount) || bookingAmount <= 0) {
      return new Response(JSON.stringify({ error: "booking_value must be a positive number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the match belongs to this caregiver
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, caregiver_id, status")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      console.error("Match lookup error:", matchError);
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.caregiver_id !== caregiver.id) {
      console.log(`Caregiver ${caregiver.id} attempted to access match ${match_id} belonging to ${match.caregiver_id}`);
      return new Response(JSON.stringify({ error: "You don't have permission to update this match" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate commission (10%)
    const commissionRate = 0.10;
    const commissionAmount = bookingAmount * commissionRate;

    // Update match status to 'booked'
    const { error: updateError } = await supabase
      .from("matches")
      .update({ status: "booked" })
      .eq("id", match_id);

    if (updateError) {
      console.error("Match update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update match status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create commission record
    const { data: commission, error: commissionError } = await supabase
      .from("commissions")
      .insert({
        match_id: match_id,
        caregiver_id: caregiver.id,
        booking_value: bookingAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        commission_paid: false,
      })
      .select()
      .single();

    if (commissionError) {
      console.error("Commission insert error:", commissionError);
      // Rollback the match status update
      await supabase.from("matches").update({ status: "matched" }).eq("id", match_id);
      return new Response(JSON.stringify({ error: "Failed to create commission record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Caregiver ${caregiver.id} booked match ${match_id} with value ${bookingAmount}, commission: ${commissionAmount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      match_id,
      commission: commission
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in mark-as-booked:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
