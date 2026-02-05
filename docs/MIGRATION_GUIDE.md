# Migration Guide

This guide helps you migrate from older versions of the Playlist Data Engine to the current version. It documents breaking changes and provides step-by-step instructions for updating your code.

---

## Table of Contents

1. [Registry Registration Methods Removal](#registry-registration-methods-removal)
2. [ExtensionManager.register() Pattern](#extensionmanagerregister-pattern)

---

## Registry Registration Methods Removal

### Summary

**Version:** Current (no deprecation period - methods removed outright)

The following convenience registration methods have been removed from the registries:

- `SpellRegistry.registerSpell()`
- `SpellRegistry.registerSpells()`
- `SpellRegistry.registerClassSpellList()`
- `SkillRegistry.registerSkill()`
- `SkillRegistry.registerSkills()`
- `FeatureRegistry.registerClassFeature()`
- `FeatureRegistry.registerClassFeatures()`
- `FeatureRegistry.registerRacialTrait()`
- `FeatureRegistry.registerRacialTraits()`

**Reason:** To simplify the API and provide a single, consistent way to register content via `ExtensionManager.register()`.

---

## ExtensionManager.register() Pattern

### Overview

All content registration should now use `ExtensionManager.register()` directly. The registries (SpellRegistry, SkillRegistry, FeatureRegistry) are now **query-only** - they read data from the ExtensionManager but do not provide registration methods.

### Registration Pattern

```typescript
import { ExtensionManager, SpellRegistry, SkillRegistry, FeatureRegistry } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== REGISTER SPELLS =====
manager.register('spells', [{
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'A burst of flame...'
}]);

// Invalidate cache after registration
SpellRegistry.getInstance().invalidateCache();

// ===== REGISTER SKILLS =====
manager.register('skills.INT', [{
    id: 'arcana',
    name: 'Arcana',
    ability: 'INT',
    description: 'Knowledge of magical theory',
    source: 'default'
}]);

// Invalidate cache after registration
SkillRegistry.getInstance().invalidateCache();

// ===== REGISTER CLASS FEATURES =====
manager.register('classFeatures.Wizard', [{
    id: 'wizard_arcane_recovery',
    name: 'Arcane Recovery',
    description: 'Recover spell slots',
    type: 'active',
    class: 'Wizard',
    level: 1,
    source: 'default'
}]);

// Invalidate cache after registration
FeatureRegistry.getInstance().invalidateCache();

// ===== REGISTER RACIAL TRAITS =====
manager.register('racialTraits', [{
    id: 'elf_darkvision',
    name: 'Darkvision',
    description: 'See in darkness',
    race: 'Elf',
    effects: [
        { type: 'ability_unlock', target: 'darkvision', value: 60 }
    ],
    source: 'default'
}]);

// Invalidate cache after registration
FeatureRegistry.getInstance().invalidateCache();
```

---

### Migration Examples

#### Spell Registration

**Before (removed):**

```typescript
import { SpellRegistry } from 'playlist-data-engine';

const spellRegistry = SpellRegistry.getInstance();

// Single spell
spellRegistry.registerSpell({
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    // ... other properties
});

// Multiple spells
spellRegistry.registerSpells([
    { id: 'fireball', name: 'Fireball', /* ... */ },
    { id: 'lightning_bolt', name: 'Lightning Bolt', /* ... */ }
]);
```

**After (current):**

```typescript
import { ExtensionManager, SpellRegistry } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register via ExtensionManager
manager.register('spells', [
    { id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation', /* ... */ },
    { id: 'lightning_bolt', name: 'Lightning Bolt', /* ... */ }
]);

// Invalidate cache
SpellRegistry.getInstance().invalidateCache();
```

---

#### Skill Registration

**Before (removed):**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const skillRegistry = SkillRegistry.getInstance();

skillRegistry.registerSkill({
    id: 'dragon_lore',
    name: 'Dragon Lore',
    ability: 'INT',
    description: 'Knowledge about dragons',
    prerequisites: {
        level: 5,
        class: 'Wizard'
    },
    source: 'custom'
});
```

**After (current):**

```typescript
import { ExtensionManager, SkillRegistry } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

manager.register('skills.INT', [{
    id: 'dragon_lore',
    name: 'Dragon Lore',
    ability: 'INT',
    description: 'Knowledge about dragons',
    prerequisites: {
        level: 5,
        class: 'Wizard'
    },
    source: 'custom'
}]);

// Invalidate cache
SkillRegistry.getInstance().invalidateCache();
```

---

#### Class Feature Registration

**Before (removed):**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const featureRegistry = FeatureRegistry.getInstance();

// Single feature
featureRegistry.registerClassFeature({
    id: 'wizard_spell_mastery',
    name: 'Spell Mastery',
    class: 'Wizard',
    level: 18,
    type: 'passive',
    source: 'default'
});

// Multiple features
featureRegistry.registerClassFeatures([
    { id: 'wizard_1', name: 'Feature 1', /* ... */ },
    { id: 'wizard_2', name: 'Feature 2', /* ... */ }
]);
```

**After (current):**

```typescript
import { ExtensionManager, FeatureRegistry } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

manager.register('classFeatures.Wizard', [
    { id: 'wizard_spell_mastery', name: 'Spell Mastery', /* ... */ },
    { id: 'wizard_1', name: 'Feature 1', /* ... */ },
    { id: 'wizard_2', name: 'Feature 2', /* ... */ }
]);

// Invalidate cache
FeatureRegistry.getInstance().invalidateCache();
```

---

#### Racial Trait Registration

**Before (removed):**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const featureRegistry = FeatureRegistry.getInstance();

featureRegistry.registerRacialTrait({
    id: 'dragonkin_fire_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: { subrace: 'Fire Dragonkin' },
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
});
```

**After (current):**

```typescript
import { ExtensionManager, FeatureRegistry } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

manager.register('racialTraits', [{
    id: 'dragonkin_fire_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: { subrace: 'Fire Dragonkin' },
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);

// Invalidate cache
FeatureRegistry.getInstance().invalidateCache();
```

---

#### Class Spell List Registration

**Before (removed):**

```typescript
import { SpellRegistry } from 'playlist-data-engine';

const spellRegistry = SpellRegistry.getInstance();

spellRegistry.registerClassSpellList('Wizard', {
    cantrips: ['Mage Hand', 'Prestidigitation'],
    spells_by_level: {
        1: ['Detect Magic', 'Magic Missile'],
        2: ['Invisibility']
    }
});
```

**After (current):**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

manager.register('classSpellLists.Wizard', [{
    cantrips: ['Mage Hand', 'Prestidigitation'],
    spells_by_level: {
        1: ['Detect Magic', 'Magic Missile'],
        2: ['Invisibility']
    }
}]);
```

---

### Cache Invalidation

**Important:** After registering content via `ExtensionManager.register()`, you must call `invalidateCache()` on the corresponding registry to ensure query methods return updated data:

```typescript
// After registering spells
SpellRegistry.getInstance().invalidateCache();

// After registering skills
SkillRegistry.getInstance().invalidateCache();

// After registering class features or racial traits
FeatureRegistry.getInstance().invalidateCache();
```

This is necessary because registries cache query results for performance. Direct registration via ExtensionManager bypasses the registry's automatic cache invalidation.

---

### Test Helper Functions

For test code, you can use helper functions from `tests/helpers/registrationHelpers.ts`:

```typescript
import {
    registerTestSpell,
    registerTestSkill,
    registerTestClassFeature,
    registerTestRacialTrait
} from '../helpers/registrationHelpers';

// These handle ExtensionManager.register() + cache invalidation automatically
registerTestSpell({ id: 'test_spell', name: 'Test Spell', /* ... */ });
registerTestSkill({ id: 'test_skill', name: 'Test Skill', ability: 'INT', /* ... */ });
registerTestClassFeature({ id: 'test_feature', name: 'Test Feature', /* ... */ });
registerTestRacialTrait({ id: 'test_trait', name: 'Test Trait', /* ... */ });
```

---

### Validation Behavior

Validation is automatically performed by `ExtensionManager.register()` when you call it (unless `{ validate: false }` is passed in options). The validation behavior is identical to the old registry methods.

**Validation is handled by:**
- `SpellValidator.validateSpell()` for spells
- `SkillValidator.validateSkill()` for skills
- `FeatureValidator.validateClassFeature()` for class features
- `FeatureValidator.validateRacialTrait()` for racial traits

---

### ExtensionManager.register() Options

The `register()` method accepts options for additional control:

```typescript
manager.register(category, items, {
    mode: 'relative',      // 'relative' | 'absolute' | 'default' | 'replace'
    validate: true,        // Enable/disable validation
    weights: {             // Spawn rate weights
        'item_name': 0.5   // Custom spawn weight
    }
});
```

**Modes:**
- `relative` (default): Add to default pool with custom weights
- `absolute`: Only custom content spawns (replaces defaults)
- `default`: All items have equal weight
- `replace`: Clear previous custom data and replace with new

---

## Summary of Changes

| Registry | Removed Methods | New Pattern |
|----------|----------------|-------------|
| **SpellRegistry** | `registerSpell()`, `registerSpells()`, `registerClassSpellList()` | `ExtensionManager.register('spells', [...])` |
| **SkillRegistry** | `registerSkill()`, `registerSkills()` | `ExtensionManager.register('skills.${Ability}', [...])` |
| **FeatureRegistry** | `registerClassFeature()`, `registerClassFeatures()`, `registerRacialTrait()`, `registerRacialTraits()` | `ExtensionManager.register('classFeatures.${Class}', [...])` or `ExtensionManager.register('racialTraits', [...])` |

**Query methods remain unchanged:**
- All `get*()`, `getAll*()`, `has*()` methods still work
- Validation methods still work
- The only change is **how content is registered**

---

## Need Help?

For complete API documentation, see:
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference
- [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md) - Extensibility system guide
- [PREREQUISITES.md](PREREQUISITES.md) - Prerequisite system documentation
- [CUSTOM_CONTENT.md](CUSTOM_CONTENT.md) - Custom races and classes guide

For examples of the new registration pattern, see:
- [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md) - Usage examples with ExtensionManager
- `tests/integration/customGeneration.integration.test.ts` - Integration test examples
