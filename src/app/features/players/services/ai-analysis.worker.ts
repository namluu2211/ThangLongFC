// AI Analysis Web Worker
// Message protocol:
// Incoming: { type:'ANALYZE_TEAMS', teamA: PlayerLite[], teamB: PlayerLite[], headToHead?: HeadToHeadStats }
// Outgoing: { type:'ANALYSIS_RESULT', result: AIWorkerResult }

interface PlayerLite { id: number|string; firstName: string; lastName?: string }
interface Prediction { predictedScore:{ xanh:number; cam:number }; winProbability:{ xanh:number; cam:number }; scoreDistribution?: { scoreline:string; probability:number }[] }
interface Historical { recentPerformance:{ xanhWins:number; camWins:number; draws:number }; matchesAnalyzed:number }
interface HeadToHeadStats { xanhWins:number; camWins:number; draws:number; totalMeetings:number; averageGoalsXanh:number; averageGoalsCam:number; averageMargin:number; recentForm:string[]; playerStabilityIndex:number }
interface AIWorkerResult { prediction: Prediction; keyFactors:{ name:string; impact:number }[]; historicalContext: Historical; headToHead?: HeadToHeadStats }

function hashTeam(players: PlayerLite[]): number {
  let h=0; for(const p of players){ const id = typeof p.id==='number'? p.id : Array.from(String(p.id)).reduce((s,c)=> s+c.charCodeAt(0),0); h = (Math.imul(31,h) + id) | 0; } return h;
}

function analyze(teamA: PlayerLite[], teamB: PlayerLite[], headToHead?: HeadToHeadStats): AIWorkerResult {
  const strength = (team: PlayerLite[]) => team.reduce((s,p)=> s + (typeof p.id==='number'? p.id%10+10:10),0)/ (team.length||1);
  let aStr = strength(teamA); let bStr = strength(teamB);
  // Roster size weighting (mirrors service logic)
  const sizeDiff = teamA.length - teamB.length;
  if(sizeDiff !== 0){
    const adjFactor = (diff:number)=> 1 + Math.max(-0.25, Math.min(0.25, diff * 0.025));
    aStr = +(aStr * adjFactor(sizeDiff)).toFixed(3);
    bStr = +(bStr * adjFactor(-sizeDiff)).toFixed(3);
  }
  const total = aStr + bStr || 1;
  const xanhProb = aStr/total;

  // Enhanced high-scoring adaptive scoring similar to main service
  let expA = aStr / 12; // baseline ~ previous logic
  let expB = bStr / 12;
  if(headToHead && headToHead.totalMeetings){
    // Blend 50% with historical average scoring
    expA = expA * 0.5 + headToHead.averageGoalsXanh * 0.5;
    expB = expB * 0.5 + headToHead.averageGoalsCam * 0.5;
    const avgTotal = headToHead.averageGoalsXanh + headToHead.averageGoalsCam;
    if(avgTotal >= 8){
      const amplification = 1 + Math.min(0.6, (avgTotal - 8) * 0.08);
      expA *= amplification; expB *= amplification;
    }
  }
  // modest variance
  expA += Math.random()*0.5; expB += Math.random()*0.5;
  let predictedScoreA = Math.max(0, Math.round(expA));
  let predictedScoreB = Math.max(0, Math.round(expB));
  if(headToHead && headToHead.totalMeetings){
    const extremeTotal = headToHead.averageGoalsXanh + headToHead.averageGoalsCam;
    if(extremeTotal >= 10 && (predictedScoreA + predictedScoreB) < 8){
      predictedScoreA += 1; predictedScoreB += 1;
    }
  }

  const factors = [
    { name:'BalanceDiff', impact: Math.abs(aStr-bStr) },
    { name:'AvgStrengthA', impact: aStr },
    { name:'AvgStrengthB', impact: bStr }
  ];
  if(sizeDiff !== 0){
    factors.unshift({ name:'Chênh lệch quân số', impact: Math.min(25, Math.abs(sizeDiff)*5) * (sizeDiff>0? 1:-1) });
  }
  // Blended win probability with head-to-head
  let xanhWinPct = +(xanhProb*100).toFixed(2);
  if(headToHead && headToHead.totalMeetings){
    const hRate = (headToHead.xanhWins / headToHead.totalMeetings) * 100;
    const weight = Math.min(0.3, 0.1 + headToHead.playerStabilityIndex * 0.15);
    xanhWinPct = +(xanhWinPct * (1 - weight) + hRate * weight).toFixed(2);
  }
  const camWinPct = +(100 - xanhWinPct).toFixed(2);
  // Build score distribution (Poisson approximation, truncated & normalized)
  const buildDist = () => {
    let lambdaX = aStr/12; let lambdaC = bStr/12;
    if(headToHead && headToHead.totalMeetings){
      lambdaX = lambdaX*0.5 + headToHead.averageGoalsXanh*0.5;
      lambdaC = lambdaC*0.5 + headToHead.averageGoalsCam*0.5;
      const avgTotal = headToHead.averageGoalsXanh + headToHead.averageGoalsCam;
      if(avgTotal >= 8){ const amplification = 1 + Math.min(0.6, (avgTotal-8)*0.08); lambdaX*=amplification; lambdaC*=amplification; }
    }
    lambdaX = Math.min(lambdaX,12); lambdaC = Math.min(lambdaC,12);
    const factorialCache:number[]=[1];
    const fact=(n:number)=>{ if(factorialCache[n]!==undefined) return factorialCache[n]!; const last=factorialCache.length-1; let acc=factorialCache[last]!; for(let i=last+1;i<=n;i++){ acc*=i; factorialCache[i]=acc; } return factorialCache[n]!; };
    const pois=(lam:number,k:number)=> Math.exp(-lam)*Math.pow(lam,k)/fact(k);
    const cutoff=(lam:number)=> Math.min(15, Math.max(5, Math.ceil(lam + 4*Math.sqrt(lam||1))));
    const maxX=cutoff(lambdaX), maxC=cutoff(lambdaC);
    const arr:{scoreline:string; probability:number}[]=[]; let sum=0;
    for(let x=0;x<=maxX;x++){ const px=pois(lambdaX,x); for(let c=0;c<=maxC;c++){ const pc=pois(lambdaC,c); const p=px*pc; sum+=p; arr.push({ scoreline:`${x}-${c}`, probability:p }); } }
    if(sum>0){ for(const d of arr){ d.probability = +(d.probability/sum); } }
    return arr.sort((a,b)=> b.probability-a.probability).slice(0,8).map(d=> ({...d, probability:+d.probability.toFixed(4)}));
  };
  const scoreDistribution = buildDist();
  // Mode-based predicted score selection for interpretability
  if(scoreDistribution.length){
    const top = scoreDistribution[0].scoreline.split('-').map(n=> parseInt(n,10)||0);
    predictedScoreA = top[0]; predictedScoreB = top[1];
  }
  return {
    prediction: { predictedScore:{ xanh: predictedScoreA, cam: predictedScoreB }, winProbability:{ xanh: xanhWinPct, cam: camWinPct }, scoreDistribution },
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
