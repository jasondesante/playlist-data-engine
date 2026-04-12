# Combat System Reference

Complete guide to the combat system in the Playlist Data Engine.

---

## Table of Contents

1. [Combat System](#combat-system)
   - [Enemy Generation](#enemy-generation)
   - [Treasure](#treasure)
   - [Box Rewards](#box-rewards)
     - [Awarding Boxes as Treasure](#awarding-boxes-as-treasure)
     - [Opening Box Rewards After Combat](#opening-box-rewards-after-combat)
     - [Box Behavior in Combat Rewards](#box-behavior-in-combat-rewards)
     - [Locked Box Rewards](#locked-box-rewards)
     - [Checking if a Reward Is a Box](#checking-if-a-reward-is-a-box)
     - [Example: Boss Loot Box Configuration](#example-boss-loot-box-configuration)
   - [Spell Casting](#spell-casting)
   - [Combat Actions](#combat-actions)
   - [HP Management](#hp-management)
   - [Query Methods](#query-methods)
   - [Action Economy](#action-economy)
   - [Status Effects](#status-effects)
     - [StatusEffect Interface](#statuseffect-interface)
     - [StatusEffectMechanics Interface](#statuseffectmechanics-interface)
     - [Mechanically Enforced Conditions](#mechanically-enforced-conditions)
     - [Duration Tracking Lifecycle](#duration-tracking-lifecycle)
     - [Applying Status Effects](#applying-status-effects)
     - [Stacking Rules](#stacking-rules)
     - [Concentration Tracking](#concentration-tracking)
     - [Removing Expired Effects](#removing-expired-effects)
     - [Spell-Based Status Effects](#spell-based-status-effects)
     - [Advantage/Disadvantage from Effects](#advantagedisadvantage-from-effects)
   - [Combat History](#combat-history)
   - [Spell Slots](#spell-slots)
   - [Multiple Equipped Weapons](#multiple-equipped-weapons)
   - [Unarmed Combat](#unarmed-combat)
   - [Manual Attack Objects](#manual-attack-objects)
   - [Hit Modes](#hit-modes)
   - [Legendary Actions](#legendary-actions)
     - [LegendaryAction Interface](#legendaryaction-interface)
     - [Combatant Legendary Tracking](#combatant-legendary-tracking)
     - [Action Point Tracking](#action-point-tracking)
     - [Executing Legendary Actions](#executing-legendary-actions)
     - [Legendary Resistances](#legendary-resistances)
     - [AI and Legendary Actions](#ai-and-legendary-actions)
   - [Combat AI](#combat-ai)
     - [AIPlayStyle](#aiplaystyle)
     - [AIConfig](#aiconfig)
     - [AIDecision](#aidecision)
     - [Decision-Making Process](#decision-making-process)
     - [Target Selection](#target-selection)
     - [Weapon Selection](#weapon-selection)
     - [Spell Selection](#spell-selection)
     - [Support Archetype AI](#support-archetype-ai)
     - [AIThreatAssessment](#aithreatassessment)
     - [AICombatRunner](#aicombatrunner)
     - [CombatantMetrics](#combatantmetrics)
   - [Monte Carlo Simulation](#monte-carlo-simulation)
     - [CombatSimulator](#combatsimulator)
     - [SimulationConfig](#simulationconfig)
     - [SimulationResults](#simulationresults)
     - [SimulationSummary](#simulationsummary)
     - [CombatantSimulationMetrics](#combatantsimulationmetrics)
     - [HistogramBucket](#histogrambucket)
     - [Detailed Run Logs](#detailed-run-logs)
     - [Code Examples](#code-examples)
     - [Determinism](#determinism)
     - [Recommended Run Counts](#recommended-run-counts)
2. [See Also](#see-also)

---

## Combat System

```typescript
import {
  CombatEngine,
  CharacterGenerator,
  AudioAnalyzer,
  EnemyGenerator
} from 'playlist-data-engine';

// Initialize combat engine (optional configuration)
const combat = new CombatEngine({
  useEnvironment: true,    // Apply environmental bonuses
  useMusic: false,         // Apply music bonuses (requires audio context)
  tacticalMode: false,     // Enable advanced tactical rules
  maxTurnsBeforeDraw: 100, // Max turns before draw
  seed: 'my-seed'          // Seed for deterministic treasure generation (optional)
});

// Generate player character from audio
const analyzer = new AudioAnalyzer();
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
const playerCharacter = CharacterGenerator.generate(track.id, audioProfile, track);

// Create enemy characters (manually or from a database)
const enemy1 = { /* CharacterSheet */ };
const enemy2 = { /* CharacterSheet */ };

// Start combat - rolls initiative, establishes turn order
const combatInstance = combat.startCombat(
  [playerCharacter],  // Player characters
  [enemy1, enemy2],   // Enemies
  environmentalContext // Optional environmental modifiers
);

// Execute combat turns
while (combatInstance.isActive) {
  const current = combat.getCurrentCombatant(combatInstance);

  // Attack with equipped weapon - engine finds it automatically
  const target = combat.getLivingCombatants(combatInstance).find(c => c.id !== current.id);

  if (target) {
    // Simple: just say who's attacking and who's getting hit
    const action = combat.executeWeaponAttack(combatInstance, current, target);
    console.log(action.result.description);

    if (target.isDefeated) {
      console.log(`${target.character.name} has been defeated!`);
    }
  }

  // Move to next turn
  combat.nextTurn(combatInstance);

  // Check if combat ended
  const result = combat.getCombatResult(combatInstance);
  if (result) {
    console.log(`Combat ended: ${result.description}`);
    console.log(`XP awarded: ${result.xpAwarded}`);
    console.log(`Rounds elapsed: ${result.roundsElapsed}`);

    // Treasure awarded (if seed configured)
    console.log(`Gold: ${result.treasureAwarded.gold}`);
    console.log(`Items: ${result.treasureAwarded.items}`);
    break;
  }
}
```

### Enemy Generation

Generate balanced combat encounters automatically:

```typescript
import {
  CombatEngine,
  EnemyGenerator
} from 'playlist-data-engine';

// Generate a specific enemy by template
const boss = EnemyGenerator.generate({
  seed: 'dungeon-boss-001',
  templateId: 'orc',
  rarity: 'boss'
});
// → Orc Boss with d12 signature ability, +50% stats, 3 extra abilities

// Generate a random enemy matching criteria
const randomEnemy = EnemyGenerator.generate({
  seed: 'wild-encounter-1',
  category: 'humanoid',
  archetype: 'brute',
  rarity: 'elite'
});
// → Random humanoid brute (Orc or Bandit) at elite tier

// Generate encounter balanced for party
const party = [player1, player2, player3, player4];
const enemies = EnemyGenerator.generateEncounter(party, {
  seed: 'dungeon-1-room-5',
  difficulty: 'medium',
  count: 5,
  category: 'beast'
});
// → 5 beast enemies at appropriate CR for party level
// One enemy auto-promotes to elite leader (groups > 3)

// Generate encounter by CR (no party needed)
const cr3Enemies = EnemyGenerator.generateEncounterByCR({
  seed: 'cr3-encounter',
  targetCR: 3,
  count: 4
});
// → 4 enemies at approximately CR 3 each

// Audio-influenced generation
const audioEnemies = EnemyGenerator.generateEncounter(party, {
  seed: 'music-combat',
  audioProfile: audioProfile,
  track: currentTrack,
  count: 4
});
// → Template selection weighted by audio characteristics
// Bass-heavy → more brutes, Treble-heavy → more archers
```

Start combat with generated enemies:

```typescript
const combat = new CombatEngine();
const combatInstance = combat.startCombat(
  party,
  enemies,
  environmentalContext
);
```

> **For complete documentation:** See [ENEMY_GENERATION.md](../../ENEMY_GENERATION.md) for full details on rarity tiers, leader promotion, encounter balance, template system, and API reference.

### Treasure

Configure custom loot rewards:

```typescript
// Fixed gold amount (no randomness)
const combat = new CombatEngine({
  treasure: { gold: 500 }
});

// Gold range with seeded RNG (inclusive)
const combat = new CombatEngine({
  seed: 'dragon-hoard',
  treasure: { gold: { min: 1000, max: 5000 } }
});

// Custom items (weapons, armor, or any Equipment type including boxes)
const combat = new CombatEngine({
  treasure: {
    gold: 100,
    items: [
      { id: 'sword-1', name: 'Longsword +1', type: 'weapon', rarity: 'uncommon', weight: 3 },
      { id: 'potion-1', name: 'Potion of Healing', type: 'item', rarity: 'common', weight: 0.5 }
    ]
  }
});

// Default: 0-99 gold with seeded RNG
const combat = new CombatEngine({ seed: 'goblin-lair-001' });
```

The `treasure` config supports:
- `gold: number` - Fixed amount (always rewards exactly this much)
- `gold: { min, max }` - Random range (uses seed for determinism)
- `items: Equipment[]` - Custom item rewards (weapons, armor, items, or **boxes**)

> **Note:** Treasure rewards are not automatically distributed to any character. The combat engine reports what was earned; it's up to your game to handle inventory management, gold splitting among party members, or whether loot is awarded at all.

### Box Rewards

Boxes are a special `'box'` equipment type that contain other items. They can be awarded as treasure and are passed through the combat system **unopened** — your game code decides when and how to open them.

#### Awarding Boxes as Treasure

```typescript
import { CombatEngine } from 'playlist-data-engine';

// Award a box directly in treasure config
const combat = new CombatEngine({
  seed: 'goblin-cave-007',
  treasure: {
    gold: 50,
    items: [
      {
        id: 'goblin-chest-1',
        name: 'Goblin Treasure Chest',
        type: 'box',
        rarity: 'uncommon',
        weight: 5,
        boxContents: {
          drops: [{
            pool: [
              { weight: 40, itemName: 'Shortsword' },
              { weight: 30, itemName: 'Leather Armor' },
              { weight: 20, itemName: "Thieves' Tools" },
              { weight: 10, gold: 50 }
            ]
          }]
        },
        tags: ['loot', 'treasure', 'goblin'],
        description: 'A small chest from a goblin hoard.'
      }
    ]
  }
});
```

#### Opening Box Rewards After Combat

After combat ends, use `EquipmentSpawnHelper.openBoxForCharacter()` to open any boxes in the character's inventory:

```typescript
import {
  CombatEngine,
  EquipmentSpawnHelper,
  SeededRNG
} from 'playlist-data-engine';

// Combat ends - check result for awarded items
const combatResult = combat.getCombatResult(combatInstance);
if (combatResult) {
  // Add awarded items to the character's inventory first
  for (const item of combatResult.treasureAwarded.items) {
    EquipmentSpawnHelper.addToCharacter(character, item);
  }

  // Now open any boxes the character received
  const rng = new SeededRNG('open-rewards');
  const openResult = EquipmentSpawnHelper.openBoxForCharacter(
    character,
    'Goblin Treasure Chest',
    rng
  );

  if (openResult) {
    character = openResult.character; // Updated character (box removed, contents added)
    console.log(`Gold from chest: ${openResult.result.gold}`);
    console.log(`Items from chest: ${openResult.result.items.map(i => i.name).join(', ')}`);
  }
}
```

#### Box Behavior in Combat Rewards

- **Boxes are always awarded unopened.** The combat engine never auto-opens boxes.
- **Nested boxes stay nested.** If a box contains another box, the inner box is added to inventory unopened.
- **Consumed on open by default.** When opened, boxes are removed from inventory unless `consumeOnOpen: false` is set.
- **Deterministic.** Opening with the same seed and box produces identical contents every time.
- **Locked boxes require items to open.** Boxes with `openRequirements` need specific items (keys, gold coins, etc.) to be consumed from inventory when opened.

#### Locked Box Rewards

Some treasure boxes have **opening requirements** — items that must be consumed from the character's inventory before the box can be opened. This adds strategic decisions: should the player open a locked chest now, save the key for later, or trade the unopened chest?

##### Awarding Locked Boxes as Loot

Locked boxes are configured with `openRequirements` in their `boxContents`:

```typescript
import { CombatEngine } from 'playlist-data-engine';

// A locked chest that requires a key to open
const lockedDungeonChest = {
  id: 'dungeon-chest-001',
  name: 'Dungeon Chest',
  type: 'box' as const,
  rarity: 'uncommon' as const,
  weight: 10,
  boxContents: {
    openRequirements: [
      { itemName: 'Iron Key' }  // Consumes 1 Iron Key when opened
    ],
    drops: [
      { pool: [{ weight: 100, gold: 100 }] },
      { pool: [
        { weight: 40, itemName: 'Longsword' },
        { weight: 35, itemName: 'Chain Mail' },
        { weight: 25, itemName: 'Medical Supply', quantity: 3 }
      ]}
    ]
  },
  tags: ['loot', 'treasure', 'locked', 'dungeon'],
  description: 'A heavy iron-bound chest. Requires an Iron Key to open.'
};

const combat = new CombatEngine({
  seed: 'dungeon-boss-001',
  treasure: {
    gold: { min: 50, max: 150 },
    items: [lockedDungeonChest]
  }
});
```

##### Handling Locked Box Opens After Combat

When a character tries to open a locked box from combat rewards, requirements are checked automatically:

```typescript
import {
  CombatEngine,
  EquipmentSpawnHelper,
  BoxOpener,
  SeededRNG
} from 'playlist-data-engine';

// After combat - add items to inventory first
const combatResult = combat.getCombatResult(combatInstance);
if (combatResult) {
  // Add all awarded items to character inventory
  for (const item of combatResult.treasureAwarded.items) {
    EquipmentSpawnHelper.addToCharacter(character, item);
  }
}

// Later, when player wants to open the chest
const rng = new SeededRNG('open-chest');
const outcome = EquipmentSpawnHelper.openBoxForCharacter(
  character,
  'Dungeon Chest',
  rng
);

if (outcome) {
  if (outcome.result.success) {
    character = outcome.character;
    console.log('Chest opened!');
    console.log('Gold received:', outcome.result.gold);
    console.log('Items received:', outcome.result.items.map(i => i.name));
    console.log('Items consumed:', outcome.result.consumedItems);
    // → Items consumed: [{ name: 'Iron Key', quantity: 1 }]
  } else {
    // Requirements not met
    console.log('Cannot open:', outcome.result.error?.message);
    // → "Cannot open: Missing required item: Iron Key"
  }
}
```

##### Checking Requirements Before Opening

Use `BoxOpener.canOpen()` to check if the character has the required items:

```typescript
// Check if character can open the box (for UI: enable/disable button)
const canOpen = BoxOpener.canOpen(
  dungeonChest,
  character.equipment.items
);

if (!canOpen) {
  // Show what's needed
  const desc = BoxOpener.getRequirementsDescription(dungeonChest);
  console.log(desc); // "Requires: Iron Key"
}

// Get detailed error info if requirements not met
const error = BoxOpener.checkRequirements(dungeonChest, character.equipment.items);
if (error) {
  console.log(error.code);    // 'MISSING_ITEM' or 'INSUFFICIENT_QUANTITY'
  console.log(error.message); // Human-readable message
}
```

##### Multiple Requirements

Boxes can require multiple different items. All requirements must be satisfied:

```typescript
const royalTreasuryBox = {
  name: 'Royal Treasury Box',
  type: 'box' as const,
  rarity: 'very_rare' as const,
  weight: 20,
  boxContents: {
    openRequirements: [
      { itemName: 'Golden Key' },           // 1 Golden Key
      { itemName: 'Gold Coin', quantity: 200 } // 200 Gold Coins
    ],
    drops: [
      { pool: [{ weight: 100, gold: 1000 }] },
      { pool: [
        { weight: 30, itemName: 'Plate Armor' },
        { weight: 25, itemName: 'Greataxe' },
        { weight: 25, itemName: 'Longsword' },
        { weight: 20, itemName: 'Chain Mail' }
      ]}
    ]
  },
  description: 'A royal treasury box. Requires a Golden Key and 200 Gold Coins.'
};

// Preview requirements for UI
const preview = BoxOpener.previewContents(royalTreasuryBox);
console.log(preview.openRequirements);
// → [{ itemName: 'Golden Key' }, { itemName: 'Gold Coin', quantity: 200 }]
```

##### Strategic Loot Design

Consider these patterns when designing locked box rewards:

| Box Type | Requirements | Use Case |
|----------|--------------|----------|
| Key-locked | Single key item | Standard treasure rooms, miniboss drops |
| Gold-locked | Gold Coins (quantity) | Gambling-style boxes, shops |
| Multi-locked | Key + Gold | High-value boss loot, rare treasures |
| Quantity-locked | Multiple of same item | Skill-based rewards (e.g., 3 Lockpicks) |

> **See also:** [EQUIPMENT_SYSTEM.md — Opening Requirements](EQUIPMENT_SYSTEM.md#opening-requirements) for complete documentation of `BoxOpenRequirement`, `BoxOpenError`, and all `BoxOpener` methods.

#### Checking if a Reward Is a Box

```typescript
import { BoxOpener } from 'playlist-data-engine';

for (const item of combatResult.treasureAwarded.items) {
  if (BoxOpener.isBox(item)) {
    console.log(`${item.name} is a box — open it to see contents`);

    // Preview possible contents without opening
    const preview = BoxOpener.previewContents(item);
    console.log(`Possible items: ${preview.possibleItems.join(', ')}`);
    console.log(`Gold range: ${preview.possibleGold.min}–${preview.possibleGold.max}`);
    console.log(`Number of drops: ${preview.totalDrops}`);
  }
}
```

#### Example: Boss Loot Box Configuration

```typescript
// Dragon hoard - guaranteed gold + rare item drop
const dragonHoard = {
  id: 'dragon-hoard-1',
  name: 'Dragon Hoard Chest',
  type: 'box' as const,
  rarity: 'rare' as const,
  weight: 10,
  boxContents: {
    drops: [
      { pool: [{ weight: 100, gold: 500 }] },                          // Always 500 gold
      { pool: [{ weight: 100, itemName: 'Potion of Healing' }] },      // Always a potion
      {
        pool: [                                                          // Random rare item
          { weight: 35, itemName: 'Longsword +1' },
          { weight: 35, itemName: 'Chain Mail +1' },
          { weight: 20, itemName: 'Ring of Protection' },
          { weight: 10, itemName: 'Dragon Slayer Sword' }
        ]
      }
    ]
  },
  tags: ['loot', 'treasure', 'dragon', 'boss'],
  description: "A chest from a dragon's hoard."
};

const combat = new CombatEngine({
  seed: 'dragon-fight-001',
  treasure: { items: [dragonHoard] }
});
```

> **See also:** [EQUIPMENT_SYSTEM.md — Box Equipment Type](EQUIPMENT_SYSTEM.md#box-equipment-type) for complete `BoxDropPool`, `BoxDrop`, `BoxContents`, and `BoxOpenResult` interface documentation.

### Spell Casting

Cast spells with automatic slot consumption:

```typescript
// Cast a spell at one or more targets
const spell = { name: 'Fireball', level: 3, damage: { dice: '8d6', type: 'fire' } };
const targets = [enemy1, enemy2];
const action = combat.executeCastSpell(combatInstance, current, spell, targets);

console.log(action.result.description);
// "Cast Fireball dealing 24 fire damage to Goblin"

// SpellCastResult properties
action.result.success;         // boolean
action.result.spellName;       // 'Fireball'
action.result.caster;          // Combatant who cast
action.result.targets;         // Target combatants
action.result.saveDC;          // Difficulty class (if applicable)
action.result.damage;          // { total: 24, rolls: [...] }
action.result.effectsApplied;  // StatusEffect[] (e.g., Burning)
action.result.spellSlotUsed;   // Slot level consumed (3)
```

Spell slots are consumed automatically based on spell level. Cantrips (`level: 0`) consume no slots. Multi-target spells apply effects to all targets in the array.

### Combat Actions

Defensive and tactical actions:

```typescript
// Dodge: +2 AC until your next turn starts
combat.executeDodge(combatInstance, current);
// "Aragorn takes the Dodge action (AC increased until next turn)"

// Dash: Double your movement speed for this turn
combat.executeDash(combatInstance, current);
// "Aragorn takes the Dash action (double movement)"

// Disengage: Move without provoking opportunity attacks
combat.executeDisengage(combatInstance, current);
// "Aragorn takes the Disengage action (no opportunity attacks provoked)"

// Flee: Leave combat (requires allowFleeing config)
const fleeAction = combat.executeFlee(combatInstance, current);
// "Aragorn flees from combat"
// Combatant removed from active combat, added to history
```

Fleeing requires `allowFleeing: true` in CombatEngine config. The combatant is removed from the active combat instance and a `'flee'` action is recorded in history.

### HP Management

Direct hit point manipulation:

```typescript
// Apply damage - temporary HP is depleted first
combat.applyDamage(target, 15); // Returns damage actually dealt

// Heal combatant - caps at max HP
combat.healCombatant(current, 10); // Returns actual healing (capped at max)

// Apply temporary HP - does NOT stack, uses higher value
combat.applyTemporaryHP(current, 5); // Sets temp HP to 5
combat.applyTemporaryHP(current, 8); // Sets temp HP to 8 (replaces)
```

### Query Methods

Retrieve combat state information:

```typescript
// Get all combatants with HP > 0
const living = combat.getLivingCombatants(combatInstance);
// [{ combatant, isDefeated: false, ... }, ...]

// Get all defeated combatants (HP ≤ 0)
const defeated = combat.getDefeatedCombatants(combatInstance);
// [{ combatant, isDefeated: true, ... }, ...]

// Get formatted status summary of current combat state
const summary = combat.getCombatSummary(combatInstance);
// "Combatants: 3 (Living: 2, Defeated: 1)\nRound: 5, Turn: 12"

// Get current combatant whose turn it is
const current = combat.getCurrentCombatant(combatInstance);
// { combatant: {...}, isDefeated: false, ... }
```

### Action Economy

Each combatant tracks action usage per turn:

```typescript
// Check action economy state
const combatant = combatInstance.combatants[0];
combatant.actionUsed;        // boolean - action consumed this turn
combatant.bonusActionUsed;   // boolean - bonus action consumed
combatant.reactionUsed;      // boolean - reaction consumed

// One action, one bonus action, one reaction per turn
// Flags automatically reset when nextTurn() is called

// Most actions (attacks, spells) consume the main action
// Bonus actions require explicit tracking via executeBonusAction()
// Reactions (opportunity attacks) consume reaction flag
```

Action economy enforcement is manual - check flags before executing actions that should consume specific action types.

### Status Effects

Status effects are temporary conditions that modify how a combatant functions in combat. They can deal damage, impose advantage/disadvantage, skip turns, and more. The engine tracks durations, enforces mechanical effects, and manages concentration.

#### StatusEffect Interface

```typescript
interface StatusEffect {
  name: string;           // e.g., 'Burning', 'Charmed', 'Stunned'
  description: string;    // Human-readable description
  duration: number;       // Rounds remaining (decremented each turn)
  source?: string;        // Combatant ID that applied the effect
  hasConcentration?: boolean;  // Requires caster to maintain concentration

  icon?: string;          // Optional icon URL for UI display
  image?: string;         // Optional image URL for larger display

  damage?: number;        // Damage dealt at start of each of the affected combatant's turns
  damageType?: DamageType; // Damage type for the effect's damage (e.g., 'fire')

  mechanicalEffects?: StatusEffectMechanics;  // Combat rules enforced by the engine
}
```

#### StatusEffectMechanics Interface

The `mechanicalEffects` field controls what the engine enforces automatically:

```typescript
interface StatusEffectMechanics {
  disadvantageOnAttackNonSource?: boolean;  // Charmed: disadvantage on attacks vs non-source
  disadvantageOnAttack?: boolean;           // Frightened/Prone: disadvantage on all attacks
  disadvantageOnAbilityChecks?: boolean;    // Frightened: disadvantage on ability checks
  advantageOnMeleeAttackAgainst?: boolean;  // Prone: melee attacks against this target have advantage
  advantageOnRangedAttackAgainst?: boolean; // Prone: ranged attacks against this target have advantage
  disadvantageOnDexSaves?: boolean;         // Stunned/Paralyzed/Restrained: disadvantage on DEX saves
  speedZero?: boolean;                      // Stunned/Paralyzed/Restrained: speed set to 0
  skipTurn?: boolean;                       // Stunned/Paralyzed: skip turn entirely
  damageImmunity?: DamageType;              // Immune to a specific damage type
  damageResistance?: DamageType;            // Resist a specific damage type (half damage)
  damageVulnerability?: DamageType;         // Vulnerable to a specific damage type (double damage)
}
```

#### Mechanically Enforced Conditions

The engine automatically enforces combat rules for the following conditions:

| Condition | Concentration | Mechanical Effects |
|-----------|:---:|---|
| **Charmed** | Yes | Disadvantage on attack rolls against targets other than the source |
| **Frightened** | Yes | Disadvantage on attack rolls and ability checks |
| **Stunned** | No | Disadvantage on DEX saves, speed 0, skip turn entirely |
| **Paralyzed** | No | Disadvantage on DEX saves, speed 0, skip turn entirely |
| **Restrained** | Yes | Disadvantage on DEX saves, speed 0 |
| **Poisoned** | No | Disadvantage on attack rolls and ability checks |
| **Blinded** | No | Disadvantage on attack rolls and ability checks |
| **Deafened** | No | (No mechanical effects — tagged for spell system use) |
| **Burning** | No | Deals `damage` fire damage at start of each turn |

> **Note:** Prone is listed in D&D 5e rules but is not currently mapped as a tag-based status effect. It can be applied manually with `advantageOnMeleeAttackAgainst`, `advantageOnRangedAttackAgainst`, and `disadvantageOnAttack` flags.

#### Duration Tracking Lifecycle

Status effects follow this lifecycle during combat:

```
Applied → Active (each turn: damage → skip check → decrement) → Expired → Removed
```

Each combatant's turn in `nextTurn()` processes in this order:

1. **Start-of-turn damage** — effects with `damage > 0` deal damage (Burning, Poison)
2. **Skip-turn check** — if any effect has `mechanicalEffects.skipTurn`, the turn is skipped entirely. Incapacitated combatants also lose concentration.
3. **Duration decrement** — all effect durations are decremented by 1
4. **Expiration removal** — effects with `duration <= 0` are removed. If a concentrated effect expires, `concentratingOn` is cleared.

A `statusEffectTick` action is recorded in combat history whenever effects expire, damage is dealt, turns are skipped, or concentration is lost.

#### Applying Status Effects

Use `CombatEngine.applyStatusEffect()` to apply effects. This handles stacking, concentration tracking, and one-concentration-per-combatant rules:

```typescript
// Apply a Burning effect with damage
combat.applyStatusEffect(target, {
  name: 'Burning',
  description: 'On fire from Fireball',
  duration: 3,
  source: caster.id,
  damage: 6,
  damageType: 'fire',
  mechanicalEffects: {
    // Burning has no mechanical effects beyond damage
  }
});

// Apply a concentration effect (e.g., Charmed)
combat.applyStatusEffect(target, {
  name: 'Charmed',
  description: `Charmed by ${caster.character.name}`,
  duration: 1,
  source: caster.id,
  hasConcentration: true,
  mechanicalEffects: {
    disadvantageOnAttackNonSource: true,
  }
});
```

#### Stacking Rules

When an effect with the **same name** already exists on the combatant:

- **Duration** — refreshed to the higher of the existing and new durations
- **Damage** — keeps the higher damage value
- **Mechanical effects** — merged (new flags overwrite existing)
- **Source** — updated to the new source
- **Damage type** — updated to the new type
- **Concentration** — new concentration effect replaces old concentration effect

Different-named effects stack independently — a combatant can be both Charmed and Frightened simultaneously.

#### Concentration Tracking

A combatant can maintain concentration on **one effect at a time**. The `Combatant.concentratingOn` field tracks the name of the concentrated effect.

**Concentration is broken when:**
- The concentrating combatant takes damage and fails a CON save (DC 10 or half damage, whichever is higher)
- A new concentration spell is cast (replaces the old one)
- The combatant becomes incapacitated (Stunned, Paralyzed)
- The combatant is defeated (HP reaches 0)
- The concentrated effect expires naturally

```typescript
// Check if a combatant is concentrating
combatant.concentratingOn;  // e.g., 'Charmed' or undefined

// Check concentration when damage is taken (automatic via executeAttack)
// Or check manually:
const broken = combat.checkConcentration(combatInstance, combatant, 15);
// Returns true if concentration was broken

// Drop concentration manually
const dropped = combat.dropConcentration(combatant, 'Voluntarily ended');
// Returns the dropped StatusEffect or undefined
```

#### Removing Expired Effects

```typescript
// Remove effects with duration <= 0
const expired = combat.removeExpiredStatusEffects(combatant);
// Returns array of removed StatusEffect objects
// Also clears combatant.concentratingOn if the concentrated effect expired
```

This is called automatically by `nextTurn()` during the duration tick-down step. You typically don't need to call it manually.

#### Spell-Based Status Effects

`SpellCaster` maps spell tags to status effects via the `TAG_STATUS_EFFECTS` constant:

| Tag | Effect Name | Concentration |
|-----|-------------|:---:|
| `charm` | Charmed | Yes |
| `frighten` | Frightened | Yes |
| `stun` | Stunned | No |
| `paralyze` | Paralyzed | No |
| `restrain` | Restrained | Yes |
| `poison` | Poisoned | No |
| `blind` | Blinded | No |
| `deafen` | Deafened | No |
| `burn` | Burning | No |

Spells can also apply status effects via keyword matching on `spell.description` and `spell.effect` text (fallback when no tags are present). Tag-based matching takes priority over text matching to prevent duplicates.

#### Advantage/Disadvantage from Effects

The engine checks status effects automatically during `executeAttack()` and `castSpell()`:

- **`disadvantageOnAttackNonSource`** — attacker has disadvantage if the target is not the source combatant (Charmed)
- **`disadvantageOnAttack`** — attacker has disadvantage unconditionally (Frightened, Poisoned, Blinded)
- **`advantageOnMeleeAttackAgainst`** — melee attacks against this target have advantage (Prone)
- **`advantageOnRangedAttackAgainst`** — ranged attacks against this target have advantage (Prone)
- **`disadvantageOnDexSaves`** — target rolls DEX saving throws with disadvantage (Stunned, Paralyzed, Restrained)

Per D&D 5e rules, advantage and disadvantage cancel each other out — if a combatant has both advantage and disadvantage on a roll, the roll is made normally.

### Combat History

Every action is recorded in `CombatInstance.history`:

```typescript
// Access complete combat log
combatInstance.history;
// [
//   { type: 'attack', actor: {...}, target: {...}, attack: {...}, result: {...} },
//   { type: 'spell', actor: {...}, targets: [...], spell: {...}, result: {...} },
//   { type: 'dodge', actor: {...}, result: {...} },
//   { type: 'flee', actor: {...}, result: {...} },
//   ...
// ]

// CombatAction properties
action.type;     // 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'flee' | 'useItem' | 'legendaryAction' | 'statusEffectTick'
action.actor;    // Combatant who performed the action
action.target;   // Single target (for attacks)
action.targets;  // Multiple targets (for spells)
action.attack;   // Attack details (weapon, roll, damage)
action.spell;    // Spell details (name, level, school)
action.result;   // { success, roll?, damage?, description }

// Useful for combat logs, replay systems, and analytics
```

### Spell Slots

Automatically initialized for spellcasting classes:

```typescript
// Spell slots are auto-initialized on combatant creation
const wizard = combatInstance.combatants.find(c => c.character.class === 'Wizard');
wizard.spellSlots; // { 1: 2, 2: 0, 3: 0, ... } based on character level

// Supported spellcasting classes:
// 'Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'

// Slot allocation follows D&D 5e progression by character level
// Level 1: [2, 0, 0, 0, 0, 0, 0, 0, 0]      (2 level-1 slots)
// Level 3: [4, 2, 0, 0, 0, 0, 0, 0, 0]      (4 level-1, 2 level-2)
// Level 5: [4, 3, 2, 0, 0, 0, 0, 0, 0]      (4 level-1, 3 level-2, 2 level-3)
// ... up to level 20

// SpellCaster class handles slot consumption and restoration
// Slots consumed via executeCastSpell(), restored via long rest mechanics
```

### Multiple Equipped Weapons

If a character has multiple equipped weapons, specify which one:

```typescript
// Attack with a specific equipped weapon
combat.executeWeaponAttack(combatInstance, current, target, 'Longsword');

// Or just use the first equipped weapon (default)
combat.executeWeaponAttack(combatInstance, current, target);
```

### Unarmed Combat

Attack without weapons using fists or natural weapons:

```typescript
// Explicitly use unarmed strike
combat.executeWeaponAttack(combatInstance, current, target, 'unarmed');

// Unarmed is used automatically when no weapon equipped
combat.executeWeaponAttack(combatInstance, current, target);
// "Aragorn punches Goblin for 3 damage"

// Default unarmed: 1 + STR modifier damage, proficiency bonus applies
```

### Manual Attack Objects

For special cases, you can still manually construct `Attack` objects using `executeAttack()` directly. See `Attack` type in DATA_ENGINE_REFERENCE.md for all available properties.

### Hit Modes

The combat engine supports two hit resolution modes, configured via `CombatConfig.hitMode`. Each mode also uses a different damage formula.

#### `'dnd'` — Classic D&D 5e (threshold-based)

The default D&D 5e system: d20 + attack bonus is compared to the target's AC.

- **Hit:** totalRoll >= AC (natural 20 always hits)
- **Miss:** totalRoll < AC (natural 1 always misses)
- **Critical:** Natural 20 — double damage dice

**Damage formula (dnd):** Rolls weapon dice + ability modifier. Finesse and ranged weapons use DEX; melee weapons use STR. Crits double the dice (not the modifier).

```typescript
const engine = new CombatEngine({ hitMode: 'dnd' });
```

#### `'scaled'` — Damage Scaling (default)

AC reduces damage instead of determining hit/miss. This creates a smoother combat experience where every attack deals at least some damage.

- **Only natural 1 misses** (5% chance, regardless of AC)
- **Natural 20 always crits** at full damage
- **All other rolls hit**, but damage is scaled based on how far below AC:
  - Each point below AC reduces damage by 10%
  - Minimum damage is always 1
  - `damageScale` on `AttackRoll` indicates the multiplier (1.0 = full, 0.05–0.95 = scaled)

| Roll vs AC | damageScale | Effect |
|-----------|-------------|--------|
| >= AC | 1.0 | Full damage |
| AC - 1 | 0.95 | 95% damage |
| AC - 5 | 0.50 | 50% damage |
| AC - 9 | 0.10 | 10% damage (minimum) |

**Damage formula (scaled):** No dice rolls. `max(1, floor(level * 2 + (STR - AC) * 0.3))` + flat weapon bonus from die size tier (d4→1, d6→1, d8→2, d10→2, d12→3, 2d6→3, 2d8→4). Level is the primary damage driver. Crits multiply the level base by 1.5x (weapon bonus unaffected).

```typescript
// Scaled mode is the default — no config needed
const engine = new CombatEngine();

// Explicit (same result)
const engine = new CombatEngine({ hitMode: 'scaled' });
```

**Why scaled mode?** In classic D&D, a high-AC character can make lower-level enemies effectively harmless (every attack misses). Scaled mode ensures those enemies still deal reduced damage, making encounter balance feel more granular.

### Legendary Actions

Legendary actions are special abilities available to boss-tier enemies. Unlike regular actions, legendary actions are taken **outside the boss's own turn** — other creatures can take legendary actions at the end of another creature's turn. A boss starts each round with 3 legendary action points and spends them to use its abilities. The cost of each action varies (1, 2, or 3 points).

#### LegendaryAction Interface

Each legendary action is defined on the boss's `character.legendary_config.actions` array:

```typescript
interface LegendaryAction {
  id: string;           // Unique identifier (e.g., 'tail_sweep')
  name: string;         // Display name (e.g., 'Tail Sweep')
  description: string;  // What the action does
  cost: number;         // Action points consumed (1, 2, or 3)
  effect: string;       // Combat system effect description
  damage?: string;      // Dice formula if it deals damage (e.g., '2d8 + 5')
  damageType?: string;  // Damage type (e.g., 'bludgeoning')
  archetypes: EnemyArchetype[];
  tags?: string[];      // Tags for AI filtering (e.g., 'damage', 'control', 'healing')
}

interface LegendaryConfig {
  resistances: number;       // Legendary resistances per day
  actions: LegendaryAction[]; // Available legendary actions
  lairActionHint?: string;    // Optional lair action hint
}
```

#### Combatant Legendary Tracking

Boss combatants have two additional fields for tracking legendary resources:

```typescript
interface Combatant {
  // ... standard fields ...
  legendaryActionsRemaining?: number;   // Reset to 3 at the start of each round
  legendaryResistancesRemaining?: number; // Per-day resource, set from config at combat start
}
```

These are initialized automatically by `CombatEngine.createCombatant()` when a character has `legendary_config`.

#### Action Point Tracking

- Each round, all non-defeated boss combatants have their legendary action points reset to **3**
- Reset happens at the start of each new round (when `nextTurn()` wraps around to turn index 0)
- Points are spent when `executeLegendaryAction()` is called, deducted by the action's `cost`
- If a boss doesn't have enough points for an action, the engine throws an error

```
Round 1 starts → boss gets 3 points
  Player turn ends → boss uses "Tail Sweep" (cost 2) → 1 point remaining
  Player turn ends → boss uses "Frightening Presence" (cost 1) → 0 points remaining
  Player turn ends → boss tries action → throws: not enough points
Round 2 starts → boss gets 3 points again
  ...
```

#### Executing Legendary Actions

Use `CombatEngine.executeLegendaryAction()` to have a boss use a legendary action:

```typescript
// Find a boss combatant
const boss = combatInstance.combatants.find(c => c.character.legendary_config);
const target = combat.getLivingCombatants(combatInstance).find(c => c.id !== boss.id);

// Get a legendary action from the boss's config
const action = boss.character.legendary_config.actions[0];
// e.g., { id: 'tail_sweep', name: 'Tail Sweep', cost: 2, damage: '2d8+5', ... }

// Execute the legendary action
const legendaryAction = combat.executeLegendaryAction(combatInstance, boss, action, target);

console.log(legendaryAction.result.description);
// "Dragon Lord uses Tail Sweep on Aragorn for 12 bludgeoning damage (2 action points spent, 1 remaining)"

// Check remaining points
boss.legendaryActionsRemaining; // 1
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `combat` | `CombatInstance` | The active combat instance |
| `bossCombatant` | `Combatant` | The boss using the legendary action |
| `action` | `{ id, name, cost, effect, damage?, damage_type?, ... }` | The action to execute (must belong to the boss) |
| `target?` | `Combatant` | Optional target for damaging actions |

**What the engine does:**
1. Validates the action exists on the boss's `legendary_config.actions`
2. Checks that enough action points are available
3. Spends the action points (deducts `cost` from `legendaryActionsRemaining`)
4. If the action has a `damage` formula and a target is provided, rolls damage and applies it
5. Records a `legendaryAction` entry in combat history
6. Checks if the target was defeated (updates combat status)

#### Legendary Resistances

Legendary resistances allow a boss to automatically succeed on a failed saving throw. This is a **per-day resource** (not per-round).

```typescript
// Boss fails a saving throw against a spell
const failedSave = false;

if (!failedSave) {
  // Use legendary resistance to succeed instead
  const used = combat.useLegendaryResistance(combatInstance, boss);
  if (used) {
    console.log(`${boss.character.name} used legendary resistance!`);
    console.log(`Remaining today: ${boss.legendaryResistancesRemaining}`);
  } else {
    console.log('No legendary resistances remaining — boss suffers the effect');
  }
}
```

- Returns `true` if a resistance was available and consumed
- Returns `false` if no resistances remain (`legendaryResistancesRemaining` is 0)
- Resistant count is set from `legendary_config.resistances` at combat start
- Resistant count does **not** reset between rounds (per-day, not per-round)
- Usage is recorded in combat history

#### AI and Legendary Actions

The combat AI (`CombatAI`) automatically selects and uses legendary actions for boss enemies via `selectLegendaryAction()`. After each non-boss turn, the `AICombatRunner` checks if any boss has remaining legendary action points and chains actions until the budget is exhausted or no valid actions remain.

- **Normal AI**: prefers lowest-cost damage actions (spread points across the round for sustained pressure)
- **Aggressive AI**: prefers highest-cost damage actions (maximize immediate impact)

### Combat AI

The combat AI controls both player characters and enemies during simulated combat. It produces a decision for each combatant's turn based on a threat assessment of the battlefield and a configurable play style. The AI is **deterministic** — given the same combat state, it always makes the same decision. All randomness comes from the dice roller when the `AICombatRunner` executes the decision.

#### AIPlayStyle

Two fundamental strategies drive all AI decisions:

```typescript
type AIPlayStyle = 'normal' | 'aggressive';
```

| Style | Philosophy | Targeting | Spells | Resources | Defensive |
|-------|-----------|-----------|--------|-----------|-----------|
| **Normal** | Baseline difficulty measurement | Lowest AC (easiest to hit) | Cantrips preferred; leveled only when clearly better | Conserves spell slots; saves for later rounds | Dodges when isolated + low HP |
| **Aggressive** | Maximum threat ceiling | Lowest HP (finish them off) | Always highest damage; burns all slots | No conservation; proactive healing to maintain max HP | Never dodges, never flees |

Comparing Normal vs Aggressive results reveals the true difficulty range of an encounter.

#### AIConfig

Controls how both sides fight. Each side can have a different style, and individual combatants can be overridden:

```typescript
import { CombatAI, AICombatRunner } from 'playlist-data-engine';

// Everyone plays the same style
const balancedConfig = {
  playerStyle: 'normal',
  enemyStyle: 'normal',
};

// Mixed: players are cautious, enemies go all-out
const threatConfig = {
  playerStyle: 'normal',
  enemyStyle: 'aggressive',
};

// Per-combatant overrides (combatant ID → style)
const customConfig = {
  playerStyle: 'normal',
  enemyStyle: 'normal',
  overrides: new Map([
    ['enemy_4', 'aggressive'],  // This specific boss fights aggressively
  ]),
};

// Optional: enable class features (Sneak Attack, Divine Smite, etc.)
const classFeaturesConfig = {
  playerStyle: 'aggressive',
  enemyStyle: 'aggressive',
  enableClassFeatures: true,
};
```

#### AIDecision

The output of the AI for each turn. Contains everything needed to execute one combatant's action:

```typescript
interface AIDecision {
  action: 'attack' | 'castSpell' | 'dodge' | 'dash' | 'disengage'
        | 'flee' | 'useItem' | 'legendaryAction' | 'skip';
  target?: string;           // Single-target combatant ID
  targetIds?: string[];      // Multi-target spell combatant IDs
  weaponName?: string;       // Weapon to attack with
  spellName?: string;        // Spell to cast
  itemName?: string;         // Consumable to use
  legendaryActionId?: string; // Legendary action to execute
  reasoning?: string;        // Human-readable explanation
}
```

The `reasoning` field explains why the AI chose its action — useful for debugging and UI tooltips.

#### Decision-Making Process

Each turn, the AI follows a priority chain:

```
1. Assess Threat
   └─ Evaluate: HP%, ally/enemy counts, spell slots, items, round number

2. Spell Selection (highest priority)
   ├─ Healing needed? → Cast heal on lowest-HP ally
   ├─ Damage spell better than attack? → Cast it
   ├─ Control spell useful? (2+ enemies, normal style) → Cast it
   └─ Buff available? (healthy, normal style) → Buff strongest ally

3. Item Usage
   └─ Low HP + no spell slots? → Use healing item

4. Defensive Actions
   └─ Isolated + low HP + multiple enemies (normal only)? → Dodge

5. Weapon Attack (fallback)
   └─ Pick best weapon → Attack selected target
```

The AI never wastes a turn. If no spell/item/defensive action is warranted, it always falls through to a weapon attack.

#### Target Selection

| Style | Strategy | Rationale |
|-------|----------|-----------|
| **Normal** | Lowest AC enemy | Consistent damage output — easier to hit |
| **Aggressive** | Lowest HP enemy | Action economy — removing enemies reduces incoming damage |

#### Weapon Selection

Evaluates all equipped weapons + unarmed strike. Scores based on expected damage and attack bonus:

```typescript
// Normal: balanced score (damage + small bonus for attack accuracy)
score = expectedDamage + attackBonus * 0.1

// Aggressive: pure damage
score = expectedDamage
```

Ranged weapons use DEX, melee weapons use STR for attack bonus calculation.

#### Spell Selection

Spells are evaluated by tag (via `SpellCaster` static helpers) and expected damage:

| Category | Tag Detection | Normal Behavior | Aggressive Behavior |
|----------|--------------|-----------------|-------------------|
| **Damage** | `damage` | Cantrips preferred; leveled only if 50%+ better | Always highest damage spell |
| **Healing** | `healing`, `ally`, `self` | Heal allies below 50%; self when below 25% | Heal anyone below 75% |
| **Control** | `control`, `debuff` | Use when 2+ enemies | Never (wastes damage turns) |
| **Buff** | `buff` | Buff strongest ally when healthy | Never (wastes damage turns) |
| **AoE/Multi** | `aoe`, `multi-target` | Damage × target count (cap 4) | Always if available |

AoE and multi-target spells get an expected damage multiplier based on enemy count. Leveled spells get a 1.5× bonus over cantrips to account for their resource cost.

#### Support Archetype AI

The AI detects support combatants (healers/buffers) by checking spell tags:

```typescript
const ai = new CombatAI(config);
const isSupport = ai.isSupportArchetype(combatant);
// true if combatant has healing or buff spells
```

Support AI differences:
- Prioritizes healing the lowest-HP ally over dealing damage
- Normal support only heals allies below 50% HP; aggressive heals everyone below 75%
- Buff spells target the ally with highest STR/DEX (best damage dealer)

#### AIThreatAssessment

Computed each turn to drive all decisions. Provides a battlefield snapshot:

```typescript
interface AIThreatAssessment {
  myHPPercent: number;           // 0.0 – 1.0
  myAC: number;                 // Armor class
  lowestAllyHPPercent: number;  // 1.0 if no allies
  lowestEnemyHP: number;        // Infinity if no enemies
  highestEnemyDamage: number;   // Estimated enemy DPR
  partySize: number;            // Living allies (incl. self)
  enemyCount: number;           // Living enemies
  roundNumber: number;          // Current round
  isLowHP: boolean;             // Below 25%
  isCriticalHP: boolean;        // Below 10%
  hasHealingItems: boolean;     // Usable items in inventory
  hasSpellSlots: boolean;       // Remaining leveled spell slots
  hasRemainingLimitedAbilities: boolean; // Legendary actions/resistances
}
```

Access the assessment directly for custom AI logic:

```typescript
const ai = new CombatAI(config);
const threat = ai.assessThreat(combatant, combatInstance);
console.log(`${combatant.character.name}: ${Math.round(threat.myHPPercent * 100)}% HP, ${threat.enemyCount} enemies`);
```

#### AICombatRunner

The `AICombatRunner` orchestrates full combat encounters. It bridges the gap between `CombatAI` (decisions) and `CombatEngine` (execution):

```typescript
import { AICombatRunner, createSeededRoller } from 'playlist-data-engine';

const runner = new AICombatRunner();

const { combat, result, metrics } = runner.runFullCombat(
  players,          // CharacterSheet[]
  enemies,          // CharacterSheet[]
  {
    playerStyle: 'normal',
    enemyStyle: 'aggressive',
  },
  { maxTurnsBeforeDraw: 50 },  // Optional combat config
  createSeededRoller('sim-seed-42'),  // Optional: deterministic rolls
);

console.log(result.winnerSide);     // 'player' | 'enemy' | 'draw'
console.log(result.roundsElapsed);  // Number of rounds
console.log(result.xpAwarded);      // XP from defeated enemies

// Per-combatant metrics
for (const [id, m] of metrics) {
  console.log(`${m.name}: ${m.totalDamageDealt} damage, ${m.roundsSurvived} rounds, survived=${m.survived}`);
}
```

**AICombatResult interface:**

| Field | Type | Description |
|-------|------|-------------|
| `combat` | `CombatInstance` | Full combat instance with complete action history |
| `result` | `CombatResult` | Final result (winner, XP, rounds, treasure) |
| `metrics` | `Map<string, CombatantMetrics>` | Per-combatant stats computed from history |

**Combat lifecycle inside the runner:**

```
startCombat()
  └─ For each turn while combat is active:
      ├─ Skip defeated combatants
      ├─ Skip stunned/unconscious combatants (skipTurn effects)
      ├─ AI decides → executeDecision()
      │   ├─ attack → executeWeaponAttack()
      │   ├─ castSpell → executeCastSpell()
      │   ├─ dodge/dash/disengage → engine methods
      │   ├─ flee → executeFlee() (fallback to attack if disabled)
      │   ├─ useItem → log in history (no mechanical effect yet)
      │   ├─ legendaryAction → executeLegendaryAction()
      │   └─ skip → log and advance
      ├─ Process boss legendary actions (chain until budget exhausted)
      └─ nextTurn()
  └─ getCombatResult() → computeMetrics()
```

**Without a seeded roller**, the runner uses `Math.random()` — suitable for live gameplay:

```typescript
// Random combat (live gameplay)
const { combat, result } = runner.runFullCombat(players, enemies, {
  playerStyle: 'normal',
  enemyStyle: 'normal',
});
```

#### CombatantMetrics

Per-combatant statistics computed from combat history by `CombatMetricsTracker`. `roundsSurvived` reflects the total combat duration (`combat.roundNumber`) for all combatants. DPR (`damagePerRound`) divides total damage by turns taken rather than rounds survived, which correctly handles combatants that don't act every round (e.g., in asymmetric fights).

```typescript
interface CombatantMetrics {
  combatantId: string;
  name: string;
  side: 'player' | 'enemy';
  totalDamageDealt: number;    // All damage sources (attacks + spells + legendary)
  totalDamageTaken: number;
  totalHealingDone: number;
  spellsCast: number;
  itemsUsed: number;
  criticalHits: number;
  hits: number;               // Successful attack/spell hits
  misses: number;             // Missed attack/spell attempts
  kills: number;              // Enemies/opponents this combatant defeated
  roundsSurvived: number;      // Total combat rounds (from combat.roundNumber)
  survived: boolean;
  actionsByType: Record<string, number>;  // e.g., { attack: 12, spell: 3, dodge: 1 }
  damagePerRound: number[];     // [avg damage per turn] totalDamageDealt / turns taken
}
```

These metrics are the foundation for Monte Carlo simulation aggregation — the simulator averages them across hundreds of runs to produce per-combatant DPR, survival rate, and kill rate.

### Monte Carlo Simulation

The `CombatSimulator` runs N independent combat encounters using AI-controlled combatants, each with a unique seeded RNG. It aggregates the outcomes into statistical summaries and per-combatant metrics. This is the core analysis tool — it answers *"Given this party and these enemies, how often does each side win, how many rounds do fights last, and how much damage does each combatant deal?"*

The simulator is stateless between `run()` calls. Each call produces a fresh, independent set of results.

#### CombatSimulator

```typescript
import { CombatSimulator } from 'playlist-data-engine';

const simulator = new CombatSimulator();

const results = simulator.run(
  party,    // CharacterSheet[]
  enemies,  // CharacterSheet[]
  {
    runCount: 1000,
    baseSeed: 'encounter-analysis',
    aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
  }
);

console.log(`Player win rate: ${(results.summary.playerWinRate * 100).toFixed(1)}%`);
console.log(`Average rounds: ${results.summary.averageRounds.toFixed(1)}`);
console.log(`Player deaths: ${results.summary.totalPlayerDeaths}`);
```

Internally, each run creates a fresh `SeededDiceRoller` and `AICombatRunner`. The seed for run `i` is `"${baseSeed}-${i}"`, ensuring every run is independent and the full simulation is reproducible.

#### SimulationConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `runCount` | `number` | required | Number of simulations to run (100–10000 recommended) |
| `baseSeed` | `string` | required | Base seed — each run gets `baseSeed-index` |
| `aiConfig` | `AIConfig` | required | AI play styles per side |
| `combatConfig` | `CombatConfig` | — | Optional combat engine overrides (max turns, flee, etc.) |
| `collectDetailedLogs` | `boolean` | `false` | Save full combat log per run (memory-intensive for large runCount) |
| `enemyRegeneration` | `EncounterGenerationOptions` | — | Regenerate enemies per run to capture generation variance; each run gets seed `enemyRegeneration.seed-runIndex` |
| `onProgress` | `(completed, total) => void` | — | Progress callback after each run |
| `abortSignal` | `AbortSignal` | — | Cancel long-running simulations; returns partial results |

#### SimulationResults

The top-level result object returned by `simulator.run()`:

```typescript
interface SimulationResults {
  config: SimulationConfig;                              // Input config echo
  summary: SimulationSummary;                            // Aggregate statistics
  party: PartyConfig;                                    // Party snapshot (memberCount, averageLevel, names)
  encounter: EncounterConfig;                            // Enemy snapshot (enemyCount, averageCR, names)
  perCombatantMetrics: Map<string, CombatantSimulationMetrics>;  // Per-combatant stats
  enemyGenerationStats?: EnemyGenerationRecord[];        // Per-enemy-type stats (only if enemyRegeneration)
  runDetails?: SimulationRunDetail[];                    // Per-run data (only if collectDetailedLogs)
  wasCancelled: boolean;                                 // true if aborted before completion
}
```

When `enemyRegeneration` is enabled, `enemyGenerationStats` provides aggregated per-enemy-type statistics across all runs. Each unique enemy name that appeared gets an `EnemyGenerationRecord`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Enemy display name (e.g., "Goblin Scout") |
| `count` | `number` | Number of runs this enemy appeared in |
| `hpRange` | `{ min, max, avg }` | HP values observed across runs |
| `acRange` | `{ min, max, avg }` | AC values observed across runs |
| `crRange` | `{ min, max, avg }` | CR values observed across runs |

Results are sorted by `count` descending (most common enemies first).

#### SimulationSummary

Aggregate statistics across all runs — the core output for balance decisions:

| Field | Type | Description |
|-------|------|-------------|
| `totalRuns` | `number` | Completed simulation runs |
| `playerWins` | `number` | Runs where all enemies were defeated |
| `enemyWins` | `number` | Runs where all players were defeated |
| `draws` | `number` | Runs ending in a draw (max turns, mutual kill) |
| `playerWinRate` | `number` | Player win rate (0.0–1.0) |
| `averageRounds` | `number` | Average rounds across all runs |
| `medianRounds` | `number` | Median rounds across all runs |
| `averageRoundsOnWin` | `number` | Average rounds in player-win runs |
| `averageRoundsOnLoss` | `number` | Average rounds in player-loss runs |
| `averagePlayerHPPercentRemaining` | `number` | Average remaining HP % for players in winning runs |
| `totalPlayerDeaths` | `number` | Total player deaths across all runs |
| `averageRoundsPerPlayerDeath` | `number` | Average round at which each player death occurred |
| `totalEnemyDeaths` | `number` | Total enemy deaths across all runs |
| `averageRoundsPerEnemyDeath` | `number` | Average round at which each enemy death occurred |

Invariant: `playerWins + enemyWins + draws = totalRuns`.

#### CombatantSimulationMetrics

Per-combatant aggregate stats across all simulation runs. Keyed by combatant ID in `perCombatantMetrics`:

| Field | Type | Description |
|-------|------|-------------|
| `combatantId` | `string` | Combatant ID (matches CombatEngine scheme) |
| `name` | `string` | Display name |
| `side` | `'player' \| 'enemy'` | Which side this combatant was on |
| `averageDamagePerRound` | `number` | Average DPR across all runs |
| `medianDamagePerRound` | `number` | Median DPR across all runs |
| `averageTotalDamageDealt` | `number` | Average total damage dealt per run |
| `averageTotalDamageTaken` | `number` | Average total damage taken per run |
| `averageHealingDone` | `number` | Average healing per run |
| `averageRoundsSurvived` | `number` | Average rounds survived per run |
| `survivalRate` | `number` | Survival rate (0.0–1.0) |
| `killRate` | `number` | Final blow rate (0.0–1.0) |
| `criticalHitRate` | `number` | Crit rate across all attack actions (0.0–1.0) |
| `averageHitRate` | `number` | Average hit rate across all runs (0.0–1.0) |
| `averageHitsPerRun` | `number` | Average number of hits per run |
| `averageMissesPerRun` | `number` | Average number of misses per run |
| `averageSpellSlotsUsed` | `number` | Average spell slots consumed per run |
| `mostUsedAction` | `string` | Most frequent action type (`attack`, `castSpell`, etc.) |
| `damageDistribution` | `HistogramBucket[]` | DPR distribution for visualization |
| `hpRemainingDistribution` | `HistogramBucket[]` | HP remaining distribution for visualization |

#### HistogramBucket

Distribution data for chart visualization. Used in `damageDistribution` and `hpRemainingDistribution`:

```typescript
interface HistogramBucket {
  rangeStart: number;   // Start of range (inclusive)
  rangeEnd: number;     // End of range (exclusive, except last bucket)
  count: number;        // Data points in this bucket
  percent: number;      // Percentage of total (0–100)
}
```

Histograms are built with 20 buckets by default. Bucket percentages sum to 100%. When all values are identical, a single bucket is returned.

#### Detailed Run Logs

When `collectDetailedLogs: true`, each run produces a `SimulationRunDetail`:

```typescript
interface SimulationRunDetail {
  runIndex: number;                              // 0-based run index
  seed: string;                                  // Seed used for this run
  result: CombatResult;                          // Final combat result
  metrics: Map<string, CombatantMetrics>;        // Per-combatant metrics for this run
}
```

Detailed logs are memory-intensive — a 1000-run simulation with 8 combatants stores 1000 full combat histories. Use for small-scale analysis or debugging, not for large sweeps.

#### Code Examples

**Basic simulation with progress:**

```typescript
import { CombatSimulator } from 'playlist-data-engine';

const simulator = new CombatSimulator();

const results = simulator.run(party, enemies, {
  runCount: 500,
  baseSeed: 'balance-test',
  aiConfig: {
    playerStyle: 'normal',
    enemyStyle: 'normal',
  },
  onProgress: (completed, total) => {
    console.log(`${completed}/${total} runs complete`);
  },
});

console.log(`Win rate: ${(results.summary.playerWinRate * 100).toFixed(1)}%`);
console.log(`Avg rounds: ${results.summary.averageRounds.toFixed(1)}`);
console.log(`Player HP remaining: ${results.summary.averagePlayerHPPercentRemaining.toFixed(0)}%`);
```

**Cancellation with AbortController:**

```typescript
const controller = new AbortController();

// Cancel after 2 seconds
setTimeout(() => controller.abort(), 2000);

const results = simulator.run(party, enemies, {
  runCount: 10000,
  baseSeed: 'long-sim',
  aiConfig: { playerStyle: 'aggressive', enemyStyle: 'aggressive' },
  abortSignal: controller.signal,
});

console.log(`Completed ${results.summary.totalRuns} of 10000 runs`);
console.log(`Was cancelled: ${results.wasCancelled}`);
// Results are still valid — partial data is usable
```

**Collecting detailed logs for debugging:**

```typescript
const results = simulator.run(party, enemies, {
  runCount: 50,
  baseSeed: 'debug-run',
  aiConfig: { playerStyle: 'normal', enemyStyle: 'normal' },
  collectDetailedLogs: true,
});

// Inspect a specific run
const run3 = results.runDetails![3];
console.log(`Run 3 seed: ${run3.seed}`);
console.log(`Run 3 winner: ${run3.result.winnerSide}`);
for (const [id, m] of run3.metrics) {
  console.log(`  ${m.name}: ${m.totalDamageDealt} damage, survived=${m.survived}`);
}
```

#### Determinism

The simulator guarantees reproducibility:

```typescript
// Same inputs → byte-identical results
const a = simulator.run(party, enemies, { runCount: 100, baseSeed: 'test', aiConfig });
const b = simulator.run(party, enemies, { runCount: 100, baseSeed: 'test', aiConfig });
// a.summary === b.summary (all fields identical)
// a.perCombatantMetrics === b.perCombatantMetrics (all fields identical)

// Different seeds → different results
const c = simulator.run(party, enemies, { runCount: 100, baseSeed: 'other', aiConfig });
// c.summary.playerWinRate !== a.summary.playerWinRate (almost certainly)
```

This extends to full combat history: the same party, enemies, seed, and AI config produce an identical combat history entry-by-entry within each run.

#### Recommended Run Counts

> For detailed guidance on choosing simulation run counts, see [Recommended Simulation Counts](ENEMY_GENERATION.md#recommended-simulation-counts) in the Enemy Generation guide.

---

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [ROLLS_AND_SEEDS.md](ROLLS_AND_SEEDS.md) - Seeded dice rolling and RNG (canonical)
- [ENEMY_GENERATION.md](ENEMY_GENERATION.md) - Balance validation, parameter sweeps, comparative analysis, difficulty calculator
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Weapons and armor in combat
- [XP_AND_STATS.md](XP_AND_STATS.md) - Combat rewards and XP
- [PREREQUISITES.md](PREREQUISITES.md) - Feature prerequisites for combat abilities
