/**
 * Enemy Equipment Templates
 *
 * Equipment templates specifically designed for enemy generation.
 * These templates map to equipment in the main DEFAULT_EQUIPMENT database
 * but are organized by archetype and rarity for enemy generation.
 *
 * Equipment selection follows these rules:
 * - Brute: Heavy damage weapons (greataxe, longsword), heavy armor (scale mail, chain mail)
 * - Archer: Ranged weapons (longbow, light crossbow), light armor (leather), backup dagger
 * - Support: Quarterstaff or mace, light armor with shield option
 *
 * Higher rarity enemies receive better equipment from their available pool.
 */

import type { EquipmentTemplate } from '../core/types/Enemy.js';
import type { EnemyArchetype, EnemyRarity } from '../core/types/Enemy.js';

/**
 * Map equipment template to actual equipment name in DEFAULT_EQUIPMENT
 *
 * This is the bridge between enemy equipment templates and the actual
 * equipment database. When generating an enemy, we look up the actual
 * equipment by name.
 */
export const ENEMY_EQUIPMENT_MAPPING: Record<string, string> = {
    // === WEAPONS ===
    'greataxe': 'Greataxe',
    'longsword': 'Longsword',
    'brute-mace': 'Mace',
    'handaxe': 'Handaxe',
    'longbow': 'Longbow',
    'light-crossbow': 'Light Crossbow',
    'shortsword': 'Shortsword',
    'dagger': 'Dagger',
    'quarterstaff': 'Quarterstaff',
    'support-mace': 'Mace',
    'support-dagger': 'Dagger',

    // === ARMOR ===
    'leather-armor': 'Leather Armor',
    'scale-mail': 'Scale Mail',
    'chain-mail': 'Chain Mail',
    'plate-armor': 'Plate Armor',

    // === SHIELDS ===
    'shield': 'Shield'
};

/**
 * Enemy equipment templates
 *
 * Organized by archetype with equipment options that scale by rarity.
 * Higher rarity enemies get better equipment from the archetype pool.
 */
