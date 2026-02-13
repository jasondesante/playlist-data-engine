# Enemy Generation System - Part 2 (V2 Enhancements)

## Overview

This plan covers V2 enhancements to the enemy generation system, building on the V1 foundation. Includes advanced audio integration, equipment generation, additional enemy categories, and legendary boss mechanics.

## Prerequisites

V1 implementation must be complete before starting V2 work. See `ENEMY_GENERATION_PLAN.md` for V1 details.

---

## V2 Feature Summary

| Feature | Description |
|---------|-------------|
| **Audio Stat Influence** | Audio profile affects stat distribution (bass→STR/CON, treble→DEX) |
| **Equipment Generation** | Enemies get actual weapons/armor based on archetype |
| **enemyMix: category** | Random mix of enemies from same category |
| **enemyMix: random** | Completely random enemy mix |
| **CR/Level Functions** | Dedicated conversion functions with tuning parameters |
| **Innate Spellcasting** | Dedicated spell slot system for caster enemies |
| **Additional Categories** | Undead, Dragon, Fiend, Construct, Elemental, Monstrosity |
| **Legendary System** | Legendary actions and resistances for boss-tier enemies |

---

## Task 1: Audio-Influenced Stat Distribution

**File:** `src/core/generation/EnemyGenerator.ts`

**Subtasks:**
- [x] Add private `applyAudioStatInfluence()` method:
  ```typescript
  applyAudioStatInfluence(stats: AbilityScores, audioProfile: AudioProfile): AbilityScores
  ```
- [x] Implement frequency band → stat mapping:
  - Bass dominance → +1 to STR and CON
  - Treble dominance → +1 to DEX
  - Mid dominance → +1 to WIS and CHA
  - Balanced → +1 to all (smaller bonus)
- [x] Update `createEnemy()` to call this when audioProfile is provided
- [x] Cap stat increases to prevent extreme values (max +2 from audio)

**Notes:**
- This is additive to rarity scaling, not multiplicative
- Should feel like a subtle flavor, not a massive power shift

**Status:** ✅ Completed - Implemented with MAX_AUDIO_INFLUENCE constant (2) and applied in generate() method

---

## Task 2: Equipment Generation System

**File:** `src/core/generation/EnemyEquipmentGenerator.ts` (new file)

**Subtasks:**
- [x] Create `EnemyEquipmentGenerator` class with static methods
- [x] Define `EquipmentTemplate` interface:
  ```typescript
  interface EquipmentTemplate {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'shield';
    archetype: EnemyArchetype[];
    rarity: EnemyRarity[];
    damage?: string;  // e.g., "1d8" for weapons
    acBonus?: number; // for armor/shields
    properties?: string[]; // e.g., ["reach", "two-handed"]
  }
  ```
- [x] Create equipment templates by archetype:
  - **Brute**: Greataxe, Longsword, Handaxe, Mace
  - **Archer**: Longbow, Light Crossbow, Shortsword, Dagger (backup)
  - **Support**: Quarterstaff, Mace, Dagger
- [x] Implement `generateEquipment()`:
  - Select appropriate weapon based on archetype
  - Select armor based on archetype + rarity
  - Higher rarity = better equipment (elite gets better stuff than common)
- [x] Update `generate()` in EnemyGenerator to use EnemyEquipmentGenerator
- [x] Equipment affects combat stats (AC from armor, signature damage dice for attacks)

**Notes:**
- Created `src/constants/EnemyEquipment.ts` with equipment templates organized by archetype and rarity
- Enemies now receive actual equipment names (Greataxe, Chain Mail, etc.) from DEFAULT_EQUIPMENT
- Signature ability damage dice (d6/d8/d10/d12) are used for weapon damage, scaled by rarity
- Shield availability: starts at uncommon rarity, with probability increasing by tier (25% common, 50% uncommon, 75% elite, 100% boss)
- Archers do not receive shields (two-handed weapons)
- Plate armor only available to boss-tier brutes

**Status:** ✅ Completed - Equipment generation fully implemented with 31 passing unit tests

---

## Task 3: enemyMix 'category' Mode

**File:** `src/core/generation/EnemyGenerator.ts`

