# Density-Based Difficulty Generation - Implementation Plan

## Overview

Add a `generateAtDensity()` method to `DifficultyVariantGenerator` that accepts a single target density number (transients per beat) instead of a preset difficulty label. This gives a continuous spectrum of difficulty choices alongside the existing easy/medium/hard/natural presets.

Subdivision limits are auto-derived from the target density:
- `targetDensity < 1.0` → 8th notes max (`straight_8th`, `quarter_triplet`)
- `targetDensity >= 1.0` → all subdivisions allowed

## Phase 1: Density-Aware Internals in DifficultyVariantGenerator

**File**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`

- [ ] Add `deriveSubdivisionConfig(targetDensity: number): SubdivisionLimitConfig` private helper
  - Returns a `SubdivisionLimitConfig` with:
    - `allowedGridTypes`: `['straight_8th', 'quarter_triplet']` if density < 1.0, else all 4 types
    - `maxSubdivision`: `'eighth'` if density < 1.0, else `'sixteenth'`
    - `targetDensityRange`: `{ min: 0, max: targetDensity }`
  - This replaces the `SUBDIVISION_LIMITS[difficulty]` lookup for density-based mode

- [ ] Add `reduceDensityToValue()` overload
  - New private method: `reduceDensityToValue<T>(beats, targetDensity, metadata, phraseMembership): T[]`
  - Same logic as existing `reduceDensityToTarget()` but takes a raw `targetDensity: number` instead of `targetDifficulty: DifficultyLevel`
  - Uses `targetDensity` directly instead of `SUBDIVISION_LIMITS[targetDifficulty].targetDensityRange.max`
  - Extract shared removal logic from `reduceDensityToTarget()` into a shared helper to avoid duplication

- [ ] Add `enhanceToDensity()` private method
  - Signature: `enhanceToDensity(beats, targetDensity, phraseAnalysis?, gridDecisions?, quarterNoteInterval): { beats: VariantBeat[]; metadata: EnhancementMetadata }`
  - Calculates `densityMultiplier = targetDensity / currentDensity` instead of using the config-based multiplier
  - Caps multiplier at 4.0 to prevent runaway enhancement
  - Reuses existing `interpolateBeats()`, `tryInsertPattern()`, `groupBeatsByIndex()`, `deduplicateEnhancedBeats()`
  - Calls `enforceSingleGridPerBeat()` on input before calculating targets (same pattern as existing `enhanceBeats()`)

- [ ] Add `simplifyToDensity()` private method
  - Signature: `simplifyToDensity(beats, targetDensity, quarterNoteInterval, phraseAnalysis?): { beats: VariantBeat[]; metadata: SubdivisionConversionMetadata }`
  - Calls `deriveSubdivisionConfig(targetDensity)` for allowed grid types
  - Converts disallowed grid types (same logic as existing `simplifyBeats()`)
  - Calls `reduceDensityToValue()` instead of `reduceDensityToTarget()`
  - Calls `enforceSingleGridPerBeat()` on input before calculations

## Phase 2: Public API

**File**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`

- [ ] Add `generateAtDensity()` public method
  ```typescript
  generateAtDensity(
      composite: CompositeStream,
      targetDensity: number,
      phraseAnalysis?: PhraseAnalysisResult,
      gridDecisions?: Map<number, GridDecision>
  ): DensityVariant
  ```
  - Calculates current composite density via `calculateDensity()`
  - If `|current - target| <= 0.15`: return unedited (close enough)
  - If `current > target`: call `simplifyToDensity()`
  - If `current < target`: call `enhanceToDensity()`
  - Runs `enforceSingleGridPerBeat()` on result
  - Validates against derived subdivision limits
  - Returns a `DensityVariant` with `targetDensity`, `actualDensity`, `editType`, `beats`

- [ ] Add `DensityVariant` interface
  ```typescript
  export interface DensityVariant {
      targetDensity: number;       // What was requested
      actualDensity: number;       // What was achieved
      beats: VariantBeat[];
      isUnedited: boolean;
      editType: 'none' | 'simplified' | 'enhanced';
      editAmount: number;
  }
  ```

- [ ] Add `generateAtDensities()` public method
  ```typescript
  generateAtDensities(
      composite: CompositeStream,
      densities: { label: string; density: number }[],
      phraseAnalysis?: PhraseAnalysisResult,
      gridDecisions?: Map<number, GridDecision>
  ): Map<string, DensityVariant>
  ```
  - Convenience: generates multiple custom variants in one call
  - Returns a map keyed by label

