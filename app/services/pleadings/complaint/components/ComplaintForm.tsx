'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, Send, AlertCircle, FileEdit, Plus, X, User, ChevronDown, ChevronUp } from 'lucide-react'

interface ComplaintFormProps {
  onComplaintGenerated: (complaint: string) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

interface CauseOfAction {
  id: string
  name: string
  description: string
  caciSeries: string
  elements: string[]
}

interface CACISeries {
  id: string
  seriesNumber: number
  title: string
  causes: CauseOfAction[]
}

interface Attorney {
  id: string
  name: string
  email: string
  barNumber: string
  lawFirmName: string
  lawFirmAddress: string
  lawFirmPhone: string
}

interface Plaintiff {
  id: string
  name: string
}

interface Defendant {
  id: string
  name: string
}

export default function ComplaintForm({ 
  onComplaintGenerated, 
  isGenerating, 
  setIsGenerating 
}: ComplaintFormProps) {
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0)
  const [showManualTemplate, setShowManualTemplate] = useState(false)
  const [selectedCausesOfAction, setSelectedCausesOfAction] = useState<string[]>([])
  const [showCauseSelection, setShowCauseSelection] = useState(true)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [attorneys, setAttorneys] = useState<Attorney[]>([
    { 
      id: '1', 
      name: 'John Smith', 
      email: 'jsmith@lawfirm.com', 
      barNumber: '123456', 
      lawFirmName: 'Smith & Associates', 
      lawFirmAddress: '123 Main Street\nLos Angeles, CA 90001', 
      lawFirmPhone: '(310) 555-1234' 
    }
  ])
  const [selectedCounty, setSelectedCounty] = useState('Los Angeles')
  const [plaintiffs, setPlaintiffs] = useState<Plaintiff[]>([
    { id: '1', name: 'Plaintiff' }
  ])
  const [defendants, setDefendants] = useState<Defendant[]>([
    { id: '1', name: 'Defendant' }
  ])
  const [caseNumber, setCaseNumber] = useState('24STCV00000')

  // California counties list
  const californiaCounties = [
    'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 
    'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 
    'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa', 
    'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange', 
    'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 
    'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 
    'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 
    'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare', 
    'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
  ]

