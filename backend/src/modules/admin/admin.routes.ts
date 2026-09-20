import { Router, Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';

const router = Router();

// Get database summary counts
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      userCount,
      clubCount,
      eventCount,
      taskCount,
      volunteerCount,
      riskCount,
      meetingCount,
      documentCount,
      announcementCount,
      aiActionCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.club.count(),
      prisma.event.count(),
      prisma.task.count(),
      prisma.volunteer.count(),
      prisma.risk.count(),
      prisma.meeting.count(),
      prisma.document.count(),
      prisma.announcement.count(),
      prisma.aiAction.count(),
    ]);

    return res.json({
      users: userCount,
      clubs: clubCount,
      events: eventCount,
      tasks: taskCount,
      volunteers: volunteerCount,
      risks: riskCount,
      meetings: meetingCount,
      documents: documentCount,
      announcements: announcementCount,
      aiActions: aiActionCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Generic Table Viewer
router.get('/table/:tableName', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const take = parseInt(req.query.take as string) || 50;

  try {
    let data: any[] = [];
    switch (tableName.toLowerCase()) {
      case 'users':
        data = await prisma.user.findMany({ take, orderBy: { createdAt: 'desc' } });
        break;
      case 'clubs':
        data = await prisma.club.findMany({ take, include: { teams: true }, orderBy: { createdAt: 'desc' } });
        break;
      case 'events':
        data = await prisma.event.findMany({ take, include: { club: true }, orderBy: { createdAt: 'desc' } });
        break;
      case 'tasks':
        data = await prisma.task.findMany({ take, include: { team: true, assignee: true }, orderBy: { deadline: 'asc' } });
        break;
      case 'volunteers':
        data = await prisma.volunteer.findMany({ take, include: { team: true, event: { select: { id: true, name: true } }, club: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
        break;
      case 'risks':
        data = await prisma.risk.findMany({ take, orderBy: { severity: 'desc' } });
        break;
      case 'meetings':
        data = await prisma.meeting.findMany({ take, include: { actionItems: true }, orderBy: { date: 'desc' } });
        break;
      case 'documents':
        data = await prisma.document.findMany({ take, orderBy: { createdAt: 'desc' } });
        break;
      case 'announcements':
        data = await prisma.announcement.findMany({ take, orderBy: { createdAt: 'desc' } });
        break;
      default:
        return res.status(400).json({ error: `Unknown table name: ${tableName}` });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Quick record creator for database editing
router.post('/create/:tableName', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const payload = req.body;

  try {
    let result: any;
    const defaultEvent = await prisma.event.findFirst();
    const defaultClub = await prisma.club.findFirst();

    switch (tableName.toLowerCase()) {
      case 'tasks': {
        result = await prisma.task.create({
          data: {
            eventId: payload.eventId || defaultEvent?.id || '',
            title: payload.title || 'Untitled Deliverable',
            description: payload.description || '',
            priority: payload.priority || 'MEDIUM',
            status: payload.status || 'TODO',
            deadline: payload.deadline ? new Date(payload.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            estimatedHours: Number(payload.estimatedHours) || 4,
            riskLevel: payload.riskLevel || 'LOW',
            tags: payload.tags ? JSON.stringify(payload.tags) : null,
          },
        });
        break;
      }
      case 'volunteers': {
        result = await prisma.volunteer.create({
          data: {
            clubId: payload.clubId || defaultClub?.id || '',
            name: payload.name,
            email: payload.email,
            phone: payload.phone || null,
            skills: payload.skills ? (typeof payload.skills === 'string' ? payload.skills : JSON.stringify(payload.skills)) : JSON.stringify(['General Support']),
            availability: payload.availability || 'AVAILABLE',
            currentWorkload: payload.currentWorkload || 'LOW',
            rating: Number(payload.rating) || 4.5,
          },
        });
        break;
      }
      case 'risks': {
        result = await prisma.risk.create({
          data: {
            eventId: payload.eventId || defaultEvent?.id || '',
            title: payload.title,
            description: payload.description || '',
            category: payload.category || 'TECHNICAL',
            severity: payload.severity || 'MEDIUM',
            status: payload.status || 'IDENTIFIED',
            impactAnalysis: payload.impactAnalysis || '',
            mitigationPlan: payload.mitigationPlan || '',
          },
        });
        break;
      }
      case 'events': {
        result = await prisma.event.create({
          data: {
            clubId: payload.clubId || defaultClub?.id || '',
            name: payload.name || 'Untitled Event',
            type: payload.type || 'General',
            date: payload.date ? new Date(payload.date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            location: payload.location || 'Campus Center',
            budget: Number(payload.budget) || 0,
            status: payload.status || 'PLANNING',
            healthScore: Number(payload.healthScore) || 90,
            description: payload.description || '',
          },
        });
        break;
      }
      case 'meetings': {
        result = await prisma.meeting.create({
          data: {
            eventId: payload.eventId || defaultEvent?.id || '',
            title: payload.title || 'General Sync',
            location: payload.location || 'Discord / Main Hall',
            transcript: payload.transcript || 'Meeting discussion recorded.',
            summary: payload.summary || 'Summary notes.',
          },
        });
        break;
      }
      case 'documents': {
        result = await prisma.document.create({
          data: {
            clubId: payload.clubId || defaultClub?.id || '',
            eventId: payload.eventId || defaultEvent?.id || null,
            title: payload.title || 'Untitled Document',
            fileUrl: payload.fileUrl || '/uploads/doc.pdf',
            fileType: payload.fileType || 'PDF',
            fileSize: Number(payload.fileSize) || 40960,
            category: payload.category || 'GUIDELINE',
            summary: payload.summary || '',
          },
        });
        break;
      }
      default:
        return res.status(400).json({ error: `Direct creation not supported for ${tableName}` });
    }

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Edit record in database
router.patch('/update/:tableName/:id', async (req: Request, res: Response) => {
  const { tableName, id } = req.params;
  const updates = req.body;

  try {
    let result: any;
    switch (tableName.toLowerCase()) {
      case 'tasks':
        result = await prisma.task.update({ where: { id }, data: updates });
        break;
      case 'volunteers':
        result = await prisma.volunteer.update({ where: { id }, data: updates });
        break;
      case 'risks':
        result = await prisma.risk.update({ where: { id }, data: updates });
        break;
      case 'events':
        result = await prisma.event.update({ where: { id }, data: updates });
        break;
      case 'meetings':
        result = await prisma.meeting.update({ where: { id }, data: updates });
        break;
      case 'documents':
        result = await prisma.document.update({ where: { id }, data: updates });
        break;
      default:
        return res.status(400).json({ error: `Update not supported for ${tableName}` });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Delete record from database
router.delete('/delete/:tableName/:id', async (req: Request, res: Response) => {
  const { tableName, id } = req.params;

  try {
    switch (tableName.toLowerCase()) {
      case 'tasks':
        await prisma.task.delete({ where: { id } });
        break;
      case 'volunteers':
        await prisma.volunteer.delete({ where: { id } });
        break;
      case 'risks':
        await prisma.risk.delete({ where: { id } });
        break;
      case 'events':
        await prisma.$transaction(async (tx) => {
          await tx.document.deleteMany({ where: { eventId: id } });
          await tx.activityLog.deleteMany({ where: { eventId: id } });
          await tx.volunteer.deleteMany({ where: { eventId: id } });
          await tx.event.delete({ where: { id } });
        });
        break;
      case 'meetings':
        await prisma.meeting.delete({ where: { id } });
        break;
      case 'documents':
        await prisma.document.delete({ where: { id } });
        break;
      default:
        return res.status(400).json({ error: `Delete not supported for ${tableName}` });
    }

    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
