# Enemy Generation System

Complete guide to generating enemies and encounters in the Playlist Data Engine.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Generation Modes](#generation-modes)
4. [Rarity Tiers](#rarity-tiers)
5. [Leader Promotion](#leader-promotion)
6. [Mixed Enemy Types](#mixed-enemy-types)
7. [Template System](#template-system)
8. [Audio Integration](#audio-integration)
9. [Encounter Balance](#encounter-balance)
10. [API Reference](#api-reference)

---

## Overview

The Enemy Generation System creates balanced combat encounters through:

- **Deterministic Generation**: Seeded RNG ensures reproducible enemies
- **Rarity Scaling**: Four tiers (Common → Boss) with stat/ability scaling
- **Template-Based**: Predefined enemy types with signature abilities
- **Audio-Influenced**: Music profiles affect template selection
- **Party-Balanced**: D&D 5e XP budgets for fair encounters

### Design Philosophy

- **Elegant over complex**: Reuses FeatureQuery for abilities rather than parallel systems
- **Infinite scaling**: Any template scales from Common to Boss tier
- **Signature + extras**: Every enemy has ONE signature ability (scaled by rarity) plus extra abilities from the feature pool
- **Audio-influenced**: Audio affects both template selection AND stat distribution (V2)
- **CR vs Rarity independence**: CR determines power (level, stats), Rarity determines complexity (abilities, resistances). Any combination is valid.

---

## Quick Start

```typescript
import { AudioAnalyzer, EnemyGenerator } from 'playlist-data-engine';

// ═══════════════════════════════════════════════════════════════
// SINGLE ENEMY
// ═══════════════════════════════════════════════════════════════

// By template ID
const orc = EnemyGenerator.generate({
    seed: 'dungeon-entrance',
    templateId: 'orc',
    cr: 5,              // Power level (determines level/stats)
    rarity: 'elite'     // Complexity (determines abilities)
});

// By category/archetype (random from matching templates)
const enemy = EnemyGenerator.generate({
    seed: 'random',
    category: 'humanoid',
    archetype: 'brute',
    cr: 3,
    rarity: 'uncommon'
});

// ═══════════════════════════════════════════════════════════════
// ENCOUNTERS
// ═══════════════════════════════════════════════════════════════

// Party-balanced (uses D&D 5e XP budgets)
const party = [player1, player2, player3, player4];
const encounter = EnemyGenerator.generateEncounter(party, {
    seed: 'room-3',
    difficulty: 'medium',
    count: 5
});

// CR-based (no party needed)
const crEncounter = EnemyGenerator.generateEncounterByCR({
    seed: 'cr5-group',
    targetCR: 5,
    count: 3
});

// Custom composition
const customMix = EnemyGenerator.generateEncounterByCR({
    seed: 'patrol',
    targetCR: 3,
    enemyMix: 'custom',
    templates: ['orc', 'orc', 'goblin-archer', 'shaman']
});

// ═══════════════════════════════════════════════════════════════
// AUDIO-INFLUENCED
// ═══════════════════════════════════════════════════════════════

const analyzer = new AudioAnalyzer();
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);

const audioEncounter = EnemyGenerator.generateEncounter(party, {
    seed: 'audio-room',
    audioProfile,
    track,
    difficulty: 'hard',
    count: 4
});
// Bass-heavy → more brutes (Orc, Bear)
// Treble-heavy → more archers (Hunter, Goblin Archer)
```

---

## Generation Modes

The system supports two distinct generation modes:

### Party-Based Mode

Analyzes party strength → calculates balanced encounter → generates appropriate enemies.

```typescript
const enemies = EnemyGenerator.generateEncounter(
    party: CharacterSheet[],  // Required - party members
    options: {
        seed: string,           // Required - for determinism
        count: number,          // Required - number of enemies
        difficulty?: 'easy' | 'medium' | 'hard' | 'deadly',
        difficultyMultiplier?: number,  // Fine-tune difficulty (default: 1.0)
        category?: 'humanoid' | 'beast',  // Filter by category
        archetype?: 'brute' | 'archer' | 'support',  // Filter by archetype
        templateId?: string,      // Force specific template
        enemyMix?: 'uniform' | 'custom',
        templates?: string[],      // For custom mix
        audioProfile?: AudioProfile,
        track?: PlaylistTrack,    // Required if audioProfile provided
        enableLeaderPromotion?: boolean  // Default: true for groups > 3
    }
): CharacterSheet[]
```

**How it works:**
1. Analyzes party levels and calculates XP budget using D&D 5e tables
2. Applies encounter multiplier for group fights
3. Divides budget across requested enemy count
4. Generates enemies at calculated CR
5. Applies leader promotion if enabled

### CR-Based Mode

Specify target Challenge Rating directly → no party analysis needed.

```typescript
const enemies = EnemyGenerator.generateEncounterByCR({
    seed: string,           // Required
    count: number,          // Required - number of enemies
    targetCR: number,       // Target Challenge Rating per enemy
    baseRarity?: 'common',  // Starting rarity before promotion
    difficultyMultiplier?: number,  // Fine-tune (default: 1.0)
    category?: EnemyCategory,
    archetype?: EnemyArchetype,
    templateId?: string,
    enemyMix?: 'uniform' | 'custom',
    templates?: string[],
    audioProfile?: AudioProfile,
    track?: PlaylistTrack,
    enableLeaderPromotion?: boolean
}): CharacterSheet[]
```

**How it works:**
1. Uses targetCR directly instead of party analysis
2. Applies encounter multiplier for group adjustments
3. Generates enemies at calculated rarity
4. Applies leader promotion if enabled

---

## CR vs Rarity: Two Independent Axes

The enemy generation system uses **two independent axes** to create diverse enemies:

| Concept | Determines | Examples |
|---------|------------|----------|
| **Challenge Rating (CR)** | Power level (stats, HP, level, proficiency) | Weak beast vs. ancient dragon |
| **Rarity** | Complexity (abilities, resistances, legendary actions) | Simple guard vs. complex spellcaster |

### Key Design Principle

**Any CR can combine with any rarity:**

| CR | Rarity | Result | Example |
|----|--------|--------|---------|
| 0.25 | Common | Weak, simple | Goblin grunt |
| 0.25 | Boss | Weak, complex | Goblin chieftain |
| 5 | Common | Strong, simple | Dire wolf |
| 5 | Boss | Strong, complex | Werewolf alpha |
| 20 | Common | Epic, simple | Ancient purple worm |
| 20 | Boss | Epic, complex | Ancient red dragon |

### How It Works

1. **CR determines power**: Level is derived from CR using `CRLevelConverter.crToLevel()`. Higher CR = higher level = stronger stats.
2. **Rarity determines complexity**: Rarity controls ability count, signature die size, and special features. Higher rarity = more complex = more abilities.
3. **Fractional CRs** (0.25, 0.5) get reduced base stats (75-85%) to represent "sub-level" enemies.

### Example: CR vs Rarity Independence

```typescript
// SAME rarity, DIFFERENT power (CR determines stats/level)
const grunt = EnemyGenerator.generate({ seed: 'a', templateId: 'goblin', cr: 0.25, rarity: 'common' });
const beast = EnemyGenerator.generate({ seed: 'b', templateId: 'purple-worm', cr: 20, rarity: 'common' });
// Both have d6 signature, 0 extras — but beast has 20x the stats

// SAME power, DIFFERENT complexity (rarity determines abilities)
const simple = EnemyGenerator.generate({ seed: 'c', templateId: 'dire-wolf', cr: 5, rarity: 'common' });
const complex = EnemyGenerator.generate({ seed: 'd', templateId: 'werewolf', cr: 5, rarity: 'boss' });
// Both are level 5 — but boss has d12 signature, 3 extras, legendary actions
```

---

## Rarity Tiers

Every enemy template can be generated at four rarity tiers. **Note**: Rarity affects complexity, not power (CR handles power).

| Rarity | Stat Multiplier | Signature Die | Extra Abilities | Resistances |
|--------|-----------------|----------------|-----------------|-------------|
| **Common** | 1.0× (base) | d6 | 0 | None |
| **Uncommon** | 1.03× (+3%) | d8 | 1 | None |
| **Elite** | 1.07× (+7%) | d10 | 2 | Type-based |
| **Boss** | 1.12× (+12%) | d12 | 3 | Type-based |

**Why are stat multipliers so small?** Rarity is about complexity, not power. The 3-12% stat adjustment provides subtle flavor, while CR (via level) handles the bulk of power scaling. This allows creating weak-but-complex enemies (CR 0.25 + Boss = goblin chieftain) or strong-but-simple enemies (CR 20 + Common = ancient beast).

### Signature Ability Scaling

The signature ability is the core ability that defines an enemy type. It scales by rarity:

| Rarity | Die Damage | Example (Orc Savage Strike) |
|--------|-------------|----------------------------|
| Common | d6 + 2 | 1d6 + 2 slashing damage |
| Uncommon | d8 + 3 | 1d8 + 3 slashing damage |
| Elite | d10 + 4 | 1d10 + 4 slashing damage |
| Boss | d12 + 6 | 1d12 + 6 slashing damage |

The damage bonus (+2/+3/+4/+6) represents the increasing ability modifier based on rarity complexity. Note that the die size increases with rarity, while CR determines the underlying power level.

### Extra Abilities

Higher rarity enemies draw additional abilities from the FeatureQuery pool:

| Rarity | Extra Abilities | Source |
|---------|----------------|---------|
| Common | 0 | None (signature only) |
| Uncommon | 1 | FeatureQuery (archetype-filtered) |
| Elite | 2 | FeatureQuery (archetype-filtered) |
| Boss | 3 | FeatureQuery (archetype-filtered) |

Abilities are selected based on archetype tags:
- **Brute**: combat, damage, defense, melee, durability
- **Archer**: combat, ranged, accuracy, mobility, stealth
- **Support**: support, healing, buff, control, utility

### Resistances

Elite and Boss enemies gain type-appropriate resistances:

| Template | Elite+ Resistances |
|-----------|-------------------|
| Orc | poison |
| Bandit | none |
| Hunter | none |
| Goblin Archer | none |
| Shaman | necrotic |
| Cultist | necrotic |
| Bear | cold |
| Boar | none |
| Giant Spider | poison |
| Stirge | none |

---

## Leader Promotion

When generating encounters with **more than 3 enemies**, the system automatically promotes one or more enemies to higher rarity tiers as "leaders":

| Enemy Count | Leader Rule |
|-------------|-------------|
| 1-3 | No leader, all same rarity |
| 4-6 | 1 enemy promoted to next rarity tier |
| 7-9 | 1 enemy promoted two tiers up |
| 10+ | 2 enemies promoted (1 one tier, 1 two tiers) |

**Example:**
```typescript
// Generate 5 common orcs
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'goblin-camp',
    count: 5,
    baseRarity: 'common'
});

// Result:
// - 4 Common Orcs (15 HP, d6 signature)
// - 1 Uncommon Orc leader (17 HP, d8 signature, +1 extra ability)
```

**Promotion is capped at Boss rarity** - if promotion would exceed boss, the enemy becomes a boss.

**Disable leader promotion:**
```typescript
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'no-leaders',
    count: 5,
    enableLeaderPromotion: false
});
// All 5 enemies remain at base rarity
```

---

## CR-Based Gradual Rarity Scaling (Opt-In)

By default, rarity is independent of CR. However, you can enable automatic rarity scaling based on CR by setting `scaleRarityWithCR: true`.

### How It Works

When enabled, the system distributes rarity upgrades across enemies based on the target CR:

| CR Tier | CR Range | Upgrade Points | Party of 3 Result |
|---------|----------|----------------|-------------------|
| Low | 0-2 | 0 | [common, common, common] |
| Low-Medium | 3-5 | 1 | [uncommon, common, common] |
| Medium | 6-10 | 2 | [uncommon, uncommon, common] |
| Medium-High | 11-15 | 3 | [uncommon, uncommon, uncommon] |
| High | 16-20 | 4 | [elite, uncommon, uncommon] |
| Very High | 21-30 | 5 | [elite, elite, uncommon] |
| Epic | 30+ | 6 | [elite, elite, elite] |

**Upgrade Path:** common → uncommon → elite (per enemy)

### Example Usage

```typescript
// Default behavior: rarity is independent of CR
const lowCR = EnemyGenerator.generateEncounterByCR({
    seed: 'low-cr',
    targetCR: 2,
    count: 3,
    baseRarity: 'common'  // All enemies are common
});

// With scaling enabled: rarity increases with CR
const highCR = EnemyGenerator.generateEncounterByCR({
    seed: 'high-cr',
    targetCR: 18,
    count: 3,
    scaleRarityWithCR: true  // Results in [elite, uncommon, uncommon]
});
```

### Boss Rule

When rarity is 'boss', count is automatically enforced to 1. Bosses are always 1vparty encounters.

```typescript
// This will generate only 1 enemy, not 3
const boss = EnemyGenerator.generateEncounterByCR({
    seed: 'boss-encounter',
    targetCR: 10,
    count: 3,            // Will be overridden to 1
    baseRarity: 'boss'   // Forces count = 1
});
```

---

## Mixed Enemy Types

Encounters can contain different enemy types using the `enemyMix` option:

### Uniform Mode (Default)

All enemies use the same randomly-selected template.

```typescript
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'uniform-group',
    count: 5,
    category: 'humanoid',
    archetype: 'brute'
    // enemyMix defaults to 'uniform'
});

// Result: 5 enemies, all the same type (e.g., 5 Orcs or 5 Bandits)
```

### Custom Mode

Specify the exact template mix for the encounter.

```typescript
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'custom-composition',
    count: 6,
    enemyMix: 'custom',
    templates: ['orc', 'orc', 'goblin-archer', 'goblin-archer', 'shaman', 'cultist']
});

// Result: 2 Orcs, 2 Goblin Archers, 1 Shaman, 1 Cultist
// Templates cycle if count exceeds array length
```

### Category Mode

Random mix from templates within the same category.

```typescript
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'undead-crypt',
    count: 6,
    category: 'undead',
    enemyMix: 'category'
});

// Result: Random mix of undead enemies (Skeleton, Zombie, Wight, Ghost)
// Could produce: 2 Skeletons, 2 Zombies, 1 Wight, 1 Ghost
```

**Rules:**
- All enemies come from the specified category
- Each enemy is independently randomized from templates in that category
- Audio weighting applies if `audioProfile` provided
- Requires `category` option to be specified

### Random Mode

Completely random mix from all available templates.

```typescript
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'chaos-encounter',
    count: 4,
    enemyMix: 'random'
});

// Result: Completely random enemies
// Could produce: 1 Orc, 1 Fire Elemental, 1 Imp, 1 Basilisk
```

**Warning:** This can create thematically disjoint encounters. Use with intent.

---

## Template System

Templates are the foundation of enemy generation. Each template defines:

| Property | Description |
|-----------|-------------|
| `id` | Unique identifier (e.g., `'orc'`, `'goblin-archer'`) |
| `name` | Display name (used as enemy name when generated) |
| `category` | Type classification: `'humanoid'` or `'beast'` |
| `archetype` | Combat role: `'brute'`, `'archer'`, or `'support'` |
| `signatureAbility` | Core ability shared across all rarities |
| `baseStats` | Ability scores before rarity scaling |
| `baseHP` | Hit points before rarity scaling |
| `baseAC` | Armor class before DEX modifier |
| `baseSpeed` | Movement speed in feet |
| `audioPreference` | Weights for audio-influenced selection |
| `resistances` | Damage resistances/immunities for Elite+ tier |

### Available Templates

The system includes 40+ templates across 8 categories. Full template definitions are in the source:

| Category | Source File | Templates |
|----------|-------------|-----------|
| **Humanoid, Beast** | [DefaultEnemies.ts](src/constants/DefaultEnemies.ts) | Orc, Bandit, Hunter, Goblin Archer, Shaman, Cultist, Bear, Boar, Giant Spider, Stirge |
| **Undead** | [EnemyTemplates/Undead.ts](src/constants/EnemyTemplates/Undead.ts) | Skeleton, Ghost, Zombie, Wight |
| **Fiend** | [EnemyTemplates/Fiend.ts](src/constants/EnemyTemplates/Fiend.ts) | Imp, Lemure, Demon, Quasit |
| **Elemental** | [EnemyTemplates/Elemental.ts](src/constants/EnemyTemplates/Elemental.ts) | Fire, Earth, Air, Water Elementals |
| **Construct** | [EnemyTemplates/Construct.ts](src/constants/EnemyTemplates/Construct.ts) | Animated Armor, Golem, Flying Sword, Shield Guardian |
| **Dragon** | [EnemyTemplates/Dragon.ts](src/constants/EnemyTemplates/Dragon.ts) | Young Red Dragon, Young Blue Dragon, Wyrmling, Drake |
| **Monstrosity** | [EnemyTemplates/Monstrosity.ts](src/constants/EnemyTemplates/Monstrosity.ts) | Owlbear, Mimic, Griffin, Basilisk |

Each template includes: `id`, `name`, `category`, `archetype`, `signatureAbility`, `baseStats`, `baseHP`, `baseAC`, `baseSpeed`, `audioPreference`, and `resistances`.

### Get Template by ID

```typescript
import { EnemyGenerator } from 'playlist-data-engine';

const template = EnemyGenerator.getTemplateById('orc');
if (template) {
    console.log(template.name); // 'Orc'
    console.log(template.baseStats); // { STR: 16, DEX: 12, ... }
}
```

---

## Audio Integration

Audio profiles influence enemy generation in two ways:

### 1. Template Selection

When generating random enemies, the system weights template selection based on audio characteristics:

| Audio Characteristic | Favors Templates |
|---------------------|------------------|
| High bass dominance | Brute templates (Orc, Bear) |
| High treble dominance | Archer templates (Hunter, Goblin Archer) |
| Balanced (mid-heavy) | Support templates (Shaman, Cultist) |

**How it works:**
```typescript
// Dot product: audio values × template weights = selection score
const score =
    audioProfile.bass_dominance * template.audioPreference.bass +
    audioProfile.mid_dominance * template.audioPreference.mid +
    audioProfile.treble_dominance * template.audioPreference.treble;
```

Higher scores = more likely to be selected.

### 2. Stat Distribution (V2)

Audio profiles now also influence individual ability scores:

| Audio Characteristic | Stat Bonuses |
|---------------------|---------------|
| High bass dominance | +1 to STR and CON |
| High treble dominance | +1 to DEX |
| High mid dominance | +1 to WIS and CHA |
| Balanced (all similar) | +1 to all stats (smaller bonus) |

**Maximum bonus:** +2 to any single stat from audio influence

This is additive to rarity scaling, not multiplicative.

---

## V2 Features

### Equipment Generation (V2)

Enemies are now equipped with actual weapons and armor based on their archetype and rarity.

**EquipmentGenerator** provides:
- Weapons selected by archetype (brute/archer/support)
- Armor scaled by rarity (common→boss gets better gear)
- Shields for applicable archetypes (archers don't get shields)

#### Equipment by Archetype

| Archetype | Weapons | Armor |
|-----------|---------|-------|
| **Brute** | Greataxe, Longsword, Handaxe, Mace | Scale Mail, Chain Mail, Plate Armor (boss only) |
| **Archer** | Longbow, Light Crossbow, Shortsword, Dagger | Leather Armor (light for mobility) |
| **Support** | Quarterstaff, Mace, Dagger | Scale Mail, Chain Mail, Shield available |

#### Shield Probability by Rarity

| Rarity | Shield Chance |
|--------|---------------|
| Common | 25% |
| Uncommon | 50% |
| Elite | 75% |
| Boss | 100% |

**Example:**
```typescript
// Generate an elite brute with equipment
const enemy = EnemyGenerator.generate({
    seed: 'elite-orc-1',
    templateId: 'orc',
    rarity: 'elite'
});

// Equipment is stored on the enemy
console.log(enemy.equipment_config?.weapon?.name); // 'Greataxe'
console.log(enemy.equipment_config?.armor?.name);   // 'Chain Mail'
console.log(enemy.equipment_config?.shield?.name);  // 'Shield' (75% chance)
```

---

### Spellcasting System (V2)

Some enemies gain innate spellcasting abilities based on archetype and rarity.

#### Spell Availability

| Archetype | Common | Uncommon | Elite | Boss |
|-----------|--------|----------|-------|------|
| **Support** | ✅ Always | ✅ Always | ✅ Always | ✅ Always |
| **Archer** | ❌ No | ❌ No | ✅ Elite+ | ✅ Elite+ |
| **Brute** | ❌ No | ❌ No | ✅ Elite+ | ✅ Elite+ |

#### Spell Slots by CR

| CR | Level 1 | Level 2 | Level 3 | Level 4 |
|----|----------|----------|----------|----------|
| 0-0.5 | 0 | 0 | 0 | 0 |
| 1 | 3 | 0 | 0 | 0 |
| 2 | 4 | 0 | 0 | 0 |
| 3 | 4 | 2 | 0 | 0 |
| 4 | 4 | 3 | 0 | 0 |
| 5 | 4 | 3 | 2 | 0 |
| 6-7 | 4 | 3 | 3 | 0 |
| 8+ | 4 | 3 | 3 | 1-2 |

#### Spell List Examples

**Support Spells:**
- Cantrips: Sacred Flame, Guidance, Resistance
- Level 1: Bless, Bane, Cure Wounds, Healing Word, Command
- Level 2: Aid, Lesser Restoration, Spiritual Weapon, Shatter
- Level 3: Spirit Guardians, Revivify, Mass Healing Word

**Archer Spells:**
- Cantrips: Ray of Frost, Shocking Grasp, True Strike
- Level 1: Misty Step, Hold Person, Ray of Sickness, Thunderwave
- Level 2: Web, Invisibility, Melf's Acid Arrow, Scorching Ray
- Level 3: Fly, Lightning Bolt, Gaseous Form

**Brute Spells:**
- Cantrips: Fire Bolt, Shillelagh, Thorn Whip
- Level 1: Burning Hands, Divine Favor, Magic Stone, Zephyr Strike
- Level 2: Shatter, Branding Smite, Spiritual Weapon, Flame Blade
- Level 3: Call Lightning, Elemental Weapon, Blur

**Example:**
```typescript
// Generate an elite shaman with spellcasting
const enemy = EnemyGenerator.generate({
    seed: 'elite-shaman',
    templateId: 'shaman',
    rarity: 'elite'
});

// Spells are converted to Features with isSpell: true
console.log(enemy.class_features.filter(f => f.isSpell)); // 2 cantrips + 3 spells
```

---

### Legendary System (V2)

Boss-tier enemies gain legendary actions and resistances.

#### Legendary Actions

Bosses receive **3 legendary actions** selected from their archetype pool:

| Archetype | Sample Actions |
|-----------|----------------|
| **Brute** | Tail Attack (1), Devour (3), Trample (2), Charge (1) |
| **Archer** | Snipe (1), Volley Shot (2), Shadow Step (2), Multi-Shot (3) |
| **Support** | Rally (1), Frightful Presence (1), Healing Aura (2), Command Ally (2) |
| **Universal** | Teleport (2), Detect (1) |

*Costs are in legendary action points (typically 3 per round)*

#### Legendary Resistances

Bosses gain legendary resistances per day based on CR:

| CR Range | Resistances/Day |
|----------|-----------------|
| CR 1-4 | 3 |
| CR 5-10 | 3 |
| CR 11-15 | 4 |
| CR 16-20 | 5 |
| CR 21+ | 6 |

#### Boss Enhancements

Boss enemies also receive:
- **Enhanced Signature Ability:** 2x damage dice (d12 → 2d12)
- **Ultimate Ability:** One special ability usable once per encounter
- **Epic Name:** Title added to name (e.g., "Grognak the Destroyer")

**Example:**
```typescript
// Generate a boss with legendary system
const enemy = EnemyGenerator.generate({
    seed: 'boss-dragon',
    templateId: 'young-red-dragon',
    rarity: 'boss'
});

console.log(enemy.legendary_config?.resistances); // 3 per day
console.log(enemy.legendary_config?.actions);    // 3 legendary actions
console.log(enemy.name.includes('the'));      // true (epic title added)
```

---

### Fractional CR Stat Reduction

When generating enemies with fractional CR values (0.25, 0.5), the system applies automatic stat reduction to represent "sub-level" enemies:

| CR | Level | Stat Multiplier | Description |
|----|-------|-----------------|-------------|
| 0.25 | 0.25 | 75% | Sub-level enemy (e.g., goblin grunt) |
| 0.5 | 0.5 | 85% | Sub-level enemy (e.g., giant rat) |
| 1+ | CR | 100% | Full stats (standard enemy) |

**This multiplier is applied BEFORE the rarity stat multiplier** (e.g., CR 0.25 + Elite = 75% × 107% ≈ 80% base stats).

```typescript
const grunt = EnemyGenerator.generate({ seed: 'weak', templateId: 'goblin', cr: 0.25, rarity: 'common' });
const warrior = EnemyGenerator.generate({ seed: 'strong', templateId: 'goblin', cr: 5, rarity: 'common' });
// Same template, same rarity — grunt has 75% stats, warrior has 100%
```

---

### CR/Level Conversion (V2)

Dedicated functions for converting between Challenge Rating and character level. **The EnemyGenerator now uses `CRLevelConverter.crToLevel()` for all CR → level conversions.**

#### CR → Level Mapping

The enemy generation system uses the following mapping:

| CR | Level | Stat Multiplier | Notes |
|----|-------|-----------------|-------|
| 0.25 | 0.25 | 75% | Sub-level enemy |
| 0.5 | 0.5 | 85% | Sub-level enemy |
| 1 | 1 | 100% | Standard enemy |
| 5 | 5 | 100% | Standard enemy |
| 10 | 10 | 100% | Standard enemy |
| 20 | 20 | 100% | Standard enemy |

**Key insight:** CR ≈ level in D&D 5e. A CR 5 enemy is roughly equivalent to a level 5 character.

#### Conversion Functions

```typescript
import { crToLevel, levelToCR, roundLevel, roundCR } from 'playlist-data-engine';

// CR to Level
crToLevel(1);     // 1
crToLevel(0.25);   // 0.25
crToLevel(5);     // 5

// Level to CR (inverse)
levelToCR(5);     // 5

// Round to valid values
roundLevel(0.7);   // 1 (nearest integer)
roundCR(0.3);      // 0.25 (nearest CR step)

// Format for display
formatLevel(0.25);  // "0 (1/4)"
formatCR(0.25);     // "1/4"
```

#### Tuning Configuration

Customize conversion with tuning parameters:

```typescript
import { createCRTuning } from 'playlist-data-engine';

// Adjust difficulty by changing how CR maps to level
const tuning = createCRTuning({
    baseMultiplier: 1.2  // CR 5 → Level 6 (harder enemies)
    // baseMultiplier: 0.8  // CR 5 → Level 4 (easier enemies)
    // customCurve: new Map([[5, 7], [10, 15]])  // Specific breakpoints
});
```

---

## Encounter Balance

The system uses D&D 5e official encounter building tables for balance.

### XP Budget by Level and Difficulty

Each character level has XP thresholds for each difficulty:

| Level | Easy | Medium | Hard | Deadly |
|--------|--------|---------|-------|---------|
| 1 | 25 | 50 | 75 | 100 |
| 3 | 75 | 150 | 225 | 300 |
| 5 | 250 | 500 | 750 | 1,000 |
| 10 | 600 | 1,200 | 1,800 | 2,400 |
| 15 | 1,600 | 3,200 | 4,800 | 6,400 |
| 20 | 5,000 | 10,000 | 15,000 | 20,000 |

**Party budget = Sum of individual character budgets**

### Encounter Multipliers

Groups of enemies are more dangerous due to action economy:

| Enemy Count | Multiplier |
|-------------|-------------|
| 1 | 1.0× |
| 2 | 1.5× |
| 3-6 | 2.0× |
| 7-10 | 1.5× |
| 11-14 | 1.0× |
| 15+ | 1.0× |

**Applied to adjusted XP total** - accounts for crowd control effectiveness.

### CR to XP Conversion

Challenge Rating maps to XP for encounter calculations:

| CR | XP | CR | XP | CR | XP |
|-----|-----|-----|-----|-----|
| 0 | 10 | 1 | 200 | 5 | 1,800 |
| 1/8 | 25 | 2 | 450 | 10 | 5,900 |
| 1/4 | 50 | 3 | 700 | 15 | 13,000 |
| 1/2 | 100 | 4 | 1,100 | 20+ | 25,000+ |

### Difficulty Multiplier

Fine-tune encounter difficulty with `difficultyMultiplier`:

```typescript
const enemies = EnemyGenerator.generateEncounter(party, {
    seed: 'harder-encounter',
    difficulty: 'medium',
    difficultyMultiplier: 1.2,  // +20% difficulty
    count: 4
});
```

- **1.0** = Standard difficulty
- **1.1-1.2** = Harder (for experienced players)
- **0.8-0.9** = Easier (for newer players)

---

## API Reference

### EnemyGenerator

Static class - no instantiation required.

#### generate()

Generate a single enemy.

```typescript
static generate(options: EnemyGenerationOptions): CharacterSheet
```

**Parameters:**
- `seed` (required): Seed for deterministic generation
- `templateId` (optional): Force specific template by ID
- `rarity` (optional): Rarity tier (default: `'common'`)
- `difficultyMultiplier` (optional): Fine-tune HP/damage (default: 1.0)
- `audioProfile` (optional): Audio profile for template selection
- `track` (optional): Track data (required if audioProfile provided)

**Returns:** `CharacterSheet` representing the enemy

**Throws:**
- `Error` if templateId not found
- `Error` if audioProfile provided without track

#### generateEncounter()

Generate balanced encounter for a party.

```typescript
static generateEncounter(
    party: CharacterSheet[],
    options: EncounterGenerationOptions
): CharacterSheet[]
```

**Parameters:** All options from `EncounterGenerationOptions` interface

**Returns:** Array of generated enemies

#### generateEncounterByCR()

Generate encounter by target CR (no party analysis).

```typescript
static generateEncounterByCR(
    options: EncounterGenerationOptions
): CharacterSheet[]
```

**Returns:** Array of generated enemies

**Note:** Must include `targetCR` in options

#### getTemplateById()

Look up a template by ID.

```typescript
static getTemplateById(id: string): EnemyTemplate | undefined
```

**Returns:** Template object or `undefined` if not found

### Type Reference

#### EnemyGenerationOptions

```typescript
interface EnemyGenerationOptions {
    seed: string;                        // Required
    cr?: number;                         // Recommended - target Challenge Rating (determines level/stats)
    templateId?: string;                 // Optional - force template
    rarity?: EnemyRarity;                // Optional - default 'common' (determines complexity)
    difficultyMultiplier?: number;       // Optional - default 1.0
    audioProfile?: AudioProfile;         // Optional
    track?: PlaylistTrack;               // Required if audioProfile
    category?: EnemyCategory;            // Optional
    archetype?: EnemyArchetype;          // Optional
    level?: number;                      // Optional - overrides CR-based level (rarely needed)
}
```

**Important:** The `cr` parameter determines the enemy's power level (level and base stats). The `rarity` parameter determines complexity (abilities, signature die, resistances). These are independent - any CR can combine with any rarity.

#### EncounterGenerationOptions

```typescript
interface EncounterGenerationOptions {
    seed: string;                        // Required
    count: number;                       // Required
    difficulty?: EncounterDifficulty;    // Party-based mode
    targetCR?: number;                   // CR-based mode - determines power level
    baseRarity?: EnemyRarity;            // Optional - default 'common'
    scaleRarityWithCR?: boolean;         // Optional - default false (opt-in CR-based rarity scaling)
    difficultyMultiplier?: number;       // Optional - default 1.0
    category?: EnemyCategory;            // Optional
    archetype?: EnemyArchetype;          // Optional
    templateId?: string;                 // Optional
    enemyMix?: 'uniform' | 'custom' | 'category' | 'random';  // V2: added category, random
    templates?: string[];                // For custom mix
    audioProfile?: AudioProfile;         // Optional
    track?: PlaylistTrack;               // Required if audioProfile
    enableLeaderPromotion?: boolean;     // Optional - default true
    // V2 additions:
    allowMixedCategories?: boolean;      // For 'random' mode validation
    lairFeatures?: boolean;              // Include lair actions for bosses
    minRarity?: EnemyRarity;             // Force minimum rarity
    maxRarity?: EnemyRarity;             // Cap maximum rarity
}
```

**CR vs Rarity:** By default, `targetCR` and `baseRarity` are independent. Set `scaleRarityWithCR: true` to opt-in to automatic rarity scaling based on CR (higher CR = higher average rarity).

**Boss Encounters:** When rarity is 'boss', count is automatically enforced to 1 (bosses are always 1vparty).

#### EnemyRarity

```typescript
type EnemyRarity = 'common' | 'uncommon' | 'elite' | 'boss';
```

#### EnemyCategory

```typescript
type EnemyCategory =
    | 'humanoid'
    | 'beast'
    | 'undead'
    | 'dragon'
    | 'fiend'
    | 'construct'
    | 'elemental'
    | 'monstrosity';
```

#### EnemyArchetype

```typescript
type EnemyArchetype = 'brute' | 'archer' | 'support';
```

#### EncounterDifficulty

```typescript
type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'deadly';
```

---

## See Also

- [COMBAT_SYSTEM.md](docs/COMBAT_SYSTEM.md) - Combat system reference
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference
- [specs/001-core-engine/SPEC.md](specs/001-core-engine/SPEC.md) - Core engine specification
