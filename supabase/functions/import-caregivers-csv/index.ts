import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map Typeform CSV column headers to database columns
const columnMapping: Record<string, string> = {
  // Basic info
  'pronouns': 'pronouns',
  'first name': 'first_name',
  'last name': 'last_name',
  'email': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  
  // Address
  'address': 'address',
  'address line 2': 'address_line_2',
  'city / town': 'city_town',
  'city/town': 'city_town',
  'city': 'city_town',
  'town': 'city_town',
  'state / region / province': 'state_region_province',
  'state/region/province': 'state_region_province',
  'state': 'state_region_province',
  'region': 'state_region_province',
  'zip / post code': 'zip_post_code',
  'zip/post code': 'zip_post_code',
  'postcode': 'zip_post_code',
  'zip code': 'zip_post_code',
  'country': 'country',
  
  // Experience
  'how long have you been practicing?': 'years_practicing',
  'years practicing': 'years_practicing',
  'how many births have you supported?': 'births_supported',
  'births supported': 'births_supported',
  'describe your care style': 'care_style',
  'care style': 'care_style',
  'how would you describe your care style?': 'care_style',
  'certifications and training': 'certifications_training',
  'certifications': 'certifications_training',
  
  // Individual boolean columns from Typeform expanded format
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
  
  // Care types
  'antenatal planning, signposting & information': 'care_antenatal_planning',
  'postnatal support': 'care_postnatal_support',
  'grief & loss care': 'care_grief_loss',
  'full-spectrum reproductive support': 'care_full_spectrum',
  'fertility & conception support': 'care_fertility_conception',
  'feeding and lactation support': 'care_feeding_lactation',
  'cultural, ritual or spiritual practices': 'care_cultural_spiritual',
  
  // Availability
  'weekdays: mornings': 'avail_weekdays_mornings',
  'weekdays: afternoons': 'avail_weekdays_afternoons',
  'weekdays: evenings': 'avail_weekdays_evenings',
  'weekdays: overnight': 'avail_weekdays_overnight',
  'weekends: mornings': 'avail_weekends_mornings',
  'weekends: afternoons': 'avail_weekends_afternoons',
  'weekends: evenings': 'avail_weekends_evenings',
  'weekends: overnight': 'avail_weekends_overnight',
  'i am generally not available during school holidays': 'unavailable_school_holidays',
}

// Multi-choice columns that need special parsing
const multiChoiceMapping: Record<string, Record<string, string>> = {
  'what type of caregiver are you?': {
    'doula': 'is_doula',
    'private midwife': 'is_private_midwife',
    'midwife': 'is_private_midwife',
    'lactation consultant': 'is_lactation_consultant',
    'sleep consultant': 'is_sleep_consultant',
    'hypnobirthing coach': 'is_hypnobirthing_coach',
    'bereavement councillor': 'is_bereavement_councillor',
  },
  'which languages do you speak fluently?': {
    'english': 'speaks_english',
    'french': 'speaks_french',
    'german': 'speaks_german',
    'spanish': 'speaks_spanish',
    'italian': 'speaks_italian',
    'punjabi': 'speaks_punjabi',
    'urdu': 'speaks_urdu',
    'arabic': 'speaks_arabic',
    'bengali': 'speaks_bengali',
    'gujarati': 'speaks_gujrati',
    'gujrati': 'speaks_gujrati',
    'portuguese': 'speaks_portuguese',
    'mandarin': 'speaks_mandarin',
  },
  'what type of service do you offer?': {
    'birth planning': 'offers_birth_planning',
    'postnatal support': 'offers_postnatal_support',
    'active labour support': 'offers_active_labour_support',
    'active labor support': 'offers_active_labour_support',
    'fertility and conception': 'offers_fertility_conception',
    'nutrition support': 'offers_nutrition_support',
    'lactation support': 'offers_lactation_support',
    'newborn sleep support': 'offers_newborn_sleep_support',
    'hypnobirthing': 'offers_hypnobirthing',
    'loss and bereavement care': 'offers_loss_bereavement_care',
  },
  'availability': {
    'weekday mornings': 'avail_weekdays_mornings',
    'weekday afternoons': 'avail_weekdays_afternoons',
    'weekday evenings': 'avail_weekdays_evenings',
    'weekday overnight': 'avail_weekdays_overnight',
    'weekend mornings': 'avail_weekends_mornings',
    'weekend afternoons': 'avail_weekends_afternoons',
    'weekend evenings': 'avail_weekends_evenings',
    'weekend overnight': 'avail_weekends_overnight',
    'unavailable school holidays': 'unavailable_school_holidays',
  },
  'communities you support': {
    'solo parents': 'supports_solo_parents',
    'single parent': 'supports_solo_parents',
    'multiples': 'supports_multiples',
    'twins': 'supports_multiples',
    'families of colour': 'supports_families_of_colour',
    'bame': 'supports_families_of_colour',
    'bipoc': 'supports_families_of_colour',
    'queer': 'supports_queer_trans',
    'lgbtq': 'supports_queer_trans',
    'trans': 'supports_queer_trans',
    'disabled parents': 'supports_disabled_parents',
    'neurodivergent': 'supports_neurodivergent',
    'trauma survivors': 'supports_trauma_survivors',
    'bereavement': 'supports_bereavement',
    'immigrant': 'supports_immigrant_refugee',
    'refugee': 'supports_immigrant_refugee',
    'complex health': 'supports_complex_health',
    'high risk': 'supports_complex_health',
    'home births': 'supports_home_births',
    'water births': 'supports_water_births',
    'caesareans': 'supports_caesareans',
    'c-section': 'supports_caesareans',
    'rebozo': 'supports_rebozo',
  },
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
  const normalized = header.toLowerCase().trim()
  
  // Direct match
  if (columnMapping[normalized]) {
    return columnMapping[normalized]
  }
  
  // Partial match
  for (const [key, value] of Object.entries(columnMapping)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }
  
  return null
}

