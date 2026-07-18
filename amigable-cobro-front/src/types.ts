export interface Transaction {
  id: string;
  clientName: string;
  amount: number;
  status: 'Pagado' | 'Cobrar'; // 'Pagado' (paid) or 'Cobrar' (receivable)
  date: string; // ISO YYYY-MM-DD format (created_at)
  phone?: string; // Phone number for AI notifications
  location?: string; // Client's physical location/address
  cedula?: string;
  paidAmount?: number; // Cumulative partial payments registered so far
  dueDate?: string; // ISO YYYY-MM-DD format
  payments?: { id: number; amount: number; date: string }[]; // Historical payments registry
  discounts?: { percentage: number; amount: number; date: string }[]; // Historical discounts registry
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

export interface ActivityLog {
  id: number;
  business_id: number | null;
  user_id: number | null;
  user_email: string | null;
  action_type: string;
  description: string | null;
  auditable_type: string | null;
  auditable_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ActivityLogFilters {
  action_type?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  auditable_type?: string;
}
