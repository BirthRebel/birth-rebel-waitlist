import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin
      .rpc("has_role", { _user_id: user.id, _role: "admin" });

    if (roleError || !hasAdminRole) {
      console.log("Admin access denied for user:", user.id);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { caregiver_id, invite_all } = await req.json();
    console.log("Admin", user.id, "invite request:", { caregiver_id, invite_all });

    // Get caregivers to invite (those without user_id)
    let query = supabaseAdmin
      .from("caregivers")
      .select("id, email, first_name, last_name")
      .is("user_id", null);

    if (caregiver_id && !invite_all) {
      query = query.eq("id", caregiver_id);
    }

    const { data: caregivers, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching caregivers:", fetchError);
      throw fetchError;
    }

    if (!caregivers || caregivers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No caregivers to invite (all already have accounts)",
          invited: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${caregivers.length} caregivers to invite`);

    const results = [];
    const errors = [];

    // Generate a random password (user will reset via forgot password flow)
    const generateRandomPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
      let password = '';
      for (let i = 0; i < 24; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    for (const caregiver of caregivers) {
      try {
        console.log(`Creating account for caregiver: ${caregiver.email}`);
        
        // Create user with pre-confirmed email and random password
        // Caregiver will use "Forgot Password" to set their own password
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: caregiver.email,
          password: generateRandomPassword(),
          email_confirm: true, // Pre-confirm email so they can reset password immediately
          user_metadata: {
            first_name: caregiver.first_name,
            last_name: caregiver.last_name,
            caregiver_id: caregiver.id,
          },
        });

        if (error) {
          console.error(`Error creating user ${caregiver.email}:`, error);
          
          // Check if user already exists
          if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
            // Try to get the existing user and link them
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === caregiver.email);
            
            if (existingUser) {
              // Ensure email is confirmed for existing user
              if (!existingUser.email_confirmed_at) {
                await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                  email_confirm: true,
                });
                console.log(`Confirmed email for existing user ${caregiver.email}`);
              }
              
              // Link the caregiver to existing user
              const { error: updateError } = await supabaseAdmin
                .from("caregivers")
                .update({ user_id: existingUser.id })
                .eq("id", caregiver.id);

              if (updateError) {
                errors.push({ email: caregiver.email, error: updateError.message });
              } else {
                results.push({ email: caregiver.email, status: "linked_existing_and_confirmed" });
                console.log(`Linked and confirmed existing user for ${caregiver.email}`);
              }
            } else {
              errors.push({ email: caregiver.email, error: error.message });
            }
          } else {
            errors.push({ email: caregiver.email, error: error.message });
          }
        } else {
          results.push({ email: caregiver.email, status: "created", userId: data?.user?.id });
          console.log(`Successfully created account for ${caregiver.email}`);
          
          // Link the new user to the caregiver record
          if (data?.user?.id) {
            await supabaseAdmin
              .from("caregivers")
              .update({ user_id: data.user.id })
              .eq("id", caregiver.id);
          }
        }
      } catch (err: any) {
        console.error(`Exception creating user ${caregiver.email}:`, err);
        errors.push({ email: caregiver.email, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invited: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in invite-caregivers:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
