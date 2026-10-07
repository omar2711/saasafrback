import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';

type RequestWithTenant = Request & { tenant?: TenantContext };

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: RequestWithTenant, _res: Response, next: NextFunction): void {
    const host = req.hostname ?? '';
    const orgFromHost = extractSubdomain(host);
    const orgIdHeader = getHeaderValue(req, 'x-tenant-id') ?? getHeaderValue(req, 'x-org-id');

    const orgId = orgIdHeader ?? orgFromHost ?? '';
    if (orgId) {
      req.tenant = {
        orgId,
        roles: [],
      };
    }

    next();
  }
}

const extractSubdomain = (hostname: string): string | null => {
  const host = hostname.split(':')[0].toLowerCase();
  const parts = host.split('.');
  if (parts.length < 3) {
    return null;
  }

  return parts[0] || null;
};

const getHeaderValue = (req: Request, name: string): string | null => {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return String(value);
};
