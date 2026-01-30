/**
 * Batch Spawning Demo
 *
 * This file demonstrates how to use the EquipmentSpawnHelper to
 * batch spawn equipment for various gameplay scenarios.
 *
 * Part of Phase 12.1: Create Batch Spawning Demo.
 */

import { EquipmentSpawnHelper } from '../src/core/equipment/EquipmentSpawnHelper.js';
import { SeededRNG } from '../src/utils/random.js';
import type { CharacterSheet } from '../src/core/types/Character.js';
import type { EnhancedEquipment } from '../src/core/types/Equipment.js';

// ============================================================
// DEMO 1: Spawn Starter Gear for New Characters
// ============================================================

/**
 * Generate starting equipment for a new adventurer
 * Based on their class
 */
export function spawnStarterGear(characterClass: string): EnhancedEquipment[] {
    const rng = new SeededRNG(`starter_${characterClass}`);

    const starterGearByClass: Record<string, string[]> = {
        'Fighter': ['Longsword', 'Shield', 'Scale Mail', 'Handaxe', 'Torch'],
        'Wizard': ['Quarterstaff', 'Spellbook', 'Component Pouch', 'Dagger', 'Robes'],
        'Rogue': ['Shortsword', 'Shortsword', 'Leather Armor', 'Thieves Tools', 'Dagger'],
        'Cleric': ['Mace', 'Shield', 'Scale Mail', 'Holy Symbol', 'Healer\'s Kit'],
        'Ranger': ['Longbow', 'Longsword', 'Leather Armor', 'Arrow', 'Torch'],
        'Barbarian': ['Greataxe', 'Greataxe', 'Handaxe', 'Javelin', 'Explorer\'s Pack'],
        'Bard': ['Rapier', 'Leather Armor', 'Lute', 'Dagger', 'Entertainer\'s Pack'],
        'Druid': ['Scimitar', 'Leather Armor', 'Druidic Focus', 'Shield', 'Explorer\'s Pack'],
        'Monk': ['Shortsword', 'Shortsword', 'Dart', 'Dart', 'Dart'],
        'Paladin': ['Longsword', 'Shield', 'Chain Mail', 'Holy Symbol', 'Javelin'],
        'Sorcerer': ['Dagger', 'Dagger', 'Component Pouch', 'Arcane Focus', 'Dungeoneer\'s Pack'],
        'Warlock': ['Dagger', 'Leather Armor', 'Arcane Focus', 'Scholar\'s Pack', 'Pact Weapon']
    };

    const gearNames = starterGearByClass[characterClass] || starterGearByClass['Fighter'];

    // Add some ammunition for ranged weapons
    if (characterClass === 'Ranger' || characterClass === 'Fighter') {
        // Spawn arrows in quantity (simulated by multiple entries)
        return EquipmentSpawnHelper.spawnFromList(
            [...gearNames, 'Arrow', 'Arrow', 'Arrow'],
            rng
        ).filter((item): item is EnhancedEquipment => item !== undefined);
    }

    return EquipmentSpawnHelper.spawnFromList(gearNames, rng)
        .filter((item): item is EnhancedEquipment => item !== undefined);
}

/**
 * Give a character their starting equipment
 */
export function equipStartingGear(character: CharacterSheet): CharacterSheet {
    const gear = spawnStarterGear(character.class);
    return EquipmentSpawnHelper.addToCharacter(character, gear, true);
}

// ============================================================
// DEMO 2: Spawn Loot Drops by Rarity
// ============================================================

/**
 * Generate loot for a defeated enemy based on challenge rating
 */
