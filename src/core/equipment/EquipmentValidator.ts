/**
 * Equipment Validator
 *
 * Validates equipment data structures for the Advanced Equipment System.
 * Checks equipment properties, feature/skill references, damage info,
 * spawn weights, and modification structures.
 */

import type {
    EnhancedEquipment,
    EquipmentProperty,
    EquipmentCondition,
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentValidationResult,
    BoxContents
} from '../types/Equipment.js';
import { FeatureQuery } from '../features/FeatureQuery.js';
import { SkillQuery } from '../skills/SkillQuery.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import type { Ability } from '../types/Character.js';

/**
 * The valid ability scores
 */
const VALID_ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

/**
 * The valid equipment types
 */
const VALID_EQUIPMENT_TYPES = ['weapon', 'armor', 'item', 'box'];

/**
 * The valid rarity levels
 */
const VALID_RARITY = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];

/**
 * The valid equipment property types
 */
const VALID_PROPERTY_TYPES: EquipmentProperty['type'][] = [
    'stat_bonus',
    'skill_proficiency',
    'ability_unlock',
    'passive_modifier',
    'special_property',
    'damage_bonus',
    'stat_requirement'
];

/**
 * The valid condition types for equipment properties
 */
const VALID_CONDITION_TYPES: EquipmentCondition['type'][] = [
    'vs_creature_type',
    'at_time_of_day',
    'wielder_race',
    'wielder_class',
    'while_equipped',
    'on_hit',
    'on_damage_taken',
    'custom'
];

/**
 * The valid time of day values
 */
const VALID_TIME_OF_DAY = ['day', 'night', 'dawn', 'dusk'];

/**
 * The valid proficiency levels
 */
const VALID_PROFICIENCY_LEVEL = ['proficient', 'expertise'];

/**
 * The valid source types
 */
const VALID_SOURCE = ['default', 'custom'];

/**
 * Dice format regex for validation (e.g., "1d8", "2d6", "1d10")
 */
const DICE_FORMAT_REGEX = /^\d+d\d+$/;

/**
 * Range format regex for weapon properties (e.g., "range_20_60")
 */
const RANGE_FORMAT_REGEX = /^range_\d+_\d+$/;

/**
 * EquipmentValidator - Validates equipment data structures
 *
 * This class provides static methods for validating:
 * - Complete equipment objects
 * - Individual equipment properties
 * - Feature references (checks FeatureQuery)
 * - Skill references (checks SkillQuery)
 * - Damage information
 * - Spawn weights
 * - Equipment modifications
 */
