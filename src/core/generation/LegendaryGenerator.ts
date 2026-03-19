/**
 * LegendaryGenerator - Generates legendary actions and resistances for boss enemies
 *
 * Provides legendary action generation with:
 * - Deterministic seeded generation
 * - Archetype-appropriate action selection
 * - Configurable legendary resistances per CR tier
 */

import type { EnemyArchetype, EnemyRarity } from '../types/Enemy.js';
import { SeededRNG } from '../../utils/random.js';

/**
 * Legendary action that a boss can perform
 *
 * Legendary actions are special abilities that boss enemies can use at the end
 * of another creature's turn, spending legendary action points (typically 3 per round).
 */
export interface LegendaryAction {
    /** Unique identifier for this action */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the action does */
    description: string;

    /** Cost in legendary action points (1, 2, or 3) */
    cost: number;

    /** Effect description for combat system */
    effect: string;

    /** Damage dice if this action deals damage */
    damage?: string;

    /** Damage type for damaging actions */
    damageType?: string;

    /** Archetypes this action is appropriate for */
    archetypes: EnemyArchetype[];

    /** Tags for filtering and categorization */
    tags?: string[];
}

/**
 * Legendary configuration for a boss enemy
 *
 * Contains all legendary-specific data for a boss-tier enemy.
 */
export interface LegendaryConfig {
    /** Number of legendary resistances per day (usually 3) */
    resistances: number;

    /** Array of legendary actions available to this boss */
    actions: LegendaryAction[];

    /** Optional lair action hint for encounter design */
    lairActionHint?: string;
}

/**
 * Legendary action pool organized by archetype
 *
 * Each archetype has a pool of legendary actions to choose from.
 * Boss enemies receive 3 legendary actions selected from their archetype pool,
 * with at least one movement option guaranteed.
 */
