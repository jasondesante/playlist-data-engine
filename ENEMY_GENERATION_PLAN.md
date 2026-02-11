# Enemy Generation System - Implementation Plan

## Overview

Add an enemy generation system that creates balanced encounters based on party strength, with support for audio-based generation and flexible difficulty scaling.

## Design Philosophy

- **Elegant over complex**: Reuse existing systems (FeatureQuery, SeededRNG) rather than building parallel systems
- **Infinite scaling**: Any enemy template can scale from Common to Boss tier
- **Signature + extras**: Every enemy type has ONE signature ability shared across all rarities (scaled), higher rarities gain additional abilities from the existing FeatureQuery pool
- **Audio-influenced**: Audio profile affects both template selection AND stat distribution

---

## Core Design Decisions

### Rarity Tier System

| Rarity | Stats | Signature Ability | Extra Abilities | Resistances |
|--------|-------|-------------------|-----------------|-------------|
| Common | Base | d6 version | None | None |
| Uncommon | +10% | d8 version | 1 from pool | None |
| Elite | +25% | d10 version | 2 from pool | Type-based |
| Boss | +50% | d12 version | 3 from pool | Type-based |

**Signature Ability Scaling**: The signature ability uses dice that scale by rarity (d6 → d8 → d10 → d12). All rarities share the same ability concept, just with different damage dice.

**Extra Abilities**: Drawn from the existing FeatureQuery pool, filtered by archetype compatibility. Higher rarities get more picks.

**Resistances**: Elite and Boss enemies gain type-appropriate resistances/immunities (e.g., Fire Elemental = fire immunity, Undead = necrotic resistance).

### Auto Rarity Mix (Leader System)

When generating encounters with **more than 3 enemies**, the system automatically promotes one enemy to a higher rarity tier as a "leader":

| Enemy Count | Leader Rule |
|-------------|-------------|
| 1-3 | No leader, all same rarity |
| 4-6 | 1 enemy promoted to next rarity tier |
| 7-9 | 1 enemy promoted two tiers up |
| 10+ | 2 enemies promoted (1 one tier, 1 two tiers) |

Example: Generate 5 goblins at common rarity → Result: 1 uncommon goblin leader + 4 common goblins

### Mixed Enemy Types

Encounters can contain different enemy types. The `enemyMix` option controls this:

```typescript
// All same type (default)
{ enemyMix: 'uniform' }

// Specific mix defined by user
{ enemyMix: 'custom', templates: ['orc', 'orc', 'goblin-archer'] }
```

**V2 additions:**
```typescript
// Mix of types from same category
{ enemyMix: 'category', category: 'humanoid' }

// Completely random mix
{ enemyMix: 'random' }
```

### Generation Modes

Two ways to generate encounters:

1. **Party-based**: Analyze party strength → calculate balanced encounter
2. **CR-based**: Specify target CR directly → generate enemies matching that CR

Both modes support audio influence, difficulty multipliers, and all other options.

### Template Structure

Each template has:
- **Fixed archetype**: All instances of this template share the same combat role
- **One signature ability**: Shared across all rarities, scaled by dice
- **Category**: Humanoid, Beast, Dragon, Undead, etc.
- **Audio preference**: Weighting for template selection based on audio profile

### Audio Integration

Audio profile influences:
1. **Template Selection**: Bass-heavy audio → more likely to select brute templates, treble-heavy → archers/skirmishers
2. **Stat Distribution**: Bass → higher STR/CON, treble → higher DEX, mid → balanced

### Spell System

- **Innate spellcasting only**: Caster-type enemies have a pre-set list of spells they can cast
- **No spell slots**: Simplified system where spells are treated as special abilities
- **Reuse FeatureQuery**: Spells are just features with spell-like effects

### Encounter Balance

- **D&D 5e XP Budget**: Use official tables with tuning capability
- **Party Analyzer**: Calculate party strength, provide XP budget for desired difficulty
- **Multi-enemy scaling**: Apply D&D's encounter multiplier for group fights

---

