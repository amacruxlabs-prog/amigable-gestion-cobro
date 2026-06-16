import { Transaction } from '../types';

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-1001',
    clientName: 'Alejandro Ruiz - Cuota de Cliente Mayo',
    amount: 145.00,
    status: 'Pagado',
    date: '2026-05-12',
    phone: '+52 55 1234 5678',
    location: 'Cliente Activo',
    originalData: {
      'Nombre de Cliente': 'Alejandro Ruiz - Cuota de Cliente Mayo',
      'Monto Total': '145.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-05-12',
      'Teléfono': '+52 55 1234 5678',
      'Dirección': 'Cliente Activo'
    }
  },
  {
    id: 'TX-1002',
    clientName: 'Familia Rodríguez - Mantenimiento Piscina',
    amount: 32.50,
    status: 'Pagado',
    date: '2026-05-15',
    location: 'Cliente Especial',
    originalData: {
      'Nombre de Cliente': 'Familia Rodríguez - Mantenimiento Piscina',
      'Monto Total': '32.50',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-05-15',
      'Dirección': 'Cliente Especial'
    }
  },
  {
    id: 'TX-1003',
    clientName: 'Sofía Alarcón - Alquiler Salón Principal',
    amount: 850.00,
    status: 'Cobrar',
    date: '2026-05-18',
    phone: '+57 320 123 4567',
    location: 'Área Reservada VIP',
    paidAmount: 350.00,
    payments: [
      { amount: 200.00, date: '2026-05-19' },
      { amount: 150.00, date: '2026-05-24' }
    ],
    originalData: {
      'Nombre de Cliente': 'Sofía Alarcón - Alquiler Salón Principal',
      'Monto Total': '850.00',
      'Estado de Pago': 'Por cobrar',
      'Fecha': '2026-05-18',
      'Teléfono': '+57 320 123 4567',
      'Dirección': 'Área Reservada VIP'
    }
  },
  {
    id: 'TX-1004',
    clientName: 'Carlos Mendoza - Cuota Anual',
    amount: 1850.00,
    status: 'Pagado',
    date: '2026-05-20',
    originalData: {
      'Nombre de Cliente': 'Carlos Mendoza - Cuota Anual',
      'Monto Total': '1850.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-05-20'
    }
  },
  {
    id: 'TX-1005',
    clientName: 'Empresa TechCorp - Torneo de Tenis',
    amount: 2100.00,
    status: 'Cobrar',
    date: '2026-05-22',
    paidAmount: 1000.00,
    payments: [
      { amount: 1000.00, date: '2026-05-23' }
    ],
    originalData: {
      'Nombre de Cliente': 'Empresa TechCorp - Torneo de Tenis',
      'Monto Total': '2100.00',
      'Estado de Pago': 'Pendiente',
      'Fecha': '2026-05-22'
    }
  },
  {
    id: 'TX-1006',
    clientName: 'Lucía Méndez - Banquete Graduación Familiar',
    amount: 3200.00,
    status: 'Cobrar',
    date: '2026-05-25',
    paidAmount: 1200.00,
    payments: [
      { amount: 1200.00, date: '2026-05-26' }
    ],
    originalData: {
      'Nombre de Cliente': 'Lucía Méndez - Banquete Graduación Familiar',
      'Monto Total': '3200.00',
      'Estado de Pago': 'Cobrar',
      'Fecha': '2026-05-25'
    }
  },
  {
    id: 'TX-1007',
    clientName: 'Andrés Beltrán - Clase de Natación',
    amount: 45.00,
    status: 'Pagado',
    date: '2026-05-25',
    originalData: {
      'Nombre de Cliente': 'Andrés Beltrán - Clase de Natación',
      'Monto Total': '45.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-05-25'
    }
  },
  {
    id: 'TX-1008',
    clientName: 'Juan Pérez - Restaurante Consumo',
    amount: 125.50,
    status: 'Pagado',
    date: '2026-05-28',
    originalData: {
      'Nombre de Cliente': 'Juan Pérez - Restaurante Consumo',
      'Monto Total': '125.50',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-05-28'
    }
  },
  {
    id: 'TX-1009',
    clientName: 'Cliente 1582 - Cuota de Cliente Mayo',
    amount: 145.00,
    status: 'Pagado',
    date: '2026-05-29',
    originalData: {
      'Nombre de Cliente': 'Cliente 1582 - Cuota de Cliente Mayo',
      'Monto Total': '145.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-05-29'
    }
  },
  {
    id: 'TX-1010',
    clientName: 'Distribuidora Alimentos - Comisión Evento',
    amount: 600.00,
    status: 'Cobrar',
    date: '2026-06-01',
    originalData: {
      'Nombre de Cliente': 'Distribuidora Alimentos - Comisión Evento',
      'Monto Total': '600.00',
      'Estado de Pago': 'Por cobrar',
      'Fecha': '2026-06-01'
    }
  },
  {
    id: 'TX-1011',
    clientName: 'Alejandra Ruiz - Servicio Club de Vinos',
    amount: 95.00,
    status: 'Pagado',
    date: '2026-06-02',
    originalData: {
      'Nombre de Cliente': 'Alejandra Ruiz - Servicio Club de Vinos',
      'Monto Total': '95.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-06-02'
    }
  },
  {
    id: 'TX-1012',
    clientName: 'Patricia Gómez - Cena aniversario',
    amount: 380.00,
    status: 'Pagado',
    date: '2026-06-03',
    originalData: {
      'Nombre de Cliente': 'Patricia Gómez - Cena aniversario',
      'Monto Total': '380.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-06-03'
    }
  },
  {
    id: 'TX-1013',
    clientName: 'Marcos Peña - Catering Cumpleaños infantil',
    amount: 720.00,
    status: 'Pagado',
    date: '2026-06-04',
    originalData: {
      'Nombre de Cliente': 'Marcos Peña - Catering Cumpleaños infantil',
      'Monto Total': '720.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-06-04'
    }
  },
  {
    id: 'TX-1014',
    clientName: 'Cliente 2093 - Recepción Salón Privado',
    amount: 5400.00,
    status: 'Cobrar',
    date: '2026-06-04',
    phone: '+54 9 11 1234-5678',
    originalData: {
      'Nombre de Cliente': 'Cliente 2093 - Recepción Salón Privado',
      'Monto Total': '5400.00',
      'Estado de Pago': 'Cobrar',
      'Fecha': '2026-06-04',
      'Teléfono': '+54 9 11 1234-5678'
    }
  },
  {
    id: 'TX-1015',
    clientName: 'Cliente 1120 - Cuota de Cliente Junio',
    amount: 145.00,
    status: 'Pagado',
    date: '2026-06-05',
    originalData: {
      'Nombre de Cliente': 'Cliente 1120 - Cuota de Cliente Junio',
      'Monto Total': '145.00',
      'Estado de Pago': 'Pagado',
      'Fecha': '2026-06-05'
    }
  }
];
