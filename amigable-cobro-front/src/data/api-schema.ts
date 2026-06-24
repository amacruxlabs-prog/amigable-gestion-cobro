export const apiSchema = {
  title: "Amigable Cobro API",
  version: "1.0.0",
  description: "API de integración diseñada para consumo eficiente por parte de agentes de IA (MCP) y plataformas de automatización. Todos los endpoints requieren autenticación mediante UUID y Token.",
  baseUrl: "https://api.amigablecobro.com/api/v1",
  authentication: {
    headers: [
      { name: "X-Entity-ID", description: "El UUID de la Entidad/Agente consumiendo el API." },
      { name: "Authorization", description: "Bearer Token generado desde el panel (X-API-Key)." }
    ]
  },
  endpoints: [
    {
      group: "Directorio Público",
      description: "Directorio global de negocios disponibles en la plataforma.",
      routes: [
        {
          method: "GET",
          path: "/public/businesses",
          description: "Lista todos los negocios activos en la plataforma, retornando su ID público y número de teléfono de WhatsApp.",
          parameters: [],
          response: {
            type: "object",
            example: {
              success: true,
              data: [
                {
                  id: 1,
                  name: "Mi Negocio S.A.",
                  whatsapp_phone: "+1234567890"
                }
              ]
            }
          }
        }
      ]
    },
    {
      group: "Cobros y Cuentas",
      description: "Módulo principal para la gestión de deudas, cobros y clientes.",
      routes: [
        {
          method: "GET",
          path: "/collections",
          description: "Obtiene una lista paginada de todas las cuentas por cobrar, con opciones avanzadas de filtrado.",
          parameters: [
            { name: "business_id", type: "integer", required: true, description: "ID del negocio (Tenant)." },
            { name: "status", type: "string", required: false, enum: ["PENDING", "PAID"], description: "Filtra por estado de la cuenta." },
            { name: "start_date", type: "string(ISO8601)", required: false, description: "Filtro desde fecha de vencimiento." },
            { name: "end_date", type: "string(ISO8601)", required: false, description: "Filtro hasta fecha de vencimiento." },
            { name: "page", type: "integer", required: false, description: "Número de página (default: 1)." }
          ],
          response: {
            type: "object",
            example: {
              success: true,
              data: [
                {
                  id: 1045,
                  client_name: "Juan Perez",
                  client_phone: "+1234567890",
                  client_document: "10203040A",
                  total_amount: 1500.50,
                  paid_amount: 500.00,
                  status: "PENDING",
                  due_date: "2026-07-01T00:00:00Z",
                  created_at: "2026-06-20T14:30:00Z"
                }
              ],
              meta: { total: 100, current_page: 1, last_page: 5 }
            }
          }
        },
        {
          method: "POST",
          path: "/collections",
          description: "Registra una nueva cuenta por cobrar (transacción) en el sistema.",
          body: {
            business_id: { type: "integer", required: true, description: "ID del negocio (Tenant)." },
            client_name: { type: "string", required: true, description: "Nombre del cliente/deudor." },
            client_phone: { type: "string", required: false, description: "Teléfono internacional (e.g. +123456789)." },
            client_document: { type: "string", required: false, description: "Documento de identidad (DNI/Pasaporte)." },
            total_amount: { type: "number(float)", required: true, description: "Monto total a cobrar." },
            due_date: { type: "string(ISO8601)", required: true, description: "Fecha límite de pago." }
          },
          response: {
            type: "object",
            example: { success: true, message: "Cuenta creada", data: { id: 1046 } }
          }
        },
        {
          method: "POST",
          path: "/collections/{id}/payments",
          description: "Aplica un abono o pago total a una cuenta específica.",
          body: {
            business_id: { type: "integer", required: true, description: "ID del negocio (Tenant)." },
            amount: { type: "number(float)", required: true, description: "Cantidad abonada." },
            payment_method: { type: "string", enum: ["CASH", "TRANSFER", "CARD", "OTHER"], required: true, description: "Método utilizado." },
            payment_date: { type: "string(ISO8601)", required: false, description: "Fecha en la que se realizó el pago (Default: Now)." }
          },
          response: {
            type: "object",
            example: { success: true, message: "Pago registrado", new_paid_amount: 1500.50, new_status: "PAID" }
          }
        },
        {
          method: "PUT",
          path: "/collections/{id}/status",
          description: "Fuerza el cambio de estado de una cuenta (útil para perdonar deuda o marcar como incobrable).",
          body: {
            business_id: { type: "integer", required: true, description: "ID del negocio (Tenant)." },
            status: { type: "string", enum: ["PENDING", "PAID", "CANCELLED", "UNCOLLECTIBLE"], required: true, description: "El nuevo estado." }
          },
          response: {
            type: "object",
            example: { success: true, message: "Estado actualizado" }
          }
        }
      ]
    },
    {
      group: "Estadísticas e Inteligencia",
      description: "Datos agregados y KPIs del negocio en tiempo real.",
      routes: [
        {
          method: "GET",
          path: "/analytics/kpis",
          description: "Retorna un resumen ejecutivo con los indicadores clave de rendimiento (KPIs) del negocio.",
          parameters: [
            { name: "business_id", type: "integer", required: true, description: "ID del negocio (Tenant)." },
            { name: "period", type: "string", enum: ["today", "this_week", "this_month", "this_year", "all_time"], required: false, description: "Rango de tiempo." }
          ],
          response: {
            type: "object",
            example: {
              success: true,
              data: {
                total_emitted: 50000.00,
                total_collected: 35000.00,
                total_pending: 15000.00,
                collection_rate: 70.0,
                active_accounts: 145,
                paid_accounts: 300
              }
            }
          }
        }
      ]
    },
    {
      group: "Calendario y Eventos",
      description: "Visualización temporal y proyecciones de cobro.",
      routes: [
        {
          method: "GET",
          path: "/calendar/events",
          description: "Retorna todas las transacciones formateadas como eventos de calendario para proyecciones.",
          parameters: [
            { name: "business_id", type: "integer", required: true, description: "ID del negocio (Tenant)." },
            { name: "month", type: "integer", required: true, description: "Mes numérico (1-12)." },
            { name: "year", type: "integer", required: true, description: "Año numérico (e.g. 2026)." }
          ],
          response: {
            type: "object",
            example: {
              success: true,
              data: [
                {
                  date: "2026-07-01",
                  total_expected: 1500.50,
                  total_collected: 0,
                  events: [
                    { transaction_id: 1045, client_name: "Juan Perez", amount: 1500.50, status: "PENDING" }
                  ]
                }
              ]
            }
          }
        }
      ]
    }
  ]
};
