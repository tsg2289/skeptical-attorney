// Request for Production (RFP) Template Questions
// These templates are used by the AI to generate properly formatted document requests
// SECURITY: These are generic legal patterns - no case-specific data

export interface RFPTemplateCategory {
  id: string
  title: string
  questions: string[]
}

// Default California-compliant definitions for RFP
export const DEFAULT_RFP_DEFINITIONS = [
  'As used in this document and subsequent requests, the terms "YOU" and "YOUR" refer to Plaintiff and any individuals acting on their behalf, including attorneys, accountants, agents, experts, employees, and officers.',
  'As used in this document and subsequent requests, the term "COMPLAINT" means Plaintiff\'s complaint filed with the court in this matter.',
  'As used in this document and subsequent requests, the term "DOCUMENT" means a writing, as defined in California Evidence Code § 250, and includes the original or a copy of handwriting, typewriting, printing, photostating, photography, and every other means of recording upon any tangible thing and form of communication or representation, including letters, words, pictures, sounds, symbols, or combinations of them. The term "DOCUMENT" also includes any information, including, but not limited to electronic and/or electronically stored information pursuant to California Code of Civil Procedure §§ 2016.020(d) and 2016.020(e) and contained in the memory of computer systems, on diskettes, or on CD ROMs.',
  'As used in this document and subsequent requests, the term "INCIDENT" means the alleged set of facts and circumstances between Plaintiff and Defendants as alleged in the Plaintiff\'s COMPLAINT.',
  'As used in this document and subsequent requests, the term "REFER OR RELATE TO" means mentioning, constituting, containing, comprising, consisting of, summarizing, discussing, showing, describing, referring or relating to the subject in any way.',
  'As used in this document and subsequent requests, the term "HEALTH CARE PROVIDER" refers to physicians, doctors, nurses, home health care services, psychiatrists, psychologists, psychiatric or psychological social workers, counselors, therapists, hospitals, clinics or other facilities for inpatient or outpatient care, including facilities for the treatment of substance abuse.',
  'As used in this document and subsequent requests, the term "STATEMENT" shall mean any written or oral account of events expressing facts, views, or plans.',
  'As used in this document and subsequent requests, the term "COMMUNICATION" means any transmission of information, whether oral, written, or electronic.',
]

