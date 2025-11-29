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
export { CharacterGenerator } from './core/generation/CharacterGenerator.js';

// Constants
export {
    RACE_DATA,
    CLASS_DATA,
    ALL_RACES,
    ALL_CLASSES,
    XP_THRESHOLDS,
    PROFICIENCY_BONUS
} from './utils/constants.js';
