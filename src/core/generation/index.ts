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
