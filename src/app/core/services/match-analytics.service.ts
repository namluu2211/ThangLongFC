import { Injectable } from '@angular/core';
import { MatchInfo } from '../models/match.model';
import { PlayerInfo } from '../models/player.model';
import { MatchAnalytics } from './statistics.service';

/**
 * MatchAnalyticsService
 * Responsible for computing per-match analytics (quality, balance, financial, player highlights).
 * All methods are pure/stateless to simplify testing and reuse.
 */
@Injectable({ providedIn: 'root' })
export class MatchAnalyticsService {
  buildMatchAnalytics(match: MatchInfo, players: PlayerInfo[]): MatchAnalytics {
    return {
      matchId: match.id,
      date: match.date,
      quality: this.calculateMatchQuality(match),
      balance: this.calculateMatchBalance(match, players),
      financial: this.calculateMatchFinancial(match),
      playerHighlights: this.calculatePlayerHighlights(match)
    };
  }

  private calculateMatchQuality(match: MatchInfo): MatchAnalytics['quality'] {
    const totalGoals = match.result.scoreA + match.result.scoreB;
    const totalCards = match.result.yellowCardsA.length + match.result.yellowCardsB.length +
      (match.result.redCardsA.length + match.result.redCardsB.length) * 3;

    const entertainment = Math.min(100, totalGoals * 20);
    const fairPlay = Math.max(0, 100 - totalCards * 10);
    const competitiveness = Math.max(0, 100 - Math.abs(match.result.scoreA - match.result.scoreB) * 20);
    const organization = 85; // Placeholder constant until dynamic factors are added

    return {
      competitiveness,
      entertainment,
      organization,
      fairPlay,
      overallRating: (entertainment + fairPlay + competitiveness + organization) / 4
    };
  }

  private calculateMatchBalance(match: MatchInfo, players: PlayerInfo[]): MatchAnalytics['balance'] {
    const teamAStrength = this.calculateTeamStrength(match.teamA.players, players);
    const teamBStrength = this.calculateTeamStrength(match.teamB.players, players);
    const strengthBalance = 100 - Math.abs(teamAStrength - teamBStrength);

    const teamASize = match.teamA.players.length;
    const teamBSize = match.teamB.players.length;
    const sizeBalance = Math.abs(teamASize - teamBSize) <= 1 ? 100 : 60;

    return {
      teamStrength: (teamAStrength + teamBStrength) / 2,
      experienceBalance: 80, // Simplified placeholder
      sizeBalance,
      recommendation: strengthBalance < 60 ? 'Đội hình không cân bằng' : 'Đội hình tương đối cân bằng'
    };
  }

  private calculateMatchFinancial(match: MatchInfo): MatchAnalytics['financial'] {
    const profitability = match.finances.netProfit > 0 ? 100 : 0;
    const costEfficiency = match.finances.totalExpenses > 0 ?
      (match.finances.totalRevenue / match.finances.totalExpenses) * 50 : 100;

    return {
      profitability,
      costEfficiency: Math.min(100, costEfficiency),
      revenueOptimization: 80, // Placeholder
      breakdownAnalysis: `Thu ${match.finances.totalRevenue.toLocaleString()}₫ - Chi ${match.finances.totalExpenses.toLocaleString()}₫`
    };
  }

  private calculatePlayerHighlights(match: MatchInfo): MatchAnalytics['playerHighlights'] {
    const allGoals = [...match.result.goalsA, ...match.result.goalsB];
    const topScorer = allGoals.length > 0 ? allGoals[0].playerName : 'Không có';

    return {
      topPerformer: topScorer,
      topScorer,
      mvp: topScorer,
      disciplinaryIssues: [
        ...match.result.yellowCardsA.map(card => `Thẻ vàng: ${card.playerName}`),
        ...match.result.yellowCardsB.map(card => `Thẻ vàng: ${card.playerName}`),
        ...match.result.redCardsA.map(card => `Thẻ đỏ: ${card.playerName}`),
        ...match.result.redCardsB.map(card => `Thẻ đỏ: ${card.playerName}`)
      ]
    };
  }

  private calculateTeamStrength(teamPlayers: PlayerInfo[], allPlayers: PlayerInfo[]): number {
    if (teamPlayers.length === 0) return 0;

    const totalStrength = teamPlayers.reduce((sum, teamPlayer) => {
      const player = allPlayers.find(p => p.id === teamPlayer.id);
      if (!player) return sum;

      const winRate = player.stats.winRate || 0;
      const experience = Math.min(player.stats.totalMatches, 50) * 2;
      const performance = (player.stats.averageGoalsPerMatch * 20) + (player.stats.averageAssistsPerMatch * 15);

      return sum + (winRate + experience + performance) / 3;
    }, 0);

    return totalStrength / teamPlayers.length;
  }
}
