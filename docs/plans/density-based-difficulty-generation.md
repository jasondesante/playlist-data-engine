# Density-Based Difficulty Generation - Implementation Plan

## Overview

Add density-based level generation that produces a single level at a time with granular, independent control over **target density** (notes/second) and **max quantization grid**. This provides a continuous spectrum of difficulty alongside the existing easy/medium/hard/natural presets.

### Why this exists

The existing pipeline generates 4 preset variants (easy/medium/hard/natural) whose subdivision limits and density targets are tightly coupled to the difficulty label. This new API decouples those controls so a caller can request, for example, a dense chart (3.0 nps) with only 8th note quantization, or a sparse chart (0.5 nps) with 16th note quantization.

### Current pipeline

```
AudioBuffer
  -> Multi-band analysis + transient detection
  -> Rhythm quantization (grid decisions per beat)
  -> Phrase analysis (repeating patterns)
  -> Density analysis (notes/sec, natural difficulty)
  -> Stream scoring + composite generation (best sections per beat range)
  -> RhythmicBalancer.balance()           <- structural cleanup
  -> DifficultyVariantGenerator.generate() <- easy/medium/hard/natural presets
  -> [cached in GeneratedRhythm.difficultyVariants]

LevelGenerator.generate():
  RhythmGenerator.generate()               <- returns GeneratedRhythm
  -> PitchBeatLinker + MelodyContourAnalyzer <- optional pitch analysis
  -> ButtonMapper.map(rhythm, difficulty)   <- button assignment using variant from difficultyVariants[difficulty]
  -> BeatConverter.fromMappedResult()       <- convert to ChartedBeatMap
  -> returns GeneratedLevel { chart, variant, rhythm, pitchAnalysis, metadata }
```

### New API surface

```
DifficultyVariantGenerator.generateAtDensity(composite, config, ...) -> DifficultyVariant
DifficultyVariantGenerator.generateAtDensities(composite, configs, ...) -> Map<string, DifficultyVariant>

ButtonMapper.mapVariant(variant, rhythmMetadata, pitchAnalysis?) -> MappedLevelResult

LevelGenerator.generateAtDensity(audioBuffer, beatMap, config, ...) -> GeneratedLevel
LevelGenerator.generateAtDensities(audioBuffer, beatMap, configs, ...) -> Map<string, GeneratedLevel>
```

The density variant is a plain `DifficultyVariant` with `difficulty: 'custom'`. No new variant type is needed — it flows through ButtonMapper and BeatConverter without changes.

### Design decisions

| Decision | Resolution | Why |
|----------|-----------|-----|
| Difficulty coupling | Add `'custom'` to `DifficultyLevel`, refactor existing methods with optional override params | Avoids parallel method copies; existing methods gain optional `allowedGridTypes`/`targetDensity` params that bypass SUBDIVISION_LIMITS lookup |
| Density unit | Absolute notes/second | Caller knows BPM context and understands subdivision interaction with tempo |
| Density and quantization coupling | Independent parameters | The whole point — decouple density from grid type restrictions |
| BPM-based quantization defaults | Two thresholds (70 + 120), matching medium's behavior | Covers the standard playability restriction tier; configurable |
| Impossible density/grid combos | Best effort + `densityClamped` warning | Don't throw errors for edge cases; return what's achievable |
| Controller mode | Controller-agnostic | Density generation receives already-balanced composite from upstream; no controller-specific logic needed |
| Variant storage | Standalone only | `generateAtDensity()` returns a `GeneratedLevel` directly; no changes to `GeneratedRhythm` interface or serialization |
| Unchanged density handling | No tolerance — always apply grid restrictions | Ensures `maxGridType` is always enforced regardless of current density |

---

## Phase 1: Types and Configuration

