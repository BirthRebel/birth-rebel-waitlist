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

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
          id,
          email,
          first_name,
          user_id
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
    let tempPassword: string | null = null;
    let isNewAccount = false;

    if (senderType === "admin") {
      // Admin sent the message, notify the caregiver
      const caregiver = conversation.caregivers as { id: string; email: string; first_name: string; user_id: string | null } | null;
      if (!caregiver?.email) {
        console.log("No caregiver email found, skipping notification");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      recipientEmail = caregiver.email;
      recipientName = caregiver.first_name || "Caregiver";
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

    // Build email content based on whether it's a new account
    let emailContent: string;
    
    if (isNewAccount && tempPassword) {
      // New account email with temporary password
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
            .credentials-box { background: #FFF7ED; padding: 20px; border-radius: 8px; border: 2px solid #D97757; margin: 20px 0; }
            .credentials-box h3 { margin: 0 0 15px 0; color: #D97757; }
            .credential { background: white; padding: 10px 15px; border-radius: 4px; margin: 8px 0; font-family: monospace; font-size: 16px; }
            .button { display: inline-block; background: #D97757; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
            .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
            .footer p { margin: 0; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Birth Rebel</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome! Your account is ready</p>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>Great news! We've set up your Birth Rebel caregiver account. You have a new message from <strong>${senderName}</strong>:</p>
              <div class="message-box">
                <p style="margin: 0; white-space: pre-wrap;">${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}</p>
              </div>
              
              <div class="credentials-box">
                <h3>🔐 Your Login Details</h3>
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong></p>
                <div class="credential">${recipientEmail}</div>
                <p style="margin: 10px 0 10px 0;"><strong>Temporary Password:</strong></p>
                <div class="credential">${tempPassword}</div>
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">We recommend changing your password after your first login.</p>
              </div>
              
              <p style="text-align: center;">
                <a href="https://birthrebel.com/caregiver/auth" class="button">Log In to Your Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Birth Rebel.</p>
              <p>Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Existing account email - just login link
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
            .button { display: inline-block; background: #D97757; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
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
              <p>Hi ${recipientName},</p>
              <p>You have received a new message from <strong>${senderName}</strong>:</p>
              <div class="message-box">
                <p style="margin: 0; white-space: pre-wrap;">${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}</p>
              </div>
              <p>To view this message and reply, please log in to your Birth Rebel caregiver dashboard.</p>
              <p style="text-align: center;">
                <a href="https://birthrebel.com/caregiver/auth?email=${encodeURIComponent(recipientEmail)}" class="button">Log In to Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Birth Rebel.</p>
              <p>Please do not reply directly to this email.</p>
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
      subject: isNewAccount 
        ? `Welcome to Birth Rebel - Your account is ready!`
        : `New message: ${conversation.subject || "Birth Rebel Conversation"}`,
      html: emailContent,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log(`Email notification sent successfully to ${recipientEmail}`);

    return new Response(JSON.stringify({ success: true, isNewAccount }), {
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
