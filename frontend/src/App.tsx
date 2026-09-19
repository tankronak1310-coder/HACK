import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { EventProvider } from './context/EventContext.js';
import { ThemeProvider, useTheme } from './context/ThemeContext.js';

// Layout
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { BottomNav } from './components/layout/BottomNav.js';
import { CommandPalette } from './components/common/CommandPalette.js';
import { NotificationDrawer } from './components/common/NotificationDrawer.js';
import { CopilotDrawer } from './components/copilot/CopilotDrawer.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { MissionControl } from './pages/MissionControl.js';
import { DigitalTwinPage } from './pages/DigitalTwinPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { WarRoomPage } from './pages/WarRoomPage.js';
import { SimulatorPage } from './pages/SimulatorPage.js';
import { MeetingsPage } from './pages/MeetingsPage.js';
import { VolunteersPage } from './pages/VolunteersPage.js';
import { RisksPage } from './pages/RisksPage.js';
import { BrainPage } from './pages/BrainPage.js';
import { AnnouncementsPage } from './pages/AnnouncementsPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col`} style={{ backgroundColor: 'var(--bg-base)' }}>
      <Navbar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenNotifications={() => setNotificationOpen(true)}
        unreadCount={unreadCount}
      />
      <div className="flex-1 flex">
        <Sidebar onOpenCopilot={() => setCopilotOpen(true)} />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <BottomNav onOpenCopilot={() => setCopilotOpen(true)} />

      {/* Overlays */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
      <NotificationDrawer
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        onCountUpdate={(c) => setUnreadCount(c)}
      />
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EventProvider>
          <BrowserRouter>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Main Event Operating System Routes */}
            <Route
              path="/mission-control"
              element={
                <AppLayout>
                  <MissionControl onOpenCopilot={() => {}} />
                </AppLayout>
              }
            />
            <Route
              path="/digital-twin"
              element={
                <AppLayout>
                  <DigitalTwinPage />
                </AppLayout>
              }
            />
            <Route
              path="/tasks"
              element={
                <AppLayout>
                  <TasksPage />
                </AppLayout>
              }
            />
            <Route
              path="/war-room"
              element={
                <AppLayout>
                  <WarRoomPage />
                </AppLayout>
              }
            />
            <Route
              path="/simulator"
              element={
                <AppLayout>
                  <SimulatorPage />
                </AppLayout>
              }
            />
            <Route
              path="/meetings"
              element={
                <AppLayout>
                  <MeetingsPage />
                </AppLayout>
              }
            />
            <Route
              path="/volunteers"
              element={
                <AppLayout>
                  <VolunteersPage />
                </AppLayout>
              }
            />
            <Route
              path="/risks"
              element={
                <AppLayout>
                  <RisksPage />
                </AppLayout>
              }
            />
            <Route
              path="/brain"
              element={
                <AppLayout>
                  <BrainPage />
                </AppLayout>
              }
            />
            <Route
              path="/announcements"
              element={
                <AppLayout>
                  <AnnouncementsPage />
                </AppLayout>
              }
            />
            <Route
              path="/analytics"
              element={
                <AppLayout>
                  <AnalyticsPage />
                </AppLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </EventProvider>
    </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
