import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
// Dynamic facade loader replaces direct FirebasePlayerService injection
import { DynamicPlayerFacadeLoader, IPlayerRealtimeFacade } from './player-facade.dynamic';
import { FirebaseFeatureLoaderService } from './firebase-feature-loader.service';
import { FilePlayerCrudService } from './file-player-crud.service';
import { OfflinePlayerQueueService, PlayerCrudOperation } from './offline-player-queue.service';
import { PlayerInfo, DEFAULT_PLAYER_STATS, PlayerStatus } from '../../../core/models/player.model';

interface FilePlayer {
  id: number|string;
  firstName?: string;
  lastName?: string;
  position?: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
  DOB?: string|number;
  avatar?: string;
  note?: string;
  notes?: string;
}

/**
 * PlayerDataFacade
 * Unified facade that toggles between Firebase realtime backend and file-based dev server (players.json).
 * Exposes a consistent PlayerInfo[] stream & CRUD methods.
 */
@Injectable({ providedIn: 'root' })
export class PlayerDataFacade {
  private readonly dynamicFirebaseLoader = inject(DynamicPlayerFacadeLoader);
  private firebaseFacade: IPlayerRealtimeFacade | null = null;
  private readonly firebaseLoader = inject(FirebaseFeatureLoaderService);
  private readonly file = inject(FilePlayerCrudService);
  private readonly offlineQueue = inject(OfflinePlayerQueueService);

  // Initial mode derived from environment feature flag; can be switched at runtime.
  private readonly initialFileMode = environment.features?.fileCrud === true;
  private readonly _mode$ = new BehaviorSubject<'file'|'firebase'>(this.initialFileMode? 'file':'firebase');
  readonly mode$ = this._mode$.asObservable();
  get useFileMode(){ return this._mode$.value === 'file'; }
  private readonly _players$ = new BehaviorSubject<PlayerInfo[]>([]);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private firebaseSub: Subscription | null = null;

  readonly players$: Observable<PlayerInfo[]> = this._players$.asObservable();
  readonly loading$: Observable<boolean> = this._loading$.asObservable();
  readonly error$: Observable<string | null> = this._error$.asObservable();

  // Synchronous snapshot accessor (read-only)
  getSnapshot(): PlayerInfo[] { return this._players$.value.slice(); }

  constructor() {
    // Initialize based on initial mode
    this.bootstrapCurrentMode();
      // Attempt flush if coming back online
      window.addEventListener('online', () => { void this.flushOfflineQueue(); });
      if(navigator.onLine){ void this.flushOfflineQueue(); }
  }

    private async flushOfflineQueue(){
      if(this.useFileMode) return; // only relevant for firebase mode
      if(this.offlineQueue.length === 0) return;
      await this.offlineQueue.flush(async (op: PlayerCrudOperation) => {
        switch(op.type){
          case 'create':
            if(!this.firebaseFacade){ this._error$.next('Facade not ready'); return; }
            await this.firebaseFacade.createPlayer({
              firstName: op.payload.firstName,
              lastName: op.payload.lastName || '',
              position: op.payload.position || 'Chưa xác định'
            });
            break;
          case 'update':
            if(!this.firebaseFacade){ this._error$.next('Facade not ready'); return; }
            await this.firebaseFacade.updatePlayer(op.id, op.updates);
            break;
          case 'delete':
            if(!this.firebaseFacade){ this._error$.next('Facade not ready'); return; }
            await this.firebaseFacade.deletePlayer(op.id);
            break;
        }
      });
    }

  /** Runtime mode switch without full page reload. Persist choice locally. */
  setMode(mode: 'file'|'firebase'){
    if(mode === this._mode$.value) return;
    this._mode$.next(mode);
    try { localStorage.setItem('playerDataMode', mode); } catch { /* ignore */ }
    this.bootstrapCurrentMode();
  }

  private bootstrapCurrentMode(){
    // Cleanup previous subscription if switching away from firebase
    if(this.firebaseSub){ this.firebaseSub.unsubscribe(); this.firebaseSub = null; }
    if(this.useFileMode){
      void this.loadFromFile();
      return;
    }
    // Firebase path: ensure feature loader then dynamic facade
    void this.firebaseLoader.ensureLoaded().then(async ok => {
      if(!ok){ this._error$.next('Firebase unavailable'); return; }
      try {
        this.firebaseFacade = await this.dynamicFirebaseLoader.ensureFacade();
        this.firebaseSub = this.firebaseFacade.players$.subscribe({
          next: list => this._players$.next(list),
          error: err => this._error$.next(String(err))
        });
      } catch(err){
        this._error$.next('Firebase facade init error: '+ String(err));
      }
    }).catch(err => this._error$.next('Firebase init error: '+ String(err)));
  }

