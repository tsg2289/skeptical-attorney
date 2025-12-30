/**
 * Discovery Categories Configuration by Case Type
 * 
 * These are GENERIC legal category templates - no user data, no case-specific info.
 * Categories are selected based on the verified case_type from the database.
 * 
 * SECURITY: These templates exist in code only, never fetched from other users' cases.
 */

import { DiscoveryCategory } from '@/lib/supabase/caseStorage'

// Category definitions for different case types
export const DISCOVERY_CATEGORIES_BY_CASE_TYPE: Record<string, Omit<DiscoveryCategory, 'items'>[]> = {
  // Personal Injury / Auto Accident cases
  'personal_injury': [
    { id: 'facts', title: 'Facts' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'previous-treatment', title: 'Previous Treatment' },
    { id: 'future-treatment', title: 'Future Treatment' },
    { id: 'damages', title: 'Damages' },
    { id: 'lost-wages', title: 'Lost Wages/Income' },
    { id: 'activities', title: 'Activities' },
  ],
  'auto_accident': [
    { id: 'facts', title: 'Facts' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'previous-treatment', title: 'Previous Treatment' },
    { id: 'future-treatment', title: 'Future Treatment' },
    { id: 'damages', title: 'Damages' },
    { id: 'lost-wages', title: 'Lost Wages/Income' },
    { id: 'vehicle-damage', title: 'Vehicle Damage' },
    { id: 'accident-history', title: 'Accident History' },
  ],
  'premises_liability': [
    { id: 'facts', title: 'Facts' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'previous-treatment', title: 'Previous Treatment' },
    { id: 'damages', title: 'Damages' },
    { id: 'property-conditions', title: 'Property Conditions' },
    { id: 'notice', title: 'Notice/Knowledge' },
    { id: 'maintenance', title: 'Maintenance Records' },
  ],
  'medical_malpractice': [
    { id: 'facts', title: 'Facts' },
    { id: 'injuries', title: 'Injuries/Damages' },
    { id: 'treatment', title: 'Treatment at Issue' },
    { id: 'medical-records', title: 'Medical Records' },
    { id: 'standard-of-care', title: 'Standard of Care' },
    { id: 'causation', title: 'Causation' },
    { id: 'prior-medical-history', title: 'Prior Medical History' },
    { id: 'damages', title: 'Damages' },
  ],

  // Contract/Business disputes
  'contract_dispute': [
    { id: 'facts', title: 'Facts' },
    { id: 'contract-documents', title: 'Contract Documents' },
    { id: 'communications', title: 'Communications' },
    { id: 'performance', title: 'Performance' },
    { id: 'breach', title: 'Breach' },
    { id: 'damages', title: 'Damages' },
    { id: 'financial-records', title: 'Financial Records' },
  ],
  'breach_of_contract': [
    { id: 'facts', title: 'Facts' },
    { id: 'contract-documents', title: 'Contract Documents' },
    { id: 'communications', title: 'Communications' },
    { id: 'performance', title: 'Performance' },
    { id: 'breach', title: 'Breach' },
    { id: 'damages', title: 'Damages' },
    { id: 'financial-records', title: 'Financial Records' },
    { id: 'mitigation', title: 'Mitigation' },
  ],
  'business_dispute': [
    { id: 'facts', title: 'Facts' },
    { id: 'business-records', title: 'Business Records' },
    { id: 'contracts', title: 'Contracts/Agreements' },
    { id: 'communications', title: 'Communications' },
    { id: 'financial-records', title: 'Financial Records' },
    { id: 'damages', title: 'Damages' },
    { id: 'witnesses', title: 'Witnesses' },
  ],

  // Employment cases
  'employment': [
    { id: 'facts', title: 'Facts' },
    { id: 'employment-records', title: 'Employment Records' },
    { id: 'policies', title: 'Policies & Procedures' },
    { id: 'communications', title: 'Communications' },
    { id: 'witnesses', title: 'Witnesses' },
    { id: 'damages', title: 'Damages' },
    { id: 'personnel-files', title: 'Personnel Files' },
  ],
  'wrongful_termination': [
    { id: 'facts', title: 'Facts' },
    { id: 'employment-records', title: 'Employment Records' },
    { id: 'termination', title: 'Termination Documents' },
    { id: 'policies', title: 'Policies & Procedures' },
    { id: 'communications', title: 'Communications' },
    { id: 'performance-reviews', title: 'Performance Reviews' },
    { id: 'damages', title: 'Damages' },
    { id: 'similar-employees', title: 'Similarly Situated Employees' },
  ],
  'discrimination': [
    { id: 'facts', title: 'Facts' },
    { id: 'employment-records', title: 'Employment Records' },
    { id: 'discriminatory-acts', title: 'Discriminatory Acts' },
    { id: 'policies', title: 'Policies & Procedures' },
    { id: 'complaints', title: 'Complaints/Reports' },
    { id: 'comparators', title: 'Comparator Evidence' },
    { id: 'communications', title: 'Communications' },
    { id: 'damages', title: 'Damages' },
  ],
  'harassment': [
    { id: 'facts', title: 'Facts' },
    { id: 'harassment-incidents', title: 'Harassment Incidents' },
    { id: 'complaints', title: 'Complaints/Reports' },
    { id: 'policies', title: 'Policies & Procedures' },
    { id: 'training', title: 'Training Records' },
    { id: 'communications', title: 'Communications' },
    { id: 'witnesses', title: 'Witnesses' },
    { id: 'damages', title: 'Damages' },
  ],
  'wage_and_hour': [
    { id: 'facts', title: 'Facts' },
    { id: 'employment-records', title: 'Employment Records' },
    { id: 'time-records', title: 'Time Records' },
    { id: 'pay-records', title: 'Pay Records' },
    { id: 'policies', title: 'Policies & Procedures' },
    { id: 'job-duties', title: 'Job Duties' },
    { id: 'damages', title: 'Damages' },
  ],

  // Real Estate / Property
  'real_estate': [
    { id: 'facts', title: 'Facts' },
    { id: 'property-documents', title: 'Property Documents' },
    { id: 'title-documents', title: 'Title Documents' },
    { id: 'contracts', title: 'Contracts/Agreements' },
    { id: 'communications', title: 'Communications' },
    { id: 'inspections', title: 'Inspections' },
    { id: 'damages', title: 'Damages' },
  ],
  'landlord_tenant': [
    { id: 'facts', title: 'Facts' },
    { id: 'lease-documents', title: 'Lease Documents' },
    { id: 'rent-records', title: 'Rent Records' },
    { id: 'property-conditions', title: 'Property Conditions' },
    { id: 'communications', title: 'Communications' },
    { id: 'notices', title: 'Notices' },
    { id: 'damages', title: 'Damages' },
  ],

  // Family Law
  'family_law': [
    { id: 'facts', title: 'Facts' },
    { id: 'financial-records', title: 'Financial Records' },
    { id: 'income-documents', title: 'Income Documents' },
    { id: 'assets', title: 'Assets' },
    { id: 'debts', title: 'Debts/Liabilities' },
    { id: 'children', title: 'Children-Related' },
    { id: 'communications', title: 'Communications' },
  ],
  'divorce': [
    { id: 'facts', title: 'Facts' },
    { id: 'financial-records', title: 'Financial Records' },
    { id: 'income-documents', title: 'Income Documents' },
    { id: 'assets', title: 'Assets' },
    { id: 'debts', title: 'Debts/Liabilities' },
    { id: 'property', title: 'Property' },
    { id: 'children', title: 'Children-Related' },
    { id: 'communications', title: 'Communications' },
  ],

  // Intellectual Property
  'intellectual_property': [
    { id: 'facts', title: 'Facts' },
    { id: 'ip-documents', title: 'IP Documents' },
    { id: 'ownership', title: 'Ownership/Registration' },
    { id: 'infringement', title: 'Infringement Evidence' },
    { id: 'damages', title: 'Damages' },
    { id: 'communications', title: 'Communications' },
    { id: 'licenses', title: 'Licenses/Agreements' },
  ],

  // Insurance
  'insurance_dispute': [
    { id: 'facts', title: 'Facts' },
    { id: 'policy-documents', title: 'Policy Documents' },
    { id: 'claim-documents', title: 'Claim Documents' },
    { id: 'communications', title: 'Communications' },
    { id: 'coverage', title: 'Coverage Analysis' },
    { id: 'damages', title: 'Damages' },
    { id: 'bad-faith', title: 'Bad Faith Evidence' },
  ],
  'insurance_bad_faith': [
    { id: 'facts', title: 'Facts' },
    { id: 'policy-documents', title: 'Policy Documents' },
    { id: 'claim-handling', title: 'Claim Handling' },
    { id: 'communications', title: 'Communications' },
    { id: 'investigations', title: 'Investigations' },
    { id: 'similar-claims', title: 'Similar Claims' },
    { id: 'damages', title: 'Damages' },
  ],

  // Products Liability
  'products_liability': [
    { id: 'facts', title: 'Facts' },
    { id: 'product-documents', title: 'Product Documents' },
    { id: 'design', title: 'Design Documents' },
    { id: 'manufacturing', title: 'Manufacturing Records' },
    { id: 'warnings', title: 'Warnings/Instructions' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'similar-incidents', title: 'Similar Incidents' },
    { id: 'damages', title: 'Damages' },
  ],

  // Fraud
  'fraud': [
    { id: 'facts', title: 'Facts' },
    { id: 'misrepresentations', title: 'Misrepresentations' },
    { id: 'documents', title: 'Relevant Documents' },
    { id: 'communications', title: 'Communications' },
    { id: 'reliance', title: 'Reliance Evidence' },
    { id: 'damages', title: 'Damages' },
    { id: 'financial-records', title: 'Financial Records' },
  ],

  // Default/General
  'general_civil': [
    { id: 'facts', title: 'Facts' },
    { id: 'documents', title: 'Documents' },
    { id: 'communications', title: 'Communications' },
    { id: 'witnesses', title: 'Witnesses' },
    { id: 'damages', title: 'Damages' },
  ],
  'default': [
    { id: 'facts', title: 'Facts' },
    { id: 'documents', title: 'Documents' },
    { id: 'communications', title: 'Communications' },
    { id: 'witnesses', title: 'Witnesses' },
    { id: 'damages', title: 'Damages' },
  ],
}

