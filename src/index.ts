/**
 * Public API for the Playlist Data Engine
 * @module @audio-alchemist/core
 */

// ============================================================================
// TYPES
// ============================================================================

// Playlist types
export type {
    ServerlessPlaylist,
    PlaylistTrack,
    RawArweavePlaylist
} from './core/types/Playlist.js';

// Audio analysis types
export type {
    AudioProfile,
    ColorPalette,
    FrequencyBands,
    AudioTimelineEvent
} from './core/types/AudioProfile.js';

// Beat detection types
export type {
    Beat,
    BeatMap,
    BeatMapMetadata,
    BeatEvent,
    BeatEventType,
    BeatStreamCallback,
    AudioSyncState,
    BeatMapGeneratorOptions,
    BeatStreamOptions,
    BeatMapJSON,
    BeatAccuracy,
    ButtonPressResult,
    TempoEstimate,
    OSEConfig,
    BeatTrackerConfig,
    TempoDetectorConfig,
    BeatMapGenerationProgress,
    AccuracyThresholds,
    DifficultyPreset,
    ThresholdValidationResult,
    // Time Signature types
    TimeSignatureConfig,
    // Downbeat configuration types
    DownbeatSegment,
    DownbeatConfig,
    // OSE Parameter Mode types
    HopSizeMode,
    HopSizeConfig,
    MelBandsMode,
    MelBandsConfig,
    GaussianSmoothMode,
    GaussianSmoothConfig,
    // Beat Interpolation types
    BeatSource,
    BeatWithSource,
    BeatInterpolationOptions,
    InterpolatedBeatMap,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
    // Tempo Section types (multi-tempo support)
    TempoSection,
    TempoSectionJSON,
    // Beat Interpolation JSON types
    BeatWithSourceJSON,
    InterpolatedBeatMapJSON,
    QuarterNoteDetectionJSON,
    GapAnalysisJSON,
    InterpolationMetadataJSON,
    // Subdivision types
    SubdivisionType,
    SubdivisionConfig,
    UnifiedBeatMap,
    SubdividedBeat,
    SubdividedBeatMap,
    SubdivisionMetadata,
    // Real-Time Subdivision Playback types
    SubdivisionTransitionMode,
    SubdivisionPlaybackOptions,
    SubdivisionBeatEvent,
    SubdivisionCallback,
    // Groove analyzer types
    GrooveDirection,
    GrooveResult,
    GrooveState,
    GrooveAnalyzerOptions,
    GroovePenaltyConfig,
} from './core/types/BeatMap.js';

// Beat detection constants
export {
    DEFAULT_BEATMAP_GENERATOR_OPTIONS,
    DEFAULT_BEATSTREAM_OPTIONS,
    DEFAULT_TIME_SIGNATURE,
    DEFAULT_DOWNBEAT_CONFIG,
    DEFAULT_SUBDIVISION_CONFIG,
    DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
    MAX_SUBDIVISION_DENSITY,
    VALID_SUBDIVISION_TYPES,
    isValidSubdivisionType,
    getSubdivisionDensity,
    validateSubdivisionConfig,
    validateSubdivisionConfigAgainstBeats,
    validateSubdivisionDensity,
    MIN_BEATS_PER_MEASURE,
    MAX_BEATS_PER_MEASURE,
    validateDownbeatConfig,
    validateDownbeatConfigAgainstBeats,
    reapplyDownbeatConfig,
    BEAT_ACCURACY_THRESHOLDS,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    EASY_ACCURACY_THRESHOLDS,
    MEDIUM_ACCURACY_THRESHOLDS,
    HARD_ACCURACY_THRESHOLDS,
    getAccuracyThresholdsForPreset,
    validateThresholds,
    // OSE Parameter Mode presets
    HOP_SIZE_PRESETS,
    MEL_BANDS_PRESETS,
    GAUSSIAN_SMOOTH_PRESETS,
    // OSE Parameter Mode helper functions
    getHopSizeMs,
    getMelBands,
    getGaussianSmoothMs,
    // Beat Interpolation constants
    DEFAULT_BEAT_INTERPOLATION_OPTIONS,
    // Groove analyzer defaults
    DEFAULT_GROOVE_OPTIONS,
    // Groove penalty presets
    EASY_GROOVE_PENALTIES,
    MEDIUM_GROOVE_PENALTIES,
    HARD_GROOVE_PENALTIES,
    GROOVE_PENALTY_PRESETS,
    getGroovePenaltiesForPreset,
} from './core/types/BeatMap.js';

