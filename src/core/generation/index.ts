/**
 * Character Generation Module
 *
 * Exports all character generation utilities including:
 * - CharacterGenerator: Main character generation from playlists
 * - EnemyGenerator: Enemy and encounter generation
 * - NamingEngine: Procedural name generation
 * - ClassSuggester: Class suggestion from audio profiles
 * - RaceSelector: Race selection from audio profiles
 * - AppearanceGenerator: Physical appearance generation
 * - EquipmentGenerator: Equipment generation
 * - SkillAssigner: Skill proficiency assignment
 * - SpellManager: Spell selection and management
 */

export { CharacterGenerator } from './CharacterGenerator.js';
export { EnemyGenerator } from './EnemyGenerator.js';
export { NamingEngine } from './NamingEngine.js';
export { ClassSuggester } from './ClassSuggester.js';
export { RaceSelector } from './RaceSelector.js';
export { AppearanceGenerator } from './AppearanceGenerator.js';
export { EquipmentGenerator } from './EquipmentGenerator.js';
export { SkillAssigner } from './SkillAssigner.js';
export { SpellManager } from './SpellManager.js';

// CR/Level conversion utilities
export {
    crToLevel,
    levelToCR,
    roundLevel,
    roundCR,
    formatLevel,
    formatCR,
    createCRTuning,
    DEFAULT_CR_TUNING
} from './CRLevelConverter.js';
export type { CRTuningConfig } from './CRLevelConverter.js';

// Spellcasting system
export {
    SpellcastingGenerator,
    SPELL_SLOTS_BY_CR
} from './SpellcastingGenerator.js';
export type {
    InnateSpell,
    SpellList,
    SpellcastingConfig,
    SpellcastingGenerationOptions,
    SpellcastingGenerationOptionsWithRNG
} from './SpellcastingGenerator.js';

// Legendary actions system
export {
    LegendaryGenerator,
    LEGENDARY_ACTIONS,
    LEGENDARY_RESISTANCES,
    LEGENDARY_ACTION_COUNT
} from './LegendaryGenerator.js';
export type {
    LegendaryAction,
    LegendaryConfig
} from './LegendaryGenerator.js';

// Export enemy types for convenience
export type {
    EnemyCategory,
    EnemyRarity,
    EnemyArchetype,
    EnemyMixMode,
    EncounterDifficulty,
    SignatureAbility,
    AudioPreference,
    EnemyTemplate,
    RarityConfig,
    EnemyGenerationOptions,
    EncounterGenerationOptions,
    EnemyMetadata,
    EnemyFeature
} from '../types/Enemy.js';

export {
    isValidEnemyCategory,
    isValidEnemyRarity,
    isValidEnemyArchetype,
    isValidEncounterDifficulty
} from '../types/Enemy.js';

// Rhythm Generation
export { RhythmGenerator } from './RhythmGenerator.js';
export type {
    RhythmGenerationOptions,
    GeneratedRhythm,
    RhythmMetadata,
    OutputMode,
    ProgressCallback,
} from './RhythmGenerator.js';

// Pitch Beat Linker
export { PitchBeatLinker } from './PitchBeatLinker.js';
export type {
    PitchAtBeat,
    BandPitchAtBeat,
    LinkedPitchAnalysis,
    PitchBandName,
    PreFilteredBandAudio,
    IntervalCategory,
    PitchDirection,
} from './PitchBeatLinker.js';

// Button Pattern Library
export {
    DDR_PATTERN_LIBRARY,
    GUITAR_HERO_PATTERN_LIBRARY,
    getPatternLibrary,
    getPatternsByCategory,
    getPatternsByDifficulty,
    getPatternsByTags,
    getPatternsByKeyCount,
    getRandomPattern,
    getPatternById,
    getPatternLibraryStats,
} from './ButtonPatternLibrary.js';
