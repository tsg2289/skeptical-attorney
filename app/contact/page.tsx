'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Contact</span> Us
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            We&apos;d love to learn about your practice and how we can help.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
              <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
              <p className="text-gray-600 mb-6">
                Reach out and we&apos;ll respond within one business day.
              </p>
              <div className="space-y-3 text-gray-700">
                <div>
                  <div className="font-semibold">Email</div>
                  <div>info@skepticalattorney.com</div>
                </div>
                <div>
                  <div className="font-semibold">Phone</div>
                  <div>(555) 123-4567</div>
                </div>
                <div>
                  <div className="font-semibold">Office</div>
                  <div>123 Legal Plaza, Suite 456</div>
                  <div>Legal City, LC 12345</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
              <h2 className="text-2xl font-semibold mb-4">Office Hours</h2>
              <p className="text-gray-600 mb-6">
                We accommodate client schedules across time zones.
              </p>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>Monday – Friday</span>
                  <span>8:00 AM – 6:00 PM PT</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span>By appointment</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}







