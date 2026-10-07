import { Module } from '@nestjs/common';
import { MembershipsModule } from './memberships/memberships.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, RolesModule, PermissionsModule, MembershipsModule],
})
export class IamModule {}
