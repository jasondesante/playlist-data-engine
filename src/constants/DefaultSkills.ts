/**
 * Default Skills
 *
 * Default D&D 5e skills with complete metadata.
 * These skills are loaded into the SkillQuery on initialization.
 */

import type { CustomSkill } from '../core/skills/SkillTypes.js';
import type { Ability } from '../core/types/Character.js';

/**
 * Default 18 D&D 5e skills
 *
 * Each skill includes:
 * - id: Unique identifier (lowercase_with_underscores)
 * - name: Display name
 * - ability: Associated ability score
 * - armorPenalty: Whether armor disadvantage applies
 * - categories: Optional groupings for filtering
 * - source: 'default' for core D&D 5e skills
 * - description: What the skill covers
 */
export const DEFAULT_SKILLS: CustomSkill[] = [
    // STR-based skills
    {
        id: 'athletics',
        name: 'Athletics',
        ability: 'STR' as Ability,
        armorPenalty: true,
        categories: ['physical', 'exploration', 'combat'],
        source: 'default',
        description: 'Covers climbing, jumping, swimming, and other physical feats of strength. Use this skill when you need to scale walls, leap across chasms, swim in turbulent waters, or perform any other physical activity that raw strength can accomplish.'
    },

    // DEX-based skills
    {
        id: 'acrobatics',
        name: 'Acrobatics',
        ability: 'DEX' as Ability,
        armorPenalty: true,
        categories: ['physical', 'exploration'],
        source: 'default',
        description: 'Covers balancing, tumbling, and maintaining footing in difficult situations. Use this skill to walk on tightropes, stay on your feet during earthquakes, perform gymnastic feats, and dodge falling objects or area effects.'
    },
    {
        id: 'sleight_of_hand',
        name: 'Sleight of Hand',
        ability: 'DEX' as Ability,
        armorPenalty: true,
        categories: ['physical', 'criminal', 'subterfuge'],
        source: 'default',
        description: 'Covers manual dexterity and fine motor skills such as picking pockets, palming items, and performing magic tricks. Use this skill when you need to steal something unnoticed, hide an object on your person, or manipulate small objects with precision.'
    },
    {
        id: 'stealth',
        name: 'Stealth',
        ability: 'DEX' as Ability,
        armorPenalty: true,
        categories: ['physical', 'subterfuge', 'exploration'],
        source: 'default',
        description: 'Covers hiding, moving silently, and avoiding detection. Use this skill when you want to sneak past guards, hide in shadows, stalk prey, or conceal yourself from enemies. Your environment matters—darkness and cover provide advantage.'
    },

    // INT-based skills
    {
        id: 'arcana',
        name: 'Arcana',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'magic'],
        source: 'default',
        description: 'Covers knowledge about magical theory, arcane traditions, magical creatures, and the planes. Use this skill to identify magical items, understand spells, recognize arcane symbols, and recall lore about wizards, dragons, and other magical phenomena.'
    },
    {
        id: 'history',
        name: 'History',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge'],
        source: 'default',
        description: 'Covers knowledge about historical events, legendary figures, ancient civilizations, and past conflicts. Use this skill to recall the origins of ruins, identify royal lineages, understand the significance of ancient documents, and recognize historical artifacts.'
    },
    {
        id: 'investigation',
        name: 'Investigation',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'exploration'],
        source: 'default',
        description: 'Covers deductive reasoning, analyzing clues, and piecing together information. Use this skill when you need to deduce the composition of an object, follow tracks, interpret coded messages, or draw conclusions from scattered evidence.'
    },
    {
        id: 'nature',
        name: 'Nature',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'environmental'],
        source: 'default',
        description: 'Covers knowledge about plants, animals, weather, and the natural world. Use this skill to identify plants and beasts, predict weather changes, understand terrain, and recall lore about the wilderness and its inhabitants.'
    },
    {
        id: 'religion',
        name: 'Religion',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge'],
        source: 'default',
        description: 'Covers knowledge about deities, religious traditions, divine magic, and the planes of existence. Use this skill to recognize religious symbols, understand divine spells, identify outsiders, and recall lore about gods, angels, and religious cults.'
    },

    // WIS-based skills
    {
        id: 'animal_handling',
        name: 'Animal Handling',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['environmental', 'social'],
        source: 'default',
        description: 'Covers calming, training, and understanding animals. Use this skill when you need to control a mount, calm a frightened beast, read an animal\'s mood, or predict how an animal might react. This skill doesn\'t work on creatures with Intelligence higher than 2.'
    },
    {
        id: 'insight',
        name: 'Insight',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['social', 'perception'],
        source: 'default',
        description: 'Covers reading people, detecting lies, and understanding motives. Use this skill to determine when someone is lying to you, sense hidden agendas, gauge someone\'s true feelings, or predict how someone might act in a social situation.'
    },
    {
        id: 'medicine',
        name: 'Medicine',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'practical'],
        source: 'default',
        description: 'Covers diagnosing illnesses, treating wounds, and stabilizing dying creatures. Use this skill to determine the cause of a strange illness, assess the severity of injuries, provide first aid, or stabilize a dying companion. This skill does not cover magical healing.'
    },
    {
        id: 'perception',
        name: 'Perception',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['perception', 'exploration'],
        source: 'default',
        description: 'Covers awareness of your surroundings and noticing hidden things. Use this skill to spot hidden enemies, find secret doors, hear approaching creatures, detect ambushes, or notice unusual details in your environment. This is the most commonly used skill in the game.'
    },
    {
        id: 'survival',
        name: 'Survival',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['environmental', 'exploration'],
        source: 'default',
        description: 'Covers following tracks, hunting, foraging, and navigating in the wilderness. Use this skill to follow creature tracks, find food and water, predict weather, navigate without a map, or avoid natural hazards. This skill is essential for wilderness adventures.'
    },

    // CHA-based skills
    {
        id: 'deception',
        name: 'Deception',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social', 'subterfuge'],
        source: 'default',
        description: 'Covers lying, misdirection, and hiding the truth. Use this skill when you need to convincingly tell a falsehood, maintain a cover identity, pass hidden messages, or trick someone into believing something that isn\'t true. Success depends on plausibility and your target\'s suspicions.'
    },
    {
        id: 'intimidation',
        name: 'Intimidation',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social', 'combat'],
        source: 'default',
        description: 'Covers frightening others and forcing compliance through threats. Use this skill when you want to scare someone into backing down, extract information through fear, force a prisoner to talk, or make an opponent hesitate. Physical presence and reputation can provide advantage.'
    },
    {
        id: 'performance',
        name: 'Performance',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social', 'entertainment'],
        source: 'default',
        description: 'Covers entertaining audiences through music, acting, storytelling, or other arts. Use this skill when you need to captivate an audience, earn money through performance, distract guards with entertainment, or pass as a traveling performer. Quality and audience receptiveness affect the DC.'
    },
    {
        id: 'persuasion',
        name: 'Persuasion',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social'],
        source: 'default',
        description: 'Covers influencing others through reason, charm, and good faith. Use this skill when you need to convince someone to see your point of view, negotiate favorable terms, get someone to do you a favor, or rally people to your cause. This skill works best when you\'re being honest.'
    }
];

/**
 * All categories used by default skills
 * Useful for filtering and UI display
 */
export const DEFAULT_SKILL_CATEGORIES = [
    'physical',
    'exploration',
    'combat',
    'criminal',
    'subterfuge',
    'knowledge',
    'magic',
    'environmental',
    'social',
    'perception',
    'practical',
    'entertainment'
];
