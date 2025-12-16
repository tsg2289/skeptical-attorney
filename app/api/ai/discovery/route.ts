import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // CRITICAL: Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      caseId, 
      discoveryType, 
      userMessage, 
      caseFacts, 
      plaintiffName, 
      defendantName,
      caseDescription,
      selectedCategory,
      categoryName,
      currentItems,
      conversationHistory 
    } = body

    // CRITICAL: Verify user owns this case
    const { data: caseData, error } = await supabase
      .from('cases')
      .select('id, case_name, facts, description')
      .eq('id', caseId)
      .eq('user_id', user.id) // USER ISOLATION - Critical for security
      .single()

    if (error || !caseData) {
      console.log(`[SECURITY] User ${user.id} attempted to access case ${caseId} they don't own`)
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Build discovery type labels
    const typeLabels: Record<string, string> = {
      interrogatories: 'Special Interrogatories',
      rfp: 'Requests for Production of Documents',
      rfa: 'Requests for Admission'
    }

    // Type-specific formatting instructions
    const getTypeSpecificInstructions = (type: string) => {
      switch (type) {
        case 'interrogatories':
          return `
FORMATTING REQUIREMENTS FOR SPECIAL INTERROGATORIES:
- Start each with "SPECIAL INTERROGATORY NO. [X]:" where [X] is a placeholder number
- Use defined terms in ALL CAPS (YOU, YOUR, INCIDENT, DOCUMENT, IDENTIFY, DESCRIBE, PERSON, HEALTH CARE PROVIDER)
- Ask questions that require narrative responses
- Include follow-up questions about witnesses, documents, and detailed descriptions
- Reference California Code of Civil Procedure section 2030 where appropriate`

        case 'rfp':
          return `
FORMATTING REQUIREMENTS FOR REQUESTS FOR PRODUCTION:
- Start each with "REQUEST FOR PRODUCTION NO. [X]:" where [X] is a placeholder number
- Use defined terms: DOCUMENT(S), COMMUNICATION(S), RELATING TO, CONCERNING
- Request specific categories of documents with clear descriptions
- Include electronic data and ESI where relevant
- Use proper document production language: "Any and all DOCUMENTS..."
- Reference California Code of Civil Procedure section 2031 where appropriate
- Common document categories: correspondence, contracts, invoices, photographs, videos, emails, text messages, reports, records`

        case 'rfa':
          return `
FORMATTING REQUIREMENTS FOR REQUESTS FOR ADMISSION:
- Start each with "REQUEST FOR ADMISSION NO. [X]:" or "Admit that..."
- Write statements that require a clear ADMIT or DENY response
- Each request should address a SINGLE fact or contention
- Use clear, unambiguous language
- Requests can address:
  • Genuineness of documents
  • Truth of facts relating to the case
  • Application of law to facts
  • Opinions relating to fact or law
- Reference California Code of Civil Procedure section 2033 where appropriate
- Strategic RFAs can establish key facts and simplify trial issues`

        default:
          return ''
      }
    }

    // Build case-scoped system prompt
    const systemPrompt = `You are a legal discovery assistant helping draft ${typeLabels[discoveryType] || 'discovery documents'} for California civil litigation.

CRITICAL SECURITY RULES:
1. You ONLY have access to the case facts provided below
2. You MUST NOT reference any other cases, clients, or matters
3. You MUST NOT make up facts not present in the provided case facts
4. If asked about other cases, respond: "I can only assist with the current case."

CASE CONTEXT:
- Case Name: ${caseData.case_name}
- Plaintiff: ${plaintiffName}
- Defendant: ${defendantName}

CASE FACTS:
${caseFacts || caseDescription || 'No case facts have been entered yet. Generate general discovery appropriate for the category.'}

CURRENT CATEGORY: ${categoryName || 'General'}

EXISTING ITEMS IN THIS CATEGORY:
${currentItems || 'No items drafted yet.'}

YOUR ROLE FOR ${typeLabels[discoveryType]?.toUpperCase() || 'DISCOVERY'}:
1. Generate legally sound, California-compliant ${discoveryType}
2. Use proper legal terminology
3. Make items specific to the case facts when available
4. Avoid duplicating existing items
${getTypeSpecificInstructions(discoveryType)}

When generating discovery items, include them in a JSON block like this:
\`\`\`suggestions
["${discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORY NO. [X]:\\n' : discoveryType === 'rfp' ? 'REQUEST FOR PRODUCTION NO. [X]:\\n' : 'REQUEST FOR ADMISSION NO. [X]:\\nAdmit that '}First item text here.", "${discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORY NO. [X]:\\n' : discoveryType === 'rfp' ? 'REQUEST FOR PRODUCTION NO. [X]:\\n' : 'REQUEST FOR ADMISSION NO. [X]:\\nAdmit that '}Second item text here."]
\`\`\`

The [X] will be replaced with actual numbers when inserted into the document.`

    // Build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 3000
    })

    const responseContent = completion.choices[0]?.message?.content || ''

    // Extract suggestions if present
    let suggestions: string[] = []
    const suggestionsMatch = responseContent.match(/```suggestions\n([\s\S]*?)\n```/)
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1])
      } catch (e) {
        console.error('Failed to parse suggestions:', e)
      }
    }

    // Clean response (remove the suggestions block from display text)
    const cleanMessage = responseContent.replace(/```suggestions[\s\S]*?```/g, '').trim()

    // Log for audit trail
    console.log(`[AUDIT] Discovery AI request for case ${caseId} by user ${user.id}: ${discoveryType}, category: ${categoryName}`)

    return NextResponse.json({
      message: cleanMessage || 'I\'ve prepared some interrogatories for you. Please review them below.',
      suggestions
    })

  } catch (error) {
    console.error('Discovery AI error:', error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}

