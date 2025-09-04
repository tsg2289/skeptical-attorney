'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Calendar, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Blog() {
  // Placeholder blog posts - in a real app, these would come from a CMS or database
  const blogPosts = [
    {
      id: 1,
      title: "The Future of Legal Document Automation",
      excerpt: "Explore how AI and automation are transforming the legal industry and what it means for modern law practices.",
      author: "Sarah Johnson",
      date: "December 15, 2023",
      category: "Technology",
      image: "/api/placeholder/400/250",
      slug: "future-of-legal-document-automation"
    },
    {
      id: 2,
      title: "Streamlining Discovery: Best Practices for 2024",
      excerpt: "Learn the latest strategies for managing discovery processes efficiently while maintaining compliance and accuracy.",
      author: "Michael Chen",
      date: "December 10, 2023",
      category: "Best Practices",
      image: "/api/placeholder/400/250",
      slug: "streamlining-discovery-best-practices"
    },
    {
      id: 3,
      title: "Understanding Written vs. Oral Discovery",
      excerpt: "A comprehensive guide to the differences between written and oral discovery methods and when to use each approach.",
      author: "Emily Rodriguez",
      date: "December 5, 2023",
      category: "Education",
      image: "/api/placeholder/400/250",
      slug: "written-vs-oral-discovery-guide"
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
              <span className="gradient-text">Legal Insights</span> & Articles
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              Stay informed with the latest trends, best practices, and innovations in legal automation and practice management.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all hover-lift overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/20 flex items-center justify-center">
                    <div className="text-blue-600 font-semibold text-lg">Article Image</div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {post.author}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {post.date}
                    </div>
                  </div>
                  
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                  >
                    Read More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          
          {/* Coming Soon Message */}
          <div className="text-center mt-16 p-8 bg-gradient-to-br from-blue-50 to-white rounded-3xl border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">More Articles Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              We're working on publishing more insightful articles about legal automation, best practices, and industry trends.
            </p>
            <Link
              href="/contact"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover-lift inline-flex items-center"
            >
              Suggest a Topic
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
