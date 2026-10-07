import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateProductUseCase } from './application/usecases/create-product.usecase';
import { DeleteProductUseCase } from './application/usecases/delete-product.usecase';
import { ListBranchPricesUseCase } from './application/usecases/list-branch-prices.usecase';
import { ListDeletedProductsUseCase } from './application/usecases/list-deleted-products.usecase';
import { ListProductBranchPricesUseCase } from './application/usecases/list-product-branch-prices.usecase';
import { ListProductsUseCase } from './application/usecases/list-products.usecase';
import { RestoreProductUseCase } from './application/usecases/restore-product.usecase';
import { UpdateProductUseCase } from './application/usecases/update-product.usecase';
import { UpsertBranchPriceUseCase } from './application/usecases/upsert-branch-price.usecase';
import { PricingController } from './presentation/pricing.controller';
import { ProductsController } from './presentation/products.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [ProductsController, PricingController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    ListDeletedProductsUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    RestoreProductUseCase,
    ListBranchPricesUseCase,
    ListProductBranchPricesUseCase,
    UpsertBranchPriceUseCase,
  ],
})
export class ProductsModule {}
