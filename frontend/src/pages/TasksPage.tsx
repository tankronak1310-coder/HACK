import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  List, 
  Columns, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { Task } from '../types/index.js';
import { api } from '../services/api.js';

export const TasksPage: React.FC = () => {
  const { currentEvent, refreshEvent } = useEvent();
  const [view, setView] = useState<'KANBAN' | 'LIST' | 'TIMELINE'>('KANBAN');
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    teamId: '',
    estimatedHours: 4,
  });
  const [creating, setCreating] = useState(false);

  const tasks: Task[] = currentEvent?.tasks || [];
  const teams = currentEvent?.club?.teams || [];

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      setToastMessage('Task status updated successfully!');
      refreshEvent();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !newTask.title.trim()) return;
    setCreating(true);
    try {
      await api.createTask({
        eventId: currentEvent.id,
        ...newTask,
        teamId: newTask.teamId || undefined,
      });
      setCreateModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'MEDIUM',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        teamId: '',
        estimatedHours: 4,
      });
      setToastMessage('New operational task created!');
      refreshEvent();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesTeam = selectedTeam === 'ALL' || t.teamId === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  const columns: ('TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE')[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="live-pulse" />
            <h1 className="text-xl font-heading font-black flex items-center space-x-2.5" style={{ color: 'var(--text-primary)' }}>
              <CheckSquare className="w-5 h-5" style={{ color: '#818CF8' }} />
              <span>Tasks &amp; <span className="text-gradient">Roadmap</span> Execution</span>
            </h1>
          </div>
          <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
            Manage deliverables, assignees, deadlines, and dependencies across workstreams.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Switcher */}
          <div className="flex items-center p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            {[
              { key: 'KANBAN', icon: Columns, label: 'Kanban' },
              { key: 'LIST',   icon: List,    label: 'List' },
              { key: 'TIMELINE', icon: Clock, label: 'Timeline' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setView(key as any)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={view === key ? {
                  background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                } : { color: 'var(--text-muted)' }}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              fontFamily: 'Outfit',
            }}>
            <Plus className="w-4 h-4" />
            <span>+ New Task</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl text-xs flex items-center space-x-2 animate-fade-in"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6EE7B7' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-body">{toastMessage}</span>
        </div>
      )}

      {/* Empty states */}
      {!currentEvent && (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
          <CheckSquare className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold font-heading" style={{ color: 'var(--text-secondary)' }}>No event selected</p>
          <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Select an event from the navbar to view its tasks and roadmap.</p>
        </div>
      )}

      {currentEvent && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
          <CheckSquare className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold font-heading" style={{ color: 'var(--text-primary)' }}>No tasks for "{currentEvent.name}" yet</p>
          <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
            Click <span style={{ color: '#818CF8', fontWeight: 700 }}>+ New Task</span> to add the first deliverable.
          </p>
        </div>
      )}

      {/* Filter Bar */}
      {currentEvent && tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Filter tasks by title or tag..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs font-body focus:outline-none"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }} />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            {[{ id: 'ALL', label: 'All Teams' }, ...teams.map(tm => ({ id: tm.id, label: tm.name.split(' ')[0] }))].map(({ id, label }) => (
              <button key={id} onClick={() => setSelectedTeam(id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={selectedTeam === id ? {
                  background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
                  color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                } : {
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 1: KANBAN BOARD */}
      {currentEvent && tasks.length > 0 && view === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col);
            const colColors: Record<string, { label: string; dot: string; count: string }> = {
              'TODO':        { label: '#8892B0', dot: '#818CF8', count: 'rgba(99,102,241,0.12)' },
              'IN_PROGRESS': { label: '#8892B0', dot: '#67E8F9', count: 'rgba(6,182,212,0.12)' },
              'BLOCKED':     { label: '#8892B0', dot: '#F87171', count: 'rgba(244,63,94,0.12)' },
              'DONE':        { label: '#8892B0', dot: '#6EE7B7', count: 'rgba(16,185,129,0.12)' },
            };
            const cc = colColors[col];
            return (
              <div key={col} className="flex flex-col space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cc.dot }} />
                    <span className="text-xs font-bold uppercase tracking-widest font-body" style={{ color: cc.label }}>
                      {col.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full" style={{ background: cc.count, color: cc.label }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 max-h-[calc(100vh-18rem)] overflow-y-auto pr-0.5">
                  {colTasks.map((t) => {
                    const priorityStyle: Record<string, { bg: string; color: string }> = {
                      CRITICAL: { bg: 'rgba(244,63,94,0.15)',   color: '#F87171' },
                      HIGH:     { bg: 'rgba(251,146,60,0.15)',  color: '#FDBA74' },
                      MEDIUM:   { bg: 'rgba(251,191,36,0.15)',  color: '#FDE68A' },
                      LOW:      { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' },
                    };
                    const ps = priorityStyle[t.priority] || priorityStyle.MEDIUM;
                    const teamShort = t.team?.name ? t.team.name.split(' ').slice(0, 2).join(' & ') : 'General';

                    return (
                      <div key={t.id} className="p-4 rounded-2xl transition-all group cursor-default"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          boxShadow: 'var(--card-shadow)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hi)';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-hover-shadow)';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
                          (e.currentTarget as HTMLElement).style.transform = 'none';
                        }}>
                        {/* Team + Priority row */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-2xs font-semibold truncate max-w-[120px] font-body" style={{ color: 'var(--text-muted)' }}>
                            {teamShort}
                          </span>
                          <span className="text-2xs font-bold px-1.5 py-0.5 rounded font-mono"
                            style={{ background: ps.bg, color: ps.color }}>
                            {t.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="text-xs font-bold leading-snug mb-3 font-heading" style={{ color: 'var(--text-primary)' }}>
                          {t.title}
                        </div>

                        {/* Date + Assignee */}
                        <div className="flex items-center justify-between text-2xs font-body" style={{ color: 'var(--text-muted)' }}>
                          <span>{new Date(t.deadline).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }} className="truncate max-w-[80px]">
                            {t.assignee?.name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Move buttons */}
                        <div className="mt-2.5 pt-2.5 flex items-center justify-between"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <span className="text-2xs font-body" style={{ color: 'var(--text-muted)' }}>Move:</span>
                          <div className="flex space-x-1">
                            {columns.filter(c => c !== col).map(targetCol => (
                              <button key={targetCol}
                                onClick={() => handleStatusChange(t.id, targetCol)}
                                className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded transition-all"
                                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.2)'; (e.currentTarget as HTMLElement).style.color = '#818CF8'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
                                {targetCol === 'IN_PROGRESS' ? 'PROG' : targetCol}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="py-10 text-center text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: LIST TABLE */}
      {currentEvent && tasks.length > 0 && view === 'LIST' && (
        <div className="bg-background-card border border-border rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-background-subtle border-b border-border text-[11px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">Workstream</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-background-hover/50 transition-colors">
                    <td className="p-4 font-semibold text-white max-w-xs truncate">{t.title}</td>
                    <td className="p-4 text-slate-400">{t.team?.name || 'General'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        t.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-primary-500/20 text-primary-300'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="bg-background-subtle border border-border px-2 py-1 rounded-lg text-xs text-slate-200"
                      >
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="DONE">DONE</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-300">{t.assignee?.name || 'Unassigned'}</td>
                    <td className="p-4 text-slate-400">{new Date(t.deadline).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TIMELINE — Chronological Event Timeline */}
      {currentEvent && tasks.length > 0 && view === 'TIMELINE' && (() => {
        const now = new Date();

        // Build unified timeline entries from all event data
        const entries: {
          date: Date;
          label: string;
          sublabel?: string;
          type: 'event_created' | 'task' | 'meeting' | 'risk' | 'event_day' | 'event_end';
          status?: string;
          priority?: string;
          isToday?: boolean;
          isPast?: boolean;
        }[] = [];

        // Event created
        if (currentEvent.createdAt) {
          entries.push({
            date: new Date(currentEvent.createdAt),
            label: `Event Created: "${currentEvent.name}"`,
            sublabel: `Type: ${currentEvent.type} · Location: ${currentEvent.location}`,
            type: 'event_created',
          });
        }

        // All task deadlines
        tasks.forEach(t => {
          entries.push({
            date: new Date(t.deadline),
            label: t.title,
            sublabel: `${t.team?.name || 'General'} · ${t.estimatedHours || '?'}h estimated`,
            type: 'task',
            status: t.status,
            priority: t.priority,
          });
        });

        // Meetings
        (currentEvent.meetings || []).forEach((m: any) => {
          entries.push({
            date: new Date(m.date),
            label: m.title || 'Team Meeting',
            sublabel: m.location || 'Meeting',
            type: 'meeting',
            status: m.status,
          });
        });

        // Risks (by createdAt)
        (currentEvent.risks || []).forEach((r: any) => {
          entries.push({
            date: new Date(r.createdAt),
            label: `⚠ Risk: ${r.title}`,
            sublabel: `${r.category} · ${r.severity} severity`,
            type: 'risk',
            status: r.status,
          });
        });

        // Event day
        entries.push({
          date: new Date(currentEvent.date),
          label: `🎯 EVENT DAY — ${currentEvent.name}`,
          sublabel: currentEvent.location,
          type: 'event_day',
        });

        // Event end (if provided)
        if (currentEvent.endDate) {
          entries.push({
            date: new Date(currentEvent.endDate),
            label: `🏁 Event Ends — ${currentEvent.name}`,
            sublabel: 'Wrap-up & post-event activities begin',
            type: 'event_end',
          });
        }

        // Sort all entries chronologically
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        const typeConfig: Record<string, { color: string; dot: string; badge: string }> = {
          event_created: { color: 'text-sky-300', dot: 'bg-sky-500', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
          task:          { color: 'text-white',   dot: 'bg-primary-500', badge: 'bg-primary-500/20 text-primary-300 border-primary-500/40' },
          meeting:       { color: 'text-violet-300', dot: 'bg-violet-500', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
          risk:          { color: 'text-amber-300', dot: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
          event_day:     { color: 'text-emerald-300', dot: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
          event_end:     { color: 'text-rose-300', dot: 'bg-rose-500', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
        };

        const statusBadge = (status?: string, priority?: string) => {
          if (!status) return null;
          const sColor: Record<string, string> = {
            DONE: 'bg-emerald-500/20 text-emerald-300', IN_PROGRESS: 'bg-blue-500/20 text-blue-300',
            BLOCKED: 'bg-rose-500/20 text-rose-300', TODO: 'bg-slate-500/20 text-slate-400',
            IDENTIFIED: 'bg-amber-500/20 text-amber-300', MITIGATING: 'bg-orange-500/20 text-orange-300',
            RESOLVED: 'bg-emerald-500/20 text-emerald-300',
          };
          const pColor: Record<string, string> = {
            CRITICAL: 'bg-rose-500/20 text-rose-300', HIGH: 'bg-orange-500/20 text-orange-300',
            MEDIUM: 'bg-yellow-500/20 text-yellow-300', LOW: 'bg-slate-500/20 text-slate-400',
          };
          return (
            <span className="flex items-center gap-1 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${sColor[status] || 'bg-slate-500/20 text-slate-400'}`}>{status}</span>
              {priority && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${pColor[priority] || ''}`}>{priority}</span>}
            </span>
          );
        };

        // Today marker position
        const todayIdx = entries.findIndex(e => e.date > now);

        return (
          <div className="bg-background-card border border-border rounded-3xl p-6 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-white">{currentEvent.name} — Event Timeline</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{entries.length} key dates · sorted chronologically</p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block"/>Created</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500 inline-block"/>Tasks</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block"/>Meetings</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Risks</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Event Day</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pt-2">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

              <div className="space-y-1">
                {entries.map((entry, idx) => {
                  const cfg = typeConfig[entry.type] || typeConfig.task;
                  const isPast = entry.date < now;
                  const isEventDay = entry.type === 'event_day';
                  const isTodayLine = todayIdx === idx;

                  return (
                    <React.Fragment key={idx}>
                      {/* "TODAY" marker */}
                      {isTodayLine && (
                        <div className="flex items-center gap-3 pl-10 py-1">
                          <div className="h-px flex-1 bg-emerald-500/50 border-dashed border-t border-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/30 shrink-0">TODAY ↓</span>
                          <div className="h-px flex-1 bg-emerald-500/50" />
                        </div>
                      )}

                      <div className={`relative flex items-start gap-4 px-1 py-2.5 rounded-2xl transition-all ${
                        isEventDay ? 'bg-emerald-500/8 border border-emerald-500/20' :
                        isPast ? 'opacity-60' : 'hover:bg-background-subtle/60'
                      }`}>
                        {/* Dot */}
                        <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          isEventDay ? 'border-emerald-500 bg-emerald-500/20' :
                          isPast && entry.type === 'task' && entry.status === 'DONE' ? 'border-emerald-500 bg-emerald-500/20' :
                          `border-border bg-background-subtle`
                        }`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${isPast && entry.type !== 'event_day' ? 'opacity-50' : ''}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <span className={`text-xs font-bold leading-snug ${isEventDay ? 'text-emerald-300 text-sm' : cfg.color} ${isPast && entry.status !== 'DONE' ? 'line-through opacity-70' : ''}`}>
                              {entry.label}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {statusBadge(entry.status, entry.priority)}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${cfg.badge}`}>
                                {entry.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: entry.date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })}
                              </span>
                            </div>
                          </div>
                          {entry.sublabel && (
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{entry.sublabel}</p>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setCreateModalOpen(false)} />
          <div className="relative w-full max-w-md bg-background-card border border-border rounded-3xl shadow-2xl p-6 z-10 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-bold text-white">Create New Operational Task</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Confirm 50kVA backup diesel generator"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Workstream Team</label>
                  <select
                    value={newTask.teamId}
                    onChange={(e) => setNewTask({ ...newTask, teamId: e.target.value })}
                    className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- General --</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>{tm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: Number(e.target.value) })}
                    className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-1.5"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Deliverable</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