// Character types
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

// Progression types
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

// Prestige types
export type {
    PrestigeLevel,
    PrestigeInfo,
    PrestigeResult,
    CustomThresholds
} from './core/types/Prestige.js';

// Session tracker interface (for dependency injection)
export type { ISessionTracker } from './core/types/ISessionTracker.js';

export {
    PRESTIGE_ROMAN_NUMERALS,
    MAX_PRESTIGE_LEVEL,
    BASE_PLAYS_THRESHOLD,
    BASE_XP_THRESHOLD,
    PRESTIGE_SCALING_FACTOR,
    isPrestigeLevel,
    toPrestigeLevel
} from './core/types/Prestige.js';

export type { LevelUpBenefits, UncappedProgressionConfig } from './core/progression/LevelUpProcessor.js';
export type { CharacterUpdateResult, RhythmXPUpdateResult, ApplyPendingStatIncreaseResult } from './core/progression/CharacterUpdater.js';

// Character generation types
export type { CharacterAppearance } from './core/generation/AppearanceGenerator.js';
export type { InventoryItem } from './core/generation/EquipmentGenerator.js';

// Equipment types
export type {
    CharacterEquipment,
    EnhancedEquipment,
    EquipmentProperty,
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentCondition,
    EnhancedInventoryItem,
    EquipmentFeature,
    EquipmentSkill,
    EquipmentSpell,
    EffectApplicationResult,
    EquipmentValidationResult,
    SpawnRandomOptions,
    TreasureHoardResult,
    // Box item types
    BoxDropPool,
    BoxDrop,
    BoxContents,
    BoxOpenResult,
    BoxOpenRequirement,
    BoxOpenError
} from './core/types/Equipment.js';

// Combat types
export type {
    StatusEffect,
    Combatant,
    CombatAction,
    CombatActionResult,
    AttackRoll,
    DamageRoll,
    SpellCastResult,
    CombatInstance,
    CombatResult,
    DamageType,
    SavingThrowAbility,
    CombatConfig
} from './core/types/Combat.js';

// Feature types
export type {
    ClassFeature,
    RacialTrait,
    FeatureEffect,
    FeaturePrerequisite
} from './core/features/FeatureTypes.js';

export type { CharacterEffect } from './core/features/FeatureEffectApplier.js';

// Skill types
export type {
    CustomSkill,
    SkillPrerequisite
} from './core/skills/SkillTypes.js';

// Extensibility types
export type {
    ExtensionOptions,
    ValidationResult,
    ContentPackData
} from './core/extensions/ExtensionManager.js';

export type { RaceDataEntry, CustomRaceDataEntry, ClassDataEntry, Equipment } from './utils/constants.js';

// Environmental types
export type {
    SensorType,
    PerformanceMetrics,
    PerformanceStatistics,
    SensorPermission,
    SensorHealthStatus,
    SensorStatus,
    SensorFailureLog,
    SensorRetryConfig,
    SensorRecoveryNotification,
    ForecastData,
    BiomeType,
    XPBonusSource,
    XpModifierBreakdown,
    DayStage,
    TwilightType,
    SolarInfo
} from './core/types/Environmental.js';

// Spell types
export type {
    RegisteredSpell,
    SpellSchool,
    SpellPrerequisite,
    Spell
} from './core/spells/index.js';

