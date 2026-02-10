/**
 * D&D 5e Spells Data
 *
 * Contains the spell database, class spell lists, and spell slot progressions.
 * Moved from src/utils/constants.ts for better file organization.
 */

import type { Spell } from '../core/spells/SpellTypes.js';

/**
 * D&D 5e spell database - comprehensive list of spells organized by level and school
 *
 * Spell and SpellPrerequisite types are imported from ../core/spells/SpellTypes.ts
 * for better module organization consistency with SkillPrerequisite and FeaturePrerequisite.
 */
export const SPELL_DATABASE: Record<string, Spell> = {
    // Cantrips (Level 0)
    'Acid Splash': { name: 'Acid Splash', level: 0, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Fire Bolt': { name: 'Fire Bolt', level: 0, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Light': { name: 'Light', level: 0, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'M'], duration: '1 hour' },
    'Mage Hand': { name: 'Mage Hand', level: 0, school: 'Conjuration', casting_time: '1 action', range: '30 feet', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Mending': { name: 'Mending', level: 0, school: 'Transmutation', casting_time: '1 minute', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Message': { name: 'Message', level: 0, school: 'Transmutation', casting_time: '1 action', range: '120 feet', components: ['V', 'S', 'M'], duration: '1 round' },
    'Prestidigitation': { name: 'Prestidigitation', level: 0, school: 'Transmutation', casting_time: '1 action', range: '10 feet', components: ['V', 'S'], duration: 'Up to 1 hour' },
    'Sacred Flame': { name: 'Sacred Flame', level: 0, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shocking Grasp': { name: 'Shocking Grasp', level: 0, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous' },
    'Vicious Mockery': { name: 'Vicious Mockery', level: 0, school: 'Enchantment', casting_time: '1 action', range: '60 feet', components: ['V'], duration: 'Instantaneous' },

    // 1st Level
    'Burning Hands': { name: 'Burning Hands', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Self (15-foot cone)', components: ['V', 'S'], duration: 'Instantaneous' },
    'Charm Person': { name: 'Charm Person', level: 1, school: 'Enchantment', casting_time: '1 action', range: '30 feet', components: ['V', 'S'], duration: '1 hour' },
    'Cure Wounds': { name: 'Cure Wounds', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous' },
    'Detect Magic': { name: 'Detect Magic', level: 1, school: 'Divination', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 10 minutes' },
    'Disguise Self': { name: 'Disguise Self', level: 1, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: '1 hour' },
    'Expeditious Retreat': { name: 'Expeditious Retreat', level: 1, school: 'Transmutation', casting_time: '1 bonus action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 10 minutes' },
    'False Life': { name: 'False Life', level: 1, school: 'Necromancy', casting_time: '1 action', range: 'Self', components: ['V', 'S', 'M'], duration: '1 hour' },
    'Feather Fall': { name: 'Feather Fall', level: 1, school: 'Transmutation', casting_time: '1 reaction', range: '60 feet', components: ['V', 'M'], duration: '1 minute' },
    'Grease': { name: 'Grease', level: 1, school: 'Conjuration', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: '1 minute' },
    'Healing Word': { name: 'Healing Word', level: 1, school: 'Evocation', casting_time: '1 bonus action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Identify': { name: 'Identify', level: 1, school: 'Divination', casting_time: '1 minute', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Mage Armor': { name: 'Mage Armor', level: 1, school: 'Abjuration', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: '8 hours' },
    'Magic Missile': { name: 'Magic Missile', level: 1, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shield': { name: 'Shield', level: 1, school: 'Abjuration', casting_time: '1 reaction', range: 'Self', components: ['V', 'S'], duration: '1 round' },
    'Sleep': { name: 'Sleep', level: 1, school: 'Enchantment', casting_time: '1 action', range: '90 feet', components: ['V', 'S', 'M'], duration: '1 minute' },
    'Thunderwave': { name: 'Thunderwave', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Self (15-foot cube)', components: ['V', 'S'], duration: 'Instantaneous' },

    // 2nd Level
    'Acid Arrow': { name: 'Acid Arrow', level: 2, school: 'Evocation', casting_time: '1 action', range: '90 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Aganazzar\'s Scorcher': { name: 'Aganazzar\'s Scorcher', level: 2, school: 'Evocation', casting_time: '1 action', range: '30 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Blur': { name: 'Blur', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V'], duration: 'Concentration, up to 1 minute' },
    'Detect Thoughts': { name: 'Detect Thoughts', level: 2, school: 'Divination', casting_time: '1 action', range: 'Self', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Fireball': { name: 'Fireball', level: 3, school: 'Evocation', casting_time: '1 action', range: '150 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Hold Person': { name: 'Hold Person', level: 2, school: 'Enchantment', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Invisibility': { name: 'Invisibility', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },
    'Knock': { name: 'Knock', level: 2, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V'], duration: 'Instantaneous' },
    'Misty Step': { name: 'Misty Step', level: 2, school: 'Conjuration', casting_time: '1 bonus action', range: 'Self', components: ['V'], duration: 'Instantaneous' },
    'Mirror Image': { name: 'Mirror Image', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Scorching Ray': { name: 'Scorching Ray', level: 2, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shatter': { name: 'Shatter', level: 2, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Suggestion': { name: 'Suggestion', level: 2, school: 'Enchantment', casting_time: '1 action', range: '30 feet', components: ['V', 'M'], duration: 'Concentration, up to 1 minute' },

    // 3rd Level
    'Animate Dead': { name: 'Animate Dead', level: 3, school: 'Necromancy', casting_time: '1 minute', range: '10 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Blink': { name: 'Blink', level: 3, school: 'Transmutation', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: '1 minute' },
    'Counterspell': { name: 'Counterspell', level: 3, school: 'Abjuration', casting_time: '1 reaction', range: '60 feet', components: ['S'], duration: 'Instantaneous' },
    'Dispel Magic': { name: 'Dispel Magic', level: 3, school: 'Abjuration', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Lightning Bolt': { name: 'Lightning Bolt', level: 3, school: 'Evocation', casting_time: '1 action', range: 'Self (100-foot line)', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Major Image': { name: 'Major Image', level: 3, school: 'Illusion', casting_time: '1 action', range: '120 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 10 minutes' },
    'Sleet Storm': { name: 'Sleet Storm', level: 3, school: 'Evocation', casting_time: '1 action', range: '150 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Telekinesis': { name: 'Telekinesis', level: 3, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },

    // 4th Level
    'Dimension Door': { name: 'Dimension Door', level: 4, school: 'Conjuration', casting_time: '1 action', range: '500 feet', components: ['V'], duration: 'Instantaneous' },
    'Greater Invisibility': { name: 'Greater Invisibility', level: 4, school: 'Illusion', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Polymorph': { name: 'Polymorph', level: 4, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },
    'Stoneskin': { name: 'Stoneskin', level: 4, school: 'Abjuration', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },

    // 5th Level
    'Cone of Cold': { name: 'Cone of Cold', level: 5, school: 'Evocation', casting_time: '1 action', range: 'Self (60-foot cone)', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Teleportation Circle': { name: 'Teleportation Circle', level: 5, school: 'Conjuration', casting_time: '1 minute', range: '10 feet', components: ['V', 'M'], duration: '1 round' },
};

/**
 * Spell lists by class - defines which spells each spellcasting class has access to
 */
export const CLASS_SPELL_LISTS: Record<string, {
    cantrips: string[];
    spells_by_level: Record<number, string[]>;
}> = {
    'Wizard': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Light', 'Mage Hand', 'Mending', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Grease', 'Identify', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Shatter', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image', 'Sleet Storm', 'Telekinesis'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph', 'Stoneskin'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Sorcerer': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Light', 'Mage Hand', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Grease', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Shatter', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image', 'Sleet Storm'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph', 'Stoneskin'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Bard': {
        cantrips: ['Light', 'Mage Hand', 'Mending', 'Message', 'Prestidigitation', 'Vicious Mockery'],
        spells_by_level: {
            1: ['Charm Person', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Healing Word', 'Identify', 'Magic Missile', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph'],
            5: ['Teleportation Circle'],
        },
    },
    'Cleric': {
        cantrips: ['Light', 'Mending', 'Message', 'Sacred Flame'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Identify', 'Healing Word', 'Magic Missile', 'Shield', 'Sleep'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Scorching Ray'],
            3: ['Animate Dead', 'Counterspell', 'Dispel Magic', 'Lightning Bolt'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold'],
        },
    },
    'Druid': {
        cantrips: ['Light', 'Mending', 'Prestidigitation'],
        spells_by_level: {
            1: ['Burning Hands', 'Cure Wounds', 'Detect Magic', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Healing Word', 'Identify'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Scorching Ray', 'Shatter'],
            3: ['Animate Dead', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Sleet Storm'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Paladin': {
        cantrips: [],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Feather Fall', 'Healing Word', 'Protection', 'Shield'],
            2: ['Acid Arrow', 'Hold Person', 'Scorching Ray'],
            3: ['Counterspell', 'Dispel Magic', 'Lightning Bolt'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold'],
        },
    },
    'Ranger': {
        cantrips: [],
        spells_by_level: {
            1: ['Detect Magic', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Identify'],
            2: ['Blur', 'Hold Person', 'Invisibility', 'Misty Step'],
            3: ['Blink', 'Counterspell', 'Dispel Magic'],
            4: ['Dimension Door', 'Polymorph'],
            5: [],
        },
    },
    'Warlock': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Mage Hand', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Grease', 'Hex', 'Magic Missile'],
            2: ['Acid Arrow', 'Darkness', 'Hold Person', 'Invisibility', 'Scorching Ray', 'Shatter'],
            3: ['Counterspell', 'Dispel Magic', 'Fireball', 'Lightning Bolt'],
            4: ['Dimension Door', 'Greater Invisibility'],
            5: ['Cone of Cold'],
        },
    },
};

/**
 * Interface for class spell list data (used for extensibility)
 *
 * Defines the structure for spell lists associated with a class.
 * Used by ExtensionManager to support custom spell lists for custom classes.
 */
export interface ClassSpellListData {
    /** The class this spell list belongs to */
    class: string;
    /** Cantrips available to this class */
    cantrips: string[];
    /** Spells available at each spell level (1-9) */
    spells_by_level: Record<number, string[]>;
}

/**
 * Spell slots by class and level - D&D 5e standard progression
 * Key: "ClassName", Value: Record mapping character level (1-20) to spell slots per level (1-9)
 */
export const SPELL_SLOTS_BY_CLASS: Record<string, Record<number, Record<number, number>>> = {
    'Wizard': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Sorcerer': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Bard': {
        1: { 1: 2 },
        2: { 1: 2, 2: 0 },
        3: { 1: 3, 2: 0 },
        4: { 1: 3, 2: 2 },
        5: { 1: 4, 2: 2, 3: 0 },
        6: { 1: 4, 2: 2, 3: 0 },
        7: { 1: 4, 2: 2, 3: 2 },
        8: { 1: 4, 2: 2, 3: 2, 4: 0 },
        9: { 1: 4, 2: 3, 3: 2, 4: 0 },
        10: { 1: 4, 2: 3, 3: 2, 4: 1 },
        11: { 1: 4, 2: 3, 3: 3, 4: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
        14: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
        15: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1, 6: 0 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
    },
    'Cleric': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 3, 2: 2 },
        4: { 1: 4, 2: 2 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Druid': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 3, 2: 2 },
        4: { 1: 4, 2: 2 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Paladin': {
        1: { 1: 0 },
        2: { 1: 2 },
        3: { 1: 3 },
        4: { 1: 3 },
        5: { 1: 4, 2: 2 },
        6: { 1: 4, 2: 2 },
        7: { 1: 4, 2: 3 },
        8: { 1: 4, 2: 3 },
        9: { 1: 4, 2: 3, 3: 2 },
        10: { 1: 4, 2: 3, 3: 2 },
        11: { 1: 4, 2: 3, 3: 3 },
        12: { 1: 4, 2: 3, 3: 3 },
        13: { 1: 4, 2: 3, 3: 3, 4: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 2 },
        16: { 1: 4, 2: 3, 3: 3, 4: 2 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
    },
    'Ranger': {
        1: { 1: 0 },
        2: { 1: 2 },
        3: { 1: 2, 2: 0 },
        4: { 1: 3, 2: 0 },
        5: { 1: 3, 2: 2 },
        6: { 1: 3, 2: 2 },
        7: { 1: 3, 2: 2, 3: 0 },
        8: { 1: 3, 2: 2, 3: 0 },
        9: { 1: 3, 2: 3, 3: 0 },
        10: { 1: 4, 2: 3, 3: 0 },
        11: { 1: 4, 2: 3, 3: 2 },
        12: { 1: 4, 2: 3, 3: 2 },
        13: { 1: 4, 2: 3, 3: 2, 4: 0 },
        14: { 1: 4, 2: 3, 3: 2, 4: 0 },
        15: { 1: 4, 2: 3, 3: 2, 4: 1 },
        16: { 1: 4, 2: 3, 3: 2, 4: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 2 },
        20: { 1: 4, 2: 3, 3: 3, 4: 2 },
    },
    'Warlock': {
        1: { 1: 1 },
        2: { 1: 2 },
        3: { 1: 2, 2: 2 },
        4: { 1: 2, 2: 2 },
        5: { 1: 2, 2: 2, 3: 2 },
        6: { 1: 2, 2: 2, 3: 2 },
        7: { 1: 2, 2: 2, 3: 2, 4: 1 },
        8: { 1: 2, 2: 2, 3: 2, 4: 1 },
        9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 },
        10: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 },
        11: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 1 },
        12: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        13: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        14: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        15: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
        16: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
        17: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        18: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        19: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        20: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
    },
};
