# Combat System Reference

Complete guide to the combat system in the Playlist Data Engine.

---

## Table of Contents

1. [Combat System](#combat-system)
   - [Enemy Generation](#enemy-generation)
   - [Treasure](#treasure)
   - [Spell Casting](#spell-casting)
   - [Combat Actions](#combat-actions)
   - [HP Management](#hp-management)
   - [Query Methods](#query-methods)
   - [Action Economy](#action-economy)
   - [Status Effects](#status-effects)
   - [Combat History](#combat-history)
   - [Spell Slots](#spell-slots)
   - [Multiple Equipped Weapons](#multiple-equipped-weapons)
   - [Unarmed Combat](#unarmed-combat)
   - [Manual Attack Objects](#manual-attack-objects)
2. [Dice Roller](#dice-roller)

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

// Custom items
const combat = new CombatEngine({
  treasure: {
    gold: 100,
    items: [
      { id: 'sword-1', name: 'Longsword +1', type: 'weapon' },
      { id: 'potion-1', name: 'Health Potion', type: 'consumable' }
    ]
  }
});

// Default: 0-99 gold with seeded RNG
const combat = new CombatEngine({ seed: 'goblin-lair-001' });
```

The `treasure` config supports:
- `gold: number` - Fixed amount (always rewards exactly this much)
- `gold: { min, max }` - Random range (uses seed for determinism)
- `items: any[]` - Custom item rewards

> **Note:** Treasure rewards are not automatically distributed to any character. The combat engine reports what was earned; it's up to your game to handle inventory management, gold splitting among party members, or whether loot is awarded at all.

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

Combatants can have active conditions applied:

```typescript
// Access status effects on a combatant
const combatant = combatInstance.combatants[0];
combatant.statusEffects;
// [
//   { name: 'Burning', duration: 3, source: 'Fireball', concentration: false },
//   { name: 'Charmed', duration: 1, source: 'Enchant', concentration: true },
//   ...
// ]

// StatusEffect interface
interface StatusEffect {
  name: string;           // Condition name (e.g., 'Burning', 'Charmed')
  duration: number;       // Remaining rounds (0 = expires at end of turn)
  source: string;         // What applied the effect
  concentration: boolean; // Requires caster concentration
}

// Example conditions
'Burning'    // Ongoing fire damage
'Charmed'    // Cannot attack caster, disadvantage on some checks
'Frightened' // Disadvantage on attacks while source is visible
'Prone'      // Disadvantage on melee attacks, advantage on ranged attacks
'Stunned'    // Incapacitated, disadvantage on Dex saves, speed 0

// Effects are typically applied via spell casting
// See SpellCaster.applyStatusEffect() for effect application logic
```

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
action.type;     // 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'flee'
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

---

## Dice Roller

**For detailed documentation, see [ROLLS_AND_SEEDS.md](docs/ROLLS_AND_SEEDS.md)**

---

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Weapons and armor in combat
- [XP_AND_STATS.md](XP_AND_STATS.md) - Combat rewards and XP
- [PREREQUISITES.md](PREREQUISITES.md) - Feature prerequisites for combat abilities
- [ROLLS_AND_SEEDS.md](ROLLS_AND_SEEDS.md) - Dice rolling and random number generation