**Subtasks:**
- [ ] Update `EnemyMixMode` type to include `'category'`
- [ ] Update `selectTemplatesForMix()` to handle 'category' mode:
  - [ ] Filter templates by the provided `category` option
  - [ ] For each enemy, randomly select from filtered templates
  - [ ] Use weighted selection if audioProfile provided
- [ ] Add validation: `category` option required when using 'category' mode
- [ ] Update documentation with examples

**Example:**
```typescript
// Mix of different humanoid enemies
EnemyGenerator.generateEncounter(party, {
  seed: 'humanoid-camp',
  enemyMix: 'category',
  category: 'humanoid',
  count: 6
});
// Could produce: 2 orcs, 2 goblin-archers, 1 shaman, 1 hunter
```

---

## Task 4: enemyMix 'random' Mode

**File:** `src/core/generation/EnemyGenerator.ts`

**Subtasks:**
- [ ] Update `EnemyMixMode` type to include `'random'`
- [ ] Update `selectTemplatesForMix()` to handle 'random' mode:
  - [ ] Select from ALL available templates
  - [ ] Use weighted selection if audioProfile provided
  - [ ] Each enemy independently randomized
- [ ] Update documentation with examples and warnings

**Example:**
```typescript
// Completely random encounter
EnemyGenerator.generateEncounter(party, {
  seed: 'chaos-fight',
  enemyMix: 'random',
  count: 4
});
// Could produce: 1 orc, 1 giant spider, 1 shaman, 1 bear
```

**Notes:**
- This can create thematically disjoint encounters - use with intent
- Consider adding `allowMixedCategories: boolean` option for validation

---

## Task 5: CR/Level Conversion Functions

**File:** `src/core/generation/EnemyGenerator.ts` (or utility file)

**Subtasks:**
- [ ] Create `crToLevel(cr: number): number`:
  ```typescript
  // D&D 5e mapping with smooth interpolation
  // CR 0 = level 0, CR 1 = level 1, CR 2 = level 2, etc.
  // Fractional CRs: CR 0.25 = level 0.5, CR 0.5 = level 0.75
  ```
- [ ] Create `levelToCR(level: number): number`:
  ```typescript
  // Inverse of above
  // Apply tuning factors for game balance
  ```
- [ ] Create `CR_TUNING` config object:
  ```typescript
  const CR_TUNING = {
    baseMultiplier: 1.0,
    levelOffset: 0,
    customCurve: [] // Optional custom CR/level mappings
  };
  ```
- [ ] Replace inline formulas in V1 code with these functions
- [ ] Add unit tests for conversion accuracy

**Notes:**
- Keep V1 inline formula as fallback if functions not available
- Tuning allows game balance adjustments without code changes

---

## Task 6: Innate Spellcasting System

**File:** `src/core/generation/SpellcastingGenerator.ts` (new file)

**Subtasks:**
- [ ] Create `SpellcastingGenerator` class
- [ ] Define `InnateSpell` interface:
  ```typescript
  interface InnateSpell {
    id: string;
    name: string;
    level: number; // 0 = cantrip, 1-9 = spell level
    school: string;
    effect: string;
    damage?: string; // e.g., "2d6"
    save?: string;   // e.g., "DEX"
  }
  ```
- [ ] Define `SpellList` interface:
  ```typescript
  interface SpellList {
    archetype: EnemyArchetype;
    spells: {
      cantrips: InnateSpell[];
      level1: InnateSpell[];
      level2: InnateSpell[];
      // etc.
    };
  }
  ```
- [ ] Create spell lists by archetype:
  - **Support**: Buffs, debuffs, healing (Bless, Bane, Cure Wounds)
  - **Archer**: Utility, escape, crowd control (Misty Step, Hold Person)
  - **Brute**: Damage, self-buffs (Burning Hands, Divine Favor)
- [ ] Implement `generateSpellList()`:
  - Select spells based on enemy archetype
  - Number of spells based on rarity (boss gets more than elite)
  - Cantrip + spell slots determined by CR
- [ ] Create `SPELL_SLOTS_BY_CR` lookup table
- [ ] Update `generateAbilities()` to include spells as Features
- [ ] Mark spell Features with `isSpell: true` property

