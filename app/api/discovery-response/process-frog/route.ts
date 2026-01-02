/**
 * Discovery Response - FROG (Form Interrogatories) Processing API
 * 
 * Processes uploaded DISC-001 PDF forms and extracts selected interrogatories.
 * Uses PyMuPDF to read PDF form checkboxes without OCR.
 * 
 * Security: Server-only, authenticated, RLS-protected
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readDISC001Form } from '@/lib/read-disc001';
import { STANDARD_INTERROGATORIES } from '@/lib/pdf-form-filler';

// Types
interface ParsedRequest {
  id: string;
  requestNumber: number;
  originalText: string;
  category?: string;
  interrogatoryId: string; // e.g., "6.1", "10.2"
}

interface ProcessFROGResponse {
  success: boolean;
  requests: ParsedRequest[];
  documentInfo: {
    fileName: string;
    fileType: string;
    selectedCount: number;
    formData: Record<string, string>;
  };
  error?: string;
}

/**
 * Log audit event for SOC2 compliance
 */
async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  userId: string,
  action: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('discovery_response_audit_log').insert({
      case_id: caseId,
      user_id: userId,
      action,
      discovery_type: 'frog',
      details,
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't fail the request for audit log errors
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessFROGResponse>> {
  try {
    // Initialize Supabase client with RLS
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          requests: [],
          documentInfo: {} as ProcessFROGResponse['documentInfo'],
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          requests: [],
          documentInfo: {} as ProcessFROGResponse['documentInfo'],
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    if (!caseId) {
      return NextResponse.json(
        {
          success: false,
          requests: [],
          documentInfo: {} as ProcessFROGResponse['documentInfo'],
          error: 'Case ID required',
        },
        { status: 400 }
      );
    }

    // Verify file is PDF
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'pdf') {
      return NextResponse.json(
        {
          success: false,
          requests: [],
          documentInfo: {} as ProcessFROGResponse['documentInfo'],
          error: 'FROG responses require a DISC-001 PDF form. Please upload a PDF file.',
        },
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
        {
          success: false,
          requests: [],
          documentInfo: {} as ProcessFROGResponse['documentInfo'],
          error: 'Case not found or access denied',
        },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read the DISC-001 form
    const readResult = await readDISC001Form(buffer);

    if (!readResult.success) {
      return NextResponse.json(
        {
          success: false,
          requests: [],
          documentInfo: {
            fileName: file.name,
            fileType: fileType || 'unknown',
            selectedCount: 0,
            formData: {},
          },
          error: readResult.error || 'Failed to read DISC-001 form. Please ensure it is a valid California DISC-001 PDF.',
        },
        { status: 400 }
      );
    }

    if (readResult.selectedInterrogatories.length === 0) {
      return NextResponse.json(
        {
          success: false,
          requests: [],
          documentInfo: {
            fileName: file.name,
            fileType: fileType || 'unknown',
            selectedCount: 0,
            formData: readResult.formData,
          },
          error: 'No interrogatories were selected in this DISC-001 form. Please upload a form with checked interrogatories.',
        },
        { status: 400 }
      );
    }

    // Convert selected interrogatories to parsed requests
    const requests: ParsedRequest[] = [];
    let requestNumber = 1;

    for (const interrogatoryId of readResult.selectedInterrogatories) {
      // Look up the interrogatory text from STANDARD_INTERROGATORIES
      // Handle both numeric (1, 2, 17) and decimal (6.1, 10.2) keys
      const interrogatory = (STANDARD_INTERROGATORIES as Record<string, { category: string; text: string }>)[interrogatoryId];

      if (interrogatory) {
        requests.push({
          id: `frog_${Date.now()}_${requestNumber}`,
          requestNumber,
          originalText: interrogatory.text,
          category: interrogatory.category,
          interrogatoryId,
        });
        requestNumber++;
      } else {
        // If not found in our library, still include it with a placeholder
        console.warn(`Unknown FROG interrogatory: ${interrogatoryId}`);
        requests.push({
          id: `frog_${Date.now()}_${requestNumber}`,
          requestNumber,
          originalText: `Form Interrogatory No. ${interrogatoryId} (standard text not available)`,
          category: 'Unknown',
          interrogatoryId,
        });
        requestNumber++;
      }
    }

    // Log audit event
    await logAuditEvent(supabase, caseId, user.id, 'FROG_DOCUMENT_PROCESSED', {
      fileName: file.name,
      fileSize: file.size,
      selectedCount: readResult.selectedInterrogatories.length,
      interrogatoryIds: readResult.selectedInterrogatories,
    });

    return NextResponse.json({
      success: true,
      requests,
      documentInfo: {
        fileName: file.name,
        fileType: fileType || 'unknown',
        selectedCount: readResult.selectedInterrogatories.length,
        formData: readResult.formData,
      },
    });
  } catch (error) {
    console.error('Process FROG document error:', error);
    return NextResponse.json(
      {
        success: false,
        requests: [],
        documentInfo: {} as ProcessFROGResponse['documentInfo'],
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
