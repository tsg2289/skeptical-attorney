import Link from 'next/link'
import { Scale, Mail, Phone, MapPin, Twitter, Linkedin, Facebook } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-xl">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold">Skeptical Attorney</span>
                <span className="text-sm text-gray-400">Legal Automation</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Revolutionizing legal practice through intelligent automation. 
              Streamline your workflow and focus on what matters most.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/services/demand-letters" className="text-gray-400 hover:text-white transition-colors">
                  Demand Letters
                </Link>
              </li>
              <li>
                <Link href="/services/pleadings" className="text-gray-400 hover:text-white transition-colors">
                  Pleadings
                </Link>
              </li>
              <li>
                <Link href="/services/discovery" className="text-gray-400 hover:text-white transition-colors">
                  Discovery
                </Link>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>
                    <Link href="/services/discovery/propound-discovery" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Propound Discovery
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/discovery/respond-to-discovery" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Respond to Discovery
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/discovery/subpoena" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Subpoena
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/discovery/meet-and-confer" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Meet and Confer
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/deposition" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Deposition
                    </Link>
                  </li>
                </ul>
              </li>
              <li>
                <Link href="/services/law-and-motion" className="text-gray-400 hover:text-white transition-colors">
                  Law and Motion
                </Link>
              </li>
              <li>
                <Link href="/services/settlement-agreements" className="text-gray-400 hover:text-white transition-colors">
                  Settlement Agreements
                </Link>
              </li>
              <li>
                <Link href="/services/billing-comparison" className="text-gray-400 hover:text-white transition-colors">
                  Billing Generator
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-400 hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-blue-400" />
                <a href="mailto:info@skepticalattorney.com" className="text-gray-400 hover:text-white transition-colors">
                  info@skepticalattorney.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-blue-400" />
                <a href="tel:+1-555-123-4567" className="text-gray-400 hover:text-white transition-colors">
                  (555) 123-4567
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-blue-400 mt-1" />
                <div className="text-gray-400">
                  <div>123 Legal Plaza</div>
                  <div>Suite 456</div>
                  <div>Legal City, LC 12345</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} Skeptical Attorney. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
