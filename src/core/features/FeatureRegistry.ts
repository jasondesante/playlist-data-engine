/**
 * FeatureRegistry
 *
 * Central registry for class features and racial traits.
 * Manages default and custom features with prerequisite validation.
 *
 * **Design:** FeatureRegistry provides query methods that read from ExtensionManager.
 * All feature registration is done via ExtensionManager.register().
 *
 * This class provides:
 * - Query methods with caching for performance
 * - Feature-related helper methods
 * - Prerequisite validation
 *
 * No duplicate storage - all data lives in ExtensionManager.
 *
 * **Note:** Both class features and racial traits read from ExtensionManager.
 * To register new features, use ExtensionManager.register() directly.
 */

import type {
    ClassFeature,
    RacialTrait,
    ValidationResult
} from './FeatureTypes.js';
import type { Class, Race } from '../types/Character.js';
import type { CharacterSheet } from '../types/Character.js';
import { getRaceData } from '../../utils/constants.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';

/**
 * FeatureRegistry - Singleton class for managing features and traits
 *
 * The registry provides query methods that read from ExtensionManager.
 * All class features and racial traits are stored in ExtensionManager; FeatureRegistry provides:
 * - Query methods with caching for performance
 * - Feature-related helper methods
 * - Prerequisite validation
 *
 * Design principle: No duplicate storage. All feature data lives in ExtensionManager.
 * To register new features, use ExtensionManager.register() directly.
 */
export class FeatureRegistry {
    private static instance: FeatureRegistry;
    private manager: ExtensionManager;

    // Cache properties for class features (reads from ExtensionManager)
    private allClassFeaturesCache: ClassFeature[] | null = null;
    private classFeaturesIndex: Map<string, ClassFeature[]> | null = null;

    // Cache properties for racial traits (reads from ExtensionManager)
    private allRacialTraitsCache: RacialTrait[] | null = null;
    private racialTraitsIndex: Map<string, RacialTrait[]> | null = null;

    private constructor() {
        this.manager = ExtensionManager.getInstance();
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): FeatureRegistry {
        if (!FeatureRegistry.instance) {
            FeatureRegistry.instance = new FeatureRegistry();
        }
        return FeatureRegistry.instance;
    }

    /**
     * Invalidate all caches
     *
     * Call this method after directly manipulating ExtensionManager's data
     * (e.g., after calling ExtensionManager.resetAll()).
     *
     * This ensures that FeatureRegistry's cached data is refreshed to reflect
     * the current state of ExtensionManager.
     */
    invalidateCache(): void {
        this.allClassFeaturesCache = null;
        this.classFeaturesIndex = null;
        this.allRacialTraitsCache = null;
        this.racialTraitsIndex = null;
    }

    /**
     * Get all class features as an array
     *
     * Reads from ExtensionManager with caching.
     *
     * @returns Array of all class features
     */
    private getAllClassFeaturesArray(): ClassFeature[] {
        if (!this.allClassFeaturesCache) {
            const features = this.manager.get('classFeatures');
            this.allClassFeaturesCache = features as ClassFeature[];
        }
        return this.allClassFeaturesCache;
    }

    /**
     * Get all racial traits as an array
     *
     * Reads from ExtensionManager with caching.
     *
     * @returns Array of all racial traits
     */
    private getAllRacialTraitsArray(): RacialTrait[] {
        if (!this.allRacialTraitsCache) {
            const traits = this.manager.get('racialTraits');
            this.allRacialTraitsCache = traits as RacialTrait[];
        }
        return this.allRacialTraitsCache;
    }

    /**
     * Get all features for a class at a specific level
     *
     * Returns all features the character would have at the given level,
     * including features from lower levels.
     *
     * Reads from ExtensionManager with caching.
     *
     * @param className - Class to get features for
     * @param level - Character level (1-20)
     * @returns Array of class features
     */
    getClassFeatures(className: Class, level: number): ClassFeature[] {
        const allFeatures = this.getAllClassFeaturesArray();
        return allFeatures.filter(f => f.class === className && f.level <= level);
    }

