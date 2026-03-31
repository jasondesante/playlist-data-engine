# Density Balancing Refactor Implementation Plan

## Overview

The `DifficultyVariantGenerator` uses a per-index multiplier (1.5x/1.8x) for enhancement and a single-pass priority filter for simplification, neither of which reliably hits the density target ranges. Enhancement wastes work by adding beats that `enforceSingleGridPerBeat` later discards. Simplification's protection gates prevent it from reaching easy/medium density targets.

This refactor replaces both paths with **global target-based density control**: calculate exactly how many beats to add or remove from the target density range, then distribute that count across beat indices. Grid types are locked per index upfront so `enforceSingleGridPerBeat` never has to discard work.

## Current Problems

| Problem | Root Cause |
|---|---|
| Enhancement doesn't add enough beats | Per-index multiplier ≠ global density target; `enforceSingleGridPerBeat` at end wipes beats from losing grid types |
| Simplification doesn't remove enough beats | Protection gates (intensity >= 0.4 or priority >= 0.75) make too many beats immune; no fallback when first pass fails |
| Empty indices rarely receive beats during enhancement | `calculateProbabilisticTargetBeatsPerBeat` uses probabilistic rolls (75%/90%) instead of filling gaps first |
| Multi-pass quantization drift | `interpolateBeats()` derives timestamps from reference beats instead of authoritative `unifiedBeatMap` positions |

## Key Design Decisions

- **`enforceSingleGridPerBeat` is essential** — it must remain, but it should never need to discard newly-added beats because those beats should never violate the single-grid rule.
- **Global density target, not per-index multiplier** — calculate the exact beat count needed from the target range, then distribute.
- **Empty indices filled first** — gaps in the rhythm are the most natural place to add density.
- **Timestamps always from `unifiedBeatMap`** — the authoritative quarter-note grid is the only source for beat start positions.
- **Convergence loop for reduction** — if first pass can't reach target due to protected beats, a second pass with relaxed protections runs.

## Phase 1: Grid Lock Per Beat Index

The foundational change. Before any density work, lock the grid type for each beat index so all subsequent operations know which grid to use.

- [x] Task 1.1: Create `lockGridPerBeatIndex()` method
  - [x] 1.1.1: Run `enforceSingleGridPerBeat()` on the input beats to resolve mixed grids
  - [x] 1.1.2: Build `Map<number, ExtendedGridType>` of `beatIndex → dominantGridType` from the resolved beats
  - [x] 1.1.3: For empty beat indices with no resolved grid type, resolve from `gridDecisions` map, then nearest-neighbor fallback (offsets 1, -1, 2, -2, 3, -3), then default to allowed grid type for target difficulty
  - [x] 1.1.4: Return the lock map alongside the cleaned beats
  - [x] 1.1.5: Use the lock map signature: `{ beats: CompositeBeat[], gridLock: Map<number, ExtendedGridType> }`

- [x] Task 1.2: Refactor `simplifyBeats()` to accept and use the grid lock
  - [x] 1.2.1: Accept `gridLock: Map<number, ExtendedGridType>` parameter
  - [x] 1.2.2: Skip the initial `enforceSingleGridPerBeat()` call (already done in caller, grid is locked)
  - [x] 1.2.3: During `convertBeatGridType()`, if the beat's current grid doesn't match the locked grid, use the locked grid instead of deriving from the beat's own `gridType`
  - [x] 1.2.4: N/A - `simplifyBeats()` has no final `enforceSingleGridPerBeat()` call; only the initial one (now conditional)

