'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, differenceInCalendarDays, subDays, addDays, isAfter } from 'date-fns'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Circle,
  Download, 
  Search, 
  Filter, 
  Trash2, 
  Plus,
  FileText,
  Scale,
  Gavel,
  ChevronDown,
  ChevronUp,
  Building2,
  Edit2,
  Save,
  X,
  Loader2
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { 
  litigationPlanningStorage,
  LitigationPlanningSettings,
  LitigationPlanningDeadline,
  LitigationPlanningChecklistItem
} from '@/lib/supabase/litigationPlanningStorage'

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

// Compute deadline date based on rule and inputs
const computeDeadlineDate = (
  rule: DeadlineRule, 
  trialDate: string | null,
  expertExchangeDate: string | null,
  trialSetDate: string | null
): string | null => {
  if (!trialDate) return null

  const trial = new Date(trialDate)
  const expertExchange = expertExchangeDate ? new Date(expertExchangeDate) : null
  const trialSet = trialSetDate ? new Date(trialSetDate) : null

  let computedDate: Date | null = null

  switch (rule.offset) {
    case 'friday_before_trial':
      computedDate = subDays(trial, ((trial.getDay() + 2) % 7) + 1)
      break

    case '20_days_after_expert_exchange':
      if (!expertExchange) return null
      computedDate = addDays(expertExchange, 20)
      break

    case 'max_of_70_or_10_after_trial_set':
      if (!trialSet) {
        computedDate = subDays(trial, 70)
      } else {
        const option1 = subDays(trial, 70)
        const option2 = addDays(trialSet, 10)
        computedDate = isAfter(option1, option2) ? option1 : option2
      }
      break

    case 'max_of_75_or_10_after_trial_set':
      if (!trialSet) {
        computedDate = subDays(trial, 75)
      } else {
        const option1 = subDays(trial, 75)
        const option2 = addDays(trialSet, 10)
        computedDate = isAfter(option1, option2) ? option1 : option2
      }
      break

    default:
      const days = parseInt(rule.offset)
      if (isNaN(days)) return null
      computedDate = subDays(trial, days)
  }

  return computedDate ? format(computedDate, 'yyyy-MM-dd') : null
}

interface ComputedDeadline {
  id: string
  title: string
  computedDate: Date
  daysRemaining: number
  rule: string
  category: 'pleadings' | 'discovery' | 'motions' | 'trial'
  urgency: 'red' | 'amber' | 'green'
  completed: boolean
  source: 'auto-deadline' | 'manual'
  dbId?: string
}

// Pleadings checklist items for California Civil Procedure
const PLEADINGS_CHECKLIST = {
  initial: [
    { id: 'complaint', title: 'Complaint', rule: 'CCP §§ 425.10–425.40', section: 'pleadings-initial' },
    { id: 'cross-complaint', title: 'Cross-Complaint', rule: 'CCP §§ 428.10–428.80', section: 'pleadings-initial' },
  ],
  responsive: [
    { id: 'answer', title: 'Answer', rule: 'CCP §§ 431.10–431.30', section: 'pleadings-responsive' },
    { id: 'demurrer', title: 'Demurrer', rule: 'CCP §§ 430.10–430.80', section: 'pleadings-responsive' },
    { id: 'motion-to-strike', title: 'Motion to Strike', rule: 'CCP §§ 435–437', section: 'pleadings-responsive' },
    { id: 'motion-to-quash', title: 'Motion to Quash Service', rule: 'CCP § 418.10', section: 'pleadings-responsive' },
  ],
  replies: [
    { id: 'reply-cross', title: 'Reply to Cross-Complaint', rule: 'CCP § 431.30(c)', section: 'pleadings-replies' },
  ],
  subsequent: [
    { id: 'amended-complaint', title: 'Amended Complaint', rule: 'CCP §§ 472–474', section: 'pleadings-subsequent' },
    { id: 'supplemental-pleading', title: 'Supplemental Pleading', rule: 'CCP § 464', section: 'pleadings-subsequent' },
    { id: 'doe-amendment', title: 'Doe Amendment', rule: 'CCP § 474', section: 'pleadings-subsequent' },
  ]
}

