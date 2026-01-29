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
    ProficiencyLevel,
    GameMode
} from './core/types/Character.js';

export type {
    Spell,
    Equipment
} from './utils/constants.js';

export type { InventoryItem } from './core/generation/EquipmentGenerator.js';

export type {
    GeolocationData,
    MotionData,
    WeatherData,
    LightData,
    EnvironmentalContext,
    GamingContext,
    ListeningSession,
    ExperienceSystem,
    StatIncreaseConfig,
    StatIncreaseResult,
    StatIncreaseStrategy,
    StatIncreaseOptions,
    StatIncreaseStrategyType,
    StatIncreaseFunction,
    LevelUpDetail
} from './core/types/Progression.js';

export type { LevelUpBenefits, UncappedProgressionConfig } from './core/progression/LevelUpProcessor.js';
export type { CharacterUpdateResult } from './core/progression/CharacterUpdater.js';
export type { CharacterAppearance } from './core/generation/AppearanceGenerator.js';
export type { CharacterEquipment } from './core/generation/EquipmentGenerator.js';

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
export { CharacterGenerator, type CharacterGeneratorOptions } from './core/generation/CharacterGenerator.js';
export { PlaylistParser } from './core/parser/PlaylistParser.js';
export { MetadataExtractor } from './core/parser/MetadataExtractor.js';
export { AudioAnalyzer } from './core/analysis/AudioAnalyzer.js';
export { SpectrumScanner } from './core/analysis/SpectrumScanner.js';
export { ColorExtractor } from './core/analysis/ColorExtractor.js';
export { RaceSelector } from './core/generation/RaceSelector.js';
export { ClassSuggester } from './core/generation/ClassSuggester.js';
export { AbilityScoreCalculator } from './core/generation/AbilityScoreCalculator.js';
export { SkillAssigner } from './core/generation/SkillAssigner.js';
export { SpellManager } from './core/generation/SpellManager.js';
export { EquipmentGenerator } from './core/generation/EquipmentGenerator.js';
export { AppearanceGenerator } from './core/generation/AppearanceGenerator.js';
export { NamingEngine } from './core/generation/NamingEngine.js';

// Progression
export { XPCalculator } from './core/progression/XPCalculator.js';
export { SessionTracker } from './core/progression/SessionTracker.js';
export { LevelUpProcessor } from './core/progression/LevelUpProcessor.js';
export { MasterySystem } from './core/progression/MasterySystem.js';
export { CharacterUpdater } from './core/progression/CharacterUpdater.js';

// Stat Increase System
export { StatManager } from './core/progression/stat/StatManager.js';
export {
    DnD5eStandardStrategy,
    DnD5eSmartStrategy,
    BalancedStrategy,
    PrimaryOnlyStrategy,
    RandomStrategy,
    ManualStrategy,
    createStatIncreaseStrategy
} from './core/progression/stat/StatIncreaseStrategy.js';

// Config
export {
    DEFAULT_PROGRESSION_CONFIG,
    mergeProgressionConfig,
    type ProgressionConfig
} from './core/config/progressionConfig.js';

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
    EQUIPMENT_DATABASE,
    MASTERY_THRESHOLD,
    MASTERY_BONUS_XP
} from './utils/constants.js';

// Sensors
export { EnvironmentalSensors } from './core/sensors/EnvironmentalSensors.js';
export { GamingPlatformSensors } from './core/sensors/GamingPlatformSensors.js';

// Combat
export { CombatEngine } from './core/combat/CombatEngine.js';

// Migration utilities
export { CharacterMigration, type MigrationResult } from './core/migration/CharacterMigration.js';

// Equipment system
export { EquipmentModifier } from './core/equipment/EquipmentModifier.js';
export { EquipmentEffectApplier } from './core/equipment/EquipmentEffectApplier.js';
export { EquipmentValidator } from './core/equipment/EquipmentValidator.js';

// Equipment types
export type {
    EnhancedEquipment,
    EquipmentProperty,
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentCondition,
    EnhancedInventoryItem,
    EquipmentFeature,
    EquipmentSkill,
    EquipmentSpell
} from './core/types/Equipment.js';

// Enchantment and curse library
export {
    WEAPON_ENCHANTMENTS,
    ARMOR_ENCHANTMENTS,
    RESISTANCE_ENCHANTMENTS,
    CURSES,
    ALL_ENCHANTMENTS,
    getEnchantment,
    getCurse,
    getAllEnchantments,
    getAllCurses,
    getEnchantmentsByType,
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment
} from './utils/enchantmentLibrary.js';
