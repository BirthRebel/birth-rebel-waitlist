import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, access_token } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Try JWT auth first (for logged-in users)
    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;
    let authenticatedEmail: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

      if (!claimsError && claimsData?.claims?.email) {
        authenticatedEmail = claimsData.claims.email as string;
        if (authenticatedEmail.toLowerCase() === email.toLowerCase()) {
          isAuthenticated = true;
        }
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If authenticated via JWT, fetch by email only
    if (isAuthenticated) {
      const { data: request, error } = await supabase
        .from("parent_requests")
        .select("id, first_name, last_name, email, support_type, due_date, location, status, created_at, matched_caregiver_id, phone, caregiver_preferences, language, preferred_communication, budget, general_availability, special_requirements, specific_concerns, stage_of_journey, family_context, shared_identity_requests, updated_at")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Error fetching parent request:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ request }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If not authenticated via JWT, require access_token
    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "Authentication required - provide access_token or log in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch with token verification
    const { data: request, error } = await supabase
      .from("parent_requests")
      .select("id, first_name, last_name, email, support_type, due_date, location, status, created_at, matched_caregiver_id, phone, caregiver_preferences, language, preferred_communication, budget, general_availability, special_requirements, specific_concerns, stage_of_journey, family_context, shared_identity_requests, updated_at")
      .eq("email", email.toLowerCase())
      .eq("access_token", access_token)
      .maybeSingle();

    if (error) {
      console.error("Error fetching parent request:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!request) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ request }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
