import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, DocumentCategory } from '@/lib/supabase/documentStorage'

// POST - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const caseId = formData.get('caseId') as string
    const category = formData.get('category') as DocumentCategory
    const description = formData.get('description') as string | null

    // Validate required fields
    if (!file || !caseId || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: file, caseId, category' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileType = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]
    if (!fileType) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported: PDF, Word (.docx), Text, JPEG, PNG` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Verify the case belongs to the user
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found or unauthorized' },
        { status: 404 }
      )
    }

    // Generate unique storage path
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${user.id}/${caseId}/${timestamp}_${sanitizedName}`

    // Upload file to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('case-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Determine extraction status
    const isTextExtractable = ['pdf', 'docx', 'txt'].includes(fileType)
    const extractionStatus = isTextExtractable ? 'pending' : 'not_applicable'

    // Create database record
    const { data: docData, error: dbError } = await supabase
      .from('case_documents')
      .insert({
        case_id: caseId,
        user_id: user.id,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        category,
        description: description || null,
        extraction_status: extractionStatus
      })
      .select()
      .single()

    if (dbError || !docData) {
      console.error('Database insert error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('case-files').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Log for audit
    console.log(`[AUDIT] User ${user.id} uploaded document ${docData.id} to case ${caseId}`)

    // If text extractable, trigger extraction asynchronously
    if (isTextExtractable) {
      // Extract text inline for simplicity (could be moved to background job)
      try {
        const extractedText = await extractTextFromFile(file, fileType)
        if (extractedText) {
          await supabase
            .from('case_documents')
            .update({
              extracted_text: extractedText,
              extraction_status: 'completed'
            })
            .eq('id', docData.id)
          
          docData.extracted_text = extractedText
          docData.extraction_status = 'completed'
        }
      } catch (extractError) {
        console.error('Text extraction error:', extractError)
        await supabase
          .from('case_documents')
          .update({ extraction_status: 'failed' })
          .eq('id', docData.id)
        docData.extraction_status = 'failed'
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: docData.id,
        caseId: docData.case_id,
        fileName: docData.file_name,
        fileType: docData.file_type,
        fileSize: docData.file_size,
        category: docData.category,
        description: docData.description,
        extractionStatus: docData.extraction_status,
        createdAt: docData.created_at
      }
    })

  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List documents for a case
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const category = searchParams.get('category') as DocumentCategory | null

    if (!caseId) {
      return NextResponse.json(
        { error: 'Missing caseId parameter' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    const documents = (data || []).map(doc => ({
      id: doc.id,
      caseId: doc.case_id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      category: doc.category,
      description: doc.description,
      extractionStatus: doc.extraction_status,
      hasExtractedText: !!doc.extracted_text,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    }))

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('Error listing documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to extract text from files
async function extractTextFromFile(file: File, fileType: string): Promise<string | null> {
  const buffer = Buffer.from(await file.arrayBuffer())
  let extractedText = ''

  try {
    if (fileType === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import('pdf-parse') as any
      const pdfParse = pdfModule.default || pdfModule
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
    } else if (fileType === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    } else if (fileType === 'txt') {
      extractedText = buffer.toString('utf-8')
    }

    // Clean up and limit text length
    if (extractedText) {
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      // Limit to ~50k characters to prevent token overflow
      const maxLength = 50000
      if (extractedText.length > maxLength) {
        extractedText = extractedText.substring(0, maxLength) + '\n\n[Document truncated due to length...]'
      }
    }

    return extractedText || null
  } catch (error) {
    console.error('Text extraction failed:', error)
    return null
  }
}

