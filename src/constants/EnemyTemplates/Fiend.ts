/**
 * Fiend Enemy Templates
 *
 * Contains fiend enemy templates with category-specific traits:
 * - Fire resistance (half damage from fire attacks)
 * - Cold resistance (half damage from cold attacks)
 *
 * Fiends are malicious creatures from the lower planes, including demons,
 * devils, and other evil outsiders. They are typically resistant to
 * fire and cold, and often have poisonous or corrupting abilities.
 */

import type { EnemyTemplate } from '../../core/types/Enemy.js';

/**
 * Fiend enemy templates
 *
 * These 4 templates provide fiend enemies with:
 * - Fire resistance (all rarities)
 * - Cold resistance (all rarities)
 * - Varied archetypes: Archer (Imp), Support (Quasit), Brute (Lemure, Demon)
 */
export const FIEND_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // FIEND - ARCHER
    // ========================================

    /**
     * Imp
     * Small devil with poisonous sting and deceptive abilities
     * Audio preference: Treble-heavy (favors high-frequency, sharp audio)
     */
    {
        id: 'imp',
        name: 'Imp',
        category: 'fiend',
        archetype: 'archer',
        signatureAbility: {
            id: 'imp_sting',
            name: 'Sting',
            description: 'A poisonous tail strike that deals poison damage and may poison the target. The imp\'s venom causes necrosis and weakness.',
            damageDie: 'd6',
            damageType: 'poison',
            attackType: 'ranged',
            range: 30,
            properties: ['poison', 'debuff']
        },
        baseStats: {
            STR: 6,
            DEX: 15,
            CON: 10,
            INT: 11,
            WIS: 10,
            CHA: 12
        },
        baseHP: 10,
        baseAC: 13,
        baseSpeed: 20,
        audioPreference: {
            bass: 0.1,
            mid: 0.2,
            treble: 0.9
        },
        resistances: {
            resistances: ['fire', 'cold'],
            immunities: ['poison']
        }
    },

    // ========================================
    // FIEND - SUPPORT
    // ========================================

    /**
     * Quasit
     * Chaotic demon with fear aura and corrupting presence
     * Audio preference: Mid-range (balanced, unsettling audio profile)
     */
    {
        id: 'quasit',
        name: 'Quasit',
        category: 'fiend',
        archetype: 'support',
        signatureAbility: {
            id: 'quasit_fear_aura',
            name: 'Fear Aura',
            description: 'Projects an aura of unnatural terror that frightens nearby enemies. Frightened creatures have disadvantage on ability checks.',
            damageDie: 'd6',
            damageType: 'psychic',
            attackType: 'spell',
            range: 20,
            properties: ['debuff', 'fear', 'control']
        },
        baseStats: {
            STR: 8,
            DEX: 12,
            CON: 10,
            INT: 10,
            WIS: 11,
            CHA: 12
        },
        baseHP: 7,
        baseAC: 13,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.2,
            mid: 0.7,
            treble: 0.3
        },
        resistances: {
            resistances: ['fire', 'cold'],
            immunities: ['poison']
        }
    },

    // ========================================
    // FIEND - BRUTE
    // ========================================

    /**
     * Lemure
     * Wretched devil soul with hellish resilience
     * Audio preference: Bass-heavy (favors powerful, low-frequency audio)
     */
    {
        id: 'lemure',
        name: 'Lemure',
        category: 'fiend',
        archetype: 'brute',
        signatureAbility: {
            id: 'lemure_hellish_resilience',
            name: 'Hellish Resilience',
            description: 'A slam attack that deals fire damage while simultaneously healing the lemure. Its corrupted flesh regenerates from hellfire.',
            damageDie: 'd6',
            damageType: 'fire',
            attackType: 'melee',
            properties: ['lifesteal', 'persistent']
        },
        baseStats: {
            STR: 10,
            DEX: 6,
            CON: 12,
            INT: 3,
            WIS: 8,
            CHA: 5
        },
        baseHP: 13,
        baseAC: 7,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.9,
            mid: 0.1,
            treble: 0.1
        },
        resistances: {
            resistances: ['fire', 'cold'],
            immunities: ['poison']
        }
    },

    /**
     * Demon
     * Chaotic evil fiend with random corrupting attacks
     * Audio preference: Bass-heavy (favors powerful, chaotic audio)
     */
    {
        id: 'demon',
        name: 'Demon',
        category: 'fiend',
        archetype: 'brute',
        signatureAbility: {
            id: 'demon_chaos_claw',
            name: 'Chaos Claw',
            description: 'A claw attack infused with chaotic energy that deals random damage types. Each strike channels the unpredictability of the abyss.',
            damageDie: 'd6',
            damageType: 'necrotic',
            attackType: 'melee',
            properties: ['chaotic', 'versatile']
        },
        baseStats: {
            STR: 16,
            DEX: 12,
            CON: 14,
            INT: 8,
            WIS: 10,
            CHA: 10
        },
        baseHP: 28,
        baseAC: 13,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.8,
            mid: 0.3,
            treble: 0.2
        },
        resistances: {
            resistances: ['fire', 'cold'],
            immunities: ['poison']
        }
    }
];

/**
 * Helper function to get a fiend template by ID
 *
 * @param id - The template ID (e.g., 'imp', 'quasit', 'lemure', 'demon')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const imp = getFiendTemplateById('imp');
 * if (imp) {
 *   console.log(imp.name); // 'Imp'
 * }
 * ```
 */
export function getFiendTemplateById(id: string): EnemyTemplate | undefined {
    return FIEND_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all fiend templates
 *
 * @returns Array of all fiend templates
 *
 * @example
 * ```typescript
 * const fiends = getFiendTemplates();
 * console.log(fiends.length); // 4 (Imp, Quasit, Lemure, Demon)
 * ```
 */
export function getFiendTemplates(): EnemyTemplate[] {
    return [...FIEND_TEMPLATES];
}

/**
 * Get fiend templates by archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of fiend templates with the specified archetype
 *
 * @example
 * ```typescript
 * const fiendBrutes = getFiendTemplatesByArchetype('brute');
 * console.log(fiendBrutes.length); // 2 (Lemure, Demon)
 * ```
 */
export function getFiendTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return FIEND_TEMPLATES.filter(template => template.archetype === archetype);
}
