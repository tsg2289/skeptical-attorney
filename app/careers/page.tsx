'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Join <span className="gradient-text">Skeptical Attorney</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Build tools that help attorneys focus on advocacy instead of admin.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
            <h2 className="text-2xl font-semibold mb-4">Why Work With Us</h2>
            <ul className="list-disc list-inside space-y-3 text-gray-700">
              <li>Mission-driven team focused on real impact for legal workflows</li>
              <li>Remote-friendly with flexible schedules and thoughtful collaboration</li>
              <li>Modern stack, rapid iteration, and strong design standards</li>
              <li>Competitive compensation, benefits, and ongoing learning support</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
            <h2 className="text-2xl font-semibold mb-4">Open Roles</h2>
            <p className="text-gray-600 mb-4">
              We&apos;re actively hiring across product, engineering, and customer success.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Full-Stack Engineer', location: 'Remote' },
                { title: 'Product Designer', location: 'Remote' },
                { title: 'Customer Success Lead', location: 'Remote' },
                { title: 'Legal Content Specialist', location: 'Remote' },
              ].map(role => (
                <div key={role.title} className="p-4 border border-gray-200 rounded-xl bg-white">
                  <div className="font-semibold text-gray-900">{role.title}</div>
                  <div className="text-sm text-gray-600">{role.location}</div>
                  <div className="mt-3 text-sm text-gray-600">
                    Help us craft intuitive, reliable tools for modern legal teams.
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="mailto:careers@skepticalattorney.com"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover-lift"
              >
                Email Your Resume
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}






















