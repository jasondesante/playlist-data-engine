# OSE Parameter Exposure Implementation Plan

## Overview

Expose Onset Strength Envelope (OSE) parameters to the frontend through a tiered mode system. This allows users to configure beat detection precision and quality without needing to understand technical details.

**Goal**: Add configurable modes for `hopSizeMs`, `melBands`, and `gaussianSmoothMs` parameters.

**Default Change**: The `hopSizeMs` default is changing from 10ms to 4ms to match the Ellis 2007 paper specification. Users who prefer the previous behavior can opt into "efficient" mode (10ms).

**Reference**: Research documented in conversation - Ellis 2007 paper, librosa implementation analysis.

---

## Phase 1: Type Definitions & Constants

Define new types and constants for parameter modes.

- [x] **1.1 Add Hop Size Mode Types**
  - [x] Add `HopSizeMode` type: `'efficient' | 'standard' | 'hq' | 'custom'`
  - [x] Add `HopSizeConfig` interface with `mode` and optional `customValue`
  - [x] Add `HOP_SIZE_PRESETS` constant object with preset values

- [x] **1.2 Add Mel Bands Mode Types**
  - [x] Add `MelBandsMode` type: `'standard' | 'detailed' | 'maximum'`
  - [x] Add `MelBandsConfig` interface
  - [x] Add `MEL_BANDS_PRESETS` constant object

- [x] **1.3 Add Gaussian Smooth Mode Types**
  - [x] Add `GaussianSmoothMode` type: `'minimal' | 'standard' | 'smooth'`
  - [x] Add `GaussianSmoothConfig` interface
  - [x] Add `GAUSSIAN_SMOOTH_PRESETS` constant object

### Proposed Constants

```typescript
// Tier 1: Primary Controls
export type HopSizeMode = 'efficient' | 'standard' | 'hq' | 'custom';

export const HOP_SIZE_PRESETS = {
  efficient: 10,  // Fast analysis, reduced precision
  standard: 4,    // Paper specification (Ellis 2007) - DEFAULT
  hq: 2,          // High quality, maximum precision
} as const;

export interface HopSizeConfig {
  mode: HopSizeMode;
  customValue?: number; // Only used when mode === 'custom'
}

// Tier 2: Advanced Controls
export type MelBandsMode = 'standard' | 'detailed' | 'maximum';

export const MEL_BANDS_PRESETS = {
  standard: 40,   // Paper default, librosa default
  detailed: 64,   // Better frequency resolution
  maximum: 80,    // Maximum detail
} as const;

export interface MelBandsConfig {
  mode: MelBandsMode;
}

export type GaussianSmoothMode = 'minimal' | 'standard' | 'smooth';

export const GAUSSIAN_SMOOTH_PRESETS = {
  minimal: 10,    // Preserves fast transients
  standard: 20,   // Paper default
  smooth: 40,     // Cleaner peaks, less noise
} as const;

export interface GaussianSmoothConfig {
  mode: GaussianSmoothMode;
}
```

**File**: `src/core/types/BeatMap.ts`

---

## Phase 2: Helper Functions

Create helper functions to convert mode configs to actual parameter values.

- [ ] **2.1 Add `getHopSizeMs()` function**
  - [ ] Accept `HopSizeConfig` parameter
  - [ ] Return numeric hop size in milliseconds
  - [ ] Handle 'custom' mode with validation
  - [ ] Add JSDoc documentation

- [ ] **2.2 Add `getMelBands()` function**
  - [ ] Accept `MelBandsConfig` parameter
  - [ ] Return numeric mel bands count

- [ ] **2.3 Add `getGaussianSmoothMs()` function**
  - [ ] Accept `GaussianSmoothConfig` parameter
  - [ ] Return numeric smoothing window in milliseconds

### Proposed Functions

```typescript
/**
 * Convert hop size mode to actual milliseconds value
 * @param config - Hop size configuration (default: { mode: 'standard' })
 * @returns Hop size in milliseconds
 */
export function getHopSizeMs(config: HopSizeConfig = { mode: 'standard' }): number {
  if (config.mode === 'custom') {
    // Validate custom value
    const value = config.customValue ?? HOP_SIZE_PRESETS.standard;
    return Math.max(1, Math.min(50, value)); // Clamp 1-50ms
  }
  return HOP_SIZE_PRESETS[config.mode];
}

/**
 * Convert mel bands mode to actual count
 * @param config - Mel bands configuration (default: { mode: 'standard' })
 * @returns Number of mel bands
 */
export function getMelBands(config: MelBandsConfig = { mode: 'standard' }): number {
  return MEL_BANDS_PRESETS[config.mode];
}

/**
 * Convert gaussian smooth mode to actual milliseconds value
 * @param config - Gaussian smooth configuration (default: { mode: 'standard' })
 * @returns Smoothing window in milliseconds
 */
export function getGaussianSmoothMs(config: GaussianSmoothConfig = { mode: 'standard' }): number {
  return GAUSSIAN_SMOOTH_PRESETS[config.mode];
}
```

