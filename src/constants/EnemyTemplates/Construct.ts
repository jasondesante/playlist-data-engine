/**
 * Construct Enemy Templates
 *
 * Contains construct enemy templates with category-specific traits:
 * - Poison immunity (immune to poison damage and poisoned condition)
 * - Psychic immunity (immune to psychic damage)
 * - No healing (constructs cannot recover hit points through magical healing)
 *
 * Constructs are artificial creatures, often animated objects or built beings.
 * They are typically immune to poison and psychic effects, and cannot heal
 * through normal magical means. They are often slow but durable.
 */

import type { EnemyTemplate } from '../../core/types/Enemy.js';

/**
 * Construct enemy templates
 *
 * These 4 templates provide construct enemies with:
 * - Poison immunity (all rarities)
 * - Psychic immunity (all rarities)
 * - Varied archetypes: Brute (Animated Armor, Golem), Archer (Flying Sword), Support (Shield Guardian)
 */
export const CONSTRUCT_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // CONSTRUCT - BRUTE
    // ========================================

    /**
     * Animated Armor
     * Empty suit of armor animated by magic
     * Audio preference: Bass-heavy (favors powerful, heavy audio)
     */
    {
        id: 'animated-armor',
        name: 'Animated Armor',
        category: 'construct',
        archetype: 'brute',
        signatureAbility: {
            id: 'animated_armor_slam',
            name: 'Slam',
            description: 'A powerful melee attack that deals force damage. The enchanted armor strikes with supernatural strength.',
            damageDie: 'd6',
            damageType: 'force',
            attackType: 'melee',
            properties: ['force']
        },
        baseStats: {
            STR: 14,
            DEX: 10,
            CON: 14,
            INT: 3,
            WIS: 6,
            CHA: 1
        },
        baseHP: 18,
        baseAC: 18,
        baseSpeed: 25,
        audioPreference: {
            bass: 0.9,
            mid: 0.1,
            treble: 0.1
        },
        resistances: {
            immunities: ['poison', 'psychic']
        }
    },

    /**
     * Golem
     * Massive constructed being with magical immunity
     * Audio preference: Bass-heavy (favors powerful, rumbling audio)
     */
    {
        id: 'golem',
        name: 'Golem',
        category: 'construct',
        archetype: 'brute',
        signatureAbility: {
            id: 'golem_immutable_form',
            name: 'Immutable Form',
            description: 'A devastating slam that deals bludgeoning damage. The golem is immune to most status conditions and non-magical physical attacks.',
            damageDie: 'd8',
            damageType: 'bludgeoning',
            attackType: 'melee',
            properties: ['status_immunity', 'nonmagical_resistance']
        },
        baseStats: {
            STR: 18,
            DEX: 8,
            CON: 16,
            INT: 3,
            WIS: 6,
            CHA: 1
        },
        baseHP: 32,
        baseAC: 15,
        baseSpeed: 20,
        audioPreference: {
            bass: 0.9,
            mid: 0.1,
            treble: 0.0
        },
        resistances: {
            immunities: ['poison', 'psychic'],
            resistances: ['bludgeoning', 'piercing', 'slashing']
        }
    },

    // ========================================
    // CONSTRUCT - ARCHER
    // ========================================

    /**
     * Flying Sword
     * Animated blade that attacks with diving strikes
     * Audio preference: Treble-heavy (favors high-frequency, sharp audio)
     */
    {
        id: 'flying-sword',
        name: 'Flying Sword',
        category: 'construct',
        archetype: 'archer',
        signatureAbility: {
            id: 'flying_sword_diving_strike',
            name: 'Diving Strike',
            description: 'A diving attack that deals bonus damage when moving toward the target. The enchanted sword strikes with supernatural precision.',
            damageDie: 'd6',
            damageType: 'slashing',
            attackType: 'melee',
            properties: ['charge', 'accuracy']
        },
        baseStats: {
            STR: 12,
            DEX: 16,
            CON: 12,
            INT: 1,
            WIS: 4,
            CHA: 1
        },
        baseHP: 10,
        baseAC: 17,
        baseSpeed: 50,
        audioPreference: {
            bass: 0.1,
            mid: 0.1,
            treble: 0.9
        },
        resistances: {
            immunities: ['poison', 'psychic']
        }
    },

    // ========================================
    // CONSTRUCT - SUPPORT
    // ========================================

    /**
     * Shield Guardian
     * Protective construct that boosts ally defenses
     * Audio preference: Mid-range (balanced, steady audio profile)
     */
    {
        id: 'shield-guardian',
        name: 'Shield Guardian',
        category: 'construct',
        archetype: 'support',
        signatureAbility: {
            id: 'shield_guardian_protection_aura',
            name: 'Protection Aura',
            description: 'Projects a protective field that increases armor class of nearby allies. The magical shield deflects attacks meant for others.',
            damageDie: 'd6',
            damageType: 'force',
            attackType: 'spell',
            range: 20,
            properties: ['buff', 'ally', 'defense']
        },
        baseStats: {
            STR: 14,
            DEX: 10,
            CON: 16,
            INT: 6,
            WIS: 10,
            CHA: 5
        },
        baseHP: 22,
        baseAC: 16,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.2,
            mid: 0.7,
            treble: 0.2
        },
        resistances: {
            immunities: ['poison', 'psychic']
        }
    }
];

/**
 * Helper function to get a construct template by ID
 *
 * @param id - The template ID (e.g., 'animated-armor', 'flying-sword', 'shield-guardian', 'golem')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const animatedArmor = getConstructTemplateById('animated-armor');
 * if (animatedArmor) {
 *   console.log(animatedArmor.name); // 'Animated Armor'
 * }
 * ```
 */
export function getConstructTemplateById(id: string): EnemyTemplate | undefined {
    return CONSTRUCT_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all construct templates
 *
 * @returns Array of all construct templates
 *
 * @example
 * ```typescript
 * const constructs = getConstructTemplates();
 * console.log(constructs.length); // 4 (Animated Armor, Flying Sword, Shield Guardian, Golem)
 * ```
 */
export function getConstructTemplates(): EnemyTemplate[] {
    return [...CONSTRUCT_TEMPLATES];
}

/**
 * Get construct templates by archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of construct templates with the specified archetype
 *
 * @example
 * ```typescript
 * const constructBrutes = getConstructTemplatesByArchetype('brute');
 * console.log(constructBrutes.length); // 2 (Animated Armor, Golem)
 * ```
 */
export function getConstructTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return CONSTRUCT_TEMPLATES.filter(template => template.archetype === archetype);
}
