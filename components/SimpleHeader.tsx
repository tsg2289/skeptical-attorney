import Link from 'next/link'

const SimpleHeader = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Skeptical Attorney
          </Link>
          <nav className="space-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600">Home</Link>
            <Link href="/blog" className="text-gray-700 hover:text-blue-600">Blog</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default SimpleHeader
