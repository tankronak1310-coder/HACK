import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';

// Try these models in order until one works
const MODEL_CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
];

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private workingModel: any = null;
  private workingModelName = '';

  private async getWorkingModel(): Promise<any> {
    if (this.workingModel) return this.workingModel;
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const m = this.genAI.getGenerativeModel({ model: modelName });
        // Quick test
        await m.generateContent('say ok');
        this.workingModel = m;
        this.workingModelName = modelName;
        console.log(`[Gemini] Using model: ${modelName}`);
        return m;
      } catch (e: any) {
        console.warn(`[Gemini] Model ${modelName} failed: ${e.message?.slice(0, 80)}`);
      }
    }
    throw new Error('No working Gemini model found');
  }

  // ── Scan a document (PDF/image/text) ──────────────────────────────────────
  async scanDocument(buffer: Buffer, mimeType: string, filename: string): Promise<{ content: string; summary: string }> {
    const model = await this.getWorkingModel();

    if (mimeType === 'text/plain') {
      const text = buffer.toString('utf-8');
      const summary = text.slice(0, 500);
      return { content: text, summary };
    }

    const base64Data = buffer.toString('base64');
    const prompt = `Extract ALL text and data from this document "${filename}". Include every name, number, date, and fact. Output the complete extracted text.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);

    const content = result.response.text();
    const summary = content.slice(0, 500);
    return { content, summary };
  }

  // ── Answer a question from document content ────────────────────────────────
  async answerFromDocuments(query: string, documents: Array<{ title: string; content: string; summary: string }>): Promise<{ answer: string; sources: any[] }> {
    const model = await this.getWorkingModel();

    const docContext = documents
      .map((d, i) => `--- Document ${i + 1}: "${d.title}" ---\n${(d.content || d.summary || '').slice(0, 8000)}`)
      .join('\n\n');

    const prompt = `You are an AI assistant for a college event management platform called ClubOps AI.

The user has uploaded documents. Here is the content:

${docContext}

User Question: "${query}"

Answer the question using ONLY the information in the documents above. Be specific with numbers and names. If the answer isn't in the documents, say so clearly.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    const sources = documents.slice(0, 3).map(d => ({
      title: d.title,
      page: 1,
      excerpt: (d.content || d.summary || '').slice(0, 120),
    }));

    return { answer, sources };
  }

  isAvailable(): boolean {
    return !!env.GEMINI_API_KEY;
  }
}

export const geminiService = new GeminiService();
