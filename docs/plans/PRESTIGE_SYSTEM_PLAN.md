# Track Mastery Prestige System - Implementation Plan

## Overview

Add a **Prestige System** to track mastery that allows players to reset their character after mastering a track in exchange for a visual badge upgrade. Uses 1.5x scaling per prestige level for both plays AND XP requirements.

**Mastery Requirements (Dual System):**
- Must meet BOTH plays AND XP thresholds to unlock mastery
- Base: 10 plays + 1,000 XP
- 1.5x scaling per prestige level (more obtainable)

**Key Features:**
- 10 prestige levels (Roman numerals I-X)
- 1.5x scaling for plays: Prestige 0=10, I=15, II=22, III=33, IV=50, V=75, VI=113, VII=170, VIII=255, IX=383, X=574
- 1.5x scaling for XP: Prestige 0=1,000, I=1,500, II=2,250, III=3,375, IV=5,062, V=7,593, VI=11,390, VII=17,085, VIII=25,628, IX=38,442, X=57,664
- Dual requirement prevents "cheesing" (play/pause spam) since XP requires actual engagement
- Reset on prestige: level→1, XP→0, stats reset, listen count→0
- Keep: equipment only
- Rewards: Bragging rights (visual badge enhancements only)

---

## Files to Create

### Engine (playlist-data-engine)

| File | Purpose |
|------|---------|
| `src/core/types/Prestige.ts` | PrestigeLevel type, PRESTIGE_ROMAN_NUMERALS, PrestigeInfo, PrestigeResult interfaces |
| `src/core/progression/PrestigeSystem.ts` | Core prestige logic: getMasteryThreshold(), isMastered(), canPrestige(), getPrestigeInfo() |
| `tests/unit/prestige.test.ts` | Unit tests for PrestigeSystem |

### Showcase (playlist-data-showcase)

| File | Purpose |
|------|---------|
| `src/components/ui/PrestigeButton.tsx` | Button to trigger prestige (shows when eligible) |
| `src/components/ui/PrestigeConfirmationModal.tsx` | Confirmation dialog explaining reset |
| `src/components/ui/PrestigeButton.css` | Styles for prestige button and modal |

---

## Files to Modify

### Engine

| File | Changes |
|------|---------|
| `src/core/types/Character.ts` | Add `prestige_level?: PrestigeLevel` to CharacterSheet |
| `src/core/progression/MasterySystem.ts` | Make mastery checking prestige-aware (add prestigeLevel param) |
| `src/core/progression/SessionTracker.ts` | Add `clearTrackSessions(trackUuid)` and `getTrackXPTotal(trackUuid)` methods |
| `src/core/progression/CharacterUpdater.ts` | Add `resetCharacterForPrestige(character)` method |
| `src/index.ts` | Export new prestige types and PrestigeSystem |
| `DATA_ENGINE_REFERENCE.md` | Document PrestigeSystem, PrestigeLevel type, new CharacterSheet field, new methods |
| `USAGE_IN_OTHER_PROJECTS.md` | Add usage examples for prestige system integration |

### Showcase

| File | Changes |
|------|---------|
| `src/store/sessionStore.ts` | Add `clearTrackSessions(trackUuid)` action |
| `src/store/characterStore.ts` | Add `prestigeCharacter(characterId)` action |
| `src/hooks/useMastery.ts` | Make MasteryInfo prestige-aware, add prestigeLevel param |
| `src/components/ui/MasteryBadge.tsx` | Add prestigeLevel prop, show Roman numerals |
| `src/components/ui/MasteryBadge.css` | Add prestige-specific visual styles (glow, rainbow for max) |
| `src/components/Tabs/SessionTrackingTab.tsx` | Add PrestigeButton when character can prestige |
| `src/types/index.ts` | Export PrestigeLevel, PrestigeInfo, PrestigeResult |

---

## Implementation Details

### 1. New Types (`src/core/types/Prestige.ts`)

