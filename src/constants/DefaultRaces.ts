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
    },
    'Elf': {
        ability_bonuses: { DEX: 2 },
        speed: 30,
        traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
        subraces: ['High Elf', 'Wood Elf', 'Dark Elf (Drow)'],
    },
    'Dwarf': {
        ability_bonuses: { CON: 2 },
        speed: 25,
        traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'],
        subraces: ['Hill Dwarf', 'Mountain Dwarf'],
    },
    'Halfling': {
        ability_bonuses: { DEX: 2 },
        speed: 25,
        traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
        subraces: ['Lightfoot', 'Stout'],
    },
    'Dragonborn': {
        ability_bonuses: { STR: 2, CHA: 1 },
        speed: 30,
        traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
        subraces: ['Chromatic', 'Metallic', 'Gem'],
    },
    'Gnome': {
        ability_bonuses: { INT: 2 },
        speed: 25,
        traits: ['Darkvision', 'Gnome Cunning'],
        subraces: ['Forest Gnome', 'Rock Gnome'],
    },
    'Half-Elf': {
        ability_bonuses: { CHA: 2 },
        speed: 30,
        traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
    },
    'Half-Orc': {
        ability_bonuses: { STR: 2, CON: 1 },
        speed: 30,
        traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
    },
    'Tiefling': {
        ability_bonuses: { CHA: 2, INT: 1 },
        speed: 30,
        traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
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