function findMultiChoiceCategory(header: string): string | null {
  const normalized = header.toLowerCase().trim()
  
  for (const key of Object.keys(multiChoiceMapping)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return key
    }
  }
  
  // Additional partial matches
  if (normalized.includes('caregiver') && normalized.includes('type')) return 'what type of caregiver are you?'
  if (normalized.includes('language')) return 'which languages do you speak fluently?'
  if (normalized.includes('service')) return 'what type of service do you offer?'
  if (normalized.includes('availab')) return 'availability'
  if (normalized.includes('communit') || normalized.includes('support') && normalized.includes('who')) return 'communities you support'
  
  return null
}

function parseMultiChoiceValue(value: string, category: string): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  const mapping = multiChoiceMapping[category]
  if (!mapping) return result
  
  // Split by comma or semicolon
  const choices = value.split(/[,;]/).map(s => s.trim().toLowerCase())
  
  for (const choice of choices) {
    for (const [key, dbColumn] of Object.entries(mapping)) {
      if (choice.includes(key) || key.includes(choice)) {
        result[dbColumn] = true
      }
    }
  }
  
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { csvContent } = await req.json()
    
    if (!csvContent) {
      return new Response(JSON.stringify({ error: 'No CSV content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Received CSV import request')
    
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
    const csvColumnMap: { index: number; dbColumn: string | null; multiChoiceCategory: string | null }[] = []
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const dbColumn = findMatchingColumn(header)
      const multiChoiceCategory = findMultiChoiceCategory(header)
      
      csvColumnMap.push({
        index: i,
        dbColumn,
        multiChoiceCategory,
      })
      
      console.log(`Header "${header}" -> dbColumn: ${dbColumn}, multiChoice: ${multiChoiceCategory}`)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[],
    }

    // Process each data row
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const values = rows[rowIndex]
      const caregiverData: Record<string, any> = {}

      // Map CSV values to database columns
      for (const mapping of csvColumnMap) {
        const value = values[mapping.index]?.trim()
        if (!value) continue

        if (mapping.dbColumn) {
          // Check if this is a boolean column (starts with supports_, avail_, care_, is_, speaks_, offers_, or specific flags)
          const isBooleanColumn = mapping.dbColumn.startsWith('supports_') || 
                                   mapping.dbColumn.startsWith('avail_') || 
                                   mapping.dbColumn.startsWith('care_') ||
                                   mapping.dbColumn.startsWith('is_') ||
                                   mapping.dbColumn.startsWith('speaks_') ||
                                   mapping.dbColumn.startsWith('offers_') ||
                                   mapping.dbColumn === 'unavailable_school_holidays' ||
                                   mapping.dbColumn === 'gdpr_consent'
          
          if (isBooleanColumn) {
            // Convert various truthy values to boolean
            const lowerValue = value.toLowerCase()
            caregiverData[mapping.dbColumn] = lowerValue === '1' || 
                                               lowerValue === 'yes' || 
                                               lowerValue === 'true' ||
                                               lowerValue === 'x' ||
                                               lowerValue === '✓' ||
                                               lowerValue === '✔' ||
                                               value.length > 0 // Any non-empty value counts as true for checkboxes
          } else {
            caregiverData[mapping.dbColumn] = value
          }
        }
        
        if (mapping.multiChoiceCategory) {
          const booleanFields = parseMultiChoiceValue(value, mapping.multiChoiceCategory)
          Object.assign(caregiverData, booleanFields)
        }
      }

      // Skip rows without email
      if (!caregiverData.email) {
        results.errors.push(`Row ${rowIndex + 1}: Missing email, skipped`)
        continue
      }

      console.log(`Row ${rowIndex + 1} - Processing email: ${caregiverData.email}`)

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
