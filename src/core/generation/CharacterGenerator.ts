import type { CharacterSheet, Class, Race, Ability, GameMode } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import { SeededRNG } from '../../utils/random.js';
import { NamingEngine } from './NamingEngine.js';
import { getRaceData } from '../../constants/DefaultRaces.js';
import { getClassData, PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';
import { CLASS_DATA } from '../../constants/DefaultClasses.js';
import { RaceSelector } from './RaceSelector.js';
import { ClassSuggester } from './ClassSuggester.js';
import { AbilityScoreCalculator } from './AbilityScoreCalculator.js';
import { SkillAssigner } from './SkillAssigner.js';
import { AppearanceGenerator } from './AppearanceGenerator.js';
import { SpellManager } from './SpellManager.js';
import { EquipmentGenerator } from './EquipmentGenerator.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ensureFeatureDefaultsInitialized } from '../extensions/index.js';
import { FeatureQuery } from '../features/FeatureQuery.js';
import { FeatureEffectApplier } from '../features/FeatureEffectApplier.js';
import { EquipmentEffectApplier } from '../equipment/EquipmentEffectApplier.js';

/**
 * Extension data for custom spells
 */
export interface SpellExtension {
    name: string;
    level: number;
    school: string;
    casting_time?: string;
    range?: string;
    duration?: string;
    components?: string[];
    description?: string;
}

/**
 * Extension data for custom equipment
 */
export interface EquipmentExtension {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;
}

/**
 * Extension data for custom races (race name only, uses existing Race enum)
 */
export type RaceExtension = string;

/**
 * Extension data for custom classes (class name only, uses existing Class enum)
 */
export type ClassExtension = string;

/**
 * Extension data for custom appearance options
 */
export type AppearanceExtension = {
    bodyTypes?: string[];
    skinTones?: string[];
    hairColors?: string[];
    hairStyles?: string[];
    eyeColors?: string[];
    facialFeatures?: string[];
};

/**
 * Extension configuration for CharacterGenerator
 */
export interface CharacterGeneratorExtensions {
    /** Custom spells to add */
    spells?: SpellExtension[];
    /** Custom equipment to add */
    equipment?: EquipmentExtension[];
    /** Custom races to add (race names) */
    races?: RaceExtension[];
    /** Custom classes to add (class names) */
    classes?: ClassExtension[];
    /** Custom appearance options */
    appearance?: AppearanceExtension;
}

export interface CharacterGeneratorOptions {
    /** Starting level (default: 1) */
    level?: number;

    /** Override class suggestion */
    forceClass?: Class;

    /** Override race selection (required when specifying a subrace other than 'pure') */
    forceRace?: Race;

    /** Game mode for stat progression (default: 'standard') */
    gameMode?: GameMode;

    /** Override automatic name generation with custom name */
    forceName?: string;

    /** Generate deterministic names (same seed = same name). Default: true */
    deterministicName?: boolean;

    /**
     * Optional subrace selection
     *
     * - `'pure'` - Explicitly generate character with no subrace (no race required)
     * - `undefined` - Randomly select between 'pure' and available subraces for the race
     * - `'Specific Subrace'` - Manually specify a subrace (REQUIRES `forceRace` to also be set)
     *
     * @example
     * // Random subrace or pure
     * const randomSubrace = CharacterGenerator.generate(seed, audio, track);
     *
     * @example
     * // Explicitly no subrace
     * const pure = CharacterGenerator.generate(seed, audio, track, { subrace: 'pure' });
     *
     * @example
     * // Specific subrace with race (both required)
     * const highElf = CharacterGenerator.generate(seed, audio, track, { forceRace: 'Elf', subrace: 'High Elf' });
     */
    subrace?: string;

    /**
     * Custom extensions for procedural generation
     * Allows adding custom spells, equipment, races, classes, and appearance options
     */
    extensions?: CharacterGeneratorExtensions;
}

/**
 * Generate D&D 5e-compliant character sheets deterministically from audio signatures
 *
 * Uses seeded random number generation to ensure the same seed always produces
 * the same character. Combines audio frequency analysis with blockchain metadata
 * to create unique, reproducible characters.
 */
export class CharacterGenerator {
    /**
     * Register custom extensions with the ExtensionManager
     *
     * This method registers custom spells, equipment, races, classes, and appearance
     * options that will be merged with the default data during character generation.
     *
     * @param extensions - Custom extensions to register
     *
     * @example
     * CharacterGenerator.registerExtensions({
     *     spells: [{ name: 'Phoenix Fire', level: 5, school: 'Evocation' }],
     *     equipment: [{ name: 'Dragon Scale Armor', type: 'armor', rarity: 'rare', weight: 25 }],
     *     races: ['Dragonborn'],
     *     classes: ['Paladin'],
     *     appearance: { bodyTypes: ['muscular'] }
     * });
     */
    private static registerExtensions(extensions: CharacterGeneratorExtensions): void {
        const manager = ExtensionManager.getInstance();

        // Register custom spells
        if (extensions.spells && extensions.spells.length > 0) {
            manager.register('spells', extensions.spells);
        }

        // Register custom equipment
        if (extensions.equipment && extensions.equipment.length > 0) {
            manager.register('equipment', extensions.equipment);
        }

        // Register custom races
        if (extensions.races && extensions.races.length > 0) {
            manager.register('races', extensions.races);
        }

        // Register custom classes
        if (extensions.classes && extensions.classes.length > 0) {
            manager.register('classes', extensions.classes);
        }

        // Register custom appearance options
        if (extensions.appearance) {
            const { appearance } = extensions;

            if (appearance.bodyTypes && appearance.bodyTypes.length > 0) {
                manager.register('appearance.bodyTypes', appearance.bodyTypes);
            }
            if (appearance.skinTones && appearance.skinTones.length > 0) {
                manager.register('appearance.skinTones', appearance.skinTones);
            }
            if (appearance.hairColors && appearance.hairColors.length > 0) {
                manager.register('appearance.hairColors', appearance.hairColors);
            }
            if (appearance.hairStyles && appearance.hairStyles.length > 0) {
                manager.register('appearance.hairStyles', appearance.hairStyles);
            }
            if (appearance.eyeColors && appearance.eyeColors.length > 0) {
                manager.register('appearance.eyeColors', appearance.eyeColors);
            }
            if (appearance.facialFeatures && appearance.facialFeatures.length > 0) {
                manager.register('appearance.facialFeatures', appearance.facialFeatures);
            }
        }
    }

    /**
     * Generate a complete D&D 5e character sheet from audio profile and seed
     *
     * Deterministically generates:
     * - Race (with racial ability bonuses)
     * - Class (suggested by audio profile frequency analysis)
     * - Ability scores (based on bass/mid/treble dominance)
     * - Skills, proficiencies, and saving throws
     * - Hit points and armor class
     * - Character appearance (color-matched to audio)
     *
     * Same seed + audio profile = identical character every time.
     *
     * @param {string} seed - Deterministic seed (e.g., "chain-contract-tokenId")
     * @param {AudioProfile} audioProfile - Audio frequency analysis results
     * @param {PlaylistTrack} track - Track metadata (title, artist, genre) for automatic name generation
     * @param {CharacterGeneratorOptions} [options] - Generation options
     * @param {number} [options.level=1] - Starting level (1-20)
     * @param {Class} [options.forceClass] - Override class suggestion
     * @param {Race} [options.forceRace] - Override race selection (required when subrace is specified)
     * @param {GameMode} [options.gameMode='standard'] - Game mode for stat progression
     * @param {string} [options.subrace] - Subrace: 'pure' (no subrace), undefined (random), or specific subrace name
     * @param {boolean} [options.deterministicName=true] - Generate deterministic names (same seed = same name)
     * @param {CharacterGeneratorExtensions} [options.extensions] - Custom extensions
     * @returns {CharacterSheet} Complete D&D 5e character sheet
     *
     * @example
     * const character = CharacterGenerator.generate(
     *   'polygon-0x123-456',
     *   audioProfile,
     *   track,
     *   { level: 5 }
     * );
     * console.log(`${character.name}: Level ${character.level} ${character.class}`);
     *
     * @example
     * // Explicitly no subrace
     * const pure = CharacterGenerator.generate(
     *   'seed',
     *   audioProfile,
     *   track,
     *   { subrace: 'pure' }
     * );
     *
     * @example
     * // Specific subrace with race (both required)
     * const highElf = CharacterGenerator.generate(
     *   'seed',
     *   audioProfile,
     *   track,
     *   { forceRace: 'Elf', subrace: 'High Elf' }
     * );
     *
     * @example
     * // With custom spells and non deterministic name
     * const customCharacter = CharacterGenerator.generate(
     *   'seed',
     *   audioProfile,
     *   track,
     *   {
     *     deterministicName: false,
     *     extensions: {
     *       spells: [{ name: 'Phoenix Fire', level: 5, school: 'Evocation' }]
     *     }
     *   }
     * );
     */
    static generate(
        seed: string,
        audioProfile: AudioProfile,
        track: PlaylistTrack,
        options: CharacterGeneratorOptions = {}
    ): CharacterSheet {
        const rng = new SeededRNG(seed);
        const level = options.level || 1;
        const gameMode: GameMode = options.gameMode || 'standard';

        // Ensure feature query is initialized with defaults
        ensureFeatureDefaultsInitialized();

        // Get the feature query
        const featureQuery = FeatureQuery.getInstance();

        // Register custom extensions if provided
        if (options.extensions) {
            CharacterGenerator.registerExtensions(options.extensions);
        }

        // Handle subrace selection first (before race selection)
        // This allows us to auto-detect race from subrace if needed
        let subrace: string | undefined;
        const requestedSubrace = options.subrace;

        // Determine the effective race (without mutating options)
        // If only subrace is provided, auto-detect the race from the subrace
        let effectiveRace: Race | undefined;
        if (requestedSubrace === 'pure') {
            // Explicitly no subrace (race can be generated or forced)
            subrace = undefined;
            effectiveRace = options.forceRace;
        } else if (requestedSubrace !== undefined) {
            // Specific subrace requested
            if (options.forceRace) {
                // Both race and subrace specified - validate subrace exists for this race
                // We'll validate later after race is determined
                subrace = requestedSubrace;
                effectiveRace = options.forceRace;
            } else {
                // Only subrace specified - auto-detect race from subrace
                const detectedRace = featureQuery.getRaceForSubrace(requestedSubrace);
                if (!detectedRace) {
                    throw new Error(
                        `Cannot determine race for subrace "${requestedSubrace}". ` +
                        `Either specify forceRace or ensure the subrace is registered in racial traits. ` +
                        `Example: { forceRace: 'Elf', subrace: 'High Elf' }`
                    );
                }
                // Use the detected race for this character (without mutating options)
                effectiveRace = detectedRace;
                subrace = requestedSubrace;
            }
        }
        // If requestedSubrace is undefined, we'll randomly select a subrace later

        // Select race deterministically from seed or use forced/effective race
        const race = effectiveRace || RaceSelector.select(rng);

        // Validate subrace if both race and subrace were specified
        if (subrace !== undefined && requestedSubrace !== 'pure') {
            const availableSubraces = featureQuery.getAvailableSubraces(race);
            if (!availableSubraces.includes(subrace)) {
                throw new Error(
                    `Invalid subrace "${subrace}" for race "${race}". ` +
                    `Available subraces: ${availableSubraces.length > 0 ? availableSubraces.join(', ') : 'none'}`
                );
            }
        } else if (subrace === undefined && requestedSubrace === undefined) {
            // Randomly select: either 'pure' or one of the available subraces
            const availableSubraces = featureQuery.getAvailableSubraces(race);
            const optionsList = ['pure', ...availableSubraces];
            const selected = rng.randomChoice(optionsList);
            subrace = selected === 'pure' ? undefined : selected;
        }

        // Suggest class based on audio profile
        const suggestedClass = options.forceClass || ClassSuggester.suggest(audioProfile, rng);

        // Generate character name using NamingEngine (after class selection)
        // Or use forceName if provided
        const name = options.forceName || (() => {
            const namingEngine = new NamingEngine();
            return namingEngine.generateName(
                seed,
                track,
                audioProfile,
                suggestedClass,
                options.deterministicName || true
            );
        })();

        // Calculate base ability scores from audio profile
        const baseScores = AbilityScoreCalculator.calculateBaseScores(audioProfile);

        // Apply racial bonuses
        const abilityScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, race);

        // Calculate ability modifiers
        const abilityModifiers = AbilityScoreCalculator.calculateModifiers(abilityScores);

        // Get class data (supports custom classes via getClassData)
        const classData = getClassData(suggestedClass);
        if (!classData) {
            throw new Error(`Unknown class: ${suggestedClass}. Cannot generate character.`);
        }
        const raceData = getRaceData(race);

        // Handle custom races with no registered data
        const raceSpeed = raceData?.speed ?? 30;

        // Calculate HP
        const maxHp = classData.hit_die + abilityModifiers.CON;

        // Calculate AC (base 10 + DEX modifier)
        const armorClass = 10 + abilityModifiers.DEX;

        // Calculate initiative
        const initiative = abilityModifiers.DEX;

        // Proficiency bonus
        const proficiencyBonus = PROFICIENCY_BONUS[level];

        // Assign skills based on class
        const skills = SkillAssigner.assignSkills(suggestedClass, rng);

        // Initialize saving throws
        const saving_throws: Record<Ability, boolean> = {
            STR: classData.saving_throws.includes('STR'),
            DEX: classData.saving_throws.includes('DEX'),
            CON: classData.saving_throws.includes('CON'),
            INT: classData.saving_throws.includes('INT'),
            WIS: classData.saving_throws.includes('WIS'),
            CHA: classData.saving_throws.includes('CHA'),
        };

        // Generate character appearance
        const appearance = AppearanceGenerator.generate(seed, suggestedClass, audioProfile);

        // Get class features from FeatureQuery (feature IDs only)
        const classFeatures = featureQuery.getClassFeatures(suggestedClass, level);

        // Get racial traits from FeatureQuery (trait IDs only)
        // Filter by subrace if character has one
        const racialTraits = subrace
            ? featureQuery.getRacialTraitsForSubrace(race, subrace)
            : featureQuery.getBaseRacialTraits(race);

        // Initialize starting equipment
        const equipment = EquipmentGenerator.initializeEquipment(suggestedClass);

        // Build a partial character sheet for prerequisite validation
        // This is used for feature validation and initial spell prerequisite filtering
        const partialCharacter: CharacterSheet = {
            name,
            race,
            subrace,  // Include subrace for prerequisite validation
            class: suggestedClass,
            level,
            ability_scores: abilityScores,
            ability_modifiers: abilityModifiers,
            proficiency_bonus: proficiencyBonus,
            hp: { current: maxHp, max: maxHp, temp: 0 },
            armor_class: armorClass,
            initiative,
            speed: raceSpeed,
            skills,
            saving_throws,
            racial_traits: [],  // Empty for now, will populate after validation
            class_features: [],  // Empty for now, will populate after validation
            appearance,
            spells: {
                spell_slots: {},
                known_spells: [],
                cantrips: []
            },  // Empty for now, will be populated with prerequisite filtering
            equipment,
            xp: { current: 0, next_level: XP_THRESHOLDS[level + 1] || 0 },
            seed,
            generated_at: new Date().toISOString(),
            gameMode,
        };

        // Generate spells for spellcasting classes with prerequisite filtering
        // Pass partialCharacter for initial prerequisite validation (level, class, race, abilities)
        const spells = SpellManager.initializeSpells(suggestedClass, level, partialCharacter);

        // Validate and filter class features by prerequisites
        const validClassFeatures: typeof classFeatures = [];
        for (const feature of classFeatures) {
            const validation = featureQuery.validatePrerequisites(feature, partialCharacter);
            if (!validation.valid) {
                // Log warning but continue - default features should always pass
                console.warn(`Feature "${feature.name}" (${feature.id}) failed prerequisite validation:`, validation.errors);
            }
            // Include all features for now - default D&D features shouldn't have prerequisites
            // This validation is primarily for custom features added by users
            validClassFeatures.push(feature);
        }

        // Validate and filter racial traits by prerequisites
        const validRacialTraits: typeof racialTraits = [];
        for (const trait of racialTraits) {
            const validation = featureQuery.validatePrerequisites(trait, partialCharacter);
            if (!validation.valid) {
                // Log warning but continue - default traits should always pass
                console.warn(`Trait "${trait.name}" (${trait.id}) failed prerequisite validation:`, validation.errors);
            }
            // Include all traits for now - default D&D traits shouldn't have prerequisites
            // This validation is primarily for custom traits added by users
            validRacialTraits.push(trait);
        }

        // Build the initial character sheet
        const characterSheet: CharacterSheet = {
            name,
            race,
            subrace,  // Include subrace in the character sheet
            class: suggestedClass,
            level,
            ability_scores: abilityScores,
            ability_modifiers: abilityModifiers,
            proficiency_bonus: proficiencyBonus,
            hp: {
                current: maxHp,
                max: maxHp,
                temp: 0,
            },
            armor_class: armorClass,
            initiative,
            speed: raceSpeed,
            skills,
            saving_throws,
            racial_traits: validRacialTraits.map(t => t.id),
            class_features: validClassFeatures.map(f => f.id),
            appearance,
            spells,
            equipment,
            xp: {
                current: 0,
                next_level: XP_THRESHOLDS[level + 1] || 0,
            },
            seed,
            generated_at: new Date().toISOString(),
            gameMode,
        };

        // Apply feature effects from racial traits (applied first as they're base abilities)
        FeatureEffectApplier.applyMultipleEffects(characterSheet, validRacialTraits);

        // Apply feature effects from class features
        FeatureEffectApplier.applyMultipleEffects(characterSheet, validClassFeatures);

        // Apply equipment effects for equipped items
        // Equipment effects are applied after feature effects so they can stack
        if (equipment) {
            const equippedItems = [
                ...equipment.weapons.filter(item => item.equipped),
                ...equipment.armor.filter(item => item.equipped),
                ...equipment.items.filter(item => item.equipped)
            ];

            for (const item of equippedItems) {
                const equipData = EquipmentGenerator.getEquipmentDataStatic(item.name);
                if (equipData) {
                    const instanceId = (item as { instanceId?: string }).instanceId;
                    EquipmentEffectApplier.equipItem(characterSheet, equipData, instanceId);
                }
            }
        }

        // Filter spells by prerequisites
        // Spells are filtered after all features and equipment are applied
        // since spell prerequisites may depend on features or equipment
        const finalCharacterSheet = SpellManager.filterCharacterSpells(characterSheet);

        return finalCharacterSheet;
    }
}
