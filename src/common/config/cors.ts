import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getCorsOrigins(): string[] {
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://saasafrfront.vercel.app',
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ]
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function getCorsOptions(): CorsOptions {
  return {
    origin: getCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-cache-bypass'],
    exposedHeaders: ['X-App-Cache'],
    credentials: true,
    optionsSuccessStatus: 204,
  };
}
