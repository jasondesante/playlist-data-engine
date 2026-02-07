# Bug Fix Implementation Plan

**Last Updated:** 2026-02-07

This plan contains 14 prioritized bug fixes identified through comprehensive code review. Each fix includes specific steps to implement and verify the solution.

---

## Phase 1: Critical Breaking Bugs (Fix Immediately)

These issues will cause production failures and must be fixed first.

### Task 1: Fix ESM Incompatibility in FeatureValidator

**Severity:** CRITICAL
**Location:** `src/core/features/FeatureValidator.ts:263-287`

**Issue:**
```typescript
const { ExtensionManager } = require('../../extensions/ExtensionManager.js');
```
The project is configured as pure ESM (`"type": "module"` in package.json). In ESM mode, `require` is undefined, causing custom race validation to silently fail.

**Impact:** Users with custom races/classes will get broken behavior with no error messages.

**Fix Steps:**
1. [ ] Read `src/core/features/FeatureValidator.ts` lines 260-290
2. [ ] Replace dynamic require with static import:
   ```typescript
   import { ExtensionManager } from '../../extensions/ExtensionManager.js';
   ```
3. [ ] Test that custom race validation still works
4. [ ] Add test for ESM build environment
5. [ ] Verify no circular dependency errors

**Expected Outcome:** Custom race validation works in production builds.

---

### Task 2: Fix ESM Incompatibility in CombatEngine

**Severity:** HIGH
**Location:** `src/core/combat/CombatEngine.ts:223`

**Issue:**
```typescript
private buildAttackFromWeapon(weaponName: string, character: CharacterSheet): Attack {
    const { EQUIPMENT_DATABASE } = require('../../utils/constants.js');
```
Same ESM incompatibility - will fail in production builds.

**Fix Steps:**
1. [ ] Read `src/core/combat/CombatEngine.ts` to understand context
2. [ ] Move import to top of file:
   ```typescript
   import { EQUIPMENT_DATABASE } from '../../utils/constants.js';
   ```
3. [ ] Test that equipment data loads correctly
4. [ ] If circular dependency occurs, refactor module structure

**Expected Outcome:** Equipment lookups work in ESM builds.

---

## Phase 2: High Priority Fixes

Fix these after completing Phase 1.

### Task 3: Infinite Recursion in SpellValidator

**Severity:** CRITICAL
**Location:** `src/core/spells/SpellValidator.ts:212-213`

**Issue:**
```typescript
static isValidAbility(ability: string): ability is Ability {
    return isValidAbility(ability);  // Infinite recursion!
}
```

**Fix Steps:**
1. [x] Read `src/core/spells/SpellValidator.ts` to understand the context
2. [x] Read `src/core/utils/AbilityConstants.ts` to find the correct implementation
3. [x] Rename the static method and delegate to imported function:
   ```typescript
   import { isValidAbility } from '../utils/AbilityConstants.js';
   static checkIsValidAbility(ability: string): ability is Ability {
       return isValidAbility(ability);
   }
   ```
4. [x] Update all callers to use `checkIsValidAbility()` instead of `isValidAbility()`
5. [x] Add unit test to verify the function works correctly
6. [x] Run tests to ensure no regressions
7. [x] **IMPORTANT:** Investigate why this wasn't caught in testing (suggests untested codepath)

**Expected Outcome:** Spell validation works without causing stack overflow.

**Implementation Notes:**
- Root cause: Name collision between imported `isValidAbility` function and static method of the same name
- Solution used: Import alias `isValidAbility as isValidAbilityCheck` (same pattern as SkillValidator.ts)
- No callers existed for this static method, which is why the bug wasn't caught
- Added regression test in `tests/unit/spellPrerequisites.test.ts` with 3 new test cases
- All 2099 tests pass (2096 + 3 new)

---

### Task 4: Critical Hit Logic with Advantage/Disadvantage

**Severity:** HIGH
**Location:** `src/core/combat/AttackResolver.ts:201-264`

**Issue:**
When attacking with advantage/disadvantage, criticals and fumbles are only checked on the selected roll. D&D 5e rules state:
- **Advantage:** If EITHER die shows a 20, it's a critical hit
- **Disadvantage:** If EITHER die shows a 1, it's a critical fumble

**Fix Steps:**
1. [x] Read `src/core/combat/AttackResolver.ts` lines 195-270
2. [x] Update critical hit and fumble detection to check both dice:
   ```typescript
   const d1 = this.rollDie(20);
   const d2 = this.rollDie(20);
   const hasAdvantage = // ... existing advantage logic ...
   const hasDisadvantage = // ... existing disadvantage logic ...

   // Check for crit on BOTH dice for advantage
   const crit = hasAdvantage
       ? (d1 === 20 || d2 === 20)
       : (d1 === 20);

   // Check for fumble on BOTH dice for disadvantage
   const fumble = hasDisadvantage
       ? (d1 === 1 || d2 === 1)
       : (d1 === 1);
   ```
