import { Injectable, inject } from '@angular/core';
import { FirebasePlayerService } from '../../../core/services/firebase-player.service';
import { PlayerInfo, PlayerStatus } from '../../../core/models/player.model';

/**
 * PlayerCrudService
 * Feature-layer facade to isolate component code from Firebase-specific implementation.
 * Provides thin wrappers for CRUD plus simple mapping helpers.
 */
@Injectable({ providedIn: 'root' })
export class PlayerCrudService {
  private readonly firebasePlayerService = inject(FirebasePlayerService);

  // Streams (re-export for convenience)
  players$ = this.firebasePlayerService.players$;
  loading$ = this.firebasePlayerService.loading$;
  error$ = this.firebasePlayerService.error$;

  getAll(): PlayerInfo[] { return this.firebasePlayerService.getAllPlayers(); }

  async createBasic(firstName: string, lastName = '', position = 'Chưa xác định'): Promise<string> {
    return this.firebasePlayerService.createPlayer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      position,
      height: 0,
      weight: 0,
      dateOfBirth: '',
      avatar: '',
      notes: '',
      isRegistered: true,
      status: PlayerStatus.ACTIVE
    });
  }

  async update(id: string, updates: Partial<PlayerInfo>): Promise<void> {
    await this.firebasePlayerService.updatePlayer(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.firebasePlayerService.deletePlayer(id);
  }
}