**Notes:**
- Spells are still Features for combat integration
- This just provides structure for selection and slot management

---

## Task 7: New Enemy Categories - Undead

**File:** `src/constants/EnemyTemplates/Undead.ts`

**Subtasks:**
- [ ] Create `Undead.ts` file with undead templates
- [ ] Define undead-specific resistances: necrotic resistance, poison immunity
- [ ] Create templates:

| Template | Archetype | Signature Ability | Audio Pref |
|----------|-----------|-------------------|------------|
| Skeleton | Archer | Bone Shot (piercing damage bonus) | Treble |
| Zombie | Brute | Undead Grip (grapple + bite) | Bass |
| Wight | Brute | Life Drain (damage + self heal) | Mid |
| Ghost | Support | Horrifying Visage (fear debuff) | Mid |

- [ ] Add to main templates export
- [ ] Add unit tests for undead generation

---

## Task 8: New Enemy Categories - Fiend

**File:** `src/constants/EnemyTemplates/Fiend.ts`

**Subtasks:**
- [ ] Create `Fiend.ts` file with fiend templates
- [ ] Define fiend-specific resistances: fire resistance, cold resistance
- [ ] Create templates:

| Template | Archetype | Signature Ability | Audio Pref |
|----------|-----------|-------------------|------------|
| Imp | Archer | Sting (poison damage) | Treble |
| Quasit | Support | Fear Aura (debuff) | Mid |
| Lemure | Brute | Hellish Resilience (damage reduction) | Bass |
| Demon | Brute | Chaos Claw (random damage type) | Bass |

- [ ] Add to main templates export
- [ ] Add unit tests for fiend generation

---

## Task 9: New Enemy Categories - Elemental

**File:** `src/constants/EnemyTemplates/Elemental.ts`

**Subtasks:**
- [ ] Create `Elemental.ts` file with elemental templates
- [ ] Define elemental-specific resistances: immunity to own element
- [ ] Create templates:

| Template | Archetype | Signature Ability | Audio Pref |
|----------|-----------|-------------------|------------|
| Fire Elemental | Brute | Burning Touch (fire + ongoing) | Bass |
| Water Elemental | Support | Whirlpool (restrain + pull) | Mid |
| Air Elemental | Archer | Wind Blast (ranged push) | Treble |
| Earth Elemental | Brute | Earth Slam (AoE + prone) | Bass |

- [ ] Add to main templates export
- [ ] Add unit tests for elemental generation

---

## Task 10: New Enemy Categories - Construct

**File:** `src/constants/EnemyTemplates/Construct.ts`

**Subtasks:**
- [ ] Create `Construct.ts` file with construct templates
- [ ] Define construct-specific traits: poison immunity, psychic immunity, no healing
- [ ] Create templates:

| Template | Archetype | Signature Ability | Audio Pref |
|----------|-----------|-------------------|------------|
| Animated Armor | Brute | Slam (force damage) | Bass |
| Flying Sword | Archer | Diving Strike (bonus on charge) | Treble |
| Shield Guardian | Support | Protection Aura (ally AC bonus) | Mid |
| Golem | Brute | Immutable Form (status immunity) | Bass |

- [ ] Add to main templates export
- [ ] Add unit tests for construct generation

---

## Task 11: New Enemy Categories - Dragon

**File:** `src/constants/EnemyTemplates/Dragon.ts`

**Subtasks:**
- [ ] Create `Dragon.ts` file with dragon templates (these are young/lesser dragons, not ancient)
- [ ] Define dragon-specific traits: damage immunity (by type), frightful presence
- [ ] Create templates:

| Template | Archetype | Signature Ability | Audio Pref |
|----------|-----------|-------------------|------------|
| Young Red Dragon | Brute | Fire Breath (AoE fire) | Bass |
| Young Blue Dragon | Archer | Lightning Breath (line lightning) | Treble |
| Dragon Wyrmling | Brute | Bite + Claw (multiattack) | Mid |
| Drake | Brute | Tail Swipe (knockback) | Bass |

- [ ] Add to main templates export
- [ ] Add unit tests for dragon generation

---

