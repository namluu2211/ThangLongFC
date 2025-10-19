import { PlayerDataFacade } from './player-data-facade.service';
import { BehaviorSubject } from 'rxjs';

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
jest.mock('../../../../environments/environment', () => ({ environment: { features: { fileCrud: true }, firebase: { apiKey:'test', authDomain:'test', databaseURL:'https://local.test', projectId:'test', storageBucket:'test', messagingSenderId:'test', appId:'test' } } }));

describe('PlayerDataFacade', () => {
  it('initializes in file mode and can switch to firebase mode triggering dynamic facade load', async () => {
    // Provide minimal window/navigator mocks for online checks
  interface MockWin { addEventListener: (ev:string, cb:()=>void)=>void }
  interface MockNav { onLine: boolean }
  const g = globalThis as unknown as { window?: MockWin; navigator?: MockNav };
  if(!g.window) g.window = { addEventListener: () => void 0 };
  if(!g.navigator) g.navigator = { onLine: true };
    const facade = new PlayerDataFacade();
    // Monkey patch injected services
  (facade as unknown as { file: MockFilePlayerCrudService }).file = new MockFilePlayerCrudService();
  (facade as unknown as { offlineQueue: MockOfflinePlayerQueueService }).offlineQueue = new MockOfflinePlayerQueueService();
  (facade as unknown as { firebaseLoader: MockFirebaseFeatureLoaderService }).firebaseLoader = new MockFirebaseFeatureLoaderService();
    const dynamicLoader = new MockDynamicPlayerFacadeLoader();
  (facade as unknown as { dynamicFirebaseLoader: MockDynamicPlayerFacadeLoader }).dynamicFirebaseLoader = dynamicLoader;

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
    expect(dynamicLoader.called).toBeGreaterThan(0);
  });
});
