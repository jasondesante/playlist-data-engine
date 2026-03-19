/**
 * Integration Tests for Box Item System
 *
 * Tests the full box workflow across the system:
 * - Adding a box to a character's inventory
 * - Opening a box removes it from inventory and adds its contents
 * - Starting equipment packs remain unopened when characters are generated
 * - Combat rewards can include box items
 *
 * Part of Phase 6.2: Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { EquipmentGenerator } from '../../src/core/generation/EquipmentGenerator';
import { EquipmentSpawnHelper } from '../../src/core/equipment/EquipmentSpawnHelper';
import { BoxOpener } from '../../src/core/equipment/BoxOpener';
import { CombatEngine } from '../../src/core/combat/CombatEngine';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import { ensureAllDefaultsInitialized } from '../../src/core/extensions/initializeDefaults.js';
import { SeededRNG } from '../../src/utils/random.js';
import type { CharacterSheet } from '../../src/core/types/Character.js';
import type { EnhancedEquipment } from '../../src/core/types/Equipment.js';
import { sampleAudioProfile, sampleTrack } from '../fixtures/sampleData';

/**
 * Create a minimal mock character with empty equipment inventory.
 */
function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
    return {
        name: 'Test Character',
        race: 'Human',
        subrace: undefined,
        class: 'Fighter',
        level: 1,
        xp: 0,
        proficiency_bonus: 2,
        ability_scores: {
            STR: 15, DEX: 13, CON: 14,
            INT: 10, WIS: 12, CHA: 8,
        },
        hp: { current: 10, max: 10, temp: 0 },
        skills: [],
        saving_throws: [],
        languages: [],
        traits: [],
        features: [],
        feature_effects: [],
        equipment_effects: [],
        spells: { known_spells: [], cantrips: [] },
        equipment: {
            weapons: [],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
        },
        ...overrides,
    } as unknown as CharacterSheet;
}

/**
 * Create a minimal mock combat character (matches what CombatEngine/InitiativeRoller expects).
 *
 * InitiativeRoller uses `ability_modifiers.dexterity` (lowercase), matching
 * the shape expected by the existing combat unit tests.
 */
function createCombatCharacter(name: string, hp: number = 100) {
    return {
        name,
        level: 1,
        race: 'Human',
        class: 'Fighter',
        proficiency_bonus: 2,
        ability_scores: {
            strength: 16, dexterity: 12, constitution: 14,
            intelligence: 10, wisdom: 10, charisma: 8,
        },
        ability_modifiers: {
            strength: 3, dexterity: 1, constitution: 2,
            intelligence: 0, wisdom: 0, charisma: -1,
        },
        hp: { current: hp, max: hp, temporary: 0 },
        armor_class: 16,
        initiative_bonus: 0,
        speed: 30,
        attacks: [],
        skills: {},
        saving_throws: {
            strength: false, dexterity: false, constitution: false,
            intelligence: false, wisdom: false, charisma: false,
        },
        spells_known: [],
        spell_slots: {},
        class_features: [],
        racial_traits: [],
        feats: [],
        inventory: [],
    };
}

