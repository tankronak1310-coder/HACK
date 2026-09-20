import { Request, Response } from 'express';
import { documentsService } from './documents.service.js';
import { geminiService } from '../ai/gemini.service.js';
import multer from 'multer';
import path from 'path';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, TXT, and image files are allowed'));
  },
});

export const uploadMiddleware = upload.single('file');

// Extract text from PDF buffer using raw string parsing (no external lib needed)
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const str = buffer.toString('latin1');
    const texts: string[] = [];

    // Match BT...ET blocks (text blocks in PDF)
    const btBlocks = str.match(/BT[\s\S]*?ET/g) || [];
    for (const block of btBlocks) {
      // Extract text from Tj, TJ, ' operators
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      for (const m of tjMatches) {
        const t = m.replace(/\(([^)]*)\)\s*Tj/, '$1').trim();
        if (t.length > 0) texts.push(t);
      }
      // TJ arrays
      const tjArrMatches = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
      for (const m of tjArrMatches) {
        const parts = m.match(/\(([^)]*)\)/g) || [];
        for (const p of parts) {
          const t = p.replace(/[()]/g, '').trim();
          if (t.length > 0) texts.push(t);
        }
      }
    }

    // Also try to find readable ASCII strings directly
    const readable = str.match(/[\x20-\x7E]{4,}/g) || [];
    const filtered = readable.filter(s =>
      s.length > 3 &&
      !/^[<>\[\]{}\/\\%]+$/.test(s) &&
      !/^[0-9.\s]+$/.test(s) &&
      /[a-zA-Z]/.test(s)
    );

    const combined = [...texts, ...filtered].join(' ');
    return combined.replace(/\s+/g, ' ').trim();
  } catch (e) {
    return '';
  }
}

export class DocumentsController {
  async uploadDocument(req: Request, res: Response) {
    try {
      const { clubId, title, category, summary } = req.body;

      if (!clubId) return res.status(400).json({ error: 'clubId is required' });

      const fileTitle = title?.trim() ||
        (req.file ? req.file.originalname.replace(/\.[^/.]+$/, '') : 'Untitled');
      const detectedFileType = req.file
        ? path.extname(req.file.originalname).replace('.', '').toUpperCase()
        : 'PDF';

      let extractedContent = summary || '';
      let aiSummary = summary || '';

      if (req.file) {
        const ext = path.extname(req.file.originalname).toLowerCase();

        // ── Step 1: Extract raw text ─────────────────────────────────────
        if (ext === '.txt') {
          extractedContent = req.file.buffer.toString('utf-8');
        } else if (ext === '.pdf') {
          extractedContent = extractTextFromPdfBuffer(req.file.buffer);
          console.log(`[PDF] Raw extraction: ${extractedContent.length} chars`);
        }

        // ── Step 2: Use Gemini to scan the actual file ───────────────────
        if (geminiService.isAvailable()) {
          try {
            console.log(`[Gemini] Scanning: ${req.file.originalname}`);
            const scanned = await geminiService.scanDocument(
              req.file.buffer,
              req.file.mimetype,
              req.file.originalname
            );
            if (scanned.content && scanned.content.length > 50) {
              extractedContent = scanned.content;
              aiSummary = scanned.summary;
              console.log(`[Gemini] Scan OK: ${extractedContent.length} chars`);
            } else if (extractedContent.length > 50) {
              aiSummary = extractedContent.slice(0, 400);
            }
          } catch (e: any) {
            console.warn(`[Gemini] Scan failed: ${e.message}`);
            if (extractedContent.length > 50) {
              aiSummary = extractedContent.slice(0, 400);
            } else {
              aiSummary = summary || fileTitle;
              extractedContent = summary || fileTitle;
            }
          }
        } else {
          if (extractedContent.length > 50) {
            aiSummary = extractedContent.slice(0, 400);
          } else {
            aiSummary = summary || fileTitle;
          }
        }
      }

      const doc = await documentsService.createDocument({
        clubId,
        title: fileTitle,
        fileUrl: req.file ? `/uploads/${req.file.originalname}` : `/uploads/${fileTitle}`,
        fileType: detectedFileType,
        fileSize: req.file?.size || 1024 * 45,
        category: category || 'REPORT',
        summary: aiSummary,
        content: extractedContent,
      });

      console.log(`[Documents] Saved: "${fileTitle}" (${extractedContent.length} chars content)`);
      return res.status(201).json({ ...doc, contentLength: extractedContent.length });
    } catch (err: any) {
      console.error('[Documents] Upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  async getDocuments(req: Request, res: Response) {
    try {
      const clubId = req.query.clubId as string;
      if (!clubId) return res.status(400).json({ error: 'clubId is required' });
      const docs = await documentsService.getClubDocuments(clubId, req.query.category as string);
      return res.json(docs);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      await documentsService.deleteDocument(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const documentsController = new DocumentsController();
