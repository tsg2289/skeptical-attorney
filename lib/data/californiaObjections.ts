/**
 * Comprehensive California Discovery Objections Library
 * Based on California Code of Civil Procedure and case law
 * 
 * Structure supports: Special Interrogatories, Form Interrogatories, 
 * Requests for Production (RFP), and Requests for Admission (RFA)
 */

export type DiscoveryResponseType = 'interrogatories' | 'rfp' | 'rfa' | 'frog' | 'frog-employment';

export type ObjectionCategory = 
  | 'general'
  | 'procedural'
  | 'vagueness'
  | 'scope'
  | 'burden'
  | 'relevance'
  | 'privilege'
  | 'privacy'
  | 'expert'
  | 'premature';

export interface ObjectionTemplate {
  id: string;
  title: string;
  shortForm: string;
  fullText: string;
  applicableTo: DiscoveryResponseType[];
  category: ObjectionCategory;
  citation?: string;
  requiresCustomization?: boolean;
}

// =============================================================================
// GENERAL OBJECTIONS (Incorporated by Reference)
// =============================================================================

export const GENERAL_OBJECTIONS_HEADER = `GENERAL OBJECTIONS

Responding Party incorporates by reference all General Objections set forth above in the General Objections. Discovery is continuing and Responding Party reserves the right to amend this response upon discovery of additional facts and information.`;

export const DEFINITIONS_OBJECTION_INTERROGATORY = `Responding Party objects to Propounding Party's prefatory definitions to the extent they are in violation of Code of Civil Procedure ? 2030.060(d).`;

export const DEFINITIONS_OBJECTION_RFA = `Responding Party objects to Propounding Party's prefatory "Definitions" to the extent they are in violation of the California Code of Civil Procedure.`;

export const DEFINITIONS_OBJECTION_FROG = `Responding Party objects to the Form Interrogatories to the extent they seek information protected by the attorney-client privilege, work product doctrine, or other applicable privileges.`;

export const DISCOVERY_RESERVATION = `Discovery in this matter is ongoing, and Responding Party reserves the right to supplement or amend this response as this matter progresses.`;

// =============================================================================
// OBJECTION TEMPLATES - INTERROGATORIES
// =============================================================================

