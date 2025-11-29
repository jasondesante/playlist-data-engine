/**
 * EquipmentGenerator - Manages equipment assignment, inventory, and equipped items
 */

import type { Class } from '../types/Character.js';
import { CLASS_STARTING_EQUIPMENT, EQUIPMENT_DATABASE } from '../../utils/constants.js';

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
    const equipData = EQUIPMENT_DATABASE[itemName];
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
    const updated = this.cloneEquipment(equipment);
    let inventory: InventoryItem[];

    const equipData = EQUIPMENT_DATABASE[itemName];
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
    const updated = this.cloneEquipment(equipment);
    const equipData = EQUIPMENT_DATABASE[itemName];

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
    const updated = this.cloneEquipment(equipment);
    const equipData = EQUIPMENT_DATABASE[itemName];

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
      const data = EQUIPMENT_DATABASE[weapon.name];
      if (data) {
        total += data.weight * weapon.quantity;
      }
    }

    for (const arm of armor) {
      const data = EQUIPMENT_DATABASE[arm.name];
      if (data) {
        total += data.weight * arm.quantity;
      }
    }

    for (const item of items) {
      const data = EQUIPMENT_DATABASE[item.name];
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
        const data = EQUIPMENT_DATABASE[weapon.name];
        if (data) {
          total += data.weight;
        }
      }
    }

    for (const arm of armor) {
      if (arm.equipped) {
        const data = EQUIPMENT_DATABASE[arm.name];
        if (data) {
          total += data.weight;
        }
      }
    }

    for (const item of items) {
      if (item.equipped) {
        const data = EQUIPMENT_DATABASE[item.name];
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
}
