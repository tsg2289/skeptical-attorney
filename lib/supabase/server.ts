// Mock Supabase server client - always uses mock for demo mode
// This allows the app to work without a Supabase instance
function createMockServerClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
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
  // Always return mock client - app uses localStorage/demo mode for data persistence
  return createMockServerClient();
}