## Initial Template Scope

### Categories (This Implementation)
- **Humanoid**: Civilized races that fight with weapons/armor
- **Beast**: Natural animals and magical creatures

### Categories (Future Implementation)
- Undead, Dragon, Fiend, Construct, Elemental, Monstrosity

### Archetypes (This Implementation)
- **Brute**: High HP, high damage, melee-focused
- **Archer**: Ranged specialist, high accuracy, lower HP
- **Support**: Buffs allies, debuffs enemies, control abilities

### Planned Templates (10-15 total)

#### Humanoid - Brute
| Template | Signature Ability | Audio Preference |
|----------|------------------|------------------|
| Orc | Savage Strike (bonus melee damage) | Bass-heavy |
| Bandit | Cheap Shot (bonus damage vs flat-footed) | Mid-range |

#### Humanoid - Archer
| Template | Signature Ability | Audio Preference |
|----------|------------------|------------------|
| Hunter | Precise Shot (ignore half cover) | Treble-heavy |
| Goblin Archer | Sneaky Shot (bonus damage from hiding) | Treble-heavy |

#### Humanoid - Support
| Template | Signature Ability | Audio Preference |
|----------|------------------|------------------|
| Shaman | Spirit Bond (ally damage boost) | Mid-range |
| Cultist | Dark Blessing (ally AC bonus) | Mid-range |

#### Beast - Brute
| Template | Signature Ability | Audio Preference |
|----------|------------------|------------------|
| Bear | Maul (multiattack with grapple) | Bass-heavy |
| Boar | Gore Charge (bonus damage on charge) | Bass-heavy |

#### Beast - "Archer" (Ranged)
| Template | Signature Ability | Audio Preference |
|----------|------------------|------------------|
| Giant Spider | Web Spray (ranged restrain) | Treble-heavy |
| Stirge | Blood Drain (ranged life steal) | Treble-heavy |

---

## Task 1: Create Enemy Type Definitions

**File:** `src/core/types/Enemy.ts`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Define `EnemyCategory` type: 'humanoid' | 'beast' | 'undead' | 'dragon' | 'fiend' | 'construct' | 'elemental' | 'monstrosity'
- [x] Define `EnemyRarity` type: 'common' | 'uncommon' | 'elite' | 'boss'
- [x] Define `EnemyArchetype` type: 'brute' | 'archer' | 'support'
- [x] Define `EnemyMixMode` type: 'uniform' | 'custom' (V2: add 'category' | 'random')
- [x] Create `SignatureAbility` interface with: id, name, description, damageDie (base d6), damageType, attackType, range
- [x] Create `EnemyTemplate` interface with:
  - id, name, category, archetype
  - signatureAbility: SignatureAbility
  - baseStats: { str, dex, con, int, wis, cha }
  - baseHP, baseAC, baseSpeed
  - audioPreference: { bass: number, mid: number, treble: number }
  - resistances: array of damage types (for Elite+ scaling)
- [x] Create `RarityConfig` interface with: statMultiplier, signatureDieSize, extraAbilityCount, hasResistances
- [x] Create `EnemyGenerationOptions` interface for single enemy:
  ```typescript
  {
    seed: string;                              // Required - deterministic generation
    templateId?: string;                       // Optional - force specific template (e.g., 'orc', 'giant-spider')
    rarity?: EnemyRarity;                      // Optional - default: 'common'
    difficultyMultiplier?: number;             // Optional - default: 1.0
    audioProfile?: AudioProfile;               // Optional - influences stats
    track?: TrackData;                         // Optional - required if audioProfile provided
  }
  ```
