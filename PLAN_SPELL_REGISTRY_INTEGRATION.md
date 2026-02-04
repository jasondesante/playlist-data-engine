# Plan: SpellRegistry Integration with ExtensionManager

## Executive Summary

**Goal:** Refactor SpellRegistry to be a **convenience wrapper** around ExtensionManager — no duplicate storage, same API.

**Current State:**
- SpellRegistry is a 575-line singleton with its own duplicate data storage
- NOT connected to ExtensionManager
- SkillRegistry/FeatureRegistry also have duplicate storage (ExtensionManager delegates to them)

**Target State (Better Architecture):**
- **ExtensionManager = single source of truth**
- **SpellRegistry = convenience wrapper** that delegates to ExtensionManager
- Users can call `SpellRegistry.registerSpell()` — internally calls `ExtensionManager.register('spells', [...])`
- Query methods read from ExtensionManager with caching
- **Improvement over SkillRegistry/FeatureRegistry pattern** — no duplicate storage

---

## Architecture Comparison

### Current: SkillRegistry/FeatureRegistry (Duplicate Storage)

```
┌─────────────────────┐     delegate to      ┌──────────────────┐
│  ExtensionManager   │ ─────────────────────▶│  SkillRegistry   │
│  - stores data      │                       │  - stores SAME   │
│  - validates        │                       │    data (dup!)   │
└─────────────────────┘                       └──────────────────┘
       ▲                                                   │
       │              generation reads from                │
       └───────────────────────────────────────────────────┘
```

**Problem:** Two copies of the same data. Must stay in sync via delegation.

### Target: SpellRegistry (Convenience Wrapper, No Storage)

```
┌─────────────────────┐
│  ExtensionManager   │ ← Single source of truth
│  - stores data      │
│  - validates        │
└────────▲────────────┘
         │
         │ reads from
         │
┌────────┴────────────┐
│  SpellRegistry      │ ← Convenience wrapper (no storage)
│  - registerSpell()  │    delegates to EM
│  - getSpells()      │    queries EM with cache
│  - getSpellsByX()   │
└─────────────────────┘
```

**Benefits:**
- Single source of truth
- Users get convenient API (`SpellRegistry.registerSpell()`)
- No duplicate data
- Better than SkillRegistry/FeatureRegistry pattern

---

## Implementation Plan

### Phase 1: Refactor SpellRegistry Internals

**File:** `src/core/spells/SpellRegistry.ts`

---

#### Task 1.1: Remove Internal Storage

**Remove these properties:**
- [ ] `private spells: Map<string, RegisteredSpell>`
- [ ] `private spellsByLevel: Map<number, Set<string>>`
- [ ] `private spellsBySchool: Map<SpellSchool, Set<string>>`
- [ ] `private spellsByClass: Map<Class, Set<string>>`
- [ ] `private classSpellLists: Map<Class, string[]>`
- [ ] `private initialized: boolean`

**Add these properties:**
- [ ] `private manager: ExtensionManager` (reference to ExtensionManager)
- [ ] `private allSpellsCache: RegisteredSpell[] | null` (lazy cache)
- [ ] `private levelCache: Map<number, RegisteredSpell[]> | null` (lazy index)
- [ ] `private schoolCache: Map<SpellSchool, RegisteredSpell[]> | null` (lazy index)

**Verification:**
- [ ] TypeScript compiles
- [ ] Constructor initializes `this.manager = ExtensionManager.getInstance()`

---

#### Task 1.2: Refactor Registration Methods (Delegate to EM)

**Refactor `registerSpell()` to delegate to ExtensionManager:**

```typescript
registerSpell(spell: RegisteredSpell): void {
    // Validate first
    const validation = SpellValidator.validateSpell(spell);
    if (!validation.valid) {
        throw new Error(`Invalid spell: ${validation.errors.join(', ')}`);
    }

    // Ensure spell has ID
    const spellToRegister = {
        ...spell,
        id: spell.id || spell.name,
        source: spell.source || 'custom'
    };

    // Delegate to ExtensionManager
    this.manager.register('spells', [spellToRegister]);

    // Invalidate cache
    this.invalidateCache();
}
```

- [ ] Update `registerSpell()` to delegate to `this.manager.register('spells', [spell])`
- [ ] Update `registerSpells()` to delegate to `this.manager.register('spells', spells)`
- [ ] Update `registerClassSpellList()` to delegate to `this.manager.register('spells.${class}', [list])`
- [ ] Add `invalidateCache()` method to clear caches on registration

**Verification:**
- [ ] Registering a spell via SpellRegistry adds it to ExtensionManager
- [ ] Calling `manager.get('spells')` returns the registered spell

---

#### Task 1.3: Refactor Query Methods (Read from EM)

**Refactor `getSpells()` to read from ExtensionManager:**

```typescript
getSpells(): RegisteredSpell[] {
    if (!this.allSpellsCache) {
        const spells = this.manager.get('spells');
        this.allSpellsCache = spells as RegisteredSpell[];
    }
    return this.allSpellsCache;
}
```

