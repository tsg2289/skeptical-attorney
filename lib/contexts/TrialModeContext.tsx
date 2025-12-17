'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TrialModeContextType {
  isTrialMode: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  trialCaseId: string;
  // Validate if a case ID is safe for trial mode
  isTrialCaseId: (caseId: string | null | undefined) => boolean;
  // Prevent database queries in trial mode
  canAccessDatabase: () => boolean;
  saveToTrial: <T>(key: string, data: T) => void;
  loadFromTrial: <T>(key: string, defaultValue: T) => T;
  clearTrialData: () => void;
}

const TrialModeContext = createContext<TrialModeContextType | undefined>(undefined);

export const useTrialMode = () => {
  const context = useContext(TrialModeContext);
  if (!context) {
    throw new Error('useTrialMode must be used within a TrialModeProvider');
  }
  return context;
};

// Trial case ID prefix - clearly distinguishable from real UUIDs
const TRIAL_CASE_ID_PREFIX = 'trial-';
const TRIAL_CASE_ID = 'trial-demo-case';
const TRIAL_STORAGE_PREFIX = 'skeptical_trial_';

// Regex to match valid UUIDs (real case IDs from Supabase)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SECURITY: Sanitize data to ensure no real user data leaks
// This removes or replaces any UUIDs that could reference real database records
function sanitizeTrialData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // If it's a UUID (real database ID), don't store it
    if (UUID_REGEX.test(data)) {
      return `${TRIAL_CASE_ID_PREFIX}sanitized` as T;
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeTrialData(item)) as T;
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Skip sensitive keys entirely
      if (['user_id', 'userId', 'email', 'password', 'token', 'session'].includes(key)) {
        continue;
      }
      // Sanitize ID fields that contain real UUIDs
      if ((key === 'id' || key.endsWith('Id') || key.endsWith('_id')) && 
          typeof value === 'string' && UUID_REGEX.test(value)) {
        sanitized[key] = `${TRIAL_CASE_ID_PREFIX}${key}`;
      } else {
        sanitized[key] = sanitizeTrialData(value);
      }
    }
    return sanitized as T;
  }
  
  return data;
}

export const TrialModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (err) {
        console.warn('Auth check failed, assuming trial mode');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // SECURITY: Check if a case ID is a trial case ID (not a real database ID)
  const isTrialCaseId = useCallback((caseId: string | null | undefined): boolean => {
    if (!caseId) return false;
    // Trial case IDs always start with "trial-" prefix
    return caseId.startsWith(TRIAL_CASE_ID_PREFIX);
  }, []);

  // SECURITY: Check if database access is allowed
  // In trial mode, we should NEVER access the database
  const canAccessDatabase = useCallback((): boolean => {
    return isAuthenticated && !loading;
  }, [isAuthenticated, loading]);

  // SECURITY: Save to session storage with trial prefix
  // This ensures trial data is isolated from any other storage
  const saveToTrial = useCallback(<T,>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    
    // SECURITY: Never store anything that looks like real user data
    // Sanitize the data before storing (remove any UUIDs that aren't trial IDs)
    try {
      const sanitizedData = sanitizeTrialData(data);
      sessionStorage.setItem(`${TRIAL_STORAGE_PREFIX}${key}`, JSON.stringify(sanitizedData));
    } catch (err) {
      console.warn('Trial storage save failed:', err);
    }
  }, []);

  const loadFromTrial = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = sessionStorage.getItem(`${TRIAL_STORAGE_PREFIX}${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);

  const clearTrialData = useCallback(() => {
    if (typeof window === 'undefined') return;
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(TRIAL_STORAGE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  }, []);

  const isTrialMode = useMemo(() => !isAuthenticated && !loading, [isAuthenticated, loading]);

  return (
    <TrialModeContext.Provider value={{
      isTrialMode,
      isAuthenticated,
      loading,
      trialCaseId: TRIAL_CASE_ID,
      isTrialCaseId,
      canAccessDatabase,
      saveToTrial,
      loadFromTrial,
      clearTrialData,
    }}>
      {children}
    </TrialModeContext.Provider>
  );
};

