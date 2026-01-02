'use client';

/**
 * Response Card Component
 * 
 * Displays a single discovery response with:
 * - Original request
 * - Objection toggles (predefined + custom)
 * - Custom objection input
 * - Objection text editing
 * - Answer editing
 * - Status indicator
 * - Drag handle for reordering
 */

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Edit3,
  X,
  Plus,
  Save,
} from 'lucide-react';
import {
  getObjectionsByCategory,
  getObjectionById,
  type DiscoveryResponseType,
  type ObjectionCategory,
} from '@/lib/data/californiaObjections';

interface DiscoveryResponse {
  id: string;
  requestNumber: number;
  originalRequest: string;
  objections: string[];
  objectionTexts: string[];
  customObjections: string[]; // Custom objections added by user
  answer: string;
  suggestedObjectionIds: string[];
  status: 'draft' | 'reviewed' | 'final';
}

interface ResponseCardProps {
  response: DiscoveryResponse;
  discoveryType: DiscoveryResponseType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DiscoveryResponse>) => void;
  onToggleObjection: (objectionId: string, enabled: boolean) => void;
  onAddCustomObjection: (customText: string) => void;
  onEditObjectionText: (index: number, newText: string) => void;
  onRemoveCustomObjection: (index: number) => void;
  onOpenAI: () => void;
}

const categoryLabels: Record<ObjectionCategory, string> = {
  general: 'General',
  procedural: 'Procedural',
  vagueness: 'Vagueness',
  scope: 'Scope',
  burden: 'Burden',
  relevance: 'Relevance',
  privilege: 'Privilege',
  privacy: 'Privacy',
  expert: 'Expert',
  premature: 'Premature',
};

