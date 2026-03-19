/**
 * SpellcastingGenerator - Generates spellcasting abilities for enemies
 *
 * Provides innate spellcasting system for enemies that can cast spells.
 * Unlike player spellcasting, enemies use a simplified "innate" system
 * where they have predefined spells they can use.
 *
 * Spell selection is based on:
 * - Enemy archetype (support, archer, brute)
 * - Rarity tier (bosses get more spells than commons)
 * - Challenge Rating (determines spell slot count)
 *
 * @example
 * ```typescript
 * // Generate spell list for an elite shaman
 * const spellcasting = SpellcastingGenerator.generateSpellList({
 *   archetype: 'support',
 *   rarity: 'elite',
 *   cr: 2,
 *   seed: 'elite-shaman'
 * });
 * // Returns: { cantrips: [...], spells: [...], slots: { 1: 3, 2: 1 } }
 * ```
 */

import { SeededRNG } from '../../utils/random.js';
import type { EnemyArchetype, EnemyRarity } from '../types/Enemy.js';

/**
 * Innate Spell - A spell available to an enemy
 *
 * Represents a single spell that an enemy can cast.
 * Simplified compared to player spells - enemies have predefined spell lists.
 */
export interface InnateSpell {
    /** Unique identifier for this spell */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Spell level (0 = cantrip, 1-9 = spell level) */
    level: number;

    /** Magical school of the spell */
    school: string;

    /** Description of what the spell does */
    effect: string;

    /** Damage dice (e.g., '2d6' for damaging spells) */
    damage?: string;

    /** Save type (e.g., 'DEX' for Dexterity save) */
    save?: string;

    /** Damage type for resistance calculations */
    damageType?: string;

    /** Range in feet (for ranged spells) */
    range?: number;

    /** Whether this spell requires concentration */
    concentration?: boolean;

    /** Tags for spell classification */
    tags?: string[];
}

/**
 * Spell List - All spells available to an archetype
 *
 * Organized by spell level (0 = cantrips, 1-9 = spell levels).
 * Each archetype has access to different spell themes.
 */
export interface SpellList {
    /** Archetype this spell list belongs to */
    archetype: EnemyArchetype;

    /** Cantrips (level 0 spells) - always available */
    cantrips: InnateSpell[];

    /** Level 1 spells */
    level1: InnateSpell[];

    /** Level 2 spells */
    level2: InnateSpell[];

    /** Level 3 spells */
    level3: InnateSpell[];

    /** Level 4 spells (rare, mostly for bosses) */
    level4?: InnateSpell[];
}

/**
 * Spellcasting Config - Result of spell list generation
 *
 * Contains the selected spells and slot counts for an enemy.
 */
export interface SpellcastingConfig {
    /** Cantrips the enemy knows (always available) */
    cantrips: InnateSpell[];

    /** Spells the enemy knows (may have limited slots) */
    spells: InnateSpell[];

    /** Spell slots available per level { level: count } */
    slots: Record<number, number>;
}

/**
 * SPELL_SLOTS_BY_CR - Spell slot progression by Challenge Rating
 *
 * Maps CR values to the number of spell slots available.
 * Higher CR enemies have more spell slots and higher level spells.
 *
 * Slot format: { level1: slots, level2: slots, ... }
 *
 * CR 0-0.5: No spellcasting (minions)
 * CR 1-2: Level 1 only (basic casters)
 * CR 3-4: Levels 1-2 (moderate casters)
 * CR 5-7: Levels 1-3 (strong casters)
 * CR 8+: Levels 1-4 (boss casters)
 */
export const SPELL_SLOTS_BY_CR: Record<number, Record<number, number>> = {
    // CR 0-0.5: No spellcasting or cantrips only
    0: {},
    0.125: {},
    0.25: {},
    0.5: {},

    // CR 1: Basic caster (3 level 1 slots)
    1: { 1: 3 },

    // CR 2: Basic caster (4 level 1 slots)
    2: { 1: 4 },

    // CR 3: Moderate caster (4 level 1, 2 level 2)
    3: { 1: 4, 2: 2 },

    // CR 4: Moderate caster (4 level 1, 3 level 2)
    4: { 1: 4, 2: 3 },

    // CR 5: Strong caster (4 level 1, 3 level 2, 2 level 3)
    5: { 1: 4, 2: 3, 3: 2 },

    // CR 6-7: Strong caster progression
    6: { 1: 4, 2: 3, 3: 3 },
    7: { 1: 4, 2: 3, 3: 3 },

    // CR 8+: Boss caster (highest level spells)
    8: { 1: 4, 2: 3, 3: 3, 4: 1 },
    9: { 1: 4, 2: 3, 3: 3, 4: 2 },
    10: { 1: 4, 2: 3, 3: 3, 4: 2 },
};

