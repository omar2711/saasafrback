import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { AuditService } from '../../../../common/audit/audit.service';
import { WorkScheduleEntity } from '../../domain/entities/work-schedule.entity';
import { UpdateWorkScheduleDto } from '../../presentation/dto/update-work-schedule.dto';
import { mapWorkSchedule, WorkScheduleRow } from './get-work-schedule.usecase';

@Injectable()
export class UpdateWorkScheduleUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, dto: UpdateWorkScheduleDto): Promise<WorkScheduleEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    // La BD tiene el mismo CHECK, pero devolver aqui un mensaje en castellano
    // es mejor que dejar salir un 23514 crudo.
    if (dto.startTime && dto.endTime && dto.startTime === dto.endTime) {
      throw new BadRequestException(
        'La hora de inicio y la de fin no pueden ser iguales. Para un turno de 24 horas, desactiva el horario.',
      );
    }

    const row = await this.db.withRls(context, async (client) => {
      const [saved] = await client.query<WorkScheduleRow>(
        `INSERT INTO org_work_schedules (org_id, enabled, days, start_time, end_time, exempt_role_ids, message)
         VALUES (
           $1,
           COALESCE($2::boolean, false),
           COALESCE($3::smallint[], ARRAY[1,2,3,4,5]::smallint[]),
           COALESCE($4::time, '08:00'),
           COALESCE($5::time, '18:00'),
           COALESCE($6::uuid[], ARRAY[]::uuid[]),
           $7
         )
         ON CONFLICT (org_id) DO UPDATE SET
           enabled = COALESCE($2::boolean, org_work_schedules.enabled),
           days = COALESCE($3::smallint[], org_work_schedules.days),
           start_time = COALESCE($4::time, org_work_schedules.start_time),
           end_time = COALESCE($5::time, org_work_schedules.end_time),
           exempt_role_ids = COALESCE($6::uuid[], org_work_schedules.exempt_role_ids),
           message = CASE WHEN $8::boolean THEN $7::text ELSE org_work_schedules.message END,
           updated_at = now()
         RETURNING org_id, enabled, days, start_time::text, end_time::text,
                   exempt_role_ids, message, updated_at`,
        [
          orgId,
          dto.enabled ?? null,
          dto.days ?? null,
          dto.startTime ?? null,
          dto.endTime ?? null,
          dto.exemptRoleIds ?? null,
          dto.message ?? null,
          dto.message !== undefined,
        ],
      );

      // Cambiar el horario decide quien puede entrar al sistema: se audita como
      // cualquier otro cambio de configuracion sensible.
      await this.audit.recordInTransaction(client, context, {
        action: 'role.change',
        entityType: 'work_schedule',
        entityId: orgId,
        metadata: {
          enabled: saved.enabled,
          days: saved.days,
          startTime: saved.start_time,
          endTime: saved.end_time,
          exemptRoles: saved.exempt_role_ids?.length ?? 0,
        },
      });

      return saved;
    });

    return mapWorkSchedule(row);
  }
}
