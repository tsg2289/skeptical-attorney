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

type DocumentType = 'demand_letter' | 'complaint' | 'answer' | 'motion' | 'discovery' | 'interrogatories' | 'rfp' | 'rfa' | 'deposition' | 'settlement_agreement'

interface DeadlineAction {
  type: 'deadline_added'
  data: Deadline & { caseId?: string; caseName?: string }
}

interface NavigationAction {
  type: 'navigate'
  data: {
    documentType: DocumentType
    url: string
    caseName?: string
  }
}

interface BillingAction {
  type: 'billing_logged'
  data: {
    caseName: string
    hours: number
    description: string
    id?: string
  }
}

interface AlertAction {
  type: 'alert'
  data: {
    alertType: 'sol_warning' | 'deadline_urgent' | 'conflict' | 'discovery_cutoff'
    message: string
    severity: 'high' | 'medium' | 'low'
  }
}

type AssistantAction = DeadlineAction | NavigationAction | BillingAction | AlertAction

// California Statute of Limitations by case type (in years, from date of loss/incident)
const STATUTE_OF_LIMITATIONS: Record<string, { years: number; description: string }> = {
  'personal_injury': { years: 2, description: 'Personal Injury (CCP § 335.1)' },
  'personal_injury_auto': { years: 2, description: 'Auto Accident (CCP § 335.1)' },
  'personal_injury_premises': { years: 2, description: 'Premises Liability (CCP § 335.1)' },
  'medical_malpractice': { years: 3, description: 'Medical Malpractice (CCP § 340.5) - 3 years from injury or 1 year from discovery' },
  'wrongful_death': { years: 2, description: 'Wrongful Death (CCP § 335.1)' },
  'contract_written': { years: 4, description: 'Written Contract (CCP § 337)' },
  'contract_oral': { years: 2, description: 'Oral Contract (CCP § 339)' },
  'fraud': { years: 3, description: 'Fraud (CCP § 338(d))' },
  'property_damage': { years: 3, description: 'Property Damage (CCP § 338)' },
  'defamation': { years: 1, description: 'Libel/Slander (CCP § 340(c))' },
  'employment': { years: 2, description: 'Employment (various statutes)' },
  'professional_negligence': { years: 2, description: 'Professional Negligence (CCP § 339)' },
}

// California CCP deadline calculation rules
const CCP_DEADLINES = {
  demurrer: { days: 30, description: 'Demurrer to complaint (CCP § 430.40)' },
  answer: { days: 30, description: 'Answer to complaint (CCP § 412.20)' },
  motion_opposition: { days: 9, description: 'Opposition to motion (CCP § 1005(b))' },
  motion_reply: { days: 5, description: 'Reply to opposition (CCP § 1005(b))' },
  discovery_response: { days: 30, description: 'Response to discovery (CCP § 2030.260)' },
  deposition_notice: { days: 10, description: 'Notice of deposition (CCP § 2025.270)' },
  motion_to_compel: { days: 45, description: 'Motion to compel after response (CCP § 2030.300)' },
  summary_judgment_motion: { days: 75, description: 'MSJ hearing notice (CCP § 437c(a))' },
  summary_judgment_opposition: { days: 14, description: 'MSJ opposition (CCP § 437c(b)(2))' },
  summary_judgment_reply: { days: 5, description: 'MSJ reply (CCP § 437c(b)(3))' },
  trial_brief: { days: 5, description: 'Trial brief before trial' },
  witness_list: { days: 10, description: 'Witness list exchange' },
  exhibit_list: { days: 10, description: 'Exhibit list exchange' },
}

// Document type to URL path mapping
const DOCUMENT_ROUTES: Record<DocumentType, (caseId: string) => string> = {
  demand_letter: (caseId) => `/services/demand-letters?caseId=${caseId}`,
  complaint: (caseId) => `/services/pleadings/complaint?caseId=${caseId}`,
  answer: (caseId) => `/services/pleadings/answer?caseId=${caseId}`,
  motion: (caseId) => `/services/law-and-motion?caseId=${caseId}`,
  discovery: (caseId) => `/dashboard/cases/${caseId}/discovery`,
  interrogatories: (caseId) => `/dashboard/cases/${caseId}/discovery/interrogatories`,
  rfp: (caseId) => `/dashboard/cases/${caseId}/discovery/rfp`,
  rfa: (caseId) => `/dashboard/cases/${caseId}/discovery/rfa`,
  deposition: (caseId) => `/services/deposition/depositions/${caseId}`,
  settlement_agreement: (caseId) => `/services/settlement-agreements?caseId=${caseId}`,
}

const DOCUMENT_FRIENDLY_NAMES: Record<DocumentType, string> = {
  demand_letter: 'Demand Letter',
  complaint: 'Complaint',
  answer: 'Answer',
  motion: 'Law & Motion',
  discovery: 'Discovery Hub',
  interrogatories: 'Interrogatories',
  rfp: 'Requests for Production',
  rfa: 'Requests for Admission',
  deposition: 'Deposition Outline',
  settlement_agreement: 'Settlement Agreement',
}

