'use client'

import { useState, useEffect } from 'react'
import { FileText, Scale, Users, Copy, Download, FileDown, Plus, X, Edit2, Save, RotateCcw, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadWordDocument as generateWordDoc } from '@/lib/docx-generator'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { userStorage } from '@/lib/utils/userStorage'
import { caseStorage } from '@/lib/utils/caseStorage'
import AnswerPreviewModal from './AnswerPreviewModal'

// Interface for defense structure
interface Defense {
  id: string
  number: string
  causesOfAction: string
  title: string
  content: string
  fullText: string
}

interface AnswerSections {
  preamble: string
  defenses: Defense[]
  prayer: string
  signature: string
  aiAnalysis: string
}

// Parse the generated answer into sections
function parseAnswer(answer: string): AnswerSections {
  const sections: AnswerSections = {
    preamble: '',
    defenses: [],
    prayer: '',
    signature: '',
    aiAnalysis: '',
  }

  // Pattern to match defense headers (FIRST, SECOND, THIRD, etc.)
  const defensePattern = /(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH)\s+AFFIRMATIVE\s+DEFENSE/gi
  
  // Find all defense matches
  const matches = [...answer.matchAll(defensePattern)]
  
  if (matches.length === 0) {
    // If no defenses found, treat entire answer as preamble
    sections.preamble = answer
    return sections
  }

  // Extract preamble (everything before first defense)
  sections.preamble = answer.substring(0, matches[0].index).trim()

  // Extract each defense
  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index!
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : answer.length
    
    const defenseText = answer.substring(startIndex, endIndex).trim()
    const lines = defenseText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    const number = matches[i][1]
    let causesOfAction = ''
    let title = ''
    let content = ''
    
    // Get all content after defense header
    const contentAfterHeader = lines.slice(1).join('\n').trim()
    const contentLines = contentAfterHeader.split('\n').map(line => line.trim())
    
    // Extract "To All Causes of Action" and title from parenthetical lines
    for (let j = 0; j < contentLines.length; j++) {
      const line = contentLines[j]
      if (line.startsWith('(') && line.endsWith(')')) {
        // Check if it's "To All Causes of Action"
        if (line.toLowerCase().includes('to all causes of action')) {
          causesOfAction = line.replace(/[()]/g, '').trim()
          continue
        }
        // This is the title
        if (!title) {
          title = line.replace(/[()]/g, '').trim()
        }
      }
    }
    
    // Remove both "To All Causes of Action" and title lines from content
    content = contentLines
      .filter(line => {
        if (line.startsWith('(') && line.endsWith(')')) {
          const lineLower = line.toLowerCase()
          return !lineLower.includes('to all causes of action') && line.replace(/[()]/g, '').trim() !== title
        }
        return true
      })
      .join('\n')
      .trim()
    
    // If no content after removing parenthetical lines, use all content
    if (!content) {
      content = contentAfterHeader
    }
    
    sections.defenses.push({
      id: `defense-${i}`,
      number,
      causesOfAction,
      title,
      content,
      fullText: defenseText,
    })
  }

  // Extract prayer (everything after last defense)
  const lastDefenseEnd = matches[matches.length - 1].index! + matches[matches.length - 1][0].length
  
  // Extract AI Analysis section first (separated by "---")
  let afterLastDefense = answer.substring(lastDefenseEnd).trim()
  const aiAnalysisMatch = answer.match(/---\s*\n?\s*AI ANALYSIS AND SUGGESTIONS:\s*\n?([\s\S]*?)(?:\s*---|$)/i)
  if (aiAnalysisMatch) {
    sections.aiAnalysis = aiAnalysisMatch[1].trim()
    // Remove AI analysis section from the answer text
    const aiStart = answer.indexOf(aiAnalysisMatch[0])
    if (aiStart !== -1) {
      afterLastDefense = answer.substring(lastDefenseEnd, aiStart).trim()
    }
  }
  
  // Check if there's a "WHEREFORE" pattern for prayer
  let prayerText = ''
  let signatureText = ''
  const prayerMatch = afterLastDefense.match(/WHEREFORE/i)
  if (prayerMatch) {
    const fullPrayerText = afterLastDefense.substring(prayerMatch.index!).trim()
    
    // Extract signature block (everything after "Dated:")
    const datedIndex = fullPrayerText.indexOf('Dated:')
    if (datedIndex !== -1) {
      prayerText = fullPrayerText.substring(0, datedIndex).trim()
      signatureText = fullPrayerText.substring(datedIndex).trim()
      
      // Remove "---" separators from signature
      signatureText = signatureText.replace(/---+/g, '').trim()
      
      // Remove AI analysis if it somehow got into signature
      const aiInSignature = signatureText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
      if (aiInSignature !== -1) {
        signatureText = signatureText.substring(0, aiInSignature).trim()
      }
    } else {
      prayerText = fullPrayerText
    }
    
    // Remove any remaining "---" separators from prayer
    prayerText = prayerText.replace(/---+/g, '').trim()
    
    // Remove AI analysis if it somehow got into prayer
    const aiInPrayer = prayerText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
    if (aiInPrayer !== -1) {
      prayerText = prayerText.substring(0, aiInPrayer).trim()
    }
  } else {
    // Check if prayer content is in the last defense
    const lastDefense = sections.defenses[sections.defenses.length - 1]
    if (lastDefense.content.includes('WHEREFORE')) {
      const prayerStart = lastDefense.content.indexOf('WHEREFORE')
      const fullPrayerText = lastDefense.content.substring(prayerStart).trim()
      
      // Extract signature block
      const datedIndex = fullPrayerText.indexOf('Dated:')
      if (datedIndex !== -1) {
        prayerText = fullPrayerText.substring(0, datedIndex).trim()
        signatureText = fullPrayerText.substring(datedIndex).trim()
        
        // Remove "---" separators from signature
        signatureText = signatureText.replace(/---+/g, '').trim()
        
        // Remove AI analysis if present
        const aiInSignature = signatureText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
        if (aiInSignature !== -1) {
          signatureText = signatureText.substring(0, aiInSignature).trim()
        }
      } else {
        prayerText = fullPrayerText
      }
      
      // Remove any "---" separators from prayer
      prayerText = prayerText.replace(/---+/g, '').trim()
      
      // Remove AI analysis if present
      const aiInPrayer = prayerText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
      if (aiInPrayer !== -1) {
        prayerText = prayerText.substring(0, aiInPrayer).trim()
      }
      
      lastDefense.content = lastDefense.content.substring(0, prayerStart).trim()
      lastDefense.fullText = `${lastDefense.number} AFFIRMATIVE DEFENSE\n${lastDefense.title ? `(${lastDefense.title})\n` : ''}${lastDefense.content}`
    }
  }
  
  // Also clean up any defense content that might have this text
  sections.defenses.forEach(defense => {
    // Remove attorney signature block from defense content
    if (defense.content.includes('Dated:')) {
      const datedIndex = defense.content.indexOf('Dated:')
      defense.content = defense.content.substring(0, datedIndex).trim()
      defense.fullText = `${defense.number} AFFIRMATIVE DEFENSE${defense.causesOfAction ? `\n(${defense.causesOfAction})` : ''}${defense.title ? `\n(${defense.title})` : ''}\n${defense.content}`
    }
    
    // Remove "---" separators from defense content
    defense.content = defense.content.replace(/---+/g, '').trim()
    
    // Remove AI analysis from defense content
    const aiInDefense = defense.content.indexOf('AI ANALYSIS AND SUGGESTIONS:')
    if (aiInDefense !== -1) {
      defense.content = defense.content.substring(0, aiInDefense).trim()
      defense.fullText = `${defense.number} AFFIRMATIVE DEFENSE${defense.causesOfAction ? `\n(${defense.causesOfAction})` : ''}${defense.title ? `\n(${defense.title})` : ''}\n${defense.content}`
    }
  })
  
  sections.prayer = prayerText
  sections.signature = signatureText

  return sections
}

