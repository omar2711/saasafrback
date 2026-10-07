import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { WorkScheduleEntity } from '../../domain/entities/work-schedule.entity';

export interface WorkScheduleRow {
  org_id: string;
  enabled: boolean;
  days: number[];
  start_time: string;
  end_time: string;
  exempt_role_ids: string[];
  message: string | null;
  updated_at: Date;
}

@Injectable()
export class GetWorkScheduleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<WorkScheduleEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const [row] = await this.db.withRls(context, (client) =>
      client.query<WorkScheduleRow>(
        `SELECT org_id, enabled, days, start_time::text, end_time::text,
                exempt_role_ids, message, updated_at
         FROM org_work_schedules WHERE org_id = $1`,
        [orgId],
      ),
    );

    // La migracion 031 crea una fila por organizacion, pero una organizacion
    // creada despues no la tendria. Se devuelve el mismo estado inicial:
    // desactivado, para no bloquear a nadie por omision.
    if (!row) {
      return {
        orgId,
        enabled: false,
        days: [1, 2, 3, 4, 5],
        startTime: '08:00',
        endTime: '18:00',
        exemptRoleIds: [],
        message: null,
        updatedAt: new Date().toISOString(),
      };
    }

    return mapWorkSchedule(row);
  }
}

export function mapWorkSchedule(row: WorkScheduleRow): WorkScheduleEntity {
  return {
    orgId: row.org_id,
    enabled: row.enabled,
    days: row.days,
    // Postgres devuelve "08:00:00"; la UI trabaja con <input type="time">.
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    exemptRoleIds: row.exempt_role_ids ?? [],
    message: row.message ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}