export const ENEMY_EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
    // ========================================
    // BRUTE ARCHETYPE WEAPONS
    // ========================================

    {
        id: 'greataxe',
        name: 'Greataxe',
        type: 'weapon',
        archetypes: ['brute'],
        rarities: ['uncommon', 'elite', 'boss'],
        damage: '1d12',
        properties: ['two-handed']
    },
    {
        id: 'longsword',
        name: 'Longsword',
        type: 'weapon',
        archetypes: ['brute'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        damage: '1d8',
        properties: ['versatile']
    },
    {
        id: 'brute-mace',
        name: 'Mace',
        type: 'weapon',
        archetypes: ['brute'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        damage: '1d6',
        properties: ['versatile']
    },
    {
        id: 'handaxe',
        name: 'Handaxe',
        type: 'weapon',
        archetypes: ['brute'],
        rarities: ['common', 'uncommon'],
        damage: '1d6',
        properties: ['light', 'thrown']
    },

    // ========================================
    // ARCHER ARCHETYPE WEAPONS
    // ========================================

    {
        id: 'longbow',
        name: 'Longbow',
        type: 'weapon',
        archetypes: ['archer'],
        rarities: ['uncommon', 'elite', 'boss'],
        damage: '1d8',
        properties: ['ammunition', 'two-handed', 'heavy']
    },
    {
        id: 'light-crossbow',
        name: 'Light Crossbow',
        type: 'weapon',
        archetypes: ['archer'],
        rarities: ['common', 'uncommon', 'elite'],
        damage: '1d8',
        properties: ['ammunition', 'two-handed', 'loading']
    },
    {
        id: 'shortsword',
        name: 'Shortsword',
        type: 'weapon',
        archetypes: ['archer'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        damage: '1d6',
        properties: ['finesse', 'light']
    },
    {
        id: 'dagger',
        name: 'Dagger',
        type: 'weapon',
        archetypes: ['archer'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        damage: '1d4',
        properties: ['finesse', 'light', 'thrown']
    },

    // ========================================
    // SUPPORT ARCHETYPE WEAPONS
    // ========================================

    {
        id: 'quarterstaff',
        name: 'Quarterstaff',
        type: 'weapon',
        archetypes: ['support'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        damage: '1d6',
        properties: ['versatile', 'two-handed']
    },
    {
        id: 'support-mace',
        name: 'Mace',
        type: 'weapon',
        archetypes: ['support'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        damage: '1d6',
        properties: ['versatile']
    },
    {
        id: 'support-dagger',
        name: 'Dagger',
        type: 'weapon',
        archetypes: ['support'],
        rarities: ['common', 'uncommon'],
        damage: '1d4',
        properties: ['finesse', 'light', 'thrown']
    },

    // ========================================
    // ARMOR
    // ========================================

    {
        id: 'leather-armor',
        name: 'Leather Armor',
        type: 'armor',
        archetypes: ['brute', 'archer', 'support'],
        rarities: ['common', 'uncommon', 'elite', 'boss'],
        acBonus: 11
    },
    {
        id: 'scale-mail',
        name: 'Scale Mail',
        type: 'armor',
        archetypes: ['brute', 'support'],
        rarities: ['uncommon', 'elite', 'boss'],
        acBonus: 14
    },
    {
        id: 'chain-mail',
        name: 'Chain Mail',
        type: 'armor',
        archetypes: ['brute', 'support'],
        rarities: ['elite', 'boss'],
        acBonus: 16
    },
    {
        id: 'plate-armor',
        name: 'Plate Armor',
        type: 'armor',
        archetypes: ['brute'],
        rarities: ['boss'],
        acBonus: 18
    },

    // ========================================
    // SHIELDS
    // ========================================

    {
        id: 'shield',
        name: 'Shield',
        type: 'shield',
        archetypes: ['brute', 'support'],
        rarities: ['uncommon', 'elite', 'boss'],
        acBonus: 2
    }
];

/**
 * Get equipment templates by archetype
 *
 * @param archetype - The enemy archetype to filter by
 * @returns Array of equipment templates for the archetype
 */
export function getEquipmentByArchetype(archetype: EnemyArchetype): EquipmentTemplate[] {
    return ENEMY_EQUIPMENT_TEMPLATES.filter(template =>
        template.archetypes.includes(archetype)
    );
}

/**
 * Get equipment templates by archetype and rarity
 *
 * @param archetype - The enemy archetype to filter by
 * @param rarity - The rarity tier to filter by
 * @returns Array of equipment templates matching both criteria
 */
export function getEquipmentByArchetypeAndRarity(
    archetype: EnemyArchetype,
    rarity: EnemyRarity
): EquipmentTemplate[] {
    return ENEMY_EQUIPMENT_TEMPLATES.filter(template =>
        template.archetypes.includes(archetype) &&
        template.rarities.includes(rarity)
    );
}

/**
 * Get weapons by archetype and rarity
 *
 * @param archetype - The enemy archetype to filter by
 * @param rarity - The rarity tier to filter by
 * @returns Array of weapon templates matching both criteria
 */
export function getWeaponsByArchetypeAndRarity(
    archetype: EnemyArchetype,
    rarity: EnemyRarity
): EquipmentTemplate[] {
    return getEquipmentByArchetypeAndRarity(archetype, rarity).filter(
        template => template.type === 'weapon'
    );
}

/**
 * Get armor by archetype and rarity
 *
 * @param archetype - The enemy archetype to filter by
 * @param rarity - The rarity tier to filter by
 * @returns Array of armor templates matching both criteria
 */
export function getArmorByArchetypeAndRarity(
    archetype: EnemyArchetype,
    rarity: EnemyRarity
): EquipmentTemplate[] {
    return getEquipmentByArchetypeAndRarity(archetype, rarity).filter(
        template => template.type === 'armor'
    );
}

/**
 * Get shields by archetype and rarity
 *
 * @param archetype - The enemy archetype to filter by
 * @param rarity - The rarity tier to filter by
 * @returns Array of shield templates matching both criteria
 */
export function getShieldsByArchetypeAndRarity(
    archetype: EnemyArchetype,
    rarity: EnemyRarity
): EquipmentTemplate[] {
    return getEquipmentByArchetypeAndRarity(archetype, rarity).filter(
        template => template.type === 'shield'
    );
}