// Template categories and questions for AI reference
export const RFP_TEMPLATE_CATEGORIES: RFPTemplateCategory[] = [
  {
    id: 'facts',
    title: 'Facts',
    questions: [
      'All DOCUMENTS referencing, reflecting, or depicting the scene of the INCIDENT.',
      'All STATEMENTS, in any form, of the involved parties regarding the INCIDENT.',
      'All STATEMENTS, in any form, of witnesses to the INCIDENT.',
      'All DOCUMENTS that support YOUR cause of action for Negligence against Defendant, as alleged in YOUR operative complaint.',
      'All DOCUMENTS that support YOUR contention that Defendant is responsible for the injuries and damages suffered by YOU, as alleged in YOUR operative complaint.',
    ]
  },
  {
    id: 'reports',
    title: 'Reports',
    questions: [
      'All reports of any kind and nature, including, but not limited to, all traffic collision/police reports, investigative reports, notes, materials, statements, supplemental reports and documentation, photographs or other DOCUMENTS, by any individual, company or agency, police, sheriff or marshal\'s department or other governmental agency which investigated the INCIDENT.',
      'All DOCUMENTS related to YOUR driver logs related to the INCIDENT.',
      'Any and all reports or data generated from any data download related to YOUR vehicle in question on or after the date of the collision at issue in this lawsuit.',
      'All traffic collision/police reports of any kind and nature, including, but not limited to, all investigative materials, statements, supplemental reports and documentation, photographs or other materials, by a police, sheriff or marshal\'s department or other governmental agency which investigated the INCIDENT which gives rise to this lawsuit and are in YOUR possession.',
    ]
  },
  {
    id: 'liens',
    title: 'Liens',
    questions: [
      'All DOCUMENTS relating to any claims of interest, by way of lien, claim subrogation, or otherwise, to any recovery by anyone as related to the INCIDENT.',
    ]
  },
  {
    id: 'injuries',
    title: 'Injuries',
    questions: [
      'All DOCUMENTS referencing, reflecting, or depicting the injuries YOU allegedly sustained as a result of the INCIDENT.',
    ]
  },
  {
    id: 'treatment',
    title: 'Treatment',
    questions: [
      'All DOCUMENTS from any HEALTH CARE PROVIDER concerning any medical treatment (including but not limited to medical reports, hospital reports, ambulance records, memoranda, chart notes, progress notes, or any DOCUMENT that references the medical treatment, medical examinations and medical consultations for physical/psychological complaints) received by YOU for the injuries YOU attribute the INCIDENT.',
      'All DOCUMENTS that set forth the total amount of YOUR medical expenses that YOU attribute to the INCIDENT.',
      'All DOCUMENTS referencing, reflecting, or pertaining to treatment YOU received with YOUR primary care physician for the injuries YOU allegedly sustained as a result of the INCIDENT.',
      'All medication containers, labels, prescriptions and notes, reports and letters from any HEALTH CARE PROVIDER concerning medications prescribed to YOU stemming from this INCIDENT from the date of the INCIDENT, to the present date.',
    ]
  },
  {
    id: 'previous-treatment',
    title: 'Previous Treatment',
    questions: [
      'All DOCUMENTS from any HEALTH CARE PROVIDER concerning any medical treatment received by YOU for the same body parts that YOU contend were injured in the INCIDENT, in the last ten years.',
      'All DOCUMENTS from any HEALTH CARE PROVIDER concerning any medical treatment YOU received for the injuries similar to those YOU allegedly sustained as a result of the INCIDENT from ten (10) years prior to the INCIDENT.',
      'All DOCUMENTS evidencing medical care or treatment YOU received in the last five (5) years that relate to any symptoms or injuries that you currently allege were caused by the INCIDENT.',
    ]
  },
  {
    id: 'future-treatment',
    title: 'Future Treatment',
    questions: [
      'All DOCUMENTS referencing, reflecting, or pertaining to future medical treatment, including but not limited to costs, (if any) for the injuries YOU allegedly sustained as a result of the INCIDENT.',
      'All DOCUMENTS that support YOUR claim for future medical expenses (if any) in this action.',
    ]
  },
  {
    id: 'damages',
    title: 'Damages',
    questions: [
      'All DOCUMENTS that reference, reflect, or consist of any medical expenses, charges, costs, paid amounts, or billing of any HEALTH CARE PROVIDER that relate to the injuries YOU allegedly sustained as a result of the INCIDENT.',
    ]
  },
  {
    id: 'lost-wages',
    title: 'Lost Wages/Income',
    questions: [
      'All DOCUMENTS supporting YOUR claim for loss of income and/or earnings, if any, as a result of the INCIDENT.',
      'All DOCUMENTS from YOUR self-employment related to YOUR loss of earnings claim.',
      'All DOCUMENTS that support YOUR claim for loss of earning capacity.',
      'All DOCUMENTS that support YOUR claim for wage loss, including W2\'s or Social Security Administration documents.',
    ]
  },
  {
    id: 'media',
    title: 'Media (Photos and Video)',
    questions: [
      'All videos of the INCIDENT.',
      'All videos taken at the scene of the INCIDENT.',
      'All photographs, films, movies, videos or motion pictures which depict the bodily injuries YOU allegedly sustained or which depict YOUR treatment, care or recuperation following the INCIDENT.',
      'All photographs, films, movies, videos, or motion pictures of the scene of the INCIDENT.',
      'All photographs, films, movies, videos or motion pictures of any other vehicle and/or objects involved in the INCIDENT which gives rise to this lawsuit.',
      'All photographs, films, movies, videos or motion pictures of YOUR vehicle in the last 5 years.',
    ]
  },
  {
    id: 'communications',
    title: 'Communications',
    questions: [
      'All DOCUMENTS reflecting, referencing, or consisting of communications (whether oral or written) between YOU and any PERSON (excluding YOUR attorney) regarding the INCIDENT.',
      'All non-privileged notes or other writings made at any time regarding the INCIDENT in question.',
    ]
  },
  {
    id: 'cell-phone',
    title: 'Cell Phone',
    questions: [
      'Any and all DOCUMENTS, including cellular, mobile, telephone, voice or data communication billing, log or other writing which reflects each cellular, mobile, telephone, voice or data communication received or transmitted by anyone in YOUR vehicle involved in the subject vehicular INCIDENT in which cellular, mobile, telephone, voice or data communication occurred or was occurring at any time during the period of 30 minutes before the subject vehicular INCIDENT to and including 30 minutes after the subject vehicular INCIDENT.',
    ]
  },
  {
    id: 'employment-records',
    title: 'Employment Records',
    questions: [
      'A copy of any application for employment and all documents related to or concerning any application for employment for the past five (5) years to the present that were completed and/or submitted by YOU or on YOUR behalf.',
    ]
  },
  {
    id: 'future-lost-earnings',
    title: 'Future Lost Earnings',
    questions: [
      'All DOCUMENTS that support YOUR claim for future lost earnings.',
      'All DOCUMENTS from YOUR self-employment related to YOUR future loss of earnings claim.',
    ]
  },
  {
    id: 'punitive-damages',
    title: 'Punitive Damages',
    questions: [
      'All DOCUMENTS related to YOUR allegation of punitive damages against all defendants.',
    ]
  },
  {
    id: 'property',
    title: 'Property',
    questions: [
      'All repair bills for repairs actually made to YOUR property, including but not limited to YOUR vehicle, as a result of the INCIDENT.',
      'All estimates of the cost of repairs to YOUR property allegedly damaged as a result of the INCIDENT.',
    ]
  },
  {
    id: 'drivers-license',
    title: "Driver's License",
    questions: [
      'A true and correct photocopy of YOUR driver\'s license.',
    ]
  },
  {
    id: 'negligent-hiring',
    title: 'Negligent Hiring',
    questions: [
      'All DOCUMENTS that support YOUR cause of action for Negligent Hiring/Retention/Supervision/Training against Defendant, as alleged in YOUR operative complaint.',
    ]
  },
  {
    id: 'financial-records',
    title: 'Financial Records',
    questions: [
      'Produce all DOCUMENTS related to any loss of money you are claiming.',
      'Produce all DOCUMENTS from a HEALTH CARE PROVIDER concerning any future medical treatment (if any) for the injuries YOU allegedly sustained as a result of the INCIDENT.',
      'Produce all DOCUMENTS that reference the statements, billing and invoices regarding medical expenses, medical treatment, medical examinations and medical consultations for injuries or physical/psychological complaints which YOU claim arose out of the INCIDENT.',
      'Produce all DOCUMENTS on which YOU relied to calculate the total amount of loss of earnings YOU attribute to the INCIDENT.',
      'Produce all DOCUMENTS on which YOU relied to calculate the total amount of loss of future earning capacity YOU attribute to the INCIDENT.',
      'Produce all DOCUMENTS related to YOUR tax returns in the last 5 years.',
      'Produce all DOCUMENTS related to YOUR W2s in the last 5 years.',
    ]
  },
  {
    id: 'accident-history',
    title: 'Accident History',
    questions: [
      'Produce all DOCUMENTS that REFER OR RELATE to any motor vehicle accident YOU were involved in subsequent to the INCIDENT.',
      'Produce all DOCUMENTS that REFER OR RELATE to any motor vehicle accident YOU were involved in prior to the INCIDENT.',
      'Produce all DOCUMENTS that REFER OR RELATE to any injury suffered as a result of a motor vehicle accident YOU were involved in subsequent to the INCIDENT.',
      'Produce all DOCUMENTS that REFER OR RELATE to any injury suffered as a result of a motor vehicle accident YOU were involved in prior to the INCIDENT.',
    ]
  },
  {
    id: 'workers-compensation',
    title: "Worker's Compensation",
    questions: [
      'Produce all DOCUMENTS which relate to or refer to any workers\' compensation claim (including but not limited to any claims files, documents from medical providers, deposition transcripts, disability ratings, work accommodations, and adjudication award) from the past ten (10) years prior to the INCIDENT.',
      'Produce all DOCUMENTS which relate to or refer to any workers\' compensation claim (including but not limited to any claims files, documents from medical providers, deposition transcripts, disability ratings, work accommodations, and adjudication award) on any date after the INCIDENT.',
    ]
  },
  {
    id: 'bike',
    title: 'Bicycle (Specialty)',
    questions: [
      'All DOCUMENTS referencing, reflecting, or pertaining to all accidents, including but not limited to bicycle accidents, that YOU were involved in at any date prior to the INCIDENT where YOU injured the same body parts that YOU allegedly injured in the INCIDENT.',
      'All DOCUMENTS referencing, reflecting, or pertaining to all accidents, including but not limited to bicycle accidents, that YOU were involved in at any date after the INCIDENT where YOU injured the same body parts that YOU allegedly injured in the INCIDENT.',
      'All DOCUMENTS referencing, reflecting, or depicting the cycling gear (e.g. helmet, gloves, shoes, etc) that YOU were wearing at the time of the INCIDENT.',
      'All DOCUMENTS referencing, reflecting, or depicting any GPS device on YOUR bicycle that was active at the time of the INCIDENT.',
      'The GPS data from any device capturing YOUR bicycle ride on the date of the INCIDENT.',
      'All DOCUMENTS referencing, reflecting, or pertaining to the bike route that YOU were on, on the date of the INCIDENT.',
      'All DOCUMENTS from Strava that reference, reflect, or depict the ride that YOU were on at the time of the INCIDENT.',
      'All DOCUMENTS from Strava that reference, reflect, or depict any of YOUR bike rides from three (3) years prior to the INCIDENT to the present.',
    ]
  },
  {
    id: 'employment-law',
    title: 'Employment Law (Specialty)',
    questions: [
      'Produce all DOCUMENTS related to YOU working in excess of 8 hours a day and 40 hours a week without overtime pay as alleged in YOUR COMPLAINT.',
      'Produce all DOCUMENTS related to YOU being denied compliant meal breaks and rest periods as alleged in YOUR COMPLAINT.',
      'Produce all DOCUMENTS related to all purchases you made that you were not reimbursed for as alleged in YOUR COMPLAINT.',
      'Produce all DOCUMENTS related to YOUR alleged racial discrimination as alleged in YOUR COMPLAINT.',
      'Produce all DOCUMENTS related to the written notice YOU gave to the Labor and Workforce Development Agency as alleged in YOUR COMPLAINT.',
      'Produce all DOCUMENTS related to your right to sue letter you filed with the Department of Fair Employment and Housing as alleged in YOUR COMPLAINT.',
    ]
  },
  {
    id: 'causes-of-action',
    title: 'Causes of Action (Specialty)',
    questions: [
      'All DOCUMENTS related to YOUR cause of action for Wrongful Termination and Retaliation in Violation of Public Policy.',
      'All DOCUMENTS related to YOUR cause of action for Discrimination in Violation of California Government Code § 12940 et seq.',
      'All DOCUMENTS related to YOUR cause of action for Disability Discrimination—Failure to Accommodate in Violation of Government Code § 12940(m).',
      'All DOCUMENTS related to YOUR cause of action for Failure to Engage in the Interactive Process in Violation of California Government Code §12940(n).',
      'All DOCUMENTS related to YOUR cause of action for Failure To Take Reasonable Steps To Prevent Discrimination And/Or Retaliation In Violation Of Government Code § 12940(k).',
      'All DOCUMENTS related to YOUR cause of action for Failure to Pay Regular Minimum Wages.',
      'All DOCUMENTS related to YOUR cause of action for Failure to Pay Overtime Wages.',
      'All DOCUMENTS related to YOUR cause of action for Failure to Provide Meal Breaks.',
      'All DOCUMENTS related to YOUR cause of action for Failure to Provide Rest Periods.',
      'All DOCUMENTS related to YOUR cause of action for Failure to Provide Accurate Itemized Wage Statement in Violation of Labor Code §226(a)(e).',
      'All DOCUMENTS related to YOUR cause of action for Failure to Reimburse Expenses.',
      'All DOCUMENTS related to YOUR cause of action for Unlawful Withholding of Wages.',
      'All DOCUMENTS related to YOUR cause of action for Waiting Time Penalties.',
      'All DOCUMENTS related to YOUR cause of action for Negligence.',
      'All DOCUMENTS related to YOUR cause of action for Negligent Infliction of Emotional Distress.',
      'All DOCUMENTS related to YOUR cause of action for Violation of California Business and Professions Code §§ 17200 et. seq. for Unfair Business Practices.',
    ]
  },
  {
    id: 'damages-relief',
    title: 'Damages and Relief (Specialty)',
    questions: [
      'Produce all DOCUMENTS related to YOUR general and compensatory damages as alleged in YOUR Prayer for Relief.',
      'Produce all DOCUMENTS related to YOUR emotional distress damages as alleged in YOUR Prayer for Relief.',
      'Produce all DOCUMENTS related to YOUR special damages as alleged in YOUR Prayer for Relief.',
      'Produce all DOCUMENTS related to YOUR liquidated damages as alleged in YOUR Prayer for Relief.',
      'Produce all DOCUMENTS related to YOUR claim for restitution as alleged in YOUR Prayer for Relief.',
      'Produce all DOCUMENTS related to your punitive damages claim as alleged in YOUR Prayer for Relief.',
      'Produce all DOCUMENTS related to your civil and statutory penalties claim as alleged in YOUR Prayer for Relief.',
    ]
  },
]

