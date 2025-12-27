'use client';

import { Fragment, useState } from 'react';
import { downloadStatusReportDocument, StatusReportData } from '@/lib/docx-generator';
import { UserProfile } from '@/lib/supabase/userProfileStorage';

interface CardSection {
  id: string;
  title: string;
  content: string;
}

interface ReportInfo {
  caseName: string;
  caseNumber: string;
  reportDate: string;
  preparedBy: string;
  preparedFor: string;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: CardSection[];
  reportInfo: ReportInfo;
  userProfile?: UserProfile;
}

export default function PreviewModal({ isOpen, onClose, sections, reportInfo, userProfile }: PreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter out Case Summary for preview
  const previewSections = sections.filter(s => s.id !== '0');

  const handleGenerateWord = async () => {
    setIsGenerating(true);
    try {
      const statusReportData: StatusReportData = {
        sections: sections,
        caseName: reportInfo.caseName,
        caseNumber: reportInfo.caseNumber,
        reportDate: reportInfo.reportDate,
        preparedBy: reportInfo.preparedBy || userProfile?.fullName || undefined,
        preparedFor: reportInfo.preparedFor,
        firmName: userProfile?.firmName || undefined,
        firmAddress: userProfile?.firmAddress || undefined,
        firmPhone: userProfile?.firmPhone || undefined,
        firmEmail: userProfile?.firmEmail || undefined,
      };

      await downloadStatusReportDocument(statusReportData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
              <h2 className="text-2xl font-bold">Status Report Preview</h2>
              {reportInfo.caseName && (
                <p className="text-sm text-blue-100 mt-1">{reportInfo.caseName}</p>
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
              {/* Report Header */}
              <div className="mb-8 text-center border-b-2 border-blue-600 pb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">CASE STATUS REPORT</h1>
                {userProfile?.firmName && (
                  <p className="text-lg font-semibold text-gray-700">{userProfile.firmName}</p>
                )}
              </div>

              {/* Report Info Grid */}
              <div className="mb-8 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Case Name</p>
                  <p className="text-sm text-gray-900 font-medium">{reportInfo.caseName || '[Case Name]'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Case Number</p>
                  <p className="text-sm text-gray-900 font-medium">{reportInfo.caseNumber || '[Case Number]'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Report Date</p>
                  <p className="text-sm text-gray-900 font-medium">{formatDate(reportInfo.reportDate) || '[Date]'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prepared By</p>
                  <p className="text-sm text-gray-900 font-medium">{reportInfo.preparedBy || userProfile?.fullName || '[Attorney Name]'}</p>
                </div>
                {reportInfo.preparedFor && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prepared For</p>
                    <p className="text-sm text-gray-900 font-medium">{reportInfo.preparedFor}</p>
                  </div>
                )}
              </div>

              {/* Report Content */}
              <div className="space-y-6">
                {previewSections.map((section, index) => (
                  <Fragment key={section.id}>
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-200 pb-2">
                        {index + 1}. {section.title}
                      </h3>
                      <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm text-justify">
                        {section.content}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              {/* Report Footer */}
              <div className="mt-12 pt-6 border-t-2 border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">— End of Report —</p>
                </div>
                <div className="mt-8 space-y-1 text-center text-sm text-gray-500">
                  {userProfile?.firmName && <p>{userProfile.firmName}</p>}
                  {userProfile?.firmAddress && <p>{userProfile.firmAddress}</p>}
                  {(userProfile?.firmPhone || userProfile?.firmEmail) && (
                    <p>
                      {userProfile?.firmPhone && `Tel: ${userProfile.firmPhone}`}
                      {userProfile?.firmPhone && userProfile?.firmEmail && ' | '}
                      {userProfile?.firmEmail}
                    </p>
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

