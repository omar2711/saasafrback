import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { ProductCategoryEntity } from '../../domain/entities/product-category.entity';
import { CreateProductCategoryDto } from '../../presentation/dto/create-product-category.dto';

interface CategoryRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CreateProductCategoryUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    try {
      const [category] = await this.db.withRls(context, (client) =>
        client.query<CategoryRow>(
          `INSERT INTO product_categories (org_id, name, description)
           VALUES ($1, $2, $3)
           RETURNING id, org_id, name, description, status, created_at, updated_at`,
          [orgId, dto.name, dto.description ?? null],
        ),
      );

      return {
        id: category.id,
        orgId: category.org_id,
        name: category.name,
        description: category.description ?? null,
        status: category.status as ProductCategoryEntity['status'],
        productCount: 0,
        productCountInBranch: null,
        stockInBranch: null,
        createdAt: category.created_at.toISOString(),
        updatedAt: category.updated_at.toISOString(),
      };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe una categoria con ese nombre');
      }
      throw err;
    }
  }
}
