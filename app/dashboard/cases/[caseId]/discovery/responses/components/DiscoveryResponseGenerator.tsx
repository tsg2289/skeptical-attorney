'use client';

/**
 * Discovery Response Generator Component
 * 
 * Main workflow component for:
 * 1. Uploading discovery document
 * 2. Selecting discovery type
 * 3. Extracting requests
 * 4. Generating AI responses
 * 5. Editing with card system
 * 6. Preview and Word export
 */

import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  Eye,
  Download,
  RotateCcw,
  MessageSquare,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ResponseCard } from './ResponseCard';
import { ResponseAIPanel } from './ResponseAIPanel';
import { ResponsePreviewModal } from './ResponsePreviewModal';
import { createClient } from '@/lib/supabase/client';
import type { DiscoveryResponseType } from '@/lib/data/californiaObjections';

// Types
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
}

interface ParsedRequest {
  id: string;
  requestNumber: number;
  originalText: string;
  category?: string;
}

interface DiscoveryResponse {
  id: string;
  requestNumber: number;
  originalRequest: string;
  objections: string[];
  objectionTexts: string[];
  answer: string;
  suggestedObjectionIds: string[];
  status: 'draft' | 'reviewed' | 'final';
}

interface DiscoveryResponseGeneratorProps {
  caseData: CaseData;
  onSave?: () => void;
}

type Step = 'upload' | 'processing' | 'generating' | 'editing';