/**
 * Spell lists by archetype
 *
 * Each archetype has access to spells fitting their combat role:
 * - Support: Buffs, debuffs, healing (Bless, Bane, Cure Wounds)
 * - Archer: Utility, escape, crowd control (Misty Step, Hold Person)
 * - Brute: Damage, self-buffs (Burning Hands, Divine Favor)
 */
const SPELL_LISTS: Record<EnemyArchetype, SpellList> = {
    support: {
        archetype: 'support',
        cantrips: [
            {
                id: 'support_sacred_flame',
                name: 'Sacred Flame',
                level: 0,
                school: 'evocation',
                effect: 'A flame of divine brightness springs from your hand. Deals radiant damage to one target.',
                damage: '1d8',
                damageType: 'radiant',
                range: 60,
                tags: ['damage', 'ranged']
            },
            {
                id: 'support_guidance',
                name: 'Guidance',
                level: 0,
                school: 'divination',
                effect: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.',
                range: 30,
                concentration: false,
                tags: ['buff', 'utility']
            },
            {
                id: 'support_resistance',
                name: 'Resistance',
                level: 0,
                school: 'abjuration',
                effect: 'You touch one willing creature. The target gains resistance to one damage type of your choice until the spell ends.',
                range: 30,
                concentration: true,
                tags: ['buff', 'defense']
            }
        ],
        level1: [
            {
                id: 'support_bless',
                name: 'Bless',
                level: 1,
                school: 'enchantment',
                effect: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or saving throw before the spell ends, the target can roll a d4 and add the number rolled to the d20.',
                range: 30,
                concentration: true,
                tags: ['buff', 'ally', 'multi-target']
            },
            {
                id: 'support_bane',
                name: 'Bane',
                level: 1,
                school: 'enchantment',
                effect: 'Up to three creatures of your choice that you can see within range must make a Wisdom saving throw. On a failed save, the target has disadvantage on attack rolls for the duration.',
                save: 'WIS',
                range: 30,
                concentration: true,
                tags: ['debuff', 'control']
            },
            {
                id: 'support_cure_wounds',
                name: 'Cure Wounds',
                level: 1,
                school: 'evocation',
                effect: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.',
                range: 30,
                tags: ['healing', 'ally']
            },
            {
                id: 'support_healing_word',
                name: 'Healing Word',
                level: 1,
                school: 'evocation',
                effect: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.',
                range: 60,
                tags: ['healing', 'ally', 'bonus-action']
            },
            {
                id: 'support_command',
                name: 'Command',
                level: 1,
                school: 'enchantment',
                effect: 'You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom save or follow the command on its next turn.',
                save: 'WIS',
                range: 60,
                tags: ['control', 'debuff']
            }
        ],
        level2: [
            {
                id: 'support_aid',
                name: 'Aid',
                level: 2,
                school: 'evocation',
                effect: 'Your spell bolsters your allies with toughness and resolve. Up to three creatures gain temporary hit points and advantage on certain ability checks.',
                range: 30,
                tags: ['buff', 'ally', 'multi-target']
            },
            {
                id: 'support_lesser_restoration',
                name: 'Lesser Restoration',
                level: 2,
                school: 'abjuration',
                effect: 'You touch a creature and can end either one disease or one condition afflicting it. The condition can be blinded, deafened, paralyzed, or poisoned.',
                range: 30,
                tags: ['healing', 'ally', 'utility']
            },
            {
                id: 'support_spiritual_weapon',
                name: 'Spiritual Weapon',
                level: 2,
                school: 'evocation',
                effect: 'You create a spectral weapon within range. It can be used to attack, dealing force damage on a hit.',
                damage: '1d8 + 1',
                damageType: 'force',
                range: 60,
                concentration: false,
                tags: ['summon', 'damage']
            },
            {
                id: 'support_shatter',
                name: 'Shatter',
                level: 2,
                school: 'evocation',
                effect: 'A sudden loud ringing sound, painfully intense, erupts from a point of your choice within range. Each creature in a 10-foot-radius sphere must make a Constitution saving throw.',
                damage: '3d8',
                damageType: 'thunder',
                save: 'CON',
                range: 60,
                tags: ['damage', 'aoe']
            }
        ],
        level3: [
            {
                id: 'support_spirit_guardians',
                name: 'Spirit Guardians',
                level: 3,
                school: 'conjuration',
                effect: 'You call forth spirits to protect you. The spirits are intangible, spectral guardians that flank you. Each creature of your choice that you can see within range must succeed on a Wisdom saving throw or be restrained.',
                damage: '2d8',
                damageType: 'radiant',
                save: 'WIS',
                range: 30,
                concentration: true,
                tags: ['defense', 'control', 'aoe']
            },
            {
                id: 'support_revivify',
                name: 'Revivify',
                level: 3,
                school: 'conjuration',
                effect: 'You touch a creature that has died within the last minute. That creature returns to life with 1 hit point.',
                range: 30,
                tags: ['healing', 'ally', 'utility']
            },
            {
                id: 'support_mass_healing_word',
                name: 'Mass Healing Word',
                level: 3,
                school: 'evocation',
                effect: 'Up to six creatures of your choice that you can see within range regain hit points equal to 1d4 + your spellcasting ability modifier.',
                range: 60,
                tags: ['healing', 'ally', 'multi-target']
            }
        ]
    },

    archer: {
        archetype: 'archer',
        cantrips: [
            {
                id: 'archer_ray_of_frost',
                name: "Ray of Frost",
                level: 0,
                school: 'evocation',
                effect: 'A frigid beam of blue-white light streaks toward a creature within range. On a hit, the target takes cold damage and its speed is reduced by 10 feet until the start of your next turn.',
                damage: '1d8',
                damageType: 'cold',
                range: 60,
                tags: ['damage', 'control', 'ranged']
            },
            {
                id: 'archer_shocking_grasp',
                name: 'Shocking Grasp',
                level: 0,
                school: 'evocation',
                effect: 'Lightning springs from your hand to deliver a shock to a creature you try to touch. The target takes lightning damage and cannot take reactions until its next turn.',
                damage: '1d8',
                damageType: 'lightning',
                range: 30,
                tags: ['damage', 'melee', 'control']
            },
            {
                id: 'archer_true_strike',
                name: 'True Strike',
                level: 0,
                school: 'divination',
                effect: 'You extend your hand and point a finger at a target in range. Your magic grants you a brief insight into the target\'s defenses. On your next turn, you gain advantage on your first attack roll against the target.',
                range: 30,
                tags: ['buff', 'self']
            }
        ],
        level1: [
            {
                id: 'archer_misty_step',
                name: 'Misty Step',
                level: 1,
                school: 'conjuration',
                effect: 'You briefly vanish from existence and teleport to a nearby space. During your next turn, you gain advantage on the first melee attack you make against an enemy.',
                range: 90,
                tags: ['mobility', 'escape', 'buff']
            },
            {
                id: 'archer_hold_person',
                name: 'Hold Person',
                level: 1,
                school: 'enchantment',
                effect: 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.',
                save: 'WIS',
                range: 60,
                concentration: true,
                tags: ['control', 'debuff']
            },
            {
                id: 'archer_ray_of_sickness',
                name: 'Ray of Sickness',
                level: 1,
                school: 'necromancy',
                effect: 'A ray of sickening greenish energy lashes out toward a creature within range. The target must make a Constitution saving throw or take poison damage and have disadvantage on its next attack.',
                damage: '2d8',
                damageType: 'poison',
                save: 'CON',
                range: 60,
                tags: ['damage', 'debuff']
            },
            {
                id: 'archer_thunderwave',
                name: 'Thunderwave',
                level: 1,
                school: 'evocation',
                effect: 'A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube must make a Constitution saving throw or take thunder damage and be pushed 10 feet away.',
                damage: '2d8',
                damageType: 'thunder',
                save: 'CON',
                range: 30,
                tags: ['damage', 'aoe', 'control']
            }
        ],
        level2: [
            {
                id: 'archer_web',
                name: 'Web',
                level: 2,
                school: 'conjuration',
                effect: 'You cast a web of thick, sticky strands at a point within range. Creatures in the area must make a Dexterity saving throw or be restrained.',
                save: 'DEX',
                range: 60,
                concentration: false,
                tags: ['control', 'aoe', 'restrain']
            },
            {
                id: 'archer_invisibility',
                name: 'Invisibility',
                level: 2,
                school: 'illusion',
                effect: 'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person.',
                range: 30,
                concentration: true,
                tags: ['stealth', 'defense', 'utility']
            },
            {
                id: 'archer_melfs_acid_arrow',
                name: "Melf's Acid Arrow",
                level: 2,
                school: 'evocation',
                effect: 'A shimmering green arrow streaks toward a target within range and bursts in a spray of acid. The target takes acid damage immediately and additional acid damage at the end of its next turn.',
                damage: '4d4',
                damageType: 'acid',
                range: 90,
                tags: ['damage', 'ranged', 'dot']
            },
            {
                id: 'archer_scorching_ray',
                name: 'Scorching Ray',
                level: 2,
                school: 'evocation',
                effect: 'You focus elemental energy into a ray that deals fire damage to a target. The target ignites if it\'s wearing flammable gear.',
                damage: '4d6',
                damageType: 'fire',
                range: 60,
                tags: ['damage', 'ranged']
            }
        ],
        level3: [
            {
                id: 'archer_fly',
                name: 'Fly',
                level: 3,
                school: 'transmutation',
                effect: 'You touch a willing creature. The target gains a flying speed of 60 feet for the duration. When the spell ends, the target falls if it is still aloft.',
                range: 30,
                concentration: true,
                tags: ['mobility', 'buff', 'ally']
            },
            {
                id: 'archer_lightning_bolt',
                name: 'Lightning Bolt',
                level: 3,
                school: 'evocation',
                effect: 'A stroke of lightning forming a line 100 feet long and 5 feet wide bursts from you in a direction you choose. Each creature in the line must make a Dexterity saving throw.',
                damage: '8d6',
                damageType: 'lightning',
                save: 'DEX',
                range: 90,
                tags: ['damage', 'aoe']
            },
            {
                id: 'archer_gaseous_form',
                name: 'Gaseous Form',
                level: 3,
                school: 'transmutation',
                effect: 'You transform a willing creature you touch into a misty cloud for the duration. The creature can\'t talk or manipulate objects, and is immune to non-magical damage.',
                range: 30,
                concentration: false,
                tags: ['defense', 'utility', 'escape']
            }
        ]
    },

    brute: {
        archetype: 'brute',
        cantrips: [
            {
                id: 'brute_fire_bolt',
                name: 'Fire Bolt',
                level: 0,
                school: 'evocation',
                effect: 'You hurl a mote of fire at a creature or object within range. On a hit, the target takes fire damage.',
                damage: '1d10',
                damageType: 'fire',
                range: 60,
                tags: ['damage', 'ranged']
            },
            {
                id: 'brute_shillelagh',
                name: 'Shillelagh',
                level: 0,
                school: 'transmutation',
                effect: 'The wood of a club or quarterstaff you are holding becomes imbued with magic. For the duration, your weapon deals magical damage and has its damage die increased.',
                damage: '1d8',
                damageType: 'force',
                range: 30,
                concentration: true,
                tags: ['buff', 'self', 'melee']
            },
            {
                id: 'brute_thorn_whip',
                name: 'Thorn Whip',
                level: 0,
                school: 'conjuration',
                effect: 'You create a long, vine-like whip covered in thorns that lashes out at your command toward a creature you can see.',
                damage: '1d6',
                damageType: 'piercing',
                range: 30,
                tags: ['damage', 'ranged', 'control']
            }
        ],
        level1: [
            {
                id: 'brute_burning_hands',
                name: 'Burning Hands',
                level: 1,
                school: 'evocation',
                effect: 'As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw.',
                damage: '3d6',
                damageType: 'fire',
                save: 'DEX',
                range: 30,
                tags: ['damage', 'aoe']
            },
            {
                id: 'brute_divine_favor',
                name: 'Divine Favor',
                level: 1,
                school: 'evocation',
                effect: 'Your prayer empowers you with divine energy. You gain advantage on the first attack roll you make during the spell\'s duration.',
                range: 30,
                tags: ['buff', 'self']
            },
            {
                id: 'brute_magic_stone',
                name: 'Magic Stone',
                level: 1,
                school: 'transmutation',
                effect: 'You touch one to three pebbles and imbue them with magic. You or another creature can make a ranged spell attack with one of the stones, dealing bludgeoning damage.',
                damage: '1d6 + 1',
                damageType: 'bludgeoning',
                range: 30,
                tags: ['damage', 'ranged']
            },
            {
                id: 'brute_zephyr_strike',
                name: 'Zephyr Strike',
                level: 1,
                school: 'evocation',
                effect: 'You create a gust of wind that pushes a creature away from you. The target must succeed on a Strength saving throw or be pushed 15 feet away.',
                save: 'STR',
                range: 30,
                tags: ['control', 'push']
            }
        ],
        level2: [
            {
                id: 'brute_shatter',
                name: 'Shatter',
                level: 2,
                school: 'evocation',
                effect: 'A sudden loud ringing sound, painfully intense, erupts from a point of your choice within range. Each creature in a 10-foot-radius sphere must make a Constitution saving throw.',
                damage: '3d8',
                damageType: 'thunder',
                save: 'CON',
                range: 60,
                tags: ['damage', 'aoe']
            },
            {
                id: 'brute_branding_smite',
                name: 'Branding Smite',
                level: 2,
                school: 'evocation',
                effect: 'The next time you hit a creature with a melee weapon attack during this spell\'s duration, your weapon flares with bright light and deals an extra 2d6 radiant damage.',
                damage: '2d6',
                damageType: 'radiant',
                range: 30,
                tags: ['damage', 'melee', 'buff']
            },
            {
                id: 'brute_spiritual_weapon',
                name: 'Spiritual Weapon',
                level: 2,
                school: 'evocation',
                effect: 'You create a spectral weapon within range. It can be used to attack, dealing force damage on a hit.',
                damage: '1d8 + 1',
                damageType: 'force',
                range: 60,
                concentration: false,
                tags: ['summon', 'damage']
            },
            {
                id: 'brute_flame_blade',
                name: 'Flame Blade',
                level: 2,
                school: 'evocation',
                effect: 'You evoke a fiery blade in your free hand. The blade is similar in size and shape to a scimitar and sheds bright light in a 10-foot radius.',
                damage: '3d6',
                damageType: 'fire',
                range: 30,
                concentration: true,
                tags: ['damage', 'melee']
            }
        ],
        level3: [
            {
                id: 'brute_call_lightning',
                name: 'Call Lightning',
                level: 3,
                school: 'conjuration',
                effect: 'A storm cloud appears in the shape of a cylinder that is 10 feet tall with a 10-foot radius and centered on a point you can see within range.',
                damage: '5d6',
                damageType: 'lightning',
                save: 'DEX',
                range: 90,
                concentration: true,
                tags: ['damage', 'aoe', 'control']
            },
            {
                id: 'brute_elemental_weapon',
                name: 'Elemental Weapon',
                level: 3,
                school: 'transmutation',
                effect: 'A nonmagical weapon you touch becomes a magic weapon. Choose one of the following damage types: acid, cold, fire, lightning, or thunder.',
                range: 30,
                tags: ['buff', 'melee', 'utility']
            },
            {
                id: 'brute_blur',
                name: 'Blur',
                level: 3,
                school: 'illusion',
                effect: 'Your body becomes blurred, shifting and wavering to all who can see you. Attacks against you have disadvantage unless the attacker can\'t see.',
                range: 30,
                concentration: true,
                tags: ['defense', 'debuff']
            }
        ]
    }
};

