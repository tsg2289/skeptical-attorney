import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeInput, validateAnswerInput, rateLimit, handleApiError } from '@/lib/utils/answerUtils'
import { anonymizeDataWithMapping, reidentifyData, PIIMapping, ContextualMapping } from '@/lib/utils/anonymize'

// Case type definitions
type CaseType = 
  | 'personal_injury_auto'
  | 'personal_injury_premises'
  | 'personal_injury_medical_malpractice'
  | 'personal_injury_product_liability'
  | 'personal_injury_general'
  | 'contract_breach'
  | 'employment_wrongful_termination'
  | 'employment_discrimination'
  | 'employment_harassment'
  | 'employment_wage_hour'
  | 'intellectual_property_copyright'
  | 'intellectual_property_trademark'
  | 'intellectual_property_trade_secret'
  | 'real_estate'
  | 'fraud'
  | 'defamation'
  | 'general_civil'

interface CaseTypeResult {
  primaryType: CaseType
  secondaryTypes: CaseType[]
  confidence: 'high' | 'medium' | 'low'
  detectedKeywords: string[]
}

// Detect case type from complaint text
function detectCaseType(complaintText: string): CaseTypeResult {
  const text = complaintText.toLowerCase()
  const detectedKeywords: string[] = []
  const scores: Record<CaseType, number> = {
    personal_injury_auto: 0,
    personal_injury_premises: 0,
    personal_injury_medical_malpractice: 0,
    personal_injury_product_liability: 0,
    personal_injury_general: 0,
    contract_breach: 0,
    employment_wrongful_termination: 0,
    employment_discrimination: 0,
    employment_harassment: 0,
    employment_wage_hour: 0,
    intellectual_property_copyright: 0,
    intellectual_property_trademark: 0,
    intellectual_property_trade_secret: 0,
    real_estate: 0,
    fraud: 0,
    defamation: 0,
    general_civil: 0,
  }

  // Personal Injury - Auto
  const autoKeywords = ['motor vehicle', 'automobile', 'car accident', 'vehicle collision', 'traffic', 'driver', 'drove', 'driving', 'rear-end', 'intersection', 'highway', 'freeway', 'pedestrian', 'bicycl', 'motorcycl', 'truck accident', 'uber', 'lyft', 'rideshare']
  autoKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.personal_injury_auto += 3
      detectedKeywords.push(kw)
    }
  })

  // Personal Injury - Premises Liability
  const premisesKeywords = ['slip and fall', 'trip and fall', 'premises liability', 'property owner', 'dangerous condition', 'hazardous', 'wet floor', 'inadequate lighting', 'security', 'negligent maintenance', 'stairway', 'parking lot', 'swimming pool', 'dog bite', 'animal attack']
  premisesKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.personal_injury_premises += 3
      detectedKeywords.push(kw)
    }
  })

  // Personal Injury - Medical Malpractice
  const medmalKeywords = ['medical malpractice', 'medical negligence', 'doctor', 'physician', 'surgeon', 'hospital', 'nursing', 'misdiagnos', 'surgical error', 'standard of care', 'informed consent', 'medication error', 'birth injury', 'anesthesia']
  medmalKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.personal_injury_medical_malpractice += 3
      detectedKeywords.push(kw)
    }
  })

  // Personal Injury - Product Liability
  const productKeywords = ['product liability', 'defective product', 'manufacturing defect', 'design defect', 'failure to warn', 'strict liability', 'consumer product', 'recalled', 'malfunction']
  productKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.personal_injury_product_liability += 3
      detectedKeywords.push(kw)
    }
  })

  // General Personal Injury indicators
  const piKeywords = ['personal injury', 'bodily injury', 'physical injury', 'pain and suffering', 'medical expenses', 'medical bills', 'lost wages', 'loss of earning', 'emotional distress', 'negligence', 'duty of care', 'breach of duty', 'causation', 'damages']
  piKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.personal_injury_general += 1
      if (!detectedKeywords.includes(kw)) detectedKeywords.push(kw)
    }
  })

  // Contract/Business
  const contractKeywords = ['breach of contract', 'contract', 'agreement', 'covenant', 'warranty', 'consideration', 'performance', 'non-performance', 'material breach', 'anticipatory breach', 'specific performance', 'liquidated damages', 'indemnif']
  contractKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.contract_breach += 2
      detectedKeywords.push(kw)
    }
  })

  // Employment - Wrongful Termination
  const wtKeywords = ['wrongful termination', 'wrongfully terminated', 'fired', 'discharged', 'retaliat', 'whistleblow', 'public policy', 'at-will']
  wtKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.employment_wrongful_termination += 3
      detectedKeywords.push(kw)
    }
  })

  // Employment - Discrimination
  const discrimKeywords = ['discriminat', 'title vii', 'feha', 'race', 'gender', 'sex', 'age', 'disability', 'national origin', 'religion', 'pregnancy', 'protected class', 'disparate treatment', 'disparate impact', 'ada', 'adea']
  discrimKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.employment_discrimination += 3
      detectedKeywords.push(kw)
    }
  })

  // Employment - Harassment
  const harassKeywords = ['harassment', 'hostile work environment', 'sexual harassment', 'quid pro quo', 'unwelcome conduct', 'severe and pervasive']
  harassKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.employment_harassment += 3
      detectedKeywords.push(kw)
    }
  })

  // Employment - Wage & Hour
  const wageKeywords = ['wage', 'overtime', 'minimum wage', 'meal break', 'rest break', 'paga', 'labor code', 'misclassif', 'independent contractor', 'unpaid', 'tip', 'commission']
  wageKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.employment_wage_hour += 3
      detectedKeywords.push(kw)
    }
  })

  // Intellectual Property - Copyright
  const copyrightKeywords = ['copyright', 'infringement', 'copyrighted work', 'reproduction', 'derivative work', 'dmca', 'fair use', 'literary work', 'artistic work']
  copyrightKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.intellectual_property_copyright += 3
      detectedKeywords.push(kw)
    }
  })

  // Intellectual Property - Trademark
  const trademarkKeywords = ['trademark', 'trade mark', 'service mark', 'likelihood of confusion', 'dilution', 'lanham act', 'brand', 'logo']
  trademarkKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.intellectual_property_trademark += 3
      detectedKeywords.push(kw)
    }
  })

  // Intellectual Property - Trade Secret
  const tradeSecretKeywords = ['trade secret', 'misappropriation', 'confidential information', 'proprietary', 'dtsa', 'cutsa', 'non-compete', 'non-disclosure']
  tradeSecretKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.intellectual_property_trade_secret += 3
      detectedKeywords.push(kw)
    }
  })

  // Real Estate
  const realEstateKeywords = ['real property', 'real estate', 'landlord', 'tenant', 'lease', 'eviction', 'quiet title', 'easement', 'boundary', 'partition', 'foreclosure', 'deed', 'title']
  realEstateKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.real_estate += 3
      detectedKeywords.push(kw)
    }
  })

  // Fraud
  const fraudKeywords = ['fraud', 'fraudulent', 'misrepresentation', 'deceit', 'false representation', 'concealment', 'intentional misrepresentation', 'negligent misrepresentation', 'reliance']
  fraudKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.fraud += 3
      detectedKeywords.push(kw)
    }
  })

  // Defamation
  const defamationKeywords = ['defamation', 'libel', 'slander', 'false statement', 'reputation', 'published', 'defamatory']
  defamationKeywords.forEach(kw => {
    if (text.includes(kw)) {
      scores.defamation += 3
      detectedKeywords.push(kw)
    }
  })

  // Find primary and secondary types
  const sortedTypes = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)

  let primaryType: CaseType = 'general_civil'
  let secondaryTypes: CaseType[] = []
  let confidence: 'high' | 'medium' | 'low' = 'low'

  if (sortedTypes.length > 0) {
    primaryType = sortedTypes[0][0] as CaseType
    const primaryScore = sortedTypes[0][1]
    
    if (primaryScore >= 6) confidence = 'high'
    else if (primaryScore >= 3) confidence = 'medium'
    
    secondaryTypes = sortedTypes.slice(1, 4).map(([type]) => type as CaseType)
  }

  // If we detected general PI indicators but no specific type, use general PI
  if (primaryType === 'general_civil' && scores.personal_injury_general > 2) {
    primaryType = 'personal_injury_general'
    confidence = 'medium'
  }

  return {
    primaryType,
    secondaryTypes,
    confidence,
    detectedKeywords: [...new Set(detectedKeywords)].slice(0, 15)
  }
}

