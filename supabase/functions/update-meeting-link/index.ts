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
    const { match_id, meeting_link, caregiver_email } = await req.json();

    if (!match_id || !caregiver_email) {
      return new Response(
        JSON.stringify({ error: "match_id and caregiver_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify match exists
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, caregiver_id, status")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      console.error("Match not found:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caregiver is part of this match
    const { data: caregiver } = await supabase
      .from("caregivers")
      .select("id, email")
      .eq("id", match.caregiver_id)
      .single();

    if (!caregiver || caregiver.email.toLowerCase() !== caregiver_email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "You are not authorized to update this match" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract a valid URL from the input (user may paste full calendar text)
    let cleanedLink = meeting_link || null;
    if (cleanedLink) {
      // Find the first valid meeting/calendar URL in the text
      const urlMatch = cleanedLink.match(/(https?:\/\/(?:meet\.google\.com|calendar\.app\.google|zoom\.us|teams\.microsoft\.com)[^\s]*)/i);
      if (urlMatch) {
        cleanedLink = urlMatch[1];
      } else {
        // Fallback: extract any URL
        const anyUrlMatch = cleanedLink.match(/(https?:\/\/[^\s]+)/);
        if (anyUrlMatch) {
          cleanedLink = anyUrlMatch[1];
        }
      }
    }

    // Update meeting link
    const { error: updateError } = await supabase
      .from("matches")
      .update({ meeting_link: cleanedLink })
      .eq("id", match_id);

    if (updateError) {
      console.error("Error updating meeting link:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, meeting_link }),
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
