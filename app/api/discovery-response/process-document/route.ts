/**
 * Discovery Response - Document Processing API
 * 
 * Handles uploaded discovery documents (PDF/DOCX/TXT)
 * Extracts text and parses individual discovery requests
 * 
 * Security: Server-only, authenticated, RLS-protected
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import mammoth from 'mammoth';

// Types
interface ParsedRequest {
  id: string;
  requestNumber: number;
  originalText: string;
  category?: string;
}

interface ProcessDocumentResponse {
  success: boolean;
  requests: ParsedRequest[];
  documentInfo: {
    fileName: string;
    fileType: string;
    extractedText: string;
    totalRequests: number;
  };
  error?: string;
}

/**
 * Extract text from PDF using pdf-parse with CommonJS require
 * This approach works better with Next.js API routes
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Use require for CommonJS compatibility
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extract text from uploaded file based on type
 */
async function extractTextFromFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileType = file.name.split('.').pop()?.toLowerCase();

  switch (fileType) {
    case 'pdf':
      try {
        const text = await extractPdfText(buffer);
        return text;
      } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF. Please ensure it is a valid, text-based PDF.');
      }

    case 'docx':
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
      }

    case 'txt':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Parse extracted text into individual discovery requests
 * Handles various formats: numbered, lettered, special interrogatory patterns
 */
function parseDiscoveryRequests(text: string, discoveryType: string): ParsedRequest[] {
  const requests: ParsedRequest[] = [];
  
  // Patterns for different discovery types
  const patterns: Record<string, RegExp[]> = {
    interrogatories: [
      // Special Interrogatory No. 1:
      /(?:SPECIAL\s+)?INTERROGATORY\s+(?:NO\.\s*)?(\d+)\s*[:\.]?\s*([\s\S]*?)(?=(?:SPECIAL\s+)?INTERROGATORY\s+(?:NO\.\s*)?\d+|$)/gi,
      // 1. Please state...
      /^(\d+)\.\s+([\s\S]*?)(?=^\d+\.|$)/gm,
      // INTERROGATORY 1:
      /INTERROGATORY\s+(\d+)\s*[:\.]?\s*([\s\S]*?)(?=INTERROGATORY\s+\d+|$)/gi,
    ],
    rfp: [
      // REQUEST FOR PRODUCTION NO. 1:
      /REQUEST\s+(?:FOR\s+PRODUCTION\s+)?(?:NO\.\s*)?(\d+)\s*[:\.]?\s*([\s\S]*?)(?=REQUEST\s+(?:FOR\s+PRODUCTION\s+)?(?:NO\.\s*)?\d+|$)/gi,
      // DEMAND NO. 1:
      /DEMAND\s+(?:NO\.\s*)?(\d+)\s*[:\.]?\s*([\s\S]*?)(?=DEMAND\s+(?:NO\.\s*)?\d+|$)/gi,
      // 1. All documents...
      /^(\d+)\.\s+([\s\S]*?)(?=^\d+\.|$)/gm,
    ],
    rfa: [
      // REQUEST FOR ADMISSION NO. 1:
      /REQUEST\s+(?:FOR\s+ADMISSION\s+)?(?:NO\.\s*)?(\d+)\s*[:\.]?\s*([\s\S]*?)(?=REQUEST\s+(?:FOR\s+ADMISSION\s+)?(?:NO\.\s*)?\d+|$)/gi,
      // ADMISSION NO. 1:
      /ADMISSION\s+(?:NO\.\s*)?(\d+)\s*[:\.]?\s*([\s\S]*?)(?=ADMISSION\s+(?:NO\.\s*)?\d+|$)/gi,
      // 1. Admit that...
      /^(\d+)\.\s+([\s\S]*?)(?=^\d+\.|$)/gm,
    ],
  };

  const typePatterns = patterns[discoveryType] || patterns.interrogatories;
  let matchCount = 0;

  // Try each pattern until we get results
  for (const pattern of typePatterns) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const requestNumber = parseInt(match[1], 10);
      const requestText = match[2].trim();

      // Skip empty or very short matches
      if (requestText.length < 10) continue;

      // Avoid duplicates
      if (requests.some(r => r.requestNumber === requestNumber)) continue;

      requests.push({
        id: `req_${Date.now()}_${requestNumber}`,
        requestNumber,
        originalText: requestText,
        category: categorizeRequest(requestText),
      });
      matchCount++;
    }

    // If we found requests, stop trying other patterns
    if (matchCount > 0) break;
  }

  // Sort by request number
  requests.sort((a, b) => a.requestNumber - b.requestNumber);

  return requests;
}

