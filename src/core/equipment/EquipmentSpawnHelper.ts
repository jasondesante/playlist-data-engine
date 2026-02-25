/**
 * Equipment Spawn Helper
 *
 * Helper functions for spawning multiple equipment items at once.
 * NOT a full loot system - provides batch spawning utilities for:
 * - Spawning from lists of equipment names
 * - Spawning by rarity (common, uncommon, rare, very_rare, legendary)
 * - Spawning by tags (weapon, armor, fire, magic, etc.)
 * - Spawning random equipment (respecting spawn weights)
 * - Spawning from templates (e.g., Flaming Sword)
 * - Spawning treasure hoards (simplified D&D 5e table)
 * - Adding spawned equipment to characters
 */

import type { CharacterSheet } from '../types/Character.js';
import type {
    EnhancedEquipment,
    EnhancedInventoryItem,
    SpawnRandomOptions,
    TreasureHoardResult,
    BoxOpenResult
} from '../types/Equipment.js';
import { SeededRNG } from '../../utils/random.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ITEM_CREATION_TEMPLATES } from '../../constants/ItemTemplates.js';
import { BoxOpener } from './BoxOpener.js';

/**
 * Rarity order for comparisons (common = 0, legendary = 4)
 */
const RARITY_ORDER: Record<string, number> = {
    'common': 0,
    'uncommon': 1,
    'rare': 2,
    'very_rare': 3,
    'legendary': 4
};

/**
 * EquipmentSpawnHelper - Batch spawning utilities for equipment
 *
 * This class provides static methods for:
 * - Spawning multiple items from a list of names
 * - Spawning items by rarity
 * - Spawning items by tags
 * - Spawning random equipment with weighted selection
 * - Spawning from templates
 * - Spawning treasure hoards
 * - Adding spawned equipment to characters
 *
 * DESIGN NOTES:
 * - Uses SeededRNG for deterministic results
 * - Respects spawnWeight property (0 = never random, still usable by game logic)
 * - Integrates with ExtensionManager for custom equipment
 * - NOT a full loot system - just helper utilities
 */
export class EquipmentSpawnHelper {
    /**
     * Spawn multiple items from an array of equipment names
     *
     * @param itemNames - Array of equipment names to spawn
     * @param rng - Optional SeededRNG for shuffling (deterministic order)
     * @returns Array of spawned equipment (undefined for missing items)
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('starter_gear');
     * const items = EquipmentSpawnHelper.spawnFromList(
     *     ['Longsword', 'Shield', 'Scale Mail'],
     *     rng
     * );
     * ```
     */
    static spawnFromList(
        itemNames: string[],
        rng?: SeededRNG
    ): (EnhancedEquipment | undefined)[] {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment');

        let namesToSpawn = itemNames;

        // Shuffle names if RNG provided for deterministic random order
        if (rng) {
            namesToSpawn = rng.shuffle([...itemNames]);
        }

        return namesToSpawn.map(name => {
            return allEquipment.find((eq: EnhancedEquipment) => eq.name === name);
        });
    }

    /**
     * Spawn items by rarity level
     *
     * Returns up to `count` items of the specified rarity.
     * If there aren't enough items of that rarity, returns all available.
     * Selection is random and deterministic if RNG is provided.
     *
     * @param rarity - Rarity level to spawn
     * @param count - Maximum number of items to spawn
     * @param rng - Optional SeededRNG for deterministic selection
     * @returns Array of spawned equipment
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('rare_loot');
     * const rareItems = EquipmentSpawnHelper.spawnByRarity('rare', 3, rng);
     * ```
     */
    static spawnByRarity(
        rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
        count: number,
        rng?: SeededRNG
    ): EnhancedEquipment[] {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];

        // Filter by rarity and exclude zero-weight items
        const matchingItems = allEquipment.filter(
            (eq: EnhancedEquipment) => eq.rarity === rarity && (eq.spawnWeight ?? 1) > 0
        );

        if (matchingItems.length === 0) {
            return [];
        }

        // Select random subset
        const itemsToSpawn = Math.min(count, matchingItems.length);
        const result: EnhancedEquipment[] = [];

        // Use RNG for deterministic selection, or Math.random for non-deterministic
        const randomFunc = rng ? () => rng.random() : Math.random;

        // Create a copy and shuffle it
        const shuffled = [...matchingItems];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(randomFunc() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        for (let i = 0; i < itemsToSpawn; i++) {
            result.push(shuffled[i]);
        }

        return result;
    }

