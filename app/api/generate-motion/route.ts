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

export async function POST(request: NextRequest) {
  try {
    // Authentication check - prevents data leakage
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      motionType, 
      facts, 
      legalIssues,
      reliefSought,
      caseId, 
      county, 
      plaintiffs, 
      defendants,
      caseNumber,
      caseName,
      hearingDate,
      hearingTime,
      department,
      caseCitations, // Pre-selected case law from CourtListener
      attorneys,
      movingParty, // 'plaintiff' or 'defendant'
      opposingParty,
    } = body

    // Validation
    if (!motionType) {
      return NextResponse.json({ error: 'Motion type is required' }, { status: 400 })
    }
    if (!facts || typeof facts !== 'string') {
      return NextResponse.json({ error: 'Case facts are required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
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

    const config = motionTypeConfig[motionType] || {
      title: 'MOTION',
      statutes: 'California Code of Civil Procedure',
      format: 'Include Notice of Motion, Memorandum of Points and Authorities, and Supporting Declaration'
    }

    // Build citations context
    const citationsContext = caseCitations?.length > 0 
      ? `\n\nINCLUDE THESE CALIFORNIA CASE CITATIONS IN YOUR LEGAL ARGUMENT:\n${caseCitations.map((c: MotionCitation, i: number) => 
          `${i + 1}. ${c.caseName} (${c.citation})\n   Key holding: ${c.relevantText}`
        ).join('\n\n')}`
      : ''

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

CASE FACTS:
${facts}

LEGAL ISSUES TO ADDRESS:
${legalIssues || 'Address all relevant legal issues based on the facts.'}

RELIEF SOUGHT:
${reliefSought || 'As appropriate for this motion type.'}
${citationsContext}

APPLICABLE STATUTES:
${config.statutes}

REQUIRED FORMAT:
${config.format}

REQUIREMENTS:
1. Follow California Rules of Court formatting requirements
2. Use proper legal citation format (California Style Manual)
3. Include all required components for this motion type
4. Use numbered paragraphs for factual allegations
5. Include specific statutory citations with section numbers
6. Apply California case law appropriately
7. Make persuasive legal arguments
8. Include a proposed order if appropriate
9. Format for filing in California Superior Court
10. Include a Proof of Service template at the end

Generate the complete motion document with all sections properly formatted.`

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

Key requirements:
- Follow California Rules of Court and local rules
- Use California Style Manual citation format
- Structure documents professionally with clear headings
- Make persuasive legal arguments supported by authority
- Include all procedurally required components
- Be specific about facts, dates, and parties
- Reference specific code sections and rules
- Apply case law accurately and persuasively

NEVER include placeholder text like "[INSERT]" - always generate complete, professional content based on the facts provided.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000, // Allow for longer motion documents
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)
      
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please try again in a moment.',
          type: 'rate_limit'
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to generate motion' 
      }, { status: response.status })
    }

    const data = await response.json()
    const motion = data.choices[0].message.content.trim()

    console.log(`[AUDIT] User ${user.id} generated ${motionType} for case ${caseId || 'standalone'}`)

    return NextResponse.json({ 
      motion,
      motionType,
      title: config.title,
    })

  } catch (error) {
    console.error('Motion generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


