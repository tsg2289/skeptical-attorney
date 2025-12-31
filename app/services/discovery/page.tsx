'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import Link from 'next/link'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'
import { FileText, ClipboardList, CheckSquare, ListChecks, Layers, Upload, MessageSquare, Users } from 'lucide-react'

export default function DiscoveryLandingPage() {
  const { isTrialMode, trialCaseId } = useTrialMode()

  // Helper to get the correct href based on trial mode
  const getDiscoveryHref = (basePath: string, fallbackPath: string) => {
    if (isTrialMode) {
      return `/dashboard/cases/${trialCaseId}/discovery${basePath}`
    }
    return fallbackPath
  }

  const propoundingTools = [
    {
      title: 'Form Interrogatories',
      description: 'Generate California Judicial Council Form Interrogatories (DISC-001) with selectable standard questions.',
      href: isTrialMode ? `/services/discovery/form-interrogatories?caseId=${trialCaseId}` : '/services/discovery/form-interrogatories',
      icon: ListChecks,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    {
      title: 'Special Interrogatories',
      description: 'Draft interrogatories with California-compliant formatting, definitions, and categorized questions.',
      href: getDiscoveryHref('/interrogatories', '/services/discovery/propound-discovery'),
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Requests for Production',
      description: 'Create document requests with proper definitions and organized categories for evidence gathering.',
      href: getDiscoveryHref('/rfp', '/services/discovery/propound-discovery'),
      icon: ClipboardList,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Requests for Admission',
      description: 'Generate admission requests to establish undisputed facts and streamline trial preparation.',
      href: getDiscoveryHref('/rfa', '/services/discovery/propound-discovery'),
      icon: CheckSquare,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    }
  ]

  const respondingTools = [
    {
      title: 'Form Interrogatories',
      description: 'Respond to California Judicial Council Form Interrogatories with AI-generated objections and answers.',
      href: getDiscoveryHref('/responses?type=frog', '/services/discovery/respond-to-discovery'),
      icon: ListChecks,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
    },
    {
      title: 'Special Interrogatories',
      description: 'Generate responses to special interrogatories with proper objections and substantive answers.',
      href: getDiscoveryHref('/responses?type=srog', '/services/discovery/respond-to-discovery'),
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Requests for Production',
      description: 'Respond to document requests with appropriate objections and production statements.',
      href: getDiscoveryHref('/responses?type=rfp', '/services/discovery/respond-to-discovery'),
      icon: ClipboardList,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
    },
    {
      title: 'Requests for Admission',
      description: 'Craft strategic responses to admission requests with admit, deny, or qualified responses.',
      href: getDiscoveryHref('/responses?type=rfa', '/services/discovery/respond-to-discovery'),
      icon: CheckSquare,
      color: 'from-fuchsia-500 to-fuchsia-600',
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200',
    }
  ]

  const otherTools = [
    {
      title: 'Subpoena',
      description: 'Create subpoenas with the right recipients, dates, and scope.',
      href: '/services/discovery/subpoena',
      icon: FileText,
      color: 'from-slate-500 to-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
    },
    {
      title: 'Meet and Confer',
      description: 'Prepare concise, persuasive meet-and-confer correspondence.',
      href: '/services/discovery/meet-and-confer',
      icon: MessageSquare,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
    },
    {
      title: 'Deposition Prep',
      description: 'Build outlines and questions, track exhibits, and capture notes.',
      href: '/services/deposition',
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <TrialModeBanner />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Discovery <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Workflows</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            {isTrialMode 
              ? 'Try our full discovery suite. Enter your case details and generate real discovery documents.'
              : 'Centralize written discovery, subpoenas, meet-and-confer letters, and deposition prep with guided automation.'
            }
          </p>
          {isTrialMode && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
              <span>🔓</span>
              <span>Trial Mode - Data saved in browser only</span>
            </div>
          )}
        </div>
      </section>

      {/* Propound Discovery Section */}
      <section className="py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Propound Discovery</h2>
            <p className="text-gray-600">Generate discovery requests to send to opposing parties.</p>
          </div>
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
                  <p className="text-gray-600 text-sm">
                    {tool.description}
                  </p>
                </Link>
              )
            })}
          </div>
          
          {/* Propound Complete Set Button */}
          <Link
            href={isTrialMode ? getDiscoveryHref('', '/services/discovery/propound-discovery') : '/services/discovery/propound-discovery'}
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
          </Link>
        </div>
      </section>

      {/* Respond to Discovery Section */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Respond to Discovery</h2>
            <p className="text-gray-600">Generate responses to discovery requests you've received.</p>
          </div>
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
                  <p className="text-gray-600 text-sm">
                    {tool.description}
                  </p>
                </Link>
              )
            })}
          </div>
          
          {/* Respond to Complete Set Button */}
          <Link
            href={isTrialMode ? getDiscoveryHref('/responses', '/services/discovery/respond-to-discovery') : '/services/discovery/respond-to-discovery'}
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
          </Link>
        </div>
      </section>

      {/* Other Discovery Tools */}
      <section className="py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Other Discovery Tools</h2>
            <p className="text-gray-600">Additional tools for your discovery workflow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherTools.map((tool) => {
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
                  <p className="text-gray-600 text-sm">
                    {tool.description}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
