import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle as TableBorderStyle, Footer, SimpleField, Header } from 'docx'
import { saveAs } from 'file-saver'

// ============================================
// DEMAND LETTER TYPES AND FUNCTIONS
// ============================================

export interface DemandLetterSection {
  id: string
  title: string
  content: string
}

export interface DemandLetterData {
  sections: DemandLetterSection[]
  caseName?: string
  caseNumber?: string
  attorneyName?: string
  stateBarNumber?: string
  email?: string
  lawFirmName?: string
  address?: string
  phone?: string
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
  } = data

  const children: Paragraph[] = []

  // Letterhead
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: lawFirmName.toUpperCase(),
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: address,
          size: 22,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Tel: ${phone} | Email: ${email}`,
          size: 22,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  )

  // Date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          size: 24,
        }),
      ],
      spacing: { after: 400 },
    })
  )

  // Add each section
  sections.forEach((section, index) => {
    // Section title
    if (section.title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      )
    }

    // Section content - split by paragraphs
    const paragraphs = section.content.split('\n').filter(p => p.trim())
    paragraphs.forEach(para => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para.trim(),
              size: 24,
            }),
          ],
          spacing: { after: 150 },
          alignment: AlignmentType.JUSTIFIED,
        })
      )
    })
  })

  // Signature block
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Sincerely,",
          size: 24,
        }),
      ],
      spacing: { before: 400, after: 600 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: attorneyName,
          size: 24,
        }),
      ],
      spacing: { after: 50 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `State Bar No. ${stateBarNumber}`,
          size: 24,
        }),
      ],
      spacing: { after: 50 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: lawFirmName,
          size: 24,
        }),
      ],
    })
  )

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              left: 1440,
              right: 1440,
              top: 1440,
              bottom: 1440,
            },
          },
        },
        children: children,
      },
    ],
  })
}

export async function downloadDemandLetterDocument(data: DemandLetterData): Promise<void> {
  console.log('Starting Demand Letter document generation...')
  
  try {
    const doc = generateDemandLetterDocument(data)
    const blob = await Packer.toBlob(doc)
    
    const fileName = `Demand_Letter_${new Date().toISOString().split('T')[0]}.docx`
    
    if (typeof saveAs === 'function') {
      saveAs(blob, fileName)
      return
    }
    
    // Fallback
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
    
  } catch (error) {
    console.error('Error generating Demand Letter document:', error)
    throw new Error(`Failed to generate Demand Letter: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ============================================
// ANSWER TYPES AND FUNCTIONS
// ============================================

export interface AnswerDataDefense {
  id?: string
  number: string
  causesOfAction?: string
  title?: string
  content: string
}

export interface AnswerDataSections {
  preamble: string
  defenses: AnswerDataDefense[]
  prayer: string
  signature: string
}

export interface AnswerData {
  plaintiffName: string
  defendantName: string
  generatedAnswer: string
  answerSections?: AnswerDataSections
  isMultipleDefendants?: boolean
  useGeneralDenial?: boolean
  attorneyName?: string
  stateBarNumber?: string
  email?: string
  lawFirmName?: string
  address?: string
  addressLine1?: string
  addressLine2?: string
  phone?: string
  fax?: string
  county?: string
  courtDistrict?: string
  caseNumber?: string
  judge?: string
  department?: string
  actionFiled?: string
  trialDate?: string
}

