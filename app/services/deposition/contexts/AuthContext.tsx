"use client";
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Dev mode functions
  isDevBypassEnabled: boolean;
  toggleDevBypass: () => void;
  enableDevBypass: () => void;
  disableDevBypass: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [, setLastRefreshTime] = useState(0);
  const [devBypassEnabled, setDevBypassEnabled] = useState(false);
  const router = useRouter();
  const initializationRef = useRef(false);
  
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);
  
  // Memoize these values to prevent unnecessary recalculations
  const isDevelopment = useMemo(() => process.env.NODE_ENV === 'development', []);
  const hasSupabaseConfig = useMemo(() => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), []);
  
  // Memoize shouldBypassAuth to prevent dependency changes
  const shouldBypassAuth = useMemo(() => 
    isDevelopment && (
      process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' || 
      devBypassEnabled ||
      !hasSupabaseConfig
    ),
    [isDevelopment, devBypassEnabled, hasSupabaseConfig]
  );

  // Initialize auth state - only run once on mount
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;
    
    let mounted = true;
    let subscription: any = null;

    const initializeAuth = async () => {
      try {
        // Check bypass status at initialization time
        const bypass = isDevelopment && (
          process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' || 
          devBypassEnabled ||
          !hasSupabaseConfig
        );
        
        // If dev bypass is enabled, create a mock user
        if (bypass) {
          const mockUser: User = {
            id: process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user-123',
            email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@example.com',
            user_metadata: {
              full_name: process.env.NEXT_PUBLIC_DEV_USER_NAME || 'Dev User'
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            role: 'authenticated',
            phone: '',
            confirmed_at: new Date().toISOString(),
            recovery_sent_at: undefined,
            new_email: undefined,
            invited_at: undefined,
            action_link: undefined,
            email_change_sent_at: undefined,
            new_phone: undefined,
            is_sso_user: false,
            deleted_at: undefined,
            is_anonymous: false,
            identities: []
          };
          
          const mockSession: Session = {
            access_token: 'dev-mock-token',
            refresh_token: 'dev-mock-refresh-token',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: mockUser
          };
          
          if (mounted) {
            setUser(mockUser);
            setSession(mockSession);
            setLoading(false);
            setInitialized(true);
            console.log('🔧 Dev mode: Authentication bypassed with mock user');
          }
        } else {
          // Try to get session, but gracefully handle if Supabase is not configured
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error && hasSupabaseConfig) {
              console.error('Error getting session:', error);
            } else if (session) {
              if (mounted) {
                setSession(session);
                setUser(session.user);
              }
            }
            
            // Listen for auth changes
            const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
              async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_IN' && session) {
                  setSession(session);
                  setUser(session.user);
                  setLastRefreshTime(Date.now());
                } else if (event === 'SIGNED_OUT') {
                  setSession(null);
                  setUser(null);
                  setLastRefreshTime(0);
                }
                
                setLoading(false);
                setInitialized(true);
              }
            );
            subscription = sub;
          } catch (err) {
            // If Supabase is not configured, just continue without auth
            if (hasSupabaseConfig) {
              console.error('Auth initialization error:', err);
            }
          } finally {
            if (mounted) {
              setLoading(false);
              setInitialized(true);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
      initializationRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Smart session refresh - only when needed
  useEffect(() => {
    if (!initialized || !session || shouldBypassAuth) return;

    const refreshSession = async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Session refresh error:', error);
        } else if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLastRefreshTime(Date.now());
        }
      } catch (err) {
        console.error('Session refresh error:', err);
      }
    };

    // Refresh session every 30 minutes
    const interval = setInterval(refreshSession, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [initialized, session, shouldBypassAuth]); // Removed supabase.auth from dependencies

  const signOut = async () => {
    try {
      if (shouldBypassAuth) {
        // In dev bypass mode, just clear the state
        setUser(null);
        setSession(null);
        setLastRefreshTime(0);
        console.log('🔧 Dev mode: Signed out (bypassed)');
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      router.push('/services/deposition/login');
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  };

  // Dev bypass functions
  const toggleDevBypass = () => {
    setDevBypassEnabled(!devBypassEnabled);
  };

  const enableDevBypass = () => {
    setDevBypassEnabled(true);
  };

  const disableDevBypass = () => {
    setDevBypassEnabled(false);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isDevBypassEnabled: shouldBypassAuth,
    toggleDevBypass,
    enableDevBypass,
    disableDevBypass
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

