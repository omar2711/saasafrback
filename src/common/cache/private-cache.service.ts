import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrivateCacheService {
  private readonly memory = new Map<string, { value: string; until: number }>();
  private readonly generations = new Map<string, number>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly driver: 'memory' | 'off';

  constructor(config: ConfigService) {
    // Browser cache works without infrastructure. Server memory is opt-in for
    // local tests/a single-process VPS; never enabled across Vercel instances.
    this.driver = !process.env.VERCEL && config.get<string>('CACHE_DRIVER') === 'memory' ? 'memory' : 'off';
  }

  async generation(tenant: string): Promise<string | null> {
    if (this.driver === 'off') return null;
    return String(this.generations.get(tenant) ?? 0);
  }

  async invalidate(tenant: string): Promise<void> {
    if (this.driver === 'memory') {
      if (this.generations.size >= 1024 && !this.generations.has(tenant)) {
        this.generations.clear(); this.memory.clear();
      }
      this.generations.set(tenant, (this.generations.get(tenant) ?? 0) + 1);
    }
  }

  async get(key: string): Promise<unknown | undefined> {
    let raw: string | null | undefined;
    if (this.driver === 'memory') {
      const entry = this.memory.get(key);
      if (entry && entry.until > Date.now()) raw = entry.value;
      else this.memory.delete(key);
    }
    if (!raw) return undefined;
    try { return JSON.parse(raw); } catch { return undefined; }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (!raw || Buffer.byteLength(raw) > 1024 * 1024) return;
    if (this.driver === 'memory') {
      if (this.memory.size >= 512) this.memory.delete(this.memory.keys().next().value!);
      this.memory.set(key, { value: raw, until: Date.now() + ttl * 1000 });
    }
  }

  async deduplicate<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    const promise = load();
    this.pending.set(key, promise);
    try { return await promise; } finally { if (this.pending.get(key) === promise) this.pending.delete(key); }
  }

}
