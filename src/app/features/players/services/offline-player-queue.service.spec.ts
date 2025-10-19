import { OfflinePlayerQueueService } from './offline-player-queue.service';

// Minimal mock for FirebasePlayerService used indirectly when flushing via facade (not here).

describe('OfflinePlayerQueueService', () => {
  let service: OfflinePlayerQueueService;
  beforeEach(() => {
    // Use reduced attempts & zero backoff for deterministic fast tests
    service = new OfflinePlayerQueueService(3, [0,0,0]);
    // Clear any persisted prior state
    const ls = globalThis.localStorage as Storage | undefined;
    if(ls){ ls.clear(); }
  });

  test('enqueue create operation increases queue length', () => {
    service.enqueue({ type:'create', payload:{ firstName:'John', lastName:'Doe', position:'Tiền đạo' } });
    expect(service.length).toBe(1);
  });

  test('flush processes operations with provided processor', async () => {
    const processed: string[] = [];
    service.enqueue({ type:'create', payload:{ firstName:'Jane', position:'Hậu vệ' } });
    service.enqueue({ type:'delete', id:'123' });
    const result = await service.flush(async (op) => { processed.push(op.type); });
    expect(result.processed).toBe(2);
    expect(result.remaining).toBe(0);
    expect(processed).toEqual(['create','delete']);
  });

  test('failed processor retries and eventually drops after max attempts', async () => {
    service.enqueue({ type:'delete', id:'abc' });
    let attemptCount = 0;
    await service.flush(async () => { attemptCount++; throw new Error('fail'); });
    expect(service.length).toBe(0);
    expect(attemptCount).toBe(3); // maxAttempts
  });
});