// Quick action prompts by case type for RFP
export const RFP_QUICK_ACTIONS_BY_CASE_TYPE: Record<string, { label: string; prompt: string }[]> = {
  'personal_injury': [
    { label: 'Facts & Scene', prompt: 'Generate requests for all documents referencing, reflecting, or depicting the scene of the INCIDENT, including all STATEMENTS from involved parties and witnesses' },
    { label: 'Medical Records', prompt: 'Draft requests for all medical treatment records, bills, chart notes, and documents from HEALTH CARE PROVIDERS related to injuries from the INCIDENT' },
    { label: 'Photos/Videos', prompt: 'Create requests for all photographs, films, movies, videos or motion pictures of the INCIDENT scene, injuries, and vehicles involved' },
    { label: 'Lost Wages', prompt: 'Generate requests for all documents supporting wage loss claims, including W2s, tax returns, and employment records' },
    { label: 'Prior Treatment', prompt: 'Draft requests for all medical records for the same body parts from ten years prior to the INCIDENT' },
    { label: 'Accident History', prompt: 'Generate requests for all documents relating to any motor vehicle accidents YOU were involved in prior to or after the INCIDENT' },
  ],
  'auto_accident': [
    { label: 'Facts & Scene', prompt: 'Generate requests for all documents referencing, reflecting, or depicting the scene of the INCIDENT, including all STATEMENTS from involved parties and witnesses' },
    { label: 'Medical Records', prompt: 'Draft requests for all medical treatment records, bills, chart notes, and documents from HEALTH CARE PROVIDERS related to injuries from the INCIDENT' },
    { label: 'Vehicle Damage', prompt: 'Generate requests for all documents relating to vehicle damage, repair estimates, photos of vehicles, and property damage' },
    { label: 'Photos/Videos', prompt: 'Create requests for all photographs, films, movies, videos or motion pictures of the INCIDENT scene, injuries, and vehicles involved' },
    { label: 'Lost Wages', prompt: 'Generate requests for all documents supporting wage loss claims, including W2s, tax returns, and employment records' },
    { label: 'Insurance', prompt: 'Draft requests for all insurance policies, claim documents, and correspondence with insurance companies' },
  ],
  'contract_dispute': [
    { label: 'Contracts', prompt: 'Generate requests for all CONTRACT DOCUMENTS, including the original contract, amendments, modifications, and related agreements between the parties' },
    { label: 'Communications', prompt: 'Draft requests for all COMMUNICATIONS between the parties relating to the contract, including emails, letters, text messages, and meeting notes' },
    { label: 'Performance', prompt: 'Create requests for all documents evidencing performance or non-performance under the contract' },
    { label: 'Financial Records', prompt: 'Generate requests for all financial documents relating to the contract, including invoices, payments, and accounting records' },
    { label: 'Damages', prompt: 'Draft requests for all documents supporting claimed damages, including lost profits calculations and mitigation efforts' },
  ],
  'breach_of_contract': [
    { label: 'Contracts', prompt: 'Generate requests for all CONTRACT DOCUMENTS, including the original contract, amendments, modifications, and related agreements between the parties' },
    { label: 'Communications', prompt: 'Draft requests for all COMMUNICATIONS between the parties relating to the contract, including emails, letters, text messages, and meeting notes' },
    { label: 'Performance', prompt: 'Create requests for all documents evidencing performance or non-performance under the contract' },
    { label: 'Financial Records', prompt: 'Generate requests for all financial documents relating to the contract, including invoices, payments, and accounting records' },
    { label: 'Breach Evidence', prompt: 'Draft requests for all documents evidencing the alleged breach of contract' },
  ],
  'employment': [
    { label: 'Employment Records', prompt: 'Generate requests for all employment records, including the employment application, offer letter, and personnel file' },
    { label: 'Policies', prompt: 'Draft requests for all company policies, employee handbooks, and procedures relevant to the claims' },
    { label: 'Communications', prompt: 'Create requests for all communications relating to the employment relationship, including emails, performance reviews, and disciplinary actions' },
    { label: 'Pay Records', prompt: 'Generate requests for all pay records, pay stubs, W2s, and documents relating to compensation' },
    { label: 'Witnesses', prompt: 'Draft requests for documents identifying all persons with knowledge of the relevant facts' },
  ],
  'wrongful_termination': [
    { label: 'Employment Records', prompt: 'Generate requests for all employment records, including the employment application, offer letter, personnel file, and termination documents' },
    { label: 'Termination Docs', prompt: 'Draft requests for all documents relating to the decision to terminate, including meeting notes, decision-maker communications, and stated reasons' },
    { label: 'Performance', prompt: 'Create requests for all performance reviews, evaluations, and disciplinary records' },
    { label: 'Policies', prompt: 'Generate requests for all company policies, employee handbooks, and termination procedures' },
    { label: 'Comparators', prompt: 'Draft requests for documents relating to similarly situated employees and their treatment' },
  ],
  'discrimination': [
    { label: 'Employment Records', prompt: 'Generate requests for all employment records, including the employment application, personnel file, and performance reviews' },
    { label: 'Discriminatory Acts', prompt: 'Draft requests for all documents relating to the alleged discriminatory conduct or decisions' },
    { label: 'Complaints', prompt: 'Create requests for all complaints, grievances, or reports of discrimination' },
    { label: 'Policies', prompt: 'Generate requests for all anti-discrimination policies, training materials, and EEO records' },
    { label: 'Comparators', prompt: 'Draft requests for documents relating to similarly situated employees outside the protected class' },
  ],
  'real_estate': [
    { label: 'Property Docs', prompt: 'Generate requests for all documents relating to the property, including deeds, title documents, and surveys' },
    { label: 'Contracts', prompt: 'Draft requests for all purchase agreements, contracts, and closing documents' },
    { label: 'Inspections', prompt: 'Create requests for all inspection reports, disclosures, and condition reports' },
    { label: 'Communications', prompt: 'Generate requests for all communications between the parties relating to the property transaction' },
    { label: 'Financial', prompt: 'Draft requests for all financial documents relating to the transaction' },
  ],
  'insurance_dispute': [
    { label: 'Policy Docs', prompt: 'Generate requests for all insurance policy documents, declarations pages, and endorsements' },
    { label: 'Claim Docs', prompt: 'Draft requests for all claim documents, including the claim file, adjuster notes, and coverage analysis' },
    { label: 'Communications', prompt: 'Create requests for all communications between the insured and insurer relating to the claim' },
    { label: 'Investigations', prompt: 'Generate requests for all investigation documents, reports, and expert evaluations' },
    { label: 'Denials', prompt: 'Draft requests for all documents relating to the coverage determination or denial' },
  ],
  'default': [
    { label: 'Core Documents', prompt: 'Generate requests for all primary documents relevant to the claims and defenses in this matter' },
    { label: 'Communications', prompt: 'Draft requests for all communications between the parties relating to the subject matter of this litigation' },
    { label: 'Financial Records', prompt: 'Create requests for all financial documents relevant to the claimed damages' },
    { label: 'Witnesses', prompt: 'Generate requests for documents identifying all persons with knowledge of the relevant facts' },
  ],
}

