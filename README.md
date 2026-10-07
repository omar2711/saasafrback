## Endpoints y flujo

Flujo comun (cuando aplica):
- Request entra al controller y pasa por guards (`JwtAuthGuard`, `TenantGuard`, `SuperAdminGuard`).
- `JwtAuthGuard` valida el bearer token y agrega `request.user`.
- `TenantGuard` valida `x-tenant-id`, confirma membresia y agrega `request.tenant` y permisos.
- `buildRlsContext(user, tenant)` arma el contexto RLS que usan los casos de uso.
- El controller delega al caso de uso correspondiente y retorna su resultado.

### Base
- `GET /` - `AppService.getHello()`.

### Auth
- `POST /auth/login` - sin guard; toma `ip` y `user-agent`; `LoginUseCase.execute(dto, { ip, userAgent })`.
- `POST /auth/refresh` - sin guard; `RefreshTokenUseCase.execute(dto)`.
- `POST /auth/logout` - `JwtAuthGuard`; `LogoutUseCase.execute(user, dto)`.
- `GET /auth/me` - `JwtAuthGuard`; `GetMeUseCase.execute(user)`.

### Organizations
Requiere `JwtAuthGuard`; usa `buildRlsContext(user)`.
- `POST /organizations` - `CreateOrganizationUseCase.execute(rls, dto)`.
- `GET /organizations` - `ListOrganizationsUseCase.execute(rls)`.
- `GET /organizations/:id` - `GetOrganizationUseCase.execute(rls, id)`.
- `PATCH /organizations/:id` - `UpdateOrganizationUseCase.execute(rls, id, dto)`.

### Organizations / Branches
Requiere `JwtAuthGuard`, `TenantGuard` y header `x-tenant-id`; usa `buildRlsContext(user, tenant)`.
- `POST /organizations/branches` - `CreateBranchUseCase.execute(rls, dto)`.
- `GET /organizations/branches` - `ListBranchesUseCase.execute(rls)`.
- `PATCH /organizations/branches/:id` - `UpdateBranchUseCase.execute(rls, id, dto)`.

### Billing / Plans
Requiere `JwtAuthGuard`; usa `buildRlsContext(user)`.
- `POST /billing/plans` - `SuperAdminGuard`; `CreatePlanUseCase.execute(rls, dto)`.
- `GET /billing/plans` - `ListPlansUseCase.execute(rls)`.
- `PATCH /billing/plans/:id` - `SuperAdminGuard`; `UpdatePlanUseCase.execute(rls, id, dto)`.

### Billing / Subscriptions
Requiere `JwtAuthGuard`, `TenantGuard` y header `x-tenant-id`; usa `buildRlsContext(user, tenant)`.
- `POST /billing/subscriptions` - `CreateSubscriptionUseCase.execute(rls, dto)`.
- `GET /billing/subscriptions/current` - `GetCurrentSubscriptionUseCase.execute(rls)`.
- `PATCH /billing/subscriptions/current` - `UpdateSubscriptionUseCase.execute(rls, dto)`.

### IAM / Users
Requiere `JwtAuthGuard`, `TenantGuard` y header `x-tenant-id`; usa `buildRlsContext(user, tenant)`.
- `POST /iam/users` - `CreateUserUseCase.execute(rls, dto)`.
- `GET /iam/users` - `ListUsersUseCase.execute(rls)`.
- `GET /iam/users/:id` - `GetUserUseCase.execute(rls, id)`.
- `PATCH /iam/users/:id` - `UpdateUserUseCase.execute(rls, id, dto)`.
- `PATCH /iam/users/:id/status` - `SetUserStatusUseCase.execute(rls, id, dto)`.

### IAM / Roles
Requiere `JwtAuthGuard`, `TenantGuard` y header `x-tenant-id`; usa `buildRlsContext(user, tenant)`.
- `POST /iam/roles` - `CreateRoleUseCase.execute(rls, dto)`.
- `GET /iam/roles` - `ListRolesUseCase.execute(rls)`.
- `PATCH /iam/roles/:id` - `UpdateRoleUseCase.execute(rls, id, dto)`.
- `POST /iam/roles/:id/permissions` - `AssignRolePermissionUseCase.execute(rls, id, dto)`.
- `DELETE /iam/roles/:id/permissions/:permissionId` - `RemoveRolePermissionUseCase.execute(rls, id, permissionId)`.

### IAM / Permissions
Requiere `JwtAuthGuard`.
- `GET /iam/permissions` - `ListPermissionsUseCase.execute()`.

### IAM / Memberships
Requiere `JwtAuthGuard`.
- `POST /iam/memberships/invite` - `TenantGuard` + header `x-tenant-id`; `InviteMemberUseCase.execute(rls, dto)`.
- `GET /iam/memberships` - `TenantGuard` + header `x-tenant-id`; `ListMembershipsUseCase.listByOrg(rls)`.
- `GET /iam/memberships/me` - sin `TenantGuard`; si no hay `user`, retorna `[]`; `ListMembershipsUseCase.listByUser(rls)`.
- `PATCH /iam/memberships/:id` - `TenantGuard` + header `x-tenant-id`; `UpdateMembershipUseCase.execute(rls, id, dto)`.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
