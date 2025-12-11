'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, LogOut, Trash2 } from 'lucide-react'
import { caseStorage, Case } from '@/lib/utils/caseStorage'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface UserInfo {
  id: string
  email: string
  fullName: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    caseName: '',
    caseNumber: '',
    caseType: '',
    client: ''
  })
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (supabaseUser) {
        const userInfo: UserInfo = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User'
        }
        setUser(userInfo)
        
        // Load cases using user ID
        const userCases = caseStorage.getUserCases(supabaseUser.id)
        setCases(userCases)
      } else {
        // Redirect to login if not logged in
        router.push('/login')
      }
      
      setLoading(false)
    }
    
    checkAuth()
  }, [router])

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    if (!formData.caseName.trim() || !formData.caseNumber.trim()) {
      alert('Please fill in case name and case number')
      return
    }

    setIsSubmitting(true)
    
    try {
      const newCase = caseStorage.addCase({
        caseName: formData.caseName.trim(),
        caseNumber: formData.caseNumber.trim(),
        caseType: formData.caseType.trim() || undefined,
        client: formData.client.trim() || undefined,
        userId: user.id
      })
      
      setCases(prev => [newCase, ...prev])
      setFormData({ caseName: '', caseNumber: '', caseType: '', client: '' })
      setShowAddForm(false)
    } catch (err) {
      console.error('Error adding case:', err)
      alert('Error adding case')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCase = (caseId: string) => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete this case?')) {
      return
    }
    
    const deleted = caseStorage.deleteCase(user.id, caseId)
    if (deleted) {
      setCases(prev => prev.filter(c => c.id !== caseId))
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setCases([])
    router.push('/')
    router.refresh()
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // If no user, show nothing (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Cases</h1>
            <p className="text-gray-600">Manage your legal cases and access services</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user.fullName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Add Case Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-6 flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Case</span>
          </button>
        )}

        {/* Add Case Form */}
        {showAddForm && (
          <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Case</h2>
            <form onSubmit={handleAddCase} className="space-y-4">
              <div>
                <label htmlFor="caseName" className="block text-sm font-medium text-gray-700 mb-2">
                  Case Name *
                </label>
                <input
                  id="caseName"
                  type="text"
                  value={formData.caseName}
                  onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="e.g., Smith vs. Johnson"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="caseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Case Number *
                </label>
                <input
                  id="caseNumber"
                  type="text"
                  value={formData.caseNumber}
                  onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="e.g., CV-2024-001"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="caseType" className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Case (Optional)
                </label>
                <input
                  id="caseType"
                  type="text"
                  value={formData.caseType}
                  onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="e.g., Personal Injury, Employment Law, Contract Dispute"
                />
              </div>
              
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
                  Client (Optional)
                </label>
                <input
                  id="client"
                  type="text"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="e.g., John Smith, ABC Corporation"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Case'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ caseName: '', caseNumber: '', caseType: '', client: '' })
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cases List */}
        {cases.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No cases yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first case</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all hover-lift font-medium"
            >
              Add Your First Case
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                href={`/dashboard/cases/${caseItem.id}`}
                className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all block"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{caseItem.caseName}</h3>
                    <p className="text-sm text-gray-500">Case #: {caseItem.caseNumber}</p>
                    {caseItem.caseType && (
                      <p className="text-sm text-blue-600 mt-1">Type: {caseItem.caseType}</p>
                    )}
                    {caseItem.client && (
                      <p className="text-sm text-gray-600 mt-1">Client: {caseItem.client}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteCase(caseItem.id)
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors p-2"
                    title="Delete case"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                
                {caseItem.description && (
                  <p className="text-gray-600 mb-4 text-sm">{caseItem.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Created: {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

