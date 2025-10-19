import { Injectable } from '@angular/core';
import { Player } from '../players/player-utils';

interface AnalysisResult {
  predictedScore:{xanh:number;cam:number};
  xanhWinProb:number; camWinProb:number;
  keyFactors:{name:string;impact:number}[];
  teamStrengths:{teamA:number;teamB:number;balanceScore:number};
}

@Injectable({ providedIn:'root' })
export class AIWorkerService {
  private worker: Worker | null = null;

  private ensureWorker(){
    if(!this.worker){
      this.worker = new Worker(new URL('./ai-analysis.worker.ts', import.meta.url), { type:'module' });
    }
  }

  analyze(teamA:Player[], teamB:Player[]): Promise<AnalysisResult> {
    this.ensureWorker();
    return new Promise((resolve,reject)=>{
      if(!this.worker) return reject(new Error('Worker init failed'));
      const handleMessage = (e:MessageEvent)=>{
        resolve(e.data as AnalysisResult);
        this.worker?.removeEventListener('message', handleMessage);
      };
      const handleError = (e:ErrorEvent)=>{
        reject(e.error || new Error(e.message));
        this.worker?.removeEventListener('error', handleError);
      };
      this.worker.addEventListener('message', handleMessage);
      this.worker.addEventListener('error', handleError);
      this.worker.postMessage({ teamA, teamB });
    });
  }

  terminate(){ if(this.worker){ this.worker.terminate(); this.worker=null; } }
}
