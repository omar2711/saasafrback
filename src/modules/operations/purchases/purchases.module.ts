import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreatePurchaseOrderUseCase } from './application/usecases/create-purchase-order.usecase';
import { GetPurchaseOrderUseCase } from './application/usecases/get-purchase-order.usecase';
import { ListOpenPoLinesForProductUseCase } from './application/usecases/list-open-po-lines-for-product.usecase';
import { ListPurchaseOrdersUseCase } from './application/usecases/list-purchase-orders.usecase';
import { ReceivePurchaseOrderUseCase } from './application/usecases/receive-purchase-order.usecase';
import { UpdatePurchaseOrderUseCase } from './application/usecases/update-purchase-order.usecase';
import { PurchaseOrdersController } from './presentation/purchase-orders.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [PurchaseOrdersController],
  providers: [
    CreatePurchaseOrderUseCase,
    ListPurchaseOrdersUseCase,
    GetPurchaseOrderUseCase,
    UpdatePurchaseOrderUseCase,
    ReceivePurchaseOrderUseCase,
    ListOpenPoLinesForProductUseCase,
  ],
})
export class PurchasesModule {}
