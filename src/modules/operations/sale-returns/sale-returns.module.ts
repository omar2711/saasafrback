import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateSaleReturnUseCase } from './application/usecases/create-sale-return.usecase';
import { GetSaleReturnUseCase } from './application/usecases/get-sale-return.usecase';
import { ListSaleReturnsUseCase } from './application/usecases/list-sale-returns.usecase';
import { VoidSaleReturnUseCase } from './application/usecases/void-sale-return.usecase';
import { SaleReturnsController } from './presentation/sale-returns.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [SaleReturnsController],
  providers: [
    CreateSaleReturnUseCase,
    ListSaleReturnsUseCase,
    GetSaleReturnUseCase,
    VoidSaleReturnUseCase,
  ],
})
export class SaleReturnsModule {}
