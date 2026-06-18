# Product Requirements Document (PRD)
# Proyecto: AMIGABLE COBRO (SaaS Multi-Negocio)

## 1. Visión del Producto
Transformar "Amigable Cobro" de una herramienta de gestión de cobranza mono-usuario (stand-alone) a una plataforma SaaS (Software as a Service) **multi-negocio (multi-tenant)**. La plataforma permitirá a múltiples empresas gestionar su cartera de clientes, cuentas por cobrar, abonos y difusiones por WhatsApp de forma completamente aislada y segura, bajo la administración de un "Super Admin" propietario de la plataforma.

## 2. Objetivos Principales
1.  **Arquitectura Multi-tenant:** Migrar la estructura de base de datos para aislar los datos financieros y de clientes de cada negocio.
2.  **Sistema de Autenticación Centralizado:** Implementar un Login profesional y seguro.
3.  **Panel de Super Administrador (Super Admin):** Un nuevo dashboard exclusivo para el dueño de la plataforma que permita gestionar los negocios suscritos, con un menú lateral (sidebar) y analíticas globales.
4.  **Preservación de la Experiencia del Inquilino (Tenant):** Mantener y enriquecer la interfaz actual (dashboard de métricas, tabla de transacciones, modal de WhatsApp) para los usuarios regulares (negocios), asegurando que solo vean su propia data.

---

## 3. Especificaciones de Diseño y UI/UX
*   **Nombre Oficial:** AMIGABLE COBRO
*   **Paleta de Colores (Estricta):**
    *   Primario: `#6366F1` (Índigo) - Para acciones principales, botones, elementos activos, gradientes.
    *   Secundario: `#06B6D4` (Cian) - Para acentos menores, hover states, badges.
    *   Fondos de app: `#F8FAFC` (Slate 50)
    *   Fondos de contenedores/tarjetas: `#FFFFFF`
    *   Success: Texto `#059669`, Fondo `#D1FAE5`
    *   Warning: Texto `#D97706`, Fondo `#FEF3C7`
    *   Info: Texto `#2563EB`, Fondo `#DBEAFE`
*   **Formas:** Cuadrados con bordes redondeados suaves (`rounded-md`, `rounded-lg`). Nada de círculos completos para contenedores ni botones.
*   **Login UI:** Deberá ocupar toda la pantalla, con un fondo de gradiente moderno y dinámico combinando el Primario (`#6366F1`) y el Secundario (`#06B6D4`), una tarjeta blanca central para el formulario, un logo/título claro de "AMIGABLE COBRO" y un diseño enfocado a alta conversión.

---

## 4. Requerimientos Funcionales y Módulos

### 4.1. Sistema de Autenticación (Login)
*   **Pantalla de Login:** Acceso único (`/login`).
*   **Roles de Usuario:**
    *   **Super Admin:** Accede al Panel Global (Sidebar).
    *   **Negocio (Admin de Tenant):** Accede a la interfaz actual de gestión de su empresa.
*   **Flujo:** Al ingresar credenciales válidas, el sistema verifica el rol. Si es Super Admin, redirige a `/super-admin`; si es Negocio, redirige a su dashboard principal (`/dashboard`).

### 4.2. Nuevo Panel Super Administrador (Super Admin Dashboard)
Debe respetar el diseño estético de la plataforma, pero utilizar un **Menú Lateral (Sidebar)** fijo a la izquierda y el contenido a la derecha.

#### Módulos del Sidebar del Super Admin:
1.  **Dashboard General (Métricas Globales):**
    *   Gráficos financieros globales.
    *   Métricas: Total de Negocios Activos, Ingresos Estimados de la Plataforma (SaaS), Volumen de transacciones totales.
2.  **Gestión de Negocios (CRUD):**
    *   Listado de todos los negocios registrados en la plataforma.
    *   Opción **"Crear Nuevo Negocio"**: Formulario para ingresar Nombre del Negocio, Nombre del Propietario, Email/Usuario y Contraseña.
    *   Opción de Suspender/Activar cuenta de un negocio.
    *   Botón para "Entrar como este negocio" (Impersonation) para dar soporte técnico.
3.  **Auditoría y Logs Globales:**
    *   Registro de actividad a nivel de plataforma (cuándo se crea un negocio, cuándo inicia sesión, etc.).
4.  **Ajustes Globales (Plataforma):**
    *   Gestión de la clave de OpenAI, configuraciones maestras del sistema.

### 4.3. Panel de Negocio (Tenant Dashboard - Interfaz Actual)
Es la interfaz actual, pero su consumo de datos estará restringido por un identificador de negocio (`businessId`). Contiene los siguientes procesos existentes sin obviar ninguno:

#### A. Métricas y KPIs (Top Bar)
*   Tarjetas con: Total Emitido, Cuentas Pagadas, Cuentas por Cobrar y Porcentaje de Efectividad de Cobro.

#### B. Analítica y Calendario
*   **Gráficos Financieros (`Charts.tsx`):** Gráficos de barras y líneas para visualizar la evolución de los ingresos y las cuentas por cobrar a lo largo del tiempo, basados en las transacciones registradas.
*   **Calendario de Pagos (`PaymentCalendar.tsx`):** Vista de calendario interactivo para marcar eventos importantes, proyecciones de cobro o recordatorios visuales de fechas límite de cuentas.

