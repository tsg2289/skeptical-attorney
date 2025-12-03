import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { anonymizeDataWithMapping, reidentifyData, PIIMapping, ContextualMapping } from '@/lib/utils/anonymize';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { entryText, caseName } = await req.json();
    
    if (!entryText) {
      return NextResponse.json(
        { error: 'Missing required field: entryText' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Anonymize all user inputs with mapping for re-identification
    const entryTextResult = anonymizeDataWithMapping(entryText);
    const caseNameResult = anonymizeDataWithMapping(caseName || '');

    // Merge mappings
    const combinedMapping: PIIMapping = {};
    Object.keys(entryTextResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...entryTextResult.mapping[key]];
    });
    Object.keys(caseNameResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...caseNameResult.mapping[key]];
    });

    // Merge contextual mappings
    const combinedContextualMappings: ContextualMapping[] = [
      ...entryTextResult.contextualMappings,
      ...caseNameResult.contextualMappings
    ];

    const prompt = `Given this billing entry, provide 3 enhancement suggestions that make it more professional, detailed, and comprehensive. Return as a JSON array:

Original Entry: "${entryTextResult.anonymizedText}"

For each suggestion, provide this exact structure:
{
  "title": "Enhanced Detail" or "Professional Wording" or "Comprehensive Version",
  "description": "Brief description of improvements",
  "enhancedText": "The enhanced billing entry text",
  "suggestedHours": 0,
  "confidence": 85
}

Return ONLY a valid JSON array with 3 suggestions.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a legal billing assistant. Return ONLY valid JSON array with enhancement suggestions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    let content = response.choices[0]?.message?.content?.trim() || '';
    
    // Re-identify placeholders in the AI response
    content = reidentifyData(content, combinedMapping, combinedContextualMappings);
    
    let suggestions;
    
    try {
      // Try to parse JSON - might be wrapped in markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      suggestions = JSON.parse(jsonStr);
      
      // Re-identify placeholders in each suggestion's enhancedText
      if (Array.isArray(suggestions)) {
        suggestions = suggestions.map((suggestion: any) => {
          if (suggestion.enhancedText) {
            suggestion.enhancedText = reidentifyData(suggestion.enhancedText, combinedMapping, combinedContextualMappings);
          }
          return suggestion;
        });
      }
    } catch {
      // Fallback if JSON parsing fails
      suggestions = [{
        title: 'Enhanced Version',
        description: 'AI-enhanced billing entry',
        enhancedText: content,
        suggestedHours: 0,
        confidence: 80
      }];
    }

    return NextResponse.json({
      success: true,
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [suggestions],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in enhanceBilling:', error);
    return NextResponse.json(
      { error: 'Failed to generate enhancement suggestions', message: error.message },
      { status: 500 }
    );
  }
}


