import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, FileUp, FileText, Sparkles, Send,
  Loader2, BookOpen, CheckCircle2, X, AlertCircle
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { Document } from '../types/index.js';
import { api } from '../services/api.js';

export const BrainPage: React.FC = () => {
  const { currentClub } = useEvent();
  const [documents, setDocuments]   = useState<Document[]>([]);
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [aiAnswer, setAiAnswer]     = useState<{ answer: string; sources: any[] } | null>(null);

  // Upload state
  const [modalOpen, setModalOpen]   = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle]           = useState('');
  const [category, setCategory]     = useState('REPORT');
  const [notes, setNotes]           = useState('');
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    try {
      let clubId = currentClub?.id;
      if (!clubId) {
        const clubs: any = await api.getMyClubs();
        clubId = clubs?.[0]?.id;
      }
      if (!clubId) return;
      const data: any = await api.getDocuments(clubId);
      setDocuments(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadDocs(); }, [currentClub?.id]);

  // ── Query ────────────────────────────────────────────────────────────────
  const handleQuery = async (q?: string) => {
    const text = (q || query).trim();
    if (!text) return;
    setLoading(true);
    setAiAnswer(null);
    try {
      let clubId = currentClub?.id;
      if (!clubId) {
        const clubs: any = await api.getMyClubs();
        clubId = clubs?.[0]?.id;
      }
      if (!clubId) return;
      const res: any = await api.queryBrain(clubId, text);
      setAiAnswer(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const doUpload = async () => {
    setUploadError('');
    setUploadSuccess('');

    if (!uploadFile && !title.trim()) { setUploadError('Select a file or enter a title.'); return; }

    setUploading(true);
    try {
      const token = localStorage.getItem('clubops_token');

      // Get clubId — from context or fetch from API directly
      let clubId = currentClub?.id;
      if (!clubId) {
        try {
          const clubs: any = await api.getMyClubs();
          clubId = clubs?.[0]?.id;
        } catch (e) { /* ignore */ }
      }
      if (!clubId) { setUploadError('No club found. Please create a club first.'); return; }

      const docTitle = title.trim() || uploadFile!.name.replace(/\.[^/.]+$/, '');

      if (uploadFile) {
        const fd = new FormData();
        fd.append('clubId', clubId);
        fd.append('title', docTitle);
        fd.append('category', category);
        if (notes) fd.append('summary', notes);
        fd.append('file', uploadFile);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
        setUploadSuccess(`✅ "${docTitle}" scanned and indexed! (${json.contentLength || 0} chars extracted)`);
      } else {
        await api.uploadDocument({
          clubId,
          title: docTitle,
          fileType: 'PDF',
          category,
          summary: notes,
        });
        setUploadSuccess(`✅ "${docTitle}" added to Club Brain.`);
      }

      await loadDocs();
      setTimeout(() => {
        setModalOpen(false);
        setUploadFile(null);
        setTitle('');
        setNotes('');
        setUploadSuccess('');
      }, 2000);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sampleQuestions = [
    "What was our previous budget & how much did stage AV cost?",
    "What went wrong during last year's event venue booking?",
    "What are the club guidelines for equipment damage deposits?",
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
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
            Upload PDFs — AI extracts and indexes all content. Then ask any question.
          </p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setUploadError(''); setUploadSuccess(''); }}
          className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-1.5"
        >
          <FileUp className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Query Box */}
      <div className="p-6 rounded-3xl bg-background-card border border-primary-500/30 shadow-glass space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Ask Club Brain</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="e.g. How many volunteers are in the PDF?"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery()}
            className="flex-1 bg-background-subtle border border-border focus:border-primary-500 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button onClick={() => handleQuery()} disabled={loading || !query.trim()}
            className="p-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pt-1">
          {sampleQuestions.map((q, i) => (
            <button key={i} onClick={() => { setQuery(q); handleQuery(q); }}
              className="px-3 py-1 rounded-xl bg-background-subtle border border-border hover:border-primary-500/40 text-[11px] text-slate-400 hover:text-white whitespace-nowrap transition-colors">
              {q}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-4 flex items-center space-x-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-accent-violet" />
            <span>Scanning documents and extracting answer...</span>
          </div>
        )}

        {aiAnswer && (
          <div className="p-5 rounded-2xl bg-primary-950/30 border border-primary-500/30 space-y-4 animate-fade-in">
            <div className="text-xs text-white leading-relaxed whitespace-pre-wrap">
              {aiAnswer.answer
                .replace(/\*\*(.*?)\*\*/g, '$1')   // remove **bold**
                .replace(/\*(.*?)\*/g, '$1')         // remove *italic*
                .replace(/`(.*?)`/g, '$1')           // remove `code`
                .replace(/#{1,6}\s/g, '')            // remove # headings
              }
            </div>
            {aiAnswer.sources?.length > 0 && (
              <div className="pt-3 border-t border-primary-500/20 space-y-2">
                <div className="text-[10px] font-mono uppercase text-primary-300 font-bold flex items-center space-x-1">
                  <BookOpen className="w-3 h-3" /><span>Source Documents:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiAnswer.sources.map((src, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-background-card border border-border text-[11px]">
                      <div className="font-semibold text-white flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-accent-cyan" />
                        <span className="truncate">{src.title} (Page {src.page})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-0.5">"{src.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Catalogued Memory Bank ({documents.length} Files)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="p-4 rounded-2xl bg-background-card border border-border hover:border-border-highlight transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/20 text-primary-300">{doc.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">{doc.fileType}</span>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${doc.title}"?`)) return;
                        try {
                          await api.deleteDocument(doc.id);
                          await loadDocs();
                        } catch (e) { console.error(e); }
                      }}
                      className="p-1 rounded-lg hover:bg-rose-500/20 transition-colors"
                      title="Delete document"
                    >
                      <X className="w-3 h-3 text-rose-400" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white leading-snug">{doc.title}</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed line-clamp-3">{doc.summary}</p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                <span className="text-primary-400 font-semibold flex items-center space-x-1">
                  <span>Indexed</span><CheckCircle2 className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="relative w-full max-w-md rounded-3xl shadow-2xl p-6 z-10"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>

            {/* Close */}
            <button onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-background-hover transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
              📄 Upload Document to Club Brain
            </h3>

            <div className="space-y-4">

              {/* File picker */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Select File (PDF, TXT, DOCX) *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-xl p-4 text-center transition-all"
                  style={{
                    border: `2px dashed ${uploadFile ? '#10B981' : 'var(--border-hi)'}`,
                    background: uploadFile ? 'rgba(16,185,129,0.06)' : 'var(--bg-subtle)',
                  }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.docx,.doc,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      setUploadFile(f);
                      if (f && !title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
                    }}
                  />
                  {uploadFile ? (
                    <div>
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1" style={{ color: '#10B981' }} />
                      <p className="text-xs font-bold" style={{ color: '#10B981' }}>{uploadFile.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {(uploadFile.size / 1024).toFixed(1)} KB — AI will extract all text
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FileUp className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click to choose a file</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Volunteer List 2026"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1.5px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Category
                </label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  <option value="REPORT">Past Event / Post-Mortem</option>
                  <option value="BUDGET">Budget & Finance</option>
                  <option value="GUIDELINE">Guidelines & Rules</option>
                  <option value="CONTRACT">Contracts & Sponsorship</option>
                </select>
              </div>

              {/* Error / Success */}
              {uploadError && (
                <div className="flex items-center space-x-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#FDA4AF' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center space-x-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doUpload}
                  disabled={uploading || (!uploadFile && !title.trim())}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center space-x-2 disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
                  {uploading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Scanning PDF...</span></>
                  ) : (
                    <><FileUp className="w-3.5 h-3.5" /><span>Upload & Scan with AI</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
