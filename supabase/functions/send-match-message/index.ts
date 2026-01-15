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
    const { match_id, sender_type, content, sender_email } = await req.json();

    if (!match_id || !sender_type || !content || !sender_email) {
      return new Response(
        JSON.stringify({ error: "match_id, sender_type, content, and sender_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["caregiver", "parent"].includes(sender_type)) {
      return new Response(
        JSON.stringify({ error: "sender_type must be 'caregiver' or 'parent'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify match exists and is in a status that allows messaging (booked)
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, status, parent_email, parent_first_name, caregiver_id")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      console.error("Match not found:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow messaging for booked or approved matches
    if (!["booked", "approved"].includes(match.status)) {
      return new Response(
        JSON.stringify({ error: "Messaging is only available for confirmed matches" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caregiver details for authorization and notifications
    const { data: caregiver } = await supabase
      .from("caregivers")
      .select("id, email, first_name")
      .eq("id", match.caregiver_id)
      .single();

    // Verify sender is part of this match
    if (sender_type === "parent") {
      if (match.parent_email.toLowerCase() !== sender_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "You are not authorized to send messages in this match" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (sender_type === "caregiver") {
      if (!caregiver || caregiver.email.toLowerCase() !== sender_email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "You are not authorized to send messages in this match" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if a conversation exists for this match, if not create one
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("parent_email", match.parent_email)
      .eq("caregiver_id", match.caregiver_id)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create a new conversation for this match
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          parent_email: match.parent_email,
          caregiver_id: match.caregiver_id,
          subject: "Match Conversation",
          status: "open",
        })
        .select("id")
        .single();

      if (convError || !newConv) {
        console.error("Error creating conversation:", convError);
        return new Response(
          JSON.stringify({ error: "Failed to create conversation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversationId = newConv.id;
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content,
        sender_type,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      return new Response(
        JSON.stringify({ error: messageError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Send notification to the recipient
    // If caregiver sent, notify parent; if parent sent, notify caregiver
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      
      if (sender_type === "caregiver") {
        // Caregiver sent message, notify parent
        const caregiverName = caregiver?.first_name || "Your caregiver";
        await fetch(`${supabaseUrl}/functions/v1/send-parent-message-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            parentEmail: match.parent_email,
            parentName: match.parent_first_name || "there",
            messageContent: `New message from ${caregiverName}: ${content}`,
          }),
        });
        console.log("Parent notification triggered for caregiver message");
      } else if (sender_type === "parent") {
        // Parent sent message, notify caregiver
        if (caregiver?.email) {
          await fetch(`${supabaseUrl}/functions/v1/send-message-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              conversationId: conversationId,
              messageContent: content,
              senderType: "admin", // Use admin sender type to trigger caregiver notification
              notificationType: "message",
            }),
          });
          console.log("Caregiver notification triggered for parent message");
        }
      }
    } catch (notifyError) {
      // Don't fail the message send if notification fails
      console.error("Failed to send notification:", notifyError);
    }

    return new Response(
      JSON.stringify({ message, conversation_id: conversationId }),
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
