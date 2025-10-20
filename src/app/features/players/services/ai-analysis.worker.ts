// AI Analysis Web Worker
// Message protocol:
// Incoming: { type:'ANALYZE_TEAMS', teamA: PlayerLite[], teamB: PlayerLite[], headToHead?: HeadToHeadStats }
// Outgoing: { type:'ANALYSIS_RESULT', result: AIWorkerResult }

interface PlayerLite { id: number|string; firstName: string; lastName?: string }
interface Prediction { predictedScore:{ xanh:number; cam:number }; winProbability:{ xanh:number; cam:number } }
interface Historical { recentPerformance:{ xanhWins:number; camWins:number; draws:number }; matchesAnalyzed:number }
interface HeadToHeadStats { xanhWins:number; camWins:number; draws:number; totalMeetings:number; averageGoalsXanh:number; averageGoalsCam:number; averageMargin:number; recentForm:string[]; playerStabilityIndex:number }
interface AIWorkerResult { prediction: Prediction; keyFactors:{ name:string; impact:number }[]; historicalContext: Historical; headToHead?: HeadToHeadStats }

function hashTeam(players: PlayerLite[]): number {
  let h=0; for(const p of players){ const id = typeof p.id==='number'? p.id : Array.from(String(p.id)).reduce((s,c)=> s+c.charCodeAt(0),0); h = (Math.imul(31,h) + id) | 0; } return h;
}

function analyze(teamA: PlayerLite[], teamB: PlayerLite[], headToHead?: HeadToHeadStats): AIWorkerResult {
  const strength = (team: PlayerLite[]) => team.reduce((s,p)=> s + (typeof p.id==='number'? p.id%10+10:10),0)/ (team.length||1);
  const aStr = strength(teamA); const bStr = strength(teamB);
  const total = aStr + bStr || 1;
  const xanhProb = aStr/total;
  const predictedScoreA = Math.max(0, Math.round(aStr/12));
  const predictedScoreB = Math.max(0, Math.round(bStr/12));
  const factors = [
    { name:'BalanceDiff', impact: Math.abs(aStr-bStr) },
    { name:'AvgStrengthA', impact: aStr },
    { name:'AvgStrengthB', impact: bStr }
  ];
  // Basic blending with head-to-head if provided: adjust winProbability toward historical rate
  let xanhWinPct = +(xanhProb*100).toFixed(2);
  if(headToHead && headToHead.totalMeetings){
    const hRate = (headToHead.xanhWins / headToHead.totalMeetings) * 100;
    const weight = Math.min(0.3, 0.1 + headToHead.playerStabilityIndex * 0.15);
    xanhWinPct = +(xanhWinPct * (1 - weight) + hRate * weight).toFixed(2);
  }
  const camWinPct = +(100 - xanhWinPct).toFixed(2);
  return {
    prediction: { predictedScore:{ xanh: predictedScoreA, cam: predictedScoreB }, winProbability:{ xanh: xanhWinPct, cam: camWinPct } },
    keyFactors: factors,
    historicalContext: { recentPerformance:{ xanhWins:0, camWins:0, draws:0 }, matchesAnalyzed:0 },
    headToHead
  };
}

// Simple in-memory cache inside worker lifecycle
const resultCache = new Map<string, AIWorkerResult>();

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if(data?.type === 'ANALYZE_TEAMS'){
  const { teamA, teamB, headToHead } = data;
    const start = performance.now();
    const key = hashTeam(teamA) + '|' + hashTeam(teamB);
    let result = resultCache.get(key);
    if(!result){
  result = analyze(teamA, teamB, headToHead);
      resultCache.set(key, result);
    }
    const duration = performance.now() - start;
    (globalThis as unknown as Worker).postMessage({ type:'ANALYSIS_RESULT', result, key, duration });
  }
};
