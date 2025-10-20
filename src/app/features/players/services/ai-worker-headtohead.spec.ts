import { AIWorkerService } from './ai-worker.service';
import { HeadToHeadStats } from './history-stats.service';
import { runInInjectionContext, EnvironmentInjector, Injector, Provider } from '@angular/core';
import { PerfMarksService } from '../../../core/services/perf-marks.service';

// Note: This test exercises worker fallback path if Worker unavailable in Jest environment.

describe('AIWorkerService headToHead piping', () => {
  it('passes headToHead through fallback analyze path', done => {
    // Temporarily disable Worker support to trigger fallback logic
  const globalRef = globalThis as unknown as { Worker?: typeof Worker };
  const originalWorker = globalRef.Worker;
  globalRef.Worker = undefined;

    // Create a mock PerfMarksService provider
    class MockPerfMarksService {
      markStart(label:string){ return label+'-start'; }
      // markEnd signature kept minimal for test
      markEnd(){ return null; }
    }
    const providers: Provider[] = [{ provide: PerfMarksService, useClass: MockPerfMarksService }];
    const injector = Injector.create({ providers });
    let service: AIWorkerService;
    runInInjectionContext(injector as unknown as EnvironmentInjector, () => {
      service = new AIWorkerService();
    });
    interface PlayerLite { id:number; firstName:string; lastName?:string; position?:string }
    const teamA: PlayerLite[] = [{ id:1, firstName:'A', position:'Tiền đạo' }];
    const teamB: PlayerLite[] = [{ id:2, firstName:'B', position:'Hậu vệ' }];
    const head: HeadToHeadStats = {
      totalMeetings: 4,
      xanhWins: 3,
      camWins: 1,
      draws: 0,
      averageGoalsXanh: 2.5,
      averageGoalsCam: 1.0,
      averageMargin: 1.5,
      recentForm: { lastN:4, sequence:['X','X','C','X'] },
      playerStabilityIndex: 0.8
    };
  service!.analyze(teamA, teamB, head).subscribe(res => {
      expect(res.headToHead).toBeDefined();
      expect(res.headToHead?.totalMeetings).toBe(4);
      // Restore Worker reference
  globalRef.Worker = originalWorker;
      done();
    });
  });
});
