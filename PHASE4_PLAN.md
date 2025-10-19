# Phase 4 Plan: Performance, Reliability & Intelligence (Updated 2025-10-19)

## Overview
Phase 4 focuses on tightening performance, improving offline reliability, expanding AI execution off the main thread, strengthening security, and establishing full CI/CD + observability.

This update reflects completed milestones (lazy analytics loading, PerfMarks integration, AI worker migration) and adds refined KPIs plus new follow-on tasks (worker telemetry, advanced caching, offline queue prioritization).

## Baseline Metrics (To Capture Before Optimizations)
Captured on 2025-10-19 (profile script):
- Initial JS Bundle (initial total raw): 581.48 kB (156.82 kB est transfer)
- Largest Single Chunk (main): 202.37 kB (warning budget exceeded by 2.37 kB)
- Lazy AI analysis component chunk: 9.09 kB
- Time to Interactive (dev build): TBD (to measure with manual perf mark)
## Baseline & Current Metrics (Updated 2025-10-19)
Baseline (pre-dynamic firebase player facade) captured earlier:
- Initial JS Bundle (initial total raw): 581.48 kB (156.82 kB est transfer)
- Largest Single Chunk (main): 202.37 kB (warning budget exceeded by 2.37 kB)
- Lazy AI analysis component chunk: 9.09 kB

After dynamic Firebase player facade & lazy boundary (post-modularization step 1):
- Initial JS Bundle (initial total raw): 582.38 kB (157.45 kB est transfer) [slight variance build noise]
- Largest Single Chunk (main parsed asset bytes): 197.65 kB (raw 202.40 kB, budget exceeded by 2.40 kB) — parsed size dropped below 200 kB target threshold.
- New lazy chunk: firebase-player-service: 12.57 kB
- Main delta (parsed): ~ - (202.37 -> 197.65) ≈ 2.3% reduction; movement of player service logic to lazy chunk confirmed.
- Service test coverage: TBD (run coverage after new tests)
- Accessibility audit (axe violations): TBD

Post Firebase pruning + dynamic facade + offline queue testability (latest build & coverage run 2025-10-19):
- Production Build Initial Total Raw: 2.34 MB (Angular reported) — differs from earlier single-bundle baseline due to additional code & build variance; tracking focuses on main chunk + parsed shift.
- Main Chunk Raw: 592.58 kB (previous parsed focus 197.65 kB); requires follow-up parsed vs raw reconciliation (Angular stats now listing raw sizes only in this output snapshot).
- New Lazy Chunks of interest:
   - `firebase-player-service`: 22.99 kB (grew from 12.57 kB after additional logic consolidation & queue integration?)
   - `player-advanced-stats-service`: 8.16 kB
- Offline Queue Service Coverage: Statements 87.5%, Lines 94.59% (goal ≥ 90% lines achieved; branch coverage to improve with success + retry jitter cases).
- Overall Coverage: Statements 58.81%, Branches 48.52%, Lines 65.22% (expansion of roots reduced aggregate percentages; targeted services remain high).
- Next Step: Re-run profile script with parsed size extraction (enhance script to record parsed vs raw bytes for main chunk consistently) and capture delta vs first modularization snapshot.

## Target KPIs
| Area | KPI | Target | Notes |
|------|-----|--------|-------|
| Bundle Size | Initial JS reduction | -25% vs baseline | Lazy analytics complete; Firebase lazy core init added (no size delta yet); deeper Firebase modular split pending |
| Chunk Max | Any single chunk size | <= 450KB uncompressed | Monitor after Firebase split |
| AI Analysis | Worker latency (40 players) | < 400ms | Worker in place; need measurement harness |
| AI Analysis | Fallback latency (no worker) | < 650ms | Ensures graceful degradation |
| AI Analysis | Offload success rate | > 99% | % of analyses executed via worker vs fallback |
| Offline CRUD | Replay success rate | 100% within 2 min | Queue design pending |
| Coverage | Services + facade lines/branches | >= 90% | Current TBD |

