// Web Worker script (no explicit lib reference to avoid duplicate DOM/WebWorker type conflicts in build)

// Lightweight worker version of AI analysis to offload CPU work
// Receives message: { teamA: Player[], teamB: Player[] }
// Returns: AnalysisResult

interface Player { id:number; firstName:string; lastName?:string; position:string; [k:string]:unknown }
interface AnalysisResult {
  predictedScore:{xanh:number;cam:number};
  xanhWinProb:number; camWinProb:number;
  keyFactors:{name:string;impact:number}[];
  teamStrengths:{teamA:number;teamB:number;balanceScore:number};
}

function calcStrength(players:Player[]):number {
  if(!players.length) return 0;
  let total=0;
  for(const p of players){
    let base=10 + (typeof p.id==='number'? (p.id%10):5);
    if(p.position?.includes('Tiền đạo')) base+=6;
    else if(p.position?.includes('Tiền vệ')) base+=4;
    else if(p.position?.includes('Hậu vệ')) base+=2;
    total+=base;
  }
  return Math.round(total/players.length);
}

function predict(teamA:number, teamB:number){
  const xanhGoals=Math.max(0, Math.round((teamA/30) + Math.random()*2));
  const camGoals=Math.max(0, Math.round((teamB/30) + Math.random()*2));
  return { xanh:xanhGoals, cam:camGoals };
}

function winProb(teamA:number, teamB:number){
  const diff=teamA-teamB; let xanh=50+diff; xanh=Math.max(20, Math.min(80,xanh)); return { xanh:Math.round(xanh), cam:Math.round(100-xanh) }; }

function keyFactors(teamA:number, teamB:number, a:Player[], b:Player[]):{name:string;impact:number}[]{
  const factors: {name:string;impact:number}[]=[];
  const sizeDiff=Math.abs(a.length-b.length); if(sizeDiff>0) factors.push({name:'Chênh lệch số lượng', impact:sizeDiff*5});
  const strikerDiff=Math.abs(a.filter(p=>p.position?.includes('Tiền đạo')).length - b.filter(p=>p.position?.includes('Tiền đạo')).length); if(strikerDiff>0) factors.push({name:'Chênh lệch tiền đạo', impact:strikerDiff*8});
  const strengthDiff=Math.abs(teamA-teamB); if(strengthDiff>5) factors.push({name:'Chênh lệch sức mạnh', impact:Math.round(strengthDiff)});
  return factors.sort((x,y)=>Math.abs(y.impact)-Math.abs(x.impact)).slice(0,5);
}

addEventListener('message', ({ data }) => {
  const teamA:Player[]=data.teamA||[]; const teamB:Player[]=data.teamB||[];
  const strA=calcStrength(teamA); const strB=calcStrength(teamB);
  const score=predict(strA,strB); const prob=winProb(strA,strB); const factors=keyFactors(strA,strB,teamA,teamB);
  const balanceScore=100 - Math.min(100, Math.abs(strA-strB)*5);
  const result:AnalysisResult={ predictedScore:score, xanhWinProb:prob.xanh, camWinProb:prob.cam, keyFactors:factors, teamStrengths:{teamA:strA,teamB:strB,balanceScore} };
  postMessage(result);
});
