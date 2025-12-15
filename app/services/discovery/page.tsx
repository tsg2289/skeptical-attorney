'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const discoveryTools = [
  { title: 'Propound Discovery', href: '/services/discovery/propound-discovery', description: 'Draft interrogatories, RFAs, and RFPs with AI assistance.' },
  { title: 'Respond to Discovery', href: '/services/discovery/respond-to-discovery', description: 'Generate responses and objections that track the requests received.' },
  { title: 'Subpoena', href: '/services/discovery/subpoena', description: 'Create subpoenas with the right recipients, dates, and scope.' },
  { title: 'Meet and Confer', href: '/services/discovery/meet-and-confer', description: 'Prepare concise, persuasive meet-and-confer correspondence.' },
  { title: 'Written Discovery', href: '/services/discovery/written-discovery', description: 'Organize written discovery templates and custom question sets.' },
  { title: 'Deposition', href: '/services/deposition', description: 'Build outlines and questions, track exhibits, and capture notes.' },
]

export default function DiscoveryLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Discovery <span className="gradient-text">Workflows</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Centralize written discovery, subpoenas, meet-and-confer letters, and deposition prep with guided automation.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoveryTools.map(tool => (
              <Link
                key={tool.title}
                href={tool.href}
                className="block p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md bg-white transition-all hover:-translate-y-1"
              >
                <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{tool.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}








