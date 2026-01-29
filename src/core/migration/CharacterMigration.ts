/**
 * CharacterMigration - Migration utilities for existing characters
 *
 * Provides helper methods to migrate character data from old formats
 * to new formats after engine upgrades.
 *
 * Part of Phase 10.3: Provide migration path for existing users.
 */

import type { CharacterSheet } from '../types/Character.js';
import { FeatureRegistry } from '../features/FeatureRegistry.js';
import { DEFAULT_CLASS_FEATURES } from '../features/DefaultFeatures.js';
import type { ClassFeature } from '../features/FeatureTypes.js';

/**
 * Migration result with details about what was changed
 */
export interface MigrationResult {
    success: boolean;
    migrated: boolean;
    changes: string[];
    warnings: string[];
    errors: string[];
}

/**
 * Feature ID mapping for migrating from old display string format
 * Maps "Class Level X" display strings to new feature IDs
 */
const FEATURE_ID_MAPPING: Record<string, string> = buildFeatureIdMapping();

/**
 * Build the feature ID mapping from default features
 * Maps old "Class Level X" format to new feature IDs
 */
function buildFeatureIdMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};

    // Group features by class and level
    const featuresByClassAndLevel: Record<string, ClassFeature[]> = {};

    for (const feature of DEFAULT_CLASS_FEATURES) {
        const key = `${feature.class}-${feature.level}`;
        if (!featuresByClassAndLevel[key]) {
            featuresByClassAndLevel[key] = [];
        }
        featuresByClassAndLevel[key].push(feature);
    }

    // Create mapping from old format to new feature IDs
    for (const [key, features] of Object.entries(featuresByClassAndLevel)) {
        const [className, level] = key.split('-');
        const oldFormat = `${className} Level ${level}`;
        const newIds = features.map(f => f.id).join(',');
        mapping[oldFormat] = newIds;
    }

    return mapping;
}

/**
 * CharacterMigration - Static utility class for character data migration
 *
 * This class provides methods to migrate character data from old formats
 * to new formats after engine upgrades.
 *
 * @example
 * ```typescript
 * import { CharacterMigration } from 'playlist-data-engine';
 *
 * // Check if character needs migration
 * if (CharacterMigration.needsMigration(myCharacter)) {
 *     const result = CharacterMigration.migrateCharacter(myCharacter);
 *     if (result.success) {
 *         console.log('Migration successful:', result.changes);
 *     }
 * }
 * ```
 */
export class CharacterMigration {
    /**
     * Check if a character needs migration
     *
     * @param character - The character to check
     * @returns true if the character has old format data that needs migration
     */
    static needsMigration(character: CharacterSheet): boolean {
        return (
            this.hasOldAmmunitionFormat(character) ||
            this.hasOldFeatureFormat(character)
        );
    }

    /**
     * Check if character has old ammunition format
     * Old format: 'Arrows (20)', 'Bolts (20)'
     *
     * @param character - The character to check
     * @returns true if the character has old ammunition format
     */
    static hasOldAmmunitionFormat(character: CharacterSheet): boolean {
        if (!character.equipment?.items) {
            return false;
        }
        return character.equipment.items.some(item =>
            item.name === 'Arrows (20)' ||
            item.name === 'Bolts (20)'
        );
    }

    /**
     * Check if character has old feature format
     * Old format: Features contain 'Level X' in their names
     *
     * @param character - The character to check
     * @returns true if the character has old feature format
     */
    static hasOldFeatureFormat(character: CharacterSheet): boolean {
        // Old format features contain phrases like "Level 1", "Level 2"
        return character.class_features.some(f =>
            f.includes('Level ') || f.includes(' level ')
        );
    }

