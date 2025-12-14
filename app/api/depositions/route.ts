import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for deposition creation
const CreateDepositionSchema = z.object({
  case_id: z.string().min(1, 'Case ID is required').refine(
    (val) => val.startsWith('dev-case-') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    'Invalid case ID format'
  ),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  deponent_name: z.string().min(1, 'Deponent name is required').max(255, 'Deponent name too long'),
  deponent_role: z.string().min(1, 'Deponent role is required').max(255, 'Deponent role too long'),
  deposition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  taking_attorney: z.string().max(255, 'Taking attorney name too long').optional(),
  defending_attorney: z.string().max(255, 'Defending attorney name too long').optional(),
  court_reporter: z.string().max(255, 'Court reporter name too long').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    
    // Validate the payload
    const validationResult = CreateDepositionSchema.safeParse(body);
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
    
    // In development mode, return a mock response for dev cases
    if (process.env.NODE_ENV === 'development' && validatedData.case_id.startsWith('dev-case-')) {
      const mockDeposition = {
        id: 'dev-deposition-' + Date.now(),
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return NextResponse.json(mockDeposition, { status: 201 });
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json(
        { error: 'Authentication error', message: authError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to create depositions' },
        { status: 401 }
      );
    }
    
    // Verify the case belongs to the user
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id')
      .eq('id', validatedData.case_id)
      .eq('user_id', user.id)
      .single();
    
    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this case' },
        { status: 403 }
      );
    }
    
    // Create the deposition
    const { data: deposition, error: insertError } = await supabase
      .from('deposition')
      .insert([validatedData])
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: insertError.message || 'Failed to create deposition',
          hint: insertError.hint || 'Please try again',
          code: insertError.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(deposition, { status: 201 });
    
  } catch (error) {
    console.error('Unexpected error in POST /api/depositions:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Please try again later'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('case_id');
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'Missing case_id parameter' },
        { status: 400 }
      );
    }
    
    // In development mode, return empty array for dev cases
    if (process.env.NODE_ENV === 'development' && caseId.startsWith('dev-case-')) {
      return NextResponse.json([]);
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json(
        { error: 'Authentication error', message: authError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to access depositions' },
        { status: 401 }
      );
    }
    
    // Get depositions for the case (RLS will enforce ownership)
    const { data: depositions, error } = await supabase
      .from('deposition')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching depositions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch depositions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(depositions);
    
  } catch (error) {
    console.error('Unexpected error in GET /api/depositions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
