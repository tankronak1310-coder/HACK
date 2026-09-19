import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  CheckSquare, 
  Users, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Network, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { api } from '../services/api.js';
import { ProposedAction } from '../types/index.js';
import { ActionConfirmationModal } from '../components/common/ActionConfirmationModal.js';

interface MissionControlProps {
  onOpenCopilot: () => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onOpenCopilot }) => {
  const { currentClub, currentEvent, healthScore, refreshEvent } = useEvent();
  const navigate = useNavigate();

  const [selectedAction, setSelectedAction] = useState<ProposedAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [volunteerCount, setVolunteerCount] = useState<number>(0);

  useEffect(() => {
    if (currentClub?.id) {
      api.getVolunteers(currentClub.id)
        .then((vols: any) => setVolunteerCount(Array.isArray(vols) ? vols.length : 0))
        .catch(() => setVolunteerCount(0));
    } else {
      setVolunteerCount(0);
    }
  }, [currentClub?.id]);

  // Derive metrics from currentEvent
  const tasks = currentEvent?.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'DONE');
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');

  const risks = currentEvent?.risks || [];
  const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');

  const getHealthColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', ring: '#10B981', label: 'OPTIMAL' };
    if (score >= 60) return { text: 'text-amber-400', ring: '#F59E0B', label: 'DEGRADED' };
    return { text: 'text-rose-400', ring: '#F43F5E', label: 'CRITICAL HAZARD' };
  };

  const healthStyle = getHealthColor(healthScore);

  const handleActionClick = (action: ProposedAction) => {
    setSelectedAction(action);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Welcome & Health Header Banner */}
      <div className="relative p-6 rounded-3xl overflow-hidden border border-[var(--border-default)] shadow-card"
        style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-subtle) 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 flex-wrap gap-1">
              <span className="live-pulse" />
              <span className="text-2xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Live Event Command Center
              </span>
              <span className="badge badge-primary">
                {currentEvent?.name || 'No Active Event'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-heading font-black text-[var(--text-primary)] tracking-tight">
              Event <span className="text-gradient">Mission Control</span>
            </h1>
            <p className="text-xs font-body text-[var(--text-muted)] max-w-xl leading-relaxed">
              {currentEvent?.currentMilestone || 'Active Sprint: Venue Clearances & Registration Surge'} • Next key milestone in 48 hours.
            </p>
          </div>

          {/* Health Score Gauge */}
          <div className="flex items-center space-x-5 bg-[var(--bg-subtle)] p-4 rounded-2xl border border-[var(--border-default)] shadow-card">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" className="text-[var(--border-default)]" fill="transparent" />
                <circle cx="40" cy="40" r="32" stroke={healthStyle.ring} strokeWidth="6"
                  strokeDasharray={200} strokeDashoffset={200 - (200 * healthScore) / 100}
                  strokeLinecap="round" fill="transparent" className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-black font-heading ${healthStyle.text}`}>{healthScore}</span>
                <span className="text-2xs text-[var(--text-muted)] font-mono">/100</span>
              </div>
            </div>
            <div>
              <div className="kpi-label mb-1">Health Status</div>
              <div className={`text-sm font-bold font-heading ${healthStyle.text}`}>{healthStyle.label}</div>
              <div className="text-2xs text-[var(--text-muted)] mt-1 font-body">
                {healthScore >= 80 ? 'All operations on track' : `${blockedTasks.length} blocked • ${criticalRisks.length} critical risks`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate('/risks')} className="kpi-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Critical Risks</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/20 group-hover:scale-110 transition-transform shadow-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value text-rose-500">{criticalRisks.length} <span className="text-base font-semibold">Active</span></div>
          <div className="text-xs text-rose-500 mt-2 flex items-center space-x-1 font-body">
            <span>{criticalRisks.length > 0 ? 'Requires lead escalation' : 'No critical risks'}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        <div onClick={() => navigate('/tasks')} className="kpi-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Task Velocity</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20 group-hover:scale-110 transition-transform shadow-sm">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value text-emerald-600">{completedTasks.length}<span className="text-base font-semibold text-[var(--text-muted)]"> / {tasks.length}</span></div>
          <div className="mt-2">
            <div className="progress-track">
              <div className="progress-fill progress-fill-success" style={{ width: `${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%` }} />
            </div>
            <div className="text-2xs text-emerald-600 mt-1 font-body">{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% complete</div>
          </div>
        </div>

        <div onClick={() => navigate('/digital-twin')} className="kpi-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Path Blockers</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20 group-hover:scale-110 transition-transform shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value text-amber-600">{blockedTasks.length} <span className="text-base font-semibold">Blocked</span></div>
          <div className="text-xs text-amber-600 mt-2 font-body truncate">
            {blockedTasks.length > 0 ? (blockedTasks[0].title || 'Dependency bottlenecks') : 'No blockers detected'}
          </div>
        </div>

        <div onClick={() => navigate('/volunteers')} className="kpi-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Volunteers</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 border border-violet-200 dark:border-violet-500/20 group-hover:scale-110 transition-transform shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="kpi-value text-violet-600">{volunteerCount}</div>
          <div className="text-xs text-violet-600 mt-2 font-body">
            {volunteerCount > 0 ? 'Smart matching active' : 'No volunteers registered'}
          </div>
        </div>
      </div>

      {/* Main Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Digital Twin Card */}
        <div className="lg:col-span-7 card-themed p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-heading font-bold text-[var(--text-primary)] flex items-center space-x-2">
                  <Network className="w-4 h-4 text-primary-500" />
                  <span>Live Event Digital Twin Preview</span>
                </h3>
                <p className="text-2xs text-[var(--text-muted)] mt-0.5 font-body">
                  Interactive topological dependency mapping of operational deliverables.
                </p>
              </div>
              <button onClick={() => navigate('/digital-twin')}
                className="btn-ghost text-xs px-3 py-1.5 flex items-center space-x-1">
                <span>Full Graph</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] space-y-3">
              <div className="flex items-center justify-between text-2xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-default)]">
                <span className="font-semibold font-body">Critical Path Flow</span>
                <span className="text-rose-500 font-bold font-mono">⚠ 1 Severe Bottleneck Detected</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40">
                  <div className="text-2xs font-mono text-rose-600 dark:text-rose-300 font-bold">PREREQUISITE #1</div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">Auditorium Clearances</div>
                  <div className="text-2xs text-[var(--text-muted)] mt-1">IN_PROGRESS (Overdue)</div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30">
                  <div className="text-2xs font-mono text-amber-600 dark:text-amber-300 font-bold">DEPENDENT #2</div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">Stage Truss Rigging</div>
                  <div className="text-2xs text-[var(--text-muted)] mt-1">BLOCKED by Permit</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
                  <div className="text-2xs font-mono text-cyan-600 dark:text-cyan-300 font-bold">DOWNSTREAM #3</div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">Main Stage Soundcheck</div>
                  <div className="text-2xs text-[var(--text-muted)] mt-1">WAITING</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-body">Total Graph Nodes: <strong className="text-[var(--text-primary)]">{tasks.length} tasks, 6 teams</strong></span>
            <button onClick={() => navigate('/simulator')}
              className="text-primary-500 hover:text-primary-600 font-semibold flex items-center space-x-1 text-xs">
              <span>Simulate delays</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: AI Recommendations */}
        <div className="lg:col-span-5 card-themed p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-500/20 border border-primary-200 dark:border-primary-500/40 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-heading font-bold text-[var(--text-primary)]">AI Recommendations</h3>
              </div>
              <button onClick={onOpenCopilot} className="text-xs text-primary-500 hover:text-primary-600 font-semibold">
                Open Chatbot
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-[var(--bg-subtle)] dark:from-rose-950/20 dark:to-background-subtle border border-rose-200 dark:border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge badge-danger">HIGH PRIORITY</span>
                  <span className="text-2xs text-[var(--text-muted)] font-body">Logistics</span>
                </div>
                <div className="text-xs font-bold font-heading text-[var(--text-primary)]">Notify owners of 4 overdue venue milestones</div>
                <p className="text-2xs text-[var(--text-secondary)] leading-relaxed font-body">
                  Clearance delays threaten auditorium staging. Send automated escalation notice to Core Committee.
                </p>
                <button onClick={() => handleActionClick({ id:'rec-1', type:'NOTIFY_TEAM', title:'Send Overdue Milestones Notice', description:'Dispatch urgent WhatsApp & Email notifications.', buttonLabel:'Notify Owners', payload:{ eventId:currentEvent?.id, count:4 } })}
                  className="w-full py-2 rounded-xl bg-primary-50 dark:bg-primary-600/20 hover:bg-primary-100 dark:hover:bg-primary-600/30 text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5">
                  <span>Review & Notify Owners</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-[var(--bg-subtle)] dark:from-violet-950/20 dark:to-background-subtle border border-violet-200 dark:border-violet-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge badge-primary">REBALANCE</span>
                  <span className="text-2xs text-[var(--text-muted)] font-body">Hospitality</span>
                </div>
                <div className="text-xs font-bold font-heading text-[var(--text-primary)]">Reallocate 3 volunteers to registration</div>
                <p className="text-2xs text-[var(--text-secondary)] leading-relaxed font-body">
                  Morning rush model predicts 28 min queue wait. 3 media volunteers currently have LOW workload.
                </p>
                <button onClick={() => handleActionClick({ id:'rec-2', type:'REALLOCATE_VOLUNTEERS', title:'Reallocate 3 Volunteers to Check-in', description:'Shift 3 volunteers from Marketing to Hospitality check-in desk.', buttonLabel:'Reassign Volunteers', payload:{ eventId:currentEvent?.id, targetTeam:'Hospitality', count:3 } })}
                  className="w-full py-2 rounded-xl bg-violet-50 dark:bg-violet-600/20 hover:bg-violet-100 dark:hover:bg-violet-600/30 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5">
                  <span>Approve Reallocation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Upcoming Checkpoints */}
      <div className="card-themed p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-heading font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Upcoming Critical Checkpoints</span>
          </h3>
          <button onClick={() => navigate('/tasks')} className="text-xs text-primary-500 hover:text-primary-600 font-semibold">
            View All Tasks
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tasks.slice(0, 3).map((t) => (
            <div key={t.id} className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] space-y-2 hover:border-[var(--border-hi)] transition-all hover:shadow-card group">
              <div className="flex items-center justify-between">
                <span className={`badge ${t.priority === 'CRITICAL' ? 'badge-danger' : t.priority === 'HIGH' ? 'badge-warning' : 'badge-primary'}`}>
                  {t.priority}
                </span>
                <span className="text-2xs text-[var(--text-muted)] flex items-center space-x-1 font-body">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(t.deadline).toLocaleDateString()}</span>
                </span>
              </div>
              <div className="text-xs font-bold font-heading text-[var(--text-primary)] truncate">{t.title}</div>
              <div className="text-2xs text-[var(--text-muted)] truncate font-body">{t.team?.name || 'General Operations'}</div>
            </div>
          ))}
        </div>
      </div>

      <ActionConfirmationModal action={selectedAction} isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onSuccess={() => { refreshEvent(); }} />
    </div>
  );
};