```typescript
export type PrestigeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const PRESTIGE_ROMAN_NUMERALS: Record<PrestigeLevel, string> = {
  0: '', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
};

export const MAX_PRESTIGE_LEVEL = 10;
export const BASE_PLAYS_THRESHOLD = 10;      // Base plays required
export const BASE_XP_THRESHOLD = 1000;       // Base XP required
export const PRESTIGE_SCALING_FACTOR = 1.5;  // Scaling multiplier per level

// Custom thresholds for overriding defaults
export interface CustomThresholds {
  playsThreshold?: number | null;
  xpThreshold?: number | null;
}

export interface PrestigeInfo {
  prestigeLevel: PrestigeLevel;
  currentPlays: number;
  currentXP: number;
  playsThreshold: number;
  xpThreshold: number;
  playsProgress: number;  // 0-1
  xpProgress: number;     // 0-1
  isMastered: boolean;
  canPrestige: boolean;
  isMaxPrestige: boolean;
}

export interface PrestigeResult {
  success: boolean;
  newPrestigeLevel: PrestigeLevel;
  previousPrestigeLevel: PrestigeLevel;
  message: string;
}

// Type guard and helper functions
export function isPrestigeLevel(value: unknown): value is PrestigeLevel;
export function toPrestigeLevel(value: number): PrestigeLevel;
```

### 2. PrestigeSystem Class

```typescript
export class PrestigeSystem {
  private static customThresholds: Map<PrestigeLevel, CustomThresholds> = new Map();

  // === Threshold Calculations ===

  // Default 1.5x scaling for plays: 10, 15, 22, 33, 50, 75, 113, 170, 255, 383, 574
  static getPlaysThreshold(prestigeLevel: PrestigeLevel): number

  // Default 1.5x scaling for XP: 1000, 1500, 2250, 3375, 5062, 7593, 11390, 17085, 25628, 38442, 57664
  static getXPThreshold(prestigeLevel: PrestigeLevel): number

  // === Custom Threshold Management ===

  // Set custom thresholds for a prestige level (null = use calculated, omit = keep existing)
  static setCustomThresholds(prestigeLevel: PrestigeLevel, thresholds: CustomThresholds): void

  // Clear custom thresholds for specific level or all levels
  static clearCustomThresholds(prestigeLevel?: PrestigeLevel): void

  // Check if custom thresholds exist for a level
  static hasCustomThresholds(prestigeLevel: PrestigeLevel): boolean

  // Get custom thresholds for a level (undefined if none set)
  static getCustomThresholds(prestigeLevel: PrestigeLevel): CustomThresholds | undefined

  // === Mastery Checking ===

  // Must meet BOTH plays AND XP thresholds
  static isMastered(listenCount: number, totalXP: number, prestigeLevel: PrestigeLevel): boolean

  // Check if character can prestige (mastered AND not at max level)
  static canPrestige(prestigeLevel: PrestigeLevel, listenCount: number, totalXP: number): boolean

  // Get complete prestige info for UI display
  static getPrestigeInfo(prestigeLevel: PrestigeLevel, listenCount: number, totalXP: number): PrestigeInfo

  // === Utility Methods ===

  // Convert prestige level to Roman numeral
  static toRomanNumeral(level: PrestigeLevel): string

  // Get next prestige level (null if at max)
  static getNextPrestigeLevel(currentLevel: PrestigeLevel): PrestigeLevel | null

  // Create success/failure result objects
  static createSuccessResult(previousLevel: PrestigeLevel, newLevel: PrestigeLevel): PrestigeResult
  static createFailureResult(reason: string, currentLevel: PrestigeLevel): PrestigeResult

  // Get all threshold values for display/debugging
  static getAllThresholds(): Array<{ level: PrestigeLevel; plays: number; xp: number }>
}
```

### 3. CharacterSheet Extension

```typescript
export interface CharacterSheet {
  // ... existing fields ...
  prestige_level?: PrestigeLevel;  // 0-10, defaults to 0
}
```

