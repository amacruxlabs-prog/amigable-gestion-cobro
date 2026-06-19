import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, Send, Brain, Bot, HelpCircle, 
  Settings2, Activity, Play, Check, ChevronRight, AlertTriangle, FileSpreadsheet 
} from 'lucide-react';
import { Transaction } from '../types';
import { localDb } from '../lib/localDb';
import { useUI } from '../contexts/UIContext';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

interface AiConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  id: string;
  text: string;
  timestamp: string;
}

export const AiConfigDrawer: React.FC<AiConfigDrawerProps> = ({ isOpen, onClose, transactions }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  
  // Settings state
  const { businessId } = useAuth();
  const [tone, setTone] = useState<string>('Analítico y Profesional');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [autoAlertLargeDebts, setAutoAlertLargeDebts] = useState<boolean>(true);
  const [suggestEarlyDiscount, setSuggestEarlyDiscount] = useState<boolean>(true);

  // Load from backend API
  useEffect(() => {
    if (!isOpen) return;
    const fetchSettings = async () => {
      try {
        const response = await api.get('/tenant/settings');
        const data = response.data.data;
        if (data) {
          if (data.aiTone) setTone(data.aiTone);
          if (data.aiInstructions !== undefined) setCustomInstructions(data.aiInstructions);
          if (data.aiAutoAlert !== undefined) setAutoAlertLargeDebts(data.aiAutoAlert);
          if (data.aiSuggestDiscount !== undefined) setSuggestEarlyDiscount(data.aiSuggestDiscount);
        }
      } catch (e) {
        console.error('Error fetching settings from API', e);
      }
    };
    fetchSettings();
  }, [isOpen]);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('resto_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading AI chat history:', e);
      }
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        text: '¡Hola! Soy tu Agente Consultor Financiero de IA. He analizado el estado actual. ¿En qué te puedo asistir hoy? Pregúntame sobre clientes morosos, flujos de caja, redactar mensajes, o qué estrategias implementar hoy.',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const { confirm, toast } = useUI();
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to chat end
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isOpen]);

  // Persist settings
  const handleSaveSettings = async () => {
    try {
      await api.put('/tenant/settings', {
        settings: {
          aiTone: tone,
          aiInstructions: customInstructions,
          aiAutoAlert: autoAlertLargeDebts,
          aiSuggestDiscount: suggestEarlyDiscount
        }
      });
      
      setShowSavedFeedback(true);
      setTimeout(() => {
        setShowSavedFeedback(false);
      }, 2000);
    } catch (e) {
      console.error("Error saving settings to API", e);
      toast('Error al guardar la configuración', 'error');
    }
  };

  // Clear Chat History
  const handleClearHistory = () => {
    confirm({
      title: 'Limpiar Historial',
      message: '¿Seguro que deseas reiniciar el historial de chat con la IA?',
      type: 'danger',
      onConfirm: () => {
        const initial = [
          {
            id: 'welcome',
            role: 'assistant',
            text: 'Entendido. Historial de conversación restablecido. Estoy listo para tus nuevas consultas sobre las cuotas y cobros del club.',
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          }
        ];
        setMessages(initial as ChatMessage[]);
        localStorage.setItem('resto_ai_chat_history', JSON.stringify(initial));
        toast('Historial limpiado', 'success');
      }
    });
  };

  // Save chat history
  useEffect(() => {
    localStorage.setItem('resto_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Trigger quick prompt clicks
  const handleQuickPrompt = async (promptText: string) => {
    if (isLoading) return;
    await executeChatQuery(promptText);
  };

  // Run chat query calling our fullstack API
  const executeChatQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Add user message
    const userMsgId = 'user-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      // Compress transactions to save tokens
      const minimalTransactions = transactions.map(t => ({
        c: t.clientName,
        a: t.amount,
        p: t.paidAmount || 0,
        s: t.status
      }));

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          message: queryText,
          history: messages.slice(-10), // Send last 10 messages for context
          transactions: minimalTransactions,
          customInstructions,
          tone
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        // empty
      }
      
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo establecer comunicación con el Agent Server.');
      }
      
      const assistantMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        text: data.reply || 'No obtuve una respuesta clara de tu Agente.',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      
      let errorText = err.message || 'Error de conexión con el agente de IA.';
      if (errorText.includes('leaked') || errorText.includes('API key not valid') || errorText.includes('expired')) {
        errorText += ' (Por favor, genera y configura una clave nueva de Gemini en Ajustes > Secretos en AI Studio).';
      } else if (errorText === 'No se pudo establecer comunicación con el Agent Server.') {
        errorText += ' Asegúrate de configurar tu API Key de Gemini en Ajustes > Secretos.';
      }

      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        text: '❌ Error: ' + errorText,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute a comprehensive data audit report
  const handleTriggerAudit = async () => {
    const prompt = 'Realiza una auditoría financiera de las transacciones de los clientes y dime el estado de las cuotas de forma ejecutiva.';
    setActiveTab('chat');
    await executeChatQuery(prompt);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 z-[90] backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Body */}
          <motion.div
            id="ai-config-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-[100] flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bot className="w-4.5 h-4.5 text-indigo-100 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-bold text-sm leading-none flex items-center gap-1">
                    Agente Consultor IA <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  </h2>
                  <span className="text-[10px] text-indigo-200">Mouna System</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1.5 dark:bg-slate-900/50 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'chat' 
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400' 
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Asistente Consultor</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400' 
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span>Ajustes del Agente</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'chat' ? (
                /* CHAT INTERFACE */
                <div className="flex flex-col h-full space-y-3">
                  
                  {/* Summary / Audit Quick Button */}
                  <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-bold text-slate-700 block dark:text-slate-200">¿Auditar base de datos?</span>
                        <span className="text-[9px] text-slate-500 block dark:text-slate-400">Enviar todas los registros actuales para análisis estratégico</span>
                      </div>
                    </div>
                    <button
                      onClick={handleTriggerAudit}
                      disabled={isLoading}
                      className="text-[10px] flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs dark:bg-indigo-500"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>Auditar</span>
                    </button>
                  </div>

                  {/* Messages Scroll Box */}
                  <div className="flex-1 border border-slate-100 bg-slate-50/50 rounded-xl p-3 overflow-y-auto space-y-3 mini-scrollbar dark:bg-slate-900/50 dark:border-slate-800">
                    {messages.map(msg => (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`p-3 rounded-2xl max-w-[85%] text-xs shadow-3xs leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none dark:bg-indigo-500' 
                            : 'bg-white text-slate-700 rounded-bl-none border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                        }`}>
                          <div className="whitespace-pre-line">{msg.text}</div>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono dark:text-slate-500">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs py-1.5 animate-pulse bg-white border border-slate-100 p-2.5 rounded-xl rounded-bl-none dark:bg-slate-800 dark:border-slate-700">
                        <Bot className="w-4.5 h-4.5 text-indigo-500" />
                        <span className="dark:text-slate-400">El Agente de IA está analizando los datos...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick prompts chips */}
                  <div className="space-y-1 select-none">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1 dark:text-indigo-400">
                      <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                      <span>Sugerencias de Consulta:</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleQuickPrompt('¿Quiénes son mis deudores mayores?')}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-semibold text-slate-650 px-2.5 py-1 rounded-lg border border-slate-200/50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
                      >
                        🔎 Deudores mayores
                      </button>
                      <button
                        onClick={() => handleQuickPrompt('Redacta un mensaje amable de recordatorio de cobro de deudas')}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-semibold text-slate-650 px-2.5 py-1 rounded-lg border border-slate-200/50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
                      >
                        💬 Amable cobro WA
                      </button>
                      <button
                        onClick={() => handleQuickPrompt('¿Qué porcentaje de cobranza tengo y cómo aumentarla?')}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-semibold text-slate-650 px-2.5 py-1 rounded-lg border border-slate-200/50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
                      >
                        📈 Eficacia y sugerencias
                      </button>
                      <button
                        onClick={() => handleQuickPrompt('Dime ideas de promociones o descuentos para clientes que ya pagaron todo de inmediato')}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-semibold text-slate-650 px-2.5 py-1 rounded-lg border border-slate-200/50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
                      >
                        🎁 Promos rápidos
                      </button>
                      <button
                        onClick={() => handleQuickPrompt('¿Cómo estructurar un plan de financiamiento semanal para las deudas más grandes?')}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-semibold text-slate-650 px-2.5 py-1 rounded-lg border border-slate-200/50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
                      >
                        📅 Plan financiamiento
                      </button>
                    </div>
                  </div>

                  {/* Input Chat bar */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeChatQuery(chatInput);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pregunta a la IA sobre las cuentas..."
                      className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 outline-hidden transition-all text-slate-800 placeholder-slate-400 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:hover:bg-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl cursor-pointer transition-all disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Clear chat history trigger */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleClearHistory}
                      className="text-[9px] text-slate-400 hover:text-red-500 font-semibold cursor-pointer underline decoration-dotted transition-colors"
                    >
                      Reiniciar chat
                    </button>
                  </div>

                </div>
              ) : (
                /* SETTINGS INTERFACE */
                <div className="space-y-4">
                  
                  {/* Description Box */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs leading-relaxed text-indigo-950 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-200">
                    <div className="flex gap-2 items-start">
                      <Brain className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5 dark:text-indigo-400" />
                      <div>
                        <strong>Configura el Cerebro de tu Panel:</strong> Define cómo responde el agente de inteligencia artificial a la hora de auditar la base de datos o simular mensajes.
                      </div>
                    </div>
                  </div>

                  {/* Tone selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block dark:text-slate-400">Tono del Agente</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'Analítico y Profesional', desc: 'Métricas, datos y seriedad' },
                        { name: 'Amigable y Empático', desc: 'Trato preferente y cordial' },
                        { name: 'Directo y Ejecutivo', desc: 'Frases cortas, datos duros' },
                        { name: 'Urgente y Convincente', desc: 'Énfasis en cobro e impagos' }
                      ].map(t => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setTone(t.name)}
                          className={`p-2.5 text-left border rounded-xl rounded-tr-lg cursor-pointer transition-all ${
                            tone === t.name 
                              ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/40 dark:border-indigo-500/80 dark:ring-indigo-500/80' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800/80 dark:border-slate-700 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className={`text-[11px] font-bold block ${tone === t.name ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{t.name}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5 blockLeading-tight dark:text-slate-500">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block dark:text-slate-400">Instrucciones Especiales de Negocio</label>
                    <textarea
                      rows={3}
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="e.g., 'Somos Mouna. Ofrecemos a los deudores un 10% de abono rápido. Escribe en español neutro.' o 'Enfócate en cuentas de más de 30 días.'"
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-hidden transition-all text-slate-800 resize-none placeholder-slate-400 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500"
                    />
                  </div>

                  {/* Automation rules switches */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block dark:text-slate-400">Reglas IA Automatizadas</label>
                    
                    {/* Switch 1 */}
                    <div className="flex items-center justify-between p-3 bg-slate-50/60 border border-slate-200/50 rounded-xl dark:bg-slate-800/60 dark:border-slate-700">
                      <div className="text-left max-w-[80%] pr-2">
                        <span className="text-[11px] font-bold text-slate-700 block dark:text-slate-200">Alertar deudas elevadas</span>
                        <span className="text-[9px] text-slate-500 block leading-tight dark:text-slate-400">Marcar con bandera de prioridad deudas mayores a $100.000 COL / COP</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoAlertLargeDebts(!autoAlertLargeDebts)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer outline-hidden dark:ring-offset-slate-900 ${
                          autoAlertLargeDebts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                          autoAlertLargeDebts ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Switch 2 */}
                    <div className="flex items-center justify-between p-3 bg-slate-50/60 border border-slate-200/50 rounded-xl dark:bg-slate-800/60 dark:border-slate-700">
                      <div className="text-left max-w-[80%] pr-2">
                        <span className="text-[11px] font-bold text-slate-700 block dark:text-slate-200">Ofrecer descuento por pronto pago</span>
                        <span className="text-[9px] text-slate-500 block leading-tight dark:text-slate-400">Sugerir un 5% de descuento en la previsualización del mensaje si pagan en menos de 3 días</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSuggestEarlyDiscount(!suggestEarlyDiscount)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer outline-hidden dark:ring-offset-slate-900 ${
                          suggestEarlyDiscount ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                          suggestEarlyDiscount ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Save button with status feedback */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Guardar Configuración</span>
                    </button>

                    {showSavedFeedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-center text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Ajustes guardados con éxito en la memoria</span>
                      </motion.div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Footer indicator */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 text-center text-[9px] font-mono text-slate-400">
              API de Gemini: Activa • Modelo: gemini-3.5-flash
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