// Quick action prompts by case type for Interrogatories
export const INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE: Record<string, { label: string; prompt: string }[]> = {
  'personal_injury': [
    { label: 'Incident Facts', prompt: 'Generate interrogatories asking the responding party to describe in detail the INCIDENT, including the date, time, location, and all facts known' },
    { label: 'Injuries', prompt: 'Draft interrogatories asking the responding party to IDENTIFY and describe all injuries claimed from the INCIDENT' },
    { label: 'Treatment', prompt: 'Create interrogatories asking the responding party to IDENTIFY all HEALTH CARE PROVIDERS who treated them for injuries from the INCIDENT' },
    { label: 'Lost Wages', prompt: 'Generate interrogatories asking the responding party to describe all claimed lost wages, income, and employment impacts' },
    { label: 'Witnesses', prompt: 'Draft interrogatories asking the responding party to IDENTIFY all witnesses to the INCIDENT' },
    { label: 'Prior Injuries', prompt: 'Create interrogatories asking about any prior injuries or treatment to the same body parts' },
  ],
  'auto_accident': [
    { label: 'Incident Facts', prompt: 'Generate interrogatories asking the responding party to describe in detail the INCIDENT, including the date, time, location, and all facts known' },
    { label: 'Injuries', prompt: 'Draft interrogatories asking the responding party to IDENTIFY and describe all injuries claimed from the INCIDENT' },
    { label: 'Vehicle Info', prompt: 'Create interrogatories asking about all vehicles involved, including ownership, insurance, and damage' },
    { label: 'Treatment', prompt: 'Generate interrogatories asking the responding party to IDENTIFY all HEALTH CARE PROVIDERS who treated them' },
    { label: 'Witnesses', prompt: 'Draft interrogatories asking the responding party to IDENTIFY all witnesses to the INCIDENT' },
    { label: 'Insurance', prompt: 'Create interrogatories asking about all applicable insurance policies and coverage' },
  ],
  'contract_dispute': [
    { label: 'Contract Facts', prompt: 'Generate interrogatories asking the responding party to describe the formation and terms of the contract at issue' },
    { label: 'Performance', prompt: 'Draft interrogatories asking the responding party to describe all acts of performance under the contract' },
    { label: 'Breach', prompt: 'Create interrogatories asking the responding party to IDENTIFY each alleged breach and the facts supporting it' },
    { label: 'Damages', prompt: 'Generate interrogatories asking the responding party to describe and calculate all claimed damages' },
    { label: 'Communications', prompt: 'Draft interrogatories asking about all communications relating to the contract' },
  ],
  'employment': [
    { label: 'Employment Facts', prompt: 'Generate interrogatories asking about the employment relationship, including job duties, compensation, and dates of employment' },
    { label: 'Adverse Actions', prompt: 'Draft interrogatories asking about any adverse employment actions and the reasons given' },
    { label: 'Policies', prompt: 'Create interrogatories asking the responding party to IDENTIFY all applicable policies and procedures' },
    { label: 'Witnesses', prompt: 'Generate interrogatories asking to IDENTIFY all persons with knowledge of the relevant facts' },
    { label: 'Damages', prompt: 'Draft interrogatories asking the responding party to describe and calculate all claimed damages' },
  ],
  'default': [
    { label: 'Core Facts', prompt: 'Generate interrogatories asking the responding party to describe in detail all facts supporting their claims or defenses' },
    { label: 'Witnesses', prompt: 'Draft interrogatories asking to IDENTIFY all persons with knowledge of the relevant facts' },
    { label: 'Documents', prompt: 'Create interrogatories asking the responding party to IDENTIFY all documents supporting their claims' },
    { label: 'Damages', prompt: 'Generate interrogatories asking the responding party to describe and calculate all claimed damages' },
  ],
}