- [x] Create `EncounterGenerationOptions` interface for groups:
  ```typescript
  {
    seed: string;                              // Required - deterministic generation
    count: number;                             // Required - number of enemies
    difficulty?: 'easy' | 'medium' | 'hard' | 'deadly';  // Optional - for party-based, default: 'medium'
    targetCR?: number;                         // Optional - for CR-based generation (no party needed)
    baseRarity?: EnemyRarity;                  // Optional - default rarity before leader promotion
    difficultyMultiplier?: number;             // Optional - fine-tune difficulty, default: 1.0
    category?: EnemyCategory;                  // Optional - filter by category
    archetype?: EnemyArchetype;                // Optional - filter by archetype
    templateId?: string;                       // Optional - force specific template for all
    enemyMix?: EnemyMixMode;                   // Optional - default: 'uniform' (V1: only 'uniform' | 'custom')
    templates?: string[];                      // Optional - for 'custom' mix mode
    audioProfile?: AudioProfile;               // Optional - influences selection
    track?: TrackData;                         // Optional - required if audioProfile provided
    enableLeaderPromotion?: boolean;           // Optional - default: true for groups > 3
  }
  ```

**Additional types created (bonus/enhancements):**
- `EncounterDifficulty` type: 'easy' | 'medium' | 'hard' | 'deadly'
- `AudioPreference` interface: bass, mid, treble weights
- `EnemyMetadata` interface: generation tracking metadata
- `EnemyFeature` interface: reusable enemy ability structure
- Type guards: `isValidEnemyCategory()`, `isValidEnemyRarity()`, `isValidEnemyArchetype()`, `isValidEncounterDifficulty()`

---

## Task 2: Create Rarity Configuration

**File:** `src/constants/EnemyRarity.ts`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Define `RARITY_CONFIGS` object mapping rarity to configuration:
  ```typescript
  {
    common: { statMultiplier: 1.0, signatureDieSize: 6, extraAbilityCount: 0, hasResistances: false },
    uncommon: { statMultiplier: 1.1, signatureDieSize: 8, extraAbilityCount: 1, hasResistances: false },
    elite: { statMultiplier: 1.25, signatureDieSize: 10, extraAbilityCount: 2, hasResistances: true },
    boss: { statMultiplier: 1.5, signatureDieSize: 12, extraAbilityCount: 3, hasResistances: true }
  }
  ```
- [x] Create helper function `getRarityConfig(rarity: EnemyRarity): RarityConfig`
- [x] Export all constants and utilities

**Bonus additions:**
- Added `getSignatureDie(rarity)` utility to return die notation string (e.g., 'd6', 'd8')
- Added `getAllRarities()` utility to return all rarity tiers in order
- Added `getHigherRarity(currentRarity)` utility to get next higher rarity tier

---

## Task 3: Create Enemy Template Constants

**File:** `src/constants/DefaultEnemies.ts`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Define Humanoid Brute templates (Orc, Bandit)
- [x] Define Humanoid Archer templates (Hunter, Goblin Archer)
- [x] Define Humanoid Support templates (Shaman, Cultist)
- [x] Define Beast Brute templates (Bear, Boar)
- [x] Define Beast "Archer" templates (Giant Spider, Stirge)
- [x] Each template includes:
  - Signature ability with d6 base die
  - Audio preference weights
  - Base stats appropriate to archetype
  - Type-appropriate resistances for Elite+ tier
- [x] Export `DEFAULT_ENEMY_TEMPLATES` array (10 templates)
- [x] Add JSDoc comments explaining template structure

**Bonus additions:**
- Added `getTemplateById(id)` helper function for template lookup by ID
- Added `getTemplatesByCategory(category)` helper function for filtering by category
- Added `getTemplatesByArchetype(archetype)` helper function for filtering by archetype

---

## Task 4: Create Encounter Balance Constants

**File:** `src/constants/EncounterBalance.ts`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Create `XP_BUDGET_PER_LEVEL` object with easy/medium/hard/deadly XP thresholds for levels 1-20 (D&D 5e official)
- [x] Create `ENEMY_COUNT_MULTIPLIER` object (D&D 5e official: 1=1x, 2=1.5x, 3=2x, 4=2x, 5=2x, 6=2x, 7=1.5x, etc.)
- [x] Create `CR_TO_XP` mapping (CR 0=10, CR 0.125=25, CR 0.25=50, CR 0.5=100, CR 1=200, up to CR 30)
- [x] Create `TUNING_FACTORS` object for adjusting difficulty (default 1.0, can be tuned up/down)
- [x] Add utility functions:
  - `getXPForCR(cr: number): number`
  - `getCRFromXP(xp: number): number`
  - `applyTuning(xpBudget: number, tuningFactor: number): number`
