import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getCorsOptions, getCorsOrigins } from './cors';

describe('CORS de produccion', () => {
  let app: INestApplication;
  const originalOrigins = process.env.CORS_ORIGINS;

  beforeAll(async () => {
    delete process.env.CORS_ORIGINS;
    const module = await Test.createTestingModule({}).compile();
    app = module.createNestApplication();
    app.enableCors(getCorsOptions());
    await app.init();
  });

  afterEach(() => {
    delete process.env.CORS_ORIGINS;
  });

  afterAll(async () => {
    if (originalOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalOrigins;
    }
    await app.close();
  });

  it('responde al preflight del frontend sin redireccion', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://saasafrfront.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization,x-tenant-id,x-cache-bypass')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://saasafrfront.vercel.app')
      .expect('Access-Control-Allow-Credentials', 'true');

    expect(response.headers.location).toBeUndefined();
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers'].toLowerCase()).toBe(
      'content-type,authorization,x-tenant-id,x-cache-bypass',
    );
    expect(response.headers['access-control-expose-headers']).toBe('X-App-Cache');
  });

  it('no autoriza origenes ajenos', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('normaliza espacios y barras finales de CORS_ORIGINS', () => {
    process.env.CORS_ORIGINS = ' https://preview.example/ , ,http://localhost:4000/// ';
    expect(getCorsOrigins()).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'https://saasafrfront.vercel.app',
      'https://preview.example',
      'http://localhost:4000',
    ]);
  });
});
