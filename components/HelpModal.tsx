'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

const sections = [
  { id: 'getting-started', title: 'Getting Started', items: [
    'Click “Get Started Free”, create your account, verify email, then log in.',
    'If needed, use “Forgot Password” to reset.',
  ]},
  { id: 'dashboard', title: 'Dashboard Overview', items: [
    'Today’s Billing: hours/amounts; open Billing Generator.',
    'Upcoming Deadlines: next 7 days; click to open the case.',
    'Calendar: monthly view; click a day to see its deadlines.',
    'My Cases: Recent vs All; add/open/delete cases.',
  ]},
  { id: 'cases', title: 'Case Management', items: [
    'Add Case → fill Case Name/Case Number (required), Type/Client optional.',
    'Open a case to see deadlines, discovery items, and progress.',
  ]},
  { id: 'services', title: 'Services Overview', items: [
    'Demand Letters, Pleadings, Discovery, Law & Motion, Settlement Agreements, Billing Generator.',
  ]},
  { id: 'discovery', title: 'Discovery Workflows', items: [
    'Propound Discovery, Respond to Discovery, Subpoena, Meet and Confer, Written Discovery, Deposition.',
  ]},
  { id: 'pleadings', title: 'Pleadings', items: [
    'Complaint Generator: structured intake, AI assist, export-ready.',
    'Answer Generator: import complaint, denials/defenses, export.',
  ]},
  { id: 'tools', title: 'Additional Tools', items: [
    'Law & Motion: motions, declarations, MPAs.',
    'Settlement Agreements: clause library, customizable terms, exports.',
    'Billing Generator: entries, time/cost savings, export.',
  ]},
  { id: 'tips', title: 'Tips & Best Practices', items: [
    'Create cases first, then draft docs; check deadlines daily; use Calendar; export backups; leverage AI.',
  ]},
  { id: 'support', title: 'Need Help?', items: [
    'Use Contact for support; see About; review Privacy/Terms.',
  ]},
]

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const today = useMemo(() => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div>
              <h2 className="text-2xl font-bold">Welcome to Skeptical Attorney</h2>
              <p className="text-sm text-blue-100 mt-1">Quick start guide • {today}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors p-2 rounded-full hover:bg-blue-800"
              aria-label="Close help"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg space-y-8">
              {sections.map((section, idx) => (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{idx + 1}</span>
                    <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                  </div>
                  <ul className="list-disc list-inside text-gray-800 space-y-2 text-sm leading-relaxed">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-200 pt-3" />
                </div>
              ))}

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  Need more help?{' '}
                  <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">
                    Contact us
                  </Link>
                </div>
                <Link href="/help" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Open full Help page →
                </Link>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-white">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-full font-semibold hover:bg-gray-200 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}










