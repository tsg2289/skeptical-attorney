"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { useDevData } from '../../contexts/DevDataContext';
import FastDepositionOutlineWithDatabase from '../../components/FastDepositionOutlineWithDatabase';

interface Deposition {
  id: string;
  title: string;
  deponent_name: string;
  deponent_role: string;
  deposition_date: string;
  taking_attorney?: string;
  defending_attorney?: string;
  court_reporter?: string;
  case_id: string;
  created_at: string;
}

const OutlinePage = React.memo(function OutlinePage() {
  const params = useParams();
  const depositionId = params?.depositionId as string;
  const [deposition, setDeposition] = useState<Deposition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { user } = useAuth();
  const devData = useDevData();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasSupabaseConfig = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const isDemoMode = isDevelopment && !hasSupabaseConfig;
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // Format time helper function
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Timer control functions
  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setElapsedTime(0);
  }, []);

  useEffect(() => {
    const loadDeposition = async () => {
      if (!depositionId) return;

      try {
        // Always try to load from dev data first for dev-deposition IDs
        if (depositionId.startsWith('dev-deposition-')) {
          const depositionData = await devData.getDeposition(depositionId);
          if (depositionData) {
            setDeposition(depositionData);
          } else {
            // Create a mock deposition so the page still works
            const mockDeposition: Deposition = {
              id: depositionId,
              title: `Deposition ${depositionId.substring(0, 20)}...`,
              deponent_name: 'Unknown Deponent',
              deponent_role: 'Unknown',
              deposition_date: new Date().toISOString().split('T')[0],
              case_id: 'unknown',
              created_at: new Date().toISOString()
            };
            setDeposition(mockDeposition);
          }
          setLoading(false);
          return;
        }

        // Handle demo mode
        if (isDemoMode) {
          const depositionData = await devData.getDeposition(depositionId);
          if (depositionData) {
            setDeposition(depositionData);
          } else {
            setError('Deposition not found');
          }
          setLoading(false);
          return;
        }

        // Production mode - load from API
        if (!user) {
          setError('Please log in to view depositions');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/depositions/${depositionId}`);
        
        if (!response.ok) {
          // If API fails, try dev data as fallback
          console.warn('API failed, trying dev data fallback');
          const depositionData = await devData.getDeposition(depositionId);
          if (depositionData) {
            setDeposition(depositionData);
          } else {
            if (response.status === 404) {
              setError('Deposition not found');
            } else {
              setError('Error loading deposition');
            }
          }
        } else {
          const data = await response.json();
          setDeposition(data);
        }
      } catch (err) {
        console.warn('Unexpected error:', err);
        // Try dev data as fallback
        const depositionData = await devData.getDeposition(depositionId);
        if (depositionData) {
          setDeposition(depositionData);
        } else {
          setError('Unexpected error loading deposition');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDeposition();
  }, [depositionId, user, supabase, isDemoMode, devData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/20"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="relative z-10 glass-float p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="apple-body text-center mt-4 text-gray-800">Loading deposition...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/20"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
        </div>
        <div className="relative z-10 glass-float p-8 text-center">
          <h1 className="apple-title text-2xl text-red-600 mb-4">Error</h1>
          <p className="apple-body text-gray-700 mb-4">{error}</p>
          <Link href="/services/deposition/dashboard" className="glass-button px-6 py-3 rounded-xl text-gray-800 hover:text-gray-900">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!deposition) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/20"></div>
        </div>
        <div className="relative z-10 glass-float p-8 text-center">
          <h1 className="apple-title text-2xl text-gray-800 mb-4">Deposition Not Found</h1>
          <p className="apple-body text-gray-700 mb-4">The requested deposition could not be found.</p>
          <Link href="/services/deposition/dashboard" className="glass-button px-6 py-3 rounded-xl text-gray-800 hover:text-gray-900">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Apple-style Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/15 via-transparent to-blue-100/15"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-blue-500/10 rounded-full blur-3xl apple-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-48 h-48 bg-gradient-to-br from-blue-500/8 to-cyan-500/8 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="glass-float p-10 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="apple-title text-4xl sm:text-5xl mb-0">{deposition.title}</h1>
              
              {/* Deposition details directly under title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <p className="apple-body text-lg">
                    <strong className="text-blue-600">Deponent Name:</strong> <span className="text-gray-700">{deposition.deponent_name}</span>
                  </p>
                  <p className="apple-body text-lg">
                    <strong className="text-blue-600">Deponent Role:</strong> <span className="text-gray-700">{deposition.deponent_role}</span>
                  </p>
                  <p className="apple-body text-lg">
                    <strong className="text-blue-600">Date:</strong> <span className="text-gray-700">{new Date(deposition.deposition_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  {deposition.taking_attorney && (
                    <p className="apple-body text-lg">
                      <strong className="text-blue-600">Taking Attorney:</strong> <span className="text-gray-700">{deposition.taking_attorney}</span>
                    </p>
                  )}
                  {deposition.defending_attorney && (
                    <p className="apple-body text-lg">
                      <strong className="text-blue-600">Defending Attorney:</strong> <span className="text-gray-700">{deposition.defending_attorney}</span>
                    </p>
                  )}
                  {deposition.court_reporter && (
                    <p className="apple-body text-lg">
                      <strong className="text-blue-600">Court Reporter:</strong> <span className="text-gray-700">{deposition.court_reporter}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-4">
              <Link
                href={`/services/deposition/depositions/${deposition.case_id}`}
                className="glass-button px-6 py-3 rounded-xl text-gray-800 hover:text-gray-900 apple-focus group hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                title="Back to matter"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back to Matter</span>
              </Link>
              
              {/* Timer Widget */}
              <div className="glass-button px-6 py-3 rounded-xl items-center space-x-2 flex">
                <span className={`apple-body text-sm font-mono font-bold ${isTimerRunning ? 'text-blue-600' : 'text-gray-700'}`}>
                  {formatTime(elapsedTime)}
                </span>
                <div className="flex items-center space-x-1">
                  {!isTimerRunning ? (
                    <button
                      onClick={startTimer}
                      className="glass-button w-6 h-6 rounded-full flex items-center justify-center text-gray-800 apple-focus hover:scale-110 transition-all duration-300 bg-blue-500/30 border border-blue-400/50 text-xs"
                      title="Start timer"
                    >
                      ▶
                    </button>
                  ) : (
                    <button
                      onClick={pauseTimer}
                      className="glass-button w-6 h-6 rounded-full flex items-center justify-center text-gray-800 apple-focus hover:scale-110 transition-all duration-300 bg-yellow-500/30 border border-yellow-400/50 text-xs"
                      title="Pause timer"
                    >
                      ⏸
                    </button>
                  )}
                  <button
                    onClick={resetTimer}
                    className="glass-button w-6 h-6 rounded-full flex items-center justify-center text-gray-800 apple-focus hover:scale-110 transition-all duration-300 bg-gray-500/30 border border-gray-400/50 text-xs"
                    title="Reset timer"
                  >
                    ↻
                  </button>
                </div>
              </div>
              
              {/* Share via Email Button */}
              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Deposition Outline: ${deposition.title}`);
                  const body = encodeURIComponent(
                    `Here is the deposition outline for:\n\n` +
                    `Deponent: ${deposition.deponent_name} (${deposition.deponent_role})\n` +
                    `Date: ${new Date(deposition.deposition_date).toLocaleDateString()}\n` +
                    (deposition.taking_attorney ? `Taking Attorney: ${deposition.taking_attorney}\n` : '') +
                    (deposition.defending_attorney ? `Defending Attorney: ${deposition.defending_attorney}\n` : '') +
                    `\nView the full outline here: ${typeof window !== 'undefined' ? window.location.href : ''}`
                  );
                  if (typeof window !== 'undefined') {
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }
                }}
                className="glass-button px-6 py-3 rounded-xl text-gray-800 hover:text-gray-900 apple-focus group hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                title="Share outline via email"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
                <span className="text-sm font-medium">Share via Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Deposition Outline Component */}
        <FastDepositionOutlineWithDatabase depositionId={depositionId} />
      </div>
    </div>
  );
});

export default OutlinePage;

