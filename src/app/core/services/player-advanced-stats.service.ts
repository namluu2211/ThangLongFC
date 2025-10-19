import { Injectable } from '@angular/core';
import { PlayerInfo } from '../models/player.model';
import { MatchInfo } from '../models/match.model';
import { PlayerStatistics } from './statistics.service';

/**
 * PlayerAdvancedStatsService
 * Extracted logic for computing player performance, financial metrics, trends and rankings.
 * Stateless: all methods pure given inputs; facilitates easier testing & future optimization.
 */
@Injectable({ providedIn: 'root' })
export class PlayerAdvancedStatsService {
  buildPlayerStatistics(players: PlayerInfo[], matches: MatchInfo[]): PlayerStatistics[] {
    return players.map(p => {
      const pMatches = this.getPlayerMatches(p.id!, matches);
      return {
        playerId: p.id!,
        playerName: `${p.firstName} ${p.lastName || ''}`.trim(),
        performance: this.calculatePlayerPerformance(p, pMatches),
        financial: this.calculatePlayerFinancial(p, pMatches),
        trends: this.calculatePlayerTrends(p, pMatches),
        rankings: this.calculatePlayerRankings(p.id!, players, matches)
      };
    });
  }

  // --- Internal helpers replicated from original StatisticsService ---
  private getPlayerMatches(playerId: string, matches: MatchInfo[]): MatchInfo[] {
    return matches.filter(m => m.teamA.players.some(pl => pl.id === playerId) || m.teamB.players.some(pl => pl.id === playerId));
  }

  private calculatePlayerPerformance(player: PlayerInfo, matches: MatchInfo[]): PlayerStatistics['performance'] {
    let wins=0, losses=0, draws=0, goals=0, assists=0, yellow=0, red=0;
    matches.forEach(match => {
      const isA = match.teamA.players.some(pl => pl.id === player.id);
      const isB = !isA && match.teamB.players.some(pl => pl.id === player.id);
      if(!isA && !isB) return;
      const teamScore = isA ? match.result.scoreA : match.result.scoreB;
      const oppScore = isA ? match.result.scoreB : match.result.scoreA;
      if(teamScore>oppScore) wins++; else if(teamScore<oppScore) losses++; else draws++;
      if(isA){
        goals += match.result.goalsA.filter(g=>g.playerId===player.id).length;
        assists += match.result.goalsA.filter(g=>g.assistedBy===player.id).length;
        yellow += match.result.yellowCardsA.filter(c=>c.playerId===player.id).length;
        red += match.result.redCardsA.filter(c=>c.playerId===player.id).length;
      } else {
        goals += match.result.goalsB.filter(g=>g.playerId===player.id).length;
        assists += match.result.goalsB.filter(g=>g.assistedBy===player.id).length;
        yellow += match.result.yellowCardsB.filter(c=>c.playerId===player.id).length;
        red += match.result.redCardsB.filter(c=>c.playerId===player.id).length;
      }
    });
    const total = matches.length;
    return {
      totalMatches: total,
      wins, losses, draws,
      winRate: total>0 ? (wins/total)*100 : 0,
      goalsScored: goals,
      assists,
      yellowCards: yellow,
      redCards: red,
      averageGoalsPerMatch: total>0 ? goals/total : 0,
      averageAssistsPerMatch: total>0 ? assists/total : 0
    };
  }

  private calculatePlayerFinancial(player: PlayerInfo, matches: MatchInfo[]): PlayerStatistics['financial'] {
    let revenue=0, penalties=0;
    matches.forEach(match => {
      const isA = match.teamA.players.some(pl => pl.id === player.id);
      const isB = !isA && match.teamB.players.some(pl => pl.id === player.id);
      if(!isA && !isB) return;
      const totalPlayers = match.teamA.players.length + match.teamB.players.length;
      revenue += match.finances.totalRevenue / totalPlayers;
      const yellowCardFee=50000, redCardFee=100000;
      if(isA){
        penalties += match.result.yellowCardsA.filter(c=>c.playerId===player.id).length * yellowCardFee;
        penalties += match.result.redCardsA.filter(c=>c.playerId===player.id).length * redCardFee;
      } else {
        penalties += match.result.yellowCardsB.filter(c=>c.playerId===player.id).length * yellowCardFee;
        penalties += match.result.redCardsB.filter(c=>c.playerId===player.id).length * redCardFee;
      }
    });
    return {
      totalRevenue: revenue,
      averageRevenuePerMatch: matches.length>0 ? revenue/matches.length : 0,
      penaltiesPaid: penalties,
      netContribution: revenue-penalties
    };
  }

