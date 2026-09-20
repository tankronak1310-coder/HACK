import { Request, Response } from 'express';
import { eventsService } from './events.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class EventsController {
  async createEvent(req: AuthRequest, res: Response) {
    try {
      const { clubId, name, type, date, endDate, expectedParticipants, location, budget, description } = req.body;
      if (!clubId || !name || !type || !date || !location) {
        return res.status(400).json({ error: 'clubId, name, type, date, and location are required.' });
      }

      const event = await eventsService.createEvent({
        clubId,
        name,
        type,
        date,
        endDate,
        expectedParticipants: Number(expectedParticipants) || 500,
        location,
        budget: Number(budget) || 0,
        description,
      });

      return res.status(201).json(event);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async getEvent(req: Request, res: Response) {
    try {
      const event = await eventsService.getEventById(req.params.id);
      return res.json(event);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  async getClubEvents(req: Request, res: Response) {
    try {
      const clubId = req.query.clubId as string;
      if (!clubId) return res.status(400).json({ error: 'clubId is required' });

      const events = await eventsService.getClubEvents(clubId);
      return res.json(events);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async updateEvent(req: Request, res: Response) {
    try {
      const event = await eventsService.updateEvent(req.params.id, req.body);
      return res.json(event);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async getHealth(req: Request, res: Response) {
    try {
      const health = await eventsService.calculateHealthScore(req.params.id);
      return res.json(health);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await eventsService.deleteEvent(id);
      return res.json({ success: true, message: 'Event deleted successfully.', deletedId: id });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const eventsController = new EventsController();
