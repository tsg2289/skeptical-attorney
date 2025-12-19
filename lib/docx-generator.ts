import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle as TableBorderStyle, BorderStyle, Footer, PageNumber, Header } from 'docx'
import { saveAs } from 'file-saver'

// ============================================
// DEMAND LETTER TYPES AND FUNCTIONS
// ============================================

export interface DemandLetterSection {
  id: string
  title: string
  content: string
}

interface Recipient {
  id: string
  name: string
  firm: string
  address: string
  phone: string
  email: string
}

interface REInfo {
  caseName: string
  dateOfLoss: string
  caseNumber: string
}

export interface DemandLetterData {
  sections: DemandLetterSection[]
  caseName?: string
  caseNumber?: string
  // Sender (attorney) info
  attorneyName?: string
  stateBarNumber?: string
  email?: string
  lawFirmName?: string
  address?: string
  phone?: string
  // Recipients info (multiple)
  recipients?: Recipient[]
  sendVia?: string
  // RE: section info
  reInfo?: REInfo
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
    // Recipients info (multiple)
    recipients = [],
    sendVia = "Certified Mail",
    // RE: section info
    reInfo,
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
      spacing: { after: 100 },
    })
  )

  // Horizontal line separator after letterhead
  children.push(
    new Paragraph({
      children: [],
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 300 },
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
      spacing: { after: 200 },
    })
  )

  // Send Via
  if (sendVia) {
    const sendViaText = sendVia === 'Certified Mail' 
      ? 'VIA CERTIFIED MAIL, RETURN RECEIPT REQUESTED'
      : `VIA ${sendVia.toUpperCase()}`
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: sendViaText,
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      })
    )
  }

  // Recipients Address Blocks (multiple)
  if (recipients && recipients.length > 0) {
    recipients.forEach((recipient, index) => {
      // Add spacing between recipients
      if (index > 0) {
        children.push(
          new Paragraph({
            children: [],
            spacing: { after: 150 },
          })
        )
      }
      
      if (recipient.name) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipient.name,
                size: 24,
              }),
            ],
            spacing: { after: 50 },
          })
        )
      }
      if (recipient.firm) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipient.firm,
                size: 24,
              }),
            ],
            spacing: { after: 50 },
          })
        )
      }
      if (recipient.address) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipient.address,
                size: 24,
              }),
            ],
            spacing: { after: 50 },
          })
        )
      }
      if (recipient.email) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: recipient.email,
                size: 24,
              }),
            ],
            spacing: { after: 50 },
          })
        )
      }
    })
    
    // Add spacing after all recipients
    children.push(
      new Paragraph({
        children: [],
        spacing: { after: 150 },
      })
    )
  }

  // RE: Section
  if (reInfo && (reInfo.caseName || reInfo.dateOfLoss || reInfo.caseNumber)) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'RE:',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 50 },
      })
    )

    // Confidential Demand Letter
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '     CONFIDENTIAL DEMAND LETTER',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 50 },
      })
    )

    // Case Name
    if (reInfo.caseName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `     Case: ${reInfo.caseName}`,
              size: 24,
            }),
          ],
          spacing: { after: 50 },
        })
      )
    }

    // Date of Loss
    if (reInfo.dateOfLoss) {
      const formattedDate = new Date(reInfo.dateOfLoss).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `     Date of Loss: ${formattedDate}`,
              size: 24,
            }),
          ],
          spacing: { after: 50 },
        })
      )
    }

    // Case/Claim Number
    if (reInfo.caseNumber) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `     Our File No./Claim No.: ${reInfo.caseNumber}`,
              size: 24,
            }),
          ],
          spacing: { after: 50 },
        })
      )
    }

    // Add spacing after RE: section
    children.push(
      new Paragraph({
        children: [],
        spacing: { after: 150 },
      })
    )
  }

  // Spacing before content
  children.push(
    new Paragraph({
      children: [],
      spacing: { after: 200 },
    })
  )

  // Add each section (filter out Case Description which has id '0')
  sections.filter(s => s.id !== '0').forEach((section, index) => {
    // Section title
    if (section.title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${section.title.toUpperCase()}:`,
              bold: true,
              underline: {},
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
  includeProofOfService?: boolean
  proofOfServiceText?: string
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
    trialDate = "None",
    includeProofOfService = false,
    proofOfServiceText = ''
  } = data
  
  const children: (Paragraph | Table)[] = []

  // California pleading line spacing
  // 24pt line spacing = 480 twips (24 × 20 twips per point)
  const PLEADING_LINE_HEIGHT = 480
  const SINGLE_LINE_SPACING = 240

  // Create header with fixed line numbers 1-28 in a floating table
  const createLineNumberHeader = () => {
    // Create paragraph with lines extending full page height
    // 35 lines covers full 11" page, but only show numbers 1-28
    const lineNumberText: TextRun[] = []
    
    // Add 3 blank lines at top (before line 1) to account for top margin area
    for (let i = 0; i < 3; i++) {
      lineNumberText.push(new TextRun({
        text: ' ',
        size: 24,
        font: 'Times New Roman',
      }))
      lineNumberText.push(new TextRun({
        text: '',
        break: 1,
        size: 24,
        font: 'Times New Roman',
      }))
    }
    
    // Add numbered lines 1-28
    for (let i = 1; i <= 28; i++) {
      lineNumberText.push(new TextRun({
        text: String(i),
        size: 24,
        font: 'Times New Roman',
      }))
      lineNumberText.push(new TextRun({
        text: '',
        break: 1,
        size: 24,
        font: 'Times New Roman',
      }))
    }
    
    // Add 4 blank lines at bottom to extend to page bottom
    for (let i = 0; i < 4; i++) {
      lineNumberText.push(new TextRun({
        text: ' ',
        size: 24,
        font: 'Times New Roman',
      }))
      if (i < 3) {
        lineNumberText.push(new TextRun({
          text: '',
          break: 1,
          size: 24,
          font: 'Times New Roman',
        }))
      }
    }
    
    const lineNumberParagraph = new Paragraph({
      children: lineNumberText,
      spacing: {
        line: PLEADING_LINE_HEIGHT,
        lineRule: 'exact' as any,
        before: 0,
        after: 0,
      },
      alignment: AlignmentType.RIGHT,
    })
    
    // Create a floating table positioned in left margin - starts at top of page
    const lineNumberTable = new Table({
      width: { size: 900, type: WidthType.DXA },
      float: {
        horizontalAnchor: 'page' as any,
        verticalAnchor: 'page' as any,
        absoluteHorizontalPosition: 360,  // 0.25 inch from left edge of page
        absoluteVerticalPosition: 0,      // Start at top of page
      },
      borders: {
        top: { style: TableBorderStyle.NONE, size: 0 },
        bottom: { style: TableBorderStyle.NONE, size: 0 },
        left: { style: TableBorderStyle.NONE, size: 0 },
        right: { style: TableBorderStyle.DOUBLE, size: 6, color: "000000" }, // Double line to right of numbers
        insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
        insideVertical: { style: TableBorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 900, type: WidthType.DXA },
              children: [lineNumberParagraph],
              margins: {
                right: 100, // Add space between numbers and border
              },
              borders: {
                top: { style: TableBorderStyle.NONE, size: 0 },
                bottom: { style: TableBorderStyle.NONE, size: 0 },
                left: { style: TableBorderStyle.NONE, size: 0 },
                right: { style: TableBorderStyle.DOUBLE, size: 6, color: "000000" }, // Double line to right of numbers
              },
            }),
          ],
        }),
      ],
    })
    
    // Create a floating table for right border line
    // 35 lines to extend full page height
    const rightBorderText: TextRun[] = []
    for (let i = 1; i <= 35; i++) {
      rightBorderText.push(new TextRun({
        text: ' ', // Empty space
        size: 24,
        font: 'Times New Roman',
      }))
      if (i < 35) {
        rightBorderText.push(new TextRun({
          text: '',
          break: 1,
          size: 24,
          font: 'Times New Roman',
        }))
      }
    }
    
    const rightBorderParagraph = new Paragraph({
      children: rightBorderText,
      spacing: {
        line: PLEADING_LINE_HEIGHT,
        lineRule: 'exact' as any,
        before: 0,
        after: 0,
      },
    })
    
    // Position at right side of page - starts at top
    const rightBorderTable = new Table({
      width: { size: 100, type: WidthType.DXA }, // Narrow table just for border
      float: {
        horizontalAnchor: 'page' as any,
        verticalAnchor: 'page' as any,
        absoluteHorizontalPosition: 10800, // Near right edge (8.5" page = 12240 twips, minus margin)
        absoluteVerticalPosition: 0,       // Start at top of page
      },
      borders: {
        top: { style: TableBorderStyle.NONE, size: 0 },
        bottom: { style: TableBorderStyle.NONE, size: 0 },
        left: { style: TableBorderStyle.SINGLE, size: 6, color: "000000" }, // Single line on left (appears as right border)
        right: { style: TableBorderStyle.NONE, size: 0 },
        insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
        insideVertical: { style: TableBorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.DXA },
              children: [rightBorderParagraph],
              borders: {
                top: { style: TableBorderStyle.NONE, size: 0 },
                bottom: { style: TableBorderStyle.NONE, size: 0 },
                left: { style: TableBorderStyle.SINGLE, size: 6, color: "000000" },
                right: { style: TableBorderStyle.NONE, size: 0 },
              },
            }),
          ],
        }),
      ],
    })
    
    return new Header({
      children: [lineNumberTable, rightBorderTable],
    })
  }

  // Helper to create paragraph with exact line height to match line numbers
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24, // 12pt
          font: 'Times New Roman',
          ...options.textOptions
        }),
      ],
      spacing: { 
        line: PLEADING_LINE_HEIGHT, // Match line number spacing for proper page breaks
        lineRule: 'exact' as any,
        before: 0,
        after: 0,
        ...options.spacing 
      },
      ...options
    })
  }

  // Helper for single-spaced header content
  const createHeaderParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24, // 12pt
          font: 'Times New Roman',
          ...options.textOptions
        }),
      ],
      spacing: { 
        line: 240, // Single spacing for header
        lineRule: 'auto' as any,
        before: 0,
        after: 0,
        ...options.spacing 
      },
      ...options
    })
  }

  // Attorney Header (single-spaced, no indent)
  children.push(createHeaderParagraph(`${attorneyName}, State Bar No. ${stateBarNumber}`))
  children.push(createHeaderParagraph(lawFirmName))
  children.push(createHeaderParagraph(address))
  children.push(createHeaderParagraph(`Telephone: ${phone}`))
  children.push(createHeaderParagraph(`Facsimile: ${fax}`))
  children.push(createHeaderParagraph(email))
  
  // Blank line
  children.push(createHeaderParagraph(''))
  
  // Attorney for line
  children.push(createHeaderParagraph(`Attorney for Defendant ${defendantName}`))
  
  // Blank lines before court
  children.push(createHeaderParagraph(''))
  children.push(createHeaderParagraph(''))

  // Court Header - centered (single-spaced)
  children.push(createHeaderParagraph('SUPERIOR COURT OF THE STATE OF CALIFORNIA', { 
    alignment: AlignmentType.CENTER 
  }))
  children.push(createHeaderParagraph(`COUNTY OF ${county.toUpperCase()}`, { 
    alignment: AlignmentType.CENTER 
  }))

  // Blank line
  children.push(createParagraph(''))

  // Case Caption Table
  const captionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: TableBorderStyle.NONE, size: 0 },
      bottom: { style: TableBorderStyle.NONE, size: 0 },
      left: { style: TableBorderStyle.NONE, size: 0 },
      right: { style: TableBorderStyle.NONE, size: 0 },
      insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
      insideVertical: { style: TableBorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          // Left side - parties
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              bottom: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
            },
      children: [
              createHeaderParagraph(`${plaintiffName.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Plaintiff,'),
              createHeaderParagraph(''),
              createHeaderParagraph('     vs.'),
              createHeaderParagraph(''),
              createHeaderParagraph(`${defendantName.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Defendant.'),
              ],
          }),
          // Right side - case info
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              bottom: { style: TableBorderStyle.NONE, size: 0 },
              right: { style: TableBorderStyle.NONE, size: 0 },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
            },
            margins: { left: 200 },
      children: [
              createHeaderParagraph(`Case No. ${caseNumber}`),
              createHeaderParagraph(''),
              createHeaderParagraph('Assigned for All Purposes to:'),
              createHeaderParagraph(`Hon. ${judge}`),
              createHeaderParagraph(`Dept. ${department}`),
              createHeaderParagraph(''),
              new Paragraph({
                children: [
        new TextRun({
                    text: `DEFENDANT ${defendantName.toUpperCase()}'S ANSWER TO PLAINTIFFS' COMPLAINT; DEMAND FOR JURY TRIAL`,
          size: 24,
                    font: 'Times New Roman',
                    bold: true,
                  }),
                ],
                spacing: { line: 240, lineRule: 'auto' as any }, // Single spacing
              }),
              createHeaderParagraph(''),
              createHeaderParagraph(`Action Filed: ${actionFiled}`),
              createHeaderParagraph(`Trial Date: ${trialDate}`),
            ],
          }),
        ],
        }),
      ],
    })
  children.push(captionTable)

  // Blank line after caption
  children.push(createHeaderParagraph(''))

  // Opening Statement
  children.push(new Paragraph({
    children: [
        new TextRun({
        text: 'TO PLAINTIFFS AND TO THEIR ATTORNEYS OF RECORD:',
          size: 24,
        font: 'Times New Roman',
        bold: true,
        }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  children.push(new Paragraph({
    children: [
        new TextRun({
        text: `Defendant ${defendantName} ("Defendant") answers Plaintiffs ${plaintiffName} ("Plaintiffs") Complaint as follows:`,
          size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    indent: { firstLine: 720 },
  }))

  // Jury Demand
  children.push(new Paragraph({
    children: [
        new TextRun({
        text: 'Defendant hereby demands a jury trial in the above-entitled action.',
          size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    indent: { firstLine: 720 },
  }))

  // General Denial
  children.push(new Paragraph({
    children: [
        new TextRun({
        text: 'Pursuant to the provisions of Section 431.30, subdivision (d) of the ',
          size: 24,
        font: 'Times New Roman',
        }),
        new TextRun({
        text: 'Code of Civil Procedure',
          size: 24,
        font: 'Times New Roman',
        italics: true,
      }),
        new TextRun({
        text: ', Defendant generally and specifically denies each and every allegation of Plaintiffs\' Complaint, and the whole thereof, including each purported cause of action contained therein, and Defendant denies that Plaintiffs have been damaged in any sum, or sums, due to the conduct or omissions of Defendant.',
          size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    indent: { firstLine: 720 },
    alignment: AlignmentType.JUSTIFIED,
  }))

  // Add filler lines after General Denial to fill page to line 28
  for (let i = 0; i < 5; i++) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '/ / /', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }))
  }

  // Affirmative Defenses Introduction
  children.push(new Paragraph({
    children: [
        new TextRun({
        text: 'Defendant herein alleges and sets forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in Plaintiffs\' Complaint as though pleaded separately to each and every such cause of action.',
          size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    indent: { firstLine: 720 },
    alignment: AlignmentType.JUSTIFIED,
  }))

  // Use answerSections if available, otherwise parse from generatedAnswer
  const answerSections = data.answerSections
  
  if (answerSections && answerSections.defenses && answerSections.defenses.length > 0) {
    // Use structured data directly
    answerSections.defenses.forEach((defense, index) => {
      // Get content and strip any prayer text (WHEREFORE...)
      let content = defense.content || ''
      const whereforeIndex = content.indexOf('WHEREFORE')
      if (whereforeIndex > 0) {
        content = content.substring(0, whereforeIndex).trim()
      }
      
      if (content) {
        // Defense heading
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: `${defense.number} AFFIRMATIVE DEFENSE`,
              size: 24,
              font: 'Times New Roman',
              bold: true,
              underline: {},
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
          alignment: AlignmentType.CENTER,
        }))

        // Causes of action applied
        if (defense.causesOfAction) {
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: `(${defense.causesOfAction})`,
                size: 24,
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
            alignment: AlignmentType.CENTER,
          }))
        } else {
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: '(To All Causes of Action)',
                size: 24,
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
            alignment: AlignmentType.CENTER,
          }))
        }

        // Defense title
        if (defense.title) {
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: `(${defense.title})`,
                size: 24,
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
            alignment: AlignmentType.CENTER,
          }))
        }

        // Defense content
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: content,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
          indent: { firstLine: 720 },
          alignment: AlignmentType.JUSTIFIED,
        }))
      }
    })
  } else {
    // Fallback: Parse from generatedAnswer
    const defensePattern = /(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH|TWENTY-FIRST|TWENTY-SECOND|TWENTY-THIRD|TWENTY-FOURTH|TWENTY-FIFTH|TWENTY-SIXTH|TWENTY-SEVENTH|TWENTY-EIGHTH|TWENTY-NINTH|THIRTIETH)\s+AFFIRMATIVE\s+DEFENSE/gi
    const matches = [...generatedAnswer.matchAll(defensePattern)]
    
    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const startIndex = matches[i].index!
        const endIndex = i < matches.length - 1 ? matches[i + 1].index! : generatedAnswer.length
        let defenseText = generatedAnswer.substring(startIndex, endIndex).trim()
        
        // Strip prayer text from defense content
        const whereforeIndex = defenseText.indexOf('WHEREFORE')
        if (whereforeIndex > 0) {
          defenseText = defenseText.substring(0, whereforeIndex).trim()
        }
        
        const lines = defenseText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        
        const number = matches[i][1]
        let title = ''
        let content = ''
        
        // Extract title from parenthetical lines
        for (let j = 1; j < lines.length; j++) {
          const line = lines[j]
          if (line.startsWith('(') && line.endsWith(')')) {
            if (line.toLowerCase().includes('to all causes of action')) continue
            if (!title) title = line.replace(/[()]/g, '').trim()
          }
        }
        
        // Get content
        const contentStart = lines.findIndex((line, idx) => idx > 0 && !(line.startsWith('(') && line.endsWith(')')))
        if (contentStart > 0) {
          content = lines.slice(contentStart).join('\n').trim()
        } else {
          content = lines.slice(1).filter(line => !(line.startsWith('(') && line.endsWith(')'))).join('\n').trim()
        }
        
        if (content) {
          // Defense heading
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: `${number} AFFIRMATIVE DEFENSE`,
                size: 24,
                font: 'Times New Roman',
                bold: true,
                underline: {},
              }),
            ],
            spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
            alignment: AlignmentType.CENTER,
          }))

          children.push(new Paragraph({
            children: [
              new TextRun({
                text: '(To All Causes of Action)',
                size: 24,
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
            alignment: AlignmentType.CENTER,
          }))

          if (title) {
            children.push(new Paragraph({
              children: [
                new TextRun({
                  text: `(${title})`,
                  size: 24,
                  font: 'Times New Roman',
                  bold: true,
                }),
              ],
              spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
              alignment: AlignmentType.CENTER,
            }))
          }

          // Defense content
          children.push(new Paragraph({
            children: [
              new TextRun({
                text: content,
                size: 24,
                font: 'Times New Roman',
              }),
            ],
            spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
            indent: { firstLine: 720 },
            alignment: AlignmentType.JUSTIFIED,
          }))
        }
      }
    }
  }

  // Prayer Section - use answerSections if available
  let prayerText = ''
  if (answerSections && answerSections.prayer) {
    prayerText = answerSections.prayer
  } else {
    const prayerMatch = generatedAnswer.match(/WHEREFORE/i)
    if (prayerMatch) {
      const prayerStart = prayerMatch.index!
      const extractedPrayer = generatedAnswer.substring(prayerStart).trim()
      const aiIndex = extractedPrayer.indexOf('---')
      prayerText = aiIndex > 0 ? extractedPrayer.substring(0, aiIndex).trim() : extractedPrayer
      // Also remove signature block if present
      const datedIndex = prayerText.indexOf('Dated:')
      if (datedIndex > 0) {
        prayerText = prayerText.substring(0, datedIndex).trim()
      }
    }
  }
  
  if (prayerText) {
    // Page filler before prayer
    children.push(new Paragraph({
      children: [new TextRun({ text: '/ / /', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: '/ / /', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: '/ / /', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }))

    const prayerLines = prayerText.split('\n').filter(line => line.trim().length > 0)
    prayerLines.forEach((line) => {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line.trim(),
            size: 24,
            font: 'Times New Roman',
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        indent: { firstLine: 720 },
      }))
    })
  }

  // Signature Block
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Add spacing before signature
  children.push(new Paragraph({
    children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Dated line
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: `Dated: ${currentDate}`,
        size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Blank lines for signature space
  children.push(new Paragraph({
    children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Respectfully submitted
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: 'Respectfully submitted,',
        size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Law firm name
  if (lawFirmName && lawFirmName !== '[LAW FIRM NAME]') {
    children.push(new Paragraph({
      children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    }))
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: lawFirmName.toUpperCase(),
          size: 24,
          font: 'Times New Roman',
          bold: true,
        }),
      ],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    }))
  }

  // Signature line
  children.push(new Paragraph({
    children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))
  children.push(new Paragraph({
    children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: '________________________________',
        size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Attorney name
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: attorneyName,
        size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // State Bar number
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: `State Bar No. ${stateBarNumber}`,
        size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Attorney for Defendant
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: `Attorney for Defendant ${defendantName}`,
        size: 24,
        font: 'Times New Roman',
      }),
    ],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }))

  // Add Proof of Service if enabled
  if (includeProofOfService && proofOfServiceText) {
    // Add page break before Proof of Service
    children.push(new Paragraph({
      children: [],
      pageBreakBefore: true,
    }))
    
    // Parse and add Proof of Service text
    const posLines = proofOfServiceText.split('\n')
    for (const line of posLines) {
      const trimmedLine = line.trim()

      // Check if it's a title/header line
      if (trimmedLine === 'PROOF OF SERVICE') {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
              bold: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, after: 240 },
        }))
      } else if (trimmedLine.startsWith('STATE OF CALIFORNIA')) {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
              bold: true,
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        }))
      } else if (trimmedLine.includes('________________________________')) {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        }))
      } else if (trimmedLine === '') {
        children.push(new Paragraph({
          children: [new TextRun({ text: '', size: 24, font: 'Times New Roman' })],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        }))
      } else {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        }))
      }
    }
  }

  // Helper to add filler lines ("/ / /") to fill remaining space on page
  const addFillerLines = (count: number) => {
    for (let i = 0; i < count; i++) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: '/ / /',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        alignment: AlignmentType.CENTER,
      }))
    }
  }

  // Add filler lines at end of content to reach line 28
  addFillerLines(8)

  // Create footer with horizontal line, page number, and title
  const createFooter = () => {
    return new Footer({
      children: [
        // Page number centered above line (e.g., "-2-")
        new Paragraph({
          children: [
            new TextRun({
              text: "-",
              size: 24,
              font: 'Times New Roman',
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              size: 24,
              font: 'Times New Roman',
            }),
            new TextRun({
              text: "-",
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.CENTER,
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "000000",
            },
          },
          spacing: { after: 120 },
        }),
        // Title below line
        new Paragraph({
          children: [
            new TextRun({
              text: "DEFENDANT'S ANSWER TO COMPLAINT",
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.CENTER,
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
              top: 1440,      // 1 inch
              bottom: 2880,   // 2 inches - ensures content stops at line 28
              left: 1440,     // 1 inch  
              right: 1440,    // 1 inch
              header: 0,      // Header at top, floating table positioned absolutely
              footer: 360,    // Footer closer to bottom of page
            },
          },
        },
        headers: {
          default: createLineNumberHeader(),
        },
        footers: {
          default: createFooter(),
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

// ============================================
// DISCOVERY DOCUMENT TYPES AND FUNCTIONS
// ============================================

export interface DiscoveryDocumentData {
  discoveryType: 'interrogatories' | 'rfp' | 'rfa'
  propoundingParty: 'plaintiff' | 'defendant'
  respondingParty: 'plaintiff' | 'defendant'
  setNumber: number
  plaintiffName: string
  defendantName: string
  caseName: string
  caseNumber: string
  definitions: string[]
  categories?: { title: string; items: { number: number; content: string }[] }[]
  items?: { number: number; content: string }[] // For RFA which doesn't have categories
  // Attorney/Court info
  attorneyName?: string
  stateBarNumber?: string
  lawFirmName?: string
  address?: string
  phone?: string
  fax?: string
  email?: string
  county?: string
  courtName?: string
  department?: string
}

const SET_NUMBER_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

function getDiscoveryTypeTitle(type: string): string {
  switch (type) {
    case 'interrogatories': return 'SPECIAL INTERROGATORIES'
    case 'rfp': return 'REQUESTS FOR PRODUCTION OF DOCUMENTS'
    case 'rfa': return 'REQUESTS FOR ADMISSION'
    default: return 'DISCOVERY'
  }
}

export function generateDiscoveryDocument(data: DiscoveryDocumentData): Document {
  const {
    discoveryType,
    propoundingParty,
    respondingParty,
    setNumber,
    plaintiffName,
    defendantName,
    caseName,
    caseNumber,
    definitions,
    categories,
    items,
    attorneyName = '[Attorney Name]',
    stateBarNumber = '[State Bar No.]',
    lawFirmName = '[LAW FIRM NAME]',
    address = '[Address]',
    phone = '[Phone]',
    fax = '',
    email = '[Email]',
    county = 'LOS ANGELES',
    courtName = 'Superior Court of California',
    department = '',
  } = data

  const children: Paragraph[] = []

  // Get party names based on propounding/responding
  const propoundingPartyName = propoundingParty === 'plaintiff' ? plaintiffName : defendantName
  const respondingPartyName = respondingParty === 'plaintiff' ? plaintiffName : defendantName

  // Attorney Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${attorneyName}, State Bar No. ${stateBarNumber}`, size: 24 }),
      ],
      spacing: { after: 0 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: lawFirmName, size: 24 })],
      spacing: { after: 0 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: address, size: 24 })],
      spacing: { after: 0 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Telephone: ${phone}${fax ? ` | Fax: ${fax}` : ''}`, size: 24 })],
      spacing: { after: 0 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Email: ${email}`, size: 24 })],
      spacing: { after: 200 },
    })
  )

  // Attorney for line
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Attorney for ${propoundingParty.toUpperCase()} ${propoundingPartyName.toUpperCase()}`, size: 24 }),
      ],
      spacing: { after: 400 },
    })
  )

  // Court Header
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `SUPERIOR COURT OF THE STATE OF CALIFORNIA`, size: 24, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `COUNTY OF ${county.toUpperCase()}`, size: 24, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  )

  // Case Caption
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${plaintiffName},`, size: 24 })],
      spacing: { after: 0 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `          Plaintiff,`, size: 24 })],
      spacing: { after: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `     vs.`, size: 24 })],
      spacing: { after: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${defendantName},`, size: 24 })],
      spacing: { after: 0 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `          Defendant.`, size: 24 })],
      spacing: { after: 200 },
    })
  )

  // Case Number and Document Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Case No.: ${caseNumber}`, size: 24, bold: true })],
      spacing: { after: 200 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: getDiscoveryTypeTitle(discoveryType), size: 28, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `SET ${SET_NUMBER_WORDS[setNumber - 1] || setNumber}`, size: 24, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Propounding/Responding Party Header
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `PROPOUNDING PARTY: ${propoundingParty.toUpperCase()}`, size: 24 })],
      spacing: { after: 50 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `RESPONDING PARTY: ${respondingParty.toUpperCase()}`, size: 24 })],
      spacing: { after: 50 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `SET NO.: ${SET_NUMBER_WORDS[setNumber - 1] || setNumber}`, size: 24 })],
      spacing: { after: 300 },
    })
  )

  // Introduction paragraph based on type
  const introText = discoveryType === 'interrogatories'
    ? `${propoundingPartyName} ("${propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}") requests, pursuant to California Code of Civil Procedure section 2030.030, that ${respondingPartyName} ("${respondingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'}" or "Responding Party") answer under oath, and within the time provided by law, the following Special Interrogatories:`
    : discoveryType === 'rfp'
    ? `${propoundingPartyName} ("${propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}") requests, pursuant to California Code of Civil Procedure section 2031.010, that ${respondingPartyName} ("${respondingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'}" or "Responding Party") produce, within the time provided by law, the following documents and things:`
    : `${propoundingPartyName} ("${propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}") requests that ${respondingPartyName} ("${respondingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'}" or "Responding Party") admit the truth of the following matters pursuant to California Code of Civil Procedure section 2033.010:`

  children.push(
    new Paragraph({
      children: [new TextRun({ text: introText, size: 24 })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400 },
    })
  )

  // Definitions Section (for interrogatories and RFP)
  if ((discoveryType === 'interrogatories' || discoveryType === 'rfp') && definitions.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'DEFINITIONS', size: 24, bold: true, underline: {} })],
        spacing: { before: 200, after: 200 },
      })
    )

    definitions.forEach((def, index) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${def}`, size: 24 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 150 },
        })
      )
    })

    // Add spacer after definitions
    children.push(new Paragraph({ children: [], spacing: { after: 300 } }))
  }

  // Discovery Items
  const typeLabel = discoveryType === 'interrogatories' 
    ? 'SPECIAL INTERROGATORIES' 
    : discoveryType === 'rfp' 
    ? 'REQUESTS FOR PRODUCTION' 
    : 'REQUESTS FOR ADMISSION'

  children.push(
    new Paragraph({
      children: [new TextRun({ text: typeLabel, size: 24, bold: true, underline: {} })],
      spacing: { before: 200, after: 200 },
    })
  )

  // Handle categorized items (interrogatories and RFP)
  if (categories && categories.length > 0) {
    categories.forEach(category => {
      if (category.items.length > 0) {
        // Category title
        children.push(
          new Paragraph({
            children: [new TextRun({ text: category.title.toUpperCase(), size: 24, bold: true, italics: true })],
            spacing: { before: 200, after: 150 },
          })
        )

        // Category items
        category.items.forEach(item => {
          // Clean up the content - remove the header if it's embedded
          let content = item.content
          const headerRegex = /^(SPECIAL INTERROGATORY NO\.|REQUEST FOR PRODUCTION NO\.|REQUEST FOR ADMISSION NO\.)\s*\[?X?\]?:?\s*/i
          content = content.replace(headerRegex, '').trim()

          children.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: discoveryType === 'interrogatories' 
                    ? `SPECIAL INTERROGATORY NO. ${item.number}: ` 
                    : `REQUEST FOR PRODUCTION NO. ${item.number}: `, 
                  size: 24, 
                  bold: true 
                }),
              ],
              spacing: { before: 150, after: 50 },
            })
          )
          children.push(
            new Paragraph({
              children: [new TextRun({ text: content, size: 24 })],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 200 },
            })
          )
        })
      }
    })
  }

  // Handle non-categorized items (RFA)
  if (items && items.length > 0) {
    items.forEach(item => {
      // Clean up the content
      let content = item.content
      const headerRegex = /^REQUEST FOR ADMISSION NO\.\s*\[?X?\]?:?\s*/i
      content = content.replace(headerRegex, '').trim()

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `REQUEST FOR ADMISSION NO. ${item.number}: `, size: 24, bold: true }),
          ],
          spacing: { before: 150, after: 50 },
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: content, size: 24 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
        })
      )
    })
  }

  // Signature Block
  children.push(new Paragraph({ children: [], spacing: { after: 400 } }))
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Dated: ________________', size: 24 })],
      spacing: { after: 400 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Respectfully submitted,', size: 24 })],
      spacing: { after: 300 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: lawFirmName.toUpperCase(), size: 24, bold: true })],
      spacing: { after: 400 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '_________________________________', size: 24 })],
      spacing: { after: 50 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: attorneyName, size: 24 })],
      spacing: { after: 50 },
    })
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Attorney for ${propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'} ${propoundingPartyName}`, size: 24 })],
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

