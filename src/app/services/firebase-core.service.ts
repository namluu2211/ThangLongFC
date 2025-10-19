import { Injectable } from '@angular/core';
// Type-only imports to avoid pulling runtime. Keep minimal database scope.
import type { FirebaseApp } from 'firebase/app';
import type { Database } from 'firebase/database';
import { firebaseConfig, isFirebaseConfigValid } from '../config/firebase.config';

@Injectable({ providedIn: 'root' })
export class FirebaseCoreService {
  app: FirebaseApp | null = null;
  database: Database | null = null;
  enabled = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _fb: any = null; // holder for db functions
  private initPromise: Promise<void> | null = null;

  constructor() {
    if (!isFirebaseConfigValid) {
      this.enabled = false;
      console.log('⚠️ FirebaseCoreService disabled (invalid config)');
    }
    // Defer actual initialization until first ensureInitialized call.
  }

  private async initialize() {
    if (!isFirebaseConfigValid) return;
    try {
      // Load only firebase app bootstrap & database module. Avoid unused features (auth/storage/firestore).
      const [appMod, dbMod] = await Promise.all([
        import(/* webpackChunkName: 'firebase-app' */ 'firebase/app'),
        import(/* webpackChunkName: 'firebase-db' */ 'firebase/database')
      ]);
      const { initializeApp, getApps } = appMod;
      // Explicit selective destructuring of only needed database functions.
      const { getDatabase, ref, push, set, onValue, serverTimestamp, goOffline, goOnline } = dbMod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._fb = { ref, push, set, onValue, serverTimestamp, goOffline, goOnline, getDatabase } as any;
      const existing = getApps();
      this.app = existing.length ? existing[0] : initializeApp(firebaseConfig);
      this.database = getDatabase(this.app, firebaseConfig.databaseURL);
      this.enabled = true;
      console.log('✅ Firebase core initialized (lazy)');
    } catch (e) {
      console.error('❌ Firebase core init failed', e);
      this.enabled = false;
    }
  }

  async ensureInitialized(): Promise<boolean> {
    if (this.enabled && this.app && this.database) return true;
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
    return this.enabled;
  }

  // Accessor for dynamic firebase functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fb(): any { return this._fb; }
}
