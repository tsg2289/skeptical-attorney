import { NextRequest, NextResponse } from 'next/server';
import { checkText } from '@/lib/wordFlagService';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }
    
    const flags = checkText(text);
    
    return NextResponse.json({
      success: true,
      flags,
      count: flags.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check words', message: error.message },
      { status: 500 }
    );
  }
}


