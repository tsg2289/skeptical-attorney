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
import { ArrowLeft, Shield, FileText, Edit2 } from 'lucide-react';
import { DiscoveryResponseGenerator } from './components/DiscoveryResponseGenerator';
import { createClient } from '@/lib/supabase/client';
import { useTrialMode } from '@/lib/contexts/TrialModeContext';
import { CaseFrontend } from '@/lib/supabase/caseStorage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TrialModeBanner from '@/components/TrialModeBanner';
import toast, { Toaster } from 'react-hot-toast';

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
  const { isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId, loadFromTrial, saveToTrial } = useTrialMode();
  
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Trial mode case editing state
  const [isEditingTrialCase, setIsEditingTrialCase] = useState(false);
  const [trialCaseForm, setTrialCaseForm] = useState({
    caseName: '',
    caseNumber: '',
    court: '',
    plaintiffName: '',
    defendantName: '',
  });

  // Fetch case data on mount
  const fetchCaseData = useCallback(async () => {
    if (!caseId) {
      setLoading(false);
      return;
    }

    // Check if this is a trial case ID when in trial mode
    if (isTrialMode) {
      if (!isTrialCaseId(caseId)) {
        console.warn('[SECURITY] Attempted to access real case ID in trial mode - blocked');
        setError('Invalid case access');
        setLoading(false);
        return;
      }
      
      // Load from session storage for trial mode
      const savedTrialCase = loadFromTrial<CaseFrontend | null>('trial-case-data', null);
      if (savedTrialCase) {
        // Convert CaseFrontend to CaseData format
        setCaseData({
          id: savedTrialCase.id,
          case_name: savedTrialCase.caseName,
          case_number: savedTrialCase.caseNumber || '',
          court_name: savedTrialCase.court,
          case_type: savedTrialCase.caseType,
          case_description: savedTrialCase.description,
          plaintiffs: savedTrialCase.plaintiffs?.map(p => ({ name: p.name, type: p.type })),
          defendants: savedTrialCase.defendants?.map(d => ({ name: d.name, type: d.type })),
        });
      }
      setLoading(false);
      return;
    }

    // Authenticated mode - load from database
    if (canAccessDatabase()) {
      try {
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
      }
    }
    setLoading(false);
  }, [caseId, isTrialMode, canAccessDatabase, isTrialCaseId, loadFromTrial]);

  useEffect(() => {
    fetchCaseData();
  }, [fetchCaseData]);

  // Save trial case data to session storage
  const handleSaveTrialCase = () => {
    if (!trialCaseForm.caseName.trim()) {
      toast.error('Please enter a case name');
      return;
    }
    
    const newCase: CaseFrontend = {
      id: trialCaseId,
      caseName: trialCaseForm.caseName.trim(),
      caseNumber: trialCaseForm.caseNumber.trim() || undefined,
      court: trialCaseForm.court.trim() || undefined,
      plaintiffs: trialCaseForm.plaintiffName.trim() 
        ? [{ id: 'trial-p-1', name: trialCaseForm.plaintiffName.trim(), type: 'individual' as const }] 
        : [],
      defendants: trialCaseForm.defendantName.trim() 
        ? [{ id: 'trial-d-1', name: trialCaseForm.defendantName.trim(), type: 'individual' as const }] 
        : [],
      deadlines: [],
      createdAt: new Date().toISOString(),
      userId: 'trial-user',
    };
    
    saveToTrial('trial-case-data', newCase);
    setCaseData({
      id: newCase.id,
      case_name: newCase.caseName,
      case_number: newCase.caseNumber || '',
      court_name: newCase.court,
      plaintiffs: newCase.plaintiffs?.map(p => ({ name: p.name, type: p.type })),
      defendants: newCase.defendants?.map(d => ({ name: d.name, type: d.type })),
    });
    setIsEditingTrialCase(false);
    toast.success('Case information saved!');
  };

  // Start editing trial case
  const handleEditTrialCase = () => {
    if (caseData) {
      setTrialCaseForm({
        caseName: caseData.case_name || '',
        caseNumber: caseData.case_number || '',
        court: caseData.court_name || '',
        plaintiffName: caseData.plaintiffs?.[0]?.name || '',
        defendantName: caseData.defendants?.[0]?.name || '',
      });
    }
    setIsEditingTrialCase(true);
  };

  // Get the effective case ID for links
  const effectiveCaseId = isTrialMode ? trialCaseId : caseId;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Header />
        <TrialModeBanner />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-200">Loading case data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Trial mode - show case input form if no case data
  if (isTrialMode && (!caseData || isEditingTrialCase)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Header />
        <TrialModeBanner />
        <Toaster position="top-right" />
        
        <section className="py-12">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-lg border border-slate-700 p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📋</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isEditingTrialCase ? 'Edit Case Information' : 'Enter Your Case Information'}
                </h2>
                <p className="text-slate-300">
                  Your data is saved in your browser only and will be cleared when you close the browser.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Case Name *</label>
                  <input
                    type="text"
                    value={trialCaseForm.caseName}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, caseName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder="e.g., Smith v. ABC Corporation"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Case Number</label>
                  <input
                    type="text"
                    value={trialCaseForm.caseNumber}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, caseNumber: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder="e.g., 24STCV12345"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Court/County</label>
                  <input
                    type="text"
                    value={trialCaseForm.court}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, court: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder="e.g., Los Angeles"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Plaintiff Name</label>
                  <input
                    type="text"
                    value={trialCaseForm.plaintiffName}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, plaintiffName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder="e.g., John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Defendant Name</label>
                  <input
                    type="text"
                    value={trialCaseForm.defendantName}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, defendantName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    placeholder="e.g., ABC Corporation"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveTrialCase}
                    disabled={!trialCaseForm.caseName.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditingTrialCase ? 'Save Changes' : 'Continue to Discovery Responses'}
                  </button>
                  {isEditingTrialCase && (
                    <button
                      onClick={() => setIsEditingTrialCase(false)}
                      className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-slate-400 text-center mt-6">
                <Link href="/login" className="text-blue-400 hover:underline">Sign up</Link> to save your work permanently across sessions.
              </p>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Header />
        <TrialModeBanner />
        <div className="flex items-center justify-center h-64">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
            <h2 className="text-red-400 font-semibold mb-2">Error</h2>
            <p className="text-red-300">{error || 'Case not found'}</p>
            <Link
              href={`/dashboard/cases/${effectiveCaseId}/discovery`}
              className="mt-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discovery
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <TrialModeBanner />
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/cases/${effectiveCaseId}/discovery`}
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
            
            <div className="flex items-center gap-4">
              {/* Edit case button for trial mode */}
              {isTrialMode && (
                <button
                  onClick={handleEditTrialCase}
                  className="flex items-center gap-1 text-amber-300 hover:text-amber-200 text-sm bg-amber-500/20 px-3 py-1.5 rounded-lg"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Case
                </button>
              )}
              
              {/* Security indicator */}
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>SOC2 Compliant</span>
              </div>
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
            {isTrialMode && (
              <span className="text-amber-400 text-xs">(Trial Mode)</span>
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
              <strong>Secure Processing:</strong> {isTrialMode 
                ? 'Your data is saved in your browser only (session storage). Sign up to save permanently and enable AI features.'
                : 'All data is anonymized before AI processing and de-anonymized afterward. Your client information is never sent to third-party APIs.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <DiscoveryResponseGenerator 
          caseData={caseData}
          onSave={fetchCaseData}
          isTrialMode={isTrialMode}
        />
      </main>
    </div>
  );
}
