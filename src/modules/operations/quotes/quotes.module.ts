import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { ConvertQuoteToSaleUseCase } from './application/usecases/convert-quote-to-sale.usecase';
import { CreateQuoteUseCase } from './application/usecases/create-quote.usecase';
import { GetQuoteUseCase } from './application/usecases/get-quote.usecase';
import { ListQuotesUseCase } from './application/usecases/list-quotes.usecase';
import { UpdateQuoteUseCase } from './application/usecases/update-quote.usecase';
import { QuotesController } from './presentation/quotes.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [QuotesController],
  providers: [CreateQuoteUseCase, ListQuotesUseCase, GetQuoteUseCase, UpdateQuoteUseCase, ConvertQuoteToSaleUseCase],
})
export class QuotesModule {}