export const LEGENDARY_ACTIONS: Record<EnemyArchetype, LegendaryAction[]> = {
    brute: [
        {
            id: 'tail_attack',
            name: 'Tail Attack',
            description: 'The boss makes a powerful tail strike against one creature within reach.',
            cost: 1,
            effect: 'Melee attack with bonus damage',
            damage: '2d8 + 5',
            damageType: 'bludgeoning',
            archetypes: ['brute'],
            tags: ['melee', 'damage']
        },
        {
            id: 'devour',
            name: 'Devour',
            description: 'The boss devours a nearby creature, healing itself and dealing massive damage.',
            cost: 3,
            effect: 'Massive damage + self heal',
            damage: '4d12 + 5',
            damageType: 'necrotic',
            archetypes: ['brute'],
            tags: ['melee', 'damage', 'heal']
        },
        {
            id: 'trample',
            name: 'Trample',
            description: 'The boss charges forward, crushing creatures in its path.',
            cost: 2,
            effect: 'AoE damage + prone',
            damage: '3d10 + 5',
            damageType: 'bludgeoning',
            archetypes: ['brute'],
            tags: ['aoe', 'damage', 'control']
        },
        {
            id: 'earthquake_slam',
            name: 'Earthquake Slam',
            description: 'The boss strikes the ground, creating a shockwave that knocks nearby creatures prone.',
            cost: 2,
            effect: 'AoE damage + prone',
            damage: '2d10 + 5',
            damageType: 'bludgeoning',
            archetypes: ['brute'],
            tags: ['aoe', 'damage', 'control']
        },
        {
            id: 'rage_smash',
            name: 'Rage Smash',
            description: 'The boss enters a rage and delivers a crushing blow with advantage.',
            cost: 1,
            effect: 'Single target attack with advantage',
            damage: '2d10 + 7',
            damageType: 'bludgeoning',
            archetypes: ['brute'],
            tags: ['melee', 'damage', 'buff']
        },
        {
            id: 'charge',
            name: 'Charge',
            description: 'The boss moves up to its speed and makes a powerful attack.',
            cost: 1,
            effect: 'Movement + melee attack with bonus damage',
            damage: '2d8 + 5',
            damageType: 'piercing',
            archetypes: ['brute'],
            tags: ['movement', 'melee', 'damage']
        }
    ],
    archer: [
        {
            id: 'snipe',
            name: 'Snipe',
            description: 'The boss makes a precise ranged attack against one creature it can see.',
            cost: 1,
            effect: 'Ranged attack with advantage',
            damage: '2d8 + 4',
            damageType: 'piercing',
            archetypes: ['archer'],
            tags: ['ranged', 'damage']
        },
        {
            id: 'volley_shot',
            name: 'Volley Shot',
            description: 'The boss looses multiple arrows at different targets.',
            cost: 2,
            effect: 'Multiple ranged attacks (up to 3 targets)',
            damage: '1d8 + 4',
            damageType: 'piercing',
            archetypes: ['archer'],
            tags: ['ranged', 'aoe', 'damage']
        },
        {
            id: 'disabling_shot',
            name: 'Disabling Shot',
            description: 'The boss fires a shot aimed to disable a creature\'s movement.',
            cost: 1,
            effect: 'Ranged attack + restrained condition',
            damage: '1d8 + 4',
            damageType: 'piercing',
            archetypes: ['archer'],
            tags: ['ranged', 'control']
        },
        {
            id: 'evasive_maneuver',
            name: 'Evasive Maneuver',
            description: 'The boss dashes away without provoking opportunity attacks.',
            cost: 1,
            effect: 'Disengage + movement bonus',
            archetypes: ['archer'],
            tags: ['movement', 'defense']
        },
        {
            id: 'shadow_step',
            name: 'Shadow Step',
            description: 'The boss teleports to a nearby location and can make an attack.',
            cost: 2,
            effect: 'Teleport + optional ranged attack',
            damage: '2d6 + 4',
            damageType: 'necrotic',
            archetypes: ['archer'],
            tags: ['movement', 'damage']
        },
        {
            id: 'multi_shot',
            name: 'Multi-Shot',
            description: 'The boss fires a barrage of arrows in a cone.',
            cost: 3,
            effect: 'Cone AoE damage',
            damage: '3d6 + 4',
            damageType: 'piercing',
            archetypes: ['archer'],
            tags: ['aoe', 'damage']
        }
    ],
    support: [
        {
            id: 'rally',
            name: 'Rally',
            description: 'The boss lets out a commanding cry, granting an ally an immediate attack.',
            cost: 1,
            effect: 'Adjacent ally makes immediate attack',
            archetypes: ['support'],
            tags: ['ally', 'buff']
        },
        {
            id: 'frightful_presence',
            name: 'Frightful Presence',
            description: 'The boss exudes an aura of terror, forcing creatures to make a fear save.',
            cost: 1,
            effect: 'AoE fear save or frightened',
            archetypes: ['support'],
            tags: ['aoe', 'control', 'fear']
        },
        {
            id: 'healing_aura',
            name: 'Healing Aura',
            description: 'The boss channels power, healing itself and nearby allies.',
            cost: 2,
            effect: 'Heal self + adjacent allies (3d6 + CHA mod)',
            archetypes: ['support'],
            tags: ['heal', 'ally', 'aoe']
        },
        {
            id: 'dispel_magic',
            name: 'Dispel Magic',
            description: 'The boss attempts to end a spell affecting it or an ally.',
            cost: 1,
            effect: 'Counter one spell effect',
            archetypes: ['support'],
            tags: ['utility', 'defense']
        },
        {
            id: 'command_ally',
            name: 'Command Ally',
            description: 'The boss telepathically commands an ally to take an action.',
            cost: 2,
            effect: 'Ally takes immediate action',
            archetypes: ['support'],
            tags: ['ally', 'control']
        },
        {
            id: 'shield_bash',
            name: 'Shield Bash',
            description: 'The boss strikes with its shield, dealing damage and potentially stunning.',
            cost: 1,
            effect: 'Melee damage + potential stun',
            damage: '2d6 + 3',
            damageType: 'bludgeoning',
            archetypes: ['support'],
            tags: ['melee', 'damage', 'control']
        },
        {
            id: 'tactical_reposition',
            name: 'Tactical Reposition',
            description: 'The boss moves strategically to a better position without provoking opportunity attacks.',
            cost: 1,
            effect: 'Movement + disengage',
            archetypes: ['support'],
            tags: ['movement', 'defense']
        }
    ]
};