  async refresh(): Promise<void> {
    if (this.useFileMode) {
      await this.loadFromFile();
    } else {
      // Firebase version already realtime; optional manual refresh hook could be added.
      // Force one emission (no-op) for consumers wanting manual refresh semantics.
      this._players$.next(this._players$.value.slice());
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      this._loading$.next(true);
      const raw = await this.file.getAll();
      const mapped = raw.map(p => this.mapFilePlayerToInfo(p));
      this._players$.next(mapped);
      this._error$.next(null);
    } catch {
      this._error$.next('Failed to load players from file');
    } finally {
      this._loading$.next(false);
    }
  }

  async createPlayer(data: { firstName: string; lastName?: string; position?: string }): Promise<PlayerInfo | null> {
    if (this.useFileMode) {
      try {
        this._loading$.next(true);
        const created = await this.file.create(data);
        if (!created) return null;
        const mapped = this.mapFilePlayerToInfo(created);
        this._players$.next([...this._players$.value, mapped]);
        return mapped;
      } catch {
        this._error$.next('Create failed (file mode)');
        return null;
      } finally {
        this._loading$.next(false);
      }
    } else {
      try {
          if(!navigator.onLine){
            this.offlineQueue.enqueue({ type:'create', payload:data });
            return null;
          }
        if(!this.firebaseFacade){ this._error$.next('Facade not ready'); return null; }
        await this.firebaseFacade.createPlayer({
          firstName: data.firstName,
          lastName: data.lastName || '',
          position: data.position || 'Chưa xác định'
        });
        return null; // realtime listener will push updated list
      } catch {
        this._error$.next('Create failed (firebase)');
        return null;
      }
    }
  }

  async updatePlayer(id: string, updates: Partial<PlayerInfo>): Promise<void> {
    if (this.useFileMode) {
      try {
        this._loading$.next(true);
        const numericId = Number(id);
        const allowed: Partial<{ firstName: string; lastName?: string; position?: string; height?: number; weight?: number; dateOfBirth?: string; avatar?: string; note?: string; }> = {
          firstName: updates.firstName,
          lastName: updates.lastName,
          position: updates.position,
          height: updates.height,
          weight: updates.weight,
          dateOfBirth: updates.dateOfBirth,
          avatar: updates.avatar,
          note: updates.notes
        };
  const updated = await this.file.update(numericId, allowed);
        if (updated) {
          const mapped = this.mapFilePlayerToInfo(updated);
          const next = this._players$.value.map(p => p.id === id ? mapped : p);
          this._players$.next(next);
        }
      } catch {
        this._error$.next('Update failed (file mode)');
      } finally {
        this._loading$.next(false);
      }
    } else {
      try {
          if(!navigator.onLine){
            this.offlineQueue.enqueue({ type:'update', id, updates });
            return;
          }
        if(!this.firebaseFacade){ this._error$.next('Facade not ready'); return; }
        await this.firebaseFacade.updatePlayer(id, updates);
      } catch {
        this._error$.next('Update failed (firebase)');
      }
    }
  }

  async deletePlayer(id: string): Promise<void> {
    if (this.useFileMode) {
      try {
        this._loading$.next(true);
        const numericId = Number(id);
        const ok = await this.file.delete(numericId);
        if (ok) {
          this._players$.next(this._players$.value.filter(p => p.id !== id));
        }
      } catch {
        this._error$.next('Delete failed (file mode)');
      } finally {
        this._loading$.next(false);
      }
    } else {
      try {
          if(!navigator.onLine){
            this.offlineQueue.enqueue({ type:'delete', id });
            return;
          }
        if(!this.firebaseFacade){ this._error$.next('Facade not ready'); return; }
        await this.firebaseFacade.deletePlayer(id);
      } catch {
        this._error$.next('Delete failed (firebase)');
      }
    }
  }

  private mapFilePlayerToInfo(p: FilePlayer): PlayerInfo {
    const now = new Date().toISOString();
    return {
      id: String(p.id),
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      position: p.position || 'Chưa xác định',
      height: p.height || 0,
      weight: p.weight || 0,
  dateOfBirth: (p.dateOfBirth || p.DOB || '') + '',
      avatar: p.avatar || 'assets/images/default-avatar.svg',
      notes: p.note || p.notes || '',
      isRegistered: true,
      status: PlayerStatus.ACTIVE,
      stats: { ...DEFAULT_PLAYER_STATS },
      createdAt: now,
      updatedAt: now
    };
  }
}