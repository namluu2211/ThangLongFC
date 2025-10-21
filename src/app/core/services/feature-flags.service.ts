import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FeatureFlagKey = keyof typeof environment.features;

/**
 * FeatureFlagsService
 * Layered flag resolution:
 * 1. Build-time environment.features (base defaults)
 * 2. Runtime localStorage overrides (persisted across sessions)
 * Provides observable streams per flag and mutation APIs.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private flags = new Map<FeatureFlagKey, BehaviorSubject<boolean>>();

  constructor(){
    // Initialize subjects for each declared environment feature key.
    const base = environment.features || {} as typeof environment.features;
    (Object.keys(base) as FeatureFlagKey[]).forEach(k => {
      const override = this.readOverride(k);
      const initial = override !== null ? override : Boolean(base[k]);
      this.flags.set(k, new BehaviorSubject<boolean>(initial));
    });
  }

  /** Read a persisted override from localStorage. Returns null if none. */
  private readOverride(key: FeatureFlagKey): boolean | null {
    try {
      const raw = localStorage.getItem(`feature.${String(key)}`);
      if(raw === null) return null;
      return raw === 'true';
    } catch { return null; }
  }

  /** Observable stream for a feature flag */
  flag$(key: FeatureFlagKey){
    return this.flags.get(key)!.asObservable();
  }

  /** Synchronous value accessor */
  isEnabled(key: FeatureFlagKey): boolean {
    return this.flags.get(key)?.value === true;
  }

  /** Update a flag at runtime and persist override */
  setFlag(key: FeatureFlagKey, value: boolean){
    const subj = this.flags.get(key);
    if(!subj) return;
    subj.next(value);
    try { localStorage.setItem(`feature.${String(key)}`, String(value)); } catch { /* ignore */ }
  }

  /** Reset a flag to its build-time default by removing override */
  resetFlag(key: FeatureFlagKey){
    const subj = this.flags.get(key);
    if(!subj) return;
    try { localStorage.removeItem(`feature.${String(key)}`); } catch { /* ignore */ }
    const base = environment.features[key];
    subj.next(Boolean(base));
  }
}
