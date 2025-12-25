import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Simple in-memory queue to prevent concurrent requests
let isProcessing = false
const requestQueue: Array<() => void> = []

// Simple cache to store recent responses (in production, use Redis or similar)
const responseCache = new Map<string, { complaint: string, timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Generate cache key from summary
const generateCacheKey = (summary: string): string => {
  return Buffer.from(summary.toLowerCase().trim()).toString('base64')
}

// Process queue
const processQueue = async () => {
  if (requestQueue.length > 0 && !isProcessing) {
    const nextRequest = requestQueue.shift()
    if (nextRequest) {
      try {
        await nextRequest()
      } catch (error) {
        console.error('Error processing queued request:', error)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  // If another request is processing, queue this one
  if (isProcessing) {
    return new Promise<NextResponse>((resolve, reject) => {
      requestQueue.push(async () => {
        try {
          const response = await handleComplaintGeneration(request)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      })
      
      // Process the queue after adding the request
      setTimeout(processQueue, 100)
    })
  }

  return handleComplaintGeneration(request)
}

async function handleComplaintGeneration(request: NextRequest): Promise<NextResponse> {
  isProcessing = true
  
  try {
    // SECURITY: Authentication check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('[SECURITY] Attempted to generate complaint without authentication')
      isProcessing = false
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { summary, causesOfAction, availableCauses, attorneys, county, plaintiffs, defendants, caseNumber, representationType } = body

    // Validation
    if (!summary || typeof summary !== 'string') {
      return NextResponse.json(
        { error: 'Case summary is required' },
        { status: 400 }
      )
    }

    // Use server-side API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Sanitize input
    const sanitizedSummary = summary.trim().slice(0, 5000) // Limit length
    
    console.log('API Key configured:', !!apiKey)
    console.log('Request summary length:', sanitizedSummary.length)

    // Check cache first
    const cacheKey = generateCacheKey(sanitizedSummary)
    const cached = responseCache.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached response')
      return NextResponse.json({ 
        complaint: cached.complaint,
        cached: true 
      })
    }

    // Map cause IDs to human-readable names - COMPLETE MAPPING
    const causeIdToNameMap: Record<string, string> = {
      // Series 300 - Contract
      'contract_300': 'Breach of Contract—Introduction (CACI 300)',
      'third_party_beneficiary_301': 'Third-Party Beneficiary (CACI 301)',
      'contract_formation_302': 'Contract Formation—Essential Factual Elements (CACI 302)',
      'breach_of_contract_303': 'Breach of Contract—Essential Factual Elements (CACI 303)',
      'contract_terms_304': 'Oral or Written Contract Terms (CACI 304)',
      'implied_in_fact_305': 'Implied-in-Fact Contract (CACI 305)',
      'unformalized_agreement_306': 'Unformalized Agreement (CACI 306)',
      'contract_offer_307': 'Contract Formation—Offer (CACI 307)',
      'revocation_308': 'Contract Formation—Revocation of Offer (CACI 308)',
      'acceptance_309': 'Contract Formation—Acceptance (CACI 309)',
      'acceptance_silence_310': 'Contract Formation—Acceptance by Silence (CACI 310)',
      'rejection_311': 'Contract Formation—Rejection of Offer (CACI 311)',
      'substantial_performance_312': 'Substantial Performance (CACI 312)',
      'modification_313': 'Modification (CACI 313)',
      'interpretation_disputed_314': 'Interpretation—Disputed Words (CACI 314)',
      'interpretation_ordinary_315': 'Interpretation—Meaning of Ordinary Words (CACI 315)',
      'interpretation_technical_316': 'Interpretation—Meaning of Technical Words (CACI 316)',
      'interpretation_whole_317': 'Interpretation—Construction of Contract as a Whole (CACI 317)',
      'interpretation_conduct_318': 'Interpretation—Construction by Conduct (CACI 318)',
      'interpretation_time_319': 'Interpretation—Reasonable Time (CACI 319)',
      'interpretation_drafter_320': 'Interpretation—Construction Against Drafter (CACI 320)',
      'condition_precedent_disputed_321': 'Existence of Condition Precedent Disputed (CACI 321)',
      'condition_precedent_occurrence_322': 'Occurrence of Agreed Condition Precedent (CACI 322)',
      'condition_precedent_waiver_323': 'Waiver of Condition Precedent (CACI 323)',
      'anticipatory_breach_324': 'Anticipatory Breach (CACI 324)',
      'breach_implied_covenant_325': 'Breach of Implied Covenant of Good Faith and Fair Dealing (CACI 325)',
      'assignment_contested_326': 'Assignment Contested (CACI 326)',
      'assignment_not_contested_327': 'Assignment Not Contested (CACI 327)',
      'breach_implied_duty_care_328': 'Breach of Implied Duty to Perform With Reasonable Care (CACI 328)',
      // Series 400 - Negligence
      'negligence_400': 'Negligence—Essential Factual Elements (CACI 400)',
      'standard_of_care_401': 'Basic Standard of Care (CACI 401)',
      'minors_standard_402': 'Standard of Care for Minors (CACI 402)',
      'disability_standard_403': 'Standard of Care for Person with a Physical Disability (CACI 403)',
      'intoxication_404': 'Intoxication (CACI 404)',
      'comparative_fault_405': 'Comparative Fault of Plaintiff (CACI 405)',
      'apportionment_406': 'Apportionment of Responsibility (CACI 406)',
      'comparative_fault_decedent_407': 'Comparative Fault of Decedent (CACI 407)',
      'reliance_good_conduct_411': 'Reliance on Good Conduct of Others (CACI 411)',
      'duty_children_412': 'Duty of Care Owed Children (CACI 412)',
      'custom_practice_413': 'Custom or Practice (CACI 413)',
      'dangerous_situations_414': 'Amount of Caution Required in Dangerous Situations (CACI 414)',
      'employee_danger_415': 'Employee Required to Work in Dangerous Situations (CACI 415)',
      'electric_power_416': 'Amount of Caution Required in Transmitting Electric Power (CACI 416)',
      'res_ipsa_loquitur_417': 'Res Ipsa Loquitur (CACI 417)',
      'negligence_per_se_418': 'Presumption of Negligence Per Se (CACI 418)',
      'negligence_per_se_causation_419': 'Presumption of Negligence Per Se (Causation Only at Issue) (CACI 419)',
      'negligence_per_se_rebuttal_420': 'Negligence Per Se: Rebuttal—Violation Excused (CACI 420)',
      'negligence_per_se_minor_421': 'Negligence Per Se: Rebuttal (Violation of Minor Excused) (CACI 421)',
      'dram_shop_422': 'Providing Alcoholic Beverages to Obviously Intoxicated Minors (CACI 422)',
      'public_entity_423': 'Public Entity Liability for Failure to Perform Mandatory Duty (CACI 423)',
      'negligence_not_contested_424': 'Negligence Not Contested—Essential Factual Elements (CACI 424)',
      'gross_negligence_425': 'Gross Negligence (CACI 425)',
      'negligent_hiring_426': 'Negligent Hiring, Supervision, or Retention of Employee (CACI 426)',
      'dram_shop_minors_427': 'Furnishing Alcoholic Beverages to Minors (CACI 427)',
      'parental_liability_428': 'Parental Liability (Nonstatutory) (CACI 428)',
      'sexual_transmission_429': 'Negligent Sexual Transmission of Disease (CACI 429)',
      'substantial_factor_430': 'Causation: Substantial Factor (CACI 430)',
      'multiple_causes_431': 'Causation: Multiple Causes (CACI 431)',
      'superseding_cause_432': 'Affirmative Defense—Causation: Third-Party Conduct as Superseding Cause (CACI 432)',
      'intentional_superseding_433': 'Affirmative Defense—Causation: Intentional Tort/Criminal Act as Superseding Cause (CACI 433)',
      'alternative_causation_434': 'Alternative Causation (CACI 434)',
      'asbestos_causation_435': 'Causation for Asbestos-Related Cancer Claims (CACI 435)',
      'law_enforcement_nondeadly_440': 'Negligent Use of Nondeadly Force by Law Enforcement (CACI 440)',
      'law_enforcement_deadly_441': 'Negligent Use of Deadly Force by Peace Officer (CACI 441)',
      'good_samaritan_nonemergency_450a': 'Good Samaritan—Nonemergency (CACI 450A)',
      'good_samaritan_emergency_450b': 'Good Samaritan—Scene of Emergency (CACI 450B)',
      'negligent_undertaking_450c': 'Negligent Undertaking (CACI 450C)',
      'contractual_assumption_risk_451': 'Affirmative Defense—Contractual Assumption of Risk (CACI 451)',
      'sudden_emergency_452': 'Sudden Emergency (CACI 452)',
      'rescue_453': 'Injury Incurred in Course of Rescue (CACI 453)',
      'statute_limitations_454': 'Affirmative Defense—Statute of Limitations (CACI 454)',
      'delayed_discovery_455': 'Statute of Limitations—Delayed Discovery (CACI 455)',
      'estoppel_sol_456': 'Defendant Estopped From Asserting Statute of Limitations Defense (CACI 456)',
      'equitable_tolling_457': 'Statute of Limitations—Equitable Tolling (CACI 457)',
      'ultrahazardous_460': 'Strict Liability for Ultrahazardous Activities (CACI 460)',
      'wild_animal_461': 'Strict Liability for Injury Caused by Wild Animal (CACI 461)',
      'dangerous_animal_462': 'Strict Liability for Injury Caused by Domestic Animal With Dangerous Propensities (CACI 462)',
      'dog_bite_463': 'Dog Bite Statute (CACI 463)',
      // Series 500 - Medical Negligence
      'medical_negligence_500': 'Medical Negligence—Essential Factual Elements (CACI 500)',
      'standard_care_health_501': 'Standard of Care for Health Care Professionals (CACI 501)',
      'standard_care_specialist_502': 'Standard of Care for Medical Specialists (CACI 502)',
      'psychotherapist_duty_503a': 'Psychotherapist\'s Duty to Protect Intended Victim From Patient\'s Threat (CACI 503A)',
      'psychotherapist_defense_503b': 'Affirmative Defense—Psychotherapist\'s Communication of Threat to Victim and Law Enforcement (CACI 503B)',
      'standard_care_nurses_504': 'Standard of Care for Nurses (CACI 504)',
      'success_not_required_505': 'Success Not Required (CACI 505)',
      'alternative_methods_506': 'Alternative Methods of Care (CACI 506)',
      'duty_warn_patient_507': 'Duty to Warn Patient (CACI 507)',
      'duty_refer_specialist_508': 'Duty to Refer to a Specialist (CACI 508)',
      'abandonment_patient_509': 'Abandonment of Patient (CACI 509)',
      'derivative_liability_surgeon_510': 'Derivative Liability of Surgeon (CACI 510)',
      'wrongful_birth_sterilization_511': 'Wrongful Birth—Sterilization/Abortion (CACI 511)',
      'wrongful_birth_512': 'Wrongful Birth—Essential Factual Elements (CACI 512)',
      'wrongful_life_513': 'Wrongful Life—Essential Factual Elements (CACI 513)',
      'duty_hospital_514': 'Duty of Hospital (CACI 514)',
      'hospital_safe_environment_515': 'Duty of Hospital to Provide Safe Environment (CACI 515)',
      'hospital_screen_staff_516': 'Duty of Hospital to Screen Medical Staff (CACI 516)',
      'patient_duty_wellbeing_517': 'Affirmative Defense—Patient\'s Duty to Provide for the Patient\'s Own Well-Being (CACI 517)',
      'medical_res_ipsa_518': 'Medical Malpractice: Res Ipsa Loquitur (CACI 518)',
      'medical_battery_530a': 'Medical Battery (CACI 530A)',
      'medical_battery_conditional_530b': 'Medical Battery—Conditional Consent (CACI 530B)',
      'consent_behalf_another_531': 'Consent on Behalf of Another (CACI 531)',
      'informed_consent_definition_532': 'Informed Consent—Definition (CACI 532)',
      'lack_informed_consent_533': 'Failure to Obtain Informed Consent—Essential Factual Elements (CACI 533)',
      'informed_refusal_534': 'Informed Refusal—Definition (CACI 534)',
      'risks_nontreatment_535': 'Risks of Nontreatment—Essential Factual Elements (CACI 535)',
      // Series 600 - Professional Negligence
      'professional_standard_care_600': 'Standard of Care (CACI 600)',
      'legal_malpractice_causation_601': 'Legal Malpractice—Causation (CACI 601)',
      'success_not_required_602': 'Success Not Required (CACI 602)',
      'alternative_legal_strategies_603': 'Alternative Legal Decisions or Strategies (CACI 603)',
      'referral_legal_specialist_604': 'Referral to Legal Specialist (CACI 604)',
      'legal_malpractice_criminal_606': 'Legal Malpractice Causing Criminal Conviction—Actual Innocence (CACI 606)',
      // Series 700 - Motor Vehicles
      'motor_vehicle_basic_700': 'Basic Standard of Care (CACI 700)',
      'right_of_way_definition_701': 'Definition of Right-of-Way (CACI 701)',
      'waiver_right_of_way_702': 'Waiver of Right-of-Way (CACI 702)',
      'immediate_hazard_703': 'Definition of "Immediate Hazard" (CACI 703)',
      'left_turns_704': 'Left Turns (CACI 704)',
      'turning_705': 'Turning (CACI 705)',
      'basic_speed_law_706': 'Basic Speed Law (CACI 706)',
      'speed_limit_707': 'Speed Limit (CACI 707)',
      'maximum_speed_708': 'Maximum Speed Limit (CACI 708)',
      'dui_709': 'Driving Under the Influence (CACI 709)',
      'crosswalk_duties_710': 'Duties of Care for Pedestrians and Drivers in Crosswalk (CACI 710)',
      'passenger_duty_711': 'The Passenger\'s Duty of Care for Own Safety (CACI 711)',
      'seat_belt_defense_712': 'Affirmative Defense—Failure to Wear a Seat Belt (CACI 712)',
      'owner_liability_720': 'Motor Vehicle Owner Liability—Permissive Use of Vehicle (CACI 720)',
      'owner_liability_defense_721': 'Motor Vehicle Owner Liability—Affirmative Defense—Use Beyond Scope of Permission (CACI 721)',
      'adult_liability_minor_722': 'Adult\'s Liability for Minor\'s Permissive Use of Motor Vehicle (CACI 722)',
      'cosigner_liability_723': 'Liability of Cosigner of Minor\'s Application for Driver\'s License (CACI 723)',
      'negligent_entrustment_724': 'Negligent Entrustment of Motor Vehicle (CACI 724)',
      'emergency_vehicle_730': 'Emergency Vehicle Exemption (CACI 730)',
      'emergency_definition_731': 'Definition of "Emergency" (CACI 731)',
      // Series 800 - Railroad Crossings
      'railroad_basic_care_800': 'Basic Standard of Care for Railroads (CACI 800)',
      'railroad_safety_regulations_801': 'Duty to Comply With Safety Regulations (CACI 801)',
      'railroad_speed_803': 'Regulating Speed (CACI 803)',
      'railroad_lookout_804': 'Lookout for Crossing Traffic (CACI 804)',
      'railroad_warning_systems_805': 'Installing Warning Systems (CACI 805)',
      'railroad_comparative_fault_806': 'Comparative Fault—Duty to Approach Crossing With Care (CACI 806)',
      // Series 900 - Common Carriers
      'common_carrier_intro_900': 'Introductory Instruction (CACI 900)',
      'common_carrier_status_disputed_901': 'Status of Common Carrier Disputed (CACI 901)',
      'common_carrier_duty_902': 'Duty of Common Carrier (CACI 902)',
      'common_carrier_safe_equipment_903': 'Duty to Provide and Maintain Safe Equipment (CACI 903)',
      'common_carrier_illness_disability_904': 'Duty of Common Carrier Toward Passengers With Illness or Disability (CACI 904)',
      'common_carrier_minors_905': 'Duty of Common Carrier Toward Minor Passengers (CACI 905)',
      'passenger_duty_906': 'Duty of Passenger for Own Safety (CACI 906)',
      'passenger_status_disputed_907': 'Status of Passenger Disputed (CACI 907)',
      'common_carrier_assault_908': 'Duty to Protect Passengers From Assault (CACI 908)',
      // Series 1000 - Premises Liability
      'premises_liability_1000': 'Premises Liability—Essential Factual Elements (CACI 1000)',
      'basic_duty_care_1001': 'Basic Duty of Care (CACI 1001)',
      'extent_control_1002': 'Extent of Control Over Premises Area (CACI 1002)',
      'unsafe_conditions_1003': 'Unsafe Conditions (CACI 1003)',
      'obviously_unsafe_1004': 'Obviously Unsafe Conditions (CACI 1004)',
      'criminal_conduct_1005': 'Business Proprietor\'s or Property Owner\'s Liability for the Criminal Conduct of Others (CACI 1005)',
      'landlord_duty_1006': 'Landlord\'s Duty (CACI 1006)',
      'sidewalk_abutting_1007': 'Sidewalk Abutting Property (CACI 1007)',
      'altered_sidewalk_1008': 'Liability for Adjacent Altered Sidewalk—Essential Factual Elements (CACI 1008)',
      'independent_contractor_concealed_1009a': 'Liability to Employees of Independent Contractors for Unsafe Concealed Conditions (CACI 1009A)',
      'independent_contractor_retained_1009b': 'Liability to Employees of Independent Contractors for Unsafe Conditions—Retained Control (CACI 1009B)',
      'independent_contractor_equipment_1009d': 'Liability to Employees of Independent Contractors for Unsafe Conditions—Defective Equipment (CACI 1009D)',
      'recreation_immunity_1010': 'Affirmative Defense—Recreation Immunity—Exceptions (CACI 1010)',
      'constructive_notice_1011': 'Constructive Notice Regarding Dangerous Conditions on Property (CACI 1011)',
      'employee_knowledge_1012': 'Knowledge of Employee Imputed to Owner (CACI 1012)',
      // Series 1100 - Dangerous Condition of Public Property
      'dangerous_public_property_1100': 'Dangerous Condition on Public Property—Essential Factual Elements (CACI 1100)',
      'control_1101': 'Control (CACI 1101)',
      'dangerous_condition_definition_1102': 'Definition of "Dangerous Condition" (CACI 1102)',
      'notice_1103': 'Notice (CACI 1103)',
      'inspection_system_1104': 'Inspection System (CACI 1104)',
      'natural_conditions_defense_1110': 'Affirmative Defense—Natural Conditions (CACI 1110)',
      'reasonable_act_omission_1111': 'Affirmative Defense—Condition Created by Reasonable Act or Omission (CACI 1111)',
      'reasonable_correction_1112': 'Affirmative Defense—Reasonable Act or Omission to Correct (CACI 1112)',
      'traffic_control_signals_1120': 'Failure to Provide Traffic Control Signals (CACI 1120)',
      'traffic_warning_1121': 'Failure to Provide Traffic Warning Signals, Signs, or Markings (CACI 1121)',
      'weather_conditions_defense_1122': 'Affirmative Defense—Weather Conditions Affecting Streets and Highways (CACI 1122)',
      'design_immunity_1123': 'Affirmative Defense—Design Immunity (CACI 1123)',
      'loss_design_immunity_1124': 'Loss of Design Immunity (Cornette) (CACI 1124)',
      'adjacent_property_1125': 'Conditions on Adjacent Property (CACI 1125)',
      'failure_warn_approved_design_1126': 'Failure to Warn of a Dangerous Roadway Condition Resulting From an Approved Design—Essential Factual Elements (CACI 1126)',
      // Series 1200 - Products Liability
      'strict_liability_1200': 'Strict Liability—Essential Factual Elements (CACI 1200)',
      'manufacturing_defect_1201': 'Strict Liability—Manufacturing Defect—Essential Factual Elements (CACI 1201)',
      'manufacturing_defect_explained_1202': 'Strict Liability—"Manufacturing Defect" Explained (CACI 1202)',
      'design_defect_consumer_1203': 'Strict Liability—Design Defect—Consumer Expectation Test—Essential Factual Elements (CACI 1203)',
      'design_defect_risk_benefit_1204': 'Strict Liability—Design Defect—Risk-Benefit Test—Essential Factual Elements—Shifting Burden of Proof (CACI 1204)',
      'failure_to_warn_1205': 'Strict Liability—Failure to Warn—Essential Factual Elements (CACI 1205)',
      'allergen_warning_1206': 'Strict Liability—Failure to Warn—Products Containing Allergens (CACI 1206)',
      'comparative_fault_plaintiff_1207a': 'Strict Liability—Comparative Fault of Plaintiff (CACI 1207A)',
      'comparative_fault_third_1207b': 'Strict Liability—Comparative Fault of Third Person (CACI 1207B)',
      'component_parts_1208': 'Component Parts Rule (CACI 1208)',
      'products_negligence_1220': 'Negligence—Essential Factual Elements (CACI 1220)',
      'products_standard_care_1221': 'Negligence—Basic Standard of Care (CACI 1221)',
      'duty_to_warn_1222': 'Negligence—Manufacturer or Supplier—Duty to Warn—Essential Factual Elements (CACI 1222)',
      'recall_retrofit_1223': 'Negligence—Recall/Retrofit (CACI 1223)',
      'product_rental_1224': 'Negligence—Negligence for Product Rental/Standard of Care (CACI 1224)',
      'express_warranty_1230': 'Express Warranty—Essential Factual Elements (CACI 1230)',
      'implied_warranty_merchantability_1231': 'Implied Warranty of Merchantability—Essential Factual Elements (CACI 1231)',
      'implied_warranty_fitness_1232': 'Implied Warranty of Fitness for a Particular Purpose—Essential Factual Elements (CACI 1232)',
      'implied_warranty_food_1233': 'Implied Warranty of Merchantability for Food—Essential Factual Elements (CACI 1233)',
      // Series 1300+ - Other
      'battery': 'Battery (CACI 1300)',
      'intentional_tort': 'Assault (CACI 1300-series)',
      'iied': 'Intentional Infliction of Emotional Distress (CACI 1600)',
      'fraud': 'Fraud/Misrepresentation (CACI 1900-series)',
      'negligent_misrepresentation': 'Negligent Misrepresentation (CACI 1903)',
      'unfair_business_practices': 'Unfair Business Practices (Bus. & Prof. Code §17200)',
      'punitive_damages': 'Punitive Damages (CACI 3940-3949)',
      // Series 1700 - Defamation
      'defamation_per_se_public_1700': 'Defamation per se—Essential Factual Elements (Public Officer/Figure and Limited Public Figure) (CACI 1700)',
      'defamation_per_quod_public_1701': 'Defamation per quod—Essential Factual Elements (Public Officer/Figure and Limited Public Figure) (CACI 1701)',
      'defamation_per_se_private_public_concern_1702': 'Defamation per se—Essential Factual Elements (Private Figure—Matter of Public Concern) (CACI 1702)',
      'defamation_per_quod_private_public_concern_1703': 'Defamation per quod—Essential Factual Elements (Private Figure—Matter of Public Concern) (CACI 1703)',
      'defamation_per_se_private_private_concern_1704': 'Defamation per se—Essential Factual Elements (Private Figure—Matter of Private Concern) (CACI 1704)',
      'defamation_per_quod_private_private_concern_1705': 'Defamation per quod—Essential Factual Elements (Private Figure—Matter of Private Concern) (CACI 1705)',
      'definition_statement_1706': 'Definition of Statement (CACI 1706)',
      'fact_versus_opinion_1707': 'Fact Versus Opinion (CACI 1707)',
      'coerced_self_publication_1708': 'Coerced Self-Publication (CACI 1708)',
      'retraction_news_1709': 'Retraction: News Publication or Broadcast (CACI 1709)',
      'affirmative_defense_truth_1720': 'Affirmative Defense—Truth (CACI 1720)',
      'affirmative_defense_consent_1721': 'Affirmative Defense—Consent (CACI 1721)',
      'affirmative_defense_sol_defamation_1722': 'Affirmative Defense—Statute of Limitations—Defamation (CACI 1722)',
      'common_interest_privilege_1723': 'Common Interest Privilege—Malice (CACI 1723)',
      'fair_true_reporting_privilege_1724': 'Fair and True Reporting Privilege (CACI 1724)',
      'slander_title_1730': 'Slander of Title—Essential Factual Elements (CACI 1730)',
      'trade_libel_1731': 'Trade Libel—Essential Factual Elements (CACI 1731)',
      // Series 1800 - Right of Privacy
      'intrusion_private_affairs_1800': 'Intrusion Into Private Affairs (CACI 1800)',
      'public_disclosure_private_facts_1801': 'Public Disclosure of Private Facts (CACI 1801)',
      'false_light_1802': 'False Light (CACI 1802)',
      'appropriation_name_likeness_1803': 'Appropriation of Name or Likeness—Essential Factual Elements (CACI 1803)',
      'use_name_likeness_3344_1804a': 'Use of Name or Likeness (CACI 1804A)',
      'use_name_likeness_news_1804b': 'Use of Name or Likeness—Use in Connection With News, Public Affairs, or Sports Broadcast or Account, or Political Campaign (CACI 1804B)',
      'affirmative_defense_first_amendment_1805': 'Affirmative Defense to Use or Appropriation of Name or Likeness—First Amendment (CACI 1805)',
      'affirmative_defense_first_amendment_balancing_1806': 'Affirmative Defense to Invasion of Privacy—First Amendment Balancing Test—Public Interest (CACI 1806)',
      'affirmative_defense_privacy_justified_1807': 'Affirmative Defense—Invasion of Privacy Justified (CACI 1807)',
      'stalking_1808': 'Stalking (CACI 1808)',
      'recording_confidential_info_1809': 'Recording of Confidential Information (CACI 1809)',
      'distribution_private_sexually_explicit_1810': 'Distribution of Private Sexually Explicit Materials—Essential Factual Elements (CACI 1810)',
      'computer_data_access_fraud_1812': 'Comprehensive Computer Data and Access Fraud Act—Essential Factual Elements (CACI 1812)',
      'definition_access_1813': 'Definition of "Access" (CACI 1813)',
      'damages_investigating_computer_violations_1814': 'Damages for Investigating Violations of Comprehensive Computer Data and Access Fraud Act (CACI 1814)',
      'damages_privacy_1820': 'Damages (CACI 1820)',
      'damages_name_likeness_1821': 'Damages for Use of Name or Likeness (CACI 1821)',
      // Series 1900 - Fraud or Deceit
      'intentional_misrepresentation_1900': 'Intentional Misrepresentation (CACI 1900)',
      'concealment_1901': 'Concealment (CACI 1901)',
      'false_promise_1902': 'False Promise (CACI 1902)',
      'negligent_misrepresentation_1903': 'Negligent Misrepresentation (CACI 1903)',
      'opinions_as_facts_1904': 'Opinions as Statements of Fact (CACI 1904)',
      'definition_important_fact_1905': 'Definition of Important Fact/Promise (CACI 1905)',
      'misrepresentation_to_others_1906': 'Misrepresentations Made to Persons Other Than the Plaintiff (CACI 1906)',
      'reliance_1907': 'Reliance (CACI 1907)',
      'reasonable_reliance_1908': 'Reasonable Reliance (CACI 1908)',
      'real_estate_seller_nondisclosure_1910': 'Real Estate Seller\'s Nondisclosure of Material Facts (CACI 1910)',
      'buyer_damages_property_1920': 'Buyer\'s Damages for Purchase or Acquisition of Property (CACI 1920)',
      'buyer_damages_lost_profits_1921': 'Buyer\'s Damages for Purchase or Acquisition of Property—Lost Profits (CACI 1921)',
      'seller_damages_property_1922': 'Seller\'s Damages for Sale or Exchange of Property (CACI 1922)',
      'damages_out_of_pocket_1923': 'Damages—"Out of Pocket" Rule (CACI 1923)',
      'damages_benefit_bargain_1924': 'Damages—"Benefit of the Bargain" Rule (CACI 1924)',
      'affirmative_defense_sol_fraud_1925': 'Affirmative Defense—Statute of Limitations—Fraud or Mistake (CACI 1925)',
      // Series 2000 - Trespass
      'trespass_essential_2000': 'Trespass—Essential Factual Elements (CACI 2000)',
      'trespass_extrahazardous_2001': 'Trespass—Extrahazardous Activities (CACI 2001)',
      'trespass_timber_2002': 'Trespass to Timber—Essential Factual Elements (CACI 2002)',
      'damage_timber_willful_2003': 'Damage to Timber—Willful and Malicious Conduct (CACI 2003)',
      'intentional_entry_explained_2004': '"Intentional Entry" Explained (CACI 2004)',
      'affirmative_defense_necessity_2005': 'Affirmative Defense—Necessity (CACI 2005)',
      'public_nuisance_2020': 'Public Nuisance—Essential Factual Elements (CACI 2020)',
      'private_nuisance_2021': 'Private Nuisance—Essential Factual Elements (CACI 2021)',
      'private_nuisance_balancing_2022': 'Private Nuisance—Balancing-Test Factors—Seriousness of Harm and Public Benefit (CACI 2022)',
      'failure_abate_artificial_condition_2023': 'Failure to Abate Artificial Condition on Land Creating Nuisance (CACI 2023)',
      'affirmative_defense_sol_trespass_2030': 'Affirmative Defense—Statute of Limitations—Trespass or Private Nuisance (CACI 2030)',
      'damages_annoyance_discomfort_2031': 'Damages for Annoyance and Discomfort—Trespass or Nuisance (CACI 2031)',
      // Series 2100 - Conversion
      'conversion_essential_2100': 'Conversion—Essential Factual Elements (CACI 2100)',
      'trespass_chattels_2101': 'Trespass to Chattels—Essential Factual Elements (CACI 2101)',
      'presumed_measure_damages_conversion_2102': 'Presumed Measure of Damages for Conversion (CACI 2102)',
      // Series 2200 - Economic Interference
      'inducing_breach_contract_2200': 'Inducing Breach of Contract (CACI 2200)',
      'intentional_interference_contractual_2201': 'Intentional Interference With Contractual Relations—Essential Factual Elements (CACI 2201)',
      'intentional_interference_prospective_2202': 'Intentional Interference With Prospective Economic Relations—Essential Factual Elements (CACI 2202)',
      'intent_2203': 'Intent (CACI 2203)',
      'negligent_interference_prospective_2204': 'Negligent Interference With Prospective Economic Relations (CACI 2204)',
      'intentional_interference_expected_inheritance_2205': 'Intentional Interference With Expected Inheritance—Essential Factual Elements (CACI 2205)',
      'affirmative_defense_privilege_economic_interest_2210': 'Affirmative Defense—Privilege to Protect Own Economic Interest (CACI 2210)',
      // Series 2300 - Insurance Litigation
      'breach_contractual_duty_pay_covered_claim_2300': 'Breach of Contractual Duty to Pay a Covered Claim—Essential Factual Elements (CACI 2300)',
      'breach_insurance_binder_2301': 'Breach of Insurance Binder—Essential Factual Elements (CACI 2301)',
      'breach_contract_temporary_life_insurance_2302': 'Breach of Contract for Temporary Life Insurance—Essential Factual Elements (CACI 2302)',
      'affirmative_defense_policy_exclusion_2303': 'Affirmative Defense—Insurance Policy Exclusion (CACI 2303)',
      'exception_policy_exclusion_2304': 'Exception to Insurance Policy Exclusion—Burden of Proof (CACI 2304)',
      'lost_destroyed_policy_2305': 'Lost or Destroyed Insurance Policy (CACI 2305)',
      'covered_excluded_risks_predominant_cause_2306': 'Covered and Excluded Risks—Predominant Cause of Loss (CACI 2306)',
      'insurance_agency_relationship_disputed_2307': 'Insurance Agency Relationship Disputed (CACI 2307)',
      'affirmative_defense_misrepresentation_concealment_2308': 'Affirmative Defense—Misrepresentation or Concealment in Insurance Application (CACI 2308)',
      'termination_policy_fraudulent_claim_2309': 'Termination of Insurance Policy for Fraudulent Claim (CACI 2309)',
      'affirmative_defense_failure_timely_notice_2320': 'Affirmative Defense—Failure to Provide Timely Notice (CACI 2320)',
      'affirmative_defense_breach_duty_cooperate_2321': 'Affirmative Defense—Insured\'s Breach of Duty to Cooperate in Defense (CACI 2321)',
      'affirmative_defense_voluntary_payment_2322': 'Affirmative Defense—Insured\'s Voluntary Payment (CACI 2322)',
      'implied_obligation_good_faith_explained_2330': 'Implied Obligation of Good Faith and Fair Dealing Explained (CACI 2330)',
      'breach_good_faith_failure_delay_payment_2331': 'Breach of the Implied Obligation of Good Faith and Fair Dealing—Failure or Delay in Payment (First Party)—Essential Factual Elements (CACI 2331)',
      'bad_faith_failure_investigate_2332': 'Bad Faith (First Party)—Failure to Properly Investigate Claim—Essential Factual Elements (CACI 2332)',
      'bad_faith_breach_duty_inform_2333': 'Bad Faith (First Party)—Breach of Duty to Inform Insured of Rights—Essential Factual Elements (CACI 2333)',
      'bad_faith_refusal_settlement_2334': 'Bad Faith (Third Party)—Refusal to Accept Reasonable Settlement Demand Within Liability Policy Limits—Essential Factual Elements (CACI 2334)',
      'bad_faith_advice_counsel_2335': 'Bad Faith—Advice of Counsel (CACI 2335)',
      'bad_faith_unreasonable_failure_defend_2336': 'Bad Faith (Third Party)—Unreasonable Failure to Defend—Essential Factual Elements (CACI 2336)',
      'factors_evaluating_insurer_conduct_2337': 'Factors to Consider in Evaluating Insurer\'s Conduct (CACI 2337)',
      'damages_bad_faith_2350': 'Damages for Bad Faith (CACI 2350)',
      'insurer_claim_reimbursement_defense_2351': 'Insurer\'s Claim for Reimbursement of Costs of Defense of Uncovered Claims (CACI 2351)',
      'judgment_creditor_action_insurer_2360': 'Judgment Creditor\'s Action Against Insurer—Essential Factual Elements (CACI 2360)',
      'negligent_failure_obtain_coverage_2361': 'Negligent Failure to Obtain Insurance Coverage—Essential Factual Elements (CACI 2361)',
      // Series 2400 - Wrongful Termination
      'breach_employment_contract_at_will_2400': 'Breach of Employment Contract—Unspecified Term—"At-Will" Presumption (CACI 2400)',
      'breach_employment_contract_actual_constructive_discharge_2401': 'Breach of Employment Contract—Unspecified Term—Actual or Constructive Discharge—Essential Factual Elements (CACI 2401)',
      'breach_employment_contract_implied_promise_not_discharge_2403': 'Breach of Employment Contract—Unspecified Term—Implied-in-Fact Promise Not to Discharge Without Good Cause (CACI 2403)',
      'breach_employment_contract_good_cause_defined_2404': 'Breach of Employment Contract—Unspecified Term—"Good Cause" Defined (CACI 2404)',
      'breach_implied_employment_contract_good_cause_misconduct_2405': 'Breach of Implied Employment Contract—Unspecified Term—"Good Cause" Defined—Misconduct (CACI 2405)',
      'breach_employment_contract_damages_2406': 'Breach of Employment Contract—Unspecified Term—Damages (CACI 2406)',
      'breach_employment_contract_specified_term_2420': 'Breach of Employment Contract—Specified Term—Essential Factual Elements (CACI 2420)',
      'breach_employment_contract_specified_term_good_cause_defense_2421': 'Breach of Employment Contract—Specified Term—Good-Cause Defense (CACI 2421)',
      'breach_employment_contract_specified_term_damages_2422': 'Breach of Employment Contract—Specified Term—Damages (CACI 2422)',
      'breach_implied_covenant_good_faith_employment_2423': 'Breach of Implied Covenant of Good Faith and Fair Dealing—Employment Contract—Essential Factual Elements (CACI 2423)',
      'affirmative_defense_good_faith_mistaken_belief_2424': 'Affirmative Defense—Breach of the Implied Covenant of Good Faith and Fair Dealing—Good Faith Though Mistaken Belief (CACI 2424)',
      'wrongful_discharge_public_policy_2430': 'Wrongful Discharge in Violation of Public Policy—Essential Factual Elements (CACI 2430)',
      'constructive_discharge_public_policy_required_violate_2431': 'Constructive Discharge in Violation of Public Policy—Plaintiff Required to Violate Public Policy (CACI 2431)',
      'constructive_discharge_public_policy_intolerable_conditions_2432': 'Constructive Discharge in Violation of Public Policy—Plaintiff Required to Endure Intolerable Conditions That Violate Public Policy (CACI 2432)',
      'discrimination_military_2441': 'Discrimination Against Member of Military—Essential Factual Elements (CACI 2441)',
      // Series 2500 - Fair Employment and Housing Act
      'disparate_treatment_2500': 'Disparate Treatment—Essential Factual Elements (CACI 2500)',
      'affirmative_defense_bfoq_2501': 'Affirmative Defense—Bona fide Occupational Qualification (CACI 2501)',
      'disparate_impact_2502': 'Disparate Impact—Essential Factual Elements (CACI 2502)',
      'affirmative_defense_business_necessity_2503': 'Affirmative Defense—Business Necessity/Job Relatedness (CACI 2503)',
      'disparate_impact_rebuttal_business_necessity_2504': 'Disparate Impact—Rebuttal to Business Necessity/Job Relatedness Defense (CACI 2504)',
      'retaliation_2505': 'Retaliation—Essential Factual Elements (CACI 2505)',
      'limitation_remedies_after_acquired_evidence_2506': 'Limitation on Remedies—After-Acquired Evidence (CACI 2506)',
      'substantial_motivating_reason_explained_2507': '"Substantial Motivating Reason" Explained (CACI 2507)',
      'failure_file_timely_complaint_continuing_violation_2508': 'Failure to File Timely Administrative Complaint—Plaintiff Alleges Continuing Violation (CACI 2508)',
      'adverse_employment_action_explained_2509': '"Adverse Employment Action" Explained (CACI 2509)',
      'constructive_discharge_explained_2510': '"Constructive Discharge" Explained (CACI 2510)',
      'adverse_action_decision_maker_without_animus_2511': 'Adverse Action Made by Decision Maker Without Animus (CACI 2511)',
      'limitation_remedies_same_decision_2512': 'Limitation on Remedies—Same Decision (CACI 2512)',
      'business_judgment_at_will_employment_2513': 'Business Judgment for "At-Will" Employment (CACI 2513)',
      'quid_pro_quo_sexual_harassment_2520': 'Quid pro quo Sexual Harassment—Essential Factual Elements (CACI 2520)',
      'work_environment_harassment_conduct_plaintiff_employer_2521a': 'Work Environment Harassment—Conduct Directed at Plaintiff—Essential Factual Elements—Employer or Entity Defendant (CACI 2521A)',
      'work_environment_harassment_conduct_others_employer_2521b': 'Work Environment Harassment—Conduct Directed at Others—Essential Factual Elements—Employer or Entity Defendant (CACI 2521B)',
      'work_environment_harassment_sexual_favoritism_employer_2521c': 'Work Environment Harassment—Sexual Favoritism—Essential Factual Elements—Employer or Entity Defendant (CACI 2521C)',
      'work_environment_harassment_conduct_plaintiff_individual_2522a': 'Work Environment Harassment—Conduct Directed at Plaintiff—Essential Factual Elements—Individual Defendant (CACI 2522A)',
      'work_environment_harassment_conduct_others_individual_2522b': 'Work Environment Harassment—Conduct Directed at Others—Essential Factual Elements—Individual Defendant (CACI 2522B)',
      'work_environment_harassment_sexual_favoritism_individual_2522c': 'Work Environment Harassment—Sexual Favoritism—Essential Factual Elements—Individual Defendant (CACI 2522C)',
      'harassing_conduct_explained_2523': '"Harassing Conduct" Explained (CACI 2523)',
      'severe_or_pervasive_explained_2524': '"Severe or Pervasive" Explained (CACI 2524)',
      'harassment_supervisor_defined_2525': 'Harassment—"Supervisor" Defined (CACI 2525)',
      'affirmative_defense_avoidable_consequences_2526': 'Affirmative Defense—Avoidable Consequences Doctrine (CACI 2526)',
      'failure_prevent_harassment_discrimination_retaliation_2527': 'Failure to Prevent Harassment, Discrimination, or Retaliation—Essential Factual Elements—Employer or Entity Defendant (CACI 2527)',
      'failure_prevent_harassment_nonemployee_2528': 'Failure to Prevent Harassment by Nonemployee (CACI 2528)',
      'disability_discrimination_disparate_treatment_2540': 'Disability Discrimination—Disparate Treatment—Essential Factual Elements (CACI 2540)',
      'disability_discrimination_reasonable_accommodation_2541': 'Disability Discrimination—Reasonable Accommodation—Essential Factual Elements (CACI 2541)',
      'disability_discrimination_reasonable_accommodation_explained_2542': 'Disability Discrimination—"Reasonable Accommodation" Explained (CACI 2542)',
      'disability_discrimination_essential_job_duties_2543': 'Disability Discrimination—"Essential Job Duties" Explained (CACI 2543)',
      'disability_discrimination_affirmative_defense_health_safety_2544': 'Disability Discrimination—Affirmative Defense—Health or Safety Risk (CACI 2544)',
      'disability_discrimination_affirmative_defense_undue_hardship_2545': 'Disability Discrimination—Affirmative Defense—Undue Hardship (CACI 2545)',
      'disability_discrimination_failure_interactive_process_2546': 'Disability Discrimination—Reasonable Accommodation—Failure to Engage in Interactive Process (CACI 2546)',
      'disability_associational_discrimination_2547': 'Disability-Based Associational Discrimination—Essential Factual Elements (CACI 2547)',
      'disability_discrimination_refusal_accommodation_housing_2548': 'Disability Discrimination—Refusal to Make Reasonable Accommodation in Housing (CACI 2548)',
      'disability_discrimination_refusal_modification_housing_2549': 'Disability Discrimination—Refusal to Permit Reasonable Modification to Housing Unit (CACI 2549)',
      'religious_creed_discrimination_failure_accommodate_2560': 'Religious Creed Discrimination—Failure to Accommodate—Essential Factual Elements (CACI 2560)',
      'religious_creed_discrimination_undue_hardship_2561': 'Religious Creed Discrimination—Reasonable Accommodation—Affirmative Defense—Undue Hardship (CACI 2561)',
      'age_discrimination_disparate_treatment_2570': 'Age Discrimination—Disparate Treatment—Essential Factual Elements (CACI 2570)',
      'pregnancy_discrimination_failure_accommodate_2580': 'Pregnancy Discrimination—Failure to Accommodate—Essential Factual Elements (CACI 2580)',
      'pregnancy_discrimination_reasonable_accommodation_explained_2581': 'Pregnancy Discrimination—"Reasonable Accommodation" Explained (CACI 2581)',
      // Series 2600 - California Family Rights Act
      'violation_cfra_rights_2600': 'Violation of CFRA Rights—Essential Factual Elements (CACI 2600)',
      'eligibility_cfra_2601': 'Eligibility (CACI 2601)',
      'reasonable_notice_cfra_2602': 'Reasonable Notice by Employee of Need for CFRA Leave (CACI 2602)',
      'comparable_job_explained_2603': '"Comparable Job" Explained (CACI 2603)',
      'affirmative_defense_no_certification_2610': 'Affirmative Defense—No Certification From Health Care Provider (CACI 2610)',
      'affirmative_defense_fitness_duty_2611': 'Affirmative Defense—Fitness for Duty Statement (CACI 2611)',
      'affirmative_defense_employment_would_ceased_2612': 'Affirmative Defense—Employment Would Have Ceased (CACI 2612)',
      'cfra_retaliation_2620': 'CFRA Rights Retaliation—Essential Factual Elements (CACI 2620)',
    }

    // Build causes of action instruction with proper names
    let causesInstruction = ''
    
    if (causesOfAction && causesOfAction.length > 0) {
      // User manually selected specific causes
      causesInstruction = `\n\nSPECIFIC CAUSES OF ACTION REQUESTED: ${causesOfAction.map((id: string) => causeIdToNameMap[id] || id.toUpperCase()).join(', ')}\nInclude ONLY these causes of action in the complaint, structured according to their respective CACI elements.`
    } else if (availableCauses && availableCauses.length > 0) {
      // AI should analyze facts and select from all available causes
      const causesListForAI = availableCauses.map((cause: { name: string; caciSeries: string; description: string; elements: string[] }) => 
        `- ${cause.name} (${cause.caciSeries}): ${cause.description}. Required Elements: [${cause.elements.join('; ')}]`
      ).join('\n')
      
      causesInstruction = `

AVAILABLE CAUSES OF ACTION - ANALYZE AND SELECT APPROPRIATE ONES:
${causesListForAI}

AI INSTRUCTION: Based on the case facts provided above, carefully analyze and SELECT the most appropriate causes of action from this list. 
- Choose 3-6+ causes when the facts support multiple legal theories
- For each cause you select, verify that the case facts satisfy ALL required elements listed
- Only include causes where the facts reasonably support each element
- Prioritize the strongest causes that best fit the facts
- Include overlapping theories where applicable (e.g., negligence + negligence per se, or strict liability + negligent products liability)`
    } else {
      // Fallback to generic auto-determine
      causesInstruction = '\n\nAUTO-DETERMINE CAUSES: Analyze the facts and determine the most appropriate causes of action from the available CACI options.'
    }

    // Build attorney information for header
    const attorneyInfo = attorneys && attorneys.length > 0 
      ? attorneys.map((attorney: any) => ({
          name: attorney.name?.trim() || '[ATTORNEY NAME]',
          email: attorney.email?.trim() || '[EMAIL]',
          barNumber: attorney.barNumber?.trim() || '[BAR NUMBER]',
          lawFirmName: attorney.lawFirmName?.trim() || '[LAW FIRM NAME]',
          lawFirmAddress: attorney.lawFirmAddress?.trim() || '[ADDRESS]\n[CITY, STATE ZIP]',
          lawFirmPhone: attorney.lawFirmPhone?.trim() || '[PHONE]'
        }))
      : [{ 
          name: '[ATTORNEY NAME]', 
          email: '[EMAIL]', 
          barNumber: '[BAR NUMBER]',
          lawFirmName: '[LAW FIRM NAME]',
          lawFirmAddress: '[ADDRESS]\n[CITY, STATE ZIP]',
          lawFirmPhone: '[PHONE]'
        }]

    // Create plaintiff names string
    const plaintiffNames = plaintiffs && plaintiffs.length > 0 
      ? plaintiffs.map((p: any) => p.name?.trim()).filter(Boolean).join(', ')
      : 'Plaintiff'

    // Create defendant names string
    const defendantNames = defendants && defendants.length > 0
      ? defendants.map((d: any) => d.name?.trim()).filter(Boolean).join(', ')
      : 'Defendant'

    // Determine document type based on representation
    const isDefendantRepresentation = representationType === 'defendant'
    const documentType = isDefendantRepresentation ? 'CROSS-COMPLAINT' : 'COMPLAINT'
    const clientParty = isDefendantRepresentation ? defendantNames : plaintiffNames
    const attorneyForText = isDefendantRepresentation ? `Attorney for Defendant/Cross-Complainant ${clientParty}` : `Attorney for Plaintiff ${clientParty}`

    const attorneyHeader = attorneyInfo
      .map((attorney: { name: string; email: string; barNumber: string; lawFirmName: string; lawFirmAddress: string; lawFirmPhone: string }, index: number) => 
        `${attorney.name} (California State Bar No. ${attorney.barNumber})\n${attorney.email}\n${attorney.lawFirmName}\n${attorney.lawFirmAddress}\nTelephone: ${attorney.lawFirmPhone}${index === 0 ? `\n\n${attorneyForText}` : ''}`
      ).join('\n\n')

    // Build representation context for AI
    const representationContext = isDefendantRepresentation 
      ? `IMPORTANT: This is a CROSS-COMPLAINT filed by the DEFENDANT(S) against the PLAINTIFF(S). The attorney represents ${defendantNames} (the defendant/cross-complainant). Generate a cross-complaint with appropriate causes of action that a defendant would assert against the plaintiff.`
      : `This is a COMPLAINT filed by the PLAINTIFF(S) against the DEFENDANT(S). The attorney represents ${plaintiffNames} (the plaintiff).`

    const prompt = `Generate comprehensive California Superior Court ${documentType} with MULTIPLE causes of action. ABSOLUTE REQUIREMENT: Include 3-6+ causes of action when facts support them. DO NOT LIMIT TO 1-2 CAUSES.

${representationContext}

FACTS: ${sanitizedSummary}${causesInstruction}

MANDATORY MULTI-CAUSE ANALYSIS - Check ALL these CACI options against the facts:
• NEGLIGENCE (CACI 400) • NEGLIGENCE PER SE (CACI 418-421) • GROSS NEGLIGENCE (CACI 425)
• RES IPSA LOQUITUR (CACI 417) • NEGLIGENT HIRING/SUPERVISION (CACI 426)
• NEGLIGENT UNDERTAKING (CACI 450C) • DRAM SHOP LIABILITY (CACI 422, 427)
• DOG BITE STRICT LIABILITY (CACI 463) • DANGEROUS ANIMAL LIABILITY (CACI 462)
• PREMISES LIABILITY (CACI 1000-1012) • DANGEROUS CONDITION PUBLIC PROPERTY (CACI 1100-1126)
• PRODUCTS LIABILITY (CACI 1200-1233) • MOTOR VEHICLE (CACI 700-732)
• MEDICAL MALPRACTICE (CACI 500) • MEDICAL BATTERY (CACI 530A) • LACK OF INFORMED CONSENT (CACI 533)
• HOSPITAL NEGLIGENCE (CACI 514-516) • WRONGFUL BIRTH (CACI 511-512) • ABANDONMENT (CACI 509)
• PROFESSIONAL NEGLIGENCE/LEGAL MALPRACTICE (CACI 600-606)
• COMMON CARRIERS (CACI 900-908) • RAILROAD CROSSINGS (CACI 800-806)
• BATTERY (CACI 1300) • ASSAULT (CACI 1301) • IIED (CACI 1600) • NIED (CACI 1620)
• BREACH CONTRACT (CACI 303) • BREACH IMPLIED COVENANT GOOD FAITH (CACI 325) 
• THIRD PARTY BENEFICIARY (CACI 301) • BREACH IMPLIED DUTY REASONABLE CARE (CACI 328)
• FRAUD (CACI 1900) • CONCEALMENT (CACI 1901) • FALSE PROMISE (CACI 1902) • NEGLIGENT MISREP (CACI 1903)
• UNFAIR BUSINESS PRACTICES (B&P 17200) • CONVERSION (CACI 2100) • TRESPASS TO CHATTELS (CACI 2101)
• TRESPASS (CACI 2000) • NUISANCE (CACI 2020-2021) • DEFAMATION (CACI 1700-1731) • INVASION PRIVACY (CACI 1800-1821)
• ECONOMIC INTERFERENCE (CACI 2200-2205) - tortious interference with contract/prospective relations
• INSURANCE BAD FAITH (CACI 2300-2361) - breach of duty, failure to pay, bad faith claims handling
• WRONGFUL TERMINATION (CACI 2400-2432) - breach of employment contract, violation of public policy
• FEHA DISCRIMINATION (CACI 2500-2513) - race, sex, age, disability, religion, national origin discrimination
• FEHA HARASSMENT (CACI 2520-2528) - quid pro quo, hostile work environment, failure to prevent
• FEHA RETALIATION (CACI 2505) - retaliation for protected activity
• DISABILITY DISCRIMINATION (CACI 2540-2549) - failure to accommodate, interactive process
• CFRA VIOLATIONS (CACI 2600-2620) - family leave interference and retaliation
• WHISTLEBLOWER RETALIATION (Labor Code 1102.5) • WAGE & HOUR VIOLATIONS (Labor Code)
• PUNITIVE DAMAGES (CACI 3940-3949) - for malicious, oppressive, or fraudulent conduct

NEGLIGENCE CAUSES - COMPREHENSIVE CACI 400-473 ANALYSIS:
When facts involve negligence or personal injury, consider ALL applicable negligence theories:
• CACI 400: Negligence—Essential Factual Elements (duty, breach, causation, damages)
• CACI 401-405: Standards of Care (basic, minors, physical disability, intoxication)
• CACI 411-416: Special Duty Situations (children, custom/practice, dangerous situations, employees in danger)
• CACI 417: Res Ipsa Loquitur (inference of negligence from circumstances)
• CACI 418-421: Negligence Per Se (violation of statute creating presumption)
• CACI 422, 427: Dram Shop Liability (furnishing alcohol to minors or intoxicated persons)
• CACI 423: Public Entity Liability for Failure to Perform Mandatory Duty
• CACI 425: Gross Negligence (extreme departure from standard of care)
• CACI 426: Negligent Hiring, Supervision, or Retention of Employee
• CACI 429: Negligent Sexual Transmission of Disease
• CACI 430-431, 434-435: Causation Theories (substantial factor, multiple causes, alternative causation)
• CACI 440-441: Law Enforcement Negligence (nondeadly and deadly force)
• CACI 450A-450C: Good Samaritan and Negligent Undertaking
• CACI 460: Strict Liability for Ultrahazardous Activities
• CACI 461-462: Strict Liability for Wild Animals and Dangerous Domestic Animals
• CACI 463: Dog Bite Statute (strict liability - no prior knowledge required)
• CACI 470-473: Primary Assumption of Risk (sports, instructors, facilities)
• Consider comparative fault (CACI 405), apportionment (CACI 406), sudden emergency (CACI 452)
• Consider affirmative defenses and address preemptively if applicable

MEDICAL MALPRACTICE CAUSES - COMPREHENSIVE CACI 500-535 ANALYSIS:
When facts involve medical care or healthcare providers, consider ALL applicable medical negligence theories:
• CACI 500: Medical Negligence—Essential Factual Elements (duty, standard of care, breach, causation, damages)
• CACI 501-504: Standards of Care (health care professionals, specialists, psychotherapists, nurses)
• CACI 505-508: Physician Duties (success not required, alternative methods, duty to warn, duty to refer)
• CACI 509: Abandonment of Patient
• CACI 510: Derivative Liability of Surgeon
• CACI 511-513: Wrongful Birth and Wrongful Life
• CACI 514-516: Hospital Liability (duty of hospital, safe environment, screen medical staff)
• CACI 517: Patient's Duty to Provide for Own Well-Being (affirmative defense)
• CACI 518: Medical Malpractice Res Ipsa Loquitur
• CACI 530A-530B: Medical Battery (unauthorized treatment or conditional consent)
• CACI 531-533: Informed Consent (consent on behalf of another, definition, failure to obtain)
• CACI 534-535: Informed Refusal and Risks of Nontreatment
• For medical cases with intentional conduct, consider medical battery (CACI 530A) alongside medical negligence
• For surgical errors or unexplained injuries, consider medical res ipsa loquitur (CACI 518)
• For hospital cases, consider hospital negligence (CACI 514-516) separate from physician negligence
• Consider overlapping theories: medical negligence + lack of informed consent + medical battery

CONTRACT CAUSES - COMPREHENSIVE CACI 300-SERIES ANALYSIS:
When facts involve contractual relationships, consider ALL applicable contract theories:
• CACI 303: Breach of Contract (written, oral, or implied-in-fact)
• CACI 304: Oral or Written Contract Terms
• CACI 305: Implied-in-Fact Contract
• CACI 306: Unformalized Agreement
• CACI 301: Third-Party Beneficiary
• CACI 325: Breach of Implied Covenant of Good Faith and Fair Dealing
• CACI 328: Breach of Implied Duty to Perform With Reasonable Care
• CACI 324: Anticipatory Breach
• CACI 312: Substantial Performance
• CACI 313: Modification
• CACI 314-321: Contract Interpretation issues
• CACI 321-323: Condition Precedent issues
• CACI 326-327: Assignment issues
• Consider affirmative defenses (CACI 330-338) and address preemptively if applicable

PREMISES LIABILITY CAUSES - COMPREHENSIVE CACI 1000-1012 ANALYSIS:
When facts involve dangerous conditions on private property or landlord-tenant situations, consider ALL applicable premises liability theories:
• CACI 1000: Premises Liability—Essential Factual Elements (owned/controlled property, negligent, plaintiff harmed, causation)
• CACI 1001: Basic Duty of Care (duty to eliminate dangerous conditions or warn)
• CACI 1002-1003: Extent of Control and Unsafe Conditions
• CACI 1004: Obviously Unsafe Conditions (open and apparent dangers)
• CACI 1005: Business Proprietor's Liability for Criminal Conduct of Others (foreseeability of third-party criminal acts)
• CACI 1006: Landlord's Duty (control, knowledge, failure to repair)
• CACI 1007-1008: Sidewalk Liability (abutting property, altered sidewalk)
• CACI 1009A-1009D: Liability to Employees of Independent Contractors (concealed conditions, retained control, defective equipment)
• CACI 1010: Recreation Immunity (affirmative defense for recreational use)
• CACI 1011: Constructive Notice (condition present long enough for reasonable inspection to discover)
• CACI 1012: Knowledge of Employee Imputed to Owner
• For slip-and-fall cases, consider constructive notice (CACI 1011) and employee knowledge (CACI 1012)
• For security incidents, consider CACI 1005 (criminal conduct of others) - requires foreseeability
• For landlord cases, consider CACI 1006 separate from general premises liability
• For contractor injury cases, consider CACI 1009A-1009D theories

DANGEROUS CONDITION OF PUBLIC PROPERTY - COMPREHENSIVE CACI 1100-1126 ANALYSIS:
When facts involve dangerous conditions on government-owned property (streets, sidewalks, parks, public facilities), consider ALL applicable public entity liability theories:
• CACI 1100: Dangerous Condition on Public Property—Essential Factual Elements (public property, dangerous condition, employee negligent, actual/constructive notice, causation, damages)
• CACI 1101-1102: Control and Definition of Dangerous Condition
• CACI 1103: Notice (actual or constructive, sufficient time to correct)
• CACI 1104: Inspection System (reasonable inspection would have discovered)
• CACI 1110-1112: Affirmative Defenses (natural conditions, reasonable act/omission, reasonable decision not to correct)
• CACI 1120-1121: Failure to Provide Traffic Control Signals or Warning Signs
• CACI 1122: Weather Conditions Defense (immunity for weather-related road conditions)
• CACI 1123-1124: Design Immunity (approved design with discretionary approval) and Loss of Design Immunity (changed conditions)
• CACI 1125: Conditions on Adjacent Property
• CACI 1126: Failure to Warn of Dangerous Roadway Condition from Approved Design
• For trip-and-fall on public sidewalks, consider CACI 1100 with notice requirements (CACI 1103-1104)
• For roadway defects, consider traffic control/warning requirements (CACI 1120-1121) and design immunity issues (CACI 1123-1124)
• For government facility incidents, analyze notice (CACI 1103) and inspection system (CACI 1104)
• Address design immunity (CACI 1123) preemptively if applicable, and argue loss of immunity (CACI 1124) if conditions changed

PRODUCTS LIABILITY CAUSES - COMPREHENSIVE CACI 1200-1233 ANALYSIS:
When facts involve defective products causing injury, consider ALL applicable products liability theories:
• CACI 1200-1202: Strict Liability—Manufacturing Defect (product differs from intended design)
• CACI 1203: Strict Liability—Design Defect—Consumer Expectation Test (failed to perform as safely as expected)
• CACI 1204: Strict Liability—Design Defect—Risk-Benefit Test (risks outweigh benefits, safer alternative design)
• CACI 1205: Strict Liability—Failure to Warn (inadequate warnings of known/knowable risks)
• CACI 1206: Strict Liability—Failure to Warn—Products Containing Allergens
• CACI 1207A-1207B: Comparative Fault (plaintiff or third person)
• CACI 1208: Component Parts Rule
• CACI 1220-1221: Negligence—Essential Elements and Basic Standard of Care for manufacturers
• CACI 1222: Negligence—Duty to Warn (known or should have known of risk)
• CACI 1223: Negligence—Recall/Retrofit (discovered danger, duty to recall)
• CACI 1224: Negligence—Product Rental/Standard of Care
• CACI 1230: Express Warranty (product failed to conform to warranty)
• CACI 1231: Implied Warranty of Merchantability (not fit for ordinary purposes)
• CACI 1232: Implied Warranty of Fitness for Particular Purpose (reliance on seller expertise)
• CACI 1233: Implied Warranty of Merchantability for Food (not wholesome/fit for consumption)
• For defective products, consider OVERLAPPING theories: strict liability (CACI 1200-1206) + negligence (CACI 1220-1224) + breach of warranty (CACI 1230-1233)
• For design defects, plead alternative theories: consumer expectation test (CACI 1203) AND risk-benefit test (CACI 1204)
• For manufacturing defects, consider strict liability (CACI 1201-1202) - no need to prove negligence
• For warning defects, consider both strict liability failure to warn (CACI 1205) AND negligent failure to warn (CACI 1222)
• For food products, consider CACI 1233 (implied warranty for food) in addition to other theories

EMPLOYMENT CAUSES - COMPREHENSIVE CACI 2400-2600 ANALYSIS:
When facts involve employment, workplace issues, termination, discrimination, harassment, or retaliation, consider ALL applicable employment theories:
• CACI 2400-2406: Wrongful Termination—At-Will Employment (breach of implied promise not to discharge without good cause)
• CACI 2420-2422: Wrongful Termination—Specified Term Contract (breach of employment contract with specified term)
• CACI 2423-2424: Breach of Implied Covenant of Good Faith and Fair Dealing—Employment
• CACI 2430: Wrongful Discharge in Violation of Public Policy (Tameny claim)
• CACI 2431-2432: Constructive Discharge in Violation of Public Policy (forced to violate policy or endure intolerable conditions)
• CACI 2500-2513: FEHA Disparate Treatment Discrimination (race, sex, age, disability, religion, national origin, sexual orientation, gender identity)
• CACI 2502-2504: FEHA Disparate Impact (facially neutral policy with discriminatory effect)
• CACI 2505: Retaliation for Protected Activity (opposing discrimination, filing complaint, participating in investigation)
• CACI 2520: Quid Pro Quo Sexual Harassment (job benefits conditioned on sexual favors)
• CACI 2521A-2521C: Hostile Work Environment Harassment—Employer Liability (severe or pervasive conduct)
• CACI 2522A-2522C: Hostile Work Environment Harassment—Individual Defendant Liability
• CACI 2527: Failure to Prevent Harassment, Discrimination, or Retaliation (employer knew and failed to take corrective action)
• CACI 2528: Failure to Prevent Harassment by Nonemployee
• CACI 2540-2549: Disability Discrimination and Failure to Accommodate
• CACI 2546: Failure to Engage in Interactive Process (disability accommodation)
• CACI 2560-2561: Religious Creed Discrimination and Failure to Accommodate
• CACI 2570: Age Discrimination (FEHA—40+ years old)
• CACI 2580-2581: Pregnancy Discrimination and Failure to Accommodate
• CACI 2600-2612: CFRA Violations (denial of family/medical leave, failure to reinstate)
• CACI 2620: CFRA Retaliation (retaliation for requesting or taking leave)
• Labor Code 1102.5: Whistleblower Retaliation (reporting violations of law)
• Labor Code violations: Wage theft, unpaid overtime, meal/rest break violations, final pay penalties
• For employment cases, consider OVERLAPPING theories: wrongful termination + FEHA discrimination + retaliation + failure to prevent
• For harassment cases, consider BOTH employer vicarious liability (CACI 2521) AND individual harasser liability (CACI 2522)
• ALWAYS include failure to prevent claim (CACI 2527) when harassment, discrimination, or retaliation is alleged
• For disability cases, include failure to accommodate (CACI 2541) AND failure to engage in interactive process (CACI 2546)

PROFESSIONAL NEGLIGENCE/LEGAL MALPRACTICE - COMPREHENSIVE CACI 600-606 ANALYSIS:
When facts involve attorneys, accountants, architects, engineers, or other professionals, consider ALL applicable professional negligence theories:
• CACI 600: Standard of Care for Professionals (knowledge and skill ordinarily possessed by members of profession)
• CACI 601: Legal Malpractice—Causation (but for attorney's negligence, client would have obtained better result)
• CACI 602: Success Not Required (attorney not liable for error in judgment if reasonably skillful)
• CACI 603: Alternative Legal Decisions or Strategies (attorney exercised reasonable judgment)
• CACI 604: Referral to Legal Specialist (duty to refer if matter beyond competence)
• CACI 606: Legal Malpractice Causing Criminal Conviction—Actual Innocence
• For legal malpractice, prove: attorney-client relationship, breach of standard of care, causation (case-within-a-case), damages
• Consider breach of fiduciary duty in addition to professional negligence

INSURANCE BAD FAITH - COMPREHENSIVE CACI 2300-2361 ANALYSIS:
When facts involve insurance claims, denials, delays, or coverage disputes, consider ALL applicable insurance theories:
• CACI 2300: Breach of Contractual Duty to Pay a Covered Claim (first-party coverage dispute)
• CACI 2301-2302: Breach of Insurance Binder or Temporary Life Insurance
• CACI 2303-2306: Policy Exclusions and Coverage Issues
• CACI 2330: Implied Obligation of Good Faith and Fair Dealing (insurer must give equal consideration to insured's interests)
• CACI 2331: Bad Faith—Failure or Delay in Payment (unreasonable denial or delay of covered claim)
• CACI 2332: Bad Faith—Failure to Properly Investigate Claim
• CACI 2333: Bad Faith—Breach of Duty to Inform Insured of Rights
• CACI 2334: Bad Faith (Third Party)—Refusal to Accept Reasonable Settlement Within Policy Limits
• CACI 2336: Bad Faith—Unreasonable Failure to Defend
• CACI 2337: Factors to Consider in Evaluating Insurer's Conduct
• CACI 2350: Damages for Bad Faith (includes emotional distress and punitive damages)
• CACI 2360: Judgment Creditor's Action Against Insurer
• CACI 2361: Negligent Failure to Obtain Insurance Coverage (against broker/agent)
• For insurance bad faith, consider breach of contract + breach of implied covenant + bad faith tort
• Include punitive damages when insurer's conduct is oppressive, fraudulent, or malicious

ECONOMIC INTERFERENCE - COMPREHENSIVE CACI 2200-2210 ANALYSIS:
When facts involve interference with business relationships or contracts, consider ALL applicable economic interference theories:
• CACI 2200: Inducing Breach of Contract (defendant intentionally induced breach of plaintiff's contract with third party)
• CACI 2201: Intentional Interference With Contractual Relations (knew of contract, intentional acts, breach/disruption, damages)
• CACI 2202: Intentional Interference With Prospective Economic Relations (knew of relationship, intentional wrongful conduct, disrupted relationship, damages)
• CACI 2203: Intent (specific intent to interfere or knowledge that interference was substantially certain)
• CACI 2204: Negligent Interference With Prospective Economic Relations
• CACI 2205: Intentional Interference With Expected Inheritance
• CACI 2210: Affirmative Defense—Privilege to Protect Own Economic Interest
• For tortious interference, the defendant's conduct must be independently wrongful (crime, tort, or violation of statute)

DEFAMATION - COMPREHENSIVE CACI 1700-1731 ANALYSIS:
When facts involve false statements harming reputation, consider ALL applicable defamation theories:
• CACI 1700-1701: Defamation—Public Figure (actual malice required—knowledge of falsity or reckless disregard)
• CACI 1702-1703: Defamation—Private Figure/Public Concern (negligence standard)
• CACI 1704-1705: Defamation—Private Figure/Private Concern (strict liability for falsity)
• CACI 1706-1707: Definition of Statement and Fact vs. Opinion
• CACI 1708: Coerced Self-Publication (defamation by forcing plaintiff to repeat statement)
• CACI 1720-1724: Affirmative Defenses (truth, consent, privileges)
• CACI 1730: Slander of Title
• CACI 1731: Trade Libel (false statements about business/product quality)
• For defamation per se (imputing crime, loathsome disease, professional incompetence, sexual misconduct), damages are presumed
• For defamation per quod, must prove special damages

ATTORNEY HEADER TO USE:
${attorneyHeader}

COURT AND COUNTY INFORMATION:
Filing County: ${county || '[COUNTY NAME]'}
Court: Superior Court of California, County of ${county ? county.toUpperCase() : '[COUNTY NAME]'}

PLAINTIFF INFORMATION:
${plaintiffs && plaintiffs.length > 0 
  ? plaintiffs.map((p: any) => p.name?.trim()).filter(Boolean).join(', ') || '[PLAINTIFF NAME]'
  : '[PLAINTIFF NAME]'}

DEFENDANT INFORMATION:
${defendants && defendants.length > 0 
  ? defendants.map((d: any) => d.name?.trim()).filter(Boolean).join(', ') || '[DEFENDANT NAME]'
  : '[DEFENDANT NAME]'}

CASE NUMBER:
${caseNumber?.trim() || '[CASE NUMBER]'}

CRITICAL INSTRUCTION - START THE COMPLAINT WITH THIS EXACT ATTORNEY HEADER:
${attorneyHeader}

STRUCTURE - COMPLETE FULL COMPLAINT (START WITH ATTORNEY HEADER ABOVE):
1. BEGIN WITH: Use the exact attorney header shown above - DO NOT use any other attorney information like "RANDY LENO" or placeholder text
2. Court header and case caption (SUPERIOR COURT OF CALIFORNIA, COUNTY OF ${county ? county.toUpperCase() : '[COUNTY NAME]'})
3. CRITICAL - Use these EXACT party names in the case caption:
   PLAINTIFFS: ${plaintiffs && plaintiffs.length > 0 ? plaintiffs.map((p: any) => p.name?.trim()).filter(Boolean).join(', ') : '[PLAINTIFF NAME]'}
   DEFENDANTS: ${defendants && defendants.length > 0 ? defendants.map((d: any) => d.name?.trim()).filter(Boolean).join(', ') : '[DEFENDANT NAME]'}
   
   Format the case caption exactly like this:
   ${plaintiffs && plaintiffs.length > 0 ? plaintiffs.map((p: any) => p.name?.trim()).filter(Boolean).join(',\n') : '[PLAINTIFF NAME]'},
   
                        Plaintiff${plaintiffs && plaintiffs.length > 1 ? 's' : ''},
   
   vs.
   
   ${defendants && defendants.length > 0 ? defendants.map((d: any) => d.name?.trim()).filter(Boolean).join(',\n') : '[DEFENDANT NAME]'},
   
                        Defendant${defendants && defendants.length > 1 ? 's' : ''}.

4. Case number: ${caseNumber?.trim() || '[CASE NUMBER]'}
5. ${documentType} title
6. Jurisdictional allegations (paragraphs 1-3)
7. **MANDATORY SECTION** - "GENERAL FACTUAL ALLEGATIONS" heading (EXACTLY this heading in ALL CAPS) followed by paragraphs 4-10+ containing all factual allegations common to all causes of action
8. FIRST CAUSE OF ACTION (Name - CACI XXX)
9. SECOND CAUSE OF ACTION (Name - CACI XXX)
10. THIRD CAUSE OF ACTION (Name - CACI XXX)
11. FOURTH CAUSE OF ACTION (Name - CACI XXX) [if applicable]
12. FIFTH CAUSE OF ACTION (Name - CACI XXX) [if applicable]
13. SIXTH CAUSE OF ACTION (Name - CACI XXX) [if applicable]
14. Prayer for Relief (comprehensive)
15. Jury Demand

CALIFORNIA DEMURRER STANDARDS - CRITICAL:
California complaints must plead ULTIMATE FACTS sufficient to constitute a cause of action. Each cause of action must contain factual allegations that are:
1. SPECIFIC - Not vague or conclusory (e.g., NOT "Defendant was negligent" BUT "Defendant drove 55 mph in a 35 mph zone while texting")
2. DETAILED - Include WHO, WHAT, WHEN, WHERE, WHY, HOW for every material allegation
3. PARTICULARIZED - Name specific individuals, quote specific language, cite specific statutes, state specific amounts
4. COMPLETE - Provide sufficient factual detail that defendant has notice of the claims and facts alleged
5. FACTUAL - Describe conduct and circumstances, not legal conclusions
For fraud claims: Must plead with even greater particularity - specific false statements, who made them, when, where, to whom, and how plaintiff relied
For contract claims: Quote or describe specific contract terms, specific breaches with dates and details
For negligence: Describe specific acts/omissions constituting breach, not just "failed to use reasonable care"

CRITICAL REQUIREMENTS:
- START WITH ATTORNEY HEADER - NO "RANDY LENO" OR OTHER PLACEHOLDER ATTORNEY NAMES
- **MANDATORY**: ALWAYS include a "GENERAL FACTUAL ALLEGATIONS" section (use this EXACT heading in ALL CAPS) BEFORE the first cause of action. This section must contain numbered paragraphs (typically paragraphs 4-10+) with all background facts, party identification, dates, locations, and circumstances common to all causes of action. DO NOT skip this section.
- MUST include 3+ causes when facts reasonably support them
- Use overlapping theories (e.g., negligence + negligence per se + res ipsa loquitur; breach of contract + breach of implied covenant; medical negligence + lack of informed consent + medical battery)
- For NEGLIGENCE cases: Analyze CACI 400-473 comprehensively - consider general negligence (CACI 400), negligence per se (CACI 418), res ipsa loquitur (CACI 417), gross negligence (CACI 425), negligent hiring/supervision (CACI 426), dram shop (CACI 422/427), negligent undertaking (CACI 450C), and any special standards of care or causation issues
- For MEDICAL MALPRACTICE cases: Analyze CACI 500-535 comprehensively - consider medical negligence (CACI 500), lack of informed consent (CACI 533), medical battery (CACI 530A), hospital negligence (CACI 514-516), abandonment (CACI 509), wrongful birth (CACI 511-512), medical res ipsa loquitur (CACI 518), and applicable standards of care for specialists, nurses, or psychotherapists
- For CONTRACT cases: Analyze CACI 300-338 comprehensively - consider breach of contract (CACI 303), breach of implied covenant (CACI 325), third party beneficiary (CACI 301), implied duty of care (CACI 328), and contract interpretation/formation issues
- For PREMISES LIABILITY cases: Analyze CACI 1000-1012 comprehensively - consider general premises liability (CACI 1000-1001), unsafe conditions (CACI 1003), criminal conduct of others (CACI 1005), landlord's duty (CACI 1006), sidewalk liability (CACI 1007-1008), independent contractor injuries (CACI 1009A-1009D), constructive notice (CACI 1011), and employee knowledge (CACI 1012)
- For DANGEROUS CONDITION OF PUBLIC PROPERTY cases: Analyze CACI 1100-1126 comprehensively - consider dangerous condition elements (CACI 1100), notice requirements (CACI 1103), inspection system (CACI 1104), traffic control/warning failures (CACI 1120-1121), design immunity and loss thereof (CACI 1123-1124), and failure to warn of design dangers (CACI 1126)
- For PRODUCTS LIABILITY cases: Analyze CACI 1200-1233 comprehensively - consider overlapping theories of strict liability (manufacturing defect CACI 1201, design defect CACI 1203-1204, failure to warn CACI 1205), negligence (CACI 1220-1224), and breach of warranty (express CACI 1230, implied merchantability CACI 1231, fitness for particular purpose CACI 1232, food products CACI 1233)
- For EMPLOYMENT/WRONGFUL TERMINATION cases: Analyze CACI 2400-2600 comprehensively - consider wrongful termination (CACI 2400-2432), FEHA discrimination (CACI 2500-2513), harassment (CACI 2520-2528), retaliation (CACI 2505), failure to prevent (CACI 2527), disability accommodation (CACI 2540-2549), CFRA violations (CACI 2600-2620), and whistleblower retaliation (Labor Code 1102.5)
- For INSURANCE BAD FAITH cases: Analyze CACI 2300-2361 comprehensively - consider breach of contract (CACI 2300), bad faith denial/delay (CACI 2331), failure to investigate (CACI 2332), failure to defend (CACI 2336), and third-party bad faith (CACI 2334)
- For ECONOMIC INTERFERENCE cases: Analyze CACI 2200-2210 comprehensively - consider inducing breach (CACI 2200), intentional interference with contract (CACI 2201), interference with prospective relations (CACI 2202), and negligent interference (CACI 2204)
- For PROFESSIONAL NEGLIGENCE/LEGAL MALPRACTICE cases: Analyze CACI 600-606 comprehensively - consider standard of care (CACI 600), causation/case-within-a-case (CACI 601), and breach of fiduciary duty
- For DEFAMATION cases: Analyze CACI 1700-1731 comprehensively - consider defamation per se/per quod, public vs. private figure standards, slander of title (CACI 1730), and trade libel (CACI 1731)
- Each cause should have 4-6 paragraphs with proper CACI elements
- CRITICAL - CALIFORNIA HEIGHTENED PLEADING STANDARDS: Each cause of action must plead ULTIMATE FACTS with sufficient specificity to survive demurrer. Do NOT use conclusory statements.
- Each cause of action MUST incorporate DETAILED, SPECIFIC FACTS from the case summary including: WHO (specific individuals/entities), WHAT (specific actions/omissions), WHEN (specific dates/times), WHERE (specific locations), WHY (context), and HOW (manner of conduct)
- For each CACI element, plead the specific facts that satisfy that element - do NOT simply state "Defendant breached the duty" - instead state "On June 15, 2023, at approximately 2:30 PM, Defendant John Smith, while operating his 2019 Toyota Camry northbound on Main Street in Los Angeles, failed to stop at the red traffic signal at the intersection of Main Street and 5th Avenue, in violation of Vehicle Code section 21453(a)"
- Include specific monetary amounts, percentages, quantities, measurements when available
- Include specific communications, statements, or representations made (quote directly when possible)
- Include sequence of events with specific dates and times
- Name specific individuals involved in each action
- Describe specific physical acts, not just legal conclusions
- Apply CACI elements TO THE SPECIFIC FACTS with detailed factual support for each element
- **CRITICAL - INCORPORATE CASE FACTS INTO EVERY CAUSE OF ACTION**: Do NOT use generic or boilerplate legal language. Each cause of action must reference and incorporate the SPECIFIC FACTS from the case summary provided above. For example, if the case summary mentions "Plaintiff was terminated on March 15, 2024 after reporting safety violations", the cause of action must state: "On or about March 15, 2024, Defendants wrongfully terminated Plaintiff's employment after Plaintiff reported safety violations..." Every paragraph in every cause of action must contain facts specific to THIS case, not generic legal conclusions.
- **FORBIDDEN**: Do NOT use placeholder language like "[describe specific conduct]" or "[insert date]" or generic statements like "Defendant engaged in wrongful conduct" without specifying WHAT the conduct was based on the case facts provided. Do NOT use template or boilerplate language - every allegation must be tailored to the specific facts of this case.
- **REQUIREMENT**: Each element of each cause of action must be supported by SPECIFIC FACTS from the case summary. If the case involves a car accident on Highway 101, every relevant cause must reference "the collision on Highway 101" - not just "the incident" or "Defendant's negligence."

**EXAMPLE - BAD (TOO GENERIC - DO NOT DO THIS)**:
"12. Defendant published false statements regarding Plaintiff, specifically alleging that she engaged in fraudulent billing practices.
13. The statements were made with actual malice, as Defendant acted with reckless disregard for the truth."

**EXAMPLE - GOOD (FACT-SPECIFIC - DO THIS)**:
"12. On or about January 15, 2024, Defendant JOHN DOE published a post on LinkedIn to his approximately 5,000 followers stating verbatim: 'Jane Smith at XYZ Law Firm has been stealing from client trust accounts for years. I have proof she embezzled over $50,000.' This defamatory statement was viewed by at least 2,500 people, including Plaintiff's current clients ABC Corporation and DEF Industries, as well as prospective clients in the Southern California legal community.
13. Defendant made this statement with actual malice because: (a) Defendant had no evidence of any embezzlement; (b) Defendant never reviewed any financial records before making the accusation; (c) Defendant admitted in a text message to mutual colleague Sarah Johnson on January 14, 2024 that he was 'going to destroy her reputation' out of spite following their business dispute."

**EVERY CAUSE OF ACTION MUST INCLUDE**: (1) SPECIFIC DATES of the conduct, (2) SPECIFIC LOCATION/PLATFORM/ADDRESS where it occurred, (3) SPECIFIC INDIVIDUALS by name, (4) EXACT WORDS, QUOTES, OR DETAILED DESCRIPTION of conduct, (5) SPECIFIC AUDIENCE/RECIPIENTS/WITNESSES, (6) SPECIFIC DAMAGES with dollar amounts, lost clients by name, medical providers, etc.

- Include specific CACI instruction numbers in cause of action titles
- Generate COMPLETE complaint - do not truncate or abbreviate
- Use aggressive but legally sound pleading strategy
- Include incorporation by reference for each cause
- Include PUNITIVE DAMAGES cause when conduct is malicious, oppressive, or fraudulent (drunk driving, intentional acts, cover-ups, etc.)
- Consider punitive damages for: DUI cases, medical malpractice with cover-up, intentional torts, fraud, gross negligence

LENGTH: Generate full, complete complaint with all causes of action. Do not limit length.`

    // Try different models with higher capabilities for comprehensive complaints
    const models = ["gpt-4o-mini", "gpt-4", "gpt-3.5-turbo", "gpt-3.5-turbo-0125"]
    
    const createPayload = (model: string) => ({
      model,
      messages: [
        { 
          role: "system", 
          content: "You are an experienced California plaintiffs' attorney who drafts comprehensive complaints following California Civil Jury Instructions (CACI) standards and California pleading requirements. You understand that California requires ULTIMATE FACTS with sufficient specificity to survive demurrer - not conclusions of law or evidentiary facts. CRITICAL INSTRUCTIONS: (1) ALWAYS start with the exact attorney header information provided - NEVER use placeholder names like 'RANDY LENO' or any hardcoded attorney information, (2) Use the EXACT plaintiff and defendant names provided in the prompt - DO NOT use generic names like 'Any Plaintiff' or 'Any Defendant', (3) Analyze facts against the entire CACI library - do not be conservative, (4) Include 3-6+ causes of action when facts support them, (5) Consider overlapping theories (negligence + negligence per se + res ipsa loquitur; breach of contract + breach of implied covenant; medical negligence + lack of informed consent + medical battery, etc.), (6) For NEGLIGENCE cases: Thoroughly analyze CACI 400-473 - consider general negligence (CACI 400), negligence per se (CACI 418), res ipsa loquitur (CACI 417), gross negligence (CACI 425), negligent hiring/supervision (CACI 426), dram shop liability (CACI 422/427), negligent undertaking (CACI 450C), strict liability (CACI 460-463), and special standards of care or causation theories, (7) For MEDICAL MALPRACTICE cases: Thoroughly analyze CACI 500-535 - consider medical negligence (CACI 500), lack of informed consent (CACI 533), medical battery (CACI 530A), hospital negligence (CACI 514-516), abandonment (CACI 509), wrongful birth (CACI 511-512), medical res ipsa loquitur (CACI 518), and standards of care for specialists, nurses, or psychotherapists (CACI 501-504), (8) For CONTRACT disputes: Thoroughly analyze CACI 300-338 - consider breach of contract (CACI 303), breach of implied covenant of good faith and fair dealing (CACI 325), third party beneficiary (CACI 301), breach of implied duty to perform with reasonable care (CACI 328), and any contract formation, interpretation, or condition precedent issues, (8.5) For EMPLOYMENT/WRONGFUL TERMINATION cases: Thoroughly analyze CACI 2400-2600 - consider wrongful termination (CACI 2400-2432), FEHA discrimination (CACI 2500-2513), harassment (CACI 2520-2528), retaliation (CACI 2505), failure to prevent (CACI 2527), disability accommodation (CACI 2540-2549), CFRA violations (CACI 2600-2620), and whistleblower retaliation (Labor Code 1102.5), (8.6) For INSURANCE BAD FAITH cases: Thoroughly analyze CACI 2300-2361 - consider breach of insurance contract (CACI 2300), bad faith denial/delay (CACI 2331-2333), failure to defend (CACI 2336), and third-party bad faith (CACI 2334), (8.7) For ECONOMIC INTERFERENCE cases: Thoroughly analyze CACI 2200-2210 - consider inducing breach of contract (CACI 2200), intentional interference with contract (CACI 2201), interference with prospective relations (CACI 2202-2204), (9) Use specific CACI instruction numbers in each cause of action title, (10) Structure each cause with proper CACI elements, (10.5) MANDATORY: ALWAYS include a 'GENERAL FACTUAL ALLEGATIONS' section (use this EXACT heading in ALL CAPS) BEFORE the first cause of action - this section contains numbered paragraphs with all background facts common to all causes, (11) CRITICAL - CALIFORNIA DEMURRER-PROOF PLEADING: Plead ultimate facts with maximum specificity. For each allegation state: WHO (name specific person/entity), WHAT (describe specific action/omission in detail), WHEN (exact date and time if available), WHERE (specific location/address), WHY (circumstances/context), HOW (manner and means). Avoid conclusory statements like 'Defendant was negligent' - instead describe the specific acts constituting negligence: 'On June 15, 2023 at 2:30 PM, Defendant John Smith, driving a 2019 Toyota Camry northbound on Main Street in Los Angeles at approximately 55 mph in a 35 mph zone, failed to apply brakes, failed to maintain proper lookout, and collided with Plaintiff's vehicle'. Quote specific contract language, cite specific statutes violated, describe specific injuries with medical detail, state specific dollar amounts and calculations for damages. Make every paragraph fact-heavy, not conclusion-heavy, (11.5) MANDATORY - INCORPORATE CASE FACTS INTO EVERY CAUSE: Each cause of action must contain the SPECIFIC FACTS from the case summary - do NOT use generic boilerplate language. If facts mention termination on a specific date, include that date. If facts mention specific injuries, describe those injuries. Every paragraph must reference actual facts from the case, not template language, (12) Use aggressive but legally sound pleading strategies. Remember: It's better to include a potentially viable cause than to miss a recovery theory. MOST IMPORTANT: Use only the attorney information AND party names provided in the prompt - no hardcoded names or placeholder text." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3 // Lower temperature for more consistent legal language
      // No max_tokens limit - use full model capacity for comprehensive complaints
    })

    // Retry logic with different models to work around rate limits
    const maxRetries = 3
    let lastError = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Use different model for each attempt to spread rate limits
      const modelIndex = (attempt - 1) % models.length
      const currentModel = models[modelIndex]
      const payload = createPayload(currentModel)
      
      console.log(`Attempt ${attempt}/${maxRetries} using model: ${currentModel}`)
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          // Success! Process the response
          const data = await response.json()
          
          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return NextResponse.json(
              { error: 'Invalid response from OpenAI' },
              { status: 500 }
            )
          }

          const complaint = data.choices[0].message.content.trim()
          
          // Cache the response
          responseCache.set(cacheKey, {
            complaint,
            timestamp: Date.now()
          })
          
          // Clean old cache entries (simple cleanup)
          if (responseCache.size > 100) {
            const entries = Array.from(responseCache.entries())
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
            // Remove oldest 20 entries
            for (let i = 0; i < 20; i++) {
              responseCache.delete(entries[i][0])
            }
          }
          
          return NextResponse.json({ complaint })
        }

        // Handle errors
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your OpenAI API key.' },
          { status: 401 }
        )
      }

      // Handle quota exceeded error specifically
      if (response.status === 429) {
        const errorMessage = errorData.error?.message || ''
        const errorCode = errorData.error?.code || ''
        
        console.log(`Rate limit/quota error on attempt ${attempt}/${maxRetries}`)
        console.log('Error message:', errorMessage)
        console.log('Error code:', errorCode)
        console.log('Full error response:', errorData)
        
        // Check if this is a quota exceeded error (not just rate limiting)
        const isQuotaExceeded = errorMessage.toLowerCase().includes('quota') || 
                               errorMessage.toLowerCase().includes('billing') ||
                               errorCode === 'insufficient_quota'
        
        if (isQuotaExceeded) {
          // Don't retry for quota errors - they won't resolve with waiting
          return NextResponse.json(
            { 
              error: 'OpenAI API quota exceeded. Please check your billing and usage limits at https://platform.openai.com/usage',
              type: 'quota_exceeded',
              userMessage: 'Your OpenAI API usage has exceeded the current billing limits. To continue using this service, please:\n\n1. Check your usage at https://platform.openai.com/usage\n2. Add payment method or increase limits at https://platform.openai.com/account/billing\n3. Wait for your quota to reset (if on free tier)\n\nAlternatively, you can manually draft your complaint using the legal template format shown in previous examples.',
              details: {
                message: errorMessage,
                code: errorCode,
                docsUrl: 'https://platform.openai.com/docs/guides/error-codes/api-errors'
              }
            },
            { status: 429 }
          )
        }
        
        // Handle regular rate limiting (temporary)
        if (attempt === maxRetries) {
          const rateLimitMessage = 'Rate limit exceeded. This happens when too many requests are made to OpenAI. Please wait 60 seconds before trying again. Consider upgrading your OpenAI API plan for higher limits.'
          
          return NextResponse.json(
            { 
              error: rateLimitMessage,
              retryAfter: 60,
              type: 'rate_limit_exceeded',
              details: errorData.error
            },
            { status: 429 }
          )
        }

          // Wait before retrying (exponential backoff with longer delays)
          const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000) // Start at 5s, cap at 30s
          console.log(`Waiting ${waitTime}ms before retry ${attempt + 1}`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }

        // For other errors, don't retry
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate complaint' },
        { status: response.status }
      )
        
      } catch (error) {
        lastError = error
        console.error(`Attempt ${attempt} failed:`, error)
        
        if (attempt === maxRetries) {
          break
        }
        
        // Wait before retrying with longer delays
        const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000)
        console.log(`Network error, waiting ${waitTime}ms before retry`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // If we get here, all retries failed
    console.error('All retry attempts failed:', lastError)
      return NextResponse.json(
      { error: 'Failed to generate complaint after multiple attempts. Please try again later.' },
        { status: 500 }
      )

  } catch (error) {
    console.error('Error generating complaint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    isProcessing = false
    // Process next request in queue
    setTimeout(processQueue, 100) // Small delay to prevent tight loops
  }
}

// Security headers
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}







