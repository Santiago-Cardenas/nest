# Informe técnico — API BiblioIcesi

Fecha: 15 de octubre de 2025

Este documento describe las funcionalidades implementadas en la API, cómo se implementaron las características clave (autenticación, autorización, persistencia) y cómo ejecutar las pruebas tanto localmente como en CI.

## Índice

- Funcionalidades principales
- Diseño de módulos y rutas
- Autenticación
  - JWT
  - 2FA (TOTP)
- Autorización
  - Roles y guardias
- Persistencia y configuración de la base de datos
  - TypeORM y entidades
  - `src/config/database.config.ts`
- Seed de datos
- Pruebas
  - Unitarias
  - E2E
  - CI (GitHub Actions)
- Despliegue (Render)
- Recomendaciones y próximos pasos

---

## Funcionalidades principales

La API implementa las operaciones habituales para una biblioteca: gestión de usuarios, libros, copias, reservas y préstamos.

Resumen de endpoints (selección):

- Auth: `/auth/register`, `/auth/login`, endpoints 2FA (`/auth/2fa/*`).
- Users: CRUD limitado (admin), perfil (`/users/profile`).
- Books: creación, listado público, detalle, actualización y eliminación.
- Copies: crear copias, listar, consultar disponibilidad, actualizar estado.
- Reservations: crear reservas, listados por usuario/pendientes, cumplir/cancelar reservas.
- Loans: crear préstamos, devolver (calcula multas), listados.
- Google Books: proxy de búsqueda y enriquecimiento de metadatos (`/google-books/*`).
- Seed: `POST /seed` que reinicia DB y carga datos de ejemplo (útil para e2e).

Todos los endpoints se encuentran bajo el prefijo global `/api` (configurado en `src/main.ts`).

## Diseño de módulos y rutas

La aplicación sigue la estructura modular típica de NestJS. Carpetas principales en `src/`:

- `auth/` — lógica de autenticación (controlador y servicio). Registra el `JwtModule` y las estrategias `jwt.strategy`.
- `users/` — gestión de usuarios.
- `books/`, `copies/`, `reservations/`, `loans/` — módulos con controladores, servicios y DTOs.
- `google-books/` — integración con Google Books API (usa `@nestjs/axios`).
- `seed/` — endpoint para cargar datos de prueba.
- `config/` — configuración (incluye `database.config.ts` y `jwt.config.ts`).

Las validaciones se realizan con DTOs y `class-validator` y se aplican globalmente mediante `ValidationPipe` en `src/main.ts`.

## Autenticación

### JWT

- Implementación: `@nestjs/jwt` y `passport-jwt` (estrategia JWT).
- Flujo:
  1. El usuario realiza `POST /auth/login` con credenciales.
  2. El servicio `AuthService` valida credenciales (usando `UsersService`) y firma un token JWT con `JwtService.sign()`.
  3. El token incluye los claims necesarios (userId y roles) y se devuelve al cliente.
  4. Los endpoints protegidos usan `JwtAuthGuard` para validar y deserializar el token en cada petición.
- Configuración: `src/config/jwt.config.ts` (toma `JWT_SECRET` y TTL desde variables de entorno).

### 2FA (TOTP)

- Se usa `speakeasy` para generar secretos TOTP y `qrcode` para proveer QR cuando el usuario habilita 2FA.
- Flujo:
  - `POST /auth/2fa/generate` crea un secreto y una imagen QR (cadena base64) que el usuario guarda en su app de autenticación (Google Authenticator, Authy).
  - `POST /auth/2fa/enable` valida el código TOTP y activa el flag `twoFactorEnabled` en la entidad `User` y almacena el secreto (hash/seguro según implementación).
  - `POST /auth/2fa/login` permite completar un login con password + TOTP.

Notas de seguridad:
- El secreto TOTP se guarda asociado al usuario. Evitar exponerlo en logs.
- El JWT puede incluir un flag o claim que marque si el usuario completó 2FA en la sesión.

## Autorización

- Se implementa autorización basada en roles.
- Decorador `@Roles(...)` se usa en controladores y el `RolesGuard` verifica que el usuario (del token JWT) tenga alguno de los roles requeridos.
- `JwtAuthGuard` y `RolesGuard` se combinan para controlar acceso.
- Además existe un decorador `@Public()` para endpoints abiertos.

