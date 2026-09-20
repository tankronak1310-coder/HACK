import { prisma } from '../../db/prisma.js';
import { realtimeHub } from '../../realtime/socket.js';
import { tasksService } from '../tasks/tasks.service.js';
import { eventsService } from '../events/events.service.js';
import { geminiService } from './gemini.service.js';

export interface ProposedAction {
  id: string;
  type: 'REASSIGN_TASKS' | 'CREATE_FOLLOWUP' | 'NOTIFY_TEAM' | 'ACTIVATE_CONTINGENCY' | 'REALLOCATE_VOLUNTEERS';
  title: string;
  description: string;
  buttonLabel: string;
  payload: any;
}

function matches(q: string, ...terms: string[]) {
  return terms.some(t => q.includes(t));
}

function taskLine(t: any, now: Date) {
  const dl = new Date(t.deadline);
  const daysLeft = Math.round((dl.getTime() - now.getTime()) / 86400000);
  const dueStr = daysLeft < 0
    ? `⚠️ ${Math.abs(daysLeft)}d overdue`
    : daysLeft === 0 ? '⏰ Due today'
    : `📅 Due in ${daysLeft}d`;
  return `• **${t.title}** [${t.status}] — ${t.priority} priority — ${dueStr}${t.team ? ` (${t.team.name})` : ''}`;
}

export class AiService {

