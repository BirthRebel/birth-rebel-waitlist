import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const VONAGE_API_KEY = Deno.env.get("VONAGE_API_KEY");
const VONAGE_API_SECRET = Deno.env.get("VONAGE_API_SECRET");
const VONAGE_FROM_NUMBER = Deno.env.get("VONAGE_FROM_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParentNotificationRequest {
  parentEmail: string;
  parentName: string;
  messageContent: string;
  parentPhone?: string;
  parentRequestId?: string;
}

// Send SMS via Vonage
async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!VONAGE_API_KEY || !VONAGE_API_SECRET || !VONAGE_FROM_NUMBER) {
    console.log("Vonage credentials not configured, skipping SMS");
    return false;
  }

  // Clean phone number - ensure it has country code
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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentEmail, parentName, messageContent, parentPhone, parentRequestId }: ParentNotificationRequest = await req.json();

    console.log(`Sending message notification to parent: ${parentEmail}`);

    if (!parentEmail) {
      throw new Error("Parent email is required");
    }

    // Try to get parent's phone from parent_requests if not provided
    let phoneNumber = parentPhone;
    if (!phoneNumber && parentRequestId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: parentRequest } = await supabase
        .from("parent_requests")
        .select("phone")
        .eq("id", parentRequestId)
        .single();

      if (parentRequest?.phone) {
        phoneNumber = parentRequest.phone;
        console.log(`Found parent phone from request: ${phoneNumber}`);
      }
    }

    // If still no phone, try to find by email
    if (!phoneNumber) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: parentRequest } = await supabase
        .from("parent_requests")
        .select("phone")
        .eq("email", parentEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (parentRequest?.phone) {
        phoneNumber = parentRequest.phone;
        console.log(`Found parent phone from email lookup: ${phoneNumber}`);
      }
    }

    // Send simple notification email
    const { error: emailError } = await resend.emails.send({
      from: "Birth Rebel <hello@notifications.birthrebel.com>",
      to: [parentEmail],
      subject: "Birth Rebel: New Message",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #D97757 0%, #C96A4A 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #D97757; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
            .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
            .footer p { margin: 0; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 New Message</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>You have a new message from the Birth Rebel team waiting for you.</p>
              
              <p>Log in to your dashboard to read and reply.</p>
              
              <p style="text-align: center;">
                <a href="https://birthrebel.com/auth?email=${encodeURIComponent(parentEmail)}&type=parent" class="button">View Message</a>
              </p>
              
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

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log(`Email notification sent successfully to ${parentEmail}`);

    // Send SMS if phone number is available
    let smsSent = false;
    if (phoneNumber) {
      const smsMessage = `Hi ${parentName || 'there'}! You have a new message on Birth Rebel. Log in to your dashboard to view it.`;
      smsSent = await sendSMS(phoneNumber, smsMessage);
      console.log(`SMS notification ${smsSent ? 'sent' : 'failed'} to ${phoneNumber}`);
    } else {
      console.log("No phone number available for parent, skipping SMS");
    }

    return new Response(JSON.stringify({ success: true, smsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-parent-message-notification:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
