import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, StandardFonts, rgb } from 'pdf-lib'

// Official DISC-001 Form URL from California Courts
const DISC001_URL = 'https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc001.pdf'

export interface DISC001FormData {
  // Attorney/Party Info (top left block)
  attorneyName: string
  barNumber: string
  firmName?: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  fax?: string
  email?: string
  attorneyFor: string // "Plaintiff" or "Defendant"
  
  // Court Info
  county: string
  branchName?: string
  streetAddressCourt?: string
  mailingAddress?: string
  cityZipCourt?: string
  
  // Case Info
  plaintiffName: string
  defendantName: string
  caseNumber: string
  
  // Discovery Info
  askingPartyName: string
  answeringPartyName: string
  setNumber: number
  
  // Which sections to check (interrogatory numbers)
  // Section numbers from the form
  selectedSections: string[]
}

// Fetch the official DISC-001 PDF template
async function fetchDISC001Template(): Promise<ArrayBuffer> {
  const response = await fetch(DISC001_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch DISC-001 form: ${response.status}`)
  }
  return await response.arrayBuffer()
}

// Helper to safely set a text field
function setTextField(form: PDFForm, fieldName: string, value: string): boolean {
  try {
    const field = form.getTextField(fieldName)
    field.setText(value)
    return true
  } catch (e) {
    // Field doesn't exist or isn't a text field
    return false
  }
}

// Helper to safely check a checkbox
function checkBox(form: PDFForm, fieldName: string): boolean {
  try {
    const field = form.getCheckBox(fieldName)
    field.check()
    return true
  } catch (e) {
    // Field doesn't exist or isn't a checkbox
    return false
  }
}

// Get all form field names from a PDF (for debugging/discovery)
export async function getDISC001FieldNames(): Promise<{ name: string; type: string }[]> {
  const templateBytes = await fetchDISC001Template()
  const pdfDoc = await PDFDocument.load(templateBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  
  return fields.map(field => ({
    name: field.getName(),
    type: field.constructor.name
  }))
}

// Fill the official DISC-001 form with case data
export async function fillDISC001Form(data: DISC001FormData): Promise<Uint8Array> {
  // Fetch the official form
  const templateBytes = await fetchDISC001Template()
  const pdfDoc = await PDFDocument.load(templateBytes)
  const form = pdfDoc.getForm()
  
  // Get all fields for debugging
  const fields = form.getFields()
  console.log('Available DISC-001 form fields:', fields.map(f => `${f.getName()} (${f.constructor.name})`))
  
  // Common California Judicial Council form field naming patterns
  // These are typical field names - the actual names may vary
  const fieldMappings: Record<string, string> = {
    // Attorney block - various possible field names
    'AttyName': data.attorneyName,
    'Attorney': data.attorneyName,
    'FillText1': data.attorneyName,
    'topmostSubform[0].Page1[0].Caption[0].AttyInfo[0].Name[0]': data.attorneyName,
    
    'SBN': data.barNumber,
    'BarNo': data.barNumber,
    'StateBarNo': data.barNumber,
    'FillText2': data.barNumber,
    
    'FirmName': data.firmName || '',
    'Firm': data.firmName || '',
    'FillText3': data.firmName || '',
    
    'StreetAddress': data.streetAddress,
    'Address': data.streetAddress,
    'FillText4': data.streetAddress,
    
    'City': data.city,
    'FillText5': `${data.city}, ${data.state} ${data.zip}`,
    
    'Telephone': data.phone,
    'Phone': data.phone,
    'FillText6': data.phone,
    
    'Fax': data.fax || '',
    'FaxNo': data.fax || '',
    'FillText7': data.fax || '',
    
    'Email': data.email || '',
    'EmailAddress': data.email || '',
    'FillText8': data.email || '',
    
    'AttyFor': data.attorneyFor,
    'AttorneyFor': data.attorneyFor,
    'FillText9': data.attorneyFor,
    
    // Court info
    'County': data.county,
    'CourtCounty': data.county,
    'SuperiorCourt': `SUPERIOR COURT OF CALIFORNIA, COUNTY OF ${data.county.toUpperCase()}`,
    'FillText10': data.county,
    
    'BranchName': data.branchName || '',
    'StreetAddressCourt': data.streetAddressCourt || '',
    'MailingAddress': data.mailingAddress || '',
    'CityZip': data.cityZipCourt || '',
    
    // Case caption
    'Plaintiff': data.plaintiffName,
    'PlaintiffPetitioner': data.plaintiffName,
    'FillText11': data.plaintiffName,
    
    'Defendant': data.defendantName,
    'DefendantRespondent': data.defendantName,
    'FillText12': data.defendantName,
    
    'CaseNo': data.caseNumber,
    'CaseNumber': data.caseNumber,
    'FillText13': data.caseNumber,
    
    // Discovery specific
    'AskingParty': data.askingPartyName,
    'PropoundingParty': data.askingPartyName,
    'FillText14': data.askingPartyName,
    
    'AnsweringParty': data.answeringPartyName,
    'RespondingParty': data.answeringPartyName,
    'FillText15': data.answeringPartyName,
    
    'SetNo': data.setNumber.toString(),
    'SetNumber': data.setNumber.toString(),
    'FillText16': data.setNumber.toString(),
  }

  // Try to fill all text fields
  for (const [fieldName, value] of Object.entries(fieldMappings)) {
    if (value) {
      setTextField(form, fieldName, value)
    }
  }

  // Try to check the selected interrogatory sections
  // Common checkbox naming patterns for interrogatory sections
  for (const sectionNum of data.selectedSections) {
    // Try various checkbox naming patterns
    const checkboxPatterns = [
      `Sec${sectionNum}`,
      `Section${sectionNum}`,
      `Int${sectionNum}`,
      `Interrogatory${sectionNum}`,
      `Item${sectionNum}`,
      `CB${sectionNum}`,
      `CheckBox${sectionNum}`,
      `${sectionNum}`,
      `c${sectionNum}`,
      `sec${sectionNum.replace('.', '_')}`,
      // Decimal sections like 6.1
      `Sec${sectionNum.replace('.', '')}`,
      `Item${sectionNum.replace('.', '_')}`,
    ]
    
    for (const pattern of checkboxPatterns) {
      if (checkBox(form, pattern)) {
        console.log(`Checked: ${pattern}`)
        break
      }
    }
  }

  // Try to dynamically find and fill fields by iterating through all fields
  for (const field of fields) {
    const fieldName = field.getName().toLowerCase()
    
    // Try to match attorney info
    if (fieldName.includes('attorney') || fieldName.includes('atty') || fieldName.includes('name')) {
      if (field instanceof PDFTextField && !field.getText()) {
        // This might be the attorney name field
      }
    }
    
    // Log all field names for debugging
    console.log(`Field: ${field.getName()} = ${field.constructor.name}`)
  }

  // Flatten the form to prevent further editing (optional)
  // form.flatten()

  return await pdfDoc.save()
}

// Alternative: Create filled form by overlaying text on the PDF
// This is useful if the PDF doesn't have proper form fields
export async function fillDISC001WithOverlay(data: DISC001FormData): Promise<Uint8Array> {
  const templateBytes = await fetchDISC001Template()
  const pdfDoc = await PDFDocument.load(templateBytes)
  
  // Get the first page
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  
  // Get page dimensions
  const { height } = firstPage.getSize()
  
  // Embed a font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  // Define text positions based on the DISC-001 form layout
  // These coordinates are approximate and may need adjustment
  const textPlacements = [
    // Attorney block (top left) - approximate positions
    { text: data.attorneyName, x: 45, y: height - 50, size: 10 },
    { text: `SBN: ${data.barNumber}`, x: 45, y: height - 62, size: 9 },
    { text: data.firmName || '', x: 45, y: height - 74, size: 9 },
    { text: data.streetAddress, x: 45, y: height - 86, size: 9 },
    { text: `${data.city}, ${data.state} ${data.zip}`, x: 45, y: height - 98, size: 9 },
    { text: `Tel: ${data.phone}`, x: 45, y: height - 110, size: 9 },
    { text: data.fax ? `Fax: ${data.fax}` : '', x: 45, y: height - 122, size: 9 },
    { text: data.email || '', x: 45, y: height - 134, size: 9 },
    { text: `Attorney for: ${data.attorneyFor}`, x: 45, y: height - 146, size: 9 },
    
    // Court name (center top)
    { text: `SUPERIOR COURT OF CALIFORNIA, COUNTY OF ${data.county.toUpperCase()}`, x: 200, y: height - 80, size: 10 },
    
    // Case caption
    { text: data.plaintiffName, x: 45, y: height - 220, size: 10 },
    { text: data.defendantName, x: 45, y: height - 260, size: 10 },
    { text: data.caseNumber, x: 420, y: height - 220, size: 10 },
    
    // Propounding/Responding parties
    { text: data.askingPartyName, x: 200, y: height - 310, size: 10 },
    { text: data.answeringPartyName, x: 200, y: height - 330, size: 10 },
    { text: `Set No.: ${data.setNumber}`, x: 450, y: height - 310, size: 10 },
  ]

  // Draw text on the page
  for (const placement of textPlacements) {
    if (placement.text) {
      firstPage.drawText(placement.text, {
        x: placement.x,
        y: placement.y,
        size: placement.size,
        font,
        color: rgb(0, 0, 0),
      })
    }
  }

  return await pdfDoc.save()
}

