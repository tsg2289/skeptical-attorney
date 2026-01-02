/**
 * Discovery Response - Word Document Generation API
 * 
 * Generates properly formatted Word documents for discovery responses
 * Follows California court formatting requirements with:
 * - Line numbers 1-28 with double border
 * - Proper case caption table
 * - Footer with page numbers and document title
 * - California pleading line spacing (24pt exact)
 * 
 * Security: Server-only, authenticated, RLS-protected
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle as TableBorderStyle,
  BorderStyle,
  Footer,
  PageNumber,
  Header,
} from 'docx';
import {
  getObjectionById,
  GENERAL_OBJECTIONS_HEADER,
  DEFINITIONS_OBJECTION_INTERROGATORY,
  DEFINITIONS_OBJECTION_RFA,
  DEFINITIONS_OBJECTION_FROG,
  RESPONSE_TRANSITION,
  DISCOVERY_RESERVATION,
  type DiscoveryResponseType,
} from '@/lib/data/californiaObjections';

// Types
interface ResponseItem {
  requestNumber: number;
  originalRequest: string;
  objections: string[];
  objectionTexts: string[];
  customObjections?: string[]; // Custom objections added by user
  answer: string;
}

interface GenerateDocxRequest {
  caseId: string;
  discoveryType: DiscoveryResponseType;
  setNumber: number;
  responses: ResponseItem[];
  respondingParty: string;
  propoundingParty: string;
  caseNumber: string;
  courtName: string;
  caseName: string;
  county?: string;
  attorneys?: {
    name: string;
    barNumber: string;
    firmName: string;
    address: string;
    phone: string;
    email: string;
  }[];
}

// California pleading line spacing - 24pt exactly (480 TWIPs)
const PLEADING_LINE_HEIGHT = 480;

const SET_NUMBER_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];

/**
 * Get document title based on discovery type
 */
function getDiscoveryTypeTitle(discoveryType: DiscoveryResponseType): string {
  switch (discoveryType) {
    case 'interrogatories':
      return 'RESPONSES TO SPECIAL INTERROGATORIES';
    case 'frog':
      return 'RESPONSES TO FORM INTERROGATORIES - GENERAL';
    case 'rfp':
      return 'RESPONSES TO REQUESTS FOR PRODUCTION';
    case 'rfa':
      return 'RESPONSES TO REQUESTS FOR ADMISSION';
    default:
      return 'DISCOVERY RESPONSES';
  }
}

/**
 * Get request label based on discovery type
 */
function getRequestLabel(discoveryType: DiscoveryResponseType, num: number): string {
  switch (discoveryType) {
    case 'interrogatories':
      return `INTERROGATORY NO. ${num}:`;
    case 'frog':
      return `FORM INTERROGATORY NO. ${num}:`;
    case 'rfp':
      return `REQUEST FOR PRODUCTION NO. ${num}:`;
    case 'rfa':
      return `REQUEST FOR ADMISSION NO. ${num}:`;
    default:
      return `REQUEST NO. ${num}:`;
  }
}

/**
 * Create line number header with 1-28 numbering and double border
 * Matches California pleading paper format
 */
function createLineNumberHeader(): Header {
  const lineNumberText: TextRun[] = [];
  
  // Add 3 blank lines at top
  for (let i = 0; i < 3; i++) {
    lineNumberText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }));
    lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }));
  }
  
  // Add numbered lines 1-28
  for (let i = 1; i <= 28; i++) {
    lineNumberText.push(new TextRun({ text: String(i), size: 24, font: 'Times New Roman' }));
    lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }));
  }
  
  // Add 4 blank lines at bottom
  for (let i = 0; i < 4; i++) {
    lineNumberText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }));
    if (i < 3) {
      lineNumberText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }));
    }
  }
  
  const lineNumberParagraph = new Paragraph({
    children: lineNumberText,
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0 },
    alignment: AlignmentType.RIGHT,
  });
  
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
  });
  
  // Right border table
  const rightBorderText: TextRun[] = [];
  for (let i = 1; i <= 35; i++) {
    rightBorderText.push(new TextRun({ text: ' ', size: 24, font: 'Times New Roman' }));
    if (i < 35) {
      rightBorderText.push(new TextRun({ text: '', break: 1, size: 24, font: 'Times New Roman' }));
    }
  }
  
  const rightBorderParagraph = new Paragraph({
    children: rightBorderText,
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any, before: 0, after: 0 },
  });
  
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
  });
  
  return new Header({ children: [lineNumberTable, rightBorderTable] });
}

/**
 * Create footer with page numbers and document title
 */
function createFooter(discoveryType: DiscoveryResponseType): Footer {
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
          new TextRun({ text: getDiscoveryTypeTitle(discoveryType), size: 24, font: 'Times New Roman' }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

/**
 * Helper for single-spaced header paragraphs (attorney info, court header)
 */
function createHeaderParagraph(text: string, options: any = {}): Paragraph {
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
  });
}

/**
 * Helper for body paragraphs with pleading spacing
 */
function createParagraph(text: string, options: any = {}): Paragraph {
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
  });
}

