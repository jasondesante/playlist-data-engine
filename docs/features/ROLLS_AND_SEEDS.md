# Randomness Reference

Complete guide to the dice roller and seeded randomness in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Hash Utilities and Deterministic Seeding](#hash-utilities-and-deterministic-seeding)
2. [Dice Roller](#dice-roller)
3. [Seeded Dice Roller](#seeded-dice-roller)
4. [Initiative Roller](#initiative-roller)
5. [Seeded RNG in Combat Simulations](#seeded-rng-in-combat-simulations)

---


## Hash Utilities and Deterministic Seeding

The hash utilities provide deterministic seed generation for reproducible character generation:

```typescript
import { generateSeed, hashSeedToFloat, hashSeedToInt, deriveSeed, SeededRNG } from 'playlist-data-engine';

// Generate a deterministic seed from blockchain data
// Takes THREE parameters: chainName, tokenAddress, tokenId
const seed = generateSeed('ethereum', '0x123abc...', '42');
console.log(seed);  // "ethereum-0x123abc...-42"

// Hash seed to float (0.0 - 1.0)
const float = hashSeedToFloat(seed);
console.log(float);  // e.g., 0.6423...

// Hash seed to integer in range
const stat = hashSeedToInt(seed, 8, 18);  // Random stat between 8 and 17
console.log(stat);  // e.g., 14

// Derive new seeds for related random values
const raceSeed = deriveSeed(seed, 'race');
const classSeed = deriveSeed(seed, 'class');
const statsSeed = deriveSeed(seed, 'stats');
console.log(raceSeed);  // "ethereum-0x123abc...-42:race"

// Use SeededRNG for complex deterministic random operations
const rng = new SeededRNG(seed);

// Generate random float in [0.0, 1.0)
const randomValue = rng.random();

// Generate random integer in range [min, max)
const d20Roll = rng.randomInt(1, 21);
const damage = rng.randomInt(1, 9);  // 1d8

// Pick random element from array
const races = ['Human', 'Elf', 'Dwarf', 'Halfling'];
const race = rng.randomChoice(races);

// Pick weighted random element (uses [value, weight] tuples)
const treasureOptions = [
  ['Gold', 50],
  ['Gem', 30],
  ['Artifact', 10]
];
const item = rng.weightedChoice(treasureOptions);
console.log(item);  // 'Gold' (50% chance), 'Gem' (30% chance), or 'Artifact' (10% chance)

// Shuffle array deterministically
const cards = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
const shuffled = rng.shuffle([...cards]);
```

**Common Use Case: Blockchain-Based Character Generation**

```typescript
import { generateSeed, CharacterGenerator, AudioAnalyzer } from 'playlist-data-engine';

// Given an NFT's blockchain data
const nftData = {
  chain: 'ethereum',
  contractAddress: '0x1234567890abcdef...',
  tokenId: '1234'
};

// Generate a deterministic seed
const seed = generateSeed(nftData.chain, nftData.contractAddress, nftData.tokenId);

// Generate character from seed and audio
const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);
const character = CharacterGenerator.generate(seed, audio, track);

// The same NFT always generates the same character!
```

---


## Dice Roller

The `DiceRoller` class provides utility methods for D&D-style dice rolling. All methods are static—call them directly without instantiation.

```typescript
import { DiceRoller } from 'playlist-data-engine';

// Basic dice rolling
const d6Result = DiceRoller.rollDie(6);           // Roll a single d6 (1-6)
const d20Result = DiceRoller.rollD20();           // Roll a d20 (1-20)
const threeD6 = DiceRoller.rollMultipleDice(3, 6); // Roll 3d6, returns [3, 5, 2]
const percentile = DiceRoller.rollPercentile();   // Roll d100 (1-100)

// Parse and roll dice formulas
const fireball = DiceRoller.parseDiceFormula('8d6+5');
console.log(`Fireball damage: ${fireball.total}`);  // Sum of all rolls + modifier
console.log(`Individual rolls: ${fireball.rolls}`); // Array of each die result

// Advantage and disadvantage
const advRoll = DiceRoller.rollWithAdvantage();
console.log(`Rolled ${advRoll.roll1} and ${advRoll.roll2}, taking ${advRoll.result}`);

const disadvRoll = DiceRoller.rollWithDisadvantage();
console.log(`Rolled ${disadvRoll.roll1} and ${disadvRoll.roll2}, taking ${disadvRoll.result}`);

// Combat functions
const initiative = DiceRoller.rollInitiative(3);  // d20 + DEX modifier (e.g., +3)

const damage = DiceRoller.calculateDamage('2d6', 2, false);  // formula, modifier, critical?
console.log(`Damage: ${damage.total} (${damage.rolls} + ${damage.modifier})`);

const critDamage = DiceRoller.calculateDamage('2d6', 2, true);  // Critical hit - dice doubled
console.log(`Critical damage: ${critDamage.total}`);

// Manual critical handling
const baseRolls = DiceRoller.rollMultipleDice(2, 6);  // [4, 3]
const critRolls = DiceRoller.doubleDamage(baseRolls);   // [4, 3, 4, 3]

// Saving throws and ability checks
const fortitudeSave = DiceRoller.rollSavingThrow(2, 2);  // ability modifier + proficiency bonus
const athleticsCheck = DiceRoller.rollAbilityCheck(4, 0);  // ability modifier only

// Critical detection
const attackRoll = DiceRoller.rollD20();
if (DiceRoller.isCriticalHit(attackRoll)) {
  console.log('Critical hit! Double the damage dice!');
}
if (DiceRoller.isCriticalMiss(attackRoll)) {
  console.log('Critical miss! Attack fails automatically.');
}

// Seeded RNG for reproducible rolls
const seeded = DiceRoller.seededRoll(12345);  // Same seed always produces same result
const anotherSeeded = DiceRoller.seededRoll(12345);  // Will equal seeded
```

**Common Use Case: Custom Attack Resolution**

```typescript
import { DiceRoller } from 'playlist-data-engine';

function resolveAttack(attackBonus: number, targetAC: number, hasAdvantage: boolean, hasDisadvantage: boolean) {
  let d20Roll: number;
  let roll1: number | undefined;
  let roll2: number | undefined;
  let isCritical: boolean;
  let isMiss: boolean;

  if (hasAdvantage) {
    const result = DiceRoller.rollWithAdvantage();
    roll1 = result.roll1;
    roll2 = result.roll2;
    d20Roll = result.result;
    // D&D 5e Sage Advice: With advantage, if EITHER die is a 20, it's a critical hit
    isCritical = DiceRoller.isCriticalHit(roll1) || DiceRoller.isCriticalHit(roll2);
    // With advantage, only check for fumble on the selected roll
    isMiss = DiceRoller.isCriticalMiss(d20Roll);
    console.log(`Advantage: rolled ${roll1} and ${roll2}, using ${d20Roll}`);
  } else if (hasDisadvantage) {
    const result = DiceRoller.rollWithDisadvantage();
    roll1 = result.roll1;
    roll2 = result.roll2;
    d20Roll = result.result;
    // D&D 5e Sage Advice: With disadvantage, if EITHER die is a 1, it's a critical miss
    isMiss = DiceRoller.isCriticalMiss(roll1) || DiceRoller.isCriticalMiss(roll2);
    // With disadvantage, only check for crit on the selected roll
    isCritical = DiceRoller.isCriticalHit(d20Roll);
    console.log(`Disadvantage: rolled ${roll1} and ${roll2}, using ${d20Roll}`);
  } else {
    d20Roll = DiceRoller.rollD20();
    isCritical = DiceRoller.isCriticalHit(d20Roll);
    isMiss = DiceRoller.isCriticalMiss(d20Roll);
  }

  const total = d20Roll + attackBonus;
  const hit = !isMiss && (isCritical || total >= targetAC);

  return { d20Roll, roll1, roll2, total, hit, isCritical, isMiss };
}

const attack = resolveAttack(7, 15, true, false);
console.log(`Attack roll: ${attack.d20Roll} + 7 = ${attack.total} vs AC 15`);
if (attack.isCritical) {
  console.log('CRITICAL HIT!');
} else if (attack.isMiss) {
  console.log('CRITICAL MISS!');
} else if (attack.hit) {
  console.log('Hit!');
} else {
  console.log('Miss!');
}
```

**Important:** D&D 5e rules for advantage/disadvantage with critical hits and misses:
- **Advantage:** If EITHER die shows a 20, it's a critical hit
- **Disadvantage:** If EITHER die shows a 1, it's a critical miss
- This follows the official D&D 5e Sage Advice ruling

---

## Seeded Dice Roller

The `SeededDiceRoller` class provides the same API as the static `DiceRoller` but produces **deterministic** results. It wraps `SeededRNG` internally, so the same seed and call sequence always produces identical rolls.

### Key Differences from DiceRoller

| Feature | `DiceRoller` (static) | `SeededDiceRoller` (instance) |
|---------|----------------------|------------------------------|
| Usage | Static methods: `DiceRoller.rollD20()` | Instance methods: `roller.rollD20()` |
| Randomness | `Math.random()` — non-deterministic | `SeededRNG` — deterministic |
| State | No state (each call independent) | Stateful counter (call order matters) |
| Use case | Live gameplay, one-off rolls | Simulations, reproducible tests |

### Creating a Seeded Roller

Three ways to create an instance:

```typescript
import { SeededDiceRoller, createSeededRoller, SeededRNG } from 'playlist-data-engine';

// 1. Factory function (recommended)
const roller = createSeededRoller('my-simulation-seed');

// 2. Constructor with seed string
const roller2 = new SeededDiceRoller('another-seed');

// 3. Constructor with existing SeededRNG instance
const rng = new SeededRNG('pre-configured-rng');
const roller3 = new SeededDiceRoller(rng);
```

The factory function `createSeededRoller()` is the standard way to create rollers — it's what `CombatSimulator` and `AICombatRunner` use internally.

### API Reference

All methods mirror the static `DiceRoller` API. The key difference is that results are deterministic given the same seed and call order.

| Method | Returns | Description |
|--------|---------|-------------|
| `rollDie(sides)` | `number` | Roll a single die (1 to sides) |
| `rollD20()` | `number` | Roll a d20 (1-20) |
| `rollMultipleDice(count, sides)` | `number[]` | Roll N dice, return individual results |
| `parseDiceFormula(formula)` | `{ diceCount, diceSides, modifier, rolls, total }` | Parse and roll formulas like `"2d6+3"` |
| `rollWithAdvantage()` | `{ roll1, roll2, result }` | Roll 2d20, take higher |
| `rollWithDisadvantage()` | `{ roll1, roll2, result }` | Roll 2d20, take lower |
| `rollInitiative(dexModifier)` | `number` | d20 + DEX modifier |
| `calculateDamage(formula, modifier, isCritical?)` | `{ diceFormula, rolls, modifier, total, isCritical }` | Roll damage with optional crit doubling |
| `rollSavingThrow(abilityMod, proficiency?)` | `number` | d20 + ability mod + proficiency |
| `rollAbilityCheck(abilityMod, proficiency?)` | `number` | d20 + ability mod + proficiency |
| `rollPercentile()` | `number` | Roll d100 (1-100) |
| `isCriticalHit(d20Roll)` | `boolean` | Check if roll is natural 20 |
| `isCriticalMiss(d20Roll)` | `boolean` | Check if roll is natural 1 |
| `doubleDamage(rolls)` | `number[]` | Double the dice array (for crits) |

### Usage Examples

**Basic deterministic rolling:**

```typescript
import { createSeededRoller } from 'playlist-data-engine';

const roller = createSeededRoller('combat-42');

// These are always the same for seed 'combat-42'
console.log(roller.rollD20());           // e.g., 14
console.log(roller.rollD20());           // e.g., 7  (next in sequence)
console.log(roller.rollDie(8));          // e.g., 3

// A different roller with the same seed starts from the beginning
const roller2 = createSeededRoller('combat-42');
console.log(roller2.rollD20());          // 14 (same as first call above)
```

**Full combat simulation with seeded dice:**

```typescript
import { createSeededRoller } from 'playlist-data-engine';

// Create a roller for this simulation run
const roller = createSeededRoller('balance-test-1-0');

// Use it for all combat rolls — every roll is deterministic
const attackRoll = roller.rollD20();                         // Attack: 14
const damage = roller.calculateDamage('2d6', 3);             // Damage: { total: 11, rolls: [4, 4] }
const savingThrow = roller.rollSavingThrow(-1, 2);           // Save: 10
const initiative = roller.rollInitiative(2);                 // Initiative: 16
```

### Injecting into CombatEngine

Pass a `SeededDiceRoller` to `CombatEngine` to make all combat rolls deterministic:

```typescript
import { CombatEngine, createSeededRoller } from 'playlist-data-engine';

// Non-deterministic (live gameplay)
const liveEngine = new CombatEngine({ maxTurnsBeforeDraw: 50 });
// Uses Math.random() internally

// Deterministic (simulation)
const simEngine = new CombatEngine({}, createSeededRoller('sim-seed'));
// All attack rolls, damage, saving throws, and initiative are deterministic
```

The injected roller flows to all combat subsystems:

```
CombatEngine (receives roller)
  ├── AttackResolver   → attack rolls, damage rolls, hit/miss
  ├── InitiativeRoller → initiative ordering
  └── SpellCaster      → spell attack rolls, saving throws
```

### How CombatSimulator Manages Seeding

The `CombatSimulator` creates a fresh `SeededDiceRoller` for each simulation run, ensuring no state leaks between runs. Each run gets a unique seed derived from the base seed:

```typescript
// Internal logic (simplified):
for (let i = 0; i < config.runCount; i++) {
  const runSeed = `${config.baseSeed}-${i}`;
  const roller = createSeededRoller(runSeed);
  const runner = new AICombatRunner();
  const result = runner.runFullCombat(players, enemies, aiConfig, combatConfig, roller);
  aggregator.aggregateRun(result, i, runSeed);
}
```

This means:
- **Run 0** gets seed `"my-base-seed-0"` — completely independent RNG state
- **Run 1** gets seed `"my-base-seed-1"` — fresh roller, no carry-over from Run 0
- Changing `baseSeed` changes all runs; changing `runCount` adds/removes runs without affecting existing ones

> **Note:** The enemy generation seed (used by `EnemyGenerator`) is separate from the simulation seed. Changing the simulation seed does not change which enemies are generated — only how the combat dice fall. See [Seeded RNG in Combat Simulations](#seeded-rng-in-combat-simulations) for the full seeding architecture.

---

## Initiative Roller

The `InitiativeRoller` class manages the D&D 5e initiative system for combat. It handles rolling initiative, sorting combatants by turn order, and managing turn progression.

```typescript
import { InitiativeRoller } from 'playlist-data-engine';

const roller = new InitiativeRoller();
```

### Rolling Initiative

Roll initiative for a single combatant:

```typescript
const combatant = {
  id: 'hero-1',
  character: {
    name: 'Aragorn',
    ability_modifiers: { dexterity: 3 }
  },
  initiative: 0
};

const result = roller.rollInitiativeForCombatant(combatant);
console.log(`${result.combatant.character.name} rolls ${result.d20Roll} + ${result.dexModifier} = ${result.initiativeTotal}`);
// Output: "Aragorn rolls 15 + 3 = 18"
```

Roll initiative for all combatants at once:

```typescript
const combatants = [
  { id: 'hero-1', character: { name: 'Aragorn', ability_modifiers: { dexterity: 3 } }, initiative: 0 },
  { id: 'hero-2', character: { name: 'Gimli', ability_modifiers: { dexterity: -1 } }, initiative: 0 },
  { id: 'enemy-1', character: { name: 'Orc', ability_modifiers: { dexterity: 0 } }, initiative: 0 }
];

const { results, sortedCombatants } = roller.rollInitiativeForAll(combatants);

console.log('Initiative Results:');
results.forEach(r => {
  console.log(`  ${r.combatant.character.name}: ${r.d20Roll} + ${r.dexModifier} = ${r.initiativeTotal}`);
});

console.log('\nTurn Order:');
sortedCombatants.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.character.name} (Initiative: ${c.initiative})`);
});
```

### Turn Management

Get the next combatant in turn order:

```typescript
let currentIndex = 0;
const combatants = sortedCombatants; // from rollInitiativeForAll

const { combatant, index, isNewRound } = roller.getNextCombatant(combatants, currentIndex);
console.log(`Next up: ${combatant.character.name}${isNewRound ? ' (NEW ROUND!)' : ''}`);
currentIndex = index;
```

Get formatted initiative order for display:

```typescript
const order = roller.getInitiativeOrder(combatants);
order.forEach(line => console.log(line));
// Output:
// 1. Aragorn (Initiative: 18, DEX: 3)
// 2. Orc (Initiative: 12, DEX: 0)
// 3. Gimli (Initiative: 8, DEX: -1)
```

### Mid-Combat Changes

Re-roll initiative for a specific combatant (e.g., after a DEX-changing effect):

```typescript
const newInitiative = roller.rerollInitiativeForCombatant(combatant);
console.log(`${combatant.character.name} rerolls initiative: ${newInitiative}`);
```

Delay a combatant's turn (used with the "Ready" action):

```typescript
const delayedOrder = roller.delayTurn(combatants, 'hero-1');
// hero-1 moves to the next position in the initiative order
```

Re-sort combatants by initiative (e.g., when new combatants join mid-fight):

```typescript
combatants.push(newCombatant);
const resortOrder = roller.resortByInitiative(combatants);
// All combatants re-sorted by their current initiative values
```

### Full Combat Workflow Example

```typescript
import { InitiativeRoller, DiceRoller } from 'playlist-data-engine';

// Setup combat
const roller = new InitiativeRoller();
const combatants = [
  { id: 'fighter', character: { name: 'Fighter', ability_modifiers: { dexterity: 2 } }, initiative: 0 },
  { id: 'goblin', character: { name: 'Goblin', ability_modifiers: { dexterity: 2 } }, initiative: 0 },
  { id: 'wizard', character: { name: 'Wizard', ability_modifiers: { dexterity: 0 } }, initiative: 0 }
];

// Roll initiative!
const { sortedCombatants } = roller.rollInitiativeForAll(combatants);

// Display turn order
console.log('=== INITIATIVE ORDER ===');
roller.getInitiativeOrder(sortedCombatants).forEach(line => console.log(line));

// Run combat rounds
let currentRound = 1;
let currentTurnIndex = 0;

while (combatants.length > 1) {
  const { combatant, index, isNewRound } = roller.getNextCombatant(sortedCombatants, currentTurnIndex);

  if (isNewRound) {
    currentRound++;
    console.log(`\n--- ROUND ${currentRound} ---`);
  }

  console.log(`${combatant.character.name}'s turn...`);

  // Combat logic here (attacks, spells, etc.)
  // Use DiceRoller for all dice rolling
  const attackRoll = DiceRoller.rollD20();

  currentTurnIndex = index;
}
```

---

## Seeded RNG in Combat Simulations

Combat simulations use seeded RNG at two layers: **enemy generation** (via `SeededRNG`) and **combat dice rolls** (via `SeededDiceRoller`). Understanding how seeds flow through the system is essential for writing reproducible balance tests and simulation pipelines.

### Two Layers of Seeded Randomness

| Layer | Class | Purpose | Seed Source |
|-------|-------|---------|-------------|
| Enemy generation | `SeededRNG` | Deterministic character stats, equipment, spell selection | User-provided seed string |
| Combat dice rolls | `SeededDiceRoller` | Deterministic attack rolls, damage, saving throws, initiative | Derived per simulation run |

These are independent — the combat roller does not share state with the generation RNG. A single `SeededRNG` instance is used during enemy generation (stats, spells, equipment), then discarded. A fresh `SeededDiceRoller` is created for each simulation run.

### How Seeds Flow in a Simulation

The `CombatSimulator` manages seeding across multiple runs. Given a `baseSeed` and `runCount`, each run gets a unique deterministic seed:

```
baseSeed: "balance-test-1"
runCount: 1000

Run 0  → seed: "balance-test-1-0"
Run 1  → seed: "balance-test-1-1"
Run 2  → seed: "balance-test-1-2"
...
Run 999 → seed: "balance-test-1-999"
```

The seed is formatted as `${baseSeed}-${runIndex}`. Each seed produces a completely independent `SeededDiceRoller` instance, ensuring no state leaks between runs.

### Determinism Guarantees

**Same base seed + same config = identical results, always.**

This holds because the entire system is deterministic:
- `SeededRNG` uses MurmurHash V3 via `deriveSeed()` + `hashSeedToFloat()` with a stateful counter
- `SeededDiceRoller` wraps `SeededRNG` — same seed, same call sequence = same rolls
- `CombatEngine` receives the roller via constructor injection, passing it to `AttackResolver`, `InitiativeRoller`, and `SpellCaster`
- `AICombatRunner` creates a fresh `CombatEngine` per run with the run-specific roller
- AI decisions are deterministic given the same combatant states (no random AI choices)

```typescript
// Proof of determinism
const simulator = new CombatSimulator();
const resultsA = simulator.run(party, enemies, { runCount: 500, baseSeed: 'test-42', aiConfig });
const resultsB = simulator.run(party, enemies, { runCount: 500, baseSeed: 'test-42', aiConfig });

// These are identical — same summary, same per-combatant metrics, same histograms
console.log(resultsA.summary.playerWinRate === resultsB.summary.playerWinRate); // true
```

### What Changes Between Seeds

Changing any of these produces different results:
- **`baseSeed`** — different random rolls across all runs
- **`runCount`** — more/fewer data points, different aggregate statistics
- **`aiConfig`** — different AI decisions change combat flow
- **`combatConfig.maxTurnsBeforeDraw`** — changes how stalemates resolve

```typescript
// Different seed → different results
const results1 = simulator.run(party, enemies, { runCount: 500, baseSeed: 'seed-A', aiConfig });
const results2 = simulator.run(party, enemies, { runCount: 500, baseSeed: 'seed-B', aiConfig });
console.log(results1.summary.playerWinRate === results2.summary.playerWinRate); // almost certainly false
```

### Seed Strategy for Balance Testing

When testing balance across multiple configurations (e.g., parameter sweeps), use a shared base seed so the only variable is the parameter being tested:

```typescript
import { CombatSimulator, ParameterSweep } from 'playlist-data-engine';

// ParameterSweep uses this strategy internally:
// Each data point gets seed `${baseSeed}-${parameterValue}`
// This ensures each CR level is tested with independent but reproducible RNG

const sweep = new ParameterSweep();
const results = sweep.sweep(
  party, baseEnemy,
  {
    variable: 'cr',
    range: { min: 1, max: 10, step: 1 },
    simulationsPerPoint: 500,
    aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
    baseSeed: 'cr-sweep-v1',
  }
);
// Each CR value (1 through 10) gets 500 runs with deterministic seeds
```

### Relationship Between SeededRNG and SeededDiceRoller

`SeededRNG` is the low-level PRNG (pseudorandom number generator). `SeededDiceRoller` is a D&D-specific wrapper that translates RNG output into game mechanics:

```
SeededRNG                    SeededDiceRoller
─────────                    ─────────────────
random()        → 0.0-1.0    rollDie(20)        → 1-20
randomInt(a,b)  → integer    rollD20()           → 1-20
randomChoice()  → element    rollWithAdvantage() → {roll1, roll2, result}
weightedChoice()→ element    calculateDamage()   → {total, rolls, modifier}
shuffle()       → shuffled   rollSavingThrow()   → d20 + mod + prof
```

`SeededDiceRoller` is **instance-based** (not static like `DiceRoller`). Each simulation run creates its own instance with its own `SeededRNG` state. This is what makes per-run isolation possible.

### Injecting a Seeded Roller into CombatEngine

For live combat (random dice), use `CombatEngine` with no roller — it uses `Math.random()` via the static `DiceRoller`:

```typescript
const engine = new CombatEngine({ maxTurnsBeforeDraw: 50 });
// Uses Math.random() — non-deterministic
```

For simulation combat (deterministic dice), inject a `SeededDiceRoller`:

```typescript
import { createSeededRoller } from 'playlist-data-engine';

const engine = new CombatEngine({}, createSeededRoller('my-seed'));
// Every d20 roll, damage roll, and saving throw is deterministic
```

The injected roller flows to all combat subsystems:

```
CombatEngine
  ├── AttackResolver (receives roller)  → attack rolls, damage rolls
  ├── InitiativeRoller (receives roller) → initiative rolls
  └── SpellCaster (receives roller)      → spell attack rolls, saving throws
```

### Full Simulation Pipeline with Seeding

```typescript
import {
  CombatSimulator,
  createSeededRoller,
  SeededRNG,
  EnemyGenerator,
} from 'playlist-data-engine';

// Step 1: Generate enemies deterministically (SeededRNG for generation)
const enemyGen = new EnemyGenerator();
const enemy = enemyGen.generate({
  seed: 'encounter-v3',
  cr: 5,
  rarity: 'elite',
  category: 'humanoid',
  archetype: 'brute',
});

// Step 2: Run simulations (SeededDiceRoller per run, managed by CombatSimulator)
const simulator = new CombatSimulator();
const results = simulator.run(
  party, [enemy],
  {
    runCount: 1000,
    baseSeed: 'balance-test-3',  // Each run gets "balance-test-3-0" through "balance-test-3-999"
    aiConfig: {
      playerStyle: 'normal',
      enemyStyle: 'aggressive',
    },
    onProgress: (done, total) => {
      console.log(`Progress: ${done}/${total} (${((done/total)*100).toFixed(1)}%)`);
    },
  }
);

console.log(`Win rate: ${(results.summary.playerWinRate * 100).toFixed(1)}%`);
console.log(`Avg rounds: ${results.summary.averageRounds.toFixed(1)}`);
console.log(`Player deaths: ${results.summary.totalPlayerDeaths} across ${results.summary.totalRuns} runs`);
```

**Key point:** The enemy generation seed (`encounter-v3`) and the simulation base seed (`balance-test-3`) are independent. Changing the simulation seed does not change which enemies are generated — only how the combat dice fall. This separation lets you test the same encounter composition across many different combat scenarios.

---

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [COMBAT_SYSTEM.md](COMBAT_SYSTEM.md) - Combat system (uses seeded dice for simulations)
- [ENEMY_GENERATION.md](ENEMY_GENERATION.md) - Balance validation and simulation-based analysis
