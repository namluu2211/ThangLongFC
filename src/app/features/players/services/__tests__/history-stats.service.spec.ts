import { HistoryStatsService } from '../history-stats.service';
import { TeamColor, MatchInfo } from '../../../../core/models/match.model';

describe('HistoryStatsService buildHeadToHead', () => {
  let service: HistoryStatsService;
  beforeEach(()=> { service = new HistoryStatsService(); });

  function mockMatch(scoreA:number, scoreB:number): MatchInfo {
    return {
      teamA: { teamColor: TeamColor.BLUE, players: [{ id:'1'},{id:'2'},{id:'3'},{id:'4'}] },
      teamB: { teamColor: TeamColor.ORANGE, players: [{ id:'5'},{id:'6'},{id:'7'},{id:'8'}] },
      result: { scoreA, scoreB }
    } as MatchInfo;
  }

  it('computes wins, draws, averages and stability', () => {
    const matches = [
      mockMatch(2,1),
      mockMatch(1,2),
      mockMatch(2,2),
      mockMatch(3,1),
      mockMatch(0,1),
      mockMatch(2,0)
    ];
    const head = service.buildHeadToHead(matches, ['1','2','3','4'], ['5','6','7','8']);
    expect(head.totalMeetings).toBe(6);
    expect(head.xanhWins + head.camWins + head.draws).toBe(6);
    expect(head.averageGoalsXanh).toBeGreaterThan(0);
    expect(head.averageGoalsCam).toBeGreaterThan(0);
    expect(head.playerStabilityIndex).toBeGreaterThan(0);
    expect(head.recentForm.sequence.length).toBe(6);
  });

  it('handles empty matches gracefully', () => {
    const head = service.buildHeadToHead([], ['1','2'], ['5','6']);
    expect(head.totalMeetings).toBe(0);
    expect(head.xanhWins).toBe(0);
    expect(head.camWins).toBe(0);
    expect(head.draws).toBe(0);
    expect(head.averageGoalsXanh).toBe(0);
    expect(head.averageGoalsCam).toBe(0);
    expect(head.playerStabilityIndex).toBe(0);
  });
});
