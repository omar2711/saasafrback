import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateInventoryMovementUseCase } from './application/usecases/create-inventory-movement.usecase';
import { ListInventoryMovementsUseCase } from './application/usecases/list-inventory-movements.usecase';
import { ListInventoryStockUseCase } from './application/usecases/list-inventory-stock.usecase';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [InventoryController],
  providers: [
    CreateInventoryMovementUseCase,
    ListInventoryMovementsUseCase,
    ListInventoryStockUseCase,
  ],
})
export class InventoryModule {}
