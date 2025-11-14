import { TestBed } from '@angular/core/testing';
import { PlayerDataFacade } from '../player-data-facade.service';
import { BehaviorSubject } from 'rxjs';
import { DynamicPlayerFacadeLoader } from '../player-facade.dynamic';
import { FirebaseFeatureLoaderService } from '../firebase-feature-loader.service';
import { FilePlayerCrudService } from '../file-player-crud.service';
import { OfflinePlayerQueueService } from '../offline-player-queue.service';

// Mocks
interface PlayerFileRecord { id: number; firstName?: string; lastName?: string; position?: string }
class MockFilePlayerCrudService {
  private data: PlayerFileRecord[] = [];
  async getAll(): Promise<PlayerFileRecord[]> { return this.data; }
  async create(d: Omit<PlayerFileRecord,'id'>): Promise<PlayerFileRecord> { const id = this.data.length+1; const rec: PlayerFileRecord = { id, ...d }; this.data.push(rec); return rec; }
  async update(id: number, updates: Partial<PlayerFileRecord>): Promise<PlayerFileRecord|null> { const idx = this.data.findIndex(p=>p.id===id); if(idx>=0){ this.data[idx] = { ...this.data[idx], ...updates }; return this.data[idx]; } return null; }
  async delete(id: number): Promise<boolean> { const before = this.data.length; this.data = this.data.filter(p=>p.id!==id); return this.data.length < before; }
}
class MockOfflinePlayerQueueService { length=0; enqueue(){ this.length++; } async flush(){ /* noop */ } }
class MockFirebaseFeatureLoaderService { async ensureLoaded(){ return true; } }
class MockDynamicPlayerFacadeLoader {
  called = 0; players$ = new BehaviorSubject<unknown[]>([]);
  async ensureFacade(){
    this.called++;
    return {
      players$: this.players$.asObservable(),
      async createPlayer(){ /* no-op */ },
      async updatePlayer(){ /* no-op */ },
      async deletePlayer(){ /* no-op */ }
    };
  }
}

// Provide environment mock
jest.mock('../../../../../environments/environment', () => ({ environment: { features: { fileCrud: true }, firebase: { apiKey:'test', authDomain:'test', databaseURL:'https://local.test', projectId:'test', storageBucket:'test', messagingSenderId:'test', appId:'test' } } }));

