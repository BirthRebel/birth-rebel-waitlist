import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Received Formless webhook payload:', JSON.stringify(payload, null, 2));

    // Extract data from Formless payload
    // Formless typically sends data in 'answers' array or flat object
    const answers = payload.answers || payload.data || payload;
    
    // Map Formless fields to our parent_requests schema
    // Based on user's Formless form questions:
    // 1. First name
    // 2. Stage of your journey
    // 3. Due date
    // 4. Location
    // 5. Type of support
    // 6. Preferences (caregiver preferences)
    // 7. Family context
    // 8. Shared identity requests
    // 9. General availability
    // 10. Specific concerns
    // 11. Email & Phone
    
    const parentRequest = {
      first_name: extractField(answers, [
        'first_name', 'firstName', 'name', 'First Name', 'first name',
        'What is your first name', 'Your name'
      ]),
      email: extractField(answers, [
        'email', 'Email', 'email_address', 'emailAddress',
        'Your email', 'Email address', 'e-mail'
      ]),
      phone: extractField(answers, [
        'phone', 'Phone', 'phone_number', 'phoneNumber', 'telephone',
        'Phone number', 'Contact number', 'mobile'
      ]),
      stage_of_journey: extractField(answers, [
        'stage_of_journey', 'stageOfJourney', 'Stage of your journey',
        'stage', 'journey stage', 'pregnancy stage', 'current stage',
        'Where are you in your journey'
      ]),
      due_date: extractDateField(answers, [
        'due_date', 'dueDate', 'Due Date', 'expected_date', 'expectedDate',
        'due date', 'Expected due date', 'When is your due date',
        'baby due date', 'delivery date'
      ]),
      location: extractField(answers, [
        'location', 'Location', 'city', 'area', 'postcode', 'address',
        'Where are you located', 'Your location', 'town', 'region'
      ]),
      support_type: extractField(answers, [
        'support_type', 'supportType', 'Support Type', 'type_of_support',
        'Type of support', 'What type of support', 'support needed',
        'type of care', 'care type'
      ]),
      caregiver_preferences: extractField(answers, [
        'caregiver_preferences', 'caregiverPreferences', 'Preferences',
        'preferences', 'caregiver preferences', 'provider preferences',
        'What are your preferences', 'Important qualities'
      ]),
      family_context: extractField(answers, [
        'family_context', 'familyContext', 'Family context',
        'family situation', 'household', 'family details',
        'Tell us about your family', 'family background'
      ]),
      shared_identity_requests: extractField(answers, [
        'shared_identity_requests', 'sharedIdentityRequests',
        'Shared identity requests', 'shared identity', 'identity preferences',
        'community', 'cultural preferences', 'identity',
        'Shared identity or community'
      ]),
      general_availability: extractField(answers, [
        'general_availability', 'generalAvailability', 'General availability',
        'availability', 'schedule', 'available times', 'preferred times',
        'Days and times', 'weekdays', 'weekends', 'When are you available'
      ]),
      specific_concerns: extractField(answers, [
        'specific_concerns', 'specificConcerns', 'Specific concerns',
        'concerns', 'challenges', 'worries', 'issues',
        'Concerns or challenges', 'pregnancy concerns', 'parenthood concerns'
      ]),
      status: 'new'
    };

    console.log('Parsed parent request:', parentRequest);

    // Validate required fields
    if (!parentRequest.email || !parentRequest.first_name) {
      console.error('Missing required fields: email or first_name');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email and first_name are required',
          received_fields: Object.keys(parentRequest).filter(k => parentRequest[k as keyof typeof parentRequest])
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into parent_requests table
    const { data, error } = await supabase
      .from('parent_requests')
      .insert(parentRequest)
      .select()
      .single();

    if (error) {
      console.error('Error inserting parent request:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created parent request:', data);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract field value from various possible field names
function extractField(answers: any, possibleNames: string[]): string | null {
  if (!answers) return null;
  
  // If answers is an array (common Formless format)
  if (Array.isArray(answers)) {
    for (const answer of answers) {
      const fieldId = answer.field_id || answer.fieldId || answer.id || answer.name;
      const value = answer.value || answer.answer || answer.text || answer.response;
      const title = answer.title || answer.question || answer.label;
      
      // Check if any possible name matches the field ID or title
      if (possibleNames.some(name => {
        const nameLower = name.toLowerCase();
        return (
          fieldId?.toLowerCase().includes(nameLower) ||
          fieldId?.toLowerCase() === nameLower ||
          title?.toLowerCase().includes(nameLower) ||
          title?.toLowerCase() === nameLower
        );
      })) {
        // Handle array values (multiple choice)
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;
      }
    }
  }
  
  // If answers is an object
  if (typeof answers === 'object') {
    for (const name of possibleNames) {
      // Direct match
      if (answers[name] !== undefined && answers[name] !== null) {
        const val = answers[name];
        return Array.isArray(val) ? val.join(', ') : val;
      }
      
      // Check case-insensitive
      const key = Object.keys(answers).find(k => 
        k.toLowerCase() === name.toLowerCase() ||
        k.toLowerCase().includes(name.toLowerCase())
      );
      if (key && answers[key] !== undefined && answers[key] !== null) {
        const val = answers[key];
        return Array.isArray(val) ? val.join(', ') : val;
      }
    }
  }
  
  return null;
}

// Helper function to extract and parse date fields
function extractDateField(answers: any, possibleNames: string[]): string | null {
  const value = extractField(answers, possibleNames);
  if (!value) return null;
  
  try {
    // Try parsing various date formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
    
    // Try UK format DD/MM/YYYY
    const ukMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (ukMatch) {
      const day = parseInt(ukMatch[1]);
      const month = parseInt(ukMatch[2]) - 1;
      const year = parseInt(ukMatch[3]) < 100 ? 2000 + parseInt(ukMatch[3]) : parseInt(ukMatch[3]);
      const ukDate = new Date(year, month, day);
      if (!isNaN(ukDate.getTime())) {
        return ukDate.toISOString().split('T')[0];
      }
    }
  } catch {
    // If parsing fails, return null
  }
  
  return null;
}