    /**
     * Get features gained at a specific level for a class
     *
     * Returns only the features gained at exactly this level.
     *
     * Reads from ExtensionManager with caching.
     *
     * @param className - Class to get features for
     * @param level - Level to check
     * @returns Array of class features
     */
    getFeaturesForLevel(className: Class, level: number): ClassFeature[] {
        const allFeatures = this.getAllClassFeaturesArray();
        return allFeatures.filter(f => f.class === className && f.level === level);
    }

    /**
     * Alias for getFeaturesForLevel for API compatibility
     *
     * @param className - Class to get features for
     * @param level - Level to check
     * @returns Array of class features
     */
    getClassFeaturesForLevel(className: Class, level: number): ClassFeature[] {
        return this.getFeaturesForLevel(className, level);
    }

    /**
     * Get a single class feature by ID
     *
     * Reads from ExtensionManager.
     *
     * @param featureId - Feature ID to look up
     * @returns Class feature or undefined if not found
     */
    getClassFeatureById(featureId: string): ClassFeature | undefined {
        const allFeatures = this.getAllClassFeaturesArray();
        return allFeatures.find(f => f.id === featureId);
    }

    /**
     * Get all class features organized by class
     *
     * Returns a Map where keys are class names and values are arrays
     * of all features for that class.
     *
     * Reads from ExtensionManager with caching.
     *
     * @returns Map of class names to their features
     */
    getAllClassFeatures(): Map<string, ClassFeature[]> {
        if (!this.classFeaturesIndex) {
            this.classFeaturesIndex = new Map();
            const allFeatures = this.getAllClassFeaturesArray();
            for (const feature of allFeatures) {
                if (!this.classFeaturesIndex.has(feature.class)) {
                    this.classFeaturesIndex.set(feature.class, []);
                }
                this.classFeaturesIndex.get(feature.class)!.push(feature);
            }
        }
        return new Map(this.classFeaturesIndex);
    }

    /**
     * Get all racial traits for a race
     *
     * Reads from ExtensionManager with caching.
     *
     * @param race - Race to get traits for
     * @returns Array of racial traits
     */
    getRacialTraits(race: Race): RacialTrait[] {
        const allTraits = this.getAllRacialTraitsArray();
        return allTraits.filter(t => t.race === race);
    }

    /**
     * Get only base racial traits (excluding subrace-specific traits)
     *
     * Returns traits that apply to all members of a race, regardless of subrace.
     *
     * Reads from ExtensionManager with caching.
     *
     * @param race - Race to get base traits for
     * @returns Array of base racial traits
     */
    getBaseRacialTraits(race: Race): RacialTrait[] {
        const allTraits = this.getAllRacialTraitsArray();
        return allTraits.filter(t => t.race === race && !t.subrace);
    }

    /**
     * Get racial traits for a specific subrace
     *
     * Returns base traits for the race plus subrace-specific traits.
     *
     * Reads from ExtensionManager with caching.
     *
     * @param race - Base race
     * @param subrace - Subrace name
     * @returns Array of racial traits for the subrace
     */
    getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[] {
        const allTraits = this.getAllRacialTraitsArray();
        return allTraits.filter(t => t.race === race && (!t.subrace || t.subrace === subrace));
    }

    /**
     * Get only subrace-specific traits
     *
     * Returns only traits that specifically apply to the given subrace.
     *
     * Reads from ExtensionManager with caching.
     *
     * @param race - Base race
     * @param subrace - Subrace name
     * @returns Array of subrace-specific traits
     */
    getSubraceTraits(race: Race, subrace: string): RacialTrait[] {
        const allTraits = this.getAllRacialTraitsArray();
        return allTraits.filter(t => t.race === race && t.subrace === subrace);
    }

    /**
     * Get all available subraces for a race
     *
     * Returns a unique list of subrace names for the given race.
     * First checks RACE_DATA for a defined subraces list, then falls back
     * to deriving subraces from registered racial traits (for custom content).
     *
     * Reads from ExtensionManager with caching.
     *
     * @param race - Race to get subraces for
     * @returns Array of unique subrace names
     */
    getAvailableSubraces(race: Race): string[] {
        // Check RACE_DATA first (for default races with defined subraces)
        const raceData = getRaceData(race);
        if (raceData?.subraces && raceData.subraces.length > 0) {
            return raceData.subraces;
        }

        // Fall back to deriving from traits (for custom races/content)
        const allTraits = this.getAllRacialTraitsArray();
        const subraces = new Set<string>();
        for (const trait of allTraits) {
            if (trait.race === race && trait.subrace) {
                subraces.add(trait.subrace);
            }
        }
        return Array.from(subraces).sort();
    }

