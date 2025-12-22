'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const pleadings = [
  { title: 'Complaint Generator', href: '/services/pleadings/complaint', description: 'Structured intake, drafting support, and export-ready complaints.' },
  { title: 'Answer Generator', href: '/services/pleadings/answer', description: 'Respond efficiently with tailored affirmative defenses and denials.' },
]

export default function PleadingsLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Pleadings <span className="gradient-text">Toolkit</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Draft complaints and answers faster with guided workflows, placeholders, and exports that match your format.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pleadings.map(item => (
              <Link
                key={item.title}
                href={item.href}
                className="block p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md bg-white transition-all hover:-translate-y-1"
              >
                <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}



















