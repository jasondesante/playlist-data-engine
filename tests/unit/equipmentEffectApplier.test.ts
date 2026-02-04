/**
 * EquipmentEffectApplier Unit Tests
 *
 * Tests for equipment effect application and removal functionality.
 * Part of Phase 10.1: Unit Tests for EquipmentEffectApplier.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EquipmentEffectApplier } from '../../src/core/equipment/EquipmentEffectApplier.js';
import type {
    EnhancedEquipment,
    EquipmentProperty,
    EquipmentMiniFeature
} from '../../src/core/types/Equipment.js';
import type { CharacterSheet } from '../../src/core/types/Character.js';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { initializeFeatureDefaults, initializeSkillDefaults } from '../../src/core/extensions/initializeDefaults.js';

describe('EquipmentEffectApplier', () => {
    let featureRegistry: FeatureRegistry;
    let skillRegistry: SkillRegistry;
    let testCharacter: CharacterSheet;

    beforeEach(() => {
        // Get singleton instances
        featureRegistry = FeatureRegistry.getInstance();
        skillRegistry = SkillRegistry.getInstance();

        // Initialize defaults using ExtensionManager initialization functions
        initializeFeatureDefaults();
        initializeSkillDefaults();

        // Create a test character
        testCharacter = {
            name: 'Test Character',
            race: 'Human',
            class: 'Fighter',
            level: 1,
            ability_scores: {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            },
            ability_modifiers: {
                STR: 0,
                DEX: 0,
                CON: 0,
                INT: 0,
                WIS: 0,
                CHA: 0
            },
            proficiency_bonus: 2,
            hp: {
                current: 10,
                max: 10,
                temp: 0
            },
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
            xp: {
                current: 0,
                next_level: 1000
            },
            seed: 'test_seed',
            generated_at: new Date().toISOString()
        };
    });

    afterEach(() => {
        // Clean up is handled by singleton lifecycle
    });

    describe('equipItem', () => {
        it('should apply stat bonus when equipping item', () => {
            const equipment: EnhancedEquipment = {
                name: 'Belt of Strength',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 Strength'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(result.count).toBe(1);
            expect(result.errors).toHaveLength(0);
            expect(testCharacter.ability_scores.STR).toBe(12);
            expect(testCharacter.ability_modifiers.STR).toBe(1); // (12 - 10) / 2 = 1
            expect(testCharacter.equipment_effects).toBeDefined();
            expect(testCharacter.equipment_effects).toHaveLength(1);
            expect(testCharacter.equipment_effects?.[0].source).toBe('Belt of Strength');
        });

        it('should apply skill proficiency when equipping item', () => {
            const equipment: EnhancedEquipment = {
                name: 'Boots of Elvenkind',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'skill_proficiency',
                        target: 'stealth',
                        value: 'expertise',
                        description: 'Stealth expertise'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.skills.stealth).toBe('expertise');
        });

        it('should apply proficiency level upgrade from none to proficient', () => {
            const equipment: EnhancedEquipment = {
                name: 'Tool Belt',
                type: 'item',
                rarity: 'common',
                weight: 2,
                properties: [
                    {
                        type: 'skill_proficiency',
                        target: 'athletics',
                        value: 'proficient',
                        description: 'Athletics proficiency'
                    }
                ],
                source: 'default'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.skills.athletics).toBe('proficient');
        });

        it('should apply passive modifier to speed', () => {
            const equipment: EnhancedEquipment = {
                name: 'Boots of Speed',
                type: 'item',
                rarity: 'rare',
                weight: 1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'speed',
                        value: 10,
                        description: '+10 speed'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.speed).toBe(40);
        });

        it('should apply passive modifier to armor class', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Protection',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.armor_class).toBe(11);
        });

        it('should apply passive modifier to max HP', () => {
            const equipment: EnhancedEquipment = {
                name: 'Amulet of Health',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'max_hp',
                        value: 5,
                        description: '+5 max HP'
                    }
                ],
                source: 'custom'
            };

            const initialMax = testCharacter.hp.max;
            const initialCurrent = testCharacter.hp.current;

            EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(testCharacter.hp.max).toBe(initialMax + 5);
            expect(testCharacter.hp.current).toBe(initialCurrent + 5);
        });

        it('should track special properties', () => {
            const equipment: EnhancedEquipment = {
                name: 'Flaming Sword',
                type: 'weapon',
                rarity: 'rare',
                weight: 3,
                properties: [
                    {
                        type: 'special_property',
                        target: 'finesse',
                        value: true,
                        description: 'Finesse weapon'
                    },
                    {
                        type: 'damage_bonus',
                        target: 'fire',
                        value: '1d6',
                        description: '+1d6 fire damage'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(result.count).toBe(2);
            expect(testCharacter.equipment_effects?.[0].effects).toHaveLength(2);
        });

        it('should apply equipment-granted skills from grantsSkills', () => {
            const equipment: EnhancedEquipment = {
                name: 'Thieves\' Tools',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                grantsSkills: [
                    { skillId: 'thieves_tools', level: 'proficient' }
                ],
                source: 'default'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.skills.thieves_tools).toBe('proficient');
            expect(testCharacter.equipment_effects?.[0].skills).toHaveLength(1);
            expect(testCharacter.equipment_effects?.[0].skills[0].skillId).toBe('thieves_tools');
        });

        it('should apply equipment-granted features from grantsFeatures (string reference)', () => {
            // First, let's check if darkvision exists in the registry
            const darkvision = featureRegistry.getRacialTraitById('darkvision');
            if (!darkvision) {
                // Skip test if feature doesn't exist
                return;
            }

            const equipment: EnhancedEquipment = {
                name: 'Goggles of Night',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                grantsFeatures: ['darkvision'],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.class_features).toContain('darkvision');
            expect(testCharacter.equipment_effects?.[0].features).toHaveLength(1);
            expect(testCharacter.equipment_effects?.[0].features[0].featureId).toBe('darkvision');
        });

        it('should apply inline mini-feature from grantsFeatures', () => {
            const miniFeature: EquipmentMiniFeature = {
                id: 'fire_aura',
                name: 'Fire Aura',
                description: 'Emits fire that damages nearby enemies',
                effects: [
                    {
                        type: 'special_property',
                        target: 'fire_aura',
                        value: true,
                        description: 'Deals 1d4 fire damage to nearby enemies'
                    }
                ],
                source: 'equipment_inline'
            };

            const equipment: EnhancedEquipment = {
                name: 'Ring of Fire Aura',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                grantsFeatures: [miniFeature],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.class_features).toContain('fire_aura');
            expect(testCharacter.equipment_effects?.[0].features).toHaveLength(1);
        });

        it('should apply equipment-granted spells', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Spell Storing',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                grantsSpells: [
                    { spellId: 'fireball', level: 3 },
                    { spellId: 'mage_armor', level: 1, uses: 1, recharge: 'dawn' }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.spells).toBeDefined();
            expect(testCharacter.spells?.known_spells).toContain('fireball');
            expect(testCharacter.spells?.known_spells).toContain('mage_armor');
            expect(testCharacter.equipment_effects?.[0].spells).toHaveLength(2);
        });

        it('should handle equipment with no effects', () => {
            const equipment: EnhancedEquipment = {
                name: 'Plain Sword',
                type: 'weapon',
                rarity: 'common',
                weight: 3,
                damage: {
                    dice: '1d8',
                    damageType: 'slashing'
                },
                source: 'default'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(false);
            expect(result.count).toBe(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should track instance ID for per-instance tracking', () => {
            const equipment: EnhancedEquipment = {
                name: 'Magic Ring',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'DEX',
                        value: 1,
                        description: '+1 Dexterity'
                    }
                ],
                source: 'custom'
            };

            const instanceId = 'ring_001';
            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment, instanceId);

            expect(result.applied).toBe(true);
            expect(testCharacter.equipment_effects?.[0].instanceId).toBe(instanceId);
        });

        it('should reject equipping the same equipment twice', () => {
            const equipment: EnhancedEquipment = {
                name: 'Duplicate Ring',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'CON',
                        value: 1,
                        description: '+1 Constitution'
                    }
                ],
                source: 'custom'
            };

            const result1 = EquipmentEffectApplier.equipItem(testCharacter, equipment);
            const result2 = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result1.applied).toBe(true);
            expect(result2.applied).toBe(false);
            expect(result2.errors).toContain('Equipment "Duplicate Ring" is already equipped');
            expect(testCharacter.ability_scores.CON).toBe(11); // Only applied once
        });

        it('should allow same equipment with different instance IDs', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Protection',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    }
                ],
                source: 'custom'
            };

            const result1 = EquipmentEffectApplier.equipItem(testCharacter, equipment, 'ring_001');
            const result2 = EquipmentEffectApplier.equipItem(testCharacter, equipment, 'ring_002');

            expect(result1.applied).toBe(true);
            expect(result2.applied).toBe(true);
            expect(testCharacter.armor_class).toBe(12); // 10 + 1 + 1 (two rings)
            expect(testCharacter.equipment_effects).toHaveLength(2);
        });

        it('should handle conditional properties (while_equipped)', () => {
            const equipment: EnhancedEquipment = {
                name: 'Daylight Blade',
                type: 'weapon',
                rarity: 'uncommon',
                weight: 3,
                properties: [
                    {
                        type: 'damage_bonus',
                        target: 'radiant',
                        value: '1d6',
                        condition: { type: 'at_time_of_day', value: 'day' },
                        description: '+1d6 radiant damage during day'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            // Conditional properties are tracked but condition is checked during apply
            expect(testCharacter.equipment_effects?.[0].effects[0].condition).toBeDefined();
        });

        it('should handle conditional properties (wielder_race)', () => {
            const equipment: EnhancedEquipment = {
                name: 'Elven Blade',
                type: 'weapon',
                rarity: 'rare',
                weight: 2,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'DEX',
                        value: 2,
                        condition: { type: 'wielder_race', value: 'Elf' },
                        description: '+2 DEX for elves'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            // Character is Human, not Elf, so stat bonus should not apply
            expect(testCharacter.ability_scores.DEX).toBe(10);
        });

        it('should handle conditional properties (wielder_class)', () => {
            const equipment: EnhancedEquipment = {
                name: 'Wizard\'s Focus',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'INT',
                        value: 2,
                        condition: { type: 'wielder_class', value: 'Wizard' },
                        description: '+2 INT for wizards'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            // Character is Fighter, not Wizard, so stat bonus should not apply
            expect(testCharacter.ability_scores.INT).toBe(10);
        });

        it('should return error for invalid property type', () => {
            const equipment = {
                name: 'Broken Item',
                type: 'item' as const,
                rarity: 'common' as const,
                weight: 1,
                properties: [
                    {
                        type: 'invalid_type' as any,
                        target: 'test',
                        value: 1
                    }
                ],
                source: 'default' as const
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Unknown property type');
        });
    });

    describe('unequipItem', () => {
        it('should remove stat bonus when unequipping', () => {
            const equipment: EnhancedEquipment = {
                name: 'Belt of Strength',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 Strength'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.ability_scores.STR).toBe(12);

            const result = EquipmentEffectApplier.unequipItem(testCharacter, 'Belt of Strength');

            expect(result.applied).toBe(true);
            expect(result.count).toBe(1);
            expect(testCharacter.ability_scores.STR).toBe(10);
            expect(testCharacter.ability_modifiers.STR).toBe(0);
            expect(testCharacter.equipment_effects).toHaveLength(0);
        });

        it('should remove skill proficiency when unequipping', () => {
            const equipment: EnhancedEquipment = {
                name: 'Boots of Elvenkind',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'skill_proficiency',
                        target: 'stealth',
                        value: 'expertise',
                        description: 'Stealth expertise'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.skills.stealth).toBe('expertise');

            const result = EquipmentEffectApplier.unequipItem(testCharacter, 'Boots of Elvenkind');

            expect(result.applied).toBe(true);
            expect(testCharacter.skills.stealth).toBe('none');
        });

        it('should remove passive modifier from speed', () => {
            const equipment: EnhancedEquipment = {
                name: 'Boots of Speed',
                type: 'item',
                rarity: 'rare',
                weight: 1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'speed',
                        value: 10,
                        description: '+10 speed'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.speed).toBe(40);

            EquipmentEffectApplier.unequipItem(testCharacter, 'Boots of Speed');
            expect(testCharacter.speed).toBe(30);
        });

        it('should remove passive modifier from armor class', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Protection',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.armor_class).toBe(11);

            EquipmentEffectApplier.unequipItem(testCharacter, 'Ring of Protection');
            expect(testCharacter.armor_class).toBe(10);
        });

        it('should remove passive modifier from max HP', () => {
            const equipment: EnhancedEquipment = {
                name: 'Amulet of Health',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'max_hp',
                        value: 5,
                        description: '+5 max HP'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            const maxWithAmulet = testCharacter.hp.max;
            expect(maxWithAmulet).toBe(15);

            const result = EquipmentEffectApplier.unequipItem(testCharacter, 'Amulet of Health');

            expect(result.applied).toBe(true);
            expect(testCharacter.hp.max).toBe(10);
            expect(testCharacter.hp.current).toBeLessThanOrEqual(testCharacter.hp.max);
        });

        it('should remove equipment-granted skills', () => {
            const equipment: EnhancedEquipment = {
                name: 'Thieves\' Tools',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                grantsSkills: [
                    { skillId: 'thieves_tools', level: 'proficient' }
                ],
                source: 'default'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.skills.thieves_tools).toBe('proficient');

            EquipmentEffectApplier.unequipItem(testCharacter, 'Thieves\' Tools');
            expect(testCharacter.skills.thieves_tools).toBe('none');
        });

        it('should remove equipment-granted features', () => {
            const darkvision = featureRegistry.getRacialTraitById('darkvision');
            if (!darkvision) {
                return;
            }

            const equipment: EnhancedEquipment = {
                name: 'Goggles of Night',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                grantsFeatures: ['darkvision'],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.class_features).toContain('darkvision');

            EquipmentEffectApplier.unequipItem(testCharacter, 'Goggles of Night');
            expect(testCharacter.class_features).not.toContain('darkvision');
        });

        it('should remove equipment-granted spells', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Spell Storing',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                grantsSpells: [
                    { spellId: 'fireball', level: 3 }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.spells?.known_spells).toContain('fireball');

            EquipmentEffectApplier.unequipItem(testCharacter, 'Ring of Spell Storing');
            expect(testCharacter.spells?.known_spells).not.toContain('fireball');
        });

        it('should remove by instance ID', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Protection',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment, 'ring_001');
            EquipmentEffectApplier.equipItem(testCharacter, equipment, 'ring_002');
            expect(testCharacter.armor_class).toBe(12);

            EquipmentEffectApplier.unequipItem(testCharacter, 'Ring of Protection', 'ring_001');
            expect(testCharacter.armor_class).toBe(11);
            expect(testCharacter.equipment_effects).toHaveLength(1);
            expect(testCharacter.equipment_effects?.[0].instanceId).toBe('ring_002');
        });

        it('should return error when unequipping non-existent equipment', () => {
            // First equip something so equipment_effects exists
            const equipment: EnhancedEquipment = {
                name: 'Test Ring',
                type: 'item',
                rarity: 'common',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'DEX',
                        value: 1,
                        description: '+1 DEX'
                    }
                ],
                source: 'custom'
            };
            EquipmentEffectApplier.equipItem(testCharacter, equipment);

            // Now try to unequip something that doesn't exist
            const result = EquipmentEffectApplier.unequipItem(testCharacter, 'Nonexistent Item');

            expect(result.applied).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Nonexistent Item');
        });

        it('should return error when character has no equipment effects', () => {
            const result = EquipmentEffectApplier.unequipItem(testCharacter, 'Any Item');

            expect(result.applied).toBe(false);
            expect(result.errors).toContain('No equipment effects found on character');
        });
    });

    describe('reapplyEquipmentEffects', () => {
        it('should reapply all equipment effects', () => {
            const belt: EnhancedEquipment = {
                name: 'Belt of Strength',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 Strength'
                    }
                ],
                source: 'custom'
            };

            const boots: EnhancedEquipment = {
                name: 'Boots of Speed',
                type: 'item',
                rarity: 'rare',
                weight: 1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'speed',
                        value: 10,
                        description: '+10 speed'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, belt);
            EquipmentEffectApplier.equipItem(testCharacter, boots);

            expect(testCharacter.ability_scores.STR).toBe(12);
            expect(testCharacter.speed).toBe(40);

            // Manually modify stats to simulate changes
            testCharacter.ability_scores.STR = 10;
            testCharacter.speed = 30;

            const result = EquipmentEffectApplier.reapplyEquipmentEffects(testCharacter);

            expect(result.applied).toBe(true);
            expect(result.count).toBe(2);
            expect(testCharacter.ability_scores.STR).toBe(12);
            expect(testCharacter.speed).toBe(40);
        });

        it('should return empty result when no equipment effects', () => {
            const result = EquipmentEffectApplier.reapplyEquipmentEffects(testCharacter);

            expect(result.applied).toBe(false);
            expect(result.count).toBe(0);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('getActiveEffects', () => {
        it('should return all active equipment properties', () => {
            const equipment: EnhancedEquipment = {
                name: 'Multi-Effect Ring',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'DEX',
                        value: 1,
                        description: '+1 DEX'
                    },
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    },
                    {
                        type: 'special_property',
                        target: 'finesse',
                        value: true,
                        description: 'Finesse'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);

            const activeEffects = EquipmentEffectApplier.getActiveEffects(testCharacter);

            expect(activeEffects).toHaveLength(3);
            expect(activeEffects.some(e => e.target === 'DEX')).toBe(true);
            expect(activeEffects.some(e => e.target === 'ac')).toBe(true);
            expect(activeEffects.some(e => e.target === 'finesse')).toBe(true);
        });

        it('should return empty array when no equipment effects', () => {
            const activeEffects = EquipmentEffectApplier.getActiveEffects(testCharacter);
            expect(activeEffects).toEqual([]);
        });

        it('should combine effects from multiple equipment', () => {
            const belt: EnhancedEquipment = {
                name: 'Belt of Strength',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 STR'
                    }
                ],
                source: 'custom'
            };

            const ring: EnhancedEquipment = {
                name: 'Ring of Protection',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, belt);
            EquipmentEffectApplier.equipItem(testCharacter, ring);

            const activeEffects = EquipmentEffectApplier.getActiveEffects(testCharacter);

            expect(activeEffects).toHaveLength(2);
        });
    });

    describe('Stacking Behavior', () => {
        it('should stack multiple stat bonuses of same type', () => {
            const belt1: EnhancedEquipment = {
                name: 'Belt of Strength +1',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 1,
                        description: '+1 STR',
                        stackable: true
                    }
                ],
                source: 'custom'
            };

            const belt2: EnhancedEquipment = {
                name: 'Belt of Strength +2',
                type: 'item',
                rarity: 'rare',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 STR',
                        stackable: true
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, belt1, 'belt_001');
            EquipmentEffectApplier.equipItem(testCharacter, belt2, 'belt_002');

            expect(testCharacter.ability_scores.STR).toBe(13); // 10 + 1 + 2
        });

        it('should stack multiple AC bonuses', () => {
            const ring1: EnhancedEquipment = {
                name: 'Ring of Protection +1',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 1,
                        description: '+1 AC'
                    }
                ],
                source: 'custom'
            };

            const ring2: EnhancedEquipment = {
                name: 'Ring of Protection +2',
                type: 'item',
                rarity: 'rare',
                weight: 0.1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 2,
                        description: '+2 AC'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, ring1, 'ring_001');
            EquipmentEffectApplier.equipItem(testCharacter, ring2, 'ring_002');

            expect(testCharacter.armor_class).toBe(13); // 10 + 1 + 2
        });

        it('should stack multiple speed bonuses', () => {
            const boots1: EnhancedEquipment = {
                name: 'Boots of Speed +5',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'speed',
                        value: 5,
                        description: '+5 speed'
                    }
                ],
                source: 'custom'
            };

            const boots2: EnhancedEquipment = {
                name: 'Boots of Speed +10',
                type: 'item',
                rarity: 'rare',
                weight: 1,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'speed',
                        value: 10,
                        description: '+10 speed'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, boots1, 'boots_001');
            EquipmentEffectApplier.equipItem(testCharacter, boots2, 'boots_002');

            expect(testCharacter.speed).toBe(45); // 30 + 5 + 10
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle equipment with all effect types', () => {
            const equipment: EnhancedEquipment = {
                name: 'Helm of Brilliance',
                type: 'item',
                rarity: 'legendary',
                weight: 3,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'CHA',
                        value: 2,
                        description: '+2 Charisma'
                    },
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 2,
                        description: '+2 AC'
                    }
                ],
                grantsFeatures: [
                    {
                        id: 'fire_resistance',
                        name: 'Fire Resistance',
                        description: 'Resistance to fire damage',
                        effects: [
                            {
                                type: 'special_property',
                                target: 'damage_resistance',
                                value: 'fire',
                                description: 'Fire resistance'
                            }
                        ],
                        source: 'equipment_inline'
                    }
                ],
                grantsSkills: [
                    { skillId: 'persuasion', level: 'expertise' }
                ],
                grantsSpells: [
                    { spellId: 'fireball', level: 3 }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(result.count).toBeGreaterThan(0);

            expect(testCharacter.ability_scores.CHA).toBe(12);
            expect(testCharacter.armor_class).toBe(12);
            expect(testCharacter.class_features).toContain('fire_resistance');
            expect(testCharacter.skills.persuasion).toBe('expertise');
            expect(testCharacter.spells?.known_spells).toContain('fireball');
        });

        it('should handle equip/unequip/equip cycle', () => {
            const equipment: EnhancedEquipment = {
                name: 'Cyclable Ring',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'DEX',
                        value: 1,
                        description: '+1 DEX'
                    }
                ],
                source: 'custom'
            };

            // First equip
            let result = EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(result.applied).toBe(true);
            expect(testCharacter.ability_scores.DEX).toBe(11);

            // Unequip
            result = EquipmentEffectApplier.unequipItem(testCharacter, 'Cyclable Ring');
            expect(result.applied).toBe(true);
            expect(testCharacter.ability_scores.DEX).toBe(10);

            // Re-equip
            result = EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(result.applied).toBe(true);
            expect(testCharacter.ability_scores.DEX).toBe(11);
        });

        it('should handle multiple equipment with different effects', () => {
            const equipment1: EnhancedEquipment = {
                name: 'STR Belt',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 STR'
                    }
                ],
                source: 'custom'
            };

            const equipment2: EnhancedEquipment = {
                name: 'DEX Belt',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'DEX',
                        value: 2,
                        description: '+2 DEX'
                    }
                ],
                source: 'custom'
            };

            const equipment3: EnhancedEquipment = {
                name: 'CON Amulet',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'CON',
                        value: 2,
                        description: '+2 CON'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment1);
            EquipmentEffectApplier.equipItem(testCharacter, equipment2);
            EquipmentEffectApplier.equipItem(testCharacter, equipment3);

            expect(testCharacter.ability_scores.STR).toBe(12);
            expect(testCharacter.ability_scores.DEX).toBe(12);
            expect(testCharacter.ability_scores.CON).toBe(12);
            expect(testCharacter.equipment_effects).toHaveLength(3);

            // Remove middle equipment
            EquipmentEffectApplier.unequipItem(testCharacter, 'DEX Belt');

            expect(testCharacter.ability_scores.STR).toBe(12);
            expect(testCharacter.ability_scores.DEX).toBe(10);
            expect(testCharacter.ability_scores.CON).toBe(12);
            expect(testCharacter.equipment_effects).toHaveLength(2);
        });
    });

    describe('Edge Cases', () => {
        it('should handle equipment with zero stat bonus', () => {
            const equipment: EnhancedEquipment = {
                name: 'Useless Belt',
                type: 'item',
                rarity: 'common',
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 0,
                        description: '+0 Strength'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.ability_scores.STR).toBe(10); // No change
        });

        it('should handle negative stat bonuses (cursed items)', () => {
            const equipment: EnhancedEquipment = {
                name: 'Cursed Belt',
                type: 'item',
                rarity: 'cursed' as any,
                weight: 1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: -2,
                        description: '-2 Strength'
                    }
                ],
                source: 'custom'
            };

            EquipmentEffectApplier.equipItem(testCharacter, equipment);
            expect(testCharacter.ability_scores.STR).toBe(8);

            EquipmentEffectApplier.unequipItem(testCharacter, 'Cursed Belt');
            expect(testCharacter.ability_scores.STR).toBe(10);
        });

        it('should handle equipment granting multiple skills', () => {
            const equipment: EnhancedEquipment = {
                name: 'Vest of Many Skills',
                type: 'item',
                rarity: 'rare',
                weight: 1,
                grantsSkills: [
                    { skillId: 'athletics', level: 'proficient' },
                    { skillId: 'acrobatics', level: 'proficient' },
                    { skillId: 'stealth', level: 'expertise' }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.skills.athletics).toBe('proficient');
            expect(testCharacter.skills.acrobatics).toBe('proficient');
            expect(testCharacter.skills.stealth).toBe('expertise');
            expect(testCharacter.equipment_effects?.[0].skills).toHaveLength(3);
        });

        it('should handle equipment granting multiple features', () => {
            const darkvision = featureRegistry.getRacialTraitById('darkvision');
            if (!darkvision) {
                return;
            }

            const equipment: EnhancedEquipment = {
                name: 'Cloak of Many Traits',
                type: 'item',
                rarity: 'very_rare',
                weight: 1,
                grantsFeatures: [
                    'darkvision',
                    {
                        id: 'custom_trait',
                        name: 'Custom Trait',
                        description: 'A custom trait',
                        effects: [],
                        source: 'equipment_inline'
                    }
                ],
                source: 'custom'
            };

            const result = EquipmentEffectApplier.equipItem(testCharacter, equipment);

            expect(result.applied).toBe(true);
            expect(testCharacter.class_features).toContain('darkvision');
            expect(testCharacter.class_features).toContain('custom_trait');
        });
    });
});
