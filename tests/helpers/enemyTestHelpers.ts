/**
 * Test Helper Functions for Enemy Generation Tests
 *
 * Provides helper functions for building mock parties and characters
 * for enemy encounter generation testing.
 */

import type { CharacterSheet } from '../../src/core/types/Character.js';
import type { Race, Class } from '../../src/core/types/Character.js';

/**
 * Default character values for mock characters
 */
const DEFAULT_MOCK_CHARACTER = {
    ability_scores: {
        STR: 10,
        DEX: 10,
        CON: 10,
        INT: 10,
        WIS: 10,
        CHA: 10
    },
    ability_modifiers: {
        STR: 0,
        DEX: 0,
        CON: 0,
        INT: 0,
        WIS: 0,
        CHA: 0
    },
    proficiency_bonus: 2,
    hp: {
        current: 10,
        max: 10,
        temp: 0
    },
    armor_class: 10,
    initiative: 0,
    speed: 30,
    skills: {},
    saving_throws: {
        STR: false,
        DEX: false,
        CON: false,
        INT: false,
        WIS: false,
        CHA: false
    },
    racial_traits: [],
    class_features: [],
    equipment: {
        weapons: [],
        armor: [],
        items: [],
        totalWeight: 0,
        equippedWeight: 0
    },
    spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
    },
    xp: {
        current: 0,
        next_level: 1000
    }
};

/**
 * HP values by level for a typical martial character (Fighter, d10 HD)
 * Used for creating realistic mock characters
 */
const MARTIAL_HP_BY_LEVEL: Record<number, number> = {
    1: 10, 2: 19, 3: 28, 4: 37, 5: 46,
    6: 55, 7: 64, 8: 73, 9: 82, 10: 91,
    11: 100, 12: 109, 13: 118, 14: 127, 15: 136,
    16: 145, 17: 154, 18: 163, 19: 172, 20: 181
};

/**
 * HP values by level for a typical caster character (Wizard, d6 HD)
 * Used for creating realistic mock characters
 */
const CASTER_HP_BY_LEVEL: Record<number, number> = {
    1: 6, 2: 11, 3: 16, 4: 21, 5: 26,
    6: 31, 7: 36, 8: 41, 9: 46, 10: 51,
    11: 56, 12: 61, 13: 66, 14: 71, 15: 76,
    16: 81, 17: 86, 18: 91, 19: 96, 20: 101
};

/**
 * Proficiency bonus by level (D&D 5e)
 */
const PROFICIENCY_BY_LEVEL: Record<number, number> = {
    1: 2, 2: 2, 3: 2, 4: 2,
    5: 3, 6: 3, 7: 3, 8: 3,
    9: 4, 10: 4, 11: 4, 12: 4,
    13: 5, 14: 5, 15: 5, 16: 5,
    17: 6, 18: 6, 19: 6, 20: 6
};

/**
 * Ability scores by level for optimized characters
 */
const OPTIMIZED_ABILITIES: Record<number, Partial<{ STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number }>> = {
    1: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
    5: { STR: 18, DEX: 16, CON: 16, INT: 10, WIS: 10, CHA: 10 },
    10: { STR: 20, DEX: 18, CON: 18, INT: 12, WIS: 12, CHA: 12 },
    15: { STR: 20, DEX: 20, CON: 20, INT: 14, WIS: 14, CHA: 14 },
    20: { STR: 20, DEX: 20, CON: 20, INT: 18, WIS: 18, CHA: 18 }
};

/**
 * Calculate ability modifiers from ability scores
 */
function getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

/**
 * Create a mock character with specified level and optional overrides
 *
 * @param level - Character level (1-20)
 * @param overrides - Optional properties to override defaults
 * @returns A mock CharacterSheet for testing
 *
 * @example
 * ```ts
 * const level1Fighter = createMockPartyCharacter(1, {
 *     name: 'Thorin',
 *     class: 'Fighter' as const
 * });
 * ```
 */
