'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  DollarSign, Clock, Calendar, Filter, Plus, Trash2, 
  Sparkles, ArrowLeft, X, GripVertical, Pencil
} from 'lucide-react'
import { supabaseBillingStorage, BillingEntry, DailyBillingSummary } from '@/lib/supabase/billingStorage'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<BillingEntry[]>([])
  const [cases, setCases] = useState<CaseFrontend[]>([])
  const [todaysSummary, setTodaysSummary] = useState<DailyBillingSummary | null>(null)
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams?.get('date') || new Date().toISOString().split('T')[0]
  )
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    searchParams?.get('caseId') || ''
  )
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  
  // Add entry form
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    caseName: '',
    caseId: '',
    description: '',
    hours: '',
    rate: '',
    billingDate: new Date().toISOString().split('T')[0]
  })
  
  // AI generation
  const [isGenerating, setIsGenerating] = useState(false)

  // Drag and drop state
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null)
  const [dragOverEntry, setDragOverEntry] = useState<string | null>(null)

  // Edit entry state
  const [editingEntry, setEditingEntry] = useState<BillingEntry | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)

  const loadEntries = async () => {
    let startDate: string | undefined
    let endDate: string | undefined
    const today = new Date()

    switch (dateRange) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0]
        break
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        startDate = weekAgo.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        startDate = monthAgo.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'custom':
        startDate = endDate = selectedDate
        break
    }

    const loadedEntries = await supabaseBillingStorage.getBillingEntries({
      startDate,
      endDate,
      caseId: selectedCaseId || undefined
    })
    
    setEntries(loadedEntries)
  }

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Load cases for the dropdown
      const userCases = await supabaseCaseStorage.getUserCases()
      setCases(userCases)

      // Load today's summary
      const summary = await supabaseBillingStorage.getTodaysBilling()
      setTodaysSummary(summary)

      // Load entries based on filters
      await loadEntries()
      
      setLoading(false)
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (!loading) {
      loadEntries()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedDate, selectedCaseId, loading])

  // Group entries by date for display
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, BillingEntry[]> = {}
    entries.forEach(entry => {
      if (!grouped[entry.billingDate]) {
        grouped[entry.billingDate] = []
      }
      grouped[entry.billingDate].push(entry)
    })
    return grouped
  }, [entries])

  const totalHours = useMemo(() => 
    entries.reduce((sum, e) => sum + e.hours, 0), [entries]
  )

  const totalAmount = useMemo(() => 
    entries.reduce((sum, e) => sum + (e.amount || 0), 0), [entries]
  )

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.caseName || !formData.description || !formData.hours) {
      alert('Please fill in case name, description, and hours')
      return
    }

    setIsSubmitting(true)
    
    const newEntry = await supabaseBillingStorage.addBillingEntry({
      caseName: formData.caseName,
      caseId: formData.caseId || undefined,
      description: formData.description,
      hours: parseFloat(formData.hours),
      rate: formData.rate ? parseFloat(formData.rate) : undefined,
      billingDate: formData.billingDate
    })

    if (newEntry) {
      setEntries(prev => [newEntry, ...prev])
      setFormData({
        caseName: '',
        caseId: '',
        description: '',
        hours: '',
        rate: '',
        billingDate: new Date().toISOString().split('T')[0]
      })
      setShowAddForm(false)
      
      // Refresh today's summary if adding for today
      if (formData.billingDate === new Date().toISOString().split('T')[0]) {
        const summary = await supabaseBillingStorage.getTodaysBilling()
        setTodaysSummary(summary)
      }
    }

    setIsSubmitting(false)
  }

  const handleAIGenerate = async () => {
    if (!formData.caseName || !formData.description) {
      alert('Please enter case name and a brief description first')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/generateBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseName: formData.caseName,
          description: formData.description
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Show the actual error to the user with full details
        const errorDetails = [
          data.error,
          data.message,
          data.code ? `Code: ${data.code}` : null,
          data.param ? `Param: ${data.param}` : null,
          data.debug ? `Debug: ${JSON.stringify(data.debug)}` : null
        ].filter(Boolean).join('\n');
        alert(`AI Error:\n${errorDetails || 'Unknown error'}`)
        console.error('API Error - Full response:', JSON.stringify(data, null, 2))
        setIsGenerating(false)
        return
      }
      
      if (data.result) {
        setFormData(prev => ({
          ...prev,
          description: data.result,
          // Auto-fill suggested hours from template matching if not already set
          hours: prev.hours || data.suggestedHours?.toString() || prev.hours
        }))
      } else {
        alert('No result returned from AI')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Failed to connect to AI service')
    }

    setIsGenerating(false)
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this billing entry?')) return
    
    const deleted = await supabaseBillingStorage.deleteBillingEntry(entryId)
    if (deleted) {
      setEntries(prev => prev.filter(e => e.id !== entryId))
      
      // Refresh today's summary
      const summary = await supabaseBillingStorage.getTodaysBilling()
      setTodaysSummary(summary)
    }
  }

  const handleCaseSelect = (caseId: string) => {
    const selectedCase = cases.find(c => c.id === caseId)
    setFormData(prev => ({
      ...prev,
      caseId,
      caseName: selectedCase?.caseName || ''
    }))
  }

  // Edit entry handlers
  const handleStartEdit = (entry: BillingEntry) => {
    setEditingEntry(entry)
    setFormData({
      caseName: entry.caseName,
      caseId: entry.caseId || '',
      description: entry.description,
      hours: entry.hours.toString(),
      rate: entry.rate?.toString() || '',
      billingDate: entry.billingDate
    })
    setShowEditForm(true)
  }

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry || !formData.caseName || !formData.description || !formData.hours) {
      alert('Please fill in case name, description, and hours')
      return
    }

    setIsSubmitting(true)
    
    const updated = await supabaseBillingStorage.updateBillingEntry(editingEntry.id, {
      caseName: formData.caseName,
      caseId: formData.caseId || null,
      description: formData.description,
      hours: parseFloat(formData.hours),
      rate: formData.rate ? parseFloat(formData.rate) : null,
      billingDate: formData.billingDate
    })

    if (updated) {
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
      setShowEditForm(false)
      setEditingEntry(null)
      setFormData({
        caseName: '',
        caseId: '',
        description: '',
        hours: '',
        rate: '',
        billingDate: new Date().toISOString().split('T')[0]
      })
      
      // Refresh today's summary if editing entry for today
      if (formData.billingDate === new Date().toISOString().split('T')[0]) {
        const summary = await supabaseBillingStorage.getTodaysBilling()
        setTodaysSummary(summary)
      }
    }

    setIsSubmitting(false)
  }

  const handleCloseEditForm = () => {
    setShowEditForm(false)
    setEditingEntry(null)
    setFormData({
      caseName: '',
      caseId: '',
      description: '',
      hours: '',
      rate: '',
      billingDate: new Date().toISOString().split('T')[0]
    })
  }

  // Drag and drop handlers
  const handleEntryDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedEntry(entryId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleEntryDragOver = (e: React.DragEvent, entryId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (entryId !== draggedEntry) {
      setDragOverEntry(entryId)
    }
  }

  const handleEntryDragLeave = () => {
    setDragOverEntry(null)
  }

  const handleEntryDrop = (e: React.DragEvent, targetEntryId: string) => {
    e.preventDefault()
    if (draggedEntry && draggedEntry !== targetEntryId) {
      // Find indices
      const draggedIndex = entries.findIndex(entry => entry.id === draggedEntry)
      const targetIndex = entries.findIndex(entry => entry.id === targetEntryId)
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newEntries = [...entries]
        const [draggedItem] = newEntries.splice(draggedIndex, 1)
        newEntries.splice(targetIndex, 0, draggedItem)
        setEntries(newEntries)
      }
    }
    setDraggedEntry(null)
    setDragOverEntry(null)
  }

  const handleEntryDragEnd = () => {
    setDraggedEntry(null)
    setDragOverEntry(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-600">Loading billing...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing Tracker</h1>
              <p className="text-gray-600 mt-1">Track and manage your daily billing entries</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-5 w-5" />
            <span>Add Entry</span>
          </button>
        </div>

        {/* Today's Summary Card */}
        {todaysSummary && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Today&apos;s Billing</p>
                <p className="text-3xl font-bold mt-1">{todaysSummary.totalHours.toFixed(1)} hours</p>
                {todaysSummary.totalAmount > 0 && (
                  <p className="text-emerald-100 mt-1">${todaysSummary.totalAmount.toFixed(2)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-emerald-100 text-sm">{todaysSummary.entriesCount} entries</p>
                <p className="text-2xl font-bold mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filter by:</span>
            </div>
            
            {/* Date Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['today', 'week', 'month', 'custom'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                    dateRange === range
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Date Picker for Custom */}
            {dateRange === 'custom' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
              />
            )}

            {/* Case Filter */}
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
            >
              <option value="">All Cases</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.caseName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Entries</p>
                <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Billing Entries</h2>
          
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No billing entries</h3>
              <p className="text-gray-600 mb-6">Start tracking your time by adding an entry</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                Add Your First Entry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(entriesByDate).map(([date, dateEntries]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {dateEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} hours
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {dateEntries.map(entry => (
                      <div
                        key={entry.id}
                        className={`bg-white p-4 rounded-xl border transition-all duration-200 group ${
                          draggedEntry === entry.id 
                            ? 'opacity-50 scale-[0.98] border-emerald-400' 
                            : dragOverEntry === entry.id
                              ? 'border-emerald-400 ring-2 ring-emerald-200'
                              : 'border-gray-200 hover:border-emerald-300'
                        }`}
                        style={{ cursor: 'grab' }}
                        draggable
                        onDragStart={(e) => handleEntryDragStart(e, entry.id)}
                        onDragOver={(e) => handleEntryDragOver(e, entry.id)}
                        onDragLeave={handleEntryDragLeave}
                        onDrop={(e) => handleEntryDrop(e, entry.id)}
                        onDragEnd={handleEntryDragEnd}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag Handle - Two Lines */}
                          <div className="flex-shrink-0 flex items-center pt-1">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          </div>
                          
                          {/* Entry Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{entry.caseName}</span>
                              {entry.isAiGenerated && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  AI
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{entry.description}</p>
                          </div>
                          
                          {/* Hours & Actions */}
                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">{entry.hours.toFixed(1)}h</p>
                              {entry.amount && entry.amount > 0 && (
                                <p className="text-sm text-gray-500">${entry.amount.toFixed(2)}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartEdit(entry)}
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit entry"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Entry Modal */}
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddForm(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Add Billing Entry</h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAddEntry} className="p-6 space-y-4">
                {/* Case Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case
                  </label>
                  <select
                    value={formData.caseId}
                    onChange={(e) => handleCaseSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
                  >
                    <option value="">Select a case or enter custom</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.caseName}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Case Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case Name *
                  </label>
                  <input
                    type="text"
                    value={formData.caseName}
                    onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
                    placeholder="Enter case name"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
                      placeholder="Describe the work performed..."
                      rows={3}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={isGenerating}
                      className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGenerating ? 'Generating...' : 'AI Enhance'}
                    </button>
                  </div>
                </div>

                {/* Hours & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
                      placeholder="0.0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate ($/hr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.billingDate}
                    onChange={(e) => setFormData({ ...formData, billingDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-black"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Entry Modal */}
        {showEditForm && editingEntry && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseEditForm}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Edit Billing Entry</h3>
                  <button
                    onClick={handleCloseEditForm}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleEditEntry} className="p-6 space-y-4">
                {/* Case Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case
                  </label>
                  <select
                    value={formData.caseId}
                    onChange={(e) => handleCaseSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="">Select a case or enter custom</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.caseName}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Case Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case Name *
                  </label>
                  <input
                    type="text"
                    value={formData.caseName}
                    onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="Enter case name"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="Describe the work performed..."
                      rows={3}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={isGenerating}
                      className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGenerating ? 'Generating...' : 'AI Enhance'}
                    </button>
                  </div>
                </div>

                {/* Hours & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="0.0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate ($/hr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.billingDate}
                    onChange={(e) => setFormData({ ...formData, billingDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEditForm}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function DashboardBilling() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-gray-600">Loading billing...</div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
