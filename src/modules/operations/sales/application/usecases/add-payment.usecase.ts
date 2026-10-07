import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { AddPaymentDto } from '../../presentation/dto/add-payment.dto';

interface PaymentRow {
  id: string;
  org_id: string;
  sale_id: string;
  amount: string;
  method: string;
  status: string;
  paid_at: Date;
  created_at: Date;
}

@Injectable()
export class AddPaymentUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    saleId: string,
    dto: AddPaymentDto,
  ): Promise<PaymentEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const [payment] = await this.db.withRls(context, (client) =>
      client.query<PaymentRow>(
        `INSERT INTO payments (org_id, sale_id, amount, method, status, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, org_id, sale_id, amount, method, status, paid_at, created_at`,
        [
          orgId,
          saleId,
          dto.amount,
          dto.method,
          dto.status ?? 'completed',
          dto.paidAt ? new Date(dto.paidAt) : new Date(),
        ],
      ),
    );

    return {
      id: payment.id,
      orgId: payment.org_id,
      saleId: payment.sale_id,
      amount: toNumber(payment.amount),
      method: payment.method as PaymentEntity['method'],
      status: payment.status as PaymentEntity['status'],
      paidAt: payment.paid_at.toISOString(),
      createdAt: payment.created_at.toISOString(),
    };
  }
}
