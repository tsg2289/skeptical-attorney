import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { getRFPTemplatesForAI } from '@/lib/data/rfpTemplateQuestions'
import { getRFATemplatesForAI } from '@/lib/data/rfaTemplateQuestions'
import { anonymizeDataWithMapping, reidentifyData, PIIMapping, ContextualMapping } from '@/lib/utils/anonymize'

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
      selectedCategory,
      categoryName,
      currentItems,
      conversationHistory 
    } = body

    // CRITICAL: Verify user owns this case AND fetch ALL needed data from DB
    // We fetch case_type, facts, plaintiffs, defendants from DB - NOT from client
    // This prevents spoofing and ensures data isolation
    const { data: caseData, error } = await supabase
      .from('cases')
      .select('id, case_name, facts, description, case_type, plaintiffs, defendants')
      .eq('id', caseId)
      .eq('user_id', user.id) // USER ISOLATION - Critical for security
      .single()

    if (error || !caseData) {
      console.log(`[SECURITY] User ${user.id} attempted to access case ${caseId} they don't own`)
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Extract party names from VERIFIED database data, not client
    const plaintiffs = caseData.plaintiffs as Array<{ name: string }> | null
    const defendants = caseData.defendants as Array<{ name: string }> | null
    const trustedPlaintiffName = plaintiffs?.[0]?.name || 'Plaintiff'
    const trustedDefendantName = defendants?.[0]?.name || 'Defendant'
    const trustedCaseType = caseData.case_type || 'General Civil'
    const trustedFacts = caseData.facts || caseData.description || ''

    // SECURITY: Anonymize ALL PII before sending to OpenAI
    // This prevents sensitive data from being stored/processed by third parties
    const { 
      anonymizedText: anonymizedFacts, 
      mapping: factsMapping, 
      contextualMappings: factsContextual 
    } = anonymizeDataWithMapping(trustedFacts)

    const { 
      anonymizedText: anonymizedPlaintiff, 
      mapping: plaintiffMapping,
      contextualMappings: plaintiffContextual 
    } = anonymizeDataWithMapping(trustedPlaintiffName)

    const { 
      anonymizedText: anonymizedDefendant, 
      mapping: defendantMapping,
      contextualMappings: defendantContextual 
    } = anonymizeDataWithMapping(trustedDefendantName)

    const { 
      anonymizedText: anonymizedCaseName, 
      mapping: caseNameMapping,
      contextualMappings: caseNameContextual 
    } = anonymizeDataWithMapping(caseData.case_name || '')

    const { 
      anonymizedText: anonymizedCurrentItems, 
      mapping: itemsMapping,
      contextualMappings: itemsContextual 
    } = anonymizeDataWithMapping(currentItems || '')

    const { 
      anonymizedText: anonymizedUserMessage, 
      mapping: userMessageMapping,
      contextualMappings: userMessageContextual 
    } = anonymizeDataWithMapping(userMessage || '')

    // Merge all mappings for re-identification
    const combinedMapping: PIIMapping = {}
    const allMappings = [factsMapping, plaintiffMapping, defendantMapping, caseNameMapping, itemsMapping, userMessageMapping]
    allMappings.forEach(mapping => {
      Object.keys(mapping).forEach(key => {
        combinedMapping[key] = [...(combinedMapping[key] || []), ...mapping[key]]
      })
    })

    const combinedContextualMappings: ContextualMapping[] = [
      ...factsContextual,
      ...plaintiffContextual,
      ...defendantContextual,
      ...caseNameContextual,
      ...itemsContextual,
      ...userMessageContextual
    ]

    // Sanitize category name (don't trust client input for prompt injection)
    const sanitizedCategoryName = (categoryName || 'General')
      .replace(/[<>\"'`]/g, '')
      .substring(0, 100)

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

    // Build case-scoped system prompt with ANONYMIZED data
    // The AI sees placeholders like [PERSON_1], [ORGANIZATION_1], etc.
    const systemPrompt = `You are a legal discovery assistant helping draft ${typeLabels[discoveryType] || 'discovery documents'} for California civil litigation.

CRITICAL SECURITY RULES:
1. You ONLY have access to the case facts provided below
2. You MUST NOT reference any other cases, clients, or matters
3. You MUST NOT make up facts not present in the provided case facts
4. If asked about other cases, respond: "I can only assist with the current case."

CASE CONTEXT:
- Case Type: ${trustedCaseType}
- Plaintiff: ${anonymizedPlaintiff}
- Defendant: ${anonymizedDefendant}

CASE FACTS:
${anonymizedFacts || 'No case facts have been entered yet. Generate general discovery appropriate for the category and case type.'}

CURRENT CATEGORY: ${sanitizedCategoryName}

EXISTING ITEMS IN THIS CATEGORY:
${anonymizedCurrentItems || 'No items drafted yet.'}

YOUR ROLE FOR ${typeLabels[discoveryType]?.toUpperCase() || 'DISCOVERY'}:
1. Generate legally sound, California-compliant ${discoveryType}
2. Use proper legal terminology
3. Make items specific to the case facts when available
4. Tailor discovery to the case type: ${trustedCaseType}
5. Avoid duplicating existing items
${getTypeSpecificInstructions(discoveryType)}
${discoveryType === 'rfp' ? getRFPTemplatesForAI(sanitizedCategoryName) : discoveryType === 'rfa' ? getRFATemplatesForAI(sanitizedCategoryName) : ''}

When generating discovery items, include them in a JSON block like this:
\`\`\`suggestions
["${discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORY NO. [X]:\\n' : discoveryType === 'rfp' ? 'REQUEST FOR PRODUCTION NO. [X]:\\n' : 'REQUEST FOR ADMISSION NO. [X]:\\nAdmit that '}First item text here.", "${discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORY NO. [X]:\\n' : discoveryType === 'rfp' ? 'REQUEST FOR PRODUCTION NO. [X]:\\n' : 'REQUEST FOR ADMISSION NO. [X]:\\nAdmit that '}Second item text here."]
\`\`\`

The [X] will be replaced with actual numbers when inserted into the document.`

    // Build messages array with anonymized conversation history
    const anonymizedHistory = (conversationHistory || []).map((m: { role: string; content: string }) => {
      const { anonymizedText } = anonymizeDataWithMapping(m.content)
      return {
        role: m.role as 'user' | 'assistant',
        content: anonymizedText
      }
    })

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...anonymizedHistory,
      { role: 'user', content: anonymizedUserMessage }
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
        // Re-identify PII in suggestions
        suggestions = suggestions.map(suggestion => 
          reidentifyData(suggestion, combinedMapping, combinedContextualMappings)
        )
      } catch (e) {
        console.error('Failed to parse suggestions:', e)
      }
    }

    // Clean response (remove the suggestions block from display text)
    let cleanMessage = responseContent.replace(/```suggestions[\s\S]*?```/g, '').trim()
    
    // Re-identify PII in the response message
    cleanMessage = reidentifyData(cleanMessage, combinedMapping, combinedContextualMappings)

    // AUDIT LOG - Log request metadata (not content) for compliance
    console.log(`[AUDIT] Discovery AI Request:
  - Timestamp: ${new Date().toISOString()}
  - User ID: ${user.id}
  - Case ID: ${caseId}
  - Case Type: ${trustedCaseType}
  - Discovery Type: ${discoveryType}
  - Category: ${sanitizedCategoryName}
  - Data Anonymized: true
  - PII Types Detected: ${Object.keys(combinedMapping).length > 0 ? Object.keys(combinedMapping).join(', ') : 'none'}
`)

    return NextResponse.json({
      message: cleanMessage || 'I\'ve prepared some discovery items for you. Please review them below.',
      suggestions,
      // Return case type so UI can use it for dynamic categories
      caseType: trustedCaseType
    })

  } catch (error) {
    console.error('Discovery AI error:', error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
