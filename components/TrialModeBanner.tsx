'use client';

import Link from 'next/link';
import { useTrialMode } from '@/lib/contexts/TrialModeContext';

export default function TrialModeBanner() {
  const { isTrialMode, loading } = useTrialMode();

  if (loading || !isTrialMode) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
          }} 
        />
      </div>
      
      <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10 flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl animate-pulse">🧪</span>
          <div>
            <p className="font-bold text-lg">Trial Mode Active</p>
            <p className="text-sm text-amber-100">
              You&apos;re testing the application. Your work is saved temporarily in your browser.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline text-sm text-amber-100">
            Sign up to save your work permanently
          </span>
          <Link
            href="/login"
            className="bg-white text-orange-600 px-5 py-2 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 text-sm whitespace-nowrap"
          >
            Sign Up Free →
          </Link>
        </div>
      </div>
    </div>
  );
}
