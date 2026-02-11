/**
 * Item Creation Templates for enchantment
 *
 * These templates can be applied to base equipment to create magic variants.
 * Templates define reusable enchantment patterns that add properties, tags,
 * and effects to base items.
 *
 * Usage: Import `ITEM_CREATION_TEMPLATES` and use template IDs to enchant items.
 * Templates are applied by the EquipmentModifier and can be extended via ExtensionManager.
 *
 * Template types:
 * - Enhancement bonuses: +1, +2, +3 to weapons and armor
 * - Elemental weapons: Flaming, Frost, Shocking
 * - Special effects: Vicious, and other combat enhancements
 *
 * @example
 * ```typescript
 * import { applyTemplate } from '../utils/magicItemExamples.js';
 * import { DEFAULT_EQUIPMENT } from './DefaultEquipment.js';
 * import { ITEM_CREATION_TEMPLATES } from './ItemTemplates.js';
 *
 * const baseSword = DEFAULT_EQUIPMENT['Longsword'];
 * const flamingSword = applyTemplate(baseSword, 'flaming_weapon_template');
 * ```
 */

import type { EnhancedEquipment } from '../core/types/Equipment.js';

/**
 * Item Creation Templates for enchantment
 *
 * These templates can be applied to base equipment to create magic variants.
 * Templates define reusable enchantment patterns that add properties, tags,
 * and effects to base items.
 *
 * Template types:
 * - Enhancement bonuses: +1, +2, +3 to weapons and armor
 * - Elemental weapons: Flaming, Frost, Shocking
 * - Special effects: Vicious, and other combat enhancements
 */
export const ITEM_CREATION_TEMPLATES: Record<string, Partial<EnhancedEquipment>> = {
    /**
     * +1 Weapon Enhancement
     * Adds +1 to attack and damage rolls
     */
    'plus_one_weapon': {
        rarity: 'uncommon',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack and damage rolls',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+1']
    },

    /**
     * +2 Weapon Enhancement
     * Adds +2 to attack and damage rolls
     */
    'plus_two_weapon': {
        rarity: 'rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 2,
                description: '+2 to attack and damage rolls',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+2']
    },

    /**
     * +3 Weapon Enhancement
     * Adds +3 to attack and damage rolls
     */
    'plus_three_weapon': {
        rarity: 'very_rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 3,
                description: '+3 to attack and damage rolls',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+3']
    },

    /**
     * Flaming Weapon Template
     * Adds fire damage and light emission
     */
    'flaming_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire_damage',
                value: '1d6',
                description: '+1d6 fire damage',
                condition: { type: 'on_hit', value: true }
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_20ft',
                description: 'Sheds bright light 20ft, dim 20ft'
            }
        ],
        tags: ['magic', 'fire', 'flaming']
    },

    /**
     * Frost Weapon Template
     * Adds cold damage
     */
    'frost_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'damage_bonus',
                target: 'cold_damage',
                value: '1d6',
                description: '+1d6 cold damage',
                condition: { type: 'on_hit', value: true }
            }
        ],
        tags: ['magic', 'cold', 'frost']
    },

    /**
     * Shocking Weapon Template
     * Adds lightning damage
     */
    'shocking_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'damage_bonus',
                target: 'lightning_damage',
                value: '1d6',
                description: '+1d6 lightning damage',
                condition: { type: 'on_hit', value: true }
            }
        ],
        tags: ['magic', 'lightning', 'shocking']
    },

    /**
     * Vicious Weapon Template
     * Deals extra damage but hurts wielder
     */
    'vicious_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack and damage rolls'
            },
            {
                type: 'damage_bonus',
                target: 'extra_damage_on_hit',
                value: '1d8',
                description: 'Deals 1d8 extra damage, but wielder takes 1d8 necrotic',
                condition: { type: 'on_hit', value: true }
            }
        ],
        tags: ['magic', 'vicious', 'necrotic']
    },

    /**
     * +1 Armor Enhancement
     * Adds +1 AC bonus
     */
    'plus_one_armor': {
        rarity: 'rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 1,
                description: '+1 AC bonus',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+1', 'armor']
    },

    /**
     * +2 Armor Enhancement
     * Adds +2 AC bonus
     */
    'plus_two_armor': {
        rarity: 'very_rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 2,
                description: '+2 AC bonus',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+2', 'armor']
    },
};
