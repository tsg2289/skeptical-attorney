'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, LogOut, Trash2, Calendar, DollarSign, Clock, ChevronLeft, ChevronRight, AlertCircle, Sparkles, StickyNote, GripVertical, Edit2 } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabaseCaseStorage, CaseFrontend, Deadline } from '@/lib/supabase/caseStorage'
import { supabaseBillingStorage, DailyBillingSummary } from '@/lib/supabase/billingStorage'
import { supabaseUserNotesStorage, UserNote } from '@/lib/supabase/userNotesStorage'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface UserInfo {
  id: string
  email: string
  fullName: string
}

interface SortableUserNoteProps {
  note: UserNote
  editingNoteId: string | null
  editNoteContent: string
  setEditNoteContent: (content: string) => void
  setEditingNoteId: (id: string | null) => void
  handleUpdateNote: (id: string) => void
  handleDeleteNote: (id: string) => void
  isSavingNote: boolean
}

function SortableUserNote({ 
  note, 
  editingNoteId, 
  editNoteContent, 
  setEditNoteContent, 
  setEditingNoteId, 
  handleUpdateNote, 
  handleDeleteNote,
  isSavingNote 
}: SortableUserNoteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border-2 shadow-sm ${isDragging ? 'border-amber-400 shadow-lg' : 'border-gray-200'}`}
    >
      {editingNoteId === note.id ? (
        <div className="p-4 space-y-3">
          <textarea
            value={editNoteContent}
            onChange={(e) => setEditNoteContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-black min-h-[100px]"
          />
          <div className="flex space-x-2">
            <button
              onClick={() => handleUpdateNote(note.id)}
              disabled={isSavingNote}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingNoteId(null)
                setEditNoteContent('')
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center px-3 bg-gray-50 rounded-l-xl cursor-grab active:cursor-grabbing border-r border-gray-200 hover:bg-gray-100"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          
          {/* Note Content */}
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs text-gray-500">
                {new Date(note.createdAt).toLocaleString()}
                {note.updatedAt && (
                  <span className="ml-2 italic">(edited)</span>
                )}
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setEditingNoteId(note.id)
                    setEditNoteContent(note.content)
                  }}
                  className="text-blue-500 hover:text-blue-700 p-1"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface DeadlineWithCase extends Deadline {
  caseName: string
  caseId: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [cases, setCases] = useState<CaseFrontend[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    caseName: '',
    caseNumber: '',
    caseType: '',
    client: ''
  })
  const [todaysBilling, setTodaysBilling] = useState<DailyBillingSummary | null>(null)
  const router = useRouter()
  
  // Notes state
  const [userNotes, setUserNotes] = useState<UserNote[]>([])
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Get all deadlines from all cases
  const allDeadlines: DeadlineWithCase[] = useMemo(() => {
    return cases.flatMap(c => 
      (c.deadlines || []).map(d => ({
        ...d,
        caseName: c.caseName,
        caseId: c.id
      }))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [cases])

  // Get recent cases (last 5, sorted by creation date)
  const recentCases = useMemo(() => {
    return [...cases]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [cases])

  // Get upcoming deadlines (next 7 days)
  const upcomingDeadlines = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    return allDeadlines.filter(d => {
      const deadlineDate = new Date(d.date)
      return deadlineDate >= today && deadlineDate <= nextWeek && !d.completed
    })
  }, [allDeadlines])

  // Get deadlines for the selected day
  const selectedDayDeadlines = useMemo(() => {
    if (selectedDay === null) return []
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    return allDeadlines.filter(d => d.date === dateStr)
  }, [selectedDay, currentMonth, allDeadlines])

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    return { daysInMonth, startingDay }
  }

  const getDeadlinesForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return allDeadlines.filter(d => d.date === dateStr)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear()
  }

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (supabaseUser) {
        const userInfo: UserInfo = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User'
        }
        setUser(userInfo)
        
        const userCases = await supabaseCaseStorage.getUserCases()
        setCases(userCases)
        
        // Load today's billing data
        const billingData = await supabaseBillingStorage.getTodaysBilling()
        setTodaysBilling(billingData)
        
        // Load user notes
        const notes = await supabaseUserNotesStorage.getUserNotes()
        setUserNotes(notes)
      } else {
        router.push('/login')
      }
      
      setLoading(false)
    }
    
    checkAuth()
  }, [router])

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    if (!formData.caseName.trim() || !formData.caseNumber.trim()) {
      alert('Please fill in case name and case number')
      return
    }

    setIsSubmitting(true)
    
    try {
      const newCase = await supabaseCaseStorage.addCase({
        caseName: formData.caseName.trim(),
        caseNumber: formData.caseNumber.trim(),
        caseType: formData.caseType.trim() || undefined,
        client: formData.client.trim() || undefined,
      })
      
      if (newCase) {
        setCases(prev => [newCase, ...prev])
        setFormData({ caseName: '', caseNumber: '', caseType: '', client: '' })
        setShowAddForm(false)
      } else {
        alert('Error adding case. Please make sure the database table is set up.')
      }
    } catch (err) {
      console.error('Error adding case:', err)
      alert('Error adding case')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete this case?')) {
      return
    }
    
    const deleted = await supabaseCaseStorage.deleteCase(caseId)
    if (deleted) {
      setCases(prev => prev.filter(c => c.id !== caseId))
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setCases([])
    router.push('/')
    router.refresh()
  }

  // Note handlers
  const handleAddNote = async () => {
    if (!user || !newNoteContent.trim()) return
    
    setIsSavingNote(true)
    const newNote = await supabaseUserNotesStorage.addNote(newNoteContent.trim())
    
    if (newNote) {
      setUserNotes(prev => [...prev, newNote])
      setNewNoteContent('')
      setShowNoteForm(false)
    }
    setIsSavingNote(false)
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!user || !editNoteContent.trim()) return
    
    setIsSavingNote(true)
    const updated = await supabaseUserNotesStorage.updateNote(noteId, editNoteContent.trim())
    
    if (updated) {
      setUserNotes(prev => prev.map(n => n.id === noteId ? updated : n))
      setEditingNoteId(null)
      setEditNoteContent('')
    }
    setIsSavingNote(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this note?')) return
    
    const deleted = await supabaseUserNotesStorage.deleteNote(noteId)
    if (deleted) {
      setUserNotes(prev => prev.filter(n => n.id !== noteId))
    }
  }

  // DnD sensors for notes
  const noteSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleNoteDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = userNotes.findIndex((n) => n.id === active.id)
      const newIndex = userNotes.findIndex((n) => n.id === over.id)
      
      const reorderedNotes = arrayMove(userNotes, oldIndex, newIndex)
      setUserNotes(reorderedNotes)
      
      // Save new order to database
      await supabaseUserNotesStorage.reorderNotes(reorderedNotes.map(n => n.id))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user.fullName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-white/50"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Top Row: Billing + Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Billing Widget */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Today&apos;s Billing</h2>
              </div>
              <Link 
                href="/dashboard/billing"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Open Billing →
              </Link>
            </div>
            
            {!todaysBilling || todaysBilling.entries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No billing entries for today</p>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add billing entry
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysBilling.entries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{entry.caseName}</p>
                        {entry.isAiGenerated && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">{entry.description}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold text-emerald-600">{entry.hours.toFixed(1)}h</p>
                      {entry.amount && entry.amount > 0 && (
                        <p className="text-sm text-gray-500">${entry.amount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {todaysBilling.entries.length > 3 && (
                  <p className="text-center text-sm text-gray-500">
                    +{todaysBilling.entries.length - 3} more entries
                  </p>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-700">Total</span>
                  <div className="text-right">
                    <span className="font-bold text-lg text-emerald-600">{todaysBilling.totalHours.toFixed(1)}h</span>
                    {todaysBilling.totalAmount > 0 && (
                      <span className="text-gray-500 ml-2">(${todaysBilling.totalAmount.toFixed(2)})</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Deadlines Widget */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Upcoming Deadlines</h2>
              </div>
              <span className="text-sm text-gray-500">Next 7 days</span>
            </div>
            
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {upcomingDeadlines.slice(0, 5).map((deadline) => (
                  <Link
                    key={deadline.id}
                    href={`/dashboard/cases/${deadline.caseId}`}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex flex-col items-center justify-center text-white">
                      <span className="text-xs font-medium">
                        {new Date(deadline.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(deadline.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{deadline.description}</p>
                      <p className="text-sm text-blue-600">{deadline.caseName}</p>
                    </div>
                  </Link>
                ))}
                {upcomingDeadlines.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    +{upcomingDeadlines.length - 5} more deadlines
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Calendar className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Deadlines Calendar</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <span className="font-semibold text-gray-900 min-w-[140px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 overflow-visible">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-1" />
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayDeadlines = getDeadlinesForDate(day)
              const hasDeadlines = dayDeadlines.length > 0
              
              return (
                <div
                  key={day}
                  onClick={() => hasDeadlines && setSelectedDay(day)}
                  className={`min-h-[80px] p-2 rounded-lg transition-colors relative group border ${
                    hasDeadlines ? 'cursor-pointer' : ''
                  } ${
                    isToday(day) 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : hasDeadlines 
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-200' 
                        : 'hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${isToday(day) ? 'text-white' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  {hasDeadlines && (
                    <div className="space-y-1 overflow-visible">
                      {dayDeadlines.slice(0, 2).map((d, idx) => (
                        <div key={idx} className="relative group/deadline">
                          <div
                            className={`block text-xs leading-tight truncate rounded px-1 py-0.5 ${
                              isToday(day) 
                                ? 'bg-white/20 text-white hover:bg-white/30' 
                                : 'bg-amber-200/50 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {d.description}
                          </div>
                          {/* Hover tooltip showing case name */}
                          <div className="absolute z-50 invisible group-hover/deadline:visible bg-gray-900 text-white text-xs rounded-lg p-3 w-64 left-1/2 -translate-x-1/2 bottom-full mb-2 shadow-xl pointer-events-none">
                            <p className="font-semibold text-blue-300 mb-1">{d.caseName}</p>
                            <p className="text-gray-200 whitespace-normal">{d.description}</p>
                            <p className="text-gray-400 text-[10px] mt-2">Click day to view all</p>
                            {/* Arrow pointing down */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      ))}
                      {dayDeadlines.length > 2 && (
                        <div className={`text-xs ${isToday(day) ? 'text-white/80' : 'text-amber-600'}`}>
                          +{dayDeadlines.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Notes Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <StickyNote className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Quick Notes</h2>
            </div>
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Note</span>
            </button>
          </div>

          {/* Add Note Form */}
          {showNoteForm && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="space-y-4">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-black min-h-[120px]"
                  placeholder="Enter your note..."
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddNote}
                    disabled={isSavingNote || !newNoteContent.trim()}
                    className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {isSavingNote ? 'Saving...' : 'Save Note'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteForm(false)
                      setNewNoteContent('')
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes List with Drag and Drop */}
          {userNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notes yet. Click &quot;Add Note&quot; to create one.</p>
            </div>
          ) : (
            <DndContext
              sensors={noteSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleNoteDragEnd}
            >
              <SortableContext items={userNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {userNotes.map((note) => (
                    <SortableUserNote
                      key={note.id}
                      note={note}
                      editingNoteId={editingNoteId}
                      editNoteContent={editNoteContent}
                      setEditNoteContent={setEditNoteContent}
                      setEditingNoteId={setEditingNoteId}
                      handleUpdateNote={handleUpdateNote}
                      handleDeleteNote={handleDeleteNote}
                      isSavingNote={isSavingNote}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Cases Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">My Cases</h2>
              </div>
              
              {/* Tab Switcher */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'recent' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'all' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({cases.length})
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="h-5 w-5" />
              <span>Add Case</span>
            </button>
          </div>

          {/* Add Case Form */}
          {showAddForm && (
            <div className="mb-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Case</h3>
              <form onSubmit={handleAddCase} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="caseName" className="block text-sm font-medium text-gray-700 mb-1">
                      Case Name *
                    </label>
                    <input
                      id="caseName"
                      type="text"
                      value={formData.caseName}
                      onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., Smith vs. Johnson"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="caseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Case Number *
                    </label>
                    <input
                      id="caseNumber"
                      type="text"
                      value={formData.caseNumber}
                      onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., CV-2024-001"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="caseType" className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Case
                    </label>
                    <input
                      id="caseType"
                      type="text"
                      value={formData.caseType}
                      onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., Personal Injury"
                    />
                  </div>
                  <div>
                    <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                      Client
                    </label>
                    <input
                      id="client"
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="e.g., John Smith"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Case'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setFormData({ caseName: '', caseNumber: '', caseType: '', client: '' })
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Cases List */}
          {(activeTab === 'recent' ? recentCases : cases).length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No cases yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first case</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Add Your First Case
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'recent' ? recentCases : cases).map((caseItem) => {
                const caseDeadlines = caseItem.deadlines?.filter(d => !d.completed) || []
                const nextDeadline = caseDeadlines.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                )[0]
                
                return (
                  <Link
                    key={caseItem.id}
                    href={`/dashboard/cases/${caseItem.id}`}
                    className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {caseItem.caseName}
                        </h3>
                        <p className="text-sm text-gray-500">#{caseItem.caseNumber}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteCase(caseItem.id)
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                        title="Delete case"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {caseItem.caseType && (
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mb-2">
                        {caseItem.caseType}
                      </span>
                    )}
                    
                    {caseItem.client && (
                      <p className="text-sm text-gray-600 mb-3">Client: {caseItem.client}</p>
                    )}
                    
                    {nextDeadline && (
                      <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{nextDeadline.description}</span>
                        <span className="text-amber-500 flex-shrink-0">
                          {new Date(nextDeadline.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                      <span>Created {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                      {caseDeadlines.length > 0 && (
                        <span>{caseDeadlines.length} active deadline{caseDeadlines.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Day Detail Modal */}
        {selectedDay !== null && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDay(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <h3 className="text-2xl font-bold">
                      {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay).toLocaleDateString('en-US', { weekday: 'long' })}, {selectedDay}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-blue-200 mt-2">
                  {selectedDayDeadlines.length} deadline{selectedDayDeadlines.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {selectedDayDeadlines.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No deadlines for this day</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayDeadlines.map((deadline) => (
                      <Link
                        key={deadline.id}
                        href={`/dashboard/cases/${deadline.caseId}`}
                        onClick={() => setSelectedDay(null)}
                        className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{deadline.description}</p>
                            <p className="text-sm text-blue-600 mt-1">{deadline.caseName}</p>
                          </div>
                          {deadline.completed && (
                            <span className="flex-shrink-0 ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
