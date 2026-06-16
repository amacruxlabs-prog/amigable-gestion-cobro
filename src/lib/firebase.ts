import { DEMO_TRANSACTIONS } from '../data/demoData';

// Types compatible with React
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// ----------------------------------------------------
// Mock Auth Implementation
// ----------------------------------------------------
class MockAuth {
  private authListeners = new Set<(user: User | null) => void>();
  public currentUser: User | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('mock_auth_user');
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch (e) {
          this.currentUser = null;
        }
      }
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.authListeners.add(callback);
    // Initial call
    setTimeout(() => {
      callback(this.currentUser);
    }, 0);
    return () => {
      this.authListeners.delete(callback);
    };
  }

  triggerChange() {
    this.authListeners.forEach(cb => cb(this.currentUser));
  }

  async signIn(email: string) {
    const user: User = {
      uid: `user_${email.replace(/[@.]/g, '_')}`,
      email: email,
      displayName: email.split('@')[0],
      emailVerified: true
    };
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_auth_user', JSON.stringify(user));
      
      // Auto-create a mock role for this email if it doesn't exist
      const rolesData = JSON.parse(localStorage.getItem('mock_firestore_roles') || '{}');
      if (!rolesData[email]) {
        let role = 'visor';
        if (email === 'amacruxlabs@gmail.com') {
          role = 'superadmin';
        } else if (email === 'admin@amigable.com' || email.includes('admin')) {
          role = 'admin';
        }
        rolesData[email] = {
          role: role,
          assignedBy: 'system',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('mock_firestore_roles', JSON.stringify(rolesData));
        notifyListeners('roles', email);
      }
    }

    this.triggerChange();
  }

  async signOut() {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_auth_user');
    }
    this.triggerChange();
  }
}

export const app = {};
export const auth = new MockAuth();
export const db = {};

export class GoogleAuthProvider {
  setCustomParameters() {}
}

// Default signIn is mapped to superadmin fallback
export const signIn = async () => {
  await auth.signIn('amacruxlabs@gmail.com');
};

export const signOut = async () => {
  await auth.signOut();
};

export const onAuthStateChanged = (authObj: any, callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};

// ----------------------------------------------------
// Mock Firestore Implementation
// ----------------------------------------------------
const listeners = new Set<{
  type: 'doc' | 'collection' | 'query';
  collection: string;
  id?: string;
  callback: (snapshot: any) => void;
}>();

function notifyListeners(collectionName: string, docId?: string) {
  for (const listener of listeners) {
    if (listener.collection === collectionName) {
      if (listener.type === 'doc' && listener.id === docId) {
        listener.callback(getDocSnapshot(collectionName, docId!));
      } else if (listener.type === 'collection' || listener.type === 'query') {
        listener.callback(getCollectionSnapshot(collectionName));
      }
    }
  }
}

function getDocSnapshot(collectionName: string, docId: string) {
  if (typeof window === 'undefined') {
    return { exists: () => false, data: () => undefined, id: docId };
  }
  const collectionData = JSON.parse(localStorage.getItem(`mock_firestore_${collectionName}`) || '{}');
  const docData = collectionData[docId];
  return {
    exists: () => docData !== undefined,
    data: () => docData ? JSON.parse(JSON.stringify(docData)) : undefined,
    id: docId
  };
}

function getCollectionSnapshot(collectionName: string) {
  if (typeof window === 'undefined') {
    return { forEach: () => {}, docs: [] };
  }
  const collectionData = JSON.parse(localStorage.getItem(`mock_firestore_${collectionName}`) || '{}');
  const docs: any[] = [];
  Object.keys(collectionData).forEach(id => {
    docs.push({
      id,
      data: () => JSON.parse(JSON.stringify(collectionData[id])),
      exists: () => true
    });
  });
  
  if (collectionName === 'audit_logs') {
    docs.sort((a, b) => {
      const timeA = a.data().timestamp || '';
      const timeB = b.data().timestamp || '';
      return timeB.localeCompare(timeA); // desc
    });
  }

  return {
    forEach: (cb: (doc: any) => void) => {
      docs.forEach(cb);
    },
    docs
  };
}

