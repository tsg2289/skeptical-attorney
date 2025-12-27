'use client'

import { create } from 'zustand'
import { format, addDays, subDays, differenceInCalendarDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, isAfter } from 'date-fns'

// Types
export type CalendarEvent = {
  id: string
  caseId: string
  title: string
  note?: string           // statute / rule reference
  date: string            // ISO (yyyy-MM-dd)
  category: 'pleadings' | 'discovery' | 'motions' | 'trial'
  source: 'auto-deadline' | 'manual'
  completed: boolean
}

export type CasePlanningState = {
  trialDate?: string | null
  expertExchangeDate?: string | null
  trialSetDate?: string | null
  ocscEnabled?: boolean
  events: CalendarEvent[]
}

export type PlanningInputs = {
  trialDate?: string | null
  expertExchangeDate?: string | null
  trialSetDate?: string | null
  ocscEnabled?: boolean
}

// Deadline rules based on California Civil Procedure
interface DeadlineRule {
  id: string
  title: string
  offset: string
  rule: string
  category: 'pleadings' | 'discovery' | 'motions' | 'trial'
  visibleIf?: string
}

const DEADLINE_RULES: DeadlineRule[] = [
  // Pleadings
  { id: 'joint-stmt', title: 'Reminder to prepare joint stmt. of case/wit. list; jury instructions, exhibits', offset: 'friday_before_trial', rule: 'Friday before trial', category: 'pleadings' },
  { id: 'motions-limine', title: 'All motions in limine to be served', offset: '10', rule: '10 days before trial', category: 'pleadings' },
  { id: 'offer-compromise-personal', title: 'Last Day to Serve Offer to Compromise (CCP §998)', offset: '10', rule: '10 days before trial', category: 'pleadings' },
  { id: 'issues-conference', title: 'Hold Issues Conference (OC Rule 317 - OCSC only)', offset: '10', rule: '10 days before trial', category: 'pleadings', visibleIf: 'ocsc' },
  { id: 'expert-discovery-motion', title: 'Discovery Motion Heard as to Expert Witnesses (CCP §2024(d))', offset: '10', rule: '10 days before trial', category: 'pleadings' },
  { id: 'notice-appear-personal', title: 'Personally Serve Notice to Appear/Testify (No Docs) (CCP §1987(b))', offset: '10', rule: '10 days before trial', category: 'pleadings' },
  { id: 'offer-compromise-mail', title: 'Serve by Mail Offer to Compromise (998 + 5 mail)', offset: '15', rule: '15 days before trial', category: 'pleadings' },
  { id: 'complete-expert-discovery', title: 'Complete Discovery re CCP §2034 Experts (CCP §2024(d))', offset: '15', rule: '15 days before trial', category: 'pleadings' },
  { id: 'notice-appear-mail', title: 'Serve by Mail Notice to Appear/Testify (No Docs) (CCP §1987(b))', offset: '15', rule: '15 days before trial', category: 'pleadings' },
  { id: 'discovery-motion-heard', title: 'Discovery Motion Heard (CCP §2024(a))', offset: '15', rule: '15 days before trial', category: 'pleadings' },
  { id: 'notice-produce-personal', title: 'Personally Serve Notice to Produce Docs (CCP §1987(c))', offset: '20', rule: '20 days before trial', category: 'pleadings' },
  { id: 'notice-produce-mail', title: 'Serve by Mail Notice to Produce Docs (CCP §1987(c))', offset: '25', rule: '25 days before trial', category: 'pleadings' },
  { id: 'jury-fees', title: 'Deposit Jury Fees (CCP §631(a)(5))', offset: '25', rule: '25 days before trial', category: 'pleadings' },
  
  // Discovery
  { id: 'expert-depo-personal', title: 'Personally Serve Expert Depo Notice (no docs)', offset: '25', rule: '25 days before trial', category: 'discovery' },
  { id: 'expert-depo-mail', title: 'Serve by Mail Expert Depo Notice (no docs)', offset: '30', rule: '30 days before trial', category: 'discovery' },
  { id: 'supplemental-expert-personal', title: 'Personally Serve Supplemental Expert List', offset: '20_days_after_expert_exchange', rule: '20 days after expert exchange', category: 'discovery' },
  { id: 'discovery-cutoff', title: 'Discovery Cut-Off (CCP §2024(a))', offset: '30', rule: '30 days before trial', category: 'discovery' },
  { id: 'expert-depo-docs-personal', title: 'Personally Serve Expert Depo Notice (with docs)', offset: '35', rule: '35 days before trial', category: 'discovery' },
  { id: 'expert-depo-docs-mail', title: 'Serve by Mail Expert Depo Notice (with docs)', offset: '40', rule: '40 days before trial', category: 'discovery' },
  { id: 'subpoena-non-party', title: 'Subpoena Non-Party Witnesses (CC §1987(a))', offset: '45', rule: '45 days before trial', category: 'discovery' },
  { id: 'expert-list-designate', title: 'Serve List Designating Experts (CCP §2034(c))', offset: '50', rule: '50 days before trial', category: 'discovery' },
  { id: 'discovery-personal', title: 'Serve Discovery (non-§2034) by Personal Service', offset: '60', rule: '60 days before trial', category: 'discovery' },
  { id: 'discovery-mail', title: 'Serve Discovery (non-§2034) by Mail', offset: '65', rule: '65 days before trial', category: 'discovery' },
  { id: 'expert-demand-personal', title: 'Demand to Exchange Expert Lists – Personal (CCP §2034(b))', offset: 'max_of_70_or_10_after_trial_set', rule: 'Later of 70 days before trial OR 10 days after trial set', category: 'discovery' },
  { id: 'expert-demand-mail', title: 'Demand to Exchange Expert Lists – Mail (CCP §2034(b))', offset: 'max_of_75_or_10_after_trial_set', rule: 'Later of 75 days before trial OR 10 days after trial set', category: 'discovery' },
  { id: 'pretrial-interrogatories', title: 'Propound Pretrial Interrogatories (reminder)', offset: '100', rule: '100 days before trial', category: 'discovery' },
  
  // Motions
  { id: 'summary-judgment-heard', title: 'Have Summary Judgment Motion Heard (CCP §437c(a))', offset: '30', rule: '30 days before trial', category: 'motions' },
  { id: 'rjn-reminder', title: 'Reminder to Serve RJN (Evid. C. §§452–453)', offset: '30', rule: '30 days before trial', category: 'motions' },
  { id: 'summary-judgment-personal', title: 'Personally Serve Summary Judgment Motion (CCP §437c(a))', offset: '105', rule: '105 days before trial', category: 'motions' },
  { id: 'summary-judgment-mail', title: 'Serve by Mail Summary Judgment Motion (CCP §437c(a))', offset: '110', rule: '110 days before trial', category: 'motions' },
  
  // Trial
  { id: 'milestone-120', title: 'Milestone – 120 Days Before Trial', offset: '120', rule: '120 days before trial', category: 'trial' },
]