export function spawnEnemyLoot(cr: number, rng: SeededRNG): EnhancedEquipment[] {
    // Determine rarity based on CR
    let rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    let itemCount: number;

    if (cr < 2) {
        // Easy enemies: common items, 0-1 items
        rarity = 'common';
        itemCount = rng.random() > 0.7 ? 1 : 0;
    } else if (cr < 5) {
        // Medium enemies: common/uncommon, 1-2 items
        rarity = rng.random() > 0.5 ? 'uncommon' : 'common';
        itemCount = Math.floor(rng.random() * 2) + 1;
    } else if (cr < 10) {
        // Hard enemies: uncommon/rare, 1-2 items
        rarity = rng.random() > 0.6 ? 'rare' : 'uncommon';
        itemCount = Math.floor(rng.random() * 2) + 1;
    } else if (cr < 15) {
        // Boss: rare/very rare, 2-3 items
        rarity = rng.random() > 0.5 ? 'very_rare' : 'rare';
        itemCount = Math.floor(rng.random() * 2) + 2;
    } else {
        // Epic boss: very rare/legendary, 3-4 items
        rarity = rng.random() > 0.7 ? 'legendary' : 'very_rare';
        itemCount = Math.floor(rng.random() * 2) + 3;
    }

    const loot = EquipmentSpawnHelper.spawnByRarity(rarity, itemCount, rng);

    console.log(`Defeated CR ${cr} enemy! Found ${loot.length} items of ${rarity} rarity:`);
    loot.forEach(item => console.log(`  - ${item.name}`));

    return loot;
}

// ============================================================
// DEMO 3: Spawn Treasure Hoards
// ============================================================

/**
 * Generate a dragon's treasure hoard
 */
export function spawnDragonHoard(dragonCR: number): void {
    const rng = new SeededRNG(`dragon_hoard_${dragonCR}`);
    const hoard = EquipmentSpawnHelper.spawnTreasureHoard(dragonCR, rng);

    console.log(`\n=== Dragon Hoard (CR ${dragonCR}) ===`);
    console.log(`Found ${hoard.items.length} items:`);
    hoard.items.forEach(item => {
        console.log(`  - ${item.name} (${item.rarity})`);
    });
    console.log(`Estimated value: ${hoard.totalValue} gold pieces`);
    console.log('=================================\n');
}

// ============================================================
// DEMO 4: Spawn by Tags (Thematic Loot)
// ============================================================

/**
 * Generate fire-themed loot for a fire dungeon
 */
export function spawnFireDungeonLoot(count: number, rng: SeededRNG): EnhancedEquipment[] {
    const loot = EquipmentSpawnHelper.spawnByTags(
        ['fire', 'flame', 'burning'],
        count,
        rng,
        {
            excludeZeroWeight: true,
            minRarity: 'uncommon'
        }
    );

    console.log(`\n=== Fire Dungeon Loot ===`);
    loot.forEach(item => console.log(`  - ${item.name}`));
    console.log('========================\n');

    return loot;
}

/**
 * Generate frost-themed loot for an ice cave
 */
export function spawnIceCaveLoot(count: number, rng: SeededRNG): EnhancedEquipment[] {
    const loot = EquipmentSpawnHelper.spawnByTags(
        ['frost', 'ice', 'cold', 'winter'],
        count,
        rng,
        {
            excludeZeroWeight: true,
            minRarity: 'uncommon'
        }
    );

    console.log(`\n=== Ice Cave Loot ===`);
    loot.forEach(item => console.log(`  - ${item.name}`));
    console.log('=====================\n');

    return loot;
}

/**
 * Generate necromancer's loot
 */
export function spawnNecromancerLoot(count: number, rng: SeededRNG): EnhancedEquipment[] {
    const loot = EquipmentSpawnHelper.spawnByTags(
        ['necrotic', 'death', 'undead', 'cursed', 'dark'],
        count,
        rng,
        {
            excludeZeroWeight: false, // Include game-only items
            minRarity: 'rare'
        }
    );

    console.log('\n=== Necromancer\'s Loot ===');
    loot.forEach(item => console.log(`  - ${item.name}`));
    console.log('=========================\n');

    return loot;
}

// ============================================================
// DEMO 5: Spawn Random Loot with Filters
// ============================================================

/**
 * Generate random weapon loot
 */