- [x] Export all constants and utility functions

**Bonus additions:**
- Added `getXPBudgetPerLevel(level, difficulty)` - Get XP budget for single character
- Added `getXPBudgetForParty(levels, difficulty)` - Get total XP budget for entire party
- Added `getEncounterMultiplier(enemyCount)` - Get multiplier for number of enemies
- Added `calculateAdjustedXP(enemyCRs, multiplier)` - Calculate adjusted XP with encounter multiplier
- Added `getAveragePartyLevel(levels)` - Calculate average party level
- Added `isValidEncounterDifficulty(value)` - Type guard for difficulty values
- Comprehensive JSDoc documentation with examples
- Note: Encounter multipliers follow D&D 5e DMG (1=1x, 2=1.5x, 3-6=2x, 7-10=1.5x, 11-14=1x, 15+=1x)

---

## Task 5: Create Party Analyzer

**File:** `src/core/combat/PartyAnalyzer.ts`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Create `PartyAnalyzer` class with static methods
- [x] Implement `calculatePartyLevel(party: CharacterSheet[]): number` - averages party levels
- [x] Implement `calculatePartyStrength(party: CharacterSheet[]): number` - considers HP, AC, damage output
- [x] Implement `getXPBudget(party: CharacterSheet[], difficulty: 'easy' | 'medium' | 'hard' | 'deadly'): number`
- [x] Implement `getAverageAC(party: CharacterSheet[]): number` - for enemy attack bonus tuning
- [x] Implement `getAverageHP(party: CharacterSheet[]): number` - for enemy damage tuning
- [x] Implement `getPartySize(party: CharacterSheet[]): number` - utility for encounter scaling
- [x] Add unit tests for PartyAnalyzer

**Summary:**
Created `PartyAnalyzer` class with static methods for analyzing party strength:
- `calculatePartyLevel()` - Average party level
- `calculatePartyStrength()` - Combined strength score
- `getXPBudget()` - XP budget for encounters
- `getAverageAC()` - Average armor class
- `getAverageHP()` - Average hit points
- `getPartySize()` - Party member count
- `getAverageDamage()` - Estimated damage output
- `analyzeParty()` - Complete analysis with all stats

All methods handle edge cases (empty party, missing stats) and follow D&D 5e encounter building rules.

---

## Task 6: Create Enemy Generator - Core + Generate Method

**File:** `src/core/generation/EnemyGenerator.ts`

**Status:** ✅ COMPLETED

Consolidates: Core structure + Single enemy generation

**Subtasks:**
- [x] Create `EnemyGenerator` class with static methods
- [x] Add imports: SeededRNG, CharacterSheet, AudioProfile, types from Enemy.ts, RarityConfig
- [x] Add private helper: `getSeededRNG(seed: string, index?: number): SeededRNG`
- [x] Implement private `scaleStatsForRarity(baseStats: AbilityScores, rarity: EnemyRarity): AbilityScores`
- [x] Add `getTemplateById(id: string): EnemyTemplate | undefined` helper
- [x] Implement public `generate()` method:
  ```typescript
  generate(options: EnemyGenerationOptions): CharacterSheet
  ```
  - [x] Validate inputs (seed required, track required if audioProfile provided)
  - [x] Create SeededRNG from seed
  - [x] If templateId provided, look up template directly via `getTemplateById()`
  - [x] Otherwise, select template via `selectTemplate()`
  - [x] Create enemy (inline in generate method, no separate createEnemy() in V1)
  - [x] Apply difficultyMultiplier to HP and damage if specified
  - [x] Return CharacterSheet with enemy name = template name

**Simplifications from original plan:**
- ~~CR/level conversion functions~~ - use inline formula: `level = Math.max(1, Math.floor(cr))`
- Enemy name is simply the template name (e.g., "Orc", "Giant Spider")

