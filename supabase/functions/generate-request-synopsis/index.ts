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
    const body = await req.json();
    
    // Support both { request: {...} } and { requestId: "..." }
    let request = body.request;
    
    if (!request && body.requestId) {
      // Fetch the request from database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from("parent_requests")
        .select("*")
        .eq("id", body.requestId)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Parent request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      request = data;
    }
    
    if (!request) {
      return new Response(
        JSON.stringify({ error: "Request data or requestId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a comprehensive context from all available fields
    const contextParts: string[] = [];
    
    if (request.first_name) {
      contextParts.push(`Parent's name: ${request.first_name}${request.last_name ? ` ${request.last_name}` : ''}`);
    }
    if (request.stage_of_journey) {
      contextParts.push(`Stage of journey: ${request.stage_of_journey}`);
    }
    if (request.family_context) {
      contextParts.push(`Family context: ${request.family_context}`);
    }
    if (request.support_type) {
      contextParts.push(`Support type / Full conversation: ${request.support_type}`);
    }
    if (request.caregiver_preferences) {
      contextParts.push(`Caregiver preferences: ${request.caregiver_preferences}`);
    }
    if (request.specific_concerns) {
      contextParts.push(`Specific concerns: ${request.specific_concerns}`);
    }
    if (request.shared_identity_requests) {
      contextParts.push(`Identity/cultural preferences: ${request.shared_identity_requests}`);
    }
    if (request.general_availability) {
      contextParts.push(`Availability: ${request.general_availability}`);
    }
    if (request.budget) {
      contextParts.push(`Budget: ${request.budget}`);
    }
    if (request.location) {
      contextParts.push(`Location: ${request.location}`);
    }
    if (request.language) {
      contextParts.push(`Language: ${request.language}`);
    }
    if (request.due_date) {
      contextParts.push(`Due date: ${request.due_date}`);
    }

    const parentContext = contextParts.join("\n\n");

    const systemPrompt = `You are a helpful assistant for Birth Rebel, a platform that matches parents with birth caregivers (doulas, midwives, lactation consultants, etc.).

Your task is to create a warm, professional synopsis of a parent's support request. Write in third person about the parent, as if briefing a caregiver.

CRITICAL RULES:
- NEVER use placeholders like [Number], [Location], or [Partner/Family] - only include information that is actually provided
- NEVER ask for more information or say data is missing - work with what you have
- NEVER include template structures or brackets of any kind
- If information is missing, simply don't mention that aspect

Guidelines:
- Write 3-5 sentences based ONLY on the information provided
- Start with their name and whatever journey stage information is available
- Include family context if provided
- Describe support needs if mentioned
- Note practical details like availability if included
- Use warm, professional language
- If the data contains chat transcripts or form artifacts, extract the meaningful answers and ignore the questions
- Always produce a usable synopsis even with minimal data - focus on what IS known`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please create a synopsis for this parent request:\n\n${parentContext}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const synopsis = data.choices?.[0]?.message?.content || "Unable to generate synopsis.";

    return new Response(
      JSON.stringify({ synopsis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating synopsis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
