import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DbClient, DbService } from '../../database/db.service';
import { JwtUser } from '../../common/auth/jwt-user';
import {
  AdminFilterDto,
  AdminOrganizationDto,
  AdminPaymentDto,
  AdminPlanDto,
  AdminUserDto,
  LegalDocumentDto,
  MODULES,
  PaymentStatusDto,
} from './admin.dto';

type Row = Record<string, any>;
const subscriptionState = `CASE WHEN s.id IS NULL THEN 'sin_plan' WHEN s.status='canceled' OR s.end_date < CURRENT_DATE THEN 'concluido' WHEN s.status='past_due' OR s.start_date>CURRENT_DATE THEN 'en_marcha' ELSE 'vigente' END`;
export function validateDates(from?: string, to?: string) {
  if (from && to && from.slice(0, 10) > to.slice(0, 10))
    throw new BadRequestException(
      'La fecha inicial debe ser anterior o igual a la final.',
    );
}

@Injectable()
export class AdminService {
  constructor(private readonly db: DbService) {}
  private run<T>(user: JwtUser, task: (c: DbClient) => Promise<T>) {
    if (!user.isSuperAdmin)
      throw new ForbiddenException(
        'Solo el super admin puede realizar esta acción.',
      );
    return this.db
      .withRls({ userId: user.sub, isSuperAdmin: true }, task)
      .catch((e: any) => {
        if (e.code === '23505')
          throw new ConflictException(
            'Ya existe un registro con ese correo, código, NIT o referencia.',
          );
        if (e.code === '23503')
          throw new BadRequestException(
            'La empresa, plan o usuario indicado no existe.',
          );
        throw e;
      });
  }
  private async log(
    c: DbClient,
    user: JwtUser,
    action: string,
    entity: string,
    id: string,
    before: unknown,
    after: unknown,
    orgId?: string,
  ) {
    await c.execute(
      `INSERT INTO audit_logs(org_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        orgId ?? null,
        user.sub,
        action,
        entity,
        id,
        JSON.stringify({ before, after }),
      ],
    );
  }
  private async one(
    c: DbClient,
    table: 'orgs' | 'plans' | 'users' | 'platform_payments',
    id: string,
  ) {
    const [row] = await c.query<Row>(
      `SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,
      [id],
    );
    if (!row) throw new NotFoundException('Registro no encontrado.');
    return row;
  }
  async organizations(user: JwtUser, f: AdminFilterDto) {
    validateDates(f.dateFrom, f.dateTo);
    return this.run(user, (c) =>
      c.query<Row>(
        `SELECT o.*,s.plan_id,s.start_date,s.end_date,s.renewal_period,s.status AS subscription_status,p.name AS plan_name,
   ${subscriptionState} AS subscription_state,
   (SELECT count(*)::int FROM org_members m JOIN users u ON u.id=m.user_id WHERE m.org_id=o.id AND m.deleted_at IS NULL AND u.deleted_at IS NULL) AS user_count
   FROM orgs o LEFT JOIN subscriptions s ON s.org_id=o.id AND s.deleted_at IS NULL LEFT JOIN plans p ON p.id=s.plan_id
   WHERE o.deleted_at IS NULL AND ($1::text IS NULL OR concat_ws(' ',o.name,o.tax_id,o.email) ILIKE '%'||$1||'%')
   AND ($2::date IS NULL OR o.created_at >= $2::date AT TIME ZONE 'America/La_Paz')
   AND ($3::date IS NULL OR o.created_at < ($3::date+1) AT TIME ZONE 'America/La_Paz')
   AND ($4::uuid IS NULL OR s.plan_id=$4) AND ($5::text IS NULL OR (${subscriptionState})=$5)
   ORDER BY o.created_at DESC LIMIT $6`,
        [
          f.search ?? null,
          f.dateFrom ?? null,
          f.dateTo ?? null,
          f.planId ?? null,
          f.subscriptionState ?? null,
          f.limit,
        ],
      ),
    );
  }
  private async checkCapacity(c: DbClient, orgId: string, planId: string) {
    await c.execute(
      'SELECT pg_advisory_xact_lock(hashtextextended($1::text,34))',
      [orgId],
    );
    const limits = await c.query<Row>(
      `SELECT pf.code,l.limit_value FROM plan_feature_limits l JOIN plan_features pf ON pf.id=l.feature_id WHERE l.plan_id=$1`,
      [planId],
    );
    for (const [feature, table] of [
      ['max_roles', 'roles'],
      ['max_products', 'products'],
      ['max_users', 'org_members'],
      ['max_branches', 'branches'],
    ]) {
      const limit = limits.find((l) => l.code === feature)?.limit_value;
      if (limit === null || limit === undefined) continue;
      const [r] = await c.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM ${table} WHERE org_id=$1 AND deleted_at IS NULL`,
        [orgId],
      );
      if (r.count > limit)
        throw new ConflictException(
          `La organización ya utiliza ${r.count} recursos de ${feature}; el plan permite ${limit}. Reduce el uso antes de cambiar el plan.`,
        );
    }
  }
  async saveOrganization(user: JwtUser, d: AdminOrganizationDto, id?: string) {
    validateDates(d.startDate, d.endDate);
    if (!id && (!d.planId || !d.ownerEmail || !d.ownerPassword))
      throw new BadRequestException(
        'Selecciona un plan y completa el correo y contraseña inicial del responsable.',
      );
    return this.run(user, async (c) => {
      await c.execute(
        `SELECT pg_advisory_xact_lock(hashtextextended('admin-organizations',34))`,
      );
      const before = id ? await this.one(c, 'orgs', id) : null;
      const duplicates = await c.query(
        `SELECT id FROM orgs WHERE lower(btrim(tax_id))=lower(btrim($1)) AND deleted_at IS NULL AND ($2::uuid IS NULL OR id<>$2)`,
        [d.taxId, id ?? null],
      );
      if (duplicates.length)
        throw new ConflictException('El NIT ya pertenece a otra organización.');
      const args = [
        d.name,
        d.taxId,
        d.responsibleName,
        d.legalRepresentative,
        d.phone,
        d.logo ?? '',
        d.website ?? '',
        d.address,
        d.email.toLowerCase(),
        d.status,
      ];
      const [org] = id
        ? await c.query<Row>(
            `UPDATE orgs SET name=$1,tax_id=$2,responsible_name=$3,legal_representative=$4,phone=$5,logo=$6,website=$7,address=$8,email=$9,status=$10,updated_at=now() WHERE id=$11 RETURNING *`,
            [...args, id],
          )
        : await c.query<Row>(
            `INSERT INTO orgs(name,tax_id,responsible_name,legal_representative,phone,logo,website,address,email,status,timezone) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'America/La_Paz') RETURNING *`,
            args,
          );
      if (d.planId) {
        const plan = await this.one(c, 'plans', d.planId);
        if (plan.status !== 'active' || plan.deleted_at)
          throw new BadRequestException('Selecciona un plan activo.');
        await this.checkCapacity(c, org.id, d.planId);
        const [oldSubscription] = await c.query<Row>(
          'SELECT * FROM subscriptions WHERE org_id=$1',
          [org.id],
        );
        const [subscription] = await c.query<Row>(
          `INSERT INTO subscriptions(org_id,plan_id,start_date,end_date,renewal_period,status) VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),$4::date,$5,$6)
      ON CONFLICT(org_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,renewal_period=EXCLUDED.renewal_period,status=EXCLUDED.status,deleted_at=NULL,updated_at=now() RETURNING *`,
          [
            org.id,
            d.planId,
            d.startDate ?? null,
            d.endDate ?? null,
            d.renewalPeriod,
            d.subscriptionStatus,
          ],
        );
        await this.log(
          c,
          user,
          'admin.subscription.save',
          'subscription',
          subscription.id,
          oldSubscription ?? null,
          subscription,
          org.id,
        );
      }
      if (!id) {
        const email = d.ownerEmail!.trim().toLowerCase();
        const exists = await c.query(
          'SELECT id FROM users WHERE lower(email)=$1',
          [email],
        );
        if (exists.length)
          throw new ConflictException(
            'El correo del responsable ya tiene una cuenta. Usa un correo nuevo para el alta inicial.',
          );
        const [owner] = await c.query<Row>(
          `INSERT INTO users(email,password_hash,full_name) VALUES($1,$2,$3) RETURNING id`,
          [email, await bcrypt.hash(d.ownerPassword!, 12), d.responsibleName],
        );
        const [member] = await c.query<Row>(
          `INSERT INTO org_members(org_id,user_id) VALUES($1,$2) RETURNING id`,
          [org.id, owner.id],
        );
        const [role] = await c.query<Row>(
          `INSERT INTO roles(org_id,name,is_system) VALUES($1,'Gerente',true) RETURNING id`,
          [org.id],
        );
        await c.execute(
          `INSERT INTO role_permissions(role_id,permission_id) SELECT $1,id FROM permissions`,
          [role.id],
        );
        await c.execute(
          'INSERT INTO user_roles(org_member_id,role_id) VALUES($1,$2)',
          [member.id, role.id],
        );
        await c.execute(
          `INSERT INTO branches(org_id,name,is_main) VALUES($1,'Principal',true)`,
          [org.id],
        );
      }
      const redact = (r: Row | null) =>
        r ? { ...r, logo: r.logo ? '[imagen]' : null } : null;
      await this.log(
        c,
        user,
        id ? 'admin.organization.update' : 'admin.organization.create',
        'organization',
        org.id,
        redact(before),
        redact(org),
        org.id,
      );
      return org;
    });
  }
  plans(user: JwtUser) {
    return this.run(user, (c) =>
      c.query<Row>(
        `SELECT p.*,COALESCE((SELECT jsonb_object_agg(f.code,l.limit_value) FROM plan_feature_limits l JOIN plan_features f ON f.id=l.feature_id WHERE l.plan_id=p.id),'{}'::jsonb) AS features FROM plans p WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC`,
      ),
    );
  }
  savePlan(user: JwtUser, d: AdminPlanDto, id?: string) {
    return this.run(user, async (c) => {
      const before = id ? await this.one(c, 'plans', id) : null;
      const args = [
        d.code,
        d.name,
        d.priceMonthly,
        d.priceYearly,
        d.currency,
        d.status,
      ];
      const [plan] = id
        ? await c.query<Row>(
            `UPDATE plans SET code=$1,name=$2,price_monthly=$3,price_yearly=$4,currency=$5,status=$6,updated_at=now() WHERE id=$7 RETURNING *`,
            [...args, id],
          )
        : await c.query<Row>(
            `INSERT INTO plans(code,name,price_monthly,price_yearly,currency,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
            args,
          );
      const oldFeatures = await c.query<Row>(
        'SELECT * FROM plan_feature_limits WHERE plan_id=$1',
        [plan.id],
      );
      for (const code of MODULES)
        await c.execute(
          `INSERT INTO plan_feature_limits(plan_id,feature_id,limit_value) SELECT $1,id,$3 FROM plan_features WHERE code=$2 ON CONFLICT(plan_id,feature_id) DO UPDATE SET limit_value=EXCLUDED.limit_value`,
          [plan.id, code, d.modules.includes(code) ? 1 : 0],
        );
      for (const [code, value] of Object.entries({
        max_roles: d.maxRoles,
        max_products: d.maxProducts,
        max_users: d.maxUsers,
        max_branches: d.maxBranches,
      }))
        await c.execute(
          `INSERT INTO plan_feature_limits(plan_id,feature_id,limit_value) SELECT $1,id,$3 FROM plan_features WHERE code=$2 ON CONFLICT(plan_id,feature_id) DO UPDATE SET limit_value=EXCLUDED.limit_value`,
          [plan.id, code, value ?? null],
        );
      const orgs = await c.query<{ org_id: string }>(
        'SELECT org_id FROM subscriptions WHERE plan_id=$1 AND deleted_at IS NULL ORDER BY org_id',
        [plan.id],
      );
      for (const org of orgs) await this.checkCapacity(c, org.org_id, plan.id);
      await this.log(
        c,
        user,
        'admin.plan.save',
        'plan',
        plan.id,
        { plan: before, features: oldFeatures },
        d,
      );
      return plan;
    });
  }
  users(user: JwtUser) {
    return this.run(user, (c) =>
      c.query<Row>(
        `SELECT id,email,full_name,platform_role,status,created_at FROM users WHERE platform_role IS NOT NULL AND deleted_at IS NULL ORDER BY created_at DESC`,
      ),
    );
  }
  saveUser(user: JwtUser, d: AdminUserDto, id?: string) {
    if (!id && !d.password)
      throw new BadRequestException('La contraseña inicial es obligatoria.');
    return this.run(user, async (c) => {
      await c.execute(
        `SELECT pg_advisory_xact_lock(hashtextextended('afr-users',34))`,
      );
      const before = id ? await this.one(c, 'users', id) : null;
      if (before && !before.platform_role)
        throw new BadRequestException(
          'Esta cuenta no pertenece al personal de AFR.',
        );
      if (
        id === user.sub &&
        (d.status !== 'active' || d.platformRole !== 'super_admin')
      )
        throw new BadRequestException(
          'No puedes deshabilitar ni quitar tu propio acceso de super admin.',
        );
      if (
        before?.platform_role === 'super_admin' &&
        (d.status !== 'active' || d.platformRole !== 'super_admin')
      ) {
        const [count] = await c.query<{ n: number }>(
          `SELECT count(*)::int n FROM users WHERE platform_role='super_admin' AND status='active' AND deleted_at IS NULL AND id<>$1`,
          [id],
        );
        if (!count.n)
          throw new BadRequestException(
            'Debe permanecer al menos un super admin activo.',
          );
      }
      const email = d.email.toLowerCase();
      if (
        (
          await c.query(
            `SELECT id FROM users WHERE lower(email)=$1 AND ($2::uuid IS NULL OR id<>$2)`,
            [email, id ?? null],
          )
        ).length
      )
        throw new ConflictException('El correo ya está registrado.');
      const hash = d.password ? await bcrypt.hash(d.password, 12) : null;
      const args = [email, d.fullName, d.platformRole, d.status, hash];
      const [saved] = id
        ? await c.query<Row>(
            `UPDATE users SET email=$1,full_name=$2,platform_role=$3,status=$4,password_hash=COALESCE($5,password_hash),updated_at=now() WHERE id=$6 RETURNING id,email,full_name,platform_role,status`,
            [...args, id],
          )
        : await c.query<Row>(
            `INSERT INTO users(email,full_name,platform_role,status,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id,email,full_name,platform_role,status`,
            args,
          );
      if (id)
        await c.execute(
          'UPDATE sessions SET revoked=true,revoked_at=now() WHERE user_id=$1',
          [id],
        );
      const { password_hash: _, ...safeBefore } = before ?? {};
      await this.log(
        c,
        user,
        'admin.user.save',
        'user',
        saved.id,
        safeBefore,
        saved,
      );
      return saved;
    });
  }
  async finance(user: JwtUser, f: AdminFilterDto) {
    if (!user.isSuperAdmin && user.platformRole !== 'accountant')
      throw new ForbiddenException('Acceso exclusivo de AFR.');
    validateDates(f.dateFrom, f.dateTo);
    // Único acceso global del contable: consulta fija de lectura, sin ejecutar mutaciones.
    return this.db.withRls(
      { userId: user.sub, isSuperAdmin: user.isSuperAdmin ?? false },
      async (c) => {
        const params = [
          f.dateFrom ?? null,
          f.dateTo ?? null,
          f.orgId ?? null,
          f.planId ?? null,
          f.status ?? null,
          f.search ?? null,
          f.subscriptionState ?? null,
        ];
        const source = `FROM platform_payments x JOIN orgs o ON o.id=x.org_id LEFT JOIN subscriptions s ON s.org_id=o.id AND s.deleted_at IS NULL
    WHERE ($1::date IS NULL OR x.paid_on >= $1::date) AND ($2::date IS NULL OR x.paid_on <= $2::date)
    AND ($3::uuid IS NULL OR x.org_id=$3) AND ($4::uuid IS NULL OR x.plan_id=$4) AND ($5::text IS NULL OR x.status=$5)
    AND ($6::text IS NULL OR concat_ws(' ',o.name,o.tax_id,x.reference,x.plan_name) ILIKE '%'||$6||'%')
    AND ($7::text IS NULL OR (${subscriptionState})=$7)`;
        const rows = await c.query<Row>(
          `SELECT x.*,o.name AS company_name,o.tax_id,${subscriptionState} AS subscription_state ${source} ORDER BY x.paid_on DESC,x.created_at DESC LIMIT $8`,
          [...params, f.limit],
        );
        const totals = await c.query<Row>(
          `SELECT x.currency,COALESCE(sum(x.amount) FILTER(WHERE x.status='paid'),0) AS collected,COALESCE(sum(x.amount) FILTER(WHERE x.status='pending'),0) AS pending,count(*)::int AS records ${source} GROUP BY x.currency`,
          params,
        );
        const organizations = await c.query<Row>(
          `SELECT DISTINCT o.id,o.name FROM orgs o JOIN platform_payments x ON x.org_id=o.id ORDER BY o.name`,
        );
        const plans = await c.query<Row>(
          `SELECT DISTINCT plan_id AS id,plan_name AS name FROM platform_payments ORDER BY plan_name`,
        );
        return { rows, totals, organizations, plans };
      },
    );
  }
  createPayment(user: JwtUser, d: AdminPaymentDto) {
    return this.run(user, async (c) => {
      const org = await this.one(c, 'orgs', d.orgId);
      const plan = await this.one(c, 'plans', d.planId);
      if (org.deleted_at || plan.deleted_at)
        throw new BadRequestException(
          'La empresa o plan no están disponibles.',
        );
      if (plan.currency !== d.currency)
        throw new BadRequestException(
          'La moneda debe coincidir con la del plan.',
        );
      const [payment] = await c.query<Row>(
        `INSERT INTO platform_payments(org_id,plan_id,plan_name,amount,currency,paid_on,status,reference,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          d.orgId,
          d.planId,
          plan.name,
          d.amount,
          d.currency,
          d.paidOn,
          d.status,
          d.reference,
          d.notes ?? '',
          user.sub,
        ],
      );
      await this.log(
        c,
        user,
        'admin.payment.create',
        'platform_payment',
        payment.id,
        null,
        payment,
        d.orgId,
      );
      return payment;
    });
  }
  updatePayment(user: JwtUser, id: string, d: PaymentStatusDto) {
    return this.run(user, async (c) => {
      const before = await this.one(c, 'platform_payments', id);
      if (before.status === 'voided' || before.status === d.status)
        throw new ConflictException('El cobro no admite ese cambio de estado.');
      const [after] = await c.query<Row>(
        `UPDATE platform_payments SET status=$1,updated_at=now() WHERE id=$2 RETURNING *`,
        [d.status, id],
      );
      await this.log(
        c,
        user,
        'admin.payment.status',
        'platform_payment',
        id,
        before,
        { ...after, reason: d.reason },
        before.org_id,
      );
      return after;
    });
  }
  dashboard(user: JwtUser, f: AdminFilterDto) {
    validateDates(f.dateFrom, f.dateTo);
    return this.run(user, async (c) => {
      const args = [f.dateFrom ?? null, f.dateTo ?? null];
      const [stats] = await c.query<Row>(
        `SELECT
    (SELECT count(*)::int FROM orgs WHERE deleted_at IS NULL AND ($1::date IS NULL OR created_at >= $1::date AT TIME ZONE 'America/La_Paz') AND ($2::date IS NULL OR created_at < ($2::date+1) AT TIME ZONE 'America/La_Paz')) AS organizations,
    (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND platform_role IS NULL AND ($1::date IS NULL OR created_at >= $1::date AT TIME ZONE 'America/La_Paz') AND ($2::date IS NULL OR created_at < ($2::date+1) AT TIME ZONE 'America/La_Paz')) AS users`,
        args,
      );
      const revenue = await c.query<Row>(
        `SELECT currency,sum(amount) AS collected FROM platform_payments WHERE status='paid' AND ($1::date IS NULL OR paid_on >= $1::date) AND ($2::date IS NULL OR paid_on <= $2::date) GROUP BY currency`,
        args,
      );
      const growth = await c.query<Row>(
        `SELECT to_char(created_at AT TIME ZONE 'America/La_Paz','YYYY-MM') AS month,count(*)::int AS organizations FROM orgs WHERE deleted_at IS NULL AND ($1::date IS NULL OR created_at >= $1::date AT TIME ZONE 'America/La_Paz') AND ($2::date IS NULL OR created_at < ($2::date+1) AT TIME ZONE 'America/La_Paz') GROUP BY 1 ORDER BY 1`,
        args,
      );
      const distribution = await c.query<Row>(
        `SELECT p.name,count(*)::int AS organizations FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.deleted_at IS NULL AND ($1::date IS NULL OR s.start_date >= $1::date) AND ($2::date IS NULL OR s.start_date <= $2::date) GROUP BY p.id,p.name ORDER BY 2 DESC`,
        args,
      );
      return { stats, revenue, growth, distribution };
    });
  }
  audit(user: JwtUser, f: AdminFilterDto) {
    validateDates(f.dateFrom, f.dateTo);
    return this.run(user, (c) =>
      c.query<Row>(
        `SELECT a.*,u.full_name,u.email,o.name AS company_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN orgs o ON o.id=a.org_id
   WHERE ($1::date IS NULL OR a.created_at >= $1::date AT TIME ZONE 'America/La_Paz') AND ($2::date IS NULL OR a.created_at < ($2::date+1) AT TIME ZONE 'America/La_Paz')
   AND ($3::uuid IS NULL OR a.org_id=$3) AND ($4::uuid IS NULL OR a.user_id=$4) AND ($5::text IS NULL OR a.action=$5)
   AND ($6::text IS NULL OR concat_ws(' ',a.action,u.email,u.full_name,o.name) ILIKE '%'||$6||'%') ORDER BY a.created_at DESC LIMIT $7`,
        [
          f.dateFrom ?? null,
          f.dateTo ?? null,
          f.orgId ?? null,
          f.userId ?? null,
          f.action ?? null,
          f.search ?? null,
          f.limit,
        ],
      ),
    );
  }
  legalDocuments(user: JwtUser) {
    return this.run(user, (c) =>
      c.query<Row>(
        'SELECT * FROM platform_legal_documents ORDER BY created_at DESC',
      ),
    );
  }
  saveLegal(user: JwtUser, d: LegalDocumentDto) {
    return this.run(user, async (c) => {
      const [document] = await c.query<Row>(
        `INSERT INTO platform_legal_documents(kind,version,content,published_at) VALUES($1,$2,$3,CASE WHEN $4 THEN now() ELSE NULL END) RETURNING *`,
        [d.kind, d.version, d.content, d.publish],
      );
      await this.log(
        c,
        user,
        'admin.legal.create',
        'legal_document',
        document.id,
        null,
        document,
      );
      return document;
    });
  }
  async publicLegal(kind: string) {
    if (!['terms', 'privacy'].includes(kind)) throw new NotFoundException();
    return this.db.withRls({}, async (c) => {
      const [document] = await c.query<Row>(
        'SELECT id,kind,version,content,published_at FROM platform_legal_documents WHERE kind=$1 AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT 1',
        [kind],
      );
      return document ?? null;
    });
  }
  async acceptLegal(user: JwtUser, id: string) {
    return this.db.withRls({ userId: user.sub }, async (c) => {
      const [d] = await c.query(
        'SELECT id FROM platform_legal_documents WHERE id=$1 AND published_at IS NOT NULL',
        [id],
      );
      if (!d) throw new NotFoundException();
      await c.execute(
        'INSERT INTO platform_legal_acceptances(user_id,document_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [user.sub, id],
      );
      return { accepted: true };
    });
  }
}
