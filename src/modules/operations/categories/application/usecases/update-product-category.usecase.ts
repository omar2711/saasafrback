import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { ProductCategoryEntity } from '../../domain/entities/product-category.entity';
import { UpdateProductCategoryDto } from '../../presentation/dto/update-product-category.dto';

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
export class UpdateProductCategoryUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    id: string,
    dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryEntity> {
    let rows: CategoryRow[];
    try {
      rows = await this.db.withRls(context, (client) =>
        client.query<CategoryRow>(
          `UPDATE product_categories
           SET name = COALESCE($1::text, name),
               description = COALESCE($2::text, description),
               status = COALESCE($3::text, status),
               updated_at = now()
           WHERE id = $4 AND deleted_at IS NULL
           RETURNING id, org_id, name, description, status, created_at, updated_at`,
          [dto.name ?? null, dto.description ?? null, dto.status ?? null, id],
        ),
      );
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe una categoria con ese nombre');
      }
      throw err;
    }

    if (!rows[0]) {
      throw new NotFoundException('Categoria no encontrada');
    }

    const category = rows[0];
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
  }
}