export type {
    SpellValidationResult
} from './core/spells/SpellValidator.js';

// Rhythm XP types
export type {
    RhythmBaseXPConfig,
    ComboEndBonusConfig,
    RhythmComboConfig,
    GrooveEndBonusConfig,
    RhythmGrooveConfig,
    RhythmXPConfig,
    RhythmXPResult,
    ComboEndBonusResult,
    GrooveStats,
    GrooveEndStats,
    GrooveEndBonusResult,
    RhythmSessionTotals,
    RhythmGameContext,
} from './core/types/RhythmXP.js';

// Rhythm XP configuration helpers
export {
    DEFAULT_RHYTHM_XP_CONFIG,
    mergeRhythmXPConfig,
} from './core/types/RhythmXP.js';

// Combat result types
export type { InitiativeResult } from './core/combat/InitiativeRoller.js';
export type { AttackResult } from './core/combat/AttackResolver.js';

// ============================================================================
// UTILITIES
// UTILITIES
// ============================================================================

// Hash utilities
export {
    generateSeed,
    hashSeedToFloat,
    hashSeedToInt,
    deriveSeed
} from './utils/hash.js';

// Random number generation
export { SeededRNG } from './utils/random.js';

// Validation schemas
export {
    PlaylistTrackSchema,
    ServerlessPlaylistSchema,
    AudioProfileSchema,
    CharacterSheetSchema,
    AbilityScoresSchema,
} from './utils/validators.js';

// Logger utility
export { Logger, createLogger, LogLevel } from './utils/logger.js';
export type { LogEntry, LoggerConfig } from './utils/logger.js';

// Playlist utilities
export {
    type PlaylistInput,
    type SimpleTrack,
    type VRMTrack,
    getAudioUrls,
    getImageUrls,
    getTrackTitles,
    getArtists,
    getGenres,
    getTags,
    getTotalDuration,
    getTrackCount,
    getTracks,
    getFullTracks,
    getVRMs,
    getVRMTracks
} from './utils/playlistUtils.js';

// Arweave URL utilities
export {
    type GatewayConfig,
    type ArweaveUrlInfo,
    DEFAULT_GATEWAYS,
    isArweaveUrl,
    parseArweaveUrl,
    constructGatewayUrl,
} from './utils/arweaveUtils.js';

// Type helpers
export { asClass, isValidClass } from './core/types/Character.js';

// ============================================================================
// CHARACTER GENERATION
// ============================================================================

export { CharacterGenerator, type CharacterGeneratorOptions } from './core/generation/CharacterGenerator.js';
export { RaceSelector } from './core/generation/RaceSelector.js';
export { ClassSuggester } from './core/generation/ClassSuggester.js';
export { AbilityScoreCalculator } from './core/generation/AbilityScoreCalculator.js';
export { SkillAssigner } from './core/generation/SkillAssigner.js';
export { SpellManager, type SpellSlots } from './core/generation/SpellManager.js';
export { EquipmentGenerator } from './core/generation/EquipmentGenerator.js';
export { AppearanceGenerator } from './core/generation/AppearanceGenerator.js';
export { NamingEngine } from './core/generation/NamingEngine.js';

// ============================================================================
// ENEMY GENERATION
// ============================================================================

export { EnemyGenerator } from './core/generation/EnemyGenerator.js';

// Enemy types
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
} from './core/types/Enemy.js';

export {
    isValidEnemyCategory,
    isValidEnemyRarity,
    isValidEnemyArchetype,
    isValidEncounterDifficulty
} from './core/types/Enemy.js';

// Enemy constants
export {
    RARITY_CONFIGS,
    getRarityConfig,
    getSignatureDie,
    getAllRarities,
    getHigherRarity
} from './constants/EnemyRarity.js';

export {
    DEFAULT_ENEMY_TEMPLATES,
    getTemplateById,
    getTemplatesByCategory,
    getTemplatesByArchetype
} from './constants/DefaultEnemies.js';

