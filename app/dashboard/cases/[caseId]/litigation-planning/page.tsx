'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, differenceInCalendarDays } from 'date-fns'
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
  X
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useLitigationPlanningStore, DEADLINE_RULES, CalendarEvent } from '@/lib/stores/litigationPlanningStore'

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
}

// Pleadings checklist items for California Civil Procedure
const PLEADINGS_CHECKLIST = {
  initial: [
    { id: 'complaint', title: 'Complaint', rule: 'CCP §§ 425.10–425.40' },
    { id: 'cross-complaint', title: 'Cross-Complaint', rule: 'CCP §§ 428.10–428.80' },
  ],
  responsive: [
    { id: 'answer', title: 'Answer', rule: 'CCP §§ 431.10–431.30' },
    { id: 'demurrer', title: 'Demurrer', rule: 'CCP §§ 430.10–430.80' },
    { id: 'motion-to-strike', title: 'Motion to Strike', rule: 'CCP §§ 435–437' },
    { id: 'motion-to-quash', title: 'Motion to Quash Service', rule: 'CCP § 418.10' },
  ],
  replies: [
    { id: 'reply-cross', title: 'Reply to Cross-Complaint', rule: 'CCP § 431.30(c)' },
  ],
  subsequent: [
    { id: 'amended-complaint', title: 'Amended Complaint', rule: 'CCP §§ 472–474' },
    { id: 'supplemental-pleading', title: 'Supplemental Pleading', rule: 'CCP § 464' },
    { id: 'doe-amendment', title: 'Doe Amendment', rule: 'CCP § 474' },
  ]
}

// Discovery checklist items
const DISCOVERY_CHECKLIST = {
  written: [
    { id: 'form-interrogatories', title: 'Form Interrogatories', rule: 'CCP § 2030.010' },
    { id: 'special-interrogatories', title: 'Special Interrogatories', rule: 'CCP § 2030.010' },
    { id: 'rfp', title: 'Request for Production of Documents', rule: 'CCP § 2031.010' },
    { id: 'rfa', title: 'Request for Admissions', rule: 'CCP § 2033.010' },
  ],
  depositions: [
    { id: 'notice-depo-oral', title: 'Notice of Deposition (Oral)', rule: 'CCP § 2025.220' },
    { id: 'depo-subpoena', title: 'Deposition Subpoena', rule: 'CCP § 2020.010' },
    { id: 'expert-depo', title: 'Expert Witness Deposition', rule: 'CCP § 2034.410' },
  ],
  expert: [
    { id: 'expert-demand', title: 'Demand for Exchange of Expert Info', rule: 'CCP § 2034.210' },
    { id: 'expert-designation', title: 'Expert Witness Designation', rule: 'CCP § 2034.260' },
    { id: 'supplemental-expert', title: 'Supplemental Expert Designation', rule: 'CCP § 2034.280' },
  ]
}

// Motions checklist items
const MOTIONS_CHECKLIST = {
  discovery: [
    { id: 'motion-compel-responses', title: 'Motion to Compel Responses', rule: 'CCP §2030.290, §2031.300' },
    { id: 'motion-compel-further', title: 'Motion to Compel Further Responses', rule: 'CCP §2030.300' },
    { id: 'motion-protective-order', title: 'Motion for Protective Order', rule: 'CCP §2017.020' },
    { id: 'motion-sanctions', title: 'Motion for Sanctions', rule: 'CCP §§2023.010–2023.030' },
  ],
  pretrial: [
    { id: 'motion-in-limine', title: 'Motion in Limine', rule: 'Excludes/limits evidence before trial' },
    { id: 'motion-bifurcate', title: 'Motion to Bifurcate Issues', rule: 'CCP §598' },
    { id: 'motion-continue', title: 'Motion to Continue Trial', rule: 'CRC 3.1332' },
    { id: 'motion-amend', title: 'Motion to Amend Pleadings', rule: 'CCP §473, §576' },
  ],
  dispositive: [
    { id: 'msj', title: 'Motion for Summary Judgment', rule: 'CCP §437c' },
    { id: 'msa', title: 'Motion for Summary Adjudication', rule: 'CCP §437c(f)' },
    { id: 'anti-slapp', title: 'Anti-SLAPP Motion to Strike', rule: 'CCP §425.16' },
  ],
  postTrial: [
    { id: 'motion-new-trial', title: 'Motion for New Trial', rule: 'CCP §657' },
    { id: 'jnov', title: 'Motion for JNOV', rule: 'CCP §629' },
    { id: 'motion-vacate', title: 'Motion to Vacate Judgment', rule: 'CCP §663, §473' },
    { id: 'motion-atty-fees', title: 'Motion for Attorney\'s Fees', rule: 'CCP §1021.5' },
  ]
}

