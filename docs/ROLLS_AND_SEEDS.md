# Randomness Reference

Complete guide to the dice roller and seeded randomness in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Dice Roller](#dice-roller)
2. [Hash Utilities and Deterministic Seeding](#hash-utilities-and-deterministic-seeding)


---

## Dice Roller

The `DiceRoller` module provides utility functions for D&D-style dice rolling. These are standalone functions (not a class) that can be imported and used directly.

```typescript
import {
  rollDie,
  rollD20,
  rollMultipleDice,
  parseDiceFormula,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollInitiative,
  calculateDamage,
  doubleDamage,
  rollSavingThrow,
  rollAbilityCheck,
  isCriticalHit,
  isCriticalMiss,
  seededRoll,
  rollPercentile
} from 'playlist-data-engine';

// Basic dice rolling
const d6Result = rollDie(6);           // Roll a single d6 (1-6)
const d20Result = rollD20();           // Roll a d20 (1-20)
const threeD6 = rollMultipleDice(3, 6); // Roll 3d6, returns [3, 5, 2]
const percentile = rollPercentile();   // Roll d100 (1-100)

// Parse and roll dice formulas
const fireball = parseDiceFormula('8d6+5');
console.log(`Fireball damage: ${fireball.total}`);  // Sum of all rolls + modifier
console.log(`Individual rolls: ${fireball.rolls}`); // Array of each die result

// Advantage and disadvantage
const advRoll = rollWithAdvantage();
console.log(`Rolled ${advRoll.roll1} and ${advRoll.roll2}, taking ${advRoll.result}`);

const disadvRoll = rollWithDisadvantage();
console.log(`Rolled ${disadvRoll.roll1} and ${disadvRoll.roll2}, taking ${disadvRoll.result}`);

// Combat functions
const initiative = rollInitiative(3);  // d20 + DEX modifier (e.g., +3)

const damage = calculateDamage('2d6', 2, false);  // formula, modifier, critical?
console.log(`Damage: ${damage.total} (${damage.rolls} + ${damage.modifier})`);

const critDamage = calculateDamage('2d6', 2, true);  // Critical hit - dice doubled
console.log(`Critical damage: ${critDamage.total}`);

// Manual critical handling
const baseRolls = rollMultipleDice(2, 6);  // [4, 3]
const critRolls = doubleDamage(baseRolls);   // [4, 3, 4, 3]

// Saving throws and ability checks
const fortitudeSave = rollSavingThrow(2, 2);  // ability modifier + proficiency bonus
const athleticsCheck = rollAbilityCheck(4, 0);  // ability modifier only

// Critical detection
const attackRoll = rollD20();
if (isCriticalHit(attackRoll)) {
  console.log('Critical hit! Double the damage dice!');
}
if (isCriticalMiss(attackRoll)) {
  console.log('Critical miss! Attack fails automatically.');
}

// Seeded RNG for reproducible rolls
const seeded = seededRoll(12345);  // Same seed always produces same result
const anotherSeeded = seededRoll(12345);  // Will equal seeded
```

**Common Use Case: Custom Attack Resolution**

```typescript
import { rollD20, rollWithAdvantage, parseDiceFormula, isCriticalHit } from 'playlist-data-engine';

function resolveAttack(attackBonus: number, targetAC: number, hasAdvantage: boolean) {
  let d20Roll: number;

  if (hasAdvantage) {
    const result = rollWithAdvantage();
    d20Roll = result.result;
    console.log(`Advantage: rolled ${result.roll1} and ${result.roll2}`);
  } else {
    d20Roll = rollD20();
  }

  const total = d20Roll + attackBonus;
  const hit = total >= targetAC;
  const crit = isCriticalHit(d20Roll);

  return { d20Roll, total, hit, crit };
}

const attack = resolveAttack(7, 15, true);
console.log(`Attack roll: ${attack.d20Roll} + 7 = ${attack.total} vs AC 15`);
console.log(attack.crit ? 'CRITICAL HIT!' : (attack.hit ? 'Hit!' : 'Miss!'));
```

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