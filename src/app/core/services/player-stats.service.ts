import { Injectable } from '@angular/core';
import { MatchInfo } from '../models/match.model';
import { PlayerInfo } from '../models/player.model';

export interface PlayerAggregateStats {
  playerId: string;
  fullName: string;
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  winRate: number; // percentage 0-100
}

// Internal mutable working shape extends public stats with win counter
interface WorkingPlayerAggregateStats extends PlayerAggregateStats { wins: number; }

@Injectable({ providedIn: 'root' })
export class PlayerStatsService {
  /**
   * Aggregate basic stats from a list of completed matches.
   * Phase 1 skeleton: minimal calculations only.
   */
  aggregateFromMatches(matches: MatchInfo[]): PlayerAggregateStats[] {
  const map = new Map<string, WorkingPlayerAggregateStats>();

    for (const match of matches) {
      const teamA = match.teamA.players || [];
      const teamB = match.teamB.players || [];
      const allPlayers: PlayerInfo[] = [...teamA, ...teamB];

      for (const p of allPlayers) {
        if (!map.has(p.id)) {
          map.set(p.id, {
            playerId: p.id,
            fullName: p.fullName || `${p.firstName} ${p.lastName || ''}`.trim(),
            matches: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            winRate: 0,
            wins: 0
          });
        }
        const agg = map.get(p.id)!;
        agg.matches += 1;

        // Goals & assists
        agg.goals += match.result.goalsA.filter(g => g.playerId === p.id).length;
        agg.goals += match.result.goalsB.filter(g => g.playerId === p.id).length;
        agg.assists += match.result.goalsA.filter(g => g.assistedBy === p.id).length;
        agg.assists += match.result.goalsB.filter(g => g.assistedBy === p.id).length;

        // Cards
        agg.yellowCards += match.result.yellowCardsA.filter(c => c.playerId === p.id).length;
        agg.yellowCards += match.result.yellowCardsB.filter(c => c.playerId === p.id).length;
        agg.redCards += match.result.redCardsA.filter(c => c.playerId === p.id).length;
        agg.redCards += match.result.redCardsB.filter(c => c.playerId === p.id).length;

        // Simple win rate approximation: count wins when player's team matches winner
        const playerOnTeamA = teamA.some(tp => tp.id === p.id);
        const playerOnTeamB = teamB.some(tp => tp.id === p.id);
        const didWin = (match.result.winner === 'A' && playerOnTeamA) || (match.result.winner === 'B' && playerOnTeamB);
        agg.wins += didWin ? 1 : 0;
      }
    }

    // Finalize winRate
    const finalized: PlayerAggregateStats[] = [];
    for (const agg of map.values()) {
      agg.winRate = agg.matches ? Math.round((agg.wins / agg.matches) * 100) : 0;
  const { wins: _ignored, ...publicShape } = agg; void _ignored; // strip internal field
  finalized.push(publicShape);
    }

    return finalized;
  }
}