// Initialize default data if empty
function initializeMockDatabase() {
  if (typeof window === 'undefined') return;

  // 1. Transactions
  if (!localStorage.getItem('mock_firestore_transactions')) {
    const txMap: Record<string, any> = {};
    DEMO_TRANSACTIONS.forEach(t => {
      txMap[t.id] = t;
    });
    localStorage.setItem('mock_firestore_transactions', JSON.stringify(txMap));
  }

  // 2. Global settings
  if (!localStorage.getItem('mock_firestore_settings')) {
    const settingsMap = {
      global: {
        availableHeaders: ['Nombre de Cliente', 'Monto Total', 'Estado de Pago', 'Fecha', 'Teléfono', 'Cédula', 'Dirección'],
        currentMapping: {
          clientNameKey: 'Nombre de Cliente', amountKey: 'Monto Total', statusKey: 'Estado de Pago',
          dateKey: 'Fecha', phoneKey: 'Teléfono', cedulaKey: 'Cédula', locationKey: 'Dirección'
        },
        sourceName: 'Set de Demostración',
        aiTone: 'Analítico y Profesional',
        aiInstructions: '',
        aiAutoAlert: true,
        aiSuggestDiscount: true
      }
    };
    localStorage.setItem('mock_firestore_settings', JSON.stringify(settingsMap));
  }

  // 3. Roles
  if (!localStorage.getItem('mock_firestore_roles')) {
    const rolesMap = {
      'amacruxlabs@gmail.com': {
        role: 'superadmin',
        assignedBy: 'system',
        updatedAt: new Date().toISOString()
      },
      'admin@amigable.com': {
        role: 'admin',
        assignedBy: 'system',
        updatedAt: new Date().toISOString()
      },
      'visor@amigable.com': {
        role: 'visor',
        assignedBy: 'system',
        updatedAt: new Date().toISOString()
      }
    };
    localStorage.setItem('mock_firestore_roles', JSON.stringify(rolesMap));
  }
}

// Call init
initializeMockDatabase();

// Firestore methods
export function initializeApp() { return {}; }
export function getFirestore() { return {}; }

export function doc(dbOrCol: any, collectionOrId: string, id?: string) {
  if (id) {
    return { type: 'doc', collection: collectionOrId, id };
  } else {
    // doc(db, 'settings/global') format or similar
    if (collectionOrId.includes('/')) {
      const parts = collectionOrId.split('/');
      return { type: 'doc', collection: parts[0], id: parts[1] };
    }
    return { type: 'doc', collection: dbOrCol, id: collectionOrId };
  }
}

export function collection(dbObj: any, name: string) {
  return { type: 'collection', name };
}

export function query(ref: any, ...constraints: any[]) {
  return { type: 'query', collection: ref.name || ref.collection, constraints };
}

export function orderBy(field: string, direction?: string) {
  return { type: 'orderBy', field, direction };
}

export function onSnapshot(ref: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  const collName = ref.collection || ref.name;
  const listener: any = {
    type: ref.type || 'collection',
    collection: collName,
    id: ref.id,
    callback: onNext
  };
  listeners.add(listener);

  // Trigger initial snapshot asynchronously
  setTimeout(() => {
    try {
      if (listener.type === 'doc') {
        onNext(getDocSnapshot(collName, listener.id));
      } else {
        onNext(getCollectionSnapshot(collName));
      }
    } catch (err) {
      if (onError) onError(err);
    }
  }, 0);

  return () => {
    listeners.delete(listener);
  };
}

export async function getDoc(docRef: any) {
  return getDocSnapshot(docRef.collection, docRef.id);
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }) {
  const collName = docRef.collection;
  const docId = docRef.id;
  const collectionData = JSON.parse(localStorage.getItem(`mock_firestore_${collName}`) || '{}');
  
  if (options?.merge && collectionData[docId]) {
    collectionData[docId] = { ...collectionData[docId], ...data };
  } else {
    collectionData[docId] = data;
  }
  
  localStorage.setItem(`mock_firestore_${collName}`, JSON.stringify(collectionData));
  notifyListeners(collName, docId);
}

