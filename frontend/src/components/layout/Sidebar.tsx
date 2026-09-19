import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Network, CheckSquare, ShieldAlert, GitFork,
  FileText, Users, AlertTriangle, Brain, Megaphone, BarChart3, Bot, Zap
} from 'lucide-react';

interface SidebarProps { onOpenCopilot: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCopilot }) => {
  const navLinks = [
    { to: '/mission-control', label: 'Mission Control',      icon: LayoutDashboard },
    { to: '/digital-twin',    label: 'Digital Twin',         icon: Network,        badge: 'Twin' },
    { to: '/tasks',           label: 'Tasks & Roadmap',      icon: CheckSquare },
    { to: '/war-room',        label: 'AI War Room',          icon: ShieldAlert,    badge: 'Live', badgeDanger: true },
    { to: '/simulator',       label: 'What-If Simulator',    icon: GitFork },
    { to: '/meetings',        label: 'Meeting Intelligence', icon: FileText },
    { to: '/volunteers',      label: 'Volunteer Matching',   icon: Users },
    { to: '/risks',           label: 'Risk Radar',           icon: AlertTriangle },
    { to: '/brain',           label: 'Club Brain',           icon: Brain },
    { to: '/announcements',   label: 'Announcement Engine',  icon: Megaphone },
    { to: '/analytics',       label: 'Analytics & Reports',  icon: BarChart3 },
  ];

  return (
    <aside className="w-60 hidden md:flex flex-col justify-between py-4 px-2.5 flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--nav-border)',
      }}>

      {/* Nav section label */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        <div className="px-3 pb-2 pt-1"
          style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Inter' }}>
          Event Operations
        </div>

        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to}
              className="block transition-all"
              style={{ borderRadius: '0.625rem' }}>
              {({ isActive }) => (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] transition-all group"
                  style={{
                    background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                    border: isActive ? `1px solid var(--sidebar-active-border)` : '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-muted)' }}
                    />
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                      fontFamily: 'Inter',
                    }}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, fontFamily: 'JetBrains Mono',
                      padding: '0.15rem 0.45rem', borderRadius: '9999px',
                      background: item.badgeDanger ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.15)',
                      color: item.badgeDanger ? '#F87171' : '#818CF8',
                      border: `1px solid ${item.badgeDanger ? 'rgba(244,63,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                      letterSpacing: '0.04em',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* AI Chatbot Card */}
      <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--nav-border)' }}>
        <div className="p-3.5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
          {/* Header */}
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
              <Bot className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                AI Chatbot
              </div>
              <div style={{ fontSize: '0.6rem', color: '#818CF8', fontFamily: 'Inter' }}>
                Ready to assist &amp; act
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5, fontFamily: 'Inter' }}>
            Ask anything, detect bottlenecks, or get live event insights.
          </p>

          <button onClick={onOpenCopilot}
            className="w-full py-2 px-3 rounded-xl text-white font-bold transition-all flex items-center justify-center space-x-1.5"
            style={{
              background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
              fontSize: '0.7rem',
              fontFamily: 'Outfit',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}>
            <Zap className="w-3.5 h-3.5" />
            <span>Ask AI Chatbot</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
