import { ReportsController } from './reports.controller';
import { DbService } from '../../../database/db.service';
describe('complete report aggregates', () => {
  it('uses the full authorized filtered set, without a list pagination limit', async () => {
    const query = jest.fn(async () => [{ total_records: '650', revenue: '32500' }]);
    const withRls = jest.fn(async (_context, callback) => callback({ query }));
    const controller = new ReportsController({ withRls } as unknown as DbService);
    const result = await controller.sales({ sub: 'employee' }, { orgId: 'org-a', memberId: 'member', roles: [] },
      { branchId: 'branch-a', dateFrom: '2026-01-01', limit: 50, offset: 100 });
    expect(result).toEqual({ totalRecords: 650, revenue: 32500 });
    expect(withRls.mock.calls[0][0]).toMatchObject({ orgId: 'org-a', userId: 'employee' });
    expect(query.mock.calls[0][0]).not.toMatch(/LIMIT|OFFSET/);
    expect(query.mock.calls[0][1]).toEqual(['org-a', 'branch-a', '2026-01-01']);
  });
});
