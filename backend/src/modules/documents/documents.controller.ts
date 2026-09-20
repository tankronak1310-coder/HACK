import { Request, Response } from 'express';
import { documentsService } from './documents.service.js';

export class DocumentsController {
  async uploadDocument(req: Request, res: Response) {
    try {
      const { clubId, eventId, title, fileType, category, summary, content } = req.body;
      if (!clubId || !title || !fileType) {
        return res.status(400).json({ error: 'clubId, title, and fileType are required' });
      }

      const doc = await documentsService.createDocument({
        clubId,
        eventId,
        title,
        fileUrl: `/uploads/${title.replace(/\s+/g, '_').toLowerCase()}`,
        fileType: fileType.toUpperCase(),
        fileSize: 1024 * 45, // mock 45 KB for metadata
        category: category || 'REPORT',
        summary: summary || 'Document catalogued in Club Brain memory bank.',
        content: content || summary,
      });

      return res.status(201).json(doc);
    } catch (err: any) {
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

  async updateDocument(req: Request, res: Response) {
    try {
      const doc = await documentsService.updateDocument(req.params.id, req.body);
      return res.json(doc);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      await documentsService.deleteDocument(req.params.id);
      return res.json({ success: true, message: 'Document deleted successfully.', deletedId: req.params.id });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const documentsController = new DocumentsController();
