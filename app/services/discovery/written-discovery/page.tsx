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
    const allRequests = [...selectedRequests, ...customRequests.filter(req => req.trim())]

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Smith v. Jones"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                  <input
                    type="text"
                    value={caseInfo.caseNumber}
                    onChange={(e) => setCaseInfo({...caseInfo, caseNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CV-2024-001234"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                  <input
                    type="text"
                    value={caseInfo.court}
                    onChange={(e) => setCaseInfo({...caseInfo, court: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Superior Court of California, County of Los Angeles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaintiff</label>
                  <input
                    type="text"
                    value={caseInfo.plaintiff}
                    onChange={(e) => setCaseInfo({...caseInfo, plaintiff: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Defendant</label>
                  <input
                    type="text"
                    value={caseInfo.defendant}
                    onChange={(e) => setCaseInfo({...caseInfo, defendant: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bar Number</label>
                  <input
                    type="text"
                    value={caseInfo.barNumber}
                    onChange={(e) => setCaseInfo({...caseInfo, barNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={caseInfo.address}
                    onChange={(e) => setCaseInfo({...caseInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={caseInfo.phone}
                    onChange={(e) => setCaseInfo({...caseInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={caseInfo.email}
                    onChange={(e) => setCaseInfo({...caseInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Custom Requests */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Requests</h2>
              <div className="space-y-3">
                {customRequests.map((request, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      value={request}
                      onChange={(e) => updateCustomRequest(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