    /**
     * Migrate a character from old formats to new formats
     *
     * This method:
     * 1. Migrates ammunition format ('Arrows (20)' → 'Arrow' with quantity 20)
     * 2. Migrates feature format ('Barbarian Level 1' → 'barbarian_rage,barbarian_unarmored_defense')
     * 3. Initializes feature_effects array if missing
     *
     * @param character - The character to migrate (modified in place)
     * @returns Migration result with details about changes
     */
    static migrateCharacter(character: CharacterSheet): MigrationResult {
        const result: MigrationResult = {
            success: true,
            migrated: false,
            changes: [],
            warnings: [],
            errors: []
        };

        try {
            // Migrate ammunition if needed
            if (this.hasOldAmmunitionFormat(character)) {
                const ammoResult = this.migrateAmmunition(character);
                result.changes.push(...ammoResult.changes);
                result.warnings.push(...ammoResult.warnings);
                result.migrated = true;
            }

            // Migrate features if needed
            if (this.hasOldFeatureFormat(character)) {
                const featureResult = this.migrateFeatures(character);
                result.changes.push(...featureResult.changes);
                result.warnings.push(...featureResult.warnings);
                result.errors.push(...featureResult.errors);
                result.migrated = true;

                if (featureResult.errors.length > 0) {
                    result.success = false;
                }
            }

            // Initialize feature_effects if missing
            if (!character.feature_effects) {
                character.feature_effects = [];
                result.changes.push('Initialized feature_effects array');
            }

        } catch (error) {
            result.success = false;
            result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Migrate ammunition format from old to new
     * Old: 'Arrows (20)' with quantity 1
     * New: 'Arrow' with quantity 20
     *
     * @param character - The character to migrate (modified in place)
     * @returns Migration result with details
     */
    static migrateAmmunition(character: CharacterSheet): Omit<MigrationResult, 'success'> {
        const changes: string[] = [];
        const warnings: string[] = [];

        if (!character.equipment?.items) {
            warnings.push('Character has no equipment items array');
            return { migrated: false, changes, warnings, errors: [] };
        }

        for (const item of character.equipment.items) {
            if (item.name === 'Arrows (20)') {
                item.name = 'Arrow';
                item.quantity = 20;
                changes.push(`Migrated ammunition: 'Arrows (20)' → 'Arrow' × 20`);
            } else if (item.name === 'Bolts (20)') {
                item.name = 'Bolt';
                item.quantity = 20;
                changes.push(`Migrated ammunition: 'Bolts (20)' → 'Bolt' × 20`);
            }
        }

        return { migrated: true, changes, warnings, errors: [] };
    }

    /**
     * Migrate feature format from old display strings to feature IDs
     * Old: 'Barbarian Level 1', 'Barbarian Level 2'
     * New: 'barbarian_rage', 'barbarian_unarmored_defense', 'barbarian_reckless_attack', etc.
     *
     * @param character - The character to migrate (modified in place)
     * @returns Migration result with details
     */
    static migrateFeatures(character: CharacterSheet): Omit<MigrationResult, 'success'> {
        const changes: string[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];

        // Initialize FeatureRegistry if not already done
        const registry = FeatureRegistry.getInstance();
        if (!registry.isInitialized()) {
            registry.initializeDefaults(DEFAULT_CLASS_FEATURES, []);
        }

        const newFeatures: string[] = [];
        const unmappedFeatures: string[] = [];

        for (const oldFeature of character.class_features) {
            const newIds = FEATURE_ID_MAPPING[oldFeature];
            if (newIds) {
                const ids = newIds.split(',');
                newFeatures.push(...ids);
                changes.push(`Migrated feature: '${oldFeature}' → [${ids.map(id => `'${id}'`).join(', ')}]`);
            } else {
                // Feature not found in mapping - might be custom or already migrated
                if (oldFeature.includes('Level ') || oldFeature.includes(' level ')) {
                    unmappedFeatures.push(oldFeature);
                } else {
                    // Assume it's already a feature ID, keep it
                    newFeatures.push(oldFeature);
                }
            }
        }

        if (unmappedFeatures.length > 0) {
            warnings.push(
                `Could not map ${unmappedFeatures.length} feature(s) to new format: ` +
                unmappedFeatures.map(f => `'${f}'`).join(', ')
            );
            errors.push(
                'Some features could not be migrated. ' +
                'Consider re-generating the character from its original seed.'
            );
        }

        // Remove duplicates while preserving order
        character.class_features = [...new Set(newFeatures)];
        changes.push(`Updated class_features array (${newFeatures.length} features)`);

        return { migrated: true, changes, warnings, errors };
    }

    /**
     * Get a migration report for a character without modifying it
     *
     * @param character - The character to analyze
     * @returns Report of what would be migrated
     */
    static getMigrationReport(character: CharacterSheet): {
        needsMigration: boolean;
        hasOldAmmunition: boolean;
        hasOldFeatures: boolean;
        recommendedAction: string;
    } {
        const hasOldAmmunition = this.hasOldAmmunitionFormat(character);
        const hasOldFeatures = this.hasOldFeatureFormat(character);
        const needsMigration = hasOldAmmunition || hasOldFeatures;

        let recommendedAction = 'No migration needed';
        if (needsMigration) {
            if (hasOldFeatures) {
                recommendedAction = 'Re-generate character from original seed (recommended) or use migrateCharacter()';
            } else if (hasOldAmmunition) {
                recommendedAction = 'Run migrateCharacter() to update ammunition format';
            }
        }

        return {
            needsMigration,
            hasOldAmmunition,
            hasOldFeatures,
            recommendedAction
        };
    }

    /**
     * Rollback ammunition migration (for testing or emergency recovery)
     *
     * @param character - The character to rollback
     */
    static rollbackAmmunition(character: CharacterSheet): void {
        if (!character.equipment?.items) {
            return;
        }

        for (const item of character.equipment.items) {
            if (item.name === 'Arrow' && item.quantity === 20) {
                item.name = 'Arrows (20)';
                item.quantity = 1;
            } else if (item.name === 'Bolt' && item.quantity === 20) {
                item.name = 'Bolts (20)';
                item.quantity = 1;
            }
        }
    }
}