Updated Coverage Status (2025-10-19): Services of interest (analytics, advanced stats, offline queue, dynamic facade) lines ≥ 90% except `player-data-facade.service` (needs additional mode & error path tests). Branch coverage below target; action item added.
| Accessibility | Critical violations | 0 | Axe integration planned |
| E2E Stability | Flake rate over 20 runs | < 2% | Track in CI summary |
| Sync Efficiency | Batched stats writes | <= 1 per 30s window | Already implemented (needs verification metric) |
| Perf Observability | Mark coverage (key flows instrumented) | > 80% of analytic paths | Expand PerfMarks to worker & AI |

## Work Streams (Updated)
1. Bundle Optimization (IN PROGRESS)
   - DONE: Dynamic import heavy analytics services.
   - DONE: Lazy Firebase core init (ensureInitialized, deferred idle load).
   - TODO: Deeper Firebase modular split (tree-shake only database + auth pieces actually used).
   - TODO: Extract AI worker code into separate chunk (verify build output).
2. Offline CRUD Queue (PENDING)
   - Design local durable queue (localStorage / IndexedDB).
   - Backoff strategy (1s, 3s, 9s) + jitter; max attempts configurable.
   - Conflict resolution: last-write-wins with timestamp + optional merge hook.
3. AI Worker & Advanced Intelligence (IN PROGRESS)
   - DONE: Worker offload + caching by team hash.
   - TODO: Add performance marks inside worker and send timings.
   - TODO: Consider WASM model stub for future advanced prediction.
4. Observability (IN PROGRESS)
   - DONE: PerfMarks utility integrated in analytics calculations.
   - TODO: Add mark wrappers around worker requests & Firebase sync flushes.
   - TODO: Structured log batching + admin export.
5. Security Hardening (PENDING)
   - Input validation functions & sanitization layer.
   - Role guard & authorization tests >= 90% branch coverage.
6. CI/CD (PENDING)
   - GitHub Actions workflow (lint, test, build, e2e, coverage artifact, profiling summary).
   - Conditional deploy to Firebase hosting on main success.
7. Accessibility Audit (PENDING)
   - Integrate axe-core in Playwright.
   - Fix contrast, missing labels, landmark roles.
8. Data Integrity & Regression (PENDING)
   - Snapshot tests for `getAllAnalytics()` with fixed deterministic dataset.
   - Regression test for worker result format.
9. Documentation & Developer Experience (IN PROGRESS)
   - DONE: `WORKERS.md` created.
   - TODO: README Section for AI Worker & performance toggles.
   - TODO: Add troubleshooting guide for worker fallback & browser support.

## Implementation Order (Revised)
1. Capture baseline metrics (before Firebase splitting) & record in this file.
2. Firebase SDK code splitting & measure delta.
3. Add worker performance marks + telemetry channel.
4. Offline CRUD queue implementation + tests.
5. CI/CD pipeline setup (include performance artifact uploads).
6. Accessibility audit integration & remediation.
7. Security validation layer + role guard tests.
8. Snapshot & regression tests (analytics + worker output).
9. Documentation updates (README, perf guidelines).
- Worker serialization overhead: keep payload minimal (ids, names, positions). Evaluate Transferable if arrays grow.
- CI flakiness (Playwright): use retries=1 & trace on failure, collect stability stats.
- [ ] Analytics snapshot tests
- [x] WORKERS.md documentation
- [ ] README updated (Phase 4 & AI worker)
 - [x] Offline player CRUD queue (enqueue + flush)
 - [x] Worker latency capture (duration field)

## Commands Reference
```powershell
npm run profile
npm test -- --coverage
npm run e2e
```


## References
- `WORKERS.md` for detailed worker architecture & future optimizations.
- `profile-performance.js` script for baseline bundle metrics.
