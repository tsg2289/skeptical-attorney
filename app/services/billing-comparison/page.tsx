'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Check, X, Star, Calculator, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function BillingComparison() {
  const comparisonData = [
    {
      category: "Traditional Billing",
      icon: <Clock className="h-8 w-8" />,
      color: "from-gray-600 to-gray-700",
      features: [
        { name: "Manual document preparation", included: true, time: "2-4 hours per document" },
        { name: "Research and citation lookup", included: true, time: "1-2 hours per case" },
        { name: "Template management", included: false, time: "30 min setup per document" },
        { name: "Quality control review", included: true, time: "30-60 minutes" },
        { name: "Client billing preparation", included: true, time: "15-30 minutes" },
        { name: "Document formatting", included: true, time: "20-40 minutes" }
      ],
      totalTime: "4-8 hours",
      hourlyRate: "$350-500",
      totalCost: "$1,400-4,000",
      efficiency: "25%"
    },
    {
      category: "Skeptical Attorney Automation",
      icon: <TrendingUp className="h-8 w-8" />,
      color: "from-blue-600 to-blue-700",
      popular: true,
      features: [
        { name: "Automated document generation", included: true, time: "5-10 minutes" },
        { name: "Integrated legal research", included: true, time: "2-5 minutes" },
        { name: "Smart template library", included: true, time: "1 minute" },
        { name: "AI-powered quality review", included: true, time: "2-3 minutes" },
        { name: "Automated billing integration", included: true, time: "30 seconds" },
        { name: "Professional formatting", included: true, time: "Instant" }
      ],
      totalTime: "15-30 minutes",
      hourlyRate: "$350-500",
      totalCost: "$87-250",
      efficiency: "95%"
    }
  ]

  const benefits = [
    {
      icon: <Calculator className="h-6 w-6" />,
      title: "Cost Savings",
      description: "Save 80-90% on document preparation costs while maintaining quality"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Time Efficiency",
      description: "Reduce preparation time from hours to minutes with automation"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Increased Profitability",
      description: "Handle more cases with the same resources and overhead"
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Billing</span> Comparison
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              See how automation transforms your billing efficiency and profitability. 
              Compare traditional methods with our streamlined approach.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {comparisonData.map((plan, index) => (
              <div key={index} className={`relative bg-white rounded-3xl shadow-xl border-2 ${plan.popular ? 'border-blue-500' : 'border-gray-200'} p-8 hover-lift`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Recommended
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${plan.color} text-white rounded-2xl mb-4`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.category}</h3>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-gray-900">{plan.totalTime}</div>
                    <div className="text-sm text-gray-600">Average time per case</div>
                    <div className="text-2xl font-bold text-blue-600">{plan.totalCost}</div>
                    <div className="text-sm text-gray-600">Total cost per case</div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-gray-900 font-medium">{feature.name}</div>
                        <div className="text-sm text-gray-600">{feature.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Efficiency Rating</span>
                    <span className="text-2xl font-bold text-blue-600">{plan.efficiency}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Hourly Rate</span>
                    <span className="font-semibold">{plan.hourlyRate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Automation?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your practice with measurable improvements in efficiency and profitability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover-lift">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl mb-6">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* ROI Calculator */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Calculate Your ROI</h3>
              <p className="text-gray-600">
                Based on average case volume and hourly rates for legal professionals
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Savings Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time saved per case:</span>
                      <span className="font-semibold">3.5-7.5 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost savings per case:</span>
                      <span className="font-semibold text-green-600">$1,313-3,750</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cases per month:</span>
                      <span className="font-semibold">10-50</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">Monthly Savings:</span>
                        <span className="text-lg font-bold text-green-600">$13,130-187,500</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Annual Impact</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Time saved annually:</span>
                    <span className="font-semibold">420-4,500 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Annual cost savings:</span>
                    <span className="font-semibold text-blue-600">$157,560-2,250,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">ROI on automation:</span>
                    <span className="font-semibold text-green-600">1,500-15,000%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Billing?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Start saving time and money today with our legal automation platform.
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
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
