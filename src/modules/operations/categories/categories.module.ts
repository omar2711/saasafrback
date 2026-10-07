import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateProductCategoryUseCase } from './application/usecases/create-product-category.usecase';
import { DeleteProductCategoryUseCase } from './application/usecases/delete-product-category.usecase';
import { ListProductCategoriesUseCase } from './application/usecases/list-product-categories.usecase';
import { UpdateProductCategoryUseCase } from './application/usecases/update-product-category.usecase';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [CategoriesController],
  providers: [
    ListProductCategoriesUseCase,
    CreateProductCategoryUseCase,
    UpdateProductCategoryUseCase,
    DeleteProductCategoryUseCase,
  ],
})
export class CategoriesModule {}
