/**
 * Test Helper Functions for Registration
 *
 * These helper functions simplify test setup by providing a single function
 * that calls ExtensionManager.register(). Cache invalidation is now automatic,
 * handled by ExtensionManager based on the category being registered.
 */

import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { SpellRegistry } from '../../src/core/spells/SpellRegistry.js';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import type { CustomSkill } from '../../src/core/skills/SkillTypes.js';
import type { Spell } from '../../src/utils/constants.js';
import type { ClassFeature, RacialTrait } from '../../src/core/features/FeatureTypes.js';

/**
 * Register a test skill via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param skill - The skill to register
 * @param options - Optional registration options for ExtensionManager
 * @throws {Error} If a skill with the same ID already exists
 *
 * @example
 * ```ts
 * registerTestSkill({
 *     id: 'dragon_lore',
 *     name: 'Dragon Lore',
 *     ability: 'INT',
 *     description: 'Knowledge of dragons',
 *     source: 'custom'
 * });
 * ```
 */
export function registerTestSkill(skill: CustomSkill, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const skillRegistry = SkillRegistry.getInstance();

    // Check for duplicate ID to maintain test behavior from old SkillRegistry.registerSkill()
    const existing = skillRegistry.getSkill(skill.id);
    if (existing) {
        throw new Error(`Skill with ID "${skill.id}" already exists`);
    }

    extensionManager.register('skills', [skill], options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}

/**
 * Register multiple test skills via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param skills - Array of skills to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestSkills(skills: CustomSkill[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();

    extensionManager.register('skills', skills, options);
}

/**
 * Register a test spell via ExtensionManager and invalidate cache
 *
 * @param spell - The spell to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestSpell(spell: Spell, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const spellRegistry = SpellRegistry.getInstance();

    extensionManager.register('spells', [spell], options);
    spellRegistry.invalidateCache();
}

/**
 * Register multiple test spells via ExtensionManager and invalidate cache
 *
 * @param spells - Array of spells to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestSpells(spells: Spell[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const spellRegistry = SpellRegistry.getInstance();

    extensionManager.register('spells', spells, options);
    spellRegistry.invalidateCache();
}

/**
 * Register a test class feature via ExtensionManager and invalidate cache
 *
 * @param feature - The class feature to register
 * @param options - Optional registration options for ExtensionManager
 * @throws {Error} If a feature with the same ID already exists
 */
export function registerTestClassFeature(feature: ClassFeature, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();

    // Check for duplicate ID to maintain test behavior from old FeatureRegistry.registerClassFeature()
    const existing = featureRegistry.getClassFeatureById(feature.id);
    if (existing) {
        throw new Error(`Class feature with ID "${feature.id}" already exists`);
    }

    extensionManager.register('classFeatures', [feature], options);
    featureRegistry.invalidateCache();
}

/**
 * Register multiple test class features via ExtensionManager and invalidate cache
 *
 * @param features - Array of class features to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestClassFeatures(features: ClassFeature[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();

    extensionManager.register('classFeatures', features, options);
    featureRegistry.invalidateCache();
}

/**
 * Register a test racial trait via ExtensionManager and invalidate cache
 *
 * @param trait - The racial trait to register
 * @param options - Optional registration options for ExtensionManager
 * @throws {Error} If a trait with the same ID already exists
 */
export function registerTestRacialTrait(trait: RacialTrait, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();

    // Check for duplicate ID to maintain test behavior from old FeatureRegistry.registerRacialTrait()
    const existing = featureRegistry.getRacialTraitById(trait.id);
    if (existing) {
        throw new Error(`Racial trait with ID "${trait.id}" already exists`);
    }

    extensionManager.register('racialTraits', [trait], options);
    featureRegistry.invalidateCache();
}

/**
 * Register multiple test racial traits via ExtensionManager and invalidate cache
 *
 * @param traits - Array of racial traits to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestRacialTraits(traits: RacialTrait[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();

    extensionManager.register('racialTraits', traits, options);
    featureRegistry.invalidateCache();
}
