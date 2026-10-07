export interface WorkScheduleEntity {
  orgId: string;
  enabled: boolean;
  /** ISO-8601: 1 = lunes ... 7 = domingo. */
  days: number[];
  /** "HH:MM". */
  startTime: string;
  endTime: string;
  /** Roles que pueden operar fuera de horario. */
  exemptRoleIds: string[];
  /** Aviso emergente que ve quien queda bloqueado. */
  message: string | null;
  updatedAt: string;
}
