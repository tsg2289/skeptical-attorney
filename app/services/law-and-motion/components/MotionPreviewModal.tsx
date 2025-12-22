'use client';

import { useState } from 'react';
import { 
  downloadMotionDocuments,
  NoticeOfMotionDocumentData,
  MemorandumDocumentData 
} from '@/lib/docx-generator';
import { CaseCaptionData } from '../../pleadings/complaint/components/CaseCaptionCard';
import { ArgumentSubsection, DeclarationFact } from './MotionForm';

interface MotionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  motionType: string;
  captionData: CaseCaptionData & { hearingDate?: string; hearingTime?: string };
  noticeOfMotion: {
    reliefSought: string;
    reliefSoughtSummary?: string;
    argumentSummary?: string;
    applicableRule?: string;
  };
  memorandum: {
    introduction: string;
    facts: string;
    law: string;
    argument: string;
    argumentSubsections: ArgumentSubsection[];
    conclusion: string;
  };
  declaration: {
    declarantName: string;
    barNumber: string;
    facts: DeclarationFact[];
  };
  movingParty: 'plaintiff' | 'defendant';
  showProofOfService?: boolean;
  proofOfServiceText?: string;
}

export default function MotionPreviewModal({ 
  isOpen, 
  onClose, 
  motionType,
  captionData,
  noticeOfMotion,
  memorandum,
  declaration,
  movingParty,
  showProofOfService = false,
  proofOfServiceText = ''
}: MotionPreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  // Get motion title
  const getMotionTitle = (type: string): string => {
    const titles: Record<string, string> = {
      'motion-to-compel-discovery': 'Motion to Compel Discovery',
      'motion-to-compel-deposition': 'Motion to Compel Deposition',
      'demurrer': 'Demurrer',
      'motion-to-strike': 'Motion to Strike',
      'motion-for-summary-judgment': 'Motion for Summary Judgment',
      'motion-for-summary-adjudication': 'Motion for Summary Adjudication',
      'motion-in-limine': 'Motion in Limine',
      'motion-for-protective-order': 'Motion for Protective Order',
      'motion-to-quash-subpoena': 'Motion to Quash Subpoena',
      'motion-for-sanctions': 'Motion for Sanctions',
      'ex-parte-application': 'Ex Parte Application',
      'opposition': 'Opposition',
      'reply': 'Reply Brief',
    };
    return titles[type] || 'Motion';
  };

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

  // Get moving party name
  const getMovingPartyName = () => {
    if (movingParty === 'plaintiff') {
      return formatPlaintiffs()[0];
    }
    return formatDefendants()[0]?.replace(', DOES 1 through 50, inclusive', '') || '[DEFENDANT]';
  };

  const handleGenerateDocuments = async () => {
    setIsGenerating(true);
    try {
      const primaryAttorney = captionData.attorneys?.[0];
      const plaintiffName = captionData.plaintiffs.filter(p => p.trim())[0] || '[PLAINTIFF]';
      const defendantName = captionData.defendants.filter(d => d.trim())[0] || '[DEFENDANT]';
      
      // Prepare Notice data
      const noticeData: NoticeOfMotionDocumentData = {
        motionType,
        plaintiffName,
        defendantName,
        movingParty,
        attorneyName: primaryAttorney?.name || undefined,
        stateBarNumber: primaryAttorney?.barNumber || undefined,
        email: primaryAttorney?.email || undefined,
        lawFirmName: primaryAttorney?.firm || undefined,
        address: primaryAttorney?.address || undefined,
        phone: primaryAttorney?.phone || undefined,
        county: captionData.county || 'LOS ANGELES',
        caseNumber: captionData.caseNumber || undefined,
        judgeName: captionData.judgeName || undefined,
        departmentNumber: captionData.departmentNumber || undefined,
        hearingDate: captionData.hearingDate || undefined,
        hearingTime: captionData.hearingTime || '8:30 a.m.',
        reliefSought: noticeOfMotion.reliefSought || undefined,
        includeProofOfService: showProofOfService,
        proofOfServiceText: showProofOfService ? proofOfServiceText : undefined,
      };
      
      // Prepare Memorandum data
      const memoData: MemorandumDocumentData = {
        motionType,
        plaintiffName,
        defendantName,
        movingParty,
        attorneyName: primaryAttorney?.name || undefined,
        stateBarNumber: primaryAttorney?.barNumber || undefined,
        email: primaryAttorney?.email || undefined,
        lawFirmName: primaryAttorney?.firm || undefined,
        address: primaryAttorney?.address || undefined,
        phone: primaryAttorney?.phone || undefined,
        county: captionData.county || 'LOS ANGELES',
        caseNumber: captionData.caseNumber || undefined,
        judgeName: captionData.judgeName || undefined,
        departmentNumber: captionData.departmentNumber || undefined,
        hearingDate: captionData.hearingDate || undefined,
        hearingTime: captionData.hearingTime || '8:30 a.m.',
        introduction: memorandum.introduction || undefined,
        facts: memorandum.facts || undefined,
        law: memorandum.law || undefined,
        argument: memorandum.argument || undefined,
        argumentSubsections: memorandum.argumentSubsections || [],
        conclusion: memorandum.conclusion || undefined,
        declarantName: declaration.declarantName || primaryAttorney?.name || undefined,
        declarantBarNumber: declaration.barNumber || primaryAttorney?.barNumber || undefined,
        declarationFacts: declaration.facts?.filter(f => f.content.trim()) || [],
      };
      
      await downloadMotionDocuments(noticeData, memoData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating motion documents:', error);
      alert('Failed to generate Word documents. Please try again.');
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
            <span className="font-medium">Motion documents generated successfully!</span>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
              <div>
                <h2 className="text-2xl font-bold">Motion Preview</h2>
                <p className="text-sm text-blue-100 mt-1">
                  {getMotionTitle(motionType)} - {formatPlaintiffs()[0]} v. {formatDefendants()[0]}
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
              {/* Document Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-900 font-medium">This will generate two separate Word documents:</p>
                <ul className="text-blue-700 text-sm mt-1 list-disc list-inside">
                  <li>Notice of Motion {showProofOfService && '(with Proof of Service)'}</li>
                  <li>Memorandum of Points and Authorities (with Declaration)</li>
                </ul>
              </div>

              <div className="max-w-3xl mx-auto bg-white shadow-lg font-serif text-black p-8">
                {/* Attorney Header - Left Aligned (Pleading Paper Style) */}
                <div className="mb-6 space-y-0 text-sm leading-6">
                  {captionData.attorneys.map((attorney, index) => (
                    <div key={index} className="text-black">
                      <p>{attorney.name || '[ATTORNEY NAME]'}, State Bar No. {attorney.barNumber || '[BAR NUMBER]'}</p>
                      <p>{attorney.firm || '[LAW FIRM]'}</p>
                      <p>{attorney.address || '[ADDRESS]'}</p>
                      <p>Telephone: {attorney.phone || '[PHONE]'}</p>
                      <p>{attorney.email || '[EMAIL]'}</p>
                      {index < captionData.attorneys.length - 1 && <div className="my-2" />}
                    </div>
                  ))}
                  <p className="mt-2 text-black">
                    Attorney for {movingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'} {getMovingPartyName()}
                  </p>
                </div>

                {/* Court Header */}
                <div className="text-center mb-8 uppercase font-bold text-black">
                  <p>SUPERIOR COURT OF THE STATE OF CALIFORNIA</p>
                  <p>COUNTY OF {captionData.county.toUpperCase() || '[COUNTY]'}</p>
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
                        <p className="text-sm indent-8 text-black">Plaintiff(s),</p>
                      </div>
                      <p className="text-sm my-4 text-black">vs.</p>
                      <div>
                        {formatDefendants().map((defendant, index) => (
                          <p key={index} className="text-sm text-black">{defendant},</p>
                        ))}
                        <p className="text-sm indent-8 text-black">Defendant(s).</p>
                      </div>
                    </div>
                    
                    {/* Right side - Case Info */}
                    <div className="w-1/2 p-4 space-y-2">
                      <p className="text-sm text-black">Case No.: {captionData.caseNumber || '[CASE NUMBER]'}</p>
                      {captionData.judgeName && (
                        <p className="text-sm text-black">Honorable {captionData.judgeName}</p>
                      )}
                      {captionData.departmentNumber && (
                        <p className="text-sm text-black">Dept. {captionData.departmentNumber}</p>
                      )}
                      
                      {/* Hearing Info */}
                      {captionData.hearingDate && (
                        <div className="mt-2 text-sm text-black border-t border-gray-300 pt-2">
                          <p>Hearing Date: {new Date(captionData.hearingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                          <p>Time: {captionData.hearingTime || '8:30 a.m.'}</p>
                        </div>
                      )}
                      
                      {/* Document Type */}
                      <div className="mt-4">
                        <p className="text-sm font-bold text-black uppercase">
                          NOTICE OF {getMotionTitle(motionType).toUpperCase()}
                        </p>
                        <p className="text-xs text-black mt-1">
                          MEMORANDUM OF POINTS AND AUTHORITIES
                        </p>
                        <p className="text-xs text-black">
                          DECLARATION OF {(declaration.declarantName || captionData.attorneys[0]?.name || '[ATTORNEY]').toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notice of Motion Preview */}
                <div className="mb-8">
                  <h3 className="text-base font-bold text-center mb-4 uppercase text-black">
                    NOTICE OF MOTION AND MOTION
                  </h3>
                  <div className="text-sm leading-relaxed text-justify text-black space-y-4">
                    <p>
                      <strong>TO ALL PARTIES AND THEIR ATTORNEYS OF RECORD:</strong>
                    </p>
                    <p>
                      PLEASE TAKE NOTICE that on{' '}
                      {captionData.hearingDate 
                        ? new Date(captionData.hearingDate).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) 
                        : '[DATE]'}{' '}
                      at {captionData.hearingTime || '[TIME]'}, or as soon thereafter as the matter may be heard, 
                      in Department {captionData.departmentNumber || '[DEPT]'} of the above-entitled Court,{' '}
                      {movingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'} {getMovingPartyName()} will move the Court for an order{' '}
                      {noticeOfMotion.reliefSoughtSummary || noticeOfMotion.reliefSought || '[RELIEF SOUGHT]'}.
                    </p>
                    
                    {noticeOfMotion.argumentSummary && (
                      <p>
                        {noticeOfMotion.argumentSummary}
                      </p>
                    )}
                    
                    <p>
                      This motion is based upon this Notice of Motion, the attached 
                      Memorandum of Points and Authorities, the Declaration of{' '}
                      {declaration.declarantName || captionData.attorneys[0]?.name || '[ATTORNEY]'}, Esq., 
                      and upon all of the pleadings and records contained in the Court file herein, and upon such 
                      oral and documentary evidence as may be presented at the time of hearing on this motion.
                    </p>
                  </div>
                </div>

                {/* Memorandum Preview */}
                <div className="space-y-6">
                  <h3 className="text-base font-bold text-center mb-4 uppercase text-black">
                    MEMORANDUM OF POINTS AND AUTHORITIES
                  </h3>
                  
                  {memorandum.introduction && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 text-black">I. INTRODUCTION</h4>
                      <p className="text-sm leading-relaxed text-justify text-black">{memorandum.introduction}</p>
                    </div>
                  )}
                  
                  {memorandum.facts && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 text-black">II. STATEMENT OF FACTS</h4>
                      <p className="text-sm leading-relaxed text-justify text-black whitespace-pre-wrap">{memorandum.facts}</p>
                    </div>
                  )}
                  
                  {memorandum.law && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 text-black">III. APPLICABLE LAW</h4>
                      <p className="text-sm leading-relaxed text-justify text-black whitespace-pre-wrap">{memorandum.law}</p>
                    </div>
                  )}
                  
                  {memorandum.argument && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 text-black">IV. ARGUMENT</h4>
                      <p className="text-sm leading-relaxed text-justify text-black whitespace-pre-wrap">{memorandum.argument}</p>
                      
                      {memorandum.argumentSubsections.map((sub) => (
                        <div key={sub.id} className="mt-4 ml-4">
                          <h5 className="text-sm font-bold mb-2 text-black">{sub.letter}. {sub.title}</h5>
                          <p className="text-sm leading-relaxed text-justify text-black whitespace-pre-wrap">{sub.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {memorandum.conclusion && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 text-black">V. CONCLUSION</h4>
                      <p className="text-sm leading-relaxed text-justify text-black whitespace-pre-wrap">{memorandum.conclusion}</p>
                    </div>
                  )}
                </div>

                {/* Declaration Preview */}
                {declaration.facts.some(f => f.content.trim()) && (
                  <div className="mt-8 pt-6 border-t-2 border-black">
                    <h3 className="text-base font-bold text-center mb-4 uppercase text-black">
                      DECLARATION OF {(declaration.declarantName || captionData.attorneys[0]?.name || '[ATTORNEY]').toUpperCase()}
                    </h3>
                    <div className="text-sm leading-relaxed text-black">
                      <p className="mb-4">
                        I, {declaration.declarantName || captionData.attorneys[0]?.name || '[ATTORNEY NAME]'}, declare:
                      </p>
                      {declaration.facts.filter(f => f.content.trim()).map((fact) => (
                        <p key={fact.id} className="mb-3 text-justify">
                          {fact.number}. {fact.content}
                        </p>
                      ))}
                      <p className="mt-6">
                        I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.
                      </p>
                    </div>
                  </div>
                )}

                {/* Proof of Service */}
                {showProofOfService && proofOfServiceText && (
                  <div className="mt-12 pt-6 border-t-2 border-black">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed text-black">
                      {proofOfServiceText}
                    </div>
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
                onClick={handleGenerateDocuments}
                disabled={isGenerating}
                className={`px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 ${
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
                    Generate Word Documents
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

