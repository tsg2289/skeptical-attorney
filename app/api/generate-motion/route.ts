import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MotionCitation {
  caseName: string
  citation: string
  relevantText: string
}

interface Party {
  name: string
  type?: string
}

// Motion type to California Rules of Court mapping
const MOTION_RULES: Record<string, string> = {
  'motion-to-compel-discovery': '3.1345',
  'motion-to-compel-deposition': '3.1345',
  'demurrer': '3.1320',
  'motion-to-strike': '3.1322',
  'motion-for-summary-judgment': '3.1350',
  'motion-for-summary-adjudication': '3.1350',
  'motion-in-limine': '3.1112',
  'motion-for-protective-order': '3.1345',
  'motion-to-quash-subpoena': '3.1345',
  'motion-for-sanctions': '3.1345',
  'ex-parte-application': '3.1200',
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Authentication check - prevents data leakage between users
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      // New simplified inputs
      motionDescription,
      reliefSought,
      autoDetectType,
      // Uploaded document content
      uploadedDocumentContent,
      uploadedDocumentName,
      // Legacy inputs (for backward compatibility)
      motionType: providedMotionType, 
      facts, 
      legalIssues,
      // Common fields
      caseId, 
      county, 
      plaintiffs, 
      defendants,
      caseNumber,
      caseName,
      hearingDate,
      hearingTime,
      department,
      caseCitations,
      attorneys,
      movingParty,
      opposingParty,
    } = body

    // SECURITY: Validate caseId belongs to user (if provided)
    if (caseId) {
      const { data: caseCheck } = await supabase
        .from('cases')
        .select('id')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single()
      
      if (!caseCheck) {
        console.warn(`[SECURITY] User ${user.id} attempted to access case ${caseId} they don't own`)
        return NextResponse.json({ error: 'Unauthorized access to case' }, { status: 403 })
      }
    }

    // Get the case facts - either from new simplified input or legacy
    const caseFacts = motionDescription || facts
    const caseRelief = reliefSought || body.reliefSought

    // Validation
    if (!caseFacts || typeof caseFacts !== 'string') {
      return NextResponse.json({ error: 'Please describe what your motion is about' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Determine motion type - either auto-detect or use provided
    let detectedMotionType = providedMotionType
    let applicableRule = ''

    if (autoDetectType && motionDescription) {
      // Auto-detect motion type from description
      const typeDetectionPrompt = `Based on this legal situation description, identify the most appropriate California motion type. Only respond with the motion type ID, nothing else.

Description: "${motionDescription}"
Relief sought: "${caseRelief || 'As appropriate'}"

Motion type IDs (respond with ONLY one of these exact IDs):
- motion-to-compel-discovery (for compelling discovery responses, interrogatories, document requests, requests for admission)
- motion-to-compel-deposition (for compelling deposition attendance or production)
- demurrer (for challenging legal sufficiency of pleadings, failure to state a cause of action)
- motion-to-strike (for striking improper, irrelevant, or false matter from pleadings)
- motion-for-summary-judgment (for judgment when no triable issues of material fact exist)
- motion-for-summary-adjudication (for adjudicating specific issues or causes of action)
- motion-in-limine (for excluding or limiting evidence at trial)
- motion-for-protective-order (for protecting from burdensome, harassing, or improper discovery)
- motion-to-quash-subpoena (for challenging validity of subpoenas)
- motion-for-sanctions (for discovery abuse, bad faith conduct, or frivolous filings)
- ex-parte-application (for emergency relief requiring immediate action)

Respond with ONLY the motion type ID:`

      try {
        const detectionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are a legal classification assistant. Analyze the description and respond with ONLY the exact motion type ID that best matches. No explanation, just the ID.' 
              },
              { role: 'user', content: typeDetectionPrompt }
            ],
            temperature: 0.1,
            max_tokens: 50,
          })
        })

        if (detectionResponse.ok) {
          const detectionData = await detectionResponse.json()
          const detected = detectionData.choices[0].message.content.trim().toLowerCase()
          
          // Validate it's a known type
          if (MOTION_RULES[detected]) {
            detectedMotionType = detected
            applicableRule = MOTION_RULES[detected]
            console.log(`[AI] Detected motion type: ${detectedMotionType}`)
          } else {
            // Default fallback
            detectedMotionType = 'motion-to-compel-discovery'
            applicableRule = MOTION_RULES[detectedMotionType]
            console.log(`[AI] Unknown type detected: ${detected}, defaulting to motion-to-compel-discovery`)
          }
        }
      } catch (detectionError) {
        console.error('Motion type detection failed:', detectionError)
        detectedMotionType = 'motion-to-compel-discovery'
        applicableRule = MOTION_RULES[detectedMotionType]
      }
    } else if (providedMotionType) {
      detectedMotionType = providedMotionType
      applicableRule = MOTION_RULES[providedMotionType] || ''
    } else {
      return NextResponse.json({ error: 'Motion type is required' }, { status: 400 })
    }

    // Build motion type-specific prompts
    const motionTypeConfig: Record<string, { title: string; statutes: string; format: string }> = {
      'motion-to-compel-discovery': {
        title: 'MOTION TO COMPEL FURTHER RESPONSES TO DISCOVERY',
        statutes: 'CCP §§ 2030.300 (interrogatories), 2031.310 (document requests), 2033.280 (requests for admission)',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities with meet and confer declaration requirement (CCP § 2016.040), (3) Separate Statement of disputed discovery items, (4) Declaration in support'
      },
      'motion-to-compel-deposition': {
        title: 'MOTION TO COMPEL DEPOSITION',
        statutes: 'CCP §§ 2025.450, 2025.480',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities, (3) Declaration regarding deposition notice and failure to appear or produce documents'
      },
      'demurrer': {
        title: 'DEMURRER',
        statutes: 'CCP § 430.10, 430.30, 430.41',
        format: 'Include: (1) Notice of Demurrer, (2) Demurrer with specification of grounds, (3) Memorandum of Points and Authorities, (4) Meet and confer declaration (CCP § 430.41)'
      },
      'motion-to-strike': {
        title: 'MOTION TO STRIKE',
        statutes: 'CCP §§ 435, 436, 437',
        format: 'Include: (1) Notice of Motion to Strike, (2) Motion specifying matter to be stricken, (3) Memorandum of Points and Authorities'
      },
      'motion-for-summary-judgment': {
        title: 'MOTION FOR SUMMARY JUDGMENT',
        statutes: 'CCP § 437c',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities, (3) Separate Statement of Undisputed Material Facts (Cal. Rules of Court 3.1350), (4) Evidence (declarations, deposition excerpts, documents)'
      },
      'motion-for-summary-adjudication': {
        title: 'MOTION FOR SUMMARY ADJUDICATION',
        statutes: 'CCP § 437c(f)',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities, (3) Separate Statement of Undisputed Material Facts, (4) Supporting evidence'
      },
      'motion-in-limine': {
        title: 'MOTION IN LIMINE',
        statutes: 'Evidence Code §§ 350, 352, 402, 403',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities addressing admissibility issues, (3) Supporting declaration if needed'
      },
      'motion-for-protective-order': {
        title: 'MOTION FOR PROTECTIVE ORDER',
        statutes: 'CCP §§ 2030.090, 2031.060, 2033.080',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities, (3) Declaration showing good cause'
      },
      'motion-to-quash-subpoena': {
        title: 'MOTION TO QUASH SUBPOENA',
        statutes: 'CCP §§ 1987.1, 1987.2',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities, (3) Copy of subpoena being challenged'
      },
      'motion-for-sanctions': {
        title: 'MOTION FOR SANCTIONS',
        statutes: 'CCP §§ 128.5, 128.7, 2023.010-2023.040',
        format: 'Include: (1) Notice of Motion, (2) Memorandum of Points and Authorities, (3) Declaration detailing sanctionable conduct and expenses'
      },
      'opposition': {
        title: 'OPPOSITION',
        statutes: 'Dependent on motion being opposed',
        format: 'Include: (1) Opposition memorandum, (2) Responsive separate statement if required, (3) Supporting declarations and evidence'
      },
      'reply': {
        title: 'REPLY',
        statutes: 'Dependent on motion and opposition',
        format: 'Include: (1) Reply memorandum addressing opposition arguments, (2) Reply separate statement if required, (3) Any additional evidence'
      },
      'ex-parte-application': {
        title: 'EX PARTE APPLICATION',
        statutes: 'Cal. Rules of Court 3.1200-3.1207',
        format: 'Include: (1) Application, (2) Memorandum of Points and Authorities, (3) Declaration showing irreparable harm and notice attempts'
      },
    }

    const config = motionTypeConfig[detectedMotionType] || {
      title: 'MOTION',
      statutes: 'California Code of Civil Procedure',
      format: 'Include Notice of Motion, Memorandum of Points and Authorities, and Supporting Declaration'
    }

    // Build citations context - explicit about what citations are allowed
    const citationsContext = caseCitations?.length > 0 
      ? `\n\nUSER-PROVIDED CASE CITATIONS (You may ONLY cite these specific cases - do NOT add any others):\n${caseCitations.map((c: MotionCitation, i: number) => 
          `${i + 1}. ${c.caseName} (${c.citation})\n   Key holding: ${c.relevantText}`
        ).join('\n\n')}`
      : '\n\nNO CASE CITATIONS PROVIDED: Do NOT cite ANY case law. Use ONLY statutory authority (CCP sections, Evidence Code sections, California Rules of Court). If case law would strengthen an argument, add a note: [ATTORNEY: Consider adding case authority here]'

    // Get party names
    const plaintiffNames = plaintiffs?.map((p: Party) => p.name).filter(Boolean).join(', ') || '[PLAINTIFF]'
    const defendantNames = defendants?.map((d: Party) => d.name).filter(Boolean).join(', ') || '[DEFENDANT]'
    
    // Attorney info
    const attorneyInfo = attorneys?.[0] || {}
    const attorneyName = attorneyInfo.name || '[ATTORNEY NAME]'
    const barNumber = attorneyInfo.barNumber || '[BAR NUMBER]'
    const firmName = attorneyInfo.firm || attorneyInfo.lawFirmName || '[LAW FIRM]'

    const prompt = `Generate a complete California ${config.title} with proper formatting.

CASE INFORMATION:
- Case Name: ${caseName || `${plaintiffNames} v. ${defendantNames}`}
- Case Number: ${caseNumber || '[CASE NUMBER]'}
- County: ${county || '[COUNTY]'}
- Court: Superior Court of California, County of ${county || '[COUNTY]'}
- Hearing Date: ${hearingDate || '[TO BE SET]'}
- Hearing Time: ${hearingTime || '8:30 a.m.'}
- Department: ${department || '[DEPT.]'}

PARTIES:
- Plaintiff(s): ${plaintiffNames}
- Defendant(s): ${defendantNames}
- Moving Party: ${movingParty || 'Plaintiff'}
- Opposing Party: ${opposingParty || 'Defendant'}

ATTORNEY FOR MOVING PARTY:
${attorneyName}
State Bar No. ${barNumber}
${firmName}

SITUATION AND FACTS (from client's description):
${caseFacts}

RELIEF SOUGHT:
${caseRelief || 'As appropriate for this motion type.'}
${citationsContext}
${uploadedDocumentContent ? `
REFERENCE DOCUMENT (${uploadedDocumentName || 'Uploaded Document'}):
The following document has been provided as reference. Use its content to inform and support your motion. Extract relevant facts, dates, names, and legal arguments from this document:

