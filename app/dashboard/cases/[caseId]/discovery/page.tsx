'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, ClipboardList, CheckSquare, Sparkles, MessageSquareReply, ListChecks, Layers, Upload, StickyNote, Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseCaseStorage, CaseFrontend, CaseNote } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Note Component
interface SortableDiscoveryNoteProps {
  note: CaseNote
  editingNoteId: string | null
  editNoteContent: string
  setEditNoteContent: (content: string) => void
  setEditingNoteId: (id: string | null) => void
  handleUpdateNote: (id: string) => void
  handleDeleteNote: (id: string) => void
  isSaving: boolean
}

function SortableDiscoveryNote({ 
  note, 
  editingNoteId, 
  editNoteContent, 
  setEditNoteContent, 
  setEditingNoteId, 
  handleUpdateNote, 
  handleDeleteNote,
  isSaving 
}: SortableDiscoveryNoteProps) {
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
      className={`bg-white rounded-xl border-2 shadow-sm ${isDragging ? 'border-slate-400 shadow-lg' : 'border-gray-200'}`}
    >
      {editingNoteId === note.id ? (
        <div className="p-4 space-y-3">
          <textarea
            value={editNoteContent}
            onChange={(e) => setEditNoteContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 text-gray-900 min-h-[100px]"
          />
          <div className="flex space-x-2">
            <button
              onClick={() => handleUpdateNote(note.id)}
              disabled={isSaving}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm"
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

export default function DiscoveryLandingPage() {
  const params = useParams()
  const caseId = params?.caseId as string
  
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Discovery Notes state
  const [discoveryNotes, setDiscoveryNotes] = useState<CaseNote[]>([])
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(true)

  // DnD sensors for notes
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const foundCase = await supabaseCaseStorage.getCase(caseId)
        if (foundCase) {
          setCurrentCase(foundCase)
          // Load discovery notes from case
          setDiscoveryNotes(foundCase.discoveryNotes || [])
          console.log(`[AUDIT] Discovery landing accessed for case: ${caseId}`)
        }
      }
      setLoading(false)
    }
    
    loadCase()
  }, [caseId])

  // Add new note
  const handleAddNote = async () => {
    if (!currentCase || !newNoteContent.trim()) return
    
    setIsSavingNote(true)
    const newNote: CaseNote = {
      id: `dnote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString()
    }
    
    const updatedNotes = [newNote, ...discoveryNotes]
    const updated = await supabaseCaseStorage.updateCase(currentCase.id, { discoveryNotes: updatedNotes })
    
    if (updated) {
      setDiscoveryNotes(updatedNotes)
      setNewNoteContent('')
      setShowNoteForm(false)
    }
    setIsSavingNote(false)
  }

  // Update existing note
  const handleUpdateNote = async (noteId: string) => {
    if (!currentCase) return
    
    setIsSavingNote(true)
    const updatedNotes = discoveryNotes.map(n => 
      n.id === noteId 
        ? { ...n, content: editNoteContent.trim(), updatedAt: new Date().toISOString() }
        : n
    )
    
    const updated = await supabaseCaseStorage.updateCase(currentCase.id, { discoveryNotes: updatedNotes })
    
    if (updated) {
      setDiscoveryNotes(updatedNotes)
      setEditingNoteId(null)
      setEditNoteContent('')
    }
    setIsSavingNote(false)
  }

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!currentCase) return
    if (!confirm('Are you sure you want to delete this note?')) return
    
    const updatedNotes = discoveryNotes.filter(n => n.id !== noteId)
    const updated = await supabaseCaseStorage.updateCase(currentCase.id, { discoveryNotes: updatedNotes })
    
    if (updated) {
      setDiscoveryNotes(updatedNotes)
    }
  }

  // Handle note drag end
  const handleNoteDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = discoveryNotes.findIndex((n) => n.id === active.id)
      const newIndex = discoveryNotes.findIndex((n) => n.id === over.id)
      
      const reorderedNotes = arrayMove(discoveryNotes, oldIndex, newIndex)
      setDiscoveryNotes(reorderedNotes)
      
      // Save to database
      if (currentCase) {
        await supabaseCaseStorage.updateCase(currentCase.id, { discoveryNotes: reorderedNotes })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!currentCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Case Not Found</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  // Propounding discovery tools
  const propoundingTools = [
    {
      title: 'Form Interrogatories',
      description: 'Generate California Judicial Council Form Interrogatories (DISC-001) with selectable standard questions.',
      href: `/services/discovery/form-interrogatories?caseId=${caseId}`,
      icon: ListChecks,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      count: 0
    },
    {
      title: 'Special Interrogatories',
      description: 'Draft interrogatories with California-compliant formatting, definitions, and categorized questions.',
      href: `/dashboard/cases/${caseId}/discovery/interrogatories`,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      count: currentCase.discoveryDocuments?.interrogatories?.categories?.reduce((sum, cat) => sum + cat.items.length, 0) || 0
    },
    {
      title: 'Requests for Production',
      description: 'Create document requests with proper definitions and organized categories for evidence gathering.',
      href: `/dashboard/cases/${caseId}/discovery/rfp`,
      icon: ClipboardList,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      count: currentCase.discoveryDocuments?.rfp?.categories?.reduce((sum, cat) => sum + cat.items.length, 0) || 0
    },
    {
      title: 'Requests for Admission',
      description: 'Generate admission requests to establish undisputed facts and streamline trial preparation.',
      href: `/dashboard/cases/${caseId}/discovery/rfa`,
      icon: CheckSquare,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      count: currentCase.discoveryDocuments?.rfa?.items?.length || 0
    }
  ]

  // Responding to discovery tools
  const respondingTools = [
    {
      title: 'Form Interrogatories',
      shortTitle: 'FROG',
      description: 'Respond to California Judicial Council Form Interrogatories with AI-generated objections and answers.',
      href: `/dashboard/cases/${caseId}/discovery/responses?type=frog`,
      icon: ListChecks,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
    },
    {
      title: 'Special Interrogatories',
      shortTitle: 'SROG',
      description: 'Generate responses to special interrogatories with proper objections and substantive answers.',
      href: `/dashboard/cases/${caseId}/discovery/responses?type=srog`,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Requests for Production',
      shortTitle: 'RFP',
      description: 'Respond to document requests with appropriate objections and production statements.',
      href: `/dashboard/cases/${caseId}/discovery/responses?type=rfp`,
      icon: ClipboardList,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
    },
    {
      title: 'Requests for Admission',
      shortTitle: 'RFA',
      description: 'Craft strategic responses to admission requests with admit, deny, or qualified responses.',
      href: `/dashboard/cases/${caseId}/discovery/responses?type=rfa`,
      icon: CheckSquare,
      color: 'from-fuchsia-500 to-fuchsia-600',
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200',
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      {/* Case Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link 
                href={`/dashboard/cases/${currentCase.id}`}
                className="hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                <p className="text-sm text-blue-100">Case #: {currentCase.caseNumber}</p>
              </div>
            </div>
            <Link
              href={`/dashboard/cases/${currentCase.id}`}
              className="text-sm hover:underline text-blue-100"
            >
              Back to Case
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discovery <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Documents</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate and manage discovery documents for this case. All documents are automatically 
            formatted for California courts and scoped to this case only.
          </p>
        </div>

        {/* Propounding Discovery Section */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Propound Discovery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {propoundingTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className={`group block p-6 rounded-2xl border-2 ${tool.borderColor} ${tool.bgColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.color} text-white mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {tool.count > 0 ? `${tool.count} items drafted` : 'Start drafting'}
                    </span>
                    <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          
          {/* Propound Complete Set Button */}
          <button
            onClick={() => {
              // TODO: Implement bulk propound functionality
              console.log('Propound complete discovery set')
              alert('Coming soon: Propound complete discovery set (FROG, SROG, RFP, RFA)')
            }}
            className="mt-6 w-full group flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                Propound Complete Discovery Set
              </span>
              <p className="text-xs text-gray-500">Generate FROG, SROG, RFP & RFA all at once</p>
            </div>
            <span className="ml-auto text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Respond to Discovery Section */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Respond to Discovery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {respondingTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className={`group block p-6 rounded-2xl border-2 ${tool.borderColor} ${tool.bgColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.color} text-white mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Start responding
                    </span>
                    <span className="text-purple-600 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          
          {/* Respond to Complete Set Button */}
          <button
            onClick={() => {
              // TODO: Implement bulk respond functionality
              console.log('Respond to complete discovery set')
              alert('Coming soon: Upload and respond to complete discovery set')
            }}
            className="mt-6 w-full group flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-400 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                Respond to Complete Discovery Set
              </span>
              <p className="text-xs text-gray-500">Upload & respond to FROG, SROG, RFP & RFA all at once</p>
            </div>
            <span className="ml-auto text-purple-600 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Discovery Notes Section */}
        <div className="mb-10 p-6 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setNotesExpanded(!notesExpanded)}
          >
            <div className="flex items-center space-x-2">
              <StickyNote className="h-6 w-6 text-slate-600" />
              <h2 className="text-xl font-bold text-gray-900">Discovery Notes</h2>
              <span className="text-sm text-gray-500">({discoveryNotes.length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNoteForm(true)
                  setNotesExpanded(true)
                }}
                className="flex items-center space-x-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                {notesExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {notesExpanded && (
            <div className="mt-4">
              {/* Add Note Form */}
              {showNoteForm && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-4">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add notes about discovery strategy, key documents to request, deadlines, follow-up items..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 text-gray-900 min-h-[100px]"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddNote}
                        disabled={isSavingNote || !newNoteContent.trim()}
                        className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                      >
                        {isSavingNote ? 'Saving...' : 'Save Note'}
                      </button>
                      <button
                        onClick={() => {
                          setShowNoteForm(false)
                          setNewNoteContent('')
                        }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {discoveryNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No discovery notes yet. Click &quot;Add Note&quot; to create one.</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleNoteDragEnd}
                >
                  <SortableContext items={discoveryNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {discoveryNotes.map((note) => (
                        <SortableDiscoveryNote
                          key={note.id}
                          note={note}
                          editingNoteId={editingNoteId}
                          editNoteContent={editNoteContent}
                          setEditNoteContent={setEditNoteContent}
                          setEditingNoteId={setEditingNoteId}
                          handleUpdateNote={handleUpdateNote}
                          handleDeleteNote={handleDeleteNote}
                          isSaving={isSavingNote}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-12 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-amber-600">🔒</span>
            </div>
            <div>
              <h4 className="font-medium text-amber-800">Case-Scoped Security</h4>
              <p className="text-sm text-amber-700 mt-1">
                All discovery documents are isolated to this case. The AI assistant only has access to 
                this case's facts and parties — it cannot access other cases, attorneys, or global data.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}























