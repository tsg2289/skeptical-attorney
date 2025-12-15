'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import Card from './ui/Card';

interface TemplateSection {
  id: string;
  content: string;
  title?: string;
  isEditing: boolean;
}

interface EditableTextareaProps {
  section: TemplateSection;
  onUpdate: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditableTextarea({ section, onUpdate, onSave, onCancel }: EditableTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea when component mounts (entering edit mode)
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        // Reset height to auto to get the correct scrollHeight
        textareaRef.current.style.height = 'auto';
        // Set height based on scrollHeight
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        // Focus and place cursor at the end
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 10);

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // Separate effect for auto-resizing on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
    // Auto-resize on input
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Allow normal textarea click behavior to position cursor
    // Ensure focus on click
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="relative"
    >
      <textarea
        ref={textareaRef}
        value={section.content}
        onChange={handleChange}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            onCancel();
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSave();
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Allow normal textarea click behavior to position cursor
        }}
        onMouseDown={handleMouseDown}
        onFocus={(e) => e.stopPropagation()}
        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y overflow-auto"
        style={{ minHeight: '100px' }}
        autoFocus
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500">Press Escape to cancel or Cmd/Ctrl+Enter to save</p>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onSave();
            }}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onCancel();
            }}
            className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface AgreementFormProps {
  caseId?: string | null;
}

