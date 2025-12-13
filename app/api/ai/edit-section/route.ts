import { NextRequest, NextResponse } from 'next/server';
import { anonymizeDataWithMapping, reidentifyData, PIIMapping, ContextualMapping } from '@/lib/utils/anonymize';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      sectionId, 
      sectionTitle, 
      currentContent, 
      caseDescription,
      userMessage,
      conversationHistory,
      caseId,
      parties
    } = await request.json();

    // CRITICAL: Validate case ID is provided for data isolation
    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required for section editing' },
        { status: 400 }
      );
    }

    // Log for audit trail
    console.log(`[AUDIT] Interactive edit for section ${sectionId}, case: ${caseId}`);

    const { getOpenAIApiKey, getOpenAIHeaders } = await import('@/lib/openai/config');
    let apiKey: string;
    try {
      apiKey = getOpenAIApiKey();
    } catch (error) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Anonymize content and user message
    const contentResult = anonymizeDataWithMapping(currentContent || '');
    const caseDescResult = anonymizeDataWithMapping(caseDescription || '');
    const messageResult = anonymizeDataWithMapping(userMessage || '');

    // Combine mappings for re-identification
    const combinedMapping: PIIMapping = {};
    const combinedContextual: ContextualMapping[] = [];
    
    [contentResult, caseDescResult, messageResult].forEach(result => {
      Object.keys(result.mapping).forEach(key => {
        combinedMapping[key] = [...(combinedMapping[key] || []), ...result.mapping[key]];
      });
      combinedContextual.push(...result.contextualMappings);
    });

    // Build party identification string
    let partyIdentification = '';
    if (parties) {
      const clientName = parties.client || (parties.plaintiffs?.[0]?.name);
      const plaintiffNames = parties.plaintiffs?.map((p: {name: string}) => p.name).join(', ');
      const defendantNames = parties.defendants?.map((d: {name: string}) => d.name).join(', ');
      
      partyIdentification = `
CRITICAL PARTY IDENTIFICATION (Do NOT confuse these roles):
- OUR CLIENT (the injured party making the demand): ${clientName || '[Identify from case description]'}
- PLAINTIFF(S): ${plaintiffNames || clientName || '[Identify from case description]'}
- DEFENDANT(S) / OPPOSING PARTY (the party being accused/liable): ${defendantNames || '[Identify from case description]'}

When writing about liability, damages, or demands:
- The DEFENDANT is the party who is LIABLE and owes damages
- The PLAINTIFF/CLIENT is the party who was HARMED and is owed compensation
- Never reverse these roles
`;
    }

    // Build conversation context with strict anti-hallucination rules
    const systemPrompt = `You are a professional legal assistant helping to edit a demand letter section. You MUST follow these CRITICAL rules:
${partyIdentification}
ANTI-HALLUCINATION RULES:
1. ONLY use facts, names, dates, and details from the provided case description
2. NEVER invent or assume information not explicitly provided
3. If you need information that's not available, say "Based on the information provided..." or use [PLACEHOLDER]
4. Do NOT create fictional witnesses, medical providers, dollar amounts, or specific facts
5. Stay strictly within the scope of THIS case only

EDITING GUIDELINES:
- Maintain a formal, professional legal tone throughout
- When the user asks to make content "more aggressive," use stronger legal language, more assertive phrasing, and emphasize liability
- When asked for "less aggressive," use more measured, diplomatic language while maintaining legal accuracy
- Preserve all factual information while adjusting tone
- Keep California statutory citations accurate and relevant

SECTION CONTEXT:
Section Title: ${sectionTitle}
Section ID: ${sectionId}

CASE DESCRIPTION (Source of Truth - ONLY use facts from here):
${caseDescResult.anonymizedText}

CURRENT SECTION CONTENT:
${contentResult.anonymizedText}

RESPONSE FORMAT:
- If the user asks a question, answer it concisely
- If the user asks for an edit, provide the COMPLETE revised section content
- When providing revised content, start with "Here is the revised content:" followed by the full text
- Keep responses professional and helpful
- If you need clarification, ask specific questions

You are in an interactive editing session. The user will tell you how they want the section edited. 
Respond with helpful suggestions or provide the revised content directly.`;

    // Build messages array with conversation history
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (already anonymized client-side or we anonymize here)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: ChatMessage) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: messageResult.anonymizedText
    });

    const headers = getOpenAIHeaders();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { message: `OpenAI API error: ${response.status}` } };
      }
      return NextResponse.json(
        { error: errorData.error?.message || 'AI service error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    let assistantMessage = data.choices[0]?.message?.content?.trim() || '';

    // Re-identify the response
    assistantMessage = reidentifyData(assistantMessage, combinedMapping, combinedContextual);

    // Check if the response contains a complete revised section
    const hasRevisedContent = detectRevisedContent(assistantMessage);

    return NextResponse.json({ 
      message: assistantMessage,
      hasRevisedContent,
      // If it's a complete revision, extract the content
      revisedContent: hasRevisedContent ? extractRevisedContent(assistantMessage) : null
    });

  } catch (error) {
    console.error('AI Edit Section error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

function detectRevisedContent(message: string): boolean {
  const revisionIndicators = [
    /here is the revised/i,
    /here's the revised/i,
    /revised content/i,
    /updated section/i,
    /here is the updated/i,
    /here's the updated/i,
    /modified version/i,
    /edited version/i,
    /revised version/i,
    // Add patterns for defense suggestions
    /here are (?:some |the )?(?:additional |suggested |recommended )?(?:affirmative )?defenses/i,
    /additional defenses/i,
    /suggested defenses/i,
    /following defenses/i,
    /these defenses/i,
    /consider (?:adding |the following)/i,
    /recommend (?:adding |the following)/i,
    /\*\*[^*]+\*\*\s*:/,  // Matches **Title**: pattern (bullet-point format)
    /^-\s*\*\*/m,  // Matches "- **" at start of line
  ];
  
  return revisionIndicators.some(pattern => pattern.test(message));
}

function extractRevisedContent(message: string): string | null {
  // List of common prefixes the AI uses before providing revised content
  const prefixPatterns = [
    /^here(?:'s| is) the revised (?:content|section|version)[:\s]*/i,
    /^here(?:'s| is) the updated (?:content|section|version)[:\s]*/i,
    /^here(?:'s| is) the modified (?:content|section|version)[:\s]*/i,
    /^here(?:'s| is) the edited (?:content|section|version)[:\s]*/i,
    /^revised (?:content|section|version)[:\s]*/i,
    /^updated (?:content|section|version)[:\s]*/i,
    /^here(?:'s| is) (?:a |an |the )?(?:more )?(?:aggressive|diplomatic|concise|detailed|revised|updated) version[:\s]*/i,
    /^(?:certainly|sure|of course)[!,.]?\s*here(?:'s| is)[^:]*[:\s]*/i,
    /^I've (?:revised|updated|modified|edited) the (?:content|section)[.:]?\s*/i,
    // Add patterns for defense suggestions
    /^here are (?:some |the )?(?:additional |suggested |recommended )?(?:affirmative )?defenses[:\s]*/i,
    /^(?:some |the )?(?:additional |suggested |recommended )?defenses[:\s]*(?:you could consider|to consider|include)?[:\s]*/i,
    /^(?:consider |you might consider |I recommend |I suggest )(?:adding )?(?:the following|these)[:\s]*/i,
    /^(?:certainly|sure|absolutely)[!,.]?\s*(?:here are|I can suggest)[^:]*[:\s]*/i,
  ];

  let cleaned = message.trim();
  
  // Try to remove prefix patterns
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // If the message starts with a newline after cleaning, trim it
  cleaned = cleaned.replace(/^\n+/, '').trim();
  
  // For bullet-point format, find where the bullets start
  const bulletStart = cleaned.search(/^[\-\*•]\s*\*\*/m);
  if (bulletStart > 0 && bulletStart < 200) {
    // There's some intro text before the bullets, skip it
    cleaned = cleaned.substring(bulletStart);
  }
  
  // If there's still content that looks like an intro paragraph followed by the actual content,
  // try to find where the actual legal content starts
  const legalContentIndicators = [
    /^(This firm represents|This letter|We represent|On behalf of|Dear |RE:|Re:)/im,
    /^(INTRODUCTION|FACTS|LIABILITY|DAMAGES|SETTLEMENT|DOCUMENTATION)/im,
    /^(Under California|Pursuant to|California Civil Code|California Labor Code)/im,
  ];
  
  for (const indicator of legalContentIndicators) {
    const match = cleaned.match(indicator);
    if (match && match.index !== undefined && match.index > 0 && match.index < 200) {
      // The intro is short, extract from where the legal content starts
      cleaned = cleaned.substring(match.index);
      break;
    }
  }
  
  // Remove any trailing remarks like "Let me know if you'd like..."
  const trailingPatterns = [
    /\n+(?:let me know|please let me know|feel free|if you(?:'d| would) like|would you like|do you want|shall I)[^]*$/i,
    /\n+(?:I hope this|this version|this revised|these suggestions)[^]*$/i,
  ];
  
  for (const pattern of trailingPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  cleaned = cleaned.trim();
  
  // Only return if we have substantial content
  if (cleaned.length > 50) {
    return cleaned;
  }
  
  return null;
}

