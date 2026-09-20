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
        content: data.content,
        chunks: {
          create: [
            {
              content: data.content || data.summary || data.title,
              pageNumber: 1,
            },
          ],
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

  async updateDocument(documentId: string, data: Partial<{
    title: string;
    category: string;
    summary: string;
    content: string;
    eventId: string | null;
  }>) {
    const updateData: any = { ...data };
    if (data.content || data.summary) {
      // Also update first chunk content
      const firstChunk = await prisma.documentChunk.findFirst({ where: { documentId } });
      if (firstChunk) {
        await prisma.documentChunk.update({
          where: { id: firstChunk.id },
          data: { content: data.content || data.summary },
        });
      }
    }

    return await prisma.document.update({
      where: { id: documentId },
      data: updateData,
      include: { chunks: true, event: { select: { id: true, name: true } } },
    });
  }

  async deleteDocument(documentId: string) {
    return await prisma.document.delete({ where: { id: documentId } });
  }
}

export const documentsService = new DocumentsService();
