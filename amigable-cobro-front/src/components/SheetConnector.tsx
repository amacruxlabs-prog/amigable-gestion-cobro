import React, { useState } from 'react';
import { ColumnMapping } from '../types';
import { Link2, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw, HelpCircle, Columns } from 'lucide-react';
import { extractSpreadsheetId, convertCsvToTransactions } from '../utils/csvParser';

interface SheetConnectorProps {
  onDataLoaded: (data: {
    transactions: any[];
    headers: string[];
    mapping: ColumnMapping;
    sourceName: string;
  }) => void;
  currentMapping: ColumnMapping;
  availableHeaders: string[];
  activeSourceName: string;
}

export const SheetConnector: React.FC<SheetConnectorProps> = ({
  onDataLoaded,
  currentMapping,
  availableHeaders,
  activeSourceName
}) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [pastedCsv, setPastedCsv] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'paste'>('url');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showHelper, setShowHelper] = useState(false);

  // Direct file drag and drop helper states
  const [isDragging, setIsDragging] = useState(false);

  // Sync Google Sheets URL
  const handleUrlSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrl) {
      setErrorMsg('Por favor ingresa un enlace de Google Sheets válido.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setErrorMsg('No se pudo identificar una ID de Google Sheets en el enlace. Revisa que tenga el formato correcto.');
      setLoading(false);
      return;
    }

    // Google Sheets public visualization query endpoint which outputs CSV
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;

    // Check local storage caching middleware
    const cacheEnabledSetting = localStorage.getItem('rest_opt_cache_enabled') !== 'false';
    const cacheTTLSetting = parseInt(localStorage.getItem('rest_opt_cache_ttl') || '60', 10);
    const cachedKey = `sheet_cache_${spreadsheetId}`;
    const cachedItemStr = localStorage.getItem(cachedKey);
    
    if (cacheEnabledSetting && cachedItemStr) {
      try {
        const cached = JSON.parse(cachedItemStr);
        const ageSec = (Date.now() - cached.timestamp) / 1000;
        if (ageSec < cacheTTLSetting) {
          // Increment cache stats (hits)
          let stats = { hits: 0, misses: 0, timeSavedMs: 0, bandwidthSavedKb: 0 };
          const savedStats = localStorage.getItem('rest_opt_cache_stats');
          if (savedStats) stats = JSON.parse(savedStats);
          
          stats.hits = (stats.hits || 0) + 1;
          stats.timeSavedMs = (stats.timeSavedMs || 0) + 380; // Estimate network fetch cost saved
          stats.bandwidthSavedKb = (stats.bandwidthSavedKb || 0) + Math.round((cached.csvText?.length || 20480) / 1024);
          localStorage.setItem('rest_opt_cache_stats', JSON.stringify(stats));

          onDataLoaded({
            transactions: cached.transactions,
            headers: cached.headers,
            mapping: cached.mapping,
            sourceName: `Google Sheet (Caché): ${spreadsheetId.substring(0, 8)}...`
          });

          setSuccessMsg(`🚀 ¡Sincronizado de Caché (TTL activo)! Se cargaron ${cached.transactions.length} filas al instante.`);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Falla en lectura de caché, reintentando por red...', e);
      }
    }

    try {
      const response = await fetch(csvExportUrl);
      if (!response.ok) {
        throw new Error('No se pudo acceder al Google Sheet. Verifica que la hoja de cálculo esté compartida como "Cualquier persona con el enlace puede ver".');
      }

      const csvText = await response.text();
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('La hoja de cálculo regresó un archivo CSV vacío.');
      }

      const { transactions, headers, detectedMapping } = convertCsvToTransactions(csvText);

      if (transactions.length === 0) {
        throw new Error('No pudimos encontrar filas válidas de transacciones en la hoja cargada.');
      }

      // Save to cache if enabled
      if (cacheEnabledSetting) {
        try {
          localStorage.setItem(`sheet_cache_${spreadsheetId}`, JSON.stringify({
            timestamp: Date.now(),
            transactions,
            headers,
            mapping: detectedMapping,
            csvText
          }));
        } catch (e) {
          console.error('Error saving API cache', e);
        }
      }

      // Update cache stats (misses)
      let stats = { hits: 0, misses: 0, timeSavedMs: 0, bandwidthSavedKb: 0 };
      const savedStats = localStorage.getItem('rest_opt_cache_stats');
      if (savedStats) {
        try { stats = JSON.parse(savedStats); } catch (e) {}
      }
      stats.misses = (stats.misses || 0) + 1;
      localStorage.setItem('rest_opt_cache_stats', JSON.stringify(stats));

      onDataLoaded({
        transactions,
        headers,
        mapping: detectedMapping,
        sourceName: `Google Sheet: ${spreadsheetId.substring(0, 8)}...`
      });

      setSuccessMsg(`¡Sincronizado con éxito! Cargadas ${transactions.length} filas desde la hoja en tiempo real.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || 
        'Error de conexión. Asegúrate de que el documento esté compartido con permisos de lectura para "Cualquier persona con el enlace" o usa la opción de Publicar en la Web.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Drag and dropping CSV file handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    setSuccessMsg(null);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      processCsvFile(file);
    } else {
      setErrorMsg('Solo se admiten archivos en formato CSV (.csv).');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      processCsvFile(file);
    }
  };

  const processCsvFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const { transactions, headers, detectedMapping } = convertCsvToTransactions(text);
        if (transactions.length === 0) {
          throw new Error('No se encontraron transacciones en el archivo CSV.');
        }

        onDataLoaded({
          transactions,
          headers,
          mapping: detectedMapping,
          sourceName: `Archivo CSV: ${file.name}`
        });
        setSuccessMsg(`¡Archivo importado con éxito! Se cargaron ${transactions.length} transacciones.`);
      } catch (err: any) {
        setErrorMsg(`Error al analizar el CSV: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo.');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  // Direct Raw CSV Paste Sync
  const handlePasteSync = () => {
    if (!pastedCsv.trim()) {
      setErrorMsg('Ingresa texto CSV o renglones copiados de tu tabla.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { transactions, headers, detectedMapping } = convertCsvToTransactions(pastedCsv);
      if (transactions.length === 0) {
        throw new Error('No se encontraron filas con datos en el contenido provisto.');
      }

      onDataLoaded({
        transactions,
        headers,
        mapping: detectedMapping,
        sourceName: 'Texto CSV Pegado'
      });
      setSuccessMsg(`¡Cargado con éxito! ${transactions.length} filas mapeadas.`);
    } catch (err: any) {
      setErrorMsg(`Error al analizar texto pegado: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to change column mappings manually
  const updateColumnMapping = (field: keyof ColumnMapping, selectedHeader: string) => {
    const newMapping = {
      ...currentMapping,
      [field]: selectedHeader
    };
    
    // We notify parent to re-evaluate transactions based on new mappings
    onDataLoaded({
      transactions: [], // Parent will handle re-mapping the raw records or existing dataset
      headers: availableHeaders,
      mapping: newMapping,
      sourceName: activeSourceName
    });
  };

  return (
    <div className="card dark:bg-slate-900 dark:border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-500 w-5 h-5" />
            Conectar Google Sheets o CSV
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Trae tus transacciones al instante. Modela columnas a tu manera.
          </p>
        </div>
        <button
          onClick={() => setShowHelper(!showHelper)}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          title="Ayuda para compartir Sheets"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Ayuda</span>
        </button>
      </div>

      {/* Helper guide on how to share Google Sheets correctly */}
      {showHelper && (
        <div className="mb-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-300 space-y-2 leading-relaxed animate-fade-in">
          <p className="font-bold">¿Cómo configurar y obtener el enlace público de tu Google Sheet?</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Abre tu hoja de cálculo en <strong>Google Sheets</strong>.</li>
            <li>Asegúrate de que tenga las columnas requeridas: Cliente, Monto, Estado, y Fecha.</li>
            <li>Arriba a la derecha, haz clic en el botón <strong>Compartir (Share)</strong>.</li>
            <li>En "Acceso general", cambia "Restringido" a <strong>"Cualquier persona con el enlace"</strong> (con rol de Lector).</li>
            <li>Copia el enlace de la barra de direcciones o presiona <strong>"Copiar enlace"</strong> y pégalo aquí.</li>
          </ol>
        </div>
      )}

      {/* Connection methods TAB selection */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 mb-5 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('url'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'url' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Enlace Google Sheets
        </button>
        <button
          onClick={() => { setActiveTab('file'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'file' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Subir Archivo CSV
        </button>
        <button
          onClick={() => { setActiveTab('paste'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'paste' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Pegar Datos de Tabla
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-4">
        {activeTab === 'url' && (
          <form onSubmit={handleUrlSync} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="pl-9 pr-3"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Sincronizar
              </button>
            </div>
          </form>
        )}

        {activeTab === 'file' && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60'
              }`}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs text-slate-655 dark:text-slate-350">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Haz clic para subir un archivo</span> o arrástralo aquí
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Solo formato CSV (.csv) con codificación UTF-8</p>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'paste' && (
          <div className="space-y-2">
            <textarea
              rows={4}
              placeholder="Nombre del Cliente,Monto Total,Estado de Pago,Fecha&#10;Juan Gomez,12000,Pagado,2026-06-03&#10;Maria Perez,8500,Cobrar,2026-06-04"
              value={pastedCsv}
              onChange={(e) => setPastedCsv(e.target.value)}
              className="font-mono"
            />
            <button
              onClick={handlePasteSync}
              disabled={loading}
              className="w-full btn btn-primary"
            >
              Procesar Texto Pegado
            </button>
          </div>
        )}
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="mt-4 alert alert-success animate-fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 alert alert-danger animate-fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Source indicator */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>Origen de datos activo:</span>
        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md dark:bg-slate-800 dark:text-slate-300">
          {activeSourceName}
        </span>
      </div>

      {/* Custom Column Mapper Segment */}
      {availableHeaders.length > 0 && (
        <div className="mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Columns className="text-indigo-500 w-4.5 h-4.5" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mapear Columnas Manualmente</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
            Si los encabezados de tu hoja son diferentes, selecciona cuáles corresponden a los campos solicitados:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Client Name drop */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-505">Nombre de Cliente</label>
              <select
                value={currentMapping.clientNameKey}
                onChange={(e) => updateColumnMapping('clientNameKey', e.target.value)}
              >
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Total Amount drop */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-505">Monto Total</label>
              <select
                value={currentMapping.amountKey}
                onChange={(e) => updateColumnMapping('amountKey', e.target.value)}
              >
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Status drop */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550">Estado de Pago</label>
              <select
                value={currentMapping.statusKey}
                onChange={(e) => updateColumnMapping('statusKey', e.target.value)}
              >
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Date drop */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550">Fecha de Transacción</label>
              <select
                value={currentMapping.dateKey}
                onChange={(e) => updateColumnMapping('dateKey', e.target.value)}
              >
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Phone drop */}
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550">Teléfono (WhatsApp AI)</label>
              <select
                value={currentMapping.phoneKey || ''}
                onChange={(e) => updateColumnMapping('phoneKey', e.target.value)}
              >
                <option value="">-- No mapear / Opcional --</option>
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Cedula drop */}
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550">Cédula</label>
              <select
                value={currentMapping.cedulaKey || ''}
                onChange={(e) => updateColumnMapping('cedulaKey', e.target.value)}
              >
                <option value="">-- No mapear / Opcional --</option>
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Location drop */}
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550">Ubicación de Cliente</label>
              <select
                value={currentMapping.locationKey || ''}
                onChange={(e) => updateColumnMapping('locationKey', e.target.value)}
              >
                <option value="">-- No mapear / Opcional --</option>
                {availableHeaders.map((h, i) => (
                  <option key={i} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
