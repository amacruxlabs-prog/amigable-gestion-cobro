# Product Requirements Document (PRD) - Backend API (Amigable Cobro)

## 1. Visión del Producto
Desarrollar una API REST robusta, escalable y segura para el SaaS Multi-Negocio "Amigable Cobro", reemplazando la dependencia directa actual (BaaS como Firestore) por un backend centralizado y administrado internamente. Este backend estará basado en Laravel 13 y se encargará de gestionar la lógica de negocio multi-tenant, la autenticación y la persistencia de datos, utilizando una arquitectura limpia mediante patrones de diseño avanzados.

## 2. Requerimientos Técnicos y Arquitectura
- **Framework:** Laravel 13.
- **Infraestructura (Docker):** Sistema orquestado con dos (2) contenedores principales conectados en una red interna de Docker:
  1. Contenedor de aplicación (PHP/Laravel 13 + Servidor Web).
  2. Contenedor de Base de Datos (ej. MySQL/PostgreSQL) configurado con volúmenes de Docker para garantizar la persistencia de los datos ante caídas o reinicios.
- **Autenticación:** Tokens JWT (JSON Web Tokens) sin estado para protección de rutas y manejo de sesiones HTTP.
- **Manejo de Roles:** Paquete Spatie Laravel Permission para roles predefinidos (`SuperAdmin`, `TenantAdmin`).
- **Normalización de Respuestas:** Todas las peticiones HTTP (éxito y errores) compartirán una única estructura JSON estándar, facilitando el parseo y consumo desde el cliente frontend de React.
- **Restricción de Pruebas (Anti-Testing):** Configuración explícita y estricta para bloquear por completo la ejecución de pruebas unitarias y de integración, eliminando el riesgo de manipulación de la base de datos por comandos accidentales (`RefreshDatabase`).
- **Patrones de Diseño Implementados:**
  - **Service Pattern:** Para encapsular toda la lógica de negocio y validación, manteniendo controladores anémicos.
  - **Repository Pattern:** Para abstraer las consultas de Eloquent y la persistencia, facilitando el cambio de origen de datos si se requiere.
  - **Factory Pattern:** Para la construcción compleja de objetos o entidades de negocio que el sistema necesite instanciar.
  - **Decorator Pattern (Cache):** Utilizado específicamente para añadir una capa intermedia de caché a los repositorios, devolviendo datos memorizados y reduciendo la carga de la DB sin alterar el código original del repositorio.

---

## 3. Fases de Implementación del Backend

### Fase 1: Entorno de Desarrollo y Dockerización
- Configuración de un archivo `docker-compose.yml`.
- Definición de imágenes base y levantamiento de 2 contenedores estrictos: el servicio `app` (Laravel) y el servicio `db` (Base de Datos).
- Configuración y mapeo de un volumen local para la persistencia del contenedor `db`, asegurando la salvaguarda permanente de los datos.
- Sincronización del contenedor de Laravel con el contenedor de Base de Datos para que puedan comunicarse por red interna.

### Fase 2: Configuración de Seguridad y Bloqueo Absoluto de Testing
- Remoción nativa de los paquetes de testing (`phpunit/phpunit`, `pestphp/pest`) del archivo `composer.json`.
- Eliminación física de los directorios de pruebas base de Laravel (ej. carpeta `/tests`).
- Creación de un "command interceptor" o eliminación explícita del comando `php artisan test`.
- Configuración a nivel del núcleo de Laravel para arrojar una Excepción Fatal inmediata si detecta intentos de levantar configuraciones en entorno `testing`, garantizando al 100% que la base de datos nunca se sobreescribirá accidentalmente.

### Fase 3: Estandarización Total de la Respuesta API
- Creación de un formato centralizado (ej. usando un trait `ApiResponse` o Resource Collections).
- **Formato Estricto de Éxito (`200 OK`, `201 Created`):**
  ```json
  {
    "success": true,
    "message": "Operación completada exitosamente.",
    "data": { ... }
  }
  ```
- **Formato Estricto de Error (`4xx`, `5xx`):**
  ```json
  {
    "success": false,
    "message": "Mensaje legible del error.",
    "error_code": "AUTH_01",
    "details": { ... }
  }
  ```
- Sobreescritura del manejador de Excepciones global de Laravel (`Handler.php` o `bootstrap/app.php` en Laravel 11+) para garantizar que errores inesperados, validaciones de Form Requests o fallos de DB siempre retornen bajo la estructura "Error".

### Fase 4: Autenticación JWT y Roles de Sistema (Spatie)
- Configuración de un driver JWT nativo para el guard de la API en `config/auth.php`.
- Creación de las rutas base de Auth (`/api/auth/login`, `/api/auth/me`).
- Instalación y configuración de Spatie Laravel Permission.
- Generación de Migraciones (Seeding) para insertar de entrada los roles maestros del sistema (`super-admin` y `tenant`).
- Implementación de un Middleware JWT que identifique el payload, localice al usuario y cargue sus roles Spatie en la sesión de la API.

### Fase 5: Estructuración Arquitectónica y Patrones de Diseño
- **Bases de Datos Multi-tenant:** Creación de migraciones principales con el pilar multi-negocio (`users`, `businesses`, `transactions`) exigiendo a nivel de esquema la clave foránea `business_id` en las entidades transaccionales.
- **Implementación de Patrones:**
  - **Repositories:** Creación de interfaces (ej. `TransactionRepositoryInterface`) y sus implementaciones basadas en Eloquent para separar el acceso a datos.
  - **Decorators (Cache):** Creación de clases decoradoras (ej. `CachedTransactionRepository` que envuelve a `TransactionRepository`). Al invocar un método de lectura, el Decorador revisa si hay copia en Cache (Redis/File); de no haber, invoca al repositorio real y cachea el resultado.
  - **Services:** Creación de las capas de servicio (ej. `TransactionService`) que inyectan los repositorios (o sus decoradores) para validar lógicas de negocio, calcular totales y emitir órdenes al repositorio de escritura.
  - **Factories:** Creación de Factories (no las del testing de Laravel, sino patrones de diseño puros) para delegar la lógica algorítmica de creación de transacciones compuestas complejas.

### Fase 6: Desarrollo de Endpoints API Restful
- Implementación y ruteo de endpoints mediante controladores anémicos que únicamente reciben la HTTP request, llaman a los `Services` y devuelven el formato estándar.
- **Módulo Super Admin:** Rutas protegidas para crear nuevos `businesses`, suspender inquilinos y visualizar analíticas globales.
- **Módulo Tenant (Negocio):** Rutas para clientes, transacciones e ingresos. Todas estas rutas utilizarán Scopes globales o validaciones inyectadas en los `Services` que filtren forzosamente los datos utilizando el `business_id` incrustado en el token JWT del usuario emisor, salvaguardando en todo momento el aislamiento de la información.
