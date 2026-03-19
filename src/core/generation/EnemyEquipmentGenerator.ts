/**
 * EnemyEquipmentGenerator - Generates equipment for enemies
 *
 * Provides equipment generation for enemy characters based on:
 * - Archetype (brute, archer, support)
 * - Rarity tier (common, uncommon, elite, boss)
 * - Deterministic seeded selection
 *
 * Equipment selection rules:
 * - Brute: Heavy weapons (greataxe, longsword), heavy armor (scale mail, chain mail)
 * - Archer: Ranged weapons (longbow, crossbow), light armor (leather), backup dagger
 * - Support: Quarterstaff or mace, light armor with shield option
 *
 * Higher rarity enemies receive better equipment from their archetype pool.
 *
 * @example
 * ```typescript
 * // Generate equipment for an elite brute
 * const equipment = EnemyEquipmentGenerator.generate({
 *   archetype: 'brute',
 *   rarity: 'elite',
 *   seed: 'elite-brute-equipment'
 * });
 * // Returns: { weapon: greataxe, armor: chain_mail, shield: shield }
 * ```
 */

import { SeededRNG } from '../../utils/random.js';
import type { EnemyArchetype, EnemyRarity, EquipmentConfig, EquipmentTemplate } from '../types/Enemy.js';
import {
    ENEMY_EQUIPMENT_TEMPLATES,
    getWeaponsByArchetypeAndRarity,
    getArmorByArchetypeAndRarity,
    getShieldsByArchetypeAndRarity,
    ENEMY_EQUIPMENT_MAPPING
} from '../../constants/EnemyEquipment.js';

/**
 * Enemy equipment generation options
 */
export interface EnemyEquipmentGenerationOptions {
    /** Enemy archetype for equipment selection */
    archetype: EnemyArchetype;

    /** Enemy rarity tier for equipment quality */
    rarity: EnemyRarity;

    /** Seed for deterministic selection */
    seed: string;

    /** Whether to include a shield (for applicable archetypes) */
    includeShield?: boolean;
}

/**
 * EnemyEquipmentGenerator - Static class for enemy equipment generation
 *
 * Generates equipment configurations for enemy characters.
 * All selection is deterministic based on the provided seed.
 */
export class EnemyEquipmentGenerator {
    /**
     * Weapon priority by archetype and rarity
     *
     * Defines preferred weapons for each archetype at different rarity tiers.
     * Higher priority weapons are selected first.
     */
    private static readonly WEAPON_PRIORITY: Record<EnemyArchetype, Record<EnemyRarity, string[]>> = {
        brute: {
            common: ['handaxe', 'brute-mace'],
            uncommon: ['longsword', 'brute-mace'],
            elite: ['greataxe', 'longsword'],
            boss: ['greataxe', 'longsword']
        },
        archer: {
            common: ['light-crossbow', 'dagger'],
            uncommon: ['longbow', 'shortsword'],
            elite: ['longbow', 'shortsword'],
            boss: ['longbow', 'shortsword']
        },
        support: {
            common: ['support-dagger', 'quarterstaff'],
            uncommon: ['quarterstaff', 'support-mace'],
            elite: ['quarterstaff', 'support-mace'],
            boss: ['quarterstaff', 'support-mace']
        }
    };

    /**
     * Armor priority by archetype and rarity
     *
     * Defines preferred armor for each archetype at different rarity tiers.
     */
    private static readonly ARMOR_PRIORITY: Record<EnemyArchetype, Record<EnemyRarity, string[]>> = {
        brute: {
            common: ['leather-armor'],
            uncommon: ['scale-mail', 'leather-armor'],
            elite: ['chain-mail', 'scale-mail'],
            boss: ['plate-armor', 'chain-mail']
        },
        archer: {
            common: ['leather-armor'],
            uncommon: ['leather-armor'],
            elite: ['leather-armor'],
            boss: ['leather-armor']
        },
        support: {
            common: ['leather-armor'],
            uncommon: ['scale-mail', 'leather-armor'],
            elite: ['chain-mail', 'scale-mail'],
            boss: ['chain-mail', 'scale-mail']
        }
    };

    /**
     * Shield chance by rarity
     *
     * Chance (0-1) that an enemy gets a shield if their archetype supports it.
     * Higher rarity enemies are more likely to have shields.
     */
    private static readonly SHIELD_CHANCE: Record<EnemyRarity, number> = {
        common: 0.25,
        uncommon: 0.5,
        elite: 0.75,
        boss: 1.0
    };

    /**
     * Generate equipment for an enemy
     *
     * Selects appropriate weapons, armor, and shields based on archetype and rarity.
     * Uses deterministic selection from the provided seed.
     *
     * @param options - Equipment generation options
     * @returns Equipment configuration with weapon, armor, and optional shield
     *
     * @example
     * ```typescript
     * const equipment = EnemyEquipmentGenerator.generate({
     *   archetype: 'brute',
     *   rarity: 'elite',
     *   seed: 'elite-orc-1'
     * });
     * // Returns: { weapon: {...}, armor: {...}, shield: {...} }
     * ```
     */
    static generate(options: EnemyEquipmentGenerationOptions): EquipmentConfig {
        const { archetype, rarity, seed, includeShield = true } = options;
        const rng = new SeededRNG(seed);

        const config: EquipmentConfig = {};

        // Select weapon
        config.weapon = EnemyEquipmentGenerator.selectWeapon(archetype, rarity, rng);

        // Select armor
        config.armor = EnemyEquipmentGenerator.selectArmor(archetype, rarity, rng);

        // Select shield (for applicable archetypes)
        if (includeShield && EnemyEquipmentGenerator.canUseShield(archetype)) {
            // First check if shields are available for this rarity
            const availableShields = getShieldsByArchetypeAndRarity(archetype, rarity);
            if (availableShields.length > 0) {
                const shieldChance = EnemyEquipmentGenerator.SHIELD_CHANCE[rarity];
                if (rng.random() < shieldChance) {
                    config.shield = EnemyEquipmentGenerator.selectShield(archetype, rarity);
                }
            }
        }

        return config;
    }

