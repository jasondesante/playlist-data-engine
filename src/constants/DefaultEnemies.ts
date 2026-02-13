/**
 * Default Enemy Templates
 *
 * Contains base enemy templates that can be scaled by rarity tier.
 * Each template includes:
 * - Signature ability with d6 base die (scales to d8/d10/d12 by rarity)
 * - Audio preference weights for template selection
 * - Base stats appropriate to archetype
 * - Type-appropriate resistances for Elite+ tier
 *
 * Templates are organized by category and archetype:
 * - Humanoid: Brute, Archer, Support
 * - Beast: Brute, "Archer" (Ranged)
 * - Undead: Archer, Brute, Support
 */

import type { EnemyTemplate } from '../core/types/Enemy.js';
import { UNDEAD_TEMPLATES } from './EnemyTemplates/Undead.js';

/**
 * V1 enemy templates (humanoid and beast)
 *
 * These 10 templates provide the foundation for enemy generation.
 * Each template is scaled by rarity tier (common/uncommon/elite/boss)
 * which affects stats, signature ability damage dice, and extra abilities.
 */
const V1_TEMPLATES: EnemyTemplate[] = [
    // ========================================
    // HUMANOID - BRUTE
    // ========================================

    /**
     * Orc
     * Classic brute warrior with savage melee attacks
     * Audio preference: Bass-heavy (favors powerful, low-frequency audio)
     */
    {
        id: 'orc',
        name: 'Orc',
        category: 'humanoid',
        archetype: 'brute',
        signatureAbility: {
            id: 'orc_savage_strike',
            name: 'Savage Strike',
            description: 'A powerful melee attack that deals extra damage. The ferocity of the attack embodies primal aggression.',
            damageDie: 'd6',
            damageType: 'slashing',
            attackType: 'melee',
            properties: ['versatile']
        },
        baseStats: {
            STR: 16,
            DEX: 12,
            CON: 14,
            INT: 8,
            WIS: 10,
            CHA: 8
        },
        baseHP: 15,
        baseAC: 13,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.8,
            mid: 0.3,
            treble: 0.1
        },
        resistances: {
            resistances: ['poison']
        }
    },

    /**
     * Bandit
     * Cunning fighter who exploits weaknesses
     * Audio preference: Mid-range (balanced audio profile)
     */
    {
        id: 'bandit',
        name: 'Bandit',
        category: 'humanoid',
        archetype: 'brute',
        signatureAbility: {
            id: 'bandit_cheap_shot',
            name: 'Cheap Shot',
            description: 'A dirty fighting technique that deals bonus damage against surprised or flat-footed opponents.',
            damageDie: 'd6',
            damageType: 'slashing',
            attackType: 'melee',
            properties: ['finesse']
        },
        baseStats: {
            STR: 13,
            DEX: 14,
            CON: 12,
            INT: 10,
            WIS: 10,
            CHA: 11
        },
        baseHP: 11,
        baseAC: 12,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.4,
            mid: 0.6,
            treble: 0.3
        },
        resistances: {
            resistances: []
        }
    },

    // ========================================
    // HUMANOID - ARCHER
    // ========================================

    /**
     * Hunter
     * Skilled marksman with precise ranged attacks
     * Audio preference: Treble-heavy (favors high-frequency, precise audio)
     */
    {
        id: 'hunter',
        name: 'Hunter',
        category: 'humanoid',
        archetype: 'archer',
        signatureAbility: {
            id: 'hunter_precise_shot',
            name: 'Precise Shot',
            description: 'A carefully aimed shot that can ignore half cover. Exceptional accuracy allows targeting vulnerabilities.',
            damageDie: 'd6',
            damageType: 'piercing',
            attackType: 'ranged',
            range: 120,
            properties: ['accuracy']
        },
        baseStats: {
            STR: 11,
            DEX: 16,
            CON: 12,
            INT: 12,
            WIS: 14,
            CHA: 10
        },
        baseHP: 10,
        baseAC: 13,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.1,
            mid: 0.3,
            treble: 0.8
        },
        resistances: {
            resistances: []
        }
    },

    /**
     * Goblin Archer
     * Sneaky ranged attacker with hit-and-run tactics
     * Audio preference: Treble-heavy (favors high-frequency audio)
     */
    {
        id: 'goblin-archer',
        name: 'Goblin Archer',
        category: 'humanoid',
        archetype: 'archer',
        signatureAbility: {
            id: 'goblin_sneaky_shot',
            name: 'Sneaky Shot',
            description: 'A quick shot from hiding that deals bonus damage. Works best when the goblin is unseen.',
            damageDie: 'd6',
            damageType: 'piercing',
            attackType: 'ranged',
            range: 80,
            properties: ['finesse', 'stealth']
        },
        baseStats: {
            STR: 8,
            DEX: 15,
            CON: 10,
            INT: 10,
            WIS: 8,
            CHA: 8
        },
        baseHP: 7,
        baseAC: 13,
        baseSpeed: 30,
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
    // HUMANOID - SUPPORT
    // ========================================

    /**
     * Shaman
     * Spiritual leader who enhances allies' combat effectiveness
     * Audio preference: Mid-range (balanced audio profile)
     */
    {
        id: 'shaman',
        name: 'Shaman',
        category: 'humanoid',
        archetype: 'support',
        signatureAbility: {
            id: 'shaman_spirit_bond',
            name: 'Spirit Bond',
            description: 'Channels spiritual energy to grant nearby allies a damage bonus on their next attack.',
            damageDie: 'd6',
            damageType: 'force',
            attackType: 'spell',
            range: 30,
            properties: ['buff', 'ally']
        },
        baseStats: {
            STR: 10,
            DEX: 10,
            CON: 12,
            INT: 12,
            WIS: 15,
            CHA: 13
        },
        baseHP: 9,
        baseAC: 11,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.3,
            mid: 0.7,
            treble: 0.3
        },
        resistances: {
            resistances: ['necrotic']
        }
    },

    /**
     * Cultist
     * Fanatical worshiper who provides defensive blessings
     * Audio preference: Mid-range (balanced audio profile)
     */
    {
        id: 'cultist',
        name: 'Cultist',
        category: 'humanoid',
        archetype: 'support',
        signatureAbility: {
            id: 'cultist_dark_blessing',
            name: 'Dark Blessing',
            description: 'Invokes dark powers to temporarily increase nearby allies\' armor class.',
            damageDie: 'd6',
            damageType: 'necrotic',
            attackType: 'spell',
            range: 20,
            properties: ['buff', 'ally', 'defense']
        },
        baseStats: {
            STR: 11,
            DEX: 12,
            CON: 12,
            INT: 13,
            WIS: 11,
            CHA: 14
        },
        baseHP: 9,
        baseAC: 13,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.3,
            mid: 0.7,
            treble: 0.2
        },
        resistances: {
            resistances: ['necrotic']
        }
    },

    // ========================================
    // BEAST - BRUTE
    // ========================================

    /**
     * Bear
     * Powerful predator with crushing attacks and grapple ability
     * Audio preference: Bass-heavy (favors powerful, low-frequency audio)
     */
    {
        id: 'bear',
        name: 'Bear',
        category: 'beast',
        archetype: 'brute',
        signatureAbility: {
            id: 'bear_maul',
            name: 'Maul',
            description: 'A devastating multiattack with claws that can also grapple the target. Raw power embodied.',
            damageDie: 'd6',
            damageType: 'slashing',
            attackType: 'melee',
            properties: ['multiattack', 'grapple']
        },
        baseStats: {
            STR: 18,
            DEX: 10,
            CON: 16,
            INT: 2,
            WIS: 12,
            CHA: 6
        },
        baseHP: 34,
        baseAC: 11,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.9,
            mid: 0.2,
            treble: 0.1
        },
        resistances: {
            resistances: ['cold']
        }
    },

    /**
     * Boar
     * Aggressive beast with deadly charge attack
     * Audio preference: Bass-heavy (favors powerful, low-frequency audio)
     */
    {
        id: 'boar',
        name: 'Boar',
        category: 'beast',
        archetype: 'brute',
        signatureAbility: {
            id: 'boar_gore_charge',
            name: 'Gore Charge',
            description: 'A ferocious charge that deals bonus damage if the boar moves at least 20 feet before attacking.',
            damageDie: 'd6',
            damageType: 'piercing',
            attackType: 'melee',
            properties: ['charge']
        },
        baseStats: {
            STR: 13,
            DEX: 11,
            CON: 12,
            INT: 2,
            WIS: 8,
            CHA: 4
        },
        baseHP: 11,
        baseAC: 11,
        baseSpeed: 40,
        audioPreference: {
            bass: 0.8,
            mid: 0.3,
            treble: 0.1
        },
        resistances: {
            resistances: []
        }
    },

    // ========================================
    // BEAST - RANGED ("Archer" equivalent)
    // ========================================

    /**
     * Giant Spider
     * Web-shooting arachnid with restraining ranged attack
     * Audio preference: Treble-heavy (favors high-frequency, precise audio)
     */
    {
        id: 'giant-spider',
        name: 'Giant Spider',
        category: 'beast',
        archetype: 'archer',
        signatureAbility: {
            id: 'spider_web_spray',
            name: 'Web Spray',
            description: 'Shoots sticky webbing at a target to restrain them. A restrained creature has speed 0 and can\'t use reactions.',
            damageDie: 'd6',
            damageType: 'poison',
            attackType: 'ranged',
            range: 60,
            properties: ['control', 'restrain']
        },
        baseStats: {
            STR: 12,
            DEX: 14,
            CON: 12,
            INT: 2,
            WIS: 12,
            CHA: 4
        },
        baseHP: 26,
        baseAC: 13,
        baseSpeed: 30,
        audioPreference: {
            bass: 0.2,
            mid: 0.3,
            treble: 0.8
        },
        resistances: {
            resistances: ['poison']
        }
    },

    /**
     * Stirge
     * Blood-drinking flying creature with ranged life steal
     * Audio preference: Treble-heavy (favors high-frequency audio)
     */
    {
        id: 'stirge',
        name: 'Stirge',
        category: 'beast',
        archetype: 'archer',
        signatureAbility: {
            id: 'stirge_blood_drain',
            name: 'Blood Drain',
            description: 'Attaches to target and drains blood, dealing damage and healing the stirge for half the damage dealt.',
            damageDie: 'd6',
            damageType: 'piercing',
            attackType: 'melee',
            properties: ['lifesteal', 'grapple']
        },
        baseStats: {
            STR: 4,
            DEX: 14,
            CON: 10,
            INT: 1,
            WIS: 6,
            CHA: 2
        },
        baseHP: 5,
        baseAC: 12,
        baseSpeed: 10,
        audioPreference: {
            bass: 0.1,
            mid: 0.2,
            treble: 0.9
        },
        resistances: {
            resistances: []
        }
    }
];

