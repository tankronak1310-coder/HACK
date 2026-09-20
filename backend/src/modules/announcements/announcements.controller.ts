import { Request, Response } from 'express';
import { announcementsService } from './announcements.service.js';

export class AnnouncementsController {
  async getAnnouncements(req: Request, res: Response) {
    try {
      const eventId = req.query.eventId as string;
      if (!eventId) return res.status(400).json({ error: 'eventId is required' });

      const list = await announcementsService.getAnnouncements(eventId);
      return res.json(list);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async createAnnouncement(req: Request, res: Response) {
    try {
      const { eventId, title, channel, content, targetAudience } = req.body;
      if (!eventId || !title || !channel || !content) {
        return res.status(400).json({ error: 'eventId, title, channel, and content are required' });
      }

      const item = await announcementsService.createAnnouncement({
        eventId,
        title,
        channel,
        content,
        targetAudience,
      });

      return res.status(201).json(item);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, channel, content, targetAudience } = req.body;
      if (!id) return res.status(400).json({ error: 'Announcement ID is required' });

      const updated = await announcementsService.updateAnnouncement(id, {
        title,
        channel,
        content,
        targetAudience,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deleteAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Announcement ID is required' });

      const result = await announcementsService.deleteAnnouncement(id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const announcementsController = new AnnouncementsController();