**File**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`

- [x] **1.1 Add `'custom'` to `DifficultyLevel`**
  ```typescript
  export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'natural' | 'custom';
  ```

- [x] **1.2 Add `'custom'` to `SUBDIVISION_LIMITS`**
  ```typescript
  custom: {
      maxSubdivision: 'sixteenth',
      allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
      description: 'Custom density-based variant — parameters provided at generation time',
      targetDensityRange: { min: 0, max: Infinity },
  }
  ```
  This entry is a fallback/sentinel. When `'custom'` is used, the actual allowed grid types and density target come from the `DensityGenerationConfig`, not from this static config.

- [x] **1.3 Add `DensityGenerationConfig` interface**
  ```typescript
  export interface DensityGenerationConfig {
      /** Target density in notes per second */
      targetDensity: number;

      /** Maximum quantization grid allowed (independent of density) */
      maxGridType: ExtendedGridType;

      /**
       * When true, apply BPM-based restrictions on top of maxGridType.
       * Uses medium's thresholds (default: 70 BPM):
       *   - At BPM >= 70: straight_16th and triplet_8th restricted to straight_8th
       * When false, only maxGridType is enforced regardless of BPM.
       * Default: false
       */
      bpmBasedQuantization?: boolean;

      /** BPM threshold for restricting 16th/triplet_8th to 8ths. Default: 70 (MEDIUM_RESTRICT_BPM) */
      restrictBpm?: number;

      /** BPM threshold for restricting 8ths to quarter notes. Default: 120 (EASY_QUARTER_NOTE_BPM) */
      quarterNoteBpm?: number;
  }
  ```

---

## Phase 2: Internal Method Refactoring

**File**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`

- [x] **2.1 Add `deriveAllowedGridTypes()` helper**
  - [x] Takes a `DensityGenerationConfig` and BPM, returns the effective `ExtendedGridType[]`
  - [x] Implement grid hierarchy (from coarsest to finest):

    | maxGridType | Positions/beat | Derived allowed types |
    |-------------|---------------|-----------------------|
    | `straight_4th` | 1 | `[straight_4th]` |
    | `straight_8th` | 2 | `[straight_8th, quarter_triplet]` |
    | `quarter_triplet` | 1 | `[quarter_triplet, straight_8th]` (same as straight_8th) |
    | `triplet_8th` | 3 | `[triplet_8th, straight_8th, quarter_triplet]` |
    | `straight_16th` | 4 | `[straight_16th, triplet_8th, straight_8th, quarter_triplet]` |

  - [x] After deriving base types from `maxGridType`, if `bpmBasedQuantization` is true, apply thresholds:
    ```
    BPM >= restrictBpm (default 70):
      - Remove straight_16th and triplet_8th from allowed types

    BPM > quarterNoteBpm (default 120):
      - Remove straight_8th from allowed types (only straight_4th and quarter_triplet remain)
    ```

- [x] **2.2 Add `calculateMaxAchievableDensity()` helper**
  - [x] Given allowed grid types and BPM, calculate theoretical max notes/second:
    ```
    quarterNoteInterval = 60 / bpm
    maxPositionsPerBeat = max(allowedGridTypes.map(g => GRID_TYPE_MAX_POSITIONS[g]))
    maxDensity = maxPositionsPerBeat / quarterNoteInterval
    ```
  - [x] Used to detect impossible configurations and apply best-effort clamping

- [x] **2.3 Handle `'custom'` in existing methods**
  - [x] Add `'custom'` branch to `getTempoAwareAllowedGridTypes()` (line 218) — before the exhaustive check at line 248:
    ```typescript
    if (difficulty === 'custom') {
        // Caller must pass allowed grid types directly via the density config.
        // This branch should not be reached in normal flow — density generation
        // uses deriveAllowedGridTypes() instead.
        return [...SUBDIVISION_LIMITS.custom.allowedGridTypes];
    }
    ```
  - [x] Add `'custom'` handling in `calculateBeatCountTarget()` (line 1626) — handle alongside `'natural'` at line 1651:
    ```typescript
    if (targetDifficulty === 'natural' || targetDifficulty === 'custom') {
        const currentDensity = durationSeconds > 0 ? currentBeatCount / durationSeconds : 0;
        return { targetCount: currentBeatCount, maxCount: currentBeatCount, minCount: currentBeatCount, targetDensity: currentDensity };
    }
    ```

- [x] **2.4 Refactor `simplifyBeats()` — add optional override params**
  - [x] Add `allowedGridTypes?: ExtendedGridType[]` param (override `getTempoAwareAllowedGridTypes()`)
  - [x] Add `targetDensity?: number` param (override `calculateBeatCountTarget()`)
  - [x] New signature:
    ```typescript
    private simplifyBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        quarterNoteInterval: number,
        isHeavySimplification?: boolean,
        phraseAnalysis?: PhraseAnalysisResult,
        bpm?: number,
        gridLock?: Map<number, ExtendedGridType>,
        durationSeconds?: number,
        allowedGridTypes?: ExtendedGridType[],    // NEW: override getTempoAwareAllowedGridTypes()
        targetDensity?: number                   // NEW: override calculateBeatCountTarget()
    ): { beats: VariantBeat[]; metadata: SubdivisionConversionMetadata }
    ```
  - [x] When `allowedGridTypes` is provided, use it directly instead of `getTempoAwareAllowedGridTypes(targetDifficulty, bpm)` (line 1333)
  - [x] When `targetDensity` is provided, compute `targetCount = Math.round(targetDensity * durationSeconds)` directly instead of calling `calculateBeatCountTarget()` (line 1338-1340)
  - [x] When both omitted, existing behavior is unchanged — all existing callers pass no extra args, zero regression risk

