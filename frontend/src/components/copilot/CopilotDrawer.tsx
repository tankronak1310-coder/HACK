import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles, 
  ArrowRight, 
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';
import { ProposedAction } from '../../types/index.js';
import { api } from '../../services/api.js';
import { ActionConfirmationModal } from '../common/ActionConfirmationModal.js';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  proposedActions?: ProposedAction[];
  timestamp: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ isOpen, onClose }) => {
  const { currentEvent, refreshEvent } = useEvent();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ProposedAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      content: `👋 Hello! I am **ClubOps Chatbot**, your assistant for this entire website and event operations.\n\n` +
        `You can ask me **anything**:\n` +
        `• 🌐 **About Website**: How to create tasks, add volunteers, log risks, calculate health score, or use announcements.\n` +
        `• 📋 **Live Operations**: Ask about today's priorities, overdue deliverables, team workload, or risks.\n\n` +
        `What can I help you with today?`,
      timestamp: 'Just now',
    },
  ]);

  if (!isOpen) return null;

  const chips = [
    "What is ClubOps AI?",
    "How to create a task?",
    "Today's priorities",
    "How is health calculated?",
    "Event summary",
    "Critical risks",
    "Volunteer workload",
  ];

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || query).trim();
    if (!messageText) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const eventId = currentEvent?.id || 'general';
      const res: any = await api.copilotQuery(eventId, messageText);
      const aiMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        content: res.content,
        proposedActions: res.proposedActions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: `Apologies, I encountered an issue: ${err.message}`,
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: ProposedAction) => {
    setSelectedAction(action);
    setConfirmOpen(true);
  };

  const handleActionSuccess = (result: any) => {
    setToastMessage(result.message || 'Action executed successfully!');
    refreshEvent();
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
        <div className="absolute inset-0" onClick={onClose} />

        {/* Drawer Panel */}
        <div className="absolute inset-y-0 right-0 max-w-lg w-full flex flex-col z-10 animate-scale-in"
          style={{
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-default)',
            boxShadow: '0 0 60px rgba(99,102,241,0.15)',
          }}>

          {/* ── Header ── */}
          <div className="p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-card) 100%)',
              borderBottom: '1px solid var(--border-default)',
            }}>
            <div className="flex items-center space-x-3">
              {/* Bot Avatar */}
              <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)', padding: '2px' }}>
                <div className="w-full h-full rounded-[14px] flex items-center justify-center"
                  style={{ background: 'var(--bg-card)' }}>
                  <Bot className="w-5 h-5 text-primary-500 animate-pulse" />
                </div>
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2"
                  style={{ borderColor: 'var(--bg-card)' }} />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
                    AI Chatbot
                  </h2>
                  <span className="badge badge-primary">LIVE</span>
                </div>
                <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {currentEvent?.name ? `Assisting: ${currentEvent.name}` : 'Website & Operations Assistant'}
                </p>
              </div>
            </div>

            <button onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Toast ── */}
          {toastMessage && (
            <div className="px-4 py-2.5 flex items-center space-x-2 animate-fade-in text-xs font-body"
              style={{
                background: 'rgba(16,185,129,0.08)',
                borderBottom: '1px solid rgba(16,185,129,0.2)',
                color: '#10B981',
              }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {messages.map((m) => (
              <div key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>

                {m.sender === 'assistant' && (
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-2xs font-bold font-heading" style={{ color: 'var(--text-muted)' }}>
                      AI Chatbot
                    </span>
                  </div>
                )}

                <div className={`max-w-[86%] rounded-2xl text-xs leading-relaxed font-body ${
                  m.sender === 'user' ? 'rounded-br-none' : 'rounded-bl-none'
                }`}
                  style={m.sender === 'user' ? {
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  } : {
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    padding: '0.75rem 1rem',
                  }}>
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Action buttons */}
                  {m.proposedActions && m.proposedActions.length > 0 && (
                    <div className="mt-3 pt-3 space-y-2"
                      style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="text-2xs font-bold uppercase tracking-wider flex items-center space-x-1"
                        style={{ color: '#A78BFA' }}>
                        <Sparkles className="w-3 h-3" />
                        <span>Recommended Actions:</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.proposedActions.map((act) => (
                          <button key={act.id} onClick={() => handleActionClick(act)}
                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold font-body transition-all flex items-center justify-between group"
                            style={{
                              background: 'rgba(99,102,241,0.12)',
                              border: '1px solid rgba(99,102,241,0.25)',
                              color: '#A78BFA',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.22)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}>
                            <span className="truncate">{act.buttonLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-2xs mt-1 px-1 font-body" style={{ color: 'var(--text-muted)' }}>
                  {m.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-none flex items-center space-x-2"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                    Analyzing...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Suggestion Chips ── */}
          <div className="px-4 py-2.5 flex items-center space-x-2 overflow-x-auto"
            style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
            {chips.map((chip) => (
              <button key={chip} onClick={() => handleSend(chip)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-2xs font-semibold font-body transition-all whitespace-nowrap"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#A78BFA';
                  (e.currentTarget as HTMLElement).style.color = '#6366F1';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }}>
                {chip}
              </button>
            ))}
          </div>

          {/* ── Input ── */}
          <div className="p-3 flex items-center space-x-2"
            style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
            <input
              type="text"
              placeholder="Ask anything about the website, features, tasks, or event..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-xs font-body focus:outline-none"
              style={{
                background: 'var(--bg-subtle)',
                border: '1.5px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.target.style.borderColor = '#6366F1')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="p-2.5 rounded-xl text-white transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ActionConfirmationModal
        action={selectedAction}
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSuccess={handleActionSuccess}
      />
    </>
  );
};