export {
    XP_BUDGET_PER_LEVEL,
    ENEMY_COUNT_MULTIPLIER,
    CR_TO_XP,
    TUNING_FACTORS,
    getXPForCR,
    getCRFromXP,
    applyTuning,
    getXPBudgetPerLevel,
    getXPBudgetForParty,
    getEncounterMultiplier,
    calculateAdjustedXP,
    getAveragePartyLevel,
    isValidEncounterDifficulty as isValidEncounterDifficultyUtil
} from './constants/EncounterBalance.js';

// Party analysis
export { PartyAnalyzer, type PartyAnalysis } from './core/combat/PartyAnalyzer.js';

// ============================================================================
// PLAYLIST PARSING & ANALYSIS
// ============================================================================

export { PlaylistParser } from './core/parser/PlaylistParser.js';
export { MetadataExtractor } from './core/parser/MetadataExtractor.js';
export { AudioAnalyzer, type AudioAnalyzerOptions, type SamplingStrategy } from './core/analysis/AudioAnalyzer.js';
export { SpectrumScanner } from './core/analysis/SpectrumScanner.js';
export { ColorExtractor } from './core/analysis/ColorExtractor.js';

// ============================================================================
// BEAT DETECTION SYSTEM
// ============================================================================

// Core beat detection classes
export { BeatMapGenerator, type ProgressCallback } from './core/analysis/beat/BeatMapGenerator.js';
export { BeatStream } from './core/analysis/beat/BeatStream.js';
export { OnsetStrengthEnvelope, type OSEResult } from './core/analysis/beat/OnsetStrengthEnvelope.js';
export { BeatTracker, type BeatTrackingResult } from './core/analysis/beat/BeatTracker.js';
export { TempoDetector } from './core/analysis/beat/TempoDetector.js';
export { BeatInterpolator } from './core/analysis/beat/BeatInterpolator.js';
export { BeatSubdivider, type BeatSubdividerOptions } from './core/analysis/beat/BeatSubdivider.js';
export { GrooveAnalyzer } from './core/analysis/beat/GrooveAnalyzer.js';
export { unifyBeatMap } from './core/analysis/beat/utils/unifyBeatMap.js';
export { subdivideBeatMap } from './core/analysis/beat/utils/subdivideBeatMap.js';

// Beat Key Helpers (for rhythm game chart creation)
export {
    assignKeyToBeat,
    assignKeysToBeats,
    extractKeyMap,
    clearAllKeys,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
    type KeyAssignableBeatMap,
    type KeyAssignment,
} from './core/analysis/beat/beatKeyHelpers.js';

// Subdivision Playback Controller (Practice Mode)
export { SubdivisionPlaybackController } from './core/playback/SubdivisionPlaybackController.js';

// Beat detection utilities
export {
    hzToMel,
    melToHz,
    resampleAudio,
    createMelFilterbank,
    highPassFilter,
    gaussianSmooth,
    calculateStdDev,
    performFFT as performBeatFFT,
    performSTFT,
    type ResampledAudio,
    type STFTResult,
} from './core/analysis/beat/utils/audioUtils.js';

// ============================================================================
// PROGRESSION SYSTEM
// ============================================================================

export { XPCalculator } from './core/progression/XPCalculator.js';
export { SessionTracker } from './core/progression/SessionTracker.js';
export { LevelUpProcessor } from './core/progression/LevelUpProcessor.js';
export { CharacterUpdater } from './core/progression/CharacterUpdater.js';
export { PrestigeSystem } from './core/progression/PrestigeSystem.js';
export { RhythmXPCalculator } from './core/progression/RhythmXPCalculator.js';

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

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

export { CombatEngine } from './core/combat/CombatEngine.js';

// Dice rolling utilities
export { DiceRoller } from './core/combat/DiceRoller.js';

