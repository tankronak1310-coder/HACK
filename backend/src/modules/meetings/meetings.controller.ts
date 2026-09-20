import { Request, Response } from 'express';
import { meetingsService } from './meetings.service.js';

export class MeetingsController {
  async processMeeting(req: Request, res: Response) {
    try {
      const { eventId, title, transcript, location } = req.body;
      if (!eventId || !title || !transcript) {
        return res.status(400).json({ error: 'eventId, title, and transcript are required.' });
      }

      const meeting = await meetingsService.processMeeting(eventId, {
        title,
        transcript,
        location,
      });

      return res.status(201).json(meeting);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async getMeeting(req: Request, res: Response) {
    try {
      const meeting = await meetingsService.getMeetingById(req.params.id);
      return res.json(meeting);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  async getEventMeetings(req: Request, res: Response) {
    try {
      const eventId = req.query.eventId as string;
      if (!eventId) return res.status(400).json({ error: 'eventId is required' });

      const meetings = await meetingsService.getEventMeetings(eventId);
      return res.json(meetings);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async convertItem(req: Request, res: Response) {
    try {
      const { actionItemId, eventId } = req.body;
      const task = await meetingsService.convertItemToTask(actionItemId, eventId);
      return res.status(201).json(task);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async convertAll(req: Request, res: Response) {
    try {
      const meetingId = req.params.id;
      const result = await meetingsService.convertAllItemsToTasks(meetingId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async updateMeeting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await meetingsService.updateMeeting(id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deleteMeeting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await meetingsService.deleteMeeting(id);
      return res.json({ success: true, message: 'Meeting deleted successfully.', deletedId: id });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const meetingsController = new MeetingsController();
