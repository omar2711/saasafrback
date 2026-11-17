/**
 * Caché en memoria con vencimiento corto. Los errores no se guardan y las
 * peticiones simultáneas con la misma clave comparten una sola consulta.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expires: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000,
  ) {}

  async get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        if (this.store.size >= this.maxEntries) {
          const oldest = this.store.keys().next().value;
          if (oldest !== undefined) this.store.delete(oldest);
        }
        this.store.set(key, { value, expires: Date.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.store.clear();
  }
}