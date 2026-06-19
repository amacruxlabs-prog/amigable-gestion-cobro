/**
 * Global Formatting Helpers for Amigable Cobro
 * Handles currency formatting (dot thousands, comma decimals),
 * date formatting (dd/mm/yyyy), time formatting (hh:mm AM/PM)
 * using Venezuelan timezone (America/Caracas).
 */

/**
 * Formats a number to currency with dots for thousands and comma for decimals.
 * Example: 1250000 -> $1.250.000
 * Example: 1250000.5 -> $1.250.000,50
 */
export function formatCurrency(value: number | string | undefined | null, showDecimalsAlways = false): string {
  const num = Number(value);
  if (value === undefined || value === null || isNaN(num)) {
    return '$0';
  }

  const hasDecimals = num % 1 !== 0;
  const parts = num.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Separator of thousands
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (showDecimalsAlways || hasDecimals) {
    return `$${integerPart},${decimalPart}`;
  }
  return `$${integerPart}`;
}

/**
 * Formats a date string or object to dd/mm/yyyy in Venezuela timezone (America/Caracas)
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  // If it's a simple YYYY-MM-DD string, format it directly to avoid any browser timezone offset shifts
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-');
    return `${d}/${m}/${y}`;
  }

  // If it has timezone prefix or is ISO string
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Caracas'
  });
  return formatter.format(date);
}

/**
 * Formats a date string or object to hh:mm AM/PM in Venezuela timezone (America/Caracas)
 */
export function formatTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Caracas'
  });
  return formatter.format(date);
}

/**
 * Formats both date and time as dd/mm/yyyy hh:mm AM/PM in Venezuela timezone (America/Caracas)
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Caracas'
  });
  return formatter.format(date).replace(',', '');
}

/**
 * Returns current date in Venezuela timezone formatted as YYYY-MM-DD
 */
export function getVenezuelaTodayStr(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Caracas'
  });
  return formatter.format(now);
}
