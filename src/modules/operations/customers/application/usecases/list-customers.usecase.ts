import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { CustomerEntity } from '../../domain/entities/customer.entity';

interface CustomerRow {
  id: string;
  org_id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  sales_count: string;
  sales_total: string;
  last_purchase_at: Date | null;
}

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<CustomerEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const customers = await this.db.withRls(context, (client) =>
      client.query<CustomerRow>(
        // LATERAL y no una subconsulta por columna: asi se recorren las ventas
         // del cliente una sola vez. La pestana Clientes de Reportes necesita
         // los tres agregados, y pedirlos con un GET por cliente seria el N+1
         // que ya se elimino en la lista de ventas pendientes.
         `SELECT c.id, c.org_id, c.name, c.tax_id, c.email, c.phone, c.address, c.city,
                 c.status, c.created_at, c.updated_at,
                 COALESCE(agg.sales_count, 0) AS sales_count,
                 COALESCE(agg.sales_total, 0) AS sales_total,
                 agg.last_purchase_at
          FROM customers c
          LEFT JOIN LATERAL (
            SELECT COUNT(*) AS sales_count,
                   SUM(s.total) AS sales_total,
                   MAX(s.sold_at) AS last_purchase_at
            FROM sales s
            WHERE s.customer_id = c.id
              AND s.deleted_at IS NULL
              AND s.status IN ('completed', 'pending_delivery')
          ) agg ON true
          WHERE c.org_id = $1 AND c.deleted_at IS NULL
          ORDER BY c.created_at DESC`,
        [orgId],
      ),
    );

    return customers.map((customer) => ({
      id: customer.id,
      orgId: customer.org_id,
      name: customer.name,
      taxId: customer.tax_id ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      address: customer.address ?? null,
      city: customer.city ?? null,
      status: customer.status as CustomerEntity['status'],
      createdAt: customer.created_at.toISOString(),
      updatedAt: customer.updated_at.toISOString(),
      salesCount: Number(customer.sales_count),
      salesTotal: Number(customer.sales_total),
      lastPurchaseAt: customer.last_purchase_at?.toISOString() ?? null,
    }));
  }
}
