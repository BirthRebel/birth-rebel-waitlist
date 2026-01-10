import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// EXACT Typeform CSV column headers mapped to database columns
// Keys must be EXACTLY as they appear in the CSV (case-insensitive matching done later)
const columnMapping: Record<string, string> = {
  // Basic info
  '#': 'typeform_response_id',
  'What are your pronouns?': 'pronouns',
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Email Address': 'email',
  'Phone number': 'phone',
  
  // Address
  'Address': 'address',
  'Address line 2': 'address_line_2',
  'City/Town': 'city_town',
  'State/Region/Province': 'state_region_province',
  'Zip/Post Code': 'zip_post_code',
  'Country': 'country',
  
  // Caregiver types - these are individual checkbox columns
  'Doula': 'is_doula',
  'Private midwife': 'is_private_midwife',
  'Lactation consultant': 'is_lactation_consultant',
  'Sleep consultant': 'is_sleep_consultant',
  'Hypnobirthing coach': 'is_hypnobirthing_coach',
  'Bereavement Councillor': 'is_bereavement_councillor',
  
  // Languages
  'English': 'speaks_english',
  'French': 'speaks_french',
  'German': 'speaks_german',
  'Spanish': 'speaks_spanish',
  'Italian': 'speaks_italian',
  'Punjabi': 'speaks_punjabi',
  'Urdu': 'speaks_urdu',
  'Arabic': 'speaks_arabic',
  'Bengali': 'speaks_bengali',
  'Gujrati': 'speaks_gujrati',
  'Portuguese': 'speaks_portuguese',
  'Mandarin': 'speaks_mandarin',
  
  // Experience/training
  'What certifications or training do you hold?': 'certifications_training',
  'How many years have you been practicing as a maternity caregiver': 'years_practicing',
  'How many births have you supported?': 'births_supported',
  
  // Services offered (these appear in "What services do you offer?" multi-select)
  'Birth planning & signposting': 'offers_birth_planning',
  'Support during active labour': 'offers_active_labour_support',
  'Fertility & conception': 'offers_fertility_conception',
  'Nutrition support': 'offers_nutrition_support',
  'Lactation support': 'offers_lactation_support',
  'Newborn sleep support': 'offers_newborn_sleep_support',
  'Hypnobirthing': 'offers_hypnobirthing',
  'Loss & bereavement care': 'offers_loss_bereavement_care',
  
  // Availability
  'Weekdays: Mornings': 'avail_weekdays_mornings',
  'Weekdays: Afternoons': 'avail_weekdays_afternoons',
  'Weekdays: Evenings': 'avail_weekdays_evenings',
  'Weekdays: Overnight': 'avail_weekdays_overnight',
  'Weekends: Mornings': 'avail_weekends_mornings',
  'Weekends: Afternoons': 'avail_weekends_afternoons',
  'Weekends: Evenings': 'avail_weekends_evenings',
  'Weekends: Overnight': 'avail_weekends_overnight',
  'I am generally not available during school holidays': 'unavailable_school_holidays',
  
  // Communities/support specialties
  'Solo parents': 'supports_solo_parents',
  'Multiples (e.g. twins)': 'supports_multiples',
  'Families of colour': 'supports_families_of_colour',
  'Queer and/or trans families': 'supports_queer_trans',
  'Disabled parents': 'supports_disabled_parents',
  'Neurodivergent clients': 'supports_neurodivergent',
  'Survivors of trauma/ trauma informed birth': 'supports_trauma_survivors',
  'Bereavement from previous births and/or pregnancies': 'supports_bereavement',
  'Immigrant or refugee families': 'supports_immigrant_refugee',
  'Clients with complex health needs': 'supports_complex_health',
  'Home births': 'supports_home_births',
  'Water births': 'supports_water_births',
  'Caesareans': 'supports_caesareans',
  'Rebozo': 'supports_rebozo',
  
  // Care types (different from services - this is "What type of care do you offer?")
  'Antenatal planning, signposting & information': 'care_antenatal_planning',
  'Birth support': 'care_birth_support',
  'Grief & loss care': 'care_grief_loss',
  'Full-spectrum reproductive support': 'care_full_spectrum',
  'Fertility & conception support': 'care_fertility_conception',
  'Feeding and lactation support': 'care_feeding_lactation',
  'Cultural, ritual or spiritual practices': 'care_cultural_spiritual',
  
  // Care style
  'How would you describe your care style?': 'care_style',
  
  // GDPR consent - header contains HTML but we'll match the start
  'To comply with UK data protection law, we need your permission to store and use the information you provide in this form.': 'gdpr_consent',
  
  // Document uploads
  'Please upload training certificates': 'training_certificate_url',
  'Additional training certificates (optional)': 'additional_certificate_1_url',
  'Please add DBS certificates.': 'dbs_certificate_url',
  'Please add insurance certificates': 'insurance_certificate_url',
}