- [ ] Task 1.3: Refactor `enhanceBeats()` to accept and use the grid lock
  - [ ] 1.3.1: Accept `gridLock: Map<number, ExtendedGridType>` parameter
  - [ ] 1.3.2: Skip the initial `enforceSingleGridPerBeat()` call (already done, grid is locked)
  - [ ] 1.3.3: Pass locked grid type to `createBeatsForEmptyIndex()` and `interpolateBeats()` instead of deriving from existing beats
  - [ ] 1.3.4: Replace the final `enforceSingleGridPerBeat()` call with a validation-only check that confirms no grid violations exist (assert, don't fix)

- [ ] Task 1.4: Wire grid lock through `generateVariant()`
  - [ ] 1.4.1: Call `lockGridPerBeatIndex()` once at the top of `generateVariant()` before branching into simplify/enhance
  - [ ] 1.4.2: Pass the grid lock to `simplifyBeats()` or `enhanceBeats()` as appropriate
  - [ ] 1.4.3: The `generate()` method's post-variant `enforceSingleGridPerBeat()` calls (lines 653-655) become validation-only

- [ ] Task 1.5: Write tests for grid lock
  - [ ] 1.5.1: Test that `lockGridPerBeatIndex()` resolves mixed grids and returns correct map
  - [ ] 1.5.2: Test that empty indices get grid types from neighbor fallback
  - [ ] 1.5.3: Test that `simplifyBeats` with grid lock never produces mixed grids
  - [ ] 1.5.4: Test that `enhanceBeats` with grid lock never produces mixed grids

## Phase 2: Global Target-Based Density Reduction

Replace the single-pass `reduceDensityToTarget()` with a global target calculator and convergence loop.

- [ ] Task 2.1: Create `calculateBeatCountTarget()` helper
  - [ ] 2.1.1: Input: current beat count, total quarter-note span (`maxBeatIndex + 1`), BPM, target difficulty
  - [ ] 2.1.2: Calculate target density per difficulty (configurable defaults, overridable by `densityTargetStrategy`)
  - [ ] 2.1.3: For easy: midpoint = 0.9 (biased high within [0, 1.0] to preserve musical interest)
  - [ ] 2.1.4: For medium: midpoint = 1.25 (true center of [1.0, 1.5])
  - [ ] 2.1.4b: For hard: midpoint = 1.75 (target above the 1.5 floor)
  - [ ] 2.1.5: Output: `targetBeatCount = Math.round(midpoint * totalBeats / bpmPerSecond)`
  - [ ] 2.1.6: Return `{ targetCount: number, maxCount: number, minCount: number }` where max/min are from the range extremes

- [ ] Task 2.2: Refactor `reduceDensityToTarget()` with convergence loop
  - [ ] 2.2.1: Call `calculateBeatCountTarget()` to get the exact removal target
  - [ ] 2.2.2: If `beats.length <= targetCount`, return early (already at or below target)
  - [ ] 2.2.3: First pass: same as current — sort by removal priority, skip protected beats, remove lowest priority until target reached
  - [ ] 2.2.4: After first pass, check if density is still above `targetRange.max`
  - [ ] 2.2.5: If still above: second pass with relaxed protections — lower `priorityThreshold` by 0.15, lower `moderateSimplificationIntensityThreshold` by 0.1, and allow removing phrase-protected beats with low significance (< 0.3)
  - [ ] 2.2.6: Third pass (final fallback): remove remaining beats purely by priority with no protection gates except for strong beats (beatIndex % 4 === 0 or 2)
  - [ ] 2.2.7: Max 3 passes total — after that, return whatever we have
  - [ ] 2.2.8: Log each pass and how many beats were removed

- [ ] Task 2.3: Add grid-conversion-aware reduction
  - [ ] 2.3.1: When simplification involves grid conversion (16th → 8th), account for the fact that two 16ths may snap to the same 8th position during `deduplicateConvertedBeats()`
  - [ ] 2.3.2: After grid conversion, re-check the beat count against the target before running `reduceDensityToTarget()`
  - [ ] 2.3.3: If grid conversion alone brought density within range, skip `reduceDensityToTarget()`

- [ ] Task 2.4: Write tests for target-based reduction
  - [ ] 2.4.1: Test `calculateBeatCountTarget()` returns correct counts for various BPM/difficulty combinations
  - [ ] 2.4.2: Test that `reduceDensityToTarget()` converges on easy density (< 1.0 nps) even with high-intensity beats
  - [ ] 2.4.3: Test that second pass with relaxed protections can remove beats that first pass couldn't
  - [ ] 2.4.4: Test safety floor — density never goes below `targetRange.min`
  - [ ] 2.4.5: Test that grid conversion alone is sufficient when many 16ths collapse to 8ths

## Phase 3: Global Target-Based Density Enhancement

Replace the probabilistic per-index multiplier with a global target calculator that fills empty indices first.

- [ ] Task 3.1: Create `calculateBeatsToAdd()` helper
  - [ ] 3.1.1: Input: current beat count, total quarter-note span, BPM, target difficulty
  - [ ] 3.1.2: Calculate target density per difficulty: easy=0.9, medium=1.25, hard=1.75 (same as Phase 2 Task 2.1)
  - [ ] 3.1.3: Output: `beatsToAdd = max(0, targetCount - currentCount)`
  - [ ] 3.1.4: Also return `maxBeatsPerIndex` based on the target difficulty's allowed grid types (e.g., straight_8th → max 2, straight_16th → max 4)

- [ ] Task 3.2: Rewrite `calculateProbabilisticTargetBeatsPerBeat()` → `distributeBeatsAcrossIndices()`
  - [ ] 3.2.1: Input: `beatsToAdd` (global count), `beatsByIndex` (current occupancy), `gridLock` (per-index grid types), `maxBeatsPerIndex` per grid type
  - [ ] 3.2.2: **Phase A — Fill empty indices first**: For each empty index (no existing beats), if the locked grid type allows it, assign 1-2 beats at preferred positions (position 0, then offbeats). Continue until either all empty indices have beats or `beatsToAdd` is exhausted.
    - Small gaps (1-2 consecutive empty indices): prefer pattern insertion where neighboring beat context is available for pattern matching.
    - Large gaps (3+ consecutive empty indices): use simple half-note or quarter-note beats to maintain the beat over the longer span, avoiding overly busy patterns in sparse sections.
  - [ ] 3.2.3: **Phase B — Fill partially occupied indices**: For each occupied index, calculate how many slots are still available (`maxPositions - currentCount`). Add beats at the empty positions. Continue until `beatsToAdd` is exhausted.
  - [ ] 3.2.4: **No probabilistic rolls** — the distribution is deterministic and greedy. Empty indices are always prioritized. Use the seed only for tiebreaking when multiple indices are equally good candidates (for reproducibility).
  - [ ] 3.2.5: Return `Map<number, number>` of `beatIndex → targetCount`

- [ ] Task 3.3: Refactor `enhanceBeats()` to use new distribution
  - [ ] 3.3.1: Replace call to `calculateProbabilisticTargetBeatsPerBeat()` with `distributeBeatsAcrossIndices()`
  - [ ] 3.3.2: Remove `enhancementLevel` ('moderate'/'heavy') — the target density range is now the sole driver of how many beats to add
  - [ ] 3.3.3: Remove the density multiplier from config (or keep as legacy, unused)
  - [ ] 3.3.4: Keep pattern insertion as the first strategy for filling occupied indices (it produces more musical results)
  - [ ] 3.3.5: Use `interpolateBeats()` for remaining slots, passing the locked grid type
  - [ ] 3.3.6: Use `createBeatsForEmptyIndex()` for empty indices, passing the locked grid type

- [ ] Task 3.4: Fix timestamp derivation in `interpolateBeats()`
  - [ ] 3.4.1: Accept `unifiedBeatMap` parameter
  - [ ] 3.4.2: Derive `beatStartTimestamp` from `unifiedBeatMap.beats[beatIndex].timestamp` (the authoritative quarter-note position), NOT from the reference beat's timestamp minus its grid offset
  - [ ] 3.4.3: Calculate `timestamp = beatStartTimestamp + (gridPosition * interval)` where interval is based on the locked grid type
  - [ ] 3.4.4: Remove the `referenceInterval` / `newInterval` split — since the grid type is locked, there's only one interval

- [ ] Task 3.5: Write tests for target-based enhancement
  - [ ] 3.5.1: Test `calculateBeatsToAdd()` returns correct counts
  - [ ] 3.5.2: Test `distributeBeatsAcrossIndices()` fills empty indices first
  - [ ] 3.5.3: Test that enhanced variant density falls within the target range
  - [ ] 3.5.4: Test that `interpolateBeats()` timestamps align with `unifiedBeatMap` quarter-note positions
  - [ ] 3.5.5: Test easy → medium enhancement targets ~1.25 nps midpoint (within [1.0, 1.5] range)
  - [ ] 3.5.6: Test easy → hard enhancement targets ~1.75 nps midpoint (above 1.5 floor)
  - [ ] 3.5.7: Test deterministic distribution (same input → same output)

## Phase 4: Convergence Validation

Add a post-generation check that validates all variants are within their density ranges.

- [ ] Task 4.1: Create `validateDensityInRange()` method
  - [ ] 4.1.1: Calculate final density for each variant using `calculateDensity()`
  - [ ] 4.1.2: Compare against `SUBDIVISION_LIMITS[difficulty].targetDensityRange`
  - [ ] 4.1.3: Log warnings for variants that are out of range (but don't throw — some edge cases like very short songs may not be able to hit exact targets)
  - [ ] 4.1.4: Return a validation result per variant: `{ inRange: boolean, density: number, targetRange: { min, max } }`

- [ ] Task 4.2: Wire validation into `generate()`
  - [ ] 4.2.1: After generating all variants, run `validateDensityInRange()` on each
  - [ ] 4.2.2: Log a summary: `easy: 0.8 nps (target [0, 1.0]) ✓`
  - [ ] 4.2.3: Include density validation info in the returned structure for downstream consumers

- [ ] Task 4.3: Write tests for convergence validation
  - [ ] 4.3.1: Test that easy variant density is <= 1.0 nps for a hard natural composite at various BPMs
  - [ ] 4.3.2: Test that medium variant density is in [1.0, 1.5] when going from hard → medium
  - [ ] 4.3.3: Test that enhanced medium variant density is >= 1.0 when going from easy → medium
  - [ ] 4.3.4: Test edge case: very sparse input (easy natural) still produces valid medium/hard variants

## Phase 5: Cleanup and Polish

- [ ] Task 5.1: Remove dead code
  - [ ] 5.1.1: Remove `calculateProbabilisticTargetBeatsPerBeat()` (replaced by `distributeBeatsAcrossIndices()`)
  - [ ] 5.1.2: Remove `enhancementDensityMultiplier` from config (replaced by global target calculation)
  - [ ] 5.1.3: Remove `enhancementLevel` parameter from `enhanceBeats()` signature
  - [ ] 5.1.4: Remove `getEnhancementLevel()` helper

- [ ] Task 5.2: Update config interface
  - [ ] 5.2.1: Add optional `densityTargetStrategy` field: `'midpoint' | 'lower' | 'upper'` (default `'midpoint'`) to control where in the target range to aim
  - [ ] 5.2.2: Add optional `maxReductionPasses` field (default 3)
  - [ ] 5.2.3: Keep existing config fields that are still used (`logConversions`, `preservePhraseBoundaries`, `interpolatedBeatIntensity`, etc.)

- [ ] Task 5.3: Update integration tests
  - [ ] 5.3.1: Update the "realistic composite stream" integration test to assert density ranges
  - [ ] 5.3.2: Add test for hard → easy → medium → hard full round-trip density values
  - [ ] 5.3.3: Remove tests for the old probabilistic scaling behavior

## Dependencies

- Phase 1 must complete before Phases 2, 3, 4 (grid lock is foundational)
- Phase 2 and Phase 3 are independent of each other and can be done in parallel
- Phase 4 depends on Phase 2 and Phase 3
- Phase 5 depends on all previous phases

## Phase 6: Documentation Updates

- [ ] Task 6.1: Update BEAT_DETECTION.md — Difficulty Variant Generation section (lines ~3684–3813)
  - [ ] 6.1.1: Rewrite "Variant Generation Strategy" to describe global target-based approach (calculate exact beat count from density range, distribute across indices)
  - [ ] 6.1.2: Update "Custom Configuration" table — remove `enhancementDensityMultiplier`, add `densityTargetStrategy` and `maxReductionPasses`
  - [ ] 6.1.3: Update "Simplification Rules" to describe convergence loop (first pass with full protections, second pass with relaxed protections, third pass as last resort)
  - [ ] 6.1.4: Update "Density Enhancement" to describe empty-index-first greedy distribution (no probabilistic rolls) and grid lock per beat index
  - [ ] 6.1.5: Add note about grid lock mechanism — `enforceSingleGridPerBeat()` runs once before density work, locks the winner per index, all subsequent operations respect the lock
  - [ ] 6.1.6: Update "Variant Metadata" interface if `DifficultyVariant` gains new fields (e.g., density validation result)
  - [ ] 6.1.7: Update code examples in "Usage Examples" if the public API surface changes

- [ ] Task 6.2: Update DATA_ENGINE_REFERENCE.md — DifficultyVariantGenerator section (lines ~2905–2932)
  - [ ] 6.2.1: Update the "Variant Generation Strategy" table (line 2928–2932) — replace "Heavy density enhancement" / "Moderate density enhancement" with "Global target-based enhancement"
  - [ ] 6.2.2: Update the description paragraph (line 2905) to mention global target calculation instead of fixed multipliers
  - [ ] 6.2.3: Update the `DifficultyVariantConfig` reference (line 2519 mentions `seed` for "deterministic density rolls" — reword to reflect deterministic grid-lock-based distribution)

- [ ] Task 6.3: Update DATA_ENGINE_REFERENCE.md — RhythmGenerator config table
  - [ ] 6.3.1: Line 2519: Update `seed` description from "deterministic density rolls" to "deterministic grid-lock-based distribution"
  - [ ] 6.3.2: Line 4524: Update "density rolls, difficulty variant beat-level decisions" in the seed description to reflect new behavior

- [ ] Task 6.4: Minor updates in both docs
  - [ ] 6.4.1: BEAT_DETECTION.md line 28: Update "Pattern library for density enhancement" in the table of contents link text if the section heading changes
  - [ ] 6.4.2: BEAT_DETECTION.md lines 3625, 3646, 3799: Update "density enhancement" references to "density enhancement (global target-based)" where helpful for clarity
  - [ ] 6.4.3: DATA_ENGINE_REFERENCE.md line 2534–2535: No changes needed (StreamScorer/CompositeStreamGenerator are unaffected)

## Dependencies

- Phase 1 must complete before Phases 2, 3, 4 (grid lock is foundational)
- Phase 2 and Phase 3 are independent of each other and can be done in parallel
- Phase 4 depends on Phase 2 and Phase 3
- Phase 5 depends on all previous phases
- Phase 6 depends on Phase 5 (docs should reflect final code state)

## Resolved Questions

- **Density target midpoint per difficulty** — Yes, configurable per difficulty. Easy range [0, 1.0] → target 0.9 (biased high to preserve musical interest). Medium range [1.0, 1.5] → target 1.25 (true midpoint). Hard range [1.5, ∞) → target 1.75. The `'midpoint' | 'lower' | 'upper'` strategy in config still applies as an offset from these defaults.
- **Pattern insertion vs interpolation for empty indices** — Context-dependent. Use pattern insertion for small gaps (1-2 consecutive empty indices) where musical context from neighboring beats is available. Use simple half-note or quarter-note beats for large gaps (3+ consecutive empty indices) to maintain the beat over a longer span of previously empty beats. This keeps the rhythm grounded during sparse sections.
- **Validation behavior** — Warn only. Edge cases (very short songs, extreme tempos) may not be able to hit exact targets, so throwing would be too rigid.
