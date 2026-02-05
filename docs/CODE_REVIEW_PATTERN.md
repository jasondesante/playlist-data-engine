# Code Review Pattern: Registry Registration

## Overview

This document outlines the pattern for code reviews related to registry content registration. All new content registration should use `ExtensionManager.register()` directly, not the removed registry convenience methods.

## ESLint Rule

An ESLint rule is configured to automatically detect usage of removed registry methods:

- **Rule name**: `no-removed-registry-methods/no-removed-registry-methods`
- **Severity**: Error
- **Location**: `eslint.config.js` and `eslint-plugins/no-removed-registry-methods.js`

## Removed Methods

The following methods have been removed and should NOT be used in new code:

### SpellRegistry (Removed)
- `registerSpell()` - Use `ExtensionManager.register('spells', [...])` instead
- `registerSpells()` - Use `ExtensionManager.register('spells', [...])` instead
- `registerClassSpellList()` - Use `ExtensionManager.register('spells.{ClassName}', [...])` instead

### SkillRegistry (Removed)
- `registerSkill()` - Use `ExtensionManager.register('skills', [...])` instead
- `registerSkills()` - Use `ExtensionManager.register('skills', [...])` instead

### FeatureRegistry (Removed)
- `registerClassFeature()` - Use `ExtensionManager.register('classFeatures', [...])` instead
- `registerClassFeatures()` - Use `ExtensionManager.register('classFeatures', [...])` instead
- `registerRacialTrait()` - Use `ExtensionManager.register('racialTraits', [...])` instead
- `registerRacialTraits()` - Use `ExtensionManager.register('racialTraits', [...])` instead

## Correct Registration Pattern

### Spells
```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { SpellRegistry } from 'playlist-data-engine';

// Register a spell
const manager = new ExtensionManager();
manager.register('spells', [{
  id: 'fireball',
  name: 'Fireball',
  level: 3,
  school: 'evocation',
  casting_time: '1 action',
  range: '150 feet',
  components: ['V', 'S', 'M'],
  duration: 'Instantaneous',
}]);

// Invalidate cache so query methods see the new spell
SpellRegistry.getInstance().invalidateCache();
```

### Skills
```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { SkillRegistry } from 'playlist-data-engine';

// Register a skill
const manager = new ExtensionManager();
manager.register('skills', [{
  id: 'arcana',
  name: 'Arcana',
  ability: 'intelligence',
  category: 'knowledge',
}]);

// Invalidate cache
SkillRegistry.getInstance().invalidateCache();
```

### Class Features
```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { FeatureRegistry } from 'playlist-data-engine';

// Register class features
const manager = new ExtensionManager();
manager.register('classFeatures', [{
  id: 'wizard_arcane_recovery',
  name: 'Arcane Recovery',
  class: 'Wizard',
  level: 1,
}]);

// Invalidate cache
FeatureRegistry.getInstance().invalidateCache();
```

### Racial Traits
```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { FeatureRegistry } from 'playlist-data-engine';

// Register racial traits
const manager = new ExtensionManager();
manager.register('racialTraits', [{
  id: 'elf_fey_ancestry',
  name: 'Fey Ancestry',
  race: 'Elf',
}]);

// Invalidate cache
FeatureRegistry.getInstance().invalidateCache();
```

## Code Review Checklist

When reviewing PRs that involve content registration:

1. **Check for Removed Methods**: Look for any of the removed method names in the diff
2. **Verify ExtensionManager Usage**: Ensure `ExtensionManager.register()` is used instead
3. **Check Cache Invalidation**: Ensure registry `invalidateCache()` is called after registration
4. **Verify Category**: Ensure the correct category is passed to `register()`
   - `'spells'` for spells
   - `'spells.{ClassName}'` for class spell lists
   - `'skills'` for skills
   - `'classFeatures'` for class features
   - `'racialTraits'` for racial traits

## Automated Enforcement

The ESLint rule will automatically flag usage of removed methods. However, manual review is still important because:

1. The rule may not catch all patterns (e.g., dynamic method calls)
2. Code reviewers should verify the correct category is used
3. Cache invalidation is not enforced by the rule but is required

## Migration

For legacy code that uses the removed methods, see `docs/MIGRATION_GUIDE.md` for detailed migration instructions.

## Related Documentation

- `docs/EXTENSIBILITY_GUIDE.md` - Full extensibility documentation
- `docs/MIGRATION_GUIDE.md` - Migration guide for removed methods
- `tests/helpers/registrationHelpers.ts` - Test helper functions that demonstrate the correct pattern
