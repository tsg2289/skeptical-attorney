import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

interface Deadline {
  id: string
  date: string
  description: string
  completed?: boolean
}

interface AssistantContext {
  mode: 'case' | 'dashboard'
  caseId?: string
  profile: {
    name: string
    email: string
    firm?: string
    billingGoal?: string
  }
  currentCase?: {
    caseName: string
    caseNumber: string
    caseType?: string
    client?: string
    trialDate?: string
    mscDate?: string
    court?: string
    courtCounty?: string
    deadlines: Deadline[]
    plaintiffCount: number
    defendantCount: number
  }
  caseOverview?: {
    totalCases: number
    casesWithUpcomingTrials: number
    cases: Array<{
      caseName: string
      caseNumber: string
      caseType?: string
      trialDate?: string
      incompleteDeadlines: number
    }>
  }
  urgentDeadlines: Array<{
    caseName: string
    date: string
    description: string
    daysUntil: number
  }>
}

function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= days
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffTime = date.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

async function getServerSupabase() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  )
}

function buildSystemPrompt(context: AssistantContext): string {
  const basePrompt = `You are a helpful legal assistant for ${context.profile.name}${context.profile.firm ? ` at ${context.profile.firm}` : ''}. 
You help manage their legal practice, track deadlines, and provide guidance on case workflow.

CRITICAL RULES:
1. Only discuss information provided in the context below
2. Never make up case details, dates, or deadlines
3. Be concise and actionable in your responses
4. If asked about information not in context, say "I don't have that information"
5. Use markdown formatting for better readability
`

  if (context.mode === 'case' && context.currentCase) {
    return `${basePrompt}
MODE: CASE-SPECIFIC
You are currently helping with ONE specific case. DO NOT discuss or reference any other cases.
If asked about other matters, say: "I'm currently focused on ${context.currentCase.caseName}. To discuss other cases, please navigate to your dashboard."

CURRENT CASE:
- Name: ${context.currentCase.caseName}
- Case Number: ${context.currentCase.caseNumber}
${context.currentCase.caseType ? `- Type: ${context.currentCase.caseType}` : ''}
${context.currentCase.client ? `- Client: ${context.currentCase.client}` : ''}
${context.currentCase.trialDate ? `- Trial Date: ${context.currentCase.trialDate}` : '- Trial Date: Not set'}
${context.currentCase.mscDate ? `- MSC Date: ${context.currentCase.mscDate}` : ''}
${context.currentCase.court ? `- Court: ${context.currentCase.court}` : ''}
${context.currentCase.courtCounty ? `- County: ${context.currentCase.courtCounty}` : ''}
- Plaintiffs: ${context.currentCase.plaintiffCount}
- Defendants: ${context.currentCase.defendantCount}

UPCOMING DEADLINES FOR THIS CASE (${context.currentCase.deadlines.length} incomplete):
${context.urgentDeadlines.length > 0 
  ? context.urgentDeadlines.map(d => `- ${d.date} (${d.daysUntil} days): ${d.description}`).join('\n')
  : '- No urgent deadlines in the next 14 days'}

ALL INCOMPLETE DEADLINES:
${context.currentCase.deadlines.length > 0
  ? context.currentCase.deadlines.slice(0, 20).map(d => `- ${d.date}: ${d.description}`).join('\n')
  : '- No incomplete deadlines'}
`
  }

  if (context.mode === 'dashboard' && context.caseOverview) {
    return `${basePrompt}
MODE: DASHBOARD OVERVIEW
You are helping manage the user's entire caseload. You can discuss any of their cases.

${context.profile.billingGoal ? `BILLING GOAL: ${context.profile.billingGoal}` : ''}

CASELOAD SUMMARY:
- Total Active Cases: ${context.caseOverview.totalCases}
- Cases with trials in next 90 days: ${context.caseOverview.casesWithUpcomingTrials}

CASES:
${context.caseOverview.cases.map(c => 
  `- ${c.caseName} (${c.caseNumber})${c.caseType ? ` [${c.caseType}]` : ''}
   Trial: ${c.trialDate || 'Not set'} | ${c.incompleteDeadlines} pending tasks`
).join('\n\n')}

URGENT DEADLINES (next 14 days):
${context.urgentDeadlines.length > 0
  ? context.urgentDeadlines.slice(0, 15).map(d => 
      `- ${d.date} (${d.daysUntil === 0 ? 'TODAY' : d.daysUntil === 1 ? 'Tomorrow' : `${d.daysUntil} days`}): ${d.caseName} - ${d.description.substring(0, 80)}...`
    ).join('\n')
  : '- No urgent deadlines'}
`
  }

  return basePrompt
}

