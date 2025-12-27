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

// Interface for document content passed to AI
interface DocumentForAI {
  fileName: string
  category: string
  extractedText: string
}

export async function POST(request: NextRequest) {
  try {
    const { caseDescription, allSections, partyInfo, caseData, documents } = await request.json();

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
    
    // Anonymize document content as well
    const anonymizedDocuments: DocumentForAI[] = [];
    if (documents && Array.isArray(documents)) {
      for (const doc of documents as DocumentForAI[]) {
        if (doc.extractedText) {
          const { anonymizedText } = anonymizeDataWithMapping(doc.extractedText);
          anonymizedDocuments.push({
            fileName: doc.fileName,
            category: doc.category,
            extractedText: anonymizedText
          });
        }
      }
    }
    
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

// Build case data section for procedural status
const caseDataSection = caseData ? `
=== CASE DATABASE FIELDS (Use these exact values - NEVER use placeholders for these) ===
${caseData.caseName ? `Case Name: ${caseData.caseName}` : ''}
${caseData.caseNumber ? `Case Number: ${caseData.caseNumber}` : ''}
${caseData.court ? `Court: ${caseData.court}` : ''}
${caseData.courtCounty ? `County: ${caseData.courtCounty}` : ''}
${caseData.judgeName ? `Judge: ${caseData.judgeName}` : ''}
${caseData.departmentNumber ? `Department: ${caseData.departmentNumber}` : ''}
${caseData.trialDate ? `Trial Date: ${caseData.trialDate}` : 'Trial Date: Not set'}
${caseData.mscDate ? `Mandatory Settlement Conference Date: ${caseData.mscDate}` : ''}
${caseData.complaintFiledDate ? `Complaint Filed Date: ${caseData.complaintFiledDate}` : ''}
${caseData.plaintiffs && caseData.plaintiffs.length > 0 ? `
PLAINTIFFS (Use these exact names in the report):
${caseData.plaintiffs.map((p: any, i: number) => `  ${i + 1}. ${p.name}${p.type ? ` (${p.type})` : ''}`).join('\n')}` : ''}
${caseData.defendants && caseData.defendants.length > 0 ? `
DEFENDANTS (Use these exact names in the report):
${caseData.defendants.map((d: any, i: number) => `  ${i + 1}. ${d.name}${d.type ? ` (${d.type})` : ''}`).join('\n')}` : ''}

CRITICAL: 
- Use the above party names EXACTLY as written - do NOT use placeholders like [PLAINTIFF] or [DEFENDANT] when names are provided above
- Use the Court, County, Trial Date, and other fields EXACTLY as provided - do NOT use placeholders when actual data is available
` : '';

    const prompt = `You are a legal assistant helping to create a comprehensive case status report. Analyze the following case description and generate content for each status report section.

${partyInfoSection}
${caseDataSection}

CASE DESCRIPTION:
${anonymizedDescription}
${anonymizedDocuments.length > 0 ? `

=== SUPPORTING DOCUMENTS (From this case only) ===
The following documents have been provided to support the case. Extract relevant facts, dates, amounts, medical information, and procedural details from these documents.

${anonymizedDocuments.map((doc, index) => `
--- Document ${index + 1}: ${doc.category.replace(/_/g, ' ').toUpperCase()} - ${doc.fileName} ---
${doc.extractedText}
`).join('\n')}

CRITICAL: 
- Use facts from these documents to populate the status report sections
- Reference specific documents when citing facts (e.g., "Per the medical records from Dr. Smith...")
- Extract medical treatment details, dates, costs from medical records
- Extract incident details from police/incident reports
- Use billing documents to calculate damages
- For PLEADINGS section: Look for Complaint documents to extract causes of action and allegations
- For PLEADINGS section: Look for Answer documents to extract affirmative defenses and defense posture
- For PROCEDURAL STATUS: Extract venue/court information from pleading captions
` : ''}

=== STATUS REPORT SECTIONS TO GENERATE ===

Generate content for ALL 9 sections. Return a JSON object with section IDs as STRING keys and the generated content as string values.

REQUIRED FORMAT - ALL 9 SECTIONS MUST BE INCLUDED:
{
  "1": "FACTUAL BACKGROUND - full content as a string",
  "2": "PROCEDURAL STATUS - as a flowing paragraph (NO capitalized headers like VENUE:, TRIAL:, etc.)",
  "3": "PLEADINGS - full content as a string",
  "4": "COMMUNICATIONS - full content as a string",
  "5": "DISCOVERY - full content as a string",
  "6": "LIABILITY - full content as a string",
  "7": "DAMAGES - full content as a string",
  "8": "STRATEGY MOVING FORWARD - full content as a string",
  "9": "FURTHER HANDLING - full content as a string"
}

=== SECTION REQUIREMENTS ===

### 1. FACTUAL BACKGROUND ###
Write this section as a competent California attorney drafting a formal status report TO A CLIENT. The client may be an insurance company, corporate risk manager, or in-house counsel. The tone should be:
- Professional but accessible
- Clear and well-organized
- Written as if explaining the case to someone who needs to understand the facts

FORMAT: Write a narrative factual summary that flows naturally, organized chronologically. DO NOT use bullet points for the main narrative.

PARTY NAMES: If plaintiff and defendant names are provided in the CASE DATABASE FIELDS above, use those EXACT names throughout this section. Do NOT use placeholders like [PLAINTIFF] or [DEFENDANT] when actual names are available.

For example, if the database shows "Plaintiffs: John Smith" and "Defendants: ABC Corporation", write:
"On January 15, 2024, John Smith was lawfully present as a business invitee at the premises owned and operated by ABC Corporation located at 123 Main Street, Los Angeles, California..."

NOT: "On January 15, 2024, [PLAINTIFF] was lawfully present at the premises of [DEFENDANT]..."

STRUCTURE:
1. Opening sentence: "This matter stems from..." or "This matter arises out of..."
2. Date and location of incident
3. Description of what occurred (using actual party names)
4. Plaintiff's claimed injuries
5. Damages sought
6. Our client's position/involvement

Include:
- Complete statement of case facts including date and address of incident
- Clear identification of all parties by their actual names
- Plaintiff's specific allegations
- Injuries claimed
- Damages alleged
- Timeline of key events
- Context about the premises/situation if relevant

CRITICAL: 
- Use ACTUAL party names from the CASE DATABASE FIELDS - never use placeholders when names are provided
- Only use facts explicitly provided in the case description - do not fabricate or assume details
- Keep data strictly separated between cases
- If a specific detail is not provided, you may omit it rather than using a placeholder

### 2. PROCEDURAL STATUS ###
Write this section as a competent attorney drafting a FLOWING, WELL-WRITTEN PARAGRAPH for the client. 

DO NOT use capitalized headers or subsection labels like "VENUE:", "TRIAL:", "MEDIATION:", etc.
Instead, write a cohesive narrative paragraph that naturally incorporates all procedural information.

DATA SOURCES (in order of priority):
1. CASE DATABASE FIELDS - Use these exact values first
2. SUPPORTING DOCUMENTS - If pleadings are uploaded (complaint, answer, etc.), extract venue/court information from them
3. CASE DESCRIPTION - Use details mentioned in the case summary

The paragraph should naturally flow and cover:
- Where the case was filed (court and county) and whether venue appears proper
- Complaint filing date if available
- Trial date status (whether set or not yet scheduled)
- Judge and department if assigned
- Mandatory settlement conference or mediation status
- Settlement demand/negotiation status

EXAMPLE OF CORRECT FORMAT:
"Plaintiff's Summons and Complaint was filed in the Superior Court of California, County of Los Angeles. Venue appears proper as the incident occurred within this jurisdiction. The Complaint was filed on March 15, 2024. Trial has been set for January 10, 2025 in Department 5 before the Honorable Judge Smith, with a Mandatory Settlement Conference scheduled for December 1, 2024. We have reached out to opposing counsel to discuss settlement and have requested a demand."

EXAMPLE OF ANOTHER CORRECT FORMAT (when less info available):
"This matter is pending in the Superior Court of California, County of Orange. Venue is proper as the incident occurred within Orange County. No trial date has been set at this time, and neither mediation nor a mandatory settlement conference has been scheduled. We will keep you apprised of any developments. We have initiated settlement discussions with opposing counsel."

DO NOT FORMAT LIKE THIS (WRONG - uses headers):
"VENUE: This matter is filed in... TRIAL: No trial date... MEDIATION: At this time..."

CRITICAL: 
- Write as ONE or TWO flowing paragraphs - NO capitalized section headers
- Use EXACT values from CASE DATABASE FIELDS when available
- If a complaint or other pleading is in the SUPPORTING DOCUMENTS, extract court/venue info from it
- Omit information that is not available rather than stating it's missing

### 3. PLEADINGS ###
Structure this section with the following subsections:

PLAINTIFF'S COMPLAINT

"Plaintiff [Plaintiff Name] has filed this complaint against [Defendant Names] and Does 1-100 for [list all causes of action]."

For EACH cause of action, create a subsection:

[CAUSE OF ACTION NAME] (e.g., "Premises Liability", "General Negligence", etc.)
- State the specific allegations from the complaint
- List the CACI jury instruction elements for this cause of action
- Describe how the plaintiff alleges the facts satisfy each element
- Note any claims for punitive damages, willful/malicious conduct, etc.

Example format:
"Plaintiff, while a business invitee at the premises of defendants at [Address], alleges [describe the incident and how it occurred]. At the time and place, defendants were allegedly negligent in [describe the alleged negligence]. As a direct and legal cause of the negligent conduct, plaintiff allegedly sustained injuries and damages."

---

DEFENDANT'S ANSWER

Write this subsection from DEFENSE COUNSEL'S PERSPECTIVE as a strategic narrative to the client. This is NOT just copying the Answer document - it's explaining the defense posture.

FIRST: Check the SUPPORTING DOCUMENTS for any document with "Answer" in the filename. If found, extract:
- Affirmative defenses raised
- Any denials or admissions
- Cross-complaint allegations if included

THEN write a narrative covering:

1. SERVICE STATUS: "We confirm that our client has been served." (or status of service)

2. ANSWER STATUS: Has an Answer been filed?
   - If YES: When was it filed? What affirmative defenses were raised? Summarize key denials.
   - If NO: Explain why (investigating cross-claims, negotiating settlement, gathering information)

3. DEFENSE STRATEGY (from information available):
   - Cross-Complaint plans: Are we investigating indemnity/contribution claims against third parties? Who?
   - Liability theories: What defenses do we have? Is there potential third-party fault?
   - Demurrer or Motion to Strike plans

4. INVESTIGATION STATUS:
   - What factual investigation is needed?
   - Who do we need to interview?
   - Site inspections needed?

5. NEXT STEPS: "We will keep you apprised."

EXAMPLE FORMAT:
"We confirm that our client has been served. We have filed an Answer on behalf of our client raising affirmative defenses including comparative fault, assumption of risk, and failure to mitigate damages. We are also investigating a potential cross-complaint for indemnity and contribution against [Third Party] based on information suggesting they may share liability. Our investigation is ongoing - we need to interview witnesses who were present at the time of the incident and conduct a site inspection. We will keep you apprised of developments."

ALTERNATIVE EXAMPLE (if no Answer filed yet):
"We confirm that our client has been served. We have not yet filed an answer on behalf of our client as we are investigating a potential cross-complaint for indemnity and contribution against [Third Party], as well as negotiating with Plaintiff to potentially resolve this matter before filing a responsive pleading. Based on our preliminary investigation, [explain defense theory or liability concerns]. Additional follow-up is needed, including [specific investigation needs]. We will keep you apprised."

CRITICAL: Extract actual information from uploaded Answer documents. Write in narrative form from defense counsel's perspective.

---

OTHER PLEADINGS (if applicable)
- Cross-complaints filed
- Amendments to pleadings
- Dismissed claims
- Doe amendments

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
THIS IS THE MOST DETAILED AND ANALYTICAL SECTION OF THE STATUS REPORT. Write as a competent California litigation attorney providing substantive legal analysis to a client.

FORMAT: Use the CAUSE OF ACTION NAME as a header, then write WELL-CRAFTED NARRATIVE PARAGRAPHS analyzing that cause of action. DO NOT use bullet points or structured lists - write flowing attorney prose.

For EACH cause of action, create a subsection:

[CAUSE OF ACTION NAME]
(e.g., "Negligence", "Premises Liability", "Breach of Contract", "Trade Secret Misappropriation")

Under each header, write 2-4 paragraphs that:
1. State the legal elements required under California law
2. Apply the specific case facts to each element naturally within the narrative
3. Analyze strengths and weaknesses
4. Assess the likelihood of plaintiff prevailing on this cause of action

EXAMPLE FORMAT:

Negligence

To establish negligence under California law, a plaintiff must prove that the defendant owed a duty of care, breached that duty, and that the breach was a proximate cause of plaintiff's damages. Here, [Defendant] owed [Plaintiff] a duty of care as [explain relationship - e.g., "a property owner owes business invitees a duty to maintain the premises in a reasonably safe condition"].

With respect to breach, plaintiff alleges that [Defendant] failed to [describe alleged breach]. The evidence suggests [apply facts - what supports or undermines breach]. This element appears [strong/weak/disputed] because [explain reasoning with specific facts].

Regarding causation, plaintiff must establish that [Defendant's] alleged negligence was a substantial factor in causing [Plaintiff's] injuries. [Apply facts to causation analysis]. The defense may argue [potential causation defenses].

Overall, plaintiff's negligence claim presents [moderate/strong/weak] exposure. The primary strengths are [specific strengths]. The primary weaknesses and available defenses include [specific defenses]. We assess the likelihood of plaintiff prevailing on this cause of action as [Strong/Moderate/Weak].

---

[REPEAT FOR EACH CAUSE OF ACTION - each with its own header and narrative paragraphs]

---

After all individual causes of action, include:

Comparative Fault Analysis
[Write a paragraph analyzing potential comparative fault allocation among the parties and its impact on recovery]

Overall Liability Assessment
[Write a concluding paragraph summarizing overall liability exposure, which causes of action present the greatest risk, and strategic recommendations]

CRITICAL INSTRUCTIONS:
- Write in NARRATIVE PARAGRAPH form - no bullet points
- Use cause of action names as HEADERS
- Apply specific case facts to each legal element
- Be candid about both strengths and weaknesses
- This is the most substantive section - provide thorough analysis
- Write as an attorney would in a formal status report to a client

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

1. ONLY use facts explicitly stated in the case description and supporting documents
2. Do NOT invent or assume dates, names, amounts, or details not provided
3. USE ACTUAL PARTY NAMES from the CASE DATABASE FIELDS when available - do NOT use placeholders like [PLAINTIFF] or [DEFENDANT] when real names are provided
4. If information is unclear, state "Based on available information..." rather than fabricating
5. Use professional legal report language written for a client audience
6. Be specific and actionable in recommendations
7. PARTY NAME RULES:
   - If Plaintiffs are listed in CASE DATABASE FIELDS, use those exact names (e.g., "John Smith" not "[PLAINTIFF]")
   - If Defendants are listed in CASE DATABASE FIELDS, use those exact names (e.g., "ABC Corporation" not "[DEFENDANT]")
   - Only use [PLAINTIFF] or [DEFENDANT] placeholders if NO party names are provided in the database
8. ALL section values MUST be strings (not objects or arrays)
9. YOU MUST GENERATE ALL 9 SECTIONS (1 through 9) - DO NOT SKIP ANY SECTION
10. Section "2" (PROCEDURAL STATUS) must be a flowing paragraph WITHOUT capitalized headers - do NOT use "VENUE:", "TRIAL:", "MEDIATION:" labels
11. Extract court/venue information from uploaded complaint documents if not in database fields

Generate the JSON response now. Only return valid JSON, no additional text. Ensure ALL 9 sections are included.`;

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
            content: 'You are a competent California litigation attorney drafting a formal case status report TO A CLIENT (such as an insurance company, corporate risk manager, or in-house counsel). You MUST adhere to these critical requirements:\n\n1. NEVER hallucinate or fabricate facts - only use information explicitly provided in the case description and documents\n2. Keep all data strictly separated between cases - do not reference or infer from other cases\n3. USE ACTUAL PARTY NAMES when provided in the CASE DATABASE FIELDS - never use placeholders like [PLAINTIFF] or [DEFENDANT] when real names are available\n4. Write in professional legal report language that is accessible to the client\n5. If information is not provided, you may omit it or briefly state it is unavailable - avoid excessive placeholder usage\n6. Always return valid JSON only\n7. The report should read as if written by an experienced attorney explaining the case status to a knowledgeable client'
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
      console.log('Parsed AI response - section keys:', Object.keys(sectionsData));
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Verify all expected sections are present
    const expectedSections = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const missingSections = expectedSections.filter(id => !sectionsData[id]);
    if (missingSections.length > 0) {
      console.warn('Missing sections in AI response:', missingSections);
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


