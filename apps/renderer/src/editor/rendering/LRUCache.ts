/**
 * LRUCache.ts — Bounded LRU Cache
 *
 * Purpose: Provide a fixed-capacity least-recently-used cache for
 * thumbnail data URLs and other render caches. Prevents unbounded
 * memory growth in large documents.
 *
 * When the cache exceeds maxSize, the least recently accessed
 * entries are evicted automatically.
 */

export class LRUCache<K, V> {
  private _map = new Map<K, V>();
  private _maxSize: number;

  constructor(maxSize: number) {
    if (maxSize < 1) throw new Error("LRUCache maxSize must be >= 1");
    this._maxSize = maxSize;
  }

  /** Get a value, marking it as recently used. Returns undefined if missing. */
  get(key: K): V | undefined {
    const value = this._map.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this._map.delete(key);
      this._map.set(key, value);
    }
    return value;
  }

  /** Set a value, evicting least recently used entries if over capacity. */
  set(key: K, value: V): void {
    this._map.delete(key);
    this._map.set(key, value);
    this._evictIfNeeded();
  }

  /** Check if a key exists (without updating recency). */
  has(key: K): boolean {
    return this._map.has(key);
  }

  /** Delete a specific key. */
  delete(key: K): void {
    this._map.delete(key);
  }

  /** Clear all entries. */
  clear(): void {
    this._map.clear();
  }

  /** Current number of entries. */
  get size(): number {
    return this._map.size;
  }

  /** Maximum capacity. */
  get maxSize(): number {
    return this._maxSize;
  }

  /** Iterate over entries (most recently used last). */
  entries(): IterableIterator<[K, V]> {
    return this._map.entries();
  }

  private _evictIfNeeded(): void {
    while (this._map.size > this._maxSize) {
      // Delete the oldest entry (first inserted)
      const key = this._map.keys().next().value;
      if (key !== undefined) {
        this._map.delete(key);
      } else {
        break;
      }
    }
  }
}
