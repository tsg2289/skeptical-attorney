'use client';

import { useState } from 'react';
import { downloadComplaintDocument, ComplaintData } from '@/lib/docx-generator';
import { ComplaintSection } from '@/lib/supabase/caseStorage';
import { CaseCaptionData } from './CaseCaptionCard';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ComplaintSection[];
  captionData: CaseCaptionData;
  showProofOfService?: boolean;
}

export default function PreviewModal({ 
  isOpen, 
  onClose, 
  sections, 
  captionData,
  showProofOfService = false 
}: PreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter out header section for preview (we'll render caption separately)
  const previewSections = sections.filter(s => s.type !== 'header');

  // Format plaintiffs display
  const formatPlaintiffs = () => {
    const plaintiffs = captionData.plaintiffs.filter(p => p.trim());
    return plaintiffs.length > 0 ? plaintiffs : ['[PLAINTIFF NAME]'];
  };

  // Format defendants display
  const formatDefendants = () => {
    const defendants = captionData.defendants.filter(d => d.trim());
    const formattedDefendants = defendants.length > 0 ? defendants : ['[DEFENDANT NAME]'];
    if (captionData.includeDoes) {
      return [...formattedDefendants, 'DOES 1 through 50, inclusive'];
    }
    return formattedDefendants;
  };

  const handleGenerateWord = async () => {
    setIsGenerating(true);
    try {
      // Build complaint data from sections and caption data
      const complaintText = sections
        .filter(s => s.type !== 'header')
        .map(s => s.content)
        .join('\n\n');

      // Join multiple plaintiffs/defendants for the Word document
      const plaintiffNames = captionData.plaintiffs.filter(Boolean).join(', ') || '[PLAINTIFF NAME]';
      const defendantNames = captionData.defendants.filter(Boolean).join(', ') || '[DEFENDANT NAME]';
      
      // Use first attorney for Word document header (primary attorney)
      const primaryAttorney = captionData.attorneys[0];
      
      // Format defendant names with Does if enabled
      const defendantDisplay = captionData.includeDoes 
        ? `${defendantNames}; and DOES 1 through 50, inclusive`
        : defendantNames;

      const complaintData: ComplaintData = {
        plaintiffName: plaintiffNames,
        defendantName: defendantDisplay,
        complaintText,
        attorneyName: primaryAttorney?.name || undefined,
        stateBarNumber: primaryAttorney?.barNumber || undefined,
        email: primaryAttorney?.email || undefined,
        lawFirmName: primaryAttorney?.firm || undefined,
        address: primaryAttorney?.address || undefined,
        phone: primaryAttorney?.phone || undefined,
        fax: primaryAttorney?.fax || undefined,
        county: captionData.county || 'LOS ANGELES',
        caseNumber: captionData.caseNumber || undefined,
        judgeName: captionData.judgeName || undefined,
        departmentNumber: captionData.departmentNumber || undefined,
        complaintFiledDate: captionData.complaintFiledDate || undefined,
        trialDate: captionData.trialDate || undefined,
        includeProofOfService: showProofOfService,
      };

      await downloadComplaintDocument(complaintData);
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
            <span className="font-medium">Complaint generated successfully!</span>
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
                <h2 className="text-2xl font-bold">Complaint Preview</h2>
                <p className="text-sm text-blue-100 mt-1">
                  {formatPlaintiffs()[0]} v. {formatDefendants()[0]}
                </p>
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
              <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg font-serif">
                {/* Attorney Header */}
                <div className="text-center mb-8 space-y-1">
                  {captionData.attorneys.map((attorney, index) => (
                    <div key={index} className="text-sm">
                      <p className="font-bold">{attorney.name || '[ATTORNEY NAME]'} (SBN: {attorney.barNumber || '[BAR NUMBER]'})</p>
                      <p>{attorney.firm || '[LAW FIRM]'}</p>
                      <p>{attorney.address || '[ADDRESS]'}</p>
                      <p>Tel: {attorney.phone || '[PHONE]'} | Email: {attorney.email || '[EMAIL]'}</p>
                      {index < captionData.attorneys.length - 1 && <div className="my-2" />}
                    </div>
                  ))}
                  <p className="text-sm mt-2">Attorney(s) for Plaintiff(s)</p>
                </div>

                {/* Court Header */}
                <div className="text-center mb-8 uppercase font-bold">
                  <p>SUPERIOR COURT OF THE STATE OF CALIFORNIA</p>
                  <p>FOR THE COUNTY OF {captionData.county.toUpperCase() || '[COUNTY]'}</p>
                </div>

                {/* Case Caption Table */}
                <div className="mb-8 border-2 border-black">
                  <div className="flex">
                    {/* Left side - Parties */}
                    <div className="w-1/2 p-4 border-r-2 border-black">
                      <div className="mb-4">
                        {formatPlaintiffs().map((plaintiff, index) => (
                          <p key={index} className="text-sm">{plaintiff},</p>
                        ))}
                        <p className="text-sm indent-8">Plaintiff(s),</p>
                      </div>
                      <p className="text-sm my-4">vs.</p>
                      <div>
                        {formatDefendants().map((defendant, index) => (
                          <p key={index} className="text-sm">{defendant},</p>
                        ))}
                        <p className="text-sm indent-8">Defendant(s).</p>
                      </div>
                    </div>
                    
                    {/* Right side - Case Info */}
                    <div className="w-1/2 p-4 space-y-2">
                      <p className="text-sm">Case No.: {captionData.caseNumber || '[CASE NUMBER]'}</p>
                      {captionData.judgeName && (
                        <p className="text-sm">Honorable {captionData.judgeName}</p>
                      )}
                      {captionData.departmentNumber && (
                        <p className="text-sm">Dept. {captionData.departmentNumber}</p>
                      )}
                      <p className="text-sm font-bold mt-4">{captionData.documentType}</p>
                      {captionData.demandJuryTrial && (
                        <p className="text-sm font-bold">[DEMAND FOR JURY TRIAL]</p>
                      )}
                      {captionData.complaintFiledDate && (
                        <p className="text-sm mt-4">
                          Complaint Filed: {new Date(captionData.complaintFiledDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                      {captionData.trialDate && (
                        <p className="text-sm">
                          Trial Date: {new Date(captionData.trialDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Complaint Body */}
                <div className="space-y-6">
                  {previewSections.map((section) => (
                    <div key={section.id} className="mb-6">
                      {section.title && (
                        <h3 className="text-base font-bold text-center mb-4 uppercase">
                          {section.title}
                        </h3>
                      )}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed text-justify">
                        {section.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Proof of Service indicator */}
                {showProofOfService && (
                  <div className="mt-12 pt-6 border-t-2 border-black">
                    <p className="text-center font-bold uppercase">PROOF OF SERVICE</p>
                    <p className="text-sm text-gray-500 text-center mt-2">[Proof of Service will be included in Word document]</p>
                  </div>
                )}
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

