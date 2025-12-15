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
  currentContent: string;
  caseFacts: string;
  caseId: string;
  parties?: {
    client?: string;
    plaintiffs?: { name: string }[];
    defendants?: { name: string }[];
  };
  onApplyEdit: (newContent: string) => void;
}

export default function AIEditChatModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  currentContent,
  caseFacts,
  caseId,
  parties,
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

  // Complaint-specific quick actions
  const quickActions = [
    { label: 'Strengthen allegations', prompt: 'Make this section more aggressive with stronger legal language and emphasize the defendant\'s liability' },
    { label: 'Add more detail', prompt: 'Expand this section with more specific factual detail based on the case facts' },
    { label: 'Cite CACI elements', prompt: 'Add or strengthen references to CACI jury instruction elements' },
    { label: 'More concise', prompt: 'Make this section more concise while keeping the key legal elements' },
    { label: 'Fix paragraph numbers', prompt: 'Renumber the paragraphs sequentially starting from the current number' },
  ];

  // Initialize with greeting when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const sectionType = getSectionType(sectionTitle);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm here to help you edit the **${sectionTitle}** section of your complaint.\n\n${getSectionSpecificSuggestions(sectionType)}\n\nTell me what changes you'd like, and I'll help you refine this section while maintaining CACI compliance and legal accuracy.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, sectionTitle, messages.length]);

  // Get section-specific suggestions
  const getSectionType = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('jurisdiction')) return 'jurisdiction';
    if (lowerTitle.includes('venue')) return 'venue';
    if (lowerTitle.includes('factual') || lowerTitle.includes('allegation')) return 'factual';
    if (lowerTitle.includes('cause of action')) return 'cause';
    if (lowerTitle.includes('prayer')) return 'prayer';
    if (lowerTitle.includes('jury')) return 'jury';
    return 'general';
  };

  const getSectionSpecificSuggestions = (type: string): string => {
    switch (type) {
      case 'jurisdiction':
        return 'For jurisdiction sections, I can help you:\n• Strengthen jurisdictional basis\n• Add statutory citations\n• Clarify court authority';
      case 'venue':
        return 'For venue sections, I can help you:\n• Strengthen venue basis\n• Add geographic specificity\n• Reference proper venue statutes';
      case 'factual':
        return 'For factual allegations, I can help you:\n• Add more specific detail\n• Strengthen the chronology\n• Emphasize key facts supporting liability';
      case 'cause':
        return 'For causes of action, I can help you:\n• Strengthen CACI element allegations\n• Add supporting facts to each element\n• Make the cause more aggressive\n• Add statutory citations';
      case 'prayer':
        return 'For the prayer for relief, I can help you:\n• Add additional relief categories\n• Strengthen damages allegations\n• Include punitive damages language';
      default:
        return 'How would you like me to revise this content? I can:\n• Make it more aggressive\n• Add more legal detail\n• Make it more concise\n• Strengthen CACI elements';
    }
  };

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

      const response = await fetch('/api/ai/edit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionTitle,
          currentContent,
          caseDescription: caseFacts,
          userMessage: userMessage.content,
          conversationHistory,
          caseId,
          parties,
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
        revisedContent: data.revisedContent,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If there's revised content, show it as pending
      if (data.revisedContent) {
        setPendingRevision(data.revisedContent);
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
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Edit Assistant</h2>
              <p className="text-sm text-blue-100">Editing: {sectionTitle}</p>
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
        <div className="px-4 py-3 bg-gray-50 border-b shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Content</span>
            <button
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {showFullPreview ? 'Show less' : 'Show more'}
            </button>
          </div>
          <div className={`text-sm text-gray-600 overflow-y-auto bg-white rounded border p-3 transition-all ${showFullPreview ? 'max-h-48' : 'max-h-20'}`}>
            {showFullPreview ? currentContent : (currentContent.substring(0, 150) + (currentContent.length > 150 ? '...' : ''))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-b bg-gray-50 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.prompt)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 border border-gray-300 rounded-full hover:bg-blue-100 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap"
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
                    ? 'max-w-[85%] bg-blue-600 text-white rounded-br-md'
                    : 'max-w-full bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <strong>{line.slice(2, -2)}</strong>
                      ) : line.startsWith('• ') ? (
                        <span className="block ml-2">{line}</span>
                      ) : (
                        line
                      )}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-500">Drafting revision...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending Revision Preview */}
        {pendingRevision && (
          <div className={`px-4 py-3 bg-green-50 border-t border-green-200 ${showFullRevision ? 'flex-1 overflow-hidden flex flex-col' : 'shrink-0'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                </svg>
                Revised Content Ready
              </span>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowFullRevision(!showFullRevision)}
                  className="text-xs px-3 py-1.5 text-green-700 hover:bg-green-100 rounded-lg transition-colors font-medium"
                >
                  {showFullRevision ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => {
                    setPendingRevision(null);
                    setShowFullRevision(false);
                  }}
                  className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleApplyRevision}
                  className="text-xs px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply Changes
                </button>
              </div>
            </div>
            <div className={`text-sm text-green-800 overflow-y-auto bg-white rounded-lg border border-green-300 p-3 whitespace-pre-wrap ${showFullRevision ? 'flex-1' : 'max-h-48'}`}>
              {pendingRevision}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-white shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me how you'd like this section edited..."
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-gray-50 placeholder-gray-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="self-end px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
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