// Helper function to get templates by category ID
export function getRFPTemplatesByCategory(categoryId: string): string[] {
  const category = RFP_TEMPLATE_CATEGORIES.find(c => c.id === categoryId)
  return category?.questions || []
}

// Helper function to get all templates as a formatted string for AI context
export function getRFPTemplatesForAI(categoryName?: string): string {
  // Find matching category by name or ID
  const matchingCategory = categoryName
    ? RFP_TEMPLATE_CATEGORIES.find(
        cat => cat.title.toLowerCase() === categoryName.toLowerCase() ||
               cat.id === categoryName.toLowerCase().replace(/\s+/g, '-')
      )
    : null

  // If we have a matching category, prioritize it, otherwise show common ones
  const categoriesToShow = matchingCategory 
    ? [matchingCategory, ...RFP_TEMPLATE_CATEGORIES.filter(c => c.id !== matchingCategory.id).slice(0, 3)]
    : RFP_TEMPLATE_CATEGORIES.slice(0, 6)

  return `
TEMPLATE DOCUMENT REQUESTS FOR REFERENCE:
Use these as a guide for proper phrasing, style, and the types of document requests to make.
Follow the same format and legal terminology shown in these examples.
Use defined terms like DOCUMENTS, INCIDENT, YOU/YOUR, HEALTH CARE PROVIDER in ALL CAPS.

${categoriesToShow.map(cat => `
### ${cat.title}:
${cat.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`).join('\n---\n')}

When drafting new requests, follow these patterns closely. Every request should:
- Start with "All DOCUMENTS..." or "Produce all DOCUMENTS..."
- Use defined terms in ALL CAPS
- Reference the INCIDENT appropriately
- Be specific about the type of documents requested
`
}






