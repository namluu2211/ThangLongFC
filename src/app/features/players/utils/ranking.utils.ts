import { PlayerInfo } from '../../../core/models/player.model';
import { MatchInfo } from '../../../core/models/match.model';

export interface PlayerStats { name:string; goals:number; assists:number; yellowCards:number; redCards:number; matches:number; }

// Build stats map from matches
export function buildPlayerStats(matches: MatchInfo[]): Map<string, PlayerStats> {
  const statsMap = new Map<string, PlayerStats>();
  if (!Array.isArray(matches)) return statsMap;

  const normalizePlayer = (p: PlayerInfo) => `${p.firstName} ${(p.lastName || '').trim()}`.trim();

  for (const match of matches) {
    const addMatch = (playerName: string) => {
      const name = playerName.trim();
      if (!name) return;
      const existing = statsMap.get(name) || { name, goals: 0, assists: 0, yellowCards: 0, redCards: 0, matches: 0 };
      existing.matches += 1;
      statsMap.set(name, existing);
    };

    match.teamA.players.forEach(p => addMatch(normalizePlayer(p)));
    match.teamB.players.forEach(p => addMatch(normalizePlayer(p)));

    const processGoals = (goals: typeof match.result.goalsA) => {
      goals.forEach(g => {
        const scorer = (g.playerName || '').trim();
        if (scorer) {
          const st = statsMap.get(scorer) || { name: scorer, goals: 0, assists: 0, yellowCards: 0, redCards: 0, matches: 0 };
          st.goals += 1;
          statsMap.set(scorer, st);
        }
        const assistName = (g.assistedBy || '').trim();
        if (assistName) {
          const st = statsMap.get(assistName) || { name: assistName, goals: 0, assists: 0, yellowCards: 0, redCards: 0, matches: 0 };
          st.assists += 1;
          statsMap.set(assistName, st);
        }
      });
    };

    processGoals(match.result.goalsA);
    processGoals(match.result.goalsB);

    const processCards = (cards: typeof match.result.yellowCardsA, type: 'yellow' | 'red') => {
      cards.forEach(c => {
        const name = (c.playerName || '').trim();
        if (!name) return;
        const st = statsMap.get(name) || { name, goals: 0, assists: 0, yellowCards: 0, redCards: 0, matches: 0 };
        if (type === 'yellow') st.yellowCards += 1; else st.redCards += 1;
        statsMap.set(name, st);
      });
    };

    processCards(match.result.yellowCardsA, 'yellow');
    processCards(match.result.yellowCardsB, 'yellow');
    processCards(match.result.redCardsA, 'red');
    processCards(match.result.redCardsB, 'red');
  }

  return statsMap;
}

export function calculatePlayerScore(p: PlayerStats): number {
  return (p.goals * 3) + (p.assists * 2) - (p.yellowCards * 0.5) - (p.redCards * 2);
}
