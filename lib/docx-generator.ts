import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle as TableBorderStyle, Footer, SimpleField, Header } from 'docx'
import { saveAs } from 'file-saver'

export interface DefenseData {
  number: string
  causesOfAction?: string
  title?: string
  content: string
}

export interface AnswerSectionsData {
  preamble?: string
  defenses?: DefenseData[]
  prayer?: string
  signature?: string
}

export interface AnswerData {
  plaintiffName: string
  defendantName: string
  generatedAnswer: string
  answerSections?: AnswerSectionsData  // Optional structured data for better Word output
  isMultipleDefendants?: boolean
  // Attorney/Firm Information
  attorneyName?: string
  stateBarNumber?: string
  email?: string
  lawFirmName?: string
  addressLine1?: string              // Street address (e.g., "2465 Boulevard East, 9th Floor")
  addressLine2?: string              // City, State ZIP (e.g., "Telluride, California 98623-4568")
  phone?: string
  fax?: string
  partyRole?: string                 // e.g., "Defendant" or "Plaintiff" - used in "Attorneys for [partyRole] [clientName]"
  // Court Information
  county?: string                    // e.g., "LOS ANGELES"
  courtDistrict?: string             // e.g., "CENTRAL DISTRICT" (optional)
  caseNumber?: string
  judge?: string
  department?: string
  actionFiled?: string
  trialDate?: string
  // Document Options
  documentTitle?: string             // Custom document title (e.g., "DEFENDANT'S ANSWER TO COMPLAINT")
  useGeneralDenial?: boolean         // Whether to include the general denial paragraph
  customGeneralDenial?: string       // Custom general denial text (optional)
}

