import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request } = await req.json();
    
    if (!request) {
      return new Response(
        JSON.stringify({ error: "Request data is required" }),
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

Your task is to create a clear, warm synopsis of a parent's support request. Write in third person about the parent, as if briefing a caregiver.

Guidelines:
- Write 2-4 sentences maximum
- Start with their name and what stage of their journey they're at
- Highlight the most important details: type of support needed, family situation, any specific preferences or concerns
- Use warm, professional language
- If data seems incomplete or contains form artifacts, extract the meaningful information and ignore the noise
- Focus on what a caregiver would need to know at a glance`;

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
