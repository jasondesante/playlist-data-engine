/**
 * Monstrosity Enemy Templates
 *
 * Contains monstrosity enemy templates with varied traits.
 * Monstrosities are bizarre creatures that defy normal classification.
 * Unlike other categories, monstrosities have no universal category traits -
 * each creature has its own unique abilities and characteristics.
 *
 * Monstrosities are often found in wild places, dungeons, or as
 * guardians of cursed locations. They include hybrids of multiple
 * creatures and bizarre magical creations.
 */

import type { EnemyTemplate } from '../../core/types/Enemy.js';

/**
 * Monstrosity enemy templates
 *
 * These 4 templates provide monstrosity enemies with:
 * - Varied resistances (no universal category trait)
 * - Unique abilities per creature
 * - Varied archetypes: Brute (Owlbear, Mimic), Archer (Griffin), Support (Basilisk)
 */
export const MONSTROSITY_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // MONSTROSITY - BRUTE
    // ========================================

    /**
     * Owlbear
     * Ferocious hybrid predator with multiattack capabilities
     * Audio preference: Bass-heavy (favors powerful, aggressive audio)
     */
    {
        id: 'owlbear',
        name: 'Owlbear',
        category: 'monstrosity',
        archetype: 'brute',
        signatureAbility: {
            id: 'owlbear_multiattack',
            name: 'Multiattack',
            description: 'A devastating combination of beak and claws attacks. The owlbear unleashes its primal fury in a flurry of strikes.',
            damageDie: 'd6',
            damageType: 'slashing',
            attackType: 'melee',
            properties: ['multiattack']
        },
        baseStats: {
            STR: 18,
            DEX: 10,
            CON: 14,
            INT: 3,
            WIS: 10,
            CHA: 6
        },
        baseHP: 37,
        baseAC: 13,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.9,
            mid: 0.2,
            treble: 0.1
        },
        resistances: {
            resistances: []
        }
    },

    // ========================================
    // MONSTROSITY - ARCHER
    // ========================================

    /**
     * Griffin
     * Majestic flying predator with diving attack capabilities
     * Audio preference: Treble-heavy (favors high-frequency, soaring audio)
     */
    {
        id: 'griffin',
        name: 'Griffin',
        category: 'monstrosity',
        archetype: 'archer',
        signatureAbility: {
            id: 'griffin_dive_attack',
            name: 'Dive Attack',
            description: 'A high-speed diving attack from above that deals extra piercing damage. The griffin uses its powerful wings to strike with devastating force.',
            damageDie: 'd6',
            damageType: 'piercing',
            attackType: 'ranged',
            range: 80,
            properties: ['charge', 'flying']
        },
        baseStats: {
            STR: 16,
            DEX: 15,
            CON: 14,
            INT: 4,
            WIS: 12,
            CHA: 7
        },
        baseHP: 30,
        baseAC: 12,
        baseSpeed: 50,
        audioPreference: {
            bass: 0.1,
            mid: 0.2,
            treble: 0.9
        },
        resistances: {
            resistances: []
        }
    },

    // ========================================
    // MONSTROSITY - BRUTE
    // ========================================

    /**
     * Mimic
     * Deceptive shape-shifter with ambush and grapple abilities
     * Audio preference: Mid-range (balanced, deceptive audio profile)
     */
    {
        id: 'mimic',
        name: 'Mimic',
        category: 'monstrosity',
        archetype: 'brute',
        signatureAbility: {
            id: 'mimic_adhesive',
            name: 'Adhesive',
            description: 'A pseudopod attack that deals bludgeoning damage and grapples the target. The mimic\'s adhesive surface traps prey.',
            damageDie: 'd6',
            damageType: 'bludgeoning',
            attackType: 'melee',
            properties: ['grapple', 'ambush']
        },
        baseStats: {
            STR: 14,
            DEX: 10,
            CON: 12,
            INT: 6,
            WIS: 8,
            CHA: 4
        },
        baseHP: 21,
        baseAC: 12,
        baseSpeed: 10,
        audioPreference: {
            bass: 0.2,
            mid: 0.7,
            treble: 0.3
        },
        resistances: {
            resistances: ['acid']
        }
    },

    // ========================================
    // MONSTROSITY - SUPPORT
    // ========================================

    /**
     * Basilisk
     * Terrifying creature with petrifying gaze attack
     * Audio preference: Mid-range (balanced, ominous audio profile)
     */
    {
        id: 'basilisk',
        name: 'Basilisk',
        category: 'monstrosity',
        archetype: 'support',
        signatureAbility: {
            id: 'basilisk_petrifying_gaze',
            name: 'Petrifying Gaze',
            description: 'A gaze attack that can stun targets. Those who meet the basilisk\'s eyes feel their limbs turning to stone.',
            damageDie: 'd6',
            damageType: 'psychic',
            attackType: 'spell',
            range: 30,
            properties: ['debuff', 'control', 'stun']
        },
        baseStats: {
            STR: 14,
            DEX: 10,
            CON: 12,
            INT: 4,
            WIS: 6,
            CHA: 6
        },
        baseHP: 26,
        baseAC: 14,
        baseSpeed: 20,
        audioPreference: {
            bass: 0.2,
            mid: 0.7,
            treble: 0.2
        },
        resistances: {
            resistances: ['poison']
        }
    }
];

/**
 * Helper function to get a monstrosity template by ID
 *
 * @param id - The template ID (e.g., 'owlbear', 'griffin', 'mimic', 'basilisk')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const owlbear = getMonstrosityTemplateById('owlbear');
 * if (owlbear) {
 *   console.log(owlbear.name); // 'Owlbear'
 * }
 * ```
 */
export function getMonstrosityTemplateById(id: string): EnemyTemplate | undefined {
    return MONSTROSITY_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all monstrosity templates
 *
 * @returns Array of all monstrosity templates
 *
 * @example
 * ```typescript
 * const monstrosities = getMonstrosityTemplates();
 * console.log(monstrosities.length); // 4 (Owlbear, Griffin, Mimic, Basilisk)
 * ```
 */
export function getMonstrosityTemplates(): EnemyTemplate[] {
    return [...MONSTROSITY_TEMPLATES];
}

/**
 * Get monstrosity templates by archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of monstrosity templates with the specified archetype
 *
 * @example
 * ```typescript
 * const monstrosityBrutes = getMonstrosityTemplatesByArchetype('brute');
 * console.log(monstrosityBrutes.length); // 2 (Owlbear, Mimic)
 * ```
 */
export function getMonstrosityTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return MONSTROSITY_TEMPLATES.filter(template => template.archetype === archetype);
}
