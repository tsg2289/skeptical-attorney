export interface UserData {
  username: string
  email: string
  password: string
  fullName: string
  firmName?: string
  createdAt: string
}

export interface CurrentUser {
  username: string
  email: string
  fullName: string
  firmName?: string
  loggedInAt: string
}

export const userStorage = {
  // Get all users
  getUsers(): UserData[] {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem('users') || '[]')
  },

  // Get current logged in user
  getCurrentUser(): CurrentUser | null {
    if (typeof window === 'undefined') return null
    const user = localStorage.getItem('currentUser')
    return user ? JSON.parse(user) : null
  },

  // Set current user session
  setCurrentUser(user: CurrentUser): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  // Clear current user session (logout)
  clearCurrentUser(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('currentUser')
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null
  },

  // Register new user
  registerUser(userData: Omit<UserData, 'createdAt'>): boolean {
    const users = this.getUsers()
    
    // Check for duplicates
    if (users.some(u => u.username === userData.username)) {
      return false
    }
    if (users.some(u => u.email === userData.email)) {
      return false
    }

    // Add new user
    users.push({
      ...userData,
      createdAt: new Date().toISOString()
    })
    
    localStorage.setItem('users', JSON.stringify(users))
    return true
  }
}


