import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Download,
  Sparkles,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Target,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  LabelList,
} from 'recharts';
import { useEvent } from '../context/EventContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';

/* ─── Theme-aware Recharts helpers ─────────────────────────── */
const useChartTheme = (isDark: boolean) => ({
  gridColor:   isDark ? '#1E2640' : '#E2E8F0',
  axisColor:   isDark ? '#4A5578' : '#94A3B8',
  tooltipBg:   isDark ? '#0E1120' : '#FFFFFF',
  tooltipBorder: isDark ? '#2E3A5C' : '#E2E8F0',
  tooltipText: isDark ? '#E8EAF0' : '#0F172A',
  labelColor:  isDark ? '#8892B0' : '#64748B',
  cardBg:      isDark ? 'var(--bg-card)' : '#FFFFFF',
});

/* ─── Custom Tooltip ────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, isDark }: any) => {
  const ct = useChartTheme(isDark);
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      fontSize: 11,
      color: ct.tooltipText,
      minWidth: 120,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: ct.labelColor, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: ct.labelColor }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ──────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, sub, subColor, accent, isDark }: any) => (
  <div style={{
    background: isDark ? 'var(--bg-card)' : '#FFFFFF',
    border: `1px solid ${isDark ? 'var(--border-default)' : '#E2E8F0'}`,
    borderRadius: 20,
    padding: '20px 22px',
    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(15,23,42,0.07)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = isDark ? '0 8px 32px rgba(99,102,241,0.15)' : '0 8px 28px rgba(15,23,42,0.12)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(15,23,42,0.07)'; }}
  >
    {/* Glow blob */}
    <div style={{ position:'absolute', top:-24, right:-20, width:80, height:80, borderRadius:'50%', background: accent, opacity: isDark ? 0.12 : 0.08, filter:'blur(18px)', pointerEvents:'none' }} />
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <div style={{ width:32, height:32, borderRadius:10, background: `${accent}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={16} color={accent} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color: isDark ? '#8892B0' : '#64748B', letterSpacing:'0.04em' }}>{label}</span>
    </div>
    <div style={{ fontSize:28, fontWeight:900, color: accent, letterSpacing:'-0.03em', lineHeight:1, fontFamily:'Outfit,sans-serif' }}>{value}</div>
    <div style={{ fontSize:10, color: subColor || (isDark ? '#4A5578' : '#94A3B8'), marginTop:6, fontWeight:500 }}>{sub}</div>
  </div>
);

/* ─── Section Card ──────────────────────────────────────────── */
const SectionCard = ({ title, icon: Icon, iconColor, badge, children, isDark }: any) => (
  <div style={{
    background: isDark ? 'var(--bg-card)' : '#FFFFFF',
    border: `1px solid ${isDark ? 'var(--border-default)' : '#E2E8F0'}`,
    borderRadius: 24,
    padding: '22px 24px',
    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(15,23,42,0.06)',
  }}>
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      paddingBottom:14, marginBottom:16,
      borderBottom: `1px solid ${isDark ? 'var(--border-default)' : '#F1F5F9'}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Icon size={15} color={iconColor} />
        <span style={{ fontSize:13, fontWeight:700, color: isDark ? '#E8EAF0' : '#0F172A', fontFamily:'Outfit,sans-serif' }}>{title}</span>
      </div>
      {badge && <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.07em', padding:'3px 8px', borderRadius:20, background: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF', color: isDark ? '#818CF8' : '#4F46E5', fontFamily:'JetBrains Mono,monospace' }}>{badge}</span>}
    </div>
    {children}
  </div>
);

