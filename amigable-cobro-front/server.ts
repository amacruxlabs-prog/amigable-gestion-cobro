import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3003;

  app.use(express.json({ limit: '50mb' }));

  // Shared Gemini client setup on the server
  // User-Agent: aistudio-build is mandatory for telemetry!
  const getAiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('La API Key de Gemini (GEMINI_API_KEY) no está configurada. Por favor define esta variable en Configuración > Secretos en AI Studio.');
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

const uploadCache = new Map<string, { buffer: Buffer; mime: string }>();

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substring(2, 15);

  app.post('/api/upload-image', (req, res) => {
    try {
      const { dataUrl } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ error: 'No dataUrl provided' });
      }

      // dataUrl format: "data:image/png;base64,iVBORw0KGgo..."
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid dataUrl format' });
      }

      const mime = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const id = generateId();

      // Only store temporarily
      uploadCache.set(id, { buffer, mime });

      // Clean up after 2 hours
      setTimeout(() => {
        uploadCache.delete(id);
      }, 2 * 60 * 60 * 1000);

      const host = req.get('host');
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      
      const publicUrl = `${protocol}://${host}/img/${id}`;
      return res.json({ url: publicUrl });
    } catch (e) {
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.get('/img/:id', (req, res) => {
    const file = uploadCache.get(req.params.id);
    if (!file) {
      return res.status(404).send('Image not found or expired');
    }
    
    // For WhatsApp to preview it better, we can just return the raw image.
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Let WhatsApp cache it
    res.send(file.buffer);
  });

  // API router/endpoints
  // 1. Audit / Analysis of current transactions
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { transactions, customInstructions, tone } = req.body;
      const ai = getAiClient();

      const systemInstruction = `Eres un Agente Financiero de IA para el "Club Árabe de Maturín". Tono: ${tone || 'Analítico'}.
Instr. usuario: ${customInstructions || 'Ninguna'}.

REGLA CRUCIAL: Responde de forma EXTREMADAMENTE corta, directa y minimalista para ahorrar la máxima cantidad de tokens posible. Omite saludos, introducciones, explicaciones largas o conclusiones. Ve directo al grano. Usa listas de viñetas muy breves.`;

      const prompt = `Transacciones vigentes (JSON):\n${JSON.stringify(transactions, null, 2)}\n\nGenera un análisis ultracorto:\n1. Estado global (1 línea max).\n2. 3 socios urgentes (solo nombres y monto pendiente).\n3. 1 estrategia de cobro (1 línea).\n4. 1 beneficio corto sugerido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
        }
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      let errorMessage = error?.message || 'Ocurrió un error al procesar el análisis de IA.';
      if (errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          const jsonStr = errorMessage.substring(errorMessage.indexOf('{'), errorMessage.lastIndexOf('}') + 1);
          const parsed = JSON.parse(jsonStr);
          if (parsed?.error?.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Fallback to original
        }
      }
      console.log('Gemini Analyze Error:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // 2. Chat with the transactions context
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history, transactions, customInstructions, tone } = req.body;
      const ai = getAiClient();

      const systemInstruction = `Eres un Agente de IA para el "Club Árabe de Maturín". Ayudas a administrar socios y pagos.
Tono: ${tone || 'Analítico'}.
Instr. especiales: ${customInstructions || 'Ninguna'}.

REGLA CRUCIAL: Tus respuestas deben ser MUY BREVES, CLARAS Y DIRECTAS. Consume el menor número de tokens posible.
No uses introducciones ni explicaciones largas.
Si redactas un mensaje de WhatsApp, hazlo súper corto y usando placeholders como {{cliente}} o {{monto}}.
Datos en vivo (llaves: c=cliente, a=monto original, p=monto pagado, s=estado):\n${JSON.stringify(transactions || [], null, 2)}`;

      let promptMessage = message;
      if (history && history.length > 0) {
        promptMessage = `Historial de chat anterior:\n${history.map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Agente'}: ${h.text}`).join('\n')}\n\nNueva pregunta del usuario: ${message}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Updated to latest recommended version
        contents: promptMessage,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      let errorMessage = error?.message || 'Ocurrió un error en el chat con el agente de IA.';
      if (errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          const jsonStr = errorMessage.substring(errorMessage.indexOf('{'), errorMessage.lastIndexOf('}') + 1);
          const parsed = JSON.parse(jsonStr);
          if (parsed?.error?.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Fallback to original
        }
      }
      console.log('Gemini Chat Error:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
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
