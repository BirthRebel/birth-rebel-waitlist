import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// EXACT Typeform CSV column headers mapped to database columns
const columnMapping: Record<string, string> = {
  // Basic info - EXACT MATCHES from Typeform export
  '#': 'typeform_response_id',
  'what are your pronouns?': 'pronouns',
  'first name': 'first_name',
  'last name': 'last_name',
  'email address': 'email',
  'phone number': 'phone',
  
  // Address - EXACT MATCHES
  'address': 'address',
  'address line 2': 'address_line_2',
  'city/town': 'city_town',
  'state/region/province': 'state_region_province',
  'zip/post code': 'zip_post_code',
  'country': 'country',
  
  // Caregiver types - individual columns from Typeform
  'doula': 'is_doula',
  'private midwife': 'is_private_midwife',
  'lactation consultant': 'is_lactation_consultant',
  'sleep consultant': 'is_sleep_consultant',
  'hypnobirthing coach': 'is_hypnobirthing_coach',
  'bereavement councillor': 'is_bereavement_councillor',
  
  // Languages - individual columns from Typeform
  'english': 'speaks_english',
  'french': 'speaks_french',
  'german': 'speaks_german',
  'spanish': 'speaks_spanish',
  'italian': 'speaks_italian',
  'punjabi': 'speaks_punjabi',
  'urdu': 'speaks_urdu',
  'arabic': 'speaks_arabic',
  'bengali': 'speaks_bengali',
  'gujrati': 'speaks_gujrati',
  'portuguese': 'speaks_portuguese',
  'mandarin': 'speaks_mandarin',
  
  // Experience/training - EXACT MATCHES
  'what certifications or training do you hold?': 'certifications_training',
  'how many years have you been practicing as a maternity caregiver': 'years_practicing',
  'how many births have you supported?': 'births_supported',
  
  // Services offered - individual columns from Typeform
  'birth planning & signposting': 'offers_birth_planning',
  'postnatal support': 'offers_postnatal_support',
  'support during active labour': 'offers_active_labour_support',
  'fertility & conception': 'offers_fertility_conception',
  'nutrition support': 'offers_nutrition_support',
  'lactation support': 'offers_lactation_support',
  'newborn sleep support': 'offers_newborn_sleep_support',
  'hypnobirthing': 'offers_hypnobirthing',
  'loss & bereavement care': 'offers_loss_bereavement_care',
  
  // Availability - individual columns from Typeform
  'weekdays: mornings': 'avail_weekdays_mornings',
  'weekdays: afternoons': 'avail_weekdays_afternoons',
  'weekdays: evenings': 'avail_weekdays_evenings',
  'weekdays: overnight': 'avail_weekdays_overnight',
  'weekends: mornings': 'avail_weekends_mornings',
  'weekends: afternoons': 'avail_weekends_afternoons',
  'weekends: evenings': 'avail_weekends_evenings',
  'weekends: overnight': 'avail_weekends_overnight',
  'i am generally not available during school holidays': 'unavailable_school_holidays',
  
  // Communities/support specialties - individual columns from Typeform
  'solo parents': 'supports_solo_parents',
  'multiples (e.g. twins)': 'supports_multiples',
  'families of colour': 'supports_families_of_colour',
  'queer and/or trans families': 'supports_queer_trans',
  'disabled parents': 'supports_disabled_parents',
  'neurodivergent clients': 'supports_neurodivergent',
  'survivors of trauma/ trauma informed birth': 'supports_trauma_survivors',
  'bereavement from previous births and/or pregnancies': 'supports_bereavement',
  'immigrant or refugee families': 'supports_immigrant_refugee',
  'clients with complex health needs': 'supports_complex_health',
  'home births': 'supports_home_births',
  'water births': 'supports_water_births',
  'caesareans': 'supports_caesareans',
  'rebozo': 'supports_rebozo',
  
  // Care types - individual columns from Typeform
  'antenatal planning, signposting & information': 'care_antenatal_planning',
  'birth support': 'care_birth_support',
  'grief & loss care': 'care_grief_loss',
  'full-spectrum reproductive support': 'care_full_spectrum',
  'fertility & conception support': 'care_fertility_conception',
  'feeding and lactation support': 'care_feeding_lactation',
  'cultural, ritual or spiritual practices': 'care_cultural_spiritual',
  
  // Care style - EXACT MATCH
  'how would you describe your care style?': 'care_style',
  
  // GDPR consent - EXACT MATCH (with HTML stripped)
  'to comply with uk data protection law, we need your permission to store and use the information you provide in this form.': 'gdpr_consent',
  
  // Document uploads
  'please upload training certificates': 'training_certificate_url',
  'additional training certificates (optional)': 'additional_certificate_1_url',
  'please add dbs certificates.': 'dbs_certificate_url',
  'please add insurance certificates': 'insurance_certificate_url',
}

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

