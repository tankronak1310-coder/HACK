import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  private getModel() {
    if (!this.model) {
      if (!env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in .env');
      }
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
    return this.model;
  }

  // ── Scan a document buffer (PDF/image/text) and extract full content + summary ──
  async scanDocument(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<{ content: string; summary: string }> {
    const model = this.getModel();

    // For text files, just decode directly
    if (mimeType === 'text/plain') {
      const text = buffer.toString('utf-8');
      const summary = await this.summarizeText(text, filename);
      return { content: text, summary };
    }

    // For PDF and images, send as inline data to Gemini
    const base64Data = buffer.toString('base64');
    const prompt = `You are a document scanner AI for an event management platform called ClubOps AI.

Analyze the following document thoroughly and extract ALL information. Focus on:
- Volunteer names, counts, roles, teams, contact info
- Budget figures, expense items, costs
- Event details, dates, venues
- Rules, guidelines, procedures
- Food/catering details
- Any structured data (tables, lists)

Document filename: ${filename}

Please provide:
1. A complete extraction of ALL data from this document
2. Keep numbers, names, and figures exactly as they appear

Respond with the full extracted text content.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
    ]);

    const content = result.response.text();

    // Generate a concise summary
    const summary = await this.summarizeText(content, filename);

    return { content, summary };
  }

  // ── Answer a question using document content via Gemini ──
  async answerFromDocuments(
    query: string,
    documents: Array<{ title: string; content: string; summary: string }>
  ): Promise<{ answer: string; sources: Array<{ title: string; page: number; excerpt: string }> }> {
    const model = this.getModel();

    const docContext = documents
      .map((d, i) => `--- Document ${i + 1}: "${d.title}" ---\n${d.content || d.summary}`)
      .join('\n\n');

    const prompt = `You are ClubOps AI Brain, an intelligent assistant for a college event management platform.

You have access to the following documents uploaded by the club:

${docContext}

User Question: "${query}"

Instructions:
- Answer the question accurately and specifically using ONLY the information in the documents above
- If the documents contain specific numbers, names, or data relevant to the question, include them exactly
- Format your answer clearly with bullet points or numbers where appropriate
- At the end, cite which document(s) you used
- If the answer is not in the documents, say so clearly and suggest what to search for

Provide a comprehensive, accurate answer:`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Build sources from documents that likely contributed
    const sources = documents.slice(0, 3).map(d => ({
      title: d.title,
      page: 1,
      excerpt: (d.summary || d.content || '').slice(0, 120) + '...',
    }));

    return { answer, sources };
  }

  // ── Summarize extracted text ──
  private async summarizeText(text: string, filename: string): Promise<string> {
    if (!env.GEMINI_API_KEY) return text.slice(0, 300);
    const model = this.getModel();
    const prompt = `Summarize this document "${filename}" in 2-3 sentences. Focus on key data like counts, amounts, names:\n\n${text.slice(0, 3000)}`;
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch {
      return text.slice(0, 300);
    }
  }

  isAvailable(): boolean {
    return !!env.GEMINI_API_KEY;
  }
}

export const geminiService = new GeminiService();
