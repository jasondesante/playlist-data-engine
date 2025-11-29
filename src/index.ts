/**
 * Public API for the Playlist Data Engine
 * @module @audio-alchemist/core
 */

// Types
export type {
    ServerlessPlaylist,
    PlaylistTrack,
    RawArweavePlaylist
} from './core/types/Playlist.js';

export type {
    AudioProfile,
    ColorPalette,
    FrequencyBands
} from './core/types/AudioProfile.js';

export type {
    CharacterSheet,
    AbilityScores,
    Race,
    Class,
    Ability,
    Skill,
    ProficiencyLevel
} from './core/types/Character.js';

export type {
    Spell,
    Equipment
} from './utils/constants.js';

// Utilities
export {
    generateSeed,
    hashSeedToFloat,
    hashSeedToInt,
    deriveSeed
} from './utils/hash.js';

export { SeededRNG } from './utils/random.js';

export {
    PlaylistTrackSchema,
    ServerlessPlaylistSchema,
    AudioProfileSchema,
    CharacterSheetSchema,
    AbilityScoresSchema,
} from './utils/validators.js';

// Core functionality
export { PlaylistParser } from './core/parser/PlaylistParser.js';
export { MetadataExtractor } from './core/parser/MetadataExtractor.js';
export { AudioAnalyzer } from './core/analysis/AudioAnalyzer.js';
export { SpectrumScanner } from './core/analysis/SpectrumScanner.js';
export { ColorExtractor } from './core/analysis/ColorExtractor.js';
export { CharacterGenerator } from './core/generation/CharacterGenerator.js';
export { RaceSelector } from './core/generation/RaceSelector.js';
export { ClassSuggester } from './core/generation/ClassSuggester.js';
export { AbilityScoreCalculator } from './core/generation/AbilityScoreCalculator.js';
export { SkillAssigner } from './core/generation/SkillAssigner.js';
export { SpellManager } from './core/generation/SpellManager.js';
export { EquipmentGenerator } from './core/generation/EquipmentGenerator.js';
export { NamingEngine } from './core/generation/NamingEngine.js';

// Constants
export {
    RACE_DATA,
    CLASS_DATA,
    ALL_RACES,
    ALL_CLASSES,
    XP_THRESHOLDS,
    PROFICIENCY_BONUS,
    SKILL_ABILITY_MAP,
    SPELL_DATABASE,
    CLASS_SPELL_LISTS,
    SPELL_SLOTS_BY_CLASS,
    CLASS_STARTING_EQUIPMENT,
    EQUIPMENT_DATABASE
} from './utils/constants.js';
