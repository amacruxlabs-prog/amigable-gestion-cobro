import { localDb, localAuth } from './localDb';

export async function createAuditLog(
  action: 'abono' | 'nueva_cuenta' | 'descuento' | 'descuento_accionista' | 'cambio_telefono' | 'cambio_estado' | 'eliminar_cuenta',
  entityId: string,
  changes: string
) {
  const currentUser = localAuth.getCurrentUser();
  if (!currentUser?.email) return;
  const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
  const payload = {
    action,
    entityId,
    adminEmail: currentUser.email,
    changes,
    timestamp: new Date().toISOString()
  };

  try {
    localDb.setDoc('audit_logs', logId, payload);
  } catch (error) {
    console.error('Audit Error', error);
  }
}