## Phase 3: RhythmGenerator Integration

**File**: `src/core/generation/RhythmGenerator.ts`

- [ ] Add `customVariants` field to `GeneratedRhythm` interface
  ```typescript
  export interface GeneratedRhythm {
      difficultyVariants: { easy: DifficultyVariant; medium: DifficultyVariant; hard: DifficultyVariant; natural: DifficultyVariant };
      customVariants?: Map<string, DensityVariant>;  // NEW
      // ... rest unchanged
  }
  ```

- [ ] Add `generateDifficultyVariantsAtDensity()` method
  ```typescript
  generateDifficultyVariantsAtDensity(
      composite: CompositeStream,
      targetDensities: { label: string; density: number }[],
      phraseAnalysis: PhraseAnalysisResult,
      quantizationResult: QuantizedBandStreams
  ): Map<string, DensityVariant>
  ```
  - Mirrors existing `generateDifficultyVariants()` but calls `generateAtDensities()`

- [ ] Update `generate()` method to accept optional `customDensities` option
  - If provided, generates custom variants alongside preset variants
  - Stores results in `customVariants` field

- [ ] Update serialization (`toJSON`/`fromJSON`) for `customVariants`
  - Convert `Map<string, DensityVariant>` to/from array of `{ label, ...DensityVariant }`

- [ ] Add static convenience method `generateForDensity()`
  ```typescript
  static async generateForDensity(
      audioBuffer: AudioBuffer,
      unifiedBeatMap: UnifiedBeatMap,
      targetDensity: number
  ): Promise<DensityVariant>
  ```

## Phase 4: Exports

**File**: `src/index.ts`

- [ ] Export `DensityVariant` type
- [ ] Export `generateAtDensity` and `generateAtDensities` are already accessible via `DifficultyVariantGenerator` export

## Phase 5: Tests

**File**: `tests/unit/beat/densityBasedGeneration.test.ts` (new)

- [ ] Test `generateAtDensity()` with density higher than natural → enhancement occurs
- [ ] Test `generateAtDensity()` with density lower than natural → simplification occurs
- [ ] Test `generateAtDensity()` with density ≈ natural → unedited result
- [ ] Test subdivision derivation: density < 1.0 → only 8th notes
- [ ] Test subdivision derivation: density >= 1.0 → 16th notes allowed
- [ ] Test `generateAtDensities()` with multiple targets
- [ ] Test edge cases: density 0 (empty), density 4.0 (max grid), single beat input
- [ ] Test `enforceSingleGridPerBeat` works after density-based generation
- [ ] Test `editAmount` is accurate for both simplify and enhance paths
- [ ] Test `actualDensity` is close to `targetDensity` (within ±0.3 tolerance)

## Phase 6: Documentation

### DATA_ENGINE_REFERENCE.md

- [ ] Add `DensityVariant` to the type exports list (Rhythm Generation Types)
- [ ] Update DifficultyVariantGenerator method table to include `generateAtDensity()` and `generateAtDensities()`
- [ ] Add `DensityVariant` interface documentation alongside existing `DifficultyVariant` docs
- [ ] Add density-based auto-derivation table to the subdivision limits section:
  - `< 1.0 t/b` → 8th notes (`straight_8th`, `quarter_triplet`)
  - `>= 1.0 t/b` → 16th notes (all grid types)
- [ ] Update RhythmGenerator method table with `generateDifficultyVariantsAtDensity()` and static `generateForDensity()`
- [ ] Update `GeneratedRhythm` interface docs to include `customVariants?: Map<string, DensityVariant>` field

### docs/BEAT_DETECTION.md

- [ ] Add "Density-Based Generation" subsection after the existing Difficulty Variant Generation section
  - Explain continuous difficulty spectrum vs preset labels
  - Document auto-derivation rules for subdivision limits from target density
  - Document `DensityVariant` output interface
  - Add usage examples for `generateAtDensity()` and `generateAtDensities()`

## Dependencies

- None - builds on existing `DifficultyVariantGenerator` infrastructure

## Questions/Unknowns

- Should `generateAtDensity` accept an optional `maxSubdivision` override to bypass the auto-derive? (Deferred - start with auto-derive only)
