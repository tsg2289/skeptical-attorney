export interface DepositionQuestion {
  id: string;
  text: string;
  isAsked: boolean;
  isCustom?: boolean;
  isFlagged?: boolean;
  indentLevel?: number; // 0 = main question, 1+ = subquestions
}

export interface DepositionSubsection {
  id: string;
  title: string;
  questions: DepositionQuestion[];
  customQuestions: DepositionQuestion[];
  isSelected: boolean;
  notes: string;
}

export interface DepositionSection {
  id: string;
  title: string;
  description?: string;
  questions?: DepositionQuestion[];
  customQuestions?: DepositionQuestion[];
  subsections?: DepositionSubsection[];
  isSelected: boolean;
  notes: string;
}

export const depositionOutlineData: DepositionSection[] = [
  {
    id: "introduction",
    title: "I. INTRODUCTION",
    isSelected: true,
    notes: "",
    questions: [
      { id: "intro_1", text: "My Name is Thomas St. Germain. I am an attorney and I represent Defendants in this matter.", isAsked: false, isFlagged: false },
      { id: "intro_2", text: "Please State and Spell Your Name for the Record.", isAsked: false },
      { id: "intro_3", text: "Have you ever gone by or used another name? State and spell those other names?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "previous_depositions",
        title: "A. Previous Depositions",
        isSelected: true,
        notes: "",
        questions: [
          { id: "prev_dep_1", text: "Have you ever had your deposition taken before?", isAsked: false },
          { id: "prev_dep_2", text: "When, Where, Nature of Case", isAsked: false },
          { id: "prev_dep_3", text: "Have you ever testified in court before?", isAsked: false },
          { id: "prev_dep_4", text: "When, Where, Nature of Case", isAsked: false },
          { id: "prev_dep_5", text: "Ever filed a lawsuit with the court?", isAsked: false },
          { id: "prev_dep_6", text: "When, Where, Nature of Case", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "ground_rules",
    title: "II. GROUND RULES FOR DEPOSITION",
    isSelected: true,
    notes: "",
    questions: [
      { id: "rules_1", text: "<strong><u>Deposition</u></strong>: A procedure for the taking of your testimony under oath in connection with a pending legal action. The purpose is to get information regarding your lawsuit.", isAsked: false },
      { id: "rules_2", text: "<strong><u>Remote Rules</u></strong> - Since this deposition is conducted remote, you understand if at any time you get disconnected please log back onto the system or advise your attorney.", isAsked: false },
      { id: "rules_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you have any documents in front or you? Do you have any documents or photographs open on your computer system?", isAsked: false },
      { id: "rules_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Are you looking at any other computer, ipad, cell phone or any other smart device other than the system you are using for zoom?", isAsked: false },
      { id: "rules_5", text: "<strong><u>Perjury</u></strong>: The court reporter administered an oath to you that says you have to answer all of my questions honestly and fully.", isAsked: false },
      { id: "rules_6", text: "<strong><u>Verbal Responses</u></strong>: Court Reporter taking down what we say and prepares transcript. No no-verbal responses (no 'nods of head' or 'uh huh')", isAsked: false },
      { id: "rules_7", text: "<strong><u>Break</u></strong>: If you need a break (for any reason - tired, want to talk to your attorney, use the restroom or drink water) at any time for any reason, please let me know.", isAsked: false },
      { id: "rules_8", text: "<strong><u>Estimate/Guess</u></strong>: I am here to get your testimony but I don't want you to guess about anything. Do you know the difference between a guess and an estimate?", isAsked: false },
      { id: "rules_9", text: "<strong><u>Understand Question</u></strong>: If you do not understand my question, please ask me to rephrase it.", isAsked: false },
      { id: "rules_10", text: "<strong><u>Wait Until Question Is Completed</u></strong>: Although you may think you know what the question will be, please wait until the entire question is asked.", isAsked: false },
      { id: "rules_11", text: "Is there any reason that you would be unable to give us your best testimony today?", isAsked: false },
      { id: "rules_12", text: "Have you taken any medication within the past 24 hours that would affect your ability to provide your best testimony here today?", isAsked: false },
      { id: "med_1", text: "&nbsp;&nbsp;&nbsp;&nbsp;Prescription or non-prescription? Who/what/when/where/why prescribed", isAsked: false },
      { id: "med_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you take it? How much of it did you take? How often do you take it?", isAsked: false },
      { id: "med_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Does it affect your memory/your ability to understand/recall/respond?", isAsked: false },
      { id: "med_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Will these medications interfere with your ability to give truthful and accurate testimony at your deposition today?", isAsked: false },
      { id: "med_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Will it affect your ability to give your best testimony today?", isAsked: false },
      { id: "med_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you have the containers for the medication with you today?", isAsked: false },
      { id: "med_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have them produced and photocopied", isAsked: false },
      { id: "rules_13", text: "Did you consume any alcohol in the past 24 hours?", isAsked: false },
      { id: "alcohol_1", text: "&nbsp;&nbsp;&nbsp;&nbsp;What kind?", isAsked: false },
      { id: "alcohol_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you drink?", isAsked: false },
      { id: "alcohol_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many drinks?", isAsked: false },
      { id: "alcohol_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;How much?", isAsked: false },
      { id: "alcohol_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Why did you decide to drink?", isAsked: false },
      { id: "alcohol_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Will it affect your ability to understand and respond to questions?", isAsked: false },
      { id: "alcohol_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Will it affect your memory or ability to recall events?", isAsked: false },
      { id: "rules_14", text: "Is there any reason why your deposition cannot proceed today?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "preparation",
    title: "III. PREPARATION FOR DEPOSITION",
    isSelected: true,
    notes: "",
    questions: [
      { id: "prep_1", text: "Did you review any documents to prepare for your deposition (either today or before today)?", isAsked: false },
      { id: "prep_1a", text: "&nbsp;&nbsp;&nbsp;&nbsp;If objection: Did you review any documents for purposes of refreshing your recollection in preparation for the depo?", isAsked: false },
      { id: "prep_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;If yes, what were the documents? We have a right to require production and go over them during the deposition.", isAsked: false },
      { id: "prep_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Photographs? Lists?", isAsked: false },
      { id: "prep_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Discovery responses? Other documents?", isAsked: false },
      { id: "prep_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Those documents have been produced to your attorney, who I assume has produced to our office?", isAsked: false },
      { id: "prep_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;If no, have them produced at the depo today?", isAsked: false },
      { id: "prep_7", text: "Did you bring any documents today?", isAsked: false },
      { id: "prep_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;If No → Have you provided your attorney with the documents related to this lawsuit, including for any injuries or damages sustained? What documents are they?", isAsked: false },
      { id: "prep_9", text: "Did you talk to anyone other than your attorney to prepare for today's deposition?", isAsked: false },
      { id: "prep_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Who? [Spouse? Children? Parents? Doctors? Co-Workers? Neighbors?", isAsked: false },
      { id: "prep_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you talk to them?", isAsked: false },
      { id: "prep_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;What did you discuss?", isAsked: false },
      { id: "prep_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Why did you discuss?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "exhibits",
    title: "IV. EXHIBITS",
    isSelected: true,
    notes: "",
    questions: [
      { id: "exhibits_1", text: "Show deponent Notice of Deposition or Deposition Subpoena", isAsked: false },
      { id: "exhibits_2", text: "Do you have any documents that you are producing today?", isAsked: false },
      { id: "exhibits_3", text: "What are these documents?", isAsked: false },
      { id: "exhibits_4", text: "Authenticate the documents that were produced.", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "mark_authenticate",
        title: "A. MARK THEM AND AUTHENTICATE THEM",
        isSelected: true,
        notes: "",
        questions: [
          { id: "auth_1", text: "Please identify ____________ for the record.", isAsked: false },
          { id: "auth_2", text: "Is this a true and correct copy of ______________?", isAsked: false },
          { id: "auth_3", text: "What is the function of _____________?", isAsked: false },
          { id: "auth_4", text: "How is it that you're familiar with _______________?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "personal_background",
    title: "V. PERSONAL BACKGROUND",
    isSelected: true,
    notes: "",
    questions: [
      { id: "personal_1", text: "Date of Birth?", isAsked: false },
      { id: "personal_2", text: "Where were you born?", isAsked: false },
      { id: "personal_3", text: "When did you come to the U.S.?", isAsked: false },
      { id: "personal_4", text: "Names Used – from birth to present?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "language",
        title: "A. Language",
        isSelected: true,
        notes: "",
        questions: [
          { id: "lang_1", text: "What is your primary language?", isAsked: false },
          { id: "lang_2", text: "Can you speak any English? Read English? Write English?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "residential_history",
        title: "B. Residential History",
        isSelected: true,
        notes: "",
        questions: [
          { id: "res_1", text: "What is your current residence?", isAsked: false },
          { id: "res_2", text: "How long have you lived there?", isAsked: false },
          { id: "res_3", text: "Is that where you were living at the time of the accident?", isAsked: false },
          { id: "res_4", text: "Do you plan on living there for the next six months?", isAsked: false },
          { id: "res_5", text: "Prior to that address, Where did you live before that?", isAsked: false },
          { id: "res_6", text: "Depending on the year Plaintiff arrived at the US, where else have you lived?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "family",
        title: "C. Family",
        isSelected: true,
        notes: "",
        questions: [
          { id: "fam_1", text: "What is your marital status?", isAsked: false },
          { id: "fam_1a", text: "&nbsp;&nbsp;&nbsp;&nbsp;Married?", isAsked: false },
          { id: "fam_1b", text: "&nbsp;&nbsp;&nbsp;&nbsp;Divorced?", isAsked: false },
          { id: "fam_1c", text: "&nbsp;&nbsp;&nbsp;&nbsp;Separated?", isAsked: false },
          { id: "fam_2", text: "What is your spouse's name?", isAsked: false },
          { id: "fam_3", text: "When did you get married?", isAsked: false },
          { id: "fam_3a", text: "&nbsp;&nbsp;&nbsp;&nbsp;Prior marriages?", isAsked: false },
          { id: "fam_4", text: "Do you have any children?", isAsked: false },
          { id: "fam_4a", text: "&nbsp;&nbsp;&nbsp;&nbsp;Grandchildren?", isAsked: false },
          { id: "fam_4b", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many?", isAsked: false },
          { id: "fam_4c", text: "&nbsp;&nbsp;&nbsp;&nbsp;Names?", isAsked: false },
          { id: "fam_4d", text: "&nbsp;&nbsp;&nbsp;&nbsp;Ages?", isAsked: false },
          { id: "fam_5", text: "At the time of the incident who did you live with, if anyone?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "social_security",
        title: "D. Social Security Benefits",
        isSelected: true,
        notes: "",
        questions: [
          { id: "ss_1", text: "Are you currently receiving social security disability benefits?", isAsked: false },
          { id: "ss_2", text: "Have you ever received any social security disability benefits in the past?", isAsked: false },
          { id: "ss_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Since when?", isAsked: false },
          { id: "ss_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Consistently since then?", isAsked: false },
          { id: "ss_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;How much? How often?", isAsked: false },
          { id: "ss_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Reason?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "disability_claims",
        title: "E. Disability Claims",
        isSelected: true,
        notes: "",
        questions: [
          { id: "dc_1", text: "As a result of the car accident did you file any Disability claims?", isAsked: false },
          { id: "dc_2", text: "What about filing any claims with the California Employment Development Department as a result of this incident?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "health_insurance",
        title: "F. Health Insurance",
        isSelected: true,
        notes: "",
        questions: [
          { id: "hi_1", text: "At the time of the incident?", isAsked: false },
          { id: "hi_2", text: "Now?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "medicare",
        title: "G. Medicare",
        isSelected: true,
        notes: "",
        questions: [
          { id: "med_1", text: "Are you currently eligible to receive Medicare benefits?", isAsked: false },
          { id: "med_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Since when?", isAsked: false },
          { id: "med_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;(If can't recall, ask: Were you eligible to receive Medicare benefits at the time of the incident?", isAsked: false },
          { id: "med_4", text: "Are you currently receiving Medicare benefits? What about at the time of the incident?", isAsked: false },
          { id: "med_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Since when? (If can't recall, ask: Were you receiving Medicare benefits at the time of the incident?)", isAsked: false },
          { id: "med_6", text: "Do you know your Medicare Number?", isAsked: false },
          { id: "med_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Is your Medicare number your social security number?", isAsked: false },
          { id: "med_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Consistently since then?", isAsked: false },
          { id: "med_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;How much?", isAsked: false },
          { id: "med_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;How often?", isAsked: false },
          { id: "med_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Reason?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "medi_cal",
        title: "H. Medi-Cal",
        isSelected: true,
        notes: "",
        questions: [
          { id: "mc_1", text: "Are you currently eligible to receive Medi-Cal benefits?", isAsked: false },
          { id: "mc_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;[If doesn't recall – ask do you have some identification card?", isAsked: false },
          { id: "mc_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is your Medi-Cal Id Number?", isAsked: false },
          { id: "mc_4", text: "Are you currently receiving Medi-Cal benefits? What about at the time of the incident?", isAsked: false },
          { id: "mc_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Since when? (If can't recall, ask: Were you eligible to receive Medicare benefits at the time of the incident? Consistently since then?", isAsked: false },
          { id: "mc_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;How much? How often? Reason?", isAsked: false },
          { id: "mc_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have you submitted claims? Have you received benefits?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "education",
        title: "I. Education",
        isSelected: true,
        notes: "",
        questions: [
          { id: "edu_1", text: "Did you attend high school?", isAsked: false },
          { id: "edu_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where?", isAsked: false },
          { id: "edu_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;When?", isAsked: false },
          { id: "edu_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Dates of attendance?", isAsked: false },
          { id: "edu_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you obtain your high school diploma?", isAsked: false },
          { id: "edu_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any other schooling after high school?", isAsked: false },
          { id: "edu_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is the name of each school you have attended after high school?", isAsked: false },
          { id: "edu_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Location?", isAsked: false },
          { id: "edu_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Did you graduate?", isAsked: false },
          { id: "edu_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;What was the degree or grade level completed?", isAsked: false },
          { id: "edu_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;When did you graduate?", isAsked: false },
          { id: "edu_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Where?", isAsked: false },
          { id: "edu_13", text: "What was the highest grade level completed?", isAsked: false },
          { id: "edu_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any Trade school?", isAsked: false },
          { id: "edu_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;Other job training?", isAsked: false },
          { id: "edu_16", text: "Do you have any professional licenses?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "other_insurance",
    title: "VI. OTHER INSURANCE",
    isSelected: true,
    notes: "",
    questions: [
      { id: "oi_1", text: "Please identify any medical insurance coverage you have had in the past 10 years.", isAsked: false },
      { id: "oi_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is the name of the company?", isAsked: false },
      { id: "oi_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you first have this plan?", isAsked: false },
      { id: "oi_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you last have this plan?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "prior_history",
    title: "VII. PRIOR HISTORY",
    isSelected: true,
    notes: "",
    questions: [
      { id: "ph_1", text: "A. Prior Worker's Compensation Claims:", isAsked: false },
      { id: "ph_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have you filed a workers compensation claim?", isAsked: false },
      { id: "ph_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;In the last ten years, filed any workers' compensation claim?", isAsked: false },
      { id: "ph_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;When.", isAsked: false },
      { id: "ph_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where.", isAsked: false },
      { id: "ph_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Nature of Case? Status?", isAsked: false },
      { id: "ph_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Resolved/Settled?", isAsked: false },
      { id: "ph_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you receive any compensation?", isAsked: false },
      { id: "ph_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Were the terms of the resolution confidential?", isAsked: false },
      { id: "ph_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Work related injury?", isAsked: false },
      { id: "ph_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;In the last 10 years, have you received any type of medical treatment for any pain, injury or complaint to your __________________?", isAsked: false },
      { id: "ph_12", text: "B. Demands:", isAsked: false },
      { id: "ph_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;In the last ten years, have you made a demand for compensation for any physical injury sustained?", isAsked: false },
      { id: "ph_14", text: "C. Previous Accidents:", isAsked: false },
      { id: "ph_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;Were you involved in any motor vehicle accidents prior to this incident?", isAsked: false },
      { id: "ph_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many?", isAsked: false },
      { id: "ph_17", text: "&nbsp;&nbsp;&nbsp;&nbsp;When?", isAsked: false },
      { id: "ph_18", text: "&nbsp;&nbsp;&nbsp;&nbsp;What happened?", isAsked: false },
      { id: "ph_19", text: "&nbsp;&nbsp;&nbsp;&nbsp;Who was at fault?", isAsked: false },
      { id: "ph_20", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any injuries?", isAsked: false },
      { id: "ph_21", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did it ever resolve?", isAsked: false },
      { id: "ph_22", text: "&nbsp;&nbsp;&nbsp;&nbsp;When?", isAsked: false },
      { id: "ph_23", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have you been involved in any other accidents or incidents in the 10 years prior to this incident? (trip and fall, slip and fall, skiing accident, etc)", isAsked: false },
      { id: "ph_24", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you have any vision impairments at the time of these incidents?", isAsked: false },
      { id: "ph_25", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you wear glasses?", isAsked: false },
      { id: "ph_26", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you wear glasses at the time of the incident?", isAsked: false },
      { id: "ph_27", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you have any hearing impairments at the time of the incident?", isAsked: false },
      { id: "ph_28", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you have any other illness or injury prior to this incident?", isAsked: false },
      { id: "ph_29", text: "D. Prior injuries:", isAsked: false },
      { id: "ph_30", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you have any injuries prior to this incident that are the same or similar or have affected the injuries you are claiming here?", isAsked: false },
      { id: "ph_31", text: "&nbsp;&nbsp;&nbsp;&nbsp;Look at Discovery Responses.", isAsked: false },
      { id: "ph_32", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you have any pre-existing medical conditions prior to the accident?", isAsked: false },
      { id: "ph_33", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;If so, what were they and how did they occur?", isAsked: false },
      { id: "ph_34", text: "&nbsp;&nbsp;&nbsp;&nbsp;Priors: In the last ten years, have you suffered any injury to the body parts you injured in this incident?", isAsked: false },
      { id: "ph_35", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you recall any prior fall, injury or trauma these body parts?", isAsked: false },
      { id: "ph_36", text: "E. Prior Treatment:", isAsked: false },
      { id: "ph_37", text: "&nbsp;&nbsp;&nbsp;&nbsp;What type of doctors have you treated with in the last ten years?", isAsked: false },
      { id: "ph_38", text: "&nbsp;&nbsp;&nbsp;&nbsp;Who is this?", isAsked: false },
      { id: "ph_39", text: "&nbsp;&nbsp;&nbsp;&nbsp;Why did you treat? For what reason?", isAsked: false },
      { id: "ph_40", text: "&nbsp;&nbsp;&nbsp;&nbsp;Issue Payment? did you visit this provider for ____?", isAsked: false },
      { id: "ph_41", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any other doctors seen in the past 10 years not already mentioned?", isAsked: false },
      { id: "ph_42", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Who?", isAsked: false },
      { id: "ph_43", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;When?", isAsked: false },
      { id: "ph_44", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Where?", isAsked: false },
      { id: "ph_45", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Why", isAsked: false },
      { id: "ph_46", text: "F. Unemployment:", isAsked: false },
      { id: "ph_47", text: "&nbsp;&nbsp;&nbsp;&nbsp;In the last ten years, have you filed any claims for unemployment benefits?", isAsked: false },
      { id: "ph_48", text: "G. Disability:", isAsked: false },
      { id: "ph_49", text: "&nbsp;&nbsp;&nbsp;&nbsp;In the last ten years, have you filed any disability claims?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "incident_biomech",
    title: "VIII. INCIDENT//BIOMECH QUESTIONS",
    isSelected: true,
    notes: "",
    questions: [
      { id: "incident_1", text: "Can you please tell me the date and time of this incident?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "vehicle",
        title: "A. Vehicle",
        isSelected: true,
        notes: "",
        questions: [
          { id: "veh_1", text: "What vehicle were you driving?", isAsked: false },
          { id: "veh_2", text: "What vehicle were you in?", isAsked: false },
          { id: "veh_3", text: "Are you the owner of this vehicle?", isAsked: false },
          { id: "veh_4", text: "Does anyone else use this vehicle?", isAsked: false },
          { id: "veh_5", text: "Any vehicle modifications, raised, lowered?", isAsked: false },
          { id: "veh_6", text: "Has the vehicle ever been in another accident?", isAsked: false },
          { id: "veh_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did it sustain any damage?", isAsked: false },
          { id: "veh_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;If so, where is/was the damage and to what extent?", isAsked: false },
          { id: "veh_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Was it repaired?", isAsked: false },
          { id: "veh_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;By who and when?", isAsked: false },
          { id: "veh_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did the airbags deploy in this other accident?", isAsked: false },
          { id: "veh_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;Was that other accident more or less severe than the subject accident?", isAsked: false },
          { id: "veh_13", text: "Did the vehicle you were in sustain any damage as a result of the accident in question?", isAsked: false },
          { id: "veh_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;If so, where and to what extent?", isAsked: false },
          { id: "veh_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;Does this damage still exist or has it been repaired?", isAsked: false },
          { id: "veh_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;If repaired, when and by whom?", isAsked: false },
          { id: "veh_17", text: "&nbsp;&nbsp;&nbsp;&nbsp;If repaired, approximately how much did the repairs cost?", isAsked: false },
          { id: "veh_18", text: "Were all involved vehicles drivable after the impact? If not, how were the vehicles moved from the scene?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "before_incident",
        title: "B. Before the Incident",
        isSelected: true,
        notes: "",
        questions: [
          { id: "before_1", text: "What time did you wake up?", isAsked: false },
          { id: "before_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Had you taken any medications either the night before or the morning of the accident?", isAsked: false },
          { id: "before_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Who prescribed these medications?", isAsked: false },
          { id: "before_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any side effects?", isAsked: false },
          { id: "before_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where did you take these medications?", isAsked: false },
          { id: "before_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do they affect your vision?", isAsked: false },
          { id: "before_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did they have any other impairments?", isAsked: false },
          { id: "before_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;During the 24 hours before the incident, did you take or use any Medication, ask:", isAsked: false },
          { id: "before_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Purpose of prescription/medication?", isAsked: false },
          { id: "before_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;How long have you been taking this?", isAsked: false },
          { id: "before_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Quantity of each substance?", isAsked: false },
          { id: "before_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date/time when substance was taken?", isAsked: false },
          { id: "before_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Address where it was taken?", isAsked: false },
          { id: "before_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;does anyone know you took this?", isAsked: false },
          { id: "before_15", text: "Can you please describe for me your physical condition on before the collision?", isAsked: false },
          { id: "before_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;Was your vision ok?", isAsked: false },
          { id: "before_17", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where you wearing glasses?", isAsked: false },
          { id: "before_18", text: "&nbsp;&nbsp;&nbsp;&nbsp;Was your hearing ok?", isAsked: false },
          { id: "before_19", text: "Please describe your emotions that day? Nothing before the accident.", isAsked: false },
          { id: "before_20", text: "&nbsp;&nbsp;&nbsp;&nbsp;Were you nervous?", isAsked: false },
          { id: "before_21", text: "&nbsp;&nbsp;&nbsp;&nbsp;Angry?", isAsked: false },
          { id: "before_22", text: "&nbsp;&nbsp;&nbsp;&nbsp;Anxious?", isAsked: false },
          { id: "before_23", text: "What did you do between the time you woke up and when the accident occurred?", isAsked: false },
          { id: "before_24", text: "What time did you leave to go to your destination on the day of the accident?", isAsked: false },
          { id: "before_25", text: "Where did you begin your trip prior to the accident?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "accident_details",
        title: "H. How the accident happened/Biomechanical Questions",
        isSelected: true,
        notes: "",
        questions: [
          { id: "acc_1", text: "Was traffic moving at the time of the accident? Typical rush our stop and go traffic.", isAsked: false },
          { id: "acc_2", text: "Was traffic slowing down in front of you?", isAsked: false },
          { id: "acc_3", text: "Prior to impact, had your vehicle come to a complete stop?", isAsked: false },
          { id: "acc_4", text: "Were you still moving at impact?", isAsked: false },
          { id: "acc_5", text: "Describe for me what happened:", isAsked: false },
          { id: "acc_6", text: "Where were you looking at the time of the incident?", isAsked: false },
          { id: "acc_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;left out driver window?", isAsked: false },
          { id: "acc_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;right out passenger window?", isAsked: false },
          { id: "acc_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;down at something?", isAsked: false },
          { id: "acc_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;out front windshield?", isAsked: false },
          { id: "acc_11", text: "Describe the impact for me.", isAsked: false },
          { id: "acc_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;Strong?", isAsked: false },
          { id: "acc_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Minor?", isAsked: false },
          { id: "acc_14", text: "Do you recall whether your body made contact with anything during the collision?", isAsked: false },
          { id: "acc_15", text: "What happened to your body at the time of the incident?", isAsked: false },
          { id: "acc_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did your head hit anything?", isAsked: false },
          { id: "acc_17", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did your arm hit anything?", isAsked: false },
          { id: "acc_18", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did your back hit anything?", isAsked: false },
          { id: "acc_19", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did your legs hit anything?", isAsked: false },
          { id: "acc_20", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did your hands hit anything?", isAsked: false },
          { id: "acc_21", text: "Did the impact cause you to collide with other vehicles", isAsked: false },
          { id: "acc_22", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many vehicles", isAsked: false },
          { id: "acc_23", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did your vehicle come in contact with anything else?", isAsked: false },
          { id: "acc_24", text: "&nbsp;&nbsp;&nbsp;&nbsp;And then it came to rest?", isAsked: false },
          { id: "acc_25", text: "Had you driven in that area where the incident occurred before?", isAsked: false },
          { id: "acc_26", text: "How many times?", isAsked: false },
          { id: "acc_27", text: "Were you in a hurry that day? How were you rushing?", isAsked: false },
          { id: "acc_28", text: "Were you talking on a cell phone? Talking to anyone? No and nothing else.", isAsked: false },
          { id: "acc_29", text: "Were you aware that the impending accident was about to occur? If so, how long before the impact? If so, did you do anything to brace for impact? Relative to your vehicle, where (distance) was the other vehicle when you first noticed it?", isAsked: false },
          { id: "acc_30", text: "When did you first notice the other vehicle involved in the accident?", isAsked: false },
          { id: "acc_31", text: "Did you take any evasive maneuvers such as braking, swerving, or accelerating?", isAsked: false },
          { id: "acc_32", text: "Did the other vehicle take any evasive maneuvers?", isAsked: false },
          { id: "acc_33", text: "Was your foot on the brake or accelerator at time of impact?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "weather_conditions",
        title: "C. Weather conditions",
        isSelected: true,
        notes: "",
        questions: [
          { id: "weather_1", text: "What were the weather conditions like at the time of the accident?", isAsked: false },
          { id: "weather_2", text: "Where was the sun at time of impact? Was visibility an issue?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "road_conditions",
        title: "D. Road Conditions",
        isSelected: true,
        notes: "",
        questions: [
          { id: "road_1", text: "What were the road conditions like at the time of the accident?", isAsked: false },
          { id: "road_2", text: "Were there any unusual or adverse conditions at the time of the accident? This includes weather, other driver acting strange, car conditions (Bald tires? Weird noises?)", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "location",
        title: "E. Location",
        isSelected: true,
        notes: "",
        questions: [
          { id: "loc_1", text: "Where was the destination of your trip prior to the accident?", isAsked: false },
          { id: "loc_2", text: "Where did the accident occur?", isAsked: false },
          { id: "loc_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many lanes of travel?", isAsked: false },
          { id: "loc_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;What lane were you in 100 feet before the accident?", isAsked: false },
          { id: "loc_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;What lane were you in in the 50 feet before the accident?", isAsked: false },
          { id: "loc_6", text: "Was the impact on a level surface, uphill, or downhill?", isAsked: false },
          { id: "loc_7", text: "What type of roadway surface was it? i.e. gravel, asphalt.", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "people_in_vehicle",
        title: "F. People in the vehicle",
        isSelected: true,
        notes: "",
        questions: [
          { id: "people_1", text: "Were you alone in your vehicle?", isAsked: false },
          { id: "people_2", text: "Who were you with?", isAsked: false },
          { id: "people_3", text: "How long were you in the vehicle prior to the accident?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "seatbelt_airbag",
        title: "G. Seatbelt//Airbag",
        isSelected: true,
        notes: "",
        questions: [
          { id: "seat_1", text: "Were you wearing your seatbelt at the time of the accident?", isAsked: false },
          { id: "seat_2", text: "What type of restraint system? Lap and shoulder belt, Lap only, shoulder only? Did your seatbelt lock up?", isAsked: false },
          { id: "seat_3", text: "Was your vehicle equipped with an airbag?", isAsked: false },
          { id: "seat_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did it deploy?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "other_vehicle",
        title: "I. Other Vehicle",
        isSelected: true,
        notes: "",
        questions: [
          { id: "other_1", text: "When did you first see the vehicle that was involved in this incident?", isAsked: false },
          { id: "other_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;did you see the other vehicle in the rear view mirror?", isAsked: false },
          { id: "other_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Approximately how many seconds elapsed between when you saw the other vehicle and when impact occurred?", isAsked: false },
          { id: "other_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;And what was the other vehicle's approximate speed? unsure of the exact speed. thinks he was going fast.", isAsked: false },
          { id: "other_5", text: "Please describe where the vehicles were located at the point of impact?", isAsked: false },
          { id: "other_6", text: "Please describe the other vehicle involved in this incident:", isAsked: false },
          { id: "other_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Make?", isAsked: false },
          { id: "other_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Model?", isAsked: false },
          { id: "other_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Color?", isAsked: false },
          { id: "other_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Size?", isAsked: false },
          { id: "other_11", text: "Did you see the other driver?", isAsked: false },
          { id: "other_12", text: "Are you able to identify the other driver?", isAsked: false },
          { id: "other_13", text: "If not by name then description?", isAsked: false },
          { id: "other_14", text: "Did the other vehicle or your vehicle have the headlights on?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "plaintiff_vision",
        title: "J. Plaintiff's Vision",
        isSelected: true,
        notes: "",
        questions: [
          { id: "vision_1", text: "At the time of the incident, were you required to wear prescription glasses or contacts?", isAsked: false },
          { id: "vision_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;If Yes, ask were you wearing them? How often do you need to wear glasses? distance? Need it for walking?", isAsked: false },
          { id: "vision_3", text: "Glasses? Contacts? Reading glasses? since when? how often wear it? require glasses for walking?", isAsked: false },
          { id: "vision_4", text: "Do you require the use of a cane to walk? Since when? Why?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "witnesses",
        title: "K. Witnesses",
        isSelected: true,
        notes: "",
        questions: [
          { id: "wit_1", text: "Were there any individuals present – besides yourself and the other driver?", isAsked: false },
          { id: "wit_2", text: "Did you speak with anyone following the incident?", isAsked: false },
          { id: "wit_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Who other than the police?", isAsked: false },
          { id: "wit_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Property damage", isAsked: false },
          { id: "wit_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you speak to other divers?", isAsked: false },
          { id: "wit_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did they speak first, or did you tell them what had happened?", isAsked: false },
          { id: "wit_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Please describe as closely as you can remember the conversation which took place.", isAsked: false },
          { id: "wit_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did anything preclude you from seeing the vehicle prior to impact", isAsked: false },
          { id: "wit_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Other vehicles?", isAsked: false },
          { id: "wit_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Names?", isAsked: false },
          { id: "wit_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is your relationship?", isAsked: false },
          { id: "wit_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;How long have you known _____?", isAsked: false },
          { id: "wit_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Ages?", isAsked: false },
          { id: "wit_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have you spoken with him/her recently?", isAsked: false },
          { id: "wit_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;GO THROUGH EACH WITNESS – what were the interactions? What did you tell __________?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "after_incident",
        title: "L. After the incident",
        isSelected: true,
        notes: "",
        questions: [
          { id: "after_1", text: "What did you do right after?", isAsked: false },
          { id: "after_2", text: "Did you move to the side of the road?", isAsked: false },
          { id: "after_3", text: "Where did you take your vehicle?", isAsked: false },
          { id: "after_4", text: "Where was the other vehicle?", isAsked: false },
          { id: "after_5", text: "How did you react? Sit? Stand?", isAsked: false },
          { id: "after_6", text: "Did you walk around your vehicle?", isAsked: false },
          { id: "after_7", text: "Did you walk around the other vehicle?", isAsked: false },
          { id: "after_8", text: "When you were walking around did you feel pain?", isAsked: false },
          { id: "after_9", text: "Did anyone help you up?", isAsked: false },
          { id: "after_10", text: "Did you speak to anyone? Who? What did they do?", isAsked: false },
          { id: "after_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did anyone help you? How?", isAsked: false },
          { id: "after_12", text: "Did you call for help?", isAsked: false },
          { id: "after_13", text: "Did anyone offer to help you?", isAsked: false },
          { id: "after_14", text: "Did you tell anyone you were hurt?", isAsked: false },
          { id: "after_15", text: "Did you call your insurance company?", isAsked: false },
          { id: "after_16", text: "Was an ambulance was called?", isAsked: false },
          { id: "after_17", text: "Who called the ambulance?", isAsked: false },
          { id: "after_18", text: "Why did you call the ambulance?", isAsked: false },
          { id: "after_19", text: "paramedics arrived? What did they do for you?", isAsked: false },
          { id: "after_20", text: "Did you ask for an ambulance?", isAsked: false },
          { id: "after_21", text: "Did you get out of the car immediately after the accident? If so, how long after the accident?", isAsked: false },
          { id: "after_22", text: "Were you assisted to get out of the car? If so, by who and why?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "reporting_incident",
        title: "M. Reporting The Incident",
        isSelected: true,
        notes: "",
        questions: [
          { id: "report_1", text: "Did you report the incident?", isAsked: false },
          { id: "report_2", text: "How?", isAsked: false },
          { id: "report_3", text: "To Who?", isAsked: false },
          { id: "report_4", text: "When?", isAsked: false },
          { id: "report_5", text: "Did you give a statement?", isAsked: false },
          { id: "report_6", text: "What was said? Did he say why it was refused? Who else?", isAsked: false },
          { id: "report_7", text: "Who completed that report?", isAsked: false },
          { id: "report_8", text: "When? Who? How?", isAsked: false },
          { id: "report_9", text: "Report immediately?", isAsked: false },
          { id: "report_10", text: "Take any photographs? witness?", isAsked: false },
          { id: "report_11", text: "Were the police notified? If so, by who and when?", isAsked: false },
          { id: "report_12", text: "Did the police arrive at the scene? If so, how long after the accident?", isAsked: false },
          { id: "report_13", text: "Did the police write a report?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "seating_positions",
        title: "N. Seating Positions",
        isSelected: true,
        notes: "",
        questions: [
          { id: "seat_pos_1", text: "What was your seating position in the vehicle, i.e. driver, front seat passenger?", isAsked: false },
          { id: "seat_pos_2", text: "What was the number of occupants in each vehicle, their seating positions and their ages?", isAsked: false },
          { id: "seat_pos_3", text: "At the time of the impact was your head turned to the left or the right?", isAsked: false },
          { id: "seat_pos_4", text: "Was your torso turned to the left or the right?", isAsked: false },
          { id: "seat_pos_5", text: "Were you looking straight ahead?", isAsked: false },
          { id: "seat_pos_6", text: "Describe as accurately as you can your seating posture/stance at the time of the accident.", isAsked: false },
          { id: "seat_pos_7", text: "What was the location of your hands, i.e. steering wheel @ 10 and 2 o'clock position, on the stick shift?", isAsked: false },
          { id: "seat_pos_8", text: "What was the location of your feet, i.e. right foot on the brake, left foot on clutch/floorboard?", isAsked: false },
          { id: "seat_pos_9", text: "Did your vehicle have headrests?", isAsked: false },
          { id: "seat_pos_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;What kind were they, i.e., adjustable, high-back seats?", isAsked: false },
          { id: "seat_pos_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Were they adjusted for your height?", isAsked: false },
          { id: "seat_pos_12", text: "What angle was the seatback adjusted in degrees? Does it have a separate lumbar adjustment?", isAsked: false },
          { id: "seat_pos_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Is it a bench or bucket seat?", isAsked: false },
          { id: "seat_pos_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;How far away was the seatback from the steering wheel/dashboard in feet or inches?", isAsked: false },
          { id: "seat_pos_15", text: "What was your post-impact motion, i.e., went forward and then backward, or first left then right? To what extent was this motion in inches or feet?", isAsked: false },
          { id: "seat_pos_16", text: "Did your head hit the windshield, steering wheel, or dashboard?", isAsked: false },
          { id: "seat_pos_17", text: "If so, how far away was your head from the struck component in feet or inches?", isAsked: false },
          { id: "seat_pos_18", text: "Did your head hit the head-rest? If so what part of your head?", isAsked: false },
          { id: "seat_pos_19", text: "Did your head move forward, backward, sideways? If so, which motion was first and to what extent in feet or inches?", isAsked: false },
          { id: "seat_pos_20", text: "Did your chest hit the steering wheel or dashboard? If so, how far away was the steering wheel or dashboard in feet or inches?", isAsked: false },
          { id: "seat_pos_21", text: "Did your knee or knees hit the steering wheel or dashboard? If so, how far away was the steering wheel or dashboard from your knee or knees?", isAsked: false },
          { id: "seat_pos_22", text: "Did you strike anything in the vehicle? If so, how, where, and when? Describe the dynamics associated with this contact.", isAsked: false },
          { id: "seat_pos_23", text: "Did you lose consciousness?", isAsked: false },
          { id: "seat_pos_24", text: "Did you have any bruises, lacerations, or cuts? If so, where, and what caused them?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "distractions",
        title: "O. Distractions",
        isSelected: true,
        notes: "",
        questions: [
          { id: "distract_1", text: "Were you distracted when the collision happened, i.e. phone, radio, navigation, passenger, looking for something?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "video_incident",
        title: "P. Video of the Incident",
        isSelected: true,
        notes: "",
        questions: [
          { id: "video_1", text: "Are you aware of any photos/videos of the accident or scene? Was your vehicle equipped with a camera/dashcam?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "impact",
        title: "Q. Impact",
        isSelected: true,
        notes: "",
        questions: [
          { id: "impact_1", text: "Did the vehicle move as a result of the impact? If so how far in feet or inches? What direction did it move?", isAsked: false },
          { id: "impact_2", text: "Were the vehicles touching post-accident?", isAsked: false },
          { id: "impact_3", text: "Was the driver accelerating, braking, or coasting at the time of impact? What was the velocity of each vehicle immediately prior to the impact?", isAsked: false },
          { id: "impact_4", text: "Describe how the impact felt.", isAsked: false },
          { id: "impact_5", text: "Did you hear anything prior to the impact, i.e. screeching tires, honking horn?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "injuries",
    title: "IX. INJURIES",
    isSelected: true,
    notes: "",
    questions: [
      { id: "inj_1", text: "Who is your current primary care physician?", isAsked: false },
      { id: "inj_2", text: "Did you treat with your primary care physician as a result of this accident?", isAsked: false },
      { id: "inj_3", text: "Did you have insurance?", isAsked: false },
      { id: "inj_4", text: "You are not claiming any mental health issues to the subject accident correct?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "physical_injuries",
        title: "Physical Injuries",
        isSelected: true,
        notes: "",
        questions: [
          { id: "phys_1", text: "For each injury: Go through each injury and use the spreadsheet with questions below:", isAsked: false },
          { id: "phys_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did it start?", isAsked: false },
          { id: "phys_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where does it hurt?", isAsked: false },
          { id: "phys_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;What are the complaints/symptoms?", isAsked: false },
          { id: "phys_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Sharp pain or dull pain?", isAsked: false },
          { id: "phys_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Can you rate your pain for me on the day of the accident? On a 1-10 scale, 10 being the most painful?", isAsked: false },
          { id: "phys_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;How often do you feel pain?", isAsked: false },
          { id: "phys_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Getting worse? Getting better? the back pain has been getting worse and worse, back pain didn't start until the day after the incident. had to alter he work,", isAsked: false },
          { id: "phys_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you still feel pain?", isAsked: false },
          { id: "phys_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Can you rate your current pain on a scale of a 1-10?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "traumatic_brain_injury",
    title: "X. TRAUMATIC BRAIN INJURY",
    isSelected: true,
    notes: "",
    questions: [
      { id: "tbi_1", text: "Has anyone diagnosed you with a Traumatic brain injury?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "tbi_physical",
        title: "A. Physical: Ask about before and after the incident",
        isSelected: true,
        notes: "",
        questions: [
          { id: "tbi_phys_1", text: "Did you lose consciousness during the incident?", isAsked: false },
          { id: "tbi_phys_2", text: "When have you lost consciousness since the incident?", isAsked: false },
          { id: "tbi_phys_3", text: "Have you ever been diagnosed with Post-concussive syndrome?", isAsked: false },
          { id: "tbi_phys_4", text: "Do you have a history of prior traumatic brain injuries?", isAsked: false },
          { id: "tbi_phys_5", text: "What is your history with concussions?", isAsked: false },
          { id: "tbi_phys_6", text: "Loss of consciousness for a few seconds or minutes, being dazed, confused or disoriented", isAsked: false },
          { id: "tbi_phys_7", text: "Headaches, dizziness or loss of balance", isAsked: false },
          { id: "tbi_phys_8", text: "Nausea, vomiting, blurred vision, ringing in the ears or dry mouth", isAsked: false },
          { id: "tbi_phys_9", text: "Difficulty sleeping, fatigue, drowsiness or sleeping more than usual", isAsked: false },
          { id: "tbi_phys_10", text: "Slurred speech, weakness or numbness in fingers and toes", isAsked: false },
          { id: "tbi_phys_11", text: "Sensitivity to light or sound?", isAsked: false },
          { id: "tbi_phys_12", text: "Do you have headaches?", isAsked: false },
          { id: "tbi_phys_13", text: "Clear fluid draining from the nose or ears", isAsked: false },
          { id: "tbi_phys_14", text: "Inability to awaken from sleep", isAsked: false },
          { id: "tbi_phys_15", text: "Loss of coordination", isAsked: false },
          { id: "tbi_phys_16", text: "Persistent headache or headache that worsens", isAsked: false },
          { id: "tbi_phys_17", text: "Repeated vomiting or nausea, convulsions or seizures", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "tbi_emotional",
        title: "B. Emotional",
        isSelected: true,
        notes: "",
        questions: [
          { id: "tbi_emot_1", text: "Do you have Post-traumatic anxiety?", isAsked: false },
          { id: "tbi_emot_2", text: "Did you have anxiety before the incident?", isAsked: false },
          { id: "tbi_emot_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you take medication for anxiety before the incident?", isAsked: false },
          { id: "tbi_emot_4", text: "Did you have depression before the incident?", isAsked: false },
          { id: "tbi_emot_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you take medication for depression before the incident?", isAsked: false },
          { id: "tbi_emot_6", text: "Have you been diagnosed with Post Traumatic Stress Disorder?", isAsked: false },
          { id: "tbi_emot_7", text: "Have you had any blood testing done since the incident?", isAsked: false },
          { id: "tbi_emot_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;What were the results?", isAsked: false },
          { id: "tbi_emot_9", text: "Had you ever experienced confusion before the incident?", isAsked: false },
          { id: "tbi_emot_10", text: "Have you been forgetful in conversations?", isAsked: false },
          { id: "tbi_emot_11", text: "Mood changes or swings, feeling depressed or anxious", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "tbi_cognitive",
        title: "C. Cognitive",
        isSelected: true,
        notes: "",
        questions: [
          { id: "tbi_cog_1", text: "Memory, concentration problems or sensitivity to light or sound", isAsked: false },
          { id: "tbi_cog_2", text: "Profound confusion, agitation, combativeness or other unusual behavior", isAsked: false },
          { id: "tbi_cog_3", text: "Are you able to remember people's names?", isAsked: false },
          { id: "tbi_cog_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Has anyone said what the headaches are from?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "tbi_past_treatment",
        title: "D. Past Treatment",
        isSelected: true,
        notes: "",
        questions: [
          { id: "tbi_past_1", text: "Have you treated with any of the following:", isAsked: false },
          { id: "tbi_past_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Neurologist", isAsked: false },
          { id: "tbi_past_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Did you undergo diagnostic testing?", isAsked: false },
          { id: "tbi_past_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;What was the testing like?", isAsked: false },
          { id: "tbi_past_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;What was the diagnosis?", isAsked: false },
          { id: "tbi_past_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Psychiatrist", isAsked: false },
          { id: "tbi_past_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Neuropsychologist", isAsked: false },
          { id: "tbi_past_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Psychologist?", isAsked: false },
          { id: "tbi_past_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Speech Pathologist", isAsked: false },
          { id: "tbi_past_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Endocrinologist", isAsked: false },
          { id: "tbi_past_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Registered Nurse Care Manager", isAsked: false },
          { id: "tbi_past_12", text: "Have you discussed ketamine treatment with anyone?", isAsked: false },
          { id: "tbi_past_13", text: "1. Imaging:", isAsked: false },
          { id: "tbi_past_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have you undergone brain scans or MRIs or any other imaging?", isAsked: false },
          { id: "tbi_past_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Did you go over the results with a doctor?", isAsked: false },
          { id: "tbi_past_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;What did you discuss with the doctor?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "tbi_future_treatment",
        title: "E. Future Treatment",
        isSelected: true,
        notes: "",
        questions: [
          { id: "tbi_fut_1", text: "Do you plan to treat with any of the following in the future:", isAsked: false },
          { id: "tbi_fut_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Neurologist", isAsked: false },
          { id: "tbi_fut_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Psychiatrist", isAsked: false },
          { id: "tbi_fut_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Neuropsychologist", isAsked: false },
          { id: "tbi_fut_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Psychologist?", isAsked: false },
          { id: "tbi_fut_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Endocrinologist", isAsked: false },
          { id: "tbi_fut_7", text: "Have you have had testosterone levels taken since the incident?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "tbi_other_diseases",
        title: "F. Other related diseases",
        isSelected: true,
        notes: "",
        questions: [
          { id: "tbi_other_1", text: "Were you ever seen for Alzheimer's Parkinson's disease?", isAsked: false },
          { id: "tbi_other_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;before the incident", isAsked: false },
          { id: "tbi_other_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;after the incident?", isAsked: false },
          { id: "tbi_other_4", text: "has your head pain resolved?", isAsked: false },
          { id: "tbi_other_5", text: "have you sought treatment for Alzheimers or dementia? or Parkinson's disease?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "loss_consortium",
    title: "XI. LOSS OF CONSORTIUM",
    isSelected: true,
    notes: "https://www.justia.com/trials-litigation/docs/caci/3900/3920/",
    questions: [
      { id: "consortium_1", text: "What was the loss of the following:", isAsked: false },
      { id: "consortium_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;love", isAsked: false },
      { id: "consortium_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;companionship", isAsked: false },
      { id: "consortium_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Service", isAsked: false },
      { id: "consortium_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;comfort", isAsked: false },
      { id: "consortium_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;care", isAsked: false },
      { id: "consortium_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;assistance", isAsked: false },
      { id: "consortium_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;protection", isAsked: false },
      { id: "consortium_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;affection", isAsked: false },
      { id: "consortium_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;society, and", isAsked: false },
      { id: "consortium_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;moral support", isAsked: false },
      { id: "consortium_12", text: "Do you fear a separation or divorce?", isAsked: false },
      { id: "consortium_13", text: "Were you planning on having children before this incident?", isAsked: false },
      { id: "consortium_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;Are you able to have children after this incident?", isAsked: false },
      { id: "consortium_15", text: "Do you take care of him/her/they above what you did prior to the incident?", isAsked: false },
      { id: "consortium_16", text: "Have you had to provide physical care since the incident?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "marriages",
        title: "Marriages: Husband Wife/Partner",
        isSelected: true,
        notes: "",
        questions: [
          { id: "marriage_1", text: "Have you had any prior marriages?", isAsked: false },
          { id: "marriage_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any prior children?", isAsked: false },
          { id: "marriage_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;What was the reason for the divorce or separation", isAsked: false },
          { id: "marriage_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;date/length of marriage", isAsked: false },
          { id: "marriage_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;children", isAsked: false },
          { id: "marriage_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Were there any acts of domestic violence", isAsked: false },
          { id: "marriage_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;do you still talk with him/her/they?", isAsked: false },
          { id: "marriage_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you have any affairs", isAsked: false },
          { id: "marriage_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you have any other children?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "employment",
    title: "XII. EMPLOYMENT /LOSS OF INCOME/LOSS OF EARNING CAPACITY",
    isSelected: true,
    notes: "",
    questions: [
      { id: "emp_1", text: "Are you currently employed?", isAsked: false },
      { id: "emp_2", text: "What about at the time of the incident, were you employed?", isAsked: false },
      { id: "emp_3", text: "If No:", isAsked: false },
      { id: "emp_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;When was the last time you were employed? Get general background on what she worked as….", isAsked: false },
      { id: "emp_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;In what industry?", isAsked: false },
      { id: "emp_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;What type of work?", isAsked: false },
      { id: "emp_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where? Employer name?", isAsked: false },
      { id: "emp_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Position? Duties?", isAsked: false },
      { id: "emp_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Dates of employment:", isAsked: false },
      { id: "emp_10", text: "Are you making a wage loss claim?", isAsked: false },
      { id: "emp_11", text: "Were you employed at the time of the incident?", isAsked: false },
      { id: "emp_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;In other words, you weren't employed at the time of the incident, so you didn't miss time from work.", isAsked: false },
      { id: "emp_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;So you didn't miss any time from work because you weren't employed working anywhere?", isAsked: false },
      { id: "emp_14", text: "I understand you are not making a claim for a loss of future income. Is that correct?", isAsked: false },
      { id: "emp_15", text: "I understand you are not making a claim for a loss of earning capacity? Is that correct?", isAsked: false },
      { id: "emp_16", text: "At the time of the incident, were you acting as an agent or an employee for any person?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "discovery_responses",
        title: "A. Discovery Responses: FROG 8 Series",
        isSelected: true,
        notes: "",
        questions: [],
        customQuestions: []
      },
      {
        id: "employment_history",
        title: "B. EMPLOYMENT HISTORY",
        isSelected: true,
        notes: "",
        questions: [
          { id: "emp_hist_1", text: "Were you employed at the time of the incident?", isAsked: false },
          { id: "emp_hist_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where? Name of the company and location? Multiple locations?", isAsked: false },
          { id: "emp_hist_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you start working there?", isAsked: false },
          { id: "emp_hist_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Are you currently employed there? If not, ask WHY? WHEN STOPPED?", isAsked: false },
          { id: "emp_hist_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;What was your job title at the time of the incident? Is that your current title? [What was the last day BEFORE the Incident that you worked?", isAsked: false },
          { id: "emp_hist_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many days did you miss from work? How many days of work did you miss? Why? i.e. What days are you claiming you lost income?", isAsked: false },
          { id: "emp_hist_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;At the time of the incident, what was your schedule? M-F? How many hours per day did you work at the time of the incident? What is your current schedule?", isAsked: false },
          { id: "emp_hist_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is the nature of your work? What do you do? Describe it. Duties?", isAsked: false },
          { id: "emp_hist_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Do you sit/stand? Lift items?", isAsked: false },
          { id: "emp_hist_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you return to work following the fall?", isAsked: false },
          { id: "emp_hist_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;How much income are you claiming you lost?", isAsked: false },
          { id: "emp_hist_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;What your monthly income at the time of the incident? How is your monthly income calculated? Hourly? Salary?", isAsked: false },
          { id: "emp_hist_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Back in _____, How do you get paid? Check? Every 2 weeks?", isAsked: false },
          { id: "emp_hist_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;What documents do you have to support your loss of income claim?", isAsked: false },
          { id: "emp_hist_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;Copies of Paystubs? Tax returns? W-2 from 5 years before accident? 2 year before? 1 year before?", isAsked: false },
          { id: "emp_hist_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;Were you placed on Medical Disability? By who? Job remained opened?", isAsked: false },
          { id: "emp_hist_17", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you file disability claim? Collect disability benefits? Collect unemployment benefits?", isAsked: false },
          { id: "emp_hist_18", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any accommodations? Request any from employer? Discuss with your doctor accommodations? Any other position available? Work part time?", isAsked: false },
          { id: "emp_hist_19", text: "&nbsp;&nbsp;&nbsp;&nbsp;What day did you return to work? Did you have to reapply?", isAsked: false },
          { id: "emp_hist_20", text: "&nbsp;&nbsp;&nbsp;&nbsp;Released to full capacity? Any accommodations now?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "current_employment",
        title: "C. CURRENT EMPLOYMENT",
        isSelected: true,
        notes: "",
        questions: [
          { id: "curr_emp_1", text: "Are you currently employed? [IF NOT]", isAsked: false },
          { id: "curr_emp_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;How long have you been Unemployed?", isAsked: false },
          { id: "curr_emp_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Why did you stop working?", isAsked: false },
          { id: "curr_emp_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Have you tried looking for another job? Where? How often? Why not?", isAsked: false },
          { id: "curr_emp_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;What your current monthly income now?", isAsked: false },
          { id: "curr_emp_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;How is your monthly income calculated?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "employment_history_if_needed",
        title: "D. EMPLOYMENT HISTORY (IF NEEDED)",
        isSelected: true,
        notes: "",
        questions: [
          { id: "emp_hist_needed_1", text: "Did you work somewhere BEFORE working at ______.", isAsked: false },
          { id: "emp_hist_needed_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where? Name of the company and location?", isAsked: false },
          { id: "emp_hist_needed_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;When did you start/stop working there?", isAsked: false },
          { id: "emp_hist_needed_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;Why did you leave ______? Quit? Fired? Angry?", isAsked: false },
          { id: "emp_hist_needed_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;What was your job title at the time of the incident?", isAsked: false },
          { id: "emp_hist_needed_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is the nature of your work? What do you do? Duties", isAsked: false },
          { id: "emp_hist_needed_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;What your monthly income at ____ ?", isAsked: false },
          { id: "emp_hist_needed_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;How is your monthly income calculated?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "future_income_loss",
        title: "E. Will you lose income in the future as a result of the INCIDENT?",
        isSelected: true,
        notes: "",
        questions: [
          { id: "future_loss_1", text: "&nbsp;&nbsp;&nbsp;&nbsp;What facts do you base this contention?", isAsked: false },
          { id: "future_loss_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Estimate of the amount?", isAsked: false },
          { id: "future_loss_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Estimate how long you will be unable to work?", isAsked: false },
          { id: "future_loss_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;How the claim future income is calculated?", isAsked: false },
          { id: "future_loss_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;What documents do you have to support your claim?", isAsked: false },
          { id: "future_loss_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;What your current monthly income? How is your monthly income calculated? Hourly? Salary?", isAsked: false },
          { id: "future_loss_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many hours per week to you currently work?", isAsked: false },
          { id: "future_loss_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Since your return to work,", isAsked: false },
          { id: "future_loss_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;In this year _____, have you missed any time from work as a result of your injuries from Simply Fresh? Had to take time off because not feeling well? how many days have you missed work because of your injury? Have you called out sick because in pain? if yes, how many times?", isAsked: false },
          { id: "future_loss_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;What about 2017?", isAsked: false },
          { id: "future_loss_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Go over questions to find out how she is able to work now but not going to be able to work in the future.", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "medications",
    title: "XIII. MEDICATIONS",
    isSelected: true,
    notes: "",
    questions: [
      { id: "meds_1", text: "What medications did you consume as a result of your injuries?", isAsked: false },
      { id: "meds_2", text: "Are you taking any medications now?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "medical_providers",
    title: "XIV. MEDICAL PROVIDERS",
    isSelected: true,
    notes: "",
    questions: [
      { id: "med_1", text: "When did you first see a doctor?", isAsked: false },
      { id: "med_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Next provider – when did you see him?", isAsked: false },
      { id: "med_3", text: "How did you hear about this doctor?", isAsked: false },
      { id: "med_4", text: "How did you know to go to that doctor?", isAsked: false },
      { id: "med_5", text: "Was he recommended to you?", isAsked: false },
      { id: "med_6", text: "For each doctor – how did you learn about the doctor?", isAsked: false },
      { id: "med_7", text: "What treatment did you receive?", isAsked: false },
      { id: "med_8", text: "How long was the initial exam?", isAsked: false },
      { id: "med_9", text: "What did the doctor say?", isAsked: false },
      { id: "med_10", text: "English/spanish? translator? Did you pay for the visit?", isAsked: false },
      { id: "med_11", text: "Did anyone ever explain how much the treatment would cost?", isAsked: false },
      { id: "med_12", text: "Do you know the total amount that is owed to medical provider ____?", isAsked: false },
      { id: "med_13", text: "Did you sign any paperwork like a lien? Did Medi-Cal pay for any treatment?", isAsked: false },
      { id: "med_14", text: "Did you have future appointments? Who set them up?", isAsked: false },
      { id: "med_15", text: "Where you prescribed pain mediation? What was it? Still taking? How often?", isAsked: false },
      { id: "med_16", text: "Remember your last visit?", isAsked: false },
      { id: "med_17", text: "Why did you stop seeing that medical provider?", isAsked: false },
      { id: "med_18", text: "What did the doctor tell you at the last visit?", isAsked: false },
      { id: "med_19", text: "For Chiro – go through the questions re treatment?", isAsked: false },
      { id: "med_20", text: "For x-ray/MRI – did anyone go over the results? Seen the films?", isAsked: false },
      { id: "med_21", text: "Type of treatment", isAsked: false },
      { id: "med_22", text: "Dates of treatment", isAsked: false },
      { id: "med_23", text: "Extent of examination", isAsked: false },
      { id: "med_24", text: "Diagnosis", isAsked: false },
      { id: "med_25", text: "Treatment", isAsked: false },
      { id: "med_26", text: "Prognosis", isAsked: false },
      { id: "med_27", text: "Was this healthcare provider recommended by your attorney?", isAsked: false },
      { id: "med_28", text: "Are you currently seeing this healthcare provider", isAsked: false },
      { id: "med_29", text: "Will you this healthcare provider in the future?", isAsked: false },
      { id: "med_30", text: "Any other treating doctors for your Injuries from this incident?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "discovery_responses",
        title: "A. Discovery Responses: 6 Series",
        isSelected: true,
        notes: "",
        questions: [],
        customQuestions: []
      }
    ]
  },
  {
    id: "total_medical_damages",
    title: "XV. TOTAL MEDICAL DAMAGES TO DATE",
    isSelected: true,
    notes: "",
    questions: [
      { id: "damages_1", text: "What is the total amount of your medical billing?", isAsked: false },
      { id: "damages_2", text: "Who pays the bills?", isAsked: false },
      { id: "damages_3", text: "Do you treat for free?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "current_condition",
    title: "XVI. CURRENT CONDITION and Medical Treatment",
    isSelected: true,
    notes: "",
    questions: [
      { id: "curr_1", text: "What current pain or complaints do you still have?", isAsked: false },
      { id: "curr_2", text: "Do you still have pain or discomfort that interferes with your regular activities?", isAsked: false },
      { id: "curr_3", text: "What part of your body? What is the pain?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "current_complaints",
        title: "A. Current complaints (based on FROGS 6 series)",
        isSelected: true,
        notes: "",
        questions: [
          { id: "complaints_1", text: "Where? What kind? Describe?", isAsked: false },
          { id: "complaints_2", text: "How often does the pain in _____ occur?", isAsked: false },
          { id: "complaints_3", text: "Is there any activity that makes the pain worse?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "current_medical_treatment",
        title: "B. Current Medical Treatment",
        isSelected: true,
        notes: "",
        questions: [
          { id: "curr_med_1", text: "Are you still receiving medical treatment?", isAsked: false },
          { id: "curr_med_2", text: "When was the last time you saw a health care provider for the injuries at issue in this litigation?", isAsked: false },
          { id: "curr_med_3", text: "Why did you stop treating?", isAsked: false },
          { id: "curr_med_4", text: "Any home exercises?", isAsked: false },
          { id: "curr_med_5", text: "Physical therapy?", isAsked: false },
          { id: "curr_med_6", text: "Do you have a primary physician?", isAsked: false },
          { id: "curr_med_7", text: "Since the day of the incident, have you complained about your injuries to your [go through each]__________________ to your primary physician? Who is that? When was the last time you saw your primary physician for complaints of ________?", isAsked: false },
          { id: "curr_med_8", text: "Are you currently taking medications for your injuries?", isAsked: false },
          { id: "curr_med_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;what?", isAsked: false },
          { id: "curr_med_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;how often?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "property_damage",
    title: "XVII. PROPERTY DAMAGE",
    isSelected: true,
    notes: "",
    questions: [
      { id: "prop_1", text: "Has the property damage claim resolved?", isAsked: false },
      { id: "prop_2", text: "I understand you are NOT making a claim for property damage? Is that correct? In other words, none of you personal property (like a cell phone, or glasses) was damaged?", isAsked: false },
      { id: "prop_3", text: "And immediately after the collision, did you take photographs of the incident?", isAsked: false },
      { id: "prop_4", text: "Did you take pictures of the other vehicle?", isAsked: false },
      { id: "prop_5", text: "And the photographs were taken at the vehicles resting points?", isAsked: false },
      { id: "prop_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did anyone move their vehicle before the photographs were taken?", isAsked: false },
      { id: "prop_7", text: "Were you able to drive your vehicle?", isAsked: false },
      { id: "prop_8", text: "Did you move your vehicle immediately after the incident?", isAsked: false },
      { id: "prop_9", text: "Where was the damage to the your vehicle?", isAsked: false },
      { id: "prop_10", text: "How would you describe the damage to the vehicles?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "future_treatment",
    title: "XVIII. FUTURE TREATMENT",
    isSelected: true,
    notes: "",
    questions: [
      { id: "fut_1", text: "Have you been told by any doctor that you will require future treatment for the injuries you sustained as a result of this incident?", isAsked: false },
      { id: "fut_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;What is it?", isAsked: false },
      { id: "fut_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Describe?", isAsked: false },
      { id: "fut_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;What's your understanding of the treatment you may require?", isAsked: false },
      { id: "fut_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;Who?", isAsked: false },
      { id: "fut_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;What?", isAsked: false },
      { id: "fut_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;How long?", isAsked: false },
      { id: "fut_8", text: "Have you been advised you need surgery??", isAsked: false },
      { id: "fut_9", text: "If injections - what part of your body?", isAsked: false },
      { id: "fut_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many?", isAsked: false },
      { id: "fut_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Explained process?", isAsked: false },
      { id: "fut_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;Anesthesia?", isAsked: false },
      { id: "fut_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Told cost?", isAsked: false }
    ],
    customQuestions: [],
    subsections: [
      {
        id: "discovery_responses_future",
        title: "A. Discovery Responses: 6.7",
        isSelected: true,
        notes: "",
        questions: [],
        customQuestions: []
      }
    ]
  },
  {
    id: "activities",
    title: "XIX. ACTIVITIES",
    isSelected: true,
    notes: "",
    questions: [
      { id: "act_1", text: "What activities were you involved in before? How often - When? Now??", isAsked: false },
      { id: "act_2", text: "Activities: Hobbies/Sports What activities? Dance? Theme parks? Disneyland? Knotts? Hiking? Running?", isAsked: false },
      { id: "act_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;What? How much do you spend? How often before? When?", isAsked: false },
      { id: "act_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;What exercise? Gym? Weight then and now?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "services",
    title: "XX. SERVICES",
    isSelected: true,
    notes: "",
    questions: [
      { id: "serv_1", text: "Household Service: Have you incurred any costs associated with any household services?", isAsked: false },
      { id: "serv_2", text: "Have you had to hire someone to perform any work (like chores) at the house because you are unable to perform them due to your injuries?", isAsked: false },
      { id: "serv_3", text: "Who did you these activities with?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "video_surveillance",
    title: "XXI. VIDEO SURVEILLANCE",
    isSelected: true,
    notes: "",
    questions: [
      { id: "video_1", text: "Have you ever see any video surveillance of the incident?", isAsked: false },
      { id: "video_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;Like you reviewed any footage?", isAsked: false },
      { id: "video_3", text: "Did anyone tell you there was video surveillance?", isAsked: false },
      { id: "video_4", text: "Do you know if there were any camera footage of the incident?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "subsequent_history",
    title: "XXII. SUBSEQUENT HISTORY",
    isSelected: true,
    notes: "",
    questions: [],
    customQuestions: [],
    subsections: [
      {
        id: "accidents",
        title: "A. Accidents",
        isSelected: true,
        notes: "",
        questions: [
          { id: "sub_acc_1", text: "Have you been involved in any accident or suffered any other injury since this incident?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "travel",
        title: "B. Travel",
        isSelected: true,
        notes: "",
        questions: [
          { id: "sub_travel_1", text: "Have you been outside the state of California since the day of the incident? Where? Why?", isAsked: false },
          { id: "sub_travel_2", text: "&nbsp;&nbsp;&nbsp;&nbsp;How many times? how did you get there? Drive? Plane? Alone? Family?", isAsked: false },
          { id: "sub_travel_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you see any medical providers while you were there?", isAsked: false }
        ],
        customQuestions: []
      },
      {
        id: "subsequent_workers_comp",
        title: "C. Subsequent Worker's Compensation Claims",
        isSelected: true,
        notes: "",
        questions: [
          { id: "sub_wc_1", text: "Have you filed a workers compensation claim?", isAsked: false }
        ],
        customQuestions: []
      }
    ]
  },
  {
    id: "discovery",
    title: "XXIII. DISCOVERY",
    isSelected: true,
    notes: "",
    questions: [
      { id: "disc_1", text: "I would like to present you with _______. Not attaching as an exhibit at this time.", isAsked: false },
      { id: "disc_2", text: "Have you seen this document? These are your responses to written discovery.", isAsked: false },
      { id: "disc_3", text: "Did you work with your attorney to provide responses to said written discovery?", isAsked: false },
      { id: "disc_4", text: "Did you use an interpreter? How were the questions conveyed to you?", isAsked: false },
      { id: "disc_5", text: "Is that your signature on the verification, which acknowledged under penalty of perjury your responses to said written discovery?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "damages",
    title: "XXIV. DAMAGES",
    isSelected: true,
    notes: "",
    questions: [
      { id: "dam_1", text: "Do you have any out of pocket medical expenses due to injuries?", isAsked: false },
      { id: "dam_2", text: "How much?", isAsked: false },
      { id: "dam_3", text: "To whom?", isAsked: false },
      { id: "dam_4", text: "Do you receive medical bills from any providers?", isAsked: false },
      { id: "dam_5", text: "Have you confirmed amounts due?", isAsked: false },
      { id: "dam_6", text: "Are you paying the amounts currently?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "attorney_referral",
    title: "XXV. ATTORNEY REFERRAL QUESTIONS",
    isSelected: true,
    notes: "",
    questions: [
      { id: "att_1", text: "When did you first think about bringing a lawsuit?", isAsked: false },
      { id: "att_2", text: "How did you know to file a lawsuit?", isAsked: false },
      { id: "att_3", text: "Did you talk with anyone about filing a lawsuit?", isAsked: false },
      { id: "att_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;When?", isAsked: false },
      { id: "att_5", text: "Have you ever been represented by any other attorney with regard to this subject matter of this lawsuit?", isAsked: false },
      { id: "att_6", text: "&nbsp;&nbsp;&nbsp;&nbsp;Who?", isAsked: false },
      { id: "att_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;When?", isAsked: false },
      { id: "att_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Why not retained?", isAsked: false },
      { id: "att_9", text: "When did you first consult an attorney about your claim for injuries", isAsked: false },
      { id: "att_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;(I don't want to know what the conversation was, just the date)", isAsked: false },
      { id: "att_11", text: "Why did you to contact an attorney about your claim?", isAsked: false },
      { id: "att_12", text: "How did you find your attorney?", isAsked: false },
      { id: "att_13", text: "What made you decide to file this lawsuit?", isAsked: false },
      { id: "att_14", text: "NOTE: IF PRIOR ATTORNEY - Why did he stop representing you?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "felony_military",
    title: "XXVI. FELONY/MILITARY",
    isSelected: true,
    notes: "",
    questions: [
      { id: "fel_1", text: "I have to ask this at every deposition - Have you ever been convicted of a felony?", isAsked: false },
      { id: "fel_2", text: "If so, city/state of conviction?", isAsked: false },
      { id: "fel_3", text: "&nbsp;&nbsp;&nbsp;&nbsp;Date of conviction?", isAsked: false },
      { id: "fel_4", text: "&nbsp;&nbsp;&nbsp;&nbsp;The offense?", isAsked: false },
      { id: "fel_5", text: "&nbsp;&nbsp;&nbsp;&nbsp;The court and case number?", isAsked: false },
      { id: "fel_6", text: "Have you ever served in any military?", isAsked: false },
      { id: "fel_7", text: "&nbsp;&nbsp;&nbsp;&nbsp;Branch of military", isAsked: false },
      { id: "fel_8", text: "&nbsp;&nbsp;&nbsp;&nbsp;Dates of Service", isAsked: false },
      { id: "fel_9", text: "&nbsp;&nbsp;&nbsp;&nbsp;Discharged?", isAsked: false },
      { id: "fel_10", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any disciplinary actions?", isAsked: false },
      { id: "fel_11", text: "&nbsp;&nbsp;&nbsp;&nbsp;Highest rank?", isAsked: false },
      { id: "fel_12", text: "&nbsp;&nbsp;&nbsp;&nbsp;Where stationed?", isAsked: false },
      { id: "fel_13", text: "&nbsp;&nbsp;&nbsp;&nbsp;Any service related health problems or disabilities?", isAsked: false },
      { id: "fel_14", text: "&nbsp;&nbsp;&nbsp;&nbsp;Did you receive any military pension or disability pay?", isAsked: false },
      { id: "fel_15", text: "&nbsp;&nbsp;&nbsp;&nbsp;how long does he plan to stay in military?", isAsked: false },
      { id: "fel_16", text: "&nbsp;&nbsp;&nbsp;&nbsp;what was his score on the ASVAB?", isAsked: false }
    ],
    customQuestions: []
  },
  {
    id: "stipulation",
    title: "XXVII. STIPULATION",
    isSelected: true,
    notes: "",
    questions: [
      { id: "stip_1", text: "Per Code", isAsked: false },
      { id: "stip_2", text: "At this point, we should enter a stipulation:", isAsked: false },
      { id: "stip_3", text: "I propose we relieve the court reporter of her duties under the California Code of Civil Procedure", isAsked: false },
      { id: "stip_4", text: "The original transcript will be forwarded directly to my office and my office will forward it to plaintiff's counsel to provide it to his client for his review.", isAsked: false },
      { id: "stip_5", text: "Plaintiff will have 21 days from the date plaintiff's counsel receives the transcript and forwards it to Plaintiff to review the transcript, make any changes he deems necessary, sign the transcript, and forward the transcript to his counsel who will then forward it to the attention of Attorney Thomas St. Germain at the Walsworth law firm.", isAsked: false },
      { id: "stip_6", text: "Plaintiff will advise his counsel who will, in turn, advise my office of any changes in the transcript", isAsked: false },
      { id: "stip_7", text: "My office, will retain the original transcript and will make it available for use by any party at the time of trial", isAsked: false },
      { id: "stip_8", text: "In the event that the original is lost, or that Plaintiff does not notify us of any changes or provide his signature, then a CERTIFIED COPY may be used as though it were a FULL SIGNED ORIGINAL.", isAsked: false },
      { id: "stip_9", text: "So stipulated.", isAsked: false }
    ],
    customQuestions: []
  }
];

// Also export as JSON for webpack optimization
export const depositionOutlineDataJson = JSON.stringify({ sections: depositionOutlineData });