import { AdminService, validateDates } from './admin.service';
import { AdminFilterDto } from './admin.dto';
import { DbService } from '../../database/db.service';

describe('Administración AFR', () => {
  const superAdmin = {
    sub: 'admin',
    isSuperAdmin: true,
    platformRole: 'super_admin' as const,
  };
  const accountant = {
    sub: 'contable',
    isSuperAdmin: false,
    platformRole: 'accountant' as const,
  };
  const query = jest.fn(async () => []);
  const withRls = jest.fn(async (_context, fn) => fn({ query }));
  const service = new AdminService({ withRls } as unknown as DbService);
  beforeEach(() => jest.clearAllMocks());
  it('rechaza fechas invertidas', () =>
    expect(() => validateDates('2026-10-08', '2026-10-07')).toThrow());
  it('acepta un día completo', () =>
    expect(() => validateDates('2026-10-07', '2026-10-07')).not.toThrow());
  it('el contable no puede consultar usuarios, empresas ni auditoría', async () => {
    for (const operation of [
      () => service.users(accountant),
      () => service.organizations(accountant, new AdminFilterDto()),
      () => service.audit(accountant, new AdminFilterDto()),
      () => service.plans(accountant),
    ])
      await expect(Promise.resolve().then(operation)).rejects.toThrow();
    expect(withRls).not.toHaveBeenCalled();
  });
  it('el contable no puede registrar cobros', () => {
    expect(() => service.createPayment(accountant, {} as never)).toThrow();
    expect(withRls).not.toHaveBeenCalled();
  });
  it('el usuario de empresa no puede leer el movimiento económico', async () => {
    await expect(
      service.finance({ sub: 'tenant' }, new AdminFilterDto()),
    ).rejects.toThrow();
    expect(withRls).not.toHaveBeenCalled();
  });
  it('la lectura contable ejecuta únicamente consultas SELECT y parametriza los filtros', async () => {
    await service.finance(accountant, {
      ...new AdminFilterDto(),
      search: "' OR 1=1 --",
    });
    expect(query).toHaveBeenCalledTimes(4);
    for (const call of query.mock.calls as unknown as [string, unknown[]][]) {
      expect(call[0]).toMatch(/^SELECT/);
      expect(call[0]).not.toContain("' OR 1=1 --");
    }
    expect(
      (query.mock.calls as unknown as [string, unknown[]][])[0][1],
    ).toContain("' OR 1=1 --");
  });
  it('permite al super admin consultar el personal de AFR', async () => {
    await service.users(superAdmin);
    expect(query).toHaveBeenCalled();
  });
});
