
// Player type definition
export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  avatar?: string;
  age?: number;
  height?: number;
  weight?: number;
  scorer?: string;
  assist?: string;
}

// Team division result
export interface TeamDivision {
  teamA: Player[];
  teamB: Player[];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Divide players into two teams by position equivalence
 * @param players Array of Player objects
 * @returns Object with teamA and teamB arrays
 */
export function dividePlayersByPosition(players: Player[]): TeamDivision {
  // Group players by position
  const grouped: Record<string, Player[]> = {};
  for (const p of players) {
    if (!grouped[p.position]) grouped[p.position] = [];
    grouped[p.position].push(p);
  }

  const teamA: Player[] = [];
  const teamB: Player[] = [];

  // Shuffle and alternate assignment for each position group
  Object.values(grouped).forEach(group => {
    const shuffled = shuffle(group);
    shuffled.forEach((player, idx) => {
      if (idx % 2 === 0) {
        teamA.push(player);
      } else {
        teamB.push(player);
      }
    });
  });

  return { teamA, teamB };
}
