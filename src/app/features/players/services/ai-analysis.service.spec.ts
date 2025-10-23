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

  it('amplifies predicted score for sustained very high-scoring history', () => {
    const teamX = [player(7,'Tiền đạo'), player(8,'Tiền vệ')];
    const teamC = [player(9,'Hậu vệ'), player(10,'Tiền đạo')];
    // Simulate extreme recent average: total average goals ~11
    const head: HeadToHeadStats = {
      totalMeetings: 12,
      xanhWins: 6,
      camWins: 4,
      draws: 2,
      averageGoalsXanh: 5.5,
      averageGoalsCam: 5.2,
      averageMargin: 2.1,
      recentForm: { lastN: 5, sequence: ['X','C','X','D','X'] },
      playerStabilityIndex: 0.7
    };
    const result = service.analyzeTeams(teamX, teamC, [], head);
    const totalPred = result.prediction.predictedScore.xanh + result.prediction.predictedScore.cam;
    // Expect elevated total goals (>=8 indicates amplification kicked in)
    expect(totalPred).toBeGreaterThanOrEqual(8);
    // Distribution should exist and contain at least one very high scoring line (>=8 combined)
    expect(result.prediction.scoreDistribution).toBeDefined();
    const hasHigh = result.prediction.scoreDistribution!.some(d=>{
      const parts = d.scoreline.split('-').map(n=>+n);
      return (parts[0]+parts[1]) >= 8;
    });
    expect(hasHigh).toBe(true);
  });

  it('score distribution probabilities roughly sum to 1 (within truncation tolerance)', () => {
    const teamX = [player(11,'Tiền đạo'), player(12,'Tiền vệ')];
    const teamC = [player(13,'Hậu vệ'), player(14,'Tiền vệ')];
    const head: HeadToHeadStats = {
      totalMeetings: 6,
      xanhWins: 3,
      camWins: 2,
      draws: 1,
      averageGoalsXanh: 2.4,
      averageGoalsCam: 2.1,
      averageMargin: 1.0,
      recentForm: { lastN: 5, sequence: ['X','D','C','X','X'] },
      playerStabilityIndex: 0.6
    };
    const result = service.analyzeTeams(teamX, teamC, [], head);
    const sum = result.prediction.scoreDistribution!.reduce((s,d)=> s + d.probability,0);
    // With only top 8 scorelines retained we expect a meaningful partial mass (>=0.35) but < 1
    expect(sum).toBeGreaterThan(0.35);
    expect(sum).toBeLessThanOrEqual(0.95);
  });
});
