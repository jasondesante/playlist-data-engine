# Simplify Beat Interpolation: Remove Algorithm Choice

## Overview

Based on research and testing, the **Adaptive Phase-Locked Grid** algorithm has been determined to be the best approach for beat interpolation. This plan removes the algorithm selection feature, eliminating the other two algorithms (Histogram-Based Fixed Grid and Dual-Pass with Confidence Scoring) and making Adaptive Phase-Locked Grid the sole algorithm.

**Rationale**: After extensive testing with the demo frontend app, Adaptive Phase-Locked Grid provides the best balance of accuracy and tempo drift handling. Removing algorithm choice simplifies the API, reduces maintenance burden, and removes unused code paths.

---

## Files Affected

### Core Library Files (Must Modify)
| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Remove `InterpolationAlgorithm` type, update options |
| `src/core/analysis/beat/BeatInterpolator.ts` | Remove 2 algorithm methods, simplify `generateGrid()` |
| `src/core/analysis/beat/index.ts` | Remove `InterpolationAlgorithm` export |
| `src/core/analysis/beat/utils/beatInterpolationComparison.ts` | Delete entirely |
| `src/core/analysis/beat/utils/beatInterpolationDebug.ts` | Remove algorithm references |

### Test Files (Must Modify)
| File | Changes |
|------|---------|
| `tests/unit/beat/beatInterpolationComparison.test.ts` | Delete entirely |
| `tests/unit/beat/beatInterpolationDebug.test.ts` | Remove algorithm-specific tests |
| `tests/integration/beatInterpolation.integration.test.ts` | Remove algorithm comparison tests |

### Documentation Files (Must Modify)
| File | Changes |
|------|---------|
| `docs/engine/DATA_ENGINE_REFERENCE.md` | Remove algorithm selection docs |
| `docs/engine/docs/AUDIO_ANALYSIS.md` | Remove algorithm comparison, update examples |

### Frontend App (Optional - if exists in this repo)
| File | Changes |
|------|---------|
| UI components with algorithm selector | Remove selector, hardcode to adaptive |

---

## Phase 1: Type System Updates

### 1.1 Update BeatMap.ts Types
- [x] Remove `InterpolationAlgorithm` type definition
  ```typescript
  // DELETE:
  export type InterpolationAlgorithm = 'histogram-grid' | 'adaptive-phase-locked' | 'dual-pass';
  ```

- [x] Update `InterpolationMetadata` interface
  ```typescript
  // REMOVE:
  algorithm: InterpolationAlgorithm;
  ```

- [x] Update `BeatInterpolationOptions` interface
  - [x] Remove `algorithm?: InterpolationAlgorithm` option
  - [ ] Consider adding algorithm-specific tuning parameters:
    ```typescript
    /** Rate of phase adjustment at anchors (0-1, default: 0.3) */
    phaseAdjustmentRate?: number;

    /** Maximum allowed tempo deviation from base (default: 0.1 = 10%) */
    maxTempoDeviation?: number;
    ```

- [x] Update `DEFAULT_BEAT_INTERPOLATION_OPTIONS`
  - [x] Remove `algorithm: 'dual-pass'`
  - [ ] Add any new tuning parameter defaults

- [x] Update JSDoc comments to remove multi-algorithm references

### 1.2 Update JSON Serialization Types
- [x] Update `InterpolatedBeatMapJSON` to remove `algorithm` field
- [x] Update `InterpolationMetadataJSON` to remove `algorithm` field

---

## Phase 2: BeatInterpolator Class Refactoring

### 2.1 Remove Unused Algorithm Methods
- [x] Delete `interpolateHistogramGrid()` method (~lines 620-700)
- [x] Delete `interpolateDualPass()` method (~lines 800-920)
- [x] Rename `interpolateAdaptivePhaseLocked()` to `generateBeatGrid()` or keep name (kept existing name)

### 2.2 Simplify generateGrid() Method
- [x] Remove switch statement that delegates to algorithms
- [x] Directly call the adaptive phase-locked implementation
  ```typescript
  private generateGrid(
      beatMap: BeatMap,
      quarterNote: QuarterNoteDetection,
      gapAnalysis: GapAnalysis
  ): BeatWithSource[] {
      // Directly use adaptive phase-locked approach
      return this.interpolateAdaptivePhaseLocked(beatMap, quarterNote);
  }
  ```

### 2.3 Update Constructor and Config
- [x] Remove algorithm from options merging
- [x] Update `getConfig()` return type (remove algorithm field)
- [x] Update class-level JSDoc to remove multi-algorithm references

