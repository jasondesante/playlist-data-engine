/**
 * Default Features and Traits
 *
 * Contains all default D&D 5e class features and racial traits
 * for initializing the FeatureRegistry.
 */

import type { ClassFeature, RacialTrait } from './FeatureTypes.js';
import type { Class, Race } from '../types/Character.js';
import { asRace } from '../types/Character.js';

/**
 * Default Class Features for all 12 D&D 5e classes
 *
 * Features are organized by class and include their level,
 * type, and any mechanical effects they grant.
 */
export const DEFAULT_CLASS_FEATURES: ClassFeature[] = [
    // ========================================
    // BARBARIAN FEATURES
    // ========================================
    {
        id: 'barbarian_rage',
        name: 'Rage',
        description: 'In battle, you fight with primal fury. On your turn, you can enter a rage as a bonus action. While raging, you gain the following benefits if you aren\'t wearing heavy armor: Advantage on Strength checks and Strength saving throws, +2 damage bonus with melee weapons using Strength, resistance to bludgeoning, piercing, and slashing damage.',
        type: 'active',
        level: 1,
        class: 'Barbarian' as Class,
        effects: [
            { type: 'stat_bonus', target: 'melee_damage', value: 2, condition: 'while raging' }
        ],
        source: 'default',
        tags: ['combat', 'damage']
    },
    {
        id: 'barbarian_unarmored_defense',
        name: 'Unarmored Defense',
        description: 'While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier.',
        type: 'passive',
        level: 1,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'barbarian_reckless_attack',
        name: 'Reckless Attack',
        description: 'You can throw aside all concern for defense to attack with fierce desperation. When you make your first attack on your turn, you can decide to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have advantage until your next turn.',
        type: 'active',
        level: 2,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'barbarian_danger_sense',
        name: 'Danger Sense',
        description: 'You gain an uncanny sense of when things nearby aren\'t as they should be, giving you edge when you attempt to dodge a danger or react to a hidden threat. You have advantage on Dexterity saving throws against effects that you can see, such as traps and spells.',
        type: 'passive',
        level: 2,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['defense', 'perception']
    },
    {
        id: 'barbarian_extra_attack',
        name: 'Extra Attack',
        description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
        type: 'passive',
        level: 5,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'barbarian_fast_movement',
        name: 'Fast Movement',
        description: 'Your speed increases by 10 feet while you aren\'t wearing heavy armor.',
        type: 'passive',
        level: 5,
        class: 'Barbarian' as Class,
        effects: [
            { type: 'passive_modifier', target: 'speed', value: 10, condition: 'unarmored' }
        ],
        source: 'default',
        tags: ['movement']
    },
    {
        id: 'barbarian_feral_instinct',
        name: 'Feral Instinct',
        description: 'Your instincts are so honed that you have advantage on initiative rolls. Additionally, if you are surprised at the start of combat and aren\'t incapacitated, you can act normally on your first turn.',
        type: 'passive',
        level: 7,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['combat', 'perception']
    },
    {
        id: 'barbarian_brutal_critical',
        name: 'Brutal Critical',
        description: 'When you score a critical hit with a melee weapon attack, you can roll one of the weapon\'s damage dice one additional time and add it to the extra damage of the critical hit.',
        type: 'passive',
        level: 9,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['combat', 'damage']
    },
    {
        id: 'barbarian_relentless_endurance',
        name: 'Relentless Endurance',
        description: 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can\'t use this feature again until you finish a long rest.',
        type: 'active',
        level: 11,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['survival']
    },
    {
        id: 'barbarian_persistant_rage',
        name: 'Persistent Rage',
        description: 'Your rage can\'t end early due to fatigue.',
        type: 'passive',
        level: 11,
        class: 'Barbarian' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'barbarian_indomitable_might',
        name: 'Indomitable Might',
        description: 'Your Strength score increases by 4, and your maximum for that score becomes 24.',
        type: 'passive',
        level: 18,
        class: 'Barbarian' as Class,
        effects: [
            { type: 'stat_bonus', target: 'STR', value: 4 },
            { type: 'passive_modifier', target: 'STR_max', value: 24 }
        ],
        source: 'default',
        tags: ['ability']
    },
    {
        id: 'barbarian_primal_champion',
        name: 'Primal Champion',
        description: 'Your Strength and Constitution scores increase by 4, and your maximum for those scores becomes 24.',
        type: 'passive',
        level: 20,
        class: 'Barbarian' as Class,
        effects: [
            { type: 'stat_bonus', target: 'STR', value: 4 },
            { type: 'stat_bonus', target: 'CON', value: 4 },
            { type: 'passive_modifier', target: 'STR_max', value: 24 },
            { type: 'passive_modifier', target: 'CON_max', value: 24 }
        ],
        source: 'default',
        tags: ['ability']
    },

    // ========================================
    // BARD FEATURES
    // ========================================
    {
        id: 'bardic_inspiration',
        name: 'Bardic Inspiration',
        description: 'You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die, a d6.',
        type: 'resource',
        level: 1,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['support', 'resource']
    },
    {
        id: 'jack_of_all_trades',
        name: 'Jack of All Trades',
        description: 'You can add half your proficiency bonus, rounded down, to any ability check you make that doesn\'t already include your proficiency bonus.',
        type: 'passive',
        level: 2,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['skill']
    },
    {
        id: 'song_of_rest',
        name: 'Song of Rest',
        description: 'You can use soothing music or oration to help revitalize your wounded allies during a short rest. If you or any friendly creatures who can hear your performance regain hit points at the end of the short rest, each of those creatures regains an extra 1d6 hit points.',
        type: 'passive',
        level: 2,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['healing', 'support']
    },
    {
        id: 'bard_college',
        name: 'Bard College',
        description: 'At 3rd level, you delve into the advanced techniques of a bard college of your choice. Your choice grants you features at 3rd level and again at 6th and 14th level.',
        type: 'passive',
        level: 3,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'bardic_versatility',
        name: 'Bardic Versatility',
        description: 'Whenever you reach a level in this class that grants the Ability Score Improvement feature, you can do one of the following: Replace one of your skills with another skill from the bard list, gain proficiency in one skill of your choice, gain proficiency with one musical instrument of your choice, or gain proficiency with one tool of your choice.',
        type: 'passive',
        level: 4,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['skill', 'proficiency']
    },
    {
        id: 'font_of_inspiration',
        name: 'Font of Inspiration',
        description: 'When you roll initiative and have no uses of Bardic Inspiration left, you regain one use.',
        type: 'passive',
        level: 5,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['resource']
    },
    {
        id: 'countercharm',
        name: 'Countercharm',
        description: 'You gain the ability to use musical notes or words of power to disrupt mind-influencing effects. As an action, you can start a performance that lasts until the end of your next turn. During that time, you and any friendly creatures within 30 feet of you have advantage on saving throws against being frightened or charmed.',
        type: 'active',
        level: 6,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['support', 'defense']
    },
    {
        id: 'superior_inspiration',
        name: 'Superior Inspiration',
        description: 'When you roll initiative and have no uses of Bardic Inspiration left, you regain two uses.',
        type: 'passive',
        level: 10,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['resource']
    },
    {
        id: 'magical_secrets',
        name: 'Magical Secrets',
        description: 'You learn two spells of your choice from any class. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you.',
        type: 'passive',
        level: 10,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'unforgettable_face',
        name: 'Unforgettable Face',
        description: 'When you speak to a creature for the first time, you can choose one creature. That creature has disadvantage on attack rolls against you for 1 minute.',
        type: 'active',
        level: 14,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['social', 'defense']
    },
    {
        id: 'magical_secrets_2',
        name: 'Magical Secrets',
        description: 'You learn two spells of your choice from any class.',
        type: 'passive',
        level: 14,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'bardic_inspiration_d8',
        name: 'Bardic Inspiration (d8)',
        description: 'Your Bardic Inspiration die changes to a d8.',
        type: 'passive',
        level: 15,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['resource']
    },
    {
        id: 'magical_secrets_3',
        name: 'Magical Secrets',
        description: 'You learn two spells of your choice from any class.',
        type: 'passive',
        level: 18,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'bardic_inspiration_d10',
        name: 'Bardic Inspiration (d10)',
        description: 'Your Bardic Inspiration die changes to a d10.',
        type: 'passive',
        level: 20,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['resource']
    },
    {
        id: 'superior_inspiration_3',
        name: 'Superior Inspiration',
        description: 'When you roll initiative and have no uses of Bardic Inspiration left, you regain three uses.',
        type: 'passive',
        level: 20,
        class: 'Bard' as Class,
        source: 'default',
        tags: ['resource']
    },

    // ========================================
    // CLERIC FEATURES
    // ========================================
    {
        id: 'divine_domain',
        name: 'Divine Domain',
        description: 'Choose one domain related to your deity: Knowledge, Life, Light, Nature, Tempest, Trickery, or War. Each domain grants domain spells and other features at levels 1, 2, 6, 8, and 17.',
        type: 'passive',
        level: 1,
        class: 'Cleric' as Class,
        source: 'default',
        tags: ['subclass', 'magic']
    },
    {
        id: 'divine_intervention',
        name: 'Divine Intervention',
        description: 'You can call on your deity to intervene on your behalf. Your deity intervenes by causing a effect related to their portfolio. You can use this feature once between long rests.',
        type: 'active',
        level: 10,
        class: 'Cleric' as Class,
        source: 'default',
        tags: ['magic', 'divine']
    },
    {
        id: 'destroy_undead',
        name: 'Destroy Undead',
        description: 'When an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is at or below a threshold shown on the Cleric table.',
        type: 'passive',
        level: 5,
        class: 'Cleric' as Class,
        source: 'default',
        tags: ['combat', 'divine']
    },
    {
        id: 'divine_intervention_improved',
        name: 'Divine Intervention (Improved)',
        description: 'You can use Divine Intervention twice between long rests.',
        type: 'active',
        level: 20,
        class: 'Cleric' as Class,
        source: 'default',
        tags: ['magic', 'divine']
    },

    // ========================================
    // DRUID FEATURES
    // ========================================
    {
        id: 'druidic',
        name: 'Druidic',
        description: 'You know Druidic, the secret language of druids. You can speak the language and use it to leave hidden messages. You and others who know this language automatically spot such a message. Others spot the message\'s presence with a successful DC 15 Wisdom (Perception) check but can\'t decipher it without magic.',
        type: 'passive',
        level: 1,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['language', 'secret']
    },
    {
        id: 'wild_shape',
        name: 'Wild Shape',
        description: 'You can use your action to magically assume the shape of a beast that you have seen before. You can transform into a beast with a challenge rating as shown on the Druid table.',
        type: 'active',
        level: 2,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },
    {
        id: 'wild_shape_combat',
        name: 'Wild Shape (Combat)',
        description: 'You can transform into a beast with a challenge rating up to 1.',
        type: 'passive',
        level: 2,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },
    {
        id: 'druid_circle',
        name: 'Druid Circle',
        description: 'At 2nd level, you choose to identify with a circle of druids. Your choice grants you features at 2nd level and again at 6th, 10th, and 14th level.',
        type: 'passive',
        level: 2,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'wild_shape_aquatic',
        name: 'Wild Shape (Aquatic)',
        description: 'You can transform into a beast with a swimming speed.',
        type: 'passive',
        level: 4,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },
    {
        id: 'wild_shape_cr_2',
        name: 'Wild Shape (CR 2)',
        description: 'You can transform into a beast with a challenge rating up to 2.',
        type: 'passive',
        level: 8,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },
    {
        id: 'wild_shape_cr_3',
        name: 'Wild Shape (CR 3)',
        description: 'You can transform into a beast with a challenge rating up to 3.',
        type: 'passive',
        level: 8,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },
    {
        id: 'timeless_body',
        name: 'Timeless Body',
        description: 'You age slowly, appearing no older than you did at the start of your druidic studies.',
        type: 'passive',
        level: 18,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['ability']
    },
    {
        id: 'beast_spells',
        name: 'Beast Spells',
        description: 'You can cast many of your druid spells in any shape you assume using Wild Shape.',
        type: 'passive',
        level: 18,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },
    {
        id: 'archdruid',
        name: 'Archdruid',
        description: 'You can use your Wild Shape an unlimited number of times.',
        type: 'passive',
        level: 20,
        class: 'Druid' as Class,
        source: 'default',
        tags: ['magic', 'shapeshifting']
    },

    // ========================================
    // FIGHTER FEATURES
    // ========================================
    {
        id: 'fighting_style',
        name: 'Fighting Style',
        description: 'You adopt a style of fighting as your specialty. Choose one of the following: Archery, Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting, or Unarmed Fighting.',
        type: 'passive',
        level: 1,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['combat', 'style']
    },
    {
        id: 'second_wind',
        name: 'Second Wind',
        description: 'You have a limited well of stamina you can draw on to protect yourself. As a bonus action, you can regain hit points equal to 1d10 + your fighter level.',
        type: 'active',
        level: 1,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['healing', 'combat']
    },
    {
        id: 'action_surge',
        name: 'Action Surge',
        description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action.',
        type: 'active',
        level: 2,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'martial_archetype',
        name: 'Martial Archetype',
        description: 'At 3rd level, you choose an archetype that you strive to emulate in your combat styles. Your choice grants you features at 3rd level and again at 7th, 10th, 15th, and 18th level.',
        type: 'passive',
        level: 3,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'fighter_extra_attack',
        name: 'Extra Attack',
        description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
        type: 'passive',
        level: 5,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'indomitable',
        name: 'Indomitable',
        description: 'You can reroll a saving throw that you fail. If you do so, you must use the new roll.',
        type: 'active',
        level: 9,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['defense', 'combat']
    },
    {
        id: 'indomitable_2',
        name: 'Indomitable (Twice)',
        description: 'You can use Indomitable twice between long rests.',
        type: 'active',
        level: 13,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['defense', 'combat']
    },
    {
        id: 'indomitable_3',
        name: 'Indomitable (Thrice)',
        description: 'You can use Indomitable three times between long rests.',
        type: 'active',
        level: 17,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['defense', 'combat']
    },
    {
        id: 'action_surge_2',
        name: 'Action Surge (Improved)',
        description: 'You can use Action Surge twice between short rests.',
        type: 'passive',
        level: 17,
        class: 'Fighter' as Class,
        source: 'default',
        tags: ['combat']
    },

    // ========================================
    // MONK FEATURES
    // ========================================
    {
        id: 'unarmored_defense_monk',
        name: 'Unarmored Defense',
        description: 'Beginning at 1st level, while you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.',
        type: 'passive',
        level: 1,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'martial_arts',
        name: 'Martial Arts',
        description: 'You gain the following benefits while you are unarmed or wielding only monk weapons and you aren\'t wearing armor or wielding a shield: You can use Dexterity instead of Strength for attacks and damage rolls with your unarmed strikes and monk weapons, you can roll a d4 in place of the normal damage of your monk weapon or unarmed strike, and when you use the Attack action with an unarmed strike or a monk weapon, you can make one unarmed strike as a bonus action.',
        type: 'passive',
        level: 1,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'ki',
        name: 'Ki',
        description: 'Starting at 2nd level, your training allows you to harness the mystic energy of ki. Your access to this energy is represented by a number of Ki points. You have a number of Ki points equal to your monk level.',
        type: 'resource',
        level: 2,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['resource', 'magic']
    },
    {
        id: 'flurry_of_blows',
        name: 'Flurry of Blows',
        description: 'Immediately after you take the Attack action on your turn, you can spend 1 Ki point to make two unarmed strikes as a bonus action.',
        type: 'active',
        level: 2,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'patient_defense',
        name: 'Patient Defense',
        description: 'You can spend 1 Ki point to take the Dodge action as a bonus action on your turn.',
        type: 'active',
        level: 2,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['defense', 'combat']
    },
    {
        id: 'step_of_the_wind',
        name: 'Step of the Wind',
        description: 'You can spend 1 Ki point to take the Disengage or Dash action as a bonus action on your turn, and your jump distance is doubled for the turn.',
        type: 'active',
        level: 2,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['movement', 'combat']
    },
    {
        id: 'monastic_tradition',
        name: 'Monastic Tradition',
        description: 'When you reach 3rd level, you commit yourself to a monastic tradition. Your tradition grants you features at 3rd level and again at 6th, 11th, and 17th level.',
        type: 'passive',
        level: 3,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'slow_fall',
        name: 'Slow Fall',
        description: 'At 4th level, you can use your reaction when you fall to reduce any falling damage you take by an amount equal to five times your monk level.',
        type: 'passive',
        level: 4,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['defense', 'movement']
    },
    {
        id: 'extra_attack_monk',
        name: 'Extra Attack',
        description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
        type: 'passive',
        level: 5,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'stunning_strike',
        name: 'Stunning Strike',
        description: 'Starting at 5th level, you can interfere with the flow of ki in an opponent\'s body. When you hit another creature with a melee weapon attack, you can spend 1 Ki point to attempt a stunning strike. The target must succeed on a Constitution saving throw or be stunned until the end of your next turn.',
        type: 'active',
        level: 5,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'ki_empowered_strikes',
        name: 'Ki-Empowered Strikes',
        description: 'Starting at 6th level, your unarmed strikes count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.',
        type: 'passive',
        level: 6,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['combat', 'magic']
    },
    {
        id: 'stillness_of_mind',
        name: 'Stillness of Mind',
        description: 'At 7th level, you can use your action to end one effect on yourself that is causing you to be charmed or frightened.',
        type: 'active',
        level: 7,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'unarmored_movement',
        name: 'Unarmored Movement',
        description: 'Your speed increases by 10 feet while you are not wearing armor or wielding a shield. This bonus increases when you reach certain monk levels.',
        type: 'passive',
        level: 2,
        class: 'Monk' as Class,
        effects: [
            { type: 'passive_modifier', target: 'speed', value: 10, condition: 'unarmored' }
        ],
        source: 'default',
        tags: ['movement']
    },
    {
        id: 'pure_body',
        name: 'Purity of Body',
        description: 'At 10th level, your mastery of the ki flowing through you makes you immune to disease and poison.',
        type: 'passive',
        level: 10,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['defense', 'ability']
    },
    {
        id: 'tongue_of_the_sun_and_moon',
        name: 'Tongue of the Sun and Moon',
        description: 'At 13th level, you learn to touch the ki of other minds so that you understand all spoken languages. Moreover, any creature that can understand a language can understand what you say.',
        type: 'passive',
        level: 13,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['language', 'social']
    },
    {
        id: 'empty_body',
        name: 'Empty Body',
        description: 'At 18th level, you can spend 4 Ki points to start becoming invisible for 1 minute. During that time, you also have resistance to all damage but force damage.',
        type: 'active',
        level: 18,
        class: 'Monk' as Class,
        source: 'default',
        tags: ['defense', 'magic']
    },

    // ========================================
    // PALADIN FEATURES
    // ========================================
    {
        id: 'divine_sense',
        name: 'Divine Sense',
        description: 'As an action, you can detect good and evil. You can sense the presence of any celestial, fiend, or undead within 60 feet of you.',
        type: 'active',
        level: 1,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['perception', 'divine']
    },
    {
        id: 'lay_on_hands',
        name: 'Lay on Hands',
        description: 'Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5.',
        type: 'active',
        level: 2,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['healing', 'divine']
    },
    {
        id: 'fighting_style_paladin',
        name: 'Fighting Style',
        description: 'You adopt a style of fighting as your specialty. Choose one of the following: Defense, Dueling, Great Weapon Fighting, Protection, or Two-Weapon Fighting.',
        type: 'passive',
        level: 2,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['combat', 'style']
    },
    {
        id: 'divine_smite',
        name: 'Divine Smite',
        description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target.',
        type: 'active',
        level: 2,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['combat', 'divine']
    },
    {
        id: 'sacred_oath',
        name: 'Sacred Oath',
        description: 'When you reach 3rd level, you swear the oath that binds you as a paladin forever. Your choice grants you features at 3rd level and again at 7th, 15th, and 20th level.',
        type: 'passive',
        level: 3,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['subclass', 'divine']
    },
    {
        id: 'aura_of_protection',
        name: 'Aura of Protection',
        description: 'Starting at 6th level, you and friendly creatures within 10 feet of you gain a bonus to all saving throws equal to your Charisma modifier (minimum of +1).',
        type: 'passive',
        level: 6,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['defense', 'aura']
    },
    {
        id: 'aura_of_courage',
        name: 'Aura of Courage',
        description: 'Starting at 10th level, you and friendly creatures within 10 feet of you can\'t be frightened.',
        type: 'passive',
        level: 10,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['defense', 'aura']
    },
    {
        id: 'improved_divine_smite',
        name: 'Improved Divine Smite',
        description: 'Starting at 11th level, you are so suffused with righteous might that all your melee weapon strikes carry divine power with them. Whenever you hit a creature with a melee weapon, the creature takes an extra 1d8 radiant damage.',
        type: 'passive',
        level: 11,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['combat', 'divine']
    },
    {
        id: 'cleansing_touch',
        name: 'Cleansing Touch',
        description: 'At 14th level, you can use your action to end one spell or effect on yourself or one willing creature that you touch.',
        type: 'active',
        level: 14,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['defense', 'divine']
    },
    {
        id: 'aura_improvements',
        name: 'Aura Improvements',
        description: 'At 18th level, the range of your auras increases to 30 feet.',
        type: 'passive',
        level: 18,
        class: 'Paladin' as Class,
        source: 'default',
        tags: ['aura']
    },

    // ========================================
    // RANGER FEATURES
    // ========================================
    {
        id: 'favored_enemy',
        name: 'Favored Enemy',
        description: 'You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy. Choose a type of favored enemy: aberrations, beasts, celestials, constructs, dragons, elementals, fey, fiends, giants, monstrosities, oozes, plants, or undead. You gain a bonus to damage rolls against creatures of the chosen type.',
        type: 'passive',
        level: 1,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'natural_explorer',
        name: 'Natural Explorer',
        description: 'You are a master of navigating the natural world. You choose a type of favored terrain: arctic, coast, desert, forest, grassland, mountain, swamp, or the Underdark. While traveling for an hour or more in your favored terrain, you gain the following benefits: Difficult terrain doesn\'t slow your group\'s travel, your group can\'t become lost except by magical means, and you remain alert to danger even when you are engaged in another activity.',
        type: 'passive',
        level: 1,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['exploration']
    },
    {
        id: 'fighting_style_ranger',
        name: 'Fighting Style',
        description: 'You adopt a style of fighting as your specialty. Choose one of the following: Archery, Defense, Dueling, Great Weapon Fighting, Two-Weapon Fighting, or Mariner (if you have a swimming speed).',
        type: 'passive',
        level: 2,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['combat', 'style']
    },
    {
        id: 'spellcasting_ranger',
        name: 'Spellcasting',
        description: 'By the time you reach 2nd level, you have learned to use the magical essence of nature to cast spells, much as a druid does.',
        type: 'passive',
        level: 2,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'ranger_archetype',
        name: 'Ranger Archetype',
        description: 'At 3rd level, you choose an archetype that you strive to emulate in your combat styles and techniques. Your choice grants you features at 3rd level and again at 5th, 7th, 11th, and 15th level.',
        type: 'passive',
        level: 3,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'prime_awareness',
        name: 'Prime-Aware Explorer',
        description: 'At 6th level, your mastery of the wild allows you to navigate with ease. You can use the Hide action as a bonus action. You also gain an additional Favored Enemy and Favored Terrain.',
        type: 'passive',
        level: 6,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['exploration', 'stealth']
    },
    {
        id: 'fleet_of_foot',
        name: 'Fleet of Foot',
        description: 'Your speed increases by 5 feet.',
        type: 'passive',
        level: 8,
        class: 'Ranger' as Class,
        effects: [
            { type: 'passive_modifier', target: 'speed', value: 5 }
        ],
        source: 'default',
        tags: ['movement']
    },
    {
        id: 'hide_in_plain_sight',
        name: 'Hide in Plain Sight',
        description: 'Starting at 10th level, you can remain perfectly still for long periods to blend in with your surroundings. You can spend 1 minute creating camouflage and gain advantage on Stealth checks.',
        type: 'active',
        level: 10,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['stealth']
    },
    {
        id: 'vanish',
        name: 'Vanish',
        description: 'Starting at 14th level, you can use the Hide action as a bonus action on your turn. Also, you can\'t be tracked by nonmagical means.',
        type: 'passive',
        level: 14,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['stealth']
    },
    {
        id: 'feral_senses',
        name: 'Feral Senses',
        description: 'At 18th level, you gain preternatural senses that help you fight creatures you can\'t see. When you attack a creature you can\'t see, your inability to see it doesn\'t impose disadvantage on your attack rolls. You are also aware of the location of any invisible creature within 30 feet of you.',
        type: 'passive',
        level: 18,
        class: 'Ranger' as Class,
        source: 'default',
        tags: ['perception', 'combat']
    },

    // ========================================
    // ROGUE FEATURES
    // ========================================
    {
        id: 'sneak_attack',
        name: 'Sneak Attack',
        description: 'You know how to strike subtly and exploit a foe\'s distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll.',
        type: 'passive',
        level: 1,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['combat', 'damage']
    },
    {
        id: 'thieves_cant',
        name: 'Thieves\' Cant',
        description: 'During your rogue training you learned thieves\' cant, a secret mix of dialect, hand signs, and body language that allows you to hide messages in seemingly normal conversation.',
        type: 'passive',
        level: 1,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['language', 'secret']
    },
    {
        id: 'cunning_action',
        name: 'Cunning Action',
        description: 'You can take a bonus action on each of your turns in combat. This action can be used only to take the Dash, Disengage, or Hide action.',
        type: 'active',
        level: 2,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['combat', 'movement']
    },
    {
        id: 'roguish_archetype',
        name: 'Roguish Archetype',
        description: 'At 3rd level, you choose an archetype that you strive to emulate in your combat styles and techniques. Your choice grants you features at 3rd level and then again at 9th, 13th, and 17th level.',
        type: 'passive',
        level: 3,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'ability_score_improvement_rogue',
        name: 'Ability Score Improvement',
        description: 'At 4th level, you can increase one ability score by 2 or two ability scores by 1.',
        type: 'passive',
        level: 4,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['ability']
    },
    {
        id: 'uncanny_dodge',
        name: 'Uncanny Dodge',
        description: 'Starting at 5th level, when an attacker that you can see hits you with an attack, you can use your reaction to halve the attack\'s damage against you.',
        type: 'active',
        level: 5,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['defense', 'combat']
    },
    {
        id: 'evasion',
        name: 'Evasion',
        description: 'Starting at 7th level, you can nimbly dodge out of the way of certain area effects. When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed and only half damage if you fail.',
        type: 'passive',
        level: 7,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'slippery_mind',
        name: 'Slippery Mind',
        description: 'At 11th level, you have acquired greater mental strength. You gain proficiency in Wisdom saving throws.',
        type: 'passive',
        level: 11,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'elusive',
        name: 'Elusive',
        description: 'Beginning at 18th level, you are so evasive that attackers rarely gain the upper hand against you. No attack roll has advantage against you while you aren\'t incapacitated.',
        type: 'passive',
        level: 18,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'stroke_of_luck',
        name: 'Stroke of Luck',
        description: 'At 20th level, you have an uncanny knack for succeeding when you need to. If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20.',
        type: 'active',
        level: 20,
        class: 'Rogue' as Class,
        source: 'default',
        tags: ['combat', 'luck']
    },

    // ========================================
    // SORCERER FEATURES
    // ========================================
    {
        id: 'sorcerous_restoration',
        name: 'Sorcerous Restoration',
        description: 'You can regain 4 sorcery points on a short rest.',
        type: 'passive',
        level: 20,
        class: 'Sorcerer' as Class,
        source: 'default',
        tags: ['resource']
    },
    {
        id: 'font_of_magic',
        name: 'Font of Magic',
        description: 'You can manipulate the weave of magic to your advantage. You have 2 sorcery points. You gain more as you level. You can use sorcery points to create additional spell slots or gain spell slots.',
        type: 'resource',
        level: 2,
        class: 'Sorcerer' as Class,
        source: 'default',
        tags: ['resource', 'magic']
    },
    {
        id: 'metamagic',
        name: 'Metamagic',
        description: 'At 3rd level, you gain the ability to twist your spells to suit your needs. You gain two metamagic options of your choice: Careful Spell, Distant Spell, Empowered Spell, Extended Spell, Heightened Spell, Quickened Spell, Subtle Spell, Twinned Spell.',
        type: 'active',
        level: 3,
        class: 'Sorcerer' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'sorcerous_origin',
        name: 'Sorcerous Origin',
        description: 'Choose a sorcerous origin, which describes the source of your magical power: Draconic Bloodline, Wild Magic, or another origin.',
        type: 'passive',
        level: 1,
        class: 'Sorcerer' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'metamagic_3',
        name: 'Metamagic (3 options)',
        description: 'At 10th level, you gain a third metamagic option.',
        type: 'active',
        level: 10,
        class: 'Sorcerer' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'metamagic_4',
        name: 'Metamagic (4 options)',
        description: 'At 17th level, you gain a fourth metamagic option.',
        type: 'active',
        level: 17,
        class: 'Sorcerer' as Class,
        source: 'default',
        tags: ['magic']
    },

    // ========================================
    // WARLOCK FEATURES
    // ========================================
    {
        id: 'otherworldly_patron',
        name: 'Otherworldly Patron',
        description: 'At 1st level, you have struck a bargain with an otherworldly being of power. Your choice grants you features at 1st level and again at 6th, 10th, and 14th level.',
        type: 'passive',
        level: 1,
        class: 'Warlock' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'pact_magic',
        name: 'Pact Magic',
        description: 'You have learned to delve into the secrets of magic to harness the power of your patron. You know two cantrips and a number of spells.',
        type: 'passive',
        level: 1,
        class: 'Warlock' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'eldritch_master',
        name: 'Eldritch Master',
        description: 'At 20th level, you can draw on your inner reserve of magical power while entreating your patron to regain expended spell slots. You can regain all your warlock spell slots on a short or long rest.',
        type: 'active',
        level: 20,
        class: 'Warlock' as Class,
        source: 'default',
        tags: ['magic', 'resource']
    },
    {
        id: 'mystic_arcanum',
        name: 'Mystic Arcanum',
        description: 'At 11th level, your patron bestows upon you the ability to cast a 6th-level spell. You gain additional spells at higher levels.',
        type: 'passive',
        level: 11,
        class: 'Warlock' as Class,
        source: 'default',
        tags: ['magic']
    },

    // ========================================
    // WIZARD FEATURES
    // ========================================
    {
        id: 'arcane_recovery',
        name: 'Arcane Recovery',
        description: 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can recover expended spell slots whose combined level equals no more than half your wizard level.',
        type: 'active',
        level: 1,
        class: 'Wizard' as Class,
        source: 'default',
        tags: ['magic', 'resource']
    },
    {
        id: 'arcane_tradition',
        name: 'Arcane Tradition',
        description: 'When you reach 2nd level, you choose an arcane tradition that shapes your practice of magic. Your choice grants you features at 2nd level and again at 6th, 10th, and 14th level.',
        type: 'passive',
        level: 2,
        class: 'Wizard' as Class,
        source: 'default',
        tags: ['subclass']
    },
    {
        id: 'spell_mastery',
        name: 'Spell Mastery',
        description: 'At 18th level, you have achieved profound mastery over spells. Choose two 1st-level wizard spells that you know. You can cast these spells at their lowest level without expending a spell slot.',
        type: 'passive',
        level: 18,
        class: 'Wizard' as Class,
        source: 'default',
        tags: ['magic']
    },
    {
        id: 'signature_spells',
        name: 'Signature Spells',
        description: 'When you reach 20th level, you gain mastery over two powerful spells. Choose two 3rd-level wizard spells that you know. You can cast these spells at their lowest level without expending a spell slot.',
        type: 'passive',
        level: 20,
        class: 'Wizard' as Class,
        source: 'default',
        tags: ['magic']
    },
];

