import { DynamicPlayerFacadeLoader } from './player-facade.dynamic';

// Basic mock module to simulate dynamic import target. We will monkey-patch import() via jest.mock if needed.
// Since dynamic import path is static string, we can mock it using jest.mock with the relative path.

jest.mock('../../../core/services/firebase-player.service', () => {
  interface Sub { unsubscribe(): void }
  interface Obs<T> { subscribe(next?: (value: T) => void): Sub }
  class MockFirebasePlayerService {
    players$: Obs<unknown> = { subscribe: () => ({ unsubscribe: () => void 0 }) };
    async createPlayer(){ /* noop */ }
    async updatePlayer(){ /* noop */ }
    async deletePlayer(){ /* noop */ }
  }
  return { FirebasePlayerService: MockFirebasePlayerService };
});

describe('DynamicPlayerFacadeLoader', () => {
  it('loads facade only once and caches instance', async () => {
    const loader = new DynamicPlayerFacadeLoader();
    const first = await loader.ensureFacade();
    const second = await loader.ensureFacade();
    expect(first).toBe(second); // same cached instance
    expect(typeof first.createPlayer).toBe('function');
  });
});
