'use client';

/**
 * Discovery Responses Page
 * 
 * Main page for responding to received discovery (Interrogatories, RFP, RFA)
 * Upload propounded discovery, generate objections and responses
 * 
 * Security: Client-side with server-side API protection
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import { DiscoveryResponseGenerator } from './components/DiscoveryResponseGenerator';
import { createClient } from '@/lib/supabase/client';

// Types from caseStorage
interface Attorney {
  name: string;
  barNumber: string;
  firmName: string;
  address: string;
  phone: string;
  email: string;
}

interface Party {
  name: string;
  type: string;
  role?: string;
}

interface CaseData {
  id: string;
  case_name: string;
  case_number: string;
  court_name?: string;
  case_type?: string;
  case_description?: string;
  plaintiffs?: Party[];
  defendants?: Party[];
  attorneys?: Attorney[];
  discovery_responses?: Record<string, unknown>;
}

export default function DiscoveryResponsesPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch case data on mount
  const fetchCaseData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error: fetchError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();
      
      if (fetchError) throw fetchError;
      setCaseData(data);
    } catch (err) {
      console.error('Error fetching case:', err);
      setError('Failed to load case data');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCaseData();
  }, [fetchCaseData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-200">Loading case data...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 font-semibold mb-2">Error</h2>
          <p className="text-red-300">{error || 'Case not found'}</p>
          <Link
            href={`/dashboard/cases/${caseId}/discovery`}
            className="mt-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/cases/${caseId}/discovery`}
                className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Discovery Hub</span>
              </Link>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">
                  Respond to Discovery
                </h1>
              </div>
            </div>
            
            {/* Security indicator */}
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>SOC2 Compliant</span>
            </div>
          </div>
          
          {/* Case info */}
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
            <span>{caseData.case_name}</span>
            {caseData.case_number && (
              <>
                <span>•</span>
                <span>Case No. {caseData.case_number}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Security notice */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-200">
              <strong>Secure Processing:</strong> All data is anonymized before AI processing 
              and de-anonymized afterward. Your client information is never sent to third-party APIs.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <DiscoveryResponseGenerator 
          caseData={caseData}
          onSave={fetchCaseData}
        />
      </main>
    </div>
  );
}


