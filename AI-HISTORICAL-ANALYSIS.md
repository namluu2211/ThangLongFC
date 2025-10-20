# AI Historical Analysis Integration

## Overview
The AI prediction system now blends volatile per-session team strength with stable historical head-to-head statistics between **Đội Xanh** and **Đội Cam**. This improves prediction reliability when player rosters fluctuate or partial data is available.

## New Data Model
`HeadToHeadStats` fields:
- `totalMeetings`: Number of completed BLUE vs ORANGE matches considered (last 25 max)
- `xanhWins`, `camWins`, `draws`: Outcomes tally
- `averageGoalsXanh`, `averageGoalsCam`: Average goals per team
- `averageMargin`: Average absolute goal difference
- `recentForm.sequence`: Chronological outcome codes (`X`, `C`, `D`)
- `playerStabilityIndex`: 0..1 proportion indicating roster overlap stability between current lineup and historical matches

## Computation (`HistoryStatsService`)
1. Filters completed matches with `teamA.teamColor === BLUE` and `teamB.teamColor === ORANGE`.
2. Aggregates last N (<=25) for goals, margins, outcomes.
3. Stability computed as average intersection ratio of current player IDs vs each historical match roster.

## Blending Logic (updated `AIAnalysisService`)
- Base win probability derived from strength difference.
- Recent 10-match performance (quick history slice) applied with 10% weight.
- Deep head-to-head win rate blended with dynamic weight: `weight = min(0.35, 0.15 + stability*0.2)`.
- Final clamp widened to 15–85% allowing historically dominant patterns to surface.
- Score prediction base (strength/30) blended with historical goal averages (30% weight) before random variance (±~1.8).

## Worker Path Enhancements
- Worker protocol extended: `ANALYZE_TEAMS` may include `headToHead` payload.
- In-worker blending applies lighter adjustment (`<=30%`) to keep latency minimal.
- Fallback (no Worker) path invokes full `AIAnalysisService` including head-to-head blending.

## Key Benefits
- Reduces noise from transient roster edits.
- Stability-aware weighting prevents overfitting to historical data when current lineup differs significantly.
- Maintains responsiveness (simple arithmetic + minimal loops).

## Testing
Added tests:
- `history-stats.service.spec.ts`: Validates aggregation, empty handling, stability index.
- `ai-analysis.service.spec.ts`: Ensures win probability tilt and score blend with head-to-head data.
All tests green (see coverage summary in CI/Jest run).

## Next Possible Improvements
- Persist computed head-to-head snapshots to avoid recomputation for identical rosters.
- Visual UI component showing recent form sequence and stability gauge.
- Adaptive maxConsider based on stability (lower stability -> fewer historical matches used).
- Include draw probability estimate using adjusted Poisson-like model (future).

## Usage
1. Obtain completed matches stream and current player ID arrays.
2. Call `HistoryStatsService.buildHeadToHead(matches, xanhIds, camIds)`.
3. Pass resulting stats to `AIWorkerService.analyze(teamX, teamC, headToHeadStats)`.
4. Consume `headToHead` from result for UI display.

---
Document generated October 20, 2025.
