/**
 * Equipment Modifier
 *
 * Handles equipment modification operations including enchanting, cursing,
 * upgrading, and template application. Supports per-instance modifications
 * that can be applied to individual equipment items.
 *
 * Part of Phase 7.1: Create EquipmentModifier.
 */

import type { CharacterSheet } from '../types/Character.js';
import type {
    CharacterEquipment,
    EnhancedEquipment,
    EnhancedInventoryItem,
    EquipmentProperty,
    EquipmentModification,
    EquipmentMiniFeature
} from '../types/Equipment.js';
import { EquipmentEffectApplier } from './EquipmentEffectApplier.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { EquipmentValidator } from './EquipmentValidator.js';

/**
 * Modification result containing the updated equipment state
 */
export interface ModificationResult {
    /** Updated equipment state */
    equipment: CharacterEquipment;
    /** Whether the modification was applied */
    success: boolean;
    /** Errors encountered (if any) */
    errors?: string[];
}

/**
 * EquipmentModifier - Equipment modification operations
 *
 * This class provides static methods for:
 * - Enchanting equipment with new properties (per-instance)
 * - Applying template modifications (creates new item based on template)
 * - Cursing equipment with negative effects
 * - Upgrading equipment (improve existing properties)
 * - Removing modifications
 * - Querying modification history
 * - Checking for templates
 * - Getting combined effects from base + modifications
 *
 * TEMPLATE VS INSTANCE:
 * - Template modifications create new equipment based on a template definition
 * - Per-instance modifications are stored in the modifications array
 * - Both can coexist on the same item
 */
export class EquipmentModifier {
    /**
     * Enchant equipment with new properties (creates per-instance modification)
     *
     * Enchanting adds positive magical properties to an item. Each enchantment
     * is stored as a per-instance modification that can be removed later.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item to enchant
     * @param enchantment - The enchantment to apply
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with enchantment applied
     */
    static enchant(
        equipment: CharacterEquipment,
        itemName: string,
        enchantment: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment {
        const validation = EquipmentValidator.validateModification(enchantment);
        if (!validation.valid) {
            return equipment;
        }

        return this.addModificationToEquipment(
            equipment,
            itemName,
            enchantment,
            character
        );
    }

    /**
     * Apply a template modification to equipment
     *
     * Template-based modifications create new items based on template definitions
     * stored in ExtensionManager under 'equipment.templates' category.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item to modify
     * @param templateId - ID of the template to apply
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with template applied
     */
    static applyTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string,
        character?: CharacterSheet
    ): CharacterEquipment {
        const manager = ExtensionManager.getInstance();
        const templates = manager.get('equipment.templates');
        const template = templates.find((t: any) => t.id === templateId);

        if (!template) {
            return equipment;
        }

        // Convert template to modification
        const modification: EquipmentModification = {
            id: `template_${templateId}_${Date.now()}`,
            name: template.name || `Template: ${templateId}`,
            properties: template.properties || [],
            addsFeatures: template.addsFeatures,
            addsSkills: template.addsSkills,
            addsSpells: template.addsSpells,
            appliedAt: new Date().toISOString(),
            source: 'template'
        };

        const updated = this.addModificationToEquipment(
            equipment,
            itemName,
            modification,
            character
        );

        // Set template ID on the item
        const item = this.findItem(updated, itemName);
        if (item) {
            item.templateId = templateId;
        }

        return updated;
    }

