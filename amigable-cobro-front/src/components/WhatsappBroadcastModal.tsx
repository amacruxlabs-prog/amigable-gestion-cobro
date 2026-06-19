import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Phone, Send, MessageSquare, CheckSquare, 
  Square, Play, Sparkles, Check, Edit2, Bot,
  Users, Upload, Loader2, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Transaction } from '../types';
import { localDb } from '../lib/localDb';
import { useUI } from '../contexts/UIContext';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

interface WhatsappBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onUpdatePhone?: (id: string, newPhone: string) => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  emoji: string;
  category: 'Cobrar' | 'Pagado' | 'Todos';
  body: string;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'receipt-overdue',
    name: 'Cobro Pendiente',
    emoji: '🔴',
    category: 'Cobrar',
    body: 'Hola {{cliente}}, espero estés teniendo un excelente día. Te escribimos para recordarte amablemente que posees un saldo pendiente de {{saldo_pendiente}} correspondiente a tu corte de fecha {{fecha}}. Agradecemos tu apoyo para resolver este pendiente. ¡Que tengas un excelente día!'
  },
  {
    id: 'receipt-urgent',
    name: 'Cobro Urgente',
    emoji: '⚠️',
    category: 'Cobrar',
    body: 'Estimado/a {{cliente}}, te contactamos para informarte sobre la cuenta pendiente por {{saldo_pendiente}} registrada el {{fecha}}. Te solicitamos amablemente ponerte en contacto para coordinar el pago. ¡Muchas gracias!'
  },
  {
    id: 'payment-received',
    name: 'Pago Recibido',
    emoji: '🟢',
    category: 'Pagado',
    body: '¡Hola {{cliente}}! Queremos confirmarte que hemos registrado con éxito tu pago por un monto de {{monto}} de la cuenta de fecha {{fecha}}. Te damos las gracias por tu pago oportuno. ¡Es un gusto atenderte!'
  },
  {
    id: 'promo-weekend',
    name: 'Aviso / Evento',
    emoji: '✨',
    category: 'Todos',
    body: '¡Hola {{cliente}}! Esperamos que nos visites pronto esta semana. Te escribimos para invitarte a nuestro próximo evento social.'
  }
];

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export const WhatsappBroadcastModal: React.FC<WhatsappBroadcastModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  onUpdatePhone 
}) => {
  const [audienceType, setAudienceType] = useState<'todos' | 'Cobrar' | 'Pagado'>('Cobrar');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('receipt-overdue');
  const [messageBody, setMessageBody] = useState<string>(TEMPLATE_PRESETS[0].body);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [editingPhoneTxId, setEditingPhoneTxId] = useState<string | null>(null);
  const [tempPhoneVal, setTempPhoneVal] = useState<string>('');
  const [isRunningWizard, setIsRunningWizard] = useState(false);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [wizardSendLogs, setWizardSendLogs] = useState<Record<string, 'pending' | 'sent' | 'skipped'>>({});
  const [autoDiscount, setAutoDiscount] = useState<boolean>(true);
  const { alert, confirm, toast } = useUI();
  const { businessId } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const targetBusinessId = businessId || 'demo-business-1';
      const unsub = localDb.subscribeDoc('settings', String(targetBusinessId), (data) => {
        if (data && data.aiSuggestDiscount !== undefined) {
          setAutoDiscount(data.aiSuggestDiscount);
        }
      });
      return () => unsub();
    }
  }, [isOpen, businessId]);

  useEffect(() => {
    const preset = TEMPLATE_PRESETS.find(p => p.id === selectedTemplateId);
    if (preset) {
      setMessageBody(preset.body);
      setAudienceType(preset.category === 'Cobrar' ? 'Cobrar' : preset.category === 'Pagado' ? 'Pagado' : 'todos');
    }
  }, [selectedTemplateId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('La imagen es muy grande. Máximo 10MB.', 'error'); return; }
    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl: reader.result }) });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        if (data.url) setImageUrl(data.url);
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch { toast('Error al subir la imagen.', 'error'); setIsUploadingImage(false); }
  };

  const targetClients = useMemo(() =>
    transactions.filter(t => audienceType === 'todos' || t.status === audienceType),
    [transactions, audienceType]
  );

  useEffect(() => {
    setSelectedTxIds(new Set(targetClients.map(t => t.id)));
  }, [targetClients]);

  const compileMessage = (text: string, tx: Transaction): string => {
    let r = text
      .replace(/{{cliente}}/g, tx.clientName || 'Cliente')
      .replace(/{{monto}}/g, formatCOP(tx.amount))
      .replace(/{{fecha}}/g, tx.date || '')
      .replace(/{{saldo_pendiente}}/g, formatCOP(Math.max(0, tx.amount - (tx.paidAmount || 0))))
      .replace(/{{telefono}}/g, tx.phone || 'Sin teléfono');
    if (autoDiscount && tx.status === 'Cobrar') {
      const disc = formatCOP(Math.max(0, tx.amount - (tx.paidAmount || 0)) * 0.95);
      r += `\n\n💡 *Beneficio Especial:* Paga en las próximas 48h con 5% de descuento: ${disc}.`;
    }
    if (imageUrl.trim()) r += `\n\n${imageUrl.trim()}`;
    return r;
  };

  const samplePreview = useMemo(() => {
    if (targetClients.length === 0) return 'Ningún cliente cumple las condiciones.';
    return compileMessage(messageBody, targetClients[0]);
  }, [messageBody, targetClients, autoDiscount, imageUrl]);

  const toggleSelectAll = () => {
    setSelectedTxIds(selectedTxIds.size === targetClients.length ? new Set() : new Set(targetClients.map(t => t.id)));
  };

  const toggleSelectTx = (id: string) => {
    const next = new Set(selectedTxIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTxIds(next);
  };

  const handleSendIndividual = (tx: Transaction) => {
    if (!tx.phone) { toast('Ingresa un número para este cliente.', 'error'); return; }
    const url = `https://api.whatsapp.com/send?phone=${tx.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(compileMessage(messageBody, tx))}`;
    window.open(url, '_blank', 'noreferrer,noopener');
  };

  const startSendWizard = () => {
    const list = targetClients.filter(t => selectedTxIds.has(t.id));
    if (list.length === 0) { toast('Selecciona al menos un destinatario.', 'warning'); return; }
    const blankCount = list.filter(c => !c.phone).length;
    
    const executeWizard = async () => {
      const logs: Record<string, 'pending' | 'sent' | 'skipped'> = {};
      list.forEach(c => { logs[c.id] = 'pending'; });
      setWizardSendLogs(logs);
      setIsRunningWizard(true);
      setWizardIndex(0);
      
      try {
        await api.post('/tenant/whatsapp/broadcast', {
          message: messageBody,
          audience: list.map(c => Number(c.id))
        });
      } catch (e) {
        toast('Error al registrar logs en el servidor', 'error');
      }
    };

    if (blankCount > 0) {
      confirm({
        title: 'Clientes sin número',
        message: `${blankCount} clientes no tienen teléfono registrado. Serán omitidos o deberás saltarlos manualmente. ¿Continuar de todas formas?`,
        type: 'warning',
        confirmText: 'Sí, continuar',
        onConfirm: executeWizard
      });
    } else {
      executeWizard();
    }
  };

  const selectedWizardClients = useMemo(() =>
    targetClients.filter(t => selectedTxIds.has(t.id)),
    [targetClients, selectedTxIds]
  );

  const currentWizardTx = selectedWizardClients[wizardIndex] || null;

  const handleWizardAction = (action: 'send' | 'skip') => {
    if (!currentWizardTx) return;
    const logs: Record<string, "pending" | "sent" | "skipped"> = { ...wizardSendLogs, [currentWizardTx.id]: action === 'send' ? 'sent' : 'skipped' };
    if (action === 'send') handleSendIndividual(currentWizardTx);
    setWizardSendLogs(logs);
    if (wizardIndex < selectedWizardClients.length - 1) {
      setWizardIndex(prev => prev + 1);
    } else {
      setTimeout(() => { 
        toast('🎉 ¡Asistente de difusión completado!', 'success'); 
        setIsRunningWizard(false); 
      }, 500);
    }
  };

  const missingPhoneCount = targetClients.filter(t => selectedTxIds.has(t.id) && !t.phone).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/70 z-[110] backdrop-blur-sm cursor-pointer"
          />

          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-[#FFFFFF] dark:bg-slate-900 w-full max-w-6xl h-[92vh] flex flex-col rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              {/* ── HEADER ── */}
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#6366F1]/10 flex items-center justify-center border border-[#6366F1]/20">
                    <MessageSquare className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">Difusión de WhatsApp</h3>
                    <p className="text-xs text-slate-500 font-medium">Envía mensajes personalizados a grupos de clientes</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── BODY ── */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-[#F8FAFC] dark:bg-slate-950">

                {/* LEFT — Configuración */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">

                  {/* Step 1: Audiencia */}
                  <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-[#6366F1] text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">1</div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Selección de Audiencia</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { type: 'todos', label: 'Todos', count: transactions.length },
                        { type: 'Cobrar', label: 'Por Cobrar', count: transactions.filter(t => t.status === 'Cobrar').length },
                        { type: 'Pagado', label: 'Pagados', count: transactions.filter(t => t.status === 'Pagado').length }
                      ].map(aud => (
                        <button
                          key={aud.type}
                          type="button"
                          onClick={() => setAudienceType(aud.type as any)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer border ${
                            audienceType === aud.type
                              ? 'bg-[#6366F1] text-white border-[#6366F1] shadow-sm'
                              : 'bg-[#F8FAFC] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{aud.label}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                            audienceType === aud.type ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}>{aud.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Plantilla */}
                  <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-[#6366F1] text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">2</div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Plantilla del Mensaje</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {TEMPLATE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setSelectedTemplateId(preset.id)}
                          className={`text-left p-3 rounded-md border transition-all cursor-pointer ${
                            selectedTemplateId === preset.id
                              ? 'bg-[#6366F1]/5 border-[#6366F1] ring-1 ring-[#6366F1]'
                              : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <span>{preset.emoji}</span>
                              <span>{preset.name}</span>
                            </p>
                            <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                              selectedTemplateId === preset.id ? 'bg-[#6366F1]/10 text-[#6366F1]' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                              {preset.category === 'Todos' ? 'Masivo' : preset.category}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={6}
                        value={messageBody}
                        onChange={e => setMessageBody(e.target.value)}
                        placeholder="Redacta el mensaje..."
                        className="w-full text-sm bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] rounded-md p-3.5 outline-none resize-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-200 transition"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-60 pointer-events-none">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-mono text-slate-400">{messageBody.length} chars</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-semibold text-slate-500">Variables:</span>
                      {['{{cliente}}', '{{monto}}', '{{saldo_pendiente}}', '{{fecha}}'].map(v => (
                        <span
                          key={v}
                          onClick={() => setMessageBody(prev => prev + v)}
                          className="text-[11px] bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-mono cursor-pointer hover:bg-[#6366F1]/10 hover:text-[#6366F1] hover:border-[#6366F1]/30 transition font-medium"
                        >
                          {v}
                        </span>
                      ))}
                    </div>

                    {/* Imagen opcional */}
                    <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="relative flex-1">
                        <Upload className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={e => setImageUrl(e.target.value)}
                          placeholder="Adjuntar URL de imagen opcional..."
                          className="w-full pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 focus:border-[#6366F1] rounded-md py-2.5 outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 transition"
                        />
                      </div>
                      <input type="file" id="upload-wa-img" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <label
                        htmlFor="upload-wa-img"
                        className={`flex items-center justify-center p-2.5 rounded-md border cursor-pointer transition shrink-0 ${isUploadingImage ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400' : 'border-slate-200 bg-[#FFFFFF] text-slate-600 hover:bg-[#6366F1]/5 hover:text-[#6366F1] hover:border-[#6366F1]/30 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-[#6366F1]/10'}`}
                        title="Subir desde PC"
                      >
                        {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </label>
                    </div>
                  </div>

                  {/* Step 3: Vista previa */}
                  <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[#6366F1] text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">3</div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Vista Previa</h4>
                    </div>
                    <div className="bg-[#DBEAFE] dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">Simulación (1er cliente)</span>
                      </div>
                      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                        {samplePreview}
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT — Destinatarios */}
                <div className="w-full lg:w-96 flex flex-col min-h-0 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900">

                  {/* Right header */}
                  <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-[#6366F1] dark:text-slate-500 dark:hover:text-[#6366F1] transition cursor-pointer"
                      >
                        {selectedTxIds.size === targetClients.length && targetClients.length > 0
                          ? <CheckSquare className="w-5 h-5 text-[#6366F1]" />
                          : <Square className="w-5 h-5" />
                        }
                      </button>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          <span className="text-[#6366F1]">{selectedTxIds.size}</span>
                          <span className="text-slate-400 font-medium"> / {targetClients.length} Destinatarios</span>
                        </p>
                      </div>
                    </div>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Warning if missing phones */}
                  {missingPhoneCount > 0 && (
                    <div className="mx-4 mt-4 flex items-center gap-2 bg-[#FEF3C7] border border-amber-200 rounded-md px-3 py-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                      <span className="text-xs text-[#D97706] font-semibold">
                        {missingPhoneCount} cliente(s) sin teléfono registrado
                      </span>
                    </div>
                  )}

                  {/* Recipients list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {targetClients.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                        <Users className="w-10 h-10 mb-3 text-slate-200 dark:text-slate-700" />
                        <p className="text-sm font-medium">No hay clientes en esta categoría.</p>
                      </div>
                    ) : (
                      targetClients.map(tx => {
                        const isSelected = selectedTxIds.has(tx.id);
                        const isEditing = editingPhoneTxId === tx.id;
                        return (
                          <div
                            key={tx.id}
                            className={`flex items-center gap-3 p-3 rounded-md transition-colors cursor-pointer group border ${
                              isSelected
                                ? 'bg-[#6366F1]/5 border-[#6366F1]/30 shadow-sm'
                                : 'bg-[#FFFFFF] dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                            }`}
                            onClick={() => !isEditing && toggleSelectTx(tx.id)}
                          >
                            <button
                              onClick={e => { e.stopPropagation(); toggleSelectTx(tx.id); }}
                              className="text-slate-300 dark:text-slate-500 hover:text-[#6366F1] dark:hover:text-[#6366F1] shrink-0 transition"
                            >
                              {isSelected
                                ? <CheckSquare className="w-4.5 h-4.5 text-[#6366F1]" />
                                : <Square className="w-4.5 h-4.5" />
                              }
                            </button>

                            <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                              <p className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                {tx.clientName}
                              </p>
                              <div className="mt-1">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={tempPhoneVal}
                                      onChange={e => setTempPhoneVal(e.target.value)}
                                      className="text-xs border border-slate-300 rounded-md px-2 py-1 w-28 outline-none focus:border-[#6366F1]"
                                      placeholder="+57..."
                                      autoFocus
                                      onKeyDown={e => { if (e.key === 'Enter') { onUpdatePhone?.(tx.id, tempPhoneVal.trim()); setEditingPhoneTxId(null); } if (e.key === 'Escape') setEditingPhoneTxId(null); }}
                                    />
                                    <button onClick={() => { onUpdatePhone?.(tx.id, tempPhoneVal.trim()); setEditingPhoneTxId(null); }} className="text-[#059669] hover:bg-slate-100 p-1 rounded-md">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {tx.phone ? (
                                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1 font-medium">
                                        <Phone className="w-3 h-3 text-slate-400" />{tx.phone}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                                        Falta Telf
                                      </span>
                                    )}
                                    <button
                                      onClick={() => { setEditingPhoneTxId(tx.id); setTempPhoneVal(tx.phone || ''); }}
                                      className="text-slate-400 hover:text-[#06B6D4] p-1 rounded-md transition cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1.5" onClick={e => e.stopPropagation()}>
                              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                {formatCOP(tx.amount)}
                              </span>
                              <button
                                onClick={() => handleSendIndividual(tx)}
                                className="p-1.5 bg-[#F8FAFC] hover:bg-[#6366F1]/10 text-slate-500 hover:text-[#6366F1] rounded-md transition border border-slate-200 hover:border-[#6366F1]/30 cursor-pointer shadow-sm"
                                title="Enviar mensaje individual"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* ── FOOTER ── */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 flex items-center justify-between gap-4 rounded-b-lg">
                <p className="text-xs text-slate-500 font-medium hidden sm:block">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[#6366F1]" />
                    Al iniciar, se abrirán ventanas de WhatsApp Web individuales para evitar filtros anti-spam.
                  </span>
                </p>
                <button
                  onClick={startSendWizard}
                  disabled={targetClients.length === 0 || selectedTxIds.size === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4f46e5] text-white font-bold text-sm py-2.5 px-6 rounded-md cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-sm transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Asistente ({selectedTxIds.size})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* ── WIZARD MODAL ── */}
          <AnimatePresence>
            {isRunningWizard && (
              <div className="fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 12 }}
                  transition={{ type: 'spring', duration: 0.3 }}
                  className="bg-[#FFFFFF] dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden"
                >
                  {/* Wizard header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-[#6366F1]/10 flex items-center justify-center border border-[#6366F1]/20">
                        <Bot className="w-4.5 h-4.5 text-[#6366F1]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Asistente de Envío</p>
                        <p className="text-[10px] text-slate-500 font-medium">Cliente {wizardIndex + 1} de {selectedWizardClients.length}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsRunningWizard(false)}
                      className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 cursor-pointer transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="px-5 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">Progreso General</span>
                      <span className="text-xs font-bold text-[#6366F1] font-mono">
                        {Math.round(((wizardIndex) / selectedWizardClients.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-[#6366F1] transition-all duration-500 rounded-md"
                        style={{ width: `${(wizardIndex / selectedWizardClients.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Current client card */}
                  {currentWizardTx ? (
                    <div className="p-5 space-y-5">
                      <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-3 border-b border-slate-200 pb-3">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate pr-2">{currentWizardTx.clientName}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm shrink-0 ${
                            currentWizardTx.status === 'Cobrar' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#D1FAE5] text-[#059669]'
                          }`}>
                            {currentWizardTx.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-wide">Celular</p>
                            <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{currentWizardTx.phone || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-wide">Monto</p>
                            <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">{formatCOP(currentWizardTx.amount)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={() => handleWizardAction('skip')}
                          className="py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition cursor-pointer shadow-sm"
                        >
                          Saltar
                        </button>
                        <button
                          onClick={() => handleWizardAction('send')}
                          className="py-2.5 rounded-md bg-[#6366F1] hover:bg-[#4f46e5] text-white font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                          Enviar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm font-medium text-slate-500">Cargando datos...</div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
