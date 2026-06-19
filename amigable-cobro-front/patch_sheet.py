import re

with open('src/components/SheetConnector.tsx', 'r') as f:
    content = f.read()

# Add new imports
content = content.replace("import { Link2, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw, HelpCircle, Columns } from 'lucide-react';", 
"import { Link2, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw, HelpCircle, Columns, Bot, Save, X, Edit3 } from 'lucide-react';")

content = content.replace("import { api } from '../lib/axios';",
"import { api } from '../lib/axios';\nimport { useUI } from '../contexts/UIContext';\nimport { Transaction } from '../types';")

# Add preview states inside component
state_code = """
  // Preview States
  const [previewTransactions, setPreviewTransactions] = useState<Transaction[] | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewMapping, setPreviewMapping] = useState<ColumnMapping | null>(null);
  const [previewSourceName, setPreviewSourceName] = useState<string>('');

  const checkAICredentials = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/gemini/verify');
      if (!res.ok) {
        throw new Error('No autorizado');
      }
      return true;
    } catch (error) {
      setErrorMsg('No se encontraron credenciales de IA. Por favor configura tu API Key de Gemini en la sección de Ajustes > Secretos.');
      return false;
    }
  };

"""
content = content.replace("const [importStats, setImportStats] = useState<{ imported: number, errors: number } | null>(null);", 
"const [importStats, setImportStats] = useState<{ imported: number, errors: number } | null>(null);\n" + state_code)

# Replace the end of importToBackend with clear preview
content = content.replace("setSuccessMsg(`Importación finalizada en la base de datos. Exitosos: ${imported}, Errores: ${errors}.`);",
"setSuccessMsg(`Importación finalizada en la base de datos. Exitosos: ${imported}, Errores: ${errors}.`);\n      setPreviewTransactions(null);")


# Replace immediate imports with preview settings
content = content.replace("await importToBackend(transactions, headers, detectedMapping, `Google Sheet: ${spreadsheetId.substring(0, 8)}...`);",
"""
      const hasAI = await checkAICredentials();
      if (!hasAI) {
        setLoading(false);
        return;
      }
      setPreviewHeaders(headers);
      setPreviewMapping(detectedMapping);
      setPreviewSourceName(`Google Sheet: ${spreadsheetId.substring(0, 8)}...`);
      setPreviewTransactions(transactions);
""")

content = content.replace("await importToBackend(cached.transactions, cached.headers, cached.mapping, `Google Sheet (Caché): ${spreadsheetId.substring(0, 8)}...`);",
"""
          const hasAI = await checkAICredentials();
          if (!hasAI) return;
          setPreviewHeaders(cached.headers);
          setPreviewMapping(cached.mapping);
          setPreviewSourceName(`Google Sheet (Caché): ${spreadsheetId.substring(0, 8)}...`);
          setPreviewTransactions(cached.transactions);
""")

content = content.replace("await importToBackend(transactions, headers, detectedMapping, `Archivo CSV: ${file.name}`);",
"""
        const hasAI = await checkAICredentials();
        if (!hasAI) { setLoading(false); return; }
        setPreviewHeaders(headers);
        setPreviewMapping(detectedMapping);
        setPreviewSourceName(`Archivo CSV: ${file.name}`);
        setPreviewTransactions(transactions);
""")

content = content.replace("await importToBackend(transactions, headers, detectedMapping, 'Texto CSV Pegado');",
"""
      const hasAI = await checkAICredentials();
      if (!hasAI) { setLoading(false); return; }
      setPreviewHeaders(headers);
      setPreviewMapping(detectedMapping);
      setPreviewSourceName('Texto CSV Pegado');
      setPreviewTransactions(transactions);
""")


# Insert the preview table UI right before the "Custom Column Mapper Segment"
preview_ui = """
      {/* Preview Table Segment */}
      {previewTransactions && (
        <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden animate-fade-in">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" /> Vista Previa del Análisis Inteligente
              </h4>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300 mt-1">Revisa y edita los datos antes de guardarlos.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreviewTransactions(null)} className="btn btn-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button 
                onClick={() => importToBackend(previewTransactions, previewHeaders, previewMapping!, previewSourceName)}
                className="btn btn-sm bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-md"
              >
                <Save className="w-4 h-4" /> Confirmar y Generar Deudas
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 sticky top-0 z-10 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Cédula</th>
                  <th className="px-4 py-3 font-semibold">Teléfono</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={tx.clientName} 
                        onChange={e => {
                          const newTxs = [...previewTransactions];
                          newTxs[idx].clientName = e.target.value;
                          setPreviewTransactions(newTxs);
                        }}
                        className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-full text-slate-700 dark:text-slate-200"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={tx.cedula || ''} 
                        onChange={e => {
                          const newTxs = [...previewTransactions];
                          newTxs[idx].cedula = e.target.value;
                          setPreviewTransactions(newTxs);
                        }}
                        className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-24 text-slate-700 dark:text-slate-200"
                        placeholder="Vacio"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={tx.phone || ''} 
                        onChange={e => {
                          const newTxs = [...previewTransactions];
                          newTxs[idx].phone = e.target.value;
                          setPreviewTransactions(newTxs);
                        }}
                        className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-28 text-slate-700 dark:text-slate-200"
                        placeholder="Vacio"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        value={tx.amount || 0} 
                        onChange={e => {
                          const newTxs = [...previewTransactions];
                          newTxs[idx].amount = Number(e.target.value);
                          setPreviewTransactions(newTxs);
                        }}
                        className={`bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-24 font-mono font-medium ${tx.amount === 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={tx.status}
                        onChange={e => {
                          const newTxs = [...previewTransactions];
                          newTxs[idx].status = e.target.value as any;
                          setPreviewTransactions(newTxs);
                        }}
                        className={`bg-transparent outline-none cursor-pointer text-xs font-bold ${tx.status === 'Pagado' ? 'text-emerald-600' : 'text-amber-600'}`}
                      >
                        <option value="Cobrar">Pendiente</option>
                        <option value="Pagado">Pagado</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="date" 
                        value={tx.date || ''} 
                        onChange={e => {
                          const newTxs = [...previewTransactions];
                          newTxs[idx].date = e.target.value;
                          setPreviewTransactions(newTxs);
                        }}
                        className={`bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-32 ${!tx.date ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
"""

content = content.replace("{/* Custom Column Mapper Segment */}", preview_ui + "\n      {/* Custom Column Mapper Segment */}")

with open('src/components/SheetConnector.tsx', 'w') as f:
    f.write(content)

