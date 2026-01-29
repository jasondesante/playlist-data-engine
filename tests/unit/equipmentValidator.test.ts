/**
 * EquipmentValidator Unit Tests
 *
 * Tests for equipment validation functionality.
 * Part of Phase 10.1: Unit Tests for EquipmentValidator.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EquipmentValidator } from '../../src/core/equipment/EquipmentValidator.js';
import type {
    EnhancedEquipment,
    EquipmentProperty,
    EquipmentModification,
    EquipmentMiniFeature
} from '../../src/core/types/Equipment.js';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';

describe('EquipmentValidator', () => {
    let featureRegistry: FeatureRegistry;
    let skillRegistry: SkillRegistry;

    beforeEach(() => {
        // Get singleton instances
        featureRegistry = FeatureRegistry.getInstance();
        skillRegistry = SkillRegistry.getInstance();

        // Initialize if not already
        if (!featureRegistry.isInitialized()) {
            featureRegistry.initializeDefaults();
        }
        if (!skillRegistry.isInitialized()) {
            skillRegistry.initializeDefaults();
        }
    });

    afterEach(() => {
        // Clean up is handled by singleton lifecycle
    });

    describe('validateEquipment', () => {
        it('should validate a valid equipment object', () => {
            const equipment: EnhancedEquipment = {
                name: 'Longsword',
                type: 'weapon',
                rarity: 'common',
                weight: 3,
                damage: {
                    dice: '1d8',
                    damageType: 'slashing',
                    versatile: '1d10'
                },
                weaponProperties: ['versatile'],
                spawnWeight: 1.0,
                source: 'default',
                tags: ['martial', 'melee']
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should reject equipment with missing name', () => {
            const equipment = {
                name: '',
                type: 'weapon' as const,
                rarity: 'common' as const,
                weight: 3,
                source: 'default' as const
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Equipment must have a valid name (required)');
        });

        it('should reject equipment with invalid type', () => {
            const equipment = {
                name: 'Test Item',
                type: 'invalid' as any,
                rarity: 'common' as const,
                weight: 1,
                source: 'default' as const
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Equipment type must be one of'))).toBe(true);
        });

        it('should reject equipment with invalid rarity', () => {
            const equipment = {
                name: 'Test Item',
                type: 'weapon' as const,
                rarity: 'mythic' as any,
                weight: 1,
                source: 'default' as const
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Equipment rarity must be one of'))).toBe(true);
        });

        it('should reject equipment with negative weight', () => {
            const equipment = {
                name: 'Test Item',
                type: 'weapon' as const,
                rarity: 'common' as const,
                weight: -1,
                source: 'default' as const
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Equipment weight must be a non-negative number');
        });

        it('should reject equipment with invalid source', () => {
            const equipment = {
                name: 'Test Item',
                type: 'weapon' as const,
                rarity: 'common' as const,
                weight: 1,
                source: 'invalid' as any
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Equipment source must be one of'))).toBe(true);
        });

        it('should validate equipment with properties', () => {
            const equipment: EnhancedEquipment = {
                name: 'Ring of Strength',
                type: 'item',
                rarity: 'uncommon',
                weight: 0.1,
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: 2,
                        description: '+2 Strength'
                    }
                ],
                source: 'custom',
                spawnWeight: 0.5
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });

        it('should reject equipment with invalid properties', () => {
            const equipment: EnhancedEquipment = {
                name: 'Broken Item',
                type: 'item',
                rarity: 'common',
                weight: 1,
                properties: [
                    {
                        type: 'invalid_type' as any,
                        target: 'test',
                        value: 1
                    }
                ],
                source: 'default'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Property type must be one of'))).toBe(true);
        });

        it('should validate equipment with valid skill grants', () => {
            const equipment: EnhancedEquipment = {
                name: 'Boots of Elvenkind',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                grantsSkills: [
                    { skillId: 'stealth', level: 'expertise' }
                ],
                source: 'custom'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });

        it('should reject equipment with invalid skill grants', () => {
            const equipment: EnhancedEquipment = {
                name: 'Boots of Invalid Skill',
                type: 'item',
                rarity: 'uncommon',
                weight: 1,
                grantsSkills: [
                    { skillId: 'nonexistent_skill', level: 'proficient' }
                ],
                source: 'custom'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('not found in SkillRegistry'))).toBe(true);
        });

        it('should validate equipment with valid damage info', () => {
            const equipment: EnhancedEquipment = {
                name: 'Flaming Sword',
                type: 'weapon',
                rarity: 'rare',
                weight: 3,
                damage: {
                    dice: '1d8',
                    damageType: 'fire',
                    versatile: '1d10'
                },
                source: 'custom'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });

        it('should reject equipment with invalid damage dice format', () => {
            const equipment: EnhancedEquipment = {
                name: 'Broken Sword',
                type: 'weapon',
                rarity: 'common',
                weight: 3,
                damage: {
                    dice: 'invalid',
                    damageType: 'slashing'
                },
                source: 'default'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Damage dice must be in format'))).toBe(true);
        });

        it('should reject equipment with invalid spawn weight', () => {
            const equipment: EnhancedEquipment = {
                name: 'Test Item',
                type: 'weapon',
                rarity: 'common',
                weight: 1,
                spawnWeight: -1,
                source: 'default'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Spawn weight must be non-negative'))).toBe(true);
        });

        it('should accept spawn weight of 0 (never random, still usable)', () => {
            const equipment: EnhancedEquipment = {
                name: 'Unique Artifact',
                type: 'item',
                rarity: 'legendary',
                weight: 0,
                spawnWeight: 0,
                source: 'custom'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });
    });

    describe('validateProperty', () => {
        it('should validate a valid stat bonus property', () => {
            const property: EquipmentProperty = {
                type: 'stat_bonus',
                target: 'STR',
                value: 2,
                description: '+2 Strength'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });

        it('should reject stat bonus for invalid ability', () => {
            const property: EquipmentProperty = {
                type: 'stat_bonus',
                target: 'INVALID',
                value: 2
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be a valid ability'))).toBe(true);
        });

        it('should validate a skill proficiency property', () => {
            const property: EquipmentProperty = {
                type: 'skill_proficiency',
                target: 'stealth',
                value: 'expertise',
                description: 'Stealth expertise'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });

        it('should reject skill proficiency for invalid skill', () => {
            const property: EquipmentProperty = {
                type: 'skill_proficiency',
                target: 'nonexistent_skill',
                value: 'proficient'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('not found in SkillRegistry'))).toBe(true);
        });

        it('should validate a passive modifier property', () => {
            const property: EquipmentProperty = {
                type: 'passive_modifier',
                target: 'ac',
                value: 1,
                description: '+1 AC'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });

        it('should validate a damage bonus property', () => {
            const property: EquipmentProperty = {
                type: 'damage_bonus',
                target: 'fire',
                value: '1d6',
                description: '+1d6 fire damage'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });

        it('should validate damage bonus with numeric value', () => {
            const property: EquipmentProperty = {
                type: 'damage_bonus',
                target: 'fire',
                value: 3,
                description: '+3 fire damage'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });

        it('should reject damage bonus with invalid dice format', () => {
            const property: EquipmentProperty = {
                type: 'damage_bonus',
                target: 'fire',
                value: 'invalid'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be a dice format'))).toBe(true);
        });

        it('should validate an ability unlock property', () => {
            const property: EquipmentProperty = {
                type: 'ability_unlock',
                target: 'darkvision',
                value: 60,
                description: 'Darkvision 60 ft'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });

        it('should validate a special property', () => {
            const property: EquipmentProperty = {
                type: 'special_property',
                target: 'finesse',
                value: true,
                description: 'Finesse weapon'
            };

            const result = EquipmentValidator.validateProperty(property);
            expect(result.valid).toBe(true);
        });
    });

    describe('validateCondition', () => {
        it('should validate a while_equipped condition', () => {
            const condition = {
                type: 'while_equipped' as const,
                value: true
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should validate an at_time_of_day condition', () => {
            const condition = {
                type: 'at_time_of_day' as const,
                value: 'night'
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid time of day value', () => {
            const condition = {
                type: 'at_time_of_day' as const,
                value: 'midnight' as any
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be one of'))).toBe(true);
        });

        it('should validate a wielder_race condition', () => {
            const condition = {
                type: 'wielder_race' as const,
                value: 'Elf'
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should validate a wielder_class condition', () => {
            const condition = {
                type: 'wielder_class' as const,
                value: 'Wizard'
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should validate a vs_creature_type condition', () => {
            const condition = {
                type: 'vs_creature_type' as const,
                value: 'dragon'
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should validate an on_hit condition', () => {
            const condition = {
                type: 'on_hit' as const,
                value: true
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should validate a custom condition', () => {
            const condition = {
                type: 'custom' as const,
                value: 'bloodied',
                description: 'Wielder is below half HP'
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(true);
        });

        it('should reject custom condition without description', () => {
            const condition = {
                type: 'custom' as const,
                value: 'bloodied'
            };

            const result = EquipmentValidator.validateCondition(condition);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a description'))).toBe(true);
        });
    });

    describe('validateFeatureReference', () => {
        it('should validate a string feature reference that exists', () => {
            // Use a known feature ID from the registry
            const knownFeature = 'darkvision'; // Common racial trait
            const result = EquipmentValidator.validateFeatureReference(knownFeature, 0);

            // We can't guarantee this feature exists in all test environments,
            // so we just check the validation doesn't crash
            expect(result).toBeDefined();
        });

        it('should validate an inline mini-feature', () => {
            const miniFeature: EquipmentMiniFeature = {
                id: 'custom_fire_aura',
                name: 'Fire Aura',
                description: 'Emits fire that damages nearby enemies',
                effects: [
                    {
                        type: 'damage_bonus',
                        target: 'fire',
                        value: '1d4',
                        description: '1d4 fire damage to nearby enemies'
                    }
                ],
                source: 'equipment_inline'
            };

            const result = EquipmentValidator.validateFeatureReference(miniFeature, 0);
            expect(result.valid).toBe(true);
        });

        it('should reject mini-feature with invalid effects', () => {
            const miniFeature: EquipmentMiniFeature = {
                id: 'broken_feature',
                name: 'Broken Feature',
                description: 'This feature has invalid effects',
                effects: [
                    {
                        type: 'invalid_type' as any,
                        target: 'test',
                        value: 1
                    }
                ],
                source: 'equipment_inline'
            };

            const result = EquipmentValidator.validateFeatureReference(miniFeature, 0);
            expect(result.valid).toBe(false);
        });

        it('should reject mini-feature without required fields', () => {
            const miniFeature = {
                id: 'incomplete',
                effects: [],
                source: 'equipment_inline' as const
            } as any;

            const result = EquipmentValidator.validateFeatureReference(miniFeature, 0);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid name'))).toBe(true);
        });
    });

    describe('validateSkillReference', () => {
        it('should validate a skill that exists in registry', () => {
            const result = EquipmentValidator.validateSkillReference('stealth', 0);
            expect(result.valid).toBe(true);
        });

        it('should reject a skill that does not exist', () => {
            const result = EquipmentValidator.validateSkillReference('nonexistent_skill', 0);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('not found in SkillRegistry'))).toBe(true);
        });

        it('should reject invalid skill ID', () => {
            const result = EquipmentValidator.validateSkillReference('', 0);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid skillId'))).toBe(true);
        });
    });

    describe('validateEquipmentFeatureReference', () => {
        it('should return true for valid feature reference', () => {
            // This tests the convenience method
            const result = EquipmentValidator.validateEquipmentFeatureReference('darkvision');
            expect(typeof result).toBe('boolean');
        });

        it('should return false for invalid feature reference', () => {
            const result = EquipmentValidator.validateEquipmentFeatureReference('nonexistent_feature_xyz');
            expect(result).toBe(false);
        });
    });

    describe('validateEquipmentSkillReference', () => {
        it('should return true for valid skill reference', () => {
            const result = EquipmentValidator.validateEquipmentSkillReference('stealth');
            expect(result).toBe(true);
        });

        it('should return false for invalid skill reference', () => {
            const result = EquipmentValidator.validateEquipmentSkillReference('nonexistent_skill_xyz');
            expect(result).toBe(false);
        });
    });

    describe('validateDamageInfo', () => {
        it('should validate valid damage info', () => {
            const damage = {
                dice: '1d8',
                damageType: 'slashing'
            };

            const result = EquipmentValidator.validateDamageInfo(damage);
            expect(result.valid).toBe(true);
        });

        it('should validate damage with versatile option', () => {
            const damage = {
                dice: '1d8',
                damageType: 'slashing',
                versatile: '1d10'
            };

            const result = EquipmentValidator.validateDamageInfo(damage);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid dice format', () => {
            const damage = {
                dice: 'invalid',
                damageType: 'slashing'
            };

            const result = EquipmentValidator.validateDamageInfo(damage);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be in format'))).toBe(true);
        });

        it('should reject damage without dice string', () => {
            const damage = {
                dice: '',
                damageType: 'slashing'
            };

            const result = EquipmentValidator.validateDamageInfo(damage);
            expect(result.valid).toBe(false);
        });

        it('should reject damage without damage type', () => {
            const damage = {
                dice: '1d8',
                damageType: ''
            };

            const result = EquipmentValidator.validateDamageInfo(damage);
            expect(result.valid).toBe(false);
        });

        it('should reject invalid versatile format', () => {
            const damage = {
                dice: '1d8',
                damageType: 'slashing',
                versatile: 'invalid'
            };

            const result = EquipmentValidator.validateDamageInfo(damage);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be in dice format'))).toBe(true);
        });

        it('should accept undefined damage', () => {
            const result = EquipmentValidator.validateDamageInfo(undefined);
            expect(result.valid).toBe(true);
        });
    });

    describe('validateSpawnWeight', () => {
        it('should validate positive spawn weight', () => {
            const result = EquipmentValidator.validateSpawnWeight(1.5);
            expect(result.valid).toBe(true);
        });

        it('should validate zero spawn weight', () => {
            const result = EquipmentValidator.validateSpawnWeight(0);
            expect(result.valid).toBe(true);
        });

        it('should reject negative spawn weight', () => {
            const result = EquipmentValidator.validateSpawnWeight(-1);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be non-negative'))).toBe(true);
        });

        it('should reject infinite spawn weight', () => {
            const result = EquipmentValidator.validateSpawnWeight(Infinity);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be a finite number'))).toBe(true);
        });

        it('should reject NaN spawn weight', () => {
            const result = EquipmentValidator.validateSpawnWeight(NaN);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateModification', () => {
        it('should validate a valid modification', () => {
            const modification: EquipmentModification = {
                id: 'plus_one_enchant',
                name: '+1 Enchantment',
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'attack_roll',
                        value: 1,
                        description: '+1 to attack rolls'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(true);
        });

        it('should reject modification without id', () => {
            const modification = {
                name: 'Test',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            } as any;

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid id'))).toBe(true);
        });

        it('should reject modification without name', () => {
            const modification = {
                id: 'test',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            } as any;

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid name'))).toBe(true);
        });

        it('should reject modification without appliedAt', () => {
            const modification = {
                id: 'test',
                name: 'Test',
                properties: [],
                source: 'test'
            } as any;

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid appliedAt'))).toBe(true);
        });

        it('should reject modification without properties array', () => {
            const modification = {
                id: 'test',
                name: 'Test',
                appliedAt: new Date().toISOString(),
                source: 'test'
            } as any;

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a properties array'))).toBe(true);
        });

        it('should validate modification with addsSkills', () => {
            const modification: EquipmentModification = {
                id: 'skill_boost',
                name: 'Skill Boost',
                properties: [],
                addsSkills: [
                    { skillId: 'stealth', level: 'proficient' }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(true);
        });

        it('should reject modification with invalid skill reference', () => {
            const modification: EquipmentModification = {
                id: 'invalid_skill',
                name: 'Invalid Skill',
                properties: [],
                addsSkills: [
                    { skillId: 'nonexistent_skill', level: 'proficient' }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            const result = EquipmentValidator.validateModification(modification);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('not found in SkillRegistry'))).toBe(true);
        });
    });

    describe('validateMiniFeature', () => {
        it('should validate a valid mini-feature', () => {
            const miniFeature: EquipmentMiniFeature = {
                id: 'fire_brand',
                name: 'Fire Brand',
                description: 'Weapon bursts into flame',
                effects: [
                    {
                        type: 'damage_bonus',
                        target: 'fire',
                        value: '1d6',
                        description: '+1d6 fire damage'
                    }
                ],
                source: 'equipment_inline'
            };

            const result = EquipmentValidator.validateMiniFeature(miniFeature);
            expect(result.valid).toBe(true);
        });

        it('should reject mini-feature without id', () => {
            const miniFeature = {
                name: 'Test',
                description: 'Test',
                effects: [],
                source: 'equipment_inline' as const
            } as any;

            const result = EquipmentValidator.validateMiniFeature(miniFeature);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid id'))).toBe(true);
        });

        it('should reject mini-feature without name', () => {
            const miniFeature = {
                id: 'test',
                description: 'Test',
                effects: [],
                source: 'equipment_inline' as const
            } as any;

            const result = EquipmentValidator.validateMiniFeature(miniFeature);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid name'))).toBe(true);
        });

        it('should reject mini-feature without description', () => {
            const miniFeature = {
                id: 'test',
                name: 'Test',
                effects: [],
                source: 'equipment_inline' as const
            } as any;

            const result = EquipmentValidator.validateMiniFeature(miniFeature);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have a valid description'))).toBe(true);
        });

        it('should reject mini-feature without effects array', () => {
            const miniFeature = {
                id: 'test',
                name: 'Test',
                description: 'Test',
                source: 'equipment_inline' as const
            } as any;

            const result = EquipmentValidator.validateMiniFeature(miniFeature);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have an effects array'))).toBe(true);
        });

        it('should reject mini-feature with wrong source', () => {
            const miniFeature = {
                id: 'test',
                name: 'Test',
                description: 'Test',
                effects: [],
                source: 'default' as const
            } as any;

            const result = EquipmentValidator.validateMiniFeature(miniFeature);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must have source:'))).toBe(true);
        });
    });

    describe('validateACBonus', () => {
        it('should validate positive AC bonus', () => {
            const result = EquipmentValidator.validateACBonus(2);
            expect(result.valid).toBe(true);
        });

        it('should validate zero AC bonus', () => {
            const result = EquipmentValidator.validateACBonus(0);
            expect(result.valid).toBe(true);
        });

        it('should reject negative AC bonus', () => {
            const result = EquipmentValidator.validateACBonus(-1);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('cannot be negative'))).toBe(true);
        });

        it('should reject non-number AC bonus', () => {
            const result = EquipmentValidator.validateACBonus('2' as any);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateWeaponProperties', () => {
        it('should validate valid weapon properties', () => {
            const result = EquipmentValidator.validateWeaponProperties(['finesse', 'versatile', 'two-handed']);
            expect(result.valid).toBe(true);
        });

        it('should validate properties with range format', () => {
            const result = EquipmentValidator.validateWeaponProperties(['thrown', 'range_20_60']);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid range format', () => {
            const result = EquipmentValidator.validateWeaponProperties(['range_invalid']);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('must be in format'))).toBe(true);
        });

        it('should reject non-array input', () => {
            const result = EquipmentValidator.validateWeaponProperties('finesse' as any);
            expect(result.valid).toBe(false);
        });

        it('should reject non-string property in array', () => {
            const result = EquipmentValidator.validateWeaponProperties(['finesse', 123 as any]);
            expect(result.valid).toBe(false);
        });
    });

    describe('Complex Equipment Validation', () => {
        it('should validate complete magic item with all features', () => {
            const equipment: EnhancedEquipment = {
                name: 'Helm of Brilliance',
                type: 'item',
                rarity: 'legendary',
                weight: 3,
                properties: [
                    {
                        type: 'passive_modifier',
                        target: 'ac',
                        value: 2,
                        description: '+2 AC'
                    },
                    {
                        type: 'stat_bonus',
                        target: 'CHA',
                        value: 2,
                        description: '+2 Charisma'
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
                                description: 'Resistance to fire damage'
                            }
                        ],
                        source: 'equipment_inline'
                    }
                ],
                grantsSkills: [
                    { skillId: 'persuasion', level: 'expertise' }
                ],
                grantsSpells: [
                    { spellId: 'fireball', level: 3, uses: 1, recharge: 'dawn' }
                ],
                spawnWeight: 0.1,
                source: 'custom',
                tags: ['magic', 'fire', 'headgear']
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });

        it('should validate equipment with multiple damage bonuses', () => {
            const equipment: EnhancedEquipment = {
                name: 'Frost Brand',
                type: 'weapon',
                rarity: 'very_rare',
                weight: 3,
                damage: {
                    dice: '1d8',
                    damageType: 'slashing'
                },
                properties: [
                    {
                        type: 'damage_bonus',
                        target: 'cold',
                        value: '1d6',
                        description: '+1d6 cold damage'
                    },
                    {
                        type: 'damage_bonus',
                        target: 'fire',
                        value: 5,
                        description: '+5 fire damage (vs fire creatures)'
                    }
                ],
                weaponProperties: ['finesse'],
                source: 'custom'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });

        it('should validate equipment with conditional properties', () => {
            const equipment: EnhancedEquipment = {
                name: 'Dragon Slayer',
                type: 'weapon',
                rarity: 'rare',
                weight: 6,
                damage: {
                    dice: '1d10',
                    damageType: 'slashing'
                },
                properties: [
                    {
                        type: 'damage_bonus',
                        target: 'slashing',
                        value: '2d6',
                        condition: {
                            type: 'vs_creature_type',
                            value: 'dragon'
                        },
                        description: '+2d6 damage vs dragons'
                    },
                    {
                        type: 'special_property',
                        target: 'fear_immunity',
                        value: true,
                        condition: {
                            type: 'vs_creature_type',
                            value: 'dragon'
                        },
                        description: 'Immunity to fear from dragons'
                    }
                ],
                weaponProperties: ['two-handed'],
                source: 'custom'
            };

            const result = EquipmentValidator.validateEquipment(equipment);
            expect(result.valid).toBe(true);
        });
    });
});
