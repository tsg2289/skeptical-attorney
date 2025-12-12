import { NextRequest, NextResponse } from 'next/server';
import { anonymizeDataWithMapping, reidentifyData } from '@/lib/utils/anonymize';

function extractJsonObject(text: string) {
  // If the model wrapped JSON in ```json fences, pull the inner block
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();

  // Grab the first JSON object if extra prose surrounds it
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonString = braceMatch ? braceMatch[0] : candidate;

  return JSON.parse(jsonString);
}

export async function POST(request: NextRequest) {
  try {
    const { caseDescription, allSections } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Anonymize PII before sending to OpenAI, but keep mapping for re-identification
    const { anonymizedText: anonymizedDescription, mapping, contextualMappings } = 
      anonymizeDataWithMapping(caseDescription || '');

    const prompt = `You are a legal assistant helping to draft a demand letter. Analyze the following case description and determine the case type, then generate appropriate content for each section.

CASE DESCRIPTION:
${anonymizedDescription}

=== STEP 1: CASE TYPE IDENTIFICATION ===

Analyze the case description and determine which case type it falls under:

1. PERSONAL INJURY & TORT - Auto accidents, premises liability (slip/fall), medical malpractice, product liability, wrongful death, assault/battery
2. EMPLOYMENT & LABOR - Wage/hour violations, wrongful termination, discrimination, harassment, retaliation, misclassification, PAGA
3. CONTRACT & BUSINESS - Breach of contract, fraud, partnership disputes, trade secrets, vendor disputes
4. REAL ESTATE & PROPERTY - Landlord-tenant, unlawful detainer, construction defects, boundary disputes, HOA disputes
5. INSURANCE BAD FAITH - Coverage disputes, first-party bad faith, third-party bad faith, claims handling
6. CONSUMER PROTECTION - False advertising, unfair competition (UCL), consumer fraud, TCPA, data privacy
7. PROFESSIONAL LIABILITY - Legal malpractice, accounting malpractice, broker negligence
8. CONSTRUCTION DEFECT - Residential/commercial defects, contractor disputes, design professional liability
9. FAMILY LAW - Divorce, custody, support, property division (Note: adapt language appropriately)
10. INTELLECTUAL PROPERTY - Trademark, copyright, patent, trade secret misappropriation
11. PROBATE & TRUST - Will contests, trust disputes, elder abuse, fiduciary misconduct
12. ADMINISTRATIVE - Licensing disputes, agency actions, professional discipline

=== CRITICAL: ANTI-HALLUCINATION REQUIREMENTS ===

1. ONLY use facts explicitly stated in the case description
2. Do NOT invent or assume dates, names, amounts, locations, or details not provided
3. Use [PLACEHOLDER] brackets for any missing critical information
4. If information is unclear, state "Based on available information..." rather than fabricating details
5. Do NOT create witness names, medical providers, or specific dollar amounts unless provided
6. Stick strictly to what the user has described

=== STEP 2: GENERATE SECTIONS ===

Return a JSON object with section IDs as keys. ALL values MUST be strings (not objects or arrays).

{
  "1": "Introduction content here",
  "2": "FACTS content here",
  "3": "LIABILITY content here",
  "4": "DAMAGES content here (comprehensive - includes all damage types)",
  "5": "SETTLEMENT DEMAND content here",
  "6": "DOCUMENTATION PROVIDED content here"
}

=== SECTION REQUIREMENTS BY CASE TYPE ===

### PERSONAL INJURY & TORT ###

1. INTRODUCTION: "This firm represents [Client Name] regarding injuries sustained on [Date] in [Location]. Based on the evidence, [Opposing Party] is liable for the injuries and damages caused."

2. FACTS: Date, time, location, circumstances, what client was doing, conditions, witnesses, police/incident reports. ONLY facts from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Opposing Party] is liable
   - Applicable California law: Civil Code §1714 (general negligence); Vehicle Code sections if auto accident (§21453, §21703, §21801, §22350); premises liability under Rowland v. Christian; products liability; medical malpractice standard of care
   - How the facts establish duty, breach, causation, and damages
   - Conclusion that [Opposing Party] is liable under California law
   
   Example tone: "Under California Civil Code §1714, [Opposing Party] owed a duty of care to [Client]. By [specific conduct], [Opposing Party] breached this duty. This breach directly caused [Client]'s injuries, as evidenced by [facts]. Accordingly, [Opposing Party] is liable for the resulting damages."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages - objectively measurable financial losses:
      - Medical expenses (past treatment, future care, rehabilitation)
      - Lost wages and lost earning capacity
      - Property damage and repair costs
      - Out-of-pocket expenses
      Use [Amount] for unspecified figures. Reference California Civil Code §3333.
   
   B. Non-Economic (General) Damages - intangible losses:
      - Pain and suffering (physical and mental)
      - Emotional distress
      - Loss of enjoyment of life
      - Disfigurement or physical impairment
      - Loss of consortium (if spouse/partner claim)
      Reference CACI 3905A-3906. Note these are not available in pure contract claims.
   
   CONSEQUENTIAL DAMAGES (if applicable):
   - Losses flowing indirectly but foreseeably from the wrongful act
   - Lost opportunities, delay damages, increased costs, loss of use
   
   INCIDENTAL DAMAGES (if applicable):
   - Costs to respond to or mitigate harm (temporary repairs, investigation expenses)
   
   PUNITIVE DAMAGES (if applicable):
   - Only if fraud, malice, or oppression shown (Civil Code §3294)
   - Requires clear and convincing evidence
   - Common in fraud, bad faith, intentional torts
   
   Write as professional paragraphs describing injuries/harm, treatment received, and each category of damages with specifics from the case description. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand amount with [Amount] placeholder, 30-day response, litigation warning.

6. DOCUMENTATION: Police reports, medical records, photographs, bills, witness statements.

### EMPLOYMENT & LABOR ###

1. INTRODUCTION: "This firm represents [Client Name] regarding [specific violation] during employment with [Employer]. [Employer] violated California employment laws."

2. FACTS: Employment dates, position, specific incidents, dates of violations, persons involved, complaints made, timeline of events. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Employer] violated employment laws
   - Applicable California law: FEHA (Government Code §12900 et seq.) for discrimination/harassment/retaliation; Labor Code §510 (overtime), §1194 (minimum wage), §226 (wage statements), §226.7 (meal/rest breaks); Labor Code §1102.5 (whistleblower); Labor Code §2802 (expenses); PAGA (Labor Code §2698 et seq.); wrongful termination in violation of public policy
   - How the facts establish each element of the violation
   - Conclusion that [Employer] violated California employment law
   
   Example tone: "California's Fair Employment and Housing Act prohibits employers from [specific prohibited conduct]. [Employer]'s actions—specifically, [conduct]—constitute a clear violation of Government Code section 12940. The evidence demonstrates that [Client] was subjected to [treatment] because of [protected characteristic/activity], establishing liability under California law."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages:
      - Lost wages (back pay from termination/demotion to present)
      - Lost benefits (health insurance, retirement contributions, stock options)
      - Unpaid wages, overtime, meal/rest break premiums
      - Job search costs and expenses
      - Lost earning capacity (future wages)
      Use [Amount] for unspecified figures.
   
   B. Non-Economic (General) Damages:
      - Emotional distress (anxiety, depression, humiliation)
      - Physical manifestations of stress (insomnia, health issues)
      - Damage to professional reputation
      - Loss of career advancement opportunities
      Reference CACI 3905A for emotional distress calculation.
   
   STATUTORY DAMAGES & PENALTIES:
   - Waiting time penalties (Labor Code §203 - up to 30 days wages)
   - Wage statement penalties (Labor Code §226 - up to $4,000)
   - PAGA penalties (Labor Code §2699 - $100-$200 per pay period per violation)
   - FEHA statutory damages and attorneys' fees
   
   PUNITIVE DAMAGES (if applicable):
   - Available under FEHA for discrimination/harassment/retaliation
   - Available if employer acted with malice, oppression, or fraud (Civil Code §3294)
   - Requires clear and convincing evidence of managing agent involvement
   
   Write as professional paragraphs describing the harm suffered and each category of damages. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to statutory penalties, attorneys' fees under Labor Code/FEHA.

6. DOCUMENTATION: Employment records, pay stubs, emails, complaints, performance reviews, DFEH/EEOC filings.

### CONTRACT & BUSINESS ###

1. INTRODUCTION: "This firm represents [Client Name] regarding breach of contract/business tort by [Opposing Party]."

2. FACTS: Contract date, parties, key terms, performance, breach events, communications. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Opposing Party] breached the contract or committed a business tort
   - Applicable California law: Civil Code §§1549-1550 (contract formation), §§1623-1624 (Statute of Frauds); breach elements (existence, performance, breach, damages); implied covenant of good faith (Civil Code §1654); fraud (Civil Code §1709-1710); negligent misrepresentation; trade secrets (Civil Code §3426 et seq. CUTSA)
   - How the facts establish each element of the claim
   - Conclusion that [Opposing Party] is liable for breach/tort
   
   Example tone: "A valid and enforceable contract existed between [Client] and [Opposing Party], executed on [date], which required [Opposing Party] to [obligation]. [Client] fully performed all obligations under the agreement. Despite this, [Opposing Party] breached the contract by [specific conduct], causing [Client] to suffer damages. Under California law, [Opposing Party] is therefore liable for breach of contract."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages - Direct Losses:
      - Amounts owed under the contract
      - Out-of-pocket expenses incurred
      - Cost to complete or correct defective performance
      - Lost business profits (must be proven with reasonable certainty)
   
   B. Consequential (Special) Damages - Indirect but Foreseeable Losses:
      - Lost profits and business opportunities (Hadley v. Baxendale standard)
      - Increased operating costs
      - Delay damages
      - Loss of use
      Note: Often limited by contract language; must have been foreseeable at contract formation.
   
   INCIDENTAL DAMAGES:
   - Costs to mitigate harm
   - Investigation and inspection expenses
   - Temporary measures taken to address breach
   
   LIQUIDATED DAMAGES (if applicable):
   - Pre-agreed damages in the contract
   - Enforceable if reasonable estimate at time of contracting
   
   RESTITUTION / DISGORGEMENT (if applicable):
   - Return of payments made
   - Disgorgement of defendant's unjust profits
   
   PUNITIVE DAMAGES (if fraud/intentional tort):
   - Only available for tort claims (fraud, intentional interference)
   - NOT available for breach of contract alone
   - Requires clear and convincing evidence (Civil Code §3294)
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to contract remedies, potential for attorneys' fees if contract provides.

6. DOCUMENTATION: Contracts, amendments, invoices, communications, financial records, damage calculations.

### REAL ESTATE & PROPERTY ###

1. INTRODUCTION: "This firm represents [Client Name] regarding [property dispute type] involving property at [Address]."

2. FACTS: Property address, parties, lease/purchase terms, timeline of dispute, specific violations. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Opposing Party] violated property rights or lease terms
   - Applicable California law: Civil Code §§1940-1954.1 (habitability, repairs, security deposits); Code of Civil Procedure §1161 et seq. (unlawful detainer); Civil Code §895 et seq. (SB 800, Right to Repair); Civil Code §§841-845 (boundaries); Civil Code §§4000 et seq. (Davis-Stirling Act for HOA); Code of Civil Procedure §760.010 et seq. (quiet title)
   - How the facts establish each element of the violation
   - Conclusion that [Opposing Party] violated property rights
   
   Example tone: "Under California Civil Code section 1941, landlords have an obligation to maintain rental properties in habitable condition. [Opposing Party] failed to address [specific conditions] despite repeated notice from [Client], constituting a breach of the implied warranty of habitability. These failures directly caused [Client] to suffer damages, and [Opposing Party] is liable under California law."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages:
      - Repair costs and restoration expenses
      - Relocation and temporary housing costs
      - Lost rent or rental value
      - Diminution in property value
      - Moving and storage expenses
      - Utility costs incurred due to property issues
   
   B. Non-Economic (General) Damages:
      - Inconvenience and disruption to daily life
      - Emotional distress from displacement or property loss
      - Loss of quiet enjoyment
      - Annoyance and discomfort
   
   CONSEQUENTIAL DAMAGES:
   - Lost rental income (landlord claims)
   - Business losses from property issues
   - Loss of use damages
   
   STATUTORY DAMAGES (if applicable):
   - Security deposit violations: up to 2x deposit (Civil Code §1950.5)
   - Habitability violations: rent abatement
   - Wrongful eviction: actual damages plus statutory penalties
   
   TREBLE DAMAGES (if applicable):
   - Available under certain statutes for willful violations
   - Bad faith retention of security deposit
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to statutory remedies, potential treble damages if applicable.

6. DOCUMENTATION: Lease/deed, inspection reports, photographs, repair estimates, correspondence, HOA records.

### INSURANCE BAD FAITH ###

1. INTRODUCTION: "This firm represents [Client Name] regarding [Insurer]'s bad faith handling of claim under policy [Policy Number]."

2. FACTS: Policy type, claim date, loss description, claims handling timeline, denials/delays. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Insurer] acted in bad faith
   - Applicable California law: breach of implied covenant of good faith and fair dealing; Insurance Code §790.03 (Unfair Claims Practices Act); genuine dispute doctrine; duty to investigate and pay valid claims promptly; Egan v. Mutual of Omaha (bad faith tort elements); Civil Code §3294 (punitive damages for oppression, fraud, or malice)
   - How the facts establish bad faith conduct
   - Conclusion that [Insurer] acted in bad faith
   
   Example tone: "California law imposes on every insurer an implied covenant of good faith and fair dealing with its insureds. [Insurer]'s conduct in handling [Client]'s claim—including [specific conduct such as unreasonable delays, failure to investigate, improper denial]—constitutes a breach of this duty. No genuine dispute existed regarding coverage, yet [Insurer] [failed to pay/delayed payment/denied the claim]. This conduct rises to the level of bad faith, exposing [Insurer] to liability for contract damages and, given the [oppressive/malicious] nature of its conduct, punitive damages under Civil Code section 3294."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   Begin by describing the claim handling misconduct: specific failures to investigate, unreasonable delays, improper denials, lowball settlement offers.

   COMPENSATORY DAMAGES:
   A. Contract Damages:
      - Unpaid policy benefits owed under the contract
      - Interest on withheld benefits (10% per annum)
      - Benefits that should have been paid
   
   B. Tort Damages (Bad Faith):
      - Consequential economic losses caused by delay/denial
      - Out-of-pocket expenses incurred
      - Attorney's fees incurred to obtain benefits (Brandt fees)
   
   C. Non-Economic Damages:
      - Emotional distress from bad faith claims handling
      - Anxiety, stress, and mental anguish
      - Physical manifestations of emotional distress
   
   PUNITIVE DAMAGES:
   - Bad faith insurance claims are prime candidates for punitive damages
   - Requires clear and convincing evidence of oppression, fraud, or malice (Civil Code §3294)
   - Consider ratio to compensatory damages (typically 1:1 to 4:1 in California)
   - Insurer's financial condition relevant to amount
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Policy limits plus [Amount] for bad faith damages, reference to potential punitive damages.

6. DOCUMENTATION: Policy, claim file, correspondence, denial letters, estimates, expert reports.

### CONSUMER PROTECTION ###

1. INTRODUCTION: "This firm represents [Client Name] regarding [Defendant]'s unlawful business practices."

2. FACTS: Products/services involved, representations made, how client was harmed, timeline. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Defendant] engaged in unlawful, unfair, or fraudulent business practices
   - Applicable California law: UCL (Business & Professions Code §17200 et seq.—unlawful, unfair, fraudulent prongs); CLRA (Civil Code §1750 et seq.); False Advertising Law (Business & Professions Code §17500); TCPA (47 U.S.C. §227); CCPA (Civil Code §1798.100 et seq.); Song-Beverly Act (Civil Code §1790 et seq.)
   - How the facts establish consumer protection violations
   - Conclusion that [Defendant] violated consumer protection laws
   
   Example tone: "California's Unfair Competition Law, Business and Professions Code section 17200, prohibits any unlawful, unfair, or fraudulent business practice. [Defendant]'s conduct—specifically, [representations/practices]—constitutes a [fraudulent/unlawful/unfair] business practice under the UCL. [Client] reasonably relied on [Defendant]'s [representations] and suffered [harm] as a direct result. [Defendant] is liable under California consumer protection law and subject to restitution and civil penalties."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   Begin by describing the consumer harm: how consumer was misled, reliance on representations, impact on purchasing decision.

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages:
      - Purchase price paid
      - Out-of-pocket losses
      - Cost of replacement/repair
      - Difference in value (benefit of the bargain)
   
   B. Non-Economic Damages (if fraud/intentional conduct):
      - Emotional distress from being defrauded
      - Annoyance and inconvenience
   
   STATUTORY DAMAGES:
   - CLRA: Actual damages OR statutory damages up to $1,000 per violation
   - TCPA: $500-$1,500 per violation
   - Song-Beverly Act: Civil penalties up to $2,500 per violation
   - CCPA: Statutory damages $100-$750 per incident
   
   RESTITUTION:
   - Return of money wrongfully obtained
   - Disgorgement of defendant's profits (UCL remedy)
   
   CIVIL PENALTIES:
   - UCL: Up to $2,500 per violation
   - False advertising: Up to $2,500 per violation
   
   PUNITIVE DAMAGES (if fraud proven):
   - Available for intentional fraud claims
   - Requires clear and convincing evidence (Civil Code §3294)
   
   ATTORNEYS' FEES (if statutory basis):
   - Available under CLRA, Song-Beverly, and certain other statutes
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to statutory remedies, attorneys' fees provisions.

6. DOCUMENTATION: Advertisements, contracts, receipts, communications, recordings, complaint records.

### PROFESSIONAL LIABILITY ###

1. INTRODUCTION: "This firm represents [Client Name] regarding professional malpractice by [Professional/Firm]."

2. FACTS: Professional relationship, engagement terms, specific negligent acts, timeline, discovery of harm. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Professional] committed malpractice
   - Applicable California law: professional standard of care (that of a reasonably competent professional in the field); for legal malpractice—duty, breach, causation (case-within-a-case doctrine), damages; for accounting malpractice—GAAP/GAAS standards; for broker liability—Civil Code §2079 and Business & Professions Code; applicable statutes of limitations
   - How the facts establish each element of malpractice
   - Conclusion that [Professional] breached the standard of care
   
   Example tone: "[Professional] owed [Client] a duty to exercise the skill and care of a reasonably competent [attorney/accountant/broker] in the same field. By [specific negligent conduct], [Professional] fell below this standard. But for this negligence, [Client] would have [obtained favorable result/avoided harm]. As a direct and proximate result of [Professional]'s breach, [Client] suffered damages in the amount of [Amount]. [Professional] is liable for professional malpractice under California law."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   Begin by describing the professional negligence: specific failures, deviations from standard of care, missed deadlines, errors made.

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages:
      - Legal malpractice: Value of lost case (case-within-a-case)
      - Accounting malpractice: Tax penalties, lost investments, financial losses
      - Broker malpractice: Difference in property value, lost transaction benefits
      - Fees paid to negligent professional
      - Costs to correct errors or hire replacement professional
      - Lost business opportunities
   
   B. Non-Economic Damages:
      - Emotional distress from professional failure (in appropriate cases)
      - Anxiety and stress from dealing with consequences
      - Note: Generally harder to recover in pure professional negligence cases
   
   CONSEQUENTIAL DAMAGES:
   - Additional legal fees incurred
   - Business losses flowing from malpractice
   - Lost opportunities that were foreseeable
   
   PUNITIVE DAMAGES (rare in malpractice):
   - Only if conduct rises to fraud, malice, or oppression
   - Rare in ordinary negligence malpractice claims
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to case-within-a-case value for legal malpractice.

6. DOCUMENTATION: Engagement letters, work product, correspondence, underlying case files, expert reports.

### CONSTRUCTION DEFECT ###

1. INTRODUCTION: "This firm represents [Client Name] regarding construction defects at [Property Address] by [Contractor/Developer]."

2. FACTS: Property, construction dates, defects discovered, inspections, complaints made, repair attempts. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Contractor/Developer] is liable for construction defects
   - Applicable California law: SB 800 Right to Repair Act (Civil Code §895 et seq.); Civil Code §896 (functionality standards for each component); breach of contract/warranty; negligence in construction; strict liability for latent defects; design professional liability; Contractor's License Law (Business & Professions Code §7000 et seq.)
   - How the facts establish defects and liability
   - Conclusion that [Builder] is liable for the defects
   
   Example tone: "Under California's Right to Repair Act, Civil Code section 895 et seq., residential builders must construct homes that meet specific functionality standards. The construction defects at [Property Address]—including [specific defects]—fail to meet the standards set forth in Civil Code section 896. [Contractor/Developer] is strictly liable for these defects, which include [list defects]. Additionally, [Contractor/Developer]'s failure to [specific conduct] constitutes negligence. [Client] is entitled to the cost of repairs and related damages under California law."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   Begin by describing the defects and conditions: specific defects (structural, plumbing, electrical, roofing, waterproofing, etc.), how discovered, current condition, and impact on habitability.

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages:
      - Cost of repair (primary measure under SB 800)
      - Diminution in property value (if repair impractical)
      - Relocation and temporary housing costs during repairs
      - Loss of use damages
      - Expert investigation and testing costs
      - Permit and inspection fees for repairs
   
   B. Non-Economic Damages:
      - Inconvenience and disruption to daily life
      - Emotional distress from living with defective home
      - Loss of enjoyment of property
      - Annoyance from dealing with construction issues
   
   CONSEQUENTIAL DAMAGES:
   - Damage to personal property from defects (water intrusion, etc.)
   - Increased utility costs from defective systems
   - Health-related costs if mold or other hazards
   
   STATUTORY REMEDIES (SB 800):
   - Civil Code §944: Recovery of repair costs, relocation, loss of use, investigative costs
   - Treble damages for failure to comply with right to repair procedures
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to SB 800 procedures if applicable.

6. DOCUMENTATION: Construction documents, inspection reports, expert reports, photographs, repair estimates, correspondence.

### PROBATE & TRUST ###

1. INTRODUCTION: "This firm represents [Client Name] regarding [trust/estate dispute type] involving [Decedent/Trust Name]."

2. FACTS: Relationship to decedent/trust, trust/will terms, disputed actions, timeline of events. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Fiduciary/Party] breached duties or engaged in misconduct
   - Applicable California law: Probate Code §§15800-15802 (trustee duties); Probate Code §16000 et seq. (duties of loyalty, impartiality); will contests under Probate Code §§8200, 6104 (undue influence, lack of capacity); elder abuse under Welfare & Institutions Code §15610 et seq.; fiduciary duties of loyalty, prudence, impartiality; accounting requirements under Probate Code §16060
   - How the facts establish breach of duty or misconduct
   - Conclusion that [Fiduciary/Party] breached duties
   
   Example tone: "As trustee of the [Trust Name], [Fiduciary] owed beneficiaries, including [Client], the highest fiduciary duties of loyalty and care under Probate Code section 16000 et seq. [Fiduciary] breached these duties by [specific conduct such as self-dealing, failure to account, mismanagement]. These actions violated [Fiduciary]'s obligation to administer the trust solely in the interest of the beneficiaries and to avoid conflicts of interest. [Client] is entitled to surcharge [Fiduciary] for resulting losses and seek [Fiduciary]'s removal."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   Begin by describing the breach of duty: specific breaches of fiduciary duty, self-dealing, mismanagement, failure to account, or other misconduct.

   COMPENSATORY DAMAGES:
   A. Economic (Special) Damages:
      - Misappropriated assets and funds
      - Investment losses from imprudent management
      - Diminution in estate/trust value
      - Lost income or distributions
      - Costs to correct fiduciary's errors
      - Accounting and forensic investigation costs
   
   B. Non-Economic Damages:
      - Emotional distress from breach of trust
      - Damage to family relationships
   
   SURCHARGE OF FIDUCIARY:
   - Fiduciary personally liable for all losses caused by breach
   - May include profits fiduciary improperly obtained (Probate Code §16440)
   
   ELDER ABUSE DAMAGES (if applicable):
   - Enhanced damages under Welfare & Institutions Code §15657
   - Attorneys' fees and costs
   - Pain and suffering (heightened recovery)
   - Punitive damages for reckless or intentional conduct
   
   PUNITIVE DAMAGES (if applicable):
   - Available for intentional misconduct, fraud, or oppression
   - Particularly relevant in elder abuse cases
   
   EQUITABLE RELIEF:
   - Removal of fiduciary
   - Appointment of successor fiduciary
   - Constructive trust on improperly obtained assets
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], reference to surcharge of fiduciary, removal, attorneys' fees.

6. DOCUMENTATION: Trust documents, wills, accountings, financial records, correspondence, evidence of misconduct.

### INTELLECTUAL PROPERTY ###

1. INTRODUCTION: "This firm represents [Client Name] regarding infringement of intellectual property rights by [Defendant]."

2. FACTS: IP at issue, registration/ownership, infringing conduct, discovery of infringement, damages. ONLY from description.

3. LIABILITY: Write as professional flowing paragraphs (NO headers like "ISSUE:", "RULE:", etc.). The content should naturally address:
   - The legal question of whether [Defendant] infringed [Client]'s intellectual property rights
   - Applicable law: trademark (Lanham Act, California Business & Professions Code §14200 et seq.); copyright (17 U.S.C. §101 et seq.); trade secrets (Civil Code §3426 et seq. CUTSA, Defend Trade Secrets Act); patent (35 U.S.C., willful infringement)
   - How the facts establish infringement
   - Conclusion that [Defendant] infringed [Client]'s IP rights
   
   Example tone: "[Client] owns valid [trademark/copyright/trade secret/patent] rights in [description of IP]. [Defendant]'s unauthorized [use/reproduction/disclosure] of [Client]'s [IP] constitutes infringement under [applicable statute]. The infringement was [willful/knowing], as evidenced by [facts]. [Client] has suffered damages including [lost profits/reasonable royalty/defendant's profits] as a direct result of [Defendant]'s unlawful conduct. [Defendant] is liable for infringement and subject to [statutory damages/enhanced damages/injunctive relief]."

4. DAMAGES: Write a comprehensive, well-reasoned damages section as flowing paragraphs. Address ALL applicable damage categories:

   Begin by describing the infringing conduct: specific infringing acts, scope and duration of infringement, evidence of willfulness.

   COMPENSATORY DAMAGES:
   A. Actual Damages - Lost Profits:
      - Sales lost due to infringement
      - Price erosion caused by competition
      - Lost licensing revenue
   
   B. Reasonable Royalty:
      - Alternative to lost profits
      - What a willing licensor and licensee would have agreed to
   
   C. Defendant's Profits (Disgorgement):
      - Available in trademark and copyright cases
      - Plaintiff proves defendant's gross revenue; defendant proves deductions
   
   STATUTORY DAMAGES (Copyright):
   - $750 to $30,000 per work infringed (court's discretion)
   - Up to $150,000 per work for willful infringement
   - Available as alternative to actual damages
   
   ENHANCED/TREBLE DAMAGES:
   - Patent: Up to 3x damages for willful infringement (35 U.S.C. §284)
   - Trademark: Court may award up to 3x actual damages (15 U.S.C. §1117)
   - Trade secrets: Up to 2x damages for willful misappropriation (Civil Code §3426.3)
   
   ATTORNEYS' FEES:
   - Copyright: Available to prevailing party in court's discretion
   - Trademark: Available in "exceptional cases"
   - Trade secrets: Available for willful misappropriation or bad faith claims
   
   INJUNCTIVE RELIEF:
   - Preliminary and permanent injunctions to stop infringement
   - Seizure and destruction of infringing materials
   
   Use [Amount] for unspecified figures. Write as professional paragraphs. ONLY use facts provided.

5. SETTLEMENT DEMAND: Demand with [Amount], cease and desist, reference to statutory remedies, attorneys' fees.

6. DOCUMENTATION: Registration certificates, evidence of infringement, sales records, communications, expert valuations.

=== FINAL REQUIREMENTS ===

1. Generate ALL 6 sections - do not skip any
2. Use formal legal language appropriate to the case type
3. STRICTLY use only facts provided - no fabrication
4. Use [PLACEHOLDER] for missing information
5. Cite relevant California statutes for the specific case type
6. Adapt section titles/content to fit the case type
7. If case type is unclear, ask clarifying questions in the content or make reasonable assumptions based on context
8. Do NOT mix legal concepts from different case types (e.g., no FEHA in personal injury, no Vehicle Code in employment)

Generate the JSON response now. Only return valid JSON, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional legal writing assistant specializing in California civil litigation. You analyze case descriptions, identify the case type (personal injury, employment, contract, real estate, insurance bad faith, consumer protection, professional liability, construction defect, family law, intellectual property, probate/trust, or administrative), and generate structured demand letter content with appropriate California statutory citations. CRITICAL: Only use facts explicitly provided - never fabricate details. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 8000,  // Increased to handle all 12 case types with detailed sections
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        const statusText = response.statusText || 'Unknown error';
        errorData = {
          error: {
            message: `OpenAI API returned ${response.status}: ${statusText}`,
            code: response.status
          }
        };
      }
      
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      const errorMessage = errorData.error?.message || 
                           errorData.error?.code || 
                           errorData.error || 
                           `OpenAI API error: ${response.status} ${response.statusText}`;
      
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let sectionsContent;
    try {
      sectionsContent = extractJsonObject(generatedText);
      
      // Log which sections were generated for debugging
      console.log('Generated sections:', Object.keys(sectionsContent));
      console.log('Has LIABILITY section (3):', '3' in sectionsContent);
      
      // Normalize all section values to strings
      // If AI returns an object (like for IRAC structure), convert it to a formatted string
      const normalizedSections: Record<string, string> = {};
      for (const [key, value] of Object.entries(sectionsContent)) {
        if (typeof value === 'string') {
          normalizedSections[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          // If it's an object, convert it to a formatted string
          // Handle IRAC structure or other nested objects
          if (Array.isArray(value)) {
            normalizedSections[key] = value.join('\n\n');
          } else {
            // Convert object to formatted string
            const parts: string[] = [];
            for (const [objKey, objValue] of Object.entries(value)) {
              if (objValue && typeof objValue === 'string') {
                parts.push(`${objKey.toUpperCase()}:\n${objValue}`);
              } else if (objValue && typeof objValue === 'object') {
                // Handle nested objects (like IRAC with sub-sections)
                const nestedParts: string[] = [];
                for (const [nestedKey, nestedValue] of Object.entries(objValue as Record<string, unknown>)) {
                  if (nestedValue && typeof nestedValue === 'string') {
                    nestedParts.push(`${nestedKey}:\n${nestedValue}`);
                  }
                }
                if (nestedParts.length > 0) {
                  parts.push(`${objKey.toUpperCase()}:\n${nestedParts.join('\n\n')}`);
                }
              }
            }
            normalizedSections[key] = parts.join('\n\n');
          }
        } else {
          // Fallback: convert to string
          normalizedSections[key] = String(value);
        }
      }
      
      sectionsContent = normalizedSections;
      
      // Re-identify PII: restore original names, addresses, etc. from the mapping
      const reidentifiedSections: Record<string, string> = {};
      for (const [key, value] of Object.entries(sectionsContent)) {
        if (typeof value === 'string') {
          // First, apply the standard re-identification for our anonymization placeholders
          let restored = reidentifyData(value, mapping, contextualMappings);
          
          // Then, replace AI-generated placeholders with actual values from the mapping
          // The AI often uses variations like [Client Name], [Defendant Name], etc.
          
          // Get names from the mapping for smart replacement
          const names = mapping['[NAME]'] || [];
          const titledNames = mapping['[TITLE] [NAME]'] || [];
          const legalRoleNames = mapping['[LEGAL_ROLE]: [NAME]'] || [];
          const companies = mapping['[COMPANY]'] || [];
          const addresses = mapping['[ADDRESS]'] || [];
          const emails = mapping['[EMAIL]'] || [];
          const phones = mapping['[PHONE]'] || [];
          
          // Extract contextual names (client vs defendant etc.)
          const clientNames: string[] = [];
          const defendantNames: string[] = [];
          const plaintiffNames: string[] = [];
          const witnessNames: string[] = [];
          
          if (contextualMappings) {
            contextualMappings.forEach(cm => {
              if (cm.context.includes('client') || cm.context.includes('plaintiff') || cm.context.includes('claimant')) {
                clientNames.push(cm.original);
                plaintiffNames.push(cm.original);
              }
              if (cm.context.includes('defendant') || cm.context.includes('insured') || cm.context.includes('respondent')) {
                defendantNames.push(cm.original);
              }
              if (cm.context.includes('witness')) {
                witnessNames.push(cm.original);
              }
            });
          }
          
          // Fallback: if no contextual info, use first name as client, second as defendant
          if (clientNames.length === 0 && names.length > 0) {
            clientNames.push(names[0]);
          }
          if (defendantNames.length === 0 && names.length > 1) {
            defendantNames.push(names[1]);
          }
          if (defendantNames.length === 0 && companies.length > 0) {
            defendantNames.push(companies[0]);
          }
          
          // Replace AI-generated placeholders with actual values
          // Client/Plaintiff names
          const clientPlaceholders = [
            /\[Client Name\]/gi,
            /\[Client's Name\]/gi,
            /\[Client\]/gi,
            /\[Plaintiff Name\]/gi,
            /\[Plaintiff's Name\]/gi,
            /\[Plaintiff\]/gi,
            /\[Claimant Name\]/gi,
            /\[Claimant\]/gi,
            /\[Employee Name\]/gi,
            /\[Employee\]/gi,
            /\[Your Client\]/gi,
            /\[Our Client\]/gi,
          ];
          
          clientPlaceholders.forEach(pattern => {
            if (clientNames.length > 0) {
              restored = restored.replace(pattern, clientNames[0]);
            }
          });
          
          // Defendant/Opposing Party names
          const defendantPlaceholders = [
            /\[Defendant Name\]/gi,
            /\[Defendant's Name\]/gi,
            /\[Defendant\]/gi,
            /\[Opposing Party\]/gi,
            /\[Opposing Party's Name\]/gi,
            /\[Insured Name\]/gi,
            /\[Insured's Name\]/gi,
            /\[Insured\]/gi,
            /\[Your Insured\]/gi,
            /\[Employer Name\]/gi,
            /\[Employer's Name\]/gi,
            /\[Employer\]/gi,
            /\[Respondent Name\]/gi,
            /\[Respondent\]/gi,
            /\[Company Name\]/gi,
            /\[Company\]/gi,
            /\[Contractor Name\]/gi,
            /\[Contractor\]/gi,
            /\[Professional Name\]/gi,
            /\[Professional\]/gi,
          ];
          
          defendantPlaceholders.forEach(pattern => {
            if (defendantNames.length > 0) {
              restored = restored.replace(pattern, defendantNames[0]);
            } else if (companies.length > 0) {
              restored = restored.replace(pattern, companies[0]);
            }
          });
          
          // Witness names
          const witnessPlaceholders = [
            /\[Witness Name\]/gi,
            /\[Witness\]/gi,
          ];
          
          witnessPlaceholders.forEach(pattern => {
            if (witnessNames.length > 0) {
              restored = restored.replace(pattern, witnessNames[0]);
            }
          });
          
          // Address placeholders
          const addressPlaceholders = [
            /\[Address\]/gi,
            /\[Property Address\]/gi,
            /\[Location\]/gi,
            /\[Street Address\]/gi,
          ];
          
          addressPlaceholders.forEach(pattern => {
            if (addresses.length > 0) {
              restored = restored.replace(pattern, addresses[0]);
            }
          });
          
          // Company placeholders (if not already handled)
          const companyPlaceholders = [
            /\[Law Firm\]/gi,
            /\[Firm Name\]/gi,
            /\[Business Name\]/gi,
          ];
          
          companyPlaceholders.forEach(pattern => {
            if (companies.length > 0) {
              restored = restored.replace(pattern, companies[0]);
            }
          });
          
          // Email placeholders
          if (emails.length > 0) {
            restored = restored.replace(/\[Email\]/gi, emails[0]);
            restored = restored.replace(/\[Email Address\]/gi, emails[0]);
          }
          
          // Phone placeholders
          if (phones.length > 0) {
            restored = restored.replace(/\[Phone\]/gi, phones[0]);
            restored = restored.replace(/\[Phone Number\]/gi, phones[0]);
          }
          
          reidentifiedSections[key] = restored;
        } else {
          reidentifiedSections[key] = String(value);
        }
      }
      sectionsContent = reidentifiedSections;
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', generatedText);
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sections: sectionsContent });
  } catch (error) {
    console.error('AI API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: `An error occurred while generating content: ${errorMessage}` },
      { status: 500 }
    );
  }
}





