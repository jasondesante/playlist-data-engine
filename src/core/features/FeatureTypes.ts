/**
 * Feature Type Definitions
 *
 * Defines the interfaces for custom class features and racial traits.
 *
 * These interfaces allow for:
 * - Extensible feature definitions with prerequisites
 * - Feature effects (stat bonuses, skill proficiencies, ability unlocks)
 * - Integration with FeatureQuery for runtime customization
 */

import type { Class, Race, Ability } from '../types/Character.js';

/**
 * Feature effect types that modify character capabilities
 *
 * - stat_bonus: Add to an ability score (e.g., +1 STR)
 * - skill_proficiency: Grant proficiency or expertise in a skill
 * - ability_unlock: Unlock a new ability (e.g., flight, darkvision)
 * - passive_modifier: Add a constant modifier to rolls (e.g., +1 damage)
 * - resource_grant: Grant a resource pool (e.g., rage counts, ki points)
 * - spell_slot_bonus: Grant additional spell slots
 */
export type FeatureEffectType =
    | 'stat_bonus'
    | 'skill_proficiency'
    | 'ability_unlock'
    | 'passive_modifier'
    | 'resource_grant'
    | 'spell_slot_bonus';

/**
 * Feature effect that applies a mechanical benefit
 *
 * Effects are applied when a character gains a feature or trait.
 * Multiple effects can be combined for complex features.
 */
export interface FeatureEffect {
    /** Type of effect to apply */
    type: FeatureEffectType;

    /** Target stat, skill, or ability this affects */
    target: string;

    /** Value to apply (number for bonuses, string for unlocks, boolean for flags) */
    value: number | string | boolean;

    /** Optional condition for when this effect applies (e.g., "while raging") */
    condition?: string;

    /** Optional description of this specific effect */
    description?: string;
}

/**
 * Prerequisites for gaining a feature or trait
 *
 * Features can require:
 * - A minimum character level
 * - Other features to be learned first (chains)
 * - Minimum ability scores
 * - Specific class or race
 * - Skills that must be proficient first
 * - Spells that must be known first
 * - Custom conditions
 */
export interface FeaturePrerequisite {
    /** Minimum level required (default: 1) */
    level?: number;

    /** Features that must be learned first (by ID) */
    features?: string[];

    /** Minimum ability scores required */
    abilities?: Partial<Record<Ability, number>>;

    /** Specific class required (for multi-class features) */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description (for manual validation) */
    custom?: string;
}

/**
 * Feature type classification
 *
 * - passive: Always active, no action required (e.g., damage resistance)
 * - active: Requires an action or bonus action to use (e.g., Second Wind)
 * - resource: Grants a resource pool to spend (e.g., Ki Points, Rage)
 * - trigger: Automatic but conditional (e.g., Sneak Attack when conditions met)
 */
export type FeatureType = 'passive' | 'active' | 'resource' | 'trigger';

/**
 * Source of the feature definition
 *
 * - default: Built-in D&D 5e feature from the base game
 * - custom: User-created or expansion pack content
 */
export type FeatureSource = 'default' | 'custom';

/**
 * Complete definition of a class feature
 *
 * Features are abilities gained as a character levels up in their class.
 * Examples: Rage, Extra Attack, Metamagic, Unleash Incarnation
 */
export interface ClassFeature {
    /** Unique identifier for this feature (e.g., 'barbarian_rage', 'fighter_action_surge') */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the feature does */
    description: string;

    /** Type of feature (determines how it's used) */
    type: FeatureType;

    /** Character class this feature belongs to */
    class: Class;

    /** Level at which this feature is gained */
    level: number;

    /** Prerequisites that must be met to gain this feature */
    prerequisites?: FeaturePrerequisite;

    /** Effects applied when this feature is gained */
    effects?: FeatureEffect[];

    /** Whether this feature is built-in or custom */
    source: FeatureSource;

    /** Optional tags for filtering/categorizing (e.g., ['melee', 'damage']) */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;

    /** Optional icon URL for small UI display */
    icon?: string;

    /** Optional image URL for larger display */
    image?: string;
}

/**
 * Complete definition of a racial trait
 *
 * Traits are innate abilities granted by a character's race.
 * Examples: Darkvision, Fey Ancestry, Bravery, Stonecunning
 */
export interface RacialTrait {
    /** Unique identifier for this trait (e.g., 'elf_darkvision', 'dwarf_dwarven_resilience') */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the trait does */
    description: string;

    /** Race this trait belongs to */
    race: Race;

    /** Optional subrace requirement (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Prerequisites that must be met */
    prerequisites?: FeaturePrerequisite;

    /** Effects applied when this trait is gained (usually at character creation) */
    effects?: FeatureEffect[];

    /** Whether this trait is built-in or custom */
    source: FeatureSource;

    /** Optional tags for filtering/categorizing */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

/**
 * Feature entry for character storage
 *
 * When stored on a CharacterSheet, features are tracked by ID
 * along with any dynamic state (uses remaining, choices made, etc.)
 */
export interface CharacterFeature {
    /** ID of the feature from the registry */
    featureId: string;

    /** Display name (cached for quick access) */
    name: string;

    /** Level at which this feature was gained */
    gainedAtLevel: number;

    /** Source of the feature */
    source: FeatureSource;

    /** Dynamic state for resource features (e.g., { uses: 3, maxUses: 3 }) */
    state?: Record<string, number | boolean | string>;

    /** Choices made for features with options (e.g., chosen Fighting Style) */
    choices?: Record<string, string | number | boolean>;
}

/**
 * Trait entry for character storage
 *
 * Similar to CharacterFeature but for racial traits
 */
export interface CharacterTrait {
    /** ID of the trait from the registry */
    traitId: string;

    /** Display name (cached for quick access) */
    name: string;

    /** Whether this is a default trait or custom */
    source: FeatureSource;
}

/**
 * Validation result for feature prerequisites
 */
export interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of prerequisite descriptions that are not met */
    unmet?: string[];

    /** Detailed error messages */
    errors?: string[];
}