export async function downloadDiscoveryDocument(data: DiscoveryDocumentData): Promise<void> {
  console.log('Starting Discovery document generation...', data.discoveryType)
  
  try {
    const doc = generateDiscoveryDocument(data)
    const blob = await Packer.toBlob(doc)
    
    const typeLabels: Record<string, string> = {
      interrogatories: 'Interrogatories',
      rfp: 'RFP',
      rfa: 'RFA'
    }
    
    const fileName = `${typeLabels[data.discoveryType]}_Set${data.setNumber}_${new Date().toISOString().split('T')[0]}.docx`
    
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
    console.error('Error generating Discovery document:', error)
    throw new Error(`Failed to generate Discovery document: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ============================================
// COMPLAINT DOCUMENT TYPES AND FUNCTIONS
// ============================================

export interface ComplaintData {
  plaintiffName: string
  defendantName: string
  complaintText: string
  attorneyName?: string
  stateBarNumber?: string
  email?: string
  lawFirmName?: string
  address?: string
  phone?: string
  fax?: string
  county?: string
  caseNumber?: string
  judgeName?: string
  departmentNumber?: string
  complaintFiledDate?: string
  trialDate?: string
  includeProofOfService?: boolean
  proofOfServiceText?: string
  causesOfAction?: string[]
  demandJuryTrial?: boolean
}

export function generateComplaintDocument(data: ComplaintData): Document {
  const {
    plaintiffName,
    defendantName,
    complaintText,
    attorneyName = "[Attorney Name]",
    stateBarNumber = "[State Bar No.]",
    email = "[email@lawfirm.com]",
    lawFirmName = "[LAW FIRM NAME]",
    address = "[Address]",
    phone = "[Phone Number]",
    fax = "[Fax Number]",
    county = "LOS ANGELES",
    caseNumber = "[Case No.]",
    judgeName,
    departmentNumber,
    complaintFiledDate,
    trialDate,
    causesOfAction = [],
    demandJuryTrial = true,
    includeProofOfService = false,
    proofOfServiceText = '',
  } = data

  const children: (Paragraph | Table)[] = []

  // California pleading line spacing - 24pt exactly
  const PLEADING_LINE_HEIGHT = 480

  // Create header with fixed line numbers 1-28 in a floating table
  const createLineNumberHeader = () => {
    const lineNumberText: TextRun[] = []
    
    // Add 3 blank lines at top
    for (let i = 0; i < 3; i++) {
      lineNumberText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }))
      lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
    }
    
    // Add numbered lines 1-28
    for (let i = 1; i <= 28; i++) {
      lineNumberText.push(new TextRun({ text: String(i), size: 24, font: 'Times New Roman' }))
      lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
    }
    
    // Add 4 blank lines at bottom
    for (let i = 0; i < 4; i++) {
      lineNumberText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }))
      if (i < 3) {
        lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
      }
    }
    
    const lineNumberParagraph = new Paragraph({
      children: lineNumberText,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0 },
      alignment: AlignmentType.RIGHT,
    })
    
    const lineNumberTable = new Table({
      width: { size: 900, type: WidthType.DXA },
      float: {
        horizontalAnchor: 'page' as any,
        verticalAnchor: 'page' as any,
        absoluteHorizontalPosition: 360,
        absoluteVerticalPosition: 0,
      },
      borders: {
        top: { style: TableBorderStyle.NONE, size: 0 },
        bottom: { style: TableBorderStyle.NONE, size: 0 },
        left: { style: TableBorderStyle.NONE, size: 0 },
        right: { style: TableBorderStyle.DOUBLE, size: 6, color: "000000" },
        insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
        insideVertical: { style: TableBorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 900, type: WidthType.DXA },
              children: [lineNumberParagraph],
              margins: { right: 100 },
              borders: {
                top: { style: TableBorderStyle.NONE, size: 0 },
                bottom: { style: TableBorderStyle.NONE, size: 0 },
                left: { style: TableBorderStyle.NONE, size: 0 },
                right: { style: TableBorderStyle.DOUBLE, size: 6, color: "000000" },
              },
            }),
          ],
        }),
      ],
    })
    
    // Right border table
    const rightBorderText: TextRun[] = []
    for (let i = 1; i <= 35; i++) {
      rightBorderText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }))
      if (i < 35) {
        rightBorderText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
      }
    }
    
    const rightBorderParagraph = new Paragraph({
      children: rightBorderText,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0 },
    })
    
    const rightBorderTable = new Table({
      width: { size: 100, type: WidthType.DXA },
      float: {
        horizontalAnchor: 'page' as any,
        verticalAnchor: 'page' as any,
        absoluteHorizontalPosition: 10800,
        absoluteVerticalPosition: 0,
      },
      borders: {
        top: { style: TableBorderStyle.NONE, size: 0 },
        bottom: { style: TableBorderStyle.NONE, size: 0 },
        left: { style: TableBorderStyle.SINGLE, size: 6, color: "000000" },
        right: { style: TableBorderStyle.NONE, size: 0 },
        insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
        insideVertical: { style: TableBorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.DXA },
              children: [rightBorderParagraph],
              borders: {
                top: { style: TableBorderStyle.NONE, size: 0 },
                bottom: { style: TableBorderStyle.NONE, size: 0 },
                left: { style: TableBorderStyle.SINGLE, size: 6, color: "000000" },
                right: { style: TableBorderStyle.NONE, size: 0 },
              },
            }),
          ],
        }),
      ],
    })
    
    return new Header({ children: [lineNumberTable, rightBorderTable] })
  }

  // Helper for single-spaced header paragraphs
  const createHeaderParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24,
          font: 'Times New Roman',
          ...options.textOptions
        }),
      ],
      spacing: { line: 240, lineRule: 'auto' as any, before: 0, after: 0, ...options.spacing },
      ...options
    })
  }

  // Helper for body paragraphs with pleading spacing
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24,
          font: 'Times New Roman',
          ...options.textOptions
        }),
      ],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0, ...options.spacing },
      ...options
    })
  }

  // Attorney Header (single-spaced)
  children.push(createHeaderParagraph(`${attorneyName}, State Bar No. ${stateBarNumber}`))
  children.push(createHeaderParagraph(lawFirmName))
  children.push(createHeaderParagraph(address))
  children.push(createHeaderParagraph(`Telephone: ${phone}`))
  children.push(createHeaderParagraph(`Facsimile: ${fax}`))
  children.push(createHeaderParagraph(email))
  children.push(createHeaderParagraph(''))
  children.push(createHeaderParagraph(`Attorney for Plaintiff ${plaintiffName}`))
  children.push(createHeaderParagraph(''))
  children.push(createHeaderParagraph(''))

  // Court Header
  children.push(createHeaderParagraph('SUPERIOR COURT OF THE STATE OF CALIFORNIA', { alignment: AlignmentType.CENTER }))
  children.push(createHeaderParagraph(`COUNTY OF ${county.toUpperCase()}`, { alignment: AlignmentType.CENTER }))
  children.push(createHeaderParagraph(''))

  // Case Caption Table
  const captionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: TableBorderStyle.NONE, size: 0 },
      bottom: { style: TableBorderStyle.NONE, size: 0 },
      left: { style: TableBorderStyle.NONE, size: 0 },
      right: { style: TableBorderStyle.NONE, size: 0 },
      insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
      insideVertical: { style: TableBorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              bottom: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
            },
            children: [
              createHeaderParagraph(`${plaintiffName.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Plaintiff,'),
              createHeaderParagraph(''),
              createHeaderParagraph('     vs.'),
              createHeaderParagraph(''),
              createHeaderParagraph(`${defendantName.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Defendant.'),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              bottom: { style: TableBorderStyle.NONE, size: 0 },
              right: { style: TableBorderStyle.NONE, size: 0 },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
            },
            margins: { left: 200 },
            children: [
              createHeaderParagraph(`Case No. ${caseNumber}`),
              ...(judgeName ? [createHeaderParagraph(`Honorable ${judgeName}`)] : []),
              ...(departmentNumber ? [createHeaderParagraph(`Dept. ${departmentNumber}`)] : []),
              createHeaderParagraph(''),
              // Document type with FOR DAMAGES if causes exist
              new Paragraph({
                children: [
                  new TextRun({
                    text: causesOfAction.length > 0 ? 'COMPLAINT FOR DAMAGES' : 'COMPLAINT',
                    size: 24,
                    font: 'Times New Roman',
                    bold: true,
                  }),
                ],
                spacing: { line: 240, lineRule: 'auto' as any },
              }),
              // List each cause of action with number
              ...causesOfAction.map((cause, index) => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${index + 1}. ${cause}`,
                      size: 20,
                      font: 'Times New Roman',
                    }),
                  ],
                  spacing: { line: 240, lineRule: 'auto' as any },
                })
              ),
              createHeaderParagraph(''),
              // Only show jury demand if enabled
              ...(demandJuryTrial ? [createHeaderParagraph('DEMAND FOR JURY TRIAL')] : []),
              ...(complaintFiledDate ? [createHeaderParagraph(''), createHeaderParagraph(`Complaint Filed: ${new Date(complaintFiledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)] : []),
              ...(trialDate ? [createHeaderParagraph(''), createHeaderParagraph(`Trial Date: ${new Date(trialDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)] : []),
            ],
          }),
        ],
      }),
    ],
  })
  children.push(captionTable)
  children.push(createHeaderParagraph(''))

  // Parse and add complaint content
  const lines = complaintText.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip empty attorney header lines (we already added our own)
    if (trimmedLine.match(/^[A-Z\s]+,\s*State Bar/i) ||
        trimmedLine.match(/^Attorney for/i) ||
        trimmedLine === 'SUPERIOR COURT OF CALIFORNIA' ||
        trimmedLine.match(/^COUNTY OF/i) ||
        trimmedLine.match(/^Case No\./i) ||
        trimmedLine.match(/Plaintiff,?$/i) ||
        trimmedLine.match(/Defendant\.?$/i) ||
        trimmedLine === 'vs.' ||
        trimmedLine === 'v.') {
      continue
    }
    
    // Centered headings
    if (trimmedLine.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+CAUSE\s+OF\s+ACTION/i) ||
        trimmedLine === 'COMPLAINT' ||
        trimmedLine === 'PARTIES' ||
        trimmedLine === 'PRAYER FOR RELIEF' ||
        trimmedLine === 'JURY DEMAND' ||
        trimmedLine.match(/^JURISDICTIONAL\s+ALLEGATIONS/i) ||
        trimmedLine.match(/^GENERAL\s+ALLEGATIONS/i) ||
        trimmedLine.match(/^FACTUAL\s+ALLEGATIONS/i)) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
            bold: true,
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        alignment: AlignmentType.CENTER,
      }))
    }
    // Parenthetical subtitles
    else if (trimmedLine.startsWith('(') && trimmedLine.endsWith(')')) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
            bold: true,
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        alignment: AlignmentType.CENTER,
      }))
    }
    // Numbered paragraphs
    else if (trimmedLine.match(/^\d+\.\s+/)) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        indent: { firstLine: 720 },
        alignment: AlignmentType.JUSTIFIED,
      }))
    }
    // WHEREFORE paragraphs
    else if (trimmedLine.startsWith('WHEREFORE')) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        indent: { firstLine: 720 },
      }))
    }
    // Regular paragraphs
    else if (trimmedLine.length > 0) {
      children.push(createParagraph(trimmedLine, { indent: { firstLine: 720 } }))
    }
    // Blank lines
    else {
      children.push(createParagraph(''))
    }
  }

  // Add filler lines
  for (let i = 0; i < 5; i++) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '/ / /', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }))
  }

  // Add Proof of Service if enabled
  if (includeProofOfService && proofOfServiceText) {
    // Add page break before Proof of Service
    children.push(new Paragraph({
      children: [],
      pageBreakBefore: true,
    }))
    
    // Parse and add Proof of Service text
    const posLines = proofOfServiceText.split('\n')
    for (const line of posLines) {
      const trimmedLine = line.trim()
      
      // Title line - centered and bold
      if (trimmedLine === 'PROOF OF SERVICE') {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
              bold: true,
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
          alignment: AlignmentType.CENTER,
        }))
      }
      // Signature line
      else if (trimmedLine.includes('________________________________')) {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
          alignment: AlignmentType.RIGHT,
        }))
      }
      // Regular text
      else if (trimmedLine.length > 0) {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        }))
      }
      // Blank lines
      else {
        children.push(new Paragraph({
          children: [],
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        }))
      }
    }
  }

  // Create footer
  const createFooter = () => {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: "-", size: 24, font: 'Times New Roman' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 24, font: 'Times New Roman' }),
            new TextRun({ text: "-", size: 24, font: 'Times New Roman' }),
          ],
          alignment: AlignmentType.CENTER,
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          },
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "COMPLAINT", size: 24, font: 'Times New Roman' }),
          ],
          alignment: AlignmentType.CENTER,
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
              top: 1440,
              bottom: 2880,
              left: 1440,
              right: 1440,
              header: 0,
              footer: 360,
            },
          },
        },
        headers: { default: createLineNumberHeader() },
        footers: { default: createFooter() },
        children: children,
      },
    ],
  })
}

