import { createClient } from '@/lib/supabase/client'
import { CaseFrontend, Deadline } from '@/lib/supabase/caseStorage'

// Database case type for Supabase queries
interface DbCase {
  id: string
  case_name: string
  case_number: string
  case_type?: string
  client?: string
  trial_date?: string
  msc_date?: string
  court?: string
  court_county?: string
  deadlines?: Deadline[]
  plaintiffs?: Array<{ id: string }>
  defendants?: Array<{ id: string }>
}

export interface AssistantContext {
  mode: 'case' | 'dashboard' | 'profile' | 'disabled'
  caseId?: string
  profile: {
    name: string
    email: string
    firm?: string
    billingGoal?: string
  }
  currentCase?: {
    id: string
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
      id: string
      caseName: string
      caseNumber: string
      caseType?: string
      trialDate?: string
      incompleteDeadlines: number
      nextDeadline?: { date: string; description: string }
    }>
  }
  urgentDeadlines: Array<{
    caseId: string
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

/**
 * Build context for AI assistant - CASE SCOPED MODE
 * Only includes data for a single case - no data leakage
 */
export async function buildCaseScopedContext(
  caseId: string
): Promise<AssistantContext | null> {
  const supabase = createClient()
  
  // CRITICAL: Get authenticated user server-side
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Fetch ONLY this case, verified by user_id
  const { data: caseData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .eq('user_id', user.id) // CRITICAL: User isolation
    .single()
  
  if (error || !caseData) return null
  
  const deadlines = (caseData.deadlines || []) as Deadline[]
  const incompleteDeadlines = deadlines.filter(d => !d.completed)
  
  // Build urgent deadlines for THIS CASE ONLY
  const urgentDeadlines = incompleteDeadlines
    .filter(d => isWithinDays(d.date, 14))
    .map(d => ({
      caseId: caseData.id,
      caseName: caseData.case_name,
      date: d.date,
      description: d.description,
      daysUntil: getDaysUntil(d.date)
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
  
  return {
    mode: 'case',
    caseId,
    profile: {
      name: user.user_metadata?.full_name || user.email || 'User',
      email: user.email || '',
      firm: user.user_metadata?.firm_name,
      billingGoal: user.user_metadata?.billing_goal
    },
    currentCase: {
      id: caseData.id,
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
}

/**
 * Build context for AI assistant - DASHBOARD MODE
 * Includes overview of all user's cases
 */
export async function buildDashboardContext(): Promise<AssistantContext | null> {
  const supabase = createClient()
  
  // CRITICAL: Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Fetch ALL cases for this user ONLY
  const { data: cases, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user.id) // CRITICAL: User isolation
    .order('created_at', { ascending: false })
  
  if (error) return null
  
  const allCases = (cases || []) as DbCase[]
  const now = new Date()
  
  // Build case summaries
  const caseSummaries = allCases.map((c: DbCase) => {
    const deadlines = (c.deadlines || []) as Deadline[]
    const incompleteDeadlines = deadlines.filter(d => !d.completed)
    const sortedDeadlines = incompleteDeadlines
      .filter(d => new Date(d.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    return {
      id: c.id,
      caseName: c.case_name,
      caseNumber: c.case_number,
      caseType: c.case_type,
      trialDate: c.trial_date,
      incompleteDeadlines: incompleteDeadlines.length,
      nextDeadline: sortedDeadlines[0] ? {
        date: sortedDeadlines[0].date,
        description: sortedDeadlines[0].description
      } : undefined
    }
  })
  
  // Collect all urgent deadlines across cases
  const urgentDeadlines: AssistantContext['urgentDeadlines'] = []
  allCases.forEach((c: DbCase) => {
    const deadlines = (c.deadlines || []) as Deadline[]
    deadlines
      .filter(d => !d.completed && isWithinDays(d.date, 14))
      .forEach(d => {
        urgentDeadlines.push({
          caseId: c.id,
          caseName: c.case_name,
          date: d.date,
          description: d.description,
          daysUntil: getDaysUntil(d.date)
        })
      })
  })
  
  urgentDeadlines.sort((a, b) => a.daysUntil - b.daysUntil)
  
  // Count cases with trials in next 90 days
  const casesWithUpcomingTrials = allCases.filter((c: DbCase) => 
    c.trial_date && isWithinDays(c.trial_date, 90)
  ).length
  
  return {
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

/**
 * Build system prompt based on context mode
 */
export function buildSystemPrompt(context: AssistantContext): string {
  const basePrompt = `You are a helpful legal assistant for ${context.profile.name}${context.profile.firm ? ` at ${context.profile.firm}` : ''}. 
You help manage their legal practice, track deadlines, and provide guidance on case workflow.

CRITICAL RULES:
1. Only discuss information provided in the context below
2. Never make up case details, dates, or deadlines
3. Be concise and actionable in your responses
4. If asked about information not in context, say "I don't have that information"
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
   Trial: ${c.trialDate || 'Not set'} | ${c.incompleteDeadlines} pending tasks
   ${c.nextDeadline ? `Next deadline: ${c.nextDeadline.date} - ${c.nextDeadline.description.substring(0, 50)}...` : ''}`
).join('\n\n')}

URGENT DEADLINES (next 14 days):
${context.urgentDeadlines.length > 0
  ? context.urgentDeadlines.slice(0, 15).map(d => 
      `- ${d.date} (${d.daysUntil === 0 ? 'TODAY' : d.daysUntil === 1 ? 'Tomorrow' : `${d.daysUntil} days`}): ${d.caseName} - ${d.description.substring(0, 60)}...`
    ).join('\n')
  : '- No urgent deadlines'}
`
  }

  return basePrompt
}

/**
 * Build opening message based on context
 */
export function buildOpeningMessage(context: AssistantContext): string {
  const greeting = getTimeBasedGreeting()
  const firstName = context.profile.name.split(' ')[0]

  if (context.mode === 'case' && context.currentCase) {
    const deadlineCount = context.currentCase.deadlines.length
    const urgentCount = context.urgentDeadlines.length
    
    let message = `${greeting}, ${firstName}! I'm here to help with **${context.currentCase.caseName}** (${context.currentCase.caseNumber}).\n\n`
    
    if (context.currentCase.trialDate) {
      const trialDays = getDaysUntil(context.currentCase.trialDate)
      if (trialDays > 0 && trialDays <= 90) {
        message += `⚖️ **Trial in ${trialDays} days** (${context.currentCase.trialDate})\n\n`
      }
    }
    
    if (urgentCount > 0) {
      message += `📅 **${urgentCount} deadline${urgentCount > 1 ? 's' : ''} coming up:**\n`
      context.urgentDeadlines.slice(0, 3).forEach(d => {
        const dayLabel = d.daysUntil === 0 ? '🔴 TODAY' : d.daysUntil === 1 ? '🟠 Tomorrow' : `${d.daysUntil} days`
        message += `• ${dayLabel}: ${d.description.substring(0, 50)}${d.description.length > 50 ? '...' : ''}\n`
      })
      message += '\n'
    }
    
    message += `📋 ${deadlineCount} total task${deadlineCount !== 1 ? 's' : ''} pending\n\n`
    message += `What would you like help with on this case?`
    
    return message
  }

  if (context.mode === 'dashboard' && context.caseOverview) {
    let message = `${greeting}, ${firstName}! Here's your practice overview:\n\n`
    
    message += `📊 **${context.caseOverview.totalCases} active case${context.caseOverview.totalCases !== 1 ? 's' : ''}**`
    if (context.caseOverview.casesWithUpcomingTrials > 0) {
      message += ` (${context.caseOverview.casesWithUpcomingTrials} with trials in 90 days)`
    }
    message += '\n\n'
    
    if (context.urgentDeadlines.length > 0) {
      const todayCount = context.urgentDeadlines.filter(d => d.daysUntil === 0).length
      const thisWeekCount = context.urgentDeadlines.filter(d => d.daysUntil <= 7).length
      
      if (todayCount > 0) {
        message += `🔴 **${todayCount} deadline${todayCount > 1 ? 's' : ''} due TODAY**\n`
      }
      if (thisWeekCount > todayCount) {
        message += `📅 ${thisWeekCount - todayCount} more this week\n`
      }
      message += '\n'
      
      message += `**Upcoming:**\n`
      context.urgentDeadlines.slice(0, 4).forEach(d => {
        const dayLabel = d.daysUntil === 0 ? 'TODAY' : d.daysUntil === 1 ? 'Tomorrow' : `${d.daysUntil}d`
        message += `• [${dayLabel}] ${d.caseName}: ${d.description.substring(0, 40)}...\n`
      })
      message += '\n'
    } else {
      message += `✅ No urgent deadlines in the next 2 weeks\n\n`
    }
    
    if (context.profile.billingGoal) {
      message += `🎯 Billing goal: ${context.profile.billingGoal}\n\n`
    }
    
    message += `How can I help you today?`
    
    return message
  }

  return `${greeting}! I'm your legal assistant. How can I help?`
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