/**
 * Number of spells known by rarity tier
 *
 * Higher rarity enemies know more spells.
 * Format: { cantrips: count, spells: count }
 */
const SPELLS_BY_RARITY: Record<EnemyRarity, { cantrips: number; spells: number }> = {
    common: { cantrips: 1, spells: 1 },
    uncommon: { cantrips: 2, spells: 2 },
    elite: { cantrips: 2, spells: 3 },
    boss: { cantrips: 3, spells: 4 }
};

/**
 * Maximum spell level available by rarity
 *
 * Higher rarity enemies can access higher level spells.
 */
const MAX_SPELL_LEVEL_BY_RARITY: Record<EnemyRarity, number> = {
    common: 1,
    uncommon: 2,
    elite: 3,
    boss: 4
};

/**
 * Spellcasting generation options
 */
export interface SpellcastingGenerationOptions {
    /** Enemy archetype for spell selection */
    archetype: EnemyArchetype;

    /** Enemy rarity for spell count and level limits */
    rarity: EnemyRarity;

    /** Challenge Rating for slot determination */
    cr: number;

    /** Seed for deterministic spell selection */
    seed: string;
}

/**
 * Spellcasting generation options with RNG
 *
 * Same as SpellcastingGenerationOptions but accepts SeededRNG directly.
 */
