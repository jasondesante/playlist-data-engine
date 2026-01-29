/**
 * EquipmentGenerator - Manages equipment assignment, inventory, and equipped items
 *
 * Supports extensibility through ExtensionManager for custom equipment.
 * All equipment lookups check both default and custom equipment databases.
 */

import type { Class } from '../types/Character.js';
import { CLASS_STARTING_EQUIPMENT, EQUIPMENT_DATABASE } from '../../utils/constants.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ensureEquipmentDefaultsInitialized } from '../extensions/initializeDefaults.js';

/**
 * Equipment data interface
 */
export interface Equipment {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;
}

/**
 * Inventory item with quantity
 */
export interface InventoryItem {
  name: string;
  quantity: number;
  equipped: boolean;
}

/**
 * Character equipment state
 */
export interface CharacterEquipment {
  weapons: InventoryItem[];
  armor: InventoryItem[];
  items: InventoryItem[];
  totalWeight: number;
  equippedWeight: number;
}

export class EquipmentGenerator {
  /**
   * Ensure equipment defaults are initialized
   * Safe to call multiple times
   */
  private static ensureInitialized(): void {
    ensureEquipmentDefaultsInitialized();
  }

  /**
   * Get equipment data from extended database (defaults + custom)
   *
   * @param itemName - Name of the equipment to look up
   * @returns Equipment data or undefined if not found
   */
  private static getEquipmentData(itemName: string): Equipment | undefined {
    const manager = ExtensionManager.getInstance();

    // Get all equipment (defaults + custom)
    const allEquipment = manager.get('equipment');

    // Find equipment by name
    return allEquipment.find((eq: Equipment) => eq.name === itemName);
  }

  /**
   * Get all equipment names from extended database
   *
   * @returns Array of all equipment names
   */
  private static getAllEquipmentNames(): string[] {
    const manager = ExtensionManager.getInstance();
    const allEquipment = manager.get('equipment');
    return allEquipment.map((eq: Equipment) => eq.name);
  }

  /**
   * Check if equipment exists in extended database
   *
   * @param itemName - Name of the equipment to check
   * @returns true if equipment exists
   */
  private static hasEquipment(itemName: string): boolean {
    return this.getEquipmentData(itemName) !== undefined;
  }

  /**
   * Get starting equipment for a class
   *
   * @param characterClass - The character's class
   * @returns Object with weapons, armor, and items arrays
   */
  static getStartingEquipment(characterClass: Class): {
    weapons: string[];
    armor: string[];
    items: string[];
  } {
    this.ensureInitialized();

    const equipment = CLASS_STARTING_EQUIPMENT[characterClass];
    if (!equipment) {
      return { weapons: [], armor: [], items: [] };
    }

    return {
      weapons: [...equipment.weapons],
      armor: [...equipment.armor],
      items: [...equipment.items],
    };
  }

  /**
   * Initialize complete equipment for a character
   *
   * @param characterClass - The character's class
   * @returns CharacterEquipment with starting gear in inventory
   */
  static initializeEquipment(characterClass: Class): CharacterEquipment {
    this.ensureInitialized();

    const startingEquipment = this.getStartingEquipment(characterClass);

    const weapons: InventoryItem[] = [];
    const armor: InventoryItem[] = [];
    const items: InventoryItem[] = [];

    // Add weapons
    for (const weaponName of startingEquipment.weapons) {
      const existing = weapons.find((w) => w.name === weaponName);
      if (existing) {
        existing.quantity += 1;
      } else {
        weapons.push({ name: weaponName, quantity: 1, equipped: false });
      }
    }

    // Add armor
    for (const armorName of startingEquipment.armor) {
      const existing = armor.find((a) => a.name === armorName);
      if (existing) {
        existing.quantity += 1;
      } else {
        armor.push({ name: armorName, quantity: 1, equipped: false });
      }
    }

    // Add items
    for (const itemName of startingEquipment.items) {
      const existing = items.find((i) => i.name === itemName);
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({ name: itemName, quantity: 1, equipped: false });
      }
    }

