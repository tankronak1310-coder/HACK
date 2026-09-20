import React, { createContext, useContext, useState, useEffect } from 'react';
import { Event, Club } from '../types/index.js';
import { api } from '../services/api.js';
import { realtimeClient } from '../services/socket.js';
import { useAuth } from './AuthContext.js';

interface EventContextType {
  clubs: Club[];
  currentClub: Club | null;
  setCurrentClub: (club: Club) => void;
  events: Event[];
  currentEvent: Event | null;
  setCurrentEvent: (event: Event) => void;
  selectEvent: (eventOrId: Event | string) => Promise<void>;
  createEvent: (data: any) => Promise<Event>;
  isCreateEventOpen: boolean;
  setCreateEventOpen: (open: boolean) => void;
  healthScore: number;
  isLoading: boolean;
  refreshEvent: () => Promise<void>;
  refreshClubsAndEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [healthScore, setHealthScore] = useState<number>(82);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateEventOpen, setCreateEventOpen] = useState(false);

  const selectEvent = async (eventOrId: Event | string) => {
    const eventId = typeof eventOrId === 'string' ? eventOrId : eventOrId.id;
    if (typeof eventOrId !== 'string') {
      setCurrentEvent(eventOrId);
    } else {
      const existing = events.find(e => e.id === eventId);
      if (existing) {
        setCurrentEvent(existing);
      }
    }
    try {
      const fullEvent: any = await api.getEvent(eventId);
      setCurrentEvent(fullEvent);
      setHealthScore(fullEvent.healthScore || 82);
      if (currentClub) {
        realtimeClient.subscribeEvent(fullEvent.id, currentClub.id);
      }
    } catch (err) {
      console.error('Failed to load full event data:', err);
    }
  };

  const createEvent = async (data: any): Promise<Event> => {
    const clubId = data.clubId || currentClub?.id;
    if (!clubId) throw new Error('A club is required to create an event');
    const created: any = await api.createEvent({ ...data, clubId });
    // Refresh events list for this club
    const clubEvents: any = await api.getClubEvents(clubId);
    setEvents(clubEvents);
    // Switch active workspace to newly created event
    await selectEvent(created);
    return created;
  };

  const refreshClubsAndEvents = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const userClubs: any = await api.getMyClubs();
      setClubs(userClubs);

      if (userClubs.length > 0) {
        const activeClub = currentClub || userClubs[0];
        setCurrentClub(activeClub);

        const clubEvents: any = await api.getClubEvents(activeClub.id);
        setEvents(clubEvents);

        if (clubEvents.length > 0) {
          const activeEv = currentEvent || clubEvents[0];
          const fullEvent: any = await api.getEvent(activeEv.id);
          setCurrentEvent(fullEvent);
          setHealthScore(fullEvent.healthScore || 82);
          realtimeClient.subscribeEvent(fullEvent.id, activeClub.id);
        }
      }
    } catch (err) {
      console.error('Failed to load clubs or events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEvent = async () => {
    if (!currentEvent) return;
    try {
      const fullEvent: any = await api.getEvent(currentEvent.id);
      setCurrentEvent(fullEvent);
      setHealthScore(fullEvent.healthScore || 82);
    } catch (err) {
      console.error('Failed to refresh event:', err);
    }
  };

  useEffect(() => {
    if (token) {
      realtimeClient.connect();
      refreshClubsAndEvents();
    }
  }, [token]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const unsubHealth = realtimeClient.on('HEALTH_SCORE_UPDATED', (payload) => {
      if (payload.healthScore !== undefined) {
        setHealthScore(payload.healthScore);
      }
    });

    const unsubTask = realtimeClient.on('TASK_UPDATED', () => {
      refreshEvent();
    });

    const unsubRisk = realtimeClient.on('RISK_ALERT', () => {
      refreshEvent();
    });

    const unsubAction = realtimeClient.on('AI_ACTION_EXECUTED', () => {
      refreshEvent();
    });

    return () => {
      unsubHealth();
      unsubTask();
      unsubRisk();
      unsubAction();
    };
  }, [currentEvent?.id]);

  return (
    <EventContext.Provider
      value={{
        clubs,
        currentClub,
        setCurrentClub,
        events,
        currentEvent,
        setCurrentEvent,
        selectEvent,
        createEvent,
        isCreateEventOpen,
        setCreateEventOpen,
        healthScore,
        isLoading,
        refreshEvent,
        refreshClubsAndEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvent must be used within an EventProvider');
  return context;
};