export default function LitigationPlanningPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params?.caseId as string
  
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [caseItem, setCaseItem] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Store hooks
  const { cases, setInputs, loadCaseFromStorage, addManualEvent, removeEvent, toggleEventCompleted } = useLitigationPlanningStore()
  const caseState = cases[caseId]
  
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
  
  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    deadlines: false,
    pleadings: true,
    discovery: true,
    motions: true,
    settings: true
  })
  
  // Checklist state (stored locally)
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({})
  
  // Edit mode for trial date
  const [isEditingTrialDate, setIsEditingTrialDate] = useState(false)
  const [editTrialDate, setEditTrialDate] = useState('')
  const [editExpertDate, setEditExpertDate] = useState('')
  const [editTrialSetDate, setEditTrialSetDate] = useState('')
  const [ocscEnabled, setOcscEnabled] = useState(false)
  
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Load case data
  useEffect(() => {
    const checkAuthAndLoadCase = async () => {
      const supabase = createClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser) {
        router.push('/login')
        return
      }
      
      setUser({ id: supabaseUser.id, email: supabaseUser.email || '' })
      
      if (caseId) {
        const foundCase = await supabaseCaseStorage.getCase(caseId)
        if (foundCase) {
          setCaseItem(foundCase)
          // Load planning state from storage or initialize with trial date
          loadCaseFromStorage(caseId, foundCase.trialDate || undefined)
          
          // Load checklist state from localStorage
          const storedChecklist = localStorage.getItem(`litPlanning.checklist.${caseId}`)
          if (storedChecklist) {
            try {
              setChecklistState(JSON.parse(storedChecklist))
            } catch (e) {
              console.error('Error loading checklist state:', e)
            }
          }
        } else {
          router.push('/dashboard')
        }
      }
      
      setLoading(false)
    }
    
    checkAuthAndLoadCase()
  }, [caseId, router, loadCaseFromStorage])
  
  // Sync edit form with store state
  useEffect(() => {
    if (caseState) {
      setEditTrialDate(caseState.trialDate || '')
      setEditExpertDate(caseState.expertExchangeDate || '')
      setEditTrialSetDate(caseState.trialSetDate || '')
      setOcscEnabled(caseState.ocscEnabled || false)
    }
  }, [caseState])

  // Compute deadlines from store
  const computedDeadlines = useMemo(() => {
    if (!caseState?.events) return []
    
    const today = new Date()
    
    return caseState.events
      .filter(event => {
        // Filter by category
        if (categoryFilter !== 'all' && event.category !== categoryFilter) return false
        // Filter by search
        if (searchFilter && !event.title.toLowerCase().includes(searchFilter.toLowerCase())) return false
        return true
      })
      .map(event => {
        const computedDate = new Date(event.date)
        const daysRemaining = differenceInCalendarDays(computedDate, today)
        let urgency: 'red' | 'amber' | 'green' = 'green'
        
        if (daysRemaining <= 7) urgency = 'red'
        else if (daysRemaining <= 30) urgency = 'amber'

        return {
          id: event.id,
          title: event.title,
          computedDate,
          daysRemaining,
          rule: event.note || '',
          category: event.category,
          urgency,
          completed: event.completed,
          source: event.source
        } as ComputedDeadline
      })
      .sort((a, b) => a.computedDate.getTime() - b.computedDate.getTime())
  }, [caseState?.events, categoryFilter, searchFilter])

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

  const handleSaveSettings = () => {
    setInputs(caseId, {
      trialDate: editTrialDate || null,
      expertExchangeDate: editExpertDate || null,
      trialSetDate: editTrialSetDate || null,
      ocscEnabled
    })
    setIsEditingTrialDate(false)
  }

  const handleAddDeadline = () => {
    if (!newDeadline.title.trim() || !newDeadline.date) return
    
    addManualEvent(caseId, {
      title: newDeadline.title.trim(),
      date: newDeadline.date,
      note: newDeadline.note.trim(),
      category: newDeadline.category
    })
    
    setNewDeadline({ title: '', date: '', note: '', category: 'pleadings' })
    setShowAddForm(false)
  }

  const handleChecklistToggle = (itemId: string) => {
    const newState = {
      ...checklistState,
      [itemId]: !checklistState[itemId]
    }
    setChecklistState(newState)
    // Save to localStorage
    localStorage.setItem(`litPlanning.checklist.${caseId}`, JSON.stringify(newState))
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
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!caseItem) {
    return null
  }

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
              {caseState?.trialDate ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 font-medium">Trial Date</p>
                  <p className="text-xl font-bold text-blue-900">
                    {format(new Date(caseState.trialDate), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-blue-600">
                    {differenceInCalendarDays(new Date(caseState.trialDate), new Date())} days remaining
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
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
                >
                  <Save className="h-5 w-5" />
                  <span>Save & Calculate</span>
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
                      disabled={!newDeadline.title.trim() || !newDeadline.date}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Deadline
                    </button>
                  </div>
                </div>
              )}

              {/* Deadlines List */}
              {!caseState?.trialDate ? (
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
                          onChange={() => toggleEventCompleted(caseId, deadline.id)}
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
                      {deadline.source === 'manual' && (
                        <button
                          onClick={() => removeEvent(caseId, deadline.id)}
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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
                        checked={checklistState[item.id] || false}
                        onChange={() => handleChecklistToggle(item.id)}
                        className="mt-1 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className={`font-medium text-gray-900 text-sm ${checklistState[item.id] ? 'line-through text-gray-400' : ''}`}>
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

