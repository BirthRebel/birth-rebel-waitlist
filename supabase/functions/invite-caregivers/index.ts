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

    // Parse request body
    const { caregiver_id, invite_all } = await req.json();
    console.log("Invite request:", { caregiver_id, invite_all });

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

    for (const caregiver of caregivers) {
      try {
        console.log(`Inviting caregiver: ${caregiver.email}`);
        
        // Use inviteUserByEmail to send invite
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          caregiver.email,
          {
            data: {
              first_name: caregiver.first_name,
              last_name: caregiver.last_name,
              caregiver_id: caregiver.id,
            },
            redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/caregiver/matches`,
          }
        );

        if (error) {
          console.error(`Error inviting ${caregiver.email}:`, error);
          
          // Check if user already exists
          if (error.message?.includes("already been registered")) {
            // Try to get the existing user and link them
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === caregiver.email);
            
            if (existingUser) {
              // Link the caregiver to existing user
              const { error: updateError } = await supabaseAdmin
                .from("caregivers")
                .update({ user_id: existingUser.id })
                .eq("id", caregiver.id);

              if (updateError) {
                errors.push({ email: caregiver.email, error: updateError.message });
              } else {
                results.push({ email: caregiver.email, status: "linked_existing" });
                console.log(`Linked existing user for ${caregiver.email}`);
              }
            } else {
              errors.push({ email: caregiver.email, error: error.message });
            }
          } else {
            errors.push({ email: caregiver.email, error: error.message });
          }
        } else {
          results.push({ email: caregiver.email, status: "invited", userId: data?.user?.id });
          console.log(`Successfully invited ${caregiver.email}`);
          
          // If we got a user ID back, link it to the caregiver
          if (data?.user?.id) {
            await supabaseAdmin
              .from("caregivers")
              .update({ user_id: data.user.id })
              .eq("id", caregiver.id);
          }
        }
      } catch (err: any) {
        console.error(`Exception inviting ${caregiver.email}:`, err);
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