  // Available causes of action organized by CACI series
  const caciSeries: CACISeries[] = [
    {
      id: 'series_300',
      seriesNumber: 300,
      title: 'CONTRACT',
      causes: [
        {
          id: 'contract_300',
          name: 'Breach of Contract—Introduction',
          description: 'General introduction to breach of contract claims',
          caciSeries: 'CACI 300',
          elements: ['Contract exists', 'Breach occurred', 'Damages resulted']
        },
        {
          id: 'third_party_beneficiary_301',
          name: 'Third-Party Beneficiary',
          description: 'Claim by intended beneficiary of contract between others',
          caciSeries: 'CACI 301',
          elements: ['Contract between other parties', 'Plaintiff was intended beneficiary', 'Plaintiff\'s rights vested', 'Breach of contract', 'Damages to plaintiff']
        },
        {
          id: 'contract_formation_302',
          name: 'Contract Formation—Essential Factual Elements',
          description: 'Elements required to form a valid contract',
          caciSeries: 'CACI 302',
          elements: ['Offer', 'Acceptance', 'Consideration', 'Mutual consent', 'Legal capacity']
        },
        {
          id: 'breach_of_contract_303',
          name: 'Breach of Contract—Essential Factual Elements',
          description: 'Breach of contractual obligations (written, oral, or implied)',
          caciSeries: 'CACI 303',
          elements: ['Valid contract existed', 'Plaintiff performed or excused', 'Defendant breached contract', 'Plaintiff suffered damages']
        },
        {
          id: 'contract_terms_304',
          name: 'Oral or Written Contract Terms',
          description: 'Establishing the terms of oral or written contracts',
          caciSeries: 'CACI 304',
          elements: ['Contract terms', 'Agreement on terms', 'Terms are enforceable']
        },
        {
          id: 'implied_in_fact_305',
          name: 'Implied-in-Fact Contract',
          description: 'Contract implied from conduct and circumstances',
          caciSeries: 'CACI 305',
          elements: ['Services/goods provided', 'Recipient knew or should have known', 'Recipient indicated would pay', 'Reasonable value']
        },
        {
          id: 'unformalized_agreement_306',
          name: 'Unformalized Agreement',
          description: 'Enforceable agreement without formal documentation',
          caciSeries: 'CACI 306',
          elements: ['Agreement on essential terms', 'Intent to be bound', 'Sufficiently definite terms']
        },
        {
          id: 'contract_offer_307',
          name: 'Contract Formation—Offer',
          description: 'Valid offer as part of contract formation',
          caciSeries: 'CACI 307',
          elements: ['Definite proposal', 'Intent to be bound', 'Communicated to offeree']
        },
        {
          id: 'revocation_308',
          name: 'Contract Formation—Revocation of Offer',
          description: 'Withdrawal of offer before acceptance',
          caciSeries: 'CACI 308',
          elements: ['Valid offer existed', 'Revocation before acceptance', 'Revocation communicated']
        },
        {
          id: 'acceptance_309',
          name: 'Contract Formation—Acceptance',
          description: 'Valid acceptance forming binding contract',
          caciSeries: 'CACI 309',
          elements: ['Valid offer', 'Unqualified acceptance', 'Acceptance communicated', 'Before revocation']
        },
        {
          id: 'acceptance_silence_310',
          name: 'Contract Formation—Acceptance by Silence',
          description: 'Acceptance implied through silence in special circumstances',
          caciSeries: 'CACI 310',
          elements: ['Silence or inaction', 'Reasonable expectation of response', 'Intent to accept']
        },
        {
          id: 'rejection_311',
          name: 'Contract Formation—Rejection of Offer',
          description: 'Rejection terminating offer',
          caciSeries: 'CACI 311',
          elements: ['Valid offer', 'Rejection communicated', 'Offer terminated']
        },
        {
          id: 'substantial_performance_312',
          name: 'Substantial Performance',
          description: 'Performance sufficient despite minor deviations',
          caciSeries: 'CACI 312',
          elements: ['Contract existed', 'Substantial performance', 'Good faith effort', 'Minor deviations only']
        },
        {
          id: 'modification_313',
          name: 'Modification',
          description: 'Modification of existing contract terms',
          caciSeries: 'CACI 313',
          elements: ['Original contract', 'Agreement to modify', 'New consideration or waiver', 'Modified terms']
        },
        {
          id: 'interpretation_disputed_314',
          name: 'Interpretation—Disputed Words',
          description: 'Resolving disputes over contract language',
          caciSeries: 'CACI 314',
          elements: ['Contract terms in dispute', 'Ambiguous language', 'Intent of parties']
        },
        {
          id: 'interpretation_ordinary_315',
          name: 'Interpretation—Meaning of Ordinary Words',
          description: 'Ordinary meaning of contract terms',
          caciSeries: 'CACI 315',
          elements: ['Contract language', 'Ordinary meaning', 'Common understanding']
        },
        {
          id: 'interpretation_technical_316',
          name: 'Interpretation—Meaning of Technical Words',
          description: 'Technical or specialized terms in contracts',
          caciSeries: 'CACI 316',
          elements: ['Technical terms', 'Industry meaning', 'Specialized understanding']
        },
        {
          id: 'interpretation_whole_317',
          name: 'Interpretation—Construction of Contract as a Whole',
          description: 'Interpreting contract provisions together',
          caciSeries: 'CACI 317',
          elements: ['All contract provisions', 'Harmonious interpretation', 'Context and purpose']
        },
        {
          id: 'interpretation_conduct_318',
          name: 'Interpretation—Construction by Conduct',
          description: 'Contract interpretation based on parties\' conduct',
          caciSeries: 'CACI 318',
          elements: ['Parties\' conduct', 'Course of performance', 'Practical interpretation']
        },
        {
          id: 'interpretation_time_319',
          name: 'Interpretation—Reasonable Time',
          description: 'Determining reasonable time for performance',
          caciSeries: 'CACI 319',
          elements: ['No specified time', 'Reasonable time standard', 'Circumstances of case']
        },
        {
          id: 'interpretation_drafter_320',
          name: 'Interpretation—Construction Against Drafter',
          description: 'Ambiguities construed against party who drafted',
          caciSeries: 'CACI 320',
          elements: ['Ambiguous terms', 'Drafted by one party', 'Construction against drafter']
        },
        {
          id: 'condition_precedent_disputed_321',
          name: 'Existence of Condition Precedent Disputed',
          description: 'Dispute over whether condition precedent exists',
          caciSeries: 'CACI 321',
          elements: ['Contract provision', 'Alleged condition precedent', 'Dispute over existence']
        },
        {
          id: 'condition_precedent_occurrence_322',
          name: 'Occurrence of Agreed Condition Precedent',
          description: 'Whether agreed condition precedent occurred',
          caciSeries: 'CACI 322',
          elements: ['Condition precedent agreed', 'Occurrence or non-occurrence', 'Effect on obligations']
        },
        {
          id: 'condition_precedent_waiver_323',
          name: 'Waiver of Condition Precedent',
          description: 'Party waived requirement of condition precedent',
          caciSeries: 'CACI 323',
          elements: ['Condition precedent existed', 'Waiver by conduct or agreement', 'Obligation triggered']
        },
        {
          id: 'anticipatory_breach_324',
          name: 'Anticipatory Breach',
          description: 'Breach by repudiation before performance due',
          caciSeries: 'CACI 324',
          elements: ['Contract existed', 'Unequivocal repudiation', 'Before performance due', 'Damages']
        },
        {
          id: 'breach_implied_covenant_325',
          name: 'Breach of Implied Covenant of Good Faith and Fair Dealing',
          description: 'Breach of duty to act in good faith in performance of contract',
          caciSeries: 'CACI 325',
          elements: ['Contract between parties', 'Plaintiff performed or excused', 'Defendant unfairly interfered with plaintiff\'s rights', 'Plaintiff harmed by breach']
        },
        {
          id: 'assignment_contested_326',
          name: 'Assignment Contested',
          description: 'Dispute over validity of contract assignment',
          caciSeries: 'CACI 326',
          elements: ['Contract existed', 'Attempted assignment', 'Validity disputed', 'Rights affected']
        },
        {
          id: 'assignment_not_contested_327',
          name: 'Assignment Not Contested',
          description: 'Valid assignment of contract rights',
          caciSeries: 'CACI 327',
          elements: ['Contract existed', 'Valid assignment', 'Notice given', 'Assignee\'s rights']
        },
        {
          id: 'breach_implied_duty_care_328',
          name: 'Breach of Implied Duty to Perform With Reasonable Care',
          description: 'Failure to perform contractual obligations with reasonable care',
          caciSeries: 'CACI 328',
          elements: ['Contract existed', 'Contract required performance involving risk of harm', 'Defendant failed to use reasonable care', 'Plaintiff harmed by failure']
        }
      ]
    },
    {
      id: 'series_400',
      seriesNumber: 400,
      title: 'NEGLIGENCE',
      causes: [
        {
          id: 'negligence_400',
          name: 'Negligence—Essential Factual Elements',
      description: 'General negligence claim requiring duty, breach, causation, and damages',
          caciSeries: 'CACI 400',
      elements: ['Duty of care', 'Breach of duty', 'Causation', 'Damages']
    },
    {
          id: 'standard_of_care_401',
          name: 'Basic Standard of Care',
          description: 'Ordinary prudence standard for reasonable person',
          caciSeries: 'CACI 401',
          elements: ['Reasonable person standard', 'Ordinary prudence', 'Circumstances of case']
        },
        {
          id: 'minors_standard_402',
          name: 'Standard of Care for Minors',
          description: 'Modified standard of care for children',
          caciSeries: 'CACI 402',
          elements: ['Child of similar age', 'Intelligence and experience', 'Reasonable care for child']
        },
        {
          id: 'disability_standard_403',
          name: 'Standard of Care for Person with a Physical Disability',
          description: 'Standard adjusted for physical disabilities',
          caciSeries: 'CACI 403',
          elements: ['Physical disability', 'Reasonable care considering disability', 'Prudence expected']
        },
        {
          id: 'intoxication_404',
          name: 'Intoxication',
          description: 'Effect of voluntary intoxication on standard of care',
          caciSeries: 'CACI 404',
          elements: ['Voluntary intoxication', 'No excuse for breach', 'Same standard applies']
        },
        {
          id: 'comparative_fault_405',
          name: 'Comparative Fault of Plaintiff',
          description: 'Plaintiff\'s own negligence reducing recovery',
          caciSeries: 'CACI 405',
          elements: ['Plaintiff\'s negligence', 'Percentage of fault', 'Reduced damages']
        },
        {
          id: 'apportionment_406',
          name: 'Apportionment of Responsibility',
          description: 'Allocation of fault among multiple parties',
          caciSeries: 'CACI 406',
          elements: ['Multiple parties', 'Percentage of fault for each', 'Allocation of damages']
        },
        {
          id: 'comparative_fault_decedent_407',
          name: 'Comparative Fault of Decedent',
          description: 'Decedent\'s negligence in wrongful death case',
          caciSeries: 'CACI 407',
          elements: ['Decedent\'s negligence', 'Percentage of fault', 'Effect on recovery']
        },
        {
          id: 'reliance_good_conduct_411',
          name: 'Reliance on Good Conduct of Others',
          description: 'Right to rely on others to obey law',
          caciSeries: 'CACI 411',
          elements: ['Entitled to rely', 'Others will use care', 'Reasonable reliance']
        },
        {
          id: 'duty_children_412',
          name: 'Duty of Care Owed Children',
          description: 'Heightened duty owed to children',
          caciSeries: 'CACI 412',
          elements: ['Presence of children', 'Heightened standard', 'Reasonable care for children']
        },
        {
          id: 'custom_practice_413',
          name: 'Custom or Practice',
          description: 'Industry custom as evidence of standard of care',
          caciSeries: 'CACI 413',
          elements: ['Industry custom', 'Evidence of standard', 'Not conclusive']
        },
        {
          id: 'dangerous_situations_414',
          name: 'Amount of Caution Required in Dangerous Situations',
          description: 'Heightened care in dangerous circumstances',
          caciSeries: 'CACI 414',
          elements: ['Dangerous situation', 'Greater caution required', 'Circumstances warrant']
        },
        {
          id: 'employee_danger_415',
          name: 'Employee Required to Work in Dangerous Situations',
          description: 'Employer duty to employees in dangerous work',
          caciSeries: 'CACI 415',
          elements: ['Dangerous work conditions', 'Employer duty', 'Reasonable safety measures']
        },
        {
          id: 'electric_power_416',
          name: 'Amount of Caution Required in Transmitting Electric Power',
          description: 'Heightened duty for electrical transmission',
          caciSeries: 'CACI 416',
          elements: ['Electric power transmission', 'High degree of care', 'Dangerous instrumentality']
        },
        {
          id: 'res_ipsa_loquitur_417',
          name: 'Res Ipsa Loquitur',
          description: 'Inference of negligence from the circumstances',
          caciSeries: 'CACI 417',
          elements: ['Harm ordinarily does not occur without negligence', 'Defendant had exclusive control', 'Plaintiff did not contribute to harm', 'Evidence of actual cause unavailable']
        },
        {
          id: 'negligence_per_se_418',
          name: 'Presumption of Negligence Per Se',
      description: 'Negligence based on violation of statute or regulation',
      caciSeries: 'CACI 418',
      elements: ['Statutory violation', 'Plaintiff in protected class', 'Harm type statute intended to prevent', 'Causation', 'Damages']
    },
    {
          id: 'negligence_per_se_causation_419',
          name: 'Presumption of Negligence Per Se (Causation Only at Issue)',
          description: 'Negligence per se when only causation disputed',
          caciSeries: 'CACI 419',
          elements: ['Violation established', 'Causation in dispute', 'Presumption applies']
        },
        {
          id: 'negligence_per_se_rebuttal_420',
          name: 'Negligence Per Se: Rebuttal—Violation Excused',
          description: 'Defense to negligence per se claim',
          caciSeries: 'CACI 420',
          elements: ['Violation excused', 'Emergency or other justification', 'Rebuttal of presumption']
        },
        {
          id: 'negligence_per_se_minor_421',
          name: 'Negligence Per Se: Rebuttal (Violation of Minor Excused)',
          description: 'Minor\'s violation may be excused',
          caciSeries: 'CACI 421',
          elements: ['Minor violated statute', 'Conduct excused', 'Standard of care for minors']
        },
        {
          id: 'dram_shop_422',
          name: 'Providing Alcoholic Beverages to Obviously Intoxicated Minors',
          description: 'Furnishing alcohol to obviously intoxicated minor',
          caciSeries: 'CACI 422',
          elements: ['Defendant furnished alcoholic beverages', 'To obviously intoxicated minor', 'Minor caused injury to plaintiff', 'Substantial factor in causing harm']
        },
        {
          id: 'public_entity_423',
          name: 'Public Entity Liability for Failure to Perform Mandatory Duty',
          description: 'Public entity liability for mandatory duty breach',
          caciSeries: 'CACI 423',
          elements: ['Mandatory duty', 'Failure to perform', 'Causation', 'Damages']
        },
        {
          id: 'negligence_not_contested_424',
          name: 'Negligence Not Contested—Essential Factual Elements',
          description: 'Negligence admitted, only causation/damages at issue',
          caciSeries: 'CACI 424',
          elements: ['Negligence admitted', 'Causation', 'Damages']
        },
        {
          id: 'gross_negligence_425',
      name: 'Gross Negligence',
      description: 'Extreme departure from ordinary standard of care',
      caciSeries: 'CACI 425',
      elements: ['Duty of care', 'Extreme breach', 'Want of even scant care', 'Causation', 'Damages']
    },
        {
          id: 'negligent_hiring_426',
          name: 'Negligent Hiring, Supervision, or Retention of Employee',
          description: 'Employer liability for negligently hiring or supervising employee',
          caciSeries: 'CACI 426',
          elements: ['Employee was unfit/incompetent', 'Employer knew or should have known', 'Unfitness created particular risk of harm', 'Employee\'s unfitness harmed plaintiff']
        },
        {
          id: 'dram_shop_minors_427',
          name: 'Furnishing Alcoholic Beverages to Minors',
          description: 'Civil liability for providing alcohol to minors',
          caciSeries: 'CACI 427',
          elements: ['Furnished alcohol to minor', 'Minor caused injury', 'Substantial factor', 'Damages']
        },
        {
          id: 'parental_liability_428',
          name: 'Parental Liability (Nonstatutory)',
          description: 'Common law parental liability for child\'s conduct',
          caciSeries: 'CACI 428',
          elements: ['Parent-child relationship', 'Parent\'s negligence', 'Causation', 'Damages']
        },
        {
          id: 'sexual_transmission_429',
          name: 'Negligent Sexual Transmission of Disease',
          description: 'Negligent transmission of sexually transmitted disease',
          caciSeries: 'CACI 429',
          elements: ['Defendant had disease', 'Knew or should have known', 'Failed to warn', 'Transmission', 'Damages']
        },
        {
          id: 'substantial_factor_430',
          name: 'Causation: Substantial Factor',
          description: 'Substantial factor test for causation',
          caciSeries: 'CACI 430',
          elements: ['Conduct was substantial factor', 'In causing harm', 'But for test']
        },
        {
          id: 'multiple_causes_431',
          name: 'Causation: Multiple Causes',
          description: 'Multiple causes contributing to harm',
          caciSeries: 'CACI 431',
          elements: ['Multiple causes', 'Each a substantial factor', 'Combined effect']
        },
        {
          id: 'superseding_cause_432',
          name: 'Affirmative Defense—Causation: Third-Party Conduct as Superseding Cause',
          description: 'Third party conduct breaks chain of causation',
          caciSeries: 'CACI 432',
          elements: ['Third party conduct', 'Unforeseeable', 'Superseding cause', 'Breaks causal chain']
        },
        {
          id: 'intentional_superseding_433',
          name: 'Affirmative Defense—Causation: Intentional Tort/Criminal Act as Superseding Cause',
          description: 'Intentional or criminal act as superseding cause',
          caciSeries: 'CACI 433',
          elements: ['Intentional or criminal act', 'Unforeseeable', 'Superseding cause']
        },
        {
          id: 'alternative_causation_434',
          name: 'Alternative Causation',
          description: 'Burden shift when multiple defendants and uncertain which caused harm',
          caciSeries: 'CACI 434',
          elements: ['Multiple defendants', 'One caused harm', 'Uncertain which one', 'Burden shifts']
        },
        {
          id: 'asbestos_causation_435',
          name: 'Causation for Asbestos-Related Cancer Claims',
          description: 'Special causation standard for asbestos cases',
          caciSeries: 'CACI 435',
          elements: ['Asbestos exposure', 'Substantial factor', 'Cancer diagnosis', 'Causation']
        },
        {
          id: 'law_enforcement_nondeadly_440',
          name: 'Negligent Use of Nondeadly Force by Law Enforcement',
          description: 'Excessive force by police (non-deadly)',
          caciSeries: 'CACI 440',
          elements: ['Law enforcement officer', 'Use of nondeadly force', 'Unreasonable', 'Injury', 'Damages']
        },
        {
          id: 'law_enforcement_deadly_441',
          name: 'Negligent Use of Deadly Force by Peace Officer',
          description: 'Excessive deadly force by police',
          caciSeries: 'CACI 441',
          elements: ['Peace officer', 'Use of deadly force', 'Unreasonable', 'Injury/death', 'Damages']
        },
        {
          id: 'good_samaritan_nonemergency_450a',
          name: 'Good Samaritan—Nonemergency',
          description: 'Limited liability for gratuitous assistance',
          caciSeries: 'CACI 450A',
          elements: ['Gratuitous aid', 'No emergency', 'Gross negligence required', 'Causation']
        },
        {
          id: 'good_samaritan_emergency_450b',
          name: 'Good Samaritan—Scene of Emergency',
          description: 'Protection for emergency assistance',
          caciSeries: 'CACI 450B',
          elements: ['Emergency scene', 'Gratuitous aid', 'Gross negligence required', 'Good faith']
        },
        {
          id: 'negligent_undertaking_450c',
          name: 'Negligent Undertaking',
          description: 'Assumption of duty to perform service and failure to exercise reasonable care',
          caciSeries: 'CACI 450C',
          elements: ['Defendant undertook to perform service', 'Performance created risk of harm', 'Failed to exercise reasonable care', 'Failure was substantial factor in causing harm']
        },
        {
          id: 'contractual_assumption_risk_451',
          name: 'Affirmative Defense—Contractual Assumption of Risk',
          description: 'Waiver or release of liability by contract',
          caciSeries: 'CACI 451',
          elements: ['Valid contract', 'Assumption of risk', 'Express agreement', 'Bars recovery']
        },
        {
          id: 'sudden_emergency_452',
          name: 'Sudden Emergency',
          description: 'Sudden emergency doctrine',
          caciSeries: 'CACI 452',
          elements: ['Sudden emergency', 'Not caused by defendant', 'Reasonable response', 'No negligence']
        },
        {
          id: 'rescue_453',
          name: 'Injury Incurred in Course of Rescue',
          description: 'Rescue doctrine',
          caciSeries: 'CACI 453',
          elements: ['Emergency created by defendant', 'Reasonable rescue attempt', 'Foreseeable', 'Defendant liable']
        },
        {
          id: 'statute_limitations_454',
          name: 'Affirmative Defense—Statute of Limitations',
          description: 'Time bar to bringing claims',
          caciSeries: 'CACI 454',
          elements: ['Claim accrued', 'Time period expired', 'Action barred']
        },
        {
          id: 'delayed_discovery_455',
          name: 'Statute of Limitations—Delayed Discovery',
          description: 'Discovery rule for statute of limitations',
          caciSeries: 'CACI 455',
          elements: ['Plaintiff did not discover', 'Should not have discovered', 'Delayed accrual']
        },
        {
          id: 'estoppel_sol_456',
          name: 'Defendant Estopped From Asserting Statute of Limitations Defense',
          description: 'Equitable estoppel against SOL defense',
          caciSeries: 'CACI 456',
          elements: ['Defendant\'s conduct', 'Prevented timely filing', 'Estoppel applies']
        },
        {
          id: 'equitable_tolling_457',
          name: 'Statute of Limitations—Equitable Tolling',
          description: 'Tolling based on prior proceeding',
          caciSeries: 'CACI 457',
          elements: ['Prior proceeding', 'Tolling period', 'Extended time']
        },
        {
          id: 'ultrahazardous_460',
          name: 'Strict Liability for Ultrahazardous Activities',
          description: 'Strict liability for abnormally dangerous activities',
          caciSeries: 'CACI 460',
          elements: ['Ultrahazardous activity', 'Harm resulted', 'Causation', 'Damages']
        },
        {
          id: 'wild_animal_461',
          name: 'Strict Liability for Injury Caused by Wild Animal',
          description: 'Strict liability for wild animal injuries',
          caciSeries: 'CACI 461',
          elements: ['Wild animal', 'Defendant owned/possessed', 'Caused injury', 'Damages']
        },
        {
          id: 'dangerous_animal_462',
          name: 'Strict Liability for Injury Caused by Domestic Animal With Dangerous Propensities',
          description: 'Strict liability for injury caused by animal with known dangerous propensities',
          caciSeries: 'CACI 462',
          elements: ['Defendant owned/possessed animal', 'Animal had dangerous propensities', 'Defendant knew or should have known', 'Animal\'s propensity caused harm to plaintiff']
        },
        {
          id: 'dog_bite_463',
          name: 'Dog Bite Statute',
          description: 'Strict liability for dog bite regardless of prior viciousness',
          caciSeries: 'CACI 463',
          elements: ['Defendant owned the dog', 'Dog bit plaintiff', 'Plaintiff was in public place or lawfully on private property', 'Plaintiff was injured by the bite']
        }
      ]
    },
    {
      id: 'series_500',
      seriesNumber: 500,
      title: 'MEDICAL NEGLIGENCE',
      causes: [
        {
          id: 'medical_negligence_500',
          name: 'Medical Negligence—Essential Factual Elements',
          description: 'Professional negligence by healthcare providers',
          caciSeries: 'CACI 500',
          elements: ['Doctor-patient relationship', 'Standard of care', 'Breach of standard', 'Causation', 'Damages']
        },
        {
          id: 'standard_care_health_501',
          name: 'Standard of Care for Health Care Professionals',
          description: 'General standard of care for healthcare providers',
          caciSeries: 'CACI 501',
          elements: ['Degree of knowledge and skill', 'Ordinary care and skill', 'Reasonably careful health care professional', 'Same or similar circumstances']
        },
        {
          id: 'standard_care_specialist_502',
          name: 'Standard of Care for Medical Specialists',
          description: 'Heightened standard for medical specialists',
          caciSeries: 'CACI 502',
          elements: ['Specialist designation', 'Degree of learning and skill', 'Ordinarily possessed by specialists', 'Same or similar circumstances']
        },
        {
          id: 'psychotherapist_duty_503a',
          name: 'Psychotherapist\'s Duty to Protect Intended Victim From Patient\'s Threat',
          description: 'Tarasoff duty to warn/protect',
          caciSeries: 'CACI 503A',
          elements: ['Patient made serious threat', 'Against reasonably identifiable victim', 'Psychotherapist failed to take reasonable steps', 'To protect victim', 'Harm resulted']
        },
        {
          id: 'psychotherapist_defense_503b',
          name: 'Affirmative Defense—Psychotherapist\'s Communication of Threat to Victim and Law Enforcement',
          description: 'Defense to Tarasoff liability',
          caciSeries: 'CACI 503B',
          elements: ['Communicated threat to victim', 'Notified law enforcement', 'Reasonable steps taken', 'Defense established']
        },
        {
          id: 'standard_care_nurses_504',
          name: 'Standard of Care for Nurses',
          description: 'Standard of care applicable to nursing professionals',
          caciSeries: 'CACI 504',
          elements: ['Nursing professional', 'Degree of learning and skill', 'Ordinarily possessed by nurses', 'Same or similar circumstances']
        },
        {
          id: 'success_not_required_505',
          name: 'Success Not Required',
          description: 'Physician not liable for unsuccessful treatment if proper care used',
          caciSeries: 'CACI 505',
          elements: ['Treatment unsuccessful', 'Not evidence of negligence', 'Proper care used', 'No guarantee of success']
        },
        {
          id: 'alternative_methods_506',
          name: 'Alternative Methods of Care',
          description: 'Multiple acceptable methods of treatment',
          caciSeries: 'CACI 506',
          elements: ['Alternative methods available', 'Each method acceptable', 'Choice of method reasonable', 'No negligence']
        },
        {
          id: 'duty_warn_patient_507',
          name: 'Duty to Warn Patient',
          description: 'Physician duty to warn patient of risks',
          caciSeries: 'CACI 507',
          elements: ['Material risks existed', 'Duty to warn patient', 'Failed to warn', 'Causation', 'Harm']
        },
        {
          id: 'duty_refer_specialist_508',
          name: 'Duty to Refer to a Specialist',
          description: 'Physician duty to refer when appropriate',
          caciSeries: 'CACI 508',
          elements: ['Condition required specialist', 'Duty to refer', 'Failed to refer', 'Causation', 'Harm']
        },
        {
          id: 'abandonment_patient_509',
          name: 'Abandonment of Patient',
          description: 'Physician abandonment of doctor-patient relationship',
          caciSeries: 'CACI 509',
          elements: ['Doctor-patient relationship existed', 'Need for continued care', 'Physician terminated relationship without notice', 'Plaintiff unable to obtain alternative care', 'Harm resulted']
        },
        {
          id: 'derivative_liability_surgeon_510',
          name: 'Derivative Liability of Surgeon',
          description: 'Surgeon liability for acts of assistants',
          caciSeries: 'CACI 510',
          elements: ['Surgeon in charge', 'Assistant\'s negligence', 'During surgery', 'Surgeon\'s responsibility', 'Harm resulted']
        },
        {
          id: 'wrongful_birth_sterilization_511',
          name: 'Wrongful Birth—Sterilization/Abortion',
          description: 'Failed sterilization or abortion resulting in birth',
          caciSeries: 'CACI 511',
          elements: ['Sterilization or abortion performed', 'Procedure failed', 'Child born', 'Damages from birth']
        },
        {
          id: 'wrongful_birth_512',
          name: 'Wrongful Birth—Essential Factual Elements',
          description: 'Negligent failure to diagnose or inform of birth defects',
          caciSeries: 'CACI 512',
          elements: ['Healthcare provider\'s duty', 'Failed to diagnose/inform of condition', 'Parents would have avoided conception/birth', 'Damages from raising disabled child']
        },
        {
          id: 'wrongful_life_513',
          name: 'Wrongful Life—Essential Factual Elements',
          description: 'Child\'s claim for being born with defects',
          caciSeries: 'CACI 513',
          elements: ['Healthcare provider\'s negligence', 'Failed to inform parents', 'Child born with condition', 'Special damages only']
        },
        {
          id: 'duty_hospital_514',
          name: 'Duty of Hospital',
          description: 'General duty of hospitals to patients',
          caciSeries: 'CACI 514',
          elements: ['Hospital-patient relationship', 'Duty to use ordinary care', 'Breach of duty', 'Causation', 'Damages']
        },
        {
          id: 'hospital_safe_environment_515',
          name: 'Duty of Hospital to Provide Safe Environment',
          description: 'Hospital duty to maintain safe premises',
          caciSeries: 'CACI 515',
          elements: ['Hospital duty', 'Maintain safe environment', 'Failed to do so', 'Causation', 'Harm']
        },
        {
          id: 'hospital_screen_staff_516',
          name: 'Duty of Hospital to Screen Medical Staff',
          description: 'Hospital duty to properly credential physicians',
          caciSeries: 'CACI 516',
          elements: ['Hospital duty to screen', 'Failed to properly screen', 'Physician was incompetent', 'Causation', 'Harm']
        },
        {
          id: 'patient_duty_wellbeing_517',
          name: 'Affirmative Defense—Patient\'s Duty to Provide for the Patient\'s Own Well-Being',
          description: 'Patient\'s duty to follow medical advice',
          caciSeries: 'CACI 517',
          elements: ['Patient failed to follow advice', 'Reasonable instructions given', 'Failure contributed to harm', 'Comparative fault']
        },
        {
          id: 'medical_res_ipsa_518',
          name: 'Medical Malpractice: Res Ipsa Loquitur',
          description: 'Res ipsa loquitur in medical malpractice cases',
          caciSeries: 'CACI 518',
          elements: ['Harm ordinarily does not occur without negligence', 'Defendant had exclusive control', 'Plaintiff did not contribute', 'More likely than not due to negligence']
        },
        {
          id: 'medical_battery_530a',
          name: 'Medical Battery',
          description: 'Unauthorized medical treatment or procedure',
          caciSeries: 'CACI 530A',
          elements: ['Defendant performed medical procedure', 'Without plaintiff\'s consent', 'Harmful or offensive contact', 'Plaintiff harmed']
        },
        {
          id: 'medical_battery_conditional_530b',
          name: 'Medical Battery—Conditional Consent',
          description: 'Treatment exceeding scope of consent',
          caciSeries: 'CACI 530B',
          elements: ['Consent with conditions', 'Defendant exceeded conditions', 'Without emergency justification', 'Harmful or offensive contact', 'Harm']
        },
        {
          id: 'consent_behalf_another_531',
          name: 'Consent on Behalf of Another',
          description: 'Authority to consent for another person',
          caciSeries: 'CACI 531',
          elements: ['Third party gave consent', 'Authority to consent', 'Consent was valid', 'Treatment authorized']
        },
        {
          id: 'informed_consent_definition_532',
          name: 'Informed Consent—Definition',
          description: 'Definition of informed consent',
          caciSeries: 'CACI 532',
          elements: ['Material risks disclosed', 'Reasonable alternatives explained', 'Patient understood', 'Voluntary consent']
        },
        {
          id: 'lack_informed_consent_533',
          name: 'Failure to Obtain Informed Consent—Essential Factual Elements',
          description: 'Failure to obtain informed consent for medical procedure',
          caciSeries: 'CACI 533',
          elements: ['Defendant performed procedure', 'Failed to disclose material risks', 'Reasonable person would not have consented', 'Undisclosed risk materialized', 'Plaintiff harmed']
        },
        {
          id: 'informed_refusal_534',
          name: 'Informed Refusal—Definition',
          description: 'Definition of informed refusal',
          caciSeries: 'CACI 534',
          elements: ['Patient refused treatment', 'Risks of refusal disclosed', 'Patient understood', 'Voluntary refusal']
        },
        {
          id: 'risks_nontreatment_535',
          name: 'Risks of Nontreatment—Essential Factual Elements',
          description: 'Physician duty to warn of risks of not treating',
          caciSeries: 'CACI 535',
          elements: ['Patient declined treatment', 'Physician failed to warn of risks', 'Reasonable person would have accepted treatment', 'Risk materialized', 'Harm']
        }
      ]
    },
    {
      id: 'series_600',
      seriesNumber: 600,
      title: 'PROFESSIONAL NEGLIGENCE',
      causes: [
        {
          id: 'professional_standard_care_600',
          name: 'Standard of Care',
          description: 'Standard of care for professionals',
          caciSeries: 'CACI 600',
          elements: ['Professional relationship', 'Standard of care in profession', 'Breach of standard', 'Causation', 'Damages']
        },
        {
          id: 'legal_malpractice_causation_601',
          name: 'Legal Malpractice—Causation',
          description: 'Causation in legal malpractice cases (case within a case)',
          caciSeries: 'CACI 601',
          elements: ['Attorney-client relationship', 'Negligence', 'But for negligence would have obtained better result', 'Damages']
        },
        {
          id: 'success_not_required_602',
          name: 'Success Not Required',
          description: 'Attorney not liable for unsuccessful outcome if proper care used',
          caciSeries: 'CACI 602',
          elements: ['Unsuccessful outcome', 'Not evidence of negligence', 'Proper care used', 'No guarantee of success']
        },
        {
          id: 'alternative_legal_strategies_603',
          name: 'Alternative Legal Decisions or Strategies',
          description: 'Multiple acceptable legal strategies',
          caciSeries: 'CACI 603',
          elements: ['Alternative strategies available', 'Each strategy acceptable', 'Choice of strategy reasonable', 'No negligence']
        },
        {
          id: 'referral_legal_specialist_604',
          name: 'Referral to Legal Specialist',
          description: 'Attorney duty to refer when appropriate',
          caciSeries: 'CACI 604',
          elements: ['Matter required specialist', 'Duty to refer', 'Failed to refer', 'Causation', 'Harm']
        },
        {
          id: 'legal_malpractice_criminal_606',
          name: 'Legal Malpractice Causing Criminal Conviction—Actual Innocence',
          description: 'Legal malpractice resulting in criminal conviction',
          caciSeries: 'CACI 606',
          elements: ['Attorney-client relationship', 'Attorney negligence', 'Actual innocence', 'Conviction resulted', 'Damages']
        }
      ]
    },
    {
      id: 'series_700',
      seriesNumber: 700,
      title: 'MOTOR VEHICLES AND HIGHWAY SAFETY',
      causes: [
        {
          id: 'motor_vehicle_basic_700',
          name: 'Basic Standard of Care',
          description: 'Basic standard of care for motor vehicle operation',
          caciSeries: 'CACI 700',
          elements: ['Operation of motor vehicle', 'Reasonable care', 'Breach', 'Causation', 'Damages']
        },
        {
          id: 'right_of_way_definition_701',
          name: 'Definition of Right-of-Way',
          description: 'Definition and rules of right-of-way',
          caciSeries: 'CACI 701',
          elements: ['Right-of-way defined', 'Priority rules', 'Duty to yield']
        },
        {
          id: 'waiver_right_of_way_702',
          name: 'Waiver of Right-of-Way',
          description: 'Driver may waive right-of-way',
          caciSeries: 'CACI 702',
          elements: ['Right-of-way waived', 'Clear indication', 'Other driver entitled to rely']
        },
        {
          id: 'immediate_hazard_703',
          name: 'Definition of "Immediate Hazard"',
          description: 'Definition of immediate hazard in traffic context',
          caciSeries: 'CACI 703',
          elements: ['Immediate hazard defined', 'Collision imminent', 'Reasonable person standard']
        },
        {
          id: 'left_turns_704',
          name: 'Left Turns',
          description: 'Duties when making left turns (Veh. Code § 21801)',
          caciSeries: 'CACI 704',
          elements: ['Making left turn', 'Yield to oncoming traffic', 'Violation of statute', 'Causation']
        },
        {
          id: 'turning_705',
          name: 'Turning',
          description: 'Duties when turning (Veh. Code § 22107)',
          caciSeries: 'CACI 705',
          elements: ['Making turn', 'Signal required', 'Safe to turn', 'Violation', 'Causation']
        },
        {
          id: 'basic_speed_law_706',
          name: 'Basic Speed Law',
          description: 'Speed must be reasonable and prudent (Veh. Code § 22350)',
          caciSeries: 'CACI 706',
          elements: ['Speed greater than reasonable', 'Under conditions present', 'Violation of basic speed law', 'Causation']
        },
        {
          id: 'speed_limit_707',
          name: 'Speed Limit',
          description: 'Posted speed limit violations (Veh. Code § 22352)',
          caciSeries: 'CACI 707',
          elements: ['Exceeded posted speed limit', 'Violation of statute', 'Causation', 'Damages']
        },
        {
          id: 'maximum_speed_708',
          name: 'Maximum Speed Limit',
          description: 'Maximum speed limit violations (Veh. Code §§ 22349, 22356)',
          caciSeries: 'CACI 708',
          elements: ['Exceeded maximum speed', 'Violation of statute', 'Causation', 'Damages']
        },
        {
          id: 'dui_709',
          name: 'Driving Under the Influence',
          description: 'DUI violations (Veh. Code §§ 23152, 23153)',
          caciSeries: 'CACI 709',
          elements: ['Drove under influence', 'Impaired ability to drive', 'Violation of statute', 'Causation', 'Damages']
        },
        {
          id: 'crosswalk_duties_710',
          name: 'Duties of Care for Pedestrians and Drivers in Crosswalk',
          description: 'Crosswalk duties (Veh. Code § 21950)',
          caciSeries: 'CACI 710',
          elements: ['Pedestrian in crosswalk', 'Driver duty to yield', 'Pedestrian duty of care', 'Violation', 'Causation']
        },
        {
          id: 'passenger_duty_711',
          name: 'The Passenger\'s Duty of Care for Own Safety',
          description: 'Passenger\'s duty to exercise care for own safety',
          caciSeries: 'CACI 711',
          elements: ['Passenger status', 'Duty to exercise care', 'Failed to do so', 'Comparative fault']
        },
        {
          id: 'seat_belt_defense_712',
          name: 'Affirmative Defense—Failure to Wear a Seat Belt',
          description: 'Defense based on failure to wear seat belt',
          caciSeries: 'CACI 712',
          elements: ['Failed to wear seat belt', 'Injuries enhanced', 'Comparative fault', 'Reduced damages']
        },
        {
          id: 'owner_liability_720',
          name: 'Motor Vehicle Owner Liability—Permissive Use of Vehicle',
          description: 'Owner liability for permissive driver',
          caciSeries: 'CACI 720',
          elements: ['Owner of vehicle', 'Permission to drive', 'Driver negligent', 'Causation', 'Owner liable']
        },
        {
          id: 'owner_liability_defense_721',
          name: 'Motor Vehicle Owner Liability—Affirmative Defense—Use Beyond Scope of Permission',
          description: 'Defense when driver exceeds scope of permission',
          caciSeries: 'CACI 721',
          elements: ['Use beyond scope', 'Substantial deviation', 'Owner not liable']
        },
        {
          id: 'adult_liability_minor_722',
          name: 'Adult\'s Liability for Minor\'s Permissive Use of Motor Vehicle',
          description: 'Adult liability for giving permission to minor driver',
          caciSeries: 'CACI 722',
          elements: ['Adult gave permission', 'Minor driver', 'Minor negligent', 'Causation', 'Adult liable']
        },
        {
          id: 'cosigner_liability_723',
          name: 'Liability of Cosigner of Minor\'s Application for Driver\'s License',
          description: 'Cosigner liability for minor driver',
          caciSeries: 'CACI 723',
          elements: ['Cosigned license application', 'Minor driver', 'Minor negligent', 'Causation', 'Cosigner liable']
        },
        {
          id: 'negligent_entrustment_724',
          name: 'Negligent Entrustment of Motor Vehicle',
          description: 'Liability for entrusting vehicle to incompetent driver',
          caciSeries: 'CACI 724',
          elements: ['Entrusted vehicle', 'Driver incompetent', 'Owner knew or should have known', 'Driver negligent', 'Causation']
        },
        {
          id: 'emergency_vehicle_730',
          name: 'Emergency Vehicle Exemption',
          description: 'Exemptions for emergency vehicles (Veh. Code § 21055)',
          caciSeries: 'CACI 730',
          elements: ['Emergency vehicle', 'Responding to emergency', 'Exemption from rules', 'Reasonable care still required']
        },
        {
          id: 'emergency_definition_731',
          name: 'Definition of "Emergency"',
          description: 'Definition of emergency for vehicle code purposes (Veh. Code § 21055)',
          caciSeries: 'CACI 731',
          elements: ['Emergency defined', 'Circumstances requiring immediate action', 'Public safety']
        }
      ]
    },
    {
      id: 'series_800',
      seriesNumber: 800,
      title: 'RAILROAD CROSSINGS',
      causes: [
        {
          id: 'railroad_basic_care_800',
          name: 'Basic Standard of Care for Railroads',
          description: 'General standard of care for railroad operations',
          caciSeries: 'CACI 800',
          elements: ['Railroad operation', 'Duty of care', 'Breach', 'Causation', 'Damages']
        },
        {
          id: 'railroad_safety_regulations_801',
          name: 'Duty to Comply With Safety Regulations',
          description: 'Railroad duty to comply with safety regulations',
          caciSeries: 'CACI 801',
          elements: ['Safety regulation exists', 'Duty to comply', 'Violation', 'Causation', 'Damages']
        },
        {
          id: 'railroad_speed_803',
          name: 'Regulating Speed',
          description: 'Railroad duty to regulate speed at crossings',
          caciSeries: 'CACI 803',
          elements: ['Crossing location', 'Duty to regulate speed', 'Excessive speed', 'Causation', 'Harm']
        },
        {
          id: 'railroad_lookout_804',
          name: 'Lookout for Crossing Traffic',
          description: 'Railroad duty to maintain lookout at crossings',
          caciSeries: 'CACI 804',
          elements: ['Approaching crossing', 'Duty to maintain lookout', 'Failed to maintain lookout', 'Causation', 'Collision']
        },
        {
          id: 'railroad_warning_systems_805',
          name: 'Installing Warning Systems',
          description: 'Railroad duty to install and maintain warning systems',
          caciSeries: 'CACI 805',
          elements: ['Crossing location', 'Duty to install warnings', 'Failed to install or maintain', 'Causation', 'Harm']
        },
        {
          id: 'railroad_comparative_fault_806',
          name: 'Comparative Fault—Duty to Approach Crossing With Care',
          description: 'Driver\'s duty approaching railroad crossing',
          caciSeries: 'CACI 806',
          elements: ['Approaching crossing', 'Duty to exercise care', 'Failed to do so', 'Comparative fault']
        }
      ]
    },
    {
      id: 'series_900',
      seriesNumber: 900,
      title: 'COMMON CARRIERS',
      causes: [
        {
          id: 'common_carrier_intro_900',
          name: 'Introductory Instruction',
          description: 'Introduction to common carrier liability',
          caciSeries: 'CACI 900',
          elements: ['Common carrier status', 'Higher duty of care', 'Passenger relationship']
        },
        {
          id: 'common_carrier_status_disputed_901',
          name: 'Status of Common Carrier Disputed',
          description: 'When common carrier status is disputed',
          caciSeries: 'CACI 901',
          elements: ['Carrier status disputed', 'Held out to public', 'For hire', 'Transportation services']
        },
        {
          id: 'common_carrier_duty_902',
          name: 'Duty of Common Carrier',
          description: 'General duty of common carriers',
          caciSeries: 'CACI 902',
          elements: ['Common carrier', 'Utmost care and diligence', 'Human care and foresight', 'For safety of passengers']
        },
        {
          id: 'common_carrier_safe_equipment_903',
          name: 'Duty to Provide and Maintain Safe Equipment',
          description: 'Carrier duty regarding equipment safety',
          caciSeries: 'CACI 903',
          elements: ['Duty to provide safe equipment', 'Failed to maintain', 'Unsafe condition', 'Causation', 'Harm']
        },
        {
          id: 'common_carrier_illness_disability_904',
          name: 'Duty of Common Carrier Toward Passengers With Illness or Disability',
          description: 'Heightened duty toward passengers with special needs',
          caciSeries: 'CACI 904',
          elements: ['Passenger with illness/disability', 'Carrier knew or should have known', 'Duty to exercise greater care', 'Breach', 'Harm']
        },
        {
          id: 'common_carrier_minors_905',
          name: 'Duty of Common Carrier Toward Minor Passengers',
          description: 'Heightened duty toward minor passengers',
          caciSeries: 'CACI 905',
          elements: ['Minor passenger', 'Higher degree of care', 'Breach of duty', 'Causation', 'Harm']
        },
        {
          id: 'passenger_duty_906',
          name: 'Duty of Passenger for Own Safety',
          description: 'Passenger\'s duty to exercise ordinary care',
          caciSeries: 'CACI 906',
          elements: ['Passenger status', 'Duty of ordinary care', 'Failed to exercise care', 'Comparative fault']
        },
        {
          id: 'passenger_status_disputed_907',
          name: 'Status of Passenger Disputed',
          description: 'When passenger status is disputed',
          caciSeries: 'CACI 907',
          elements: ['Passenger status disputed', 'Accepted for carriage', 'Fare paid or expected', 'Passenger relationship']
        },
        {
          id: 'common_carrier_assault_908',
          name: 'Duty to Protect Passengers From Assault',
          description: 'Carrier duty to protect from third-party assault',
          caciSeries: 'CACI 908',
          elements: ['Common carrier duty', 'Risk of assault foreseeable', 'Failed to protect', 'Assault occurred', 'Harm']
        }
      ]
    },
    {
      id: 'series_1000',
      seriesNumber: 1000,
      title: 'PREMISES LIABILITY',
      causes: [
        {
          id: 'premises_liability_1000',
          name: 'Premises Liability—Essential Factual Elements',
          description: 'Essential elements for premises liability claims',
          caciSeries: 'CACI 1000',
          elements: ['Defendant owned/controlled property', 'Defendant negligent', 'Plaintiff harmed', 'Causation']
        },
        {
          id: 'basic_duty_care_1001',
          name: 'Basic Duty of Care',
          description: 'General duty of care for property owners',
          caciSeries: 'CACI 1001',
          elements: ['Duty to use reasonable care', 'Eliminate dangerous conditions', 'Warn of dangers', 'Breach', 'Harm']
        },
        {
          id: 'extent_control_1002',
          name: 'Extent of Control Over Premises Area',
          description: 'Determining extent of control over property',
          caciSeries: 'CACI 1002',
          elements: ['Control over premises', 'Extent of control', 'Right to control', 'Actual control', 'Responsibility']
        },
        {
          id: 'unsafe_conditions_1003',
          name: 'Unsafe Conditions',
          description: 'Definition and evaluation of unsafe conditions',
          caciSeries: 'CACI 1003',
          elements: ['Condition created unreasonable risk', 'Reasonable person would have recognized', 'Foreseeable harm', 'Unsafe condition']
        },
        {
          id: 'obviously_unsafe_1004',
          name: 'Obviously Unsafe Conditions',
          description: 'When conditions are obviously unsafe',
          caciSeries: 'CACI 1004',
          elements: ['Condition obvious', 'Reasonable person would observe', 'Open and apparent', 'No duty to warn']
        },
        {
          id: 'criminal_conduct_1005',
          name: 'Business Proprietor\'s or Property Owner\'s Liability for the Criminal Conduct of Others',
          description: 'Liability for third-party criminal acts on property',
          caciSeries: 'CACI 1005',
          elements: ['Criminal conduct by third party', 'Foreseeability', 'Failed to take reasonable precautions', 'Causation', 'Harm']
        },
        {
          id: 'landlord_duty_1006',
          name: 'Landlord\'s Duty',
          description: 'Specific duties of landlords',
          caciSeries: 'CACI 1006',
          elements: ['Landlord-tenant relationship', 'Control over property', 'Knowledge of dangerous condition', 'Failed to repair', 'Harm']
        },
        {
          id: 'sidewalk_abutting_1007',
          name: 'Sidewalk Abutting Property',
          description: 'Liability for sidewalks adjacent to property',
          caciSeries: 'CACI 1007',
          elements: ['Sidewalk abutting property', 'Dangerous condition', 'Duty to maintain', 'Breach', 'Causation']
        },
        {
          id: 'altered_sidewalk_1008',
          name: 'Liability for Adjacent Altered Sidewalk—Essential Factual Elements',
          description: 'Liability when sidewalk has been altered',
          caciSeries: 'CACI 1008',
          elements: ['Altered sidewalk', 'Alteration created danger', 'Defendant altered', 'Causation', 'Harm']
        },
        {
          id: 'independent_contractor_concealed_1009a',
          name: 'Liability to Employees of Independent Contractors for Unsafe Concealed Conditions',
          description: 'Liability for concealed dangers to contractor employees',
          caciSeries: 'CACI 1009A',
          elements: ['Independent contractor employee', 'Concealed dangerous condition', 'Owner knew or should have known', 'Failed to warn', 'Harm']
        },
        {
          id: 'independent_contractor_retained_1009b',
          name: 'Liability to Employees of Independent Contractors for Unsafe Conditions—Retained Control',
          description: 'Liability when retaining control over contractor work',
          caciSeries: 'CACI 1009B',
          elements: ['Retained control', 'Dangerous condition', 'Failed to take precautions', 'Contractor employee harmed', 'Causation']
        },
        {
          id: 'independent_contractor_equipment_1009d',
          name: 'Liability to Employees of Independent Contractors for Unsafe Conditions—Defective Equipment',
          description: 'Liability for defective equipment provided to contractors',
          caciSeries: 'CACI 1009D',
          elements: ['Provided equipment', 'Defective equipment', 'Knew or should have known', 'Contractor employee harmed', 'Causation']
        },
        {
          id: 'recreation_immunity_1010',
          name: 'Affirmative Defense—Recreation Immunity—Exceptions',
          description: 'Recreational use immunity defense',
          caciSeries: 'CACI 1010',
          elements: ['Property opened for recreation', 'No charge', 'Immunity applies', 'Exceptions', 'Willful/malicious failure']
        },
        {
          id: 'constructive_notice_1011',
          name: 'Constructive Notice Regarding Dangerous Conditions on Property',
          description: 'When owner deemed to have notice of dangerous conditions',
          caciSeries: 'CACI 1011',
          elements: ['Dangerous condition existed', 'Condition present long enough', 'Reasonable inspection would have discovered', 'Constructive notice']
        },
        {
          id: 'employee_knowledge_1012',
          name: 'Knowledge of Employee Imputed to Owner',
          description: 'When employee knowledge is attributed to owner',
          caciSeries: 'CACI 1012',
          elements: ['Employee knowledge', 'Scope of employment', 'Knowledge imputed to owner', 'Duty to act']
        }
      ]
    },
    {
      id: 'series_1100',
      seriesNumber: 1100,
      title: 'DANGEROUS CONDITION OF PUBLIC PROPERTY',
      causes: [
        {
          id: 'dangerous_public_property_1100',
          name: 'Dangerous Condition on Public Property—Essential Factual Elements',
          description: 'Essential elements for public property dangerous condition claims',
          caciSeries: 'CACI 1100',
          elements: ['Public property', 'Dangerous condition', 'Employee negligent', 'Actual or constructive notice', 'Causation', 'Damages']
        },
        {
          id: 'control_1101',
          name: 'Control',
          description: 'Determining control over public property',
          caciSeries: 'CACI 1101',
          elements: ['Public entity control', 'Right to control', 'Actual control', 'Duty to maintain']
        },
        {
          id: 'dangerous_condition_definition_1102',
          name: 'Definition of "Dangerous Condition"',
          description: 'Legal definition of dangerous condition for public property',
          caciSeries: 'CACI 1102',
          elements: ['Condition of property', 'Substantial risk of injury', 'Foreseeable manner', 'Reasonable care']
        },
        {
          id: 'notice_1103',
          name: 'Notice',
          description: 'Actual or constructive notice of dangerous condition',
          caciSeries: 'CACI 1103',
          elements: ['Actual notice', 'Or constructive notice', 'Sufficient time to correct', 'Failed to correct']
        },
        {
          id: 'inspection_system_1104',
          name: 'Inspection System',
          description: 'Adequacy of public entity inspection systems',
          caciSeries: 'CACI 1104',
          elements: ['Duty to inspect', 'Reasonable inspection system', 'Failed to implement', 'Would have discovered', 'Causation']
        },
        {
          id: 'natural_conditions_defense_1110',
          name: 'Affirmative Defense—Natural Conditions',
          description: 'Immunity for natural conditions of unimproved property',
          caciSeries: 'CACI 1110',
          elements: ['Natural condition', 'Unimproved public property', 'No immunity exception', 'Defense established']
        },
        {
          id: 'reasonable_act_omission_1111',
          name: 'Affirmative Defense—Condition Created by Reasonable Act or Omission',
          description: 'Defense when condition created by reasonable conduct',
          caciSeries: 'CACI 1111',
          elements: ['Condition created by act/omission', 'Act was reasonable', 'Reasonably approved plan', 'Defense established']
        },
        {
          id: 'reasonable_correction_1112',
          name: 'Affirmative Defense—Reasonable Act or Omission to Correct',
          description: 'Defense for reasonable efforts to correct condition',
          caciSeries: 'CACI 1112',
          elements: ['Reasonable action to correct', 'Or reasonable decision not to act', 'Reasonableness of decision', 'Defense established']
        },
        {
          id: 'traffic_control_signals_1120',
          name: 'Failure to Provide Traffic Control Signals',
          description: 'Liability for failure to provide traffic control signals',
          caciSeries: 'CACI 1120',
          elements: ['Duty to provide signals', 'Dangerous condition', 'Failed to provide', 'Causation', 'Harm']
        },
        {
          id: 'traffic_warning_1121',
          name: 'Failure to Provide Traffic Warning Signals, Signs, or Markings',
          description: 'Liability for inadequate traffic warnings',
          caciSeries: 'CACI 1121',
          elements: ['Duty to warn', 'Dangerous condition', 'Failed to provide warnings', 'Causation', 'Harm']
        },
        {
          id: 'weather_conditions_defense_1122',
          name: 'Affirmative Defense—Weather Conditions Affecting Streets and Highways',
          description: 'Immunity for weather-related road conditions',
          caciSeries: 'CACI 1122',
          elements: ['Weather condition', 'Streets/highways', 'Immunity applies', 'No exception']
        },
        {
          id: 'design_immunity_1123',
          name: 'Affirmative Defense—Design Immunity',
          description: 'Immunity for approved design of public improvements',
          caciSeries: 'CACI 1123',
          elements: ['Approved design', 'Discretionary approval', 'Substantial evidence', 'Design immunity applies']
        },
        {
          id: 'loss_design_immunity_1124',
          name: 'Loss of Design Immunity (Cornette)',
          description: 'When design immunity is lost due to changed conditions',
          caciSeries: 'CACI 1124',
          elements: ['Initial design immunity', 'Substantially changed conditions', 'New plan required', 'Immunity lost']
        },
        {
          id: 'adjacent_property_1125',
          name: 'Conditions on Adjacent Property',
          description: 'Liability for dangerous conditions on adjacent property',
          caciSeries: 'CACI 1125',
          elements: ['Adjacent property condition', 'Affects public property', 'Public entity control/notice', 'Causation', 'Harm']
        },
        {
          id: 'failure_warn_approved_design_1126',
          name: 'Failure to Warn of a Dangerous Roadway Condition Resulting From an Approved Design—Essential Factual Elements',
          description: 'Duty to warn of dangers from approved design',
          caciSeries: 'CACI 1126',
          elements: ['Approved design', 'Created dangerous condition', 'Duty to warn', 'Failed to warn', 'Causation', 'Harm']
        }
      ]
    },
    {
      id: 'series_1200',
      seriesNumber: 1200,
      title: 'PRODUCTS LIABILITY',
      causes: [
        {
          id: 'strict_liability_1200',
          name: 'Strict Liability—Essential Factual Elements',
          description: 'Essential elements for strict products liability',
          caciSeries: 'CACI 1200',
          elements: ['Defendant manufactured/sold/distributed', 'Product defective', 'Defect substantial factor in harm', 'Damages']
        },
        {
          id: 'manufacturing_defect_1201',
          name: 'Strict Liability—Manufacturing Defect—Essential Factual Elements',
          description: 'Product differs from manufacturer\'s intended design',
          caciSeries: 'CACI 1201',
          elements: ['Product differed from design', 'Defect existed at time of sale', 'Defect substantial factor', 'Harm']
        },
        {
          id: 'manufacturing_defect_explained_1202',
          name: 'Strict Liability—"Manufacturing Defect" Explained',
          description: 'Definition and explanation of manufacturing defect',
          caciSeries: 'CACI 1202',
          elements: ['Differs from intended design', 'Not manufactured as intended', 'Does not perform as safely', 'Unreasonably dangerous']
        },
        {
          id: 'design_defect_consumer_1203',
          name: 'Strict Liability—Design Defect—Consumer Expectation Test—Essential Factual Elements',
          description: 'Product failed to perform as safely as expected',
          caciSeries: 'CACI 1203',
          elements: ['Failed to perform safely', 'Ordinary consumer expectations', 'Defect substantial factor', 'Harm']
        },
        {
          id: 'design_defect_risk_benefit_1204',
          name: 'Strict Liability—Design Defect—Risk-Benefit Test—Essential Factual Elements—Shifting Burden of Proof',
          description: 'Product design risks outweigh benefits',
          caciSeries: 'CACI 1204',
          elements: ['Risk of danger in design', 'Outweighs benefits', 'Safer alternative design', 'Omission substantial factor', 'Harm']
        },
        {
          id: 'failure_to_warn_1205',
          name: 'Strict Liability—Failure to Warn—Essential Factual Elements',
          description: 'Failed to adequately warn of product dangers',
          caciSeries: 'CACI 1205',
          elements: ['Failed to warn', 'Known or reasonably knowable risk', 'Lack of warning substantial factor', 'Harm']
        },
        {
          id: 'allergen_warning_1206',
          name: 'Strict Liability—Failure to Warn—Products Containing Allergens (Not Prescription Drugs)—Essential Factual Elements',
          description: 'Failed to warn of allergens in product',
          caciSeries: 'CACI 1206',
          elements: ['Product contains allergen', 'Failed to warn', 'Risk known or knowable', 'Allergic reaction', 'Harm']
        },
        {
          id: 'comparative_fault_plaintiff_1207a',
          name: 'Strict Liability—Comparative Fault of Plaintiff',
          description: 'Plaintiff\'s comparative fault in products liability',
          caciSeries: 'CACI 1207A',
          elements: ['Product defect', 'Plaintiff fault', 'Percentage of fault', 'Damages reduced']
        },
        {
          id: 'comparative_fault_third_1207b',
          name: 'Strict Liability—Comparative Fault of Third Person',
          description: 'Third party\'s comparative fault in products liability',
          caciSeries: 'CACI 1207B',
          elements: ['Product defect', 'Third party fault', 'Apportionment', 'Reduced liability']
        },
        {
          id: 'component_parts_1208',
          name: 'Component Parts Rule',
          description: 'Liability for component parts of products',
          caciSeries: 'CACI 1208',
          elements: ['Component part', 'Incorporated into product', 'Component not defective', 'Component caused harm']
        },
        {
          id: 'products_negligence_1220',
          name: 'Negligence—Essential Factual Elements',
          description: 'Negligence theory in products liability',
          caciSeries: 'CACI 1220',
          elements: ['Defendant manufactured/designed/sold', 'Defendant negligent', 'Negligence substantial factor', 'Harm']
        },
        {
          id: 'products_standard_care_1221',
          name: 'Negligence—Basic Standard of Care',
          description: 'Standard of care for product manufacturers',
          caciSeries: 'CACI 1221',
          elements: ['Duty of reasonable care', 'Ordinary prudence', 'Design, manufacture, distribute', 'Reasonably safe product']
        },
        {
          id: 'duty_to_warn_1222',
          name: 'Negligence—Manufacturer or Supplier—Duty to Warn—Essential Factual Elements',
          description: 'Negligence for failure to warn of product dangers',
          caciSeries: 'CACI 1222',
          elements: ['Known or should have known of risk', 'Duty to warn', 'Failed to warn', 'Ordinary care to warn', 'Causation', 'Harm']
        },
        {
          id: 'recall_retrofit_1223',
          name: 'Negligence—Recall/Retrofit',
          description: 'Liability for failure to recall or retrofit products',
          caciSeries: 'CACI 1223',
          elements: ['Discovered product danger', 'Duty to recall or retrofit', 'Failed to do so', 'Causation', 'Harm']
        },
        {
          id: 'product_rental_1224',
          name: 'Negligence—Negligence for Product Rental/Standard of Care',
          description: 'Standard of care for product rental companies',
          caciSeries: 'CACI 1224',
          elements: ['Rented product', 'Duty of reasonable care', 'Inspection and maintenance', 'Breach', 'Causation', 'Harm']
        },
        {
          id: 'express_warranty_1230',
          name: 'Express Warranty—Essential Factual Elements',
          description: 'Breach of express warranty claims',
          caciSeries: 'CACI 1230',
          elements: ['Express warranty made', 'Product failed to conform', 'Breach substantial factor', 'Harm']
        },
        {
          id: 'implied_warranty_merchantability_1231',
          name: 'Implied Warranty of Merchantability—Essential Factual Elements',
          description: 'Breach of implied warranty of merchantability',
          caciSeries: 'CACI 1231',
          elements: ['Product sold', 'Not merchantable', 'Not fit for ordinary purposes', 'Breach substantial factor', 'Harm']
        },
        {
          id: 'implied_warranty_fitness_1232',
          name: 'Implied Warranty of Fitness for a Particular Purpose—Essential Factual Elements',
          description: 'Breach of implied warranty of fitness',
          caciSeries: 'CACI 1232',
          elements: ['Particular purpose', 'Reliance on seller expertise', 'Product not fit', 'Breach substantial factor', 'Harm']
        },
        {
          id: 'implied_warranty_food_1233',
          name: 'Implied Warranty of Merchantability for Food—Essential Factual Elements',
          description: 'Breach of implied warranty for food products',
          caciSeries: 'CACI 1233',
          elements: ['Food product sold', 'Not wholesome/fit for consumption', 'Breach substantial factor', 'Harm']
        }
      ]
    },
    {
      id: 'series_1300',
      seriesNumber: 1300,
      title: 'ASSAULT AND BATTERY',
      causes: [
    {
      id: 'battery',
      name: 'Battery',
      description: 'Intentional harmful or offensive contact',
      caciSeries: 'CACI 1300',
      elements: ['Intent to contact', 'Harmful or offensive contact', 'Lack of consent', 'Damages']
    },
        {
          id: 'intentional_tort',
          name: 'Assault',
          description: 'Intentional act causing apprehension of harmful contact',
          caciSeries: 'CACI 1300-series',
          elements: ['Intent', 'Act causing apprehension', 'Reasonable apprehension', 'Damages']
        }
      ]
    },
    {
      id: 'series_1400',
      seriesNumber: 1400,
      title: 'FALSE IMPRISONMENT',
      causes: []
    },
    {
      id: 'series_1500',
      seriesNumber: 1500,
      title: 'MALICIOUS PROSECUTION',
      causes: []
    },
    {
      id: 'series_1600',
      seriesNumber: 1600,
      title: 'EMOTIONAL DISTRESS',
      causes: [
    {
      id: 'iied',
      name: 'Intentional Infliction of Emotional Distress',
      description: 'Extreme and outrageous conduct causing severe emotional distress',
      caciSeries: 'CACI 1600',
      elements: ['Extreme/outrageous conduct', 'Intent or recklessness', 'Severe emotional distress', 'Causation']
        }
      ]
    },
    {
      id: 'series_1700',
      seriesNumber: 1700,
      title: 'DEFAMATION',
      causes: [
        {
          id: 'defamation_per_se_public_1700',
          name: 'Defamation per se—Essential Factual Elements (Public Officer/Figure and Limited Public Figure)',
          description: 'Defamatory statement that is defamatory on its face for public figures',
          caciSeries: 'CACI 1700',
          elements: ['False statement', 'Published to third party', 'Defamatory on its face', 'Plaintiff is public figure', 'Damages']
        },
        {
          id: 'defamation_per_quod_public_1701',
          name: 'Defamation per quod—Essential Factual Elements (Public Officer/Figure and Limited Public Figure)',
          description: 'Defamatory statement requiring extrinsic facts for public figures',
          caciSeries: 'CACI 1701',
          elements: ['False statement', 'Published to third party', 'Requires extrinsic facts', 'Plaintiff is public figure', 'Special damages']
        },
        {
          id: 'defamation_per_se_private_public_concern_1702',
          name: 'Defamation per se—Essential Factual Elements (Private Figure—Matter of Public Concern)',
          description: 'Defamatory statement on its face for private figures regarding public concern',
          caciSeries: 'CACI 1702',
          elements: ['False statement', 'Published to third party', 'Defamatory on its face', 'Plaintiff is private figure', 'Matter of public concern', 'Damages']
        },
        {
          id: 'defamation_per_quod_private_public_concern_1703',
          name: 'Defamation per quod—Essential Factual Elements (Private Figure—Matter of Public Concern)',
          description: 'Defamatory statement requiring extrinsic facts for private figures regarding public concern',
          caciSeries: 'CACI 1703',
          elements: ['False statement', 'Published to third party', 'Requires extrinsic facts', 'Plaintiff is private figure', 'Matter of public concern', 'Special damages']
        },
        {
          id: 'defamation_per_se_private_private_concern_1704',
          name: 'Defamation per se—Essential Factual Elements (Private Figure—Matter of Private Concern)',
          description: 'Defamatory statement on its face for private figures regarding private concern',
          caciSeries: 'CACI 1704',
          elements: ['False statement', 'Published to third party', 'Defamatory on its face', 'Plaintiff is private figure', 'Matter of private concern', 'Damages']
        },
        {
          id: 'defamation_per_quod_private_private_concern_1705',
          name: 'Defamation per quod—Essential Factual Elements (Private Figure—Matter of Private Concern)',
          description: 'Defamatory statement requiring extrinsic facts for private figures regarding private concern',
          caciSeries: 'CACI 1705',
          elements: ['False statement', 'Published to third party', 'Requires extrinsic facts', 'Plaintiff is private figure', 'Matter of private concern', 'Special damages']
        },
        {
          id: 'definition_statement_1706',
          name: 'Definition of Statement',
          description: 'What constitutes a defamatory statement',
          caciSeries: 'CACI 1706',
          elements: ['Statement made', 'Capable of defamatory meaning', 'Context considered']
        },
        {
          id: 'fact_versus_opinion_1707',
          name: 'Fact Versus Opinion',
          description: 'Distinguishing factual statements from protected opinion',
          caciSeries: 'CACI 1707',
          elements: ['Statement at issue', 'Factual assertion vs opinion', 'Context and language', 'Verifiability']
        },
        {
          id: 'coerced_self_publication_1708',
          name: 'Coerced Self-Publication',
          description: 'Defamation through forced republication by plaintiff',
          caciSeries: 'CACI 1708',
          elements: ['Defamatory statement', 'Plaintiff compelled to republish', 'Reasonable compulsion', 'Damages from republication']
        },
        {
          id: 'retraction_news_1709',
          name: 'Retraction: News Publication or Broadcast (Civ. Code, § 48a)',
          description: 'Effect of retraction on damages for news publications',
          caciSeries: 'CACI 1709',
          elements: ['Defamatory statement', 'News publication or broadcast', 'Retraction requested', 'Retraction effect on damages']
        },
        {
          id: 'affirmative_defense_truth_1720',
          name: 'Affirmative Defense—Truth',
          description: 'Truth as complete defense to defamation',
          caciSeries: 'CACI 1720',
          elements: ['Statement was true', 'Substantial truth', 'Complete defense']
        },
        {
          id: 'affirmative_defense_consent_1721',
          name: 'Affirmative Defense—Consent',
          description: 'Consent as defense to defamation',
          caciSeries: 'CACI 1721',
          elements: ['Plaintiff consented', 'Consent to publication', 'Complete defense']
        },
        {
          id: 'affirmative_defense_sol_defamation_1722',
          name: 'Affirmative Defense—Statute of Limitations—Defamation',
          description: 'Statute of limitations defense for defamation claims',
          caciSeries: 'CACI 1722',
          elements: ['Defamation claim', 'Statute of limitations period', 'Claim filed outside period']
        },
        {
          id: 'common_interest_privilege_1723',
          name: 'Common Interest Privilege—Malice (Civ. Code, § 47(c))',
          description: 'Privileged communication to interested persons, defeated by malice',
          caciSeries: 'CACI 1723',
          elements: ['Statement to interested persons', 'Common interest', 'Malice defeats privilege']
        },
        {
          id: 'fair_true_reporting_privilege_1724',
          name: 'Fair and True Reporting Privilege (Civ. Code, § 47(d))',
          description: 'Privilege for fair and true reports of official proceedings',
          caciSeries: 'CACI 1724',
          elements: ['Official proceeding', 'Fair and true report', 'Public interest', 'Privileged']
        },
        {
          id: 'slander_title_1730',
          name: 'Slander of Title—Essential Factual Elements',
          description: 'False statement disparaging property title',
          caciSeries: 'CACI 1730',
          elements: ['False statement', 'Disparaging title', 'Published to third party', 'Malice', 'Special damages']
        },
        {
          id: 'trade_libel_1731',
          name: 'Trade Libel—Essential Factual Elements',
          description: 'False statement disparaging business or product',
          caciSeries: 'CACI 1731',
          elements: ['False statement', 'Disparaging business/product', 'Published to third party', 'Malice', 'Special damages']
        }
      ]
    },
    {
      id: 'series_1800',
      seriesNumber: 1800,
      title: 'RIGHT OF PRIVACY',
      causes: [
        {
          id: 'intrusion_private_affairs_1800',
          name: 'Intrusion Into Private Affairs',
          description: 'Unreasonable intrusion into private matters',
          caciSeries: 'CACI 1800',
          elements: ['Intrusion into private affairs', 'Highly offensive to reasonable person', 'Intrusion was intentional', 'Plaintiff had reasonable expectation of privacy', 'Damages']
        },
        {
          id: 'public_disclosure_private_facts_1801',
          name: 'Public Disclosure of Private Facts',
          description: 'Public disclosure of private information',
          caciSeries: 'CACI 1801',
          elements: ['Private facts disclosed', 'Public disclosure', 'Highly offensive to reasonable person', 'Not newsworthy or legitimate public concern', 'Damages']
        },
        {
          id: 'false_light_1802',
          name: 'False Light',
          description: 'Placing plaintiff in false light in public eye',
          caciSeries: 'CACI 1802',
          elements: ['False or misleading information', 'Publicized', 'Places plaintiff in false light', 'Highly offensive to reasonable person', 'Damages']
        },
        {
          id: 'appropriation_name_likeness_1803',
          name: 'Appropriation of Name or Likeness—Essential Factual Elements',
          description: 'Unauthorized use of name or likeness for commercial benefit',
          caciSeries: 'CACI 1803',
          elements: ['Use of name or likeness', 'Without consent', 'For commercial benefit', 'Identifiable plaintiff', 'Damages']
        },
        {
          id: 'use_name_likeness_3344_1804a',
          name: 'Use of Name or Likeness (Civ. Code, § 3344)',
          description: 'Statutory claim for unauthorized use of name or likeness',
          caciSeries: 'CACI 1804A',
          elements: ['Use of name, voice, signature, photograph, or likeness', 'Without consent', 'For advertising or solicitation', 'Identifiable person', 'Damages']
        },
        {
          id: 'use_name_likeness_news_1804b',
          name: 'Use of Name or Likeness—Use in Connection With News, Public Affairs, or Sports Broadcast or Account, or Political Campaign (Civ. Code, § 3344(d))',
          description: 'Exception for news, public affairs, sports, or political use',
          caciSeries: 'CACI 1804B',
          elements: ['Use in news/public affairs/sports/political context', 'Newsworthy or public interest', 'Exception applies']
        },
        {
          id: 'affirmative_defense_first_amendment_1805',
          name: 'Affirmative Defense to Use or Appropriation of Name or Likeness—First Amendment (Comedy III)',
          description: 'First Amendment defense to appropriation claims',
          caciSeries: 'CACI 1805',
          elements: ['First Amendment protection', 'Transformative use', 'Public interest', 'Defense applies']
        },
        {
          id: 'affirmative_defense_first_amendment_balancing_1806',
          name: 'Affirmative Defense to Invasion of Privacy—First Amendment Balancing Test—Public Interest',
          description: 'First Amendment balancing test for privacy claims',
          caciSeries: 'CACI 1806',
          elements: ['Public interest', 'First Amendment protection', 'Balancing test', 'Defense applies']
        },
        {
          id: 'affirmative_defense_privacy_justified_1807',
          name: 'Affirmative Defense—Invasion of Privacy Justified',
          description: 'Justification defense to privacy invasion',
          caciSeries: 'CACI 1807',
          elements: ['Invasion justified', 'Legitimate purpose', 'Reasonable means', 'Defense applies']
        },
        {
          id: 'stalking_1808',
          name: 'Stalking (Civ. Code, § 1708.7)',
          description: 'Civil stalking claim',
          caciSeries: 'CACI 1808',
          elements: ['Pattern of conduct', 'Directed at plaintiff', 'Serious alarm, annoyance, or harassment', 'Reasonable person would suffer emotional distress', 'Damages']
        },
        {
          id: 'recording_confidential_info_1809',
          name: 'Recording of Confidential Information (Pen. Code, §§ 632, 637.2)',
          description: 'Unauthorized recording of confidential communications',
          caciSeries: 'CACI 1809',
          elements: ['Confidential communication', 'Recorded without consent', 'Reasonable expectation of privacy', 'Intentional recording', 'Damages']
        },
        {
          id: 'distribution_private_sexually_explicit_1810',
          name: 'Distribution of Private Sexually Explicit Materials—Essential Factual Elements (Civ. Code, § 1708.85)',
          description: 'Distribution of private sexually explicit materials without consent',
          caciSeries: 'CACI 1810',
          elements: ['Private sexually explicit material', 'Distributed without consent', 'Intent to cause harm', 'Plaintiff identifiable', 'Damages']
        },
        {
          id: 'computer_data_access_fraud_1812',
          name: 'Comprehensive Computer Data and Access Fraud Act—Essential Factual Elements (Pen. Code, § 502)',
          description: 'Unauthorized access to computer data',
          caciSeries: 'CACI 1812',
          elements: ['Unauthorized access', 'Computer system or data', 'Intent to defraud or obtain money/property', 'Damages']
        },
        {
          id: 'definition_access_1813',
          name: 'Definition of "Access" (Pen. Code, § 502(b)(1))',
          description: 'Definition of access under computer fraud statute',
          caciSeries: 'CACI 1813',
          elements: ['Access defined', 'Computer system', 'Without permission']
        },
        {
          id: 'damages_investigating_computer_violations_1814',
          name: 'Damages for Investigating Violations of Comprehensive Computer Data and Access Fraud Act (Pen. Code, § 502(e)(1))',
          description: 'Damages for investigating computer access violations',
          caciSeries: 'CACI 1814',
          elements: ['Violation occurred', 'Investigation costs', 'Reasonable investigation', 'Damages recoverable']
        },
        {
          id: 'damages_privacy_1820',
          name: 'Damages',
          description: 'General damages for invasion of privacy',
          caciSeries: 'CACI 1820',
          elements: ['Invasion of privacy proven', 'Emotional distress', 'Economic damages', 'Punitive damages if applicable']
        },
        {
          id: 'damages_name_likeness_1821',
          name: 'Damages for Use of Name or Likeness (Civ. Code § 3344(a))',
          description: 'Statutory damages for unauthorized use of name or likeness',
          caciSeries: 'CACI 1821',
          elements: ['Unauthorized use proven', 'Actual damages', 'Statutory damages', 'Profits from use']
        }
      ]
    },
    {
      id: 'series_1900',
      seriesNumber: 1900,
      title: 'FRAUD OR DECEIT',
      causes: [
        {
          id: 'intentional_misrepresentation_1900',
          name: 'Intentional Misrepresentation',
          description: 'Intentional false statement of fact',
          caciSeries: 'CACI 1900',
          elements: ['False representation', 'Knowledge of falsity', 'Intent to deceive', 'Justifiable reliance', 'Damages']
        },
        {
          id: 'concealment_1901',
          name: 'Concealment',
          description: 'Intentional concealment of material facts',
          caciSeries: 'CACI 1901',
          elements: ['Material fact concealed', 'Defendant had duty to disclose', 'Intent to deceive', 'Justifiable reliance', 'Damages']
        },
        {
          id: 'false_promise_1902',
          name: 'False Promise',
          description: 'Promise made without intent to perform',
          caciSeries: 'CACI 1902',
          elements: ['Promise made', 'No intent to perform', 'Intent to induce reliance', 'Justifiable reliance', 'Damages']
        },
        {
          id: 'negligent_misrepresentation_1903',
      name: 'Negligent Misrepresentation',
      description: 'Careless provision of false information',
      caciSeries: 'CACI 1903',
      elements: ['False representation', 'No reasonable grounds', 'Intent to induce reliance', 'Justifiable reliance', 'Damages']
        },
        {
          id: 'opinions_as_facts_1904',
          name: 'Opinions as Statements of Fact',
          description: 'Opinion presented as fact in fraud context',
          caciSeries: 'CACI 1904',
          elements: ['Opinion stated', 'Presented as fact', 'Special knowledge or expertise', 'Reliance reasonable', 'Damages']
        },
        {
          id: 'definition_important_fact_1905',
          name: 'Definition of Important Fact/Promise',
          description: 'What constitutes an important fact or promise',
          caciSeries: 'CACI 1905',
          elements: ['Fact or promise', 'Material to transaction', 'Would affect decision']
        },
        {
          id: 'misrepresentation_to_others_1906',
          name: 'Misrepresentations Made to Persons Other Than the Plaintiff',
          description: 'Fraud through misrepresentation to third parties',
          caciSeries: 'CACI 1906',
          elements: ['Misrepresentation to third party', 'Intended to reach plaintiff', 'Plaintiff relied', 'Damages']
        },
        {
          id: 'reliance_1907',
          name: 'Reliance',
          description: 'Plaintiff relied on misrepresentation',
          caciSeries: 'CACI 1907',
          elements: ['Misrepresentation made', 'Plaintiff relied', 'Reliance was cause of damages']
        },
        {
          id: 'reasonable_reliance_1908',
          name: 'Reasonable Reliance',
          description: 'Whether reliance was reasonable under circumstances',
          caciSeries: 'CACI 1908',
          elements: ['Reliance occurred', 'Reasonable under circumstances', 'Not obviously false']
        },
        {
          id: 'real_estate_seller_nondisclosure_1910',
          name: 'Real Estate Seller\'s Nondisclosure of Material Facts',
          description: 'Seller\'s duty to disclose material defects',
          caciSeries: 'CACI 1910',
          elements: ['Material defect', 'Seller knew or should have known', 'Not apparent to buyer', 'Duty to disclose', 'Damages']
        },
        {
          id: 'buyer_damages_property_1920',
          name: 'Buyer\'s Damages for Purchase or Acquisition of Property',
          description: 'Damages recoverable by defrauded buyer',
          caciSeries: 'CACI 1920',
          elements: ['Fraud proven', 'Property purchased', 'Actual damages', 'Out of pocket or benefit of bargain']
        },
        {
          id: 'buyer_damages_lost_profits_1921',
          name: 'Buyer\'s Damages for Purchase or Acquisition of Property—Lost Profits',
          description: 'Lost profits as damages in property fraud',
          caciSeries: 'CACI 1921',
          elements: ['Fraud proven', 'Lost profits', 'Reasonably certain', 'Caused by fraud']
        },
        {
          id: 'seller_damages_property_1922',
          name: 'Seller\'s Damages for Sale or Exchange of Property',
          description: 'Damages recoverable by defrauded seller',
          caciSeries: 'CACI 1922',
          elements: ['Fraud proven', 'Property sold', 'Actual damages', 'Difference in value']
        },
        {
          id: 'damages_out_of_pocket_1923',
          name: 'Damages—"Out of Pocket" Rule',
          description: 'Out of pocket measure of damages',
          caciSeries: 'CACI 1923',
          elements: ['Fraud proven', 'Out of pocket loss', 'Difference between value received and value given']
        },
        {
          id: 'damages_benefit_bargain_1924',
          name: 'Damages—"Benefit of the Bargain" Rule',
          description: 'Benefit of bargain measure of damages',
          caciSeries: 'CACI 1924',
          elements: ['Fraud proven', 'Benefit of bargain', 'Difference between value as represented and actual value']
        },
        {
          id: 'affirmative_defense_sol_fraud_1925',
          name: 'Affirmative Defense—Statute of Limitations—Fraud or Mistake',
          description: 'Statute of limitations defense for fraud claims',
          caciSeries: 'CACI 1925',
          elements: ['Fraud claim', 'Statute of limitations period', 'Delayed discovery rule', 'Claim filed outside period']
        }
      ]
    },
    {
      id: 'series_2000',
      seriesNumber: 2000,
      title: 'TRESPASS',
      causes: [
        {
          id: 'trespass_essential_2000',
          name: 'Trespass—Essential Factual Elements',
          description: 'Unauthorized entry onto property',
          caciSeries: 'CACI 2000',
          elements: ['Intentional entry', 'Onto plaintiff\'s property', 'Without permission', 'Damages']
        },
        {
          id: 'trespass_extrahazardous_2001',
          name: 'Trespass—Extrahazardous Activities',
          description: 'Trespass involving extrahazardous activities',
          caciSeries: 'CACI 2001',
          elements: ['Extrahazardous activity', 'Trespass occurred', 'Strict liability', 'Damages']
        },
        {
          id: 'trespass_timber_2002',
          name: 'Trespass to Timber—Essential Factual Elements (Civ. Code, § 3346)',
          description: 'Unauthorized cutting or removal of timber',
          caciSeries: 'CACI 2002',
          elements: ['Timber cut or removed', 'Without permission', 'From plaintiff\'s property', 'Damages']
        },
        {
          id: 'damage_timber_willful_2003',
          name: 'Damage to Timber—Willful and Malicious Conduct',
          description: 'Enhanced damages for willful timber trespass',
          caciSeries: 'CACI 2003',
          elements: ['Willful and malicious conduct', 'Timber damaged', 'Enhanced damages recoverable']
        },
        {
          id: 'intentional_entry_explained_2004',
          name: '"Intentional Entry" Explained',
          description: 'Definition of intentional entry for trespass',
          caciSeries: 'CACI 2004',
          elements: ['Entry was intentional', 'Not accidental', 'Voluntary act']
        },
        {
          id: 'affirmative_defense_necessity_2005',
          name: 'Affirmative Defense—Necessity',
          description: 'Necessity as defense to trespass',
          caciSeries: 'CACI 2005',
          elements: ['Necessity existed', 'Reasonable under circumstances', 'Defense applies']
        },
        {
          id: 'public_nuisance_2020',
          name: 'Public Nuisance—Essential Factual Elements',
          description: 'Interference with public rights',
          caciSeries: 'CACI 2020',
          elements: ['Substantial interference', 'With public right', 'Unreasonable', 'Damages']
        },
        {
          id: 'private_nuisance_2021',
          name: 'Private Nuisance—Essential Factual Elements',
          description: 'Interference with use and enjoyment of property',
          caciSeries: 'CACI 2021',
          elements: ['Substantial interference', 'With use and enjoyment', 'Unreasonable', 'Damages']
        },
        {
          id: 'private_nuisance_balancing_2022',
          name: 'Private Nuisance—Balancing-Test Factors—Seriousness of Harm and Public Benefit',
          description: 'Balancing test for private nuisance',
          caciSeries: 'CACI 2022',
          elements: ['Seriousness of harm', 'Public benefit', 'Balancing factors', 'Unreasonable interference']
        },
        {
          id: 'failure_abate_artificial_condition_2023',
          name: 'Failure to Abate Artificial Condition on Land Creating Nuisance',
          description: 'Liability for failing to abate nuisance',
          caciSeries: 'CACI 2023',
          elements: ['Artificial condition', 'Created nuisance', 'Failure to abate', 'Damages']
        },
        {
          id: 'affirmative_defense_sol_trespass_2030',
          name: 'Affirmative Defense—Statute of Limitations—Trespass or Private Nuisance',
          description: 'Statute of limitations defense for trespass or nuisance',
          caciSeries: 'CACI 2030',
          elements: ['Trespass or nuisance claim', 'Statute of limitations period', 'Claim filed outside period']
        },
        {
          id: 'damages_annoyance_discomfort_2031',
          name: 'Damages for Annoyance and Discomfort—Trespass or Nuisance',
          description: 'Damages for annoyance and discomfort',
          caciSeries: 'CACI 2031',
          elements: ['Trespass or nuisance proven', 'Annoyance and discomfort', 'Compensable damages']
        }
      ]
    },
    {
      id: 'series_2100',
      seriesNumber: 2100,
      title: 'CONVERSION',
      causes: [
        {
          id: 'conversion_essential_2100',
          name: 'Conversion—Essential Factual Elements',
          description: 'Wrongful exercise of dominion over personal property',
          caciSeries: 'CACI 2100',
          elements: ['Plaintiff owned or had right to possess property', 'Defendant wrongfully exercised dominion', 'Deprived plaintiff of property', 'Damages']
        },
        {
          id: 'trespass_chattels_2101',
          name: 'Trespass to Chattels—Essential Factual Elements',
          description: 'Interference with personal property short of conversion',
          caciSeries: 'CACI 2101',
          elements: ['Plaintiff owned or had right to possess property', 'Defendant interfered with property', 'Deprived plaintiff of use', 'Damages']
        },
        {
          id: 'presumed_measure_damages_conversion_2102',
          name: 'Presumed Measure of Damages for Conversion (Civ. Code, § 3336)',
          description: 'Statutory measure of damages for conversion',
          caciSeries: 'CACI 2102',
          elements: ['Conversion proven', 'Value at time of conversion', 'Plus interest', 'Plus any consequential damages']
        }
      ]
    },
    {
      id: 'series_2200',
      seriesNumber: 2200,
      title: 'ECONOMIC INTERFERENCE',
      causes: [
        {
          id: 'inducing_breach_contract_2200',
          name: 'Inducing Breach of Contract',
          description: 'Intentional interference with contractual relations',
          caciSeries: 'CACI 2200',
          elements: ['Valid contract existed', 'Defendant knew of contract', 'Intentional interference', 'Breach occurred', 'Damages']
        },
        {
          id: 'intentional_interference_contractual_2201',
          name: 'Intentional Interference With Contractual Relations—Essential Factual Elements',
          description: 'Complete elements for intentional interference with contract',
          caciSeries: 'CACI 2201',
          elements: ['Valid contract', 'Defendant knew of contract', 'Intentional acts', 'Disrupted contract', 'Caused damages']
        },
        {
          id: 'intentional_interference_prospective_2202',
          name: 'Intentional Interference With Prospective Economic Relations—Essential Factual Elements',
          description: 'Interference with prospective economic advantage',
          caciSeries: 'CACI 2202',
          elements: ['Economic relationship existed', 'Defendant knew of relationship', 'Intentional interference', 'Disrupted relationship', 'Damages']
        },
        {
          id: 'intent_2203',
          name: 'Intent',
          description: 'Intent requirement for interference claims',
          caciSeries: 'CACI 2203',
          elements: ['Intent to interfere', 'Knowledge of relationship', 'Purpose to disrupt']
        },
        {
          id: 'negligent_interference_prospective_2204',
          name: 'Negligent Interference With Prospective Economic Relations',
          description: 'Negligent interference with economic relations',
          caciSeries: 'CACI 2204',
          elements: ['Economic relationship existed', 'Defendant owed duty', 'Breach of duty', 'Interference caused', 'Damages']
        },
        {
          id: 'intentional_interference_expected_inheritance_2205',
          name: 'Intentional Interference With Expected Inheritance—Essential Factual Elements',
          description: 'Interference with expected inheritance',
          caciSeries: 'CACI 2205',
          elements: ['Expected inheritance', 'Defendant interfered', 'Intent to disrupt inheritance', 'Damages']
        },
        {
          id: 'affirmative_defense_privilege_economic_interest_2210',
          name: 'Affirmative Defense—Privilege to Protect Own Economic Interest',
          description: 'Privilege defense for protecting own economic interests',
          caciSeries: 'CACI 2210',
          elements: ['Legitimate economic interest', 'Reasonable means', 'Privilege applies']
        }
      ]
    },
    {
      id: 'series_2300',
      seriesNumber: 2300,
      title: 'INSURANCE LITIGATION',
      causes: [
        {
          id: 'breach_contractual_duty_pay_covered_claim_2300',
          name: 'Breach of Contractual Duty to Pay a Covered Claim—Essential Factual Elements',
          description: 'Insurer\'s breach of duty to pay covered claim',
          caciSeries: 'CACI 2300',
          elements: ['Insurance policy existed', 'Claim covered by policy', 'Insurer failed to pay', 'Damages']
        },
        {
          id: 'breach_insurance_binder_2301',
          name: 'Breach of Insurance Binder—Essential Factual Elements',
          description: 'Breach of temporary insurance binder',
          caciSeries: 'CACI 2301',
          elements: ['Binder issued', 'Coverage provided', 'Breach of binder terms', 'Damages']
        },
        {
          id: 'breach_contract_temporary_life_insurance_2302',
          name: 'Breach of Contract for Temporary Life Insurance—Essential Factual Elements',
          description: 'Breach of temporary life insurance contract',
          caciSeries: 'CACI 2302',
          elements: ['Temporary life insurance contract', 'Coverage provided', 'Breach occurred', 'Damages']
        },
        {
          id: 'affirmative_defense_policy_exclusion_2303',
          name: 'Affirmative Defense—Insurance Policy Exclusion',
          description: 'Policy exclusion as defense to coverage',
          caciSeries: 'CACI 2303',
          elements: ['Policy exclusion exists', 'Exclusion applies', 'Defense applies']
        },
        {
          id: 'exception_policy_exclusion_2304',
          name: 'Exception to Insurance Policy Exclusion—Burden of Proof',
          description: 'Exception to policy exclusion',
          caciSeries: 'CACI 2304',
          elements: ['Exception to exclusion', 'Burden of proof', 'Exception applies']
        },
        {
          id: 'lost_destroyed_policy_2305',
          name: 'Lost or Destroyed Insurance Policy',
          description: 'Effect of lost or destroyed policy',
          caciSeries: 'CACI 2305',
          elements: ['Policy lost or destroyed', 'Terms may be proven', 'Secondary evidence admissible']
        },
        {
          id: 'covered_excluded_risks_predominant_cause_2306',
          name: 'Covered and Excluded Risks—Predominant Cause of Loss',
          description: 'Determining coverage when multiple causes exist',
          caciSeries: 'CACI 2306',
          elements: ['Multiple causes', 'Predominant cause', 'Coverage determined by predominant cause']
        },
        {
          id: 'insurance_agency_relationship_disputed_2307',
          name: 'Insurance Agency Relationship Disputed',
          description: 'Dispute over agency relationship',
          caciSeries: 'CACI 2307',
          elements: ['Agency relationship disputed', 'Agent\'s authority', 'Binding insurer']
        },
        {
          id: 'affirmative_defense_misrepresentation_concealment_2308',
          name: 'Affirmative Defense—Misrepresentation or Concealment in Insurance Application',
          description: 'Misrepresentation or concealment as defense',
          caciSeries: 'CACI 2308',
          elements: ['Misrepresentation or concealment', 'In application', 'Material to risk', 'Defense applies']
        },
        {
          id: 'termination_policy_fraudulent_claim_2309',
          name: 'Termination of Insurance Policy for Fraudulent Claim',
          description: 'Termination due to fraudulent claim',
          caciSeries: 'CACI 2309',
          elements: ['Fraudulent claim', 'Policy termination', 'Valid termination']
        },
        {
          id: 'affirmative_defense_failure_timely_notice_2320',
          name: 'Affirmative Defense—Failure to Provide Timely Notice',
          description: 'Failure to provide timely notice as defense',
          caciSeries: 'CACI 2320',
          elements: ['Timely notice required', 'Notice not provided', 'Prejudice to insurer', 'Defense applies']
        },
        {
          id: 'affirmative_defense_breach_duty_cooperate_2321',
          name: 'Affirmative Defense—Insured\'s Breach of Duty to Cooperate in Defense',
          description: 'Breach of duty to cooperate as defense',
          caciSeries: 'CACI 2321',
          elements: ['Duty to cooperate', 'Breach of duty', 'Prejudice to insurer', 'Defense applies']
        },
        {
          id: 'affirmative_defense_voluntary_payment_2322',
          name: 'Affirmative Defense—Insured\'s Voluntary Payment',
          description: 'Voluntary payment as defense',
          caciSeries: 'CACI 2322',
          elements: ['Voluntary payment', 'Without insurer consent', 'Defense applies']
        },
        {
          id: 'implied_obligation_good_faith_explained_2330',
          name: 'Implied Obligation of Good Faith and Fair Dealing Explained',
          description: 'Explanation of good faith obligation',
          caciSeries: 'CACI 2330',
          elements: ['Implied obligation', 'Good faith and fair dealing', 'Applies to insurance contracts']
        },
        {
          id: 'breach_good_faith_failure_delay_payment_2331',
          name: 'Breach of the Implied Obligation of Good Faith and Fair Dealing—Failure or Delay in Payment (First Party)—Essential Factual Elements',
          description: 'Bad faith failure or delay in payment',
          caciSeries: 'CACI 2331',
          elements: ['Covered claim', 'Unreasonable failure or delay', 'No proper basis', 'Damages']
        },
        {
          id: 'bad_faith_failure_investigate_2332',
          name: 'Bad Faith (First Party)—Failure to Properly Investigate Claim—Essential Factual Elements',
          description: 'Bad faith failure to investigate',
          caciSeries: 'CACI 2332',
          elements: ['Duty to investigate', 'Failure to investigate', 'Unreasonable', 'Damages']
        },
        {
          id: 'bad_faith_breach_duty_inform_2333',
          name: 'Bad Faith (First Party)—Breach of Duty to Inform Insured of Rights—Essential Factual Elements',
          description: 'Bad faith breach of duty to inform',
          caciSeries: 'CACI 2333',
          elements: ['Duty to inform', 'Breach of duty', 'Unreasonable', 'Damages']
        },
        {
          id: 'bad_faith_refusal_settlement_2334',
          name: 'Bad Faith (Third Party)—Refusal to Accept Reasonable Settlement Demand Within Liability Policy Limits—Essential Factual Elements',
          description: 'Bad faith refusal to settle',
          caciSeries: 'CACI 2334',
          elements: ['Reasonable settlement demand', 'Within policy limits', 'Refusal to settle', 'Excess judgment', 'Damages']
        },
        {
          id: 'bad_faith_advice_counsel_2335',
          name: 'Bad Faith—Advice of Counsel',
          description: 'Advice of counsel defense to bad faith',
          caciSeries: 'CACI 2335',
          elements: ['Advice of counsel', 'Reasonable reliance', 'Defense applies']
        },
        {
          id: 'bad_faith_unreasonable_failure_defend_2336',
          name: 'Bad Faith (Third Party)—Unreasonable Failure to Defend—Essential Factual Elements',
          description: 'Bad faith failure to defend',
          caciSeries: 'CACI 2336',
          elements: ['Duty to defend', 'Failure to defend', 'Unreasonable', 'Damages']
        },
        {
          id: 'factors_evaluating_insurer_conduct_2337',
          name: 'Factors to Consider in Evaluating Insurer\'s Conduct',
          description: 'Factors for evaluating insurer conduct',
          caciSeries: 'CACI 2337',
          elements: ['Multiple factors', 'Evaluating conduct', 'Reasonableness']
        },
        {
          id: 'damages_bad_faith_2350',
          name: 'Damages for Bad Faith',
          description: 'Damages recoverable for bad faith',
          caciSeries: 'CACI 2350',
          elements: ['Bad faith proven', 'Contract damages', 'Tort damages', 'Emotional distress', 'Punitive damages if applicable']
        },
        {
          id: 'insurer_claim_reimbursement_defense_2351',
          name: 'Insurer\'s Claim for Reimbursement of Costs of Defense of Uncovered Claims',
          description: 'Insurer\'s right to reimbursement',
          caciSeries: 'CACI 2351',
          elements: ['Defense provided', 'Uncovered claims', 'Right to reimbursement', 'Reasonable costs']
        },
        {
          id: 'judgment_creditor_action_insurer_2360',
          name: 'Judgment Creditor\'s Action Against Insurer—Essential Factual Elements',
          description: 'Direct action against insurer by judgment creditor',
          caciSeries: 'CACI 2360',
          elements: ['Judgment against insured', 'Insurer liable', 'Direct action', 'Damages']
        },
        {
          id: 'negligent_failure_obtain_coverage_2361',
          name: 'Negligent Failure to Obtain Insurance Coverage—Essential Factual Elements',
          description: 'Agent\'s negligence in obtaining coverage',
          caciSeries: 'CACI 2361',
          elements: ['Agent duty', 'Failure to obtain coverage', 'Negligence', 'Damages']
        }
      ]
    },
    {
      id: 'series_2400',
      seriesNumber: 2400,
      title: 'WRONGFUL TERMINATION',
      causes: [
        {
          id: 'breach_employment_contract_at_will_2400',
          name: 'Breach of Employment Contract—Unspecified Term—"At-Will" Presumption',
          description: 'At-will employment presumption',
          caciSeries: 'CACI 2400',
          elements: ['Unspecified term', 'At-will presumption', 'May be rebutted']
        },
        {
          id: 'breach_employment_contract_actual_constructive_discharge_2401',
          name: 'Breach of Employment Contract—Unspecified Term—Actual or Constructive Discharge—Essential Factual Elements',
          description: 'Actual or constructive discharge',
          caciSeries: 'CACI 2401',
          elements: ['Employment contract', 'Actual or constructive discharge', 'Without good cause', 'Damages']
        },
        {
          id: 'breach_employment_contract_implied_promise_not_discharge_2403',
          name: 'Breach of Employment Contract—Unspecified Term—Implied-in-Fact Promise Not to Discharge Without Good Cause',
          description: 'Implied promise not to discharge without cause',
          caciSeries: 'CACI 2403',
          elements: ['Implied promise', 'Not to discharge without cause', 'Breach occurred', 'Damages']
        },
        {
          id: 'breach_employment_contract_good_cause_defined_2404',
          name: 'Breach of Employment Contract—Unspecified Term—"Good Cause" Defined',
          description: 'Definition of good cause for termination',
          caciSeries: 'CACI 2404',
          elements: ['Good cause defined', 'Fair and honest reasons', 'Business necessity']
        },
        {
          id: 'breach_implied_employment_contract_good_cause_misconduct_2405',
          name: 'Breach of Implied Employment Contract—Unspecified Term—"Good Cause" Defined—Misconduct',
          description: 'Good cause defined for misconduct',
          caciSeries: 'CACI 2405',
          elements: ['Misconduct', 'Good cause', 'Fair and honest reasons']
        },
        {
          id: 'breach_employment_contract_damages_2406',
          name: 'Breach of Employment Contract—Unspecified Term—Damages',
          description: 'Damages for breach of employment contract',
          caciSeries: 'CACI 2406',
          elements: ['Breach proven', 'Lost wages', 'Benefits', 'Mitigation required']
        },
        {
          id: 'breach_employment_contract_specified_term_2420',
          name: 'Breach of Employment Contract—Specified Term—Essential Factual Elements',
          description: 'Breach of fixed-term employment contract',
          caciSeries: 'CACI 2420',
          elements: ['Specified term contract', 'Termination before term', 'Without good cause', 'Damages']
        },
        {
          id: 'breach_employment_contract_specified_term_good_cause_defense_2421',
          name: 'Breach of Employment Contract—Specified Term—Good-Cause Defense (Lab. Code, § 2924)',
          description: 'Good cause defense for specified term',
          caciSeries: 'CACI 2421',
          elements: ['Good cause existed', 'Statutory defense', 'Defense applies']
        },
        {
          id: 'breach_employment_contract_specified_term_damages_2422',
          name: 'Breach of Employment Contract—Specified Term—Damages',
          description: 'Damages for breach of specified term contract',
          caciSeries: 'CACI 2422',
          elements: ['Breach proven', 'Remaining term damages', 'Mitigation required']
        },
        {
          id: 'breach_implied_covenant_good_faith_employment_2423',
          name: 'Breach of Implied Covenant of Good Faith and Fair Dealing—Employment Contract—Essential Factual Elements',
          description: 'Breach of implied covenant in employment',
          caciSeries: 'CACI 2423',
          elements: ['Employment contract', 'Breach of implied covenant', 'Bad faith', 'Damages']
        },
        {
          id: 'affirmative_defense_good_faith_mistaken_belief_2424',
          name: 'Affirmative Defense—Breach of the Implied Covenant of Good Faith and Fair Dealing—Good Faith Though Mistaken Belief',
          description: 'Good faith mistaken belief defense',
          caciSeries: 'CACI 2424',
          elements: ['Mistaken belief', 'Good faith', 'Defense applies']
        },
        {
          id: 'wrongful_discharge_public_policy_2430',
          name: 'Wrongful Discharge in Violation of Public Policy—Essential Factual Elements',
          description: 'Termination in violation of public policy',
          caciSeries: 'CACI 2430',
          elements: ['Public policy violation', 'Termination', 'Causal connection', 'Damages']
        },
        {
          id: 'constructive_discharge_public_policy_required_violate_2431',
          name: 'Constructive Discharge in Violation of Public Policy—Plaintiff Required to Violate Public Policy',
          description: 'Constructive discharge requiring violation of policy',
          caciSeries: 'CACI 2431',
          elements: ['Required to violate public policy', 'Intolerable conditions', 'Constructive discharge', 'Damages']
        },
        {
          id: 'constructive_discharge_public_policy_intolerable_conditions_2432',
          name: 'Constructive Discharge in Violation of Public Policy—Plaintiff Required to Endure Intolerable Conditions That Violate Public Policy',
          description: 'Constructive discharge from intolerable conditions',
          caciSeries: 'CACI 2432',
          elements: ['Intolerable conditions', 'Violate public policy', 'Constructive discharge', 'Damages']
        },
        {
          id: 'discrimination_military_2441',
          name: 'Discrimination Against Member of Military—Essential Factual Elements (Mil. & Vet. Code, § 394)',
          description: 'Discrimination against military member',
          caciSeries: 'CACI 2441',
          elements: ['Military member', 'Discrimination', 'Termination or adverse action', 'Damages']
        }
      ]
    },
    {
      id: 'series_2500',
      seriesNumber: 2500,
      title: 'FAIR EMPLOYMENT AND HOUSING ACT',
      causes: [
        {
          id: 'disparate_treatment_2500',
          name: 'Disparate Treatment—Essential Factual Elements (Gov. Code, § 12940(a))',
          description: 'Intentional discrimination based on protected characteristic',
          caciSeries: 'CACI 2500',
          elements: ['Protected characteristic', 'Adverse employment action', 'Causal connection', 'Damages']
        },
        {
          id: 'affirmative_defense_bfoq_2501',
          name: 'Affirmative Defense—Bona fide Occupational Qualification',
          description: 'BFOQ defense to discrimination',
          caciSeries: 'CACI 2501',
          elements: ['BFOQ exists', 'Necessary for business', 'Defense applies']
        },
        {
          id: 'disparate_impact_2502',
          name: 'Disparate Impact—Essential Factual Elements (Gov. Code, § 12940(a))',
          description: 'Neutral policy with discriminatory impact',
          caciSeries: 'CACI 2502',
          elements: ['Neutral policy', 'Disparate impact', 'Protected group affected', 'Damages']
        },
        {
          id: 'affirmative_defense_business_necessity_2503',
          name: 'Affirmative Defense—Business Necessity/Job Relatedness',
          description: 'Business necessity defense',
          caciSeries: 'CACI 2503',
          elements: ['Business necessity', 'Job related', 'Defense applies']
        },
        {
          id: 'disparate_impact_rebuttal_business_necessity_2504',
          name: 'Disparate Impact—Rebuttal to Business Necessity/Job Relatedness Defense',
          description: 'Rebuttal to business necessity defense',
          caciSeries: 'CACI 2504',
          elements: ['Less discriminatory alternative', 'Equally effective', 'Rebuttal applies']
        },
        {
          id: 'retaliation_2505',
          name: 'Retaliation—Essential Factual Elements (Gov. Code, § 12940(h))',
          description: 'Retaliation for protected activity',
          caciSeries: 'CACI 2505',
          elements: ['Protected activity', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'limitation_remedies_after_acquired_evidence_2506',
          name: 'Limitation on Remedies—After-Acquired Evidence',
          description: 'Limitation on remedies with after-acquired evidence',
          caciSeries: 'CACI 2506',
          elements: ['After-acquired evidence', 'Would have terminated', 'Limitation applies']
        },
        {
          id: 'substantial_motivating_reason_explained_2507',
          name: '"Substantial Motivating Reason" Explained',
          description: 'Definition of substantial motivating reason',
          caciSeries: 'CACI 2507',
          elements: ['Substantial motivating reason', 'More than trivial', 'Causal factor']
        },
        {
          id: 'failure_file_timely_complaint_continuing_violation_2508',
          name: 'Failure to File Timely Administrative Complaint—Plaintiff Alleges Continuing Violation (Gov Code, § 12960(e))',
          description: 'Continuing violation exception to limitations',
          caciSeries: 'CACI 2508',
          elements: ['Continuing violation', 'Exception applies', 'Timely filing']
        },
        {
          id: 'adverse_employment_action_explained_2509',
          name: '"Adverse Employment Action" Explained',
          description: 'Definition of adverse employment action',
          caciSeries: 'CACI 2509',
          elements: ['Adverse action', 'Material change', 'Terms or conditions']
        },
        {
          id: 'constructive_discharge_explained_2510',
          name: '"Constructive Discharge" Explained',
          description: 'Definition of constructive discharge',
          caciSeries: 'CACI 2510',
          elements: ['Intolerable conditions', 'Reasonable person would resign', 'Constructive discharge']
        },
        {
          id: 'adverse_action_decision_maker_without_animus_2511',
          name: 'Adverse Action Made by Decision Maker Without Animus (Cat\'s Paw)',
          description: 'Cat\'s paw theory of liability',
          caciSeries: 'CACI 2511',
          elements: ['Biased subordinate', 'Influenced decision', 'Causal connection']
        },
        {
          id: 'limitation_remedies_same_decision_2512',
          name: 'Limitation on Remedies—Same Decision',
          description: 'Same decision defense limiting remedies',
          caciSeries: 'CACI 2512',
          elements: ['Same decision', 'Would have made anyway', 'Limitation applies']
        },
        {
          id: 'business_judgment_at_will_employment_2513',
          name: 'Business Judgment for "At-Will" Employment',
          description: 'Business judgment for at-will employment',
          caciSeries: 'CACI 2513',
          elements: ['At-will employment', 'Business judgment', 'Not pretext']
        },
        {
          id: 'quid_pro_quo_sexual_harassment_2520',
          name: 'Quid pro quo Sexual Harassment—Essential Factual Elements',
          description: 'Sexual harassment involving exchange',
          caciSeries: 'CACI 2520',
          elements: ['Sexual advances or conduct', 'Condition of employment', 'Adverse action', 'Damages']
        },
        {
          id: 'work_environment_harassment_conduct_plaintiff_employer_2521a',
          name: 'Work Environment Harassment—Conduct Directed at Plaintiff—Essential Factual Elements—Employer or Entity Defendant (Gov. Code, §§ 12923, 12940(j))',
          description: 'Hostile work environment harassment against plaintiff by employer',
          caciSeries: 'CACI 2521A',
          elements: ['Harassing conduct', 'Directed at plaintiff', 'Severe or pervasive', 'Damages']
        },
        {
          id: 'work_environment_harassment_conduct_others_employer_2521b',
          name: 'Work Environment Harassment—Conduct Directed at Others—Essential Factual Elements—Employer or Entity Defendant (Gov. Code, §§ 12923, 12940(j))',
          description: 'Hostile work environment harassment witnessed by plaintiff',
          caciSeries: 'CACI 2521B',
          elements: ['Harassing conduct', 'Directed at others', 'Witnessed by plaintiff', 'Severe or pervasive', 'Damages']
        },
        {
          id: 'work_environment_harassment_sexual_favoritism_employer_2521c',
          name: 'Work Environment Harassment—Sexual Favoritism—Essential Factual Elements—Employer or Entity Defendant (Gov. Code, §§ 12923, 12940(j))',
          description: 'Sexual favoritism creating hostile environment',
          caciSeries: 'CACI 2521C',
          elements: ['Sexual favoritism', 'Widespread', 'Hostile environment', 'Damages']
        },
        {
          id: 'work_environment_harassment_conduct_plaintiff_individual_2522a',
          name: 'Work Environment Harassment—Conduct Directed at Plaintiff—Essential Factual Elements—Individual Defendant (Gov. Code, §§ 12923, 12940(j))',
          description: 'Hostile work environment harassment against plaintiff by individual',
          caciSeries: 'CACI 2522A',
          elements: ['Harassing conduct', 'Directed at plaintiff', 'Severe or pervasive', 'Damages']
        },
        {
          id: 'work_environment_harassment_conduct_others_individual_2522b',
          name: 'Work Environment Harassment—Conduct Directed at Others—Essential Factual Elements—Individual Defendant (Gov. Code, §§ 12923, 12940(j))',
          description: 'Hostile work environment harassment witnessed by plaintiff',
          caciSeries: 'CACI 2522B',
          elements: ['Harassing conduct', 'Directed at others', 'Witnessed by plaintiff', 'Severe or pervasive', 'Damages']
        },
        {
          id: 'work_environment_harassment_sexual_favoritism_individual_2522c',
          name: 'Work Environment Harassment—Sexual Favoritism—Essential Factual Elements—Individual Defendant (Gov. Code, §§ 12923, 12940(j))',
          description: 'Sexual favoritism creating hostile environment',
          caciSeries: 'CACI 2522C',
          elements: ['Sexual favoritism', 'Widespread', 'Hostile environment', 'Damages']
        },
        {
          id: 'harassing_conduct_explained_2523',
          name: '"Harassing Conduct" Explained',
          description: 'Definition of harassing conduct',
          caciSeries: 'CACI 2523',
          elements: ['Unwelcome conduct', 'Based on protected characteristic', 'Harassing']
        },
        {
          id: 'severe_or_pervasive_explained_2524',
          name: '"Severe or Pervasive" Explained',
          description: 'Definition of severe or pervasive',
          caciSeries: 'CACI 2524',
          elements: ['Severe or pervasive', 'Alters conditions', 'Hostile environment']
        },
        {
          id: 'harassment_supervisor_defined_2525',
          name: 'Harassment—"Supervisor" Defined (Gov. Code, § 12926(t))',
          description: 'Definition of supervisor for harassment',
          caciSeries: 'CACI 2525',
          elements: ['Supervisor defined', 'Authority', 'Statutory definition']
        },
        {
          id: 'affirmative_defense_avoidable_consequences_2526',
          name: 'Affirmative Defense—Avoidable Consequences Doctrine (Sexual Harassment by a Supervisor)',
          description: 'Avoidable consequences defense',
          caciSeries: 'CACI 2526',
          elements: ['Reasonable steps available', 'Not taken', 'Defense applies']
        },
        {
          id: 'failure_prevent_harassment_discrimination_retaliation_2527',
          name: 'Failure to Prevent Harassment, Discrimination, or Retaliation—Essential Factual Elements—Employer or Entity Defendant (Gov. Code, § 12940(k))',
          description: 'Failure to prevent harassment, discrimination, or retaliation',
          caciSeries: 'CACI 2527',
          elements: ['Harassment/discrimination/retaliation occurred', 'Failure to prevent', 'Damages']
        },
        {
          id: 'failure_prevent_harassment_nonemployee_2528',
          name: 'Failure to Prevent Harassment by Nonemployee (Gov. Code, § 12940(j))',
          description: 'Failure to prevent nonemployee harassment',
          caciSeries: 'CACI 2528',
          elements: ['Nonemployee harassment', 'Employer knew or should have known', 'Failure to prevent', 'Damages']
        },
        {
          id: 'disability_discrimination_disparate_treatment_2540',
          name: 'Disability Discrimination—Disparate Treatment—Essential Factual Elements',
          description: 'Disability discrimination',
          caciSeries: 'CACI 2540',
          elements: ['Disability', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'disability_discrimination_reasonable_accommodation_2541',
          name: 'Disability Discrimination—Reasonable Accommodation—Essential Factual Elements (Gov. Code, § 12940(m))',
          description: 'Failure to provide reasonable accommodation',
          caciSeries: 'CACI 2541',
          elements: ['Disability', 'Reasonable accommodation needed', 'Failure to accommodate', 'Damages']
        },
        {
          id: 'disability_discrimination_reasonable_accommodation_explained_2542',
          name: 'Disability Discrimination—"Reasonable Accommodation" Explained',
          description: 'Definition of reasonable accommodation',
          caciSeries: 'CACI 2542',
          elements: ['Reasonable accommodation', 'Enables performance', 'Not undue hardship']
        },
        {
          id: 'disability_discrimination_essential_job_duties_2543',
          name: 'Disability Discrimination—"Essential Job Duties" Explained (Gov. Code, §§ 12926(f), 12940(a)(1))',
          description: 'Definition of essential job duties',
          caciSeries: 'CACI 2543',
          elements: ['Essential duties', 'Core functions', 'Fundamental to position']
        },
        {
          id: 'disability_discrimination_affirmative_defense_health_safety_2544',
          name: 'Disability Discrimination—Affirmative Defense—Health or Safety Risk',
          description: 'Health or safety risk defense',
          caciSeries: 'CACI 2544',
          elements: ['Health or safety risk', 'Significant risk', 'Defense applies']
        },
        {
          id: 'disability_discrimination_affirmative_defense_undue_hardship_2545',
          name: 'Disability Discrimination—Affirmative Defense—Undue Hardship',
          description: 'Undue hardship defense',
          caciSeries: 'CACI 2545',
          elements: ['Undue hardship', 'Significant difficulty', 'Defense applies']
        },
        {
          id: 'disability_discrimination_failure_interactive_process_2546',
          name: 'Disability Discrimination—Reasonable Accommodation—Failure to Engage in Interactive Process (Gov. Code, § 12940(n))',
          description: 'Failure to engage in interactive process',
          caciSeries: 'CACI 2546',
          elements: ['Duty to engage', 'Failure to engage', 'Damages']
        },
        {
          id: 'disability_associational_discrimination_2547',
          name: 'Disability-Based Associational Discrimination—Essential Factual Elements',
          description: 'Discrimination based on association with disabled person',
          caciSeries: 'CACI 2547',
          elements: ['Association with disabled person', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'disability_discrimination_refusal_accommodation_housing_2548',
          name: 'Disability Discrimination—Refusal to Make Reasonable Accommodation in Housing (Gov. Code, § 12927(c)(1))',
          description: 'Failure to accommodate in housing',
          caciSeries: 'CACI 2548',
          elements: ['Disability', 'Housing accommodation needed', 'Refusal', 'Damages']
        },
        {
          id: 'disability_discrimination_refusal_modification_housing_2549',
          name: 'Disability Discrimination—Refusal to Permit Reasonable Modification to Housing Unit (Gov. Code, § 12927(c)(1))',
          description: 'Failure to permit modification in housing',
          caciSeries: 'CACI 2549',
          elements: ['Disability', 'Housing modification needed', 'Refusal', 'Damages']
        },
        {
          id: 'religious_creed_discrimination_failure_accommodate_2560',
          name: 'Religious Creed Discrimination—Failure to Accommodate—Essential Factual Elements (Gov. Code, § 12940(l))',
          description: 'Failure to accommodate religious creed',
          caciSeries: 'CACI 2560',
          elements: ['Religious creed', 'Accommodation needed', 'Failure to accommodate', 'Damages']
        },
        {
          id: 'religious_creed_discrimination_undue_hardship_2561',
          name: 'Religious Creed Discrimination—Reasonable Accommodation—Affirmative Defense—Undue Hardship (Gov. Code, §§ 12940(l)(1), 12926(u))',
          description: 'Undue hardship defense to religious accommodation',
          caciSeries: 'CACI 2561',
          elements: ['Undue hardship', 'Significant difficulty', 'Defense applies']
        },
        {
          id: 'age_discrimination_disparate_treatment_2570',
          name: 'Age Discrimination—Disparate Treatment—Essential Factual Elements',
          description: 'Age discrimination',
          caciSeries: 'CACI 2570',
          elements: ['Age', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'pregnancy_discrimination_failure_accommodate_2580',
          name: 'Pregnancy Discrimination—Failure to Accommodate—Essential Factual Elements (Gov. Code, § 12945(a)(3)(A))',
          description: 'Failure to accommodate pregnancy',
          caciSeries: 'CACI 2580',
          elements: ['Pregnancy', 'Accommodation needed', 'Failure to accommodate', 'Damages']
        },
        {
          id: 'pregnancy_discrimination_reasonable_accommodation_explained_2581',
          name: 'Pregnancy Discrimination—"Reasonable Accommodation" Explained',
          description: 'Definition of reasonable accommodation for pregnancy',
          caciSeries: 'CACI 2581',
          elements: ['Reasonable accommodation', 'Pregnancy-related', 'Not undue hardship']
        }
      ]
    },
    {
      id: 'series_2600',
      seriesNumber: 2600,
      title: 'CALIFORNIA FAMILY RIGHTS ACT',
      causes: [
        {
          id: 'violation_cfra_rights_2600',
          name: 'Violation of CFRA Rights—Essential Factual Elements',
          description: 'Violation of California Family Rights Act',
          caciSeries: 'CACI 2600',
          elements: ['Eligible employee', 'Qualifying reason', 'CFRA leave requested', 'Violation occurred', 'Damages']
        },
        {
          id: 'eligibility_cfra_2601',
          name: 'Eligibility',
          description: 'Eligibility requirements for CFRA leave',
          caciSeries: 'CACI 2601',
          elements: ['12 months employment', '1250 hours worked', '50+ employees', 'Eligible']
        },
        {
          id: 'reasonable_notice_cfra_2602',
          name: 'Reasonable Notice by Employee of Need for CFRA Leave',
          description: 'Employee\'s duty to provide notice',
          caciSeries: 'CACI 2602',
          elements: ['Reasonable notice', 'As soon as practicable', 'Sufficient information']
        },
        {
          id: 'comparable_job_explained_2603',
          name: '"Comparable Job" Explained',
          description: 'Definition of comparable job',
          caciSeries: 'CACI 2603',
          elements: ['Comparable job', 'Equivalent pay', 'Benefits', 'Working conditions']
        },
        {
          id: 'affirmative_defense_no_certification_2610',
          name: 'Affirmative Defense—No Certification From Health Care Provider',
          description: 'Defense for lack of certification',
          caciSeries: 'CACI 2610',
          elements: ['Certification required', 'Not provided', 'Defense applies']
        },
        {
          id: 'affirmative_defense_fitness_duty_2611',
          name: 'Affirmative Defense—Fitness for Duty Statement',
          description: 'Fitness for duty requirement',
          caciSeries: 'CACI 2611',
          elements: ['Fitness for duty required', 'Not provided', 'Defense applies']
        },
        {
          id: 'affirmative_defense_employment_would_ceased_2612',
          name: 'Affirmative Defense—Employment Would Have Ceased',
          description: 'Defense that employment would have ended anyway',
          caciSeries: 'CACI 2612',
          elements: ['Employment would have ceased', 'Regardless of CFRA', 'Defense applies']
        },
        {
          id: 'cfra_retaliation_2620',
          name: 'CFRA Rights Retaliation—Essential Factual Elements (Gov. Code, § 12945.2(k))',
          description: 'Retaliation for exercising CFRA rights',
          caciSeries: 'CACI 2620',
          elements: ['CFRA rights exercised', 'Adverse action', 'Causal connection', 'Damages']
        }
      ]
    },
    {
      id: 'series_2700',
      seriesNumber: 2700,
      title: 'LABOR CODE ACTIONS',
      causes: [
        {
          id: 'nonpayment_wages_2700',
          name: 'Nonpayment of Wages—Essential Factual Elements (Lab. Code, §§ 201, 202, 218)',
          description: 'Failure to pay wages owed to employee',
          caciSeries: 'CACI 2700',
          elements: ['Employment relationship', 'Wages earned', 'Wages due', 'Failure to pay', 'Damages']
        },
        {
          id: 'nonpayment_minimum_wage_2701',
          name: 'Nonpayment of Minimum Wage—Essential Factual Elements (Lab. Code, § 1194)',
          description: 'Payment below minimum wage',
          caciSeries: 'CACI 2701',
          elements: ['Employment relationship', 'Hours worked', 'Payment below minimum wage', 'Damages']
        },
        {
          id: 'nonpayment_overtime_2702',
          name: 'Nonpayment of Overtime Compensation—Essential Factual Elements (Lab. Code, § 1194)',
          description: 'Failure to pay overtime wages',
          caciSeries: 'CACI 2702',
          elements: ['Employment relationship', 'Overtime hours worked', 'Failure to pay overtime', 'Damages']
        },
        {
          id: 'nonpayment_overtime_proof_2703',
          name: 'Nonpayment of Overtime Compensation—Proof of Overtime Hours Worked',
          description: 'Proof requirements for overtime hours worked',
          caciSeries: 'CACI 2703',
          elements: ['Overtime hours worked', 'Employer records', 'Reasonable inference', 'Damages']
        },
        {
          id: 'waiting_time_penalty_2704',
          name: 'Waiting-Time Penalty for Nonpayment of Wages (Lab. Code, §§ 203, 218)',
          description: 'Penalties for failure to pay wages upon termination',
          caciSeries: 'CACI 2704',
          elements: ['Employment terminated', 'Wages due', 'Failure to pay within time limit', 'Penalties']
        },
        {
          id: 'independent_contractor_defense_2705',
          name: 'Independent Contractor—Affirmative Defense—Worker Was Not Hiring Entity\'s Employee (Lab. Code, § 2775)',
          description: 'Defense that worker was independent contractor, not employee',
          caciSeries: 'CACI 2705',
          elements: ['Independent contractor relationship', 'No employment relationship', 'Defense applies']
        },
        {
          id: 'solicitation_misrepresentation_2710',
          name: 'Solicitation of Employee by Misrepresentation—Essential Factual Elements (Lab. Code, § 970)',
          description: 'False representations in employment solicitation',
          caciSeries: 'CACI 2710',
          elements: ['False representation', 'Reliance', 'Damages', 'Causation']
        },
        {
          id: 'preventing_subsequent_employment_2711',
          name: 'Preventing Subsequent Employment by Misrepresentation—Essential Factual Elements (Lab. Code, § 1050)',
          description: 'Misrepresentation preventing subsequent employment',
          caciSeries: 'CACI 2711',
          elements: ['False representation', 'Prevented employment', 'Damages', 'Causation']
        },
        {
          id: 'overtime_executive_exemption_2720',
          name: 'Affirmative Defense—Nonpayment of Overtime—Executive Exemption',
          description: 'Executive exemption defense to overtime claim',
          caciSeries: 'CACI 2720',
          elements: ['Executive duties', 'Salary basis', 'Exempt from overtime', 'Defense applies']
        },
        {
          id: 'overtime_administrative_exemption_2721',
          name: 'Affirmative Defense—Nonpayment of Overtime—Administrative Exemption',
          description: 'Administrative exemption defense to overtime claim',
          caciSeries: 'CACI 2721',
          elements: ['Administrative duties', 'Salary basis', 'Exempt from overtime', 'Defense applies']
        },
        {
          id: 'retaliatory_immigration_practice_2732',
          name: 'Retaliatory Unfair Immigration-Related Practice—Essential Factual Elements (Lab. Code, § 1019)',
          description: 'Retaliation based on immigration-related practices',
          caciSeries: 'CACI 2732',
          elements: ['Protected activity', 'Adverse action', 'Immigration-related retaliation', 'Damages']
        },
        {
          id: 'equal_pay_act_violation_2740',
          name: 'Violation of Equal Pay Act—Essential Factual Elements (Lab. Code, § 1197.5)',
          description: 'Pay discrimination based on sex, race, or ethnicity',
          caciSeries: 'CACI 2740',
          elements: ['Substantially similar work', 'Different pay', 'Based on sex/race/ethnicity', 'Damages']
        },
        {
          id: 'equal_pay_different_pay_justified_2741',
          name: 'Affirmative Defense—Different Pay Justified',
          description: 'Defense that different pay is justified',
          caciSeries: 'CACI 2741',
          elements: ['Seniority system', 'Merit system', 'Quantity/quality of production', 'Bona fide factor', 'Defense applies']
        },
        {
          id: 'equal_pay_bona_fide_factor_2742',
          name: 'Bona Fide Factor Other Than Sex, Race, or Ethnicity',
          description: 'Bona fide factor defense to equal pay claim',
          caciSeries: 'CACI 2742',
          elements: ['Bona fide factor', 'Not sex/race/ethnicity', 'Job-related', 'Business necessity', 'Defense applies']
        },
        {
          id: 'equal_pay_act_retaliation_2743',
          name: 'Equal Pay Act—Retaliation—Essential Factual Elements (Lab. Code, § 1197.5(k))',
          description: 'Retaliation for exercising equal pay rights',
          caciSeries: 'CACI 2743',
          elements: ['Equal pay rights exercised', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'failure_reimburse_expenditures_2750',
          name: 'Failure to Reimburse Employee for Necessary Expenditures or Losses—Essential Factual Elements (Lab. Code, § 2802(a))',
          description: 'Failure to reimburse employee for necessary business expenditures',
          caciSeries: 'CACI 2750',
          elements: ['Employment relationship', 'Necessary expenditures', 'Incurred in discharge of duties', 'Failure to reimburse', 'Damages']
        },
        {
          id: 'tip_pool_conversion_2752',
          name: 'Tip Pool Conversion—Essential Factual Elements (Lab. Code, § 351)',
          description: 'Unlawful conversion of tips or gratuities',
          caciSeries: 'CACI 2752',
          elements: ['Tips or gratuities', 'Belonged to employee', 'Conversion by employer', 'Damages']
        },
        {
          id: 'failure_pay_vested_vacation_2753',
          name: 'Failure to Pay All Vested Vacation Time—Essential Factual Elements (Lab. Code, § 227.3)',
          description: 'Failure to pay accrued vacation wages upon termination',
          caciSeries: 'CACI 2753',
          elements: ['Vacation time accrued', 'Employment terminated', 'Failure to pay', 'Damages']
        },
        {
          id: 'reporting_time_pay_2754',
          name: 'Reporting Time Pay—Essential Factual Elements',
          description: 'Failure to pay reporting time wages',
          caciSeries: 'CACI 2754',
          elements: ['Employee reported for work', 'Work not available', 'Minimum reporting time pay required', 'Failure to pay', 'Damages']
        },
        {
          id: 'rest_break_violations_introduction_2760',
          name: 'Rest Break Violations—Introduction (Lab. Code, § 226.7)',
          description: 'Introduction to rest break violations',
          caciSeries: 'CACI 2760',
          elements: ['Rest break requirements', 'Violation occurred', 'Damages']
        },
        {
          id: 'rest_break_violations_essential_2761',
          name: 'Rest Break Violations—Essential Factual Elements (Lab. Code, § 226.7)',
          description: 'Essential elements of rest break violations',
          caciSeries: 'CACI 2761',
          elements: ['Employment relationship', 'Work period requiring rest break', 'Failure to provide rest break', 'Damages']
        },
        {
          id: 'rest_break_violations_pay_owed_2762',
          name: 'Rest Break Violations—Pay Owed',
          description: 'Pay owed for rest break violations',
          caciSeries: 'CACI 2762',
          elements: ['Rest break violation', 'Pay owed', 'One hour of pay', 'Damages']
        },
        {
          id: 'meal_break_violations_introduction_2765',
          name: 'Meal Break Violations—Introduction (Lab. Code, §§ 226.7, 512)',
          description: 'Introduction to meal break violations',
          caciSeries: 'CACI 2765',
          elements: ['Meal break requirements', 'Violation occurred', 'Damages']
        },
        {
          id: 'meal_break_violations_essential_2766a',
          name: 'Meal Break Violations—Essential Factual Elements (Lab. Code, §§ 226.7, 512)',
          description: 'Essential elements of meal break violations',
          caciSeries: 'CACI 2766A',
          elements: ['Employment relationship', 'Work period requiring meal break', 'Failure to provide meal break', 'Damages']
        },
        {
          id: 'meal_break_violations_rebuttable_presumption_2766b',
          name: 'Meal Break Violations—Rebuttable Presumption—Employer Records',
          description: 'Rebuttable presumption based on employer records',
          caciSeries: 'CACI 2766B',
          elements: ['Employer records', 'No meal break recorded', 'Rebuttable presumption', 'Damages']
        },
        {
          id: 'meal_break_violations_pay_owed_2767',
          name: 'Meal Break Violations—Pay Owed',
          description: 'Pay owed for meal break violations',
          caciSeries: 'CACI 2767',
          elements: ['Meal break violation', 'Pay owed', 'One hour of pay', 'Damages']
        },
        {
          id: 'meal_break_waiver_mutual_consent_2770',
          name: 'Affirmative Defense—Meal Breaks—Waiver by Mutual Consent',
          description: 'Defense that meal break was waived by mutual consent',
          caciSeries: 'CACI 2770',
          elements: ['Mutual consent', 'Waiver of meal break', 'Defense applies']
        },
        {
          id: 'meal_break_written_consent_onduty_2771',
          name: 'Affirmative Defense—Meal Breaks—Written Consent to On-Duty Meal Breaks',
          description: 'Defense for written consent to on-duty meal breaks',
          caciSeries: 'CACI 2771',
          elements: ['Written consent', 'On-duty meal break', 'Defense applies']
        },
        {
          id: 'nonpayment_wages_rounding_system_2775',
          name: 'Nonpayment of Wages Under Rounding System—Essential Factual Elements',
          description: 'Failure to pay wages under rounding system',
          caciSeries: 'CACI 2775',
          elements: ['Rounding system', 'Unfavorable rounding', 'Wages not paid', 'Damages']
        }
      ]
    },
    {
      id: 'series_2800',
      seriesNumber: 2800,
      title: 'WORKERS\' COMPENSATION',
      causes: [
        {
          id: 'employer_defense_workers_comp_2800',
          name: 'Employer\'s Affirmative Defense—Injury Covered by Workers\' Compensation',
          description: 'Defense that injury is covered by workers\' compensation',
          caciSeries: 'CACI 2800',
          elements: ['Workers\' compensation coverage', 'Exclusive remedy', 'Defense applies']
        },
        {
          id: 'employer_willful_assault_2801',
          name: 'Employer\'s Willful Physical Assault—Essential Factual Elements (Lab. Code, § 3602(b)(1))',
          description: 'Willful physical assault by employer',
          caciSeries: 'CACI 2801',
          elements: ['Employer', 'Willful physical assault', 'Injury', 'Damages']
        },
        {
          id: 'fraudulent_concealment_injury_2802',
          name: 'Fraudulent Concealment of Injury—Essential Factual Elements (Lab. Code, § 3602(b)(2))',
          description: 'Fraudulent concealment of work injury',
          caciSeries: 'CACI 2802',
          elements: ['Injury', 'Fraudulent concealment', 'Knowledge', 'Damages']
        },
        {
          id: 'employer_defective_product_2803',
          name: 'Employer\'s Defective Product—Essential Factual Elements (Lab. Code, § 3602(b)(3))',
          description: 'Injury from employer\'s defective product',
          caciSeries: 'CACI 2803',
          elements: ['Defective product', 'Employer manufactured', 'Injury', 'Damages']
        },
        {
          id: 'power_press_guards_2804',
          name: 'Removal or Noninstallation of Power Press Guards—Essential Factual Elements (Lab. Code, § 4558)',
          description: 'Removal or failure to install power press guards',
          caciSeries: 'CACI 2804',
          elements: ['Power press', 'Guard removed or not installed', 'Injury', 'Damages']
        },
        {
          id: 'employee_not_course_employment_2805',
          name: 'Employee Not Within Course of Employment—Employer Conduct Unrelated to Employment',
          description: 'Injury outside course of employment',
          caciSeries: 'CACI 2805',
          elements: ['Not in course of employment', 'Employer conduct unrelated', 'Injury', 'Damages']
        },
        {
          id: 'coemployee_defense_workers_comp_2810',
          name: 'Coemployee\'s Affirmative Defense—Injury Covered by Workers\' Compensation',
          description: 'Defense that injury is covered by workers\' compensation',
          caciSeries: 'CACI 2810',
          elements: ['Workers\' compensation coverage', 'Coemployee immunity', 'Defense applies']
        },
        {
          id: 'coemployee_willful_aggression_2811',
          name: 'Co-Employee\'s Willful and Unprovoked Physical Act of Aggression—Essential Factual Elements (Lab. Code, § 3601(a)(1))',
          description: 'Willful and unprovoked physical aggression by co-employee',
          caciSeries: 'CACI 2811',
          elements: ['Co-employee', 'Willful and unprovoked', 'Physical aggression', 'Injury', 'Damages']
        },
        {
          id: 'coemployee_intoxication_2812',
          name: 'Injury Caused by Co-Employee\'s Intoxication—Essential Factual Elements (Lab. Code, § 3601(a)(2))',
          description: 'Injury caused by co-employee\'s intoxication',
          caciSeries: 'CACI 2812',
          elements: ['Co-employee', 'Intoxication', 'Causation', 'Injury', 'Damages']
        }
      ]
    },
    {
      id: 'series_2900',
      seriesNumber: 2900,
      title: 'FEDERAL EMPLOYERS\' LIABILITY ACT',
      causes: [
        {
          id: 'fela_essential_2900',
          name: 'FELA—Essential Factual Elements',
          description: 'Federal Employers\' Liability Act essential elements',
          caciSeries: 'CACI 2900',
          elements: ['Common carrier', 'Employee', 'Injury', 'Negligence', 'Causation', 'Damages']
        },
        {
          id: 'fela_negligence_duty_railroad_2901',
          name: 'Negligence—Duty of Railroad',
          description: 'Railroad\'s duty of care under FELA',
          caciSeries: 'CACI 2901',
          elements: ['Railroad', 'Duty of care', 'Reasonable care', 'Safe workplace']
        },
        {
          id: 'fela_negligence_assignment_employees_2902',
          name: 'Negligence—Assignment of Employees',
          description: 'Negligence in assignment of employees',
          caciSeries: 'CACI 2902',
          elements: ['Assignment', 'Negligent assignment', 'Injury', 'Causation']
        },
        {
          id: 'fela_causation_negligence_2903',
          name: 'Causation—Negligence',
          description: 'Causation requirement under FELA',
          caciSeries: 'CACI 2903',
          elements: ['Negligence', 'Substantial factor', 'Injury', 'Causation']
        },
        {
          id: 'fela_comparative_fault_2904',
          name: 'Comparative Fault',
          description: 'Comparative fault under FELA',
          caciSeries: 'CACI 2904',
          elements: ['Employee negligence', 'Contributory negligence', 'Apportionment', 'Damages']
        },
        {
          id: 'fela_compliance_employer_requests_2905',
          name: 'Compliance With Employer\'s Requests or Directions',
          description: 'Compliance with employer requests',
          caciSeries: 'CACI 2905',
          elements: ['Employer request', 'Compliance', 'Reasonable', 'No contributory negligence']
        },
        {
          id: 'fela_fsaa_bia_essential_2920',
          name: 'Federal Safety Appliance Act or Boiler Inspection Act—Essential Factual Elements',
          description: 'Violation of FSAA or BIA',
          caciSeries: 'CACI 2920',
          elements: ['FSAA or BIA violation', 'Injury', 'Causation', 'Damages']
        },
        {
          id: 'fela_causation_fsaa_bia_2921',
          name: 'Causation Under FSAA or BIA',
          description: 'Causation under FSAA or BIA',
          caciSeries: 'CACI 2921',
          elements: ['FSAA or BIA violation', 'Substantial factor', 'Injury', 'Causation']
        },
        {
          id: 'fela_statute_limitations_2922',
          name: 'Statute of Limitations—Special Verdict Form or Interrogatory',
          description: 'Statute of limitations under FELA',
          caciSeries: 'CACI 2922',
          elements: ['Filing deadline', 'Discovery rule', 'Timely filing']
        },
        {
          id: 'fela_borrowed_servant_dual_employee_2923',
          name: 'Borrowed Servant/Dual Employee',
          description: 'Borrowed servant or dual employee status',
          caciSeries: 'CACI 2923',
          elements: ['Borrowed servant', 'Dual employment', 'Control', 'Employment relationship']
        },
        {
          id: 'fela_status_defendant_employee_subservant_2924',
          name: 'Status as Defendant\'s Employee—Subservant Company',
          description: 'Employee status with subservant company',
          caciSeries: 'CACI 2924',
          elements: ['Subservant company', 'Employee status', 'Control', 'Employment relationship']
        },
        {
          id: 'fela_status_common_carrier_2925',
          name: 'Status of Defendant as Common Carrier',
          description: 'Defendant\'s status as common carrier',
          caciSeries: 'CACI 2925',
          elements: ['Common carrier', 'Interstate commerce', 'Railroad operations']
        },
        {
          id: 'fela_scope_employment_2926',
          name: 'Scope of Employment',
          description: 'Scope of employment under FELA',
          caciSeries: 'CACI 2926',
          elements: ['Course of employment', 'Scope of duties', 'Employment relationship']
        },
        {
          id: 'fela_income_tax_effects_2940',
          name: 'Income Tax Effects of Award',
          description: 'Income tax effects on FELA award',
          caciSeries: 'CACI 2940',
          elements: ['Award', 'Tax consequences', 'No reduction for taxes']
        },
        {
          id: 'fela_damages_personal_injury_intro_2941',
          name: 'Introduction to Damages for Personal Injury',
          description: 'Introduction to personal injury damages under FELA',
          caciSeries: 'CACI 2941',
          elements: ['Personal injury', 'Damages', 'Compensation']
        },
        {
          id: 'fela_damages_death_employee_2942',
          name: 'Damages for Death of Employee',
          description: 'Damages for death of employee under FELA',
          caciSeries: 'CACI 2942',
          elements: ['Death', 'Survivors', 'Damages', 'Loss of support']
        }
      ]
    },
    {
      id: 'series_3000',
      seriesNumber: 3000,
      title: 'CIVIL RIGHTS',
      causes: [
        {
          id: 'violation_federal_civil_rights_3000',
          name: 'Violation of Federal Civil Rights—In General—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Violation of federal civil rights under § 1983',
          caciSeries: 'CACI 3000',
          elements: ['State action', 'Constitutional violation', 'Causation', 'Damages']
        },
        {
          id: 'local_government_liability_policy_custom_3001',
          name: 'Local Government Liability—Policy or Custom—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Local government liability for policy or custom',
          caciSeries: 'CACI 3001',
          elements: ['Local government', 'Policy or custom', 'Constitutional violation', 'Causation', 'Damages']
        },
        {
          id: 'official_policy_custom_explained_3002',
          name: '"Official Policy or Custom" Explained (42 U.S.C. § 1983)',
          description: 'Definition of official policy or custom',
          caciSeries: 'CACI 3002',
          elements: ['Official policy', 'Custom', 'Deliberate indifference']
        },
        {
          id: 'local_government_liability_failure_train_3003',
          name: 'Local Government Liability—Failure to Train—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Local government liability for failure to train',
          caciSeries: 'CACI 3003',
          elements: ['Failure to train', 'Deliberate indifference', 'Constitutional violation', 'Causation', 'Damages']
        },
        {
          id: 'local_government_liability_ratification_3004',
          name: 'Local Government Liability—Act or Ratification by Official With Final Policymaking Authority—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Local government liability for ratification by policymaker',
          caciSeries: 'CACI 3004',
          elements: ['Final policymaker', 'Ratification', 'Constitutional violation', 'Causation', 'Damages']
        },
        {
          id: 'supervisor_liability_subordinates_3005',
          name: 'Supervisor Liability for Acts of Subordinates (42 U.S.C. § 1983)',
          description: 'Supervisor liability for subordinate actions',
          caciSeries: 'CACI 3005',
          elements: ['Supervisor', 'Subordinate violation', 'Supervisory liability', 'Causation', 'Damages']
        },
        {
          id: 'excessive_force_unreasonable_arrest_3020',
          name: 'Excessive Use of Force—Unreasonable Arrest or Other Seizure—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Excessive force in arrest or seizure',
          caciSeries: 'CACI 3020',
          elements: ['Arrest or seizure', 'Excessive force', 'Unreasonable', 'Injury', 'Damages']
        },
        {
          id: 'unlawful_arrest_no_warrant_3021',
          name: 'Unlawful Arrest by Peace Officer Without a Warrant—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Unlawful arrest without warrant',
          caciSeries: 'CACI 3021',
          elements: ['Arrest', 'No warrant', 'No probable cause', 'Damages']
        },
        {
          id: 'unreasonable_search_with_warrant_3022',
          name: 'Unreasonable Search—Search With a Warrant—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Unreasonable search with warrant',
          caciSeries: 'CACI 3022',
          elements: ['Search', 'Warrant', 'Unreasonable execution', 'Damages']
        },
        {
          id: 'unreasonable_search_seizure_no_warrant_3023',
          name: 'Unreasonable Search or Seizure—Search or Seizure Without a Warrant—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Unreasonable search or seizure without warrant',
          caciSeries: 'CACI 3023',
          elements: ['Search or seizure', 'No warrant', 'No exception', 'Unreasonable', 'Damages']
        },
        {
          id: 'affirmative_defense_search_incident_arrest_3024',
          name: 'Affirmative Defense—Search Incident to Lawful Arrest',
          description: 'Defense for search incident to lawful arrest',
          caciSeries: 'CACI 3024',
          elements: ['Lawful arrest', 'Search incident', 'Defense applies']
        },
        {
          id: 'affirmative_defense_consent_search_3025',
          name: 'Affirmative Defense—Consent to Search',
          description: 'Defense for consent to search',
          caciSeries: 'CACI 3025',
          elements: ['Voluntary consent', 'Search', 'Defense applies']
        },
        {
          id: 'affirmative_defense_exigent_circumstances_3026',
          name: 'Affirmative Defense—Exigent Circumstances',
          description: 'Defense for exigent circumstances',
          caciSeries: 'CACI 3026',
          elements: ['Exigent circumstances', 'Emergency', 'Defense applies']
        },
        {
          id: 'affirmative_defense_emergency_3027',
          name: 'Affirmative Defense—Emergency',
          description: 'Defense for emergency search',
          caciSeries: 'CACI 3027',
          elements: ['Emergency', 'Immediate danger', 'Defense applies']
        },
        {
          id: 'prisoner_civil_rights_substantial_risk_3040',
          name: 'Violation of Prisoner\'s Federal Civil Rights—Eighth Amendment—Substantial Risk of Serious Harm (42 U.S.C. § 1983)',
          description: 'Eighth Amendment violation—substantial risk of serious harm',
          caciSeries: 'CACI 3040',
          elements: ['Prisoner', 'Substantial risk', 'Serious harm', 'Deliberate indifference', 'Damages']
        },
        {
          id: 'prisoner_civil_rights_medical_care_3041',
          name: 'Violation of Prisoner\'s Federal Civil Rights—Eighth Amendment—Medical Care (42 U.S.C. § 1983)',
          description: 'Eighth Amendment violation—medical care',
          caciSeries: 'CACI 3041',
          elements: ['Prisoner', 'Serious medical need', 'Deliberate indifference', 'Injury', 'Damages']
        },
        {
          id: 'prisoner_civil_rights_excessive_force_3042',
          name: 'Violation of Prisoner\'s Federal Civil Rights—Eighth Amendment—Excessive Force (42 U.S.C. § 1983)',
          description: 'Eighth Amendment violation—excessive force',
          caciSeries: 'CACI 3042',
          elements: ['Prisoner', 'Excessive force', 'Unnecessary', 'Injury', 'Damages']
        },
        {
          id: 'prisoner_civil_rights_deprivation_necessities_3043',
          name: 'Violation of Prisoner\'s Federal Civil Rights—Eighth Amendment—Deprivation of Necessities (42 U.S.C. § 1983)',
          description: 'Eighth Amendment violation—deprivation of necessities',
          caciSeries: 'CACI 3043',
          elements: ['Prisoner', 'Deprivation', 'Basic necessities', 'Deliberate indifference', 'Damages']
        },
        {
          id: 'pretrial_detainee_civil_rights_3046',
          name: 'Violation of Pretrial Detainee\'s Federal Civil Rights—Fourteenth Amendment—Medical Care and Conditions of Confinement (42 U.S.C. § 1983)',
          description: 'Fourteenth Amendment violation—pretrial detainee medical care and conditions',
          caciSeries: 'CACI 3046',
          elements: ['Pretrial detainee', 'Medical care or conditions', 'Punishment', 'Damages']
        },
        {
          id: 'retaliation_essential_3050',
          name: 'Retaliation—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Retaliation for exercising constitutional rights',
          caciSeries: 'CACI 3050',
          elements: ['Protected activity', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'unlawful_removal_child_custody_3051',
          name: 'Unlawful Removal of Child From Parental Custody Without a Warrant—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Unlawful removal of child from parental custody',
          caciSeries: 'CACI 3051',
          elements: ['Child removal', 'No warrant', 'No emergency', 'Damages']
        },
        {
          id: 'use_fabricated_evidence_3052',
          name: 'Use of Fabricated Evidence—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Use of fabricated evidence',
          caciSeries: 'CACI 3052',
          elements: ['Fabricated evidence', 'Use in prosecution', 'Injury', 'Damages']
        },
        {
          id: 'retaliation_free_speech_public_employee_3053',
          name: 'Retaliation for Exercise of Free Speech Rights—Public Employee—Essential Factual Elements (42 U.S.C. § 1983)',
          description: 'Retaliation against public employee for free speech',
          caciSeries: 'CACI 3053',
          elements: ['Public employee', 'Free speech', 'Adverse action', 'Causal connection', 'Damages']
        },
        {
          id: 'rebuttal_retaliatory_motive_3055',
          name: 'Rebuttal of Retaliatory Motive',
          description: 'Rebuttal of retaliatory motive defense',
          caciSeries: 'CACI 3055',
          elements: ['Legitimate reason', 'Pretext', 'Retaliatory motive']
        },
        {
          id: 'unruh_civil_rights_act_3060',
          name: 'Unruh Civil Rights Act—Essential Factual Elements (Civ. Code, §§ 51, 52)',
          description: 'Violation of Unruh Civil Rights Act',
          caciSeries: 'CACI 3060',
          elements: ['Business establishment', 'Discrimination', 'Protected characteristic', 'Damages']
        },
        {
          id: 'discrimination_business_dealings_3061',
          name: 'Discrimination in Business Dealings—Essential Factual Elements (Civ. Code, § 51.5)',
          description: 'Discrimination in business dealings',
          caciSeries: 'CACI 3061',
          elements: ['Business dealings', 'Discrimination', 'Protected characteristic', 'Damages']
        },
        {
          id: 'gender_price_discrimination_3062',
          name: 'Gender Price Discrimination—Essential Factual Elements (Civ. Code, § 51.6)',
          description: 'Gender-based price discrimination',
          caciSeries: 'CACI 3062',
          elements: ['Gender', 'Price discrimination', 'Same services', 'Damages']
        },
        {
          id: 'ralph_act_violence_3063',
          name: 'Acts of Violence—Ralph Act—Essential Factual Elements (Civ. Code, § 51.7)',
          description: 'Acts of violence under Ralph Act',
          caciSeries: 'CACI 3063',
          elements: ['Violence', 'Protected characteristic', 'Injury', 'Damages']
        },
        {
          id: 'ralph_act_threats_3064',
          name: 'Threats of Violence—Ralph Act—Essential Factual Elements (Civ. Code, § 51.7)',
          description: 'Threats of violence under Ralph Act',
          caciSeries: 'CACI 3064',
          elements: ['Threats of violence', 'Protected characteristic', 'Damages']
        },
        {
          id: 'sexual_harassment_defined_relationship_3065',
          name: 'Sexual Harassment in Defined Relationship—Essential Factual Elements (Civ. Code, § 51.9)',
          description: 'Sexual harassment in defined relationship',
          caciSeries: 'CACI 3065',
          elements: ['Defined relationship', 'Sexual harassment', 'Unwelcome conduct', 'Damages']
        },
        {
          id: 'bane_act_3066',
          name: 'Bane Act—Essential Factual Elements (Civ. Code, § 52.1)',
          description: 'Violation of Bane Act',
          caciSeries: 'CACI 3066',
          elements: ['Constitutional right', 'Interference', 'Threat or intimidation', 'Damages']
        },
        {
          id: 'unruh_act_damages_3067',
          name: 'Unruh Civil Rights Act—Damages (Civ. Code, §§ 51, 52(a))',
          description: 'Damages under Unruh Act',
          caciSeries: 'CACI 3067',
          elements: ['Violation', 'Actual damages', 'Statutory damages', 'Attorney fees']
        },
        {
          id: 'ralph_act_damages_penalty_3068',
          name: 'Ralph Act—Damages and Penalty (Civ. Code, §§ 51.7, 52(b))',
          description: 'Damages and penalty under Ralph Act',
          caciSeries: 'CACI 3068',
          elements: ['Violation', 'Actual damages', 'Statutory penalty', 'Attorney fees']
        },
        {
          id: 'harassment_educational_institution_3069',
          name: 'Harassment in Educational Institution (Ed. Code, § 220)',
          description: 'Harassment in educational institution',
          caciSeries: 'CACI 3069',
          elements: ['Educational institution', 'Harassment', 'Protected characteristic', 'Damages']
        },
        {
          id: 'disability_discrimination_access_barriers_3070',
          name: 'Disability Discrimination—Access Barriers to Public Facility—Construction-Related Accessibility Standards Act—Essential Factual Elements (Civ. Code, §§ 54.3, 55.56)',
          description: 'Disability discrimination—access barriers',
          caciSeries: 'CACI 3070',
          elements: ['Public facility', 'Access barriers', 'Disability', 'Damages']
        },
        {
          id: 'retaliation_refusing_disclosure_medical_3071',
          name: 'Retaliation for Refusing to Authorize Disclosure of Medical Information—Essential Factual Elements (Civ. Code, § 56.20(b))',
          description: 'Retaliation for refusing medical information disclosure',
          caciSeries: 'CACI 3071',
          elements: ['Refusal to authorize', 'Medical information', 'Retaliation', 'Damages']
        }
      ]
    },
    {
      id: 'series_3100',
      seriesNumber: 3100,
      title: 'ELDER ABUSE AND DEPENDENT ADULT CIVIL PROTECTION ACT',
      causes: [
        {
          id: 'financial_abuse_essential_3100',
          name: 'Financial Abuse—Essential Factual Elements (Welf. & Inst. Code, § 15610.30)',
          description: 'Financial abuse of elder or dependent adult',
          caciSeries: 'CACI 3100',
          elements: ['Elder or dependent adult', 'Financial abuse', 'Taking or secret use', 'Damages']
        },
        {
          id: 'financial_abuse_decedent_pain_suffering_3101',
          name: 'Financial Abuse—Decedent\'s Pain and Suffering (Welf. & Inst. Code, § 15657.5)',
          description: 'Financial abuse—decedent\'s pain and suffering',
          caciSeries: 'CACI 3101',
          elements: ['Financial abuse', 'Decedent', 'Pain and suffering', 'Damages']
        },
        {
          id: 'employer_liability_enhanced_remedies_both_3102a',
          name: 'Employer Liability for Enhanced Remedies—Both Individual and Employer Defendants (Welf. & Inst. Code, §§ 15657, 15657.05; Civ. Code, § 3294(b))',
          description: 'Employer liability for enhanced remedies—both defendants',
          caciSeries: 'CACI 3102A',
          elements: ['Employer', 'Employee abuse', 'Ratification or advance knowledge', 'Enhanced remedies']
        },
        {
          id: 'employer_liability_enhanced_remedies_employer_only_3102b',
          name: 'Employer Liability for Enhanced Remedies—Employer Defendant Only (Welf. & Inst. Code, §§ 15657, 15657.05; Civ. Code, § 3294(b))',
          description: 'Employer liability for enhanced remedies—employer only',
          caciSeries: 'CACI 3102B',
          elements: ['Employer', 'Employee abuse', 'Ratification or advance knowledge', 'Enhanced remedies']
        },
        {
          id: 'neglect_essential_3103',
          name: 'Neglect—Essential Factual Elements (Welf. & Inst. Code, § 15610.57)',
          description: 'Neglect of elder or dependent adult',
          caciSeries: 'CACI 3103',
          elements: ['Elder or dependent adult', 'Neglect', 'Failure to provide care', 'Damages']
        },
        {
          id: 'neglect_enhanced_remedies_3104',
          name: 'Neglect—Enhanced Remedies Sought (Welf. & Inst. Code, § 15657)',
          description: 'Neglect with enhanced remedies',
          caciSeries: 'CACI 3104',
          elements: ['Neglect', 'Recklessness, oppression, fraud, or malice', 'Enhanced remedies', 'Damages']
        },
        {
          id: 'physical_abuse_essential_3106',
          name: 'Physical Abuse—Essential Factual Elements (Welf. & Inst. Code, § 15610.63)',
          description: 'Physical abuse of elder or dependent adult',
          caciSeries: 'CACI 3106',
          elements: ['Elder or dependent adult', 'Physical abuse', 'Bodily harm', 'Damages']
        },
        {
          id: 'physical_abuse_enhanced_remedies_3107',
          name: 'Physical Abuse—Enhanced Remedies Sought (Welf. & Inst. Code, § 15657)',
          description: 'Physical abuse with enhanced remedies',
          caciSeries: 'CACI 3107',
          elements: ['Physical abuse', 'Recklessness, oppression, fraud, or malice', 'Enhanced remedies', 'Damages']
        },
        {
          id: 'abduction_essential_3109',
          name: 'Abduction—Essential Factual Elements (Welf. & Inst. Code, § 15610.06)',
          description: 'Abduction of elder or dependent adult',
          caciSeries: 'CACI 3109',
          elements: ['Elder or dependent adult', 'Abduction', 'Removal from place', 'Damages']
        },
        {
          id: 'abduction_enhanced_remedies_3110',
          name: 'Abduction—Enhanced Remedies Sought (Welf. & Inst. Code, § 15657.05)',
          description: 'Abduction with enhanced remedies',
          caciSeries: 'CACI 3110',
          elements: ['Abduction', 'Recklessness, oppression, fraud, or malice', 'Enhanced remedies', 'Damages']
        },
        {
          id: 'dependent_adult_explained_3112',
          name: '"Dependent Adult" Explained (Welf. & Inst. Code, § 15610.23)',
          description: 'Definition of dependent adult',
          caciSeries: 'CACI 3112',
          elements: ['Dependent adult', 'Physical or mental limitations', 'Inability to protect rights']
        },
        {
          id: 'recklessness_explained_3113',
          name: '"Recklessness" Explained',
          description: 'Definition of recklessness',
          caciSeries: 'CACI 3113',
          elements: ['Recklessness', 'Conscious disregard', 'High probability of harm']
        },
        {
          id: 'malice_explained_3114',
          name: '"Malice" Explained',
          description: 'Definition of malice',
          caciSeries: 'CACI 3114',
          elements: ['Malice', 'Desire to cause injury', 'Willful and conscious disregard']
        },
        {
          id: 'oppression_explained_3115',
          name: '"Oppression" Explained',
          description: 'Definition of oppression',
          caciSeries: 'CACI 3115',
          elements: ['Oppression', 'Despicable conduct', 'Subjecting to cruel hardship']
        },
        {
          id: 'fraud_explained_3116',
          name: '"Fraud" Explained',
          description: 'Definition of fraud',
          caciSeries: 'CACI 3116',
          elements: ['Fraud', 'Intentional misrepresentation', 'Concealment', 'Deceit']
        },
        {
          id: 'financial_abuse_undue_influence_explained_3117',
          name: 'Financial Abuse—"Undue Influence" Explained',
          description: 'Definition of undue influence in financial abuse',
          caciSeries: 'CACI 3117',
          elements: ['Undue influence', 'Excessive persuasion', 'Overcoming free will', 'Unfair advantage']
        }
      ]
    },
    {
      id: 'series_3200',
      seriesNumber: 3200,
      title: 'SONG-BEVERLY CONSUMER WARRANTY ACT',
      causes: [
        {
          id: 'failure_repurchase_replace_consumer_good_3200',
          name: 'Failure to Repurchase or Replace Consumer Good After Reasonable Number of Repair Opportunities—Essential Factual Elements (Civ. Code, § 1793.2(d))',
          description: 'Failure to repurchase or replace consumer good',
          caciSeries: 'CACI 3200',
          elements: ['Consumer good', 'Reasonable repair opportunities', 'Failure to repair', 'Repurchase or replace', 'Damages']
        },
        {
          id: 'failure_repurchase_replace_motor_vehicle_3201',
          name: 'Failure to Promptly Repurchase or Replace New Motor Vehicle After Reasonable Number of Repair Opportunities—Essential Factual Elements (Civ. Code, § 1793.2(d))',
          description: 'Failure to repurchase or replace new motor vehicle',
          caciSeries: 'CACI 3201',
          elements: ['New motor vehicle', 'Reasonable repair opportunities', 'Failure to repair', 'Repurchase or replace', 'Damages']
        },
        {
          id: 'repair_opportunities_explained_3202',
          name: '"Repair Opportunities" Explained',
          description: 'Definition of repair opportunities',
          caciSeries: 'CACI 3202',
          elements: ['Repair opportunities', 'Attempts to repair', 'Same nonconformity']
        },
        {
          id: 'reasonable_repair_opportunities_rebuttable_presumption_3203',
          name: 'Reasonable Number of Repair Opportunities—Rebuttable Presumption (Civ. Code, § 1793.22(b))',
          description: 'Rebuttable presumption for reasonable repair opportunities',
          caciSeries: 'CACI 3203',
          elements: ['Repair attempts', 'Rebuttable presumption', 'Reasonable number']
        },
        {
          id: 'substantially_impaired_explained_3204',
          name: '"Substantially Impaired" Explained',
          description: 'Definition of substantially impaired',
          caciSeries: 'CACI 3204',
          elements: ['Substantially impaired', 'Use or value', 'Safety or reliability']
        },
        {
          id: 'failure_begin_complete_repairs_3205',
          name: 'Failure to Begin Repairs Within Reasonable Time or to Complete Repairs Within 30 Days—Essential Factual Elements (Civ. Code, § 1793.2(b))',
          description: 'Failure to begin or complete repairs timely',
          caciSeries: 'CACI 3205',
          elements: ['Repair request', 'Failure to begin timely', 'Failure to complete within 30 days', 'Damages']
        },
        {
          id: 'breach_disclosure_obligations_3206',
          name: 'Breach of Disclosure Obligations—Essential Factual Elements',
          description: 'Breach of disclosure obligations',
          caciSeries: 'CACI 3206',
          elements: ['Disclosure obligation', 'Failure to disclose', 'Material information', 'Damages']
        },
        {
          id: 'breach_implied_warranty_merchantability_3210',
          name: 'Breach of Implied Warranty of Merchantability—Essential Factual Elements',
          description: 'Breach of implied warranty of merchantability',
          caciSeries: 'CACI 3210',
          elements: ['Merchant', 'Consumer good', 'Not merchantable', 'Damages']
        },
        {
          id: 'breach_implied_warranty_fitness_particular_purpose_3211',
          name: 'Breach of Implied Warranty of Fitness for a Particular Purpose—Essential Factual Elements',
          description: 'Breach of implied warranty of fitness for particular purpose',
          caciSeries: 'CACI 3211',
          elements: ['Seller', 'Particular purpose', 'Reliance', 'Not fit', 'Damages']
        },
        {
          id: 'duration_implied_warranty_3212',
          name: 'Duration of Implied Warranty',
          description: 'Duration of implied warranty',
          caciSeries: 'CACI 3212',
          elements: ['Implied warranty', 'Duration', 'Reasonable time']
        },
        {
          id: 'affirmative_defense_unauthorized_unreasonable_use_3220',
          name: 'Affirmative Defense—Unauthorized or Unreasonable Use',
          description: 'Defense for unauthorized or unreasonable use',
          caciSeries: 'CACI 3220',
          elements: ['Unauthorized use', 'Unreasonable use', 'Defense applies']
        },
        {
          id: 'affirmative_defense_disclaimer_implied_warranties_3221',
          name: 'Affirmative Defense—Disclaimer of Implied Warranties',
          description: 'Defense for disclaimer of implied warranties',
          caciSeries: 'CACI 3221',
          elements: ['Disclaimer', 'Implied warranties', 'Defense applies']
        },
        {
          id: 'affirmative_defense_statute_limitations_3222',
          name: 'Affirmative Defense—Statute of Limitations (Cal. U. Com. Code, § 2725)',
          description: 'Defense for statute of limitations',
          caciSeries: 'CACI 3222',
          elements: ['Statute of limitations', 'Filing deadline', 'Defense applies']
        },
        {
          id: 'continued_reasonable_use_permitted_3230',
          name: 'Continued Reasonable Use Permitted',
          description: 'Continued reasonable use permitted',
          caciSeries: 'CACI 3230',
          elements: ['Reasonable use', 'During repair', 'Permitted']
        },
        {
          id: 'continuation_express_implied_warranty_during_repairs_3231',
          name: 'Continuation of Express or Implied Warranty During Repairs (Civ. Code, § 1795.6)',
          description: 'Continuation of warranty during repairs',
          caciSeries: 'CACI 3231',
          elements: ['Warranty', 'During repairs', 'Extended period']
        },
        {
          id: 'reimbursement_damages_consumer_goods_3240',
          name: 'Reimbursement Damages—Consumer Goods (Civ. Code, §§ 1793.2(d)(1), 1794(b))',
          description: 'Reimbursement damages for consumer goods',
          caciSeries: 'CACI 3240',
          elements: ['Consumer good', 'Reimbursement', 'Purchase price', 'Damages']
        },
        {
          id: 'restitution_manufacturer_motor_vehicle_3241',
          name: 'Restitution From Manufacturer—New Motor Vehicle (Civ. Code, §§ 1793.2(d)(2), 1794(b))',
          description: 'Restitution from manufacturer for new motor vehicle',
          caciSeries: 'CACI 3241',
          elements: ['New motor vehicle', 'Restitution', 'Manufacturer', 'Damages']
        },
        {
          id: 'incidental_damages_3242',
          name: 'Incidental Damages',
          description: 'Incidental damages',
          caciSeries: 'CACI 3242',
          elements: ['Incidental damages', 'Reasonable expenses', 'Damages']
        },
        {
          id: 'consequential_damages_3243',
          name: 'Consequential Damages',
          description: 'Consequential damages',
          caciSeries: 'CACI 3243',
          elements: ['Consequential damages', 'Foreseeable', 'Damages']
        },
        {
          id: 'civil_penalty_willful_violation_3244',
          name: 'Civil Penalty—Willful Violation (Civ. Code, § 1794(c))',
          description: 'Civil penalty for willful violation',
          caciSeries: 'CACI 3244',
          elements: ['Willful violation', 'Civil penalty', 'Two times actual damages']
        }
      ]
    },
    {
      id: 'series_3300',
      seriesNumber: 3300,
      title: 'UNFAIR PRACTICES ACT',
      causes: [
        {
          id: 'locality_discrimination_3300',
          name: 'Locality Discrimination—Essential Factual Elements',
          description: 'Locality discrimination under Unfair Practices Act',
          caciSeries: 'CACI 3300',
          elements: ['Different prices', 'Different localities', 'Injury to competition', 'Damages']
        },
        {
          id: 'below_cost_sales_3301',
          name: 'Below Cost Sales—Essential Factual Elements',
          description: 'Below cost sales under Unfair Practices Act',
          caciSeries: 'CACI 3301',
          elements: ['Sale below cost', 'Injury to competition', 'Damages']
        },
        {
          id: 'loss_leader_sales_3302',
          name: 'Loss Leader Sales—Essential Factual Elements',
          description: 'Loss leader sales under Unfair Practices Act',
          caciSeries: 'CACI 3302',
          elements: ['Loss leader sale', 'Below cost', 'Injury to competition', 'Damages']
        },
        {
          id: 'definition_cost_3303',
          name: 'Definition of "Cost"',
          description: 'Definition of cost under Unfair Practices Act',
          caciSeries: 'CACI 3303',
          elements: ['Cost', 'Invoice cost', 'Replacement cost', 'Lowest cost']
        },
        {
          id: 'presumptions_costs_manufacturer_3304',
          name: 'Presumptions Concerning Costs—Manufacturer',
          description: 'Presumptions concerning costs for manufacturer',
          caciSeries: 'CACI 3304',
          elements: ['Manufacturer', 'Cost presumptions', 'Invoice cost']
        },
        {
          id: 'presumptions_costs_distributor_3305',
          name: 'Presumptions Concerning Costs—Distributor',
          description: 'Presumptions concerning costs for distributor',
          caciSeries: 'CACI 3305',
          elements: ['Distributor', 'Cost presumptions', 'Invoice cost']
        },
        {
          id: 'methods_allocating_costs_3306',
          name: 'Methods of Allocating Costs to an Individual Product',
          description: 'Methods of allocating costs to individual product',
          caciSeries: 'CACI 3306',
          elements: ['Cost allocation', 'Individual product', 'Reasonable method']
        },
        {
          id: 'secret_rebates_3320',
          name: 'Secret Rebates—Essential Factual Elements',
          description: 'Secret rebates under Unfair Practices Act',
          caciSeries: 'CACI 3320',
          elements: ['Secret rebate', 'Discrimination', 'Injury to competition', 'Damages']
        },
        {
          id: 'secret_rebates_definition_secret_3321',
          name: 'Secret Rebates—Definition of "Secret"',
          description: 'Definition of secret in secret rebates',
          caciSeries: 'CACI 3321',
          elements: ['Secret', 'Not disclosed', 'Selective disclosure']
        },
        {
          id: 'affirmative_defense_locality_discrimination_cost_justification_3330',
          name: 'Affirmative Defense to Locality Discrimination Claim—Cost Justification',
          description: 'Defense for cost justification in locality discrimination',
          caciSeries: 'CACI 3330',
          elements: ['Cost justification', 'Different costs', 'Defense applies']
        },
        {
          id: 'affirmative_defense_closed_out_discontinued_damaged_perishable_3331',
          name: 'Affirmative Defense to Locality Discrimination, Below Cost Sales, and Loss Leader Sales Claims—Closed-out, Discontinued, Damaged, or Perishable Items',
          description: 'Defense for closed-out, discontinued, damaged, or perishable items',
          caciSeries: 'CACI 3331',
          elements: ['Closed-out items', 'Discontinued items', 'Damaged items', 'Perishable items', 'Defense applies']
        },
        {
          id: 'affirmative_defense_functional_classifications_3332',
          name: 'Affirmative Defense to Locality Discrimination, Below Cost Sales, Loss Leader Sales, and Secret Rebates—Functional Classifications',
          description: 'Defense for functional classifications',
          caciSeries: 'CACI 3332',
          elements: ['Functional classifications', 'Different treatment', 'Defense applies']
        },
        {
          id: 'affirmative_defense_meeting_competition_3333',
          name: 'Affirmative Defense to Locality Discrimination, Below Cost Sales, and Loss Leader Sales Claims—Meeting Competition',
          description: 'Defense for meeting competition',
          caciSeries: 'CACI 3333',
          elements: ['Meeting competition', 'Good faith', 'Defense applies']
        },
        {
          id: 'affirmative_defense_manufacturer_meeting_downstream_competition_3334',
          name: 'Affirmative Defense to Locality Discrimination Claim—Manufacturer Meeting Downstream Competition',
          description: 'Defense for manufacturer meeting downstream competition',
          caciSeries: 'CACI 3334',
          elements: ['Manufacturer', 'Downstream competition', 'Good faith', 'Defense applies']
        },
        {
          id: 'affirmative_defense_good_faith_explained_3335',
          name: 'Affirmative Defense—"Good Faith" Explained',
          description: 'Definition of good faith',
          caciSeries: 'CACI 3335',
          elements: ['Good faith', 'Honest belief', 'Reasonable grounds']
        }
      ]
    },
    {
      id: 'series_3400',
      seriesNumber: 3400,
      title: 'CARTWRIGHT ACT',
      causes: [
        {
          id: 'horizontal_vertical_restraints_price_fixing_3400',
          name: 'Horizontal and Vertical Restraints (Use for Direct Competitors)—Price Fixing—Essential Factual Elements',
          description: 'Price fixing under Cartwright Act',
          caciSeries: 'CACI 3400',
          elements: ['Agreement', 'Price fixing', 'Unreasonable restraint', 'Injury to competition', 'Damages']
        },
        {
          id: 'horizontal_restraints_allocation_trade_3401',
          name: 'Horizontal Restraints (Use for Direct Competitors)—Allocation of Trade or Commerce—Essential Factual Elements',
          description: 'Allocation of trade or commerce under Cartwright Act',
          caciSeries: 'CACI 3401',
          elements: ['Agreement', 'Allocation of trade', 'Unreasonable restraint', 'Injury to competition', 'Damages']
        },
        {
          id: 'horizontal_restraints_dual_distributor_3402',
          name: 'Horizontal Restraints—Dual Distributor Restraints—Essential Factual Elements',
          description: 'Dual distributor restraints under Cartwright Act',
          caciSeries: 'CACI 3402',
          elements: ['Dual distributor', 'Restraint', 'Unreasonable', 'Injury to competition', 'Damages']
        },
        {
          id: 'horizontal_restraints_group_boycott_per_se_3403',
          name: 'Horizontal Restraints (Use for Direct Competitors)—Group Boycott—Per Se Violation—Essential Factual Elements',
          description: 'Group boycott per se violation under Cartwright Act',
          caciSeries: 'CACI 3403',
          elements: ['Group boycott', 'Per se violation', 'Unreasonable restraint', 'Injury to competition', 'Damages']
        },
        {
          id: 'horizontal_restraints_group_boycott_rule_reason_3404',
          name: 'Horizontal Restraints—Group Boycott—Rule of Reason—Essential Factual Elements',
          description: 'Group boycott rule of reason under Cartwright Act',
          caciSeries: 'CACI 3404',
          elements: ['Group boycott', 'Rule of reason', 'Unreasonable restraint', 'Injury to competition', 'Damages']
        },
        {
          id: 'horizontal_vertical_restraints_other_unreasonable_3405',
          name: 'Horizontal and Vertical Restraints (Use for Direct Competitors or Supplier/Reseller Relations)—Other Unreasonable Restraint of Trade—Rule of Reason—Essential Factual Elements',
          description: 'Other unreasonable restraint of trade under Cartwright Act',
          caciSeries: 'CACI 3405',
          elements: ['Restraint of trade', 'Rule of reason', 'Unreasonable', 'Injury to competition', 'Damages']
        },
        {
          id: 'horizontal_vertical_restraints_agreement_explained_3406',
          name: 'Horizontal and Vertical Restraints—"Agreement" Explained',
          description: 'Definition of agreement under Cartwright Act',
          caciSeries: 'CACI 3406',
          elements: ['Agreement', 'Conspiracy', 'Understanding', 'Common plan']
        },
        {
          id: 'horizontal_vertical_restraints_agreement_company_employee_3407',
          name: 'Horizontal and Vertical Restraints—Agreement Between Company and Its Employee',
          description: 'Agreement between company and employee',
          caciSeries: 'CACI 3407',
          elements: ['Company', 'Employee', 'No agreement', 'Single entity']
        },
        {
          id: 'vertical_restraints_coercion_explained_3408',
          name: 'Vertical Restraints—"Coercion" Explained',
          description: 'Definition of coercion in vertical restraints',
          caciSeries: 'CACI 3408',
          elements: ['Coercion', 'Threat', 'Pressure', 'Forced agreement']
        },
        {
          id: 'vertical_restraints_termination_reseller_3409',
          name: 'Vertical Restraints—Termination of Reseller',
          description: 'Termination of reseller under Cartwright Act',
          caciSeries: 'CACI 3409',
          elements: ['Termination', 'Reseller', 'Unreasonable restraint', 'Injury to competition', 'Damages']
        },
        {
          id: 'vertical_restraints_agreement_seller_reseller_competitor_3410',
          name: 'Vertical Restraints—Agreement Between Seller and Reseller\'s Competitor',
          description: 'Agreement between seller and reseller\'s competitor',
          caciSeries: 'CACI 3410',
          elements: ['Seller', 'Reseller\'s competitor', 'Agreement', 'Unreasonable restraint', 'Damages']
        },
        {
          id: 'rule_reason_anticompetitive_beneficial_effects_3411',
          name: 'Rule of Reason—Anticompetitive Versus Beneficial Effects',
          description: 'Rule of reason—anticompetitive vs beneficial effects',
          caciSeries: 'CACI 3411',
          elements: ['Anticompetitive effects', 'Beneficial effects', 'Balancing', 'Unreasonable restraint']
        },
        {
          id: 'rule_reason_market_power_explained_3412',
          name: 'Rule of Reason—"Market Power" Explained',
          description: 'Definition of market power',
          caciSeries: 'CACI 3412',
          elements: ['Market power', 'Control prices', 'Exclude competition']
        },
        {
          id: 'rule_reason_product_market_explained_3413',
          name: 'Rule of Reason—"Product Market" Explained',
          description: 'Definition of product market',
          caciSeries: 'CACI 3413',
          elements: ['Product market', 'Reasonable interchangeability', 'Cross-elasticity']
        },
        {
          id: 'rule_reason_geographic_market_explained_3414',
          name: 'Rule of Reason—"Geographic Market" Explained',
          description: 'Definition of geographic market',
          caciSeries: 'CACI 3414',
          elements: ['Geographic market', 'Area of competition', 'Reasonable interchangeability']
        },
        {
          id: 'tying_real_estate_products_services_3420',
          name: 'Tying—Real Estate, Products, or Services—Essential Factual Elements (Bus. & Prof. Code, § 16720)',
          description: 'Tying arrangement for real estate, products, or services',
          caciSeries: 'CACI 3420',
          elements: ['Tying arrangement', 'Separate products', 'Economic power', 'Injury to competition', 'Damages']
        },
        {
          id: 'tying_products_services_3421',
          name: 'Tying—Products or Services—Essential Factual Elements (Bus. & Prof. Code, § 16727)',
          description: 'Tying arrangement for products or services',
          caciSeries: 'CACI 3421',
          elements: ['Tying arrangement', 'Separate products', 'Economic power', 'Injury to competition', 'Damages']
        },
        {
          id: 'tying_separate_products_explained_3422',
          name: 'Tying—"Separate Products" Explained',
          description: 'Definition of separate products in tying',
          caciSeries: 'CACI 3422',
          elements: ['Separate products', 'Distinct demand', 'Separate markets']
        },
        {
          id: 'tying_economic_power_explained_3423',
          name: 'Tying—"Economic Power" Explained',
          description: 'Definition of economic power in tying',
          caciSeries: 'CACI 3423',
          elements: ['Economic power', 'Market power', 'Coercion']
        },
        {
          id: 'noerr_pennington_doctrine_3430',
          name: '"Noerr-Pennington" Doctrine',
          description: 'Noerr-Pennington doctrine defense',
          caciSeries: 'CACI 3430',
          elements: ['Petitioning government', 'Immune from liability', 'Sham exception']
        },
        {
          id: 'affirmative_defense_in_pari_delicto_3431',
          name: 'Affirmative Defense—In Pari Delicto',
          description: 'In pari delicto defense',
          caciSeries: 'CACI 3431',
          elements: ['Equal fault', 'Plaintiff participation', 'Defense applies']
        },
        {
          id: 'damages_3440',
          name: 'Damages',
          description: 'Damages under Cartwright Act',
          caciSeries: 'CACI 3440',
          elements: ['Antitrust injury', 'Overcharge', 'Lost profits', 'Treble damages']
        }
      ]
    },
    {
      id: 'series_3500',
      seriesNumber: 3500,
      title: 'EMINENT DOMAIN',
      causes: [
        {
          id: 'eminent_domain_introductory_3500',
          name: 'Introductory Instruction',
          description: 'Introductory instruction for eminent domain',
          caciSeries: 'CACI 3500',
          elements: ['Eminent domain', 'Just compensation', 'Fair market value']
        },
        {
          id: 'fair_market_value_explained_3501',
          name: '"Fair Market Value" Explained',
          description: 'Definition of fair market value',
          caciSeries: 'CACI 3501',
          elements: ['Fair market value', 'Willing buyer', 'Willing seller', 'Highest price']
        },
        {
          id: 'highest_best_use_explained_3502',
          name: '"Highest and Best Use" Explained',
          description: 'Definition of highest and best use',
          caciSeries: 'CACI 3502',
          elements: ['Highest and best use', 'Most profitable', 'Legally permissible', 'Physically possible']
        },
        {
          id: 'change_zoning_land_use_restriction_3503',
          name: 'Change in Zoning or Land Use Restriction',
          description: 'Change in zoning or land use restriction',
          caciSeries: 'CACI 3503',
          elements: ['Zoning change', 'Land use restriction', 'Value impact']
        },
        {
          id: 'project_enhanced_value_3504',
          name: 'Project Enhanced Value',
          description: 'Project enhanced value',
          caciSeries: 'CACI 3504',
          elements: ['Project enhancement', 'Value increase', 'Excluded from compensation']
        },
        {
          id: 'information_discovered_after_valuation_3505',
          name: 'Information Discovered after Date of Valuation',
          description: 'Information discovered after date of valuation',
          caciSeries: 'CACI 3505',
          elements: ['Post-valuation information', 'Excluded', 'Date of valuation']
        },
        {
          id: 'effect_improvements_3506',
          name: 'Effect of Improvements',
          description: 'Effect of improvements on value',
          caciSeries: 'CACI 3506',
          elements: ['Improvements', 'Value impact', 'Compensation']
        },
        {
          id: 'personal_property_inventory_3507',
          name: 'Personal Property and Inventory',
          description: 'Personal property and inventory compensation',
          caciSeries: 'CACI 3507',
          elements: ['Personal property', 'Inventory', 'Compensation', 'Fair market value']
        },
        {
          id: 'bonus_value_leasehold_interest_3508',
          name: 'Bonus Value of Leasehold Interest',
          description: 'Bonus value of leasehold interest',
          caciSeries: 'CACI 3508',
          elements: ['Leasehold interest', 'Bonus value', 'Compensation']
        },
        {
          id: 'precondemnation_damages_unreasonable_delay_3509a',
          name: 'Precondemnation Damages—Unreasonable Delay (Klopping Damages)',
          description: 'Precondemnation damages for unreasonable delay',
          caciSeries: 'CACI 3509A',
          elements: ['Unreasonable delay', 'Precondemnation damages', 'Klopping damages', 'Compensation']
        },
        {
          id: 'precondemnation_damages_authorized_entry_3509b',
          name: 'Precondemnation Damages—Public Entity\'s Authorized Entry to Investigate Property\'s Suitability (Code Civ. Proc., § 1245.060)',
          description: 'Precondemnation damages for authorized entry',
          caciSeries: 'CACI 3509B',
          elements: ['Authorized entry', 'Investigation', 'Property suitability', 'Damages']
        },
        {
          id: 'value_easement_3510',
          name: 'Value of Easement',
          description: 'Value of easement',
          caciSeries: 'CACI 3510',
          elements: ['Easement', 'Value', 'Compensation']
        },
        {
          id: 'severance_damages_remainder_3511a',
          name: 'Severance Damages to Remainder (Code Civ. Proc., §§ 1263.410, 1263.420(a))',
          description: 'Severance damages to remainder property',
          caciSeries: 'CACI 3511A',
          elements: ['Severance damages', 'Remainder property', 'Diminution in value', 'Compensation']
        },
        {
          id: 'damage_remainder_during_construction_3511b',
          name: 'Damage to Remainder During Construction (Code Civ. Proc., § 1263.420(b))',
          description: 'Damage to remainder during construction',
          caciSeries: 'CACI 3511B',
          elements: ['Construction damage', 'Remainder property', 'Temporary damage', 'Compensation']
        },
        {
          id: 'severance_damages_offset_benefits_3512',
          name: 'Severance Damages—Offset for Benefits',
          description: 'Severance damages offset for benefits',
          caciSeries: 'CACI 3512',
          elements: ['Severance damages', 'Benefits', 'Offset', 'Net damages']
        }
      ]
    },
    {
      id: 'series_3600',
      seriesNumber: 3600,
      title: 'CONSPIRACY',
      causes: [
        {
          id: 'conspiracy_essential_3600',
          name: 'Conspiracy—Essential Factual Elements',
          description: 'Conspiracy essential factual elements',
          caciSeries: 'CACI 3600',
          elements: ['Agreement', 'Unlawful act', 'Overt act', 'Damages']
        },
        {
          id: 'ongoing_conspiracy_3601',
          name: 'Ongoing Conspiracy',
          description: 'Ongoing conspiracy',
          caciSeries: 'CACI 3601',
          elements: ['Ongoing conspiracy', 'Continuous agreement', 'Multiple acts']
        },
        {
          id: 'affirmative_defense_agent_employee_immunity_3602',
          name: 'Affirmative Defense—Agent and Employee Immunity Rule',
          description: 'Defense for agent and employee immunity',
          caciSeries: 'CACI 3602',
          elements: ['Agent or employee', 'Acting within scope', 'No conspiracy', 'Defense applies']
        },
        {
          id: 'aiding_abetting_tort_3610',
          name: 'Aiding and Abetting Tort—Essential Factual Elements',
          description: 'Aiding and abetting tort',
          caciSeries: 'CACI 3610',
          elements: ['Tort committed', 'Knowledge', 'Substantial assistance', 'Causation', 'Damages']
        }
      ]
    },
    {
      id: 'series_3700',
      seriesNumber: 3700,
      title: 'VICARIOUS RESPONSIBILITY',
      causes: [
        {
          id: 'introduction_vicarious_responsibility_3700',
          name: 'Introduction to Vicarious Responsibility',
          description: 'Introduction to vicarious responsibility',
          caciSeries: 'CACI 3700',
          elements: ['Vicarious liability', 'Principal', 'Agent or employee', 'Responsibility']
        },
        {
          id: 'tort_liability_principal_3701',
          name: 'Tort Liability Asserted Against Principal—Essential Factual Elements',
          description: 'Tort liability against principal',
          caciSeries: 'CACI 3701',
          elements: ['Principal', 'Agent or employee', 'Tort committed', 'Scope of employment', 'Liability']
        },
        {
          id: 'affirmative_defense_comparative_fault_plaintiff_agent_3702',
          name: 'Affirmative Defense—Comparative Fault of Plaintiff\'s Agent',
          description: 'Defense for comparative fault of plaintiff\'s agent',
          caciSeries: 'CACI 3702',
          elements: ['Plaintiff\'s agent', 'Comparative fault', 'Defense applies']
        },
        {
          id: 'legal_relationship_not_disputed_3703',
          name: 'Legal Relationship Not Disputed',
          description: 'Legal relationship not disputed',
          caciSeries: 'CACI 3703',
          elements: ['Legal relationship', 'Not disputed', 'Established']
        },
        {
          id: 'existence_employee_status_disputed_3704',
          name: 'Existence of "Employee" Status Disputed',
          description: 'Existence of employee status disputed',
          caciSeries: 'CACI 3704',
          elements: ['Employee status', 'Disputed', 'Control', 'Employment relationship']
        },
        {
          id: 'existence_agency_relationship_disputed_3705',
          name: 'Existence of "Agency" Relationship Disputed',
          description: 'Existence of agency relationship disputed',
          caciSeries: 'CACI 3705',
          elements: ['Agency relationship', 'Disputed', 'Consent', 'Control']
        },
        {
          id: 'special_employment_lending_employer_denies_3706',
          name: 'Special Employment—Lending Employer Denies Responsibility for Worker\'s Acts',
          description: 'Special employment—lending employer denies responsibility',
          caciSeries: 'CACI 3706',
          elements: ['Special employment', 'Lending employer', 'Denies responsibility', 'Control']
        },
        {
          id: 'special_employment_joint_responsibility_3707',
          name: 'Special Employment—Joint Responsibility',
          description: 'Special employment—joint responsibility',
          caciSeries: 'CACI 3707',
          elements: ['Special employment', 'Joint responsibility', 'Both employers liable']
        },
        {
          id: 'peculiar_risk_doctrine_3708',
          name: 'Peculiar-Risk Doctrine',
          description: 'Peculiar-risk doctrine',
          caciSeries: 'CACI 3708',
          elements: ['Peculiar risk', 'Inherent danger', 'Nondelegable duty', 'Liability']
        },
        {
          id: 'ostensible_agent_3709',
          name: 'Ostensible Agent',
          description: 'Ostensible agent',
          caciSeries: 'CACI 3709',
          elements: ['Ostensible agent', 'Apparent authority', 'Reliance', 'Liability']
        },
        {
          id: 'ratification_3710',
          name: 'Ratification',
          description: 'Ratification of agent\'s acts',
          caciSeries: 'CACI 3710',
          elements: ['Ratification', 'Unauthorized act', 'Acceptance', 'Liability']
        },
        {
          id: 'partnerships_3711',
          name: 'Partnerships',
          description: 'Partnership liability',
          caciSeries: 'CACI 3711',
          elements: ['Partnership', 'Partner acts', 'Partnership business', 'Liability']
        },
        {
          id: 'joint_ventures_3712',
          name: 'Joint Ventures',
          description: 'Joint venture liability',
          caciSeries: 'CACI 3712',
          elements: ['Joint venture', 'Venturer acts', 'Venture business', 'Liability']
        },
        {
          id: 'nondelegable_duty_3713',
          name: 'Nondelegable Duty',
          description: 'Nondelegable duty',
          caciSeries: 'CACI 3713',
          elements: ['Nondelegable duty', 'Cannot delegate', 'Liability', 'Independent contractor']
        },
        {
          id: 'ostensible_agency_physician_hospital_3714',
          name: 'Ostensible Agency—Physician-Hospital Relationship—Essential Factual Elements',
          description: 'Ostensible agency—physician-hospital relationship',
          caciSeries: 'CACI 3714',
          elements: ['Physician', 'Hospital', 'Ostensible agency', 'Apparent authority', 'Liability']
        },
        {
          id: 'scope_employment_3720',
          name: 'Scope of Employment',
          description: 'Scope of employment',
          caciSeries: 'CACI 3720',
          elements: ['Scope of employment', 'Authorized acts', 'Course of employment', 'Liability']
        },
        {
          id: 'scope_employment_peace_officer_misuse_authority_3721',
          name: 'Scope of Employment—Peace Officer\'s Misuse of Authority',
          description: 'Scope of employment—peace officer\'s misuse of authority',
          caciSeries: 'CACI 3721',
          elements: ['Peace officer', 'Misuse of authority', 'Scope of employment', 'Liability']
        },
        {
          id: 'scope_employment_unauthorized_acts_3722',
          name: 'Scope of Employment—Unauthorized Acts',
          description: 'Scope of employment—unauthorized acts',
          caciSeries: 'CACI 3722',
          elements: ['Unauthorized acts', 'Scope of employment', 'Incidental to authorized', 'Liability']
        },
        {
          id: 'substantial_deviation_3723',
          name: 'Substantial Deviation',
          description: 'Substantial deviation from scope of employment',
          caciSeries: 'CACI 3723',
          elements: ['Substantial deviation', 'Outside scope', 'No liability']
        },
        {
          id: 'social_recreational_activities_3724',
          name: 'Social or Recreational Activities',
          description: 'Social or recreational activities',
          caciSeries: 'CACI 3724',
          elements: ['Social activities', 'Recreational activities', 'Outside scope', 'No liability']
        },
        {
          id: 'going_coming_rule_vehicle_use_exception_3725',
          name: 'Going-and-Coming Rule—Vehicle-Use Exception',
          description: 'Going-and-coming rule—vehicle-use exception',
          caciSeries: 'CACI 3725',
          elements: ['Going-and-coming rule', 'Vehicle-use exception', 'Scope of employment', 'Liability']
        },
        {
          id: 'going_coming_rule_business_errand_exception_3726',
          name: 'Going-and-Coming Rule—Business-Errand Exception',
          description: 'Going-and-coming rule—business-errand exception',
          caciSeries: 'CACI 3726',
          elements: ['Going-and-coming rule', 'Business-errand exception', 'Scope of employment', 'Liability']
        },
        {
          id: 'going_coming_rule_compensated_travel_time_exception_3727',
          name: 'Going-and-Coming Rule—Compensated Travel Time Exception',
          description: 'Going-and-coming rule—compensated travel time exception',
          caciSeries: 'CACI 3727',
          elements: ['Going-and-coming rule', 'Compensated travel time', 'Scope of employment', 'Liability']
        }
      ]
    },
    {
      id: 'series_3800',
      seriesNumber: 3800,
      title: 'EQUITABLE INDEMNITY',
      causes: [
        {
          id: 'comparative_fault_tortfeasors_3800',
          name: 'Comparative Fault Between and Among Tortfeasors',
          description: 'Comparative fault between and among tortfeasors',
          caciSeries: 'CACI 3800',
          elements: ['Multiple tortfeasors', 'Comparative fault', 'Apportionment', 'Indemnity']
        },
        {
          id: 'implied_contractual_indemnity_3801',
          name: 'Implied Contractual Indemnity',
          description: 'Implied contractual indemnity',
          caciSeries: 'CACI 3801',
          elements: ['Contractual relationship', 'Implied indemnity', 'Duty to indemnify', 'Damages']
        }
      ]
    },
    {
      id: 'series_4100',
      seriesNumber: 4100,
      title: 'FIDUCIARY DUTY',
      causes: [
        {
          id: 'failure_use_reasonable_care_4101',
          name: 'Failure to Use Reasonable Care—Essential Factual Elements',
          description: 'Failure to use reasonable care as fiduciary',
          caciSeries: 'CACI 4101',
          elements: ['Fiduciary relationship', 'Duty of care', 'Failure to use reasonable care', 'Damages']
        },
        {
          id: 'duty_undivided_loyalty_4102',
          name: 'Duty of Undivided Loyalty—Essential Factual Elements',
          description: 'Duty of undivided loyalty',
          caciSeries: 'CACI 4102',
          elements: ['Fiduciary relationship', 'Duty of loyalty', 'Breach', 'Damages']
        },
        {
          id: 'duty_confidentiality_4103',
          name: 'Duty of Confidentiality—Essential Factual Elements',
          description: 'Duty of confidentiality',
          caciSeries: 'CACI 4103',
          elements: ['Fiduciary relationship', 'Duty of confidentiality', 'Breach', 'Damages']
        },
        {
          id: 'duties_escrow_holder_4104',
          name: 'Duties of Escrow Holder',
          description: 'Duties of escrow holder',
          caciSeries: 'CACI 4104',
          elements: ['Escrow holder', 'Fiduciary duties', 'Breach', 'Damages']
        },
        {
          id: 'duties_stockbroker_speculative_securities_4105',
          name: 'Duties of Stockbroker—Speculative Securities',
          description: 'Duties of stockbroker regarding speculative securities',
          caciSeries: 'CACI 4105',
          elements: ['Stockbroker', 'Speculative securities', 'Duty to warn', 'Breach', 'Damages']
        },
        {
          id: 'breach_fiduciary_duty_attorney_4106',
          name: 'Breach of Fiduciary Duty by Attorney—Essential Factual Elements',
          description: 'Breach of fiduciary duty by attorney',
          caciSeries: 'CACI 4106',
          elements: ['Attorney-client relationship', 'Fiduciary duty', 'Breach', 'Damages']
        },
        {
          id: 'duty_disclosure_real_estate_broker_client_4107',
          name: 'Duty of Disclosure by Real Estate Broker to Client',
          description: 'Duty of disclosure by real estate broker to client',
          caciSeries: 'CACI 4107',
          elements: ['Real estate broker', 'Client', 'Duty of disclosure', 'Breach', 'Damages']
        },
        {
          id: 'failure_seller_real_estate_broker_reasonable_inspection_4108',
          name: 'Failure of Seller\'s Real Estate Broker to Conduct Reasonable Inspection—Essential Factual Elements (Civ. Code, § 2079)',
          description: 'Failure of seller\'s real estate broker to conduct reasonable inspection',
          caciSeries: 'CACI 4108',
          elements: ['Seller\'s broker', 'Reasonable inspection', 'Failure to inspect', 'Damages']
        },
        {
          id: 'duty_disclosure_seller_real_estate_broker_buyer_4109',
          name: 'Duty of Disclosure by Seller\'s Real Estate Broker to Buyer',
          description: 'Duty of disclosure by seller\'s real estate broker to buyer',
          caciSeries: 'CACI 4109',
          elements: ['Seller\'s broker', 'Buyer', 'Duty of disclosure', 'Breach', 'Damages']
        },
        {
          id: 'breach_duty_real_estate_seller_agent_inaccurate_mls_4110',
          name: 'Breach of Duty by Real Estate Seller\'s Agent—Inaccurate Information in Multiple Listing Service—Essential Factual Elements (Civ. Code, § 1088)',
          description: 'Breach of duty by real estate seller\'s agent—inaccurate MLS information',
          caciSeries: 'CACI 4110',
          elements: ['Seller\'s agent', 'Multiple listing service', 'Inaccurate information', 'Breach', 'Damages']
        },
        {
          id: 'constructive_fraud_4111',
          name: 'Constructive Fraud (Civ. Code, § 1573)',
          description: 'Constructive fraud',
          caciSeries: 'CACI 4111',
          elements: ['Fiduciary relationship', 'Breach of duty', 'Constructive fraud', 'Damages']
        }
      ]
    },
    {
      id: 'series_other',
      seriesNumber: 0,
      title: 'OTHER',
      causes: [
    {
      id: 'unfair_business_practices',
      name: 'Unfair Business Practices',
      description: 'Violations of Business & Professions Code §17200',
      caciSeries: 'Bus. & Prof. Code §17200',
      elements: ['Unlawful/unfair/fraudulent business act', 'Injury in fact', 'Lost money or property', 'Causation']
    },
    {
      id: 'punitive_damages',
      name: 'Punitive Damages',
      description: 'Enhanced damages for malicious, oppressive, or fraudulent conduct',
      caciSeries: 'CACI 3940-3949',
      elements: ['Malicious, oppressive, or fraudulent conduct', 'Clear and convincing evidence', 'Reprehensibility of conduct', 'Relationship to compensatory damages']
        }
      ]
    }
  ]
  
  // Flatten for backward compatibility with existing code
  const availableCausesOfAction: CauseOfAction[] = caciSeries.flatMap(series => series.causes)

  // Handle cooldown timer
  useEffect(() => {
    if (rateLimitCooldown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCooldown(rateLimitCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [rateLimitCooldown])

  // Attorney management functions
  const addAttorney = () => {
    if (attorneys.length < 5) {
      const newAttorney: Attorney = {
        id: Date.now().toString(),
        name: '',
        email: '',
        barNumber: '',
        lawFirmName: '',
        lawFirmAddress: '',
        lawFirmPhone: ''
      }
      setAttorneys([...attorneys, newAttorney])
    }
  }

  const removeAttorney = (id: string) => {
    if (attorneys.length > 1) {
      setAttorneys(attorneys.filter(attorney => attorney.id !== id))
    }
  }

  const updateAttorney = (id: string, field: keyof Omit<Attorney, 'id'>, value: string) => {
    setAttorneys(attorneys.map(attorney => 
      attorney.id === id ? { ...attorney, [field]: value } : attorney
    ))
  }

  // Plaintiff management functions
  const addPlaintiff = () => {
    if (plaintiffs.length < 10) {
      const newPlaintiff: Plaintiff = {
        id: Date.now().toString(),
        name: ''
      }
      setPlaintiffs([...plaintiffs, newPlaintiff])
    }
  }

  const removePlaintiff = (id: string) => {
    if (plaintiffs.length > 1) {
      setPlaintiffs(plaintiffs.filter(plaintiff => plaintiff.id !== id))
    }
  }

  const updatePlaintiff = (id: string, name: string) => {
    setPlaintiffs(plaintiffs.map(plaintiff => 
      plaintiff.id === id ? { ...plaintiff, name } : plaintiff
    ))
  }

  // Defendant management functions
  const addDefendant = () => {
    if (defendants.length < 10) {
      const newDefendant: Defendant = {
        id: Date.now().toString(),
        name: ''
      }
      setDefendants([...defendants, newDefendant])
    }
  }

  const removeDefendant = (id: string) => {
    if (defendants.length > 1) {
      setDefendants(defendants.filter(defendant => defendant.id !== id))
    }
  }

  const updateDefendant = (id: string, name: string) => {
    setDefendants(defendants.map(defendant => 
      defendant.id === id ? { ...defendant, name } : defendant
    ))
  }

  const generateManualTemplate = () => {
    // Generate attorney header section
    const attorneyHeader = attorneys
      .filter(att => att.name.trim() || att.email.trim() || att.barNumber.trim() || att.lawFirmName.trim())
      .map((attorney, index) => {
        const name = attorney.name.trim() || '[ATTORNEY NAME]'
        const barNumber = attorney.barNumber.trim() || '[BAR NUMBER]'
        const email = attorney.email.trim() || '[EMAIL]'
        const lawFirmName = attorney.lawFirmName.trim() || '[LAW FIRM NAME]'
        const lawFirmAddress = attorney.lawFirmAddress.trim() || '[ADDRESS]\n[CITY, STATE ZIP]'
        const lawFirmPhone = attorney.lawFirmPhone.trim() || '[PHONE]'
        
        return `${name} (California State Bar No. ${barNumber})
${email}
${lawFirmName}
${lawFirmAddress}
Telephone: ${lawFirmPhone}${index === 0 ? '\n\nAttorney for [PARTY]' : ''}`
      }).join('\n\n') || `[ATTORNEY NAME] (California State Bar No. [BAR NUMBER])
[EMAIL]
[LAW FIRM NAME]
[ADDRESS]
[CITY, STATE ZIP]
Telephone: [PHONE]

Attorney for [PARTY]`

    // Generate plaintiff names for case caption
    const plaintiffNames = plaintiffs
      .filter(p => p.name.trim())
      .map(p => p.name.trim())
      .join(', ') || '[PLAINTIFF NAME]'

    // Generate defendant names for case caption
    const defendantNames = defendants
      .filter(d => d.name.trim())
      .map(d => d.name.trim())
      .join(', ') || '[DEFENDANT NAME]'

    const template = `${attorneyHeader}

SUPERIOR COURT OF CALIFORNIA
COUNTY OF ${selectedCounty.toUpperCase() || '[COUNTY NAME]'}

${plaintiffNames},
    Plaintiff${plaintiffs.filter(p => p.name.trim()).length > 1 ? 's' : ''},
v.
${defendantNames},
    Defendant${defendants.filter(d => d.name.trim()).length > 1 ? 's' : ''}.

No. ${caseNumber.trim() || '[CASE NUMBER]'}

COMPLAINT

PARTIES

I. Jurisdiction

1. This Court has jurisdiction over this action because [jurisdiction basis].

2. Venue is proper in this County because [venue basis].

FIRST CAUSE OF ACTION
(Negligence)

3. ${summary.trim() ? `Based on the following facts: ${summary.trim()}` : '[State your factual allegations here]'}

4. Defendant owed Plaintiff a duty of care.

5. Defendant breached that duty by [specific actions that caused the incident].

6. As a proximate result of Defendant's negligence, Plaintiff suffered damages including [describe injuries/damages].

SECOND CAUSE OF ACTION
(Negligence Per Se)
[If applicable based on violation of statute/regulation]

PRAYER FOR RELIEF

WHEREFORE, Plaintiff prays for judgment against Defendant as follows:

1. General damages according to proof;
2. Special damages according to proof;
3. Medical expenses according to proof;
4. Lost wages and earning capacity according to proof;
5. Costs of suit;
6. Such other relief as the Court deems just and proper.

JURY DEMAND

Plaintiff demands trial by jury on all issues so triable.

Dated: ${new Date().toLocaleDateString()}

                    _________________________
                    [ATTORNEY SIGNATURE]
                    [ATTORNEY NAME]
                    Attorney for Plaintiff`
    
    onComplaintGenerated(template)
    setShowManualTemplate(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!summary.trim()) {
      setError('Please enter a case summary')
      return
    }

    if (summary.trim().length < 50) {
      setError('Please provide a more detailed case summary (at least 50 characters)')
      return
    }

    if (!selectedCounty) {
      setError('Please select a California county')
      return
    }

    const validPlaintiffs = plaintiffs.filter(p => p.name.trim())
    if (validPlaintiffs.length === 0) {
      setError('Please enter at least one plaintiff name')
      return
    }

    const validDefendants = defendants.filter(d => d.name.trim())
    if (validDefendants.length === 0) {
      setError('Please enter at least one defendant name')
      return
    }

    // Check local storage cache first
    const cacheKey = `complaint_${encodeURIComponent(summary.trim().toLowerCase()).replace(/%/g, '_')}`
    const cachedResult = localStorage.getItem(cacheKey)
    
    if (cachedResult) {
      try {
        const parsed = JSON.parse(cachedResult)
        const cacheAge = Date.now() - parsed.timestamp
        const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
        
        if (cacheAge < CACHE_DURATION) {
          console.log('Using cached complaint from localStorage')
          onComplaintGenerated(parsed.complaint)
          return
        }
      } catch (e) {
        // Invalid cache, continue with API call
        localStorage.removeItem(cacheKey)
      }
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/generate-complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: summary.trim(),
          causesOfAction: selectedCausesOfAction.length > 0 ? selectedCausesOfAction : null,
          attorneys: attorneys.filter(att => 
            att.name.trim() || att.email.trim() || att.barNumber.trim() || 
            att.lawFirmName.trim() || att.lawFirmAddress.trim() || att.lawFirmPhone.trim()
          ),
          county: selectedCounty,
          plaintiffs: plaintiffs.filter(p => p.name.trim()),
          defendants: defendants.filter(d => d.name.trim()),
          caseNumber: caseNumber.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle quota exceeded specifically
        if (errorData.type === 'quota_exceeded') {
          setError(errorData.userMessage || errorData.error)
          return
        }
        
        // Handle rate limiting
        if (errorData.type === 'rate_limit_exceeded') {
          setError(errorData.error)
          setRateLimitCooldown(errorData.retryAfter || 120)
          return
        }
        
        throw new Error(errorData.error || 'Failed to generate complaint')
      }

      const data = await response.json()
      
      // Cache the result in localStorage
      const cacheKey = `complaint_${encodeURIComponent(summary.trim().toLowerCase()).replace(/%/g, '_')}`
      const cacheData = {
        complaint: data.complaint,
        timestamp: Date.now(),
        summary: summary.trim()
      }
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        
        // Clean up old cache entries (keep only 10 most recent)
        const allKeys = Object.keys(localStorage).filter(key => key.startsWith('complaint_'))
        if (allKeys.length > 10) {
          const entries = allKeys.map(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}')
              return { key, timestamp: data.timestamp || 0 }
            } catch {
              return { key, timestamp: 0 }
            }
          })
          
          entries.sort((a, b) => a.timestamp - b.timestamp)
          // Remove oldest entries
          for (let i = 0; i < allKeys.length - 10; i++) {
            localStorage.removeItem(entries[i].key)
          }
        }
      } catch (e) {
        console.warn('Failed to cache complaint in localStorage:', e)
      }
      
      onComplaintGenerated(data.complaint)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      
      // If it's a rate limit error, start longer cooldown
      if (errorMessage.includes('Rate limit exceeded')) {
        setRateLimitCooldown(120) // 2 minute cooldown to match server delays
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const exampleSummaries = [
    "On July 15, 2024, in Los Angeles County, plaintiff John Smith was rear-ended by defendant Jane Doe while stopped at a red light on Sunset Boulevard. The impact caused significant damage to plaintiff's vehicle and resulted in neck and back injuries requiring medical treatment.",
    "On March 3, 2024, plaintiff's property was damaged due to defendant's negligent maintenance of water pipes, causing flooding in plaintiff's basement and destroying personal belongings worth approximately $15,000.",
    "On September 12, 2024, defendant's delivery truck collided with plaintiff's parked vehicle outside plaintiff's residence in San Francisco, causing substantial property damage and forcing plaintiff to seek alternative transportation."
  ]

  return (
    <div className="glass-card rounded-2xl shadow-2xl border border-white/20">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-white drop-shadow-lg" />
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Generate Legal Complaint</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Attorney Information Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-white">
                Attorney Information
              </label>
              <span className="text-xs text-gray-200 opacity-90">
                {attorneys.length}/5 attorneys
              </span>
            </div>
            <p className="text-gray-100 text-sm mb-4 opacity-90">
              Enter attorney details for the complaint header. At least one attorney is required.
            </p>
            
            <div className="space-y-4">
              {attorneys.map((attorney, index) => (
                <div key={attorney.id} className="glass rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-white">
                        Attorney {index + 1}
                      </span>
                    </div>
                    {attorneys.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttorney(attorney.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        disabled={isGenerating}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Attorney Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-200 mb-1">
                          Attorney Name
                        </label>
                        <input
                          type="text"
                          value={attorney.name}
                          onChange={(e) => updateAttorney(attorney.id, 'name', e.target.value)}
                          placeholder="Full Name"
                          className="input-field text-sm"
                          disabled={isGenerating}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-200 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={attorney.email}
                          onChange={(e) => updateAttorney(attorney.id, 'email', e.target.value)}
                          placeholder="attorney@lawfirm.com"
                          className="input-field text-sm"
                          disabled={isGenerating}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-200 mb-1">
                          California State Bar Number
                        </label>
                        <input
                          type="text"
                          value={attorney.barNumber}
                          onChange={(e) => updateAttorney(attorney.id, 'barNumber', e.target.value)}
                          placeholder="123456"
                          className="input-field text-sm"
                          disabled={isGenerating}
                        />
                      </div>
                    </div>

                    {/* Law Firm Information */}
                    <div className="border-t border-white/20 pt-3">
                      <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">
                        Law Firm Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-200 mb-1">
                            Law Firm Name
                          </label>
                          <input
                            type="text"
                            value={attorney.lawFirmName}
                            onChange={(e) => updateAttorney(attorney.id, 'lawFirmName', e.target.value)}
                            placeholder="Law Firm Name"
                            className="input-field text-sm"
                            disabled={isGenerating}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-200 mb-1">
                            Law Firm Address
                          </label>
                          <input
                            type="text"
                            value={attorney.lawFirmAddress}
                            onChange={(e) => updateAttorney(attorney.id, 'lawFirmAddress', e.target.value)}
                            placeholder="123 Main St, City, State ZIP"
                            className="input-field text-sm"
                            disabled={isGenerating}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-200 mb-1">
                            Telephone Number
                          </label>
                          <input
                            type="tel"
                            value={attorney.lawFirmPhone}
                            onChange={(e) => updateAttorney(attorney.id, 'lawFirmPhone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="input-field text-sm"
                            disabled={isGenerating}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {attorneys.length < 5 && (
                <button
                  type="button"
                  onClick={addAttorney}
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm p-2 rounded-lg hover:bg-primary-50 transition-colors"
                  disabled={isGenerating}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Attorney</span>
                </button>
              )}
            </div>
          </div>

          {/* County Selection */}
          <div>
            <label htmlFor="county" className="block text-sm font-medium text-white mb-2">
              California County *
            </label>
            <p className="text-gray-200 text-sm mb-3 opacity-90">
              Select the county where the complaint will be filed.
            </p>
            <select
              id="county"
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="input-field"
              disabled={isGenerating}
              required
            >
              <option value="">Select a County</option>
              {californiaCounties.map((county) => (
                <option key={county} value={county}>
                  {county} County
                </option>
              ))}
            </select>
            {selectedCounty && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 text-sm font-medium">
                  ✓ Filing in {selectedCounty} County Superior Court
                </span>
              </div>
            )}
          </div>

          {/* Plaintiff Information Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-white">
                Plaintiff Information *
              </label>
              <span className="text-xs text-gray-500">
                {plaintiffs.length}/10 plaintiffs
              </span>
            </div>
            <p className="text-gray-200 text-sm mb-4 opacity-90">
              Enter the name(s) of the plaintiff(s) in this case. At least one plaintiff is required.
            </p>
            
            <div className="space-y-3">
              {plaintiffs.map((plaintiff, index) => (
                <div key={plaintiff.id} className="glass rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-white">
                        Plaintiff {index + 1}
                      </span>
                    </div>
                    {plaintiffs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlaintiff(plaintiff.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        disabled={isGenerating}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Plaintiff Name
                    </label>
                    <input
                      type="text"
                      value={plaintiff.name}
                      onChange={(e) => updatePlaintiff(plaintiff.id, e.target.value)}
                      placeholder="Full Legal Name"
                      className="input-field text-sm"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              ))}
              
              {plaintiffs.length < 10 && (
                <button
                  type="button"
                  onClick={addPlaintiff}
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm p-2 rounded-lg hover:bg-primary-50 transition-colors"
                  disabled={isGenerating}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Plaintiff</span>
                </button>
              )}
            </div>
          </div>

          {/* Defendant Information Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-white">
                Defendant Information *
              </label>
              <span className="text-xs text-gray-500">
                {defendants.length}/10 defendants
              </span>
            </div>
            <p className="text-gray-200 text-sm mb-4 opacity-90">
              Enter the name(s) of the defendant(s) in this case. At least one defendant is required.
            </p>
            
            <div className="space-y-3">
              {defendants.map((defendant, index) => (
                <div key={defendant.id} className="glass rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-white">
                        Defendant {index + 1}
                      </span>
                    </div>
                    {defendants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDefendant(defendant.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        disabled={isGenerating}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Defendant Name
                    </label>
                    <input
                      type="text"
                      value={defendant.name}
                      onChange={(e) => updateDefendant(defendant.id, e.target.value)}
                      placeholder="Full Legal Name"
                      className="input-field text-sm"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              ))}
              
              {defendants.length < 10 && (
                <button
                  type="button"
                  onClick={addDefendant}
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm p-2 rounded-lg hover:bg-primary-50 transition-colors"
                  disabled={isGenerating}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Defendant</span>
                </button>
              )}
            </div>
          </div>

          {/* Case Number Section */}
          <div>
            <label htmlFor="caseNumber" className="block text-sm font-medium text-white mb-2">
              Case Number
            </label>
            <p className="text-gray-200 text-sm mb-3 opacity-90">
              Enter the case number if already assigned by the court (optional).
            </p>
            <input
              id="caseNumber"
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., 24STCV12345"
              className="input-field"
              disabled={isGenerating}
            />
            {caseNumber.trim() && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-700 text-sm font-medium">
                  ℹ️ Case Number: {caseNumber.trim()}
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
              Case Summary *
            </label>
            <p className="text-gray-200 text-sm mb-3 opacity-90">
              Provide a detailed factual summary of the incident, including dates, locations, parties involved, 
              and the nature of damages or injuries.
            </p>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value)
                setError('')
              }}
              placeholder="Enter your case summary here..."
              className="textarea-field"
              disabled={isGenerating}
              rows={8}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">
                {summary.length} characters (minimum 50)
              </span>
              {summary.length >= 50 && (
                <span className="text-green-600 text-sm font-medium">✓ Ready to generate</span>
              )}
            </div>
          </div>

          {/* Causes of Action Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-white">
                Causes of Action (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowCauseSelection(!showCauseSelection)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {showCauseSelection ? 'Hide' : 'Select Specific'} Causes
              </button>
            </div>
            <p className="text-gray-200 text-sm mb-3 opacity-90">
              {showCauseSelection 
                ? 'Select specific causes of action to include in your complaint. If none selected, the AI will automatically determine appropriate causes based on your case summary.'
                : 'The AI will automatically determine appropriate causes of action based on your case summary, or you can select specific ones.'
              }
            </p>
            
            {showCauseSelection && (
              <div className="space-y-4 mb-4 p-4 glass rounded-xl border border-white/20">
                {caciSeries.map((series) => series.causes.length > 0 && (
                  <div key={series.id} className="border border-white/20 rounded-xl glass-card">
                    <button
                      type="button"
                      onClick={() => {
                        const newExpanded = new Set(expandedSeries)
                        if (newExpanded.has(series.id)) {
                          newExpanded.delete(series.id)
                        } else {
                          newExpanded.add(series.id)
                        }
                        setExpandedSeries(newExpanded)
                      }}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-white/10 transition-colors"
                    >
                      <h3 className="text-md font-bold text-gray-900">
                        SERIES {series.seriesNumber !== 0 ? series.seriesNumber : ''} {series.title}
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          ({series.causes.length} causes)
                        </span>
                      </h3>
                      {expandedSeries.has(series.id) ? (
                        <ChevronUp className="w-5 h-5 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-primary-600" />
                      )}
                    </button>
                    
                    {expandedSeries.has(series.id) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-white/20">
                        {series.causes.map((cause) => (
                  <div key={cause.id} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={cause.id}
                      checked={selectedCausesOfAction.includes(cause.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCausesOfAction([...selectedCausesOfAction, cause.id])
                        } else {
                          setSelectedCausesOfAction(selectedCausesOfAction.filter(id => id !== cause.id))
                        }
                      }}
                      className="mt-1 h-4 w-4 text-primary-400 focus:ring-primary-400 border-white/30 rounded"
                      disabled={isGenerating}
                    />
                    <div className="flex-1">
                      <label htmlFor={cause.id} className="text-sm font-medium text-gray-900 cursor-pointer">
                        {cause.name}
                      </label>
                      <p className="text-xs text-gray-600 mt-1">{cause.description}</p>
                      <p className="text-xs text-primary-600 font-medium mt-1">{cause.caciSeries}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        Elements: {cause.elements.join(', ')}
                      </div>
                    </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {selectedCausesOfAction.length > 0 && (
                  <div className="col-span-full mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                    <h4 className="text-sm font-medium text-primary-900 mb-2">
                      Selected Causes ({selectedCausesOfAction.length}):
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCausesOfAction.map((id) => {
                        const cause = availableCausesOfAction.find(c => c.id === id)
                        return cause ? (
                          <span key={id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            {cause.name}
                            <button
                              type="button"
                              onClick={() => setSelectedCausesOfAction(selectedCausesOfAction.filter(cId => cId !== id))}
                              className="ml-1 text-primary-600 hover:text-primary-800"
                              disabled={isGenerating}
                            >
                              ×
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rate Limit Helper */}
          {rateLimitCooldown === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Tips to Avoid Rate Limits</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Wait 2+ minutes between requests</li>
                <li>• Use the example summaries to test (they're cached)</li>
                <li>• Similar case summaries will return cached results instantly</li>
                <li>• Consider upgrading your OpenAI API plan for higher limits</li>
              </ul>
            </div>
          )}

          {error && (
            <div className={`border rounded-lg p-4 ${
              error.includes('quota') || error.includes('billing')
                ? 'bg-red-50 border-red-200'
                : error.includes('Rate limit exceeded') 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertCircle className={`w-5 h-5 ${
                  error.includes('quota') || error.includes('billing')
                    ? 'text-red-600'
                    : error.includes('Rate limit exceeded') 
                      ? 'text-amber-600' 
                      : 'text-red-600'
                }`} />
                <span className={`font-medium ${
                  error.includes('quota') || error.includes('billing')
                    ? 'text-red-800'
                    : error.includes('Rate limit exceeded') 
                      ? 'text-amber-800' 
                      : 'text-red-800'
                }`}>
                  {error.includes('quota') || error.includes('billing') 
                    ? 'OpenAI Quota Exceeded' 
                    : error.includes('Rate limit exceeded') 
                      ? 'Rate Limit Reached' 
                      : 'Error'}
                </span>
              </div>
              
              {/* Quota exceeded - show structured message */}
              {(error.includes('quota') || error.includes('billing')) && (
                <div className="mt-3 space-y-3">
                  <p className="text-red-700 text-sm">
                    Your OpenAI API usage has exceeded the current billing limits.
                  </p>
                  
                  <div className="bg-red-100 rounded-lg p-3">
                    <h4 className="font-medium text-red-900 mb-2">Solutions:</h4>                    <ul className="text-red-800 text-sm space-y-1">
                      <li>• <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-900">Check your usage limits</a></li>
                      <li>• <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-900">Add payment method or increase limits</a></li>
                      <li>• Wait for your quota to reset (if on free tier)</li>
                      <li>• <button 
                           onClick={generateManualTemplate}
                           className="underline hover:text-red-900 text-left"
                         >
                           Generate manual template instead
                         </button></li>
                    </ul>
                    <p className="text-red-200 text-xs mt-2">
                      📖 For detailed setup instructions, see <code className="bg-red-500/30 px-1 rounded">OPENAI_SETUP.md</code> in your project folder.
                    </p>
                  </div>
                  
                  <details className="text-sm">
                    <summary className="text-red-200 cursor-pointer hover:text-red-100">Show manual complaint template</summary>
                    <div className="mt-2 p-3 glass rounded-xl text-gray-100 font-mono text-xs">
                      <pre>{`[Attorney Name] (California State Bar No. [Number])
[Email]
[Law Firm Name]
[Address]
[City, State ZIP]
Telephone: [Phone]

Attorney for [Party]

SUPERIOR COURT OF CALIFORNIA
COUNTY OF [COUNTY NAME]

[Plaintiff Name],
    Plaintiff,
v.
[Defendant Name],
    Defendant.

No. [Case Number]

COMPLAINT

PARTIES

I. Jurisdiction
[Your allegations here...]`}</pre>
                    </div>
                  </details>
                </div>
              )}
              
              {/* Rate limit error */}
              {!error.includes('quota') && !error.includes('billing') && (
                <>
                  <p className={`mt-1 ${
                    error.includes('Rate limit exceeded') 
                      ? 'text-amber-700' 
                      : 'text-red-700'
                  }`}>
                    {error}
                  </p>
                  {error.includes('Rate limit exceeded') && rateLimitCooldown > 0 && (
                    <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                      <p className="text-amber-800 text-sm font-medium">
                        ⏱️ Automatic retry in {rateLimitCooldown} seconds
                      </p>
                      <p className="text-amber-700 text-sm mt-1">
                        To avoid rate limits in the future, consider upgrading your OpenAI API plan or wait longer between requests.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isGenerating || !summary.trim() || summary.length < 50 || !selectedCounty || plaintiffs.filter(p => p.name.trim()).length === 0 || defendants.filter(d => d.name.trim()).length === 0 || rateLimitCooldown > 0}
              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Complaint...</span>
                </>
              ) : rateLimitCooldown > 0 ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  <span>Please wait {rateLimitCooldown}s (Rate Limited)</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Generate AI-Powered Complaint</span>
                </>
              )}
            </button>
            
            <div className="text-center">
              <span className="text-gray-500 text-sm">or</span>
            </div>
            
            <button
              type="button"
              onClick={generateManualTemplate}
              disabled={isGenerating}
              className="btn-secondary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileEdit className="w-5 h-5" />
              <span>Use Manual Template</span>
            </button>
          </div>
        </form>

        {/* Example Summaries */}
        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Example Case Summaries</h3>
          <div className="space-y-4">
            {exampleSummaries.map((example, index) => (
              <div key={index} className="glass rounded-xl p-4">
                <p className="text-gray-700 text-sm mb-3">{example}</p>
                <button
                  type="button"
                  onClick={() => setSummary(example)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  disabled={isGenerating}
                >
                  Use this example
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