// Discovery checklist items
const DISCOVERY_CHECKLIST = {
  written: [
    { id: 'form-interrogatories', title: 'Form Interrogatories', rule: 'CCP § 2030.010', section: 'discovery-written' },
    { id: 'special-interrogatories', title: 'Special Interrogatories', rule: 'CCP § 2030.010', section: 'discovery-written' },
    { id: 'rfp', title: 'Request for Production of Documents', rule: 'CCP § 2031.010', section: 'discovery-written' },
    { id: 'rfa', title: 'Request for Admissions', rule: 'CCP § 2033.010', section: 'discovery-written' },
  ],
  depositions: [
    { id: 'notice-depo-oral', title: 'Notice of Deposition (Oral)', rule: 'CCP § 2025.220', section: 'discovery-depositions' },
    { id: 'depo-subpoena', title: 'Deposition Subpoena', rule: 'CCP § 2020.010', section: 'discovery-depositions' },
    { id: 'expert-depo', title: 'Expert Witness Deposition', rule: 'CCP § 2034.410', section: 'discovery-depositions' },
  ],
  expert: [
    { id: 'expert-demand', title: 'Demand for Exchange of Expert Info', rule: 'CCP § 2034.210', section: 'discovery-expert' },
    { id: 'expert-designation', title: 'Expert Witness Designation', rule: 'CCP § 2034.260', section: 'discovery-expert' },
    { id: 'supplemental-expert', title: 'Supplemental Expert Designation', rule: 'CCP § 2034.280', section: 'discovery-expert' },
  ]
}

// Motions checklist items
const MOTIONS_CHECKLIST = {
  discovery: [
    { id: 'motion-compel-responses', title: 'Motion to Compel Responses', rule: 'CCP §2030.290, §2031.300', section: 'motions-discovery' },
    { id: 'motion-compel-further', title: 'Motion to Compel Further Responses', rule: 'CCP §2030.300', section: 'motions-discovery' },
    { id: 'motion-protective-order', title: 'Motion for Protective Order', rule: 'CCP §2017.020', section: 'motions-discovery' },
    { id: 'motion-sanctions', title: 'Motion for Sanctions', rule: 'CCP §§2023.010–2023.030', section: 'motions-discovery' },
  ],
  pretrial: [
    { id: 'motion-in-limine', title: 'Motion in Limine', rule: 'Excludes/limits evidence before trial', section: 'motions-pretrial' },
    { id: 'motion-bifurcate', title: 'Motion to Bifurcate Issues', rule: 'CCP §598', section: 'motions-pretrial' },
    { id: 'motion-continue', title: 'Motion to Continue Trial', rule: 'CRC 3.1332', section: 'motions-pretrial' },
    { id: 'motion-amend', title: 'Motion to Amend Pleadings', rule: 'CCP §473, §576', section: 'motions-pretrial' },
  ],
  dispositive: [
    { id: 'msj', title: 'Motion for Summary Judgment', rule: 'CCP §437c', section: 'motions-dispositive' },
    { id: 'msa', title: 'Motion for Summary Adjudication', rule: 'CCP §437c(f)', section: 'motions-dispositive' },
    { id: 'anti-slapp', title: 'Anti-SLAPP Motion to Strike', rule: 'CCP §425.16', section: 'motions-dispositive' },
  ],
  postTrial: [
    { id: 'motion-new-trial', title: 'Motion for New Trial', rule: 'CCP §657', section: 'motions-posttrial' },
    { id: 'jnov', title: 'Motion for JNOV', rule: 'CCP §629', section: 'motions-posttrial' },
    { id: 'motion-vacate', title: 'Motion to Vacate Judgment', rule: 'CCP §663, §473', section: 'motions-posttrial' },
    { id: 'motion-atty-fees', title: 'Motion for Attorney\'s Fees', rule: 'CCP §1021.5', section: 'motions-posttrial' },
  ]
}

