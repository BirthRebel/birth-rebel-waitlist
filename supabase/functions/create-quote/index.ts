import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VONAGE_API_KEY = Deno.env.get("VONAGE_API_KEY");
const VONAGE_API_SECRET = Deno.env.get("VONAGE_API_SECRET");
const VONAGE_FROM_NUMBER = Deno.env.get("VONAGE_FROM_NUMBER");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-QUOTE] ${step}${detailsStr}`);
};

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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: userData.user.id });

    const { data: caregiver, error: caregiverError } = await supabaseClient
      .from("caregivers")
      .select("id, first_name, last_name, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userData.user.id)
      .single();

    if (caregiverError || !caregiver) {
      throw new Error("Caregiver not found");
    }

    if (!caregiver.stripe_onboarding_complete) {
      throw new Error("Please complete your Stripe account setup before sending quotes");
    }

    logStep("Found caregiver", { caregiverId: caregiver.id });

    const { match_id, parent_email, items, total_amount, notes } = await req.json();

    if (!match_id || !parent_email || !items || !total_amount) {
      throw new Error("Missing required fields");
    }

    if (total_amount < 100) {
      throw new Error("Quote total must be at least £1");
    }

    // Verify the match belongs to this caregiver and get parent details
    const { data: match, error: matchError } = await supabaseClient
      .from("matches")
      .select("id, parent_first_name")
      .eq("id", match_id)
      .eq("caregiver_id", caregiver.id)
      .single();

    if (matchError || !match) {
      throw new Error("Match not found or doesn't belong to you");
    }

    logStep("Match verified", { matchId: match_id });

    // Create the quote using service role to bypass RLS for insert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .insert({
        match_id,
        caregiver_id: caregiver.id,
        parent_email,
        items,
        total_amount,
        notes,
        status: "sent",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (quoteError) {
      logStep("Error creating quote", { error: quoteError });
      throw new Error("Failed to create quote");
    }

    logStep("Quote created", { quoteId: quote.id });

    // Create admin notification
    await supabaseAdmin.from("admin_notifications").insert({
      type: "quote_sent",
      title: "New Quote Sent",
      message: `Caregiver sent a quote for £${(total_amount / 100).toFixed(2)} to ${parent_email}`,
      parent_email,
      match_id,
    });

    // Get parent phone number from parent_requests
    const { data: parentRequest } = await supabaseAdmin
      .from("parent_requests")
      .select("phone")
      .eq("email", parent_email)
      .single();

    const caregiverName = caregiver.first_name && caregiver.last_name 
      ? `${caregiver.first_name} ${caregiver.last_name}` 
      : "Your caregiver";
    const parentName = match.parent_first_name || "there";
    const formattedTotal = `£${(total_amount / 100).toFixed(2)}`;
    const quoteUrl = `https://birth-rebel-waitlist.lovable.app/quote/${quote.id}`;

    // Send email notification to parent
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      const itemsList = items.map((item: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">£${(item.unitPrice / 100).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">£${((item.quantity * item.unitPrice) / 100).toFixed(2)}</td>
        </tr>
      `).join('');

      const { error: emailError } = await resend.emails.send({
        from: "Birth Rebel <hello@notifications.birthrebel.com>",
        to: [parent_email],
        subject: `💝 New Quote from ${caregiverName} - ${formattedTotal}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #36454F; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #E2725B 0%, #C7624F 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #FFFAF5; padding: 30px; border-radius: 0 0 12px 12px; }
              .quote-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; }
              .quote-table th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; }
              .total-row { font-weight: bold; font-size: 18px; }
              .cta-button { display: inline-block; background: #E2725B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .notes-box { background: white; border-left: 4px solid #E2725B; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💝 New Quote</h1>
              </div>
              <div class="content">
                <p>Hi ${parentName},</p>
                <p><strong>${caregiverName}</strong> has sent you a quote for their services.</p>
                
                <table class="quote-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th style="text-align: center;">Qty</th>
                      <th style="text-align: right;">Unit Price</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                    <tr class="total-row">
                      <td colspan="3" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
                      <td style="padding: 12px; text-align: right;"><strong>${formattedTotal}</strong></td>
                    </tr>
                  </tbody>
                </table>
                
                ${notes ? `<div class="notes-box"><strong>Notes from ${caregiverName}:</strong><br>${notes}</div>` : ''}
                
                <p>This quote expires in 7 days. Click below to view the full details and make your payment securely.</p>
                
                <div style="text-align: center;">
                  <a href="${quoteUrl}" class="cta-button">View & Pay Quote</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">If you have any questions, you can message ${caregiverName} directly through your dashboard.</p>
              </div>
              <div class="footer">
                <p>Birth Rebel - Connecting families with exceptional care</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (emailError) {
        logStep("Email send error", { error: emailError });
      } else {
        logStep("Email sent successfully to parent");
      }
    } catch (emailErr: any) {
      logStep("Email send exception", { error: emailErr.message });
    }

    // Send SMS notification to parent if phone available
    if (parentRequest?.phone) {
      const smsMessage = `Hi ${parentName}! ${caregiverName} has sent you a quote for ${formattedTotal}. Check your email or log in to your Birth Rebel dashboard to view and pay.`;
      const smsSent = await sendSMS(parentRequest.phone, smsMessage);
      logStep("SMS notification result", { sent: smsSent });
    } else {
      logStep("No phone number available for parent, skipping SMS");
    }

    return new Response(
      JSON.stringify({ success: true, quote }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
