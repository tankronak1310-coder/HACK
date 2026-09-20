import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  IndianRupee, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Layers,
  FileText
} from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';

export const CreateEventModal: React.FC = () => {
  const { 
    clubs, 
    currentClub, 
    createEvent, 
    isCreateEventOpen, 
    setCreateEventOpen 
  } = useEvent();

  const [formData, setFormData] = useState({
    name: '',
    type: 'Hackathon',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: '',
    expectedParticipants: 500,
    budget: 50000,
    description: '',
    clubId: currentClub?.id || (clubs.length > 0 ? clubs[0].id : ''),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCreateEventOpen) return null;

  const eventTypes = [
    'Hackathon',
    'Tech Fest',
    'Cultural Fest',
    'Workshop',
    'Conference',
    'Sports Tournament',
    'Seminar',
    'Gaming / Esports',
    'Exhibition',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim() || !formData.date) {
      setError('Please fill in all required fields (Name, Location, and Date).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createEvent({
        name: formData.name.trim(),
        type: formData.type,
        date: formData.date,
        endDate: formData.endDate || undefined,
        location: formData.location.trim(),
        expectedParticipants: Number(formData.expectedParticipants) || 500,
        budget: Number(formData.budget) || 0,
        description: formData.description.trim() || undefined,
        clubId: formData.clubId || currentClub?.id,
      });

      // Reset form & close
      setFormData({
        name: '',
        type: 'Hackathon',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: '',
        expectedParticipants: 500,
        budget: 50000,
        description: '',
        clubId: currentClub?.id || (clubs.length > 0 ? clubs[0].id : ''),
      });

      setCreateEventOpen(false);
    } catch (err: any) {
      console.error('Failed to create event:', err);
      setError(err.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={() => !loading && setCreateEventOpen(false)} 
      />

      <div className="relative w-full max-w-lg bg-background-card border border-border rounded-3xl shadow-2xl p-6 z-10 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan p-0.5 shadow-glow flex items-center justify-center">
              <div className="w-full h-full bg-background-card rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-cyan" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Event Workspace</h3>
              <p className="text-xs text-slate-400">Launch and manage multiple campus events simultaneously</p>
            </div>
          </div>
          <button 
            type="button"
            disabled={loading}
            onClick={() => setCreateEventOpen(false)} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-background-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2 mt-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Club selector if user has multiple clubs */}
          {clubs.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hosting Club
              </label>
              <select
                value={formData.clubId}
                onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.joinCode || c.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Event Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HackNova 2026 or Spring Cultural Fest"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Event Type & Expected Attendees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Event Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span>Expected Attendees</span>
              </label>
              <input
                type="number"
                min="10"
                value={formData.expectedParticipants}
                onChange={(e) => setFormData({ ...formData, expectedParticipants: Number(e.target.value) })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Start Date <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>End Date (Optional)</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Location & Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Venue / Location <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Main Auditorium & Lab 3"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <IndianRupee className="w-3 h-3 text-slate-400" />
                <span>Total Budget (₹)</span>
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Event Overview & Scope (Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe the goals, key tracks, and themes. AI will automatically scaffold relevant workstreams and initial deliverables."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl p-3 text-xs text-white focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end space-x-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => setCreateEventOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-cyan hover:from-primary-500 hover:to-accent-cyan/90 text-white font-bold text-xs shadow-glow transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scaffolding Workspace...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Event Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
