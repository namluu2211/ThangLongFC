import { Injectable } from '@angular/core';
import { PlayerInfo } from '../../../core/models/player.model';

export type PlayerCrudOperation =
  | { type:'create'; payload:{ firstName:string; lastName?:string; position?:string } }
  | { type:'update'; id:string; updates: Partial<PlayerInfo> }
  | { type:'delete'; id:string };

interface QueuedOp { op: PlayerCrudOperation; attempts: number; enqueuedAt: number; lastAttempt?: number }

@Injectable({ providedIn:'root' })
export class OfflinePlayerQueueService {
  private queue: QueuedOp[] = [];
  private readonly STORAGE_KEY = 'offline_player_crud_queue_v1';
  private flushing = false;
  private readonly MAX_ATTEMPTS: number;
  private readonly BACKOFF_MS: number[];

  constructor(maxAttempts = 5, backoff: number[] = [1000, 3000, 7000, 15000, 30000]){
    this.MAX_ATTEMPTS = maxAttempts;
    this.BACKOFF_MS = backoff;
    this.restore();
  }

  enqueue(op: PlayerCrudOperation){
    this.queue.push({ op, attempts:0, enqueuedAt: Date.now() });
    this.persist();
  }

  get length(){ return this.queue.length; }
  get pending(){ return [...this.queue]; }

  async flush(processor: (op: PlayerCrudOperation)=> Promise<void>): Promise<{ processed:number; remaining:number }>{
    if(this.flushing) return { processed:0, remaining:this.queue.length };
    this.flushing = true;
    let processed = 0;
    try {
      for(const item of [...this.queue]){
        // Attempt retries inline until success or max attempts reached
        while(true){
          try {
            await processor(item.op);
            processed++;
            this.queue = this.queue.filter(q => q !== item);
            break; // success handled
          } catch {
            item.attempts++;
            item.lastAttempt = Date.now();
            if(item.attempts >= this.MAX_ATTEMPTS){
              console.warn('Dropping player CRUD op after max attempts:', item.op);
              this.queue = this.queue.filter(q => q !== item);
              break; // give up (do not increment processed)
            } else {
              const delay = this.BACKOFF_MS[Math.min(item.attempts-1, this.BACKOFF_MS.length-1)];
              if(delay > 0){
                await new Promise(res => setTimeout(res, delay));
              }
            }
          }
        }
      }
    } finally {
      this.flushing = false;
      this.persist();
    }
    return { processed, remaining: this.queue.length };
  }

  private persist(){
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue)); } catch {/* ignore */}
  }
  private restore(){
    try { const raw = localStorage.getItem(this.STORAGE_KEY); if(raw){ this.queue = JSON.parse(raw); } } catch { this.queue=[]; }
  }
}
