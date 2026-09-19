import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useEvent } from '../../context/EventContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import {
  Sparkles, Search, Bell, ShieldAlert, ChevronDown,
  LogOut, User as UserIcon, Activity, Layers, Sun, Moon, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandPalette, onOpenNotifications, unreadCount }) => {
  const { user, logout } = useAuth();
  const { currentEvent, events, setCurrentEvent, healthScore } = useEvent();
  const { toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const healthBadgeStyle = () => {
    if (healthScore >= 80) return { color: '#34D399', border: 'rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.08)' };
    if (healthScore >= 60) return { color: '#FBBF24', border: 'rgba(251,191,36,0.25)', bg: 'rgba(251,191,36,0.08)' };
    return { color: '#F87171', border: 'rgba(248,113,113,0.25)', bg: 'rgba(248,113,113,0.08)' };
  };
  const hStyle = healthBadgeStyle();

  return (
    <header className="h-14 nav-surface sticky top-0 z-40 px-4 md:px-5 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--nav-border)' }}>

      {/* LEFT: Brand + Event Selector */}
      <div className="flex items-center space-x-3">
        {/* Logo */}
        <div onClick={() => navigate('/mission-control')}
          className="flex items-center space-x-2 cursor-pointer group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div className="hidden sm:flex items-center space-x-1.5">
            <span className="font-heading font-black text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              CLUBOPS
            </span>
            <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md font-mono"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
              AI
            </span>
          </div>
        </div>

        {/* Event Selector */}
        {currentEvent && (
          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}>
              <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#818CF8' }} />
              <span className="text-xs font-semibold max-w-[110px] truncate">{currentEvent.name}</span>
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded font-mono"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                {currentEvent.status}
              </span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-60 rounded-xl p-1.5 z-50 animate-scale-in"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <div className="text-2xs font-bold uppercase tracking-widest px-2.5 py-1.5 font-body"
                  style={{ color: 'var(--text-muted)' }}>Switch Event</div>
                {events.map(ev => (
                  <button key={ev.id} onClick={() => { setCurrentEvent(ev); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all"
                    style={{
                      background: ev.id === currentEvent.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: ev.id === currentEvent.id ? '#818CF8' : 'var(--text-secondary)',
                    }}>
                    <span className="truncate font-medium">{ev.name}</span>
                    <span className="text-2xs font-mono" style={{ color: 'var(--text-muted)' }}>{ev.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CENTER: Search */}
      <div className="hidden md:flex flex-1 max-w-xs mx-4">
        <button onClick={onOpenCommandPalette}
          className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs transition-all"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
          }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left">Search tasks, risks, volunteers...</span>
          <kbd className="text-2xs font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center space-x-1.5">
        {/* Health Score */}
        <div onClick={() => navigate('/mission-control')}
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-all"
          style={{ background: hStyle.bg, border: `1px solid ${hStyle.border}`, color: hStyle.color }}>
          <Activity className="w-3.5 h-3.5" />
          <span>Health: {healthScore}/100</span>
        </div>

        {/* War Room */}
        <button onClick={() => navigate('/war-room')}
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.25)',
            color: '#F87171',
          }}>
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>WAR ROOM</span>
        </button>

        {/* Notifications */}
        <button onClick={onOpenNotifications}
          className="relative p-2 rounded-lg transition-all"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-2xs font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg transition-all"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          {isDark
            ? <Sun className="w-4 h-4" style={{ color: '#FBBF24' }} />
            : <Moon className="w-4 h-4" style={{ color: '#818CF8' }} />
          }
        </button>

        {/* User Avatar */}
        <div className="relative">
          <button onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 pl-1.5 pr-2 py-1 rounded-xl transition-all"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                {user?.name || 'User'}
              </div>
              <div className="text-2xs mt-0.5 font-body" style={{ color: 'var(--text-muted)' }}>
                {user?.role || 'ORGANIZER'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: 'var(--text-muted)' }} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-xl p-1.5 z-50 animate-scale-in"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
                <div className="text-xs truncate font-body" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button onClick={() => { navigate('/brain'); setUserMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center space-x-2 transition-all"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <UserIcon className="w-4 h-4" />
                <span>Club Profile & Brain</span>
              </button>
              <button onClick={() => { logout(); navigate('/auth'); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center space-x-2 transition-all"
                style={{ color: '#F87171' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
