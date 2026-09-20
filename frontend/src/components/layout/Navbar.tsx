import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useEvent } from '../../context/EventContext.js';
import { 
  Sparkles, 
  Search, 
  Bell, 
  ShieldAlert, 
  ChevronDown, 
  LogOut, 
  User as UserIcon,
  Activity,
  Layers,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCommandPalette, 
  onOpenNotifications, 
  unreadCount 
}) => {
  const { user, logout } = useAuth();
  const { currentEvent, events, selectEvent, setCreateEventOpen, healthScore } = useEvent();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <header className="h-16 border-b border-border bg-background-card/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand & Event Selector */}
      <div className="flex items-center space-x-6">
        <div 
          onClick={() => navigate('/mission-control')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-cyan p-0.5 shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-cyan group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-white">CLUBOPS</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 border border-primary-500/30">AI</span>
            </div>
          </div>
        </div>

        {/* Active Event Selector & Switcher */}
        <div className="flex items-center space-x-1.5">
          {currentEvent ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-background-subtle border border-border hover:border-primary-500/40 text-sm text-slate-200 transition-colors"
                title="Click to switch active event"
              >
                <Layers className="w-4 h-4 text-primary-400" />
                <span className="font-semibold max-w-[140px] truncate">{currentEvent.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {currentEvent.status}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-background-card border border-border shadow-2xl p-2 z-50 animate-scale-in">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/80 mb-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Event ({events.length})
                    </span>
                    <span className="text-[10px] text-primary-400 font-mono">Live Workspace</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => {
                          selectEvent(ev);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                          ev.id === currentEvent.id
                            ? 'bg-primary-600/25 text-primary-200 font-bold border border-primary-500/30'
                            : 'text-slate-300 hover:bg-background-hover'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-semibold text-white">{ev.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{ev.type} • {ev.location}</div>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          ev.status === 'PLANNING' ? 'bg-blue-500/20 text-blue-300' :
                          ev.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {ev.status}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border mt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setCreateEventOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/40 text-primary-300 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Another Event</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setCreateEventOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-glow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </button>
          )}

          {/* Quick Add Event button */}
          {currentEvent && (
            <button
              onClick={() => setCreateEventOpen(true)}
              className="p-1.5 rounded-xl bg-background-subtle hover:bg-background-hover border border-border text-slate-400 hover:text-white transition-colors"
              title="Add another event to manage simultaneously"
            >
              <Plus className="w-4 h-4 text-primary-400" />
            </button>
          )}
        </div>
      </div>

      {/* Center Search / Command Palette shortcut */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-3 px-4 py-1.5 rounded-xl bg-background-subtle border border-border hover:border-primary-500/50 text-slate-400 hover:text-slate-200 transition-all text-xs w-64 justify-between group"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-400 transition-colors" />
            <span>Search tasks, risks, volunteers...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-border rounded text-slate-400 border border-slate-700">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Event Health Score Indicator */}
        <div 
          onClick={() => navigate('/mission-control')}
          className={`cursor-pointer flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium transition-all ${getHealthColor(healthScore)}`}
          title="Overall Event Health Score based on critical bottlenecks, overdue tasks, and volunteer allocation."
        >
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Health: {healthScore}/100</span>
        </div>

        {/* War Room Shortcut */}
        <button
          onClick={() => navigate('/war-room')}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          <span>WAR ROOM</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-background-subtle border border-border hover:border-border-highlight text-slate-300 hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-rose text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-background-subtle transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-300 font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-background-card border border-border shadow-glass p-2 z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-border mb-1">
                <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 font-mono">
                  {user?.role || 'ORGANIZER'}
                </span>
              </div>
              <button
                onClick={() => {
                  navigate('/brain');
                  setUserMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-background-hover transition-colors flex items-center space-x-2"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>Club Profile & Brain</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/auth');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center space-x-2"
              >
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
