'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">About</span> Skeptical Attorney
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              Fact-driven legal automation for modern practice.
            </p>
          </div>
        </div>
      </section>

      {/* About Content Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About Skeptical Attorney</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6 text-justify">
                Skeptical Attorney is a fact-driven, AI-powered legal automation platform designed to help attorneys streamline document creation and focus on what matters most—serving their clients. Every output in the platform is generated from the facts you provide. Your case facts become the backbone of the entire workflow, dynamically shaping the drafting, analysis, and document generation across the application. We automate time-consuming, repetitive tasks so you can dedicate your expertise to strategy and client relationships.
              </p>
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">What We Do</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-4 text-justify">
                We provide comprehensive automation tools for core legal workflows:
              </p>
              <ul className="list-disc list-inside space-y-3 text-lg text-gray-700 mb-6 ml-4">
                <li><strong>Document Generation</strong>: Create demand letters, pleadings, discovery documents, settlement agreements, and more with AI assistance that understands legal context.</li>
                <li><strong>Intelligent Automation</strong>: Our AI reads, interprets, and applies the specific facts of your case to produce accurate, context-aware legal content—never generic templates.</li>
                <li><strong>Fact-Driven Output</strong>: A single set of case facts fuels the entire drafting process. Update the facts once, and the entire document stack updates automatically.</li>
                <li><strong>Comprehensive Solutions</strong>: From initial demand letters through discovery, depositions, and settlement agreements—we cover your entire document workflow.</li>
              </ul>
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Why It Matters</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-4 text-justify">
                Legal professionals spend countless hours drafting documents based on detailed fact patterns. Our fact-driven platform helps you:
              </p>
              <ul className="list-disc list-inside space-y-3 text-lg text-gray-700 mb-6 ml-4">
                <li><strong>Save Time</strong>: Reduce document creation time from hours to minutes.</li>
                <li><strong>Ensure Consistency</strong>: Maintain factual alignment and formatting standards across every document in the case.</li>
                <li><strong>Reduce Errors</strong>: AI-powered validation helps catch inconsistencies, missing facts, or drafting issues before they become problems.</li>
                <li><strong>Scale Your Practice</strong>: Handle more cases without proportional overhead increases.</li>
              </ul>
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Approach</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-4 text-justify">
                We combine deep legal expertise with cutting-edge AI technology to deliver:
              </p>
              <ul className="list-disc list-inside space-y-3 text-lg text-gray-700 mb-6 ml-4">
                <li><strong>Context-Aware Generation</strong>: All documents are grounded in your specific case facts—the platform does not rely on static templates but generates content uniquely tailored to your matter.</li>
                <li><strong>Legal Compliance</strong>: Built-in templates and formatting aligned with legal standards and best practices.</li>
                <li><strong>Security First</strong>: SOC 2 compliant, HIPAA ready, with bank-level security protecting sensitive client information.</li>
                <li><strong>Attorney Control</strong>: You review, edit, and approve every document—AI assists, but you remain in control.</li>
              </ul>
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Built for Modern Legal Practice</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-4 text-justify">
                Whether you're a solo practitioner or part of a larger firm, Skeptical Attorney adapts to your workflow. Because it is fact-driven at its core, the platform ensures that everything you generate—letters, pleadings, interrogatories, deposition outlines, or settlement materials—remains consistent, accurate, and aligned with the evolving details of the case.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-6 text-justify">
                Skeptical Attorney integrates seamlessly into your practice, helping you deliver better outcomes for clients while reclaiming valuable time for high-value work.
              </p>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/get-started"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover-lift text-center"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/contact"
                  className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-50 transition-all hover-lift text-center"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}


