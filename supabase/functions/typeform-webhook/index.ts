import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Typeform webhook received:', JSON.stringify(payload, null, 2))

    // Extract form response data
    const formResponse = payload.form_response
    if (!formResponse) {
      console.error('No form_response in payload')
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const answers = formResponse.answers || []
    const responseId = formResponse.token

    // Helper to find answer by field ref or type
    const findAnswer = (ref: string) => {
      return answers.find((a: any) => a.field?.ref === ref)
    }

    // Map Typeform answers to caregiver fields
    // You'll need to update these field refs to match your Typeform form
    const caregiverData: Record<string, any> = {
      typeform_response_id: responseId,
      intake_completed_at: new Date().toISOString(),
    }

    // Process each answer based on field type and ref
    for (const answer of answers) {
      const ref = answer.field?.ref || ''
      const type = answer.type

      console.log(`Processing answer - ref: ${ref}, type: ${type}`)

      // Map common field patterns (adjust refs to match your Typeform)
      if (ref.includes('name') || ref.includes('full_name')) {
        caregiverData.name = answer.text || `${answer.first_name || ''} ${answer.last_name || ''}`.trim()
      }
      if (ref.includes('first_name')) {
        caregiverData.first_name = answer.text
      }
      if (ref.includes('last_name')) {
        caregiverData.last_name = answer.text
      }
      if (ref.includes('email')) {
        caregiverData.email = answer.email || answer.text
      }
      if (ref.includes('phone')) {
        caregiverData.phone = answer.phone_number || answer.text
      }
      if (ref.includes('pronouns')) {
        caregiverData.pronouns = answer.text || answer.choice?.label
      }
      if (ref.includes('years') || ref.includes('experience')) {
        caregiverData.years_practicing = parseInt(answer.number || answer.text) || null
      }
      if (ref.includes('births')) {
        caregiverData.births_supported = parseInt(answer.number || answer.text) || null
      }
      if (ref.includes('support_type') || ref.includes('type_of_support')) {
        const supportType = answer.choice?.label?.toLowerCase() || answer.text?.toLowerCase()
        if (supportType?.includes('doula')) {
          caregiverData.type_of_support = 'doula'
        } else if (supportType?.includes('midwife')) {
          caregiverData.type_of_support = 'midwife'
        }
      }
      if (ref.includes('care_style')) {
        caregiverData.care_style = answer.text || answer.choice?.label
      }
      if (ref.includes('address') && !ref.includes('line_2')) {
        caregiverData.address_line_1 = answer.text
      }
      if (ref.includes('address_line_2')) {
        caregiverData.address_line_2 = answer.text
      }
      if (ref.includes('city')) {
        caregiverData.city = answer.text
      }
      if (ref.includes('state') || ref.includes('county')) {
        caregiverData.state = answer.text || answer.choice?.label
      }
      if (ref.includes('post_code') || ref.includes('zip')) {
        caregiverData.post_code = answer.text
      }
      if (ref.includes('country')) {
        caregiverData.country = answer.text || answer.choice?.label
      }
      if (ref.includes('language')) {
        caregiverData.language_spoken = answer.choices?.labels || [answer.choice?.label].filter(Boolean)
      }
      if (ref.includes('certification') || ref.includes('training')) {
        caregiverData.training_certifications = answer.choices?.labels || [answer.choice?.label].filter(Boolean)
      }
      if (ref.includes('services')) {
        caregiverData.services_offered = answer.choices?.labels || [answer.choice?.label].filter(Boolean)
      }
      if (ref.includes('availability')) {
        caregiverData.typical_availability = answer.text || answer.choice?.label
      }
      if (ref.includes('gdpr') || ref.includes('consent')) {
        caregiverData.gdpr_consent = answer.boolean === true || answer.choice?.label?.toLowerCase() === 'yes'
      }
    }

    // Validate required fields
    if (!caregiverData.email) {
      console.error('Missing required email field')
      return new Response(JSON.stringify({ error: 'Missing required email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!caregiverData.name) {
      caregiverData.name = caregiverData.email.split('@')[0]
    }

    if (!caregiverData.type_of_support) {
      caregiverData.type_of_support = 'doula' // Default
    }

    console.log('Caregiver data to insert:', JSON.stringify(caregiverData, null, 2))

    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if caregiver already exists by email or typeform_response_id
    const { data: existing } = await supabase
      .from('caregivers')
      .select('id')
      .or(`email.eq.${caregiverData.email},typeform_response_id.eq.${responseId}`)
      .maybeSingle()

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('caregivers')
        .update(caregiverData)
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating caregiver:', updateError)
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('Updated existing caregiver:', existing.id)
      return new Response(JSON.stringify({ success: true, action: 'updated', id: existing.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert new caregiver without user_id (will be linked when they create account)
    const { data: newCaregiver, error: insertError } = await supabase
      .from('caregivers')
      .insert(caregiverData)
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting caregiver:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Created new caregiver:', newCaregiver.id)
    return new Response(JSON.stringify({ success: true, action: 'created', id: newCaregiver.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
