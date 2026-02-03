/**
 * Equipment Effect Applier
 *
 * Applies and removes equipment effects to/from characters during equip/unequip.
 * Handles stat bonuses, skill proficiencies, ability unlocks, passive modifiers,
 * equipment-granted features, skills, and spells.
 * Integrates with FeatureEffectApplier.
 */

import type { CharacterSheet, ProficiencyLevel } from '../types/Character.js';
import type {
    EnhancedEquipment,
    EquipmentProperty,
    EquipmentCondition,
    EquipmentFeature,
    EquipmentSkill,
    EffectApplicationResult
} from '../types/Equipment.js';
import { FeatureRegistry } from '../features/FeatureRegistry.js';
import type { ClassFeature, RacialTrait } from '../features/FeatureTypes.js';
import { isAbility, applyAbilityScoreBonus, applySkillProficiencyWithHierarchy } from '../utils/EffectApplierUtils.js';

/**
 * EquipmentEffectApplier - Applies and removes equipment effects
 *
 * This class handles:
 * - Applying equipment properties when equipping
 * - Removing equipment properties when unequipping
 * - Managing equipment-granted features, skills, and spells
 * - Tracking equipment effects separately from feature effects for proper removal
 *
 * STACKING: All equipment effects stack by default. Multiple items with the same
 * effect will have their effects combine (e.g., two +1 STR items = +2 STR total).
 */
export class EquipmentEffectApplier {
    /**
     * Apply all effects from equipping an item
     *
     * @param character - The character to apply effects to
     * @param equipment - The equipment being equipped
     * @param instanceId - Optional instance ID for per-instance tracking
     * @returns Result of the effect application
     */
    static equipItem(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId?: string
    ): EffectApplicationResult {
        const result: EffectApplicationResult = {
            applied: false,
            count: 0,
            errors: []
        };

        // Initialize equipment_effects array if needed
        if (!character.equipment_effects) {
            character.equipment_effects = [];
        }

        // Check if this equipment is already equipped
        const existing = this.findEquipmentEffect(character, equipment.name, instanceId);
        if (existing) {
            result.errors.push(`Equipment "${equipment.name}" is already equipped`);
            return result;
        }

        // Validate stat requirements before applying any effects
        if (equipment.properties) {
            const requirementErrors = this.validateRequirements(character, equipment, equipment.properties);
            if (requirementErrors.length > 0) {
                result.errors.push(...requirementErrors);
                return result; // Don't equip if requirements aren't met
            }
        }

        // Create new equipment effect entry
        const equipmentEffect: {
            source: string;
            instanceId?: string;
            effects: EquipmentProperty[];
            features: EquipmentFeature[];
            skills: EquipmentSkill[];
            spells?: Array<{
                spellId: string;
                level?: number;
                uses?: number;
                recharge?: string;
            }>;
        } = {
            source: equipment.name,
            instanceId,
            effects: equipment.properties ? [...equipment.properties] : [],
            features: [],
            skills: [],
            spells: []
        };

        // Apply properties
        if (equipment.properties) {
            for (const property of equipment.properties) {
                try {
                    this.applyProperty(character, property, equipment.name);
                    result.count++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.errors.push(`Failed to apply property from ${equipment.name}: ${errorMessage}`);
                }
            }
        }

        // Apply granted features
        if (equipment.grantsFeatures) {
            this.applyEquipmentFeatures(character, equipment, instanceId, equipmentEffect.features);
            result.count += equipmentEffect.features.length;
        }

        // Apply granted skills
        if (equipment.grantsSkills) {
            this.applyEquipmentSkills(character, equipment, instanceId, equipmentEffect.skills);
            result.count += equipmentEffect.skills.length;
        }

        // Apply granted spells
        if (equipment.grantsSpells) {
            equipmentEffect.spells = equipment.grantsSpells.map(spell => ({
                spellId: spell.spellId,
                level: spell.level,
                uses: spell.uses,
                recharge: spell.recharge
            }));
            this.addSpellsToCharacter(character, equipment.grantsSpells);
            result.count += equipmentEffect.spells.length;
        }

        // Store equipment effect entry
        character.equipment_effects.push(equipmentEffect);
        result.applied = result.count > 0;

        return result;
    }

