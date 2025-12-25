import { NextRequest, NextResponse } from 'next/server';
import { anonymizeDataWithMapping, reidentifyData } from '@/lib/utils/anonymize';

function extractJsonObject(text: string) {
  // Try to find JSON object in the response
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in response');
  }
  const jsonString = match[0];
  return JSON.parse(jsonString);
}

export async function POST(request: NextRequest) {
  try {
    const { caseDescription, allSections, partyInfo } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Anonymize PII before sending to OpenAI, but keep mapping for re-identification
    const { anonymizedText: anonymizedDescription, mapping, contextualMappings } = 
      anonymizeDataWithMapping(caseDescription || '');
    
    // If explicit party info is provided (trial mode), add them to the mapping
    let explicitPlaintiff = '';
    let explicitDefendant = '';
    
    if (partyInfo && partyInfo.clientName) {
      if (partyInfo.representationType === 'plaintiff') {
        explicitPlaintiff = partyInfo.clientName;
        explicitDefendant = partyInfo.opposingPartyName || '';
      } else {
        explicitDefendant = partyInfo.clientName;
        explicitPlaintiff = partyInfo.opposingPartyName || '';
      }
    }

const partyInfoSection = partyInfo && partyInfo.clientName ? `
EXPLICIT PARTY INFORMATION (Use these exact names):
- Your Client (${partyInfo.representationType}): ${partyInfo.clientName}
- Opposing Party: ${partyInfo.opposingPartyName || '[Not specified]'}
- In the output, replace [PLAINTIFF] with "${explicitPlaintiff || '[PLAINTIFF]'}" and [DEFENDANT] with "${explicitDefendant || '[DEFENDANT]'}"
` : '';

    const prompt = `You are a legal assistant helping to create a comprehensive case status report. Analyze the following case description and generate content for each status report section.

${partyInfoSection}

CASE DESCRIPTION:
${anonymizedDescription}

=== STATUS REPORT SECTIONS TO GENERATE ===

Generate content for each of the following sections. Return a JSON object with section IDs as keys and the generated content as string values.

{
  "1": "FACTUAL BACKGROUND content here",
  "2": "PROCEDURAL STATUS content here",
  "3": "PLEADINGS content here",
  "4": "COMMUNICATIONS content here",
  "5": "DISCOVERY content here",
  "6": "LIABILITY content here",
  "7": "DAMAGES content here",
  "8": "STRATEGY MOVING FORWARD content here",
  "9": "FURTHER HANDLING content here"
}

=== SECTION REQUIREMENTS ===

### 1. FACTUAL BACKGROUND ###
Provide a comprehensive summary of the key facts:
- Date and location of incident/dispute
- Parties involved and their roles
- What occurred and how the claim arose
- Key documents and evidence
- Timeline of events

### 2. PROCEDURAL STATUS ###
Summarize the current procedural posture:
- Case filing date and court
- Assigned department and judge
- Case management conference dates
- Trial date (if set)
- Current phase of litigation
- Key upcoming deadlines

### 3. PLEADINGS ###
List all pleadings filed:
- Complaint/Petition (date, causes of action)
- Answer (date, affirmative defenses)
- Cross-complaints or counterclaims
- Amendments to pleadings
- Any dismissed claims

### 4. COMMUNICATIONS ###
Summarize significant communications:
- Correspondence with opposing counsel
- Meet and confer efforts
- Court communications
- Key client communications
- Settlement discussions (general status only)

### 5. DISCOVERY ###
Detail the discovery status:
- Written discovery propounded (interrogatories, RFPs, RFAs)
- Written discovery received
- Depositions taken
- Depositions scheduled
- Outstanding discovery
- Discovery disputes and motions

### 6. LIABILITY ###
Analyze liability:
- Strengths of the case
- Weaknesses and defenses
- Comparative fault analysis (if applicable)
- Key liability issues
- Likelihood of prevailing
- Cite applicable California law where relevant

### 7. DAMAGES ###
Detail the damages assessment:
- Economic damages (medical expenses, lost wages, property damage)
- Non-economic damages (pain and suffering, emotional distress)
- Special damages
- Total damages assessment
- Settlement value range (low, mid, high)

### 8. STRATEGY MOVING FORWARD ###
Outline recommended strategy:
- Discovery to be completed
- Motions to be filed
- Expert witnesses needed
- Settlement strategy
- Trial preparation steps

### 9. FURTHER HANDLING ###
Specify next steps and action items:
- Immediate tasks (next 30 days)
- Medium-term goals (30-90 days)
- Long-term objectives
- Client meetings needed
- Key deadlines to monitor

=== CRITICAL REQUIREMENTS ===

1. ONLY use facts explicitly stated in the case description
2. Do NOT invent or assume dates, names, amounts, or details not provided
3. Use [PLACEHOLDER] brackets for any missing critical information
4. If information is unclear, state "Based on available information..." rather than fabricating
5. Use professional legal report language
6. Be specific and actionable in recommendations
7. Use ONLY these placeholders for party names:
   - [PLAINTIFF] for the plaintiff/claimant
   - [DEFENDANT] for the defendant/respondent
8. ALL section values MUST be strings (not objects or arrays)

Generate the JSON response now. Only return valid JSON, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional legal writing assistant specializing in California civil litigation status reports. You analyze case descriptions and generate structured status report content with appropriate legal analysis. CRITICAL: Only use facts explicitly provided - never fabricate details. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { message: `OpenAI API error: ${response.status}` } };
      }
      
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'AI service error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No content returned from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let sectionsData;
    try {
      sectionsData = extractJsonObject(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Re-identify PII in each section
    const reidentifiedSections: Record<string, string> = {};
    
    for (const [sectionId, sectionContent] of Object.entries(sectionsData)) {
      if (typeof sectionContent === 'string') {
        let reidentified = reidentifyData(sectionContent, mapping, contextualMappings);
        
        // Replace placeholders with explicit party names if provided
        if (explicitPlaintiff) {
          reidentified = reidentified.replace(/\[PLAINTIFF\]/g, explicitPlaintiff);
        }
        if (explicitDefendant) {
          reidentified = reidentified.replace(/\[DEFENDANT\]/g, explicitDefendant);
        }
        
        reidentifiedSections[sectionId] = reidentified;
      }
    }

    return NextResponse.json({ sections: reidentifiedSections });

  } catch (error) {
    console.error('Status Report AI error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the status report' },
      { status: 500 }
    );
  }
}