const statusColors = {
  draft: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  reviewed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  final: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export function ResponseCard({
  response,
  discoveryType,
  isSelected,
  onSelect,
  onUpdate,
  onToggleObjection,
  onAddCustomObjection,
  onEditObjectionText,
  onRemoveCustomObjection,
  onOpenAI,
}: ResponseCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState(response.answer);
  const [showObjectionPicker, setShowObjectionPicker] = useState(false);
  
  // Custom objection states
  const [showCustomObjectionInput, setShowCustomObjectionInput] = useState(false);
  const [customObjectionText, setCustomObjectionText] = useState('');
  const [editingObjectionIndex, setEditingObjectionIndex] = useState<number | null>(null);
  const [editedObjectionText, setEditedObjectionText] = useState('');

  // Sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: response.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get objections grouped by category
  const objectionsByCategory = getObjectionsByCategory(discoveryType);

  // Get active objection details
  const activeObjections = response.objections
    .map(id => getObjectionById(id))
    .filter(Boolean);

  // Handle answer save
  const handleSaveAnswer = useCallback(() => {
    onUpdate({ answer: editedAnswer });
    setIsEditingAnswer(false);
  }, [editedAnswer, onUpdate]);

  // Handle status change
  const handleStatusChange = useCallback((status: DiscoveryResponse['status']) => {
    onUpdate({ status });
  }, [onUpdate]);

  // Handle adding custom objection
  const handleAddCustomObjection = useCallback(() => {
    if (customObjectionText.trim()) {
      onAddCustomObjection(customObjectionText.trim());
      setCustomObjectionText('');
      setShowCustomObjectionInput(false);
    }
  }, [customObjectionText, onAddCustomObjection]);

  // Handle saving edited objection
  const handleSaveObjectionEdit = useCallback(() => {
    if (editingObjectionIndex !== null && editedObjectionText.trim()) {
      onEditObjectionText(editingObjectionIndex, editedObjectionText.trim());
      setEditingObjectionIndex(null);
      setEditedObjectionText('');
    }
  }, [editingObjectionIndex, editedObjectionText, onEditObjectionText]);

  // Get custom objections (those not in predefined list)
  const customObjections = response.customObjections || [];

  // Get request label based on discovery type
  const requestLabel = discoveryType === 'interrogatories'
    ? `INTERROGATORY NO. ${response.requestNumber}`
    : discoveryType === 'rfp'
      ? `REQUEST FOR PRODUCTION NO. ${response.requestNumber}`
      : `REQUEST FOR ADMISSION NO. ${response.requestNumber}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/5 backdrop-blur-xl border rounded-xl transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${
        isSelected
          ? 'border-blue-500/50 ring-2 ring-blue-500/20'
          : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        {/* Drag Handle - Two Lines */}
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing flex flex-col gap-1 justify-center"
        >
          <div className="w-5 h-0.5 bg-current rounded-full" />
          <div className="w-5 h-0.5 bg-current rounded-full" />
        </button>

        {/* Request Number */}
        <div className="flex-1">
          <h3 className="text-white font-medium">{requestLabel}</h3>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <select
            value={response.status}
            onChange={(e) => handleStatusChange(e.target.value as DiscoveryResponse['status'])}
            className={`px-2 py-1 text-xs rounded-full border cursor-pointer ${statusColors[response.status]} bg-transparent`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="final">Final</option>
          </select>

          {/* AI Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAI();
            }}
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"
            title="Edit with AI"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Original Request */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
              Original Request
            </label>
            <div className="p-3 bg-slate-800/50 rounded-lg text-slate-300 text-sm italic">
              {response.originalRequest}
            </div>
          </div>

          {/* Objections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400 uppercase">
                Objections ({activeObjections.length})
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowObjectionPicker(!showObjectionPicker);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-all"
              >
                <Plus className="w-3 h-3" />
                Add/Remove
              </button>
            </div>

            {/* Active Objections List (Predefined) */}
            {activeObjections.length > 0 || customObjections.length > 0 ? (
              <div className="space-y-2">
                {/* Predefined Objections */}
                {activeObjections.map((obj) => obj && (
                  <div
                    key={obj.id}
                    className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-200 font-medium">{obj.shortForm}</p>
                      {obj.citation && (
                        <p className="text-xs text-amber-400/70 mt-0.5">{obj.citation}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleObjection(obj.id, false);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-all"
                      title="Remove objection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Custom Objections */}
                {customObjections.map((customText, index) => (
                  <div
                    key={`custom-${index}`}
                    className="flex items-start gap-2 p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    {editingObjectionIndex === index ? (
                      // Editing mode
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={editedObjectionText}
                          onChange={(e) => setEditedObjectionText(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full p-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                          rows={3}
                          placeholder="Enter objection text..."
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingObjectionIndex(null);
                              setEditedObjectionText('');
                            }}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveObjectionEdit();
                            }}
                            className="px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex-1">
                          <p className="text-sm text-purple-200">{customText}</p>
                          <p className="text-xs text-purple-400/70 mt-0.5">Custom Objection</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingObjectionIndex(index);
                            setEditedObjectionText(customText);
                          }}
                          className="p-1 text-slate-500 hover:text-purple-400 transition-all"
                          title="Edit objection"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCustomObjection(index);
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 transition-all"
                          title="Remove objection"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No objections selected</p>
            )}

            {/* Add Custom Objection Button & Input */}
            {!showCustomObjectionInput ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomObjectionInput(true);
                }}
                className="mt-2 flex items-center gap-1 px-3 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg border border-dashed border-purple-500/30 transition-all w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Custom Objection
              </button>
            ) : (
              <div className="mt-2 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-2">
                <label className="text-xs font-medium text-purple-300">Enter Custom Objection</label>
                <textarea
                  value={customObjectionText}
                  onChange={(e) => setCustomObjectionText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Responding Party objects to this interrogatory on the grounds that..."
                  autoFocus
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomObjectionInput(false);
                      setCustomObjectionText('');
                    }}
                    className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCustomObjection();
                    }}
                    disabled={!customObjectionText.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3 h-3" />
                    Add Objection
                  </button>
                </div>
              </div>
            )}

            {/* Objection Picker */}
            {showObjectionPicker && (
              <div className="mt-3 p-4 bg-slate-800/80 rounded-lg border border-white/10 max-h-80 overflow-y-auto">
                <h4 className="text-sm font-medium text-white mb-3">Select Objections</h4>
                {(Object.entries(objectionsByCategory) as [ObjectionCategory, typeof objectionsByCategory[ObjectionCategory]][])
                  .filter(([, objs]) => objs.length > 0)
                  .map(([category, objs]) => (
                    <div key={category} className="mb-4">
                      <h5 className="text-xs font-medium text-slate-400 uppercase mb-2">
                        {categoryLabels[category]}
                      </h5>
                      <div className="space-y-1">
                        {objs.map((obj) => {
                          const isActive = response.objections.includes(obj.id);
                          const isSuggested = response.suggestedObjectionIds.includes(obj.id);
                          
                          return (
                            <button
                              key={obj.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleObjection(obj.id, !isActive);
                              }}
                              className={`flex items-center gap-2 w-full p-2 rounded-lg text-left transition-all ${
                                isActive
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isActive
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-slate-600'
                              }`}>
                                {isActive && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm flex-1">{obj.shortForm}</span>
                              {isSuggested && !isActive && (
                                <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                                  Suggested
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Answer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400 uppercase">
                Response
              </label>
              {!isEditingAnswer && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditedAnswer(response.answer);
                    setIsEditingAnswer(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-all"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            {isEditingAnswer ? (
              <div className="space-y-2">
                <textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-32 p-3 bg-white/5 border border-white/20 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your response..."
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingAnswer(false);
                    }}
                    className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveAnswer();
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/5 rounded-lg text-slate-200 text-sm whitespace-pre-wrap">
                {response.answer || <span className="text-slate-500 italic">No response entered</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


