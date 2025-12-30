'use client';

/**
 * Response Preview Modal Component
 * 
 * Displays formatted preview of discovery responses
 * Matches California court document formatting
 */

import { useCallback } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
} from 'lucide-react';
import {
  getObjectionById,
  GENERAL_OBJECTIONS_HEADER,
  DEFINITIONS_OBJECTION_INTERROGATORY,
  DEFINITIONS_OBJECTION_RFA,
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
}

const discoveryTypeLabels: Record<DiscoveryResponseType, string> = {
  interrogatories: 'SPECIAL INTERROGATORIES',
  rfp: 'REQUESTS FOR PRODUCTION OF DOCUMENTS',
  rfa: 'REQUESTS FOR ADMISSION',
};

const requestLabels: Record<DiscoveryResponseType, string> = {
  interrogatories: 'INTERROGATORY NO.',
  rfp: 'REQUEST FOR PRODUCTION NO.',
  rfa: 'REQUEST FOR ADMISSION NO.',
};

export function ResponsePreviewModal({
  caseData,
  discoveryType,
  responses,
  onClose,
  onDownload,
}: ResponsePreviewModalProps) {
  const plaintiffs = caseData.plaintiffs || [];
  const defendants = caseData.defendants || [];
  const attorneys = caseData.attorneys || [];
  
  const respondingParty = defendants.length > 0 ? defendants[0].name : 'DEFENDANT';
  const propoundingParty = plaintiffs.length > 0 ? plaintiffs[0].name : 'PLAINTIFF';
  
  const definitionsObjection = discoveryType === 'rfa'
    ? DEFINITIONS_OBJECTION_RFA
    : DEFINITIONS_OBJECTION_INTERROGATORY;

  /**
   * Get objection texts for a response
   */
  const getObjectionTexts = useCallback((response: DiscoveryResponse) => {
    if (response.objectionTexts.length > 0) {
      return response.objectionTexts;
    }
    return response.objections
      .map(id => getObjectionById(id)?.fullText)
      .filter(Boolean) as string[];
  }, []);

  /**
   * Handle print
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Document Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
              Download Word
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
          <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-12 print:shadow-none print:p-0">
            {/* Attorney Header */}
            {attorneys.length > 0 && (
              <div className="text-sm leading-relaxed mb-8">
                <p className="font-bold">{attorneys[0].name}</p>
                <p>State Bar No. {attorneys[0].barNumber}</p>
                <p>{attorneys[0].firmName}</p>
                <p>{attorneys[0].address}</p>
                <p>Telephone: {attorneys[0].phone}</p>
                <p>Email: {attorneys[0].email}</p>
                <p className="mt-2">Attorney for {respondingParty}</p>
              </div>
            )}

            {/* Court Name */}
            <div className="text-center font-bold text-base mb-6">
              {caseData.court_name || 'SUPERIOR COURT OF CALIFORNIA'}
            </div>

            {/* Case Caption */}
            <div className="border-b-2 border-black pb-4 mb-4">
              <div className="flex justify-between">
                <div className="flex-1">
                  <p>{propoundingParty},</p>
                  <p className="ml-8">Plaintiff,</p>
                  <p className="mt-2">vs.</p>
                  <p className="mt-2">{respondingParty},</p>
                  <p className="ml-8">Defendant.</p>
                </div>
                <div className="text-right">
                  <p>Case No. {caseData.case_number || '_____________'}</p>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center font-bold text-base mb-8 border-b-2 border-black pb-4">
              RESPONSES TO {discoveryTypeLabels[discoveryType]}
            </div>

            {/* Preamble */}
            <div className="mb-8 text-sm leading-relaxed">
              <p>
                {respondingParty} hereby responds to the {discoveryTypeLabels[discoveryType].toLowerCase()} propounded by {propoundingParty} as follows:
              </p>
            </div>

            {/* General Objections */}
            <div className="mb-8">
              <h2 className="text-center font-bold underline mb-4">GENERAL OBJECTIONS</h2>
              <div className="text-sm leading-relaxed space-y-4">
                <p>{GENERAL_OBJECTIONS_HEADER}</p>
                <p>{definitionsObjection}</p>
              </div>
            </div>

            {/* Specific Responses */}
            <div className="mb-8">
              <h2 className="text-center font-bold underline mb-6">SPECIFIC RESPONSES</h2>
              
              {responses.map((response) => {
                const objectionTexts = getObjectionTexts(response);
                
                return (
                  <div key={response.id} className="mb-8">
                    {/* Request */}
                    <div className="mb-3">
                      <p className="font-bold">
                        {requestLabels[discoveryType]} {response.requestNumber}:
                      </p>
                      <p className="italic ml-4 mt-1 text-sm">
                        {response.originalRequest}
                      </p>
                    </div>

                    {/* Response */}
                    <div className="ml-4">
                      <p className="font-bold mb-2">RESPONSE:</p>
                      
                      {/* Objections */}
                      {objectionTexts.length > 0 && (
                        <div className="space-y-3 text-sm">
                          {objectionTexts.map((text, idx) => (
                            <p key={idx}>{text}</p>
                          ))}
                          <p className="mt-4">{RESPONSE_TRANSITION}</p>
                        </div>
                      )}

                      {/* Answer */}
                      <div className="mt-4 text-sm">
                        <p>{response.answer}</p>
                      </div>

                      {/* Reservation */}
                      <div className="mt-4 text-sm italic">
                        <p>{DISCOVERY_RESERVATION}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verification (for interrogatories) */}
            {discoveryType === 'interrogatories' && (
              <div className="mb-8 border-t-2 border-black pt-6">
                <h2 className="text-center font-bold underline mb-4">VERIFICATION</h2>
                <div className="text-sm leading-relaxed space-y-4">
                  <p>
                    I, {respondingParty}, am the Responding Party herein. I have read the foregoing responses and know the contents thereof. The same is true of my own knowledge, except as to those matters which are therein stated upon information and belief, and as to those matters I believe them to be true.
                  </p>
                  <p>
                    I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.
                  </p>
                  <p className="mt-8">
                    Executed on ________________, at ________________, California.
                  </p>
                  <div className="mt-12">
                    <p>________________________________</p>
                    <p>{respondingParty}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Block */}
            <div className="mt-12">
              <p className="mb-4">Dated: ________________</p>
              
              {attorneys.length > 0 && (
                <div className="text-right mt-8">
                  <p>Respectfully submitted,</p>
                  <div className="mt-12">
                    <p>________________________________</p>
                    <p className="font-bold">{attorneys[0].name}</p>
                    <p>Attorney for {respondingParty}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


