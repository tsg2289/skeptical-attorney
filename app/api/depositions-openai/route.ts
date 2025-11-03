import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { sanitizeForOpenAI, sanitizeAIContext, detectPII } from '@/app/services/deposition/utils/validation';

// SECURE: OpenAI API key is server-side only (no NEXT_PUBLIC prefix)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { questions, context, userPrompt } = await request.json();

    if (!questions || typeof questions !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    // Detect and log PII for security monitoring
    const piiDetection = detectPII(questions);
    if (piiDetection.hasPII) {
      console.log('PII detected in AI request:', {
        types: piiDetection.detectedTypes,
        timestamp: new Date().toISOString(),
        context: context || 'unknown'
      });
    }

    // Sanitize all inputs before sending to OpenAI
    const sanitizedQuestions = sanitizeForOpenAI(questions);
    const sanitizedUserPrompt = sanitizeForOpenAI(userPrompt || '');
    const sanitizedContext = sanitizeAIContext(context || '');

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-openai-key-here')) {
      // Return mock response for testing
      let mockResponse;
      if (context === 'notes_improvement') {
        mockResponse = `MOCK AI RESPONSE - Based on your prompt: "${sanitizedUserPrompt || 'Improve these notes'}"

IMPROVED NOTES:
- Key points have been summarized and organized
- Professional language has been applied
- Timeline and sequence have been clarified
- Legal terminology has been standardized
- Additional relevant details have been suggested

Note: This is a mock response. Add your OpenAI API key to .env.local to get real AI suggestions.`;
      } else {
        mockResponse = `MOCK AI RESPONSE - Based on your prompt: "${sanitizedUserPrompt || 'Improve these questions'}"
      
1. Please state your full legal name for the record.
2. What is your current occupation and place of employment?
3. Can you describe your professional background and qualifications?
4. Please provide your complete contact information including address and phone number.
5. Are you familiar with the subject matter of this deposition?

Note: This is a mock response. Add your OpenAI API key to .env.local to get real AI suggestions.`;
      }

      return NextResponse.json({ 
        improvedQuestions: mockResponse,
        originalQuestions: questions 
      });
    }

    let basePrompt;
    if (context === 'notes_improvement') {
      basePrompt = `You are a legal deposition expert specializing in note-taking and documentation. Please review and improve the following deposition notes based on the user's specific instructions. Make them more professional, organized, and legally useful while maintaining all important information.

Context: ${sanitizedContext || 'Deposition notes improvement'}

Original Notes:
${sanitizedQuestions}

User Instructions: ${sanitizedUserPrompt || 'Improve these notes to be more professional and organized.'}

Please provide the improved notes following the user's specific instructions while ensuring:
1. Notes are professionally written and organized
2. Legal terminology is used appropriately
3. Key information is preserved and highlighted
4. Structure and clarity are improved
5. Timeline and sequence are clear
6. Important details are emphasized

Return only the improved notes, no additional commentary.`;
    } else {
      basePrompt = `You are a legal deposition expert. Please review and improve the following deposition questions based on the user's specific instructions. Make them more precise, legally sound, and effective for gathering information. Maintain the same structure and numbering, but enhance clarity and legal effectiveness.

Context: ${sanitizedContext || 'General deposition questions'}

Original Questions:
${sanitizedQuestions}

User Instructions: ${sanitizedUserPrompt || 'Improve these questions to be more legally precise and effective.'}

Please provide the improved questions in the same format, one per line. Follow the user's specific instructions while ensuring:
1. Questions are legally sound and precise
2. Proper legal terminology is used
3. Question flow and logic are improved
4. Original intent is maintained while enhancing effectiveness

Return only the improved questions, no additional commentary.`;
    }

    const systemMessage = context === 'notes_improvement' 
      ? "You are a legal deposition expert specializing in note-taking, documentation, and legal writing. You help improve deposition notes to be more professional, organized, and legally useful."
      : "You are a legal deposition expert specializing in question optimization and legal strategy.";

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: basePrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const improvedQuestions = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ 
      improvedQuestions,
      originalQuestions: questions 
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process questions with AI' },
      { status: 500 }
    );
  }
}