// OpenAI Function Calling tools for CASE mode (single case context)
const CASE_MODE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'add_deadline',
      description: 'Add a deadline or task to the current case calendar. Use this when the user mentions a specific date or deadline for something that needs to be done, such as filing deadlines, hearing dates, response deadlines, or any time-sensitive tasks.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The deadline date in YYYY-MM-DD format. Calculate the correct date based on context (e.g., "next Friday", "in 10 days", "January 15th").'
          },
          description: {
            type: 'string',
            description: 'A clear, professional description of what is due or what needs to happen by this date. Be specific and include relevant legal terminology.'
          }
        },
        required: ['date', 'description']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigate_to_document',
      description: 'Navigate the user to a document drafting page. Use this when the user asks to go to, open, create, draft, work on, or access a specific document type like demand letter, complaint, answer, motion, discovery, deposition, or settlement agreement.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['demand_letter', 'complaint', 'answer', 'motion', 'discovery', 'interrogatories', 'rfp', 'rfa', 'deposition', 'settlement_agreement'],
            description: 'The type of document to navigate to. Use: demand_letter, complaint, answer, motion (for law & motion), discovery (for discovery hub), interrogatories, rfp (requests for production), rfa (requests for admission), deposition, or settlement_agreement.'
          }
        },
        required: ['document_type']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate_deadline',
      description: 'Calculate a legal deadline based on California Code of Civil Procedure. Use when the user asks about deadlines like "when is the opposition due?", "calculate deadline for answer", "how long do I have to respond to discovery?"',
      parameters: {
        type: 'object',
        properties: {
          deadline_type: {
            type: 'string',
            enum: ['demurrer', 'answer', 'motion_opposition', 'motion_reply', 'discovery_response', 'deposition_notice', 'motion_to_compel', 'summary_judgment_motion', 'summary_judgment_opposition', 'summary_judgment_reply', 'trial_brief', 'witness_list', 'exhibit_list'],
            description: 'The type of deadline to calculate'
          },
          from_date: {
            type: 'string',
            description: 'The starting date in YYYY-MM-DD format (e.g., service date, filing date, or hearing date)'
          },
          add_to_calendar: {
            type: 'boolean',
            description: 'Whether to automatically add this calculated deadline to the case calendar (default: true)'
          }
        },
        required: ['deadline_type', 'from_date']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_case_strategy',
      description: 'Provide strategic analysis and next steps for the case. Use when the user asks "what should I do next?", "what are my priorities?", "analyze this case", or requests strategic guidance.',
      parameters: {
        type: 'object',
        properties: {
          focus_area: {
            type: 'string',
            enum: ['next_steps', 'strengths_weaknesses', 'discovery_needed', 'motion_strategy', 'settlement_evaluation', 'trial_preparation'],
            description: 'The specific area to analyze'
          }
        },
        required: ['focus_area']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_statute_of_limitations',
      description: 'Check the statute of limitations status for the case based on case type and date of loss. Use when user asks about SOL, filing deadlines, or if they can still file.',
      parameters: {
        type: 'object',
        properties: {
          case_type: {
            type: 'string',
            enum: ['personal_injury', 'personal_injury_auto', 'personal_injury_premises', 'medical_malpractice', 'wrongful_death', 'contract_written', 'contract_oral', 'fraud', 'property_damage', 'defamation', 'employment', 'professional_negligence'],
            description: 'The type of case for SOL lookup'
          },
          date_of_loss: {
            type: 'string',
            description: 'The date of incident/injury/breach in YYYY-MM-DD format'
          }
        },
        required: ['case_type', 'date_of_loss']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'suggest_discovery',
      description: 'Recommend appropriate discovery based on case type and current stage. Use when user asks "what discovery should I send?", "what should I propound?", or needs discovery guidance.',
      parameters: {
        type: 'object',
        properties: {
          discovery_phase: {
            type: 'string',
            enum: ['initial', 'liability_focused', 'damages_focused', 'expert', 'pre_trial'],
            description: 'The current phase of discovery'
          }
        },
        required: ['discovery_phase']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'log_billing_entry',
      description: 'Log a billing entry for the current case. Use when user says "log time", "bill X hours", "start timer", or mentions time spent on a task.',
      parameters: {
        type: 'object',
        properties: {
          hours: {
            type: 'number',
            description: 'Number of hours to log (e.g., 1.5, 0.25)'
          },
          description: {
            type: 'string',
            description: 'Description of work performed using standard legal billing terminology'
          },
          task_category: {
            type: 'string',
            enum: ['research', 'drafting', 'review', 'correspondence', 'court_appearance', 'deposition', 'client_meeting', 'travel', 'other'],
            description: 'Category of the billable task'
          }
        },
        required: ['hours', 'description']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_case_summary',
      description: 'Generate a professional case summary suitable for client communication. Use when the user asks for a "case summary", "client update", "status report for client", or needs to summarize the case for external communication.',
      parameters: {
        type: 'object',
        properties: {
          summary_type: {
            type: 'string',
            enum: ['client_update', 'status_report', 'case_overview', 'settlement_status'],
            description: 'The type of summary to generate'
          },
          include_deadlines: {
            type: 'boolean',
            description: 'Whether to include upcoming deadlines (default: true)'
          },
          include_next_steps: {
            type: 'boolean',
            description: 'Whether to include recommended next steps (default: true)'
          }
        },
        required: ['summary_type']
      }
    }
  }
]

// OpenAI Function Calling tools for DASHBOARD mode (multiple cases)
const DASHBOARD_MODE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'add_deadline_to_case',
      description: 'Add a deadline or task to a specific case calendar. Use this when the user mentions a deadline AND specifies which case it belongs to (by case name, case number, or client name). If the user mentions a deadline but does NOT specify which case, DO NOT call this function - instead ask the user which case the deadline is for.',
      parameters: {
        type: 'object',
        properties: {
          case_identifier: {
            type: 'string',
            description: 'The case name, case number, or client name that identifies which case this deadline belongs to. Must match one of the cases in the user\'s caseload.'
          },
          date: {
            type: 'string',
            description: 'The deadline date in YYYY-MM-DD format. Calculate the correct date based on context (e.g., "next Friday", "in 10 days", "January 15th").'
          },
          description: {
            type: 'string',
            description: 'A clear, professional description of what is due or what needs to happen by this date. Be specific and include relevant legal terminology.'
          }
        },
        required: ['case_identifier', 'date', 'description']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_morning_briefing',
      description: 'Generate a morning briefing summary of the day\'s schedule and urgent items. Use when user asks for "briefing", "what do I have today?", "morning update", or wants to know their schedule.',
      parameters: {
        type: 'object',
        properties: {
          include_week_ahead: {
            type: 'boolean',
            description: 'Whether to include the upcoming week (default: false)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_workload',
      description: 'Analyze the user\'s workload across all cases. Use when user asks "which cases need attention?", "what\'s my busiest week?", "prioritize my work", or wants workload analysis.',
      parameters: {
        type: 'object',
        properties: {
          time_horizon: {
            type: 'string',
            enum: ['today', 'this_week', 'next_week', 'this_month'],
            description: 'The time period to analyze'
          }
        },
        required: ['time_horizon']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_conflicts',
      description: 'Check for scheduling conflicts and deadline overlaps. Use when user asks about conflicts, overlapping deadlines, or scheduling issues.',
      parameters: {
        type: 'object',
        properties: {
          date_range_start: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format'
          },
          date_range_end: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format'
          }
        },
        required: ['date_range_start', 'date_range_end']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'cross_case_search',
      description: 'Search across all cases for specific information. Use when user asks "show me all cases with depositions", "which cases have trials this month?", "find cases needing discovery".',
      parameters: {
        type: 'object',
        properties: {
          search_type: {
            type: 'string',
            enum: ['depositions_scheduled', 'trials_upcoming', 'discovery_cutoff_approaching', 'cases_needing_attention', 'sol_warnings', 'high_value_cases'],
            description: 'What to search for across cases'
          },
          time_filter: {
            type: 'string',
            enum: ['this_week', 'this_month', 'next_30_days', 'next_90_days'],
            description: 'Time period filter'
          }
        },
        required: ['search_type']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'log_billing_to_case',
      description: 'Log a billing entry for a specific case. Use when user says "log time", "bill X hours for [case]", or mentions time spent on a task for a specific case. If user mentions billing but does NOT specify which case, ask them which case to bill.',
      parameters: {
        type: 'object',
        properties: {
          case_identifier: {
            type: 'string',
            description: 'The case name, case number, or client name that identifies which case to bill. Must match one of the cases in the user\'s caseload.'
          },
          hours: {
            type: 'number',
            description: 'Number of hours to log (e.g., 1.5, 0.25)'
          },
          description: {
            type: 'string',
            description: 'Description of work performed using standard legal billing terminology'
          },
          task_category: {
            type: 'string',
            enum: ['research', 'drafting', 'review', 'correspondence', 'court_appearance', 'deposition', 'client_meeting', 'travel', 'other'],
            description: 'Category of the billable task'
          }
        },
        required: ['case_identifier', 'hours', 'description']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_billing_summary',
      description: 'Generate a billing summary report. Use when the user asks for a "billing summary", "time report", "hours summary", "billing report for today/week/month", or needs to report billable hours to a supervisor.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month', 'custom'],
            description: 'The time period for the billing summary'
          },
          format: {
            type: 'string',
            enum: ['executive', 'detailed', 'by_case', 'by_category'],
            description: 'The format of the summary (executive for boss, detailed for records, by_case for case breakdown, by_category for task breakdown)'
          },
          include_ai_entries: {
            type: 'boolean',
            description: 'Whether to include AI-generated billing entries (default: true)'
          }
        },
        required: ['period', 'format']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_case_summary_for_case',
      description: 'Generate a case summary for a specific case. Use when the user asks for a case summary and specifies which case (by name, number, or client). If case is not specified, ask which case.',
      parameters: {
        type: 'object',
        properties: {
          case_identifier: {
            type: 'string',
            description: 'The case name, case number, or client name to generate summary for'
          },
          summary_type: {
            type: 'string',
            enum: ['client_update', 'status_report', 'case_overview', 'settlement_status'],
            description: 'The type of summary to generate'
          },
          include_deadlines: {
            type: 'boolean',
            description: 'Whether to include upcoming deadlines (default: true)'
          }
        },
        required: ['case_identifier', 'summary_type']
      }
    }
  }
]

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
    casePhase?: string
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
      client?: string
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
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const basePrompt = `You are a highly capable legal assistant for ${context.profile.name}${context.profile.firm ? ` at ${context.profile.firm}` : ''}, specialized in California civil litigation.
You help manage their legal practice with strategic insights, deadline tracking, and proactive case guidance.

TODAY'S DATE: ${todayStr}

CORE CAPABILITIES:
1. **Case Strategy**: Analyze cases, suggest next steps, identify strengths/weaknesses
2. **Deadline Management**: Calculate CCP deadlines, add to calendar, warn about conflicts
3. **Statute of Limitations**: Track SOL based on case type and date of loss
4. **Discovery Guidance**: Recommend appropriate discovery based on case stage
5. **Document Navigation**: Guide user to relevant drafting pages
6. **Billing Support**: Log time entries with proper legal descriptions
7. **Workload Analysis**: Prioritize cases, identify urgent matters

CRITICAL RULES:
1. Be proactive - if you notice an issue (SOL approaching, deadline conflict), mention it
2. Always use California law and CCP for calculations
3. Be concise but thorough - attorneys are busy
4. Use markdown for readability: **bold** for important items, bullet lists for clarity
5. When the user mentions a deadline, ADD it to the calendar using the appropriate function
6. For deadline calculations, always cite the CCP section
7. If asked "what should I do next?", use analyze_case_strategy to give actionable advice
8. Never make up case facts - only use information from context

PROACTIVE ALERTS YOU SHOULD GIVE:
- Statute of limitations warnings if date of loss + SOL period is within 6 months
- Urgent deadlines (within 7 days) - flag them clearly
- Discovery cutoff warnings if trial is set and cutoff is approaching
- Potential conflicts when multiple deadlines fall on same date

DEADLINE CALCULATION (California CCP):
- Add court days for motion deadlines (exclude weekends and court holidays)
- Personal service: deadline runs from date of service
- Mail service: add 5 calendar days (CCP § 1013)
- Electronic service: add 2 court days (CCP § 1010.6)

NAVIGATION: When user asks to draft/open/go to a document, use navigate_to_document function.
BILLING: When user mentions logging time, use log_billing_entry with professional descriptions.
`

  if (context.mode === 'case' && context.currentCase) {
    // Calculate SOL warning if we have case type and date of loss
    let solWarning = ''
    const caseTypeForSol = context.currentCase.caseType?.toLowerCase().replace(/\s+/g, '_')
    // Note: date_of_loss would need to be added to context - for now we'll just show the applicable SOL
    if (caseTypeForSol && STATUTE_OF_LIMITATIONS[caseTypeForSol]) {
      const sol = STATUTE_OF_LIMITATIONS[caseTypeForSol]
      solWarning = `\n⚖️ STATUTE OF LIMITATIONS: ${sol.description} - ${sol.years} year(s) from incident`
    }
    
    // Calculate days until trial
    let trialWarning = ''
    if (context.currentCase.trialDate) {
      const trialDate = new Date(context.currentCase.trialDate)
      const daysUntilTrial = Math.ceil((trialDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilTrial > 0 && daysUntilTrial <= 90) {
        trialWarning = `\n⚠️ TRIAL IN ${daysUntilTrial} DAYS - Discovery cutoff typically 30 days before trial`
      }
    }
    
    return `${basePrompt}
MODE: CASE-SPECIFIC
You are currently helping with ONE specific case. DO NOT discuss or reference any other cases.
If asked about other matters, say: "I'm currently focused on ${context.currentCase.caseName}. To discuss other cases, please navigate to your dashboard."

📋 CURRENT CASE:
- **Name**: ${context.currentCase.caseName}
- **Case Number**: ${context.currentCase.caseNumber}
${context.currentCase.caseType ? `- **Type**: ${context.currentCase.caseType}` : ''}
${context.currentCase.client ? `- **Client**: ${context.currentCase.client}` : ''}
${context.currentCase.trialDate ? `- **Trial Date**: ${context.currentCase.trialDate}` : '- Trial Date: Not set'}
${context.currentCase.mscDate ? `- **MSC Date**: ${context.currentCase.mscDate}` : ''}
${context.currentCase.court ? `- **Court**: ${context.currentCase.court}` : ''}
${context.currentCase.courtCounty ? `- **County**: ${context.currentCase.courtCounty}` : ''}
- **Plaintiffs**: ${context.currentCase.plaintiffCount}
- **Defendants**: ${context.currentCase.defendantCount}
${solWarning}${trialWarning}

🚨 URGENT DEADLINES (next 14 days):
${context.urgentDeadlines.length > 0 
  ? context.urgentDeadlines.map(d => {
      const urgencyIcon = d.daysUntil <= 3 ? '🔴' : d.daysUntil <= 7 ? '🟡' : '🟢'
      return `${urgencyIcon} ${d.date} (${d.daysUntil === 0 ? 'TODAY!' : d.daysUntil === 1 ? 'Tomorrow' : `${d.daysUntil} days`}): ${d.description}`
    }).join('\n')
  : '✅ No urgent deadlines in the next 14 days'}

📅 ALL INCOMPLETE DEADLINES (${context.currentCase.deadlines.length}):
${context.currentCase.deadlines.length > 0
  ? context.currentCase.deadlines.slice(0, 20).map(d => `- ${d.date}: ${d.description}`).join('\n')
  : '- No incomplete deadlines'}

STRATEGIC GUIDANCE AVAILABLE:
- Ask "What should I do next?" for prioritized action items
- Ask "Calculate deadline from [date]" for CCP deadline calculations
- Ask "What discovery should I send?" for case-specific recommendations
- Say "Log [X] hours for [task]" to record billable time
`
  }

  if (context.mode === 'dashboard' && context.caseOverview) {
    // Find cases that might need attention
    const casesNeedingAttention = context.caseOverview.cases.filter(c => {
      if (c.trialDate) {
        const trialDate = new Date(c.trialDate)
        const daysUntilTrial = Math.ceil((trialDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilTrial > 0 && daysUntilTrial <= 90
      }
      return c.incompleteDeadlines > 5
    })
    
    return `${basePrompt}
MODE: DASHBOARD OVERVIEW
You are helping manage the user's entire caseload. You can discuss any of their cases.

DEADLINE MANAGEMENT RULES:
- When user mentions deadline + case: use add_deadline_to_case
- When user mentions deadline without case: ASK which case
- Match flexibly: "Smith case", "the Johnson matter", "CV-2024-001"

${context.profile.billingGoal ? `💰 BILLING GOAL: ${context.profile.billingGoal}` : ''}

📊 CASELOAD SUMMARY:
- **Total Active Cases**: ${context.caseOverview.totalCases}
- **Cases with trials in 90 days**: ${context.caseOverview.casesWithUpcomingTrials}
${casesNeedingAttention.length > 0 ? `- **⚠️ Cases needing attention**: ${casesNeedingAttention.length}` : ''}

📁 YOUR CASES:
${context.caseOverview.cases.map(c => {
  let urgencyFlag = ''
  if (c.trialDate) {
    const trialDate = new Date(c.trialDate)
    const daysUntilTrial = Math.ceil((trialDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilTrial > 0 && daysUntilTrial <= 30) urgencyFlag = '🔴 '
    else if (daysUntilTrial > 0 && daysUntilTrial <= 90) urgencyFlag = '🟡 '
  }
  return `${urgencyFlag}"${c.caseName}" (Case #${c.caseNumber})${c.client ? ` - ${c.client}` : ''}${c.caseType ? ` [${c.caseType}]` : ''}
   Trial: ${c.trialDate || 'Not set'} | ${c.incompleteDeadlines} pending tasks`
}).join('\n')}

🚨 URGENT DEADLINES (next 14 days):
${context.urgentDeadlines.length > 0
  ? context.urgentDeadlines.slice(0, 15).map(d => {
      const urgencyIcon = d.daysUntil <= 3 ? '🔴' : d.daysUntil <= 7 ? '🟡' : '🟢'
      return `${urgencyIcon} ${d.date} (${d.daysUntil === 0 ? 'TODAY!' : d.daysUntil === 1 ? 'Tomorrow' : `${d.daysUntil} days`}): **${d.caseName}** - ${d.description.substring(0, 60)}...`
    }).join('\n')
  : '✅ No urgent deadlines - great job staying on top of things!'}

DASHBOARD COMMANDS:
- "Give me a morning briefing" - Summary of today + upcoming week
- "Which cases need attention?" - Priority analysis
- "Check for conflicts next week" - Deadline conflict detection
- "Show cases with depositions this month" - Cross-case search
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
          casePhase: caseData.case_phase,
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
          id: c.id,
          caseName: c.case_name,
          caseNumber: c.case_number,
          caseType: c.case_type,
          client: c.client,
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

    // Call OpenAI with tools enabled based on mode
    const headers = getOpenAIHeaders()
    const useCaseTools = mode === 'case' && caseId
    const useDashboardTools = mode === 'dashboard' && context.caseOverview && context.caseOverview.cases.length > 0
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 800,
        ...(useCaseTools && {
          tools: CASE_MODE_TOOLS,
          tool_choice: 'auto'
        }),
        ...(useDashboardTools && {
          tools: DASHBOARD_MODE_TOOLS,
          tool_choice: 'auto'
        })
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
    const choice = data.choices[0]
    const actions: AssistantAction[] = []

    // Helper function to find a case by identifier (name, number, or client)
    const findCaseByIdentifier = (identifier: string, cases: Array<{ id: string; caseName: string; caseNumber: string; caseType?: string; client?: string; trialDate?: string; incompleteDeadlines: number }>) => {
      const searchTerm = identifier.toLowerCase().trim()
      
      // Try exact matches first
      let match = cases.find(c => 
        c.caseName.toLowerCase() === searchTerm ||
        c.caseNumber.toLowerCase() === searchTerm ||
        (c.client && c.client.toLowerCase() === searchTerm)
      )
      
      if (match) return match
      
      // Try partial matches
      match = cases.find(c => 
        c.caseName.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(c.caseName.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchTerm) ||
        (c.client && (c.client.toLowerCase().includes(searchTerm) || searchTerm.includes(c.client.toLowerCase())))
      )
      
      return match
    }

    // Check if there are tool calls (function calling)
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults: Array<{ toolCallId: string; success: boolean; message: string }> = []
      
      // Process each tool call
      for (const toolCall of choice.message.tool_calls) {
        // Handle CASE MODE: navigate_to_document
        if (toolCall.function.name === 'navigate_to_document' && caseId) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const documentType = args.document_type as DocumentType
            
            if (DOCUMENT_ROUTES[documentType]) {
              const url = DOCUMENT_ROUTES[documentType](caseId)
              const friendlyName = DOCUMENT_FRIENDLY_NAMES[documentType]
              
              actions.push({
                type: 'navigate',
                data: {
                  documentType,
                  url,
                  caseName: context.currentCase?.caseName
                }
              })
              
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: true, 
                message: `Navigating to ${friendlyName} for case "${context.currentCase?.caseName}"` 
              })
              console.log(`[ASSISTANT] Navigation to ${documentType} for case ${caseId}`)
            } else {
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: false, 
                message: `Unknown document type: ${documentType}` 
              })
            }
          } catch (parseError) {
            console.error('Error parsing navigate tool call:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to parse navigation request' })
          }
        }
        
        // Handle CASE MODE: add_deadline (to current case)
        if (toolCall.function.name === 'add_deadline' && caseId) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            
            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            if (!dateRegex.test(args.date)) {
              console.error('Invalid date format from AI:', args.date)
              toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Invalid date format' })
              continue
            }
            
            // Fetch current case deadlines
            const { data: currentCase } = await supabase
              .from('cases')
              .select('deadlines, case_name')
              .eq('id', caseId)
              .eq('user_id', user.id)
              .single()
            
            if (currentCase) {
              const existingDeadlines = (currentCase.deadlines || []) as Deadline[]
              
              // Create new deadline
              const newDeadline: Deadline = {
                id: `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: args.date,
                description: args.description,
                completed: false
              }
              
              // Update case with new deadline
              const { error: updateError } = await supabase
                .from('cases')
                .update({ deadlines: [...existingDeadlines, newDeadline] })
                .eq('id', caseId)
                .eq('user_id', user.id)
              
              if (!updateError) {
                actions.push({
                  type: 'deadline_added',
                  data: { ...newDeadline, caseId, caseName: currentCase.case_name }
                })
                toolResults.push({ toolCallId: toolCall.id, success: true, message: `Deadline added successfully to ${currentCase.case_name}` })
                console.log(`[ASSISTANT] Deadline added: ${args.description} on ${args.date}`)
              } else {
                console.error('Failed to add deadline:', updateError)
                toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Database error adding deadline' })
              }
            }
          } catch (parseError) {
            console.error('Error parsing tool call arguments:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to parse arguments' })
          }
        }
        
        // Handle CASE MODE: calculate_deadline
        if (toolCall.function.name === 'calculate_deadline' && caseId) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const deadlineType = args.deadline_type as keyof typeof CCP_DEADLINES
            const fromDate = new Date(args.from_date)
            const addToCalendar = args.add_to_calendar !== false
            
            if (CCP_DEADLINES[deadlineType]) {
              const deadline = CCP_DEADLINES[deadlineType]
              
              // Calculate deadline (add days, skip weekends for court days)
              let calculatedDate = new Date(fromDate)
              let daysToAdd = deadline.days
              
              // For motion deadlines, use court days (skip weekends)
              const courtDayDeadlines = ['motion_opposition', 'motion_reply', 'summary_judgment_reply']
              if (courtDayDeadlines.includes(deadlineType)) {
                while (daysToAdd > 0) {
                  calculatedDate.setDate(calculatedDate.getDate() + 1)
                  const day = calculatedDate.getDay()
                  if (day !== 0 && day !== 6) daysToAdd-- // Skip weekends
                }
              } else {
                calculatedDate.setDate(calculatedDate.getDate() + deadline.days)
              }
              
              const calculatedDateStr = calculatedDate.toISOString().split('T')[0]
              
              // Optionally add to calendar
              if (addToCalendar) {
                const { data: currentCase } = await supabase
                  .from('cases')
                  .select('deadlines, case_name')
                  .eq('id', caseId)
                  .eq('user_id', user.id)
                  .single()
                
                if (currentCase) {
                  const existingDeadlines = (currentCase.deadlines || []) as Deadline[]
                  const newDeadline: Deadline = {
                    id: `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    date: calculatedDateStr,
                    description: deadline.description,
                    completed: false
                  }
                  
                  await supabase
                    .from('cases')
                    .update({ deadlines: [...existingDeadlines, newDeadline] })
                    .eq('id', caseId)
                    .eq('user_id', user.id)
                  
                  actions.push({
                    type: 'deadline_added',
                    data: { ...newDeadline, caseId, caseName: currentCase.case_name }
                  })
                }
              }
              
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: true, 
                message: `Calculated: ${deadline.description} is due ${calculatedDateStr}. ${addToCalendar ? 'Added to calendar.' : ''}`
              })
            } else {
              toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Unknown deadline type' })
            }
          } catch (parseError) {
            console.error('Error calculating deadline:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to calculate deadline' })
          }
        }
        
        // Handle CASE MODE: analyze_case_strategy
        if (toolCall.function.name === 'analyze_case_strategy' && context.currentCase) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const focusArea = args.focus_area
            
            // Build strategic analysis based on case context
            let analysis = ''
            
            switch (focusArea) {
              case 'next_steps':
                const hasTrialDate = !!context.currentCase.trialDate
                const urgentCount = context.urgentDeadlines.length
                analysis = `Next Steps Analysis for ${context.currentCase.caseName}:\n`
                analysis += `- ${urgentCount > 0 ? `Address ${urgentCount} urgent deadline(s) first` : 'No urgent deadlines'}\n`
                analysis += `- ${hasTrialDate ? `Trial preparation needed (trial date: ${context.currentCase.trialDate})` : 'Consider setting trial date or MSC'}\n`
                analysis += `- Review discovery status and upcoming deadlines`
                break
              case 'discovery_needed':
                analysis = `Discovery Recommendations for ${context.currentCase.caseType || 'this case'}:\n`
                analysis += `- Written discovery: Interrogatories, RFPs, RFAs\n`
                analysis += `- Depositions: Key witnesses and parties\n`
                analysis += `- Subpoenas: Third-party records if applicable`
                break
              default:
                analysis = `Strategic analysis for ${context.currentCase.caseName} in progress...`
            }
            
            toolResults.push({ 
              toolCallId: toolCall.id, 
              success: true, 
              message: analysis
            })
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to analyze case' })
          }
        }
        
        // Handle CASE MODE: check_statute_of_limitations
        if (toolCall.function.name === 'check_statute_of_limitations') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const caseType = args.case_type as keyof typeof STATUTE_OF_LIMITATIONS
            const dateOfLoss = new Date(args.date_of_loss)
            
            if (STATUTE_OF_LIMITATIONS[caseType]) {
              const sol = STATUTE_OF_LIMITATIONS[caseType]
              const expirationDate = new Date(dateOfLoss)
              expirationDate.setFullYear(expirationDate.getFullYear() + sol.years)
              
              const today = new Date()
              const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              
              let status = ''
              if (daysRemaining < 0) {
                status = `⚠️ EXPIRED - SOL expired ${Math.abs(daysRemaining)} days ago!`
                actions.push({
                  type: 'alert',
                  data: {
                    alertType: 'sol_warning',
                    message: `Statute of limitations has EXPIRED for this ${caseType} case`,
                    severity: 'high'
                  }
                })
              } else if (daysRemaining <= 30) {
                status = `🔴 CRITICAL - Only ${daysRemaining} days remaining!`
              } else if (daysRemaining <= 180) {
                status = `🟡 WARNING - ${daysRemaining} days remaining (${Math.floor(daysRemaining / 30)} months)`
              } else {
                status = `🟢 OK - ${daysRemaining} days remaining (expires ${expirationDate.toISOString().split('T')[0]})`
              }
              
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: true, 
                message: `${sol.description}\nDate of Loss: ${args.date_of_loss}\nExpiration: ${expirationDate.toISOString().split('T')[0]}\nStatus: ${status}`
              })
            } else {
              toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Unknown case type for SOL lookup' })
            }
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to check SOL' })
          }
        }
        
        // Handle CASE MODE: suggest_discovery
        if (toolCall.function.name === 'suggest_discovery' && context.currentCase) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const phase = args.discovery_phase
            const caseType = context.currentCase.caseType?.toLowerCase() || 'general'
            
            let suggestions = `Discovery Recommendations (${phase} phase):\n\n`
            
            switch (phase) {
              case 'initial':
                suggestions += `**Written Discovery:**\n`
                suggestions += `- Form Interrogatories (DISC-001)\n`
                suggestions += `- Special Interrogatories (15-25 questions)\n`
                suggestions += `- Requests for Production of Documents\n`
                suggestions += `- Requests for Admission (if applicable)\n\n`
                suggestions += `**Key Documents to Request:**\n`
                if (caseType.includes('injury') || caseType.includes('auto')) {
                  suggestions += `- Insurance policies and declarations\n`
                  suggestions += `- Medical records and bills\n`
                  suggestions += `- Employment/wage records\n`
                  suggestions += `- Incident/accident reports\n`
                } else {
                  suggestions += `- Contracts and agreements\n`
                  suggestions += `- Communications (emails, texts)\n`
                  suggestions += `- Financial documents\n`
                }
                break
              case 'liability_focused':
                suggestions += `Focus on establishing/defending liability:\n`
                suggestions += `- Depose key witnesses\n`
                suggestions += `- Subpoena third-party records\n`
                suggestions += `- Expert witness designations\n`
                break
              case 'damages_focused':
                suggestions += `Focus on proving/limiting damages:\n`
                suggestions += `- IME if not yet conducted\n`
                suggestions += `- Updated medical records\n`
                suggestions += `- Economic expert reports\n`
                suggestions += `- Life care plans if applicable\n`
                break
              default:
                suggestions += `Standard discovery applicable to case type.`
            }
            
            toolResults.push({ toolCallId: toolCall.id, success: true, message: suggestions })
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to generate discovery suggestions' })
          }
        }
        
        // Handle CASE MODE: log_billing_entry
        if (toolCall.function.name === 'log_billing_entry' && context.currentCase && caseId) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const hours = parseFloat(args.hours)
            const description = args.description
            const taskCategory = args.task_category || 'other'
            
            // Insert billing entry into database
            const { data: billingEntry, error: billingError } = await supabase
              .from('billing_entries')
              .insert({
                user_id: user.id,
                case_id: caseId,
                case_name: context.currentCase.caseName,
                description: `[${taskCategory.toUpperCase()}] ${description}`,
                hours: hours,
                billing_date: new Date().toISOString().split('T')[0],
                is_ai_generated: true
              })
              .select()
              .single()
            
            if (billingError) {
              console.error('Failed to save billing entry:', billingError)
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: false, 
                message: 'Failed to save billing entry to database' 
              })
            } else {
              actions.push({
                type: 'billing_logged',
                data: {
                  caseName: context.currentCase.caseName,
                  hours,
                  description,
                  id: billingEntry?.id
                }
              })
              
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: true, 
                message: `✅ Logged ${hours} hours for "${description}" on ${context.currentCase.caseName}. Entry saved to billing.`
              })
              console.log(`[BILLING] Saved to DB - Case: ${context.currentCase.caseName}, Hours: ${hours}, Desc: ${description}`)
            }
          } catch (parseError) {
            console.error('Error logging billing:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to log billing entry' })
          }
        }
        
        // Handle CASE MODE: generate_case_summary
        if (toolCall.function.name === 'generate_case_summary' && context.currentCase && caseId) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const summaryType = args.summary_type
            const includeDeadlines = args.include_deadlines !== false
            const includeNextSteps = args.include_next_steps !== false
            
            const caseData = context.currentCase
            
            // Fetch recent deadlines for this case
            let deadlinesInfo = ''
            if (includeDeadlines) {
              const { data: deadlines } = await supabase
                .from('deadlines')
                .select('*')
                .eq('case_id', caseId)
                .eq('user_id', user.id)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true })
                .limit(5)
              
              if (deadlines && deadlines.length > 0) {
                deadlinesInfo = deadlines.map(d => `- ${d.title}: ${d.date}`).join('\n')
              }
            }
            
            // Fetch recent billing for context
            const { data: recentBilling } = await supabase
              .from('billing_entries')
              .select('*')
              .eq('case_id', caseId)
              .eq('user_id', user.id)
              .order('billing_date', { ascending: false })
              .limit(10)
            
            const totalHours = recentBilling?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0
            
            // Build summary based on type
            let summary = ''
            
            if (summaryType === 'client_update') {
              summary = `📧 **Client Update for ${caseData.caseName}**\n\n`
              summary += `**Case Status:** ${caseData.casePhase || 'Active'}\n\n`
              
              if (caseData.caseType) {
                summary += `**Case Type:** ${caseData.caseType}\n`
              }
              
              if (caseData.court) {
                summary += `**Court:** ${caseData.court}\n`
              }
              
              summary += `\n**Recent Progress:**\n`
              summary += `We have been actively working on your case. `
              
              if (recentBilling && recentBilling.length > 0) {
                const recentWork = recentBilling.slice(0, 3).map(b => b.description.replace(/^\[[^\]]+\]\s*/, '')).join('; ')
                summary += `Recent work includes: ${recentWork}.\n`
              }
              
              if (includeDeadlines && deadlinesInfo) {
                summary += `\n**Upcoming Deadlines:**\n${deadlinesInfo}\n`
              }
              
              if (includeNextSteps) {
                summary += `\n**Next Steps:**\n`
                summary += `- Continue progressing through ${caseData.casePhase || 'current phase'}\n`
                summary += `- We will keep you informed of any important developments\n`
              }
              
            } else if (summaryType === 'status_report') {
              summary = `📋 **Status Report: ${caseData.caseName}**\n\n`
              summary += `**Client:** ${caseData.client || 'N/A'}\n`
              summary += `**Case Number:** ${caseData.caseNumber || 'Pending'}\n`
              summary += `**Phase:** ${caseData.casePhase || 'Active'}\n`
              summary += `**Case Type:** ${caseData.caseType || 'N/A'}\n\n`
              
              if (caseData.court) {
                summary += `**Court:** ${caseData.court}\n`
              }
              
              summary += `\n**Billing Summary:**\n`
              summary += `- Total Hours Logged: ${totalHours.toFixed(1)}\n`
              
              if (includeDeadlines && deadlinesInfo) {
                summary += `\n**Upcoming Deadlines:**\n${deadlinesInfo}\n`
              }
              
            } else if (summaryType === 'case_overview') {
              summary = `📁 **Case Overview: ${caseData.caseName}**\n\n`
              summary += `**Client:** ${caseData.client || 'N/A'}\n`
              summary += `**Case Type:** ${caseData.caseType || 'N/A'}\n`
              summary += `**Phase:** ${caseData.casePhase || 'Active'}\n\n`
              
              if (caseData.court) {
                summary += `**Venue:** ${caseData.court}\n`
                if (caseData.caseNumber) summary += `**Case No:** ${caseData.caseNumber}\n`
              }
              
              if (includeDeadlines && deadlinesInfo) {
                summary += `\n**Key Dates:**\n${deadlinesInfo}\n`
              }
              
            } else if (summaryType === 'settlement_status') {
              summary = `💰 **Settlement Status: ${caseData.caseName}**\n\n`
              summary += `**Case Phase:** ${caseData.casePhase || 'Active'}\n\n`
              summary += `This summary provides an overview of settlement-related activities.\n`
              summary += `Total hours invested: ${totalHours.toFixed(1)}\n`
            }
            
            toolResults.push({
              toolCallId: toolCall.id,
              success: true,
              message: summary
            })
            
          } catch (parseError) {
            console.error('Error generating case summary:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to generate case summary' })
          }
        }
        
        // Handle DASHBOARD MODE: get_morning_briefing
        if (toolCall.function.name === 'get_morning_briefing' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments || '{}')
            const includeWeek = args.include_week_ahead === true
            
            const today = new Date()
            const todayStr = today.toISOString().split('T')[0]
            
            // Find today's deadlines
            const todayDeadlines = context.urgentDeadlines.filter(d => d.date === todayStr)
            const tomorrowDeadlines = context.urgentDeadlines.filter(d => d.daysUntil === 1)
            const weekDeadlines = context.urgentDeadlines.filter(d => d.daysUntil > 1 && d.daysUntil <= 7)
            
            let briefing = `📋 **Morning Briefing - ${todayStr}**\n\n`
            
            briefing += `**TODAY:**\n`
            if (todayDeadlines.length > 0) {
              todayDeadlines.forEach(d => {
                briefing += `🔴 ${d.caseName}: ${d.description}\n`
              })
            } else {
              briefing += `✅ No deadlines due today\n`
            }
            
            briefing += `\n**TOMORROW:**\n`
            if (tomorrowDeadlines.length > 0) {
              tomorrowDeadlines.forEach(d => {
                briefing += `🟡 ${d.caseName}: ${d.description}\n`
              })
            } else {
              briefing += `No deadlines tomorrow\n`
            }
            
            if (includeWeek) {
              briefing += `\n**THIS WEEK:**\n`
              if (weekDeadlines.length > 0) {
                weekDeadlines.forEach(d => {
                  briefing += `📅 ${d.date} (${d.daysUntil}d): ${d.caseName} - ${d.description}\n`
                })
              } else {
                briefing += `No other deadlines this week\n`
              }
            }
            
            briefing += `\n**CASELOAD:** ${context.caseOverview.totalCases} active cases`
            if (context.caseOverview.casesWithUpcomingTrials > 0) {
              briefing += ` | ${context.caseOverview.casesWithUpcomingTrials} with trials in 90 days`
            }
            
            toolResults.push({ toolCallId: toolCall.id, success: true, message: briefing })
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to generate briefing' })
          }
        }
        
        // Handle DASHBOARD MODE: analyze_workload
        if (toolCall.function.name === 'analyze_workload' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const horizon = args.time_horizon
            
            let daysAhead = 7
            if (horizon === 'today') daysAhead = 0
            else if (horizon === 'this_week') daysAhead = 7
            else if (horizon === 'next_week') daysAhead = 14
            else if (horizon === 'this_month') daysAhead = 30
            
            const relevantDeadlines = context.urgentDeadlines.filter(d => d.daysUntil <= daysAhead)
            
            // Group by case
            const caseWorkload: Record<string, number> = {}
            relevantDeadlines.forEach(d => {
              caseWorkload[d.caseName] = (caseWorkload[d.caseName] || 0) + 1
            })
            
            let analysis = `📊 **Workload Analysis (${horizon.replace('_', ' ')})**\n\n`
            analysis += `Total deadlines: ${relevantDeadlines.length}\n\n`
            
            if (Object.keys(caseWorkload).length > 0) {
              analysis += `**By Case (sorted by workload):**\n`
              Object.entries(caseWorkload)
                .sort((a, b) => b[1] - a[1])
                .forEach(([caseName, count]) => {
                  const urgency = count >= 3 ? '🔴' : count >= 2 ? '🟡' : '🟢'
                  analysis += `${urgency} ${caseName}: ${count} deadline(s)\n`
                })
            } else {
              analysis += `✅ No deadlines in this period\n`
            }
            
            toolResults.push({ toolCallId: toolCall.id, success: true, message: analysis })
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to analyze workload' })
          }
        }
        
        // Handle DASHBOARD MODE: check_conflicts
        if (toolCall.function.name === 'check_conflicts' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const startDate = new Date(args.date_range_start)
            const endDate = new Date(args.date_range_end)
            
            // Group deadlines by date
            const deadlinesByDate: Record<string, Array<{ caseName: string; description: string }>> = {}
            
            context.urgentDeadlines.forEach(d => {
              const deadlineDate = new Date(d.date)
              if (deadlineDate >= startDate && deadlineDate <= endDate) {
                if (!deadlinesByDate[d.date]) deadlinesByDate[d.date] = []
                deadlinesByDate[d.date].push({ caseName: d.caseName, description: d.description })
              }
            })
            
            // Find conflicts (multiple deadlines on same day)
            const conflicts = Object.entries(deadlinesByDate).filter(([, items]) => items.length > 1)
            
            let report = `🔍 **Conflict Check (${args.date_range_start} to ${args.date_range_end})**\n\n`
            
            if (conflicts.length > 0) {
              report += `⚠️ **Found ${conflicts.length} date(s) with multiple deadlines:**\n\n`
              conflicts.forEach(([date, items]) => {
                report += `**${date}** (${items.length} items):\n`
                items.forEach(item => {
                  report += `  - ${item.caseName}: ${item.description}\n`
                })
                report += `\n`
              })
            } else {
              report += `✅ No scheduling conflicts found in this period.\n`
            }
            
            toolResults.push({ toolCallId: toolCall.id, success: true, message: report })
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to check conflicts' })
          }
        }
        
        // Handle DASHBOARD MODE: cross_case_search
        if (toolCall.function.name === 'cross_case_search' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const searchType = args.search_type
            const timeFilter = args.time_filter || 'next_30_days'
            
            let daysAhead = 30
            if (timeFilter === 'this_week') daysAhead = 7
            else if (timeFilter === 'this_month') daysAhead = 30
            else if (timeFilter === 'next_30_days') daysAhead = 30
            else if (timeFilter === 'next_90_days') daysAhead = 90
            
            let results = `🔎 **Cross-Case Search: ${searchType.replace(/_/g, ' ')}**\n\n`
            
            switch (searchType) {
              case 'trials_upcoming':
                const trialsUpcoming = context.caseOverview.cases.filter(c => {
                  if (!c.trialDate) return false
                  const trialDate = new Date(c.trialDate)
                  const daysUntil = Math.ceil((trialDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return daysUntil > 0 && daysUntil <= daysAhead
                })
                if (trialsUpcoming.length > 0) {
                  trialsUpcoming.forEach(c => {
                    results += `📅 **${c.caseName}** - Trial: ${c.trialDate}\n`
                  })
                } else {
                  results += `No trials scheduled in the next ${daysAhead} days.\n`
                }
                break
              case 'cases_needing_attention':
                const needsAttention = context.caseOverview.cases.filter(c => c.incompleteDeadlines >= 3)
                if (needsAttention.length > 0) {
                  needsAttention.sort((a, b) => b.incompleteDeadlines - a.incompleteDeadlines)
                  needsAttention.forEach(c => {
                    results += `⚠️ **${c.caseName}** - ${c.incompleteDeadlines} pending tasks\n`
                  })
                } else {
                  results += `All cases are in good shape! No cases with excessive pending tasks.\n`
                }
                break
              default:
                results += `Search type "${searchType}" - results would appear here.\n`
            }
            
            toolResults.push({ toolCallId: toolCall.id, success: true, message: results })
          } catch (parseError) {
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to perform cross-case search' })
          }
        }
        
        // Handle DASHBOARD MODE: log_billing_to_case (billing for a specific case)
        if (toolCall.function.name === 'log_billing_to_case' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const hours = parseFloat(args.hours)
            const description = args.description
            const taskCategory = args.task_category || 'other'
            
            // Find the case by identifier
            const matchedCase = findCaseByIdentifier(args.case_identifier, context.caseOverview.cases)
            
            if (!matchedCase) {
              console.log(`[BILLING] Could not find case matching: ${args.case_identifier}`)
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: false, 
                message: `Could not find a case matching "${args.case_identifier}". Please ask the user to specify the exact case name or number.` 
              })
              continue
            }
            
            // Insert billing entry into database
            const { data: billingEntry, error: billingError } = await supabase
              .from('billing_entries')
              .insert({
                user_id: user.id,
                case_id: matchedCase.id,
                case_name: matchedCase.caseName,
                description: `[${taskCategory.toUpperCase()}] ${description}`,
                hours: hours,
                billing_date: new Date().toISOString().split('T')[0],
                is_ai_generated: true
              })
              .select()
              .single()
            
            if (billingError) {
              console.error('Failed to save billing entry:', billingError)
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: false, 
                message: 'Failed to save billing entry to database' 
              })
            } else {
              actions.push({
                type: 'billing_logged',
                data: {
                  caseName: matchedCase.caseName,
                  hours,
                  description,
                  id: billingEntry?.id
                }
              })
              
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: true, 
                message: `✅ Logged ${hours} hours for "${description}" on case "${matchedCase.caseName}". Entry saved to billing.`
              })
              console.log(`[BILLING] Saved to DB - Case: ${matchedCase.caseName}, Hours: ${hours}, Desc: ${description}`)
            }
          } catch (parseError) {
            console.error('Error logging billing to case:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to log billing entry' })
          }
        }
        
        // Handle DASHBOARD MODE: generate_billing_summary
        if (toolCall.function.name === 'generate_billing_summary') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const period = args.period
            const format = args.format
            const includeAiEntries = args.include_ai_entries !== false
            
            // Calculate date range based on period
            const today = new Date()
            let startDate: string
            let endDate = today.toISOString().split('T')[0]
            
            if (period === 'today') {
              startDate = endDate
            } else if (period === 'week') {
              const weekAgo = new Date(today)
              weekAgo.setDate(weekAgo.getDate() - 7)
              startDate = weekAgo.toISOString().split('T')[0]
            } else if (period === 'month') {
              const monthAgo = new Date(today)
              monthAgo.setMonth(monthAgo.getMonth() - 1)
              startDate = monthAgo.toISOString().split('T')[0]
            } else {
              // Custom - default to last 30 days
              const thirtyDaysAgo = new Date(today)
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              startDate = thirtyDaysAgo.toISOString().split('T')[0]
            }
            
            // Fetch billing entries for the period
            let query = supabase
              .from('billing_entries')
              .select('*')
              .eq('user_id', user.id)
              .gte('billing_date', startDate)
              .lte('billing_date', endDate)
              .order('billing_date', { ascending: false })
            
            if (!includeAiEntries) {
              query = query.neq('is_ai_generated', true)
            }
            
            const { data: entries, error: fetchError } = await query
            
            if (fetchError) {
              console.error('Failed to fetch billing entries:', fetchError)
              toolResults.push({
                toolCallId: toolCall.id,
                success: false,
                message: 'Failed to fetch billing data'
              })
              continue
            }
            
            if (!entries || entries.length === 0) {
              toolResults.push({
                toolCallId: toolCall.id,
                success: true,
                message: `📊 **Billing Summary (${period})**\n\nNo billing entries found for this period.`
              })
              continue
            }
            
            const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0)
            let summary = ''
            
            if (format === 'executive') {
              // Executive summary for boss
              summary = `📊 **Executive Billing Summary**\n`
              summary += `**Period:** ${startDate} to ${endDate}\n\n`
              summary += `**Total Hours:** ${totalHours.toFixed(1)}\n`
              summary += `**Total Entries:** ${entries.length}\n\n`
              
              // Group by case
              const byCase: Record<string, number> = {}
              entries.forEach(e => {
                const caseName = e.case_name || 'Unassigned'
                byCase[caseName] = (byCase[caseName] || 0) + (e.hours || 0)
              })
              
              summary += `**By Case:**\n`
              Object.entries(byCase)
                .sort((a, b) => b[1] - a[1])
                .forEach(([caseName, hours]) => {
                  summary += `- ${caseName}: ${hours.toFixed(1)} hrs\n`
                })
                
            } else if (format === 'detailed') {
              // Detailed listing
              summary = `📋 **Detailed Billing Report**\n`
              summary += `**Period:** ${startDate} to ${endDate}\n\n`
              
              entries.slice(0, 20).forEach(e => {
                summary += `- **${e.billing_date}** | ${e.hours}h | ${e.case_name || 'N/A'}\n`
                summary += `  ${e.description}\n`
              })
              
              if (entries.length > 20) {
                summary += `\n... and ${entries.length - 20} more entries\n`
              }
              
              summary += `\n**Total:** ${totalHours.toFixed(1)} hours\n`
              
            } else if (format === 'by_case') {
              // Breakdown by case
              summary = `📁 **Billing by Case**\n`
              summary += `**Period:** ${startDate} to ${endDate}\n\n`
              
              const byCase: Record<string, { hours: number, entries: typeof entries }> = {}
              entries.forEach(e => {
                const caseName = e.case_name || 'Unassigned'
                if (!byCase[caseName]) byCase[caseName] = { hours: 0, entries: [] }
                byCase[caseName].hours += (e.hours || 0)
                byCase[caseName].entries.push(e)
              })
              
              Object.entries(byCase)
                .sort((a, b) => b[1].hours - a[1].hours)
                .forEach(([caseName, data]) => {
                  summary += `**${caseName}:** ${data.hours.toFixed(1)} hrs (${data.entries.length} entries)\n`
                })
              
              summary += `\n**Total:** ${totalHours.toFixed(1)} hours across ${Object.keys(byCase).length} cases\n`
              
            } else if (format === 'by_category') {
              // Breakdown by task category
              summary = `🏷️ **Billing by Category**\n`
              summary += `**Period:** ${startDate} to ${endDate}\n\n`
              
              const byCategory: Record<string, number> = {}
              entries.forEach(e => {
                // Extract category from description if prefixed with [CATEGORY]
                const match = e.description?.match(/^\[([^\]]+)\]/)
                const category = match ? match[1] : 'Other'
                byCategory[category] = (byCategory[category] || 0) + (e.hours || 0)
              })
              
              Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .forEach(([category, hours]) => {
                  const percentage = ((hours / totalHours) * 100).toFixed(0)
                  summary += `- **${category}:** ${hours.toFixed(1)} hrs (${percentage}%)\n`
                })
              
              summary += `\n**Total:** ${totalHours.toFixed(1)} hours\n`
            }
            
            toolResults.push({
              toolCallId: toolCall.id,
              success: true,
              message: summary
            })
            
          } catch (parseError) {
            console.error('Error generating billing summary:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to generate billing summary' })
          }
        }
        
        // Handle DASHBOARD MODE: generate_case_summary_for_case
        if (toolCall.function.name === 'generate_case_summary_for_case' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const caseIdentifier = args.case_identifier
            const summaryType = args.summary_type
            const includeDeadlines = args.include_deadlines !== false
            
            // Find the case
            const matchedCase = findCaseByIdentifier(caseIdentifier, context.caseOverview.cases)
            
            if (!matchedCase) {
              toolResults.push({
                toolCallId: toolCall.id,
                success: false,
                message: `Could not find a case matching "${caseIdentifier}". Please specify the exact case name or number.`
              })
              continue
            }
            
            // Fetch detailed case data
            const { data: fullCase } = await supabase
              .from('cases')
              .select('*')
              .eq('id', matchedCase.id)
              .eq('user_id', user.id)
              .single()
            
            const caseData = fullCase || matchedCase
            
            // Fetch deadlines if needed
            let deadlinesInfo = ''
            if (includeDeadlines) {
              const { data: deadlines } = await supabase
                .from('deadlines')
                .select('*')
                .eq('case_id', matchedCase.id)
                .eq('user_id', user.id)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true })
                .limit(5)
              
              if (deadlines && deadlines.length > 0) {
                deadlinesInfo = deadlines.map(d => `- ${d.title}: ${d.date}`).join('\n')
              }
            }
            
            // Fetch billing summary
            const { data: billing } = await supabase
              .from('billing_entries')
              .select('*')
              .eq('case_id', matchedCase.id)
              .eq('user_id', user.id)
            
            const totalHours = billing?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0
            
            // Build summary
            let summary = ''
            
            if (summaryType === 'client_update') {
              summary = `📧 **Client Update for ${caseData.case_name || matchedCase.caseName}**\n\n`
              summary += `**Case Status:** ${caseData.case_phase || 'Active'}\n\n`
              
              if (caseData.case_type) {
                summary += `**Case Type:** ${caseData.case_type}\n`
              }
              
              summary += `\n**Current Status:**\n`
              summary += `Your case is currently in the ${caseData.case_phase || 'active'} phase. `
              summary += `We continue to work diligently on your behalf.\n`
              
              if (deadlinesInfo) {
                summary += `\n**Upcoming Important Dates:**\n${deadlinesInfo}\n`
              }
              
              summary += `\n**Next Steps:**\n`
              summary += `- We will continue to advance your case\n`
              summary += `- You will be notified of any developments requiring your attention\n`
              
            } else if (summaryType === 'status_report') {
              summary = `📋 **Status Report: ${caseData.case_name || matchedCase.caseName}**\n\n`
              summary += `**Client:** ${caseData.client || 'N/A'}\n`
              summary += `**Case Number:** ${caseData.case_number || 'Pending'}\n`
              summary += `**Phase:** ${caseData.case_phase || 'Active'}\n`
              summary += `**Type:** ${caseData.case_type || 'N/A'}\n\n`
              
              if (caseData.court) {
                summary += `**Court:** ${caseData.court}\n`
              }
              
              summary += `\n**Hours Logged:** ${totalHours.toFixed(1)}\n`
              
              if (deadlinesInfo) {
                summary += `\n**Upcoming Deadlines:**\n${deadlinesInfo}\n`
              }
              
            } else if (summaryType === 'case_overview') {
              summary = `📁 **Case Overview: ${caseData.case_name || matchedCase.caseName}**\n\n`
              summary += `**Client:** ${caseData.client || 'N/A'}\n`
              summary += `**Case Type:** ${caseData.case_type || 'N/A'}\n`
              summary += `**Current Phase:** ${caseData.case_phase || 'Active'}\n\n`
              
              if (caseData.court) {
                summary += `**Venue:** ${caseData.court}\n`
              }
              
              if (deadlinesInfo) {
                summary += `\n**Key Dates:**\n${deadlinesInfo}\n`
              }
              
            } else if (summaryType === 'settlement_status') {
              summary = `💰 **Settlement Status: ${caseData.case_name || matchedCase.caseName}**\n\n`
              summary += `**Phase:** ${caseData.case_phase || 'Active'}\n`
              summary += `**Hours Invested:** ${totalHours.toFixed(1)}\n\n`
              summary += `Review the case file for detailed settlement history and negotiations.\n`
            }
            
            toolResults.push({
              toolCallId: toolCall.id,
              success: true,
              message: summary
            })
            
          } catch (parseError) {
            console.error('Error generating case summary for case:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to generate case summary' })
          }
        }
        
        // Handle DASHBOARD MODE: add_deadline_to_case (with case identifier)
        if (toolCall.function.name === 'add_deadline_to_case' && context.caseOverview) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            
            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            if (!dateRegex.test(args.date)) {
              console.error('Invalid date format from AI:', args.date)
              toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Invalid date format' })
              continue
            }
            
            // Find the case by identifier
            const matchedCase = findCaseByIdentifier(args.case_identifier, context.caseOverview.cases)
            
            if (!matchedCase) {
              console.log(`[ASSISTANT] Could not find case matching: ${args.case_identifier}`)
              toolResults.push({ 
                toolCallId: toolCall.id, 
                success: false, 
                message: `Could not find a case matching "${args.case_identifier}". Please ask the user to specify the exact case name or number.` 
              })
              continue
            }
            
            // Fetch current case deadlines
            const { data: currentCase } = await supabase
              .from('cases')
              .select('deadlines, case_name')
              .eq('id', matchedCase.id)
              .eq('user_id', user.id)
              .single()
            
            if (currentCase) {
              const existingDeadlines = (currentCase.deadlines || []) as Deadline[]
              
              // Create new deadline
              const newDeadline: Deadline = {
                id: `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: args.date,
                description: args.description,
                completed: false
              }
              
              // Update case with new deadline
              const { error: updateError } = await supabase
                .from('cases')
                .update({ deadlines: [...existingDeadlines, newDeadline] })
                .eq('id', matchedCase.id)
                .eq('user_id', user.id)
              
              if (!updateError) {
                actions.push({
                  type: 'deadline_added',
                  data: { ...newDeadline, caseId: matchedCase.id, caseName: currentCase.case_name }
                })
                toolResults.push({ 
                  toolCallId: toolCall.id, 
                  success: true, 
                  message: `Deadline "${args.description}" on ${args.date} added successfully to case "${currentCase.case_name}"` 
                })
                console.log(`[ASSISTANT] Dashboard deadline added to ${currentCase.case_name}: ${args.description} on ${args.date}`)
              } else {
                console.error('Failed to add deadline:', updateError)
                toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Database error adding deadline' })
              }
            }
          } catch (parseError) {
            console.error('Error parsing tool call arguments:', parseError)
            toolResults.push({ toolCallId: toolCall.id, success: false, message: 'Failed to parse arguments' })
          }
        }
      }
      
      // Build tool response messages for OpenAI to generate final response
      const toolMessages = choice.message.tool_calls.map((toolCall: { id: string; function: { name: string } }) => {
        const result = toolResults.find(r => r.toolCallId === toolCall.id)
        return {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify({ 
            success: result?.success ?? false, 
            message: result?.message ?? 'Action completed'
          })
        }
      })
      
      // Get follow-up response with tool results
      const followUpMessages = [
        ...messages,
        choice.message,
        ...toolMessages
      ]
      
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: followUpMessages,
          temperature: 0.4,
          max_tokens: 800,
        }),
      })
      
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json()
        const assistantMessage = followUpData.choices[0]?.message?.content?.trim() || 'I\'ve added the deadline to your case calendar.'
        
        // Log for audit (no PII)
        console.log(`[ASSISTANT] User: ${user.id}, Mode: ${mode}, CaseId: ${caseId || 'N/A'}, Actions: ${actions.length}`)
        
        return NextResponse.json({ 
          message: assistantMessage,
          actions,
          context: {
            mode: context.mode,
            caseId: context.caseId,
            caseName: context.currentCase?.caseName
          }
        })
      }
    }

    // Normal response without tool calls
    const assistantMessage = choice.message?.content?.trim() || ''

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
      actions,
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















