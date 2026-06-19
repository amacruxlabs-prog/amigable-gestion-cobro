# PRD - Expansión y Refactorización del Panel Superadmin (SaaS Management)

## 1. Visión General y Objetivos
Este Documento de Requisitos del Producto (PRD) establece la hoja de ruta para la evolución del **Panel de Super Administrador** de la plataforma "Amigable Gestión de Cobro". 
Actualmente, el panel de Superadmin cuenta con funcionalidades básicas (crear negocios). El objetivo es convertirlo en un verdadero centro de mando (SaaS Control Panel) con gestión avanzada de inquilinos (tenants), métricas de rendimiento globales (MRR, volumen de transacciones), auditoría de usuarios y controles de sesión estrictos, asegurando además la navegación lógica entre el rol Superadmin y los entornos de negocio.

---

## 2. Reglas de Negocio Clave

1. **Aislamiento de Panel de Negocio (Tenant View):** 
   Un Superadmin *no* podrá visualizar el Dashboard Transaccional (Panel Negocio) si no tiene un `business_id` asociado en su sesión actual. En su lugar, será forzado a permanecer en el Panel de Superadmin.
2. **Impersonación (Apersonarse):** 
   Para que un Superadmin pueda ver o ayudar a operar un negocio, deberá utilizar la función de "Impersonar" (Acceder como Negocio). Esto actualizará temporalmente su `business_id` en el contexto y recargará la aplicación para darle acceso completo a ese tenant.
3. **Control de Ciclo de Vida del Negocio:**
   Los negocios pueden estar en estado `Activo`, `Suspendido` (por falta de pago) o `Eliminado` (Soft-delete). Un negocio suspendido bloqueará automáticamente el acceso a todos los usuarios que pertenezcan a ese tenant, redirigiéndolos a una pantalla de "Suscripción Inactiva".
4. **Cierre de Sesión Universal:**
   Tanto la vista del Panel Superadmin como la vista del Panel de Negocio deben contar con un botón claro y accesible de **Cerrar Sesión** (`Logout`), que destruya el token y limpie todo el estado local (incluyendo la caché).

---

## 3. Fases de Desarrollo: Casos de Uso y Criterios de Aceptación

### Fase 1: Arquitectura de Navegación y Cierre de Sesión
**Objetivo:** Garantizar que los accesos y salidas de la aplicación sean lógicos y seguros.

- **Caso de Uso 1.1: Prevención de acceso a "Panel Negocio" sin Tenant.**
  - *Descripción:* Un Superadmin recién creado inicia sesión. Dado que no tiene negocio asignado, el sistema no debe intentar cargar el `AppLayout` ni consultar `transactions`.
  - *Criterio de Aceptación:* El flujo de la aplicación renderiza *exclusivamente* el componente `SuperadminPanel`. El botón de "Cerrar Panel" debe estar oculto o deshabilitado si `business_id` es nulo.

- **Caso de Uso 1.2: Botón de Cerrar Sesión (Logout) global.**
  - *Descripción:* El usuario necesita poder salir de su cuenta desde cualquier vista.
  - *Criterio de Aceptación:* Se debe agregar un botón rojo o destacado de "Cerrar Sesión" en el Sidebar del `SuperadminPanel` y en el Header/Sidebar del `AppLayout` (Panel Negocio). Al presionarlo, el token se borra y redirige a `/login`.

### Fase 2: Dashboard Superadmin (KPIs Globales del SaaS)
**Objetivo:** Proveer una vista de pájaro sobre el estado financiero y operativo de toda la plataforma.

- **Caso de Uso 2.1: Visualización de Métricas del SaaS.**
  - *Descripción:* Al entrar a la pestaña "Dashboard General", el Superadmin debe ver estadísticas vitales del software.
  - *Criterios de Aceptación:*
    - Mostrar **MRR (Ingreso Recurrente Mensual)** estimado basado en negocios activos x tarifa.
    - Mostrar **Total de Negocios Registrados** (Activos vs Suspendidos).
    - Mostrar **Volumen de Transacciones Globales** (Cuánto dinero se está moviendo a través de la plataforma sumando todos los negocios).
    - Mostrar un gráfico de líneas de "Nuevos Negocios por Mes".

### Fase 3: Gestión Avanzada de Negocios y Tenants
**Objetivo:** Expandir el CRUD básico de negocios a un control absoluto sobre el inquilino.

- **Caso de Uso 3.1: Creación de Negocios (Con Auto-asignación).**
  - *Descripción:* El Superadmin puede crear un negocio, y opcionalmente definirse a sí mismo como el dueño inicial, o crear un nuevo usuario Admin.
  - *Criterios de Aceptación:* El formulario debe permitir dejar el correo/password en blanco si el Superadmin marca la casilla "Asignarme a mí mismo como Dueño".

- **Caso de Uso 3.2: Suspender y Reactivar Negocios.**
  - *Descripción:* Bloquear el acceso a negocios que no han pagado su mensualidad.
  - *Criterios de Aceptación:* Botón tipo "Toggle" o Switch en la lista de negocios para cambiar el estado. El backend debe rechazar todas las llamadas a la API (retornando `403 Forbidden`) si el `business_id` del token pertenece a un negocio suspendido.

- **Caso de Uso 3.3: Impersonación de Negocios ("Entrar al Negocio").**
  - *Descripción:* El Superadmin necesita auditar un negocio por dentro.
  - *Criterios de Aceptación:* Botón de "Acceder" en la tabla de negocios. Al hacer clic, el backend genera un nuevo JWT con el `business_id` inyectado o el frontend actualiza el contexto local y recarga el navegador. El panel de Superadmin se cierra y se abre el Panel Negocio de ese Tenant.

### Fase 4: Auditoría Global y Ajustes Maestros
**Objetivo:** Trazabilidad de seguridad y configuración global.

- **Caso de Uso 4.1: Registro de Actividades (Logs de Auditoría).**
  - *Descripción:* Tabla que muestra un log de seguridad centralizado.
  - *Criterios de Aceptación:* La vista "Auditoría Global" mostrará registros reales provenientes del backend como: "Negocio X suspendido por Admin", "Usuario Y cambió contraseña", "Se importaron Z transacciones en Negocio A". Debe ser paginado.

- **Caso de Uso 4.2: Ajustes Maestros de la Plataforma.**
  - *Descripción:* Formularios para parámetros globales del sistema.
  - *Criterios de Aceptación:* Funcionalidad para guardar keys globales (ej. Resend / SendGrid para correos transaccionales) y modificar la variable de "Costo Mensual Suscripción" que alimenta el KPI de MRR de la Fase 2.

---

## 4. Requerimientos Técnicos

- **Frontend:**
  - El componente `SuperadminPanel.tsx` debe refactorizarse en submódulos (ej. `SuperadminDashboard`, `SuperadminBusinesses`, etc.) para evitar un archivo inmanejable.
  - Implementación de `useSuperadmin.ts` hook para abstraer las llamadas a la API de Superadmin.
- **Backend:**
  - Middleware `EnsureBusinessIsActive` para verificar que el negocio del tenant no esté suspendido en cada petición.
  - Generación de endpoints específicos: `/api/superadmin/kpis`, `/api/superadmin/businesses/{id}/toggle-status`, `/api/superadmin/impersonate/{id}`.

