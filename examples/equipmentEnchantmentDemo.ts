/**
 * Equipment Enchantment Demo
 *
 * This file demonstrates how to enchant, curse, upgrade, and modify
 * equipment during gameplay using the EquipmentModifier system.
 *
 * Part of Phase 12.1: Create Equipment Enchantment Demo.
 */

import { EquipmentModifier } from '../src/core/generation/EquipmentGenerator.js';
import { CharacterGenerator } from '../src/core/generation/CharacterGenerator.js';
import { SeededRNG } from '../src/utils/random.js';
import type { CharacterSheet } from '../src/core/types/Character.js';
import type { EquipmentModification } from '../src/core/types/Equipment.js';

// ============================================================
// DEMO 1: Basic +1 Weapon Enchantment
// ============================================================

/**
 * Create a +1 magic weapon enchantment
 */
export function createPlusOneEnchantment(weaponName: string): EquipmentModification {
    return {
        id: `plus_one_${weaponName}_${Date.now()}`,
        name: `+1 ${weaponName}`,
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack rolls'
            },
            {
                type: 'passive_modifier',
                target: 'damage_roll',
                value: 1,
                description: '+1 to damage rolls'
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'enchantment'
    };
}

/**
 * Enchant a weapon with +1 bonus
 */
export function enchantWeaponPlusOne(
    character: CharacterSheet,
    weaponName: string
): CharacterSheet {
    const enchantment = createPlusOneEnchantment(weaponName);

    // Get the character's equipment
    const equipment = character.equipment || {
        weapons: [],
        armor: [],
        items: [],
        totalWeight: 0,
        equippedWeight: 0
    };

    // Apply the enchantment
    const updatedEquipment = EquipmentModifier.enchant(
        equipment,
        weaponName,
        enchantment,
        character
    );

    // Update the character
    character.equipment = updatedEquipment;

    console.log(`${weaponName} is now +1!`);

    return character;
}

// ============================================================
// DEMO 2: Progressive Enchantment (+1, +2, +3...)
// ============================================================

/**
 * Track enchantment level for a weapon
 * Enchants weapon progressively: +1 → +2 → +3
 */
export class WeaponEnchanter {
    private enchantmentLevels = new Map<string, number>();

    /**
     * Get current enchantment level of a weapon
     */
    getEnchantmentLevel(weaponName: string): number {
        return this.enchantmentLevels.get(weaponName) || 0;
    }

    /**
     * Upgrade weapon by one enchantment level
     */
    upgradeWeapon(
        character: CharacterSheet,
        weaponName: string
    ): CharacterSheet {
        const currentLevel = this.getEnchantmentLevel(weaponName);
        const newLevel = currentLevel + 1;

        // Remove old enchantment if exists
        if (currentLevel > 0) {
            const oldModId = `${weaponName}_enchantment_${currentLevel}`;
            character.equipment = EquipmentModifier.removeModification(
                character.equipment!,
                weaponName,
                oldModId,
                character
            );
        }

        // Create new enchantment
        const enchantment: EquipmentModification = {
            id: `${weaponName}_enchantment_${newLevel}`,
            name: `+${newLevel} ${weaponName}`,
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: newLevel,
                    description: `+${newLevel} to attack rolls`
                },
                {
                    type: 'passive_modifier',
                    target: 'damage_roll',
                    value: newLevel,
                    description: `+${newLevel} to damage rolls`
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'progressive_enchantment'
        };

        // Apply new enchantment
        character.equipment = EquipmentModifier.enchant(
            character.equipment!,
            weaponName,
            enchantment,
            character
        );

        // Update tracking
        this.enchantmentLevels.set(weaponName, newLevel);

        console.log(`${weaponName} upgraded to +${newLevel}!`);

        return character;
    }

    /**
     * Get upgrade cost for next level (based on current level)
     * Costs: +1 = 100gp, +2 = 500gp, +3 = 2000gp, etc.
     */
    getUpgradeCost(weaponName: string): number {
        const level = this.getEnchantmentLevel(weaponName);
        const costs = [0, 100, 500, 2000, 8000, 20000]; // 0-5
        return costs[level + 1] || 50000 * level;
    }
}

