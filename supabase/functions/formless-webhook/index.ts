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
    // Adjust these field names based on your actual Formless form structure
    const answers = payload.answers || payload.data || payload;
    
    // Map Formless fields to our schema
    // You may need to adjust these based on your form field IDs/names
    const parentRequest = {
      first_name: extractField(answers, ['first_name', 'firstName', 'name', 'First Name']),
      last_name: extractField(answers, ['last_name', 'lastName', 'Last Name']),
      email: extractField(answers, ['email', 'Email', 'email_address']),
      phone: extractField(answers, ['phone', 'Phone', 'phone_number', 'telephone']),
      support_type: extractField(answers, ['support_type', 'supportType', 'Support Type', 'type_of_support']),
      due_date: extractDateField(answers, ['due_date', 'dueDate', 'Due Date', 'expected_date']),
      location: extractField(answers, ['location', 'Location', 'city', 'area', 'postcode']),
      special_requirements: extractField(answers, ['special_requirements', 'requirements', 'notes', 'additional_info', 'Special Requirements']),
      status: 'new'
    };

    console.log('Parsed parent request:', parentRequest);

    // Validate required fields
    if (!parentRequest.email || !parentRequest.first_name) {
      console.error('Missing required fields: email or first_name');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and first_name are required' }),
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
      const value = answer.value || answer.answer || answer.text;
      
      if (possibleNames.some(name => 
        fieldId?.toLowerCase().includes(name.toLowerCase()) ||
        answer.title?.toLowerCase().includes(name.toLowerCase())
      )) {
        return value;
      }
    }
  }
  
  // If answers is an object
  for (const name of possibleNames) {
    if (answers[name] !== undefined) {
      return answers[name];
    }
    // Check case-insensitive
    const key = Object.keys(answers).find(k => k.toLowerCase() === name.toLowerCase());
    if (key && answers[key] !== undefined) {
      return answers[key];
    }
  }
  
  return null;
}

// Helper function to extract and parse date fields
function extractDateField(answers: any, possibleNames: string[]): string | null {
  const value = extractField(answers, possibleNames);
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
  } catch {
    // If parsing fails, return null
  }
  
  return null;
}
