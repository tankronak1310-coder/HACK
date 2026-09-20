import { Request, Response } from 'express';
import { documentsService } from './documents.service.js';
import { geminiService } from '../ai/gemini.service.js';
import multer from 'multer';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParseLib = require('pdf-parse');
const pdfParse = typeof pdfParseLib === 'function' ? pdfParseLib : pdfParseLib.default ?? pdfParseLib;

// Store uploads in memory for scanning
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, TXT, and image files are allowed'));
  },
});

export const uploadMiddleware = upload.single('file');

async function extractTextFromFile(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  // PDF extraction using pdf-parse
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      const text = data.text?.trim();
      if (text && text.length > 10) {
        console.log(`[PDF] Extracted ${text.length} chars from ${filename}`);
        return text;
      }
    } catch (e: any) {
      console.warn(`[PDF] pdf-parse failed: ${e.message}`);
    }
  }

  // Plain text
  if (ext === '.txt' || mimetype === 'text/plain') {
    return buffer.toString('utf-8');
  }

  return '';
}

export class DocumentsController {
  async uploadDocument(req: Request, res: Response) {
    try {
      const { clubId, eventId, title, fileType, category, summary } = req.body;

      if (!clubId || !title) {
        return res.status(400).json({ error: 'clubId and title are required' });
      }

      const detectedFileType = req.file
        ? path.extname(req.file.originalname).replace('.', '').toUpperCase()
        : (fileType || 'PDF');

      let extractedContent = summary || '';
      let aiSummary = summary || '';

      // ── Step 1: Extract raw text from uploaded file ──────────────────────
      if (req.file) {
        const rawText = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);

        if (rawText && rawText.length > 20) {
          extractedContent = rawText;
          console.log(`[Documents] Raw text extracted (${rawText.length} chars)`);

          // ── Step 2: Use Gemini to summarize if API key is set ────────────
          if (geminiService.isAvailable()) {
            try {
              const scanned = await geminiService.scanDocument(req.file.buffer, req.file.mimetype, req.file.originalname);
              extractedContent = scanned.content || rawText;
              aiSummary = scanned.summary;
              console.log(`[Documents] Gemini enhanced scan complete`);
            } catch (e: any) {
              console.warn(`[Documents] Gemini failed, using raw text: ${e.message}`);
              // Auto-generate a basic summary from raw text
              aiSummary = rawText.slice(0, 500).replace(/\s+/g, ' ').trim() + (rawText.length > 500 ? '...' : '');
            }
          } else {
            // No Gemini — use first 500 chars as summary
            aiSummary = rawText.slice(0, 500).replace(/\s+/g, ' ').trim() + (rawText.length > 500 ? '...' : '');
          }
        } else {
          // Could not extract text (scanned image PDF etc)
          if (geminiService.isAvailable()) {
            try {
              const scanned = await geminiService.scanDocument(req.file.buffer, req.file.mimetype, req.file.originalname);
              extractedContent = scanned.content;
              aiSummary = scanned.summary;
            } catch (e: any) {
              console.warn(`[Documents] Gemini image scan failed: ${e.message}`);
              extractedContent = summary || title;
              aiSummary = summary || `Document: ${title}`;
            }
          } else {
            extractedContent = summary || title;
            aiSummary = summary || `Document: ${title}`;
          }
        }
      }

      const doc = await documentsService.createDocument({
        clubId,
        eventId,
        title,
        fileUrl: req.file ? `/uploads/${req.file.originalname}` : `/uploads/${title}`,
        fileType: detectedFileType,
        fileSize: req.file?.size || 1024 * 45,
        category: category || 'REPORT',
        summary: aiSummary,
        content: extractedContent,
      });

      return res.status(201).json({
        ...doc,
        aiScanned: !!req.file,
        contentLength: extractedContent.length,
      });
    } catch (err: any) {
      console.error('[Documents] Upload error:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  async getDocuments(req: Request, res: Response) {
    try {
      const clubId = req.query.clubId as string;
      if (!clubId) return res.status(400).json({ error: 'clubId is required' });
      const category = req.query.category as string | undefined;
      const docs = await documentsService.getClubDocuments(clubId, category);
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
