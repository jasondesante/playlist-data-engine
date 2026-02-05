# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Automatic Cache Invalidation**: `ExtensionManager.register()` now automatically invalidates registry caches after successful registration
  - `SkillRegistry` cache is automatically invalidated when registering to `skills`, `skills.*`, `skillLists`, or `skillLists.*` categories
  - `SpellRegistry` cache is automatically invalidated when registering to `spells`, `spells.*`, `classSpellLists`, or `classSpellLists.*` categories
  - `FeatureRegistry` cache is automatically invalidated when registering to `classFeatures`, `classFeatures.*`, `racialTraits`, or `racialTraits.*` categories
  - `ExtensionManager.reset()` now automatically invalidates the appropriate registry cache
  - `ExtensionManager.resetAll()` now invalidates all registry caches (SkillRegistry, SpellRegistry, and FeatureRegistry)

### Changed
- **Breaking Change (Minor)**: Manual `invalidateCache()` calls are no longer required after registration
  - Existing code with manual cache invalidation will continue to work (backward compatible)
  - Manual calls are now redundant and can be safely removed

### Migration Notes

#### Before (Manual Cache Invalidation)
```typescript
import { ExtensionManager } from './core/extensions/ExtensionManager.js';
import { SpellRegistry } from './core/spells/SpellRegistry.js';

const manager = new ExtensionManager();

// Register custom spells
manager.register('spells', customSpells);

// Manual cache invalidation was required
SpellRegistry.getInstance().invalidateCache();
```

#### After (Automatic Cache Invalidation)
```typescript
import { ExtensionManager } from './core/extensions/ExtensionManager.js';

const manager = new ExtensionManager();

// Register custom spells - cache is automatically invalidated
manager.register('spells', customSpells);
// No manual invalidateCache() call needed!
```

#### Backward Compatibility
Manual `invalidateCache()` calls remain safe (idempotent) if you choose to keep them in your code. The registries' `invalidateCache()` methods are still public for internal use and special cases.

### Technical Details
- Cache invalidation only occurs after successful validation and registration
- Failed registrations (validation errors) do NOT invalidate caches - original data remains accessible
- Empty array registrations (`register('skills', [])`) still trigger cache invalidation
- Both `relative` and `replace` modes trigger automatic cache invalidation
- `registerMultiple()` with mixed categories invalidates each category's appropriate registry cache
- Non-registry categories (e.g., `equipment`, `classes`) do not trigger cache invalidation

### Test Coverage
- Added 31 new integration tests in `tests/integration/autoCacheInvalidation.test.ts`
- All edge cases verified: validation failures, empty arrays, relative/replace modes, class-specific categories
- Backward compatibility confirmed: manual `invalidateCache()` calls remain safe (idempotent)

### Files Modified
- `src/core/extensions/ExtensionManager.ts` - Core implementation
- `tests/helpers/registrationHelpers.ts` - Removed 8 manual invalidations
- `tests/integration/*.test.ts` - Removed ~40 manual invalidations across 5 files
- `tests/unit/*.test.ts` - Removed ~13 manual invalidations across 3 files
- `tests/documentation/*.test.ts` - Removed 7 manual invalidations across 2 files
- `tests/runtime-verification/*.ts` - Removed 4 manual invalidations
- `docs/*.md` - Updated 5 documentation files
- JSDoc comments updated in `SkillRegistry.ts`, `SpellRegistry.ts`, `FeatureRegistry.ts`