### 2.4 Update Static Methods
- [x] Update `toJSON()` to not include algorithm field
- [x] Update `fromJSON()` to handle missing algorithm field (backward compatibility)
- [x] Update `saveToFile()` / `loadFromFile()` if affected (not affected - use toJSON/fromJSON)

### 2.5 Update Edge Case Handlers
- [x] Update `createEmptyInterpolatedBeatMap()` - remove algorithm from metadata
- [x] Update `createSingleBeatInterpolatedBeatMap()` - remove algorithm from metadata

---

## Phase 3: Remove Comparison Utility

### 3.1 Delete Comparison Utility File
- [ ] Delete `src/core/analysis/beat/utils/beatInterpolationComparison.ts` entirely

### 3.2 Update Index Exports
- [ ] Remove from `src/core/analysis/beat/index.ts`:
  ```typescript
  // DELETE these exports:
  export {
      compareInterpolationApproaches,
      calculateAccuracyAgainstGroundTruth,
      formatComparisonTable,
      comparisonToJSON,
      ALL_ALGORITHMS,
      generateAlgorithmComparisonVisualization,
      // Keep visualization utilities that work with single results
      generateASCIIVisualization,
      generateHTMLVisualization,
      generateVisualizationData,
  } from './utils/beatInterpolationComparison.js';
  
  export type {
      MetricComparison,
      AlgorithmPairComparison,
      InterpolationComparisonResult,
      ComparisonOptions,
      // Keep visualization types
      VisualizationOptions,
      ASCIIVisualizationResult,
      HTMLVisualizationResult,
  } from './utils/beatInterpolationComparison.js';
  ```

### 3.3 Move Useful Visualization Code (Optional)
- [ ] Consider moving single-result visualization functions to debug utility:
  - `generateASCIIVisualization`
  - `generateHTMLVisualization`
  - `generateVisualizationData`

---

## Phase 4: Update Debug Utility

### 4.1 Remove Algorithm References from Debug
- [x] Update `InterpolationDebugReport` interface - remove `algorithm` field
- [x] Update `generateDebugReport()` - remove algorithm from report
- [x] Update `formatDebugReportToConsole()` - remove algorithm line
- [x] Update `formatDebugReportToJSON()` - remove algorithm field (automatic via interface change)

### 4.2 Update Debug Test File
- [x] Remove algorithm-specific test cases from `tests/unit/beat/beatInterpolationDebug.test.ts`

---

## Phase 5: Update Tests

### 5.1 Delete Comparison Tests
- [ ] Delete `tests/unit/beat/beatInterpolationComparison.test.ts` entirely

### 5.2 Update Integration Tests
- [x] Update `tests/integration/beatInterpolation.integration.test.ts`:
  - [x] Remove tests that compare multiple algorithms
  - [x] Remove algorithm parameter from test cases
  - [x] Update tests to verify adaptive phase-locked behavior specifically

### 5.3 Update Unit Tests (if any exist for BeatInterpolator directly)
- [x] Remove algorithm selection tests
- [x] Update mock data to not include algorithm field
- [x] Verify adaptive phase-locked specific behavior

---

## Phase 6: Update Documentation

### 6.1 Update DATA_ENGINE_REFERENCE.md
- [ ] Remove `InterpolationAlgorithm` from types table
- [ ] Update `BeatInterpolationOptions` documentation:
  - [ ] Remove `algorithm` parameter
  - [ ] Add any new tuning parameters
- [ ] Update `InterpolationMetadata` documentation - remove algorithm field
- [ ] Remove algorithm comparison section
- [ ] Update code examples to not specify algorithm
- [ ] Update default values table

### 6.2 Update AUDIO_ANALYSIS.md
- [ ] Remove "Algorithm Selection" section
- [ ] Remove algorithm comparison table
- [ ] Update "Beat Interpolation" section to describe the adaptive phase-locked approach
- [ ] Update all code examples:
  ```typescript
  // OLD:
  const interpolator = new BeatInterpolator({
    algorithm: 'adaptive-phase-locked',
  });
  
  // NEW:
  const interpolator = new BeatInterpolator();
  ```
- [ ] Update guidance section - remove "when to use each algorithm"
- [ ] Add section on tuning parameters (if any new ones added)

### 6.3 Update beat-interpolation-implementation-plan.md
- [ ] Add note that algorithm selection has been removed
- [ ] Mark the research phase as complete with conclusion

---

## Phase 7: AudioAnalyzer Integration Updates

