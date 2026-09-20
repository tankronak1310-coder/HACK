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
  Calendar,
  Plus,
  Layers
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { api } from '../services/api.js';
import { ProposedAction } from '../types/index.js';
import { ActionConfirmationModal } from '../components/common/ActionConfirmationModal.js';

interface MissionControlProps {
  onOpenCopilot: () => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onOpenCopilot }) => {
  const { currentClub, currentEvent, events, selectEvent, setCreateEventOpen, healthScore, refreshEvent } = useEvent();
  const navigate = useNavigate();

  const [selectedAction, setSelectedAction] = useState<ProposedAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [volunteerCount, setVolunteerCount] = useState<number>(0);

  useEffect(() => {
    if (currentClub?.id && currentEvent?.id) {
      setVolunteerCount(0);
      api.getVolunteers(currentClub.id, currentEvent.id)
        .then((vols: any) => setVolunteerCount(Array.isArray(vols) ? vols.length : 0))
        .catch(() => setVolunteerCount(0));
    } else {
      setVolunteerCount(0);
    }
  }, [currentClub?.id, currentEvent?.id]);

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
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Health Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-950/40 via-background-card to-background-subtle border border-border/80 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <span className="live-pulse" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Live Event Command Center
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 font-mono">
              {currentEvent?.name?.toUpperCase() || 'NO ACTIVE EVENT'}
            </span>

          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Event Mission Control
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            {currentEvent?.currentMilestone || 'Active Sprint: Venue Clearances & Registration Surge'} • Next key milestone in 48 hours.
          </p>
        </div>

        {/* Right side controls: + Add Event & Health Score Gauge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={() => setCreateEventOpen(true)}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-primary-500/25 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Another Event</span>
          </button>

          {/* Health Score Gauge */}
          <div className="flex items-center space-x-5 bg-background-subtle/80 p-4 rounded-2xl border border-border">
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* SVG Circular Progress */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-border"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke={healthStyle.ring}
                  strokeWidth="6"
                  strokeDasharray={200}
                  strokeDashoffset={200 - (200 * healthScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-extrabold ${healthStyle.text}`}>
                  {healthScore}
                </span>
                <span className="text-[9px] text-slate-500 font-bold">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Health Status
              </div>
              <div className={`text-sm font-bold mt-0.5 ${healthStyle.text}`}>
                {healthStyle.label}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {healthScore >= 80 ? 'All operations on track' : `${blockedTasks.length} blocked • ${criticalRisks.length} critical risks`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Risks */}
        <div 
          onClick={() => navigate('/risks')}
          className="p-5 rounded-2xl bg-background-card border border-border hover:border-rose-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Critical Risks</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">{criticalRisks.length} Active</div>
          <div className="text-xs text-rose-400 mt-1 flex items-center space-x-1">
            <span>{criticalRisks.length > 0 ? 'Requires lead escalation' : 'No critical risks'}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Task Progress */}
        <div 
          onClick={() => navigate('/tasks')}
          className="p-5 rounded-2xl bg-background-card border border-border hover:border-emerald-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Task Velocity</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {completedTasks.length} / {tasks.length} Done
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center space-x-1">
            <span>{tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% overall completion</span>
          </div>
        </div>

        {/* Blocked Milestones */}
        <div 
          onClick={() => navigate('/digital-twin')}
          className="p-5 rounded-2xl bg-background-card border border-border hover:border-amber-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Critical Path Blockers</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">{blockedTasks.length} Tasks Blocked</div>
          <div className="text-xs text-amber-400 mt-1 flex items-center space-x-1">
            <span>{blockedTasks.length > 0 ? (blockedTasks[0].title || 'Dependency bottlenecks') : 'No critical path blockers'}</span>
          </div>
        </div>

        {/* Volunteers */}
        <div 
          onClick={() => navigate('/volunteers')}
          className="p-5 rounded-2xl bg-background-card border border-border hover:border-violet-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Volunteer Operations</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {volunteerCount} {volunteerCount === 1 ? 'Volunteer' : 'Volunteers'}
          </div>
          <div className="text-xs text-violet-400 mt-1 flex items-center space-x-1">
            <span>{volunteerCount > 0 ? 'Smart matching active' : 'No volunteers registered'}</span>
          </div>
        </div>
      </div>

      {/* Multi-Event Operations Hub */}
      <div className="bg-background-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Multi-Event Operations Hub</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  {events.length} {events.length === 1 ? 'Event' : 'Simultaneous Events'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Switch seamlessly between active club events or spin up another event to manage simultaneously.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreateEventOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Event</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {events.map((ev) => {
            const isSelected = ev.id === currentEvent?.id;
            return (
              <div
                key={ev.id}
                onClick={() => {
                  if (!isSelected) selectEvent(ev.id);
                }}
                className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-gradient-to-br from-primary-950/40 via-background-subtle to-background-card border-primary-500/60 shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/30'
                    : 'bg-background-subtle/70 hover:bg-background-subtle border-border hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                      {ev.type || 'GENERAL'}
                    </span>
                    {isSelected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>ACTIVE WORKSPACE</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {ev.status || 'PLANNING'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                    {ev.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {ev.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-slate-400">
                    <span className="flex items-center space-x-1">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>{(ev as any)._count?.tasks ?? ev.tasks?.length ?? 0} tasks</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{(ev as any)._count?.volunteers ?? 0} vols</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{(ev as any)._count?.risks ?? ev.risks?.length ?? 0} risks</span>
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="text-[11px] font-bold text-primary-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Viewing</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEvent(ev.id);
                      }}
                      className="text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center space-x-1"
                    >
                      <span>Switch</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Quick Launch Another Event Card */}
          <div
            onClick={() => setCreateEventOpen(true)}
            className="p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary-500/50 hover:bg-primary-500/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-primary-500/20 text-slate-400 group-hover:text-primary-300 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-300 group-hover:text-white">
              Launch Another Event
            </div>
            <div className="text-[11px] text-slate-500 max-w-[200px]">
              Manage hackathons, cultural fests, symposiums simultaneously.
            </div>
          </div>
        </div>
      </div>

      {/* Main Center Grid: Digital Twin Preview (Left 7 cols) & AI Recommendations (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Event Digital Twin Card Preview */}
        <div className="lg:col-span-7 bg-background-card border border-border rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Network className="w-4 h-4 text-primary-400" />
                  <span>Live Event Digital Twin Preview</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive topological dependency mapping of operational deliverables.
                </p>
              </div>
              <button
                onClick={() => navigate('/digital-twin')}
                className="px-3 py-1.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <span>Full Graph</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Preview Canvas with Node Blocks */}
            <div className="p-4 rounded-2xl bg-background-subtle border border-border/80 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-border/60">
                <span>Critical Path Flow</span>
                <span className="text-rose-400 font-bold">• 1 Severe Bottleneck Detected</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
                  <div className="text-[10px] font-mono text-rose-300 font-bold">PREREQUISITE #1</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">Auditorium Clearances</div>
                  <div className="text-[10px] text-slate-400 mt-1">Status: IN_PROGRESS (Overdue)</div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="text-[10px] font-mono text-amber-300 font-bold">DEPENDENT #2</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">Stage Truss Rigging</div>
                  <div className="text-[10px] text-slate-400 mt-1">Status: BLOCKED by Permit</div>
                </div>

                <div className="p-3.5 rounded-xl bg-background-card border border-border">
                  <div className="text-[10px] font-mono text-cyan-300 font-bold">DOWNSTREAM #3</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">Main Stage Soundcheck</div>
                  <div className="text-[10px] text-slate-400 mt-1">Status: WAITING</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Graph Nodes: <strong>{tasks.length} tasks, 6 teams</strong></span>
            <button
              onClick={() => navigate('/simulator')}
              className="text-primary-400 hover:text-primary-300 font-semibold flex items-center space-x-1"
            >
              <span>Simulate delays in What-If sandbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Autonomous AI Recommendations Card */}
        <div className="lg:col-span-5 bg-background-card border border-border rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">AI Recommendations</h3>
              </div>
              <button
                onClick={onOpenCopilot}
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
              >
                Open Chatbot
              </button>
            </div>

            <div className="space-y-3">
              {/* Recommendation 1 */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/20 to-background-subtle border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                    HIGH PRIORITY
                  </span>
                  <span className="text-[10px] text-slate-400">Logistics Bottleneck</span>
                </div>
                <div className="text-xs font-bold text-white">
                  Notify owners of 4 overdue venue milestones
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Clearance delays threaten auditorium staging. Send automated escalation notice to Core Committee.
                </p>
                <button
                  onClick={() => handleActionClick({
                    id: 'rec-1',
                    type: 'NOTIFY_TEAM',
                    title: 'Send Overdue Milestones Notice',
                    description: 'Dispatch urgent WhatsApp & Email notifications to responsible logistics coordinators.',
                    buttonLabel: 'Notify Owners',
                    payload: { eventId: currentEvent?.id, count: 4 },
                  })}
                  className="w-full py-2 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Review & Notify Owners</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Recommendation 2 */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/20 to-background-subtle border border-violet-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono">
                    WORKLOAD REBALANCE
                  </span>
                  <span className="text-[10px] text-slate-400">Hospitality Desk</span>
                </div>
                <div className="text-xs font-bold text-white">
                  Reallocate 3 volunteers to registration
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Morning rush model predicts 28 min queue wait. 3 media volunteers currently have LOW workload.
                </p>
                <button
                  onClick={() => handleActionClick({
                    id: 'rec-2',
                    type: 'REALLOCATE_VOLUNTEERS',
                    title: 'Reallocate 3 Volunteers to Check-in',
                    description: 'Shift 3 volunteers from Marketing to Hospitality check-in desk for 8 AM peak.',
                    buttonLabel: 'Reassign Volunteers',
                    payload: { eventId: currentEvent?.id, targetTeam: 'Hospitality', count: 3 },
                  })}
                  className="w-full py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Approve Volunteer Reallocation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Activity & Quick Actions */}
      <div className="bg-background-card border border-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Upcoming Critical Checkpoints</span>
          </h3>
          <button
            onClick={() => navigate('/tasks')}
            className="text-xs text-primary-400 hover:underline font-semibold"
          >
            View All Tasks
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tasks.slice(0, 3).map((t) => (
            <div key={t.id} className="p-4 rounded-2xl bg-background-subtle border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  t.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-primary-500/20 text-primary-300'
                }`}>
                  {t.priority}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(t.deadline).toLocaleDateString()}</span>
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate">{t.title}</div>
              <div className="text-[11px] text-slate-400 truncate">{t.team?.name || 'General Operations'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Approval Modal */}
      <ActionConfirmationModal
        action={selectedAction}
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSuccess={() => {
          refreshEvent();
        }}
      />
    </div>
  );
};
