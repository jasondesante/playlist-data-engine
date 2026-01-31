/**
 * Feature Effect Applier
 *
 * Applies feature and trait effects to characters during generation.
 * Handles stat bonuses, skill proficiencies, passive modifiers, and ability unlocks.
 *
 * Part of Phase 11.4: Apply feature effects to character.
 */

import type { ClassFeature, RacialTrait, FeatureEffect } from './FeatureTypes.js';
import type { CharacterSheet, Ability, ProficiencyLevel } from '../types/Character.js';
import type { EffectApplicationResult } from '../types/Equipment.js';

/**
 * FeatureEffectApplier - Applies feature effects to character sheets
 *
 * This class handles the application of all feature effects during
 * character generation and level-ups.
 */
export class FeatureEffectApplier {
    /**
     * Apply all effects from a class feature to a character
     *
     * @param character - The character to apply effects to
     * @param feature - The feature whose effects should be applied
     * @returns Result of the effect application
     */
    static applyFeatureEffects(
        character: CharacterSheet,
        feature: ClassFeature | RacialTrait
    ): EffectApplicationResult {
        const result: EffectApplicationResult = {
            applied: false,
            count: 0,
            errors: []
        };

        if (!feature.effects || feature.effects.length === 0) {
            return result;
        }

        for (const effect of feature.effects) {
            try {
                this.applySingleEffect(character, effect, feature.id);
                result.applied = true;
                result.count++;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                result.errors.push(`Failed to apply effect from ${feature.id}: ${errorMessage}`);
            }
        }

        return result;
    }

    /**
     * Apply multiple features' effects to a character
     *
     * @param character - The character to apply effects to
     * @param features - Array of features to apply
     * @returns Combined result of all effect applications
     */
    static applyMultipleEffects(
        character: CharacterSheet,
        features: (ClassFeature | RacialTrait)[]
    ): EffectApplicationResult {
        const combinedResult: EffectApplicationResult = {
            applied: false,
            count: 0,
            errors: []
        };

        for (const feature of features) {
            const result = this.applyFeatureEffects(character, feature);
            combinedResult.applied = combinedResult.applied || result.applied;
            combinedResult.count += result.count;
            combinedResult.errors.push(...result.errors);
        }

        return combinedResult;
    }

    /**
     * Apply a single effect to a character
     *
     * @param character - The character to modify
     * @param effect - The effect to apply
     * @param sourceId - ID of the feature granting this effect (for tracking)
     */
    private static applySingleEffect(
        character: CharacterSheet,
        effect: FeatureEffect,
        _sourceId: string
    ): void {
        switch (effect.type) {
            case 'stat_bonus':
                this.applyStatBonus(character, effect);
                break;
            case 'skill_proficiency':
                this.applySkillProficiency(character, effect);
                break;
            case 'ability_unlock':
                this.applyAbilityUnlock(character, effect);
                break;
            case 'passive_modifier':
                this.applyPassiveModifier(character, effect);
                break;
            case 'resource_grant':
                this.applyResourceGrant(character, effect);
                break;
            case 'spell_slot_bonus':
                this.applySpellSlotBonus(character, effect);
                break;
            default:
                throw new Error(`Unknown effect type: ${(effect as { type: string }).type}`);
        }
    }

    /**
     * Apply a stat bonus effect
     *
     * @param character - The character to modify
     * @param effect - The stat bonus effect
     */
    private static applyStatBonus(
        character: CharacterSheet,
        effect: FeatureEffect
    ): void {
        const target = effect.target;
        const value = effect.value as number;

        // Handle ability score bonuses (STR, DEX, CON, INT, WIS, CHA)
        if (this.isAbility(target)) {
            character.ability_scores[target] += value;
            // Recalculate modifier for the affected ability
            const newScore = character.ability_scores[target];
            character.ability_modifiers[target] = Math.floor((newScore - 10) / 2);
            return;
        }

        // Handle custom stat bonuses (e.g., 'melee_damage', 'STR_max', 'speed')
        // For now, we store these in a custom properties object
        if (!character.feature_effects) {
            character.feature_effects = [];
        }
        character.feature_effects.push({
            type: 'stat_bonus',
            target: effect.target,
            value: effect.value,
            condition: effect.condition
        });
    }

