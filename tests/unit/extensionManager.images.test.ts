/**
 * ExtensionManager Image Batch Methods Unit Tests
 *
 * Tests for the batch image methods added in Phase 4:
 * - batchAddIcons
 * - batchAddImages
 * - batchUpdateImages
 * - batchByCategory
 *
 * Part of Phase 5.2: Unit Tests for ExtensionManager image methods.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExtensionManager, type ImageSupportedCategory } from '../../src/core/extensions/ExtensionManager.js';
import { SPELL_DATABASE } from '../../src/constants/DefaultSpells.js';
import { DEFAULT_EQUIPMENT } from '../../src/constants/DefaultEquipment.js';
import { ALL_RACES } from '../../src/utils/constants.js';
import { DEFAULT_RACE_DATA_ARRAY } from '../../src/constants/DefaultRaces.js';
import { ALL_CLASSES } from '../../src/constants/DefaultClasses.js';

describe('ExtensionManager Image Batch Methods', () => {
    let manager: ExtensionManager;

    // Clean up singleton before each test
    beforeEach(() => {
        // Reset the singleton by creating a fresh instance
        manager = new ExtensionManager() as ExtensionManager;

        // Initialize with default data for testing
        manager.initializeDefaults('equipment', Object.values(DEFAULT_EQUIPMENT));
        manager.initializeDefaults('spells', Object.values(SPELL_DATABASE));
        manager.initializeDefaults('races', [...ALL_RACES]);
        manager.initializeDefaults('races.data', [...DEFAULT_RACE_DATA_ARRAY]);
        manager.initializeDefaults('classes', [...ALL_CLASSES]);
        manager.initializeDefaults('appearance.bodyTypes', ['slender', 'athletic', 'muscular', 'stocky']);
    });

    afterEach(() => {
        manager.resetAll();
    });

    describe('batchAddIcons', () => {
        describe('with valid URLs', () => {
            it('should add icons to equipment items by name', () => {
                const count = manager.batchAddIcons('equipment', {
                    'Longsword': '/assets/equipment/longsword.png',
                    'Shield': '/assets/equipment/shield.png'
                });

                expect(count).toBe(2);

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                const shield = items.find((e: { name: string }) => e.name === 'Shield');

                expect(longsword?.icon).toBe('/assets/equipment/longsword.png');
                expect(shield?.icon).toBe('/assets/equipment/shield.png');
            });

            it('should add icons to spells by name (spells use name as identifier)', () => {
                // Note: SPELL_DATABASE uses 'name' property, not 'id' by default
                const count = manager.batchAddIcons('spells', {
                    'Fireball': '/assets/spells/fireball.png',
                    'Magic Missile': '/assets/spells/magic-missile.png'
                }, 'name');

                expect(count).toBe(2);

                const items = manager.get('spells');
                const fireball = items.find((s: { name: string }) => s.name === 'Fireball');
                const magicMissile = items.find((s: { name: string }) => s.name === 'Magic Missile');

                expect(fireball?.icon).toBe('/assets/spells/fireball.png');
                expect(magicMissile?.icon).toBe('/assets/spells/magic-missile.png');
            });

            it('should support https:// URLs', () => {
                const count = manager.batchAddIcons('equipment', {
                    'Longsword': 'https://example.com/icons/longsword.png'
                });

                expect(count).toBe(1);

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                expect(longsword?.icon).toBe('https://example.com/icons/longsword.png');
            });

            it('should support http:// URLs', () => {
                const count = manager.batchAddIcons('equipment', {
                    'Shield': 'http://localhost:3000/icons/shield.png'
                });

                expect(count).toBe(1);

                const items = manager.get('equipment');
                const shield = items.find((e: { name: string }) => e.name === 'Shield');
                expect(shield?.icon).toBe('http://localhost:3000/icons/shield.png');
            });

            it('should support assets/ prefix URLs', () => {
                const count = manager.batchAddIcons('equipment', {
                    'Longsword': 'assets/icons/longsword.png'
                });

                expect(count).toBe(1);

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                expect(longsword?.icon).toBe('assets/icons/longsword.png');
            });

            it('should preserve existing icons when not in the map', () => {
                // First add an icon to Longsword
                manager.batchAddIcons('equipment', {
                    'Longsword': '/assets/equipment/longsword.png'
                });

                // Then add icons to other items
                manager.batchAddIcons('equipment', {
                    'Shield': '/assets/equipment/shield.png'
                });

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                const shield = items.find((e: { name: string }) => e.name === 'Shield');

                // Longsword should keep its icon
                expect(longsword?.icon).toBe('/assets/equipment/longsword.png');
                expect(shield?.icon).toBe('/assets/equipment/shield.png');
            });

            it('should return 0 when no items match', () => {
                const count = manager.batchAddIcons('equipment', {
                    'NonExistentItem': '/assets/test.png'
                });

                expect(count).toBe(0);
            });

            it('should use custom identifier key when provided', () => {
                // Equipment doesn't have an 'id' field by default, but we can test with type
                const count = manager.batchAddIcons('equipment', {
                    'weapon': '/assets/weapons/weapon-icon.png'
                }, 'type');

                // Should update all weapons
                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const weapons = items.filter((e: { type: string }) => e.type === 'weapon');
                expect(weapons.every((w: { icon: string }) => w.icon === '/assets/weapons/weapon-icon.png')).toBe(true);
            });
        });

        describe('with invalid URLs', () => {
            it('should throw on ftp:// URLs', () => {
                expect(() => {
                    manager.batchAddIcons('equipment', {
                        'Longsword': 'ftp://example.com/icon.png'
                    });
                }).toThrow(/Invalid icon URLs/);
            });

            it('should throw on relative paths without valid prefix', () => {
                expect(() => {
                    manager.batchAddIcons('equipment', {
                        'Longsword': 'icons/longsword.png'
                    });
                }).toThrow(/Invalid icon URLs/);
            });

            it('should throw on data URLs', () => {
                expect(() => {
                    manager.batchAddIcons('equipment', {
                        'Longsword': 'data:image/png;base64,abc123'
                    });
                }).toThrow(/Invalid icon URLs/);
            });

            it('should throw on empty string URLs', () => {
                expect(() => {
                    manager.batchAddIcons('equipment', {
                        'Longsword': ''
                    });
                }).toThrow(/Invalid icon URLs/);
            });

            it('should collect all errors and throw with all invalid URLs listed', () => {
                expect(() => {
                    manager.batchAddIcons('equipment', {
                        'Longsword': 'ftp://bad.com/1.png',
                        'Shield': 'invalid-url'
                    });
                }).toThrow(/Invalid icon URLs/);
            });

            it('should not modify items when validation fails', () => {
                const originalItems = manager.get('equipment');

                try {
                    manager.batchAddIcons('equipment', {
                        'Longsword': 'invalid-url'
                    });
                } catch {
                    // Expected to throw
                }

                // Items should be unchanged
                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                expect(longsword?.icon).toBeUndefined();
            });
        });
    });

    describe('batchAddImages', () => {
        describe('with valid URLs', () => {
            it('should add images to equipment items by name', () => {
                const count = manager.batchAddImages('equipment', {
                    'Longsword': '/assets/equipment/longsword-full.png',
                    'Shield': '/assets/equipment/shield-full.png'
                });

                expect(count).toBe(2);

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                const shield = items.find((e: { name: string }) => e.name === 'Shield');

                expect(longsword?.image).toBe('/assets/equipment/longsword-full.png');
                expect(shield?.image).toBe('/assets/equipment/shield-full.png');
            });

            it('should add images to spells by name (spells use name as identifier)', () => {
                // Note: SPELL_DATABASE uses 'name' property, not 'id' by default
                const count = manager.batchAddImages('spells', {
                    'Fireball': '/assets/spells/fireball-full.png',
                    'Magic Missile': '/assets/spells/magic-missile-full.png'
                }, 'name');

                expect(count).toBe(2);

                const items = manager.get('spells');
                const fireball = items.find((s: { name: string }) => s.name === 'Fireball');
                const magicMissile = items.find((s: { name: string }) => s.name === 'Magic Missile');

                expect(fireball?.image).toBe('/assets/spells/fireball-full.png');
                expect(magicMissile?.image).toBe('/assets/spells/magic-missile-full.png');
            });

            it('should preserve existing images when not in the map', () => {
                // First add an image to Longsword
                manager.batchAddImages('equipment', {
                    'Longsword': '/assets/equipment/longsword-full.png'
                });

                // Then add images to other items
                manager.batchAddImages('equipment', {
                    'Shield': '/assets/equipment/shield-full.png'
                });

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                const shield = items.find((e: { name: string }) => e.name === 'Shield');

                // Longsword should keep its image
                expect(longsword?.image).toBe('/assets/equipment/longsword-full.png');
                expect(shield?.image).toBe('/assets/equipment/shield-full.png');
            });

            it('should return 0 when no items match', () => {
                const count = manager.batchAddImages('equipment', {
                    'NonExistentItem': '/assets/test.png'
                });

                expect(count).toBe(0);
            });
        });

        describe('with invalid URLs', () => {
            it('should throw on invalid URLs', () => {
                expect(() => {
                    manager.batchAddImages('equipment', {
                        'Longsword': 'ftp://example.com/image.png'
                    });
                }).toThrow(/Invalid image URLs/);
            });

            it('should not modify items when validation fails', () => {
                try {
                    manager.batchAddImages('equipment', {
                        'Longsword': 'invalid-url'
                    });
                } catch {
                    // Expected to throw
                }

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');
                expect(longsword?.image).toBeUndefined();
            });
        });
    });

    describe('batchUpdateImages', () => {
        describe('with predicate matching items', () => {
            it('should update all items matching predicate', () => {
                // Update all weapons with an icon
                const count = manager.batchUpdateImages('equipment',
                    (item: { type: string }) => item.type === 'weapon',
                    { icon: '/assets/icons/weapon.png' }
                );

                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const weapons = items.filter((e: { type: string }) => e.type === 'weapon');
                expect(weapons.every((w: { icon: string }) => w.icon === '/assets/icons/weapon.png')).toBe(true);
            });

            it('should update spells based on level (cantrips)', () => {
                const count = manager.batchUpdateImages('spells',
                    (spell: { level: number }) => spell.level === 0,
                    { icon: '/assets/spells/cantrip-icon.png' }
                );

                expect(count).toBeGreaterThan(0);

                const items = manager.get('spells');
                const cantrips = items.filter((s: { level: number }) => s.level === 0);
                expect(cantrips.every((s: { icon: string }) => s.icon === '/assets/spells/cantrip-icon.png')).toBe(true);
            });

            it('should update spells based on school', () => {
                const count = manager.batchUpdateImages('spells',
                    (spell: { school: string }) => spell.school === 'Evocation',
                    { icon: '/assets/icons/fire.png' }
                );

                expect(count).toBeGreaterThan(0);

                const items = manager.get('spells');
                const evocationSpells = items.filter((s: { school: string }) => s.school === 'Evocation');
                expect(evocationSpells.every((s: { icon: string }) => s.icon === '/assets/icons/fire.png')).toBe(true);
            });

            it('should update both icon and image', () => {
                // Use very_rare since there's no legendary equipment in defaults
                const count = manager.batchUpdateImages('equipment',
                    (item: { rarity: string }) => item.rarity === 'very_rare',
                    { icon: '/assets/icons/very-rare.png', image: '/assets/images/very-rare-bg.png' }
                );

                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const veryRare = items.filter((e: { rarity: string }) => e.rarity === 'very_rare');
                expect(veryRare.every((e: { icon: string; image: string }) =>
                    e.icon === '/assets/icons/very-rare.png' && e.image === '/assets/images/very-rare-bg.png'
                )).toBe(true);
            });

            it('should update only icon when image is not provided', () => {
                const count = manager.batchUpdateImages('equipment',
                    (item: { rarity: string }) => item.rarity === 'rare',
                    { icon: '/assets/icons/rare.png' }
                );

                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const rare = items.filter((e: { rarity: string }) => e.rarity === 'rare');
                expect(rare.every((e: { icon: string }) => e.icon === '/assets/icons/rare.png')).toBe(true);
            });

            it('should preserve existing properties on updated items', () => {
                manager.batchUpdateImages('equipment',
                    (item: { name: string }) => item.name === 'Longsword',
                    { icon: '/assets/test.png' }
                );

                const items = manager.get('equipment');
                const longsword = items.find((e: { name: string }) => e.name === 'Longsword');

                expect(longsword?.icon).toBe('/assets/test.png');
                expect(longsword?.name).toBe('Longsword');
                expect(longsword?.type).toBe('weapon');
                expect(longsword?.rarity).toBeDefined();
            });
        });

        describe('with no matching items', () => {
            it('should return 0 when no items match predicate', () => {
                const count = manager.batchUpdateImages('equipment',
                    (item: { name: string }) => item.name === 'NonExistentItem',
                    { icon: '/assets/test.png' }
                );

                expect(count).toBe(0);
            });

            it('should not modify any items when predicate matches nothing', () => {
                const originalCount = manager.get('equipment').length;

                manager.batchUpdateImages('equipment',
                    (item: { name: string }) => item.name === 'NonExistent',
                    { icon: '/assets/test.png' }
                );

                const items = manager.get('equipment');
                expect(items.length).toBe(originalCount);
                // No items should have the test icon
                expect(items.every((e: { icon?: string }) => e.icon !== '/assets/test.png')).toBe(true);
            });
        });

        describe('with invalid URLs', () => {
            it('should throw on invalid icon URL', () => {
                expect(() => {
                    manager.batchUpdateImages('equipment',
                        (item: { type: string }) => item.type === 'weapon',
                        { icon: 'invalid-url' }
                    );
                }).toThrow(/Invalid URLs/);
            });

            it('should throw on invalid image URL', () => {
                expect(() => {
                    manager.batchUpdateImages('equipment',
                        (item: { type: string }) => item.type === 'weapon',
                        { image: 'ftp://example.com/image.png' }
                    );
                }).toThrow(/Invalid URLs/);
            });
        });
    });

    describe('batchByCategory', () => {
        describe('with string URLs (applied as icon)', () => {
            it('should update equipment by rarity using string URLs', () => {
                // Only use rarities that exist in DEFAULT_EQUIPMENT (rare, very_rare)
                const count = manager.batchByCategory('equipment', 'rarity', {
                    'very_rare': '/assets/icons/very-rare.png',
                    'rare': '/assets/icons/rare.png',
                    'common': '/assets/icons/common.png'
                });

                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const veryRare = items.filter((e: { rarity: string }) => e.rarity === 'very_rare');
                const rare = items.filter((e: { rarity: string }) => e.rarity === 'rare');
                const common = items.filter((e: { rarity: string }) => e.rarity === 'common');

                expect(veryRare.every((e: { icon: string }) => e.icon === '/assets/icons/very-rare.png')).toBe(true);
                expect(rare.every((e: { icon: string }) => e.icon === '/assets/icons/rare.png')).toBe(true);
                expect(common.every((e: { icon: string }) => e.icon === '/assets/icons/common.png')).toBe(true);
            });

            it('should update spells by school using string URLs', () => {
                const count = manager.batchByCategory('spells', 'school', {
                    'Evocation': '/assets/icons/fire.png',
                    'Necromancy': '/assets/icons/skull.png',
                    'Abjuration': '/assets/icons/shield.png'
                });

                expect(count).toBeGreaterThan(0);

                const items = manager.get('spells');
                const evocation = items.filter((s: { school: string }) => s.school === 'Evocation');
                const necromancy = items.filter((s: { school: string }) => s.school === 'Necromancy');
                const abjuration = items.filter((s: { school: string }) => s.school === 'Abjuration');

                expect(evocation.every((s: { icon: string }) => s.icon === '/assets/icons/fire.png')).toBe(true);
                expect(necromancy.every((s: { icon: string }) => s.icon === '/assets/icons/skull.png')).toBe(true);
                expect(abjuration.every((s: { icon: string }) => s.icon === '/assets/icons/shield.png')).toBe(true);
            });
        });

        describe('with object URLs (icon and/or image)', () => {
            it('should update equipment with both icon and image', () => {
                // Use very_rare since that exists in DEFAULT_EQUIPMENT
                const count = manager.batchByCategory('equipment', 'rarity', {
                    'very_rare': {
                        icon: '/assets/icons/very-rare.png',
                        image: '/assets/images/very-rare-bg.png'
                    }
                });

                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const veryRare = items.filter((e: { rarity: string }) => e.rarity === 'very_rare');
                expect(veryRare.every((e: { icon: string; image: string }) =>
                    e.icon === '/assets/icons/very-rare.png' && e.image === '/assets/images/very-rare-bg.png'
                )).toBe(true);
            });

            it('should update equipment with only image in object', () => {
                const count = manager.batchByCategory('equipment', 'rarity', {
                    'rare': {
                        image: '/assets/images/rare-bg.png'
                    }
                });

                expect(count).toBeGreaterThan(0);

                const items = manager.get('equipment');
                const rare = items.filter((e: { rarity: string }) => e.rarity === 'rare');
                expect(rare.every((e: { image: string }) => e.image === '/assets/images/rare-bg.png')).toBe(true);
            });
        });

        describe('with no matching items', () => {
            it('should return 0 when no items match property value', () => {
                const count = manager.batchByCategory('equipment', 'rarity', {
                    'nonexistent_rarity': '/assets/test.png'
                });

                expect(count).toBe(0);
            });
        });

        describe('with invalid URLs', () => {
            it('should throw on invalid string URL', () => {
                expect(() => {
                    manager.batchByCategory('equipment', 'rarity', {
                        'rare': 'invalid-url'
                    });
                }).toThrow(/Invalid URLs/);
            });

            it('should throw on invalid icon URL in object', () => {
                expect(() => {
                    manager.batchByCategory('equipment', 'rarity', {
                        'rare': {
                            icon: 'ftp://bad.com/icon.png'
                        }
                    });
                }).toThrow(/Invalid URLs/);
            });

            it('should throw on invalid image URL in object', () => {
                expect(() => {
                    manager.batchByCategory('equipment', 'rarity', {
                        'rare': {
                            image: 'data:image/png;base64,abc'
                        }
                    });
                }).toThrow(/Invalid URLs/);
            });
        });
    });

    describe('cache invalidation', () => {
        it('should invalidate cache after batchAddIcons', () => {
            // Get items before to populate cache
            const beforeItems = manager.get('equipment');
            const beforeLongsword = beforeItems.find((e: { name: string }) => e.name === 'Longsword');
            expect(beforeLongsword?.icon).toBeUndefined();

            // Add icons
            manager.batchAddIcons('equipment', {
                'Longsword': '/assets/test.png'
            });

            // Get items again - should reflect changes
            const afterItems = manager.get('equipment');
            const afterLongsword = afterItems.find((e: { name: string }) => e.name === 'Longsword');
            expect(afterLongsword?.icon).toBe('/assets/test.png');
        });

        it('should invalidate cache after batchAddImages', () => {
            // Get items before to populate cache
            const beforeItems = manager.get('equipment');
            const beforeLongsword = beforeItems.find((e: { name: string }) => e.name === 'Longsword');
            expect(beforeLongsword?.image).toBeUndefined();

            // Add images
            manager.batchAddImages('equipment', {
                'Longsword': '/assets/test-full.png'
            });

            // Get items again - should reflect changes
            const afterItems = manager.get('equipment');
            const afterLongsword = afterItems.find((e: { name: string }) => e.name === 'Longsword');
            expect(afterLongsword?.image).toBe('/assets/test-full.png');
        });

        it('should invalidate cache after batchUpdateImages', () => {
            // Get items before to populate cache
            const beforeItems = manager.get('equipment');
            const beforeWeapons = beforeItems.filter((e: { type: string }) => e.type === 'weapon');
            expect(beforeWeapons.every((w: { icon?: string }) => w.icon === undefined)).toBe(true);

            // Update weapons
            manager.batchUpdateImages('equipment',
                (item: { type: string }) => item.type === 'weapon',
                { icon: '/assets/weapon-icon.png' }
            );

            // Get items again - should reflect changes
            const afterItems = manager.get('equipment');
            const afterWeapons = afterItems.filter((e: { type: string }) => e.type === 'weapon');
            expect(afterWeapons.every((w: { icon: string }) => w.icon === '/assets/weapon-icon.png')).toBe(true);
        });

        it('should invalidate cache after batchByCategory', () => {
            // Get items before to populate cache
            const beforeItems = manager.get('spells');
            const beforeCantrips = beforeItems.filter((s: { level: number }) => s.level === 0);
            expect(beforeCantrips.every((s: { icon?: string }) => s.icon === undefined)).toBe(true);

            // Update by category
            manager.batchByCategory('spells', 'level', {
                '0': '/assets/cantrip-icon.png'
            });

            // Get items again - should reflect changes
            const afterItems = manager.get('spells');
            const afterCantrips = afterItems.filter((s: { level: number }) => s.level === 0);
            expect(afterCantrips.every((s: { icon: string }) => s.icon === '/assets/cantrip-icon.png')).toBe(true);
        });
    });

    describe('integration with existing methods', () => {
        it('should work after registering custom equipment', () => {
            // First register custom equipment
            manager.register('equipment', [
                { name: 'Custom Sword', type: 'weapon', rarity: 'rare', weight: 5 }
            ]);

            // Then add icons
            const count = manager.batchAddIcons('equipment', {
                'Custom Sword': '/assets/custom-sword.png'
            });

            expect(count).toBe(1);

            const items = manager.get('equipment');
            const customSword = items.find((e: { name: string }) => e.name === 'Custom Sword');
            expect(customSword?.icon).toBe('/assets/custom-sword.png');
        });

        it('should preserve other custom data when batch updating images', () => {
            // Register custom equipment with description
            manager.register('equipment', [
                { name: 'Magic Blade', type: 'weapon', rarity: 'very_rare', weight: 10, description: 'A magical blade' }
            ]);

            // Add icons
            manager.batchAddIcons('equipment', {
                'Magic Blade': '/assets/magic-blade.png'
            });

            const items = manager.get('equipment');
            const magicBlade = items.find((e: { name: string }) => e.name === 'Magic Blade');

            expect(magicBlade?.icon).toBe('/assets/magic-blade.png');
            expect(magicBlade?.description).toBe('A magical blade');
        });

        it('should stack multiple batch operations', () => {
            // Add icons first
            manager.batchAddIcons('equipment', {
                'Longsword': '/assets/icons/longsword.png'
            });

            // Then add images
            manager.batchAddImages('equipment', {
                'Longsword': '/assets/images/longsword-full.png'
            });

            const items = manager.get('equipment');
            const longsword = items.find((e: { name: string }) => e.name === 'Longsword');

            expect(longsword?.icon).toBe('/assets/icons/longsword.png');
            expect(longsword?.image).toBe('/assets/images/longsword-full.png');
        });
    });

    describe('ImageSupportedCategory types', () => {
        it('should support spells category', () => {
            // Use 'name' as identifier since SPELL_DATABASE doesn't have 'id'
            const count = manager.batchAddIcons('spells', {
                'Fireball': '/assets/test.png'
            }, 'name');
            expect(count).toBeGreaterThan(0);
        });

        it('should support equipment category', () => {
            const count = manager.batchAddIcons('equipment', {
                'Longsword': '/assets/test.png'
            });
            expect(count).toBe(1);
        });

        it('should support skills category', () => {
            // Initialize skills with default data
            manager.initializeDefaults('skills', [
                { name: 'Athletics', ability: 'STR', description: 'Test skill' }
            ]);

            const count = manager.batchAddIcons('skills', {
                'Athletics': '/assets/skills/athletics.png'
            });
            expect(count).toBe(1);
        });

        it('should support classFeatures category', () => {
            // Initialize classFeatures with test data
            manager.initializeDefaults('classFeatures', [
                { id: 'test_feature', name: 'Test Feature', class: 'Fighter', level: 1, description: 'Test' }
            ]);

            const count = manager.batchAddIcons('classFeatures', {
                'Test Feature': '/assets/features/test.png'
            });
            expect(count).toBe(1);
        });

        it('should support racialTraits category', () => {
            // Initialize racialTraits with test data
            manager.initializeDefaults('racialTraits', [
                { id: 'darkvision', name: 'Darkvision', race: 'Elf', description: 'See in darkness' }
            ]);

            const count = manager.batchAddIcons('racialTraits', {
                'Darkvision': '/assets/traits/darkvision.png'
            });
            expect(count).toBe(1);
        });

        it('should support races.data category', () => {
            // races.data uses 'race' as the identifier property, not 'name'
            const count = manager.batchAddIcons('races.data', {
                'Human': '/assets/races/human.png'
            }, 'race');
            expect(count).toBe(1);
        });

        it('should support classes.data category', () => {
            // Need to initialize classes.data with actual ClassDataEntry objects
            // The default is just ALL_CLASSES strings, not ClassDataEntry objects
            manager.initializeDefaults('classes.data', [
                { name: 'Fighter', primary_ability: 'STR', hit_die: 10, saving_throws: ['STR', 'CON'], is_spellcaster: false, skill_count: 2, available_skills: ['athletics'], has_expertise: false }
            ]);
            // classes.data uses 'name' as identifier
            const count = manager.batchAddIcons('classes.data', {
                'Fighter': '/assets/classes/fighter.png'
            });
            expect(count).toBe(1);
        });
    });
});
