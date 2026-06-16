import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Phone, Send, Info, MessageSquare, CheckSquare, 
  Square, Calendar, ChevronRight, Play, AlertCircle, Sparkles, Check, Edit2, CheckSquare2, Bot,
  FileEdit, Users, Upload, Loader2
} from 'lucide-react';
import { Transaction } from '../types';
import { db, doc, getDoc, onSnapshot } from '../lib/firebase';

interface WhatsappBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onUpdatePhone?: (id: string, newPhone: string) => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  category: 'Cobrar' | 'Pagado' | 'Todos';
  subject: string;
  body: string;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'receipt-overdue',
    name: '🔴 Cobro Pendiente',
    category: 'Cobrar',
    subject: 'Recordatorio de cuenta por cobrar',
    body: 'Hola {{cliente}}, espero estés teniendo un excelente día. Te escribimos desde Mouna para recordarte amablemente que posees un saldo pendiente de {{saldo_pendiente}} correspondiente a tu último corte de fecha {{fecha}}. Agradecemos tu valiosa confianza y apoyo para resolver este pendiente. ¡Que tengas un excelente día!'
  },
  {
    id: 'receipt-urgent',
    name: '⚠️ Cobro Urgente',
    category: 'Cobrar',
    subject: 'Notificación de cuenta pendiente importante',
    body: 'Estimado/a {{cliente}}, te contactamos para informarte sobre la cuota o cuenta pendiente por {{saldo_pendiente}} registrada el {{fecha}}. Te solicitamos amablemente ponerte en contacto para coordinar el pago en el club. Valoramos mucho tu preferencia y tu pronta respuesta. ¡Muchas gracias!'
  },
  {
    id: 'payment-received',
    name: '🟢 Pago Recibido',
    category: 'Pagado',
    subject: 'Confirmación de pago registrado',
    body: '¡Hola {{cliente}}! Queremos confirmarte que hemos registrado con éxito tu pago por un monto total de {{monto}} de la cuenta de fecha {{fecha}}. Te damos las gracias por tu pago oportuno y por tu preferencia continua. ¡Es un gusto atenderte en el club!'
  },
  {
    id: 'promo-weekend',
    name: '✨ Evento o Promo Fin de Semana',
    category: 'Todos',
    subject: 'Invitación especial y evento',
    body: '¡Hola {{cliente}}! Esperamos que nos visites pronto esta semana en el club. Te escribimos para invitarte al próximo evento social de este fin de semana. Nos encantaría verte de nuevo. ¡Ven a disfrutar con tu familia!'
  }
];

