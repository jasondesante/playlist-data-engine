/**
 * EquipmentGenerator - Manages equipment assignment, inventory, and equipped items
 *
 * Supports extensibility through ExtensionManager for custom equipment.
 * All equipment lookups check both default and custom equipment databases.
 *
 * Enhanced to support equipment properties, effects, modifications, and D&D 5e stats.
 * Part of Phase 4: Update EquipmentGenerator for Equipment Upgrade Plan Part 2.
 */

import type { Class, CharacterSheet } from '../types/Character.js';
import { CLASS_STARTING_EQUIPMENT, EQUIPMENT_DATABASE, getClassStartingEquipment } from '../../utils/constants.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ensureEquipmentDefaultsInitialized } from '../extensions/initializeDefaults.js';
import type {
    CharacterEquipment,
    EnhancedEquipment,
    EnhancedInventoryItem,
    EquipmentProperty,
    EquipmentModification
} from '../types/Equipment.js';
import { EquipmentEffectApplier } from '../equipment/EquipmentEffectApplier.js';

/**
 * Basic equipment data interface (for backward compatibility)
 */
export interface Equipment {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;
}

/**
 * Inventory item with quantity (basic version, for backward compatibility)
 */
export interface InventoryItem {
  name: string;
  quantity: number;
  equipped: boolean;
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
   * Public static method for external access.
   *
   * @param itemName - Name of the equipment to look up
   * @returns EnhancedEquipment data or undefined if not found
   */
  static getEquipmentDataStatic(itemName: string): EnhancedEquipment | undefined {
    return EquipmentGenerator.getEquipmentData(itemName);
  }

