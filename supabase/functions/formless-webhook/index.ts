import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Formless webhook received request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Process the payload
    const data = payload.form_response ? await processFormResponse(payload) : processSimplePayload(payload);
    
    if (detectCaregiverSubmission(data)) {
      return new Response(
        JSON.stringify({ error: 'Caregiver submission - route to typeform-webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parentRequest = mapToParentRequest(data);
    
    if (!parentRequest.email && !parentRequest.first_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: result, error } = await supabase
      .from('parent_requests')
      .insert(parentRequest)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function processFormResponse(payload: any): Record<string, string> {
  const formResponse = payload.form_response;
  const answers = formResponse.answers || [];
  const fields = formResponse.definition?.fields || [];
  
  const fieldMap: Record<string, string> = {};
  for (const field of fields) {
    if (field.id && field.title) fieldMap[field.id] = field.title.toLowerCase();
  }

  const data: Record<string, string> = {};
  for (const answer of answers) {
    const title = fieldMap[answer.field?.id] || '';
    let value = '';
    if (answer.type === 'text') value = answer.text;
    else if (answer.type === 'email') value = answer.email;
    else if (answer.type === 'phone_number') value = answer.phone_number;
    else if (answer.type === 'choice') value = answer.choice?.label || '';
    else if (answer.type === 'date') value = answer.date;
    if (title && value) data[title] = value;
  }
  return data;
}

function processSimplePayload(payload: any): Record<string, string> {
  const answers = payload.answers || payload.data || payload;
  const data: Record<string, string> = {};
  
  if (Array.isArray(answers)) {
    for (const a of answers) {
      const q = (a.question || a.title || a.field || a.name || '').toLowerCase();
      const v = a.answer || a.value || a.text || '';
      if (q && v) data[q] = v;
    }
  } else if (typeof answers === 'object') {
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v === 'string') data[k.toLowerCase()] = v;
    }
  }
  return data;
}

function detectCaregiverSubmission(data: Record<string, string>): boolean {
  const indicators = ['midwife', 'years practicing', 'hourly rate', 'certifications', 'births supported'];
  const text = Object.entries(data).map(([k, v]) => `${k} ${v}`).join(' ').toLowerCase();
  return indicators.filter(i => text.includes(i)).length >= 2;
}

function mapToParentRequest(data: Record<string, string>) {
  const result: Record<string, any> = { status: 'new' };
  
  for (const [q, v] of Object.entries(data)) {
    const key = q.toLowerCase();
    
    // Extract email from any field
    const emailMatch = v.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !result.email) result.email = emailMatch[0].toLowerCase();
    
    // Handle combined "name" field - split into first/last
    if ((key === 'name' || key.includes('full name')) && v.length < 100 && !result.first_name) {
      const parts = v.trim().split(/\s+/);
      result.first_name = parts[0];
      if (parts.length > 1) result.last_name = parts.slice(1).join(' ');
    }
    if (key.includes('first_name') || key.includes('first name')) result.first_name = v.trim();
    if (key.includes('last_name') || key.includes('last name')) result.last_name = v.trim();
    if (key.includes('phone') && !result.phone) result.phone = v;
    if ((key.includes('support_type') || key.includes('support type') || key === 'support') && v.length < 100) result.support_type = v;
    if (key.includes('location') && v.length < 100) result.location = v;
    if (key.includes('due_date') || key.includes('due date')) result.due_date = v;
    if (key.includes('budget')) result.budget = v;
    if (key.includes('concerns') || key.includes('challenges')) result.specific_concerns = v;
    if (key.includes('stage_of_journey') || key.includes('stage') || key.includes('how far along')) result.stage_of_journey = v;
    if (key.includes('family_context') || key.includes('family context')) result.family_context = v;
    if (key.includes('caregiver_preference') || key.includes('caregiver preference') || key.includes('preferences')) result.caregiver_preferences = v;
    if (key.includes('preferred_communication') || key.includes('communication')) result.preferred_communication = v;
    if (key.includes('general_availability') || key.includes('availability')) result.general_availability = v;
  }
  
  // Extract support type from text
  const allText = Object.values(data).join(' ').toLowerCase();
  if (!result.support_type) {
    if (allText.includes('doula')) result.support_type = 'doula';
    else if (allText.includes('lactation')) result.support_type = 'lactation';
    else if (allText.includes('sleep')) result.support_type = 'sleep';
    else if (allText.includes('hypnobirthing')) result.support_type = 'hypnobirthing';
  }
  
  return result;
}
