import nodemailer from 'nodemailer';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { realtimeHub } from '../../realtime/socket.js';

export class AnnouncementsService {
  async getAnnouncements(eventId: string) {
    return await prisma.announcement.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getEmailTransporter() {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      return null;
    }

    const isGmail = env.SMTP_HOST.toLowerCase().includes('gmail') || env.SMTP_USER.toLowerCase().includes('gmail.com');
    return isGmail
      ? nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        })
      : nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
  }

  async createAnnouncement(data: {
    eventId: string;
    title: string;
    channel: string;
    content: string;
    targetAudience?: string;
  }) {
    // 1. Store announcement in database
    const announcement = await prisma.announcement.create({
      data: {
        eventId: data.eventId,
        title: data.title,
        channel: data.channel,
        content: data.content,
        targetAudience: data.targetAudience || 'ALL',
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // 2. Fetch event & club details
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        club: true,
      },
    });

    const eventName = event?.name || 'Club Event';
    const clubName = event?.club?.name || 'Club';

    // 3. Find recipients based on target audience
    let volunteerRecipients: { name: string; email: string; phone?: string | null }[] = [];

    const audience = (data.targetAudience || 'ALL').toUpperCase();

    // If target audience is VOLUNTEERS or ALL / ALL PARTICIPANTS, get event volunteers
    const volunteers = await prisma.volunteer.findMany({
      where: {
        OR: [
          { eventId: data.eventId },
          { clubId: event?.clubId, eventId: null },
        ],
      },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    volunteerRecipients = volunteers.filter(v => Boolean(v.email));

    // Also get club members/users if audience is ALL or GENERAL
    if (audience.includes('ALL') || audience.includes('PARTICIPANTS') || audience.includes('CAMPUS')) {
      const clubMembers = await prisma.clubMember.findMany({
        where: { clubId: event?.clubId },
        include: { user: { select: { name: true, email: true, mobile: true } } },
      });
      for (const m of clubMembers) {
        if (m.user?.email && !volunteerRecipients.some(v => v.email.toLowerCase() === m.user.email.toLowerCase())) {
          volunteerRecipients.push({
            name: m.user.name,
            email: m.user.email,
            phone: m.user.mobile,
          });
        }
      }
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    let whatsappSent = 0;
    let whatsappFailed = 0;
    const errors: string[] = [];

    // 4a. Send real emails only if channel is EMAIL
    if (data.channel === 'EMAIL') {
      const transporter = this.getEmailTransporter();

      if (transporter && volunteerRecipients.length > 0) {
        const formattedHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; background: #0b0f19; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px;">${clubName} &bull; ${eventName}</span>
              <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 8px 0 4px 0;">${data.title}</h2>
              <span style="font-size: 12px; color: #94a3b8;">Official Volunteer Broadcast</span>
            </div>

            <div style="background: #131b2e; border: 1px solid #28354f; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <div style="font-size: 14px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap;">${data.content}</div>
            </div>

            <div style="border-top: 1px solid #1e293b; padding-top: 14px; font-size: 11px; color: #64748b; text-align: center;">
              Dispatched via <strong>ClubOps AI</strong> for <strong>${eventName}</strong> &bull; Please do not reply directly to this automated email.
            </div>
          </div>
        `;

        for (const recipient of volunteerRecipients) {
          try {
            await transporter.sendMail({
              from: env.SMTP_FROM,
              to: recipient.email,
              subject: `[${eventName}] ${data.title}`,
              text: `${data.title}\n\n${data.content}\n\n--\n${clubName} - ${eventName}\nPowered by ClubOps AI`,
              html: formattedHtml,
            });
            emailsSent++;
          } catch (err: any) {
            emailsFailed++;
            errors.push(`${recipient.email}: ${err.message}`);
          }
        }
      }
    }

    // 4b. Send WhatsApp messages if channel is WHATSAPP — use the live WhatsApp service
    if (data.channel === 'WHATSAPP') {
      const phoneNumbers = volunteerRecipients
        .filter(v => Boolean(v.phone))
        .map(v => (v.phone as string).replace(/[^0-9]/g, ''))
        .filter(p => p.length >= 10);

      if (phoneNumbers.length > 0) {
        try {
          // Dynamically import whatsapp service to avoid circular deps
          const { whatsappService } = await import('../whatsapp/whatsapp.service.js');
          const waStatus = whatsappService.getStatus();

          if (waStatus.status === 'CONNECTED') {
            const fullText = `*${data.title}*\n\n${data.content}`;
            const result = await whatsappService.sendBroadcast(phoneNumbers, fullText);
            whatsappSent = result.sentCount || 0;
            whatsappFailed = result.failedCount || 0;
          }
          // If not connected, skip — frontend will handle via the QR modal
        } catch (err: any) {
          errors.push(`WhatsApp broadcast error: ${err.message}`);
        }
      }
    }

    // 5. Generate WhatsApp links (always useful as fallback)
    const encodedText = encodeURIComponent(`*${data.title}*\n\n${data.content}`);
    const whatsappBroadcastUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    const phoneRecipients = volunteerRecipients
      .filter(v => Boolean(v.phone))
      .map(v => {
        const cleanPhone = (v.phone || '').replace(/[^0-9]/g, '');
        return {
          name: v.name,
          phone: v.phone,
          whatsappUrl: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`,
        };
      });

    // 6. Broadcast in real time via WebSocket
    realtimeHub.broadcastToEvent(data.eventId, {
      type: 'ANNOUNCEMENT_BROADCAST',
      payload: {
        ...announcement,
        emailsSent,
        recipientCount: volunteerRecipients.length,
        whatsappBroadcastUrl,
      },
    });

    return {
      ...announcement,
      whatsappBroadcastUrl,
      phoneRecipients,
      deliverySummary: {
        totalRecipients: volunteerRecipients.length,
        emailsSent,
        emailsFailed,
        whatsappSent,
        whatsappFailed,
        errors: errors.slice(0, 3),
        whatsappBroadcastUrl,
        phoneRecipientsCount: phoneRecipients.length,
      },
    };
  }

  async updateAnnouncement(id: string, data: {
    title?: string;
    content?: string;
    channel?: string;
    targetAudience?: string;
  }) {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`);
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.channel !== undefined && { channel: data.channel }),
        ...(data.targetAudience !== undefined && { targetAudience: data.targetAudience }),
      },
    });

    realtimeHub.broadcastToEvent(updated.eventId, {
      type: 'ANNOUNCEMENT_UPDATED',
      payload: updated,
    });

    return updated;
  }

  async deleteAnnouncement(id: string) {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`);
    }

    await prisma.announcement.delete({ where: { id } });

    realtimeHub.broadcastToEvent(existing.eventId, {
      type: 'ANNOUNCEMENT_DELETED',
      payload: { id, eventId: existing.eventId },
    });

    return { success: true, id };
  }
}

export const announcementsService = new AnnouncementsService();
