/**
 * Test Helper Functions for Combat System Tests
 *
 * Provides helpers for building mock Combatant objects, test parties,
 * and test enemies for use across all combat unit tests.
 *
 * Three main helpers:
 * - createTestCombatant(overrides?) — lightweight mock Combatant for isolated tests
 * - createTestParty(level, count?) — array of Combatants via CombatEngine.startCombat
 * - createTestEnemy(cr, rarity?) — Combatant from a real EnemyGenerator output
 */

import type { CharacterSheet, AbilityScores } from '../../src/core/types/Character.js';
import type { Combatant, CombatInstance } from '../../src/core/types/Combat.js';
import { CombatEngine } from '../../src/core/combat/CombatEngine.js';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator.js';
import { createMockPartyCharacter } from './enemyTestHelpers.js';

// ─── Utility ─────────────────────────────────────────────────────────────────

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ─── createTestCombatant ─────────────────────────────────────────────────────

/**
 * Minimal default ability scores for a test combatant.
 */
const DEFAULT_ABILITY_SCORES: AbilityScores = {
  STR: 10,
  DEX: 10,
  CON: 10,
  INT: 10,
  WIS: 10,
  CHA: 10,
};

/**
 * Minimal default character sheet for a test combatant.
 * Only includes fields required by CharacterSheet and CombatEngine.createCombatant().
 */
function defaultTestCharacter(): CharacterSheet {
  const scores = DEFAULT_ABILITY_SCORES;
  return {
    name: 'Test Combatant',
    race: 'Human' as any,
    class: 'Fighter' as any,
    level: 1,
    ability_scores: { ...scores },
    ability_modifiers: {
      STR: getModifier(scores.STR),
      DEX: getModifier(scores.DEX),
      CON: getModifier(scores.CON),
      INT: getModifier(scores.INT),
      WIS: getModifier(scores.WIS),
      CHA: getModifier(scores.CHA),
    },
    proficiency_bonus: 2,
    hp: { current: 10, max: 10, temp: 0 },
    armor_class: 10 + getModifier(scores.DEX),
    initiative: getModifier(scores.DEX),
    speed: 30,
    skills: {},
    saving_throws: {} as any,
    racial_traits: [],
    class_features: [],
    spells: {
      spell_slots: {},
      known_spells: [],
      cantrips: [],
    },
    equipment: {
      weapons: [],
      armor: [],
      items: [],
      totalWeight: 0,
      equippedWeight: 0,
    },
    xp: { current: 0, next_level: 300 },
    seed: 'test-combatant-seed',
    generated_at: new Date().toISOString(),
  };
}

/**
 * Combatant-level overrides for createTestCombatant.
 *
 * Separated from CharacterSheet overrides so callers can tweak combat-specific
 * fields (currentHP, isDefeated, statusEffects, etc.) independently.
 */
export interface TestCombatantOverrides {
  id?: string;
  currentHP?: number;
  temporaryHP?: number;
  initiative?: number;
  isDefeated?: boolean;
  actionUsed?: boolean;
  bonusActionUsed?: boolean;
  reactionUsed?: boolean;
  statusEffects?: Combatant['statusEffects'];
  spellSlots?: Combatant['spellSlots'];
  position?: Combatant['position'];
  concentratingOn?: Combatant['concentratingOn'];
  legendaryActionsRemaining?: number;
  legendaryResistancesRemaining?: number;
}

/**
 * Create a mock Combatant for unit testing.
 *
 * Returns a lightweight Combatant object without needing to run CombatEngine.
 * The underlying CharacterSheet is built from sensible defaults with any
 * overrides applied. Combat-specific fields (HP, status effects, etc.)
 * can be overridden via `combatantOverrides`.
 *
 * @param characterOverrides - Override fields on the underlying CharacterSheet
 * @param combatantOverrides - Override fields on the Combatant itself
 * @returns A fully-formed Combatant for testing
 *
 * @example
 * ```ts
 * // Basic combatant with defaults
 * const c = createTestCombatant();
 *
 * // High-HP fighter with a weapon
 * const tank = createTestCombatant(
 *   { name: 'Tank', hp: { current: 45, max: 45, temp: 0 }, armor_class: 18 },
 *   { currentHP: 45 }
 * );
 *
 * // Defeated combatant
 * const dead = createTestCombatant(
 *   { name: 'Dead Goblin' },
 *   { isDefeated: true, currentHP: 0 }
 * );
 *
 * // Caster with spell slots
 * const wizard = createTestCombatant(
 *   {
 *     name: 'Wizard',
 *     class: 'Wizard' as any,
 *     ability_scores: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 13, CHA: 10 },
 *     ability_modifiers: { STR: -1, DEX: 2, CON: 1, INT: 4, WIS: 1, CHA: 0 },
 *   },
 *   { spellSlots: { 1: 4, 2: 3, 3: 2 } }
 * );
 * ```
 */
