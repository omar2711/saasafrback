import { Controller, Get, Post, UseGuards, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PrivateCacheService } from './private-cache.service';
import { PrivateCacheInterceptor } from './private-cache.interceptor';

let calls = 0;
let revoked = false;
@Injectable()
class WorkerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['x-worker'] || revoked) throw new ForbiddenException();
    req.user = { sub: req.headers['x-worker'] };
    req.tenant = { orgId: req.headers['x-tenant-id'], memberId: req.headers['x-worker'], roles: ['employee'] };
    req.permissions = ['products.read'];
    return true;
  }
}
@Controller('operations/products') @UseGuards(WorkerGuard)
class CatalogController {
  @Get() list() { return [{ sequence: ++calls }]; }
  @Post() mutate() { return { changed: true }; }
}

describe('private cache through HTTP and guards', () => {
  let app;
  beforeEach(async () => {
    calls = 0; revoked = false;
    const module = await Test.createTestingModule({
      controllers: [CatalogController], providers: [WorkerGuard, PrivateCacheService,
        { provide: ConfigService, useValue: { get: key => key === 'CACHE_DRIVER' ? 'memory' : undefined } },
        { provide: APP_INTERCEPTOR, useClass: PrivateCacheInterceptor }],
    }).compile();
    app = module.createNestApplication(); await app.init();
  });
  afterEach(async () => { await app.close(); });
  const read = (app, tenant = 'org-a', worker = 'employee-a', query = '') => request(app.getHttpServer())
    .get(`/operations/products${query}`).set('x-worker', worker).set('x-tenant-id', tenant);

  it('hits repeated reads but isolates tenants, workers and query filters', async () => {
    expect((await read(app)).headers['x-app-cache']).toBe('MISS');
    const hit = await read(app);
    expect(hit.headers['x-app-cache']).toBe('HIT');
    expect(hit.headers['cache-control']).toBe('private, no-store');
    expect((await read(app, 'org-b')).headers['x-app-cache']).toBe('MISS');
    expect((await read(app, 'org-a', 'employee-b')).headers['x-app-cache']).toBe('MISS');
    expect((await read(app, 'org-a', 'employee-a', '?branchId=b')).headers['x-app-cache']).toBe('MISS');
    expect(calls).toBe(4);
  });
  it('validates access again even when the response is cached', async () => {
    await read(app); revoked = true;
    expect((await read(app)).status).toBe(403);
    expect(calls).toBe(1);
  });
  it('invalidates all worker scopes on an authorized tenant mutation', async () => {
    await read(app); await read(app, 'org-a', 'employee-b'); await read(app, 'org-b');
    await request(app.getHttpServer()).post('/operations/products').set('x-worker', 'employee-a').set('x-tenant-id', 'org-a');
    expect((await read(app)).headers['x-app-cache']).toBe('MISS');
    expect((await read(app, 'org-a', 'employee-b')).headers['x-app-cache']).toBe('MISS');
    expect((await read(app, 'org-b')).headers['x-app-cache']).toBe('HIT');
  });
  it('allows fresh reads for exports without reusing cached values', async () => {
    await read(app);
    const fresh = await read(app).set('x-cache-bypass', '1');
    expect(fresh.headers['x-app-cache']).toBe('BYPASS');
    expect(fresh.body[0].sequence).toBe(2);
  });
});