    /**
     * Find the race associated with a given subrace
     *
     * Searches through all registered racial traits to find which race
     * has traits with the specified subrace. Returns undefined if the
     * subrace is not found in any race's traits.
     *
     * Reads from ExtensionManager.
     *
     * @param subrace - Subrace name to look up
     * @returns Race that has this subrace, or undefined if not found
     */
    getRaceForSubrace(subrace: string): Race | undefined {
        const allTraits = this.getAllRacialTraitsArray();
        for (const trait of allTraits) {
            if (trait.subrace === subrace) {
                return trait.race;
            }
        }
        return undefined;
    }

    /**
     * Get a single racial trait by ID
     *
     * Reads from ExtensionManager.
     *
     * @param traitId - Trait ID to look up
     * @returns Racial trait or undefined if not found
     */
    getRacialTraitById(traitId: string): RacialTrait | undefined {
        const allTraits = this.getAllRacialTraitsArray();
        return allTraits.find(t => t.id === traitId);
    }

    /**
     * Get all racial traits organized by race
     *
     * Returns a Map where keys are race names and values are arrays
     * of all traits for that race.
     *
     * Reads from ExtensionManager with caching.
     *
     * @returns Map of race names to their traits
     */
    getAllRacialTraits(): Map<string, RacialTrait[]> {
        if (!this.racialTraitsIndex) {
            this.racialTraitsIndex = new Map();
            const allTraits = this.getAllRacialTraitsArray();
            for (const trait of allTraits) {
                if (!this.racialTraitsIndex.has(trait.race)) {
                    this.racialTraitsIndex.set(trait.race, []);
                }
                this.racialTraitsIndex.get(trait.race)!.push(trait);
            }
        }
        return new Map(this.racialTraitsIndex);
    }