export function generateWordDocument(data: AnswerData): Document {
  const { 
    plaintiffName, 
    defendantName, 
    generatedAnswer,
    answerSections,
    isMultipleDefendants = false,
    // Attorney/Firm Information
    attorneyName = "[Attorney Name]",
    stateBarNumber = "[State Bar No.]",
    email = "[email@lawfirm.com]",
    lawFirmName = "[LAW FIRM NAME]",
    addressLine1 = "[Address]",
    addressLine2 = "[City, State ZIP]",
    phone = "[Phone Number]",
    fax = "[Fax Number]",
    partyRole,
    // Court Information
    county = "LOS ANGELES",
    courtDistrict = "",
    caseNumber = "[Case No.]",
    judge = "[Judge Name]",
    department = "[Dept.]",
    actionFiled = "September 3, 2020",
    trialDate = "None",
    // Document Options
    documentTitle,
    useGeneralDenial = true,
    customGeneralDenial,
  } = data

  // Helper variables for singular/plural
  const defendantLabel = isMultipleDefendants ? 'Defendants' : 'Defendant'
  const defendantLabelLower = isMultipleDefendants ? 'defendants' : 'defendant'
  const defendantPossessive = isMultipleDefendants ? "Defendants'" : "Defendant's"
  const defendantPronoun = isMultipleDefendants ? 'Defendants' : 'Defendant'
  const defendantPronounLower = isMultipleDefendants ? 'defendants' : 'defendant'
  const defendantVerb = isMultipleDefendants ? 'answer' : 'answers'
  const defendantVerb2 = isMultipleDefendants ? 'demand' : 'demands'
  const defendantVerb3 = isMultipleDefendants ? 'deny' : 'denies'
  const defendantVerb4 = isMultipleDefendants ? 'allege' : 'alleges'
  const plaintiffLabel = isMultipleDefendants ? 'Plaintiffs' : 'Plaintiff'
  const plaintiffPossessive = isMultipleDefendants ? "Plaintiffs'" : "Plaintiff's"
  const plaintiffPronoun = isMultipleDefendants ? 'Plaintiffs' : 'Plaintiff'
  const plaintiffPronounLower = isMultipleDefendants ? 'plaintiffs' : 'plaintiff'
  
  const children: (Paragraph | Table)[] = []
  let lineCount = 0
  let lineNumber = 1 // Track current line number (1-28, resets per page)
  let afterTitle = false // Track when we've passed the title - line numbers start here

  // Helper function to create TextRun with Times New Roman font
  const createTextRun = (text: string, options: any = {}) => {
    return new TextRun({
      text,
      size: 24, // 12 point font
      font: "Times New Roman",
      ...options,
    })
  }

  // Helper function to add paragraph with line number in left margin
  const addParagraph = (paragraph: Paragraph) => {
    // Only add line numbers after the title (body text)
    if (!afterTitle) {
      // Before title - add paragraph directly without line numbers
      children.push(paragraph)
      return
    }
    
    // Body text uses double spacing (240 twips)
    const lineSpacing = 240 // Double spacing for body text
    
    // Create paragraph for line number in left margin with vertical line
    const lineNumberParagraph = new Paragraph({
      children: [
        createTextRun(lineNumber <= 28 ? lineNumber.toString() : ''),
      ],
      spacing: { 
        line: lineSpacing,
        before: (paragraph as any).spacing?.before || 0,
        after: 0, // No space after - content follows immediately
      },
      alignment: AlignmentType.LEFT,
      indent: {
        left: -1620, // Negative indent for 1.5 inch left margin (1.5 inch = 2160 twips, adjust for line number area)
      },
      border: {
        right: {
          color: "000000",
          size: 4,
          style: BorderStyle.SINGLE,
          space: 0,
        },
      },
    })
    
    // Add line number paragraph
    children.push(lineNumberParagraph)
    
    // Add the content paragraph with left indent to account for margin
    const contentParagraph = new Paragraph({
      ...paragraph,
      spacing: {
        line: 240, // Double spacing for body text
        before: (paragraph as any).spacing?.before || 0,
        after: (paragraph as any).spacing?.after || 0,
      },
      indent: {
        left: 720, // Indent content to start after the margin area (0.5 inch = 720 twips)
      },
    })
    
    children.push(contentParagraph)
    lineCount++
    lineNumber++
    
    // Reset line number after 28 lines and add page break
    if (lineCount % 28 === 0) {
      lineNumber = 1 // Reset to 1 for next page
      children.push(
        new Paragraph({
          children: [new PageBreak()],
          spacing: { line: 240, before: 0, after: 0 }, // Match double spacing
        })
      )
    }
  }

  // Helper function to create 12-point line spaced paragraph
  const createDoubleParagraph = (textRuns: any[], options: any = {}) => {
    // Ensure all TextRuns have Times New Roman font
    const textRunsWithFont = textRuns.map(run => {
      if (run instanceof TextRun) {
        // Create new TextRun with font, preserving all other properties
        return new TextRun({
          text: (run as any).text,
          size: (run as any).size || 24,
          bold: (run as any).bold,
          underline: (run as any).underline,
          font: "Times New Roman",
        })
      }
      return run
    })
    return new Paragraph({
      children: textRunsWithFont,
      spacing: { 
        line: 240, // Exactly 12 point line spacing
        ...options.spacing 
      },
      ...options
    })
  }

  // Helper function to create double spacing paragraph (12 point = 240 twips) for body text
  const createOneAndHalfParagraph = (textRuns: any[], options: any = {}) => {
    // Ensure all TextRuns have Times New Roman font
    const textRunsWithFont = textRuns.map(run => {
      if (run instanceof TextRun) {
        // Create new TextRun with font, preserving all other properties
        return new TextRun({
          text: (run as any).text,
          size: (run as any).size || 24,
          bold: (run as any).bold,
          underline: (run as any).underline,
          font: "Times New Roman",
        })
      }
      return run
    })
    return new Paragraph({
      children: textRunsWithFont,
      spacing: { 
        line: 240, // Double spacing for body text (240 twips)
        ...options.spacing 
      },
      ...options
    })
  }

  // Helper function to add table (tables don't get line numbers, but we count their lines)
  const addTable = (table: Table, estimatedLines: number = 1) => {
    children.push(table)
    lineCount += estimatedLines
    lineNumber += estimatedLines
    
    // Reset line number if it exceeds 28
    if (lineNumber > 28) {
      lineNumber = lineNumber - 28
    }
    
    // Add page break after every 28 lines
    if (lineCount % 28 === 0) {
      lineNumber = 1 // Reset to 1 for next page
      children.push(
        new Paragraph({
          children: [new PageBreak()],
          spacing: { line: 360, before: 0, after: 0 }, // Match 1.5 spacing
        })
      )
    }
  }

  // Attorney Header Information
  addParagraph(
    createDoubleParagraph([
        createTextRun(`${attorneyName.toUpperCase()}, State Bar No. ${stateBarNumber}`),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun(email),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun(lawFirmName.toUpperCase()),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun("Attorneys at Law"),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun(addressLine1),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun(addressLine2),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun(`Telephone: ${phone}`),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        createTextRun(`Facsimile: ${fax}`),
    ], { spacing: { after: 0 } })
  )

  // Use partyRole if provided, otherwise use default based on isMultipleDefendants
  const displayPartyRole = partyRole || defendantLabel
  addParagraph(
    createDoubleParagraph([
        createTextRun(`Attorneys for ${displayPartyRole} ${defendantName}`),
    ], { spacing: { after: 400 } })
  )

  // Court Header
  addParagraph(
    createDoubleParagraph([
        createTextRun("SUPERIOR COURT OF THE STATE OF CALIFORNIA"),
    ], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })
  )

  // Include court district if provided
  const countyLine = courtDistrict 
    ? `COUNTY OF ${county.toUpperCase()}, ${courtDistrict.toUpperCase()}`
    : `COUNTY OF ${county.toUpperCase()}`
  addParagraph(
    createDoubleParagraph([
        createTextRun(countyLine),
    ], { alignment: AlignmentType.CENTER, spacing: { after: 200 } })
  )

  // Case Caption Table (Two Column Layout)
  const caseCaptionTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: TableBorderStyle.NONE, size: 0 },
      bottom: { style: TableBorderStyle.NONE, size: 0 },
      left: { style: TableBorderStyle.NONE, size: 0 },
      right: { style: TableBorderStyle.NONE, size: 0 },
      insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
      insideVertical: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 60,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              bottom: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
              right: { style: TableBorderStyle.NONE, size: 0 },
            },
      children: [
                createDoubleParagraph([
        createTextRun(`${plaintiffName.toUpperCase()}, an individual,`),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
                  createTextRun(""),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
        createTextRun(isMultipleDefendants ? "Plaintiffs," : "Plaintiff,"),
                ], { spacing: { after: 100 } }),
                createDoubleParagraph([
        createTextRun("v."),
                ], { spacing: { after: 100 } }),
                createDoubleParagraph([
        createTextRun(isMultipleDefendants 
            ? `${defendantName.toUpperCase()}, an individual; and DOES 1 to 25, Inclusive`
            : `${defendantName.toUpperCase()}, an individual`),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
                  createTextRun(""),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
        createTextRun(isMultipleDefendants ? "Defendants." : "Defendant."),
                ], { spacing: { after: 0 } }),
              ],
          }),
          new TableCell({
            width: {
              size: 40,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              bottom: { style: TableBorderStyle.NONE, size: 0 },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
              right: { style: TableBorderStyle.NONE, size: 0 },
            },
      children: [
              createDoubleParagraph([
        createTextRun(`Case No. ${caseNumber}`),
              ], { spacing: { after: 100 } }),
              createDoubleParagraph([
                createTextRun(""),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        createTextRun("Assigned for All Purposes to:"),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        createTextRun(`Hon. ${judge}`),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        createTextRun(`Dept. ${department}`),
              ], { spacing: { after: 100 } }),
              createDoubleParagraph([
        createTextRun(`Action Filed: ${actionFiled}`),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        createTextRun(`Trial Date: ${trialDate}`),
              ], { spacing: { after: 0 } }),
            ],
          }),
        ],
        }),
      ],
    })

  addTable(caseCaptionTable, 8)

  // Title - use custom documentTitle if provided, otherwise generate default
  const defaultDocumentTitle = `${defendantLabel.toUpperCase()} ${defendantName.toUpperCase()}'S ANSWER TO ${plaintiffPossessive.toUpperCase()} COMPLAINT; DEMAND FOR JURY TRIAL`
  const displayDocumentTitle = documentTitle || defaultDocumentTitle
  addParagraph(
    createDoubleParagraph([
        createTextRun(displayDocumentTitle, {
          bold: true,
        }),
    ], { alignment: AlignmentType.CENTER, spacing: { after: 200 } })
  )

  // Mark that we're now after the title - start line numbering for body text
  afterTitle = true
  lineNumber = 1 // Start line numbering at 1
  lineCount = 0 // Reset line count for body text

  // Filing information - USE DOUBLE SPACING FROM HERE ON (body text)
  addParagraph(
    createOneAndHalfParagraph([
        new TextRun({
          text: `Action Filed: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createOneAndHalfParagraph([
        new TextRun({
          text: "Trial Date: None",
          size: 24,
        }),
    ], { spacing: { after: 200 } })
  )

  // Opening Statement
  addParagraph(
    createOneAndHalfParagraph([
        new TextRun({
          text: isMultipleDefendants 
            ? "TO PLAINTIFFS AND TO THEIR ATTORNEYS OF RECORD:"
            : "TO PLAINTIFF AND TO HIS ATTORNEY OF RECORD:",
          size: 24,
        }),
    ], { spacing: { after: 200 } })
  )

  addParagraph(
    createOneAndHalfParagraph([
        new TextRun({
          text: isMultipleDefendants
            ? `${defendantLabel} ${defendantName} ("${defendantLabel}") ${defendantVerb} ${plaintiffPronoun} ${plaintiffName} ("${plaintiffPronoun}") Complaint as follows:`
            : `${defendantLabel} ${defendantName} ("${defendantLabel}") ${defendantVerb} ${plaintiffLabel} ${plaintiffName} ("${plaintiffLabel}")'s Complaint as follows:`,
          size: 24,
        }),
    ], { spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED })
  )

  // Jury Demand
  addParagraph(
    createOneAndHalfParagraph([
        new TextRun({
          text: `${defendantPronoun} hereby ${defendantVerb2} a jury trial in the above-entitled action.`,
          size: 24,
        }),
    ], { spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED })
  )

  // General Denial (conditional based on useGeneralDenial flag)
  if (useGeneralDenial) {
    const defaultGeneralDenialText = isMultipleDefendants
      ? `Pursuant to the provisions of Section 431.30, subdivision (d) of the Code of Civil Procedure, ${defendantLabel} generally and specifically ${defendantVerb3} each and every allegation of ${plaintiffPossessive} Complaint, and the whole thereof, including each purported cause of action contained therein, and ${defendantLabel} ${defendantVerb3} that ${plaintiffPronoun} have been damaged in any sum, or sums, due to the conduct or omissions of ${defendantLabel}.`
      : `Pursuant to the provisions of Section 431.30, subdivision (d) of the Code of Civil Procedure, ${defendantLabel} generally and specifically ${defendantVerb3} each and every allegation of ${plaintiffPossessive} Complaint, and the whole thereof, including each purported cause of action contained therein, and ${defendantLabel} ${defendantVerb3} that ${plaintiffLabel} has been damaged in any sum, or sums, due to the conduct or omissions of ${defendantLabel}.`
    
    const generalDenialText = customGeneralDenial || defaultGeneralDenialText
    
    addParagraph(
      createOneAndHalfParagraph([
          new TextRun({
            text: generalDenialText,
            size: 24,
          }),
      ], { spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED })
    )
  }

  // Add preamble if available (from structured data or parsed from text)
  if (answerSections?.preamble) {
    const preambleLines = answerSections.preamble.split('\n').filter(line => line.trim().length > 0)
    preambleLines.forEach((line) => {
      if (line.trim().length > 0) {
        addParagraph(
          createOneAndHalfParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { after: 100 }, alignment: AlignmentType.JUSTIFIED })
        )
      }
    })
    addParagraph(
      createOneAndHalfParagraph([
          new TextRun({
            text: "",
            size: 24,
          }),
      ], { spacing: { after: 200 } })
    )
  }

  // Affirmative Defenses Introduction
  addParagraph(
    createOneAndHalfParagraph([
        new TextRun({
          text: isMultipleDefendants
            ? `${defendantPronoun} herein ${defendantVerb4} and set forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in ${plaintiffPossessive} Complaint as though pleaded separately to each and every such cause of action.`
            : `${defendantPronoun} herein ${defendantVerb4}s and sets forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in ${plaintiffPossessive} Complaint as though pleaded separately to each and every such cause of action.`,
          size: 24,
        }),
    ], { spacing: { after: 300 }, alignment: AlignmentType.JUSTIFIED })
  )

  // Use structured defense data if available, otherwise parse from text
  if (answerSections?.defenses && answerSections.defenses.length > 0) {
    // Use structured data - more accurate and reliable
    answerSections.defenses.forEach((defense) => {
      if (defense.content && defense.content.trim().length > 0) {
        // Defense heading - BOLD and UNDERLINED
        addParagraph(
          new Paragraph({
            children: [
              createTextRun(`${defense.number} AFFIRMATIVE DEFENSE`, {
                bold: true,
                underline: {},
              }),
            ],
            spacing: { line: 240, after: 0 }, // Double spacing for body text
            alignment: AlignmentType.CENTER,
          })
        )

        // Defense subtitle - BOLD and UNDERLINED (if causes of action specified)
        if (defense.causesOfAction && defense.causesOfAction.trim().length > 0) {
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(`(${defense.causesOfAction})`, {
                  bold: true,
                  underline: {},
                }),
              ],
              spacing: { line: 240, after: 0 }, // Double spacing for body text
              alignment: AlignmentType.CENTER,
            })
          )
        } else {
          // Default "To All Causes of Action" if not specified
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(`(To All Causes of Action)`, {
                  bold: true,
                  underline: {},
                }),
              ],
              spacing: { line: 240, after: 0 }, // Double spacing for body text
              alignment: AlignmentType.CENTER,
            })
          )
        }

        // Defense title - BOLD and UNDERLINED
        if (defense.title && defense.title.trim().length > 0) {
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(`(${defense.title})`, {
                  bold: true,
                  underline: {},
                }),
              ],
              spacing: { line: 240, after: 100 }, // Double spacing for body text
              alignment: AlignmentType.CENTER,
            })
          )
        }

        // Defense content - split by newlines to preserve formatting
        const contentLines = defense.content.split('\n').filter(line => line.trim().length > 0)
        if (contentLines.length > 0) {
          const contentText = contentLines.join(' ').trim()
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(contentText),
              ],
              spacing: { line: 240, after: 200 }, // Double spacing for body text
              alignment: AlignmentType.JUSTIFIED,
            })
          )
        }
      }
    })
  } else {
    // Fallback: Parse the generated answer to extract defenses from text
    const defensePattern = /(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH)\s+AFFIRMATIVE\s+DEFENSE/gi
    const matches = [...generatedAnswer.matchAll(defensePattern)]
    
    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const startIndex = matches[i].index!
        const endIndex = i < matches.length - 1 ? matches[i + 1].index! : generatedAnswer.length
        const defenseText = generatedAnswer.substring(startIndex, endIndex).trim()
        const lines = defenseText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        
        const number = matches[i][1]
        let title = ''
        let content = ''
        
        // Extract title from parenthetical lines
        for (let j = 1; j < lines.length; j++) {
          const line = lines[j]
          if (line.startsWith('(') && line.endsWith(')')) {
            if (line.toLowerCase().includes('to all causes of action')) {
              continue
            }
            if (!title) {
              title = line.replace(/[()]/g, '').trim()
            }
          }
        }
        
        // Get content (everything after header and title)
        const contentStart = lines.findIndex((line, idx) => 
          idx > 0 && !(line.startsWith('(') && line.endsWith(')'))
        )
        if (contentStart > 0) {
          content = lines.slice(contentStart).join('\n').trim()
        } else {
          content = lines.slice(1).filter(line => !(line.startsWith('(') && line.endsWith(')'))).join('\n').trim()
        }
        
        if (content) {
          // Defense heading - BOLD and UNDERLINED
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(`${number} AFFIRMATIVE DEFENSE`, {
                  bold: true,
                  underline: {},
                }),
              ],
              spacing: { line: 240, after: 0 }, // Double spacing for body text
              alignment: AlignmentType.CENTER,
            })
          )

          // Defense subtitle - BOLD and UNDERLINED
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(`(To All Causes of Action)`, {
                  bold: true,
                  underline: {},
                }),
              ],
              spacing: { line: 240, after: 0 }, // Double spacing for body text
              alignment: AlignmentType.CENTER,
            })
          )

          // Defense title - BOLD and UNDERLINED
          if (title) {
            addParagraph(
              new Paragraph({
                children: [
                  createTextRun(`(${title})`, {
                    bold: true,
                    underline: {},
                  }),
                ],
                spacing: { line: 240, after: 100 }, // Double spacing for body text
                alignment: AlignmentType.CENTER,
              })
            )
          }

          // Defense content
          addParagraph(
            new Paragraph({
              children: [
                createTextRun(content),
              ],
              spacing: { line: 240, after: 200 }, // Double spacing for body text
              alignment: AlignmentType.JUSTIFIED,
            })
          )
        }
      }
    }
  }

  // Extract prayer section - use structured data if available
  let prayerText = ''
  if (data.answerSections?.prayer) {
    prayerText = data.answerSections.prayer.trim()
  } else {
    // Fallback: parse from generated answer text
    const prayerMatch = generatedAnswer.match(/WHEREFORE/i)
    if (prayerMatch) {
      const prayerStart = prayerMatch.index!
      prayerText = generatedAnswer.substring(prayerStart).trim()
      
      // Remove AI analysis if present
      const aiIndex = prayerText.indexOf('---')
      if (aiIndex > 0) {
        prayerText = prayerText.substring(0, aiIndex).trim()
      }
    }
  }
  
  if (prayerText) {
    const finalPrayerText = prayerText
    
    // Page break lines
    addParagraph(
      createOneAndHalfParagraph([
          new TextRun({
            text: "/ / /",
            size: 24,
          }),
      ], { spacing: { after: 0 } })
    )

    addParagraph(
      createOneAndHalfParagraph([
          new TextRun({
            text: "/ / /",
            size: 24,
          }),
      ], { spacing: { after: 0 } })
    )

    addParagraph(
      createOneAndHalfParagraph([
          new TextRun({
            text: "/ / /",
            size: 24,
          }),
      ], { spacing: { after: 200 } })
    )

    // WHEREFORE Prayer for Relief
    const prayerLines = finalPrayerText.split('\n').filter(line => line.trim().length > 0)
    prayerLines.forEach((line, index) => {
      if (line.trim().toUpperCase().startsWith('WHEREFORE')) {
        addParagraph(
          createOneAndHalfParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { after: 200 } })
        )
      } else if (line.trim().toUpperCase().startsWith('DATED:')) {
        addParagraph(
          createOneAndHalfParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { before: 200, after: 200 } })
        )
      } else if (line.trim().length > 0) {
        addParagraph(
          createOneAndHalfParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { after: 100 } })
        )
      }
    })
  }
  
  // Add proper signature block with attorney data (replacing placeholder signature)
  // Date line
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: `Dated: ${today}`,
        size: 24,
      }),
    ], { spacing: { before: 400, after: 200 } })
  )

  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: "Respectfully submitted,",
        size: 24,
      }),
    ], { spacing: { after: 400 } })
  )

  // Law Firm Name
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: lawFirmName.toUpperCase(),
        size: 24,
        bold: true,
      }),
    ], { spacing: { after: 100 } })
  )

  // Signature line
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: "____________________________",
        size: 24,
      }),
    ], { spacing: { after: 100 } })
  )

  // Attorney Name
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: attorneyName,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  )

  // Bar Number
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: `State Bar No. ${stateBarNumber}`,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  )

  // Email
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: email,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  )

  // Phone
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: `Telephone: ${phone}`,
        size: 24,
      }),
    ], { spacing: { after: 200 } })
  )

  // Attorney for line
  const partyRoleText = partyRole || `${defendantLabel} ${defendantName}`
  addParagraph(
    createOneAndHalfParagraph([
      new TextRun({
        text: `Attorney for ${partyRoleText}`,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  )

  // Create first page header (empty - line numbers are in document body)
  const createFirstPageHeader = () => {
    return new Header({
      children: [
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
    })
  }

  // Create default header (empty - line numbers are in document body)
  const createLineNumberHeader = () => {
    return new Header({
      children: [
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
    })
  }

  // Create first page footer
  const createFirstPageFooter = () => {
    return new Footer({
      children: [
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [
            createTextRun("- "),
            new SimpleField("PAGE"),
            createTextRun(" -"),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [
            createTextRun(`${defendantPossessive.toUpperCase()} ANSWER TO COMPLAINT; CASE No. ${caseNumber}`),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
    })
  }

  // Create default footer
  const createDefaultFooter = () => {
    return new Footer({
      children: [
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [
            createTextRun("- "),
            new SimpleField("PAGE"),
            createTextRun(" -"),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 100 },
        }),
        new Paragraph({
          children: [
            createTextRun(`${defendantPossessive.toUpperCase()} ANSWER TO COMPLAINT; CASE No. ${caseNumber}`),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
    })
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: 2160,      // 1.5 inch left margin in twips (California pleading requirement)
              right: 1440,     // 1 inch right margin in twips
              top: 1440,       // 1 inch top margin in twips
              bottom: 1440,    // 1 inch bottom margin in twips
            },
          },
          titlePage: true, // Enable different first page
        },
        headers: {
          first: createFirstPageHeader(),
          default: createLineNumberHeader(),
          even: createLineNumberHeader(),
        },
        footers: {
          first: createFirstPageFooter(),
          default: createDefaultFooter(),
          even: createDefaultFooter(),
        },
        children: children,
      },
    ],
  })
}

export async function downloadWordDocument(data: AnswerData): Promise<void> {
  console.log('Starting Word document generation...', data)
  
  try {
    const doc = generateWordDocument(data)
    console.log('Document object created successfully')
    
    const blob = await Packer.toBlob(doc)
    console.log('Blob created successfully, size:', blob.size)
    
    const fileName = `Answer_${data.defendantName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`
    console.log('Generated filename:', fileName)
    
    // Enhanced download method with better error handling
    if (typeof saveAs === 'function') {
      console.log('Using file-saver method')
      try {
        saveAs(blob, fileName)
        console.log('file-saver download initiated')
        return
      } catch (saveAsError) {
        console.warn('file-saver failed:', saveAsError)
      }
    }
    
    // Fallback to manual download method
    console.log('Using manual download method')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    
    // Add to DOM, click, and remove
    document.body.appendChild(link)
    link.click()
    
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('Manual download cleanup completed')
    }, 100)
    
  } catch (error) {
    console.error('Error generating Word document:', error)
    if (error instanceof Error) {
    console.error('Error stack:', error.stack)
    throw new Error(`Failed to generate Word document: ${error.message}`)
    } else {
      throw new Error(`Failed to generate Word document: ${String(error)}`)
    }
  }
}

export interface DemandLetterData {
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  attorneyName?: string;
  stateBarNumber?: string;
  email?: string;
  lawFirmName?: string;
  address?: string;
  phone?: string;
  fax?: string;
  caseName?: string;
  caseNumber?: string;
}

export function generateDemandLetterDocument(data: DemandLetterData): Document {
  const {
    sections,
    attorneyName = "[Attorney Name]",
    stateBarNumber = "[State Bar No.]",
    email = "[email@lawfirm.com]",
    lawFirmName = "[LAW FIRM NAME]",
    address = "[Address]",
    phone = "[Phone Number]",
    fax = "[Fax Number]",
    caseName,
    caseNumber
  } = data;

  const children: (Paragraph | Table)[] = [];

  // Helper function to add paragraph
  const addParagraph = (paragraph: Paragraph) => {
    children.push(paragraph);
  };

  // Helper function to create paragraph with proper spacing
  const createParagraph = (textRuns: any[], options: any = {}) => {
    return new Paragraph({
      children: textRuns,
      spacing: { 
        line: 240, // 12 point line spacing
        ...options.spacing 
      },
      ...options
    });
  };

  // Attorney Header Information
  addParagraph(
    createParagraph([
      new TextRun({
        text: `${attorneyName.toUpperCase()}, State Bar No. ${stateBarNumber}`,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: email,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: lawFirmName.toUpperCase(),
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: address,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: `Telephone: ${phone}`,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  if (fax) {
    addParagraph(
      createParagraph([
        new TextRun({
          text: `Facsimile: ${fax}`,
          size: 24,
        }),
      ], { spacing: { after: 400 } })
    );
  } else {
    addParagraph(
      createParagraph([
        new TextRun({
          text: "",
          size: 24,
        }),
      ], { spacing: { after: 400 } })
    );
  }

  // Date
  addParagraph(
    createParagraph([
      new TextRun({
        text: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        size: 24,
      }),
    ], { alignment: AlignmentType.RIGHT, spacing: { after: 400 } })
  );

  // Filter out Case Description section
  const letterSections = sections.filter(s => s.id !== '0');

  // Add each section
  letterSections.forEach((section, index) => {
    // Section Title
    addParagraph(
      createParagraph([
        new TextRun({
          text: `${section.title.toUpperCase()}:`,
          size: 24,
          bold: true,
        }),
      ], { spacing: { after: 200 } })
    );

    // Section Content - split by newlines to preserve formatting
    const contentLines = section.content.split('\n');
    contentLines.forEach((line, lineIndex) => {
      if (line.trim() || lineIndex === 0 || lineIndex === contentLines.length - 1) {
        addParagraph(
          createParagraph([
            new TextRun({
              text: line || ' ',
              size: 24,
            }),
          ], { 
            spacing: { after: line.trim() ? 100 : 0 },
            alignment: AlignmentType.JUSTIFIED 
          })
        );
      }
    });

    // Add spacing between sections (except after last section)
    if (index < letterSections.length - 1) {
      addParagraph(
        createParagraph([
          new TextRun({
            text: "",
            size: 24,
          }),
        ], { spacing: { after: 400 } })
      );
    }
  });

  // Signature section
  addParagraph(
    createParagraph([
      new TextRun({
        text: "",
        size: 24,
      }),
    ], { spacing: { after: 400 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: "Respectfully submitted,",
        size: 24,
      }),
    ], { spacing: { after: 400 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: attorneyName,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: lawFirmName,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: address,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: phone,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  addParagraph(
    createParagraph([
      new TextRun({
        text: email,
        size: 24,
      }),
    ], { spacing: { after: 0 } })
  );

  // Create footer with title and page numbers
  const createDemandLetterFooter = () => {
    return new Footer({
      children: [
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 0 },
        }),
        // Line separator
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 50 },
          border: {
            top: {
              color: "000000",
              size: 4,
              style: BorderStyle.SINGLE,
            },
          },
        }),
        // Page number
        new Paragraph({
          children: [
            new TextRun({
              text: "- ",
              size: 24,
            }),
            new SimpleField("PAGE"),
            new TextRun({
              text: " -",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 50 },
        }),
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: "Demand Letter",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
    });
  };

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: 1440,      // 1 inch left margin
              right: 1440,     // 1 inch right margin
              top: 1440,       // 1 inch top margin
              bottom: 1440,    // 1 inch bottom margin
            },
          },
        },
        footers: {
          default: createDemandLetterFooter(),
          even: createDemandLetterFooter(),
        },
        children: children,
      },
    ],
  });
}

