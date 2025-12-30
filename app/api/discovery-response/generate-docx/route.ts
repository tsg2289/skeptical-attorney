/**
 * Discovery Response - Word Document Generation API
 * 
 * Generates properly formatted Word documents for discovery responses
 * Follows California court formatting requirements
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
  HeadingLevel,
  TabStopType,
  TabStopPosition,
  LineRuleType,
  BorderStyle,
  Header,
  PageNumber,
  NumberFormat,
} from 'docx';
import {
  getObjectionById,
  GENERAL_OBJECTIONS_HEADER,
  DEFINITIONS_OBJECTION_INTERROGATORY,
  DEFINITIONS_OBJECTION_RFA,
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
  attorneys?: {
    name: string;
    barNumber: string;
    firmName: string;
    address: string;
    phone: string;
    email: string;
  }[];
}

/**
 * Create caption section for the document
 */
function createCaption(data: GenerateDocxRequest): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Attorney header
  if (data.attorneys && data.attorneys.length > 0) {
    const attorney = data.attorneys[0];
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: attorney.name, bold: true })],
        alignment: AlignmentType.LEFT,
      }),
      new Paragraph({
        children: [new TextRun({ text: `State Bar No. ${attorney.barNumber}` })],
      }),
      new Paragraph({
        children: [new TextRun({ text: attorney.firmName })],
      }),
      new Paragraph({
        children: [new TextRun({ text: attorney.address })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Telephone: ${attorney.phone}` })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Email: ${attorney.email}` })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Attorney for ${data.respondingParty}` })],
        spacing: { after: 400 },
      }),
    );
  }

  // Court name
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.courtName, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );

  // Case name and number with table-like formatting
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.caseName })],
      alignment: AlignmentType.LEFT,
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Case No. ${data.caseNumber}` }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
    }),
  );

  // Document title
  const discoveryTypeTitle = getDiscoveryTypeTitle(data.discoveryType, data.setNumber);
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: discoveryTypeTitle, bold: true })],
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 400 },
    }),
  );

  return paragraphs;
}

/**
 * Get document title based on discovery type
 */
function getDiscoveryTypeTitle(discoveryType: DiscoveryResponseType, setNumber: number): string {
  const setLabel = setNumber > 1 ? `, SET ${setNumber}` : '';
  switch (discoveryType) {
    case 'interrogatories':
      return `RESPONSES TO SPECIAL INTERROGATORIES${setLabel}`;
    case 'rfp':
      return `RESPONSES TO REQUESTS FOR PRODUCTION OF DOCUMENTS${setLabel}`;
    case 'rfa':
      return `RESPONSES TO REQUESTS FOR ADMISSION${setLabel}`;
    default:
      return `DISCOVERY RESPONSES${setLabel}`;
  }
}

/**
 * Create preamble section
 */
function createPreamble(data: GenerateDocxRequest): Paragraph[] {
  const preamble = `${data.respondingParty} hereby responds to the ${getDiscoveryTypeName(data.discoveryType)} propounded by ${data.propoundingParty} as follows:`;
  
  return [
    new Paragraph({
      children: [new TextRun({ text: preamble })],
      spacing: { after: 200 },
    }),
  ];
}

/**
 * Get readable discovery type name
 */
function getDiscoveryTypeName(discoveryType: DiscoveryResponseType): string {
  switch (discoveryType) {
    case 'interrogatories':
      return 'Special Interrogatories';
    case 'rfp':
      return 'Requests for Production of Documents';
    case 'rfa':
      return 'Requests for Admission';
    default:
      return 'Discovery Requests';
  }
}

/**
 * Create general objections section
 */
function createGeneralObjections(discoveryType: DiscoveryResponseType): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Section header
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'GENERAL OBJECTIONS', bold: true, underline: {} })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    }),
  );

  // Add general objections content
  const generalObjText = GENERAL_OBJECTIONS_HEADER;
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: generalObjText })],
      spacing: { after: 200 },
    }),
  );

  // Definitions objection
  const definitionsObj = discoveryType === 'rfa' 
    ? DEFINITIONS_OBJECTION_RFA 
    : DEFINITIONS_OBJECTION_INTERROGATORY;
    
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: definitionsObj })],
      spacing: { after: 400 },
    }),
  );

  return paragraphs;
}

