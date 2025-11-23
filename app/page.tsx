import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Automate</span> <span className="text-gray-700">Your Legal Practice</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              Streamline your workflow with AI-powered legal document automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover-lift flex items-center justify-center"
              >
                Get Started Free →
              </Link>
              <Link
                href="/dashboard"
                className="bg-white border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-50 transition-all hover-lift flex items-center justify-center"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Legal Automation Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive automation solutions for every aspect of your legal practice.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Link href="/services/demand-letters" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">📄</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Demand Letters
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Generate professional demand letters with customizable templates and automated calculations.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Try It →
                </div>
              </div>
            </Link>

            <div className="group relative">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">⚖️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Pleadings
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Create court-ready pleadings with proper formatting and legal citations automatically.</p>
                <div className="relative">
                  <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform cursor-pointer">
                    Try It →
                  </div>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <Link href="/services/pleadings/complaint" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Complaint
                    </Link>
                    <Link href="/services/pleadings/answer" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Answer
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">🔍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Discovery
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Streamline discovery processes with automated document requests and interrogatories.</p>
                <div className="relative">
                  <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform cursor-pointer">
                    Try It →
                  </div>
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <Link href="/services/discovery/propound-discovery" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Propound Discovery
                    </Link>
                    <Link href="/services/discovery/respond-to-discovery" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Respond to Discovery
                    </Link>
                    <Link href="/services/discovery/subpoena" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Subpoena
                    </Link>
                    <Link href="/services/discovery/meet-and-confer" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Meet and Confer
                    </Link>
                    <Link href="/services/deposition" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg">
                      Deposition
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/services/law-and-motion" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">✍️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Law and Motion
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Prepare motions and supporting documents with intelligent legal research integration.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Try It →
                </div>
              </div>
            </Link>

            <Link href="/services/settlement-agreements" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">🤝</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Settlement Agreements
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Draft comprehensive settlement agreements with built-in clause libraries.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Try It →
                </div>
              </div>
            </Link>

            <Link href="/services/billing-comparison" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">💰</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Billing Generator
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Compare traditional billing methods with our automated approach and see the savings.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Try It →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Revolutionize Your Practice?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join the growing list of attorneys who have already streamlined their workflow with our automation platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all hover-lift"
            >
              Join the Community
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
