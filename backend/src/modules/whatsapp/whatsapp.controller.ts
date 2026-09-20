import { Request, Response } from 'express';
import { whatsappService } from './whatsapp.service.js';
import { prisma } from '../../db/prisma.js';

export class WhatsAppController {
  async getStatus(_req: Request, res: Response) {
    try {
      const status = whatsappService.getStatus();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async connect(_req: Request, res: Response) {
    try {
      const status = await whatsappService.initialize();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async disconnect(_req: Request, res: Response) {
    try {
      const result = await whatsappService.disconnect();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async sendDirect(req: Request, res: Response) {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'phone and message are required' });
      }

      const result = await whatsappService.sendDirectMessage(phone, message);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async sendBroadcast(req: Request, res: Response) {
    try {
      const { eventId, targetAudience, phoneNumbers, message, title } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }

      let recipients: string[] = [];

      if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
        recipients = phoneNumbers;
      } else if (eventId) {
        // Find volunteers and club members with phone numbers
        const volunteers = await prisma.volunteer.findMany({
          where: { eventId, phone: { not: null } },
          select: { phone: true },
        });

        recipients = volunteers.map((v) => v.phone as string).filter(Boolean);

        // Also check club members
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event?.clubId) {
          const members = await prisma.clubMember.findMany({
            where: { clubId: event.clubId },
            include: { user: { select: { mobile: true } } },
          });
          for (const m of members) {
            if (m.user?.mobile && !recipients.includes(m.user.mobile)) {
              recipients.push(m.user.mobile);
            }
          }
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'No valid phone numbers found for broadcast. Please provide phoneNumbers or ensure volunteers have phone numbers registered.',
        });
      }

      const fullText = title ? `*${title}*\n\n${message}` : message;
      const result = await whatsappService.sendBroadcast(recipients, fullText);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const whatsappController = new WhatsAppController();