export function createTestCombatant(
  characterOverrides?: Partial<CharacterSheet>,
  combatantOverrides?: TestCombatantOverrides,
): Combatant {
  const character: CharacterSheet = {
    ...defaultTestCharacter(),
    ...characterOverrides,
  };

  // Re-derive ability modifiers if ability_scores changed
  if (characterOverrides?.ability_scores) {
    character.ability_modifiers = {
      STR: getModifier(character.ability_scores.STR),
      DEX: getModifier(character.ability_scores.DEX),
      CON: getModifier(character.ability_scores.CON),
      INT: getModifier(character.ability_scores.INT),
      WIS: getModifier(character.ability_scores.WIS),
      CHA: getModifier(character.ability_scores.CHA),
    };
  }

  return {
    id: combatantOverrides?.id ?? 'test_combatant_0',
    character,
    initiative: combatantOverrides?.initiative ?? getModifier(character.ability_scores.DEX),
    currentHP: combatantOverrides?.currentHP ?? character.hp.max,
    temporaryHP: combatantOverrides?.temporaryHP ?? 0,
    statusEffects: combatantOverrides?.statusEffects ?? [],
    isDefeated: combatantOverrides?.isDefeated ?? false,
    actionUsed: combatantOverrides?.actionUsed ?? false,
    bonusActionUsed: combatantOverrides?.bonusActionUsed ?? false,
    reactionUsed: combatantOverrides?.reactionUsed ?? false,
    spellSlots: combatantOverrides?.spellSlots,
    position: combatantOverrides?.position,
    concentratingOn: combatantOverrides?.concentratingOn,
    legendaryActionsRemaining: combatantOverrides?.legendaryActionsRemaining ??
      (character.legendary_config ? 3 : undefined),
    legendaryResistancesRemaining: combatantOverrides?.legendaryResistancesRemaining ??
      (character.legendary_config ? character.legendary_config.resistances_per_day : undefined),
  };
}

// ─── createTestParty ─────────────────────────────────────────────────────────

/**
 * Create an array of Combatants representing a player party.
 *
 * Uses CombatEngine.startCombat() to produce fully-initialized combatants
 * (with spell slots, initiative rolls, etc.). The party members are created
 * via the existing `createMockPartyCharacter` helper from enemyTestHelpers.
 *
 * @param level - Level for all party members (default: 1)
 * @param count - Number of party members (default: 4)
 * @param baseName - Name prefix for each member (default: 'Adventurer')
 * @returns Array of Combatant objects as produced by CombatEngine
 *
 * @example
 * ```ts
 * // 4 level-5 adventurers
 * const party = createTestParty(5);
 *
 * // 2 level-10 characters
 * const duo = createTestParty(10, 2);
 * ```
 */
export function createTestParty(
  level: number = 1,
  count: number = 4,
  baseName: string = 'Adventurer',
): Combatant[] {
  const characters = Array.from({ length: count }, (_, i) =>
    createMockPartyCharacter(level, { name: `${baseName} ${i + 1}` }),
  );

  const engine = new CombatEngine();
  const combat = engine.startCombat(characters, []);
  return combat.combatants;
}

// ─── createTestEnemy ─────────────────────────────────────────────────────────

/**
 * Create a Combatant from a real generated enemy via EnemyGenerator.
 *
 * Uses CombatEngine.startCombat() to fully initialize the enemy combatant
 * (with spell slots, initiative, etc.) from an actual generated
 * CharacterSheet. This ensures tests exercise the real data pipeline.
 *
 * @param cr - Challenge Rating for the enemy (default: 1)
 * @param rarity - Enemy rarity tier (default: 'common')
 * @param seed - Seed for deterministic generation (default: 'test-enemy')
 * @returns A single Combatant from the generated enemy
 *
 * @example
 * ```ts
 * // Basic CR 1 common enemy
 * const goblin = createTestEnemy(1);
 *
 * // CR 5 elite enemy
 * const elite = createTestEnemy(5, 'elite');
 *
 * // CR 10 boss with specific seed
 * const boss = createTestEnemy(10, 'boss', 'my-boss-seed');
 * ```
 */
export function createTestEnemy(
  cr: number = 1,
  rarity: 'common' | 'uncommon' | 'elite' | 'boss' = 'common',
  seed: string = 'test-enemy',
): Combatant {
  const enemyCharacter = EnemyGenerator.generate({ seed, cr, rarity });

  const engine = new CombatEngine();
  const combat = engine.startCombat([], [enemyCharacter]);
  return combat.combatants[0];
}

/**
 * Create a Combatant from a generated enemy and start a combat against
 * a player party, returning the full CombatInstance.
 *
 * Useful for integration tests that need a realistic combat setup
 * with both player and enemy combatants fully initialized.
 *
 * @param playerLevel - Level for the player party
 * @param playerCount - Number of players (default: 4)
 * @param enemyCR - Enemy challenge rating (default: playerLevel)
 * @param enemyRarity - Enemy rarity (default: 'common')
 * @param seed - Seed for deterministic generation (default: 'test-combat')
 * @returns Full CombatInstance with all combatants initialized
 *
 * @example
 * ```ts
 * // Level 5 party vs CR 5 common enemy
 * const combat = createTestCombat(5);
 *
 * // Level 3 party of 2 vs CR 5 elite
 * const hardCombat = createTestCombat(3, 2, 5, 'elite');
 * ```
 */
export function createTestCombat(
  playerLevel: number = 1,
  playerCount: number = 4,
  enemyCR: number = playerLevel,
  enemyRarity: 'common' | 'uncommon' | 'elite' | 'boss' = 'common',
  seed: string = 'test-combat',
): CombatInstance {
  const players = Array.from({ length: playerCount }, (_, i) =>
    createMockPartyCharacter(playerLevel, { name: `Hero ${i + 1}` }),
  );

  const enemyCharacter = EnemyGenerator.generate({
    seed: `${seed}-enemy`,
    cr: enemyCR,
    rarity: enemyRarity,
  });

  const engine = new CombatEngine({ seed });
  return engine.startCombat(players, [enemyCharacter]);
}
