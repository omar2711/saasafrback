import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { InviteMemberUseCase } from './application/usecases/invite-member.usecase';
import { ListMembershipsUseCase } from './application/usecases/list-memberships.usecase';
import { UpdateMembershipUseCase } from './application/usecases/update-membership.usecase';
import { MembershipsController } from './presentation/memberships.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [MembershipsController],
  providers: [InviteMemberUseCase, ListMembershipsUseCase, UpdateMembershipUseCase],
})
export class MembershipsModule {}
