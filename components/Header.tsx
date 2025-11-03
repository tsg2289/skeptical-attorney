'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Menu, X, Scale } from 'lucide-react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false)

  const services = [
    { name: 'Demand Letters', href: '/services/demand-letters' },
    { name: 'Pleadings', href: 'https://employment-law-infraction-tracker.vercel.app', external: true },
    { 
      name: 'Discovery', 
      href: '/services/discovery',
      hasSubMenu: true,
      subItems: [
        { name: 'Written Discovery', href: '/services/discovery/written-discovery' },
        { name: 'Oral Discovery', href: '/services/discovery/oral-discovery' },
      ]
    },
    { name: 'Deposition', href: '/services/deposition' },
    { name: 'Law and Motion', href: '/services/law-and-motion' },
    { name: 'Settlement Agreements', href: '/services/settlement-agreements' },
    { name: 'Billing Comparison', href: '/services/billing-comparison' },
  ]

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-xl">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold gradient-text">Skeptical Attorney</span>
              <span className="text-xs text-gray-500 -mt-1">Legal Automation</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Home
            </Link>
            
            {/* Services Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button
                onClick={() => setIsServicesOpen(!isServicesOpen)}
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                <span>Services</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isServicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  {services.map((service) => (
                    <div key={service.name} className="relative">
                      {service.hasSubMenu ? (
                        <div
                          className="group"
                          onMouseEnter={() => setIsDiscoveryOpen(true)}
                          onMouseLeave={() => setIsDiscoveryOpen(false)}
                        >
                          <div className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer">
                            <span>{service.name}</span>
                            <ChevronDown className="h-4 w-4 -rotate-90" />
                          </div>
                          {isDiscoveryOpen && (
                            <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2">
                              {service.subItems?.map((subItem) => (
                                (subItem as any).external ? (
                                  <a
                                    key={subItem.name}
                                    href={subItem.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    onClick={() => {
                                      setIsServicesOpen(false)
                                      setIsDiscoveryOpen(false)
                                    }}
                                  >
                                    {subItem.name}
                                  </a>
                                ) : (
                                  <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    onClick={() => {
                                      setIsServicesOpen(false)
                                      setIsDiscoveryOpen(false)
                                    }}
                                  >
                                    {subItem.name}
                                  </Link>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      ) : service.external ? (
                        <a
                          href={service.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => setIsServicesOpen(false)}
                        >
                          {service.name}
                        </a>
                      ) : (
                        <Link
                          href={service.href}
                          className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => setIsServicesOpen(false)}
                        >
                          {service.name}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
            
            <Link
              href="/get-started"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium"
            >
              Get Started
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 mt-2">
            <div className="space-y-2">
              <Link
                href="/"
                className="block px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              
              {/* Mobile Services */}
              <div>
                <button
                  onClick={() => setIsServicesOpen(!isServicesOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                >
                  <span>Services</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isServicesOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    {services.map((service) => (
                      <div key={service.name}>
                        {service.hasSubMenu ? (
                          <div>
                            <button
                              onClick={() => setIsDiscoveryOpen(!isDiscoveryOpen)}
                              className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                              <span>{service.name}</span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${isDiscoveryOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isDiscoveryOpen && (
                              <div className="ml-4 mt-1 space-y-1">
                                {service.subItems?.map((subItem) => (
                                  (subItem as any).external ? (
                                    <a
                                      key={subItem.name}
                                      href={subItem.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block px-3 py-2 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                      onClick={() => {
                                        setIsMenuOpen(false)
                                        setIsServicesOpen(false)
                                        setIsDiscoveryOpen(false)
                                      }}
                                    >
                                      {subItem.name}
                                    </a>
                                  ) : (
                                    <Link
                                      key={subItem.name}
                                      href={subItem.href}
                                      className="block px-3 py-2 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                      onClick={() => {
                                        setIsMenuOpen(false)
                                        setIsServicesOpen(false)
                                        setIsDiscoveryOpen(false)
                                      }}
                                    >
                                      {subItem.name}
                                    </Link>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        ) : service.external ? (
                          <a
                            href={service.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            onClick={() => {
                              setIsMenuOpen(false)
                              setIsServicesOpen(false)
                            }}
                          >
                            {service.name}
                          </a>
                        ) : (
                          <Link
                            href={service.href}
                            className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            onClick={() => {
                              setIsMenuOpen(false)
                              setIsServicesOpen(false)
                            }}
                          >
                            {service.name}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/blog"
                className="block px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/about"
                className="block px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/get-started"
                className="block mx-3 mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl text-center font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
