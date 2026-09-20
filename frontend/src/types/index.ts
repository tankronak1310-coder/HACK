export interface User {
  id: string;
  email: string;
  name: string;
  mobile?: string;
  role: string;
  avatar?: string;
  verifiedEmail: boolean;
  verifiedMobile: boolean;
  clubs?: { id: string; name: string; role: string; category?: string }[];
}

export interface Club {
  id: string;
  name: string;
  college: string;
  category: string;
  description?: string;
  logo?: string;
  joinCode: string;
  ownerId: string;
  teams?: Team[];
  events?: Event[];
  _count?: { members: number; events: number; volunteers: number; documents: number };
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  color: string;
  description?: string;
}

export interface Event {
  id: string;
  clubId: string;
  name: string;
  type: string;
  date: string;
  endDate?: string;
  expectedParticipants: number;
  location: string;
  budget: number;
  status: 'PLANNING' | 'ACTIVE' | 'WAR_ROOM' | 'COMPLETED';
  healthScore: number;
  currentMilestone?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  club?: Club;
  tasks?: Task[];
  risks?: Risk[];
  meetings?: Meeting[];
  announcements?: Announcement[];
  _count?: { tasks: number; risks: number; meetings: number; documents?: number; volunteers?: number };
}

export interface Task {
  id: string;
  eventId: string;
  teamId?: string | null;
  assigneeId?: string | null;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: string;
  estimatedHours: number;
  actualHours: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags?: string | null;
  completedAt?: string | null;
  team?: Team;
  assignee?: { id: string; name: string; email: string; avatar?: string };
  dependencies?: { taskId: string; dependsOnTaskId: string; dependsOn: Task }[];
  dependedOnBy?: { taskId: string; dependsOnTaskId: string; task: Task }[];
}

export interface Volunteer {
  id: string;
  clubId: string;
  userId?: string | null;
  teamId?: string | null;
  name: string;
  email: string;
  phone?: string;
  skills: string; // JSON string or array
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  experienceYears: number;
  rating: number;
  currentWorkload: 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED';
  assignedHours: number;
  team?: Team;
}

export interface Risk {
  id: string;
  eventId: string;
  title: string;
  description: string;
  category: 'VENUE' | 'BUDGET' | 'VOLUNTEER' | 'TECHNICAL' | 'TIMELINE' | 'SPONSOR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'IDENTIFIED' | 'MITIGATING' | 'RESOLVED';
  impactAnalysis?: string | null;
  mitigationPlan?: string | null;
  affectedTasks?: string | null;
  createdAt: string;
}

export interface Meeting {
  id: string;
  eventId: string;
  title: string;
  date: string;
  location?: string;
  transcript: string;
  summary?: string;
  actionItems: MeetingActionItem[];
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  rawText: string;
  extractedTitle: string;
  suggestedOwner?: string | null;
  suggestedDeadline?: string | null;
  suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedTeam?: string | null;
  convertedTaskId?: string | null;
}

export interface Document {
  id: string;
  clubId: string;
  eventId?: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  summary?: string;
  createdAt: string;
  event?: { id: string; name: string };
}

export interface Announcement {
  id: string;
  eventId: string;
  title: string;
  channel: 'WHATSAPP' | 'EMAIL';
  content: string;
  targetAudience: string;
  status: 'DRAFT' | 'SENT' | 'SCHEDULED';
  sentAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId?: string;
  category: 'TASK' | 'RISK' | 'MEETING' | 'AI' | 'SYSTEM' | 'WAR_ROOM';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface ProposedAction {
  id: string;
  type: 'REASSIGN_TASKS' | 'CREATE_FOLLOWUP' | 'NOTIFY_TEAM' | 'ACTIVATE_CONTINGENCY' | 'REALLOCATE_VOLUNTEERS';
  title: string;
  description: string;
  buttonLabel: string;
  payload: any;
}