export interface SpellcastingGenerationOptionsWithRNG {
    /** Enemy archetype for spell selection */
    archetype: EnemyArchetype;

    /** Enemy rarity for spell count and level limits */
    rarity: EnemyRarity;

    /** Challenge Rating for slot determination */
    cr: number;

    /** RNG instance for deterministic spell selection */
    rng: SeededRNG;
}

/**
 * SpellcastingGenerator - Static class for generating enemy spellcasting
 *
 * Generates spell lists and slot configurations for enemy casters.
 * Uses deterministic seeded selection for reproducibility.
 */
export class SpellcastingGenerator {
    /**
     * Generate a spell list for an enemy
     *
     * Selects spells based on archetype, rarity, and CR.
     * Higher rarity enemies get more spells and higher level access.
     *
     * @param options - Spell generation options
     * @returns Spell configuration with spells and slots
     *
     * @example
     * ```typescript
     * const spellcasting = SpellcastingGenerator.generateSpellList({
     *   archetype: 'support',
     *   rarity: 'elite',
     *   cr: 3,
     *   seed: 'shaman-1'
     * });
     * // Returns: { cantrips: [...], spells: [...], slots: { 1: 4, 2: 2 } }
     * ```
     */
    static generateSpellList(options: SpellcastingGenerationOptions): SpellcastingConfig {
        const { archetype, rarity, cr, seed } = options;
        const rng = new SeededRNG(seed);

        // Get spell list for archetype
        const spellList = SPELL_LISTS[archetype];

        // Get spell counts for rarity
        const spellCounts = SPELLS_BY_RARITY[rarity];
        const maxSpellLevel = MAX_SPELL_LEVEL_BY_RARITY[rarity];

        // Select cantrips
        const selectedCantrips: InnateSpell[] = [];
        const availableCantrips = [...spellList.cantrips];

        for (let i = 0; i < spellCounts.cantrips && availableCantrips.length > 0; i++) {
            const index = rng.randomInt(0, availableCantrips.length);
            const cantrip = availableCantrips[index]!;
            selectedCantrips.push(cantrip);
            // Remove to avoid duplicates
            availableCantrips.splice(index, 1);
        }

        // Select leveled spells from available levels
        const selectedSpells: InnateSpell[] = [];
        const spellLevels = [1, 2, 3, 4] as const;

        for (const level of spellLevels) {
            if (level > maxSpellLevel) {
                break; // Stop if above max spell level for rarity
            }

            // Get spells at this level
            const levelSpells = spellList[`level${level}` as keyof SpellList] as InnateSpell[] | undefined;
            if (!levelSpells || levelSpells.length === 0) {
                continue;
            }

            // Determine how many spells to select from this level
            const slotsForLevel = SPELL_SLOTS_BY_CR[cr]?.[level];
            if (!slotsForLevel || slotsForLevel === 0) {
                continue; // No slots available for this level at this CR
            }

            // Randomly select from spells at this level
            const availableAtLevel = [...levelSpells];
            for (let i = 0; i < slotsForLevel && availableAtLevel.length > 0; i++) {
                const index = rng.randomInt(0, availableAtLevel.length);
                const spell = availableAtLevel[index]!;
                selectedSpells.push(spell);
                // Remove to avoid duplicates
                availableAtLevel.splice(index, 1);
            }
        }

        // Fill remaining spell slots with random selections if needed
        const totalSlotsNeeded = spellCounts.spells - selectedSpells.length;
        if (totalSlotsNeeded > 0) {
            const allSpells: InnateSpell[] = [];
            for (const level of spellLevels) {
                if (level > maxSpellLevel) break;
                const levelSpells = spellList[`level${level}` as keyof SpellList] as InnateSpell[] | undefined;
                if (levelSpells) {
                    allSpells.push(...levelSpells);
                }
            }

            const availableAll = [...allSpells];
            for (let i = 0; i < totalSlotsNeeded && availableAll.length > 0; i++) {
                const index = rng.randomInt(0, availableAll.length);
                const spell = availableAll[index]!;
                // Avoid duplicates
                if (!selectedSpells.some(s => s.id === spell.id)) {
                    selectedSpells.push(spell);
                }
                availableAll.splice(index, 1);
            }
        }

        // Get spell slots from CR
        const slots = SpellcastingGenerator.getSpellSlotsForCR(cr);

        return {
            cantrips: selectedCantrips,
            spells: selectedSpells,
            slots
        };
    }