  async handleCopilotQuery(eventId: string | undefined, query: string, userId: string) {
    let event: any = null;

    if (eventId && eventId !== 'general' && eventId !== 'none') {
      event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          club: { include: { teams: true } },
          tasks: {
            include: {
              team: true,
              assignee: true,
              dependencies: { include: { dependsOn: true } },
              dependedOnBy: true,
            },
            orderBy: { deadline: 'asc' },
          },
          risks: true,
          meetings: { orderBy: { date: 'desc' }, take: 5 },
          announcements: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    }

    // Fallback: If no event specified or found, try to find the latest active event
    if (!event) {
      event = await prisma.event.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          club: { include: { teams: true } },
          tasks: {
            include: {
              team: true,
              assignee: true,
              dependencies: { include: { dependsOn: true } },
              dependedOnBy: true,
            },
            orderBy: { deadline: 'asc' },
          },
          risks: true,
          meetings: { orderBy: { date: 'desc' }, take: 5 },
          announcements: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    }

    const volunteers = event
      ? await prisma.volunteer.findMany({
          where: { clubId: event.clubId },
          include: { team: true, skillRecords: true },
        })
      : [];

    const now = new Date();
    const q = query.toLowerCase().trim();

    // ── Derived metrics (if event exists) ──────────────────────────────────────
    const allTasks = event?.tasks || [];
    const doneTasks = allTasks.filter((t: any) => t.status === 'DONE');
    const todoTasks = allTasks.filter((t: any) => t.status === 'TODO');
    const inProgressTasks = allTasks.filter((t: any) => t.status === 'IN_PROGRESS');
    const blockedTasks = allTasks.filter((t: any) => t.status === 'BLOCKED');
    const overdueTasks = allTasks.filter((t: any) => t.status !== 'DONE' && new Date(t.deadline) < now);
    const criticalTasks = allTasks.filter((t: any) => t.priority === 'CRITICAL' && t.status !== 'DONE');
    const todayTasks = allTasks.filter((t: any) => {
      const dl = new Date(t.deadline);
      return t.status !== 'DONE' && dl.toDateString() === now.toDateString();
    });

    const activeRisks = (event?.risks || []).filter((r: any) => r.status !== 'RESOLVED');
    const criticalRisks = activeRisks.filter((r: any) => r.severity === 'CRITICAL');
    const highRisks = activeRisks.filter((r: any) => r.severity === 'HIGH');

    const overloadedVols = volunteers.filter((v: any) => v.currentWorkload === 'OVERLOADED');
    const highWorkloadVols = volunteers.filter((v: any) => v.currentWorkload === 'HIGH');
    const availableVols = volunteers.filter((v: any) => v.currentWorkload === 'LOW' || v.currentWorkload === 'MEDIUM');

    const eventDate = event ? new Date(event.date) : null;
    const daysToEvent = eventDate ? Math.ceil((eventDate.getTime() - now.getTime()) / 86400000) : null;
    const completionPct = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;

    const proposedActions: ProposedAction[] = [];
    let content = '';

    // ════════════════════════════════════════════════════════════════════════
    // 1. WEBSITE, PLATFORM & NAVIGATION QUESTIONS
    // ════════════════════════════════════════════════════════════════════════

    if (matches(q, 'what is clubops', 'what is this website', 'what is this app', 'about website', 'about clubops', 'what does this do', 'what can i do here', 'what are the features', 'features of website', 'website guide', 'how does this work', 'explain website', 'help me')) {
      content = `👋 **Welcome to ClubOps AI!**\n\n` +
        `ClubOps AI is an intelligent operations command center for **college clubs, tech societies, and student hackathons**.\n\n` +
        `### 🚀 Core Platform Modules:\n` +
        `1. **📊 Mission Control**: Real-time event command center showing live health score, critical path alerts, and department progress.\n` +
        `2. **📋 Task Manager**: Kanban & list view for tasks, dependencies, blockers, and SLA deadlines across all teams.\n` +
        `3. **👥 Volunteers**: Team rosters, smart skill tags, live workload indicators (Available, Medium, High, Overloaded), and shift tracking.\n` +
        `4. **⚠️ Risk Radar**: Proactive risk matrix tracking severity (Critical, High, Medium, Low), impact analysis, and mitigation playbooks.\n` +
        `5. **📣 Announcements Generator**: Instant tailored broadcasts for WhatsApp, Email, Instagram reels, and official campus notices.\n` +
        `6. **🧠 Club Brain**: Document store and semantic search across your past event guidelines, vendor contracts, and budgets.\n` +
        `7. **🔮 What-If Simulator**: Run scenario simulations (venue delays, sponsor pulls, volunteer shortages) to forecast domino impacts.\n` +
        `8. **🤖 AI Chatbot (Me!)**: Your assistant for answering any questions about the platform or your event.\n\n` +
        `What would you like to explore or do today?`;

    } else if (matches(q, 'how to create task', 'how to add task', 'how to create a task', 'how to add a task', 'add task', 'add a task', 'new task', 'create a task', 'assign task')) {
      content = `📋 **How to Create and Assign Tasks:**\n\n` +
        `1. Navigate to **Mission Control** from the top bar or sidebar.\n` +
        `2. Click on the **"Tasks"** tab.\n` +
        `3. Click the **"+ New Task"** button on the top right.\n` +
        `4. Enter details:\n` +
        `   • **Title**: Descriptive name of the deliverable\n` +
        `   • **Team**: Department responsible (Logistics, Tech, Sponsorship, etc.)\n` +
        `   • **Priority**: CRITICAL, HIGH, MEDIUM, or LOW\n` +
        `   • **Deadline**: Date and time due\n` +
        `   • **Assignee**: Volunteer or lead assigned\n` +
        `5. Click **Create Task**.\n\n` +
        `💡 *Pro-Tip*: Tasks marked **CRITICAL** or overdue directly influence the live **Event Health Score**!`;

    } else if (matches(q, 'how to add volunteer', 'how to add a volunteer', 'add a volunteer', 'add volunteer', 'new volunteer', 'add member', 'add a member', 'create volunteer', 'register volunteer')) {
      content = `👥 **How to Add Volunteers & Manage Teams:**\n\n` +
        `1. Go to **Mission Control** → select the **"Volunteers"** tab.\n` +
        `2. Click **"+ Add Volunteer"**.\n` +
        `3. Provide:\n` +
        `   • **Name, Email & Mobile Number**\n` +
        `   • **Team / Department Assignment**\n` +
        `   • **Skill Tags** (e.g., Audio, Flutter, Graphic Design, Sponsorship)\n` +
        `   • **Initial Workload status** (Low, Medium, High)\n` +
        `4. Save to see them appear in your roster with real-time capacity monitoring.\n\n` +
        `💡 *Workload Balancing*: If a volunteer gets assigned >12 hours, they are flagged as **OVERLOADED** so you can reassign tasks.`;

    } else if (matches(q, 'how to create event', 'how to create an event', 'create an event', 'add event', 'add an event', 'new event', 'create event', 'create new event')) {
      content = `🎉 **How to Create and Switch Events:**\n\n` +
        `1. When registering a new account, you can create your club and initial event during onboarding.\n` +
        `2. In the app header or sidebar, click on your club profile or event selector to create additional events.\n` +
        `3. Fill in:\n` +
        `   • **Event Name** (e.g., HackSprint 2026, Annual Cultural Fest)\n` +
        `   • **Type** (Hackathon, Workshop, Cultural, Sports, Conference)\n` +
        `   • **Date & Venue Location**\n` +
        `   • **Expected Participant Headcount & Budget**\n` +
        `4. Once saved, all tasks, teams, and risks automatically bind to your active event.`;

    } else if (matches(q, 'how to add risk', 'how to add a risk', 'add a risk', 'create risk', 'create a risk', 'new risk', 'add risk', 'log risk', 'log a risk', 'risk radar')) {
      content = `⚠️ **How to Log Risks in the Risk Radar:**\n\n` +
        `1. Go to **Mission Control** → **"Risk Radar"** tab.\n` +
        `2. Click **"+ Log New Risk"**.\n` +
        `3. Configure:\n` +
        `   • **Title & Description**\n` +
        `   • **Category** (VENUE, TECHNICAL, VOLUNTEER, BUDGET, TIMELINE)\n` +
        `   • **Severity** (CRITICAL, HIGH, MEDIUM, LOW)\n` +
        `   • **Impact Analysis & Contingency / Mitigation Plan**\n` +
        `4. Click **Save Risk**.\n\n` +
        `🛡️ *Automated Actions*: Critical risks will trigger AI mitigation recommendations with one-click action execution!`;

    } else if (matches(q, 'health score', 'how is health calculated', 'what is health score', 'health calculation')) {
      const currentScore = event ? event.healthScore : 100;
      content = `🏥 **Event Health Score Algorithm (0 – 100):**\n\n` +
        `Your event health score is calculated dynamically:\n` +
        `• **Baseline**: 100 points\n` +
        `• **Overdue Tasks**: -8 points for each uncompleted task past deadline\n` +
        `• **Blocked Tasks**: -6 points for each dependency deadlock\n` +
        `• **Critical Risks**: -12 points for unmitigated critical risks\n` +
        `• **Overloaded Staff**: -5 points for severe team burnout\n` +
        `• **Task Completion Bonus**: Up to +20 points as milestones are checked off\n\n` +
        `📊 **Current Score**: **${currentScore}/100** ${currentScore >= 80 ? '🟢 (Optimal)' : currentScore >= 60 ? '🟡 (Requires Attention)' : '🔴 (Action Required)'}\n` +
        `Unblocking tasks and resolving overdue deadlines will restore your score to 100.`;

    } else if (matches(q, 'how to login', 'how to register', 'how to signup', 'create account', 'authentication', 'otp')) {
      content = `🔐 **Authentication & Account Access:**\n\n` +
        `• **New User Sign Up**: Go to \`/auth?mode=register\`, choose Organizer or Club Joiner, fill in your details, and verify via Email OTP (sent by Gmail SMTP).\n` +
        `• **Sign In Options**: You can sign in using your **Password** OR passwordless **Email OTP** anytime.\n` +
        `• **Security**: Passwords are encrypted with bcrypt; OTP codes expire in 5 minutes with a 60-second re-send cooldown.`;

    } else if (matches(q, 'announcement', 'generate announcement', 'broadcast', 'whatsapp', 'instagram')) {
      content = `📣 **Announcements & Broadcast Engine:**\n\n` +
        `1. Open **Mission Control** → **"Announcements"** tab.\n` +
        `2. Choose your distribution channel:\n` +
        `   • **WhatsApp**: Formatted with bold highlights, urgent alert badges, and action bullets.\n` +
        `   • **Email**: Polished formal tone with agenda bullet points and signature.\n` +
        `   • **Instagram**: Engaging captions with hype emojis and trending hashtags.\n` +
        `   • **Notice Board**: Formal campus administrative circular format.\n` +
        `3. Provide your topic (e.g. *Registration deadline closing*, *Volunteer briefing*).\n` +
        `4. Click **Generate** to produce copy-ready text instantly.`;

    } else if (matches(q, 'club brain', 'documents', 'upload pdf', 'knowledge base')) {
      content = `🧠 **Club Brain Document Intelligence:**\n\n` +
        `Club Brain preserves your club's institutional memory:\n` +
        `1. Go to **Mission Control** → **"Club Brain"**.\n` +
        `2. Upload documents such as past post-mortems, sponsorship decks, supplier invoices, or university guidelines.\n` +
        `3. Use the search bar to query your documents in natural language (e.g., *"What did we spend on stage lighting last year?"*).\n` +
        `4. The AI retrieves cited excerpts directly from uploaded files.`;

    } else if (matches(q, 'what-if', 'what if', 'simulation', 'simulate')) {
      content = `🔮 **What-If Scenario Simulator:**\n\n` +
        `Test potential setbacks before they happen:\n` +
        `• **Venue Clearance Delay**: Simulates what happens if auditorium access is pushed back by 1–5 days.\n` +
        `• **Sponsor Cancellation**: Calculates budget reduction and impact on planned vendor purchases.\n` +
        `• **Volunteer Shortage**: Projects participant check-in queue delays and volunteer burnout.\n\n` +
        `Head to the What-If simulation panel in Mission Control to run stress tests!`;

    // ════════════════════════════════════════════════════════════════════════
    // 2. LIVE EVENT QUERIES (DYNAMIC DATA FROM DATABASE)
    // ════════════════════════════════════════════════════════════════════════

    } else if (matches(q, 'summary', 'overview', 'status', 'how is event', 'event status', 'dashboard summary')) {
      if (!event) {
        content = `ℹ️ No event has been created yet. You can create an event in the Onboarding flow or via Mission Control!`;
      } else {
        content = `📊 **Live Event Status: "${event.name}"**\n\n` +
          `• 🏥 **Health Score**: **${event.healthScore}/100** ${event.healthScore >= 80 ? '🟢' : event.healthScore >= 60 ? '🟡' : '🔴'}\n` +
          `• 📅 **Date**: ${eventDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} ${daysToEvent !== null ? (daysToEvent > 0 ? `(in ${daysToEvent} days)` : daysToEvent === 0 ? `(Today! 🎉)` : `(${Math.abs(daysToEvent)} days ago)`) : ''}\n` +
          `• 📍 **Venue**: ${event.location || 'Location pending'}\n` +
          `• 👥 **Participants**: ${event.expectedParticipants} expected\n` +
          `• 💰 **Budget**: ₹${(event.budget ?? 0).toLocaleString('en-IN')}\n\n` +
          `### 📋 Deliverables Breakdown:\n` +
          `• Total Tasks: **${allTasks.length}** (${completionPct}% completed)\n` +
          `• ✅ Done: ${doneTasks.length} | 🔵 In Progress: ${inProgressTasks.length} | 📌 Todo: ${todoTasks.length}\n` +
          `• ⚠️ Overdue: **${overdueTasks.length}** | 🚫 Blocked: **${blockedTasks.length}**\n\n` +
          `### 🛡️ Risks & Roster:\n` +
          `• Active Risks: **${activeRisks.length}** (${criticalRisks.length} Critical, ${highRisks.length} High)\n` +
          `• Volunteers Registered: **${volunteers.length}** (${overloadedVols.length} overloaded)`;
      }

    } else if (matches(q, 'today', 'due today', "today's task", "today's priorities", 'priorities')) {
      if (!event) {
        content = `ℹ️ No active event found. Create an event to track today's priorities.`;
      } else {
        const recList: string[] = [];
        if (todayTasks.length > 0) recList.push(`⏰ **${todayTasks.length} task(s) due today**:\n` + todayTasks.map((t: any) => taskLine(t, now)).join('\n'));
        if (overdueTasks.length > 0) recList.push(`⚠️ **${overdueTasks.length} overdue task(s)** needing urgent triage:\n` + overdueTasks.slice(0, 5).map((t: any) => taskLine(t, now)).join('\n'));
        if (criticalRisks.length > 0) recList.push(`🔴 **${criticalRisks.length} critical risk(s)** active: ${criticalRisks.map((r: any) => r.title).join(', ')}`);

        if (recList.length === 0) {
          content = `✅ **No tasks due today and zero overdue items!**\n\n` +
            `Your next upcoming milestones:\n` +
            (allTasks.filter((t: any) => t.status !== 'DONE').slice(0, 4).map((t: any) => taskLine(t, now)).join('\n') || '• No upcoming tasks logged yet.');
        } else {
          content = `🎯 **Today's Strategic Focus for "${event.name}":**\n\n` + recList.join('\n\n');
        }
      }

    } else if (matches(q, 'overdue', 'late', 'missed deadline', 'past deadline')) {
      if (!event || overdueTasks.length === 0) {
        content = `🎉 **Zero overdue tasks!** All task deadlines are on schedule.`;
      } else {
        content = `⚠️ **${overdueTasks.length} Overdue Deliverable(s) Detected:**\n\n` +
          overdueTasks.map((t: any) => taskLine(t, now)).join('\n') +
          `\n\n🚨 *Impact*: Each overdue task reduces your Event Health Score by 8 points.`;

        proposedActions.push({
          id: `act_overdue_${Date.now()}`,
          type: 'NOTIFY_TEAM',
          title: 'Send Urgent Overdue Reminders',
          description: `Send automated WhatsApp & email nudges to owners of ${overdueTasks.length} overdue tasks.`,
          buttonLabel: '📩 Nudge Assignees',
          payload: { taskIds: overdueTasks.map((t: any) => t.id), message: 'Urgent: Task deadline has passed. Please update progress.' },
        });
      }

    } else if (matches(q, 'blocked', 'blockers', 'dependencies', 'dependency')) {
      if (!event || blockedTasks.length === 0) {
        content = `✅ **No blocked tasks found!** Workflows are flowing smoothly without dependency bottlenecks.`;
      } else {
        content = `🚫 **${blockedTasks.length} Task(s) Currently Blocked by Dependencies:**\n\n` +
          blockedTasks.map((t: any) => {
            const deps = t.dependencies?.map((d: any) => d.dependsOn?.title).filter(Boolean) || [];
            return `• **${t.title}** [${t.priority}]\n  ↳ Awaiting: ${deps.length > 0 ? deps.join(', ') : 'Upstream prerequisite'} (${t.team?.name || 'General Team'})`;
          }).join('\n\n') +
          `\n\n💡 Unblock these by prioritizing their prerequisite items first!`;
      }

    } else if (matches(q, 'critical task', 'urgent task', 'high priority', 'critical')) {
      if (!event || criticalTasks.length === 0) {
        content = `✅ **All critical-tier tasks have been completed or none are logged!**`;
      } else {
        content = `🔴 **${criticalTasks.length} Critical Task(s) Requiring Immediate Attention:**\n\n` +
          criticalTasks.map((t: any) => taskLine(t, now)).join('\n');
      }

    } else if (matches(q, 'risk', 'risks', 'threat', 'danger', 'radar')) {
      if (!event || activeRisks.length === 0) {
        content = `🛡️ **No active risks logged!** Your risk register is clean. Log emerging risks under **Risk Radar** to stay ahead.`;
      } else {
        content = `⚠️ **Active Risks in Risk Radar (${activeRisks.length} total):**\n\n` +
          activeRisks.map((r: any) =>
            `• [**${r.severity}**] **${r.title}** (${r.status})\n  *Impact*: ${r.impactAnalysis || 'Standard operational disruption'}\n  *Playbook*: ${r.mitigationPlan || 'Contingency plan pending'}`
          ).join('\n\n');
      }

    } else if (matches(q, 'volunteer', 'volunteers', 'workload', 'roster', 'staff', 'team capacity')) {
      if (!event || volunteers.length === 0) {
        content = `👥 No volunteers registered yet. Add your committee members under the **Volunteers** tab in Mission Control.`;
      } else {
        content = `👥 **Volunteer Operations & Capacity:**\n\n` +
          `• Total Volunteers: **${volunteers.length}**\n` +
          `• 🟢 Available / Normal: **${availableVols.length}**\n` +
          `• 🟠 High Workload: **${highWorkloadVols.length}**\n` +
          `• 🔴 Overloaded: **${overloadedVols.length}**\n\n` +
          (overloadedVols.length > 0 ? `⚠️ **Overloaded Members Alert:**\n` + overloadedVols.map((v: any) => `• **${v.name}** (${v.team?.name || 'Unassigned'}) — ${v.assignedHours} hours committed`).join('\n') : `✅ Workloads are currently balanced.`);

        if (overloadedVols.length > 0 && availableVols.length > 0) {
          proposedActions.push({
            id: `act_rebalance_${Date.now()}`,
            type: 'REALLOCATE_VOLUNTEERS',
            title: 'Rebalance Volunteer Shifts',
            description: `Shift available volunteers to offload tasks from overloaded members.`,
            buttonLabel: '🔄 Rebalance Workload',
            payload: { eventId: event.id, count: Math.min(3, availableVols.length) },
          });
        }
      }

    } else if (matches(q, 'budget', 'finances', 'cost', 'spend', 'money')) {
      const budget = event?.budget ?? 0;
      const participants = event?.expectedParticipants ?? 0;
      content = `💰 **Financial & Budget Snapshot:**\n\n` +
        `• **Approved Budget**: ₹${budget.toLocaleString('en-IN')}\n` +
        `• **Projected Participants**: ${participants}\n` +
        `• **Budget Allocation Per Head**: ₹${participants > 0 ? Math.round(budget / participants) : 0}\n\n` +
        `💡 To track itemized invoices and sponsor disbursements, upload your spreadsheets to **Club Brain**.`;

    } else if (matches(q, 'recommend', 'suggestion', 'what next', 'what should i do', 'advice', 'action items')) {
      const steps: string[] = [];
      if (overdueTasks.length > 0) steps.push(`Triage **${overdueTasks.length} overdue task(s)** immediately to prevent further health score decline.`);
      if (blockedTasks.length > 0) steps.push(`Resolve the blocker chain for **${blockedTasks.length} blocked task(s)**.`);
      if (criticalRisks.length > 0) steps.push(`Review mitigation playbooks for **${criticalRisks.length} critical risk(s)**.`);
      if (overloadedVols.length > 0) steps.push(`Reallocate tasks from **${overloadedVols.length} overloaded volunteer(s)**.`);
      if (allTasks.length === 0) steps.push(`Add your event tasks under Mission Control → Tasks to start tracking progress.`);

      if (steps.length === 0) {
        content = `🌟 **All systems optimal!** Event health is at **${event?.healthScore || 100}/100** with no overdue items or active blockers. Keep monitoring as the event date draws closer!`;
      } else {
        content = `🎯 **Recommended Next Steps for Organizers:**\n\n` +
          steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
      }

    // ════════════════════════════════════════════════════════════════════════
    // 3. CONVERSATIONAL & INTELLIGENT FALLBACK
    // ════════════════════════════════════════════════════════════════════════

    } else if (matches(q, 'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening')) {
      content = `👋 Hello! I am **ClubOps Chatbot**, your intelligent event operations assistant.\n\n` +
        (event ? `I'm currently monitoring **${event.name}** (Health: **${event.healthScore}/100**).\n\n` : `I can help you manage your events, tasks, volunteers, and answer any questions about the platform.\n\n`) +
        `You can ask me anything about:\n` +
        `• 📋 Tasks, deadlines, and critical path blockers\n` +
        `• 👥 Volunteer roster and workload balancing\n` +
        `• ⚠️ Risk management and mitigation strategies\n` +
        `• 🌐 How to navigate and use any feature on this website\n\n` +
        `What can I assist you with right now?`;

    } else if (matches(q, 'who are you', 'what is your name', 'what are you')) {
      content = `🤖 I am **ClubOps Chatbot**, the built-in AI assistant for ClubOps AI!\n\n` +
        `I am programmed with deep knowledge of:\n` +
        `• The entire ClubOps AI web application and all its features\n` +
        `• Your active event's real-time tasks, volunteers, risks, and budget\n` +
        `• Event management best practices for student clubs and fests\n\n` +
        `Feel free to ask me any question about the website or your operations!`;

    } else if (matches(q, 'thank', 'thanks', 'cool', 'awesome', 'great')) {
      content = `You're very welcome! 😊 Let me know if you need anything else to make your event a success.`;

    } else {
      // General question answering
      content = `🤖 **ClubOps Chatbot:**\n\n` +
        `Regarding your question: *"**${query}**"*\n\n` +
        (event
          ? `Here is the current snapshot for **${event.name}**:\n` +
            `• Health: **${event.healthScore}/100** | Tasks: **${doneTasks.length}/${allTasks.length} done** (${completionPct}%)\n` +
            `• Active Risks: **${activeRisks.length}** | Overdue Tasks: **${overdueTasks.length}**\n\n`
          : '') +
        `💡 **Here are things you can ask me anytime:**\n` +
        `• *"What is ClubOps AI?"* or *"How to create a task?"*\n` +
        `• *"Show me overdue tasks"* or *"What are today's priorities?"*\n` +
        `• *"How does the health score work?"*\n` +
        `• *"How to add a volunteer?"* or *"Who is overloaded?"*\n` +
        `• *"How to generate a WhatsApp announcement?"*\n\n` +
        `Tell me what you'd like to know or check!`;
    }

    // Record conversation in database for audit history
    if (event && userId && userId !== 'anonymous') {
      try {
        const conv = await prisma.aiConversation.findFirst({ where: { eventId: event.id, userId } });
        const convId = conv?.id || (await prisma.aiConversation.create({
          data: { eventId: event.id, userId, title: `Chatbot: ${event.name}` },
        })).id;

        await prisma.aiMessage.create({
          data: { conversationId: convId, sender: 'USER', content: query },
        });
        await prisma.aiMessage.create({
          data: { conversationId: convId, sender: 'ASSISTANT', content },
        });
      } catch {
        // Non-blocking
      }
    }

    return {
      query,
      content,
      proposedActions,
      timestamp: new Date().toISOString(),
    };
  }

