import { NextRequest, NextResponse } from 'next/server';
import { anonymizeData } from '@/lib/utils/anonymize';

export async function POST(request: NextRequest) {
  try {
    const { sectionId, sectionTitle, currentContent, allSections } = await request.json();

    // Only allow AI for Introduction section (id: '1')
    if (sectionId !== '1') {
      return NextResponse.json(
        { error: 'AI assist is only available for the Introduction section' },
        { status: 403 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Anonymize all content before sending to AI
    const anonymizedSections = allSections.map((section: { id: string; title: string; content: string }) => ({
      id: section.id,
      title: section.title,
      content: anonymizeData(section.content)
    }));

    // Extract key information from sections
    const caseDescriptionSection = anonymizedSections.find((s: { title: string; id?: string }) => 
      s.title.toUpperCase().includes('CASE DESCRIPTION') || s.id === '0'
    );
    const factsSection = anonymizedSections.find((s: { title: string }) => 
      s.title.toUpperCase().includes('FACTS')
    );
    const liabilitySection = anonymizedSections.find((s: { title: string }) => 
      s.title.toUpperCase().includes('LIABILITY')
    );

    // Build context-aware prompt for Introduction section
    const prompt = `You are a legal assistant helping to write a professional demand letter introduction. 

The introduction must follow this EXACT format:
"This firm represents [Client Name] for injuries sustained in a collision on [Date] in [City, CA]. Based on the evidence—including police reports, photographs, witness statements, and property damage assessments—your insured, [Insured Name], is 100% liable for causing this collision."

CASE DESCRIPTION (Primary Context):
${caseDescriptionSection?.content || '[No case description provided]'}

Additional Context from other sections:

FACTS Section:
${factsSection?.content || '[No facts section found]'}

LIABILITY Section:
${liabilitySection?.content || '[No liability section found]'}

Other sections:
${anonymizedSections
  .filter((s: { title: string; id?: string }) => 
    !s.title.toUpperCase().includes('INTRODUCTION') && 
    !s.title.toUpperCase().includes('CASE DESCRIPTION') &&
    !s.title.toUpperCase().includes('FACTS') && 
    !s.title.toUpperCase().includes('LIABILITY') &&
    s.id !== '0'
  )
  .map((s: { title: string; content: string }) => `- ${s.title}: ${s.content.substring(0, 300)}...`)
  .join('\n')}

Current Introduction (if any):
${currentContent || '[Empty]'}

Instructions:
1. Extract the following information from the sections above, prioritizing the Case Description section:
   - Client Name (extract from Case Description first, then other sections, otherwise use "[Client Name]")
   - Date of collision (extract from Case Description first, then FACTS section or other sections)
   - City and State (extract from Case Description first, then FACTS section, default to "[City, CA]" if not found)
   - Insured Name (extract from Case Description first, then LIABILITY section or other sections, otherwise use "[Insured Name]")

2. Generate an introduction following the EXACT format provided above, filling in the bracketed placeholders with information extracted from the sections.

3. If specific information is not available in the sections, keep the placeholder brackets [like this] so the attorney can fill them in manually.

4. The introduction should be professional, concise, and match the exact structure provided.

5. Only output the introduction text - no additional commentary or explanations.

Generate the introduction now:`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are a professional legal writing assistant specializing in demand letters. You extract information from legal documents and format it precisely according to provided templates. Always maintain a formal, professional tone and follow exact formatting instructions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual output
        max_tokens: 150,
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
    const generatedText = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

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




