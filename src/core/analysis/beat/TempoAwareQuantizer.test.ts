import { describe, it, expect, beforeEach } from 'vitest';
import {
    TempoAwareQuantizer,
    HighBpmGridRestrictionRule,
    DEFAULT_TEMPO_AWARE_CONFIG,
    type TempoQuantizationRule,
    type TempoRuleContext,
    type TempoAwareQuantizerConfig,
    type HighBpmGridRestrictionConfig,
} from './TempoAwareQuantizer.js';
import { RhythmQuantizer, type GridDecision } from './RhythmQuantizer.js';
import type { TransientResult } from './TransientDetector.js';
import type { UnifiedBeatMap, Beat } from '../../types/BeatMap.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock transient for testing
 */
function createTransient(
    timestamp: number,
    intensity: number,
    band: 'low' | 'mid' | 'high' = 'mid'
): TransientResult {
    return {
        timestamp,
        intensity,
        band,
        detectionMethod: 'energy',
    };
}

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockBeatMap(
    options: {
        duration?: number;
        bpm?: number;
        numBeats?: number;
    } = {}
): UnifiedBeatMap {
    const duration = options.duration ?? 4.0;
    const bpm = options.bpm ?? 120;
    const numBeats = options.numBeats ?? Math.ceil(duration / (60 / bpm));
    const quarterNoteInterval = 60 / bpm;

    const beats: Beat[] = [];
    for (let i = 0; i < numBeats; i++) {
        beats.push({
            timestamp: i * quarterNoteInterval,
            intensity: 0.5,
            isDownbeat: i % 4 === 0,
            beatInMeasure: i % 4,
            measureNumber: Math.floor(i / 4),
            confidence: 0.8,
        });
    }

    return {
        audioId: 'test-audio',
        duration,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        originalMetadata: {
            algorithm: 'test',
            version: '1.0.0',
            minBpm: 60,
            maxBpm: 200,
            sensitivity: 1.0,
            filter: 0.0,
            noiseFloorThreshold: 0,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 80,
            gaussianSmoothMs: 50,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Create a mock GridDecision for testing
 */
function createGridDecision(overrides: Partial<GridDecision> = {}): GridDecision {
    return {
        beatIndex: 0,
        selectedGrid: 'straight_16th',
        straightAvgOffset: 5.0,
        tripletAvgOffset: 15.0,
        transientCount: 3,
        confidence: 0.7,
        ...overrides,
    };
}

// ============================================================================
// HighBpmGridRestrictionRule Tests
// ============================================================================

describe('HighBpmGridRestrictionRule', () => {
    let rule: HighBpmGridRestrictionRule;

    describe('with default config', () => {
        beforeEach(() => {
            rule = new HighBpmGridRestrictionRule();
        });

        it('should have correct id and description', () => {
            expect(rule.id).toBe('high-bpm-grid-restriction');
            expect(rule.description).toContain('Restricts');
            expect(rule.description).toContain('high BPMs');
        });

        it('should not apply to low band', () => {
            const context: TempoRuleContext = {
                bpm: 180,
                quarterNoteInterval: 60 / 180,
                band: 'low',
                transients: [createTransient(0.1, 0.5, 'low')],
            };
            expect(rule.applies(180, context)).toBe(false);
        });

        it('should apply to mid band at high BPM', () => {
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };
            expect(rule.applies(170, context)).toBe(true);
        });

        it('should apply to high band at high BPM', () => {
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'high',
                transients: [],
            };
            expect(rule.applies(170, context)).toBe(true);
        });

        it('should not apply below threshold (default 160)', () => {
            const context: TempoRuleContext = {
                bpm: 159,
                quarterNoteInterval: 60 / 159,
                band: 'mid',
                transients: [],
            };
            expect(rule.applies(159, context)).toBe(false);
        });

        it('should apply at exactly the threshold (160)', () => {
            const context: TempoRuleContext = {
                bpm: 160,
                quarterNoteInterval: 60 / 160,
                band: 'mid',
                transients: [],
            };
            expect(rule.applies(160, context)).toBe(true);
        });
    });

    describe('apply - 16th note restriction', () => {
        beforeEach(() => {
            rule = new HighBpmGridRestrictionRule();
        });

        it('should override straight_16th to straight_8th at BPM >= 160', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th' }),
                createGridDecision({ beatIndex: 1, selectedGrid: 'straight_16th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_8th');
            expect(result[1].selectedGrid).toBe('straight_8th');
        });

        it('should not override straight_8th decisions', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 180,
                quarterNoteInterval: 60 / 180,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_8th');
        });

        it('should preserve triplet_8th at BPM < 200', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'triplet_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].selectedGrid).toBe('triplet_8th');
        });

        it('should override triplet_8th to straight_8th at BPM >= 200', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'triplet_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 210,
                quarterNoteInterval: 60 / 210,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_8th');
        });

        it('should set confidence to 1.0 on overridden decisions', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th', confidence: 0.5 }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].confidence).toBe(1.0);
        });

        it('should clear straightAvgOffset on overridden decisions', () => {
            const decisions = [
                createGridDecision({
                    beatIndex: 0,
                    selectedGrid: 'straight_16th',
                    straightAvgOffset: 5.0,
                }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].straightAvgOffset).toBeUndefined();
        });

        it('should clear tripletAvgOffset on overridden decisions', () => {
            const decisions = [
                createGridDecision({
                    beatIndex: 0,
                    selectedGrid: 'straight_16th',
                    tripletAvgOffset: 12.0,
                }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].tripletAvgOffset).toBeUndefined();
        });

        it('should preserve non-overridden fields', () => {
            const decisions = [
                createGridDecision({
                    beatIndex: 3,
                    selectedGrid: 'straight_16th',
                    transientCount: 4,
                    confidence: 0.3,
                    straightAvgOffset: 2.0,
                    tripletAvgOffset: 8.0,
                }),
            ];
            const context: TempoRuleContext = {
                bpm: 180,
                quarterNoteInterval: 60 / 180,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].beatIndex).toBe(3);
            expect(result[0].transientCount).toBe(4);
            // confidence, offsets should be overridden
            expect(result[0].confidence).toBe(1.0);
            expect(result[0].straightAvgOffset).toBeUndefined();
            expect(result[0].tripletAvgOffset).toBeUndefined();
        });

        it('should handle mixed grid types in same beat list', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th' }),
                createGridDecision({ beatIndex: 1, selectedGrid: 'triplet_8th' }),
                createGridDecision({ beatIndex: 2, selectedGrid: 'straight_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'mid',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            // At 170 BPM (< 200), 16th → 8th, triplet stays, 8th stays
            expect(result[0].selectedGrid).toBe('straight_8th');
            expect(result[0].confidence).toBe(1.0);
            expect(result[1].selectedGrid).toBe('triplet_8th');
            expect(result[1].confidence).toBe(0.7); // Not overridden
            expect(result[2].selectedGrid).toBe('straight_8th');
            expect(result[2].confidence).toBe(0.7); // Not overridden
        });
    });

    describe('with custom config', () => {
        it('should use custom restrict16thBpm threshold', () => {
            rule = new HighBpmGridRestrictionRule({ restrict16thBpm: 140 });

            const context: TempoRuleContext = {
                bpm: 145,
                quarterNoteInterval: 60 / 145,
                band: 'mid',
                transients: [],
            };

            // 145 >= 140, so should apply
            expect(rule.applies(145, context)).toBe(true);

            const decisions = [
                createGridDecision({ selectedGrid: 'straight_16th' }),
            ];
            const result = rule.apply(decisions, context);
            expect(result[0].selectedGrid).toBe('straight_8th');
        });

        it('should use custom restrictTripletBpm threshold', () => {
            rule = new HighBpmGridRestrictionRule({ restrictTripletBpm: 180 });

            const decisions = [
                createGridDecision({ selectedGrid: 'triplet_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 185,
                quarterNoteInterval: 60 / 185,
                band: 'mid',
                transients: [],
            };

            // 185 >= 180, should restrict triplet
            const result = rule.apply(decisions, context);
            expect(result[0].selectedGrid).toBe('straight_8th');
        });

        it('should not restrict triplets below custom threshold', () => {
            rule = new HighBpmGridRestrictionRule({
                restrict16thBpm: 140,
                restrictTripletBpm: 180,
            });

            const decisions = [
                createGridDecision({ selectedGrid: 'triplet_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 150,
                quarterNoteInterval: 60 / 150,
                band: 'mid',
                transients: [],
            };

            // 150 >= 140 (16th restriction applies) but 150 < 180 (triplet stays)
            expect(rule.applies(150, context)).toBe(true);

            const result = rule.apply(decisions, context);
            expect(result[0].selectedGrid).toBe('triplet_8th');
        });

        it('should restrict both 16th and triplets at very high BPM with custom thresholds', () => {
            rule = new HighBpmGridRestrictionRule({
                restrict16thBpm: 140,
                restrictTripletBpm: 160,
            });

            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th' }),
                createGridDecision({ beatIndex: 1, selectedGrid: 'triplet_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 170,
                quarterNoteInterval: 60 / 170,
                band: 'high',
                transients: [],
            };

            const result = rule.apply(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_8th');
            expect(result[1].selectedGrid).toBe('straight_8th');
        });
    });
});

// ============================================================================
// TempoAwareQuantizer Tests
// ============================================================================

describe('TempoAwareQuantizer', () => {
    let quantizer: TempoAwareQuantizer;

    describe('constructor', () => {
        it('should create with default config', () => {
            quantizer = new TempoAwareQuantizer();
            const config = quantizer.getConfig();

            expect(config.enabled).toBe(true);
            expect(config.rules).toHaveLength(1);
            expect(config.rules[0].id).toBe('high-bpm-grid-restriction');
        });

        it('should create with custom config', () => {
            const customRule = new HighBpmGridRestrictionRule({ restrict16thBpm: 150 });
            const customConfig: TempoAwareQuantizerConfig = {
                rules: [customRule],
                enabled: true,
            };

            quantizer = new TempoAwareQuantizer(customConfig);
            const config = quantizer.getConfig();

            expect(config.rules).toHaveLength(1);
        });

        it('should create default RhythmQuantizer when none provided', () => {
            quantizer = new TempoAwareQuantizer();
            // Should not throw - it creates a default RhythmQuantizer internally
            expect(quantizer).toBeDefined();
        });

        it('should accept a shared RhythmQuantizer instance', () => {
            const sharedQuantizer = new RhythmQuantizer({ minimumTransientIntensity: 0.3 });
            quantizer = new TempoAwareQuantizer(undefined, sharedQuantizer);

            // Should not throw
            expect(quantizer).toBeDefined();
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            quantizer = new TempoAwareQuantizer();
            const config1 = quantizer.getConfig();
            const config2 = quantizer.getConfig();

            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);
        });
    });

    describe('applyRules', () => {
        beforeEach(() => {
            quantizer = new TempoAwareQuantizer();
        });

        it('should apply HighBpmGridRestrictionRule at high BPM', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th' }),
                createGridDecision({ beatIndex: 1, selectedGrid: 'straight_8th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 180,
                quarterNoteInterval: 60 / 180,
                band: 'mid',
                transients: [],
            };

            const result = quantizer.applyRules(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_8th');
            expect(result[0].confidence).toBe(1.0);
            expect(result[1].selectedGrid).toBe('straight_8th');
            expect(result[1].confidence).toBe(0.7); // unchanged
        });

        it('should not modify decisions at normal BPM', () => {
            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 120,
                quarterNoteInterval: 60 / 120,
                band: 'mid',
                transients: [],
            };

            const result = quantizer.applyRules(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_16th');
            expect(result[0].confidence).toBe(0.7);
        });

        it('should return decisions unchanged when disabled', () => {
            quantizer = new TempoAwareQuantizer({ rules: [], enabled: false });

            const decisions = [
                createGridDecision({ beatIndex: 0, selectedGrid: 'straight_16th' }),
            ];
            const context: TempoRuleContext = {
                bpm: 200,
                quarterNoteInterval: 60 / 200,
                band: 'mid',
                transients: [],
            };

            const result = quantizer.applyRules(decisions, context);

            expect(result[0].selectedGrid).toBe('straight_16th');
            expect(result[0].confidence).toBe(0.7);
        });

        it('should chain multiple rules in order', () => {
            let firstRuleApplied = false;
            let secondRuleApplied = false;

            const firstRule: TempoQuantizationRule = {
                id: 'first-rule',
                description: 'Marks all decisions as processed by first rule',
                applies: () => true,
                apply: (decisions) => {
                    firstRuleApplied = true;
                    // Verify second rule hasn't run yet
                    expect(secondRuleApplied).toBe(false);
                    return decisions.map(d => ({
                        ...d,
                        straightAvgOffset: d.straightAvgOffset ?? 0,
                    }));
                },
            };

            const secondRule: TempoQuantizationRule = {
                id: 'second-rule',
                description: 'Runs after first rule',
                applies: () => true,
                apply: (decisions) => {
                    secondRuleApplied = true;
                    expect(firstRuleApplied).toBe(true);
                    return decisions;
                },
            };

            quantizer = new TempoAwareQuantizer({
                rules: [firstRule, secondRule],
                enabled: true,
            });

            const decisions = [createGridDecision()];
            const context: TempoRuleContext = {
                bpm: 150,
                quarterNoteInterval: 60 / 150,
                band: 'mid',
                transients: [],
            };

            quantizer.applyRules(decisions, context);

            expect(firstRuleApplied).toBe(true);
            expect(secondRuleApplied).toBe(true);
        });

        it('should skip rules whose applies() returns false', () => {
            let ruleApplied = false;

            const conditionalRule: TempoQuantizationRule = {
                id: 'conditional-rule',
                description: 'Only applies above 200 BPM',
                applies: (bpm) => bpm >= 200,
                apply: () => {
                    ruleApplied = true;
                    return [];
                },
            };

            quantizer = new TempoAwareQuantizer({
                rules: [conditionalRule],
                enabled: true,
            });

            const decisions = [createGridDecision()];
            const context: TempoRuleContext = {
                bpm: 150,
                quarterNoteInterval: 60 / 150,
                band: 'mid',
                transients: [],
            };

            const result = quantizer.applyRules(decisions, context);

            expect(ruleApplied).toBe(false);
            expect(result).toEqual(decisions);
        });

        it('should pass second rule the output of first rule', () => {
            const firstRule: TempoQuantizationRule = {
                id: 'first',
                description: 'Adds a marker',
                applies: () => true,
                apply: (decisions) =>
                    decisions.map(d => ({ ...d, transientCount: d.transientCount + 100 })),
            };

            const secondRule: TempoQuantizationRule = {
                id: 'second',
                description: 'Verifies marker from first rule',
                applies: () => true,
                apply: (decisions) => {
                    // Verify it received the output of first rule
                    for (const d of decisions) {
                        expect(d.transientCount).toBeGreaterThan(100);
                    }
                    return decisions;
                },
            };

            quantizer = new TempoAwareQuantizer({
                rules: [firstRule, secondRule],
                enabled: true,
            });

            const decisions = [createGridDecision({ transientCount: 3 })];
            const context: TempoRuleContext = {
                bpm: 120,
                quarterNoteInterval: 60 / 120,
                band: 'mid',
                transients: [],
            };

            const result = quantizer.applyRules(decisions, context);
            expect(result[0].transientCount).toBe(103);
        });
    });

    describe('decideGrids - full pipeline integration', () => {
        it('should override 16th note decisions at high BPM', () => {
            const bpm = 180;
            const quarterNoteInterval = 60 / bpm;

            // Create transients that land on 16th note positions within beat 0
            const transients: TransientResult[] = [
                createTransient(0.0, 0.8, 'mid'),
                createTransient(quarterNoteInterval * 0.25, 0.7, 'mid'), // 16th position
                createTransient(quarterNoteInterval * 0.5, 0.6, 'mid'), // 8th position
            ];

            const beatMap = createMockBeatMap({ bpm, numBeats: 4 });

            quantizer = new TempoAwareQuantizer();

            const decisions = quantizer.decideGrids(transients, beatMap, 'mid');

            // At 180 BPM, the rule should have overridden any 16th decisions to 8th
            for (const decision of decisions) {
                expect(decision.selectedGrid).toBe('straight_8th');
                expect(decision.confidence).toBe(1.0);
                expect(decision.straightAvgOffset).toBeUndefined();
                expect(decision.tripletAvgOffset).toBeUndefined();
            }
        });

        it('should preserve grid decisions at normal BPM', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            // Create transients on 16th note positions
            const transients: TransientResult[] = [
                createTransient(0.0, 0.8, 'mid'),
                createTransient(quarterNoteInterval * 0.25, 0.7, 'mid'),
                createTransient(quarterNoteInterval * 0.5, 0.6, 'mid'),
            ];

            const beatMap = createMockBeatMap({ bpm, numBeats: 4 });

            quantizer = new TempoAwareQuantizer();

            const decisions = quantizer.decideGrids(transients, beatMap, 'mid');

            // At 120 BPM, auto-detected grid decisions should be preserved
            // The transients are on 16th positions, so straight_16th is expected
            if (decisions.length > 0) {
                expect(decisions[0].selectedGrid).toBe('straight_16th');
                // Should NOT be forced
                expect(decisions[0].confidence).not.toBe(1.0);
            }
        });

        it('should not apply rules to low band', () => {
            const bpm = 180;
            const quarterNoteInterval = 60 / bpm;

            const transients: TransientResult[] = [
                createTransient(0.0, 0.8, 'low'),
                createTransient(quarterNoteInterval * 0.5, 0.7, 'low'),
            ];

            const beatMap = createMockBeatMap({ bpm, numBeats: 4 });

            quantizer = new TempoAwareQuantizer();

            const decisions = quantizer.decideGrids(transients, beatMap, 'low');

            // Low band is forced to straight_8th by RhythmQuantizer.getBandGridType()
            // The BPM rule should not apply (but the base decision is already 8th)
            for (const decision of decisions) {
                expect(decision.selectedGrid).toBe('straight_8th');
                expect(decision.confidence).toBe(1.0); // Forced by band type
            }
        });

        it('should handle empty transients', () => {
            const beatMap = createMockBeatMap({ bpm: 180 });
            quantizer = new TempoAwareQuantizer();

            const decisions = quantizer.decideGrids([], beatMap, 'mid');

            expect(decisions).toHaveLength(0);
        });
    });
});

// ============================================================================
// End-to-End: decideGrids → quantizeToGrids
// ============================================================================

describe('End-to-end: decide-then-quantize with BPM rules', () => {
    it('should quantize to 8th grid when BPM rule overrides 16th decisions', () => {
        const bpm = 180;
        const quarterNoteInterval = 60 / bpm;

        // Place transients at positions that clearly fit a 16th grid:
        // 25% (16th pos 1) and 50% (16th pos 2) of the beat.
        // At 180 BPM, the rule overrides straight_16th → straight_8th.
        const transients: TransientResult[] = [
            createTransient(quarterNoteInterval * 0.25, 0.9, 'mid'), // 16th position 1
            createTransient(quarterNoteInterval * 0.50, 0.7, 'mid'), // 16th position 2 (= 8th position 1)
        ];

        const beatMap = createMockBeatMap({ bpm, numBeats: 4 });
        const rhythmQuantizer = new RhythmQuantizer();

        // Step 1: Get base grid decisions
        const baseDecisions = rhythmQuantizer.decideGrids(transients, beatMap, 'mid');

        // Step 2: Apply BPM-aware rules
        const tempoQuantizer = new TempoAwareQuantizer(
            DEFAULT_TEMPO_AWARE_CONFIG,
            rhythmQuantizer
        );
        const finalDecisions = tempoQuantizer.applyRules(baseDecisions, {
            bpm,
            quarterNoteInterval,
            band: 'mid',
            transients,
        });

        // Step 3: Quantize to the BPM-constrained grids
        const rawBeats = rhythmQuantizer.quantizeToGrids(
            transients, beatMap, 'mid', finalDecisions
        );

        // All quantized beats should be on 8th grid
        for (const beat of rawBeats) {
            expect(beat.gridType).toBe('straight_8th');
            expect(beat.gridPosition).toBeGreaterThanOrEqual(0);
            expect(beat.gridPosition).toBeLessThanOrEqual(1);
        }
    });

    it('should quantize using original transient timestamps (not re-quantized)', () => {
        const bpm = 170;
        const quarterNoteInterval = 60 / bpm;

        // Place transient slightly off an 8th note position.
        // It should snap to the nearest 8th, with quantization error
        // measured from the ORIGINAL position.
        const originalTimestamp = quarterNoteInterval * 0.5 + 0.02; // 20ms after 8th position 1
        const transients: TransientResult[] = [
            createTransient(originalTimestamp, 0.8, 'mid'),
        ];

        const beatMap = createMockBeatMap({ bpm, numBeats: 4 });
        const rhythmQuantizer = new RhythmQuantizer();
        const tempoQuantizer = new TempoAwareQuantizer(
            DEFAULT_TEMPO_AWARE_CONFIG,
            rhythmQuantizer
        );

        const finalDecisions = tempoQuantizer.decideGrids(transients, beatMap, 'mid');
        const rawBeats = rhythmQuantizer.quantizeToGrids(
            transients, beatMap, 'mid', finalDecisions
        );

        expect(rawBeats).toHaveLength(1);
        const beat = rawBeats[0];

        // The quantized timestamp should be on an 8th note grid position
        const beatStart = beatMap.beats[0].timestamp;
        const expectedGridPositions = [
            beatStart,                    // 8th position 0
            beatStart + quarterNoteInterval / 2, // 8th position 1
        ];
        expect(expectedGridPositions).toContain(beat.timestamp);

        // Quantization error should be calculated from original position
        expect(beat.quantizationError).toBeDefined();
        expect(beat.quantizationError).toBeCloseTo(
            Math.abs(originalTimestamp - beat.timestamp) * 1000,
            2
        );
    });

    it('should deduplicate when BPM rule causes two transients to snap to same grid point', () => {
        const bpm = 180;
        const quarterNoteInterval = 60 / bpm;

        // Two transients at different 16th positions that both map to the same 8th position
        // when BPM rule forces 16th → 8th:
        // 16th position 0 → 8th position 0
        // 16th position 1 → 8th position 0 (quarterNoteInterval/4 < quarterNoteInterval/4... wait)
        // Actually: 16th pos 0 = beatStart, 16th pos 1 = beatStart + QNI/4
        // Both snap to 8th pos 0 = beatStart when QNI/4 < QNI/4...
        // Let's think: 8th pos 0 = 0, 8th pos 1 = QNI/2
        // 16th pos 0 = 0 → snaps to 8th pos 0
        // 16th pos 1 = QNI/4 → closer to 8th pos 0 (QNI/4) than 8th pos 1 (QNI/4), ties go to lower
        // Actually QNI/4 is equidistant from 0 and QNI/2. The code uses Math.round:
        // Math.round((QNI/4 - 0) / (QNI/2)) = Math.round(0.5) = 1 (rounds to even in JS? No, Math.round(0.5) = 1)
        // So 16th pos 1 snaps to 8th pos 1. Let's use 16th pos 0 and pos 1 with the transient slightly off-center.

        const transients: TransientResult[] = [
            createTransient(quarterNoteInterval * 0.05, 0.9, 'mid'), // Near 16th pos 0
            createTransient(quarterNoteInterval * 0.20, 0.7, 'mid'), // Near 16th pos 1
        ];

        const beatMap = createMockBeatMap({ bpm, numBeats: 4 });
        const rhythmQuantizer = new RhythmQuantizer();
        const tempoQuantizer = new TempoAwareQuantizer(
            DEFAULT_TEMPO_AWARE_CONFIG,
            rhythmQuantizer
        );

        // Get BPM-constrained decisions
        const finalDecisions = tempoQuantizer.decideGrids(transients, beatMap, 'mid');

        // Quantize to the constrained grids
        const rawBeats = rhythmQuantizer.quantizeToGrids(
            transients, beatMap, 'mid', finalDecisions
        );

        // Deduplicate (this is what RhythmQuantizer.quantizeBand does internally)
        const deduplicated = rhythmQuantizer['deduplicateBeats'](rawBeats);

        // Since both transients were in beat 0 and forced to 8th grid,
        // they may snap to the same or different 8th positions.
        // If they snap to the same position, dedup should keep only the strongest.
        // The important thing is dedup doesn't crash and produces valid output.
        for (const beat of deduplicated) {
            expect(beat.gridType).toBe('straight_8th');
            expect(beat.intensity).toBeGreaterThan(0);
        }

        // Verify dedup did its job: no two beats should share the same (beatIndex, gridPosition, gridType)
        const seen = new Set<string>();
        for (const beat of deduplicated) {
            const key = `${beat.beatIndex}:${beat.gridPosition}:${beat.gridType}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
        }
    });

    it('should not lose accuracy at normal BPM (no rule interference)', () => {
        const bpm = 100;
        const quarterNoteInterval = 60 / bpm;
        const sixteenthInterval = quarterNoteInterval / 4;

        // Transients placed exactly on 16th grid positions
        const transients: TransientResult[] = [
            createTransient(0.0, 0.8, 'mid'),                              // 16th pos 0
            createTransient(sixteenthInterval, 0.7, 'mid'),                 // 16th pos 1
            createTransient(sixteenthInterval * 2, 0.6, 'mid'),             // 16th pos 2
            createTransient(sixteenthInterval * 3, 0.9, 'mid'),             // 16th pos 3
        ];

        const beatMap = createMockBeatMap({ bpm, numBeats: 4 });
        const rhythmQuantizer = new RhythmQuantizer();
        const tempoQuantizer = new TempoAwareQuantizer(
            DEFAULT_TEMPO_AWARE_CONFIG,
            rhythmQuantizer
        );

        const finalDecisions = tempoQuantizer.decideGrids(transients, beatMap, 'mid');
        const rawBeats = rhythmQuantizer.quantizeToGrids(
            transients, beatMap, 'mid', finalDecisions
        );

        // At 100 BPM (< 160), rules should not apply. 16th grid should be preserved.
        // All 4 transients should be on separate 16th grid positions.
        const gridPositions = rawBeats.map(b => b.gridPosition).sort();
        expect(rawBeats).toHaveLength(4);
        expect(gridPositions).toEqual([0, 1, 2, 3]);

        // Quantization error should be near-zero for exact grid positions
        for (const beat of rawBeats) {
            expect(beat.quantizationError).toBeLessThan(1.0);
        }
    });
});

// ============================================================================
// Rule Interface Extensibility Tests
// ============================================================================

describe('Rule interface extensibility', () => {
    it('should support a no-op rule that passes decisions through unchanged', () => {
        const noopRule: TempoQuantizationRule = {
            id: 'noop-rule',
            description: 'Does nothing',
            applies: () => true,
            apply: (decisions) => decisions,
        };

        const quantizer = new TempoAwareQuantizer({
            rules: [noopRule],
            enabled: true,
        });

        const decisions = [createGridDecision({ selectedGrid: 'straight_16th' })];
        const context: TempoRuleContext = {
            bpm: 200,
            quarterNoteInterval: 60 / 200,
            band: 'mid',
            transients: [],
        };

        const result = quantizer.applyRules(decisions, context);

        expect(result).toEqual(decisions);
        expect(result[0].selectedGrid).toBe('straight_16th');
    });

    it('should support custom rule alongside built-in rule', () => {
        // Custom rule that forces everything to triplet at very high BPM
        const forceTripletRule: TempoQuantizationRule = {
            id: 'force-triplet-at-extreme-bpm',
            description: 'Force triplet grid above 250 BPM',
            applies: (bpm) => bpm >= 250,
            apply: (decisions) =>
                decisions.map(d => ({
                    ...d,
                    selectedGrid: 'triplet_8th' as const,
                    confidence: 1.0,
                    straightAvgOffset: undefined,
                    tripletAvgOffset: undefined,
                })),
        };

        const quantizer = new TempoAwareQuantizer({
            rules: [
                new HighBpmGridRestrictionRule(),
                forceTripletRule,
            ],
            enabled: true,
        });

        // At 260 BPM, high BPM rule fires first (16th → 8th),
        // then force triplet rule fires (8th → triplet)
        const decisions = [createGridDecision({ selectedGrid: 'straight_16th' })];
        const context: TempoRuleContext = {
            bpm: 260,
            quarterNoteInterval: 60 / 260,
            band: 'mid',
            transients: [],
        };

        const result = quantizer.applyRules(decisions, context);

        // High BPM rule converts 16th → 8th, then custom rule converts 8th → triplet
        expect(result[0].selectedGrid).toBe('triplet_8th');
        expect(result[0].confidence).toBe(1.0);
    });

    it('should not apply custom rule when its applies() returns false', () => {
        const neverApplyRule: TempoQuantizationRule = {
            id: 'never-apply',
            description: 'Never applies',
            applies: () => false,
            apply: (decisions) =>
                decisions.map(d => ({ ...d, selectedGrid: 'straight_8th' as const })),
        };

        const quantizer = new TempoAwareQuantizer({
            rules: [neverApplyRule],
            enabled: true,
        });

        const decisions = [createGridDecision({ selectedGrid: 'straight_16th' })];
        const context: TempoRuleContext = {
            bpm: 200,
            quarterNoteInterval: 60 / 200,
            band: 'mid',
            transients: [],
        };

        const result = quantizer.applyRules(decisions, context);
        expect(result[0].selectedGrid).toBe('straight_16th');
    });
});

// ============================================================================
// DEFAULT_TEMPO_AWARE_CONFIG Tests
// ============================================================================

describe('DEFAULT_TEMPO_AWARE_CONFIG', () => {
    it('should have enabled=true', () => {
        expect(DEFAULT_TEMPO_AWARE_CONFIG.enabled).toBe(true);
    });

    it('should contain the HighBpmGridRestrictionRule', () => {
        expect(DEFAULT_TEMPO_AWARE_CONFIG.rules).toHaveLength(1);
        expect(DEFAULT_TEMPO_AWARE_CONFIG.rules[0].id).toBe('high-bpm-grid-restriction');
    });

    it('should have a working rule instance', () => {
        const rule = DEFAULT_TEMPO_AWARE_CONFIG.rules[0];
        const context: TempoRuleContext = {
            bpm: 170,
            quarterNoteInterval: 60 / 170,
            band: 'mid',
            transients: [],
        };

        expect(rule.applies(170, context)).toBe(true);

        const decisions = [createGridDecision({ selectedGrid: 'straight_16th' })];
        const result = rule.apply(decisions, context);
        expect(result[0].selectedGrid).toBe('straight_8th');
    });
});
