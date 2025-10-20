import { AIWorkerService } from './ai-worker.service';
import { HeadToHeadStats } from './history-stats.service';

// Note: This test exercises worker fallback path if Worker unavailable in Jest environment.

describe('AIWorkerService headToHead piping', () => {
  it('passes headToHead through fallback analyze path', done => {
  // Force fallback path by deleting global Worker
  interface PerfMarksServiceLike { markStart(label:string): string; markEnd(label:string, startId:string): unknown }
  const perf: PerfMarksServiceLike = { markStart: (label:string)=> label+'-start', markEnd: ()=> null };
  const service = new AIWorkerService(true, perf); // force fallback with mock perf service
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
    service.analyze(teamA, teamB, head).subscribe(res => {
      expect(res.headToHead).toBeDefined();
      expect(res.headToHead?.totalMeetings).toBe(4);
      // Restore Worker
      done();
    });
  });
});
