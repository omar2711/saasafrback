import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService } from '../../database/db.service';

export interface WorkScheduleCheck {
  allowed: boolean;
  /** Mensaje configurado por la organizacion, si lo hay. */
  message: string | null;
  /** Horario vigente, para poder decir "de 08:00 a 18:00" en el aviso. */
  startTime: string | null;
  endTime: string | null;
}

interface CheckRow {
  allowed: boolean;
  message: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface MembershipRow {
  org_id: string;
}

/**
 * Comprobacion de horario laboral.
 *
 * Todo el calculo ocurre en Postgres (app.is_within_work_schedule, migracion
 * 031) con now() AT TIME ZONE o.timezone. Node no necesita ninguna libreria de
 * zonas horarias y la hora es la misma para cualquier proceso que consulte.
 */
@Injectable()
export class WorkScheduleService {
  constructor(private readonly db: DbService) {}

  async check(orgId: string, userId: string): Promise<WorkScheduleCheck> {
    const rows = await this.db.withContextQuery<CheckRow[]>(userId, orgId, false, (client) =>
      client.query<CheckRow>(
        `SELECT app.is_within_work_schedule($1::uuid, $2::uuid) AS allowed,
                s.message, s.start_time::text, s.end_time::text
         FROM (SELECT 1) AS dummy
         LEFT JOIN org_work_schedules s ON s.org_id = $1::uuid`,
        [orgId, userId],
      ),
    );

    const row = rows[0];
    return {
      allowed: row?.allowed ?? true,
      message: row?.message ?? null,
      startTime: row?.start_time ?? null,
      endTime: row?.end_time ?? null,
    };
  }

  /**
   * Bloqueo en el login: se comprueba contra TODAS las organizaciones del
   * usuario. Solo se le impide entrar si ninguna lo admite ahora mismo; si
   * pertenece a dos empresas y una esta abierta, puede trabajar en esa.
   */
  async assertCanLogin(userId: string): Promise<void> {
    const memberships = await this.db.withContextQuery<MembershipRow[]>(
      userId,
      null,
      false,
      (client) =>
        client.query<MembershipRow>(
          `SELECT org_id FROM org_members
           WHERE user_id = $1::uuid AND deleted_at IS NULL AND status = 'active'`,
          [userId],
        ),
    );

    // Sin membresias no hay horario que aplicar: el usuario ira a la pantalla
    // de seleccion de organizacion y no podra operar en ninguna.
    if (memberships.length === 0) {
      return;
    }

    const checks = await Promise.all(
      memberships.map((membership) => this.check(membership.org_id, userId)),
    );

    if (checks.some((check) => check.allowed)) {
      return;
    }

    throw new ForbiddenException(buildPayload(checks[0]));
  }

  /** Bloqueo de una sesion ya abierta, desde TenantGuard. */
  async assertCanOperate(orgId: string, userId: string): Promise<void> {
    const check = await this.check(orgId, userId);
    if (check.allowed) {
      return;
    }
    throw new ForbiddenException(buildPayload(check));
  }
}

/**
 * El `code` viaja hasta el cliente gracias al ApiExceptionFilter de la Fase 2,
 * que ahora respeta el code del payload en vez de forzar HTTP_403. Sin eso el
 * frontend no podria distinguir "fuera de horario" de "sin permiso".
 */
function buildPayload(check: WorkScheduleCheck) {
  const range =
    check.startTime && check.endTime
      ? ` El horario de atencion es de ${check.startTime.slice(0, 5)} a ${check.endTime.slice(0, 5)}.`
      : '';

  return {
    message:
      check.message?.trim() ||
      `Estas fuera del horario laboral de tu organizacion.${range}`,
    code: 'OUTSIDE_WORK_SCHEDULE',
    details: [check.startTime, check.endTime].filter(Boolean),
  };
}
