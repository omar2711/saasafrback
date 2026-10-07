import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateKitUseCase } from './application/usecases/create-kit.usecase';
import { DeleteKitUseCase } from './application/usecases/delete-kit.usecase';
import { GetKitUseCase } from './application/usecases/get-kit.usecase';
import { ListKitsUseCase } from './application/usecases/list-kits.usecase';
import { UpdateKitUseCase } from './application/usecases/update-kit.usecase';
import { KitsController } from './presentation/kits.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [KitsController],
  providers: [
    CreateKitUseCase,
    ListKitsUseCase,
    GetKitUseCase,
    UpdateKitUseCase,
    DeleteKitUseCase,
  ],
})
export class KitsModule {}
