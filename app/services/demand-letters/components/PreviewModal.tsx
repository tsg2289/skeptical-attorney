'use client';

import { Fragment, useState } from 'react';
import { downloadDemandLetterDocument, DemandLetterData } from '@/lib/docx-generator';
import { DemandLetterSection } from '@/lib/supabase/caseStorage';

// Type alias for backward compatibility
type CardSection = DemandLetterSection;

interface Recipient {
  id: string;
  name: string;
  firm: string;
  address: string;
  phone: string;
  email: string;
}

type SendViaOption = 'Email' | 'Certified Mail' | 'Regular Mail' | 'Fax' | 'Hand Delivery';

interface REInfo {
  caseName: string;
  dateOfLoss: string;
  caseNumber: string;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: CardSection[];
  caseInfo?: {
    caseName?: string;
    caseNumber?: string;
    // Attorney info
    attorneyName?: string;
    stateBarNumber?: string;
    email?: string;
    lawFirmName?: string;
    address?: string;
    phone?: string;
  };
  recipients?: Recipient[];
  sendVia?: SendViaOption;
  reInfo?: REInfo;
}

export default function PreviewModal({ isOpen, onClose, sections, caseInfo, recipients, sendVia, reInfo }: PreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter out Case Description for preview
  const previewSections = sections.filter(s => s.id !== '0');

  const handleGenerateWord = async () => {
    setIsGenerating(true);
    try {
      const demandLetterData: DemandLetterData = {
        sections: sections, // Include all sections, generator will filter
        caseName: caseInfo?.caseName,
        caseNumber: caseInfo?.caseNumber,
        // Attorney info (sender)
        attorneyName: caseInfo?.attorneyName,
        stateBarNumber: caseInfo?.stateBarNumber,
        email: caseInfo?.email,
        lawFirmName: caseInfo?.lawFirmName,
        address: caseInfo?.address,
        phone: caseInfo?.phone,
        // Recipients info
        recipients: recipients,
        sendVia: sendVia,
        // RE: section info
        reInfo: reInfo,
      };

      await downloadDemandLetterDocument(demandLetterData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Success Toast - Outside modal for proper fixed positioning */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Document generated successfully!</span>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div>
              <h2 className="text-2xl font-bold">Demand Letter Preview</h2>
              {caseInfo?.caseName && (
                <p className="text-sm text-blue-100 mt-1">{caseInfo.caseName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors p-2 rounded-full hover:bg-blue-800"
              aria-label="Close preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg">
              {/* Letterhead */}
              <div className="mb-6 text-center border-b border-gray-200 pb-4">
                <p className="text-lg font-bold text-gray-900">{caseInfo?.lawFirmName || '[LAW FIRM NAME]'}</p>
                <p className="text-sm text-gray-600">{caseInfo?.address || '[Address]'}</p>
                <p className="text-sm text-gray-600">
                  {caseInfo?.phone ? `Tel: ${caseInfo.phone}` : '[Phone]'} | {caseInfo?.email || '[Email]'}
                </p>
              </div>

              {/* Date */}
              <div className="mb-6">
                <p className="text-sm text-gray-800">{new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>

              {/* Send Via */}
              {sendVia && (
                <div className="mb-4">
                  <p className="text-sm text-gray-800 font-semibold">
                    VIA {sendVia.toUpperCase()}
                    {sendVia === 'Certified Mail' && ', RETURN RECEIPT REQUESTED'}
                  </p>
                </div>
              )}

              {/* Recipients Address Blocks */}
              {recipients && recipients.length > 0 && (
                <div className="mb-6 space-y-4">
                  {recipients.map((recipient, index) => (
                    <div key={recipient.id} className="space-y-0.5">
                      {recipients.length > 1 && (
                        <p className="text-xs text-gray-500 font-medium mb-1">Recipient {index + 1}:</p>
                      )}
                      {recipient.name && <p className="text-sm text-gray-800">{recipient.name}</p>}
                      {recipient.firm && <p className="text-sm text-gray-800">{recipient.firm}</p>}
                      {recipient.address && <p className="text-sm text-gray-800">{recipient.address}</p>}
                      {recipient.email && <p className="text-sm text-gray-800">{recipient.email}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* RE: Section */}
              {reInfo && (reInfo.caseName || reInfo.dateOfLoss || reInfo.caseNumber) && (
                <div className="mb-6 pl-4 border-l-2 border-gray-300">
                  <p className="text-sm text-gray-800 font-semibold mb-1">RE:</p>
                  <p className="text-sm text-gray-800 font-semibold ml-4">CONFIDENTIAL DEMAND LETTER</p>
                  {reInfo.caseName && (
                    <p className="text-sm text-gray-800 ml-4">Case: {reInfo.caseName}</p>
                  )}
                  {reInfo.dateOfLoss && (
                    <p className="text-sm text-gray-800 ml-4">Date of Loss: {new Date(reInfo.dateOfLoss).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  )}
                  {reInfo.caseNumber && (
                    <p className="text-sm text-gray-800 ml-4">Our File No./Claim No.: {reInfo.caseNumber}</p>
                  )}
                </div>
              )}

              {/* Letter Content */}
              <div className="space-y-6">
                {previewSections.map((section, index) => (
                  <Fragment key={section.id}>
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide underline">
                        {section.title}:
                      </h3>
                      <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm text-justify">
                        {section.content}
                      </div>
                    </div>
                    {index < previewSections.length - 1 && (
                      <div className="my-6 border-t border-gray-200" />
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Letter Footer */}
              <div className="mt-12 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">Respectfully submitted,</p>
                <div className="mt-6 space-y-1">
                  <p className="text-sm text-gray-600">{caseInfo?.attorneyName || '[Attorney Name]'}</p>
                  <p className="text-sm text-gray-600">{caseInfo?.lawFirmName || '[Law Firm Name]'}</p>
                  <p className="text-sm text-gray-600">{caseInfo?.address || '[Address]'}</p>
                  <p className="text-sm text-gray-600">{caseInfo?.phone ? `Tel: ${caseInfo.phone}` : '[Phone Number]'}</p>
                  <p className="text-sm text-gray-600">{caseInfo?.email || '[Email Address]'}</p>
                  {caseInfo?.stateBarNumber && (
                    <p className="text-sm text-gray-600">State Bar No. {caseInfo.stateBarNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-white">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-full font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleGenerateWord}
              disabled={isGenerating}
              className={`px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                isGenerating ? 'opacity-50 cursor-not-allowed' : ''
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Word Document
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
