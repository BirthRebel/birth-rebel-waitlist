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
    const definition = formResponse.definition || {}
    const fields = definition.fields || []
    const responseId = formResponse.token

    // Build a map of field ref -> field title for easier matching
    const fieldTitleMap: Record<string, string> = {}
    for (const field of fields) {
      if (field.ref && field.title) {
        fieldTitleMap[field.ref] = field.title.toLowerCase()
      }
    }
    console.log('Field title map:', JSON.stringify(fieldTitleMap, null, 2))

    // Map Typeform answers to caregiver fields - matching actual DB columns
    const caregiverData: Record<string, any> = {
      typeform_response_id: responseId,
      intake_completed_at: new Date().toISOString(),
    }

    // Process each answer based on field title (more reliable than ref)
    for (const answer of answers) {
      const ref = answer.field?.ref || ''
      const type = answer.type
      const fieldTitle = fieldTitleMap[ref] || ''

      console.log(`Processing answer - ref: ${ref}, type: ${type}, title: ${fieldTitle}`)

      // Basic info - match by field title
      if (fieldTitle.includes('first name')) {
        caregiverData.first_name = answer.text
        console.log('Matched first_name:', answer.text)
      }
      if (fieldTitle.includes('last name')) {
        caregiverData.last_name = answer.text
        console.log('Matched last_name:', answer.text)
      }
      if (fieldTitle.includes('email') || type === 'email') {
        caregiverData.email = answer.email || answer.text
        console.log('Matched email:', caregiverData.email)
      }
      if (fieldTitle.includes('phone') || type === 'phone_number') {
        caregiverData.phone = answer.phone_number || answer.text
        console.log('Matched phone:', caregiverData.phone)
      }
      if (fieldTitle.includes('pronoun')) {
        caregiverData.pronouns = answer.text || answer.choice?.label
        console.log('Matched pronouns:', caregiverData.pronouns)
      }

      // Address fields
      if ((fieldTitle.includes('address') && !fieldTitle.includes('email')) && !fieldTitle.includes('line 2')) {
        caregiverData.address = answer.text
      }
      if (fieldTitle.includes('address line 2') || fieldTitle.includes('address_line_2')) {
        caregiverData.address_line_2 = answer.text
      }
      if (fieldTitle.includes('city') || fieldTitle.includes('town')) {
        caregiverData.city_town = answer.text
      }
      if (fieldTitle.includes('state') || fieldTitle.includes('region') || fieldTitle.includes('province')) {
        caregiverData.state_region_province = answer.text || answer.choice?.label
      }
      if (fieldTitle.includes('post') || fieldTitle.includes('zip')) {
        caregiverData.zip_post_code = answer.text
      }
      if (fieldTitle.includes('country')) {
        caregiverData.country = answer.text || answer.choice?.label
      }

      // Experience
      if (fieldTitle.includes('years') && fieldTitle.includes('practic')) {
        caregiverData.years_practicing = answer.text || answer.choice?.label || answer.number?.toString()
      }
      if (fieldTitle.includes('births') && fieldTitle.includes('support')) {
        caregiverData.births_supported = answer.text || answer.choice?.label || answer.number?.toString()
      }
      if (fieldTitle.includes('care style')) {
        caregiverData.care_style = answer.text || answer.choice?.label
      }
      if (fieldTitle.includes('certification') || fieldTitle.includes('training')) {
        caregiverData.certifications_training = answer.text || answer.choices?.labels?.join(', ')
      }

      // Caregiver types (from multiple choice)
      if (fieldTitle.includes('type of caregiver') || fieldTitle.includes('what type')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
        for (const label of labels) {
          const l = label.toLowerCase()
          if (l.includes('doula')) caregiverData.is_doula = true
          if (l.includes('midwife')) caregiverData.is_private_midwife = true
          if (l.includes('lactation')) caregiverData.is_lactation_consultant = true
          if (l.includes('sleep')) caregiverData.is_sleep_consultant = true
          if (l.includes('hypnobirth')) caregiverData.is_hypnobirthing_coach = true
          if (l.includes('bereavement')) caregiverData.is_bereavement_councillor = true
        }
        // Handle "other" text
        if (answer.choices?.other) {
          caregiverData.support_type_other = answer.choices.other
        }
      }

      // Languages
      if (fieldTitle.includes('language')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
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
        if (answer.choices?.other) {
          caregiverData.language_other = answer.choices.other
        }
      }

      // Services offered
      if (fieldTitle.includes('service') || fieldTitle.includes('what type of service')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
        for (const svc of labels) {
          const s = svc.toLowerCase()
          if (s.includes('birth planning')) caregiverData.offers_birth_planning = true
          if (s.includes('postnatal')) caregiverData.offers_postnatal_support = true
          if (s.includes('labour') || s.includes('labor') || s.includes('active')) caregiverData.offers_active_labour_support = true
          if (s.includes('fertility') || s.includes('conception')) caregiverData.offers_fertility_conception = true
          if (s.includes('nutrition')) caregiverData.offers_nutrition_support = true
          if (s.includes('lactation') || s.includes('feeding')) caregiverData.offers_lactation_support = true
          if (s.includes('sleep')) caregiverData.offers_newborn_sleep_support = true
          if (s.includes('hypnobirth')) caregiverData.offers_hypnobirthing = true
          if (s.includes('loss') || s.includes('bereavement')) caregiverData.offers_loss_bereavement_care = true
        }
        if (answer.choices?.other) {
          caregiverData.services_other = answer.choices.other
        }
      }

      // Availability
      if (fieldTitle.includes('availability') || fieldTitle.includes('available')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
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

      // Support specialties
      if (fieldTitle.includes('communities') || fieldTitle.includes('speciali') || fieldTitle.includes('experience supporting')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
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

      // Birth types supported
      if (fieldTitle.includes('birth type') || fieldTitle.includes('type of birth')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
        for (const bt of labels) {
          const b = bt.toLowerCase()
          if (b.includes('home')) caregiverData.supports_home_births = true
          if (b.includes('water')) caregiverData.supports_water_births = true
          if (b.includes('caesarean') || b.includes('c-section')) caregiverData.supports_caesareans = true
        }
      }

      // Care types
      if (fieldTitle.includes('care') && (fieldTitle.includes('type') || fieldTitle.includes('stage'))) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
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

      // GDPR consent
      if (fieldTitle.includes('gdpr') || fieldTitle.includes('consent') || fieldTitle.includes('agree')) {
        caregiverData.gdpr_consent = answer.boolean === true || answer.choice?.label?.toLowerCase() === 'yes' || answer.choice?.label?.toLowerCase().includes('agree')
      }
    }

    // Validate required fields
    if (!caregiverData.email) {
      console.error('Missing required email field. Caregiver data collected:', JSON.stringify(caregiverData, null, 2))
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