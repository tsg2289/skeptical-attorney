'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, ClipboardList, CheckSquare, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'

export default function DiscoveryLandingPage() {
  const params = useParams()
  const caseId = params?.caseId as string
  
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const foundCase = await supabaseCaseStorage.getCase(caseId)
        if (foundCase) {
          setCurrentCase(foundCase)
          console.log(`[AUDIT] Discovery landing accessed for case: ${caseId}`)
        }
      }
      setLoading(false)
    }
    
    loadCase()
  }, [caseId])

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

  const discoveryTools = [
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

        {/* Case Info Card */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Case Parties</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Plaintiff(s)</p>
                  {currentCase.plaintiffs?.length > 0 ? (
                    <ul className="mt-1">
                      {currentCase.plaintiffs.map((p, i) => (
                        <li key={i} className="text-gray-900">{p.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No plaintiffs added</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Defendant(s)</p>
                  {currentCase.defendants?.length > 0 ? (
                    <ul className="mt-1">
                      {currentCase.defendants.map((d, i) => (
                        <li key={i} className="text-gray-900">{d.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No defendants added</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm">
              <Sparkles className="w-4 h-4" />
              AI-Assisted
            </div>
          </div>
        </div>

        {/* Discovery Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {discoveryTools.map((tool) => {
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











