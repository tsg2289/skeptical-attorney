'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const sections = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'dashboard', title: 'Dashboard Overview' },
  { id: 'cases', title: 'Case Management' },
  { id: 'services', title: 'Services Overview' },
  { id: 'discovery', title: 'Discovery Workflows' },
  { id: 'pleadings', title: 'Pleadings' },
  { id: 'tools', title: 'Additional Tools' },
  { id: 'tips', title: 'Tips & Best Practices' },
  { id: 'support', title: 'Need Help?' },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Help &amp; User Guide</h1>
          <p className="text-lg text-gray-600">
            Learn how to get started, manage cases, and use all Skeptical Attorney tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar */}
          <nav className="lg:col-span-1 space-y-2 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-colors"
              >
                {s.title}
              </a>
            ))}
          </nav>

          {/* Content */}
          <div className="lg:col-span-3 space-y-10">
            <section id="getting-started" className="space-y-3">
              <h2 className="text-2xl font-semibold">Getting Started</h2>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Click “Get Started Free” on the home page.</li>
                <li>Create your account and verify your email.</li>
                <li>Log in to access the dashboard. Use “Forgot Password” if needed.</li>
              </ol>
            </section>

            <section id="dashboard" className="space-y-3">
              <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Today’s Billing: view hours/amounts and open the Billing Generator.</li>
                <li>Upcoming Deadlines: next 7 days; click to open the case.</li>
                <li>Calendar: monthly view; click a day to see its deadlines.</li>
                <li>My Cases: Recent vs All; add, open, or delete cases.</li>
              </ul>
            </section>

            <section id="cases" className="space-y-3">
              <h2 className="text-2xl font-semibold">Case Management</h2>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Click “Add Case”.</li>
                <li>Fill Case Name and Case Number (required); Type and Client optional.</li>
                <li>Save to create; delete via the trash icon on a case card.</li>
              </ol>
              <p className="text-gray-700">
                Inside a case: view deadlines, discovery items, and progress.
              </p>
            </section>

            <section id="services" className="space-y-3">
              <h2 className="text-2xl font-semibold">Services Overview</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Demand Letters: customizable templates with calculations.</li>
                <li>Pleadings: complaints and answers with proper formatting.</li>
                <li>Discovery: full written/oral discovery toolkit.</li>
                <li>Law &amp; Motion: draft motions with research support.</li>
                <li>Settlement Agreements: clause libraries and exports.</li>
                <li>Billing Generator: compare methods, track time, export.</li>
              </ul>
            </section>

            <section id="discovery" className="space-y-3">
              <h2 className="text-2xl font-semibold">Discovery Workflows</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Propound Discovery: interrogatories, RFAs, RFPs with AI drafting.</li>
                <li>Respond to Discovery: import requests, draft responses/objections.</li>
                <li>Subpoena: set recipients, dates, and scope.</li>
                <li>Meet and Confer: prep concise correspondence.</li>
                <li>Written Discovery: templates and custom question sets.</li>
                <li>Deposition: outlines, questions, exhibits, notes (redirects to deposition dashboard).</li>
              </ul>
            </section>

            <section id="pleadings" className="space-y-3">
              <h2 className="text-2xl font-semibold">Pleadings</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Complaint Generator: structured intake, AI assist, export-ready.</li>
                <li>Answer Generator: import complaint, craft denials and defenses, export.</li>
              </ul>
            </section>

            <section id="tools" className="space-y-3">
              <h2 className="text-2xl font-semibold">Additional Tools</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Law &amp; Motion: generate motions, declarations, and MPAs.</li>
                <li>Settlement Agreements: clause library, customizable terms, exports.</li>
                <li>Billing Generator: create entries, see time/cost savings, export.</li>
              </ul>
            </section>

            <section id="tips" className="space-y-3">
              <h2 className="text-2xl font-semibold">Tips &amp; Best Practices</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Create cases first, then draft documents.</li>
                <li>Check Upcoming Deadlines daily; use the Calendar for planning.</li>
                <li>Leverage AI assistance in drafting flows.</li>
                <li>Export documents regularly for backups.</li>
              </ul>
            </section>

            <section id="support" className="space-y-3">
              <h2 className="text-2xl font-semibold">Need Help?</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Use the Contact page for support.</li>
                <li>See About for platform info.</li>
                <li>Review Privacy and Terms for policies.</li>
              </ul>
              <Link href="/contact" className="text-blue-600 font-semibold hover:text-blue-700">
                Go to Contact →
              </Link>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}