export async function downloadComplaintDocument(data: ComplaintData): Promise<void> {
  console.log('Starting Complaint document generation...')
  
  try {
    const doc = generateComplaintDocument(data)
    const blob = await Packer.toBlob(doc)
    
    const fileName = `Complaint_${data.plaintiffName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`
    
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
    console.error('Error generating Complaint document:', error)
    throw new Error(`Failed to generate Complaint document: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ============================================
// MOTION DOCUMENT TYPES AND FUNCTIONS
// ============================================

export interface MotionData {
  motionType: string
  plaintiffName: string
  defendantName: string
  motionText: string
  attorneyName?: string
  stateBarNumber?: string
  email?: string
  lawFirmName?: string
  address?: string
  phone?: string
  fax?: string
  county?: string
  caseNumber?: string
  hearingDate?: string
  hearingTime?: string
  department?: string
}

const MOTION_TYPE_TITLES: Record<string, string> = {
  'motion-to-compel-discovery': 'MOTION TO COMPEL FURTHER RESPONSES TO DISCOVERY',
  'motion-to-compel-deposition': 'MOTION TO COMPEL DEPOSITION',
  'demurrer': 'DEMURRER',
  'motion-to-strike': 'MOTION TO STRIKE',
  'motion-for-summary-judgment': 'MOTION FOR SUMMARY JUDGMENT',
  'motion-for-summary-adjudication': 'MOTION FOR SUMMARY ADJUDICATION',
  'motion-in-limine': 'MOTION IN LIMINE',
  'motion-for-protective-order': 'MOTION FOR PROTECTIVE ORDER',
  'motion-to-quash-subpoena': 'MOTION TO QUASH SUBPOENA',
  'motion-for-sanctions': 'MOTION FOR SANCTIONS',
  'ex-parte-application': 'EX PARTE APPLICATION',
  'opposition': 'OPPOSITION',
  'reply': 'REPLY BRIEF',
}

export function generateMotionDocument(data: MotionData): Document {
  const {
    motionType,
    plaintiffName,
    defendantName,
    motionText,
    attorneyName = "[Attorney Name]",
    stateBarNumber = "[State Bar No.]",
    email = "[email@lawfirm.com]",
    lawFirmName = "[LAW FIRM NAME]",
    address = "[Address]",
    phone = "[Phone Number]",
    fax = "[Fax Number]",
    county = "LOS ANGELES",
    caseNumber = "[Case No.]",
    hearingDate = "[HEARING DATE]",
    hearingTime = "8:30 a.m.",
    department = "[DEPT.]",
  } = data

  const children: (Paragraph | Table)[] = []
  const motionTitle = MOTION_TYPE_TITLES[motionType] || 'MOTION'

  // California pleading line spacing - 24pt exactly
  const PLEADING_LINE_HEIGHT = 480

  // Create header with fixed line numbers 1-28 in a floating table
  const createLineNumberHeader = () => {
    const lineNumberText: TextRun[] = []
    
    for (let i = 0; i < 3; i++) {
      lineNumberText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }))
      lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
    }
    
    for (let i = 1; i <= 28; i++) {
      lineNumberText.push(new TextRun({ text: String(i), size: 24, font: 'Times New Roman' }))
      lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
    }
    
    for (let i = 0; i < 4; i++) {
      lineNumberText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }))
      if (i < 3) {
        lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
      }
    }
    
    const lineNumberParagraph = new Paragraph({
      children: lineNumberText,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0 },
      alignment: AlignmentType.RIGHT,
    })
    
    const lineNumberTable = new Table({
      width: { size: 900, type: WidthType.DXA },
      float: {
        horizontalAnchor: 'page' as any,
        verticalAnchor: 'page' as any,
        absoluteHorizontalPosition: 360,
        absoluteVerticalPosition: 0,
      },
      borders: {
        top: { style: TableBorderStyle.NONE, size: 0 },
        bottom: { style: TableBorderStyle.NONE, size: 0 },
        left: { style: TableBorderStyle.NONE, size: 0 },
        right: { style: TableBorderStyle.DOUBLE, size: 6, color: "000000" },
        insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
        insideVertical: { style: TableBorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 900, type: WidthType.DXA },
              children: [lineNumberParagraph],
              margins: { right: 100 },
              borders: {
                top: { style: TableBorderStyle.NONE, size: 0 },
                bottom: { style: TableBorderStyle.NONE, size: 0 },
                left: { style: TableBorderStyle.NONE, size: 0 },
                right: { style: TableBorderStyle.DOUBLE, size: 6, color: "000000" },
              },
            }),
          ],
        }),
      ],
    })
    
    const rightBorderText: TextRun[] = []
    for (let i = 1; i <= 35; i++) {
      rightBorderText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }))
      if (i < 35) {
        rightBorderText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }))
      }
    }
    
    const rightBorderParagraph = new Paragraph({
      children: rightBorderText,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0 },
    })
    
    const rightBorderTable = new Table({
      width: { size: 100, type: WidthType.DXA },
      float: {
        horizontalAnchor: 'page' as any,
        verticalAnchor: 'page' as any,
        absoluteHorizontalPosition: 10800,
        absoluteVerticalPosition: 0,
      },
      borders: {
        top: { style: TableBorderStyle.NONE, size: 0 },
        bottom: { style: TableBorderStyle.NONE, size: 0 },
        left: { style: TableBorderStyle.SINGLE, size: 6, color: "000000" },
        right: { style: TableBorderStyle.NONE, size: 0 },
        insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
        insideVertical: { style: TableBorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.DXA },
              children: [rightBorderParagraph],
              borders: {
                top: { style: TableBorderStyle.NONE, size: 0 },
                bottom: { style: TableBorderStyle.NONE, size: 0 },
                left: { style: TableBorderStyle.SINGLE, size: 6, color: "000000" },
                right: { style: TableBorderStyle.NONE, size: 0 },
              },
            }),
          ],
        }),
      ],
    })
    
    return new Header({ children: [lineNumberTable, rightBorderTable] })
  }

  // Helper for single-spaced header paragraphs
  const createHeaderParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24,
          font: 'Times New Roman',
          ...options.textOptions
        }),
      ],
      spacing: { line: 240, lineRule: 'auto' as any, before: 0, after: 0, ...options.spacing },
      ...options
    })
  }

  // Helper for body paragraphs with pleading spacing
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24,
          font: 'Times New Roman',
          ...options.textOptions
        }),
      ],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0, ...options.spacing },
      ...options
    })
  }

  // Attorney Header (single-spaced)
  children.push(createHeaderParagraph(`${attorneyName}, State Bar No. ${stateBarNumber}`))
  children.push(createHeaderParagraph(lawFirmName))
  children.push(createHeaderParagraph(address))
  children.push(createHeaderParagraph(`Telephone: ${phone}`))
  children.push(createHeaderParagraph(`Facsimile: ${fax}`))
  children.push(createHeaderParagraph(email))
  children.push(createHeaderParagraph(''))
  children.push(createHeaderParagraph(`Attorney for Moving Party`))
  children.push(createHeaderParagraph(''))
  children.push(createHeaderParagraph(''))

  // Court Header
  children.push(createHeaderParagraph('SUPERIOR COURT OF THE STATE OF CALIFORNIA', { alignment: AlignmentType.CENTER }))
  children.push(createHeaderParagraph(`COUNTY OF ${county.toUpperCase()}`, { alignment: AlignmentType.CENTER }))
  children.push(createHeaderParagraph(''))

  // Case Caption Table
  const captionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: TableBorderStyle.NONE, size: 0 },
      bottom: { style: TableBorderStyle.NONE, size: 0 },
      left: { style: TableBorderStyle.NONE, size: 0 },
      right: { style: TableBorderStyle.NONE, size: 0 },
      insideHorizontal: { style: TableBorderStyle.NONE, size: 0 },
      insideVertical: { style: TableBorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              bottom: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: TableBorderStyle.SINGLE, size: 4, color: "000000" },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
            },
            children: [
              createHeaderParagraph(`${plaintiffName.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Plaintiff,'),
              createHeaderParagraph(''),
              createHeaderParagraph('     vs.'),
              createHeaderParagraph(''),
              createHeaderParagraph(`${defendantName.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Defendant.'),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              bottom: { style: TableBorderStyle.NONE, size: 0 },
              right: { style: TableBorderStyle.NONE, size: 0 },
              top: { style: TableBorderStyle.NONE, size: 0 },
              left: { style: TableBorderStyle.NONE, size: 0 },
            },
            margins: { left: 200 },
            children: [
              createHeaderParagraph(`Case No. ${caseNumber}`),
              createHeaderParagraph(''),
              new Paragraph({
                children: [
                  new TextRun({
                    text: motionTitle,
                    size: 24,
                    font: 'Times New Roman',
                    bold: true,
                  }),
                ],
                spacing: { line: 240, lineRule: 'auto' as any },
              }),
              createHeaderParagraph(''),
              createHeaderParagraph(`Hearing Date: ${hearingDate}`),
              createHeaderParagraph(`Time: ${hearingTime}`),
              createHeaderParagraph(`Dept: ${department}`),
            ],
          }),
        ],
      }),
    ],
  })
  children.push(captionTable)
  children.push(createHeaderParagraph(''))

  // Parse and add motion content
  const lines = motionText.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip empty attorney header lines (we already added our own)
    if (trimmedLine.match(/^[A-Z\s]+,\s*State Bar/i) ||
        trimmedLine.match(/^Attorney for/i) ||
        trimmedLine === 'SUPERIOR COURT OF CALIFORNIA' ||
        trimmedLine.match(/^COUNTY OF/i) ||
        trimmedLine.match(/^Case No\./i) ||
        trimmedLine.match(/Plaintiff,?$/i) ||
        trimmedLine.match(/Defendant\.?$/i) ||
        trimmedLine === 'vs.' ||
        trimmedLine === 'v.') {
      continue
    }
    
    // Centered headings
    if (trimmedLine.match(/^NOTICE\s+OF\s+MOTION/i) ||
        trimmedLine.match(/^MEMORANDUM\s+OF\s+POINTS\s+AND\s+AUTHORITIES/i) ||
        trimmedLine.match(/^POINTS\s+AND\s+AUTHORITIES/i) ||
        trimmedLine.match(/^DECLARATION/i) ||
        trimmedLine.match(/^PROOF\s+OF\s+SERVICE/i) ||
        trimmedLine.match(/^CONCLUSION/i) ||
        trimmedLine === motionTitle) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
            bold: true,
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        alignment: AlignmentType.CENTER,
      }))
    }
    // Section headings (I., II., III., A., B., etc.)
    else if (trimmedLine.match(/^[IVX]+\.\s+[A-Z]/i) || 
             trimmedLine.match(/^[A-Z]\.\s+[A-Z]/i) ||
             trimmedLine.match(/^(INTRODUCTION|STATEMENT\s+OF\s+FACTS|LEGAL\s+ARGUMENT|ARGUMENT)/i)) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
            bold: true,
            underline: {},
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      }))
    }
    // Numbered paragraphs
    else if (trimmedLine.match(/^\d+\.\s+/)) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmedLine,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        indent: { firstLine: 720 },
        alignment: AlignmentType.JUSTIFIED,
      }))
    }
    // Regular paragraphs
    else if (trimmedLine.length > 0) {
      children.push(createParagraph(trimmedLine, { indent: { firstLine: 720 } }))
    }
    // Blank lines
    else {
      children.push(createParagraph(''))
    }
  }

  // Add filler lines
  for (let i = 0; i < 3; i++) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '/ / /', size: 24, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }))
  }

  // Create footer
  const createFooter = () => {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: "-", size: 24, font: 'Times New Roman' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 24, font: 'Times New Roman' }),
            new TextRun({ text: "-", size: 24, font: 'Times New Roman' }),
          ],
          alignment: AlignmentType.CENTER,
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          },
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: motionTitle, size: 24, font: 'Times New Roman' }),
          ],
          alignment: AlignmentType.CENTER,
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
              top: 1440,
              bottom: 2880,
              left: 1440,
              right: 1440,
              header: 0,
              footer: 360,
            },
          },
        },
        headers: { default: createLineNumberHeader() },
        footers: { default: createFooter() },
        children: children,
      },
    ],
  })
}

export async function downloadMotionDocument(data: MotionData): Promise<void> {
  console.log('Starting Motion document generation...')
  
  try {
    const doc = generateMotionDocument(data)
    const blob = await Packer.toBlob(doc)
    
    const motionTitle = MOTION_TYPE_TITLES[data.motionType] || 'Motion'
    const cleanTitle = motionTitle.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${cleanTitle}_${new Date().toISOString().split('T')[0]}.docx`
    
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
    console.error('Error generating Motion document:', error)
    throw new Error(`Failed to generate Motion document: ${error instanceof Error ? error.message : String(error)}`)
  }
}
