import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parsing
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for calling Gemini with retry and fallback
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const maxRetries = 2;
  let delay = 1000;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      lastError = err;
      const status = err.status || (err.error && err.error.code);
      console.warn(`Gemini API attempt ${attempt} failed for model ${params.model}:`, err.message || err);
      
      const isRetryable = status === 503 || status === 429 || !status;
      if (attempt <= maxRetries && isRetryable) {
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        break;
      }
    }
  }

  // Fallback to gemini-3.1-flash-lite
  if (params.model === 'gemini-3.5-flash') {
    console.log(`Falling back to gemini-3.1-flash-lite due to primary model error:`, lastError?.message || lastError);
    try {
      return await ai.models.generateContent({
        ...params,
        model: 'gemini-3.1-flash-lite',
      });
    } catch (fallbackErr: any) {
      console.error('Fallback model gemini-3.1-flash-lite also failed:', fallbackErr);
      throw fallbackErr;
    }
  }

  throw lastError;
}

// AI endpoints
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `You are a document assistant. The user just uploaded a PDF. 
Provide a concise 2-3 sentence summary of what this document is about. 
Be specific — mention document type, subject matter, and any key parties or figures mentioned.
Extracted text (first 3000 chars): ${text.slice(0, 3000)}`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ summary: response.text || 'No summary could be generated.' });
  } catch (err: any) {
    console.error('Gemini summary generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate summary' });
  }
});

app.post('/api/gemini/suggest-questions', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Based on this document, generate exactly 3 short, useful questions a reader might ask. 
Return them as a JSON array of strings only. No explanation. No markdown.
Example: ["What is the total contract value?", "Who are the signing parties?", "What are the key deadlines?"]
Document text (first 2000 chars): ${text.slice(0, 2000)}`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    let questions = [];
    try {
      if (response.text) {
        questions = JSON.parse(response.text.trim());
      }
    } catch (parseErr) {
      console.warn('Failed to parse suggested questions JSON, using fallback', parseErr);
      questions = [
        'Summarize this document',
        'What are the key points?',
        'Are there any important dates or deadlines?'
      ];
    }

    res.json({ questions });
  } catch (err: any) {
    console.error('Gemini suggested questions error:', err);
    // Return fallback instead of 500 error for maximum UX resiliency
    res.json({
      questions: [
        'Summarize this document',
        'What are the key points?',
        'Are there any important dates or deadlines?'
      ]
    });
  }
});

app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { text, messages, message } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Document text is required' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build the chat history for context
    const chatHistory = messages || [];
    
    // Construct a comprehensive prompt enclosing the text as context
    const contextPrompt = `You are an AI document assistant. Answer the user's questions based on the provided document text. If the answer cannot be found in the document, use your general knowledge but mention that it isn't explicitly in the document.

--- DOCUMENT START ---
${text}
--- DOCUMENT END ---

Conversation History:
${chatHistory.map((m: any) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')}

User Question: ${message}
AI Response:`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: contextPrompt,
    });

    res.json({ response: response.text || "I'm sorry, I couldn't process an answer for that." });
  } catch (err: any) {
    console.error('Gemini chat generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response' });
  }
});

// Initialize Vite server or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
