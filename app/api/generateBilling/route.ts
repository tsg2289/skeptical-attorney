import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { caseName, description } = await req.json();
    
    if (!description) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `Create a professional legal billing entry for the following work:
Case: ${caseName || 'General'}
Description: ${description}

Respond with a single, detailed billing entry line without time estimates.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a legal billing assistant that creates professional, detailed billing entries for law firms. Always respond with a single billing entry line without time estimates. Do not reference case names in the billing text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    });

    const billingEntry = response.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      result: billingEntry,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in generateBilling:', error);
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'AI service quota exceeded', message: 'Please check your OpenAI account.' },
        { status: 429 }
      );
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { error: 'AI service rate limit exceeded', message: 'Please try again in a moment.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate billing entry', message: error.message },
      { status: 500 }
    );
  }
}


