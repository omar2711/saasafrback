import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateSupplierUseCase } from './application/usecases/create-supplier.usecase';
import { DeleteSupplierUseCase } from './application/usecases/delete-supplier.usecase';
import { ListSuppliersUseCase } from './application/usecases/list-suppliers.usecase';
import { UpdateSupplierUseCase } from './application/usecases/update-supplier.usecase';
import { SuppliersController } from './presentation/suppliers.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [SuppliersController],
  providers: [CreateSupplierUseCase, ListSuppliersUseCase, UpdateSupplierUseCase, DeleteSupplierUseCase],
})
export class SuppliersModule {}