/**
 * Universal legendary actions available to all archetypes
 *
 * These actions can be selected for any boss regardless of archetype.
 */
const UNIVERSAL_LEGENDARY_ACTIONS: LegendaryAction[] = [
    {
        id: 'teleport',
        name: 'Teleport',
        description: 'The boss instantly teleports to a nearby location without provoking opportunity attacks.',
        cost: 2,
        effect: 'Instant movement without opportunity attacks',
        archetypes: ['brute', 'archer', 'support'],
        tags: ['movement', 'defense']
    },
    {
        id: 'detect',
        name: 'Detect',
        description: 'The boss attunes its senses, detecting invisible or hidden creatures.',
        cost: 1,
        effect: 'Reveal invisible/hidden creatures nearby',
        archetypes: ['brute', 'archer', 'support'],
        tags: ['utility', 'information']
    }
];

/**
 * Legendary resistances per CR tier
 *
 * Bosses gain a number of legendary resistances per day (typically 3).
 * Higher CR bosses may have more legendary resistances.
 */
export const LEGENDARY_RESISTANCES: Record<number, number> = {
    // CR 1-4: 3 per day
    1: 3,
    2: 3,
    3: 3,
    4: 3,
    // CR 5-10: 3 per day (standard)
    5: 3,
    6: 3,
    7: 3,
    8: 3,
    9: 3,
    10: 3,
    // CR 11-15: 4 per day
    11: 4,
    12: 4,
    13: 4,
    14: 4,
    15: 4,
    // CR 16-20: 5 per day
    16: 5,
    17: 5,
    18: 5,
    19: 5,
    20: 5,
    // CR 21+: 6 per day (ancient dragons, demon lords, etc.)
    21: 6
};

/**
 * Legendary action count per boss tier
 *
 * Defines how many legendary actions a boss receives (always 3 for standard bosses).
 */
export const LEGENDARY_ACTION_COUNT = 3;

/**
 * LegendaryGenerator - Static class for legendary action generation
 *
 * Generates legendary actions and resistances for boss-tier enemies.
 * All generation is deterministic based on the provided seed.
 *
 * @example
 * ```typescript
 * const legendary = LegendaryGenerator.generate({
 *   archetype: 'brute',
 *   cr: 8,
 *   seed: 'dragon-lair-1'
 * });
 * // Returns: { resistances: 3, actions: [...], lairActionHint?: string }
 * ```
 */
export class LegendaryGenerator {
    /**
     * Generate legendary configuration for a boss enemy
     *
     * Selects 3 legendary actions for the boss based on archetype,
     * with at least one movement option guaranteed.
     *
     * @param options - Generation options
     * @returns Legendary configuration with actions and resistances
     *
     * @example
     * ```typescript
     * const config = LegendaryGenerator.generate({
     *   archetype: 'brute',
     *   cr: 8,
     *   seed: 'boss-1'
     * });
     * console.log(config.actions); // 3 legendary actions
     * console.log(config.resistances); // 3 per day
     * ```
     */
    static generate(options: {
        archetype: EnemyArchetype;
        cr: number;
        seed: string;
    }): LegendaryConfig {
        const { archetype, cr, seed } = options;

        // Get number of legendary resistances
        const resistances = LegendaryGenerator.getResistancesForCR(cr);

        // Create RNG for deterministic selection
        const rng = new SeededRNG(seed);

        // Get legendary actions for this archetype plus universal actions
        const archetypeActions = LEGENDARY_ACTIONS[archetype] || [];
        const availableActions = [...archetypeActions, ...UNIVERSAL_LEGENDARY_ACTIONS];

        // Select 3 legendary actions with guaranteed movement option
        const actions = LegendaryGenerator.selectLegendaryActions(
            availableActions,
            rng
        );

        // Generate optional lair action hint (20% chance)
        const lairActionHint = rng.random() < 0.2
            ? LegendaryGenerator.generateLairActionHint(archetype, rng)
            : undefined;

        return {
            resistances,
            actions,
            lairActionHint
        };
    }

