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
    console.log('=== FORMLESS WEBHOOK RECEIVED ===');
    console.log('Full payload:', JSON.stringify(payload, null, 2));

    // Formless by Typeform uses similar structure to Typeform webhooks
    // Check for form_response structure (Typeform/Formless style)
    if (payload.form_response) {
      console.log('Processing Typeform/Formless style payload');
      return await processTypeformPayload(supabase, payload);
    }

    // Check for direct answers array or data object (alternative Formless format)
    const answers = payload.answers || payload.data || payload;
    console.log('Processing alternative format, answers:', JSON.stringify(answers, null, 2));
    
    return await processSimplePayload(supabase, answers, payload);

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Process Typeform-style payload (form_response with definition and answers)
async function processTypeformPayload(supabase: any, payload: any) {
  const formResponse = payload.form_response;
  const answers = formResponse.answers || [];
  const definition = formResponse.definition || {};
  const fields = definition.fields || [];
  
  // Build a map of field ID -> field title
  const fieldMap: Record<string, string> = {};
  for (const field of fields) {
    if (field.id && field.title) {
      fieldMap[field.id] = field.title.toLowerCase();
    }
  }
  console.log('Field map:', JSON.stringify(fieldMap, null, 2));

  // Extract answers by matching field titles
  const extractedData: Record<string, string> = {};
  
  for (const answer of answers) {
    const fieldId = answer.field?.id;
    const fieldTitle = fieldMap[fieldId] || '';
    
    // Get the answer value based on type
    let value = '';
    if (answer.type === 'text') value = answer.text;
    else if (answer.type === 'email') value = answer.email;
    else if (answer.type === 'phone_number') value = answer.phone_number;
    else if (answer.type === 'number') value = String(answer.number);
    else if (answer.type === 'boolean') value = answer.boolean ? 'yes' : 'no';
    else if (answer.type === 'choice') value = answer.choice?.label || '';
    else if (answer.type === 'choices') value = answer.choices?.labels?.join(', ') || '';
    else if (answer.type === 'date') value = answer.date;
    
    console.log(`Answer - field: ${fieldId}, title: "${fieldTitle}", type: ${answer.type}, value: "${value}"`);
    
    if (fieldTitle && value) {
      extractedData[fieldTitle] = value;
    }
  }

  console.log('Extracted data:', JSON.stringify(extractedData, null, 2));

  // Map extracted data to parent_requests fields using intelligent matching
  const parentRequest = mapToParentRequest(extractedData);
  
  return await saveParentRequest(supabase, parentRequest);
}

// Process simpler payload format
async function processSimplePayload(supabase: any, answers: any, fullPayload: any) {
  const extractedData: Record<string, string> = {};
  
  // If answers is an array (common conversational form format)
  if (Array.isArray(answers)) {
    for (const answer of answers) {
      const question = (answer.question || answer.title || answer.field || answer.name || '').toLowerCase();
      const value = answer.answer || answer.value || answer.text || answer.response || '';
      if (question && value) {
        extractedData[question] = value;
      }
    }
  } 
  // If answers is an object with key-value pairs
  else if (typeof answers === 'object') {
    for (const [key, val] of Object.entries(answers)) {
      if (val && typeof val === 'string') {
        extractedData[key.toLowerCase()] = val;
      } else if (val && typeof val === 'object') {
        // Handle nested objects
        const value = (val as any).answer || (val as any).value || (val as any).text || '';
        if (value) {
          extractedData[key.toLowerCase()] = value;
        }
      }
    }
  }

  console.log('Extracted data from simple format:', JSON.stringify(extractedData, null, 2));

  const parentRequest = mapToParentRequest(extractedData);
  
  return await saveParentRequest(supabase, parentRequest);
}

// Intelligent mapping from extracted question/answer data to parent_requests fields
function mapToParentRequest(data: Record<string, string>) {
  const result: Record<string, any> = {
    status: 'new'
  };

  for (const [question, answer] of Object.entries(data)) {
    const q = question.toLowerCase();
    
    // First name
    if (q.includes('your name') || q.includes('first name') || q === 'name') {
      // Extract first name from answer if not already set
      if (!result.first_name) {
        result.first_name = answer.split(' ')[0]; // Take first word as first name
      }
    }
    
    // Email - specifically look for email-related questions
    if (q.includes('email address') || q.includes('your email') || q === 'email') {
      // Validate it looks like an email
      if (answer.includes('@')) {
        result.email = answer;
      }
    }
    
    // Phone - specifically look for phone-related questions
    if (q.includes('phone number') || q.includes('contact you') || q.includes('telephone') || q === 'phone') {
      // Basic phone validation (contains digits)
      if (/\d{6,}/.test(answer.replace(/\D/g, ''))) {
        result.phone = answer;
      }
    }
    
    // Stage of journey
    if (q.includes('postpartum') || q.includes('pregnancy') || q.includes('how far along') || q.includes('stage')) {
      result.stage_of_journey = answer;
    }
    
    // Support type - look for specific question about type of support
    if (q.includes('type of support') || q.includes('looking for') && (q.includes('doula') || q.includes('lactation') || q.includes('sleep') || q.includes('hypnobirthing'))) {
      result.support_type = answer;
    }
    
    // Family context
    if (q.includes('birth') && q.includes('family') || q.includes('family context') || q.includes('relationship status') || q.includes('other children')) {
      result.family_context = answer;
    }
    
    // Caregiver preferences
    if (q.includes('preferences') && (q.includes('caregiver') || q.includes('personality') || q.includes('experience'))) {
      result.caregiver_preferences = answer;
    }
    
    // Preferred communication
    if (q.includes('communication') || q.includes('text') && q.includes('phone') && q.includes('video')) {
      result.preferred_communication = answer;
    }
    
    // Shared identity requests
    if (q.includes('identity') || q.includes('ethnicity') || q.includes('gender') || q.includes('orientation')) {
      result.shared_identity_requests = answer;
    }
    
    // Budget
    if (q.includes('budget')) {
      result.budget = answer;
    }
    
    // General availability
    if (q.includes('availability') || q.includes('days and times') || q.includes('weekdays') || q.includes('weekends')) {
      result.general_availability = answer;
    }
    
    // Specific concerns
    if (q.includes('concerns') || q.includes('challenges') || q.includes('issues')) {
      result.specific_concerns = answer;
    }
    
    // Due date
    if (q.includes('due date') || q.includes('expected')) {
      result.due_date = parseDateField(answer);
    }
    
    // Location
    if (q.includes('located') || q.includes('location') || q === 'city' || q === 'area') {
      result.location = answer;
    }
    
    // Language
    if (q.includes('language') && !q.includes('cultural')) {
      result.language = answer;
    }
    
    // Special requirements
    if (q.includes('special') && q.includes('requirement')) {
      result.special_requirements = answer;
    }
  }

  console.log('Mapped parent request:', JSON.stringify(result, null, 2));
  return result;
}

// Parse date from various formats
function parseDateField(value: string): string | null {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
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

// Save parent request to database
async function saveParentRequest(supabase: any, parentRequest: Record<string, any>) {
  // Validate required fields
  if (!parentRequest.email && !parentRequest.first_name) {
    console.error('Missing required fields: email or first_name');
    console.log('Parent request data:', JSON.stringify(parentRequest, null, 2));
    return new Response(
      JSON.stringify({ 
        error: 'Missing required fields: email or first_name are required',
        received_data: parentRequest
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // If we have first_name but no valid email, use a placeholder
  if (!parentRequest.email && parentRequest.first_name) {
    console.warn('No valid email found, parent request will need manual email update');
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
}