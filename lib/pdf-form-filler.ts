import { PDFDocument, PDFForm, rgb, StandardFonts } from 'pdf-lib'

// California Form Interrogatories (DISC-001) data structure
export interface FormInterrogatoriesData {
  // Attorney Block (top left)
  attorneyName: string
  barNumber: string
  firmName?: string
  address: string
  cityStateZip: string
  phone: string
  fax?: string
  email?: string
  attorneyFor: string // "Plaintiff" or "Defendant"
  
  // Court Info
  county: string
  
  // Case Info
  plaintiffName: string
  defendantName: string
  caseNumber: string
  
  // Discovery specifics
  propoundingParty: 'plaintiff' | 'defendant'
  respondingParty: 'plaintiff' | 'defendant'
  setNumber: number
  
  // Selected interrogatories (by section and number, e.g., "1", "6.1", "10.2")
  selectedInterrogatories: string[]
}

// Standard California Form Interrogatories - General (DISC-001)
export const STANDARD_INTERROGATORIES: Record<number, { category: string; text: string }> = {
  // SECTION 1.0 - IDENTITY
  1: {
    category: 'Identity',
    text: 'State the name, ADDRESS, telephone number, and relationship to you of each PERSON who prepared or assisted in the preparation of the responses to these interrogatories. (Do not identify anyone who simply typed or reproduced the responses.)'
  },

  // SECTION 2.0 - GENERAL BACKGROUND INFORMATION (Individual)
  2: {
    category: 'General Background - Individual',
    text: 'State: (a) your name; (b) every name you have used in the past; and (c) the dates you used each name.'
  },
  3: {
    category: 'General Background - Individual',
    text: 'State all names and addresses used by your business for the past ten years, and state the dates each address was used.'
  },
  4: {
    category: 'General Background - Individual',
    text: 'State: (a) your birthdate; (b) your birthplace; (c) your Social Security number; (d) your driver\'s license number.'
  },
  5: {
    category: 'General Background - Individual',
    text: 'At the time of the INCIDENT, did you have a driver\'s license? If so, state: (a) the state or other issuing entity; (b) the license number and type; (c) the date of issuance; (d) all restrictions.'
  },
  6: {
    category: 'General Background - Individual',
    text: 'State: (a) your present residence ADDRESS; (b) your residence ADDRESSES for the past five years; (c) the dates you lived at each ADDRESS.'
  },
  7: {
    category: 'General Background - Individual',
    text: 'State: (a) the name, ADDRESS, and telephone number of your present employer or place of self-employment; (b) the name, ADDRESS, dates of employment, and telephone number of each employer or place of self-employment you have had for the past five years.'
  },
  8: {
    category: 'General Background - Individual',
    text: 'State: (a) the name, ADDRESS, and telephone number of your current spouse; (b) the date of the marriage; (c) the dates and places of any prior marriages, and the dates they ended.'
  },
  9: {
    category: 'General Background - Individual',
    text: 'Have you or anyone acting on your behalf interviewed any individual concerning the INCIDENT? If so, state: (a) the name, ADDRESS, and telephone number of each individual interviewed; (b) the date of the interview; (c) the name, ADDRESS, and telephone number of the PERSON who conducted each interview.'
  },
  10: {
    category: 'General Background - Individual',
    text: 'Do you or anyone acting on your behalf know of any photographs, films, or videotapes depicting any place, object, or individual concerning the INCIDENT or plaintiff\'s injuries? If so, state: (a) the number and type of each; (b) the dates taken; (c) the subject matter; (d) the name, ADDRESS, and telephone number of the PERSON who took each; (e) the name, ADDRESS, and telephone number of each PERSON who has each original or copy.'
  },
  11: {
    category: 'General Background - Individual',
    text: 'Do you or anyone acting on your behalf know of any diagrams, surveys, maps, or other drawings depicting any place or object concerning the INCIDENT? If so, state: (a) the type; (b) the name, ADDRESS, and telephone number of the PERSON who prepared or made each; (c) the name, ADDRESS, and telephone number of each PERSON who has each original or copy.'
  },
  12: {
    category: 'General Background - Individual',
    text: 'Do you or anyone acting on your behalf have any tangible objects relating to the INCIDENT? If so, describe each, state the name and ADDRESS of each current custodian, and describe the present condition of each.'
  },

  // SECTION 4.0 - INSURANCE
  17: {
    category: 'Insurance',
    text: 'At the time of the INCIDENT, was there any policy of insurance through which you were or might be insured for any reason? If so, for each policy, state: (a) the name, ADDRESS, and telephone number of the insurer; (b) the name, ADDRESS, and telephone number of each named insured; (c) the number of the policy; (d) the type of coverage; (e) the limits of coverage for each type of coverage; (f) whether any reservation of rights or dispute over coverage has arisen; (g) the name, ADDRESS, and telephone number of the custodian of the policy.'
  },

  // SECTION 6.0 - PERSONAL INJURY
  6.1: {
    category: 'Personal Injury',
    text: 'Do you attribute any physical, mental, or emotional injuries to the INCIDENT? If so, identify each injury.'
  },
  6.2: {
    category: 'Personal Injury',
    text: 'State: (a) the date, time, and place of the INCIDENT; (b) the ADDRESS and location where it occurred; (c) the weather conditions; (d) the lighting conditions.'
  },
  6.3: {
    category: 'Personal Injury',
    text: 'Describe the INCIDENT according to your understanding.'
  },
  6.4: {
    category: 'Personal Injury',
    text: 'Were you operating a motor vehicle at the time of the INCIDENT? If so, state: (a) the vehicle\'s year, make, and model; (b) the owner\'s name and address; (c) the vehicle\'s direction of travel; (d) the vehicle\'s speed.'
  },
  6.5: {
    category: 'Personal Injury',
    text: 'State the name, ADDRESS, and telephone number of each PERSON who witnessed the INCIDENT or the events immediately before or after.'
  },
  6.6: {
    category: 'Personal Injury',
    text: 'State the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER who examined or treated you for injuries you attribute to the INCIDENT and the dates of each examination or treatment.'
  },
  6.7: {
    category: 'Personal Injury',
    text: 'Have you taken any medication, prescribed or not, as a result of injuries that you attribute to the INCIDENT? If so, state the name and dosage of each medication and the name, ADDRESS, and telephone number of each prescribing PERSON.'
  },

  // SECTION 8.0 - LOSS OF INCOME/EARNING CAPACITY
  8.1: {
    category: 'Loss of Income',
    text: 'Do you claim a loss of income or earning capacity? If so, state: (a) the nature of the work; (b) the employer\'s name, ADDRESS, and telephone number; (c) the dates of employment; (d) the total income lost.'
  },
  8.2: {
    category: 'Loss of Income',
    text: 'Do you have any DOCUMENTS that support your claim for income loss? If so, describe each DOCUMENT and state the name, ADDRESS, and telephone number of each PERSON who has the original or a copy.'
  },
  8.3: {
    category: 'Loss of Income',
    text: 'Have you submitted a claim for workers\' compensation benefits? If so, state: (a) the claim number; (b) the date of the claim; (c) the name, ADDRESS, and telephone number of the workers\' compensation carrier.'
  },

  // SECTION 9.0 - OTHER DAMAGES
  9.1: {
    category: 'Other Damages',
    text: 'Are you claiming damages for loss of consortium, emotional distress, or any other special damages? If so, state the nature and amount of each claim.'
  },
  9.2: {
    category: 'Other Damages',
    text: 'Do you claim any medical expenses? If so, state: (a) the total amount claimed; (b) the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER to whom expenses were incurred.'
  },

  // SECTION 10.0 - MEDICAL HISTORY
  10.1: {
    category: 'Medical History',
    text: 'At any time before the INCIDENT, did you have complaints or injuries that involved the same parts of your body claimed to have been injured in the INCIDENT? If so, for each state: (a) a description of the complaint or injury; (b) the dates it began and ended; (c) the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER whom you consulted.'
  },
  10.2: {
    category: 'Medical History',
    text: 'List all physical, mental, or emotional disabilities you had immediately before the INCIDENT. For each, state: (a) a description; (b) the dates it began; (c) the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER who treated you.'
  },
  10.3: {
    category: 'Medical History',
    text: 'At any time after the INCIDENT, did you sustain injuries to the same parts of your body claimed to have been injured in the INCIDENT? If so, state: (a) the date and nature of each injury; (b) the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER who treated you.'
  },

  // SECTION 11.0 - OTHER CLAIMS AND PREVIOUS CLAIMS
  11.1: {
    category: 'Other Claims',
    text: 'Except for this action, have you filed a claim or lawsuit for personal injuries in the past ten years? If so, for each state: (a) the court and case number; (b) the parties; (c) a description of the injuries claimed; (d) the outcome.'
  },
  11.2: {
    category: 'Other Claims',
    text: 'In the past ten years have you made a claim or been paid benefits for any injury? If so, for each state: (a) the date; (b) the nature of the claim; (c) the amount paid.'
  },

  // SECTION 12.0 - INVESTIGATION
  12.1: {
    category: 'Investigation',
    text: 'State the name, ADDRESS, and telephone number of each individual: (a) who witnessed the INCIDENT; (b) who made any statement at the scene; (c) who heard any statement about the INCIDENT at the scene; (d) who has knowledge of the INCIDENT.'
  },
  12.2: {
    category: 'Investigation',
    text: 'Have YOU OR ANYONE ACTING ON YOUR BEHALF interviewed any individual concerning the INCIDENT? If so, state: (a) the name, ADDRESS, and telephone number of each individual interviewed; (b) the date of the interview; (c) the name, ADDRESS, and telephone number of the PERSON who conducted each interview.'
  },
  12.3: {
    category: 'Investigation',
    text: 'Have YOU OR ANYONE ACTING ON YOUR BEHALF obtained a written or recorded statement from any individual concerning the INCIDENT? If so, state: (a) the name, ADDRESS, and telephone number of each individual from whom a statement was obtained; (b) the date of the statement; (c) the name, ADDRESS, and telephone number of each PERSON who has the original or a copy.'
  },
  12.4: {
    category: 'Investigation',
    text: 'Do YOU OR ANYONE ACTING ON YOUR BEHALF have any photographs, films, or videotapes relating to the INCIDENT or your injuries? If so, state: (a) the number and type; (b) the dates taken; (c) the subject matter; (d) the name, ADDRESS, and telephone number of each PERSON who has the original or copy.'
  },

  // SECTION 13.0 - CONTENTIONS
  13.1: {
    category: 'Contentions',
    text: 'Do you contend that any PERSON involved in the INCIDENT acted with malice, oppression, or fraud, so as to justify an award of punitive or exemplary damages? If so, state the facts on which your contention is based.'
  },
  13.2: {
    category: 'Contentions',
    text: 'Do you contend that any PERSON, other than you or the responding party, caused or contributed to the INCIDENT? If so, identify each such PERSON and state the facts on which you base your contention.'
  },

  // SECTION 20.0 - ADDITIONAL MEDICAL HISTORY (Older numbering)
  20: {
    category: 'Medical History (Additional)',
    text: 'At any time before the INCIDENT, did you have complaints or injuries that involved the same parts of your body claimed to have been injured in the INCIDENT? If so, for each state: (a) a description of the complaint or injury; (b) the dates it began and ended; (c) the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER whom you consulted or who examined or treated you.'
  },

  // SECTION 50.0 - CONTRACT
  50.1: {
    category: 'Contract',
    text: 'For each agreement alleged in the pleadings: (a) identify each DOCUMENT that is part of the agreement; (b) state each part of the agreement not in writing; (c) identify all DOCUMENTS that evidence each part not in writing; (d) identify all modifications and the PERSONS who agreed to them.'
  },

  // SECTION 60.0 - PERSONAL INJURY (Older numbering)
  60: {
    category: 'Personal Injury (Incident Details)',
    text: 'State: (a) the date, time, and place of the INCIDENT; (b) the ADDRESS, weather conditions, and lighting conditions at the time of the INCIDENT; (c) the name, ADDRESS, and telephone number of each PERSON who witnessed the INCIDENT or was at the scene when the INCIDENT occurred.'
  },

  // SECTION 70.0 - PROPERTY DAMAGE
  70.1: {
    category: 'Property Damage',
    text: 'Do you claim property was damaged in the INCIDENT? If so, for each item: (a) describe the property; (b) state the amount you claim; (c) state whether it has been repaired or replaced; (d) identify the PERSON who made the repairs.'
  },
  70.2: {
    category: 'Property Damage',
    text: 'Do YOU OR ANYONE ACTING ON YOUR BEHALF contend that any PERSON involved in the INCIDENT was under the influence of alcohol, drugs, or any substance? If so: (a) identify each such PERSON; (b) state the facts on which you base your contention; (c) identify each DOCUMENT and PERSON that supports your contention.'
  }
}

