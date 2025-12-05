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

    // Helper to find answer by field ref
    const findAnswer = (ref: string) => {
      return answers.find((a: any) => a.field?.ref === ref)
    }

    // Map Typeform answers to caregiver fields - matching actual DB columns
    const caregiverData: Record<string, any> = {
      typeform_response_id: responseId,
      intake_completed_at: new Date().toISOString(),
    }

    // Process each answer based on field type and ref
    for (const answer of answers) {
      const ref = answer.field?.ref || ''
      const type = answer.type

      console.log(`Processing answer - ref: ${ref}, type: ${type}`)

      // Basic info
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

      // Address fields - matching actual DB columns
      if (ref.includes('address') && !ref.includes('line_2')) {
        caregiverData.address = answer.text
      }
      if (ref.includes('address_line_2')) {
        caregiverData.address_line_2 = answer.text
      }
      if (ref.includes('city') || ref.includes('town')) {
        caregiverData.city_town = answer.text
      }
      if (ref.includes('state') || ref.includes('region') || ref.includes('province')) {
        caregiverData.state_region_province = answer.text || answer.choice?.label
      }
      if (ref.includes('post_code') || ref.includes('zip')) {
        caregiverData.zip_post_code = answer.text
      }
      if (ref.includes('country')) {
        caregiverData.country = answer.text || answer.choice?.label
      }

      // Experience
      if (ref.includes('years') || ref.includes('experience')) {
        caregiverData.years_practicing = answer.text || answer.number?.toString()
      }
      if (ref.includes('births')) {
        caregiverData.births_supported = answer.text || answer.number?.toString()
      }
      if (ref.includes('care_style')) {
        caregiverData.care_style = answer.text || answer.choice?.label
      }
      if (ref.includes('certification') || ref.includes('training')) {
        caregiverData.certifications_training = answer.text || answer.choices?.labels?.join(', ')
      }

      // Role types (boolean flags)
      if (ref.includes('doula') || (type === 'choice' && answer.choice?.label?.toLowerCase().includes('doula'))) {
        caregiverData.is_doula = true
      }
      if (ref.includes('midwife') || (type === 'choice' && answer.choice?.label?.toLowerCase().includes('midwife'))) {
        caregiverData.is_private_midwife = true
      }
      if (ref.includes('lactation') || (type === 'choice' && answer.choice?.label?.toLowerCase().includes('lactation'))) {
        caregiverData.is_lactation_consultant = true
      }
      if (ref.includes('sleep') || (type === 'choice' && answer.choice?.label?.toLowerCase().includes('sleep'))) {
        caregiverData.is_sleep_consultant = true
      }
      if (ref.includes('hypnobirth') || (type === 'choice' && answer.choice?.label?.toLowerCase().includes('hypnobirth'))) {
        caregiverData.is_hypnobirthing_coach = true
      }
      if (ref.includes('bereavement') || (type === 'choice' && answer.choice?.label?.toLowerCase().includes('bereavement'))) {
        caregiverData.is_bereavement_councillor = true
      }

      // Languages (boolean flags)
      const handleLanguages = (labels: string[]) => {
        for (const lang of labels) {
          const l = lang.toLowerCase()
          if (l.includes('english')) caregiverData.speaks_english = true
          if (l.includes('french')) caregiverData.speaks_french = true
          if (l.includes('german')) caregiverData.speaks_german = true
          if (l.includes('spanish')) caregiverData.speaks_spanish = true
          if (l.includes('italian')) caregiverData.speaks_italian = true
          if (l.includes('punjabi')) caregiverData.speaks_punjabi = true
          if (l.includes('urdu')) caregiverData.speaks_urdu = true
          if (l.includes('arabic')) caregiverData.speaks_arabic = true
          if (l.includes('bengali')) caregiverData.speaks_bengali = true
          if (l.includes('gujarati') || l.includes('gujrati')) caregiverData.speaks_gujrati = true
          if (l.includes('portuguese')) caregiverData.speaks_portuguese = true
          if (l.includes('mandarin')) caregiverData.speaks_mandarin = true
        }
      }
      if (ref.includes('language')) {
        if (answer.choices?.labels) {
          handleLanguages(answer.choices.labels)
        } else if (answer.choice?.label) {
          handleLanguages([answer.choice.label])
        }
        // Store "other" languages
        if (answer.text) {
          caregiverData.language_other = answer.text
        }
      }

      // Services offered (boolean flags)
      const handleServices = (labels: string[]) => {
        for (const svc of labels) {
          const s = svc.toLowerCase()
          if (s.includes('birth planning')) caregiverData.offers_birth_planning = true
          if (s.includes('postnatal')) caregiverData.offers_postnatal_support = true
          if (s.includes('labour') || s.includes('labor')) caregiverData.offers_active_labour_support = true
          if (s.includes('fertility') || s.includes('conception')) caregiverData.offers_fertility_conception = true
          if (s.includes('nutrition')) caregiverData.offers_nutrition_support = true
          if (s.includes('lactation') || s.includes('feeding')) caregiverData.offers_lactation_support = true
          if (s.includes('sleep')) caregiverData.offers_newborn_sleep_support = true
          if (s.includes('hypnobirth')) caregiverData.offers_hypnobirthing = true
          if (s.includes('loss') || s.includes('bereavement')) caregiverData.offers_loss_bereavement_care = true
        }
      }
      if (ref.includes('service')) {
        if (answer.choices?.labels) {
          handleServices(answer.choices.labels)
        } else if (answer.choice?.label) {
          handleServices([answer.choice.label])
        }
        if (answer.text) {
          caregiverData.services_other = answer.text
        }
      }

      // Availability (boolean flags)
      const handleAvailability = (labels: string[]) => {
        for (const avail of labels) {
          const a = avail.toLowerCase()
          if (a.includes('weekday') && a.includes('morning')) caregiverData.avail_weekdays_mornings = true
          if (a.includes('weekday') && a.includes('afternoon')) caregiverData.avail_weekdays_afternoons = true
          if (a.includes('weekday') && a.includes('evening')) caregiverData.avail_weekdays_evenings = true
          if (a.includes('weekday') && a.includes('overnight')) caregiverData.avail_weekdays_overnight = true
          if (a.includes('weekend') && a.includes('morning')) caregiverData.avail_weekends_mornings = true
          if (a.includes('weekend') && a.includes('afternoon')) caregiverData.avail_weekends_afternoons = true
          if (a.includes('weekend') && a.includes('evening')) caregiverData.avail_weekends_evenings = true
          if (a.includes('weekend') && a.includes('overnight')) caregiverData.avail_weekends_overnight = true
          if (a.includes('school holiday')) caregiverData.unavailable_school_holidays = true
        }
      }
      if (ref.includes('availability') || ref.includes('avail')) {
        if (answer.choices?.labels) {
          handleAvailability(answer.choices.labels)
        } else if (answer.choice?.label) {
          handleAvailability([answer.choice.label])
        }
      }

      // Support specialties (boolean flags)
      const handleSupports = (labels: string[]) => {
        for (const sup of labels) {
          const s = sup.toLowerCase()
          if (s.includes('solo') || s.includes('single parent')) caregiverData.supports_solo_parents = true
          if (s.includes('multiple') || s.includes('twins')) caregiverData.supports_multiples = true
          if (s.includes('colour') || s.includes('color') || s.includes('bame') || s.includes('bipoc')) caregiverData.supports_families_of_colour = true
          if (s.includes('queer') || s.includes('lgbtq') || s.includes('trans')) caregiverData.supports_queer_trans = true
          if (s.includes('disabled')) caregiverData.supports_disabled_parents = true
          if (s.includes('neurodivergent') || s.includes('adhd') || s.includes('autism')) caregiverData.supports_neurodivergent = true
          if (s.includes('trauma')) caregiverData.supports_trauma_survivors = true
          if (s.includes('bereavement') || s.includes('loss')) caregiverData.supports_bereavement = true
          if (s.includes('immigrant') || s.includes('refugee')) caregiverData.supports_immigrant_refugee = true
          if (s.includes('complex health') || s.includes('high risk')) caregiverData.supports_complex_health = true
          if (s.includes('home birth')) caregiverData.supports_home_births = true
          if (s.includes('water birth')) caregiverData.supports_water_births = true
          if (s.includes('caesarean') || s.includes('c-section')) caregiverData.supports_caesareans = true
          if (s.includes('rebozo')) caregiverData.supports_rebozo = true
        }
      }
      if (ref.includes('support') || ref.includes('speciali')) {
        if (answer.choices?.labels) {
          handleSupports(answer.choices.labels)
        } else if (answer.choice?.label) {
          handleSupports([answer.choice.label])
        }
        if (answer.text) {
          caregiverData.support_type_other = answer.text
        }
      }

      // Care types (boolean flags)
      const handleCareTypes = (labels: string[]) => {
        for (const care of labels) {
          const c = care.toLowerCase()
          if (c.includes('antenatal') || c.includes('prenatal')) caregiverData.care_antenatal_planning = true
          if (c.includes('birth support') || c.includes('labour') || c.includes('labor')) caregiverData.care_birth_support = true
          if (c.includes('postnatal') || c.includes('postpartum')) caregiverData.care_postnatal_support = true
          if (c.includes('grief') || c.includes('loss')) caregiverData.care_grief_loss = true
          if (c.includes('full spectrum')) caregiverData.care_full_spectrum = true
          if (c.includes('fertility') || c.includes('conception')) caregiverData.care_fertility_conception = true
          if (c.includes('feeding') || c.includes('lactation')) caregiverData.care_feeding_lactation = true
          if (c.includes('cultural') || c.includes('spiritual')) caregiverData.care_cultural_spiritual = true
        }
      }
      if (ref.includes('care_type') || ref.includes('care type')) {
        if (answer.choices?.labels) {
          handleCareTypes(answer.choices.labels)
        } else if (answer.choice?.label) {
          handleCareTypes([answer.choice.label])
        }
      }

      // GDPR consent
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
