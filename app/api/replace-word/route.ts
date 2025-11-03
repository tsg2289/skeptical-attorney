import { NextRequest, NextResponse } from 'next/server';
import { replaceWord } from '@/lib/wordFlagService';

export async function POST(req: NextRequest) {
  try {
    const { text, flaggedWord, replacement } = await req.json();
    
    if (!text || !flaggedWord || !replacement) {
      return NextResponse.json(
        { error: 'Missing required fields: text, flaggedWord, replacement' },
        { status: 400 }
      );
    }
    
    const newText = replaceWord(text, flaggedWord, replacement);
    
    return NextResponse.json({
      success: true,
      originalText: text,
      newText,
      replacedWord: flaggedWord,
      replacement,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to replace word', message: error.message },
      { status: 500 }
    );
  }
}