---

## Task 7: Create Enemy Generator - Template Selection

**File:** `src/core/generation/EnemyGenerator.ts` (continued)

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Implement `selectTemplate()` method:
  - [x] Filter templates by category if specified
  - [x] Filter templates by archetype if specified
  - [x] If audioProfile provided, calculate simple audio preference weight
  - [x] Use weighted random selection via SeededRNG
  - [x] Return selected EnemyTemplate
- [x] Implement simple audio weighting:
  ```typescript
  // Simple dot product: template.weight * audioProfile.frequencyBand
  // Bass-heavy audio → higher weight for bass-preferring templates
  // No complex scoring, just multiply and pick
  ```
- [x] Add fallback to uniform random when no audio provided

**Simplifications from original plan:**
- Audio matching is simple weighted random, not complex scoring algorithm
- TemplateId lookup handled in `generate()`, not here

**Summary:**
Implemented `selectTemplate()` method (lines 151-184) and `weightedSelectionByAudio()` helper (lines 201-222).
- Filters templates by category and archetype when specified
- Uses audio profile for weighted selection via dot product approach
- Falls back to uniform random selection when no audio provided

---

## Task 8: Create Enemy Generator - Ability Generation

**File:** `src/core/generation/EnemyGenerator.ts` (continued)

**Status:** ✅ COMPLETED

Consolidates: Signature ability scaling + Extra abilities

**Subtasks:**
- [x] Implement `generateAbilities()` method that returns all abilities for an enemy:
  ```typescript
  generateAbilities(template: EnemyTemplate, rarity: EnemyRarity, rng: SeededRNG): Feature[]
  ```
- [x] Signature ability scaling:
  - [x] Get die size from RarityConfig (d6/d8/d10/d12)
  - [x] Create Feature using existing Feature format
  - [x] Include damage formula with scaled die
- [x] Extra abilities selection:
  - [x] Get extra ability count from RarityConfig (0/1/2/3)
  - [x] If count > 0, query FeatureQuery for archetype-matching abilities
  - [x] Random selection via SeededRNG
  - [x] Return combined array: [signature, ...extras]
- [x] Ensure all abilities use existing Feature format for combat integration

**Simplifications from original plan:**
- Combined into single method since both produce Features
- No complex archetype compatibility scoring - just filter by archetype tag

**Summary:**
Implemented `generateAbilities()` method that:
1. Creates a scaled signature ability using the rarity's die size
2. Selects extra abilities from FeatureQuery based on archetype tags
3. Returns combined array of all abilities

Added `ARCHETYPE_TAGS` mapping to link enemy archetypes to appropriate feature tags:
- Brute: combat, damage, defense, melee, durability
- Archer: combat, ranged, accuracy, mobility, stealth
- Support: support, healing, buff, control, utility

Added `selectExtraAbilities()` helper that filters and randomly selects features from the FeatureQuery pool matching the archetype's tags.

---

## Task 9: Create Enemy Generator - Enemy Creation

**File:** `src/core/generation/EnemyGenerator.ts` (continued)

**Status:** ✅ COMPLETED (Integrated into `generate()` method)

**Subtasks:**
- [x] Implement `createEnemy()` method:
  ```typescript
  createEnemy(template: EnemyTemplate, options: EnemyGenerationOptions, rng: SeededRNG): CharacterSheet
  ```
  - Implemented inline in `generate()` method (per plan simplifications)
- [x] Stat calculation:
  - [x] Scale base stats using rarity config multiplier
  - [x] ~~Audio-influenced stat adjustments~~ (deferred to V2)
- [x] Combat stats:
  - [x] Calculate HP: `baseHP × rarity multiplier`
  - [x] Calculate AC: `baseAC + DEX modifier`
  - [x] Calculate attack bonus: `proficiency + STR/DEX` (proficiency = level-based)
