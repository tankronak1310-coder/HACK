import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { realtimeHub } from '../../realtime/socket.js';
import { tasksService } from '../tasks/tasks.service.js';
import { eventsService } from '../events/events.service.js';

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

  async generateAnnouncements(data: {
    eventId: string;
    channel: 'WHATSAPP' | 'EMAIL' | 'NOTICE' | 'INSTAGRAM';
    topic: string;
    targetAudience: string;
    tone?: 'URGENT' | 'EXCITED' | 'FORMAL' | 'CASUAL';
    additionalNotes?: string;
  }) {
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: { club: true }
    });

    const eventName = event?.name || 'College Fest';
    const clubName = event?.club?.name || 'Organizing Club';
    const eventLocation = event?.location || 'Main Campus Venue';
    const eventDate = event?.date
      ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
      : 'Upcoming Date';

    const rawTopic = (data.topic || '').trim();
    const audience = data.targetAudience || 'ALL';
    const userNotes = data.additionalNotes ? data.additionalNotes.trim() : '';

    // Determine effective tone
    let tone = data.tone;
    const lowerTopic = rawTopic.toLowerCase();
    if (!tone) {
      if (/urgent|alert|emergency|shift|rain|cancel|delay|immediately/.test(lowerTopic)) {
        tone = 'URGENT';
      } else if (/winner|prize|congrat|celebrat|party|reveal|live|swag|hackathon/.test(lowerTopic)) {
        tone = 'EXCITED';
      } else if (/notice|circular|official|policy|guideline|instruction|dean|faculty/.test(lowerTopic)) {
        tone = 'FORMAL';
      } else {
        tone = data.channel === 'INSTAGRAM' ? 'EXCITED' : data.channel === 'NOTICE' ? 'FORMAL' : 'CASUAL';
      }
    }

    // 1. Try Gemini API if key is present
    if (env.GEMINI_API_KEY) {
      try {
        const geminiPrompt = `You are ClubOps AI, the autonomous operating system for collegiate events.
Generate a tailored, highly specific announcement for:
- Event: "${eventName}" (${eventDate} at ${eventLocation}, organized by ${clubName})
- Channel: ${data.channel} (WHATSAPP, EMAIL, INSTAGRAM, or NOTICE)
- Target Audience: ${audience}
- Desired Tone: ${tone}
- Announcement Topic: "${rawTopic}"
${userNotes ? `- Extra Context/Details: "${userNotes}"` : ''}

CHANNEL SPECIFIC RULES:
- WHATSAPP: Use bold (*text*), italic (_text_), bullet points, relevant emojis, concise and easy to skim on mobile. Include specific action items for ${audience}.
- EMAIL: Professional Subject Line, proper salutation, structured context paragraphs, clear bulleted next steps, official sign-off with club and event details.
- INSTAGRAM: Viral hook in first line, engaging emojis, paragraph breaks, clear Call To Action (CTA), 8-12 relevant hashtags including event and topic keywords.
- NOTICE: Formal university circular format: Reference No., Date, Clear Subject in CAPS, authoritative administrative paragraphs, mandatory instructions, official sign-off by Organizing Committee.

CRITICAL: Return ONLY valid JSON in this exact format:
{
  "title": "Concise, descriptive title or subject line",
  "content": "The complete message body ready to publish"
}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: geminiPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        });

        if (res.ok) {
          const json: any = await res.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.title && parsed.content) {
              return { channel: data.channel, title: parsed.title, content: parsed.content, targetAudience: audience };
            }
          }
        }
      } catch (err) {
        console.warn('[AI] Gemini announcement generation failed, falling back:', err);
      }
    }

    // 2. Try OpenAI API if key is present
    if (env.OPENAI_API_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are ClubOps AI. Generate customized event announcements formatted strictly for the chosen communication channel. Output JSON with "title" and "content".',
              },
              {
                role: 'user',
                content: `Event: ${eventName}, Date: ${eventDate}, Location: ${eventLocation}, Club: ${clubName}, Channel: ${data.channel}, Audience: ${audience}, Tone: ${tone}, Topic: ${rawTopic}${userNotes ? `, Extra: ${userNotes}` : ''}`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const json: any = await res.json();
          const parsed = JSON.parse(json.choices?.[0]?.message?.content || '{}');
          if (parsed.title && parsed.content) {
            return { channel: data.channel, title: parsed.title, content: parsed.content, targetAudience: audience };
          }
        }
      } catch (err) {
        console.warn('[AI] OpenAI announcement generation failed, falling back:', err);
      }
    }

    // 3. High-Fidelity Semantic Topic Synthesis Engine (Offline / Deterministic Fallback)
    // Extracts context, entities, time, numbers, and category to produce authentic, varied content
    const timeMatch = rawTopic.match(/\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)|midnight|noon|\d+\s*(?:hours|hrs|mins|days))\b/i);
    const extractedTime = timeMatch ? timeMatch[0] : null;

    const venueMatch = rawTopic.match(/\b(audi(?:torium)?\s*\d*|hall\s*[a-z0-9]*|lab\s*\d*|ground|amphi(?:theatre)?|stage\s*\d*|room\s*\d*|seminar\s*hall|canteen)\b/i);
    const extractedVenue = venueMatch ? venueMatch[0].toUpperCase() : null;

    // Detect Semantic Category
    let category: 'WEATHER_VENUE' | 'DEADLINE_SCHEDULE' | 'FOOD_HOSPITALITY' | 'SPEAKER_WORKSHOP' | 'AWARDS_WINNERS' | 'REGISTRATION_PASSES' | 'VOLUNTEER_OPS' | 'GENERAL' = 'GENERAL';

    if (/rain|weather|storm|shift|relocat|auditorium|hall|venue|ground|indoor|outdoor|moved|resite/.test(lowerTopic)) {
      category = 'WEATHER_VENUE';
    } else if (/deadline|extend|last date|submission|closing|postpone|delay|reschedule|timing|cut-off|extended/.test(lowerTopic)) {
      category = 'DEADLINE_SCHEDULE';
    } else if (/food|lunch|dinner|breakfast|snack|refreshment|coupon|token|canteen|meal|catering|beverage/.test(lowerTopic)) {
      category = 'FOOD_HOSPITALITY';
    } else if (/speaker|keynote|guest|workshop|session|mentor|panel|talk|masterclass|fireside/.test(lowerTopic)) {
      category = 'SPEAKER_WORKSHOP';
    } else if (/winner|prize|award|trophy|certificate|valedictory|ceremony|result|shortlist|congratulation|cash/.test(lowerTopic)) {
      category = 'AWARDS_WINNERS';
    } else if (/register|registration|ticket|pass|passes|qr|entry|badge|slot|check-in|seat|sold out/.test(lowerTopic)) {
      category = 'REGISTRATION_PASSES';
    } else if (/volunteer|crew|duty|reporting|lead|task|setup|logistics|manpower|hands needed/.test(lowerTopic)) {
      category = 'VOLUNTEER_OPS';
    }

    let title = '';
    let content = '';

    const effectiveVenue = extractedVenue || eventLocation;
    const effectiveTime = extractedTime || 'per scheduled schedule';

    // Channel-specific generation driven by topic category and parameters
    switch (data.channel) {
      case 'WHATSAPP': {
        if (category === 'WEATHER_VENUE') {
          title = `🚨 [URGENT VENUE UPDATE] ${rawTopic} — ${eventName}`;
          content = `🚨 *URGENT VENUE ANNOUNCEMENT* 🚨\n*${eventName.toUpperCase()}*\n\nAttention: *${audience}*\n\nPlease note an immediate operational change:\n👉 *${rawTopic}*\n\n📍 *New Location*: *${effectiveVenue}*\n⏰ *Effective*: Immediate\n\n📌 *Action Required*:\n1. Direct your team & equipment to *${effectiveVenue}* immediately.\n2. Follow on-ground volunteer marshals stationed at key corridors.\n3. Check in with your track coordinator upon arrival.\n${userNotes ? `\n📝 *Additional Note*: ${userNotes}\n` : ''}\nFor emergency logistics support, ping the Control Desk.\n— *Core Operations, ${clubName}*`;
        } else if (category === 'DEADLINE_SCHEDULE') {
          title = `⏳ [DEADLINE UPDATE] ${rawTopic} — ${eventName}`;
          content = `⏳ *DEADLINE & SCHEDULE UPDATE* ⏳\n*${eventName.toUpperCase()}*\n\nHey ${audience}! 👋\n\nTake note of an important update regarding:\n🎯 *${rawTopic}*\n\n⏰ *New Cut-off / Timing*: *${effectiveTime}*\n📅 *Date*: ${eventDate}\n🌐 *Portal / Desk*: Active & accepting updates\n\n💡 *Key Guidelines*:\n• Double check team credentials and commit hash before submission.\n• Late submissions beyond the revised cutoff cannot be accommodated.\n• If facing portal timeouts, notify your track mentor immediately.\n${userNotes ? `\n📌 *Notes*: ${userNotes}\n` : ''}\nPush hard, build strong, and make it count! 🚀\n— *Organizing Committee, ${eventName}*`;
        } else if (category === 'FOOD_HOSPITALITY') {
          title = `🍱 [MEAL / TOKEN UPDATE] ${rawTopic} — ${eventName}`;
          content = `🍱 *HOSPITALITY & REFRESHMENTS UPDATE* 🍱\n*${eventName.toUpperCase()}*\n\nCalling all *${audience}*! 🍔\n\nUpdate regarding: *${rawTopic}*\n\n📍 *Serving Counter / Location*: *${effectiveVenue}*\n⏰ *Serving Window*: Active now\n\n🔑 *Instructions*:\n• Present your digital event QR pass / wristband at Counter 1-4.\n• One meal token per accredited participant.\n• Veg / Non-Veg / Special dietary counters are clearly labeled.\n${userNotes ? `\n📌 *Notice*: ${userNotes}\n` : ''}\n♻️ *Eco Request*: Please dispose of trays & bottles in the recycling bins!\n— *Hospitality Team, ${clubName}*`;
        } else if (category === 'SPEAKER_WORKSHOP') {
          title = `🎙️ [SESSION SPOTLIGHT] ${rawTopic} — ${eventName}`;
          content = `🎙️ *KEYNOTE & WORKSHOP SPOTLIGHT* 🎙️\n*${eventName.toUpperCase()}*\n\nExciting announcement for *${audience}*! ✨\n\nWe are thrilled to bring you:\n🌟 *${rawTopic}*\n\n📍 *Hall / Stage*: *${effectiveVenue}*\n📅 *Schedule*: ${eventDate} (${effectiveTime})\n\n🔥 *What to Expect*:\n• Deep-dive masterclass and live demos.\n• Exclusive interactive Q&A round.\n• Open networking session post-talk.\n\n⚠️ *Notice*: Seating is strictly on a first-come, first-served basis. Please take your seats 10 mins prior!\n${userNotes ? `\n💡 *Special Note*: ${userNotes}\n` : ''}\n— *Tech & Speaker Relations, ${eventName}*`;
        } else if (category === 'AWARDS_WINNERS') {
          title = `🏆 [VALEDICTORY & RESULTS] ${rawTopic} — ${eventName}`;
          content = `🏆 *GRAND FINALE & AWARDS CEREMONY* 🏆\n*${eventName.toUpperCase()}*\n\nThe moment we've all been working toward is here!\n🎉 *${rawTopic}*\n\n📍 *Ceremony Hall*: *${effectiveVenue}*\n⏰ *Commencement*: ${effectiveTime}\n\n🎖️ *Agenda*:\n• Jury debrief & showcase of top innovations.\n• Announcement of Winners, Runners-up & Category Champions.\n• Distribution of Cash Prizes, Trophies & Accredited Certificates.\n\nAll ${audience.toLowerCase()} are requested to assemble in the auditorium. Let's celebrate the incredible work built this weekend! 🥂✨\n— *Executive Team, ${clubName}*`;
        } else if (category === 'REGISTRATION_PASSES') {
          title = `🎟️ [REGISTRATION & ENTRY] ${rawTopic} — ${eventName}`;
          content = `🎟️ *REGISTRATION & ACCREDITATION ALERT* 🎟️\n*${eventName.toUpperCase()}*\n\nImportant update for *${audience}* regarding:\n👉 *${rawTopic}*\n\n📍 *Check-in Desk*: *${effectiveVenue}*\n⏰ *Registration Window*: ${effectiveTime}\n\n📋 *Entry Protocol*:\n• Keep your College ID and confirmation QR code ready on screen.\n• Collect your Official Kit, RFID/QR Badge & Wi-Fi credentials.\n• Once capacity is reached, walk-in requests will close.\n${userNotes ? `\n⚡ *Details*: ${userNotes}\n` : ''}\nSee you at the gates!\n— *Registrations Desk, ${eventName}*`;
        } else if (category === 'VOLUNTEER_OPS') {
          title = `⚡ [CREW CALL] ${rawTopic} — ${eventName}`;
          content = `⚡ *CREW & VOLUNTEER DISPATCH* ⚡\n*${eventName.toUpperCase()}*\n\nAttention: *${audience}*\n\nPriority Task Alignment:\n🎯 *${rawTopic}*\n\n📍 *Reporting Post*: *${effectiveVenue}*\n⏰ *Immediate Reporting Time*: ${effectiveTime}\n\n📋 *Checklist*:\n• Check in with your designated Cluster Lead.\n• Collect walkie-talkie / volunteer badge.\n• Maintain strict crowd movement and monitor access points.\n${userNotes ? `\n📌 *Mission Brief*: ${userNotes}\n` : ''}\nThank you for holding the fort! Let's execute flawlessly! 💪\n— *Operations Command, ${clubName}*`;
        } else {
          title = `📢 [UPDATE] ${rawTopic} — ${eventName}`;
          content = `📢 *OFFICIAL EVENT ANNOUNCEMENT* 📢\n*${eventName.toUpperCase()}*\n\nHello *${audience}*! 👋\n\nHere is an important update regarding:\n📌 *${rawTopic}*\n\n📅 *Date*: ${eventDate}\n📍 *Venue*: ${effectiveVenue}\n⏰ *Time*: ${effectiveTime}\n\n✨ *Key Highlights*:\n• Please read the instructions above and coordinate with your team leads.\n• Keep your notifications active for live rolling updates.\n• For queries or support, visit the Help Desk at ${effectiveVenue}.\n${userNotes ? `\n📝 *Note*: ${userNotes}\n` : ''}\nLet's make this edition of ${eventName} truly memorable! 🚀\n— *Organizing Committee, ${eventName} | ClubOps AI*`;
        }
        break;
      }

      case 'EMAIL': {
        title = category === 'WEATHER_VENUE'
          ? `[URGENT] Venue Update: ${rawTopic} | ${eventName}`
          : category === 'DEADLINE_SCHEDULE'
          ? `[NOTICE] Deadline & Schedule Extension: ${rawTopic} | ${eventName}`
          : category === 'AWARDS_WINNERS'
          ? `[INVITATION] Valedictory Ceremony & Results: ${rawTopic} | ${eventName}`
          : category === 'FOOD_HOSPITALITY'
          ? `[HOSPITALITY] Refreshment & Meal Details: ${rawTopic} | ${eventName}`
          : `Official Update: ${rawTopic} — ${eventName}`;

        content = `Dear ${audience},

We are writing to share an official communication regarding "${rawTopic}" for ${eventName}, organized by ${clubName}.

SUMMARY OF DETAILS:
• Subject: ${rawTopic}
• Date: ${eventDate}
• Venue: ${effectiveVenue}
• Applicable Time: ${effectiveTime}

OPERATIONAL DIRECTIVES:
1. Please review this notice carefully and align your respective schedule and deliverables accordingly.
2. All accredited members must adhere to festival safety and campus conduct policies at all times.
3. If this update impacts your active task or team submissions, please notify your team coordinator or mentor immediately.
${userNotes ? `\nADDITIONAL INSTRUCTIONS:\n${userNotes}\n` : ''}
For technical assistance or urgent queries, please reply directly or visit the Central Operations Desk situated at ${effectiveVenue}.

We appreciate your cooperation and dedication toward making ${eventName} a resounding success.

Warm regards,

The Organizing Committee
${eventName} | ${clubName}
Powered by ClubOps AI Operations Hub`;
        break;
      }

      case 'INSTAGRAM': {
        const hashEvent = eventName.replace(/[^a-zA-Z0-9]/g, '');
        const hashClub = clubName.replace(/[^a-zA-Z0-9]/g, '');
        const hook = category === 'AWARDS_WINNERS'
          ? `AND THE WINNERS ARE... 🏆✨`
          : category === 'DEADLINE_SCHEDULE'
          ? `MORE TIME TO BUILD! ⏳🔥`
          : category === 'WEATHER_VENUE'
          ? `ATTENTION HACKERS: QUICK VENUE UPDATE 🚨📍`
          : category === 'SPEAKER_WORKSHOP'
          ? `LEARN FROM THE BEST IN THE INDUSTRY 🎙️🚀`
          : `BIG UPDATE YOU CANNOT MISS! ⚡🚀`;

        title = `Instagram Caption: ${rawTopic}`;
        content = `${hook}

${rawTopic}! 

The energy at #${hashEvent} is unmatched right now! Here is everything you need to know:

📍 Where: ${effectiveVenue}
📅 When: ${eventDate} (${effectiveTime})
👥 Who: All ${audience.toLowerCase()}

${userNotes ? `💡 ${userNotes}\n\n` : ''}Tag your team members in the comments below so no one misses out on this! 👇 Let's see that hustle!

🔗 Tap the link in our bio for live schedule, bracket rankings, and live streams.

.
.
#${hashEvent} #${hashClub} #CollegeFest #HackathonIndia #StudentInnovators #CampusLife #TechFestival #ClubOpsAI #CodeSprint #InnovationInAction #BuildTheFuture`;
        break;
      }

      case 'NOTICE': {
        const refNo = `REF/${clubName.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
        title = `CIRCULAR: ${rawTopic.toUpperCase()} — ${eventName}`;
        content = `================================================================================
OFFICIAL CIRCULAR / NOTICE
DEPARTMENT OF STUDENT AFFAIRS & CAMPUS ACTIVITIES
${clubName.toUpperCase()} — ${eventName.toUpperCase()}
================================================================================
Ref No: ${refNo}                                             Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

SUBJECT: ${rawTopic.toUpperCase()}

This is to notify all concerned (${audience}) that in connection with ${eventName}, the organizing committee has issued the following directives regarding "${rawTopic}":

1. VENUE & TIME SCHEDULE:
   - Primary Location: ${effectiveVenue}
   - Applicable Schedule: ${effectiveTime}
   - Effective Date: ${eventDate}

2. MANDATORY PROTOCOL:
   - All participants and student organizers must display their validated event accreditation cards/passes.
   - Entry to restricted operational areas and labs is strictly monitored.
   - Teams must complete their check-ins or submissions strictly within the specified timelines.

${userNotes ? `3. SPECIAL ADMINISTRATIVE DIRECTIVES:\n   - ${userNotes}\n` : ''}
4. ENQUIRIES:
   In case of any discrepancies or special permissions, contact the Student Coordinator Desk at ${effectiveVenue}.

By Order,
Executive Organizing Committee, ${eventName}
Approved by Faculty In-Charge, ${clubName}`;
        break;
      }
    }

    return {
      channel: data.channel,
      title,
      content,
      targetAudience: audience,
    };
  }

  async queryClubBrain(clubId: string, query: string) {
    const documents = await prisma.document.findMany({ where: { clubId }, include: { chunks: true } });
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('budget') || lowerQuery.includes('cost') || lowerQuery.includes('money')) {
      const budgetDocs = documents.filter(d => d.title.toLowerCase().includes('budget') || d.title.toLowerCase().includes('financial') || d.title.toLowerCase().includes('audit') || d.category === 'REPORT');
      return {
        answer: budgetDocs.length > 0
          ? `Based on club documents, here are the financial insights:\n\n${budgetDocs.map(d => `📄 **${d.title}**: ${d.summary || d.chunks[0]?.content || 'No summary available'}`).join('\n\n')}`
          : `No budget documents found. Upload financial reports to Club Brain for AI-powered analysis.`,
        sources: budgetDocs.map(d => ({ title: d.title, page: 1, excerpt: d.summary || '' })),
      };
    }

    const relevant = documents.filter(d =>
      d.title.toLowerCase().includes(lowerQuery) ||
      d.summary?.toLowerCase().includes(lowerQuery) ||
      d.chunks.some(c => c.content.toLowerCase().includes(lowerQuery))
    );

    if (relevant.length > 0) {
      return {
        answer: `Found ${relevant.length} relevant document(s) for "${query}":\n\n` +
          relevant.slice(0, 3).map(d => `📄 **${d.title}**\n${d.summary || d.chunks[0]?.content || ''}`).join('\n\n'),
        sources: relevant.slice(0, 3).map(d => ({ title: d.title, page: 1, excerpt: d.summary || '' })),
      };
    }

    return {
      answer: `No documents found matching "${query}". Upload relevant documents (PDFs, DOCs) to Club Brain to enable AI-powered document search.`,
      sources: [],
    };
  }
}

export const aiService = new AiService();
