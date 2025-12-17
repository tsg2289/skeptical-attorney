'use client'
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseCaseStorage } from '@/lib/supabase/caseStorage';
import { createClient } from '@/lib/supabase/client';

interface BillingEntry {
  id?: number;
  case: string;
  entry: string;
  hours: number;
  date?: string;
  group?: number | null;
  originalIndex?: number;
}

interface Description {
  id: number;
  text: string;
  case: string;
}

interface BillingGeneratorProps {
  caseId?: string | null;
  isTrialMode?: boolean;
}

export default function BillingGenerator({ caseId: propCaseId, isTrialMode = false }: BillingGeneratorProps) {
  const searchParams = useSearchParams();
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(propCaseId || null);
  const [caseName, setCaseName] = useState('');
  const [description, setDescription] = useState('');
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingHours, setEditingHours] = useState(false);
  const [editingHoursValue, setEditingHoursValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [wordFlags, setWordFlags] = useState<any[]>([]);
  const [showWordFlags, setShowWordFlags] = useState(false);
  const [collapsedCases, setCollapsedCases] = useState(new Set());
  const [draggedCase, setDraggedCase] = useState<string | null>(null);
  const [dragOverCase, setDragOverCase] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<number | null>(null);
  const [dragOverEntry, setDragOverEntry] = useState<number | null>(null);
  const [editingCaseName, setEditingCaseName] = useState<string | null>(null);
  const [editingCaseNameValue, setEditingCaseNameValue] = useState('');
  const [theme, setTheme] = useState('light');
  const [aiEnhancing, setAiEnhancing] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [previewSuggestion, setPreviewSuggestion] = useState<any>(null);
  const [userPreferences] = useState({
    preferredStyle: 'comprehensive',
    legalFocus: 'general', 
    hourPreference: 'moderate'
  });
  const [addingEntryToCase, setAddingEntryToCase] = useState<string | null>(null);
  const [newEntryText, setNewEntryText] = useState('');
  const [caseEntryLoading, setCaseEntryLoading] = useState(false);
  const [caseEntryTemplates, setCaseEntryTemplates] = useState(false);
  const [groups, setGroups] = useState<Record<string, Array<{ id: number; title: string; order: number }>>>({});
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');
  const [draggedGroup, setDraggedGroup] = useState<number | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null);
  const [draggedGroupCase, setDraggedGroupCase] = useState<string | null>(null);

  // Populate case data from caseId if provided
  useEffect(() => {
    const loadCase = async () => {
      const caseId = propCaseId || searchParams?.get('caseId');
      if (caseId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const foundCase = await supabaseCaseStorage.getCase(caseId);
          if (foundCase) {
            setCurrentCaseId(caseId);
            console.log(`[AUDIT] Billing Generator initialized for case: ${caseId}`);
            if (foundCase.caseName) {
              setCaseName(foundCase.caseName);
            }
          }
        }
      }
    };
    
    loadCase();
  }, [propCaseId, searchParams]);
  const [dragOverEntryGroup, setDragOverEntryGroup] = useState<number | string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('billing-app-theme') || 'light';
    setTheme(savedTheme);
  }, []);

  // Apply theme to document and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('billing-app-theme', theme);
  }, [theme]);

  // Ensure editingText is properly synchronized when switching from hours to text editing
  useEffect(() => {
    if (editingIndex !== null && !editingHours && editingText === '') {
      const currentEntry = entries[editingIndex];
      if (currentEntry?.entry) {
        const textWithoutHours = removeHoursFromText(currentEntry.entry);
        setEditingText(textWithoutHours);
      }
    }
  }, [editingIndex, editingHours, editingText, entries]);


  // Check for flagged words when description changes
  useEffect(() => {
    if (description.trim().length > 3) {
      checkWordFlags(description);
    } else {
      setWordFlags([]);
    }
  }, [description]);


  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        // Load full template data for each template
        const fullTemplates = await Promise.all(
          data.templates.map(async (template: any) => {
            try {
              const templateResponse = await fetch(`/api/templates/${template.id}`);
              const templateData = await templateResponse.json();
              return templateData.success ? templateData.template : template;
            } catch (error) {
              console.error(`Error loading template ${template.id}:`, error);
              return template;
            }
          })
        );
        setTemplates(fullTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };


  const handleTemplateSelect = (template: any) => {
    // Create a billing entry directly from the template
    const hours = parseFloat(template.time) || 0;
    const entryText = `${template.time}: ${template.description}`;
    
    const newEntry = {
      case: caseName || 'New Case',
      entry: entryText,
      hours: hours
    };
    
    setEntries(prev => [...prev, newEntry]);
    setDescription('');
    setShowTemplates(false);
  };

  const checkWordFlags = async (text: string) => {
    try {
      const response = await fetch('/api/check-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      if (data.success) {
        setWordFlags(data.flags);
        setShowWordFlags(data.flags.length > 0);
      }
    } catch (error) {
      console.error('Error checking word flags:', error);
    }
  };

  const replaceWord = async (flaggedWord: string, replacement: string) => {
    try {
      const response = await fetch('/api/replace-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: description, 
          flaggedWord, 
          replacement 
        })
      });
      const data = await response.json();
      if (data.success) {
        setDescription(data.newText);
      }
    } catch (error) {
      console.error('Error replacing word:', error);
    }
  };


  // Function to extract hours from billing entry text
  const extractHours = (entryText: string) => {
    // Since AI no longer generates time estimates, return 0
    // Users will need to manually set hours
    return 0;
  };

  // Function to remove hours prefix from text for display/editing
  const removeHoursFromText = (entryText: string) => {
    // Since AI no longer generates time estimates, return text as-is
    return entryText;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (descriptions.length === 0) {
        alert('Please add some descriptions before generating AI content.');
        setLoading(false);
        return;
      }

      // Process each description
      const newEntries: BillingEntry[] = [];
      
      for (let i = 0; i < descriptions.length; i++) {
        const desc = descriptions[i];
        
    try {
      const response = await fetch('/api/generateBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
              caseName: desc.case,
              description: desc.text
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
            throw new Error(errorData.message || 'AI generation failed');
          }

          const data = await response.json();
          const generatedText = data.result?.trim() || '⚠️ No response generated';
          const hours = extractHours(generatedText);

          // Create new entry with AI-generated content
          newEntries.push({
            id: Date.now() + i,
            case: desc.case,
            entry: generatedText,
            hours: hours,
            date: new Date().toISOString().split('T')[0]
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error generating entry ${i + 1}:`, errorMessage);
          // Add error entry
          newEntries.push({
            id: Date.now() + i,
            case: desc.case,
            entry: `❌ AI generation failed: ${errorMessage}`,
            hours: 0,
            date: new Date().toISOString().split('T')[0]
          });
        }
      }

      // Add all new entries to the existing entries
      setEntries(prev => [...prev, ...newEntries]);
      
      // Clear descriptions after successful generation
      setDescriptions([]);
      setDescription(''); // Clear the description field

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Billing generation error:', errorMessage);
      alert(`Error: ${errorMessage}`);
    }
    setLoading(false);
  };

  const handleReset = () => setEntries([]);

  const handleManualEntry = () => {
    const newEntry = {
      case: caseName || 'New Case',
      entry: '',
      hours: 0
    };
    setEntries([...entries, newEntry]);
    
    // Start editing the new entry immediately
    const newIndex = entries.length;
    setEditingIndex(newIndex);
    setEditingText('');
    setEditingHours(false);
  };

  const handleAddEntry = () => {
    if (description.trim() && caseName.trim()) {
      const newDescription = {
        id: Date.now(),
        text: description.trim(),
        case: caseName.trim()
      };
      
      setDescriptions(prev => [...prev, newDescription]);
      
      // Clear the form for next entry
      setDescription('');
      
      // Show success message
      console.log('Description added successfully');
    } else {
      alert('Please fill in both case name and description before adding an entry.');
    }
  };

  // Case-level entry functions
  const handleAddEntryToCase = (caseName: string) => {
    if (newEntryText.trim()) {
      const newEntry = {
        id: Date.now(),
        case: caseName,
        group: null, // Always start as ungrouped (staging area)
        entry: newEntryText.trim(),
        hours: 0,
        date: new Date().toISOString().split('T')[0]
      };
      
      setEntries(prev => [...prev, newEntry]);
      setNewEntryText('');
      setAddingEntryToCase(null);
      
      console.log('Entry added to staging area:', caseName);
    } else {
      alert('Please enter a description for the new entry.');
    }
  };

  const handleAIGenerateForCase = async (caseName: string) => {
    if (!newEntryText.trim()) {
      alert('Please enter a description before generating AI content.');
      return;
    }

    setCaseEntryLoading(true);
    try {
      const response = await fetch('/api/generateBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          caseName: caseName,
          description: newEntryText.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI generation failed');
      }

      const data = await response.json();
      const generatedText = data.result?.trim() || '⚠️ No response generated';
      const hours = extractHours(generatedText);

            const newEntry = {
              id: Date.now(),
              case: caseName,
              group: null, // Always start as ungrouped (staging area)
              entry: generatedText,
              hours: hours,
              date: new Date().toISOString().split('T')[0]
            };
            
            setEntries(prev => [...prev, newEntry]);
            setNewEntryText('');
            setAddingEntryToCase(null);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('AI generation error for case:', errorMessage);
      alert(`Error: ${errorMessage}`);
    }
    setCaseEntryLoading(false);
  };

  const handleManualEntryForCase = (caseName: string) => {
    const newEntry = {
      id: Date.now(),
      case: caseName,
      group: null, // Always start as ungrouped (staging area)
      entry: '',
      hours: 0,
      date: new Date().toISOString().split('T')[0]
    };
    
    setEntries(prev => [...prev, newEntry]);
    setAddingEntryToCase(null);
    
    // Start editing the new entry immediately
    const newIndex = entries.length;
    setEditingIndex(newIndex);
    setEditingText('');
    setEditingHours(false);
  };

  const startAddingEntryToCase = (caseName: string) => {
    setAddingEntryToCase(caseName);
    setNewEntryText('');
  };

  const cancelAddingEntryToCase = () => {
    setAddingEntryToCase(null);
    setNewEntryText('');
    setCaseEntryTemplates(false);
  };

  // Group management functions
  const createGroup = (caseName: string) => {
    const groupId = Date.now();
    const currentGroups = groups[caseName] || [];
    const newGroup = {
      id: groupId,
      title: 'New Group',
      order: currentGroups.length
    };
    
    setGroups(prev => ({
      ...prev,
      [caseName]: [...currentGroups, newGroup]
    }));
    
    // Start editing the group title immediately
    setEditingGroup(groupId);
    setEditingGroupTitle('New Group');
  };

  const renameGroup = (caseName: string, groupId: number, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    setGroups(prev => ({
      ...prev,
      [caseName]: prev[caseName]?.map(group => 
        group.id === groupId ? { ...group, title: newTitle.trim() } : group
      ) || []
    }));
    
    setEditingGroup(null);
    setEditingGroupTitle('');
  };

  const deleteGroup = (caseName: string, groupId: number) => {
    // Move all entries from this group to ungrouped
    setEntries(prev => prev.map(entry => 
      entry.case === caseName && entry.group === groupId 
        ? { ...entry, group: null }
        : entry
    ));
    
    // Remove the group
    setGroups(prev => ({
      ...prev,
      [caseName]: prev[caseName]?.filter(group => group.id !== groupId) || []
    }));
  };

  const moveEntryToGroup = (entryId: number, targetGroupId: number) => {
    setEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, group: targetGroupId } : entry
    ));
  };

  const removeEntryFromGroup = (entryId: number) => {
    setEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, group: null } : entry
    ));
  };

  const startEditingGroup = (groupId: number, currentTitle: string) => {
    setEditingGroup(groupId);
    setEditingGroupTitle(currentTitle);
  };

  const cancelEditingGroup = () => {
    setEditingGroup(null);
    setEditingGroupTitle('');
  };

  // Group drag and drop functions
  const handleGroupDragStart = (e: React.DragEvent, groupId: number, caseName: string) => {
    setDraggedGroup(groupId);
    setDraggedGroupCase(caseName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(groupId);
  };

  const handleGroupDragLeave = () => {
    setDragOverGroup(null);
  };

  const handleGroupDrop = (e: React.DragEvent, targetGroupId: number, caseName: string) => {
    e.preventDefault();
    if (draggedGroup && draggedGroup !== targetGroupId && draggedGroupCase === caseName) {
      reorderGroups(caseName, draggedGroup, targetGroupId);
    }
    setDraggedGroup(null);
    setDragOverGroup(null);
    setDraggedGroupCase(null);
  };

  const handleGroupDragEnd = () => {
    setDraggedGroup(null);
    setDragOverGroup(null);
    setDraggedGroupCase(null);
  };

  // Entry-to-group drag and drop functions
  const handleEntryDragOverGroup = (e: React.DragEvent, groupId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEntryGroup(groupId);
  };

  const handleEntryDragLeaveGroup = () => {
    setDragOverEntryGroup(null);
  };

  const handleEntryDropOnGroup = (e: React.DragEvent, groupId: number, caseName: string) => {
    e.preventDefault();
    if (draggedEntry !== null) {
      const entry = entries[draggedEntry];
      if (entry && entry.case === caseName && entry.id !== undefined) {
        moveEntryToGroup(entry.id, groupId);
      }
    }
    setDragOverEntryGroup(null);
  };

  const handleEntryDropOnUngrouped = (e: React.DragEvent, caseName: string) => {
    e.preventDefault();
    if (draggedEntry !== null) {
      const entry = entries[draggedEntry];
      if (entry && entry.case === caseName && entry.id !== undefined) {
        removeEntryFromGroup(entry.id);
      }
    }
    setDragOverEntryGroup(null);
  };

  const reorderGroups = (caseName: string, draggedGroupId: number, targetGroupId: number) => {
    setGroups(prev => {
      const caseGroups = prev[caseName] || [];
      const draggedIndex = caseGroups.findIndex(group => group.id === draggedGroupId);
      const targetIndex = caseGroups.findIndex(group => group.id === targetGroupId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const newGroups = [...caseGroups];
      const [draggedGroup] = newGroups.splice(draggedIndex, 1);
      newGroups.splice(targetIndex, 0, draggedGroup);
      
      // Update order values
      const updatedGroups = newGroups.map((group, index) => ({
        ...group,
        order: index
      }));
      
      return {
        ...prev,
        [caseName]: updatedGroups
      };
    });
  };

  // Helper functions
  const getEntriesByGroup = (caseName: string) => {
    const caseEntries = entries.filter(entry => entry.case === caseName);
    const caseGroups = groups[caseName] || [];
    
    const grouped: Record<string | number, any> = {};
    caseGroups.forEach(group => {
      grouped[group.id] = {
        ...group,
        entries: caseEntries.filter(entry => entry.group === group.id)
      };
    });
    
    // Add ungrouped entries
    grouped['ungrouped'] = {
      id: 'ungrouped',
      title: 'Ungrouped Entries',
      entries: caseEntries.filter(entry => !entry.group)
    };
    
    return grouped;
  };

  // Calculate total hours
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    // Use the current entry text, ensuring we have the most up-to-date content
    const currentEntry = entries[index];
    const textToEdit = currentEntry?.entry || '';
    // Use text as-is without removing hours prefix
    setEditingText(textToEdit);
    // Reset hours editing when starting text editing
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...entries];
    // Save text without adding hours prefix
    updated[editingIndex].entry = editingText;
    setEntries(updated);
    setEditingIndex(null);
    setEditingText('');
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const startEditingHours = (index: number, hours: number) => {
    setEditingIndex(index);
    setEditingHours(true);
    setEditingHoursValue(hours.toString());
    // Don't interfere with text editing state
  };

  const saveHoursEdit = () => {
    if (editingIndex === null) return;
    const updated = [...entries];
    const newHours = parseFloat(editingHoursValue) || 0;
    updated[editingIndex].hours = newHours;
    // Don't modify the text when changing hours
    setEntries(updated);
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const cancelHoursEdit = () => {
    setEditingHours(false);
    setEditingHoursValue('');
    // Don't reset editingIndex to preserve text editing state
    // Also ensure the text editing state is preserved
  };

  const deleteEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleAIEnhancement = async (entryIndex: number) => {
    setAiEnhancing(entryIndex);
    setShowAIModal(true);
    
    const currentEntry = entries[entryIndex];
    if (!currentEntry) return;
    
    try {
      // Call the new API endpoint for AI enhancement suggestions
      const response = await fetch('/api/enhanceBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entryText: currentEntry.entry,
          caseName: currentEntry.case,
          fileNumber: undefined // We don't have file numbers in the current system
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate enhancement suggestions');
      }

      const data = await response.json();
      if (data.success && data.suggestions) {
        setAiSuggestions(data.suggestions);
      } else {
        throw new Error('Invalid response from enhancement service');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('AI enhancement error:', errorMessage);
      // Show error to user
      setAiSuggestions([{
        title: 'Error',
        description: 'Failed to generate AI suggestions',
        enhancedText: currentEntry.entry,
        suggestedHours: currentEntry.hours,
        confidence: 0,
        type: 'error'
      }]);
    }
  };

  // Regenerate suggestions using API
  const regenerateSuggestions = async () => {
    if (aiEnhancing !== null) {
      await handleAIEnhancement(aiEnhancing);
    }
  };

  const applyAISuggestion = (suggestion: any) => {
    console.log('Applying AI suggestion:', suggestion);
    console.log('AI enhancing index:', aiEnhancing);
    
    // Always start editing the entry with the AI suggestion
    setEditingIndex(aiEnhancing);
    setEditingText(suggestion.enhancedText);
    setEditingHoursValue(suggestion.suggestedHours.toString());
    setEditingHours(false); // Make sure we're in text editing mode, not hours editing
    
    console.log('Set editing index to:', aiEnhancing);
    console.log('Set editing text to:', suggestion.enhancedText);
    
    // Close the modal and reset AI state
    setShowAIModal(false);
    setAiSuggestions([]);
    setAiEnhancing(null);
    
    // Show success feedback
    setTimeout(() => {
      console.log('AI suggestion applied to text box');
    }, 100);
  };

  const toggleCaseCollapse = (caseName: string) => {
    setCollapsedCases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseName)) {
        newSet.delete(caseName);
      } else {
        newSet.add(caseName);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, caseName: string) => {
    setDraggedCase(caseName);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    if (target) {
      e.dataTransfer.setData('text/html', target.outerHTML);
    }
  };

  const handleDragOver = (e: React.DragEvent, caseName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCase(caseName);
  };

  const handleDragLeave = () => {
    setDragOverCase(null);
  };

  const handleDrop = (e: React.DragEvent, targetCaseName: string) => {
    e.preventDefault();
    if (draggedCase && draggedCase !== targetCaseName) {
      // Get all unique case names in order
      const caseNames = Array.from(new Set(entries.map(entry => entry.case)));
      const draggedCaseIndex = caseNames.indexOf(draggedCase);
      const targetCaseIndex = caseNames.indexOf(targetCaseName);
      
      if (draggedCaseIndex !== -1 && targetCaseIndex !== -1) {
        // Remove dragged case from its position
        caseNames.splice(draggedCaseIndex, 1);
        
        // Insert dragged case at the exact target position
        caseNames.splice(targetCaseIndex, 0, draggedCase);
        
        // Reorder entries based on new case order
        const reorderedEntries: BillingEntry[] = [];
        caseNames.forEach(caseName => {
          const caseEntries = entries.filter(entry => entry.case === caseName);
          reorderedEntries.push(...caseEntries);
        });
        
        setEntries(reorderedEntries);
      }
    }
    setDraggedCase(null);
    setDragOverCase(null);
  };

  const handleDragEnd = () => {
    setDraggedCase(null);
    setDragOverCase(null);
  };

  const handleEntryDragStart = (e: React.DragEvent, entryIndex: number) => {
    setDraggedEntry(entryIndex);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    if (target) {
      e.dataTransfer.setData('text/html', target.outerHTML);
    }
  };

  const handleEntryDragOver = (e: React.DragEvent, entryIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEntry(entryIndex);
  };

  const handleEntryDragLeave = () => {
    setDragOverEntry(null);
  };

  const handleEntryDrop = (e: React.DragEvent, targetEntryIndex: number) => {
    e.preventDefault();
    if (draggedEntry !== null && draggedEntry !== targetEntryIndex) {
      const newEntries = [...entries];
      const draggedItem = newEntries[draggedEntry];
      
      // Remove dragged item
      newEntries.splice(draggedEntry, 1);
      
      // Insert at the exact target position
      newEntries.splice(targetEntryIndex, 0, draggedItem);
      
      setEntries(newEntries);
    }
    setDraggedEntry(null);
    setDragOverEntry(null);
  };

  const handleEntryDragEnd = () => {
    setDraggedEntry(null);
    setDragOverEntry(null);
  };

  const startEditingCaseName = (caseName: string) => {
    setEditingCaseName(caseName);
    setEditingCaseNameValue(caseName);
  };

  const saveCaseNameEdit = () => {
    if (editingCaseName && editingCaseNameValue.trim()) {
      const updatedEntries = entries.map(entry => 
        entry.case === editingCaseName 
          ? { ...entry, case: editingCaseNameValue.trim() }
          : entry
      );
      setEntries(updatedEntries);
    }
    setEditingCaseName(null);
    setEditingCaseNameValue('');
  };

  const cancelCaseNameEdit = () => {
    setEditingCaseName(null);
    setEditingCaseNameValue('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Main Container with Glass Effect */}
        <div className="glass p-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between">
            <div></div>
          <h1>Legal Billing Generator</h1>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="glass-button p-2 hover:bg-opacity-20 transition-all duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-lg" style={{ color: 'var(--glass-text-secondary)' }}>
            AI-powered billing entry generation with Apple Glass aesthetics
          </p>
        </div>

        {/* Form Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--glass-text-secondary)' }}>
              Case Name
            </label>
        <input
              className="glass-input"
              placeholder="Enter case name"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
        />
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
                Brief Billing Description
              </label>
            </div>
            
            <div className="relative">
        <textarea
                className="glass-input glass-textarea"
                placeholder="Describe the work performed or time spent..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

              {/* Word Flagging Warnings */}
              {wordFlags.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--glass-warning)' }}>
                      ⚠️ Flagged Words Detected
                    </span>
                    <button
                      className="text-xs glass-button px-2 py-1"
                      onClick={() => setShowWordFlags(!showWordFlags)}
                    >
                      {showWordFlags ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  
                  {showWordFlags && (
                    <div className="space-y-2">
                      {wordFlags.map((flag, idx) => (
                        <div key={idx} className="glass p-3 space-y-2" style={{ borderColor: 'var(--glass-warning)' }}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm" style={{ color: 'var(--glass-warning)' }}>
                              "{flag.word}" appears {flag.count} time{flag.count > 1 ? 's' : ''}
                            </span>
                            <span className="text-xs px-2 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
                              {flag.severity}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                            {flag.reason}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium" style={{ color: 'var(--glass-text-secondary)' }}>
                              Suggested alternatives:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {flag.alternatives.map((alt: string, altIdx: number) => (
                                <button
                                  key={altIdx}
                                  className="text-xs px-2 py-1 glass rounded hover:bg-opacity-20 transition-all duration-200"
                                  onClick={() => replaceWord(flag.word, alt)}
                                >
                                  {alt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

                      </div>
                      </div>
                      
          {/* Add Entry Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAddEntry}
              className="w-full glass-button flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-200 hover:bg-opacity-20"
              style={{ 
                color: 'var(--glass-accent)',
                borderColor: 'var(--glass-accent)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Entry</span>
            </button>
          </div>

          {/* Display Added Descriptions */}
          {descriptions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium" style={{ color: 'var(--glass-text)' }}>
                Added Descriptions ({descriptions.length})
              </h4>
              <div className="space-y-2">
                {descriptions.map((desc, index) => (
                  <div key={desc.id} className="glass p-3 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--glass-accent)' }}>
                          {desc.case}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--glass-text)' }}>
                          {desc.text}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDescriptions(prev => prev.filter(d => d.id !== desc.id));
                        }}
                        className="ml-2 text-xs glass-button px-2 py-1 hover:bg-opacity-20"
                        style={{ color: 'var(--glass-text-secondary)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
                      
          {/* Entry Generation Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Button 1: Manual Entry (No AI) */}
                            <button
              onClick={handleManualEntry}
              className="glass-button p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
                            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">Manual Entry</span>
                            </button>

            {/* Button 2: AI Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading}
              className="glass-button glass-button-primary p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
              {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              <span className="text-sm">{loading ? 'Generating...' : 'AI Generate All'}</span>
          </button>

            {/* Button 3: Templates */}
          <button
              onClick={() => setShowTemplates(true)}
              className="glass-button p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Templates</span>
            </button>

            {/* Button 4: Reset All */}
            <button
            onClick={handleReset}
              className="glass-button glass-button-danger p-3 rounded-lg hover:bg-red-500/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              <span className="text-sm">Reset All</span>
          </button>
          </div>
        </div>

        {/* Entries Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2>Generated Entries</h2>
            <span className="text-sm px-3 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className="glass p-6 space-y-6">
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 glass rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" style={{ color: 'var(--glass-text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p style={{ color: 'var(--glass-text-secondary)' }}>No entries yet. Create your first billing entry above.</p>
              </div>
            ) : (
              Object.entries(
                entries.reduce((groups: Record<string, BillingEntry[]>, item, idx) => {
                  if (!groups[item.case]) {
                    groups[item.case] = [];
                  }
                  groups[item.case].push({ ...item, originalIndex: idx } as BillingEntry & { originalIndex: number });
                  return groups;
                }, {})
              ).map(([caseName, caseEntries]) => (
                <div 
                  key={caseName} 
                  className={`glass p-6 space-y-4 mb-8 transition-all duration-200 ${
                    draggedCase === caseName ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverCase === caseName ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                  }`}
                  style={{ 
                    borderLeft: '4px solid var(--glass-accent)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    cursor: 'grab'
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, caseName)}
                  onDragOver={(e) => handleDragOver(e, caseName)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, caseName)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Case Header */}
                  <div className="flex items-center justify-between mb-6 pb-4" style={{ 
                    borderBottom: '1px solid var(--glass-border)' 
                  }}>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <svg 
                          className="w-4 h-4 cursor-grab" 
                          style={{ color: 'var(--glass-text-muted)' }} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--glass-accent)' }}></div>
                      </div>
                      {editingCaseName === caseName ? (
                        <input
                          type="text"
                          value={editingCaseNameValue}
                          onChange={(e) => setEditingCaseNameValue(e.target.value)}
                          onBlur={saveCaseNameEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveCaseNameEdit();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelCaseNameEdit();
                            }
                          }}
                          className="text-xl font-bold bg-transparent border-none outline-none"
                          style={{ color: 'var(--glass-text)' }}
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className="text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity duration-200" 
                          style={{ color: 'var(--glass-text)' }}
                          onClick={() => startEditingCaseName(caseName)}
                          title="Click to edit case name"
                        >
                          {caseName}
                        </h3>
                      )}
                      <button
                        onClick={() => startEditingCaseName(caseName)}
                        className="glass-button p-1 hover:bg-opacity-20 transition-all duration-200"
                        title="Edit case name"
                      >
                        <svg 
                          className="w-4 h-4" 
                          style={{ color: 'var(--glass-text-secondary)' }} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => toggleCaseCollapse(caseName)}
                      className="glass-button p-2 hover:bg-opacity-20 transition-all duration-200"
                      title={collapsedCases.has(caseName) ? 'Expand case' : 'Collapse case'}
                    >
                      <svg 
                        className="w-5 h-5 transition-transform duration-200" 
                        style={{ 
                          color: 'var(--glass-text-secondary)',
                          transform: collapsedCases.has(caseName) ? 'rotate(-90deg)' : 'rotate(0deg)'
                        }} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    </div>
                    
                  {/* Groups Management Section */}
                  {!collapsedCases.has(caseName) && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div></div>
                        <button
                          onClick={() => createGroup(caseName)}
                          className="glass-button glass-button-primary px-4 py-2 text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Group
                        </button>
                      </div>

                      {/* Groups with Entries */}
                      <div className="space-y-4">
                        {groups[caseName]?.sort((a, b) => a.order - b.order).map((group) => {
                          const groupEntries = caseEntries.filter(item => item.group === group.id);
                          return (
                            <div key={group.id} className="group-container">
                              {/* Group Header */}
                              <div 
                                className={`glass p-3 rounded-lg ${
                                  draggedGroup === group.id ? 'opacity-50 scale-95' : ''
                                } ${
                                  dragOverGroup === group.id ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                                } ${
                                  dragOverEntryGroup === group.id ? 'ring-2 ring-green-400 ring-opacity-50' : ''
                                }`}
                                style={{ cursor: 'grab' }}
                                draggable
                                onDragStart={(e) => handleGroupDragStart(e, group.id, caseName)}
                                onDragOver={(e) => {
                                  // Handle both group reordering and entry dropping
                                  if (draggedGroup) {
                                    handleGroupDragOver(e, group.id);
                                  } else if (draggedEntry !== null) {
                                    handleEntryDragOverGroup(e, group.id);
                                  }
                                }}
                                onDragLeave={() => {
                                  handleGroupDragLeave();
                                  handleEntryDragLeaveGroup();
                                }}
                                onDrop={(e) => {
                                  // Handle both group reordering and entry dropping
                                  if (draggedGroup) {
                                    handleGroupDrop(e, group.id, caseName);
                                  } else if (draggedEntry !== null) {
                                    handleEntryDropOnGroup(e, group.id, caseName);
                                  }
                                }}
                                onDragEnd={handleGroupDragEnd}
                              >
                                <div className="flex items-center justify-between">
                                  {/* Drag Handle */}
                                  <div className="flex-shrink-0 flex items-center mr-2">
                                    <svg 
                                      className="w-4 h-4 cursor-grab" 
                                      style={{ color: 'var(--glass-text-muted)' }} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    {editingGroup === group.id ? (
                                      <input
                                        type="text"
                                        value={editingGroupTitle}
                                        onChange={(e) => setEditingGroupTitle(e.target.value)}
                                        onBlur={() => renameGroup(caseName, group.id, editingGroupTitle)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            renameGroup(caseName, group.id, editingGroupTitle);
                                          } else if (e.key === 'Escape') {
                                            cancelEditingGroup();
                                          }
                                        }}
                                        className="glass-input text-sm font-medium w-full"
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <h5 
                                          className="text-sm font-medium cursor-pointer hover:opacity-80" 
                                          style={{ color: 'var(--glass-text)' }}
                                          onClick={() => startEditingGroup(group.id, group.title)}
                                        >
                                          {group.title}
                                        </h5>
                                        <span className="text-xs px-2 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
                                          {groupEntries.length} entries
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {editingGroup !== group.id && (
                                      <>
                                        <button
                                          onClick={() => startEditingGroup(group.id, group.title)}
                                          className="glass-button p-1.5 text-xs"
                                          title="Rename group"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => deleteGroup(caseName, group.id)}
                                          className="glass-button p-1.5 text-xs hover:bg-red-500/20"
                                          title="Delete group"
                                        >
                                          <svg className="w-3 h-3" style={{ color: 'var(--glass-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Group Entries */}
                              {groupEntries.length > 0 && (
                                <div className="ml-4 mt-2 space-y-1">
                                  {groupEntries.map((item, idx) => (
                                    <div 
                                      key={item.originalIndex} 
                                      className={`glass p-4 space-y-3 transition-all duration-200 ${
                                        draggedEntry === item.originalIndex ? 'opacity-50 scale-95' : ''
                                      } ${
                                        dragOverEntry === item.originalIndex ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                                      }`}
                                      style={{ cursor: 'grab' }}
                                      draggable
                                      onDragStart={(e) => item.originalIndex !== undefined && handleEntryDragStart(e, item.originalIndex)}
                                      onDragOver={(e) => item.originalIndex !== undefined && handleEntryDragOver(e, item.originalIndex)}
                                      onDragLeave={handleEntryDragLeave}
                                      onDrop={(e) => item.originalIndex !== undefined && handleEntryDrop(e, item.originalIndex)}
                                      onDragEnd={handleEntryDragEnd}
                                    >
                                      <div className="space-y-2">
                                        {/* Entry Content Row */}
                                        <div className="flex gap-3 items-stretch">
                                          {/* Drag Handle */}
                                          <div className="flex-shrink-0 flex items-center">
                                            <svg 
                                              className="w-4 h-4 cursor-grab" 
                                              style={{ color: 'var(--glass-text-muted)' }} 
                                              fill="none" 
                                              stroke="currentColor" 
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                            </svg>
                                          </div>
                                          
                                          {/* Hours Column */}
                                          <div className="flex-shrink-0 w-20">
                                            {editingHours && editingIndex === item.originalIndex ? (
                                              <div className="glass p-3 text-center rounded-lg flex flex-col justify-center items-center space-y-1 h-full">
                                                <input
                                                  type="number"
                                                  step="0.1"
                                                  min="0"
                                                  value={editingHoursValue}
                                                  onChange={(e) => setEditingHoursValue(e.target.value)}
                                                  onBlur={saveHoursEdit}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      saveHoursEdit();
                                                    } else if (e.key === 'Escape') {
                                                      e.preventDefault();
                                                      cancelHoursEdit();
                                                    }
                                                  }}
                                                  className="glass-input text-center text-lg font-bold"
                                                  style={{ 
                                                    color: 'var(--glass-accent)',
                                                    width: '100%',
                                                    padding: '8px 4px',
                                                    minWidth: '60px',
                                                    maxWidth: '80px'
                                                  }}
                                                  autoFocus
                                                />
                                                <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                                                  hours
                                                </div>
                                              </div>
                                            ) : (
                                              <div 
                                                className="glass p-3 text-center rounded-lg flex flex-col justify-center cursor-pointer hover:bg-opacity-20 transition-all duration-200 h-full"
                                                onClick={() => item.originalIndex !== undefined && startEditingHours(item.originalIndex, item.hours)}
                                                title="Click to edit hours"
                                              >
                                                <div className="text-lg font-bold" style={{ color: 'var(--glass-accent)' }}>
                                                  {item.hours > 0 ? item.hours.toFixed(1) : '0.0'}
                                                </div>
                                                <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                                                  hours
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Entry Content */}
                                          <div className={editingIndex === item.originalIndex && !editingHours ? "w-full" : "flex-1"} style={{ minWidth: '0' }}>
                                            {editingIndex === item.originalIndex && !editingHours ? (
                                              <div className="glass rounded-lg p-3 relative" style={{ width: '100%' }}>
                                                <textarea
                                                  value={editingText || entries[item.originalIndex]?.entry || ''}
                                                  onChange={(e) => setEditingText(e.target.value)}
                                                  onBlur={saveEdit}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      saveEdit();
                                                    }
                                                  }}
                                                  className="w-full bg-transparent border-none outline-none resize-both whitespace-pre-wrap"
                                                  rows={5}
                                                  autoFocus
                                                  style={{ 
                                                    color: 'var(--glass-text-secondary)',
                                                    padding: '0',
                                                    margin: '0',
                                                    width: '100%',
                                                    minWidth: '100%',
                                                    maxWidth: '100%',
                                                    minHeight: '120px',
                                                    boxSizing: 'border-box'
                                                  }}
                                                />
                                                
                                                {/* AI Enhancement Button - Bottom Right */}
                                                <button
                                                  className="absolute bottom-2 right-2 p-1.5 glass rounded-full hover:bg-blue-500/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                                                  onClick={() => item.originalIndex !== undefined && handleAIEnhancement(item.originalIndex)}
                                                  title="AI Enhance Entry"
                                                >
                                                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--glass-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            ) : (
                                              <div
                                                className="cursor-pointer p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200 h-full relative"
                                                  onClick={() => item.originalIndex !== undefined && startEditing(item.originalIndex, item.entry)}
                                                style={{ width: '100%' }}
                                              >
                                                <p style={{ color: 'var(--glass-text-secondary)' }} className="whitespace-pre-wrap">
                                                  {item.entry || 'No content'}
                                                </p>
                                                <p className="text-xs mt-2" style={{ color: 'var(--glass-text-secondary)' }}>
                                                  Click to edit
                                                </p>
                                                
                                                {/* AI Enhancement Button - Bottom Right for Display Mode */}
                                                <button
                                                  className="absolute bottom-2 right-2 p-1.5 glass rounded-full hover:bg-blue-500/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                                                  onClick={(e) => {
                                                    e.stopPropagation(); // Prevent triggering the edit mode
                                                    item.originalIndex !== undefined && handleAIEnhancement(item.originalIndex);
                                                  }}
                                                  title="AI Enhance Entry"
                                                >
                                                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--glass-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Delete Button */}
                                          <div className="flex-shrink-0">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                item.originalIndex !== undefined && deleteEntry(item.originalIndex);
                                              }}
                                              className="glass-button p-2 hover:bg-red-500/20 transition-all duration-200 h-full flex items-center justify-center"
                                              title="Delete entry"
                                            >
                                              <svg 
                                                className="w-4 h-4" 
                                                style={{ color: 'var(--glass-danger)' }} 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                              >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}


                        {/* Show message if no groups */}
                        {(!groups[caseName] || groups[caseName].length === 0) && (
                          <div className="text-center py-4" style={{ color: 'var(--glass-text-secondary)' }}>
                            <p className="text-sm">No groups created yet</p>
                            <p className="text-xs mt-1">Create groups to organize your billing entries</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    

                  {/* Ungrouped Entries Section */}
                  {!collapsedCases.has(caseName) && (
                    <div className="mt-6">
                      <div 
                        className={`glass p-4 rounded-lg border-2 border-dashed ${
                          dragOverEntryGroup === 'ungrouped' ? 'ring-2 ring-green-400 ring-opacity-50 border-green-400' : 'border-gray-400 border-opacity-30'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverEntryGroup('ungrouped');
                        }}
                        onDragLeave={() => setDragOverEntryGroup(null)}
                        onDrop={(e) => handleEntryDropOnUngrouped(e, caseName)}
                      >
                        <div className="text-center mb-3" style={{ color: 'var(--glass-text-secondary)' }}>
                          <p className="text-sm font-medium">New Entries (Staging Area)</p>
                          <p className="text-xs mt-1">New entries appear here - drag them to groups to organize</p>
                        </div>
                        
                        {/* Show ungrouped entries */}
                        <div className="space-y-1">
                          {caseEntries.filter(item => !item.group).map((item, idx) => (
                            <div 
                              key={item.originalIndex} 
                              className={`glass p-4 space-y-3 transition-all duration-200 ${
                                draggedEntry === item.originalIndex ? 'opacity-50 scale-95' : ''
                              } ${
                                dragOverEntry === item.originalIndex ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                              }`}
                              style={{ cursor: 'grab' }}
                              draggable
                              onDragStart={(e) => item.originalIndex !== undefined && handleEntryDragStart(e, item.originalIndex)}
                              onDragOver={(e) => item.originalIndex !== undefined && handleEntryDragOver(e, item.originalIndex)}
                              onDragLeave={handleEntryDragLeave}
                              onDrop={(e) => item.originalIndex !== undefined && handleEntryDrop(e, item.originalIndex)}
                              onDragEnd={handleEntryDragEnd}
                            >
                              <div className="space-y-2">
                                {/* Entry Content Row */}
                                <div className="flex gap-3 items-stretch">
                                  {/* Drag Handle */}
                                  <div className="flex-shrink-0 flex items-center">
                                    <svg 
                                      className="w-4 h-4 cursor-grab" 
                                      style={{ color: 'var(--glass-text-muted)' }} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
                                  
                                  {/* Hours Column */}
                                  <div className="flex-shrink-0 w-20">
                                    {editingHours && editingIndex === item.originalIndex ? (
                                      <div className="glass p-3 text-center rounded-lg flex flex-col justify-center items-center space-y-1 h-full">
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          value={editingHoursValue}
                                          onChange={(e) => setEditingHoursValue(e.target.value)}
                                          onBlur={saveHoursEdit}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              saveHoursEdit();
                                            } else if (e.key === 'Escape') {
                                              e.preventDefault();
                                              cancelHoursEdit();
                                            }
                                          }}
                                          className="glass-input text-center text-lg font-bold"
                                          style={{ 
                                            color: 'var(--glass-accent)',
                                            width: '100%',
                                            padding: '8px 4px',
                                            minWidth: '60px',
                                            maxWidth: '80px'
                                          }}
                                          autoFocus
                                        />
                                        <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                                          hours
                                        </div>
                                      </div>
                                    ) : (
                                      <div 
                                        className="glass p-3 text-center rounded-lg flex flex-col justify-center cursor-pointer hover:bg-opacity-20 transition-all duration-200 h-full"
                                         onClick={() => item.originalIndex !== undefined && startEditingHours(item.originalIndex, item.hours)}
                                        title="Click to edit hours"
                                      >
                                        <div className="text-lg font-bold" style={{ color: 'var(--glass-accent)' }}>
                                          {item.hours > 0 ? item.hours.toFixed(1) : '0.0'}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                                          hours
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Entry Content */}
                                  <div className={editingIndex === item.originalIndex && !editingHours ? "w-full" : "flex-1"} style={{ minWidth: '0' }}>
                                    {editingIndex === item.originalIndex && !editingHours ? (
                                      <div className="glass rounded-lg p-3 relative" style={{ width: '100%' }}>
                                        <textarea
                                          value={editingText || entries[item.originalIndex]?.entry || ''}
                                          onChange={(e) => setEditingText(e.target.value)}
                                          onBlur={saveEdit}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              saveEdit();
                                            }
                                          }}
                                          className="w-full bg-transparent border-none outline-none resize-both whitespace-pre-wrap"
                                          rows={5}
                                          autoFocus
                                          style={{ 
                                            color: 'var(--glass-text-secondary)',
                                            padding: '0',
                                            margin: '0',
                                            width: '100%',
                                            minWidth: '100%',
                                            maxWidth: '100%',
                                            minHeight: '120px',
                                            boxSizing: 'border-box'
                                          }}
                                        />
                                        
                                        {/* AI Enhancement Button - Bottom Right */}
                                        <button
                                          className="absolute bottom-2 right-2 p-1.5 glass rounded-full hover:bg-blue-500/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                                          onClick={() => item.originalIndex !== undefined && handleAIEnhancement(item.originalIndex)}
                                          title="AI Enhance Entry"
                                        >
                                          <svg className="w-3.5 h-3.5" style={{ color: 'var(--glass-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                          </svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        className="cursor-pointer p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200 h-full relative"
                                                  onClick={() => item.originalIndex !== undefined && startEditing(item.originalIndex, item.entry)}
                                        style={{ width: '100%' }}
                                      >
                                        <p style={{ color: 'var(--glass-text-secondary)' }} className="whitespace-pre-wrap">
                                          {item.entry || 'No content'}
                                        </p>
                                        <p className="text-xs mt-2" style={{ color: 'var(--glass-text-secondary)' }}>
                                          Click to edit
                                        </p>
                                        
                                        {/* AI Enhancement Button - Bottom Right for Display Mode */}
                                        <button
                                          className="absolute bottom-2 right-2 p-1.5 glass rounded-full hover:bg-blue-500/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent triggering the edit mode
                                             item.originalIndex !== undefined && handleAIEnhancement(item.originalIndex);
                                          }}
                                          title="AI Enhance Entry"
                                        >
                                          <svg className="w-3.5 h-3.5" style={{ color: 'var(--glass-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Delete Button */}
                                  <div className="flex-shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                         item.originalIndex !== undefined && deleteEntry(item.originalIndex);
                                      }}
                                      className="glass-button p-2 hover:bg-red-500/20 transition-all duration-200 h-full flex items-center justify-center"
                                      title="Delete entry"
                                    >
                                      <svg 
                                        className="w-4 h-4" 
                                        style={{ color: 'var(--glass-danger)' }} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Show message if no ungrouped entries */}
                          {caseEntries.filter(item => !item.group).length === 0 && (
                            <div className="text-center py-4" style={{ color: 'var(--glass-text-secondary)' }}>
                              <p className="text-sm">No new entries</p>
                              <p className="text-xs mt-1">Create entries above to see them here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Entry Section for this case */}
                  <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-20">
                    {addingEntryToCase === caseName ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
                            Brief Billing Description
                          </label>
                          <textarea
                            className="glass-input glass-textarea w-full"
                            placeholder="Describe the work performed or time spent..."
                            value={newEntryText}
                            onChange={(e) => setNewEntryText(e.target.value)}
                            rows={3}
                            autoFocus
                          />
                        </div>

                        
                        {/* Entry Generation Buttons for Case */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Manual Entry Button */}
                          <button
                            onClick={() => handleManualEntryForCase(caseName)}
                            className="glass-button p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-sm">Manual Entry</span>
                          </button>

                          {/* AI Generate Button */}
                          <button
                            onClick={() => handleAIGenerateForCase(caseName)}
                            disabled={caseEntryLoading || !newEntryText.trim()}
                            className="glass-button glass-button-primary p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {caseEntryLoading ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            )}
                            <span className="text-sm">{caseEntryLoading ? 'Generating...' : 'AI Generate'}</span>
                          </button>

                          {/* Templates Button */}
                          <button
                            onClick={() => setCaseEntryTemplates(true)}
                            className="glass-button p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm">Templates</span>
                          </button>
                        </div>

                        {/* Cancel Button */}
                        <div className="flex justify-end">
                          <button
                            onClick={cancelAddingEntryToCase}
                            className="glass-button px-4 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startAddingEntryToCase(caseName)}
                        className="w-full glass-button flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-200 hover:bg-opacity-20"
                        style={{ 
                          color: 'var(--glass-accent)',
                          borderColor: 'var(--glass-accent)',
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Entry to {caseName}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total Hours Summary */}
        {entries.length > 0 && (
          <div className="mt-6">
            <div className="glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text)' }}>
                    Total Hours Billed
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: 'var(--glass-accent)' }}>
                    {totalHours.toFixed(1)}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    hours
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Browser Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass glass-hover w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-opacity-20" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Billing Templates</h2>
                <button
                  className="glass-button p-2"
                  onClick={() => setShowTemplates(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {templates.map((template) => (
                  <div key={template.id} className="glass p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium" style={{ color: 'var(--glass-text)' }}>
                        {template.name}
                      </h3>
                      <span className="text-sm px-3 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
                        {template.templateCount} templates
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                      {template.description}
                    </p>
                    <div className="space-y-2">
                      {template.templates && template.templates.slice(0, 3).map((templateItem: any, idx: number) => (
                        <button
                          key={idx}
                          className="w-full text-left p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200"
                          onClick={() => handleTemplateSelect(templateItem)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono px-2 py-1 glass rounded" style={{ color: 'var(--glass-accent)' }}>
                              {templateItem.time}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                              {templateItem.description}
                            </span>
                          </div>
                        </button>
                      ))}
                      {template.templates && template.templates.length > 3 && (
                        <p className="text-xs text-center" style={{ color: 'var(--glass-text-secondary)' }}>
                          +{template.templates.length - 3} more templates
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Enhancement Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text)' }}>
                ✨ AI Entry Enhancement
              </h3>
              <button 
                onClick={() => setShowAIModal(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2" style={{ color: 'var(--glass-text)' }}>
                  Current Entry:
                </h4>
                <p className="text-sm p-3 glass rounded" style={{ color: 'var(--glass-text-secondary)' }}>
                  {aiEnhancing !== null ? entries[aiEnhancing]?.entry : ''}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2" style={{ color: 'var(--glass-text)' }}>
                  Choose an AI Enhancement:
                </h4>
                <p className="text-xs mb-3" style={{ color: 'var(--glass-text-secondary)' }}>
                  Click any suggestion below to populate the text box with that enhancement
                </p>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-4 glass rounded-lg hover:bg-opacity-20 transition-all duration-200 border-2 border-transparent hover:border-blue-400/30"
                      onClick={() => applyAISuggestion(suggestion)}
                      onMouseEnter={() => setPreviewSuggestion(suggestion)}
                      onMouseLeave={() => setPreviewSuggestion(null)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--glass-text)' }}>
                            {suggestion.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                            {suggestion.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 glass rounded-full">
                            {suggestion.confidence}% match
                          </span>
                          <p className="text-xs mt-1" style={{ color: 'var(--glass-accent)' }}>
                            +{suggestion.suggestedHours - (aiEnhancing !== null ? entries[aiEnhancing]?.hours || 0 : 0)}h
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-mono mt-2 p-2 glass rounded" style={{ color: 'var(--glass-text-secondary)' }}>
                        "{suggestion.enhancedText}"
                      </p>
                      <div className="mt-2 text-xs" style={{ color: 'var(--glass-accent)' }}>
                        ✨ Click to apply this enhancement
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                  The selected enhancement will populate the text box for you to review and edit
                </p>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* Real-time Preview Panel */}
      {previewSuggestion && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-80 glass p-4 rounded-lg z-50 max-h-96 overflow-y-auto">
          <h4 className="font-medium mb-2 text-sm" style={{ color: 'var(--glass-text)' }}>
            Preview Enhancement
          </h4>
          <p className="text-xs mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
            {previewSuggestion.title}
          </p>
          <p className="text-xs font-mono p-2 glass rounded" style={{ color: 'var(--glass-text-secondary)' }}>
            "{previewSuggestion.enhancedText}"
          </p>
          <div className="mt-2 flex justify-between text-xs">
            <span style={{ color: 'var(--glass-accent)' }}>
              +{previewSuggestion.suggestedHours - (aiEnhancing !== null ? entries[aiEnhancing]?.hours || 0 : 0)}h
            </span>
            <span className="text-blue-400">
              {previewSuggestion.confidence}% match
            </span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