    /**
     * Generate legendary configuration using an existing SeededRNG instance
     *
     * Same as generate() but accepts a pre-existing RNG for internal use.
     *
     * @param options - Generation options with RNG instance
     * @returns Legendary configuration
     */
    static generateWithRNG(options: {
        archetype: EnemyArchetype;
        cr: number;
        rng: SeededRNG;
    }): LegendaryConfig {
        const { archetype, cr, rng } = options;

        // Get number of legendary resistances
        const resistances = LegendaryGenerator.getResistancesForCR(cr);

        // Get legendary actions for this archetype plus universal actions
        const archetypeActions = LEGENDARY_ACTIONS[archetype] || [];
        const availableActions = [...archetypeActions, ...UNIVERSAL_LEGENDARY_ACTIONS];

        // Select 3 legendary actions with guaranteed movement option
        const actions = LegendaryGenerator.selectLegendaryActions(
            availableActions,
            rng
        );

        // Generate optional lair action hint (20% chance)
        const lairActionHint = rng.random() < 0.2
            ? LegendaryGenerator.generateLairActionHint(archetype, rng)
            : undefined;

        return {
            resistances,
            actions,
            lairActionHint
        };
    }

    /**
     * Select legendary actions from the available pool
     *
     * Selects exactly 3 legendary actions with the following rules:
     * - At least one movement option (tags include 'movement')
     * - Actions are selected without replacement
     * - Uses weighted selection favoring variety
     *
     * @param availableActions - Pool of actions to select from
     * @param rng - Seeded RNG for deterministic selection
     * @returns Array of 3 legendary actions
     */
    private static selectLegendaryActions(
        availableActions: LegendaryAction[],
        rng: SeededRNG
    ): LegendaryAction[] {
        // Separate movement and non-movement actions
        const movementActions = availableActions.filter(a =>
            a.tags?.includes('movement')
        );
        const otherActions = availableActions.filter(a =>
            !a.tags?.includes('movement')
        );

        const selected: LegendaryAction[] = [];
        const usedIds = new Set<string>();

        // Always include at least one movement action if available
        if (movementActions.length > 0) {
            const availableMovement = movementActions.filter(a => !usedIds.has(a.id));
            if (availableMovement.length > 0) {
                const movementAction = rng.randomChoice(availableMovement);
                selected.push(movementAction);
                usedIds.add(movementAction.id);
            }
        }

        // Fill remaining slots with random actions (prefer variety)
        const remainingCount = LEGENDARY_ACTION_COUNT - selected.length;
        const availablePool = availableActions.filter(a => !usedIds.has(a.id));

        // Shuffle the pool for variety
        const shuffled = rng.shuffle(availablePool);

        for (let i = 0; i < remainingCount && i < shuffled.length; i++) {
            selected.push(shuffled[i]!);
        }

        return selected;
    }

