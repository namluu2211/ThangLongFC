/// <reference types="jest" />
import { PlayerAdvancedStatsService } from '../player-advanced-stats.service';
import { PlayerInfo } from '../../models/player.model';
import { MatchInfo } from '../../models/match.model';

function makePlayer(id: string, firstName: string, position = 'Tiền đạo'): PlayerInfo {
  return { id, firstName, lastName: '', position, stats: { totalMatches: 0, winRate: 0, averageGoalsPerMatch: 0, averageAssistsPerMatch: 0 } } as PlayerInfo;
}

function makeMatch(id: string, scoreA: number, scoreB: number, playersA: string[], playersB: string[], goalsA: string[] = [], goalsB: string[] = []): MatchInfo {
  return {
    id,
    date: '2025-10-19',
    teamA: { players: playersA.map(pid => ({ id: pid })) },
    teamB: { players: playersB.map(pid => ({ id: pid })) },
    finances: { totalRevenue: 1000000, totalExpenses: 500000, netProfit: 500000 },
    result: {
      scoreA,
      scoreB,
      goalsA: goalsA.map(pid => ({ playerId: pid, playerName: pid, assistedBy: undefined })),
      goalsB: goalsB.map(pid => ({ playerId: pid, playerName: pid, assistedBy: undefined })),
      yellowCardsA: [],
      yellowCardsB: [],
      redCardsA: [],
      redCardsB: []
    }
  } as unknown as MatchInfo;
}

describe('PlayerAdvancedStatsService', () => {
  let service: PlayerAdvancedStatsService;
  beforeEach(() => { service = new PlayerAdvancedStatsService(); });

  it('computes basic performance stats', () => {
    const players = [makePlayer('p1','A'), makePlayer('p2','B')];
    const matches = [
      makeMatch('m1',2,1,['p1','p2'],['x1','x2'],['p1'],[]),
      makeMatch('m2',0,0,['p1'],['p2'],[],[])
    ];
    const stats = service.buildPlayerStatistics(players, matches);
    const p1 = stats.find(s => s.playerId==='p1')!;
    expect(p1.performance.totalMatches).toBe(2);
    expect(p1.performance.goalsScored).toBe(1);
  });

  it('derives financial analytics', () => {
    const players = [makePlayer('p1','A')];
    const matches = [makeMatch('m1',1,0,['p1'],['x1'],['p1'],[])];
    const stats = service.buildPlayerStatistics(players, matches);
    expect(stats[0].financial.totalRevenue).toBeGreaterThan(0);
    expect(stats[0].financial.penaltiesPaid).toBe(0);
  });

  it('produces correct goal rankings', () => {
    const players = [makePlayer('p1','A'), makePlayer('p2','B')];
    const matches = [makeMatch('m1',3,1,['p1','p2'],['x'],['p1','p1','p2'],[])];
    const stats = service.buildPlayerStatistics(players, matches);
    const p1rank = stats.find(s => s.playerId==='p1')!;
    const p2rank = stats.find(s => s.playerId==='p2')!;
    expect(p1rank.rankings.goalsRank).toBe(1);
    expect(p2rank.rankings.goalsRank).toBe(2);
  });
});
