import { ForbiddenException, Injectable } from '@nestjs/common';
import { newId } from '../../../../../common/utils/ids';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { MembershipInviteEntity } from '../../domain/entities/membership.entity';
import { InviteMemberDto } from '../../presentation/dto/invite-member.dto';

interface InviteRow {
  id: string;
  org_id: string;
  email: string;
  token: string;
  status: string;
  created_at: Date;
  expires_at: Date;
}

@Injectable()
export class InviteMemberUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: InviteMemberDto): Promise<MembershipInviteEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const [invite] = await this.db.withRls(context, (client) =>
      client.query<InviteRow>(
        `INSERT INTO org_member_invites (org_id, email, token, status, expires_at)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING id, org_id, email, token, status, created_at, expires_at`,
        [orgId, dto.email, newId(), expiresAt],
      ),
    );

    return {
      id: invite.id,
      orgId: invite.org_id,
      email: invite.email,
      roleIds: dto.roleIds ?? [],
      status: invite.status as MembershipInviteEntity['status'],
      createdAt: invite.created_at.toISOString(),
      expiresAt: invite.expires_at.toISOString(),
    };
  }
}