- [x] Abilities via `generateAbilities()`
- [x] Apply resistances if Elite/Boss (from template's resistance list)
- [x] Build CharacterSheet with natural weapon (no equipment generation for V1)
- [x] Return complete CharacterSheet

**Summary:**
All enemy creation functionality is implemented inline within the `generate()` method (lines 443-602).
- Stats are scaled by rarity multiplier
- HP calculated with rarity and difficulty multipliers
- AC calculated as base AC + DEX modifier
- Natural weapon generated from signature ability
- CharacterSheet built with all required fields

**Simplifications from original plan:**
- ~~Audio stat influence~~ - deferred to V2 (was bass→STR/CON, treble→DEX)
- ~~Equipment generation~~ - enemies use "natural weapon" or unarmed strike feature instead of items
- ~~Innate spellcasting~~ - spells are just features in the ability pool, no special handling needed

---

## Task 10: Create Enemy Generator - Encounter Generation

**File:** `src/core/generation/EnemyGenerator.ts` (continued)

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Implement public `generateEncounter()` method (two modes):
  ```typescript
  // Party-based mode
  generateEncounter(party: CharacterSheet[], options: EncounterGenerationOptions): CharacterSheet[]

  // CR-based mode (no party needed)
  generateEncounterByCR(options: EncounterGenerationOptions): CharacterSheet[]
  ```

- [x] **Party-based mode**:
  - [x] Use PartyAnalyzer to get party level and XP budget
  - [x] Apply difficulty multiplier to XP budget
  - [x] Apply ENEMY_COUNT_MULTIPLIER for group encounters
  - [x] Calculate per-enemy CR from remaining XP budget
  - [x] Generate each enemy with derived seed (baseSeed + index)
  - [x] Add slight CR variance (+/- 1 step) for variety

- [x] **CR-based mode**:
  - [x] Use targetCR directly instead of party analysis
  - [x] Apply ENEMY_COUNT_MULTIPLIER for group encounters
  - [x] Calculate per-enemy CR from target
  - [x] Generate enemies as above

- [x] **Leader promotion logic** (`applyLeaderPromotion()`):
  - [x] Check enemy count and enableLeaderPromotion flag
  - [x] Promote enemies based on count thresholds (4-6: +1 tier, 7-9: +2 tiers, 10+: 2 leaders)
  - [x] Cap at 'boss' rarity
  - [x] Select leader(s) randomly from generated enemies

- [x] **Mixed type handling** (`selectTemplatesForMix()`):
  - [x] 'uniform': All enemies use same template (selected once)
  - [x] 'custom': Use provided templates array directly
  - [x] ~~'category' and 'random'~~ - deferred to V2

- [x] Handle edge cases: empty party, count of 0, very large groups

**Summary:**
Implemented `generateEncounter()` for party-based encounters and `generateEncounterByCR()` for CR-based encounters.
- Uses PartyAnalyzer for balanced encounter generation
- Applies encounter multipliers for group fights
- Supports leader promotion for groups > 3
- Handles uniform and custom enemy mix modes
- Includes helper methods: `getCRForRarity()`, `getRarityFromCR()`, `selectTemplatesForMix()`, `applyLeaderPromotion()`, `promoteRarity()`

---

## Task 11: Update Generation Index Exports

**File:** `src/core/generation/index.ts`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Add import for EnemyGenerator
- [x] Add imports for enemy types from Enemy.ts
- [x] Export EnemyGenerator class
- [x] Export all enemy types and interfaces
- [x] Verify no naming conflicts with existing exports

**Summary:**
Created `src/core/generation/index.ts` with:
- Export of EnemyGenerator class
- Export of all enemy-related types
- Export of existing generation utilities (CharacterGenerator, NamingEngine, etc.)
- Export of type guard functions

---

## Task 12: Create Enemy Generation Documentation

**File:** `ENEMY_GENERATION.md`

**Status:** ✅ COMPLETED

**Subtasks:**
- [x] Create comprehensive documentation file
- [x] **Overview**: System philosophy and design decisions
- [x] **Quick Start**: Simple examples
  ```typescript
  // Generate a specific enemy by name
  const orc = EnemyGenerator.generate({
    seed: 'my-encounter',
    templateId: 'orc',
    rarity: 'elite'
  });

  // Generate a random humanoid brute
  const enemy = EnemyGenerator.generate({
    seed: 'random-1',
    category: 'humanoid',
    archetype: 'brute',
    rarity: 'common'
  });

  // Generate encounter balanced for party (medium difficulty)
  const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'dungeon-1',
    difficulty: 'medium',
    count: 5  // Will auto-promote 1 to uncommon as leader
  });

  // Generate encounter by CR (no party needed)
  const enemies = EnemyGenerator.generateEncounterByCR({
    seed: 'cr5-encounter',
    targetCR: 5,
    count: 3
  });

  // Generate specific mix of enemies
  const enemies = EnemyGenerator.generateEncounterByCR({
    seed: 'custom-mix',
    targetCR: 3,
    enemyMix: 'custom',
    templates: ['orc', 'orc', 'goblin-archer', 'goblin-archer', 'shaman']
  });

  // Audio-influenced generation
  const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'audio-encounter',
    audioProfile: profile,
    track: trackData,
    difficulty: 'hard',
    count: 4
  });
  ```
- [x] **Generation Modes**: Explain party-based vs CR-based
- [x] **Rarity Tiers**: Explain the scaling system with examples
- [x] **Leader Promotion**: Explain auto rarity mix for groups > 3
- [x] **Mixed Types**: Explain enemyMix options (V1: uniform + custom)
- [x] **Template System**: List available templates and their IDs
- [x] **Audio Integration**: Explain how audio affects template selection
- [x] **Encounter Balance**: Explain XP budget and difficulty
- [x] **API Reference**: Full method signatures

**Summary:**
Created comprehensive `ENEMY_GENERATION.md` documentation file (19,183 bytes) with:
- Complete overview of enemy generation system design philosophy
- Quick start examples covering all major use cases
- Detailed explanation of party-based vs CR-based generation modes
- Rarity tier system with stat multipliers, die scaling, and extra abilities
- Leader promotion rules for groups > 3 enemies
- Mixed enemy type modes (uniform and custom)
- Complete template reference table with all 10 templates
- Audio integration explanation for template selection
- Encounter balance explanation with XP budget tables and multipliers
- Full API reference with type definitions

---

## Task 13: Update Combat System Documentation

**File:** `COMBAT_SYSTEM.md`

**Subtasks:**
- [ ] Add "Enemy Generation" section
- [ ] Add basic usage examples
- [ ] Reference ENEMY_GENERATION.md for full documentation

---

## Task 14: Update Data Engine Reference

**File:** `DATA_ENGINE_REFERENCE.md`

**Subtasks:**
- [ ] Add "Enemy Generation" section to the reference
- [ ] Document EnemyGenerator class and methods
- [ ] Document EnemyTemplate interface
- [ ] Document EnemyRarity scaling
- [ ] Add XP budget and CR conversion reference tables

---

## Task 15: Create Unit Tests

**File:** `tests/unit/enemy-generation.test.ts`

**Subtasks:**
- [ ] Test rarity stat multipliers (common vs boss)
- [ ] Test signature ability die scaling (d6 → d8 → d10 → d12)
- [ ] Test extra ability count per rarity
- [ ] Test resistance assignment for Elite/Boss
- [ ] Test template selection with audio profile
- [ ] Test PartyAnalyzer calculations
- [ ] Test XP budget calculations
- [ ] Test encounter generation for different party sizes
- [ ] Test difficulty multiplier application
- [ ] Test determinism (same seed = same enemy)
- [ ] Test templateId forces specific template
- [ ] Test leader promotion for groups > 3
- [ ] Test leader promotion caps at boss rarity
- [ ] Test enemyMix modes (uniform, custom)
- [ ] Test CR-based generation without party
- [ ] Test getTemplateById lookup

---

## Task 16: Create Integration Tests

**File:** `tests/integration/enemy-encounter.test.ts`

**Subtasks:**
- [ ] Create test helper to build mock party of various levels
- [ ] Test: Level 3 party of 4 generates appropriate medium encounter
- [ ] Test: Audio profile influences template selection (bass → brutes)
- [ ] Test: Elite enemy has resistances, common does not
- [ ] Test: Boss has d12 signature, common has d6
- [ ] Test: Generated enemies work in CombatEngine
- [ ] Test: Encounter balance feels right (medium = fair fight)
- [ ] Test: Specific template by ID generates correctly
- [ ] Test: 5 enemies has 1 leader at higher rarity
- [ ] Test: 8 enemies has 1 leader at +2 tiers
- [ ] Test: CR-based encounter matches target CR total
- [ ] Test: Custom mix uses exact templates specified

---

## Task 17: Verification and Final Testing

**Subtasks:**
- [ ] Run all unit tests and verify they pass
- [ ] Run all integration tests and verify they pass
- [ ] Manual test: Generate various rarities, verify scaling looks correct
- [ ] Manual test: Generate encounters, verify balance feels appropriate
- [ ] Manual test: Audio-based generation, verify template selection
- [ ] Manual test: Generate by templateId, verify correct template used
- [ ] Manual test: Generate group of 5, verify 1 leader exists
- [ ] Manual test: Generate by CR, verify total XP matches
- [ ] Manual test: Custom mix encounter, verify correct templates
- [ ] Verify documentation examples are accurate and runnable
- [ ] TypeScript compilation with no errors
- [ ] Verify no existing tests were broken

---

## Summary of Files to Create

| File | Purpose |
|------|---------|
| `src/core/types/Enemy.ts` | Enemy type definitions and interfaces |
| `src/constants/EnemyRarity.ts` | Rarity configuration (stat multipliers, die sizes) |
| `src/constants/DefaultEnemies.ts` | 10 enemy templates (Humanoid + Beast) |
| `src/constants/EncounterBalance.ts` | D&D 5e XP budget tables with tuning |
| `src/core/combat/PartyAnalyzer.ts` | Party strength calculator |
| `src/core/generation/EnemyGenerator.ts` | Main enemy generator |
| `ENEMY_GENERATION.md` | User documentation |
| `tests/unit/enemy-generation.test.ts` | Unit tests |
| `tests/integration/enemy-encounter.test.ts` | Integration tests |

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/core/generation/index.ts` | Add EnemyGenerator and type exports |
| `COMBAT_SYSTEM.md` | Add enemy generation section |
| `DATA_ENGINE_REFERENCE.md` | Add enemy generation reference |

---

## Future Enhancements (Out of Scope)

These are natural evolutions to add after the core system is implemented:

1. **Additional Categories**: Undead, Dragon, Fiend, Construct, Elemental, Monstrosity
2. **Legendary System**: Legendary actions and resistances for boss-tier enemies
3. **Pack Tactics**: Synergy bonuses when multiple enemies of same type are together
4. **Named Enemies**: Procedural name/title generation for unique enemies
5. **Lair Actions**: Environment-specific abilities for boss encounters
6. **Minion System**: Weak enemies that die in one hit but come in swarms
7. **Dynamic Difficulty**: Enemies that adapt mid-combat based on how the fight is going

---

## Deferred to V2

The following were simplified or removed from V1 to keep implementation focused:

| Feature | V1 Approach | V2 Enhancement |
|---------|-------------|----------------|
| **Audio stat influence** | Audio only affects template selection | Audio also affects stat distribution (bass→STR/CON, treble→DEX) |
| **Equipment generation** | Enemies use "natural weapon" feature | Generate actual weapons/armor based on archetype |
| **enemyMix modes** | Only 'uniform' and 'custom' | Add 'category' and 'random' modes |
| **CR/Level conversion** | Inline formula `level = Math.max(1, Math.floor(cr))` | Dedicated functions with tuning |
| **Innate spellcasting** | Spells are just features in ability pool | Dedicated spell slot system for caster enemies |