// Utility functions
const toLocalDayISO = (d: Date): string => format(d, 'yyyy-MM-dd')

const eventsInMonth = (events: CalendarEvent[], monthStart: Date): CalendarEvent[] => {
  const start = startOfMonth(monthStart)
  const end = endOfMonth(monthStart)
  return events.filter(e => {
    const dt = parseISO(e.date)
    return isWithinInterval(dt, { start, end })
  })
}

// Compute deadline date based on rule and inputs
const computeDeadlineDate = (rule: DeadlineRule, inputs: PlanningInputs): Date | null => {
  if (!inputs.trialDate) return null

  const trialDate = new Date(inputs.trialDate)
  const expertExchangeDate = inputs.expertExchangeDate ? new Date(inputs.expertExchangeDate) : null
  const dateTrialWasSet = inputs.trialSetDate ? new Date(inputs.trialSetDate) : null

  switch (rule.offset) {
    case 'friday_before_trial':
      // Find the Friday before trial
      const fridayBefore = subDays(trialDate, ((trialDate.getDay() + 2) % 7) + 1)
      return fridayBefore

    case '20_days_after_expert_exchange':
      if (!expertExchangeDate) return null
      return addDays(expertExchangeDate, 20)

    case 'max_of_70_or_10_after_trial_set':
      if (!dateTrialWasSet) return subDays(trialDate, 70)
      const option1 = subDays(trialDate, 70)
      const option2 = addDays(dateTrialWasSet, 10)
      return isAfter(option1, option2) ? option1 : option2

    case 'max_of_75_or_10_after_trial_set':
      if (!dateTrialWasSet) return subDays(trialDate, 75)
      const option1b = subDays(trialDate, 75)
      const option2b = addDays(dateTrialWasSet, 10)
      return isAfter(option1b, option2b) ? option1b : option2b

    default:
      // Handle numeric offsets
      const days = parseInt(rule.offset)
      if (isNaN(days)) return null
      return subDays(trialDate, days)
  }
}

// Store interface
interface LitigationPlanningStore {
  cases: Record<string, CasePlanningState>
  setInputs: (caseId: string, inputs: PlanningInputs) => void
  recomputeDeadlines: (caseId: string) => void
  getEventsForMonth: (caseId: string, monthStart: Date) => CalendarEvent[]
  addManualEvent: (caseId: string, event: Omit<CalendarEvent, 'id' | 'caseId' | 'source' | 'completed'>) => void
  removeEvent: (caseId: string, eventId: string) => void
  toggleEventCompleted: (caseId: string, eventId: string) => void
  exportEvents: (caseId: string) => CalendarEvent[]
  loadCaseFromStorage: (caseId: string, trialDate?: string) => void
}