// Helper to try setting a text field in a PDF form
function trySetTextField(form: PDFForm, fieldName: string, value: string): boolean {
  try {
    const field = form.getTextField(fieldName)
    field.setText(value)
    return true
  } catch {
    return false
  }
}

// Helper to try checking a checkbox in a PDF form
function tryCheckBox(form: PDFForm, fieldName: string): boolean {
  try {
    const field = form.getCheckBox(fieldName)
    field.check()
    return true
  } catch {
    return false
  }
}

// Get all field names from a PDF form (for debugging)
export async function getPdfFormFields(pdfBytes: ArrayBuffer): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  return fields.map(field => field.getName())
}

// Generate a custom Form Interrogatories document as PDF
// Since the official form has complex field names, we'll create our own formatted PDF
export async function generateFormInterrogatoriesPdf(
  data: FormInterrogatoriesData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  
  const propoundingName = data.propoundingParty === 'plaintiff' ? data.plaintiffName : data.defendantName
  const respondingName = data.respondingParty === 'plaintiff' ? data.plaintiffName : data.defendantName

  // Page dimensions
  const pageWidth = 612 // Letter size
  const pageHeight = 792
  const margin = 72 // 1 inch margins
  const contentWidth = pageWidth - (margin * 2)
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  let yPosition = pageHeight - margin

  const drawText = (text: string, options: { 
    font?: typeof timesRoman, 
    size?: number, 
    x?: number,
    maxWidth?: number,
    indent?: number
  } = {}) => {
    const font = options.font || timesRoman
    const size = options.size || 12
    const x = options.x || margin
    const maxWidth = options.maxWidth || contentWidth
    const indent = options.indent || 0
    
    // Word wrap
    const words = text.split(' ')
    let line = ''
    const lines: string[] = []
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      const width = font.widthOfTextAtSize(testLine, size)
      if (width > maxWidth - indent) {
        if (line) lines.push(line)
        line = word
      } else {
        line = testLine
      }
    }
    if (line) lines.push(line)
    
    for (let i = 0; i < lines.length; i++) {
      if (yPosition < margin + 50) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        yPosition = pageHeight - margin
      }
      
      currentPage.drawText(lines[i], {
        x: x + (i > 0 ? indent : 0),
        y: yPosition,
        size,
        font,
        color: rgb(0, 0, 0)
      })
      yPosition -= size + 4
    }
    
    return lines.length * (size + 4)
  }

  const drawLine = () => {
    currentPage.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 0.5,
      color: rgb(0, 0, 0)
    })
    yPosition -= 10
  }

  // === HEADER / ATTORNEY INFO ===
  drawText(data.attorneyName, { font: timesRomanBold, size: 11 })
  drawText(`State Bar No. ${data.barNumber}`, { size: 10 })
  if (data.firmName) {
    drawText(data.firmName, { size: 10 })
  }
  drawText(data.address, { size: 10 })
  drawText(data.cityStateZip, { size: 10 })
  drawText(`Telephone: ${data.phone}`, { size: 10 })
  if (data.fax) {
    drawText(`Fax: ${data.fax}`, { size: 10 })
  }
  if (data.email) {
    drawText(`Email: ${data.email}`, { size: 10 })
  }
  drawText(`Attorney for ${data.attorneyFor}`, { size: 10 })
  
  yPosition -= 15
  drawLine()
  yPosition -= 5

  // === COURT INFO ===
  drawText('SUPERIOR COURT OF CALIFORNIA, COUNTY OF ' + data.county.toUpperCase(), { 
    font: timesRomanBold, 
    size: 12 
  })
  
  yPosition -= 20

  // === CASE CAPTION ===
  const captionStartY = yPosition
  
  // Left side - parties
  drawText(data.plaintiffName + ',', { font: timesRomanBold, size: 11 })
  drawText('Plaintiff,', { size: 11, x: margin + 30 })
  yPosition -= 5
  drawText('vs.', { size: 11, x: margin + 30 })
  yPosition -= 5
  drawText(data.defendantName + ',', { font: timesRomanBold, size: 11 })
  drawText('Defendant.', { size: 11, x: margin + 30 })
  
  // Right side - case number (draw at same height as caption started)
  const rightX = pageWidth - margin - 150
  currentPage.drawText('Case No.: ' + data.caseNumber, {
    x: rightX,
    y: captionStartY,
    size: 11,
    font: timesRomanBold,
    color: rgb(0, 0, 0)
  })
  
  yPosition -= 25
  drawLine()
  yPosition -= 10

  // === DOCUMENT TITLE ===
  drawText('FORM INTERROGATORIES—GENERAL', { 
    font: timesRomanBold, 
    size: 14,
    x: (pageWidth - timesRomanBold.widthOfTextAtSize('FORM INTERROGATORIES—GENERAL', 14)) / 2
  })
  drawText(`[Set Number ${data.setNumber}]`, { 
    size: 12,
    x: (pageWidth - timesRoman.widthOfTextAtSize(`[Set Number ${data.setNumber}]`, 12)) / 2
  })
  
  yPosition -= 15

  // === PROPOUNDING/RESPONDING PARTY ===
  drawText(`PROPOUNDING PARTY: ${propoundingName}`, { font: timesRomanBold, size: 11 })
  drawText(`RESPONDING PARTY: ${respondingName}`, { font: timesRomanBold, size: 11 })
  
  yPosition -= 20
  drawLine()
  yPosition -= 10

  // === INSTRUCTIONS ===
  drawText('INSTRUCTIONS:', { font: timesRomanBold, size: 11 })
  yPosition -= 5
  drawText('The following interrogatories have been checked and are to be answered. Responses must be served within 30 days (or 35 days if served by mail) after service of these interrogatories. See California Code of Civil Procedure section 2030.260.', { size: 10 })
  
  yPosition -= 20

  // === SELECTED INTERROGATORIES ===
  drawText('INTERROGATORIES:', { font: timesRomanBold, size: 12 })
  yPosition -= 10
  
  // Sort interrogatories numerically (handles decimals like 6.1, 6.2)
  const sortedInterrogatories = [...data.selectedInterrogatories].sort((a, b) => parseFloat(a) - parseFloat(b))
  
  for (const interrogatoryNum of sortedInterrogatories) {
    // Use string indexing since JS object keys are strings
    const interrog = (STANDARD_INTERROGATORIES as Record<string, { category: string; text: string }>)[interrogatoryNum]
    if (interrog) {
      // Check if we need a new page
      if (yPosition < margin + 100) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        yPosition = pageHeight - margin
      }
      
      yPosition -= 10
      drawText(`INTERROGATORY NO. ${interrogatoryNum}:`, { font: timesRomanBold, size: 11 })
      drawText(`[${interrog.category}]`, { size: 9 })
      yPosition -= 3
      drawText(interrog.text, { size: 10, indent: 20 })
      yPosition -= 15
    }
  }

  // === SIGNATURE BLOCK ===
  if (yPosition < margin + 150) {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight])
    yPosition = pageHeight - margin
  }
  
  yPosition -= 30
  drawLine()
  yPosition -= 20
  
  drawText('Dated: _______________________', { size: 11 })
  yPosition -= 30
  
  const sigLineX = pageWidth - margin - 250
  currentPage.drawLine({
    start: { x: sigLineX, y: yPosition + 15 },
    end: { x: pageWidth - margin, y: yPosition + 15 },
    thickness: 0.5,
    color: rgb(0, 0, 0)
  })
  
  currentPage.drawText(data.attorneyName, {
    x: sigLineX,
    y: yPosition,
    size: 11,
    font: timesRoman,
    color: rgb(0, 0, 0)
  })
  currentPage.drawText(`Attorney for ${data.attorneyFor}`, {
    x: sigLineX,
    y: yPosition - 15,
    size: 10,
    font: timesRoman,
    color: rgb(0, 0, 0)
  })

  return await pdfDoc.save()
}

