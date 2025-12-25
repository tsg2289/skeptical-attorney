'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

const terms = [
  {
    title: 'Acceptance',
    body:
      'By using the platform, you agree to these terms and confirm you are authorized to act on behalf of your organization or client.'
  },
  {
    title: 'Use of Service',
    body:
      'You remain responsible for all legal work product. The platform assists drafting and organization; it does not provide legal advice.'
  },
  {
    title: 'Confidentiality',
    body:
      'We protect your data with encryption and access controls. Do not upload data you are not authorized to share.'
  },
  {
    title: 'Availability',
    body:
      'We aim for high uptime but occasional maintenance or outages may occur. Critical changes will be communicated when possible.'
  },
  {
    title: 'Liability',
    body:
      'The service is provided “as is.” To the fullest extent allowed by law, liability is limited to the fees paid for the service.'
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Terms of <span className="gradient-text">Service</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Understand your rights and responsibilities when using our platform.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {terms.map(term => (
            <div key={term.title} className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
              <h2 className="text-2xl font-semibold mb-3">{term.title}</h2>
              <p className="text-gray-700 leading-relaxed">{term.body}</p>
            </div>
          ))}
          <p className="text-sm text-gray-500">
            Last updated: {new Date().getFullYear()}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}






















