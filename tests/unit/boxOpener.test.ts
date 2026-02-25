/**
 * BoxOpener Unit Tests
 *
 * Tests for box opening functionality including guaranteed packs,
 * probability-based loot boxes, nested boxes, quantities, gold drops,
 * and deterministic RNG behavior.
 *
 * Part of Phase 6.1: Unit Tests for BoxOpener.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BoxOpener } from '../../src/core/equipment/BoxOpener.js';
import type { EnhancedEquipment } from '../../src/core/types/Equipment.js';
import { SeededRNG } from '../../src/utils/random.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { ensureAllDefaultsInitialized } from '../../src/core/extensions/initializeDefaults.js';

/**
 * Helper to build a minimal Equipment object for use in tests.
 */
function makeItem(name: string, overrides: Partial<EnhancedEquipment> = {}): EnhancedEquipment {
    return {
        name,
        type: 'item',
        rarity: 'common',
        weight: 1,
        source: 'default',
        ...overrides,
    };
}

describe('BoxOpener', () => {
    beforeEach(() => {
        // Ensure default equipment (including packs) is registered in the ExtensionManager
        ensureAllDefaultsInitialized();
    });

    // -----------------------------------------------------------------------
    // openBox — edge cases
    // -----------------------------------------------------------------------
    describe('openBox — edge cases', () => {
        it('should return empty result when box has no boxContents', () => {
            const box = makeItem('Empty Item') as any; // no boxContents
            const rng = new SeededRNG('test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.items).toEqual([]);
            expect(result.gold).toBe(0);
            expect(result.consumeBox).toBe(false);
        });

        it('should return empty result when boxContents has no drops', () => {
            const box = makeItem('No-Drop Box', {
                type: 'box',
                boxContents: { drops: [] },
            });
            const rng = new SeededRNG('test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.items).toEqual([]);
            expect(result.gold).toBe(0);
            expect(result.consumeBox).toBe(true); // default consumeOnOpen === true
        });

        it('should set consumeBox to false when consumeOnOpen is false', () => {
            const box = makeItem('Reusable Box', {
                type: 'box',
                boxContents: { drops: [], consumeOnOpen: false },
            });
            const rng = new SeededRNG('test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.consumeBox).toBe(false);
        });

        it('should set consumeBox to true when consumeOnOpen is true', () => {
            const box = makeItem('Consume Box', {
                type: 'box',
                boxContents: { drops: [], consumeOnOpen: true },
            });
            const rng = new SeededRNG('test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.consumeBox).toBe(true);
        });

        it('should skip drops whose itemName does not exist in the registry', () => {
            const box = makeItem('Bad-Ref Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Nonexistent Item XYZ' }] },
                    ],
                },
            });
            const rng = new SeededRNG('test');
            const result = BoxOpener.openBox(box, rng);

            // Item not found — should be silently skipped
            expect(result.items).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Guaranteed pack (Explorer's Pack always gives same items)
    // -----------------------------------------------------------------------
    describe("Explorer's Pack — guaranteed drops", () => {
        /**
         * Explorer's Pack contents (all weight 100 = guaranteed):
         *   Backpack, Bedroll, Mess Kit, Tinderbox, Waterskin, Rope,
         *   Torch ×10, Rations ×10
         * That is 6 single items + 10 Torch + 10 Rations = 26 items total.
         */
        it("should always produce the same 26 items regardless of RNG seed", () => {
            const manager = ExtensionManager.getInstance();
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const pack = allEquipment.find(e => e.name === "Explorer's Pack");
            expect(pack).toBeDefined();

            const rng = new SeededRNG('explorer_test');
            const result = BoxOpener.openBox(pack!, rng);

            expect(result.gold).toBe(0);
            expect(result.consumeBox).toBe(true);

            // 6 single items + 10 torches + 10 rations
            expect(result.items).toHaveLength(26);

            const names = result.items.map(i => i.name);
            expect(names).toContain('Backpack');
            expect(names).toContain('Bedroll');
            expect(names).toContain('Mess Kit');
            expect(names).toContain('Tinderbox');
            expect(names).toContain('Waterskin');
            expect(names).toContain('Rope');
            expect(names.filter(n => n === 'Torch')).toHaveLength(10);
            expect(names.filter(n => n === 'Rations')).toHaveLength(10);
        });

        it("should produce identical results with different seeds (all drops are guaranteed)", () => {
            const manager = ExtensionManager.getInstance();
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const pack = allEquipment.find(e => e.name === "Explorer's Pack")!;

            const result1 = BoxOpener.openBox(pack, new SeededRNG('seed-alpha'));
            const result2 = BoxOpener.openBox(pack, new SeededRNG('seed-beta'));

            expect(result1.items.map(i => i.name)).toEqual(result2.items.map(i => i.name));
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Gold drops
    // -----------------------------------------------------------------------
    describe('Gold drops', () => {
        it('should accumulate gold from gold-only drops', () => {
            const box = makeItem('Gold Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, gold: 50 }] },
                        { pool: [{ weight: 100, gold: 100 }] },
                    ],
                },
            });
            const rng = new SeededRNG('gold_test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.gold).toBe(150);
            expect(result.items).toHaveLength(0);
        });

        it('should not add gold when pool entry has gold: 0', () => {
            const box = makeItem('Zero Gold Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, gold: 0 }] },
                    ],
                },
            });
            const rng = new SeededRNG('gold_zero_test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.gold).toBe(0);
            expect(result.items).toHaveLength(0);
        });

        it('should handle a single gold drop correctly', () => {
            const box = makeItem('Single Gold Drop', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, gold: 500 }] },
                    ],
                },
            });
            const rng = new SeededRNG('single_gold');
            const result = BoxOpener.openBox(box, rng);

            expect(result.gold).toBe(500);
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Quantity parameter (bulk items)
    // -----------------------------------------------------------------------
    describe('Quantity parameter', () => {
        it("should produce quantity=1000 Ball Bearings from Burglar's Pack", () => {
            const manager = ExtensionManager.getInstance();
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const pack = allEquipment.find(e => e.name === "Burglar's Pack");
            expect(pack).toBeDefined();

            const rng = new SeededRNG('burglar_test');
            const result = BoxOpener.openBox(pack!, rng);

            const ballBearings = result.items.filter(i => i.name === 'Ball Bearings');
            expect(ballBearings).toHaveLength(1000);
        });

        it('should add single item when no quantity is specified', () => {
            // Register a test item so BoxOpener can find it
            const manager = ExtensionManager.getInstance();
            manager.register('equipment', [
                makeItem('Test Single Item Qty')
            ], { mode: 'relative', validate: false });

            const box = makeItem('Single Qty Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Test Single Item Qty' }] },
                    ],
                },
            });

            const rng = new SeededRNG('single_qty_test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.items).toHaveLength(1);
            expect(result.items[0]!.name).toBe('Test Single Item Qty');
        });

        it('should produce the correct number of items when quantity is specified', () => {
            const manager = ExtensionManager.getInstance();
            manager.register('equipment', [
                makeItem('Test Arrow Qty')
            ], { mode: 'relative', validate: false });

            const box = makeItem('Arrow Qty Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Test Arrow Qty', quantity: 20 }] },
                    ],
                },
            });

            const rng = new SeededRNG('arrow_qty_test');
            const result = BoxOpener.openBox(box, rng);

            expect(result.items).toHaveLength(20);
            result.items.forEach(item => {
                expect(item.name).toBe('Test Arrow Qty');
            });
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Nested boxes
    // -----------------------------------------------------------------------
    describe('Nested boxes', () => {
        it('should add a nested box as-is (unopened) without recursing', () => {
            const manager = ExtensionManager.getInstance();

            // Register a nested box item
            const nestedBox = makeItem('Test Goblin Chest Nested', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, gold: 999 }] }, // would give gold if opened
                    ],
                },
            });
            manager.register('equipment', [nestedBox], { mode: 'relative', validate: false });

            // Outer box drops the nested box
            const outerBox = makeItem('Test Treasure Cache Nested', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Test Goblin Chest Nested' }] },
                        { pool: [{ weight: 100, gold: 100 }] },
                    ],
                },
            });

            const rng = new SeededRNG('nested_box_test');
            const result = BoxOpener.openBox(outerBox, rng);

            // Should have 1 item (the nested box) — NOT recursively opened
            expect(result.items).toHaveLength(1);
            expect(result.items[0]!.name).toBe('Test Goblin Chest Nested');
            expect(result.items[0]!.type).toBe('box');

            // Gold from outer box only (not from nested box's drops)
            expect(result.gold).toBe(100);
        });

        it('should preserve boxContents on the nested box item', () => {
            const manager = ExtensionManager.getInstance();

            const nestedBox = makeItem('Test Nested Box With Contents', {
                type: 'box',
                boxContents: {
                    drops: [{ pool: [{ weight: 100, gold: 42 }] }],
                },
            });
            manager.register('equipment', [nestedBox], { mode: 'relative', validate: false });

            const outerBox = makeItem('Test Outer Box For Contents Check', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Test Nested Box With Contents' }] },
                    ],
                },
            });

            const rng = new SeededRNG('nested_contents_test');
            const result = BoxOpener.openBox(outerBox, rng);

            expect(result.items).toHaveLength(1);
            const innerBox = result.items[0]!;
            expect(innerBox.boxContents).toBeDefined();
            expect(innerBox.boxContents?.drops).toHaveLength(1);
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Loot box with probability weights
    // -----------------------------------------------------------------------
    describe('Loot box with probability weights', () => {
        it('should only return items that are in the pool', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('equipment', [
                makeItem('Test Loot Item A'),
                makeItem('Test Loot Item B'),
            ], { mode: 'relative', validate: false });

            const lootBox = makeItem('Test Weighted Loot Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        {
                            pool: [
                                { weight: 50, itemName: 'Test Loot Item A' },
                                { weight: 50, itemName: 'Test Loot Item B' },
                            ],
                        },
                    ],
                },
            });

            // Open many times to verify only valid items appear
            const names = new Set<string>();
            for (let i = 0; i < 20; i++) {
                const rng = new SeededRNG(`loot_seed_${i}`);
                const result = BoxOpener.openBox(lootBox, rng);
                expect(result.items).toHaveLength(1);
                names.add(result.items[0]!.name);
            }

            // Both items should appear across 20 rolls
            expect(names).toContain('Test Loot Item A');
            expect(names).toContain('Test Loot Item B');

            // No unexpected items
            names.forEach(n => {
                expect(['Test Loot Item A', 'Test Loot Item B']).toContain(n);
            });
        });

        it('should always select the only item in a single-item pool', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('equipment', [
                makeItem('Test Sole Item'),
            ], { mode: 'relative', validate: false });

            const box = makeItem('Test Single Pool Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Test Sole Item' }] },
                    ],
                },
            });

            for (let i = 0; i < 5; i++) {
                const rng = new SeededRNG(`sole_seed_${i}`);
                const result = BoxOpener.openBox(box, rng);
                expect(result.items).toHaveLength(1);
                expect(result.items[0]!.name).toBe('Test Sole Item');
            }
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Mixed box (guaranteed + random drops)
    // -----------------------------------------------------------------------
    describe('Mixed box (guaranteed + random drops)', () => {
        it('should always include the guaranteed item plus one random item', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('equipment', [
                makeItem('Test Guaranteed Item Mixed'),
                makeItem('Test Random Item C'),
                makeItem('Test Random Item D'),
            ], { mode: 'relative', validate: false });

            const mixedBox = makeItem('Test Mixed Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        // Guaranteed drop
                        { pool: [{ weight: 100, itemName: 'Test Guaranteed Item Mixed' }] },
                        // Random drop from 2 options
                        {
                            pool: [
                                { weight: 50, itemName: 'Test Random Item C' },
                                { weight: 50, itemName: 'Test Random Item D' },
                            ],
                        },
                    ],
                },
            });

            const randomNames = new Set<string>();
            for (let i = 0; i < 20; i++) {
                const rng = new SeededRNG(`mixed_seed_${i}`);
                const result = BoxOpener.openBox(mixedBox, rng);

                expect(result.items).toHaveLength(2);

                // First drop is always guaranteed
                const names = result.items.map(item => item.name);
                expect(names).toContain('Test Guaranteed Item Mixed');

                // Second drop is one of the two random options
                const randomName = names.find(n => n !== 'Test Guaranteed Item Mixed')!;
                expect(['Test Random Item C', 'Test Random Item D']).toContain(randomName);
                randomNames.add(randomName);
            }

            // Both random items should appear across 20 rolls
            expect(randomNames).toContain('Test Random Item C');
            expect(randomNames).toContain('Test Random Item D');
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — Seeded RNG produces same results
    // -----------------------------------------------------------------------
    describe('Seeded RNG determinism', () => {
        it('should produce identical results when opened with the same seed', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('equipment', [
                makeItem('Test RNG Item X'),
                makeItem('Test RNG Item Y'),
                makeItem('Test RNG Item Z'),
            ], { mode: 'relative', validate: false });

            const box = makeItem('Test RNG Determinism Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        {
                            pool: [
                                { weight: 33, itemName: 'Test RNG Item X' },
                                { weight: 33, itemName: 'Test RNG Item Y' },
                                { weight: 34, itemName: 'Test RNG Item Z' },
                            ],
                        },
                        {
                            pool: [
                                { weight: 50, itemName: 'Test RNG Item X' },
                                { weight: 50, itemName: 'Test RNG Item Y' },
                            ],
                        },
                    ],
                },
            });

            // Open 5 times with the same seed — all should be identical
            const seed = 'deterministic_rng_test_seed';
            const results: string[][] = [];

            for (let i = 0; i < 5; i++) {
                const rng = new SeededRNG(seed);
                const result = BoxOpener.openBox(box, rng);
                results.push(result.items.map(item => item.name));
            }

            results.forEach(r => {
                expect(r).toEqual(results[0]);
            });
        });

        it('should produce different results with different seeds for a probabilistic box', () => {
            const manager = ExtensionManager.getInstance();

            manager.register('equipment', [
                makeItem('Test Seed Check A'),
                makeItem('Test Seed Check B'),
                makeItem('Test Seed Check C'),
                makeItem('Test Seed Check D'),
            ], { mode: 'relative', validate: false });

            const box = makeItem('Test Seed Variation Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        {
                            pool: [
                                { weight: 25, itemName: 'Test Seed Check A' },
                                { weight: 25, itemName: 'Test Seed Check B' },
                                { weight: 25, itemName: 'Test Seed Check C' },
                                { weight: 25, itemName: 'Test Seed Check D' },
                            ],
                        },
                    ],
                },
            });

            const results = new Set<string>();
            for (let i = 0; i < 30; i++) {
                const rng = new SeededRNG(`varied_seed_${i}`);
                const result = BoxOpener.openBox(box, rng);
                expect(result.items).toHaveLength(1);
                results.add(result.items[0]!.name);
            }

            // With 30 different seeds and 4 equal-weight items, we expect variety
            expect(results.size).toBeGreaterThan(1);
        });

        it("should produce same results for Explorer's Pack across multiple identical seeds", () => {
            const manager = ExtensionManager.getInstance();
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const pack = allEquipment.find(e => e.name === "Explorer's Pack")!;

            const seed = 'explorer_determinism';
            const allNames: string[][] = [];

            for (let i = 0; i < 3; i++) {
                const rng = new SeededRNG(seed);
                const result = BoxOpener.openBox(pack, rng);
                allNames.push(result.items.map(item => item.name));
            }

            expect(allNames[0]).toEqual(allNames[1]);
            expect(allNames[1]).toEqual(allNames[2]);
        });
    });

    // -----------------------------------------------------------------------
    // isBox
    // -----------------------------------------------------------------------
    describe('isBox', () => {
        it('should return true for a box item with boxContents', () => {
            const box = makeItem('Box Item', {
                type: 'box',
                boxContents: { drops: [] },
            });
            expect(BoxOpener.isBox(box)).toBe(true);
        });

        it('should return false for a non-box item', () => {
            const item = makeItem('Regular Item', { type: 'item' });
            expect(BoxOpener.isBox(item)).toBe(false);
        });

        it('should return false for a box type without boxContents', () => {
            const item = makeItem('Box Without Contents', { type: 'box' });
            expect(BoxOpener.isBox(item)).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // previewContents
    // -----------------------------------------------------------------------
    describe('previewContents', () => {
        it('should return empty preview for item without boxContents', () => {
            const item = makeItem('Plain Item');
            const preview = BoxOpener.previewContents(item);

            expect(preview.possibleItems).toEqual([]);
            expect(preview.possibleGold).toEqual({ min: 0, max: 0 });
            expect(preview.totalDrops).toBe(0);
        });

        it('should list all possible item names from all drop pools', () => {
            const box = makeItem('Preview Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        {
                            pool: [
                                { weight: 50, itemName: 'Sword' },
                                { weight: 50, itemName: 'Shield' },
                            ],
                        },
                        {
                            pool: [
                                { weight: 100, itemName: 'Rope' },
                            ],
                        },
                    ],
                },
            });

            const preview = BoxOpener.previewContents(box);

            expect(preview.possibleItems).toContain('Sword');
            expect(preview.possibleItems).toContain('Shield');
            expect(preview.possibleItems).toContain('Rope');
            expect(preview.totalDrops).toBe(2);
        });

        it('should capture max gold from gold drops', () => {
            const box = makeItem('Gold Preview Box', {
                type: 'box',
                boxContents: {
                    drops: [
                        {
                            pool: [
                                { weight: 50, gold: 10 },
                                { weight: 50, gold: 100 },
                            ],
                        },
                    ],
                },
            });

            const preview = BoxOpener.previewContents(box);

            expect(preview.possibleGold.max).toBe(100);
            expect(preview.totalDrops).toBe(1);
        });

        it("should correctly preview Explorer's Pack contents", () => {
            const manager = ExtensionManager.getInstance();
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const pack = allEquipment.find(e => e.name === "Explorer's Pack")!;

            const preview = BoxOpener.previewContents(pack);

            expect(preview.totalDrops).toBe(8);
            expect(preview.possibleItems).toContain('Backpack');
            expect(preview.possibleItems).toContain('Bedroll');
            expect(preview.possibleItems).toContain('Torch');
            expect(preview.possibleItems).toContain('Rations');
            expect(preview.possibleGold).toEqual({ min: 0, max: 0 });
        });
    });

    // -----------------------------------------------------------------------
    // 6.1 — checkRequirements (Box Opening Requirements)
    // -----------------------------------------------------------------------
    describe('checkRequirements', () => {
        it('should return null when box has no requirements', () => {
            const box = makeItem('Simple Box', {
                type: 'box',
                boxContents: {
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const inventory: any[] = [];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).toBeNull();
        });

        it('should return null when box has no boxContents', () => {
            const box = makeItem('Box Without Contents', {
                type: 'box',
            });
            const inventory: any[] = [];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).toBeNull();
        });

        it('should return MISSING_ITEM error when required item is not in inventory', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const inventory: any[] = []; // Empty inventory - no Iron Key

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).not.toBeNull();
            expect(result!.code).toBe('MISSING_ITEM');
            expect(result!.message).toContain('Iron Key');
            expect(result!.requirement).toEqual({ itemName: 'Iron Key' });
        });

        it('should return INSUFFICIENT_QUANTITY error when item quantity is too low', () => {
            const box = makeItem('Thieves Cache', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Lockpick', quantity: 3 }],
                    drops: [{ pool: [{ weight: 100, gold: 75 }] }],
                },
            });
            const inventory = [
                { name: 'Lockpick', quantity: 1, equipped: false }, // Only 1, need 3
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).not.toBeNull();
            expect(result!.code).toBe('INSUFFICIENT_QUANTITY');
            expect(result!.message).toContain('Lockpick');
            expect(result!.message).toContain('1');
            expect(result!.message).toContain('3');
            expect(result!.requirement).toEqual({ itemName: 'Lockpick', quantity: 3 });
        });

        it('should return null when all requirements are met (single item)', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const inventory = [
                { name: 'Iron Key', quantity: 1, equipped: false },
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).toBeNull();
        });

        it('should return null when requirement is met with quantity > 1', () => {
            const box = makeItem('Thieves Cache', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Lockpick', quantity: 3 }],
                    drops: [{ pool: [{ weight: 100, gold: 75 }] }],
                },
            });
            const inventory = [
                { name: 'Lockpick', quantity: 5, equipped: false }, // Have 5, need 3
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).toBeNull();
        });

        it('should return null when multiple requirements are all met', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            });
            const inventory = [
                { name: 'Golden Key', quantity: 1, equipped: false },
                { name: 'Gold Coin', quantity: 250, equipped: false }, // Have 250, need 200
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).toBeNull();
        });

        it('should return error when one of multiple requirements is not met (missing item)', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            });
            const inventory = [
                { name: 'Gold Coin', quantity: 250, equipped: false }, // Have gold, but no key
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).not.toBeNull();
            expect(result!.code).toBe('MISSING_ITEM');
            expect(result!.message).toContain('Golden Key');
        });

        it('should return error when one of multiple requirements is not met (insufficient quantity)', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            });
            const inventory = [
                { name: 'Golden Key', quantity: 1, equipped: false },
                { name: 'Gold Coin', quantity: 100, equipped: false }, // Have key, but only 100 gold
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).not.toBeNull();
            expect(result!.code).toBe('INSUFFICIENT_QUANTITY');
            expect(result!.message).toContain('Gold Coin');
            expect(result!.message).toContain('100');
            expect(result!.message).toContain('200');
        });

        it('should check requirements in order and return first failure', () => {
            const box = makeItem('Multi-Requirement Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'First Item' },
                        { itemName: 'Second Item' },
                        { itemName: 'Third Item' },
                    ],
                    drops: [],
                },
            });
            const inventory = [
                { name: 'First Item', quantity: 1, equipped: false },
                // Missing 'Second Item' - should fail here
                { name: 'Third Item', quantity: 1, equipped: false },
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).not.toBeNull();
            expect(result!.code).toBe('MISSING_ITEM');
            expect(result!.message).toContain('Second Item');
        });

        it('should default quantity to 1 when not specified', () => {
            const box = makeItem('Box With Implicit Quantity', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }], // No quantity specified
                    drops: [],
                },
            });
            const inventory = [
                { name: 'Iron Key', quantity: 1, equipped: false }, // Exactly 1 should be enough
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).toBeNull();
        });

        it('should return INSUFFICIENT_QUANTITY when item exists with quantity 0', () => {
            const box = makeItem('Box With Implicit Quantity', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [],
                },
            });
            const inventory = [
                { name: 'Iron Key', quantity: 0, equipped: false }, // Zero quantity
            ];

            const result = BoxOpener.checkRequirements(box, inventory);

            expect(result).not.toBeNull();
            expect(result!.code).toBe('INSUFFICIENT_QUANTITY');
        });
    });

    // -----------------------------------------------------------------------
    // 6.2 — canOpen (Boolean wrapper around checkRequirements)
    // -----------------------------------------------------------------------
    describe('canOpen', () => {
        it('should return true for boxes without requirements', () => {
            const box = makeItem('Simple Box', {
                type: 'box',
                boxContents: {
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const inventory: any[] = [];

            expect(BoxOpener.canOpen(box, inventory)).toBe(true);
        });

        it('should return true when all requirements are met', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [],
                },
            });
            const inventory = [
                { name: 'Iron Key', quantity: 1, equipped: false },
            ];

            expect(BoxOpener.canOpen(box, inventory)).toBe(true);
        });

        it('should return false when requirements are not met', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [],
                },
            });
            const inventory: any[] = []; // No key

            expect(BoxOpener.canOpen(box, inventory)).toBe(false);
        });

        it('should return false when quantity is insufficient', () => {
            const box = makeItem('Thieves Cache', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Lockpick', quantity: 3 }],
                    drops: [],
                },
            });
            const inventory = [
                { name: 'Lockpick', quantity: 2, equipped: false }, // Need 3, have 2
            ];

            expect(BoxOpener.canOpen(box, inventory)).toBe(false);
        });

        it('should return true when multiple requirements are all met', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [],
                },
            });
            const inventory = [
                { name: 'Golden Key', quantity: 1, equipped: false },
                { name: 'Gold Coin', quantity: 300, equipped: false },
            ];

            expect(BoxOpener.canOpen(box, inventory)).toBe(true);
        });

        it('should return false when one of multiple requirements is missing', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [],
                },
            });
            const inventory = [
                { name: 'Gold Coin', quantity: 300, equipped: false }, // No key
            ];

            expect(BoxOpener.canOpen(box, inventory)).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // 6.3 — getRequirementsDescription
    // -----------------------------------------------------------------------
    describe('getRequirementsDescription', () => {
        it('should return null for boxes without requirements', () => {
            const box = makeItem('Simple Box', {
                type: 'box',
                boxContents: {
                    drops: [],
                },
            });

            expect(BoxOpener.getRequirementsDescription(box)).toBeNull();
        });

        it('should return null for boxes without boxContents', () => {
            const box = makeItem('Box Without Contents', {
                type: 'box',
            });

            expect(BoxOpener.getRequirementsDescription(box)).toBeNull();
        });

        it('should return description for single item requirement', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [],
                },
            });

            const desc = BoxOpener.getRequirementsDescription(box);
            expect(desc).toBe('Requires: Iron Key');
        });

        it('should include quantity in description when > 1', () => {
            const box = makeItem('Thieves Cache', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Lockpick', quantity: 3 }],
                    drops: [],
                },
            });

            const desc = BoxOpener.getRequirementsDescription(box);
            expect(desc).toBe('Requires: 3 Lockpick');
        });

        it('should handle multiple requirements', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [],
                },
            });

            const desc = BoxOpener.getRequirementsDescription(box);
            expect(desc).toBe('Requires: Golden Key, 200 Gold Coin');
        });

        it('should handle multiple requirements with mixed quantities', () => {
            const box = makeItem('Complex Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Iron Key', quantity: 2 },
                        { itemName: 'Lockpick', quantity: 5 },
                        { itemName: 'Golden Key' },
                    ],
                    drops: [],
                },
            });

            const desc = BoxOpener.getRequirementsDescription(box);
            expect(desc).toBe('Requires: 2 Iron Key, 5 Lockpick, Golden Key');
        });
    });

    // -----------------------------------------------------------------------
    // 6.3 — openBox with Requirements
    // -----------------------------------------------------------------------
    describe('openBox with requirements', () => {
        it('should open normally when no requirements', () => {
            const box = makeItem('Simple Box', {
                type: 'box',
                boxContents: {
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const rng = new SeededRNG('no-req-test');

            const result = BoxOpener.openBox(box, rng);

            expect(result.success).toBe(true);
            expect(result.gold).toBe(50);
            expect(result.items).toHaveLength(0);
            expect(result.consumedItems).toBeUndefined();
        });

        it('should open normally when requirements are met (with inventory)', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const rng = new SeededRNG('req-met-test');
            const inventory = [
                { name: 'Iron Key', quantity: 1, equipped: false },
            ];

            const result = BoxOpener.openBox(box, rng, inventory);

            expect(result.success).toBe(true);
            expect(result.gold).toBe(50);
            expect(result.consumedItems).toEqual([{ name: 'Iron Key', quantity: 1 }]);
        });

        it('should return error when requirements not met', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const rng = new SeededRNG('req-not-met-test');
            const inventory: any[] = []; // No key

            const result = BoxOpener.openBox(box, rng, inventory);

            expect(result.success).toBe(false);
            expect(result.items).toHaveLength(0);
            expect(result.gold).toBe(0);
            expect(result.error).toBeDefined();
            expect(result.error!.code).toBe('MISSING_ITEM');
            expect(result.consumedItems).toBeUndefined();
        });

        it('should be backward compatible (no inventory parameter = skip checks)', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });
            const rng = new SeededRNG('backward-compat-test');
            // No inventory parameter provided

            const result = BoxOpener.openBox(box, rng);

            // Should succeed without checking requirements (backward compatible)
            expect(result.success).toBe(true);
            expect(result.gold).toBe(50);
        });

        it('should return consumedItems list when successfully opened with requirements', () => {
            const box = makeItem('Thieves Cache', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Lockpick', quantity: 3 }],
                    drops: [{ pool: [{ weight: 100, gold: 75 }] }],
                },
            });
            const rng = new SeededRNG('consumed-items-test');
            const inventory = [
                { name: 'Lockpick', quantity: 5, equipped: false },
            ];

            const result = BoxOpener.openBox(box, rng, inventory);

            expect(result.success).toBe(true);
            expect(result.consumedItems).toEqual([{ name: 'Lockpick', quantity: 3 }]);
        });

        it('should handle multiple requirements and return all in consumedItems', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            });
            const rng = new SeededRNG('multi-consumed-test');
            const inventory = [
                { name: 'Golden Key', quantity: 1, equipped: false },
                { name: 'Gold Coin', quantity: 500, equipped: false },
            ];

            const result = BoxOpener.openBox(box, rng, inventory);

            expect(result.success).toBe(true);
            expect(result.consumedItems).toEqual([
                { name: 'Golden Key', quantity: 1 },
                { name: 'Gold Coin', quantity: 200 },
            ]);
        });

        it('should return error with requirement details when quantity insufficient', () => {
            const box = makeItem('Thieves Cache', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Lockpick', quantity: 3 }],
                    drops: [],
                },
            });
            const rng = new SeededRNG('insufficient-qty-test');
            const inventory = [
                { name: 'Lockpick', quantity: 2, equipped: false }, // Need 3, have 2
            ];

            const result = BoxOpener.openBox(box, rng, inventory);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.code).toBe('INSUFFICIENT_QUANTITY');
            expect(result.error!.requirement).toEqual({ itemName: 'Lockpick', quantity: 3 });
            expect(result.error!.message).toContain('2');
            expect(result.error!.message).toContain('3');
        });
    });

    // -----------------------------------------------------------------------
    // 6.3 — previewContents with requirements
    // -----------------------------------------------------------------------
    describe('previewContents with requirements', () => {
        it('should include openRequirements in preview when present', () => {
            const box = makeItem('Locked Chest', {
                type: 'box',
                boxContents: {
                    openRequirements: [{ itemName: 'Iron Key' }],
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });

            const preview = BoxOpener.previewContents(box);

            expect(preview.openRequirements).toBeDefined();
            expect(preview.openRequirements).toHaveLength(1);
            expect(preview.openRequirements![0]).toEqual({ itemName: 'Iron Key' });
        });

        it('should include multiple requirements in preview', () => {
            const box = makeItem('Royal Treasury Box', {
                type: 'box',
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 },
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            });

            const preview = BoxOpener.previewContents(box);

            expect(preview.openRequirements).toBeDefined();
            expect(preview.openRequirements).toHaveLength(2);
            expect(preview.openRequirements).toEqual([
                { itemName: 'Golden Key' },
                { itemName: 'Gold Coin', quantity: 200 },
            ]);
        });

        it('should not include openRequirements when not present', () => {
            const box = makeItem('Simple Box', {
                type: 'box',
                boxContents: {
                    drops: [{ pool: [{ weight: 100, gold: 50 }] }],
                },
            });

            const preview = BoxOpener.previewContents(box);

            expect(preview.openRequirements).toBeUndefined();
        });

        it('should not include openRequirements when empty array', () => {
            const box = makeItem('Box With Empty Requirements', {
                type: 'box',
                boxContents: {
                    openRequirements: [],
                    drops: [],
                },
            });

            const preview = BoxOpener.previewContents(box);

            expect(preview.openRequirements).toBeUndefined();
        });
    });
});