/**
 * Default Racial Traits for all 9 D&D 5e races
 *
 * Traits represent the innate abilities granted by each race.
 * These are typically gained at character creation.
 */
export const DEFAULT_RACIAL_TRAITS: RacialTrait[] = [
    // ========================================
    // HUMAN TRAITS
    // ========================================
    {
        id: 'human_versatile',
        name: 'Versatile',
        description: 'Humans gain proficiency in one skill of their choice.',
        race: asRace('Human'),
        source: 'default',
        tags: ['skill']
    },
    {
        id: 'human_extra_language',
        name: 'Extra Language',
        description: 'Humans can speak, read, and write one extra language of their choice.',
        race: asRace('Human'),
        source: 'default',
        tags: ['language']
    },

    // ========================================
    // ELF TRAITS
    // ========================================
    {
        id: 'elf_darkvision',
        name: 'Darkvision',
        description: 'Accustomed to twilit forests and the night sky, elves have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
        race: asRace('Elf'),
        source: 'default',
        effects: [
            { type: 'ability_unlock', target: 'darkvision', value: 60 }
        ],
        tags: ['vision']
    },
    {
        id: 'elf_keen_senses',
        name: 'Keen Senses',
        description: 'Elves have proficiency in the Perception skill.',
        race: asRace('Elf'),
        source: 'default',
        effects: [
            { type: 'skill_proficiency', target: 'perception', value: 'proficient' }
        ],
        tags: ['skill', 'perception']
    },
    {
        id: 'elf_fey_ancestry',
        name: 'Fey Ancestry',
        description: 'Elves have advantage on saving throws against being charmed, and magic can\'t put them to sleep.',
        race: asRace('Elf'),
        source: 'default',
        tags: ['defense', 'magic']
    },
    {
        id: 'elf_trance',
        name: 'Trance',
        description: 'Elves don\'t need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep.',
        race: asRace('Elf'),
        source: 'default',
        tags: ['ability']
    },

    // ========================================
    // DWARF TRAITS
    // ========================================
    {
        id: 'dwarf_darkvision',
        name: 'Darkvision',
        description: 'Accustomed to life underground, dwarves have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
        race: asRace('Dwarf'),
        source: 'default',
        effects: [
            { type: 'ability_unlock', target: 'darkvision', value: 60 }
        ],
        tags: ['vision']
    },
    {
        id: 'dwarf_dwarven_resilience',
        name: 'Dwarven Resilience',
        description: 'Dwarves have advantage on saving throws against poison, and resistance against poison damage.',
        race: asRace('Dwarf'),
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'dwarf_stonecunning',
        name: 'Stonecunning',
        description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.',
        race: asRace('Dwarf'),
        source: 'default',
        tags: ['skill', 'exploration']
    },

    // ========================================
    // HALFLING TRAITS
    // ========================================
    {
        id: 'halfling_lucky',
        name: 'Lucky',
        description: 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
        race: asRace('Halfling'),
        source: 'default',
        tags: ['luck']
    },
    {
        id: 'halfling_brave',
        name: 'Brave',
        description: 'Halflings have advantage on saving throws against being frightened.',
        race: asRace('Halfling'),
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'halfling_halfling_nimbleness',
        name: 'Halfling Nimbleness',
        description: 'Halflings can move through the space of any creature that is larger than them.',
        race: asRace('Halfling'),
        source: 'default',
        tags: ['movement']
    },

    // ========================================
    // DRAGONBORN TRAITS
    // ========================================
    {
        id: 'dragonborn_draconic_ancestry',
        name: 'Draconic Ancestry',
        description: 'Dragonborn have draconic ancestry linked to a specific type of dragon. This determines their breath weapon and damage resistance.',
        race: asRace('Dragonborn'),
        source: 'default',
        tags: ['ancestry', 'combat']
    },
    {
        id: 'dragonborn_breath_weapon',
        name: 'Breath Weapon',
        description: 'Dragonborn can use their action to exhale destructive energy. Their draconic ancestry determines the size, shape, and damage type of the breath weapon.',
        race: asRace('Dragonborn'),
        source: 'default',
        tags: ['combat']
    },
    {
        id: 'dragonborn_damage_resistance',
        name: 'Damage Resistance',
        description: 'Dragonborn have resistance to the damage type associated with their draconic ancestry.',
        race: asRace('Dragonborn'),
        source: 'default',
        tags: ['defense']
    },

    // ========================================
    // GNOME TRAITS
    // ========================================
    {
        id: 'gnome_darkvision',
        name: 'Darkvision',
        description: 'Accustomed to life underground, gnomes have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
        race: asRace('Gnome'),
        source: 'default',
        effects: [
            { type: 'ability_unlock', target: 'darkvision', value: 60 }
        ],
        tags: ['vision']
    },
    {
        id: 'gnome_gnome_cunning',
        name: 'Gnome Cunning',
        description: 'Gnomes have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.',
        race: asRace('Gnome'),
        source: 'default',
        tags: ['defense', 'magic']
    },

    // ========================================
    // HALF-ELF TRAITS
    // ========================================
    {
        id: 'half_elf_darkvision',
        name: 'Darkvision',
        description: 'Thanks to your elf blood, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
        race: asRace('Half-Elf'),
        source: 'default',
        effects: [
            { type: 'ability_unlock', target: 'darkvision', value: 60 }
        ],
        tags: ['vision']
    },
    {
        id: 'half_elf_fey_ancestry',
        name: 'Fey Ancestry',
        description: 'Half-elves have advantage on saving throws against being charmed, and magic can\'t put them to sleep.',
        race: asRace('Half-Elf'),
        source: 'default',
        tags: ['defense', 'magic']
    },
    {
        id: 'half_elf_skill_versatility',
        name: 'Skill Versatility',
        description: 'Half-elves gain proficiency in two skills of their choice.',
        race: asRace('Half-Elf'),
        source: 'default',
        tags: ['skill']
    },

    // ========================================
    // HALF-ORC TRAITS
    // ========================================
    {
        id: 'half_orc_darkvision',
        name: 'Darkvision',
        description: 'Thanks to your orc blood, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
        race: asRace('Half-Orc'),
        source: 'default',
        effects: [
            { type: 'ability_unlock', target: 'darkvision', value: 60 }
        ],
        tags: ['vision']
    },
    {
        id: 'half_orc_relentless_endurance',
        name: 'Relentless Endurance',
        description: 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can\'t use this feature again until you finish a long rest.',
        race: asRace('Half-Orc'),
        source: 'default',
        tags: ['survival']
    },
    {
        id: 'half_orc_savage_attacks',
        name: 'Savage Attacks',
        description: 'When you score a critical hit with a melee weapon attack, you can roll one of the weapon\'s damage dice one additional time and add it to the extra damage of the critical hit.',
        race: asRace('Half-Orc'),
        source: 'default',
        tags: ['combat', 'damage']
    },

    // ========================================
    // TIEFLING TRAITS
    // ========================================
    {
        id: 'tiefling_darkvision',
        name: 'Darkvision',
        description: 'Thanks to your infernal heritage, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.',
        race: asRace('Tiefling'),
        source: 'default',
        effects: [
            { type: 'ability_unlock', target: 'darkvision', value: 60 }
        ],
        tags: ['vision']
    },
    {
        id: 'tiefling_hellish_resistance',
        name: 'Hellish Resistance',
        description: 'Tieflings have resistance to fire damage.',
        race: asRace('Tiefling'),
        source: 'default',
        tags: ['defense']
    },
    {
        id: 'tiefling_infernal_legacy',
        name: 'Infernal Legacy',
        description: 'Tieflings know the thaumaturgy cantrip. When you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.',
        race: asRace('Tiefling'),
        source: 'default',
        tags: ['magic', 'spell']
    }
];