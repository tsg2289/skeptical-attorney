'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabaseCaseStorage, CaseFrontend, DemandLetterSection } from '@/lib/supabase/caseStorage';
import { createClient } from '@/lib/supabase/client';
import PreviewModal from './components/PreviewModal';
import AIEditChatModal from './components/AIEditChatModal';

// Type alias for backward compatibility
type CardSection = DemandLetterSection;

export default function DemandLetterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <Header />
          <div className="p-6 text-gray-600">Loading demand letter...</div>
          <Footer />
        </div>
      }
    >
      <DemandLetterPageContent />
    </Suspense>
  );
}

function DemandLetterPageContent() {
  const searchParams = useSearchParams();
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null);
  const [sections, setSections] = useState<CardSection[]>([
    { 
      id: '0', 
      title: 'Case Description', 
      content: 'Summarize your case here—include the key facts, basis for liability, and damages sought. After entering this information, use the AI function to auto-populate the Introduction, Facts, Liability, Damages, and Demand sections below.' 
    },
    { 
      id: '1', 
      title: 'Introduction', 
      content: 'Enter your Case Description above, then click \'Populate with AI\' to generate this section.' 
    },
    { 
      id: '2', 
      title: 'FACTS', 
      content: 'Enter your Case Description above, then click \'Populate with AI\' to generate this section.' 
    },
    { 
      id: '3', 
      title: 'LIABILITY', 
      content: 'Enter your Case Description above, then click \'Populate with AI\' to generate this section.' 
    },
    { 
      id: '4', 
      title: 'DAMAGES', 
      content: 'Enter your Case Description above, then click \'Populate with AI\' to generate this section.' 
    },
    { 
      id: '5', 
      title: 'SETTLEMENT DEMAND', 
      content: 'Enter your Case Description above, then click \'Populate with AI\' to generate this section.' 
    },
    { 
      id: '6', 
      title: 'DOCUMENTATION PROVIDED', 
      content: 'Enter your Case Description above, then click \'Populate with AI\' to generate this section.' 
    },
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // AI Chat Modal state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CardSection | null>(null);

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(192, textarea.scrollHeight)}px`; // min height of 192px (h-48)
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  const addSection = () => {
    setSections([...sections, { 
      id: Date.now().toString(), 
      title: `Section ${sections.length + 1}`, 
      content: '' 
    }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const addDocument = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const currentContent = section.content.trim();
    const newDocument = '\n\n[New Document]';
    const updatedContent = currentContent + newDocument;
    
    updateSection(sectionId, 'content', updatedContent);
  };

  const handleAIAssist = async (sectionId: string) => {
    // Only allow for Case Description and Introduction sections
    if (sectionId !== '0' && sectionId !== '1') {
      setAiError('AI assist is only available for Case Description and Introduction sections');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    // CRITICAL: Ensure we only send data from the current case
    // Verify we have a case ID and user is authenticated
    if (sectionId === '0' && currentCaseId) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Row Level Security ensures we can only access our own cases
        const verifiedCase = await supabaseCaseStorage.getCase(currentCaseId);
        // Double-check: ensure we're only using this case's data
        if (!verifiedCase) {
          setAiError('Case not found. Please ensure you are working with a valid case.');
          setTimeout(() => setAiError(null), 5000);
          return;
        }
      }
    }

    setAiLoading(sectionId);
    setAiError(null);

    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      let apiEndpoint = '/api/ai';
      
      // Case Description uses populate-sections endpoint to fill all sections
      if (sectionId === '0') {
        apiEndpoint = '/api/ai/populate-sections';
      }

      // CRITICAL: Only send sections from THIS demand letter session
      // Do not include any data from other cases
      const requestBody = sectionId === '0' 
        ? { 
            caseDescription: section.content, // Only current case description
            allSections: sections, // Only current demand letter sections
            caseId: currentCaseId // Explicitly scope to this case
          }
        : {
            sectionId,
            sectionTitle: section.title,
            currentContent: section.content, // Only current section content
            allSections: sections, // Only current demand letter sections
            caseId: currentCaseId // Explicitly scope to this case
          };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          // Response is HTML (error page), get text instead
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 200));
          throw new Error(`Server error: ${response.status} ${response.statusText}. Please check your API configuration.`);
        }
        
        const errorMessage = errorData.error || 
                             errorData.details?.error?.message ||
                             `Server error: ${response.status} ${response.statusText}`;
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // If Case Description, update all sections
      if (sectionId === '0' && data.sections) {
        // Update each section with generated content
        setSections(prevSections => 
          prevSections.map(sec => {
            if (data.sections[sec.id]) {
              return { ...sec, content: data.sections[sec.id] };
            }
            return sec;
          })
        );
      } else {
        // Single section update (Introduction)
        updateSection(sectionId, 'content', data.content);
      }
    } catch (error) {
      console.error('AI Assist error:', error);
      setAiError(error instanceof Error ? error.message : 'An error occurred');
      setTimeout(() => setAiError(null), 5000);
    } finally {
      setAiLoading(null);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Prevent dropping Case Description (id: '0') or dropping before Case Description
    const draggedSection = sections[draggedIndex];
    if (draggedSection.id === '0' || dropIndex === 0) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSections = [...sections];
    
    // Remove the dragged item
    newSections.splice(draggedIndex, 1);
    
    // Insert at new position (but never at index 0)
    newSections.splice(dropIndex, 0, draggedSection);
    
    setSections(newSections);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Save demand letter sections to the database
  const handleSaveDraft = async () => {
    if (!currentCaseId) {
      setAiError('No case selected. Please access this page from the case dashboard.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const result = await supabaseCaseStorage.updateCase(currentCaseId, {
        demandLetterSections: sections,
      });

      if (result) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setAiError('Failed to save draft. Please try again.');
        setTimeout(() => setAiError(null), 5000);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setAiError('An error occurred while saving. Please try again.');
      setTimeout(() => setAiError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Handler to open AI chat for a section
  const handleOpenAIChat = (section: CardSection) => {
    setEditingSection(section);
    setAiChatOpen(true);
  };

  // Handler to apply AI edits from chat
  const handleApplyAIEdit = (newContent: string) => {
    if (editingSection) {
      updateSection(editingSection.id, 'content', newContent);
    }
  };

  // Get case description content for context (source of truth for AI)
  const getCaseDescriptionContent = () => {
    const caseDescSection = sections.find(s => s.id === '0');
    return caseDescSection?.content || '';
  };

  // Populate case description from case facts - ONLY for the specific case
  useEffect(() => {
    const loadCase = async () => {
      const caseId = searchParams?.get('caseId');
      if (caseId) {
        // Verify user is authenticated via Supabase
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // CRITICAL: Only retrieve the specific case by ID
          // Row Level Security ensures user can only access their own cases
          const foundCase = await supabaseCaseStorage.getCase(caseId);
          
          if (foundCase) {
            // Store the case ID to ensure all operations are scoped to this case
            setCurrentCaseId(caseId);
            setCurrentCase(foundCase); // Store full case object for header display
            
            // Load saved demand letter sections if they exist
            if (foundCase.demandLetterSections && foundCase.demandLetterSections.length > 0) {
              setSections(foundCase.demandLetterSections);
            } else if (foundCase.facts) {
              // Only populate Case Description with facts if no saved sections exist
              setSections(prevSections => 
                prevSections.map(section => 
                  section.id === '0' 
                    ? { ...section, content: foundCase.facts || section.content }
                    : section
                )
              );
            }
          }
        }
      }
    };
    
    loadCase();
  }, [searchParams]);

  // Auto-resize textareas when sections change
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [sections]);

  // Split sections into Case Description and other sections
  const caseDescription = sections.find(s => s.id === '0');
  const otherSections = sections.filter(s => s.id !== '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      {/* Case Name Header - Only show when accessed from case dashboard */}
      {currentCase && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link 
                  href={`/dashboard/cases/${currentCase.id}`}
                  className="hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                  {currentCase.caseNumber && (
                    <p className="text-sm text-blue-100">Case #: {currentCase.caseNumber}</p>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/cases/${currentCase.id}`}
                className="text-sm hover:underline text-blue-100"
              >
                Back to Case
              </Link>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="glass p-6 rounded-2xl mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Demand Letter Generator</h1>
              <p className="text-gray-600 mt-1">Create your demand letter using the card-based interface</p>
            </div>
          </header>

          {/* Case Description Section - Separate at Top */}
          {caseDescription && (
            <div className="mb-8">
              <div className="glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 relative">
                <div className="flex justify-between items-start mb-4 gap-3">
                  <div className="text-gray-400 flex items-center pt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={caseDescription.title}
                    onChange={(e) => updateSection(caseDescription.id, 'title', e.target.value)}
                    className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 placeholder-gray-400"
                    placeholder="Section Title"
                  />
                </div>
                <div className="relative">
                  <textarea
                    value={caseDescription.content}
                    onChange={(e) => {
                      updateSection(caseDescription.id, 'content', e.target.value);
                      autoResizeTextarea(e.target as HTMLTextAreaElement);
                    }}
                    onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                    ref={(textarea) => {
                      if (textarea) {
                        autoResizeTextarea(textarea);
                      }
                    }}
                    className="w-full min-h-48 p-4 pr-14 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
                    placeholder="Enter section content here... (Template will be added later)"
                  />
                  {/* AI Sparkle Button */}
                  <button
                    onClick={() => handleAIAssist(caseDescription.id)}
                    disabled={aiLoading === caseDescription.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${
                      aiLoading === caseDescription.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label="AI Assist"
                    title="AI Assist - Improve case description"
                  >
                    {aiLoading === caseDescription.id ? (
                      <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg 
                        className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                        <path d="M6 4L6.5 6.5L9 7L6.5 7.5L6 10L5.5 7.5L3 7L5.5 6.5L6 4Z" />
                        <path d="M18 14L18.5 16.5L21 17L18.5 17.5L18 20L17.5 17.5L15 17L17.5 16.5L18 14Z" />
                      </svg>
                    )}
                  </button>
                </div>
                {aiError && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {aiError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
            <span className="text-gray-600 text-sm font-medium">Demand Letter Sections</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
          </div>

          {/* Other Cards Stack */}
          <div className="flex flex-col gap-6 mb-8">
            {otherSections.map((section) => {
              // Find original index for drag/drop
              const originalIndex = sections.findIndex(s => s.id === section.id);
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, originalIndex)}
                  onDragEnd={handleDragEnd}
                  className={`glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 relative cursor-move ${
                    draggedIndex === originalIndex ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverIndex === originalIndex && draggedIndex !== originalIndex ? 'border-2 border-blue-500 border-dashed scale-105' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4 gap-3">
                    {/* Drag Handle */}
                    <div className="text-gray-400 hover:text-gray-600 transition-colors flex items-center pt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                      className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 placeholder-gray-400"
                      placeholder="Section Title"
                    />
                    {sections.length > 1 && (
                      <button
                        onClick={() => removeSection(section.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        aria-label="Remove section"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <textarea
                      value={section.content}
                      onChange={(e) => {
                        updateSection(section.id, 'content', e.target.value);
                        autoResizeTextarea(e.target as HTMLTextAreaElement);
                      }}
                      onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                      ref={(textarea) => {
                        if (textarea) {
                          autoResizeTextarea(textarea);
                        }
                      }}
                      className="w-full min-h-48 p-4 pr-14 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
                      placeholder="Enter section content here... (Template will be added later)"
                    />
                    {/* AI Edit Chat Button */}
                    <button
                      onClick={() => handleOpenAIChat(section)}
                      disabled={aiLoading === section.id || !currentCaseId}
                      className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${
                        aiLoading === section.id ? 'opacity-50 cursor-not-allowed' : ''
                      } ${!currentCaseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="AI Edit Assistant"
                      title={currentCaseId ? 'Open AI Edit Assistant - Edit this section interactively' : 'Access from case dashboard to enable AI editing'}
                    >
                      {aiLoading === section.id ? (
                        <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg 
                          className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                          <path d="M6 4L6.5 6.5L9 7L6.5 7.5L6 10L5.5 7.5L3 7L5.5 6.5L6 4Z" />
                          <path d="M18 14L18.5 16.5L21 17L18.5 17.5L18 20L17.5 17.5L15 17L17.5 16.5L18 14Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {aiError && section.id === '1' && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {aiError}
                    </div>
                  )}
                  {/* Add Document Button - Only for DOCUMENTATION PROVIDED section */}
                  {section.id === '8' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => addDocument(section.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Document
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Section Button */}
          <div className="mb-8 flex justify-center">
            <button
              onClick={addSection}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              + Add Section
            </button>
          </div>

          {/* Action Buttons */}
          <div className="glass p-6 rounded-2xl flex gap-4 justify-end items-center">
            {saveSuccess && (
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Draft saved!
              </span>
            )}
            <button 
              onClick={handleSaveDraft}
              disabled={saving || !currentCaseId}
              className={`px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              } ${!currentCaseId ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!currentCaseId ? 'Access from case dashboard to enable saving' : 'Save your draft'}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Draft'
              )}
            </button>
            <button 
              onClick={() => setShowPreview(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Preview Letter
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl">
              Generate PDF
            </button>
          </div>
        </div>
      </div>
      
      <Footer />
      
      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        sections={sections}
        caseInfo={{
          caseName: currentCase?.caseName,
          caseNumber: currentCase?.caseNumber,
          // Get attorney from first plaintiff's attorneys
          attorneyName: currentCase?.plaintiffs?.[0]?.attorneys?.[0]?.name,
          stateBarNumber: currentCase?.plaintiffs?.[0]?.attorneys?.[0]?.barNumber,
          email: currentCase?.plaintiffs?.[0]?.attorneys?.[0]?.email,
          lawFirmName: currentCase?.plaintiffs?.[0]?.attorneys?.[0]?.firm,
          address: currentCase?.plaintiffs?.[0]?.attorneys?.[0]?.address,
          phone: currentCase?.plaintiffs?.[0]?.attorneys?.[0]?.phone,
        }}
      />

      {/* AI Edit Chat Modal */}
      {editingSection && currentCaseId && (
        <AIEditChatModal
          isOpen={aiChatOpen}
          onClose={() => {
            setAiChatOpen(false);
            setEditingSection(null);
          }}
          sectionId={editingSection.id}
          sectionTitle={editingSection.title}
          currentContent={editingSection.content}
          caseDescription={getCaseDescriptionContent()}
          caseId={currentCaseId}
          parties={{
            client: currentCase?.client,
            plaintiffs: currentCase?.plaintiffs,
            defendants: currentCase?.defendants,
          }}
          onApplyEdit={handleApplyAIEdit}
        />
      )}
    </div>
  );
}





