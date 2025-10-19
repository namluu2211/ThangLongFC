import { AIAnalysisService, AIAnalysisResult, Player, HistoryEntry } from './ai-analysis.service';
import { Injectable, inject } from '@angular/core';

// Thin wrapper to allow dynamic lazy import usage and potential future heavy model loading separation.
@Injectable({ providedIn: 'root' })
export class AILazyWrapperService {
  private readonly core = inject(AIAnalysisService);

  analyze(teamA: Player[], teamB: Player[], history: HistoryEntry[] = []): AIAnalysisResult {
    return this.core.analyzeTeams(teamA, teamB, history);
  }
}