// Alternative: Try to fill the official DISC-001 form
// This requires fetching the form and knowing the exact field names
export async function fillOfficialFormInterrogatories(
  data: FormInterrogatoriesData,
  templatePdfBytes: ArrayBuffer
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templatePdfBytes)
  const form = pdfDoc.getForm()
  
  // Log available fields for debugging
  const fields = form.getFields()
  console.log('Available PDF form fields:', fields.map(f => f.getName()))
  
  // Try common field name patterns
  // Note: Actual field names depend on the specific PDF form structure
  const fieldMappings: Record<string, string> = {
    // Attorney info
    'topmostSubform[0].Page1[0].AttyInfo[0]': data.attorneyName,
    'AttorneyName': data.attorneyName,
    'Attorney': data.attorneyName,
    'SBN': data.barNumber,
    'BarNumber': data.barNumber,
    'Firm': data.firmName || '',
    'Address': data.address,
    'CityStateZip': data.cityStateZip,
    'Phone': data.phone,
    'Fax': data.fax || '',
    'Email': data.email || '',
    
    // Court info
    'County': data.county,
    'CourtCounty': data.county,
    
    // Case info
    'Plaintiff': data.plaintiffName,
    'PlaintiffName': data.plaintiffName,
    'Defendant': data.defendantName,
    'DefendantName': data.defendantName,
    'CaseNumber': data.caseNumber,
    'CaseNo': data.caseNumber,
    
    // Set info
    'SetNumber': data.setNumber.toString(),
    'SetNo': data.setNumber.toString()
  }

  // Try to fill each field
  for (const [fieldName, value] of Object.entries(fieldMappings)) {
    trySetTextField(form, fieldName, value)
  }

  // Try to check interrogatory checkboxes
  for (const num of data.selectedInterrogatories) {
    // Try various checkbox naming patterns
    tryCheckBox(form, `Interrogatory${num}`)
    tryCheckBox(form, `Int${num}`)
    tryCheckBox(form, `Question${num}`)
    tryCheckBox(form, `${num}`)
  }

  return await pdfDoc.save()
}

