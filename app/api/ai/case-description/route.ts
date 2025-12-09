import { NextRequest, NextResponse } from 'next/server';
import { anonymizeDataWithMapping, reidentifyData } from '@/lib/utils/anonymize';

export async function POST(request: NextRequest) {
  try {
    const { currentContent } = await request.json();

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

    const contentResult = anonymizeDataWithMapping(currentContent || '');

    const prompt = `You are a legal assistant helping to organize case information for a demand letter.

Current Case Description:
${contentResult.anonymizedText || '[Empty - user is starting fresh]'}

Please help improve and expand this case description. The description should include:
- Client name and basic information
- Date and location of the incident
- Insured party name (if known)
- Brief summary of what happened
- Key facts relevant to the case

Generate an improved, well-organized case description that captures all essential information needed for drafting a demand letter. Be concise but comprehensive.`;

    const headers = getOpenAIHeaders();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional legal assistant helping attorneys organize case information. Always maintain a formal, professional tone.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, create error object
        const statusText = response.statusText || 'Unknown error';
        errorData = {
          error: {
            message: `OpenAI API returned ${response.status}: ${statusText}`,
            code: response.status
          }
        };
      }
      
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      // Extract more detailed error message
      const errorMessage = errorData.error?.message || 
                           errorData.error?.code || 
                           errorData.error || 
                           `OpenAI API error: ${response.status} ${response.statusText}`;
      
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    let generatedText = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    // Re-identify placeholders in the AI response
    generatedText = reidentifyData(generatedText, contentResult.mapping, contentResult.contextualMappings);

    return NextResponse.json({ content: generatedText });
  } catch (error) {
    console.error('AI API error:', error);
    
    // Ensure we always return JSON, even on unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: `An error occurred while generating content: ${errorMessage}` },
      { status: 500 }
    );
  }
}