    /**
     * Spawn items by tags
     *
     * Returns items that match ANY of the provided tags.
     * If multiple tags provided, items matching any tag are included.
     *
     * @param tags - Array of tags to filter by
     * @param count - Maximum number of items to spawn
     * @param rng - Optional SeededRNG for deterministic selection
     * @param options - Additional options (excludeZeroWeight, includeTypes, min/max rarity)
     * @returns Array of spawned equipment
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('fire_weapons');
     * const fireItems = EquipmentSpawnHelper.spawnByTags(
     *     ['fire', 'weapon'],
     *     5,
     *     rng
     * );
     * ```
     */
    static spawnByTags(
        tags: string[],
        count: number,
        rng?: SeededRNG,
        options?: SpawnRandomOptions
    ): EnhancedEquipment[] {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];

        // Filter by tags and options
        const matchingItems = allEquipment.filter((eq: EnhancedEquipment) => {
            // Check spawn weight
            if (options?.excludeZeroWeight && (eq.spawnWeight ?? 1) <= 0) {
                return false;
            }

            // Check equipment type (only if includeTypes is provided and non-empty)
            if (options?.includeTypes && options.includeTypes.length > 0 && !options.includeTypes.includes(eq.type)) {
                return false;
            }

            // Check rarity bounds
            const rarityLevel = RARITY_ORDER[eq.rarity];
            if (options?.minRarity && rarityLevel < RARITY_ORDER[options.minRarity]) {
                return false;
            }
            if (options?.maxRarity && rarityLevel > RARITY_ORDER[options.maxRarity]) {
                return false;
            }

            // Check if item has ANY of the specified tags
            return eq.tags && tags.some(tag => eq.tags!.includes(tag));
        });

        if (matchingItems.length === 0) {
            return [];
        }

        // Select random subset with weighted selection based on spawnWeight
        const itemsToSpawn = Math.min(count, matchingItems.length);
        const result: EnhancedEquipment[] = [];

        const randomFunc = rng ? () => rng.random() : Math.random;

        // Weighted selection
        for (let i = 0; i < itemsToSpawn; i++) {
            const weightedChoices = matchingItems.map(eq => [eq, eq.spawnWeight ?? 1] as [EnhancedEquipment, number]);

            let totalWeight = weightedChoices.reduce((sum, [, weight]) => sum + weight, 0);
            let random = randomFunc() * totalWeight;

            let selectedItem: EnhancedEquipment | undefined;
            for (const [item, weight] of weightedChoices) {
                random -= weight;
                if (random <= 0) {
                    selectedItem = item;
                    break;
                }
            }

            if (selectedItem) {
                result.push(selectedItem);
                // Remove from pool to avoid duplicates
                const index = matchingItems.indexOf(selectedItem);
                if (index > -1) {
                    matchingItems.splice(index, 1);
                }
            }
        }

