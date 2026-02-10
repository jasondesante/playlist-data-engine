/**
 * D&D 5e data constants
 */

import type { Race, Class, Ability, Skill } from '../core/types/Character.js';
import { asRace } from '../core/types/Character.js';
import type { Spell, SpellPrerequisite } from '../core/spells/SpellTypes.js';
import { ExtensionManager } from '../core/extensions/ExtensionManager.js';
import type {
    EquipmentType,
    EquipmentRarity,
    EquipmentPropertyType,
    EquipmentCondition,
    EquipmentProperty,
    EquipmentMiniFeature
} from '../core/types/Equipment.js';

// Re-export spell types for backward compatibility
// Types are now defined in src/core/spells/SpellTypes.ts for better module organization
export type { Spell, SpellPrerequisite };

// Race data has been moved to src/constants/DefaultRaces.ts
// Re-export here for backward compatibility
export type { RaceDataEntry, CustomRaceDataEntry } from '../constants/DefaultRaces.js';
export { RACE_DATA, DEFAULT_RACE_DATA_ARRAY, getRaceData, getRaceDataAsync } from '../constants/DefaultRaces.js';

// Class data has been moved to src/constants/DefaultClasses.ts
// Import for internal use and re-export for backward compatibility
import { CLASS_DATA as IMPORTED_CLASS_DATA, ALL_CLASSES, CLASS_AUDIO_PREFERENCES } from '../constants/DefaultClasses.js';
export { CLASS_DATA, ALL_CLASSES, CLASS_AUDIO_PREFERENCES } from '../constants/DefaultClasses.js';

// Cache for dynamically loaded ExtensionManager to avoid repeated imports
// Used by getClassDataAsync and other async data lookup functions
let extensionManagerModule: any = null;
let extensionManagerPromise: Promise<any> | null = null;

/**
 * Class data entry interface
 *
 * Defines the structure for class data including primary ability, hit die,
 * saving throws, spellcasting, skills, expertise, and optional audio preferences.
 *
 * ## Template-Based Class System
 *
 * This interface supports creating custom classes that extend (inherit from) existing
 * D&D 5e base classes through the `baseClass` property. This enables rapid creation
 * of specialized classes (e.g., "Necromancer" extending "Wizard") without duplicating
 * all base class properties.
 *
 * ### How Template Inheritance Works
 *
 * When `baseClass` is specified in a custom class registration:
 *
 * 1. **Base class lookup**: The system retrieves the base class data from CLASS_DATA
 * 2. **Property merging**: Base class properties are merged with custom class properties
 * 3. **Override behavior**: Custom properties take precedence over base class properties
 * 4. **Special handling for available_skills**: Custom skill list replaces base skill list
 *    (not merged), allowing complete customization of class skills
 *
 * ### Example Usage
 *
 * ```typescript
 * import { ExtensionManager } from './core/extensions/ExtensionManager.js';
 *
 * const manager = ExtensionManager.getInstance();
 *
 * // Register a custom "Necromancer" class based on Wizard
 * manager.register('classes.data', [{
 *     name: 'Necromancer',
 *     baseClass: 'Wizard',  // Inherits from Wizard by default
 *     primary_ability: 'INT',  // Same as Wizard (could omit to inherit)
 *     hit_die: 8,  // Same as Wizard (could omit to inherit)
 *     saving_throws: ['INT', 'WIS'],  // Same as Wizard (could omit to inherit)
 *     is_spellcaster: true,  // Same as Wizard (could omit to inherit)
 *     skill_count: 2,  // Same as Wizard (could omit to inherit)
 *     // Override available_skills to include custom skill
 *     available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
 *     has_expertise: false  // Same as Wizard (could omit to inherit)
 * }]);
 * ```
 *
 * ### Complete Custom Classes
 *
 * Classes without `baseClass` are standalone and must specify all required properties:
 *
 * ```typescript
 * manager.register('classes.data', [{
 *     name: 'Runecaster',
 *     // No baseClass - must specify all properties
 *     primary_ability: 'WIS',
 *     hit_die: 8,
 *     saving_throws: ['WIS', 'CON'],
 *     is_spellcaster: true,
 *     skill_count: 3,
 *     available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
 *     has_expertise: false
 * }]);
 * ```
 *
 * ### Integration with Other Extension Categories
 *
 * Custom classes can be further customized with:
 *
 * - **Custom skills**: Register via `skills.${ABILITY}` categories
 * - **Custom features**: Register via `classFeatures.${ClassName}` categories
 * - **Custom spell lists**: Register via `classSpellLists.${ClassName}` categories
 * - **Custom spell slots**: Register via `classSpellSlots` category
 * - **Custom equipment**: Register via `classStartingEquipment.${ClassName}` categories
 *
 */
export interface ClassDataEntry {
    /** Class name (required for custom classes, optional for built-in classes where the key serves as the name) */
    name?: string;

    /** Primary ability score for this class */
    primary_ability: Ability;

    /** Hit die size for this class */
    hit_die: number;

    /** Saving throw proficiencies */
    saving_throws: Ability[];

    /** Whether this class can cast spells */
    is_spellcaster: boolean;

    /** Number of skills to choose from */
    skill_count: number;

    /** Available skills for this class (includes custom skills) */
    available_skills: string[];

    /** Whether this class has expertise */
    has_expertise: boolean;

    /** Number of expertise choices (if has_expertise is true) */
    expertise_count?: number;

