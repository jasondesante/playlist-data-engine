/**
 * Enemy Generation Type Definitions
 *
 * Defines types and interfaces for the enemy generation system.
 * Enemies are generated as CharacterSheet instances with enemy-specific
 * traits and abilities, supporting multiple rarity tiers and audio-influenced generation.
 */

import type { AudioProfile } from './AudioProfile.js';
import type { AbilityScores, Attack } from './Character.js';
import type { DamageType } from './Combat.js';
import type { PlaylistTrack } from './Playlist.js';

/**
 * Enemy categories for classification and filtering
 *
 * V1 Implementation: humanoid, beast
 * V2 Future: undead, dragon, fiend, construct, elemental, monstrosity
 */
export type EnemyCategory =
    | 'humanoid'
    | 'beast'
    | 'undead'
    | 'dragon'
    | 'fiend'
    | 'construct'
    | 'elemental'
    | 'monstrosity';

/**
 * Rarity tiers that determine enemy power scaling
 *
 * Each rarity increases stats, scales signature ability dice, and adds extra abilities
 */
export type EnemyRarity = 'common' | 'uncommon' | 'elite' | 'boss';

/**
 * Combat archetypes that define enemy role in battle
 *
 * V1 Implementation: brute, archer, support
 */
export type EnemyArchetype = 'brute' | 'archer' | 'support';

/**
 * Enemy mix modes for encounter generation
 *
 * V1 Implementation: uniform, custom
 * V2 Future: category, random
 */
export type EnemyMixMode = 'uniform' | 'custom';

/**
 * Difficulty settings for party-based encounters
 *
 * Maps to D&D 5e encounter difficulty thresholds
 */
export type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'deadly';

/**
 * Signature ability - The unique ability shared across all rarities of an enemy type
 *
 * The damageDie scales by rarity: d6 (common) -> d8 (uncommon) -> d10 (elite) -> d12 (boss)
 */
export interface SignatureAbility {
    /** Unique identifier for this ability */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the ability does */
    description: string;

    /** Base damage die (scales by rarity: d6 -> d8 -> d10 -> d12) */
    damageDie: string;

    /** Type of damage dealt */
    damageType: DamageType;

    /** Attack type (melee, ranged, spell) */
    attackType: 'melee' | 'ranged' | 'spell';

    /** Range in feet (for ranged attacks) */
    range?: number;

    /** Any special properties (e.g., 'versatile', 'finesse') */
    properties?: string[];
}

/**
 * Audio preference weights for template selection
 *
 * Determines which templates are more likely to be selected
 * based on audio profile characteristics
 */
export interface AudioPreference {
    /** Weight for bass-heavy audio (0.0 - 1.0) */
    bass: number;

    /** Weight for mid-range audio (0.0 - 1.0) */
    mid: number;

    /** Weight for treble-heavy audio (0.0 - 1.0) */
    treble: number;
}

/**
 * Enemy template - Base definition for an enemy type
 *
 * Templates define the foundation of an enemy that is then scaled
 * by rarity tier and modified by audio profile
 */
export interface EnemyTemplate {
    /** Unique identifier (e.g., 'orc', 'goblin-archer', 'giant-spider') */
    id: string;

    /** Display name (used as enemy name when generated) */
    name: string;

    /** Category for classification and filtering */
    category: EnemyCategory;

    /** Combat role archetype */
    archetype: EnemyArchetype;

    /** Signature ability shared across all rarities */
    signatureAbility: SignatureAbility;

    /** Base ability scores before rarity scaling */
    baseStats: AbilityScores;

    /** Base hit points before rarity scaling */
    baseHP: number;

    /** Base armor class before DEX modifier */
    baseAC: number;

    /** Base speed in feet */
    baseSpeed: number;

    /** Audio preference weights for template selection */
    audioPreference: AudioPreference;

    /** Damage resistances/immunities for Elite+ rarity scaling */
    resistances?: {
        /** Damage types resisted (half damage) */
        resistances?: DamageType[];

        /** Damage types immune (zero damage) */
        immunities?: DamageType[];
    };
}

/**
 * Rarity configuration - Scaling factors per rarity tier
 *
 * Defines how enemies scale across rarity tiers
 */
export interface RarityConfig {
    /** Multiplier applied to base stats */
    statMultiplier: number;

    /** Die size for signature ability (6 = d6, 8 = d8, etc.) */
    signatureDieSize: number;

    /** Number of extra abilities from FeatureQuery pool */
    extraAbilityCount: number;

    /** Whether this rarity gains resistances from template */
    hasResistances: boolean;
}

/**
 * Options for generating a single enemy
 *
 * All generation is deterministic based on the provided seed
 */
export interface EnemyGenerationOptions {
    /** Required - Seed for deterministic generation */
    seed: string;

    /** Optional - Force specific template by ID */
    templateId?: string;

    /** Optional - Rarity tier (default: 'common') */
    rarity?: EnemyRarity;

    /** Optional - Difficulty multiplier (default: 1.0) */
    difficultyMultiplier?: number;

    /** Optional - Audio profile for stat influence */
    audioProfile?: AudioProfile;

    /** Optional - Track data (required if audioProfile provided) */
    track?: PlaylistTrack;
}