// Combat system classes
export { InitiativeRoller } from './core/combat/InitiativeRoller.js';
export { AttackResolver } from './core/combat/AttackResolver.js';
export { SpellCaster } from './core/combat/SpellCaster.js';

// ============================================================================
// EQUIPMENT SYSTEM
// ============================================================================

export { EquipmentModifier } from './core/equipment/EquipmentModifier.js';
export { EquipmentEffectApplier } from './core/equipment/EquipmentEffectApplier.js';
export { EquipmentValidator } from './core/equipment/EquipmentValidator.js';
export { EquipmentSpawnHelper } from './core/equipment/EquipmentSpawnHelper.js';
export { BoxOpener } from './core/equipment/BoxOpener.js';

// ============================================================================
// FEATURES SYSTEM
// ============================================================================

export { FeatureQuery, getFeatureQuery } from './core/features/FeatureQuery.js';
export { FeatureEffectApplier } from './core/features/FeatureEffectApplier.js';
export { FeatureValidator } from './core/features/FeatureValidator.js';
export {
    validateClassFeature,
    validateRacialTrait,
    validateClassFeatures,
    validateRacialTraits
} from './core/features/FeatureValidator.js';

// Additional feature types
export type {
    FeatureEffectType,
    FeatureType,
    FeatureSource,
    CharacterFeature,
    CharacterTrait
} from './core/features/index.js';

// Default features and traits
export {
    DEFAULT_CLASS_FEATURES,
    DEFAULT_RACIAL_TRAITS
} from './constants/DefaultFeatures.js';

// ============================================================================
// SKILLS SYSTEM
// ============================================================================

export { SkillQuery, getSkillQuery } from './core/skills/SkillQuery.js';
export { SkillValidator } from './core/skills/SkillValidator.js';

// Additional skill validators
export {
    validateSkill,
    validateSkills,
    validateSkillProficiency,
    validateSkillProficiencies,
    validateSkillListDefinition,
    validateSkillPrerequisites
} from './core/skills/SkillValidator.js';

// Default skills
export {
    DEFAULT_SKILLS,
    DEFAULT_SKILL_CATEGORIES
} from './constants/DefaultSkills.js';

// Additional skill types
export type {
    SkillProficiency,
    SkillSelectionWeights,
    SkillListDefinition,
    SkillValidationResult,
    SkillQueryStats
} from './core/skills/index.js';

// ============================================================================
// SPELLS SYSTEM
// ============================================================================

export { SpellValidator } from './core/spells/SpellValidator.js';
export { SpellQuery, getSpellQuery } from './core/spells/SpellQuery.js';

// Additional spell validators
export {
    validateSpell,
    validateSpells,
    validateSpellPrerequisitesSchema,
    validateSpellPrerequisites
} from './core/spells/index.js';

// ============================================================================
// EXTENSIBILITY SYSTEM
// ============================================================================

export { ExtensionManager } from './core/extensions/ExtensionManager.js';
export type { ImageOverride } from './core/extensions/ExtensionManager.js';
export { WeightedSelector } from './core/extensions/WeightedSelector.js';

// Extensibility types
export type { ExtensionCategory, SelectionMode } from './core/extensions/index.js';

// Extension initialization helpers
export {
    initializeAppearanceDefaults,
    areAppearanceDefaultsInitialized,
    ensureAppearanceDefaultsInitialized,
    initializeSpellDefaults,
    areSpellDefaultsInitialized,
    ensureSpellDefaultsInitialized,
    initializeEquipmentDefaults,
    areEquipmentDefaultsInitialized,
    ensureEquipmentDefaultsInitialized,
    initializeRaceDefaults,
    areRaceDefaultsInitialized,
    ensureRaceDefaultsInitialized,
    initializeRaceDataDefaults,
    areRaceDataDefaultsInitialized,
    ensureRaceDataDefaultsInitialized,
    initializeClassDefaults,
    areClassDefaultsInitialized,
    ensureClassDefaultsInitialized,
    initializeFeatureDefaults,
    areFeatureDefaultsInitialized,
    ensureFeatureDefaultsInitialized,
    initializeSkillDefaults,
    areSkillDefaultsInitialized,
    ensureSkillDefaultsInitialized,
    initializeAllDefaults,
    ensureAllDefaultsInitialized
} from './core/extensions/index.js';

