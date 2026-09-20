import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  CheckSquare,
  ShieldAlert,
  GitFork,
  FileText,
  Users,
  AlertTriangle,
  Brain,
  Megaphone,
  BarChart3,
  Bot
} from 'lucide-react';

interface SidebarProps {
  onOpenCopilot: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCopilot }) => {
  const navLinks = [
    { to: '/mission-control', label: 'Mission Control', icon: LayoutDashboard },
    { to: '/digital-twin', label: 'Digital Twin', icon: Network, badge: 'Twin' },
    { to: '/tasks', label: 'Tasks & Roadmap', icon: CheckSquare },
    { to: '/war-room', label: 'AI War Room', icon: ShieldAlert, badge: 'Live', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { to: '/simulator', label: 'What-If Simulator', icon: GitFork },
    { to: '/meetings', label: 'Meeting Intelligence', icon: FileText },
    { to: '/volunteers', label: 'Volunteer Matching', icon: Users },
    { to: '/risks', label: 'Risk Radar', icon: AlertTriangle },
    { to: '/brain', label: 'Club Brain', icon: Brain },
    { to: '/announcements', label: 'Announcement Engine', icon: Megaphone },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-r border-border bg-background-card/50 backdrop-blur-md hidden md:flex flex-col justify-between py-4 px-3 flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      {/* Navigation list */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Event Operations
        </div>
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-primary-600/15 text-primary-300 border border-primary-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-background-hover'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${item.badgeColor || 'bg-primary-500/20 text-primary-400 border-primary-500/30'}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Floating AI Chatbot Trigger Card at bottom of Sidebar */}
      <div className="pt-4 border-t border-border">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary-900/30 via-background-card to-accent-violet/10 border border-primary-500/20 relative overflow-hidden">
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">AI Chatbot</div>
              <div className="text-[10px] text-primary-300">Ready to assist & act</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Ask anything about the website, detect bottlenecks, or get live event insights.
          </p>
          <button
            onClick={onOpenCopilot}
            className="w-full py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-glow transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Ask AI Chatbot</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
