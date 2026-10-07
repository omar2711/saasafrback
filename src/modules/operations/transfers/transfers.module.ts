import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateStockTransferUseCase } from './application/usecases/create-stock-transfer.usecase';
import { GetStockTransferUseCase } from './application/usecases/get-stock-transfer.usecase';
import { ListStockTransfersUseCase } from './application/usecases/list-stock-transfers.usecase';
import { ReceiveStockTransferUseCase } from './application/usecases/receive-stock-transfer.usecase';
import { VoidStockTransferUseCase } from './application/usecases/void-stock-transfer.usecase';
import { TransfersController } from './presentation/transfers.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [TransfersController],
  providers: [
    CreateStockTransferUseCase,
    ListStockTransfersUseCase,
    GetStockTransferUseCase,
    ReceiveStockTransferUseCase,
    VoidStockTransferUseCase,
  ],
})
export class TransfersModule {}
