import { PlayersComponent } from '../players.component';

// Simple observable stub
interface SubscriptionLike { unsubscribe(): void }
class ObservableStub<T = unknown> {
  subscribe(cb?: (value: T) => void): SubscriptionLike { void cb; return { unsubscribe() { /* no operation */ } }; }
  pipe(): ObservableStub<T> { return this; }
}

// Lightweight mocks for injected services with minimal behavior
interface MockPlayer { id: number|string }
class MockPlayerDataFacade {
  useFileMode = true;
  players$ = new ObservableStub<MockPlayer[]>();
  private snapshot: MockPlayer[] = [];
  getSnapshot(): MockPlayer[] { return this.snapshot; }
  setMode(mode: string) { this.useFileMode = mode === 'file'; }
  refresh() { return void 0; }
  async createPlayer(p: { id?: string|number }) { this.snapshot.push({ id: p.id ?? 'temp' }); }
  async updatePlayer(id: string, patch: unknown) { /* simulate update using parameters */ if(!id||!patch) return; }
  async deletePlayer(id: string) { this.snapshot = this.snapshot.filter(x => x.id !== id); }
}
class MockMatchService { completedMatches$ = new ObservableStub<unknown[]>(); }
class MockDataStoreService { setTeams(a?: unknown, b?: unknown) { void a; void b; } }
class MockLoggerService { errorDev(msg?: string, e?: unknown) { void msg; void e; }; warnDev(msg?: string, e?: unknown) { void msg; void e; } }
class MockMatchFinanceService { finance = { thu:0, chi_total:0, chi_nuoc:0, chi_san:0, chi_trongtai:0 }; update(patch: Record<string, unknown>) { Object.assign(this.finance, patch); } }

// Basic instantiation test focusing on non-Angular logic branches

describe('PlayersComponent (shallow)', () => {
  let component: PlayersComponent;

  beforeEach(() => {
    // Instantiate component
    component = new PlayersComponent() as PlayersComponent; // decorator metadata ignored in test env
    // Define a patch interface for private fields we need
    const patch = component as unknown as {
      playerFacade: MockPlayerDataFacade;
      matchService: MockMatchService;
      dataStore: MockDataStoreService;
      logger: MockLoggerService;
      financeService: MockMatchFinanceService;
      computeTeamHash(a: MockPlayer[], b: MockPlayer[]): string;
      runAIAnalysis(): void;
      registeredPlayers: MockPlayer[];
      allPlayers: MockPlayer[];
    };
    patch.playerFacade = new MockPlayerDataFacade();
    patch.matchService = new MockMatchService();
    patch.dataStore = new MockDataStoreService();
    patch.logger = new MockLoggerService();
    patch.financeService = new MockMatchFinanceService();
  });

  it('should create component instance', () => {
    expect(component).toBeTruthy();
  });

  it('should compute team hash deterministically', () => {
  const a: MockPlayer[] = [{ id: 3 }, { id: 1 }];
  const b: MockPlayer[] = [{ id: 2 }];
  const first = (component as unknown as { computeTeamHash(a: MockPlayer[], b: MockPlayer[]): string }).computeTeamHash(a,b);
  const second = (component as unknown as { computeTeamHash(a: MockPlayer[], b: MockPlayer[]): string }).computeTeamHash([{ id:1 },{ id:3 }], [{ id:2 }]);
    expect(first).toEqual(second); // order independent
  });

  it('should toggle registered mode and update pagination without errors', () => {
    component.useRegistered = false;
  (component as unknown as { registeredPlayers: MockPlayer[] }).registeredPlayers = [];
  (component as unknown as { allPlayers: MockPlayer[] }).allPlayers = [ { id: 1 }, { id:2 }, { id:3 } ];
    component.toggleUseRegistered(); // switch to registered
    component.toggleUseRegistered(); // switch back
    expect(component.getDisplayPlayers().length).toBeGreaterThan(0);
  });

  it('should not analyze AI when teams empty', () => {
  (component as unknown as { runAIAnalysis(): void }).runAIAnalysis();
    expect(component.aiAnalysisResults).toBeNull();
  });
});
