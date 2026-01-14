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
    const { match_id, sender_email, sender_type } = await req.json();

    if (!match_id || !sender_email || !sender_type) {
      return new Response(
        JSON.stringify({ error: "match_id, sender_email, and sender_type are required" }),
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
      .select("id, status, parent_email, caregiver_id, meeting_link")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      console.error("Match not found:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify sender is part of this match
    if (sender_type === "parent") {
      if (match.parent_email.toLowerCase() !== sender_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (sender_type === "caregiver") {
      const { data: caregiver } = await supabase
        .from("caregivers")
        .select("id, email")
        .eq("id", match.caregiver_id)
        .single();

      if (!caregiver || caregiver.email.toLowerCase() !== sender_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get or create conversation for this match
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("parent_email", match.parent_email)
      .eq("caregiver_id", match.caregiver_id)
      .maybeSingle();

    if (!conversation) {
      // No conversation yet
      return new Response(
        JSON.stringify({ 
          messages: [], 
          meeting_link: match.meeting_link,
          can_message: ["booked", "approved"].includes(match.status)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch messages - filter out admin messages for caregivers
    // Caregivers should only see caregiver and parent messages, not admin messages
    let messagesQuery = supabase
      .from("messages")
      .select("id, content, sender_type, created_at, read_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    // If sender is a caregiver, exclude admin messages
    if (sender_type === "caregiver") {
      messagesQuery = messagesQuery.in("sender_type", ["caregiver", "parent"]);
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return new Response(
        JSON.stringify({ error: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        messages: messages || [], 
        meeting_link: match.meeting_link,
        can_message: ["booked", "approved"].includes(match.status)
      }),
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
