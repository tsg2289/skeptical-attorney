"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { useDevData } from '../../contexts/DevDataContext';
import AddDepositionForm from '../../components/AddDepositionForm';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';

interface Matter {
  id: string;
  case_name: string;
  case_number: string;
  description?: string;
}

interface Deposition {
  id: string;
  title: string;
  deponent_name: string;
  deponent_role: string;
  deposition_date: string;
  taking_attorney: string;
  defending_attorney: string;
  court_reporter: string;
  matter_id: string;
  created_at: string;
}

const DepositionsPage = React.memo(function DepositionsPage() {
  const params = useParams();
  const matterId = params?.matterId as string;
  const { user } = useAuth();
  const devData = useDevData();
  const [matter, setMatter] = useState<Matter | null>(null);
  const [depositions, setDepositions] = useState<Deposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    deposition: Deposition | null;
  }>({ isOpen: false, deposition: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    deposition: Deposition | null;
  }>({ isOpen: false, deposition: null });
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasSupabaseConfig = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const isDemoMode = isDevelopment && !hasSupabaseConfig;

  useEffect(() => {
    const loadData = async () => {
      if (!matterId) return;

      try {
        // Handle development mode for dev matters
        if (isDemoMode || matterId.startsWith('dev-matter-')) {
          // Load matter from dev data
          const matterData = await devData.getMatter(matterId);
          if (matterData) {
            setMatter(matterData);
          } else {
            // Create a mock matter for development
            const mockMatter = {
              id: matterId,
              case_name: `Development Matter ${matterId.split('-')[2] || 'Unknown'}`,
              case_number: `DEV-${matterId.split('-')[2] || '000'}`,
              description: 'Development matter for testing',
            };
            setMatter(mockMatter);
          }
          
          // Load depositions via dev data
          const depositionsData = await devData.getDepositions(matterId);
          setDepositions(depositionsData || []);
          setLoading(false);
          return;
        }
        
        // Production mode - load from Supabase
        if (!user) {
          setError('Please log in to view matters');
          setLoading(false);
          return;
        }

        const { data: matterData, error: matterError } = await supabase
          .from('matter')
          .select('*')
          .eq('id', matterId)
          .eq('user_id', user.id)
          .single();

        if (matterError) {
          setError('Error loading matter: ' + matterError.message);
        } else if (matterData) {
          setMatter(matterData);
        } else {
          setError('Matter not found');
        }

        const depositionsResponse = await fetch(`/api/depositions?matter_id=${matterId}`);
        
        if (!depositionsResponse.ok) {
          const errorData = await depositionsResponse.json();
          setError('Error loading depositions: ' + (errorData.message || 'Unknown error'));
        } else {
          const depositionsData = await depositionsResponse.json();
          setDepositions(depositionsData || []);
        }
      } catch (err) {
        setError('Unexpected error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [matterId, user, supabase, isDemoMode, devData]);

  const handleAddDeposition = async (depositionData: any) => {
    setActionLoading(true);
    try {
      // Dev mode - use dev data
      if (isDemoMode || matterId.startsWith('dev-matter-')) {
        const newDeposition: Deposition = {
          ...depositionData,
          id: 'dev-deposition-' + Date.now(),
          created_at: new Date().toISOString()
        };
        
        devData.addDeposition(newDeposition);
        setDepositions(prev => [newDeposition, ...prev]);
        setShowAddForm(false);
        setError(null);
        setActionLoading(false);
        return;
      }

      // Production mode
      if (!user) {
        setError('Please log in to add depositions');
        setActionLoading(false);
        return;
      }

      const response = await fetch('/api/depositions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(depositionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDepositions(prev => [data, ...prev]);
      setShowAddForm(false);
      setError(null);
    } catch (err) {
      setError('Failed to add deposition: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDeposition = async () => {
    if (!deleteDialog.deposition) return;

    setActionLoading(true);
    try {
      // Dev mode - remove from state and localStorage
      if (isDemoMode || deleteDialog.deposition.id.startsWith('dev-deposition-')) {
        setDepositions(prev => prev.filter(dep => dep.id !== deleteDialog.deposition!.id));
        setDeleteDialog({ isOpen: false, deposition: null });
        setError(null);
        setActionLoading(false);
        return;
      }

      const response = await fetch(`/api/depositions/${deleteDialog.deposition.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setDepositions(prev => prev.filter(dep => dep.id !== deleteDialog.deposition!.id));
      setDeleteDialog({ isOpen: false, deposition: null });
      setError(null);
    } catch (err) {
      setError('Failed to delete deposition: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (deposition: Deposition) => {
    setEditDialog({ isOpen: true, deposition });
  };

  const closeEditDialog = () => {
    setEditDialog({ isOpen: false, deposition: null });
  };

  const handleEditDeposition = async (updatedData: any) => {
    if (!editDialog.deposition) return;
    
    setActionLoading(true);
    try {
      // Dev mode - update in state
      if (isDemoMode || editDialog.deposition.id.startsWith('dev-deposition-')) {
        setDepositions(prev => prev.map(depo => 
          depo.id === editDialog.deposition?.id 
            ? { ...depo, ...updatedData }
            : depo
        ));
        closeEditDialog();
        setError(null);
        setActionLoading(false);
        return;
      }

      // Production mode
      if (!user) {
        setError('Please log in to edit depositions');
        setActionLoading(false);
        return;
      }

      const response = await fetch(`/api/depositions/${editDialog.deposition.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDepositions(prev => prev.map(depo => 
        depo.id === editDialog.deposition?.id ? data : depo
      ));
      closeEditDialog();
      setError(null);
    } catch (err) {
      setError('Failed to update deposition: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (deposition: Deposition) => {
    setDeleteDialog({ isOpen: true, deposition });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, deposition: null });
  };

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
          <p className="apple-body text-center mt-4 text-gray-800">Loading matter...</p>
        </div>
      </div>
    );
  }

  if (error && !matter) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/20"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="relative z-10 glass-float p-8 text-center">
          <h1 className="apple-title text-2xl text-red-600 mb-4">Error</h1>
          <p className="apple-body text-gray-700">{error}</p>
          <Link href="/services/deposition/dashboard" className="glass-button mt-4 inline-block px-6 py-3 rounded-xl text-gray-800 hover:text-gray-900">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/20"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-blue-400/10 rounded-full blur-2xl apple-float" style={{animationDelay: '1.5s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Matter Header */}
        {matter && (
          <div className="glass-float p-8 mb-8">
            <div className="text-center">
              <h1 className="apple-title text-4xl sm:text-5xl mb-4">
                {matter.case_name}
              </h1>
              <p className="apple-subtitle text-xl mb-2">Case #: {matter.case_number}</p>
              {matter.description && (
                <p className="apple-body text-gray-700">{matter.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Depositions Section */}
        <div className="glass-float p-8">
          <div className="text-center mb-8">
            <h2 className="apple-title text-3xl mb-2">Depositions</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="glass-button px-6 py-3 rounded-2xl text-gray-800 font-medium apple-focus group hover:scale-105 transition-all duration-300 mt-4"
            >
              <span className="group-hover:scale-105 transition-transform duration-300 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add New Deposition</span>
              </span>
            </button>
          </div>
          
          <div className="space-y-6">
            {depositions.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="apple-subtitle text-xl mb-2">No Depositions Found</h3>
                <p className="apple-body text-gray-600">No depositions have been created for this matter yet.</p>
              </div>
            ) : (
              depositions.map((deposition) => (
                <div key={deposition.id} className="glass-card p-6 hover:scale-102 transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="apple-subtitle text-xl mb-4 group-hover:text-blue-600 transition-colors duration-300">
                        {deposition.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <p className="apple-body">
                              <span className="text-gray-600">Deponent Name:</span> 
                              <span className="ml-2 text-gray-800">{deposition.deponent_name}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <p className="apple-body">
                              <span className="text-gray-600">Deponent Role:</span> 
                              <span className="ml-2 text-gray-800">{deposition.deponent_role}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <p className="apple-body">
                              <span className="text-gray-600">Date:</span> 
                              <span className="ml-2 text-gray-800">{new Date(deposition.deposition_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                            <p className="apple-body">
                              <span className="text-gray-600">Taking Attorney:</span> 
                              <span className="ml-2 text-gray-800">{deposition.taking_attorney || 'N/A'}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            <p className="apple-body">
                              <span className="text-gray-600">Defending Attorney:</span> 
                              <span className="ml-2 text-gray-800">{deposition.defending_attorney || 'N/A'}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                            <p className="apple-body">
                              <span className="text-gray-600">Court Reporter:</span> 
                              <span className="ml-2 text-gray-800">{deposition.court_reporter || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6 flex-shrink-0 flex space-x-3">
                      <Link
                        href={`/services/deposition/outline/${deposition.id}`}
                        className="glass-button p-3 rounded-2xl text-gray-800 hover:text-blue-600 font-medium apple-focus group/btn hover:scale-105 transition-all duration-300"
                        title="View deposition"
                      >
                        <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => openEditDialog(deposition)}
                        className="glass-button p-3 rounded-2xl text-blue-600 hover:text-blue-700 font-medium apple-focus group/btn hover:scale-105 transition-all duration-300"
                        title="Edit deposition"
                      >
                        <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteDialog(deposition)}
                        className="glass-button p-3 rounded-2xl text-red-600 hover:text-red-700 font-medium apple-focus group/btn hover:scale-105 transition-all duration-300 bg-red-500/10 border border-red-400/30"
                        title="Delete deposition"
                      >
                        <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Deposition Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAddForm(false)}
            />
            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <AddDepositionForm
                matterId={matterId}
                onAdd={handleAddDeposition}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        {/* Edit Deposition Form Modal */}
        {editDialog.isOpen && editDialog.deposition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeEditDialog}
            />
            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <AddDepositionForm
                matterId={matterId}
                onAdd={handleEditDeposition}
                onCancel={closeEditDialog}
                initialData={editDialog.deposition}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteDeposition}
          title="Delete Deposition"
          message={`Are you sure you want to delete "${deleteDialog.deposition?.title}"? This action cannot be undone.`}
          loading={actionLoading}
        />

        {/* Error Message */}
        {error && (
          <div className="fixed top-4 right-4 z-50 glass-card p-4 border border-red-400/30 bg-red-500/10 max-w-md">
            <div className="flex items-center justify-between">
              <p className="apple-body text-red-600 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-600 hover:text-red-700 apple-focus"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DepositionsPage;

