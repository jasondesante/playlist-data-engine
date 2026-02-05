# Plan: Fix Pre-existing Test Bugs Exposed by ExtensionManager Validation

## Background

During the implementation of `PLAN_REMOVE_REDUNDANT_REGISTRY_METHODS.md`, stricter validation was added to `ExtensionManager.register()` as part of Task 2.0 (moving spell list validation from SpellRegistry). This validation correctly checks that spell objects have all required fields before registration.

This exposed **pre-existing test bugs** where tests were registering incomplete spell objects (missing required fields like `casting_time`, `range`, `components`, `duration`). These tests were passing before because:
1. The old `SpellRegistry.registerSpell()` method did not validate the complete spell structure
2. Tests could register partial spell objects without error

Now that validation is properly enforced in ExtensionManager, these bugs are visible as test failures.

**Important**: These are NOT bugs introduced by the registry method removal work. They are pre-existing bugs that were exposed by improved validation.

---

## Current Test Status

- **Total Tests**: 2067
- **Passing**: 1986 (96.1%)
- **Failing**: 81 (3.9%)

All 81 failing tests are caused by incomplete spell data in test fixtures.

---

## Root Cause Analysis

### Issue 1: Incomplete Spell Objects (Primary - ~76 failing tests)

**Problem**: Tests register spells with incomplete data

Tests are creating spells like:
```typescript
const customSpells = [
    { name: 'Phoenix Fire', level: 5, school: 'Evocation' },
    { name: 'Mind Shield', level: 2, school: 'Abjuration' },
];
```

But the `Spell` interface (from `src/core/spells/SpellTypes.ts`) requires:
```typescript
export interface Spell {
    id?: string;              // optional
    name: string;             // required ✓
    level: number;            // required ✓
    school: SpellSchool;      // required ✓
    casting_time: string;     // required ✗
    range: string;            // required ✗
    components: string[];     // required ✗
    duration: string;         // required ✗
    description?: string;     // optional
    prerequisites?: SpellPrerequisite; // optional
}
```

**Validation Error** (from ExtensionManager):
```
Error: Invalid spell: missing required fields (casting_time, range, components, duration)
```

### Issue 2: Wrong Track Parameter Type (Secondary - ~5 failing tests)

**Problem**: Some tests pass strings instead of `PlaylistTrack` objects

```typescript
// Wrong (passes string)
const character = CharacterGenerator.generate(
    'test-custom-spells',
    sampleAudioProfile,
    'Test Wizard',  // ✗ This should be a PlaylistTrack object
    { forceClass: 'Wizard' }
);

// Correct (uses sampleTrack from fixtures)
const character = CharacterGenerator.generate(
    'test-custom-spells',
    sampleAudioProfile,
    sampleTrack,  // ✓ Proper PlaylistTrack object
    { forceClass: 'Wizard' }
);
```

---

## Implementation Plan

### Phase 1: Create Test Helper for Complete Spell Objects

**Goal**: Create reusable test fixtures for complete, valid spell objects

**File**: `tests/fixtures/spellFixtures.ts`

**Task 1.1: Create Complete Spell Fixture**

```typescript
import type { Spell } from '../../src/core/spells/SpellTypes';

export const completeTestSpells: Spell[] = [
    {
        id: 'phoenix_fire',
        name: 'Phoenix Fire',
        level: 5,
        school: 'Evocation',
        casting_time: '1 action',
        range: '60 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A burst of flame damages enemies.',
    },
    {
        id: 'mind_shield',
        name: 'Mind Shield',
        level: 2,
        school: 'Abjuration',
        casting_time: '1 bonus action',
        range: 'Self',
        components: ['V', 'S'],
        duration: '1 hour',
        description: 'Protects against mental effects.',
    },
    {
        id: 'time_warp',
        name: 'Time Warp',
        level: 3,
        school: 'Transmutation',
        casting_time: '1 action',
        range: '30 feet',
        components: ['V', 'S'],
        duration: 'Concentration, up to 1 minute',
        description: 'Alters time for targets.',
    },
    // ... more spells
];

export const createTestSpell = (overrides?: Partial<Spell>): Spell => ({
    id: 'test_spell',
    name: 'Test Spell',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    ...overrides,
});
```

**Status:** ✅ COMPLETED
- Created `tests/fixtures/spellFixtures.ts` with complete, valid spell objects
- Includes `completeTestSpells` array with 7 common test spells:
  - Phoenix Fire (level 5, Evocation)
  - Mind Shield (level 2, Abjuration)
  - Time Warp (level 3, Transmutation)
  - Arcane Spark (level 0, Evocation)
  - Fire Storm (level 4, Evocation)
  - Ice Storm (level 4, Evocation)
  - Frost Nova (level 3, Evocation)
- Added `createTestSpell()` factory function for creating custom test spells
- Added `createTestSpells()` factory function for creating multiple spells
- Added `spellByName` and `spellById` lookup maps for easy access
- Added helper objects: `spellComponents`, `castingTimes`, `spellRanges`, `spellDurations`
- All spells include required fields: `name`, `level`, `school`, `casting_time`, `range`, `components`, `duration`
- TypeScript compilation passes successfully

---


**Goal**: Update all integration tests to use complete spell objects

#### Task 2.1: Fix customGeneration.integration.test.ts

**File**: `tests/integration/customGeneration.integration.test.ts`

