# Playlist Data Engine Migration Guide

## Overview

This guide helps you migrate from previous versions of the Playlist Data Engine to the current version. The current version includes **Phase 1-10** of the extensibility upgrade, which introduces new features and some breaking changes.

**Version:** 2.0.0 (Extensibility Upgrade)
**Release Date:** 2025
**Affected Versions:** All versions prior to 2.0.0

---

## Breaking Changes

### 1. Ammunition Format Change

**Impact:** High - Affects stored character data and equipment lookups

#### Before (Old Format)
```typescript
// Old equipment entry
'Arrows (20)': { name: 'Arrows (20)', type: 'item', rarity: 'common', weight: 1 }

// Old character equipment
equipment: [
    { name: 'Arrows (20)', quantity: 1, equipped: false }
]
```

#### After (New Format)
```typescript
// New equipment entry
'Arrow': { name: 'Arrow', type: 'item', rarity: 'common', weight: 0.05 }

// New character equipment (20 individual arrows)
equipment: [
    { name: 'Arrow', quantity: 20, equipped: false }
]
```

#### What Changed?
- Ammunition is now tracked as **individual items** with quantity
- `Arrow` weight changed from 1 lb (for 20) to 0.05 lb (each)
- `Bolt` weight changed from 1.5 lb (for 20) to 0.075 lb (each)
- Rangers and Fighters now receive ammunition programmatically

#### Migration Steps

**If you have stored character data:**

```typescript
// Step 1: Check for old ammunition format
function hasOldAmmunitionFormat(character: CharacterSheet): boolean {
    return character.equipment.some(item =>
        item.name === 'Arrows (20)' || item.name === 'Bolts (20)'
    );
}

// Step 2: Migrate to new format
function migrateAmmunition(character: CharacterSheet): CharacterSheet {
    const migrated = { ...character };

    for (const item of migrated.equipment) {
        if (item.name === 'Arrows (20)') {
            item.name = 'Arrow';
            item.quantity = 20;
        } else if (item.name === 'Bolts (20)') {
            item.name = 'Bolt';
            item.quantity = 20;
        }
    }

    return migrated;
}

// Step 3: Recalculate total weight
// (The EquipmentGenerator will handle this automatically)
```

**If you reference equipment by name in your code:**

```typescript
// BEFORE
const arrows = equipment.find(item => item.name === 'Arrows (20)');

// AFTER
const arrows = equipment.find(item => item.name === 'Arrow');
```

---

## Non-Breaking Changes (Behavioral)

### 2. Audio Analysis Frequency Bands

**Impact:** Low - Affects class selection distribution, but not data format

The frequency bands used for audio analysis have been rebalanced to reduce treble dominance:

| Band | Old Range | New Range | Rationale |
|------|-----------|-----------|-----------|
| **Bass** | 20-250 Hz (230 Hz) | 20-400 Hz (380 Hz) | Better representation of low frequencies |
| **Mid** | 250-4000 Hz (3750 Hz) | 400-4000 Hz (3600 Hz) | Slight adjustment for balance |
| **Treble** | 4000-20000 Hz (16000 Hz) | 4000-14000 Hz (10000 Hz) | Reduce over-representation of high frequencies |

**Result:** More balanced class selection (fewer Rogues/Rangers/Monks, more Barbarians/Fighters/Paladins)

**No migration needed** - This affects new character generation only.

---

### 3. Class Selection Algorithm

**Impact:** Low - Affects class selection distribution, but not data format

The `ClassSuggester` has been rewritten with:
- **4% baseline probability** for all classes (no class ever has 0% chance)
- **Affinity-based selection** instead of hard thresholds (0.6, 0.5)
- **Smooth transitions** - no binary on/off for classes

**Before:**
```typescript
// Hard threshold at 0.6
if (bass_dominance > 0.6) {
    // Only then could Barbarian be selected
}
```

**After:**
```typescript
// Smooth affinity calculation
// All classes always have at least 4% probability
// Audio profile influences probabilities smoothly
```