#### C. Registro General de Cuentas y Tabla de Transacciones
*   **Filtros Globales:** Rango de Fechas (Desde/Hasta), Búsqueda de clientes por nombre/cédula, Pestañas de estado (Todos, Pagado, Por Cobrar), Botones rápidos (Semanal, Mensual, Trimestral).
*   **Modal de "Nueva Deuda / Cuenta":**
    *   *Flujo 1 (Nuevo Cliente):* Registro de nombre, cédula, teléfono con código de área, ubicación, monto total, estado, abono inicial y fecha.
    *   *Flujo 2 (Cliente Existente):* Buscador/Dropdown inteligente de clientes previos. Auto-rellena cédula, teléfono y ubicación con capacidad de edición directa en línea (inline edit).
*   **Visualización en Tabla:**
    *   ID, Datos de Cliente (con badges visuales de teléfono y ubicación), Cédula, Fecha y Monto Total.
    *   Columna "Abonos y Saldo": Barra de progreso dinámica, texto de monto abonado vs saldo pendiente.
    *   **Registro de Abonos en Línea:** Botón "+" para registrar pagos parciales sin salir de la tabla, con validación de saldos.
    *   **Historial de Abonos:** Botón para desplegar en línea la lista histórica de fechas y montos abonados por transacción.

#### D. Asistente de Difusión de WhatsApp
*   Modal tipo SaaS con layout a 2 columnas.
*   **Columna Izquierda (Configuración):** 
    *   Selección de Audiencia (Todos, Por Cobrar, Pagado).
    *   Selección de Plantillas Predefinidas (Cobro pendiente, Pago Recibido, Evento, etc.).
    *   Editor de texto con variables inyectables (`{{cliente}}`, `{{monto}}`, `{{saldo_pendiente}}`, `{{fecha}}`).
    *   Campo para adjuntar URL de Imagen promocional o factura.
    *   Visualización de "Vista Previa" con datos reales del primer cliente en la lista.
*   **Columna Derecha (Destinatarios):**
    *   Listado de clientes resultantes del filtro.
    *   Alertas de clientes sin teléfono registrado y opción de agregar/editar teléfono en línea.
    *   Checkboxes para excluir envíos individuales.
    *   Botón para iniciar el **Asistente de Envío Secuencial**, abriendo pestañas de WhatsApp Web controladas por el usuario para evitar baneos de SPAM.

#### E. Sincronización y Configuración
*   **Google Sheets Connector:** Módulo para cargar un CSV/Hoja de cálculo y mapear las columnas dinámicamente hacia la base de datos del negocio.
*   **Asistente IA (Drawer Lateral):**
    *   Chat conversacional alimentado con el contexto de las deudas del negocio.
    *   Configuración de la personalidad de la IA, tono, instrucciones personalizadas y sugerencias de descuentos por pronto pago en mensajes de WhatsApp.

#### F. Acciones Administrativas (Menú Contextual)
*   **Cambiar Estado:** Botón en la tabla para marcar como Pagado o Por Cobrar. Utiliza el contexto de UI (Confirm) para no sobreescribir el historial de pagos accidentálmente.
*   **Aplicación de Descuentos:** Modal para hacer una quita (descuento porcentual) directo a la deuda (ej. 5% de descuento por pronto pago).

---

## 5. Arquitectura de Datos (Firestore) Requerida

Para habilitar el esquema Multi-negocio, la base de datos debe ser reestructurada:

1.  **Colección `users`:**
    *   `uid`, `email`, `role` ("SUPERADMIN" | "TENANT_ADMIN"), `businessId` (referencia al negocio que administra).
2.  **Colección `businesses`:**
    *   `id`, `name`, `ownerName`, `createdAt`, `status` ("ACTIVE" | "SUSPENDED").
3.  **Colección `transactions` (Actualizada):**
    *   Se le debe agregar obligatoriamente el campo `businessId` a cada registro.
    *   Las consultas de React (queries) ahora deberán filtrar obligatoriamente por `where('businessId', '==', currentUser.businessId)`.
4.  **Colección `settings`:**
    *   Migrar de `settings/global` a `settings/{businessId}` para que cada negocio tenga su propia configuración de encabezados de Sheets, Tone de IA, etc.

---

## 6. Sistema Global de Modales (UI Context)
Para toda la nueva interfaz del Super Admin y el Login, se debe respetar la refactorización reciente: **Ningún uso de `window.alert` o `window.confirm`**. Todo debe despacharse mediante el `useUI()` context (`toast`, `alert`, `confirm`) preservando las animaciones con `framer-motion` y los colores de la marca.

---

## 7. Fases de Implementación Sugeridas
1.  **Fase 1: Backend y Arquitectura Auth.** Configurar Firebase Authentication, reestructurar Firestore (reglas de seguridad para `businessId`), y adaptar el AuthContext.
2.  **Fase 2: Diseño de Login.** Crear el componente `LoginScreen` con los lineamientos de UI (gradientes).
3.  **Fase 3: Panel Super Admin.** Desarrollar el Layout con Sidebar y el CRUD de negocios.
4.  **Fase 4: Adaptación del Tenant.** Modificar los hooks actuales (`useTransactions`, `WhatsappBroadcastModal`, etc.) para que envíen y lean el `businessId` inyectado por el usuario logueado, garantizando el aislamiento de datos.
