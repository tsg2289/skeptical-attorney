import { Deadline } from './caseStorage'

export interface DeadlineTemplate {
  daysBeforeTrial: number
  description: string
  juryTrialOnly?: boolean  // Only applies if jury trial
  serviceMethod?: 'mail' | 'eservice' | 'personal' | 'all'  // Service method specific
  courtSpecific?: string[]  // Only for specific courts
  ccpSection?: string  // CCP section reference
  isCourtDays?: boolean  // If true, use court days instead of calendar days
}

// Helper function to calculate court days (excluding weekends)
function addCourtDays(date: Date, courtDays: number): Date {
  const result = new Date(date)
  let daysAdded = 0
  
  while (daysAdded < courtDays) {
    result.setDate(result.getDate() - 1)
    const dayOfWeek = result.getDay()
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }
  
  return result
}

// Helper function to add calendar days
function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

/**
 * Calculate deadlines based on trial date
 */
export function calculateDeadlinesFromTrialDate(
  trialDate: string,
  options: {
    juryTrial?: boolean
    courtCounty?: string
    mscDate?: string
  } = {}
): Omit<Deadline, 'id'>[] {
  if (!trialDate) return []
  
  const trial = new Date(trialDate)
  if (isNaN(trial.getTime())) return []
  
  const { juryTrial = false, courtCounty, mscDate } = options
  const deadlines: Omit<Deadline, 'id'>[] = []
  
  // Standard deadlines (calendar days before trial unless otherwise stated)
  const standardDeadlines: DeadlineTemplate[] = [
    // 150 days
    {
      daysBeforeTrial: 150,
      description: 'Be sure experts have been retained and have necessary documents for review'
    },
    {
      daysBeforeTrial: 150,
      description: 'Arrange for defense medical exam to be conducted (if appropriate)'
    },
    {
      daysBeforeTrial: 150,
      description: 'Contact court to schedule MSJ hearing date (other deadlines may change if MSJ hearing is scheduled for earlier than 30 days prior to trial)',
      ccpSection: '437c(a)'
    },
    
    // 135 days
    {
      daysBeforeTrial: 135,
      description: 'Meet and confer with opposing counsel regarding voluntary submission to psychiatric exam (if appropriate)',
      ccpSection: '2032.310, 2016.060'
    },
    
    // 120 days
    {
      daysBeforeTrial: 120,
      description: 'Demand and schedule defense medical exam (if appropriate) - date for exam must be at least 30 calendar days after date of demand; response to demand must be received 20 days after service of demand',
      ccpSection: '2032.220, 2032.230, 2016.060'
    },
    {
      daysBeforeTrial: 120,
      description: 'File and mail serve motion for defense psychiatric exam if necessary',
      ccpSection: '2032.310, 2016.060',
      serviceMethod: 'mail'
    },
    
    // 90 days
    {
      daysBeforeTrial: 90,
      description: 'Determine whether corporate standing is an issue or defense and obtain certified copies of documents from appropriate governmental entity confirming that corporate party is in good standing or in the alternative that opposing corporation is not'
    },
    {
      daysBeforeTrial: 90,
      description: 'Determine whether licensure of a contractor is an issue or defense and obtain certified license history from Contractor\'s State License Board'
    },
    
    // 80 days (MSJ related)
    {
      daysBeforeTrial: 80,
      description: 'Serve MSJ by mail (MSJ must be filed no later than 16 COURT days prior to the MSJ hearing date)',
      ccpSection: '437c(a), 1005(b)',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 77, // 75 days + 2 court days
      description: 'Serve MSJ by e-service (MSJ must be filed no later than 16 COURT days prior to the MSJ hearing date)',
      ccpSection: '437c(a), 1005(b)',
      serviceMethod: 'eservice'
    },
    {
      daysBeforeTrial: 75,
      description: 'Serve MSJ by personal service (MSJ must be filed no later than 16 COURT days prior to the MSJ hearing date)',
      ccpSection: '437c(a), 1005(b)',
      serviceMethod: 'personal'
    },
    
    // 75 days
    {
      daysBeforeTrial: 75,
      description: 'Mail serve Demand for Exchange of Expert Witnesses (10 days after trial date is set or 70 days before trial, whichever is later)',
      ccpSection: '2034.220, 1013',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 72, // 70 days + 2 court days
      description: 'E-serve Demand for Exchange of Expert Witnesses (10 days after trial date is set or 70 days before trial, whichever is later)',
      ccpSection: '2034.220, 1013',
      serviceMethod: 'eservice'
    },
    
    // 70 days
    {
      daysBeforeTrial: 70,
      description: 'Demand for Exchange of Expert Witnesses due (10 days after trial date is set or 70 days before trial, whichever is later)',
      ccpSection: '2034.220'
    },
    
    // 65 days
    {
      daysBeforeTrial: 65,
      description: 'Serve RFAs by mail (notice of motion that matters be deemed admitted must be given immediately on due date)',
      ccpSection: '2024.020, 2033.280',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 62, // 60 days + 2 court days
      description: 'Serve RFAs by e-service (notice of motion that matters be deemed admitted must be given immediately on due date)',
      ccpSection: '2024.020, 2033.280',
      serviceMethod: 'eservice'
    },
    {
      daysBeforeTrial: 65,
      description: 'Serve by mail supplemental rogs to update prior responses',
      ccpSection: '2024.020, 2030.070',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 62, // 60 days + 2 court days
      description: 'Serve by e-service supplemental rogs to update prior responses',
      ccpSection: '2024.020, 2030.070',
      serviceMethod: 'eservice'
    },
    {
      daysBeforeTrial: 65,
      description: 'Serve by mail supplemental RFPs to update prior responses',
      ccpSection: '2024.020, 2031.050',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 62, // 60 days + 2 court days
      description: 'Serve by e-service supplemental RFPs to update prior responses',
      ccpSection: '2024.020, 2031.050',
      serviceMethod: 'eservice'
    },
    {
      daysBeforeTrial: 65,
      description: 'Serve by mail notices of depositions and copies of deposition subpoenas re: non-party witnesses (NOTE: no e-service equivalent as e-service not applicable to serve a third party)',
      ccpSection: '2020.410(d), 2025.220, 1987.3, 2016.060',
      serviceMethod: 'mail'
    },
    
    // 60 days
    {
      daysBeforeTrial: 60,
      description: 'Last day to serve Statement of Damages',
      ccpSection: '425.11'
    },
    {
      daysBeforeTrial: 60,
      description: 'Review client\'s discovery responses and supplement if necessary'
    },
    {
      daysBeforeTrial: 60,
      description: 'Serve by personal service deposition subpoenas to non-party fact witnesses (NOTE: No mail or e-service equivalent as neither method is applicable to serve a third party)',
      ccpSection: '1985.3, 1987, 2025.270, 2016.060',
      serviceMethod: 'personal'
    },
    {
      daysBeforeTrial: 60,
      description: 'Serve by mail notice depositions of party fact witnesses',
      ccpSection: '1013, 2025.270, 2016.060',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 57, // 55 days + 2 court days
      description: 'Serve by e-service notice depositions of party fact witnesses',
      ccpSection: '1013, 2025.270, 2016.060',
      serviceMethod: 'eservice'
    },
    
    // 55 days
    {
      daysBeforeTrial: 55,
      description: 'Serve by personal service notice depositions of party fact witnesses',
      ccpSection: '2025.270, 2016.060',
      serviceMethod: 'personal'
    },
    
    // 50 days
    {
      daysBeforeTrial: 50,
      description: 'Serve expert designation if demand is proper and demand set the date for exchange at 50 days before trial (service of the expert designation can be made by mail or e-service on this date)',
      ccpSection: '2034.230, 2016.060'
    },
    
    // 45 days
    {
      daysBeforeTrial: 45,
      description: 'Deposition of all party and non-party witnesses should be commenced',
      ccpSection: '1013, 2020.010, 2025.270, 2016.060'
    },
    
    // 30 days
    {
      daysBeforeTrial: 30,
      description: 'Fact discovery must be completed',
      ccpSection: '2024.020(a), 2016.060'
    },
    {
      daysBeforeTrial: 30,
      description: 'Last day for hearing MSJ',
      ccpSection: '437c(a)'
    },
    {
      daysBeforeTrial: 30,
      description: 'Last day for hearing motion to sever or bifurcate',
      ccpSection: '598'
    },
    {
      daysBeforeTrial: 30,
      description: 'Serve supplemental expert witness list [20 days after initial exchange]',
      ccpSection: '2034.280(a), 2016.060'
    },
    {
      daysBeforeTrial: 30,
      description: 'Limited Jurisdiction only - last day to serve request for statement of witnesses/description and copies of evidence'
    },
    {
      daysBeforeTrial: 30,
      description: 'Serve subpoenas on non-party witnesses with documents',
      ccpSection: '1985.3'
    },
    {
      daysBeforeTrial: 30,
      description: 'Notice opposing counsel\'s expert depositions',
      ccpSection: '2024.030, 2034.410, 2016.060'
    },
    {
      daysBeforeTrial: 30,
      description: 'Check with experts regarding availability for deposition - Determine whether to offer experts for deposition or stipulation as to deposition (i.e. 48 hour stipulation)'
    },
    {
      daysBeforeTrial: 30,
      description: 'Trial Hearing Preparation - Prepare opening and closing arguments, Prepare voir dire questions',
      juryTrialOnly: true
    },
    {
      daysBeforeTrial: 30,
      description: 'Prepare trial brief'
    },
    {
      daysBeforeTrial: 30,
      description: 'Meet with witnesses to prepare them for trial'
    },
    
    // 25 days
    {
      daysBeforeTrial: 25,
      description: 'Serve by mail notice to parties to appear and produce documents',
      ccpSection: '1013, 1987',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 22, // 20 days + 2 court days
      description: 'Serve by e-service notice to parties to appear and produce documents',
      ccpSection: '1013, 1987',
      serviceMethod: 'eservice'
    },
    
    // 20 days
    {
      daysBeforeTrial: 20,
      description: 'Serve notice of trial date',
      ccpSection: '594'
    },
    {
      daysBeforeTrial: 20,
      description: 'Serve subpoenas on non-party witnesses without documents',
      ccpSection: '1985'
    },
    
    // 15 days
    {
      daysBeforeTrial: 15,
      description: 'Fact discovery motions shall be heard on or before today',
      ccpSection: '2024.020(a), 2016.060'
    },
    {
      daysBeforeTrial: 15,
      description: 'Last day to conduct expert discovery',
      ccpSection: '2024.030, 2016.060'
    },
    {
      daysBeforeTrial: 15,
      description: 'Serve by mail notice to party to attend trial',
      ccpSection: '1987(b)',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 12, // 10 days + 2 court days
      description: 'Serve by e-service notice to party to attend trial',
      ccpSection: '1987(b)',
      serviceMethod: 'eservice'
    },
    {
      daysBeforeTrial: 15,
      description: 'Last day to mail serve 998 demand',
      ccpSection: '998',
      serviceMethod: 'mail'
    },
    {
      daysBeforeTrial: 12, // 10 days + 2 court days
      description: 'Last day to e-serve 998 demand',
      ccpSection: '998',
      serviceMethod: 'eservice'
    },
    {
      daysBeforeTrial: 10,
      description: 'Last day to personally serve 998 demand',
      ccpSection: '998',
      serviceMethod: 'personal'
    },
    
    // 10 days
    {
      daysBeforeTrial: 10,
      description: 'Expert witness motions shall be heard on or before today',
      ccpSection: '2024.030, 2016.060'
    },
    
    // 5 days
    {
      daysBeforeTrial: 5,
      description: 'Last court day to submit written stipulation by all parties and proposed order to continue trial without showing of good cause',
      ccpSection: 'Pretrial Procedures, K.2.d',
      isCourtDays: true
    },
    
    // 1 day
    {
      daysBeforeTrial: 1,
      description: 'Reminder re jury trial: Before first witness sworn, counsel to deliver to judge and opposing counsel all proposed jury instructions re the law as disclosed by the pleadings',
      ccpSection: '607a',
      juryTrialOnly: true
    },
  ]
  
  // Process standard deadlines
  standardDeadlines.forEach(template => {
    // Skip if jury trial only and not a jury trial (but we'll include all for now, user can delete)
    // if (template.juryTrialOnly && !juryTrial) {
    //   return
    // }
    
    // Skip if court-specific and doesn't match
    if (template.courtSpecific && courtCounty) {
      const matches = template.courtSpecific.some(court => 
        courtCounty.toLowerCase().includes(court.toLowerCase())
      )
      if (!matches) return
    }
    
    let deadlineDate: Date
    
    // Handle court days vs calendar days
    if (template.isCourtDays) {
      deadlineDate = addCourtDays(trial, template.daysBeforeTrial)
    } else {
      deadlineDate = addCalendarDays(trial, template.daysBeforeTrial)
    }
    
    // Only add deadlines that are in the future or today
    if (deadlineDate >= new Date(new Date().setHours(0, 0, 0, 0))) {
      let description = template.description
      if (template.ccpSection) {
        description += ` (CCP ${template.ccpSection})`
      }
      if (template.juryTrialOnly) {
        description += ' [N/A if client does not favor a jury trial]'
      }
      
      deadlines.push({
        date: deadlineDate.toISOString().split('T')[0],
        description,
        completed: false
      })
    }
  })
  
  // Add court-specific deadlines
  if (courtCounty) {
    const courtLower = courtCounty.toLowerCase()
    
    // Riverside County
    if (courtLower.includes('riverside')) {
      deadlines.push({
        date: addCalendarDays(trial, 14).toISOString().split('T')[0],
        description: 'Riverside County: Last court day to exchange witness lists, exhibit lists, copies of exhibits not previously exchanged, lists of facts or issues of law party believes are not controverted and to which party willing to agree, description of claims/damages or affirmative defenses for which party intends to offer evidence at trial, and motions in limine (Local Rule 3401)',
        completed: false
      })
      deadlines.push({
        date: addCalendarDays(trial, 14).toISOString().split('T')[0],
        description: 'Riverside County: Last court day to exchange proposed statement of the case, list of form jury instructions, text of special jury instructions and proposed verdict form (Local Rule 3401)',
        completed: false
      })
      deadlines.push({
        date: addCalendarDays(trial, 7).toISOString().split('T')[0],
        description: 'Riverside County: Last court day for lead trial counsel to conduct issues conference (Local Rule 3401)',
        completed: false
      })
      deadlines.push({
        date: addCalendarDays(trial, 1).toISOString().split('T')[0],
        description: 'Riverside County: Re jury trials: When special verdicts are to be submitted to jury, jury questions and verdict forms to be presented in writing to court with copies to other parties before any evidence is offered (Local Rule 3402) [N/A if client does not favor a jury trial]',
        completed: false
      })
    }
    
    // Orange County
    if (courtLower.includes('orange')) {
      deadlines.push({
        date: addCalendarDays(trial, 14).toISOString().split('T')[0],
        description: 'Orange County: Last day to attend Issue Conference with all parties (plaintiff must schedule) and exchange motions in limine, exhibits, and photos/diagrams to be used at trial (Local Rule 317)',
        completed: false
      })
      // Calculate Wednesday before trial
      const wednesdayBefore = new Date(trial)
      while (wednesdayBefore.getDay() !== 3) { // 3 = Wednesday
        wednesdayBefore.setDate(wednesdayBefore.getDate() - 1)
      }
      deadlines.push({
        date: wednesdayBefore.toISOString().split('T')[0],
        description: 'Orange County: Electronically File by NOON: All documents discussed, prepared, and/or exchanged during the Issue Conference (Local Rule 317)',
        completed: false
      })
      deadlines.push({
        date: wednesdayBefore.toISOString().split('T')[0],
        description: 'Orange County: Deliver by NOON to the clerk in the trial department: Joint Trial Notebook with all required documents (Local Rule 317)',
        completed: false
      })
    }
    
    // LA County
    if (courtLower.includes('los angeles') || courtLower.includes('la county')) {
      deadlines.push({
        date: addCalendarDays(trial, 5).toISOString().split('T')[0],
        description: 'LA County: File and serve exhibit list, witness list, jury instructions, statement of the case (Local Rule 3.25)',
        completed: false
      })
    }
    
    // San Bernardino County
    if (courtLower.includes('san bernardino')) {
      deadlines.push({
        date: addCalendarDays(trial, 8).toISOString().split('T')[0],
        description: 'San Bernardino County: File and serve motions in limine (Local Rule 411.2)',
        completed: false
      })
    }
    
    // San Diego County
    if (courtLower.includes('san diego')) {
      deadlines.push({
        date: addCalendarDays(trial, 5).toISOString().split('T')[0],
        description: 'San Diego County: File and serve motions in limine (Local Rule 2.1.18)',
        completed: false
      })
      deadlines.push({
        date: addCalendarDays(trial, 2).toISOString().split('T')[0],
        description: 'San Diego County: File and serve oppositions to motions in limine (Local Rule 2.1.18)',
        completed: false
      })
    }
    
    // Santa Barbara County
    if (courtLower.includes('santa barbara')) {
      deadlines.push({
        date: addCourtDays(trial, 16).toISOString().split('T')[0],
        description: 'Santa Barbara County: File and serve motions in limine (16 COURT days plus 5 calendar days before trial) (Local Rule 1302)',
        completed: false
      })
      deadlines.push({
        date: addCourtDays(trial, 9).toISOString().split('T')[0],
        description: 'Santa Barbara County: File and serve oppositions to motions in limine (9 COURT days before trial) (Local Rule 1302)',
        completed: false
      })
      deadlines.push({
        date: addCourtDays(trial, 3).toISOString().split('T')[0],
        description: 'Santa Barbara County: File trial brief (3 COURT days before trial) (Local Rule 1306)',
        completed: false
      })
    }
    
    // Ventura County
    if (courtLower.includes('ventura')) {
      deadlines.push({
        date: trial.toISOString().split('T')[0],
        description: 'Ventura County: Submit trial brief, joint statement of the case, joint witness list, joint exhibit list, motions in limine, oppositions to motions in limine (Local Rule 8.12)',
        completed: false
      })
    }
  }
  
  // Add MSC-related deadlines if MSC date is provided
  if (mscDate) {
    const msc = new Date(mscDate)
    if (!isNaN(msc.getTime())) {
      deadlines.push({
        date: addCalendarDays(msc, 30).toISOString().split('T')[0],
        description: '30 days before MSC: Determine whether in person carrier/client attendance is required, and whether carrier needs to be excused from attendance',
        completed: false
      })
      
      deadlines.push({
        date: addCalendarDays(msc, 14).toISOString().split('T')[0],
        description: '14 days before MSC: File written request or ex parte with MSC judge to excuse in person carrier/client attendance if necessary',
        completed: false
      })
      
      if (courtCounty?.toLowerCase().includes('orange')) {
        deadlines.push({
          date: addCourtDays(msc, 5).toISOString().split('T')[0],
          description: 'Orange County: 5 court days before the MSC - Last day to lodge with the court confidential Settlement Conference Statement and an objection to the assigned judge conducting the mandatory settlement conference (if desired) (Local Rule 316)',
          completed: false
        })
        deadlines.push({
          date: addCalendarDays(msc, 5).toISOString().split('T')[0],
          description: 'Orange County: 5 days before the MSC - Last day for plaintiff(s) and/or cross-complainant(s) to serve a settlement demand on each defendant in advance of the MSC (Local Rule 316)',
          completed: false
        })
      }
      
      deadlines.push({
        date: msc.toISOString().split('T')[0],
        description: 'MSC Date: Bring required documents and ensure client/carrier attendance as required',
        completed: false
      })
    }
  }
  
  // Add initial trial date set action items
  deadlines.push({
    date: trial.toISOString().split('T')[0],
    description: 'Initial Trial Date Set: Case Organization Actions - Have clerks make sure file is together and organized',
    completed: false
  })
  
  deadlines.push({
    date: trial.toISOString().split('T')[0],
    description: 'Initial Trial Date Set: Case Strategy Triggered Actions - Review CMO (if appropriate), Obtain and review trial department rules, Review court rules',
    completed: false
  })
  
  // Sort by date
  return deadlines.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

/**
 * Generate deadline ID
 */
export function generateDeadlineId(): string {
  return `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
























