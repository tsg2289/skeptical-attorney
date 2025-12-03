import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { sanitizeInput, validateAnswerInput, rateLimit, handleApiError } from '@/lib/utils/answerUtils'
import { anonymizeDataWithMapping, reidentifyData, PIIMapping, ContextualMapping } from '@/lib/utils/anonymize'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Standard California Civil Answer defenses - generated based on single/multiple defendants
function generateStandardDefenses(isMultipleDefendants: boolean = false): string {
  // Helper variables
  const defendantLabel = isMultipleDefendants ? 'Defendants' : 'Defendant'
  const defendantVerb = isMultipleDefendants ? 'are' : 'is'
  const believeVerb = isMultipleDefendants ? 'believe' : 'believes'
  const defendantVerb2 = isMultipleDefendants ? 'were' : 'was'
  const defendantVerb3 = isMultipleDefendants ? 'cannot' : 'cannot'
  const theseDefendants = isMultipleDefendants ? 'these answering Defendants' : 'this answering Defendant'
  const againstDefendants = isMultipleDefendants ? 'against Defendants' : 'against Defendant'
  const ofDefendants = isMultipleDefendants ? 'of Defendants' : 'of Defendant'
  const eachDefendant = isMultipleDefendants ? 'each Defendant' : 'Defendant'
  const defendantsCannot = isMultipleDefendants ? 'Defendants cannot' : 'Defendant cannot'
  const defendantsShall = isMultipleDefendants ? 'Defendants shall' : 'Defendant shall'
  const defendantsAs = isMultipleDefendants ? 'Defendants as' : 'Defendant as'
  const arePrecluded = isMultipleDefendants ? 'are' : 'is'

  return `
FIRST AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Failure To State a Cause Of Action)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that each and every cause of action in Plaintiff's complaint fails to state facts sufficient to state a claim upon which relief can be granted.  

SECOND AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Plaintiff's Comparative Negligence)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff was careless and negligent in and about the matters alleged in Plaintiff's complaint, and that said carelessness and negligence actually and/or proximately caused, or contributed to, in whole or in part, Plaintiff's alleged damages and that said damages, if any, must be diminished in proportion to the amount of fault properly attributable to Plaintiff.  

THIRD AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Third Parties' Comparative Fault)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that if Plaintiff suffered or sustained any obligation or liability for any loss, damage or injury as alleged in the complaint, such loss, damage or injury was proximately caused or contributed to by the wrongful and negligent acts and conduct of parties, persons or entities other than ${theseDefendants}, and that such wrongful and negligent acts or conduct ${defendantVerb2} an intervening or superseding cause of the loss, damage or injury of which Plaintiff complains.  

FOURTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Assumption of the Risk)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff is barred from asserting any claim ${againstDefendants} by reason of the fact that Plaintiff impliedly and voluntarily assumed the risk of the matters causing the injuries and damages incurred, if any.  

FIFTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Failure To Mitigate Damages)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff failed to take reasonable efforts to mitigate the damages that allegedly were incurred.  

SIXTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(No Causation)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff is barred from recovery ${againstDefendants} because any losses or damages purportedly sustained by Plaintiff were not proximately caused by any act or omission ${ofDefendants}.  

SEVENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Proportionate Liability)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that in the event Plaintiff is entitled to non-economic damages including, but not limited to, pain, suffering, inconvenience, mental suffering, emotional distress, loss of society and companionship, loss of consortium, and/or injury to reputation and humiliation, ${defendantLabel} shall be liable only for the amount of non-economic damages, if any, allocated to ${eachDefendant}'s percentage of fault, and a separate judgment shall be rendered against ${defendantLabel} for that amount pursuant to California Civil Code section 1431.2.  

EIGHTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Substantial Factor)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that the acts and omissions ${ofDefendants} ${defendantsAs} alleged in Plaintiff's claims for relief were not a substantial factor of the loss or damage for which Plaintiff seeks recovery.  

NINTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Excessive Medical Billing)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that the medical treatment allegedly procured by Plaintiff was unreasonable, medically unnecessary, and not the proximate result of the alleged incident. Furthermore, the medical billing is excessive and does not comport with the reasonable medical billing procedures in the State of California.  

TENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Failure to Join Necessary/Indispensable Parties)  
Plaintiff has failed to name or join in the complaint a necessary/indispensable party or parties to the present action.  

ELEVENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Statute of Limitations)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that the complaint, and each and every cause of action contained therein, is barred by the applicable statute of limitations including, but not limited to, California Code of Civil Procedure sections 335.1, 338, 338.1, 340.3, 343, and 340.8.  

TWELFTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Estoppel)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff should be barred from asserting the claims based upon the equitable doctrine of estoppel.  

THIRTEENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Laches)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff should be barred from asserting the claims based upon the equitable doctrine of laches.  

FOURTEENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Unclean Hands)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff should be barred from asserting the claims based upon the equitable doctrine of unclean hands.  

FIFTEENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Proposition 213)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff did not carry proper insurance coverage at the time of the incident per California Proposition 213 and ${arePrecluded} thus precluded from seeking damages.  

SIXTEENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Uninsured Motorist)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that Plaintiff was an uninsured owner and/or operator of a motor vehicle. Plaintiff's recovery, if any, against ${theseDefendants} should be reduced by the amounts paid or payable from coverage provided by an uninsured motorist endorsement for claims arising out of the same accident.  

SEVENTEENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Failure to Wear a Seatbelt/Misuse of Seatbelt)  
Plaintiff is barred from recovering any remedy ${againstDefendants} or her recovery should be reduced by the fact that Plaintiff was negligent in not wearing a seatbelt and/or similar safety restraint devices at the time of the incident. Plaintiff may not recover damages for those injuries and damages which would have not been sustained if Plaintiff had worn a seatbelt or similar safety restraint devices. Vehicle Code § 27315.  

EIGHTEENTH AFFIRMATIVE DEFENSE  
(To All Causes of Action)  
(Additional Affirmative Defenses)  
${defendantLabel} ${defendantVerb} informed and ${believeVerb} and thereon allege that ${defendantLabel} ${defendantVerb3} fully anticipate all affirmative defenses that may be applicable to the subject action. Accordingly, the right to assert additional affirmative defenses, if and to the extent that such affirmative defenses are applicable, is hereby reserved.
`
}