// Defense definitions by category
interface DefenseDefinition {
  id: string
  title: string
  content: string
  applicableTo: CaseType[]
  priority: number // 1 = always include, 2 = include if relevant, 3 = optional
}

function getDefenseLibrary(isMultipleDefendants: boolean): DefenseDefinition[] {
  const D = isMultipleDefendants ? 'Defendants' : 'Defendant'
  const d = isMultipleDefendants ? 'defendants' : 'defendant'
  const are = isMultipleDefendants ? 'are' : 'is'
  const believe = isMultipleDefendants ? 'believe' : 'believes'
  const allege = isMultipleDefendants ? 'allege' : 'alleges'
  const deny = isMultipleDefendants ? 'deny' : 'denies'
  const were = isMultipleDefendants ? 'were' : 'was'
  const these = isMultipleDefendants ? 'these answering Defendants' : 'this answering Defendant'
  const against = isMultipleDefendants ? 'against Defendants' : 'against Defendant'
  const of = isMultipleDefendants ? 'of Defendants' : 'of Defendant'

  return [
    // Universal Defenses (Priority 1)
    {
      id: 'failure_to_state',
      title: 'Failure To State a Cause Of Action',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that each and every cause of action in Plaintiff's complaint fails to state facts sufficient to state a claim upon which relief can be granted.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 1
    },
    {
      id: 'statute_of_limitations',
      title: 'Statute of Limitations',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the complaint, and each and every cause of action contained therein, is barred by the applicable statute of limitations including, but not limited to, California Code of Civil Procedure sections 335.1, 337, 338, 339, 340, 343, and other applicable provisions.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 1
    },
    {
      id: 'failure_to_mitigate',
      title: 'Failure To Mitigate Damages',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff failed to take reasonable efforts to mitigate the damages that allegedly were incurred.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 1
    },
    {
      id: 'no_causation',
      title: 'No Causation',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff is barred from recovery ${against} because any losses or damages purportedly sustained by Plaintiff were not proximately caused by any act or omission ${of}.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'fraud'],
      priority: 1
    },
    
    // Personal Injury - General (Priority 1-2)
    {
      id: 'comparative_negligence',
      title: "Plaintiff's Comparative Negligence",
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff was careless and negligent in and about the matters alleged in Plaintiff's complaint, and that said carelessness and negligence actually and/or proximately caused, or contributed to, in whole or in part, Plaintiff's alleged damages and that said damages, if any, must be diminished in proportion to the amount of fault properly attributable to Plaintiff.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability'],
      priority: 1
    },
    {
      id: 'third_party_fault',
      title: "Third Parties' Comparative Fault",
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that if Plaintiff suffered or sustained any obligation or liability for any loss, damage or injury as alleged in the complaint, such loss, damage or injury was proximately caused or contributed to by the wrongful and negligent acts and conduct of parties, persons or entities other than ${these}, and that such wrongful and negligent acts or conduct ${were} an intervening or superseding cause of the loss, damage or injury of which Plaintiff complains.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability'],
      priority: 1
    },
    {
      id: 'assumption_of_risk',
      title: 'Assumption of the Risk',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff is barred from asserting any claim ${against} by reason of the fact that Plaintiff impliedly and voluntarily assumed the risk of the matters causing the injuries and damages incurred, if any.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability'],
      priority: 1
    },
    {
      id: 'proportionate_liability',
      title: 'Proportionate Liability',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that in the event Plaintiff is entitled to non-economic damages including, but not limited to, pain, suffering, inconvenience, mental suffering, emotional distress, loss of society and companionship, loss of consortium, and/or injury to reputation and humiliation, ${D} shall be liable only for the amount of non-economic damages, if any, allocated to ${D}'s percentage of fault, and a separate judgment shall be rendered against ${D} for that amount pursuant to California Civil Code section 1431.2.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability', 'personal_injury_medical_malpractice'],
      priority: 1
    },
    {
      id: 'substantial_factor',
      title: 'Substantial Factor',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the acts and omissions ${of} as alleged in Plaintiff's claims for relief were not a substantial factor of the loss or damage for which Plaintiff seeks recovery.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability', 'personal_injury_medical_malpractice'],
      priority: 1
    },
    {
      id: 'excessive_medical_billing',
      title: 'Excessive Medical Billing',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the medical treatment allegedly procured by Plaintiff was unreasonable, medically unnecessary, and not the proximate result of the alleged incident. Furthermore, the medical billing is excessive and does not comport with the reasonable medical billing procedures in the State of California.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability', 'personal_injury_medical_malpractice'],
      priority: 2
    },
    {
      id: 'pre_existing_condition',
      title: 'Pre-Existing Condition',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff's alleged injuries and damages, if any, were caused in whole or in part by pre-existing physical, mental, or emotional conditions, injuries, or diseases that existed prior to the incident alleged in the complaint, and that any recovery must be reduced accordingly.`,
      applicableTo: ['personal_injury_auto', 'personal_injury_premises', 'personal_injury_general', 'personal_injury_product_liability', 'personal_injury_medical_malpractice'],
      priority: 2
    },

    // Auto-Specific Defenses
    {
      id: 'prop_213',
      title: 'Proposition 213',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff did not carry proper insurance coverage at the time of the incident per California Proposition 213 (Civil Code § 3333.4) and ${are} thus precluded from recovering non-economic damages.`,
      applicableTo: ['personal_injury_auto'],
      priority: 1
    },
    {
      id: 'uninsured_motorist',
      title: 'Uninsured Motorist',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff was an uninsured owner and/or operator of a motor vehicle. Plaintiff's recovery, if any, against ${these} should be reduced by the amounts paid or payable from coverage provided by an uninsured motorist endorsement for claims arising out of the same accident.`,
      applicableTo: ['personal_injury_auto'],
      priority: 2
    },
    {
      id: 'seatbelt_defense',
      title: 'Failure to Wear a Seatbelt/Misuse of Seatbelt',
      content: `Plaintiff is barred from recovering any remedy ${against} or Plaintiff's recovery should be reduced by the fact that Plaintiff was negligent in not wearing a seatbelt and/or similar safety restraint devices at the time of the incident. Plaintiff may not recover damages for those injuries and damages which would have not been sustained if Plaintiff had worn a seatbelt or similar safety restraint devices. Vehicle Code § 27315.`,
      applicableTo: ['personal_injury_auto'],
      priority: 2
    },
    {
      id: 'sudden_emergency',
      title: 'Sudden Emergency Doctrine',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} ${were} confronted with a sudden and unexpected emergency situation not of ${D}'s own making, and that ${D} acted as a reasonably careful person would have acted under similar circumstances.`,
      applicableTo: ['personal_injury_auto'],
      priority: 2
    },

    // Premises Liability Specific
    {
      id: 'open_obvious',
      title: 'Open and Obvious Danger',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any alleged dangerous condition was open and obvious to a reasonable person exercising ordinary care, and that Plaintiff either knew or should have known of such condition, thereby precluding recovery.`,
      applicableTo: ['personal_injury_premises'],
      priority: 1
    },
    {
      id: 'no_actual_constructive_notice',
      title: 'Lack of Actual or Constructive Notice',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} had no actual or constructive notice of any alleged dangerous condition on the premises, and that any such condition, if it existed, was not present for a sufficient period of time to permit discovery and correction through the exercise of reasonable care.`,
      applicableTo: ['personal_injury_premises'],
      priority: 1
    },
    {
      id: 'recreational_immunity',
      title: 'Recreational Use Immunity',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} ${are} immune from liability pursuant to California Civil Code sections 846 and 847, which provide immunity to landowners for injuries to persons using property for recreational purposes.`,
      applicableTo: ['personal_injury_premises'],
      priority: 3
    },

    // Medical Malpractice Specific
    {
      id: 'standard_of_care_met',
      title: 'Standard of Care Met',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} at all times acted within the applicable standard of care for medical professionals in the same or similar community, and that ${D}'s treatment of Plaintiff was appropriate, reasonable, and medically indicated.`,
      applicableTo: ['personal_injury_medical_malpractice'],
      priority: 1
    },
    {
      id: 'informed_consent',
      title: 'Informed Consent',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff was fully informed of all material risks, benefits, and alternatives to the treatment or procedure in question, and that Plaintiff gave informed consent to such treatment or procedure.`,
      applicableTo: ['personal_injury_medical_malpractice'],
      priority: 1
    },
    {
      id: 'medical_judgment',
      title: 'Good Faith Medical Judgment',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} exercised reasonable professional judgment in the diagnosis and treatment of Plaintiff, and that any adverse outcome was not the result of negligence but rather the inherent risks of medical treatment or the natural progression of Plaintiff's condition.`,
      applicableTo: ['personal_injury_medical_malpractice'],
      priority: 2
    },
    {
      id: 'micra_cap',
      title: 'MICRA Damages Cap',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any recovery for non-economic damages is limited pursuant to California Civil Code section 3333.2 (MICRA), which caps non-economic damages in medical malpractice actions.`,
      applicableTo: ['personal_injury_medical_malpractice'],
      priority: 1
    },

    // Product Liability Specific
    {
      id: 'product_misuse',
      title: 'Product Misuse',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff misused the product in question in a manner that was not reasonably foreseeable, and that such misuse was a substantial factor in causing any alleged injuries.`,
      applicableTo: ['personal_injury_product_liability'],
      priority: 1
    },
    {
      id: 'product_alteration',
      title: 'Subsequent Alteration or Modification',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the product was substantially altered or modified after it left ${D}'s control, and that such alteration or modification was a substantial factor in causing any alleged injuries.`,
      applicableTo: ['personal_injury_product_liability'],
      priority: 1
    },
    {
      id: 'state_of_art',
      title: 'State of the Art Defense',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the product was designed and manufactured in accordance with the state of the art and scientific and technical knowledge available at the time of manufacture.`,
      applicableTo: ['personal_injury_product_liability'],
      priority: 2
    },
    {
      id: 'component_manufacturer',
      title: 'Component Manufacturer Defense',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} merely supplied a component part and had no role in the design of the finished product, and that any alleged defect relates to the integration of the component rather than the component itself.`,
      applicableTo: ['personal_injury_product_liability'],
      priority: 3
    },

    // Contract Defenses
    {
      id: 'no_contract',
      title: 'No Contract Formed',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that no valid and enforceable contract was formed between the parties due to lack of mutual assent, consideration, capacity, or other essential elements of contract formation.`,
      applicableTo: ['contract_breach'],
      priority: 1
    },
    {
      id: 'statute_of_frauds',
      title: 'Statute of Frauds',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the alleged contract is unenforceable under the Statute of Frauds (California Civil Code § 1624) because it is not evidenced by a writing signed by the party to be charged.`,
      applicableTo: ['contract_breach'],
      priority: 2
    },
    {
      id: 'performance',
      title: 'Full Performance',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} fully performed all obligations under the alleged contract, and that any alleged breach is without merit.`,
      applicableTo: ['contract_breach'],
      priority: 1
    },
    {
      id: 'prior_material_breach',
      title: 'Prior Material Breach by Plaintiff',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff committed a prior material breach of the contract, which excused ${D}'s performance and bars Plaintiff's recovery.`,
      applicableTo: ['contract_breach'],
      priority: 1
    },
    {
      id: 'impossibility',
      title: 'Impossibility/Impracticability',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that performance of the alleged contract became impossible or commercially impracticable due to circumstances beyond ${D}'s control and not foreseeable at the time of contracting.`,
      applicableTo: ['contract_breach'],
      priority: 2
    },
    {
      id: 'waiver_contract',
      title: 'Waiver',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff waived any claim for breach by accepting performance, failing to object in a timely manner, or by other conduct inconsistent with an intent to enforce the contract as written.`,
      applicableTo: ['contract_breach'],
      priority: 2
    },
    {
      id: 'accord_satisfaction',
      title: 'Accord and Satisfaction',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the parties entered into an accord and satisfaction that discharged ${D}'s obligations under the original agreement.`,
      applicableTo: ['contract_breach'],
      priority: 3
    },

    // Employment - General
    {
      id: 'at_will',
      title: 'At-Will Employment',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff was an at-will employee who could be terminated at any time, with or without cause or advance notice, for any lawful reason or no reason at all.`,
      applicableTo: ['employment_wrongful_termination'],
      priority: 1
    },
    {
      id: 'legitimate_business_reason',
      title: 'Legitimate Non-Discriminatory Business Reason',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that all employment decisions regarding Plaintiff were based on legitimate, non-discriminatory, and non-retaliatory business reasons, including but not limited to job performance, business necessity, and/or restructuring.`,
      applicableTo: ['employment_wrongful_termination', 'employment_discrimination'],
      priority: 1
    },
    {
      id: 'failure_exhaust_admin',
      title: 'Failure to Exhaust Administrative Remedies',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff failed to exhaust available administrative remedies, including but not limited to filing a timely complaint with the Department of Fair Employment and Housing (DFEH) or Equal Employment Opportunity Commission (EEOC), as required prior to filing suit.`,
      applicableTo: ['employment_wrongful_termination', 'employment_discrimination', 'employment_harassment'],
      priority: 1
    },
    {
      id: 'same_actor',
      title: 'Same Actor Inference',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the same individual who made the allegedly discriminatory employment decision also hired or promoted Plaintiff, giving rise to a strong inference that discrimination was not a motivating factor.`,
      applicableTo: ['employment_discrimination'],
      priority: 2
    },
    {
      id: 'after_acquired_evidence',
      title: 'After-Acquired Evidence',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} discovered evidence after Plaintiff's termination that would have resulted in Plaintiff's termination or discipline had it been known earlier, which limits or bars Plaintiff's recovery.`,
      applicableTo: ['employment_wrongful_termination', 'employment_discrimination'],
      priority: 2
    },
    {
      id: 'avoidable_consequences_employment',
      title: 'Failure to Use Preventive Measures',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} exercised reasonable care to prevent and promptly correct any harassing or discriminatory behavior, and that Plaintiff unreasonably failed to take advantage of preventive or corrective opportunities provided by ${D}.`,
      applicableTo: ['employment_harassment', 'employment_discrimination'],
      priority: 1
    },
    {
      id: 'bona_fide_occupational',
      title: 'Bona Fide Occupational Qualification',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any employment decision based on the characteristic at issue was justified as a bona fide occupational qualification reasonably necessary to the normal operation of ${D}'s business.`,
      applicableTo: ['employment_discrimination'],
      priority: 3
    },

    // Wage & Hour Specific
    {
      id: 'exempt_employee',
      title: 'Exempt Employee Status',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff was properly classified as an exempt employee under the applicable California Labor Code provisions and Industrial Welfare Commission Wage Orders, and was therefore not entitled to overtime compensation, meal periods, or rest breaks.`,
      applicableTo: ['employment_wage_hour'],
      priority: 1
    },
    {
      id: 'meal_rest_provided',
      title: 'Meal and Rest Breaks Provided',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} provided Plaintiff with all legally required meal and rest periods, and that any alleged missed breaks were the result of Plaintiff's own choice or actions.`,
      applicableTo: ['employment_wage_hour'],
      priority: 1
    },
    {
      id: 'good_faith_wage',
      title: 'Good Faith Wage Payment',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} acted in good faith in paying wages to Plaintiff, with a reasonable belief that such payments complied with all applicable laws, thereby precluding any award of penalties.`,
      applicableTo: ['employment_wage_hour'],
      priority: 2
    },
    {
      id: 'independent_contractor',
      title: 'Independent Contractor Status',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff was properly classified as an independent contractor under California law, including the ABC test and/or Borello factors, and was therefore not entitled to employee benefits and protections.`,
      applicableTo: ['employment_wage_hour'],
      priority: 2
    },

    // Intellectual Property - Copyright
    {
      id: 'fair_use',
      title: 'Fair Use',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any use of Plaintiff's allegedly copyrighted material constitutes fair use under 17 U.S.C. § 107, considering the purpose and character of the use, the nature of the copyrighted work, the amount used, and the effect on the potential market.`,
      applicableTo: ['intellectual_property_copyright'],
      priority: 1
    },
    {
      id: 'copyright_independent_creation',
      title: 'Independent Creation',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} independently created the work in question without copying or having access to Plaintiff's allegedly copyrighted material.`,
      applicableTo: ['intellectual_property_copyright'],
      priority: 1
    },
    {
      id: 'copyright_invalidity',
      title: 'Copyright Invalidity',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff's copyright registration is invalid due to lack of originality, failure to meet statutory requirements, fraud on the Copyright Office, or other defects.`,
      applicableTo: ['intellectual_property_copyright'],
      priority: 2
    },
    {
      id: 'copyright_license',
      title: 'License/Authorization',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} had a license or authorization, whether express or implied, to use the copyrighted material in the manner alleged.`,
      applicableTo: ['intellectual_property_copyright'],
      priority: 1
    },
    {
      id: 'first_sale',
      title: 'First Sale Doctrine',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D}'s use of the copyrighted material is protected by the first sale doctrine under 17 U.S.C. § 109, which permits the owner of a lawfully made copy to sell or otherwise dispose of that copy.`,
      applicableTo: ['intellectual_property_copyright'],
      priority: 2
    },

    // Intellectual Property - Trademark
    {
      id: 'no_likelihood_confusion',
      title: 'No Likelihood of Confusion',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that there is no likelihood of confusion between ${D}'s marks or products and Plaintiff's marks or products, considering the strength of the marks, similarity, proximity of goods, evidence of actual confusion, marketing channels, and other relevant factors.`,
      applicableTo: ['intellectual_property_trademark'],
      priority: 1
    },
    {
      id: 'trademark_fair_use',
      title: 'Trademark Fair Use',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D}'s use of the mark constitutes fair use, either as descriptive fair use or nominative fair use, and is therefore not actionable.`,
      applicableTo: ['intellectual_property_trademark'],
      priority: 1
    },
    {
      id: 'trademark_abandonment',
      title: 'Abandonment',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff has abandoned its trademark rights through non-use, naked licensing, or other conduct inconsistent with continued ownership.`,
      applicableTo: ['intellectual_property_trademark'],
      priority: 2
    },
    {
      id: 'trademark_invalidity',
      title: 'Trademark Invalidity',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff's trademark is invalid because it is generic, merely descriptive without secondary meaning, functional, or was fraudulently obtained.`,
      applicableTo: ['intellectual_property_trademark'],
      priority: 2
    },

    // Intellectual Property - Trade Secret
    {
      id: 'not_trade_secret',
      title: 'Information Does Not Qualify as Trade Secret',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that the information alleged to be a trade secret does not qualify for protection because it is generally known, readily ascertainable through proper means, or Plaintiff failed to take reasonable measures to maintain its secrecy.`,
      applicableTo: ['intellectual_property_trade_secret'],
      priority: 1
    },
    {
      id: 'proper_means',
      title: 'Acquired Through Proper Means',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} acquired any information through proper and lawful means, including independent development, reverse engineering, or from publicly available sources.`,
      applicableTo: ['intellectual_property_trade_secret'],
      priority: 1
    },
    {
      id: 'no_misappropriation',
      title: 'No Misappropriation',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} did not misappropriate any trade secret by improper means, and did not use or disclose any trade secret knowing or having reason to know it was acquired improperly.`,
      applicableTo: ['intellectual_property_trade_secret'],
      priority: 1
    },

    // Fraud Defenses
    {
      id: 'no_misrepresentation',
      title: 'No Misrepresentation',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} made no false representation of material fact to Plaintiff, and that all statements made were true and accurate to the best of ${D}'s knowledge.`,
      applicableTo: ['fraud'],
      priority: 1
    },
    {
      id: 'no_justifiable_reliance',
      title: 'No Justifiable Reliance',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff did not justifiably rely on any alleged misrepresentation, either because Plaintiff knew or should have known the true facts, or because reliance was unreasonable under the circumstances.`,
      applicableTo: ['fraud'],
      priority: 1
    },
    {
      id: 'opinion_not_fact',
      title: 'Statement of Opinion',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any statement at issue was a statement of opinion, prediction, or puffery rather than a statement of fact, and therefore cannot form the basis of a fraud claim.`,
      applicableTo: ['fraud'],
      priority: 2
    },
    {
      id: 'economic_loss_rule',
      title: 'Economic Loss Rule',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff's fraud claim is barred by the economic loss rule, which precludes tort recovery for purely economic losses arising from a contractual relationship.`,
      applicableTo: ['fraud'],
      priority: 2
    },

    // Defamation Defenses
    {
      id: 'truth',
      title: 'Truth',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any statement at issue was substantially true, and truth is an absolute defense to claims of defamation.`,
      applicableTo: ['defamation'],
      priority: 1
    },
    {
      id: 'opinion_defamation',
      title: 'Protected Opinion',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any statement at issue was a constitutionally protected expression of opinion rather than a statement of fact, and is therefore not actionable as defamation.`,
      applicableTo: ['defamation'],
      priority: 1
    },
    {
      id: 'privilege_defamation',
      title: 'Privilege',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that any statement at issue was protected by an absolute or qualified privilege, including but not limited to statements made in judicial proceedings, legislative proceedings, or in the discharge of an official duty.`,
      applicableTo: ['defamation'],
      priority: 1
    },
    {
      id: 'anti_slapp',
      title: 'Anti-SLAPP (California Code of Civil Procedure § 425.16)',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that this action arises from ${D}'s exercise of the constitutional rights of free speech or petition in connection with a public issue, and is subject to a special motion to strike under California's Anti-SLAPP statute.`,
      applicableTo: ['defamation'],
      priority: 1
    },

    // General/Universal Additional Defenses
    {
      id: 'estoppel',
      title: 'Estoppel',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff should be barred from asserting the claims based upon the equitable doctrine of estoppel.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 2
    },
    {
      id: 'laches',
      title: 'Laches',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff should be barred from asserting the claims based upon the equitable doctrine of laches due to Plaintiff's unreasonable delay in bringing this action, which has resulted in prejudice to ${D}.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 2
    },
    {
      id: 'unclean_hands',
      title: 'Unclean Hands',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that Plaintiff should be barred from asserting the claims based upon the equitable doctrine of unclean hands.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 2
    },
    {
      id: 'failure_join_parties',
      title: 'Failure to Join Necessary/Indispensable Parties',
      content: `Plaintiff has failed to name or join in the complaint a necessary/indispensable party or parties to the present action.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 2
    },
    {
      id: 'reservation',
      title: 'Reservation of Additional Affirmative Defenses',
      content: `${D} ${are} informed and ${believe} and thereon ${allege} that ${D} cannot fully anticipate all affirmative defenses that may be applicable to the subject action. Accordingly, the right to assert additional affirmative defenses, if and to the extent that such affirmative defenses are applicable, is hereby reserved.`,
      applicableTo: ['general_civil', 'personal_injury_auto', 'personal_injury_premises', 'personal_injury_medical_malpractice', 'personal_injury_product_liability', 'personal_injury_general', 'contract_breach', 'employment_wrongful_termination', 'employment_discrimination', 'employment_harassment', 'employment_wage_hour', 'intellectual_property_copyright', 'intellectual_property_trademark', 'intellectual_property_trade_secret', 'real_estate', 'fraud', 'defamation'],
      priority: 1
    },
  ]
}

// Select applicable defenses based on case type
function selectApplicableDefenses(caseTypeResult: CaseTypeResult, isMultipleDefendants: boolean): DefenseDefinition[] {
  const library = getDefenseLibrary(isMultipleDefendants)
  const allTypes = [caseTypeResult.primaryType, ...caseTypeResult.secondaryTypes]
  
  // Get all applicable defenses
  const applicableDefenses = library.filter(defense => 
    defense.applicableTo.some(type => allTypes.includes(type) || type === 'general_civil')
  )
  
  // Sort by priority and remove duplicates
  const seen = new Set<string>()
  const sortedDefenses = applicableDefenses
    .sort((a, b) => a.priority - b.priority)
    .filter(defense => {
      if (seen.has(defense.id)) return false
      seen.add(defense.id)
      return true
    })
  
  return sortedDefenses
}

// Generate the answer with case-specific defenses
function generateCaseSpecificAnswer(
  plaintiffName: string, 
  defendantName: string, 
  defenses: DefenseDefinition[],
  isMultipleDefendants: boolean
): string {
  const date = new Date().toLocaleDateString()
  const D = isMultipleDefendants ? 'Defendants' : 'Defendant'
  const P = 'Plaintiff'
  const Poss = "Plaintiff's"
  const dVerb = isMultipleDefendants ? 'answer' : 'answers'
  const dVerb2 = isMultipleDefendants ? 'demand' : 'demands'
  const dVerb3 = isMultipleDefendants ? 'deny' : 'denies'
  const dVerb4 = isMultipleDefendants ? 'allege' : 'alleges'

  // Clean up party names - remove accidental "Plaintiff"/"Defendant" prefixes
  const cleanDefendantName = defendantName
    .replace(/^defendants?\s+/i, '')
    .replace(/^plaintiffs?\s+/i, '')
    .trim()
  
  const cleanPlaintiffName = plaintiffName
    .replace(/^defendants?\s+/i, '')
    .replace(/^plaintiffs?\s+/i, '')
    .trim()

  const preamble = `TO ${P.toUpperCase()} ${cleanPlaintiffName.toUpperCase()} AND TO HIS/HER/THEIR ATTORNEY OF RECORD:

${D} ${cleanDefendantName} (hereinafter "${D}") ${dVerb} the Complaint of ${P} ${cleanPlaintiffName} (hereinafter "${P}") as follows: ${D} hereby ${dVerb2} a jury trial in the above-entitled action.

Pursuant to the provisions of § 431.30, subdivision (d) of the Code of Civil Procedure, ${D} generally and specifically ${dVerb3} each and every allegation of ${Poss} Complaint, and the whole thereof, including each purported cause of action contained therein, and ${D} ${dVerb3} that ${P} has been damaged in any sum, or sums, due to the conduct or omissions of ${D}.

${D} herein ${dVerb4}${isMultipleDefendants ? '' : 's'} and set${isMultipleDefendants ? '' : 's'} forth separately and distinctly the following affirmative defenses to each and every cause of action as alleged in ${Poss} Complaint as though pleaded separately to each and every such cause of action.`

  // Generate numbered defenses
  const ordinals = [
    'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH',
    'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH',
    'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH',
    'TWENTY-FIRST', 'TWENTY-SECOND', 'TWENTY-THIRD', 'TWENTY-FOURTH', 'TWENTY-FIFTH',
    'TWENTY-SIXTH', 'TWENTY-SEVENTH', 'TWENTY-EIGHTH', 'TWENTY-NINTH', 'THIRTIETH'
  ]

  const defensesText = defenses.map((defense, index) => {
    const ordinal = ordinals[index] || `${index + 1}TH`
    return `${ordinal} AFFIRMATIVE DEFENSE
(To All Causes of Action)
(${defense.title})
${defense.content}`
  }).join('\n\n')

  const prayer = `WHEREFORE, ${D} pray${isMultipleDefendants ? '' : 's'} for judgment as follows:
  1. That ${P} take${isMultipleDefendants ? '' : 's'} nothing by way of ${isMultipleDefendants ? 'their' : 'his/her'} Complaint;
  2. That ${Poss} Complaint and all causes of action be dismissed with prejudice;
  3. That ${D} be awarded costs of suit incurred;
  4. That ${D} be awarded reasonable attorneys' fees, if applicable; and
  5. For such other and further relief as the Court may deem just and proper.

Dated: ${date}

Respectfully submitted,

[Attorney's Name]
[Law Firm Name]
[Address]
[City, State, Zip Code]
[Telephone Number]
[Email Address]

Attorney for ${D} ${cleanDefendantName}`

  return `${preamble}\n\n${defensesText}\n\n${prayer}`
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Authentication check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('[SECURITY] Attempted to generate answer without authentication')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit.isAllowed(clientIP, 5, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const { plaintiffName, defendantName, complaintText, caseId, isMultipleDefendants } = await request.json()

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

    // Detect case type from complaint
    const caseTypeResult = detectCaseType(sanitizedComplaint)
    console.log(`[AUDIT] Detected case type: ${caseTypeResult.primaryType} (confidence: ${caseTypeResult.confidence})`)
    console.log(`[AUDIT] Secondary types: ${caseTypeResult.secondaryTypes.join(', ')}`)
    console.log(`[AUDIT] Keywords: ${caseTypeResult.detectedKeywords.join(', ')}`)

    // Anonymize inputs for AI processing
    const plaintiffResult = anonymizeDataWithMapping(sanitizedPlaintiff)
    const defendantResult = anonymizeDataWithMapping(sanitizedDefendant)
    const complaintResult = anonymizeDataWithMapping(sanitizedComplaint)

    // Merge mappings
    const combinedMapping: PIIMapping = {}
    Object.keys(plaintiffResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...plaintiffResult.mapping[key]]
    })
    Object.keys(defendantResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...defendantResult.mapping[key]]
    })
    Object.keys(complaintResult.mapping).forEach(key => {
      combinedMapping[key] = [...(combinedMapping[key] || []), ...complaintResult.mapping[key]]
    })

    const combinedContextualMappings: ContextualMapping[] = [
      ...plaintiffResult.contextualMappings,
      ...defendantResult.contextualMappings,
      ...complaintResult.contextualMappings
    ]

    // Select applicable defenses based on case type
    const selectedDefenses = selectApplicableDefenses(caseTypeResult, isMultipleDefendants || false)

    // Generate case-specific answer
    const basicAnswer = generateCaseSpecificAnswer(
      plaintiffResult.anonymizedText,
      defendantResult.anonymizedText,
      selectedDefenses,
      isMultipleDefendants || false
    )

    // Re-identify the answer
    const restoredAnswer = reidentifyData(basicAnswer, combinedMapping, combinedContextualMappings)

    // Prepare case type info for AI analysis
    const caseTypeInfo = `
DETECTED CASE TYPE: ${caseTypeResult.primaryType.replace(/_/g, ' ').toUpperCase()}
Confidence: ${caseTypeResult.confidence}
${caseTypeResult.secondaryTypes.length > 0 ? `Related Types: ${caseTypeResult.secondaryTypes.map(t => t.replace(/_/g, ' ')).join(', ')}` : ''}
Keywords Found: ${caseTypeResult.detectedKeywords.join(', ')}
Number of Defenses Generated: ${selectedDefenses.length}`

    // If OpenAI API key is available, enhance with AI analysis
    const { isOpenAIConfigured, getOpenAIClient } = await import('@/lib/openai/config')
    if (isOpenAIConfigured()) {
      try {
        const openai = getOpenAIClient()
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a California civil litigation attorney assistant. Analyze the complaint and the generated answer to provide specific, actionable suggestions.

${caseTypeInfo}

CRITICAL GRAMMAR CONTEXT:
${isMultipleDefendants 
  ? 'This answer is for MULTIPLE DEFENDANTS. Use plural forms throughout.'
  : 'This answer is for a SINGLE DEFENDANT. Use singular forms throughout.'
}

Provide:
1. Confirmation or refinement of the detected case type
2. Any additional case-specific defenses that should be considered
3. Specific facts from the complaint that strengthen certain defenses
4. Recommended discovery or investigation areas
5. Any strategic considerations for this type of case

Be specific and cite relevant California statutes or case law where applicable.`
            },
            {
              role: "user",
              content: `Analyze this complaint and generated answer:

Plaintiff: ${plaintiffResult.anonymizedText}
Defendant: ${defendantResult.anonymizedText}

COMPLAINT TEXT:
${complaintResult.anonymizedText}

GENERATED ANSWER WITH ${selectedDefenses.length} DEFENSES:
${basicAnswer.substring(0, 3000)}...

Provide specific analysis and recommendations.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3,
        })

        let aiSuggestions = completion.choices[0]?.message?.content || ''
        aiSuggestions = reidentifyData(aiSuggestions, combinedMapping, combinedContextualMappings)

        const enhancedAnswer = `${restoredAnswer}

---
${caseTypeInfo}

AI ANALYSIS AND SUGGESTIONS:
${aiSuggestions}

---
NOTE: This document was generated with case-type-specific defenses based on analysis of the complaint. ${selectedDefenses.length} defenses were selected for this ${caseTypeResult.primaryType.replace(/_/g, ' ')} case. Please review all content carefully and consult with a licensed attorney before filing.`

        return NextResponse.json({ answer: enhancedAnswer })
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
        return NextResponse.json({
          answer: `${restoredAnswer}

---
${caseTypeInfo}

NOTE: This document was generated with case-type-specific defenses. AI enhancement was unavailable. Please review all content carefully and consult with a licensed attorney before filing.`
        })
      }
    } else {
      return NextResponse.json({
        answer: `${restoredAnswer}

---
${caseTypeInfo}

NOTE: This document was generated with case-type-specific defenses based on complaint analysis. For AI-enhanced analysis, please configure OpenAI API access. Please review all content carefully and consult with a licensed attorney before filing.`
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
