import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ListPermissionsUseCase } from '../application/usecases/list-permissions.usecase';

@ApiTags('IAM / Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('iam/permissions')
export class PermissionsController {
  constructor(private readonly listPermissionsUseCase: ListPermissionsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar permisos disponibles' })
  list() {
    return this.listPermissionsUseCase.execute();
  }
}
