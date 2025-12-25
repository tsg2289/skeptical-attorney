import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - allow trial users to parse documents)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''

    // Parse PDF
    if (fileName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import('pdf-parse') as any
      const pdfParse = pdfModule.default || pdfModule
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
    }
    // Parse Word document (.docx)
    else if (fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    }
    // Parse plain text or .doc (basic)
    else if (fileName.endsWith('.txt') || fileName.endsWith('.doc')) {
      extractedText = buffer.toString('utf-8')
    }
    else {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload a PDF, Word (.docx), or text file.' 
      }, { status: 400 })
    }

    // Limit text length to prevent token overflow (roughly 50k characters)
    const maxLength = 50000
    if (extractedText.length > maxLength) {
      extractedText = extractedText.substring(0, maxLength) + '\n\n[Document truncated due to length...]'
    }

    // Clean up the text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Audit log for both authenticated and trial users
    if (user) {
      console.log(`[AUDIT] User ${user.id} parsed document: ${file.name} (${extractedText.length} chars)`)
    } else {
      console.log(`[AUDIT] Trial user parsed document: ${file.name} (${extractedText.length} chars)`)
    }

    return NextResponse.json({ 
      success: true,
      text: extractedText,
      fileName: file.name,
      charCount: extractedText.length
    })

  } catch (error) {
    console.error('Document parsing error:', error)
    return NextResponse.json({ error: 'Failed to parse document' }, { status: 500 })
  }
}

