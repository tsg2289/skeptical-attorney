'use client';

/**
 * Response AI Panel Component
 * 
 * AI chat interface for editing discovery responses
 * Features:
 * - Conversation-based editing
 * - Quick action buttons
 * - Suggested improvements
 * - Apply revisions inline
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Shield,
  MessageSquare,
  Loader2,
  CheckCircle,
  Copy,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import type { DiscoveryResponseType } from '@/lib/data/californiaObjections';

interface Attorney {
  name: string;
  barNumber: string;
  firmName: string;
  address: string;
  phone: string;
  email: string;
}

interface Party {
  name: string;
  type: string;
}

interface CaseData {
  id: string;
  case_name: string;
  case_number: string;
  court_name?: string;
  case_type?: string;
  case_description?: string;
  plaintiffs?: Party[];
  defendants?: Party[];
  attorneys?: Attorney[];
}

interface DiscoveryResponse {
  id: string;
  requestNumber: number;
  originalRequest: string;
  objections: string[];
  objectionTexts: string[];
  answer: string;
  suggestedObjectionIds: string[];
  status: 'draft' | 'reviewed' | 'final';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: string;
  timestamp: Date;
}

interface ResponseAIPanelProps {
  caseData: CaseData;
  discoveryType: DiscoveryResponseType;
  selectedResponse: DiscoveryResponse | null;
  onClose: () => void;
  onUpdateResponse: (updates: Partial<DiscoveryResponse>) => void;
}

const quickActions = [
  { id: 'strengthen', label: 'Strengthen objections', icon: Shield },
  { id: 'simplify', label: 'Simplify language', icon: Lightbulb },
  { id: 'expand', label: 'Expand answer', icon: MessageSquare },
  { id: 'cite', label: 'Add citations', icon: Copy },
];

const discoveryTypeLabels: Record<DiscoveryResponseType, string> = {
  interrogatories: 'Special Interrogatory',
  rfp: 'Request for Production',
  rfa: 'Request for Admission',
};

export function ResponseAIPanel({
  caseData,
  discoveryType,
  selectedResponse,
  onClose,
  onUpdateResponse,
}: ResponseAIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRevision, setPendingRevision] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add initial context message when response changes
  useEffect(() => {
    if (selectedResponse) {
      const contextMessage: Message = {
        id: `context_${Date.now()}`,
        role: 'assistant',
        content: `I'm ready to help you with **${discoveryTypeLabels[discoveryType]} No. ${selectedResponse.requestNumber}**.\n\nThe original request asks: "${selectedResponse.originalRequest.substring(0, 100)}..."\n\nHow would you like me to help?`,
        timestamp: new Date(),
      };
      setMessages([contextMessage]);
    }
  }, [selectedResponse, discoveryType]);

  /**
   * Send message to AI
   */
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading || !selectedResponse) return;

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call AI API
      const response = await fetch('/api/ai/edit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          sectionType: 'discovery_response',
          currentContent: selectedResponse.answer,
          instruction: text,
          context: {
            discoveryType,
            originalRequest: selectedResponse.originalRequest,
            objections: selectedResponse.objections,
            caseDescription: caseData.case_description,
          },
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Add assistant message with suggestion
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: result.explanation || 'Here\'s my suggested revision:',
        suggestion: result.revisedContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (result.revisedContent) {
        setPendingRevision(result.revisedContent);
      }

    } catch (error) {
      console.error('AI error:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedResponse, caseData, discoveryType]);

  /**
   * Apply pending revision
   */
  const handleApplyRevision = useCallback(() => {
    if (pendingRevision) {
      onUpdateResponse({ answer: pendingRevision });
      setPendingRevision(null);

      const confirmMessage: Message = {
        id: `confirm_${Date.now()}`,
        role: 'assistant',
        content: '✓ Revision applied! Would you like to make any other changes?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    }
  }, [pendingRevision, onUpdateResponse]);

  /**
   * Handle quick action
   */
  const handleQuickAction = useCallback((actionId: string) => {
    const prompts: Record<string, string> = {
      strengthen: 'Please strengthen the objections in this response, making them more legally robust with additional case citations if available.',
      simplify: 'Please simplify the language while maintaining legal accuracy. Make it clearer and more concise.',
      expand: 'Please expand the answer portion to be more thorough while staying within appropriate bounds and not waiving any objections.',
      cite: 'Please add relevant California Code of Civil Procedure citations to support the objections.',
    };

    const prompt = prompts[actionId];
    if (prompt) {
      handleSendMessage(prompt);
    }
  }, [handleSendMessage]);

  /**
   * Handle keyboard submit
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] bg-slate-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">AI Assistant</h3>
              <p className="text-sm text-slate-400">
                {selectedResponse
                  ? `Editing ${discoveryTypeLabels[discoveryType]} No. ${selectedResponse.requestNumber}`
                  : 'Select a response to edit'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="px-4 py-2 bg-emerald-500/5 border-b border-emerald-500/20">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Shield className="w-3 h-3" />
            <span>Data is anonymized before AI processing</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-slate-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Suggestion box */}
                {message.suggestion && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-slate-400 mb-2">Suggested revision:</p>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">
                      {message.suggestion}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleApplyRevision}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Apply
                      </button>
                      <button
                        onClick={() => setPendingRevision(null)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {selectedResponse && (
          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-slate-500 flex-shrink-0">Quick:</span>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-all whitespace-nowrap disabled:opacity-50"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedResponse
                  ? 'Ask me to revise, strengthen, or improve...'
                  : 'Select a response to start editing'
              }
              disabled={!selectedResponse || isLoading}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || !selectedResponse || isLoading}
              className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


