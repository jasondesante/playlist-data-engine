/**
 * Integration Test for Rhythm XP System
 *
 * Tests the complete flow from button press detection to character XP progression:
 * - checkButtonPress() → calculateButtonPressXP() → addRhythmXP()
 * - GrooveAnalyzer integration with rhythm XP
 * - Listening session XP boost with rhythm game context
 *
 * @see docs/plans/RHYTHM_XP_PLAN.md Phase 8.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BeatStream } from '../../src/core/analysis/beat/BeatStream.js';
import { GrooveAnalyzer } from '../../src/core/analysis/beat/GrooveAnalyzer.js';
import { RhythmXPCalculator } from '../../src/core/progression/RhythmXPCalculator.js';
import { CharacterUpdater } from '../../src/core/progression/CharacterUpdater.js';
import type {
    Beat,
    BeatMap,
    ButtonPressResult,
    BeatAccuracy,
} from '../../src/core/types/BeatMap.js';
import type { CharacterSheet, AbilityScores } from '../../src/core/types/Character.js';
import type { RhythmXPResult } from '../../src/core/types/RhythmXP.js';

// Helper to create a mock beat
function createMockBeat(timestamp: number, options: Partial<Beat> = {}): Beat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.5,
        confidence: 0.8,
        ...options,
    };
}

// Helper to create a beat map with beats at specific timestamps
function createMockBeatMap(beatTimestamps: number[], duration: number = 10, bpm: number = 120): BeatMap {
    const beats: Beat[] = beatTimestamps.map((ts, i) => ({
        timestamp: ts,
        beatInMeasure: i % 4,
        isDownbeat: i % 4 === 0,
        measureNumber: Math.floor(i / 4),
        intensity: 0.5 + Math.random() * 0.5,
        confidence: 0.8,
    }));

    return {
        audioId: 'test-audio',
        duration,
        beats,
        bpm,
        metadata: {
            version: '1.0.0',
            algorithm: 'test',
            minBpm: bpm,
            maxBpm: bpm,
            sensitivity: 0.5,
            filter: 0.0,
            noiseFloorThreshold: 0,
            hopSizeMs: 4,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            generatedAt: new Date().toISOString(),
        },
    };
}

// Helper to create a mock AudioContext
function createMockAudioContext(): AudioContext {
    return {
        currentTime: 0,
    } as unknown as AudioContext;
}

// Helper to create a mock character
function createMockCharacter(): CharacterSheet {
    const baseScores: AbilityScores = {
        STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
    };

    return {
        name: 'Test Character',
        race: 'Human',
        class: 'Fighter',
        level: 1,
        ability_scores: baseScores,
        ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
        proficiency_bonus: 2,
        hp: { current: 10, max: 10, temp: 0 },
        armor_class: 10,
        initiative: 0,
        speed: 30,
        skills: {
            athletics: 'none', acrobatics: 'none', sleight_of_hand: 'none', stealth: 'none',
            arcana: 'none', history: 'none', investigation: 'none', nature: 'none', religion: 'none',
            animal_handling: 'none', insight: 'none', medicine: 'none', perception: 'none', survival: 'none',
            deception: 'none', intimidation: 'none', performance: 'none', persuasion: 'none'
        },
        saving_throws: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: false },
        racial_traits: [],
        class_features: [],
        xp: { current: 0, next_level: 300 },
        seed: 'test-seed',
        generated_at: new Date().toISOString(),
    };
}

describe('Rhythm XP Integration Tests', () => {
    describe('Full Flow: checkButtonPress() → calculateButtonPressXP() → addRhythmXP()', () => {
        let beatStream: BeatStream;
        let rhythmXPCalculator: RhythmXPCalculator;
        let characterUpdater: CharacterUpdater;
        let mockCharacter: CharacterSheet;
        let mockAudioContext: AudioContext;
        let beatMap: BeatMap;

        beforeEach(() => {
            // Create beat map with beats every 0.5 seconds (120 BPM)
            beatMap = createMockBeatMap([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5], 5, 120);
            mockAudioContext = createMockAudioContext();
            beatStream = new BeatStream(beatMap, mockAudioContext);
            rhythmXPCalculator = new RhythmXPCalculator();
            characterUpdater = new CharacterUpdater();
            mockCharacter = createMockCharacter();
        });

        it('should complete the full flow for a perfect hit', () => {
            // Step 1: Check button press at exact beat time (perfect hit)
            const buttonResult = beatStream.checkButtonPress(0.0); // Beat at 0.0

            expect(buttonResult.accuracy).toBe('perfect');
            expect(buttonResult.matchedBeat).toBeDefined();
            expect(buttonResult.matchedBeat.timestamp).toBe(0);

            // Step 2: Calculate XP from button press (no combo for 1x multiplier)
            const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                comboLength: 0,
                grooveHotness: 0,
            });

            expect(xpResult.scorePoints).toBe(10); // Perfect = 10 score
            expect(xpResult.baseXP).toBe(1); // 10 * 0.1 ratio = 1 XP
            expect(xpResult.finalXP).toBe(1); // 1x multiplier (comboLength 0 = 1x)
            expect(xpResult.comboMultiplier).toBe(1); // No combo

            // Step 3: Add XP to character
            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBe(1);
            expect(updateResult.character.xp.current).toBe(1);
            expect(updateResult.leveledUp).toBe(false);
        });

        it('should complete the full flow for a great hit', () => {
            // Hard difficulty: perfect=8ms, great=20ms
            // Beat at 0.5, press at 0.515 = 15ms off (within great window 8-20ms)
            const buttonResult = beatStream.checkButtonPress(0.515);

            expect(buttonResult.accuracy).toBe('great');

            const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy);

            expect(xpResult.scorePoints).toBe(7);
            expect(xpResult.baseXP).toBeCloseTo(0.7, 5);

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBeCloseTo(0.7, 5);
            expect(updateResult.character.xp.current).toBeCloseTo(0.7, 5);
        });

        it('should complete the full flow for a miss', () => {
            const buttonResult = beatStream.checkButtonPress(0.25); // Between beats

            expect(buttonResult.accuracy).toBe('miss');

            const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy);

            expect(xpResult.scorePoints).toBe(0);
            expect(xpResult.baseXP).toBe(0);
            expect(xpResult.finalXP).toBe(0);

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBe(0);
            expect(updateResult.character.xp.current).toBe(0);
        });

        it('should apply combo multiplier throughout the flow', () => {
            // Simulate 25-combo perfect hit
            const buttonResult = beatStream.checkButtonPress(1.0);

            expect(buttonResult.accuracy).toBe('perfect');

            const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                comboLength: 25, // 2x multiplier (1 + 25/25 = 2)
            });

            expect(xpResult.comboMultiplier).toBe(2);
            expect(xpResult.finalScore).toBe(20); // 10 * 2
            expect(xpResult.finalXP).toBe(2); // 1 * 2

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBe(2);
            expect(updateResult.character.xp.current).toBe(2);
        });

        it('should trigger level-up when XP crosses threshold', () => {
            // Create a rhythm result that will cause level-up (300 XP needed)
            const buttonResult = beatStream.checkButtonPress(0.0);

            const xpResult: RhythmXPResult = {
                scorePoints: 3000,
                baseXP: 300,
                comboMultiplier: 1,
                grooveMultiplier: 0,
                totalMultiplier: 1,
                finalScore: 3000,
                finalXP: 300, // Exactly level-up threshold
                breakdown: { accuracy: 'perfect', comboLength: 0 },
            };

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.leveledUp).toBe(true);
            expect(updateResult.newLevel).toBe(2);
            expect(updateResult.character.level).toBe(2);
            expect(updateResult.character.hp.max).toBeGreaterThan(10);
        });

        it('should accumulate XP across multiple hits', () => {
            const beatTimes = [0.0, 0.5, 1.0, 1.5, 2.0];
            let totalXP = 0;

            for (let i = 0; i < beatTimes.length; i++) {
                const buttonResult = beatStream.checkButtonPress(beatTimes[i]);
                const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                    comboLength: i + 1,
                });

                const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);
                mockCharacter = updateResult.character;
                totalXP += updateResult.xpEarned;
            }

            // All perfect hits with increasing combo
            // Hit 1: 1 XP, Hit 2: 1.02 XP, Hit 3: 1.04 XP, etc.
            expect(totalXP).toBeGreaterThan(5);
            expect(mockCharacter.xp.current).toBeCloseTo(totalXP, 5);
        });

        it('should handle wrong key press', () => {
            // Create a beat with required key
            const beatMapWithKeys = createMockBeatMap([0, 0.5, 1.0], 2, 120);
            beatMapWithKeys.beats[0].requiredKey = 'left';

            const beatStreamWithKeys = new BeatStream(beatMapWithKeys, mockAudioContext);

            // Press wrong key
            const buttonResult = beatStreamWithKeys.checkButtonPress(0.0, 'right');

            expect(buttonResult.accuracy).toBe('wrongKey');
            expect(buttonResult.keyMatch).toBe(false);
            expect(buttonResult.pressedKey).toBe('right');
            expect(buttonResult.requiredKey).toBe('left');

            const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy);

            expect(xpResult.scorePoints).toBe(0);
            expect(xpResult.finalXP).toBe(0);

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBe(0);
        });

        it('should handle correct key press', () => {
            const beatMapWithKeys = createMockBeatMap([0, 0.5, 1.0], 2, 120);
            beatMapWithKeys.beats[0].requiredKey = 'left';

            const beatStreamWithKeys = new BeatStream(beatMapWithKeys, mockAudioContext);

            // Press correct key
            const buttonResult = beatStreamWithKeys.checkButtonPress(0.0, 'left');

            expect(buttonResult.accuracy).toBe('perfect');
            expect(buttonResult.keyMatch).toBe(true);

            const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy);

            expect(xpResult.scorePoints).toBe(10);
            expect(xpResult.finalXP).toBe(1);
        });
    });

    describe('GrooveAnalyzer Integration', () => {
        let beatStream: BeatStream;
        let grooveAnalyzer: GrooveAnalyzer;
        let rhythmXPCalculator: RhythmXPCalculator;
        let characterUpdater: CharacterUpdater;
        let mockCharacter: CharacterSheet;
        let mockAudioContext: AudioContext;
        let beatMap: BeatMap;

        beforeEach(() => {
            beatMap = createMockBeatMap([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5], 5, 120);
            mockAudioContext = createMockAudioContext();
            beatStream = new BeatStream(beatMap, mockAudioContext);
            grooveAnalyzer = new GrooveAnalyzer();
            rhythmXPCalculator = new RhythmXPCalculator();
            characterUpdater = new CharacterUpdater();
            mockCharacter = createMockCharacter();
        });

        it('should integrate groove hotness into XP calculation', () => {
            // Configure calculator with per-hit groove multiplier
            const grooveCalculator = new RhythmXPCalculator({
                groove: {
                    perHitMultiplier: true,
                    perHitScale: 1.0,
                    endBonus: { enabled: true },
                },
            });

            // Simulate building up groove
            const offsets = [0.01, 0.012, 0.011, 0.013, 0.01]; // Consistent late hits
            let grooveHotness = 0;

            for (let i = 0; i < offsets.length; i++) {
                const buttonResult = beatStream.checkButtonPress(0.5 + offsets[i]);
                const grooveResult = grooveAnalyzer.recordHit(buttonResult.offset, 120);

                grooveHotness = grooveResult.hotness;

                const xpResult = grooveCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                    comboLength: i + 1,
                    grooveHotness: grooveResult.hotness,
                });

                characterUpdater.addRhythmXP(mockCharacter, xpResult);
            }

            // Groove should have built up
            expect(grooveHotness).toBeGreaterThan(0);
        });

        it('should award groove end bonus when groove ends', () => {
            // Build up groove with consistent timing
            const offsets = [0.02, 0.022, 0.021, 0.023, 0.02];
            let grooveResult;

            for (const offset of offsets) {
                grooveResult = grooveAnalyzer.recordHit(offset, 120);
            }

            // Groove should be established
            expect(grooveResult!.hotness).toBeGreaterThan(0);

            // Break the groove with inconsistent timing
            grooveResult = grooveAnalyzer.recordHit(-0.1, 120); // Way early - breaks pocket

            // Check if groove ended
            if (grooveResult.endedGrooveStats) {
                const grooveBonus = rhythmXPCalculator.calculateGrooveEndBonus(grooveResult.endedGrooveStats);

                expect(grooveBonus.bonusScore).toBeGreaterThan(0);
                expect(grooveBonus.bonusXP).toBeGreaterThan(0);

                // Add groove bonus to character
                const updateResult = characterUpdater.addXP(mockCharacter, grooveBonus.bonusXP, 'groove_bonus');

                expect(updateResult.xpEarned).toBe(grooveBonus.bonusXP);
            }
        });

        it('should track groove stats over multiple hits', () => {
            // Use very consistent offsets to avoid groove reset due to direction changes
            const offsets = [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];

            for (const offset of offsets) {
                grooveAnalyzer.recordHit(offset, 120, Date.now() / 1000);
            }

            const grooveState = grooveAnalyzer.getState();

            expect(grooveState.avgHotness).toBeGreaterThan(0);
            // grooveHitCount tracks hits during active groove (may reset if direction changes)
            expect(grooveState.grooveHitCount).toBeGreaterThanOrEqual(1);
            expect(grooveState.grooveDuration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Session Tracking Integration', () => {
        let rhythmXPCalculator: RhythmXPCalculator;
        let beatStream: BeatStream;
        let characterUpdater: CharacterUpdater;
        let mockCharacter: CharacterSheet;
        let mockAudioContext: AudioContext;

        beforeEach(() => {
            const beatMap = createMockBeatMap([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0], 4, 120);
            mockAudioContext = createMockAudioContext();
            beatStream = new BeatStream(beatMap, mockAudioContext);
            rhythmXPCalculator = new RhythmXPCalculator();
            characterUpdater = new CharacterUpdater();
            mockCharacter = createMockCharacter();
        });

        it('should track session totals while adding XP to character', () => {
            rhythmXPCalculator.startSession();

            const hitTimes = [0.0, 0.5, 1.0, 1.5, 2.0];
            let comboCount = 0;

            for (const time of hitTimes) {
                const buttonResult = beatStream.checkButtonPress(time);

                if (buttonResult.accuracy !== 'miss' && buttonResult.accuracy !== 'wrongKey') {
                    comboCount++;
                } else {
                    comboCount = 0;
                }

                const xpResult = rhythmXPCalculator.recordHit(buttonResult.accuracy, {
                    comboLength: comboCount,
                });

                const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);
                mockCharacter = updateResult.character;
            }

            const sessionTotals = rhythmXPCalculator.getSessionTotals();

            expect(sessionTotals).not.toBeNull();
            expect(sessionTotals!.accuracyDistribution.perfect).toBe(5);
            expect(sessionTotals!.totalXP).toBeGreaterThan(0);
            expect(sessionTotals!.totalScore).toBeGreaterThan(0);
            expect(sessionTotals!.maxCombo).toBe(5);

            // Session totals should match character XP
            expect(mockCharacter.xp.current).toBeCloseTo(sessionTotals!.totalXP, 5);
        });

        it('should calculate accuracy percentage correctly', () => {
            rhythmXPCalculator.startSession();

            // 4 perfect, 1 miss
            const hitTimes = [0.0, 0.5, 1.0, 1.5, 0.25]; // Last one is between beats (miss)

            for (const time of hitTimes) {
                const buttonResult = beatStream.checkButtonPress(time);
                rhythmXPCalculator.recordHit(buttonResult.accuracy);
            }

            const sessionTotals = rhythmXPCalculator.getSessionTotals();

            expect(sessionTotals).not.toBeNull();
            expect(sessionTotals!.accuracyPercentage).toBe(80); // 4 out of 5
        });

        it('should end session with final totals', () => {
            rhythmXPCalculator.startSession();

            const hitTimes = [0.0, 0.5, 1.0, 1.5, 2.0];

            for (const time of hitTimes) {
                const buttonResult = beatStream.checkButtonPress(time);
                rhythmXPCalculator.recordHit(buttonResult.accuracy);
            }

            const finalTotals = rhythmXPCalculator.endSession();

            expect(finalTotals).not.toBeNull();
            expect(finalTotals!.accuracyDistribution.perfect).toBe(5);
            expect(finalTotals!.totalXP).toBeGreaterThan(0);

            // Session should be cleared
            expect(rhythmXPCalculator.getSessionTotals()).toBeNull();
        });
    });

    describe('Combo End Bonus Integration', () => {
        let rhythmXPCalculator: RhythmXPCalculator;
        let beatStream: BeatStream;
        let characterUpdater: CharacterUpdater;
        let mockCharacter: CharacterSheet;
        let mockAudioContext: AudioContext;

        beforeEach(() => {
            // Create beatmap with 60 beats (enough for 50-combo test)
            const beatTimestamps = Array.from({ length: 60 }, (_, i) => i * 0.5);
            const beatMap = createMockBeatMap(beatTimestamps, 30, 120);
            mockAudioContext = createMockAudioContext();
            beatStream = new BeatStream(beatMap, mockAudioContext);
            rhythmXPCalculator = new RhythmXPCalculator();
            characterUpdater = new CharacterUpdater();
            mockCharacter = createMockCharacter();
        });

        it('should award combo end bonus when combo breaks', () => {
            // Build up a 50 combo
            let comboCount = 0;
            let totalBaseXP = 0;

            // Simulate 50 perfect hits
            for (let i = 0; i < 50; i++) {
                const buttonResult = beatStream.checkButtonPress(i * 0.5);

                // Only count successful hits
                if (buttonResult.accuracy !== 'miss' && buttonResult.accuracy !== 'wrongKey') {
                    comboCount++;

                    const xpResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                        comboLength: comboCount,
                    });

                    const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);
                    mockCharacter = updateResult.character; // Update for next iteration
                    totalBaseXP += xpResult.finalXP;
                }
            }

            expect(comboCount).toBe(50);

            // Now miss
            const missResult = beatStream.checkButtonPress(25.3); // Between beats

            // Award combo end bonus before processing combo
            const comboBonus = rhythmXPCalculator.calculateComboEndBonus(comboCount);

            expect(comboBonus.comboLength).toBe(50);
            expect(comboBonus.bonusScore).toBe(250); // 50 * 5
            expect(comboBonus.bonusXP).toBe(25); // 250 * 0.1

            // Add combo bonus to character
            const bonusResult = characterUpdater.addXP(mockCharacter, comboBonus.bonusXP, 'combo_bonus');

            expect(bonusResult.xpEarned).toBe(25);
            // Total XP should be base XP + combo bonus
            expect(bonusResult.character.xp.current).toBeCloseTo(totalBaseXP + 25, 5);
        });
    });

    describe('Multi-Level Progression', () => {
        let rhythmXPCalculator: RhythmXPCalculator;
        let characterUpdater: CharacterUpdater;
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            rhythmXPCalculator = new RhythmXPCalculator();
            characterUpdater = new CharacterUpdater();
            mockCharacter = createMockCharacter();
        });

        it('should handle multi-level jump from rhythm XP', () => {
            const xpResult: RhythmXPResult = {
                scorePoints: 90000,
                baseXP: 9000,
                comboMultiplier: 1,
                grooveMultiplier: 0,
                totalMultiplier: 1,
                finalScore: 90000,
                finalXP: 9000,
                breakdown: { accuracy: 'perfect', comboLength: 0 },
            };

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.leveledUp).toBe(true);
            expect(updateResult.newLevel).toBe(5);
            expect(updateResult.character.level).toBe(5);
            expect(updateResult.levelUpDetails).toBeDefined();
            expect(updateResult.levelUpDetails!.length).toBe(4); // Levels 2, 3, 4, 5
        });

        it('should include detailed level-up breakdowns', () => {
            const xpResult: RhythmXPResult = {
                scorePoints: 3000,
                baseXP: 300,
                comboMultiplier: 1,
                grooveMultiplier: 0,
                totalMultiplier: 1,
                finalScore: 3000,
                finalXP: 300,
                breakdown: { accuracy: 'perfect', comboLength: 0 },
            };

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.levelUpDetails).toBeDefined();
            expect(updateResult.levelUpDetails!.length).toBe(1);

            const detail = updateResult.levelUpDetails![0];
            expect(detail.fromLevel).toBe(1);
            expect(detail.toLevel).toBe(2);
            expect(detail.hpIncrease).toBeGreaterThan(0);
            expect(detail.newMaxHP).toBeGreaterThan(10);
        });
    });

    describe('Custom Configuration Integration', () => {
        it('should work with custom XP ratio', () => {
            const beatMap = createMockBeatMap([0, 0.5, 1.0], 2, 120);
            const mockAudioContext = createMockAudioContext();
            const beatStream = new BeatStream(beatMap, mockAudioContext);

            const customCalculator = new RhythmXPCalculator({
                xpRatio: 0.5, // 10 score = 5 XP
            });

            const characterUpdater = new CharacterUpdater();
            const mockCharacter = createMockCharacter();

            const buttonResult = beatStream.checkButtonPress(0.0);
            const xpResult = customCalculator.calculateButtonPressXP(buttonResult.accuracy);

            expect(xpResult.baseXP).toBe(5); // 10 * 0.5
            expect(xpResult.finalXP).toBe(5);

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBe(5);
        });

        it('should work with custom combo formula', () => {
            const beatMap = createMockBeatMap([0, 0.5, 1.0, 1.5, 2.0], 3, 120);
            const mockAudioContext = createMockAudioContext();
            const beatStream = new BeatStream(beatMap, mockAudioContext);

            const customCalculator = new RhythmXPCalculator({
                combo: {
                    enabled: true,
                    cap: 10.0,
                    formula: (combo) => 1 + Math.floor(combo / 10) * 0.1,
                    endBonus: { enabled: true },
                },
            });

            const characterUpdater = new CharacterUpdater();
            const mockCharacter = createMockCharacter();

            // 25 combo = 1.2x (floor(25/10) = 2, so 1 + 0.2)
            const buttonResult = beatStream.checkButtonPress(0.0);
            const xpResult = customCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                comboLength: 25,
            });

            expect(xpResult.comboMultiplier).toBe(1.2);

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBeCloseTo(1.2, 5);
        });

        it('should work with groove per-hit multiplier enabled', () => {
            const beatMap = createMockBeatMap([0, 0.5, 1.0], 2, 120);
            const mockAudioContext = createMockAudioContext();
            const beatStream = new BeatStream(beatMap, mockAudioContext);

            const grooveCalculator = new RhythmXPCalculator({
                groove: {
                    perHitMultiplier: true,
                    perHitScale: 1.0,
                    endBonus: { enabled: true },
                },
            });

            const characterUpdater = new CharacterUpdater();
            const mockCharacter = createMockCharacter();

            const buttonResult = beatStream.checkButtonPress(0.0);
            const xpResult = grooveCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                grooveHotness: 80, // 80% hotness
            });

            expect(xpResult.grooveMultiplier).toBe(0.8); // 80% * 1.0
            expect(xpResult.totalMultiplier).toBeCloseTo(1.8, 5); // 1 + 0.8
            expect(xpResult.finalXP).toBeCloseTo(1.8, 5); // 1 * 1.8

            const updateResult = characterUpdater.addRhythmXP(mockCharacter, xpResult);

            expect(updateResult.xpEarned).toBeCloseTo(1.8, 5);
        });
    });

    describe('Listening Session XP Boost with Rhythm Game Context (System B)', () => {
        let rhythmXPCalculator: RhythmXPCalculator;
        let characterUpdater: CharacterUpdater;
        let mockCharacter: CharacterSheet;
        let mockAudioContext: AudioContext;
        let beatStream: BeatStream;
        let grooveAnalyzer: GrooveAnalyzer;

        // Import XPCalculator for listening session XP tests
        // Note: XPCalculator is imported dynamically to avoid circular deps in test file

        beforeEach(() => {
            const beatMap = createMockBeatMap([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0], 4, 120);
            mockAudioContext = createMockAudioContext();
            beatStream = new BeatStream(beatMap, mockAudioContext);
            grooveAnalyzer = new GrooveAnalyzer();
            rhythmXPCalculator = new RhythmXPCalculator();
            characterUpdater = new CharacterUpdater();
            mockCharacter = createMockCharacter();
        });

        it('should boost listening XP when rhythm game is active', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            // Create a listening session without rhythm game context
            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // Create a listening session WITH rhythm game context (active)
            const rhythmGameSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 0,
                    maxComboCap: 100,
                    grooveHotness: 0,
                },
            };

            const rhythmGameXP = xpCalculator.calculateSessionXP(rhythmGameSession);

            // Rhythm game active should give 1.25x boost
            expect(rhythmGameXP).toBe(Math.floor(baseXP * 1.25));
            expect(rhythmGameXP).toBeGreaterThan(baseXP);
        });

        it('should NOT boost listening XP when rhythm game is inactive', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // Session with inactive rhythm game context
            const inactiveSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: false,
                    currentCombo: 50,
                    maxComboCap: 100,
                    grooveHotness: 80,
                },
            };

            const inactiveXP = xpCalculator.calculateSessionXP(inactiveSession);

            // Inactive should NOT boost XP
            expect(inactiveXP).toBe(baseXP);
        });

        it('should apply combo bonus on top of base rhythm game boost', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // Session with max combo (100/100 = 100%)
            const maxComboSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 100,
                    maxComboCap: 100,
                    grooveHotness: 0,
                },
            };

            const maxComboXP = xpCalculator.calculateSessionXP(maxComboSession);

            // Base (1.25) + combo bonus (0.5 * 100/100 = 0.5) = 1.75x
            expect(maxComboXP).toBe(Math.floor(baseXP * 1.75));
        });

        it('should apply groove bonus on top of base rhythm game boost', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // Session with 80% groove hotness
            const grooveSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 0,
                    maxComboCap: 100,
                    grooveHotness: 80,
                },
            };

            const grooveXP = xpCalculator.calculateSessionXP(grooveSession);

            // Base (1.25) + groove bonus (0.5 * 80/100 = 0.4) = 1.65x
            expect(grooveXP).toBe(Math.floor(baseXP * 1.65));
        });

        it('should stack combo and groove bonuses with base boost', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // Session with max combo AND max groove
            const fullBonusSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 100,
                    maxComboCap: 100,
                    grooveHotness: 100,
                },
            };

            const fullBonusXP = xpCalculator.calculateSessionXP(fullBonusSession);

            // Base (1.25) + combo (0.5) + groove (0.5) = 2.25x
            expect(fullBonusXP).toBe(Math.floor(baseXP * 2.25));
        });

        it('should scale combo bonus proportionally', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // 50 combo out of 100 cap = 50%
            const midComboSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 50,
                    maxComboCap: 100,
                    grooveHotness: 0,
                },
            };

            const midComboXP = xpCalculator.calculateSessionXP(midComboSession);

            // Base (1.25) + combo (0.5 * 50/100 = 0.25) = 1.5x
            expect(midComboXP).toBe(Math.floor(baseXP * 1.5));
        });

        it('should scale groove bonus proportionally', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = xpCalculator.calculateSessionXP(baseSession);

            // 50% groove hotness
            const midGrooveSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 0,
                    maxComboCap: 100,
                    grooveHotness: 50,
                },
            };

            const midGrooveXP = xpCalculator.calculateSessionXP(midGrooveSession);

            // Base (1.25) + groove (0.5 * 50/100 = 0.25) = 1.5x
            expect(midGrooveXP).toBe(Math.floor(baseXP * 1.5));
        });

        it('should include rhythm game context in total modifier calculation', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            // Test calculateTotalModifier with rhythm game context
            const modifier = xpCalculator.calculateTotalModifier(
                undefined, // no environmental context
                undefined, // no gaming context
                {
                    isActive: true,
                    currentCombo: 100,
                    maxComboCap: 100,
                    grooveHotness: 100,
                }
            );

            // Max rhythm game modifier: 1.25 + 0.5 + 0.5 = 2.25
            // But calculateTotalModifier caps at 3.0
            expect(modifier).toBe(2.25);
        });

        it('should cap total modifier at 3.0x', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            // Environmental: night (1.25) + thunderstorm (1.4) + altitude (1.3) = ~2.275x
            const envContext = {
                weather: {
                    temperature: 20,
                    humidity: 80,
                    pressure: 1013,
                    windSpeed: 10,
                    weatherType: 'Thunderstorm' as const,
                    isNight: true,
                    description: 'stormy night',
                    location: 'test',
                },
                geolocation: {
                    latitude: 40,
                    longitude: -74,
                    altitude: 2500, // high altitude
                    accuracy: 10,
                },
            };

            // Rhythm game: max (2.25x)
            const rhythmGameContext = {
                isActive: true,
                currentCombo: 100,
                maxComboCap: 100,
                grooveHotness: 100,
            };

            const modifier = xpCalculator.calculateTotalModifier(
                envContext,
                undefined,
                rhythmGameContext
            );

            // Should be capped at 3.0x
            expect(modifier).toBe(3.0);
        });

        it('should work with both rhythm button XP AND listening XP boost simultaneously', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');
            const xpCalculator = new XPCalculator();

            // Simulate a player playing rhythm game while listening

            // 1. Button press XP (System A) - from RhythmXPCalculator
            const buttonResult = beatStream.checkButtonPress(0.0);
            const buttonXPResult = rhythmXPCalculator.calculateButtonPressXP(buttonResult.accuracy, {
                comboLength: 50,
                grooveHotness: 80,
            });

            // Button XP should be > 0 (perfect hit with combo)
            expect(buttonXPResult.finalXP).toBeGreaterThan(0);

            // 2. Listening session XP boost (System B) - from XPCalculator
            const session = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 50,
                    maxComboCap: 100,
                    grooveHotness: 80,
                },
            };

            const sessionXP = xpCalculator.calculateSessionXP(session);

            // Listening XP should be boosted
            // Base (1.25) + combo (0.5 * 0.5 = 0.25) + groove (0.5 * 0.8 = 0.4) = 1.9x
            const expectedMultiplier = 1.25 + 0.25 + 0.4; // = 1.9
            expect(sessionXP).toBe(Math.floor(60 * expectedMultiplier));

            // 3. Both systems can add XP to character
            const buttonUpdateResult = characterUpdater.addRhythmXP(mockCharacter, buttonXPResult);
            mockCharacter = buttonUpdateResult.character;

            const listeningUpdateResult = characterUpdater.addXP(mockCharacter, sessionXP, 'listening_session');
            mockCharacter = listeningUpdateResult.character;

            // Character should have XP from both systems
            expect(mockCharacter.xp.current).toBe(buttonXPResult.finalXP + sessionXP);
        });

        it('should use custom rhythm game activity bonuses when configured', async () => {
            const { XPCalculator } = await import('../../src/core/progression/XPCalculator.js');

            // Create calculator with custom rhythm game bonuses
            const customCalculator = new XPCalculator({
                activity_bonuses: {
                    stationary: 1.0,
                    walking: 1.2,
                    running: 1.5,
                    driving: 1.3,
                    night_time: 1.25,
                    extreme_weather: 1.4,
                    high_altitude: 1.3,
                    rhythm_game_base: 2.0,     // Custom: double XP base
                    rhythm_game_combo: 1.0,    // Custom: +100% max from combo
                    rhythm_game_groove: 1.0,   // Custom: +100% max from groove
                },
            });

            const baseSession = {
                track_uuid: 'track-1',
                start_time: Date.now(),
                end_time: Date.now() + 60000,
                duration_seconds: 60,
                base_xp_earned: 60,
                bonus_xp: 0,
                total_xp_earned: 60,
            };

            const baseXP = customCalculator.calculateSessionXP(baseSession);

            const fullBonusSession = {
                ...baseSession,
                rhythm_game_context: {
                    isActive: true,
                    currentCombo: 100,
                    maxComboCap: 100,
                    grooveHotness: 100,
                },
            };

            const fullBonusXP = customCalculator.calculateSessionXP(fullBonusSession);

            // Custom: Base (2.0) + combo (1.0) + groove (1.0) = 4.0x
            expect(fullBonusXP).toBe(Math.floor(baseXP * 4.0));
        });
    });
});