  private calculatePlayerTrends(player: PlayerInfo, matches: MatchInfo[]): PlayerStatistics['trends'] {
    const recent = matches.slice(-5);
    const last10 = matches.slice(-10);
    const recentForm = recent.map(m => {
      const isA = m.teamA.players.some(pl => pl.id===player.id);
      const teamScore = isA? m.result.scoreA : m.result.scoreB;
      const oppScore = isA? m.result.scoreB : m.result.scoreA;
      return teamScore>oppScore? 'W' : teamScore<oppScore? 'L' : 'D';
    });
    const goalsLastFive = recent.reduce((tot,m)=>{
      const isA = m.teamA.players.some(pl => pl.id===player.id);
      return tot + (isA? m.result.goalsA.filter(g=>g.playerId===player.id).length : m.result.goalsB.filter(g=>g.playerId===player.id).length);
    },0);
    const winsLast10 = last10.filter(m => {
      const isA = m.teamA.players.some(pl => pl.id===player.id);
      const teamScore = isA? m.result.scoreA : m.result.scoreB;
      const oppScore = isA? m.result.scoreB : m.result.scoreA;
      return teamScore>oppScore;
    }).length;
    const winRateLast10 = last10.length>0 ? (winsLast10/last10.length)*100 : 0;
    const firstHalfWinRate = matches.length>4 ? (matches.slice(0, Math.floor(matches.length/2)).filter(m => {
      const isA = m.teamA.players.some(pl => pl.id===player.id);
      const teamScore = isA? m.result.scoreA : m.result.scoreB;
      const oppScore = isA? m.result.scoreB : m.result.scoreA;
      return teamScore>oppScore;
    }).length / Math.floor(matches.length/2))*100 : 0;
    const secondHalfWinRate = matches.length>4 ? (matches.slice(Math.floor(matches.length/2)).filter(m => {
      const isA = m.teamA.players.some(pl => pl.id===player.id);
      const teamScore = isA? m.result.scoreA : m.result.scoreB;
      const oppScore = isA? m.result.scoreB : m.result.scoreA;
      return teamScore>oppScore;
    }).length / Math.ceil(matches.length/2))*100 : 0;
    const performanceTrend = secondHalfWinRate > firstHalfWinRate + 10 ? 'improving' : secondHalfWinRate < firstHalfWinRate - 10 ? 'declining' : 'stable';
    return { recentForm, goalsLastFiveMatches: goalsLastFive, winRateLast10Matches: winRateLast10, performanceTrend };
  }

  private calculatePlayerRankings(playerId: string, players: PlayerInfo[], matches: MatchInfo[]): PlayerStatistics['rankings'] {
    const allStats = players.map(pl => {
      const pm = this.getPlayerMatches(pl.id!, matches);
      const perf = this.calculatePlayerPerformance(pl, pm);
      const fin = this.calculatePlayerFinancial(pl, pm);
      return { playerId: pl.id!, ...perf, ...fin };
    });
    const goalsSorted = [...allStats].sort((a,b)=> b.goalsScored - a.goalsScored);
    const assistsSorted = [...allStats].sort((a,b)=> b.assists - a.assists);
    const winRateSorted = [...allStats].sort((a,b)=> b.winRate - a.winRate);
    const revenueSorted = [...allStats].sort((a,b)=> b.totalRevenue - a.totalRevenue);
    return {
      goalsRank: goalsSorted.findIndex(p=>p.playerId===playerId)+1,
      assistsRank: assistsSorted.findIndex(p=>p.playerId===playerId)+1,
      winRateRank: winRateSorted.findIndex(p=>p.playerId===playerId)+1,
      revenueRank: revenueSorted.findIndex(p=>p.playerId===playerId)+1,
      overallRank: Math.round((
        goalsSorted.findIndex(p=>p.playerId===playerId)+
        assistsSorted.findIndex(p=>p.playerId===playerId)+
        winRateSorted.findIndex(p=>p.playerId===playerId)+
        revenueSorted.findIndex(p=>p.playerId===playerId)
      )/4)+1
    };
  }
}
