"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DepositionSection, DepositionQuestion } from '../utils/depositionOutlineData';
import { depositionOutlineData } from '../utils/depositionOutlineData';
import { useMobilePanels } from '@/store/useMobilePanels';
import { MobileDrawer } from './MobileDrawer';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DOMPurify from 'dompurify';

interface DepositionOutlineProps {
  depositionId?: string;
}

interface Exhibit {
  id: string;
  number: string;
  description: string;
  isIntroduced: boolean;
}

interface AddQuestionFormProps {
  onAdd: (text: string) => void;
  remainingQuestions: number;
}

const AddQuestionForm = React.memo(({ onAdd, remainingQuestions }: AddQuestionFormProps) => {
  const [questionText, setQuestionText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim()) {
      onAdd(questionText.trim());
      setQuestionText('');
      setIsExpanded(false);
    }
  };

  if (remainingQuestions === 0) {
    return (
      <div className="apple-caption text-sm italic p-4 glass-card-gradient rounded-xl">
        Maximum of 10 custom questions reached
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="apple-body text-base text-blue-400 hover:text-blue-300 underline apple-focus p-2 rounded-lg hover:bg-white/5 transition-all duration-300"
      >
        + Add custom question ({remainingQuestions} remaining)
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card-gradient p-6 rounded-xl">
      <div className="mb-4">
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter your custom question..."
          className="glass-input w-full px-4 py-3 text-base apple-body apple-focus rounded-xl"
          rows={2}
          autoFocus
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="apple-caption text-sm text-white/60">{remainingQuestions} questions remaining</span>
        <div className="space-x-3">
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setQuestionText('');
            }}
            className="apple-body text-sm text-white/60 hover:text-white/80 apple-focus px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!questionText.trim()}
            className="glass-button px-6 py-2 text-sm font-medium rounded-xl text-white apple-focus group hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="group-hover:scale-105 transition-transform duration-300">
              Add
            </span>
          </button>
        </div>
      </div>
    </form>
  );
});
AddQuestionForm.displayName = 'AddQuestionForm';

interface TableOfContentsProps {
  sections: DepositionSection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
}

