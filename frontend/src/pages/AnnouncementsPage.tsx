import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Mail, 
  MessageSquare, 
  Loader2,
  CheckCircle2,
  Edit3,
  Eye,
  RotateCcw,
  Trash2,
  History,
  Clock,
  Users,
  X,
  ExternalLink,
  MessageCircle,
  QrCode,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { api } from '../services/api.js';
import { Announcement } from '../types/index.js';

export const AnnouncementsPage: React.FC = () => {
  const { currentEvent, currentClub } = useEvent();
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [topic, setTopic] = useState('Registration Deadline Extended to Midnight & Final Speaker Slot');
  const [audience, setAudience] = useState('ALL PARTICIPANTS');
  const [tone, setTone] = useState<'AUTO' | 'URGENT' | 'EXCITED' | 'FORMAL' | 'CASUAL'>('AUTO');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable generated draft state
  const [aiDraft, setAiDraft] = useState<{ title: string; content: string } | null>(null);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // WhatsApp Automation & Dispatch
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappRecipientType, setWhatsappRecipientType] = useState<'ALL' | 'VOLUNTEER'>('ALL');
  const [whatsappTargetPhone, setWhatsappTargetPhone] = useState('');
  const [whatsappPayload, setWhatsappPayload] = useState<{ title: string; content: string } | null>(null);
  const [waStatus, setWaStatus] = useState<'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [connectingWa, setConnectingWa] = useState(false);
  const [autoSending, setAutoSending] = useState(false);

  // Volunteers for specific-send feature
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [sendingToVolunteer, setSendingToVolunteer] = useState(false);

  // Past announcements list state
  const [pastAnnouncements, setPastAnnouncements] = useState<Announcement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit modal for past announcement
  const [editingPastItem, setEditingPastItem] = useState<Announcement | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalAudience, setModalAudience] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const channels = [
    { id: 'WHATSAPP', label: 'WhatsApp Broadcast', icon: MessageSquare, color: 'text-emerald-400' },
    { id: 'EMAIL', label: 'Official Email', icon: Mail, color: 'text-primary-400' },
  ];

  const quickTopics = [
    { label: '⏳ Deadline Extension', text: 'Project Submission Deadline Extended by 3 Hours' },
    { label: '🌧️ Weather & Venue Shift', text: 'Heavy Rain Alert: Event Sessions Shifted to Main Auditorium' },
    { label: '🍱 Food & Meal Coupons', text: 'Lunch Token Distribution Started at Canteen Counter 2' },
    { label: '🎙️ Keynote Speaker', text: 'Special Keynote Session by Google AI Lead at 4 PM in Audi 1' },
    { label: '🏆 Valedictory & Awards', text: 'Finalist Shortlist Announced & Closing Prize Ceremony at 6 PM' },
    { label: '⚡ Volunteer Call', text: 'Urgent: 5 Volunteers Needed at Main Stage Registration Desk' },
  ];

  const fetchPastAnnouncements = async () => {
    if (!currentEvent) return;
    setLoadingHistory(true);
    try {
      const res: any = await api.getAnnouncements(currentEvent.id);
      if (Array.isArray(res)) {
        setPastAnnouncements(res);
      }
    } catch (err) {
      console.error('Failed to load past announcements:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchVolunteers = async () => {
    if (!currentClub?.id || !currentEvent?.id) {
      setVolunteers([]);
      return;
    }
    try {
      const res: any = await api.getVolunteers(currentClub.id, currentEvent.id);
      if (Array.isArray(res)) {
        setVolunteers(res.map((v: any) => ({ id: v.id, name: v.name, phone: v.phone })));
      } else {
        setVolunteers([]);
      }
    } catch (err) {
      console.error('Failed to fetch volunteers:', err);
      setVolunteers([]);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res: any = await api.getWhatsAppStatus();
      if (res) {
        setWaStatus(res.status);
        setWaQr(res.qrCodeDataUrl);
        setWaPhone(res.phoneNumber);
      }
    } catch (e) {
      console.warn('WhatsApp status fetch failed:', e);
    }
  };

  const handleConnectWhatsApp = async () => {
    setConnectingWa(true);
    try {
      const res: any = await api.connectWhatsApp();
      if (res) {
        setWaStatus(res.status);
        setWaQr(res.qrCodeDataUrl);
        setWaPhone(res.phoneNumber);
      }
    } catch (e: any) {
      setToastMessage('Failed to initialize WhatsApp: ' + e.message);
    } finally {
      setConnectingWa(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      await api.disconnectWhatsApp();
      setWaStatus('DISCONNECTED');
      setWaQr(null);
      setWaPhone(null);
      setToastMessage('WhatsApp disconnected.');
    } catch (e: any) {
      setToastMessage('Failed to disconnect: ' + e.message);
    }
  };

  const handleWhatsAppSend = async (targetPhone?: string) => {
    // Use whatsappPayload if open from history, otherwise use current editable content
    const contentToSend = whatsappPayload?.content || editableContent;
    const titleToSend = whatsappPayload?.title || editableTitle;

    if (!contentToSend.trim()) return;

    if (waStatus !== 'CONNECTED') {
      setShowWhatsAppModal(true);
      if (waStatus === 'DISCONNECTED') {
        handleConnectWhatsApp();
      }
      return;
    }

    setAutoSending(true);
    try {
      const phoneToUse = targetPhone || whatsappTargetPhone;
      if (phoneToUse && phoneToUse.trim()) {
        await api.sendWhatsAppDirect({
          phone: phoneToUse,
          message: titleToSend ? `*${titleToSend}*\n\n${contentToSend}` : contentToSend,
        });
        const matchedVol = volunteers.find(v => v.phone === phoneToUse || v.id === selectedVolunteerId);
        setToastMessage(`✅ WhatsApp message sent to ${matchedVol ? matchedVol.name : phoneToUse}!`);
      } else {
        // Broadcast to ALL volunteers
        const res: any = await api.sendWhatsAppBroadcast({
          eventId: currentEvent?.id,
          title: titleToSend,
          message: contentToSend,
        });
        setToastMessage(`📢 WhatsApp broadcast sent to ${res.sentCount} volunteer(s)!`);
      }
      setShowWhatsAppModal(false);
      setWhatsappPayload(null);
      fetchPastAnnouncements();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setToastMessage(`WhatsApp send error: ${err.message || 'Failed'}`);
    } finally {
      setAutoSending(false);
    }
  };

  const handleGenerate = async (overrideTopic?: string) => {
    if (!currentEvent) return;
    const targetTopic = overrideTopic !== undefined ? overrideTopic : topic;
    if (!targetTopic.trim()) return;

    setLoading(true);
    setCopied(false);
    try {
      const res: any = await api.generateAnnouncement({
        eventId: currentEvent.id,
        channel,
        topic: targetTopic,
        targetAudience: audience,
        tone: tone === 'AUTO' ? undefined : tone,
        additionalNotes: additionalNotes.trim() || undefined,
      });

      if (res) {
        setAiDraft({ title: res.title, content: res.content });
        setEditableTitle(res.title || '');
        setEditableContent(res.content || '');
        setIsModified(false);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Failed to generate announcement. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setVolunteers([]);
    setSelectedVolunteerId('');
    handleGenerate();
    fetchPastAnnouncements();
    fetchWhatsAppStatus();
    fetchVolunteers();
  }, [channel, currentEvent?.id, currentClub?.id]);

  // Polling WhatsApp status when waiting for QR scan
  useEffect(() => {
    if (waStatus === 'INITIALIZING' || waStatus === 'QR_READY') {
      const timer = setInterval(() => {
        fetchWhatsAppStatus();
      }, 3500);
      return () => clearInterval(timer);
    }
  }, [waStatus]);

  const handleCopy = () => {
    if (!editableContent) return;
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const [sending, setSending] = useState(false);

  const handleSendBroadcast = async () => {
    if (!currentEvent || !editableContent.trim()) return;

    // For WHATSAPP channel: use the WhatsApp engine, not email
    if (channel === 'WHATSAPP') {
      if (waStatus !== 'CONNECTED') {
        // Not connected yet — show QR modal to link WhatsApp first
        setWhatsappPayload({ title: editableTitle, content: editableContent });
        setShowWhatsAppModal(true);
        if (waStatus === 'DISCONNECTED') handleConnectWhatsApp();
        return;
      }

      // If sending to a particular volunteer
      if (whatsappRecipientType === 'VOLUNTEER') {
        const phoneToSend = whatsappTargetPhone.trim();
        if (!phoneToSend) {
          setToastMessage('⚠️ Please select a volunteer with a phone number or enter a mobile number.');
          setTimeout(() => setToastMessage(null), 4000);
          return;
        }

        setAutoSending(true);
        try {
          const fullMsg = editableTitle ? `*${editableTitle}*\n\n${editableContent}` : editableContent;
          await api.sendWhatsAppDirect({
            phone: phoneToSend,
            message: fullMsg,
          });
          const vol = volunteers.find(v => v.id === selectedVolunteerId);
          setToastMessage(`✅ WhatsApp message sent directly to ${vol ? vol.name : phoneToSend}!`);
          fetchPastAnnouncements();
          setTimeout(() => setToastMessage(null), 5000);
        } catch (err: any) {
          console.error(err);
          setToastMessage(`❌ Failed to send WhatsApp: ${err.message || 'Unknown error'}`);
          setTimeout(() => setToastMessage(null), 5000);
        } finally {
          setAutoSending(false);
        }
        return;
      }

      // Connected — broadcast directly to all volunteers
      setAutoSending(true);
      try {
        const res: any = await api.sendWhatsAppBroadcast({
          eventId: currentEvent.id,
          title: editableTitle,
          message: editableContent,
        });
        setToastMessage(`✅ WhatsApp broadcast sent to ${res.sentCount} volunteer(s)!`);
        fetchPastAnnouncements();
        setTimeout(() => setToastMessage(null), 5000);
      } catch (err: any) {
        console.error(err);
        setToastMessage(`❌ WhatsApp broadcast failed: ${err.message || 'Unknown error'}`);
        setTimeout(() => setToastMessage(null), 5000);
      } finally {
        setAutoSending(false);
      }
      return;
    }

    // For EMAIL channel: create announcement record + send emails
    setSending(true);
    try {
      const res: any = await api.createAnnouncement({
        eventId: currentEvent.id,
        title: editableTitle || topic,
        channel,
        content: editableContent,
        targetAudience: audience,
      });

      const summary = res?.deliverySummary;
      if (summary && summary.emailsSent > 0) {
        setToastMessage(`✉️ Emails delivered to ${summary.emailsSent} recipient(s)!`);
      } else if (summary && summary.totalRecipients === 0) {
        setToastMessage(`⚠️ Announcement published! (No volunteer emails registered for direct email)`);
      } else {
        setToastMessage(`Broadcast dispatched successfully via ${channel}!`);
      }

      fetchPastAnnouncements();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setToastMessage(`Failed to send broadcast: ${err.message || 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setSending(false);
    }
  };

  const handleResetToAi = () => {
    if (aiDraft) {
      setEditableTitle(aiDraft.title);
      setEditableContent(aiDraft.content);
      setIsModified(false);
      setToastMessage('Reverted to AI-generated draft.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const triggerWhatsAppDispatch = (payload?: { title: string; content: string }) => {
    const item = payload || { title: editableTitle, content: editableContent };
    setWhatsappPayload(item);
    setShowWhatsAppModal(true);
  };

  const launchWhatsApp = (mode: 'GROUP' | 'DIRECT') => {
    if (!whatsappPayload) return;
    const fullText = whatsappPayload.title
      ? `*${whatsappPayload.title}*\n\n${whatsappPayload.content}`
      : whatsappPayload.content;

    let url = '';
    if (mode === 'DIRECT' && whatsappTargetPhone.trim()) {
      const cleanPhone = whatsappTargetPhone.replace(/[^0-9]/g, '');
      url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fullText)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    }

    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };

  const insertEmoji = (emoji: string) => {
    setEditableContent((prev) => prev + ' ' + emoji + ' ');
    setIsModified(true);
  };

  // Past Announcements Actions
  const openEditModal = (item: Announcement) => {
    setEditingPastItem(item);
    setModalTitle(item.title);
    setModalContent(item.content);
    setModalAudience(item.targetAudience);
  };

  const handleSavePastEdit = async () => {
    if (!editingPastItem) return;
    setSavingEdit(true);
    try {
      await api.updateAnnouncement(editingPastItem.id, {
        title: modalTitle,
        content: modalContent,
        targetAudience: modalAudience,
      });
      setToastMessage('Announcement updated successfully.');
      setEditingPastItem(null);
      fetchPastAnnouncements();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setToastMessage(`Failed to update announcement: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePast = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      setToastMessage('Announcement deleted.');
      fetchPastAnnouncements();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setToastMessage(`Failed to delete announcement: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-accent-cyan" />
              <span>Multi-Channel Announcement Engine</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate topic-tailored, platform-optimized announcements with real-time editing and multi-channel dispatch.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Direct WhatsApp Engine Status Banner */}
      <div className="p-4 rounded-3xl bg-background-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            waStatus === 'CONNECTED' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-primary-500/20 text-primary-400'
          }`}>
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-white">Direct WhatsApp Dispatch Engine</span>
              {waStatus === 'CONNECTED' ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Linked & Ready {waPhone ? `(+${waPhone})` : ''}</span>
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {waStatus === 'QR_READY' ? 'QR Code Ready to Scan' : waStatus === 'INITIALIZING' ? 'Initializing Headless Bot...' : 'Not Linked Yet'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {waStatus === 'CONNECTED'
                ? 'Automated WhatsApp engine is active! Messages are dispatched straight from the server to volunteers.'
                : 'Send automated WhatsApp messages directly to all volunteers or specific team members without opening WhatsApp web.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
          {waStatus === 'CONNECTED' ? (
            <button
              onClick={handleDisconnectWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-background-subtle hover:bg-rose-500/20 border border-border text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors"
            >
              Unlink
            </button>
          ) : (
            <button
              onClick={() => {
                setShowWhatsAppModal(true);
                if (waStatus === 'DISCONNECTED') handleConnectWhatsApp();
              }}
              disabled={connectingWa}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{connectingWa ? 'Starting Bot...' : 'Link WhatsApp (Scan QR)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Channel Switcher */}
      <div className="grid grid-cols-2 gap-3">
        {channels.map((ch) => {
          const Icon = ch.icon;
          const isSelected = channel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => {
                setChannel(ch.id as any);
                setIsEditing(false);
              }}
              className={`p-4 rounded-2xl border transition-all text-left flex items-center space-x-3 ${
                isSelected
                  ? 'bg-primary-950/20 border-primary-500 shadow-glow text-white'
                  : 'bg-background-card border-border hover:bg-background-hover text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${ch.color}`} />
              <div className="text-xs font-bold">{ch.label}</div>
            </button>
          );
        })}
      </div>

      {/* Inputs & Generated Content Preview / Edit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Config */}
        <div className="lg:col-span-5 bg-background-card border border-border rounded-3xl p-6 space-y-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Announcement Parameters</span>
            <span className="text-[10px] text-primary-400 font-mono">Topic-Aware AI</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Announcement Topic / Purpose
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Venue shifted due to rain, Free food tokens..."
              className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Quick Topic Presets */}
          <div>
            <span className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Quick Topic Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickTopics.map((qt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTopic(qt.text);
                    handleGenerate(qt.text);
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-background-subtle hover:bg-background-hover border border-border/80 text-slate-300 hover:text-white transition-colors"
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="ALL PARTICIPANTS">All Participants</option>
                <option value="VOLUNTEERS">Volunteers & Core Leads</option>
                <option value="SPONSORS & VIPs">Corporate Sponsors & VIPs</option>
                <option value="GENERAL CAMPUS">General Campus Body</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Message Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="AUTO">Auto Detect from Topic</option>
                <option value="URGENT">Urgent & High Alert 🚨</option>
                <option value="EXCITED">Hype & Celebratory 🚀</option>
                <option value="FORMAL">Official & Administrative 🏛️</option>
                <option value="CASUAL">Friendly & Informative 👋</option>
              </select>
            </div>
          </div>

          {channel === 'WHATSAPP' && (
            <div className="p-3.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Recipient Mode</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {whatsappRecipientType === 'ALL' ? 'Broadcast' : 'Direct PM'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappRecipientType('ALL');
                    setSelectedVolunteerId('');
                    setWhatsappTargetPhone('');
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    whatsappRecipientType === 'ALL'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-background-subtle text-slate-400 border-border hover:text-white'
                  }`}
                >
                  📢 All Volunteers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappRecipientType('VOLUNTEER');
                    if (!selectedVolunteerId && volunteers.length > 0) {
                      const firstWithPhone = volunteers.find(v => Boolean(v.phone)) || volunteers[0];
                      if (firstWithPhone) {
                        setSelectedVolunteerId(firstWithPhone.id);
                        if (firstWithPhone.phone) setWhatsappTargetPhone(firstWithPhone.phone);
                      }
                    }
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    whatsappRecipientType === 'VOLUNTEER'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-background-subtle text-slate-400 border-border hover:text-white'
                  }`}
                >
                  👤 Particular Volunteer
                </button>
              </div>

              {whatsappRecipientType === 'VOLUNTEER' && (
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Choose Registered Volunteer:
                  </label>
                  <select
                    value={selectedVolunteerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedVolunteerId(id);
                      const found = volunteers.find(v => v.id === id);
                      if (found?.phone) {
                        setWhatsappTargetPhone(found.phone);
                      } else {
                        setWhatsappTargetPhone('');
                      }
                    }}
                    className="w-full bg-background-card border border-emerald-500/40 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Select a Volunteer ({volunteers.length} in club) --</option>
                    {volunteers.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.phone ? `(${v.phone})` : '⚠️ (No phone)'}
                      </option>
                    ))}
                  </select>

                  {selectedVolunteerId && !volunteers.find(v => v.id === selectedVolunteerId)?.phone && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                      ⚠️ This volunteer has no phone number on record. Enter phone below:
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Recipient Mobile Number:
                    </label>
                    <input
                      type="tel"
                      value={whatsappTargetPhone}
                      onChange={(e) => setWhatsappTargetPhone(e.target.value)}
                      placeholder="e.g. 9879818606 or 919879818606"
                      className="w-full bg-background-card border border-border focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Additional Details / Directives <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Contact Priya for queries, bring College ID, etc."
              className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={loading || !topic.trim()}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Generate Dynamic Announcement</span>
          </button>
        </div>

        {/* Right 7 Cols: Live Preview & In-Place Editing Option */}
        <div className="lg:col-span-7 bg-background-card border border-border rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/20 text-primary-300 font-bold">
                  {channel}
                </span>
                {isModified && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center space-x-1">
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>Edited</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Edit / Preview Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center space-x-1 ${
                    isEditing 
                      ? 'bg-primary-600 text-white border-primary-500' 
                      : 'bg-background-subtle hover:bg-background-hover border-border text-slate-300'
                  }`}
                  title={isEditing ? 'Switch to Formatted Preview' : 'Edit message directly'}
                >
                  {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>{isEditing ? 'Preview' : 'Edit Message'}</span>
                </button>

                {/* Reset to AI Version */}
                {isModified && (
                  <button
                    type="button"
                    onClick={handleResetToAi}
                    className="px-2.5 py-1.5 rounded-xl bg-background-subtle hover:bg-background-hover border border-border text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1"
                    title="Reset to AI-generated version"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-background-subtle hover:bg-background-hover border border-border text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleSendBroadcast}
                  disabled={sending || autoSending || loading || !editableContent.trim()}
                  className={`px-4 py-1.5 rounded-xl disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 ${
                    channel === 'WHATSAPP'
                      ? 'bg-[#25D366] hover:bg-[#20ba5a] text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {(sending || autoSending) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>
                    {(sending || autoSending)
                      ? 'Sending...'
                      : channel === 'WHATSAPP'
                        ? (whatsappRecipientType === 'VOLUNTEER'
                            ? `📲 Send to ${volunteers.find(v => v.id === selectedVolunteerId)?.name || 'Particular Volunteer'}`
                            : '📢 Broadcast to All Volunteers')
                        : '✉️ Send Email Broadcast'}
                  </span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3 text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                <span>AI analyzing topic semantics and drafting tailored {channel} notice...</span>
              </div>
            ) : isEditing ? (
              /* Inline Edit Mode */
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Announcement Title / Subject Line:
                  </label>
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => {
                      setEditableTitle(e.target.value);
                      setIsModified(true);
                    }}
                    className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Message Content (Full Formatting):
                    </label>
                    <div className="flex items-center space-x-1">
                      {['🚨', '📢', '⏳', '📍', '🍱', '🏆', '👉', '✨'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="hover:scale-125 transition-transform text-xs p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={12}
                    value={editableContent}
                    onChange={(e) => {
                      setEditableContent(e.target.value);
                      setIsModified(true);
                    }}
                    className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-2xl p-4 font-mono text-xs text-slate-100 leading-relaxed focus:outline-none resize-y"
                    placeholder="Type or customize your announcement here..."
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Characters: {editableContent.length} | Words: {editableContent.split(/\s+/).filter(Boolean).length}</span>
                  <span className="text-emerald-400">Changes apply immediately to Broadcast & Copy</span>
                </div>
              </div>
            ) : (
              /* Preview Mode */
              <div className="space-y-3">
                <div className="text-xs font-bold text-white bg-background-subtle/60 px-3.5 py-2 rounded-xl border border-border/60">
                  {editableTitle || 'Announcement Preview'}
                </div>
                <div className="p-4 rounded-2xl bg-background-subtle border border-border/80 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto select-text">
                  {editableContent || 'No content generated yet. Click generate above.'}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Target: <strong className="text-slate-400">{audience}</strong></span>
            <span>Channel: <strong className="text-slate-400">{channel}</strong></span>
          </div>
        </div>
      </div>

      {/* Dispatched Broadcasts & Management History */}
      <div className="bg-background-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-bold text-white">Dispatched Announcements & History</h2>
            <span className="text-xs font-mono text-slate-500">({pastAnnouncements.length})</span>
          </div>
          <button
            onClick={fetchPastAnnouncements}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Refresh List
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-8 flex items-center justify-center space-x-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
            <span>Loading announcements history...</span>
          </div>
        ) : pastAnnouncements.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No announcements dispatched yet for this event. Generate and click "Send Broadcast" to publish!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastAnnouncements.map((item) => {
              const chInfo = channels.find((c) => c.id === item.channel) || channels[0];
              const Icon = chInfo.icon;
              return (
                <div
                  key={item.id}
                  className="bg-background-subtle border border-border/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-border transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/15 text-primary-300 font-bold flex items-center space-x-1">
                        <Icon className={`w-3 h-3 ${chInfo.color}`} />
                        <span>{item.channel}</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => triggerWhatsAppDispatch({ title: item.title, content: item.content })}
                          className="p-1 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded-lg hover:bg-background-hover text-slate-400 hover:text-white transition-colors"
                          title="Edit announcement"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePast(item.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white line-clamp-1">{item.title}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-3 font-mono whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{item.targetAudience}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Past Announcement Modal */}
      {editingPastItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background-card border border-border rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-white">Edit Dispatched Announcement</h3>
              </div>
              <button
                onClick={() => setEditingPastItem(null)}
                className="p-1 rounded-lg hover:bg-background-hover text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={modalAudience}
                  onChange={(e) => setModalAudience(e.target.value)}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Content</label>
                <textarea
                  rows={8}
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className="w-full bg-background-subtle border border-border focus:border-primary-500 rounded-xl p-3 font-mono text-xs text-slate-100 leading-relaxed focus:outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingPastItem(null)}
                className="px-4 py-2 rounded-xl bg-background-subtle hover:bg-background-hover text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit || !modalContent.trim()}
                onClick={handleSavePastEdit}
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-glow flex items-center space-x-1.5 disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Real Message Dispatch Modal */}
      {showWhatsAppModal && whatsappPayload && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background-card border border-border rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Direct WhatsApp Dispatch</h3>
                  <p className="text-[11px] text-slate-400">Send WhatsApp messages to all volunteers or a specific person</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="p-1 rounded-lg hover:bg-background-hover text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview Box */}
            <div className="p-3 bg-background-subtle rounded-2xl border border-border/80 text-xs text-slate-300 font-mono max-h-28 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              <div className="font-bold text-emerald-400 mb-1">{whatsappPayload.title}</div>
              {whatsappPayload.content}
            </div>

            {/* If Connected: Direct Send from Backend */}
            {waStatus === 'CONNECTED' ? (
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-300">WhatsApp Engine Active</span>
                    {waPhone && <span className="text-[10px] text-slate-400 font-mono">(+{waPhone})</span>}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded">Ready</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Choose Recipient:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWhatsappRecipientType('ALL')}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        whatsappRecipientType === 'ALL'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-background-card text-slate-400 border-border hover:text-white'
                      }`}
                    >
                      📢 All Volunteers
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappRecipientType('VOLUNTEER');
                        if (!selectedVolunteerId && volunteers.length > 0) {
                          const firstWithPhone = volunteers.find(v => Boolean(v.phone)) || volunteers[0];
                          if (firstWithPhone) {
                            setSelectedVolunteerId(firstWithPhone.id);
                            if (firstWithPhone.phone) setWhatsappTargetPhone(firstWithPhone.phone);
                          }
                        }
                      }}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        whatsappRecipientType === 'VOLUNTEER'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-background-card text-slate-400 border-border hover:text-white'
                      }`}
                    >
                      👤 Particular Volunteer
                    </button>
                  </div>

                  {whatsappRecipientType === 'VOLUNTEER' ? (
                    <div className="space-y-2 pt-1">
                      <select
                        value={selectedVolunteerId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedVolunteerId(id);
                          const found = volunteers.find(v => v.id === id);
                          if (found?.phone) {
                            setWhatsappTargetPhone(found.phone);
                          } else {
                            setWhatsappTargetPhone('');
                          }
                        }}
                        className="w-full bg-background-card border border-emerald-500/40 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">-- Choose volunteer ({volunteers.length} available) --</option>
                        {volunteers.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.phone ? `(${v.phone})` : '⚠️ (No phone)'}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center space-x-2">
                        <input
                          type="tel"
                          value={whatsappTargetPhone}
                          onChange={(e) => setWhatsappTargetPhone(e.target.value)}
                          placeholder="Phone number e.g. 9879818606"
                          className="flex-1 bg-background-card border border-border focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          disabled={autoSending || !whatsappTargetPhone.trim()}
                          onClick={() => handleWhatsAppSend(whatsappTargetPhone)}
                          className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs shadow-glow transition-all flex items-center space-x-1.5 disabled:opacity-50 flex-shrink-0"
                        >
                          {autoSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>{autoSending ? 'Sending...' : 'Send Message'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={autoSending}
                        onClick={() => handleWhatsAppSend()}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {autoSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                        <span>{autoSending ? 'Sending Broadcast...' : 'Broadcast to All Volunteers'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If Not Connected: QR Code to Link Once */
              <div className="p-4 rounded-2xl bg-background-subtle border border-border space-y-3 text-center">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Scan Once to Enable Automated Sending</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectWhatsApp}
                    disabled={connectingWa}
                    className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${connectingWa ? 'animate-spin' : ''}`} />
                    <span>Refresh QR</span>
                  </button>
                </div>

                {waStatus === 'INITIALIZING' ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2 text-xs text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Initializing headless WhatsApp server engine...</span>
                  </div>
                ) : waQr ? (
                  <div className="space-y-3 py-1">
                    <p className="text-[11px] text-slate-300">
                      Scan this QR code using <strong>WhatsApp</strong> on your mobile phone:
                    </p>
                    <div className="inline-block p-2.5 rounded-2xl bg-white shadow-xl">
                      <img src={waQr} alt="WhatsApp QR Code" className="w-44 h-44 mx-auto" />
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1 max-w-sm mx-auto text-left bg-background-card p-3 rounded-xl border border-border">
                      <div>1. Open <strong>WhatsApp</strong> on your phone</div>
                      <div>2. Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong> &gt; <strong>Linked Devices</strong></div>
                      <div>3. Tap <strong>Link a Device</strong> and point camera here</div>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-semibold animate-pulse">
                      Waiting for scan... Connects in 3 seconds!
                    </p>
                  </div>
                ) : (
                  <div className="py-5 space-y-3">
                    <p className="text-xs text-slate-300">
                      Link your WhatsApp account once so the server can dispatch messages in 1 click without opening WhatsApp.
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectWhatsApp}
                      disabled={connectingWa}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow transition-all inline-flex items-center space-x-2"
                    >
                      {connectingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      <span>Generate Connection QR Code</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fallback Option: Open WhatsApp App / Web */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Need to share to an open group or status?</span>
              <button
                type="button"
                onClick={() => launchWhatsApp('GROUP')}
                className="text-primary-400 hover:text-primary-300 font-semibold flex items-center space-x-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in WhatsApp Web</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
