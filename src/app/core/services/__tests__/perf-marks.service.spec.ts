import { TestBed } from '@angular/core/testing';
import { PerfMarksService } from '../perf-marks.service';

describe('PerfMarksService', () => {
  let service: PerfMarksService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PerfMarksService]
    });
    service = TestBed.inject(PerfMarksService);
    
    // Clear performance marks before each test
    performance.clearMarks();
    performance.clearMeasures();
    service.clear();
  });

  afterEach(() => {
    performance.clearMarks();
    performance.clearMeasures();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('markStart', () => {
    it('should create a performance mark and return an id', () => {
      const id = service.markStart('test-operation');
      
      expect(id).toContain('test-operation-start-');
      expect(id).toMatch(/test-operation-start-\d+/);
      
      // Verify the mark was created
      const marks = performance.getEntriesByName(id);
      expect(marks.length).toBe(1);
      expect(marks[0].entryType).toBe('mark');
    });

    it('should create unique ids for multiple calls', () => {
      const id1 = service.markStart('operation');
      const id2 = service.markStart('operation');
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('markEnd', () => {
    it('should create a measure and return result', () => {
      const startId = service.markStart('test-measure');
      
      // Wait a tiny bit to ensure duration > 0
      const startTime = Date.now();
      while (Date.now() - startTime < 5) {
        // Busy wait
      }
      
      const result = service.markEnd('test-measure', startId);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-measure');
      expect(result?.duration).toBeGreaterThanOrEqual(0);
      expect(result?.start).toBeGreaterThanOrEqual(0);
      expect(result?.end).toBeGreaterThan(result!.start);
    });

    it('should store measure in measures array', () => {
      const startId = service.markStart('stored-measure');
      service.markEnd('stored-measure', startId);
      
      const measures = service.getMeasures();
      expect(measures.length).toBe(1);
      expect(measures[0].name).toBe('stored-measure');
    });

    it('should return null if measure fails', () => {
      const result = service.markEnd('invalid-measure', 'non-existent-start-id');
      
      expect(result).toBeNull();
    });

    it('should handle multiple measures', () => {
      const start1 = service.markStart('measure1');
      const start2 = service.markStart('measure2');
      
      service.markEnd('measure1', start1);
      service.markEnd('measure2', start2);
      
      const measures = service.getMeasures();
      expect(measures.length).toBe(2);
      expect(measures[0].name).toBe('measure1');
      expect(measures[1].name).toBe('measure2');
    });
  });

  describe('getMeasures', () => {
    it('should return empty array initially', () => {
      const measures = service.getMeasures();
      expect(measures).toEqual([]);
    });

    it('should return copy of measures array', () => {
      const startId = service.markStart('test');
      service.markEnd('test', startId);
      
      const measures1 = service.getMeasures();
      const measures2 = service.getMeasures();
      
      // Should be different array instances
      expect(measures1).not.toBe(measures2);
      // But with same content
      expect(measures1).toEqual(measures2);
    });
  });

  describe('clear', () => {
    it('should clear all stored measures', () => {
      const start1 = service.markStart('measure1');
      const start2 = service.markStart('measure2');
      service.markEnd('measure1', start1);
      service.markEnd('measure2', start2);
      
      expect(service.getMeasures().length).toBe(2);
      
      service.clear();
      
      expect(service.getMeasures().length).toBe(0);
    });
  });

  describe('timeAsync', () => {
    it('should time an async function and return both value and measure', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };
      
      const { value, measure } = await service.timeAsync('async-operation', asyncFn);
      
      expect(value).toBe('result');
      expect(measure).not.toBeNull();
      expect(measure?.name).toBe('async-operation');
      expect(measure?.duration).toBeGreaterThan(0);
    });

    it('should handle async functions that throw errors', async () => {
      const asyncFn = async () => {
        throw new Error('Test error');
      };
      
      await expect(service.timeAsync('failing-async', asyncFn)).rejects.toThrow('Test error');
    });

    it('should store measure in measures array', async () => {
      const asyncFn = async () => 42;
      
      await service.timeAsync('stored-async', asyncFn);
      
      const measures = service.getMeasures();
      expect(measures.length).toBe(1);
      expect(measures[0].name).toBe('stored-async');
    });
  });

  describe('timeSync', () => {
    it('should time a sync function and return both value and measure', () => {
      const syncFn = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };
      
      const { value, measure } = service.timeSync('sync-operation', syncFn);
      
      expect(value).toBe(499500); // Sum of 0 to 999
      expect(measure).not.toBeNull();
      expect(measure?.name).toBe('sync-operation');
      expect(measure?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle sync functions that throw errors', () => {
      const syncFn = () => {
        throw new Error('Sync error');
      };
      
      expect(() => service.timeSync('failing-sync', syncFn)).toThrow('Sync error');
    });

    it('should store measure in measures array', () => {
      const syncFn = () => 'result';
      
      service.timeSync('stored-sync', syncFn);
      
      const measures = service.getMeasures();
      expect(measures.length).toBe(1);
      expect(measures[0].name).toBe('stored-sync');
    });

    it('should work with functions returning different types', () => {
      const { value: str } = service.timeSync('string', () => 'text');
      const { value: num } = service.timeSync('number', () => 42);
      const { value: obj } = service.timeSync('object', () => ({ key: 'value' }));
      const { value: arr } = service.timeSync('array', () => [1, 2, 3]);
      
      expect(str).toBe('text');
      expect(num).toBe(42);
      expect(obj).toEqual({ key: 'value' });
      expect(arr).toEqual([1, 2, 3]);
      
      expect(service.getMeasures().length).toBe(4);
    });
  });

  describe('integration tests', () => {
    it('should handle multiple operations in sequence', async () => {
      // Sync operation
      service.timeSync('sync-1', () => 'a');
      
      // Async operation
      await service.timeAsync('async-1', async () => 'b');
      
      // Manual marks
      const start = service.markStart('manual');
      service.markEnd('manual', start);
      
      // Another sync
      service.timeSync('sync-2', () => 'c');
      
      const measures = service.getMeasures();
      expect(measures.length).toBe(4);
      expect(measures.map(m => m.name)).toEqual(['sync-1', 'async-1', 'manual', 'sync-2']);
    });

    it('should maintain measures across multiple operations', () => {
      const results: { name: string; value: number }[] = [];
      
      for (let i = 0; i < 5; i++) {
        const { value } = service.timeSync(`operation-${i}`, () => i * 2);
        results.push({ name: `operation-${i}`, value });
      }
      
      expect(service.getMeasures().length).toBe(5);
      expect(results).toEqual([
        { name: 'operation-0', value: 0 },
        { name: 'operation-1', value: 2 },
        { name: 'operation-2', value: 4 },
        { name: 'operation-3', value: 6 },
        { name: 'operation-4', value: 8 }
      ]);
    });
  });
});