**No migration needed** - This affects new character generation only.

---

## New Features

### 4. Extensibility System

**Impact:** None - Opt-in feature

The engine now supports custom content through the `ExtensionManager`:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

// Get the singleton instance
const manager = ExtensionManager.getInstance();

// Register custom equipment
manager.register('equipment', [
    { name: 'Dragon Scale Armor', type: 'armor', rarity: 'rare', weight: 15 }
], {
    mode: 'append',  // Add to defaults (or 'replace' to override)
    weights: { 'Dragon Scale Armor': 0.5 }  // Half spawn rate
});

// Register custom races
manager.register('races', ['Dragonkin', 'Fairy'], {
    weights: { 'Dragonkin': 0.3, 'Fairy': 0.2 }
});

// Generate characters with custom content
const character = CharacterGenerator.generate(seed, audio, 'Hero', {
    extensions: {
        equipment: [
            { name: 'Dragon Scale Armor', type: 'armor', rarity: 'rare', weight: 15 }
        ]
    }
});
```

**No migration needed** - This is an opt-in feature.

---

### 5. Custom Spawn Weights

**Impact:** None - Opt-in feature

Control spawn rates for any category:

```typescript
const manager = ExtensionManager.getInstance();

// Make certain races more common
manager.setWeights('races', {
    'Human': 2,      // 2× more likely
    'Elf': 1.5,      // 1.5× more likely
    'Tiefling': 0.3  // Less common
});

// Absolute mode: complete control
manager.register('equipment', customItems, {
    mode: 'absolute',
    weights: {
        'Sword': 5,      // 50% chance
        'Shield': 3,     // 30% chance
        'Potion': 2      // 20% chance
    }
});
```

**No migration needed** - This is an opt-in feature.

---

## API Changes

### 6. AudioAnalyzer Options

**Impact:** Low - Optional parameter added

The `AudioAnalyzer` constructor now accepts frequency attenuation options:

```typescript
// BEFORE (still works)
const analyzer = new AudioAnalyzer();

// AFTER (with new options)
const analyzer = new AudioAnalyzer({
    trebleAttenuation: 0.7,  // Reduce treble by 30% (default)
    bassBoost: 1.2,          // Increase bass by 20% (default)
    midBoost: 1.1,           // Increase mid by 10% (default)
    includeAdvancedMetrics: true,
    sampleRate: 44100,
    fftSize: 2048
});
```

**No migration needed** - Old code continues to work with defaults.

---

## Testing Your Migration

### Verification Checklist

After migrating, verify:

- [ ] Stored characters load correctly
- [ ] Ammunition displays with correct quantity (e.g., "Arrow × 20")
- [ ] Total equipment weight is correct (20 arrows = 1.0 lb)
- [ ] New characters generate without errors
- [ ] Class selection is more balanced (all classes appear)
- [ ] Custom content (if used) registers correctly

### Test Code

```typescript
import { CharacterGenerator, EquipmentGenerator } from 'playlist-data-engine';

// Test 1: Verify ammunition format
const testCharacter = CharacterGenerator.generate('test', mockAudioProfile, 'Test Hero');
const arrows = testCharacter.equipment.find(item => item.name === 'Arrow');
console.assert(arrows?.quantity === 20, 'Ranger should have 20 arrows');
console.assert(testCharacter.equipment.every(item => item.name !== 'Arrows (20)'), 'Old format should not exist');

// Test 2: Verify weight calculation
const totalWeight = EquipmentGenerator.calculateTotalWeight(testCharacter.equipment);
console.assert(totalWeight > 0, 'Total weight should be calculated');

