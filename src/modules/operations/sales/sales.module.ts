import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { AddPaymentUseCase } from './application/usecases/add-payment.usecase';
import { CreateInvoiceUseCase } from './application/usecases/create-invoice.usecase';
import { CreateSaleUseCase } from './application/usecases/create-sale.usecase';
import { DeliverSaleUseCase } from './application/usecases/deliver-sale.usecase';
import { GetSaleUseCase } from './application/usecases/get-sale.usecase';
import { ListSalesUseCase } from './application/usecases/list-sales.usecase';
import { UpdateSaleUseCase } from './application/usecases/update-sale.usecase';
import { VoidSaleUseCase } from './application/usecases/void-sale.usecase';
import { SalesController } from './presentation/sales.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [SalesController],
  providers: [
    CreateSaleUseCase,
    ListSalesUseCase,
    GetSaleUseCase,
    UpdateSaleUseCase,
    VoidSaleUseCase,
    DeliverSaleUseCase,
    AddPaymentUseCase,
    CreateInvoiceUseCase,
  ],
})
export class SalesModule {}