    /**
     * For template-based classes: the base class to inherit from
     *
     * When specified, the custom class will inherit properties from the base class,
     * with custom properties overriding inherited ones. This enables rapid creation
     * of specialized classes (e.g., "Necromancer" extending "Wizard").
     *
     * The base class must be a valid D&D 5e class name (one of: Barbarian, Bard,
     * Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard).
     *
     * @example
     * // Necromancer extends Wizard
     * baseClass: 'Wizard'
     */
    baseClass?: Class;

    /** Optional: Audio preferences for class affinity calculation */
    audio_preferences?: {
        primary: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        secondary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        tertiary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        bass?: number;
        treble?: number;
        mid?: number;
        amplitude?: number;
    };

    /** Optional: User-facing description of this class */
    description?: string;
}

/**
 * Get class data (default or custom)
 *
 * This helper function retrieves class data from either:
 * 1. The default CLASS_DATA constant (for built-in classes)
 * 2. The ExtensionManager (for custom classes registered via 'classes.data')
 *
 * For template-based custom classes (those with a baseClass property),
 * the base class data is merged with custom data, with custom properties
 * taking precedence.
 *
 * @param className - The class name to look up
 * @returns Class data entry or undefined if not found
 *
 * @example
 * // Get default class data
 * const wizardData = getClassData('Wizard');
 * console.log(wizardData.hit_die); // 6
 *
 * // Get custom class data (if registered via ExtensionManager)
 * const necromancerData = getClassData('Necromancer');
 * if (necromancerData) {
 *     console.log(necromancerData.baseClass); // 'Wizard'
 *     console.log(necromancerData.primary_ability); // 'INT'
 * }
 */
/**
 * Get class data (default or custom) - asynchronous version
 *
 * This helper function retrieves class data from either:
 * 1. The default CLASS_DATA constant (for built-in classes)
 * 2. The ExtensionManager (for custom classes registered via 'classes.data')
 *
 * ## Template-Based Class Inheritance
 *
 * For template-based custom classes (those with a baseClass property),
 * the base class data is merged with custom data following these rules:
 *
 * 1. **Base class lookup**: Retrieves the base class data from CLASS_DATA
 * 2. **Shallow merge**: Base properties are spread first, then custom properties
 * 3. **Override behavior**: Custom properties take precedence over base properties
 * 4. **Special handling for available_skills**: The custom skill list completely replaces
 *    the base skill list (not merged), allowing complete customization
 *
 * The merge logic is:
 * ```typescript
 * {
 *     ...baseData,        // Base class properties first
 *     ...classEntry,      // Custom properties override base
 *     available_skills: classEntry.available_skills || baseData.available_skills
 * }
 * ```
 *
 * ### Usage Flow for Custom Classes
 *
 * 1. Register class data via `ExtensionManager.register('classes.data', [...])`
 * 2. Register class name via `ExtensionManager.register('classes', [asClass('Necromancer')])`
 * 3. Optionally register custom features, skills, spells, equipment
 * 4. Use `CharacterGenerator.generate()` with `forceClass: asClass('Necromancer')`
 *
 * @param className - The class name to look up
 * @returns Class data entry or undefined if not found
 *
 * @example
 * // Get default class data
 * const wizardData = await getClassDataAsync('Wizard');
 * console.log(wizardData.hit_die); // 6
 *
 * // Get custom class data (if registered via ExtensionManager)
 * const necromancerData = await getClassDataAsync('Necromancer');
 * if (necromancerData) {
 *     console.log(necromancerData.baseClass); // 'Wizard'
 *     console.log(necromancerData.primary_ability); // 'INT' (inherited from Wizard)
 *     console.log(necromancerData.available_skills); // ['arcana', 'medicine', 'religion', 'necromancy'] (custom)
 * }
 */
export async function getClassDataAsync(className: string): Promise<ClassDataEntry | undefined> {
    // Check default classes
    if (className in IMPORTED_CLASS_DATA) {
        return IMPORTED_CLASS_DATA[className];
    }

    // Check ExtensionManager for custom class data
    // Note: This is a dynamic check at runtime for custom classes
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
        const customClassData = manager.get('classes.data' as any);

        if (customClassData && Array.isArray(customClassData)) {
            const classEntry = customClassData.find((d: any) => d.name === className);
            if (classEntry) {
                // If has baseClass, merge with base class data
                if (classEntry.baseClass && classEntry.baseClass in IMPORTED_CLASS_DATA) {
                    const baseData = IMPORTED_CLASS_DATA[classEntry.baseClass];
                    // Merge base data with custom data, custom properties take precedence
                    return {
                        ...baseData,
                        ...classEntry,
                        // available_skills is completely replaced (not merged) when provided by custom class
                        available_skills: classEntry.available_skills || baseData.available_skills,
                    } as ClassDataEntry;
                }
                return classEntry as ClassDataEntry;
            }
        }
    } catch (error) {
        // ExtensionManager not available or not initialized
        // This is expected in some contexts (e.g., pure server-side)
    }

    return undefined;
}