    /**
     * Generate a spell list for an enemy using provided RNG
     *
     * Same as generateSpellList but accepts SeededRNG directly.
     * Useful when you already have a seeded RNG instance.
     *
     * @param options - Spell generation options with RNG
     * @returns Spell configuration with spells and slots
     *
     * @example
     * ```typescript
     * const spellcasting = SpellcastingGenerator.generateSpellListWithRNG({
     *   archetype: 'support',
     *   rarity: 'elite',
     *   cr: 3,
     *   rng: seededRNG
     * });
     * // Returns: { cantrips: [...], spells: [...], slots: { 1: 4, 2: 2 } }
     * ```
     */
    static generateSpellListWithRNG(options: SpellcastingGenerationOptionsWithRNG): SpellcastingConfig {
        const { archetype, rarity, cr, rng } = options;

        // Get spell list for archetype
        const spellList = SPELL_LISTS[archetype];

        // Get spell counts for rarity
        const spellCounts = SPELLS_BY_RARITY[rarity];
        const maxSpellLevel = MAX_SPELL_LEVEL_BY_RARITY[rarity];

        // Select cantrips
        const selectedCantrips: InnateSpell[] = [];
        const availableCantrips = [...spellList.cantrips];

        for (let i = 0; i < spellCounts.cantrips && availableCantrips.length > 0; i++) {
            const index = rng.randomInt(0, availableCantrips.length);
            const cantrip = availableCantrips[index]!;
            selectedCantrips.push(cantrip);
            // Remove to avoid duplicates
            availableCantrips.splice(index, 1);
        }

        // Select leveled spells from available levels
        const selectedSpells: InnateSpell[] = [];
        const spellLevels = [1, 2, 3, 4] as const;

        for (const level of spellLevels) {
            if (level > maxSpellLevel) {
                break; // Stop if above max spell level for rarity
            }

            // Get spells at this level
            const levelSpells = spellList[`level${level}` as keyof SpellList] as InnateSpell[] | undefined;
            if (!levelSpells || levelSpells.length === 0) {
                continue;
            }

            // Determine how many spells to select from this level
            const slotsForLevel = SPELL_SLOTS_BY_CR[cr]?.[level];
            if (!slotsForLevel || slotsForLevel === 0) {
                continue; // No slots available for this level at this CR
            }

            // Randomly select from spells at this level
            const availableAtLevel = [...levelSpells];
            for (let i = 0; i < slotsForLevel && availableAtLevel.length > 0; i++) {
                const index = rng.randomInt(0, availableAtLevel.length);
                const spell = availableAtLevel[index]!;
                selectedSpells.push(spell);
                // Remove to avoid duplicates
                availableAtLevel.splice(index, 1);
            }
        }

        // Fill remaining spell slots with random selections if needed
        const totalSlotsNeeded = spellCounts.spells - selectedSpells.length;
        if (totalSlotsNeeded > 0) {
            const allSpells: InnateSpell[] = [];
            for (const level of spellLevels) {
                if (level > maxSpellLevel) break;
                const levelSpells = spellList[`level${level}` as keyof SpellList] as InnateSpell[] | undefined;
                if (levelSpells) {
                    allSpells.push(...levelSpells);
                }
            }

            const availableAll = [...allSpells];
            for (let i = 0; i < totalSlotsNeeded && availableAll.length > 0; i++) {
                const index = rng.randomInt(0, availableAll.length);
                const spell = availableAll[index]!;
                // Avoid duplicates
                if (!selectedSpells.some(s => s.id === spell.id)) {
                    selectedSpells.push(spell);
                }
                availableAll.splice(index, 1);
            }
        }

        // Get spell slots from CR
        const slots = SpellcastingGenerator.getSpellSlotsForCR(cr);

        return {
            cantrips: selectedCantrips,
            spells: selectedSpells,
            slots
        };
    }

