import { describe, it, expect } from 'vitest';
import { AppearanceGenerator } from '../../src/core/generation/AppearanceGenerator.js';
import type { AudioProfile } from '../../src/core/types/AudioProfile.js';
import type { Class } from '../../src/core/types/Character.js';

describe('AppearanceGenerator', () => {
    const mockAudioProfile: AudioProfile = {
        bass_dominance: 0.7,
        mid_dominance: 0.5,
        treble_dominance: 0.3,
        average_amplitude: 0.6,
        analysis_metadata: {
            duration_analyzed: 180,
            full_buffer_analyzed: false,
            sample_positions: [0.05, 0.4, 0.7],
            analyzed_at: new Date().toISOString(),
        },
    };

    const mockAudioProfileWithColors: AudioProfile = {
        ...mockAudioProfile,
        color_palette: {
            colors: ['#FF5733', '#33FF57', '#3357FF', '#F0E68C'],
            primary_color: '#FF5733',
            secondary_color: '#33FF57',
            accent_color: '#3357FF',
            brightness: 0.6,
            saturation: 0.8,
            is_monochrome: false,
        },
    };

    describe('Deterministic Generation', () => {
        it('should generate identical appearance for the same seed', () => {
            const seed = 'test-seed-123';
            const characterClass: Class = 'Fighter';

            const appearance1 = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);
            const appearance2 = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(appearance1).toEqual(appearance2);
        });

        it('should generate different appearances for different seeds', () => {
            const seed1 = 'test-seed-123';
            const seed2 = 'test-seed-456';
            const characterClass: Class = 'Fighter';

            const appearance1 = AppearanceGenerator.generate(seed1, characterClass, mockAudioProfile);
            const appearance2 = AppearanceGenerator.generate(seed2, characterClass, mockAudioProfile);

            // At least one field should be different
            const isDifferent =
                appearance1.body_type !== appearance2.body_type ||
                appearance1.skin_tone !== appearance2.skin_tone ||
                appearance1.hair_style !== appearance2.hair_style ||
                appearance1.hair_color !== appearance2.hair_color ||
                appearance1.eye_color !== appearance2.eye_color;

            expect(isDifferent).toBe(true);
        });
    });

    describe('Deterministic Features', () => {
        it('should generate valid body type', () => {
            const seed = 'test-seed-body';
            const characterClass: Class = 'Barbarian';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(['slender', 'athletic', 'muscular', 'stocky']).toContain(appearance.body_type);
        });

        it('should generate hex color for skin tone', () => {
            const seed = 'test-seed-skin';
            const characterClass: Class = 'Druid';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(appearance.skin_tone).toMatch(/^#[0-9A-F]{6}$/i);
        });

        it('should generate valid hair style', () => {
            const seed = 'test-seed-hair';
            const characterClass: Class = 'Rogue';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(typeof appearance.hair_style).toBe('string');
            expect(appearance.hair_style.length).toBeGreaterThan(0);
        });

        it('should generate hex color for hair', () => {
            const seed = 'test-seed-hair-color';
            const characterClass: Class = 'Bard';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(appearance.hair_color).toMatch(/^#[0-9A-F]{6}$/i);
        });

        it('should generate hex color for eyes', () => {
            const seed = 'test-seed-eyes';
            const characterClass: Class = 'Ranger';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(appearance.eye_color).toMatch(/^#[0-9A-F]{6}$/i);
        });

        it('should generate 1-3 facial features', () => {
            const seed = 'test-seed-features';
            const characterClass: Class = 'Paladin';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(Array.isArray(appearance.facial_features)).toBe(true);
            expect(appearance.facial_features.length).toBeGreaterThanOrEqual(1);
            expect(appearance.facial_features.length).toBeLessThanOrEqual(3);
        });
    });

    describe('Dynamic Features - Color Palette', () => {
        it('should use primary color from color palette', () => {
            const seed = 'test-seed-colors';
            const characterClass: Class = 'Fighter';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfileWithColors);

            expect(appearance.primary_color).toBe('#FF5733');
        });

        it('should use secondary color from color palette', () => {
            const seed = 'test-seed-colors';
            const characterClass: Class = 'Fighter';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfileWithColors);

            expect(appearance.secondary_color).toBe('#33FF57');
        });

        it('should handle missing color palette gracefully', () => {
            const seed = 'test-seed-no-colors';
            const characterClass: Class = 'Fighter';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(appearance.primary_color).toBeUndefined();
            expect(appearance.secondary_color).toBeUndefined();
        });
    });

    describe('Aura Color for Magical Classes', () => {
        const magicalClasses: Class[] = ['Wizard', 'Sorcerer', 'Warlock', 'Bard', 'Cleric', 'Druid', 'Paladin'];
        const nonMagicalClasses: Class[] = ['Fighter', 'Barbarian', 'Rogue', 'Ranger', 'Monk'];

        it('should generate aura color for magical classes', () => {
            const seed = 'test-seed-aura';

            magicalClasses.forEach((characterClass) => {
                const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);
                expect(appearance.aura_color).toBeDefined();
                expect(appearance.aura_color).toMatch(/^#[0-9A-F]{6}$/i);
            });
        });

        it('should NOT generate aura color for non-magical classes', () => {
            const seed = 'test-seed-no-aura';

            nonMagicalClasses.forEach((characterClass) => {
                const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);
                expect(appearance.aura_color).toBeUndefined();
            });
        });

        it('should use brightened primary color for magical classes when palette available', () => {
            const seed = 'test-seed-aura-color';
            const characterClass: Class = 'Wizard';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfileWithColors);

            expect(appearance.aura_color).toBeDefined();
            expect(appearance.aura_color).toMatch(/^#[0-9A-F]{6}$/i);
            // Should be different from primary color (brightened)
            expect(appearance.aura_color).not.toBe('#FF5733');
        });

        it('should use class-specific default aura when no palette', () => {
            const seed = 'test-seed-default-aura';
            const characterClass: Class = 'Wizard';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfile);

            expect(appearance.aura_color).toBe('#4169E1'); // Royal Blue for Wizard
        });
    });

    describe('Integration', () => {
        it('should generate complete appearance object', () => {
            const seed = 'test-seed-complete';
            const characterClass: Class = 'Wizard';

            const appearance = AppearanceGenerator.generate(seed, characterClass, mockAudioProfileWithColors);

            // Deterministic features
            expect(appearance.body_type).toBeDefined();
            expect(appearance.skin_tone).toBeDefined();
            expect(appearance.hair_style).toBeDefined();
            expect(appearance.hair_color).toBeDefined();
            expect(appearance.eye_color).toBeDefined();
            expect(appearance.facial_features).toBeDefined();

            // Dynamic features
            expect(appearance.primary_color).toBeDefined();
            expect(appearance.secondary_color).toBeDefined();
            expect(appearance.aura_color).toBeDefined();
        });
    });
});
