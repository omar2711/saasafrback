// Prueba de integración con rollback global. No deja registros de prueba.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { AdminService } = require('../dist/modules/admin/admin.service');
const { AdminFilterDto, MODULES } = require('../dist/modules/admin/admin.dto');
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let sequence = 0;
  const wrapped = {
    query: async (sql, args) => (await client.query(sql, args)).rows,
    execute: async (sql, args) => {
      await client.query(sql, args);
    },
  };
  const db = {
    withRls: async (context, fn) => {
      const sp = `admin_test_${++sequence}`;
      await client.query(`SAVEPOINT ${sp}`);
      try {
        await client.query('SELECT app.set_context($1,NULL,NULL,$2)', [
          context.userId ?? null,
          context.isSuperAdmin ?? false,
        ]);
        const value = await fn(wrapped);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
        return value;
      } catch (e) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        throw e;
      }
    },
  };
  try {
    await client.query('BEGIN');
    await client.query('SELECT app.set_context(NULL,NULL,NULL,true)');
    const [{ id }] = await wrapped.query(
      "SELECT id FROM users WHERE platform_role='super_admin' AND status='active' AND deleted_at IS NULL LIMIT 1",
    );
    const user = { sub: id, isSuperAdmin: true, platformRole: 'super_admin' };
    const service = new AdminService(db);
    const key = randomUUID();
    const dto = {
      code: `test_${key}`,
      name: 'Prueba transaccional AFR',
      priceMonthly: 100,
      priceYearly: 1000,
      currency: 'BOB',
      status: 'active',
      modules: MODULES,
      maxRoles: 1,
      maxProducts: 1,
      maxUsers: 1,
      maxBranches: 1,
    };
    const plan = await service.savePlan(user, dto);
    const organization = await service.saveOrganization(user, {
      name: 'Prueba transaccional',
      taxId: `TEST-${key}`,
      responsibleName: 'Responsable de prueba',
      legalRepresentative: 'Representante de prueba',
      phone: '+59170000000',
      email: `company-${key}@example.invalid`,
      address: 'Dirección de prueba',
      status: 'active',
      planId: plan.id,
      startDate: '2026-01-01',
      renewalPeriod: 'monthly',
      subscriptionStatus: 'active',
      ownerEmail: `owner-${key}@example.invalid`,
      ownerPassword: randomUUID(),
    });
    const filter = Object.assign(new AdminFilterDto(), {
      orgId: organization.id,
    });
    const organizations = await service.organizations(
      user,
      Object.assign(new AdminFilterDto(), { search: organization.tax_id }),
    );
    assert.equal(organizations.length, 1);
    assert.equal(organizations[0].user_count, 1);
    assert.equal(organizations[0].responsible_name, 'Responsable de prueba');
    const payment = await service.createPayment(user, {
      orgId: organization.id,
      planId: plan.id,
      amount: 100,
      currency: 'BOB',
      paidOn: '2026-10-07',
      status: 'paid',
      reference: key,
    });
    await service.savePlan(user, { ...dto, priceMonthly: 200 }, plan.id);
    let finance = await service.finance(user, filter);
    assert.equal(Number(finance.totals[0].collected), 100);
    assert.equal(Number(finance.rows[0].amount), 100);
    const accountant = await service.saveUser(user, {
      fullName: 'Contable de prueba',
      email: `accountant-${key}@example.invalid`,
      password: randomUUID(),
      platformRole: 'accountant',
      status: 'active',
    });
    const accountantContext = {
      sub: accountant.id,
      isSuperAdmin: false,
      platformRole: 'accountant',
    };
    finance = await service.finance(accountantContext, filter);
    assert.equal(finance.rows.length, 1);
    assert.throws(() => service.createPayment(accountantContext, {}));
    await service.updatePayment(user, payment.id, {
      status: 'voided',
      reason: 'Reversión de prueba',
    });
    finance = await service.finance(user, filter);
    assert.equal(Number(finance.totals[0].collected), 0);
    await assert.rejects(() =>
      service.updatePayment(user, payment.id, {
        status: 'paid',
        reason: 'No permitido',
      }),
    );
    await assert.rejects(
      () =>
        db.withRls(user, async (c) =>
          c.execute(
            "INSERT INTO roles(org_id,name) VALUES($1,'Rol excedido')",
            [organization.id],
          ),
        ),
      /Limit/,
    );
    const run = (task) => db.withRls({ userId: id, isSuperAdmin: true }, task);
    await run((c) =>
      c.execute(
        "INSERT INTO products(org_id,name,sku) VALUES($1,'Producto prueba','TEST-1')",
        [organization.id],
      ),
    );
    await assert.rejects(
      () =>
        run((c) =>
          c.execute(
            "INSERT INTO products(org_id,name,sku) VALUES($1,'Producto excedido','TEST-2')",
            [organization.id],
          ),
        ),
      /Limit/,
    );
    const audit = await service.audit(user, filter);
    assert(audit.some((a) => a.action === 'admin.payment.status'));
    assert(audit.some((a) => a.action === 'admin.organization.create'));
    const legal = await service.saveLegal(user, {
      kind: 'terms',
      version: key,
      content: 'Texto de integración temporal que no será publicado.',
      publish: false,
    });
    assert(legal.id);
    // Ejecutar los guards y la validación reales mediante HTTP, sin persistir sesiones.
    const { Test } = require('@nestjs/testing');
    const { ValidationPipe } = require('@nestjs/common');
    const { JwtService } = require('@nestjs/jwt');
    const request = require('supertest');
    const { AppModule } = require('../dist/app.module');
    const { DbService } = require('../dist/database/db.service');
    const {
      ApiExceptionFilter,
    } = require('../dist/common/errors/api-exception.filter');
    const testing = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DbService)
      .useValue({
        ...db,
        withContextQuery: (userId, orgId, isSuperAdmin, fn) =>
          db.withRls({ userId, orgId, isSuperAdmin }, fn),
      })
      .compile();
    const app = testing.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    try {
      async function tokenFor(userId) {
        const sid = randomUUID();
        await run((c) =>
          c.execute(
            "INSERT INTO sessions(id,user_id,refresh_token_hash,expires_at) VALUES($1,$2,'integration-test',now()+interval '10 minutes')",
            [sid, userId],
          ),
        );
        return new JwtService().sign(
          { sub: userId, sessionId: sid },
          {
            secret:
              process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
            expiresIn: '5m',
          },
        );
      }
      const superToken = await tokenFor(id),
        accountantToken = await tokenFor(accountant.id);
      const http = request(app.getHttpServer());
      await http.get('/admin/dashboard').expect(401);
      const me = await http
        .get('/auth/me')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);
      assert.equal(me.body.platformRole, 'accountant');
      assert.equal(me.body.isSuperAdmin, false);
      await http
        .get('/admin/finance')
        .query({ orgId: organization.id })
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);
      await http
        .get('/admin/users')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(403);
      await http
        .post('/admin/finance')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({})
        .expect(403);
      await http
        .post('/organizations')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ name: 'No autorizado' })
        .expect(403);
      await http
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
      await http
        .get('/admin/dashboard')
        .query({ dateFrom: '2026-10-08', dateTo: '2026-10-07' })
        .set('Authorization', `Bearer ${superToken}`)
        .expect(400);
      await http
        .post('/admin/plans')
        .set('Authorization', `Bearer ${superToken}`)
        .send({ ...dto, priceMonthly: -1 })
        .expect(400);
      console.log(
        'OK HTTP: autenticación, sesión contable, lectura financiera, bloqueo de escrituras/rutas y validación de fechas/precios.',
      );
    } finally {
      await app.close();
    }
    console.log(
      'OK: organización y responsable, planes, precios históricos, permisos contables, anulación, cupos de roles/productos, auditoría y documentos.',
    );
  } finally {
    await client.query('ROLLBACK');
    await client.end();
    console.log('Rollback completado: sin registros de prueba persistentes.');
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
