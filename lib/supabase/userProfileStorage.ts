import { createClient } from './client'

export interface UserProfile {
  id: string
  userId: string
  fullName: string | null
  firmName: string | null
  barNumber: string | null
  firmAddress: string | null
  firmPhone: string | null
  firmEmail: string | null
  billingGoal: string | null
  defaultHourlyRate: number | null
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface UserProfileInput {
  fullName?: string | null
  firmName?: string | null
  barNumber?: string | null
  firmAddress?: string | null
  firmPhone?: string | null
  firmEmail?: string | null
  billingGoal?: string | null
  defaultHourlyRate?: number | null
  preferences?: Record<string, any>
}

// Convert snake_case DB response to camelCase frontend format
function mapProfileFromDb(dbProfile: any): UserProfile {
  return {
    id: dbProfile.id,
    userId: dbProfile.user_id,
    fullName: dbProfile.full_name,
    firmName: dbProfile.firm_name,
    barNumber: dbProfile.bar_number,
    firmAddress: dbProfile.firm_address,
    firmPhone: dbProfile.firm_phone,
    firmEmail: dbProfile.firm_email,
    billingGoal: dbProfile.billing_goal,
    defaultHourlyRate: dbProfile.default_hourly_rate ? parseFloat(dbProfile.default_hourly_rate) : null,
    preferences: dbProfile.preferences || {},
    createdAt: dbProfile.created_at,
    updatedAt: dbProfile.updated_at
  }
}

// Convert camelCase to snake_case for DB updates
function mapProfileToDb(input: UserProfileInput): Record<string, any> {
  const dbUpdates: Record<string, any> = {}
  
  if (input.fullName !== undefined) dbUpdates.full_name = input.fullName
  if (input.firmName !== undefined) dbUpdates.firm_name = input.firmName
  if (input.barNumber !== undefined) dbUpdates.bar_number = input.barNumber
  if (input.firmAddress !== undefined) dbUpdates.firm_address = input.firmAddress
  if (input.firmPhone !== undefined) dbUpdates.firm_phone = input.firmPhone
  if (input.firmEmail !== undefined) dbUpdates.firm_email = input.firmEmail
  if (input.billingGoal !== undefined) dbUpdates.billing_goal = input.billingGoal
  if (input.defaultHourlyRate !== undefined) dbUpdates.default_hourly_rate = input.defaultHourlyRate
  if (input.preferences !== undefined) dbUpdates.preferences = input.preferences
  
  return dbUpdates
}

export const userProfileStorage = {
  /**
   * Get the current user's profile
   * Creates a new profile if one doesn't exist
   */
  async getProfile(): Promise<UserProfile | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    // Try to get existing profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      // If no profile exists, create one
      if (error.code === 'PGRST116') {
        return this.createProfile({
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || null
        })
      }
      console.error('Error fetching profile:', error)
      return null
    }
    
    return mapProfileFromDb(data)
  },

  /**
   * Create a new profile for the current user
   */
  async createProfile(input: UserProfileInput = {}): Promise<UserProfile | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    const dbData = {
      user_id: user.id,
      ...mapProfileToDb(input)
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(dbData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating profile:', error)
      return null
    }
    
    console.log(`[AUDIT] Created user profile for user: ${user.id}`)
    return mapProfileFromDb(data)
  },

  /**
   * Update the current user's profile
   */
  async updateProfile(updates: UserProfileInput): Promise<UserProfile | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    const dbUpdates = mapProfileToDb(updates)
    
    // Check if profile exists first
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!existingProfile) {
      // Create profile if it doesn't exist
      return this.createProfile(updates)
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(dbUpdates)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating profile:', error)
      return null
    }
    
    console.log(`[AUDIT] Updated user profile for user: ${user.id}`)
    return mapProfileFromDb(data)
  },

  /**
   * Delete the current user's profile
   */
  async deleteProfile(): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return false
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting profile:', error)
      return false
    }
    
    console.log(`[AUDIT] Deleted user profile for user: ${user.id}`)
    return true
  }
}