export async function POST(request: NextRequest) {
  try {
    const { message, mode, caseId, conversationHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // CRITICAL: Server-side authentication
    const supabase = await getServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build context based on mode
    let context: AssistantContext

    if (mode === 'case' && caseId) {
      // CASE-SCOPED MODE: Only fetch the specific case
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id) // CRITICAL: User isolation
        .single()

      if (caseError || !caseData) {
        return NextResponse.json(
          { error: 'Case not found or access denied' },
          { status: 404 }
        )
      }

      const deadlines = (caseData.deadlines || []) as Deadline[]
      const incompleteDeadlines = deadlines.filter(d => !d.completed)
      
      const urgentDeadlines = incompleteDeadlines
        .filter(d => isWithinDays(d.date, 14))
        .map(d => ({
          caseName: caseData.case_name,
          date: d.date,
          description: d.description,
          daysUntil: getDaysUntil(d.date)
        }))
        .sort((a, b) => a.daysUntil - b.daysUntil)

      context = {
        mode: 'case',
        caseId,
        profile: {
          name: user.user_metadata?.full_name || user.email || 'User',
          email: user.email || '',
          firm: user.user_metadata?.firm_name,
          billingGoal: user.user_metadata?.billing_goal
        },
        currentCase: {
          caseName: caseData.case_name,
          caseNumber: caseData.case_number,
          caseType: caseData.case_type,
          client: caseData.client,
          trialDate: caseData.trial_date,
          mscDate: caseData.msc_date,
          court: caseData.court,
          courtCounty: caseData.court_county,
          deadlines: incompleteDeadlines,
          plaintiffCount: (caseData.plaintiffs || []).length,
          defendantCount: (caseData.defendants || []).length
        },
        urgentDeadlines
      }
    } else {
      // DASHBOARD MODE: Fetch all user's cases
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id) // CRITICAL: User isolation
        .order('created_at', { ascending: false })

      if (casesError) {
        return NextResponse.json(
          { error: 'Failed to fetch cases' },
          { status: 500 }
        )
      }

      const allCases = cases || []
      const now = new Date()

      const caseSummaries = allCases.map(c => {
        const deadlines = (c.deadlines || []) as Deadline[]
        const incompleteDeadlines = deadlines.filter(d => !d.completed)
        
        return {
          caseName: c.case_name,
          caseNumber: c.case_number,
          caseType: c.case_type,
          trialDate: c.trial_date,
          incompleteDeadlines: incompleteDeadlines.length
        }
      })

      const urgentDeadlines: AssistantContext['urgentDeadlines'] = []
      allCases.forEach(c => {
        const deadlines = (c.deadlines || []) as Deadline[]
        deadlines
          .filter(d => !d.completed && isWithinDays(d.date, 14))
          .forEach(d => {
            urgentDeadlines.push({
              caseName: c.case_name,
              date: d.date,
              description: d.description,
              daysUntil: getDaysUntil(d.date)
            })
          })
      })

      urgentDeadlines.sort((a, b) => a.daysUntil - b.daysUntil)

      const casesWithUpcomingTrials = allCases.filter(c => 
        c.trial_date && isWithinDays(c.trial_date, 90)
      ).length

      context = {
        mode: 'dashboard',
        profile: {
          name: user.user_metadata?.full_name || user.email || 'User',
          email: user.email || '',
          firm: user.user_metadata?.firm_name,
          billingGoal: user.user_metadata?.billing_goal
        },
        caseOverview: {
          totalCases: allCases.length,
          casesWithUpcomingTrials,
          cases: caseSummaries
        },
        urgentDeadlines
      }
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context)

    // Get OpenAI API key
    const { getOpenAIApiKey, getOpenAIHeaders } = await import('@/lib/openai/config')
    let apiKey: string
    try {
      apiKey = getOpenAIApiKey()
    } catch {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ]

    // Add conversation history (limited to last 10 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10)
      messages.push(...recentHistory)
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Call OpenAI
    const headers = getOpenAIHeaders()
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const assistantMessage = data.choices[0]?.message?.content?.trim() || ''

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      )
    }

    // Log for audit (no PII)
    console.log(`[ASSISTANT] User: ${user.id}, Mode: ${mode}, CaseId: ${caseId || 'N/A'}`)

    return NextResponse.json({ 
      message: assistantMessage,
      context: {
        mode: context.mode,
        caseId: context.caseId,
        caseName: context.currentCase?.caseName
      }
    })

  } catch (error) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}




