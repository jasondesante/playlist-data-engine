# Randomness Reference

Complete guide to the dice roller and seeded randomness in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Hash Utilities and Deterministic Seeding](#hash-utilities-and-deterministic-seeding)
2. [Dice Roller](#dice-roller)
3. [Initiative Roller](#initiative-roller)

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

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [COMBAT_SYSTEM.md](COMBAT_SYSTEM.md) - Combat system using dice rolling