**Changes needed:**
- Replace incomplete spell objects with `completeTestSpells` fixture
- Replace string track parameters with `sampleTrack`

**Estimated fixes**: ~15 tests

**Status:** ✅ COMPLETED
- Imported `completeTestSpells` and `spellByName` from `spellFixtures.ts`
- Replaced all incomplete spell objects with complete spells from fixtures:
  - Phoenix Fire, Mind Shield, Time Warp (in first test)
  - Arcane Spark (from fixtures)
  - Created complete Mage Hand cantrip inline
  - Fire Storm, Ice Storm (in edge cases test)
- Replaced all string track parameters with `sampleTrack` (22 instances)
- Added `forceName: 'Test Character'` option to combined test to ensure name matches expectation
- All 22 tests now passing (100% pass rate for this file)

#### Task 2.2: Fix phase10.fullPipeline.test.ts

**File**: `tests/integration/phase10.fullPipeline.test.ts`

**Changes needed:**
- Replace incomplete spell objects with `completeTestSpells` fixture
- Replace string track parameters with `sampleTrack`

**Estimated fixes**: ~18 tests

**Status:** ✅ COMPLETED
- Imported `sampleTrack` from `../fixtures/sampleData.js`
- Imported `completeTestSpells` and `spellByName` from `../fixtures/spellFixtures.js`
- Replaced incomplete spell objects (lines 646-649) with complete spells from fixtures:
  - `spellByName['Phoenix Fire']` (complete with all required fields)
  - `spellByName['Mind Shield']` (complete with all required fields)
- Replaced all string track parameters with `sampleTrack`:
  - Lines 280, 316-317, 341, 401, 446, 518: Already using `sampleTrack` (now imported)
  - Lines 557-561, 594-598, 622-626: Added `sampleTrack` + `forceName: 'Ranger Test'`
  - Lines 664-673: Added `sampleTrack` + `forceName: 'Wizard Test'`
  - Lines 709-718: Added `sampleTrack` + `forceName: 'Rogue Test'`
  - Lines 754-762: Added `sampleTrack` + `forceName: 'Appearance Test'`
  - Lines 798, 824, 848, 872, 896, 921: Already using `sampleTrack` (now imported)
- All 19 tests now passing (100% pass rate for this file)

#### Task 2.3: Fix phase15.fullCustomContent.integration.test.ts

**File**: `tests/integration/phase15.fullCustomContent.integration.test.ts`

**Changes needed:**
- Fix incomplete custom spell definitions
- Ensure `phoenix_flame` spell is registered with all required fields

**Estimated fixes**: ~1 test

**Status:** [ ] TODO

#### Task 2.4: Fix part4.templateClassSystem.integration.test.ts

**File**: `tests/integration/part4.templateClassSystem.integration.test.ts`

**Changes needed:**
- Replace incomplete spell objects with `completeTestSpells` fixture
- Replace string track parameters with `sampleTrack`

**Estimated fixes**: ~2 tests

**Status:** [ ] TODO

#### Task 2.5: Fix remaining test files

**Files** (estimated):
- `tests/integration/e2e.test.ts`
- Any other integration/unit tests with incomplete spell data

**Status:** [ ] TODO

---

### Phase 3: Verify All Tests Pass

**Goal**: Ensure 100% test pass rate after fixes

#### Task 3.1: Run full test suite

```bash
npm test
```

**Expected result**: 2067 passing, 0 failing

**Status:** [ ] TODO

#### Task 3.2: Run TypeScript compilation

```bash
npm run build
```

**Expected result**: No errors

**Status:** [ ] TODO

#### Task 3.3: Run linting

```bash
npm run lint
```

**Expected result**: No errors

**Status:** [ ] TODO

---

## Success Criteria

1. [ ] All 2067 tests passing (100% pass rate)
2. [ ] No incomplete spell objects in test files
3. [ ] No string track parameters (all use `sampleTrack` or proper `PlaylistTrack` objects)
4. [ ] TypeScript compilation succeeds
5. [ ] Linting passes
6. [ ] Code is cleaner with reusable test fixtures

---

## File Change Summary

| File | Type | Changes |
|------|------|---------|
| `tests/fixtures/spellFixtures.ts` | Create | New reusable test spell fixtures |
| `tests/integration/customGeneration.integration.test.ts` | Modify | Use complete spell fixtures, fix track params |
| `tests/integration/phase10.fullPipeline.test.ts` | Modify | Use complete spell fixtures, fix track params |
| `tests/integration/phase15.fullCustomContent.integration.test.ts` | Modify | Use complete spell fixtures |
| `tests/integration/part4.templateClassSystem.integration.test.ts` | Modify | Use complete spell fixtures, fix track params |
| Other test files | Modify | Fix incomplete spell data |

---

## Timeline Estimate

- **Phase 1 (Create fixtures)**: ~30 minutes
- **Phase 2 (Fix tests)**: ~2-3 hours (81 failing tests across ~7 files)
- **Phase 3 (Verification)**: ~30 minutes
- **Total**: ~3-4 hours

---

## Notes

- This is a **separate initiative** from `PLAN_REMOVE_REDUNDANT_REGISTRY_METHODS.md`
- The registry method removal work is complete and successful
- These are **pre-existing bugs** exposed by improved validation
- Fixing these tests improves overall test quality and prevents similar issues in the future
- The stricter validation in ExtensionManager is a **good thing** - it catches bad data early