**File**: `src/core/types/BeatMap.ts`

---

## Phase 3: Update OSEConfig Interface

Extend `OSEConfig` to support mode-based configuration.

- [ ] **3.1 Add mode-based properties to OSEConfig**
  - [ ] Add optional `hopSizeMode` property (alternative to `hopSizeMs`)
  - [ ] Add optional `melBandsMode` property (alternative to `melBands`)
  - [ ] Add optional `gaussianSmoothMode` property (alternative to `gaussianSmoothMs`)

- [ ] **3.2 Update DEFAULT_OSE_CONFIG**
  - [ ] Change `hopSizeMs` default from 10 to 4 (paper spec)
  - [ ] Add default mode values alongside numeric defaults

### Proposed Interface Update

```typescript
export interface OSEConfig {
  /** Target sample rate for resampling (default: 8000 Hz) */
  targetSampleRate?: number;

  /** FFT window size in milliseconds (default: 32) */
  fftWindowSize?: number;

  /** Hop size in milliseconds (default: 4) - use with hopSizeMode or direct value */
  hopSizeMs?: number;

  /** Hop size mode (alternative to hopSizeMs) - default: 'standard' */
  hopSizeMode?: HopSizeConfig;

  /** Number of Mel frequency bands (default: 40) */
  melBands?: number;

  /** Mel bands mode (alternative to melBands) - default: 'standard' */
  melBandsMode?: MelBandsConfig;

  /** High-pass filter cutoff in Hz (default: 0.4) */
  highPassCutoff?: number;

  /** Gaussian smoothing window in ms (default: 20) */
  gaussianSmoothMs?: number;

  /** Gaussian smooth mode (alternative to gaussianSmoothMs) - default: 'standard' */
  gaussianSmoothMode?: GaussianSmoothConfig;
}
```

**File**: `src/core/types/BeatMap.ts`

---

## Phase 4: Update BeatMapGeneratorOptions

Extend generator options to support mode-based configuration.

- [ ] **4.1 Add mode properties to BeatMapGeneratorOptions**
  - [ ] Add `hopSizeMode?: HopSizeConfig`
  - [ ] Add `melBandsMode?: MelBandsConfig`
  - [ ] Add `gaussianSmoothMode?: GaussianSmoothConfig`

- [ ] **4.2 Update DEFAULT_BEATMAP_GENERATOR_OPTIONS**
  - [ ] Add default mode configurations

**File**: `src/core/types/BeatMap.ts`

---

## Phase 5: Update OnsetStrengthEnvelope Class

Modify the class to resolve mode configs to actual values.

- [ ] **5.1 Update constructor to resolve modes**
  - [ ] Check for `hopSizeMode` and use `getHopSizeMs()` if present
  - [ ] Check for `melBandsMode` and use `getMelBands()` if present
  - [ ] Check for `gaussianSmoothMode` and use `getGaussianSmoothMs()` if present
  - [ ] Fall back to direct numeric values if modes not specified

- [ ] **5.2 Maintain backward compatibility**
  - [ ] Existing code using direct numeric values should continue to work
  - [ ] Mode configs take precedence when both are provided

### Proposed Constructor Update

```typescript
constructor(config: OSEConfig = {}) {
  // Resolve hop size from mode or direct value
  // Default is now 4ms (paper spec), not 10ms
  const hopSizeMs = config.hopSizeMode
    ? getHopSizeMs(config.hopSizeMode)
    : config.hopSizeMs ?? DEFAULT_OSE_CONFIG.hopSizeMs; // 4ms default

  // Resolve mel bands from mode or direct value
  const melBands = config.melBandsMode
    ? getMelBands(config.melBandsMode)
    : config.melBands ?? DEFAULT_OSE_CONFIG.melBands; // 40 default

  // Resolve gaussian smooth from mode or direct value
  const gaussianSmoothMs = config.gaussianSmoothMode
    ? getGaussianSmoothMs(config.gaussianSmoothMode)
    : config.gaussianSmoothMs ?? DEFAULT_OSE_CONFIG.gaussianSmoothMs; // 20ms default

  this.config = {
    ...DEFAULT_OSE_CONFIG,
    ...config,
    hopSizeMs,
    melBands,
    gaussianSmoothMs,
  };
}
```

**File**: `src/core/analysis/beat/OnsetStrengthEnvelope.ts`

---

## Phase 6: Update BeatMapGenerator Class

Ensure the generator passes mode configs through to OSE.

- [ ] **6.1 Update BeatMapGenerator to pass modes to OSE**
  - [ ] Extract mode configs from options
  - [ ] Pass to OnsetStrengthEnvelope constructor

**File**: `src/core/analysis/beat/BeatMapGenerator.ts`

---

## Phase 7: Update Exports

Ensure new types and functions are exported from the package.

- [ ] **7.1 Update BeatMap.ts exports**
  - [ ] Export all new types
  - [ ] Export all new constants
  - [ ] Export all helper functions