- [ ] Refactor `getSpells()` — read from `this.manager.get('spells')`
- [ ] Refactor `getSpell(id)` — find in `this.getSpells()`
- [ ] Refactor `hasSpell(id)` — check `getSpell(id)` !== undefined
- [ ] Refactor `getSpellCount()` — return `this.getSpells().length`
- [ ] Refactor `getSpellsBySource(source)` — filter `this.getSpells()`

**Verification:**
- [ ] `getSpells()` returns spells from ExtensionManager
- [ ] `getSpell('Fireball')` finds the spell

---

#### Task 1.4: Refactor Indexed Query Methods (Build from EM)

**Refactor `getSpellsByLevel()` to build index from EM data:**

```typescript
getSpellsByLevel(level: number): RegisteredSpell[] {
    if (!this.levelCache) {
        this.levelCache = new Map();
        const allSpells = this.getSpells();
        for (const spell of allSpells) {
            if (!this.levelCache.has(spell.level)) {
                this.levelCache.set(spell.level, []);
            }
            this.levelCache.get(spell.level)!.push(spell);
        }
    }
    return this.levelCache.get(level) || [];
}
```

- [ ] Refactor `getSpellsByLevel(level)` — build cache from `this.getSpells()`
- [ ] Refactor `getSpellsBySchool(school)` — build cache from `this.getSpells()`
- [ ] Refactor `getSpellsForClass(cls)` — filter by `classes` property
- [ ] Add `invalidateCache()` to clear all caches

**Verification:**
- [ ] `getSpellsByLevel(5)` returns level 5 spells
- [ ] `getSpellsBySchool('Evocation')` returns evocation spells
- [ ] Caches are invalidated after registration

---

#### Task 1.5: Refactor Remaining Methods

- [ ] Refactor `getAvailableSpells(character)` — filter `this.getSpells()` by prerequisites
- [ ] Keep `validatePrerequisites()` — unchanged (no storage dependency)
- [ ] Keep `validateSpell()` — unchanged
- [ ] Refactor `getRegistryStats()` — compute from `this.getSpells()`

**Verification:**
- [ ] `getAvailableSpells()` returns spells matching character prerequisites

---

#### Task 1.6: Fix getSpellSlotsForClass Import

**Current code (line 336):**
```typescript
const { getSpellSlotsForClass } = require('../../utils/constants.js');
```

**Fix:**
- [ ] Remove the `require()` call
- [ ] Add proper import at top of file: `import { getSpellSlotsForClass } from '../../utils/constants.js';`
- [ ] Update method to use imported function

**Verification:**
- [ ] No `require()` calls in the file
- [ ] TypeScript compiles without errors

---

#### Task 1.7: Remove/Update Obsolete Methods

- [ ] Remove `initializeDefaults()` — not needed, EM handles initialization
- [ ] Remove `reset()` — EM has its own reset
- [ ] Remove `isInitialized()` — not needed
- [ ] Remove `unregisterSpell()` — EM doesn't support individual item removal
- [ ] Remove `exportRegistry()` — replace with simple getter or remove

**Verification:**
- [ ] TypeScript compiles
- [ ] No references to removed methods

---

### Phase 2: Update Tests

**File:** `tests/documentation/examples-compilation.test.ts`

---

#### Task 2.1: Update Existing SpellRegistry Tests

**Lines 13, 30, 1358-1360** reference SpellRegistry:

- [ ] Review existing test at lines 1358-1360
- [ ] Update test to verify `SpellRegistry.registerSpell()` delegates to ExtensionManager
- [ ] Verify `getSpellRegistry()` returns singleton instance

**Verification:**
- [ ] Test passes

---

#### Task 2.2: Add Integration Tests

- [ ] Add test: Register via `SpellRegistry.registerSpell()`, verify in `ExtensionManager.get('spells')`
- [ ] Add test: Register via `ExtensionManager.register('spells')`, verify `SpellRegistry.getSpells()` sees it
- [ ] Add test: `getSpellsByLevel()` returns correct spells
- [ ] Add test: `getSpellsBySchool()` returns correct spells
- [ ] Add test: Cache invalidation works after registration

**Verification:**
- [ ] All new tests pass

---

### Phase 3: Update Documentation

---

#### Task 3.1: Update EXTENSIBILITY_GUIDE.md

**Lines 481-483** — incorrect SpellRegistry usage example

**Current example shows direct SpellRegistry registration (will work, but should clarify pattern):**

- [ ] Update example to show both ways work:
  - Way 1: `ExtensionManager.register('spells', [...])` — direct
  - Way 2: `SpellRegistry.registerSpell(...)` — convenience wrapper
- [ ] Add note: "SpellRegistry is a convenience wrapper around ExtensionManager"
- [ ] Clarify: Both methods end up in the same place (ExtensionManager)

**Recommended example:**
```typescript
import { ExtensionManager, SpellRegistry } from 'playlist-data-engine';

// Way 1: Register directly via ExtensionManager
const manager = ExtensionManager.getInstance();
manager.register('spells', [customSpell1, customSpell2]);

// Way 2: Register via SpellRegistry convenience wrapper
const registry = SpellRegistry.getInstance();
registry.registerSpell(customSpell3);

// Query via SpellRegistry convenience methods
const level5Spells = registry.getSpellsByLevel(5);
const evocationSpells = registry.getSpellsBySchool('Evocation');
```