  async executeApprovedAction(action: ProposedAction, userId: string) {
    console.log(`[AiService] Executing approved action: ${action.title} (${action.type})`);

    const dbAction = await prisma.aiAction.create({
      data: {
        eventId: action.payload?.eventId || (await prisma.event.findFirst())?.id || '',
        proposedById: userId,
        actionType: action.type,
        title: action.title,
        description: action.description,
        payload: JSON.stringify(action.payload || {}),
        status: 'EXECUTED',
        executedAt: new Date(),
        auditLog: `Executed by User ${userId} at ${new Date().toISOString()}`,
      },
    });

    switch (action.type) {
      case 'CREATE_FOLLOWUP': {
        const eventId = action.payload.eventId;
        const teams = await prisma.team.findMany();
        const coreTeam = teams.find(t => t.name.includes('Core'));
        await tasksService.createTask(eventId, {
          title: action.payload.title || 'Leadership Followup Checkpoint',
          description: 'Created via AI Chatbot action execution.',
          teamId: coreTeam?.id,
          priority: 'CRITICAL',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tags: ['AI-Action', 'Followup'],
        });
        break;
      }
      case 'REALLOCATE_VOLUNTEERS': {
        const { count, eventId } = action.payload;
        const vols = await prisma.volunteer.findMany({ where: { currentWorkload: 'LOW' }, take: count || 3 });
        for (const v of vols) {
          await prisma.volunteer.update({
            where: { id: v.id },
            data: { currentWorkload: 'MEDIUM', assignedHours: v.assignedHours + 4 },
          });
        }
        if (eventId) {
          realtimeHub.broadcastToEvent(eventId, {
            type: 'VOLUNTEERS_REALLOCATED',
            payload: { count: vols.length, volunteerNames: vols.map(v => v.name) },
          });
        }
        break;
      }
      case 'NOTIFY_TEAM': {
        const { taskIds, message } = action.payload;
        for (const tid of (taskIds || []).slice(0, 10)) {
          const task = await prisma.task.findUnique({ where: { id: tid } });
          if (task?.assigneeId) {
            await prisma.notification.create({
              data: {
                userId: task.assigneeId,
                eventId: task.eventId,
                category: 'TASK',
                title: 'Task Reminder',
                message: `${message}: "${task.title}"`,
              },
            });
          }
        }
        break;
      }
      case 'ACTIVATE_CONTINGENCY': {
        const eventId = action.payload.eventId;
        if (eventId) {
          await prisma.risk.create({
            data: {
              eventId,
              title: 'Contingency Plan Activated',
              description: 'Activated via AI Chatbot prompt.',
              category: 'VENUE',
              severity: 'MEDIUM',
              status: 'MITIGATING',
              mitigationPlan: 'Contingency protocols deployed.',
            },
          });
        }
        break;
      }
    }

    if (dbAction.eventId) {
      const health = await eventsService.calculateHealthScore(dbAction.eventId);
      realtimeHub.broadcastHealthUpdate(dbAction.eventId, health.score);
      realtimeHub.broadcastAiActionExecuted(dbAction.eventId, dbAction);
    }

    return {
      success: true,
      actionId: dbAction.id,
      message: `Action "${action.title}" executed successfully.`,
    };
  }