// ============================================================================
// SENSORS
// ============================================================================

export { EnvironmentalSensors } from './core/sensors/EnvironmentalSensors.js';
export { GamingPlatformSensors } from './core/sensors/GamingPlatformSensors.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Sensor configuration
export {
    DEFAULT_SENSOR_CONFIG,
    loadConfigFromEnv,
    mergeConfig,
    type SensorConfig,
    type CacheConfig,
    type GeolocationSensorConfig,
    type WeatherSensorConfig,
    type GamingSensorConfig,
    type XPModifierConfig,
    type RetryConfig
} from './core/config/index.js';

// Progression configuration
export {
    DEFAULT_PROGRESSION_CONFIG,
    mergeProgressionConfig,
    type ProgressionConfig
} from './core/config/progressionConfig.js';

// ============================================================================
// CONSTANTS
// ============================================================================

// Race data and helper functions
export {
    RACE_DATA,
    DEFAULT_RACE_DATA_ARRAY,
    getRaceData,
    getRaceDataAsync
} from './constants/DefaultRaces.js';

// ALL_RACES is still defined in utils/constants.ts
export { ALL_RACES } from './utils/constants.js';

// Class data and related constants
export {
    CLASS_DATA,
    ALL_CLASSES,
    CLASS_AUDIO_PREFERENCES
} from './constants/DefaultClasses.js';

// Spell data and related constants
export {
    SPELL_DATABASE,
    CLASS_SPELL_LISTS,
    SPELL_SLOTS_BY_CLASS,
    type ClassSpellListData
} from './constants/DefaultSpells.js';

// XP and progression constants (still in constants.ts)
export {
    XP_THRESHOLDS,
    PROFICIENCY_BONUS,
    SKILL_ABILITY_MAP,
    MASTERY_THRESHOLD,
    MASTERY_BONUS_XP
} from './utils/constants.js';

// Helper functions (still in constants.ts)
export {
    getClassData,
    getClassSpellList,
    getSpellSlotsForClass
} from './utils/constants.js';

// ============================================================================
// EQUIPMENT CONSTANTS
// ============================================================================

export {
    DEFAULT_EQUIPMENT
} from './constants/DefaultEquipment.js';
export {
    CLASS_STARTING_EQUIPMENT,
    getClassStartingEquipment
} from './utils/equipmentConstants.js';
export {
    MAGIC_ITEMS
} from './constants/MagicItems.js';
export {
    ITEM_CREATION_TEMPLATES
} from './constants/ItemTemplates.js';
export {
    ENCHANTMENT_LIBRARY
} from './constants/DefaultEnchantments.js';

// ============================================================================
// ENCHANTMENT & CURSE LIBRARY
// ============================================================================

export {
    EnchantmentLibrary,
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
} from './utils/EnchantmentLibrary.js';

// ============================================================================
// SENSOR DASHBOARD
// ============================================================================

export {
    displayEnvironmentalDiagnostics,
    displayGamingDiagnostics,
    displaySystemDashboard
} from './utils/sensorDashboard.js';

export { SensorDashboard } from './utils/sensorDashboard.js';
export type { DashboardConfig } from './utils/sensorDashboard.js';

// ============================================================================
// MAGIC ITEM HELPER FUNCTIONS
// ============================================================================
// Note: MAGIC_ITEMS is exported from constants/MagicItems.js above
// This file only provides helper functions for working with magic items

export {
    getMagicItem,
    getMagicItemsByType,
    getMagicItemsByRarity,
    getCursedItems,
    getItemsWithProperty,
    applyTemplate
} from './utils/magicItemExamples.js';
