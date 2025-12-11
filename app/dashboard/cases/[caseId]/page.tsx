'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabaseCaseStorage, CaseFrontend, Deadline } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { calculateDeadlinesFromTrialDate, generateDeadlineId } from '@/lib/utils/deadlineCalculator'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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
    description: '',
    facts: '',
    trialDate: ''
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
            description: foundCase.description || '',
            facts: foundCase.facts || '',
            trialDate: foundCase.trialDate || ''
          })
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
        description: formData.description.trim() || undefined,
        facts: formData.facts,
        trialDate: formData.trialDate
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black min-h-[80px]"
                      placeholder="Brief description of the case..."
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
                  {caseItem.client && (
                    <p className="text-lg text-gray-700 mt-1">Client: {caseItem.client}</p>
                  )}
                  {caseItem.description && (
                    <p className="text-gray-600 mt-2">{caseItem.description}</p>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              {isEditing ? (
                <>
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Edit2 className="h-5 w-5" />
                  <span>Edit</span>
                </>
              )}
            </button>
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
            {/* Discovery Dropdown */}
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
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[200px]">
                  <Link
                    href={`/services/discovery/propound-discovery?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📤</span>
                      <span>Propound Discovery</span>
                    </div>
                  </Link>
                  <Link
                    href={`/services/discovery/respond-to-discovery?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📥</span>
                      <span>Respond to Discovery</span>
                    </div>
                  </Link>
                  <Link
                    href={`/services/discovery/subpoena?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">⚖️</span>
                      <span>Subpoena</span>
                    </div>
                  </Link>
                  <Link
                    href={`/services/discovery/meet-and-confer?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">🤝</span>
                      <span>Meet and Confer</span>
                    </div>
                  </Link>
                  <Link
                    href={`/services/discovery/written-discovery?caseId=${caseItem.id}`}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
                    onClick={() => setIsDiscoveryHovered(false)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📝</span>
                      <span>Written Discovery</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
            <Link
              href={`/services/deposition/dashboard?matter=${caseItem.id}`}
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

