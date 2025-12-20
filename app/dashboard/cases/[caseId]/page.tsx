'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Building2, Users, Briefcase } from 'lucide-react'
import { supabaseCaseStorage, CaseFrontend, Deadline, Party, Attorney } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { calculateDeadlinesFromTrialDate, generateDeadlineId } from '@/lib/utils/deadlineCalculator'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { CALIFORNIA_COUNTIES } from '@/lib/constants/californiaCounties'

interface UserInfo {
  id: string
  email: string
  fullName: string
}

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params?.caseId as string
  
  const [user, setUser] = useState<UserInfo | null>(null)
  const [caseItem, setCaseItem] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeadlineForm, setShowDeadlineForm] = useState(false)
  const [showAllDeadlines, setShowAllDeadlines] = useState(false)
  const [isPleadingsHovered, setIsPleadingsHovered] = useState(false)
  const [isDiscoveryHovered, setIsDiscoveryHovered] = useState(false)
  
  const [formData, setFormData] = useState({
    caseName: '',
    caseNumber: '',
    caseType: '',
    client: '',
    facts: '',
    trialDate: '',
    court: '',
    judgeName: '',
    departmentNumber: '',
    dateOfLoss: ''
  })
  
  // Separate state for parties (attorneys are now nested within each party)
  const [plaintiffs, setPlaintiffs] = useState<Party[]>([])
  const [defendants, setDefendants] = useState<Party[]>([])
  
  // Form state for adding new entries
  const [showPlaintiffForm, setShowPlaintiffForm] = useState(false)
  const [showDefendantForm, setShowDefendantForm] = useState(false)
  
  // State for adding attorney to a specific party
  const [addingAttorneyToPartyId, setAddingAttorneyToPartyId] = useState<string | null>(null)
  const [addingAttorneyToSide, setAddingAttorneyToSide] = useState<'plaintiff' | 'defendant'>('plaintiff')
  
  // State for editing existing entries
  const [editingPlaintiffId, setEditingPlaintiffId] = useState<string | null>(null)
  const [editingDefendantId, setEditingDefendantId] = useState<string | null>(null)
  const [editingAttorneyId, setEditingAttorneyId] = useState<string | null>(null)
  const [editingAttorneyPartyId, setEditingAttorneyPartyId] = useState<string | null>(null)
  
  const [newPartyForm, setNewPartyForm] = useState<Omit<Party, 'id' | 'attorneys'>>({
    name: '',
    type: 'individual',
    address: '',
    phone: '',
    email: ''
  })
  
  const [editPartyForm, setEditPartyForm] = useState<Omit<Party, 'attorneys'> & { id: string }>({
    id: '',
    name: '',
    type: 'individual',
    address: '',
    phone: '',
    email: ''
  })
  
  const [newAttorneyForm, setNewAttorneyForm] = useState<Omit<Attorney, 'id'>>({
    name: '',
    firm: '',
    barNumber: '',
    address: '',
    phone: '',
    email: ''
  })
  
  const [editAttorneyForm, setEditAttorneyForm] = useState<Attorney>({
    id: '',
    name: '',
    firm: '',
    barNumber: '',
    address: '',
    phone: '',
    email: ''
  })
  
  const [deadlineForm, setDeadlineForm] = useState({
    date: '',
    description: ''
  })

  useEffect(() => {
    const checkAuthAndLoadCase = async () => {
      const supabase = createClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser) {
        router.push('/login')
        return
      }
      
      const userInfo: UserInfo = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User'
      }
      setUser(userInfo)
      
      if (caseId) {
        const foundCase = await supabaseCaseStorage.getCase(caseId)
        if (foundCase) {
          setCaseItem(foundCase)
          setFormData({
            caseName: foundCase.caseName || '',
            caseNumber: foundCase.caseNumber || '',
            caseType: foundCase.caseType || '',
            client: foundCase.client || '',
            facts: foundCase.facts || '',
            trialDate: foundCase.trialDate || '',
            court: foundCase.court || '',
            judgeName: foundCase.judgeName || '',
            departmentNumber: foundCase.departmentNumber || '',
            dateOfLoss: foundCase.dateOfLoss || ''
          })
          // Load parties (attorneys are nested within each party)
          setPlaintiffs(foundCase.plaintiffs || [])
          setDefendants(foundCase.defendants || [])
        } else {
          router.push('/dashboard')
        }
      }
      
      setLoading(false)
    }
    
    checkAuthAndLoadCase()
  }, [caseId, router])

  const handleSave = async () => {
    if (!user || !caseItem) return
    
    if (!formData.caseName.trim() || !formData.caseNumber.trim()) {
      alert('Case name and case number are required')
      return
    }
    
    setIsSaving(true)
    try {
      const updated = await supabaseCaseStorage.updateCase(caseItem.id, {
        caseName: formData.caseName.trim(),
        caseNumber: formData.caseNumber.trim(),
        caseType: formData.caseType.trim() || undefined,
        client: formData.client.trim() || undefined,
        facts: formData.facts,
        trialDate: formData.trialDate,
        court: formData.court.trim() || undefined,
        judgeName: formData.judgeName.trim() || undefined,
        departmentNumber: formData.departmentNumber.trim() || undefined,
        dateOfLoss: formData.dateOfLoss || undefined,
        plaintiffs: plaintiffs,  // Attorneys are nested within each party
        defendants: defendants
      })
      
      if (updated) {
        // Auto-generate deadlines when trial date is set or changed
        if (formData.trialDate) {
          const calculatedDeadlines = calculateDeadlinesFromTrialDate(formData.trialDate, {
            juryTrial: updated.juryTrial,
            courtCounty: updated.courtCounty,
            mscDate: updated.mscDate
          })
          
          // Get existing deadlines to preserve manually added ones and completion status
          const existingDeadlines = updated.deadlines || []
          const existingDescriptions = new Set(existingDeadlines.map(d => d.description))
          
          // Preserve completion status for existing deadlines
          const completedDescriptions = new Set(
            existingDeadlines
              .filter(d => d.completed)
              .map(d => d.description)
          )
          
          // Create new calculated deadlines with IDs and preserve completion status
          const newCalculatedDeadlines = calculatedDeadlines.map(deadline => {
            const existing = existingDeadlines.find(d => d.description === deadline.description)
            return {
              ...deadline,
              id: existing?.id || generateDeadlineId(),
              completed: existing?.completed || completedDescriptions.has(deadline.description) || false
            }
          })
          
          // Keep manually added deadlines that aren't in the calculated list
          const calculatedDescriptions = new Set(calculatedDeadlines.map(d => d.description))
          const manualDeadlines = existingDeadlines.filter(d => 
            !calculatedDescriptions.has(d.description)
          )
          
          // Combine manual and calculated deadlines
          const allDeadlines = [...manualDeadlines, ...newCalculatedDeadlines]
          
          const updatedWithDeadlines = await supabaseCaseStorage.updateCase(caseItem.id, {
            deadlines: allDeadlines
          })
          
          if (updatedWithDeadlines) {
            setCaseItem(updatedWithDeadlines)
          } else {
            setCaseItem(updated)
          }
        } else {
          // If trial date was removed, keep manually added deadlines but remove calculated ones
          const calculatedDescriptions = new Set(
            calculateDeadlinesFromTrialDate(caseItem.trialDate || '', {
              juryTrial: caseItem.juryTrial,
              courtCounty: caseItem.courtCounty,
              mscDate: caseItem.mscDate
            }).map(d => d.description)
          )
          const remainingDeadlines = (updated.deadlines || []).filter(d => 
            !calculatedDescriptions.has(d.description)
          )
          
          const updatedWithoutCalculated = await supabaseCaseStorage.updateCase(caseItem.id, {
            deadlines: remainingDeadlines
          })
          
          if (updatedWithoutCalculated) {
            setCaseItem(updatedWithoutCalculated)
          } else {
            setCaseItem(updated)
          }
        }
        
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Error saving case:', err)
      alert('Error saving case')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDeadline = async () => {
    if (!user || !caseItem || !deadlineForm.date || !deadlineForm.description) {
      alert('Please fill in both date and description')
      return
    }
    
    const updated = await supabaseCaseStorage.addDeadline(caseItem.id, {
      date: deadlineForm.date,
      description: deadlineForm.description,
      completed: false
    })
    
    if (updated) {
      setCaseItem(updated)
      setDeadlineForm({ date: '', description: '' })
      setShowDeadlineForm(false)
    }
  }

  const handleDeleteDeadline = async (deadlineId: string) => {
    if (!user || !caseItem) return
    
    if (!confirm('Are you sure you want to delete this deadline?')) {
      return
    }
    
    const updated = await supabaseCaseStorage.deleteDeadline(caseItem.id, deadlineId)
    if (updated) {
      setCaseItem(updated)
    }
  }

  const handleToggleDeadline = async (deadlineId: string, completed: boolean) => {
    if (!user || !caseItem) return
    
    const updated = await supabaseCaseStorage.updateDeadline(caseItem.id, deadlineId, { completed })
    if (updated) {
      setCaseItem(updated)
    }
  }

  // Generate unique ID for new entries
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Add plaintiff
  const handleAddPlaintiff = () => {
    if (!newPartyForm.name.trim()) {
      alert('Please enter a name')
      return
    }
    const newPlaintiff: Party = {
      ...newPartyForm,
      id: generateId(),
      attorneys: []
    }
    setPlaintiffs([...plaintiffs, newPlaintiff])
    setNewPartyForm({ name: '', type: 'individual', address: '', phone: '', email: '' })
    setShowPlaintiffForm(false)
  }

  // Remove plaintiff
  const handleRemovePlaintiff = (id: string) => {
    setPlaintiffs(plaintiffs.filter(p => p.id !== id))
  }

  // Start editing plaintiff
  const handleStartEditPlaintiff = (plaintiff: Party) => {
    setEditPartyForm({ ...plaintiff })
    setEditingPlaintiffId(plaintiff.id)
  }

  // Save edited plaintiff
  const handleSaveEditPlaintiff = () => {
    if (!editPartyForm.name.trim()) {
      alert('Please enter a name')
      return
    }
    setPlaintiffs(plaintiffs.map(p => 
      p.id === editingPlaintiffId ? { ...editPartyForm, attorneys: p.attorneys } : p
    ))
    setEditingPlaintiffId(null)
    setEditPartyForm({ id: '', name: '', type: 'individual', address: '', phone: '', email: '' })
  }

  // Cancel editing plaintiff
  const handleCancelEditPlaintiff = () => {
    setEditingPlaintiffId(null)
    setEditPartyForm({ id: '', name: '', type: 'individual', address: '', phone: '', email: '' })
  }

  // Add defendant
  const handleAddDefendant = () => {
    if (!newPartyForm.name.trim()) {
      alert('Please enter a name')
      return
    }
    const newDefendant: Party = {
      ...newPartyForm,
      id: generateId(),
      attorneys: []
    }
    setDefendants([...defendants, newDefendant])
    setNewPartyForm({ name: '', type: 'individual', address: '', phone: '', email: '' })
    setShowDefendantForm(false)
  }

  // Remove defendant
  const handleRemoveDefendant = (id: string) => {
    setDefendants(defendants.filter(d => d.id !== id))
  }

  // Start editing defendant
  const handleStartEditDefendant = (defendant: Party) => {
    setEditPartyForm({ ...defendant })
    setEditingDefendantId(defendant.id)
  }

  // Save edited defendant
  const handleSaveEditDefendant = () => {
    if (!editPartyForm.name.trim()) {
      alert('Please enter a name')
      return
    }
    setDefendants(defendants.map(d => 
      d.id === editingDefendantId ? { ...editPartyForm, attorneys: d.attorneys } : d
    ))
    setEditingDefendantId(null)
    setEditPartyForm({ id: '', name: '', type: 'individual', address: '', phone: '', email: '' })
  }

  // Cancel editing defendant
  const handleCancelEditDefendant = () => {
    setEditingDefendantId(null)
    setEditPartyForm({ id: '', name: '', type: 'individual', address: '', phone: '', email: '' })
  }

  // Add attorney to a specific party
  const handleAddAttorneyToParty = (partyId: string, side: 'plaintiff' | 'defendant') => {
    if (!newAttorneyForm.name.trim()) {
      alert('Please enter attorney name')
      return
    }
    const newAttorney: Attorney = {
      ...newAttorneyForm,
      id: generateId()
    }
    
    if (side === 'plaintiff') {
      setPlaintiffs(plaintiffs.map(p => 
        p.id === partyId 
          ? { ...p, attorneys: [...(p.attorneys || []), newAttorney] }
          : p
      ))
    } else {
      setDefendants(defendants.map(d => 
        d.id === partyId 
          ? { ...d, attorneys: [...(d.attorneys || []), newAttorney] }
          : d
      ))
    }
    
    setNewAttorneyForm({ name: '', firm: '', barNumber: '', address: '', phone: '', email: '' })
    setAddingAttorneyToPartyId(null)
  }

  // Remove attorney from a specific party
  const handleRemoveAttorneyFromParty = (partyId: string, attorneyId: string, side: 'plaintiff' | 'defendant') => {
    if (side === 'plaintiff') {
      setPlaintiffs(plaintiffs.map(p => 
        p.id === partyId 
          ? { ...p, attorneys: (p.attorneys || []).filter(a => a.id !== attorneyId) }
          : p
      ))
    } else {
      setDefendants(defendants.map(d => 
        d.id === partyId 
          ? { ...d, attorneys: (d.attorneys || []).filter(a => a.id !== attorneyId) }
          : d
      ))
    }
  }

  // Start editing attorney
  const handleStartEditAttorney = (attorney: Attorney, partyId: string) => {
    setEditAttorneyForm({ ...attorney })
    setEditingAttorneyId(attorney.id)
    setEditingAttorneyPartyId(partyId)
  }

  // Save edited attorney
  const handleSaveEditAttorney = (side: 'plaintiff' | 'defendant') => {
    if (!editAttorneyForm.name.trim()) {
      alert('Please enter attorney name')
      return
    }
    
    if (side === 'plaintiff') {
      setPlaintiffs(plaintiffs.map(p => 
        p.id === editingAttorneyPartyId 
          ? { 
              ...p, 
              attorneys: (p.attorneys || []).map(a => 
                a.id === editingAttorneyId ? { ...editAttorneyForm } : a
              )
            }
          : p
      ))
    } else {
      setDefendants(defendants.map(d => 
        d.id === editingAttorneyPartyId 
          ? { 
              ...d, 
              attorneys: (d.attorneys || []).map(a => 
                a.id === editingAttorneyId ? { ...editAttorneyForm } : a
              )
            }
          : d
      ))
    }
    
    setEditingAttorneyId(null)
    setEditingAttorneyPartyId(null)
    setEditAttorneyForm({ id: '', name: '', firm: '', barNumber: '', address: '', phone: '', email: '' })
  }

  // Cancel editing attorney
  const handleCancelEditAttorney = () => {
    setEditingAttorneyId(null)
    setEditingAttorneyPartyId(null)
    setEditAttorneyForm({ id: '', name: '', firm: '', barNumber: '', address: '', phone: '', email: '' })
  }

  const getUpcomingDeadlines = (deadlines: Deadline[] = []) => {
    return deadlines
      .filter(d => !d.completed)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!caseItem) {
    return null
  }

  const upcomingDeadlines = getUpcomingDeadlines(caseItem.deadlines)
  const displayedDeadlines = showAllDeadlines ? upcomingDeadlines : upcomingDeadlines.slice(0, 10)
  const hasMoreDeadlines = upcomingDeadlines.length > 10

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Case Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Case Name *</label>
                    <input
                      type="text"
                      value={formData.caseName}
                      onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black text-xl font-bold"
                      placeholder="e.g., Smith vs. Johnson"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Case Number *</label>
                    <input
                      type="text"
                      value={formData.caseNumber}
                      onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                      placeholder="e.g., CV-2024-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                    <input
                      type="text"
                      value={formData.caseType}
                      onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                      placeholder="e.g., Personal Injury, Employment Law"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                      placeholder="e.g., John Smith, ABC Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Court (County)</label>
                    <select
                      value={formData.court}
                      onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                    >
                      <option value="">Select County...</option>
                      {CALIFORNIA_COUNTIES.map((county) => (
                        <option key={county} value={county}>
                          {county} County
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Judge</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium whitespace-nowrap">Honorable</span>
                      <input
                        type="text"
                        value={formData.judgeName}
                        onChange={(e) => setFormData({ ...formData, judgeName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                        placeholder="Judge Name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.departmentNumber}
                      onChange={(e) => setFormData({ ...formData, departmentNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                      placeholder="Dept. Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Loss</label>
                    <input
                      type="date"
                      value={formData.dateOfLoss}
                      onChange={(e) => setFormData({ ...formData, dateOfLoss: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{caseItem.caseName}</h1>
                  <p className="text-lg text-gray-600">Case #: {caseItem.caseNumber}</p>
                  {caseItem.caseType && (
                    <p className="text-lg text-blue-600 mt-1">Type: {caseItem.caseType}</p>
                  )}
                  {caseItem.court && (
                    <p className="text-lg text-gray-700 mt-1">
                      <Building2 className="h-4 w-4 inline mr-1" />
                      Court: Superior Court of California, County of {caseItem.court}
                    </p>
                  )}
                  {caseItem.judgeName && (
                    <p className="text-lg text-gray-700 mt-1">
                      Judge: Honorable {caseItem.judgeName}
                      {caseItem.departmentNumber && ` (Dept. ${caseItem.departmentNumber})`}
                    </p>
                  )}
                  {caseItem.dateOfLoss && (
                    <p className="text-lg text-gray-700 mt-1">
                      Date of Loss: {new Date(caseItem.dateOfLoss).toLocaleDateString()}
                    </p>
                  )}
                  {caseItem.client && (
                    <p className="text-lg text-gray-700 mt-1">Client: {caseItem.client}</p>
                  )}
                </>
              )}
            </div>
            {isEditing ? (
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
              >
                <Edit2 className="h-5 w-5" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Parties Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Plaintiffs */}
          <div>
            {/* Plaintiffs Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Plaintiffs</h2>
                </div>
                {isEditing && (
                  <button
                    onClick={() => setShowPlaintiffForm(!showPlaintiffForm)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                )}
              </div>
              
              {/* Add Plaintiff Form */}
              {isEditing && showPlaintiffForm && (
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={newPartyForm.name}
                        onChange={(e) => setNewPartyForm({ ...newPartyForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newPartyForm.type}
                        onChange={(e) => setNewPartyForm({ ...newPartyForm, type: e.target.value as Party['type'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                      >
                        <option value="individual">Individual</option>
                        <option value="corporation">Corporation</option>
                        <option value="entity">Entity</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddPlaintiff}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Add Plaintiff
                      </button>
                      <button
                        onClick={() => {
                          setShowPlaintiffForm(false)
                          setNewPartyForm({ name: '', type: 'individual', address: '', phone: '', email: '' })
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Plaintiffs List */}
              {plaintiffs.length === 0 ? (
                <p className="text-gray-400 italic text-sm">No plaintiffs added yet.</p>
              ) : (
                <div className="space-y-2">
                  {plaintiffs.map((plaintiff) => (
                    <div key={plaintiff.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {editingPlaintiffId === plaintiff.id ? (
                        // Edit form for this plaintiff
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                              type="text"
                              value={editPartyForm.name}
                              onChange={(e) => setEditPartyForm({ ...editPartyForm, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={editPartyForm.type}
                              onChange={(e) => setEditPartyForm({ ...editPartyForm, type: e.target.value as Party['type'] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                            >
                              <option value="individual">Individual</option>
                              <option value="corporation">Corporation</option>
                              <option value="entity">Entity</option>
                            </select>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEditPlaintiff}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditPlaintiff}
                              className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display view for this plaintiff with nested attorneys
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{plaintiff.name}</p>
                              <p className="text-sm text-gray-500 capitalize">{plaintiff.type}</p>
                            </div>
                            {isEditing && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleStartEditPlaintiff(plaintiff)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemovePlaintiff(plaintiff.id)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Nested Attorneys for this plaintiff */}
                          <div className="mt-3 ml-4 border-l-2 border-blue-200 pl-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-blue-700 flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                Counsel
                              </p>
                              {isEditing && (
                                <button
                                  onClick={() => {
                                    setAddingAttorneyToPartyId(plaintiff.id)
                                    setAddingAttorneyToSide('plaintiff')
                                    setNewAttorneyForm({ name: '', firm: '', barNumber: '', address: '', phone: '', email: '' })
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </button>
                              )}
                            </div>
                            
                            {/* Add Attorney Form for this plaintiff */}
                            {isEditing && addingAttorneyToPartyId === plaintiff.id && addingAttorneyToSide === 'plaintiff' && (
                              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={newAttorneyForm.name}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                    placeholder="Attorney name *"
                                  />
                                  <input
                                    type="text"
                                    value={newAttorneyForm.firm || ''}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, firm: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                    placeholder="Law firm"
                                  />
                                  <input
                                    type="text"
                                    value={newAttorneyForm.barNumber || ''}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, barNumber: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                    placeholder="Bar number"
                                  />
                                  <input
                                    type="text"
                                    value={newAttorneyForm.address || ''}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, address: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                    placeholder="Address"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={newAttorneyForm.phone || ''}
                                      onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, phone: e.target.value })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                      placeholder="Phone"
                                    />
                                    <input
                                      type="email"
                                      value={newAttorneyForm.email || ''}
                                      onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, email: e.target.value })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                      placeholder="Email"
                                    />
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleAddAttorneyToParty(plaintiff.id, 'plaintiff')}
                                      className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setAddingAttorneyToPartyId(null)}
                                      className="flex-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* List of attorneys for this plaintiff */}
                            {(!plaintiff.attorneys || plaintiff.attorneys.length === 0) && addingAttorneyToPartyId !== plaintiff.id ? (
                              <p className="text-xs text-gray-400 italic">No counsel assigned</p>
                            ) : (
                              <div className="space-y-2">
                                {(plaintiff.attorneys || []).map((attorney) => (
                                  <div key={attorney.id} className="p-2 bg-blue-50 rounded border border-blue-100">
                                    {editingAttorneyId === attorney.id && editingAttorneyPartyId === plaintiff.id ? (
                                      // Edit form for attorney
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          value={editAttorneyForm.name}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, name: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Name"
                                        />
                                        <input
                                          type="text"
                                          value={editAttorneyForm.firm || ''}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, firm: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Firm"
                                        />
                                        <input
                                          type="text"
                                          value={editAttorneyForm.barNumber || ''}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, barNumber: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Bar #"
                                        />
                                        <input
                                          type="text"
                                          value={editAttorneyForm.address || ''}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, address: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Address"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            type="text"
                                            value={editAttorneyForm.phone || ''}
                                            onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, phone: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                            placeholder="Phone"
                                          />
                                          <input
                                            type="email"
                                            value={editAttorneyForm.email || ''}
                                            onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, email: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                            placeholder="Email"
                                          />
                                        </div>
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleSaveEditAttorney('plaintiff')}
                                            className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEditAttorney}
                                            className="flex-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="text-sm font-medium text-gray-800">{attorney.name}</p>
                                          {attorney.firm && <p className="text-xs text-gray-600">{attorney.firm}</p>}
                                          {attorney.barNumber && <p className="text-xs text-gray-500">Bar #: {attorney.barNumber}</p>}
                                          {attorney.address && <p className="text-xs text-gray-500">{attorney.address}</p>}
                                          {attorney.phone && <p className="text-xs text-gray-500">{attorney.phone}</p>}
                                          {attorney.email && <p className="text-xs text-gray-500">{attorney.email}</p>}
                                        </div>
                                        {isEditing && (
                                          <div className="flex space-x-1">
                                            <button
                                              onClick={() => handleStartEditAttorney(attorney, plaintiff.id)}
                                              className="text-blue-500 hover:text-blue-700 p-0.5"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleRemoveAttorneyFromParty(plaintiff.id, attorney.id, 'plaintiff')}
                                              className="text-red-500 hover:text-red-700 p-0.5"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Defendants */}
          <div>
            {/* Defendants Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">Defendants</h2>
                </div>
                {isEditing && (
                  <button
                    onClick={() => setShowDefendantForm(!showDefendantForm)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                )}
              </div>
              
              {/* Add Defendant Form */}
              {isEditing && showDefendantForm && (
                <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={newPartyForm.name}
                        onChange={(e) => setNewPartyForm({ ...newPartyForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newPartyForm.type}
                        onChange={(e) => setNewPartyForm({ ...newPartyForm, type: e.target.value as Party['type'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                      >
                        <option value="individual">Individual</option>
                        <option value="corporation">Corporation</option>
                        <option value="entity">Entity</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddDefendant}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Add Defendant
                      </button>
                      <button
                        onClick={() => {
                          setShowDefendantForm(false)
                          setNewPartyForm({ name: '', type: 'individual', address: '', phone: '', email: '' })
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Defendants List */}
              {defendants.length === 0 ? (
                <p className="text-gray-400 italic text-sm">No defendants added yet.</p>
              ) : (
                <div className="space-y-2">
                  {defendants.map((defendant) => (
                    <div key={defendant.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {editingDefendantId === defendant.id ? (
                        // Edit form for this defendant
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                              type="text"
                              value={editPartyForm.name}
                              onChange={(e) => setEditPartyForm({ ...editPartyForm, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={editPartyForm.type}
                              onChange={(e) => setEditPartyForm({ ...editPartyForm, type: e.target.value as Party['type'] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                            >
                              <option value="individual">Individual</option>
                              <option value="corporation">Corporation</option>
                              <option value="entity">Entity</option>
                            </select>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEditDefendant}
                              className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditDefendant}
                              className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display view for this defendant with nested attorneys
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{defendant.name}</p>
                              <p className="text-sm text-gray-500 capitalize">{defendant.type}</p>
                            </div>
                            {isEditing && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleStartEditDefendant(defendant)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveDefendant(defendant.id)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Nested Attorneys for this defendant */}
                          <div className="mt-3 ml-4 border-l-2 border-red-200 pl-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-red-700 flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                Counsel
                              </p>
                              {isEditing && (
                                <button
                                  onClick={() => {
                                    setAddingAttorneyToPartyId(defendant.id)
                                    setAddingAttorneyToSide('defendant')
                                    setNewAttorneyForm({ name: '', firm: '', barNumber: '', address: '', phone: '', email: '' })
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 flex items-center"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </button>
                              )}
                            </div>
                            
                            {/* Add Attorney Form for this defendant */}
                            {isEditing && addingAttorneyToPartyId === defendant.id && addingAttorneyToSide === 'defendant' && (
                              <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={newAttorneyForm.name}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 text-black"
                                    placeholder="Attorney name *"
                                  />
                                  <input
                                    type="text"
                                    value={newAttorneyForm.firm || ''}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, firm: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 text-black"
                                    placeholder="Law firm"
                                  />
                                  <input
                                    type="text"
                                    value={newAttorneyForm.barNumber || ''}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, barNumber: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 text-black"
                                    placeholder="Bar number"
                                  />
                                  <input
                                    type="text"
                                    value={newAttorneyForm.address || ''}
                                    onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, address: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 text-black"
                                    placeholder="Address"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={newAttorneyForm.phone || ''}
                                      onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, phone: e.target.value })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 text-black"
                                      placeholder="Phone"
                                    />
                                    <input
                                      type="email"
                                      value={newAttorneyForm.email || ''}
                                      onChange={(e) => setNewAttorneyForm({ ...newAttorneyForm, email: e.target.value })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500 text-black"
                                      placeholder="Email"
                                    />
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleAddAttorneyToParty(defendant.id, 'defendant')}
                                      className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setAddingAttorneyToPartyId(null)}
                                      className="flex-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* List of attorneys for this defendant */}
                            {(!defendant.attorneys || defendant.attorneys.length === 0) && addingAttorneyToPartyId !== defendant.id ? (
                              <p className="text-xs text-gray-400 italic">No counsel assigned</p>
                            ) : (
                              <div className="space-y-2">
                                {(defendant.attorneys || []).map((attorney) => (
                                  <div key={attorney.id} className="p-2 bg-red-50 rounded border border-red-100">
                                    {editingAttorneyId === attorney.id && editingAttorneyPartyId === defendant.id ? (
                                      // Edit form for attorney
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          value={editAttorneyForm.name}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, name: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Name"
                                        />
                                        <input
                                          type="text"
                                          value={editAttorneyForm.firm || ''}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, firm: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Firm"
                                        />
                                        <input
                                          type="text"
                                          value={editAttorneyForm.barNumber || ''}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, barNumber: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Bar #"
                                        />
                                        <input
                                          type="text"
                                          value={editAttorneyForm.address || ''}
                                          onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, address: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                          placeholder="Address"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            type="text"
                                            value={editAttorneyForm.phone || ''}
                                            onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, phone: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                            placeholder="Phone"
                                          />
                                          <input
                                            type="email"
                                            value={editAttorneyForm.email || ''}
                                            onChange={(e) => setEditAttorneyForm({ ...editAttorneyForm, email: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                                            placeholder="Email"
                                          />
                                        </div>
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleSaveEditAttorney('defendant')}
                                            className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEditAttorney}
                                            className="flex-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="text-sm font-medium text-gray-800">{attorney.name}</p>
                                          {attorney.firm && <p className="text-xs text-gray-600">{attorney.firm}</p>}
                                          {attorney.barNumber && <p className="text-xs text-gray-500">Bar #: {attorney.barNumber}</p>}
                                          {attorney.address && <p className="text-xs text-gray-500">{attorney.address}</p>}
                                          {attorney.phone && <p className="text-xs text-gray-500">{attorney.phone}</p>}
                                          {attorney.email && <p className="text-xs text-gray-500">{attorney.email}</p>}
                                        </div>
                                        {isEditing && (
                                          <div className="flex space-x-1">
                                            <button
                                              onClick={() => handleStartEditAttorney(attorney, defendant.id)}
                                              className="text-blue-500 hover:text-blue-700 p-0.5"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleRemoveAttorneyFromParty(defendant.id, attorney.id, 'defendant')}
                                              className="text-red-500 hover:text-red-700 p-0.5"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Facts and Trial Date */}
          <div className="space-y-6">
            {/* Facts Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Case Facts</h2>
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={formData.facts}
                    onChange={(e) => setFormData({ ...formData, facts: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black min-h-[200px]"
                    placeholder="Enter the facts of the case..."
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium disabled:opacity-50"
                  >
                    <Save className="h-5 w-5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap">
                  {caseItem.facts || (
                    <span className="text-gray-400 italic">No facts entered yet. Click Edit to add case facts.</span>
                  )}
                </div>
              )}
            </div>

            {/* Trial Date Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Trial Date</h2>
              </div>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <input
                      type="date"
                      value={formData.trialDate}
                      onChange={(e) => setFormData({ ...formData, trialDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Deadlines will be automatically calculated based on this trial date.
                    </p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium disabled:opacity-50"
                  >
                    <Save className="h-5 w-5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-lg text-gray-700">
                  {caseItem.trialDate ? (
                    new Date(caseItem.trialDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  ) : (
                    <span className="text-gray-400 italic">No trial date set. Click Edit to add a trial date.</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Deadlines */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Upcoming Deadlines</h2>
              </div>
              <button
                onClick={() => setShowDeadlineForm(!showDeadlineForm)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Deadline</span>
              </button>
            </div>

            {/* Add Deadline Form */}
            {showDeadlineForm && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={deadlineForm.date}
                      onChange={(e) => setDeadlineForm({ ...deadlineForm, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={deadlineForm.description}
                      onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., File motion for summary judgment"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddDeadline}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowDeadlineForm(false)
                        setDeadlineForm({ date: '', description: '' })
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Deadlines List */}
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming deadlines</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {displayedDeadlines.map((deadline) => {
                    const deadlineDate = new Date(deadline.date)
                    const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    const isOverdue = daysUntil < 0
                    const isUrgent = daysUntil <= 7 && daysUntil >= 0
                    
                    return (
                      <div
                        key={deadline.id}
                        className={`p-4 rounded-xl border ${
                          isOverdue
                            ? 'bg-red-50 border-red-200'
                            : isUrgent
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <input
                                type="checkbox"
                                checked={deadline.completed || false}
                                onChange={(e) => handleToggleDeadline(deadline.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className={`font-medium ${deadline.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {deadline.description}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 ml-6">
                              {deadlineDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                              {isOverdue && (
                                <span className="ml-2 text-red-600 font-semibold">
                                  ({Math.abs(daysUntil)} days overdue)
                                </span>
                              )}
                              {isUrgent && !isOverdue && (
                                <span className="ml-2 text-yellow-600 font-semibold">
                                  ({daysUntil} days remaining)
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDeadline(deadline.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Delete deadline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Show More/Less Button */}
                {hasMoreDeadlines && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAllDeadlines(!showAllDeadlines)}
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                      <span>
                        {showAllDeadlines 
                          ? `Show Less (${upcomingDeadlines.length} total)` 
                          : `Show All ${upcomingDeadlines.length} Deadlines`}
                      </span>
                      {showAllDeadlines ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Access to Services */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Access to Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href={`/services/demand-letters?caseId=${caseItem.id}`}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center"
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm font-medium text-gray-700">Demand Letters</div>
            </Link>
            {/* Pleadings Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsPleadingsHovered(true)}
              onMouseLeave={() => setIsPleadingsHovered(false)}
            >
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center cursor-pointer">
                <div className="text-3xl mb-2">⚖️</div>
                <div className="text-sm font-medium text-gray-700">Pleadings</div>
              </div>
              
              {isPleadingsHovered && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[160px]">
                  <Link
                    href={`/services/pleadings/complaint?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsPleadingsHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📝</span>
                      <span>Complaint</span>
                    </div>
                  </Link>
                  <Link
                    href={`/services/pleadings/answer?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsPleadingsHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">⚖️</span>
                      <span>Answer</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
            {/* Discovery Dropdown - Case-Scoped */}
            <div
              className="relative"
              onMouseEnter={() => setIsDiscoveryHovered(true)}
              onMouseLeave={() => setIsDiscoveryHovered(false)}
            >
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center cursor-pointer">
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm font-medium text-gray-700">Discovery</div>
              </div>
              
              {isDiscoveryHovered && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[220px]">
                  {/* New Case-Scoped Discovery */}
                  <Link
                    href={`/dashboard/cases/${caseItem.id}/discovery`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium border-b border-gray-100"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📋</span>
                      <span className="font-semibold">Discovery Hub</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">All discovery documents</p>
                  </Link>
                  <Link
                    href={`/dashboard/cases/${caseItem.id}/discovery/interrogatories`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📝</span>
                      <span>Interrogatories</span>
                    </div>
                  </Link>
                  <Link
                    href={`/dashboard/cases/${caseItem.id}/discovery/rfp`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📂</span>
                      <span>Requests for Production</span>
                    </div>
                  </Link>
                  <Link
                    href={`/dashboard/cases/${caseItem.id}/discovery/rfa`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">✅</span>
                      <span>Requests for Admission</span>
                    </div>
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <Link
                      href={`/services/discovery/respond-to-discovery?caseId=${caseItem.id}`}
                      className="block px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-xs"
                      onClick={() => setIsDiscoveryHovered(false)}
                    >
                      <div className="flex items-center">
                        <span className="mr-2">📥</span>
                        <span>Respond to Discovery</span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
              <Link
                href={`/services/deposition/depositions/${caseItem.id}`}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center"
              >
                <div className="text-3xl mb-2">📝</div>
                <div className="text-sm font-medium text-gray-700">Deposition</div>
              </Link>
            <Link
              href={`/services/law-and-motion?caseId=${caseItem.id}`}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center"
            >
              <div className="text-3xl mb-2">✍️</div>
              <div className="text-sm font-medium text-gray-700">Law and Motion</div>
            </Link>
            <Link
              href={`/services/settlement-agreements?caseId=${caseItem.id}`}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center"
            >
              <div className="text-3xl mb-2">🤝</div>
              <div className="text-sm font-medium text-gray-700">Settlement Agreements</div>
            </Link>
            <Link
              href={`/services/billing-comparison?caseId=${caseItem.id}`}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all text-center"
            >
              <div className="text-3xl mb-2">💰</div>
              <div className="text-sm font-medium text-gray-700">Billing Generator</div>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

