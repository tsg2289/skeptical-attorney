// Request for Admissions (RFA) Template Questions
// These templates are used by the AI to generate properly formatted requests for admission
// SECURITY: These are generic legal patterns - no case-specific data

export interface RFATemplateCategory {
  id: string
  title: string
  questions: string[]
}

// Default California-compliant definitions for RFA
export const DEFAULT_RFA_DEFINITIONS = [
  '"YOU" and "YOUR" refer to the Responding Party, and any individuals acting on their behalf, including attorneys, accountants, agents, experts, employees, and officers.',
  '"DOCUMENT" and "DOCUMENTS" are defined as a "writing" pursuant to California Evidence Code section 250, including all forms of recorded communication.',
  '"INCIDENT" refers to the alleged automobile accident as described in the complaint.',
  '"DEFENDANTS" refers to the Defendant(s) named in this action.',
  '"HEALTH CARE PROVIDER" refers to any medical professional or facility.',
  '"PERSON(S)" includes any individual or entity.',
]

// RFA Introduction template
export const RFA_INTRODUCTION = `PROPOUNDING PARTY: [DEFENDANT]
RESPONDING PARTY: [PLAINTIFF]
SET NUMBER: ONE (1)

[DEFENDANT] ("Defendant" or "Propounding Party") requests that [PLAINTIFF] ("Plaintiff" or "Responding Party") admit the truthfulness of each of the facts set forth below pursuant to Code of Civil Procedure section 2033.010, et seq., within the time prescribed by law.`

// Template categories and questions for AI reference
export const RFA_TEMPLATE_CATEGORIES: RFATemplateCategory[] = [
  {
    id: 'facts',
    title: 'Facts',
    questions: [
      'Admit that [YOU] told the firefighters who responded to the scene of the [INCIDENT] that [YOU] were not injured.',
      'Admit that [YOU] told the first responders at the scene of the [INCIDENT] that [YOU] were not injured.',
      'Admit that [YOU] denied medical attention at the scene of the [INCIDENT].',
      'Admit that the [INCIDENT] was not a rear-end accident.',
      'Admit that [THIRD PARTY] was not negligent regarding the [INCIDENT].',
    ]
  },
  {
    id: 'injuries',
    title: 'Injuries',
    questions: [
      'Admit [YOU] were not injured as a result of the [INCIDENT].',
      'Admit that the pain in [YOUR] head/neck/chest/back/shoulders/hands has fully resolved since the [INCIDENT].',
      'Admit that [YOUR] emotional pain has fully resolved since the [INCIDENT].',
      'Admit that any injuries [YOU] sustained as set forth in [YOUR] complaint were not caused by [DEFENDANTS].',
      'Admit that no [HEALTH CARE PROVIDER] has informed [YOU] that the personal injuries [YOU] allege were a result of the [INCIDENT].',
      'Admit [YOU] discussed with [DOCTOR] degenerative changes in your back.',
      'Admit [YOU] currently have pain in [YOUR] back/legs.',
      'Admit [YOU] currently do not have pain in [YOUR] shoulders.',
      'Admit all of [YOUR] alleged injuries related to the [INCIDENT] have resolved.',
    ]
  },
  {
    id: 'previous-injuries',
    title: 'Previous Injuries',
    questions: [
      'Admit that [YOU] received treatment from a [HEALTH CARE PROVIDER] for any injury to a body part claimed as injured by the [INCIDENT] within ten years prior to the [INCIDENT].',
      'Admit [YOU] had pain in [YOUR] neck/back/right shoulder immediately before the [INCIDENT].',
    ]
  },
  {
    id: 'lost-earnings',
    title: 'Lost Earnings/Wages',
    questions: [
      'Admit [YOU] have not lost any earnings as a result of the [INCIDENT].',
      'Admit [YOU] will not lose income in the future as a result of the [INCIDENT].',
      'Admit [YOU] did not incur any lost wages or loss of earning capacity as a result of the [INCIDENT].',
      'Admit [YOU] do not have documents to support [YOUR] income from [YEAR].',
    ]
  },
  {
    id: 'property-damage',
    title: 'Property Damage',
    questions: [
      'Admit [YOU] are not claiming property damages as a result of the [INCIDENT].',
    ]
  },
  {
    id: 'treatment',
    title: 'Treatment',
    questions: [
      'Admit [YOU] did not seek medical treatment related to the [INCIDENT] until two weeks after the [INCIDENT].',
      'Admit [YOU] did not incur hospital and medical expenses for personal injuries as a result of the [INCIDENT].',
      'Admit no [HEALTH CARE PROVIDER] has informed [YOU] that treatments received were provided as a result of the [INCIDENT].',
      'Admit [YOU] are currently not treating for [YOUR] back.',
      'Admit [YOUR] last treatment date related to this [INCIDENT] was [DATE].',
    ]
  },
  {
    id: 'future-treatment',
    title: 'Future Treatment',
    questions: [
      'Admit no [PERSON] has told [YOU] that [YOU] will need future medical treatment as a result of the [INCIDENT].',
      'Admit no [HEALTH CARE PROVIDER] has informed [YOU] that [YOU] will require future treatment as a result of the [INCIDENT].',
      'Admit [YOU] will try to go as long as possible without back surgery.',
      'Admit [YOU] do not have future treatment or surgery scheduled for [YOUR] back or related to this [INCIDENT].',
    ]
  },
  {
    id: 'subsequent-treatment',
    title: 'Subsequent Treatment',
    questions: [
      'Admit [YOU] treated with [DOCTOR] in the past 10 years.',
    ]
  },
  {
    id: 'activities',
    title: 'Activities',
    questions: [
      'Admit [YOU] are still able to perform all activities previously performed prior to the [INCIDENT].',
      'Admit [YOU] are still capable of performing all employment-related activities previously performed prior to the [INCIDENT].',
    ]
  },
  {
    id: 'scars',
    title: 'Scars, Marks, or Disfigurements',
    questions: [
      'Admit [YOU] have no scars, marks, or disfigurements as a result of the [INCIDENT].',
    ]
  },
  {
    id: 'subsequent-accidents',
    title: 'Subsequent Accidents',
    questions: [
      'Admit that after the [INCIDENT] [YOU] fell down stairs and sustained injuries.',
      'Admit that after the [INCIDENT] [YOU] were in a snowboarding accident and sustained injuries.',
      'Admit [YOU] did not receive treatment by a [HEALTH CARE PROVIDER] for any injury claimed as injured by the [INCIDENT] subsequent to the [INCIDENT].',
    ]
  },
  {
    id: 'liens',
    title: 'Liens',
    questions: [
      'Admit [YOU] did not want to pay any money out-of-pocket for medical treatment related to this [INCIDENT].',
      'Admit any of [YOUR] [HEALTH CARE PROVIDERS] provided treatment on a lien basis.',
    ]
  },
  {
    id: 'liability',
    title: 'Liability',
    questions: [
      'Admit [DEFENDANTS] are not liable for the injuries alleged in [YOUR] complaint.',
      'Admit [DEFENDANTS] were not negligent as set forth in [YOUR] complaint.',
    ]
  },
  {
    id: 'property',
    title: 'Property',
    questions: [
      'Admit [YOU] did not incur loss of property use or property damage as a result of the [INCIDENT].',
    ]
  },
  {
    id: 'damages',
    title: 'Damages',
    questions: [
      'Admit [YOU] did not incur any non-economic damages as a result of the [INCIDENT].',
      'Admit no damages occurred to the rear of [YOUR] vehicle as a result of the [INCIDENT].',
    ]
  },
  {
    id: 'employment',
    title: 'Employment',
    questions: [
      'Admit [YOU] have been terminated from any job, occupation, or employment over the past ten years.',
    ]
  },
  {
    id: 'hiring-people',
    title: 'Hiring People',
    questions: [
      'Admit [YOU] have not hired anyone to assist as a consequence of the [INCIDENT].',
    ]
  },
  {
    id: 'attorney-referral',
    title: 'Attorney Referral',
    questions: [
      'Admit [YOUR] attorney referred [YOU] to [HEALTH CARE PROVIDERS] as a result of the [INCIDENT].',
    ]
  },
  {
    id: 'travel',
    title: 'Travel',
    questions: [
      'Admit [YOU] drove from [PLACE] to [PLACE] for medical procedures related to the [INCIDENT].',
    ]
  },
  {
    id: 'identification',
    title: 'Identification of People',
    questions: [
      'Admit that a male was the driver of the other vehicle involved in the [INCIDENT].',
    ]
  },
  {
    id: 'contracts',
    title: 'Contracts',
    questions: [
      'Admit [YOU] have a contract with [COMPANY].',
      'Admit [YOU] used logistics companies to contract for loads before and after the [INCIDENT].',
    ]
  },
  {
    id: 'cell-phone',
    title: 'Cell Phone',
    questions: [
      'Admit [YOU] used an app on [YOUR] phone to contract for loads before and during the [INCIDENT].',
    ]
  },
  {
    id: 'support',
    title: 'Support for People',
    questions: [
      'Admit [YOU] do not provide financial support for any of [YOUR] children.',
      'Admit [YOU] provide financial support for [YOUR] children.',
      'Admit [YOU] do not provide financial support for anyone besides yourself.',
    ]
  },
  {
    id: 'felonies',
    title: 'Felonies',
    questions: [
      'Admit [YOUR] felony conviction was not expunged.',
    ]
  },
]

