import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CheckPlanFeatureUseCase } from './application/usecases/check-plan-feature.usecase';
import { CreatePettyCashTransactionUseCase } from './application/usecases/create-petty-cash-transaction.usecase';
import { DeletePettyCashTransactionUseCase } from './application/usecases/delete-petty-cash-transaction.usecase';
import { ListPettyCashTransactionsUseCase } from './application/usecases/list-petty-cash-transactions.usecase';
import { PettyCashController } from './presentation/petty-cash.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [PettyCashController],
  providers: [
    CheckPlanFeatureUseCase,
    CreatePettyCashTransactionUseCase,
    ListPettyCashTransactionsUseCase,
    DeletePettyCashTransactionUseCase,
  ],
})
export class PettyCashModule {}
