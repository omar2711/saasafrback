import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateCustomerUseCase } from './application/usecases/create-customer.usecase';
import { DeleteCustomerUseCase } from './application/usecases/delete-customer.usecase';
import { GetCustomerUseCase } from './application/usecases/get-customer.usecase';
import { GetCustomerHistoryUseCase } from './application/usecases/get-customer-history.usecase';
import { ListCustomersUseCase } from './application/usecases/list-customers.usecase';
import { UpdateCustomerUseCase } from './application/usecases/update-customer.usecase';
import { CustomersController } from './presentation/customers.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [CustomersController],
  providers: [
    CreateCustomerUseCase,
    ListCustomersUseCase,
    GetCustomerUseCase,
    GetCustomerHistoryUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
  ],
})
export class CustomersModule {}