---BEGIN DOCUMENT---
${uploadedDocumentContent}
---END DOCUMENT---

Incorporate relevant information from the reference document into your motion where appropriate.
` : ''}
APPLICABLE STATUTES:
${config.statutes}

REQUIRED FORMAT:
${config.format}

⚠️ CRITICAL - NO HALLUCINATIONS ALLOWED ⚠️
- Use ONLY the facts explicitly stated above. Do NOT invent, assume, or add ANY facts, dates, names, or amounts not provided.
- Use ONLY the case citations listed above (if any). Do NOT cite ANY cases not provided by the user.
- If no case citations were provided, use ONLY statutory authority (CCP §, Evidence Code §, California Rules of Court).
- For any information that would strengthen the motion but was not provided, use: [ATTORNEY: ...]
- NEVER fabricate case names, citations, holdings, quotes, or any legal authority.

REQUIREMENTS:
1. Follow California Rules of Court formatting requirements
2. Use proper legal citation format (California Style Manual) for statutes
3. Include all required components for this motion type
4. Use numbered paragraphs for factual allegations
5. Include specific statutory citations with section numbers (verifiable codes only)
6. ONLY cite case law if it was provided by the user above
7. Make persuasive legal arguments based ONLY on the facts provided
8. Include a proposed order if appropriate
9. Format for filing in California Superior Court
10. Include a Proof of Service template at the end
11. Mark areas needing attorney attention with [ATTORNEY: ...]

DOCUMENT STRUCTURE (use these EXACT section headers):

MOTION SUMMARY:
[REQUIRED - Write ONE detailed paragraph (4-6 sentences) that summarizes this motion for the opposing party and the Court. This paragraph must:
1. State what relief the moving party is seeking
2. Identify the specific pleading or document being challenged (if applicable)
3. Explain the primary grounds/reasons for the motion based on the facts provided
4. Convey why the Court should grant the motion
Write this as a lawyer would write it - professional, clear, and substantive. Do NOT just repeat the relief sought - provide a meaningful summary that helps the reader understand the motion's substance and basis. Example format: "Defendant respectfully moves this Court to [relief sought]. This motion is brought because [explain the factual and legal basis]. [Additional context about why relief is warranted]."]

I. INTRODUCTION
[Brief overview of the motion based on the situation described]

II. STATEMENT OF FACTS
[Detailed factual background from the client's description]

III. APPLICABLE LAW
[Relevant statutes and legal standards]

IV. ARGUMENT
[Legal analysis and persuasive arguments]

V. CONCLUSION
[Summary and request for relief]

DECLARATION OF ${attorneyName.toUpperCase()}

I, ${attorneyName}, declare as follows:

1. I am an attorney at law duly admitted to practice before all courts of the State of California, and am counsel of record for the moving party in this action.

2. [Include 3-5 numbered paragraphs with facts supporting the motion based on personal knowledge]

3. [Additional facts...]

I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on [DATE].

____________________________
${attorneyName}

PROOF OF SERVICE
[Standard proof of service template]

Generate the complete motion document with all sections properly formatted using the exact headers above. Make it persuasive and professional.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an experienced California litigation attorney drafting motion papers. You are thorough, precise, and persuasive.

⚠️ CRITICAL ANTI-HALLUCINATION RULES - STRICTLY ENFORCED ⚠️

1. FACTS - ABSOLUTE PROHIBITION ON FABRICATION:
   - Use ONLY facts explicitly provided by the user
   - Do NOT invent, assume, or embellish ANY facts, dates, names, amounts, or events
   - If critical information is missing, use [TO BE COMPLETED BY ATTORNEY] placeholders
   - Never add "details" to make the motion sound better

2. CASE CITATIONS - ZERO TOLERANCE FOR FABRICATION:
   - ONLY cite cases that are explicitly listed in the "USER-PROVIDED CASE CITATIONS" section
   - If NO case citations were provided, DO NOT CITE ANY CASES WHATSOEVER
   - NEVER invent, fabricate, or hallucinate case names, citations, reporters, years, or holdings
   - NEVER create fake quotes from cases
   - Using a made-up case citation is a serious ethical violation

3. WHAT YOU MAY CITE (if no cases provided):
   - California Code of Civil Procedure (CCP) sections
   - California Evidence Code sections
   - California Rules of Court rules
   - California Civil Code sections
   - These statutes are verifiable and acceptable

4. ATTORNEY REVIEW MARKERS:
   - If case law would strengthen an argument but none was provided, write: [ATTORNEY: Consider adding case authority supporting this point]
   - If a fact seems important but wasn't provided, write: [ATTORNEY: Verify/add specific details here]

5. ABSOLUTELY FORBIDDEN - DO NOT GENERATE:
   - Fake case names (e.g., "Smith v. Jones (2020) 45 Cal.App.5th 123")
   - Made-up holdings or quotes
   - Fabricated dates, amounts, or statistics
   - Names of parties, witnesses, or documents not provided
   - Any information from outside this specific prompt

Formatting requirements:
- Follow California Rules of Court and local rules
- Use California Style Manual citation format for statutory citations
- Structure documents professionally with clear headings
- Make persuasive arguments based ONLY on provided facts
- Reference specific code sections (verifiable statutes only)

DATA ISOLATION: This is a single user session. Do not reference any external information.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,  // Very low temperature to minimize creative/hallucinatory outputs
        max_tokens: 8000,
      })
    })

    if (!response.ok) {
      // Try to parse as JSON, but handle HTML error pages gracefully
      let errorMessage = 'Failed to generate motion'
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          console.error('OpenAI API error:', error)
          errorMessage = error.error?.message || errorMessage
        } else {
          // HTML or other non-JSON response
          const errorText = await response.text()
          console.error('OpenAI API returned non-JSON response:', errorText.substring(0, 500))
          errorMessage = 'AI service temporarily unavailable. Please try again in a moment.'
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI error response:', parseError)
        errorMessage = 'AI service error. Please try again.'
      }
      
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please try again in a moment.',
          type: 'rate_limit'
        }, { status: 429 })
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    // Parse successful response
    let data
    try {
      data = await response.json()
    } catch (parseError) {
      console.error('Error parsing OpenAI success response:', parseError)
      return NextResponse.json({ 
        error: 'Error processing AI response. Please try again.' 
      }, { status: 500 })
    }
    const motion = data.choices[0].message.content.trim()

    // Generate a summarized relief statement for the Notice of Motion
    // This transforms the user's plain-language input into proper legal language
    let noticeReliefSummary = caseRelief || ''
    
    if (caseRelief && caseRelief.length > 100) {
      // Only summarize if the input is substantial
      const reliefSummaryPrompt = `You are a California civil litigation attorney. Convert the following client request into a single, professional sentence suitable for a Notice of Motion.