/**
 * Options for generating an encounter (group of enemies)
 *
 * Supports two generation modes:
 * 1. Party-based: Analyze party strength for balanced encounter
 * 2. CR-based: Generate enemies matching target CR directly
 */
export interface EncounterGenerationOptions {
    /** Required - Seed for deterministic generation */
    seed: string;

    /** Required - Number of enemies to generate */
    count: number;

    // --- Party-based mode ---
    /** Optional - Difficulty for party-based encounters (default: 'medium') */
    difficulty?: EncounterDifficulty;

    // --- CR-based mode ---
    /** Optional - Target CR for CR-based generation (no party needed) */
    targetCR?: number;

    // --- Common options ---
    /** Optional - Base rarity before leader promotion (default: 'common') */
    baseRarity?: EnemyRarity;

    /** Optional - Fine-tune difficulty multiplier (default: 1.0) */
    difficultyMultiplier?: number;

    /** Optional - Filter by category */
    category?: EnemyCategory;

    /** Optional - Filter by archetype */
    archetype?: EnemyArchetype;

    /** Optional - Force specific template for all enemies */
    templateId?: string;

    /** Optional - Enemy mix mode (default: 'uniform') */
    enemyMix?: EnemyMixMode;

    /** Optional - Template IDs for 'custom' mix mode */
    templates?: string[];

    /** Optional - Audio profile for template selection and stat influence */
    audioProfile?: AudioProfile;

    /** Optional - Track data (required if audioProfile provided) */
    track?: PlaylistTrack;

    /** Optional - Enable leader promotion for groups > 3 (default: true) */
    enableLeaderPromotion?: boolean;
}

/**
 * Generated enemy metadata
 *
 * Tracks information about how an enemy was generated
 */
export interface EnemyMetadata {
    /** Template ID used for generation */
    templateId: string;

    /** Rarity tier of this enemy */
    rarity: EnemyRarity;

    /** Seed used for generation */
    seed: string;

    /** Whether leader promotion was applied */
    isLeader?: boolean;

    /** Audio profile used (if any) */
    audioProfile?: AudioProfile;
}

/**
 * Feature type for enemy abilities
 *
 * Reuses ClassFeature structure but simplified for enemy use
 * Enemies don't have classes, so features are standalone abilities
 */
export interface EnemyFeature {
    /** Unique identifier */
    id: string;

    /** Display name */
    name: string;

    /** Description of ability */
    description: string;

    /** Type: passive, active, resource, trigger */
    type: 'passive' | 'active' | 'resource' | 'trigger';

    /** Attack data if this is an attack ability */
    attack?: Attack;

    /** Tags for filtering (e.g., ['melee', 'damage', 'control']) */
    tags?: string[];

    /** Rarity level this feature appears at */
    minRarity?: EnemyRarity;
}

/**
 * Type guard to check if a value is a valid EnemyCategory
 */
export function isValidEnemyCategory(value: unknown): value is EnemyCategory {
    const validCategories: EnemyCategory[] = [
        'humanoid',
        'beast',
        'undead',
        'dragon',
        'fiend',
        'construct',
        'elemental',
        'monstrosity'
    ];
    return typeof value === 'string' && validCategories.includes(value as EnemyCategory);
}

/**
 * Type guard to check if a value is a valid EnemyRarity
 */
export function isValidEnemyRarity(value: unknown): value is EnemyRarity {
    const validRarities: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];
    return typeof value === 'string' && validRarities.includes(value as EnemyRarity);
}

/**
 * Type guard to check if a value is a valid EnemyArchetype
 */
export function isValidEnemyArchetype(value: unknown): value is EnemyArchetype {
    const validArchetypes: EnemyArchetype[] = ['brute', 'archer', 'support'];
    return typeof value === 'string' && validArchetypes.includes(value as EnemyArchetype);
}

/**
 * Equipment template for enemy generation
 *
 * Defines equipment options for enemies based on archetype and rarity.
 * Used by EquipmentGenerator to select appropriate weapons/armor for enemies.
 */
export interface EquipmentTemplate {
    /** Unique identifier for this equipment template */
    id: string;

    /** Display name of the equipment */
    name: string;

    /** Equipment type: weapon, armor, or shield */
    type: 'weapon' | 'armor' | 'shield';

    /** Archetypes that can use this equipment */
    archetypes: EnemyArchetype[];

    /** Rarity tiers that can spawn this equipment */
    rarities: EnemyRarity[];

    /** Damage dice (for weapons) */
    damage?: string;

    /** AC bonus (for armor/shields) */
    acBonus?: number;

    /** Weapon properties (e.g., ['reach', 'two-handed']) */
    properties?: string[];
}

/**
 * Equipment configuration for generated enemies
 *
 * Contains the equipment assigned to an enemy during generation.
 */
export interface EquipmentConfig {
    /** Primary weapon (if any) */
    weapon?: EquipmentTemplate;

    /** Armor (if any) */
    armor?: EquipmentTemplate;

    /** Shield (if any) */
    shield?: EquipmentTemplate;
}

/**
 * Type guard to check if a value is a valid EncounterDifficulty
 */
export function isValidEncounterDifficulty(value: unknown): value is EncounterDifficulty {
    const validDifficulties: EncounterDifficulty[] = ['easy', 'medium', 'hard', 'deadly'];
    return typeof value === 'string' && validDifficulties.includes(value as EncounterDifficulty);
}