export default function AgreementForm({ caseId }: AgreementFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([
    {
      id: '1',
      title: 'Preamble',
      content: 'This Confidential Settlement Agreement and Release ("Agreement") is entered into by and between Plaintiff [NAME] ("Employee", or "Plaintiff") on the one part and Defendants [NAME] ("Defendants") on the other part.  Plaintiff and Defendants shall sometimes be referred to herein collectively as the "Parties".',
      isEditing: false,
    },
    {
      id: '2',
      content: `R E C I T A L S

A.        	WHEREAS, Plaintiff filed a lawsuit against Defendants in the name of County Superior Court, entitled [case Title , Case No. [case number], alleging various causes of action relating to Plaintiff's former employment with Defendants, including claims for wage and hour violations and discrimination ("Action").  Defendants filed an answer to the complaint, denying the material allegations thereof;

B.         	WHEREAS, Plaintiff was an employee of Defendant.

C.         	WHEREAS, Defendant admits no liability to Plaintiff and would like to buy its peace and avoid further litigation;

D.        	WHEREAS, the Parties acknowledge and agree that this Agreement is the result of a compromise of disputed claims and is not in any way to be construed as an admission or confession of liability, culpability, or improper conduct of any kind.  Plaintiff recognizes and acknowledges that Defendants specifically disclaim any liability or impropriety. 

E.         	WHEREAS, the Parties now desire to resolve this dispute and to otherwise settle all claims that Plaintiff might have against Defendants, including any and all claims relating, or allegedly relating, Plaintiff's former employment with Defendants, including any claims relating to the Action, as well as any other causes of action for any type of discrimination, harassment and retaliation, denial of a work environment free of discrimination and/or retaliation; failure to prevent harassment and discrimination; intentional infliction of emotional distress; negligent supervision, hiring, training and retention; breach of contract (express oral, actual or implied); financial injury; physical injury or emotional injury; claims under any federal, state or local law relating to employment and/or the termination thereof, including any claims for wages, including vacation, wages, commissions, bonuses and any other compensation allegedly unpaid. 

        	NOW, THEREFORE, and in consideration of the mutual covenants, conditions and promises herein contained, and other good and valuable consideration, including the release set forth herein, the sufficiency of which is hereby acknowledged, the Parties hereto agree as follows:`,
      isEditing: false,
    },
    {
      id: '3',
      content: `1.          	Consideration.  In consideration for the settlement of this matter, Defendants agree to pay Plaintiff the total gross sum of [Settlement Sum],  ("Settlement Payment").  The Settlement Payment shall be made within 30 days of Plaintiff's execution of this Agreement and after any necessary completed W-9 Forms have been produced to Defendants.   

The Settlement Payment shall be paid in as follows:

a)          	Defendant, by and through its insurer, shall issue one check in the amount of [Settlement Sum], made payable to [Account Payable To]  Plaintiff states and represents that this amount encompasses and is intended to compensate Plaintiff for any and all damages he allegedly suffered due to the alleged conduct of Defendant and the Releasees, as that term is defined below.  This lump sum is being paid as compensation for Plaintiff's alleged economic and non-economic losses.  Further, Plaintiff states and represents that this amount encompasses and is intended to compensate his legal counsel for the legal fees and costs Plaintiff claims his counsel is entitled to receive under the Labor Code or other governing law in connection with the matter.  Plaintiff further and agrees to the terms of indemnification as identified in Paragraphs 2 and 9 (and anywhere else applicable in this Agreement).

        	Defendants, by and through their insurer, will issue all legally required IRS Form 1099 for the payments detailed in Sections 1(a), above.`,
      isEditing: false,
    },
    {
      id: '4',
      content: `2.          	Responsibility for Tax Obligations.  Defendants makes no representations with respect to any income tax consequences which may flow from the above payment of Settlement Payment.  Plaintiff has had an opportunity to seek advice from an attorney or tax advisor regarding the tax consequences of the payments and benefits provided for in this Agreement and has not relied on any representations by Defendant regarding the tax consequences of such payments and benefits.  Plaintiff agrees to indemnify Defendants and the Releasees and to hold them harmless for all taxes, penalties and interest, withholding or otherwise, for which the Defendants or the Releasees may be found liable as a consequence of having paid monies to Plaintiff under this Agreement. It is expressly agreed that if the Defendants or any of the Releasees are/is required to provide payments for taxes or interest or penalties to any taxing authority, Plaintiff shall reimburse the Defendants or the Releasees for such payments within thirty (30) calendar days after the Defendants or any of the Releasees notifies Plaintiff, in writing, with accompanying evidence that such payments were made, that the Defendants or any of the Releasees has incurred such liability.`,
      isEditing: false,
    },
    {
      id: '5',
      content: `3.          	Complete and General Release.  Plaintiff, on behalf of herself and his respective past, present and future representatives, attorneys, agents, heirs, successors and assigns, hereby finally and forever releases, holds harmless and discharges Defendants and its partners, associates, employees, shareholders, officers, directors, former officers, directors or employees, attorneys, agents, insurers, affiliates, subsidiaries and related companies and their respective heirs, personal representatives, predecessors, successors and assigns, and all other persons acting through, by or under, or in concert with, any of the foregoing ("Releasees"), of and from any and all actions, complaints, causes of action, claims, demands, promises or rights of any nature, costs, attorneys' fees, liabilities, losses, expenses, agreements, commitments, indebtedness and obligations of every nature and kind, whatsoever, contingent or non-contingent, matured or un-matured, liquidated or un-liquidated, whether or not known, suspect or claimed which Plaintiff may ever have had, now has or may claim to have had as of the date of this Agreement against Defendants by reason of any act or omission whatsoever, concerning any matter, cause or thing allegedly arising out of or in connection with the Action or relating to the claims made in the Action.  The claims released also include, but are not limited to, any and all claims arising from or in any way related to Plaintiff's former employment with Defendants and the separation from that employment.  These claims include, but are not limited to, claims based on the Action, as well as any claim for any type of discrimination, harassment and retaliation, denial of a work environment free of discrimination and/or retaliation; failure to prevent harassment and discrimination; intentional infliction of emotional distress; negligent supervision, hiring, training and retention; breach of contract (express oral, actual or implied); financial injury; physical injury or emotional injury; claims under any federal, state or local law relating to employment and/or the termination thereof, including any claims for wages, including vacation, wages, commissions, bonuses and any other compensation allegedly unpaid.  Plaintiff expressly agrees that he is not an "aggrieved employee" as that term is identified in the Private Attorney General Act ("PAGA") and he is also releasing any claims he may have for penalties for alleged Labor Code violations under the PAGA.`,
      isEditing: false,
    },
    {
      id: '6',
      content: `4.          	Release of Unknown Claims.  Plaintiff represents that she understands and expressly waives all rights under California Civil Code § 1542, which provides as follows:

"A general release does not extend to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release and that, if known by him or her, would have materially affected his or her settlement with the debtor or released party."

        	Plaintiff acknowledges that he may hereafter discover facts different from, or in addition to, those which he now knows or believes to be true with respect to her respective released claims, and he hereby accepts and assumes the risks of such facts being different and agrees that, in such event, the foregoing releases shall nevertheless be and remain effective in all respects with respect to such released claims, notwithstanding such different or additional facts, or the discovery thereof, and shall not be subject to termination or rescission by reason of such difference in facts.`,
      isEditing: false,
    },
    {
      id: '7',
      content: `5.          	Assignment of Action.  Plaintiff represents and warrants that he has not assigned or transferred any interest in any of his released claims, and that he has read the provisions of the foregoing release, is aware of the contents and legal effects thereof and has had the opportunity to consult with counsel of his choice with respect to this release.`,
      isEditing: false,
    },
    {
      id: '8',
      content: `6.          	Dismissal with Prejudice.  Within seven (7) days from the date that the Settlement Payment as specified in this Agreement, has cleared funds from the banking institution,  Plaintiff shall file a request for dismissal with prejudice of the entire Action, and shall serve counsel for Defendants with a file-stamped copy.`,
      isEditing: false,
    },
    {
      id: '9',
      content: `7.          	No Admission.  In entering into this Agreement, and other than as stated in this Agreement, no Party hereto is admitting the sufficiency of any claims, allegations, assertions, contentions or positions to any other Party, nor the sufficiency of the defenses to any such claims, allegations, assertions, contentions or positions.`,
      isEditing: false,
    },
    {
      id: '10',
      content: `8.          	Other Charges or Complaints.  Plaintiff represents that no charges or complaints other than the pending charges and complaints have been filed by Plaintiff against Defendant or its representatives or agents with any local, state or federal agency or court.  Plaintiff further agrees that if any agency or court assumes jurisdiction of any charge or complaint on behalf of Plaintiff against Defendant related to the subject matter of the Action, Plaintiff will request that such agency or court withdraw and dismiss the matter with prejudice.  This Agreement may be pleaded as a full and complete defense and may be used as a basis for an injunction against any action, suit or proceeding that may be instituted, prosecuted or attempted in breach of this Agreement.  Plaintiff further represents and agrees that he will not file nor permit to be filed, nor participate in nor support, any claim made by any person or entity relating, in any way, to any alleged claim, impropriety or conduct relating, in any way, to his relationship with Defendants and/or the subject matter of this Agreement.`,
      isEditing: false,
    },
    {
      id: '11',
      content: `9.          	Indemnification.  Plaintiff shall protect and indemnify Defendants against any and all liens, subrogation claims, IRS liens, orders for wage garnishments, spousal/child support orders, and other rights that may be asserted by any person or entity against the Settlement Payment.  Plaintiff agrees to indemnify Defendants and the Releasees and to hold them harmless for all taxes, penalties and interest, withholdings, liens, orders, claims or otherwise.`,
      isEditing: false,
    },
    {
      id: '12',
      content: `10.       	Medicare, Medicaid and SCHIP Extension Act of 2007; Warranty and Indemnification.  10.1 Warranty of Medicare Ineligibility:  Plaintiff hereby warrants and represents that he has never received, is not currently receiving, and did not apply to receive Medicare or Medicaid for any injuries, released by this Agreement.  Plaintiff further warrants that he is not eligible for benefits under the Federal Medicare program and does not anticipate applying for Medicare or Medicaid benefits in connection with the claims made in the Action.

10.2 	Indemnification:  Plaintiff represents that there are no liens or reimbursement rights by Medicare or Medicaid enforceable against the proceeds of the settlement payments identified in Paragraph 1 of this Agreement, or the persons, firms, or corporations making the payments herein.  If such a lien or reimbursement right is asserted, against the proceeds herein or against the Releasees, or any person, firm, or corporation making payment herein, then, in consideration of the payment made to Plaintiff, Plaintiff agrees to indemnify Releasees, their attorneys and/or their insurers against lien claims by Medicare or its contractors including Medicare Secondary Payer Recovery Contractor.  Plaintiff agrees to pay and satisfy such asserted lien or reimbursement right, or to satisfy the same on a compromise basis.`,
      isEditing: false,
    },
    {
      id: '13',
      content: `11.       	Confidential Settlement.  	Plaintiff agrees to maintain in complete confidence the existence of this Agreement, the contents and terms of this Agreement, the Settlement Amount and the consideration for this Agreement ("Settlement Information").  Except as required by law, Plaintiff agrees to disclose Settlement Information only to those attorneys, accountants, tribunals, and governmental entities who have a reasonable need to know of such Settlement Information, and to prevent disclosure of any Settlement Information to other third parties, either through print, electronically, verbally or otherwise, in any manner whatsoever.  Notwithstanding the above, if asked about the disposition of this matter, the Parties may state only "The matter has been resolved." There shall be no disclosure by the Parties regarding the negotiation, or the contents or terms of the Agreement.  In no event shall any information be provided to the media or posted on any form of social media.`,
      isEditing: false,
    },
    {
      id: '14',
      content: `12.       	Liquidated Damages.  The Parties agree that the precise amount of damages flowing from any disclosure in violation of the confidentiality provision set forth in Paragraph 11 above would be impracticable or extremely difficult to calculate or prove, and therefore Parties agrees that in the event of a proven breach as determined by a Court of law of Paragraph 11 above, proximately causing the above-described Settlement Information to be received, directly or indirectly, by anyone in violation of the above confidentiality provision, the non-breaching party shall be entitled to receive, as liquidated damages, the sum of five thousand dollars per proven breach as determined and ordered by a Court of law.`,
      isEditing: false,
    },
    {
      id: '15',
      content: `13.       	Employment Verification.  Plaintiff agrees that in the event Defendants receive a request concerning his employment with Defendants, Defendants will verify only dates of employment and job titles unless required by law to provide any additional information or unless Plaintiff specifically authorizes Defendants to provide additional information.`,
      isEditing: false,
    },
    {
      id: '16',
      content: `14.       	Attorneys' Fees and Costs.  As further mutual consideration for the promises set forth herein, the Parties agree that they are each responsible for their respective attorneys' fees and costs.  Each of the Parties hereto agrees that it will not seek from the other Party hereto any other reimbursement for attorneys' fees and/or costs incurred in the Action or relating to any matters addressed in this Agreement.  If any Party brings any legal action to interpret or enforce any provision of this Agreement, the prevailing Party in the litigation shall be entitled to recover from the other Party its costs and expenses including, but not limited to, reasonable attorneys' fees, expert witness fees and all other costs and expenses, in addition to any other relief that may be granted.`,
      isEditing: false,
    },
    {
      id: '17',
      content: `15.       	Rules of Construction.  This Agreement is the result of arm's length negotiations.  The Parties hereto acknowledge that: (1) this Agreement and its reduction to final form is the result of extensive good faith negotiations between the Parties hereto through their respective counsel; (2) said counsel has carefully reviewed and examined this Agreement for execution by the Parties hereto; and (3) any statute or rule of construction stating that ambiguities are to be resolved against the drafting party should not be employed in the interpretation of this Agreement.`,
      isEditing: false,
    },
    {
      id: '18',
      content: `16.       	Governing Law.  This Agreement is made and entered into in the State of California and shall in all respects be interpreted, enforced and governed by and under the laws of the State of California.`,
      isEditing: false,
    },
    {
      id: '19',
      content: `17.       	Amendment and Modification.  This Agreement may be amended or modified only by a writing signed by the Parties.`,
      isEditing: false,
    },
    {
      id: '20',
      content: `18.       	No Representations.  Each of the Parties to this Agreement warrants that no promise or inducement has been made or offered by any of the Parties hereto except as set forth herein and that this Agreement is not executed in reliance upon any statement or representation of any of the Parties or their representatives concerning the nature and extent of the damages or legal liability thereof.  The Parties further represent that each has been represented by legal counsel during the course of the negotiations leading to the signing of this Agreement, and that each Party has been advised by its legal counsel with respect to the meaning of this Agreement and its legal effect.`,
      isEditing: false,
    },
    {
      id: '21',
      content: `19.       	Effect of Headings.  Paragraph headings are for reference only and shall not affect the interpretation of any paragraph hereto.`,
      isEditing: false,
    },
    {
      id: '22',
      content: `20.       	Heirs, Successors; Assignability. This Agreement shall be binding upon and inure to the benefit of the Parties and their respective heirs, successors and personal representatives; and the Parties hereby agree, for themselves, and their respective shareholders, officers, directors, managers, members, beneficiaries, heirs and personal representatives, to execute and deliver any instruments and to perform any further acts which may be reasonably necessary or proper to carry out the provisions of this Agreement.  Any rights and obligations under this Agreement shall not be assigned or transferred by any Party without the express written consent of the other Parties.`,
      isEditing: false,
    },
    {
      id: '23',
      content: `21.       	Entire Agreement. This Agreement constitutes the entire agreement between the Parties and the Parties acknowledge that there are no other agreements, oral or written, between them.`,
      isEditing: false,
    },
    {
      id: '24',
      content: `22.       	Severability. If any term or provision of this Agreement is determined to be illegal, unenforceable or invalid, in whole or in part, for any reason, such illegal, unenforceable or invalid provision or part thereof shall be stricken from this Agreement, and such provision shall not affect the legality, enforceability or validity of the remainder of the Agreement.  If any provision or part thereof of this Agreement is stricken in accordance with the provisions of this section, then the stricken provision shall be replaced, to the extent possible, with a legal, enforceable and valid provision which is as similar in tenor to the stricken provision as is legally possible.`,
      isEditing: false,
    },
    {
      id: '25',
      content: `23.       	Counterparts.  This Agreement may be executed in more than one counterpart, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument.`,
      isEditing: false,
    },
    {
      id: '26',
      content: `24.       	Admissibility/Retention of Court Jurisdiction.  The Parties intend for this Agreement to be enforceable, binding, and admissible in Court.  Pursuant to California Code of Civil Procedure §664.6, the Parties agree that the Court shall retain jurisdiction over the Parties to enforce the provisions of this settlement until there has been full performance.  The Parties and their attorneys acknowledge that their respective obligations herein may be specifically enforced by the Court on noticed motion.  Should enforcement pursuant to California Code of Civil Procedure §664.6 be required, the enforcing party shall be entitled to reasonable attorneys' fees incurred in enforcing the agreement.`,
      isEditing: false,
    },
    {
      id: '27',
      content: `25.       	Voluntary Execution of Settlement Agreement.  Each of the Parties acknowledge that they have read and understand the contents of this Agreement and agree that no oral representations, statements or inducements apart from this Agreement have been made.`,
      isEditing: false,
    },
    {
      id: '28',
      title: 'Read Agreement',
      content: `PLEASE READ THIS AGREEMENT COMPLETELY AND CAREFULLY BEFORE YOU SIGN IT.  THIS AGREEMENT INCLUDES A RELEASE OF ALL KNOWN AND UNKNOWN CLAIMS THAT YOU HAVE, OR MAY CLAIM TO HAVE AGAINST EMPLOYER/DEFENDANTS AND THE OTHER RELEASEES HEREIN.`,
      isEditing: false,
    },
    {
      id: '29',
      title: 'Signature Block',
      content: `IN WITNESS HEREOF, and intending to be legally bound hereby, the Parties have executed this Settlement Agreement and General Release on the respective dates set forth below.

 						Plaintiff's Name

Dated:  _____________________             	______________________________

                                                                    	

 

                                                                       

Dated:  _____________________             	______________________________

                                                                    	Defendant's Name

                                                                    	By: ___________________________

                                                                    	Title: __________________________

                                                                    	As authorized signatory for Defendant

                                                                    	Plaintiff's Name`,
      isEditing: false,
    },
  ]);
  const [formData, setFormData] = useState({
    title: '',
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddSection = () => {
    const newId = `${Date.now()}`;
    const newSection: TemplateSection = {
      id: newId,
      content: '',
      title: '',
      isEditing: true,
    };
    setTemplateSections([...templateSections, newSection]);
  };

  const handleUpdateTitle = (id: string, title: string) => {
    setTemplateSections((prevSections) =>
      prevSections.map((section) =>
        section.id === id ? { ...section, title } : section
      )
    );
  };

  // Helper function to get display title for a section (without number)
  const getSectionTitle = (section: TemplateSection): string => {
    // If manual title is set, use it (remove number if present)
    if (section.title !== undefined && section.title !== '') {
      const titleNumberMatch = section.title.match(/^\d+\.\s+(.+)$/);
      return titleNumberMatch ? titleNumberMatch[1].trim() : section.title;
    }
    
    // Otherwise extract from content
    const lines = section.content.split('\n');
    const firstLine = lines[0]?.trim() || '';
    
    const isRecitals = firstLine === 'R E C I T A L S' || 
                      firstLine.match(/^R\s+E\s+C\s+I\s+T\s+A\s+L\s+S$/i);
    const numberedSectionMatch = firstLine.match(/^(\d+)\.\s+(.+?)(?:\.|$)/);
    
    if (isRecitals) {
      return 'Recitals';
    } else if (numberedSectionMatch) {
      // Return only the title text, without the number
      const titleText = numberedSectionMatch[2].trim();
      return titleText;
    }
    
    return `Section ${section.id}`; // Fallback
  };

  // Function to scroll to a section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Function to renumber sections after reordering
  const renumberSections = (sections: TemplateSection[]): TemplateSection[] => {
    return sections.map((section, index) => {
      const newNumber = index + 1;
      
      // Check if section has a numbered title or content
      const lines = section.content.split('\n');
      const firstLine = lines[0]?.trim() || '';
      
      // Skip RECITALS, Preamble, Warning, and Signature
      const isRecitals = firstLine === 'R E C I T A L S' || 
                        firstLine.match(/^R\s+E\s+C\s+I\s+T\s+A\s+L\s+S$/i);
      const isIntroOrFinal = section.id === '1' || section.id === '2' || section.id === '28' || section.id === '29';
      
      if (isRecitals || isIntroOrFinal) {
        return section;
      }
      
      // Check for numbered section in content
      const numberedSectionMatch = firstLine.match(/^(\d+)\.\s+(.+?)(?:\.|$)/);
      
      if (numberedSectionMatch) {
        const oldNumber = numberedSectionMatch[1];
        const titleText = numberedSectionMatch[2].trim();
        
        // Update content if number changed (keep title without number)
        let updatedContent = section.content;
        if (oldNumber !== String(newNumber)) {
          // Replace the old number with new number in the first line
          updatedContent = firstLine.replace(/^\d+\./, `${newNumber}.`) + '\n' + lines.slice(1).join('\n');
        }
        
        // Update section - keep title clean (without number) but update content
        let cleanTitle = section.title;
        if (section.title !== undefined) {
          const titleNumberMatch = section.title.match(/^\d+\.\s+(.+)$/);
          if (titleNumberMatch) {
            cleanTitle = titleNumberMatch[1].trim();
          }
        }
        
        return {
          ...section,
          title: cleanTitle,
          content: updatedContent,
        };
      }
      
      // If section has a manual title with a number, remove the number
      if (section.title !== undefined && section.title !== '') {
        const titleMatch = section.title.match(/^(\d+)\.\s+(.+)$/);
        if (titleMatch) {
          const titleText = titleMatch[2].trim();
          return {
            ...section,
            title: titleText, // Remove number from title
          };
        }
      }
      
      return section;
    });
  };

  const handleDeleteSection = (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setTemplateSections(templateSections.filter((section) => section.id !== id));
    }
  };

  const handleEditSection = (id: string) => {
    setTemplateSections(
      templateSections.map((section) => {
        if (section.id === id) {
          // If entering edit mode and title is not set, initialize it with extracted title (without number)
          if (!section.isEditing && section.title === undefined) {
            // Extract title from content for initialization
            const lines = section.content.split('\n');
            const firstLine = lines[0] || '';
            const isRecitals = firstLine.match(/^R\s+E\s+C\s+I\s+T\s+A\s+L\s+S$/i);
            const numberedSectionMatch = firstLine.match(/^(\d+)\.\s+(.+?)(?:\.|$)/);
            
            let extractedTitle = '';
            if (isRecitals) {
              extractedTitle = 'Recitals';
            } else if (numberedSectionMatch) {
              // Extract only the title text, without the number
              const titleText = numberedSectionMatch[2].trim();
              extractedTitle = titleText;
            }
            
            return { ...section, isEditing: !section.isEditing, title: extractedTitle || '' };
          }
          return { ...section, isEditing: !section.isEditing };
        }
        return section;
      })
    );
  };

  // Focus title input when entering edit mode (only when first entering, not on every keystroke)
  const prevEditingState = useRef<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    templateSections.forEach((section) => {
      const wasEditing = prevEditingState.current[section.id] || false;
      const isNowEditing = section.isEditing;
      
      // Only focus if section just entered edit mode (wasn't editing before, but is now)
      if (!wasEditing && isNowEditing && titleInputRefs.current[section.id]) {
        // Use setTimeout to ensure focus happens after render
        setTimeout(() => {
          const input = titleInputRefs.current[section.id];
          if (input && document.activeElement !== input) {
            input.focus();
            input.select(); // Select all text so user can immediately type or edit
          }
        }, 0);
      }
      
      // Update the previous state
      prevEditingState.current[section.id] = isNowEditing;
    });
  }, [templateSections]);

  const handleUpdateSection = (id: string, content: string) => {
    setTemplateSections(
      templateSections.map((section) =>
        section.id === id ? { ...section, content, isEditing: false } : section
      )
    );
  };

  const handleAIClick = (id: string) => {
    // Placeholder for future ChatGPT integration
    console.log('AI enhancement for section:', id);
    alert('AI enhancement feature coming soon! This will integrate with ChatGPT API.');
    // TODO: Implement ChatGPT API integration
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSections = [...templateSections];
    const draggedSection = newSections[draggedIndex];
    
    // Remove the dragged item
    newSections.splice(draggedIndex, 1);
    
    // Insert at new position
    newSections.splice(dropIndex, 0, draggedSection);
    
    // Renumber all sections
    const renumberedSections = renumberSections(newSections);
    
    setTemplateSections(renumberedSections);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Combine all template sections into one content string
    const combinedTemplate = templateSections.map((s) => s.content).join('\n\n');

    try {
      const response = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: combinedTemplate,
          templateId: null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create agreement');

      const agreement = await response.json();
      // Show success message
      alert('Agreement created successfully!');
      // Reset form
      setFormData({ title: '' });
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating agreement:', error);
      alert('Failed to create agreement. Please try again.');
      setIsLoading(false);
    }
  };

  // Helper function to render a section card
  const renderSectionCard = (section: TemplateSection, index: number) => {
    // Extract title if it exists (like "R E C I T A L S" or numbered sections)
    const lines = section.content.split('\n');
    const firstLine = lines[0]?.trim() || '';
    
    // Check for RECITALS
    const isRecitals = firstLine === 'R E C I T A L S' || 
                      firstLine.match(/^R\s+E\s+C\s+I\s+T\s+A\s+L\s+S$/i);
    
    // Check for numbered section titles (e.g., "1. Consideration", "2. Responsibility for Tax Obligations")
    const numberedSectionMatch = firstLine.match(/^(\d+)\.\s+(.+?)(?:\.|$)/);
    
    // Extract title from content (for display when not manually set)
    let extractedTitle: string | null = null;
    let contentWithoutTitle: string;
    
    if (isRecitals) {
      extractedTitle = 'Recitals';
      contentWithoutTitle = lines.slice(1).join('\n');
    } else if (numberedSectionMatch) {
      // Extract ONLY the title text, not the number
      const titleText = numberedSectionMatch[2].trim();
      extractedTitle = titleText; // No number prefix
      // Remove just the title portion (number + title + period) from the first line
      const fullMatch = numberedSectionMatch[0]; // e.g., "1. Consideration."
      const firstLineWithoutTitle = firstLine.replace(fullMatch, '').trim();
      // Reconstruct content with title removed from first line
      if (firstLineWithoutTitle) {
        contentWithoutTitle = [firstLineWithoutTitle, ...lines.slice(1)].join('\n');
      } else {
        // If first line only contained the title, remove it entirely
        contentWithoutTitle = lines.slice(1).join('\n');
      }
    } else {
      contentWithoutTitle = section.content;
    }

    // Use manual title if explicitly set, otherwise use extracted title (without number)
    // If manual title has a number prefix, remove it
    let displayTitle = section.title !== undefined ? section.title : extractedTitle;
    if (displayTitle) {
      // Remove number prefix from manual title if present (e.g., "1. Title" -> "Title")
      const titleNumberMatch = displayTitle.match(/^\d+\.\s+(.+)$/);
      if (titleNumberMatch) {
        displayTitle = titleNumberMatch[1].trim();
      }
    }
    
    // Show title input when editing
    const showTitleInput = section.isEditing;
    // For input value: use manual title if set (even if empty string), otherwise use extracted title (without number)
    let titleValue = section.title !== undefined ? section.title : (extractedTitle || '');
    // Remove number prefix from titleValue if present
    const titleValueNumberMatch = titleValue.match(/^\d+\.\s+(.+)$/);
    if (titleValueNumberMatch) {
      titleValue = titleValueNumberMatch[1].trim();
    }

    // Calculate section number based on position in main sections (only for main sections)
    const isMainSection = section.id !== '1' && section.id !== '2' && section.id !== '28' && section.id !== '29';
    const mainSections = templateSections.filter(s => s.id !== '1' && s.id !== '2' && s.id !== '28' && s.id !== '29');
    const sectionNumber = isMainSection ? mainSections.findIndex(s => s.id === section.id) + 1 : null;

    return (
      <div key={section.id}>
        <Card
          id={`section-${section.id}`}
          className={`space-y-4 transition-all ${
            draggedIndex === index ? 'opacity-50' : ''
          } ${
            dragOverIndex === index && draggedIndex !== index
              ? 'border-2 border-blue-500 bg-blue-50/50'
              : ''
          }`}
        >
          {/* Title and Action Icons */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Section Number Badge - only for main sections */}
              {sectionNumber !== null && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {sectionNumber}
                </div>
              )}
              
              {showTitleInput ? (
                <div className="flex-1 min-w-0">
                  <Input
                    ref={(el) => {
                      titleInputRefs.current[section.id] = el;
                    }}
                    placeholder="Enter section title (e.g., Consideration)"
                    value={titleValue}
                    onChange={(e) => handleUpdateTitle(section.id, e.target.value)}
                    className="w-full"
                  />
                </div>
              ) : displayTitle ? (
                <h3 className="font-bold text-lg text-slate-800">
                  {displayTitle}
                </h3>
              ) : (
                <div></div>
              )}
            </div>
            <div className="flex gap-2">
              {/* Edit Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleEditSection(section.id);
                }}
                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors shadow-sm"
                title="Edit section"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>

              {/* AI Icon */}
              <button
                onClick={() => handleAIClick(section.id)}
                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors shadow-sm"
                title="Enhance with AI"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0L14.5 8.5L23 11L14.5 13.5L12 22L9.5 13.5L1 11L9.5 8.5L12 0Z" />
                  <path d="M19 17L19.5 19.5L22 20L19.5 20.5L19 23L18.5 20.5L16 20L18.5 19.5L19 17Z" />
                  <path d="M5 19L5.5 20.5L7 21L5.5 21.5L5 23L4.5 21.5L3 21L4.5 20.5L5 19Z" />
                </svg>
              </button>

              {/* Delete Icon */}
              <button
                onClick={() => handleDeleteSection(section.id)}
                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors shadow-sm"
                title="Delete section"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Drag Handle */}
              <div
                draggable={true}
                onDragStart={(e) => {
                  handleDragStart(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={handleDragEnd}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shadow-sm cursor-move"
                title="Drag to reorder"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1 .001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Drop Zone Indicator */}
          {dragOverIndex === index && draggedIndex !== index && (
            <div className="h-1 bg-blue-500 rounded-full mb-2"></div>
          )}

          {/* Content */}
          <div
            onDragEnter={section.isEditing ? undefined : () => handleDragEnter(index)}
            onDragLeave={section.isEditing ? undefined : handleDragLeave}
            onDragOver={section.isEditing ? (e) => { e.preventDefault(); e.stopPropagation(); } : handleDragOver}
            onDrop={section.isEditing ? undefined : () => handleDrop(index)}
          >
            {section.isEditing ? (
            <EditableTextarea
              section={section}
              onUpdate={(content) => {
                const updated = templateSections.map((s) =>
                  s.id === section.id ? { ...s, content } : s
                );
                setTemplateSections(updated);
              }}
              onSave={() => handleUpdateSection(section.id, section.content)}
              onCancel={() => handleEditSection(section.id)}
            />
          ) : (
            <div className="text-slate-700 whitespace-pre-wrap">
              {contentWithoutTitle}
            </div>
          )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex gap-8 lg:gap-12 relative w-full">
      {/* Table of Contents Sidebar - Left Side */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 z-10">
          <Card className="p-4">
            <h3 className="text-lg font-bold mb-4 gradient-text">Table of Contents</h3>
            <nav className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {(() => {
                // Reorder sections for TOC: Introductory, Main, Final
                const introductorySections = templateSections.filter(s => s.id === '1' || s.id === '2');
                const mainSections = templateSections.filter(s => s.id !== '1' && s.id !== '2' && s.id !== '28' && s.id !== '29');
                const finalSections = templateSections.filter(s => s.id === '28' || s.id === '29');
                const reorderedSections = [...introductorySections, ...mainSections, ...finalSections];
                
                return reorderedSections.map((section) => {
                  const originalIndex = templateSections.findIndex(s => s.id === section.id);
                  const title = getSectionTitle(section);
                  // Calculate section number for main sections only
                  const isMainSection = section.id !== '1' && section.id !== '2' && section.id !== '28' && section.id !== '29';
                  const sectionNumber = isMainSection ? mainSections.findIndex(s => s.id === section.id) + 1 : null;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        draggedIndex === originalIndex
                          ? 'bg-blue-100 text-blue-700 opacity-50'
                          : dragOverIndex === originalIndex && draggedIndex !== originalIndex
                          ? 'bg-blue-200 text-blue-800'
                          : 'hover:bg-blue-50 text-slate-700'
                      }`}
                      title={title}
                    >
                      <div className="flex items-center gap-2">
                        {sectionNumber !== null ? (
                          <span className="text-blue-600 font-semibold text-xs">{sectionNumber}.</span>
                        ) : (
                          <span className="text-slate-400 text-xs"></span>
                        )}
                        <span className="truncate">{title}</span>
                      </div>
                    </button>
                  );
                });
              })()}
            </nav>
          </Card>
        </div>
      </div>

      {/* Main Content - Right Side */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Create Agreement Form */}
        <Card>
        <h2 className="text-3xl font-bold mb-6 gradient-text">Create New Agreement</h2>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Agreement Title"
            placeholder="e.g., Settlement Agreement - John Doe v. ABC Corp"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          </form>
        </Card>

        {/* Template Sections */}
        <div>
          <h2 className="text-2xl font-bold mb-4 gradient-text">Template Sections</h2>
          
          {/* Introductory Sections (Preamble and Recitals) */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Introductory Sections</h3>
            {templateSections
              .filter((section) => section.id === '1' || section.id === '2')
              .map((section) => {
                const index = templateSections.findIndex(s => s.id === section.id);
                return renderSectionCard(section, index);
              })}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-blue-200 my-8"></div>

          {/* Main Sections */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Main Sections</h3>
            {templateSections
              .filter((section) => section.id !== '1' && section.id !== '2' && section.id !== '28' && section.id !== '29')
              .map((section) => {
                const index = templateSections.findIndex(s => s.id === section.id);
                return renderSectionCard(section, index);
              })}
            
            {/* Add New Section Card */}
            <div onClick={handleAddSection} className="cursor-pointer">
              <Card className="border-2 border-dashed border-blue-200 hover:border-blue-500 transition-colors">
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 hover:text-blue-500 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-lg font-semibold">Add New Section</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-blue-200 my-8"></div>

          {/* Final Sections (Warning and Signature) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Final Sections</h3>
            {templateSections
              .filter((section) => section.id === '28' || section.id === '29')
              .map((section) => {
                const index = templateSections.findIndex(s => s.id === section.id);
                return renderSectionCard(section, index);
              })}
          </div>
        </div>

        {/* Action Buttons at Bottom */}
        <div className="flex justify-center gap-4 pt-8 pb-4">
          <Button 
            onClick={(e) => {
              e.preventDefault();
              if (formRef.current) {
                formRef.current.requestSubmit();
              }
            }}
            variant="gradient" 
            isLoading={isLoading}
            size="lg"
          >
              Create Agreement
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            size="lg"
            >
              Cancel
            </Button>
          </div>
      </div>
    </div>
  );
}

