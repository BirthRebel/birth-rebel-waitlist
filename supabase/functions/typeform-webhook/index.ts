import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, typeform-signature',
}

// Verify Typeform webhook signature
async function verifyTypeformSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) {
    console.error('No signature provided in request')
    return false
  }

  // Typeform sends signature as "sha256=<hash>"
  const expectedPrefix = 'sha256='
  if (!signature.startsWith(expectedPrefix)) {
    console.error('Invalid signature format')
    return false
  }

  const receivedHash = signature.slice(expectedPrefix.length)
  const computedHash = createHmac('sha256', secret)
    .update(payload)
    .digest('base64')

  return receivedHash === computedHash
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Verify webhook signature
    const signature = req.headers.get('typeform-signature')
    const webhookSecret = Deno.env.get('TYPEFORM_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      console.error('TYPEFORM_WEBHOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isValid = await verifyTypeformSignature(rawBody, signature, webhookSecret)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Webhook signature verified successfully')
    
    const payload = JSON.parse(rawBody)
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

    // Helper to parse date from various formats
    const parseDate = (value: string | undefined): string | undefined => {
      if (!value) return undefined
      // Try to parse common date formats
      const dateMatch = value.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/)
      if (dateMatch) {
        const dateStr = dateMatch[0]
        // Handle DD/MM/YYYY or DD-MM-YYYY format
        if (dateStr.includes('/') || (dateStr.includes('-') && dateStr.indexOf('-') === 2)) {
          const parts = dateStr.split(/[\/\-]/)
          return `${parts[2]}-${parts[1]}-${parts[0]}` // Convert to YYYY-MM-DD
        }
        return dateStr // Already YYYY-MM-DD
      }
      return undefined
    }

    // Process each answer based on field title (more reliable than ref)
    for (const answer of answers) {
      const ref = answer.field?.ref || ''
      const type = answer.type
      const fieldTitle = fieldTitleMap[ref] || ''

      console.log(`Processing answer - ref: ${ref}, type: ${type}, title: ${fieldTitle}, answer:`, JSON.stringify(answer, null, 2))

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
      // Match "What are your pronouns?"
      if (fieldTitle.includes('pronoun')) {
        caregiverData.pronouns = answer.text || answer.choice?.label
        console.log('Matched pronouns:', caregiverData.pronouns)
      }

      // Address fields
      if ((fieldTitle.includes('address') && !fieldTitle.includes('email')) && !fieldTitle.includes('line 2')) {
        caregiverData.address = answer.text
        console.log('Matched address:', answer.text)
      }
      if (fieldTitle.includes('address line 2') || fieldTitle.includes('address_line_2')) {
        caregiverData.address_line_2 = answer.text
        console.log('Matched address_line_2:', answer.text)
      }
      if (fieldTitle.includes('city') || fieldTitle.includes('town')) {
        caregiverData.city_town = answer.text
        console.log('Matched city_town:', answer.text)
      }
      if (fieldTitle.includes('state') || fieldTitle.includes('region') || fieldTitle.includes('province')) {
        caregiverData.state_region_province = answer.text || answer.choice?.label
        console.log('Matched state_region_province:', caregiverData.state_region_province)
      }
      if (fieldTitle.includes('post') || fieldTitle.includes('zip')) {
        caregiverData.zip_post_code = answer.text
        console.log('Matched zip_post_code:', answer.text)
      }
      if (fieldTitle.includes('country')) {
        caregiverData.country = answer.text || answer.choice?.label
        console.log('Matched country:', caregiverData.country)
      }

      // Experience - "How many years have you been practicing as a maternity caregiver"
      if (fieldTitle.includes('years') && (fieldTitle.includes('practic') || fieldTitle.includes('maternity caregiver'))) {
        caregiverData.years_practicing = answer.text || answer.choice?.label || answer.number?.toString()
        console.log('Matched years_practicing:', caregiverData.years_practicing)
      }
      // "How many births have you supported?"
      if (fieldTitle.includes('births') && fieldTitle.includes('support')) {
        caregiverData.births_supported = answer.text || answer.choice?.label || answer.number?.toString()
        console.log('Matched births_supported:', caregiverData.births_supported)
      }
      // "How would you describe your care style?"
      if (fieldTitle.includes('care style') || fieldTitle.includes('describe your care')) {
        caregiverData.care_style = answer.text || answer.choice?.label
        console.log('Matched care_style:', caregiverData.care_style)
      }
      // "What certifications or training do you hold?"
      if (fieldTitle.includes('certification') || fieldTitle.includes('training do you hold')) {
        caregiverData.certifications_training = answer.text || answer.choices?.labels?.join(', ')
        console.log('Matched certifications_training:', caregiverData.certifications_training)
      }

      // File uploads - match exact Typeform field titles
      if (type === 'file_upload' && answer.file_url) {
        console.log('Processing file upload - title:', fieldTitle, 'url:', answer.file_url)
        
        // "Please upload training certificates" 
        if (fieldTitle.includes('upload training') || fieldTitle.includes('training certificate')) {
          caregiverData.training_certificate_url = answer.file_url
          console.log('Matched training_certificate_url:', answer.file_url)
        } 
        // "Please add DBS certificates"
        else if (fieldTitle.includes('dbs')) {
          caregiverData.dbs_certificate_url = answer.file_url
          console.log('Matched dbs_certificate_url:', answer.file_url)
        } 
        // "Please add insurance certificates"
        else if (fieldTitle.includes('insurance')) {
          caregiverData.insurance_certificate_url = answer.file_url
          console.log('Matched insurance_certificate_url:', answer.file_url)
        } 
        // "Additional training certificates (optional)" - there are 2 of these
        else if (fieldTitle.includes('additional')) {
          if (!caregiverData.additional_certificate_1_url) {
            caregiverData.additional_certificate_1_url = answer.file_url
            console.log('Matched additional_certificate_1_url:', answer.file_url)
          } else if (!caregiverData.additional_certificate_2_url) {
            caregiverData.additional_certificate_2_url = answer.file_url
            console.log('Matched additional_certificate_2_url:', answer.file_url)
          }
        }
        // Fallback for any other file uploads
        else {
          if (!caregiverData.additional_certificate_1_url) {
            caregiverData.additional_certificate_1_url = answer.file_url
            console.log('Fallback matched additional_certificate_1_url:', answer.file_url)
          } else if (!caregiverData.additional_certificate_2_url) {
            caregiverData.additional_certificate_2_url = answer.file_url
            console.log('Fallback matched additional_certificate_2_url:', answer.file_url)
          }
        }
      }

      // Caregiver types (from multiple choice) - can be individual fields or grouped
      // Check for grouped question first
      if (fieldTitle.includes('type of caregiver') || fieldTitle.includes('what type')) {
        console.log('Processing caregiver type answer:', JSON.stringify(answer, null, 2))
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
        const otherText = answer.choices?.other || answer.choice?.other || answer.other || answer.text
        if (otherText && !labels.some(l => l.toLowerCase() === otherText.toLowerCase())) {
          caregiverData.support_type_other = otherText
          console.log('Captured support_type_other:', otherText)
        }
      }
      
      // Individual caregiver type fields (Typeform may send each as separate field)
      if (fieldTitle === 'doula' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.is_doula = true
        console.log('Matched is_doula from individual field')
      }
      if (fieldTitle === 'private midwife' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.is_private_midwife = true
        console.log('Matched is_private_midwife from individual field')
      }
      if (fieldTitle === 'lactation consultant' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.is_lactation_consultant = true
        console.log('Matched is_lactation_consultant from individual field')
      }
      if (fieldTitle === 'sleep consultant' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.is_sleep_consultant = true
        console.log('Matched is_sleep_consultant from individual field')
      }
      if (fieldTitle === 'hypnobirthing coach' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.is_hypnobirthing_coach = true
        console.log('Matched is_hypnobirthing_coach from individual field')
      }
      if (fieldTitle === 'bereavement councillor' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.is_bereavement_councillor = true
        console.log('Matched is_bereavement_councillor from individual field')
      }

      // Languages - can be grouped or individual fields
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
          console.log('Matched language_other:', answer.choices.other)
        }
      }
      
      // Individual language fields
      if (fieldTitle === 'english' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_english = true
      }
      if (fieldTitle === 'french' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_french = true
      }
      if (fieldTitle === 'german' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_german = true
      }
      if (fieldTitle === 'spanish' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_spanish = true
      }
      if (fieldTitle === 'italian' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_italian = true
      }
      if (fieldTitle === 'punjabi' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_punjabi = true
      }
      if (fieldTitle === 'urdu' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_urdu = true
      }
      if (fieldTitle === 'arabic' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_arabic = true
      }
      if (fieldTitle === 'bengali' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_bengali = true
      }
      if ((fieldTitle === 'gujarati' || fieldTitle === 'gujrati') && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_gujrati = true
      }
      if (fieldTitle === 'portuguese' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_portuguese = true
      }
      if (fieldTitle === 'mandarin' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.speaks_mandarin = true
      }

      // Services offered - grouped or individual
      if (fieldTitle.includes('service') || fieldTitle.includes('what type of service')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
        for (const svc of labels) {
          const s = svc.toLowerCase()
          if (s.includes('birth planning') || s.includes('signposting')) caregiverData.offers_birth_planning = true
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
          console.log('Matched services_other:', answer.choices.other)
        }
      }
      
      // Individual service fields from Typeform
      if (fieldTitle === 'birth planning & signposting' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_birth_planning = true
      }
      if (fieldTitle === 'postnatal support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_postnatal_support = true
      }
      if (fieldTitle === 'support during active labour' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_active_labour_support = true
      }
      if (fieldTitle === 'fertility & conception' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_fertility_conception = true
      }
      if (fieldTitle === 'nutrition support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_nutrition_support = true
      }
      if (fieldTitle === 'lactation support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_lactation_support = true
      }
      if (fieldTitle === 'newborn sleep support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_newborn_sleep_support = true
      }
      if (fieldTitle === 'hypnobirthing' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_hypnobirthing = true
      }
      if (fieldTitle === 'loss & bereavement care' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.offers_loss_bereavement_care = true
      }

      // Availability - grouped or individual
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
      
      // Individual availability fields
      if (fieldTitle === 'weekdays: mornings' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekdays_mornings = true
      }
      if (fieldTitle === 'weekdays: afternoons' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekdays_afternoons = true
      }
      if (fieldTitle === 'weekdays: evenings' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekdays_evenings = true
      }
      if (fieldTitle === 'weekdays: overnight' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekdays_overnight = true
      }
      if (fieldTitle === 'weekends: mornings' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekends_mornings = true
      }
      if (fieldTitle === 'weekends: afternoons' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekends_afternoons = true
      }
      if (fieldTitle === 'weekends: evenings' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekends_evenings = true
      }
      if (fieldTitle === 'weekends: overnight' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.avail_weekends_overnight = true
      }
      if (fieldTitle.includes('not available during school holidays') && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.unavailable_school_holidays = true
      }

      // Support specialties - grouped or individual
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
      
      // Individual support specialty fields
      if (fieldTitle === 'solo parents' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_solo_parents = true
      }
      if (fieldTitle === 'multiples (e.g. twins)' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_multiples = true
      }
      if (fieldTitle === 'families of colour' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_families_of_colour = true
      }
      if (fieldTitle === 'queer and/or trans families' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_queer_trans = true
      }
      if (fieldTitle === 'disabled parents' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_disabled_parents = true
      }
      if (fieldTitle === 'neurodivergent clients' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_neurodivergent = true
      }
      if (fieldTitle.includes('survivors of trauma') && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_trauma_survivors = true
      }
      if (fieldTitle.includes('bereavement from previous') && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_bereavement = true
      }
      if (fieldTitle === 'immigrant or refugee families' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_immigrant_refugee = true
      }
      if (fieldTitle === 'clients with complex health needs' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_complex_health = true
      }
      
      // Birth types - individual fields
      if (fieldTitle === 'home births' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_home_births = true
      }
      if (fieldTitle === 'water births' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_water_births = true
      }
      if (fieldTitle === 'caesareans' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_caesareans = true
      }
      if (fieldTitle === 'rebozo' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.supports_rebozo = true
      }

      // Birth types supported - grouped
      if (fieldTitle.includes('birth type') || fieldTitle.includes('type of birth')) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
        for (const bt of labels) {
          const b = bt.toLowerCase()
          if (b.includes('home')) caregiverData.supports_home_births = true
          if (b.includes('water')) caregiverData.supports_water_births = true
          if (b.includes('caesarean') || b.includes('c-section')) caregiverData.supports_caesareans = true
        }
      }

      // Care types - grouped or individual
      if (fieldTitle.includes('care') && (fieldTitle.includes('type') || fieldTitle.includes('stage'))) {
        const labels = answer.choices?.labels || (answer.choice?.label ? [answer.choice.label] : [])
        for (const care of labels) {
          const c = care.toLowerCase()
          if (c.includes('antenatal') || c.includes('prenatal') || c.includes('planning')) caregiverData.care_antenatal_planning = true
          if (c.includes('birth support') || c.includes('labour') || c.includes('labor')) caregiverData.care_birth_support = true
          if (c.includes('postnatal') || c.includes('postpartum')) caregiverData.care_postnatal_support = true
          if (c.includes('grief') || c.includes('loss')) caregiverData.care_grief_loss = true
          if (c.includes('full spectrum')) caregiverData.care_full_spectrum = true
          if (c.includes('fertility') || c.includes('conception')) caregiverData.care_fertility_conception = true
          if (c.includes('feeding') || c.includes('lactation')) caregiverData.care_feeding_lactation = true
          if (c.includes('cultural') || c.includes('spiritual') || c.includes('ritual')) caregiverData.care_cultural_spiritual = true
        }
      }
      
      // Individual care type fields from Typeform CSV
      if (fieldTitle === 'antenatal planning, signposting & information' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_antenatal_planning = true
      }
      if (fieldTitle === 'birth support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_birth_support = true
      }
      // Note: "Postnatal support" is also a care type (different from service)
      if (fieldTitle === 'grief & loss care' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_grief_loss = true
      }
      if (fieldTitle === 'full-spectrum reproductive support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_full_spectrum = true
      }
      if (fieldTitle === 'fertility & conception support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_fertility_conception = true
      }
      if (fieldTitle === 'feeding and lactation support' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_feeding_lactation = true
      }
      if (fieldTitle === 'cultural, ritual or spiritual practices' && (answer.boolean === true || answer.choice?.label)) {
        caregiverData.care_cultural_spiritual = true
      }

      // GDPR consent - match the exact long title
      if (fieldTitle.includes('gdpr') || (fieldTitle.includes('consent') && !fieldTitle.includes('code of conduct')) || fieldTitle.includes('data protection')) {
        caregiverData.gdpr_consent = answer.boolean === true || 
          answer.choice?.label?.toLowerCase().includes('understand') ||
          answer.choice?.label?.toLowerCase().includes('yes') || 
          answer.choice?.label?.toLowerCase().includes('agree')
        console.log('Matched gdpr_consent:', caregiverData.gdpr_consent)
      }

      // Code of Conduct acceptance (Question 20)
      if (fieldTitle.includes('code of conduct') || fieldTitle.includes('birth rebel values') || fieldTitle.includes('birth rebel\'s values')) {
        const accepted = answer.boolean === true || 
          answer.choice?.label?.toLowerCase().includes('yes') || 
          answer.choice?.label?.toLowerCase().includes('agree') ||
          answer.choice?.label?.toLowerCase().includes('i accept') ||
          answer.choice?.label?.toLowerCase().includes('i understand')
        if (accepted) {
          caregiverData.code_of_conduct_accepted = true
          caregiverData.code_of_conduct_accepted_at = new Date().toISOString()
        }
        console.log('Matched code_of_conduct_accepted:', accepted)
      }

      // Pricing fields
      if (fieldTitle === 'how much do you charge for a single 1 hour virtual session?') {
        const textValue = answer.text || answer.number?.toString() || ''
        const numericValue = parseFloat(textValue.replace(/[^0-9.]/g, ''))
        if (!isNaN(numericValue)) {
          caregiverData.hourly_rate = numericValue
          console.log('Matched hourly_rate:', numericValue)
        }
      }
      if (fieldTitle === 'for doulas only- how much do (or would) you charge for a virtual full-doula package?') {
        const textValue = answer.text || answer.number?.toString() || ''
        const numericValue = parseFloat(textValue.replace(/[^0-9.]/g, ''))
        if (!isNaN(numericValue)) {
          caregiverData.doula_package_rate = numericValue
          console.log('Matched doula_package_rate:', numericValue)
        }
      }

      // Document expiration dates
      if (fieldTitle.includes('training') && fieldTitle.includes('expir')) {
        const expiryDate = parseDate(answer.text || answer.date)
        if (expiryDate) caregiverData.training_certificate_expires = expiryDate
        console.log('Matched training_certificate_expires:', expiryDate)
      }
      if (fieldTitle.includes('insurance') && fieldTitle.includes('expir')) {
        const expiryDate = parseDate(answer.text || answer.date)
        if (expiryDate) caregiverData.insurance_certificate_expires = expiryDate
        console.log('Matched insurance_certificate_expires:', expiryDate)
      }
      if (fieldTitle.includes('dbs') && fieldTitle.includes('expir')) {
        const expiryDate = parseDate(answer.text || answer.date)
        if (expiryDate) caregiverData.dbs_certificate_expires = expiryDate
        console.log('Matched dbs_certificate_expires:', expiryDate)
      }
      if ((fieldTitle.includes('certificate') || fieldTitle.includes('certification')) && fieldTitle.includes('expir')) {
        const expiryDate = parseDate(answer.text || answer.date)
        if (expiryDate && !caregiverData.additional_certificate_1_expires) {
          caregiverData.additional_certificate_1_expires = expiryDate
          console.log('Matched additional_certificate_1_expires:', expiryDate)
        } else if (expiryDate && !caregiverData.additional_certificate_2_expires) {
          caregiverData.additional_certificate_2_expires = expiryDate
          console.log('Matched additional_certificate_2_expires:', expiryDate)
        }
      }
      
      // Log unmatched fields for debugging
      if (!Object.keys(caregiverData).some(key => key !== 'typeform_response_id' && key !== 'intake_completed_at')) {
        console.log('UNMATCHED FIELD - title:', fieldTitle, 'type:', type)
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