'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

const sections = [
  {
    title: 'Data Collection',
    body:
      'We collect only what is necessary to provide the service: account details, usage telemetry, and documents you choose to upload.'
  },
  {
    title: 'Use of Information',
    body:
      'Your data is used to deliver, improve, and secure the platform. We do not sell personal information.'
  },
  {
    title: 'Storage & Security',
    body:
      'Data is encrypted in transit and at rest. Access is limited to authorized personnel following least-privilege principles.'
  },
  {
    title: 'AI Processing',
    body:
      'Content sent to AI endpoints is minimized and anonymized where possible. We do not train models on your data.'
  },
  {
    title: 'Your Controls',
    body:
      'You can request export or deletion of your data at any time. Contact us to exercise these rights.'
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            How we handle your data with care and security.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {sections.map(section => (
            <div key={section.title} className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
              <h2 className="text-2xl font-semibold mb-3">{section.title}</h2>
              <p className="text-gray-700 leading-relaxed">{section.body}</p>
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