export async function deleteDoc(docRef: any) {
  const collName = docRef.collection;
  const docId = docRef.id;
  const collectionData = JSON.parse(localStorage.getItem(`mock_firestore_${collName}`) || '{}');
  
  delete collectionData[docId];
  
  localStorage.setItem(`mock_firestore_${collName}`, JSON.stringify(collectionData));
  notifyListeners(collName, docId);
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore Mock Error during ${operationType} on ${path}:`, error);
}

// ----------------------------------------------------
// Mock Fetch Interceptor for AI Assistant
// ----------------------------------------------------
async function generateMockChatReply(body: any): Promise<string> {
  const { message, transactions, tone } = body;
  const msg = (message || '').toLowerCase();

  await new Promise(resolve => setTimeout(resolve, 800));

  const totalTxs = transactions.length;
  const unpaidTxs = transactions.filter((t: any) => t.s !== 'Pagado');
  const unpaidCount = unpaidTxs.length;
  const totalOverdue = unpaidTxs.reduce((sum: number, t: any) => sum + (t.a - (t.p || 0)), 0);
  const formattedOverdue = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalOverdue);

  if (msg.includes('auditar') || msg.includes('auditoria') || msg.includes('resumen') || msg.includes('estado')) {
    const topDebtors = [...unpaidTxs]
      .sort((a, b) => (b.a - (b.p || 0)) - (a.a - (a.p || 0)))
      .slice(0, 3);
    
    let debtorsText = '';
    topDebtors.forEach((d: any, index: number) => {
      const pending = d.a - (d.p || 0);
      const formattedPending = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(pending);
      debtorsText += `\n${index + 1}. **${d.c}**: Pendiente ${formattedPending}`;
    });

    return `📊 **Reporte de Auditoría Ejecutiva (Mouna IA)**

* **Estado Global:** Hay **${unpaidCount}** clientes con saldo pendiente de pago, acumulando un total de **${formattedOverdue}** por cobrar.
* **Socios con mayor deuda:**${debtorsText}
* **Estrategia sugerida:** Enviar la campaña de recordatorio por WhatsApp con el 5% de descuento por abonos oportunos en las próximas 48 horas.
* **Beneficio corto:** Implementar recordatorios preventivos automatizados disminuye la morosidad en un 23%.`;
  }

  if (msg.includes('whatsapp') || msg.includes('mensaje') || msg.includes('plantilla')) {
    return `📝 **Plantilla Sugerida para WhatsApp:**

"Hola {{cliente}}, de parte del club te recordamos que tienes un saldo pendiente de {{saldo_pendiente}}. Recuerda realizar tu pago antes de la fecha límite para evitar recargos. ¡Gracias por tu apoyo!"`;
  }

  // Check if they are asking about a specific person in the transactions
  for (const t of transactions) {
    if (t.c && msg.includes(t.c.toLowerCase())) {
      const pending = t.a - (t.p || 0);
      const formattedPending = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(pending);
      const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(t.a);
      return `🔍 **Búsqueda de Socio:**
* **Socio:** ${t.c}
* **Estado:** ${t.s === 'Pagado' ? '🟢 Pagado' : '🔴 Pendiente'}
* **Monto total:** ${formattedTotal}
* **Monto pendiente:** ${formattedPending}
* **Estrategia:** ${t.s === 'Pagado' ? 'Agradecer y fidelizar.' : 'Enviar recordatorio directo de cobro.'}`;
    }
  }

  return `🤖 **Asistente IA (Tono: ${tone || 'Analítico'}):**
Actualmente administras **${totalTxs}** registros en total. El saldo total pendiente en cobro es de **${formattedOverdue}** distribuido en **${unpaidCount}** cuentas morosas.

¿Deseas que audite detalladamente las cuentas o que redacte un mensaje de cobro personalizado?`;
}

async function generateMockAnalysis(body: any): Promise<string> {
  const { transactions } = body;
  
  await new Promise(resolve => setTimeout(resolve, 800));

  const unpaidTxs = transactions.filter((t: any) => t.s !== 'Pagado');
  const unpaidCount = unpaidTxs.length;
  const totalOverdue = unpaidTxs.reduce((sum: number, t: any) => sum + (t.a - (t.p || 0)), 0);
  const formattedOverdue = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalOverdue);

  const topDebtors = [...unpaidTxs]
    .sort((a, b) => (b.a - (b.p || 0)) - (a.a - (a.p || 0)))
    .slice(0, 3);
  
  let debtorsText = '';
  topDebtors.forEach((d: any) => {
    const pending = d.a - (d.p || 0);
    const formattedPending = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(pending);
    debtorsText += `\n• ${d.c || 'Socio'}: ${formattedPending}`;
  });

  return `Estado global: ${unpaidCount} cuentas pendientes sumando ${formattedOverdue}.
Socios urgentes:${debtorsText}
Estrategia: Habilitar descuentos por pago temprano vía WhatsApp.
Beneficio: Acelera liquidez en 15%.`;
}

// Fetch Interception
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    
    if (url.includes('/api/gemini/chat')) {
      try {
        const body = JSON.parse(init?.body as string || '{}');
        const reply = await generateMockChatReply(body);
        return new Response(JSON.stringify({ reply }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }
    
    if (url.includes('/api/gemini/analyze')) {
      try {
        const body = JSON.parse(init?.body as string || '{}');
        const analysis = await generateMockAnalysis(body);
        return new Response(JSON.stringify({ analysis }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }
    
    if (url.includes('/api/upload-image')) {
      try {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({ url: body.dataUrl }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    return originalFetch.apply(this, arguments as any);
  };
}