/**
 * Get discovery categories based on case type
 * SECURITY: Only returns static template categories, no user data
 * 
 * @param caseType - The case type from the verified database record
 * @returns Array of category templates with empty items arrays
 */
export function getCategoriesForCaseType(caseType?: string | null): DiscoveryCategory[] {
  if (!caseType) {
    return DISCOVERY_CATEGORIES_BY_CASE_TYPE['default'].map(cat => ({ ...cat, items: [] }))
  }

  // Normalize the case type for lookup
  const normalizedType = caseType
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')

  // Try exact match first
  if (DISCOVERY_CATEGORIES_BY_CASE_TYPE[normalizedType]) {
    return DISCOVERY_CATEGORIES_BY_CASE_TYPE[normalizedType].map(cat => ({ ...cat, items: [] }))
  }

  // Try partial matching for common variations
  const typeMapping: Record<string, string> = {
    'personal': 'personal_injury',
    'injury': 'personal_injury',
    'pi': 'personal_injury',
    'auto': 'auto_accident',
    'car': 'auto_accident',
    'vehicle': 'auto_accident',
    'mva': 'auto_accident',
    'slip': 'premises_liability',
    'fall': 'premises_liability',
    'trip': 'premises_liability',
    'premises': 'premises_liability',
    'medical': 'medical_malpractice',
    'malpractice': 'medical_malpractice',
    'contract': 'contract_dispute',
    'breach': 'breach_of_contract',
    'business': 'business_dispute',
    'commercial': 'business_dispute',
    'employ': 'employment',
    'wrongful': 'wrongful_termination',
    'termination': 'wrongful_termination',
    'fired': 'wrongful_termination',
    'discriminat': 'discrimination',
    'harass': 'harassment',
    'wage': 'wage_and_hour',
    'overtime': 'wage_and_hour',
    'real_estate': 'real_estate',
    'property': 'real_estate',
    'landlord': 'landlord_tenant',
    'tenant': 'landlord_tenant',
    'eviction': 'landlord_tenant',
    'family': 'family_law',
    'divorce': 'divorce',
    'custody': 'family_law',
    'insurance': 'insurance_dispute',
    'bad_faith': 'insurance_bad_faith',
    'product': 'products_liability',
    'defect': 'products_liability',
    'fraud': 'fraud',
    'misrepresent': 'fraud',
    'ip': 'intellectual_property',
    'trademark': 'intellectual_property',
    'copyright': 'intellectual_property',
    'patent': 'intellectual_property',
  }

  // Check for partial matches
  for (const [keyword, mappedType] of Object.entries(typeMapping)) {
    if (normalizedType.includes(keyword)) {
      if (DISCOVERY_CATEGORIES_BY_CASE_TYPE[mappedType]) {
        return DISCOVERY_CATEGORIES_BY_CASE_TYPE[mappedType].map(cat => ({ ...cat, items: [] }))
      }
    }
  }

  // Default fallback
  return DISCOVERY_CATEGORIES_BY_CASE_TYPE['default'].map(cat => ({ ...cat, items: [] }))
}