describe('Integration: Box Item System', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        manager = ExtensionManager.getInstance();
        manager.resetAll();
        ensureAllDefaultsInitialized();
    });

    afterEach(() => {
        manager.resetAll();
    });

    // -------------------------------------------------------------------------
    // Scenario 1: Add box to character inventory
    // -------------------------------------------------------------------------
    describe('Add box to character inventory', () => {
        it('should add a box item to the items array (not weapons or armor)', () => {
            const character = createMockCharacter();
            const rng = new SeededRNG('add-box-test');

            // Spawn Explorer's Pack (a box type)
            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"], rng);
            expect(explorersPack).toBeDefined();
            expect(explorersPack!.type).toBe('box');

            // Add to character
            const updated = EquipmentSpawnHelper.addToCharacter(
                character,
                [explorersPack!],
                false
            );

            // Box should be in items[], not weapons[] or armor[]
            expect(updated.equipment!.items).toHaveLength(1);
            expect(updated.equipment!.items[0].name).toBe("Explorer's Pack");
            expect(updated.equipment!.weapons).toHaveLength(0);
            expect(updated.equipment!.armor).toHaveLength(0);
        });

        it('should update totalWeight when adding a box', () => {
            const character = createMockCharacter();
            const rng = new SeededRNG('weight-test');

            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"], rng);
            expect(explorersPack).toBeDefined();

            const initialWeight = character.equipment!.totalWeight;
            const updated = EquipmentSpawnHelper.addToCharacter(character, [explorersPack!], false);

            expect(updated.equipment!.totalWeight).toBeGreaterThan(initialWeight);
            expect(updated.equipment!.totalWeight).toBe(initialWeight + explorersPack!.weight);
        });

        it('should allow multiple boxes in inventory', () => {
            const character = createMockCharacter();
            const rng = new SeededRNG('multi-box-test');

            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"], rng);
            const [burglarsPack] = EquipmentSpawnHelper.spawnFromList(["Burglar's Pack"], rng);
            expect(explorersPack).toBeDefined();
            expect(burglarsPack).toBeDefined();

            const updated = EquipmentSpawnHelper.addToCharacter(
                character,
                [explorersPack!, burglarsPack!],
                false
            );

            expect(updated.equipment!.items).toHaveLength(2);
            const names = updated.equipment!.items.map(i => i.name);
            expect(names).toContain("Explorer's Pack");
            expect(names).toContain("Burglar's Pack");
        });

        it('should add a custom box item to inventory', () => {
            const character = createMockCharacter();

            const customBox: EnhancedEquipment = {
                name: 'Test Loot Box',
                type: 'box',
                rarity: 'uncommon',
                weight: 5,
                source: 'custom',
                tags: ['test', 'loot'],
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Longsword' }] },
                    ],
                },
            };

            // Register the custom box
            manager.register('equipment', [customBox], { mode: 'relative', validate: false });

            const updated = EquipmentSpawnHelper.addToCharacter(character, [customBox], false);

            expect(updated.equipment!.items).toHaveLength(1);
            expect(updated.equipment!.items[0].name).toBe('Test Loot Box');
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Open box removes from inventory and adds contents
    // -------------------------------------------------------------------------
    describe('Open box removes from inventory and adds contents', () => {
        it('should remove box from inventory and add its contents after opening', () => {
            const character = createMockCharacter();
            const rng = new SeededRNG('open-box-test');

            // Give character an Explorer's Pack
            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"], rng);
            expect(explorersPack).toBeDefined();
            let updated = EquipmentSpawnHelper.addToCharacter(character, [explorersPack!], false);
            expect(updated.equipment!.items).toHaveLength(1);

            // Open the box
            const openRng = new SeededRNG('open-box-test');
            const openResult = EquipmentSpawnHelper.openBoxForCharacter(
                updated,
                "Explorer's Pack",
                openRng
            );

            expect(openResult).not.toBeNull();

            // Box should be removed from inventory (it's consumed on open)
            const packStillInInventory = openResult!.character.equipment!.items.some(
                i => i.name === "Explorer's Pack"
            );
            expect(packStillInInventory).toBe(false);

            // Contents should be in inventory
            expect(openResult!.result.items.length).toBeGreaterThan(0);
            expect(openResult!.character.equipment!.items.length).toBeGreaterThan(0);
        });

        it('should return the correct BoxOpenResult with items and gold', () => {
            const character = createMockCharacter();

            // Give character Explorer's Pack
            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"]);
            expect(explorersPack).toBeDefined();
            const withPack = EquipmentSpawnHelper.addToCharacter(character, [explorersPack!], false);

            const rng = new SeededRNG('result-test');
            const openResult = EquipmentSpawnHelper.openBoxForCharacter(
                withPack,
                "Explorer's Pack",
                rng
            );

            expect(openResult).not.toBeNull();
            expect(openResult!.result.gold).toBe(0); // Explorer's Pack has no gold drops
            expect(openResult!.result.consumeBox).toBe(true);
            expect(openResult!.result.items.length).toBeGreaterThan(0);
        });

        it('should add box contents to the correct inventory slots', () => {
            const character = createMockCharacter();

            // Register a custom box that contains a weapon + an item
            const customBox: EnhancedEquipment = {
                name: 'Test Weapon Box',
                type: 'box',
                rarity: 'common',
                weight: 2,
                source: 'custom',
                tags: ['test'],
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, itemName: 'Longsword' }] },
                        { pool: [{ weight: 100, itemName: 'Torch' }] },
                    ],
                },
            };
            manager.register('equipment', [customBox], { mode: 'relative', validate: false });

            const withBox = EquipmentSpawnHelper.addToCharacter(character, [customBox], false);

            const rng = new SeededRNG('weapon-box-test');
            const openResult = EquipmentSpawnHelper.openBoxForCharacter(
                withBox,
                'Test Weapon Box',
                rng
            );

            expect(openResult).not.toBeNull();

            // Longsword (weapon type) should be in weapons
            const hasLongsword = openResult!.character.equipment!.weapons.some(
                w => w.name === 'Longsword'
            );
            expect(hasLongsword).toBe(true);

            // Torch (item type) should be in items
            const hasTorch = openResult!.character.equipment!.items.some(
                i => i.name === 'Torch'
            );
            expect(hasTorch).toBe(true);
        });

        it('should return null when box is not in inventory', () => {
            const character = createMockCharacter();
            const rng = new SeededRNG('no-box-test');

            const result = EquipmentSpawnHelper.openBoxForCharacter(
                character,
                "Explorer's Pack",
                rng
            );

            expect(result).toBeNull();
        });

        it('should produce deterministic contents with the same RNG seed', () => {
            // Set up two identical characters with a Burglar's Pack
            const char1 = createMockCharacter();
            const char2 = createMockCharacter();

            const [pack1] = EquipmentSpawnHelper.spawnFromList(["Burglar's Pack"]);
            const [pack2] = EquipmentSpawnHelper.spawnFromList(["Burglar's Pack"]);
            expect(pack1).toBeDefined();
            expect(pack2).toBeDefined();

            const withPack1 = EquipmentSpawnHelper.addToCharacter(char1, [pack1!], false);
            const withPack2 = EquipmentSpawnHelper.addToCharacter(char2, [pack2!], false);

            // Open both with same seed
            const result1 = EquipmentSpawnHelper.openBoxForCharacter(
                withPack1,
                "Burglar's Pack",
                new SeededRNG('determinism-seed')
            );
            const result2 = EquipmentSpawnHelper.openBoxForCharacter(
                withPack2,
                "Burglar's Pack",
                new SeededRNG('determinism-seed')
            );

            expect(result1).not.toBeNull();
            expect(result2).not.toBeNull();
            expect(result1!.result.items.map(i => i.name)).toEqual(
                result2!.result.items.map(i => i.name)
            );
            expect(result1!.result.gold).toBe(result2!.result.gold);
        });

        it('should award gold when box has gold drops', () => {
            const character = createMockCharacter();

            // Register a box that always gives 100 gold
            const goldBox: EnhancedEquipment = {
                name: 'Gold Drop Box',
                type: 'box',
                rarity: 'uncommon',
                weight: 1,
                source: 'custom',
                tags: ['test', 'gold'],
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, gold: 100 }] },
                    ],
                },
            };
            manager.register('equipment', [goldBox], { mode: 'relative', validate: false });

            const withBox = EquipmentSpawnHelper.addToCharacter(character, [goldBox], false);
            const rng = new SeededRNG('gold-box-test');
            const openResult = EquipmentSpawnHelper.openBoxForCharacter(
                withBox,
                'Gold Drop Box',
                rng
            );

            expect(openResult).not.toBeNull();
            expect(openResult!.result.gold).toBe(100);
            expect(openResult!.result.items).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Starting equipment packs remain unopened
    // -------------------------------------------------------------------------
    describe('Starting equipment packs remain unopened', () => {
        it('Ranger should have Explorer\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-ranger-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Ranger', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            // Explorer's Pack should be in items (not expanded/opened)
            const hasPack = character.equipment!.items.some(
                i => i.name === "Explorer's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('Barbarian should have Explorer\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-barbarian-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Barbarian', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            // Explorer's Pack should be in items (not opened)
            const hasPack = character.equipment!.items.some(
                i => i.name === "Explorer's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('Rogue should have Burglar\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-rogue-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Rogue', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            const hasPack = character.equipment!.items.some(
                i => i.name === "Burglar's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('Cleric should have Priest\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-cleric-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Cleric', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            const hasPack = character.equipment!.items.some(
                i => i.name === "Priest's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('Wizard should have Scholar\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-wizard-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Wizard', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            const hasPack = character.equipment!.items.some(
                i => i.name === "Scholar's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('Sorcerer should have Dungeoneer\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-sorcerer-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Sorcerer', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            const hasPack = character.equipment!.items.some(
                i => i.name === "Dungeoneer's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('Bard should have Entertainer\'s Pack as an unopened box in items[]', () => {
            const character = CharacterGenerator.generate(
                'test-bard-pack',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Bard', level: 1 }
            );

            expect(character.equipment).toBeDefined();

            const hasPack = character.equipment!.items.some(
                i => i.name === "Entertainer's Pack"
            );
            expect(hasPack).toBe(true);
        });

        it('EquipmentGenerator.initializeEquipment() should keep packs as boxes not expanded items', () => {
            // Ranger starting equipment has Explorer's Pack
            const equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // The pack should be present as-is (not expanded)
            const hasPack = equipment.items.some(i => i.name === "Explorer's Pack");
            expect(hasPack).toBe(true);

            // Items that would come FROM the pack should NOT be in the inventory
            // (e.g., Bedroll is inside Explorer's Pack, but should not be directly in inventory)
            const hasBedroll = equipment.items.some(i => i.name === 'Bedroll');
            expect(hasBedroll).toBe(false);
        });

        it('pack in starting inventory should be of box type when looked up in registry', () => {
            const character = CharacterGenerator.generate(
                'test-pack-type',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Ranger', level: 1 }
            );

            const packInventoryItem = character.equipment!.items.find(
                i => i.name === "Explorer's Pack"
            );
            expect(packInventoryItem).toBeDefined();

            // Look up in registry to verify type
            const allEquipment = manager.get('equipment') as EnhancedEquipment[];
            const packData = allEquipment.find(eq => eq.name === "Explorer's Pack");
            expect(packData).toBeDefined();
            expect(packData!.type).toBe('box');
            expect(packData!.boxContents).toBeDefined();
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Combat rewards can include boxes
    // -------------------------------------------------------------------------
    describe('Combat rewards can include boxes', () => {
        it('should include a box item in treasureAwarded.items', () => {
            const player = createCombatCharacter('Player', 100);
            const enemy = createCombatCharacter('Enemy', 1); // 1 HP so player wins quickly

            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"]);
            expect(explorersPack).toBeDefined();

            const engine = new CombatEngine({
                seed: 'box-treasure-test',
                treasure: {
                    gold: 50,
                    items: [explorersPack as any],
                },
            });

            const combat = engine.startCombat([player] as any, [enemy] as any);

            // Defeat the enemy
            combat.combatants[1].currentHP = 0;
            combat.combatants[1].isDefeated = true;
            combat.isActive = false;
            combat.winner = combat.combatants[0];

            const result = engine.getCombatResult(combat);

            expect(result).toBeDefined();
            expect(result!.treasureAwarded).toBeDefined();
            expect(result!.treasureAwarded!.gold).toBe(50);
            expect(result!.treasureAwarded!.items).toHaveLength(1);
            expect(result!.treasureAwarded!.items[0].name).toBe("Explorer's Pack");
            expect((result!.treasureAwarded!.items[0] as any).type).toBe('box');
        });

        it('should include multiple box items in treasureAwarded.items', () => {
            const player = createCombatCharacter('Player', 100);
            const enemy = createCombatCharacter('Enemy', 1);

            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"]);
            const [burglarsPack] = EquipmentSpawnHelper.spawnFromList(["Burglar's Pack"]);
            expect(explorersPack).toBeDefined();
            expect(burglarsPack).toBeDefined();

            const engine = new CombatEngine({
                seed: 'multi-box-combat-test',
                treasure: {
                    items: [explorersPack as any, burglarsPack as any],
                },
            });

            const combat = engine.startCombat([player] as any, [enemy] as any);
            combat.combatants[1].currentHP = 0;
            combat.combatants[1].isDefeated = true;
            combat.isActive = false;
            combat.winner = combat.combatants[0];

            const result = engine.getCombatResult(combat);

            expect(result!.treasureAwarded!.items).toHaveLength(2);
            const names = result!.treasureAwarded!.items.map(i => i.name);
            expect(names).toContain("Explorer's Pack");
            expect(names).toContain("Burglar's Pack");
        });

        it('should award box as-is (unopened) — not auto-opened', () => {
            const player = createCombatCharacter('Player', 100);
            const enemy = createCombatCharacter('Enemy', 1);

            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"]);
            expect(explorersPack).toBeDefined();

            const engine = new CombatEngine({
                seed: 'no-auto-open-test',
                treasure: { items: [explorersPack as any] },
            });

            const combat = engine.startCombat([player] as any, [enemy] as any);
            combat.combatants[1].currentHP = 0;
            combat.combatants[1].isDefeated = true;
            combat.isActive = false;
            combat.winner = combat.combatants[0];

            const result = engine.getCombatResult(combat);

            // The treasure should contain the box itself, not its contents
            expect(result!.treasureAwarded!.items).toHaveLength(1);
            expect(result!.treasureAwarded!.items[0].name).toBe("Explorer's Pack");

            // The box contents (e.g., Bedroll, Tinderbox) should NOT be in items
            const contentNames = ['Bedroll', 'Tinderbox', 'Mess Kit', 'Rope'];
            for (const contentName of contentNames) {
                const hasContent = result!.treasureAwarded!.items.some(i => i.name === contentName);
                expect(hasContent).toBe(false);
            }
        });

        it('should support box-only treasure (no gold)', () => {
            const player = createCombatCharacter('Player', 100);
            const enemy = createCombatCharacter('Enemy', 1);

            const [burglarsPack] = EquipmentSpawnHelper.spawnFromList(["Burglar's Pack"]);
            expect(burglarsPack).toBeDefined();

            const engine = new CombatEngine({
                seed: 'box-only-treasure',
                treasure: {
                    gold: 0,
                    items: [burglarsPack as any],
                },
            });

            const combat = engine.startCombat([player] as any, [enemy] as any);
            combat.combatants[1].currentHP = 0;
            combat.combatants[1].isDefeated = true;
            combat.isActive = false;
            combat.winner = combat.combatants[0];

            const result = engine.getCombatResult(combat);

            expect(result!.treasureAwarded!.gold).toBe(0);
            expect(result!.treasureAwarded!.items).toHaveLength(1);
            expect(result!.treasureAwarded!.items[0].name).toBe("Burglar's Pack");
        });

        it('should award a custom box item as combat treasure', () => {
            const player = createCombatCharacter('Player', 100);
            const enemy = createCombatCharacter('Enemy', 1);

            const customBox: EnhancedEquipment = {
                name: 'Dragon Hoard Chest',
                type: 'box',
                rarity: 'rare',
                weight: 10,
                source: 'custom',
                tags: ['loot', 'treasure', 'dragon'],
                boxContents: {
                    drops: [
                        { pool: [{ weight: 100, gold: 500 }] },
                    ],
                },
            };

            const engine = new CombatEngine({
                seed: 'dragon-hoard-test',
                treasure: { items: [customBox as any] },
            });

            const combat = engine.startCombat([player] as any, [enemy] as any);
            combat.combatants[1].currentHP = 0;
            combat.combatants[1].isDefeated = true;
            combat.isActive = false;
            combat.winner = combat.combatants[0];

            const result = engine.getCombatResult(combat);

            expect(result!.treasureAwarded!.items).toHaveLength(1);
            expect(result!.treasureAwarded!.items[0].name).toBe('Dragon Hoard Chest');
            expect((result!.treasureAwarded!.items[0] as any).type).toBe('box');
        });
    });

    // -------------------------------------------------------------------------
    // Full end-to-end workflow: fight → receive box → open box
    // -------------------------------------------------------------------------
    describe('End-to-end: combat reward → add to inventory → open box', () => {
        it('should complete the full box lifecycle: win combat, get box, open it', () => {
            // 1. Generate a character
            const character = CharacterGenerator.generate(
                'e2e-box-test',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Fighter', level: 1 }
            );

            // 2. Run a combat that awards an Explorer's Pack
            const player = createCombatCharacter('Player', 100);
            const enemy = createCombatCharacter('Enemy', 1);

            const [explorersPack] = EquipmentSpawnHelper.spawnFromList(["Explorer's Pack"]);
            expect(explorersPack).toBeDefined();

            const engine = new CombatEngine({
                seed: 'e2e-box-seed',
                treasure: { gold: 25, items: [explorersPack as any] },
            });

            const combat = engine.startCombat([player] as any, [enemy] as any);
            combat.combatants[1].currentHP = 0;
            combat.combatants[1].isDefeated = true;
            combat.isActive = false;
            combat.winner = combat.combatants[0];

            const combatResult = engine.getCombatResult(combat);
            expect(combatResult!.treasureAwarded!.items).toHaveLength(1);

            // 3. Add the box from combat rewards to character's inventory
            const boxFromCombat = combatResult!.treasureAwarded!.items[0] as unknown as EnhancedEquipment;
            let updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, [boxFromCombat], false);

            const hasPack = updatedCharacter.equipment!.items.some(
                i => i.name === "Explorer's Pack"
            );
            expect(hasPack).toBe(true);

            // 4. Open the box
            const itemCountBeforeOpen = updatedCharacter.equipment!.items.length;
            const openRng = new SeededRNG('e2e-open-seed');
            const openResult = EquipmentSpawnHelper.openBoxForCharacter(
                updatedCharacter,
                "Explorer's Pack",
                openRng
            );

            expect(openResult).not.toBeNull();

            // Box should be removed from inventory
            const packGone = !openResult!.character.equipment!.items.some(
                i => i.name === "Explorer's Pack"
            );
            expect(packGone).toBe(true);

            // Contents should be added — more items than before (minus the box, plus contents)
            const itemCountAfterOpen = openResult!.character.equipment!.items.length +
                openResult!.character.equipment!.weapons.length;
            expect(itemCountAfterOpen).toBeGreaterThan(0);
            expect(openResult!.result.items.length).toBeGreaterThan(0);
        });
    });

    // -------------------------------------------------------------------------
    // Phase 6.5: Box Opening Requirements (openBoxForCharacter with requirements)
    // -------------------------------------------------------------------------
    describe('Box opening requirements', () => {
        /**
         * Helper to create a locked box with specified requirements
         */
        function createLockedBox(
            name: string,
            requirements: Array<{ itemName: string; quantity?: number }>,
            drops: Array<{ gold?: number; itemName?: string }>
        ): EnhancedEquipment {
            return {
                name,
                type: 'box',
                rarity: 'uncommon',
                weight: 5,
                source: 'custom',
                tags: ['test', 'locked'],
                boxContents: {
                    openRequirements: requirements,
                    drops: drops.map(d => ({
                        pool: [{ weight: 100, ...d }]
                    })),
                },
            };
        }

        it('should open box without requirements normally', () => {
            const character = createMockCharacter();

            // Create a box without requirements
            const simpleBox = createLockedBox('Simple Test Box', [], [{ gold: 100 }]);
            manager.register('equipment', [simpleBox], { mode: 'relative', validate: false });

            const withBox = EquipmentSpawnHelper.addToCharacter(character, [simpleBox], false);
            expect(withBox.equipment!.items.some(i => i.name === 'Simple Test Box')).toBe(true);

            const rng = new SeededRNG('simple-box-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withBox, 'Simple Test Box', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(true);
            expect(result!.result.gold).toBe(100);
            expect(result!.result.error).toBeUndefined();

            // Box should be removed
            expect(result!.character.equipment!.items.some(i => i.name === 'Simple Test Box')).toBe(false);
        });

        it('should consume required item from inventory when opening box', () => {
            const character = createMockCharacter();

            // Create a box requiring an Iron Key
            const lockedChest = createLockedBox(
                'Test Locked Chest',
                [{ itemName: 'Iron Key' }],
                [{ gold: 50 }]
            );

            // Create the Iron Key item
            const ironKey: EnhancedEquipment = {
                name: 'Iron Key',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['key', 'test'],
            };

            manager.register('equipment', [lockedChest, ironKey], { mode: 'relative', validate: false });

            // Add both the locked chest and iron key to character inventory
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [lockedChest, ironKey], false);

            // Verify both items are in inventory
            expect(withItems.equipment!.items.some(i => i.name === 'Test Locked Chest')).toBe(true);
            expect(withItems.equipment!.items.some(i => i.name === 'Iron Key')).toBe(true);
            expect(withItems.equipment!.items.find(i => i.name === 'Iron Key')?.quantity).toBe(1);

            // Open the locked chest
            const rng = new SeededRNG('locked-chest-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Locked Chest', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(true);
            expect(result!.result.gold).toBe(50);
            expect(result!.result.consumedItems).toEqual([{ name: 'Iron Key', quantity: 1 }]);

            // Iron Key should be removed from inventory
            const keyStillInInventory = result!.character.equipment!.items.some(i => i.name === 'Iron Key');
            expect(keyStillInInventory).toBe(false);

            // Box should also be removed
            const chestStillInInventory = result!.character.equipment!.items.some(i => i.name === 'Test Locked Chest');
            expect(chestStillInInventory).toBe(false);
        });

        it('should consume multiple items when quantity > 1', () => {
            const character = createMockCharacter();

            // Create a box requiring 3 Lockpicks
            const thievesCache = createLockedBox(
                'Test Thieves Cache',
                [{ itemName: 'Lockpick', quantity: 3 }],
                [{ gold: 75 }]
            );

            // Create the Lockpick item
            const lockpick: EnhancedEquipment = {
                name: 'Lockpick',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['tool', 'test'],
            };

            manager.register('equipment', [thievesCache, lockpick], { mode: 'relative', validate: false });

            // Add the box and 5 lockpicks to character inventory
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [thievesCache], false);

            // Manually add lockpicks with quantity 5
            withItems.equipment!.items.push({
                name: 'Lockpick',
                quantity: 5,
                equipped: false,
                instanceId: 'lockpick_instance_1'
            });

            // Verify setup
            expect(withItems.equipment!.items.find(i => i.name === 'Lockpick')?.quantity).toBe(5);

            // Open the cache
            const rng = new SeededRNG('thieves-cache-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Thieves Cache', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(true);
            expect(result!.result.gold).toBe(75);
            expect(result!.result.consumedItems).toEqual([{ name: 'Lockpick', quantity: 3 }]);

            // Lockpicks should be reduced from 5 to 2
            const lockpickItem = result!.character.equipment!.items.find(i => i.name === 'Lockpick');
            expect(lockpickItem).toBeDefined();
            expect(lockpickItem!.quantity).toBe(2);

            // Box should be removed
            expect(result!.character.equipment!.items.some(i => i.name === 'Test Thieves Cache')).toBe(false);
        });

        it('should fail gracefully when required item is not in inventory', () => {
            const character = createMockCharacter();

            // Create a box requiring an Iron Key
            const lockedChest = createLockedBox(
                'Test Locked Chest No Key',
                [{ itemName: 'Iron Key' }],
                [{ gold: 50 }]
            );

            manager.register('equipment', [lockedChest], { mode: 'relative', validate: false });

            // Add ONLY the locked chest (no key!)
            const withBox = EquipmentSpawnHelper.addToCharacter(character, [lockedChest], false);

            // Try to open the locked chest
            const rng = new SeededRNG('no-key-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withBox, 'Test Locked Chest No Key', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(false);
            expect(result!.result.error).toBeDefined();
            expect(result!.result.error!.code).toBe('MISSING_ITEM');
            expect(result!.result.error!.message).toContain('Iron Key');

            // Box should still be in inventory (not consumed)
            const boxStillInInventory = result!.character.equipment!.items.some(
                i => i.name === 'Test Locked Chest No Key'
            );
            expect(boxStillInInventory).toBe(true);

            // No gold should have been awarded
            expect(result!.result.gold).toBe(0);
            expect(result!.result.items).toHaveLength(0);
        });

        it('should fail gracefully when item quantity is insufficient', () => {
            const character = createMockCharacter();

            // Create a box requiring 3 Lockpicks
            const thievesCache = createLockedBox(
                'Test Thieves Cache Insufficient',
                [{ itemName: 'Lockpick', quantity: 3 }],
                [{ gold: 75 }]
            );

            // Create the Lockpick item
            const lockpick: EnhancedEquipment = {
                name: 'Lockpick',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['tool', 'test'],
            };

            manager.register('equipment', [thievesCache, lockpick], { mode: 'relative', validate: false });

            // Add the box and only 1 lockpick (need 3!)
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [thievesCache], false);
            withItems.equipment!.items.push({
                name: 'Lockpick',
                quantity: 1,
                equipped: false,
                instanceId: 'lockpick_instance_2'
            });

            // Try to open the cache
            const rng = new SeededRNG('insufficient-qty-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Thieves Cache Insufficient', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(false);
            expect(result!.result.error).toBeDefined();
            expect(result!.result.error!.code).toBe('INSUFFICIENT_QUANTITY');
            expect(result!.result.error!.message).toContain('Lockpick');
            expect(result!.result.error!.message).toContain('1'); // Have
            expect(result!.result.error!.message).toContain('3'); // Need

            // Box should still be in inventory
            const boxStillInInventory = result!.character.equipment!.items.some(
                i => i.name === 'Test Thieves Cache Insufficient'
            );
            expect(boxStillInInventory).toBe(true);

            // Lockpick should still be in inventory (not consumed)
            const lockpickItem = result!.character.equipment!.items.find(i => i.name === 'Lockpick');
            expect(lockpickItem).toBeDefined();
            expect(lockpickItem!.quantity).toBe(1);

            // No gold should have been awarded
            expect(result!.result.gold).toBe(0);
        });

        it('should return proper error messages for all failure cases', () => {
            const character = createMockCharacter();

            // Test 1: Missing item error message
            const box1 = createLockedBox(
                'Test Box Missing Item',
                [{ itemName: 'Golden Key' }],
                [{ gold: 100 }]
            );
            manager.register('equipment', [box1], { mode: 'relative', validate: false });

            let withBox = EquipmentSpawnHelper.addToCharacter(character, [box1], false);
            const rng1 = new SeededRNG('error-msg-test-1');
            const result1 = EquipmentSpawnHelper.openBoxForCharacter(withBox, 'Test Box Missing Item', rng1);

            expect(result1!.result.success).toBe(false);
            expect(result1!.result.error!.message).toBe('Missing required item: Golden Key');

            // Test 2: Insufficient quantity error message
            manager.resetAll();
            ensureAllDefaultsInitialized();

            const character2 = createMockCharacter();
            const box2 = createLockedBox(
                'Test Box Insufficient',
                [{ itemName: 'Gold Coin', quantity: 100 }],
                [{ gold: 500 }]
            );

            const goldCoin: EnhancedEquipment = {
                name: 'Gold Coin',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['currency', 'test'],
            };

            manager.register('equipment', [box2, goldCoin], { mode: 'relative', validate: false });

            let withBox2 = EquipmentSpawnHelper.addToCharacter(character2, [box2], false);
            withBox2.equipment!.items.push({
                name: 'Gold Coin',
                quantity: 50, // Only 50, need 100
                equipped: false,
                instanceId: 'gold_instance_1'
            });

            const rng2 = new SeededRNG('error-msg-test-2');
            const result2 = EquipmentSpawnHelper.openBoxForCharacter(withBox2, 'Test Box Insufficient', rng2);

            expect(result2!.result.success).toBe(false);
            expect(result2!.result.error!.message).toContain('Insufficient Gold Coin');
            expect(result2!.result.error!.message).toContain('50');
            expect(result2!.result.error!.message).toContain('100');
        });

        it('should update character inventory correctly after consumption', () => {
            const character = createMockCharacter();

            // Create a box requiring a key
            const lockedBox = createLockedBox(
                'Test Consumable Box',
                [{ itemName: 'Test Key' }],
                [{ itemName: 'Torch' }] // Gives a Torch
            );

            const testKey: EnhancedEquipment = {
                name: 'Test Key',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['key', 'test'],
            };

            manager.register('equipment', [lockedBox, testKey], { mode: 'relative', validate: false });

            // Add box and key to character
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [lockedBox, testKey], false);

            // Get initial item count (should be 2: box + key)
            const initialItemCount = withItems.equipment!.items.length;
            expect(initialItemCount).toBe(2);

            // Open the box
            const rng = new SeededRNG('inventory-update-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Consumable Box', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(true);

            // After opening:
            // - Box is removed (-1)
            // - Key is consumed (-1)
            // - Torch is added (+1)
            // Net: same count but different items

            const finalItems = result!.character.equipment!.items;

            // Box should be gone
            expect(finalItems.some(i => i.name === 'Test Consumable Box')).toBe(false);

            // Key should be gone (consumed)
            expect(finalItems.some(i => i.name === 'Test Key')).toBe(false);

            // Torch should be present (from box)
            expect(finalItems.some(i => i.name === 'Torch')).toBe(true);
        });

        it('should handle multiple requirements correctly', () => {
            const character = createMockCharacter();

            // Create a box requiring both Golden Key AND 200 Gold Coins
            const royalBox: EnhancedEquipment = {
                name: 'Test Royal Box',
                type: 'box',
                rarity: 'very_rare',
                weight: 10,
                source: 'custom',
                tags: ['test', 'royal', 'locked'],
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 }
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            };

            const goldenKey: EnhancedEquipment = {
                name: 'Golden Key',
                type: 'item',
                rarity: 'uncommon',
                weight: 0,
                source: 'custom',
                tags: ['key', 'test'],
            };

            const goldCoin: EnhancedEquipment = {
                name: 'Gold Coin',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['currency', 'test'],
            };

            manager.register('equipment', [royalBox, goldenKey, goldCoin], { mode: 'relative', validate: false });

            // Add box and both requirements to character
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [royalBox, goldenKey], false);
            withItems.equipment!.items.push({
                name: 'Gold Coin',
                quantity: 300, // More than needed
                equipped: false,
                instanceId: 'gold_instance_2'
            });

            // Verify setup
            expect(withItems.equipment!.items.some(i => i.name === 'Test Royal Box')).toBe(true);
            expect(withItems.equipment!.items.some(i => i.name === 'Golden Key')).toBe(true);
            expect(withItems.equipment!.items.find(i => i.name === 'Gold Coin')?.quantity).toBe(300);

            // Open the royal box
            const rng = new SeededRNG('multi-req-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Royal Box', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(true);
            expect(result!.result.gold).toBe(1000);

            // Both items should be consumed
            expect(result!.result.consumedItems).toEqual([
                { name: 'Golden Key', quantity: 1 },
                { name: 'Gold Coin', quantity: 200 }
            ]);

            // Golden Key should be removed (was 1, consumed 1)
            expect(result!.character.equipment!.items.some(i => i.name === 'Golden Key')).toBe(false);

            // Gold Coins should be reduced (was 300, consumed 200 = 100 left)
            const goldItem = result!.character.equipment!.items.find(i => i.name === 'Gold Coin');
            expect(goldItem).toBeDefined();
            expect(goldItem!.quantity).toBe(100);

            // Box should be removed
            expect(result!.character.equipment!.items.some(i => i.name === 'Test Royal Box')).toBe(false);
        });

        it('should fail when one of multiple requirements is missing', () => {
            const character = createMockCharacter();

            // Create a box requiring both Golden Key AND 200 Gold Coins
            const royalBox: EnhancedEquipment = {
                name: 'Test Royal Box Missing',
                type: 'box',
                rarity: 'very_rare',
                weight: 10,
                source: 'custom',
                tags: ['test', 'royal', 'locked'],
                boxContents: {
                    openRequirements: [
                        { itemName: 'Golden Key' },
                        { itemName: 'Gold Coin', quantity: 200 }
                    ],
                    drops: [{ pool: [{ weight: 100, gold: 1000 }] }],
                },
            };

            const goldenKey: EnhancedEquipment = {
                name: 'Golden Key',
                type: 'item',
                rarity: 'uncommon',
                weight: 0,
                source: 'custom',
                tags: ['key', 'test'],
            };

            const goldCoin: EnhancedEquipment = {
                name: 'Gold Coin',
                type: 'item',
                rarity: 'common',
                weight: 0,
                source: 'custom',
                tags: ['currency', 'test'],
            };

            manager.register('equipment', [royalBox, goldenKey, goldCoin], { mode: 'relative', validate: false });

            // Add box and gold coins, but NO Golden Key
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [royalBox], false);
            withItems.equipment!.items.push({
                name: 'Gold Coin',
                quantity: 300,
                equipped: false,
                instanceId: 'gold_instance_3'
            });

            // Try to open - should fail due to missing Golden Key
            const rng = new SeededRNG('multi-req-missing-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Royal Box Missing', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(false);
            expect(result!.result.error!.code).toBe('MISSING_ITEM');
            expect(result!.result.error!.message).toContain('Golden Key');

            // Nothing should be consumed
            expect(result!.result.consumedItems).toBeUndefined();

            // Gold coins should still be 300 (not consumed)
            const goldItem = result!.character.equipment!.items.find(i => i.name === 'Gold Coin');
            expect(goldItem?.quantity).toBe(300);

            // Box should still be in inventory
            expect(result!.character.equipment!.items.some(i => i.name === 'Test Royal Box Missing')).toBe(true);
        });

        it('should correctly update totalWeight when consuming items', () => {
            const character = createMockCharacter();

            // Create a box requiring a weighted item
            const lockedBox = createLockedBox(
                'Test Weight Box',
                [{ itemName: 'Heavy Key' }],
                [{ gold: 100 }]
            );

            const heavyKey: EnhancedEquipment = {
                name: 'Heavy Key',
                type: 'item',
                rarity: 'common',
                weight: 5, // Non-zero weight
                source: 'custom',
                tags: ['key', 'test'],
            };

            manager.register('equipment', [lockedBox, heavyKey], { mode: 'relative', validate: false });

            // Add box and key to character
            let withItems = EquipmentSpawnHelper.addToCharacter(character, [lockedBox, heavyKey], false);

            const initialWeight = withItems.equipment!.totalWeight;

            // Open the box
            const rng = new SeededRNG('weight-test');
            const result = EquipmentSpawnHelper.openBoxForCharacter(withItems, 'Test Weight Box', rng);

            expect(result).not.toBeNull();
            expect(result!.result.success).toBe(true);

            // Weight should be reduced by:
            // - Box weight (5) - consumed
            // - Key weight (5) - consumed
            // So totalWeight should be lower
            const expectedWeightReduction = lockedBox.weight + heavyKey.weight;
            expect(result!.character.equipment!.totalWeight).toBe(initialWeight - expectedWeightReduction);
        });
    });
});