    /**
     * Get spell slot configuration for a CR
     *
     * Returns the number of spell slots available per level.
     * Handles fractional CR by rounding up to nearest slot tier.
     *
     * @param cr - Challenge rating
     * @returns Spell slots per level { level: count }
     *
     * @example
     * ```typescript
     * getSpellSlotsForCR(3); // Returns: { 1: 4, 2: 2 }
     * getSpellSlotsForCR(0.5); // Returns: {}
     * ```
     */
    static getSpellSlotsForCR(cr: number): Record<number, number> {
        // Find the highest CR tier that our CR meets or exceeds
        const crTiers = Object.keys(SPELL_SLOTS_BY_CR).map(Number).sort((a, b) => a - b);

        let selectedCR = 0;
        for (const tier of crTiers) {
            if (cr >= tier) {
                selectedCR = tier;
            } else {
                // Stop when we find a tier higher than our CR
                break;
            }
        }

        return SPELL_SLOTS_BY_CR[selectedCR] || {};
    }

    /**
     * Check if an archetype can cast spells
     *
     * Currently all archetypes have spell lists available.
     * This is a utility method for future expansion.
     *
     * @param archetype - Enemy archetype to check
     * @returns True if archetype has spellcasting capability
     */
    static archetypeCanCast(archetype: EnemyArchetype): boolean {
        return Object.prototype.hasOwnProperty.call(SPELL_LISTS, archetype);
    }