    /**
     * Remove all effects from unequipping an item
     *
     * @param character - The character to remove effects from
     * @param equipmentName - Name of the equipment being unequipped
     * @param instanceId - Optional instance ID for per-instance tracking
     * @returns Result of the effect removal
     */
    static unequipItem(
        character: CharacterSheet,
        equipmentName: string,
        instanceId?: string
    ): EffectApplicationResult {
        const result: EffectApplicationResult = {
            applied: false,
            count: 0,
            errors: []
        };

        if (!character.equipment_effects) {
            result.errors.push(`No equipment effects found on character`);
            return result;
        }

        // Find the equipment effect entry
        const effectIndex = character.equipment_effects.findIndex(
            e => e.source === equipmentName && e.instanceId === instanceId
        );

        if (effectIndex === -1) {
            result.errors.push(`Equipment "${equipmentName}" effects not found`);
            return result;
        }

        const effectEntry = character.equipment_effects[effectIndex];

        // Remove properties
        if (effectEntry.effects.length > 0) {
            this.removeProperties(character, effectEntry.effects);
            result.count += effectEntry.effects.length;
        }

        // Remove granted features
        if (effectEntry.features.length > 0) {
            this.removeEquipmentFeatures(character, equipmentName, instanceId);
            result.count += effectEntry.features.length;
        }

        // Remove granted skills
        if (effectEntry.skills.length > 0) {
            this.removeEquipmentSkills(character, effectEntry.skills);
            result.count += effectEntry.skills.length;
        }

        // Remove granted spells (we don't track equipment spells separately on character,
        // so we just remove them from the tracking array)
        if (effectEntry.spells && effectEntry.spells.length > 0) {
            this.removeSpellsFromCharacter(character, effectEntry.spells);
            result.count += effectEntry.spells.length;
        }

        // Remove the equipment effect entry
        character.equipment_effects.splice(effectIndex, 1);
        result.applied = result.count > 0;

        return result;
    }

    /**
     * Re-apply all equipment effects (for updates/level-ups)
     *
     * @param character - The character to reapply effects to
     * @returns Result of the effect reapplication
     */
    static reapplyEquipmentEffects(
        character: CharacterSheet
    ): EffectApplicationResult {
        const result: EffectApplicationResult = {
            applied: false,
            count: 0,
            errors: []
        };

        if (!character.equipment_effects || character.equipment_effects.length === 0) {
            return result;
        }

        // Store current equipment effects
        const currentEffects = [...character.equipment_effects];

        // Clear equipment effects array
        character.equipment_effects = [];

        // Re-apply each equipment effect
        for (const effectEntry of currentEffects) {
            // Find the equipment data (this would need ExtensionManager access)
            // For now, we'll manually reconstruct the effects
            const equipmentEffect: {
                source: string;
                instanceId?: string;
                effects: EquipmentProperty[];
                features: EquipmentFeature[];
                skills: EquipmentSkill[];
                spells?: Array<{
                    spellId: string;
                    level?: number;
                    uses?: number;
                    recharge?: string;
                }>;
            } = {
                source: effectEntry.source,
                instanceId: effectEntry.instanceId,
                effects: [...effectEntry.effects],
                features: [...effectEntry.features],
                skills: [...effectEntry.skills],
                spells: effectEntry.spells ? [...effectEntry.spells] : []
            };

            // Re-apply properties
            for (const property of effectEntry.effects) {
                try {
                    this.applyProperty(character, property, effectEntry.source);
                    result.count++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.errors.push(`Failed to reapply property from ${effectEntry.source}: ${errorMessage}`);
                }
            }

            // Re-apply features
            for (const feature of effectEntry.features) {
                this.addFeatureToCharacter(character, feature);
                result.count++;
            }

            // Re-apply skills
            for (const skill of effectEntry.skills) {
                this.addSkillToCharacter(character, skill);
                result.count++;
            }

            // Re-apply spells
            if (effectEntry.spells) {
                this.addSpellsToCharacter(character, effectEntry.spells);
                result.count += effectEntry.spells.length;
            }

            // Re-add the equipment effect entry
            character.equipment_effects.push(equipmentEffect);
        }

        result.applied = result.count > 0;
        return result;
    }

    /**
     * Get all active equipment effects
     *
     * @param character - The character to get effects from
     * @returns Array of all active equipment properties
     */
    static getActiveEffects(
        character: CharacterSheet
    ): EquipmentProperty[] {
        if (!character.equipment_effects) {
            return [];
        }

        const allEffects: EquipmentProperty[] = [];
        for (const entry of character.equipment_effects) {
            allEffects.push(...entry.effects);
        }
        return allEffects;
    }