/**
 * Get quick action prompts for RFP based on case type
 * SECURITY: Only returns static template prompts, no user data
 */
export function getRFPQuickActionsForCaseType(caseType?: string | null): { label: string; prompt: string }[] {
  if (!caseType) {
    return RFP_QUICK_ACTIONS_BY_CASE_TYPE['default']
  }

  const normalizedType = caseType.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_')

  // Try exact match
  if (RFP_QUICK_ACTIONS_BY_CASE_TYPE[normalizedType]) {
    return RFP_QUICK_ACTIONS_BY_CASE_TYPE[normalizedType]
  }

  // Check for partial matches using same mapping logic
  const typeKeywords = ['personal', 'injury', 'auto', 'contract', 'breach', 'employ', 'wrongful', 'discriminat', 'real_estate', 'insurance']
  for (const keyword of typeKeywords) {
    if (normalizedType.includes(keyword)) {
      const mappedType = keyword === 'personal' || keyword === 'injury' ? 'personal_injury' :
                         keyword === 'auto' ? 'auto_accident' :
                         keyword === 'contract' || keyword === 'breach' ? 'contract_dispute' :
                         keyword === 'employ' || keyword === 'wrongful' || keyword === 'discriminat' ? 'employment' :
                         keyword === 'real_estate' ? 'real_estate' :
                         keyword === 'insurance' ? 'insurance_dispute' : 'default'
      if (RFP_QUICK_ACTIONS_BY_CASE_TYPE[mappedType]) {
        return RFP_QUICK_ACTIONS_BY_CASE_TYPE[mappedType]
      }
    }
  }

  return RFP_QUICK_ACTIONS_BY_CASE_TYPE['default']
}