// Test 3: Verify class selection
const classes = new Set();
for (let i = 0; i < 100; i++) {
    const char = CharacterGenerator.generate(`test${i}`, mockAudioProfile, 'Test');
    classes.add(char.class);
}
console.assert(classes.size >= 8, 'Should see variety in classes');
```

---

## Rollback Instructions

If you need to rollback to a previous version:

1. **Restore package.json:**
   ```bash
   git checkout HEAD~1 package.json
   npm install
   ```

2. **Migrate character data back:**
   ```typescript
   function rollbackAmmunition(character: CharacterSheet): CharacterSheet {
       const migrated = { ...character };

       for (const item of migrated.equipment) {
           if (item.name === 'Arrow' && item.quantity === 20) {
               item.name = 'Arrows (20)';
               item.quantity = 1;
           } else if (item.name === 'Bolt' && item.quantity === 20) {
               item.name = 'Bolts (20)';
               item.quantity = 1;
           }
       }

       return migrated;
   }
   ```

3. **Remove ExtensionManager usage** (if added)

---

## Need Help?

- **Documentation:** See `DATA_ENGINE_REFERENCE.md` for complete API docs
- **Examples:** See `USAGE_IN_OTHER_PROJECTS.md` for usage examples
- **Upgrade Plan:** See `DATA_ENGINE_UPGRADE_PLAN.md` for technical details
- **Issues:** Report bugs at the project repository

---

## Summary

| Change | Breaking | Migration Required | Action |
|--------|----------|-------------------|--------|
| Ammunition format | Yes | Yes | Update stored character data |
| Audio analysis | No | No | None (behavioral change) |
| Class selection | No | No | None (behavioral change) |
| Extensibility system | No | No | None (opt-in feature) |
| AudioAnalyzer options | No | No | None (backward compatible) |

**Primary Action:** Migrate ammunition format in stored character data (`'Arrows (20)'` → `'Arrow'` with quantity 20).

---

## Phase 11 Breaking Changes (Custom Class Features System)

**Note:** Phase 11 has been implemented and introduces the following breaking changes.

### 6. Feature ID Format Change

**Impact:** High - Affects stored character data

#### Before (Old Format)
```typescript
// Old character features (display strings)
class_features: ['Barbarian Level 1', 'Barbarian Level 2', 'Barbarian Level 5']
racial_traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry']
```

#### After (New Format)
```typescript
// New character features (feature IDs from registry)
class_features: ['barbarian_rage', 'barbarian_unarmored_defense', 'barbarian_extra_attack']
racial_traits: ['elf_darkvision', 'elf_keen_senses', 'elf_fey_ancestry']
```

#### What Changed?
- Features are now stored as **feature IDs** (e.g., `'barbarian_rage'`) instead of display strings (e.g., `'Barbarian Level 1'`)
- A new **FeatureRegistry** manages all class features and racial traits
- A new **FeatureEffect** system has been added to track mechanical effects from features
- The `feature_effects` property has been added to `CharacterSheet` to store applied effects

#### Migration Steps

**If you have stored character data with old feature format:**

```typescript
// Step 1: Check for old feature format
function hasOldFeatureFormat(character: CharacterSheet): boolean {
    // Old format features contain phrases like "Level 1", "Level 2"
    return character.class_features.some(f =>
        f.includes('Level ') || f.includes(' level ')
    );
}

// Step 2: Create feature ID mapping for migration
const FEATURE_ID_MAPPING: Record<string, string> = {
    // Barbarian
    'Barbarian Level 1': 'barbarian_rage,barbarian_unarmored_defense',
    'Barbarian Level 2': 'barbarian_reckless_attack,barbarian_danger_sense',
    'Barbarian Level 5': 'barbarian_extra_attack,barbarian_fast_movement',
    // ... map all old format features to new IDs
    // See /workspace/src/core/features/DefaultFeatures.ts for complete list
};

// Step 3: Migrate to new format
function migrateFeatures(character: CharacterSheet): CharacterSheet {
    const migrated = { ...character };
    const newFeatures: string[] = [];

    for (const oldFeature of migrated.class_features) {
        const newIds = FEATURE_ID_MAPPING[oldFeature];
        if (newIds) {
            newFeatures.push(...newIds.split(','));
        }
    }

    migrated.class_features = newFeatures;
    return migrated;
}