export function spawnRandomWeapons(count: number, rng: SeededRNG): EnhancedEquipment[] {
    const weapons = EquipmentSpawnHelper.spawnRandom(
        count,
        rng,
        {
            includeTypes: ['weapon'],
            minRarity: 'common',
            maxRarity: 'rare'
        }
    );

    console.log(`\n=== Random Weapons ===`);
    weapons.forEach(w => console.log(`  - ${w.name} (${w.rarity})`));
    console.log('======================\n');

    return weapons;
}

/**
 * Generate random armor loot
 */
export function spawnRandomArmor(count: number, rng: SeededRNG): EnhancedEquipment[] {
    const armor = EquipmentSpawnHelper.spawnRandom(
        count,
        rng,
        {
            includeTypes: ['armor'],
            minRarity: 'uncommon',
            maxRarity: 'very_rare'
        }
    );

    console.log(`\n=== Random Armor ===`);
    armor.forEach(a => console.log(`  - ${a.name} (${a.rarity})`));
    console.log('====================\n');

    return armor;
}

/**
 * Generate high-level loot for endgame
 */
export function spawnEndgameLoot(count: number, rng: SeededRNG): EnhancedEquipment[] {
    const loot = EquipmentSpawnHelper.spawnRandom(
        count,
        rng,
        {
            minRarity: 'rare',
            excludeZeroWeight: true
        }
    );

    console.log(`\n=== Endgame Loot ===`);
    loot.forEach(item => console.log(`  - ${item.name} (${item.rarity})`));
    console.log('===================\n');

    return loot;
}

// ============================================================
// DEMO 6: Shop Inventory System
// ============================================================

/**
 * Generate a merchant's inventory
 */
export function generateMerchantInventory(
    merchantType: 'weaponsmith' | 'armorer' | 'magic_shop' | 'general',
    rng: SeededRNG
): EnhancedEquipment[] {
    let inventory: EnhancedEquipment[] = [];

    switch (merchantType) {
        case 'weaponsmith':
            inventory = EquipmentSpawnHelper.spawnRandom(
                15,
                rng,
                {
                    includeTypes: ['weapon'],
                    maxRarity: 'uncommon'
                }
            );
            break;

        case 'armorer':
            inventory = EquipmentSpawnHelper.spawnRandom(
                10,
                rng,
                {
                    includeTypes: ['armor'],
                    maxRarity: 'rare'
                }
            );
            break;

        case 'magic_shop':
            // Mix of everything, higher rarity
            inventory = [
                ...EquipmentSpawnHelper.spawnByTags(['magic'], 8, rng, {
                    minRarity: 'uncommon',
                    maxRarity: 'very_rare'
                }),
                ...EquipmentSpawnHelper.spawnByTags(['potion', 'scroll', 'consumable'], 5, rng)
            ];
            break;

        case 'general':
            // Low-value items, mostly gear
            inventory = [
                ...EquipmentSpawnHelper.spawnByTags(['gear', 'tool', 'container'], 10, rng),
                ...EquipmentSpawnHelper.spawnByRarity('common', 5, rng)
            ];
            break;
    }

    console.log(`\n=== ${merchantType.charAt(0).toUpperCase() + merchantType.slice(1)} Inventory ===`);
    console.log(`${inventory.length} items available:`);
    inventory.forEach(item => {
        const price = estimatePrice(item);
        console.log(`  - ${item.name}: ${price} gp`);
    });
    console.log('=====================================\n');

    return inventory;
}

/**
 * Estimate price of an item based on rarity
 */
function estimatePrice(item: EnhancedEquipment): number {
    const basePrices: Record<string, number> = {
        'common': 50,
        'uncommon': 400,
        'rare': 4000,
        'very_rare': 40000,
        'legendary': 200000
    };

    let price = basePrices[item.rarity] || 50;

    // Adjust for weight
    if (item.weight > 20) price *= 1.1;

    return Math.round(price);
}