    /**
     * Apply a skill proficiency effect
     *
     * @param character - The character to modify
     * @param effect - The skill proficiency effect
     */
    private static applySkillProficiency(
        character: CharacterSheet,
        effect: FeatureEffect
    ): void {
        const skillId = effect.target.toLowerCase();
        const proficiency = effect.value as ProficiencyLevel;

        // Add or update skill proficiency
        if (!character.skills[skillId] || proficiency === 'expertise') {
            character.skills[skillId] = proficiency;
        }
    }

    /**
     * Apply an ability unlock effect
     *
     * @param character - The character to modify
     * @param effect - The ability unlock effect
     */
    private static applyAbilityUnlock(
        character: CharacterSheet,
        effect: FeatureEffect
    ): void {
        // Store ability unlocks (e.g., darkvision, flight)
        if (!character.feature_effects) {
            character.feature_effects = [];
        }
        character.feature_effects.push({
            type: 'ability_unlock',
            target: effect.target,
            value: effect.value,
            condition: effect.condition
        });
    }

    /**
     * Apply a passive modifier effect
     *
     * @param character - The character to modify
     * @param effect - The passive modifier effect
     */
    private static applyPassiveModifier(
        character: CharacterSheet,
        effect: FeatureEffect
    ): void {
        const target = effect.target;
        const value = effect.value as number;

        // Handle speed modifiers directly
        if (target === 'speed') {
            character.speed += value;
            return;
        }

        // Handle max stat modifiers (e.g., 'STR_max', 'CON_max')
        // These are stored for reference during stat increases
        if (target.endsWith('_max')) {
            if (!character.feature_effects) {
                character.feature_effects = [];
            }
            character.feature_effects.push({
                type: 'passive_modifier',
                target: effect.target,
                value: effect.value,
                condition: effect.condition
            });
            return;
        }

        // Store other passive modifiers
        if (!character.feature_effects) {
            character.feature_effects = [];
        }
        character.feature_effects.push({
            type: 'passive_modifier',
            target: effect.target,
            value: effect.value,
            condition: effect.condition
        });
    }

    /**
     * Apply a resource grant effect
     *
     * @param character - The character to modify
     * @param effect - The resource grant effect
     */
    private static applyResourceGrant(
        character: CharacterSheet,
        effect: FeatureEffect
    ): void {
        // Store resource grants (e.g., rage counts, ki points)
        // These would typically initialize a resource pool
        if (!character.feature_effects) {
            character.feature_effects = [];
        }
        character.feature_effects.push({
            type: 'resource_grant',
            target: effect.target,
            value: effect.value,
            condition: effect.condition
        });
    }

    /**
     * Apply a spell slot bonus effect
     *
     * @param character - The character to modify
     * @param effect - The spell slot bonus effect
     */
    private static applySpellSlotBonus(
        character: CharacterSheet,
        effect: FeatureEffect
    ): void {
        // Store spell slot bonuses
        if (!character.feature_effects) {
            character.feature_effects = [];
        }
        character.feature_effects.push({
            type: 'spell_slot_bonus',
            target: effect.target,
            value: effect.value,
            condition: effect.condition
        });
    }

    /**
     * Check if a string is a valid ability score
     *
     * @param ability - The ability string to check
     * @returns True if it's a valid ability
     */
    private static isAbility(ability: string): ability is Ability {
        return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(ability);
    }
}

/**
 * CharacterEffect interface for storing applied effects
 *
 * This represents a single effect that has been applied to a character
 * and is stored on their sheet for reference.
 */
export interface CharacterEffect {
    /** Type of effect that was applied */
    type: string;
    /** Target stat, skill, or ability */
    target: string;
    /** Value that was applied */
    value: number | string | boolean;
    /** Optional condition for the effect */
    condition?: string;
}
