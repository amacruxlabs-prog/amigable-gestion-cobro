import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { useUI } from '../../contexts/UIContext';
import { Key, Plus, Trash2, Copy, Shield, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/format';

interface ApiEntityToken {
  id: number;
  name: string;
  token: string;
  abilities: string[] | string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface ApiEntity {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  tokens: ApiEntityToken[];
  created_at: string;
}

export const ApiEntitiesPanel = () => {
  const { toast, confirm } = useUI();
  const [entities, setEntities] = useState<ApiEntity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create entity state
  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityDescription, setNewEntityDescription] = useState('');

  // Create token state
  const [isCreatingTokenFor, setIsCreatingTokenFor] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiration, setNewTokenExpiration] = useState<string>('1_year');

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/api-entities');
      setEntities(res.data.data || []);
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al cargar entidades', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;
    try {
      await api.post('/superadmin/api-entities', {
        name: newEntityName,
        description: newEntityDescription
      });
      toast('Entidad creada', 'success');
      setNewEntityName('');
      setNewEntityDescription('');
      setIsCreatingEntity(false);
      fetchEntities();
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al crear entidad', 'error');
    }
  };

  const handleDeleteEntity = async (id: string) => {
    confirm({
      title: 'Eliminar Entidad',
      message: '¿Seguro que deseas eliminar esta entidad y revocar todos sus accesos de forma permanente?',
      type: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await api.delete(`/superadmin/api-entities/${id}`);
          toast('Entidad eliminada', 'success');
          fetchEntities();
        } catch (error: any) {
          toast(error.response?.data?.message || 'Error al eliminar', 'error');
        }
      }
    });
  };

  const handleCreateToken = async (e: React.FormEvent, entityId: string) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    try {
      let expiresAt = null;
      const now = new Date();
      if (newTokenExpiration === '1_month') expiresAt = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      else if (newTokenExpiration === '3_months') expiresAt = new Date(now.setMonth(now.getMonth() + 3)).toISOString();
      else if (newTokenExpiration === '6_months') expiresAt = new Date(now.setMonth(now.getMonth() + 6)).toISOString();
      else if (newTokenExpiration === '1_year') expiresAt = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();

      await api.post(`/superadmin/api-entities/${entityId}/tokens`, {
        name: newTokenName,
        expires_at: expiresAt
      });
      setNewTokenName('');
      setIsCreatingTokenFor(null);
      fetchEntities();
      toast('Token generado exitosamente', 'success');
    } catch (error: any) {
      toast(error.response?.data?.message || 'Error al generar token', 'error');
    }
  };

  const handleRevokeToken = async (entityId: string, tokenId: number) => {
    confirm({
      title: 'Revocar Token',
      message: '¿Revocar este token? La entidad perderá acceso inmediatamente y no podrá deshacerse.',
      type: 'danger',
      confirmText: 'Revocar',
      onConfirm: async () => {
        try {
          await api.delete(`/superadmin/api-entities/${entityId}/tokens/${tokenId}`);
          toast('Token revocado', 'success');
          fetchEntities();
        } catch (error: any) {
          toast(error.response?.data?.message || 'Error al revocar', 'error');
        }
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copiado al portapapeles', 'success');
  };

  if (loading) return <div className="p-6 text-slate-500">Cargando integraciones...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Agentes e Integraciones API</h3>
          <p className="text-sm text-slate-500">Gestiona accesos externos para consumir los recursos de negocio.</p>
        </div>
        <button 
          onClick={() => setIsCreatingEntity(!isCreatingEntity)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Entidad
        </button>
      </div>



      {/* Formulario Crear Entidad */}
      {isCreatingEntity && (
        <form onSubmit={handleCreateEntity} className="card p-5 border border-slate-200 rounded-xl bg-slate-50">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Registrar Nueva Entidad (Agente / App)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
              <input 
                type="text" 
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                placeholder="Ej. Agente MCP Cobranza"
                className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción (Opcional)</label>
              <input 
                type="text" 
                value={newEntityDescription}
                onChange={(e) => setNewEntityDescription(e.target.value)}
                placeholder="Para qué se usa..."
                className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsCreatingEntity(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900">Registrar</button>
          </div>
        </form>
      )}

      {/* Lista de Entidades */}
      {entities.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-xl">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay entidades ni agentes registrados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entities.map(entity => (
            <div key={entity.id} className="card p-0 border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" /> {entity.name}
                    {!entity.is_active && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold">Inactivo</span>}
                  </h4>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1 flex items-center gap-2">
                    ID: 
                    <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">{entity.id}</code>
                    <button 
                      onClick={() => copyToClipboard(entity.id)}
                      className="text-slate-400 hover:text-indigo-600 p-0.5 rounded-md hover:bg-indigo-50 transition-colors"
                      title="Copiar ID de la Entidad"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {entity.description && <span className="ml-2">· {entity.description}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsCreatingTokenFor(entity.id)}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold border border-indigo-200 transition-colors"
                  >
                    + Generar Token
                  </button>
                  <button 
                    onClick={() => handleDeleteEntity(entity.id)}
                    className="text-xs bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded-lg border border-red-200 transition-colors"
                    title="Eliminar entidad"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Form Crear Token */}
              {isCreatingTokenFor === entity.id && (
                <form onSubmit={(e) => handleCreateToken(e, entity.id)} className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-end gap-3 rounded-b-xl shadow-inner">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre del Token</label>
                    <input 
                      type="text"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      placeholder="Ej. Servidor de Producción"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Vencimiento</label>
                    <select
                      value={newTokenExpiration}
                      onChange={(e) => setNewTokenExpiration(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="1_month">1 Mes</option>
                      <option value="3_months">3 Meses</option>
                      <option value="6_months">6 Meses</option>
                      <option value="1_year">1 Año</option>
                      <option value="never">Sin vencimiento</option>
                    </select>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button type="submit" className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm">Generar</button>
                    <button type="button" onClick={() => setIsCreatingTokenFor(null)} className="flex-1 sm:flex-none bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors">Cancelar</button>
                  </div>
                </form>
              )}

              <div className="px-5 py-3 bg-white">
                {entity.tokens && entity.tokens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="pb-2 font-semibold">Nombre del Token</th>
                          <th className="pb-2 font-semibold">Token</th>
                          <th className="pb-2 font-semibold">Último Uso</th>
                          <th className="pb-2 font-semibold">Vencimiento</th>
                          <th className="pb-2 font-semibold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {entity.tokens.map(token => (
                          <tr key={token.id}>
                            <td className="py-2.5">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-slate-400" /> {token.name}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <code className="text-slate-500 font-mono text-xs tracking-widest">••••••••••••••••</code>
                                <button 
                                  onClick={() => copyToClipboard(token.token)}
                                  className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                                  title="Copiar token"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 text-xs text-slate-500">
                              {token.last_used_at ? formatDate(token.last_used_at) : 'Nunca usado'}
                            </td>
                            <td className="py-2.5 text-xs text-slate-500">
                              {token.expires_at ? formatDate(token.expires_at) : 'Sin vencimiento'}
                            </td>
                            <td className="py-2.5 text-right">
                              <button 
                                onClick={() => handleRevokeToken(entity.id, token.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                Revocar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No hay tokens activos para esta entidad.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
