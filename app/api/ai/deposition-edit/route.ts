import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sectionId,
      sectionTitle,
      currentQuestions,
      userMessage,
      conversationHistory,
      depositionContext,
    } = body;

    if (!currentQuestions || !userMessage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build context about the deposition
    let contextInfo = '';
    if (depositionContext) {
      if (depositionContext.deponentName) {
        contextInfo += `Deponent: ${depositionContext.deponentName}\n`;
      }
      if (depositionContext.deponentRole) {
        contextInfo += `Role: ${depositionContext.deponentRole}\n`;
      }
      if (depositionContext.caseType) {
        contextInfo += `Case Type: ${depositionContext.caseType}\n`;
      }
    }

    // Build the system prompt
    const systemPrompt = `You are an expert legal assistant specializing in deposition preparation. You help attorneys craft effective deposition questions.

Your task is to help revise and improve deposition questions for the "${sectionTitle}" section.

${contextInfo ? `Context about this deposition:\n${contextInfo}\n` : ''}

Current Questions:
${currentQuestions}

Guidelines:
1. Maintain legal accuracy and professional tone
2. Questions should be clear and unambiguous
3. Avoid compound questions (one question at a time)
4. Use open-ended questions where appropriate to elicit detailed responses
5. Include follow-up questions when relevant
6. Consider the deponent's role and what information they likely possess

When you provide revised questions, format them clearly with each question on its own line, numbered or bulleted.

Always respond with:
1. A brief explanation of the changes you made
2. The complete revised set of questions (if the user asked for changes)

If the user is just asking a question or for advice (not requesting edits), respond helpfully without providing revised questions.`;

    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantResponse = completion.choices[0]?.message?.content || '';

    // Extract revised questions from the response
    // Be more aggressive about finding questions - look for any numbered/bulleted list
    let revisedQuestions: string | null = null;

    const lines = assistantResponse.split('\n');
    const questionLines: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this looks like a question line
      const isNumberedLine = /^[\d]+[.)]\s/.test(trimmedLine); // "1. " or "1) "
      const isBulletedLine = /^[-•*]\s/.test(trimmedLine); // "- " or "• " or "* "
      const isQuestionMark = trimmedLine.endsWith('?') && trimmedLine.length > 15;
      
      if (isNumberedLine || isBulletedLine || isQuestionMark) {
        questionLines.push(trimmedLine);
      }
    }

    // If we found at least 2 question-like lines, consider it a revision
    if (questionLines.length >= 2) {
      revisedQuestions = questionLines.join('\n');
    } else if (questionLines.length === 1 && questionLines[0].endsWith('?')) {
      // Even a single question is valid
      revisedQuestions = questionLines[0];
    }

    // If no structured questions found, but the response looks like it contains questions,
    // try a different approach - look for lines ending with "?"
    if (!revisedQuestions) {
      const allQuestionLines = lines
        .map(l => l.trim())
        .filter(l => l.endsWith('?') && l.length > 20);
      
      if (allQuestionLines.length >= 1) {
        revisedQuestions = allQuestionLines.join('\n');
      }
    }

    return NextResponse.json({
      message: assistantResponse,
      revisedQuestions,
    });
  } catch (error) {
    console.error('Error in deposition edit API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

