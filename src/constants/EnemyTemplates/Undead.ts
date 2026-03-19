/**
 * Undead Enemy Templates
 *
 * Contains undead enemy templates with category-specific traits:
 * - Necrotic resistance (half damage from necrotic attacks)
 * - Poison immunity (immune to poison damage and poisoned condition)
 *
 * Undead are animated corpses or spirits, often found in graveyards,
 * tombs, and cursed locations. They typically have dark, eerie audio preferences.
 */

import type { EnemyTemplate } from '../../core/types/Enemy.js';

/**
 * Undead enemy templates
 *
 * These 4 templates provide undead enemies with:
 * - Necrotic resistance (elite+ rarity scaling)
 * - Poison immunity (all rarities)
 * - Varied archetypes: Archer (Skeleton), Brute (Zombie, Wight), Support (Ghost)
 */
export const UNDEAD_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // UNDEAD - ARCHER
    // ========================================

    /**
     * Skeleton
     * Animated bones with ranged attacks and undead resilience
     * Audio preference: Treble-heavy (favors high-frequency, brittle audio)
     */
    {
        id: 'skeleton',
        name: 'Skeleton',
        category: 'undead',
        archetype: 'archer',
        signatureAbility: {
            id: 'skeleton_bone_shot',
            name: 'Bone Shot',
            description: 'Fires a sharpened bone projectile that deals piercing damage. The hollow whistle of the bone strikes fear into the living.',
            damageDie: 'd6',
            damageType: 'piercing',
            attackType: 'ranged',
            range: 80,
            properties: ['ammo', 'accuracy']
        },
        baseStats: {
            STR: 12,
            DEX: 14,
            CON: 12,
            INT: 6,
            WIS: 8,
            CHA: 5
        },
        baseHP: 13,
        baseAC: 13,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.1,
            mid: 0.2,
            treble: 0.9
        },
        resistances: {
            resistances: ['necrotic'],
            immunities: ['poison']
        }
    },

    // ========================================
    // UNDEAD - BRUTE
    // ========================================

    /**
     * Zombie
     * Reanimated corpse with relentless hunger and grapple ability
     * Audio preference: Bass-heavy (favors powerful, low-frequency audio)
     */
    {
        id: 'zombie',
        name: 'Zombie',
        category: 'undead',
        archetype: 'brute',
        signatureAbility: {
            id: 'zombie_undead_grip',
            name: 'Undead Grip',
            description: 'A grapple followed by a bite that deals necrotic damage. The zombie\'s grip is supernaturally strong and unnaturally cold.',
            damageDie: 'd6',
            damageType: 'necrotic',
            attackType: 'melee',
            properties: ['grapple', 'persistent']
        },
        baseStats: {
            STR: 14,
            DEX: 8,
            CON: 14,
            INT: 3,
            WIS: 6,
            CHA: 5
        },
        baseHP: 22,
        baseAC: 8,
        baseSpeed: 20,
        audioPreference: {
            bass: 0.9,
            mid: 0.1,
            treble: 0.1
        },
        resistances: {
            resistances: ['necrotic'],
            immunities: ['poison']
        }
    },

    /**
     * Wight
     * Intelligent undead warrior with life-draining abilities
     * Audio preference: Mid-range (balanced audio profile)
     */
    {
        id: 'wight',
        name: 'Wight',
        category: 'undead',
        archetype: 'brute',
        signatureAbility: {
            id: 'wight_life_drain',
            name: 'Life Drain',
            description: 'A melee attack that deals necrotic damage and heals the wight for half the damage dealt. The stolen life force sustains its unholy existence.',
            damageDie: 'd6',
            damageType: 'necrotic',
            attackType: 'melee',
            properties: ['lifesteal']
        },
        baseStats: {
            STR: 16,
            DEX: 12,
            CON: 14,
            INT: 10,
            WIS: 12,
            CHA: 14
        },
        baseHP: 26,
        baseAC: 14,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.3,
            mid: 0.6,
            treble: 0.2
        },
        resistances: {
            resistances: ['necrotic'],
            immunities: ['poison']
        }
    },

    // ========================================
    // UNDEAD - SUPPORT
    // ========================================

    /**
     * Ghost
     * Spectral spirit with fear-inducing presence and phase abilities
     * Audio preference: Mid-range (balanced, eerie audio profile)
     */
    {
        id: 'ghost',
        name: 'Ghost',
        category: 'undead',
        archetype: 'support',
        signatureAbility: {
            id: 'ghost_horrifying_visage',
            name: 'Horrifying Visage',
            description: 'Projects terrifying spectral visage that frightens nearby enemies. Frightened creatures have disadvantage on ability checks and attack rolls.',
            damageDie: 'd6',
            damageType: 'psychic',
            attackType: 'spell',
            range: 30,
            properties: ['debuff', 'fear', 'control']
        },
        baseStats: {
            STR: 8,
            DEX: 14,
            CON: 12,
            INT: 12,
            WIS: 14,
            CHA: 16
        },
        baseHP: 15,
        baseAC: 11,
        baseSpeed: 0, // Fly speed instead (represented by high mobility)
        audioPreference: {
            bass: 0.2,
            mid: 0.7,
            treble: 0.3
        },
        resistances: {
            resistances: ['acid', 'cold', 'fire', 'lightning', 'thunder'],
            immunities: ['poison', 'necrotic']
        }
    }
];

/**
 * Helper function to get an undead template by ID
 *
 * @param id - The template ID (e.g., 'skeleton', 'zombie', 'wight', 'ghost')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const skeleton = getUndeadTemplateById('skeleton');
 * if (skeleton) {
 *   console.log(skeleton.name); // 'Skeleton'
 * }
 * ```
 */
export function getUndeadTemplateById(id: string): EnemyTemplate | undefined {
    return UNDEAD_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all undead templates
 *
 * @returns Array of all undead templates
 *
 * @example
 * ```typescript
 * const undead = getUndeadTemplates();
 * console.log(undead.length); // 4 (Skeleton, Zombie, Wight, Ghost)
 * ```
 */
export function getUndeadTemplates(): EnemyTemplate[] {
    return [...UNDEAD_TEMPLATES];
}

/**
 * Get undead templates by archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of undead templates with the specified archetype
 *
 * @example
 * ```typescript
 * const undeadBrutes = getUndeadTemplatesByArchetype('brute');
 * console.log(undeadBrutes.length); // 2 (Zombie, Wight)
 * ```
 */
export function getUndeadTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return UNDEAD_TEMPLATES.filter(template => template.archetype === archetype);
}
