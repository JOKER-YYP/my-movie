type Entry<T> = { value: T; expireAt: number }

/** 进程内 TTL 缓存，降低对第三方 CMS 的重复请求 */
export class TtlCache<T> {
  private store = new Map<string, Entry<T>>()

  constructor(
    private readonly defaultTtlMs: number,
    private readonly maxSize = 200,
  ) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (Date.now() > hit.expireAt) {
      this.store.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.store.size >= this.maxSize) {
      const first = this.store.keys().next().value
      if (first != null) this.store.delete(first)
    }
    this.store.set(key, { value, expireAt: Date.now() + ttlMs })
  }
}