CLIENT'S REQUEST:
${caseRelief}

MOTION TYPE: ${config.title}
MOVING PARTY: ${movingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'}
${movingParty === 'plaintiff' ? 'PLAINTIFF' : 'DEFENDANT'} NAME: ${movingParty === 'plaintiff' ? plaintiffNames : defendantNames}

OUTPUT FORMAT:
Write ONE sentence that completes: "...will move the Court for an order [YOUR OUTPUT HERE]"

EXAMPLE INPUTS AND OUTPUTS:

Input: "the third cause of action is false, it needs to be stricken THIRD CAUSE OF ACTION: NEGLIGENT HIRING AND SUPERVISION (CACI 426) 21. Plaintiff incorporates..."
Output: "striking the Third Cause of Action for Negligent Hiring and Supervision from Plaintiff's Complaint in its entirety on the grounds that it fails to state facts sufficient to constitute a cause of action"

Input: "I need this cause of action removed: FOURTH CAUSE OF ACTION: INTENTIONAL INFLICTION OF EMOTIONAL DISTRESS..."
Output: "striking the Fourth Cause of Action for Intentional Infliction of Emotional Distress from Plaintiff's Complaint in its entirety"

Input: "Defendant hasn't provided discovery responses for 3 months"
Output: "compelling Defendant to provide complete responses to all outstanding discovery requests within 10 days and for monetary sanctions"

Input: "The second cause of action for fraud should be dismissed"
Output: "sustaining Defendant's demurrer to the Second Cause of Action for Fraud without leave to amend"

CRITICAL RULES:
1. EXTRACT the cause of action NAME and NUMBER from the input (e.g., "Third Cause of Action for Negligent Hiring and Supervision")
2. Do NOT include the full paragraphs of allegations - just the cause of action title
3. Do NOT include the introductory phrase "will move the Court for an order" - just the relief portion
4. Keep it to ONE concise sentence using proper California legal terminology
5. No period at the end`

      try {
        const reliefResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are a legal drafting assistant. Your task is to summarize relief requests into proper legal language for a Notice of Motion. Be concise and professional. Output ONLY the relief clause - no explanations.' 
              },
              { role: 'user', content: reliefSummaryPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200,
          })
        })

        if (reliefResponse.ok) {
          const reliefData = await reliefResponse.json()
          const summarized = reliefData.choices[0]?.message?.content?.trim()
          if (summarized) {
            // Clean up the response - remove quotes and trailing periods
            noticeReliefSummary = summarized
              .replace(/^["']|["']$/g, '') // Remove surrounding quotes
              .replace(/\.$/g, '') // Remove trailing period
            console.log(`[AI] Summarized relief: ${noticeReliefSummary.substring(0, 100)}...`)
          }
        }
      } catch (reliefError) {
        console.error('Relief summarization failed, using original:', reliefError)
        // Keep the original caseRelief if summarization fails
      }
    }

    // AUDIT LOG - includes user ID for security tracking, no cross-user data
    console.log(`[AUDIT] User ${user.id} generated ${detectedMotionType} for case ${caseId || 'standalone'} - isolated session`)

    return NextResponse.json({ 
      motion,
      motionType: detectedMotionType,
      detectedMotionType,
      applicableRule,
      title: config.title,
      noticeReliefSummary,
    })

  } catch (error) {
    console.error('Motion generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