- [x] **2.5 Refactor `enhanceBeats()` — add optional override params**
  - [ ] Add `allowedGridTypes?: ExtendedGridType[]` param (override `getTempoAwareAllowedGridTypes()` for maxBeatsPerIndex)
  - [ ] Add `targetDensity?: number` param (override `calculateBeatsToAdd()` target)
  - [ ] New signature:
    ```typescript
    private enhanceBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        bpm: number,
        unifiedBeatMap: UnifiedBeatMap,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>,
        quarterNoteInterval?: number,
        gridLock?: Map<number, ExtendedGridType>,
        allowedGridTypes?: ExtendedGridType[],    // NEW: override getTempoAwareAllowedGridTypes() for maxBeatsPerIndex
        targetDensity?: number                   // NEW: override calculateBeatsToAdd() target
    ): { beats: VariantBeat[]; metadata: EnhancementMetadata }
    ```
  - [ ] When `allowedGridTypes` is provided, use it for `getMaxBeatsPerIndexFromGridTypes()` instead of deriving from `targetDifficulty` (line 1725 via `calculateBeatsToAdd`)
  - [ ] When `targetDensity` is provided, compute `beatsToAdd = Math.max(0, Math.round(targetDensity * durationSeconds) - cleanedBeats.length)` directly instead of calling `calculateBeatsToAdd()` (line 2544)
  - [ ] Cap `beatsToAdd` to prevent runaway enhancement (max 4x current density)
  - [ ] When both omitted, existing behavior unchanged

- [ ] **2.6 Refactor `lockGridPerBeatIndex()` — add optional override param**
  - [ ] Add `allowedGridTypes?: ExtendedGridType[]` param
  - [ ] New signature:
    ```typescript
    lockGridPerBeatIndex(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        bpm: number,
        gridDecisions?: Map<number, GridDecision>,
        allowedGridTypes?: ExtendedGridType[]    // NEW: override getTempoAwareAllowedGridTypes() for defaults
    ): GridLockResult
    ```
  - [ ] When `allowedGridTypes` is provided, use it as the fallback for empty beat indices instead of `getTempoAwareAllowedGridTypes(targetDifficulty, bpm)` (line 797)
  - [ ] When omitted, existing behavior unchanged. This method is already public, so the new param is backwards-compatible

- [ ] **2.7 Verify `reduceDensityToTarget()` needs no changes**
  - [ ] Confirm it already accepts `targetCount` and `durationSeconds` as optional params and is called through `simplifyBeats()` — no refactoring needed

---

## Phase 3: Public API on DifficultyVariantGenerator