export function DiscoveryResponseGenerator({ caseData, onSave }: DiscoveryResponseGeneratorProps) {
  // Workflow state
  const [step, setStep] = useState<Step>('upload');
  const [discoveryType, setDiscoveryType] = useState<DiscoveryResponseType>('interrogatories');
  const [generateAnswers, setGenerateAnswers] = useState(true);
  
  // File and document state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedRequests, setExtractedRequests] = useState<ParsedRequest[]>([]);
  const [documentInfo, setDocumentInfo] = useState<{ fileName: string; totalRequests: number } | null>(null);
  
  // Response state
  const [responses, setResponses] = useState<DiscoveryResponse[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setError(null);
    }
  }, []);

  /**
   * Process uploaded document
   */
  const handleProcessDocument = useCallback(async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setStep('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('caseId', caseData.id);
      formData.append('discoveryType', discoveryType);

      const response = await fetch('/api/discovery-response/process-document', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process document');
      }

      setExtractedRequests(result.requests);
      setDocumentInfo({
        fileName: result.documentInfo.fileName,
        totalRequests: result.documentInfo.totalRequests,
      });

      // Auto-generate responses after extraction
      await handleGenerateResponses(result.requests);

    } catch (err) {
      console.error('Process document error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedFile, caseData.id, discoveryType]);

  /**
   * Generate AI responses for extracted requests
   */
  const handleGenerateResponses = useCallback(async (requests: ParsedRequest[]) => {
    setIsGenerating(true);
    setStep('generating');
    setError(null);

    try {
      const response = await fetch('/api/discovery-response/generate-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          discoveryType,
          requests,
          generateAnswers,
          caseFacts: caseData.case_description,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate responses');
      }

      setResponses(result.responses);
      setStep('editing');

    } catch (err) {
      console.error('Generate responses error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate responses');
      // Stay on current step so user can retry
    } finally {
      setIsGenerating(false);
    }
  }, [caseData.id, caseData.case_description, discoveryType, generateAnswers]);

  /**
   * Update a single response
   */
  const handleUpdateResponse = useCallback((id: string, updates: Partial<DiscoveryResponse>) => {
    setResponses(prev => prev.map(r => 
      r.id === id ? { ...r, ...updates } : r
    ));
  }, []);

  /**
   * Toggle objection on/off
   */
  const handleToggleObjection = useCallback((responseId: string, objectionId: string, enabled: boolean) => {
    setResponses(prev => prev.map(r => {
      if (r.id !== responseId) return r;
      
      const newObjections = enabled
        ? [...r.objections, objectionId]
        : r.objections.filter(id => id !== objectionId);
      
      return { ...r, objections: newObjections };
    }));
  }, []);

  /**
   * Handle drag and drop reordering
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setResponses(prev => {
        const oldIndex = prev.findIndex(r => r.id === active.id);
        const newIndex = prev.findIndex(r => r.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  /**
   * Reset workflow
   */
  const handleReset = useCallback(() => {
    setStep('upload');
    setUploadedFile(null);
    setExtractedRequests([]);
    setResponses([]);
    setDocumentInfo(null);
    setSelectedResponseId(null);
    setError(null);
  }, []);

  /**
   * Save responses to case
   */
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      
      // Get existing discovery responses
      const { data: existingCase } = await supabase
        .from('cases')
        .select('discovery_responses')
        .eq('id', caseData.id)
        .single();

      const existingResponses = existingCase?.discovery_responses || {};
      
      // Create response set
      const responseSet = {
        id: `${discoveryType}_${Date.now()}`,
        setNumber: 1,
        receivedDate: new Date().toISOString(),
        originalDocument: {
          fileName: documentInfo?.fileName || 'unknown',
          uploadedAt: new Date().toISOString(),
        },
        responses,
        metadata: {
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Add to appropriate category
      const categoryKey = `${discoveryType}_responses`;
      const updatedResponses = {
        ...existingResponses,
        [categoryKey]: [
          ...(existingResponses[categoryKey] || []),
          responseSet,
        ],
      };

      // Save to database
      const { error: saveError } = await supabase
        .from('cases')
        .update({ discovery_responses: updatedResponses })
        .eq('id', caseData.id);

      if (saveError) throw saveError;

      setSaveSuccess(true);
      onSave?.();
      
      // Clear success after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save responses');
    } finally {
      setSaving(false);
    }
  }, [caseData.id, discoveryType, documentInfo, responses, onSave]);

  /**
   * Download Word document
   */
  const handleDownloadDocx = useCallback(async () => {
    try {
      const plaintiffs = caseData.plaintiffs || [];
      const defendants = caseData.defendants || [];

      const response = await fetch('/api/discovery-response/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          discoveryType,
          setNumber: 1,
          responses: responses.map(r => ({
            requestNumber: r.requestNumber,
            originalRequest: r.originalRequest,
            objections: r.objections,
            objectionTexts: r.objectionTexts,
            answer: r.answer,
          })),
          respondingParty: defendants.length > 0 ? defendants[0].name : 'Defendant',
          propoundingParty: plaintiffs.length > 0 ? plaintiffs[0].name : 'Plaintiff',
          caseNumber: caseData.case_number || '',
          courtName: caseData.court_name || 'Superior Court of California',
          caseName: caseData.case_name,
          attorneys: caseData.attorneys,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discovery_responses_${discoveryType}_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  }, [caseData, discoveryType, responses]);

  // Get selected response for AI panel
  const selectedResponse = responses.find(r => r.id === selectedResponseId);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {step === 'upload' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            Upload Discovery Document
          </h2>

          {/* Discovery Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Discovery Type
            </label>
            <div className="relative">
              <select
                value={discoveryType}
                onChange={(e) => setDiscoveryType(e.target.value as DiscoveryResponseType)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="interrogatories">Special Interrogatories</option>
                <option value="rfp">Requests for Production</option>
                <option value="rfa">Requests for Admission</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload Document (PDF, DOCX, or TXT)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="discovery-file-upload"
              />
              <label
                htmlFor="discovery-file-upload"
                className={`flex items-center justify-center gap-3 w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  uploadedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/20 hover:border-blue-400/50 hover:bg-blue-500/5'
                }`}
              >
                {uploadedFile ? (
                  <>
                    <FileText className="w-8 h-8 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-emerald-400 font-medium">{uploadedFile.name}</p>
                      <p className="text-sm text-slate-400">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400" />
                    <div className="text-left">
                      <p className="text-slate-300">Drop your discovery document here</p>
                      <p className="text-sm text-slate-500">or click to browse</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Generate Answers Toggle */}
          <div className="mb-8">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateAnswers}
                onChange={(e) => setGenerateAnswers(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-slate-300">
                Generate substantive answers (recommended for interrogatories)
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleProcessDocument}
            disabled={!uploadedFile}
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Process & Generate Responses
          </button>
        </div>
      )}

      {/* Processing State */}
      {(step === 'processing' || step === 'generating') && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {step === 'processing' ? 'Processing Document...' : 'Generating Responses...'}
          </h3>
          <p className="text-slate-400">
            {step === 'processing'
              ? 'Extracting discovery requests from your document'
              : 'AI is crafting objections and responses'}
          </p>
          <div className="mt-4 text-sm text-emerald-400">
            Data is anonymized during processing
          </div>
        </div>
      )}

      {/* Editing Section */}
      {step === 'editing' && responses.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                <span className="text-white font-medium">{documentInfo?.fileName}</span>
                <span className="mx-2">•</span>
                <span>{responses.length} requests</span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAIPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                AI Assistant
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleDownloadDocx}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                Download Word
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Draft'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Response Cards */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={responses.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {responses.map((response) => (
                  <ResponseCard
                    key={response.id}
                    response={response}
                    discoveryType={discoveryType}
                    isSelected={response.id === selectedResponseId}
                    onSelect={() => setSelectedResponseId(response.id)}
                    onUpdate={(updates) => handleUpdateResponse(response.id, updates)}
                    onToggleObjection={(objId, enabled) => handleToggleObjection(response.id, objId, enabled)}
                    onOpenAI={() => {
                      setSelectedResponseId(response.id);
                      setShowAIPanel(true);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* AI Panel */}
      {showAIPanel && (
        <ResponseAIPanel
          caseData={caseData}
          discoveryType={discoveryType}
          selectedResponse={selectedResponse || null}
          onClose={() => setShowAIPanel(false)}
          onUpdateResponse={(updates) => {
            if (selectedResponseId) {
              handleUpdateResponse(selectedResponseId, updates);
            }
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <ResponsePreviewModal
          caseData={caseData}
          discoveryType={discoveryType}
          responses={responses}
          onClose={() => setShowPreview(false)}
          onDownload={handleDownloadDocx}
        />
      )}
    </div>
  );
}


