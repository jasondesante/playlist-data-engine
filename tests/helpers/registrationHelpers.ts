/**
 * Test Helper Functions for Registration
 *
 * These helper functions simplify test setup by providing a single function
 * that calls ExtensionManager.register(). Cache invalidation is now automatic,
 * handled by ExtensionManager based on the category being registered.
 */

import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SkillQuery } from '../../src/core/skills/SkillQuery.js';
import { FeatureQuery } from '../../src/core/features/FeatureQuery.js';
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
    const skillQuery = SkillQuery.getInstance();

    // Check for duplicate ID to maintain test behavior from old SkillQuery.registerSkill()
    const existing = skillQuery.getSkill(skill.id);
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
 * Register a test spell via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param spell - The spell to register
 * @param options - Optional registration options for ExtensionManager
 *
 * @example
 * ```ts
 * registerTestSpell({
 *     id: 'fireball',
 *     name: 'Fireball',
 *     level: 3,
 *     school: 'Evocation'
 * });
 * ```
 */
export function registerTestSpell(spell: Spell, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();

    extensionManager.register('spells', [spell], options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}

/**
 * Register multiple test spells via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param spells - Array of spells to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestSpells(spells: Spell[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();

    extensionManager.register('spells', spells, options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}

/**
 * Register a test class feature via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param feature - The class feature to register
 * @param options - Optional registration options for ExtensionManager
 * @throws {Error} If a feature with the same ID already exists
 */
export function registerTestClassFeature(feature: ClassFeature, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const featureQuery = FeatureQuery.getInstance();

    // Check for duplicate ID to maintain test behavior from old FeatureQuery.registerClassFeature()
    const existing = featureQuery.getClassFeatureById(feature.id);
    if (existing) {
        throw new Error(`Class feature with ID "${feature.id}" already exists`);
    }

    extensionManager.register('classFeatures', [feature], options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}

/**
 * Register multiple test class features via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param features - Array of class features to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestClassFeatures(features: ClassFeature[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();

    extensionManager.register('classFeatures', features, options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}

/**
 * Register a test racial trait via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param trait - The racial trait to register
 * @param options - Optional registration options for ExtensionManager
 * @throws {Error} If a trait with the same ID already exists
 */
export function registerTestRacialTrait(trait: RacialTrait, options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();
    const featureQuery = FeatureQuery.getInstance();

    // Check for duplicate ID to maintain test behavior from old FeatureQuery.registerRacialTrait()
    const existing = featureQuery.getRacialTraitById(trait.id);
    if (existing) {
        throw new Error(`Racial trait with ID "${trait.id}" already exists`);
    }

    extensionManager.register('racialTraits', [trait], options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}

/**
 * Register multiple test racial traits via ExtensionManager
 *
 * Note: Cache invalidation is automatic after registration.
 *
 * @param traits - Array of racial traits to register
 * @param options - Optional registration options for ExtensionManager
 */
export function registerTestRacialTraits(traits: RacialTrait[], options?: { validate?: boolean }): void {
    const extensionManager = ExtensionManager.getInstance();

    extensionManager.register('racialTraits', traits, options);
    // Note: Cache invalidation is automatic after ExtensionManager.register()
}