// Reconstruct full answer from sections
function reconstructAnswer(sections: AnswerSections): string {
  const defensesText = sections.defenses
    .map(def => def.fullText)
    .join('\n\n')
  
  return [
    sections.preamble,
    defensesText,
    sections.prayer,
  ]
    .filter(Boolean)
    .join('\n\n')
}

// Helper function to get ordinal number from index
function getOrdinalNumber(index: number): string {
  const ordinals = [
    'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 
    'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 
    'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH',
    'TWENTY-FIRST', 'TWENTY-SECOND', 'TWENTY-THIRD', 'TWENTY-FOURTH', 'TWENTY-FIFTH',
    'TWENTY-SIXTH', 'TWENTY-SEVENTH', 'TWENTY-EIGHTH', 'TWENTY-NINTH', 'THIRTIETH'
  ]
  return ordinals[index] || `${index + 1}TH`
}

// Sortable Defense Card Component - BLUE/WHITE THEME
function SortableDefenseCard({ defense, editingDefenseId, editingDefense, onEdit, onSave, onCancel, onDelete, onEditChange }: {
  defense: Defense
  editingDefenseId: string | null
  editingDefense: { number: string; causesOfAction: string; title: string; content: string }
  onEdit: (defense: Defense) => void
  onSave: (defenseId: string) => void
  onCancel: () => void
  onDelete: (defenseId: string) => void
  onEditChange: (field: string, value: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: defense.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass rounded-2xl p-6 hover:shadow-lg transition-all relative group bg-white/95 border border-primary-200"
    >
      <div className="flex items-center justify-between mb-3">
        {editingDefenseId === defense.id ? (
          <>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-primary-700 mb-1">
                Editing Defense
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSave(defense.id)}
                className="p-2 rounded-lg bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-110"
                title="Save changes"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg bg-gray-200 text-gray-700 transition-all hover:bg-gray-300 hover:scale-110"
                title="Cancel editing"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-primary-700 mb-1">
                {defense.number} AFFIRMATIVE DEFENSE
              </h4>
              {defense.title && (
                <p className="text-sm text-gray-500 italic">({defense.title})</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(defense)}
                className="p-2 rounded-lg bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-110"
                title="Edit defense"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(defense.id)}
                className="p-2 rounded-lg bg-red-500 text-white transition-all hover:bg-red-600 hover:scale-110"
                title="Delete defense"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                {...attributes}
                {...listeners}
                className="p-2 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {editingDefenseId === defense.id ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Defense Number
            </label>
            <input
              type="text"
              value={editingDefense.number}
              onChange={(e) => onEditChange('number', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Causes of Action Applied
            </label>
            <input
              type="text"
              value={editingDefense.causesOfAction}
              onChange={(e) => onEditChange('causesOfAction', e.target.value)}
              placeholder="Causes of Action Applied"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Defense Title
            </label>
            <input
              type="text"
              value={editingDefense.title}
              onChange={(e) => onEditChange('title', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Defense Content *
            </label>
            <textarea
              value={editingDefense.content}
              onChange={(e) => onEditChange('content', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
            />
          </div>
        </div>
      ) : (
        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
          {defense.content}
        </div>
      )}
    </div>
  )
}

interface AnswerGeneratorProps {
  caseId?: string | null
}

export default function AnswerGenerator({ caseId }: AnswerGeneratorProps) {
  const [formData, setFormData] = useState({
    plaintiffName: '',
    defendantName: '',
    complaintText: '',
    isMultipleDefendants: false
  })
  const [generatedAnswer, setGeneratedAnswer] = useState('')
  const [answerSections, setAnswerSections] = useState<AnswerSections | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAddDefense, setShowAddDefense] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [newDefense, setNewDefense] = useState({
    number: '',
    causesOfAction: '',
    title: '',
    content: ''
  })
  const [editingDefenseId, setEditingDefenseId] = useState<string | null>(null)
  const [editingDefense, setEditingDefense] = useState({
    number: '',
    causesOfAction: '',
    title: '',
    content: ''
  })

  // Populate form data from case if caseId is provided
  useEffect(() => {
    if (caseId) {
      const currentUser = userStorage.getCurrentUser()
      if (currentUser) {
        // CRITICAL: Only retrieve the specific case by ID
        const foundCase = caseStorage.getCase(currentUser.username, caseId)
        if (foundCase) {
          // Log for audit trail
          console.log(`[AUDIT] Answer generator initialized for case: ${caseId}`)
          // Populate form with case data if available
          // Note: You may want to populate plaintiff/defendant names from case data
        }
      }
    }
  }, [caseId])

  // Update full answer when defenses are reordered
  useEffect(() => {
    if (answerSections) {
      const fullAnswer = reconstructAnswer(answerSections)
      setGeneratedAnswer(fullAnswer)
    }
  }, [answerSections])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const generateAnswer = async () => {
    if (!formData.plaintiffName || !formData.defendantName || !formData.complaintText) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      // CRITICAL: Include caseId in API call for scoping
      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          caseId: caseId, // Explicitly scope to this case
          isMultipleDefendants: formData.isMultipleDefendants
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate answer')
      }

      const data = await response.json()
      const parsed = parseAnswer(data.answer)
      setAnswerSections(parsed)
      setGeneratedAnswer(data.answer)
      toast.success('Answer generated successfully!')
    } catch (error) {
      console.error('Error generating answer:', error)
      toast.error('Failed to generate answer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedAnswer)
    toast.success('Answer copied to clipboard!')
  }

  const downloadAnswer = () => {
    const element = document.createElement('a')
    const file = new Blob([generatedAnswer], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `answer_${formData.defendantName}_${new Date().toLocaleDateString()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Answer downloaded as text!')
  }

  const downloadWordDoc = async () => {
    if (!generatedAnswer) {
      toast.error('No answer to download')
      return
    }

    try {
      // Prepare structured answer sections for better Word output
      const answerSectionsData = answerSections ? {
        preamble: answerSections.preamble || '',
        defenses: answerSections.defenses.map(def => ({
          number: def.number,
          causesOfAction: def.causesOfAction || undefined,
          title: def.title || undefined,
          content: def.content
        })),
        prayer: answerSections.prayer || '',
        signature: answerSections.signature || ''
      } : undefined

      await generateWordDoc({
        plaintiffName: formData.plaintiffName,
        defendantName: formData.defendantName,
        generatedAnswer: generatedAnswer,
        answerSections: answerSectionsData, // Pass structured data for better Word output
        isMultipleDefendants: formData.isMultipleDefendants
      })
      toast.success('Word document downloaded!')
    } catch (error) {
      console.error('Error downloading Word document:', error)
      toast.error('Failed to download Word document')
    }
  }

  const handleAddDefense = () => {
    if (!newDefense.number || !newDefense.content) {
      toast.error('Please fill in defense number and content')
      return
    }

    if (!answerSections) {
      toast.error('Please generate an answer first')
      return
    }

    const defenseNumber = newDefense.number.toUpperCase()
    
    // Build fullText with causesOfAction and title
    let fullText = `${defenseNumber} AFFIRMATIVE DEFENSE`
    if (newDefense.causesOfAction) {
      fullText += `\n(${newDefense.causesOfAction})`
    }
    if (newDefense.title) {
      fullText += `\n(${newDefense.title})`
    }
    fullText += `\n${newDefense.content}`

    const customDefense: Defense = {
      id: `defense-custom-${Date.now()}`,
      number: defenseNumber,
      causesOfAction: newDefense.causesOfAction,
      title: newDefense.title,
      content: newDefense.content,
      fullText: fullText,
    }

    setAnswerSections({
      ...answerSections,
      defenses: [...answerSections.defenses, customDefense],
    })

    setNewDefense({ number: '', causesOfAction: '', title: '', content: '' })
    setShowAddDefense(false)
    toast.success('Defense added successfully!')
  }

  const handleDeleteDefense = (defenseId: string) => {
    if (!answerSections) return

    setAnswerSections({
      ...answerSections,
      defenses: answerSections.defenses.filter(def => def.id !== defenseId),
    })
    toast.success('Defense removed!')
  }

  const saveDefenseChanges = (defenseId: string, showToast: boolean = true) => {
    if (!answerSections || !editingDefense.number || !editingDefense.content) {
      if (showToast) {
        toast.error('Please fill in defense number and content')
      }
      return false
    }

    const defenseNumber = editingDefense.number.toUpperCase()
    
    // Remove any existing parenthetical lines from content
    let cleanContent = editingDefense.content
    const contentLines = cleanContent.split('\n').map(line => line.trim())
    // Remove all parenthetical lines (they'll be added back from causesOfAction and title)
    cleanContent = contentLines
      .filter(line => !(line.startsWith('(') && line.endsWith(')')))
      .join('\n')
      .trim()
    
    // Build finalContent with causesOfAction and title
    let finalContent = cleanContent
    if (editingDefense.causesOfAction || editingDefense.title) {
      const parts: string[] = []
      if (editingDefense.causesOfAction) {
        parts.push(`(${editingDefense.causesOfAction})`)
      }
      if (editingDefense.title) {
        parts.push(`(${editingDefense.title})`)
      }
      finalContent = parts.join('\n') + '\n' + cleanContent
    }
    
    const fullText = `${defenseNumber} AFFIRMATIVE DEFENSE\n${finalContent}`

    setAnswerSections({
      ...answerSections,
      defenses: answerSections.defenses.map(def =>
        def.id === defenseId
          ? {
              ...def,
              number: defenseNumber,
              causesOfAction: editingDefense.causesOfAction,
              title: editingDefense.title,
              content: cleanContent, // Store content without parenthetical lines
              fullText: fullText,
            }
          : def
      ),
    })

    if (showToast) {
      toast.success('Defense updated successfully!')
    }
    return true
  }

  const handleEditDefense = (defense: Defense) => {
    // If editing another defense, auto-save the current one first
    if (editingDefenseId && editingDefenseId !== defense.id && answerSections) {
      saveDefenseChanges(editingDefenseId, false)
    }

    // Extract causesOfAction and title from content if they exist
    let extractedCausesOfAction = defense.causesOfAction
    let extractedTitle = defense.title
    let cleanContent = defense.content
    
    // Check content for parenthetical lines
    const contentLines = defense.content.split('\n').map(line => line.trim())
    for (const line of contentLines) {
      if (line.startsWith('(') && line.endsWith(')')) {
        const lineText = line.replace(/[()]/g, '').trim()
        // Check if it's "To All Causes of Action"
        if (line.toLowerCase().includes('to all causes of action')) {
          extractedCausesOfAction = lineText
        } else if (!extractedTitle) {
          // This is the title (first non-causes-of-action parenthetical)
          extractedTitle = lineText
        }
      }
    }
    
    // Remove all parenthetical lines from content
    cleanContent = contentLines
      .filter(line => !(line.startsWith('(') && line.endsWith(')')))
      .join('\n')
      .trim()

    setEditingDefenseId(defense.id)
    setEditingDefense({
      number: defense.number,
      causesOfAction: extractedCausesOfAction,
      title: extractedTitle,
      content: cleanContent
    })
  }

  const handleSaveDefense = (defenseId: string) => {
    if (saveDefenseChanges(defenseId, true)) {
      setEditingDefenseId(null)
      setEditingDefense({ number: '', causesOfAction: '', title: '', content: '' })
    }
  }

  const handleCancelEdit = () => {
    setEditingDefenseId(null)
    setEditingDefense({ number: '', causesOfAction: '', title: '', content: '' })
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && answerSections) {
      const oldIndex = answerSections.defenses.findIndex((def) => def.id === active.id)
      const newIndex = answerSections.defenses.findIndex((def) => def.id === over.id)

      // Reorder the defenses
      const reorderedDefenses = arrayMove(answerSections.defenses, oldIndex, newIndex)

      // Renumber all defenses based on their new positions
      const renumberedDefenses = reorderedDefenses.map((defense, index) => {
        const newNumber = getOrdinalNumber(index)
        
        // Build finalContent with causesOfAction and title
        let finalContent = defense.content
        if (defense.causesOfAction || defense.title) {
          const parts: string[] = []
          if (defense.causesOfAction) {
            parts.push(`(${defense.causesOfAction})`)
          }
          if (defense.title) {
            parts.push(`(${defense.title})`)
          }
          finalContent = parts.join('\n') + '\n' + defense.content
        }
        
        const fullText = `${newNumber} AFFIRMATIVE DEFENSE\n${finalContent}`
        
        return {
          ...defense,
          number: newNumber,
          fullText: fullText,
        }
      })

      setAnswerSections({
        ...answerSections,
        defenses: renumberedDefenses,
      })
      toast.success('Defenses reordered and renumbered!')
    }
  }

  // Helper function for edit changes
  const handleEditChange = (field: string, value: string) => {
    setEditingDefense({ ...editingDefense, [field]: value })
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          {/* Input Form - BLUE/WHITE THEME */}
          <div className="glass rounded-3xl p-8 space-y-6 bg-white/95 border border-primary-200 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="glass rounded-xl p-3 mr-4 bg-primary-50 border border-primary-200">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Document Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary-600" />
                  Plaintiff Name *
                </label>
                <input
                  type="text"
                  name="plaintiffName"
                  value={formData.plaintiffName}
                  onChange={handleInputChange}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary-600" />
                  Defendant Name *
                </label>
                <input
                  type="text"
                  name="defendantName"
                  value={formData.defendantName}
                  onChange={handleInputChange}
                  placeholder="e.g., Acme Inc."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary-600" />
                  Complaint Text *
                </label>
                <textarea
                  name="complaintText"
                  value={formData.complaintText}
                  onChange={handleInputChange}
                  placeholder="Paste the full complaint text here..."
                  rows={12}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary-600" />
                  Defendant Representation
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMultipleDefendants"
                      checked={!formData.isMultipleDefendants}
                      onChange={() => setFormData({ ...formData, isMultipleDefendants: false })}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">Single Defendant</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMultipleDefendants"
                      checked={formData.isMultipleDefendants}
                      onChange={() => setFormData({ ...formData, isMultipleDefendants: true })}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">Multiple Defendants</span>
                  </label>
                </div>
              </div>

              <button
                onClick={generateAnswer}
                disabled={isLoading}
                className="w-full font-semibold py-4 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white transition-all transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Generating Answer...
                    </>
                  ) : (
                    'Generate Answer'
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Generated Answer Header */}
          {answerSections && (
            <>
              <div className="glass rounded-3xl p-8 bg-white/95 border border-primary-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="glass rounded-xl p-3 mr-4 bg-primary-50 border border-primary-200">
                      <Scale className="w-6 h-6 text-primary-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Generated Answer</h2>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="p-3 rounded-xl bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-110"
                      title="Preview answer"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="p-3 rounded-xl bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-110"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={downloadAnswer}
                      className="p-3 rounded-xl bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-110"
                      title="Download as text file"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={downloadWordDoc}
                      className="p-3 rounded-xl bg-primary-700 text-white transition-all hover:bg-primary-800 hover:scale-110"
                      title="Download as Word document"
                    >
                      <FileDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Preamble Card */}
              {answerSections.preamble && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Preamble</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {answerSections.preamble}
                  </div>
                </div>
              )}

              {/* Affirmative Defenses Section Header */}
              {answerSections && (
                <div className="glass rounded-3xl p-6 bg-white/95 border border-primary-200 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Scale className="w-5 h-5 mr-2 text-primary-600" />
                      Affirmative Defenses
                    </h3>
                  </div>
                </div>
              )}

              {/* Individual Defense Cards */}
              {answerSections.defenses.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={answerSections.defenses.map((def) => def.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {answerSections.defenses.map((defense) => (
                        <SortableDefenseCard
                          key={defense.id}
                          defense={defense}
                          editingDefenseId={editingDefenseId}
                          editingDefense={editingDefense}
                          onEdit={handleEditDefense}
                          onSave={handleSaveDefense}
                          onCancel={handleCancelEdit}
                          onDelete={handleDeleteDefense}
                          onEditChange={handleEditChange}
                        />
                      ))}
                      </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Add Defense Button and Card */}
              {answerSections && (
                <>
                  {!showAddDefense && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowAddDefense(true)}
                        className="flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white transition-all hover:scale-105 hover:shadow-lg"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Defense
                      </button>
                    </div>
                  )}
                  
                  {showAddDefense && answerSections && (
                    <div className="glass rounded-2xl p-6 bg-white/95 border-2 border-primary-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-primary-700">Add New Affirmative Defense</h3>
                        <button
                          onClick={() => {
                            setShowAddDefense(false)
                            setNewDefense({ number: '', causesOfAction: '', title: '', content: '' })
                          }}
                          className="p-2 rounded-lg bg-gray-200 text-gray-700 transition-all hover:bg-gray-300 hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Defense Number (e.g., NINETEENTH, TWENTIETH)
                          </label>
                          <input
                            type="text"
                            value={newDefense.number}
                            onChange={(e) => setNewDefense({ ...newDefense, number: e.target.value })}
                            placeholder="NINETEENTH"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Causes of Action Applied
                          </label>
                          <input
                            type="text"
                            value={newDefense.causesOfAction}
                            onChange={(e) => setNewDefense({ ...newDefense, causesOfAction: e.target.value })}
                            placeholder="Causes of Action Applied"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Defense Title
                          </label>
                          <input
                            type="text"
                            value={newDefense.title}
                            onChange={(e) => setNewDefense({ ...newDefense, title: e.target.value })}
                            placeholder="e.g., Custom Defense"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Defense Content *
                          </label>
                          <textarea
                            value={newDefense.content}
                            onChange={(e) => setNewDefense({ ...newDefense, content: e.target.value })}
                            placeholder="Enter the defense content here..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
                          />
                        </div>
                        <button
                          onClick={handleAddDefense}
                          className="w-full font-semibold py-3 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white transition-all transform hover:scale-105 hover:shadow-lg"
                        >
                          <Plus className="w-4 h-4 inline mr-2" />
                          Add Defense
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Prayer Card */}
              {answerSections.prayer && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Prayer</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {answerSections.prayer}
                  </div>
                </div>
              )}

              {/* Signature Card */}
              {answerSections.signature && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Signature</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {answerSections.signature}
                  </div>
                </div>
              )}

              {/* Jury Demand Card */}
              {answerSections.signature && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Jury Demand</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    Defendant hereby demands a jury by trial in the above-entitled action
                  </div>
                </div>
              )}

              {/* AI Analysis Card */}
              {answerSections.aiAnalysis && (
                <div className="glass rounded-2xl p-6 bg-white/95 border-2 border-primary-400">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">AI ANALYSIS AND SUGGESTIONS</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {answerSections.aiAnalysis}
                  </div>
                </div>
              )}

              {/* Download Options */}
              <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <FileDown className="w-5 h-5 mr-2 text-primary-600" />
                  Download Options
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadWordDoc}
                    className="flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Word (.docx)
                  </button>
                  <button
                    onClick={downloadAnswer}
                    className="flex items-center px-4 py-2 rounded-xl bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-105"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Text (.txt)
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center px-4 py-2 rounded-xl bg-primary-600 text-white transition-all hover:bg-primary-700 hover:scale-105"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {!answerSections && !isLoading && (
            <div className="glass rounded-3xl p-8 bg-white/95 border border-primary-200 shadow-lg">
              <div className="flex items-center justify-center h-[500px] text-gray-500">
                <div className="text-center">
                  <div className="glass rounded-2xl p-6 mb-4 inline-block bg-primary-50 border border-primary-200">
                    <Scale className="w-16 h-16 mx-auto text-primary-600 opacity-50" />
                  </div>
                  <p className="text-lg">Generated answer will appear here...</p>
                  <p className="text-xs mt-2 text-gray-400">Generated legal document content</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Modal */}
      <AnswerPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        answerSections={answerSections}
        formData={formData}
        isMultipleDefendants={formData.isMultipleDefendants}
      />
    </div>
  )
}