export function createMockPartyCharacter(
    level: number = 1,
    overrides?: Partial<CharacterSheet>
): CharacterSheet {
    // Clamp level to valid range
    const clampedLevel = Math.max(1, Math.min(20, level));

    // Get appropriate HP based on class type (default to martial)
    const isCaster = overrides?.class === 'Wizard' ||
                    overrides?.class === 'Sorcerer' ||
                    overrides?.class === 'Druid';
    const hpTable = isCaster ? CASTER_HP_BY_LEVEL : MARTIAL_HP_BY_LEVEL;
    const maxHP = hpTable[clampedLevel] || MARTIAL_HP_BY_LEVEL[1];

    // Get optimized abilities for this level or use defaults
    const abilities = OPTIMIZED_ABILITIES[clampedLevel] || OPTIMIZED_ABILITIES[1];

    return {
        name: `Level ${clampedLevel} Character`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        race: 'Human' as Race,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        class: 'Fighter' as Class,
        subrace: undefined,
        level: clampedLevel,
        ability_scores: {
            STR: abilities.STR || 10,
            DEX: abilities.DEX || 10,
            CON: abilities.CON || 10,
            INT: abilities.INT || 10,
            WIS: abilities.WIS || 10,
            CHA: abilities.CHA || 10
        },
        ability_modifiers: {
            STR: getModifier(abilities.STR || 10),
            DEX: getModifier(abilities.DEX || 10),
            CON: getModifier(abilities.CON || 10),
            INT: getModifier(abilities.INT || 10),
            WIS: getModifier(abilities.WIS || 10),
            CHA: getModifier(abilities.CHA || 10)
        },
        proficiency_bonus: PROFICIENCY_BY_LEVEL[clampedLevel] || 2,
        hp: {
            current: maxHP,
            max: maxHP,
            temp: 0
        },
        armor_class: 10 + getModifier(abilities.DEX || 10), // Base AC + DEX
        initiative: getModifier(abilities.DEX || 10),
        speed: 30,
        skills: {},
        saving_throws: {
            STR: false,
            DEX: false,
            CON: false,
            INT: false,
            WIS: false,
            CHA: false
        },
        racial_traits: [],
        class_features: [],
        equipment: {
            weapons: [],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0
        },
        spells: {
            spell_slots: {},
            known_spells: [],
            cantrips: []
        },
        xp: {
            current: 0,
            next_level: 1000
        },
        seed: `test-seed-${clampedLevel}`,
        generated_at: new Date().toISOString(),
        ...overrides
    };
}

/**
 * Create a mock party with uniform level characters
 *
 * @param size - Number of characters in the party
 * @param level - Level for all characters (default: 1)
 * @param baseName - Base name for characters (numbers will be appended)
 * @returns Array of mock CharacterSheet objects
 *
 * @example
 * ```ts
 * // Create a party of 4 level 3 characters
 * const party = createMockParty(4, 3);
 * ```
 */
export function createMockParty(
    size: number = 4,
    level: number = 1,
    baseName: string = 'Adventurer'
): CharacterSheet[] {
    const party: CharacterSheet[] = [];

    for (let i = 0; i < size; i++) {
        party.push(createMockPartyCharacter(level, {
            name: `${baseName} ${i + 1}`
        }));
    }

    return party;
}

/**
 * Create a mock party with varied level characters
 *
 * @param levels - Array of levels for each character
 * @param baseName - Base name for characters
 * @returns Array of mock CharacterSheet objects
 *
 * @example
 * ```ts
 * // Create a party with levels [1, 3, 5, 7]
 * const party = createMixedLevelParty([1, 3, 5, 7]);
 * ```
 */
export function createMixedLevelParty(
    levels: number[],
    baseName: string = 'Adventurer'
): CharacterSheet[] {
    return levels.map((level, index) =>
        createMockPartyCharacter(level, {
            name: `${baseName} ${index + 1}`
        })
    );
}

/**
 * Create a balanced D&D party (Fighter, Cleric, Wizard, Rogue)
 *
 * @param level - Level for all characters
 * @returns Array of 4 mock CharacterSheet objects representing a classic party
 *
 * @example
 * ```ts
 * const party = createBalancedParty(5);
 * // Returns: Fighter, Cleric, Wizard, Rogue all at level 5
 * ```
 */
