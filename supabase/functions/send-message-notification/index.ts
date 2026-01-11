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

interface NotificationRequest {
  conversationId: string;
  messageContent: string;
  senderType: "admin" | "caregiver";
  synopsis?: string | null;
}

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, messageContent, senderType, synopsis }: NotificationRequest = await req.json();

    console.log(`Processing notification for conversation ${conversationId}, sender: ${senderType}`);

    // Fetch conversation details including caregiver phone
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        subject,
        parent_email,
        caregiver_id,
        caregivers (
          id,
          email,
          first_name,
          user_id,
          phone
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
    let recipientPhone: string | null = null;
    let senderName: string;
    let tempPassword: string | null = null;
    let isNewAccount = false;

    if (senderType === "admin") {
      // Admin sent the message, notify the caregiver
      const caregiver = conversation.caregivers as { id: string; email: string; first_name: string; user_id: string | null; phone: string | null } | null;
      if (!caregiver?.email) {
        console.log("No caregiver email found, skipping notification");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      recipientEmail = caregiver.email;
      recipientName = caregiver.first_name || "Caregiver";
      recipientPhone = caregiver.phone;
      senderName = "Birth Rebel Team";

      // Check if caregiver already has an account
      if (!caregiver.user_id) {
        console.log("Caregiver has no account, creating one...");
        
        // Generate temporary password
        tempPassword = generateTempPassword();
        isNewAccount = true;

        // Create auth user for the caregiver
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: caregiver.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm the email
        });

        if (createUserError) {
          // If user already exists in auth but not linked, try to get them
          if (createUserError.message.includes("already been registered")) {
            console.log("User already exists in auth, attempting to link...");
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === caregiver.email);
            
            if (existingUser) {
              // Link the existing user to the caregiver
              const { error: linkError } = await supabase
                .from("caregivers")
                .update({ user_id: existingUser.id })
                .eq("id", caregiver.id);
              
              if (linkError) {
                console.error("Error linking existing user:", linkError);
              } else {
                console.log("Linked existing user to caregiver");
                isNewAccount = false;
                tempPassword = null;
              }
            }
          } else {
            console.error("Error creating user:", createUserError);
            // Continue without creating account - just send notification
          }
        } else if (newUser?.user) {
          console.log("Created new user:", newUser.user.id);
          
          // Link the new user to the caregiver record
          const { error: linkError } = await supabase
            .from("caregivers")
            .update({ user_id: newUser.user.id })
            .eq("id", caregiver.id);

          if (linkError) {
            console.error("Error linking user to caregiver:", linkError);
          } else {
            console.log("Successfully linked user to caregiver");
          }
        }
      }
    } else {
      // Caregiver sent the message, notify admin (parent email in this case)
      recipientEmail = conversation.parent_email;
      recipientName = "there";
      const caregiver = conversation.caregivers as { email: string; first_name: string } | null;
      senderName = caregiver?.first_name || "A caregiver";
    }

    console.log(`Sending notification to ${recipientEmail}, isNewAccount: ${isNewAccount}`);

    // Build simple, clean email content
    let emailContent: string;
    let emailSubject: string;
    
    if (senderType === "admin") {
      // Email to caregiver about a new match
      emailSubject = "Birth Rebel: New Match";
      emailContent = `
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
            ${isNewAccount && tempPassword ? `
            .credentials-box { background: #FFF7ED; padding: 20px; border-radius: 8px; border: 2px solid #D97757; margin: 20px 0; }
            .credentials-box h3 { margin: 0 0 15px 0; color: #D97757; }
            .credential { background: white; padding: 10px 15px; border-radius: 4px; margin: 8px 0; font-family: monospace; font-size: 16px; }
            ` : ''}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Match!</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              
              <p>Great news! You've been matched with a new parent on Birth Rebel.</p>
              
              <p>They are currently reviewing the match. Once approved, we will connect you via the platform to start your journey together.</p>
              
              ${isNewAccount && tempPassword ? `
              <div class="credentials-box">
                <h3>🔐 Your Login Details</h3>
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong></p>
                <div class="credential">${recipientEmail}</div>
                <p style="margin: 10px 0 10px 0;"><strong>Temporary Password:</strong></p>
                <div class="credential">${tempPassword}</div>
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">We recommend changing your password after your first login.</p>
              </div>
              ` : ''}
              
              <p style="text-align: center;">
                <a href="https://birthrebel.com/caregiver/auth" class="button">Log In to Your Dashboard</a>
              </p>
              
              <p>We're excited to have you on this journey!</p>
              
              <p>Warm regards,<br><strong>The Birth Rebel Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Birth Rebel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Caregiver sent a message, notify parent/admin
      emailSubject = `Birth Rebel: Message from ${senderName}`;
      emailContent = `
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
            .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
            .footer p { margin: 0; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Message</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>You have received a new message from <strong>${senderName}</strong>:</p>
              <div class="message-box">
                <p style="margin: 0; white-space: pre-wrap;">${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}</p>
              </div>
              <p>Warm regards,<br><strong>The Birth Rebel Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Birth Rebel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email notification
    const { error: emailError } = await resend.emails.send({
      from: "Birth Rebel <hello@notifications.birthrebel.com>",
      to: [recipientEmail],
      subject: emailSubject,
      html: emailContent,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log(`Email notification sent successfully to ${recipientEmail}`);

    // Send SMS notification to caregiver if admin sent the message and phone is available
    let smsSent = false;
    if (senderType === "admin" && recipientPhone) {
      // No URLs - they trigger spam filters. Direct to email for login details.
      const smsMessage = `Hi ${recipientName}! You have a new family match on Birth Rebel. Check your email for more details.`;
      
      smsSent = await sendSMS(recipientPhone, smsMessage);
      console.log(`SMS notification ${smsSent ? 'sent' : 'failed'} to ${recipientPhone}`);
    }

    return new Response(JSON.stringify({ success: true, isNewAccount, smsSent }), {
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
