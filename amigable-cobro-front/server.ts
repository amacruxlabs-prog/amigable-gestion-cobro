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

  const getAiConfig = async (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No autorizado. Token de sesión no proporcionado.');
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/tenant/ai-credentials`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'No se encontraron credenciales de IA válidas.');
      }
      return { provider: data.provider, apiKey: data.api_key, source: data.source };
    } catch (error: any) {
      throw new Error(error.message || 'Error validando credenciales de IA con el servidor.');
    }
  };

  const executeAiPrompt = async (config: any, prompt: string, systemInstruction: string) => {
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text;
    } else if (config.provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error en Groq API');
      return data.choices[0].message.content;
    } else if (config.provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error en DeepSeek API');
      return data.choices[0].message.content;
    } else {
      throw new Error('Proveedor de IA no soportado: ' + config.provider);
    }
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

  app.get("/api/gemini/verify", async (req, res) => {
    try {
      const config = await getAiConfig(req);
      res.json({ valid: true, provider: config.provider, source: config.source });
    } catch (error: any) {
      res.status(401).json({ valid: false, error: error.message });
    }
  });


  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { transactions, customInstructions, tone } = req.body;
      const config = await getAiConfig(req);

      const systemInstruction = `Eres un Agente Financiero de IA para el "Club Árabe de Maturín". Tono: ${tone || 'Analítico'}.
Instr. usuario: ${customInstructions || 'Ninguna'}.

REGLA CRUCIAL: Responde de forma EXTREMADAMENTE corta, directa y minimalista para ahorrar la máxima cantidad de tokens posible. Omite saludos, introducciones, explicaciones largas o conclusiones. Ve directo al grano. Usa listas de viñetas muy breves.`;

      const prompt = `Transacciones vigentes (JSON):
${JSON.stringify(transactions, null, 2)}

Genera un análisis ultracorto:
1. Estado global (1 línea max).
2. 3 socios urgentes (solo nombres y monto pendiente).
3. 1 estrategia de cobro (1 línea).
4. 1 beneficio corto sugerido.`;

      const text = await executeAiPrompt(config, prompt, systemInstruction);
      res.json({ analysis: text });
    } catch (error: any) {
      console.log('Gemini Analyze Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });


  // 2. Chat with the transactions context
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history, transactions, customInstructions, tone } = req.body;
      const config = await getAiConfig(req);

      const systemInstruction = `Eres un Agente de IA para el "Club Árabe de Maturín". Ayudas a administrar socios y pagos.
Tono: ${tone || 'Analítico'}.
Instr. especiales: ${customInstructions || 'Ninguna'}.

REGLA CRUCIAL: Tus respuestas deben ser MUY BREVES, CLARAS Y DIRECTAS. Consume el menor número de tokens posible.
No uses introducciones ni explicaciones largas.
Si redactas un mensaje de WhatsApp, hazlo súper corto y usando placeholders como {{cliente}} o {{monto}}.
Datos en vivo (llaves: c=cliente, a=monto original, p=monto pagado, s=estado):
${JSON.stringify(transactions || [], null, 2)}`;

      let promptMessage = message;
      if (history && history.length > 0) {
        promptMessage = `Historial de chat anterior:
${history.map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Agente'}: ${h.text}`).join('\\n')}

Nueva pregunta del usuario: ${message}`;
      }

      const text = await executeAiPrompt(config, promptMessage, systemInstruction);
      res.json({ reply: text });
    } catch (error: any) {
      console.log('Gemini Chat Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });


  // 3. Analyze CSV File intelligent
  app.post('/api/gemini/analyze-csv', async (req, res) => {
    try {
      const { csvText } = req.body;
      const config = await getAiConfig(req);

      const systemInstruction = `Eres un procesador de datos especializado. Extraerás datos de un archivo CSV desordenado.
REGLA CRUCIAL: Retorna ÚNICAMENTE un objeto JSON con la llave "transactions". Cada transaccion debe tener:
- clientName (string)
- cedula (string)
- phone (string)
- amount (number, sin formato moneda)
- status ('Pagado' o 'Cobrar')
- date (YYYY-MM-DD)
NO agregues markdown \`\`\`json. Solo el string crudo JSON. Ignora filas vacías.`;

      const prompt = `Analiza este texto CSV y devuelve el JSON:

${csvText.substring(0, 4000)}`;

      let text = await executeAiPrompt(config, prompt, systemInstruction);
      
      // Clean up markdown wrapper if any
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      
      res.json(parsed);
    } catch (error: any) {
      console.log('Gemini Analyze CSV Error:', error.message);
      res.status(500).json({ error: error.message });
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
    app.get("/docs", (req, res) => { res.sendFile(path.join(process.cwd(), "docs.html")); });
    app.get("/docs/openapi.json", (req, res) => { res.sendFile(path.join(process.cwd(), "openapi.json")); });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
