Modulos para el primer mes (3‑4)

 Auth y Usuarios: login, perfiles, gestion de usuarios base. Organizaciones / Multi‑tenant: empresas, membresias, limites y configuracion basica por empresa. Roles y Permisos (RBAC): control de acceso por empresa y por modulo. Suscripciones y Planes: planes, estados, vencimientos, cambios de plan. Endpoints sugeridos (v1) Auth POST /auth/login POST /auth/refresh POST /auth/logout GET /auth/me Usuarios POST /users GET /users GET /users/:id PATCH /users/:id PATCH /users/:id/status (activar/desactivar) Organizaciones (empresas) POST /orgs GET /orgs GET /orgs/:id PATCH /orgs/:id POST /orgs/:id/members (invitar / vincular usuario) PATCH /orgs/:id/members/:memberId (rol, estado) Roles y permisos POST /orgs/:id/roles GET /orgs/:id/roles PATCH /orgs/:id/roles/:roleId POST /orgs/:id/roles/:roleId/permissions DELETE /orgs/:id/roles/:roleId/permissions/:permId Planes y suscripciones GET /plans POST /plans (solo super admin) PATCH /plans/:id POST /orgs/:id/subscription PATCH /orgs/:id/subscription (cambio plan / ciclo) GET /orgs/:id/subscription Diseno de BDD normalizado (5NF) para los modulos iniciales 1) Entidades base users id (PK), email (UNIQUE), password_hash, full_name, phone, status, created_at, updated_at orgs id (PK), name, tax_id, status, timezone, created_at, updated_at 2) Multi‑tenant y membresias (5NF) org_members id (PK), org_id (FK), user_id (FK), status, joined_at UNIQUE (org_id, user_id) org_member_invites id (PK), org_id (FK), email, token, status, expires_at, created_at 3) Roles y permisos (5NF) roles id (PK), org_id (FK), name, is_system, created_at UNIQUE (org_id, name) permissions id (PK), code (UNIQUE), description Ejemplos: users.read, users.write, orgs.admin, plans.read, sales.read, etc. role_permissions role_id (FK), permission_id (FK) PK compuesto (role_id, permission_id) user_roles org_member_id (FK), role_id (FK) PK compuesto (org_member_id, role_id) 4) Planes y suscripciones (5NF) plans id (PK), name, price_monthly, price_yearly, status, created_at plan_features id (PK), code (UNIQUE), description plan_feature_limits plan_id (FK), feature_id (FK), limit_value (INT, nullable si es ilimitado) PK compuesto (plan_id, feature_id) subscriptions id (PK), org_id (FK), plan_id (FK), status, start_date, end_date, grace_days, renewal_period UNIQUE (org_id) si solo hay una suscripcion activa por empresa subscription_events id (PK), subscription_id (FK), event_type, event_data (JSON), created_at 5) Configuracion por empresa (futuro‑proof) org_settings org_id (PK, FK), key, value (texto o JSON) PK compuesto (org_id, key) Esto permite agregar variables sin migraciones frecuentes. Notas de normalizacion (hasta 5NF) Datos repetibles aislados en tablas puente (user_roles, role_permissions, plan_feature_limits). Sin campos multivalor en entidades base. Dependencias completas por PKs compuestas en tablas puente. Listas de features y permisos separadas para evitar duplicidad y facilitar crecimiento. Multi‑tenant consistente: todas las tablas operativas futuras deben incluir org_id o referenciar una entidad que lo tenga. Expansiones futuras (compatibles) Inventario, compras, ventas, caja chica: cada tabla con org_id y branch_id (sucursales). Auditoria avanzada: tabla audit_logs con org_id, user_id, entity, action, before, after, created_at. Reportes: vistas o tablas de agregacion, no rompen el modelo base.

practicas

1. Arquitectura recomendada (MUY importante)

NO hagas:

src/
  users/
  auth/
  orgs/

Eso escala mal.

Haz arquitectura por dominio:

src/
  modules/
    auth/
    iam/
      users/
      roles/
      permissions/
      memberships/
    organizations/
    billing/
      plans/
      subscriptions/
    common/
    database/
    audit/
2. Separar IAM desde el inicio

IAM = Identity & Access Management.

Tu error mortal sería mezclar:

usuarios
auth
roles
orgs

Todo junto.

Debe quedar así
Dominio	Responsabilidad
auth	login, jwt, refresh
users	perfiles
organizations	empresas
memberships	relación user-org
roles	RBAC
permissions	permisos
billing	planes y subscripciones
3. Multi-tenant correcto desde el inicio

Esto es CRÍTICO.