function generateBasicAnswer(plaintiffName: string, defendantName: string, complaintText: string, isMultipleDefendants: boolean = false) {
  const date = new Date().toLocaleDateString()

  // Helper variables for singular/plural
  const defendantLabel = isMultipleDefendants ? 'Defendants' : 'Defendant'
  const defendantVerb = isMultipleDefendants ? 'answer' : 'answers'
  const defendantVerb2 = isMultipleDefendants ? 'demand' : 'demands'
  const defendantVerb3 = isMultipleDefendants ? 'deny' : 'denies'
  const defendantVerb4 = isMultipleDefendants ? 'allege' : 'alleges'
  const plaintiffLabel = isMultipleDefendants ? 'Plaintiffs' : 'Plaintiff'
  const plaintiffPossessive = isMultipleDefendants ? "Plaintiffs'" : "Plaintiff's"
  const plaintiffPronoun = isMultipleDefendants ? 'Plaintiffs' : 'Plaintiff'
  const plaintiffPronounLower = isMultipleDefendants ? 'plaintiffs' : 'plaintiff'
  const plaintiffPossessiveLower = isMultipleDefendants ? "plaintiffs'" : "plaintiff's"

  const preamble = isMultipleDefendants
    ? `TO PLAINTIFFS AND TO THEIR ATTORNEYS OF RECORD:

${defendantLabel} ${defendantName} ("${defendantLabel}") ${defendantVerb} ${plaintiffPronoun} ${plaintiffName} ("${plaintiffPronoun}") Complaint as follows: ${defendantLabel} hereby ${defendantVerb2} a jury by trial in the above-entitled action.

Pursuant to the provisions of § 431.30, subdivision (d) of the Code of Civil Procedure, ${defendantLabel} generally and specifically ${defendantVerb3} each and every allegation of ${plaintiffPossessive} Complaint, and the whole thereof, including each purported cause of action contained therein, and ${defendantLabel} ${defendantVerb3} that ${plaintiffPronoun} have been damaged in any sum, or sums, due to the conduct or omissions of ${defendantLabel}.

${defendantLabel} herein ${defendantVerb4} and set forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in ${plaintiffPossessive} Complaint as though pleaded separately to each and every such cause of action.`
    : `TO PLAINTIFF AND TO HIS ATTORNEY OF RECORD:

${defendantLabel} ${defendantName} ("${defendantLabel}") ${defendantVerb} ${plaintiffLabel} ${plaintiffName} ("${plaintiffLabel}")'s Complaint as follows: ${defendantLabel} hereby ${defendantVerb2} a jury by trial in the above-entitled action.

Pursuant to the provisions of § 431.30, subdivision (d) of the Code of Civil Procedure, ${defendantLabel} generally and specifically ${defendantVerb3} each and every allegation of ${plaintiffPossessive} Complaint, and the whole thereof, including each purported cause of action contained therein, and ${defendantLabel} ${defendantVerb3} that ${plaintiffLabel} has been damaged in any sum, or sums, due to the conduct or omissions of ${defendantLabel}.

${defendantLabel} herein ${defendantVerb4}s and sets forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in ${plaintiffPossessive} Complaint as though pleaded separately to each and every such cause of action.`

  const prayer = isMultipleDefendants
    ? `WHEREFORE, ${defendantLabel} pray for judgment as follows:
  1. That ${plaintiffPronoun} take nothing by way of their Complaint;
  2. That ${plaintiffPossessive} Complaint and all causes of action be dismissed with prejudice;
  3. That ${defendantLabel} be awarded costs of suit incurred;
  4. That ${defendantLabel} be awarded reasonable attorneys' fees, if applicable; and
  5. For such other and further relief as the Court may deem just and proper.

Dated: ${date}

Respectfully submitted,

[Attorney's Name]  
[Law Firm Name]  
[Address]  
[City, State, Zip Code]  
[Telephone Number]  
[Email Address]  

Attorney for ${defendantLabel} ${defendantName}`
    : `WHEREFORE, ${defendantLabel} prays for judgment as follows:
  1. That ${plaintiffLabel} takes nothing by way of his Complaint;
  2. That ${plaintiffPossessive} Complaint and all causes of action be dismissed with prejudice;
  3. That ${defendantLabel} be awarded costs of suit incurred;
  4. That ${defendantLabel} be awarded reasonable attorneys' fees, if applicable; and
  5. For such other and further relief as the Court may deem just and proper.

Dated: ${date}

Respectfully submitted,

[Attorney's Name]  
[Law Firm Name]  
[Address]  
[City, State, Zip Code]  
[Telephone Number]  
[Email Address]  

Attorney for ${defendantLabel} ${defendantName}`

  return `${preamble}\n\n${generateStandardDefenses(isMultipleDefendants)}\n\n${prayer}`
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit.isAllowed(clientIP, 5, 60000)) { // 5 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const { plaintiffName, defendantName, complaintText, caseId, isMultipleDefendants } = await request.json()

    // CRITICAL: Log case ID for audit trail (but don't send to AI)
    if (caseId) {
      console.log(`[AUDIT] Generating answer for case: ${caseId}`)
    }

    // Validate input data
    const validation = validateAnswerInput({ plaintiffName, defendantName, complaintText })
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedPlaintiff = sanitizeInput(plaintiffName, 200)
    const sanitizedDefendant = sanitizeInput(defendantName, 200)
    const sanitizedComplaint = sanitizeInput(complaintText, 50000)

    // Anonymize all inputs with mapping for re-identification
    const plaintiffResult = anonymizeDataWithMapping(sanitizedPlaintiff)
    const defendantResult = anonymizeDataWithMapping(sanitizedDefendant)
    const complaintResult = anonymizeDataWithMapping(sanitizedComplaint)

    // Merge mappings
    const combinedMapping: PIIMapping = {};
    Object.keys(plaintiffResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...plaintiffResult.mapping[key]];
    });
    Object.keys(defendantResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...defendantResult.mapping[key]];
    });
    Object.keys(complaintResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...complaintResult.mapping[key]];
    });

    // Merge contextual mappings
    const combinedContextualMappings: ContextualMapping[] = [
      ...plaintiffResult.contextualMappings,
      ...defendantResult.contextualMappings,
      ...complaintResult.contextualMappings
    ];

    // Generate basic answer first (using anonymized data for OpenAI call)
    const basicAnswer = generateBasicAnswer(plaintiffResult.anonymizedText, defendantResult.anonymizedText, complaintResult.anonymizedText, isMultipleDefendants || false)

    // If OpenAI API key is available, enhance the answer
    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a California civil litigation attorney assistant. Your task is to analyze the complaint and suggest improvements or additional considerations for the standard California civil answer template.