    /**
     * Validate feature prerequisites against a character
     *
     * Checks if the character meets all requirements for a feature or trait.
     *
     * @param feature - Feature or trait to validate
     * @param character - Character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    validatePrerequisites(
        feature: ClassFeature | RacialTrait,
        character: CharacterSheet
    ): ValidationResult {
        const errors: string[] = [];

        if (!feature.prerequisites) {
            return { valid: true };
        }

        const prereqs = feature.prerequisites;

        // Check level requirement
        if (prereqs.level !== undefined && character.level < prereqs.level) {
            errors.push(`Requires level ${prereqs.level} (current: ${character.level})`);
        }

        // Check ability score requirements
        if (prereqs.abilities) {
            for (const [ability, minScore] of Object.entries(prereqs.abilities)) {
                const currentScore = character.ability_scores[ability as keyof typeof character.ability_scores];
                if (currentScore === undefined || currentScore < minScore) {
                    errors.push(`Requires ${ability} ${minScore} (current: ${currentScore ?? 0})`);
                }
            }
        }

        // Check class requirement
        if (prereqs.class !== undefined && character.class !== prereqs.class) {
            errors.push(`Requires class ${prereqs.class}`);
        }

        // Check race requirement
        if (prereqs.race !== undefined && character.race !== prereqs.race) {
            errors.push(`Requires race ${prereqs.race} (current: ${character.race})`);
        }

        // Check subrace requirement
        if (prereqs.subrace !== undefined) {
            if (!character.subrace || character.subrace !== prereqs.subrace) {
                errors.push(`Requires subrace ${prereqs.subrace} (current: ${character.subrace || 'none'})`);
            }
        }

        // Check skill prerequisites (skills that must be proficient first)
        if (prereqs.skills && prereqs.skills.length > 0) {
            for (const requiredSkillId of prereqs.skills) {
                const proficiency = character.skills[requiredSkillId];
                if (proficiency !== 'proficient' && proficiency !== 'expertise') {
                    errors.push(`Requires proficiency in ${requiredSkillId}`);
                }
            }
        }

        // Check spell prerequisites (spells that must be known first)
        if (prereqs.spells && prereqs.spells.length > 0) {
            const knownSpells = character.spells?.known_spells || [];
            const cantrips = character.spells?.cantrips || [];
            const allKnownSpells = [...knownSpells, ...cantrips];

            for (const requiredSpell of prereqs.spells) {
                if (!allKnownSpells.includes(requiredSpell)) {
                    errors.push(`Requires spell: ${requiredSpell}`);
                }
            }
        }

        // Check feature prerequisites (must have these features already)
        if (prereqs.features && prereqs.features.length > 0) {
            const characterFeatures = this.getCharacterFeatureIds(character);

            for (const requiredFeatureId of prereqs.features) {
                if (!characterFeatures.includes(requiredFeatureId)) {
                    // Try to get the feature name from ExtensionManager
                    const requiredFeature = this.getClassFeatureById(requiredFeatureId);
                    const featureName = requiredFeature?.name || requiredFeatureId;
                    errors.push(`Requires feature: ${featureName}`);
                }
            }
        }

        // Note: Custom conditions cannot be automatically validated
        // They must be checked by the calling code

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            unmet: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Validate class feature prerequisites against a character
     *
     * Alias for validatePrerequisites with type safety for ClassFeature.
     *
     * @param feature - Class feature to validate
     * @param character - Character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    validateFeaturePrerequisites(feature: ClassFeature, character: CharacterSheet): ValidationResult {
        return this.validatePrerequisites(feature, character);
    }

    /**
     * Validate racial trait prerequisites against a character
     *
     * Alias for validatePrerequisites with type safety for RacialTrait.
     *
     * @param trait - Racial trait to validate
     * @param character - Character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    validateTraitPrerequisites(trait: RacialTrait, character: CharacterSheet): ValidationResult {
        return this.validatePrerequisites(trait, character);
    }

    /**
     * Get all feature IDs a character currently has
     *
     * Helper method for prerequisite validation.
     *
     * @param character - Character sheet
     * @returns Array of feature IDs
     */
    private getCharacterFeatureIds(character: CharacterSheet): string[] {
        // In the old format, class_features are display strings
        // In the new format, they should be feature IDs
        // For now, we return both formats
        return character.class_features || [];
    }

