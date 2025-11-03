"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDevData } from '../contexts/DevDataContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Matter {
  id: string;
  case_name: string;
  case_number: string;
  description?: string;
  created_at: string;
  archived?: boolean;
  archived_at?: string;
}

const DashboardPage = React.memo(function DashboardPage() {
  const { user } = useAuth();
  const devData = useDevData();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');
  const [matterList, setMattersList] = useState<Matter[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasSupabaseConfig = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const isDemoMode = isDevelopment && !hasSupabaseConfig;

  const loadMatters = useCallback(async () => {
    // Use demo mode if Supabase is not configured
    if (isDemoMode) {
      const devMatters = await devData.getMatters();
      setMattersList(devMatters);
      setLoading(false);
      return;
    }

    // Don't load matters if user is not authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    // Check if we're actually in demo mode (supabase client is mock)
    // If mock client is being used, fall back to demo mode
    try {
      const { data, error } = await supabase
        .from('matter')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // If error indicates Supabase not configured, fall back to demo mode
      if (error && error.message?.includes('Supabase not configured')) {
        const devMatters = await devData.getMatters();
        setMattersList(devMatters);
        setLoading(false);
        return;
      }

      if (error) {
        console.error('Error loading matter:', error);
      } else {
        setMattersList(data || []);
      }
    } catch (err) {
      console.error('Error loading matter:', err);
      // Fall back to demo mode if Supabase fails
      const devMatters = await devData.getMatters();
      setMattersList(devMatters);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode, devData, supabase]);

  const handleArchiveMatter = useCallback(async (matterId: string) => {
    if (!confirm('Are you sure you want to archive this matter? You can restore it later from the archived section.')) {
      return;
    }

    // Use demo mode if Supabase is not configured
    if (isDemoMode) {
      setMattersList(prev => prev.map(matter => 
        matter.id === matterId 
          ? { ...matter, archived: true, archived_at: new Date().toISOString() }
          : matter
      ));
      // Also update localStorage
      const stored = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('demo_matters') || '[]') : [];
      const updated = stored.map((m: Matter) => 
        m.id === matterId 
          ? { ...m, archived: true, archived_at: new Date().toISOString() }
          : m
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_matters', JSON.stringify(updated));
      }
      return;
    }

    // Don't archive matter if user is not authenticated
    if (!user) {
      alert('Please log in to archive matters');
      return;
    }

    try {
      const { error } = await supabase
        .from('matter')
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', matterId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error archiving matter:', error);
        alert(`Error archiving matter: ${error.message}`);
      } else {
        setMattersList(prev => prev.map(matter => 
          matter.id === matterId 
            ? { ...matter, archived: true, archived_at: new Date().toISOString() }
            : matter
        ));
      }
    } catch (err) {
      console.error('Error archiving matter:', err);
      alert('Error archiving matter');
    }
  }, [user, isDemoMode, supabase]);

  const handleRestoreMatter = useCallback(async (matterId: string) => {
    if (!confirm('Are you sure you want to restore this matter?')) {
      return;
    }

    // Use demo mode if Supabase is not configured
    if (isDemoMode) {
      setMattersList(prev => prev.map(matter => 
        matter.id === matterId 
          ? { ...matter, archived: false, archived_at: undefined }
          : matter
      ));
      // Also update localStorage
      const stored = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('demo_matters') || '[]') : [];
      const updated = stored.map((m: Matter) => 
        m.id === matterId 
          ? { ...m, archived: false, archived_at: undefined }
          : m
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_matters', JSON.stringify(updated));
      }
      return;
    }

    // Don't restore matter if user is not authenticated
    if (!user) {
      alert('Please log in to restore matters');
      return;
    }

    try {
      const { error } = await supabase
        .from('matter')
        .update({ 
          archived: false, 
          archived_at: null 
        })
        .eq('id', matterId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error restoring matter:', error);
        alert(`Error restoring matter: ${error.message}`);
      } else {
        setMattersList(prev => prev.map(matter => 
          matter.id === matterId 
            ? { ...matter, archived: false, archived_at: undefined }
            : matter
        ));
      }
    } catch (err) {
      console.error('Error restoring matter:', err);
      alert('Error restoring matter');
    }
  }, [user, isDemoMode, supabase]);

  useEffect(() => {
    if (user || isDemoMode) {
      loadMatters();
    }
  }, [loadMatters, user, isDemoMode]);

  const activeMatters = matterList.filter(matter => !matter.archived);
  const archivedMatters = matterList.filter(matter => matter.archived);

  const handleAddMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caseName.trim() || !caseNumber.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Use demo mode if Supabase is not configured
    if (isDemoMode) {
      const newMatter = {
        id: 'dev-matter-' + Date.now(),
        case_name: caseName,
        case_number: caseNumber,
        description,
        created_at: new Date().toISOString(),
        archived: false
      };
      devData.addMatter(newMatter);
      setMattersList(prev => [newMatter, ...prev]);
      setCaseName('');
      setCaseNumber('');
      setDescription('');
      setIsSubmitting(false);
      return;
    }

    // Don't add matter if user is not authenticated
    if (!user) {
      alert('Please log in to add matters');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('matter')
        .insert([
          {
            case_name: caseName,
            case_number: caseNumber,
            description,
            user_id: user.id,
            created_at: new Date().toISOString(),
            archived: false
          }
        ])
        .select('*');

      if (error) {
        console.error('Error adding matter:', error);
        alert(`Error adding matter: ${error.message}`);
      } else {
        if (data && data.length > 0) {
          setMattersList(prev => [data[0], ...prev]);
          setCaseName('');
          setCaseNumber('');
          setDescription('');
        }
      }
    } catch (err) {
      console.error('Error adding matter:', err);
      alert('Error adding matter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSampleData = async () => {
    if (!isDemoMode && !user) {
      alert('Please log in to create sample data');
      return;
    }

    if (!confirm('This will create a sample matter with a deposition and outline questions. Continue?')) {
      return;
    }

    setIsCreatingSample(true);

    try {
      // Create sample matter
      const matterData = {
        case_name: 'Personal Injury Case - Smith v. Johnson',
        case_number: `PI-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        description: 'Motor vehicle accident case involving a rear-end collision on Highway 101. Seeking damages for medical expenses, lost wages, and pain and suffering.',
        user_id: user?.id || undefined,
        created_at: new Date().toISOString(),
        archived: false
      };

      let matterId: string;

      if (isDemoMode) {
        // Create mock matter and persist to localStorage
        const newMatter = {
          id: 'dev-matter-' + Date.now(),
          ...matterData,
        };
        devData.addMatter(newMatter);
        setMattersList(prev => [newMatter, ...prev]);
        matterId = newMatter.id;
      } else {
        // Create real matter in database
        const { data: matter, error: matterError } = await supabase
          .from('matter')
          .insert([matterData])
          .select('*')
          .single();

        if (matterError || !matter) {
          console.error('Error creating matter:', matterError);
          alert(`Error creating matter: ${matterError?.message || 'Unknown error'}`);
          return;
        }

        setMattersList(prev => [matter, ...prev]);
        matterId = matter.id;
      }

      // Create sample deposition
      const depositionDate = new Date();
      depositionDate.setDate(depositionDate.getDate() + 30); // 30 days from now

      const depositionData = {
        matter_id: matterId,
        deponent_name: 'John Smith',
        deponent_role: 'Plaintiff',
        deposition_date: depositionDate.toISOString().split('T')[0],
        taking_attorney: 'Attorney Jane Wilson',
        defending_attorney: 'Attorney Robert Martinez',
        court_reporter: 'Court Reporter Sarah Johnson',
      };

      let depositionId: string;

      if (isDemoMode) {
        // Create mock deposition and persist to localStorage
        const newDeposition: any = {
          id: 'dev-depo-' + Date.now(),
          title: `Deposition of ${depositionData.deponent_name}`,
          ...depositionData,
          created_at: new Date().toISOString(),
        };
        
        devData.addDeposition(newDeposition);
        depositionId = newDeposition.id;

        // Create sample outline questions and persist
        const sampleQuestions = [
          { text: 'Please state and spell your full name for the record.', order: 1, category: 'Introduction', is_asked: false },
          { text: 'What is your current address?', order: 2, category: 'Introduction', is_asked: false },
          { text: 'What is your date of birth?', order: 3, category: 'Introduction', is_asked: false },
          { text: 'What is your occupation?', order: 4, category: 'Introduction', is_asked: false },
          { text: 'Can you describe what happened on the date of the accident?', order: 5, category: 'Incident', is_asked: false },
          { text: 'What time did the accident occur?', order: 6, category: 'Incident', is_asked: false },
          { text: 'Where exactly did the accident take place?', order: 7, category: 'Incident', is_asked: false },
          { text: 'What were the weather conditions at the time?', order: 8, category: 'Incident', is_asked: false },
          { text: 'Who else was present at the scene?', order: 9, category: 'Incident', is_asked: false },
          { text: 'Did you seek medical treatment after the accident?', order: 10, category: 'Damages', is_asked: false },
          { text: 'What medical providers have you seen?', order: 11, category: 'Damages', is_asked: false },
          { text: 'Have you missed any work due to your injuries?', order: 12, category: 'Damages', is_asked: false },
        ];

        devData.addDepositionQuestions(depositionId, sampleQuestions);
        
        alert('✅ Sample data created successfully!\n\n- Matter: Personal Injury Case - Smith v. Johnson\n- Deposition: John Smith (Plaintiff)\n- 12 outline questions added');
        setIsCreatingSample(false);
        return;
      } else {
        // Create real deposition
        const { data: deposition, error: depError } = await supabase
          .from('deposition')
          .insert([depositionData])
          .select('*')
          .single();

        if (depError || !deposition) {
          console.error('Error creating deposition:', depError);
          alert(`Matter created, but error creating deposition: ${depError?.message || 'Unknown error'}`);
          return;
        }

        depositionId = deposition.id;

        // Create sample outline questions
        const sampleQuestions = [
          { text: 'Please state and spell your full name for the record.', order: 1, category: 'Introduction' },
          { text: 'What is your current address?', order: 2, category: 'Introduction' },
          { text: 'What is your date of birth?', order: 3, category: 'Introduction' },
          { text: 'What is your occupation?', order: 4, category: 'Introduction' },
          { text: 'Can you describe what happened on the date of the accident?', order: 5, category: 'Incident' },
          { text: 'What time did the accident occur?', order: 6, category: 'Incident' },
          { text: 'Where exactly did the accident take place?', order: 7, category: 'Incident' },
          { text: 'What were the weather conditions at the time?', order: 8, category: 'Incident' },
          { text: 'Who else was present at the scene?', order: 9, category: 'Incident' },
          { text: 'Did you seek medical treatment after the accident?', order: 10, category: 'Damages' },
          { text: 'What medical providers have you seen?', order: 11, category: 'Damages' },
          { text: 'Have you missed any work due to your injuries?', order: 12, category: 'Damages' },
        ];

        const questionsData = sampleQuestions.map(q => ({
          deposition_id: depositionId,
          question_text: q.text,
          question_order: q.order,
          category: q.category,
          is_asked: false,
        }));

        const { error: questionsError } = await supabase
          .from('deposition_question')
          .insert(questionsData);

        if (questionsError) {
          console.error('Error creating questions:', questionsError);
          alert(`Matter and deposition created, but error creating questions: ${questionsError.message}`);
          return;
        }
      }

      alert('✅ Sample data created successfully!\n\n- Matter: Personal Injury Case - Smith v. Johnson\n- Deposition: John Smith (Plaintiff)\n- 12 outline questions added');
      
    } catch (err) {
      console.error('Error creating sample data:', err);
      alert(`Error creating sample data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreatingSample(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/20"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-400/15 rounded-full blur-3xl apple-float" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-blue-400/10 rounded-full blur-2xl apple-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-48 h-48 bg-gradient-to-br from-blue-400/8 to-cyan-400/8 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="apple-title text-5xl mb-12">Dashboard</h1>
          
          {/* Add Matter Form */}
          <div className="glass-float p-10 mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="apple-subtitle text-3xl">Add New Matter</h2>
              <button
                type="button"
                onClick={handleCreateSampleData}
                disabled={isCreatingSample}
                className="glass-button px-6 py-3 text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed apple-focus group border border-blue-400/30 hover:border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 text-gray-800 hover:text-gray-900"
                title="Create sample matter, deposition, and outline questions for demonstration"
              >
                <span className="group-hover:scale-105 transition-transform duration-300">
                  {isCreatingSample ? '⏳ Creating...' : '✨ Create Sample Data'}
                </span>
              </button>
            </div>
            <form onSubmit={handleAddMatter} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="caseName" className="block apple-body text-lg mb-3 font-medium">
                    Case Name
                  </label>
                  <input
                    type="text"
                    id="caseName"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="glass-input w-full px-6 py-4 text-lg apple-body apple-focus"
                    placeholder="Enter case name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="caseNumber" className="block apple-body text-lg mb-3 font-medium">
                    Case Number
                  </label>
                  <input
                    type="text"
                    id="caseNumber"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    className="glass-input w-full px-6 py-4 text-lg apple-body apple-focus"
                    placeholder="Enter case number"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block apple-body text-lg mb-3 font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="glass-input w-full px-6 py-4 text-lg apple-body apple-focus resize-none"
                  placeholder="Enter case description (optional)"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button px-10 py-4 text-lg font-medium rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed apple-focus group text-gray-800 hover:text-gray-900"
                >
                  <span className="group-hover:scale-105 transition-transform duration-300">
                    {isSubmitting ? 'Adding...' : 'Add Matter'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Matters List */}
          <div className="glass-float">
            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
              <h2 className="apple-subtitle text-3xl">Your Matters</h2>
              {archivedMatters.length > 0 && (
                <button 
                  onClick={() => setShowArchived(!showArchived)}
                  className="glass-button px-6 py-3 text-blue-400 hover:text-blue-300 text-base font-medium rounded-xl apple-focus group/btn hover:bg-blue-500/10 transition-all duration-300"
                >
                  <span className="group-hover/btn:scale-105 transition-transform duration-300">
                    📁 {showArchived ? 'Hide' : 'Show'} Archived ({archivedMatters.length})
                  </span>
                </button>
              )}
            </div>
            <div className="divide-y divide-white/5">
              {activeMatters.length === 0 ? (
                <div className="px-10 py-16 text-center">
                  <div className="text-8xl mb-6 apple-float">📋</div>
                  <p className="apple-body text-xl">No matters found. Add your first matter above.</p>
                </div>
              ) : (
                activeMatters.map((matter) => (
                  <div key={matter.id} className="px-10 py-8 hover:bg-white/5 transition-all duration-500 group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="apple-subtitle text-2xl group-hover:text-blue-600 transition-colors duration-300 mb-2">
                          {matter.case_name}
                        </h3>
                        <p className="apple-caption text-lg mb-2">Case #: {matter.case_number}</p>
                        {matter.description && (
                          <p className="apple-caption text-base mt-3 line-clamp-2">{matter.description}</p>
                        )}
                        <p className="apple-caption text-sm mt-4">
                          Created: {new Date(matter.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-4 ml-8">
                        <Link
                          href={`/services/deposition/depositions/${matter.id}`}
                          className="glass-button px-8 py-3 text-white text-base font-medium rounded-xl apple-focus group/btn"
                        >
                          <span className="group-hover/btn:scale-105 transition-transform duration-300">
                            View Matter
                          </span>
                        </Link>
                        <button 
                          onClick={() => handleArchiveMatter(matter.id)}
                          className="glass-button px-4 py-3 text-orange-400 hover:text-orange-300 text-base font-medium rounded-xl apple-focus group/btn hover:bg-orange-500/10 transition-all duration-300" 
                          title="Archive matter"
                        >
                          <span className="group-hover/btn:scale-105 transition-transform duration-300">
                            📦
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Archived Matters Section */}
          {showArchived && archivedMatters.length > 0 && (
            <div className="glass-float mt-8">
              <div className="px-10 py-8 border-b border-white/10">
                <h2 className="apple-subtitle text-3xl text-orange-400">Archived Matters</h2>
                <p className="apple-caption text-lg mt-2">Matters you&apos;ve archived. Click restore to bring them back to your active matters.</p>
              </div>
              <div className="divide-y divide-white/5">
                {archivedMatters.map((matter) => (
                  <div key={matter.id} className="px-10 py-8 hover:bg-white/5 transition-all duration-500 group opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="apple-subtitle text-2xl group-hover:text-blue-600 transition-colors duration-300 mb-2">
                          {matter.case_name}
                        </h3>
                        <p className="apple-caption text-lg mb-2">Case #: {matter.case_number}</p>
                        {matter.description && (
                          <p className="apple-caption text-base mt-3 line-clamp-2">{matter.description}</p>
                        )}
                        <p className="apple-caption text-sm mt-4">
                          Created: {new Date(matter.created_at).toLocaleDateString()}
                          {matter.archived_at && (
                            <span className="ml-4 text-orange-400">
                              • Archived: {new Date(matter.archived_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex space-x-4 ml-8">
                        <button 
                          onClick={() => handleRestoreMatter(matter.id)}
                          className="glass-button px-6 py-3 text-green-400 hover:text-green-300 text-base font-medium rounded-xl apple-focus group/btn hover:bg-green-500/10 transition-all duration-300" 
                          title="Restore matter"
                        >
                          <span className="group-hover/btn:scale-105 transition-transform duration-300">
                            ↶ Restore
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DashboardPage;