    /**
     * Apply a single equipment property
     *
     * For property types that match FeatureEffect types (stat_bonus, skill_proficiency,
     * ability_unlock, passive_modifier), we apply them using dedicated methods for consistency.
     */
    private static applyProperty(
        character: CharacterSheet,
        property: EquipmentProperty,
        sourceName: string
    ): void {
        // Check if property condition is met
        if (property.condition && !this.checkCondition(property.condition, character)) {
            return; // Condition not met, don't apply
        }

        switch (property.type) {
            case 'stat_bonus':
            case 'skill_proficiency':
            case 'ability_unlock':
            case 'passive_modifier':
                // These property types have dedicated apply methods
                this.applyPropertyViaFeatureEffectApplier(character, property);
                break;
            case 'special_property':
                // Special properties are tracked but don't modify stats directly
                // They're stored for game logic to reference
                this.trackSpecialProperty(character, property, sourceName);
                break;
            case 'damage_bonus':
                this.trackDamageBonus(character, property, sourceName);
                break;
            case 'stat_requirement':
                // Requirements are validated before equipping, tracked here for reference
                this.trackStatRequirement(character, property, sourceName);
                break;
            default:
                throw new Error(`Unknown property type: ${(property as { type: string }).type}`);
        }
    }

    /**
     * Apply an equipment property using dedicated methods.
     *
     * This ensures equipment effects that match feature effect types
     * (stat_bonus, skill_proficiency, ability_unlock, passive_modifier)
     * are applied consistently.
     */
    private static applyPropertyViaFeatureEffectApplier(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        // Apply the effect using FeatureEffectApplier's private methods
        // We need to access the same logic, so we replicate the key parts
        switch (property.type) {
            case 'stat_bonus':
                this.applyStatBonus(character, property);
                break;
            case 'skill_proficiency':
                this.applySkillProficiency(character, property);
                break;
            case 'ability_unlock':
                this.applyAbilityUnlock(character, property);
                break;
            case 'passive_modifier':
                this.applyPassiveModifier(character, property);
                break;
        }
    }

    /**
     * Apply a stat bonus property
     */
    private static applyStatBonus(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        const target = property.target;
        const value = property.value as number;

        // Handle ability score bonuses (STR, DEX, CON, INT, WIS, CHA)
        if (isAbility(target)) {
            applyAbilityScoreBonus(character, target, value);
            return;
        }

        // Custom stat bonuses are tracked in equipment_effects
        // (already stored when equipment is equipped)
    }

    /**
     * Apply a skill proficiency property
     *
     * Uses shared utility with proficiency hierarchy (none < proficient < expertise)
     */
    private static applySkillProficiency(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        const skillId = property.target.toLowerCase();
        const proficiency = property.value as ProficiencyLevel;

        applySkillProficiencyWithHierarchy(character, skillId, proficiency);
    }

    /**
     * Apply an ability unlock property
     */
    private static applyAbilityUnlock(
        _character: CharacterSheet,
        _property: EquipmentProperty
    ): void {
        // Ability unlocks are stored for game logic to reference
        // They're tracked in the equipment_effects array
        // Suppress unused warning: parameters kept for future use
        void _character;
        void _property;
    }

    /**
     * Apply a passive modifier property
     */
    private static applyPassiveModifier(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        const target = property.target;
        const value = property.value as number;

        // Handle speed modifiers directly
        if (target === 'speed') {
            character.speed += value;
            return;
        }

        // Handle AC modifiers directly
        if (target === 'ac' || target === 'armor_class') {
            character.armor_class += value;
            return;
        }

        // Handle max HP modifiers
        if (target === 'max_hp' || target === 'hp_max') {
            character.hp.max += value;
            character.hp.current += value; // Also increase current HP
            return;
        }

        // Other passive modifiers are tracked in equipment_effects
    }

    /**
     * Track a special property for game logic reference
     */
    private static trackSpecialProperty(
        _character: CharacterSheet,
        _property: EquipmentProperty,
        _sourceName: string
    ): void {
        // Special properties are stored in equipment_effects for game logic
        // No direct character modification needed
        // Suppress unused warning: parameters kept for future use
        void _character;
        void _property;
        void _sourceName;
    }

    /**
     * Track a damage bonus for game logic reference
     */
    private static trackDamageBonus(
        _character: CharacterSheet,
        _property: EquipmentProperty,
        _sourceName: string
    ): void {
        // Damage bonuses are stored in equipment_effects for combat system
        // No direct character modification needed
        // Suppress unused warning: parameters kept for future use
        void _character;
        void _property;
        void _sourceName;
    }

    /**
     * Remove equipment properties from character
     */
    private static removeProperties(
        character: CharacterSheet,
        properties: EquipmentProperty[]
    ): void {
        // Remove in reverse order to handle dependencies
        for (let i = properties.length - 1; i >= 0; i--) {
            const property = properties[i];

            switch (property.type) {
                case 'stat_bonus':
                    this.removeStatBonus(character, property);
                    break;
                case 'skill_proficiency':
                    this.removeSkillProficiency(character, property);
                    break;
                case 'passive_modifier':
                    this.removePassiveModifier(character, property);
                    break;
                // Other property types don't need removal logic
                // as they're just tracked references
            }
        }
    }

