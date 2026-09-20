export function renderAdminDashboardHtml(stats: any, dbStatus: string, uptime: number, memory: any, eventRosters: any[] = []): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClubOps AI — Backend Command & Database Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: '#080B11',
            card: '#0D121D',
            subtle: '#0F1626',
            hover: '#141C2E',
            border: '#1E293B',
            primary: '#6366F1',
            cyan: '#06B6D4',
            emerald: '#10B981',
            rose: '#F43F5E',
          },
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #080B11; color: #F8FAFC; font-family: 'Plus Jakarta Sans', sans-serif; }
    .shadow-glow { box-shadow: 0 0 30px -5px rgba(99, 102, 241, 0.35); }
    .shadow-glow-cyan { box-shadow: 0 0 30px -5px rgba(6, 182, 212, 0.35); }
    .live-pulse {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse-green 2s infinite;
    }
    @keyframes pulse-green {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Top Alert & Navigation Bar -->
    <div class="p-6 rounded-3xl bg-gradient-to-r from-primary-950/40 via-card to-subtle border border-border shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div className="flex items-center space-x-2">
          <span class="live-pulse mr-2"></span>
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-cyan">SYSTEM ONLINE • PORT 5000</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary font-mono ml-2">BACKEND API ACTIVE</span>
        </div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>CLUBOPS AI</span>
          <span class="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-mono">v1.0.0</span>
        </h1>
        <p class="text-xs text-slate-400">Backend API, WebSocket Hub & Database Administration Console</p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex flex-wrap items-center gap-3">
        <a href="http://localhost:3000" target="_blank" class="px-5 py-2.5 rounded-xl bg-primary hover:bg-indigo-600 text-white text-xs font-bold shadow-glow transition-all flex items-center gap-2">
          <span>🚀 Open Frontend Application</span>
          <span class="text-[10px] text-indigo-200">(Port 3000)</span>
        </a>
        <a href="http://localhost:5555" target="_blank" class="px-4 py-2.5 rounded-xl bg-subtle hover:bg-hover border border-border hover:border-cyan text-cyan text-xs font-semibold transition-all flex items-center gap-2">
          <span>🗄️ Prisma Studio GUI</span>
          <span class="text-[10px] text-slate-400">(Port 5555)</span>
        </a>
        <a href="/health" target="_blank" class="px-3 py-2.5 rounded-xl bg-subtle hover:bg-hover border border-border text-slate-300 text-xs font-mono">
          /health
        </a>
      </div>
    </div>

    <!-- System Health & Live Counters Matrix -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      <div class="p-4 rounded-2xl bg-card border border-border">
        <div class="text-[10px] font-mono text-slate-400 uppercase">Database Status</div>
        <div class="text-lg font-black text-emerald mt-1 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald"></span>
          <span>${dbStatus.toUpperCase()}</span>
        </div>
        <div class="text-[10px] text-slate-500 font-mono mt-0.5">SQLite dev.db</div>
      </div>

      <div class="p-4 rounded-2xl bg-card border border-border">
        <div class="text-[10px] font-mono text-slate-400 uppercase">WebSocket Hub</div>
        <div class="text-lg font-black text-cyan mt-1">/ws</div>
        <div class="text-[10px] text-slate-500 font-mono mt-0.5">Real-time Pub/Sub</div>
      </div>

      <div class="p-4 rounded-2xl bg-card border border-border">
        <div class="text-[10px] font-mono text-slate-400 uppercase">Tasks in DB</div>
        <div id="stat-tasks" class="text-2xl font-black text-white mt-1">${stats.tasks || 52}</div>
        <div class="text-[10px] text-emerald font-mono mt-0.5">Critical & Milestone</div>
      </div>

      <div class="p-4 rounded-2xl bg-card border border-border">
        <div class="text-[10px] font-mono text-slate-400 uppercase">Volunteers</div>
        <div id="stat-volunteers" class="text-2xl font-black text-white mt-1">${stats.volunteers || 30}</div>
        <div class="text-[10px] text-primary font-mono mt-0.5">Skills & Workload</div>
      </div>

      <div class="p-4 rounded-2xl bg-card border border-border">
        <div class="text-[10px] font-mono text-slate-400 uppercase">Active Risks</div>
        <div id="stat-risks" class="text-2xl font-black text-rose mt-1">${stats.risks || 10}</div>
        <div class="text-[10px] text-rose font-mono mt-0.5">Impact playbooks</div>
      </div>

      <div class="p-4 rounded-2xl bg-card border border-border">
        <div class="text-[10px] font-mono text-slate-400 uppercase">Memory / Uptime</div>
        <div class="text-lg font-black text-slate-200 mt-1">${memory.rssMb || 85} MB</div>
        <div class="text-[10px] text-slate-500 font-mono mt-0.5">${uptime}s uptime</div>
      </div>
    </div>

    <!-- Event-to-Volunteer Specification & Roster Matrix Section -->
    <div class="p-6 rounded-3xl bg-card border border-border space-y-5 shadow-2xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div class="flex items-center gap-2">
            <span class="live-pulse"></span>
            <span class="text-[10px] font-mono font-bold text-cyan uppercase tracking-wider">EVENT SPECIFICATION</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald/20 text-emerald font-mono">DATABASE ISOLATION ACTIVE</span>
          </div>
          <h2 class="text-lg font-bold text-white mt-1">Event-to-Volunteer Specification Matrix</h2>
          <p class="text-xs text-slate-400">Live database breakdown showing exact volunteer distribution scoped per event.</p>
        </div>

        <div class="flex items-center gap-2">
          <a href="/api/volunteers/specification" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-subtle hover:bg-hover border border-border text-cyan text-xs font-mono transition-all flex items-center gap-1.5">
            <span>JSON API: /api/volunteers/specification</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <!-- Events Roster Cards Grid -->
      <div class="space-y-4">
        ${renderEventRostersHtml(eventRosters)}
      </div>
    </div>

    <!-- Interactive Database Editor & Creator Section -->
    <div class="p-6 rounded-3xl bg-card border border-border space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span class="text-[10px] font-mono font-bold text-cyan uppercase tracking-wider">DATABASE MANAGEMENT</span>
          <h2 class="text-lg font-bold text-white mt-0.5">Live Database Explorer & Creator</h2>
          <p class="text-xs text-slate-400">Directly view, create, edit, and delete records across all models</p>
        </div>

        <!-- Table Selector Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto">
          <button onclick="switchTable('tasks')" id="tab-tasks" class="table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white transition-all">
            Tasks (<span id="count-tasks">${stats.tasks || 52}</span>)
          </button>
          <button onclick="switchTable('volunteers')" id="tab-volunteers" class="table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-subtle text-slate-400 hover:text-white border border-border transition-all">
            Volunteers (<span id="count-volunteers">${stats.volunteers || 30}</span>)
          </button>
          <button onclick="switchTable('risks')" id="tab-risks" class="table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-subtle text-slate-400 hover:text-white border border-border transition-all">
            Risks (<span id="count-risks">${stats.risks || 10}</span>)
          </button>
          <button onclick="switchTable('events')" id="tab-events" class="table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-subtle text-slate-400 hover:text-white border border-border transition-all">
            Events (${stats.events || 1})
          </button>
          <button onclick="switchTable('meetings')" id="tab-meetings" class="table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-subtle text-slate-400 hover:text-white border border-border transition-all">
            Meetings (${stats.meetings || 5})
          </button>
          <button onclick="switchTable('documents')" id="tab-documents" class="table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-subtle text-slate-400 hover:text-white border border-border transition-all">
            Documents (${stats.documents || 10})
          </button>
        </div>
      </div>

      <!-- Quick Creator Form Accordion -->
      <div class="p-4 rounded-2xl bg-subtle border border-border space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white flex items-center gap-1.5">
            <span class="text-emerald font-bold">+</span>
            <span id="create-form-title">Create New Task Directly in Database</span>
          </span>
          <span class="text-[10px] text-slate-500 font-mono">Instantly syncs with frontend</span>
        </div>

        <!-- Task Form -->
        <div id="form-tasks" class="create-form grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" id="task-title" placeholder="Deliverable Title (e.g. Stage LED Calibration)" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white sm:col-span-2 focus:outline-none focus:border-primary" />
          <select id="task-priority" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary">
            <option value="CRITICAL">Priority: CRITICAL</option>
            <option value="HIGH">Priority: HIGH</option>
            <option value="MEDIUM" selected>Priority: MEDIUM</option>
            <option value="LOW">Priority: LOW</option>
          </select>
          <button onclick="createTaskRecord()" class="px-4 py-2 bg-emerald hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
            + Insert Task
          </button>
        </div>

        <!-- Volunteer Form (hidden initially) -->
        <div id="form-volunteers" class="create-form hidden grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" id="vol-name" placeholder="Volunteer Full Name" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary" />
          <input type="email" id="vol-email" placeholder="Email Address" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary" />
          <input type="text" id="vol-skills" placeholder="Skills (e.g. Stage AV, Logistics)" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary" />
          <button onclick="createVolunteerRecord()" class="px-4 py-2 bg-emerald hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
            + Insert Volunteer
          </button>
        </div>

        <!-- Risk Form (hidden initially) -->
        <div id="form-risks" class="create-form hidden grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" id="risk-title" placeholder="Risk Title (e.g. Weather Thunderstorm)" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white sm:col-span-2 focus:outline-none focus:border-primary" />
          <select id="risk-severity" class="bg-card border border-border px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary">
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH" selected>HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <button onclick="createRiskRecord()" class="px-4 py-2 bg-emerald hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
            + Insert Risk
          </button>
        </div>
      </div>

      <!-- Live Records Table -->
      <div class="rounded-2xl border border-border overflow-hidden">
        <div class="overflow-x-auto max-h-96">
          <table class="w-full text-left text-xs text-slate-300">
            <thead id="table-head" class="bg-subtle border-b border-border text-[11px] font-bold uppercase text-slate-400 sticky top-0">
              <!-- Dynamically populated -->
            </thead>
            <tbody id="table-body" class="divide-y divide-border bg-card">
              <tr><td class="p-6 text-center text-slate-500" colspan="5">Loading records from database...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- API Reference Cards -->
    <div class="p-6 rounded-3xl bg-card border border-border space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <span class="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">REST API ROUTES</span>
          <h3 class="text-sm font-bold text-white mt-0.5">Active Endpoints & Gateways</h3>
        </div>
        <span class="text-xs text-slate-400 font-mono">12 Route Modules Mounted</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-emerald font-bold">POST</span>
          <span class="text-slate-200">/api/auth/register</span>
          <span class="text-[10px] text-slate-500">OTP Auth</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-emerald font-bold">POST</span>
          <span class="text-slate-200">/api/auth/login</span>
          <span class="text-[10px] text-slate-500">JWT Token</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-cyan font-bold">GET</span>
          <span class="text-slate-200">/api/events</span>
          <span class="text-[10px] text-slate-500">Event Ops</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-cyan font-bold">GET</span>
          <span class="text-slate-200">/api/tasks</span>
          <span class="text-[10px] text-slate-500">Roadmap</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-emerald font-bold">POST</span>
          <span class="text-slate-200">/api/ai/copilot</span>
          <span class="text-[10px] text-slate-500">Autonomous</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-emerald font-bold">POST</span>
          <span class="text-slate-200">/api/ai/what-if</span>
          <span class="text-[10px] text-slate-500">Simulator</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-emerald font-bold">POST</span>
          <span class="text-slate-200">/api/meetings/process</span>
          <span class="text-[10px] text-slate-500">NLP Extractions</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-cyan font-bold">GET</span>
          <span class="text-slate-200">/api/volunteers</span>
          <span class="text-[10px] text-slate-500">Smart Match</span>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-border flex items-center justify-between">
          <span class="text-cyan font-bold">GET</span>
          <span class="text-slate-200">/api/risks</span>
          <span class="text-[10px] text-slate-500">Radar Alert</span>
        </div>
      </div>
    </div>

  </div>

  <script>
    let currentTable = 'tasks';

    async function loadTableData(tableName) {
      currentTable = tableName;
      const head = document.getElementById('table-head');
      const body = document.getElementById('table-body');
      body.innerHTML = '<tr><td class="p-6 text-center text-slate-500" colspan="5">Loading records...</td></tr>';

      try {
        const res = await fetch('/api/admin/db/table/' + tableName);
        const data = await res.json();

        if (tableName === 'tasks') {
          head.innerHTML = '<tr><th class="p-3">Title</th><th class="p-3">Team</th><th class="p-3">Priority</th><th class="p-3">Status</th><th class="p-3">Actions</th></tr>';
          body.innerHTML = data.map(t => \`
            <tr class="hover:bg-hover/50 transition-colors">
              <td class="p-3 font-semibold text-white max-w-xs truncate">\${t.title}</td>
              <td class="p-3 text-slate-400">\${t.team?.name || 'General'}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono \${t.priority === 'CRITICAL' ? 'bg-rose/20 text-rose' : 'bg-primary/20 text-primary'}">\${t.priority}</span>
              </td>
              <td class="p-3">
                <select onchange="updateRecordStatus('tasks', '\${t.id}', this.value)" class="bg-subtle border border-border px-2 py-1 rounded-lg text-xs text-slate-200">
                  <option value="TODO" \${t.status === 'TODO' ? 'selected' : ''}>TODO</option>
                  <option value="IN_PROGRESS" \${t.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                  <option value="BLOCKED" \${t.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
                  <option value="DONE" \${t.status === 'DONE' ? 'selected' : ''}>DONE</option>
                </select>
              </td>
              <td class="p-3">
                <button onclick="deleteRecord('tasks', '\${t.id}')" class="px-2 py-1 text-xs text-rose hover:bg-rose/10 rounded transition-colors">Delete</button>
              </td>
            </tr>
          \`).join('');
        } else if (tableName === 'volunteers') {
          head.innerHTML = '<tr><th class="p-3">Name</th><th class="p-3">Email</th><th class="p-3">Skills</th><th class="p-3">Workload</th><th class="p-3">Actions</th></tr>';
          body.innerHTML = data.map(v => \`
            <tr class="hover:bg-hover/50 transition-colors">
              <td class="p-3 font-semibold text-white">\${v.name}</td>
              <td class="p-3 text-slate-400">\${v.email}</td>
              <td class="p-3 text-slate-300 truncate max-w-xs">\${v.skills}</td>
              <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-primary/20 text-primary">\${v.currentWorkload}</span></td>
              <td class="p-3">
                <button onclick="deleteRecord('volunteers', '\${v.id}')" class="px-2 py-1 text-xs text-rose hover:bg-rose/10 rounded transition-colors">Delete</button>
              </td>
            </tr>
          \`).join('');
        } else if (tableName === 'risks') {
          head.innerHTML = '<tr><th class="p-3">Title</th><th class="p-3">Category</th><th class="p-3">Severity</th><th class="p-3">Status</th><th class="p-3">Actions</th></tr>';
          body.innerHTML = data.map(r => \`
            <tr class="hover:bg-hover/50 transition-colors">
              <td class="p-3 font-semibold text-white max-w-xs truncate">\${r.title}</td>
              <td class="p-3 text-slate-400">\${r.category}</td>
              <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono \${r.severity === 'CRITICAL' ? 'bg-rose/20 text-rose' : 'bg-primary/20 text-primary'}">\${r.severity}</span></td>
              <td class="p-3 text-slate-300">\${r.status}</td>
              <td class="p-3">
                <button onclick="deleteRecord('risks', '\${r.id}')" class="px-2 py-1 text-xs text-rose hover:bg-rose/10 rounded transition-colors">Delete</button>
              </td>
            </tr>
          \`).join('');
        } else if (tableName === 'events') {
          head.innerHTML = '<tr><th class="p-3">Event Name</th><th class="p-3">Club</th><th class="p-3">Type</th><th class="p-3">Status</th><th class="p-3">Health</th><th class="p-3">Actions</th></tr>';
          body.innerHTML = data.length === 0
            ? '<tr><td class="p-6 text-center text-slate-500 italic" colspan="6">No events found.</td></tr>'
            : data.map(e => \`
              <tr class="hover:bg-hover/50 transition-colors">
                <td class="p-3 font-semibold text-white max-w-[140px] truncate" title="\${e.id}">\${e.name}</td>
                <td class="p-3 text-slate-400 text-xs">\${e.club ? e.club.name : e.clubId}</td>
                <td class="p-3 text-slate-400 text-xs">\${e.type || '—'}</td>
                <td class="p-3">
                  <select onchange="updateRecordField('events','\${e.id}','status',this.value)" class="bg-subtle border border-border px-1.5 py-1 rounded-lg text-xs text-slate-200">
                    <option value="PLANNING" \${e.status==='PLANNING'?'selected':''}>PLANNING</option>
                    <option value="ACTIVE" \${e.status==='ACTIVE'?'selected':''}>ACTIVE</option>
                    <option value="WAR_ROOM" \${e.status==='WAR_ROOM'?'selected':''}>WAR_ROOM</option>
                    <option value="COMPLETED" \${e.status==='COMPLETED'?'selected':''}>COMPLETED</option>
                  </select>
                </td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono \${(e.healthScore||0)>=80?'bg-emerald/20 text-emerald':'bg-rose/20 text-rose'}">\${e.healthScore||0}%</span></td>
                <td class="p-3 space-x-1 whitespace-nowrap">
                  <button onclick="editRecord('events','\${e.id}','\${(e.name||'').replace(/'/g,String.fromCharCode(39))}','name')" class="px-2 py-1 text-xs text-cyan hover:bg-cyan/10 rounded">Rename</button>
                  <button onclick="deleteRecord('events','\${e.id}')" class="px-2 py-1 text-xs text-rose hover:bg-rose/10 rounded font-bold">⌫ Delete</button>
                </td>
              </tr>
            \`).join('');
        } else if (tableName === 'meetings') {
          head.innerHTML = '<tr><th class="p-3">Title</th><th class="p-3">Location</th><th class="p-3">Items</th><th class="p-3">Date</th><th class="p-3">Actions</th></tr>';
          body.innerHTML = data.length === 0
            ? '<tr><td class="p-6 text-center text-slate-500 italic" colspan="5">No meetings found.</td></tr>'
            : data.map(m => \`
              <tr class="hover:bg-hover/50 transition-colors">
                <td class="p-3 font-semibold text-white max-w-[160px] truncate">\${m.title}</td>
                <td class="p-3 text-slate-400 text-xs">\${m.location||'—'}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">\${(m.actionItems||[]).length} items</span></td>
                <td class="p-3 text-slate-400 text-xs">\${m.processedAt?new Date(m.processedAt).toLocaleDateString():'—'}</td>
                <td class="p-3 space-x-1 whitespace-nowrap">
                  <button onclick="editRecord('meetings','\${m.id}','\${(m.title||'').replace(/'/g,String.fromCharCode(39))}','title')" class="px-2 py-1 text-xs text-cyan hover:bg-cyan/10 rounded">Edit Title</button>
                  <button onclick="editRecord('meetings','\${m.id}','\${(m.location||'').replace(/'/g,String.fromCharCode(39))}','location')" class="px-2 py-1 text-xs text-cyan hover:bg-cyan/10 rounded">Edit Location</button>
                  <button onclick="deleteRecord('meetings','\${m.id}')" class="px-2 py-1 text-xs text-rose hover:bg-rose/10 rounded font-bold">⌫ Delete</button>
                </td>
              </tr>
            \`).join('');
        } else if (tableName === 'documents') {
          head.innerHTML = '<tr><th class="p-3">Title</th><th class="p-3">Type</th><th class="p-3">Category</th><th class="p-3">Event</th><th class="p-3">Actions</th></tr>';
          body.innerHTML = data.length === 0
            ? '<tr><td class="p-6 text-center text-slate-500 italic" colspan="5">No documents found.</td></tr>'
            : data.map(d => \`
              <tr class="hover:bg-hover/50 transition-colors">
                <td class="p-3 font-semibold text-white max-w-[160px] truncate">\${d.title}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] border border-border text-slate-300">\${d.fileType||'—'}</span></td>
                <td class="p-3">
                  <select onchange="updateRecordField('documents','\${d.id}','category',this.value)" class="bg-subtle border border-border px-1.5 py-1 rounded-lg text-xs text-slate-200">
                    <option value="BUDGET" \${d.category==='BUDGET'?'selected':''}>BUDGET</option>
                    <option value="GUIDELINE" \${d.category==='GUIDELINE'?'selected':''}>GUIDELINE</option>
                    <option value="REPORT" \${d.category==='REPORT'?'selected':''}>REPORT</option>
                    <option value="CONTRACT" \${d.category==='CONTRACT'?'selected':''}>CONTRACT</option>
                    <option value="MINUTES" \${d.category==='MINUTES'?'selected':''}>MINUTES</option>
                    <option value="SCHEDULE" \${d.category==='SCHEDULE'?'selected':''}>SCHEDULE</option>
                  </select>
                </td>
                <td class="p-3 text-slate-400 text-xs">\${d.event?d.event.name:'Club-level'}</td>
                <td class="p-3 space-x-1 whitespace-nowrap">
                  <button onclick="editRecord('documents','\${d.id}','\${(d.title||'').replace(/'/g,String.fromCharCode(39))}','title')" class="px-2 py-1 text-xs text-cyan hover:bg-cyan/10 rounded">Edit Title</button>
                  <button onclick="deleteRecord('documents','\${d.id}')" class="px-2 py-1 text-xs text-rose hover:bg-rose/10 rounded font-bold">⌫ Delete</button>
                </td>
              </tr>
            \`).join('');
        } else {
          head.innerHTML = '<tr><th class="p-3">ID</th><th class="p-3">Details</th><th class="p-3">Created</th></tr>';
          body.innerHTML = data.map(d => \`
            <tr class="hover:bg-hover/50 transition-colors">
              <td class="p-3 font-mono text-slate-500 text-[10px]">\${d.id}</td>
              <td class="p-3 text-white truncate max-w-sm">\${d.name || d.title || JSON.stringify(d)}</td>
              <td class="p-3 text-slate-400">\${new Date(d.createdAt || Date.now()).toLocaleDateString()}</td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        body.innerHTML = '<tr><td class="p-6 text-center text-rose" colspan="6">Error loading table data</td></tr>';
      }
    }

    function switchTable(name) {
      document.querySelectorAll('.table-tab').forEach(t => {
        t.className = 'table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-subtle text-slate-400 hover:text-white border border-border transition-all';
      });
      document.getElementById('tab-' + name).className = 'table-tab px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white transition-all shadow-glow';

      document.querySelectorAll('.create-form').forEach(f => f.classList.add('hidden'));
      const formEl = document.getElementById('form-' + name);
      if (formEl) {
        formEl.classList.remove('hidden');
        document.getElementById('create-form-title').innerText = 'Create New ' + name.slice(0, -1).toUpperCase() + ' in Database';
      }

      loadTableData(name);
    }

    async function createTaskRecord() {
      const title = document.getElementById('task-title').value.trim();
      const priority = document.getElementById('task-priority').value;
      if (!title) return alert('Please enter a deliverable title');

      const res = await fetch('/api/admin/db/create/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, status: 'TODO' })
      });
      if (res.ok) {
        document.getElementById('task-title').value = '';
        loadTableData('tasks');
        updateStats();
      }
    }

    async function createVolunteerRecord() {
      const name = document.getElementById('vol-name').value.trim();
      const email = document.getElementById('vol-email').value.trim();
      const skills = document.getElementById('vol-skills').value.trim();
      if (!name || !email) return alert('Name and email required');

      const res = await fetch('/api/admin/db/create/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, skills })
      });
      if (res.ok) {
        document.getElementById('vol-name').value = '';
        document.getElementById('vol-email').value = '';
        document.getElementById('vol-skills').value = '';
        loadTableData('volunteers');
        updateStats();
      }
    }

    async function createRiskRecord() {
      const title = document.getElementById('risk-title').value.trim();
      const severity = document.getElementById('risk-severity').value;
      if (!title) return alert('Title required');

      const res = await fetch('/api/admin/db/create/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, severity })
      });
      if (res.ok) {
        document.getElementById('risk-title').value = '';
        loadTableData('risks');
        updateStats();
      }
    }

    async function updateRecordStatus(table, id, status) {
      await fetch('/api/admin/db/update/' + table + '/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    }

    async function updateRecordField(table, id, field, value) {
      await fetch('/api/admin/db/update/' + table + '/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    }

    async function editRecord(table, id, currentVal, field) {
      const labels = { name: 'Name', title: 'Title', location: 'Location', summary: 'Summary / Notes' };
      const label = labels[field] || field;
      const newVal = prompt('Edit ' + label + ':', currentVal);
      if (newVal === null || newVal.trim() === '' || newVal.trim() === currentVal) return;
      const res = await fetch('/api/admin/db/update/' + table + '/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newVal.trim() })
      });
      if (res.ok) { loadTableData(table); }
      else { const err = await res.json().catch(() => ({})); alert('Update failed: ' + (err.error || 'Unknown error')); }
    }

    async function deleteRecord(table, id) {
      const labels = {
        tasks: 'this task',
        volunteers: 'this volunteer',
        risks: 'this risk',
        events: 'this event and ALL its data (tasks, risks, meetings, documents, volunteers)',
        meetings: 'this meeting and all its action items',
        documents: 'this document'
      };
      const label = labels[table] || 'this record';
      if (!confirm('Are you sure you want to delete ' + label + '?\\n\\nThis action cannot be undone.')) return;
      const res = await fetch('/api/admin/db/delete/' + table + '/' + id, { method: 'DELETE' });
      if (res.ok) {
        loadTableData(table);
        updateStats();
        if (table === 'events') setTimeout(() => location.reload(), 700);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Delete failed: ' + (err.error || 'Server error'));
      }
    }

    async function updateStats() {
      try {
        const res = await fetch('/api/admin/db/stats');
        const s = await res.json();
        document.getElementById('stat-tasks').innerText = s.tasks;
        document.getElementById('count-tasks').innerText = s.tasks;
        document.getElementById('stat-volunteers').innerText = s.volunteers;
        document.getElementById('count-volunteers').innerText = s.volunteers;
        document.getElementById('stat-risks').innerText = s.risks;
        document.getElementById('count-risks').innerText = s.risks;
      } catch (e) {}
    }

    // Initial load
    loadTableData('tasks');
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEventRostersHtml(eventRosters: any[]): string {
  if (!eventRosters || eventRosters.length === 0) {
    return `
      <div class="p-6 rounded-2xl bg-subtle border border-border text-center text-slate-400 text-xs">
        No events found in database.
      </div>
    `;
  }

  return eventRosters.map(event => {
    const vols = event.volunteers || [];
    const count = vols.length;
    const isZero = count === 0;

    let volunteerRows = '';
    if (isZero) {
      volunteerRows = `
        <tr>
          <td colspan="6" class="p-5 text-center text-slate-500 italic text-xs">
            No volunteers assigned to this event yet (0 registered) — clean database state ready for event-scoped registration.
          </td>
        </tr>
      `;
    } else {
      volunteerRows = vols.map((v: any) => {
        let skillsArray: string[] = [];
        try {
          const parsed = JSON.parse(v.skills || '[]');
          skillsArray = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          skillsArray = v.skills ? v.skills.split(',').map((s: string) => s.trim()) : [];
        }

        const skillBadges = skillsArray.map((s: string) => `
          <span class="inline-block px-2 py-0.5 rounded bg-primary/20 text-indigo-300 text-[10px] font-mono mr-1">
            ${escapeHtml(s)}
          </span>
        `).join('');

        return `
          <tr class="hover:bg-hover transition-colors">
            <td class="p-3 font-semibold text-white">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald"></span>
                <span>${escapeHtml(v.name)}</span>
              </div>
            </td>
            <td class="p-3 font-mono text-slate-300">${escapeHtml(v.email)}</td>
            <td class="p-3 font-mono text-slate-300">${escapeHtml(v.phone || '—')}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded bg-subtle text-slate-300 text-[10px] border border-border font-semibold">
                ${escapeHtml(v.team?.name || 'General Operations')}
              </span>
            </td>
            <td class="p-3">${skillBadges || '<span class="text-slate-500">—</span>'}</td>
            <td class="p-3 font-mono text-[11px] text-slate-400">
              <span class="text-emerald font-bold">${v.rating ? v.rating.toFixed(1) : '4.5'}★</span> • ${v.currentWorkload || 'LOW'}
            </td>
          </tr>
        `;
      }).join('');
    }

    return `
      <div class="p-5 rounded-2xl bg-subtle border ${isZero ? 'border-border' : 'border-primary/40'} space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              EVENT
            </span>
            <h3 class="text-base font-extrabold text-white tracking-tight">
              ${escapeHtml(event.name)}
            </h3>
            <span class="text-[10px] font-mono text-slate-400 bg-card px-2 py-0.5 rounded border border-border">
              Club: ${escapeHtml(event.club?.name || 'General')}
            </span>
            <span class="text-[10px] font-mono text-slate-500">
              ID: ${escapeHtml(event.id)}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full font-mono ${
              count > 0 ? 'bg-emerald/20 text-emerald border border-emerald/30' : 'bg-slate-800 text-slate-400 border border-border'
            }">
              ${count} ${count === 1 ? 'Volunteer' : 'Volunteers'}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-card text-slate-400 border border-border font-mono">
              ${escapeHtml(event.status || 'PLANNING')}
            </span>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-border/80 bg-card">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-hover/50 text-[10px] font-mono uppercase text-slate-400 border-b border-border">
              <tr>
                <th class="p-3">Volunteer Name</th>
                <th class="p-3">Email</th>
                <th class="p-3">Phone</th>
                <th class="p-3">Department / Team</th>
                <th class="p-3">Skills</th>
                <th class="p-3">Rating / Workload</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              ${volunteerRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}
