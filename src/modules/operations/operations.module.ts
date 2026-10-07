import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { InventoryModule } from './inventory/inventory.module';
import { KitsModule } from './kits/kits.module';
import { PettyCashModule } from './petty-cash/petty-cash.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { QuotesModule } from './quotes/quotes.module';
import { SalesModule } from './sales/sales.module';
import { SaleReturnsModule } from './sale-returns/sale-returns.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    SuppliersModule,
    CustomersModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    KitsModule,
    TransfersModule,
    PurchasesModule,
    QuotesModule,
    SalesModule,
    SaleReturnsModule,
    PettyCashModule,
  ],
})
export class OperationsModule {}