    /**
     * Remove a stat bonus
     */
    private static removeStatBonus(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        const target = property.target;
        const value = property.value as number;

        if (isAbility(target)) {
            applyAbilityScoreBonus(character, target, -value);
        }
    }

    /**
     * Remove a skill proficiency
     */
    private static removeSkillProficiency(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        const skillId = property.target.toLowerCase();
        // Reset to none (game logic may need to check other sources)
        character.skills[skillId] = 'none';
    }

    /**
     * Remove a passive modifier
     */
    private static removePassiveModifier(
        character: CharacterSheet,
        property: EquipmentProperty
    ): void {
        const target = property.target;
        const value = property.value as number;

        if (target === 'speed') {
            character.speed -= value;
        } else if (target === 'ac' || target === 'armor_class') {
            character.armor_class -= value;
        } else if (target === 'max_hp' || target === 'hp_max') {
            character.hp.max -= value;
            character.hp.current = Math.min(character.hp.current, character.hp.max);
        }
    }

    /**
     * Apply equipment-granted features
     */
    private static applyEquipmentFeatures(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId: string | undefined,
        featureList: EquipmentFeature[]
    ): void {
        if (!equipment.grantsFeatures) return;

        for (const featureRef of equipment.grantsFeatures) {
            if (typeof featureRef === 'string') {
                // Reference to registry feature
                // Try both class features and racial traits
                const registry = FeatureRegistry.getInstance();
                const classFeature = registry.getClassFeatureById(featureRef);
                const racialTrait = !classFeature ? registry.getRacialTraitById(featureRef) : undefined;
                const feature: ClassFeature | RacialTrait | undefined = classFeature || racialTrait;
                if (feature) {
                    const equipmentFeature: EquipmentFeature = {
                        featureId: featureRef,
                        source: 'equipment',
                        equipmentName: equipment.name,
                        instanceId,
                        sourceType: equipment.source ?? 'default'
                    };
                    featureList.push(equipmentFeature);
                    this.addFeatureToCharacter(character, equipmentFeature);
                }
            } else {
                // Inline mini-feature
                const equipmentFeature: EquipmentFeature = {
                    featureId: featureRef.id,
                    source: 'equipment',
                    equipmentName: equipment.name,
                    instanceId,
                    sourceType: equipment.source ?? 'default'
                };
                featureList.push(equipmentFeature);
                this.addFeatureToCharacter(character, equipmentFeature);

                // Apply inline feature effects
                if (featureRef.effects) {
                    for (const effect of featureRef.effects) {
                        this.applyProperty(character, effect, equipment.name);
                    }
                }
            }
        }
    }

    /**
     * Apply equipment-granted skills
     */
    private static applyEquipmentSkills(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId: string | undefined,
        skillList: EquipmentSkill[]
    ): void {
        if (!equipment.grantsSkills) return;

        for (const skillGrant of equipment.grantsSkills) {
            const equipmentSkill: EquipmentSkill = {
                skillId: skillGrant.skillId,
                level: skillGrant.level,
                source: 'equipment',
                equipmentName: equipment.name,
                instanceId,
                sourceType: equipment.source ?? 'default'
            };
            skillList.push(equipmentSkill);
            this.addSkillToCharacter(character, equipmentSkill);
        }
    }

    /**
     * Add spells to character
     */
    private static addSpellsToCharacter(
        character: CharacterSheet,
        spells: Array<{ spellId: string; level?: number; uses?: number; recharge?: string }>
    ): void {
        if (!character.spells) {
            character.spells = {
                spell_slots: {},
                known_spells: [],
                cantrips: []
            };
        }

        for (const spell of spells) {
            if (spell.level === 0) {
                if (!character.spells.cantrips.includes(spell.spellId)) {
                    character.spells.cantrips.push(spell.spellId);
                }
            } else {
                if (!character.spells.known_spells.includes(spell.spellId)) {
                    character.spells.known_spells.push(spell.spellId);
                }
            }
        }
    }

    /**
     * Remove spells from character
     */
    private static removeSpellsFromCharacter(
        character: CharacterSheet,
        spells: Array<{ spellId: string; level?: number }>
    ): void {
        if (!character.spells) return;

        for (const spell of spells) {
            if (spell.level === 0) {
                const index = character.spells.cantrips.indexOf(spell.spellId);
                if (index > -1) {
                    character.spells.cantrips.splice(index, 1);
                }
            } else {
                const index = character.spells.known_spells.indexOf(spell.spellId);
                if (index > -1) {
                    character.spells.known_spells.splice(index, 1);
                }
            }
        }
    }