        return result;
    }

    /**
     * Spawn random equipment respecting spawn weights
     *
     * Uses weighted random selection where items with higher spawnWeight
     * are more likely to be selected. Items with spawnWeight: 0 are
     * excluded when excludeZeroWeight is true.
     *
     * @param count - Number of items to spawn
     * @param rng - SeededRNG for deterministic results
     * @param options - Optional filters for spawning
     * @returns Array of spawned equipment
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('loot_drop');
     * const items = EquipmentSpawnHelper.spawnRandom(
     *     3,
     *     rng,
     *     { excludeZeroWeight: true, includeTypes: ['weapon', 'armor'] }
     * );
     * ```
     */
    static spawnRandom(
        count: number,
        rng: SeededRNG,
        options?: SpawnRandomOptions
    ): EnhancedEquipment[] {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];

        // Apply filters
        const pool = allEquipment.filter((eq: EnhancedEquipment) => {
            // Check spawn weight
            const spawnWeight = eq.spawnWeight ?? 1;
            if (options?.excludeZeroWeight && spawnWeight <= 0) {
                return false;
            }

            // Check equipment type (only if includeTypes is provided and non-empty)
            if (options?.includeTypes && options.includeTypes.length > 0 && !options.includeTypes.includes(eq.type)) {
                return false;
            }

            // Check rarity bounds
            const rarityLevel = RARITY_ORDER[eq.rarity];
            if (options?.minRarity && rarityLevel < RARITY_ORDER[options.minRarity]) {
                return false;
            }
            if (options?.maxRarity && rarityLevel > RARITY_ORDER[options.maxRarity]) {
                return false;
            }

            return spawnWeight > 0;
        });

        if (pool.length === 0) {
            return [];
        }

        const result: EnhancedEquipment[] = [];

        // Weighted random selection without replacement
        for (let i = 0; i < count && pool.length > 0; i++) {
            const weightedChoices = pool.map(eq => [eq, eq.spawnWeight ?? 1] as [EnhancedEquipment, number]);
            const totalWeight = weightedChoices.reduce((sum, [, weight]) => sum + weight, 0);

            let random = rng.random() * totalWeight;
            let selectedIndex = 0;

            for (let j = 0; j < weightedChoices.length; j++) {
                random -= weightedChoices[j][1];
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }

            const selectedItem = weightedChoices[selectedIndex][0];
            result.push(selectedItem);

            // Remove from pool to avoid duplicates
            const index = pool.indexOf(selectedItem);
            if (index > -1) {
                pool.splice(index, 1);
            }
        }

        return result;
    }

    /**
     * Spawn equipment from a template
     *
     * Creates a new equipment item by applying a template to a base item.
     * If no base item is specified, uses a default item for the template type.
     *
     * Templates can be registered in ExtensionManager under 'equipment.templates'
     * or defined in magicItemExamples.ts.
     *
     * @param templateId - ID of the template to apply
     * @param baseItemName - Optional base item name (uses default if not specified)
     * @returns New equipment with template applied, or null if template not found
     *
     * @example
     * ```typescript
     * const flamingSword = EquipmentSpawnHelper.spawnFromTemplate(
     *     'flaming_weapon_template',
     *     'Longsword'
     * );
     * ```
     */
    static spawnFromTemplate(
        templateId: string,
        baseItemName?: string
    ): EnhancedEquipment | null {
        const manager = ExtensionManager.getInstance();

        // Try to get template from ExtensionManager first
        let template: Partial<EnhancedEquipment> | undefined;

        const templatesFromManager = manager.get('equipment.templates');
        if (Array.isArray(templatesFromManager)) {
            // If stored as array, find by templateId property
            template = templatesFromManager.find(
                (t: any) => t.id === templateId || t.name === templateId
            );
        } else if (templatesFromManager && typeof templatesFromManager === 'object') {
            // If stored as object (Record), access by key
            template = (templatesFromManager as Record<string, Partial<EnhancedEquipment>>)[templateId];
        }

        // If not found in ExtensionManager, try magicItemExamples
        if (!template && templateId in ITEM_CREATION_TEMPLATES) {
            template = ITEM_CREATION_TEMPLATES[templateId];
        }

        if (!template) {
            return null;
        }

        // Get base item or use default
        let baseEquipment: EnhancedEquipment | undefined;

        if (baseItemName) {
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            baseEquipment = allEquipment.find((eq: EnhancedEquipment) => eq.name === baseItemName);
        } else {
            // Use default based on template properties
            baseEquipment = this.getDefaultItemForTemplate(template);
        }

        if (!baseEquipment) {
            return null;
        }

        // Apply template to base equipment
        return {
            ...baseEquipment,
            ...template,
            name: `${baseEquipment.name} (${templateId.replace(/_/g, ' ')})`,
            templateId,
            properties: [
                ...(baseEquipment.properties || []),
                ...(template.properties || [])
            ],
            tags: [
                ...(baseEquipment.tags || []),
                ...(template.tags || [])
            ]
        };
    }

    /**
     * Spawn treasure hoard (simplified D&D 5e table)
     *
     * Generates a treasure hoard based on challenge rating.
     * This is a simplified version, not the full D&D 5e treasure tables.
     *
     * @param cr - Challenge rating for scaling (0-20+)
     * @param rng - SeededRNG for deterministic results
     * @returns Treasure hoard with items and estimated value
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('dragon_hoard');
     * const hoard = EquipmentSpawnHelper.spawnTreasureHoard(15, rng);
     * console.log(`Generated ${hoard.items.length} items worth ~${hoard.totalValue} gp`);
     * ```
     */
    static spawnTreasureHoard(
        cr: number,
        rng: SeededRNG
    ): TreasureHoardResult {
        const items: EnhancedEquipment[] = [];
        let totalValue = 0;

        // Determine number of items based on CR (using rng for determinism)
        const itemCounts = this.getTreasureItemCount(cr, rng);

        // Roll for each item's rarity
        for (const [rarity, count] of Object.entries(itemCounts)) {
            for (let i = 0; i < count; i++) {
                const rarityKey = rarity as 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
                const rarityItems = this.spawnByRarity(rarityKey, 1, rng);
                if (rarityItems.length > 0) {
                    items.push(rarityItems[0]);
                    totalValue += this.estimateItemValue(rarityItems[0]);
                }
            }
        }

        // If no items from rolls, guarantee at least one item
        if (items.length === 0) {
            const guaranteedItem = this.spawnByRarity('common', 1, rng);
            if (guaranteedItem.length > 0) {
                items.push(guaranteedItem[0]);
                totalValue += this.estimateItemValue(guaranteedItem[0]);
            }
        }

        return {
            items,
            totalValue,
            cr
        };
    }

    /**
     * Add spawned equipment to character
     *
     * Adds items to character's inventory. Optionally equips them.
     *
     * @param character - Character to add items to
     * @param items - Equipment items to add
     * @param equip - Whether to auto-equip the items (default: false)
     * @returns Updated character
     *
     * @example
     * ```typescript
     * const items = EquipmentSpawnHelper.spawnByRarity('rare', 2, rng);
     * character = EquipmentSpawnHelper.addToCharacter(character, items, false);
     * ```
     */
    static addToCharacter(
        character: CharacterSheet,
        items: EnhancedEquipment[],
        equip: boolean = false
    ): CharacterSheet {
        // Initialize equipment if needed
        if (!character.equipment) {
            character.equipment = {
                weapons: [],
                armor: [],
                items: [],
                totalWeight: 0,
                equippedWeight: 0
            };
        }

        for (const item of items) {
            const inventoryItem: EnhancedInventoryItem = {
                name: item.name,
                quantity: 1,
                equipped: equip,
                instanceId: `${item.name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            };

            // Add to appropriate inventory section
            switch (item.type) {
                case 'weapon':
                    character.equipment.weapons.push(inventoryItem);
                    break;
                case 'armor':
                    character.equipment.armor.push(inventoryItem);
                    break;
                case 'item':
                case 'box':
                    character.equipment.items.push(inventoryItem);
                    break;
            }

            // Update weight
            character.equipment.totalWeight += item.weight;
            if (equip) {
                character.equipment.equippedWeight += item.weight;
            }
        }

        return character;
    }

    /**
     * Open a box item in a character's inventory
     *
     * Finds the named box in the character's items, opens it using BoxOpener,
     * removes it from inventory (if consumeOnOpen), and adds the box contents
     * to the character's inventory.
     *
     * If the box has opening requirements:
     * - Checks requirements using BoxOpener.checkRequirements()
     * - If requirements not met, returns error result without modifying character
     * - If requirements met, consumes required items from inventory before opening
     *
     * @param character - Character whose inventory contains the box
     * @param boxName - Name of the box item to open
     * @param rng - SeededRNG for deterministic results
     * @returns Object with updated character and BoxOpenResult, or null if box not found
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('open_pack');
     * const result = EquipmentSpawnHelper.openBoxForCharacter(character, "Explorer's Pack", rng);
     * if (result) {
     *     character = result.character;
     *     console.log(`Received ${result.result.gold} gold`);
     *     console.log(`Received ${result.result.items.length} items`);
     * }
     *
     * // With requirements
     * const lockedResult = EquipmentSpawnHelper.openBoxForCharacter(character, "Locked Chest", rng);
     * if (lockedResult) {
     *     if (lockedResult.result.success) {
     *         console.log('Opened chest!', lockedResult.result.consumedItems);
     *     } else {
     *         console.log('Cannot open:', lockedResult.result.error?.message);
     *     }
     * }
     * ```
     */
    static openBoxForCharacter(
        character: CharacterSheet,
        boxName: string,
        rng: SeededRNG
    ): { character: CharacterSheet; result: BoxOpenResult } | null {
        // Character must have equipment and items
        if (!character.equipment?.items) {
            return null;
        }

        // Find the box in the character's items inventory
        const boxIndex = character.equipment.items.findIndex(item => item.name === boxName);
        if (boxIndex === -1) {
            return null;
        }

        // Look up box data from registry
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];
        const boxData = allEquipment.find(eq => eq.name === boxName);

        if (!boxData || boxData.type !== 'box') {
            return null;
        }

        // Get character's items inventory for requirement checking
        const inventory = character.equipment.items;

        // Open the box (with requirement checking via inventory param)
        const result = BoxOpener.openBox(boxData, rng, inventory);

        // If box failed to open (requirements not met), return result with error
        // Don't modify character in this case
        if (!result.success) {
            return { character, result };
        }

        // Box opened successfully - consume required items from inventory
        if (result.consumedItems && result.consumedItems.length > 0) {
            for (const consumed of result.consumedItems) {
                const consumeResult = this.consumeItemFromCharacter(
                    character,
                    consumed.name,
                    consumed.quantity
                );
                // Update character reference with modified character
                character = consumeResult.character;
            }
        }

        // Remove from inventory if box is consumed on open
        if (result.consumeBox && character.equipment?.items) {
            // Re-find the box index since it may have shifted after consuming items
            const currentBoxIndex = character.equipment.items.findIndex(item => item.name === boxName);
            if (currentBoxIndex !== -1) {
                character.equipment.items.splice(currentBoxIndex, 1);
                character.equipment.totalWeight -= boxData.weight;
            }
        }

        // Add items from box to character inventory
        const itemsAsEnhanced = result.items as EnhancedEquipment[];
        character = this.addToCharacter(character, itemsAsEnhanced, false);

        return { character, result };
    }

    /**
     * Consume items from a character's inventory
     *
     * Private helper that reduces the quantity of an item in the character's
     * items inventory, or removes it entirely if quantity reaches 0.
     * Updates totalWeight accordingly.
     *
     * @param character - Character to consume from
     * @param itemName - Name of the item to consume
     * @param quantity - Quantity to consume
     * @returns Object with success status and updated character
     */
    private static consumeItemFromCharacter(
        character: CharacterSheet,
        itemName: string,
        quantity: number
    ): { success: boolean; character: CharacterSheet } {
        // Character must have equipment and items
        if (!character.equipment?.items) {
            return { success: false, character };
        }

        // Find the item in character's items inventory
        const itemIndex = character.equipment.items.findIndex(item => item.name === itemName);
        if (itemIndex === -1) {
            return { success: false, character };
        }

        const inventoryItem = character.equipment.items[itemIndex];

        // Check if we have enough quantity
        if (inventoryItem.quantity < quantity) {
            return { success: false, character };
        }

        // Get item weight from equipment registry for weight tracking
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];
        const itemData = allEquipment.find(eq => eq.name === itemName);
        const itemWeight = itemData?.weight ?? 0;

        // Reduce quantity or remove item
        inventoryItem.quantity -= quantity;
        character.equipment.totalWeight -= itemWeight * quantity;

        // Remove item from inventory if quantity reaches 0
        if (inventoryItem.quantity <= 0) {
            character.equipment.items.splice(itemIndex, 1);
        }

        return { success: true, character };
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Get default item for a template based on template properties
     */
    private static getDefaultItemForTemplate(
        template: Partial<EnhancedEquipment>
    ): EnhancedEquipment | undefined {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];

        // Determine item type from template tags or properties
        let preferType: 'weapon' | 'armor' | 'item' = 'item';

        if (template.tags) {
            if (template.tags.includes('weapon')) preferType = 'weapon';
            else if (template.tags.includes('armor')) preferType = 'armor';
        }

        // Get first item of preferred type
        return allEquipment.find((eq: EnhancedEquipment) => eq.type === preferType);
    }

    /**
     * Get treasure item counts by rarity based on CR
     * Simplified D&D 5e treasure table
     * Uses provided RNG for deterministic results
     */
    private static getTreasureItemCount(cr: number, rng: SeededRNG): Record<string, number> {
        const counts: Record<string, number> = {};

        const random = () => rng.random();

        if (cr < 5) {
            // Low CR: mostly common, some uncommon
            counts.common = Math.floor(random() * 3) + 1;
            counts.uncommon = random() > 0.7 ? 1 : 0;
        } else if (cr < 11) {
            // Medium CR: mix of common, uncommon, rare
            counts.common = Math.floor(random() * 2) + 1;
            counts.uncommon = Math.floor(random() * 2) + 1;
            counts.rare = random() > 0.6 ? 1 : 0;
        } else if (cr < 17) {
            // High CR: uncommon, rare, some very rare
            counts.uncommon = Math.floor(random() * 2) + 1;
            counts.rare = Math.floor(random() * 2) + 1;
            counts.very_rare = random() > 0.7 ? 1 : 0;
        } else {
            // Epic CR: rare, very rare, legendary
            counts.rare = Math.floor(random() * 2) + 1;
            counts.very_rare = Math.floor(random() * 2) + 1;
            counts.legendary = random() > 0.5 ? 1 : 0;
        }

        return counts;
    }

    /**
     * Estimate gold piece value of an item
     * Simplified value estimation based on rarity
     */
    private static estimateItemValue(item: EnhancedEquipment): number {
        const baseValues: Record<string, number> = {
            'common': 50,
            'uncommon': 400,
            'rare': 4000,
            'very_rare': 40000,
            'legendary': 200000
        };

        let value = baseValues[item.rarity] || 50;

        // Adjust for weapon vs armor vs item
        if (item.type === 'weapon') {
            value *= 1.2;
        } else if (item.type === 'armor') {
            value *= 1.5;
        }

        // Adjust for weight
        if (item.weight > 20) {
            value *= 1.1;
        }

        return Math.round(value);
    }
}
