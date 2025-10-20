import { AIAnalysisService, Player } from './ai-analysis.service';
import { HeadToHeadStats } from './history-stats.service';

describe('AIAnalysisService head-to-head blending', () => {
  let service: AIAnalysisService;
  beforeEach(()=> { service = new AIAnalysisService(); });

  function player(id:number, position:string): Player { return { id, firstName:'P'+id, position }; }

  it('adjusts win probability toward head-to-head when stability high', () => {
    const teamX = [player(1,'Tiền đạo'), player(2,'Tiền vệ')];
    const teamC = [player(3,'Hậu vệ'), player(4,'Tiền vệ')];
    const head: HeadToHeadStats = {
      totalMeetings: 10,
      xanhWins: 8,
      camWins: 1,
      draws: 1,
      averageGoalsXanh: 2.3,
      averageGoalsCam: 1.1,
      averageMargin: 1.2,
      recentForm: { lastN: 5, sequence: ['X','X','D','X','C'] },
      playerStabilityIndex: 0.9
    };
    const result = service.analyzeTeams(teamX, teamC, [], head);
    expect(result.headToHead?.totalMeetings).toBe(10);
    expect(result.prediction.winProbability.xanh).toBeGreaterThan(60); // strong tilt toward Xanh
  });

  it('score prediction blends historical averages', () => {
    const teamX = [player(5,'Tiền đạo')];
    const teamC = [player(6,'Hậu vệ')];
    const head: HeadToHeadStats = {
      totalMeetings: 5,
      xanhWins: 2,
      camWins: 2,
      draws: 1,
      averageGoalsXanh: 3,
      averageGoalsCam: 2,
      averageMargin: 1.4,
      recentForm: { lastN: 5, sequence: ['X','C','D','C','X'] },
      playerStabilityIndex: 0.5
    };
    const result = service.analyzeTeams(teamX, teamC, [], head);
    expect(result.prediction.predictedScore.xanh).toBeGreaterThanOrEqual(1);
  });
});
