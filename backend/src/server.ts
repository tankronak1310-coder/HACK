import express from 'express';
import http from 'http';
import cors from 'cors';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { realtimeHub } from './realtime/socket.js';
import { cache } from './cache/redisCache.js';
import { renderAdminDashboardHtml } from './views/adminDashboard.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import clubsRoutes from './modules/clubs/clubs.routes.js';
import eventsRoutes from './modules/events/events.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import volunteersRoutes from './modules/volunteers/volunteers.routes.js';
import meetingsRoutes from './modules/meetings/meetings.routes.js';
import risksRoutes from './modules/risks/risks.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import documentsRoutes from './modules/documents/documents.routes.js';
import announcementsRoutes from './modules/announcements/announcements.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
realtimeHub.initialize(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root Dashboard (Fixes "Cannot GET /" and renders full interactive Backend & DB Command Center)
app.get('/', async (_req, res) => {
  let dbStatus = 'disconnected';
  let stats: any = {};
  let eventRosters: any[] = [];
  try {
    const [tasks, volunteers, risks, events, clubs, users, meetings, documents, rosters] = await Promise.all([
      prisma.task.count(),
      prisma.volunteer.count(),
      prisma.risk.count(),
      prisma.event.count(),
      prisma.club.count(),
      prisma.user.count(),
      prisma.meeting.count(),
      prisma.document.count(),
      prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          club: { select: { id: true, name: true } },
          volunteers: {
            include: {
              team: { select: { id: true, name: true } },
            },
            orderBy: [{ rating: 'desc' }, { name: 'asc' }],
          },
        },
      }),
    ]);
    dbStatus = 'connected';
    stats = { tasks, volunteers, risks, events, clubs, users, meetings, documents };
    eventRosters = rosters;
  } catch {
    dbStatus = 'error';
  }

  const memoryUsage = process.memoryUsage();
  const html = renderAdminDashboardHtml(
    stats,
    dbStatus,
    Math.floor(process.uptime()),
    { rssMb: Math.round(memoryUsage.rss / 1024 / 1024) },
    eventRosters
  );

  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
});

// Dedicated Event-Volunteer Specification API Endpoint
app.get('/api/volunteers/specification', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        club: { select: { id: true, name: true } },
        volunteers: {
          include: {
            team: { select: { id: true, name: true } },
          },
          orderBy: [{ rating: 'desc' }, { name: 'asc' }],
        },
      },
    });

    const specification = events.map(e => ({
      eventId: e.id,
      eventName: e.name,
      eventType: e.type,
      eventStatus: e.status,
      club: { id: e.club.id, name: e.club.name },
      totalVolunteers: e.volunteers.length,
      volunteers: e.volunteers.map(v => {
        let parsedSkills: string[] = [];
        try {
          const s = JSON.parse(v.skills || '[]');
          parsedSkills = Array.isArray(s) ? s : [String(s)];
        } catch {
          parsedSkills = v.skills ? v.skills.split(',').map((s: string) => s.trim()) : [];
        }
        return {
          id: v.id,
          name: v.name,
          email: v.email,
          phone: v.phone || 'N/A',
          department: v.team?.name || 'General Operations',
          skills: parsedSkills,
          availability: v.availability,
          workload: v.currentWorkload,
          assignedHours: v.assignedHours,
          rating: v.rating,
        };
      }),
    }));

    return res.json({
      success: true,
      totalEvents: specification.length,
      specification,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Observability Endpoints
app.get('/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  const memoryUsage = process.memoryUsage();

  return res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    cache: cache.isRedisConnected() ? 'redis' : 'in-memory (fallback)',
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    version: '1.0.0',
    service: 'ClubOps AI Backend',
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).send('READY');
  } catch {
    return res.status(503).send('NOT_READY');
  }
});

// Mount API Routers
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/risks', risksRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/db', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ServerError]', err);
  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR',
  });
});

server.listen(env.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CLUBOPS AI API & WEBSOCKET SERVER ACTIVE`);
  console.log(`📍 Port: http://localhost:${env.PORT}`);
  console.log(`🩺 Health check: http://localhost:${env.PORT}/health`);
  console.log(`⚡ WebSockets: ws://localhost:${env.PORT}/ws`);
  console.log(`🗄️ Database Console: http://localhost:${env.PORT}`);
  console.log(`======================================================\n`);
});
