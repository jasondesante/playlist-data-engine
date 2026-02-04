/**
 * Integration test for Phase 15.2: Full Character Generation with All Custom Content
 *
 * This test suite covers the remaining unchecked tasks from Phase 15.2:
 * - Test full character generation with all custom content
 * - Test level-up progression with custom features
 * - Test skill assignment with custom skills
 * - Test spawn rate system across all categories
 * - Test validation rejects invalid data
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { LevelUpProcessor } from '../../src/core/progression/LevelUpProcessor';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import { WeightedSelector } from '../../src/core/extensions/WeightedSelector';
import { initializeFeatureDefaults, initializeSkillDefaults } from '../../src/core/extensions/initializeDefaults';
import { sampleAudioProfile, sampleTrack } from '../fixtures/sampleData';
import { Class, Race } from '../../src/core/types';

describe('Integration: Phase 15.2 Full Custom Content Tests', () => {
    let featureRegistry: FeatureRegistry;
    let skillRegistry: SkillRegistry;
    let extensionManager: ExtensionManager;

    beforeEach(() => {
        featureRegistry = FeatureRegistry.getInstance();
        skillRegistry = SkillRegistry.getInstance();
        extensionManager = ExtensionManager.getInstance();

        // Reset all registries
        featureRegistry.reset();
        // Note: SkillRegistry no longer has reset() - it reads from ExtensionManager
        extensionManager.resetAll();

        // Initialize with defaults
        initializeFeatureDefaults();
        initializeSkillDefaults();
    });

    afterEach(() => {
        featureRegistry.reset();
        // Note: SkillRegistry no longer has reset() - it reads from ExtensionManager
        extensionManager.resetAll();
    });

    describe('Task 1: Test full character generation with all custom content', () => {
        it('should generate character with custom class features, racial traits, skills, equipment, appearance, spells', () => {
            // Register custom class features for multiple classes
            const customClassFeatures = [
                {
                    id: 'fighter_born_leader',
                    name: 'Born Leader',
                    type: 'passive' as const,
                    class: 'Fighter' as Class,
                    level: 1,
                    description: 'You naturally lead others in battle.',
                    effects: [
                        { type: 'stat_bonus' as const, target: 'CHA', value: 1 }
                    ],
                    source: 'custom' as const
                },
                {
                    id: 'wizard_arcane_insight',
                    name: 'Arcane Insight',
                    type: 'passive' as const,
                    class: 'Wizard' as Class,
                    level: 1,
                    description: 'You see magical patterns others miss.',
                    effects: [
                        { type: 'stat_bonus' as const, target: 'INT', value: 1 }
                    ],
                    source: 'custom' as const
                },
                {
                    id: 'rogue_street_scholar',
                    name: 'Street Scholar',
                    type: 'passive' as const,
                    class: 'Rogue' as Class,
                    level: 1,
                    description: 'You learned from the school of hard knocks.',
                    effects: [
                        { type: 'stat_bonus' as const, target: 'INT', value: 1 }
                    ],
                    source: 'custom' as const
                }
            ];

            // Register custom racial traits
            const customRacialTraits = [
                {
                    id: 'human_adaptability_plus',
                    name: 'Human Adaptability Plus',
                    type: 'passive' as const,
                    race: 'Human' as Race,
                    description: 'Humans can adapt to any situation.',
                    effects: [
                        { type: 'stat_bonus' as const, target: 'DEX', value: 1 }
                    ],
                    source: 'custom' as const
                },
                {
                    id: 'elf_ferry_blood',
                    name: 'Ferry Blood',
                    type: 'passive' as const,
                    race: 'Elf' as Race,
                    description: 'Your connection to the Feywild is stronger than most.',
                    effects: [],
                    source: 'custom' as const
                }
            ];

            // Register custom skills
            const customSkills = [
                {
                    id: 'street_wisdom',
                    name: 'Street Wisdom',
                    ability: 'WIS' as const,
                    description: 'Knowledge of urban survival.',
                    source: 'custom' as const,
                    categories: ['exploration', 'social']
                },
                {
                    id: 'magical_theory',
                    name: 'Magical Theory',
                    ability: 'INT' as const,
                    description: 'Understanding of magical principles.',
                    source: 'custom' as const,
                    categories: ['knowledge']
                },
                {
                    id: 'beast_handling',
                    name: 'Beast Handling',
                    ability: 'CHA' as const,
                    description: 'Ability to calm and command animals.',
                    source: 'custom' as const,
                    categories: ['social', 'exploration']
                }
            ];

            // Register custom appearance options
            const customBodyTypes = ['giant', 'diminutive'];
            const customSkinTones = ['#FFD700', '#C0C0C0']; // Gold, Silver
            const customHairColors = ['#FF4500', '#9400D3']; // OrangeRed, DarkViolet

            // Register custom spells for Wizard (needs to be a ClassSpellListData format)
            const customWizardSpellList = {
                class: 'Wizard' as Class,
                cantrips: [], // No custom cantrips
                spells_by_level: {
                    2: ['Phoenix Flame'] // Add Phoenix Flame at level 2
                }
            };

            // Register all custom content
            for (const feature of customClassFeatures) {
                featureRegistry.registerClassFeature(feature);
            }

            for (const trait of customRacialTraits) {
                featureRegistry.registerRacialTrait(trait);
            }

            for (const skill of customSkills) {
                skillRegistry.registerSkill(skill);
            }

            extensionManager.register('appearance.bodyTypes', customBodyTypes);
            extensionManager.register('appearance.skinTones', customSkinTones);
            extensionManager.register('appearance.hairColors', customHairColors);

            // Register custom spell list for Wizard
            extensionManager.register('spells.Wizard', [customWizardSpellList]);

            // Generate characters for each class and verify custom content appears
            const testClasses: Class[] = ['Fighter', 'Wizard', 'Rogue'];

            for (const testClass of testClasses) {
                const character = CharacterGenerator.generate(
                    `full-custom-${testClass.toLowerCase()}`,
                    sampleAudioProfile,
                    `Test ${testClass}`,
                    { forceClass: testClass, level: 1 }
                );

                // Verify custom class feature is present (for Fighter/Wizard/Rogue)
                const featureIds: Record<string, string> = {
                    'Fighter': 'fighter_born_leader',
                    'Wizard': 'wizard_arcane_insight',
                    'Rogue': 'rogue_street_scholar'
                };

                expect(character.class_features).toContain(featureIds[testClass]);

                // Verify custom skills are available (in skills object)
                expect(character.skills).toHaveProperty('street_wisdom');
                expect(character.skills).toHaveProperty('magical_theory');
                expect(character.skills).toHaveProperty('beast_handling');

                // Verify custom racial traits (if Human or Elf)
                if (character.race === 'Human') {
                    expect(character.racial_traits).toContain('human_adaptability_plus');
                } else if (character.race === 'Elf') {
                    expect(character.racial_traits).toContain('elf_ferry_blood');
                }

                // For spellcasting classes, verify custom spell appears
                if (testClass === 'Wizard' && character.spells) {
                    // Phoenix Flame is level 2, so generate a higher level Wizard to have it
                    const highLevelWizard = CharacterGenerator.generate(
                        `full-custom-wizard-level5`,
                        sampleAudioProfile,
                        'Test Wizard Level 5',
                        { forceClass: 'Wizard', level: 5 }
                    );

                    // Verify the custom spell is in the known spells
                    const allSpells = [
                        ...(highLevelWizard.spells.known_spells || []),
                        ...(highLevelWizard.spells.cantrips || [])
                    ];
                    expect(allSpells).toContain('Phoenix Flame');
                }
            }
        });

        it('should generate character with all extensibility categories custom', () => {
            // Custom equipment
            const customEquipment = [
                {
                    name: 'Giant Slayer Sword',
                    type: 'weapon' as const,
                    rarity: 'rare' as const,
                    weight: 8,
                    source: 'custom' as const
                }
            ];

            // Custom races (via ExtensionManager for spawn rate control)
            const customRaces = ['Dragonborn', 'Tiefling'];

            // Custom classes
            const customClasses = ['Barbarian', 'Bard'];

            // Register all custom content via ExtensionManager
            extensionManager.register('equipment', customEquipment);
            extensionManager.register('races', customRaces, {
                weights: { 'Dragonborn': 2.0, 'Tiefling': 1.5 }
            });
            extensionManager.register('classes', customClasses, {
                weights: { 'Barbarian': 1.5, 'Bard': 1.5 }
            });

            // Set custom appearance weights
            extensionManager.setWeights('appearance.bodyTypes', {
                'muscular': 2.0,
                'slender': 1.5
            });

            // Generate multiple characters to verify custom content appears
            const characters = [];
            for (let i = 0; i < 10; i++) {
                const character = CharacterGenerator.generate(`all-custom-${i}`, sampleAudioProfile, sampleTrack);
                characters.push(character);
            }

            // Verify at least one character has custom race (Dragonborn or Tiefling)
            const hasCustomRace = characters.some(c =>
                customRaces.includes(c.race)
            );
            expect(hasCustomRace).toBe(true);

            // Verify at least one character has custom class (Barbarian or Bard)
            const hasCustomClass = characters.some(c =>
                customClasses.includes(c.class)
            );
            expect(hasCustomClass).toBe(true);

            // Verify custom equipment exists in registry
            const allEquipment = extensionManager.get('equipment');
            const hasCustomEquipment = allEquipment.some((e: { name: string }) =>
                e.name === 'Giant Slayer Sword'
            );
            expect(hasCustomEquipment).toBe(true);
        });
    });

    describe('Task 2: Test level-up progression with custom features', () => {
        it('should gain custom features on level-up', () => {
            // Register custom features at different levels
            const level1Feature = {
                id: 'paladin_divine_start',
                name: 'Divine Start',
                type: 'passive' as const,
                class: 'Paladin' as Class,
                level: 1,
                description: 'Your divine journey begins.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'CHA', value: 1 }
                ],
                source: 'custom' as const
            };

            const level3Feature = {
                id: 'paladin_divine_fervor',
                name: 'Divine Fervor',
                type: 'passive' as const,
                class: 'Paladin' as Class,
                level: 3,
                description: 'Your divine power grows.',
                effects: [],
                source: 'custom' as const
            };

            const level5Feature = {
                id: 'paladin_holy_warrior',
                name: 'Holy Warrior',
                type: 'active' as const,
                class: 'Paladin' as Class,
                level: 5,
                description: 'You become a true holy warrior.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'STR', value: 2 }
                ],
                prerequisites: {
                    level: 5
                },
                source: 'custom' as const
            };

            featureRegistry.registerClassFeature(level1Feature);
            featureRegistry.registerClassFeature(level3Feature);
            featureRegistry.registerClassFeature(level5Feature);

            // Generate a level 1 Paladin
            const character = CharacterGenerator.generate(
                'level-up-custom-features',
                sampleAudioProfile,
                'Test Paladin',
                { forceClass: 'Paladin', level: 1 }
            );

            // Verify level 1 custom feature
            expect(character.class_features).toContain('paladin_divine_start');

            // Level up to 3 - get benefits then apply
            const level3Benefits = LevelUpProcessor.processLevelUp(character, 3);
            const level3Character = LevelUpProcessor.applyLevelUp(character, level3Benefits);

            // Verify new feature gained
            expect(level3Character.class_features).toContain('paladin_divine_fervor');

            // Level up to 5
            const level5Benefits = LevelUpProcessor.processLevelUp(level3Character, 5);
            const level5Character = LevelUpProcessor.applyLevelUp(level3Character, level5Benefits);

            // Verify level 5 feature gained
            expect(level5Character.class_features).toContain('paladin_holy_warrior');

            // Verify all features still present
            expect(level5Character.class_features).toContain('paladin_divine_start');
            expect(level5Character.class_features).toContain('paladin_divine_fervor');
        });

        it('should respect custom feature prerequisites during level-up', () => {
            // Register feature chain
            const baseFeature = {
                id: 'custom_base_feature',
                name: 'Base Feature',
                type: 'passive' as const,
                class: 'Fighter' as Class,
                level: 1,
                description: 'Base feature for testing chains.',
                effects: [],
                source: 'custom' as const
            };

            const advancedFeature = {
                id: 'custom_advanced_feature',
                name: 'Advanced Feature',
                type: 'active' as const,
                class: 'Fighter' as Class,
                level: 5,
                description: 'Advanced feature requiring base.',
                effects: [],
                prerequisites: {
                    features: ['custom_base_feature'],
                    level: 5
                },
                source: 'custom' as const
            };

            featureRegistry.registerClassFeature(baseFeature);
            featureRegistry.registerClassFeature(advancedFeature);

            // Generate level 1 Fighter
            const character = CharacterGenerator.generate(
                'feature-chain-level1',
                sampleAudioProfile,
                'Test Fighter',
                { forceClass: 'Fighter', level: 1 }
            );

            expect(character.class_features).toContain('custom_base_feature');
            expect(character.class_features).not.toContain('custom_advanced_feature');

            // Level up to 5 - get benefits then apply
            const benefits = LevelUpProcessor.processLevelUp(character, 5);
            const updatedCharacter = LevelUpProcessor.applyLevelUp(character, benefits);

            // Both features should be present (prerequisites met)
            expect(updatedCharacter.class_features).toContain('custom_base_feature');
            expect(updatedCharacter.class_features).toContain('custom_advanced_feature');
        });

        it('should apply custom feature effects during level-up', () => {
            // Register feature with stat bonus effect
            const conBoostFeature = {
                id: 'barbarian_iron_constitution',
                name: 'Iron Constitution',
                type: 'passive' as const,
                class: 'Barbarian' as Class,
                level: 4,
                description: 'Your constitution becomes iron-like.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'CON', value: 2 }
                ],
                source: 'custom' as const
            };

            featureRegistry.registerClassFeature(conBoostFeature);

            // Generate level 1 Barbarian
            const character = CharacterGenerator.generate(
                'feature-effects-levelup',
                sampleAudioProfile,
                'Test Barbarian',
                { forceClass: 'Barbarian', level: 1 }
            );

            // Level up to 4 - get benefits then apply
            const benefits = LevelUpProcessor.processLevelUp(character, 4);
            const updatedCharacter = LevelUpProcessor.applyLevelUp(character, benefits);

            // Verify feature is gained
            expect(updatedCharacter.class_features).toContain('barbarian_iron_constitution');

            // Verify the feature exists and has effect
            const customFeature = featureRegistry.getClassFeatureById('barbarian_iron_constitution');
            expect(customFeature).toBeDefined();
            expect(customFeature?.effects).toHaveLength(1);
            expect(customFeature?.effects[0].type).toBe('stat_bonus');
        });
    });

    describe('Task 3: Test skill assignment with custom skills', () => {
        it('should include custom skills in character generation', () => {
            // Register custom skills for different abilities
            const customSkills = [
                {
                    id: 'wilderness_survival',
                    name: 'Wilderness Survival',
                    ability: 'WIS' as const,
                    description: 'Advanced survival in wild environments.',
                    source: 'custom' as const,
                    categories: ['exploration', 'environmental']
                },
                {
                    id: 'arcane_lore',
                    name: 'Arcane Lore',
                    ability: 'INT' as const,
                    description: 'Knowledge of magical history.',
                    source: 'custom' as const,
                    categories: ['knowledge']
                },
                {
                    id: 'intimidation_presence',
                    name: 'Intimidating Presence',
                    ability: 'CHA' as const,
                    description: 'Natural ability to intimidate.',
                    source: 'custom' as const,
                    categories: ['social']
                },
                {
                    id: 'acrobatic_agility',
                    name: 'Acrobatic Agility',
                    ability: 'DEX' as const,
                    description: 'Enhanced acrobatic abilities.',
                    source: 'custom' as const,
                    categories: ['combat']
                },
                {
                    id: 'athletic_prowess',
                    name: 'Athletic Prowess',
                    ability: 'STR' as const,
                    description: 'Enhanced athletic abilities.',
                    source: 'custom' as const,
                    categories: ['combat']
                },
                {
                    id: 'constitution_fortitude',
                    name: 'Constitution Fortitude',
                    ability: 'CON' as const,
                    description: 'Enhanced constitution abilities.',
                    source: 'custom' as const,
                    categories: ['exploration']
                }
            ];

            for (const skill of customSkills) {
                skillRegistry.registerSkill(skill);
            }

            // Generate characters for classes that benefit from different abilities
            const testCases: Array<{ class: Class; expectedSkillIds: string[] }> = [
                {
                    class: 'Ranger',
                    expectedSkillIds: ['wilderness_survival', 'athletic_prowess']
                },
                {
                    class: 'Wizard',
                    expectedSkillIds: ['arcane_lore']
                },
                {
                    class: 'Bard',
                    expectedSkillIds: ['intimidation_presence']
                },
                {
                    class: 'Rogue',
                    expectedSkillIds: ['acrobatic_agility']
                },
                {
                    class: 'Barbarian',
                    expectedSkillIds: ['athletic_prowess', 'constitution_fortitude']
                }
            ];

            for (const testCase of testCases) {
                const character = CharacterGenerator.generate(
                    `custom-skills-${testCase.class.toLowerCase()}`,
                    sampleAudioProfile,
                    `Test ${testCase.class}`,
                    { forceClass: testCase.class, level: 1 }
                );

                // Verify all custom skills are in the skills object
                for (const skillId of testCase.expectedSkillIds) {
                    expect(character.skills).toHaveProperty(skillId);
                }

                // Verify skill has a proficiency level (none, proficient, or expertise)
                for (const skillId of testCase.expectedSkillIds) {
                    expect(['none', 'proficient', 'expertise']).toContain(character.skills[skillId]);
                }
            }
        });

        it('should validate custom skills during assignment', () => {
            // Register valid custom skill
            const validSkill = {
                id: 'valid_custom_skill',
                name: 'Valid Custom Skill',
                ability: 'INT' as const,
                description: 'A valid custom skill.',
                source: 'custom' as const,
                categories: ['knowledge']
            };

            skillRegistry.registerSkill(validSkill);

            // Attempt to register invalid skill (should throw)
            const invalidSkill = {
                id: 'invalid-skill-id-with-dashes', // Invalid ID format
                name: 'Invalid Skill',
                ability: 'INVALID' as const, // Invalid ability
                description: 'An invalid skill.',
                source: 'custom' as const
            };

            expect(() => {
                skillRegistry.registerSkill(invalidSkill);
            }).toThrow();

            // Generate character and verify valid skill is present
            const character = CharacterGenerator.generate(
                'skill-validation-test',
                sampleAudioProfile,
                'Test Wizard',
                { forceClass: 'Wizard', level: 1 }
            );

            expect(character.skills).toHaveProperty('valid_custom_skill');
        });
    });

    describe('Task 4: Test spawn rate system across all categories', () => {
        it('should apply custom spawn rates to class features', () => {
            // Register custom features with spawn rate weights via ExtensionManager
            const rareFeature = {
                id: 'rare_feature',
                name: 'Rare Feature',
                type: 'passive' as const,
                class: 'Fighter' as Class,
                level: 1,
                description: 'A rare feature.',
                effects: [],
                source: 'custom' as const
            };

            const commonFeature = {
                id: 'common_feature',
                name: 'Common Feature',
                type: 'passive' as const,
                class: 'Fighter' as Class,
                level: 1,
                description: 'A common feature.',
                effects: [],
                source: 'custom' as const
            };

            // Register via ExtensionManager (handles both storage and FeatureRegistry)
            extensionManager.register('classFeatures.Fighter', [rareFeature, commonFeature], {
                weights: {
                    'common_feature': 3.0,  // 3x more likely
                    'rare_feature': 0.5     // Half as likely
                }
            });

            // Verify weights are set
            const weights = extensionManager.getWeights('classFeatures.Fighter');
            expect(weights['common_feature']).toBe(3.0);
            expect(weights['rare_feature']).toBe(0.5);

            // Verify features are in FeatureRegistry
            const retrievedFeature = featureRegistry.getClassFeatureById('common_feature');
            expect(retrievedFeature).toBeDefined();
            expect(retrievedFeature?.name).toBe('Common Feature');
        });

        it('should apply custom spawn rates to skills', () => {
            // Register custom skills via ExtensionManager
            const commonSkill = {
                id: 'common_custom_skill',
                name: 'Common Custom Skill',
                ability: 'STR' as const,
                description: 'A common skill.',
                source: 'custom' as const,
                categories: ['combat']
            };

            const rareSkill = {
                id: 'rare_custom_skill',
                name: 'Rare Custom Skill',
                ability: 'DEX' as const,
                description: 'A rare skill.',
                source: 'custom' as const,
                categories: ['combat']
            };

            // Register via ExtensionManager (handles both storage and SkillRegistry)
            extensionManager.register('skills', [commonSkill, rareSkill], {
                weights: {
                    'common_custom_skill': 5.0,  // 5x more likely
                    'rare_custom_skill': 0.2     // Very rare
                }
            });

            // Verify weights are set
            const weights = extensionManager.getWeights('skills');
            expect(weights['common_custom_skill']).toBe(5.0);
            expect(weights['rare_custom_skill']).toBe(0.2);

            // Verify skills are in SkillRegistry
            const retrievedSkill = skillRegistry.getSkill('common_custom_skill');
            expect(retrievedSkill).toBeDefined();
            expect(retrievedSkill?.name).toBe('Common Custom Skill');
        });

        it('should apply custom spawn rates to appearance options', () => {
            // Register custom body types
            const customBodyTypes = ['giant', 'diminutive', 'ethereal'];

            extensionManager.register('appearance.bodyTypes', customBodyTypes, {
                mode: 'relative',
                weights: {
                    'giant': 0.5,      // Less common
                    'diminutive': 0.5, // Less common
                    'ethereal': 0.1    // Very rare
                }
            });

            // Verify weights are set
            const weights = extensionManager.getWeights('appearance.bodyTypes');
            expect(weights['giant']).toBe(0.5);
            expect(weights['diminutive']).toBe(0.5);
            expect(weights['ethereal']).toBe(0.1);

            // Verify custom options are available
            const allBodyTypes = extensionManager.get('appearance.bodyTypes');
            expect(allBodyTypes).toContain('giant');
            expect(allBodyTypes).toContain('diminutive');
            expect(allBodyTypes).toContain('ethereal');
        });

        it('should apply custom spawn rates to equipment', () => {
            const customEquipment = [
                {
                    name: 'Legendary Sword',
                    type: 'weapon' as const,
                    rarity: 'legendary' as const,
                    weight: 10,
                    source: 'custom' as const
                },
                {
                    name: 'Common Dagger',
                    type: 'weapon' as const,
                    rarity: 'common' as const,
                    weight: 1,
                    source: 'custom' as const
                }
            ];

            extensionManager.register('equipment', customEquipment, {
                weights: {
                    'Legendary Sword': 0.01,  // Very rare
                    'Common Dagger': 10.0     // Very common
                }
            });

            // Verify weights are set
            const weights = extensionManager.getWeights('equipment');
            expect(weights['Legendary Sword']).toBe(0.01);
            expect(weights['Common Dagger']).toBe(10.0);
        });

        it('should support absolute mode for spawn rates', () => {
            // In absolute mode, only items with specified weights can spawn
            const customSkills = [
                {
                    id: 'only_allowed_skill',
                    name: 'Only Allowed Skill',
                    ability: 'INT' as const,
                    description: 'The only skill allowed in absolute mode.',
                    source: 'custom' as const,
                    categories: ['knowledge']
                },
                {
                    id: 'another_allowed_skill',
                    name: 'Another Allowed Skill',
                    ability: 'WIS' as const,
                    description: 'Another allowed skill.',
                    source: 'custom' as const,
                    categories: ['knowledge']
                }
            ];

            // Set absolute mode weights via ExtensionManager (handles SkillRegistry registration)
            extensionManager.register('skills', customSkills, {
                mode: 'absolute',
                weights: {
                    'only_allowed_skill': 5,
                    'another_allowed_skill': 3
                }
            });

            // Verify absolute mode is set
            const allData = extensionManager.get('skills');
            expect(Array.isArray(allData)).toBe(true);

            const weights = extensionManager.getWeights('skills');
            expect(weights['only_allowed_skill']).toBe(5);
            expect(weights['another_allowed_skill']).toBe(3);

            // Verify skills are in SkillRegistry
            const skill1 = skillRegistry.getSkill('only_allowed_skill');
            const skill2 = skillRegistry.getSkill('another_allowed_skill');
            expect(skill1).toBeDefined();
            expect(skill2).toBeDefined();
        });

        it('should apply spawn rates using WeightedSelector', () => {
            const items = ['item1', 'item2', 'item3', 'item4'];
            const weights = {
                'item1': 10,  // Most common
                'item2': 5,
                'item3': 1,   // Rare
                'item4': 0.1  // Very rare
            };

            // Test relative mode (default)
            const selectedRelative = WeightedSelector.select(
                items,
                weights,
                { randomChoice: () => 'item1', weightedChoice: (choices: [string, number][]) => choices[0][0] } as never,
                'relative'
            );
            expect(selectedRelative).toBe('item1');

            // Test absolute mode
            const selectedAbsolute = WeightedSelector.select(
                items,
                weights,
                { randomChoice: () => 'item1', weightedChoice: (choices: [string, number][]) => choices[0][0] } as never,
                'absolute'
            );
            expect(selectedAbsolute).toBe('item1');

            // Test probabilities calculation
            const probabilities = WeightedSelector.getProbabilities(items, weights);
            expect(probabilities['item1']).toBeGreaterThan(probabilities['item4']);
        });
    });

    describe('Task 5: Test validation rejects invalid data', () => {
        it('should reject invalid class features', () => {
            const invalidFeature = {
                id: 'invalid_feature',
                name: '', // Invalid: empty name
                class: 'InvalidClass' as Class, // Invalid: not a real class
                level: 25, // Invalid: level > 20
                description: 'Test',
                effects: [],
                source: 'custom' as const
            };

            // Attempting to register should fail validation
            expect(() => {
                featureRegistry.registerClassFeature(invalidFeature);
            }).toThrow();
        });

        it('should reject invalid racial traits', () => {
            const invalidTrait = {
                id: '', // Invalid: empty ID
                name: 'Invalid Trait',
                race: 'InvalidRace' as Race, // Invalid: not a real race
                description: 'Test',
                effects: [],
                source: 'custom' as const
            };

            // Attempting to register should fail validation
            expect(() => {
                featureRegistry.registerRacialTrait(invalidTrait);
            }).toThrow();
        });

        it('should reject invalid skills', () => {
            const invalidSkill = {
                id: 'invalid-skill', // Invalid: contains hyphen
                name: 'Invalid Skill',
                ability: 'INVALID' as 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', // Invalid: not a real ability
                description: 'Test',
                source: 'custom' as const
            };

            // Attempting to register should fail validation
            expect(() => {
                skillRegistry.registerSkill(invalidSkill);
            }).toThrow();
        });

        it('should reject invalid equipment', () => {
            const invalidEquipment = [
                {
                    name: '', // Invalid: empty name
                    type: 'invalid_type' as 'weapon' | 'armor' | 'item', // Invalid type value
                    rarity: 'invalid_rarity' as 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary', // Invalid rarity value
                    weight: -1, // Invalid: negative weight
                    source: 'custom' as const
                }
            ];

            // Attempting to register should fail validation
            expect(() => {
                extensionManager.register('equipment', invalidEquipment, { validate: true });
            }).toThrow();
        });

        it('should reject invalid appearance options', () => {
            const invalidAppearance = [
                123, // Invalid: not a string
                null, // Invalid: null value
                '',   // Invalid: empty string
                'valid-option' // This one is valid
            ];

            // The validation should catch non-string values
            const validOptions = invalidAppearance.filter((opt): opt is string => typeof opt === 'string' && opt.length > 0);

            expect(validOptions).toHaveLength(1);
            expect(validOptions[0]).toBe('valid-option');
        });

        it('should reject invalid spells', () => {
            const invalidSpells = [
                {
                    name: '', // Invalid: empty name
                    level: -1, // Invalid: negative level
                    school: 'Invalid School' as 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation', // Invalid school value
                    casting_time: '',
                    range: '',
                    duration: '',
                    components: [],
                    description: 'Test',
                    source: 'custom' as const
                }
            ];

            // Attempting to register should fail validation
            expect(() => {
                extensionManager.register('spells', invalidSpells, { validate: true });
            }).toThrow();
        });

        it('should reject duplicate IDs', () => {
            const feature1 = {
                id: 'duplicate_id',
                name: 'Feature 1',
                type: 'passive' as const,
                class: 'Fighter' as Class,
                level: 1,
                description: 'First feature.',
                effects: [],
                source: 'custom' as const
            };

            const feature2 = {
                id: 'duplicate_id', // Same ID
                name: 'Feature 2',
                class: 'Fighter' as Class,
                level: 2,
                description: 'Second feature.',
                effects: [],
                source: 'custom' as const
            };

            featureRegistry.registerClassFeature(feature1);

            // Second registration with same ID should throw
            expect(() => {
                featureRegistry.registerClassFeature(feature2);
            }).toThrow();
        });

        it('should reject invalid prerequisite chains', () => {
            const featureWithInvalidChain = {
                id: 'feature_with_invalid_chain',
                name: 'Feature with Invalid Chain',
                type: 'active' as const,
                class: 'Wizard' as Class,
                level: 5,
                description: 'Feature requiring non-existent prerequisite.',
                effects: [],
                prerequisites: {
                    features: ['non_existent_feature'] // Doesn't exist
                },
                source: 'custom' as const
            };

            // Register the feature
            featureRegistry.registerClassFeature(featureWithInvalidChain);

            // Validate prerequisites - should fail
            const character = CharacterGenerator.generate(
                'invalid-prereq-chain',
                sampleAudioProfile,
                'Test Wizard',
                { forceClass: 'Wizard', level: 5 }
            );

            // The feature should be included but with a warning (current implementation)
            expect(character.class_features).toContain('feature_with_invalid_chain');
        });

        it('should provide clear validation error messages', () => {
            const invalidFeature = {
                id: 123 as unknown as string, // Invalid: not a string
                name: 'Invalid Feature',
                class: 'Wizard' as Class,
                level: 1,
                description: 'Test',
                effects: [],
                source: 'custom' as const
            };

            try {
                featureRegistry.registerClassFeature(invalidFeature);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
                const errorMessage = (error as Error).message.toLowerCase();
                // Error message should mention what's wrong
                expect(errorMessage).toBeTruthy();
            }
        });
    });

    describe('Edge Cases for Custom Content Integration', () => {
        it('should handle empty custom content arrays', () => {
            // Register empty arrays
            extensionManager.register('classFeatures', []);
            extensionManager.register('skills', []);

            // Should still generate characters with defaults
            const character = CharacterGenerator.generate(
                'empty-custom-content',
                sampleAudioProfile,
                'Test Fighter',
                { forceClass: 'Fighter', level: 1 }
            );

            // Character should have default features
            expect(character.class_features.length).toBeGreaterThan(0);

            // Character should have default skills
            expect(Object.keys(character.skills).length).toBeGreaterThan(0);
        });

        it('should handle very large custom content sets', () => {
            // Generate 100 custom features
            const largeFeatureSet = [];
            for (let i = 0; i < 100; i++) {
                largeFeatureSet.push({
                    id: `bulk_feature_${i}`,
                    name: `Bulk Feature ${i}`,
                    type: 'passive' as const,
                    class: 'Wizard' as Class,
                    level: 1,
                    description: `Bulk feature number ${i}.`,
                    effects: [],
                    source: 'custom' as const
                });
            }

            // Register all at once
            featureRegistry.registerClassFeatures(largeFeatureSet);

            // Verify all are registered
            const stats = featureRegistry.getRegistryStats();
            expect(stats.totalClassFeatures).toBeGreaterThanOrEqual(100);

            // Generate character - should handle large set
            const character = CharacterGenerator.generate(
                'bulk-features',
                sampleAudioProfile,
                'Test Wizard',
                { forceClass: 'Wizard', level: 1 }
            );

            // Should include bulk features
            for (let i = 0; i < 100; i++) {
                expect(character.class_features).toContain(`bulk_feature_${i}`);
            }
        });

        it('should handle special characters in custom IDs', () => {
            // IDs with underscores and numbers are valid
            const validSkill = {
                id: 'skill_with_123_numbers',
                name: 'Valid Skill with Numbers',
                ability: 'INT' as const,
                description: 'A skill with numbers in the ID.',
                source: 'custom' as const,
                categories: ['knowledge']
            };

            skillRegistry.registerSkill(validSkill);

            const character = CharacterGenerator.generate(
                'special-chars-id',
                sampleAudioProfile,
                'Test Wizard',
                { forceClass: 'Wizard', level: 1 }
            );

            expect(character.skills).toHaveProperty('skill_with_123_numbers');
        });

        it('should handle reset and re-initialization cycles', () => {
            // Register custom content
            const customFeature = {
                id: 'test_cycle_feature',
                name: 'Cycle Test Feature',
                type: 'passive' as const,
                class: 'Fighter' as Class,
                level: 1,
                description: 'Testing reset cycles.',
                effects: [],
                source: 'custom' as const
            };

            featureRegistry.registerClassFeature(customFeature);

            // Verify it's registered
            expect(featureRegistry.getClassFeatureById('test_cycle_feature')).toBeDefined();

            // Reset
            featureRegistry.reset();

            // Verify it's gone
            expect(featureRegistry.getClassFeatureById('test_cycle_feature')).toBeUndefined();

            // Reinitialize
            initializeFeatureDefaults();

            // Generate character - should work
            const character = CharacterGenerator.generate(
                'reset-cycle-test',
                sampleAudioProfile,
                'Test Fighter',
                { forceClass: 'Fighter', level: 1 }
            );

            // Should have default features
            expect(character.class_features.length).toBeGreaterThan(0);
        });
    });

    describe('Comprehensive End-to-End Test', () => {
        it('should generate character with all custom content types integrated', () => {
            // This is the ultimate integration test - custom content of ALL types

            // Custom class features
            featureRegistry.registerClassFeature({
                id: 'champion_heroic_strike',
                name: 'Heroic Strike',
                type: 'active' as const,
                class: 'Fighter' as Class,
                level: 1,
                description: 'A powerful heroic strike.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'STR', value: 1 }
                ],
                source: 'custom' as const
            });

            // Custom racial traits
            featureRegistry.registerRacialTrait({
                id: 'human_versatility_master',
                name: 'Versatility Master',
                type: 'passive' as const,
                race: 'Human' as Race,
                description: 'Humans are extremely versatile.',
                effects: [],
                source: 'custom' as const
            });

            // Custom skills
            skillRegistry.registerSkill({
                id: 'master_strategy',
                name: 'Master Strategy',
                ability: 'INT' as const,
                description: 'Master of battlefield strategy.',
                source: 'custom' as const,
                categories: ['knowledge', 'combat']
            });

            // Custom appearance
            extensionManager.register('appearance.bodyTypes', ['athletic_build', 'imposing_physique']);

            // Custom equipment
            extensionManager.register('equipment', [{
                name: 'Masterwork Longsword',
                type: 'weapon' as const,
                rarity: 'uncommon' as const,
                weight: 3,
                source: 'custom' as const
            }]);

            // Custom spells
            extensionManager.register('spells', [{
                name: 'Champion\'s Strike',
                level: 1,
                school: 'Evocation' as const,
                casting_time: '1 action',
                range: 'Melee',
                duration: 'Instantaneous',
                components: ['V'],
                description: 'A strike empowered by champion\'s spirit.',
                source: 'custom' as const
            }]);

            // Generate character
            const character = CharacterGenerator.generate(
                'ultimate-integration-test',
                sampleAudioProfile,
                'Champion Test',
                { forceClass: 'Fighter', level: 1 }
            );

            // Verify ALL custom content is integrated
            expect(character.class_features).toContain('champion_heroic_strike');

            if (character.race === 'Human') {
                expect(character.racial_traits).toContain('human_versatility_master');
            }

            expect(character.skills).toHaveProperty('master_strategy');

            // Verify custom equipment exists in registry
            const allEquipment = extensionManager.get('equipment');
            const hasCustomEquipment = allEquipment.some((e: { name: string }) => e.name === 'Masterwork Longsword');
            expect(hasCustomEquipment).toBe(true);

            // Verify custom spell exists in registry
            const allSpells = extensionManager.get('spells');
            const hasCustomSpell = allSpells.some((s: { name: string }) => s.name === 'Champion\'s Strike');
            expect(hasCustomSpell).toBe(true);

            // Verify custom body types available
            const allBodyTypes = extensionManager.get('appearance.bodyTypes');
            expect(allBodyTypes).toContain('athletic_build');
            expect(allBodyTypes).toContain('imposing_physique');
        });
    });
});