/**
 * Generate Word document with California pleading format
 */
function generateResponseDocument(data: GenerateDocxRequest): Document {
  const {
    discoveryType,
    setNumber,
    responses,
    respondingParty,
    propoundingParty,
    caseNumber,
    caseName,
    county = 'LOS ANGELES',
    attorneys,
  } = data;

  const children: (Paragraph | Table)[] = [];

  // Get attorney info
  const attorney = attorneys && attorneys.length > 0 ? attorneys[0] : null;
  const attorneyName = attorney?.name || '[Attorney Name]';
  const stateBarNumber = attorney?.barNumber || '[State Bar No.]';
  const lawFirmName = attorney?.firmName || '[LAW FIRM NAME]';
  const address = attorney?.address || '[Address]';
  const phone = attorney?.phone || '[Phone]';
  const email = attorney?.email || '[Email]';

  // Attorney Header (single-spaced)
  children.push(createHeaderParagraph(`${attorneyName}, State Bar No. ${stateBarNumber}`));
  children.push(createHeaderParagraph(lawFirmName));
  children.push(createHeaderParagraph(address));
  children.push(createHeaderParagraph(`Telephone: ${phone}`));
  children.push(createHeaderParagraph(email));
  children.push(createHeaderParagraph(''));
  children.push(createHeaderParagraph(`Attorney for Defendant ${respondingParty}`));
  children.push(createHeaderParagraph(''));
  children.push(createHeaderParagraph(''));

  // Court Header
  children.push(createHeaderParagraph('SUPERIOR COURT OF THE STATE OF CALIFORNIA', { alignment: AlignmentType.CENTER }));
  children.push(createHeaderParagraph(`COUNTY OF ${county.toUpperCase()}`, { alignment: AlignmentType.CENTER }));
  children.push(createHeaderParagraph(''));

  // Case Caption Table with borders
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
              createHeaderParagraph(`${propoundingParty.toUpperCase()},`),
              createHeaderParagraph(''),
              createHeaderParagraph('          Plaintiff,'),
              createHeaderParagraph(''),
              createHeaderParagraph('     vs.'),
              createHeaderParagraph(''),
              createHeaderParagraph(`${respondingParty.toUpperCase()},`),
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
                    text: getDiscoveryTypeTitle(discoveryType),
                    size: 24,
                    font: 'Times New Roman',
                    bold: true,
                  }),
                ],
                spacing: { line: 240, lineRule: 'auto' as any },
              }),
              createHeaderParagraph(`SET ${SET_NUMBER_WORDS[setNumber - 1] || setNumber}`),
              createHeaderParagraph(''),
              createHeaderParagraph('Propounding Party: Plaintiff'),
              createHeaderParagraph('Responding Party: Defendant'),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(captionTable);
  children.push(createHeaderParagraph(''));

  // Introduction paragraph
  const introText = `Defendant ${respondingParty} ("Defendant" or "Responding Party") hereby responds to Plaintiff ${propoundingParty}'s ${
    discoveryType === 'interrogatories' ? 'Special Interrogatories' :
    discoveryType === 'frog' ? 'Form Interrogatories - General' :
    discoveryType === 'rfp' ? 'Requests for Production of Documents' :
    'Requests for Admission'
  }, Set ${SET_NUMBER_WORDS[setNumber - 1] || setNumber}, as follows:`;

  children.push(createParagraph(introText, { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
  children.push(createParagraph(''));

  // General Objections Section
  children.push(new Paragraph({
    children: [new TextRun({ text: 'GENERAL OBJECTIONS', size: 24, bold: true, underline: {}, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    alignment: AlignmentType.CENTER,
  }));
  children.push(createParagraph(''));

  // General objections content
  children.push(new Paragraph({
    children: [new TextRun({ text: GENERAL_OBJECTIONS_HEADER, size: 24, font: 'Times New Roman' })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    indent: { firstLine: 720 },
  }));
  children.push(createParagraph(''));

  // Definitions objection
  const definitionsObj = discoveryType === 'rfa'
    ? DEFINITIONS_OBJECTION_RFA
    : discoveryType === 'frog'
    ? DEFINITIONS_OBJECTION_FROG
    : DEFINITIONS_OBJECTION_INTERROGATORY;
  
  children.push(new Paragraph({
    children: [new TextRun({ text: definitionsObj, size: 24, font: 'Times New Roman' })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    indent: { firstLine: 720 },
  }));
  children.push(createParagraph(''));

  // Specific Responses Section
  children.push(new Paragraph({
    children: [new TextRun({ text: 'SPECIFIC RESPONSES', size: 24, bold: true, underline: {}, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
    alignment: AlignmentType.CENTER,
  }));
  children.push(createParagraph(''));

  // Individual responses
  for (const response of responses) {
    // Request header
    children.push(new Paragraph({
      children: [new TextRun({ text: getRequestLabel(discoveryType, response.requestNumber), size: 24, bold: true, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { firstLine: 720 },
    }));

    // Original request (italicized)
    children.push(new Paragraph({
      children: [new TextRun({ text: response.originalRequest, size: 24, italics: true, font: 'Times New Roman' })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { left: 720 },
    }));
    children.push(createParagraph(''));

    // Response header
    children.push(new Paragraph({
      children: [new TextRun({ text: 'RESPONSE:', size: 24, bold: true, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { firstLine: 720 },
    }));

    // Objections (predefined + custom)
    let allObjectionTexts: string[] = [];
    
    // Get predefined objection texts
    if (response.objectionTexts && response.objectionTexts.length > 0) {
      allObjectionTexts = [...response.objectionTexts];
    } else {
      allObjectionTexts = response.objections.map(id => {
        const obj = getObjectionById(id);
        return obj?.fullText || id;
      });
    }
    
    // Add custom objections
    if (response.customObjections && response.customObjections.length > 0) {
      allObjectionTexts = [...allObjectionTexts, ...response.customObjections];
    }

    if (allObjectionTexts.length > 0) {
      for (const objText of allObjectionTexts) {
        children.push(new Paragraph({
          children: [new TextRun({ text: objText, size: 24, font: 'Times New Roman' })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
          indent: { left: 720 },
        }));
      }
      children.push(createParagraph(''));

      // Transition
      children.push(new Paragraph({
        children: [new TextRun({ text: RESPONSE_TRANSITION, size: 24, font: 'Times New Roman' })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
        indent: { left: 720 },
      }));
      children.push(createParagraph(''));
    }

    // Answer
    children.push(new Paragraph({
      children: [new TextRun({ text: response.answer, size: 24, font: 'Times New Roman' })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { left: 720 },
    }));
    children.push(createParagraph(''));

    // Reservation
    children.push(new Paragraph({
      children: [new TextRun({ text: DISCOVERY_RESERVATION, size: 24, italics: true, font: 'Times New Roman' })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { left: 720 },
    }));
    children.push(createParagraph(''));
  }

  // Verification (required for interrogatories and form interrogatories)
  if (discoveryType === 'interrogatories' || discoveryType === 'frog') {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'VERIFICATION', size: 24, bold: true, underline: {}, font: 'Times New Roman' })],
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      alignment: AlignmentType.CENTER,
    }));
    children.push(createParagraph(''));

    children.push(new Paragraph({
      children: [new TextRun({ 
        text: `I, ${respondingParty}, am the Responding Party herein. I have read the foregoing responses and know the contents thereof. The same is true of my own knowledge, except as to those matters which are therein stated upon information and belief, and as to those matters I believe them to be true.`, 
        size: 24, 
        font: 'Times New Roman' 
      })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { firstLine: 720 },
    }));
    children.push(createParagraph(''));

    children.push(new Paragraph({
      children: [new TextRun({ 
        text: 'I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.', 
        size: 24, 
        font: 'Times New Roman' 
      })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
      indent: { firstLine: 720 },
    }));
    children.push(createParagraph(''));

    children.push(createParagraph('Executed on ________________, at ________________, California.'));
    children.push(createParagraph(''));
    children.push(createParagraph(''));
    children.push(createParagraph('________________________________'));
    children.push(createParagraph(respondingParty));
    children.push(createParagraph(''));
  }

  // Signature Block
  children.push(createParagraph(''));
  children.push(createParagraph('Dated: ________________'));
  children.push(createParagraph(''));
  children.push(createParagraph('Respectfully submitted,'));
  children.push(createParagraph(''));
  children.push(new Paragraph({
    children: [new TextRun({ text: lawFirmName.toUpperCase(), size: 24, bold: true, font: 'Times New Roman' })],
    spacing: { line: PLEADING_LINE_HEIGHT, lineRule: 'exact' as any },
  }));
  children.push(createParagraph(''));
  children.push(createParagraph(''));
  children.push(createParagraph('_________________________________'));
  children.push(createParagraph(attorneyName));
  children.push(createParagraph(`Attorney for Defendant ${respondingParty}`));

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
        footers: { default: createFooter(discoveryType) },
        children: children,
      },
    ],
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize Supabase client with RLS
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateDocxRequest = await request.json();
    const { caseId, discoveryType, responses } = body;

    if (!caseId || !discoveryType || !responses?.length) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user has access to case (RLS check)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { success: false, error: 'Case not found or access denied' },
        { status: 403 }
      );
    }

    // Generate document with California pleading format
    const doc = generateResponseDocument(body);

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Log audit event
    try {
      await supabase.from('discovery_response_audit_log').insert({
        case_id: caseId,
        user_id: user.id,
        action: 'DOCX_GENERATED',
        discovery_type: discoveryType,
        details: {
          responseCount: responses.length,
          setNumber: body.setNumber,
        },
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Return document as download
    const typeLabels: Record<string, string> = {
      interrogatories: 'Interrogatory_Responses',
      frog: 'FROG_Responses',
      rfp: 'RFP_Responses',
      rfa: 'RFA_Responses'
    };
    
    const fileName = `${typeLabels[discoveryType] || 'Discovery_Responses'}_Set${body.setNumber}_${new Date().toISOString().split('T')[0]}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Generate DOCX error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}
