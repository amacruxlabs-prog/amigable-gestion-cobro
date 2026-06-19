import re

with open('server.ts', 'r') as f:
    content = f.read()

get_ai_config_code = """
  const getAiConfig = async (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No autorizado. Token de sesión no proporcionado.');
    }

    try {
      const response = await fetch('http://localhost:8000/api/tenant/ai-credentials', {
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
"""

content = re.sub(r'  const getAiClient = \(\) => \{.*?\n  \};\n', get_ai_config_code, content, flags=re.DOTALL)

verify_code = """
  app.get("/api/gemini/verify", async (req, res) => {
    try {
      const config = await getAiConfig(req);
      res.json({ valid: true, provider: config.provider, source: config.source });
    } catch (error: any) {
      res.status(401).json({ valid: false, error: error.message });
    }
  });
"""

content = re.sub(r'  app\.get\("/api/gemini/verify", async \(req, res\) => \{.*?\n  \}\);\n', verify_code, content, flags=re.DOTALL)


analyze_code = """
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { transactions, customInstructions, tone } = req.body;
      const config = await getAiConfig(req);

      const systemInstruction = `Eres un Agente Financiero de IA para el "Club Árabe de Maturín". Tono: ${tone || 'Analítico'}.
Instr. usuario: ${customInstructions || 'Ninguna'}.

REGLA CRUCIAL: Responde de forma EXTREMADAMENTE corta, directa y minimalista para ahorrar la máxima cantidad de tokens posible. Omite saludos, introducciones, explicaciones largas o conclusiones. Ve directo al grano. Usa listas de viñetas muy breves.`;

      const prompt = `Transacciones vigentes (JSON):\n${JSON.stringify(transactions, null, 2)}\n\nGenera un análisis ultracorto:\n1. Estado global (1 línea max).\n2. 3 socios urgentes (solo nombres y monto pendiente).\n3. 1 estrategia de cobro (1 línea).\n4. 1 beneficio corto sugerido.`;

      const text = await executeAiPrompt(config, prompt, systemInstruction);
      res.json({ analysis: text });
    } catch (error: any) {
      console.log('Gemini Analyze Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
"""
content = re.sub(r'  app\.post\(\'/api/gemini/analyze\', async \(req, res\) => \{.*?\n  \}\);\n', analyze_code, content, flags=re.DOTALL)

chat_code = """
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
Datos en vivo (llaves: c=cliente, a=monto original, p=monto pagado, s=estado):\n${JSON.stringify(transactions || [], null, 2)}`;

      let promptMessage = message;
      if (history && history.length > 0) {
        promptMessage = `Historial de chat anterior:\n${history.map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Agente'}: ${h.text}`).join('\n')}\n\nNueva pregunta del usuario: ${message}`;
      }

      const text = await executeAiPrompt(config, promptMessage, systemInstruction);
      res.json({ reply: text });
    } catch (error: any) {
      console.log('Gemini Chat Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
"""
content = re.sub(r'  // 2\. Chat with the transactions context\n  app\.post\(\'/api/gemini/chat\', async \(req, res\) => \{.*?\n  \}\);\n', chat_code, content, flags=re.DOTALL)


analyze_csv_code = """
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

      const prompt = `Analiza este texto CSV y devuelve el JSON:\n\n${csvText.substring(0, 4000)}`;

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
"""

# Insert analyze_csv_code right before Vite middleware
content = content.replace("  // Vite middleware for development", analyze_csv_code + "\n  // Vite middleware for development")

with open('server.ts', 'w') as f:
    f.write(content)