3. [x] Add tests for all combinations (normal, advantage with 20 on d1, advantage with 20 on d2)
4. [x] Add tests for disadvantage fumble detection (1 on either die)
5. [x] Document the rules interpretation with Sage Advice reference

**Expected Outcome:** Players with advantage get correct critical hit detection, and players with disadvantage get correct fumble detection.

**Implementation Notes:**
- Updated `attackWithAdvantage()` to check `roll1 || roll2` for critical hits
- Updated `attackWithDisadvantage()` to check `roll1 || roll2` for critical misses
- Added 10 new test cases covering all combinations of advantage/disadvantage crit/fumble scenarios
- All 2109 tests pass (2099 + 10 new)
- JSDoc comments added to document the D&D 5e Sage Advice rules interpretation

---

### Task 5: Add Timeout to Audio URL Validation

**Severity:** MEDIUM
**Location:** `src/core/parser/PlaylistParser.ts:183-191`

**Issue:**
`validateAudioUrl()` fetch has no timeout - can hang indefinitely and freeze the application.

**Fix Steps:**
1. [x] Read `src/core/parser/PlaylistParser.ts` lines 180-195
2. [x] Add AbortController for timeout:
   ```typescript
   async validateAudioUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

       try {
           const response = await fetch(url, {
               signal: controller.signal,
               method: 'HEAD'
           });
           clearTimeout(timeoutId);
           return response.ok;
       } catch (error) {
           if (error.name === 'AbortError') {
               console.warn(`Audio URL validation timed out: ${url}`);
           }
           return false;
       }
   }
   ```
3. [x] Make timeout configurable
4. [x] Add test for timeout behavior
5. [x] Add test for valid URLs

**Expected Outcome:** Audio URL validation doesn't hang the application.

**Implementation Notes:**
- Added `audioUrlValidationTimeout` option to `PlaylistParserOptions` interface (default: 5000ms)
- Updated `validateAudioUrl()` to use AbortController with configurable timeout
- Properly cleans up timeout with `clearTimeout()` in both success and error cases
- Added 2 new test cases: timeout behavior and custom timeout value verification
- All 2111 tests pass (2109 + 2 new)

---

### Task 6: Incorrect Zero Check in MotionDetector

**Severity:** MEDIUM
**Location:** `src/core/sensors/MotionDetector.ts:50`

**Issue:**
```typescript
if (!acc.x || !acc.y || !acc.z) return 'unknown';
```
Treats 0 as falsy, but acceleration of 0 is valid for stationary devices.

**Fix Steps:**
1. [x] Read `src/core/sensors/MotionDetector.ts` lines 45-60
2. [x] Update condition to properly check for null/undefined:
   ```typescript
   if (acc.x == null || acc.y == null || acc.z == null) return 'unknown';
   ```
3. [x] Add test with acceleration values of exactly 0
4. [x] Add test with null/undefined values
5. [x] Document the valid range for acceleration values

**Expected Outcome:** Zero acceleration values are correctly processed.

**Implementation Notes:**
- Changed from truthy check `!acc.x` to explicit null check `acc.x == null`
- Added JSDoc comment clarifying that 0 is a valid acceleration value
- Added 3 new test cases covering zero values on all axes, partial zero values, and null/undefined handling
- All 2116 tests pass (2113 + 3 new)

---

## Phase 3: Medium Priority Fixes

### Task 7: Non-Deterministic Treasure Generation

**Severity:** MEDIUM
**Location:** `src/core/combat/CombatEngine.ts:449`

**Issue:**
```typescript
treasureAwarded: {
    gold: Math.floor(Math.random() * 100),  // Non-deterministic
    items: []
}
```
Inconsistent with the rest of the codebase which uses seeded RNG.

**Fix Steps:**
1. [ ] Read `src/core/combat/CombatEngine.ts` lines 440-460
2. [ ] Find how RNG is used elsewhere (likely `SeededRNG` from `src/utils/random.ts`)
3. [ ] Update to use seeded RNG:
   ```typescript
   import { SeededRNG } from '../../utils/random.js';

   private rng: SeededRNG;

   treasureAwarded: {
       gold: Math.floor(this.rng.random() * 100),
       items: []
   }
   ```
4. [ ] Add seed parameter to `awardTreasure()` method
5. [ ] Update tests to use fixed seeds for deterministic results

**Expected Outcome:** Treasure generation uses seeded RNG for reproducibility.

---

### Task 8: Direct Mutation of Options Object

**Severity:** MEDIUM
**Location:** `src/core/generation/CharacterGenerator.ts:315`

**Issue:**
```typescript
options.forceRace = detectedRace;  // Directly mutating parameter!
```

**Fix Steps:**
1. [ ] Read `src/core/generation/CharacterGenerator.ts` lines 305-325
2. [ ] Search for all callers to ensure no code depends on this mutation
3. [ ] Create a local variable:
   ```typescript
   const effectiveRace = detectedRace || options.forceRace;
   ```