export const INTERROGATORY_OBJECTIONS: ObjectionTemplate[] = [
  // VAGUENESS
  {
    id: 'int_vague_entire',
    title: 'Vague - Entire Interrogatory',
    shortForm: 'Vague and ambiguous in its entirety',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is vague, ambiguous, and unintelligible in its entirety.',
    applicableTo: ['interrogatories'],
    category: 'vagueness',
  },
  {
    id: 'int_vague_terms',
    title: 'Vague - Specific Terms',
    shortForm: 'Vague as to specific terms',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is vague, ambiguous, and unintelligible, by way of example and without limitation, with respect to the terms "[TERM1]," "[TERM2]," "[TERM3]," and "[TERM4]."',
    applicableTo: ['interrogatories'],
    category: 'vagueness',
    requiresCustomization: true,
  },
  {
    id: 'int_vague_timeframe',
    title: 'Vague - Time Frame',
    shortForm: 'Vague as to time frame',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is vague and ambiguous as to the time frame contemplated.',
    applicableTo: ['interrogatories'],
    category: 'vagueness',
  },

  // PROCEDURAL
  {
    id: 'int_not_full_complete',
    title: 'Not Full and Complete',
    shortForm: 'Not full and complete in violation of CCP ? 2030.060',
    fullText: 'Responding Party objects to the interrogatory on the grounds that the interrogatory is not full and complete in and of itself, in violation of Code of Civil Procedure ? 2030.060(c)-(d) and Catanese v. Sup.Ct. (Ray) (1996) 46 Cal.App.4th 1159, 1164.',
    applicableTo: ['interrogatories'],
    category: 'procedural',
    citation: 'CCP ? 2030.060(c)-(d); Catanese v. Sup.Ct. (1996) 46 Cal.App.4th 1159',
  },
  {
    id: 'int_compound',
    title: 'Compound Question',
    shortForm: 'Impermissibly compound',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is impermissibly compound in violation of Code of Civil Procedure ? 2030.060(f).',
    applicableTo: ['interrogatories'],
    category: 'procedural',
    citation: 'CCP ? 2030.060(f)',
  },
  {
    id: 'int_exceeds_max',
    title: 'Exceeds Maximum Number',
    shortForm: 'Exceeds 35 interrogatory limit',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is burdensome, harassing, and oppressive in that this interrogatory exceeds the maximum number of 35 without good cause in violation of Code of Civil Procedure sections 2030.030(a)(1) and 2030.040(a).',
    applicableTo: ['interrogatories'],
    category: 'procedural',
    citation: 'CCP ?? 2030.030(a)(1), 2030.040(a)',
  },

  // SCOPE / BURDEN
  {
    id: 'int_overbroad',
    title: 'Overbroad',
    shortForm: 'Overbroad',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is overbroad.',
    applicableTo: ['interrogatories'],
    category: 'scope',
  },
  {
    id: 'int_burdensome_entire',
    title: 'Burdensome - Entire',
    shortForm: 'Burdensome, oppressive, and harassing',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is burdensome, oppressive, and harassing in its entirety.',
    applicableTo: ['interrogatories'],
    category: 'burden',
  },
  {
    id: 'int_burdensome_timeframe',
    title: 'Burdensome - Time Frame',
    shortForm: 'Burdensome as to timeframe',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is burdensome, oppressive, and harassing as to the timeframe contemplated.',
    applicableTo: ['interrogatories'],
    category: 'burden',
  },
  {
    id: 'int_equally_available',
    title: 'Equally Available',
    shortForm: 'Information equally available to propounding party',
    fullText: 'Responding Party objects to this interrogatory on the grounds that the information requested is equally available to the Propounding Party. Where the information sought is equally available to the party propounding an interrogatory, the burden and expense of any investigation which may be required should be borne by the party seeking the information. (Pantzalas v. Superior Court (1969) 272 Cal.App.2d 499, 503.)',
    applicableTo: ['interrogatories'],
    category: 'burden',
    citation: 'Pantzalas v. Superior Court (1969) 272 Cal.App.2d 499, 503',
  },
  {
    id: 'int_outside_control',
    title: 'Outside Possession/Control',
    shortForm: 'Outside responding party\'s possession, custody or control',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it seeks the discovery of information outside of Responding Party\'s possession, custody or control.',
    applicableTo: ['interrogatories'],
    category: 'scope',
  },

  // RELEVANCE
  {
    id: 'int_not_calculated',
    title: 'Not Calculated to Lead to Discovery',
    shortForm: 'Not calculated to lead to admissible evidence',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is not calculated to lead to the discovery of admissible evidence in violation of Code of Civil Procedure ? 2017.010.',
    applicableTo: ['interrogatories'],
    category: 'relevance',
    citation: 'CCP ? 2017.010',
  },
  {
    id: 'int_cumulative',
    title: 'Cumulative/Duplicative',
    shortForm: 'Cumulative and duplicative',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is cumulative and duplicative of prior discovery in violation of Code of Civil Procedure section 2019.030.',
    applicableTo: ['interrogatories'],
    category: 'relevance',
    citation: 'CCP ? 2019.030',
  },
  {
    id: 'int_remedial_measures',
    title: 'Remedial Measures',
    shortForm: 'Seeks evidence of remedial measures',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it impermissibly seeks evidence of remedial or precautionary measures in violation of Evidence Code section 1151.',
    applicableTo: ['interrogatories'],
    category: 'relevance',
    citation: 'Evidence Code ? 1151',
  },
  {
    id: 'int_unrelated_negligent',
    title: 'Unrelated Negligent Acts',
    shortForm: 'Seeks irrelevant evidence of unrelated negligent acts',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it seeks irrelevant evidence of unrelated negligent acts by Responding Party. (Marocco v. Ford Motor Co. (1970) 7 Cal.3d 84, 91.)',
    applicableTo: ['interrogatories'],
    category: 'relevance',
    citation: 'Marocco v. Ford Motor Co. (1970) 7 Cal.3d 84, 91',
  },

  // SUBSTANTIVE
  {
    id: 'int_lacks_foundation',
    title: 'Lacks Foundation',
    shortForm: 'Lacks foundation',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it lacks foundation.',
    applicableTo: ['interrogatories'],
    category: 'scope',
  },
  {
    id: 'int_calls_speculation',
    title: 'Calls for Speculation',
    shortForm: 'Calls for speculation',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it calls for speculation.',
    applicableTo: ['interrogatories'],
    category: 'scope',
  },
  {
    id: 'int_legal_conclusion',
    title: 'Legal Conclusion',
    shortForm: 'Calls for legal conclusion',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it impermissibly calls for a legal conclusion.',
    applicableTo: ['interrogatories'],
    category: 'scope',
  },
  {
    id: 'int_writing',
    title: 'Document Speaks for Itself',
    shortForm: 'Document speaks for itself',
    fullText: 'Responding Party objects to the interrogatory on the grounds that the documents speak for themselves, and the interrogatory impermissibly seeks testimony regarding the contents of a writing in violation of Evidence Code section 1523.',
    applicableTo: ['interrogatories'],
    category: 'scope',
    citation: 'Evidence Code ? 1523',
  },

  // PREMATURE
  {
    id: 'int_premature',
    title: 'Premature',
    shortForm: 'Premature - investigation ongoing',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is premature as Responding Party has not had sufficient opportunity to complete its investigation and discovery.',
    applicableTo: ['interrogatories'],
    category: 'premature',
  },

  // PRIVILEGE
  {
    id: 'int_attorney_client',
    title: 'Attorney-Client Privilege',
    shortForm: 'Attorney-client privilege and work product',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it seeks to violate the attorney-client privilege and attorney work product doctrine in violation of Code of Civil Procedure ?? 2017.010 and 2018.030, and Evidence Code ? 950.',
    applicableTo: ['interrogatories'],
    category: 'privilege',
    citation: 'CCP ?? 2017.010, 2018.030; Evidence Code ? 950',
  },

  // PRIVACY
  {
    id: 'int_privacy',
    title: 'Privacy - Responding Party',
    shortForm: 'Invasion of privacy',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is an impermissible invasion of Responding Party\'s constitutional right to privacy. (Cal. Const. Art. 1, ? 1.)',
    applicableTo: ['interrogatories'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, ? 1',
  },
  {
    id: 'int_privacy_third',
    title: 'Privacy - Third Parties',
    shortForm: 'Invasion of third-party privacy',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it is an impermissible invasion of Responding Party\'s and third parties\' constitutional right to privacy. (Cal. Const. Art. 1, ? 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526; Roberts v. Gulf Oil Corp. (1983) 147 Cal.App.3d 770, 798.)',
    applicableTo: ['interrogatories'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, ? 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526',
  },
  {
    id: 'int_personnel_files',
    title: 'Confidential Personnel Files',
    shortForm: 'Seeks confidential personnel files',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it impermissibly seeks confidential personnel files at a person\'s place of employment. (Board of Trustees of Leland Stanford Jr. Univ. v. Sup.Ct. (Dong) (1981) 119 Cal.App.3d 516, 528?530.)',
    applicableTo: ['interrogatories'],
    category: 'privacy',
    citation: 'Board of Trustees v. Sup.Ct. (1981) 119 Cal.App.3d 516',
  },
  {
    id: 'int_trade_secrets',
    title: 'Trade Secrets',
    shortForm: 'Seeks trade secrets',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it impermissibly asks Responding Party to disclose trade secrets in violation of Civil Code sections 3426-3426.11, also known as the Uniform Trade Secrets Act, and Evidence Code section 1060.',
    applicableTo: ['interrogatories'],
    category: 'privilege',
    citation: 'Civil Code ?? 3426-3426.11; Evidence Code ? 1060',
  },
  {
    id: 'int_tax_returns',
    title: 'Tax Returns',
    shortForm: 'Seeks privileged tax returns',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it impermissibly asks Responding Party to disclose privileged income tax returns. (Webb v. Standard Oil Co. (1957) 49 Cal.2d 509, 513.)',
    applicableTo: ['interrogatories'],
    category: 'privilege',
    citation: 'Webb v. Standard Oil Co. (1957) 49 Cal.2d 509, 513',
  },

  // EXPERT
  {
    id: 'int_expert_lay',
    title: 'Expert Testimony from Lay Witness',
    shortForm: 'Seeks expert testimony from lay witness',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it improperly seeks expert testimony from a lay witness.',
    applicableTo: ['interrogatories'],
    category: 'expert',
  },
  {
    id: 'int_premature_expert',
    title: 'Premature Expert Disclosure',
    shortForm: 'Premature expert disclosure',
    fullText: 'Responding Party objects to the interrogatory on the grounds that it prematurely seeks disclosure of experts and expert testimony.',
    applicableTo: ['interrogatories'],
    category: 'expert',
  },
];

// =============================================================================
// OBJECTION TEMPLATES - FORM INTERROGATORIES (FROG)
// =============================================================================

export const FROG_OBJECTIONS: ObjectionTemplate[] = [
  // Form Interrogatories are Judicial Council approved, so objections are more limited
  // However, certain objections still apply
  
  // PRIVILEGE
  {
    id: 'frog_attorney_client',
    title: 'Attorney-Client Privilege',
    shortForm: 'Attorney-client privilege and work product',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks to violate the attorney-client privilege and attorney work product doctrine in violation of Code of Civil Procedure §§ 2017.010 and 2018.030, and Evidence Code § 950.',
    applicableTo: ['frog'],
    category: 'privilege',
    citation: 'CCP §§ 2017.010, 2018.030; Evidence Code § 950',
  },

  // PRIVACY
  {
    id: 'frog_privacy',
    title: 'Privacy - Responding Party',
    shortForm: 'Invasion of privacy',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is an impermissible invasion of Responding Party\'s constitutional right to privacy. (Cal. Const. Art. 1, § 1.)',
    applicableTo: ['frog'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, § 1',
  },
  {
    id: 'frog_privacy_third',
    title: 'Privacy - Third Parties',
    shortForm: 'Invasion of third-party privacy',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is an impermissible invasion of third parties\' constitutional right to privacy. (Cal. Const. Art. 1, § 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526.)',
    applicableTo: ['frog'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, § 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526',
  },
  {
    id: 'frog_medical_privacy',
    title: 'Medical Privacy',
    shortForm: 'Seeks protected medical information',
    fullText: 'Responding Party objects to this interrogatory to the extent it seeks information protected by the physician-patient privilege (Evidence Code § 994) and the right to privacy in medical records.',
    applicableTo: ['frog'],
    category: 'privacy',
    citation: 'Evidence Code § 994',
  },

  // BURDEN
  {
    id: 'frog_burdensome',
    title: 'Burdensome',
    shortForm: 'Burdensome, oppressive, and harassing',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is burdensome, oppressive, and harassing given the scope of information requested.',
    applicableTo: ['frog'],
    category: 'burden',
  },
  {
    id: 'frog_equally_available',
    title: 'Equally Available',
    shortForm: 'Information equally available to propounding party',
    fullText: 'Responding Party objects to this interrogatory on the grounds that the information requested is equally available to the Propounding Party.',
    applicableTo: ['frog'],
    category: 'burden',
  },

  // RELEVANCE
  {
    id: 'frog_not_relevant',
    title: 'Not Relevant',
    shortForm: 'Not relevant to claims or defenses',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks information not relevant to any claim or defense in this action.',
    applicableTo: ['frog'],
    category: 'relevance',
  },
  {
    id: 'frog_not_applicable',
    title: 'Not Applicable',
    shortForm: 'Interrogatory not applicable to this case',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is not applicable to the facts and circumstances of this case.',
    applicableTo: ['frog'],
    category: 'relevance',
  },

  // PREMATURE
  {
    id: 'frog_premature',
    title: 'Premature',
    shortForm: 'Premature - investigation ongoing',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is premature as Responding Party has not had sufficient opportunity to complete its investigation and discovery.',
    applicableTo: ['frog'],
    category: 'premature',
  },

  // SCOPE
  {
    id: 'frog_outside_control',
    title: 'Outside Possession/Control',
    shortForm: 'Outside responding party\'s possession, custody or control',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks the discovery of information outside of Responding Party\'s possession, custody or control.',
    applicableTo: ['frog'],
    category: 'scope',
  },
  {
    id: 'frog_calls_speculation',
    title: 'Calls for Speculation',
    shortForm: 'Calls for speculation',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it calls for speculation.',
    applicableTo: ['frog'],
    category: 'scope',
  },

  // EXPERT
  {
    id: 'frog_expert_lay',
    title: 'Expert Testimony from Lay Witness',
    shortForm: 'Seeks expert testimony from lay witness',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it improperly seeks expert testimony from a lay witness.',
    applicableTo: ['frog'],
    category: 'expert',
  },
  {
    id: 'frog_premature_expert',
    title: 'Premature Expert Disclosure',
    shortForm: 'Premature expert disclosure',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it prematurely seeks disclosure of experts and expert testimony.',
    applicableTo: ['frog'],
    category: 'expert',
  },
];

// =============================================================================
// OBJECTION TEMPLATES - FORM INTERROGATORIES EMPLOYMENT LAW (DISC-002)
// =============================================================================

export const FROG_EMPLOYMENT_OBJECTIONS: ObjectionTemplate[] = [
  // Employment Form Interrogatories are Judicial Council approved, but have employment-specific objections
  
  // PRIVILEGE
  {
    id: 'frog_emp_attorney_client',
    title: 'Attorney-Client Privilege',
    shortForm: 'Attorney-client privilege and work product',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks to violate the attorney-client privilege and attorney work product doctrine in violation of Code of Civil Procedure §§ 2017.010 and 2018.030, and Evidence Code § 950.',
    applicableTo: ['frog-employment'],
    category: 'privilege',
    citation: 'CCP §§ 2017.010, 2018.030; Evidence Code § 950',
  },

  // PRIVACY - General
  {
    id: 'frog_emp_privacy',
    title: 'Privacy - Responding Party',
    shortForm: 'Invasion of privacy',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is an impermissible invasion of Responding Party\'s constitutional right to privacy. (Cal. Const. Art. 1, § 1.)',
    applicableTo: ['frog-employment'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, § 1',
  },
  {
    id: 'frog_emp_privacy_third',
    title: 'Privacy - Third Parties',
    shortForm: 'Invasion of third-party privacy',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is an impermissible invasion of third parties\' constitutional right to privacy. (Cal. Const. Art. 1, § 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526.)',
    applicableTo: ['frog-employment'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, § 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526',
  },

  // PRIVACY - Employment Specific
  {
    id: 'frog_emp_personnel_records',
    title: 'Personnel Records Privacy',
    shortForm: 'Seeks confidential personnel records',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks confidential personnel records protected by Labor Code sections 1198.5 and 432, and the constitutional right to privacy. (Board of Trustees of Leland Stanford Jr. Univ. v. Sup.Ct. (Dong) (1981) 119 Cal.App.3d 516, 528–530.)',
    applicableTo: ['frog-employment'],
    category: 'privacy',
    citation: 'Labor Code §§ 1198.5, 432; Board of Trustees v. Sup.Ct. (1981) 119 Cal.App.3d 516',
  },
  {
    id: 'frog_emp_medical_privacy',
    title: 'Medical Privacy',
    shortForm: 'Seeks protected medical information',
    fullText: 'Responding Party objects to this interrogatory to the extent it seeks information protected by the physician-patient privilege (Evidence Code § 994), the Confidentiality of Medical Information Act (Civil Code § 56 et seq.), and the right to privacy in medical records.',
    applicableTo: ['frog-employment'],
    category: 'privacy',
    citation: 'Evidence Code § 994; Civil Code § 56 et seq.',
  },
  {
    id: 'frog_emp_hipaa',
    title: 'HIPAA Protected Information',
    shortForm: 'Seeks HIPAA protected health information',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks protected health information subject to the Health Insurance Portability and Accountability Act (HIPAA), 45 C.F.R. Parts 160 and 164.',
    applicableTo: ['frog-employment'],
    category: 'privacy',
    citation: '45 C.F.R. Parts 160, 164 (HIPAA)',
  },

  // BURDEN
  {
    id: 'frog_emp_burdensome',
    title: 'Burdensome',
    shortForm: 'Burdensome, oppressive, and harassing',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is burdensome, oppressive, and harassing given the scope of information requested.',
    applicableTo: ['frog-employment'],
    category: 'burden',
  },
  {
    id: 'frog_emp_equally_available',
    title: 'Equally Available',
    shortForm: 'Information equally available to propounding party',
    fullText: 'Responding Party objects to this interrogatory on the grounds that the information requested is equally available to the Propounding Party.',
    applicableTo: ['frog-employment'],
    category: 'burden',
  },

  // RELEVANCE
  {
    id: 'frog_emp_not_relevant',
    title: 'Not Relevant',
    shortForm: 'Not relevant to claims or defenses',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks information not relevant to any claim or defense in this action.',
    applicableTo: ['frog-employment'],
    category: 'relevance',
  },
  {
    id: 'frog_emp_not_applicable',
    title: 'Not Applicable',
    shortForm: 'Interrogatory not applicable to this case',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is not applicable to the facts and circumstances of this case.',
    applicableTo: ['frog-employment'],
    category: 'relevance',
  },

  // PREMATURE
  {
    id: 'frog_emp_premature',
    title: 'Premature',
    shortForm: 'Premature - investigation ongoing',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it is premature as Responding Party has not had sufficient opportunity to complete its investigation and discovery.',
    applicableTo: ['frog-employment'],
    category: 'premature',
  },

  // SCOPE
  {
    id: 'frog_emp_outside_control',
    title: 'Outside Possession/Control',
    shortForm: 'Outside responding party\'s possession, custody or control',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks the discovery of information outside of Responding Party\'s possession, custody or control.',
    applicableTo: ['frog-employment'],
    category: 'scope',
  },
  {
    id: 'frog_emp_calls_speculation',
    title: 'Calls for Speculation',
    shortForm: 'Calls for speculation',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it calls for speculation.',
    applicableTo: ['frog-employment'],
    category: 'scope',
  },
  {
    id: 'frog_emp_overbroad_timeframe',
    title: 'Overbroad Time Period',
    shortForm: 'Overbroad as to time period (10 years)',
    fullText: 'Responding Party objects to this interrogatory on the grounds that the ten-year time period is overbroad, unduly burdensome, and not reasonably calculated to lead to the discovery of admissible evidence.',
    applicableTo: ['frog-employment'],
    category: 'scope',
  },

  // EXPERT
  {
    id: 'frog_emp_expert_lay',
    title: 'Expert Testimony from Lay Witness',
    shortForm: 'Seeks expert testimony from lay witness',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it improperly seeks expert testimony from a lay witness.',
    applicableTo: ['frog-employment'],
    category: 'expert',
  },
  {
    id: 'frog_emp_premature_expert',
    title: 'Premature Expert Disclosure',
    shortForm: 'Premature expert disclosure',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it prematurely seeks disclosure of experts and expert testimony.',
    applicableTo: ['frog-employment'],
    category: 'expert',
  },

  // EMPLOYMENT-SPECIFIC PRIVILEGE
  {
    id: 'frog_emp_settlement_discussions',
    title: 'Settlement Discussions',
    shortForm: 'Seeks privileged settlement discussions',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks information regarding settlement discussions protected by Evidence Code section 1152.',
    applicableTo: ['frog-employment'],
    category: 'privilege',
    citation: 'Evidence Code § 1152',
  },
  {
    id: 'frog_emp_eeoc_mediation',
    title: 'EEOC/DFEH Mediation Communications',
    shortForm: 'Seeks protected mediation communications',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks communications made during mediation proceedings before the EEOC or DFEH, which are confidential under Evidence Code section 1119 and applicable federal and state laws.',
    applicableTo: ['frog-employment'],
    category: 'privilege',
    citation: 'Evidence Code § 1119',
  },
  {
    id: 'frog_emp_investigation_privilege',
    title: 'Internal Investigation Privilege',
    shortForm: 'Seeks privileged investigation materials',
    fullText: 'Responding Party objects to this interrogatory to the extent it seeks information protected by the attorney-client privilege and work product doctrine as it relates to internal investigations conducted in anticipation of litigation.',
    applicableTo: ['frog-employment'],
    category: 'privilege',
  },

  // FEHA SPECIFIC
  {
    id: 'frog_emp_feha_irrelevant_comparators',
    title: 'Irrelevant Comparator Evidence',
    shortForm: 'Seeks information about non-similarly situated employees',
    fullText: 'Responding Party objects to this interrogatory on the grounds that it seeks information about employees who are not similarly situated to the EMPLOYEE and therefore is not relevant to any claim or defense in this FEHA action.',
    applicableTo: ['frog-employment'],
    category: 'relevance',
  },
];

// =============================================================================
// OBJECTION TEMPLATES - REQUESTS FOR ADMISSION
// =============================================================================

export const RFA_OBJECTIONS: ObjectionTemplate[] = [
  // Vagueness
  {
    id: 'rfa_vague_entire',
    title: 'Vague - Entire Request',
    shortForm: 'Vague and ambiguous in its entirety',
    fullText: 'Responding Party objects to this request on the grounds that it is vague, ambiguous, and unintelligible in its entirety.',
    applicableTo: ['rfa'],
    category: 'vagueness',
  },
  {
    id: 'rfa_vague_terms',
    title: 'Vague - Specific Terms',
    shortForm: 'Vague as to specific terms',
    fullText: 'Responding Party objects to this request on the grounds that it is vague, ambiguous, and unintelligible, by way of example and without limitation, with respect to the terms "[TERM1]," "[TERM2]," "[TERM3]," and "[TERM4]."',
    applicableTo: ['rfa'],
    category: 'vagueness',
    requiresCustomization: true,
  },
  {
    id: 'rfa_vague_timeframe',
    title: 'Vague - Time Frame',
    shortForm: 'Vague as to time frame',
    fullText: 'Responding Party objects to this request on the grounds that it is vague and ambiguous as to the time frame contemplated.',
    applicableTo: ['rfa'],
    category: 'vagueness',
  },

  // Procedural
  {
    id: 'rfa_compound',
    title: 'Compound',
    shortForm: 'Impermissibly compound',
    fullText: 'Responding Party objects to this request on the grounds that it is impermissibly compound.',
    applicableTo: ['rfa'],
    category: 'procedural',
  },
  {
    id: 'rfa_not_full',
    title: 'Not Full and Complete',
    shortForm: 'Document not attached',
    fullText: 'Responding Party objects to this request on the grounds that it is not full and complete in and of itself in violation of Code of Civil Procedure section 2033.060(d) because the document referenced in the request for admission is not attached.',
    applicableTo: ['rfa'],
    category: 'procedural',
    citation: 'CCP ? 2033.060(d)',
  },
  {
    id: 'rfa_exceeds_max',
    title: 'Exceeds Maximum Number',
    shortForm: 'Exceeds 35 RFA limit',
    fullText: 'Responding Party objects to this request on the grounds that it is burdensome, harassing, and oppressive in that this request exceeds the maximum number of 35 without good cause in violation of Code of Civil Procedure sections 2033.030 and 2033.050.',
    applicableTo: ['rfa'],
    category: 'procedural',
    citation: 'CCP ?? 2033.030, 2033.050',
  },

  // Burden
  {
    id: 'rfa_burdensome_entire',
    title: 'Burdensome - Entire',
    shortForm: 'Burdensome, oppressive, and harassing',
    fullText: 'Responding Party objects to this request on the grounds that it is burdensome, oppressive, and harassing in its entirety.',
    applicableTo: ['rfa'],
    category: 'burden',
  },
  {
    id: 'rfa_burdensome_timeframe',
    title: 'Burdensome - Time Frame',
    shortForm: 'Burdensome as to timeframe',
    fullText: 'Responding Party objects to this request on the grounds that it is burdensome, oppressive, and harassing as to the timeframe contemplated.',
    applicableTo: ['rfa'],
    category: 'burden',
  },

  // Relevance
  {
    id: 'rfa_not_calculated',
    title: 'Not Calculated',
    shortForm: 'Not calculated to lead to admissible evidence',
    fullText: 'Responding Party objects to this request on the grounds that it is not calculated to lead to the discovery of admissible evidence in violation of Code of Civil Procedure section 2017.010.',
    applicableTo: ['rfa'],
    category: 'relevance',
    citation: 'CCP ? 2017.010',
  },
  {
    id: 'rfa_cumulative',
    title: 'Cumulative',
    shortForm: 'Cumulative and duplicative',
    fullText: 'Responding Party objects to this request on the grounds that it is cumulative and duplicative of prior discovery in violation of Code of Civil Procedure section 2019.030.',
    applicableTo: ['rfa'],
    category: 'relevance',
    citation: 'CCP ? 2019.030',
  },

  // Substantive
  {
    id: 'rfa_legal_conclusion',
    title: 'Legal Conclusion',
    shortForm: 'Seeks legal conclusion',
    fullText: 'Responding Party objects to this request on the grounds that it impermissibly seeks a legal conclusion.',
    applicableTo: ['rfa'],
    category: 'scope',
  },
  {
    id: 'rfa_speculation',
    title: 'Calls for Speculation',
    shortForm: 'Calls for speculation',
    fullText: 'Responding Party objects to this request on the grounds that it calls for speculation.',
    applicableTo: ['rfa'],
    category: 'scope',
  },
  {
    id: 'rfa_lacks_foundation',
    title: 'Lacks Foundation',
    shortForm: 'Lacks foundation',
    fullText: 'Responding Party objects to this request on the grounds that it lacks foundation.',
    applicableTo: ['rfa'],
    category: 'scope',
  },
  {
    id: 'rfa_writing',
    title: 'Document Speaks for Itself',
    shortForm: 'Document speaks for itself',
    fullText: 'Responding Party objects to the request on the grounds that the documents speak for themselves, and the request impermissibly seeks testimony regarding the contents of a writing in violation of Evidence Code section 1523.',
    applicableTo: ['rfa'],
    category: 'scope',
    citation: 'Evidence Code ? 1523',
  },

  // Expert
  {
    id: 'rfa_expert_lay',
    title: 'Expert from Lay Witness',
    shortForm: 'Seeks expert testimony from lay witness',
    fullText: 'Responding Party objects to this request on the grounds that it improperly seeks expert testimony from a lay witness.',
    applicableTo: ['rfa'],
    category: 'expert',
  },

  // Premature
  {
    id: 'rfa_premature',
    title: 'Premature',
    shortForm: 'Premature - investigation ongoing',
    fullText: 'Responding Party objects to the request on the grounds that it is premature as Responding Party has not had sufficient opportunity to complete its investigation and discovery.',
    applicableTo: ['rfa'],
    category: 'premature',
  },

  // Privilege
  {
    id: 'rfa_attorney_client',
    title: 'Attorney-Client Privilege',
    shortForm: 'Attorney-client privilege and work product',
    fullText: 'Responding Party objects to this request on the grounds that it seeks to violate the attorney-client privilege and attorney work product doctrine in violation of Code of Civil Procedure sections 2017.010 and 2018.030, and Evidence Code section 950.',
    applicableTo: ['rfa'],
    category: 'privilege',
    citation: 'CCP ?? 2017.010, 2018.030; Evidence Code ? 950',
  },
];

// =============================================================================
// OBJECTION TEMPLATES - REQUESTS FOR PRODUCTION
// =============================================================================

export const RFP_OBJECTIONS: ObjectionTemplate[] = [
  // General
  {
    id: 'rfp_general',
    title: 'General Objections',
    shortForm: 'Incorporates general objections',
    fullText: 'Responding Party incorporates by reference all General Objections set forth above in the General Objections. Discovery is continuing and Responding Party reserves the right to amend this response upon discovery of additional facts and information.',
    applicableTo: ['rfp'],
    category: 'general',
  },

  // Vagueness
  {
    id: 'rfp_vague_terms',
    title: 'Vague - Specific Terms',
    shortForm: 'Vague as to specific terms',
    fullText: 'Responding Party objects to the request on the grounds that it is vague, ambiguous, and unintelligible, by way of example and without limitation, with respect to the terms "[TERM1]," "[TERM2]," "[TERM3]," and "[TERM4]."',
    applicableTo: ['rfp'],
    category: 'vagueness',
    requiresCustomization: true,
  },

  // Substantive
  {
    id: 'rfp_lacks_foundation',
    title: 'Lacks Foundation',
    shortForm: 'Lacks foundation',
    fullText: 'Responding Party objects to this request on the grounds that it lacks foundation.',
    applicableTo: ['rfp'],
    category: 'scope',
  },
  {
    id: 'rfp_speculation',
    title: 'Calls for Speculation',
    shortForm: 'Calls for speculation',
    fullText: 'Responding Party objects to this request on the grounds that it calls for speculation.',
    applicableTo: ['rfp'],
    category: 'scope',
  },

  // Relevance
  {
    id: 'rfp_not_calculated',
    title: 'Not Calculated',
    shortForm: 'Not calculated to lead to admissible evidence',
    fullText: 'Responding Party objects to this request on the grounds that it is not calculated to lead to the discovery of admissible evidence in violation of Code of Civil Procedure ? 2017.010.',
    applicableTo: ['rfp'],
    category: 'relevance',
    citation: 'CCP ? 2017.010',
  },
  {
    id: 'rfp_cumulative',
    title: 'Cumulative',
    shortForm: 'Cumulative and duplicative',
    fullText: 'Responding Party objects to this request on the grounds that it is cumulative and duplicative of prior discovery in violation of Code of Civil Procedure ? 2019.030.',
    applicableTo: ['rfp'],
    category: 'relevance',
    citation: 'CCP ? 2019.030',
  },
  {
    id: 'rfp_remedial',
    title: 'Remedial Measures',
    shortForm: 'Seeks evidence of remedial measures',
    fullText: 'Responding Party objects to this request on the grounds that it impermissibly seeks evidence of remedial or precautionary measures in violation of Evidence Code ? 1151.',
    applicableTo: ['rfp'],
    category: 'relevance',
    citation: 'Evidence Code ? 1151',
  },
  {
    id: 'rfp_unrelated_negligent',
    title: 'Unrelated Negligent Acts',
    shortForm: 'Seeks irrelevant unrelated negligent acts',
    fullText: 'Responding Party objects to this request on the grounds that it seeks irrelevant evidence of unrelated purported negligent acts by Responding Party. (Marocco v. Ford Motor Co. (1970) 7 Cal.3d 84, 91.)',
    applicableTo: ['rfp'],
    category: 'relevance',
    citation: 'Marocco v. Ford Motor Co. (1970) 7 Cal.3d 84, 91',
  },

  // Burden
  {
    id: 'rfp_equally_available',
    title: 'Equally Available',
    shortForm: 'Documents equally available to propounding party',
    fullText: 'Responding Party objects to this request on the grounds that it seeks documents equally available to Propounding Party.',
    applicableTo: ['rfp'],
    category: 'burden',
  },

  // Privacy
  {
    id: 'rfp_privacy',
    title: 'Privacy',
    shortForm: 'Invasion of privacy',
    fullText: 'Responding Party objects to this request on the grounds that it is an impermissible invasion of Responding Party\'s and third parties\' constitutional right to privacy. (Cal. Const. Art. 1, ? 1; Garstang v. Superior Court (1995) 39 Cal.App.4th 526; Roberts v. Gulf Oil Corp. (1983) 147 Cal.App.3d 770, 798.)',
    applicableTo: ['rfp'],
    category: 'privacy',
    citation: 'Cal. Const. Art. 1, ? 1',
  },
  {
    id: 'rfp_personnel_files',
    title: 'Personnel Files',
    shortForm: 'Seeks confidential personnel files',
    fullText: 'Responding Party objects to this request on the grounds that it impermissibly seeks confidential personnel files at a person\'s place of employment. (Board of Trustees of Leland Stanford Jr. Univ. v. Sup.Ct. (Dong) (1981) 119 Cal.App.3d 516, 528?530.)',
    applicableTo: ['rfp'],
    category: 'privacy',
    citation: 'Board of Trustees v. Sup.Ct. (1981) 119 Cal.App.3d 516',
  },

  // Privilege
  {
    id: 'rfp_trade_secrets',
    title: 'Trade Secrets',
    shortForm: 'Seeks trade secrets',
    fullText: 'Responding Party objects to this request on the grounds that it impermissibly asks Responding Party to disclose trade secrets in violation of Civil Code ?? 3426-3426.11, also known as the Uniform Trade Secrets Act, and Evidence Code section 1060.',
    applicableTo: ['rfp'],
    category: 'privilege',
    citation: 'Civil Code ?? 3426-3426.11; Evidence Code ? 1060',
  },
  {
    id: 'rfp_tax_returns',
    title: 'Tax Returns',
    shortForm: 'Seeks privileged tax returns',
    fullText: 'Responding Party objects to this request on the grounds that it impermissibly asks Responding Party to disclose privileged income tax returns. (Webb v. Standard Oil Co. (1957) 49 Cal.2d 509, 513.)',
    applicableTo: ['rfp'],
    category: 'privilege',
    citation: 'Webb v. Standard Oil Co. (1957) 49 Cal.2d 509, 513',
  },
  {
    id: 'rfp_attorney_client',
    title: 'Attorney-Client Privilege',
    shortForm: 'Attorney-client privilege and work product',
    fullText: 'Responding Party objects to this request on the grounds that it seeks to violate the attorney-client privilege and attorney work product doctrine in violation of Code of Civil Procedure ? 2017.010 and 2018.030, and Evidence Code ? 950.',
    applicableTo: ['rfp'],
    category: 'privilege',
    citation: 'CCP ?? 2017.010, 2018.030; Evidence Code ? 950',
  },

  // Expert
  {
    id: 'rfp_expert_lay',
    title: 'Expert from Lay Witness',
    shortForm: 'Seeks expert testimony from lay witness',
    fullText: 'Responding Party objects to this request on the grounds that it improperly seeks expert testimony from a lay witness.',
    applicableTo: ['rfp'],
    category: 'expert',
  },
];

// =============================================================================
// RESPONSE TEMPLATES
// =============================================================================

export const RESPONSE_TRANSITION = 'Subject to and without waiving these objections, Responding Party states as follows:';

export const INTERROGATORY_ANSWER_TEMPLATES = {
  standard: 'Subject to and without waiving these objections, Responding Party states as follows:\n[ANSWER]',
  compilation: `Pursuant to Code of Civil Procedure section 2030.230, Responding Party states that an answer to this interrogatory would necessitate the preparation or the making of a compilation, abstract, audit, or summary of or from documents produced by Responding Party, and that the burden or expense of preparing or making the compilation, abstract, audit, or summary would be substantially the same for Propounding Party as for the responding party. Therefore, Responding Party hereby refers to documents produced by Responding Party which contain the information responsive to this interrogatory.`,
};

export const RFA_ANSWER_TEMPLATES = {
  admit: 'Admit.',
  deny: 'Deny.',
  lackKnowledge: 'After reasonable inquiry, Responding Party lacks information or knowledge to admit or deny this request based upon information known or readily obtainable to Responding Party.',
};

export const RFP_ANSWER_TEMPLATES = {
  willProduce: 'Responding Party will produce any non-privileged responsive documents relevant to the subject matter of this action in its possession, to the extent any such documents exist.',
  previouslyProduced: 'Responding Party has previously produced non-privileged responsive documents relevant to the subject matter of this action in its possession.',
  willProduceAdditional: 'Responding Party has previously produced non-privileged responsive documents relevant to the subject matter of this action in its possession. Responding Party will also produce any additional non-privileged responsive documents relevant to the subject matter of this action in its possession, to the extent any such documents exist.',
  unableToLocate: 'Following a diligent search and reasonable inquiry, Responding Party has been unable to locate any responsive documents in its possession, custody, or control.',
  neverExisted: 'Following a diligent search and reasonable inquiry, Responding Party has been unable to locate the requested documents because they never existed.',
  lostOrStolen: 'Following a diligent search and reasonable inquiry, Responding Party has been unable to locate the requested documents because they have been lost or stolen.',
  inadvertentlyDestroyed: 'Following a diligent search and reasonable inquiry, Responding Party has been unable to locate the requested documents because they were inadvertently destroyed.',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all objections applicable to a specific discovery type
 */
export function getObjectionsForType(type: DiscoveryResponseType): ObjectionTemplate[] {
  const allObjections = [...INTERROGATORY_OBJECTIONS, ...FROG_OBJECTIONS, ...FROG_EMPLOYMENT_OBJECTIONS, ...RFA_OBJECTIONS, ...RFP_OBJECTIONS];
  return allObjections.filter(obj => obj.applicableTo.includes(type));
}

/**
 * Get objections grouped by category
 */
export function getObjectionsByCategory(type: DiscoveryResponseType): Record<ObjectionCategory, ObjectionTemplate[]> {
  const objections = getObjectionsForType(type);
  const grouped: Record<ObjectionCategory, ObjectionTemplate[]> = {
    general: [],
    procedural: [],
    vagueness: [],
    scope: [],
    burden: [],
    relevance: [],
    privilege: [],
    privacy: [],
    expert: [],
    premature: [],
  };

  objections.forEach(obj => {
    grouped[obj.category].push(obj);
  });

  return grouped;
}

/**
 * Format selected objections into a response block
 */
export function formatObjectionsBlock(selectedObjections: ObjectionTemplate[]): string {
  if (selectedObjections.length === 0) return '';
  
  return selectedObjections.map(obj => obj.fullText).join('\n\n');
}

/**
 * Build complete response with objections, transition, and answer
 */
export function buildCompleteResponse(
  objections: ObjectionTemplate[],
  answer: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _discoveryType: DiscoveryResponseType
): string {
  const parts: string[] = [];

  // Add objections
  if (objections.length > 0) {
    parts.push(formatObjectionsBlock(objections));
    parts.push(''); // Empty line
    parts.push(RESPONSE_TRANSITION);
  }

  // Add answer
  parts.push(answer);

  // Add reservation
  parts.push('');
  parts.push(DISCOVERY_RESERVATION);

  return parts.join('\n');
}

/**
 * Smart objection suggestions based on request content
 */
export function suggestObjections(
  requestText: string,
  discoveryType: DiscoveryResponseType
): string[] {
  const suggestions: string[] = [];
  const textLower = requestText.toLowerCase();

  // Get the prefix based on discovery type
  const prefix = discoveryType === 'interrogatories' ? 'int_' : 
                 discoveryType === 'rfa' ? 'rfa_' : 'rfp_';

  // Common patterns that trigger specific objections
  const patterns: { pattern: RegExp; objectionIds: string[] }[] = [
    // Time-based objections
    { pattern: /ten\s*\(?10\)?\s*years?|five\s*\(?5\)?\s*years?|prior to/i, objectionIds: [`${prefix}overbroad`, `${prefix}burdensome_timeframe`].filter(id => id !== 'rfp_overbroad' && id !== 'rfp_burdensome_timeframe') },
    
    // Document identification
    { pattern: /identify all documents/i, objectionIds: [`${prefix}overbroad`, `${prefix}burdensome_entire`].filter(id => id !== 'rfp_overbroad' && id !== 'rfp_burdensome_entire') },
    { pattern: /identify all persons/i, objectionIds: [`${prefix}overbroad`, `${prefix}burdensome_entire`].filter(id => id !== 'rfp_overbroad' && id !== 'rfp_burdensome_entire') },
    
    // Multiple sub-parts
    { pattern: /and|including but not limited to|such as/i, objectionIds: [`${prefix}compound`] },
    
    // Medical/Health
    { pattern: /health care provider|medical|treatment|diagnosis/i, objectionIds: [`${prefix}privacy`, `${prefix}privacy_third`].filter(Boolean) },
    
    // Financial
    { pattern: /income|wages|earnings|tax/i, objectionIds: [`${prefix}privacy`, `${prefix}tax_returns`].filter(Boolean) },
    
    // Employment
    { pattern: /employer|employment|personnel/i, objectionIds: [`${prefix}personnel_files`, `${prefix}privacy_third`].filter(Boolean) },
    
    // Broad "all" requests
    { pattern: /\ball\b.*\bdocuments\b|\ball\b.*\bpersons\b|\ball\b.*\bfacts\b/i, objectionIds: [`${prefix}overbroad`].filter(id => id !== 'rfp_overbroad') },
    
    // Legal conclusions
    { pattern: /contend|allege|claim that|basis for/i, objectionIds: [`${prefix}legal_conclusion`, `${prefix}premature`] },
  ];

  patterns.forEach(({ pattern, objectionIds }) => {
    if (pattern.test(textLower)) {
      // Filter to only include objection IDs that exist for this discovery type
      const validIds = objectionIds.filter(id => {
        const allObjections = getObjectionsForType(discoveryType);
        return allObjections.some(obj => obj.id === id);
      });
      suggestions.push(...validIds);
    }
  });

  // Remove duplicates
  return [...new Set(suggestions)];
}

/**
 * Get objection by ID
 */
export function getObjectionById(id: string): ObjectionTemplate | undefined {
  const allObjections = [...INTERROGATORY_OBJECTIONS, ...FROG_OBJECTIONS, ...FROG_EMPLOYMENT_OBJECTIONS, ...RFA_OBJECTIONS, ...RFP_OBJECTIONS];
  return allObjections.find(obj => obj.id === id);
}