- [ ] **7.2 Update package index exports**
  - [ ] Add to `src/index.ts` or equivalent entry point

**Files**: `src/core/types/BeatMap.ts`, `src/index.ts`

---

## Phase 8: Documentation Updates

Update documentation to describe the new mode system.

- [ ] **8.1 Update AUDIO_ANALYSIS.md**
  - [ ] Add section on "OSE Parameter Modes"
  - [ ] Document Tier 1 (Primary) and Tier 2 (Advanced) controls
  - [ ] Add usage examples with mode configs
  - [ ] Add mode-to-value reference tables
  - [ ] Update OSEConfig table to include mode properties

- [ ] **8.2 Update DATA_ENGINE_REFERENCE.md**
  - [ ] Add new types to Types Overview section (`HopSizeMode`, `HopSizeConfig`, `MelBandsMode`, `MelBandsConfig`, `GaussianSmoothMode`, `GaussianSmoothConfig`)
  - [ ] Add new constants to Constants section (`HOP_SIZE_PRESETS`, `MEL_BANDS_PRESETS`, `GAUSSIAN_SMOOTH_PRESETS`)
  - [ ] Add new helper functions to Functions section (`getHopSizeMs`, `getMelBands`, `getGaussianSmoothMs`)
  - [ ] Update `BeatMapGeneratorOptions` table to include mode properties
  - [ ] Update `OSEConfig` table to include mode properties
  - [ ] Add usage examples with mode configs

- [ ] **8.3 Update JSDoc comments**
  - [ ] Add examples showing mode usage
  - [ ] Document precedence (mode vs direct value)

**Files**: `docs/AUDIO_ANALYSIS.md`, `DATA_ENGINE_REFERENCE.md`

---

## Phase 9: Testing

Add tests for new functionality.

- [ ] **9.1 Unit tests for helper functions**
  - [ ] Test `getHopSizeMs()` with all modes
  - [ ] Test `getHopSizeMs()` custom value clamping
  - [ ] Test `getMelBands()` with all modes
  - [ ] Test `getGaussianSmoothMs()` with all modes

- [ ] **9.2 Integration tests**
  - [ ] Test OnsetStrengthEnvelope with mode configs
  - [ ] Test BeatMapGenerator with mode configs
  - [ ] Test backward compatibility with direct numeric values

**File**: `src/core/types/__tests__/BeatMap.test.ts` (or similar)

---

## Dependencies

- None - this is a self-contained feature addition

---

## Implementation Order

1. **Phase 1** (Types & Constants) - Foundation for everything else
2. **Phase 2** (Helper Functions) - Required by Phase 5
3. **Phase 3** (OSEConfig) - Update interface
4. **Phase 4** (BeatMapGeneratorOptions) - Update interface
5. **Phase 5** (OnsetStrengthEnvelope) - Core implementation
6. **Phase 6** (BeatMapGenerator) - Pass-through implementation
7. **Phase 7** (Exports) - Make available to consumers
8. **Phase 8** (Documentation) - Update AUDIO_ANALYSIS.md and DATA_ENGINE_REFERENCE.md
9. **Phase 9** (Testing) - Verify correctness

---

## Usage Examples (Post-Implementation)

### Tier 1: Hop Size Modes

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Standard mode (default) - paper specification
const standardGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'standard' }  // 4ms (Ellis 2007 paper spec)
});

// Efficient mode - fast analysis, reduced precision
const efficientGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'efficient' }  // 10ms
});

// HQ mode - maximum precision
const hqGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'hq' }  // 2ms
});

// Custom mode - user-defined
const customGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'custom', customValue: 5 }  // 5ms
});

// Backward compatible - direct value still works
const legacyGenerator = new BeatMapGenerator({
  hopSizeMs: 10  // Direct numeric value
});
```

### Tier 2: Advanced Controls

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Mel bands configuration
const detailedGenerator = new BeatMapGenerator({
  melBandsMode: { mode: 'detailed' }  // 64 bands
});

// Gaussian smoothing configuration
const smoothGenerator = new BeatMapGenerator({
  gaussianSmoothMode: { mode: 'smooth' }  // 40ms
});

// Combined configuration
const configuredGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'standard' },      // 4ms (paper spec)
  melBandsMode: { mode: 'detailed' },     // 64 bands
  gaussianSmoothMode: { mode: 'standard' } // 20ms
});
```

---

## Questions/Unknowns

- **Custom value range for hopSizeMs**: Currently proposed as 1-50ms with clamping. Should we validate more strictly or warn users?
- **UI labels**: The frontend may want different labels than the mode names (e.g., "Fast" instead of "efficient"). Should we add display name mappings?

---

## Reference

- Ellis 2007 Paper: "Beat Tracking by Dynamic Programming"
- librosa documentation: https://librosa.org/doc/latest/generated/librosa.onset.onset_strength.html
- Research summary from conversation (2024-02-28)
