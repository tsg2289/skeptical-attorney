import { createBrowserClient } from '@supabase/ssr'

// Mock Supabase client for fallback when Supabase is not configured
function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signInWithOtp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      refreshSession: async () => ({ data: { session: null }, error: null }),
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          order: (column: string, options?: { ascending?: boolean }) => ({
            then: (callback: any) => callback({ data: [], error: null }),
          }),
          single: () => ({
            then: (callback: any) => callback({ data: null, error: null }),
          }),
        }),
        order: (column: string, options?: { ascending?: boolean }) => ({
          then: (callback: any) => callback({ data: [], error: null }),
        }),
        then: (callback: any) => callback({ data: [], error: null }),
      }),
      insert: (values: any[]) => ({
        select: (columns?: string) => ({
          single: () => ({
            then: (callback: any) => callback({ data: null, error: { message: 'Supabase not configured - use demo mode' } }),
          }),
          then: (callback: any) => callback({ data: null, error: { message: 'Supabase not configured - use demo mode' } }),
        }),
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          then: (callback: any) => callback({ data: null, error: { message: 'Supabase not configured - use demo mode' } }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: (callback: any) => callback({ data: null, error: { message: 'Supabase not configured - use demo mode' } }),
        }),
      }),
    }),
    rpc: (functionName: string, params?: any) => {
      return Promise.resolve({ 
        data: null, 
        error: null 
      });
    },
  } as any;
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if Supabase is properly configured
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseAnonKey.includes('placeholder') ||
      supabaseUrl.includes('your-project-id')) {
    // Return mock client if Supabase is not configured
    return createMockClient();
  }

  // Create real Supabase client
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
