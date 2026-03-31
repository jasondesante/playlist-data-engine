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

// ============================================================================
// High BPM Grid Restriction Rule
// ============================================================================

/**
 * Configuration for the high BPM grid restriction rule.
 */
export interface HighBpmGridRestrictionConfig {
    /**
     * BPM threshold above which 16th notes are restricted to 8th notes.
     * At this BPM, a 16th note is ~94ms — at the edge of playability.
     * Default: 160.
     */
    restrict16thBpm?: number;

    /**
     * BPM threshold above which triplets are also restricted to straight 8th.
     * At this BPM, a triplet 8th is ~100ms — at the edge of playability.
     * Default: 200.
     */
    restrictTripletBpm?: number;
}

/**
 * Restricts grid types at high BPMs for fundamental playability.
 *
 * At high tempos, 16th notes and triplets become unplayable:
 * - 160 BPM = 93.75ms per 16th note
 * - 200 BPM = 100ms per triplet 8th
 *
 * This rule modifies grid decisions (not quantization) so the quantization
 * pass snaps transients from their original timestamps to the coarser grid.
 *
 * Only applies to `mid` and `high` bands — `low` is already forced to
 * `straight_8th` by `RhythmQuantizer.getBandGridType()`.
 *
 * When overriding a grid decision:
 * - Sets `confidence: 1.0` (forced/authoritative)
 * - Clears `straightAvgOffset` and `tripletAvgOffset` (they no longer reflect
 *   the chosen grid)
 *
 * This matches the pattern used by `RhythmQuantizer.getBandGridType()` at
 * line 714-719 for forced grid decisions.
 */
export class HighBpmGridRestrictionRule implements TempoQuantizationRule {
    readonly id = 'high-bpm-grid-restriction';
    readonly description = 'Restricts 16th notes and triplets to 8th notes at high BPMs for playability';

    private readonly restrict16thBpm: number;
    private readonly restrictTripletBpm: number;

    constructor(config: HighBpmGridRestrictionConfig = {}) {
        this.restrict16thBpm = config.restrict16thBpm ?? 160;
        this.restrictTripletBpm = config.restrictTripletBpm ?? 200;
    }

    applies(bpm: number, context: TempoRuleContext): boolean {
        // Low band is already forced to straight_8th — no point applying
        if (context.band === 'low') {
            return false;
        }

        // Only apply if BPM exceeds the lower threshold
        return bpm >= this.restrict16thBpm;
    }

    apply(decisions: GridDecision[], context: TempoRuleContext): GridDecision[] {
        const { bpm } = context;
        const restrictTriplets = bpm >= this.restrictTripletBpm;

        return decisions.map(decision => {
            const { selectedGrid } = decision;

            // Already on 8th — nothing to do
            if (selectedGrid === 'straight_8th') {
                return decision;
            }

            // Restrict 16th notes to 8th at/above restrict16thBpm
            if (selectedGrid === 'straight_16th' && bpm >= this.restrict16thBpm) {
                return {
                    ...decision,
                    selectedGrid: 'straight_8th',
                    confidence: 1.0,
                    straightAvgOffset: undefined,
                    tripletAvgOffset: undefined,
                };
            }

            // Restrict triplets to 8th at/above restrictTripletBpm
            if (selectedGrid === 'triplet_8th' && restrictTriplets) {
                return {
                    ...decision,
                    selectedGrid: 'straight_8th',
                    confidence: 1.0,
                    straightAvgOffset: undefined,
                    tripletAvgOffset: undefined,
                };
            }

            return decision;
        });
    }
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
