import React, { useState, useEffect } from 'react';
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
  Loader2,
  Trash2,
  Layers
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { Task } from '../types/index.js';
import { api } from '../services/api.js';

export const TasksPage: React.FC = () => {
  const { currentEvent, events, setCurrentEvent, refreshEvent } = useEvent();
  const [view, setView] = useState<'KANBAN' | 'LIST' | 'TIMELINE'>('KANBAN');
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-select first event if none selected
  useEffect(() => {
    if (!currentEvent && events && events.length > 0) {
      setCurrentEvent(events[0]);
    }
  }, [currentEvent, events]);

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

  // Check if a task with the same title already exists
  const isDuplicateTitle = Boolean(
    newTask.title.trim() &&
    tasks.some(t => t.title.trim().toLowerCase() === newTask.title.trim().toLowerCase())
  );

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

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete task "${taskTitle}"?`)) return;
    try {
      await api.deleteTask(taskId);
      setToastMessage(`🗑️ Task "${taskTitle}" deleted successfully.`);
      refreshEvent();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setToastMessage(`❌ Failed to delete task: ${err.message || 'Error'}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTask.title.trim();
    if (!currentEvent || !trimmedTitle) return;

    if (isDuplicateTitle) {
      setToastMessage(`⚠️ A task named "${trimmedTitle}" already exists. Please choose a unique name.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setCreating(true);
    try {
      await api.createTask({
        eventId: currentEvent.id,
        ...newTask,
        title: trimmedTitle,
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
      setToastMessage('✅ New operational task created!');
      refreshEvent();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setToastMessage(`❌ ${err.message || 'Failed to create task'}`);
      setTimeout(() => setToastMessage(null), 5000);
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
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-primary-400" />
              <span>Tasks & Roadmap Execution</span>
            </h1>
            {events.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-background-card border border-border px-2.5 py-1 rounded-xl">
                <Layers className="w-3.5 h-3.5 text-primary-400" />
                <select
                  value={currentEvent?.id || ''}
                  onChange={(e) => {
                    const chosen = events.find(ev => ev.id === e.target.value);
                    if (chosen) setCurrentEvent(chosen);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} className="bg-background-card text-white">
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage deliverables, assignees, deadlines, and dependencies across workstreams.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Switcher */}
          <div className="flex items-center bg-background-card border border-border p-1 rounded-xl">
            <button
              onClick={() => setView('KANBAN')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                view === 'KANBAN' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setView('LIST')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                view === 'LIST' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView('TIMELINE')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                view === 'TIMELINE' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* No event selected */}
      {!currentEvent && (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 text-center">
          <CheckSquare className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-semibold">No event selected</p>
          <p className="text-xs text-slate-500">Select an event from the sidebar to view its tasks and roadmap.</p>
        </div>
      )}

      {/* Event selected but no tasks yet */}
      {currentEvent && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
          <CheckSquare className="w-10 h-10 text-slate-600" />
          <p className="text-slate-300 font-semibold">No tasks for "{currentEvent.name}" yet</p>
          <p className="text-xs text-slate-500">Click <span className="text-primary-400 font-bold">+ New Task</span> to add the first deliverable for this event.</p>
        </div>
      )}

      {/* Filter Bar — only show when there are tasks */}
      {currentEvent && tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter tasks by title or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setSelectedTeam('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  selectedTeam === 'ALL' ? 'bg-primary-600 text-white' : 'bg-background-card border border-border text-slate-400'
                }`}
              >
                All Teams
              </button>
              {teams.map((tm) => (
                <button
                  key={tm.id}
                  onClick={() => setSelectedTeam(tm.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    selectedTeam === tm.id ? 'bg-primary-600 text-white' : 'bg-background-card border border-border text-slate-400'
                  }`}
                >
                  {tm.name.split(' ')[0]}
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
            return (
              <div key={col} className="bg-background-card/70 border border-border rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{col.replace('_', ' ')}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-background-subtle text-slate-300">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-background-subtle border border-border hover:border-border-highlight transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-primary-400 font-semibold truncate max-w-[120px]">
                          {t.team?.name || 'General'}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          t.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-primary-500/20 text-primary-300'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white leading-snug">{t.title}</div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{new Date(t.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        <span className="text-slate-300 truncate max-w-[80px]">
                          {t.assignee?.name || 'Unassigned'}
                        </span>
                      </div>

                      {/* Quick Status Shift Selector & Actions */}
                      <div className="pt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Move:</span>
                        <div className="flex items-center space-x-1">
                          {columns.filter(c => c !== col).map((targetCol) => (
                            <button
                              key={targetCol}
                              onClick={() => handleStatusChange(t.id, targetCol)}
                              className="px-1.5 py-0.5 rounded bg-background-hover hover:bg-primary-600/30 text-slate-400 hover:text-white transition-colors"
                            >
                              {targetCol === 'IN_PROGRESS' ? 'PROG' : targetCol}
                            </button>
                          ))}
                          <button
                            onClick={() => handleDeleteTask(t.id, t.title)}
                            title="Delete task"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500">No tasks</div>
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
                  <th className="p-4 text-right">Actions</th>
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
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteTask(t.id, t.title)}
                        title="Delete task"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TIMELINE — Tasks & Deliverables Roadmap */}
      {currentEvent && tasks.length > 0 && view === 'TIMELINE' && (() => {
        const now = new Date();

        // Build unified roadmap entries from operational tasks and deliverables
        const entries: {
          date: Date;
          label: string;
          sublabel?: string;
          type: 'task' | 'meeting' | 'risk';
          status?: string;
          priority?: string;
          isToday?: boolean;
          isPast?: boolean;
        }[] = [];

        // All task deliverables & deadlines
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

        // Sort all entries chronologically
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        const typeConfig: Record<string, { color: string; dot: string; badge: string }> = {
          task:    { color: 'text-white',   dot: 'bg-primary-500', badge: 'bg-primary-500/20 text-primary-300 border-primary-500/40' },
          meeting: { color: 'text-violet-300', dot: 'bg-violet-500', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
          risk:    { color: 'text-amber-300', dot: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
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
                <h3 className="text-sm font-bold text-white">Tasks & Deliverables Roadmap</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{entries.length} roadmap items · sorted chronologically</p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500 inline-block"/>Tasks</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block"/>Meetings</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Risks</span>
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
                        isPast ? 'opacity-60' : 'hover:bg-background-subtle/60'
                      }`}>
                        {/* Dot */}
                        <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          isPast && entry.type === 'task' && entry.status === 'DONE' ? 'border-emerald-500 bg-emerald-500/20' :
                          `border-border bg-background-subtle`
                        }`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${isPast ? 'opacity-50' : ''}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <span className={`text-xs font-bold leading-snug ${cfg.color} ${isPast && entry.status !== 'DONE' ? 'line-through opacity-70' : ''}`}>
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
                  className={`w-full bg-background-subtle border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none ${
                    isDuplicateTitle ? 'border-rose-500/80 focus:border-rose-500' : 'border-border focus:border-primary-500'
                  }`}
                />
                {isDuplicateTitle && (
                  <p className="text-[11px] text-rose-400 mt-1.5 flex items-center space-x-1 font-medium animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>A task with this title already exists. Task names must be unique.</span>
                  </p>
                )}
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
                  disabled={creating || isDuplicateTitle || !newTask.title.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-1.5"
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