/**
 * Get quick action prompts for Interrogatories based on case type
 * SECURITY: Only returns static template prompts, no user data
 */
export function getInterrogatoryQuickActionsForCaseType(caseType?: string | null): { label: string; prompt: string }[] {
  if (!caseType) {
    return INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE['default']
  }

  const normalizedType = caseType.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_')

  // Try exact match
  if (INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE[normalizedType]) {
    return INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE[normalizedType]
  }

  // Check for partial matches
  const typeKeywords = ['personal', 'injury', 'auto', 'contract', 'employ']
  for (const keyword of typeKeywords) {
    if (normalizedType.includes(keyword)) {
      const mappedType = keyword === 'personal' || keyword === 'injury' ? 'personal_injury' :
                         keyword === 'auto' ? 'auto_accident' :
                         keyword === 'contract' ? 'contract_dispute' :
                         keyword === 'employ' ? 'employment' : 'default'
      if (INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE[mappedType]) {
        return INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE[mappedType]
      }
    }
  }

  return INTERROGATORY_QUICK_ACTIONS_BY_CASE_TYPE['default']
}

// RFA Categories by case type
export const RFA_CATEGORIES_BY_CASE_TYPE: Record<string, Omit<DiscoveryCategory, 'items'>[]> = {
  'personal_injury': [
    { id: 'facts', title: 'Facts & Scene' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'previous-injuries', title: 'Prior Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'future-treatment', title: 'Future Treatment' },
    { id: 'lost-earnings', title: 'Lost Wages' },
    { id: 'liability', title: 'Liability' },
    { id: 'damages', title: 'Damages' },
  ],
  'auto_accident': [
    { id: 'facts', title: 'Facts & Scene' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'previous-injuries', title: 'Prior Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'future-treatment', title: 'Future Treatment' },
    { id: 'lost-earnings', title: 'Lost Wages' },
    { id: 'liability', title: 'Liability' },
    { id: 'damages', title: 'Damages' },
    { id: 'subsequent-accidents', title: 'Subsequent Accidents' },
  ],
  'premises_liability': [
    { id: 'facts', title: 'Facts & Scene' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'previous-injuries', title: 'Prior Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'liability', title: 'Liability' },
    { id: 'notice', title: 'Notice/Knowledge' },
    { id: 'damages', title: 'Damages' },
  ],
  'medical_malpractice': [
    { id: 'facts', title: 'Facts' },
    { id: 'standard-of-care', title: 'Standard of Care' },
    { id: 'injuries', title: 'Injuries' },
    { id: 'treatment', title: 'Treatment' },
    { id: 'causation', title: 'Causation' },
    { id: 'damages', title: 'Damages' },
  ],
  'contract_dispute': [
    { id: 'contract-formation', title: 'Contract Formation' },
    { id: 'performance', title: 'Performance' },
    { id: 'breach', title: 'Breach' },
    { id: 'damages', title: 'Damages' },
    { id: 'defenses', title: 'Defenses' },
  ],
  'breach_of_contract': [
    { id: 'contract-formation', title: 'Contract Formation' },
    { id: 'performance', title: 'Performance' },
    { id: 'breach', title: 'Breach' },
    { id: 'damages', title: 'Damages' },
    { id: 'defenses', title: 'Defenses' },
  ],
  'employment': [
    { id: 'employment-facts', title: 'Employment Facts' },
    { id: 'policies', title: 'Policies' },
    { id: 'adverse-actions', title: 'Adverse Actions' },
    { id: 'damages', title: 'Damages' },
  ],
  'wrongful_termination': [
    { id: 'employment-facts', title: 'Employment Facts' },
    { id: 'termination', title: 'Termination' },
    { id: 'performance', title: 'Performance' },
    { id: 'policies', title: 'Policies' },
    { id: 'damages', title: 'Damages' },
  ],
  'discrimination': [
    { id: 'employment-facts', title: 'Employment Facts' },
    { id: 'discriminatory-acts', title: 'Discriminatory Acts' },
    { id: 'comparators', title: 'Comparators' },
    { id: 'policies', title: 'Policies' },
    { id: 'damages', title: 'Damages' },
  ],
  'default': [
    { id: 'facts', title: 'Facts' },
    { id: 'liability', title: 'Liability' },
    { id: 'damages', title: 'Damages' },
    { id: 'defenses', title: 'Defenses' },
  ],
}

/**
 * Get RFA categories based on case type
 * SECURITY: Only returns static template categories, no user data
 */
export function getRFACategoriesForCaseType(caseType?: string | null): DiscoveryCategory[] {
  if (!caseType) {
    return RFA_CATEGORIES_BY_CASE_TYPE['default'].map(cat => ({ ...cat, items: [] }))
  }

  const normalizedType = caseType.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_')

  // Try exact match
  if (RFA_CATEGORIES_BY_CASE_TYPE[normalizedType]) {
    return RFA_CATEGORIES_BY_CASE_TYPE[normalizedType].map(cat => ({ ...cat, items: [] }))
  }

  // Check for partial matches
  const typeMapping: Record<string, string> = {
    'personal': 'personal_injury',
    'injury': 'personal_injury',
    'auto': 'auto_accident',
    'car': 'auto_accident',
    'vehicle': 'auto_accident',
    'premises': 'premises_liability',
    'slip': 'premises_liability',
    'fall': 'premises_liability',
    'medical': 'medical_malpractice',
    'malpractice': 'medical_malpractice',
    'contract': 'contract_dispute',
    'breach': 'breach_of_contract',
    'employ': 'employment',
    'wrongful': 'wrongful_termination',
    'termination': 'wrongful_termination',
    'discriminat': 'discrimination',
  }

  for (const [keyword, mappedType] of Object.entries(typeMapping)) {
    if (normalizedType.includes(keyword)) {
      if (RFA_CATEGORIES_BY_CASE_TYPE[mappedType]) {
        return RFA_CATEGORIES_BY_CASE_TYPE[mappedType].map(cat => ({ ...cat, items: [] }))
      }
    }
  }

  return RFA_CATEGORIES_BY_CASE_TYPE['default'].map(cat => ({ ...cat, items: [] }))
}