/**
 * Get class data (default or custom)
 *
 * This helper function retrieves class data from either:
 * 1. The default CLASS_DATA constant (for built-in classes)
 * 2. The ExtensionManager (for custom classes registered via 'classes.data')
 *
 * ## Template-Based Class Inheritance
 *
 * For template-based custom classes (those with a baseClass property),
 * the base class data is merged with custom data following these rules:
 *
 * 1. **Base class lookup**: Retrieves the base class data from CLASS_DATA
 * 2. **Shallow merge**: Base properties are spread first, then custom properties
 * 3. **Override behavior**: Custom properties take precedence over base properties
 * 4. **Special handling for available_skills**: The custom skill list completely replaces
 *    the base skill list (not merged), allowing complete customization
 *
 * The merge logic is:
 * ```typescript
 * {
 *     ...baseData,        // Base class properties first
 *     ...classEntry,      // Custom properties override base
 *     available_skills: classEntry.available_skills || baseData.available_skills
 * }
 * ```
 *
 * ### Usage Flow for Custom Classes
 *
 * 1. Register class data via `ExtensionManager.register('classes.data', [...])`
 * 2. Register class name via `ExtensionManager.register('classes', [asClass('Necromancer')])`
 * 3. Optionally register custom features, skills, spells, equipment
 * 4. Use `CharacterGenerator.generate()` with `forceClass: asClass('Necromancer')`
 *
 * @param className - The class name to look up
 * @returns Class data entry or undefined if not found
 *
 * @example
 * // Get default class data
 * const wizardData = getClassData('Wizard');
 * console.log(wizardData.hit_die); // 6
 *
 * // Get custom class data (if registered via ExtensionManager)
 * const necromancerData = getClassData('Necromancer');
 * if (necromancerData) {
 *     console.log(necromancerData.baseClass); // 'Wizard'
 *     console.log(necromancerData.primary_ability); // 'INT' (inherited from Wizard)
 *     console.log(necromancerData.available_skills); // ['arcana', 'medicine', 'religion', 'necromancy'] (custom)
 * }
 */
export function getClassData(className: string): ClassDataEntry | undefined {
    // Check default classes
    if (className in IMPORTED_CLASS_DATA) {
        return IMPORTED_CLASS_DATA[className];
    }

    // Check ExtensionManager for custom class data
    try {
        const manager = ExtensionManager.getInstance();
        const customClassData = manager.get('classes.data' as any);

        if (customClassData && Array.isArray(customClassData)) {
            const classEntry = customClassData.find((d: any) => d.name === className);
            if (classEntry) {
                // If has baseClass, merge with base class data
                if (classEntry.baseClass && classEntry.baseClass in IMPORTED_CLASS_DATA) {
                    const baseData = IMPORTED_CLASS_DATA[classEntry.baseClass];
                    // Merge base data with custom data, custom properties take precedence
                    return {
                        ...baseData,
                        ...classEntry,
                        // available_skills is completely replaced (not merged) when provided by custom class
                        available_skills: classEntry.available_skills || baseData.available_skills,
                    } as ClassDataEntry;
                }
                return classEntry as ClassDataEntry;
            }
        }
    } catch (error) {
        // ExtensionManager not available or not initialized
        // This is expected in some contexts (e.g., pure server-side)
    }

    return undefined;
}

// XP thresholds for levels 1-20
export const XP_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 300,
    3: 900,
    4: 2700,
    5: 6500,
    6: 14000,
    7: 23000,
    8: 34000,
    9: 48000,
    10: 64000,
    11: 85000,
    12: 100000,
    13: 120000,
    14: 140000,
    15: 165000,
    16: 195000,
    17: 225000,
    18: 265000,
    19: 305000,
    20: 355000,
};

// Proficiency bonus by level
export const PROFICIENCY_BONUS: Record<number, number> = {
    1: 2, 2: 2, 3: 2, 4: 2,
    5: 3, 6: 3, 7: 3, 8: 3,
    9: 4, 10: 4, 11: 4, 12: 4,
    13: 5, 14: 5, 15: 5, 16: 5,
    17: 6, 18: 6, 19: 6, 20: 6,
};

// All races in order
export const ALL_RACES: Race[] = [
    asRace('Human'),
    asRace('Elf'),
    asRace('Dwarf'),
    asRace('Halfling'),
    asRace('Dragonborn'),
    asRace('Gnome'),
    asRace('Half-Elf'),
    asRace('Half-Orc'),
    asRace('Tiefling'),
];

// Adjective mapping for NamingEngine
/**
 * Centralized naming data for character name generation
 * Contains adjectives, descriptors, and word pools for various naming formats
 */