**Verification:**
- [ ] Example code compiles
- [ ] Both patterns documented

---

#### Task 3.2: Update DATA_ENGINE_REFERENCE.md

**Lines 28, 4888-4993** document SpellRegistry

- [ ] Update section intro: "SpellRegistry is a convenience wrapper around ExtensionManager"
- [ ] Update `registerSpell()` docs: "Delegates to ExtensionManager.register('spells', [...])"
- [ ] Update `getSpells()` docs: "Reads from ExtensionManager with caching"
- [ ] Update `getSpellsByLevel()` docs: "Queries ExtensionManager, builds index"
- [ ] Remove documentation for removed methods (reset, unregisterSpell, etc.)
- [ ] Add cross-reference to ExtensionManager spell handling

**Verification:**
- [ ] Documentation matches implementation

---

#### Task 3.3: Update USAGE_IN_OTHER_PROJECTS.md

**Line 1760** mentions SpellRegistry

- [ ] Update feature description
- [ ] Emphasize: "Convenience wrapper around ExtensionManager"
- [ ] Note: "No duplicate storage — improvement over SkillRegistry/FeatureRegistry pattern"

**Verification:**
- [ ] Description accurate

---

#### Task 3.4: Audit Other Documentation

- [ ] Check `docs/CUSTOM_CONTENT.md` for spell registration examples
- [ ] Verify all examples use ExtensionManager or SpellRegistry correctly
- [ ] Check for any remaining "SpellRegistry stores" language (should be "reads from EM")

**Verification:**
- [ ] No outdated SpellRegistry documentation

---

### Phase 4: Final Verification

---

#### Task 4.1: Run All Tests

- [ ] Run `npm test` — all tests pass
- [ ] Run spell-related integration tests specifically
- [ ] Run documentation compilation tests

**Verification:**
- [ ] All tests pass
- [ ] No TypeScript errors

---

#### Task 4.2: Manual Verification

- [ ] Register spell via `SpellRegistry.registerSpell()`
- [ ] Verify `ExtensionManager.get('spells')` includes it
- [ ] Verify `SpellRegistry.getSpellsByLevel()` works
- [ ] Verify `SpellRegistry.getSpellsBySchool()` works
- [ ] Generate a character with custom spells
- [ ] Verify custom spells appear on character

**Verification:**
- [ ] Manual testing successful

---

#### Task 4.3: Code Quality Check

- [ ] No console warnings
- [ ] No TODO comments left in modified files
- [ ] No `require()` calls (use imports)
- [ ] Code follows existing patterns

**Verification:**
- [ ] Code clean and consistent

---

## File Change Summary

| File | Type | Changes |
|------|------|---------|
| `src/core/spells/SpellRegistry.ts` | Modify | Remove storage, delegate to EM, add caching |
| `tests/documentation/examples-compilation.test.ts` | Modify | Update/add tests |
| `docs/EXTENSIBILITY_GUIDE.md` | Modify | Update examples, clarify wrapper pattern |
| `docs/CUSTOM_CONTENT.md` | Audit | Check for consistency |
| `DATA_ENGINE_REFERENCE.md` | Modify | Update for new architecture |
| `USAGE_IN_OTHER_PROJECTS.md` | Modify | Update feature description |

**No changes needed:**
- `src/core/extensions/ExtensionManager.ts` — SpellRegistry calls EM, not vice versa
- `src/core/extensions/initializeDefaults.ts` — EM initializes, SpellRegistry reads
- `src/index.ts` — exports unchanged
- `src/core/spells/index.ts` — exports unchanged

---

## Success Criteria

1. ✅ SpellRegistry has no internal storage (reads from ExtensionManager)
2. ✅ `registerSpell()` delegates to `ExtensionManager.register('spells', [...])`
3. ✅ Query methods (`getSpellsByLevel`, etc.) read from ExtensionManager with caching
4. ✅ All existing public methods work (same API)
5. ✅ All tests pass
6. ✅ Documentation updated to reflect wrapper pattern
7. ✅ `getSpellSlotsForClass()` import fixed
8. ✅ Better than SkillRegistry/FeatureRegistry — no duplicate storage

---

## Open Questions

All resolved. Ready to implement.

### ✅ Architecture

**Decision:** SpellRegistry = convenience wrapper around ExtensionManager

- Registration methods delegate to ExtensionManager
- Query methods read from ExtensionManager with caching
- No duplicate storage
- Improvement over SkillRegistry/FeatureRegistry pattern

### ✅ API Compatibility

**Decision:** Keep same public API

- All existing methods work the same way
- `registerSpell()`, `getSpellsByLevel()`, etc.
- Internals completely changed, externally compatible

### ✅ Documentation

**Decision:** Show both registration patterns

- Direct via ExtensionManager
- Convenience via SpellRegistry
- Clarify they end up in the same place