  async runWhatIfSimulation(eventId: string, scenario: {
    type: 'VENUE_DELAY' | 'SPONSOR_CANCELLED' | 'VOLUNTEER_SHORTAGE' | 'BUDGET_CUT';
    delayDays?: number;
    shortagePercentage?: number;
  }) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { tasks: { include: { team: true, dependencies: true, dependedOnBy: true } }, risks: true },
    });
    if (!event) throw new Error('Event not found');

    const delayDays = scenario.delayDays || 3;
    const currentHealth = event.healthScore;
    let affectedTasks: any[] = [];
    let affectedTeams = new Set<string>();
    let simulatedHealth = currentHealth;
    let narrative = '';
    let recommendation = '';

    if (scenario.type === 'VENUE_DELAY') {
      const venueTask = event.tasks.find(t => t.title.toLowerCase().includes('venue') || t.title.toLowerCase().includes('auditorium')) || event.tasks[0];
      const downstream = event.tasks.filter(t =>
        t.id === venueTask?.id ||
        t.dependencies.some(d => d.dependsOnTaskId === venueTask?.id) ||
        t.title.toLowerCase().includes('stage') || t.title.toLowerCase().includes('audio')
      );
      affectedTasks = downstream.map(t => {
        const originalDeadline = new Date(t.deadline);
        const newDeadline = new Date(originalDeadline.getTime() + delayDays * 86400000);
        if (t.team) affectedTeams.add(t.team.name);
        return { id: t.id, title: t.title, team: t.team?.name || 'Logistics', currentDeadline: originalDeadline.toLocaleDateString(), simulatedDeadline: newDeadline.toLocaleDateString(), delayShift: `+${delayDays} days`, status: t.status, isCriticalPath: true };
      });
      simulatedHealth = Math.max(35, currentHealth - 28);
      narrative = `A ${delayDays}-day venue delay cascades into ${affectedTasks.length} critical path tasks across ${affectedTeams.size} teams.`;
      recommendation = `Activate backup venue plan immediately and fast-track AV setup.`;
    } else if (scenario.type === 'SPONSOR_CANCELLED') {
      simulatedHealth = Math.max(40, currentHealth - 20);
      narrative = `Major sponsor cancellation reduces liquidity, threatening stage and merchandise budgets.`;
      recommendation = `Switch to modular banners and local rapid-print vendors.`;
    } else {
      simulatedHealth = Math.max(45, currentHealth - 18);
      narrative = `30% volunteer shortage increases check-in wait times significantly.`;
      recommendation = `Deploy self-service QR badge scanning kiosks.`;
    }

    return { scenario: scenario.type, currentState: { healthScore: currentHealth, criticalRisksCount: event.risks.filter(r => r.severity === 'CRITICAL').length, delayedTasksCount: 0 }, simulatedState: { healthScore: simulatedHealth, healthDelta: simulatedHealth - currentHealth, affectedTasksCount: affectedTasks.length, affectedTeamsCount: affectedTeams.size, affectedTeams: Array.from(affectedTeams), affectedTasks }, narrative, recommendation, canApply: true };
  }

  async generateAnnouncements(data: { eventId: string; channel: 'WHATSAPP' | 'EMAIL' | 'NOTICE' | 'INSTAGRAM'; topic: string; targetAudience: string; }) {
    const event = await prisma.event.findUnique({ where: { id: data.eventId } });
    const eventName = event?.name || 'Our Event';
    const eventDate = event?.date ? new Date(event.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Upcoming Date';
    let content = '', title = '';

    switch (data.channel) {
      case 'WHATSAPP':
        title = `📢 [URGENT] ${eventName} Update: ${data.topic}`;
        content = `🚀 *${eventName.toUpperCase()} ANNOUNCEMENT* 🚀\n\nHey Team! 👋\n\nImportant update regarding *${data.topic}*:\n📅 *Date*: ${eventDate}\n📍 *Venue*: ${event?.location || 'Main Venue'}\n\n👉 *Action Required*: All ${data.targetAudience.toLowerCase()} please check with your team leads.\n\nLet's make this edition legendary! ✨\n- *ClubOps AI*`;
        break;
      case 'EMAIL':
        title = `Official Notification: ${data.topic} — ${eventName}`;
        content = `Dear ${data.targetAudience},\n\nThis is an official update regarding ${data.topic} for ${eventName}, scheduled for ${eventDate}.\n\nPlease review the details shared by your team lead and confirm your attendance/role.\n\nFor queries, contact the organizing committee.\n\nWarm regards,\nThe Organizing Team\n${eventName} | Powered by ClubOps AI`;
        break;
      case 'INSTAGRAM':
        title = `Instagram Caption: ${data.topic}`;
        content = `⚡ ${data.topic.toUpperCase()} ⚡\n\n${eventName} is HERE! 🚀 Join us on ${eventDate} for an unforgettable experience.\n\n🔗 Register now — link in bio!\n\n#${eventName.replace(/\s+/g, '')} #CollegeFest #ClubOpsAI`;
        break;
      case 'NOTICE':
        title = `OFFICIAL NOTICE: ${eventName}`;
        content = `NOTICE\n\nSUBJECT: ${data.topic.toUpperCase()}\n\nAll students are informed that ${eventName} will be held on ${eventDate} at ${event?.location || 'the campus venue'}.\n\nFor details, contact the organizing committee.\n\nBy Order of the Organizing Committee.`;
        break;
    }
    return { channel: data.channel, title, content, targetAudience: data.targetAudience };
  }

  async queryClubBrain(clubId: string, query: string) {
    const documents = await prisma.document.findMany({
      where: { clubId },
      include: { chunks: true },
    });

    if (documents.length === 0) {
      return {
        answer: `No documents uploaded yet. Click **"Upload Document"** to add a PDF — AI will scan and index all content automatically.`,
        sources: [],
      };
    }

    // Build document objects with all available content
    const docs = documents.map(d => ({
      id: d.id,
      title: d.title,
      content: d.content || d.chunks.map((c: any) => c.content).join('\n') || d.summary || '',
      summary: d.summary || '',
    }));

    // ── Try Gemini first ──────────────────────────────────────────────────────
    if (geminiService.isAvailable()) {
      try {
        const result = await geminiService.answerFromDocuments(query, docs);
        return result;
      } catch (e: any) {
        console.warn('[Brain] Gemini failed:', e.message?.slice(0, 100));
      }
    }

    // ── Fallback: Smart text search ──────────────────────────────────────────
    const allText = docs.map(d => d.content).join('\n');
    const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 2);

    if (lines.length === 0) {
      return {
        answer: `⚠️ The documents were uploaded but no text could be extracted.\n\n` +
          `**Please delete the existing document and re-upload your PDF** — it will now be properly scanned.\n\n` +
          `Documents: ${docs.map(d => d.title).join(', ')}`,
        sources: [],
      };
    }

    const q = query.toLowerCase();
    const stopwords = new Set(['how', 'many', 'what', 'is', 'are', 'the', 'a', 'an', 'in', 'of', 'to', 'do', 'does', 'tell', 'me', 'about', 'show', 'give', 'can', 'this', 'my', 'our', 'for', 'and', 'was', 'were']);
    const keywords = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));

    const matchingLines = lines.filter(l => keywords.some(k => l.toLowerCase().includes(k)));

    // Number pattern extraction
    const numMatches = allText.match(/\b\d+\b[\s\S]{0,30}?(volunteer|member|person|people|staff|participant|name|total|count)/gi) || [];
    const namePattern = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g;
    const names = [...new Set(allText.match(namePattern) || [])];

    let answer = `📄 **Answer from "${docs.map(d => d.title).join(', ')}":**\n\n`;

    if (numMatches.length > 0) {
      answer += `🔢 **Numbers found:**\n${numMatches.slice(0, 5).map(m => `• ${m.trim()}`).join('\n')}\n\n`;
    }
    if (names.length > 0 && keywords.some(k => ['volunteer', 'member', 'name', 'person', 'staff', 'roster'].includes(k))) {
      answer += `👥 **Names found (${names.length}):**\n${names.slice(0, 20).map(n => `• ${n}`).join('\n')}\n\n`;
    }
    if (matchingLines.length > 0) {
      answer += `📋 **Relevant lines:**\n${matchingLines.slice(0, 15).map(l => `> ${l}`).join('\n')}`;
    } else {
      answer += `📋 **Document preview:**\n${lines.slice(0, 20).map(l => `> ${l}`).join('\n')}`;
    }

    return {
      answer,
      sources: docs.slice(0, 3).map(d => ({
        title: d.title,
        page: 1,
        excerpt: d.content.slice(0, 120),
      })),
    };
  }
}

export const aiService = new AiService();