// Helper function to get templates by category ID
export function getRFATemplatesByCategory(categoryId: string): string[] {
  const category = RFA_TEMPLATE_CATEGORIES.find(c => c.id === categoryId)
  return category?.questions || []
}

// Helper function to get all templates as a formatted string for AI context
export function getRFATemplatesForAI(categoryName?: string): string {
  // Find matching category by name or ID
  const matchingCategory = categoryName
    ? RFA_TEMPLATE_CATEGORIES.find(
        cat => cat.title.toLowerCase() === categoryName.toLowerCase() ||
               cat.id === categoryName.toLowerCase().replace(/\s+/g, '-')
      )
    : null

  // If we have a matching category, prioritize it, otherwise show common ones
  const categoriesToShow = matchingCategory 
    ? [matchingCategory, ...RFA_TEMPLATE_CATEGORIES.filter(c => c.id !== matchingCategory.id).slice(0, 5)]
    : RFA_TEMPLATE_CATEGORIES.slice(0, 8)

  return `
TEMPLATE REQUESTS FOR ADMISSION FOR REFERENCE:
Use these as a guide for proper phrasing, style, and the types of admissions to request.
Follow the same format and legal terminology shown in these examples.
Use defined terms like YOU, YOUR, INCIDENT, HEALTH CARE PROVIDER, DEFENDANTS, PERSON in brackets or ALL CAPS.

${categoriesToShow.map(cat => `
### ${cat.title}:
${cat.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`).join('\n---\n')}

When drafting new requests for admission, follow these patterns closely. Every request should:
- Start with "Admit that..." or "Admit [YOU]..."
- Request admission of a SINGLE, specific fact
- Use defined terms in brackets like [YOU], [YOUR], [INCIDENT], [DEFENDANTS]
- Be phrased so it can be clearly admitted or denied
- Be strategically useful for establishing facts or challenging claims
`
}