// Step 4: Initialize feature_effects if missing
migrated.feature_effects = migrated.feature_effects || [];
```

**IMPORTANT:** The most reliable migration strategy is to **re-generate characters** from their original seeds after the upgrade. The feature format change is significant and manual migration may miss features or effects.

---

### 7. New FeatureEffect System

**Impact:** Low - New optional property

#### New Property: feature_effects

```typescript
export interface CharacterSheet {
    // ... existing fields

    /**
     * Feature effects applied to this character
     * Stores effects from features and traits that modify character stats
     *
     * Effects include:
     * - stat_bonus: Add to ability scores (e.g., +1 STR)
     * - skill_proficiency: Grant proficiency or expertise in a skill
     * - ability_unlock: Unlock new abilities (e.g., darkvision, flight)
     * - passive_modifier: Add constant bonuses (e.g., +10 speed)
     * - resource_grant: Grant resource pools (e.g., rage counts, ki points)
     * - spell_slot_bonus: Grant additional spell slots
     */
    feature_effects?: FeatureEffect[];
}
```

**What Changed:**
- Characters can now track specific effects from features and traits
- Effects are applied during character generation and level-ups via `FeatureEffectApplier`
- Old characters without `feature_effects` will have it initialized automatically

**No migration needed** - The property is optional and defaults to an empty array.

---

### 8. Feature Registry System

**Impact:** None - New opt-in feature

A new `FeatureRegistry` singleton manages class features and racial traits:

```typescript
import { FeatureRegistry, ClassFeature } from 'playlist-data-engine';

// Get the singleton instance
const registry = FeatureRegistry.getInstance();

// Register custom class features
const customFeature: ClassFeature = {
    id: 'dragon_fury',
    name: 'Dragon Fury',
    description: 'Channel your draconic heritage to deal extra damage...',
    type: 'active',
    level: 3,
    class: 'Barbarian',
    prerequisites: { level: 3 },
    effects: [
        { type: 'stat_bonus', target: 'melee_damage', value: 3 }
    ],
    source: 'custom'
};

registry.registerClassFeature(customFeature);

// Register custom racial traits
const customTrait = {
    id: 'dragonkin_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonkin',
    effects: [
        { type: 'passive_modifier', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
};

registry.registerRacialTrait(customTrait);
```

**No migration needed** - This is an opt-in feature for custom content.

---

## Summary Table Updated (Phases 1-11)

| Change | Breaking | Migration Required | Action |
|--------|----------|-------------------|--------|
| Ammunition format | Yes | Yes | Update stored character data |
| Feature ID format | Yes | Yes* | Re-generate characters or use mapping |
| FeatureEffect system | No | No | None (optional property) |
| Audio analysis | No | No | None (behavioral change) |
| Class selection | No | No | None (behavioral change) |
| Extensibility system | No | No | None (opt-in feature) |
| FeatureRegistry | No | No | None (opt-in feature) |
| AudioAnalyzer options | No | No | None (backward compatible) |

*\* Feature ID format migration is complex. The recommended approach is to re-generate characters from their original seeds rather than attempting manual migration.*

---

## Recommended Migration Strategy for Phase 11

Given the significant changes in Phase 11, the recommended approach is:

1. **Backup existing character data**
2. **Update the package** to the latest version
3. **Re-generate characters** from their original saved seeds:
   ```typescript
   // Load old character to get seed
   const oldCharacter = loadCharacter('character_id');
   const seed = oldCharacter.seed;

   // Re-generate with new system
   const newCharacter = CharacterGenerator.generate(
       seed,
       oldCharacter.audioProfile, // You may need to save this
       oldCharacter.name
   );
   ```
4. **Verify** that class_features now contain feature IDs (e.g., `'barbarian_rage'`)

---

**Note:** Future phases (12-15) will introduce additional breaking changes related to custom skills and unified spawn rates. Those changes are **not yet implemented** and are not covered in this migration guide.