// ============================================================
// DEMO 7: Quest Rewards
// ============================================================

/**
 * Generate quest reward based on quest difficulty
 */
export function generateQuestReward(
    questDifficulty: 'easy' | 'medium' | 'hard' | 'epic',
    rng: SeededRNG
): EnhancedEquipment[] {
    const rewardConfig = {
        easy: { minRarity: 'common' as const, maxRarity: 'uncommon' as const, count: 1 },
        medium: { minRarity: 'uncommon' as const, maxRarity: 'rare' as const, count: 2 },
        hard: { minRarity: 'rare' as const, maxRarity: 'very_rare' as const, count: 2 },
        epic: { minRarity: 'very_rare' as const, maxRarity: 'legendary' as const, count: 3 }
    };

    const config = rewardConfig[questDifficulty];
    const rewards = EquipmentSpawnHelper.spawnRandom(
        config.count,
        rng,
        {
            minRarity: config.minRarity,
            maxRarity: config.maxRarity,
            excludeZeroWeight: true
        }
    );

    console.log(`\n=== Quest Reward (${questDifficulty}) ===`);
    rewards.forEach(item => console.log(`  - ${item.name}`));
    console.log('===================================\n');

    return rewards;
}

// ============================================================
// DEMO 8: Dungeon Loot Tables
// ============================================================

/**
 * Generate loot for a specific dungeon level
 */
export function generateDungeonLoot(dungeonLevel: number, rng: SeededRNG): EnhancedEquipment[] {
    // Determine loot quality based on dungeon level (1-10)
    let minRarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' = 'common';
    let maxRarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' = 'common';
    let itemCount: number;

    if (dungeonLevel <= 2) {
        minRarity = 'common';
        maxRarity = 'uncommon';
        itemCount = Math.floor(rng.random() * 3) + 1;
    } else if (dungeonLevel <= 5) {
        minRarity = 'common';
        maxRarity = 'rare';
        itemCount = Math.floor(rng.random() * 3) + 2;
    } else if (dungeonLevel <= 8) {
        minRarity = 'uncommon';
        maxRarity = 'rare';
        itemCount = Math.floor(rng.random() * 4) + 2;
    } else {
        minRarity = 'rare';
        maxRarity = 'very_rare';
        itemCount = Math.floor(rng.random() * 4) + 3;
    }

    const loot = EquipmentSpawnHelper.spawnRandom(
        itemCount,
        rng,
        {
            minRarity,
            maxRarity,
            excludeZeroWeight: true
        }
    );

    console.log(`\n=== Dungeon Level ${dungeonLevel} Loot ===`);
    loot.forEach(item => console.log(`  - ${item.name} (${item.rarity})`));
    console.log('===================================\n');

    return loot;
}

// ============================================================
// DEMO 9: Template-Based Spawning
// ============================================================

/**
 * Spawn magic weapons from templates
 */
export function spawnMagicWeaponsFromTemplates(count: number): EnhancedEquipment[] {
    const rng = new SeededRNG('template_weapons');
    const templates = [
        'flaming_weapon_template',
        'plus_one_weapon',
        'frost_weapon_template',
        'shocking_weapon_template'
    ];

    const weapons: EnhancedEquipment[] = [];

    for (let i = 0; i < count; i++) {
        const templateId = templates[Math.floor(rng.random() * templates.length)];
        const baseWeapon = rng.random() > 0.5 ? 'Longsword' : 'Greataxe';

        const weapon = EquipmentSpawnHelper.spawnFromTemplate(templateId, baseWeapon);

        if (weapon) {
            weapons.push(weapon);
            console.log(`  - ${weapon.name}`);
        }
    }

    return weapons;
}

// ============================================================
// DEMO 10: Complete Loot Generation Flow
// ============================================================

/**
 * Complete example: Generate loot for an entire dungeon
 */
