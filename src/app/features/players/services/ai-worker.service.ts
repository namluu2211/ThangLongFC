import { Injectable, inject } from '@angular/core';
import { PerfMarksService } from '../../../core/services/perf-marks.service';
import { Observable, of } from 'rxjs';
import { AIAnalysisService, Player as AIPlayer } from './ai-analysis.service';
import type { HeadToHeadStats } from './history-stats.service';

interface PlayerLite { id: number|string; firstName: string; lastName?: string; position?: string }
interface AIWorkerResult { prediction:{ predictedScore:{ xanh:number; cam:number }; winProbability:{ xanh:number; cam:number } }; keyFactors:{ name:string; impact:number }[]; historicalContext:{ recentPerformance:{ xanhWins:number; camWins:number; draws:number }; matchesAnalyzed:number }; headToHead?: HeadToHeadStats }

@Injectable({ providedIn:'root' })
export class AIWorkerService {
  private worker: Worker | null = null;
  private readonly supportsWorker: boolean;
  // Fallback direct service (lazy loaded on demand) if Worker unsupported
  private fallbackService: AIAnalysisService | null = null;
  private perf: { markStart(label:string): string; markEnd(label:string, startId:string): unknown };
  // Test-friendly constructor allowing perfOverride injection when inject() context unavailable
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(forceFallback = false, perfOverride?: PerfMarksService | { markStart(label:string): string; markEnd(label:string, startId:string): unknown }){
    this.supportsWorker = !forceFallback && typeof Worker !== 'undefined';
  this.perf = perfOverride || inject(PerfMarksService);
  }
  private ensureWorker(){
    if(!this.supportsWorker) return;
    if(!this.worker){
  // Worker initialization without import.meta for broader TS module compatibility
  this.worker = new Worker('./ai-analysis.worker.ts', { type:'module' });
    }
  }

  analyze(teamA: PlayerLite[], teamB: PlayerLite[], headToHead?: HeadToHeadStats): Observable<AIWorkerResult & { duration?: number; mode:'worker'|'fallback' }> {
    if(this.supportsWorker){
      this.ensureWorker();
      return new Observable<AIWorkerResult & { duration?: number; mode:'worker' }>(subscriber => {
        if(!this.worker){ subscriber.error('Worker init failed'); return; }
        const startId = this.perf.markStart('ai-worker-analysis');
        const handler = (ev: MessageEvent) => {
          if(ev.data?.type === 'ANALYSIS_RESULT'){
            // Perf measure end
            this.perf.markEnd('ai-worker-analysis', startId);
            subscriber.next({ ...(ev.data.result as AIWorkerResult), duration: ev.data.duration, mode:'worker' });
            subscriber.complete();
            this.worker?.removeEventListener('message', handler);
          }
        };
        this.worker.addEventListener('message', handler);
  this.worker.postMessage({ type:'ANALYZE_TEAMS', teamA, teamB, headToHead });
        return () => { this.worker?.removeEventListener('message', handler); };
      });
    }
    // Fallback path (no worker support): use direct AIAnalysisService logic
    if(!this.fallbackService){
      this.fallbackService = new AIAnalysisService();
    }
    const toAIPlayer = (p: PlayerLite): AIPlayer => ({ id: typeof p.id==='number'? p.id: parseInt(String(p.id),10)||0, firstName: p.firstName, lastName: p.lastName, position: p.position||'Chưa xác định' });
    const startId = this.perf.markStart('ai-fallback-analysis');
    const t0 = performance.now();
  const result = this.fallbackService.analyzeTeams(teamA.map(toAIPlayer), teamB.map(toAIPlayer), [], headToHead);
    const duration = performance.now() - t0;
    this.perf.markEnd('ai-fallback-analysis', startId);
    return of({
      prediction: result.prediction,
      keyFactors: result.keyFactors,
      historicalContext: { recentPerformance: result.historicalContext.recentPerformance, matchesAnalyzed: result.historicalContext.matchesAnalyzed },
  duration,
  headToHead: result.headToHead,
      mode:'fallback'
    });
  }
}
