import { ConfigService } from '@nestjs/config';

export interface SuperAdminClaims {
  sub?: string;
  email?: string;
}

function parseCsv(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * El super admin se identifica por variable de entorno, no por una columna, asi
 * que hay que resolverlo desde el payload del token en cada punto de entrada.
 *
 * Vive aqui y no dentro de JwtAuthGuard porque el gateway de soporte lo necesita
 * igual: el handshake del WebSocket no pasa por los guards HTTP, y sin esto el
 * super admin nunca se reconocia como agente (app.is_support_agent() daba false)
 * y no recibia los mensajes en vivo.
 */
export function resolveIsSuperAdmin(
  payload: SuperAdminClaims,
  configService: ConfigService,
): boolean {
  const superAdminIds = parseCsv(configService.get<string>('SUPER_ADMIN_USER_IDS'));
  const superAdminEmails = parseCsv(configService.get<string>('SUPER_ADMIN_EMAILS')).map((e) =>
    e.toLowerCase(),
  );

  if (payload.sub && superAdminIds.includes(payload.sub)) return true;
  if (payload.email && superAdminEmails.includes(payload.email.toLowerCase())) return true;

  return false;
}
