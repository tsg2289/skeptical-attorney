'use client';

/**
 * Response Preview Modal Component
 * 
 * Displays formatted preview of discovery responses
 * Matches California court document formatting
 * Updated to match propounding discovery format (SROG, RFP, RFA)
 */

import { useCallback, useState } from 'react';
import {
  X,
  FileDown,
} from 'lucide-react';
import {
  getObjectionById,
  GENERAL_OBJECTIONS_HEADER,
  DEFINITIONS_OBJECTION_INTERROGATORY,
  DEFINITIONS_OBJECTION_RFA,
  DEFINITIONS_OBJECTION_FROG,
  RESPONSE_TRANSITION,
  DISCOVERY_RESERVATION,
  type DiscoveryResponseType,
} from '@/lib/data/californiaObjections';

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

interface DiscoveryResponse {
  id: string;
  requestNumber: number;
  originalRequest: string;
  objections: string[];
  objectionTexts: string[];
  customObjections: string[]; // Custom objections added by user
  answer: string;
  suggestedObjectionIds: string[];
  status: 'draft' | 'reviewed' | 'final';
}

interface ResponsePreviewModalProps {
  caseData: CaseData;
  discoveryType: DiscoveryResponseType;
  responses: DiscoveryResponse[];
  onClose: () => void;
  onDownload: () => void;
  setNumber?: number;
}

// Type titles matching propounding format
const TYPE_TITLES: Record<DiscoveryResponseType, string> = {
  interrogatories: 'Responses to Special Interrogatories',
  frog: 'Responses to Form Interrogatories - General',
  rfp: 'Responses to Requests for Production of Documents',
  rfa: 'Responses to Requests for Admission',
};