Políticas aplicadas:
- `admin` y `librarian` tienen permisos para crear/editar recursos.
- Estudiantes (`student`) están limitados a operaciones propias (reservas, préstamos) y no pueden modificar recursos globales.

## Persistencia y configuración de base de datos

### TypeORM y entidades

- ORM: TypeORM (v0.3.x) con entidades en `src/**/entities/*.entity.ts` (User, Book, Copy, Reservation, Loan).
- Cada entidad modela sus relaciones (OneToMany, ManyToOne, etc.).
- Repositorios: inyectados con `@InjectRepository(Entity)` y usados desde servicios para CRUD y lógica de negocio.

### Configuración de DB: `src/config/database.config.ts`

- El archivo permite seleccionar el tipo de BD según entorno:
  - `DB_TYPE` (nuevo) fuerza el tipo (ej. `postgres` o `sqlite`).
  - Si `DB_TYPE` no está definido, el comportamiento por defecto era usar `sqlite` en tests (`NODE_ENV === 'test'` o `JEST_WORKER_ID`) y `postgres` en otros entornos.
- Variables esperadas para Postgres en producción/CI:
  - `DB_TYPE=postgres`
  - `DB_HOST`
  - `DB_PORT` (por defecto 5432)
  - `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
  - `DB_SYNCHRONIZE` para controlar `synchronize` (si `true`, TypeORM sincroniza el esquema; en producción normalmente `false` y se usan migraciones).
- En CI se configuró el job para pasar `DB_TYPE=postgres` y las credenciales al runner, y se inicia un servicio Postgres ephemeral para las pruebas e2e.

### Migraciones vs synchronize
- Actualmente la opción de sincronización automática (`synchronize`) depende de `DB_TYPE` y variables; si usas Postgres en producción, se recomienda usar migraciones en lugar de `synchronize: true`.

## Seed de datos

- Endpoint `POST /seed` limpia la BD y carga usuarios, libros y copias de ejemplo. Es usado por las pruebas e2e para crear un estado conocido.
- Atención: el endpoint es público en este proyecto y debe protegerse o eliminarse en entornos de producción.

## Pruebas

### Unitarias
- Ejecutar: `npm run test`
- Framework: Jest. Tests unitarios se encuentran bajo `src/**/*.spec.ts`.

### E2E
- Ejecutar: `npm run test:e2e` (por comodidad, en CI se usa `--runInBand`)
- Requieren una base de datos limpia (el seed o el job de CI prepara la DB).
- Implementación de e2e: usan `supertest` para interactuar con la API y dependen de `/seed` para preparar datos.

### CI (GitHub Actions)
- `ci.yml` arranca un servicio Postgres dentro del runner (imagen `postgres:15`) y exporta variables `DB_*` para que las e2e conecten a la DB ephemeral.
- Hay un paso `Wait for Postgres` que espera a que `pg_isready` acepte conexiones antes de ejecutar las pruebas.
- Si quieres que TypeORM cree el esquema automáticamente en CI, añade `DB_SYNCHRONIZE=true` al env del job o ejecuta migraciones antes de las pruebas.

## Despliegue (Render)

- `deploy-render.yml` invoca un Deploy Hook en Render (POST a la URL almacenada en el secret `RENDER_DEPLOY_HOOK`) cuando hay push a `main` y las pruebas locales en el runner pasan.
- El pipeline **no aprovisiona** la base de datos de producción; debes provisionar un Postgres en Render (o usar un servicio externo) y configurar las variables de entorno en el dashboard de Render para que la app pueda conectarse.
- En caso de usar Render-managed Postgres, añade las credenciales en los Environment Variables del Service en Render.

## Recomendaciones y próximos pasos

1. En producción no expongas el endpoint `POST /seed`. Protégete o remuévelo.
2. Usar migraciones (TypeORM migrations) para producción en vez de `synchronize: true`.
3. Añadir coverage thresholds en CI para bloquear merges si la cobertura cae por debajo de X%.
4. Configurar variables sensibles en el fork y en Render (DB, JWT_SECRET, GOOGLE_BOOKS_API_KEY si aplica).
5. Considerar rotación de secrets y revisión de logs en Render.

---

Si quieres, genero un pequeño playbook paso a paso (cheklist) para desplegar en el fork: crear Deploy Hook en Render, añadir `RENDER_DEPLOY_HOOK` en GitHub, configurar DB en Render, y forzar un deploy. ¿Lo genero ahora?  
