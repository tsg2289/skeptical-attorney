import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentCategory } from '@/lib/supabase/documentStorage'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Get a single document with download URL
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch document (RLS ensures user can only access their own)
    const { data: doc, error } = await supabase
      .from('case_documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Generate signed URL for download
    const { data: urlData, error: urlError } = await supabase.storage
      .from('case-files')
      .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

    if (urlError) {
      console.error('Error creating signed URL:', urlError)
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        caseId: doc.case_id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        category: doc.category,
        description: doc.description,
        extractedText: doc.extracted_text,
        extractionStatus: doc.extraction_status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        downloadUrl: urlData?.signedUrl || null
      }
    })

  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update document metadata
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, description } = body as {
      category?: DocumentCategory
      description?: string
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (category) updates.category = category
    if (description !== undefined) updates.description = description

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    const { data: doc, error } = await supabase
      .from('case_documents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !doc) {
      return NextResponse.json(
        { error: 'Document not found or update failed' },
        { status: 404 }
      )
    }

    console.log(`[AUDIT] User ${user.id} updated document ${id}`)

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        caseId: doc.case_id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        category: doc.category,
        description: doc.description,
        extractionStatus: doc.extraction_status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      }
    })

  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First get the document to find storage path
    const { data: doc, error: fetchError } = await supabase
      .from('case_documents')
      .select('storage_path, case_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('case-files')
      .remove([doc.storage_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue to delete database record anyway
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('case_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    console.log(`[AUDIT] User ${user.id} deleted document ${id} from case ${doc.case_id}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}









