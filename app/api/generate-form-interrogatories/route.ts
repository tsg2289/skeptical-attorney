import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFormInterrogatoriesPdf, type FormInterrogatoriesData } from '@/lib/pdf-form-filler'
import { fillDISC001Form, getDISC001FieldNames, type DISC001FormData } from '@/lib/fill-disc001'
import { fillDISC002Form, type DISC002FormData } from '@/lib/fill-disc002'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      caseId, 
      formType = 'disc001', // 'disc001' or 'disc002'
      propoundingParty, 
      selectedInterrogatories, 
      setNumber = 1,
      useOfficialForm = true // Default to using official form
    } = body

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 })
    }

    if (!selectedInterrogatories || selectedInterrogatories.length === 0) {
      return NextResponse.json({ error: 'Please select at least one interrogatory' }, { status: 400 })
    }

    // Get case data with security check
    const { data: caseData, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single()

    if (error || !caseData) {
      console.log(`[SECURITY] User ${user.id} attempted to access case ${caseId} they don't own`)
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Build party names
    const plaintiffs = caseData.plaintiffs || []
    const defendants = caseData.defendants || []
    const plaintiffName = plaintiffs.map((p: { name: string }) => p.name).join(', ') || 'PLAINTIFF'
    const defendantName = defendants.map((d: { name: string }) => d.name).join(', ') || 'DEFENDANT'

    // Get attorney info from the propounding party
    const propoundingPartyData = propoundingParty === 'plaintiff' ? plaintiffs : defendants
    const attorney = propoundingPartyData[0]?.attorneys?.[0] || {}
    
    // Parse address into components if available
    const addressParts = (attorney.address || '').split(',').map((s: string) => s.trim())
    const streetAddress = addressParts[0] || ''
    const cityStateZip = addressParts.slice(1).join(', ') || ''
    
    // Try to parse city, state, zip from the address
    const cityStateZipMatch = cityStateZip.match(/^(.+?),?\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i)
    const city = cityStateZipMatch?.[1] || ''
    const state = cityStateZipMatch?.[2] || 'CA'
    const zip = cityStateZipMatch?.[3] || ''

    let pdfBytes: Uint8Array
    const formCode = formType === 'disc002' ? 'DISC-002' : 'DISC-001'

    if (useOfficialForm) {
      if (formType === 'disc002') {
        // Fill the official DISC-002 form (Employment Law)
        const disc002Data: DISC002FormData = {
          attorneyName: attorney.name || '',
          barNumber: attorney.barNumber || '',
          firmName: attorney.firm || undefined,
          streetAddress: streetAddress,
          city: city,
          state: state,
          zip: zip,
          phone: attorney.phone || '',
          fax: attorney.fax || undefined,
          email: attorney.email || undefined,
          attorneyFor: propoundingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant',
          
          county: caseData.court_county || caseData.court || '',
          
          plaintiffName,
          defendantName,
          caseNumber: caseData.case_number || '',
          
          askingPartyName: propoundingParty === 'plaintiff' ? plaintiffName : defendantName,
          answeringPartyName: propoundingParty === 'plaintiff' ? defendantName : plaintiffName,
          setNumber: setNumber,
          
          // DISC-002 specific: Employee is typically the plaintiff in employment cases
          employeeName: propoundingParty === 'plaintiff' ? plaintiffName : defendantName,
          employerName: propoundingParty === 'plaintiff' ? defendantName : plaintiffName,
          
          selectedSections: selectedInterrogatories
        }

        try {
          pdfBytes = await fillDISC002Form(disc002Data)
        } catch (officialFormError) {
          console.error('Failed to fill official DISC-002 form, falling back to generated:', officialFormError)
          // Fall back to generated form
          const formData: FormInterrogatoriesData = {
            attorneyName: attorney.name || 'Attorney Name',
            barNumber: attorney.barNumber || '000000',
            firmName: attorney.firm || undefined,
            address: attorney.address || 'Address',
            cityStateZip: cityStateZip || 'City, CA 00000',
            phone: attorney.phone || '(000) 000-0000',
            fax: attorney.fax || undefined,
            email: attorney.email || undefined,
            attorneyFor: propoundingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant',
            county: caseData.court_county || caseData.court || 'Los Angeles',
            plaintiffName,
            defendantName,
            caseNumber: caseData.case_number || 'CASE NUMBER',
            propoundingParty: propoundingParty as 'plaintiff' | 'defendant',
            respondingParty: propoundingParty === 'plaintiff' ? 'defendant' : 'plaintiff',
            setNumber: setNumber,
            selectedInterrogatories: selectedInterrogatories
          }
          pdfBytes = await generateFormInterrogatoriesPdf(formData)
        }
      } else {
        // Fill the official DISC-001 form (General)
        const disc001Data: DISC001FormData = {
          attorneyName: attorney.name || '',
          barNumber: attorney.barNumber || '',
          firmName: attorney.firm || undefined,
          streetAddress: streetAddress,
          city: city,
          state: state,
          zip: zip,
          phone: attorney.phone || '',
          fax: attorney.fax || undefined,
          email: attorney.email || undefined,
          attorneyFor: propoundingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant',
          
          county: caseData.court_county || caseData.court || '',
          
          plaintiffName,
          defendantName,
          caseNumber: caseData.case_number || '',
          
          askingPartyName: propoundingParty === 'plaintiff' ? plaintiffName : defendantName,
          answeringPartyName: propoundingParty === 'plaintiff' ? defendantName : plaintiffName,
          setNumber: setNumber,
          
          selectedSections: selectedInterrogatories
        }

        try {
          pdfBytes = await fillDISC001Form(disc001Data)
        } catch (officialFormError) {
          console.error('Failed to fill official form, falling back to generated:', officialFormError)
          // Fall back to generated form
          const formData: FormInterrogatoriesData = {
            attorneyName: attorney.name || 'Attorney Name',
            barNumber: attorney.barNumber || '000000',
            firmName: attorney.firm || undefined,
            address: attorney.address || 'Address',
            cityStateZip: cityStateZip || 'City, CA 00000',
            phone: attorney.phone || '(000) 000-0000',
            fax: attorney.fax || undefined,
            email: attorney.email || undefined,
            attorneyFor: propoundingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant',
            county: caseData.court_county || caseData.court || 'Los Angeles',
            plaintiffName,
            defendantName,
            caseNumber: caseData.case_number || 'CASE NUMBER',
            propoundingParty: propoundingParty as 'plaintiff' | 'defendant',
            respondingParty: propoundingParty === 'plaintiff' ? 'defendant' : 'plaintiff',
            setNumber: setNumber,
            selectedInterrogatories: selectedInterrogatories
          }
          pdfBytes = await generateFormInterrogatoriesPdf(formData)
        }
      }
    } else {
      // Generate custom form (same for both DISC-001 and DISC-002)
      const formData: FormInterrogatoriesData = {
        attorneyName: attorney.name || 'Attorney Name',
        barNumber: attorney.barNumber || '000000',
        firmName: attorney.firm || undefined,
        address: attorney.address || 'Address',
        cityStateZip: cityStateZip || 'City, CA 00000',
        phone: attorney.phone || '(000) 000-0000',
        fax: attorney.fax || undefined,
        email: attorney.email || undefined,
        attorneyFor: propoundingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant',
        county: caseData.court_county || caseData.court || 'Los Angeles',
        plaintiffName,
        defendantName,
        caseNumber: caseData.case_number || 'CASE NUMBER',
        propoundingParty: propoundingParty as 'plaintiff' | 'defendant',
        respondingParty: propoundingParty === 'plaintiff' ? 'defendant' : 'plaintiff',
        setNumber: setNumber,
        selectedInterrogatories: selectedInterrogatories
      }
      pdfBytes = await generateFormInterrogatoriesPdf(formData)
    }

    // Log for audit trail
    console.log(`[AUDIT] User ${user.id} generated ${formCode} for case ${caseId}, Set ${setNumber}, ${selectedInterrogatories.length} interrogatories, official=${useOfficialForm}`)

    // Return as base64 encoded PDF
    const base64Pdf = Buffer.from(pdfBytes).toString('base64')
    
    return NextResponse.json({
      success: true,
      pdf: base64Pdf,
      filename: `${formCode}_Set${setNumber}_${caseData.case_number?.replace(/[^a-zA-Z0-9]/g, '_') || 'case'}.pdf`
    })

  } catch (error) {
    console.error('Form Interrogatories generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate Form Interrogatories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Debug endpoint to get PDF field names
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the field names from the official DISC-001 form
    const fields = await getDISC001FieldNames()
    
    return NextResponse.json({
      success: true,
      fieldCount: fields.length,
      fields: fields
    })

  } catch (error) {
    console.error('Field discovery error:', error)
    return NextResponse.json({ 
      error: 'Failed to get form fields',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve form data preview (for UI)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 })
    }

    // Get case data with security check
    const { data: caseData, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single()

    if (error || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Build preview data
    const plaintiffs = caseData.plaintiffs || []
    const defendants = caseData.defendants || []
    
    return NextResponse.json({
      success: true,
      caseData: {
        caseName: caseData.case_name,
        caseNumber: caseData.case_number,
        court: caseData.court_county || caseData.court,
        plaintiffs: plaintiffs.map((p: { name: string; attorneys?: Array<{ name: string; barNumber?: string; firm?: string }> }) => ({
          name: p.name,
          hasAttorney: (p.attorneys?.length || 0) > 0,
          attorneys: p.attorneys || []
        })),
        defendants: defendants.map((d: { name: string; attorneys?: Array<{ name: string; barNumber?: string; firm?: string }> }) => ({
          name: d.name,
          hasAttorney: (d.attorneys?.length || 0) > 0,
          attorneys: d.attorneys || []
        }))
      }
    })

  } catch (error) {
    console.error('Form Interrogatories data fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch case data' }, { status: 500 })
  }
}

