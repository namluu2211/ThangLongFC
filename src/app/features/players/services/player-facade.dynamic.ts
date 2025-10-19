import { Injectable } from '@angular/core';
import type { PlayerInfo } from '../../../core/models/player.model';

export interface IPlayerRealtimeFacade {
  players$: import('rxjs').Observable<PlayerInfo[]>;
  createPlayer(data: { firstName: string; lastName?: string; position?: string }): Promise<void>;
  updatePlayer(id: string, updates: Partial<PlayerInfo>): Promise<void>;
  deletePlayer(id: string): Promise<void>;
}

/**
 * DynamicPlayerFacadeLoader
 * Performs a dynamic import of the FirebasePlayerService only when needed (firebase mode activation).
 */
@Injectable({ providedIn:'root' })
export class DynamicPlayerFacadeLoader {
  private facade: IPlayerRealtimeFacade | null = null;
  private loading: Promise<IPlayerRealtimeFacade> | null = null;

  async ensureFacade(): Promise<IPlayerRealtimeFacade> {
    if(this.facade) return this.facade;
    if(this.loading) return this.loading;
    this.loading = (async () => {
      // Dynamic chunk name hint
      const mod = await import(/* webpackChunkName: 'firebase-player-service' */ '../../../core/services/firebase-player.service');
      const svc = new mod.FirebasePlayerService();
      this.facade = svc as unknown as IPlayerRealtimeFacade;
      return this.facade!;
    })();
    return this.loading;
  }
}
