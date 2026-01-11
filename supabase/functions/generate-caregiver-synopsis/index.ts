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
    const { caregiverId } = await req.json();

    if (!caregiverId) {
      return new Response(
        JSON.stringify({ error: "caregiverId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch caregiver details
    const { data: caregiver, error: caregiverError } = await supabase
      .from("caregivers")
      .select("*")
      .eq("id", caregiverId)
      .single();

    if (caregiverError || !caregiver) {
      console.error("Error fetching caregiver:", caregiverError);
      return new Response(
        JSON.stringify({ error: "Caregiver not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build caregiver profile data for the AI (excluding contact info)
    const caregiverProfile = {
      firstName: caregiver.first_name,
      yearsExperience: caregiver.years_practicing,
      birthsSupported: caregiver.births_supported,
      location: caregiver.city_town,
      certifications: caregiver.certifications_training,
      careStyle: caregiver.care_style,
      roles: {
        isDoula: caregiver.is_doula,
        isPrivateMidwife: caregiver.is_private_midwife,
        isLactationConsultant: caregiver.is_lactation_consultant,
        isSleepConsultant: caregiver.is_sleep_consultant,
        isHypnobirthingCoach: caregiver.is_hypnobirthing_coach,
        isBereavementCounsellor: caregiver.is_bereavement_councillor,
      },
      services: {
        birthPlanning: caregiver.offers_birth_planning,
        postnatalSupport: caregiver.offers_postnatal_support,
        activeLabourSupport: caregiver.offers_active_labour_support,
        fertilityConception: caregiver.offers_fertility_conception,
        nutritionSupport: caregiver.offers_nutrition_support,
        lactationSupport: caregiver.offers_lactation_support,
        newbornSleepSupport: caregiver.offers_newborn_sleep_support,
        hypnobirthing: caregiver.offers_hypnobirthing,
        lossBereavement: caregiver.offers_loss_bereavement_care,
      },
      specialisations: {
        homeBirths: caregiver.supports_home_births,
        waterBirths: caregiver.supports_water_births,
        caesareans: caregiver.supports_caesareans,
        multiples: caregiver.supports_multiples,
        complexHealth: caregiver.supports_complex_health,
        soloParents: caregiver.supports_solo_parents,
        queerTrans: caregiver.supports_queer_trans,
        disabledParents: caregiver.supports_disabled_parents,
        neurodivergent: caregiver.supports_neurodivergent,
        traumaSurvivors: caregiver.supports_trauma_survivors,
        bereavement: caregiver.supports_bereavement,
        familiesOfColour: caregiver.supports_families_of_colour,
        immigrantRefugee: caregiver.supports_immigrant_refugee,
      },
      languages: {
        english: caregiver.speaks_english,
        french: caregiver.speaks_french,
        german: caregiver.speaks_german,
        spanish: caregiver.speaks_spanish,
        italian: caregiver.speaks_italian,
        punjabi: caregiver.speaks_punjabi,
        urdu: caregiver.speaks_urdu,
        arabic: caregiver.speaks_arabic,
        bengali: caregiver.speaks_bengali,
        gujrati: caregiver.speaks_gujrati,
        portuguese: caregiver.speaks_portuguese,
        mandarin: caregiver.speaks_mandarin,
        other: caregiver.language_other,
      },
    };

    const systemPrompt = `You are a helpful assistant for Birth Rebel, a platform that matches parents with birth caregivers.

Your task is to create a warm, professional synopsis about a caregiver for a parent to read. This helps the parent understand who their potential caregiver is.

CRITICAL RULES:
- Use ONLY the caregiver's first name - never include last name
- NEVER include any contact information (no email, phone, address)
- NEVER use placeholders or brackets
- Write in a warm, reassuring tone that helps parents feel confident about this match
- Only mention information that is actually provided

Guidelines:
- Write 3-5 sentences introducing the caregiver
- Start with their first name and main role(s)
- Mention their experience level if available
- Highlight 2-3 key services or specialisations they offer
- Mention languages spoken if relevant
- Keep it personal and warm, not like a formal CV
- End on a positive note about what they can offer`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Please create a synopsis for this caregiver to show to a parent:\n\n${JSON.stringify(caregiverProfile, null, 2)}` 
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const synopsis = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!synopsis) {
      throw new Error("Failed to generate synopsis");
    }

    console.log("Generated caregiver synopsis:", synopsis);

    return new Response(
      JSON.stringify({ synopsis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-caregiver-synopsis:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});