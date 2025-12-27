import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get documents with extracted text for AI generation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const documentIds = searchParams.get('documentIds')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Missing caseId parameter' },
        { status: 400 }
      )
    }

    // Build query - only get documents that have extracted text
    let query = supabase
      .from('case_documents')
      .select('id, file_name, category, extracted_text')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .eq('extraction_status', 'completed')
      .not('extracted_text', 'is', null)

    // If specific document IDs are provided, filter by them
    if (documentIds) {
      const ids = documentIds.split(',').filter(id => id.trim())
      if (ids.length > 0) {
        query = query.in('id', ids)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching documents for AI:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // Map to AI-friendly format
    const documents = (data || []).map(doc => ({
      id: doc.id,
      fileName: doc.file_name,
      category: doc.category,
      extractedText: doc.extracted_text
    }))

    // Log for audit
    console.log(`[AUDIT] User ${user.id} fetched ${documents.length} documents for AI generation on case ${caseId}`)

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('Error fetching documents for AI:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