export function generateDungeonLoot(dungeonLevels: number): void {
    // Note: Using different RNG per level below

    console.log('\n========================================');
    console.log(`  Generating loot for ${dungeonLevels}-level dungeon`);
    console.log('========================================\n');

    const totalLoot: EnhancedEquipment[] = [];

    // Generate loot for each level
    for (let level = 1; level <= dungeonLevels; level++) {
        const levelRNG = new SeededRNG(`dungeon_${level}`);
        const levelLoot = generateDungeonLoot(level, levelRNG);
        totalLoot.push(...levelLoot);
    }

    // Boss loot at the end
    const bossRNG = new SeededRNG('dungeon_boss');
    const bossLoot = spawnEnemyLoot(dungeonLevels + 2, bossRNG);
    totalLoot.push(...bossLoot);

    // Summary
    console.log('\n========================================');
    console.log('  DUNGEON LOOT SUMMARY');
    console.log('========================================');
    console.log(`Total items: ${totalLoot.length}`);

    const byRarity = totalLoot.reduce((acc, item) => {
        acc[item.rarity] = (acc[item.rarity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(byRarity).forEach(([rarity, count]) => {
        console.log(`  ${rarity}: ${count}`);
    });

    console.log('========================================\n');
}

// ============================================================
// Export Functions for Demo Execution
// ============================================================

/**
 * Run all spawning demos
 */
export function runAllSpawningDemos(): void {
    console.log('Running Equipment Batch Spawning Demos...\n');

    // Demo 1: Starter gear
    console.log('=== Demo 1: Starter Gear ===');
    const fighterGear = spawnStarterGear('Fighter');
    console.log(`Fighter starts with ${fighterGear.length} items:`);
    fighterGear.forEach(item => console.log(`  - ${item.name}`));

    // Demo 2: Enemy loot
    console.log('\n=== Demo 2: Enemy Loot ===');
    spawnEnemyLoot(5, new SeededRNG('enemy_loot'));

    // Demo 3: Dragon hoard
    console.log('\n=== Demo 3: Dragon Hoard ===');
    spawnDragonHoard(15);

    // Demo 4: Thematic loot
    console.log('\n=== Demo 4: Fire Dungeon Loot ===');
    spawnFireDungeonLoot(3, new SeededRNG('fire_dungeon'));

    // Demo 5: Random loot
    console.log('\n=== Demo 5: Random Weapons ===');
    spawnRandomWeapons(5, new SeededRNG('random_weapons'));

    // Demo 6: Shop inventory
    console.log('\n=== Demo 6: Magic Shop Inventory ===');
    generateMerchantInventory('magic_shop', new SeededRNG('magic_shop'));

    // Demo 7: Quest rewards
    console.log('\n=== Demo 7: Quest Rewards ===');
    generateQuestReward('epic', new SeededRNG('epic_quest'));

    // Demo 8: Dungeon loot
    console.log('\n=== Demo 8: Complete Dungeon Loot ===');
    generateDungeonLoot(5);

    console.log('\nAll spawning demos complete!');
}

/**
 * Run a quick demo showing the most common use cases
 */
export function runQuickDemo(): void {
    console.log('\n=== QUICK SPAWNING DEMO ===\n');

    const rng = new SeededRNG('quick_demo');

    // Spawn starter gear
    console.log('1. Spawning starter gear for Fighter...');
    const gear = spawnStarterGear('Fighter');
    console.log(`   Got ${gear.length} items\n`);

    // Spawn some random loot
    console.log('2. Spawning 3 random uncommon items...');
    const loot = EquipmentSpawnHelper.spawnByRarity('uncommon', 3, rng);
    loot.forEach(item => console.log(`   - ${item.name}`));
    console.log('');

    // Spawn a small treasure hoard
    console.log('3. Spawning treasure hoard (CR 5)...');
    const hoard = EquipmentSpawnHelper.spawnTreasureHoard(5, rng);
    console.log(`   Found ${hoard.items.length} items worth ~${hoard.totalValue} gp\n`);

    console.log('=== QUICK DEMO COMPLETE ===\n');
}