// Track which columns are for "services offered" vs "care types" to handle the duplicate "Postnatal support"
// In the CSV, there are TWO "Postnatal support" columns - one for services and one for care types
// We need to track column position to differentiate them
const servicesColumns = [
  'Birth planning & signposting',
  'Postnatal support', // First one - maps to offers_postnatal_support
  'Support during active labour',
  'Fertility & conception',
  'Nutrition support',
  'Lactation support',
  'Newborn sleep support',
  'Hypnobirthing',
  'Loss & bereavement care',
]

const careTypeColumns = [
  'Antenatal planning, signposting & information',
  'Birth support',
  'Postnatal support', // Second one - maps to care_postnatal_support
  'Grief & loss care',
  'Full-spectrum reproductive support',
  'Fertility & conception support',
  'Feeding and lactation support',
  'Cultural, ritual or spiritual practices',
]

// Parse entire CSV content into rows, handling quoted fields with newlines
function parseCSVContent(content: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        // Escaped quote
        currentField += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || (char === '\r' && content[i + 1] === '\n')) && !inQuotes) {
      // End of row (handle both \n and \r\n)
      if (char === '\r') i++ // Skip \n in \r\n
      currentRow.push(currentField.trim())
      if (currentRow.some(f => f)) { // Only add non-empty rows
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else if (char === '\r' && !inQuotes) {
      // Handle standalone \r as newline
      currentRow.push(currentField.trim())
      if (currentRow.some(f => f)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else {
      currentField += char
    }
  }
  
  // Don't forget the last field/row
  currentRow.push(currentField.trim())
  if (currentRow.some(f => f)) {
    rows.push(currentRow)
  }
  
  return rows
}

function findMatchingColumn(header: string, allHeaders: string[], headerIndex: number): string | null {
  // Strip HTML tags and clean the header
  const cleanHeader = header.replace(/<[^>]*>/g, '').trim()
  
  // Direct case-insensitive match
  for (const [key, value] of Object.entries(columnMapping)) {
    if (cleanHeader.toLowerCase() === key.toLowerCase()) {
      return value
    }
  }
  
  // Handle the duplicate "Postnatal support" column - check position
  if (cleanHeader.toLowerCase() === 'postnatal support') {
    // Find all "Postnatal support" columns
    const postnatalIndices = allHeaders
      .map((h, i) => h.toLowerCase() === 'postnatal support' ? i : -1)
      .filter(i => i !== -1)
    
    if (postnatalIndices.length >= 2) {
      // First occurrence is services (offers_postnatal_support)
      // Second occurrence is care types (care_postnatal_support)
      if (headerIndex === postnatalIndices[0]) {
        return 'offers_postnatal_support'
      } else if (headerIndex === postnatalIndices[1]) {
        return 'care_postnatal_support'
      }
    } else {
      // Only one found, default to offers
      return 'offers_postnatal_support'
    }
  }
  
  // Partial match for GDPR consent (header may be truncated or have HTML)
  if (cleanHeader.toLowerCase().includes('comply with uk data protection') || 
      cleanHeader.toLowerCase().includes('gdpr') ||
      cleanHeader.toLowerCase().includes('permission to store')) {
    return 'gdpr_consent'
  }
  
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Verify authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use anon key client with user token to verify JWT via getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })
    
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token)
    
    if (authError || !claimsData?.claims) {
      console.error("Auth error:", authError)
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const userId = claimsData.claims.sub
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Check if user is admin
    const { data: hasAdminRole, error: roleError } = await supabase
      .rpc("has_role", { _user_id: userId, _role: "admin" })

    if (roleError || !hasAdminRole) {
      console.log("Admin access denied for user:", userId)
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { csvContent } = await req.json()
    
    if (!csvContent) {
      return new Response(JSON.stringify({ error: 'No CSV content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Admin', userId, 'initiated CSV import')
    
    // Parse CSV properly handling quoted fields with newlines
    const rows = parseCSVContent(csvContent)
    
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV must have header row and at least one data row' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const headers = rows[0]
    console.log('CSV headers:', JSON.stringify(headers))
    console.log('CSV headers count:', headers.length)
    console.log('Total data rows:', rows.length - 1)

    // Build column mapping for this CSV
    const csvColumnMap: { index: number; header: string; dbColumn: string | null }[] = []
    const unmatchedHeaders: string[] = []
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const dbColumn = findMatchingColumn(header, headers, i)
      
      csvColumnMap.push({
        index: i,
        header,
        dbColumn,
      })
      
      if (dbColumn) {
        console.log(`✓ [${i}] "${header}" -> ${dbColumn}`)
      } else {
        // Skip known non-data columns
        const lowerHeader = header.toLowerCase()
        if (!['other', 'response type', 'start date (utc)', 'stage date (utc)', 'submit date (utc)', 'network id', 'tags', 'ending'].includes(lowerHeader)) {
          unmatchedHeaders.push(header)
          console.log(`✗ [${i}] "${header}" -> NO MATCH`)
        }
      }
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[],
      unmatchedHeaders,
    }

    // Process each data row
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const values = rows[rowIndex]
      const caregiverData: Record<string, any> = {}

      // Map CSV values to database columns
      for (const mapping of csvColumnMap) {
        const value = values[mapping.index]?.trim()
        if (!mapping.dbColumn) continue
        
        // Skip empty values for most columns
        if (!value) continue

        // Check if this is a boolean column
        const isBooleanColumn = mapping.dbColumn.startsWith('supports_') || 
                                 mapping.dbColumn.startsWith('avail_') || 
                                 mapping.dbColumn.startsWith('care_') ||
                                 mapping.dbColumn.startsWith('is_') ||
                                 mapping.dbColumn.startsWith('speaks_') ||
                                 mapping.dbColumn.startsWith('offers_') ||
                                 mapping.dbColumn === 'unavailable_school_holidays' ||
                                 mapping.dbColumn === 'gdpr_consent'
        
        if (isBooleanColumn) {
          // Typeform CSV pattern: when checkbox is selected, the cell contains the header text
          // When not selected, the cell is empty
          // So if we have ANY value in this cell, the checkbox was selected
          const hasValue = value.length > 0
          
          // Additional check: if the value contains "I understand" it's a consent field
          const isConsent = value.toLowerCase().includes('i understand')
          
          caregiverData[mapping.dbColumn] = hasValue || isConsent
          
          // Debug log for caregiver types
          if (mapping.dbColumn.startsWith('is_') && hasValue) {
            console.log(`  → ${mapping.dbColumn} = true (value: "${value}")`)
          }
        } else {
          caregiverData[mapping.dbColumn] = value
        }
      }

      // Skip rows without email
      if (!caregiverData.email) {
        results.errors.push(`Row ${rowIndex + 1}: Missing email, skipped`)
        continue
      }

      // Log what we're importing
      const caregiverTypes = []
      if (caregiverData.is_doula) caregiverTypes.push('Doula')
      if (caregiverData.is_hypnobirthing_coach) caregiverTypes.push('Hypnobirthing')
      if (caregiverData.is_lactation_consultant) caregiverTypes.push('Lactation')
      if (caregiverData.is_sleep_consultant) caregiverTypes.push('Sleep')
      if (caregiverData.is_private_midwife) caregiverTypes.push('Midwife')
      if (caregiverData.is_bereavement_councillor) caregiverTypes.push('Bereavement')
      
      console.log(`Row ${rowIndex + 1}: ${caregiverData.first_name} ${caregiverData.last_name} <${caregiverData.email}> - Types: [${caregiverTypes.join(', ')}] - State: ${caregiverData.state_region_province || 'N/A'}`)

      // Check if caregiver exists
      const { data: existing } = await supabase
        .from('caregivers')
        .select('id')
        .eq('email', caregiverData.email)
        .maybeSingle()

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('caregivers')
          .update(caregiverData)
          .eq('id', existing.id)

        if (updateError) {
          results.errors.push(`Row ${rowIndex + 1}: Update failed - ${updateError.message}`)
        } else {
          results.updated++
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('caregivers')
          .insert(caregiverData)

        if (insertError) {
          results.errors.push(`Row ${rowIndex + 1}: Insert failed - ${insertError.message}`)
        } else {
          results.imported++
        }
      }
    }

    console.log('Import results:', results)
    
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Import error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
