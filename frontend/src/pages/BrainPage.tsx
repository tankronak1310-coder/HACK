import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Search, 
  FileUp, 
  FileText, 
  Sparkles, 
  Send, 
  Loader2, 
  BookOpen, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { Document } from '../types/index.js';
import { api } from '../services/api.js';

export const BrainPage: React.FC = () => {
  const { currentClub } = useEvent();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<{ answer: string; sources: any[] } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('REPORT');
  const [uploadSummary, setUploadSummary] = useState('');

  const loadDocs = async () => {
    if (!currentClub) return;
    try {
      const data: any = await api.getDocuments(currentClub.id);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [currentClub?.id]);

  const handleQueryBrain = async (qToSend?: string) => {
    const text = (qToSend || query).trim();
    if (!currentClub || !text) return;
    setLoading(true);
    setAiAnswer(null);
    try {
      const res: any = await api.queryBrain(currentClub.id, text);
      setAiAnswer(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClub || !uploadTitle.trim()) return;
    try {
      await api.uploadDocument({
        clubId: currentClub.id,
        title: uploadTitle,
        fileType: 'PDF',
        category: uploadCategory,
        summary: uploadSummary,
      });
      setUploadModalOpen(false);
      setUploadTitle('');
      setUploadSummary('');
      await loadDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const sampleQuestions = [
    "What was our previous budget & how much did stage AV cost?",
    "What went wrong during last year's event venue booking?",
    "What are the club guidelines for equipment damage deposits?",
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Brain className="w-5 h-5 text-accent-violet" />
              <span>Club Brain & Institutional Memory</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Query past event post-mortems, budgets, rules, and sponsor playbooks with verifiable source citations.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-1.5"
        >
          <FileUp className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Semantic Search / AI Query Box */}
      <div className="p-6 rounded-3xl bg-background-card border border-primary-500/30 shadow-glass space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Ask Club Brain
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask anything about previous events, budgets, lessons learned..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQueryBrain()}
            className="flex-1 bg-background-subtle border border-border focus:border-primary-500 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => handleQueryBrain()}
            disabled={loading || !query.trim()}
            className="p-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Quick prompt chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-1">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(q);
                handleQueryBrain(q);
              }}
              className="px-3 py-1 rounded-xl bg-background-subtle border border-border hover:border-primary-500/40 text-[11px] text-slate-400 hover:text-white whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* AI Answer with Source Citations */}
        {loading && (
          <div className="py-6 flex items-center space-x-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-accent-violet" />
            <span>Searching 10 club institutional memory documents and extracting citations...</span>
          </div>
        )}

        {aiAnswer && (
          <div className="p-5 rounded-2xl bg-primary-950/30 border border-primary-500/30 space-y-4 animate-fade-in">
            <div className="text-xs font-bold text-white leading-relaxed">
              <div className="whitespace-pre-wrap">{aiAnswer.answer}</div>
            </div>

            {aiAnswer.sources && aiAnswer.sources.length > 0 && (
              <div className="pt-3 border-t border-primary-500/20 space-y-2">
                <div className="text-[10px] font-mono uppercase text-primary-300 font-bold flex items-center space-x-1">
                  <BookOpen className="w-3 h-3" />
                  <span>Verified Source Documents:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiAnswer.sources.map((src, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-background-card border border-border text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-white flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-accent-cyan" />
                        <span className="truncate">{src.title} (Page {src.page})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">"{src.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Catalogued Documents Grid */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Catalogued Memory Bank ({documents.length} Files)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl bg-background-card border border-border hover:border-border-highlight transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/20 text-primary-300">
                    {doc.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{doc.fileType}</span>
                </div>
                <h3 className="text-xs font-bold text-white leading-snug">{doc.title}</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed line-clamp-3">
                  {doc.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                <span className="text-primary-400 font-semibold flex items-center space-x-1">
                  <span>Indexed</span>
                  <CheckCircle2 className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setUploadModalOpen(false)} />
          <div className="relative w-full max-w-md bg-background-card border border-border rounded-3xl shadow-2xl p-6 z-10 animate-scale-in">
            <h3 className="text-base font-bold text-white mb-4">Ingest Document to Club Brain</h3>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TechFest 2025 Audit Report.pdf"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="REPORT">Past Event Post-Mortem & Audit</option>
                  <option value="BUDGET">Budget & Financial Receipts</option>
                  <option value="GUIDELINE">Campus Booking Guidelines & Rules</option>
                  <option value="CONTRACT">Sponsorship Contract Template</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Document Summary & Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide key learnings or summary notes for AI retrieval..."
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow"
                >
                  Save & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
