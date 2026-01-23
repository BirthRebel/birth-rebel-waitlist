import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { email, access_token } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // If not authenticated via JWT, require access_token
    if (!isAuthenticated) {
      if (!access_token) {
        return new Response(
          JSON.stringify({ error: "Authentication required - provide access_token or log in" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the access token
      const { data: parentRequest, error: authError } = await supabase
        .from("parent_requests")
        .select("id, email")
        .eq("email", email.toLowerCase())
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

    // Fetch all matches for this parent email with caregiver details
    const { data: matches, error } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        support_type,
        created_at,
        caregiver_synopsis,
        decline_reason,
        reviewed_at,
        meeting_link,
        caregiver_id,
        caregivers (
          id,
          first_name,
          last_name,
          profile_photo_url,
          is_doula,
          is_private_midwife,
          is_lactation_consultant,
          is_sleep_consultant,
          is_hypnobirthing_coach,
          is_bereavement_councillor
        )
      `)
      .ilike("parent_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      throw error;
    }

    // Fetch quotes for each match
    const matchIds = matches?.map(m => m.id) || [];
    let quotesMap: Record<string, any> = {};
    
    if (matchIds.length > 0) {
      const { data: quotes, error: quotesError } = await supabase
        .from("quotes")
        .select("id, match_id, status, total_amount, items, notes, created_at")
        .in("match_id", matchIds);
      
      if (!quotesError && quotes) {
        // Map quotes by match_id (get the latest quote per match)
        quotes.forEach(quote => {
          if (!quotesMap[quote.match_id] || new Date(quote.created_at) > new Date(quotesMap[quote.match_id].created_at)) {
            quotesMap[quote.match_id] = quote;
          }
        });
      }
    }

    // Attach quotes to matches
    const matchesWithQuotes = matches?.map(match => ({
      ...match,
      quote: quotesMap[match.id] || null
    })) || [];

    return new Response(
      JSON.stringify({ matches: matchesWithQuotes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-parent-matches:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
