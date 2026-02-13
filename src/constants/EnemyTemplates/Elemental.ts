/**
 * Elemental Enemy Templates
 *
 * Contains elemental enemy templates with category-specific traits:
 * - Immunity to their own element
 * - Varied resistances based on element type
 *
 * Elementals are living manifestations of natural forces, often found
 * near their native environments. They are immune to their element
 * and typically have abilities that reflect their nature.
 */

import type { EnemyTemplate } from '../../core/types/Enemy.js';

/**
 * Elemental enemy templates
 *
 * These 4 templates provide elemental enemies with:
 * - Fire Elemental: Fire immunity, cold vulnerability
 * - Water Elemental: Cold immunity, resistance to fire and necrotic
 * - Air Elemental: Lightning immunity, resistance to thunder
 * - Earth Elemental: Poison immunity, resistance to necrotic
 * - Varied archetypes: Brute (Fire, Earth), Support (Water), Archer (Air)
 */
export const ELEMENTAL_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // ELEMENTAL - BRUTE
    // ========================================

    /**
     * Fire Elemental
     * Living flame that burns everything it touches
     * Audio preference: Bass-heavy (favors powerful, crackling audio)
     */
    {
        id: 'fire-elemental',
        name: 'Fire Elemental',
        category: 'elemental',
        archetype: 'brute',
        signatureAbility: {
            id: 'fire_elemental_burning_touch',
            name: 'Burning Touch',
            description: 'A searing touch that deals fire damage and applies burning damage over time. The flames continue to burn after impact.',
            damageDie: 'd6',
            damageType: 'fire',
            attackType: 'melee',
            properties: ['ongoing', 'burn']
        },
        baseStats: {
            STR: 14,
            DEX: 12,
            CON: 16,
            INT: 6,
            WIS: 10,
            CHA: 6
        },
        baseHP: 26,
        baseAC: 13,
        baseSpeed: 50,
        audioPreference: {
            bass: 0.8,
            mid: 0.2,
            treble: 0.1
        },
        resistances: {
            immunities: ['fire'],
            resistances: []
        }
    },

    /**
     * Earth Elemental
     * Living stone with crushing power and armored body
     * Audio preference: Bass-heavy (favors powerful, rumbling audio)
     */
    {
        id: 'earth-elemental',
        name: 'Earth Elemental',
        category: 'elemental',
        archetype: 'brute',
        signatureAbility: {
            id: 'earth_elemental_earth_slam',
            name: 'Earth Slam',
            description: 'A devastating slam that deals bludgeoning damage in an area and knocks targets prone. The ground cracks under its power.',
            damageDie: 'd8',
            damageType: 'bludgeoning',
            attackType: 'melee',
            properties: ['aoe', 'prone']
        },
        baseStats: {
            STR: 18,
            DEX: 8,
            CON: 16,
            INT: 6,
            WIS: 10,
            CHA: 6
        },
        baseHP: 30,
        baseAC: 17,
        baseSpeed: 20,
        audioPreference: {
            bass: 0.9,
            mid: 0.1,
            treble: 0.1
        },
        resistances: {
            immunities: ['poison'],
            resistances: ['necrotic']
        }
    },

    // ========================================
    // ELEMENTAL - SUPPORT
    // ========================================

    /**
     * Water Elemental
     * Fluid being with restraining and pulling abilities
     * Audio preference: Mid-range (balanced, flowing audio profile)
     */
    {
        id: 'water-elemental',
        name: 'Water Elemental',
        category: 'elemental',
        archetype: 'support',
        signatureAbility: {
            id: 'water_elemental_whirlpool',
            name: 'Whirlpool',
            description: 'Creates a swirling vortex that restrains targets and pulls them toward the center. The crushing waves hold enemies in place.',
            damageDie: 'd6',
            damageType: 'cold',
            attackType: 'spell',
            range: 30,
            properties: ['control', 'restrain', 'pull']
        },
        baseStats: {
            STR: 14,
            DEX: 14,
            CON: 14,
            INT: 8,
            WIS: 12,
            CHA: 8
        },
        baseHP: 22,
        baseAC: 14,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.2,
            mid: 0.7,
            treble: 0.2
        },
        resistances: {
            immunities: ['cold'],
            resistances: ['fire', 'necrotic']
        }
    },

    // ========================================
    // ELEMENTAL - ARCHER
    // ========================================

    /**
     * Air Elemental
     * Living storm with pushing ranged attacks
     * Audio preference: Treble-heavy (favors high-frequency, whistling audio)
     */
    {
        id: 'air-elemental',
        name: 'Air Elemental',
        category: 'elemental',
        archetype: 'archer',
        signatureAbility: {
            id: 'air_elemental_wind_blast',
            name: 'Wind Blast',
            description: 'Projects a concentrated gust of wind that pushes targets back and deals force damage. The howling wind disrupts formation.',
            damageDie: 'd6',
            damageType: 'force',
            attackType: 'ranged',
            range: 60,
            properties: ['push', 'control']
        },
        baseStats: {
            STR: 12,
            DEX: 16,
            CON: 14,
            INT: 8,
            WIS: 12,
            CHA: 8
        },
        baseHP: 18,
        baseAC: 15,
        baseSpeed: 90,
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
 * Helper function to get an elemental template by ID
 *
 * @param id - The template ID (e.g., 'fire-elemental', 'water-elemental', 'air-elemental', 'earth-elemental')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const fireElemental = getElementalTemplateById('fire-elemental');
 * if (fireElemental) {
 *   console.log(fireElemental.name); // 'Fire Elemental'
 * }
 * ```
 */
export function getElementalTemplateById(id: string): EnemyTemplate | undefined {
    return ELEMENTAL_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all elemental templates
 *
 * @returns Array of all elemental templates
 *
 * @example
 * ```typescript
 * const elementals = getElementalTemplates();
 * console.log(elementals.length); // 4 (Fire Elemental, Water Elemental, Air Elemental, Earth Elemental)
 * ```
 */
export function getElementalTemplates(): EnemyTemplate[] {
    return [...ELEMENTAL_TEMPLATES];
}

/**
 * Get elemental templates by archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of elemental templates with the specified archetype
 *
 * @example
 * ```typescript
 * const elementalBrutes = getElementalTemplatesByArchetype('brute');
 * console.log(elementalBrutes.length); // 2 (Fire Elemental, Earth Elemental)
 * ```
 */
export function getElementalTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return ELEMENTAL_TEMPLATES.filter(template => template.archetype === archetype);
}