export async function downloadDemandLetterDocument(data: DemandLetterData): Promise<void> {
  try {
    const doc = generateDemandLetterDocument(data);
    const blob = await Packer.toBlob(doc);
    
    const fileName = `Demand_Letter_${data.caseName ? data.caseName.replace(/[^a-zA-Z0-9]/g, '_') : 'Document'}_${new Date().toISOString().split('T')[0]}.docx`;
    
    if (typeof saveAs === 'function') {
      saveAs(blob, fileName);
      return;
    }
    
    // Fallback to manual download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw new Error(`Failed to generate Word document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface SettlementAgreementData {
  sections: Array<{
    id: string;
    title?: string;
    content: string;
  }>;
  caseName?: string;
  caseNumber?: string;
  attorneyName?: string;
  stateBarNumber?: string;
  email?: string;
  lawFirmName?: string;
  address?: string;
  phone?: string;
}

export function generateSettlementAgreementDocument(data: SettlementAgreementData): Document {
  const {
    sections,
    caseName,
    caseNumber,
    attorneyName = "[Attorney Name]",
    stateBarNumber = "[State Bar No.]",
    email = "[email@lawfirm.com]",
    lawFirmName = "[LAW FIRM NAME]",
    address = "[Address]",
    phone = "[Phone Number]",
  } = data;

  const children: (Paragraph | Table)[] = [];

  // Helper function to add paragraph
  const addParagraph = (paragraph: Paragraph) => {
    children.push(paragraph);
  };

  // Helper function to create paragraph with proper spacing
  const createParagraph = (textRuns: any[], options: any = {}) => {
    return new Paragraph({
      children: textRuns,
      spacing: { 
        line: 240, // 12 point line spacing
        ...options.spacing 
      },
      ...options
    });
  };

  // Helper function to get section title
  const getSectionTitle = (section: { title?: string; content: string }): string | null => {
    if (section.title) return section.title;
    
    const lines = section.content.split('\n');
    const firstLine = lines[0]?.trim() || '';
    
    // Check for RECITALS
    if (firstLine === 'R E C I T A L S' || firstLine.match(/^R\s+E\s+C\s+I\s+T\s+A\s+L\s+S$/i)) {
      return 'RECITALS';
    }
    
    // Check for numbered sections (e.g., "1. Consideration")
    const numberedMatch = firstLine.match(/^(\d+)\.\s+(.+?)(?:\.|$)/);
    if (numberedMatch) {
      return numberedMatch[2].trim();
    }
    
    return null;
  };

  // Add each section
  sections.forEach((section, index) => {
    const sectionTitle = getSectionTitle(section);
    
    // Add section title if available
    if (sectionTitle) {
      addParagraph(
        createParagraph([
          new TextRun({
            text: sectionTitle.toUpperCase(),
            size: 24,
            bold: true,
          }),
        ], { spacing: { after: 200 }, alignment: AlignmentType.CENTER })
      );
    }

    // Section Content - split by newlines to preserve formatting
    const contentLines = section.content.split('\n');
    contentLines.forEach((line, lineIndex) => {
      if (line.trim() || lineIndex === 0 || lineIndex === contentLines.length - 1) {
        // Check if line is a numbered paragraph (e.g., "1. Text")
        const numberedMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
        
        if (numberedMatch) {
          // Numbered paragraph - add proper indentation
          addParagraph(
            createParagraph([
              new TextRun({
                text: line || ' ',
                size: 24,
              }),
            ], { 
              spacing: { after: line.trim() ? 100 : 0 },
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                firstLine: 360, // 0.25 inch indent for numbered paragraphs
              }
            })
          );
        } else {
          // Regular paragraph
          addParagraph(
            createParagraph([
              new TextRun({
                text: line || ' ',
                size: 24,
              }),
            ], { 
              spacing: { after: line.trim() ? 100 : 0 },
              alignment: AlignmentType.JUSTIFIED 
            })
          );
        }
      }
    });

    // Add spacing between sections (except after last section)
    if (index < sections.length - 1) {
      addParagraph(
        createParagraph([
          new TextRun({
            text: "",
            size: 24,
          }),
        ], { spacing: { after: 400 } })
      );
    }
  });

  // Create footer with title and page numbers
  const createSettlementAgreementFooter = () => {
    return new Footer({
      children: [
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 0 },
        }),
        // Line separator
        new Paragraph({
          children: [],
          spacing: { line: 240, before: 0, after: 50 },
          border: {
            top: {
              color: "000000",
              size: 4,
              style: BorderStyle.SINGLE,
            },
          },
        }),
        // Page number
        new Paragraph({
          children: [
            new TextRun({
              text: "- ",
              size: 24,
            }),
            new SimpleField("PAGE"),
            new TextRun({
              text: " -",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 50 },
        }),
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: caseName ? `Settlement Agreement - ${caseName}` : "Settlement Agreement",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
    });
  };

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: 1440,      // 1 inch left margin
              right: 1440,     // 1 inch right margin
              top: 1440,       // 1 inch top margin
              bottom: 1440,    // 1 inch bottom margin
            },
          },
        },
        footers: {
          default: createSettlementAgreementFooter(),
          even: createSettlementAgreementFooter(),
        },
        children: children,
      },
    ],
  });
}

export async function downloadSettlementAgreementDocument(data: SettlementAgreementData): Promise<void> {
  try {
    const doc = generateSettlementAgreementDocument(data);
    const blob = await Packer.toBlob(doc);
    
    const fileName = `Settlement_Agreement_${data.caseName ? data.caseName.replace(/[^a-zA-Z0-9]/g, '_') : 'Document'}_${new Date().toISOString().split('T')[0]}.docx`;
    
    if (typeof saveAs === 'function') {
      saveAs(blob, fileName);
      return;
    }
    
    // Fallback to manual download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw new Error(`Failed to generate Word document: ${error instanceof Error ? error.message : String(error)}`);
  }
}
