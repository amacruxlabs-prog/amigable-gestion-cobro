import { db, auth, handleFirestoreError, OperationType, doc, setDoc } from './firebase';

export async function createAuditLog(
  action: 'abono' | 'nueva_cuenta' | 'descuento' | 'descuento_accionista' | 'cambio_telefono' | 'cambio_estado' | 'eliminar_cuenta',
  entityId: string,
  changes: string
) {
  if (!auth.currentUser?.email) return;
  const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
  const payload = {
    action,
    entityId,
    adminEmail: auth.currentUser.email,
    changes,
    timestamp: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `audit_logs/${logId}`);
  }
}
