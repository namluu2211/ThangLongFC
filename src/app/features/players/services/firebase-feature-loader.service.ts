import { Injectable, inject } from '@angular/core';
import { FirebaseCoreService } from '../../../services/firebase-core.service';

/**
 * FirebaseFeatureLoaderService
 * Provides an explicit lazy boundary for Firebase usage within player feature.
 * Ensures Firebase core is only initialized when player mode switches to 'firebase'.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseFeatureLoaderService {
  private core = inject(FirebaseCoreService);
  private loading = false;
  private initialized = false;

  async ensureLoaded(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.loading) {
      // Wait until current load completes
      while (this.loading) { await new Promise(r => setTimeout(r, 50)); }
      return this.initialized;
    }
    this.loading = true;
    try {
      const ok = await this.core.ensureInitialized();
      this.initialized = ok;
      return ok;
    } finally {
      this.loading = false;
    }
  }
}
