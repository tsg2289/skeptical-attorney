"use client";
import React, { createContext, useContext, ReactNode } from 'react';

interface Matter {
  id: string;
  case_name: string;
  case_number: string;
  description?: string;
  created_at: string;
  archived?: boolean;
  archived_at?: string;
}

interface Deposition {
  id: string;
  title: string;
  deponent_name: string;
  deponent_role: string;
  deposition_date: string;
  taking_attorney: string;
  defending_attorney: string;
  court_reporter: string;
  matter_id: string;
  created_at: string;
}

interface DepositionSection {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    text: string;
    isAsked: boolean;
    isFlagged: boolean;
  }>;
  customQuestions: Array<{
    id: string;
    text: string;
    isAsked: boolean;
    isFlagged: boolean;
  }>;
  subsections: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      text: string;
      isAsked: boolean;
      isFlagged: boolean;
    }>;
    customQuestions: Array<{
      id: string;
      text: string;
      isAsked: boolean;
      isFlagged: boolean;
    }>;
  }>;
}

// Mock data for development
const mockMatters: Matter[] = [
  {
    id: 'dev-matter-1',
    case_name: 'Smith vs. Johnson',
    case_number: 'CV-2024-001',
    description: 'Personal injury case',
    created_at: '2024-01-15T10:00:00Z',
    archived: false
  },
  {
    id: 'dev-matter-2',
    case_name: 'Doe vs. Corporation',
    case_number: 'CV-2024-002',
    description: 'Employment dispute',
    created_at: '2024-02-01T14:30:00Z',
    archived: false
  },
  {
    id: 'dev-matter-3',
    case_name: 'Brown vs. Insurance Co.',
    case_number: 'CV-2023-045',
    description: 'Insurance claim dispute - settled',
    created_at: '2023-11-20T09:15:00Z',
    archived: true,
    archived_at: '2024-01-10T16:30:00Z'
  },
  {
    id: 'dev-matter-4',
    case_name: 'Wilson vs. City',
    case_number: 'CV-2023-078',
    description: 'Civil rights case - dismissed',
    created_at: '2023-08-15T14:20:00Z',
    archived: true,
    archived_at: '2023-12-05T11:45:00Z'
  }
];

const mockDepositions: Record<string, Deposition[]> = {
  'dev-matter-1': [
    {
      id: 'dev-depo-1',
      title: 'Deposition of John Smith',
      deponent_name: 'John Smith',
      deponent_role: 'Plaintiff',
      deposition_date: '2024-02-15',
      taking_attorney: 'Sarah Wilson',
      defending_attorney: 'Michael Davis',
      court_reporter: 'Jennifer Lee',
      matter_id: 'dev-matter-1',
      created_at: '2024-01-30T11:00:00Z'
    }
  ],
  'dev-matter-2': [
    {
      id: 'dev-depo-2',
      title: 'Deposition of Jane Doe',
      deponent_name: 'Jane Doe',
      deponent_role: 'Defendant',
      deposition_date: '2024-03-01',
      taking_attorney: 'David Thompson',
      defending_attorney: 'Emily Rodriguez',
      court_reporter: 'Mark Johnson',
      matter_id: 'dev-matter-2',
      created_at: '2024-02-05T13:00:00Z'
    }
  ]
};

const mockDepositionDetails = {
  'dev-depo-1': {
    id: 'dev-depo-1',
    deponent_name: 'John Smith',
    deponent_role: 'Plaintiff',
    deposition_date: '2024-02-15',
    taking_attorney: 'Sarah Wilson',
    defending_attorney: 'Michael Davis',
    court_reporter: 'Jennifer Lee',
    matter_id: 'dev-matter-1',
    created_at: '2024-01-30T11:00:00Z'
  },
  'dev-depo-2': {
    id: 'dev-depo-2',
    deponent_name: 'Jane Doe',
    deponent_role: 'Defendant',
    deposition_date: '2024-03-01',
    taking_attorney: 'David Thompson',
    defending_attorney: 'Emily Rodriguez',
    court_reporter: 'Mark Johnson',
    matter_id: 'dev-matter-2',
    created_at: '2024-02-05T13:00:00Z'
  }
};

const mockDepositionProgress: Record<string, DepositionSection[]> = {
  'dev-depo-1': [
    {
      id: 'intro',
      title: 'Introduction and Background',
      questions: [
        { id: 'q1', text: 'Please state your full name for the record.', isAsked: false, isFlagged: false },
        { id: 'q2', text: 'What is your current address?', isAsked: false, isFlagged: false }
      ],
      customQuestions: [],
      subsections: []
    }
  ]
};

