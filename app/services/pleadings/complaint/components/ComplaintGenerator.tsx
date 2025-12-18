'use client'

import { useEffect, useState } from 'react'
import { FileText, Copy, Download, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabaseCaseStorage } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'

interface ComplaintGeneratorProps {
  caseId?: string | null
}

interface FormState {
  plaintiffName: string
  defendantName: string
  venue: string
  caseNumber: string
  factualSummary: string
  damages: string
  requestedRelief: string
  juryDemand: boolean
}

export default function ComplaintGenerator({ caseId }: ComplaintGeneratorProps) {
  const [formData, setFormData] = useState<FormState>({
    plaintiffName: '',
    defendantName: '',
    venue: '',
    caseNumber: '',
    factualSummary: '',
    damages: '',
    requestedRelief: '',
    juryDemand: true,
  })
  const [causes, setCauses] = useState<string[]>(['Negligence'])
  const [generatedComplaint, setGeneratedComplaint] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const foundCase = await supabaseCaseStorage.getCase(caseId)
      if (foundCase) {
        setFormData((prev) => ({
          ...prev,
          caseNumber: foundCase.caseNumber || prev.caseNumber,
          factualSummary: foundCase.facts || prev.factualSummary,
          plaintiffName: foundCase.client || prev.plaintiffName,
        }))
        console.log(`[AUDIT] Complaint generator initialized for case: ${caseId}`)
      }
    }
    
    loadCase()
  }, [caseId])

  const updateField = (key: keyof FormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const updateCause = (index: number, value: string) => {
    setCauses((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  const addCause = () => setCauses((prev) => [...prev, ''])
  const removeCause = (index: number) => setCauses((prev) => prev.filter((_, i) => i !== index))

  const generateComplaint = async () => {
    if (!formData.plaintiffName || !formData.defendantName || !formData.venue || !formData.factualSummary) {
      toast.error('Plaintiff, Defendant, Venue, and Factual Summary are required.')
      return
    }
    if (causes.length === 0 || causes.some((c) => !c.trim())) {
      toast.error('Please add at least one cause of action.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          causesOfAction: causes,
          caseId,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate complaint')
      }

      const data = await response.json()
      setGeneratedComplaint(data.complaint)
      toast.success('Complaint generated!')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate complaint')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!generatedComplaint) return
    navigator.clipboard.writeText(generatedComplaint)
    toast.success('Copied to clipboard')
  }

  const downloadText = () => {
    if (!generatedComplaint) return
    const blob = new Blob([generatedComplaint], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `complaint_${formData.plaintiffName || 'draft'}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('Downloaded as text')
  }

  const resetForm = () => {
    setFormData({
      plaintiffName: '',
      defendantName: '',
      venue: '',
      caseNumber: '',
      factualSummary: '',
      damages: '',
      requestedRelief: '',
      juryDemand: true,
    })
    setCauses(['Negligence'])
    setGeneratedComplaint('')
  }

  return (
    <div className="space-y-8">
      <div className="glass rounded-3xl p-8 bg-white/95 border border-blue-100 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="glass rounded-xl p-3 bg-blue-50 border border-blue-100">
            <FileText className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Draft Complaint</h2>
            <p className="text-sm text-slate-500">Fill in the essentials and generate a pleading-ready draft.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Plaintiff Name *
              <input
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={formData.plaintiffName}
                onChange={(e) => updateField('plaintiffName', e.target.value)}
                placeholder="Jane Smith"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Defendant Name *
              <input
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={formData.defendantName}
                onChange={(e) => updateField('defendantName', e.target.value)}
                placeholder="ACME Corp."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Venue (County & Court) *
              <input
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={formData.venue}
                onChange={(e) => updateField('venue', e.target.value)}
                placeholder="Superior Court of California, County of Los Angeles"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Case Number (optional)
              <input
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={formData.caseNumber}
                onChange={(e) => updateField('caseNumber', e.target.value)}
                placeholder="23STCV00000"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Factual Summary *
              <textarea
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
                rows={6}
                value={formData.factualSummary}
                onChange={(e) => updateField('factualSummary', e.target.value)}
                placeholder="Summarize parties, key facts, dates, and harm..."
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Causes of Action *</p>
              <button
                type="button"
                onClick={addCause}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
              >
                <Plus className="w-4 h-4" /> Add Cause
              </button>
            </div>
            <div className="space-y-3">
              {causes.map((cause, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    className="flex-1 px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={cause}
                    onChange={(e) => updateCause(idx, e.target.value)}
                    placeholder={`Cause of action ${idx + 1} (e.g., Negligence, Breach of Contract)`}
                  />
                  {causes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCause(idx)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Damages / Injuries Alleged
              <textarea
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
                rows={4}
                value={formData.damages}
                onChange={(e) => updateField('damages', e.target.value)}
                placeholder="Economic, non-economic, punitive damages, fees, etc."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Requested Relief / Prayer
              <textarea
                className="mt-2 w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
                rows={4}
                value={formData.requestedRelief}
                onChange={(e) => updateField('requestedRelief', e.target.value)}
                placeholder="Declaratory relief, injunctive relief, costs, fees, interest..."
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={formData.juryDemand}
                onChange={(e) => updateField('juryDemand', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              Include jury demand
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={generateComplaint}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition disabled:opacity-60"
          >
            <Sparkles className="w-5 h-5" />
            {isLoading ? 'Generating...' : 'Generate Complaint'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 bg-white/95 border border-blue-100 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="glass rounded-xl p-3 bg-blue-50 border border-blue-100">
              <FileText className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Generated Complaint</h3>
              <p className="text-sm text-slate-500">Review, copy, or download before filing.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              disabled={!generatedComplaint}
              className="p-3 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition disabled:opacity-40"
              title="Copy"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={downloadText}
              disabled={!generatedComplaint}
              className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-40"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {generatedComplaint ? (
          <pre className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-blue-50/40 border border-blue-100 rounded-2xl p-4">
            {generatedComplaint}
          </pre>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400">
            Generated complaint will appear here…
          </div>
        )}
      </div>
    </div>
  )
}


















