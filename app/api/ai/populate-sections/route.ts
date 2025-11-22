import { NextRequest, NextResponse } from 'next/server';
import { anonymizeData } from '@/lib/utils/anonymize';

export async function POST(request: NextRequest) {
  try {
    const { caseDescription, allSections } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const anonymizedDescription = anonymizeData(caseDescription || '');

    const prompt = `You are a legal assistant helping to draft a demand letter. Analyze the following case description and determine the case type, then generate appropriate content for each section.

CASE DESCRIPTION:
${anonymizedDescription}

FIRST: Determine the case type from the description. Is this:
- PERSONAL INJURY (car accidents, slip and fall, product liability, etc.)
- EMPLOYMENT LAW (discrimination, harassment, wage violations, wrongful termination, retaliation, etc.)
- OTHER (specify)

Based on the case type, generate content for the following sections. Return your response as a JSON object with section IDs as keys and the generated content as values. Use the exact format shown below:

{
  "1": "Introduction content here",
  "2": "FACTS content here",
  "3": "LIABILITY content here",
  "4": "INJURIES AND MEDICAL TREATMENT content here",
  "5": "ECONOMIC DAMAGES content here",
  "6": "NON-ECONOMIC DAMAGES content here",
  "7": "SETTLEMENT DEMAND content here",
  "8": "DOCUMENTATION PROVIDED content here"
}

CRITICAL: All values MUST be strings, not objects or arrays. Even if a section has structure (like IRAC format), write it as a single formatted string with line breaks (\n). Do NOT return nested objects or arrays.

Section Requirements by Case Type:

=== PERSONAL INJURY CASES ===

1. Introduction (id: "1"): Must follow this EXACT format:
"This firm represents [Client Name] for injuries sustained in a collision on [Date] in [City, CA]. Based on the evidence—including police reports, photographs, witness statements, and property damage assessments—your insured, [Insured Name], is 100% liable for causing this collision."

2. FACTS (id: "2"): Include date, time, location, vehicle information, what the client was doing, weather conditions, traffic conditions, witnesses, police report number, point of impact, and vehicle damage.

3. LIABILITY (id: "3") - PERSONAL INJURY ONLY: Generate a comprehensive negligence-based liability analysis using IRAC (Issue, Rule, Analysis, Conclusion) format:
   
   ISSUE:
   - Identify the central legal question: Whether the insured is liable for the injuries and damages caused to the client
   - Frame the issue clearly and concisely based on the facts of the case
   
   RULE:
   - State the applicable legal standard: California Civil Code §1714 establishes that everyone is responsible for injuries caused by their lack of ordinary care
   - Cite relevant California Vehicle Code sections that establish the duty of care (e.g., §21453 for red signals, §21801 for yielding, §21703 for following distance)
   - Explain the elements of negligence: (1) duty of care, (2) breach of duty, (3) causation, (4) damages
   - Reference California's comparative fault principles
   - Explain that the insured is responsible for injuries caused by lack of ordinary care
   
   ANALYSIS:
   Apply the law to the specific facts of the case:
   
   a) DUTY OF CARE:
   - Explain that the insured, as a driver on California roadways, owed a duty to operate their vehicle safely and in accordance with traffic laws
   - Reference the general duty of care under California law
   - Analyze how the facts establish this duty
   
   b) BREACH OF DUTY:
   - Describe in detail the specific negligent act(s) committed by the insured based on the facts
   - Cite specific California Vehicle Code violations if applicable (e.g., §21453 for red signals, §21801 for yielding, §21703 for following distance)
   - Reference supporting evidence (police report, witness statements, etc.)
   - Explain how the insured's conduct fell below the standard of care
   - Analyze how the facts demonstrate the breach
   
   c) CAUSATION:
   - Explain that the insured's negligence was the direct and proximate cause of the collision
   - Establish the "but for" causation: but for the insured's negligence, the collision would not have occurred
   - Connect the negligence to the client's injuries
   - Show that the injuries were a foreseeable result of the negligence
   - Analyze how the facts establish causation
   
   d) COMPARATIVE FAULT ANALYSIS:
   - Analyze the client's conduct and establish that the client was exercising due care and operating lawfully
   - State that there is no evidence of comparative fault on the client's part
   - Explain why the insured bears full responsibility based on the facts
   - Analyze how the facts demonstrate absence of comparative fault
   
   CONCLUSION:
   - State definitively that the insured is 100% liable for all damages
   - Reference the clear evidence and absence of comparative fault
   - Conclude that the insured violated their duty of care, breached that duty through negligent conduct, and that breach directly caused the client's injuries
   - State that the insured is responsible for all resulting damages pursuant to California Civil Code §1714 and applicable negligence law
   
   Structure with clear IRAC headings (ISSUE, RULE, ANALYSIS, CONCLUSION). Within ANALYSIS, use subheadings for Duty of Care, Breach of Duty, Causation, and Comparative Fault Analysis. Use formal legal language. Do NOT include employment law concepts, FEHA, Labor Code, or workplace-related terms.

4. INJURIES AND MEDICAL TREATMENT (id: "4"): List physical injuries, medical facilities visited, diagnostic tests, treatment timeline, and ongoing limitations.

5. ECONOMIC DAMAGES (id: "5"): List medical expenses, property damage, lost wages, and other costs. Use [Amount] placeholders if specific amounts aren't provided.

6. NON-ECONOMIC DAMAGES (id: "6"): Describe pain, suffering, and emotional distress. Reference California law.

7. SETTLEMENT DEMAND (id: "7"): Include a demand amount placeholder and reference California personal injury standards.

8. DOCUMENTATION PROVIDED (id: "8"): List relevant documents (police report, medical records, photographs, etc.).

=== EMPLOYMENT LAW CASES ===

1. Introduction (id: "1"): Must follow this format:
"This firm represents [Client Name] regarding [specific employment violation - e.g., discrimination, harassment, wrongful termination, wage violations, retaliation, etc.] that occurred during [Client Name]'s employment with [Employer Name]. Based on the evidence—including employment records, witness statements, and documentation—[Employer Name] is liable for violating [specific laws - e.g., California Fair Employment and Housing Act (FEHA), California Labor Code, etc.]."

2. FACTS (id: "2"): Include:
- Employment dates and position
- Detailed description of the employment violation(s)
- Dates and locations of incidents
- Names of individuals involved (supervisors, HR, etc.)
- Specific discriminatory/harassing conduct or policy violations
- Complaints made and responses received
- Timeline of events leading to termination/adverse action (if applicable)
- Witnesses to incidents

3. LIABILITY (id: "3") - EMPLOYMENT LAW ONLY: Generate a comprehensive employment law liability analysis using IRAC (Issue, Rule, Analysis, Conclusion) format:
   
   ISSUE:
   - Identify the central legal question: Whether the employer is liable for violating employment laws and causing damages to the client
   - Frame the specific issue(s): discrimination, harassment, retaliation, wage violations, wrongful termination, etc.
   - State the issue clearly and concisely based on the facts of the case
   
   RULE:
   - State the applicable legal standards:
     * California Fair Employment and Housing Act (FEHA) - Government Code §12900 et seq.
     * California Labor Code sections (for wage violations: §510, §1194, §226, §226.7, etc.)
     * Title VII of the Civil Rights Act (if applicable)
     * Other relevant federal or state employment statutes
   - Explain the elements required to establish liability for each type of violation
   - Reference legal standards for discrimination, harassment, retaliation, and wage violations
   - Explain what constitutes a violation under each applicable statute
   
   ANALYSIS:
   Apply the law to the specific facts of the case:
   
   a) DISCRIMINATION ANALYSIS (if applicable):
   - Identify the protected characteristic (race, gender, age, disability, religion, etc.) based on the facts
   - Describe the adverse employment action (termination, demotion, failure to promote, etc.) based on the facts
   - Establish the causal connection between protected characteristic and adverse action
   - Explain how the employer's conduct violated FEHA Government Code §12940(a)
   - Analyze whether the employer can establish a legitimate, non-discriminatory reason
   - Apply the facts to demonstrate discrimination
   
   b) HARASSMENT ANALYSIS (if applicable):
   - Describe the harassing conduct in detail based on the facts
   - Establish that conduct was based on protected characteristic
   - Explain that conduct was severe and/or pervasive
   - Establish that conduct was unwelcome
   - Show employer knew or should have known of harassment
   - Explain employer's failure to take immediate corrective action
   - Cite FEHA Government Code §12940(j)
   - Apply the facts to demonstrate harassment
   
   c) RETALIATION ANALYSIS (if applicable):
   - Identify the protected activity (complaint, report, participation in investigation, etc.) based on the facts
   - Describe the adverse action taken in response
   - Establish causal connection between protected activity and adverse action
   - Analyze temporal proximity and other evidence of retaliation
   - Cite FEHA Government Code §12940(h)
   - Apply the facts to demonstrate retaliation
   
   d) WAGE VIOLATION ANALYSIS (if applicable):
   - Identify specific Labor Code sections violated:
     * §510 - Overtime requirements
     * §1194 - Minimum wage
     * §226 - Wage statement requirements
     * §226.7 - Meal and rest breaks
     * Other applicable sections
   - Describe how employer violated each section based on the facts
   - Calculate or estimate amounts owed
   - Explain the employer's failure to comply with wage and hour laws
   - Apply the facts to demonstrate wage violations
   
   e) WRONGFUL TERMINATION ANALYSIS (if applicable):
   - Explain breach of employment contract (if applicable)
   - Describe violation of public policy
   - Explain breach of implied covenant of good faith and fair dealing
   - Apply the facts to demonstrate wrongful termination
   
   f) EMPLOYER LIABILITY THEORIES:
   - Direct liability for employer's own conduct
   - Vicarious liability for supervisors' and agents' conduct
   - Failure to prevent discrimination/harassment
   - Failure to take corrective action
   - Apply the facts to establish employer liability
   
   g) CAUSATION:
   - Explain how employer's violations directly caused client's damages
   - Establish "but for" causation: but for the violations, damages would not have occurred
   - Connect violations to specific damages (lost wages, emotional distress, etc.)
   - Apply the facts to demonstrate causation
   
   h) AVAILABLE REMEDIES:
   - Compensatory damages (economic and non-economic)
   - Punitive damages (if malicious, oppressive, or fraudulent conduct)
   - Attorneys' fees and costs
   - Injunctive relief (policy changes, training, etc.)
   - Back pay and front pay
   - Reinstatement (if applicable)
   
   CONCLUSION:
   - State definitively that employer is liable for all violations
   - Reference applicable statutes and legal standards
   - Conclude that the employer violated applicable employment laws, that these violations caused the client's damages, and that the employer is responsible for all resulting damages
   - Reference available remedies (compensatory damages, punitive damages if applicable, attorneys' fees, etc.)
   - Summarize how the facts and law support the conclusion
   
   Structure with clear IRAC headings (ISSUE, RULE, ANALYSIS, CONCLUSION). Within ANALYSIS, use subheadings for each applicable violation type. Use formal legal language. Do NOT include personal injury concepts, vehicle accidents, Civil Code §1714, or traffic-related terms.

4. INJURIES AND MEDICAL TREATMENT (id: "4"): For employment cases, this should cover:
- Emotional distress and psychological harm
- Physical manifestations of stress (if any)
- Mental health treatment received (therapy, counseling, medication)
- Impact on daily life and relationships
- If workplace injury: physical injuries, medical treatment, workers' compensation claims

5. ECONOMIC DAMAGES (id: "5"): Include:
- Lost wages (past and future)
- Lost benefits (health insurance, retirement contributions, etc.)
- Unpaid wages/overtime (if wage violation)
- Out-of-pocket expenses (therapy, job search costs, etc.)
- Use [Amount] placeholders if specific amounts aren't provided

6. NON-ECONOMIC DAMAGES (id: "6"): Describe:
- Emotional distress, humiliation, and mental anguish
- Loss of enjoyment of life
- Damage to professional reputation
- Reference California employment law standards
- If applicable, mention potential for punitive damages

7. SETTLEMENT DEMAND (id: "7"): Include:
- Demand amount placeholder
- Reference to California employment law standards
- Mention potential for punitive damages if applicable
- Request for policy changes or training (if relevant)

8. DOCUMENTATION PROVIDED (id: "8"): List relevant documents:
- Employment records, pay stubs, performance reviews
- Emails, text messages, written complaints
- Medical/mental health records
- Witness statements
- EEOC/DFEH complaints (if filed)

=== ADAPTIVE GENERATION ===

- Analyze the case description carefully to determine the case type
- Generate sections that match the case type
- If the case description contains elements of both types, prioritize based on the primary claim
- Use appropriate legal terminology and references for each case type
- Maintain professional, formal tone throughout
- Fill in placeholders with information from the case description
- Keep placeholders [like this] for information not available

=== CRITICAL: CASE TYPE DIFFERENTIATION ===

- PERSONAL INJURY LIABILITY sections MUST focus on:
  * Negligence, duty of care, breach, causation
  * Vehicle accidents, traffic violations
  * California Civil Code §1714
  * California Vehicle Code sections
  * Comparative fault analysis
  * NO employment law terms (FEHA, Labor Code, discrimination, harassment, etc.)

- EMPLOYMENT LAW LIABILITY sections MUST focus on:
  * Employment law violations (FEHA, Labor Code, Title VII)
  * Discrimination, harassment, retaliation, wage violations
  * Employer liability theories
  * Protected classes and adverse actions
  * Workplace conduct and policies
  * NO personal injury terms (vehicles, accidents, Civil Code §1714, negligence in traffic context, etc.)

- Ensure the LIABILITY section language, legal citations, and analysis match the detected case type exactly
- Do not mix concepts from different case types
- The LIABILITY section is the most critical section for differentiation - be extremely careful to match the case type

=== CRITICAL REQUIREMENTS ===

- You MUST generate content for ALL sections (1 through 8) in the JSON response
- Do NOT skip any sections
- Each section must have substantial content
- The LIABILITY section (id: "3") is especially important and must be fully generated with complete IRAC format
- If you run out of tokens, prioritize completing all sections with shorter but complete content rather than detailed content for fewer sections

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
            content: 'You are a professional legal writing assistant. You analyze case descriptions and generate structured content for demand letters. Always return valid JSON only, no additional commentary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 6000,  // Increased from 2000 to handle all sections including detailed IRAC LIABILITY
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
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

    // Parse the JSON response
    let sectionsContent;
    try {
      sectionsContent = JSON.parse(generatedText);
      
      // Log which sections were generated for debugging
      console.log('Generated sections:', Object.keys(sectionsContent));
      console.log('Has LIABILITY section (3):', '3' in sectionsContent);
      
      // Normalize all section values to strings
      // If AI returns an object (like for IRAC structure), convert it to a formatted string
      const normalizedSections: Record<string, string> = {};
      for (const [key, value] of Object.entries(sectionsContent)) {
        if (typeof value === 'string') {
          normalizedSections[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          // If it's an object, convert it to a formatted string
          // Handle IRAC structure or other nested objects
          if (Array.isArray(value)) {
            normalizedSections[key] = value.join('\n\n');
          } else {
            // Convert object to formatted string
            const parts: string[] = [];
            for (const [objKey, objValue] of Object.entries(value)) {
              if (objValue && typeof objValue === 'string') {
                parts.push(`${objKey.toUpperCase()}:\n${objValue}`);
              } else if (objValue && typeof objValue === 'object') {
                // Handle nested objects (like IRAC with sub-sections)
                const nestedParts: string[] = [];
                for (const [nestedKey, nestedValue] of Object.entries(objValue as Record<string, unknown>)) {
                  if (nestedValue && typeof nestedValue === 'string') {
                    nestedParts.push(`${nestedKey}:\n${nestedValue}`);
                  }
                }
                if (nestedParts.length > 0) {
                  parts.push(`${objKey.toUpperCase()}:\n${nestedParts.join('\n\n')}`);
                }
              }
            }
            normalizedSections[key] = parts.join('\n\n');
          }
        } else {
          // Fallback: convert to string
          normalizedSections[key] = String(value);
        }
      }
      
      sectionsContent = normalizedSections;
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', generatedText);
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sections: sectionsContent });
  } catch (error) {
    console.error('AI API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: `An error occurred while generating content: ${errorMessage}` },
      { status: 500 }
    );
  }
}




