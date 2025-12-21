'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  FileText, 
  Shield, 
  LogOut, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  X,
  DollarSign,
  Target,
  Building2,
  Phone,
  MapPin
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { userProfileStorage, UserProfile } from '@/lib/supabase/userProfileStorage'

interface UserInfo {
  id: string
  email: string
  fullName: string
}

interface CaseItem {
  id: string
  caseName: string
  caseNumber: string
  createdAt: string
}

export default function Settings() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Profile fields
  const [fullName, setFullName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  
  // Firm info states
  const [firmName, setFirmName] = useState('')
  const [barNumber, setBarNumber] = useState('')
  const [firmAddress, setFirmAddress] = useState('')
  const [firmPhone, setFirmPhone] = useState('')
  const [firmEmail, setFirmEmail] = useState('')
  const [isEditingFirm, setIsEditingFirm] = useState(false)
  const [savingFirm, setSavingFirm] = useState(false)
  const [firmSuccess, setFirmSuccess] = useState(false)
  
  // Billing goal states
  const [billingGoal, setBillingGoal] = useState('')
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('')
  const [isEditingBillingGoal, setIsEditingBillingGoal] = useState(false)
  const [savingBillingGoal, setSavingBillingGoal] = useState(false)
  const [billingGoalSuccess, setBillingGoalSuccess] = useState(false)
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      if (!supabaseUser) {
        router.push('/login')
        return
      }
      
      // Set basic user info
      const userInfo: UserInfo = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        fullName: supabaseUser.email?.split('@')[0] || 'User'
      }
      setUser(userInfo)
      
      // Load user profile from database
      try {
        const userProfile = await userProfileStorage.getProfile()
        if (userProfile) {
          setProfile(userProfile)
          setFullName(userProfile.fullName || userInfo.fullName)
          setFirmName(userProfile.firmName || '')
          setBarNumber(userProfile.barNumber || '')
          setFirmAddress(userProfile.firmAddress || '')
          setFirmPhone(userProfile.firmPhone || '')
          setFirmEmail(userProfile.firmEmail || '')
          setBillingGoal(userProfile.billingGoal || '')
          setDefaultHourlyRate(userProfile.defaultHourlyRate?.toString() || '')
          
          // Update userInfo with profile name
          if (userProfile.fullName) {
            userInfo.fullName = userProfile.fullName
            setUser(userInfo)
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      }
      
      // Load user's cases
      try {
        const { data: userCases } = await supabase
          .from('cases')
          .select('id, case_name, case_number, created_at')
          .eq('user_id', supabaseUser.id)
          .order('created_at', { ascending: false })
        
        if (userCases) {
          setCases(userCases.map((c: { id: string; case_name: string; case_number: string; created_at: string }) => ({
            id: c.id,
            caseName: c.case_name,
            caseNumber: c.case_number,
            createdAt: c.created_at
          })))
        }
      } catch (err) {
        console.error('Error loading cases:', err)
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [router, supabase])

  // Update display name
  const handleUpdateName = async () => {
    if (!fullName.trim()) return
    
    setSavingName(true)
    setNameSuccess(false)
    
    try {
      const updatedProfile = await userProfileStorage.updateProfile({
        fullName: fullName.trim()
      })
      
      if (!updatedProfile) throw new Error('Failed to update name')
      
      setProfile(updatedProfile)
      setUser(prev => prev ? { ...prev, fullName: fullName.trim() } : null)
      setNameSuccess(true)
      setIsEditingName(false)
      
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  // Update firm info
  const handleUpdateFirmInfo = async () => {
    setSavingFirm(true)
    setFirmSuccess(false)
    
    try {
      const updatedProfile = await userProfileStorage.updateProfile({
        firmName: firmName.trim() || null,
        barNumber: barNumber.trim() || null,
        firmAddress: firmAddress.trim() || null,
        firmPhone: firmPhone.trim() || null,
        firmEmail: firmEmail.trim() || null
      })
      
      if (!updatedProfile) throw new Error('Failed to update firm info')
      
      setProfile(updatedProfile)
      setFirmSuccess(true)
      setIsEditingFirm(false)
      
      setTimeout(() => setFirmSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to update firm info')
    } finally {
      setSavingFirm(false)
    }
  }

  // Update billing goal
  const handleUpdateBillingGoal = async () => {
    setSavingBillingGoal(true)
    setBillingGoalSuccess(false)
    
    try {
      const updatedProfile = await userProfileStorage.updateProfile({
        billingGoal: billingGoal.trim() || null,
        defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : null
      })
      
      if (!updatedProfile) throw new Error('Failed to update billing goal')
      
      setProfile(updatedProfile)
      setBillingGoalSuccess(true)
      setIsEditingBillingGoal(false)
      
      setTimeout(() => setBillingGoalSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to update billing goal')
    } finally {
      setSavingBillingGoal(false)
    }
  }

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    
    setPasswordLoading(true)
    
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      })
      
      if (signInError) {
        setPasswordError('Current password is incorrect')
        setPasswordLoading(false)
        return
      }
      
      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Sign out from all devices
  const handleSignOutAll = async () => {
    if (!confirm('This will sign you out from all devices. Continue?')) return
    
    try {
      await supabase.auth.signOut({ scope: 'global' })
      router.push('/login')
    } catch (err: any) {
      alert(err.message || 'Failed to sign out')
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    
    setDeletingAccount(true)
    
    try {
      // Note: Full account deletion typically requires a server-side function
      // This signs the user out - implement full deletion via Supabase Edge Function
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      alert(err.message || 'Failed to delete account')
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Account Settings</h1>
        
        {/* Profile Section */}
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Profile
          </h2>
          
          {/* Name Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditingName}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
              />
              {isEditingName ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateName}
                    disabled={savingName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false)
                      setFullName(user.fullName)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {nameSuccess && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Name updated successfully
              </p>
            )}
          </div>
          
          {/* Email Field (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>
        </section>

        {/* Firm/Practice Info Section */}
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Firm / Practice Info
            </h2>
            {!isEditingFirm ? (
              <button
                onClick={() => setIsEditingFirm(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateFirmInfo}
                  disabled={savingFirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {savingFirm ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingFirm(false)
                    // Reset to original values
                    if (profile) {
                      setFirmName(profile.firmName || '')
                      setBarNumber(profile.barNumber || '')
                      setFirmAddress(profile.firmAddress || '')
                      setFirmPhone(profile.firmPhone || '')
                      setFirmEmail(profile.firmEmail || '')
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {firmSuccess && (
            <p className="mb-4 text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Firm info updated successfully
            </p>
          )}
          
          <p className="text-xs text-gray-500 mb-4">
            This information will be used for document headers, letterheads, and signature blocks.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Firm Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firm Name
              </label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                disabled={!isEditingFirm}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
                placeholder="e.g., Smith & Associates LLP"
              />
            </div>
            
            {/* Bar Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State Bar Number
              </label>
              <input
                type="text"
                value={barNumber}
                onChange={(e) => setBarNumber(e.target.value)}
                disabled={!isEditingFirm}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
                placeholder="e.g., 123456"
              />
            </div>
            
            {/* Firm Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Office Address
              </label>
              <textarea
                value={firmAddress}
                onChange={(e) => setFirmAddress(e.target.value)}
                disabled={!isEditingFirm}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50 resize-none"
                placeholder="123 Main Street, Suite 100, Los Angeles, CA 90001"
              />
            </div>
            
            {/* Firm Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={firmPhone}
                onChange={(e) => setFirmPhone(e.target.value)}
                disabled={!isEditingFirm}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
                placeholder="(555) 123-4567"
              />
            </div>
            
            {/* Firm Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Firm Email
              </label>
              <input
                type="email"
                value={firmEmail}
                onChange={(e) => setFirmEmail(e.target.value)}
                disabled={!isEditingFirm}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
                placeholder="contact@lawfirm.com"
              />
            </div>
          </div>
        </section>

        {/* Billing Section */}
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Billing
            </h2>
            {!isEditingBillingGoal ? (
              <button
                onClick={() => setIsEditingBillingGoal(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateBillingGoal}
                  disabled={savingBillingGoal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {savingBillingGoal ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingBillingGoal(false)
                    if (profile) {
                      setBillingGoal(profile.billingGoal || '')
                      setDefaultHourlyRate(profile.defaultHourlyRate?.toString() || '')
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {billingGoalSuccess && (
            <p className="mb-4 text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Billing settings updated successfully
            </p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Billing Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Billing Goal
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Target billable hours or revenue goal.
              </p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Target className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={billingGoal}
                  onChange={(e) => setBillingGoal(e.target.value)}
                  disabled={!isEditingBillingGoal}
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
                  placeholder="e.g., 150 hours or $25,000"
                />
              </div>
            </div>
            
            {/* Default Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Hourly Rate
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Used for billing calculations.
              </p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={defaultHourlyRate}
                  onChange={(e) => setDefaultHourlyRate(e.target.value)}
                  disabled={!isEditingBillingGoal}
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black disabled:bg-gray-50"
                  placeholder="e.g., 350"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Saved Cases Section */}
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Saved Cases/Matters
          </h2>
          
          {cases.length === 0 ? (
            <p className="text-gray-500">No saved cases yet.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/dashboard/cases/${caseItem.id}`}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{caseItem.caseName}</p>
                    <p className="text-sm text-gray-500">Case #: {caseItem.caseNumber}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(caseItem.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
          
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View all cases →
          </Link>
        </section>

        {/* Security Section */}
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Security
          </h2>
          
          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h3 className="font-medium text-gray-800">Change Password</h3>
            
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="Enter new password (min. 6 characters)"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                  placeholder="Confirm new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {passwordError}
              </div>
            )}
            
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Password updated successfully
              </div>
            )}
            
            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
          
          {/* Log out all devices */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-800 mb-2">Sessions</h3>
            <p className="text-sm text-gray-500 mb-4">
              Sign out from all devices where you&apos;re currently logged in.
            </p>
            <button
              onClick={handleSignOutAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out of all devices
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white p-6 rounded-2xl shadow-lg border border-red-200 mb-6">
          <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </section>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  This action cannot be undone. All your data, cases, and settings will be permanently deleted.
                </p>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                placeholder="DELETE"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}










