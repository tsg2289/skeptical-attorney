import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Mock Supabase server client for fallback when Supabase is not configured
function createMockServerClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          order: (column: string, options?: { ascending?: boolean }) => ({
            then: (callback: any) => callback({ data: [], error: null }),
          }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        order: (column: string, options?: { ascending?: boolean }) => ({
          then: (callback: any) => callback({ data: [], error: null }),
        }),
        then: (callback: any) => callback({ data: [], error: null }),
      }),
      insert: (values: any) => ({
        select: (columns?: string) => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: (callback: any) => callback({ data: null, error: null }),
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

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if Supabase is properly configured
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseAnonKey.includes('placeholder') ||
      supabaseUrl.includes('your-project-id')) {
    // Return mock client if Supabase is not configured
    return createMockServerClient();
  }

  const cookieStore = await cookies()

  // Create real Supabase server client
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
