/**
 * California Form Interrogatories - Employment Law (DISC-002)
 * 
 * Complete text of all standard employment law interrogatories
 * per California Judicial Council Form DISC-002 (Rev. January 1, 2009)
 * 
 * Code of Civil Procedure §§ 2030.010-2030.410, 2033.710
 */

export interface DISC002Interrogatory {
  category: string;
  text: string;
  subparts?: string[];
}

export const DISC002_INTERROGATORIES: Record<string, DISC002Interrogatory> = {
  // =====================================================
  // 200.0 CONTRACT FORMATION
  // =====================================================
  '200.1': {
    category: 'Contract Formation',
    text: 'Do you contend that the EMPLOYMENT relationship was "at will"? If so: (a) state all facts upon which you base this contention; (b) state the name, ADDRESS, and telephone number of each PERSON who has knowledge of those facts; and (c) identify all DOCUMENTS that support your contention.',
  },
  '200.2': {
    category: 'Contract Formation',
    text: 'Do you contend that the EMPLOYMENT relationship was not "at will"? If so: (a) state all facts upon which you base this contention; (b) state the name, ADDRESS, and telephone number of each PERSON who has knowledge of those facts; and (c) identify all DOCUMENTS that support your contention.',
  },
  '200.3': {
    category: 'Contract Formation',
    text: 'Do you contend that the EMPLOYMENT relationship was governed by any agreement—written, oral, or implied? If so: (a) state all facts upon which you base this contention; (b) state the name, ADDRESS, and telephone number of each PERSON who has knowledge of those facts; and (c) identify all DOCUMENTS that support your contention.',
  },
  '200.4': {
    category: 'Contract Formation',
    text: 'Was any part of the parties\' EMPLOYMENT relationship governed in whole or in part by any written rules, guidelines, policies, or procedures established by the EMPLOYER? If so, for each DOCUMENT containing the written rules, guidelines, policies, or procedures: (a) state the date and title of the DOCUMENT and a general description of its contents; (b) state the manner in which the DOCUMENT was communicated to employees; and (c) state the manner, if any, in which employees acknowledged either receipt of the DOCUMENT or knowledge of its contents.',
  },
  '200.5': {
    category: 'Contract Formation',
    text: 'Was any part of the parties\' EMPLOYMENT relationship covered by one or more collective bargaining agreements or memorandums of understanding between the EMPLOYER (or an association of employers) and any labor union or employee association? If so, for each collective bargaining agreement or memorandum of understanding, state: (a) the names and ADDRESSES of the parties to the collective bargaining agreement or memorandum of understanding; (b) the beginning and ending dates, if applicable, of the collective bargaining agreement or memorandum of understanding; and (c) which parts of the collective bargaining agreement or memorandum of understanding, if any, govern (1) any dispute or claim referred to in the PLEADINGS and (2) the rules or procedures for resolving any dispute or claim referred to in the PLEADINGS.',
  },
  '200.6': {
    category: 'Contract Formation',
    text: 'Do you contend that the EMPLOYEE and the EMPLOYER were in a business relationship other than an EMPLOYMENT relationship? If so, for each relationship: (a) state the names of the parties to the relationship; (b) identify the relationship; and (c) state all facts upon which you base your contention that the parties were in a relationship other than an EMPLOYMENT relationship.',
  },

  // =====================================================
  // 201.0 ADVERSE EMPLOYMENT ACTION
  // =====================================================
  '201.1': {
    category: 'Adverse Employment Action',
    text: 'Was the EMPLOYEE involved in a TERMINATION? If so: (a) state all reasons for the EMPLOYEE\'S TERMINATION; (b) state the name, ADDRESS, and telephone number of each PERSON who participated in the TERMINATION decision; (c) state the name, ADDRESS, and telephone number of each PERSON who provided any information relied upon in the TERMINATION decision; and (d) identify all DOCUMENTS relied upon in the TERMINATION decision.',
  },
  '201.2': {
    category: 'Adverse Employment Action',
    text: 'Are there any facts that would support the EMPLOYEE\'S TERMINATION that were first discovered after the TERMINATION? If so: (a) state the specific facts; (b) state when and how EMPLOYER first learned of each specific fact; (c) state the name, ADDRESS, and telephone number of each PERSON who has knowledge of the specific facts; and (d) identify all DOCUMENTS that evidence these specific facts.',
  },
  '201.3': {
    category: 'Adverse Employment Action',
    text: 'Were there any other ADVERSE EMPLOYMENT ACTIONS, including (the asking party should list the ADVERSE EMPLOYMENT ACTIONS): If so, for each action, provide the following: (a) all reasons for each ADVERSE EMPLOYMENT ACTION; (b) the name, ADDRESS, and telephone number of each PERSON who participated in making each ADVERSE EMPLOYMENT ACTION decision; (c) the name, ADDRESS, and telephone number of each PERSON who provided any information relied upon in making each ADVERSE EMPLOYMENT ACTION decision; and (d) the identity of all DOCUMENTS relied upon in making each ADVERSE EMPLOYMENT ACTION decision.',
  },
  '201.4': {
    category: 'Adverse Employment Action',
    text: 'Was the TERMINATION or any other ADVERSE EMPLOYMENT ACTIONS referred to in Interrogatories 201.1 through 201.3 based in whole or in part on the EMPLOYEE\'S job performance? If so, for each action: (a) identify the ADVERSE EMPLOYMENT ACTION; (b) identify the EMPLOYEE\'S specific job performance that played a role in that ADVERSE EMPLOYMENT ACTION; (c) identify any rules, guidelines, policies, or procedures that were used to evaluate the EMPLOYEE\'S specific job performance; (d) state the names, ADDRESSES, and telephone numbers of all PERSONS who had responsibility for evaluating the specific job performance of the EMPLOYEE; (e) state the names, ADDRESSES, and telephone numbers of all PERSONS who have knowledge of the EMPLOYEE\'S specific job performance that played a role in that ADVERSE EMPLOYMENT ACTION; and (f) describe all warnings given with respect to the EMPLOYEE\'S specific job performance.',
  },
  '201.5': {
    category: 'Adverse Employment Action',
    text: 'Was any PERSON hired to replace the EMPLOYEE after the EMPLOYEE\'S TERMINATION or demotion? If so, state the PERSON\'S name, job title, qualifications, ADDRESS and telephone number, and the date the PERSON was hired.',
  },
  '201.6': {
    category: 'Adverse Employment Action',
    text: 'Has any PERSON performed any of the EMPLOYEE\'S former job duties after the EMPLOYEE\'S TERMINATION or demotion? If so: (a) state the PERSON\'S name, job title, ADDRESS, and telephone number; (b) identify the duties; and (c) state the date on which the PERSON started to perform the duties.',
  },
  '201.7': {
    category: 'Adverse Employment Action',
    text: 'If the ADVERSE EMPLOYMENT ACTION involved the failure or refusal to select the EMPLOYEE (for example, for hire, promotion, transfer, or training), was any other PERSON selected instead? If so, for each ADVERSE EMPLOYMENT ACTION, state the name, ADDRESS, and telephone number of each PERSON selected; the date the PERSON was selected; and the reason the PERSON was selected instead of the EMPLOYEE.',
  },

  // =====================================================
  // 202.0 DISCRIMINATION—INTERROGATORIES TO EMPLOYEE
  // =====================================================
  '202.1': {
    category: 'Discrimination - To Employee',
    text: 'Do you contend that any ADVERSE EMPLOYMENT ACTIONS against you were discriminatory? If so: (a) identify each ADVERSE EMPLOYMENT ACTION that involved unlawful discrimination; (b) identify each characteristic (for example, gender, race, age, etc.) on which you base your claim or claims of discrimination; (c) state all facts upon which you base each claim of discrimination; (d) state the name, ADDRESS, and telephone number of each PERSON with knowledge of those facts; and (e) identify all DOCUMENTS evidencing those facts.',
  },
  '202.2': {
    category: 'Discrimination - To Employee',
    text: 'State all facts upon which you base your contention that you were qualified to perform any job which you contend was denied to you on account of unlawful discrimination.',
  },

  // =====================================================
  // 203.0 HARASSMENT—INTERROGATORIES TO EMPLOYEE
  // =====================================================
  '203.1': {
    category: 'Harassment - To Employee',
    text: 'Do you contend that you were unlawfully harassed in your employment? If so: (a) state the name, ADDRESS, telephone number, and employment position of each PERSON whom you contend harassed you; (b) for each PERSON whom you contend harassed you, describe the harassment; (c) identify each characteristic (for example, gender, race, age, etc.) on which you base your claim of harassment; (d) state all facts upon which you base your contention that you were unlawfully harassed; (e) state the name, ADDRESS, and telephone number of each PERSON with knowledge of those facts; and (f) identify all DOCUMENTS evidencing those facts.',
  },

  // =====================================================
  // 204.0 DISABILITY DISCRIMINATION
  // =====================================================
  '204.1': {
    category: 'Disability Discrimination',
    text: 'Name and describe each disability alleged in the PLEADINGS.',
  },
  '204.2': {
    category: 'Disability Discrimination',
    text: 'Does the EMPLOYEE allege any injury or illness that arose out of or in the course of EMPLOYMENT? If so, state: (a) the nature of such injury or illness; (b) how such injury or illness occurred; (c) the date on which such injury or illness occurred; (d) whether EMPLOYEE has filed a workers\' compensation claim. If so, state the date and outcome of the claim; and (e) whether EMPLOYEE has filed or applied for disability benefits of any type. If so, state the date, identify the nature of the benefits applied for, and the outcome of any such application.',
  },
  '204.3': {
    category: 'Disability Discrimination',
    text: 'Were there any communications between the EMPLOYEE (or the EMPLOYEE\'S HEALTH CARE PROVIDER) and the EMPLOYER about the type or extent of any disability of EMPLOYEE? If so: (a) state the name, ADDRESS, and telephone number of each person who made or received the communications; (b) state the name, ADDRESS, and telephone number of each PERSON who witnessed the communications; (c) describe the date and substance of the communications; and (d) identify each DOCUMENT that refers to the communications.',
  },
  '204.4': {
    category: 'Disability Discrimination',
    text: 'Did the EMPLOYER have any information about the type, existence, or extent of any disability of EMPLOYEE other than from communications with the EMPLOYEE or the EMPLOYEE\'S HEALTH CARE PROVIDER? If so, state the sources and substance of that information and the name, ADDRESS, and telephone number of each PERSON who provided or received the information.',
  },
  '204.5': {
    category: 'Disability Discrimination',
    text: 'Did the EMPLOYEE need any accommodation to perform any function of the EMPLOYEE\'S job position or need a transfer to another position as an accommodation? If so, describe the accommodations needed.',
  },
  '204.6': {
    category: 'Disability Discrimination',
    text: 'Were there any communications between the EMPLOYEE (or the EMPLOYEE\'S HEALTH CARE PROVIDER) and the EMPLOYER about any possible accommodation of EMPLOYEE? If so, for each communication: (a) state the name, ADDRESS, and telephone number of each PERSON who made or received the communication; (b) state the name, ADDRESS, and telephone number of each PERSON who witnessed the communication; (c) describe the date and substance of the communication; and (d) identify each DOCUMENT that refers to the communication.',
  },
  '204.7': {
    category: 'Disability Discrimination',
    text: 'What did the EMPLOYER consider doing to accommodate the EMPLOYEE? For each accommodation considered: (a) describe the accommodation considered; (b) state whether the accommodation was offered to the EMPLOYEE; (c) state the EMPLOYEE\'S response; or (d) if the accommodation was not offered, state all the reasons why this decision was made; (e) state the name, ADDRESS, and telephone number of each PERSON who on behalf of EMPLOYER made any decision about what accommodations, if any, to make for the EMPLOYEE; and (f) state the name, ADDRESS, and telephone number of each PERSON who on behalf of the EMPLOYER made or received any communications about what accommodations, if any, to make for the EMPLOYEE.',
  },

  // =====================================================
  // 205.0 DISCHARGE IN VIOLATION OF PUBLIC POLICY
  // =====================================================
  '205.1': {
    category: 'Discharge in Violation of Public Policy',
    text: 'Do you contend that the EMPLOYER took any ADVERSE EMPLOYMENT ACTION against you in violation of public policy? If so: (a) identify the constitutional provision, statute, regulation, or other source of the public policy that you contend was violated; and (b) state all facts upon which you base your contention that the EMPLOYER violated public policy.',
  },

  // =====================================================
  // 206.0 DEFAMATION
  // =====================================================
  '206.1': {
    category: 'Defamation',
    text: 'Did the EMPLOYER\'S agents or employees PUBLISH any of the allegedly defamatory statements identified in the PLEADINGS? If so, for each statement: (a) identify the PUBLISHED statement; (b) state the name, ADDRESS, telephone number, and job title of each person who PUBLISHED the statement; (c) state the name, ADDRESS, and telephone number of each person to whom the statement was PUBLISHED; (d) state whether, at the time the statement was PUBLISHED, the PERSON who PUBLISHED the statement believed it to be true; and (e) state all facts upon which the PERSON who published the statement based the belief that it was true.',
  },
  '206.2': {
    category: 'Defamation',
    text: 'State the name and ADDRESS of each agent or employee of the EMPLOYER who responded to any inquiries regarding the EMPLOYEE after the EMPLOYEE\'S TERMINATION.',
  },
  '206.3': {
    category: 'Defamation',
    text: 'State the name and ADDRESS of the recipient and the substance of each post-TERMINATION statement PUBLISHED about EMPLOYEE by any agent or employee of EMPLOYER.',
  },

  // =====================================================
  // 207.0 INTERNAL COMPLAINTS
  // =====================================================
  '207.1': {
    category: 'Internal Complaints',
    text: 'Were there any internal written policies or regulations of the EMPLOYER that apply to the making of a complaint of the type that is the subject matter of this lawsuit? If so: (a) state the title and date of each DOCUMENT containing the policies or regulations and a general description of the DOCUMENT\'S contents; (b) state the manner in which the DOCUMENT was communicated to EMPLOYEES; (c) state the manner, if any, in which EMPLOYEES acknowledged receipt of the DOCUMENT or knowledge of its contents, or both; (d) state, if you contend that the EMPLOYEE failed to use any available internal complaint procedures, all facts that support that contention; and (e) state, if you contend that the EMPLOYEE\'S failure to use internal complaint procedures was excused, all facts why the EMPLOYEE\'S use of the procedures was excused.',
  },
  '207.2': {
    category: 'Internal Complaints',
    text: 'Did the EMPLOYEE complain to the EMPLOYER about any of the unlawful conduct alleged in the PLEADINGS? If so, for each complaint: (a) state the date of the complaint; (b) state the nature of the complaint; (c) state the name and ADDRESS of each PERSON to whom the complaint was made; (d) state the name, ADDRESS, telephone number, and job title of each PERSON who investigated the complaint; (e) state the name, ADDRESS, telephone number, and job title of each PERSON who participated in making decisions about how to conduct the investigation; (f) state the name, ADDRESS, telephone number, and job title of each PERSON who was interviewed or who provided an oral or written statement as part of the investigation of the complaint; (g) state the nature and date of any action taken in response to the complaint; (h) state whether the EMPLOYEE who made the complaint was made aware of the actions taken by the EMPLOYER in response to the complaint, and, if so, state how and when; (i) identify all DOCUMENTS relating to the complaint, the investigation, and any action taken in response to the complaint; and (j) state the name, ADDRESS, and telephone number of each PERSON who has knowledge of the EMPLOYEE\'S complaint or the EMPLOYER\'S response to the complaint.',
  },

  // =====================================================
  // 208.0 GOVERNMENTAL COMPLAINTS
  // =====================================================
  '208.1': {
    category: 'Governmental Complaints',
    text: 'Did the EMPLOYEE file a claim, complaint, or charge with any governmental agency that involved any of the material allegations made in the PLEADINGS? If so, for each claim, complaint, or charge: (a) state the date on which it was filed; (b) state the name and ADDRESS of the agency with which it was filed; (c) state the number assigned to the claim, complaint, or charge by the agency; (d) state the nature of each claim, complaint, or charge made; (e) state the date on which the EMPLOYER was notified of the claim, complaint, or charge; (f) state the name, ADDRESS, and telephone number of all PERSONS within the governmental agency with whom the EMPLOYER has had any contact or communication regarding the claim, complaint, or charge; (g) state whether a right to sue notice was issued and, if so, when; and (h) state whether any findings or conclusions regarding the complaint or charge have been made, and, if so, the date and description of the agency\'s findings or conclusions.',
  },
  '208.2': {
    category: 'Governmental Complaints',
    text: 'Did the EMPLOYER respond to any claim, complaint, or charge identified in Interrogatory 208.1? If so, for each claim, complaint, or charge: (a) state the nature and date of any investigation done or any other action taken by the EMPLOYER in response to the claim, complaint, or charge; (b) state the name, ADDRESS, telephone number, and job title of each person who investigated the claim, complaint, or charge; (c) state the name, ADDRESS, telephone number, and job title of each PERSON who participated in making decisions about how to conduct the investigation; and (d) state the name, ADDRESS, telephone number, and job title of each PERSON who was interviewed or who provided an oral or written statement as part of the investigation.',
  },

  // =====================================================
  // 209.0 OTHER EMPLOYMENT CLAIMS BY EMPLOYEE OR AGAINST EMPLOYER
  // =====================================================
  '209.1': {
    category: 'Other Employment Claims',
    text: 'Except for this action, in the past 10 years has the EMPLOYEE filed a civil action against any employer regarding the EMPLOYEE\'S employment? If so, for each civil action: (a) state the name, ADDRESS, and telephone number of each employer against whom the action was filed; (b) state the court, names of the parties, and case number of the civil action; (c) state the name, ADDRESS, and telephone number of any attorney representing the EMPLOYEE; and (d) state whether the action has been resolved or is pending.',
  },
  '209.2': {
    category: 'Other Employment Claims',
    text: 'Except for this action, in the past 10 years has any employee filed a civil action against the EMPLOYER regarding his or her employment? If so, for each civil action: (a) state the name, ADDRESS, and telephone number of each employee who filed the action; (b) state the court, names of the parties, and case number of the civil action; (c) state the name, ADDRESS, and telephone number of any attorney representing the EMPLOYER; and (d) state whether the action has been resolved or is pending.',
  },

  // =====================================================
  // 210.0 LOSS OF INCOME—INTERROGATORIES TO EMPLOYEE
  // =====================================================
  '210.1': {
    category: 'Loss of Income - To Employee',
    text: 'Do you attribute any loss of income, benefits, or earning capacity to any ADVERSE EMPLOYMENT ACTION? (If your answer is "no," do not answer Interrogatories 210.2 through 210.6.)',
  },
  '210.2': {
    category: 'Loss of Income - To Employee',
    text: 'State the total amount of income, benefits, or earning capacity you have lost to date and how the amount was calculated.',
  },
  '210.3': {
    category: 'Loss of Income - To Employee',
    text: 'Will you lose income, benefits, or earning capacity in the future as a result of any ADVERSE EMPLOYMENT ACTION? If so, state the total amount of income, benefits, or earning capacity you expect to lose, and how the amount was calculated.',
  },
  '210.4': {
    category: 'Loss of Income - To Employee',
    text: 'Have you attempted to minimize the amount of your lost income? If so, describe how; if not, explain why not.',
  },
  '210.5': {
    category: 'Loss of Income - To Employee',
    text: 'Have you purchased any benefits to replace any benefits to which you would have been entitled if the ADVERSE EMPLOYMENT ACTION had not occurred? If so, state the cost for each benefit purchased.',
  },
  '210.6': {
    category: 'Loss of Income - To Employee',
    text: 'Have you obtained other employment since any ADVERSE EMPLOYMENT ACTION? If so, for each new employment: (a) state when the new employment commenced; (b) state the hourly rate or monthly salary for the new employment; and (c) state the benefits available from the new employment.',
  },

  // =====================================================
  // 211.0 LOSS OF INCOME—INTERROGATORIES TO EMPLOYER
  // =====================================================
  '211.1': {
    category: 'Loss of Income - To Employer',
    text: 'Identify each type of BENEFIT to which the EMPLOYEE would have been entitled, from the date of the ADVERSE EMPLOYMENT ACTION to the present, if the ADVERSE EMPLOYMENT ACTION had not happened and the EMPLOYEE had remained in the same job position. For each type of benefit, state the amount the EMPLOYER would have paid to provide the benefit for the EMPLOYEE during this time period and the value of the BENEFIT to the EMPLOYEE.',
  },
  '211.2': {
    category: 'Loss of Income - To Employer',
    text: 'Do you contend that the EMPLOYEE has not made reasonable efforts to minimize the amount of the EMPLOYEE\'S lost income? If so: (a) describe what more EMPLOYEE should have done; (b) state the names, ADDRESSES, and telephone numbers of all PERSONS who have knowledge of the facts that support your contention; and (c) identify all DOCUMENTS that support your contention and state the name, ADDRESS, and telephone number of the PERSON who has each DOCUMENT.',
  },
  '211.3': {
    category: 'Loss of Income - To Employer',
    text: 'Do you contend that any of the lost income claimed by the EMPLOYEE, as disclosed in discovery thus far in this case, is unreasonable or was not caused by the ADVERSE EMPLOYMENT ACTION? If so: (a) state the amount of claimed lost income that you dispute; (b) state all facts upon which you base your contention; (c) state the names, ADDRESSES, and telephone numbers of all PERSONS who have knowledge of the facts; and (d) identify all DOCUMENTS that support your contention and state the name, ADDRESS, and telephone number of the PERSON who has each DOCUMENT.',
  },

  // =====================================================
  // 212.0 PHYSICAL, MENTAL, OR EMOTIONAL INJURIES—TO EMPLOYEE
  // =====================================================
  '212.1': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Do you attribute any physical, mental, or emotional injuries to the ADVERSE EMPLOYMENT ACTION? (If your answer is "no," do not answer Interrogatories 212.2 through 212.7.)',
  },
  '212.2': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Identify each physical, mental, or emotional injury that you attribute to the ADVERSE EMPLOYMENT ACTION and the area of your body affected.',
  },
  '212.3': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Do you still have any complaints of physical, mental, or emotional injuries that you attribute to the ADVERSE EMPLOYMENT ACTION? If so, for each complaint state: (a) a description of the injury; (b) whether the complaint is subsiding, remaining the same, or becoming worse; and (c) the frequency and duration.',
  },
  '212.4': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Did you receive any consultation or examination (except from expert witnesses covered by Code of Civil Procedure section 2034) or treatment from a HEALTH CARE PROVIDER for any injury you attribute to the ADVERSE EMPLOYMENT ACTION? If so, for each HEALTH CARE PROVIDER state: (a) the name, ADDRESS, and telephone number; (b) the type of consultation, examination, or treatment provided; (c) the dates you received consultation, examination, or treatment; and (d) the charges to date.',
  },
  '212.5': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Have you taken any medication, prescribed or not, as a result of injuries that you attribute to the ADVERSE EMPLOYMENT ACTION? If so, for each medication state: (a) the name of the medication; (b) the name, ADDRESS and telephone number of the PERSON who prescribed or furnished it; (c) the date prescribed or furnished; (d) the dates you began and stopped taking it; and (e) the cost to date.',
  },
  '212.6': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Are there any other medical services not previously listed in response to interrogatory 212.4 (for example, ambulance, nursing, prosthetics) that you received for injuries attributed to the ADVERSE EMPLOYMENT ACTION? If so, for each service state: (a) the nature; (b) the date; (c) the cost; and (d) the name, ADDRESS, and telephone number of each HEALTH CARE PROVIDER.',
  },
  '212.7': {
    category: 'Physical/Mental/Emotional Injuries - To Employee',
    text: 'Has any HEALTH CARE PROVIDER advised that you may require future or additional treatment for any injuries that you attribute to the ADVERSE EMPLOYMENT ACTION? If so, for each injury state: (a) the name and ADDRESS of each HEALTH CARE PROVIDER; (b) the complaints for which the treatment was advised; and (c) the nature, duration, and estimated cost of the treatment.',
  },

  // =====================================================
  // 213.0 OTHER DAMAGES—INTERROGATORIES TO EMPLOYEE
  // =====================================================
  '213.1': {
    category: 'Other Damages - To Employee',
    text: 'Are there any other damages that you attribute to the ADVERSE EMPLOYMENT ACTION? If so, for each item of damage state: (a) the nature; (b) the date it occurred; (c) the amount; and (d) the name, ADDRESS, and telephone number of each PERSON who has knowledge of the nature or amount of the damage.',
  },
  '213.2': {
    category: 'Other Damages - To Employee',
    text: 'Do any DOCUMENTS support the existence or amount of any item of damages claimed in Interrogatory 213.1? If so, identify the DOCUMENTS and state the name, ADDRESS, and telephone number of the PERSON who has each DOCUMENT.',
  },

  // =====================================================
  // 214.0 INSURANCE
  // =====================================================
  '214.1': {
    category: 'Insurance',
    text: 'At the time of the ADVERSE EMPLOYMENT ACTION, was there in effect any policy of insurance through which you were or might be insured in any manner for the damages, claims, or actions that have arisen out of the ADVERSE EMPLOYMENT ACTION? If so, for each policy state: (a) the kind of coverage; (b) the name and ADDRESS of the insurance company; (c) the name, ADDRESS, and telephone number of each named insured; (d) the policy number; (e) the limits of coverage for each type of coverage contained in the policy; (f) whether any reservation of rights or controversy or coverage dispute exists between you and the insurance company; and (g) the name, ADDRESS, and telephone number of the custodian of the policy.',
  },
  '214.2': {
    category: 'Insurance',
    text: 'Are you self-insured under any statute for the damages, claims, or actions that have arisen out of the ADVERSE EMPLOYMENT ACTION? If so, specify the statute.',
  },

  // =====================================================
  // 215.0 INVESTIGATION
  // =====================================================
  '215.1': {
    category: 'Investigation',
    text: 'Have YOU OR ANYONE ACTING ON YOUR BEHALF interviewed any individual concerning the ADVERSE EMPLOYMENT ACTION? If so, for each individual state: (a) the name, ADDRESS, and telephone number of the individual interviewed; (b) the date of the interview; and (c) the name, ADDRESS, and telephone number of the PERSON who conducted the interview.',
  },
  '215.2': {
    category: 'Investigation',
    text: 'Have YOU OR ANYONE ACTING ON YOUR BEHALF obtained a written or recorded statement from any individual concerning the ADVERSE EMPLOYMENT ACTION? If so, for each statement state: (a) the name, ADDRESS, and telephone number of the individual from whom the statement was obtained; (b) the name, ADDRESS, and telephone number of the individual who obtained the statement; (c) the date the statement was obtained; and (d) the name, ADDRESS, and telephone number of each PERSON who has the original statement or a copy.',
  },

  // =====================================================
  // 216.0 DENIALS AND SPECIAL OR AFFIRMATIVE DEFENSES
  // =====================================================
  '216.1': {
    category: 'Denials and Defenses',
    text: 'Identify each denial of a material allegation and each special or affirmative defense in your PLEADINGS and for each: (a) state all facts upon which you base the denial or special or affirmative defense; (b) state the names, ADDRESSES, and telephone numbers of all PERSONS who have knowledge of those facts; and (c) identify all DOCUMENTS and all other tangible things, that support your denial or special or affirmative defense, and state the name, ADDRESS, and telephone number of the PERSON who has each DOCUMENT.',
  },

  // =====================================================
  // 217.0 RESPONSE TO REQUEST FOR ADMISSIONS
  // =====================================================
  '217.1': {
    category: 'Response to Admissions',
    text: 'Is your response to each request for admission served with these interrogatories an unqualified admission? If not, for each response that is not an unqualified admission: (a) state the number of the request; (b) state all facts upon which you base your response; (c) state the names, ADDRESSES, and telephone numbers of all PERSONS who have knowledge of those facts; and (d) identify all DOCUMENTS and other tangible things that support your response and state the name, ADDRESS, and telephone number of the PERSON who has each DOCUMENT or thing.',
  },
};

/**
 * Get all DISC-002 interrogatory categories
 */
export function getDISC002Categories(): string[] {
  const categories = new Set<string>();
  Object.values(DISC002_INTERROGATORIES).forEach(interrog => {
    categories.add(interrog.category);
  });
  return Array.from(categories);
}

/**
 * Get interrogatories by category
 */
export function getDISC002ByCategory(category: string): Record<string, DISC002Interrogatory> {
  const result: Record<string, DISC002Interrogatory> = {};
  Object.entries(DISC002_INTERROGATORIES).forEach(([key, value]) => {
    if (value.category === category) {
      result[key] = value;
    }
  });
  return result;
}

/**
 * Get total count of DISC-002 interrogatories
 */
export function getDISC002Count(): number {
  return Object.keys(DISC002_INTERROGATORIES).length;
}