    /**
     * Get all spells for an archetype
     *
     * Returns the complete spell list for an archetype.
     *
     * @param archetype - Enemy archetype
     * @returns Complete spell list or undefined
     */
    static getSpellListForArchetype(archetype: EnemyArchetype): SpellList | undefined {
        return SPELL_LISTS[archetype];
    }

    /**
     * Convert a spell to a Feature object
     *
     * Creates a ClassFeature-compatible object from an InnateSpell.
     * Used to add spells to enemy ability lists.
     *
     * @param spell - The spell to convert
     * @returns Feature object with isSpell property
     *
     * @example
     * ```typescript
     * const spellFeature = SpellcastingGenerator.spellToFeature(blessSpell);
     * // Returns: { id: 'support_bless', name: 'Bless', ..., isSpell: true }
     * ```
     */
    static spellToFeature(spell: InnateSpell): Record<string, unknown> & { isSpell: boolean } {
        return {
            id: spell.id,
            name: spell.name,
            description: spell.effect,
            type: spell.level === 0 ? 'cantrip' as const : 'active' as const,
            class: 'Enemy' as const,
            level: spell.level,
            source: 'spellcasting' as const,
            tags: spell.tags || [],
            // Mark this as a spell for combat integration
            isSpell: true,
            // Include spell-specific data
            school: spell.school,
            damage: spell.damage,
            damageType: spell.damageType,
            save: spell.save,
            range: spell.range,
            concentration: spell.concentration
        };
    }

