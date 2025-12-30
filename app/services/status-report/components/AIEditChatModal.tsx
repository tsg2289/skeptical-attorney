'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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
  caseDescription: string;
  caseId: string;
  parties?: {
    client?: string;
    plaintiffs?: { name: string }[];
    defendants?: { name: string }[];
  };
  onApplyEdit: (newContent: string) => void;
  isTrialMode?: boolean;
}

export default function AIEditChatModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  currentContent,
  caseDescription,
  caseId,
  parties,
  onApplyEdit,
  isTrialMode = false,
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
          content: `Hello! I'm here to help you edit the **${sectionTitle}** section.\n\nHow would you like me to revise this content? Here are some suggestions:\n\n• "Add more detail about the procedural history"\n• "Summarize the discovery status more concisely"\n• "Strengthen the liability analysis"\n• "Make the damages assessment more specific"\n• "Add recommended next steps"\n• "Use more formal report language"\n\nTell me what changes you'd like, and I'll help you refine this section.`,
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

      const response = await fetch('/api/ai/edit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          sectionTitle,
          currentContent,
          caseDescription,
          userMessage: userMessage.content,
          conversationHistory,
          caseId,
          parties,
          documentType: 'status-report',
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

  // Quick action buttons for common edits
  const quickActions = [
    { label: 'More detail', prompt: 'Add more detail to this section based on the case facts' },
    { label: 'More concise', prompt: 'Make this section more concise while keeping the key points' },
    { label: 'More formal', prompt: 'Use more formal, professional report language' },
    { label: 'Add analysis', prompt: 'Add more analysis and assessment to this section' },
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

        {/* Trial Mode Sign-Up Prompt */}
        {isTrialMode ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 bg-blue-100 rounded-full mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                <path d="M6 4L6.5 6.5L9 7L6.5 7.5L6 10L5.5 7.5L3 7L5.5 6.5L6 4Z" />
                <path d="M18 14L18.5 16.5L21 17L18.5 17.5L18 20L17.5 17.5L15 17L17.5 16.5L18 14Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Unlock AI Editing</h3>
            <p className="text-gray-600 mb-6 max-w-sm">
              Sign up for a free account to use the AI Edit Assistant and save your work permanently.
            </p>
            <div className="space-y-3 w-full max-w-xs">
              <Link
                href="/login"
                className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-center"
              >
                Sign Up Free →
              </Link>
              <button
                onClick={onClose}
                className="block w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              Your trial work will be saved until you sign up
            </p>
          </div>
        ) : (
        <>
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
        </>
        )}
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