### 7.1 Update AudioAnalyzer.ts
- [ ] Verify `interpolateBeatMap()` method doesn't require algorithm parameter
- [ ] Update any method signatures that reference `InterpolationAlgorithm`
- [ ] Update JSDoc comments

### 7.2 Verify BeatStream Compatibility
- [ ] Ensure BeatStream works with updated InterpolatedBeatMap type
- [ ] No changes expected since `BeatWithSource` extends `Beat`

---

## Phase 8: Frontend Updates (If Applicable)

### 8.1 Remove Algorithm Selection UI
- [ ] Remove algorithm selector from settings components
- [ ] Remove algorithm comparison view (if exists)
- [ ] Update store/state to remove `selectedAlgorithm`

### 8.2 Update Frontend Types
- [ ] Remove `InterpolationAlgorithm` from frontend type imports
- [ ] Update any frontend-specific types that reference algorithm

---

## Dependencies

```
Phase 1 (Types) ────────────────────────────────────────────┐
                                                             │
Phase 2 (BeatInterpolator) ─────────────────────────────────┤
                    │                                        │
                    ▼                                        │
Phase 3 (Remove Comparison) ────────────────────────────────┤
                    │                                        │
                    ▼                                        │
Phase 4 (Debug Utility) ────────────────────────────────────┤
                    │                                        │
                    ▼                                        │
Phase 5 (Tests) ◄───────────────────────────────────────────┤
                    │                                        │
                    ▼                                        │
Phase 6 (Documentation) ────────────────────────────────────┤
                    │                                        │
                    ▼                                        │
Phase 7 (AudioAnalyzer) ────────────────────────────────────┤
                    │                                        │
                    ▼                                        │
Phase 8 (Frontend) ◄────────────────────────────────────────┘
```

---

## Backward Compatibility Considerations

### JSON Deserialization
- `fromJSON()` should accept JSON with or without `algorithm` field
- Old saved beat maps should still load correctly
- Ignore `algorithm` field if present in old JSON

### API Deprecation Path (Optional)
If gradual migration is preferred:
1. Mark `algorithm` option as deprecated but accept it
2. Log warning if user specifies non-adaptive algorithm
3. Remove in next major version

---

## Success Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| **Build Success** | TypeScript compiles without errors | `npm run build` |
| **Tests Pass** | All remaining tests pass | `npm test` |
| **No Algorithm References** | No `InterpolationAlgorithm` type in codebase | Grep search |
| **Documentation Updated** | Docs reflect single algorithm | Manual review |
| **Backward Compatible** | Old JSON files still load | Unit test |
| **Bundle Size** | Reduced (removed comparison code) | Check dist size |

---

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Types | 1-2 | Straightforward removals |
| Phase 2: BeatInterpolator | 2-3 | Careful method removal |
| Phase 3: Comparison Utility | 1 | Delete file, update exports |
| Phase 4: Debug Utility | 1 | Minor updates |
| Phase 5: Tests | 2-3 | Delete and update tests |
| Phase 6: Documentation | 2 | Update multiple docs |
| Phase 7: AudioAnalyzer | 0.5 | Verify integration |
| Phase 8: Frontend | 1-2 | If applicable |
| **Total** | **10-14** | |

---

## New Tuning Parameters (Optional Enhancement)

Consider exposing these Adaptive Phase-Locked specific parameters:

```typescript
interface BeatInterpolationOptions {
    // ... existing options ...
    
    /**
     * Rate of tempo adaptation at anchor points (0-1, default: 0.3)
     * Higher values = faster adaptation to tempo changes
     * Lower values = more stable, slower to adapt
     */
    tempoAdaptationRate?: number;  // Already exists, keep
    
    /**
     * Maximum allowed tempo deviation from base tempo (default: 0.2 = 20%)
     * Prevents over-correction at unusual anchors
     */
    maxTempoDeviation?: number;
    
    /**
     * Minimum gap size to interpolate (in quarter notes, default: 1.5)
     * Smaller gaps are considered detection artifacts
     */
    minGapToInterpolate?: number;
}
```

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Which algorithm to keep? | Adaptive Phase-Locked Grid |
| Keep comparison code for research? | No - delete entirely |
| Backward compatibility for JSON? | Yes - ignore old algorithm field |
| Add tuning parameters? | Optional - consider for future |

---

## Next Steps

1. **Review and approve** this plan
2. **Start Phase 1**: Update type definitions
3. **Work through phases** sequentially
4. **Run tests** after each phase
5. **Update documentation** when code changes complete
6. **Verify build** and bundle size reduction