## Task 12: New Enemy Categories - Monstrosity

**File:** `src/constants/EnemyTemplates/Monstrosity.ts`

**Subtasks:**
- [ ] Create `Monstrosity.ts` file with monstrosity templates
- [ ] Monstrosities have varied traits, no universal category traits
- [ ] Create templates:

| Template | Archetype | Signature Ability | Audio Pref |
|----------|-----------|-------------------|------------|
| Owlbear | Brute | Multiattack (beak + claws) | Bass |
| Griffin | Archer | Dive Attack (bonus from flight) | Treble |
| Mimic | Brute | Adhesive (grapple on hit) | Mid |
| Basilisk | Support | Petrifying Gaze (save or stunned) | Mid |

- [ ] Add to main templates export
- [ ] Add unit tests for monstrosity generation

---

## Task 13: Legendary Actions System

**File:** `src/core/generation/LegendaryGenerator.ts` (new file)

**Subtasks:**
- [ ] Define `LegendaryAction` interface:
  ```typescript
  interface LegendaryAction {
    id: string;
    name: string;
    description: string;
    cost: number; // 1, 2, or 3 actions
    effect: string;
    damage?: string;
  }
  ```
- [ ] Create `LEGENDARY_ACTIONS` constant pool organized by archetype
- [ ] Implement `generateLegendaryActions()`:
  - Select 3 legendary actions for boss enemies
  - Weighted by archetype compatibility
  - Include at least one movement option
- [ ] Define `LEGENDARY_RESISTANCES` constant: number per CR tier
- [ ] Update `createEnemy()` to add legendary system for boss rarity

**Legendary Action Pool (examples):**

| Action | Archetype | Cost | Effect |
|--------|-----------|------|--------|
| Tail Attack | Brute | 1 | Free attack |
| Teleport | All | 2 | Move without opportunity attacks |
| Rally | Support | 1 | Adjacent ally gets attack |
| Snipe | Archer | 1 | Ranged attack with advantage |
| Frightful Presence | All | 1 | DC save or frightened |
| Devour | Brute | 3 | Massive damage + heal |

---

## Task 14: Boss Enemy Enhancements

**File:** `src/core/generation/EnemyGenerator.ts`

**Subtasks:**
- [ ] Update boss rarity generation to include:
  - Legendary resistances (3/day by default)
  - Legendary actions (3 per round)
  - Lair action hint (for encounter design)
- [ ] Add `generateBossFeatures()` method for boss-specific abilities:
  - Signature ability gets enhanced version (d12 → 2d12)
  - Add one "ultimate" ability usable once per encounter
- [ ] Update `createEnemy()` to call boss enhancements for boss rarity
- [ ] Add boss-specific name prefixes/suffixes (optional flavor):
  - "Grognak the Destroyer"
  - "Vexis, Lord of Bones"

---

## Task 15: Update Type Definitions

**File:** `src/core/types/Enemy.ts`

**Subtasks:**
- [ ] Update `EnemyCategory` to include all new categories:
  ```typescript
  type EnemyCategory = 'humanoid' | 'beast' | 'undead' | 'dragon' |
                       'fiend' | 'construct' | 'elemental' | 'monstrosity';
  ```
- [ ] Update `EnemyMixMode` to include all modes:
  ```typescript
  type EnemyMixMode = 'uniform' | 'custom' | 'category' | 'random';
  ```
- [ ] Add `LegendaryConfig` interface:
  ```typescript
  interface LegendaryConfig {
    resistances: number;      // Uses per day
    actions: LegendaryAction[];
    lairActionHint?: string;
  }
  ```
- [ ] Add `EquipmentConfig` interface:
  ```typescript
  interface EquipmentConfig {
    weapon?: EquipmentTemplate;
    armor?: EquipmentTemplate;
    shield?: EquipmentTemplate;
  }
  ```
- [ ] Add `SpellcastingConfig` interface:
  ```typescript
  interface SpellcastingConfig {
    cantrips: InnateSpell[];
    spells: InnateSpell[];
    slots: { [level: number]: number };
  }
  ```

---

## Task 16: Update EncounterGenerationOptions

**File:** `src/core/types/Enemy.ts`

