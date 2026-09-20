import { prisma } from '../../db/prisma.js';

export class DocumentsService {
  async createDocument(data: {
    clubId: string;
    eventId?: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    summary?: string;
    content?: string;
  }) {
    const fullContent = data.content || data.summary || data.title;

    // Split content into chunks of ~1000 chars for better search
    const chunkSize = 1000;
    const chunks: { content: string; pageNumber: number }[] = [];
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      chunks.push({
        content: fullContent.slice(i, i + chunkSize),
        pageNumber: Math.floor(i / chunkSize) + 1,
      });
    }
    if (chunks.length === 0) chunks.push({ content: fullContent, pageNumber: 1 });

    const doc = await prisma.document.create({
      data: {
        clubId: data.clubId,
        eventId: data.eventId || null,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        category: data.category,
        summary: data.summary,
        content: fullContent,
        chunks: {
          create: chunks,
        },
      },
      include: { chunks: true },
    });

    return doc;
  }

  async getClubDocuments(clubId: string, category?: string) {
    const where: any = { clubId };
    if (category) where.category = category;

    return await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { id: true, name: true } },
      },
    });
  }

  async deleteDocument(documentId: string) {
    return await prisma.document.delete({ where: { id: documentId } });
  }
}

export const documentsService = new DocumentsService();
