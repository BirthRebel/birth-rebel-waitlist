import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const VONAGE_API_KEY = Deno.env.get("VONAGE_API_KEY");
const VONAGE_API_SECRET = Deno.env.get("VONAGE_API_SECRET");
const VONAGE_FROM_NUMBER = Deno.env.get("VONAGE_FROM_NUMBER");
const ADMIN_PHONE_NUMBER = Deno.env.get("ADMIN_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchResponseRequest {
  matchId: string;
  action: "approve" | "decline";
  declineReason?: string;
  parentEmail: string;
  accessToken?: string;
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!VONAGE_API_KEY || !VONAGE_API_SECRET || !VONAGE_FROM_NUMBER) {
    console.log("Vonage credentials not configured, skipping SMS");
    return false;
  }

  let cleanedPhone = to.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (!cleanedPhone.startsWith("+")) {
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "+44" + cleanedPhone.substring(1);
    } else {
      cleanedPhone = "+" + cleanedPhone;
    }
  }

  try {
    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: VONAGE_API_KEY,
        api_secret: VONAGE_API_SECRET,
        from: VONAGE_FROM_NUMBER,
        to: cleanedPhone,
        text: message,
      }),
    });

    const result = await response.json();
    console.log("Vonage SMS response:", result);

    if (result.messages && result.messages[0]?.status === "0") {
      console.log(`SMS sent successfully to ${cleanedPhone}`);
      return true;
    } else {
      console.error("SMS sending failed:", result.messages?.[0]?.["error-text"]);
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { matchId, action, declineReason, parentEmail, accessToken }: MatchResponseRequest = await req.json();

    if (!matchId || !action || !parentEmail) {
      return new Response(
        JSON.stringify({ error: "matchId, action, and parentEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "decline" && !declineReason) {
      return new Response(
        JSON.stringify({ error: "declineReason is required when declining" }),
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
        if (authenticatedEmail.toLowerCase() === parentEmail.toLowerCase()) {
          isAuthenticated = true;
        }
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If not authenticated via JWT, require accessToken
    if (!isAuthenticated) {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "Authentication required - provide accessToken or log in" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the access token
      const { data: parentRequest, error: authError } = await supabase
        .from("parent_requests")
        .select("id, email")
        .eq("email", parentEmail.toLowerCase())
        .eq("access_token", accessToken)
        .maybeSingle();

      if (authError || !parentRequest) {
        console.error("Token verification failed:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch the match with caregiver details
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        *,
        caregivers:caregiver_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      console.error("Match fetch error:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify this match belongs to the requesting parent
    if (match.parent_email.toLowerCase() !== parentEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newStatus = action === "approve" ? "approved" : "declined";

    // Update match status
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status: newStatus,
        decline_reason: action === "decline" ? declineReason : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (updateError) {
      console.error("Match update error:", updateError);
      throw updateError;
    }

    const caregiver = match.caregivers as { first_name: string | null; last_name: string | null; email: string } | null;
    const caregiverName = caregiver?.first_name || "the caregiver";

    // Create admin notification
    const notificationTitle = action === "approve" 
      ? `✅ Match Approved by ${match.parent_first_name}`
      : `❌ Match Declined by ${match.parent_first_name}`;

    const notificationMessage = action === "approve"
      ? `${match.parent_first_name} has approved their match with ${caregiverName} for ${match.support_type} support.`
      : `${match.parent_first_name} has declined their match with ${caregiverName}. Reason: ${declineReason}`;

    const { error: notifError } = await supabase
      .from("admin_notifications")
      .insert({
        type: action === "approve" ? "match_approved" : "match_declined",
        title: notificationTitle,
        message: notificationMessage,
        match_id: matchId,
        parent_email: parentEmail,
      });

    if (notifError) {
      console.error("Notification insert error:", notifError);
    }

    // Send SMS to admin
    if (ADMIN_PHONE_NUMBER) {
      const smsMessage = action === "approve"
        ? `Birth Rebel: ${match.parent_first_name} APPROVED match with ${caregiverName} (${match.support_type})`
        : `Birth Rebel: ${match.parent_first_name} DECLINED match with ${caregiverName}. Reason: ${declineReason?.substring(0, 80)}`;

      await sendSMS(ADMIN_PHONE_NUMBER, smsMessage);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newStatus,
        message: action === "approve" 
          ? "Match approved! We'll connect you with your caregiver soon."
          : "Match declined. We'll find you a better match."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parent-match-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