describe('PlayerDataFacade', () => {
  let facade: PlayerDataFacade;
  let mockFile: MockFilePlayerCrudService;
  let mockQueue: MockOfflinePlayerQueueService;
  let mockLoader: MockFirebaseFeatureLoaderService;
  let mockDynamic: MockDynamicPlayerFacadeLoader;

  beforeEach(() => {
    mockFile = new MockFilePlayerCrudService();
    mockQueue = new MockOfflinePlayerQueueService();
    mockLoader = new MockFirebaseFeatureLoaderService();
    mockDynamic = new MockDynamicPlayerFacadeLoader();

    TestBed.configureTestingModule({
      providers: [
        PlayerDataFacade,
        { provide: FilePlayerCrudService, useValue: mockFile },
        { provide: OfflinePlayerQueueService, useValue: mockQueue },
        { provide: FirebaseFeatureLoaderService, useValue: mockLoader },
        { provide: DynamicPlayerFacadeLoader, useValue: mockDynamic }
      ]
    });
    facade = TestBed.inject(PlayerDataFacade);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes in file mode and can switch to firebase mode triggering dynamic facade load', async () => {
    // Provide minimal window/navigator mocks for online checks
  interface MockWin { addEventListener: (ev:string, cb:()=>void)=>void }
  interface MockNav { onLine: boolean }
  const g = globalThis as unknown as { window?: MockWin; navigator?: MockNav };
  if(!g.window) g.window = { addEventListener: () => void 0 };
  if(!g.navigator) g.navigator = { onLine: true };

    // Start in file mode (environment.features.fileCrud = true)
    expect(facade.useFileMode).toBe(true);

    // Create a player in file mode
    await facade.createPlayer({ firstName: 'John', position: 'FW' });
    expect(facade.getSnapshot().length).toBe(1);

    // Switch to firebase mode
    facade.setMode('firebase');
    // Allow async bootstrap
    await new Promise(r => setTimeout(r, 10));
    expect(facade.useFileMode).toBe(false);
    expect(mockDynamic.called).toBeGreaterThan(0);
  });

  it('should get snapshot of players', async () => {
    await facade.createPlayer({ firstName: 'Test' });
    const snapshot = facade.getSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].firstName).toBe('Test');
  });

  it('should handle refresh in file mode', async () => {
    await facade.createPlayer({ firstName: 'Refresh Test' });
    await facade.refresh();
    expect(facade.getSnapshot()).toHaveLength(1);
  });

  it('should handle refresh in firebase mode', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));
    await facade.refresh();
    // Should not throw
    expect(facade.useFileMode).toBe(false);
  });

  it('should map file player to PlayerInfo with all fields', async () => {
    const complexPlayer = {
      firstName: 'Complex',
      lastName: 'Player',
      position: 'Midfielder',
      height: 180,
      weight: 75,
      dateOfBirth: '2000-01-01',
      avatar: 'custom.jpg',
      note: 'Test note'
    };
    
    await facade.createPlayer(complexPlayer);
    const players = facade.getSnapshot();
    
    expect(players[0].firstName).toBe('Complex');
    expect(players[0].lastName).toBe('Player');
    expect(players[0].position).toBe('Midfielder');
    expect(players[0].height).toBe(180);
    expect(players[0].weight).toBe(75);
    expect(players[0].avatar).toBe('custom.jpg');
    expect(players[0].notes).toBe('Test note');
  });

  it('should handle update in file mode', async () => {
    await facade.createPlayer({ firstName: 'Original' });
    const players = facade.getSnapshot();
    
    await facade.updatePlayer(players[0].id, { firstName: 'Updated' });
    
    const updated = facade.getSnapshot();
    expect(updated[0].firstName).toBe('Updated');
  });

  it('should handle delete in file mode', async () => {
    await facade.createPlayer({ firstName: 'ToDelete' });
    const players = facade.getSnapshot();
    
    await facade.deletePlayer(players[0].id);
    
    expect(facade.getSnapshot()).toHaveLength(0);
  });

  it('should handle create failure in file mode', async () => {
    // Mock file service to throw error
    jest.spyOn(mockFile, 'create').mockRejectedValueOnce(new Error('Create failed'));
    
    const result = await facade.createPlayer({ firstName: 'Failed' });
    expect(result).toBeNull();
  });

  it('should handle update failure in file mode', async () => {
    await facade.createPlayer({ firstName: 'Test' });
    const players = facade.getSnapshot();
    
    jest.spyOn(mockFile, 'update').mockRejectedValueOnce(new Error('Update failed'));
    
    await facade.updatePlayer(players[0].id, { firstName: 'Fail' });
    // Error should be handled gracefully
    expect(facade.getSnapshot()[0].firstName).toBe('Test');
  });

  it('should handle delete failure in file mode', async () => {
    await facade.createPlayer({ firstName: 'Test' });
    const players = facade.getSnapshot();
    
    jest.spyOn(mockFile, 'delete').mockRejectedValueOnce(new Error('Delete failed'));
    
    await facade.deletePlayer(players[0].id);
    // Should still have the player
    expect(facade.getSnapshot()).toHaveLength(1);
  });

  it('should not switch mode if already in that mode', () => {
    expect(facade.useFileMode).toBe(true);
    facade.setMode('file');
    expect(facade.useFileMode).toBe(true);
  });

  it('should persist mode choice to localStorage', () => {
    facade.setMode('firebase');
    expect(localStorage.getItem('playerDataMode')).toBe('firebase');
  });

  it('should handle localStorage errors gracefully when persisting mode', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => facade.setMode('firebase')).not.toThrow();

    Storage.prototype.setItem = originalSetItem;
  });

  it('should handle offline create operations', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    // Mock offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await facade.createPlayer({ firstName: 'Offline' });
    
    expect(mockQueue.length).toBe(1);
  });

  it('should handle offline update operations', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await facade.updatePlayer('123', { firstName: 'Updated' });
    
    expect(mockQueue.length).toBe(1);
  });

  it('should handle offline delete operations', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await facade.deletePlayer('123');
    
    expect(mockQueue.length).toBe(1);
  });

  it('should handle firebase create when online', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    const result = await facade.createPlayer({ firstName: 'Firebase' });
    // Returns null because firebase uses realtime listener
    expect(result).toBeNull();
  });

  it('should handle firebase create failure', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    // Mock firebase facade to throw
    const facadePromise = mockDynamic.ensureFacade();
    facadePromise.then(f => {
      f.createPlayer = jest.fn().mockRejectedValue(new Error('Firebase error'));
    });

    await facade.createPlayer({ firstName: 'Fail' });
    // Should handle error gracefully
  });

  it('should handle firebase update when online', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    await facade.updatePlayer('123', { firstName: 'Updated' });
    // Should complete without error
  });

  it('should handle firebase delete when online', async () => {
    facade.setMode('firebase');
    await new Promise(r => setTimeout(r, 10));

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    await facade.deletePlayer('123');
    // Should complete without error
  });

  it('should handle missing file service', async () => {
    const newFacade = new PlayerDataFacade();
    // Manually set file to undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newFacade as any)._file = undefined;
    
    await newFacade.createPlayer({ firstName: 'Test' });
    // Should handle gracefully
  });

  it('should map file player with DOB field', async () => {
    // Create player with DOB instead of dateOfBirth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockFile as any).data = [{
      id: 1,
      firstName: 'DOB',
      DOB: '1995-05-15'
    }];

    await facade.refresh();
    const players = facade.getSnapshot();
    
    expect(players[0].dateOfBirth).toBe('1995-05-15');
  });

  it('should map file player with notes field', async () => {
    // Create player with notes instead of note
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockFile as any).data = [{
      id: 1,
      firstName: 'Notes',
      notes: 'Has notes field'
    }];

    await facade.refresh();
    const players = facade.getSnapshot();
    
    expect(players[0].notes).toBe('Has notes field');
  });

  it('should replace duplicate IDs when creating', async () => {
    await facade.createPlayer({ firstName: 'First' });
    
    // Manually add a player with same ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockFile as any).data = [{ id: 1, firstName: 'Duplicate' }];
    
    await facade.createPlayer({ firstName: 'Second' });
    const players = facade.getSnapshot();
    
    // Should not have duplicates
    const ids = players.map(p => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });
});

