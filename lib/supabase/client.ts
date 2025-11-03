// Mock Supabase client - always uses localStorage for data persistence
// This allows the app to work without a Supabase instance
function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
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
      // Always return success - data is saved to localStorage
      // This allows components to work seamlessly with localStorage persistence
      return Promise.resolve({ 
        data: null, 
        error: null 
      });
    },
  } as any;
}

export function createClient() {
  // Always return mock client - app uses localStorage for data persistence
  return createMockClient();
}

