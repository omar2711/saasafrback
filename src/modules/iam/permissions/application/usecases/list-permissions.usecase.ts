import { Injectable } from '@nestjs/common';
import { DbService } from '../../../../../database/db.service';
import { PermissionEntity } from '../../domain/entities/permission.entity';

interface PermissionRow {
  id: string;
  code: string;
  description: string | null;
}

@Injectable()
export class ListPermissionsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(): Promise<PermissionEntity[]> {
    const permissions = await this.db.query<PermissionRow>(
      'SELECT id, code, description FROM permissions ORDER BY code ASC',
    );
    return permissions.map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description ?? null,
    }));
  }
}
