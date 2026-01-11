import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const VONAGE_API_KEY = Deno.env.get("VONAGE_API_KEY");
const VONAGE_API_SECRET = Deno.env.get("VONAGE_API_SECRET");
const VONAGE_FROM_NUMBER = Deno.env.get("VONAGE_FROM_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchNotificationRequest {
  caregiverEmail: string;
  caregiverFirstName: string | null;
  caregiverPhone: string | null;
  parentEmail: string;
  parentFirstName: string;
  parentPhone: string | null;
  supportType: string;
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!VONAGE_API_KEY || !VONAGE_API_SECRET || !VONAGE_FROM_NUMBER) {
    console.log("Vonage credentials not configured, skipping SMS");
    return false;
  }

  // Clean phone number - ensure it has country code
  let cleanedPhone = to.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (!cleanedPhone.startsWith("+")) {
    // Assume UK number if no country code
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "+44" + cleanedPhone.substring(1);
    } else {
      cleanedPhone = "+" + cleanedPhone;
    }
  }

  try {
    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    const {
      caregiverEmail,
      caregiverFirstName,
      caregiverPhone,
      parentEmail,
      parentFirstName,
      parentPhone,
      supportType,
    }: MatchNotificationRequest = await req.json();

    const results = {
      caregiverEmail: false,
      caregiverSMS: false,
      parentEmail: false,
      parentSMS: false,
    };

    // 1. Send email to caregiver
    try {
      const caregiverEmailResult = await resend.emails.send({
        from: "Birth Rebel <hello@birthrebel.co.uk>",
        to: caregiverEmail,
        subject: "🎉 You have a new match on Birth Rebel!",
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
              .highlight-box { background: white; border-left: 4px solid #E2725B; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
              .cta-button { display: inline-block; background: #E2725B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 You Have a Match!</h1>
              </div>
              <div class="content">
                <p>Hi ${caregiverFirstName || "there"},</p>
                
                <p>Great news! You've been matched with a family looking for <strong>${supportType}</strong> support.</p>
                
                <div class="highlight-box">
                  <p><strong>Parent:</strong> ${parentFirstName}</p>
                  <p><strong>Support Type:</strong> ${supportType}</p>
                </div>
                
                <p>A member of our team will be in touch shortly with more details about this match and next steps.</p>
                
                <p>In the meantime, please ensure your availability is up to date.</p>
                
                <p>Thank you for being part of the Birth Rebel community!</p>
                
                <p>Warm regards,<br><strong>The Birth Rebel Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Birth Rebel. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Caregiver email sent:", caregiverEmailResult);
      results.caregiverEmail = true;
    } catch (error) {
      console.error("Failed to send caregiver email:", error);
    }

    // 2. Send SMS to caregiver if phone available
    if (caregiverPhone) {
      const caregiverSMSMessage = `Hi ${caregiverFirstName || "there"}! Great news - you have a new match on Birth Rebel with ${parentFirstName} for ${supportType} support. We'll be in touch with details. - Birth Rebel`;
      results.caregiverSMS = await sendSMS(caregiverPhone, caregiverSMSMessage);
    }

    // 3. Send email to parent
    try {
      const parentEmailResult = await resend.emails.send({
        from: "Birth Rebel <hello@birthrebel.co.uk>",
        to: parentEmail,
        subject: "🎉 We found you a match! Review now",
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
              .highlight-box { background: white; border-left: 4px solid #E2725B; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
              .cta-button { display: inline-block; background: #E2725B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 We Found You a Match!</h1>
              </div>
              <div class="content">
                <p>Hi ${parentFirstName},</p>
                
                <p>Exciting news! We've found a caregiver match for your <strong>${supportType}</strong> support request.</p>
                
                <div class="highlight-box">
                  <p>A member of our team will be reaching out to you shortly to introduce you to your matched caregiver and discuss next steps.</p>
                </div>
                
                <p>We're so excited to connect you with the right support for your journey!</p>
                
                <p>Warm regards,<br><strong>The Birth Rebel Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Birth Rebel. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Parent email sent:", parentEmailResult);
      results.parentEmail = true;
    } catch (error) {
      console.error("Failed to send parent email:", error);
    }

    // 4. Send SMS to parent if phone available
    if (parentPhone) {
      const parentSMSMessage = `Hi ${parentFirstName}! Great news - we found you a match on Birth Rebel for your ${supportType} support request. We'll be in touch with details soon. - Birth Rebel`;
      results.parentSMS = await sendSMS(parentPhone, parentSMSMessage);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-match-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