/**
 * Categorize request based on content keywords
 */
function categorizeRequest(text: string): string {
  const textLower = text.toLowerCase();
  
  if (/documents?|records?|writings?|correspondence/i.test(textLower)) {
    return 'documents';
  }
  if (/identify|name|address|contact/i.test(textLower)) {
    return 'identification';
  }
  if (/describe|explain|state the facts/i.test(textLower)) {
    return 'narrative';
  }
  if (/admit|deny|true or false/i.test(textLower)) {
    return 'admission';
  }
  if (/contention|allege|claim/i.test(textLower)) {
    return 'contention';
  }
  if (/medical|treatment|diagnosis|injury/i.test(textLower)) {
    return 'medical';
  }
  if (/employment|employer|job|work/i.test(textLower)) {
    return 'employment';
  }
  if (/income|earnings|damages|costs/i.test(textLower)) {
    return 'financial';
  }
  
  return 'general';
}

/**
 * Log audit event for SOC2 compliance
 */
async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  userId: string,
  action: string,
  discoveryType: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('discovery_response_audit_log').insert({
      case_id: caseId,
      user_id: userId,
      action,
      discovery_type: discoveryType,
      details,
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't fail the request for audit log errors
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessDocumentResponse>> {
  try {
    // Initialize Supabase client with RLS
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, requests: [], documentInfo: {} as ProcessDocumentResponse['documentInfo'], error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const discoveryType = formData.get('discoveryType') as string | 'interrogatories';

    if (!file) {
      return NextResponse.json(
        { success: false, requests: [], documentInfo: {} as ProcessDocumentResponse['documentInfo'], error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!caseId) {
      return NextResponse.json(
        { success: false, requests: [], documentInfo: {} as ProcessDocumentResponse['documentInfo'], error: 'Case ID required' },
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
        { success: false, requests: [], documentInfo: {} as ProcessDocumentResponse['documentInfo'], error: 'Case not found or access denied' },
        { status: 403 }
      );
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(file);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, requests: [], documentInfo: {} as ProcessDocumentResponse['documentInfo'], error: 'No text could be extracted from the document' },
        { status: 400 }
      );
    }

    // Parse discovery requests
    const requests = parseDiscoveryRequests(extractedText, discoveryType);

    if (requests.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          requests: [], 
          documentInfo: {
            fileName: file.name,
            fileType: file.name.split('.').pop() || 'unknown',
            extractedText: extractedText.substring(0, 500) + '...',
            totalRequests: 0,
          }, 
          error: 'No discovery requests could be parsed from the document. Please check the format.' 
        },
        { status: 400 }
      );
    }

    // Log audit event
    await logAuditEvent(supabase, caseId, user.id, 'DOCUMENT_PROCESSED', discoveryType, {
      fileName: file.name,
      fileSize: file.size,
      requestCount: requests.length,
    });

    return NextResponse.json({
      success: true,
      requests,
      documentInfo: {
        fileName: file.name,
        fileType: file.name.split('.').pop() || 'unknown',
        extractedText,
        totalRequests: requests.length,
      },
    });

  } catch (error) {
    console.error('Process document error:', error);
    return NextResponse.json(
      { 
        success: false, 
        requests: [], 
        documentInfo: {} as ProcessDocumentResponse['documentInfo'], 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