NO hagas:
req.user.orgId

hardcodeado.

Haz Tenant Context

Crea un decorator:

@Tenant()
tenant: TenantContext

Ejemplo:

{
  orgId: string;
  memberId: string;
  roles: string[];
}
Y un TenantGuard

Que:

valida pertenencia
carga membresía
valida estado
inyecta tenant context
4. Nunca confiar en orgId enviado por frontend

JAMÁS:

{
  "orgId": 1
}

desde cliente.

Siempre derivado de:

subdominio
JWT
membership
5. Usa subdominios desde YA

Aunque al inicio no funcione completo.

Ejemplo:

empresaA.tusaas.com

Middleware:

const subdomain = extractSubdomain(req.hostname)
6. Estructura REAL de módulos Nest

Ejemplo:

organizations/
  application/
  domain/
  infrastructure/
  presentation/
application/

Casos de uso:

create-org.usecase.ts
invite-member.usecase.ts
domain/

Entidades puras:

organization.entity.ts
membership.entity.ts
infrastructure/

DB, repositorios, prisma/typeorm.

presentation/

Controllers y DTOs.

7. NO metas lógica en controllers

Controller:

@Post()
create(@Body() dto: CreateOrgDto) {
  return this.createOrg.execute(dto)
}

Nada más.

8. Casos de uso SIEMPRE

NO:

users.service.ts

con 4000 líneas.

Haz:

create-user.usecase.ts
update-user.usecase.ts
disable-user.usecase.ts
9. Usa Prisma (recomendado)

Para este proyecto:

✅ Prisma
❌ TypeORM

Porque:

velocidad desarrollo
migraciones mejores
typing brutal
IA genera Prisma muchísimo mejor
10. Soft delete desde el inicio

Nunca elimines realmente.

Agrega:

deleted_at

o:

status
11. UUID SIEMPRE

NO integer IDs.

Usa:

uuid

Especialmente multi-tenant.

12. Permisos por código, no por booleanos

Correcto:

sales.read
sales.write
inventory.transfer

Incorrecto:

canEditSales
13. JWT pequeño

NO metas:

permisos
empresa completa
configuraciones

en JWT.

Solo:

sub
sessionId
email

Y luego resuelves contexto.

14. Session table (MUY recomendado)

Haz:

sessions

con:

ip
user_agent
revoked
expires_at

Porque luego podrás:

✅ logout real
✅ auditoría
✅ detectar sospechosos

15. Guards desacoplados

Haz varios guards pequeños:

JwtAuthGuard
TenantGuard
PermissionGuard
SubscriptionGuard

NO un monstruo.

16. Decorators personalizados

Esto hace tu código MUCHO más limpio.

CurrentUser
@CurrentUser()
user: JwtUser
Permissions
@Permissions('users.read')
Tenant
@Tenant()
tenant: TenantContext
17. DTOs separados

NO reutilices DTOs.

Correcto
create-user.dto.ts
update-user.dto.ts
invite-user.dto.ts
18. Validación SIEMPRE

Global:

ValidationPipe

con:

whitelist: true
forbidNonWhitelisted: true
transform: true
19. Nunca exponer entidades DB

NO retornes Prisma entities directo.

Usa:

response mappers
20. Auditoría desde YA

Aunque sea mínima.

Crea:

audit_logs

desde mes 1.

Porque después agregarlo es horrible.

21. Estructura de permisos inteligente

Haz catálogo global:

permissions

pero roles por organización:

roles

como ya planteaste.

Eso está MUY bien.

22. Features por plan

NO hardcodees:

if(plan === 'enterprise')

Haz:

plan_features

como propusiste.

Excelente decisión.

23. Rate limiting

Desde YA.

Nest:

@nestjs/throttler

Especialmente auth.

24. Logs estructurados

Usa:

pino
nestjs-pino

NO console.log.

25. Errores estándar

Haz formato global:

{
  "message": "",
  "code": "",
  "details": []
}
26. Usa transacciones SIEMPRE

Especialmente:

crear org
invitar usuario
asignar rol
crear subscription
27. NO sobreingenierices microservicios

Tu sistema debe empezar:

✅ monolito modular

NO:

❌ microservicios

Eso mataría tu velocidad.

28. Stack que usaría YO
Backend
NestJS
Prisma
PostgreSQL
Redis
Docker
Auth
JWT access
refresh tokens rotativos
bcrypt/argon2
Infra
VPS Hostinger inicialmente
Docker Compose
Nginx reverse proxy
29. Lo MÁS importante de todo

Tu sistema debe soportar esto desde YA:

org -> branches -> users -> inventory -> sales