/**
 * Create individual response section
 */
function createResponseSection(response: ResponseItem, discoveryType: DiscoveryResponseType): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Request label based on type
  const requestLabel = discoveryType === 'interrogatories' 
    ? `INTERROGATORY NO. ${response.requestNumber}:`
    : discoveryType === 'rfp'
      ? `REQUEST FOR PRODUCTION NO. ${response.requestNumber}:`
      : `REQUEST FOR ADMISSION NO. ${response.requestNumber}:`;

  // Request header
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: requestLabel, bold: true })],
      spacing: { before: 300 },
    }),
  );

  // Original request
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: response.originalRequest, italics: true })],
      indent: { left: 720 },
      spacing: { after: 200 },
    }),
  );

  // Response header
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'RESPONSE:', bold: true })],
      spacing: { before: 200 },
    }),
  );

  // Objections
  if (response.objections.length > 0 || response.objectionTexts.length > 0) {
    const objectionTexts = response.objectionTexts.length > 0 
      ? response.objectionTexts 
      : response.objections.map(id => {
          const obj = getObjectionById(id);
          return obj?.fullText || id;
        });

    for (const objText of objectionTexts) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: objText })],
          indent: { left: 720 },
          spacing: { after: 100 },
        }),
      );
    }

    // Transition
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: RESPONSE_TRANSITION })],
        indent: { left: 720 },
        spacing: { before: 200, after: 200 },
      }),
    );
  }

  // Answer
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: response.answer })],
      indent: { left: 720 },
      spacing: { after: 200 },
    }),
  );

  // Reservation
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: DISCOVERY_RESERVATION, italics: true })],
      indent: { left: 720 },
      spacing: { after: 300 },
    }),
  );

  return paragraphs;
}

/**
 * Create verification section (required for interrogatories)
 */
function createVerification(respondingParty: string): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: 'VERIFICATION', bold: true, underline: {} })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `I, ${respondingParty}, am the Responding Party herein. I have read the foregoing responses and know the contents thereof. The same is true of my own knowledge, except as to those matters which are therein stated upon information and belief, and as to those matters I believe them to be true.` })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.' })],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Executed on ________________, at ________________, California.' })],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '________________________________' })],
      spacing: { before: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: respondingParty })],
    }),
  ];
}

/**
 * Create signature block
 */
function createSignatureBlock(data: GenerateDocxRequest): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: '' })],
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Dated: ________________' })],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      children: [new TextRun({ text: '' })],
      spacing: { before: 400 },
    }),
  );

  if (data.attorneys && data.attorneys.length > 0) {
    const attorney = data.attorneys[0];
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'Respectfully submitted,' })],
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { before: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '________________________________' })],
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [new TextRun({ text: attorney.name, bold: true })],
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [new TextRun({ text: `Attorney for ${data.respondingParty}` })],
        alignment: AlignmentType.RIGHT,
      }),
    );
  }

  return paragraphs;
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

    // Build document sections
    const sections: Paragraph[] = [];

    // Caption
    sections.push(...createCaption(body));

    // Preamble
    sections.push(...createPreamble(body));

    // General objections
    sections.push(...createGeneralObjections(discoveryType));

    // Responses header
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: 'SPECIFIC RESPONSES', bold: true, underline: {} })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
      }),
    );

    // Individual responses
    for (const response of responses) {
      sections.push(...createResponseSection(response, discoveryType));
    }

    // Verification (required for interrogatories)
    if (discoveryType === 'interrogatories') {
      sections.push(...createVerification(body.respondingParty));
    }

    // Signature block
    sections.push(...createSignatureBlock(body));

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Page ' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                  new TextRun({ text: ' of ' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children: sections,
      }],
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24, // 12pt
            },
            paragraph: {
              spacing: {
                line: 480, // Double-spaced
                lineRule: LineRuleType.AUTO,
              },
            },
          },
        },
      },
      numbering: {
        config: [{
          reference: 'page-numbers',
          levels: [{
            level: 0,
            format: NumberFormat.DECIMAL,
            text: '%1',
            alignment: AlignmentType.RIGHT,
          }],
        }],
      },
    });

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
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="discovery_responses_${discoveryType}_${Date.now()}.docx"`,
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