export const WhatsappBroadcastModal: React.FC<WhatsappBroadcastModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  onUpdatePhone 
}) => {
  // 1. Audience state
  const [audienceType, setAudienceType] = useState<'todos' | 'Cobrar' | 'Pagado'>('Cobrar');
  
  // 2. Message template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('receipt-overdue');
  const [messageBody, setMessageBody] = useState<string>(TEMPLATE_PRESETS[0].body);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 3. Selection list state
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // 4. Editing state for inline phone number fix
  const [editingPhoneTxId, setEditingPhoneTxId] = useState<string | null>(null);
  const [tempPhoneVal, setTempPhoneVal] = useState<string>('');

  // 5. Bulk Delivery Wizard State
  const [isRunningWizard, setIsRunningWizard] = useState(false);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [wizardSendLogs, setWizardSendLogs] = useState<Record<string, 'pending' | 'sent' | 'skipped'>>({});

  // 6. Global Settings tracking
  const [autoDiscount, setAutoDiscount] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().aiSuggestDiscount !== undefined) {
          setAutoDiscount(docSnap.data().aiSuggestDiscount);
        }
      }, (err) => {
        console.warn("Global settings WA modal snapshot error", err);
      });
      return () => unsub();
    }
  }, [isOpen]);

  // Compile active preset change
  useEffect(() => {
    const preset = TEMPLATE_PRESETS.find(p => p.id === selectedTemplateId);
    if (preset) {
      setMessageBody(preset.body);
      // Auto adjust audience type key
      if (preset.category === 'Cobrar') {
        setAudienceType('Cobrar');
      } else if (preset.category === 'Pagado') {
        setAudienceType('Pagado');
      } else {
        setAudienceType('todos');
      }
    }
  }, [selectedTemplateId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen es muy grande. El tamaño máximo es 10MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result;
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl })
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        if (data.url) {
          setImageUrl(data.url);
        }
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      alert("Error al subir la imagen. Por favor intenta con otra o pega una URL directamente.");
      setIsUploadingImage(false);
    }
  };

  // Derived audience based on filter
  const targetClients = useMemo(() => {
    return transactions.filter(t => {
      if (audienceType === 'todos') return true;
      return t.status === audienceType;
    });
  }, [transactions, audienceType]);

  // Reset selected checkboxes when audience type changes
  useEffect(() => {
    const initialIds = new Set(targetClients.map(t => t.id));
    setSelectedTxIds(initialIds);
  }, [targetClients]);

  // Helper to compile placeholders for a given transaction
  const compileMessage = (templateText: string, tx: Transaction): string => {
    let result = templateText;
    
    const formattedAmount = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tx.amount);
    const formattedPaid = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tx.paidAmount || 0);
    const balanceValue = Math.max(0, tx.amount - (tx.paidAmount || 0));
    const formattedBalance = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(balanceValue);

    result = result.replace(/{{cliente}}/g, tx.clientName || 'Cliente');
    result = result.replace(/{{monto}}/g, formattedAmount);
    result = result.replace(/{{fecha}}/g, tx.date || '');
    result = result.replace(/{{saldo_pendiente}}/g, formattedBalance);
    result = result.replace(/{{telefono}}/g, tx.phone || 'Sin télefono');
    
    // Add custom optional early discount if configured globally
    if (autoDiscount && tx.status === 'Cobrar') {
      const discountVal = balanceValue * 0.95; // 5% discount
      const formattedDiscount = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(discountVal);
      result += `\n\n💡 *Beneficio Especial:* Realiza tu abono en las próximas 48 horas y liquida la cuenta con el 5% de descuento por un monto de pago neto de ${formattedDiscount}.`;
    }

    if (imageUrl.trim()) {
      result += `\n\n${imageUrl.trim()}`;
    }

    return result;
  };

  // Compile sample preview
  const samplePreview = useMemo(() => {
    if (targetClients.length === 0) return 'Ningún cliente cumple las condiciones.';
    // Pick the first client or any selected client for the sample
    const sampleTx = targetClients[0];
    return compileMessage(messageBody, sampleTx);
  }, [messageBody, targetClients]);

  // Checkbox functions
  const toggleSelectAll = () => {
    if (selectedTxIds.size === targetClients.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(targetClients.map(t => t.id)));
    }
  };

  const toggleSelectTx = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTxIds(next);
  };

  const handleEditPhone = (txId: string, currentVal: string) => {
    setEditingPhoneTxId(txId);
    setTempPhoneVal(currentVal || '');
  };

  const handleSavePhone = (txId: string) => {
    if (onUpdatePhone) {
      onUpdatePhone(txId, tempPhoneVal.trim());
    }
    setEditingPhoneTxId(null);
  };

  // Open individual WhatsApp click to chat Link
  const handleSendIndividual = (tx: Transaction) => {
    if (!tx.phone) {
      alert('Ingresa un número telefónico para este cliente antes de abrir WhatsApp.');
      return;
    }
    const compiled = compileMessage(messageBody, tx);
    // Sanitize phone: remove any characters except digits and plus
    const cleanPhone = tx.phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(compiled)}`;
    window.open(url, '_blank', 'noreferrer,noopener');
  };

  // Launch wizard sender flows
  const startSendWizard = () => {
    const selectedClientsList = targetClients.filter(t => selectedTxIds.has(t.id));
    if (selectedClientsList.length === 0) {
      alert('Por favor selecciona al menos un destinatario para iniciar el envío.');
      return;
    }
    
    // Check if any selected clients have blank phones
    const blankCount = selectedClientsList.filter(c => !c.phone).length;
    if (blankCount > 0) {
      if (!window.confirm(`Se requiere teléfono para enviar WhatsApp. Hay ${blankCount} clientes seleccionados que no tienen número. ¿Deseas continuar con el asistente?`)) {
        return;
      }
    }

    const logs: Record<string, 'pending' | 'sent' | 'skipped'> = {};
    selectedClientsList.forEach(c => {
      logs[c.id] = 'pending';
    });
    
    setWizardSendLogs(logs);
    setIsRunningWizard(true);
    setWizardIndex(0);
  };

  const selectedWizardClients = useMemo(() => {
    return targetClients.filter(t => selectedTxIds.has(t.id));
  }, [targetClients, selectedTxIds]);

  const currentWizardTx = useMemo(() => {
    return selectedWizardClients[wizardIndex] || null;
  }, [selectedWizardClients, wizardIndex]);

  // Execute wizard steps actions in series
  const handleWizardAction = (action: 'send' | 'skip') => {
    if (!currentWizardTx) return;

    const updatedLogs = { ...wizardSendLogs };
    
    if (action === 'send') {
      updatedLogs[currentWizardTx.id] = 'sent';
      handleSendIndividual(currentWizardTx);
    } else {
      updatedLogs[currentWizardTx.id] = 'skipped';
    }

    setWizardSendLogs(updatedLogs);

    if (wizardIndex < selectedWizardClients.length - 1) {
      setWizardIndex(prev => prev + 1);
    } else {
      setTimeout(() => {
        alert('🎉 ¡Asistente de difusión completado!');
        setIsRunningWizard(false);
      }, 500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 z-[110] backdrop-blur-[2px] cursor-pointer"
          />

          <div className="fixed inset-0 z-[120] overflow-hidden flex items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
              className="bg-white md:rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/10 w-full max-w-5xl h-[100dvh] md:h-[90vh] flex flex-col border border-x-0 md:border-x border-slate-200"
            >
              
              {/* Header */}
              <div className="bg-white p-5 px-6 shrink-0 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg text-slate-800 flex items-center gap-2">
                      Difusión de WhatsApp
                      <span className="hidden md:inline-block bg-emerald-100 text-emerald-700 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">Web / Mobile</span>
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 mt-0.5">Sincroniza y envía alertas a tus clientes en segundos</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus:outline-hidden"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 min-h-0">
                
                {/* LEFT COLUMN */}
                <div className="space-y-6 flex flex-col lg:h-full min-h-0">
                  
                  {/* Select Templates */}
                  <div className="shrink-0">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2 dark:text-slate-200">
                      <FileEdit className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Plantilla del Mensaje
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {TEMPLATE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setSelectedTemplateId(preset.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all text-sm cursor-pointer flex flex-col justify-between items-start gap-1 ${
                            selectedTemplateId === preset.id 
                              ? 'bg-emerald-50 border-emerald-200 shadow-xs ring-1 ring-emerald-500/10 dark:bg-emerald-900/30 dark:border-emerald-600 dark:ring-emerald-500/30' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className={`font-semibold text-xs leading-tight ${selectedTemplateId === preset.id ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-300'}`}>{preset.name}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                            selectedTemplateId === preset.id ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {preset.category === 'Todos' ? 'Masivo' : preset.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="flex-1 flex flex-col min-h-[160px]">
                    <textarea
                      rows={5}
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Redacta el mensaje de difusión..."
                      className="w-full flex-1 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm border border-slate-200 focus:border-emerald-500 rounded-xl p-4 outline-hidden transition-all text-slate-700 resize-none placeholder-slate-400 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                    />
                    
                    <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-1 dark:text-slate-500">Variables:</span>
                      {['{{cliente}}', '{{monto}}', '{{saldo_pendiente}}', '{{fecha}}'].map(v => (
                        <span key={v} className="text-[10px] bg-slate-100/80 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 font-mono transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300">
                          {v}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="Enlace a imagen opcional o sube una galería..."
                          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 focus:border-emerald-500 rounded-lg outline-hidden text-slate-700 transition dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-800"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      
                      <div className="shrink-0 flex items-center justify-center">
                        <input 
                          type="file" 
                          id="upload-whatsapp-img" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                        />
                        <label 
                          htmlFor="upload-whatsapp-img" 
                          className={`flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-500 cursor-pointer transition flex-none dark:border-slate-700 dark:text-slate-400
                           ${isUploadingImage ? 'bg-slate-100 opacity-50 cursor-not-allowed dark:bg-slate-800' : 'bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:text-emerald-300'}`}
                          title="Subir imagen desde galería"
                        >
                          {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Sample Preview */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left shrink-0 dark:bg-slate-800/50 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5 dark:text-slate-500">
                      <Sparkles className="w-3.5 h-3.5" />
                      Vista Previa
                    </span>
                    <div className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line border-l-2 border-emerald-400 pl-3 dark:text-slate-300">
                      {samplePreview}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6 flex flex-col lg:h-full min-h-0">
                  
                  {/* Select Audience */}
                  <div className="shrink-0">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2 dark:text-slate-200">
                       <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Audiencia
                    </h4>
                    <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 shrink-0 dark:bg-slate-800/80 dark:border-slate-700">
                      {[
                        { type: 'todos', label: 'Todos', count: transactions.length },
                        { type: 'Cobrar', label: 'Por cobrar', count: transactions.filter(t => t.status === 'Cobrar').length },
                        { type: 'Pagado', label: 'Pagados', count: transactions.filter(t => t.status === 'Pagado').length }
                      ].map(aud => (
                        <button
                          key={aud.type}
                          type="button"
                          onClick={() => setAudienceType(aud.type as any)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            audienceType === aud.type 
                              ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/50 dark:bg-slate-700 dark:text-emerald-400 dark:ring-slate-600' 
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span>{aud.label}</span>
                          <span className={`${audienceType === aud.type ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'} text-[10px] px-1.5 py-0.5 rounded-full font-mono`}>{aud.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipients List  */}
                  <div className="lg:flex-1 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white lg:min-h-[220px] dark:bg-slate-900/40 dark:border-slate-800">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 dark:bg-slate-800/80 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={toggleSelectAll}
                          className="text-slate-400 hover:text-emerald-600 transition dark:text-slate-500 dark:hover:text-emerald-400"
                        >
                          {selectedTxIds.size === targetClients.length ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          <span className="text-emerald-700 font-bold dark:text-emerald-400">{selectedTxIds.size}</span> destinatarios
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-1.5 py-2">
                      {targetClients.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          <Users className="w-8 h-8 text-slate-200 mb-2 dark:text-slate-700" />
                          No hay clientes en esta categoría.
                        </div>
                      ) : (
                        targetClients.map(tx => (
                          <div 
                            key={tx.id} 
                            className={`p-2.5 px-3 flex items-center justify-between gap-3 text-sm transition-colors rounded-xl mx-0.5 my-0.5 ${
                              selectedTxIds.has(tx.id) ? 'bg-slate-50 dark:bg-slate-800/80' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => toggleSelectTx(tx.id)}
                                className="text-slate-300 hover:text-emerald-600 shrink-0 dark:text-slate-600 dark:hover:text-emerald-400"
                              >
                                {selectedTxIds.has(tx.id) ? (
                                  <CheckSquare className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-500" />
                                ) : (
                                  <Square className="w-4.5 h-4.5" />
                                )}
                              </button>

                              <div className="text-left min-w-0">
                                <span className={`font-semibold block leading-tight truncate ${selectedTxIds.has(tx.id) ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>{tx.clientName}</span>
                                
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {editingPhoneTxId === tx.id ? (
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded-md dark:bg-slate-800 dark:border-slate-600">
                                      <input
                                        type="text"
                                        value={tempPhoneVal}
                                        onChange={(e) => setTempPhoneVal(e.target.value)}
                                        className="text-[10px] bg-transparent w-24 p-0.5 px-1 outline-hidden dark:text-slate-200"
                                        placeholder="+58 celular"
                                        autoFocus
                                      />
                                      <button onClick={() => handleSavePhone(tx.id)} className="text-emerald-600 hover:bg-slate-100 p-0.5 rounded dark:text-emerald-400 dark:hover:bg-slate-700"><Check className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => setEditingPhoneTxId(null)} className="text-red-500 hover:bg-slate-100 p-0.5 rounded dark:text-red-400 dark:hover:bg-slate-700"><X className="w-3.5 h-3.5"/></button>
                                    </div>
                                  ) : (
                                    <>
                                      {tx.phone ? (
                                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 dark:text-slate-500">
                                          <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {tx.phone}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50">
                                          Sin teléfono
                                        </span>
                                      )}
                                      <button onClick={() => handleEditPhone(tx.id, tx.phone || '')} className="text-slate-300 hover:text-slate-600 p-0.5 rounded dark:text-slate-600 dark:hover:text-slate-400" title="Editar"><Edit2 className="w-3 h-3"/></button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-semibold text-slate-700 block dark:text-slate-300">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tx.amount)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleSendIndividual(tx)}
                                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition border border-emerald-100/50 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40 dark:text-emerald-400 dark:border-emerald-800/30"
                                title="Enviar individual"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* BOTTOM CTA Footer */}
              <div className="bg-white border-t border-slate-100 p-4 md:px-6 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800">
                <p className="hidden md:block text-xs text-slate-400 max-w-sm leading-tight dark:text-slate-500">
                  Esta herramienta abre pestañas de WhatsApp individualmente sin infringir políticas anti-spam.
                </p>
                <div className="w-full md:w-auto flex flex-col gap-2">
                  <button
                    onClick={startSendWizard}
                    disabled={targetClients.length === 0 || selectedTxIds.size === 0}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-bold text-sm py-3.5 md:py-3 md:px-8 rounded-2xl cursor-pointer disabled:opacity-50 disabled:active:scale-100 shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-600"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Asistente ({selectedTxIds.size})</span>
                  </button>
                  <p className="md:hidden text-center text-[10px] text-slate-400 leading-none dark:text-slate-500">
                    Se abre una pestaña por mensaje.
                  </p>
                </div>
              </div>

            </motion.div>
          </div>

          {/* WIZARD MODAL */}
          <AnimatePresence>
            {isRunningWizard && (
              <div className="fixed inset-0 z-[130] overflow-hidden bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl w-full max-w-sm p-6 text-center relative"
                >
                  <button 
                    onClick={() => setIsRunningWizard(false)}
                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Bot className="w-8 h-8 text-emerald-600" />
                  </div>
                  
                  <h4 className="font-bold text-base text-slate-800">Cola de Envíos</h4>
                  <p className="text-xs text-slate-500 mt-1">Sincronizando con WhatsApp Web</p>

                  {currentWizardTx ? (
                    <div className="mt-6 space-y-5">
                      
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left shadow-xs">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cliente {wizardIndex + 1} de {selectedWizardClients.length}</span>
                            <span className="text-sm font-bold text-slate-800 block truncate">{currentWizardTx.clientName}</span>
                          </div>
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold ${
                            currentWizardTx.status === 'Cobrar' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {currentWizardTx.status}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end border-t border-slate-200/60 pt-3 mt-3">
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Celular</span>
                            <span className="text-xs font-mono font-medium text-slate-700">{currentWizardTx.phone || 'N/A'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block mb-0.5">Monto</span>
                            <span className="text-xs font-bold text-slate-800">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(currentWizardTx.amount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-600 font-medium">
                          <span>Progreso</span>
                          <span>{((wizardIndex + 1) / selectedWizardClients.length * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${((wizardIndex + 1) / selectedWizardClients.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => handleWizardAction('skip')}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm py-3 rounded-xl transition cursor-pointer shadow-xs"
                        >
                          Saltar
                        </button>
                        
                        <button
                          onClick={() => handleWizardAction('send')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl cursor-pointer transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                          <span>Enviar</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="py-10 text-sm text-slate-500">
                      Cargando envíos...
                    </div>
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
