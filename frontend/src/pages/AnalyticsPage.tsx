import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Download, 
  Calendar, 
  Sparkles, 
  PieChart as PieIcon, 
  Activity 
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { useEvent } from '../context/EventContext.js';
import { api } from '../services/api.js';

export const AnalyticsPage: React.FC = () => {
  const { currentEvent } = useEvent();
  const [analytics, setAnalytics] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    if (!currentEvent) return;
    try {
      const data = await api.getAnalytics(currentEvent.id);
      setAnalytics(data);
      const rep = await api.getPostEventReport(currentEvent.id);
      setReport(rep);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentEvent?.id]);

  const handleExportJson = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ClubOps_TechFest_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <span>Event Analytics & Continuous Learning Loop</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time burnup velocity, workstream distributions, and AI retrospective synthesis.
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Post-Event Report</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-background-card border border-border">
          <div className="text-xs font-semibold text-slate-400">Total Tasks Tracked</div>
          <div className="text-2xl font-black text-white mt-1">
            {analytics?.eventSummary?.totalTasks || 52}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            {analytics?.eventSummary?.completionRate || 38}% completed on schedule
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-background-card border border-border">
          <div className="text-xs font-semibold text-slate-400">Event Health Index</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {analytics?.eventSummary?.healthScore || 82} / 100
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Optimal operating range
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-background-card border border-border">
          <div className="text-xs font-semibold text-slate-400">Active Volunteers</div>
          <div className="text-2xl font-black text-violet-400 mt-1">
            {analytics?.eventSummary?.totalVolunteers || 30}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            94% average skill alignment
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-background-card border border-border">
          <div className="text-xs font-semibold text-slate-400">Critical Risks Flagged</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {analytics?.eventSummary?.criticalRisks || 2}
          </div>
          <div className="text-[10px] text-rose-300 mt-1">
            Mitigation playbooks active
          </div>
        </div>
      </div>

      {/* Interactive Charts: Burndown & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Burndown Velocity Line Chart */}
        <div className="lg:col-span-7 bg-background-card border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-accent-cyan" />
              <span>Sprint Burndown Velocity</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Past 7 Days</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.burndown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D121D', borderColor: '#1E293B', borderRadius: '12px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="planned" stroke="#6366F1" strokeWidth={2} name="Planned Trajectory" />
                <Line type="monotone" dataKey="remaining" stroke="#06B6D4" strokeWidth={2} name="Actual Open Tasks" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Team Workload Bar Chart */}
        <div className="lg:col-span-5 bg-background-card border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-primary-400" />
              <span>Team Deliverable Loads</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">By Workstream</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.teamWorkload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 9 }} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D121D', borderColor: '#1E293B', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="total" fill="#6366F1" radius={[4, 4, 0, 0]}>
                  {(analytics?.teamWorkload || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Post-Event Learning Loop Card */}
      {report && (
        <div className="bg-background-card border border-primary-500/30 rounded-3xl p-6 space-y-5">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-accent-cyan" />
            <h3 className="text-base font-bold text-white">
              AI Continuous Learning Loop & Executive Retrospective
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {report.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {(report.retrospectiveInsights || []).map((ins: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-background-subtle border border-border space-y-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  idx === 0 ? 'bg-emerald-500/20 text-emerald-300' : idx === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-primary-500/20 text-primary-300'
                }`}>
                  {ins.category}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  {ins.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