    // Handle ammunition items (add programmatically based on class weapons)
    const ammoType = this.getAmmunitionType(characterClass, startingEquipment.weapons);
    if (ammoType) {
      const quantity = this.getAmmunitionQuantity(characterClass);
      const existing = items.find((i) => i.name === ammoType);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({ name: ammoType, quantity, equipped: false });
      }
    }

    // Equip primary weapon and armor
    if (weapons.length > 0) {
      weapons[0].equipped = true;
    }
    if (armor.length > 0) {
      armor[0].equipped = true;
    }

    return {
      weapons,
      armor,
      items,
      totalWeight: this.calculateTotalWeight(weapons, armor, items),
      equippedWeight: this.calculateEquippedWeight(weapons, armor, items),
    };
  }

  /**
   * Add an item to inventory
   *
   * @param equipment - Current equipment state
   * @param itemName - Name of item to add
   * @param quantity - Quantity to add (default: 1)
   * @returns Updated equipment with new item
   */
  static addItem(
    equipment: CharacterEquipment,
    itemName: string,
    quantity: number = 1
  ): CharacterEquipment {
    this.ensureInitialized();

    const equipData = this.getEquipmentData(itemName);
    if (!equipData) {
      return equipment;
    }

    const updated = this.cloneEquipment(equipment);
    let inventory: InventoryItem[];

    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    const existing = inventory.find((i) => i.name === itemName);
    if (existing) {
      existing.quantity += quantity;
    } else {
      inventory.push({ name: itemName, quantity, equipped: false });
    }

    updated.totalWeight = this.calculateTotalWeight(
      updated.weapons,
      updated.armor,
      updated.items
    );
    updated.equippedWeight = this.calculateEquippedWeight(
      updated.weapons,
      updated.armor,
      updated.items
    );

    return updated;
  }

  /**
   * Remove an item from inventory
   *
   * @param equipment - Current equipment state
   * @param itemName - Name of item to remove
   * @param quantity - Quantity to remove (default: 1)
   * @returns Updated equipment with item removed
   */
  static removeItem(
    equipment: CharacterEquipment,
    itemName: string,
    quantity: number = 1
  ): CharacterEquipment {
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    let inventory: InventoryItem[];

    const equipData = this.getEquipmentData(itemName);
    if (!equipData) {
      return equipment;
    }

    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    const index = inventory.findIndex((i) => i.name === itemName);
    if (index !== -1) {
      if (inventory[index].quantity > quantity) {
        inventory[index].quantity -= quantity;
      } else {
        inventory.splice(index, 1);
      }
    }

    updated.totalWeight = this.calculateTotalWeight(
      updated.weapons,
      updated.armor,
      updated.items
    );
    updated.equippedWeight = this.calculateEquippedWeight(
      updated.weapons,
      updated.armor,
      updated.items
    );

    return updated;
  }

  /**
   * Equip an item from inventory
   *
   * @param equipment - Current equipment state
   * @param itemName - Name of item to equip
   * @returns Updated equipment with item equipped
   */
  static equipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment {
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    const equipData = this.getEquipmentData(itemName);

    if (!equipData) {
      return equipment;
    }

    let inventory: InventoryItem[];

    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    // Find the item and mark as equipped
    const item = inventory.find((i) => i.name === itemName);
    if (item && item.quantity > 0) {
      item.equipped = true;
    }

    updated.equippedWeight = this.calculateEquippedWeight(
      updated.weapons,
      updated.armor,
      updated.items
    );

    return updated;
  }

  /**
   * Unequip an item
   *
   * @param equipment - Current equipment state
   * @param itemName - Name of item to unequip
   * @returns Updated equipment with item unequipped
   */
  static unequipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment {
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    const equipData = this.getEquipmentData(itemName);

    if (!equipData) {
      return equipment;
    }

    let inventory: InventoryItem[];

    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    // Find the item and mark as unequipped
    const item = inventory.find((i) => i.name === itemName);
    if (item) {
      item.equipped = false;
    }

    updated.equippedWeight = this.calculateEquippedWeight(
      updated.weapons,
      updated.armor,
      updated.items
    );

    return updated;
  }

  /**
   * Get inventory as flattened list
   *
   * @param equipment - Current equipment state
   * @returns Array of all inventory items
   */
  static getInventoryList(equipment: CharacterEquipment): InventoryItem[] {
    return [...equipment.weapons, ...equipment.armor, ...equipment.items];
  }

  /**
   * Calculate total weight of all equipment
   *
   * @param weapons - Weapon inventory
   * @param armor - Armor inventory
   * @param items - Item inventory
   * @returns Total weight in pounds
   */
  private static calculateTotalWeight(
    weapons: InventoryItem[],
    armor: InventoryItem[],
    items: InventoryItem[]
  ): number {
    let total = 0;

    for (const weapon of weapons) {
      const data = this.getEquipmentData(weapon.name);
      if (data) {
        total += data.weight * weapon.quantity;
      }
    }

    for (const arm of armor) {
      const data = this.getEquipmentData(arm.name);
      if (data) {
        total += data.weight * arm.quantity;
      }
    }

    for (const item of items) {
      const data = this.getEquipmentData(item.name);
      if (data) {
        total += data.weight * item.quantity;
      }
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Calculate weight of equipped items only
   *
   * @param weapons - Weapon inventory
   * @param armor - Armor inventory
   * @param items - Item inventory
   * @returns Total equipped weight in pounds
   */
  private static calculateEquippedWeight(
    weapons: InventoryItem[],
    armor: InventoryItem[],
    items: InventoryItem[]
  ): number {
    let total = 0;

    for (const weapon of weapons) {
      if (weapon.equipped) {
        const data = this.getEquipmentData(weapon.name);
        if (data) {
          total += data.weight;
        }
      }
    }

    for (const arm of armor) {
      if (arm.equipped) {
        const data = this.getEquipmentData(arm.name);
        if (data) {
          total += data.weight;
        }
      }
    }

    for (const item of items) {
      if (item.equipped) {
        const data = this.getEquipmentData(item.name);
        if (data) {
          total += data.weight;
        }
      }
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Create a deep clone of equipment state
   *
   * @param equipment - Equipment to clone
   * @returns Cloned equipment
   */
  private static cloneEquipment(equipment: CharacterEquipment): CharacterEquipment {
    return {
      weapons: equipment.weapons.map((w) => ({ ...w })),
      armor: equipment.armor.map((a) => ({ ...a })),
      items: equipment.items.map((i) => ({ ...i })),
      totalWeight: equipment.totalWeight,
      equippedWeight: equipment.equippedWeight,
    };
  }

  /**
   * Get the type of ammunition a class uses based on their starting weapons
   *
   * @param characterClass - The character's class
   * @param weapons - Array of weapon names the class starts with
   * @returns Ammunition type ('Arrow', 'Bolt', etc.) or null if not applicable
   */
  private static getAmmunitionType(characterClass: Class, weapons: string[]): string | null {
    // Check if class has weapons that require ammunition
    const hasLongbow = weapons.some(w => w === 'Longbow');
    const hasShortbow = weapons.some(w => w === 'Shortbow');  // If added later
    const hasLightCrossbow = weapons.some(w => w === 'Light Crossbow');
    const hasHandCrossbow = weapons.some(w => w === 'Hand Crossbow');

    if (hasLongbow || hasShortbow) {
      return 'Arrow';
    }
    if (hasLightCrossbow || hasHandCrossbow) {
      return 'Bolt';
    }
    return null;
  }

  /**
   * Get the quantity of ammunition a class starts with
   *
   * @param characterClass - The character's class
   * @returns Number of ammunition items
   */
  private static getAmmunitionQuantity(characterClass: Class): number {
    // Standard ammunition quantities by class
    const ammunitionQuantities: Record<string, number> = {
      'Ranger': 20,       // Rangers get 20 arrows
      'Fighter': 20,      // Fighters get 20 if they have a bow
      'Rogue': 20,        // Rogues get 20 if they have a crossbow
    };

    return ammunitionQuantities[characterClass] || 0;
  }
}
