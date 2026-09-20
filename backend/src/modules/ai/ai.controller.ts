import { Request, Response } from 'express';
import { aiService } from './ai.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class AiController {
  async copilot(req: AuthRequest, res: Response) {
    try {
      const { eventId, query } = req.body;
      if (!query) return res.status(400).json({ error: 'query is required' });

      const userId = req.user?.id || 'anonymous';
      const result = await aiService.handleCopilotQuery(eventId, query, userId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async executeAction(req: AuthRequest, res: Response) {
    try {
      const { action } = req.body;
      if (!action || !action.type) return res.status(400).json({ error: 'Valid action payload is required' });

      const userId = req.user?.id || 'anonymous';
      const result = await aiService.executeApprovedAction(action, userId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async whatIf(req: Request, res: Response) {
    try {
      const { eventId, scenario, delayDays, shortagePercentage } = req.body;
      if (!eventId || !scenario) return res.status(400).json({ error: 'eventId and scenario are required' });

      const result = await aiService.runWhatIfSimulation(eventId, {
        type: scenario,
        delayDays: Number(delayDays) || 3,
        shortagePercentage: Number(shortagePercentage) || 30,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async announcement(req: Request, res: Response) {
    try {
      const { eventId, channel, topic, targetAudience, tone, additionalNotes } = req.body;
      if (!eventId || !channel || !topic) {
        return res.status(400).json({ error: 'eventId, channel, and topic are required' });
      }

      const result = await aiService.generateAnnouncements({
        eventId,
        channel,
        topic,
        targetAudience: targetAudience || 'ALL',
        tone,
        additionalNotes,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async queryBrain(req: Request, res: Response) {
    try {
      const { clubId, query } = req.body;
      if (!clubId || !query) return res.status(400).json({ error: 'clubId and query are required' });

      const result = await aiService.queryClubBrain(clubId, query);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const aiController = new AiController();