export function createBalancedParty(level: number = 1): CharacterSheet[] {
    return [
        createMockPartyCharacter(level, {
            name: 'Fighter',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class: 'Fighter' as any,
            ability_scores: { STR: 16, DEX: 14, CON: 16, INT: 10, WIS: 10, CHA: 10 },
            ability_modifiers: { STR: 3, DEX: 2, CON: 3, INT: 0, WIS: 0, CHA: 0 },
            armor_class: 18 // Plate armor
        }),
        createMockPartyCharacter(level, {
            name: 'Cleric',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class: 'Cleric' as any,
            ability_scores: { STR: 10, DEX: 8, CON: 14, INT: 10, WIS: 16, CHA: 14 },
            ability_modifiers: { STR: 0, DEX: -1, CON: 2, INT: 0, WIS: 3, CHA: 2 },
            armor_class: 16 // Chain shirt + shield
        }),
        createMockPartyCharacter(level, {
            name: 'Wizard',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class: 'Wizard' as any,
            ability_scores: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 14, CHA: 10 },
            ability_modifiers: { STR: -1, DEX: 2, CON: 1, INT: 4, WIS: 2, CHA: 0 },
            armor_class: 12 // No armor, just DEX
        }),
        createMockPartyCharacter(level, {
            name: 'Rogue',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class: 'Rogue' as any,
            ability_scores: { STR: 10, DEX: 16, CON: 12, INT: 12, WIS: 12, CHA: 14 },
            ability_modifiers: { STR: 0, DEX: 3, CON: 1, INT: 1, WIS: 1, CHA: 2 },
            armor_class: 15 // Leather armor + high DEX
        })
    ];
}

/**
 * Create a high-level party for testing challenging encounters
 *
 * @param level - Level for all characters (default: 10)
 * @returns Array of 4 optimized high-level characters
 *
 * @example
 * ```ts
 * const highLevelParty = createHighLevelParty(10);
 * ```
 */
export function createHighLevelParty(level: number = 10): CharacterSheet[] {
    return createBalancedParty(level);
}

/**
 * Create a low-level party for testing basic encounters
 *
 * @returns Array of 4 level 1-3 characters
 *
 * @example
 * ```ts
 * const lowLevelParty = createLowLevelParty();
 * // Returns: levels 1, 2, 2, 3
 * ```
 */
export function createLowLevelParty(): CharacterSheet[] {
    return createMixedLevelParty([1, 2, 2, 3]);
}

/**
 * Create a solo adventuring party (single character)
 *
 * @param level - Level of the solo character
 * @param characterClass - Class of the solo character
 * @returns Array with single CharacterSheet
 *
 * @example
 * ```ts
 * const soloParty = createSoloParty(5, 'Fighter' as any);
 * ```
 */
export function createSoloParty(
    level: number = 1,
    characterClass?: Class
): CharacterSheet[] {
    const overrides: Partial<CharacterSheet> = {
        name: 'Solo Hero'
    };

    if (characterClass) {
        overrides.class = characterClass;
    }

    return [createMockPartyCharacter(level, overrides)];
}

/**
 * Preset party configurations for common test scenarios
 */
export const PARTY_PRESETS = {
    /** Level 1 party of 4 - standard starting group */
    LEVEL_1_PARTY_OF_4: () => createMockParty(4, 1),

    /** Level 3 party of 4 - early adventures */
    LEVEL_3_PARTY_OF_4: () => createMockParty(4, 3),

    /** Level 5 party of 4 - tier 2 characters */
    LEVEL_5_PARTY_OF_4: () => createMockParty(4, 5),

    /** Level 10 party of 4 - tier 3 characters */
    LEVEL_10_PARTY_OF_4: () => createMockParty(4, 10),

    /** Level 20 party of 4 - max level heroes */
    LEVEL_20_PARTY_OF_4: () => createMockParty(4, 20),

    /** Balanced party with diverse classes */
    BALANCED_PARTY_LEVEL_3: () => createBalancedParty(3),

    /** Mixed level party (1, 3, 5, 7) */
    MIXED_LEVEL_PARTY: () => createMixedLevelParty([1, 3, 5, 7]),

    /** Solo level 5 character */
    SOLO_LEVEL_5: () => createSoloParty(5),

    /** Large party of 6 level 3 characters */
    LARGE_PARTY: () => createMockParty(6, 3),

    /** Small party of 2 level 5 characters */
    SMALL_PARTY: () => createMockParty(2, 5)
} as const;
