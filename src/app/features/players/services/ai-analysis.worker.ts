// AI Analysis Web Worker
// Message protocol:
// Incoming: { type:'ANALYZE_TEAMS', teamA: PlayerLite[], teamB: PlayerLite[] }
// Outgoing: { type:'ANALYSIS_RESULT', result: AIWorkerResult }

interface PlayerLite { id: number|string; firstName: string; lastName?: string }
interface Prediction { predictedScore:{ xanh:number; cam:number }; winProbability:{ xanh:number; cam:number } }
interface Historical { recentPerformance:{ xanhWins:number; camWins:number; draws:number }; matchesAnalyzed:number }
interface AIWorkerResult { prediction: Prediction; keyFactors:{ name:string; impact:number }[]; historicalContext: Historical }

function hashTeam(players: PlayerLite[]): number {
  let h=0; for(const p of players){ const id = typeof p.id==='number'? p.id : Array.from(String(p.id)).reduce((s,c)=> s+c.charCodeAt(0),0); h = (Math.imul(31,h) + id) | 0; } return h;
}

function analyze(teamA: PlayerLite[], teamB: PlayerLite[]): AIWorkerResult {
  const strength = (team: PlayerLite[]) => team.reduce((s,p)=> s + (typeof p.id==='number'? p.id%10+10:10),0)/ (team.length||1);
  const aStr = strength(teamA); const bStr = strength(teamB);
  const total = aStr + bStr || 1;
  const xanhProb = aStr/total; const camProb = bStr/total;
  const predictedScoreA = Math.max(0, Math.round(aStr/12));
  const predictedScoreB = Math.max(0, Math.round(bStr/12));
  const factors = [
    { name:'BalanceDiff', impact: Math.abs(aStr-bStr) },
    { name:'AvgStrengthA', impact: aStr },
    { name:'AvgStrengthB', impact: bStr }
  ];
  return {
    prediction: { predictedScore:{ xanh: predictedScoreA, cam: predictedScoreB }, winProbability:{ xanh: +(xanhProb*100).toFixed(2), cam: +(camProb*100).toFixed(2) } },
    keyFactors: factors,
    historicalContext: { recentPerformance:{ xanhWins:0, camWins:0, draws:0 }, matchesAnalyzed:0 }
  };
}

// Simple in-memory cache inside worker lifecycle
const resultCache = new Map<string, AIWorkerResult>();

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if(data?.type === 'ANALYZE_TEAMS'){
    const { teamA, teamB } = data;
    const start = performance.now();
    const key = hashTeam(teamA) + '|' + hashTeam(teamB);
    let result = resultCache.get(key);
    if(!result){
      result = analyze(teamA, teamB);
      resultCache.set(key, result);
    }
    const duration = performance.now() - start;
    (globalThis as unknown as Worker).postMessage({ type:'ANALYSIS_RESULT', result, key, duration });
  }
};