  /**
   * Get equipment data from extended database (defaults + custom)
   *
   * @param itemName - Name of the equipment to look up
   * @returns EnhancedEquipment data or undefined if not found
   */
  private static getEquipmentData(itemName: string): EnhancedEquipment | undefined {
    const manager = ExtensionManager.getInstance();

    // Get all equipment (defaults + custom)
    const allEquipment = manager.get('equipment');

    // Find equipment by name (as EnhancedEquipment)
    return allEquipment.find((eq: EnhancedEquipment) => eq.name === itemName);
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
   * Supports custom classes registered via the 'classStartingEquipment.${ClassName}' category in ExtensionManager.
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

    // Try to get equipment via helper function (checks default + classStartingEquipment.${ClassName})
    const equipment = getClassStartingEquipment(characterClass);

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

    const weapons: EnhancedInventoryItem[] = [];
    const armor: EnhancedInventoryItem[] = [];
    const items: EnhancedInventoryItem[] = [];

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
    let inventory: EnhancedInventoryItem[];

    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    const existing = inventory.find((i) => i.name === itemName);
    if (existing) {
      // For existing items, negative or zero quantity is a no-op
      if (quantity > 0) {
        existing.quantity += quantity;
      }
      // If quantity <= 0, don't change anything (no-op)
    } else {
      // For new items, allow zero quantity but negative is treated as 0
      inventory.push({ name: itemName, quantity: Math.max(0, quantity), equipped: false });
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

    // Handle invalid quantities as no-ops (zero or negative)
    if (quantity <= 0) {
      return equipment;
    }

    const updated = this.cloneEquipment(equipment);
    let inventory: EnhancedInventoryItem[];

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
   * @param character - Optional character to apply equipment effects to
   * @returns Updated equipment with item equipped
   */
  static equipItem(
    equipment: CharacterEquipment,
    itemName: string,
    character?: CharacterSheet
  ): CharacterEquipment {
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    const equipData = this.getEquipmentData(itemName);

    if (!equipData) {
      return equipment;
    }

    let inventory: EnhancedInventoryItem[];

    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    // Find the item and mark as equipped
    const item = inventory.find((i) => i.name === itemName);
    if (item) {
      item.equipped = true;

      // Apply equipment effects if character provided
      if (character) {
        const instanceId = item.instanceId;
        EquipmentEffectApplier.equipItem(character, equipData, instanceId);
      }
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
   * @param character - Optional character to remove equipment effects from
   * @returns Updated equipment with item unequipped
   */
  static unequipItem(
    equipment: CharacterEquipment,
    itemName: string,
    character?: CharacterSheet
  ): CharacterEquipment {
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    const equipData = this.getEquipmentData(itemName);

    if (!equipData) {
      return equipment;
    }

    let inventory: EnhancedInventoryItem[];

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

      // Remove equipment effects if character provided
      if (character) {
        const instanceId = item.instanceId;
        EquipmentEffectApplier.unequipItem(character, itemName, instanceId);
      }
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
  static getInventoryList(equipment: CharacterEquipment): EnhancedInventoryItem[] {
    return [...equipment.weapons, ...equipment.armor, ...equipment.items];
  }

  /**
   * Get equipment by type
   *
   * Utility method to retrieve a specific equipment category (weapons, armor, or items)
   * from a CharacterEquipment object.
   *
   * @param equipment - Current equipment state
   * @param type - Equipment category to retrieve
   * @returns Array of inventory items for the specified type
   */
  static getEquipmentByType(
    equipment: CharacterEquipment,
    type: 'weapons' | 'armor' | 'items'
  ): EnhancedInventoryItem[] {
    return equipment[type];
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
    weapons: EnhancedInventoryItem[],
    armor: EnhancedInventoryItem[],
    items: EnhancedInventoryItem[]
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
    weapons: EnhancedInventoryItem[],
    armor: EnhancedInventoryItem[],
    items: EnhancedInventoryItem[]
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

  // ==========================================
  // EQUIPMENT MODIFICATION METHODS (Phase 4)
  // ==========================================

  /**
   * Add a modification to an equipment item (per-instance)
   *
   * @param equipment - Current equipment state
   * @param itemName - Name of the item to modify
   * @param modification - The modification to apply
   * @param instanceId - Optional instance ID (for multi-item tracking)
   * @param character - Optional character to reapply effects to
   * @returns Updated equipment with modification applied
   */
  static addModification(
    equipment: CharacterEquipment,
    itemName: string,
    modification: EquipmentModification,
    instanceId?: string,
    character?: CharacterSheet
  ): CharacterEquipment {
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    const equipData = this.getEquipmentData(itemName);

    if (!equipData) {
      return equipment;
    }

    let inventory: EnhancedInventoryItem[];
    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    // Find the item to modify
    const item = inventory.find((i) => i.name === itemName);
    if (!item) {
      return equipment;
    }

    // Initialize modifications array if needed
    if (!item.modifications) {
      item.modifications = [];
    }

    // Generate instance ID if not provided
    if (!instanceId && !item.instanceId) {
      item.instanceId = `${itemName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    const targetInstanceId = instanceId || item.instanceId;

    // Add the modification
    item.modifications.push(modification);

    // If item is equipped and character provided, reapply effects
    if (item.equipped && character) {
      // First remove old effects
      EquipmentEffectApplier.unequipItem(character, itemName, targetInstanceId);
      // Then reapply with new modifications
      this.applyCombinedEffects(character, equipData, modification, targetInstanceId);
    }

    return updated;
  }

  /**
   * Remove a modification from an equipment item
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
    this.ensureInitialized();

    const updated = this.cloneEquipment(equipment);
    const equipData = this.getEquipmentData(itemName);

    if (!equipData) {
      return equipment;
    }

    let inventory: EnhancedInventoryItem[];
    if (equipData.type === 'weapon') {
      inventory = updated.weapons;
    } else if (equipData.type === 'armor') {
      inventory = updated.armor;
    } else {
      inventory = updated.items;
    }

    // Find the item
    const item = inventory.find((i) => i.name === itemName);
    if (!item || !item.modifications) {
      return equipment;
    }

    const wasEquipped = item.equipped;
    const instanceId = item.instanceId;

    // Remove the modification
    const modIndex = item.modifications.findIndex((m) => m.id === modificationId);
    if (modIndex !== -1) {
      item.modifications.splice(modIndex, 1);
    }

    // If item is equipped and character provided, reapply effects
    if (wasEquipped && character) {
      // Remove all effects and reapply base + remaining modifications
      EquipmentEffectApplier.unequipItem(character, itemName, instanceId);
      EquipmentEffectApplier.equipItem(character, equipData, instanceId);

      // Reapply remaining modifications
      if (item.modifications) {
        for (const mod of item.modifications) {
          this.applyCombinedEffects(character, equipData, mod, instanceId);
        }
      }
    }

    return updated;
  }

  /**
   * Get all active effects from an equipment item (base + modifications)
   *
   * @param equipment - Current equipment state
   * @param itemName - Name of the item
   * @param instanceId - Optional instance ID
   * @returns Array of all active equipment properties
   */
  static getActiveEffects(
    equipment: CharacterEquipment,
    itemName: string,
    instanceId?: string
  ): EquipmentProperty[] {
    this.ensureInitialized();

    const equipData = this.getEquipmentData(itemName);
    if (!equipData) {
      return [];
    }

    let inventory: EnhancedInventoryItem[];
    if (equipData.type === 'weapon') {
      inventory = equipment.weapons;
    } else if (equipData.type === 'armor') {
      inventory = equipment.armor;
    } else {
      inventory = equipment.items;
    }

    // Find the item
    const item = inventory.find((i) => i.name === itemName && (!instanceId || i.instanceId === instanceId));
    if (!item) {
      return [];
    }

    // Start with base properties
    const allEffects: EquipmentProperty[] = equipData.properties ? [...equipData.properties] : [];

    // Add modification properties
    if (item.modifications) {
      for (const mod of item.modifications) {
        if (mod.properties) {
          allEffects.push(...mod.properties);
        }
      }
    }

    return allEffects;
  }

  /**
   * Apply combined effects from base equipment and modifications
   *
   * @param character - Character to apply effects to
   * @param baseEquipment - Base equipment data
   * @param modification - Modification to apply
   * @param instanceId - Instance ID for tracking
   */
  private static applyCombinedEffects(
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
}