**Subtasks:**
- [ ] Remove V1/V2 distinction comments
- [ ] Add new options:
  ```typescript
  interface EncounterGenerationOptions {
    // ... existing V1 options ...
    allowMixedCategories?: boolean;  // For 'random' mode validation
    lairFeatures?: boolean;          // Include lair actions for bosses
    minRarity?: EnemyRarity;         // Force minimum rarity
    maxRarity?: EnemyRarity;         // Cap maximum rarity
  }
  ```

---

## Task 17: Update Documentation

**File:** `ENEMY_GENERATION.md`

**Subtasks:**
- [ ] Add V2 features section
- [ ] Document all new enemy categories with examples
- [ ] Document legendary system with examples
- [ ] Document equipment generation
- [ ] Document spellcasting system
- [ ] Update API reference with all new options
- [ ] Add "Migration from V1" section if needed

---

## Task 18: Update DATA_ENGINE_REFERENCE.md

**File:** `DATA_ENGINE_REFERENCE.md`

**Subtasks:**
- [ ] Update **EnemyGenerator** section with new methods:
  - [ ] Add `crToLevel()` and `levelToCR()` functions to methods table
  - [ ] Update `generateEncounter()` to note new `enemyMix` modes
- [ ] Update **EncounterGenerationOptions** table:
  - [ ] Add `enemyMix: 'category' | 'random'` options
  - [ ] Add `allowMixedCategories?: boolean`
  - [ ] Add `lairFeatures?: boolean`
  - [ ] Add `minRarity?: EnemyRarity` and `maxRarity?: EnemyRarity`
- [ ] Update **EnemyCategory** table:
  - [ ] Remove "(future V2)" notes from undead, dragon, fiend, construct, elemental, monstrosity
- [ ] Update **EnemyMixMode** table:
  - [ ] Add `category` mode with description
  - [ ] Add `random` mode with description
- [ ] Add new **EquipmentGenerator** section:
  - [ ] Location: `src/core/generation/EquipmentGenerator.ts`
  - [ ] Table of methods: `generateEquipment()`, etc.
  - [ ] EquipmentTemplate interface summary
  - [ ] EquipmentConfig interface summary
- [ ] Add new **SpellcastingGenerator** section:
  - [ ] Location: `src/core/generation/SpellcastingGenerator.ts`
  - [ ] Table of methods: `generateSpellList()`, etc.
  - [ ] InnateSpell interface summary
  - [ ] SpellList interface summary
  - [ ] SpellcastingConfig interface summary
- [ ] Add new **LegendaryGenerator** section:
  - [ ] Location: `src/core/generation/LegendaryGenerator.ts`
  - [ ] Table of methods: `generateLegendaryActions()`, etc.
  - [ ] LegendaryAction interface summary
  - [ ] LegendaryConfig interface summary
- [ ] Add **Boss Enhancements** subsection under EnemyGenerator:
  - [ ] Document legendary resistances (3/day default)
  - [ ] Document legendary actions (3 per round)
  - [ ] Document ultimate ability (once per encounter)
- [ ] Add **Audio Stat Influence** subsection under EnemyGenerator:
  - [ ] Document frequency band → stat mapping table
  - [ ] Note max +2 cap from audio
- [ ] Add cross-references to new template files in Enemy Type Definitions section:
  - [ ] [Undead.ts](src/constants/EnemyTemplates/Undead.ts)
  - [ ] [Fiend.ts](src/constants/EnemyTemplates/Fiend.ts)
  - [ ] [Elemental.ts](src/constants/EnemyTemplates/Elemental.ts)
  - [ ] [Construct.ts](src/constants/EnemyTemplates/Construct.ts)
  - [ ] [Dragon.ts](src/constants/EnemyTemplates/Dragon.ts)
  - [ ] [Monstrosity.ts](src/constants/EnemyTemplates/Monstrosity.ts)

**Notes:**
- Follow existing documentation style guide conventions
- Use "Also known as" aliases where helpful for discoverability
- Include location links for all new files using `[src/path/file.ts](src/path/file.ts)` format
- Tables for interfaces should summarize key properties, not copy full definitions
- Cross-reference to ENEMY_GENERATION.md for usage examples

