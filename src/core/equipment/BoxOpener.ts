/**
 * BoxOpener - Handles opening box items and generating their contents
 *
 * Supports both guaranteed containers (like Explorer's Pack) and
 * probability-based loot boxes.
 *
 * Features:
 * - Weighted random selection from drop pools
 * - Quantity support for bulk items (e.g., 10 torches, 20 arrows)
 * - Gold drops alongside or instead of items
 * - Nested boxes are added unopened (not recursively opened)
 * - Deterministic results via SeededRNG
 */

import type { Equipment } from '../../utils/constants.js';
import type { BoxContents, BoxDropPool, BoxOpenError, BoxOpenResult, EnhancedEquipment } from '../types/Equipment.js';
import { SeededRNG } from '../../utils/random.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';

/**
 * BoxOpener class for opening box-type equipment items
 *
 * @example
 * ```typescript
 * import { BoxOpener, SeededRNG } from 'playlist-data-engine';
 *
 * const rng = new SeededRNG('test-seed');
 * const result = BoxOpener.openBox(explorersPack, rng);
 * console.log(result.items); // Generated items
 * console.log(result.gold);   // Gold amount
 * ```
 */
export class BoxOpener {
    /**
     * Open a box and generate its contents
     *
     * @param box - The box equipment to open (must have boxContents)
     * @param rng - SeededRNG for deterministic results
     * @returns BoxOpenResult with items and gold
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('deterministic-seed');
     * const result = BoxOpener.openBox(goblinChest, rng);
     * // result.items - array of generated items
     * // result.gold - total gold from drops
     * // result.consumeBox - whether box should be consumed
     * ```
     */
    static openBox(box: Equipment, rng: SeededRNG): BoxOpenResult {
        // Validate box has contents
        if (!box.boxContents) {
            return {
                success: false,
                items: [],
                gold: 0,
                consumeBox: false,
                error: {
                    code: 'NO_BOX_CONTENTS' as const,
                    message: `Box "${box.name}" has no contents defined.`
                }
            };
        }

        const boxContents: BoxContents = box.boxContents;
        const items: Equipment[] = [];
        let gold = 0;

        // Process each drop
        for (const drop of boxContents.drops) {
            // Select one item from the pool using weighted random
            const selected = this.selectFromPool(drop.pool, rng);

            if (selected) {
                // Handle gold drops
                if (selected.gold !== undefined && selected.gold > 0) {
                    gold += selected.gold;
                }
                // Handle item drops
                else if (selected.itemName) {
                    const itemData = this.getEquipmentData(selected.itemName);

                    if (itemData) {
                        // Determine quantity (default: 1)
                        const quantity = selected.quantity ?? 1;

                        // Create item with quantity
                        // For nested boxes, add them unopened
                        if (itemData.type === 'box') {
                            // Add nested box as-is (don't recursively open)
                            items.push({
                                ...itemData,
                                // Preserve any instance-specific data
                            } as Equipment);
                        } else {
                            // For regular items, add with quantity
                            // If quantity > 1, we add the same item multiple times
                            // (or the consuming code can handle stacking)
                            for (let i = 0; i < quantity; i++) {
                                items.push(itemData as Equipment);
                            }
                        }
                    } else {
                        // Item not found in registry - log warning and skip
                        console.warn(`BoxOpener: Item "${selected.itemName}" not found in equipment registry. Skipping drop.`);
                    }
                }
            }
        }

        // Determine if box should be consumed (default: true)
        const consumeBox = boxContents.consumeOnOpen !== false;

        return {
            success: true,
            items,
            gold,
            consumeBox
        };
    }

    /**
     * Select one item from a weighted pool using SeededRNG
     *
     * @param pool - Array of pool entries with weights
     * @param rng - SeededRNG for deterministic selection
     * @returns Selected pool entry, or undefined if pool is empty
     */
    private static selectFromPool(pool: BoxDropPool[], rng: SeededRNG): BoxDropPool | undefined {
        if (!pool || pool.length === 0) {
            return undefined;
        }

        // Convert pool to weighted choices format for SeededRNG
        const weightedChoices: [BoxDropPool, number][] = pool.map(entry => [
            entry,
            entry.weight
        ]);

        return rng.weightedChoice(weightedChoices);
    }

    /**
     * Get equipment data from the registry (defaults + custom)
     *
     * @param itemName - Name of the equipment to look up
     * @returns Equipment data or undefined if not found
     */
    private static getEquipmentData(itemName: string): EnhancedEquipment | undefined {
        const manager = ExtensionManager.getInstance();
        const allEquipment = manager.get('equipment') as EnhancedEquipment[];
        return allEquipment.find((eq: EnhancedEquipment) => eq.name === itemName);
    }

    /**
     * Check if an equipment item is a box type
     *
     * @param equipment - Equipment to check
     * @returns True if equipment is a box type
     */
    static isBox(equipment: Equipment): boolean {
        return equipment.type === 'box' && equipment.boxContents !== undefined;
    }

    /**
     * Preview what a box could contain without actually opening it
     *
     * Returns all possible items that could drop from the box,
     * useful for UI displays or tooltips.
     *
     * @param box - The box equipment to preview
     * @returns Object with possible items and total gold range
     */
    static previewContents(box: Equipment): {
        possibleItems: string[];
        possibleGold: { min: number; max: number };
        totalDrops: number;
    } {
        if (!box.boxContents) {
            return {
                possibleItems: [],
                possibleGold: { min: 0, max: 0 },
                totalDrops: 0
            };
        }

        const possibleItems = new Set<string>();
        let minGold = 0;
        let maxGold = 0;

        for (const drop of box.boxContents.drops) {
            for (const entry of drop.pool) {
                if (entry.itemName) {
                    possibleItems.add(entry.itemName);
                }
                if (entry.gold !== undefined) {
                    minGold = Math.min(minGold, entry.gold);
                    maxGold = Math.max(maxGold, entry.gold);
                }
            }
        }

        return {
            possibleItems: Array.from(possibleItems),
            possibleGold: { min: minGold, max: maxGold },
            totalDrops: box.boxContents.drops.length
        };
    }
}
