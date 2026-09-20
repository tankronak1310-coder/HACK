import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Loader2,
  CheckCircle,
  HelpCircle
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
      <div className="fixed inset-0 z-50 overflow-hidden bg-background/60 backdrop-blur-sm animate-fade-in">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-background-card border-l border-border shadow-2xl flex flex-col z-10 animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-background-subtle">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-accent-cyan p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-background-card rounded-[10px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-accent-cyan animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-sm font-bold text-white">AI Chatbot</h2>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 font-mono">
                    WEBSITE & OPS
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {currentEvent?.name ? `Event: ${currentEvent.name}` : 'Website & Operations Assistant'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification if action succeeded */}
          {toastMessage && (
            <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none shadow-glow'
                      : 'bg-background-subtle border border-border text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Proposed Real Backend Action Buttons */}
                  {m.proposedActions && m.proposedActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/80 space-y-2">
                      <div className="text-[10px] font-bold text-primary-300 uppercase tracking-wider flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Recommended Operational Actions:</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.proposedActions.map((act) => (
                          <button
                            key={act.id}
                            onClick={() => handleActionClick(act)}
                            className="w-full px-3 py-2 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-left text-xs text-primary-200 font-medium transition-colors flex items-center justify-between group"
                          >
                            <span className="truncate">{act.buttonLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 p-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                <span>Chatbot is analyzing and preparing answer...</span>
              </div>
            )}
          </div>

          {/* Suggestion Chips */}
          <div className="px-4 py-2 border-t border-border bg-background-subtle/50 flex items-center space-x-2 overflow-x-auto">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="px-2.5 py-1 rounded-lg bg-background-hover border border-border text-[11px] text-slate-300 hover:text-white hover:border-primary-500/40 whitespace-nowrap transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-border bg-background-card flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask anything about the website, features, tasks, or event..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-50 transition-colors shadow-glow"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ActionConfirmationModal
        action={selectedAction}
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSuccess={handleActionSuccess}
      />
    </>
  );
};