IMPORTANT: You are working with a SINGLE, ISOLATED case. Only use the information provided below. Do not reference, infer, or incorporate information from any other cases.

CRITICAL GRAMMAR CONTEXT:
${isMultipleDefendants 
  ? 'This answer is for MULTIPLE DEFENDANTS. Always use plural forms: "Defendants are informed and believe", "Defendants allege", "Defendants deny", etc. Use "Defendants" (plural) throughout your suggestions.'
  : 'This answer is for a SINGLE DEFENDANT. Always use singular forms: "Defendant is informed and believes", "Defendant alleges", "Defendant denies", etc. Use "Defendant" (singular) throughout your suggestions.'
}

Focus on:
1. Identifying specific defenses that may be particularly relevant
2. Suggesting case-specific language modifications
3. Highlighting any unique aspects of the complaint
4. Recommending additional research areas

Do NOT rewrite the entire answer. Instead, provide brief, professional suggestions that an attorney could use to enhance the standard template. Ensure all your suggestions maintain the correct singular/plural form based on the context above.`
            },
            {
              role: "user",
              content: `Please analyze this complaint and provide suggestions for enhancing the standard California civil answer:

${isMultipleDefendants 
  ? 'NOTE: This answer is for MULTIPLE DEFENDANTS. All suggestions must use plural forms (Defendants, are, believe, etc.).'
  : 'NOTE: This answer is for a SINGLE DEFENDANT. All suggestions must use singular forms (Defendant, is, believes, etc.).'
}