4. [ ] Update all references to use the non-mutated version
5. [ ] Add JSDoc noting that options are not modified
6. [ ] Add test verifying options object is unchanged after call

**Expected Outcome:** Options object is never mutated.

---

### Task 9: Always-False Tropical Region Detection

**Severity:** MEDIUM
**Location:** `src/core/sensors/WeatherAPIClient.ts:773-776`

**Issue:**
```typescript
private isTropicalRegion(): boolean {
    return false;  // Always returns false!
}
```
Hurricane/typhoon detection depends on this working.

**Fix Steps:**
1. [ ] Read `src/core/sensors/WeatherAPIClient.ts` lines 770-790
2. [ ] Trace all callers to verify they have lat/lon data available
3. [ ] Update method signature to accept location:
   ```typescript
   private isTropicalRegion(lat: number, lon: number): boolean {
       // Tropical regions: roughly between 23.5°N and 23.5°S
       return Math.abs(lat) < 23.5;
   }
   ```
4. [ ] Update all callers to pass lat/lon coordinates
5. [ ] Add tests for various latitudes

**Expected Outcome:** Tropical regions correctly identified based on latitude.

---

### Task 10: Weather API Response Validation

**Severity:** MEDIUM
**Location:** `src/core/sensors/WeatherAPIClient.ts`

**Issue:**
API responses are used without schema validation.

**Fix Steps:**
1. [ ] Install Zod (already in dependencies)
2. [ ] Create schema file for Weather API responses:
   ```typescript
   // src/core/sensors/schemas/weather.schema.ts
   import { z } from 'zod';

   export const weatherResponseSchema = z.object({
       main: z.object({
           temp: z.number(),
           humidity: z.number(),
           pressure: z.number()
       }),
       weather: z.array(z.object({
           id: z.number(),
           main: z.string(),
           description: z.string()
       })),
       sys: z.object({
           sunrise: z.number(),
           sunset: z.number()
       })
   });
   ```
3. [ ] Add validation in WeatherAPIClient after API calls
4. [ ] Add test with malformed response

**Expected Outcome:** Weather API responses validated before use.

---

## Phase 4: Low Priority (Quick Wins)

### Task 11: Fix Typo in Feature ID

**Severity:** LOW
**Location:** `src/core/features/DefaultFeatures.ts:119`

**Issue:**
```typescript
persistant_rage  // Should be "persistent_rage"
```

**Fix Steps:**
1. [ ] Change `persistant_rage` to `persistent_rage`
2. [ ] Search codebase for any references to the typo
3. [ ] Verify no lookups break

**Expected Outcome:** Feature ID uses correct spelling.

---

### Task 12: Remove Duplicate `isAbility()` Function

**Severity:** LOW
**Locations:** `src/core/utils/AbilityConstants.ts` and `src/core/utils/EffectApplierUtils.ts:24-26`

**Issue:**
The same function exists in two files.

**Fix Steps:**
1. [ ] Read both implementations to ensure they're identical
2. [ ] Remove duplicate from `EffectApplierUtils.ts`
3. [ ] Add import in `EffectApplierUtils.ts`:
   ```typescript
   import { isAbility } from './AbilityConstants.js';
   ```

**Expected Outcome:** Single source of truth for ability validation.

---

### Task 13: Fix AttackResolver Type

**Severity:** LOW
**Location:** `src/core/combat/AttackResolver.ts:188`

**Issue:**
```typescript
character: any  // Should be CharacterSheet
```

**Fix Steps:**
1. [ ] Change `character: any` to `character: CharacterSheet`
2. [ ] Verify type is imported
3. [ ] Run TypeScript compiler to check for cascading type issues

**Expected Outcome:** Proper typing for character parameter.

**Note:** Do NOT remove `any` from ExtensionManager or EquipmentValidator - those are intentional.

---

## Implementation Checklist

### Phase 1: Critical Breaking Bugs
- [x] Task 1: Fix FeatureValidator ESM incompatibility
- [x] Task 2: Fix CombatEngine ESM incompatibility

### Phase 2: High Priority
- [x] Task 3: Infinite recursion in SpellValidator
- [x] Task 4: Critical hit with advantage logic
- [x] Task 5: Audio URL validation timeout
- [x] Task 6: Incorrect zero check in MotionDetector

### Phase 3: Medium Priority
- [ ] Task 7: Non-deterministic treasure generation
- [ ] Task 8: Direct mutation of options object
- [ ] Task 9: Tropical region detection
- [ ] Task 10: Weather API response validation

### Phase 4: Low Priority
- [ ] Task 11: Fix typo in feature ID
- [ ] Task 12: Remove duplicate isAbility()
- [ ] Task 13: Fix AttackResolver type

---

## Summary

**Total tasks:** 13

**Estimated effort:** 8-16 hours

**Work through phases in order.** Each phase should be completed before moving to the next. Tasks within a phase can be completed in any order.
