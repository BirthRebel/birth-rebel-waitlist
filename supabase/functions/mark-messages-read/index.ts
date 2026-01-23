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
    const { match_id, reader_type, reader_email } = await req.json();

    if (!match_id || !reader_type || !reader_email) {
      return new Response(
        JSON.stringify({ error: "match_id, reader_type, and reader_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify match exists and get conversation
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, parent_email, caregiver_id")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the conversation for this match
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("parent_email", match.parent_email)
      .eq("caregiver_id", match.caregiver_id)
      .maybeSingle();

    if (!conversation) {
      // No conversation, nothing to mark as read
      return new Response(
        JSON.stringify({ success: true, marked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which sender types to mark as read (messages FROM others)
    // If reader is parent, mark caregiver and admin messages as read
    // If reader is caregiver, mark parent messages as read (caregivers don't see admin messages)
    const senderTypesToMark = reader_type === "parent" 
      ? ["caregiver", "admin"] 
      : ["parent"];

    // Mark messages as read where read_at is null
    const { data: updated, error: updateError } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .in("sender_type", senderTypesToMark)
      .is("read_at", null)
      .select("id");

    if (updateError) {
      console.error("Error marking messages as read:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, marked: updated?.length || 0 }),
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