'use client'

import { useState } from 'react'
import { FileText, Copy, Check, RotateCcw, Plus, FileIcon } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

interface ComplaintOutputProps {
  complaint: string
  onNewComplaint: () => void
}

export default function ComplaintOutput({ complaint, onNewComplaint }: ComplaintOutputProps) {
  const [copied, setCopied] = useState(false)
  const [showProofOfService, setShowProofOfService] = useState(false)

  // California Counties List
  const californiaCounties = [
    'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa',
    'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo',
    'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin',
    'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa',
    'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito',
    'San Bernardino', 'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo',
    'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra',
    'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity',
    'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
  ]


  const proofOfServiceText = `PROOF OF SERVICE

STATE OF CALIFORNIA, COUNTY OF [COUNTY NAME]

At the time of service, I was over 18 years of age and not a party to this action. I am employed in the County of [COUNTY NAME], State of California. My business address is [ADDRESS], California.

On October 28, 2020, I served true copies of the following document(s) described as
DEFENDANT VALERIE JASPER'S ANSWER TO PLAINTIFFS' COMPLAINT; DEMAND
FOR JURY TRIAL on the interested parties in this action as follows:

BY E-MAIL OR ELECTRONIC TRANSMISSION: I caused a copy of the
document(s) to be sent from e-mail address shanlyn@wfbm.com to the persons at the e-mail
addresses listed in the Service List. I did not receive, within a reasonable time after the
transmission, any electronic message or other indication that the transmission was unsuccessful.

I declare under penalty of perjury under the laws of the State of California that the
foregoing is true and correct.

Executed on October 21, 2023, at Buena Park, California.



                                                    ________________________________
                                                    Sean Arman`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(complaint)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  

  const handleDownloadWord = async () => {
    try {
      // Use the generated complaint content directly (cleaned)
      const cleanedComplaint = cleanComplaintText(complaint)
      const complaintLines = cleanedComplaint.split('\n')
      const allContent = complaintLines
      
      // Add proof of service if selected
      if (showProofOfService) {
        allContent.push('', ...proofOfServiceText.split('\n'))
      }
      
      const paragraphs = allContent.map((line, index) => {
        
        // Determine formatting based on content
        let alignment: "left" | "center" | "right" | undefined = "left"
        let bold = false
        let indentFirst = 0.5 // 0.5 inch first line indent for body text
        
        // Court headers - centered and bold
        if (line === 'SUPERIOR COURT OF CALIFORNIA' || 
            line.includes('COUNTY OF') ||
            line === 'COMPLAINT' || 
            line === 'PARTIES') {
          alignment = "center"
          bold = true
          indentFirst = 0
        }
        
        // Case caption items - "Plaintiff," and "Defendant." indented, "v." centered
        if (line === 'Plaintiff,' || line === 'Defendant.') {
          alignment = "left"
          indentFirst = 2 // 2 inch indent for party labels
        } else if (line === 'v.') {
          alignment = "center"
          indentFirst = 0
        }
        
        // Title 1 style for jurisdiction
        if (line === 'I. Jurisdiction') {
          bold = true
          indentFirst = 0.5
        }
        
        return new Paragraph({
          children: [
            new TextRun({
              text: line || ' ',
              font: 'Times New Roman',
              size: 24, // 12pt
              bold: bold
            })
          ],
          alignment: alignment,
          indent: {
            firstLine: indentFirst * 1440 // Convert inches to twips
          },
          spacing: {
            line: 480, // Double spacing in twips (480 twips = double spacing)
            lineRule: "auto"
          }
        })
      })

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1080, // 0.75 inch (3/4 inch)
                  right: 1440, // 1 inch
                  bottom: 1080, // 0.75 inch (3/4 inch)
                  left: 1440 // 1 inch
                }
              }
            },
            children: paragraphs
          }
        ]
      })

      const buffer = await Packer.toBuffer(doc)
      const fileName = showProofOfService 
        ? `Complaint-with-Proof-of-Service-${new Date().toISOString().slice(0, 10)}.docx`
        : `Complaint-${new Date().toISOString().slice(0, 10)}.docx`
      
      const blob = new Blob([new Uint8Array(buffer)], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      saveAs(blob, fileName)
    } catch (err) {
      console.error('Failed to generate Word document:', err)
      alert('Failed to generate Word document. Please try copying the text instead.')
    }
  }

  const handleAddProofOfService = () => {
    setShowProofOfService(!showProofOfService)
  }

  // Function to clean up markdown formatting from AI-generated text
  const cleanComplaintText = (text: string) => {
    return text
      .replace(/^```plaintext\s*/i, '') // Remove opening ```plaintext
      .replace(/^```\s*/m, '') // Remove opening ``` 
      .replace(/```\s*$/m, '') // Remove closing ```
      .replace(/^'''/m, '') // Remove opening '''
      .replace(/'''\s*$/m, '') // Remove closing '''
      .trim()
  }

  // Function to detect and highlight causes of action in the complaint
  const formatComplaintText = (text: string) => {
    const cleanedText = cleanComplaintText(text)
    const lines = cleanedText.split('\n')
    
    // Find case caption section (between court header and complaint title)
    let captionStartIndex = -1
    let captionEndIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Start of case caption (after court/county info)
      if (line.includes('COUNTY OF') && captionStartIndex === -1) {
        captionStartIndex = i + 1
      }
      // End of case caption (before "COMPLAINT" title)
      if ((line === 'COMPLAINT' || line.includes('Case No.') || line.includes('No.')) && captionStartIndex !== -1 && captionEndIndex === -1) {
        captionEndIndex = i
        break
      }
    }
    
    // Process case caption as table if found
    if (captionStartIndex !== -1 && captionEndIndex !== -1) {
      const beforeCaption = lines.slice(0, captionStartIndex)
      const captionLines = lines.slice(captionStartIndex, captionEndIndex)
      const afterCaption = lines.slice(captionEndIndex)
      
      // Separate left side (parties) and right side (case info)
      const leftSide = []
      const rightSide = []
      
      for (const line of captionLines) {
        const trimmed = line.trim()
        if (trimmed.includes('Case No.') || trimmed.includes('No.') || trimmed.match(/^\d+:/) || trimmed === 'COMPLAINT') {
          rightSide.push(trimmed)
        } else if (trimmed && !trimmed.includes('COUNTY OF') && !trimmed.includes('SUPERIOR COURT')) {
          leftSide.push(trimmed)
        }
      }
      
      // Render case caption as table
      const caseCaption = (
        <div key="case-caption" style={{ 
          display: 'flex', 
          fontSize: '12pt', 
          fontFamily: 'Times New Roman, serif', 
          lineHeight: '24pt',
          margin: '24pt 0',
          borderBottom: '1px solid black',
          paddingBottom: '12pt'
        }}>
          {/* Left side - Parties */}
          <div style={{ flex: 1, paddingRight: '20px' }}>
            {leftSide.map((line, idx) => (
              <div key={idx} style={{
                textIndent: (line === 'Plaintiff,' || line === 'Defendant.') ? '2in' : '0.5in'
              }}>
                {line}
              </div>
            ))}
          </div>
          
          {/* Vertical divider */}
          <div style={{ width: '1px', backgroundColor: 'black', margin: '0 10px' }}></div>
          
          {/* Right side - Case information */}
          <div style={{ width: '200px', paddingLeft: '10px' }}>
            {/* Case number first */}
            {rightSide.filter(line => line.includes('Case No.') || line.includes('No.') || line.match(/^\d+:/)).map((line, idx) => (
              <div key={`case-${idx}`} style={{ marginBottom: '12pt' }}>
                {line}
              </div>
            ))}
            {/* COMPLAINT title */}
            <div style={{ fontWeight: 'bold', marginTop: '12pt' }}>
              COMPLAINT
            </div>
          </div>
        </div>
      )
      
      return [
        ...beforeCaption.map((line, index) => formatSingleLine(line, index)),
        caseCaption,
        ...afterCaption.map((line, index) => formatSingleLine(line, index + captionEndIndex))
      ]
    }
    
    // Fallback to original formatting
    return lines.map((line, index) => formatSingleLine(line, index))
  }
  
  // Helper function to format individual lines
  const formatSingleLine = (line: string, index: number) => {
      const trimmedLine = line.trim()
      
      // Check if this line is a cause of action heading
      const isCauseHeading = (
        trimmedLine.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+CAUSE\s+OF\s+ACTION/i) ||
        trimmedLine.match(/^\((Negligence|Premises Liability|Motor Vehicle|Products Liability|Intentional Tort|Breach of Contract|Fraud|Misrepresentation|Negligence Per Se|Medical Malpractice|Gross Negligence|Battery|Intentional Infliction|Negligent Misrepresentation|Unfair Business Practices|Punitive Damages)\)$/i)
      )
      
      // Check if this line contains CACI reference
      const hasCACIReference = trimmedLine.match(/CACI\s+\d+/i)
      
      // Check if this line is part of attorney information (first 10 lines typically contain attorney info)
      const isAttorneyInfo = index < 10 && (
        trimmedLine.match(/\(California State Bar No\./i) ||
        trimmedLine.match(/@.*\.(com|org|net|edu)/i) ||
        trimmedLine.match(/^[A-Z][a-zA-Z\s]+$/i) ||
        trimmedLine.match(/^\d+.*[Aa]ve|[Ss]t|[Bb]lvd|[Rr]d|[Dd]r|[Ll]ane|[Cc]ourt/i) ||
        trimmedLine.match(/^Telephone:/i) ||
        trimmedLine.match(/^Attorney for/i)
      )

      // Check if this line is a law firm name (typically contains common law firm suffixes)
      const isLawFirmName = index < 10 && (
        trimmedLine.match(/\b(LLC|LLP|P\.?C\.?|Inc\.?|Corporation|Associates?|Group|Partners?|Law Offices?|Legal|Attorneys?)\b/i) ||
        trimmedLine.match(/\b(Law Firm|Legal Group|& Associates|and Associates)\b/i)
      )

      // Check if this line is "Plaintiff," or "Defendant." for special indentation
      const isPartyLabel = trimmedLine === 'Plaintiff,' || trimmedLine === 'Defendant.'
      
      return (
        <div 
          key={index + 21} 
          style={{ 
            fontSize: '12pt',
            fontFamily: 'Times New Roman, serif',
            lineHeight: isAttorneyInfo ? '14pt' : '24pt', // Single spacing for attorney info
            textIndent: isPartyLabel ? '2in' : (line.trim().length > 0 ? '0.5in' : '0'),
            fontWeight: (isCauseHeading || isLawFirmName) ? 'bold' : 'normal',
            textAlign: isCauseHeading ? 'center' : 'left',
            backgroundColor: isCauseHeading ? '#f0f9ff' : 'transparent',
            padding: isCauseHeading ? '4px' : '0',
            marginBottom: isCauseHeading ? '8px' : '0',
            borderLeft: isCauseHeading ? '4px solid #0ea5e9' : 'none',
            counterReset: 'none',
            listStyle: 'none',
            counterIncrement: 'none'
          }}
        >
          {hasCACIReference ? (
            <span>
              {line.split(/(CACI\s+\d+)/i).map((part, i) => 
                part.match(/CACI\s+\d+/i) ? (
                  <span key={i} style={{ backgroundColor: '#fef3c7', padding: '2px 4px', borderRadius: '3px', fontSize: '11pt' }}>
                    {part}
                  </span>
                ) : part
              )}
            </span>
          ) : (
            isLawFirmName ? (line || '\u00A0').toUpperCase() : (line || '\u00A0')
          )}
        </div>
      )
  }



  return (
    <div className="glass-card rounded-2xl shadow-2xl border border-white/20">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-white drop-shadow-lg" />
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">Generated Complaint</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAddProofOfService}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                showProofOfService 
                  ? 'glass-button text-white border border-white/40' 
                  : 'glass text-white hover:bg-white/20 border border-white/20'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">{showProofOfService ? 'Remove' : 'Add'} Proof of Service</span>
            </button>
            <button
              onClick={handleDownloadWord}
              className="flex items-center space-x-2 px-4 py-2 glass-button text-white rounded-xl transition-all duration-300"
            >
              <FileIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Download Word</span>
            </button>
            <button
              onClick={onNewComplaint}
              className="flex items-center space-x-2 px-4 py-2 glass-button text-white rounded-xl transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">New Complaint</span>
            </button>
          </div>
        </div>

        {/* Success Message */}
        <div className="glass border border-green-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-300" />
            <span className="text-green-100 font-medium">
              Complaint generated successfully with CACI-formatted causes of action!
            </span>
          </div>
          <p className="text-green-100 text-sm mt-1 opacity-90">
            This complaint follows California Civil Jury Instructions (CACI) formatting standards. 
            Review the content below and make any necessary adjustments before filing.
          </p>
        </div>

        {/* CACI Information Panel */}
        <div className="glass border border-blue-400/30 rounded-xl p-4 mb-6">
          <h4 className="font-medium text-white mb-2">📖 CACI Formatting Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-100 mb-1">Cause of Action Structure:</h5>
              <ul className="text-blue-50 space-y-1 opacity-90">
                <li>• <span style={{backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderLeft: '3px solid #60a5fa', borderRadius: '2px'}}>Highlighted headings</span> for each cause</li>
                <li>• Elements based on specific CACI instructions</li>
                <li>• Proper incorporation by reference</li>
                <li>• Sequential numbering throughout</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-blue-100 mb-1">CACI References:</h5>
              <ul className="text-blue-50 space-y-1 opacity-90">
                <li>• <span style={{backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '3px'}}>CACI numbers</span> highlighted in yellow</li>
                <li>• Series-based organization (400, 700, 1000, etc.)</li>
                <li>• Element-specific allegations</li>
                <li>• California law compliance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Complaint Content */}
        <div className="border border-white/20 rounded-xl glass">
          <div className="glass-dark px-4 py-2 border-b border-white/20 rounded-t-xl">
            <h3 className="font-medium text-white">California Superior Court Document</h3>
            <p className="text-gray-200 text-sm opacity-90">Generated: {new Date().toLocaleString()}</p>
          </div>
          <div className="bg-white" style={{ padding: '0.75in 1in', fontFamily: 'Times New Roman, serif', fontSize: '12pt', lineHeight: '1.2' }}>
            {/* Court Document Container with proper margins */}
            <div className="relative" style={{ minHeight: '9.5in', width: '6.5in', margin: '0 auto', backgroundColor: 'white', border: '1px solid #ccc' }}>
              
              {/* Main content area */}
              <div style={{ padding: '0.5in' }}>
                {/* Generated complaint content with proper formatting */}
                <div className="complaint-content" style={{ counterReset: 'none', listStyle: 'none' }}>
                  {formatComplaintText(showProofOfService ? `${complaint}\n\n${proofOfServiceText}` : complaint)}
                </div>
              </div>
              
              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 text-center border-t border-gray-400" style={{ padding: '10px', fontSize: '10pt' }}>
                <div>-1-</div>
                <div style={{ fontSize: '8pt', color: '#666' }}>DEFENDANT'S ANSWER TO COMPLAINT</div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 glass border border-amber-400/30 rounded-xl p-4">
          <h4 className="font-medium text-amber-100 mb-2">⚠️ Legal Disclaimer</h4>
          <p className="text-amber-50 text-sm opacity-90">
            This document is AI-generated and should be reviewed by a qualified attorney before filing. 
            The content may require modifications to meet specific jurisdictional requirements and 
            case-specific details. Always consult with legal counsel for proper legal advice.
          </p>
        </div>
      </div>
    </div>
  )
}