**File**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`

- [ ] **3.1 Add `generateAtDensity()` public method**
  ```typescript
  generateAtDensity(
      composite: CompositeStream,
      config: DensityGenerationConfig,
      unifiedBeatMap: UnifiedBeatMap,
      phraseAnalysis?: PhraseAnalysisResult,
      gridDecisions?: Map<number, GridDecision>
  ): DifficultyVariant
  ```
  - [ ] Calculate current composite density: `beats.length / durationSeconds`
  - [ ] Derive BPM from `unifiedBeatMap.quarterNoteBpm` (fallback 120)
  - [ ] Derive duration from `unifiedBeatMap.duration` (fallback 120)
  - [ ] Derive allowed grid types via `deriveAllowedGridTypes(config, bpm)`
  - [ ] Calculate max achievable density via `calculateMaxAchievableDensity()`
  - [ ] If `targetDensity > maxAchievableDensity`: clamp target to max, set `densityClamped` flag in metadata, log warning
  - [ ] Lock grid types per beat index via `lockGridPerBeatIndex()` with `'custom'` difficulty + `allowedGridTypes` override
  - [ ] If `currentDensity > targetDensity`: call `simplifyBeats()` with `allowedGridTypes` + `targetDensity` overrides
  - [ ] If `currentDensity < targetDensity`: call `enhanceBeats()` with `allowedGridTypes` + `targetDensity` overrides
  - [ ] If `currentDensity` approximately equals `targetDensity` (within 10%): still apply grid restriction via `simplifyBeats()` if any disallowed grid types exist in the composite
  - [ ] Run `enforceSingleGridPerBeat()` on result
  - [ ] Build and return `DifficultyVariant` with `difficulty: 'custom'`
  - [ ] Returns a standard `DifficultyVariant` — no new type needed. The `difficulty: 'custom'` label tells downstream consumers this came from density generation

- [ ] **3.2 Add `generateAtDensities()` convenience method**
  ```typescript
  generateAtDensities(
      composite: CompositeStream,
      configs: { label: string; config: DensityGenerationConfig }[],
      unifiedBeatMap: UnifiedBeatMap,
      phraseAnalysis?: PhraseAnalysisResult,
      gridDecisions?: Map<number, GridDecision>
  ): Map<string, DifficultyVariant>
  ```
  - [ ] Generates multiple custom variants in one call
  - [ ] Each variant is independent (deep copies of composite beats)
  - [ ] Returns a `Map` keyed by label

---

## Phase 4: ButtonMapper Integration

**File**: `src/core/generation/ButtonMapper.ts`

- [ ] **4.1 Add `mapVariant()` method**
  - [ ] The existing `ButtonMapper.map()` accesses `rhythm.difficultyVariants[difficulty]` which only works for preset difficulty labels stored on `GeneratedRhythm`. For standalone density variants, add a method that accepts a variant directly:
    ```typescript
    mapVariant(
        variant: DifficultyVariant,
        rhythmMetadata: RhythmMetadata,
        pitchAnalysis?: PitchAtBeat[]
    ): MappedLevelResult
    ```
  - [ ] Reuses all existing mapping logic (`mapButtons()`, `buildMetadata()`) but takes a variant directly instead of looking it up from `GeneratedRhythm`
  - [ ] Refactor existing `map()` method to call `mapVariant()` internally:
    ```typescript
    map(
        generatedRhythm: GeneratedRhythm,
        difficulty: DifficultyLevel,
        pitchAnalysis?: PitchAtBeat[]
    ): MappedLevelResult {
        const variant = generatedRhythm.difficultyVariants[difficulty];
        return this.mapVariant(variant, generatedRhythm.metadata, pitchAnalysis);
    }
    ```
  - [ ] For `mapButtons()` pattern selection with `'custom'` variants: default to `'medium'` pattern selection since the density path doesn't define a pattern difficulty

---

## Phase 5: LevelGenerator Integration

**File**: `src/core/generation/LevelGenerator.ts`

- [ ] **5.1 Add `generateAtDensity()` method**
  ```typescript
  async generateAtDensity(
      audioBuffer: AudioBuffer,
      unifiedBeatMap: UnifiedBeatMap,
      config: DensityGenerationConfig,
      progressCallback?: LevelProgressCallback,
      signal?: AbortSignal
  ): Promise<GeneratedLevel>
  ```
  - [ ] Generate rhythm (reuse cached rhythm if available, same as `generate()`)
  - [ ] Get the balanced composite from `rhythm.composite`
  - [ ] Call `this.variantGenerator.generateAtDensity(composite, config, unifiedBeatMap, phraseAnalysis, gridDecisions)` to get `DifficultyVariant`
  - [ ] Run pitch analysis if enabled (reuse cached pitch if available)
  - [ ] Call `buttonMapper.mapVariant(variant, rhythm.metadata, pitchAnalysis?.pitchByBeat)` for button mapping
  - [ ] Convert to `ChartedBeatMap` via `BeatConverter.fromMappedResult()`
  - [ ] Return `GeneratedLevel` (same type as `generate()`, fully compatible downstream)

- [ ] **5.2 Add `generateAtDensities()` batch method**
  ```typescript
  async generateAtDensities(
      audioBuffer: AudioBuffer,
      unifiedBeatMap: UnifiedBeatMap,
      configs: { label: string; config: DensityGenerationConfig }[],
      progressCallback?: LevelProgressCallback,
      signal?: AbortSignal
  ): Promise<Map<string, GeneratedLevel>>
  ```
  - [ ] Generates rhythm and pitch analysis once (shared across all configs)
  - [ ] Generates each density variant independently via `generateAtDensity()`
  - [ ] Returns a `Map` keyed by label

---

## Phase 6: Exports

**File**: `src/index.ts`

- [ ] Export `DensityGenerationConfig` interface
- [ ] Confirm `generateAtDensity()` and `generateAtDensities()` are accessible via existing `DifficultyVariantGenerator` export

---

## Phase 7: Tests

**File**: `tests/unit/beat/densityBasedGeneration.test.ts` (new)

- [ ] **Core generation tests**
  - [ ] `generateAtDensity()` with density higher than natural -> enhancement occurs
  - [ ] `generateAtDensity()` with density lower than natural -> simplification occurs
  - [ ] `generateAtDensity()` with density matching natural -> grid restrictions still applied (no tolerance)
  - [ ] `generateAtDensity()` with density 0 -> empty or near-empty result

- [ ] **Quantization independence tests**
  - [ ] Dense chart (3.0 nps) with 8th note max grid -> only 8ths present
  - [ ] Sparse chart (0.5 nps) with 16th note max grid -> 16ths allowed but density stays low
  - [ ] `maxGridType: 'straight_4th'` -> only quarter notes

- [ ] **BPM-based quantization tests**
  - [ ] `bpmBasedQuantization: true` at 80 BPM -> 16ths restricted to 8ths
  - [ ] `bpmBasedQuantization: true` at 60 BPM -> 16ths allowed
  - [ ] `bpmBasedQuantization: false` at 80 BPM -> 16ths still allowed
  - [ ] `bpmBasedQuantization: true` at 130 BPM -> restricted to quarter notes
  - [ ] Custom thresholds: `restrictBpm: 90, quarterNoteBpm: 140` -> correct behavior at 100 BPM and 150 BPM

- [ ] **Best-effort / clamping tests**
  - [ ] Target density 4.0 nps with 8th-only grid at 60 BPM (max achievable ~2.0) -> returns ~2.0 with density clamped

- [ ] **Multi-variant tests**
  - [ ] `generateAtDensities()` with multiple configs -> correct map returned
  - [ ] Multiple variants are independent (no shared mutations)

- [ ] **Edge cases**
  - [ ] Single beat input
  - [ ] Empty composite
  - [ ] Very high density target (4.0+ nps)
  - [ ] maxGridType finer than what exists in the composite

- [ ] **Accuracy tests**
  - [ ] Final density is close to target density (within tolerance, or clamped)
  - [ ] `editAmount` is accurate for both simplify and enhance paths
  - [ ] `enforceSingleGridPerBeat()` works after density-based generation

- [ ] **Compatibility tests**
  - [ ] Variant with `difficulty: 'custom'` has all `DifficultyVariant` fields
  - [ ] `ButtonMapper.mapVariant()` works with custom variant
  - [ ] `BeatConverter.fromMappedResult()` works with a mapped custom variant

- [ ] **Regression tests**
  - [ ] Existing `generate()` for easy/medium/hard/natural still produces identical results
  - [ ] `simplifyBeats()` without override params -> same behavior as before
  - [ ] `enhanceBeats()` without override params -> same behavior as before
  - [ ] `lockGridPerBeatIndex()` without override params -> same behavior as before
  - [ ] `getTempoAwareAllowedGridTypes()` for easy/medium/hard/natural -> same behavior as before

---

## Phase 8: Documentation

- [ ] **DATA_ENGINE_REFERENCE.md**
  - [ ] Add `DensityGenerationConfig` to type exports list
  - [ ] Update DifficultyVariantGenerator method table to include `generateAtDensity()` and `generateAtDensities()`
  - [ ] Add density-based generation section
  - [ ] Document the maxGridType hierarchy and derived allowed grid types
  - [ ] Document `'custom'` difficulty level

- [ ] **docs/BEAT_DETECTION.md**
  - [ ] Add "Density-Based Generation" subsection
  - [ ] Explain continuous difficulty spectrum vs preset labels
  - [ ] Document the two independent parameters (density + quantization)
  - [ ] Document BPM-based quantization toggle with configurable thresholds
  - [ ] Add usage examples

---

## Files to modify

| File | Changes |
|------|---------|
| `src/core/analysis/beat/DifficultyVariantGenerator.ts` | Core implementation (Phases 1-3): add `'custom'` to `DifficultyLevel` + `SUBDIVISION_LIMITS`, `DensityGenerationConfig`, `deriveAllowedGridTypes()`, `calculateMaxAchievableDensity()`, handle `'custom'` in `getTempoAwareAllowedGridTypes()` + `calculateBeatCountTarget()`, refactor `simplifyBeats`/`enhanceBeats`/`lockGridPerBeatIndex` with optional override params, `generateAtDensity()`, `generateAtDensities()` |
| `src/core/generation/ButtonMapper.ts` | `mapVariant()` method (Phase 4), refactor `map()` to call through |
| `src/core/generation/LevelGenerator.ts` | `generateAtDensity()`, `generateAtDensities()` (Phase 5) |
| `src/index.ts` | Export `DensityGenerationConfig` (Phase 6) |
| `tests/unit/beat/densityBasedGeneration.test.ts` | Tests (Phase 7) — new file |
| `DATA_ENGINE_REFERENCE.md` | Documentation (Phase 8) |
| `docs/BEAT_DETECTION.md` | Documentation (Phase 8) |

## Existing infrastructure reused

| Component | How it's reused |
|-----------|-----------------|
| `calculateDensity()` | Private method already returns notes/second — used as-is |
| `simplifyBeats()` | Refactored with optional `allowedGridTypes` + `targetDensity` params |
| `enhanceBeats()` | Refactored with optional `allowedGridTypes` + `targetDensity` params |
| `reduceDensityToTarget()` | Already accepts optional `targetCount`/`durationSeconds` — no changes needed |
| `lockGridPerBeatIndex()` | Refactored with optional `allowedGridTypes` param |
| `getTempoAwareAllowedGridTypes()` | Added `'custom'` branch; density path uses `deriveAllowedGridTypes()` instead |
| `enforceSingleGridPerBeat()` | Called after density adjustment, used as-is |
| `interpolateBeats()` | Used by `enhanceBeats()` for density enhancement, no changes needed |
| `convertBeatGridType()` | Used by `simplifyBeats()` for grid conversion, no changes needed |
| `deduplicateConvertedBeats()` | Used after grid conversion, no changes needed |
| `GRID_TYPE_MAX_POSITIONS` | Used by `calculateMaxAchievableDensity()` |
| `ButtonMapper.mapButtons()` | Reused via new `mapVariant()` entry point |
| `BeatConverter.fromMappedResult()` | Reused as-is, works with any DifficultyVariant |
| `CompositeStream.quarterNoteInterval` | Available on composite for `simplifyBeats`/`enhanceBeats` calls |

## Dependencies

- None — builds entirely on existing `DifficultyVariantGenerator` infrastructure
- No changes to RhythmicBalancer (runs before this step in the pipeline)
- No changes to composite generation (same balanced composite input)
- No changes to existing preset difficulty generation
- No changes to `GeneratedRhythm` interface or serialization

## Questions/Unknowns

None — all design decisions are resolved above.

## What changed from the previous plan

1. **`getTempoAwareAllowedGridTypes()` exhaustive check** — Must explicitly handle `'custom'` to avoid breaking the TypeScript exhaustive check (`const _exhaustive: never = difficulty` at line 248). Old plan mentioned adding a branch but didn't flag the breakage risk.
2. **`calculateBeatCountTarget()` `'custom'` handling** — Must handle `'custom'` in the `densityMidpoints` lookup (line 1651) alongside `'natural'`. Old plan proposed a `targetDensity` override param on this method instead; the new approach just handles `'custom'` as a passthrough and lets `simplifyBeats`/`enhanceBeats` compute target counts directly from the override density.
3. **Updated method signatures** — `simplifyBeats()` now has default params `isHeavySimplification: boolean = false`, `bpm: number = 120`, `durationSeconds: number = 120`. `enhanceBeats()` now has default param `quarterNoteInterval: number = 0.5`. Old plan had incorrect signatures.
4. **`mapButtons()` pattern selection** — Noted that it's private and uses `difficulty` for pattern selection. For `'custom'` variants, default to `'medium'` pattern difficulty.
5. **Removed `reduceDensityToTarget()` refactoring** — Already accepts `targetCount`/`durationSeconds` and is called through `simplifyBeats()`, so no changes needed.
6. **Removed `calculateBeatCountTarget()` refactoring** — Instead of adding a `targetDensity` override param, `simplifyBeats()` and `enhanceBeats()` compute `targetCount = round(targetDensity * durationSeconds)` directly when the override is provided.
7. **Documented `CompositeStream.quarterNoteInterval`** as the source for `quarterNoteInterval` in the density path.
