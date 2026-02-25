/**
 * Default race data for D&D 5e
 *
 * This file contains the default race data entries including ability bonuses,
 * speed, traits, and subraces for each race in the game.
 *
 * Moved from src/utils/constants.ts as part of the file organization refactor
 * to prevent constants.ts from becoming unmanageable.
 */

import type { Race, Ability } from '../core/types/Character.js';
import { ExtensionManager } from '../core/extensions/ExtensionManager.js';

/**
 * Race data entry interface
 *
 * Defines the structure for race data including ability bonuses,
 * speed, traits, and optional subraces.
 *
 * This interface is used for default races stored in RACE_DATA
 * where the race name is the Record key, not a property.
 */
export interface RaceDataEntry {
    /** Ability score bonuses granted by this race */
    ability_bonuses: Partial<Record<Ability, number>>;

    /** Base walking speed in feet */
    speed: number;

    /** Racial traits granted by this race */
    traits: string[];

    /** Optional: Available subraces for this race */
    subraces?: string[];

    /** Optional: User-facing description of this race */
    description?: string;

    /** Optional icon URL for small UI display */
    icon?: string;

    /** Optional image URL for larger display */
    image?: string;
}

/**
 * Custom race data entry interface
 *
 * Defines the structure for custom race data registered via ExtensionManager.
 * Unlike RaceDataEntry (used for default races), custom races are stored as
 * an array where each entry includes the race name as a property.
 *
 * Used by the 'races.data' category in ExtensionManager.
 */
export interface CustomRaceDataEntry extends RaceDataEntry {
    /** The name of the race */
    race: string;
}

// Race data with ability score bonuses
const RACE_DATA_IMPL = {
    'Human': {
        ability_bonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
        speed: 30,
        traits: ['Versatile', 'Extra Language'],
        subraces: ['Calishite', 'Chondathan', 'Damaran', 'Illuskan', 'Mulan', 'Rashemi', 'Shou', 'Tethyrian', 'Turami'],
        description: 'Humans are the most adaptable and ambitious people among the common races. They have widely varying tastes, morals, and customs in the many different lands they call home. Their drive and their innovative spirit help them push boundaries and explore new frontiers.',
    },
    'Elf': {
        ability_bonuses: { DEX: 2 },
        speed: 30,
        traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
        subraces: ['High Elf', 'Wood Elf', 'Dark Elf (Drow)'],
        description: 'Elves are a magical people of otherworldly grace, living in the world but apart from it. They possess an innate connection to the Feywild and the natural world, with lifespans that measure in centuries. Elves value art, music, and nature, and their society emphasizes individual freedom and creative expression.',
    },
    'Dwarf': {
        ability_bonuses: { CON: 2 },
        speed: 25,
        traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'],
        subraces: ['Hill Dwarf', 'Mountain Dwarf'],
        description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. They stand well under 5 feet tall but are so broad and compact that they can weigh as much as a human. Dwarves value clan, tradition, and craftsmanship, often dwelling in mountains or underground kingdoms.',
    },
    'Halfling': {
        ability_bonuses: { DEX: 2 },
        speed: 25,
        traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
        subraces: ['Lightfoot', 'Stout'],
        description: 'The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense. They are comfortable and lucky, taking what life brings with good cheer. Standing about 3 feet tall, they appear relatively harmless and so have managed to survive for centuries in the shadow of empires and on the edges of wars.',
    },
    'Dragonborn': {
        ability_bonuses: { STR: 2, CHA: 1 },
        speed: 30,
        traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
        subraces: ['Chromatic', 'Metallic', 'Gem'],
        description: 'Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or tails. Proud and noble, they carry the blood of ancient dragons within them, granting them a breath weapon and resistance to elemental damage. They value honor and clan above all else.',
    },
    'Gnome': {
        ability_bonuses: { INT: 2 },
        speed: 25,
        traits: ['Darkvision', 'Gnome Cunning'],
        subraces: ['Forest Gnome', 'Rock Gnome'],
        description: 'Gnomes are inventive and curious, with an innate connection to the Illusory and magical arts. Standing about 3 to 3.5 feet tall, they approach problems with enthusiasm and optimism. Their society prizes humor, clever inventions, and arcane scholarship, with many gnomes becoming accomplished wizards, engineers, or pranksters.',
    },
    'Half-Elf': {
        ability_bonuses: { CHA: 2 },
        speed: 30,
        traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
        description: 'Half-elves combine the best qualities of their elven and human parents. They share the elves\' grace and curiosity, along with the humans\' drive and versatility. As natural diplomats and charismatic leaders, half-elves can fit into virtually any society, often serving as bridges between cultures.',
    },
    'Half-Orc': {
        ability_bonuses: { STR: 2, CON: 1 },
        speed: 30,
        traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
        description: 'Half-orcs inherit the physical prowess and cunning of their orcish ancestors, combined with the adaptability and ambition of their human heritage. They stand taller than most humans, with grayish skin, tusks, and faces that combine bestial and humanoid features. Half-orcs are often outcasts but prove themselves as ferocious warriors and loyal companions.',
    },
    'Tiefling': {
        ability_bonuses: { CHA: 2, INT: 1 },
        speed: 30,
        traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
        description: 'Tieflings are humanoids with infernal blood, often bearing horns, tails, and other fiendish features. Their ancestry grants them resistance to fire and innate magical abilities. Though often feared and distrusted due to their appearance, tieflings are as varied in morality and ambition as any other race, with many becoming powerful warlocks, sorcerers, or charismatic leaders.',
    },
};

