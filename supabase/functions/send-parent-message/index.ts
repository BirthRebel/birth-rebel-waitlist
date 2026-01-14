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
    const { conversation_id, parent_email, content, access_token } = await req.json();

    if (!conversation_id || !parent_email || !content) {
      return new Response(
        JSON.stringify({ error: "conversation_id, parent_email, and content are required" }),
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
        if (authenticatedEmail.toLowerCase() === parent_email.toLowerCase()) {
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

    // Verify the conversation belongs to this parent
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .eq("parent_email", parent_email.toLowerCase())
      .maybeSingle();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        content,
        sender_type: "parent",
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting message:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({ success: true, message }),
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
