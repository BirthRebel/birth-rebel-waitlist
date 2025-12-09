import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  conversationId: string;
  messageContent: string;
  senderType: "admin" | "caregiver";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, messageContent, senderType }: NotificationRequest = await req.json();

    console.log(`Processing notification for conversation ${conversationId}, sender: ${senderType}`);

    // Fetch conversation details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        subject,
        parent_email,
        caregiver_id,
        caregivers (
          email,
          first_name
        )
      `)
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error("Error fetching conversation:", convError);
      throw new Error("Conversation not found");
    }

    console.log("Conversation data:", conversation);

    // Determine recipient based on sender type
    let recipientEmail: string;
    let recipientName: string;
    let senderName: string;

    if (senderType === "admin") {
      // Admin sent the message, notify the caregiver
      const caregiver = conversation.caregivers as { email: string; first_name: string } | null;
      if (!caregiver?.email) {
        console.log("No caregiver email found, skipping notification");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      recipientEmail = caregiver.email;
      recipientName = caregiver.first_name || "Caregiver";
      senderName = "Birth Rebel Team";
    } else {
      // Caregiver sent the message, notify admin (parent email in this case)
      recipientEmail = conversation.parent_email;
      recipientName = "there";
      const caregiver = conversation.caregivers as { email: string; first_name: string } | null;
      senderName = caregiver?.first_name || "A caregiver";
    }

    console.log(`Sending notification to ${recipientEmail}`);

    // Send email notification
    const { error: emailError } = await resend.emails.send({
      from: "Birth Rebel <hello@birthrebel.com>",
      to: [recipientEmail],
      subject: `New message: ${conversation.subject || "Birth Rebel Conversation"}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8B5CF6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .message-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #8B5CF6; margin: 15px 0; }
            .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">New Message</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>You have received a new message from <strong>${senderName}</strong>:</p>
              <div class="message-box">
                <p style="margin: 0;">${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}</p>
              </div>
              <p>Log in to the Birth Rebel platform to view and reply to this message.</p>
              <p class="footer">
                This is an automated notification from Birth Rebel.<br>
                Please do not reply directly to this email.
              </p>
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

    console.log(`Email notification sent successfully to ${recipientEmail}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-message-notification:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