    /**
     * Convert all spellcasting config to feature objects
     *
     * Converts cantrips and spells to an array of Feature objects.
     *
     * @param config - Spell configuration from generateSpellList
     * @returns Array of feature objects with isSpell property
     *
     * @example
     * ```typescript
     * const config = generateSpellList(...);
     * const features = SpellcastingGenerator.spellsToFeatures(config);
     * // Returns: [feature1, feature2, ...] all with isSpell: true
     * ```
     */
    static spellsToFeatures(config: SpellcastingConfig): Array<Record<string, unknown> & { isSpell: boolean }> {
        const features: Array<Record<string, unknown> & { isSpell: boolean }> = [];

        // Add cantrips
        for (const cantrip of config.cantrips) {
            features.push(SpellcastingGenerator.spellToFeature(cantrip));
        }

        // Add leveled spells
        for (const spell of config.spells) {
            features.push(SpellcastingGenerator.spellToFeature(spell));
        }

        return features;
    }

    /**
     * Check if an enemy should have spellcasting
     *
     * Enemies with the "support" archetype or those with specific
     * template flags would have spellcasting.
     *
     * This is a heuristic - the template may also have a
     * "spellcaster" flag in V2 enhancements.
     *
     * @param archetype - Enemy archetype
     * @param rarity - Enemy rarity
     * @returns True if enemy should get spellcasting
     */
    static shouldHaveSpellcasting(archetype: EnemyArchetype, rarity: EnemyRarity): boolean {
        // Support archetype always gets spellcasting
        if (archetype === 'support') {
            return true;
        }

        // Higher rarity archers and brutes may have spellcasting
        if (rarity === 'elite' || rarity === 'boss') {
            return true;
        }

        // Common/uncommon archers and brutes typically don't cast
        return false;
    }
}
