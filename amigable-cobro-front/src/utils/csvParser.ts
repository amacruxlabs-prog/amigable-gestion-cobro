import { Transaction, ColumnMapping } from '../types';

/**
 * Parses raw CSV text into a table matrix (array of string arrays).
 * Correctly accounts for quoted strings containing commas, semicolons, and newlines.
 */
export function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next char
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentValue.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        result.push(row);
      }
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (currentValue !== '' || row.length > 0) {
    row.push(currentValue.trim());
    result.push(row);
  }

  return result;
}

/**
 * Performs fuzzy keyword matching to guess which spreadsheet column maps to 
 * each of the four required restaurant transaction fields.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const norm = (s: string) => 
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();

  let clientNameKey = headers[0] || '';
  let amountKey = headers[1] || '';
  let statusKey = headers[2] || '';
  let dateKey = headers[3] || '';
  let phoneKey = '';
  let cedulaKey = '';
  let locationKey = '';

  // 1. Client Match
  const clientTerms = ['cliente', 'nombre', 'client', 'customer', 'name', 'comensal', 'persona', 'contacto', 'razon social'];
  for (const h of headers) {
    const nh = norm(h);
    if (clientTerms.some(term => nh.includes(term))) {
      clientNameKey = h;
      break;
    }
  }

  // 2. Amount Match
  const amountTerms = ['monto', 'total', 'precio', 'amount', 'price', 'valor', 'pago', 'neto', 'costo', 'cost', 'por pagar', 'monto total', 'consumo'];
  for (const h of headers) {
    const nh = norm(h);
    if (amountTerms.some(term => nh.includes(term))) {
      if (nh !== norm(clientNameKey)) {
        amountKey = h;
        break;
      }
    }
  }

  // 3. Status Match
  const statusTerms = ['estado', 'status', 'pago', 'pagado', 'cobrar', 'payment', 'state', 'cobro', 'liquidado', 'pendiente', 'factura'];
  for (const h of headers) {
    const nh = norm(h);
    if (statusTerms.some(term => nh.includes(term)) || nh === 'estado de pago' || nh === 'pago estado') {
      if (h !== clientNameKey && h !== amountKey) {
        statusKey = h;
        break;
      }
    }
  }

  // 4. Date Match
  const dateTerms = ['fecha', 'date', 'dia', 'time', 'transac', 'momento', 'creado', 'registro', 'timestamp'];
  for (const h of headers) {
    const nh = norm(h);
    if (dateTerms.some(term => nh.includes(term))) {
      if (h !== clientNameKey && h !== amountKey && h !== statusKey) {
        dateKey = h;
        break;
      }
    }
  }

  // 5. Phone Match
  const phoneTerms = ['telefono', 'celular', 'phone', 'whatsapp', 'contacto', 'movil', 'mobile'];
  for (const h of headers) {
    const nh = norm(h);
    if (phoneTerms.some(term => nh.includes(term))) {
      if (h !== clientNameKey && h !== amountKey && h !== statusKey && h !== dateKey) {
        phoneKey = h;
        break;
      }
    }
  }

  // 6. Cedula Match
  const cedulaTerms = ['cedula', 'identificacion', 'ci', 'dni', 'rut', 'id', 'documento'];
  for (const h of headers) {
    const nh = norm(h);
    if (cedulaTerms.some(term => nh.includes(term)) || nh === 'cc') {
      if (h !== clientNameKey && h !== amountKey && h !== statusKey && h !== dateKey && h !== phoneKey) {
        cedulaKey = h;
        break;
      }
    }
  }

  // 7. Location Match
  const locationTerms = ['ubicacion', 'direccion', 'location', 'address', 'ciudad', 'pais', 'mesa', 'entregar', 'domicilio', 'encuentro'];
  for (const h of headers) {
    const nh = norm(h);
    if (locationTerms.some(term => nh.includes(term))) {
      if (h !== clientNameKey && h !== amountKey && h !== statusKey && h !== dateKey && h !== phoneKey) {
        locationKey = h;
        break;
      }
    }
  }

  return { clientNameKey, amountKey, statusKey, dateKey, phoneKey, cedulaKey, locationKey };
}

/**
 * Normalizes and converts a raw CSV object row into a standard Transaction object.
 */
