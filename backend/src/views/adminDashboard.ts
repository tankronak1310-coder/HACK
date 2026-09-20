export function renderAdminDashboardHtml(stats: any, dbStatus: string, uptime: number, memory: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>ClubOps AI — Backend Dashboard</title>
<style>
  body{font-family:'Segoe UI',sans-serif;background:#07090F;color:#E8EAF0;margin:0;padding:2rem;}
  h1{color:#818CF8;font-size:1.5rem;}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin:1.5rem 0;}
  .card{background:#0E1120;border:1px solid #1E2640;border-radius:12px;padding:1rem;text-align:center;}
  .card .val{font-size:2rem;font-weight:800;color:#6366F1;}
  .card .lbl{font-size:0.7rem;color:#4A5578;text-transform:uppercase;letter-spacing:.05em;margin-top:.25rem;}
  .status{display:inline-flex;align-items:center;gap:.5rem;padding:.3rem .8rem;border-radius:9999px;font-size:.75rem;font-weight:700;}
  .ok{background:rgba(16,185,129,.15);color:#6EE7B7;border:1px solid rgba(16,185,129,.3);}
  .err{background:rgba(244,63,94,.15);color:#FDA4AF;border:1px solid rgba(244,63,94,.3);}
</style>
</head>
<body>
<h1>🚀 ClubOps AI — Backend Command Center</h1>
<span class="status ${dbStatus === 'connected' ? 'ok' : 'err'}">
  DB: ${dbStatus} &nbsp;|&nbsp; Uptime: ${uptime}s &nbsp;|&nbsp; Memory: ${memory.rssMb}MB
</span>
<div class="grid">
  ${Object.entries(stats).map(([k, v]) => `<div class="card"><div class="val">${v}</div><div class="lbl">${k}</div></div>`).join('')}
</div>
<p style="color:#4A5578;font-size:.75rem;">API Base: <code style="color:#818CF8">/api/*</code> &nbsp;|&nbsp; WebSocket: <code style="color:#06B6D4">ws://localhost:5000/ws</code></p>
</body>
</html>`;
}
