/**
 * FeatureRegistry
 *
 * Central registry for class features and racial traits.
 * Manages default and custom features with prerequisite validation.
 *
 * **Design:** This is a **convenience wrapper** around ExtensionManager.
 * All features are stored in ExtensionManager; FeatureRegistry provides:
 * - Convenient registration methods that delegate to ExtensionManager
 * - Query methods with caching for performance
 * - Feature-related helper methods
 *
 * No duplicate storage - all data lives in ExtensionManager.
 *
 * **Note:** Racial traits still use internal storage (to be refactored in Phase 9).
 * Class features read from ExtensionManager (refactored in Phase 6).
 */

import type {
    ClassFeature,
    RacialTrait,
    ValidationResult
} from './FeatureTypes.js';
import type { Class, Race } from '../types/Character.js';
import type { CharacterSheet } from '../types/Character.js';
import { validateClassFeature, validateRacialTrait } from './FeatureValidator.js';
import { getRaceData } from '../../utils/constants.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';

/**
 * FeatureRegistry - Singleton class for managing features and traits
 *
 * The registry is a **convenience wrapper** around ExtensionManager.
 * All class features are stored in ExtensionManager; FeatureRegistry provides:
 * - Convenient registration methods that delegate to ExtensionManager
 * - Query methods with caching for performance
 * - Feature-related helper methods
 *
 * Racial traits still use internal storage (to be migrated to ExtensionManager in Phase 9).
 *
 * Design principle: No duplicate storage for class features. All class feature data lives in ExtensionManager.
 */
export class FeatureRegistry {
    private static instance: FeatureRegistry;
    private manager: ExtensionManager;

    // Racial traits - internal storage (to be refactored in Phase 9)
    private racialTraits: Map<string, RacialTrait[]>;
    private traitLookup: Map<string, RacialTrait>;
    private initialized: boolean = false;

    // Cache properties for class features (reads from ExtensionManager)
    private allClassFeaturesCache: ClassFeature[] | null = null;
    private classFeaturesIndex: Map<string, ClassFeature[]> | null = null;