// ============================================================
// DEMO 3: Elemental Enchantments (Fire, Ice, Lightning)
// ============================================================

/**
 * Create flaming weapon enchantment
 */
export function createFlamingEnchantment(): EquipmentModification {
    return {
        id: `flaming_${Date.now()}`,
        name: 'Flaming Enchantment',
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire',
                value: '1d6',
                description: '+1d6 fire damage on hit'
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_20ft',
                description: 'Sheds bright light in a 20ft radius'
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'elemental_enchantment'
    };
}

/**
 * Create frost weapon enchantment
 */
export function createFrostEnchantment(): EquipmentModification {
    return {
        id: `frost_${Date.now()}`,
        name: 'Frost Enchantment',
        properties: [
            {
                type: 'damage_bonus',
                target: 'cold',
                value: '1d6',
                description: '+1d6 cold damage on hit'
            },
            {
                type: 'ability_unlock',
                target: 'cold_resistance',
                value: true,
                description: 'Resistance to cold damage while wielding'
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'elemental_enchantment'
    };
}

/**
 * Create shocking weapon enchantment
 */
export function createShockingEnchantment(): EquipmentModification {
    return {
        id: `shocking_${Date.now()}`,
        name: 'Shocking Enchantment',
        properties: [
            {
                type: 'damage_bonus',
                target: 'lightning',
                value: '1d6',
                description: '+1d6 lightning damage on hit'
            },
            {
                type: 'special_property',
                target: 'chain_lightning',
                value: true,
                description: 'On crit, lightning arcs to nearby enemies'
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'elemental_enchantment'
    };
}

/**
 * Apply elemental enchantment to weapon
 */
export function enchantElementalWeapon(
    character: CharacterSheet,
    weaponName: string,
    element: 'fire' | 'frost' | 'lightning'
): CharacterSheet {
    let enchantment: EquipmentModification;

    switch (element) {
        case 'fire':
            enchantment = createFlamingEnchantment();
            break;
        case 'frost':
            enchantment = createFrostEnchantment();
            break;
        case 'lightning':
            enchantment = createShockingEnchantment();
            break;
    }

    character.equipment = EquipmentModifier.enchant(
        character.equipment!,
        weaponName,
        enchantment,
        character
    );

    console.log(`${weaponName} is now imbued with ${element}!`);

    return character;
}

// ============================================================
// DEMO 4: Curse System
// ============================================================

/**
 * Create a curse that binds item to character
 */
export function createBindingCurse(): EquipmentModification {
    return {
        id: `curse_binding_${Date.now()}`,
        name: 'Binding Curse',
        properties: [
            {
                type: 'special_property',
                target: 'curse',
                value: true,
                description: 'Item cannot be unequipped; curse can only be broken by Remove Curse spell'
            },
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: -1,
                description: '-1 to attack rolls (curse penalty)'
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'curse'
    };
}

/**
 * Curse an item (making it powerful but cursed)
 */
export function curseItem(
    character: CharacterSheet,
    itemName: string,
    curseType: 'binding' | 'pain' | 'feebleness'
): CharacterSheet {
    let curse: EquipmentModification;

    switch (curseType) {
        case 'binding':
            curse = createBindingCurse();
            break;
        case 'pain':
            curse = {
                id: `curse_pain_${Date.now()}`,
                name: 'Curse of Pain',
                properties: [
                    {
                        type: 'damage_bonus',
                        target: 'necrotic',
                        value: '2d6',
                        description: '+2d6 necrotic damage'
                    },
                    {
                        type: 'special_property',
                        target: 'curse',
                        value: true,
                        description: 'Take 1 necrotic damage each time you hit with this weapon'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'curse'
            };
            break;
        case 'feebleness':
            curse = {
                id: `curse_feebleness_${Date.now()}`,
                name: 'Curse of Feebleness',
                properties: [
                    {
                        type: 'stat_bonus',
                        target: 'STR',
                        value: -2,
                        description: '-2 Strength'
                    },
                    {
                        type: 'special_property',
                        target: 'curse',
                        value: true,
                        description: 'Cannot be removed; strength drain is permanent until broken'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'curse'
            };
            break;
    }

    character.equipment = EquipmentModifier.curse(
        character.equipment!,
        itemName,
        curse,
        character
    );

    console.log(`${itemName} has been cursed with ${curseType}!`);

    return character;
}

/**
 * Remove a curse (lift the curse, keep beneficial effects)
 */
export function liftCurse(
    character: CharacterSheet,
    itemName: string,
    curseId: string
): CharacterSheet {
    character.equipment = EquipmentModifier.removeModification(
        character.equipment!,
        itemName,
        curseId,
        character
    );

    console.log(`Curse lifted from ${itemName}!`);

    return character;
}

// ============================================================
// DEMO 5: disenchant (Remove beneficial enchantments, keep curses)
// ============================================================

/**
 * Disenchant an item (remove enchantments, keep any curses)
 * This is the opposite of lifting a curse
 */
export function disenchantItem(
    character: CharacterSheet,
    itemName: string
): CharacterSheet {
    // Get all modifications on the item
    const allModifications = EquipmentModifier.getModificationHistory(
        character.equipment!,
        itemName
    );

    // Filter to only enchantment source (not curses)
    const enchantments = allModifications.filter(m => m.source === 'enchantment');

    // Remove each enchantment
    for (const enchantment of enchantments) {
        character.equipment = EquipmentModifier.removeModification(
            character.equipment!,
            itemName,
            enchantment.id,
            character
        );
    }

    console.log(`${itemName} has been disenchanted!`);

    return character;
}

// ============================================================
// DEMO 6: Template-Based Enchantment
// ============================================================

/**
 * Apply a predefined enchantment template
 */
export function applyEnchantmentTemplate(
    character: CharacterSheet,
    itemName: string,
    templateId: string
): CharacterSheet {
    character.equipment = EquipmentModifier.applyTemplate(
        character.equipment!,
        itemName,
        templateId,
        character
    );

    console.log(`Applied template '${templateId}' to ${itemName}!`);

    return character;
}

// ============================================================
// DEMO 7: Complete Gameplay Example
// ============================================================

/**
 * Complete example of enchanting progression through a game
 * This simulates a player earning upgrade points and enchanting their weapon
 */
export function completeEnchantmentDemo(): void {
    // Create a test character
    const rng = new SeededRNG('enchant_demo');
    const audioProfile = { bass_dominance: 0.5, mid_dominance: 0.3, treble_dominance: 0.2, average_amplitude: 0.5 };
    const character = CharacterGenerator.generate('demo_seed', audioProfile, 'Hero');

    // Silence unused variable warning
    void rng;

    console.log('=== Equipment Enchantment Demo ===\n');

    // 1. Starting equipment
    console.log('1. Starting Equipment:');
    if (character.equipment?.weapons) {
        character.equipment.weapons.forEach(w => {
            console.log(`   - ${w.name}`);
        });
    }

    // 2. Enchant to +1
    console.log('\n2. Enchanting Longsword to +1...');
    const updated1 = enchantWeaponPlusOne(character, 'Longsword');

    // 3. Add fire element
    console.log('\n3. Adding fire element to Longsword...');
    const updated2 = enchantElementalWeapon(updated1, 'Longsword', 'fire');

    // 4. Curse another weapon
    console.log('\n4. Cursing a Dagger...');
    const updated3 = curseItem(updated2, 'Dagger', 'pain');

    // 5. Lift the curse
    console.log('\n5. Attempting to lift curse...');
    // In a real scenario, you'd need the curse ID
    // For demo purposes, we show the disenchant function instead
    disenchantItem(updated3, 'Dagger');

    console.log('\n=== Demo Complete ===');
}

// ============================================================
// DEMO 8: Getting Combined Effects
// ============================================================

/**
 * Get all active effects on an item (base + modifications)
 */
export function getItemCombinedEffects(
    character: CharacterSheet,
    itemName: string
): void {
    const effects = EquipmentModifier.getCombinedEffects(
        character.equipment!,
        itemName
    );

    console.log(`\nEffects on ${itemName}:`);
    effects.forEach(effect => {
        console.log(`  - ${effect.type}: ${effect.target} = ${effect.value}`);
        if (effect.description) {
            console.log(`    (${effect.description})`);
        }
    });

    // Check for template
    const hasFlamingTemplate = EquipmentModifier.hasTemplate(
        character.equipment!,
        itemName,
        'flaming_weapon_template'
    );
    if (hasFlamingTemplate) {
        console.log(`  - Has template: flaming_weapon_template`);
    }
}

// ============================================================
// DEMO 9: Shop/Purchase Enchantment System
// ============================================================

/**
 * Enchantment shop system
 */
export class EnchantmentShop {
    private prices = new Map<string, number>();

    constructor() {
        // Set base prices for enchantments
        this.prices.set('plus_one', 100);
        this.prices.set('plus_two', 500);
        this.prices.set('plus_three', 2000);
        this.prices.set('flaming', 700);
        this.prices.set('frost', 700);
        this.prices.set('shocking', 700);
        this.prices.set('holy', 1000);
        this.prices.set('unholy', 1000);
    }

    /**
     * Get price for an enchantment type
     */
    getPrice(enchantmentType: string): number {
        return this.prices.get(enchantmentType) || 0;
    }

    /**
     * Purchase enchantment (returns modification to apply)
     */
    purchaseEnchantment(
        enchantmentType: string,
        characterGold: number
    ): EquipmentModification | null {
        const price = this.getPrice(enchantmentType);

        if (characterGold < price) {
            console.log(`Not enough gold! Need ${price}, have ${characterGold}`);
            return null;
        }

        // Create the enchantment based on type
        switch (enchantmentType) {
            case 'plus_one':
                return createPlusOneEnchantment('Weapon');
            case 'flaming':
                return createFlamingEnchantment();
            case 'frost':
                return createFrostEnchantment();
            case 'shocking':
                return createShockingEnchantment();
            default:
                console.log(`Unknown enchantment type: ${enchantmentType}`);
                return null;
        }
    }

    /**
     * List available enchantments
     */
    listEnchantments(): void {
        console.log('\n=== Enchantment Shop ===');
        console.log('Available enchantments:');
        this.prices.forEach((price, type) => {
            console.log(`  - ${type}: ${price} gold`);
        });
        console.log('======================\n');
    }
}

// ============================================================
// DEMO 10: Random Enchantment
// ============================================================

/**
 * Apply a random enchantment to an item
 */
export function enchantRandomly(
    character: CharacterSheet,
    itemName: string,
    rng: SeededRNG
): CharacterSheet {
    const enchantments: EquipmentModification[] = [
        createPlusOneEnchantment(itemName),
        createFlamingEnchantment(),
        createFrostEnchantment(),
        createShockingEnchantment()
    ];

    const randomIndex = Math.floor(rng.random() * enchantments.length);
    const selectedEnchantment = enchantments[randomIndex];

    character.equipment = EquipmentModifier.enchant(
        character.equipment!,
        itemName,
        selectedEnchantment,
        character
    );

    console.log(`${itemName} received random enchantment: ${selectedEnchantment.name}!`);

    return character;
}

// ============================================================
// Export Functions for Demo Execution
// ============================================================

/**
 * Run all enchantment demos
 */
export function runAllDemos(): void {
    console.log('Running Equipment Enchantment Demos...\n');

    completeEnchantmentDemo();

    console.log('\n========================================\n');

    // Shop demo
    const shop = new EnchantmentShop();
    shop.listEnchantments();

    console.log('\n========================================\n');

    console.log('Demos complete!');
}
