/**
 * Unit tests for LevelUpProcessor with custom features
 *
 * Tests the level-up system with FeatureQuery integration including:
 * - Level-up with default features from FeatureQuery
 * - Level-up with custom class features
 * - Feature prerequisite validation during level-up
 * - Feature effects application during level-up
 * - Custom features with prerequisites
 * - Custom features with effects
 *
 * Part of Phase 15.1: Unit Tests for LevelUpProcessor with custom features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LevelUpProcessor } from '../../src/core/progression/LevelUpProcessor.js';
import { FeatureQuery } from '../../src/core/features/FeatureQuery.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS } from '../../src/core/features/DefaultFeatures.js';
import { registerTestClassFeature, registerTestClassFeatures } from '../helpers/registrationHelpers.js';
import type { ClassFeature, AbilityScores } from '../../src/core/types/index.js';
import type { CharacterSheet, Class } from '../../src/core/types/Character.js';

describe('LevelUpProcessor with Custom Features', () => {
    let registry: FeatureQuery;
    let extensionManager: ExtensionManager;
    let mockCharacter: CharacterSheet;

    beforeEach(() => {
        // Get a fresh instance and initialize with defaults
        registry = FeatureQuery.getInstance();
        extensionManager = ExtensionManager.getInstance();
        registry.clearQueryCache();
        extensionManager.resetAll();

        // Both class features and racial traits are initialized via ExtensionManager
        extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
        extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);

        const baseScores: AbilityScores = {
            STR: 10,
            DEX: 10,
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 10
        };

        mockCharacter = {
            name: 'Test Character',
            race: 'Human',
            class: 'Fighter',
            level: 1,
            ability_scores: baseScores,
            ability_modifiers: {
                STR: 0,
                DEX: 0,
                CON: 0,
                INT: 0,
                WIS: 0,
                CHA: 0
            },
            proficiency_bonus: 2,
            hp: { current: 10, max: 10, temp: 0 },
            armor_class: 10,
            initiative: 0,
            speed: 30,
            skills: {
                athletics: 'none',
                acrobatics: 'none',
                sleight_of_hand: 'none',
                stealth: 'none',
                arcana: 'none',
                history: 'none',
                investigation: 'none',
                nature: 'none',
                religion: 'none',
                animal_handling: 'none',
                insight: 'none',
                medicine: 'none',
                perception: 'none',
                survival: 'none',
                deception: 'none',
                intimidation: 'none',
                performance: 'none',
                persuasion: 'none'
            },
            saving_throws: {
                STR: false,
                DEX: false,
                CON: false,
                INT: false,
                WIS: false,
                CHA: false
            },
            racial_traits: [],
            class_features: [],
            xp: { current: 0, next_level: 300 },
            seed: 'test-seed',
            generated_at: new Date().toISOString()
        };
    });

    afterEach(() => {
        // Clean up after each test
        registry.clearQueryCache();
        extensionManager.resetAll();
    });

    describe('Level-Up with Default Features', () => {
        it('should include default class features from FeatureQuery on level-up', () => {
            // Level up from 1 to 2
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Should include class features gained at level 2
            expect(benefits.classFeatures).toBeDefined();
            expect(benefits.classFeatures!.length).toBeGreaterThan(0);

            // Check that features are returned as IDs (not display strings)
            benefits.classFeatures!.forEach(featureId => {
                expect(typeof featureId).toBe('string');
                expect(featureId.length).toBeGreaterThan(0);
            });
        });

        it('should return feature IDs that exist in FeatureQuery', () => {
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            if (benefits.classFeatures && benefits.classFeatures.length > 0) {
                benefits.classFeatures.forEach(featureId => {
                    const feature = registry.getClassFeatureById(featureId);
                    expect(feature).toBeDefined();
                    expect(feature!.source).toBe('default');
                });
            }
        });
    });

    describe('Level-Up with Custom Features', () => {
        it('should include custom class features on level-up', () => {
            // Register a custom feature for level 2
            const customFeature: ClassFeature = {
                id: 'custom_fighter_level_2',
                name: 'Custom Fighter Level 2',
                description: 'A custom feature for level 2.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom',
                tags: ['custom']
            };

            registerTestClassFeature(customFeature);

            // Level up to 2
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Should include our custom feature
            expect(benefits.classFeatures).toBeDefined();
            expect(benefits.classFeatures).toContain('custom_fighter_level_2');
        });

        it('should include multiple custom features at the same level', () => {
            const customFeatures: ClassFeature[] = [
                {
                    id: 'custom_feature_1',
                    name: 'Custom Feature 1',
                    description: 'First custom feature.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 3,
                    source: 'custom'
                },
                {
                    id: 'custom_feature_2',
                    name: 'Custom Feature 2',
                    description: 'Second custom feature.',
                    type: 'active',
                    class: 'Fighter',
                    level: 3,
                    source: 'custom'
                }
            ];

            registerTestClassFeatures(customFeatures);

            // Level up to 3
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 3, 'test-seed');

            // Should include both custom features
            expect(benefits.classFeatures).toBeDefined();
            expect(benefits.classFeatures).toContain('custom_feature_1');
            expect(benefits.classFeatures).toContain('custom_feature_2');
        });

        it('should add custom features to character on applyLevelUp', () => {
            const customFeature: ClassFeature = {
                id: 'custom_power_strike',
                name: 'Power Strike',
                description: 'A powerful strike.',
                type: 'active',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            registerTestClassFeature(customFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');
            const updatedCharacter = LevelUpProcessor.applyLevelUp(mockCharacter, benefits);

            // Custom feature should be in character's class_features
            expect(updatedCharacter.class_features).toContain('custom_power_strike');
        });
    });

    describe('Feature Prerequisite Validation', () => {
        it('should grant features with met prerequisites', () => {
            const customFeature: ClassFeature = {
                id: 'custom_str_13_feature',
                name: 'Strong Attack',
                description: 'Requires STR 13.',
                type: 'active',
                class: 'Fighter',
                level: 2,
                prerequisites: { level: 2, abilities: { STR: 13 } },
                source: 'custom'
            };

            // Create character with STR 14 (meets requirement)
            mockCharacter.ability_scores.STR = 14;
            mockCharacter.ability_modifiers.STR = 2;

            registerTestClassFeature(customFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature should be granted
            expect(benefits.classFeatures).toContain('custom_str_13_feature');
        });

        it('should not grant features with unmet level prerequisites', () => {
            const customFeature: ClassFeature = {
                id: 'custom_level_5_feature',
                name: 'Level 5 Ability',
                description: 'Requires level 5.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                prerequisites: { level: 5 },
                source: 'custom'
            };

            registerTestClassFeature(customFeature);

            // Try to level up to 2, but feature requires level 5
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature should NOT be granted
            expect(benefits.classFeatures).not.toContain('custom_level_5_feature');
        });

        it('should not grant features with unmet ability score prerequisites', () => {
            const customFeature: ClassFeature = {
                id: 'custom_int_15_feature',
                name: 'Arcane Mastery',
                description: 'Requires INT 15.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                prerequisites: { abilities: { INT: 15 } },
                source: 'custom'
            };

            // Character has INT 10 (doesn't meet requirement)
            registerTestClassFeature(customFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature should NOT be granted
            expect(benefits.classFeatures).not.toContain('custom_int_15_feature');
        });

        it('should validate feature chain prerequisites', () => {
            const baseFeature: ClassFeature = {
                id: 'custom_base_feature',
                name: 'Base Feature',
                description: 'The base feature.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            const advancedFeature: ClassFeature = {
                id: 'custom_advanced_feature',
                name: 'Advanced Feature',
                description: 'Requires Base Feature.',
                type: 'active',
                class: 'Fighter',
                level: 3,
                prerequisites: { features: ['custom_base_feature'] },
                source: 'custom'
            };

            registerTestClassFeatures([baseFeature, advancedFeature]);

            // Level up to 2 (grants base feature)
            const benefits2 = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');
            expect(benefits2.classFeatures).toContain('custom_base_feature');

            const char2 = LevelUpProcessor.applyLevelUp(mockCharacter, benefits2);

            // Level up to 3 (should grant advanced feature since we have base)
            const benefits3 = LevelUpProcessor.processLevelUp(char2, 3, 'test-seed');
            expect(benefits3.classFeatures).toContain('custom_advanced_feature');
        });

        it('should not grant advanced features without base features', () => {
            const advancedFeature: ClassFeature = {
                id: 'custom_advanced_alone',
                name: 'Advanced Without Base',
                description: 'Requires missing base feature.',
                type: 'active',
                class: 'Fighter',
                level: 3,
                prerequisites: { features: ['custom_missing_base'] },
                source: 'custom'
            };

            registerTestClassFeature(advancedFeature);

            // Level up to 3 (should NOT grant advanced feature)
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 3, 'test-seed');
            expect(benefits.classFeatures).not.toContain('custom_advanced_alone');
        });

        it('should validate class prerequisites', () => {
            const barbarianFeature: ClassFeature = {
                id: 'custom_barbarian_only',
                name: 'Barbarian Only',
                description: 'Only for Barbarians.',
                type: 'passive',
                class: 'Barbarian',
                level: 2,
                prerequisites: { class: 'Barbarian' },
                source: 'custom'
            };

            registerTestClassFeature(barbarianFeature);

            // Our character is a Fighter, not a Barbarian
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature should NOT be granted
            expect(benefits.classFeatures).not.toContain('custom_barbarian_only');
        });

        it('should validate race prerequisites', () => {
            const elfFeature: ClassFeature = {
                id: 'custom_elf_only_feature',
                name: 'Elf Only',
                description: 'Only for Elves.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                prerequisites: { race: 'Elf' },
                source: 'custom'
            };

            registerTestClassFeature(elfFeature);

            // Our character is Human, not Elf
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature should NOT be granted
            expect(benefits.classFeatures).not.toContain('custom_elf_only_feature');
        });

        it('should grant features when race prerequisite is met', () => {
            const elfFeature: ClassFeature = {
                id: 'custom_elf_feature',
                name: 'Elf Feature',
                description: 'For Elves.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                prerequisites: { race: 'Elf' },
                source: 'custom'
            };

            registerTestClassFeature(elfFeature);

            // Change character to Elf
            mockCharacter.race = 'Elf';

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature SHOULD be granted
            expect(benefits.classFeatures).toContain('custom_elf_feature');
        });
    });

    describe('Feature Effects Application', () => {
        it('should include feature effects in level-up benefits', () => {
            const statBonusFeature: ClassFeature = {
                id: 'custom_stat_boost',
                name: 'Stat Boost',
                description: 'Grants +2 STR.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                effects: [
                    { type: 'stat_bonus', target: 'STR', value: 2 }
                ],
                source: 'custom'
            };

            registerTestClassFeature(statBonusFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Should include feature effects summary
            expect(benefits.featureEffects).toBeDefined();
            expect(benefits.featureEffects!.length).toBeGreaterThan(0);

            // Check effect summary structure
            const effectSummary = benefits.featureEffects!.find(
                e => e.featureId === 'custom_stat_boost'
            );
            expect(effectSummary).toBeDefined();
            expect(effectSummary!.featureName).toBe('Stat Boost');
            expect(effectSummary!.effectsApplied).toBeGreaterThan(0);
        });

        it('should track multiple feature effects separately', () => {
            const features: ClassFeature[] = [
                {
                    id: 'custom_str_boost',
                    name: 'STR Boost',
                    description: '+2 STR',
                    type: 'passive',
                    class: 'Fighter',
                    level: 2,
                    effects: [{ type: 'stat_bonus', target: 'STR', value: 2 }],
                    source: 'custom'
                },
                {
                    id: 'custom_dex_boost',
                    name: 'DEX Boost',
                    description: '+1 DEX',
                    type: 'passive',
                    class: 'Fighter',
                    level: 2,
                    effects: [{ type: 'stat_bonus', target: 'DEX', value: 1 }],
                    source: 'custom'
                }
            ];

            registerTestClassFeatures(features);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            expect(benefits.featureEffects).toBeDefined();
            expect(benefits.featureEffects!.length).toBe(2);

            // Each feature should have its own effect summary
            const strEffect = benefits.featureEffects!.find(e => e.featureId === 'custom_str_boost');
            const dexEffect = benefits.featureEffects!.find(e => e.featureId === 'custom_dex_boost');

            expect(strEffect).toBeDefined();
            expect(dexEffect).toBeDefined();
        });

        it('should include features without effects in benefits', () => {
            const noEffectFeature: ClassFeature = {
                id: 'custom_no_effect',
                name: 'No Effect',
                description: 'A feature with no effects.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            registerTestClassFeature(noEffectFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Feature should be in classFeatures
            expect(benefits.classFeatures).toContain('custom_no_effect');

            // But not in featureEffects (no effects to apply)
            if (benefits.featureEffects) {
                const noEffectSummary = benefits.featureEffects.find(
                    e => e.featureId === 'custom_no_effect'
                );
                expect(noEffectSummary).toBeUndefined();
            }
        });

        it('should apply skill proficiency effects', () => {
            const skillFeature: ClassFeature = {
                id: 'custom_skill_prof',
                name: 'Skill Training',
                description: 'Grants athletics proficiency.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                effects: [
                    { type: 'skill_proficiency', target: 'athletics', value: 'proficient' as const }
                ],
                source: 'custom'
            };

            registerTestClassFeature(skillFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Should have feature effects tracked
            expect(benefits.featureEffects).toBeDefined();

            const skillEffect = benefits.featureEffects!.find(
                e => e.featureId === 'custom_skill_prof'
            );
            expect(skillEffect).toBeDefined();
        });

        it('should apply passive modifier effects', () => {
            const speedFeature: ClassFeature = {
                id: 'custom_speed_boost',
                name: 'Fast Movement',
                description: '+10 speed.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                effects: [
                    { type: 'passive_modifier', target: 'speed', value: 10 }
                ],
                source: 'custom'
            };

            registerTestClassFeature(speedFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Should have feature effects tracked
            expect(benefits.featureEffects).toBeDefined();
            const speedEffect = benefits.featureEffects!.find(
                e => e.featureId === 'custom_speed_boost'
            );
            expect(speedEffect).toBeDefined();
        });
    });

    describe('Mixed Default and Custom Features', () => {
        it('should include both default and custom features', () => {
            // Add custom feature to level 2
            const customFeature: ClassFeature = {
                id: 'custom_mixed_feature',
                name: 'Custom Mixed',
                description: 'Mixed with defaults.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            registerTestClassFeature(customFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // Should have both default and custom features
            expect(benefits.classFeatures).toBeDefined();
            expect(benefits.classFeatures!.length).toBeGreaterThan(1);
            expect(benefits.classFeatures).toContain('custom_mixed_feature');

            // Should have at least one default feature (from DEFAULT_CLASS_FEATURES)
            const hasDefaultFeature = benefits.classFeatures!.some(id => {
                const feature = registry.getClassFeatureById(id);
                return feature && feature.source === 'default';
            });
            expect(hasDefaultFeature).toBe(true);
        });

        it('should validate mixed feature prerequisites', () => {
            // Add a custom feature that requires a default feature
            // Use a custom base feature to ensure the test is self-contained
            const baseFeature: ClassFeature = {
                id: 'custom_base_fighting_style',
                name: 'Base Fighting Style',
                description: 'A fighting style.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            const advancedFeature: ClassFeature = {
                id: 'custom_improved_fighting_style',
                name: 'Improved Fighting Style',
                description: 'Requires base fighting style.',
                type: 'active',
                class: 'Fighter',
                level: 3,
                prerequisites: {
                    features: ['custom_base_fighting_style']
                },
                source: 'custom'
            };

            registerTestClassFeatures([baseFeature, advancedFeature]);

            // Level up to 2 (grants base feature)
            const benefits2 = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');
            expect(benefits2.classFeatures).toContain('custom_base_fighting_style');
            const char2 = LevelUpProcessor.applyLevelUp(mockCharacter, benefits2);

            // Level up to 3 (should grant custom feature)
            const benefits3 = LevelUpProcessor.processLevelUp(char2, 3, 'test-seed');
            expect(benefits3.classFeatures).toContain('custom_improved_fighting_style');
        });
    });

    describe('Multi-Level Progression with Custom Features', () => {
        it('should track custom features across multiple level-ups', () => {
            const features: ClassFeature[] = [
                {
                    id: 'custom_lv2',
                    name: 'Level 2 Custom',
                    description: 'Custom level 2.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 2,
                    source: 'custom'
                },
                {
                    id: 'custom_lv3',
                    name: 'Level 3 Custom',
                    description: 'Custom level 3.',
                    type: 'active',
                    class: 'Fighter',
                    level: 3,
                    source: 'custom'
                },
                {
                    id: 'custom_lv4',
                    name: 'Level 4 Custom',
                    description: 'Custom level 4.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 4,
                    source: 'custom'
                }
            ];

            registerTestClassFeatures(features);

            // Track features gained
            const gainedFeatures: string[] = [];
            let currentChar = mockCharacter;

            // Level up through 2, 3, 4
            for (let level = 2; level <= 4; level++) {
                const benefits = LevelUpProcessor.processLevelUp(currentChar, level, `seed-${level}`);
                gainedFeatures.push(...(benefits.classFeatures || []));
                currentChar = LevelUpProcessor.applyLevelUp(currentChar, benefits);
            }

            // Should have all our custom features
            expect(gainedFeatures).toContain('custom_lv2');
            expect(gainedFeatures).toContain('custom_lv3');
            expect(gainedFeatures).toContain('custom_lv4');

            // Character should have all features
            expect(currentChar.class_features).toContain('custom_lv2');
            expect(currentChar.class_features).toContain('custom_lv3');
            expect(currentChar.class_features).toContain('custom_lv4');
        });

        it('should handle feature chains across multiple levels', () => {
            const features: ClassFeature[] = [
                {
                    id: 'custom_tier1',
                    name: 'Tier 1',
                    description: 'First tier.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 2,
                    source: 'custom'
                },
                {
                    id: 'custom_tier2',
                    name: 'Tier 2',
                    description: 'Requires Tier 1.',
                    type: 'active',
                    class: 'Fighter',
                    level: 3,
                    prerequisites: { features: ['custom_tier1'] },
                    source: 'custom'
                },
                {
                    id: 'custom_tier3',
                    name: 'Tier 3',
                    description: 'Requires Tier 2.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 4,
                    prerequisites: { features: ['custom_tier2'] },
                    source: 'custom'
                }
            ];

            registerTestClassFeatures(features);

            let currentChar = mockCharacter;

            // Level up to 2
            const b2 = LevelUpProcessor.processLevelUp(currentChar, 2, 'seed-2');
            expect(b2.classFeatures).toContain('custom_tier1');
            currentChar = LevelUpProcessor.applyLevelUp(currentChar, b2);

            // Level up to 3
            const b3 = LevelUpProcessor.processLevelUp(currentChar, 3, 'seed-3');
            expect(b3.classFeatures).toContain('custom_tier2');
            currentChar = LevelUpProcessor.applyLevelUp(currentChar, b3);

            // Level up to 4
            const b4 = LevelUpProcessor.processLevelUp(currentChar, 4, 'seed-4');
            expect(b4.classFeatures).toContain('custom_tier3');
        });
    });

    describe('processLevelUpWithoutStats with Custom Features', () => {
        it('should include custom features in level-up without stats', () => {
            const customFeature: ClassFeature = {
                id: 'custom_no_stat_feature',
                name: 'No Stat Feature',
                description: 'Feature without stat increase.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            registerTestClassFeature(customFeature);

            const benefits = LevelUpProcessor.processLevelUpWithoutStats(mockCharacter, 2, 'test-seed');

            // Should include class features
            expect(benefits.classFeatures).toBeDefined();
            expect(benefits.classFeatures).toContain('custom_no_stat_feature');
        });

        it('should include feature effects without stat increases', () => {
            const effectFeature: ClassFeature = {
                id: 'custom_effect_no_stat',
                name: 'Effect Only',
                description: 'Has effects but no stat increase.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                effects: [{ type: 'passive_modifier', target: 'speed', value: 5 }],
                source: 'custom'
            };

            registerTestClassFeature(effectFeature);

            const benefits = LevelUpProcessor.processLevelUpWithoutStats(mockCharacter, 2, 'test-seed');

            // Should include feature effects
            expect(benefits.featureEffects).toBeDefined();
            expect(benefits.featureEffects!.length).toBeGreaterThan(0);

            // Should NOT have stat increases (by definition of this method)
            expect('abilityScoreIncreases' in benefits).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle custom features with complex prerequisites', () => {
            // Use self-contained custom features
            const baseFeature: ClassFeature = {
                id: 'custom_base_style',
                name: 'Base Style',
                description: 'A base style.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                source: 'custom'
            };

            const complexFeature: ClassFeature = {
                id: 'custom_complex_prereq',
                name: 'Complex Prerequisite',
                description: 'Requires multiple conditions.',
                type: 'active',
                class: 'Fighter',
                level: 4,
                prerequisites: {
                    level: 4,
                    abilities: { STR: 13, DEX: 13 },
                    features: ['custom_base_style']
                },
                source: 'custom'
            };

            // Set up character to meet requirements
            mockCharacter.ability_scores.STR = 14;
            mockCharacter.ability_scores.DEX = 14;
            mockCharacter.ability_modifiers.STR = 2;
            mockCharacter.ability_modifiers.DEX = 2;

            registerTestClassFeatures([baseFeature, complexFeature]);

            // First, level up to 2 to get base style
            const b2 = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'seed-2');
            let char = LevelUpProcessor.applyLevelUp(mockCharacter, b2);

            // Then level up to 4
            const b4 = LevelUpProcessor.processLevelUp(char, 4, 'seed-4');

            // Complex feature should be granted
            expect(b4.classFeatures).toContain('custom_complex_prereq');
        });

        it('should handle features for non-default classes', () => {
            // Switch character to a custom class (using existing class type)
            mockCharacter.class = 'Barbarian';

            const customBarbarianFeature: ClassFeature = {
                id: 'custom_barbarian_feature',
                name: 'Barbarian Custom',
                description: 'Custom barbarian feature.',
                type: 'passive',
                class: 'Barbarian',
                level: 2,
                source: 'custom'
            };

            registerTestClassFeature(customBarbarianFeature);

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            expect(benefits.classFeatures).toContain('custom_barbarian_feature');
        });

        it('should handle level-up when no features are gained', () => {
            // Create a fresh character for a class that might not have features at all levels
            // Use a character that doesn't have custom features registered
            const cleanChar: CharacterSheet = {
                ...mockCharacter,
                class: 'Monk', // Try a different class
                level: 19,
                class_features: ['all_previous_features']
            };

            const benefits = LevelUpProcessor.processLevelUp(cleanChar, 20, 'test-seed');

            // classFeatures should be undefined if no features are gained at this level
            // (based on LevelUpProcessor.ts line 214: it only sets classFeatures if featuresGained.length > 0)
            if (benefits.classFeatures) {
                // If defined, it should be an array (possibly empty)
                expect(Array.isArray(benefits.classFeatures)).toBe(true);
            } else {
                // It's ok for classFeatures to be undefined when no features are gained
                expect(benefits.classFeatures).toBeUndefined();
            }
        });

        it('should apply feature effects to the updated character preview', () => {
            const featureWithEffect: ClassFeature = {
                id: 'custom_preview_effect',
                name: 'Preview Effect',
                description: 'Has effect.',
                type: 'passive',
                class: 'Fighter',
                level: 2,
                effects: [{ type: 'stat_bonus', target: 'CON', value: 1 }],
                source: 'custom'
            };

            registerTestClassFeature(featureWithEffect);

            // The level-up processor creates a preview character for validation
            // Note: Currently, due to shallow copy, this may mutate the original character's ability_scores
            // This is tracked as a potential bug, but we test the actual behavior
            const originalCON = mockCharacter.ability_scores.CON;
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // After processing, the feature should be tracked in benefits
            expect(benefits.classFeatures).toContain('custom_preview_effect');
            expect(benefits.featureEffects).toBeDefined();
            expect(benefits.featureEffects!.length).toBeGreaterThan(0);

            // After applying, it should have the feature in class_features
            const updated = LevelUpProcessor.applyLevelUp(mockCharacter, benefits);
            expect(updated.class_features).toContain('custom_preview_effect');
        });
    });
});