    /**
     * Select a weapon based on archetype and rarity
     *
     * Uses priority lists with seeded randomness for deterministic selection.
     *
     * @param archetype - Enemy archetype
     * @param rarity - Enemy rarity tier
     * @param rng - Seeded RNG
     * @returns Selected weapon template
     */
    private static selectWeapon(
        archetype: EnemyArchetype,
        rarity: EnemyRarity,
        rng: SeededRNG
    ): EquipmentTemplate {
        // Get available weapons for this archetype and rarity
        const availableWeapons = getWeaponsByArchetypeAndRarity(archetype, rarity);

        if (availableWeapons.length === 0) {
            // Fallback to dagger if no weapons available
            return ENEMY_EQUIPMENT_TEMPLATES.find(t => t.id === 'dagger')!;
        }

        // Get priority weapons for this archetype/rarity
        const priorityIds = EnemyEquipmentGenerator.WEAPON_PRIORITY[archetype][rarity];

        // Try to select from priority list first
        const priorityWeapons = availableWeapons.filter(w => priorityIds.includes(w.id));

        if (priorityWeapons.length > 0 && rng.random() < 0.7) {
            // 70% chance to pick from priority list
            return rng.randomChoice(priorityWeapons);
        }

        // Otherwise pick from any available weapon
        return rng.randomChoice(availableWeapons);
    }

    /**
     * Select armor based on archetype and rarity
     *
     * Uses priority lists with seeded randomness for deterministic selection.
     *
     * @param archetype - Enemy archetype
     * @param rarity - Enemy rarity tier
     * @param rng - Seeded RNG
     * @returns Selected armor template
     */
    private static selectArmor(
        archetype: EnemyArchetype,
        rarity: EnemyRarity,
        rng: SeededRNG
    ): EquipmentTemplate {
        // Get available armor for this archetype and rarity
        const availableArmor = getArmorByArchetypeAndRarity(archetype, rarity);

        if (availableArmor.length === 0) {
            // Fallback to leather armor if no armor available
            return ENEMY_EQUIPMENT_TEMPLATES.find(t => t.id === 'leather-armor')!;
        }

        // Get priority armor for this archetype/rarity
        const priorityIds = EnemyEquipmentGenerator.ARMOR_PRIORITY[archetype][rarity];

        // Try to select from priority list first
        const priorityArmor = availableArmor.filter(a => priorityIds.includes(a.id));

        if (priorityArmor.length > 0 && rng.random() < 0.8) {
            // 80% chance to pick from priority list
            return rng.randomChoice(priorityArmor);
        }

        // Otherwise pick from any available armor
        return rng.randomChoice(availableArmor);
    }

    /**
     * Select a shield based on archetype and rarity
     *
     * @param archetype - Enemy archetype
     * @param rarity - Enemy rarity tier
     * @returns Selected shield template
     */
    private static selectShield(
        archetype: EnemyArchetype,
        rarity: EnemyRarity
    ): EquipmentTemplate {
        // Get available shields for this archetype and rarity
        const availableShields = getShieldsByArchetypeAndRarity(archetype, rarity);

        if (availableShields.length === 0) {
            // Fallback to basic shield
            return ENEMY_EQUIPMENT_TEMPLATES.find(t => t.id === 'shield')!;
        }

        // Return first available shield (typically just 'shield')
        return availableShields[0];
    }

    /**
     * Check if an archetype can use a shield
     *
     * Archers typically don't use shields (need two hands for bows).
     * Brutes and supports can use shields.
     *
     * @param archetype - Enemy archetype to check
     * @returns true if the archetype can use shields
     */
    private static canUseShield(archetype: EnemyArchetype): boolean {
        // Archers use two-handed ranged weapons, can't use shields
        return archetype !== 'archer';
    }

    /**
     * Get the actual equipment name from the mapping
     *
     * Maps template ID to the actual equipment name in DEFAULT_EQUIPMENT.
     *
     * @param templateId - Equipment template ID
     * @returns Actual equipment name from DEFAULT_EQUIPMENT
     */
    static getEquipmentName(templateId: string): string {
        return ENEMY_EQUIPMENT_MAPPING[templateId] || templateId;
    }

    /**
     * Get all equipment templates
     *
     * @returns Array of all equipment templates
     */
    static getAllTemplates(): EquipmentTemplate[] {
        return [...ENEMY_EQUIPMENT_TEMPLATES];
    }

    /**
     * Get equipment template by ID
     *
     * @param id - Template ID
     * @returns Equipment template or undefined
     */
    static getTemplateById(id: string): EquipmentTemplate | undefined {
        return ENEMY_EQUIPMENT_TEMPLATES.find(t => t.id === id);
    }
}