// Color schemes matching propounding discovery types
const TYPE_COLORS: Record<DiscoveryResponseType, { gradient: string; bg: string; border: string }> = {
  interrogatories: { gradient: 'from-blue-600 to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  frog: { gradient: 'from-indigo-600 to-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  rfp: { gradient: 'from-emerald-600 to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rfa: { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
};

const SET_NUMBER_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];

const discoveryTypeLabels: Record<DiscoveryResponseType, string> = {
  interrogatories: 'SPECIAL INTERROGATORIES',
  frog: 'FORM INTERROGATORIES - GENERAL',
  rfp: 'REQUESTS FOR PRODUCTION OF DOCUMENTS',
  rfa: 'REQUESTS FOR ADMISSION',
};

const requestLabels: Record<DiscoveryResponseType, string> = {
  interrogatories: 'INTERROGATORY NO.',
  frog: 'FORM INTERROGATORY NO.',
  rfp: 'REQUEST FOR PRODUCTION NO.',
  rfa: 'REQUEST FOR ADMISSION NO.',
};

export function ResponsePreviewModal({
  caseData,
  discoveryType,
  responses,
  onClose,
  onDownload,
  setNumber = 1,
}: ResponsePreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const plaintiffs = caseData.plaintiffs || [];
  const defendants = caseData.defendants || [];
  const attorneys = caseData.attorneys || [];
  
  // For responses: responding party is typically defendant, propounding is plaintiff
  const respondingPartyName = defendants.length > 0 ? defendants[0].name : 'Defendant';
  const propoundingPartyName = plaintiffs.length > 0 ? plaintiffs[0].name : 'Plaintiff';
  
  const definitionsObjection = discoveryType === 'rfa'
    ? DEFINITIONS_OBJECTION_RFA
    : discoveryType === 'frog'
    ? DEFINITIONS_OBJECTION_FROG
    : DEFINITIONS_OBJECTION_INTERROGATORY;

  const colors = TYPE_COLORS[discoveryType];

  /**
   * Get objection texts for a response (predefined + custom)
   */
  const getObjectionTexts = useCallback((response: DiscoveryResponse) => {
    // Get predefined objection texts
    let predefinedTexts: string[] = [];
    if (response.objectionTexts && response.objectionTexts.length > 0) {
      predefinedTexts = response.objectionTexts;
    } else {
      predefinedTexts = response.objections
        .map(id => getObjectionById(id)?.fullText)
        .filter(Boolean) as string[];
    }
    
    // Add custom objections
    const customTexts = response.customObjections || [];
    
    return [...predefinedTexts, ...customTexts];
  }, []);

  /**
   * Handle download with loading state
   */
  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      await onDownload();
    } finally {
      setIsGenerating(false);
    }
  }, [onDownload]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header - Color coded like propounding */}
          <div className={`flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r ${colors.gradient} text-white`}>
            <div>
              <h2 className="text-2xl font-bold">{TYPE_TITLES[discoveryType]} Preview</h2>
              <p className="text-sm text-white/80 mt-1">
                {caseData.case_name} • Set {SET_NUMBER_WORDS[setNumber - 1] || setNumber} • {responses.length} responses
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg font-serif text-black">
              {/* Attorney Header - Left Aligned (Pleading Paper Style) */}
              {attorneys.length > 0 && (
                <div className="mb-6 space-y-0 text-sm leading-6">
                  <p className="text-black">{attorneys[0].name}, State Bar No. {attorneys[0].barNumber}</p>
                  <p className="text-black">{attorneys[0].firmName}</p>
                  <p className="text-black">{attorneys[0].address}</p>
                  <p className="text-black">Telephone: {attorneys[0].phone}</p>
                  <p className="text-black">Facsimile: [Fax Number]</p>
                  <p className="text-black">{attorneys[0].email}</p>
                  <p className="mt-2 text-black">Attorney for Defendant {respondingPartyName}</p>
                </div>
              )}

              {/* Court Header - Centered, Bold, Uppercase */}
              <div className="text-center mb-8 uppercase font-bold text-black">
                <p>SUPERIOR COURT OF THE STATE OF CALIFORNIA</p>
                <p>COUNTY OF {caseData.court_name?.toUpperCase().replace('SUPERIOR COURT OF CALIFORNIA, COUNTY OF ', '') || 'LOS ANGELES'}</p>
              </div>

              {/* Case Caption Table - Bordered 2-Column Box */}
              <div className="mb-8 border-2 border-black">
                <div className="flex">
                  {/* Left side - Parties */}
                  <div className="w-1/2 p-4 border-r-2 border-black">
                    <div className="mb-4">
                      <p className="text-sm text-black">{propoundingPartyName},</p>
                      <p className="text-sm indent-8 text-black">Plaintiff(s),</p>
                    </div>
                    <p className="text-sm my-4 text-black">vs.</p>
                    <div>
                      <p className="text-sm text-black">{respondingPartyName},</p>
                      <p className="text-sm text-black">DOES 1 through 50, inclusive,</p>
                      <p className="text-sm indent-8 text-black">Defendant(s).</p>
                    </div>
                  </div>
                  
                  {/* Right side - Case Info */}
                  <div className="w-1/2 p-4 space-y-2">
                    <p className="text-sm text-black">Case No.: {caseData.case_number || '[CASE NUMBER]'}</p>
                    
                    {/* Document Type */}
                    <div className="mt-4">
                      <p className="text-sm font-bold text-black uppercase">
                        RESPONSES TO {discoveryTypeLabels[discoveryType]}
                      </p>
                      <p className="text-sm text-black mt-1">
                        SET {SET_NUMBER_WORDS[setNumber - 1] || setNumber}
                      </p>
                    </div>
                    
                    <div className="mt-4 text-xs text-black space-y-0.5">
                      <p>PROPOUNDING PARTY: PLAINTIFF</p>
                      <p>RESPONDING PARTY: DEFENDANT</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preamble */}
              <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                Defendant {respondingPartyName} ("Defendant" or "Responding Party") hereby responds to Plaintiff {propoundingPartyName}'s {discoveryTypeLabels[discoveryType].toLowerCase()} as follows:
              </p>

              {/* General Objections */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">
                  General Objections
                </h3>
                <div className="text-xs text-gray-700 space-y-3">
                  <p>{GENERAL_OBJECTIONS_HEADER}</p>
                  <p>{definitionsObjection}</p>
                </div>
              </div>

              {/* Specific Responses */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">
                  Specific Responses
                </h3>

                {responses.map((response) => {
                  const objectionTexts = getObjectionTexts(response);
                  
                  return (
                    <div key={response.id} className={`mb-6 pl-4 border-l-2 ${colors.border}`}>
                      {/* Request */}
                      <p className="text-sm font-semibold text-gray-900">
                        {requestLabels[discoveryType]} {response.requestNumber}:
                      </p>
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed italic">
                        {response.originalRequest}
                      </p>

                      {/* Response */}
                      <div className="mt-3 ml-4">
                        <p className="text-sm font-semibold text-gray-900 mb-2">RESPONSE:</p>
                        
                        {/* Objections */}
                        {objectionTexts.length > 0 && (
                          <div className="space-y-2 text-sm text-gray-700">
                            {objectionTexts.map((text, idx) => (
                              <p key={idx}>{text}</p>
                            ))}
                            <p className="mt-3 font-medium">{RESPONSE_TRANSITION}</p>
                          </div>
                        )}

                        {/* Answer */}
                        <div className="mt-3 text-sm text-gray-700">
                          <p className="whitespace-pre-wrap">{response.answer}</p>
                        </div>

                        {/* Reservation */}
                        <div className="mt-3 text-xs text-gray-500 italic">
                          <p>{DISCOVERY_RESERVATION}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {responses.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-8">
                    No responses drafted yet.
                  </p>
                )}
              </div>

              {/* Verification (for interrogatories and form interrogatories) */}
              {(discoveryType === 'interrogatories' || discoveryType === 'frog') && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">
                    Verification
                  </h3>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-4">
                    <p>
                      I, {respondingPartyName}, am the Responding Party herein. I have read the foregoing responses and know the contents thereof. The same is true of my own knowledge, except as to those matters which are therein stated upon information and belief, and as to those matters I believe them to be true.
                    </p>
                    <p>
                      I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.
                    </p>
                    <p className="mt-6">
                      Executed on ________________, at ________________, California.
                    </p>
                    <div className="mt-8">
                      <p className="text-sm text-gray-600">________________________________</p>
                      <p className="text-sm text-gray-600">{respondingPartyName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Block */}
              <div className="mt-12 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Dated: ________________</p>
                <p className="text-sm text-gray-600 mb-8">Respectfully submitted,</p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">{attorneys.length > 0 ? attorneys[0].firmName : '[Law Firm Name]'}</p>
                  <p className="text-sm text-gray-600 mt-8">_________________________________</p>
                  <p className="text-sm text-gray-600">{attorneys.length > 0 ? attorneys[0].name : '[Attorney Name]'}</p>
                  {attorneys.length > 0 && attorneys[0].barNumber && (
                    <p className="text-sm text-gray-600">State Bar No. {attorneys[0].barNumber}</p>
                  )}
                  <p className="text-sm text-gray-600">Attorney for Defendant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions - Matching propounding format */}
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-500">
              {responses.length} {discoveryType === 'interrogatories' ? 'interrogatory responses' :
                               discoveryType === 'frog' ? 'form interrogatory responses' :
                               discoveryType === 'rfp' ? 'production responses' : 'admission responses'} in this set
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-full font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownload}
                disabled={isGenerating || responses.length === 0}
                className={`px-6 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                  isGenerating || responses.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Export to Word
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