    /**
     * Curse equipment with negative effects
     *
     * Cursing adds negative properties to an item. Like enchantments,
     * curses are stored as per-instance modifications that can be removed.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item to curse
     * @param curse - The curse to apply
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with curse applied
     */
    static curse(
        equipment: CharacterEquipment,
        itemName: string,
        curse: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment {
        const validation = EquipmentValidator.validateModification(curse);
        if (!validation.valid) {
            return equipment;
        }

        return this.addModificationToEquipment(
            equipment,
            itemName,
            curse,
            character
        );
    }

    /**
     * Upgrade equipment (improve existing properties)
     *
     * Upgrading enhances existing properties on an item or adds new positive
     * properties. This is a convenience wrapper around enchant().
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item to upgrade
     * @param upgrade - The upgrade to apply
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with upgrade applied
     */
    static upgrade(
        equipment: CharacterEquipment,
        itemName: string,
        upgrade: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment {
        return this.enchant(equipment, itemName, upgrade, character);
    }

    /**
     * Remove a modification from equipment
     *
     * Removes a specific modification by ID from an item. If the item
     * is equipped, effects are recalculated.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param modificationId - ID of the modification to remove
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with modification removed
     */
    static removeModification(
        equipment: CharacterEquipment,
        itemName: string,
        modificationId: string,
        character?: CharacterSheet
    ): CharacterEquipment {
        // Clone equipment to avoid mutation
        const updated: CharacterEquipment = {
            weapons: equipment.weapons.map(w => ({ ...w, modifications: w.modifications ? [...w.modifications] : [] })),
            armor: equipment.armor.map(a => ({ ...a, modifications: a.modifications ? [...a.modifications] : [] })),
            items: equipment.items.map(i => ({ ...i, modifications: i.modifications ? [...i.modifications] : [] })),
            totalWeight: equipment.totalWeight,
            equippedWeight: equipment.equippedWeight
        };

        const item = this.findItem(updated, itemName);
        if (!item || !item.modifications) {
            return equipment;
        }

        const wasEquipped = item.equipped;
        const instanceId = item.instanceId;
        const equipData = this.getEquipmentData(itemName);

        // Remove old effects if equipped and character provided
        if (wasEquipped && character && equipData) {
            EquipmentEffectApplier.unequipItem(character, itemName, instanceId);
        }

        // Remove the modification
        const modIndex = item.modifications.findIndex(m => m.id === modificationId);
        if (modIndex !== -1) {
            item.modifications.splice(modIndex, 1);
        }

        // Reapply effects if equipped and character provided
        if (wasEquipped && character && equipData) {
            // Apply base effects
            EquipmentEffectApplier.equipItem(character, equipData, instanceId);

            // Reapply remaining modifications
            for (const mod of item.modifications) {
                this.applyModificationEffects(character, equipData, mod, instanceId);
            }
        }

        return updated;
    }

    /**
     * Get modification history for an item
     *
     * Returns all modifications that have been applied to an item,
     * in the order they were applied.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns Array of modifications (oldest first)
     */
    static getModificationHistory(
        equipment: CharacterEquipment,
        itemName: string
    ): EquipmentModification[] {
        const item = this.findItem(equipment, itemName);
        if (!item || !item.modifications) {
            return [];
        }

        // Return copy to prevent external modification
        return item.modifications.map(m => ({ ...m }));
    }

    /**
     * Get all active effects from an item (base + modifications)
     *
     * Combines the base equipment properties with all modification
     * properties to give the complete set of active effects.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param instanceId - Optional instance ID for multi-item tracking
     * @returns Array of all active equipment properties
     */
    static getCombinedEffects(
        equipment: CharacterEquipment,
        itemName: string,
        instanceId?: string
    ): EquipmentProperty[] {
        const equipData = this.getEquipmentData(itemName);
        if (!equipData) {
            return [];
        }

        // Start with base properties
        const allEffects: EquipmentProperty[] = equipData.properties ? [...equipData.properties] : [];

        // Add modification properties
        const item = this.findItem(equipment, itemName);
        if (item && item.modifications) {
            for (const mod of item.modifications) {
                if (mod.properties) {
                    allEffects.push(...mod.properties);
                }
            }
        }

        return allEffects;
    }

    /**
     * Check if item has a specific template
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param templateId - Template ID to check for
     * @returns True if the item has the template
     */
    static hasTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string
    ): boolean {
        const item = this.findItem(equipment, itemName);
        if (!item) {
            return false;
        }

        // Check templateId property
        if (item.templateId === templateId) {
            return true;
        }

        // Check modifications for template source
        if (item.modifications) {
            return item.modifications.some(
                m => m.source === 'template' && m.name.includes(templateId)
            );
        }

        return false;
    }

    /**
     * Get all templates applied to an item
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns Array of template IDs
     */
    static getAppliedTemplates(
        equipment: CharacterEquipment,
        itemName: string
    ): string[] {
        const templates: string[] = [];
        const item = this.findItem(equipment, itemName);

        if (!item) {
            return templates;
        }

        if (item.templateId) {
            templates.push(item.templateId);
        }

        if (item.modifications) {
            for (const mod of item.modifications) {
                if (mod.source === 'template') {
                    // Extract template ID from modification name or ID
                    const match = mod.id.match(/template_([^_]+)/);
                    if (match) {
                        templates.push(match[1]);
                    }
                }
            }
        }

        return templates;
    }

    /**
     * Remove all modifications from an item
     *
     * Removes all modifications, effectively restoring the item to
     * its base state.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with all modifications removed
     */
    static removeAllModifications(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment {
        const item = this.findItem(equipment, itemName);
        if (!item || !item.modifications || item.modifications.length === 0) {
            return equipment;
        }

        const modificationIds = item.modifications.map(m => m.id);
        let updated = equipment;

        // Remove each modification
        for (const modId of modificationIds) {
            updated = this.removeModification(updated, itemName, modId, character);
        }

        return updated;
    }

    /**
     * Disenchant an item (remove all enchantments, keep curses)
     *
     * Removes only positive modifications (enchantments/upgrades), leaving
     * curses intact. Useful for "remove curse" mechanics.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with enchantments removed
     */
    static disenchant(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment {
        const item = this.findItem(equipment, itemName);
        if (!item || !item.modifications) {
            return equipment;
        }

        // Find enchantment modifications (source: 'enchantment' or 'upgrade')
        const enchantmentIds = item.modifications
            .filter(m => m.source === 'enchantment' || m.source === 'upgrade')
            .map(m => m.id);

        let updated = equipment;
        for (const modId of enchantmentIds) {
            updated = this.removeModification(updated, itemName, modId, character);
        }

        return updated;
    }

    /**
     * Lift curse from an item (remove all curses, keep enchantments)
     *
     * Removes only negative modifications (curses), leaving enchantments
     * intact.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param character - Optional character to reapply effects to
     * @returns Updated equipment with curses removed
     */
    static liftCurse(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment {
        const item = this.findItem(equipment, itemName);
        if (!item || !item.modifications) {
            return equipment;
        }

        // Find curse modifications
        const curseIds = item.modifications
            .filter(m => m.source === 'curse')
            .map(m => m.id);

        let updated = equipment;
        for (const modId of curseIds) {
            updated = this.removeModification(updated, itemName, modId, character);
        }

        return updated;
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Add a modification to equipment (internal implementation)
     */
    private static addModificationToEquipment(
        equipment: CharacterEquipment,
        itemName: string,
        modification: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment {
        // Clone equipment to avoid mutation
        const updated: CharacterEquipment = {
            weapons: equipment.weapons.map(w => ({ ...w, modifications: w.modifications ? [...w.modifications] : [] })),
            armor: equipment.armor.map(a => ({ ...a, modifications: a.modifications ? [...a.modifications] : [] })),
            items: equipment.items.map(i => ({ ...i, modifications: i.modifications ? [...i.modifications] : [] })),
            totalWeight: equipment.totalWeight,
            equippedWeight: equipment.equippedWeight
        };

        const item = this.findItem(updated, itemName);
        if (!item) {
            return equipment;
        }

        const equipData = this.getEquipmentData(itemName);
        if (!equipData) {
            return equipment;
        }

        // Initialize modifications array if needed
        if (!item.modifications) {
            item.modifications = [];
        }

        // Generate instance ID if not present
        if (!item.instanceId) {
            item.instanceId = `${itemName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        const wasEquipped = item.equipped;
        const instanceId = item.instanceId;

        // Remove old effects if equipped and character provided
        if (wasEquipped && character) {
            EquipmentEffectApplier.unequipItem(character, itemName, instanceId);
        }

        // Add the modification
        item.modifications.push(modification);

        // Reapply effects if equipped and character provided
        if (wasEquipped && character) {
            // Apply base effects
            EquipmentEffectApplier.equipItem(character, equipData, instanceId);

            // Apply all modifications including the new one
            for (const mod of item.modifications) {
                this.applyModificationEffects(character, equipData, mod, instanceId);
            }
        }

        return updated;
    }

    /**
     * Find an item in equipment by name
     */
    private static findItem(
        equipment: CharacterEquipment,
        itemName: string
    ): EnhancedInventoryItem | undefined {
        // Search all inventory types
        const item =
            equipment.weapons.find(i => i.name === itemName) ||
            equipment.armor.find(i => i.name === itemName) ||
            equipment.items.find(i => i.name === itemName);

        return item;
    }

    /**
     * Get equipment data from ExtensionManager
     */
    private static getEquipmentData(itemName: string): EnhancedEquipment | undefined {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment');
        return allEquipment.find((eq: EnhancedEquipment) => eq.name === itemName);
    }

    /**
     * Apply modification effects to character
     */
    private static applyModificationEffects(
        character: CharacterSheet,
        baseEquipment: EnhancedEquipment,
        modification: EquipmentModification,
        instanceId?: string
    ): void {
        // Create temporary combined equipment for effect application
        const combined: EnhancedEquipment = {
            ...baseEquipment,
            properties: [
                ...(baseEquipment.properties || []),
                ...modification.properties
            ],
            grantsFeatures: modification.addsFeatures,
            grantsSkills: modification.addsSkills,
            grantsSpells: modification.addsSpells
        };

        EquipmentEffectApplier.equipItem(character, combined, instanceId);
    }

    /**
     * Create a modification from properties
     *
     * Convenience factory for creating modification objects.
     *
     * @param id - Unique ID for the modification
     * @param name - Display name of the modification
     * @param properties - Properties to add
     * @param source - Source type (enchantment, curse, upgrade, etc.)
     * @returns EquipmentModification object
     */
    static createModification(
        id: string,
        name: string,
        properties: EquipmentProperty[],
        source: string
    ): EquipmentModification {
        return {
            id,
            name,
            properties,
            appliedAt: new Date().toISOString(),
            source
        };
    }

    /**
     * Create a modification with feature grants
     *
     * Convenience factory for creating feature-granting modifications.
     *
     * @param id - Unique ID for the modification
     * @param name - Display name of the modification
     * @param properties - Properties to add
     * @param addsFeatures - Features to grant
     * @param source - Source type
     * @returns EquipmentModification object
     */
    static createFeatureModification(
        id: string,
        name: string,
        properties: EquipmentProperty[],
        addsFeatures: Array<string | EquipmentMiniFeature>,
        source: string
    ): EquipmentModification {
        return {
            id,
            name,
            properties,
            addsFeatures,
            appliedAt: new Date().toISOString(),
            source
        };
    }

    /**
     * Create a modification with skill grants
     *
     * Convenience factory for creating skill-granting modifications.
     *
     * @param id - Unique ID for the modification
     * @param name - Display name of the modification
     * @param properties - Properties to add
     * @param addsSkills - Skills to grant
     * @param source - Source type
     * @returns EquipmentModification object
     */
    static createSkillModification(
        id: string,
        name: string,
        properties: EquipmentProperty[],
        addsSkills: Array<{ skillId: string; level: 'proficient' | 'expertise' }>,
        source: string
    ): EquipmentModification {
        return {
            id,
            name,
            properties,
            addsSkills,
            appliedAt: new Date().toISOString(),
            source
        };
    }

    /**
     * Create a modification with spell grants
     *
     * Convenience factory for creating spell-granting modifications.
     *
     * @param id - Unique ID for the modification
     * @param name - Display name of the modification
     * @param properties - Properties to add
     * @param addsSpells - Spells to grant
     * @param source - Source type
     * @returns EquipmentModification object
     */
    static createSpellModification(
        id: string,
        name: string,
        properties: EquipmentProperty[],
        addsSpells: Array<{ spellId: string; level?: number; uses?: number; recharge?: string }>,
        source: string
    ): EquipmentModification {
        return {
            id,
            name,
            properties,
            addsSpells,
            appliedAt: new Date().toISOString(),
            source
        };
    }

    /**
     * Generate a unique modification ID
     *
     * @param prefix - Optional prefix for the ID
     * @returns Unique modification ID
     */
    static generateModificationId(prefix: string = 'mod'): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get all modification sources on an item
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns Array of unique source types
     */
    static getModificationSources(
        equipment: CharacterEquipment,
        itemName: string
    ): string[] {
        const item = this.findItem(equipment, itemName);
        if (!item || !item.modifications) {
            return [];
        }

        const sources = new Set(item.modifications.map(m => m.source));
        return Array.from(sources);
    }

    /**
     * Count modifications by source type
     *
     * Returns a record mapping each source type to the count of modifications
     * from that source.
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns Record of source type to modification count
     */
    static countModificationsBySource(
        equipment: CharacterEquipment,
        itemName: string
    ): Record<string, number> {
        const item = this.findItem(equipment, itemName);
        if (!item || !item.modifications) {
            return {};
        }

        const counts: Record<string, number> = {};
        for (const mod of item.modifications) {
            counts[mod.source] = (counts[mod.source] || 0) + 1;
        }
        return counts;
    }

    /**
     * Count modifications for a specific source type
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @param source - Source type to count
     * @returns Number of modifications from the specified source
     */
    static countModificationsForSource(
        equipment: CharacterEquipment,
        itemName: string,
        source: string
    ): number {
        const counts = this.countModificationsBySource(equipment, itemName);
        return counts[source] || 0;
    }

    /**
     * Check if item has any curses
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns True if item has any curse modifications
     */
    static isCursed(
        equipment: CharacterEquipment,
        itemName: string
    ): boolean {
        return this.countModificationsForSource(equipment, itemName, 'curse') > 0;
    }

    /**
     * Check if item is enchanted
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns True if item has any enchantment modifications
     */
    static isEnchanted(
        equipment: CharacterEquipment,
        itemName: string
    ): boolean {
        const sources = this.getModificationSources(equipment, itemName);
        return sources.some(s => s === 'enchantment' || s === 'upgrade');
    }

    /**
     * Get item summary including modifications
     *
     * @param equipment - Current equipment state
     * @param itemName - Name of the item
     * @returns Summary object with item info and modifications
     */
    static getItemSummary(
        equipment: CharacterEquipment,
        itemName: string
    ): {
        name: string;
        quantity: number;
        equipped: boolean;
        instanceId?: string;
        templateId?: string;
        modificationCount: number;
        isCursed: boolean;
        isEnchanted: boolean;
        sources: string[];
        effects: EquipmentProperty[];
    } | null {
        const item = this.findItem(equipment, itemName);
        if (!item) {
            return null;
        }

        return {
            name: item.name,
            quantity: item.quantity,
            equipped: item.equipped,
            instanceId: item.instanceId,
            templateId: item.templateId,
            modificationCount: item.modifications?.length || 0,
            isCursed: this.isCursed(equipment, itemName),
            isEnchanted: this.isEnchanted(equipment, itemName),
            sources: this.getModificationSources(equipment, itemName),
            effects: this.getCombinedEffects(equipment, itemName)
        };
    }
}
