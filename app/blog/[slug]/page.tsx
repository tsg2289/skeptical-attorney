'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Calendar, User, ArrowLeft } from 'lucide-react'
import { blogPosts } from '@/lib/data/blogPosts'

export default function BlogPostPage() {
  const params = useParams()
  const slug = params?.slug as string

  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
            <Link
              href="/blog"
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Split content by double newlines to create paragraphs
  const contentParagraphs = post.content ? post.content.split('\n\n').filter(p => p.trim()) : []

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Article Header */}
      <article className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>

          <div className="mb-6">
            <span className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium">
              {post.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-6 text-gray-600 mb-8">
            {post.author && (
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="font-medium">{post.author}</span>
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <span>{post.date}</span>
            </div>
          </div>

          <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl overflow-hidden mb-12 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/20 flex items-center justify-center">
              <div className="text-blue-600 font-semibold text-xl">Article Image</div>
            </div>
          </div>
        </div>
      </article>

      {/* Article Content */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            {contentParagraphs.length > 0 ? (
              contentParagraphs.map((paragraph, index) => (
                <p key={index} className="text-gray-700 leading-relaxed mb-6 text-lg">
                  {paragraph.trim()}
                </p>
              ))
            ) : (
              <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                {post.excerpt}
              </p>
            )}
          </div>

          {/* Back to Blog Link */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/blog"
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Posts
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