export function generateWordDocument(data: AnswerData): Document {
  const { 
    plaintiffName, 
    defendantName, 
    generatedAnswer,
    attorneyName = "[Attorney Name]",
    stateBarNumber = "[State Bar No.]",
    email = "[email@lawfirm.com]",
    lawFirmName = "[LAW FIRM NAME]",
    address = "[Address]",
    phone = "[Phone Number]",
    fax = "[Fax Number]",
    county = "LOS ANGELES",
    caseNumber = "[Case No.]",
    judge = "[Judge Name]",
    department = "[Dept.]",
    actionFiled = "September 3, 2020",
    trialDate = "None"
  } = data
  
  const children: (Paragraph | Table)[] = []
  let lineCount = 0

  // Helper function to add paragraph and track line count with double spacing
  const addParagraph = (paragraph: Paragraph) => {
    children.push(paragraph)
    lineCount++
    
    // Add page break after every 28 lines
    if (lineCount % 28 === 0) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
          spacing: { line: 240 }, // Ensure page break has 12-point spacing
        })
      )
    }
  }

  // Helper function to create 12-point line spaced paragraph
  const createDoubleParagraph = (textRuns: any[], options: any = {}) => {
    return new Paragraph({
      children: textRuns,
      spacing: { 
        line: 240, // Exactly 12 point line spacing
        ...options.spacing 
      },
      ...options
    })
  }

  // Helper function to add table
  const addTable = (table: Table, estimatedLines: number = 1) => {
    children.push(table)
    lineCount += estimatedLines
    
    // Add page break after every 28 lines
    if (lineCount % 28 === 0) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      )
    }
  }

  // Attorney Header Information
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `${attorneyName.toUpperCase()}, State Bar No. ${stateBarNumber}`,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: email,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: lawFirmName.toUpperCase(),
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "Attorneys at Law",
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: address,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `Telephone: ${phone}`,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `Facsimile: ${fax}`,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `Attorneys for Defendant ${defendantName}`,
          size: 24,
        }),
    ], { spacing: { after: 400 } })
  )

  // Court Header
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "SUPERIOR COURT OF THE STATE OF CALIFORNIA",
          size: 24,
        }),
    ], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `COUNTY OF ${county.toUpperCase()}`,
          size: 24,
        }),
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
        new TextRun({
          text: `${plaintiffName.toUpperCase()}, an individual,`,
          size: 24,
        }),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
                  new TextRun({
                    text: "",
                    size: 24,
                  }),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
        new TextRun({
          text: "Plaintiffs,",
          size: 24,
        }),
                ], { spacing: { after: 100 } }),
                createDoubleParagraph([
        new TextRun({
          text: "v.",
          size: 24,
        }),
                ], { spacing: { after: 100 } }),
                createDoubleParagraph([
        new TextRun({
          text: `${defendantName.toUpperCase()}, an individual; and DOES 1 to 25, Inclusive`,
          size: 24,
        }),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
                  new TextRun({
                    text: "",
                    size: 24,
                  }),
                ], { spacing: { after: 0 } }),
                createDoubleParagraph([
        new TextRun({
          text: "Defendants.",
          size: 24,
        }),
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
        new TextRun({
          text: `Case No. ${caseNumber}`,
          size: 24,
        }),
              ], { spacing: { after: 100 } }),
              createDoubleParagraph([
                new TextRun({
                  text: "",
                  size: 24,
                }),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        new TextRun({
          text: "Assigned for All Purposes to:",
          size: 24,
        }),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        new TextRun({
          text: `Hon. ${judge}`,
          size: 24,
        }),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        new TextRun({
          text: `Dept. ${department}`,
          size: 24,
                }),
              ], { spacing: { after: 100 } }),
              createDoubleParagraph([
        new TextRun({
          text: `Action Filed: ${actionFiled}`,
          size: 24,
        }),
              ], { spacing: { after: 0 } }),
              createDoubleParagraph([
        new TextRun({
          text: `Trial Date: ${trialDate}`,
          size: 24,
        }),
              ], { spacing: { after: 0 } }),
            ],
          }),
        ],
        }),
      ],
    })

  addTable(caseCaptionTable, 8)

  // Title
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `DEFENDANT ${defendantName.toUpperCase()}'S ANSWER TO PLAINTIFFS' COMPLAINT; DEMAND FOR JURY TRIAL`,
          bold: true,
          size: 24,
        }),
    ], { alignment: AlignmentType.CENTER, spacing: { after: 200 } })
  )

  // Filing information
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `Action Filed: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          size: 24,
        }),
    ], { spacing: { after: 0 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "Trial Date: None",
          size: 24,
        }),
    ], { spacing: { after: 200 } })
  )

  // Opening Statement
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "TO PLAINTIFFS AND TO THEIR ATTORNEYS OF RECORD:",
          size: 24,
        }),
    ], { spacing: { after: 200 } })
  )

  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: `Defendant ${defendantName} ("Defendant") answers Plaintiffs ${plaintiffName} ("Plaintiffs") Complaint as follows:`,
          size: 24,
        }),
    ], { spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED })
  )

  // Jury Demand
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "Defendant hereby demands a jury trial in the above-entitled action.",
          size: 24,
        }),
    ], { spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED })
  )

  // General Denial
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "Pursuant to the provisions of Section 431.30, subdivision (d) of the Code of Civil Procedure, Defendant generally and specifically denies each and every allegation of Plaintiffs' Complaint, and the whole thereof, including each purported cause of action contained therein, and Defendant denies that Plaintiffs have been damaged in any sum, or sums, due to the conduct or omissions of Defendant.",
          size: 24,
        }),
    ], { spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED })
  )

  // Affirmative Defenses Introduction
  addParagraph(
    createDoubleParagraph([
        new TextRun({
          text: "Defendant herein alleges and sets forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in Plaintiffs' Complaint as though pleaded separately to each and every such cause of action.",
          size: 24,
        }),
    ], { spacing: { after: 300 }, alignment: AlignmentType.JUSTIFIED })
  )

  // Parse the generated answer to extract defenses
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
              new TextRun({
                text: `${number} AFFIRMATIVE DEFENSE`,
                size: 24,
                bold: true,
                underline: {},
              }),
            ],
            spacing: { after: 0 },
            alignment: AlignmentType.CENTER,
          })
        )

        // Defense subtitle - BOLD and UNDERLINED
        addParagraph(
          new Paragraph({
            children: [
              new TextRun({
                text: `(To All Causes of Action)`,
                size: 24,
                bold: true,
                underline: {},
              }),
            ],
            spacing: { after: 0 },
            alignment: AlignmentType.CENTER,
          })
        )

        // Defense title - BOLD and UNDERLINED
        if (title) {
          addParagraph(
            new Paragraph({
              children: [
                new TextRun({
                  text: `(${title})`,
                  size: 24,
                  bold: true,
                  underline: {},
                }),
              ],
              spacing: { after: 100 },
              alignment: AlignmentType.CENTER,
            })
          )
        }

        // Defense content
        addParagraph(
          new Paragraph({
            children: [
              new TextRun({
                text: `1. ${content}`,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          })
        )
      }
    }
  }

  // Extract prayer section
  const prayerMatch = generatedAnswer.match(/WHEREFORE/i)
  if (prayerMatch) {
    const prayerStart = prayerMatch.index!
    const prayerText = generatedAnswer.substring(prayerStart).trim()
    
    // Remove AI analysis if present
    const aiIndex = prayerText.indexOf('---')
    const finalPrayerText = aiIndex > 0 ? prayerText.substring(0, aiIndex).trim() : prayerText
    
    // Page break lines
    addParagraph(
      createDoubleParagraph([
          new TextRun({
            text: "/ / /",
            size: 24,
          }),
      ], { spacing: { after: 0 } })
    )

    addParagraph(
      createDoubleParagraph([
          new TextRun({
            text: "/ / /",
            size: 24,
          }),
      ], { spacing: { after: 0 } })
    )

    addParagraph(
      createDoubleParagraph([
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
          createDoubleParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { after: 200 } })
        )
      } else if (line.trim().toUpperCase().startsWith('DATED:')) {
        addParagraph(
          createDoubleParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { before: 200, after: 200 } })
        )
      } else if (line.trim().length > 0) {
        addParagraph(
          createDoubleParagraph([
              new TextRun({
                text: line.trim(),
                size: 24,
              }),
          ], { spacing: { after: 100 } })
        )
      }
    })
  }

  // Create first page header with law firm info
  const createFirstPageHeader = () => {
    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: lawFirmName.toUpperCase() || "[LAW FIRM NAME]",
              size: 24,
              bold: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: address || "[Address]",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Telephone: ${phone || "[Phone Number]"}  •  Facsimile: ${fax || "[Fax Number]"}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 200 },
        }),
      ],
    })
  }

  // Create default header with line numbers 1-28
  const createLineNumberHeader = () => {
    const lineNumbers = Array.from({ length: 28 }, (_, i) => i + 1)
    
    return new Header({
      children: lineNumbers.map(num => 
        new Paragraph({
          children: [
            new TextRun({
              text: num.toString(),
              size: 24,
            }),
          ],
          indent: {
            left: -1080, // Position in left margin
          },
          spacing: { line: 240, before: 0, after: 0 },
        })
      ),
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
            new TextRun({
              text: "DEFENDANT'S ANSWER TO COMPLAINT",
              size: 24,
            }),
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
            new TextRun({
              text: "DEFENDANT'S ANSWER TO COMPLAINT",
              size: 24,
            }),
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
              left: 1440,      // 1 inch left margin in twips
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