export const NAMING_DATA = {
    adjectives: {
        'techno': {
            bass: ['Thumping', 'Pulsing', 'Driving', 'Hypnotic', 'Relentless', 'Mechanical', 'Deep'],
            treble: ['Piercing', 'Synthetic', 'Digital', 'Sharp', 'Glittering', 'Laser'],
            mid: ['Driving', 'Rhythmic', 'Flowing', 'Seamless', 'Kinetic'],
            quiet: ['Minimal', 'Sparse', 'Subtle', 'Ambient', 'Whispered'],
            loud: ['Pounding', 'Overwhelming', 'Massive', 'Explosive', 'Crushing']
        },
        'rock': {
            bass: ['Heavy', 'Rumbling', 'Gritty', 'Raw', 'Crushing', 'Grinding'],
            treble: ['Screaming', 'Wailing', 'Soaring', 'Piercing', 'Shrill'],
            mid: ['Crunchy', 'Distorted', 'Overdriven', 'Gritty', 'Aggressive'],
            quiet: ['Acoustic', 'Stripped', 'Bare', 'Intimate', 'Unplugged'],
            loud: ['Thunderous', 'Explosive', 'Deafening', 'Roaring', 'Volcanic']
        },
        'metal': {
            bass: ['Brutal', 'Crushing', 'Punishing', 'Merciless', 'Devastating', 'Obliterating'],
            treble: ['Shredding', 'Screaming', 'Hellish', 'Demonic', 'Piercing'],
            mid: ['Chugging', 'Grinding', 'Relentless', 'Aggressive', 'Furious'],
            quiet: ['Doomed', 'Somber', 'Ominous', 'Foreboding', 'Dark'],
            loud: ['Deafening', 'Apocalyptic', 'Cataclysmic', 'Earth-Shattering', 'Monolithic']
        },
        'ambient': {
            bass: ['Deep', 'Vast', 'Profound', 'Oceanic', 'Cavernous', 'Abyssal'],
            treble: ['Ethereal', 'Crystalline', 'Shimmering', 'Celestial', 'Gossamer'],
            mid: ['Whispering', 'Drifting', 'Floating', 'Meandering', 'Breathing'],
            quiet: ['Silent', 'Hushed', 'Meditative', 'Peaceful', 'Tranquil'],
            loud: ['Swelling', 'Building', 'Crescendoing', 'Rising', 'Expanding']
        },
        'classical': {
            bass: ['Grand', 'Stately', 'Majestic', 'Regal', 'Noble', 'Profound'],
            treble: ['Soaring', 'Triumphant', 'Brilliant', 'Radiant', 'Gleaming'],
            mid: ['Noble', 'Elegant', 'Refined', 'Graceful', 'Poised'],
            quiet: ['Gentle', 'Delicate', 'Tender', 'Soft', 'Intimate'],
            loud: ['Majestic', 'Powerful', 'Commanding', 'Heroic', 'Epic']
        },
        'jazz': {
            bass: ['Smooth', 'Groovy', 'Walking', 'Swinging', 'Funky', 'Mellow'],
            treble: ['Bright', 'Crisp', 'Brilliant', 'Clear', 'Sparkling'],
            mid: ['Swinging', 'Syncopated', 'Bluesy', 'Soulful', 'Improvisational'],
            quiet: ['Cool', 'Laid-back', 'Subtle', 'Understated', 'Intimate'],
            loud: ['Big', 'Bold', 'Brassy', 'Energetic', 'Vibrant']
        },
        'hip hop': {
            bass: ['Bumping', 'Knocking', 'Booming', 'Heavy', 'Fat', 'Deep'],
            treble: ['Sharp', 'Crisp', 'Cutting', 'Bright', 'Piercing'],
            mid: ['Flowing', 'Smooth', 'Rhythmic', 'Funky', 'Grooving'],
            quiet: ['Chill', 'Mellow', 'Lo-fi', 'Smooth', 'Laid-back'],
            loud: ['Hype', 'Aggressive', 'Hard', 'Explosive', 'Banging']
        },
        'pop': {
            bass: ['Bouncy', 'Punchy', 'Groovy', 'Catchy', 'Upbeat'],
            treble: ['Sparkling', 'Bright', 'Shimmering', 'Glittering', 'Polished'],
            mid: ['Catchy', 'Memorable', 'Infectious', 'Singable', 'Hooky'],
            quiet: ['Soft', 'Gentle', 'Sweet', 'Tender', 'Intimate'],
            loud: ['Anthemic', 'Soaring', 'Epic', 'Triumphant', 'Powerful']
        },
        'electronic': {
            bass: ['Pulsing', 'Wobbling', 'Throbbing', 'Synthetic', 'Digital', 'Modulated'],
            treble: ['Glitchy', 'Digital', 'Futuristic', 'Synthetic', 'Robotic'],
            mid: ['Synthetic', 'Programmed', 'Sequenced', 'Processed', 'Modular'],
            quiet: ['Atmospheric', 'Ambient', 'Minimal', 'Spacious', 'Ethereal'],
            loud: ['Massive', 'Crushing', 'Drop-heavy', 'Explosive', 'Wall-of-sound']
        },
        'default': {
            bass: ['Booming', 'Deep', 'Low', 'Resonant', 'Rumbling', 'Heavy'],
            treble: ['Sharp', 'High', 'Piercing', 'Bright', 'Clear'],
            mid: ['Resonant', 'Balanced', 'Full', 'Rich', 'Warm'],
            quiet: ['Quiet', 'Soft', 'Gentle', 'Subtle', 'Hushed'],
            loud: ['Loud', 'Powerful', 'Strong', 'Intense', 'Forceful']
        }
    },
    descriptors: ['Swift', 'Iron', 'Shadow', 'Mystic', 'Wild', 'Radiant', 'Grim', 'Noble', 'Ancient', 'Blazing'],
    classAspects: {
        'Barbarian': ['Warrior', 'Rage', 'Beast', 'Fury'],
        'Bard': ['Song', 'Voice', 'Muse', 'Melody'],
        'Cleric': ['Light', 'Faith', 'Devotion', 'Grace'],
        'Druid': ['Wild', 'Nature', 'Grove', 'Fang'],
        'Fighter': ['Blade', 'Shield', 'Defender', 'Champion'],
        'Monk': ['Fist', 'Spirit', 'Flow', 'Path'],
        'Paladin': ['Oath', 'Justice', 'Light', 'Defender'],
        'Ranger': ['Hunter', 'Arrow', 'Tracker', 'Scout'],
        'Rogue': ['Shadow', 'Blade', 'Whisper', 'Dagger'],
        'Sorcerer': ['Flame', 'Storm', 'Chaos', 'Power'],
        'Warlock': ['Pact', 'Shadow', 'Hex', 'Dark'],
        'Wizard': ['Arcane', 'Sage', 'Spellweaver', 'Mind'],
        'Artificer': ['Craft', 'Forge', 'Construct', 'Invention']
    } as Record<Class, string[]>,
    prefixes: ['Thunder', 'Shadow', 'Flame', 'Frost', 'Storm', 'Star', 'Blood', 'Soul', 'Moon', 'Sun'],
    suffixes: ['Blessed', 'Forged', 'Wreathed', 'Touched', 'Born', 'Kissed', 'Bound', 'Marked', 'Sworn', 'Woven'],
    occupations: ['smith', 'weaver', 'caller', 'keeper', 'herald', 'warden', 'seeker', 'walker', 'singer'],
    realms: ['Eternal Stage', 'Forgotten Hall', 'Misty Vale', 'Iron Keep', 'Crystal Spire',
             'Shadow Court', 'Golden Fields', 'Storm Peak', 'Ancient Grove', 'Silent Deep'],
    subtitlePrefixes: ['of Stars', 'Eternal', 'Reborn', 'Unchained', 'Ascendant',
                       'the Fallen', 'Unbound', 'Rising', 'Triumphant', 'Immortal']
};