    /**
     * Add a feature to character's class features list
     */
    private static addFeatureToCharacter(
        character: CharacterSheet,
        equipmentFeature: EquipmentFeature
    ): void {
        // Check if feature already exists
        if (!character.class_features.includes(equipmentFeature.featureId)) {
            character.class_features.push(equipmentFeature.featureId);
        }
    }

    /**
     * Add a skill to character
     *
     * Uses shared utility with proficiency hierarchy (none < proficient < expertise)
     */
    private static addSkillToCharacter(
        character: CharacterSheet,
        equipmentSkill: EquipmentSkill
    ): void {
        const skillId = equipmentSkill.skillId.toLowerCase();

        applySkillProficiencyWithHierarchy(character, skillId, equipmentSkill.level);
    }

    /**
     * Remove equipment-granted features
     */
    private static removeEquipmentFeatures(
        character: CharacterSheet,
        equipmentName: string,
        instanceId: string | undefined
    ): void {
        if (!character.equipment_effects) return;

        // Find features from this equipment
        const featuresToRemove = character.equipment_effects
            .filter(e => e.source === equipmentName && e.instanceId === instanceId)
            .flatMap(e => e.features);

        for (const feature of featuresToRemove) {
            const index = character.class_features.indexOf(feature.featureId);
            if (index > -1) {
                character.class_features.splice(index, 1);
            }
        }
    }

    /**
     * Remove equipment-granted skills
     */
    private static removeEquipmentSkills(
        character: CharacterSheet,
        skillsToRemove: EquipmentSkill[]
    ): void {
        for (const skill of skillsToRemove) {
            const skillId = skill.skillId.toLowerCase();
            // Reset to none (game logic should check for other sources)
            character.skills[skillId] = 'none';
        }
    }

    /**
     * Check if a property condition is met
     */
    private static checkCondition(
        condition: EquipmentCondition,
        character: CharacterSheet
    ): boolean {
        switch (condition.type) {
            case 'while_equipped':
                return true; // Always true when equipped
            case 'on_hit':
            case 'on_damage_taken':
                return false; // These are trigger conditions, not passive
            case 'wielder_race':
                return character.race === condition.value;
            case 'wielder_class':
                return character.class === condition.value;
            case 'at_time_of_day':
                // Would need external time data - default to true for now
                return true;
            case 'vs_creature_type':
                // This is a combat condition, not passive
                return false;
            case 'custom':
                // Custom conditions are game-specific
                return true; // Default to true
            default:
                return true;
        }
    }

    /**
     * Find an equipment effect entry
     */
    private static findEquipmentEffect(
        character: CharacterSheet,
        equipmentName: string,
        instanceId: string | undefined
    ): { source: string; instanceId?: string } | undefined {
        if (!character.equipment_effects) return undefined;
        return character.equipment_effects.find(
            e => e.source === equipmentName && e.instanceId === instanceId
        );
    }

    /**
     * Validate stat requirements before equipping an item
     *
     * Checks all stat_requirement properties and returns errors for any
     * requirements that are not met. This is called BEFORE applying effects,
     * so items that don't meet requirements cannot be equipped.
     *
     * @param character - The character equipping the item
     * @param equipment - The equipment being equipped
     * @param properties - The properties to validate
     * @returns Array of error messages (empty if all requirements met)
     */
    private static validateRequirements(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        properties: EquipmentProperty[]
    ): string[] {
        const errors: string[] = [];

        for (const property of properties) {
            if (property.type === 'stat_requirement') {
                const requiredStat = property.target;
                const requiredValue = property.value as number;

                // Check if target is a valid ability
                if (isAbility(requiredStat)) {
                    const currentValue = character.ability_scores[requiredStat];
                    if (currentValue < requiredValue) {
                        errors.push(
                            `${equipment.name} requires ${requiredStat} ${requiredValue}, ` +
                            `but character has ${requiredStat} ${currentValue}`
                        );
                    }
                }
            }
        }

        return errors;
    }

    /**
     * Track a stat requirement for reference
     *
     * Stat requirements are validated before equipping, but we track them
     * in equipment_effects so game logic can reference them if needed.
     */
    private static trackStatRequirement(
        _character: CharacterSheet,
        _property: EquipmentProperty,
        _sourceName: string
    ): void {
        // Requirements are validated upfront, tracked for reference
        // No direct character modification needed
        // Suppress unused warning: parameters kept for future use
        void _character;
        void _property;
        void _sourceName;
    }
}
