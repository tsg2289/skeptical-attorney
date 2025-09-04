import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-xl">
                <div className="h-6 w-6 text-white">⚖️</div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold gradient-text">Skeptical Attorney</span>
                <span className="text-xs text-gray-500 -mt-1">Legal Automation</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Home
              </Link>
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  <span>Services</span>
                  <span>▼</span>
                </button>
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/services/demand-letters" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Demand Letters
                  </Link>
                  <Link href="/services/pleadings" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Pleadings
                  </Link>
                  <div className="relative group/sub">
                    <div className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer">
                      <span>Discovery</span>
                      <span>▶</span>
                    </div>
                    <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all">
                      <Link href="/services/discovery/written-discovery" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        Written Discovery
                      </Link>
                      <Link href="/services/discovery/oral-discovery" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        Oral Discovery
                      </Link>
                    </div>
                  </div>
                  <Link href="/services/law-and-motion" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Law and Motion
                  </Link>
                  <Link href="/services/settlement-agreements" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Settlement Agreements
                  </Link>
                  <Link href="/services/billing-comparison" className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Billing Comparison
                  </Link>
                </div>
              </div>
              <Link href="/blog" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Blog
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                About
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Contact
              </Link>
              <Link href="/get-started" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium">
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Automate</span> Your Legal Practice
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              Streamline your workflow with AI-powered legal document automation. 
              Focus on strategy while we handle the paperwork.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/get-started"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover-lift flex items-center justify-center"
              >
                Get Started Free →
              </Link>
              <Link
                href="/demo"
                className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-50 transition-all hover-lift"
              >
                Watch Demo
              </Link>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                SOC 2 Compliant
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                HIPAA Ready
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Bank-Level Security
              </div>
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
                  Learn More →
                </div>
              </div>
            </Link>

            <Link href="/services/pleadings" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">⚖️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Pleadings
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Create court-ready pleadings with proper formatting and legal citations automatically.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Learn More →
                </div>
              </div>
            </Link>

            <Link href="/services/discovery" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">🔍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Discovery
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Streamline discovery processes with automated document requests and interrogatories.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Learn More →
                </div>
              </div>
            </Link>

            <Link href="/services/law-and-motion" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">✍️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Law and Motion
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Prepare motions and supporting documents with intelligent legal research integration.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Learn More →
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
                  Learn More →
                </div>
              </div>
            </Link>

            <Link href="/services/billing-comparison" className="group">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift h-full">
                <div className="text-blue-600 mb-6 text-5xl">💰</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  Billing Comparison
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">Compare traditional billing methods with our automated approach and see the savings.</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Learn More →
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
            Join thousands of attorneys who have already streamlined their workflow with our automation platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all hover-lift"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all hover-lift"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-xl">
                  <div className="h-6 w-6 text-white">⚖️</div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold">Skeptical Attorney</span>
                  <span className="text-sm text-gray-400">Legal Automation</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Revolutionizing legal practice through intelligent automation.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Services</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/services/demand-letters" className="text-gray-400 hover:text-white transition-colors">Demand Letters</Link></li>
                <li><Link href="/services/pleadings" className="text-gray-400 hover:text-white transition-colors">Pleadings</Link></li>
                <li><Link href="/services/discovery" className="text-gray-400 hover:text-white transition-colors">Discovery</Link></li>
                <li><Link href="/services/law-and-motion" className="text-gray-400 hover:text-white transition-colors">Law and Motion</Link></li>
                <li><Link href="/services/settlement-agreements" className="text-gray-400 hover:text-white transition-colors">Settlement Agreements</Link></li>
                <li><Link href="/services/billing-comparison" className="text-gray-400 hover:text-white transition-colors">Billing Comparison</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div>📧 info@skepticalattorney.com</div>
                <div>📞 (555) 123-4567</div>
                <div>📍 123 Legal Plaza, Suite 456<br />Legal City, LC 12345</div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2023 Skeptical Attorney. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
