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
    scoreDistribution?: { scoreline: string; probability: number }[]; // Top likely scorelines (joint distribution)
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
   * Enhanced AI Analysis Engine
   * 
   * Analyzes two teams and predicts match outcome using:
   * 1. Current lineup strength (40% weight) - Based on player positions and roster size
   * 2. Recent form (15% weight) - Last 10 matches performance
   * 3. Head-to-head history (15-45% weight) - Dynamic based on:
   *    - Sample size confidence (number of previous meetings)
   *    - Player roster stability (continuity of players)
   * 4. Recent momentum (±5% adjustment) - Last 5 games trend
   * 5. Goal differential patterns (±3% adjustment) - Historical scoring dominance
   * 
   * This provides more accurate predictions by weighing historical data based on
   * its reliability (sample size) and relevance (roster continuity).
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

    // Base average strengths
    let xanhStrength = this.calculateTeamStrength(teamXanhPlayers);
    let camStrength = this.calculateTeamStrength(teamCamPlayers);

    // Roster size weighting: each extra player gives ~2.5% strength boost (capped)
    const sizeDiff = teamXanhPlayers.length - teamCamPlayers.length;
    if (sizeDiff !== 0) {
      const adjFactor = (diff: number) => 1 + Math.max(-0.25, Math.min(0.25, diff * 0.025));
      xanhStrength = +(xanhStrength * adjFactor(sizeDiff)).toFixed(3);
      camStrength = +(camStrength * adjFactor(-sizeDiff)).toFixed(3);
    }

    // Get historical context
    const historicalContext = this.analyzeHistory(history);

    // Calculate win probabilities
    const winProbability = this.calculateWinProbabilities(
      xanhStrength,
      camStrength,
      historicalContext,
      headToHead
    );

    // Build distribution & select mode scoreline as predicted score
    const scoreDistribution = this.buildScoreDistribution(xanhStrength, camStrength, headToHead);
    const predictedScore = (() => {
      if (scoreDistribution.length) {
        const top = scoreDistribution[0].scoreline.split('-').map(n=> parseInt(n,10)||0);
        return { xanh: top[0], cam: top[1] };
      }
      // Fallback to mean-based rounding if distribution empty (should not happen)
      return { xanh: Math.round(xanhStrength/30), cam: Math.round(camStrength/30) };
    })();

    // Identify key factors
    const keyFactors = this.identifyKeyFactors(
      teamXanhPlayers,
      teamCamPlayers,
      xanhStrength,
      camStrength,
      historicalContext,
      headToHead
    );

  // scoreDistribution already computed above

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
        predictedScore,
        scoreDistribution
      },
  keyFactors: this.appendSizeFactor(keyFactors, sizeDiff),
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
   * Construct a joint score distribution using Poisson approximation of expected goals.
   * We reuse internal expected goals logic from predictScore (before variance & rounding) to derive means.
   */
  private buildScoreDistribution(xanhStrength:number, camStrength:number, headToHead?: HeadToHeadStats){
    // Recompute base expected goals similarly to predictScore but without random variance / rounding
    let lambdaX = xanhStrength / 30;
    let lambdaC = camStrength / 30;
    if(headToHead && headToHead.totalMeetings>0){
      lambdaX = lambdaX * 0.5 + headToHead.averageGoalsXanh * 0.5;
      lambdaC = lambdaC * 0.5 + headToHead.averageGoalsCam * 0.5;
      const avgTotal = headToHead.averageGoalsXanh + headToHead.averageGoalsCam;
      if(avgTotal >= 8){
        const amplification = 1 + Math.min(0.6, (avgTotal - 8) * 0.08);
        lambdaX *= amplification; lambdaC *= amplification;
      }
    }
    // Cap lambdas to avoid runaway loops
    lambdaX = Math.min(lambdaX, 12);
    lambdaC = Math.min(lambdaC, 12);
    // Poisson PMF function
    const poisson = (lam:number,k:number)=> Math.exp(-lam) * Math.pow(lam,k) / factorial(k);
    const factorialCache: number[] = [1];
    function factorial(n:number): number {
      if(factorialCache[n] !== undefined) return factorialCache[n]!;
      const last = factorialCache.length-1;
      let acc = factorialCache[last]!;
      for(let i=last+1;i<=n;i++){ acc*=i; factorialCache[i]=acc; }
      return factorialCache[n]!;
    }
    // Determine max goals to consider where tail probability < 0.002 each side or upper bound 15
    const cutoff = (lam:number)=> Math.min(15, Math.max(5, Math.ceil(lam + 4*Math.sqrt(lam||1))));
    const maxX = cutoff(lambdaX); const maxC = cutoff(lambdaC);
    const dist: { scoreline:string; probability:number }[] = [];
    let totalP=0;
    for(let x=0;x<=maxX;x++){
      const px = poisson(lambdaX,x);
      for(let c=0;c<=maxC;c++){
        const pc = poisson(lambdaC,c);
        const p = px*pc;
        totalP += p;
        dist.push({ scoreline: `${x}-${c}`, probability:p });
      }
    }
    // Normalize (due to truncation of tails)
    if(totalP>0){ for(const d of dist){ d.probability = +(d.probability/totalP); } }
    // Sort by probability desc & take top 8
    return dist.sort((a,b)=> b.probability - a.probability).slice(0,8).map(d=> ({...d, probability:+d.probability.toFixed(4)}));
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
   * Calculate win probabilities with enhanced historical weighting
   * Now incorporates: strength differential, recent form, head-to-head history, and player continuity
   */
  private calculateWinProbabilities(
    xanhStrength: number,
    camStrength: number,
    historical: { stats: { xanhWins: number; camWins: number; totalMatches: number } },
    headToHead?: HeadToHeadStats
  ): { xanh: number; cam: number } {
    // Base probability from strength differential (40% weight)
    const strengthDiff = xanhStrength - camStrength;
    let xanhProb = 50 + strengthDiff * 0.8; // Reduced from 1.0 to allow more room for historical data

    // Apply recent historical adjustment (15% weight - increased from 10%)
    if (historical.stats.totalMatches > 0) {
      const historicalWinRate = (historical.stats.xanhWins / historical.stats.totalMatches) * 100;
      xanhProb = xanhProb * 0.85 + historicalWinRate * 0.15;
    }

    // Head-to-head deeper history adjustment with enhanced weighting (up to 45%)
    if (headToHead && headToHead.totalMeetings > 0) {
      const hWinRate = (headToHead.xanhWins / headToHead.totalMeetings) * 100;
      
      // Calculate confidence based on sample size and player stability
      const sampleConfidence = Math.min(1, headToHead.totalMeetings / 10); // Max confidence at 10+ meetings
      const stabilityConfidence = headToHead.playerStabilityIndex; // 0-1 based on roster continuity
      
      // Combined confidence: both sample size and roster stability matter
      const historicalConfidence = (sampleConfidence * 0.6 + stabilityConfidence * 0.4);
      
      // Dynamic weight: 15% base + up to 30% more based on confidence
      const historicalWeight = 0.15 + (historicalConfidence * 0.30); // 15-45% range
      
      xanhProb = xanhProb * (1 - historicalWeight) + hWinRate * historicalWeight;
      
      // Recent form momentum adjustment (±5% based on last 5 games)
      if (headToHead.recentForm.lastN >= 3) {
        const recentGames = headToHead.recentForm.sequence.slice(-5);
        const recentXanhWins = recentGames.filter(r => r === 'X').length;
        const momentumScore = (recentXanhWins / recentGames.length) * 100;
        const momentumAdjustment = (momentumScore - 50) * 0.1; // ±5% max
        xanhProb += momentumAdjustment;
      }
      
      // Goal differential pattern adjustment (±3% based on average margin)
      if (headToHead.averageMargin > 2) {
        // Large margins indicate dominant patterns
        const dominanceFactor = Math.min(1, (headToHead.averageMargin - 2) / 3);
        const xanhDominant = headToHead.averageGoalsXanh > headToHead.averageGoalsCam;
        const dominanceAdjustment = dominanceFactor * 3 * (xanhDominant ? 1 : -1);
        xanhProb += dominanceAdjustment;
      }
    }

    // Clamp between 10-90% (wider range than before for more dramatic predictions)
    xanhProb = Math.max(10, Math.min(90, xanhProb));

    return {
      xanh: Math.round(xanhProb),
      cam: Math.round(100 - xanhProb)
    };
  }

  /**
   * Predict match score
   */
  private predictScore(xanhStrength: number, camStrength: number, headToHead?: HeadToHeadStats): { xanh: number; cam: number } {
    // --- Enhanced high-scoring adaptive model ---
    // 1. Derive baseline from team strength (scaled)
    let expectedX = xanhStrength / 30; // typical range ~1.5–3
    let expectedC = camStrength / 30;

    // 2. If sufficient head-to-head data, blend in historical scoring with higher weight (50%)
    if (headToHead && headToHead.totalMeetings > 0) {
      expectedX = expectedX * 0.5 + headToHead.averageGoalsXanh * 0.5;
      expectedC = expectedC * 0.5 + headToHead.averageGoalsCam * 0.5;

      // 3. Detect sustained high-scoring pattern (average total goals high)
      const avgTotal = headToHead.averageGoalsXanh + headToHead.averageGoalsCam; // per match
      if (avgTotal >= 8) {
        // Scale factor increases with extremity but capped for sanity
        const amplification = 1 + Math.min(0.6, (avgTotal - 8) * 0.08); // up to +60%
        expectedX *= amplification;
        expectedC *= amplification;
      }
    }

    // 4. Apply modest variance (reduced to keep tests stable & avoid collapsing to low values)
    const varianceScale = 0.6; // was 1.8 in legacy model
    expectedX += Math.random() * varianceScale * 0.7; // slight asym randomness
    expectedC += Math.random() * varianceScale;

    // 5. Floor at 0, round to nearest whole number
    const xanhGoals = Math.max(0, Math.round(expectedX));
    const camGoals = Math.max(0, Math.round(expectedC));

    // 6. Ensure at least one side reflects high-scoring signal if historical total extremely large
    if (headToHead && headToHead.totalMeetings > 0) {
      const extremeTotal = headToHead.averageGoalsXanh + headToHead.averageGoalsCam;
      if (extremeTotal >= 10 && (xanhGoals + camGoals) < 8) {
        // Bump weaker side minimally to raise total realism
        if (xanhGoals <= camGoals) {
          return { xanh: xanhGoals + 1, cam: camGoals + 1 };
        } else {
          return { xanh: xanhGoals + 1, cam: camGoals + 1 };
        }
      }
    }

    return { xanh: xanhGoals, cam: camGoals };
  }

  private appendSizeFactor(factors:{name:string;impact:number}[], sizeDiff:number){
    if (sizeDiff === 0) return factors;
    return [
      { name:'Chênh lệch quân số', impact: Math.min(25, Math.abs(sizeDiff)*5) * (sizeDiff>0? 1:-1) },
      ...factors
    ];
  }

  /**
   * Identify key factors affecting the match
   * Enhanced to include historical patterns and trends
   */
  private identifyKeyFactors(
    teamXanh: Player[],
    teamCam: Player[],
    xanhStrength: number,
    camStrength: number,
    historicalContext: { matchesAnalyzed: number; stats: { xanhWins: number; camWins: number; draws: number; totalMatches: number } },
    headToHead?: HeadToHeadStats
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

    // Historical winning streak (if significant)
    if (historicalContext.matchesAnalyzed >= 5) {
      const xanhWinRate = (historicalContext.stats.xanhWins / historicalContext.stats.totalMatches) * 100;
      if (xanhWinRate >= 70 || xanhWinRate <= 30) {
        factors.push({
          name: xanhWinRate >= 70 ? 'Phong độ cao Đội Xanh gần đây' : 'Phong độ cao Đội Cam gần đây',
          impact: Math.abs(xanhWinRate - 50) * 0.4 // Convert to impact score
        });
      }
    }

    // Head-to-head historical dominance
    if (headToHead && headToHead.totalMeetings >= 5) {
      const xanhH2HRate = (headToHead.xanhWins / headToHead.totalMeetings) * 100;
      if (xanhH2HRate >= 65 || xanhH2HRate <= 35) {
        const dominantTeam = xanhH2HRate >= 65 ? 'Xanh' : 'Cam';
        factors.push({
          name: `Lịch sử thống trị (Đội ${dominantTeam})`,
          impact: Math.abs(xanhH2HRate - 50) * 0.6
        });
      }
    }

    // Player stability/continuity factor
    if (headToHead && headToHead.playerStabilityIndex >= 0.6) {
      factors.push({
        name: 'Đội hình ổn định (lợi thế kinh nghiệm)',
        impact: headToHead.playerStabilityIndex * 15
      });
    } else if (headToHead && headToHead.playerStabilityIndex < 0.3) {
      factors.push({
        name: 'Đội hình mới (khó dự đoán)',
        impact: (1 - headToHead.playerStabilityIndex) * 10
      });
    }

    // Recent form momentum
    if (headToHead && headToHead.recentForm.lastN >= 3) {
      const recent5 = headToHead.recentForm.sequence.slice(-5);
      const xanhRecent = recent5.filter(r => r === 'X').length;
      const camRecent = recent5.filter(r => r === 'C').length;
      
      if (xanhRecent >= 4) {
        factors.push({
          name: 'Chuỗi thắng gần đây (Xanh)',
          impact: xanhRecent * 4
        });
      } else if (camRecent >= 4) {
        factors.push({
          name: 'Chuỗi thắng gần đây (Cam)',
          impact: camRecent * 4
        });
      }
    }

    // High-scoring pattern indicator
    if (headToHead && headToHead.totalMeetings >= 3) {
      const avgTotalGoals = headToHead.averageGoalsXanh + headToHead.averageGoalsCam;
      if (avgTotalGoals >= 8) {
        factors.push({
          name: 'Xu hướng tỷ số cao',
          impact: Math.min(25, (avgTotalGoals - 8) * 3)
        });
      } else if (avgTotalGoals <= 2) {
        factors.push({
          name: 'Xu hướng phòng ngự chặt',
          impact: (2 - avgTotalGoals) * 5
        });
      }
    }

    return factors.sort((a, b) => b.impact - a.impact).slice(0, 6); // Increased from 5 to 6 factors
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
