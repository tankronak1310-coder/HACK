import pkg from 'whatsapp-web.js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { realtimeHub } from '../../realtime/socket.js';

const { Client, LocalAuth } = pkg;

export interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  phoneNumber: string | null;
  platform: string;
}

export class WhatsAppService {
  private client: any = null;
  private status: 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private phoneNumber: string | null = null;
  private initializing: boolean = false;

  private findChromePath(): string | undefined {
    const commonPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of commonPaths) {
      if (p && fs.existsSync(p)) return p;
    }
    return undefined;
  }

  async initialize() {
    if (this.client || this.initializing) {
      return this.getStatus();
    }

    this.initializing = true;
    this.status = 'INITIALIZING';
    this.qrCodeDataUrl = null;

    try {
      const chromeExecutable = this.findChromePath();
      console.log('[WhatsAppService] Initializing client. Chrome Path:', chromeExecutable || 'Default Chromium');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: path.resolve(process.cwd(), '.wwebjs_auth'),
        }),
        puppeteer: {
          headless: true,
          executablePath: chromeExecutable,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      this.client.on('qr', async (qr: string) => {
        console.log('[WhatsAppService] QR Code received.');
        this.status = 'QR_READY';
        try {
          this.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          realtimeHub.broadcastAll({
            type: 'WHATSAPP_QR',
            payload: {
              qrCodeDataUrl: this.qrCodeDataUrl,
              status: this.status,
            },
          });
        } catch (err) {
          console.error('[WhatsAppService] Error converting QR to data URL:', err);
        }
      });

      this.client.on('ready', () => {
        this.status = 'CONNECTED';
        this.qrCodeDataUrl = null;
        this.phoneNumber = this.client.info?.wid?.user || null;
        console.log(`[WhatsAppService] WhatsApp Client READY! Connected as: ${this.phoneNumber}`);
        realtimeHub.broadcastAll({
          type: 'WHATSAPP_READY',
          payload: {
            status: this.status,
            phoneNumber: this.phoneNumber,
          },
        });
      });

      this.client.on('authenticated', () => {
        console.log('[WhatsAppService] Authenticated successfully.');
        this.status = 'INITIALIZING';
      });

      this.client.on('auth_failure', (msg: string) => {
        console.error('[WhatsAppService] Auth failure:', msg);
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.client = null;
        this.initializing = false;
      });

      this.client.on('disconnected', (reason: string) => {
        console.log('[WhatsAppService] Client disconnected:', reason);
        this.status = 'DISCONNECTED';
        this.qrCodeDataUrl = null;
        this.phoneNumber = null;
        this.client = null;
        this.initializing = false;
        realtimeHub.broadcastAll({
          type: 'WHATSAPP_DISCONNECTED',
          payload: { reason },
        });
      });

      await this.client.initialize();
      this.initializing = false;
    } catch (err) {
      console.error('[WhatsAppService] Failed to initialize:', err);
      this.status = 'DISCONNECTED';
      this.client = null;
      this.initializing = false;
    }

    return this.getStatus();
  }

  getStatus(): WhatsAppStatus {
    return {
      status: this.status,
      qrCodeDataUrl: this.qrCodeDataUrl,
      phoneNumber: this.phoneNumber,
      platform: 'WhatsApp Web Automation (Node.js)',
    };
  }

  async sendDirectMessage(rawPhone: string, message: string) {
    if (this.status !== 'CONNECTED' || !this.client) {
      throw new Error('WhatsApp service is not connected. Please scan the QR code to link your WhatsApp first.');
    }

    let clean = rawPhone.replace(/[^0-9]/g, '');
    // If standard 10 digit Indian number without country code, prepend 91
    if (clean.length === 10) {
      clean = '91' + clean;
    }

    const chatId = `${clean}@c.us`;
    console.log(`[WhatsAppService] Sending real background WhatsApp message to: ${chatId}`);

    const result = await this.client.sendMessage(chatId, message);
    return {
      success: true,
      messageId: result.id?._serialized,
      recipient: clean,
      timestamp: new Date().toISOString(),
    };
  }

  async sendBroadcast(recipients: string[], message: string) {
    const results: { phone: string; success: boolean; error?: string }[] = [];

    for (const phone of recipients) {
      try {
        await this.sendDirectMessage(phone, message);
        results.push({ phone, success: true });
        // Slight delay between sends to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (err: any) {
        results.push({ phone, success: false, error: err.message });
      }
    }

    const sentCount = results.filter((r) => r.success).length;
    return {
      total: recipients.length,
      sentCount,
      failedCount: recipients.length - sentCount,
      results,
    };
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.logout();
        await this.client.destroy();
      } catch (e) {
        console.warn('[WhatsAppService] Error during logout/destroy:', e);
      }
      this.client = null;
      this.status = 'DISCONNECTED';
      this.qrCodeDataUrl = null;
      this.phoneNumber = null;
      this.initializing = false;
    }
    return { success: true };
  }
}

export const whatsappService = new WhatsAppService();
