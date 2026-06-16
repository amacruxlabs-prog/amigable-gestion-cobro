import { DEMO_TRANSACTIONS } from '../data/demoData';

// Generate a random ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Simple event emitter for reactive updates
class EventEmitter {
  listeners: Record<string, Function[]> = {};

  on(event: string, cb: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== cb);
    };
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

const emitter = new EventEmitter();

// Core DB operations
export const localDb = {
  getCollection: (collectionName: string): any[] => {
    if (typeof window === 'undefined') return [];
    const data = JSON.parse(localStorage.getItem(`db_${collectionName}`) || '{}');
    return Object.values(data);
  },

  getDoc: (collectionName: string, id: string): any => {
    if (typeof window === 'undefined') return null;
    const data = JSON.parse(localStorage.getItem(`db_${collectionName}`) || '{}');
    return data[id] || null;
  },

  setDoc: (collectionName: string, id: string, docData: any) => {
    if (typeof window === 'undefined') return;
    const data = JSON.parse(localStorage.getItem(`db_${collectionName}`) || '{}');
    data[id] = { ...data[id], ...docData, id };
    localStorage.setItem(`db_${collectionName}`, JSON.stringify(data));
    
    // Emit updates
    emitter.emit(`update_${collectionName}`, Object.values(data));
    emitter.emit(`update_${collectionName}_${id}`, data[id]);
  },

  deleteDoc: (collectionName: string, id: string) => {
    if (typeof window === 'undefined') return;
    const data = JSON.parse(localStorage.getItem(`db_${collectionName}`) || '{}');
    delete data[id];
    localStorage.setItem(`db_${collectionName}`, JSON.stringify(data));
    
    emitter.emit(`update_${collectionName}`, Object.values(data));
    emitter.emit(`update_${collectionName}_${id}`, null);
  },

  // Listen to a whole collection
  subscribeCollection: (collectionName: string, callback: (data: any[]) => void) => {
    // Initial call
    callback(localDb.getCollection(collectionName));
    return emitter.on(`update_${collectionName}`, callback);
  },

  // Listen to a specific doc
  subscribeDoc: (collectionName: string, id: string, callback: (data: any) => void) => {
    callback(localDb.getDoc(collectionName, id));
    return emitter.on(`update_${collectionName}_${id}`, callback);
  }
};

// Auth operations
export interface User {
  uid: string;
  email: string;
}

export const localAuth = {
  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  signIn: (email: string) => {
    const user: User = { uid: `user_${email.replace(/[@.]/g, '_')}`, email };
    localStorage.setItem('auth_user', JSON.stringify(user));
    
    // Auto-create user doc if missing
    if (!localDb.getDoc('users', user.uid)) {
      let role = 'TENANT_ADMIN';
      let businessId: string | null = 'demo-business-1';
      
      if (email === 'amacruxlabs@gmail.com') {
         role = 'SUPERADMIN';
         businessId = null;
      }
      
      localDb.setDoc('users', user.uid, {
        uid: user.uid,
        email: email,
        role: role,
        businessId: businessId,
        createdAt: new Date().toISOString()
      });
    }

    emitter.emit('auth_changed', user);
  },

  signOut: () => {
    localStorage.removeItem('auth_user');
    emitter.emit('auth_changed', null);
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    callback(localAuth.getCurrentUser());
    return emitter.on('auth_changed', callback);
  }
};

// Initialize default data if empty
export function initLocalDb() {
  if (typeof window === 'undefined') return;

  if (Object.keys(JSON.parse(localStorage.getItem('db_transactions') || '{}')).length === 0) {
    DEMO_TRANSACTIONS.forEach(t => {
      localDb.setDoc('transactions', t.id, { ...t, businessId: 'demo-business-1' });
    });
  }

  if (Object.keys(JSON.parse(localStorage.getItem('db_businesses') || '{}')).length === 0) {
    localDb.setDoc('businesses', 'demo-business-1', {
      id: 'demo-business-1',
      name: 'Gimnasio Fit Life',
      ownerName: 'Admin Demo',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    });
  }

  if (Object.keys(JSON.parse(localStorage.getItem('db_settings') || '{}')).length === 0) {
    localDb.setDoc('settings', 'demo-business-1', {
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
    });
  }
}

// Call init on import
initLocalDb();