export default function LitigationPlanningPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params?.caseId as string
  
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [caseItem, setCaseItem] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Database state
  const [settings, setSettings] = useState<LitigationPlanningSettings | null>(null)
  const [deadlines, setDeadlines] = useState<LitigationPlanningDeadline[]>([])
  const [checklistItems, setChecklistItems] = useState<LitigationPlanningChecklistItem[]>([])
  
  // UI state
  const [searchFilter, setSearchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pleadings' | 'discovery' | 'motions' | 'trial'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDeadline, setNewDeadline] = useState({
    title: '',
    date: '',
    note: '',
    category: 'pleadings' as 'pleadings' | 'discovery' | 'motions' | 'trial'
  })
  
  // Edit form state
  const [editTrialDate, setEditTrialDate] = useState('')
  const [editExpertDate, setEditExpertDate] = useState('')
  const [editTrialSetDate, setEditTrialSetDate] = useState('')
  const [ocscEnabled, setOcscEnabled] = useState(false)
  
  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    deadlines: false,
    pleadings: true,
    discovery: true,
    motions: true,
    settings: true
  })
  
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Load case and planning data
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser) {
        router.push('/login')
        return
      }
      
      setUser({ id: supabaseUser.id, email: supabaseUser.email || '' })
      
      if (caseId) {
        try {
          // Load case
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) {
            setCaseItem(foundCase)
            
            // Load planning data from database
            const planningData = await litigationPlanningStorage.getFullPlanningData(caseId)
            
            if (planningData.settings) {
              setSettings(planningData.settings)
              setEditTrialDate(planningData.settings.trial_date || '')
              setEditExpertDate(planningData.settings.expert_exchange_date || '')
              setEditTrialSetDate(planningData.settings.trial_set_date || '')
              setOcscEnabled(planningData.settings.ocsc_enabled || false)
            } else {
              // Initialize with case trial date if available
              setEditTrialDate(foundCase.trialDate || '')
            }
            
            setDeadlines(planningData.deadlines)
            setChecklistItems(planningData.checklist)
          } else {
            router.push('/dashboard')
          }
        } catch (error) {
          console.error('Error loading planning data:', error)
        }
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [caseId, router])

  // Compute deadlines from settings and database
  const computedDeadlines = useMemo(() => {
    const today = new Date()
    const trialDate = settings?.trial_date || editTrialDate
    
    // Get manual deadlines from database
    const manualDeadlines: ComputedDeadline[] = deadlines
      .filter(d => d.source === 'manual')
      .map(d => {
        const computedDate = new Date(d.deadline_date)
        const daysRemaining = differenceInCalendarDays(computedDate, today)
        let urgency: 'red' | 'amber' | 'green' = 'green'
        if (daysRemaining <= 7) urgency = 'red'
        else if (daysRemaining <= 30) urgency = 'amber'
        
        return {
          id: d.rule_id || d.id || '',
          dbId: d.id,
          title: d.title,
          computedDate,
          daysRemaining,
          rule: d.rule_reference || '',
          category: d.category,
          urgency,
          completed: d.completed,
          source: 'manual' as const
        }
      })
    
    // Compute auto deadlines from rules
    const autoDeadlines = trialDate ? DEADLINE_RULES
      .filter(rule => {
        if (rule.visibleIf === 'ocsc' && !ocscEnabled) return false
        return true
      })
      .map(rule => {
        const dateStr = computeDeadlineDate(
          rule,
          trialDate,
          settings?.expert_exchange_date || editExpertDate || null,
          settings?.trial_set_date || editTrialSetDate || null
        )
        if (!dateStr) return null
        
        const computedDate = new Date(dateStr)
        const daysRemaining = differenceInCalendarDays(computedDate, today)
        let urgency: 'red' | 'amber' | 'green' = 'green'
        if (daysRemaining <= 7) urgency = 'red'
        else if (daysRemaining <= 30) urgency = 'amber'
        
        // Check if this deadline exists in DB to get completion status
        const existingDeadline = deadlines.find(d => d.rule_id === rule.id && d.source === 'auto-deadline')
        
        return {
          id: rule.id,
          dbId: existingDeadline?.id,
          title: rule.title,
          computedDate,
          daysRemaining,
          rule: rule.rule,
          category: rule.category,
          urgency,
          completed: existingDeadline?.completed || false,
          source: 'auto-deadline' as const
        }
      })
      .filter(d => d !== null) as ComputedDeadline[] : []
    
    // Combine and filter
    return [...autoDeadlines, ...manualDeadlines]
      .filter(d => {
        if (categoryFilter !== 'all' && d.category !== categoryFilter) return false
        if (searchFilter && !d.title.toLowerCase().includes(searchFilter.toLowerCase())) return false
        return true
      })
      .sort((a, b) => a.computedDate.getTime() - b.computedDate.getTime())
  }, [settings, editTrialDate, editExpertDate, editTrialSetDate, ocscEnabled, deadlines, categoryFilter, searchFilter])

  const getUrgencyColor = (urgency: 'red' | 'amber' | 'green') => {
    switch (urgency) {
      case 'red': return 'bg-red-100 text-red-700 border-red-200'
      case 'amber': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'green': return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  const getUrgencyIcon = (urgency: 'red' | 'amber' | 'green') => {
    switch (urgency) {
      case 'red': return <AlertTriangle className="h-4 w-4" />
      case 'amber': return <Clock className="h-4 w-4" />
      case 'green': return <CheckCircle className="h-4 w-4" />
    }
  }

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'pleadings': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'discovery': return 'bg-green-100 text-green-700 border-green-200'
      case 'motions': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'trial': return 'bg-pink-100 text-pink-700 border-pink-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Save settings and sync auto deadlines
  const handleSaveSettings = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      // Save settings
      const newSettings = await litigationPlanningStorage.upsertSettings({
        case_id: caseId,
        user_id: user.id,
        trial_date: editTrialDate || null,
        expert_exchange_date: editExpertDate || null,
        trial_set_date: editTrialSetDate || null,
        ocsc_enabled: ocscEnabled
      })
      setSettings(newSettings)
      
      // Sync auto-generated deadlines
      if (editTrialDate) {
        const autoDeadlines = DEADLINE_RULES
          .filter(rule => {
            if (rule.visibleIf === 'ocsc' && !ocscEnabled) return false
            return true
          })
          .map(rule => {
            const dateStr = computeDeadlineDate(
              rule,
              editTrialDate,
              editExpertDate || null,
              editTrialSetDate || null
            )
            if (!dateStr) return null
            
            return {
              title: rule.title,
              deadline_date: dateStr,
              rule_reference: rule.rule,
              category: rule.category,
              source: 'auto-deadline' as const,
              completed: false,
              rule_id: rule.id
            }
          })
          .filter((d): d is NonNullable<typeof d> => d !== null)
        
        const syncedDeadlines = await litigationPlanningStorage.syncAutoDeadlines(
          caseId,
          user.id,
          autoDeadlines
        )
        
        // Merge with manual deadlines
        const manualDeadlines = deadlines.filter(d => d.source === 'manual')
        setDeadlines([...syncedDeadlines, ...manualDeadlines])
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Add custom deadline
  const handleAddDeadline = async () => {
    if (!user || !newDeadline.title.trim() || !newDeadline.date) return
    
    setSaving(true)
    try {
      const added = await litigationPlanningStorage.addDeadline({
        case_id: caseId,
        user_id: user.id,
        title: newDeadline.title.trim(),
        deadline_date: newDeadline.date,
        rule_reference: newDeadline.note.trim() || null,
        category: newDeadline.category,
        source: 'manual',
        completed: false
      })
      
      setDeadlines(prev => [...prev, added])
      setNewDeadline({ title: '', date: '', note: '', category: 'pleadings' })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding deadline:', error)
      alert('Error adding deadline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Toggle deadline completed
  const handleToggleDeadline = async (deadline: ComputedDeadline) => {
    if (!user) return
    
    try {
      if (deadline.dbId) {
        // Update existing deadline
        const updated = await litigationPlanningStorage.toggleDeadlineCompleted(deadline.dbId, !deadline.completed)
        setDeadlines(prev => prev.map(d => d.id === deadline.dbId ? updated : d))
      } else if (deadline.source === 'auto-deadline') {
        // Create new deadline record for auto deadline
        const added = await litigationPlanningStorage.addDeadline({
          case_id: caseId,
          user_id: user.id,
          title: deadline.title,
          deadline_date: format(deadline.computedDate, 'yyyy-MM-dd'),
          rule_reference: deadline.rule,
          category: deadline.category,
          source: 'auto-deadline',
          completed: true,
          rule_id: deadline.id
        })
        setDeadlines(prev => [...prev, added])
      }
    } catch (error) {
      console.error('Error toggling deadline:', error)
    }
  }

  // Delete custom deadline
  const handleDeleteDeadline = async (deadlineDbId: string) => {
    try {
      await litigationPlanningStorage.deleteDeadline(deadlineDbId)
      setDeadlines(prev => prev.filter(d => d.id !== deadlineDbId))
    } catch (error) {
      console.error('Error deleting deadline:', error)
    }
  }

  // Toggle checklist item
  const handleChecklistToggle = async (itemId: string, section: string) => {
    if (!user) return
    
    const existing = checklistItems.find(item => item.item_id === itemId)
    const newCompleted = !existing?.completed
    
    try {
      const updated = await litigationPlanningStorage.toggleChecklistItem(
        caseId,
        user.id,
        itemId,
        section,
        newCompleted
      )
      
      setChecklistItems(prev => {
        const existingIndex = prev.findIndex(item => item.item_id === itemId)
        if (existingIndex >= 0) {
          const newItems = [...prev]
          newItems[existingIndex] = updated
          return newItems
        }
        return [...prev, updated]
      })
    } catch (error) {
      console.error('Error toggling checklist item:', error)
    }
  }

  const isChecklistItemCompleted = (itemId: string) => {
    return checklistItems.find(item => item.item_id === itemId)?.completed || false
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Due Date', 'Days Remaining', 'Rule', 'Category', 'Status'],
      ...computedDeadlines.map(deadline => [
        deadline.title,
        format(deadline.computedDate, 'EEE, MMM d, yyyy'),
        deadline.daysRemaining < 0 ? `Overdue by ${Math.abs(deadline.daysRemaining)} days` : `Due in ${deadline.daysRemaining} days`,
        deadline.rule,
        deadline.category,
        deadline.completed ? 'Completed' : 'Pending'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `litigation-plan-${caseItem?.caseNumber || caseId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!caseItem) {
    return null
  }

  const trialDate = settings?.trial_date || editTrialDate

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href={`/dashboard/cases/${caseId}`}
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Case Dashboard</span>
        </Link>

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Calendar className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Litigation Planning</h1>
              </div>
              <p className="text-lg text-gray-600 mt-1">{caseItem.caseName}</p>
              <p className="text-sm text-gray-500">Case #: {caseItem.caseNumber}</p>
              {caseItem.court && (
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <Building2 className="h-4 w-4 mr-1" />
                  {caseItem.court} County Superior Court
                </p>
              )}
            </div>
            <div className="text-right">
              {trialDate ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 font-medium">Trial Date</p>
                  <p className="text-xl font-bold text-blue-900">
                    {format(new Date(trialDate), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-blue-600">
                    {differenceInCalendarDays(new Date(trialDate), new Date())} days remaining
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-700 font-medium">No Trial Date Set</p>
                  <p className="text-xs text-yellow-600 mt-1">Set a trial date to calculate deadlines</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trial Date & Settings Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('settings')}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Trial Date & Settings</h2>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              {collapsedSections.settings ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          
          {!collapsedSections.settings && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trial Date</label>
                <input
                  type="date"
                  value={editTrialDate}
                  onChange={(e) => setEditTrialDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expert Exchange Date</label>
                <input
                  type="date"
                  value={editExpertDate}
                  onChange={(e) => setEditExpertDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Trial Was Set</label>
                <input
                  type="date"
                  value={editTrialSetDate}
                  onChange={(e) => setEditTrialSetDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={ocscEnabled}
                    onChange={(e) => setOcscEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">OCSC Rule 317 (Orange County)</span>
                </label>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  <span>{saving ? 'Saving...' : 'Save & Calculate'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trial-Anchored Deadlines Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('deadlines')}
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Trial-Anchored Deadlines</h2>
              <span className="text-sm text-gray-500">({computedDeadlines.length} deadlines)</span>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              {collapsedSections.deadlines ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          
          {!collapsedSections.deadlines && (
            <div className="mt-6 space-y-4">
              {/* Search, Filter, Export Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    placeholder="Search deadlines..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Category:</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="pleadings">Pleadings</option>
                    <option value="discovery">Discovery</option>
                    <option value="motions">Motions</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Custom</span>
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Add Custom Deadline Form */}
              {showAddForm && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Add Custom Deadline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={newDeadline.title}
                        onChange={(e) => setNewDeadline(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., File Motion for Summary Judgment"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={newDeadline.date}
                        onChange={(e) => setNewDeadline(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={newDeadline.category}
                        onChange={(e) => setNewDeadline(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      >
                        <option value="pleadings">Pleadings</option>
                        <option value="discovery">Discovery</option>
                        <option value="motions">Motions</option>
                        <option value="trial">Trial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rule/Note</label>
                      <input
                        type="text"
                        value={newDeadline.note}
                        onChange={(e) => setNewDeadline(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="e.g., CCP §437c"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddDeadline}
                      disabled={!newDeadline.title.trim() || !newDeadline.date || saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Add Deadline</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Deadlines List */}
              {!trialDate ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Please set a trial date to calculate deadlines</p>
                  <p className="text-sm mt-2">Open the "Trial Date & Settings" section above</p>
                </div>
              ) : computedDeadlines.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Filter className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No deadlines match your current filters</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {computedDeadlines.map((deadline) => (
                    <div
                      key={deadline.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                        deadline.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={deadline.completed}
                          onChange={() => handleToggleDeadline(deadline)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                        />
                      </div>
                      <div className="flex-shrink-0 pt-1">
                        <span className={`${getUrgencyColor(deadline.urgency)} p-1 rounded`}>
                          {getUrgencyIcon(deadline.urgency)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className={`font-medium text-gray-900 ${deadline.completed ? 'line-through text-gray-400' : ''}`}>
                            {deadline.title}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(deadline.category)}`}>
                            {deadline.category}
                          </span>
                          {deadline.source === 'manual' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{deadline.rule}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium text-gray-900">
                          {format(deadline.computedDate, 'EEE, MMM d, yyyy')}
                        </div>
                        <div className={`text-xs mt-1 px-2 py-1 rounded ${getUrgencyColor(deadline.urgency)}`}>
                          {deadline.daysRemaining < 0
                            ? `Overdue by ${Math.abs(deadline.daysRemaining)} days`
                            : `Due in ${deadline.daysRemaining} days`
                          }
                        </div>
                      </div>
                      {deadline.source === 'manual' && deadline.dbId && (
                        <button
                          onClick={() => handleDeleteDeadline(deadline.dbId!)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pleadings Checklist */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('pleadings')}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Pleadings Checklist</h2>
              <span className="text-sm text-gray-500">(California Civil Procedure)</span>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              {collapsedSections.pleadings ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          
          {!collapsedSections.pleadings && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Initial Pleadings */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3">Initial Pleadings</h3>
                <div className="space-y-2">
                  {PLEADINGS_CHECKLIST.initial.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Responsive Pleadings */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h3 className="font-semibold text-green-900 mb-3">Responsive Pleadings</h3>
                <p className="text-xs text-green-700 mb-3 bg-green-100 p-2 rounded">Defendant has 30 days to respond (CCP § 412.20)</p>
                <div className="space-y-2">
                  {PLEADINGS_CHECKLIST.responsive.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-green-100 cursor-pointer hover:bg-green-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Replies */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-3">Replies</h3>
                <div className="space-y-2">
                  {PLEADINGS_CHECKLIST.replies.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Subsequent Pleadings */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <h3 className="font-semibold text-orange-900 mb-3">Subsequent Pleadings</h3>
                <div className="space-y-2">
                  {PLEADINGS_CHECKLIST.subsequent.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Discovery Checklist */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('discovery')}
          >
            <div className="flex items-center space-x-2">
              <Search className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Discovery Checklist</h2>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              {collapsedSections.discovery ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          
          {!collapsedSections.discovery && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Written Discovery */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h3 className="font-semibold text-green-900 mb-3">Written Discovery</h3>
                <div className="space-y-2">
                  {DISCOVERY_CHECKLIST.written.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-green-100 cursor-pointer hover:bg-green-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Depositions */}
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <h3 className="font-semibold text-teal-900 mb-3">Depositions</h3>
                <div className="space-y-2">
                  {DISCOVERY_CHECKLIST.depositions.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-teal-100 cursor-pointer hover:bg-teal-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Expert Discovery */}
              <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                <h3 className="font-semibold text-cyan-900 mb-3">Expert Discovery</h3>
                <div className="space-y-2">
                  {DISCOVERY_CHECKLIST.expert.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-cyan-100 cursor-pointer hover:bg-cyan-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Motions Checklist */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('motions')}
          >
            <div className="flex items-center space-x-2">
              <Gavel className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Motions Checklist</h2>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              {collapsedSections.motions ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          
          {!collapsedSections.motions && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Discovery Motions */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-3">Discovery Motions</h3>
                <div className="space-y-2">
                  {MOTIONS_CHECKLIST.discovery.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Pre-Trial Motions */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 mb-3">Pre-Trial Motions</h3>
                <div className="space-y-2">
                  {MOTIONS_CHECKLIST.pretrial.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-indigo-100 cursor-pointer hover:bg-indigo-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Dispositive Motions */}
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <h3 className="font-semibold text-pink-900 mb-3">Dispositive Motions</h3>
                <div className="space-y-2">
                  {MOTIONS_CHECKLIST.dispositive.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-pink-100 cursor-pointer hover:bg-pink-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Post-Trial Motions */}
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                <h3 className="font-semibold text-rose-900 mb-3">Post-Trial Motions</h3>
                <div className="space-y-2">
                  {MOTIONS_CHECKLIST.postTrial.map(item => (
                    <label key={item.id} className="flex items-start space-x-3 p-2 bg-white rounded-lg border border-rose-100 cursor-pointer hover:bg-rose-50">
                      <input
                        type="checkbox"
                        checked={isChecklistItemCompleted(item.id)}
                        onChange={() => handleChecklistToggle(item.id, item.section)}
                        className="mt-1 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${isChecklistItemCompleted(item.id) ? 'line-through text-gray-400' : ''}`}>
                          {item.title}
                        </span>
                        <p className="text-xs text-gray-500">{item.rule}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  )
}