/**
 * Backward compatibility export
 * @deprecated Use NAMING_DATA.adjectives instead
 */
export const ADJECTIVE_DATA = NAMING_DATA.adjectives;

// Skill to ability score mapping (D&D 5e)
export const SKILL_ABILITY_MAP: Record<Skill, Ability> = {
    // STR-based
    athletics: 'STR',

    // DEX-based
    acrobatics: 'DEX',
    sleight_of_hand: 'DEX',
    stealth: 'DEX',

    // INT-based
    arcana: 'INT',
    history: 'INT',
    investigation: 'INT',
    nature: 'INT',
    religion: 'INT',

    // WIS-based
    animal_handling: 'WIS',
    insight: 'WIS',
    medicine: 'WIS',
    perception: 'WIS',
    survival: 'WIS',

    // CHA-based
    deception: 'CHA',
    intimidation: 'CHA',
    performance: 'CHA',
    persuasion: 'CHA',
};

/**
 * D&D 5e spell database - comprehensive list of spells organized by level and school
 *
 * Spell and SpellPrerequisite types are imported from ../core/spells/SpellTypes.ts
 * for better module organization consistency with SkillPrerequisite and FeaturePrerequisite.
 */
export const SPELL_DATABASE: Record<string, Spell> = {
    // Cantrips (Level 0)
    'Acid Splash': { name: 'Acid Splash', level: 0, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Fire Bolt': { name: 'Fire Bolt', level: 0, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Light': { name: 'Light', level: 0, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'M'], duration: '1 hour' },
    'Mage Hand': { name: 'Mage Hand', level: 0, school: 'Conjuration', casting_time: '1 action', range: '30 feet', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Mending': { name: 'Mending', level: 0, school: 'Transmutation', casting_time: '1 minute', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Message': { name: 'Message', level: 0, school: 'Transmutation', casting_time: '1 action', range: '120 feet', components: ['V', 'S', 'M'], duration: '1 round' },
    'Prestidigitation': { name: 'Prestidigitation', level: 0, school: 'Transmutation', casting_time: '1 action', range: '10 feet', components: ['V', 'S'], duration: 'Up to 1 hour' },
    'Sacred Flame': { name: 'Sacred Flame', level: 0, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shocking Grasp': { name: 'Shocking Grasp', level: 0, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous' },
    'Vicious Mockery': { name: 'Vicious Mockery', level: 0, school: 'Enchantment', casting_time: '1 action', range: '60 feet', components: ['V'], duration: 'Instantaneous' },

    // 1st Level
    'Burning Hands': { name: 'Burning Hands', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Self (15-foot cone)', components: ['V', 'S'], duration: 'Instantaneous' },
    'Charm Person': { name: 'Charm Person', level: 1, school: 'Enchantment', casting_time: '1 action', range: '30 feet', components: ['V', 'S'], duration: '1 hour' },
    'Cure Wounds': { name: 'Cure Wounds', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous' },
    'Detect Magic': { name: 'Detect Magic', level: 1, school: 'Divination', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 10 minutes' },
    'Disguise Self': { name: 'Disguise Self', level: 1, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: '1 hour' },
    'Expeditious Retreat': { name: 'Expeditious Retreat', level: 1, school: 'Transmutation', casting_time: '1 bonus action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 10 minutes' },
    'False Life': { name: 'False Life', level: 1, school: 'Necromancy', casting_time: '1 action', range: 'Self', components: ['V', 'S', 'M'], duration: '1 hour' },
    'Feather Fall': { name: 'Feather Fall', level: 1, school: 'Transmutation', casting_time: '1 reaction', range: '60 feet', components: ['V', 'M'], duration: '1 minute' },
    'Grease': { name: 'Grease', level: 1, school: 'Conjuration', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: '1 minute' },
    'Healing Word': { name: 'Healing Word', level: 1, school: 'Evocation', casting_time: '1 bonus action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Identify': { name: 'Identify', level: 1, school: 'Divination', casting_time: '1 minute', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Mage Armor': { name: 'Mage Armor', level: 1, school: 'Abjuration', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: '8 hours' },
    'Magic Missile': { name: 'Magic Missile', level: 1, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shield': { name: 'Shield', level: 1, school: 'Abjuration', casting_time: '1 reaction', range: 'Self', components: ['V', 'S'], duration: '1 round' },
    'Sleep': { name: 'Sleep', level: 1, school: 'Enchantment', casting_time: '1 action', range: '90 feet', components: ['V', 'S', 'M'], duration: '1 minute' },
    'Thunderwave': { name: 'Thunderwave', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Self (15-foot cube)', components: ['V', 'S'], duration: 'Instantaneous' },

    // 2nd Level
    'Acid Arrow': { name: 'Acid Arrow', level: 2, school: 'Evocation', casting_time: '1 action', range: '90 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Aganazzar\'s Scorcher': { name: 'Aganazzar\'s Scorcher', level: 2, school: 'Evocation', casting_time: '1 action', range: '30 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Blur': { name: 'Blur', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V'], duration: 'Concentration, up to 1 minute' },
    'Detect Thoughts': { name: 'Detect Thoughts', level: 2, school: 'Divination', casting_time: '1 action', range: 'Self', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Fireball': { name: 'Fireball', level: 3, school: 'Evocation', casting_time: '1 action', range: '150 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Hold Person': { name: 'Hold Person', level: 2, school: 'Enchantment', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Invisibility': { name: 'Invisibility', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },
    'Knock': { name: 'Knock', level: 2, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V'], duration: 'Instantaneous' },
    'Misty Step': { name: 'Misty Step', level: 2, school: 'Conjuration', casting_time: '1 bonus action', range: 'Self', components: ['V'], duration: 'Instantaneous' },
    'Mirror Image': { name: 'Mirror Image', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Scorching Ray': { name: 'Scorching Ray', level: 2, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shatter': { name: 'Shatter', level: 2, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Suggestion': { name: 'Suggestion', level: 2, school: 'Enchantment', casting_time: '1 action', range: '30 feet', components: ['V', 'M'], duration: 'Concentration, up to 1 minute' },

    // 3rd Level
    'Animate Dead': { name: 'Animate Dead', level: 3, school: 'Necromancy', casting_time: '1 minute', range: '10 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Blink': { name: 'Blink', level: 3, school: 'Transmutation', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: '1 minute' },
    'Counterspell': { name: 'Counterspell', level: 3, school: 'Abjuration', casting_time: '1 reaction', range: '60 feet', components: ['S'], duration: 'Instantaneous' },
    'Dispel Magic': { name: 'Dispel Magic', level: 3, school: 'Abjuration', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Lightning Bolt': { name: 'Lightning Bolt', level: 3, school: 'Evocation', casting_time: '1 action', range: 'Self (100-foot line)', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Major Image': { name: 'Major Image', level: 3, school: 'Illusion', casting_time: '1 action', range: '120 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 10 minutes' },
    'Sleet Storm': { name: 'Sleet Storm', level: 3, school: 'Evocation', casting_time: '1 action', range: '150 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Telekinesis': { name: 'Telekinesis', level: 3, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },

    // 4th Level
    'Dimension Door': { name: 'Dimension Door', level: 4, school: 'Conjuration', casting_time: '1 action', range: '500 feet', components: ['V'], duration: 'Instantaneous' },
    'Greater Invisibility': { name: 'Greater Invisibility', level: 4, school: 'Illusion', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Polymorph': { name: 'Polymorph', level: 4, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },
    'Stoneskin': { name: 'Stoneskin', level: 4, school: 'Abjuration', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },

    // 5th Level
    'Cone of Cold': { name: 'Cone of Cold', level: 5, school: 'Evocation', casting_time: '1 action', range: 'Self (60-foot cone)', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Teleportation Circle': { name: 'Teleportation Circle', level: 5, school: 'Conjuration', casting_time: '1 minute', range: '10 feet', components: ['V', 'M'], duration: '1 round' },
};

/**
 * Spell lists by class - defines which spells each spellcasting class has access to
 */
export const CLASS_SPELL_LISTS: Record<string, {
    cantrips: string[];
    spells_by_level: Record<number, string[]>;
}> = {
    'Wizard': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Light', 'Mage Hand', 'Mending', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Grease', 'Identify', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Shatter', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image', 'Sleet Storm', 'Telekinesis'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph', 'Stoneskin'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Sorcerer': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Light', 'Mage Hand', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Grease', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Shatter', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image', 'Sleet Storm'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph', 'Stoneskin'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Bard': {
        cantrips: ['Light', 'Mage Hand', 'Mending', 'Message', 'Prestidigitation', 'Vicious Mockery'],
        spells_by_level: {
            1: ['Charm Person', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Healing Word', 'Identify', 'Magic Missile', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph'],
            5: ['Teleportation Circle'],
        },
    },
    'Cleric': {
        cantrips: ['Light', 'Mending', 'Message', 'Sacred Flame'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Identify', 'Healing Word', 'Magic Missile', 'Shield', 'Sleep'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Scorching Ray'],
            3: ['Animate Dead', 'Counterspell', 'Dispel Magic', 'Lightning Bolt'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold'],
        },
    },
    'Druid': {
        cantrips: ['Light', 'Mending', 'Prestidigitation'],
        spells_by_level: {
            1: ['Burning Hands', 'Cure Wounds', 'Detect Magic', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Healing Word', 'Identify'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Scorching Ray', 'Shatter'],
            3: ['Animate Dead', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Sleet Storm'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Paladin': {
        cantrips: [],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Feather Fall', 'Healing Word', 'Protection', 'Shield'],
            2: ['Acid Arrow', 'Hold Person', 'Scorching Ray'],
            3: ['Counterspell', 'Dispel Magic', 'Lightning Bolt'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold'],
        },
    },
    'Ranger': {
        cantrips: [],
        spells_by_level: {
            1: ['Detect Magic', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Identify'],
            2: ['Blur', 'Hold Person', 'Invisibility', 'Misty Step'],
            3: ['Blink', 'Counterspell', 'Dispel Magic'],
            4: ['Dimension Door', 'Polymorph'],
            5: [],
        },
    },
    'Warlock': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Mage Hand', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Grease', 'Hex', 'Magic Missile'],
            2: ['Acid Arrow', 'Darkness', 'Hold Person', 'Invisibility', 'Scorching Ray', 'Shatter'],
            3: ['Counterspell', 'Dispel Magic', 'Fireball', 'Lightning Bolt'],
            4: ['Dimension Door', 'Greater Invisibility'],
            5: ['Cone of Cold'],
        },
    },
};

/**
 * Interface for class spell list data (used for extensibility)
 *
 * Defines the structure for spell lists associated with a class.
 * Used by ExtensionManager to support custom spell lists for custom classes.
 */
export interface ClassSpellListData {
    /** The class this spell list belongs to */
    class: string;
    /** Cantrips available to this class */
    cantrips: string[];
    /** Spells available at each spell level (1-9) */
    spells_by_level: Record<number, string[]>;
}

/**
 * Spell slots by class and level - D&D 5e standard progression
 * Key: "ClassName", Value: Record mapping character level (1-20) to spell slots per level (1-9)
 */
export const SPELL_SLOTS_BY_CLASS: Record<string, Record<number, Record<number, number>>> = {
    'Wizard': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Sorcerer': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Bard': {
        1: { 1: 2 },
        2: { 1: 2, 2: 0 },
        3: { 1: 3, 2: 0 },
        4: { 1: 3, 2: 2 },
        5: { 1: 4, 2: 2, 3: 0 },
        6: { 1: 4, 2: 2, 3: 0 },
        7: { 1: 4, 2: 2, 3: 2 },
        8: { 1: 4, 2: 2, 3: 2, 4: 0 },
        9: { 1: 4, 2: 3, 3: 2, 4: 0 },
        10: { 1: 4, 2: 3, 3: 2, 4: 1 },
        11: { 1: 4, 2: 3, 3: 3, 4: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
        14: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
        15: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1, 6: 0 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
    },
    'Cleric': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 3, 2: 2 },
        4: { 1: 4, 2: 2 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Druid': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 3, 2: 2 },
        4: { 1: 4, 2: 2 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Paladin': {
        1: { 1: 0 },
        2: { 1: 2 },
        3: { 1: 3 },
        4: { 1: 3 },
        5: { 1: 4, 2: 2 },
        6: { 1: 4, 2: 2 },
        7: { 1: 4, 2: 3 },
        8: { 1: 4, 2: 3 },
        9: { 1: 4, 2: 3, 3: 2 },
        10: { 1: 4, 2: 3, 3: 2 },
        11: { 1: 4, 2: 3, 3: 3 },
        12: { 1: 4, 2: 3, 3: 3 },
        13: { 1: 4, 2: 3, 3: 3, 4: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 2 },
        16: { 1: 4, 2: 3, 3: 3, 4: 2 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
    },
    'Ranger': {
        1: { 1: 0 },
        2: { 1: 2 },
        3: { 1: 2, 2: 0 },
        4: { 1: 3, 2: 0 },
        5: { 1: 3, 2: 2 },
        6: { 1: 3, 2: 2 },
        7: { 1: 3, 2: 2, 3: 0 },
        8: { 1: 3, 2: 2, 3: 0 },
        9: { 1: 3, 2: 3, 3: 0 },
        10: { 1: 4, 2: 3, 3: 0 },
        11: { 1: 4, 2: 3, 3: 2 },
        12: { 1: 4, 2: 3, 3: 2 },
        13: { 1: 4, 2: 3, 3: 2, 4: 0 },
        14: { 1: 4, 2: 3, 3: 2, 4: 0 },
        15: { 1: 4, 2: 3, 3: 2, 4: 1 },
        16: { 1: 4, 2: 3, 3: 2, 4: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 2 },
        20: { 1: 4, 2: 3, 3: 3, 4: 2 },
    },
    'Warlock': {
        1: { 1: 1 },
        2: { 1: 2 },
        3: { 1: 2, 2: 2 },
        4: { 1: 2, 2: 2 },
        5: { 1: 2, 2: 2, 3: 2 },
        6: { 1: 2, 2: 2, 3: 2 },
        7: { 1: 2, 2: 2, 3: 2, 4: 1 },
        8: { 1: 2, 2: 2, 3: 2, 4: 1 },
        9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 },
        10: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 },
        11: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 1 },
        12: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        13: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        14: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        15: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
        16: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
        17: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        18: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        19: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        20: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
    },
};

/**
 * Equipment data structure
 *
 * This interface now uses the same types as EnhancedEquipment for consistency.
 * The 'source' field is optional for backward compatibility but defaults to 'default'.
 */
export interface Equipment {
    name: string;
    type: EquipmentType;
    rarity: EquipmentRarity;
    weight: number; // pounds

    // Optional advanced properties
    properties?: EquipmentProperty[];

    // Features granted when equipped (can reference registry features or define inline mini-features)
    grantsFeatures?: Array<string | EquipmentMiniFeature>;

    // Skills granted when equipped
    grantsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;

    // Spells granted when equipped
    grantsSpells?: Array<{
        spellId: string;
        level?: number;
        uses?: number;
        recharge?: string;
    }>;

    // D&D 5e stats
    damage?: {
        dice: string;
        damageType: string;
        versatile?: string;
    };

    acBonus?: number;
    weaponProperties?: string[];

    // Spawn weight (0 = never random, still available to game logic)
    spawnWeight?: number;

    // Template ID
    templateId?: string;

    // Source tracking (optional for backward compatibility, defaults to 'default')
    source?: 'default' | 'custom';

    tags?: string[];

    /** Optional: User-facing description of this equipment */
    description?: string;
}

// ===== Helper Functions for Custom Class Data =====
// These functions check both default constants and ExtensionManager for custom class data
// Part 4: Template-Based Custom Classes

// NOTE: CLASS_STARTING_EQUIPMENT has been moved to src/utils/equipmentConstants.ts

/**
 * Get spell list for a class (default or custom)
 *
 * First checks the default CLASS_SPELL_LISTS constant, then checks
 * the ExtensionManager for custom spell lists registered via 'classSpellLists.${ClassName}'.
 *
 * @param className - The class name to get spell list for
 * @returns The spell list with cantrips and spells_by_level, or undefined if not found
 */
export function getClassSpellList(className: string): { cantrips: string[]; spells_by_level: Record<number, string[]> } | undefined {
    // Check default classes
    if (className in CLASS_SPELL_LISTS) {
        return CLASS_SPELL_LISTS[className];
    }

    // Check ExtensionManager for custom spell list
    try {
        const manager = ExtensionManager.getInstance();
        const category = `classSpellLists.${className}` as const;
        const customSpellLists = manager.get(category as any);

        if (customSpellLists && customSpellLists.length > 0) {
            // Return the first custom spell list for this class
            return customSpellLists[0] as { cantrips: string[]; spells_by_level: Record<number, string[]> };
        }
    } catch (error) {
        // ExtensionManager not available (may be during initialization)
        // Return undefined to fall back to default behavior
    }

    return undefined;
}

/**
 * Interface for class spell slots data (used for extensibility)
 */
interface ClassSpellSlotsData {
    /** Class name this spell slot data is for */
    class: string;
    /** Spell slot progression by character level (1-20), each level maps to spell level (1-9) to count */
    slots_by_level: Record<number, Record<number, number>>;
}

/**
 * Get spell slots for a class at a specific level (default or custom)
 *
 * First checks the default SPELL_SLOTS_BY_CLASS constant, then checks
 * the ExtensionManager for custom spell slot progressions registered via 'classSpellSlots'.
 *
 * The 'classSpellSlots' category expects an array of ClassSpellSlotsData objects,
 * each containing a class name and a slots_by_level record mapping character levels
 * to spell slot counts per spell level.
 *
 * @param className - The class name to get spell slots for
 * @param characterLevel - The character level (1-20)
 * @returns Record mapping spell level (1-9) to slot count, or undefined if not found
 *
 * @example
 * // Register custom spell slots for a "Necromancer" class
 * manager.register('classSpellSlots', [{
 *     class: 'Necromancer',
 *     slots_by_level: {
 *         1: { 1: 2 },
 *         2: { 1: 3 },
 *         3: { 1: 4, 2: 2 },
 *         // ... more levels
 *     }
 * }]);
 */
export function getSpellSlotsForClass(className: string, characterLevel: number): Record<number, number> | undefined {
    // Check default classes
    if (className in SPELL_SLOTS_BY_CLASS) {
        const classSlots = SPELL_SLOTS_BY_CLASS[className];
        if (classSlots && characterLevel in classSlots) {
            return classSlots[characterLevel];
        }
    }

    // Check ExtensionManager for custom spell slot data
    try {
        const manager = ExtensionManager.getInstance();
        const category = 'classSpellSlots' as const;
        const customSpellSlots = manager.get(category as any);

        if (customSpellSlots && Array.isArray(customSpellSlots)) {
            // Find the class-specific slot data
            const classSlotData = customSpellSlots.find((d: any) => d.class === className);
            if (classSlotData && classSlotData.slots_by_level) {
                const slotsByLevel = classSlotData.slots_by_level as Record<number, Record<number, number>>;
                if (characterLevel in slotsByLevel) {
                    return slotsByLevel[characterLevel];
                }
            }
        }
    } catch (error) {
        // ExtensionManager not available (may be during initialization)
        // Return undefined to fall back to default behavior
    }

    return undefined;
}

// NOTE: getClassStartingEquipment function has been moved to src/utils/equipmentConstants.ts

// NOTE: EQUIPMENT_DATABASE has been moved to src/utils/equipmentConstants.ts (as DEFAULT_EQUIPMENT)

// Mastery System Constants
/** Minimum listen count to achieve track mastery */
export const MASTERY_THRESHOLD = 10;

/** Bonus XP awarded for mastered tracks */
export const MASTERY_BONUS_XP = 50;