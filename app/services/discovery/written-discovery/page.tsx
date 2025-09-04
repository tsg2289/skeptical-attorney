'use client'

import { useState } from 'react'
import { Scale, FileText, Download, Copy, Check } from 'lucide-react'

interface DiscoveryRequest {
  id: number
  type: 'interrogatory' | 'request_for_production' | 'request_for_admission'
  text: string
}

const WrittenDiscoveryGenerator = () => {
  const [caseInfo, setCaseInfo] = useState({
    caseTitle: '',
    caseNumber: '',
    court: '',
    plaintiff: '',
    defendant: '',
    attorneyName: '',
    barNumber: '',
    firmName: 'Skeptical Attorney Legal Services',
    address: '',
    phone: '',
    email: ''
  })

  const [selectedType, setSelectedType] = useState<'interrogatory' | 'request_for_production' | 'request_for_admission'>('interrogatory')
  const [customRequests, setCustomRequests] = useState<string[]>([''])
  const [generatedDocument, setGeneratedDocument] = useState('')
  const [copied, setCopied] = useState(false)
  const [caseFactsInput, setCaseFactsInput] = useState('')
  const [factsBasedRequests, setFactsBasedRequests] = useState<string[]>([])
  const [isGeneratingFromFacts, setIsGeneratingFromFacts] = useState(false)

  const predefinedRequests = {
    interrogatory: [
      "State your full name, current address, and all addresses where you have resided during the five years preceding the incident that is the subject of this lawsuit.",
      "Identify all persons who witnessed the incident that is the subject of this lawsuit, including their names, addresses, and telephone numbers.",
      "Describe in detail your version of how the incident occurred, including the date, time, location, weather conditions, and all relevant circumstances.",
      "Identify all documents, photographs, videos, or other tangible evidence relating to the incident.",
      "List all medical treatment you received as a result of the incident, including the names and addresses of all healthcare providers.",
      "Describe all injuries you claim to have sustained as a result of the incident.",
      "State the total amount of medical expenses you have incurred as a result of the incident.",
      "Identify all insurance policies that may provide coverage for the incident.",
      "List all expert witnesses you intend to call at trial and summarize their expected testimony.",
      "Describe any statements you made regarding the incident, including when, where, and to whom such statements were made."
    ],
    request_for_production: [
      "All documents, including but not limited to correspondence, memoranda, reports, photographs, and electronic communications, relating to the incident.",
      "All medical records, bills, and reports relating to any injuries you claim to have sustained in the incident.",
      "All insurance policies and correspondence with insurance companies relating to the incident.",
      "All photographs, videos, or other visual evidence of the incident scene, vehicles involved, or injuries sustained.",
      "All expert witness reports and opinions relating to the incident.",
      "All documents reflecting any statements made by witnesses to the incident.",
      "All employment records showing lost wages or income as a result of the incident.",
      "All documents relating to any previous similar incidents or claims involving you.",
      "All documents relating to any modifications or repairs made to vehicles or property involved in the incident.",
      "All documents reflecting your financial condition at the time of the incident and currently."
    ],
    request_for_admission: [
      "Admit that you were operating the vehicle involved in the incident on [DATE].",
      "Admit that at the time of the incident, you were traveling at a speed in excess of the posted speed limit.",
      "Admit that you failed to maintain a proper lookout at the time of the incident.",
      "Admit that the incident was caused by your negligence.",
      "Admit that you were cited for a traffic violation in connection with the incident.",
      "Admit that you consumed alcoholic beverages within 24 hours prior to the incident.",
      "Admit that your vehicle sustained damage as a result of the incident.",
      "Admit that you were wearing a seatbelt at the time of the incident.",
      "Admit that the weather conditions at the time of the incident were clear and dry.",
      "Admit that you have been involved in similar incidents within the five years preceding this incident."
    ]
  }

  const addCustomRequest = () => {
    setCustomRequests([...customRequests, ''])
  }

  const updateCustomRequest = (index: number, value: string) => {
    const updated = [...customRequests]
    updated[index] = value
    setCustomRequests(updated)
  }

  const removeCustomRequest = (index: number) => {
    setCustomRequests(customRequests.filter((_, i) => i !== index))
  }

  const generateRequestsFromFacts = async () => {
    if (!caseFactsInput.trim()) return

    setIsGeneratingFromFacts(true)
    
    try {
      // This is a client-side AI-powered discovery generation based on facts
      const factsBasedDiscovery = generateDiscoveryFromFacts(caseFactsInput, selectedType)
      setFactsBasedRequests(factsBasedDiscovery)
    } catch (error) {
      console.error('Error generating discovery from facts:', error)
    } finally {
      setIsGeneratingFromFacts(false)
    }
  }

  const generateDiscoveryFromFacts = (facts: string, type: string): string[] => {
    const lowerFacts = facts.toLowerCase()
    const requests: string[] = []

    // Common fact patterns and corresponding discovery requests
    const discoveryPatterns = {
      interrogatory: {
        // Accident/Incident patterns
        'accident|collision|crash|incident': [
          "Describe in detail your recollection of the events leading up to, during, and immediately following the incident described in the complaint.",
          "Identify all persons present at the scene of the incident and describe what each person witnessed.",
          "State the speed at which you were traveling at the time of the incident.",
          "Describe the weather and road conditions at the time of the incident.",
          "Identify any traffic control devices present at the location of the incident."
        ],
        // Medical/Injury patterns
        'injury|medical|hospital|doctor|treatment': [
          "Identify all healthcare providers who have examined or treated you in connection with this incident.",
          "Describe all injuries you claim to have sustained as a result of the incident.",
          "List all medications you were taking at the time of the incident.",
          "Identify all medical records, reports, and bills related to your claimed injuries."
        ],
        // Employment patterns
        'employment|work|job|employer|fired|terminated': [
          "Describe your job duties and responsibilities at the time of the alleged incident.",
          "Identify all supervisors and managers who had authority over you during your employment.",
          "Describe any complaints you made to management prior to the incident.",
          "List all disciplinary actions taken against you during your employment."
        ],
        // Contract/Business patterns
        'contract|agreement|business|payment|breach': [
          "Identify all parties to the contract or agreement that is the subject of this lawsuit.",
          "Describe all communications regarding the terms and conditions of the agreement.",
          "List all payments made or received under the agreement.",
          "Identify all documents relating to the formation of the agreement."
        ],
        // Property/Real Estate patterns
        'property|real estate|lease|rent|landlord|tenant': [
          "Describe the condition of the property at the time you took possession.",
          "Identify all repairs or maintenance performed on the property.",
          "List all communications with the landlord/tenant regarding the property.",
          "Describe any defects or problems with the property."
        ]
      },
      request_for_production: {
        'accident|collision|crash|incident': [
          "All photographs, videos, or other visual documentation of the accident scene.",
          "All police reports, accident reports, or incident reports relating to the occurrence.",
          "All insurance policies providing coverage for the incident.",
          "All repair estimates and invoices for damage to vehicles or property."
        ],
        'injury|medical|hospital|doctor|treatment': [
          "All medical records, reports, and bills relating to your claimed injuries.",
          "All insurance claims and correspondence relating to medical treatment.",
          "All photographs of your alleged injuries.",
          "All expert medical reports or opinions regarding your condition."
        ],
        'employment|work|job|employer|fired|terminated': [
          "Your complete personnel file including all performance evaluations.",
          "All documents relating to the termination or adverse employment action.",
          "All employee handbooks, policies, and procedures in effect during your employment.",
          "All communications between you and management regarding workplace issues."
        ],
        'contract|agreement|business|payment|breach': [
          "The original contract or agreement that is the subject of this lawsuit.",
          "All amendments, modifications, or addenda to the agreement.",
          "All invoices, receipts, and payment records relating to the agreement.",
          "All correspondence regarding the performance or breach of the agreement."
        ],
        'property|real estate|lease|rent|landlord|tenant': [
          "The lease agreement or rental contract for the property.",
          "All photographs of the property showing its condition.",
          "All receipts for repairs, maintenance, or improvements to the property.",
          "All communications regarding rent payments or lease violations."
        ]
      },
      request_for_admission: {
        'accident|collision|crash|incident': [
          "Admit that you were operating a motor vehicle at the time of the incident.",
          "Admit that you failed to maintain a proper lookout at the time of the incident.",
          "Admit that the incident occurred as a result of your negligence.",
          "Admit that you were cited for a traffic violation in connection with the incident."
        ],
        'injury|medical|hospital|doctor|treatment': [
          "Admit that you sustained injuries as a result of the incident.",
          "Admit that you sought medical treatment following the incident.",
          "Admit that your medical expenses were reasonable and necessary.",
          "Admit that the incident was a substantial factor in causing your injuries."
        ],
        'employment|work|job|employer|fired|terminated': [
          "Admit that you were an employee of the defendant at the time of the incident.",
          "Admit that you were terminated from your employment.",
          "Admit that you received notice of the company's policies and procedures.",
          "Admit that you violated company policy as alleged in the complaint."
        ],
        'contract|agreement|business|payment|breach': [
          "Admit that you entered into the contract that is the subject of this lawsuit.",
          "Admit that you failed to perform your obligations under the contract.",
          "Admit that you received consideration for entering into the contract.",
          "Admit that the contract was breached as alleged in the complaint."
        ],
        'property|real estate|lease|rent|landlord|tenant': [
          "Admit that you entered into a lease agreement for the subject property.",
          "Admit that you failed to pay rent as required by the lease.",
          "Admit that you received notice of lease violations.",
          "Admit that the property was damaged during your tenancy."
        ]
      }
    }

    // Check for patterns and add relevant requests
    for (const [pattern, patternRequests] of Object.entries(discoveryPatterns[type as keyof typeof discoveryPatterns])) {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(facts)) {
        requests.push(...patternRequests)
      }
    }

    // Add some general requests based on common legal themes
    if (requests.length === 0) {
      // Fallback general requests if no specific patterns match
      if (type === 'interrogatory') {
        requests.push(
          "Describe in detail the facts and circumstances that form the basis of your claims in this lawsuit.",
          "Identify all witnesses who have knowledge of the facts alleged in your complaint.",
          "List all documents that support the allegations in your complaint."
        )
      } else if (type === 'request_for_production') {
        requests.push(
          "All documents relating to the claims alleged in the complaint.",
          "All communications regarding the subject matter of this lawsuit.",
          "All photographs, videos, or other evidence relating to the incident."
        )
      } else if (type === 'request_for_admission') {
        requests.push(
          "Admit that the facts alleged in the complaint are true and correct.",
          "Admit that you have personal knowledge of the events described in the complaint.",
          "Admit that the incident occurred as described in the complaint."
        )
      }
    }

    // Remove duplicates and limit to reasonable number
    return Array.from(new Set(requests)).slice(0, 15)
  }

  const generateDocument = () => {
    const typeTitle = {
      interrogatory: 'INTERROGATORIES',
      request_for_production: 'REQUEST FOR PRODUCTION OF DOCUMENTS',
      request_for_admission: 'REQUEST FOR ADMISSIONS'
    }

    const typeInstructions = {
      interrogatory: 'You are hereby required to answer the following interrogatories fully and completely under oath within thirty (30) days of service hereof.',
      request_for_production: 'You are hereby required to produce the following documents and things within thirty (30) days of service hereof.',
      request_for_admission: 'You are hereby required to respond to the following requests for admission within thirty (30) days of service hereof.'
    }

    const selectedRequests = predefinedRequests[selectedType]
    const allRequests = [
      ...selectedRequests, 
      ...factsBasedRequests,
      ...customRequests.filter(req => req.trim())
    ]

    const document = `
${typeTitle[selectedType]} TO DEFENDANT

TO: ${caseInfo.defendant}

${typeInstructions[selectedType]}

${allRequests.map((request, index) => `
${index + 1}. ${request}
`).join('')}

DATED: ${new Date().toLocaleDateString()}

${caseInfo.attorneyName}
State Bar No. ${caseInfo.barNumber}
${caseInfo.firmName}
${caseInfo.address}
Tel: ${caseInfo.phone}
Email: ${caseInfo.email}
Attorney for Plaintiff

---

CASE INFORMATION:
Case Title: ${caseInfo.caseTitle}
Case Number: ${caseInfo.caseNumber}
Court: ${caseInfo.court}
Plaintiff: ${caseInfo.plaintiff}
Defendant: ${caseInfo.defendant}
`

    setGeneratedDocument(document)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const downloadDocument = () => {
    const element = document.createElement('a')
    const file = new Blob([generatedDocument], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `${selectedType}_${caseInfo.caseNumber || 'document'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-xl">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Written Discovery Generator
              </h1>
              <p className="text-sm text-gray-600">Skeptical Attorney Legal Services</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            {/* Case Information */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Case Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Title</label>
                  <input
                    type="text"
                    value={caseInfo.caseTitle}
                    onChange={(e) => setCaseInfo({...caseInfo, caseTitle: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Smith v. Jones"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                  <input
                    type="text"
                    value={caseInfo.caseNumber}
                    onChange={(e) => setCaseInfo({...caseInfo, caseNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="CV-2024-001234"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                  <input
                    type="text"
                    value={caseInfo.court}
                    onChange={(e) => setCaseInfo({...caseInfo, court: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Superior Court of California, County of Los Angeles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaintiff</label>
                  <input
                    type="text"
                    value={caseInfo.plaintiff}
                    onChange={(e) => setCaseInfo({...caseInfo, plaintiff: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Defendant</label>
                  <input
                    type="text"
                    value={caseInfo.defendant}
                    onChange={(e) => setCaseInfo({...caseInfo, defendant: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Jane Jones"
                  />
                </div>
              </div>
            </div>

            {/* Attorney Information */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Attorney Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Name</label>
                  <input
                    type="text"
                    value={caseInfo.attorneyName}
                    onChange={(e) => setCaseInfo({...caseInfo, attorneyName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bar Number</label>
                  <input
                    type="text"
                    value={caseInfo.barNumber}
                    onChange={(e) => setCaseInfo({...caseInfo, barNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={caseInfo.address}
                    onChange={(e) => setCaseInfo({...caseInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={caseInfo.phone}
                    onChange={(e) => setCaseInfo({...caseInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={caseInfo.email}
                    onChange={(e) => setCaseInfo({...caseInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>
            </div>

            {/* Discovery Type Selection */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Discovery Type</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discoveryType"
                    value="interrogatory"
                    checked={selectedType === 'interrogatory'}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-900">Interrogatories</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discoveryType"
                    value="request_for_production"
                    checked={selectedType === 'request_for_production'}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-900">Request for Production</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discoveryType"
                    value="request_for_admission"
                    checked={selectedType === 'request_for_admission'}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-900">Request for Admissions</span>
                </label>
              </div>
            </div>

            {/* Case Facts Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Case Facts & AI Discovery Generation
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter the key facts of your case
                  </label>
                  <textarea
                    value={caseFactsInput}
                    onChange={(e) => setCaseFactsInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Example: On January 15, 2024, plaintiff was involved in a car accident at the intersection of Main St and Oak Ave. Defendant ran a red light and collided with plaintiff's vehicle. Plaintiff sustained injuries to neck and back, requiring medical treatment at City Hospital. Defendant was cited for running a red light..."
                    rows={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Describe the key facts, circumstances, and details of your case. The AI will analyze these facts and generate targeted discovery requests.
                  </p>
                </div>
                
                <button
                  onClick={generateRequestsFromFacts}
                  disabled={!caseFactsInput.trim() || isGeneratingFromFacts}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGeneratingFromFacts ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing Facts...
                    </>
                  ) : (
                    `Generate ${selectedType === 'interrogatory' ? 'Interrogatories' : 
                       selectedType === 'request_for_production' ? 'Document Requests' : 
                       'Admission Requests'} from Facts`
                  )}
                </button>

                {factsBasedRequests.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-800 mb-2">
                      Generated {factsBasedRequests.length} fact-based discovery requests:
                    </h3>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="text-sm text-green-700 space-y-1">
                        {factsBasedRequests.map((request, index) => (
                          <li key={index} className="flex items-start">
                            <span className="font-medium mr-2">{index + 1}.</span>
                            <span>{request}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => setFactsBasedRequests([])}
                      className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
                    >
                      Clear generated requests
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Requests */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Requests</h2>
              <div className="space-y-3">
                {customRequests.map((request, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      value={request}
                      onChange={(e) => updateCustomRequest(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Enter custom request..."
                      rows={2}
                    />
                    <button
                      onClick={() => removeCustomRequest(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCustomRequest}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Add Custom Request
                </button>
              </div>
            </div>

            <button
              onClick={generateDocument}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg hover:shadow-xl"
            >
              Generate Discovery Document
            </button>
          </div>

          {/* Generated Document */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Generated Document</h2>
                {generatedDocument && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadDocument}
                      className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                )}
              </div>
              
              {generatedDocument ? (
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {generatedDocument}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Fill out the form and click "Generate Discovery Document" to see your document here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WrittenDiscoveryGenerator