const TableOfContentsContent = React.memo(({ sections, activeSection, onSectionClick }: TableOfContentsProps) => {
  return (
    <div className="flex flex-col">
      <h3 className="apple-subtitle text-base md:text-lg mb-3 md:mb-4 text-center border-b border-white/10 pb-2">
        Table of Contents
      </h3>
      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`block w-full text-left apple-body text-sm py-2 px-3 rounded-xl transition-all duration-300 border ${
              activeSection === section.id
                ? 'bg-blue-400/20 text-blue-300 border-blue-400/50 scale-[1.02]'
                : 'text-white/80 hover:bg-white/5 hover:text-white border-transparent'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-blue-400 uppercase w-10 flex-shrink-0">
                {section.title.split('.')[0]}.
              </span>
              <span className="text-left leading-tight uppercase text-sm">
                {section.title.split('.').slice(1).join('.').trim()}
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
});
TableOfContentsContent.displayName = 'TableOfContentsContent';

const TableOfContents = React.memo(({ sections, activeSection, onSectionClick }: TableOfContentsProps) => {
  return (
    <div className="hidden lg:flex fixed left-2 lg:left-4 xl:left-8 2xl:left-12 top-50 w-56 lg:w-56 xl:w-64 2xl:w-72 glass-float p-3 z-50 flex-col max-h-[calc(100vh-16rem)]" style={{ position: 'fixed', top: '12.5rem' }}>
      <TableOfContentsContent sections={sections} activeSection={activeSection} onSectionClick={onSectionClick} />
    </div>
  );
});
TableOfContents.displayName = 'TableOfContents';

interface QuestionItemProps {
  question: DepositionQuestion;
  onToggleAsked: (questionId: string) => void;
  onToggleFlagged: (questionId: string) => void;
  onEditQuestion: (questionId: string) => void;
  onSaveQuestion: (questionId: string, newText: string) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  editingText: string;
  onUpdateEditingText: (text: string) => void;
  // New props for reordering
  isReorderMode?: boolean;
  // Preview props for drag-to-indent
  dragPreview?: any;
}

// Sortable wrapper for QuestionItem using @dnd-kit
const SortableQuestionItem = React.memo((props: QuestionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.question.id, disabled: !props.isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const indentLevel = props.question.indentLevel || 0;
  const indentClass = indentLevel === 1 ? 'ml-6' : indentLevel === 2 ? 'ml-12' : indentLevel === 3 ? 'ml-18' : indentLevel >= 4 ? 'ml-24' : '';
  
  // Calculate if this item should show preview styling
  const isPreviewTarget = props.dragPreview?.draggedQuestionId === props.question.id;
  const previewIndentClass = isPreviewTarget && props.dragPreview ? 
    (props.dragPreview.targetIndentLevel === 1 ? 'ml-6' : 
     props.dragPreview.targetIndentLevel === 2 ? 'ml-12' : 
     props.dragPreview.targetIndentLevel === 3 ? 'ml-18' : '') : '';
  
  const finalIndentClass = isPreviewTarget ? previewIndentClass : indentClass;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      data-type="question"
      data-id={props.question.id}
      className={`
        ${props.isReorderMode ? 'ring-2 ring-blue-400 ring-opacity-30 rounded-lg transition-all duration-200 hover:ring-opacity-50' : ''}
        ${isPreviewTarget ? 'ring-opacity-70 ring-blue-500' : ''}
      `}
    >
      <div className={`flex items-center space-x-3 ${finalIndentClass} ${
        props.isReorderMode ? 'bg-white/5 select-none' : ''
      }`}>
        {/* Drag Handle - only show when in reorder mode */}
        {props.isReorderMode && (
          <div
            {...listeners}
            className="text-white/50 flex-shrink-0 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-center"
            title="Drag to reorder and indent"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <rect x="2" y="5" width="12" height="3" rx="2"/>
              <rect x="2" y="9" width="12" height="3" rx="2"/>
            </svg>
          </div>
        )}
        <QuestionItemContent {...props} />
      </div>
    </div>
  );
});
SortableQuestionItem.displayName = 'SortableQuestionItem';

// Visual preview overlay for drag-to-indent snap functionality
const DragPreviewOverlay = React.memo(({ preview }: { preview: any }) => {
  if (!preview?.isActive) return null;
  
  const indentClass = preview.targetIndentLevel === 1 ? 'ml-6' : 
                     preview.targetIndentLevel === 2 ? 'ml-12' : 
                     preview.targetIndentLevel === 3 ? 'ml-18' : '';
  
  const levelLabels = {
    0: 'Main Question',
    1: 'Subquestion (Level 1)',
    2: 'Sub-subquestion (Level 2)', 
    3: 'Sub-sub-subquestion (Level 3)'
  };
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className={`bg-blue-500/20 border-2 border-blue-400 border-dashed rounded-lg p-4 ${indentClass} backdrop-blur-sm`}>
          <div className="text-blue-200 text-sm font-medium mb-1">
            📍 Preview: {levelLabels[preview.targetIndentLevel as keyof typeof levelLabels]}
          </div>
          <div className="text-blue-300 text-xs">
            Indent Level: {preview.targetIndentLevel} • Movement: {Math.round(preview.targetPosition)}px
          </div>
          <div className="mt-2 text-xs text-blue-400">
            {preview.targetIndentLevel === 0 && 'No indentation - main question'}
            {preview.targetIndentLevel === 1 && '24px indent - first level subquestion'}
            {preview.targetIndentLevel === 2 && '48px indent - second level subquestion'}
            {preview.targetIndentLevel === 3 && '72px indent - third level subquestion'}
          </div>
        </div>
      </div>
    </div>
  );
});
DragPreviewOverlay.displayName = 'DragPreviewOverlay';

const QuestionItemContent = React.memo(({ 
  question, 
  onToggleAsked, 
  onToggleFlagged, 
  onEditQuestion, 
  onSaveQuestion, 
  onCancelEdit, 
  isEditing,
  editingText,
  onUpdateEditingText,
  isReorderMode = false,
}: QuestionItemProps) => {
  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 w-full">
        <input
          type="text"
          value={editingText}
          onChange={(e) => onUpdateEditingText(e.target.value)}
          className="w-full p-2 border border-blue-400 rounded-md text-sm bg-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Edit question..."
          autoFocus
        />
        <div className="flex space-x-2">
          <button
            onClick={() => onSaveQuestion(question.id, editingText)}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        type="checkbox"
        checked={question.isAsked}
        onChange={isReorderMode ? undefined : () => onToggleAsked(question.id)}
        onClick={(e) => isReorderMode && e.preventDefault()}
        className="h-4 w-4 text-blue-400 focus:ring-0 border-white/20 rounded bg-white/5"
      />
      <span
        className={`apple-body text-sm flex-1 text-justify ${question.isAsked ? 'line-through text-white/50' : 'text-white/90'}`}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.text) }}
      />
      <button
        onClick={isReorderMode ? (e) => e.preventDefault() : () => onEditQuestion(question.id)}
        className="ml-2 w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/40 border-2 border-blue-400/50"
        title="Edit this question"
        style={{ opacity: isReorderMode ? 0.5 : 1 }}
      >
        <span className="text-white text-sm">✏️</span>
      </button>
      <button
        onClick={isReorderMode ? (e) => e.preventDefault() : () => onToggleFlagged(question.id)}
        className={`ml-2 w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 flex items-center justify-center ${
          question.isFlagged
            ? 'bg-red-600 border-2 border-red-800'
            : 'bg-gray-300 border-2 border-gray-500'
        }`}
        title={question.isFlagged ? 'Remove bookmark' : 'Bookmark for later'}
        style={{ opacity: isReorderMode ? 0.5 : 1 }}
      >
        <span className="text-white font-bold text-xs">!</span>
      </button>
    </>
  );
});
QuestionItemContent.displayName = 'QuestionItemContent';

interface SectionItemProps {
  section: DepositionSection;
  isCollapsed: boolean;
  onToggleCollapse: (sectionId: string) => void;
  onToggleSubsection: (sectionId: string, subsectionId: string) => void;
  onToggleQuestion: (sectionId: string, questionId: string, subsectionId?: string) => void;
  onToggleFlagged: (sectionId: string, questionId: string, subsectionId?: string) => void;
  onAddCustomQuestion: (sectionId: string, text: string, subsectionId?: string) => void;
  onRemoveCustomQuestion: (sectionId: string, questionId: string, subsectionId?: string) => void;
  onUpdateNotes: (sectionId: string, notes: string, subsectionId?: string) => void;
  onStartEditing: (sectionId: string) => void;
  onSaveEditing: (sectionId: string) => void;
  onCancelEditing: () => void;
  onDeleteSection: (sectionId: string, event: React.MouseEvent) => void;
  editingSection: string | null;
  editingQuestions: { [key: string]: string };
  editingTitle: { [key: string]: string };
  onUpdateEditingQuestions: (sectionId: string, text: string) => void;
  onUpdateEditingTitle: (sectionId: string, text: string) => void;
  onStartEditingQuestion: (sectionId: string, questionId: string, subsectionId?: string) => void;
  onSaveEditingQuestion: (sectionId: string, questionId: string, newText: string, subsectionId?: string) => void;
  onCancelEditingQuestion: () => void;
  editingQuestionId: string | null;
  editingQuestionText: string;
  onUpdateEditingQuestionText: (text: string) => void;
  sectionRef: (el: HTMLDivElement | null) => void;
  isReorderMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onLongPressStart: (sectionId: string) => void;
  onLongPressEnd: () => void;
  onDragStart: (e: React.DragEvent, sectionId: string) => void;
  onDragOver: (e: React.DragEvent, sectionId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, sectionId: string) => void;
  // Question reorder props
  isQuestionReorderMode: boolean;
  questionReorderContext: { sectionId: string; subsectionId?: string } | null;
  onEnterQuestionReorderMode: (sectionId: string, subsectionId?: string) => void;
  onExitQuestionReorderMode: () => void;
  // @dnd-kit props
  sensors: any;
  handleQuestionDragStart: (event: DragStartEvent) => void;
  handleQuestionDragMove: (event: DragMoveEvent) => void;
  handleQuestionDragEnd: (event: DragEndEvent) => void;
  // Preview props for drag-to-indent
  dragPreview?: any;
  // AI-related props
  isAILoading: boolean;
  aiSuggestions: { [key: string]: string };
  showAISuggestions: { [key: string]: boolean };
  showPromptDialog: { [key: string]: boolean };
  aiPrompt: { [key: string]: string };
  onShowPromptDialog: (sectionId: string) => void;
  onClosePromptDialog: (sectionId: string) => void;
  onUpdateAIPrompt: (sectionId: string, prompt: string) => void;
  onImproveQuestionsWithAI: (sectionId: string) => void;
  onApplyAISuggestions: (sectionId: string) => void;
  onDismissAISuggestions: (sectionId: string) => void;
  // Notes AI props
  showNotesPromptDialog: { [key: string]: boolean };
  notesAiPrompt: { [key: string]: string };
  notesAiSuggestions: { [key: string]: string };
  showNotesAiSuggestions: { [key: string]: boolean };
  onShowNotesPromptDialog: (sectionId: string) => void;
  onCloseNotesPromptDialog: (sectionId: string) => void;
  onUpdateNotesAiPrompt: (sectionId: string, prompt: string) => void;
  onImproveNotesWithAI: (sectionId: string) => void;
  onApplyNotesAiSuggestions: (sectionId: string) => void;
  onDismissNotesAiSuggestions: (sectionId: string) => void;
}

const SectionItem = React.memo(({ 
  section, 
  isCollapsed, 
  onToggleCollapse, 
  onToggleSubsection, 
  onToggleQuestion, 
  onToggleFlagged, 
  onAddCustomQuestion, 
  onRemoveCustomQuestion, 
  onUpdateNotes, 
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onDeleteSection,
  editingSection,
  editingQuestions,
  editingTitle,
  onUpdateEditingQuestions,
  onUpdateEditingTitle,
  onStartEditingQuestion,
  onSaveEditingQuestion,
  onCancelEditingQuestion,
  editingQuestionId,
  editingQuestionText,
  onUpdateEditingQuestionText,
  sectionRef,
  isReorderMode,
  isDragging,
  isDragOver,
  onLongPressStart,
  onLongPressEnd,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  // Question reorder props
  isQuestionReorderMode,
  questionReorderContext,
  onEnterQuestionReorderMode,
  onExitQuestionReorderMode,
  // @dnd-kit props
  sensors,
  handleQuestionDragStart,
  handleQuestionDragMove,
  handleQuestionDragEnd,
  // Preview props for drag-to-indent
  dragPreview,
  // AI-related props
  isAILoading,
  aiSuggestions,
  showAISuggestions,
  showPromptDialog,
  aiPrompt,
  onShowPromptDialog,
  onClosePromptDialog,
  onUpdateAIPrompt,
  onImproveQuestionsWithAI,
  onApplyAISuggestions,
  onDismissAISuggestions,
  // Notes AI props
  showNotesPromptDialog,
  notesAiPrompt,
  notesAiSuggestions,
  showNotesAiSuggestions,
  onShowNotesPromptDialog,
  onCloseNotesPromptDialog,
  onUpdateNotesAiPrompt,
  onImproveNotesWithAI,
  onApplyNotesAiSuggestions,
  onDismissNotesAiSuggestions
}: SectionItemProps) => {
  // Alias for easier use in this component
  const exitQuestionReorderMode = onExitQuestionReorderMode;
  return (
    <div
      ref={sectionRef}
      draggable={isReorderMode}
      onDragStart={(e) => onDragStart(e, section.id)}
      onDragOver={(e) => onDragOver(e, section.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, section.id)}
      className={`glass-card-gradient rounded-xl border-2 transition-all duration-300 w-full ${
        section.isSelected ? 'border-blue-400/50' : 'border-white/10 opacity-80 hover:opacity-100'
      } ${isReorderMode ? 'shake-animation cursor-move' : ''} ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'border-blue-500 scale-105' : ''}`}
      style={{
        animationName: isReorderMode ? 'shake' : 'none',
        animationDuration: isReorderMode ? '1.6s' : '0s',
        animationTimingFunction: isReorderMode ? 'ease-in-out' : 'ease',
        animationIterationCount: isReorderMode ? 'infinite' : '0',
        animationDelay: isReorderMode ? `${(section.id.charCodeAt(0) % 5) * 0.1}s` : '0s'
      }}
    >
      {/* Section Header */}
      <div 
        className="p-6 border-b border-white/10"
        onMouseDown={!isReorderMode ? () => onLongPressStart(section.id) : undefined}
        onMouseUp={!isReorderMode ? onLongPressEnd : undefined}
        onMouseLeave={!isReorderMode ? onLongPressEnd : undefined}
        onTouchStart={!isReorderMode ? () => onLongPressStart(section.id) : undefined}
        onTouchEnd={!isReorderMode ? onLongPressEnd : undefined}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingSection === section.id ? (
              <input
                type="text"
                value={editingTitle[section.id] || section.title}
                onChange={(e) => onUpdateEditingTitle(section.id, e.target.value)}
                className="w-full p-3 text-xl font-medium bg-gray-100 text-black rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter section title..."
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-4">
                <span className={`text-xl font-medium ${section.isSelected ? 'text-blue-400' : 'text-blue-400/60'} uppercase w-16 flex-shrink-0`}>
                  {section.title.split('.')[0]}.
                </span>
                <h2 className={`apple-subtitle text-xl uppercase text-left leading-tight ${section.isSelected ? 'text-white' : 'text-white/60'}`}>
                  {section.title.split('.').slice(1).join('.').trim()}
                </h2>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Reorder Questions Button - Click to toggle on/off */}
            {!isCollapsed && section.questions && section.questions.length > 1 && (
              <button
                onClick={() => {
                  if (isQuestionReorderMode && questionReorderContext?.sectionId === section.id) {
                    // If already in reorder mode for this section, exit
                    exitQuestionReorderMode();
                  } else {
                    // Enter reorder mode for this section
                    onEnterQuestionReorderMode(section.id);
                  }
                }}
                className={`${
                  isQuestionReorderMode && questionReorderContext?.sectionId === section.id
                    ? 'text-purple-400 bg-purple-500/20 ring-2 ring-purple-400/50'
                    : 'text-white/60 hover:text-white/80'
                } transition-colors apple-focus p-2 rounded-lg hover:bg-white/5`}
                title={
                  isQuestionReorderMode && questionReorderContext?.sectionId === section.id
                    ? "Click to exit question reorder mode"
                    : "Reorder questions in this section"
                }
              >
                🔀
              </button>
            )}
            <button
              onClick={() => onStartEditing(section.id)}
              className="text-white/60 hover:text-white/80 transition-colors apple-focus p-2 rounded-lg hover:bg-white/5"
              title="Edit questions"
            >
              ✏️
            </button>
            <button
              onClick={(e) => onDeleteSection(section.id, e)}
              className="text-red-400 hover:text-red-300 transition-colors apple-focus p-2 rounded-lg hover:bg-red-500/10"
              title="Delete section"
            >
              🗑️
            </button>
            <button
              onClick={() => onToggleCollapse(section.id)}
              className="text-white/60 hover:text-white/80 transition-colors apple-focus p-2 rounded-lg hover:bg-white/5"
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && section.isSelected && (
        <div className="p-4">
          {/* Main Section Questions */}
          {editingSection === section.id ? (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-white/60 mb-3 underline">Edit Questions:</h4>
              
              <div className="relative">
                <textarea
                  value={editingQuestions[section.id] || ''}
                  onChange={(e) => onUpdateEditingQuestions(section.id, e.target.value)}
                  placeholder="Enter questions, one per line..."
                  className="w-full p-4 border border-gray-300 rounded-md text-sm resize-y min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-black pr-12"
                />
                
                {/* Sparkle Button */}
                <button
                  onClick={() => onShowPromptDialog(section.id)}
                  disabled={isAILoading || !editingQuestions[section.id]?.trim()}
                  className="absolute top-2 right-2 p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                  title="Improve questions with AI"
                >
                  {isAILoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-white text-lg">✨</span>
                  )}
                </button>
              </div>

              {/* AI Prompt Dialog */}
              {showPromptDialog[section.id] && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-400/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-blue-200">✨ AI Prompt</h5>
                    <button
                      onClick={() => onClosePromptDialog(section.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-blue-300/80 mb-3">
                    Describe how you want the AI to improve your questions. Be specific about the tone, focus, or legal approach you want.
                  </p>
                  <textarea
                    value={aiPrompt[section.id] || ''}
                    onChange={(e) => onUpdateAIPrompt(section.id, e.target.value)}
                    placeholder="e.g., 'Make these questions more aggressive and direct for cross-examination' or 'Focus on establishing timeline and sequence of events'"
                    className="w-full p-3 border border-blue-300/50 rounded-md text-sm bg-blue-900/10 text-blue-100 resize-y min-h-[100px] mb-3"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onImproveQuestionsWithAI(section.id)}
                      disabled={isAILoading || !aiPrompt[section.id]?.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm"
                      title="AI will automatically sanitize personal information before processing"
                    >
                      {isAILoading ? 'Generating...' : '✨ Generate Questions'}
                    </button>
                    <button
                      onClick={() => onClosePromptDialog(section.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 mt-3">
                <button
                  onClick={() => onSaveEditing(section.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={onCancelEditing}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            section.questions && section.questions.length > 0 && (
              <div className="mb-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleQuestionDragStart}
                  onDragMove={handleQuestionDragMove}
                  onDragEnd={handleQuestionDragEnd}
                >
                  <SortableContext
                    items={section.questions.map(q => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-6">
                      {section.questions.map((question) => (
                        <SortableQuestionItem
                          key={question.id}
                          question={question}
                          onToggleAsked={(questionId) => onToggleQuestion(section.id, questionId)}
                          onToggleFlagged={(questionId) => onToggleFlagged(section.id, questionId)}
                          onEditQuestion={(questionId) => onStartEditingQuestion(section.id, questionId)}
                          onSaveQuestion={(questionId, newText) => onSaveEditingQuestion(section.id, questionId, newText)}
                          onCancelEdit={onCancelEditingQuestion}
                          isEditing={editingQuestionId === question.id}
                          editingText={editingQuestionText}
                          onUpdateEditingText={onUpdateEditingQuestionText}
                          isReorderMode={isQuestionReorderMode && questionReorderContext?.sectionId === section.id && !questionReorderContext.subsectionId}
                          dragPreview={dragPreview}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )
          )}

          {/* Main Section Custom Questions */}
          {section.customQuestions && section.customQuestions.length > 0 && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-white/60 mb-3">Custom Questions:</h4>
              <div className="space-y-6">
                {section.customQuestions.map((question) => (
                  <div key={question.id} className="flex items-start space-x-3">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3 p-2 rounded-lg">
                        <QuestionItemContent
                          question={question}
                          onToggleAsked={(questionId: string) => onToggleQuestion(section.id, questionId)}
                          onToggleFlagged={(questionId: string) => onToggleFlagged(section.id, questionId)}
                          onEditQuestion={(questionId: string) => onStartEditingQuestion(section.id, questionId)}
                          onSaveQuestion={(questionId: string, newText: string) => onSaveEditingQuestion(section.id, questionId, newText)}
                          onCancelEdit={onCancelEditingQuestion}
                          isEditing={editingQuestionId === question.id}
                          editingText={editingQuestionText}
                          onUpdateEditingText={onUpdateEditingQuestionText}
                          isReorderMode={false}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveCustomQuestion(section.id, question.id)}
                      className="text-red-400 hover:text-red-300 text-sm ml-2 apple-focus p-1 rounded flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Question Form for Main Section */}
          {(!section.customQuestions || section.customQuestions.length < 10) && (
            <div className="mb-6">
              <AddQuestionForm 
                onAdd={(text) => onAddCustomQuestion(section.id, text)}
                remainingQuestions={10 - (section.customQuestions?.length || 0)}
              />
            </div>
          )}

          {/* AI Suggestions Panel */}
          {showAISuggestions[section.id] && aiSuggestions[section.id] && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-400/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-purple-200">✨ AI Suggestions</h5>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onApplyAISuggestions(section.id)}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => onDismissAISuggestions(section.id)}
                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <textarea
                value={aiSuggestions[section.id]}
                readOnly
                className="w-full p-3 border border-purple-300/50 rounded-md text-sm bg-purple-900/10 text-purple-100 resize-y min-h-[150px]"
              />
            </div>
          )}

          {/* Section Notes */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white/60 mb-2 underline">Section Notes:</h4>
            
            <div className="relative">
            <textarea
              value={section.notes || ''}
              onChange={(e) => onUpdateNotes(section.id, e.target.value)}
              placeholder="Add notes for this section..."
                className="w-full p-3 border border-gray-300 rounded-md text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-black pr-12"
              />
              
              {/* AI Notes Button */}
              <button
                onClick={() => onShowNotesPromptDialog(section.id)}
                disabled={isAILoading || !section.notes?.trim()}
                className="absolute top-2 right-2 p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                title="Improve notes with AI"
              >
                {isAILoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-white text-lg">✨</span>
                )}
              </button>
            </div>

            {/* Notes AI Prompt Dialog */}
            {showNotesPromptDialog[section.id] && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-400/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-blue-200">✨ AI Notes Assistant</h5>
                  <button
                    onClick={() => onCloseNotesPromptDialog(section.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-blue-300/80 mb-3">
                  Ask AI to summarize, expand, or improve your notes. Be specific about what you want.
                </p>
                <textarea
                  value={notesAiPrompt[section.id] || ''}
                  onChange={(e) => onUpdateNotesAiPrompt(section.id, e.target.value)}
                  placeholder="e.g., 'Summarize these notes into key points' or 'Add more detail about the timeline' or 'Make these notes more professional'"
                  className="w-full p-3 border border-blue-300/50 rounded-md text-sm bg-blue-900/10 text-blue-100 resize-y min-h-[100px] mb-3"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      console.log('🔧 Improve Notes button clicked for section:', section.id);
                      onImproveNotesWithAI(section.id);
                    }}
                    disabled={isAILoading || !notesAiPrompt[section.id]?.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm"
                    title="AI will automatically sanitize personal information before processing"
                  >
                    {isAILoading ? 'Processing...' : '✨ Improve Notes'}
                  </button>
                  <button
                    onClick={() => onCloseNotesPromptDialog(section.id)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Notes AI Suggestions */}
            {showNotesAiSuggestions[section.id] && notesAiSuggestions[section.id] && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-400/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-purple-200">✨ AI Notes Suggestions</h5>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onApplyNotesAiSuggestions(section.id)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => onDismissNotesAiSuggestions(section.id)}
                      className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <textarea
                  value={notesAiSuggestions[section.id]}
                  readOnly
                  className="w-full p-3 border border-purple-300/50 rounded-md text-sm bg-purple-900/10 text-purple-100 resize-y min-h-[150px]"
                />
              </div>
            )}
          </div>

          {/* Subsections */}
          {section.subsections && section.subsections.map((subsection) => (
            <div key={subsection.id} className="mb-12 last:mb-0">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  checked={subsection.isSelected}
                  onChange={() => onToggleSubsection(section.id, subsection.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <h4 className={`text-lg font-bold underline capitalize ${subsection.isSelected ? 'text-white/60' : 'text-white/40'}`}>
                  {subsection.title}
                </h4>
              </div>

              {subsection.isSelected && (
                <div className="ml-6 space-y-4">
                  {/* Subsection Questions */}
                  {subsection.questions && subsection.questions.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleQuestionDragEnd}
                    >
                      <SortableContext
                        items={subsection.questions.map(q => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {subsection.questions.map((question) => (
                            <SortableQuestionItem
                              key={question.id}
                              question={question}
                              onToggleAsked={(questionId) => onToggleQuestion(section.id, questionId, subsection.id)}
                              onToggleFlagged={(questionId) => onToggleFlagged(section.id, questionId, subsection.id)}
                              onEditQuestion={(questionId) => onStartEditingQuestion(section.id, questionId, subsection.id)}
                              onSaveQuestion={(questionId, newText) => onSaveEditingQuestion(section.id, questionId, newText, subsection.id)}
                              onCancelEdit={onCancelEditingQuestion}
                              isEditing={editingQuestionId === question.id}
                              editingText={editingQuestionText}
                              onUpdateEditingText={onUpdateEditingQuestionText}
                              isReorderMode={isQuestionReorderMode && questionReorderContext?.sectionId === section.id && questionReorderContext.subsectionId === subsection.id}
                              dragPreview={dragPreview}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Subsection Custom Questions */}
                  {subsection.customQuestions && subsection.customQuestions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-white/60 mb-2">Custom Questions:</h5>
                      <div className="space-y-3">
                        {subsection.customQuestions.map((question) => (
                          <div key={question.id} className="flex items-start space-x-3">
                            <div className="flex-1">
                              <div className="flex items-start space-x-3 p-2 rounded-lg">
                                <QuestionItemContent
                                  question={question}
                                  onToggleAsked={(questionId: string) => onToggleQuestion(section.id, questionId, subsection.id)}
                                  onToggleFlagged={(questionId: string) => onToggleFlagged(section.id, questionId, subsection.id)}
                                  onEditQuestion={(questionId: string) => onStartEditingQuestion(section.id, questionId, subsection.id)}
                                  onSaveQuestion={(questionId: string, newText: string) => onSaveEditingQuestion(section.id, questionId, newText, subsection.id)}
                                  onCancelEdit={onCancelEditingQuestion}
                                  isEditing={editingQuestionId === question.id}
                                  editingText={editingQuestionText}
                                  onUpdateEditingText={onUpdateEditingQuestionText}
                                  isReorderMode={false}
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => onRemoveCustomQuestion(section.id, question.id, subsection.id)}
                              className="text-red-400 hover:text-red-300 text-sm ml-2 apple-focus p-1 rounded flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Custom Question Form for Subsection */}
                  {(!subsection.customQuestions || subsection.customQuestions.length < 10) && (
                    <AddQuestionForm 
                      onAdd={(text) => onAddCustomQuestion(section.id, text, subsection.id)}
                      remainingQuestions={10 - (subsection.customQuestions?.length || 0)}
                    />
                  )}

                  {/* Subsection Notes */}
                  <div>
                    <h5 className="text-sm font-medium text-white/60 mb-2 underline">Subsection Notes:</h5>
                    <textarea
                      value={subsection.notes || ''}
                      onChange={(e) => onUpdateNotes(section.id, e.target.value, subsection.id)}
                      placeholder="Add notes for this subsection..."
                      className="w-full p-3 border border-gray-300 rounded-md text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-black"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
SectionItem.displayName = 'SectionItem';

const FastDepositionOutlineWithDatabase = React.memo(function FastDepositionOutlineWithDatabase({ depositionId }: DepositionOutlineProps) {
  const [sections, setSections] = useState<DepositionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState<{ [key: string]: boolean }>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<{ [key: string]: string }>({});
  const [editingTitle, setEditingTitle] = useState<{ [key: string]: string }>({});
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState<string>('');
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [deleteDialogPosition, setDeleteDialogPosition] = useState<{ top: number; left: number } | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  // Question reorder states
  const [isQuestionReorderMode, setIsQuestionReorderMode] = useState(false);
  const [questionReorderContext, setQuestionReorderContext] = useState<{
    sectionId: string;
    subsectionId?: string;
  } | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [newExhibitNumber, setNewExhibitNumber] = useState('');
  const [newExhibitDescription, setNewExhibitDescription] = useState('');
  const [showAddExhibit, setShowAddExhibit] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  // AI-related state
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ [key: string]: string }>({});
  const [showAISuggestions, setShowAISuggestions] = useState<{ [key: string]: boolean }>({});
  const [showPromptDialog, setShowPromptDialog] = useState<{ [key: string]: boolean }>({});
  const [aiPrompt, setAiPrompt] = useState<{ [key: string]: string }>({});
  // Notes AI state
  const [showNotesPromptDialog, setShowNotesPromptDialog] = useState<{ [key: string]: boolean }>({});
  const [notesAiPrompt, setNotesAiPrompt] = useState<{ [key: string]: string }>({});
  const [notesAiSuggestions, setNotesAiSuggestions] = useState<{ [key: string]: string }>({});
  const [showNotesAiSuggestions, setShowNotesAiSuggestions] = useState<{ [key: string]: boolean }>({});
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualSaveRef = useRef<boolean>(false);
  const supabase = useMemo(() => createClient(), []);
  
  // Mobile panels state
  const { isTocOpen, isExhibitOpen, openToc, openExhibit, closeAll } = useMobilePanels();
  const pathname = usePathname();
  
  // Configure @dnd-kit sensors for drag-and-drop (both mouse and touch)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms press before drag activates (prevents accidental drags while scrolling)
        tolerance: 5, // Allow 5px of movement during the delay
      },
    })
  );

  // Track cumulative horizontal drag movement for indentation
  const [dragHorizontalMovement, setDragHorizontalMovement] = useState<number>(0);
  
  // Preview state for drag-to-indent snap functionality
  const [dragPreview, setDragPreview] = useState<{
    isActive: boolean;
    targetIndentLevel: number;
    targetPosition: number;
    draggedQuestionId: string;
  } | null>(null);

  // Handle question drag start to track initial position
  const handleQuestionDragStart = useCallback((event: DragStartEvent) => {
    // Reset movement tracking
    setDragHorizontalMovement(0);
    
    // Get the initial position of the dragged element
    const activeElement = document.querySelector(`[data-id="${event.active.id}"]`);
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      console.log(`🎯 Drag start: position=${rect.left}, ${rect.top}`);
    }
  }, []);

  // Handle question drag move to track horizontal movement
  const handleQuestionDragMove = useCallback((event: DragMoveEvent) => {
    if (event.delta) {
      // event.delta.x is already cumulative from drag start, use it directly
      const horizontalMovement = event.delta.x;
      console.log(`🔄 Drag move: cumulative delta=${horizontalMovement}px`);
      
      // Calculate preview indentation level
      const indentSteps = Math.round(horizontalMovement / 50);
      
      // Find the current question being dragged
      const currentQuestion = sections.find(s => 
        s.questions?.some(q => q.id === event.active.id) ||
        s.subsections?.some(sub => sub.questions?.some(q => q.id === event.active.id))
      )?.questions?.find(q => q.id === event.active.id) ||
      sections.find(s => 
        s.subsections?.some(sub => sub.questions?.some(q => q.id === event.active.id))
      )?.subsections?.find(sub => 
        sub.questions?.some(q => q.id === event.active.id)
      )?.questions?.find(q => q.id === event.active.id);
      
      const previewIndentLevel = Math.max(0, Math.min(3, 
        (currentQuestion?.indentLevel || 0) + indentSteps
      ));
      
      // Update preview state
      setDragPreview({
        isActive: true,
        targetIndentLevel: previewIndentLevel,
        targetPosition: horizontalMovement,
        draggedQuestionId: event.active.id as string
      });
      
      // Store the cumulative horizontal movement directly
      setDragHorizontalMovement(horizontalMovement);
    }
  }, [sections]);

  // Handle question drag end with drag-to-indent functionality
  const handleQuestionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Always process indentation if there's horizontal movement, regardless of drop target
    if (!questionReorderContext) return;
    
    setSections(prevSections => {
      const newSections = [...prevSections];
      const sectionIndex = newSections.findIndex(s => s.id === questionReorderContext.sectionId);
      
      if (sectionIndex === -1) return prevSections;
      
      const section = newSections[sectionIndex];
      
      // Determine if we're reordering in a subsection or main section
      const questions = questionReorderContext.subsectionId
        ? section.subsections?.find(sub => sub.id === questionReorderContext.subsectionId)?.questions
        : section.questions;
      
      if (!questions) return prevSections;
      
      const oldIndex = questions.findIndex(q => q.id === active.id);
      if (oldIndex === -1) return prevSections;
      
      const movedQuestion = questions[oldIndex];
      
      // Calculate indentation based on cumulative horizontal movement
      // Use dragPreview position (most up-to-date) or fallback to dragHorizontalMovement state
      const horizontalMovement = dragPreview?.targetPosition ?? dragHorizontalMovement;
      
      // Calculate indent level based on horizontal movement
      // Each 50px of horizontal movement = 1 indent level
      const indentSteps = Math.round(horizontalMovement / 50);
      
      // Apply indent steps to current level
      // Positive movement (right) increases indent, negative (left) decreases
      const targetIndentLevel = Math.max(0, Math.min(3, (movedQuestion.indentLevel || 0) + indentSteps));
      
      // Only reorder if there's a valid drop target
      if (over && active.id !== over.id) {
        const newIndex = questions.findIndex(q => q.id === over.id);
        if (newIndex !== -1) {
          // Reorder the questions array
          const reorderedQuestions = [...questions];
          reorderedQuestions.splice(oldIndex, 1);
          
          const reorderedQuestion = {
            ...movedQuestion,
            indentLevel: targetIndentLevel
          };
          
          reorderedQuestions.splice(newIndex, 0, reorderedQuestion);
          
          // Update the section with reordered questions
          if (questionReorderContext.subsectionId) {
            const subsectionIndex = section.subsections?.findIndex(sub => sub.id === questionReorderContext.subsectionId);
            if (subsectionIndex !== undefined && subsectionIndex !== -1 && section.subsections) {
              newSections[sectionIndex] = {
                ...section,
                subsections: section.subsections.map((sub, idx) =>
                  idx === subsectionIndex ? { ...sub, questions: reorderedQuestions } : sub
                ),
              };
            }
          } else {
            newSections[sectionIndex] = {
              ...section,
              questions: reorderedQuestions,
            };
          }
          
          console.log(`✅ Question reordered and moved to indent level ${targetIndentLevel}! (horizontal: ${horizontalMovement}px, steps: ${indentSteps}, original: ${movedQuestion.indentLevel || 0})`);
        }
      } else {
        // No valid drop target, just update indentation without reordering
        const updatedQuestions = questions.map(q => 
          q.id === active.id 
            ? { ...q, indentLevel: targetIndentLevel }
            : q
        );
        
        // Update the section with updated questions
        if (questionReorderContext.subsectionId) {
          const subsectionIndex = section.subsections?.findIndex(sub => sub.id === questionReorderContext.subsectionId);
          if (subsectionIndex !== undefined && subsectionIndex !== -1 && section.subsections) {
            newSections[sectionIndex] = {
              ...section,
              subsections: section.subsections.map((sub, idx) =>
                idx === subsectionIndex ? { ...sub, questions: updatedQuestions } : sub
              ),
            };
          }
        } else {
          newSections[sectionIndex] = {
            ...section,
            questions: updatedQuestions,
          };
        }
        
        console.log(`✅ Question indentation updated to level ${targetIndentLevel}! (horizontal: ${horizontalMovement}px, steps: ${indentSteps}, original: ${movedQuestion.indentLevel || 0})`);
      }
      
      // Debug outdent specifically
      if (horizontalMovement < 0) {
        console.log(`🔄 OUTDENT ATTEMPT: horizontal=${horizontalMovement}px, steps=${indentSteps}, original=${movedQuestion.indentLevel || 0}, new=${targetIndentLevel}`);
      }
      
      return newSections;
    });
    
    // Reset horizontal movement tracking and preview state
    setDragHorizontalMovement(0);
    setDragPreview(null);
  }, [questionReorderContext, dragPreview, dragHorizontalMovement]);

  
  // Close drawers on route change
  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  // Save progress to database
  const saveProgressToDatabase = useCallback(async (sections: DepositionSection[], exhibitsList?: Exhibit[], timerData?: { elapsedTime: number; isRunning: boolean }) => {
    if (!depositionId) return false;
    
    try {
      setSaveStatus('saving');
      
      // Create a sanitized version of sections for database storage
      // Remove indentLevel from questions as it's a UI-only property
      const sanitizedSections = sections.map(section => ({
        ...section,
        questions: section.questions?.map(question => {
          const { indentLevel: _, ...questionWithoutIndent } = question;
          return questionWithoutIndent;
        }) || [],
        subsections: section.subsections?.map(subsection => ({
          ...subsection,
          questions: subsection.questions?.map(question => {
            const { indentLevel: _, ...questionWithoutIndent } = question;
            return questionWithoutIndent;
          }) || []
        }))
      }));
      
      const progressData = {
        sections: sanitizedSections,
        exhibits: exhibitsList || exhibits,
        timer: timerData || { elapsedTime, isRunning: isTimerRunning },
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      const { error } = await supabase.rpc('save_deposition_progress', {
        p_deposition_id: depositionId,
        p_progress_data: progressData
      });

      if (error) {
        console.error('Error saving to database:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        setSaveStatus('unsaved');
        return false;
      }

      const timestamp = new Date();
      setLastSaved(timestamp);
      setSaveStatus('saved');
      
      // Also save to localStorage as backup
      localStorage.setItem(`deposition-outline-${depositionId}`, JSON.stringify(sections));
      localStorage.setItem(`deposition-outline-timestamp-${depositionId}`, timestamp.toISOString());
      
      return true;
    } catch (error) {
      console.error('Failed to save progress:', error);
      setSaveStatus('unsaved');
      return false;
    }
  }, [depositionId, supabase, exhibits, elapsedTime, isTimerRunning]);

  // Load progress from database
  const loadProgressFromDatabase = useCallback(async () => {
    if (!depositionId) return null;
    
    try {
      const { data, error } = await supabase.rpc('get_deposition_progress_optimized', {
        p_deposition_id: depositionId
      });

      if (error) {
        console.error('Error loading from database:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0].progress_data;
      }

      return null;
    } catch (error) {
      console.error('Failed to load progress:', error);
      return null;
    }
  }, [depositionId, supabase]);

  // Load deposition data and restore saved state on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load fresh data first
        const freshData = depositionOutlineData;
        
        // In development mode, skip database and use mock data directly
        if (process.env.NODE_ENV === 'development') {
          setSections(freshData);
          setIsLoading(false);
          return;
        }
        
        // Try to load from database first
        const savedProgress = await loadProgressFromDatabase();
        
        if (savedProgress && savedProgress.sections) {
          // IMPORTANT: Use saved sections order, not template order!
          // This preserves the user's custom section ordering
          const mergedSections = savedProgress.sections.map((savedSection: any) => {
            const originalSection = freshData.find((s) => s.id === savedSection.id);
            
            if (originalSection) {
              // Merge to get latest question text from template while keeping saved state
              const mergedQuestions = originalSection.questions?.map(originalQuestion => {
                const savedQuestion = savedSection.questions?.find((q: any) => q.id === originalQuestion.id);
                if (savedQuestion) {
                  return { 
                    ...savedQuestion, 
                    text: originalQuestion.text,
                    indentLevel: savedQuestion.indentLevel || 0 // Restore indentLevel, default to 0
                  };
                }
                return { ...originalQuestion, indentLevel: 0 }; // Add default indentLevel for new questions
              }) || [];

              const mergedSubsections = originalSection.subsections?.map(originalSubsection => {
                const savedSubsection = savedSection.subsections?.find((s: any) => s.id === originalSubsection.id);
                if (savedSubsection) {
                  const mergedSubsectionQuestions = originalSubsection.questions?.map(originalQuestion => {
                    const savedQuestion = savedSubsection.questions?.find((q: any) => q.id === originalQuestion.id);
                    if (savedQuestion) {
                      return { 
                        ...savedQuestion, 
                        text: originalQuestion.text,
                        indentLevel: savedQuestion.indentLevel || 0 // Restore indentLevel, default to 0
                      };
                    }
                    return { ...originalQuestion, indentLevel: 0 }; // Add default indentLevel for new questions
                  }) || [];

                  return { ...savedSubsection, questions: mergedSubsectionQuestions };
                }
                return originalSubsection;
              }) || [];

              return { ...savedSection, questions: mergedQuestions, subsections: mergedSubsections };
            }
            // If section not found in template, keep the saved section as-is
            return savedSection;
          });
          
          setSections(mergedSections);
          
          // Restore exhibits if available
          if (savedProgress.exhibits) {
            setExhibits(savedProgress.exhibits);
          }
          
          // Restore timer if available
          if (savedProgress.timer) {
            setElapsedTime(savedProgress.timer.elapsedTime || 0);
            setIsTimerRunning(savedProgress.timer.isRunning || false);
          }
        } else {
          // Fallback to localStorage if no database data
          const savedState = localStorage.getItem(`deposition-outline-${depositionId || 'default'}`);
          if (savedState) {
            try {
              const parsedSections = JSON.parse(savedState);
              // Similar merge logic as above...
              setSections(parsedSections);
            } catch (error) {
              console.error('Error parsing saved state:', error);
              // Add default indentLevel to fresh data
              const freshDataWithIndent = freshData.map(section => ({
                ...section,
                questions: section.questions?.map(question => ({ ...question, indentLevel: 0 })) || [],
                subsections: section.subsections?.map(subsection => ({
                  ...subsection,
                  questions: subsection.questions?.map(question => ({ ...question, indentLevel: 0 })) || []
                }))
              }));
              setSections(freshDataWithIndent);
            }
          } else {
            // Add default indentLevel to fresh data
            const freshDataWithIndent = freshData.map(section => ({
              ...section,
              questions: section.questions?.map(question => ({ ...question, indentLevel: 0 })) || [],
              subsections: section.subsections?.map(subsection => ({
                ...subsection,
                questions: subsection.questions?.map(question => ({ ...question, indentLevel: 0 })) || []
              }))
            }));
            setSections(freshDataWithIndent);
          }
        }
        
        // Load saved timestamp
        const savedTimestamp = localStorage.getItem(`deposition-outline-timestamp-${depositionId || 'default'}`);
        if (savedTimestamp) {
          setLastSaved(new Date(savedTimestamp));
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load deposition data:', error);
        setSections(depositionOutlineData);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [depositionId, loadProgressFromDatabase]);

  // Optimized save with debouncing
  const saveToDatabase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveProgressToDatabase(sections);
    }, 1000); // Debounce for 1 second
  }, [sections, saveProgressToDatabase]);

  // Save when sections or exhibits change (skip if manual save is in progress)
  useEffect(() => {
    if (sections.length > 0 && !isManualSaveRef.current) {
      saveToDatabase();
    }
  }, [sections, saveToDatabase]);

  useEffect(() => {
    if (sections.length > 0 && depositionId && !isManualSaveRef.current) {
      saveProgressToDatabase(sections, exhibits);
    }
  }, [exhibits, sections, depositionId, saveProgressToDatabase]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // Save timer state when it changes (start/stop)
  useEffect(() => {
    if (sections.length > 0 && depositionId) {
      // Save immediately when timer starts/stops
      saveProgressToDatabase(sections, exhibits, { elapsedTime, isRunning: isTimerRunning });
    }
  }, [isTimerRunning, sections, exhibits, depositionId, elapsedTime, saveProgressToDatabase]);

  // Periodic auto-save every 30 seconds (independent of user actions)
  useEffect(() => {
    if (!depositionId || sections.length === 0) return;

    const periodicSaveInterval = setInterval(() => {
      console.log('🔄 Periodic auto-save (30s interval)');
      saveProgressToDatabase(sections, exhibits, { elapsedTime, isRunning: isTimerRunning });
    }, 30000); // Save every 30 seconds

    return () => clearInterval(periodicSaveInterval);
  }, [sections, exhibits, elapsedTime, isTimerRunning, depositionId, saveProgressToDatabase]);

  // Save before user leaves the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Attempt to save synchronously
      if (sections.length > 0 && depositionId) {
        console.log('💾 Saving before page unload...');
        saveProgressToDatabase(sections, exhibits, { elapsedTime, isRunning: isTimerRunning });
        
        // Show warning if changes might be lost
        if (saveStatus === 'unsaved' || saveStatus === 'saving') {
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
          return e.returnValue;
        }
      }
    };

    // Save when user closes/refreshes browser
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sections, exhibits, elapsedTime, isTimerRunning, depositionId, saveStatus, saveProgressToDatabase]);

  // Save when component unmounts (navigation within app)
  useEffect(() => {
    return () => {
      if (sections.length > 0 && depositionId) {
        // Silent save - no console log to reduce noise
        saveProgressToDatabase(sections, exhibits, { elapsedTime, isRunning: isTimerRunning });
      }
    };
  }, [sections, exhibits, elapsedTime, isTimerRunning, depositionId, saveProgressToDatabase]);

  // Manual save function
  const manualSave = useCallback(async () => {
    const success = await saveProgressToDatabase(sections);
    if (success) {
      console.log('Progress saved to database successfully');
    } else {
      console.error('Failed to save progress to database');
    }
  }, [sections, saveProgressToDatabase]);

  // Toggle functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isSelected: !section.isSelected }
        : section
    ));
  }, []);

  const toggleCollapse = useCallback((sectionId: string) => {
    setIsCollapsed(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const toggleSubsection = useCallback((sectionId: string, subsectionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      return {
        ...section,
        subsections: section.subsections?.map(subsection =>
          subsection.id === subsectionId
            ? { ...subsection, isSelected: !subsection.isSelected }
            : subsection
        ) || []
      };
    }));
  }, []);

  const toggleQuestion = useCallback((sectionId: string, questionId: string, subsectionId?: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      if (subsectionId) {
        return {
          ...section,
          subsections: section.subsections?.map(subsection => {
            if (subsection.id !== subsectionId) return subsection;
            
            return {
              ...subsection,
              questions: subsection.questions?.map(q => 
                q.id === questionId ? { ...q, isAsked: !q.isAsked } : q
              ) || []
            };
          }) || []
        };
      } else {
        return {
          ...section,
          questions: section.questions?.map(q => 
            q.id === questionId ? { ...q, isAsked: !q.isAsked } : q
          ) || []
        };
      }
    }));
  }, []);

  const toggleFlagged = useCallback((sectionId: string, questionId: string, subsectionId?: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      if (subsectionId) {
        return {
          ...section,
          subsections: section.subsections?.map(subsection => {
            if (subsection.id !== subsectionId) return subsection;
            
            return {
              ...subsection,
              questions: subsection.questions?.map(q => 
                q.id === questionId ? { ...q, isFlagged: !q.isFlagged } : q
              ) || []
            };
          }) || []
        };
      } else {
        return {
          ...section,
          questions: section.questions?.map(q => 
            q.id === questionId ? { ...q, isFlagged: !q.isFlagged } : q
          ) || []
        };
      }
    }));
  }, []);

  const addCustomQuestion = useCallback((sectionId: string, text: string, subsectionId?: string) => {
    const newQuestion: DepositionQuestion = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      isAsked: false,
      isFlagged: false,
      isCustom: true
    };

    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      if (subsectionId) {
        return {
          ...section,
          subsections: section.subsections?.map(subsection => {
            if (subsection.id !== subsectionId) return subsection;
            
            return {
              ...subsection,
              customQuestions: [...(subsection.customQuestions || []), newQuestion]
            };
          }) || []
        };
      } else {
        return {
          ...section,
          customQuestions: [...(section.customQuestions || []), newQuestion]
        };
      }
    }));
  }, []);

  const removeCustomQuestion = useCallback((sectionId: string, questionId: string, subsectionId?: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      if (subsectionId) {
        return {
          ...section,
          subsections: section.subsections?.map(subsection => {
            if (subsection.id !== subsectionId) return subsection;
            
            return {
              ...subsection,
              customQuestions: subsection.customQuestions?.filter(q => q.id !== questionId) || []
            };
          }) || []
        };
      } else {
        return {
          ...section,
          customQuestions: section.customQuestions?.filter(q => q.id !== questionId) || []
        };
      }
    }));
  }, []);

  const updateNotes = useCallback((sectionId: string, notes: string, subsectionId?: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      if (subsectionId) {
        return {
          ...section,
          subsections: section.subsections?.map(subsection => {
            if (subsection.id !== subsectionId) return subsection;
            
            return { ...subsection, notes };
          }) || []
        };
      } else {
        return { ...section, notes };
      }
    }));
  }, []);

  const startEditing = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const questionsText = section.questions?.map(q => q.text).join('\n') || '';
    setEditingQuestions({ [sectionId]: questionsText });
    setEditingTitle({ [sectionId]: section.title });
    setEditingSection(sectionId);
  }, [sections]);

  const saveEditing = useCallback((sectionId: string) => {
    const questionsText = editingQuestions[sectionId];
    const titleText = editingTitle[sectionId];
    if (!questionsText || !titleText) return;
    
    const questionLines = questionsText.split('\n').filter(line => line.trim());
    const updatedQuestions = questionLines.map((text, index) => ({
      id: `question-${sectionId}-${index}`,
      text: text.trim(),
      isAsked: false,
      isFlagged: false
    }));
    
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      return { ...section, title: titleText, questions: updatedQuestions };
    }));
    
    setEditingSection(null);
    setEditingQuestions({});
    setEditingTitle({});
  }, [editingQuestions, editingTitle]);

  const cancelEditing = useCallback(() => {
    setEditingSection(null);
    setEditingQuestions({});
    setEditingTitle({});
  }, []);

  const updateEditingQuestions = useCallback((sectionId: string, text: string) => {
    setEditingQuestions(prev => ({ ...prev, [sectionId]: text }));
  }, []);

  const updateEditingTitle = useCallback((sectionId: string, text: string) => {
    setEditingTitle(prev => ({ ...prev, [sectionId]: text }));
  }, []);

  // AI-related functions
  const showPromptDialogForSection = useCallback((sectionId: string) => {
    setShowPromptDialog(prev => ({ ...prev, [sectionId]: true }));
    setAiPrompt(prev => ({ ...prev, [sectionId]: '' }));
  }, []);

  const closePromptDialog = useCallback((sectionId: string) => {
    setShowPromptDialog(prev => ({ ...prev, [sectionId]: false }));
  }, []);

  const updateAIPrompt = useCallback((sectionId: string, prompt: string) => {
    setAiPrompt(prev => ({ ...prev, [sectionId]: prompt }));
  }, []);

  const improveQuestionsWithAI = useCallback(async (sectionId: string) => {
    const currentQuestions = editingQuestions[sectionId];
    const userPrompt = aiPrompt[sectionId];
    
    if (!currentQuestions?.trim() || !userPrompt?.trim()) return;

    // Show PII warning if sensitive data might be present
    const hasPotentialPII = /(?:name|address|phone|email|ssn|social security|credit card|account|case|docket)/i.test(currentQuestions + userPrompt);
    if (hasPotentialPII) {
      const proceed = confirm(
        '⚠️ PII WARNING: Your text may contain personal information (names, addresses, phone numbers, etc.).\n\n' +
        'This data will be automatically sanitized before sending to AI, but please ensure you\'re not sharing confidential client information.\n\n' +
        'Do you want to proceed?'
      );
      if (!proceed) return;
    }

    setIsAILoading(true);
    try {
      const response = await fetch('/api/depositions-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: currentQuestions,
          context: `Section: ${sections.find(s => s.id === sectionId)?.title || 'Unknown Section'}`,
          userPrompt: userPrompt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const data = await response.json();
      setAiSuggestions(prev => ({ ...prev, [sectionId]: data.improvedQuestions }));
      setShowAISuggestions(prev => ({ ...prev, [sectionId]: true }));
      setShowPromptDialog(prev => ({ ...prev, [sectionId]: false }));
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsAILoading(false);
    }
  }, [editingQuestions, sections, aiPrompt]);

  const applyAISuggestions = useCallback((sectionId: string) => {
    const suggestions = aiSuggestions[sectionId];
    if (suggestions) {
      setEditingQuestions(prev => ({ ...prev, [sectionId]: suggestions }));
      setShowAISuggestions(prev => ({ ...prev, [sectionId]: false }));
    }
  }, [aiSuggestions]);

  const dismissAISuggestions = useCallback((sectionId: string) => {
    setShowAISuggestions(prev => ({ ...prev, [sectionId]: false }));
  }, []);

  // Notes AI functions
  const showNotesPromptDialogForSection = useCallback((sectionId: string) => {
    console.log('🔧 showNotesPromptDialogForSection called:', sectionId);
    setShowNotesPromptDialog(prev => ({ ...prev, [sectionId]: true }));
  }, []);

  const closeNotesPromptDialog = useCallback((sectionId: string) => {
    setShowNotesPromptDialog(prev => ({ ...prev, [sectionId]: false }));
    setNotesAiPrompt(prev => ({ ...prev, [sectionId]: '' }));
  }, []);

  const updateNotesAiPrompt = useCallback((sectionId: string, prompt: string) => {
    setNotesAiPrompt(prev => ({ ...prev, [sectionId]: prompt }));
  }, []);

  const improveNotesWithAI = useCallback(async (sectionId: string) => {
    console.log('🔧 Available sections:', sections.map(s => ({ id: s.id, title: s.title, hasNotes: !!s.notes })));
    const currentNotes = sections.find(s => s.id === sectionId)?.notes || '';
    const userPrompt = notesAiPrompt[sectionId];
    
    console.log('🔧 improveNotesWithAI called:', { sectionId, currentNotes, userPrompt });
    
    if (!currentNotes?.trim() || !userPrompt?.trim()) {
      console.log('🔧 Missing notes or prompt:', { currentNotes, userPrompt });
      return;
    }

    // Show PII warning if sensitive data might be present
    const hasPotentialPII = /(?:name|address|phone|email|ssn|social security|credit card|account|case|docket|client|plaintiff|defendant)/i.test(currentNotes + userPrompt);
    if (hasPotentialPII) {
      const proceed = confirm(
        '⚠️ PII WARNING: Your notes may contain personal information (names, addresses, phone numbers, etc.).\n\n' +
        'This data will be automatically sanitized before sending to AI, but please ensure you\'re not sharing confidential client information.\n\n' +
        'Do you want to proceed?'
      );
      if (!proceed) return;
    }

    setIsAILoading(true);
    try {
      const requestBody = {
        questions: currentNotes,
        userPrompt: userPrompt,
        context: 'notes_improvement'
      };
      
      console.log('🔧 Sending request:', requestBody);
      
      const response = await fetch('/api/depositions-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('🔧 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔧 Response data:', data);
        setNotesAiSuggestions(prev => ({ ...prev, [sectionId]: data.improvedQuestions }));
        setShowNotesAiSuggestions(prev => ({ ...prev, [sectionId]: true }));
        closeNotesPromptDialog(sectionId);
      } else {
        const errorText = await response.text();
        console.error('🔧 API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('🔧 AI notes improvement error:', error);
    } finally {
      setIsAILoading(false);
    }
  }, [sections, notesAiPrompt, closeNotesPromptDialog]);

  const applyNotesAiSuggestions = useCallback((sectionId: string) => {
    const suggestions = notesAiSuggestions[sectionId];
    if (suggestions) {
      // Update the section notes with AI suggestions
      const updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { ...section, notes: suggestions }
          : section
      );
      setSections(updatedSections);
      setShowNotesAiSuggestions(prev => ({ ...prev, [sectionId]: false }));
    }
  }, [notesAiSuggestions, sections]);

  const dismissNotesAiSuggestions = useCallback((sectionId: string) => {
    setShowNotesAiSuggestions(prev => ({ ...prev, [sectionId]: false }));
  }, []);

  const startEditingQuestion = useCallback((sectionId: string, questionId: string, subsectionId?: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    let question;
    if (subsectionId) {
      const subsection = section.subsections?.find(sub => sub.id === subsectionId);
      question = subsection?.questions?.find(q => q.id === questionId);
    } else {
      question = section.questions?.find(q => q.id === questionId);
    }
    
    if (question) {
      setEditingQuestionId(questionId);
      setEditingQuestionText(question.text);
    }
  }, [sections]);

  const saveEditingQuestion = useCallback((sectionId: string, questionId: string, newText: string, subsectionId?: string) => {
    if (!newText.trim()) return;
    
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      if (subsectionId) {
        return {
          ...section,
          subsections: section.subsections?.map(subsection => {
            if (subsection.id !== subsectionId) return subsection;
            
            return {
              ...subsection,
              questions: subsection.questions?.map(q => 
                q.id === questionId ? { ...q, text: newText.trim() } : q
              ) || []
            };
          }) || []
        };
      } else {
        return {
          ...section,
          questions: section.questions?.map(q => 
            q.id === questionId ? { ...q, text: newText.trim() } : q
          ) || []
        };
      }
    }));
    
    setEditingQuestionId(null);
    setEditingQuestionText('');
  }, []);

  const cancelEditingQuestion = useCallback(() => {
    setEditingQuestionId(null);
    setEditingQuestionText('');
  }, []);

  const updateEditingQuestionText = useCallback((text: string) => {
    setEditingQuestionText(text);
  }, []);

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const sectionElement = sectionRefs.current[sectionId];
    
    if (sectionElement) {
      // Calculate offset for better positioning (account for fixed header)
      const offset = 120; // Adjust this value based on your header height
      const elementPosition = sectionElement.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      // Smooth scroll to section with offset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Temporarily highlight the section for visual feedback
      sectionElement.style.transition = 'all 0.3s ease';
      sectionElement.style.transform = 'scale(1.02)';
      sectionElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
      
      setTimeout(() => {
        sectionElement.style.transform = 'scale(1)';
        sectionElement.style.boxShadow = '';
      }, 1000);
    }
  }, []);

  const setSectionRef = useCallback((sectionId: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[sectionId] = el;
  }, []);

  // Progress calculation
  const progress = useMemo(() => {
    const selectedSections = sections.filter(s => s.isSelected);
    let totalQuestions = 0;
    let askedQuestions = 0;

    selectedSections.forEach(section => {
      if (section.questions) {
        totalQuestions += section.questions.length;
        askedQuestions += section.questions.filter(q => q.isAsked).length;
      }
      
      if (section.customQuestions) {
        totalQuestions += section.customQuestions.length;
        askedQuestions += section.customQuestions.filter(q => q.isAsked).length;
      }
      
      const selectedSubsections = section.subsections?.filter(sub => sub.isSelected) || [];
      selectedSubsections.forEach(sub => {
        totalQuestions += sub.questions.length;
        askedQuestions += sub.questions.filter(q => q.isAsked).length;
        
        totalQuestions += sub.customQuestions.length;
        askedQuestions += sub.customQuestions.filter(q => q.isAsked).length;
      });
    });

    return { totalQuestions, askedQuestions, percentage: totalQuestions > 0 ? Math.round((askedQuestions / totalQuestions) * 100) : 0 };
  }, [sections]);

  // Reset progress function with confirmation and section reordering
  const resetProgress = useCallback(async () => {
    // Ask for confirmation before resetting
    const confirmed = window.confirm(
      '⚠️ Reset Progress?\n\nThis will:\n• Uncheck all questions\n• Remove all flags\n• Reorder sections to original order\n• Keep your notes and custom questions\n\nAre you sure you want to continue?'
    );
    
    if (!confirmed) {
      return; // User cancelled, don't reset
    }

    try {
      // Get the original section order from the template data
      const originalSections = depositionOutlineData;
      
      // Reset progress and reorder sections to original order
      const resetSections = originalSections.map(originalSection => {
        // Find the current section data to preserve notes and custom questions
        const currentSection = sections.find(s => s.id === originalSection.id);
        
        if (currentSection) {
          // Merge original structure with preserved user data
          return {
            ...originalSection,
            // Preserve user's notes
            notes: currentSection.notes || '',
            // Preserve custom questions but reset their state
            customQuestions: currentSection.customQuestions?.map(q => ({ 
              ...q, 
              isAsked: false, 
              isFlagged: false 
            })) || [],
            // Reset all questions to unasked/unflagged
            questions: originalSection.questions?.map(q => ({ 
              ...q, 
              isAsked: false, 
              isFlagged: false 
            })) || [],
            // Reset subsections
            subsections: originalSection.subsections?.map(originalSub => {
              const currentSub = currentSection.subsections?.find(s => s.id === originalSub.id);
              return {
                ...originalSub,
                notes: currentSub?.notes || '',
                customQuestions: currentSub?.customQuestions?.map(q => ({ 
                  ...q, 
                  isAsked: false, 
                  isFlagged: false 
                })) || [],
                questions: originalSub.questions?.map(q => ({ 
                  ...q, 
                  isAsked: false, 
                  isFlagged: false 
                })) || []
              };
            }) || []
          };
        } else {
          // If section not found in current data, use original with reset state
          return {
            ...originalSection,
            questions: originalSection.questions?.map(q => ({ 
              ...q, 
              isAsked: false, 
              isFlagged: false 
            })) || [],
            customQuestions: [],
            subsections: originalSection.subsections?.map(sub => ({
              ...sub,
              questions: sub.questions?.map(q => ({ 
                ...q, 
                isAsked: false, 
                isFlagged: false 
              })) || [],
              customQuestions: []
            })) || []
          };
        }
      });

      // Update the sections state with reset and reordered data
      setSections(resetSections);
      
      // Save the reset progress to database
      const success = await saveProgressToDatabase(resetSections);
      
      if (success) {
        console.log('✅ Progress reset: All questions unchecked, flags removed, and sections reordered to original order');
        setSaveStatus('saved');
      } else {
        console.error('❌ Failed to save reset progress to database');
        setSaveStatus('unsaved');
      }
      
    } catch (error) {
      console.error('❌ Error during reset progress:', error);
      setSaveStatus('unsaved');
    }
  }, [sections, saveProgressToDatabase]);

  // Add new section function
  const addNewSection = useCallback(() => {
    const nextSectionNumber = sections.length + 1;
    const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][nextSectionNumber - 1] || `${nextSectionNumber}`;
    
    const newSection: DepositionSection = {
      id: `section-${Date.now()}`,
      title: `${romanNumeral}. NEW SECTION`,
      isSelected: true,
      questions: [],
      customQuestions: [],
      subsections: [],
      notes: ''
    };
    
    setSections(prev => [...prev, newSection]);
    setIsCollapsed(prev => ({ ...prev, [newSection.id]: false }));
  }, [sections]);

  // Delete section function
  const deleteSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
    setDeletingSection(null);
  }, []);

  // Long press handlers for reorder mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLongPressStart = useCallback((sectionId: string) => {
    if (editingSection) return; // Don't enter reorder mode while editing
    
    longPressTimerRef.current = setTimeout(() => {
      setIsReorderMode(true);
      // Haptic feedback (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // Reduced to 500ms for faster response
  }, [editingSection]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const exitReorderMode = useCallback(() => {
    setIsReorderMode(false);
    setDraggedSection(null);
    setDragOverSection(null);
  }, []);

  // Drag handlers for reordering
  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
    if (!isReorderMode) {
      e.preventDefault(); // Prevent drag if not in reorder mode
      return;
    }
    console.log('🚀 Drag started for section:', sectionId);
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  }, [isReorderMode]);

  const handleDragOver = useCallback((e: React.DragEvent, sectionId: string) => {
    if (!isReorderMode) return;
    e.preventDefault();
    setDragOverSection(sectionId);
  }, [isReorderMode]);

  const handleDragLeave = useCallback(() => {
    setDragOverSection(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSectionId) return;

    // Set flag to prevent auto-save interference
    isManualSaveRef.current = true;

    // Calculate new section order
    const newSections = [...sections];
    const draggedIndex = newSections.findIndex(s => s.id === draggedSection);
    const targetIndex = newSections.findIndex(s => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      isManualSaveRef.current = false;
      return;
    }

    // Remove dragged section (with all its content)
    const [removed] = newSections.splice(draggedIndex, 1);
    // Insert at new position (this moves the entire section object with all its data)
    newSections.splice(targetIndex, 0, removed);

    // Now renumber the Roman numerals to be sequential
    // The section content (questions, notes, etc.) stays with the section
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII'];
    const renumberedSections = newSections.map((section, index) => {
      const titleParts = section.title.split('.');
      if (titleParts.length > 1) {
        const newRomanNumeral = romanNumerals[index] || `${index + 1}`;
        return {
          ...section, // Keep ALL section data (questions, notes, subsections, etc.)
          title: `${newRomanNumeral}.${titleParts.slice(1).join('.')}` // Just update the Roman numeral
        };
      }
      return section;
    });

    // Update UI
    setSections(renumberedSections);
    
    // Save the new order to database immediately
    console.log('💾 Saving reordered sections:');
    renumberedSections.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.title} (ID: ${s.id})`);
    });
    await saveProgressToDatabase(renumberedSections, exhibits, { elapsedTime, isRunning: isTimerRunning });
    
    // Reset flag after a short delay to allow state to settle
    setTimeout(() => {
      isManualSaveRef.current = false;
    }, 2000);

    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, sections, saveProgressToDatabase, exhibits, elapsedTime, isTimerRunning]);

  // Question reorder handlers
  const enterQuestionReorderMode = useCallback((sectionId: string, subsectionId?: string) => {
    console.log('🎯 Entering question reorder mode for section:', sectionId);
    setIsQuestionReorderMode(true);
    setQuestionReorderContext({ sectionId, subsectionId });
  }, []);

  const exitQuestionReorderMode = useCallback(() => {
    console.log('✅ Exiting question reorder mode');
    setIsQuestionReorderMode(false);
    setQuestionReorderContext(null);
  }, []);

  // Exhibit management functions
  const addExhibit = useCallback(() => {
    if (!newExhibitNumber.trim() || !newExhibitDescription.trim()) return;

    const newExhibit: Exhibit = {
      id: `exhibit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      number: newExhibitNumber.trim(),
      description: newExhibitDescription.trim(),
      isIntroduced: false
    };

    setExhibits(prev => [...prev, newExhibit]);
    setNewExhibitNumber('');
    setNewExhibitDescription('');
    setShowAddExhibit(false);
  }, [newExhibitNumber, newExhibitDescription]);

  const toggleExhibit = useCallback((exhibitId: string) => {
    setExhibits(prev => prev.map(exhibit =>
      exhibit.id === exhibitId
        ? { ...exhibit, isIntroduced: !exhibit.isIntroduced }
        : exhibit
    ));
  }, []);

  const removeExhibit = useCallback((exhibitId: string) => {
    setExhibits(prev => prev.filter(exhibit => exhibit.id !== exhibitId));
  }, []);

  // Exhibit Tracker Content Component (reused in all drawers)
  const ExhibitTrackerContent = useCallback(() => (
    <div className="flex flex-col">
      <h3 className="apple-subtitle text-base md:text-lg mb-3 md:mb-4 text-center border-b border-white/10 pb-2">
        📋 Exhibit Tracker
      </h3>
      
      {/* Exhibit List */}
      <div className="space-y-3 mb-4">
        {exhibits.length === 0 ? (
          <p className="apple-caption text-sm text-white/60 text-center py-4">
            No exhibits added yet
          </p>
        ) : (
          exhibits.map((exhibit) => (
            <div
              key={exhibit.id}
              className={`glass-card-gradient p-3 rounded-lg transition-all duration-300 ${
                exhibit.isIntroduced ? 'border-2 border-green-400/50 bg-green-400/10' : 'border-2 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="checkbox"
                    checked={exhibit.isIntroduced}
                    onChange={() => toggleExhibit(exhibit.id)}
                    className="h-4 w-4 text-green-400 focus:ring-0 border-white/20 rounded bg-white/5"
                  />
                  <span className={`apple-body text-sm font-semibold ${exhibit.isIntroduced ? 'text-green-300' : 'text-blue-300'}`}>
                    Exhibit {exhibit.number}
                  </span>
                </div>
                <button
                  onClick={() => removeExhibit(exhibit.id)}
                  className="text-red-400 hover:text-red-300 text-sm apple-focus p-1 rounded"
                  title="Remove exhibit"
                >
                  ✕
                </button>
              </div>
              <p className={`apple-caption text-xs ml-6 ${exhibit.isIntroduced ? 'text-white/80' : 'text-white/60'}`}>
                {exhibit.description}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Exhibit Form */}
      {!showAddExhibit ? (
        <button
          onClick={() => setShowAddExhibit(true)}
          className="w-full glass-button px-4 py-2 text-sm font-medium rounded-xl text-white apple-focus group hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Exhibit</span>
        </button>
      ) : (
        <div className="glass-card-gradient p-4 rounded-xl space-y-3">
          <input
            type="text"
            value={newExhibitNumber}
            onChange={(e) => setNewExhibitNumber(e.target.value)}
            placeholder="Exhibit # (e.g., 4)"
            className="glass-input w-full px-3 py-2 text-sm apple-body apple-focus rounded-lg"
            autoFocus
          />
          <input
            type="text"
            value={newExhibitDescription}
            onChange={(e) => setNewExhibitDescription(e.target.value)}
            placeholder="Description (e.g., Maintenance Logs)"
            className="glass-input w-full px-3 py-2 text-sm apple-body apple-focus rounded-lg"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addExhibit();
              }
            }}
          />
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowAddExhibit(false);
                setNewExhibitNumber('');
                setNewExhibitDescription('');
              }}
              className="flex-1 text-white/60 hover:text-white/80 apple-focus px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-300 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={addExhibit}
              disabled={!newExhibitNumber.trim() || !newExhibitDescription.trim()}
              className="flex-1 glass-button px-3 py-2 text-sm font-medium rounded-lg text-white apple-focus group hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Exhibit Summary */}
      {exhibits.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="apple-caption text-xs text-center text-white/60">
            {exhibits.filter(e => e.isIntroduced).length} of {exhibits.length} introduced
          </p>
        </div>
      )}
    </div>
  ), [exhibits, showAddExhibit, newExhibitNumber, newExhibitDescription, toggleExhibit, removeExhibit, addExhibit]);

  if (isLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen relative">
      {/* Apple-style Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/15 via-transparent to-blue-900/15"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
      </div>
      <div className="relative z-10 glass-float p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="apple-body text-white/80">Loading deposition outline...</p>
      </div>
    </div>
  );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Drag Preview Overlay */}
      <DragPreviewOverlay preview={dragPreview} />
      
      {/* Apple-style Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/15 via-transparent to-blue-900/15"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/15 to-blue-500/15 rounded-full blur-3xl apple-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl apple-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-full blur-2xl apple-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Header with Save Status */}
      <div className="relative z-10 glass-float mx-auto max-w-5xl px-4 mt-4 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="apple-title text-3xl">Deposition Outline</h1>
            
            
            {/* Desktop Controls */}
            <div className="flex items-center space-x-3 sm:space-x-6 order-2 sm:order-3">
              <div className="flex flex-col items-end">
                <span className={`apple-body text-xs sm:text-sm font-medium ${
                  saveStatus === 'saved' ? 'text-green-400' : 
                  saveStatus === 'saving' ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {saveStatus === 'saved' ? '✓ All Changes Saved' : 
                   saveStatus === 'saving' ? '💾 Saving...' : 
                   '⚠️ Unsaved Changes'}
                </span>
                {lastSaved && (
                  <span className="apple-caption text-xs text-white/60">
                    {lastSaved.toLocaleTimeString()} • Auto-saves every 30s
                  </span>
                )}
              </div>
              <button
                onClick={manualSave}
                className="glass-button px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-xl text-white apple-focus group hover:scale-105 transition-all duration-300"
              >
                <span className="group-hover:scale-105 transition-transform duration-300">
                  Save Now
                </span>
              </button>
              {isReorderMode && (
                <button
                  onClick={exitReorderMode}
                  className="glass-button px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-xl text-white apple-focus group hover:scale-105 transition-all duration-300 bg-green-500/20 border border-green-400/30"
                >
                  <span className="group-hover:scale-105 transition-transform duration-300">
                    Done Reordering
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reorder Mode Overlay Message */}
      {isReorderMode && (
        <div className="relative z-10 glass-float mx-auto max-w-5xl px-4 mb-6 bg-blue-500/20 border border-blue-400/30">
          <div className="p-4 text-center">
            <p className="apple-body text-blue-300 text-sm">
              🔄 Reorder Mode Active - Click and drag any section to move it, then click &ldquo;Done Reordering&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Question Reorder Mode Overlay Message */}
      {isQuestionReorderMode && (
        <>
          <div className="relative z-10 glass-float mx-auto max-w-5xl px-4 mb-6 bg-purple-500/20 border border-purple-400/30">
            <div className="p-4 text-center flex items-center justify-between">
              <p className="apple-body text-purple-300 text-sm flex-1">
                🎯 Question Reorder Mode Active - Drag questions to reorder them
              </p>
              <button
                onClick={exitQuestionReorderMode}
                className="glass-button px-4 py-2 text-sm font-medium rounded-xl text-white apple-focus hover:scale-105 transition-all duration-300 bg-green-500/20 border border-green-400/30"
              >
                Done Reordering
              </button>
            </div>
          </div>
          
          {/* TEST DROP ZONE */}
          <div 
            onDragOver={(e) => {
              e.preventDefault();
              console.log('🧪 TEST ZONE: dragOver detected!');
            }}
            onDrop={(e) => {
              e.preventDefault();
              console.log('🧪 TEST ZONE: DROP detected!');
            }}
            className="mx-auto max-w-5xl px-4 mb-6 bg-yellow-500/30 border-4 border-yellow-400 p-8"
          >
            <p className="text-yellow-200 text-center text-xl font-bold">
              🧪 TEST DROP ZONE - Drag a question over me!
            </p>
          </div>
        </>
      )}

      {/* Main Content - Full width with standard padding */}
      <div className="mx-auto max-w-5xl main-content px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Progress Bar */}
        <div className="glass-card-gradient p-6 mb-6 w-full">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="apple-subtitle text-lg">Deposition Progress</h2>
              <p className="apple-body text-sm text-white/80">
                {progress.askedQuestions} of {progress.totalQuestions} questions asked ({progress.percentage}%)
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={resetProgress}
                className="glass-button px-6 py-2 text-sm font-medium rounded-xl text-white apple-focus group hover:scale-105 transition-all duration-300 bg-red-500/20 border border-red-400/30"
              >
                <span className="group-hover:scale-105 transition-transform duration-300">
                  Reset Progress
                </span>
              </button>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div
              className="bg-blue-400 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
        <div className="space-y-8 w-full">
          {sections.map((section) => (
            <SectionItem
              key={section.id}
              section={section}
              isCollapsed={isCollapsed[section.id] !== false}
              onToggleCollapse={toggleCollapse}
              onToggleSubsection={toggleSubsection}
              onToggleQuestion={toggleQuestion}
              onToggleFlagged={toggleFlagged}
              onAddCustomQuestion={addCustomQuestion}
              onRemoveCustomQuestion={removeCustomQuestion}
              onUpdateNotes={updateNotes}
              onStartEditing={startEditing}
              onSaveEditing={saveEditing}
              onCancelEditing={cancelEditing}
              onDeleteSection={(id, event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const dialogWidth = 320; // 80 * 4 (w-80 in pixels)
                const dialogHeight = 180; // Approximate height
                setDeleteDialogPosition({
                  top: rect.top + rect.height / 2 - dialogHeight / 2,
                  left: rect.left + rect.width / 2 - dialogWidth / 2
                });
                setDeletingSection(id);
              }}
              editingSection={editingSection}
              editingQuestions={editingQuestions}
              editingTitle={editingTitle}
              onUpdateEditingQuestions={updateEditingQuestions}
              onUpdateEditingTitle={updateEditingTitle}
              onStartEditingQuestion={startEditingQuestion}
              onSaveEditingQuestion={saveEditingQuestion}
              onCancelEditingQuestion={cancelEditingQuestion}
              editingQuestionId={editingQuestionId}
              editingQuestionText={editingQuestionText}
              onUpdateEditingQuestionText={updateEditingQuestionText}
              sectionRef={setSectionRef(section.id)}
              isReorderMode={isReorderMode}
              isDragging={draggedSection === section.id}
              isDragOver={dragOverSection === section.id}
              onLongPressStart={handleLongPressStart}
              onLongPressEnd={handleLongPressEnd}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              isQuestionReorderMode={isQuestionReorderMode}
              questionReorderContext={questionReorderContext}
              onEnterQuestionReorderMode={enterQuestionReorderMode}
              onExitQuestionReorderMode={exitQuestionReorderMode}
              sensors={sensors}
              handleQuestionDragStart={handleQuestionDragStart}
              handleQuestionDragMove={handleQuestionDragMove}
              handleQuestionDragEnd={handleQuestionDragEnd}
              dragPreview={dragPreview}
              // AI-related props
              isAILoading={isAILoading}
              aiSuggestions={aiSuggestions}
              showAISuggestions={showAISuggestions}
              showPromptDialog={showPromptDialog}
              aiPrompt={aiPrompt}
              onShowPromptDialog={showPromptDialogForSection}
              onClosePromptDialog={closePromptDialog}
              onUpdateAIPrompt={updateAIPrompt}
              onImproveQuestionsWithAI={improveQuestionsWithAI}
              onApplyAISuggestions={applyAISuggestions}
              onDismissAISuggestions={dismissAISuggestions}
              // Notes AI props
              showNotesPromptDialog={showNotesPromptDialog}
              notesAiPrompt={notesAiPrompt}
              notesAiSuggestions={notesAiSuggestions}
              showNotesAiSuggestions={showNotesAiSuggestions}
              onShowNotesPromptDialog={showNotesPromptDialogForSection}
              onCloseNotesPromptDialog={closeNotesPromptDialog}
              onUpdateNotesAiPrompt={updateNotesAiPrompt}
              onImproveNotesWithAI={improveNotesWithAI}
              onApplyNotesAiSuggestions={applyNotesAiSuggestions}
              onDismissNotesAiSuggestions={dismissNotesAiSuggestions}
            />
          ))}
        </div>

        {/* Add New Section Button */}
        <div className="mt-8 text-center">
          <button
            onClick={addNewSection}
            className="glass-button px-8 py-4 rounded-2xl text-white font-medium apple-focus group hover:scale-105 transition-all duration-300"
          >
            <span className="group-hover:scale-105 transition-transform duration-300 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Section</span>
            </span>
          </button>
        </div>

        {/* Summary Footer */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6 w-full">
          <h3 className="text-lg font-semibold mb-2">Session Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-black">
            <div>
              <span className="font-medium">Selected Sections:</span> {sections.filter(s => s.isSelected).length} of {sections.length}
            </div>
            <div>
              <span className="font-medium">Questions Asked:</span> {progress.askedQuestions} of {progress.totalQuestions}
            </div>
            <div>
              <span className="font-medium">Completion:</span> {progress.percentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Floating Side Buttons */}
      {/* Left side button - Table of Contents */}
      <button
        onClick={openToc}
        className="fixed -left-12 md:left-0 hover:left-0 top-1/2 -translate-y-1/2 glass-float p-3 pr-4 rounded-r-xl z-40 transition-all duration-300 group shadow-lg"
        aria-label="Table of Contents"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-sm font-medium text-white whitespace-nowrap opacity-0 max-w-0 overflow-hidden group-hover:opacity-100 group-hover:max-w-[200px] transition-all duration-300 ease-out">
            Table of Contents
          </span>
        </div>
        {/* Swipe indicator - mobile only */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 md:hidden">
          <div className="w-1 h-12 bg-gradient-to-r from-transparent via-blue-400/50 to-blue-400/80 rounded-r-full animate-pulse"></div>
        </div>
      </button>

      {/* Right side button - Exhibit Tracker */}
      <button
        onClick={openExhibit}
        className="fixed -right-12 md:right-0 hover:right-0 top-1/2 -translate-y-1/2 glass-float p-3 pl-4 rounded-l-xl z-40 transition-all duration-300 group shadow-lg"
        aria-label="Exhibit Tracker"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white whitespace-nowrap opacity-0 max-w-0 overflow-hidden group-hover:opacity-100 group-hover:max-w-[200px] transition-all duration-300 ease-out">
            Exhibit Tracker
          </span>
          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        {/* Swipe indicator - mobile only */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 md:hidden">
          <div className="w-1 h-12 bg-gradient-to-l from-transparent via-blue-400/50 to-blue-400/80 rounded-l-full animate-pulse"></div>
        </div>
      </button>

      {/* Table of Contents Drawer - Slides in from LEFT */}
      <MobileDrawer
        isOpen={isTocOpen}
        onClose={closeAll}
        side="left"
        title="Table of Contents"
      >
        <TableOfContentsContent 
          sections={sections}
          activeSection={activeSection}
          onSectionClick={(sectionId) => {
            handleSectionClick(sectionId);
            closeAll();
          }} 
        />
      </MobileDrawer>

      {/* Exhibit Tracker Drawer - Slides in from RIGHT */}
      <MobileDrawer
        isOpen={isExhibitOpen}
        onClose={closeAll}
        side="right"
        title="Exhibit Tracker"
      >
        <ExhibitTrackerContent />
      </MobileDrawer>

      {/* Delete Section Confirmation Dialog */}
      {deletingSection && deleteDialogPosition && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setDeletingSection(null);
              setDeleteDialogPosition(null);
            }}
          />
          <div 
            className="absolute z-10 glass-float p-6 w-80"
            style={{
              top: `${deleteDialogPosition.top}px`,
              left: `${deleteDialogPosition.left}px`
            }}
          >
            <h3 className="apple-subtitle text-xl mb-3 text-center">Delete Section?</h3>
            <p className="apple-body text-white/80 text-center text-sm mb-5">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setDeletingSection(null);
                  setDeleteDialogPosition(null);
                }}
                className="flex-1 glass-button px-4 py-2 rounded-xl text-white text-sm font-medium apple-focus hover:scale-105 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteSection(deletingSection);
                  setDeleteDialogPosition(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl text-white text-sm font-medium apple-focus hover:scale-105 transition-all duration-300 bg-red-500/20 border border-red-400/30 hover:bg-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default FastDepositionOutlineWithDatabase;