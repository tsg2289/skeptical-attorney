'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Cookie <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            How we use cookies and similar technologies to improve your experience.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
            <h2 className="text-2xl font-semibold mb-3">What We Use</h2>
            <p className="text-gray-700 leading-relaxed">
              We use strictly necessary cookies for authentication and session continuity, and analytic cookies to understand feature usage. We do not use cookies to sell personal information.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
            <h2 className="text-2xl font-semibold mb-3">Your Choices</h2>
            <p className="text-gray-700 leading-relaxed">
              You can manage cookies in your browser settings. Disabling essential cookies may limit access to secure areas of the platform.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Last updated: {new Date().getFullYear()}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}










