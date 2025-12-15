'use client';

import { Fragment, useState } from 'react';
import { downloadDemandLetterDocument, DemandLetterData } from '@/lib/docx-generator';
import { DemandLetterSection } from '@/lib/supabase/caseStorage';

// Type alias for backward compatibility
type CardSection = DemandLetterSection;

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
}

export default function PreviewModal({ isOpen, onClose, sections, caseInfo }: PreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

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
        // Attorney info
        attorneyName: caseInfo?.attorneyName,
        stateBarNumber: caseInfo?.stateBarNumber,
        email: caseInfo?.email,
        lawFirmName: caseInfo?.lawFirmName,
        address: caseInfo?.address,
        phone: caseInfo?.phone,
      };

      await downloadDemandLetterDocument(demandLetterData);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
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
              {/* Letter Header */}
              <div className="mb-8 text-right">
                <p className="text-sm text-gray-600">{new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>

              {/* Letter Content */}
              <div className="space-y-6">
                {previewSections.map((section, index) => (
                  <Fragment key={section.id}>
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide">
                        {section.title}
                      </h3>
                      <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
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
  );
}