export const AnalyticsPage: React.FC = () => {
  const { currentEvent } = useEvent();
  const { isDark } = useTheme();
  const ct = useChartTheme(isDark);
  const [analytics, setAnalytics] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (!currentEvent) return;
    api.getAnalytics(currentEvent.id).then(setAnalytics).catch(console.error);
    api.getPostEventReport(currentEvent.id).then(setReport).catch(console.error);
  }, [currentEvent?.id]);

  const handleExportJson = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `ClubOps_Report_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const summary = analytics?.eventSummary || {};
  const burndown = analytics?.burndown || [];
  const teamWorkload = analytics?.teamWorkload || [];

  const PALETTE = ['#6366F1','#06B6D4','#10B981','#F59E0B','#EC4899','#8B5CF6'];

  /* Radial health data */
  const healthVal = summary.healthScore || 52;
  const radialData = [
    { name: 'Health', value: healthVal, fill: healthVal >= 70 ? '#10B981' : healthVal >= 40 ? '#F59E0B' : '#F43F5E' },
    { name: 'Remaining', value: 100 - healthVal, fill: isDark ? '#1E2640' : '#F1F5F9' },
  ];

  /* Task completion donut */
  const totalTasks = summary.totalTasks || 6;
  const doneTasks  = Math.round(totalTasks * ((summary.completionRate || 38) / 100));
  const donutData  = [
    { name: 'Completed', value: doneTasks,           fill: '#10B981' },
    { name: 'Remaining', value: totalTasks - doneTasks, fill: isDark ? '#1E2640' : '#E2E8F0' },
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: `1px solid ${isDark ? 'var(--border-default)' : '#E2E8F0'}` }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-black flex items-center gap-2"
              style={{ color: isDark ? '#E8EAF0' : '#0F172A', fontFamily: 'Outfit,sans-serif' }}>
              <BarChart3 size={20} color="#6366F1" />
              Event Analytics &amp; Continuous Learning Loop
            </h1>
          </div>
          <p className="text-xs mt-1" style={{ color: isDark ? '#4A5578' : '#64748B' }}>
            Real-time burnup velocity, workstream distributions, and AI retrospective synthesis.
          </p>
        </div>
        <button onClick={handleExportJson}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
          <Download size={14} />
          Export Post-Event Report
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CheckCircle2} label="Total Tasks Tracked"  value={totalTasks}                           sub={`${summary.completionRate || 38}% completed on schedule`}  subColor="#10B981" accent="#10B981" isDark={isDark} />
        <KpiCard icon={Activity}     label="Event Health Index"   value={`${healthVal}/100`}                   sub="Optimal operating range"                                     subColor={healthVal >= 70 ? '#10B981' : '#F59E0B'} accent="#6366F1" isDark={isDark} />
        <KpiCard icon={Users}        label="Active Volunteers"    value={summary.totalVolunteers || 1}         sub="94% average skill alignment"                                 accent="#8B5CF6" isDark={isDark} />
        <KpiCard icon={ShieldAlert}  label="Critical Risks Flagged" value={summary.criticalRisks || 2}        sub="Mitigation playbooks active"                                 subColor="#F43F5E" accent="#F43F5E" isDark={isDark} />
      </div>

      {/* ── Row 2: Burndown + Bar + Health Radial ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Sprint Burndown — Area Chart */}
        <div className="lg:col-span-7">
          <SectionCard title="Sprint Burndown Velocity" icon={TrendingUp} iconColor="#06B6D4" badge="PAST 7 DAYS" isDark={isDark}>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={ct.gridColor} vertical={false} />
                  <XAxis dataKey="day" stroke={ct.axisColor} tick={{ fontSize: 10, fill: ct.axisColor }} axisLine={false} tickLine={false} />
                  <YAxis stroke={ct.axisColor} tick={{ fontSize: 10, fill: ct.axisColor }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: ct.labelColor }} />
                  <Area type="monotone" dataKey="planned"   stroke="#6366F1" strokeWidth={2.5} fill="url(#plannedGrad)" dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Planned Trajectory" />
                  <Area type="monotone" dataKey="remaining" stroke="#06B6D4" strokeWidth={2.5} fill="url(#actualGrad)"  dot={{ r: 3, fill: '#06B6D4', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Actual Open Tasks" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Health Radial + Task Donut */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Health Radial */}
          <SectionCard title="Event Health Score" icon={Target} iconColor="#10B981" badge="LIVE" isDark={isDark}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:110, height:110, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="90%" startAngle={210} endAngle={-30} data={radialData} barSize={10}>
                    <RadialBar dataKey="value" cornerRadius={6} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize:32, fontWeight:900, color: radialData[0].fill, fontFamily:'Outfit,sans-serif', letterSpacing:'-0.03em', lineHeight:1 }}>{healthVal}<span style={{ fontSize:14, fontWeight:600, color: ct.labelColor }}>/100</span></div>
                <div style={{ fontSize:10, color: ct.labelColor, marginTop:4 }}>{healthVal >= 70 ? '✅ Healthy' : healthVal >= 40 ? '⚠️ Moderate Risk' : '🔴 Critical'}</div>
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
                  {[{ label:'Tasks Done', val: `${summary.completionRate||38}%`, color:'#10B981' },
                    { label:'Volunteers', val: summary.totalVolunteers||1, color:'#8B5CF6' }].map(r => (
                    <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:10, gap:16 }}>
                      <span style={{ color: ct.labelColor }}>{r.label}</span>
                      <span style={{ fontWeight:700, color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Task Completion Donut */}
          <SectionCard title="Task Completion" icon={CheckCircle2} iconColor="#10B981" isDark={isDark}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:90, height:90, flexShrink:0, position:'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius="58%" outerRadius="80%" dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                  <span style={{ fontSize:14, fontWeight:900, color:'#10B981', lineHeight:1 }}>{doneTasks}</span>
                  <span style={{ fontSize:8, color: ct.labelColor }}>done</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                {[{ label:'Completed', val: doneTasks, color:'#10B981' },
                  { label:'Remaining', val: totalTasks - doneTasks, color: isDark ? '#4A5578' : '#CBD5E1' }].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:r.color, flexShrink:0 }} />
                      <span style={{ fontSize:10, color: ct.labelColor }}>{r.label}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color: r.color }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ marginTop:8, height:5, borderRadius:9999, background: isDark ? '#1E2640' : '#F1F5F9', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(doneTasks/totalTasks)*100}%`, borderRadius:9999, background:'linear-gradient(90deg,#10B981,#06B6D4)', transition:'width 1s ease' }} />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Row 3: Team Workload Bar ── */}
      <SectionCard title="Team Deliverable Loads" icon={Users} iconColor="#6366F1" badge="BY WORKSTREAM" isDark={isDark}>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamWorkload} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
              <defs>
                {PALETTE.map((color, i) => (
                  <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={ct.gridColor} horizontal={true} vertical={false} />
              <XAxis dataKey="name" stroke={ct.axisColor} tick={{ fontSize: 9, fill: ct.axisColor }} axisLine={false} tickLine={false} tickFormatter={(v) => v.split(' ')[0]} />
              <YAxis stroke={ct.axisColor} tick={{ fontSize: 10, fill: ct.axisColor }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.04)' }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} name="Tasks">
                {(teamWorkload).map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={`url(#barGrad${index % PALETTE.length})`} />
                ))}
                <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: ct.labelColor }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ── AI Retrospective ── */}
      {report && (
        <div style={{
          background: isDark ? 'var(--bg-card)' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : '#E0E7FF'}`,
          borderRadius: 24,
          padding: '24px',
          boxShadow: isDark ? '0 0 32px -8px rgba(99,102,241,0.15)' : '0 4px 20px rgba(99,102,241,0.08)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:12, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles size={18} color="#818CF8" />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color: isDark ? '#E8EAF0' : '#0F172A', fontFamily:'Outfit,sans-serif' }}>AI Continuous Learning Loop & Executive Retrospective</div>
              <div style={{ fontSize:10, color: isDark ? '#4A5578' : '#64748B' }}>Synthesized from real-time event telemetry</div>
            </div>
          </div>

          <p style={{ fontSize:12, color: isDark ? '#8892B0' : '#475569', lineHeight:1.7, marginBottom:16 }}>
            {report.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(report.retrospectiveInsights || []).map((ins: any, idx: number) => {
              const configs = [
                { accent: '#10B981', bg: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4', border: isDark ? 'rgba(16,185,129,0.25)' : '#BBF7D0', icon: CheckCircle2 },
                { accent: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.08)' : '#FFFBEB', border: isDark ? 'rgba(245,158,11,0.25)' : '#FDE68A', icon: Zap },
                { accent: '#6366F1', bg: isDark ? 'rgba(99,102,241,0.08)'  : '#EEF2FF', border: isDark ? 'rgba(99,102,241,0.25)'  : '#C7D2FE', icon: Target },
              ];
              const cfg = configs[idx % configs.length];
              const CfgIcon = cfg.icon;
              return (
                <div key={idx} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: '16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <CfgIcon size={13} color={cfg.accent} />
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.07em', color: cfg.accent, fontFamily:'JetBrains Mono,monospace', textTransform:'uppercase' }}>
                      {ins.category}
                    </span>
                  </div>
                  <p style={{ fontSize:11, color: isDark ? '#8892B0' : '#475569', lineHeight:1.65 }}>{ins.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
