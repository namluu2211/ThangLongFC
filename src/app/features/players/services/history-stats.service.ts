import { Injectable } from '@angular/core';
import { MatchInfo, TeamColor } from '../../../core/models/match.model';

export interface HeadToHeadStats {
  totalMeetings: number;
  xanhWins: number;
  camWins: number;
  draws: number;
  averageGoalsXanh: number;
  averageGoalsCam: number;
  averageMargin: number;
  recentForm: { lastN: number; sequence: ('X'|'C'|'D')[] };
  playerStabilityIndex: number; // 0..1
}

@Injectable({ providedIn: 'root' })
export class HistoryStatsService {
  /**
   * Build head-to-head stats between Đội Xanh and Đội Cam given historical matches.
   * Assumes matches with teamColor BLUE vs ORANGE. Filters completed matches only.
   */
  buildHeadToHead(matches: MatchInfo[], currentBlueIds: string[], currentOrangeIds: string[], maxConsider = 25): HeadToHeadStats {
    const relevant: MatchInfo[] = matches
      .filter(m => m.teamA?.teamColor === TeamColor.BLUE && m.teamB?.teamColor === TeamColor.ORANGE && m.result)
      .slice(-maxConsider);
    const total = relevant.length;
    let xanhWins = 0, camWins = 0, draws = 0; let goalsX = 0, goalsC = 0; let marginTotal = 0;
    const seq: ('X'|'C'|'D')[] = [];
    for(const m of relevant){
      const a = m.result.scoreA || 0; const b = m.result.scoreB || 0;
      goalsX += a; goalsC += b; marginTotal += Math.abs(a-b);
      if(a>b){ xanhWins++; seq.push('X'); } else if(b>a){ camWins++; seq.push('C'); } else { draws++; seq.push('D'); }
    }
    const avgGoalsX = total? goalsX/total: 0;
    const avgGoalsC = total? goalsC/total: 0;
    const avgMargin = total? marginTotal/total: 0;
    // Player stability: intersection size of current roster vs historical averaged.
    let stabilityAccum = 0;
    if(total){
      for(const m of relevant){
        const histBlueIds = (m.teamA.players||[]).map(p=>p.id);
        const histOrangeIds = (m.teamB.players||[]).map(p=>p.id);
        const interBlue = intersectCount(currentBlueIds, histBlueIds);
        const interOrange = intersectCount(currentOrangeIds, histOrangeIds);
        const denom = (currentBlueIds.length || 1) + (currentOrangeIds.length || 1);
        stabilityAccum += (interBlue + interOrange) / denom;
      }
    }
    const stabilityIndex = total? +(stabilityAccum/total).toFixed(3): 0;
    return {
      totalMeetings: total,
      xanhWins,
      camWins,
      draws,
      averageGoalsXanh: +avgGoalsX.toFixed(2),
      averageGoalsCam: +avgGoalsC.toFixed(2),
      averageMargin: +avgMargin.toFixed(2),
      recentForm: { lastN: seq.length, sequence: seq },
      playerStabilityIndex: stabilityIndex
    };
  }
}

function intersectCount(a: string[], b: string[]): number {
  if(!a.length || !b.length) return 0;
  const setB = new Set(b);
  let c = 0; for(const id of a){ if(setB.has(id)) c++; }
  return c;
}