export const RACE_DATA: Record<Race, RaceDataEntry> = RACE_DATA_IMPL as Record<Race, RaceDataEntry>;

/**
 * Default race data as an array (for ExtensionManager initialization)
 *
 * This converts RACE_DATA_IMPL from object format to array format (CustomRaceDataEntry[])
 * for use with ExtensionManager's 'races.data' category.
 *
 * Used by initializeRaceDataDefaults() to load default race data into ExtensionManager
 * at application startup, making it editable through the extension system.
 */
export const DEFAULT_RACE_DATA_ARRAY: CustomRaceDataEntry[] = Object.entries(RACE_DATA_IMPL).map(([raceName, data]) => ({
    race: raceName,
    ...data
}));

/**
 * Get race data (default or custom)
 *
 * This helper function retrieves race data from ExtensionManager's 'races.data' category.
 * Default races are loaded into ExtensionManager at startup via initializeRaceDataDefaults().
 *
 * @param race - The race name to look up
 * @returns Race data entry or undefined if not found
 *
 * @example
 * // Get default race data
 * const elfData = getRaceData('Elf');
 * console.log(elfData.speed); // 30
 *
 * // Get custom race data (if registered via ExtensionManager)
 * const dragonkinData = getRaceData('Dragonkin');
 * if (dragonkinData) {
 *     console.log(dragonkinData.ability_bonuses);
 * }
 */

// Cache for dynamically loaded ExtensionManager to avoid repeated imports
let extensionManagerModule: any = null;
let extensionManagerPromise: Promise<any> | null = null;

/**
 * Get race data asynchronously (default or custom)
 *
 * This function retrieves race data from ExtensionManager's 'races.data' category.
 * Default races are loaded into ExtensionManager at startup via initializeRaceDataDefaults().
 *
 * @param race - The race name to look up
 * @returns Race data entry or undefined if not found
 *
 * @example
 * // Get default race data
 * const elfData = await getRaceDataAsync('Elf');
 * console.log(elfData.speed); // 30
 *
 * // Get custom race data (if registered via ExtensionManager)
 * const dragonkinData = await getRaceDataAsync('Dragonkin');
 * if (dragonkinData) {
 *     console.log(dragonkinData.ability_bonuses);
 * }
 */
export async function getRaceDataAsync(race: string): Promise<RaceDataEntry | undefined> {
    // Check ExtensionManager for race data (includes both default and custom races)
    // The ExtensionManager is lazy-loaded to avoid circular dependencies
    try {
        if (!extensionManagerModule) {
            // Use dynamic import for ESM compatibility
            if (!extensionManagerPromise) {
                extensionManagerPromise = import('../core/extensions/ExtensionManager.js');
            }
            const module = await extensionManagerPromise;
            extensionManagerModule = module.ExtensionManager;
        }
        const manager = extensionManagerModule.getInstance();
        const raceData = manager.get('races.data' as any);

        if (raceData && Array.isArray(raceData)) {
            const raceEntry = raceData.find((d: any) => d.race === race);
            if (raceEntry) {
                return raceEntry as RaceDataEntry;
            }
        }
    } catch (error) {
        // ExtensionManager not available or not initialized
        // This is expected in some contexts (e.g., pure server-side)
    }

    return undefined;
}

/**
 * Get race data synchronously (default or custom)
 *
 * This function retrieves race data from ExtensionManager's 'races.data' category.
 * Default races are loaded into ExtensionManager at startup via initializeRaceDataDefaults().
 *
 * @param race - The race name to look up
 * @returns Race data entry or undefined if not found
 *
 * @example
 * // Get default race data
 * const elfData = getRaceData('Elf');
 * console.log(elfData.speed); // 30
 *
 * // Get custom race data (if registered via ExtensionManager)
 * const dragonkinData = getRaceData('Dragonkin');
 * if (dragonkinData) {
 *     console.log(dragonkinData.ability_bonuses);
 * }
 */
export function getRaceData(race: string): RaceDataEntry | undefined {
    // Check ExtensionManager for race data (includes both default and custom races)
    try {
        const manager = ExtensionManager.getInstance();
        const raceData = manager.get('races.data' as any);

        if (raceData && Array.isArray(raceData)) {
            const raceEntry = raceData.find((d: any) => d.race === race);
            if (raceEntry) {
                return raceEntry as RaceDataEntry;
            }
        }
    } catch (error) {
        // ExtensionManager not available or not initialized
        // This is expected in some contexts (e.g., pure server-side)
    }

    return undefined;
}