function findMatchingColumn(header: string): string | null {
  // Strip HTML tags and normalize
  const normalized = header
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .toLowerCase()
    .trim()
  
  // Direct match first (most reliable)
  if (columnMapping[normalized]) {
    return columnMapping[normalized]
  }
  
  // Try matching by checking if the header starts with a known key
  for (const [key, value] of Object.entries(columnMapping)) {
    if (normalized === key) {
      return value
    }
  }
  
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error("Auth error:", authError)
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: hasAdminRole, error: roleError } = await supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })

    if (roleError || !hasAdminRole) {
      console.log("Admin access denied for user:", user.id)
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

    console.log('Admin', user.id, 'initiated CSV import')
    
    // Parse CSV properly handling quoted fields with newlines
    const rows = parseCSVContent(csvContent)
    
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV must have header row and at least one data row' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const headers = rows[0]
    console.log('CSV headers count:', headers.length)
    console.log('Total data rows:', rows.length - 1)

    // Build column mapping for this CSV
    const csvColumnMap: { index: number; header: string; dbColumn: string | null }[] = []
    const unmatchedHeaders: string[] = []
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const dbColumn = findMatchingColumn(header)
      
      csvColumnMap.push({
        index: i,
        header,
        dbColumn,
      })
      
      if (dbColumn) {
        console.log(`✓ Header "${header}" -> ${dbColumn}`)
      } else {
        // Skip known non-data columns
        const lowerHeader = header.toLowerCase()
        if (!['other', 'response type', 'start date (utc)', 'stage date (utc)', 'submit date (utc)', 'network id', 'tags', 'ending'].includes(lowerHeader)) {
          unmatchedHeaders.push(header)
          console.log(`✗ Header "${header}" -> NO MATCH`)
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
        if (!value || !mapping.dbColumn) continue

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
          // For Typeform expanded CSV, the column contains the value itself if selected
          // e.g., "Doula" column contains "Doula" if selected, empty if not
          // Also handle checkmark columns like availability
          const lowerValue = value.toLowerCase()
          const headerLower = mapping.header.toLowerCase()
          
          // If the value matches the header (Typeform pattern), it's selected
          // Or if it's a truthy value
          caregiverData[mapping.dbColumn] = 
            lowerValue === headerLower ||
            value.toLowerCase().includes(headerLower) ||
            lowerValue === '1' || 
            lowerValue === 'yes' || 
            lowerValue === 'true' ||
            lowerValue === 'x' ||
            lowerValue === '✓' ||
            lowerValue === '✔' ||
            lowerValue.includes('i understand') // GDPR consent
        } else {
          caregiverData[mapping.dbColumn] = value
        }
      }

      // Skip rows without email
      if (!caregiverData.email) {
        results.errors.push(`Row ${rowIndex + 1}: Missing email, skipped`)
        continue
      }

      console.log(`Row ${rowIndex + 1} - Processing: ${caregiverData.first_name} ${caregiverData.last_name} <${caregiverData.email}>`)

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
