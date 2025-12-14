import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for deposition updates
const UpdateDepositionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  deponent_name: z.string().min(1, 'Deponent name is required').max(255, 'Deponent name too long').optional(),
  deponent_role: z.string().min(1, 'Deponent role is required').max(255, 'Deponent role too long').optional(),
  deposition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  taking_attorney: z.string().max(255, 'Taking attorney name too long').optional(),
  defending_attorney: z.string().max(255, 'Defending attorney name too long').optional(),
  court_reporter: z.string().max(255, 'Court reporter name too long').optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing deposition ID' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the deposition with case verification (RLS handles ownership)
    const { data: deposition, error } = await supabase
      .from('deposition')
      .select(`
        *,
        cases!inner(
          id,
          user_id
        )
      `)
      .eq('id', id)
      .eq('cases.user_id', user.id)
      .single();
    
    if (error || !deposition) {
      return NextResponse.json(
        { error: 'Deposition not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(deposition);
    
  } catch (error) {
    console.error('Unexpected error in GET /api/depositions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing deposition ID' },
        { status: 400 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    // Validate the payload
    const validationResult = UpdateDepositionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues,
          message: 'Please check your input and try again'
        },
        { status: 422 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the deposition belongs to the user via cases
    const { data: existingDeposition, error: fetchError } = await supabase
      .from('deposition')
      .select(`
        id,
        cases!inner(
          id,
          user_id
        )
      `)
      .eq('id', id)
      .eq('cases.user_id', user.id)
      .single();
    
    if (fetchError || !existingDeposition) {
      return NextResponse.json(
        { error: 'Deposition not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update the deposition
    const { data: deposition, error: updateError } = await supabase
      .from('deposition')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: updateError.message || 'Failed to update deposition',
          hint: updateError.hint
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(deposition);
    
  } catch (error) {
    console.error('Unexpected error in PUT /api/depositions/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing deposition ID' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the deposition belongs to the user via cases
    const { data: existingDeposition, error: fetchError } = await supabase
      .from('deposition')
      .select(`
        id,
        cases!inner(
          id,
          user_id
        )
      `)
      .eq('id', id)
      .eq('cases.user_id', user.id)
      .single();
    
    if (fetchError || !existingDeposition) {
      return NextResponse.json(
        { error: 'Deposition not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the deposition
    const { error: deleteError } = await supabase
      .from('deposition')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: deleteError.message || 'Failed to delete deposition',
          hint: deleteError.hint
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Unexpected error in DELETE /api/depositions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
