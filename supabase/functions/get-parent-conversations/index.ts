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
    const { parent_email, access_token } = await req.json();

    if (!parent_email) {
      return new Response(
        JSON.stringify({ error: "parent_email is required" }),
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
        // Verify the authenticated user's email matches the requested email
        if (authenticatedEmail.toLowerCase() === parent_email.toLowerCase()) {
          isAuthenticated = true;
        }
      }
    }

    // If not authenticated via JWT, require access_token
    if (!isAuthenticated) {
      if (!access_token) {
        return new Response(
          JSON.stringify({ error: "Authentication required - provide access_token or log in" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Verify the access token
      const { data: parentRequest, error: authError } = await supabase
        .from("parent_requests")
        .select("id, email")
        .eq("email", parent_email.toLowerCase())
        .eq("access_token", access_token)
        .maybeSingle();

      if (authError || !parentRequest) {
        console.error("Token verification failed:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // User is authenticated - proceed with the query
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, subject, status, created_at, updated_at")
      .eq("parent_email", parent_email.toLowerCase())
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ conversations: conversations || [] }),
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
