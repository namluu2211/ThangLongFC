
// Player type definition
export interface Player {
  id: number;
  firstName: string;
  lastName?: string;
  position: string;
  avatar?: string;
  videoUrl?: string;  // Short video URL (e.g., YouTube Shorts, TikTok, Instagram Reels)
  DOB?: number | string;  // Can be age number or date string
  height?: number;
  weight?: number;
  note?: string;
  scorer?: string;
  assist?: string;
  [key: string]: unknown; // Added to satisfy consumers expecting index signature
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
  console.log('🔄 dividePlayersByPosition called with', players.length, 'players');
  
  // Group players by position
  const grouped: Record<string, Player[]> = {};
  for (const p of players) {
    const position = p.position || 'Chưa xác định';
    console.log(`📝 Player: ${p.firstName} ${p.lastName || ''} - Position: "${position}"`);
    if (!grouped[position]) grouped[position] = [];
    grouped[position].push(p);
  }

  console.log('📊 Position groups:', Object.keys(grouped).map(pos => `${pos}: ${grouped[pos].length} players`));

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

  console.log('🎯 Division results:');
  console.log('  Team A:', teamA.map(p => `${p.firstName} (${p.position})`));
  console.log('  Team B:', teamB.map(p => `${p.firstName} (${p.position})`));

  return { teamA, teamB };
}