export class EquipmentValidator {
    /**
     * Validate a complete equipment object
     *
     * Supports both legacy Equipment format and EnhancedEquipment format.
     * Legacy format may have: damage as string, armor_class instead of acBonus, no source field
     * Enhanced format has: damage as object, acBonus, source field
     *
     * @param equipment - Equipment to validate (any format)
     * @returns Validation result with any errors
     */
    static validateEquipment(equipment: any): EquipmentValidationResult {
        const errors: string[] = [];

        // Validate required fields
        if (!equipment.name || typeof equipment.name !== 'string') {
            errors.push('Equipment must have a valid name (required)');
        }

        if (!equipment.type || !VALID_EQUIPMENT_TYPES.includes(equipment.type)) {
            errors.push(`Equipment type must be one of: ${VALID_EQUIPMENT_TYPES.join(', ')}`);
        }

        if (!equipment.rarity || !VALID_RARITY.includes(equipment.rarity)) {
            errors.push(`Equipment rarity must be one of: ${VALID_RARITY.join(', ')}`);
        }

        if (typeof equipment.weight !== 'number' || equipment.weight < 0) {
            errors.push('Equipment weight must be a non-negative number');
        }

        // Validate source (optional for backward compatibility - defaults to 'default')
        if (equipment.source !== undefined && !VALID_SOURCE.includes(equipment.source)) {
            errors.push(`Equipment source must be one of: ${VALID_SOURCE.join(', ')}`);
        }

        // Validate properties if present
        if (equipment.properties) {
            if (!Array.isArray(equipment.properties)) {
                errors.push('Equipment properties must be an array');
            } else {
                for (let i = 0; i < equipment.properties.length; i++) {
                    const propValidation = this.validateProperty(equipment.properties[i]);
                    if (!propValidation.valid) {
                        errors.push(
                            `Property at index ${i}: ${propValidation.errors?.join(', ')}`
                        );
                    }
                }
            }
        }

        // Validate granted features if present
        if (equipment.grantsFeatures) {
            if (!Array.isArray(equipment.grantsFeatures)) {
                errors.push('grantsFeatures must be an array');
            } else {
                for (let i = 0; i < equipment.grantsFeatures.length; i++) {
                    const featureRef = equipment.grantsFeatures[i];
                    const featureValidation = this.validateFeatureReference(featureRef, i);
                    if (!featureValidation.valid) {
                        errors.push(...(featureValidation.errors || []));
                    }
                }
            }
        }

        // Validate granted skills if present
        if (equipment.grantsSkills) {
            if (!Array.isArray(equipment.grantsSkills)) {
                errors.push('grantsSkills must be an array');
            } else {
                for (let i = 0; i < equipment.grantsSkills.length; i++) {
                    const skillGrant = equipment.grantsSkills[i];
                    const skillValidation = this.validateSkillReference(skillGrant.skillId, i);
                    if (!skillValidation.valid) {
                        errors.push(...(skillValidation.errors || []));
                    }
                    // Validate proficiency level
                    if (skillGrant.level && !VALID_PROFICIENCY_LEVEL.includes(skillGrant.level)) {
                        errors.push(
                            `grantsSkills[${i}]: proficiency level must be 'proficient' or 'expertise'`
                        );
                    }
                }
            }
        }

        // Validate granted spells if present
        if (equipment.grantsSpells) {
            if (!Array.isArray(equipment.grantsSpells)) {
                errors.push('grantsSpells must be an array');
            } else {
                for (let i = 0; i < equipment.grantsSpells.length; i++) {
                    const spell = equipment.grantsSpells[i];
                    if (!spell.spellId || typeof spell.spellId !== 'string') {
                        errors.push(`grantsSpells[${i}]: must have a valid spellId`);
                    }
                    if (spell.uses !== undefined && (typeof spell.uses !== 'number' || spell.uses < 0)) {
                        errors.push(`grantsSpells[${i}]: uses must be a non-negative number`);
                    }
                    if (spell.level !== undefined && (typeof spell.level !== 'number' || spell.level < 0)) {
                        errors.push(`grantsSpells[${i}]: level must be a non-negative number`);
                    }
                }
            }
        }

        // Validate damage info if present
        if (equipment.damage) {
            const damageValidation = this.validateDamageInfo(equipment.damage);
            if (!damageValidation.valid) {
                errors.push(...(damageValidation.errors || []));
            }
        }

        // Validate AC bonus if present (handles both legacy armor_class and enhanced acBonus)
        const acBonus = equipment.acBonus ?? equipment.armor_class;
        if (acBonus !== undefined) {
            if (typeof acBonus !== 'number') {
                errors.push('AC bonus must be a number');
            }
        }

        // Validate weapon properties if present
        if (equipment.weaponProperties) {
            if (!Array.isArray(equipment.weaponProperties)) {
                errors.push('weaponProperties must be an array');
            }
            // Valid weapon properties could be validated further if needed
        }

        // Validate spawn weight if present
        if (equipment.spawnWeight !== undefined) {
            const weightValidation = this.validateSpawnWeight(equipment.spawnWeight);
            if (!weightValidation.valid) {
                errors.push(...(weightValidation.errors || []));
            }
        }

        // Validate template ID if present (just check it's a string)
        if (equipment.templateId !== undefined && typeof equipment.templateId !== 'string') {
            errors.push('templateId must be a string');
        }

        // Validate tags if present
        if (equipment.tags) {
            if (!Array.isArray(equipment.tags)) {
                errors.push('tags must be an array');
            }
        }

        // Validate boxContents if present (required for type: 'box')
        if (equipment.type === 'box' && !equipment.boxContents) {
            errors.push('Equipment of type "box" must have a boxContents property');
        }
        if (equipment.boxContents !== undefined) {
            const boxValidation = this.validateBoxContents(equipment.boxContents);
            if (!boxValidation.valid) {
                errors.push(...(boxValidation.errors || []));
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate a single equipment property
     *
     * @param property - Property to validate
     * @returns Validation result with any errors
     */
    static validateProperty(property: EquipmentProperty): EquipmentValidationResult {
        const errors: string[] = [];

        // Validate property type
        if (!property.type || !VALID_PROPERTY_TYPES.includes(property.type)) {
            errors.push(
                `Property type must be one of: ${VALID_PROPERTY_TYPES.join(', ')}`
            );
        }

        // Validate target
        if (!property.target || typeof property.target !== 'string') {
            errors.push('Property must have a valid target');
        }

        // Validate value based on property type
        if (property.value === undefined) {
            errors.push('Property must have a value');
        } else {
            const valueValidation = this.validatePropertyValue(
                property.type,
                property.target,
                property.value
            );
            if (!valueValidation.valid) {
                errors.push(...(valueValidation.errors || []));
            }
        }

        // Validate condition if present
        if (property.condition) {
            const conditionValidation = this.validateCondition(property.condition);
            if (!conditionValidation.valid) {
                errors.push(...(conditionValidation.errors || []));
            }
        }

        // Validate stackable if present
        if (property.stackable !== undefined && typeof property.stackable !== 'boolean') {
            errors.push('stackable must be a boolean');
        }

        // Validate description if present
        if (property.description !== undefined && typeof property.description !== 'string') {
            errors.push('description must be a string');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate a property value based on its type
     */
    private static validatePropertyValue(
        type: EquipmentProperty['type'],
        target: string,
        value: unknown
    ): EquipmentValidationResult {
        const errors: string[] = [];

        switch (type) {
            case 'stat_bonus':
                // Must target a valid ability
                if (!VALID_ABILITIES.includes(target as Ability)) {
                    errors.push(`stat_bonus target must be a valid ability: ${VALID_ABILITIES.join(', ')}`);
                }
                if (typeof value !== 'number') {
                    errors.push('stat_bonus value must be a number');
                }
                break;

            case 'skill_proficiency':
                // Target should be a valid skill ID
                // First ensure target is a string
                if (typeof target !== 'string') {
                    errors.push('skill_proficiency target must be a string');
                } else {
                    const skillReg = SkillQuery.getInstance();
                    if (!skillReg.isValidSkill(target)) {
                        errors.push(`skill_proficiency target must be a valid skill ID: "${target}" not found in SkillQuery`);
                    }
                }
                if (value !== 'proficient' && value !== 'expertise' && typeof value !== 'boolean') {
                    errors.push('skill_proficiency value must be "proficient", "expertise", or a boolean');
                }
                break;

            case 'ability_unlock':
                // Target is the ability name (e.g., "darkvision", "flight")
                if (typeof target !== 'string' || target.length === 0) {
                    errors.push('ability_unlock must have a valid target');
                }
                if (typeof value !== 'boolean' && typeof value !== 'number') {
                    errors.push('ability_unlock value must be a boolean or number');
                }
                break;

            case 'passive_modifier':
                // Validate known passive targets
                const validPassiveTargets = [
                    'ac', 'armor_class', 'speed', 'max_hp', 'hp_max',
                    'initiative', 'saving_throws', 'attack_roll', 'damage_roll'
                ];
                if (!validPassiveTargets.includes(target) &&
                    !VALID_ABILITIES.includes(target as Ability) &&
                    !SkillQuery.getInstance().isValidSkill(target)) {
                    // Allow custom targets for extensibility
                    // But warn if it doesn't match known patterns
                }
                if (typeof value !== 'number') {
                    errors.push('passive_modifier value must be a number');
                }
                break;

            case 'special_property':
                // Target is the special property name (e.g., "finesse", "versatile")
                if (typeof target !== 'string' || target.length === 0) {
                    errors.push('special_property must have a valid target');
                }
                // Value can be boolean, string, or number depending on the property
                break;

            case 'damage_bonus':
                // Target is the damage type (e.g., "fire", "lightning")
                if (typeof target !== 'string' || target.length === 0) {
                    errors.push('damage_bonus must have a valid target (damage type)');
                }
                // Value can be dice string (e.g., "1d6") or flat number
                if (typeof value === 'string' && !DICE_FORMAT_REGEX.test(value)) {
                    errors.push(`damage_bonus value must be a dice format (e.g., "1d6") or a number`);
                } else if (typeof value !== 'number' && typeof value !== 'string') {
                    errors.push('damage_bonus value must be a number or dice string');
                }
                break;

            default:
                errors.push(`Unknown property type: ${type}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate an equipment condition
     *
     * @param condition - Condition to validate
     * @returns Validation result with any errors
     */
    static validateCondition(condition: EquipmentCondition): EquipmentValidationResult {
        const errors: string[] = [];

        // Validate condition type
        if (!condition.type || !VALID_CONDITION_TYPES.includes(condition.type)) {
            errors.push(
                `Condition type must be one of: ${VALID_CONDITION_TYPES.join(', ')}`
            );
        }

        // Validate value based on condition type
        const condType = condition.type;
        const condValue = condition.value;

        switch (condType) {
            case 'at_time_of_day':
                if (!VALID_TIME_OF_DAY.includes(condition.value as any)) {
                    errors.push(`at_time_of_day value must be one of: ${VALID_TIME_OF_DAY.join(', ')}`);
                }
                break;

            case 'wielder_race':
            case 'wielder_class':
            case 'vs_creature_type':
                if (typeof condValue !== 'string' || condValue.length === 0) {
                    errors.push(`${condType} condition must have a valid string value`);
                }
                break;

            case 'while_equipped':
            case 'on_hit':
            case 'on_damage_taken':
                if (typeof condValue !== 'boolean') {
                    errors.push(`${condType} condition must have a boolean value`);
                }
                break;

            case 'custom':
                if (typeof condValue !== 'string' || condValue.length === 0) {
                    errors.push('custom condition must have a valid value string');
                }
                if (!condition.description || typeof condition.description !== 'string') {
                    errors.push('custom condition must have a description');
                }
                break;

            default:
                // This should never happen due to the type check above
                errors.push(`Unknown condition type: ${condType}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate an equipment feature reference
     *
     * Checks if string references exist in FeatureQuery or if inline
     * mini-features are properly structured.
     *
     * @param featureRef - Feature reference (string ID or mini-feature object)
     * @param index - Index in the grantsFeatures array (for error messages)
     * @returns Validation result with any errors
     */
    static validateFeatureReference(
        featureRef: string | EquipmentMiniFeature,
        index: number
    ): EquipmentValidationResult {
        const errors: string[] = [];

        if (typeof featureRef === 'string') {
            // Check if feature exists in registry
            const registry = FeatureQuery.getInstance();
            const classFeature = registry.getClassFeatureById(featureRef);
            const racialTrait = !classFeature ? registry.getRacialTraitById(featureRef) : undefined;

            if (!classFeature && !racialTrait) {
                errors.push(
                    `grantsFeatures[${index}]: Feature "${featureRef}" not found in FeatureQuery`
                );
            }
        } else if (typeof featureRef === 'object' && featureRef !== null) {
            // Validate inline mini-feature
            if (!featureRef.id || typeof featureRef.id !== 'string') {
                errors.push(`grantsFeatures[${index}]: Mini-feature must have a valid id`);
            }

            if (!featureRef.name || typeof featureRef.name !== 'string') {
                errors.push(`grantsFeatures[${index}]: Mini-feature must have a valid name`);
            }

            if (!featureRef.description || typeof featureRef.description !== 'string') {
                errors.push(`grantsFeatures[${index}]: Mini-feature must have a valid description`);
            }

            if (!featureRef.effects || !Array.isArray(featureRef.effects)) {
                errors.push(`grantsFeatures[${index}]: Mini-feature must have an effects array`);
            } else {
                // Validate each effect in the mini-feature
                for (let i = 0; i < featureRef.effects.length; i++) {
                    const effectValidation = this.validateProperty(featureRef.effects[i]);
                    if (!effectValidation.valid) {
                        errors.push(
                            `grantsFeatures[${index}].effects[${i}]: ${effectValidation.errors?.join(', ')}`
                        );
                    }
                }
            }

            if (featureRef.source !== 'equipment_inline') {
                errors.push(
                    `grantsFeatures[${index}]: Mini-feature must have source: 'equipment_inline'`
                );
            }
        } else {
            errors.push(`grantsFeatures[${index}]: Feature reference must be a string or object`);
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate if a feature ID exists in the FeatureQuery
     *
     * Convenience method for checking single feature references.
     *
     * @param featureId - Feature ID to validate
     * @returns True if feature exists in registry
     */
    static validateEquipmentFeatureReference(featureId: string): boolean {
        const registry = FeatureQuery.getInstance();
        const classFeature = registry.getClassFeatureById(featureId);
        const racialTrait = !classFeature ? registry.getRacialTraitById(featureId) : undefined;
        return !!(classFeature || racialTrait);
    }

    /**
     * Validate an equipment skill reference
     *
     * Checks if the skill ID exists in SkillQuery.
     *
     * @param skillId - Skill ID to validate
     * @param index - Index in the grantsSkills array (for error messages)
     * @returns Validation result with any errors
     */
    static validateSkillReference(
        skillId: string,
        index?: number
    ): EquipmentValidationResult {
        const errors: string[] = [];
        const prefix = index !== undefined ? `grantsSkills[${index}]` : 'skill';

        if (!skillId || typeof skillId !== 'string') {
            errors.push(`${prefix}: must have a valid skillId`);
            return {
                valid: false,
                errors
            };
        }

        if (!SkillQuery.getInstance().isValidSkill(skillId)) {
            errors.push(`${prefix}: Skill "${skillId}" not found in SkillQuery`);
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate if a skill ID exists in the SkillQuery
     *
     * Convenience method for checking single skill references.
     *
     * @param skillId - Skill ID to validate
     * @returns True if skill exists in registry
     */
    static validateEquipmentSkillReference(skillId: string): boolean {
        return SkillQuery.getInstance().isValidSkill(skillId);
    }

    /**
     * Validate damage information
     *
     * Supports both string format (legacy) and object format (EnhancedEquipment).
     * String format: "1d8 slashing"
     * Object format: { dice: "1d8", damageType: "slashing", versatile?: "1d10" }
     *
     * @param damage - Damage object or string to validate
     * @returns Validation result with any errors
     */
    static validateDamageInfo(
        damage: EnhancedEquipment['damage'] | string
    ): EquipmentValidationResult {
        const errors: string[] = [];

        if (!damage) {
            return { valid: true };
        }

        // Handle string format for backward compatibility (e.g., "1d8 slashing")
        if (typeof damage === 'string') {
            const parts = damage.trim().split(/\s+/);
            if (parts.length < 2) {
                errors.push(`Damage string must be in format "NdM type" (e.g., "1d8 slashing"), got: "${damage}"`);
            } else {
                const dicePart = parts[0];
                if (!DICE_FORMAT_REGEX.test(dicePart)) {
                    errors.push(`Damage dice must be in format "NdM" (e.g., "1d8"), got: ${dicePart}`);
                }
            }
            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };
        }

        // Handle object format (EnhancedEquipment)
        if (!damage.dice || typeof damage.dice !== 'string') {
            errors.push('Damage must have a valid dice string (e.g., "1d8")');
        } else if (!DICE_FORMAT_REGEX.test(damage.dice)) {
            errors.push(`Damage dice must be in format "NdM" (e.g., "1d8", "2d6"), got: ${damage.dice}`);
        }

        if (!damage.damageType || typeof damage.damageType !== 'string') {
            errors.push('Damage must have a valid damageType');
        }

        if (damage.versatile !== undefined) {
            if (typeof damage.versatile !== 'string') {
                errors.push('Damage versatile must be a string (dice format)');
            } else if (!DICE_FORMAT_REGEX.test(damage.versatile)) {
                errors.push(
                    `Damage versatile must be in dice format "NdM" (e.g., "1d10"), got: ${damage.versatile}`
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate spawn weight
     *
     * Spawn weights must be non-negative numbers. A weight of 0 means
     * the item will never be randomly generated but can still be used
     * by game logic.
     *
     * @param weight - Spawn weight to validate
     * @returns Validation result with any errors
     */
    static validateSpawnWeight(weight: number): EquipmentValidationResult {
        const errors: string[] = [];

        if (typeof weight !== 'number') {
            errors.push('Spawn weight must be a number');
        } else if (weight < 0) {
            errors.push('Spawn weight must be non-negative (0 = never random, still usable by game logic)');
        } else if (!Number.isFinite(weight)) {
            errors.push('Spawn weight must be a finite number');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate box contents configuration
     *
     * Validates the boxContents property for box-type equipment:
     * - drops must be an array
     * - each drop must have a non-empty pool array
     * - each pool entry must have a valid weight
     * - each pool entry must have either itemName or gold (not both)
     * - pool weights should sum to 100 (warns but does not fail)
     * - itemName references must exist in the equipment registry
     *
     * @param boxContents - BoxContents object to validate
     * @returns Validation result with any errors
     */
    static validateBoxContents(boxContents: BoxContents): EquipmentValidationResult {
        const errors: string[] = [];

        if (!boxContents || typeof boxContents !== 'object') {
            errors.push('boxContents must be an object');
            return { valid: false, errors };
        }

        if (!Array.isArray(boxContents.drops)) {
            errors.push('boxContents.drops must be an array');
            return { valid: false, errors };
        }

        if (boxContents.consumeOnOpen !== undefined && typeof boxContents.consumeOnOpen !== 'boolean') {
            errors.push('boxContents.consumeOnOpen must be a boolean');
        }

        for (let dropIndex = 0; dropIndex < boxContents.drops.length; dropIndex++) {
            const drop = boxContents.drops[dropIndex];

            if (!drop || !Array.isArray(drop.pool)) {
                errors.push(`boxContents.drops[${dropIndex}]: pool must be an array`);
                continue;
            }

            if (drop.pool.length === 0) {
                errors.push(`boxContents.drops[${dropIndex}]: pool must not be empty`);
                continue;
            }

            let totalWeight = 0;

            for (let poolIndex = 0; poolIndex < drop.pool.length; poolIndex++) {
                const entry = drop.pool[poolIndex];
                const prefix = `boxContents.drops[${dropIndex}].pool[${poolIndex}]`;

                // Validate weight
                if (typeof entry.weight !== 'number' || entry.weight < 0) {
                    errors.push(`${prefix}: weight must be a non-negative number`);
                } else {
                    totalWeight += entry.weight;
                }

                // Validate mutual exclusivity of itemName and gold
                if (entry.itemName !== undefined && entry.gold !== undefined) {
                    errors.push(`${prefix}: itemName and gold are mutually exclusive`);
                }

                // Must have at least one of itemName or gold
                if (entry.itemName === undefined && entry.gold === undefined) {
                    errors.push(`${prefix}: must have either itemName or gold`);
                }

                // Validate itemName if present
                if (entry.itemName !== undefined) {
                    if (typeof entry.itemName !== 'string' || entry.itemName.length === 0) {
                        errors.push(`${prefix}: itemName must be a non-empty string`);
                    } else {
                        // Validate itemName exists in equipment registry
                        const manager = ExtensionManager.getInstance();
                        const allEquipment = manager.get('equipment') as Array<{ name: string }>;
                        const found = allEquipment.some(eq => eq.name === entry.itemName);
                        if (!found) {
                            errors.push(`${prefix}: itemName "${entry.itemName}" not found in equipment registry`);
                        }
                    }
                }

                // Validate gold if present
                if (entry.gold !== undefined) {
                    if (typeof entry.gold !== 'number' || entry.gold < 0) {
                        errors.push(`${prefix}: gold must be a non-negative number`);
                    }
                }

                // Validate quantity if present
                if (entry.quantity !== undefined) {
                    if (typeof entry.quantity !== 'number' || entry.quantity < 1 || !Number.isInteger(entry.quantity)) {
                        errors.push(`${prefix}: quantity must be a positive integer`);
                    }
                }
            }

            // Warn if pool weights don't sum to 100
            if (drop.pool.length > 0 && Math.abs(totalWeight - 100) > 0.001) {
                errors.push(`boxContents.drops[${dropIndex}]: pool weights sum to ${totalWeight}, expected 100`);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate an equipment modification
     *
     * Modifications are applied to equipment at runtime for enchanting,
     * cursing, or upgrading items.
     *
     * @param modification - Modification to validate
     * @returns Validation result with any errors
     */
    static validateModification(modification: EquipmentModification): EquipmentValidationResult {
        const errors: string[] = [];

        // Validate required fields
        if (!modification.id || typeof modification.id !== 'string') {
            errors.push('Modification must have a valid id');
        }

        if (!modification.name || typeof modification.name !== 'string') {
            errors.push('Modification must have a valid name');
        }

        if (!modification.appliedAt || typeof modification.appliedAt !== 'string') {
            errors.push('Modification must have a valid appliedAt timestamp');
        }

        if (!modification.source || typeof modification.source !== 'string') {
            errors.push('Modification must have a valid source');
        }

        // Validate properties
        if (!modification.properties || !Array.isArray(modification.properties)) {
            errors.push('Modification must have a properties array');
        } else {
            for (let i = 0; i < modification.properties.length; i++) {
                const propValidation = this.validateProperty(modification.properties[i]);
                if (!propValidation.valid) {
                    errors.push(
                        `Modification properties[${i}]: ${propValidation.errors?.join(', ')}`
                    );
                }
            }
        }

        // Validate addsFeatures if present
        if (modification.addsFeatures) {
            if (!Array.isArray(modification.addsFeatures)) {
                errors.push('Modification addsFeatures must be an array');
            } else {
                for (let i = 0; i < modification.addsFeatures.length; i++) {
                    const featureValidation = this.validateFeatureReference(
                        modification.addsFeatures[i],
                        i
                    );
                    if (!featureValidation.valid) {
                        errors.push(
                            `Modification addsFeatures[${i}]: ${featureValidation.errors?.join(', ')}`
                        );
                    }
                }
            }
        }

        // Validate addsSkills if present
        if (modification.addsSkills) {
            if (!Array.isArray(modification.addsSkills)) {
                errors.push('Modification addsSkills must be an array');
            } else {
                for (let i = 0; i < modification.addsSkills.length; i++) {
                    const skill = modification.addsSkills[i];
                    const skillValidation = this.validateSkillReference(skill.skillId, i);
                    if (!skillValidation.valid) {
                        errors.push(...(skillValidation.errors || []).map(e => `Modification ${e}`));
                    }
                    if (skill.level && !VALID_PROFICIENCY_LEVEL.includes(skill.level)) {
                        errors.push(`Modification addsSkills[${i}]: proficiency level must be 'proficient' or 'expertise'`);
                    }
                }
            }
        }

        // Validate addsSpells if present
        if (modification.addsSpells) {
            if (!Array.isArray(modification.addsSpells)) {
                errors.push('Modification addsSpells must be an array');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate an equipment mini-feature
     *
     * Mini-features are inline feature definitions for equipment-specific abilities.
     *
     * @param miniFeature - Mini-feature to validate
     * @returns Validation result with any errors
     */
    static validateMiniFeature(miniFeature: EquipmentMiniFeature): EquipmentValidationResult {
        const errors: string[] = [];

        if (!miniFeature.id || typeof miniFeature.id !== 'string') {
            errors.push('Mini-feature must have a valid id');
        }

        if (!miniFeature.name || typeof miniFeature.name !== 'string') {
            errors.push('Mini-feature must have a valid name');
        }

        if (!miniFeature.description || typeof miniFeature.description !== 'string') {
            errors.push('Mini-feature must have a valid description');
        }

        if (!miniFeature.effects || !Array.isArray(miniFeature.effects)) {
            errors.push('Mini-feature must have an effects array');
        } else {
            for (let i = 0; i < miniFeature.effects.length; i++) {
                const effectValidation = this.validateProperty(miniFeature.effects[i]);
                if (!effectValidation.valid) {
                    errors.push(
                        `Mini-feature effects[${i}]: ${effectValidation.errors?.join(', ')}`
                    );
                }
            }
        }

        if (miniFeature.source !== 'equipment_inline') {
            errors.push('Mini-feature must have source: "equipment_inline"');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate AC bonus value
     *
     * @param acBonus - AC bonus to validate
     * @returns Validation result with any errors
     */
    static validateACBonus(acBonus: number): EquipmentValidationResult {
        const errors: string[] = [];

        if (typeof acBonus !== 'number') {
            errors.push('AC bonus must be a number');
        } else if (acBonus < 0) {
            errors.push('AC bonus cannot be negative');
        } else if (!Number.isFinite(acBonus)) {
            errors.push('AC bonus must be a finite number');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate weapon properties array
     *
     * @param weaponProperties - Weapon properties to validate
     * @returns Validation result with any errors
     */
    static validateWeaponProperties(weaponProperties: string[]): EquipmentValidationResult {
        const errors: string[] = [];

        if (!Array.isArray(weaponProperties)) {
            errors.push('Weapon properties must be an array');
            return {
                valid: false,
                errors
            };
        }

        // Common weapon properties for reference
        const knownProperties = [
            'finesse', 'versatile', 'two-handed', 'light', 'heavy',
            'reach', 'thrown', 'ammunition', 'loading', 'range',
            'unarmed', 'monk'
        ];

        for (let i = 0; i < weaponProperties.length; i++) {
            const prop = weaponProperties[i];
            if (typeof prop !== 'string') {
                errors.push(`Weapon property at index ${i} must be a string`);
                continue; // Skip remaining checks for non-string properties
            }
            // Check for range format (e.g., "range_20_60")
            if (prop.startsWith('range_')) {
                if (!RANGE_FORMAT_REGEX.test(prop)) {
                    errors.push(
                        `Weapon property "${prop}" at index ${i} must be in format "range_MIN_MAX" (e.g., "range_20_60")`
                    );
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}