// Create the store
export const useLitigationPlanningStore = create<LitigationPlanningStore>((set, get) => ({
  cases: {},

  loadCaseFromStorage: (caseId: string, trialDate?: string) => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`litPlanning.cases.${caseId}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          set(state => ({
            cases: {
              ...state.cases,
              [caseId]: parsed
            }
          }))
          return
        } catch (error) {
          console.error('Error parsing stored planning data:', error)
        }
      }
    }
    
    // Initialize with trial date if provided
    if (trialDate) {
      get().setInputs(caseId, { trialDate })
    }
  },

  setInputs: (caseId: string, inputs: PlanningInputs) => {
    set(state => {
      const currentState = state.cases[caseId] || {
        trialDate: null,
        expertExchangeDate: null,
        trialSetDate: null,
        ocscEnabled: false,
        events: []
      }

      const updatedState = {
        ...currentState,
        ...inputs
      }

      return {
        cases: {
          ...state.cases,
          [caseId]: updatedState
        }
      }
    })

    // Recompute deadlines after setting inputs
    get().recomputeDeadlines(caseId)
  },

  recomputeDeadlines: (caseId: string) => {
    const state = get()
    const caseState = state.cases[caseId]
    if (!caseState) return

    const inputs: PlanningInputs = {
      trialDate: caseState.trialDate,
      expertExchangeDate: caseState.expertExchangeDate,
      trialSetDate: caseState.trialSetDate,
      ocscEnabled: caseState.ocscEnabled
    }

    // Generate events from deadline rules
    const autoEvents: CalendarEvent[] = DEADLINE_RULES
      .filter(rule => {
        // Filter by visibility conditions
        if (rule.visibleIf === 'ocsc' && !inputs.ocscEnabled) return false
        return true
      })
      .map(rule => {
        const computedDate = computeDeadlineDate(rule, inputs)
        if (!computedDate) return null

        return {
          id: rule.id,
          caseId,
          title: rule.title,
          note: rule.rule,
          date: toLocalDayISO(computedDate),
          category: rule.category,
          source: 'auto-deadline' as const,
          completed: false
        } as CalendarEvent
      })
      .filter((event): event is CalendarEvent => event !== null)

    // Keep manual events and their completion status
    const manualEvents = caseState.events.filter(event => event.source === 'manual')
    
    // Preserve completion status for auto events
    const existingAutoEvents = caseState.events.filter(event => event.source === 'auto-deadline')
    const completedIds = new Set(existingAutoEvents.filter(e => e.completed).map(e => e.id))
    
    const updatedAutoEvents = autoEvents.map(event => ({
      ...event,
      completed: completedIds.has(event.id)
    }))

    set(state => ({
      cases: {
        ...state.cases,
        [caseId]: {
          ...caseState,
          events: [...updatedAutoEvents, ...manualEvents]
        }
      }
    }))

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const updatedState = get().cases[caseId]
      if (updatedState) {
        localStorage.setItem(`litPlanning.cases.${caseId}`, JSON.stringify(updatedState))
      }
    }
  },

  getEventsForMonth: (caseId: string, monthStart: Date) => {
    const state = get()
    const caseState = state.cases[caseId]
    if (!caseState) return []

    return eventsInMonth(caseState.events, monthStart)
  },

  addManualEvent: (caseId: string, event: Omit<CalendarEvent, 'id' | 'caseId' | 'source' | 'completed'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `manual-${Date.now()}`,
      caseId,
      source: 'manual' as const,
      completed: false
    }

    set(state => {
      const caseState = state.cases[caseId] || {
        trialDate: null,
        expertExchangeDate: null,
        trialSetDate: null,
        ocscEnabled: false,
        events: []
      }

      return {
        cases: {
          ...state.cases,
          [caseId]: {
            ...caseState,
            events: [...caseState.events, newEvent]
          }
        }
      }
    })

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const updatedState = get().cases[caseId]
      if (updatedState) {
        localStorage.setItem(`litPlanning.cases.${caseId}`, JSON.stringify(updatedState))
      }
    }
  },

  removeEvent: (caseId: string, eventId: string) => {
    set(state => {
      const caseState = state.cases[caseId]
      if (!caseState) return state

      return {
        cases: {
          ...state.cases,
          [caseId]: {
            ...caseState,
            events: caseState.events.filter(event => event.id !== eventId)
          }
        }
      }
    })

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const updatedState = get().cases[caseId]
      if (updatedState) {
        localStorage.setItem(`litPlanning.cases.${caseId}`, JSON.stringify(updatedState))
      }
    }
  },

  toggleEventCompleted: (caseId: string, eventId: string) => {
    set(state => {
      const caseState = state.cases[caseId]
      if (!caseState) return state

      return {
        cases: {
          ...state.cases,
          [caseId]: {
            ...caseState,
            events: caseState.events.map(event => 
              event.id === eventId ? { ...event, completed: !event.completed } : event
            )
          }
        }
      }
    })

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const updatedState = get().cases[caseId]
      if (updatedState) {
        localStorage.setItem(`litPlanning.cases.${caseId}`, JSON.stringify(updatedState))
      }
    }
  },

  exportEvents: (caseId: string) => {
    const state = get()
    const caseState = state.cases[caseId]
    return caseState?.events || []
  }
}))

// Export utility functions and rules
export { toLocalDayISO, eventsInMonth, DEADLINE_RULES }
export type { DeadlineRule }