interface DevDataContextType {
  getMatters: () => Promise<Matter[]>;
  getDepositions: (matterId: string) => Promise<Deposition[]>;
  getDeposition: (depositionId: string) => Promise<Deposition | null>;
  getMatter: (matterId: string) => Promise<Matter | null>;
  getDepositionProgress: (depositionId: string) => Promise<DepositionSection[]>;
  addMatter: (matter: Matter) => void;
  addDeposition: (deposition: Deposition) => void;
  addDepositionQuestions: (depositionId: string, questions: any[]) => void;
}

const DevDataContext = createContext<DevDataContextType | undefined>(undefined);

export const useDevData = () => {
  const context = useContext(DevDataContext);
  if (!context) {
    throw new Error('useDevData must be used within a DevDataProvider');
  }
  return context;
}

// LocalStorage keys
const STORAGE_KEY_MATTERS = 'demo_matters';
const STORAGE_KEY_DEPOSITIONS = 'demo_depositions';
const STORAGE_KEY_QUESTIONS = 'demo_deposition_questions';

// Helper functions for localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
};

export const DevDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getMatters = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const stored = loadFromStorage<Matter[]>(STORAGE_KEY_MATTERS, []);
    // Merge with default mock matters (don't duplicate)
    const defaultIds = new Set(mockMatters.map(m => m.id));
    const customMatters = stored.filter(m => !defaultIds.has(m.id));
    return [...mockMatters, ...customMatters];
  };

  const getDepositions = async (matterId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const stored = loadFromStorage<Record<string, Deposition[]>>(STORAGE_KEY_DEPOSITIONS, {});
    const allDepositions = { ...mockDepositions, ...stored };
    return allDepositions[matterId] || [];
  };

  const getDeposition = async (depositionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const stored = loadFromStorage<Record<string, Deposition>>(STORAGE_KEY_DEPOSITIONS + '_details', {});
    const allDetails = { ...mockDepositionDetails, ...stored } as unknown as Record<string, Deposition>;
    return allDetails[depositionId] || null;
  };

  const getMatter = async (matterId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const stored = loadFromStorage<Matter[]>(STORAGE_KEY_MATTERS, []);
    const allMatters = [...mockMatters, ...stored];
    return allMatters.find(m => m.id === matterId) || null;
  };

  const getDepositionProgress = async (depositionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const stored = loadFromStorage<Record<string, DepositionSection[]>>(STORAGE_KEY_QUESTIONS, {});
    const allProgress = { ...mockDepositionProgress, ...stored };
    return allProgress[depositionId] || [];
  };

  // Add methods to save data
  const addMatter = (matter: Matter) => {
    const stored = loadFromStorage<Matter[]>(STORAGE_KEY_MATTERS, []);
    stored.push(matter);
    saveToStorage(STORAGE_KEY_MATTERS, stored);
  };

  const addDeposition = (deposition: Deposition) => {
    const stored = loadFromStorage<Record<string, Deposition[]>>(STORAGE_KEY_DEPOSITIONS, {});
    const details = loadFromStorage<Record<string, Deposition>>(STORAGE_KEY_DEPOSITIONS + '_details', {});
    
    if (!stored[deposition.matter_id]) {
      stored[deposition.matter_id] = [];
    }
    stored[deposition.matter_id].push(deposition);
    details[deposition.id] = deposition;
    
    saveToStorage(STORAGE_KEY_DEPOSITIONS, stored);
    saveToStorage(STORAGE_KEY_DEPOSITIONS + '_details', details);
  };

  const addDepositionQuestions = (depositionId: string, questions: any[]) => {
    const stored = loadFromStorage<Record<string, DepositionSection[]>>(STORAGE_KEY_QUESTIONS, {});
    
    // Convert questions array to sections format
    const sections: DepositionSection[] = [];
    const byCategory: Record<string, any[]> = {};
    
    questions.forEach(q => {
      if (!byCategory[q.category]) {
        byCategory[q.category] = [];
      }
      byCategory[q.category].push(q);
    });
    
    Object.entries(byCategory).forEach(([category, catQuestions], idx) => {
      sections.push({
        id: category.toLowerCase().replace(/\s+/g, '_'),
        title: category,
        questions: catQuestions.map((q, qIdx) => ({
          id: `q_${idx}_${qIdx}`,
          text: q.text,
          isAsked: q.is_asked || false,
          isFlagged: false
        })),
        customQuestions: [],
        subsections: []
      });
    });
    
    stored[depositionId] = sections;
    saveToStorage(STORAGE_KEY_QUESTIONS, stored);
  };

  const value = {
    getMatters,
    getDepositions,
    getDeposition,
    getMatter,
    getDepositionProgress,
    addMatter,
    addDeposition,
    addDepositionQuestions
  };

  return (
    <DevDataContext.Provider value={value}>
      {children}
    </DevDataContext.Provider>
  );
};

