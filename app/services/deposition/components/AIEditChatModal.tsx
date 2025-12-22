'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  revisedContent?: string | null;
}

interface AIEditChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  currentQuestions: string;
  depositionContext?: {
    deponentName?: string;
    deponentRole?: string;
    caseType?: string;
  };
  onApplyEdit: (newQuestions: string) => void;
}

export default function AIEditChatModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  currentQuestions,
  depositionContext,
  onApplyEdit,
}: AIEditChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRevision, setPendingRevision] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showFullRevision, setShowFullRevision] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with greeting when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm here to help you improve the **${sectionTitle}** questions.\n\nHow would you like me to revise these questions? Here are some suggestions:\n\n• "Make these questions more probing"\n• "Add follow-up questions for each topic"\n• "Make the questions more specific"\n• "Simplify the language"\n• "Add questions about damages"\n• "Focus more on timeline and sequence of events"\n\nTell me what changes you'd like, and I'll help you refine these deposition questions.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, sectionTitle, messages.length]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setPendingRevision(null);
      setInputValue('');
      setShowFullPreview(false);
      setShowFullRevision(false);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history for context (excluding welcome message)
      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch('/api/ai/deposition-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionTitle,
          currentQuestions,
          userMessage: userMessage.content,
          conversationHistory,
          depositionContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        revisedContent: data.revisedQuestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If there's revised content, show it as pending
      if (data.revisedQuestions) {
        setPendingRevision(data.revisedQuestions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyRevision = () => {
    if (pendingRevision) {
      onApplyEdit(pendingRevision);
      setPendingRevision(null);
      onClose();
    }
  };

  // Quick action buttons for common edits
  const quickActions = [
    { label: 'More probing', prompt: 'Make these questions more probing and detailed' },
    { label: 'Add follow-ups', prompt: 'Add follow-up questions for each topic' },
    { label: 'Simplify', prompt: 'Simplify the language while keeping the substance' },
    { label: 'Timeline focus', prompt: 'Add questions that focus on the timeline and sequence of events' },
  ];

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Question Assistant</h2>
              <p className="text-sm text-white/80">Editing: {sectionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Content Preview */}
        <div className="px-4 py-3 bg-slate-800/50 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Current Questions</span>
            <button
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              {showFullPreview ? 'Show less' : 'Show more'}
            </button>
          </div>
          <div className={`text-sm text-white/80 overflow-y-auto bg-slate-900/50 rounded border border-white/10 p-3 transition-all ${showFullPreview ? 'max-h-48' : 'max-h-20'}`}>
            {showFullPreview ? currentQuestions : (currentQuestions.substring(0, 150) + (currentQuestions.length > 150 ? '...' : ''))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-b border-white/10 bg-slate-800/30 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.prompt)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-white/80 border border-white/20 rounded-full hover:bg-purple-600/30 hover:border-purple-400/50 hover:text-white transition-colors whitespace-nowrap"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'max-w-[85%] bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md'
                    : 'max-w-full bg-slate-700/50 text-white/90 rounded-bl-md border border-white/10'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <strong className="text-purple-300">{line.slice(2, -2)}</strong>
                      ) : line.startsWith('• ') ? (
                        <span className="block ml-2 text-white/80">{line}</span>
                      ) : (
                        line
                      )}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-white/60' : 'text-white/40'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-white/60">Drafting questions...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending Revision Preview */}
        {pendingRevision && (
          <div className={`px-4 py-3 bg-green-900/30 border-t border-green-400/30 ${showFullRevision ? 'flex-1 overflow-hidden flex flex-col' : 'shrink-0'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                </svg>
                Revised Questions Ready
              </span>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowFullRevision(!showFullRevision)}
                  className="text-xs px-3 py-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors font-medium"
                >
                  {showFullRevision ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => {
                    setPendingRevision(null);
                    setShowFullRevision(false);
                  }}
                  className="text-xs px-3 py-1.5 text-white/60 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleApplyRevision}
                  className="text-xs px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply Changes
                </button>
              </div>
            </div>
            <div className={`text-sm text-green-100 overflow-y-auto bg-slate-900/50 rounded-lg border border-green-400/30 p-3 whitespace-pre-wrap ${showFullRevision ? 'flex-1' : 'max-h-48'}`}>
              {pendingRevision}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-slate-800/50 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me how you'd like these questions edited..."
              className="flex-1 resize-none border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-white bg-slate-900/50 placeholder-white/40"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="self-end px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}


