/**
 * Default enemy templates
 *
 * Combines V1 templates (humanoid, beast) and V2 templates (undead).
 * Total: 14 templates spanning 3 categories.
 */
export const DEFAULT_ENEMY_TEMPLATES: EnemyTemplate[] = [
    ...V1_TEMPLATES,
    ...UNDEAD_TEMPLATES
];

/**
 * All enemy templates export (alias for DEFAULT_ENEMY_TEMPLATES)
 */
export const ALL_ENEMY_TEMPLATES: EnemyTemplate[] = DEFAULT_ENEMY_TEMPLATES;

/**
 * Helper function to get a template by ID
 *
 * @param id - The template ID (e.g., 'orc', 'goblin-archer', 'skeleton')
 * @returns The matching template, or undefined if not found
 *
 * @example
 * ```typescript
 * const orcTemplate = getTemplateById('orc');
 * if (orcTemplate) {
 *   console.log(orcTemplate.name); // 'Orc'
 * }
 * ```
 */
export function getTemplateById(id: string): EnemyTemplate | undefined {
    return DEFAULT_ENEMY_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all templates for a specific category
 *
 * @param category - The enemy category ('humanoid', 'beast', 'undead', etc.)
 * @returns Array of templates in the specified category
 *
 * @example
 * ```typescript
 * const humanoids = getTemplatesByCategory('humanoid');
 * console.log(humanoids.length); // 6 (Orc, Bandit, Hunter, Goblin Archer, Shaman, Cultist)
 *
 * const undead = getTemplatesByCategory('undead');
 * console.log(undead.length); // 4 (Skeleton, Zombie, Wight, Ghost)
 * ```
 */
export function getTemplatesByCategory(category: string): EnemyTemplate[] {
    return DEFAULT_ENEMY_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get all templates for a specific archetype
 *
 * @param archetype - The enemy archetype ('brute', 'archer', 'support')
 * @returns Array of templates with the specified archetype
 *
 * @example
 * ```typescript
 * const brutes = getTemplatesByArchetype('brute');
 * console.log(brutes.length); // 6 (Orc, Bandit, Bear, Boar, Zombie, Wight)
 * ```
 */
export function getTemplatesByArchetype(archetype: string): EnemyTemplate[] {
    return DEFAULT_ENEMY_TEMPLATES.filter(template => template.archetype === archetype);
}