Plaintiff: ${plaintiffResult.anonymizedText}
Defendant: ${defendantResult.anonymizedText}

Complaint Text:
${complaintResult.anonymizedText}

Standard Answer Template:
${basicAnswer}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        })

        let aiSuggestions = completion.choices[0]?.message?.content || ''
        
        // Re-identify placeholders in the AI response
        aiSuggestions = reidentifyData(aiSuggestions, combinedMapping, combinedContextualMappings);
        
        // Combine the basic answer with AI suggestions (restore original names in basic answer too)
        const restoredBasicAnswer = reidentifyData(basicAnswer, combinedMapping, combinedContextualMappings);
        const enhancedAnswer = `${restoredBasicAnswer}

---
AI ANALYSIS AND SUGGESTIONS:
${aiSuggestions}

---
NOTE: This document is generated using AI assistance. Please review all content carefully and consult with a licensed attorney before filing. The AI suggestions above are for consideration only and should be evaluated for applicability to your specific case.`

        return NextResponse.json({ answer: enhancedAnswer })
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
        // Fall back to basic answer if OpenAI fails
        return NextResponse.json({ 
          answer: `${basicAnswer}

---
NOTE: This document was generated using a standard template. AI enhancement was unavailable. Please review all content carefully and consult with a licensed attorney before filing.`
        })
      }
    } else {
      // Return basic answer if no OpenAI API key
      return NextResponse.json({ 
        answer: `${basicAnswer}

---
NOTE: This document was generated using a standard template. For AI-enhanced analysis, please configure OpenAI API access. Please review all content carefully and consult with a licensed attorney before filing.`
      })
    }
  } catch (error) {
    console.error('Error generating answer:', error)
    const { message, status } = handleApiError(error)
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}




