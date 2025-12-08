import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParentNotificationRequest {
  parentEmail: string;
  parentName: string;
  messageContent: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentEmail, parentName, messageContent }: ParentNotificationRequest = await req.json();

    console.log(`Sending message notification to parent: ${parentEmail}`);

    if (!parentEmail) {
      throw new Error("Parent email is required");
    }

    // Note: Using Resend test domain. To use your own domain, verify it at https://resend.com/domains
    const { error: emailError } = await resend.emails.send({
      from: "Birth Rebel <onboarding@resend.dev>",
      to: [parentEmail],
      subject: "You have a new message from Birth Rebel",
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
            .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #D97757; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #D97757; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
            .button:hover { background: #C96A4A; }
            .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
            .footer p { margin: 0; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Birth Rebel</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">You have a new message</p>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              <p>You have received a new message from the <strong>Birth Rebel Team</strong>:</p>
              <div class="message-box">
                <p style="margin: 0; white-space: pre-wrap;">${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}</p>
              </div>
              <p>To view this message and reply, please log in to your Birth Rebel account.</p>
              <p style="text-align: center;">
                <a href="https://birthrebel.co.uk" class="button">View Message</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Birth Rebel.</p>
              <p>Please do not reply directly to this email.</p>
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

    return new Response(JSON.stringify({ success: true }), {
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
