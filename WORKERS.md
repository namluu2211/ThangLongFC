# Web Worker Architecture (AI Analysis)

## Overview
The AI analysis feature offloads computational work (team strength evaluation, probability & score prediction, factor derivation) from the main Angular thread into a dedicated Web Worker to keep the UI responsive and reduce long-task blocking.

## Goals
- Avoid blocking change detection and user interactions during heavy calculations.
- Provide scalable architecture for future advanced AI / ML logic (e.g., WASM models).
- Enable bundle size optimization by deferring AI logic until first use.
- Support graceful fallback when Web Workers are not available (legacy browsers, SSR environments).

## Components
1. `ai-analysis.worker.ts`
   - Receives messages of shape `{ type: 'ANALYZE_TEAMS', teamA: PlayerLite[], teamB: PlayerLite[] }`.
   - Computes lightweight strength metrics, win probabilities, predicted scores, and key factors.
   - Caches results keyed by hashed team compositions to avoid redundant recalculation within worker lifecycle.
   - Emits response `{ type: 'ANALYSIS_RESULT', result: AIWorkerResult, key }`.

2. `AIWorkerService`
   - Encapsulates worker lifecycle and exposes `analyze(teamA, teamB): Observable<AIWorkerResult>`.
   - Performs feature detection for `Worker`; if unsupported, falls back to direct synchronous `AIAnalysisService` logic (same output structure mapped).
   - Lazy initializes worker instance only on first call to minimize upfront memory and script cost.

3. `AIAnalysisService`
   - Original synchronous in-main-thread implementation retained for fallback.
   - Provides higher-fidelity team comparison fields (`teamComparison`) and internal caching.
   - Worker fallback maps subset of these fields to common display model.

4. `PlayersComponent`
   - Triggers `runAIAnalysis()` on team composition changes (debounced via `teamChange$`).
   - Subscribes to `AIWorkerService.analyze(...)` and updates UI state without blocking.
   - Maintains `isAnalyzing` flag to show progress indicator.

## Message Protocol
- Request: `ANALYZE_TEAMS` -> payload contains minimal player objects (id, firstName, lastName, position optional).
- Response: `ANALYSIS_RESULT` -> normalized `AIWorkerResult` object consumed by component.

## Caching Strategy
- Worker: In-memory `Map<string, AIWorkerResult>`; key combines hashed teamA + teamB player IDs.
- Fallback Service: Internal TTL-based cache in `AIAnalysisService` (1 minute per composition).
- Result: Repeated small adjustments (e.g., rearranging same players) avoids recomputation.

## Performance Considerations
- Offloads CPU work to different thread; main thread remains free for input, scrolling, rendering.
- Debounce (250ms) on team changes prevents excessive worker chatter while users drag & drop.
- Lazy import pattern ensures AI logic not part of initial bundle; worker script may be split by build system.

## Error Handling
- Worker initialization failure -> immediate fallback with synchronous analysis.
- Observable emits `error` only if worker cannot start and fallback also fails (rare).
- Potential enhancement: structured error events with `{ type:'ANALYSIS_ERROR', message }`.

## Extensibility
Future expansions:
- Add WASM model prediction: load inside worker after initial light analysis for deeper metrics.
- Stream partial results (progressive enhancement): early probability -> later refined prediction.
- Multi-worker pool for very large analytics (partition players or historical dataset).

## Security & Isolation
- Only minimal player data transmitted (no sensitive metadata). No external network calls.
- Worker confined to deterministic computation; safe to run in background.

## Testing
- Unit: `ai-worker.service.spec.ts` mocks Worker and validates observable output.
- E2E: `players-ai-nonblocking.spec.ts` asserts UI interactivity during analysis.

## Fallback Logic Diagram
```
runAIAnalysis()
   -> AIWorkerService.analyze()
       if (Worker supported)
          ensureWorker() -> postMessage(ANALYZE_TEAMS)
          listen for ANALYSIS_RESULT -> emit observable value
       else
          init AIAnalysisService (lazy) -> synchronous analyzeTeams()
          emit mapped AIWorkerResult via of()
```

## Key Design Trade-offs
| Aspect | Choice | Rationale |
| ------ | ------ | --------- |
| Transport | postMessage JSON | Simplicity; no need for transferable objects yet |
| Caching Scope | Worker lifecycle-only | Avoid complexity; good for session-level usage |
| Fallback Trigger | Feature detection at service construction | Zero runtime branching inside component |
| API Shape | Observable | Aligns with Angular reactive patterns and easy cancellation |

## Next Possible Optimizations
- Add `preload()` method to warm worker after idle period.
- Switch to Transferable (ArrayBuffer) if large numeric arrays introduced.
- Instrument worker with performance marks and send back timing for telemetry.

---
Maintainer: Performance / AI Phase 4
Last Updated: 2025-10-19