    private constructor() {
        this.manager = ExtensionManager.getInstance();
        this.racialTraits = new Map();
        this.traitLookup = new Map();
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
     * Call this method after directly manipulating ExtensionManager's class feature data
     * (e.g., after calling ExtensionManager.resetAll()).
     *
     * This ensures that FeatureRegistry's cached data is refreshed to reflect
     * the current state of ExtensionManager.
     */
    private invalidateCache(): void {
        this.allClassFeaturesCache = null;
        this.classFeaturesIndex = null;
    }

    /**
     * Initialize the registry with default racial traits
     * This should be called once during package initialization
     *
     * Note: Class features are now initialized via ExtensionManager.
     * Use ExtensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES)
     * or call initializeFeatureDefaults() from initializeDefaults.ts.
     *
     * @param defaultRacialTraits - Default racial traits from constants
     */
    initializeDefaults(defaultRacialTraits: RacialTrait[] = []): void {
        if (this.initialized) {
            return; // Already initialized
        }

        // Clear any existing data
        this.reset();

        // Register default racial traits
        for (const trait of defaultRacialTraits) {
            this.registerRacialTrait(trait);
        }

        this.initialized = true;
    }

    /**
     * Register a single class feature
     *
     * Delegates to ExtensionManager.register('classFeatures', [...])
     *
     * @param feature - Class feature to register
     * @throws Error if feature ID already exists or validation fails
     */
    registerClassFeature(feature: ClassFeature): void {
        // Validate feature before registering
        const validation = validateClassFeature(feature);
        if (!validation.valid) {
            throw new Error(`Invalid class feature "${feature.id}":\n${validation.errors.join('\n')}`);
        }

        // Check for duplicate feature ID
        const existingFeatures = this.getAllClassFeaturesArray();
        if (existingFeatures.some(f => f.id === feature.id)) {
            throw new Error(`Class feature with ID "${feature.id}" already exists`);
        }

        // Ensure feature has source
        const featureToRegister = {
            ...feature,
            source: feature.source || 'custom'
        };

        // Delegate to ExtensionManager
        this.manager.register('classFeatures', [featureToRegister]);

        // Invalidate cache
        this.invalidateCache();
    }

    /**
     * Register multiple class features at once
     *
     * Delegates to ExtensionManager.register('classFeatures', [...])
     *
     * @param features - Array of class features to register
     * @throws Error if validation fails or if any feature ID already exists
     */
    registerClassFeatures(features: ClassFeature[]): void {
        // Validate all features first
        for (const feature of features) {
            const validation = validateClassFeature(feature);
            if (!validation.valid) {
                throw new Error(`Invalid class feature "${feature.id}":\n${validation.errors.join('\n')}`);
            }
        }

        // Check for duplicate feature IDs (both within batch and against existing features)
        const existingFeatures = this.getAllClassFeaturesArray();
        const existingIds = new Set(existingFeatures.map(f => f.id));
        const newIds = new Set<string>();

        for (const feature of features) {
            if (existingIds.has(feature.id)) {
                throw new Error(`Class feature with ID "${feature.id}" already exists`);
            }
            if (newIds.has(feature.id)) {
                throw new Error(`Duplicate class feature ID "${feature.id}" in batch`);
            }
            newIds.add(feature.id);
        }

        // Ensure all features have source
        const featuresToRegister = features.map(feature => ({
            ...feature,
            source: feature.source || 'custom'
        }));

        // Delegate to ExtensionManager
        this.manager.register('classFeatures', featuresToRegister);

        // Invalidate cache
        this.invalidateCache();
    }

    /**
     * Register a single racial trait
     *
     * @param trait - Racial trait to register
     * @throws Error if trait ID already exists or validation fails
     */
    registerRacialTrait(trait: RacialTrait): void {
        // Validate trait before registering
        const validation = validateRacialTrait(trait);
        if (!validation.valid) {
            throw new Error(`Invalid racial trait "${trait.id}":\n${validation.errors.join('\n')}`);
        }

        if (this.traitLookup.has(trait.id)) {
            throw new Error(`Racial trait with ID "${trait.id}" already exists`);
        }

        // Add to race-specific map
        const raceKey = trait.race;
        if (!this.racialTraits.has(raceKey)) {
            this.racialTraits.set(raceKey, []);
        }
        this.racialTraits.get(raceKey)!.push(trait);

        // Add to lookup map
        this.traitLookup.set(trait.id, trait);
    }

    /**
     * Register multiple racial traits at once
     *
     * @param traits - Array of racial traits to register
     */
    registerRacialTraits(traits: RacialTrait[]): void {
        for (const trait of traits) {
            this.registerRacialTrait(trait);
        }
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
     * @param race - Race to get traits for
     * @returns Array of racial traits
     */
    getRacialTraits(race: Race): RacialTrait[] {
        return this.racialTraits.get(race) || [];
    }

    /**
     * Get only base racial traits (excluding subrace-specific traits)
     *
     * Returns traits that apply to all members of a race, regardless of subrace.
     *
     * @param race - Race to get base traits for
     * @returns Array of base racial traits
     */
    getBaseRacialTraits(race: Race): RacialTrait[] {
        const traits = this.racialTraits.get(race) || [];
        return traits.filter(t => !t.subrace);
    }

    /**
     * Get racial traits for a specific subrace
     *
     * @param race - Base race
     * @param subrace - Subrace name
     * @returns Array of racial traits for the subrace
     */
    getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[] {
        const traits = this.racialTraits.get(race) || [];
        return traits.filter(t => !t.subrace || t.subrace === subrace);
    }

    /**
     * Get only subrace-specific traits
     *
     * Returns only traits that specifically apply to the given subrace.
     *
     * @param race - Base race
     * @param subrace - Subrace name
     * @returns Array of subrace-specific traits
     */
    getSubraceTraits(race: Race, subrace: string): RacialTrait[] {
        const traits = this.racialTraits.get(race) || [];
        return traits.filter(t => t.subrace === subrace);
    }

    /**
     * Get all available subraces for a race
     *
     * Returns a unique list of subrace names for the given race.
     * First checks RACE_DATA for a defined subraces list, then falls back
     * to deriving subraces from registered racial traits (for custom content).
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
        const traits = this.racialTraits.get(race) || [];
        const subraces = new Set<string>();
        for (const trait of traits) {
            if (trait.subrace) {
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
     * @param subrace - Subrace name to look up
     * @returns Race that has this subrace, or undefined if not found
     */
    getRaceForSubrace(subrace: string): Race | undefined {
        for (const [race, traits] of this.racialTraits.entries()) {
            for (const trait of traits) {
                if (trait.subrace === subrace) {
                    return race as Race;
                }
            }
        }
        return undefined;
    }

    /**
     * Get a single racial trait by ID
     *
     * @param traitId - Trait ID to look up
     * @returns Racial trait or undefined if not found
     */
    getRacialTraitById(traitId: string): RacialTrait | undefined {
        return this.traitLookup.get(traitId);
    }

    /**
     * Get all racial traits organized by race
     *
     * Returns a Map where keys are race names and values are arrays
     * of all traits for that race.
     *
     * @returns Map of race names to their traits
     */
    getAllRacialTraits(): Map<string, RacialTrait[]> {
        return new Map(this.racialTraits);
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
     * @returns Array of race names
     */
    getRegisteredRaces(): Race[] {
        return Array.from(this.racialTraits.keys()) as Race[];
    }

    /**
     * Get total count of registered features
     *
     * Reads from ExtensionManager for class features.
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

        let totalRacialTraits = 0;
        for (const traits of this.racialTraits.values()) {
            totalRacialTraits += traits.length;
        }

        return {
            totalClassFeatures: allFeatures.length,
            totalRacialTraits,
            classesWithFeatures: classesSet.size,
            racesWithTraits: this.racialTraits.size
        };
    }

    /**
     * Reset the registry to initial state
     *
     * Clears all registered features and traits.
     * Useful for testing or reinitialization.
     */
    reset(): void {
        // Clear racial traits from internal storage
        this.racialTraits.clear();
        this.traitLookup.clear();

        // Clear class features from ExtensionManager
        this.manager.reset('classFeatures');

        // Clear initialization flag and cache
        this.initialized = false;
        this.invalidateCache();
    }

    /**
     * Check if the registry has been initialized
     *
     * @returns True if initialized with defaults
     */
    isInitialized(): boolean {
        return this.initialized;
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
     * Register an equipment-granted feature
     *
     * These features have special handling as they are only active when
     * the associated equipment is equipped. They are marked with the
     * equipment source and can be referenced by equipment definitions.
     *
     * @param feature - Class feature to register as equipment-granted
     * @throws Error if feature ID already exists or validation fails
     */
    static registerEquipmentFeature(feature: ClassFeature): void {
        const registry = FeatureRegistry.getInstance();

        // Mark the feature as equipment-grantable
        const equipmentFeature: ClassFeature = {
            ...feature,
            tags: [...(feature.tags || []), 'equipment']
        };

        registry.registerClassFeature(equipmentFeature);
    }

    /**
     * Get all racial traits as a plain object (for debugging/serialization)
     *
     * Note: For class features, use ExtensionManager.get('classFeatures') directly.
     * This method is kept for racial traits until Phase 9 migration.
     *
     * @returns Object mapping race names to their traits
     */
    exportRacialTraits(): Record<string, RacialTrait[]> {
        const racialTraitsExport: Record<string, RacialTrait[]> = {};
        for (const [race, traits] of this.racialTraits.entries()) {
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
