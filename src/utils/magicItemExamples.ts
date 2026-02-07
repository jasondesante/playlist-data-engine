/**
 * Magic Item Helper Functions
 *
 * This file provides helper functions for working with magic items.
 * The actual magic item data and templates have been moved to equipmentConstants.ts.
 *
 * For the magic items collection, import MAGIC_ITEMS from './equipmentConstants.js'
 * For the templates collection, import ITEM_CREATION_TEMPLATES from './equipmentConstants.js'
 *
 * Helper Functions:
 * - getMagicItem(name) - Get a specific magic item by name
 * - getMagicItemsByType(type) - Get all items of a specific type (weapon/armor/item)
 * - getMagicItemsByRarity(rarity) - Get all items of a specific rarity
 * - getCursedItems() - Get all cursed items
 * - getItemsWithProperty(propertyType) - Get all items with a specific property type
 * - applyTemplate(baseEquipment, templateId) - Apply a template to base equipment
 *
 * @module utils/magicItemExamples
 */

import type { EnhancedEquipment } from '../core/types/Equipment.js';
import {
    MAGIC_ITEMS,
    ITEM_CREATION_TEMPLATES
} from './equipmentConstants.js';

/**
 * Helper function to get magic item by name
 */
export function getMagicItem(name: string): EnhancedEquipment | undefined {
    return MAGIC_ITEMS.find(item => item.name === name);
}

/**
 * Helper function to get all items of a specific type
 */
export function getMagicItemsByType(type: 'weapon' | 'armor' | 'item'): EnhancedEquipment[] {
    return MAGIC_ITEMS.filter(item => item.type === type);
}

/**
 * Helper function to get all items of a specific rarity
 */
export function getMagicItemsByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'): EnhancedEquipment[] {
    return MAGIC_ITEMS.filter(item => item.rarity === rarity);
}

/**
 * Helper function to get all cursed items
 */
export function getCursedItems(): EnhancedEquipment[] {
    return MAGIC_ITEMS.filter(item => item.tags?.includes('cursed'));
}

/**
 * Helper function to get all items with a specific property type
 */
export function getItemsWithProperty(propertyType: string): EnhancedEquipment[] {
    return MAGIC_ITEMS.filter(item =>
        item.properties?.some(prop => prop.type === propertyType)
    );
}

/**
 * Helper function to apply a template to base equipment
 */
export function applyTemplate(baseEquipment: EnhancedEquipment, templateId: string): EnhancedEquipment | null {
    const template = ITEM_CREATION_TEMPLATES[templateId];
    if (!template) {
        return null;
    }

    return {
        ...baseEquipment,
        ...template,
        name: `${baseEquipment.name} (${templateId.replace('_', ' ')})`,
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

export default MAGIC_ITEMS;