### 4. CharacterUpdater.resetCharacterForPrestige()

This is the main **prestige execution function** that handles the full prestige operation:

```typescript
public resetCharacterForPrestige(
  character: CharacterSheet,
  sessionTracker: SessionTracker
): PrestigeResult {
  // 1. Validate: Check can prestige (not at max, meets thresholds)
  // 2. Preserve equipment
  // 3. Clear track sessions (calls sessionTracker.clearTrackSessions(trackUuid))
  // 4. Regenerate base level 1 character from seed
  // 5. Restore equipment
  // 6. Re-apply equipment effects
  // 7. Increment prestige_level
  // 8. Return result with success/failure info
}
```

### 5. SessionTracker.clearTrackSessions()

Clears all listening sessions for a specific track (resets play count to 0):

```typescript
public clearTrackSessions(trackUuid: string): number {
  const initialLength = this.sessionHistory.length;
  this.sessionHistory = this.sessionHistory.filter(s => s.track_uuid !== trackUuid);
  return initialLength - this.sessionHistory.length;
}
```

### 6. Track XP Tracking (New)

Since XP is character-level but prestige requires track-level XP, we need to track XP earned per track:

**Option A: Sum XP from sessions** (Recommended)
- Each `ListeningSession` has `xp_earned` field
- Add `getTrackXPTotal(trackUuid)` method to SessionTracker
- Sum all `xp_earned` for sessions matching trackUuid

```typescript
// In SessionTracker
public getTrackXPTotal(trackUuid: string): number {
  return this.sessionHistory
    .filter(s => s.track_uuid === trackUuid)
    .reduce((total, s) => total + (s.xp_earned || 0), 0);
}
```

### 7. MasteryBadge Updates

- Add `prestigeLevel?: PrestigeLevel` prop
- Show Roman numeral for prestiged badges
- Add prestige-specific CSS classes for visual effects:
  - Prestige I-III: Purple glow
  - Prestige IV-VI: Enhanced purple pulse
  - Prestige VII-IX: Pink/purple gradient
  - Prestige X (max): Rainbow legendary effect

---

## Verification Plan

### Unit Tests
1. `PrestigeSystem.getPlaysThreshold()` - verify 1.5x scaling (10, 15, 22, 33, 50, 75, 113, 170, 255, 383, 574)
2. `PrestigeSystem.getXPThreshold()` - verify 1.5x scaling (1000, 1500, 2250, 3375, 5062, 7593, 11390, 17085, 25628, 38442, 57664)
3. `PrestigeSystem.setCustomThresholds()` - verify custom thresholds override defaults
4. `PrestigeSystem.clearCustomThresholds()` - verify reverting to defaults
5. `PrestigeSystem.hasCustomThresholds()` - verify checking if custom thresholds exist
6. `PrestigeSystem.getCustomThresholds()` - verify retrieving custom thresholds
7. `PrestigeSystem.isMastered()` - test dual requirement (must meet BOTH plays AND XP)
8. `PrestigeSystem.canPrestige()` - test mastered + max level logic with dual requirements
9. `PrestigeSystem.getPrestigeInfo()` - verify complete info object with progress
10. `PrestigeSystem.toRomanNumeral()` - verify all Roman numeral conversions
11. `PrestigeSystem.getNextPrestigeLevel()` - verify next level calculation and max handling
12. `PrestigeSystem.createSuccessResult()` / `createFailureResult()` - verify result factories
13. `PrestigeSystem.getAllThresholds()` - verify all threshold values returned
14. `isPrestigeLevel()` - verify type guard for valid and invalid values
15. `toPrestigeLevel()` - verify clamping and flooring behavior
16. `SessionTracker.getTrackXPTotal()` - verify XP summing from sessions (Phase 2)
17. `CharacterUpdater.resetCharacterForPrestige()` - verify full prestige flow (Phase 2)
18. `SessionTracker.clearTrackSessions()` - verify selective clearing (Phase 2)

