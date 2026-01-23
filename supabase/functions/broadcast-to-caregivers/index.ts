import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BROADCAST-CAREGIVERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth failed", { error: authError?.message });
      throw new Error("Invalid or expired token");
    }

    // Check if user is admin
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin
      .rpc("has_role", { _user_id: user.id, _role: "admin" });

    if (roleError || !hasAdminRole) {
      logStep("Admin access denied", { userId: user.id });
      throw new Error("Admin access required");
    }

    logStep("Admin authenticated", { userId: user.id });

    // Parse request body
    const { subject, message } = await req.json();

    if (!subject || !message) {
      throw new Error("Subject and message are required");
    }

    logStep("Broadcast request", { subject, messageLength: message.length });

    // Get all active caregivers with emails
    const { data: caregivers, error: fetchError } = await supabaseAdmin
      .from("caregivers")
      .select("id, email, first_name")
      .eq("active", true)
      .not("email", "is", null);

    if (fetchError) {
      logStep("Error fetching caregivers", { error: fetchError.message });
      throw fetchError;
    }

    if (!caregivers || caregivers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: "No active caregivers to message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found caregivers", { count: caregivers.length });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails to all caregivers
    for (const caregiver of caregivers) {
      try {
        const firstName = caregiver.first_name || "there";
        
        await resend.emails.send({
          from: "Birth Rebel <hello@notifications.birthrebel.com>",
          to: caregiver.email,
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #36454F; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #E2725B 0%, #C7624F 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { background: #FFFAF5; padding: 30px; border-radius: 0 0 12px 12px; }
                .message { white-space: pre-wrap; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Birth Rebel</h1>
                </div>
                <div class="content">
                  <p>Hi ${firstName},</p>
                  
                  <div class="message">${message.replace(/\n/g, '<br>')}</div>
                  
                  <p style="margin-top: 24px;">Warm regards,<br><strong>The Birth Rebel Team</strong></p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Birth Rebel. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        sent++;
        logStep("Email sent", { email: caregiver.email });
      } catch (emailError: any) {
        failed++;
        errors.push(`${caregiver.email}: ${emailError.message}`);
        logStep("Email failed", { email: caregiver.email, error: emailError.message });
      }
    }

    logStep("Broadcast complete", { sent, failed });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent, 
        failed,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
