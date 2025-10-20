import { Injectable } from '@angular/core';
import { POSITION_STRENGTH_BONUSES, BASE_STRENGTH } from '../players.constants';
import type { HeadToHeadStats } from './history-stats.service';

export interface AIAnalysisResult {
  teamComparison: {
    teamXanh: { strength: number; players: string[] };
    teamCam: { strength: number; players: string[] };
  };
  prediction: {
    winProbability: { xanh: number; cam: number };
    predictedScore: { xanh: number; cam: number };
  };
  keyFactors: { name: string; impact: number }[];
  historicalContext: {
    matchesAnalyzed: number;
    recentPerformance: { xanhWins: number; camWins: number; draws: number };
  };
  headToHead?: HeadToHeadStats;
}

export interface Player {
  id: number;
  firstName: string;
  lastName?: string;
  position: string;
  [key: string]: unknown;
}

export interface HistoryEntry {
  scoreA?: number;
  scoreB?: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AIAnalysisService {
  private analysisCache = new Map<string, { result: AIAnalysisResult; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Analyze two teams and predict match outcome
   */
  analyzeTeams(
    teamXanhPlayers: Player[],
    teamCamPlayers: Player[],
    history: HistoryEntry[] = [],
    headToHead?: HeadToHeadStats
  ): AIAnalysisResult {
    const cacheKey = this.generateCacheKey(teamXanhPlayers, teamCamPlayers);
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Calculate team strengths
    const xanhStrength = this.calculateTeamStrength(teamXanhPlayers);
    const camStrength = this.calculateTeamStrength(teamCamPlayers);

    // Get historical context
    const historicalContext = this.analyzeHistory(history);

    // Calculate win probabilities
    const winProbability = this.calculateWinProbabilities(
      xanhStrength,
      camStrength,
      historicalContext,
      headToHead
    );

    // Predict score
  const predictedScore = this.predictScore(xanhStrength, camStrength, headToHead);

    // Identify key factors
    const keyFactors = this.identifyKeyFactors(
      teamXanhPlayers,
      teamCamPlayers,
      xanhStrength,
      camStrength
    );

    const result: AIAnalysisResult = {
      teamComparison: {
        teamXanh: {
          strength: Math.round(xanhStrength),
          players: teamXanhPlayers.map(p => `${p.firstName} ${p.lastName || ''}`.trim())
        },
        teamCam: {
          strength: Math.round(camStrength),
          players: teamCamPlayers.map(p => `${p.firstName} ${p.lastName || ''}`.trim())
        }
      },
      prediction: {
        winProbability,
        predictedScore
      },
      keyFactors,
      historicalContext: {
        matchesAnalyzed: historicalContext.matchesAnalyzed,
        recentPerformance: historicalContext.stats
      },
      headToHead
    };

    this.cacheResult(cacheKey, result);
    return result;
  }

  /**
   * Calculate team strength based on player positions
   */
  private calculateTeamStrength(players: Player[]): number {
    if (players.length === 0) return BASE_STRENGTH.DEFAULT;

    let totalStrength = 0;

    for (const player of players) {
      let strength = BASE_STRENGTH.DEFAULT;

      // Add position-based bonuses
      if (player.position.includes('Tiền đạo')) {
        strength += POSITION_STRENGTH_BONUSES.STRIKER;
      } else if (player.position.includes('Tiền vệ')) {
        strength += POSITION_STRENGTH_BONUSES.MIDFIELDER;
      } else if (player.position.includes('Hậu vệ')) {
        strength += POSITION_STRENGTH_BONUSES.DEFENDER;
      }

      totalStrength += strength;
    }

    return totalStrength / players.length;
  }

  /**
   * Analyze match history for patterns
   */
  private analyzeHistory(history: HistoryEntry[]): {
    matchesAnalyzed: number;
    stats: { xanhWins: number; camWins: number; draws: number; totalMatches: number };
  } {
    const recentMatches = history.slice(-10);
    const xanhWins = recentMatches.filter(m => (m.scoreA || 0) > (m.scoreB || 0)).length;
    const camWins = recentMatches.filter(m => (m.scoreA || 0) < (m.scoreB || 0)).length;
    const draws = recentMatches.filter(m => (m.scoreA || 0) === (m.scoreB || 0)).length;

    return {
      matchesAnalyzed: recentMatches.length,
      stats: {
        xanhWins,
        camWins,
        draws,
        totalMatches: recentMatches.length
      }
    };
  }

  /**
   * Calculate win probabilities
   */
  private calculateWinProbabilities(
    xanhStrength: number,
    camStrength: number,
    historical: { stats: { xanhWins: number; camWins: number; totalMatches: number } },
    headToHead?: HeadToHeadStats
  ): { xanh: number; cam: number } {
    const strengthDiff = xanhStrength - camStrength;
    let xanhProb = 50 + strengthDiff;

    // Apply recent historical adjustment (10% weight)
    if (historical.stats.totalMatches > 0) {
      const historicalWinRate = (historical.stats.xanhWins / historical.stats.totalMatches) * 100;
      xanhProb = xanhProb * 0.9 + historicalWinRate * 0.1;
    }

    // Head-to-head deeper history adjustment if available
    if (headToHead && headToHead.totalMeetings > 0) {
      const hWinRate = (headToHead.xanhWins / headToHead.totalMeetings) * 100;
      // Stability gives confidence in weighting historical performance
      const stabilityWeight = Math.min(0.35, 0.15 + headToHead.playerStabilityIndex * 0.2); // up to 35%
      xanhProb = xanhProb * (1 - stabilityWeight) + hWinRate * stabilityWeight;
    }

    // Clamp between 15-85% (slightly wider due to stronger historical signal)
    xanhProb = Math.max(15, Math.min(85, xanhProb));

    return {
      xanh: Math.round(xanhProb),
      cam: Math.round(100 - xanhProb)
    };
  }

  /**
   * Predict match score
   */
  private predictScore(xanhStrength: number, camStrength: number, headToHead?: HeadToHeadStats): { xanh: number; cam: number } {
    // Base expected goals from current strength
    let baseX = xanhStrength / 30;
    let baseC = camStrength / 30;

    // Blend historical average goals if available (30% weight)
    if (headToHead && headToHead.totalMeetings > 0) {
      baseX = baseX * 0.7 + headToHead.averageGoalsXanh * 0.3;
      baseC = baseC * 0.7 + headToHead.averageGoalsCam * 0.3;
    }

    // Random variance scaled modestly
    const xanhGoals = Math.max(0, Math.round(baseX + Math.random() * 1.8));
    const camGoals = Math.max(0, Math.round(baseC + Math.random() * 1.8));

    return { xanh: xanhGoals, cam: camGoals };
  }

  /**
   * Identify key factors affecting the match
   */
  private identifyKeyFactors(
    teamXanh: Player[],
    teamCam: Player[],
    xanhStrength: number,
    camStrength: number
  ): { name: string; impact: number }[] {
    const factors: { name: string; impact: number }[] = [];

    // Team size factor
    const sizeDiff = Math.abs(teamXanh.length - teamCam.length);
    if (sizeDiff > 0) {
      factors.push({
        name: 'Chênh lệch số lượng cầu thủ',
        impact: sizeDiff * 5
      });
    }

    // Strength difference factor
    const strengthDiff = Math.abs(xanhStrength - camStrength);
    if (strengthDiff > 5) {
      factors.push({
        name: 'Chênh lệch sức mạnh đội hình',
        impact: Math.round(strengthDiff)
      });
    }

    // Position balance
    const xanhStrikers = teamXanh.filter(p => p.position.includes('Tiền đạo')).length;
    const camStrikers = teamCam.filter(p => p.position.includes('Tiền đạo')).length;
    const strikerDiff = Math.abs(xanhStrikers - camStrikers);
    
    if (strikerDiff > 0) {
      factors.push({
        name: 'Chênh lệch số tiền đạo',
        impact: strikerDiff * 8
      });
    }

    return factors.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Generate cache key from team composition
   */
  private generateCacheKey(teamA: Player[], teamB: Player[]): string {
    const idsA = teamA.map(p => p.id).sort().join(',');
    const idsB = teamB.map(p => p.id).sort().join(',');
    return `${idsA}|${idsB}`;
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(key: string): AIAnalysisResult | null {
    const cached = this.analysisCache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.analysisCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache analysis result
   */
  private cacheResult(key: string, result: AIAnalysisResult): void {
    this.analysisCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}