    /**
     * Get legendary resistances for a given CR
     *
     * Returns the number of legendary resistances per day based on CR.
     * Uses the closest CR tier (rounds up for in-between values).
     *
     * @param cr - Challenge rating
     * @returns Number of legendary resistances per day
     *
     * @example
     * ```typescript
     * LegendaryGenerator.getResistancesForCR(5); // 3
     * LegendaryGenerator.getResistancesForCR(12); // 4
     * LegendaryGenerator.getResistancesForCR(20); // 5
     * ```
     */
    static getResistancesForCR(cr: number): number {
        // Find the highest CR tier that is <= the given CR
        const crTiers = Object.keys(LEGENDARY_RESISTANCES)
            .map(Number)
            .sort((a, b) => b - a); // Sort descending

        for (const tier of crTiers) {
            if (cr >= tier) {
                return LEGENDARY_RESISTANCES[tier]!;
            }
        }

        // Default fallback
        return 3;
    }

    /**
     * Generate a lair action hint for encounter design
     *
     * Creates a brief description of what lair actions this boss
     * might have, for use by game masters when designing encounters.
     *
     * @param archetype - Boss archetype for thematic hints
     * @param rng - Seeded RNG
     * @returns Lair action hint string
     */
    private static generateLairActionHint(
        archetype: EnemyArchetype,
        rng: SeededRNG
    ): string {
        const bruteHints = [
            'Cave-in risk: Sections of ceiling may collapse on initiative count 20',
            'Lair tremors: DEX save or fall prone at start of each round',
            'Crushing walls: Walls slowly close in, dealing damage each round'
        ];

        const archerHints = [
            'Covering fire: Minions provide ranged support from elevated positions',
            'Trapped corridors: DEX save or trigger arrow traps/magical wards',
            'Shadow passages: Boss can teleport between pre-designated shadow points'
        ];

        const supportHints = [
            'Aura of command: Allies gain advantage on attacks within 30ft of boss',
            'Reinforcement calls: Minions arrive in waves on rounds 3 and 5',
            'Lair wards: Magical barriers provide boss temporary protection'

        ];

        const hints = {
            brute: bruteHints,
            archer: archerHints,
            support: supportHints
        };

        const archetypeHints = hints[archetype] || bruteHints;
        return rng.randomChoice(archetypeHints);
    }

    /**
     * Get legendary action by ID
     *
     * Searches all action pools for a matching ID.
     *
     * @param id - Action ID to find
     * @returns Legendary action if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const action = LegendaryGenerator.getActionById('teleport');
     * console.log(action?.name); // 'Teleport'
     * ```
     */
    static getActionById(id: string): LegendaryAction | undefined {
        // Search archetype pools
        for (const actions of Object.values(LEGENDARY_ACTIONS)) {
            const found = actions.find(a => a.id === id);
            if (found) return found;
        }

        // Search universal pool
        return UNIVERSAL_LEGENDARY_ACTIONS.find(a => a.id === id);
    }

    /**
     * Get all legendary actions for an archetype
     *
     * Returns archetype-specific actions plus universal actions.
     *
     * @param archetype - Enemy archetype
     * @returns Array of legendary actions
     *
     * @example
     * ```typescript
     * const actions = LegendaryGenerator.getActionsForArchetype('brute');
     * // Returns: [...bruteActions, ...universalActions]
     * ```
     */
    static getActionsForArchetype(archetype: EnemyArchetype): LegendaryAction[] {
        const archetypeActions = LEGENDARY_ACTIONS[archetype] || [];
        return [...archetypeActions, ...UNIVERSAL_LEGENDARY_ACTIONS];
    }

    /**
     * Check if a rarity tier should have legendary actions
     *
     * Only boss rarity receives legendary actions.
     *
     * @param rarity - Enemy rarity tier
     * @returns True if rarity should have legendary actions
     *
     * @example
     * ```typescript
     * LegendaryGenerator.shouldHaveLegendary('boss'); // true
     * LegendaryGenerator.shouldHaveLegendary('elite'); // false
     * ```
     */
    static shouldHaveLegendary(rarity: EnemyRarity): boolean {
        return rarity === 'boss';
    }
}