### Dual Requirement Edge Cases
1. Has enough plays but not enough XP → NOT mastered
2. Has enough XP but not enough plays → NOT mastered
3. Has both enough plays AND XP → mastered
4. Verify "cheese prevention" - can't just play/pause to get mastery

### Integration Tests
1. Full prestige flow: master track (plays + XP) → prestige → verify reset → verify new thresholds
2. Listen count reset verification after prestige
3. XP reset verification after prestige
4. Equipment preservation after prestige

### Manual Testing
1. Generate character, listen to track until 10 plays + 1,000 XP, verify prestige button appears
2. Test edge case: 10 plays but only 500 XP → no prestige button
3. Click prestige, confirm in modal, verify character resets to level 1
4. Verify equipment is preserved
5. Listen until 15 plays + 1,500 XP, verify second prestige available
6. Progress to max prestige X (574 plays + 57,664 XP), verify rainbow badge effect

---

## Implementation Order

**Phase 1: Engine Types & Core** (Day 1) ✅ COMPLETE
- [x] Create `src/core/types/Prestige.ts`
- [x] Add `prestige_level` to CharacterSheet
- [x] Create `src/core/progression/PrestigeSystem.ts`
- [x] Add unit tests for PrestigeSystem

**Phase 2: Engine Integration** (Day 1-2) ✅ COMPLETE
- [x] Update MasterySystem with prestige support
- [x] Add `clearTrackSessions()` and `getTrackXPTotal()` to SessionTracker
- [x] Add `resetCharacterForPrestige()` to CharacterUpdater
- [x] Update engine exports

**Phase 3: Showcase Stores** (Day 2) ✅ COMPLETE
- [x] Update sessionStore with `clearTrackSessions()` and `getTrackXPTotal()`
- [x] Update characterStore with `prestigeCharacter()`, `canPrestige()`, `getPrestigeInfo()`
- [x] Update useMastery hook with prestige-aware `getMasteryInfo(trackId, prestigeLevel)`, `getTrackXP()`, `getEnginePrestigeInfo()`
- [x] Update types/index.ts to export prestige types and PrestigeSystem class

**Phase 4: UI Components** (Day 2-3) ✅ COMPLETE
- [x] Update MasteryBadge with prestige visuals
- [x] Create PrestigeButton component
- [x] Create PrestigeConfirmationModal
- [x] Integrate into SessionTrackingTab

**Phase 5: Documentation** (Day 3) ✅ COMPLETE
- [x] Update `DATA_ENGINE_REFERENCE.md` with:
  - **Style Guide**: Use tables with "Returns" and "Description" columns, not raw TypeScript interfaces. Use italicized location links like `*[src/path/file.ts](src/path/file.ts)*`. Focus on purpose, link to source for complete definitions.
  - **Types:**
    - `PrestigeLevel` type (0-10 union type)
    - `PRESTIGE_ROMAN_NUMERALS` constant
    - `MAX_PRESTIGE_LEVEL`, `BASE_PLAYS_THRESHOLD`, `BASE_XP_THRESHOLD`, `PRESTIGE_SCALING_FACTOR` constants
    - `CustomThresholds` interface
    - `PrestigeInfo` interface
    - `PrestigeResult` interface
    - `isPrestigeLevel()` type guard function
    - `toPrestigeLevel()` helper function
  - **CharacterSheet field:**
    - `prestige_level?: PrestigeLevel`
  - **PrestigeSystem class methods:**
    - `getPlaysThreshold(prestigeLevel)` - 1.5x scaling
    - `getXPThreshold(prestigeLevel)` - 1.5x scaling
    - `setCustomThresholds(prestigeLevel, thresholds)` - override defaults
    - `clearCustomThresholds(prestigeLevel?)` - revert to defaults
    - `hasCustomThresholds(prestigeLevel)` - check if custom exists
    - `getCustomThresholds(prestigeLevel)` - get custom thresholds
    - `isMastered(listenCount, totalXP, prestigeLevel)` - dual requirement check
    - `canPrestige(prestigeLevel, listenCount, totalXP)` - eligibility check
    - `getPrestigeInfo(prestigeLevel, listenCount, totalXP)` - complete info for UI
    - `toRomanNumeral(level)` - convert to Roman numeral
    - `getNextPrestigeLevel(currentLevel)` - get next level
    - `createSuccessResult(previousLevel, newLevel)` - success result factory
    - `createFailureResult(reason, currentLevel)` - failure result factory
    - `getAllThresholds()` - all threshold values
  - **SessionTracker methods (Phase 2):**
    - `clearTrackSessions(trackUuid)` - clear sessions for a track
    - `getTrackXPTotal(trackUuid)` - sum XP for a track
  - **CharacterUpdater method (Phase 2):**
    - `resetCharacterForPrestige(character, sessionTracker)` - execute prestige
