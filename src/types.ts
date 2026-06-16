export interface Transaction {
  id: string;
  clientName: string;
  amount: number;
  status: 'Pagado' | 'Cobrar'; // 'Pagado' (paid) or 'Cobrar' (receivable)
  date: string; // ISO YYYY-MM-DD format
  phone?: string; // Phone number for AI notifications
  location?: string; // Client's physical location/address
  cedula?: string;
  paidAmount?: number; // Cumulative partial payments registered so far
  payments?: { amount: number; date: string }[]; // Historical payments registry
  originalData?: Record<string, string>; // Keeps original spreadsheet row values for full fidelity
}

export interface ColumnMapping {
  clientNameKey: string;
  amountKey: string;
  statusKey: string;
  dateKey: string;
  phoneKey: string;
  cedulaKey?: string;
  locationKey?: string; // Optional custom column mapping for location
  paidAmountKey?: string; // Optional custom column mapping for amount already registered paid
}

export interface FilterState {
  startDate: string;
  endDate: string;
  status: 'todos' | 'Pagado' | 'Cobrar';
  searchTerm: string;
}

export interface SalesPeriodData {
  label: string; // "YYYY-MM" or "YYYY-MM-DD"
  total: number;
  paid: number;
  receivable: number;
}

export interface ClientStats {
  clientName: string;
  totalAmount: number;
  transactionCount: number;
  paidAmount: number;
  receivableAmount: number;
}
