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
    console.log('Parent intake webhook received request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('=== PARENT INTAKE WEBHOOK RECEIVED ===');
    console.log('Full payload:', JSON.stringify(payload, null, 2));

    // Check for form_response structure (Typeform/Formless/Deformity style)
    if (payload.form_response) {
      console.log('Processing Typeform/Formless style payload');
      return await processTypeformPayload(supabase, payload);
    }

    // Check for direct answers array or data object (alternative format)
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

  // Check if this looks like a caregiver submission (sent to wrong webhook)
  if (detectCaregiverSubmission(extractedData)) {
    return new Response(
      JSON.stringify({ 
        error: 'This appears to be a caregiver submission. Please route to typeform-webhook instead.',
        hint: 'Caregiver forms should be sent to: /functions/v1/typeform-webhook'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

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

  // Check if this looks like a caregiver submission (sent to wrong webhook)
  if (detectCaregiverSubmission(extractedData)) {
    return new Response(
      JSON.stringify({ 
        error: 'This appears to be a caregiver submission. Please route to typeform-webhook instead.',
        hint: 'Caregiver forms should be sent to: /functions/v1/typeform-webhook'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const parentRequest = mapToParentRequest(extractedData);
  
  return await saveParentRequest(supabase, parentRequest);
}

// Extract first name from conversational text that mentions "Thanks, [Name]" pattern
function extractNameFromConversation(text: string): string | null {
  // Look for patterns like "Thanks, Leah." or "Thank you, Leah."
  const patterns = [
    /Thanks,\s+([A-Z][a-z]+)/i,
    /Thank you,\s+([A-Z][a-z]+)/i,
    /Hello,?\s+([A-Z][a-z]+)/i,
    /Hi,?\s+([A-Z][a-z]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Extract support type from conversational text
function extractSupportTypeFromConversation(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Check for explicit mentions of support types
  if (lowerText.includes('doula')) return 'doula';
  if (lowerText.includes('lactation')) return 'lactation';
  if (lowerText.includes('sleep support') || lowerText.includes('sleep consultant')) return 'sleep';
  if (lowerText.includes('hypnobirthing')) return 'hypnobirthing';
  
  return null;
}

// Extract email from any field value
function extractEmailFromValue(value: string): string | null {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = value.match(emailPattern);
  return match ? match[0].toLowerCase() : null;
}

// Extract phone from any field value
function extractPhoneFromValue(value: string): string | null {
  // Check if it has at least 6 digits and doesn't contain @ (email)
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length >= 6 && !value.includes('@')) {
    return value;
  }
  return null;
}

// Intelligent mapping from extracted question/answer data to parent_requests fields
function mapToParentRequest(data: Record<string, string>) {
  const result: Record<string, any> = {
    status: 'new'
  };

  // First pass: try to extract values from any field that might contain them
  // This handles the case where conversational forms concatenate all conversation in one field
  let allText = '';
  for (const [question, answer] of Object.entries(data)) {
    allText += ' ' + question + ' ' + answer;
  }
  
  // Try to extract name from conversational patterns in any field
  const nameFromConversation = extractNameFromConversation(allText);
  if (nameFromConversation) {
    result.first_name = nameFromConversation;
    console.log('Extracted name from conversation:', nameFromConversation);
  }
  
  // Try to extract support type from any field
  const supportTypeFromConversation = extractSupportTypeFromConversation(allText);
  if (supportTypeFromConversation) {
    result.support_type = supportTypeFromConversation;
    console.log('Extracted support type from conversation:', supportTypeFromConversation);
  }

  // Second pass: process each field specifically
  for (const [question, answer] of Object.entries(data)) {
    const q = question.toLowerCase();
    
    // First name - direct field match
    if ((q.includes('your name') || q.includes('first name') || q === 'name') && !result.first_name) {
      // Check if answer is a simple name (not a long conversation)
      if (answer.length < 50 && !answer.includes(',')) {
        result.first_name = answer.split(' ')[0];
      }
    }
    
    // Last name
    if (q.includes('last name') || q.includes('surname')) {
      if (answer.length < 50 && !answer.includes(',')) {
        result.last_name = answer;
      }
    }
    
    // Email - scan ALL field values for emails
    if (!result.email) {
      const foundEmail = extractEmailFromValue(answer);
      if (foundEmail) {
        result.email = foundEmail;
        console.log('Found email in field "' + question + '":', foundEmail);
      }
    }
    
    // Phone - scan values for phone numbers
    if (!result.phone) {
      const foundPhone = extractPhoneFromValue(answer);
      if (foundPhone && (q.includes('phone') || q.includes('contact') || q.includes('number') || q.includes('email'))) {
        result.phone = foundPhone;
        console.log('Found phone in field "' + question + '":', foundPhone);
      }
    }
    
    // Stage of journey - only if answer is reasonable length
    if ((q.includes('postpartum') || q.includes('pregnancy') || q.includes('how far along') || q.includes('stage of journey')) 
        && answer.length < 100) {
      result.stage_of_journey = answer;
    }
    
    // Support type - only from the specific question, and only short answers
    if (q.includes('support type') && !q.includes('looking for')) {
      if (answer.length < 100) {
        result.support_type = answer;
      }
    }
    
    // Family context
    if ((q.includes('birth and family context') || q.includes('family context') || q.includes('relationship status')) 
        && answer.length < 200) {
      result.family_context = answer;
    }
    
    // Caregiver preferences
    if ((q.includes('caregiver preference') || q.includes('preferences')) && answer.length < 300) {
      result.caregiver_preferences = answer;
    }
    
    // Preferred communication
    if ((q.includes('communication') || q.includes('communicate')) && answer.length < 100) {
      result.preferred_communication = answer;
    }
    
    // Shared identity requests
    if ((q.includes('identity') || q.includes('ethnicity') || q.includes('orientation')) && answer.length < 300) {
      result.shared_identity_requests = answer;
    }
    
    // Budget
    if (q.includes('budget') && answer.length < 100) {
      result.budget = answer;
    }
    
    // General availability
    if ((q.includes('availability') || q.includes('days and times')) && answer.length < 100) {
      result.general_availability = answer;
    }
    
    // Specific concerns
    if ((q.includes('concerns') || q.includes('challenges')) && answer.length < 500) {
      result.specific_concerns = answer;
    }
    
    // Due date
    if (q.includes('due date') || q.includes('expected')) {
      result.due_date = parseDateField(answer);
    }
    
    // Location
    if ((q.includes('located') || q.includes('location') || q === 'city' || q === 'area') && answer.length < 100) {
      result.location = answer;
    }
    
    // Language
    if (q.includes('language') && !q.includes('cultural') && answer.length < 100) {
      result.language = answer;
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

// Detect if submission looks like caregiver data (should go to typeform-webhook instead)
function detectCaregiverSubmission(data: Record<string, string>): boolean {
  const caregiverIndicators = [
    'midwife', 'years practicing', 'hourly rate',
    'certifications', 'births supported', 'insurance certificate',
    'dbs certificate', 'training certificate', 'caregiver type',
    'i am a', 'i\'m a doula', 'caregiver profile'
  ];
  
  const allText = Object.entries(data)
    .map(([k, v]) => `${k} ${v}`)
    .join(' ')
    .toLowerCase();
  
  const matches = caregiverIndicators.filter(indicator => allText.includes(indicator));
  
  // If 2+ caregiver indicators found, likely a caregiver submission
  if (matches.length >= 2) {
    console.warn('CAREGIVER SUBMISSION DETECTED - This should go to typeform-webhook!');
    console.warn('Matched indicators:', matches);
    return true;
  }
  
  return false;
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
