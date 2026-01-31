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
    FrequencyBands
} from './core/types/AudioProfile.js';

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

export type { LevelUpBenefits, UncappedProgressionConfig } from './core/progression/LevelUpProcessor.js';
export type { CharacterUpdateResult } from './core/progression/CharacterUpdater.js';

// Character generation types
export type { CharacterAppearance } from './core/generation/AppearanceGenerator.js';
export type { CharacterEquipment } from './core/generation/EquipmentGenerator.js';
export type { InventoryItem } from './core/generation/EquipmentGenerator.js';

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

export type { EffectApplicationResult, CharacterEffect } from './core/features/FeatureEffectApplier.js';

// Skill types
export type {
    CustomSkill,
    SkillPrerequisite
} from './core/skills/SkillTypes.js';

// Extensibility types
export type {
    ExtensionOptions,
    ValidationResult
} from './core/extensions/ExtensionManager.js';

export type { SpellPrerequisite } from './utils/constants.js';
export type { Spell, Equipment } from './utils/constants.js';

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
    BiomeType
} from './core/types/Environmental.js';

// Spell types
export type {
    RegisteredSpell,
    SpellSchool,
    ValidationResult as SpellValidationResult
} from './core/spells/SpellRegistry.js';

// Combat result types
export type { InitiativeResult } from './core/combat/InitiativeRoller.js';
export type { AttackResult } from './core/combat/AttackResolver.js';

// Equipment helper types
export type { SpawnRandomOptions, TreasureHoardResult } from './core/equipment/EquipmentSpawnHelper.js';

// ============================================================================
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

// Type helpers
export { asClass } from './core/types/Character.js';

// ============================================================================
// CHARACTER GENERATION
// ============================================================================

export { CharacterGenerator, type CharacterGeneratorOptions } from './core/generation/CharacterGenerator.js';
export { RaceSelector } from './core/generation/RaceSelector.js';
export { ClassSuggester } from './core/generation/ClassSuggester.js';
export { AbilityScoreCalculator } from './core/generation/AbilityScoreCalculator.js';
export { SkillAssigner } from './core/generation/SkillAssigner.js';
export { SpellManager } from './core/generation/SpellManager.js';
export { EquipmentGenerator } from './core/generation/EquipmentGenerator.js';
export { AppearanceGenerator } from './core/generation/AppearanceGenerator.js';
export { NamingEngine } from './core/generation/NamingEngine.js';

// ============================================================================
// PLAYLIST PARSING & ANALYSIS
// ============================================================================

export { PlaylistParser } from './core/parser/PlaylistParser.js';
export { MetadataExtractor } from './core/parser/MetadataExtractor.js';
export { AudioAnalyzer } from './core/analysis/AudioAnalyzer.js';
export { SpectrumScanner } from './core/analysis/SpectrumScanner.js';
export { ColorExtractor } from './core/analysis/ColorExtractor.js';

// ============================================================================
// PROGRESSION SYSTEM
// ============================================================================

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

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

export { CombatEngine } from './core/combat/CombatEngine.js';

// Dice rolling utilities
export {
    rollDie,
    rollMultipleDice,
    parseDiceFormula,
    rollD20,
    rollWithAdvantage,
    rollWithDisadvantage,
    rollInitiative,
    isCriticalHit,
    isCriticalMiss,
    doubleDamage,
    calculateDamage,
    rollSavingThrow,
    rollAbilityCheck,
    seededRoll,
    rollPercentile
} from './core/combat/DiceRoller.js';

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

// ============================================================================
// FEATURES SYSTEM
// ============================================================================

export { FeatureRegistry, getFeatureRegistry } from './core/features/FeatureRegistry.js';
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
} from './core/features/DefaultFeatures.js';

// ============================================================================
// SKILLS SYSTEM
// ============================================================================

export { SkillRegistry, getSkillRegistry } from './core/skills/SkillRegistry.js';
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
} from './core/skills/DefaultSkills.js';

// Additional skill types
export type {
    SkillProficiency,
    SkillSelectionWeights,
    SkillListDefinition,
    SkillValidationResult,
    SkillRegistryStats
} from './core/skills/index.js';

// ============================================================================
// SPELLS SYSTEM
// ============================================================================

export { SpellValidator } from './core/spells/SpellValidator.js';
export { SpellRegistry, getSpellRegistry } from './core/spells/SpellRegistry.js';

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

// ============================================================================
// ENCHANTMENT & CURSE LIBRARY
// ============================================================================

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
// MAGIC ITEM EXAMPLES
// ============================================================================

export {
    MAGIC_ITEM_EXAMPLES,
    MAGIC_EQUIPMENT_TEMPLATES,
    getMagicItem,
    getMagicItemsByType,
    getMagicItemsByRarity,
    getCursedItems,
    getItemsWithProperty,
    applyTemplate
} from './utils/magicItemExamples.js';