export function mapRowToTransaction(
  row: Record<string, string>,
  mapping: ColumnMapping,
  fallbackIndexValues: string[],
  indexMap: { clientIdx: number; amountIdx: number; statusIdx: number; dateIdx: number; phoneIdx?: number; cedulaIdx?: number; locationIdx?: number },
  id: string
): Transaction {
  let clientName = '';
  if (mapping.clientNameKey && row[mapping.clientNameKey] !== undefined) {
    clientName = row[mapping.clientNameKey];
  } else {
    clientName = fallbackIndexValues[indexMap.clientIdx] || 'Cliente General';
  }

  let rawAmount = '';
  if (mapping.amountKey && row[mapping.amountKey] !== undefined) {
    rawAmount = row[mapping.amountKey];
  } else {
    rawAmount = fallbackIndexValues[indexMap.amountIdx] || '0';
  }
  // Sanitize numeric amount (remove money symbols and commas)
  const sanitizedAmountString = rawAmount.replace(/[^0-9.-]/g, '');
  const sanitizedAmount = parseFloat(sanitizedAmountString) || 0;

  let rawStatus = '';
  if (mapping.statusKey && row[mapping.statusKey] !== undefined) {
    rawStatus = row[mapping.statusKey];
  } else {
    rawStatus = fallbackIndexValues[indexMap.statusIdx] || 'Cobrar';
  }

  // Normalize status to 'Pagado' or 'Cobrar'
  const normStatus = rawStatus.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  let status: 'Pagado' | 'Cobrar' = 'Cobrar';
  
  const paidMarkers = [
    'pagado', 'paid', 'si', 'ok', '1', 'completed', 'completo', 'liquidado', 'cobrado', 'efectivo', 'tarjeta', 'pago resuelto'
  ];
  if (paidMarkers.some(marker => normStatus.includes(marker))) {
    status = 'Pagado';
  }

  let rawDate = '';
  if (mapping.dateKey && row[mapping.dateKey] !== undefined) {
    rawDate = row[mapping.dateKey];
  } else {
    rawDate = fallbackIndexValues[indexMap.dateIdx] || new Date().toISOString().substring(0, 10);
  }

  // Formats date nicely to YYYY-MM-DD
  let date = rawDate;
  const regexIso = /^\d{4}-\d{2}-\d{2}/;
  if (!regexIso.test(date)) {
    const parts = date.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD -> YYYY-MM-DD
        date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY
        // Check if month (middle parts) might be larger than 12
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        if (p0 > 12) {
          // 25/08/2026 -> YYYY-MM-DD
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (p1 > 12) {
          // 08/25/2026 -> YYYY-MM-DD
          date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        } else {
          // Default DD/MM/YYYY in Spanish standard
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
  }

  if (date.length > 10) {
    date = date.substring(0, 10);
  }

  let phone: string | undefined = undefined;
  if (mapping.phoneKey && row[mapping.phoneKey] !== undefined) {
    phone = row[mapping.phoneKey] || undefined;
  } else if (indexMap.phoneIdx !== undefined && fallbackIndexValues[indexMap.phoneIdx]) {
    phone = fallbackIndexValues[indexMap.phoneIdx] || undefined;
  }

  let cedula: string | undefined = undefined;
  if (mapping.cedulaKey && row[mapping.cedulaKey] !== undefined) {
    cedula = row[mapping.cedulaKey] || undefined;
  } else if (indexMap.cedulaIdx !== undefined && fallbackIndexValues[indexMap.cedulaIdx]) {
    cedula = fallbackIndexValues[indexMap.cedulaIdx] || undefined;
  }

  let location: string | undefined = undefined;
  if (mapping.locationKey && row[mapping.locationKey] !== undefined) {
    location = row[mapping.locationKey] || undefined;
  } else if (indexMap.locationIdx !== undefined && fallbackIndexValues[indexMap.locationIdx]) {
    location = fallbackIndexValues[indexMap.locationIdx] || undefined;
  }

  return {
    id,
    clientName,
    amount: sanitizedAmount,
    status,
    date,
    phone,
    cedula,
    location,
    originalData: row
  };
}

/**
 * Parses and processes a CSV string into proper typed Transactions.
 */
export function convertCsvToTransactions(csvContent: string, explicitMapping?: ColumnMapping): {
  transactions: Transaction[];
  headers: string[];
  detectedMapping: ColumnMapping;
} {
  const parsed = parseCSV(csvContent);
  if (parsed.length <= 1) {
    return { transactions: [], headers: [], detectedMapping: { clientNameKey: '', amountKey: '', statusKey: '', dateKey: '', phoneKey: '', cedulaKey: '', locationKey: '' } };
  }

  const headers = parsed[0];
  const detectedMapping = autoDetectMapping(headers);
  const activeMapping = explicitMapping || detectedMapping;

  // Let's create an index mapper in case keys don't match row records
  const clientIdx = headers.indexOf(activeMapping.clientNameKey) !== -1 ? headers.indexOf(activeMapping.clientNameKey) : 0;
  const amountIdx = headers.indexOf(activeMapping.amountKey) !== -1 ? headers.indexOf(activeMapping.amountKey) : 1;
  const statusIdx = headers.indexOf(activeMapping.statusKey) !== -1 ? headers.indexOf(activeMapping.statusKey) : 2;
  const dateIdx = headers.indexOf(activeMapping.dateKey) !== -1 ? headers.indexOf(activeMapping.dateKey) : 3;
  const phoneIdx = headers.indexOf(activeMapping.phoneKey) !== -1 ? headers.indexOf(activeMapping.phoneKey) : undefined;
  const cedulaIdx = activeMapping.cedulaKey && headers.indexOf(activeMapping.cedulaKey) !== -1 ? headers.indexOf(activeMapping.cedulaKey) : undefined;
  const locationIdx = activeMapping.locationKey && headers.indexOf(activeMapping.locationKey) !== -1 ? headers.indexOf(activeMapping.locationKey) : undefined;

  const indexMap = { clientIdx, amountIdx, statusIdx, dateIdx, phoneIdx, cedulaIdx, locationIdx };
  const transactions: Transaction[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const rawRow = parsed[i];
    // Build a record of header -> value
    const rowObj: Record<string, string> = {};
    headers.forEach((h, index) => {
      rowObj[h] = rawRow[index] || '';
    });

    const txId = `TX-${1000 + i}`;
    const tx = mapRowToTransaction(rowObj, activeMapping, rawRow, indexMap, txId);
    transactions.push(tx);
  }

  return {
    transactions,
    headers,
    detectedMapping
  };
}

/**
 * Extracts SPREADSHEET_ID from regular Google Sheet URL or Share Link
 */
export function extractSpreadsheetId(url: string): string | null {
  // Regexes for common Google Sheet link structures
  const regexes = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /d\/([a-zA-Z0-9-_]+)/
  ];

  for (const regex of regexes) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}
