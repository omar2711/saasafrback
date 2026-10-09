import { ConfigService } from '@nestjs/config';
import { PrivateCacheService } from './private-cache.service';
describe('private cache lifetime and concurrent reads', () => {
  const service = () => new PrivateCacheService({ get: key => key === 'CACHE_DRIVER' ? 'memory' : undefined } as ConfigService);
  it('expires values instead of returning old stock forever', async () => {
    const cache = service();
    await cache.set('stock', [1], 1);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    expect(await cache.get('stock')).toBeUndefined();
    jest.restoreAllMocks();
  });
  it('coalesces simultaneous reads and retries failed reads', async () => {
    const cache = service(); const load = jest.fn(async () => [1]);
    await Promise.all([cache.deduplicate('key', load), cache.deduplicate('key', load)]);
    expect(load).toHaveBeenCalledTimes(1);
    await expect(cache.deduplicate('failed', async () => { throw new Error('offline'); })).rejects.toThrow();
    expect(await cache.deduplicate('failed', async () => [2])).toEqual([2]);
  });
  it('never shares a tenant generation and remains off without configuration', async () => {
    const cache = service(); await cache.invalidate('org-a');
    expect(await cache.generation('org-a')).toBe('1');
    expect(await cache.generation('org-b')).toBe('0');
    const off = new PrivateCacheService({ get: () => undefined } as unknown as ConfigService);
    expect(await off.generation('org-a')).toBeNull();
  });
});
