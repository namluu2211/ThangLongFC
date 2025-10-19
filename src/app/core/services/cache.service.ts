import { Injectable } from '@angular/core';

interface CacheEntry<T> { value: T; expiresAt: number; key: string; }

/**
 * Simple in-memory TTL cache for pure calculated analytics.
 * Not persisted; resets on reload.
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if(!entry) return undefined;
    if(Date.now() > entry.expiresAt){
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { key, value, expiresAt: Date.now() + ttlMs });
  }

  wrap<T>(key: string, ttlMs: number, factory: () => T): T {
    const cached = this.get<T>(key);
    if(cached !== undefined) return cached;
    const value = factory();
    this.set(key, value, ttlMs);
    return value;
  }

  clear(prefix?: string){
    if(!prefix){ this.store.clear(); return; }
    for(const k of Array.from(this.store.keys())){
      if(k.startsWith(prefix)) this.store.delete(k);
    }
  }
}