---

## Task 19: V2 Unit Tests

**File:** `tests/unit/enemy-generation-v2.test.ts`

**Subtasks:**
- [ ] Test audio stat influence (bass → STR, treble → DEX)
- [ ] Test equipment generation by archetype
- [ ] Test 'category' enemyMix mode
- [ ] Test 'random' enemyMix mode
- [ ] Test CR/level conversion functions
- [ ] Test spell list generation
- [ ] Test legendary action generation
- [ ] Test boss enhancements (legendary resistances, ultimate ability)
- [ ] Test all new enemy categories (template loading)
- [ ] Test boss name generation

---

## Task 20: V2 Integration Tests

**File:** `tests/integration/enemy-encounter-v2.test.ts`

**Subtasks:**
- [ ] Test: Audio profile affects both template selection AND stats
- [ ] Test: Equipped enemies have correct AC/damage from equipment
- [ ] Test: Category mix produces enemies from same category only
- [ ] Test: Random mix can produce any enemy type
- [ ] Test: Spellcasting enemies can use spells in combat
- [ ] Test: Boss enemies have legendary actions/resistances
- [ ] Test: Undead enemies have correct immunities
- [ ] Test: Dragon enemies have breath weapons
- [ ] Test: Elemental enemies have elemental immunities
- [ ] Test: Generated V2 enemies work in CombatEngine

---

## Task 21: Verification

**Subtasks:**
- [ ] All V2 unit tests pass
- [ ] All V2 integration tests pass
- [ ] Manual test: Generate boss with legendary system
- [ ] Manual test: Generate encounter with audio stat influence
- [ ] Manual test: Generate equipped vs unequipped enemies, compare stats
- [ ] Manual test: Generate each new category, verify correct traits
- [ ] Manual test: Spellcasting in combat works correctly
- [ ] TypeScript compilation with no errors
- [ ] V1 tests still pass (no regressions)

---

## Summary of Files to Create

| File | Purpose |
|------|---------|
| `src/core/generation/EquipmentGenerator.ts` | Weapon/armor generation |
| `src/core/generation/SpellcastingGenerator.ts` | Innate spell system |
| `src/core/generation/LegendaryGenerator.ts` | Legendary actions/resistances |
| `src/constants/EnemyTemplates/Undead.ts` | Undead enemy templates |
| `src/constants/EnemyTemplates/Fiend.ts` | Fiend enemy templates |
| `src/constants/EnemyTemplates/Elemental.ts` | Elemental enemy templates |
| `src/constants/EnemyTemplates/Construct.ts` | Construct enemy templates |
| `src/constants/EnemyTemplates/Dragon.ts` | Dragon enemy templates |
| `src/constants/EnemyTemplates/Monstrosity.ts` | Monstrosity templates |
| `tests/unit/enemy-generation-v2.test.ts` | V2 unit tests |
| `tests/integration/enemy-encounter-v2.test.ts` | V2 integration tests |

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/core/types/Enemy.ts` | Add new interfaces, update types |
| `src/core/generation/EnemyGenerator.ts` | Add V2 features |
| `src/constants/DefaultEnemies.ts` | Re-export from new template files |
| `ENEMY_GENERATION.md` | Add V2 documentation |
| `DATA_ENGINE_REFERENCE.md` | Add V2 API reference (generators, types, options) |

---

## V2 Feature Dependencies

```
Audio Stat Influence ─┐
Equipment Generation ─┼──→ EnemyGenerator updates
enemyMix modes ───────┤
CR/Level Functions ───┤
Innate Spellcasting ──┤
Legendary System ─────┘

Undead ───────┐
Fiend ────────┤
Elemental ────┼──→ Template files
Construct ────┤
Dragon ───────┤
Monstrosity ──┘
```

---

## Future Considerations (V3+)

- **Lair Actions**: Environment-specific abilities tied to boss locations
- **Pack Tactics**: Synergy bonuses for same-type groups
- **Named Enemies**: Procedural name/title generation
- **Minion System**: One-hit-kill swarm enemies
- **Dynamic Difficulty**: Mid-combat enemy adaptation