- [x] Update `USAGE_IN_OTHER_PROJECTS.md` with:
  - Example: Checking if character can prestige
  - Example: Executing prestige and handling result
  - Example: Displaying prestige-aware mastery badges
  - Example: Setting custom thresholds for special cases

**Phase 6: Testing** (Day 3) ✅ COMPLETE
- [x] Integration tests (16 tests in `tests/integration/prestige.integration.test.ts`)
- [x] Manual end-to-end testing checklist created
- [ ] Visual verification of badge effects (requires running showcase app)

---

## Manual Testing Checklist

### Prerequisites
1. Start the showcase app: `cd ../playlist-data-showcase && npm run dev`
2. Have a test track ready for listening sessions

### Test Cases

#### Basic Prestige Flow
1. [ ] Generate character, listen to track until 10 plays + 1,000 XP
2. [ ] Verify prestige button appears in SessionTrackingTab
3. [ ] Click prestige, confirm in modal
4. [ ] Verify character resets to level 1
5. [ ] Verify equipment is preserved
6. [ ] Verify prestige badge shows "I"

#### Edge Cases
1. [ ] Test edge case: 10 plays but only 500 XP → no prestige button
2. [ ] Test edge case: 500 XP but only 5 plays → no prestige button
3. [ ] Listen until 15 plays + 1,500 XP, verify second prestige available
4. [ ] Verify track progress resets after prestiging

#### Visual Verification
1. [ ] Prestige I-III: Purple glow on mastery badge
2. [ ] Prestige IV-VI: Enhanced purple pulse on mastery badge
3. [ ] Prestige VII-IX: Pink/purple gradient on mastery badge
4. [ ] Prestige X (max): Rainbow legendary effect on mastery badge

### Integration Tests Summary

Created `tests/integration/prestige.integration.test.ts` with 16 tests covering:

1. **Full Prestige Flow** (2 tests)
   - Complete prestige flow: master track → prestige → verify reset
   - Multiple prestige levels progression

2. **Listen Count Reset** (2 tests)
   - Reset to 0 after prestige
   - Only clears prestiged track (not other tracks)

3. **XP Reset** (2 tests)
   - Track XP resets to 0 after prestige
   - Correct XP summing from multiple sessions

4. **Equipment Preservation** (2 tests)
   - All equipment slots preserved after prestige
   - Handles character without equipment gracefully

5. **Dual Requirements** (3 tests)
   - Enough plays but insufficient XP → no prestige
   - Enough XP but insufficient plays → no prestige
   - Cheesing prevention (play/pause spam doesn't work)

6. **Max Prestige Level** (1 test)
   - Cannot prestige beyond level 10

7. **CharacterUpdater Methods** (2 tests)
   - canPrestige() works correctly
   - getPrestigeInfo() returns correct info

8. **Character Regeneration** (2 tests)
   - Same class/race from seed after prestige
   - Character name preserved after prestige
