/**
 * Dragon Enemy Templates
 *
 * Contains dragon enemy templates with category-specific traits:
 * - Damage immunity (by dragon type)
 * - Frightful presence (for higher rarity)
 *
 * Dragons are powerful, intelligent reptilian creatures with breath weapons
 * and devastating physical attacks. Young dragons are formidable opponents,
 * while wyrmlings and drakes provide lesser challenges. Each dragon type
 * has immunity to its associated damage element.
 */

import type { EnemyTemplate } from '../../core/types/Enemy.js';

/**
 * Dragon enemy templates
 *
 * These 4 templates provide dragon enemies with:
 * - Young Red Dragon: Fire immunity, Fire Breath (AoE fire), bass audio preference
 * - Young Blue Dragon: Lightning immunity, Lightning Breath (line lightning), treble audio preference
 * - Dragon Wyrmling: Acid resistance, Bite + Claw (multiattack), mid audio preference
 * - Drake: Cold resistance, Tail Swipe (knockback), bass audio preference
 * - Varied archetypes: Brute (Young Red Dragon, Dragon Wyrmling, Drake), Archer (Young Blue Dragon)
 */
export const DRAGON_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // DRAGON - BRUTE
    // ========================================

    /**
     * Young Red Dragon
     * fearsome fire-breathing dragon with cone of flame
     * Audio preference: Bass-heavy (favors powerful, roaring audio)
     */
    {
        id: 'young-red-dragon',
        name: 'Young Red Dragon',
        category: 'dragon',
        archetype: 'brute',
        signatureAbility: {
            id: 'young_red_dragon_fire_breath',
            name: 'Fire Breath',
            description: 'Exhales a cone of searing flame that deals fire damage to all creatures in the area. The intense heat can ignite flammable objects.',
            damageDie: 'd8',
            damageType: 'fire',
            attackType: 'ranged',
            range: 30,
            properties: ['aoe', 'cone', 'burn']
        },
        baseStats: {
            STR: 19,
            DEX: 12,
            CON: 17,
            INT: 12,
            WIS: 13,
            CHA: 15
        },
        baseHP: 45,
        baseAC: 18,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.9,
            mid: 0.2,
            treble: 0.1
        },
        resistances: {
            immunities: ['fire'],
            resistances: []
        }
    },

    /**
     * Dragon Wyrmling
     * Newly hatched dragon with multiple physical attacks
     * Audio preference: Mid-range (balanced, curious audio profile)
     */
    {
        id: 'dragon-wyrmling',
        name: 'Dragon Wyrmling',
        category: 'dragon',
        archetype: 'brute',
        signatureAbility: {
            id: 'dragon_wyrmling_multiattack',
            name: 'Bite + Claw',
            description: 'A combination attack with bite and claws that deals multiple physical attacks. The wyrmling attacks with ferocious hunger.',
            damageDie: 'd6',
            damageType: 'slashing',
            attackType: 'melee',
            properties: ['multiattack']
        },
        baseStats: {
            STR: 15,
            DEX: 12,
            CON: 14,
            INT: 10,
            WIS: 11,
            CHA: 12
        },
        baseHP: 26,
        baseAC: 17,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.3,
            mid: 0.6,
            treble: 0.2
        },
        resistances: {
            immunities: [],
            resistances: ['acid']
        }
    },

    /**
     * Drake
     * Lesser dragon with knockback tail attack
     * Audio preference: Bass-heavy (favors powerful, heavy audio)
     */
    {
        id: 'drake',
        name: 'Drake',
        category: 'dragon',
        archetype: 'brute',
        signatureAbility: {
            id: 'drake_tail_swipe',
            name: 'Tail Swipe',
            description: 'A powerful tail strike that deals bludgeoning damage and knocks targets back. The force can push enemies away from the drake.',
            damageDie: 'd6',
            damageType: 'bludgeoning',
            attackType: 'melee',
            properties: ['knockback', 'push']
        },
        baseStats: {
            STR: 16,
            DEX: 12,
            CON: 14,
            INT: 8,
            WIS: 10,
            CHA: 10
        },
        baseHP: 32,
        baseAC: 15,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.8,
            mid: 0.3,
            treble: 0.1
        },
        resistances: {
            immunities: [],
            resistances: ['cold']
        }
    },

    // ========================================
    // DRAGON - ARCHER
    // ========================================

    /**
     * Young Blue Dragon
     * Lightning-breathing dragon with line attack
     * Audio preference: Treble-heavy (favors high-frequency, crackling audio)
     */
    {
        id: 'young-blue-dragon',
        name: 'Young Blue Dragon',
        category: 'dragon',
        archetype: 'archer',
        signatureAbility: {
            id: 'young_blue_dragon_lightning_breath',
            name: 'Lightning Breath',
            description: 'Exhales a line of crackling lightning that deals lightning damage to all creatures in its path. The electrical discharge arcs between targets.',
            damageDie: 'd8',
            damageType: 'lightning',
            attackType: 'ranged',
            range: 60,
            properties: ['aoe', 'line', 'chain']
        },
        baseStats: {
            STR: 17,
            DEX: 14,
            CON: 15,
            INT: 14,
            WIS: 13,
            CHA: 15
        },
        baseHP: 38,
        baseAC: 19,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.1,
            mid: 0.2,
            treble: 0.9
        },
        resistances: {
            immunities: ['lightning'],
            resistances: ['thunder']
        }
    }
];

/**
 * Helper function to get a dragon template by ID
 *
 * @param id - The template ID (e.g., 'young-red-dragon', 'young-blue-dragon', 'dragon-wyrmling', 'drake')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const youngRedDragon = getDragonTemplateById('young-red-dragon');
 * if (youngRedDragon) {
 *   console.log(youngRedDragon.name); // 'Young Red Dragon'
 * }
 * ```
 */
export function getDragonTemplateById(id: string): EnemyTemplate | undefined {
    return DRAGON_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all dragon templates
 *
 * @returns Array of all dragon templates
 *
 * @example
 * ```typescript
 * const dragons = getDragonTemplates();
 * console.log(dragons.length); // 4 (Young Red Dragon, Young Blue Dragon, Dragon Wyrmling, Drake)
 * ```
 */
export function getDragonTemplates(): EnemyTemplate[] {
    return [...DRAGON_TEMPLATES];
}

/**
 * Get dragon templates by archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of dragon templates with the specified archetype
 *
 * @example
 * ```typescript
 * const dragonBrutes = getDragonTemplatesByArchetype('brute');
 * console.log(dragonBrutes.length); // 3 (Young Red Dragon, Dragon Wyrmling, Drake)
 *
 * const dragonArchers = getDragonTemplatesByArchetype('archer');
 * console.log(dragonArchers.length); // 1 (Young Blue Dragon)
 * ```
 */
export function getDragonTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return DRAGON_TEMPLATES.filter(template => template.archetype === archetype);
}
