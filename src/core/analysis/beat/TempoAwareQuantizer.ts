/**
 * Tempo-Aware Quantization
 *
 * Extensible pipeline step that applies BPM-based rules to constrain the
 * quantization grid for fundamental playability, independent of difficulty
 * settings.
 *
 * ## Architecture
 *
 * The TempoAwareQuantizer plugs into the decide-then-quantize flow:
 *
 * ```
 * decideGrids()           →  RhythmQuantizer base decisions
 * ↓
 * TempoAwareQuantizer.applyRules()  →  BPM-constrained decisions
 * ↓
 * quantizeToGrids()       →  Quantize from original timestamps to final grid
 * ```
 *
 * Rules are consulted during grid decision-making, not applied post-hoc to
 * already-quantized data. This means there is only ONE quantization pass.
 *
 * @example
 * ```typescript
 * const quantizer = new TempoAwareQuantizer({
 *   enabled: true,
 *   rules: [new HighBpmGridRestrictionRule()],
 * });
 *
 * // Get base grid decisions from RhythmQuantizer
 * const baseDecisions = rhythmQuantizer.decideGrids(transients, beatMap, 'mid');
 *
 * // Apply BPM-aware rules
 * const finalDecisions = quantizer.applyRules(baseDecisions, {
 *   bpm: beatMap.quarterNoteBpm,
 *   quarterNoteInterval: beatMap.quarterNoteInterval,
 *   band: 'mid',
 *   transients,
 * });
 * ```
 */

import type { GridDecision } from './RhythmQuantizer.js';
import type { TransientResult } from './TransientDetector.js';

// ============================================================================
// Rule Interface
// ============================================================================

/**
 * Context passed to tempo quantization rules.
 */
export interface TempoRuleContext {
    /** Current BPM from the UnifiedBeatMap */
    bpm: number;

    /** Quarter note interval in seconds */
    quarterNoteInterval: number;

    /** Frequency band being processed */
    band: 'low' | 'mid' | 'high';

    /** Raw transients for this band (original timestamps, not quantized) */
    transients: TransientResult[];
}

/**
 * A rule that can modify grid decisions based on tempo context.
 *
 * Rules are applied in order. Each rule's `apply()` receives the grid
 * decisions (possibly already modified by earlier rules) and returns
 * the (possibly modified) decisions.
 *
 * When overriding a grid decision, rules should:
 * - Set `confidence: 1.0` (forced/authoritative)
 * - Clear `straightAvgOffset` and `tripletAvgOffset`
 *
 * This matches the pattern used by `RhythmQuantizer.getBandGridType()` for
 * forced grid decisions, and ensures that `collectGridDecisions()` in
 * RhythmGenerator correctly prefers BPM-forced decisions over
 * lower-confidence auto-detected ones.
 */
export interface TempoQuantizationRule {
    /** Unique identifier for this rule (e.g., 'high-bpm-grid-restriction') */
    id: string;

    /** Human-readable description of what this rule does */
    description: string;

    /**
     * Check if this rule applies given the BPM and context.
     *
     * @param bpm - Current BPM
     * @param context - Tempo context with band, transients, and beat info
     * @returns `true` if this rule should be applied
     */
    applies(bpm: number, context: TempoRuleContext): boolean;

    /**
     * Modify grid decisions based on this rule.
     *
     * Receives the raw transients and original grid decisions so it can
     * make informed decisions (e.g., check transient positions before
     * overriding).
     *
     * @param decisions - Current grid decisions (may already be modified by prior rules)
     * @param context - Tempo context with BPM, band, transients, and beat info
     * @returns Modified grid decisions
     */
    apply(decisions: GridDecision[], context: TempoRuleContext): GridDecision[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the TempoAwareQuantizer.
 */
export interface TempoAwareQuantizerConfig {
    /**
     * Ordered list of tempo quantization rules to apply.
     * Rules are applied in array order — earlier rules' modifications
     * are visible to later rules.
     */
    rules: TempoQuantizationRule[];

    /**
     * Whether tempo-aware quantization is enabled (default: true).
     * When disabled, `applyRules()` returns the decisions unchanged.
     */
    enabled?: boolean;
}
