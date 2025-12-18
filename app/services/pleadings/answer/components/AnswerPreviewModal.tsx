'use client';

import { Fragment, useState } from 'react';
import { downloadWordDocument, AnswerData } from '@/lib/docx-generator';
import { AnswerSections } from '@/lib/supabase/caseStorage';
import { CaseCaptionData } from '../../complaint/components/CaseCaptionCard';

interface AnswerPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  answerSections: AnswerSections | null;
  captionData: Partial<CaseCaptionData>;
  formData: {
    plaintiffName: string;
    defendantName: string;
    // Attorney/Firm Information
    attorneyName?: string;
    stateBarNumber?: string;
    attorneyEmail?: string;
    lawFirmName?: string;
    addressLine1?: string;
    addressLine2?: string;
    phone?: string;
    fax?: string;
    // Court Information
    county?: string;
    courtDistrict?: string;
    caseNumber?: string;
    judgeName?: string;
    department?: string;
    actionFiled?: string;
    trialDate?: string;
    // Document Options
    useGeneralDenial?: boolean;
  };
  isMultipleDefendants?: boolean;
  showProofOfService?: boolean;
}

export default function AnswerPreviewModal({ 
  isOpen, 
  onClose, 
  answerSections, 
  captionData,
  formData,
  isMultipleDefendants = false,
  showProofOfService = false
}: AnswerPreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen || !answerSections) return null;

  // Format plaintiffs display
  const formatPlaintiffs = () => {
    const plaintiffs = captionData.plaintiffs?.filter(p => p.trim()) || [];
    if (plaintiffs.length > 0) return plaintiffs;
    return formData.plaintiffName ? [formData.plaintiffName] : ['[PLAINTIFF NAME]'];
  };

  // Format defendants display
  const formatDefendants = () => {
    const defendants = captionData.defendants?.filter(d => d.trim()) || [];
    if (defendants.length > 0) return defendants;
    return formData.defendantName ? [formData.defendantName] : ['[DEFENDANT NAME]'];
  };

  // Get attorneys from caption data or fallback to formData
  const getAttorneys = () => {
    if (captionData.attorneys && captionData.attorneys.length > 0) {
      return captionData.attorneys;
    }
    // Fallback to formData
    return [{
      id: '1',
      name: formData.attorneyName || '',
      barNumber: formData.stateBarNumber || '',
      firm: formData.lawFirmName || '',
      address: [formData.addressLine1, formData.addressLine2].filter(Boolean).join(', '),
      phone: formData.phone || '',
      fax: formData.fax || '',
      email: formData.attorneyEmail || '',
    }];
  };

  const handleGenerateWord = async () => {
    setIsGenerating(true);
    try {
      // Reconstruct the full answer text
      const defensesText = answerSections.defenses
        .map(def => def.fullText)
        .join('\n\n');
      
      const fullAnswer = [
        answerSections.preamble,
        defensesText,
        answerSections.prayer,
        answerSections.signature,
      ]
        .filter(Boolean)
        .join('\n\n');

      // Prepare structured answer sections for better Word output
      const answerSectionsData = {
        preamble: answerSections.preamble || '',
        defenses: answerSections.defenses.map(def => ({
          number: def.number,
          causesOfAction: def.causesOfAction || undefined,
          title: def.title || undefined,
          content: def.content
        })),
        prayer: answerSections.prayer || '',
        signature: answerSections.signature || ''
      };

      const primaryAttorney = getAttorneys()[0];

      const answerData: AnswerData = {
        plaintiffName: formatPlaintiffs().join(', '),
        defendantName: formatDefendants().join(', '),
        generatedAnswer: fullAnswer,
        answerSections: answerSectionsData,
        isMultipleDefendants: isMultipleDefendants,
        // Attorney/Firm Information
        attorneyName: primaryAttorney?.name || undefined,
        stateBarNumber: primaryAttorney?.barNumber || undefined,
        email: primaryAttorney?.email || undefined,
        lawFirmName: primaryAttorney?.firm || undefined,
        addressLine1: primaryAttorney?.address || undefined,
        addressLine2: undefined,
        phone: primaryAttorney?.phone || undefined,
        fax: primaryAttorney?.fax || undefined,
        // Court Information
        county: captionData.county || formData.county || undefined,
        courtDistrict: formData.courtDistrict || undefined,
        caseNumber: captionData.caseNumber || formData.caseNumber || undefined,
        judge: captionData.judgeName || formData.judgeName || undefined,
        department: captionData.departmentNumber || formData.department || undefined,
        actionFiled: captionData.complaintFiledDate || formData.actionFiled || undefined,
        trialDate: captionData.trialDate || formData.trialDate || undefined,
        // Document Options
        useGeneralDenial: formData.useGeneralDenial ?? true,
      };

      await downloadWordDocument(answerData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const attorneys = getAttorneys();
  const primaryAttorney = attorneys[0];

  return (
    <>
      {/* Success Toast - Outside modal for proper fixed positioning */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Answer generated successfully!</span>
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
                <h2 className="text-2xl font-bold">Answer Preview</h2>
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
              <div className="max-w-3xl mx-auto bg-white shadow-lg font-serif text-black p-8">
                {/* Attorney Header - Left Aligned (Pleading Paper Style) */}
                <div className="mb-6 space-y-0 text-sm leading-6">
                  {attorneys.map((attorney, index) => (
                    <div key={index} className="text-black">
                      <p>{attorney.name || '[ATTORNEY NAME]'}, State Bar No. {attorney.barNumber || '[BAR NUMBER]'}</p>
                      <p>{attorney.firm || '[LAW FIRM]'}</p>
                      <p>{attorney.address || '[ADDRESS]'}</p>
                      <p>Telephone: {attorney.phone || '[PHONE]'}</p>
                      <p>Facsimile: {attorney.fax || '[Fax Number]'}</p>
                      <p>{attorney.email || '[EMAIL]'}</p>
                      {index < attorneys.length - 1 && <div className="my-2" />}
                    </div>
                  ))}
                  <p className="mt-2 text-black">
                    Attorney for Defendant {formatDefendants().join(', ')}
                  </p>
                </div>

                {/* Court Header */}
                <div className="text-center mb-8 uppercase font-bold text-black">
                  <p>SUPERIOR COURT OF THE STATE OF CALIFORNIA</p>
                  <p>COUNTY OF {(captionData.county || formData.county || '[COUNTY]').toUpperCase()}</p>
                </div>

                {/* Case Caption Table */}
                <div className="mb-8 border-2 border-black">
                  <div className="flex">
                    {/* Left side - Parties */}
                    <div className="w-1/2 p-4 border-r-2 border-black">
                      <div className="mb-4">
                        {formatPlaintiffs().map((plaintiff, index) => (
                          <p key={index} className="text-sm text-black">{plaintiff},</p>
                        ))}
                        <p className="text-sm indent-8 text-black">Plaintiff,</p>
                      </div>
                      <p className="text-sm my-4 text-black">vs.</p>
                      <div>
                        {formatDefendants().map((defendant, index) => (
                          <p key={index} className="text-sm text-black">{defendant},</p>
                        ))}
                        <p className="text-sm indent-8 text-black">Defendant.</p>
                      </div>
                    </div>
                    
                    {/* Right side - Case Info */}
                    <div className="w-1/2 p-4 space-y-2">
                      <p className="text-sm text-black">Case No. {captionData.caseNumber || formData.caseNumber || '[CASE NUMBER]'}</p>
                      {(captionData.judgeName || formData.judgeName) && (
                        <>
                          <p className="text-sm text-black">Assigned for All Purposes to:</p>
                          <p className="text-sm text-black">Hon. {captionData.judgeName || formData.judgeName}</p>
                        </>
                      )}
                      {(captionData.departmentNumber || formData.department) && (
                        <p className="text-sm text-black">Dept. {captionData.departmentNumber || formData.department}</p>
                      )}
                      
                      {/* Document Type */}
                      <div className="mt-4">
                        <p className="text-sm font-bold text-black uppercase">
                          DEFENDANT {formatDefendants().join(', ').toUpperCase()}&apos;S ANSWER TO PLAINTIFFS&apos; COMPLAINT; DEMAND FOR JURY TRIAL
                        </p>
                      </div>
                      
                      {(captionData.complaintFiledDate || formData.actionFiled) && (
                        <p className="text-sm mt-4 text-black">
                          Action Filed: {new Date(captionData.complaintFiledDate || formData.actionFiled || '').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                      {(captionData.trialDate || formData.trialDate) && (
                        <p className="text-sm text-black">
                          Trial Date: {captionData.trialDate || formData.trialDate === 'None' ? 'None' : new Date(captionData.trialDate || formData.trialDate || '').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preamble */}
                {answerSections.preamble && (
                  <div className="mb-8">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed text-justify text-black">
                      {answerSections.preamble}
                    </div>
                  </div>
                )}

                {/* Defenses */}
                {answerSections.defenses.length > 0 && (
                  <div className="space-y-6 mb-8">
                    {answerSections.defenses.map((defense, index) => (
                      <Fragment key={defense.id}>
                        <div className="mb-6">
                          <h3 className="text-base font-bold text-black mb-3 uppercase tracking-wide text-center">
                            {defense.number} AFFIRMATIVE DEFENSE
                          </h3>
                          {defense.causesOfAction && (
                            <p className="text-sm text-black text-center mb-2">
                              ({defense.causesOfAction})
                            </p>
                          )}
                          {defense.title && (
                            <p className="text-sm text-black text-center mb-4">
                              ({defense.title})
                            </p>
                          )}
                          <div className="text-sm whitespace-pre-wrap leading-relaxed text-justify text-black">
                            {defense.content}
                          </div>
                        </div>
                        {index < answerSections.defenses.length - 1 && (
                          <div className="my-6 border-t border-gray-200" />
                        )}
                      </Fragment>
                    ))}
                  </div>
                )}

                {/* Prayer */}
                {answerSections.prayer && (
                  <div className="mb-8">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed text-justify text-black">
                      {answerSections.prayer}
                    </div>
                  </div>
                )}

                {/* Signature */}
                <div className="mt-12 pt-6 border-t border-gray-200">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed text-black">
                    {(() => {
                      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                      const attorneyName = primaryAttorney?.name || '[ATTORNEY NAME]';
                      const barNumber = primaryAttorney?.barNumber || '[BAR NUMBER]';
                      const firmName = primaryAttorney?.firm || '';
                      const defendantName = formatDefendants()[0] || '[DEFENDANT NAME]';
                      
                      return `Dated: ${currentDate}

Respectfully submitted,

${firmName ? firmName + '\n\n' : ''}

________________________________
${attorneyName}
State Bar No. ${barNumber}
Attorney for Defendant ${defendantName}`;
                    })()}
                  </div>
                </div>

                {/* Proof of Service indicator */}
                {showProofOfService && (
                  <div className="mt-12 pt-6 border-t-2 border-black">
                    <p className="text-center font-bold uppercase text-black">PROOF OF SERVICE</p>
                    <p className="text-sm text-gray-600 text-center mt-2">[Proof of Service will be included in Word document]</p>
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
