import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { from, lastValueFrom, Observable } from 'rxjs';
import { PrivateCacheService } from './private-cache.service';

@Injectable()
export class PrivateCacheInterceptor implements NestInterceptor {
  constructor(private readonly cache: PrivateCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Interceptors run AFTER JWT, tenant, permission, plan and schedule guards.
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const tenant = request.tenant?.orgId;
    if (!request.user || !tenant) return next.handle();
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    response.setHeader('X-App-Cache', 'BYPASS');
    const url = new URL(request.originalUrl ?? request.url, 'http://internal');
    const cacheable = /^\/operations\/(products|kits|categories|pricing|inventory|sales|quotes|customers|purchases|suppliers|petty-cash|sale-returns)(\/|$)/.test(url.pathname)
      || url.pathname.startsWith('/operations/reports/');
    if (request.method !== 'GET') {
      // Invalidate every dependent catalog/report, not just the mutated route.
      return from((async () => {
        const result = await lastValueFrom(next.handle());
        if (response.statusCode < 400) await this.cache.invalidate(tenant);
        return result;
      })());
    }
    if (!cacheable || request.headers?.['x-cache-bypass'] === '1') return next.handle();
    url.searchParams.sort();
    const ttl = url.pathname.includes('/stock') ? 3 : url.pathname.includes('/pricing') ? 10
      : /\/(products|kits|categories)(\/|$)/.test(url.pathname) ? 60 : 15;
    return from((async () => {
      const generation = await this.cache.generation(tenant);
      if (generation === null) return lastValueFrom(next.handle());
      // User/member is included because RLS visibility can differ within a tenant.
      const scope = JSON.stringify([request.user.sub, request.user.isSuperAdmin,
        request.tenant.memberId, [...(request.tenant.roles ?? [])].sort(),
        [...(request.permissions ?? [])].sort(), [...(request.planFeatures ?? [])].sort(), url.pathname + url.search]);
      const key = `afr:v1:r:${tenant}:${generation}:${createHash('sha256').update(scope).digest('hex')}`;
      const cached = await this.cache.get(key);
      if (cached !== undefined) { response.setHeader('X-App-Cache', 'HIT'); return cached; }
      response.setHeader('X-App-Cache', 'MISS');
      return this.cache.deduplicate(key, async () => {
        const result = await lastValueFrom(next.handle());
        // A concurrent write must not repopulate the current generation with old data.
        if (response.statusCode < 400 && await this.cache.generation(tenant) === generation) {
          await this.cache.set(key, result, ttl);
        }
        return result;
      });
    })());
  }
}
