import type { CharacterSheet, Class, Ability, GameMode } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { RACE_DATA, CLASS_DATA, PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';
import { RaceSelector } from './RaceSelector.js';
import { ClassSuggester } from './ClassSuggester.js';
import { AbilityScoreCalculator } from './AbilityScoreCalculator.js';
import { SkillAssigner } from './SkillAssigner.js';
import { AppearanceGenerator } from './AppearanceGenerator.js';
import { SpellManager } from './SpellManager.js';
import { EquipmentGenerator } from './EquipmentGenerator.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ensureFeatureDefaultsInitialized } from '../extensions/index.js';
import { FeatureRegistry } from '../features/FeatureRegistry.js';

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

    /** Game mode for stat progression (default: 'standard') */
    gameMode?: GameMode;

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
     * @param {string} name - Character name
     * @param {CharacterGeneratorOptions} [options] - Generation options
     * @param {number} [options.level=1] - Starting level (1-20)
     * @param {Class} [options.forceClass] - Override class suggestion
     * @param {GameMode} [options.gameMode='standard'] - Game mode for stat progression
     * @param {CharacterGeneratorExtensions} [options.extensions] - Custom extensions
     * @returns {CharacterSheet} Complete D&D 5e character sheet
     *
     * @example
     * const character = CharacterGenerator.generate(
     *   'polygon-0x123-456',
     *   audioProfile,
     *   'Sonic Warrior',
     *   { level: 5 }
     * );
     * console.log(`${character.name}: Level ${character.level} ${character.class}`);
     *
     * @example
     * // With custom spells
     * const customCharacter = CharacterGenerator.generate(
     *   'seed',
     *   audioProfile,
     *   'Hero',
     *   {
     *     extensions: {
     *       spells: [{ name: 'Phoenix Fire', level: 5, school: 'Evocation' }]
     *     }
     *   }
     * );
     */
    static generate(
        seed: string,
        audioProfile: AudioProfile,
        name: string,
        options: CharacterGeneratorOptions = {}
    ): CharacterSheet {
        const rng = new SeededRNG(seed);
        const level = options.level || 1;
        const gameMode: GameMode = options.gameMode || 'standard';

        // Ensure feature registry is initialized with defaults
        ensureFeatureDefaultsInitialized();

        // Get the feature registry
        const featureRegistry = FeatureRegistry.getInstance();

        // Register custom extensions if provided
        if (options.extensions) {
            CharacterGenerator.registerExtensions(options.extensions);
        }

        // Select race deterministically from seed
        const race = RaceSelector.select(rng);

        // Suggest class based on audio profile
        const suggestedClass = options.forceClass || ClassSuggester.suggest(audioProfile, rng);

        // Calculate base ability scores from audio profile
        const baseScores = AbilityScoreCalculator.calculateBaseScores(audioProfile);

        // Apply racial bonuses
        const abilityScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, race);

        // Calculate ability modifiers
        const abilityModifiers = AbilityScoreCalculator.calculateModifiers(abilityScores);

        // Get class data
        const classData = CLASS_DATA[suggestedClass];
        const raceData = RACE_DATA[race];

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

        // Generate spells for spellcasting classes
        const spells = SpellManager.initializeSpells(suggestedClass, level);

        // Initialize starting equipment
        const equipment = EquipmentGenerator.initializeEquipment(suggestedClass);

        // Get class features from FeatureRegistry (feature IDs only)
        const classFeatures = featureRegistry.getClassFeatures(suggestedClass, level);
        const class_feature_ids = classFeatures.map(f => f.id);

        // Get racial traits from FeatureRegistry (trait IDs only)
        const racialTraits = featureRegistry.getRacialTraits(race);
        const racial_trait_ids = racialTraits.map(t => t.id);

        // Apply feature effects to character (if any effects exist)
        // Note: This is a placeholder for future effect application
        // For now, we store the feature IDs which can be looked up later

        return {
            name,
            race,
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
            speed: raceData.speed,
            skills,
            saving_throws,
            racial_traits: racial_trait_ids,
            class_features: class_feature_ids,
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
    }
}