    /**
     * Check if a character can gain a feature
     *
     * Convenience method that validates prerequisites and returns boolean.
     *
     * @param feature - Feature or trait to check
     * @param character - Character sheet
     * @returns True if character meets all prerequisites
     */
    canGainFeature(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean {
        const result = this.validatePrerequisites(feature, character);
        return result.valid;
    }

    /**
     * Check if a character meets the prerequisites for a feature
     *
     * Alias for canGainFeature() for API compatibility with documentation.
     *
     * @param feature - Feature or trait to check
     * @param character - Character sheet
     * @returns True if character meets all prerequisites
     */
    meetsPrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean {
        return this.canGainFeature(feature, character);
    }

    /**
     * Get all classes that have features registered
     *
     * Reads from ExtensionManager.
     *
     * @returns Array of class names
     */
    getRegisteredClasses(): Class[] {
        const allFeatures = this.getAllClassFeaturesArray();
        const classesSet = new Set<Class>();
        for (const feature of allFeatures) {
            classesSet.add(feature.class);
        }
        return Array.from(classesSet);
    }

    /**
     * Get all races that have traits registered
     *
     * Reads from ExtensionManager.
     *
     * @returns Array of race names
     */
    getRegisteredRaces(): Race[] {
        const allTraits = this.getAllRacialTraitsArray();
        const racesSet = new Set<Race>();
        for (const trait of allTraits) {
            racesSet.add(trait.race);
        }
        return Array.from(racesSet);
    }

    /**
     * Get total count of registered features
     *
     * Reads from ExtensionManager for both class features and racial traits.
     *
     * @returns Object with counts
     */
    getRegistryStats(): {
        totalClassFeatures: number;
        totalRacialTraits: number;
        classesWithFeatures: number;
        racesWithTraits: number;
    } {
        const allFeatures = this.getAllClassFeaturesArray();
        const classesSet = new Set<Class>();
        for (const feature of allFeatures) {
            classesSet.add(feature.class);
        }

        const allTraits = this.getAllRacialTraitsArray();
        const racesSet = new Set<Race>();
        for (const trait of allTraits) {
            racesSet.add(trait.race);
        }

        return {
            totalClassFeatures: allFeatures.length,
            totalRacialTraits: allTraits.length,
            classesWithFeatures: classesSet.size,
            racesWithTraits: racesSet.size
        };
    }

    /**
     * Reset the registry to initial state
     *
     * Clears all registered features and traits from ExtensionManager.
     * Useful for testing or reinitialization.
     */
    reset(): void {
        // Clear class features from ExtensionManager
        this.manager.reset('classFeatures');

        // Clear racial traits from ExtensionManager
        this.manager.reset('racialTraits');

        // Clear cache
        this.invalidateCache();
    }

    /**
     * Check if the registry has been initialized
     *
     * Checks ExtensionManager for racial traits data.
     *
     * @returns True if initialized with defaults
     */
    isInitialized(): boolean {
        // Check if ExtensionManager has racial traits data
        return this.manager.hasCustomData('racialTraits') || this.manager.getDefaults('racialTraits').length > 0;
    }

    /**
     * Get features granted by equipment
     *
     * Equipment features are features that can be granted by equipping items.
     * Features with spawnWeight: 0 are still valid for equipment use.
     *
     * Note: This method returns all features that can be granted by equipment.
     * To get features for a specific equipment item, use ExtensionManager
     * to retrieve the equipment definition and check its grantsFeatures property.
     *
     * @param equipmentName - Name of the equipment piece (reserved for future use)
     * @returns Array of features that can be granted by equipment
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static getEquipmentFeatures(equipmentName: string): ClassFeature[] {
        const registry = FeatureRegistry.getInstance();

        // Get all features that could be granted by equipment
        // Equipment can grant features that are registered in the system
        const equipmentFeatures: ClassFeature[] = [];

        // Check all registered features for equipment-grantable ones
        const allFeatures = registry.getAllClassFeaturesArray();
        for (const feature of allFeatures) {
            // Features with tags including 'equipment' or that are commonly granted by items
            if (feature.tags?.includes('equipment') ||
                feature.tags?.includes('item') ||
                feature.source === 'custom') {
                equipmentFeatures.push(feature);
            }
        }

        return equipmentFeatures;
    }

    /**
     * Check if a feature can be granted by equipment
     *
     * Features with spawnWeight: 0 are still valid for equipment.
     * This method checks if a feature ID exists in the registry and can be
     * referenced by equipment definitions.
     *
     * @param featureId - Feature ID to check
     * @returns True if the feature exists and can be granted by equipment
     */
    static isValidEquipmentFeature(featureId: string): boolean {
        const registry = FeatureRegistry.getInstance();
        const feature = registry.getClassFeatureById(featureId);

        // Feature exists in registry
        if (!feature) {
            return false;
        }

        // All registered features can potentially be granted by equipment
        // The spawnWeight: 0 only affects random generation, not equipment references
        return true;
    }

    /**
     * Get all racial traits as a plain object (for debugging/serialization)
     *
     * Note: For both class features and racial traits, use ExtensionManager.get() directly.
     * This method is kept for API compatibility.
     *
     * Reads from ExtensionManager.
     *
     * @returns Object mapping race names to their traits
     */
    exportRacialTraits(): Record<string, RacialTrait[]> {
        const racialTraitsExport: Record<string, RacialTrait[]> = {};
        const traitsByRace = this.getAllRacialTraits();
        for (const [race, traits] of traitsByRace.entries()) {
            racialTraitsExport[race] = traits;
        }
        return racialTraitsExport;
    }
}

/**
 * Get the global FeatureRegistry instance
 *
 * Convenience function for accessing the singleton.
 *
 * @returns FeatureRegistry instance
 */
export function getFeatureRegistry(): FeatureRegistry {
    return FeatureRegistry.getInstance();
}
