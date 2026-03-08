# DATA_ENGINE_REFERENCE.md Code Example Cleanup Plan

## Overview

Remove redundant code examples from DATA_ENGINE_REFERENCE.md that violate style guide convention #7 ("No code examples or implementation code blocks"). Each code block must be checked against other documentation files before removal to ensure examples exist elsewhere.

**Style Guide Convention #7:** Usage examples belong in `USAGE_IN_OTHER_PROJECTS.md`, algorithm details belong in specialized guides like `docs/AUDIO_ANALYSIS.md`.

**Target Files for Cross-Reference:**
- `USAGE_IN_OTHER_PROJECTS.md` — Primary location for usage examples
- `docs/AUDIO_ANALYSIS.md` — Beat detection, audio processing, GrooveAnalyzer
- `docs/BEAT_DETECTION.md` — Beat maps, rhythm game timing
- `docs/XP_AND_STATS.md` — Progression, XP, stats, RhythmXPCalculator
- `docs/EQUIPMENT_SYSTEM.md` — Equipment, enchantments, BoxOpener
- `docs/EXTENSIBILITY_GUIDE.md` — ExtensionManager, custom content
- `docs/COMBAT_SYSTEM.md` — Combat examples

---

## Phase 1: Beat Detection / Audio Analysis Code Blocks (9 blocks)

> **📋 PRIMARY TARGET DOC:** `docs/AUDIO_ANALYSIS.md`
>
> **ALL beat detection and audio analysis code goes here.** This includes: GrooveAnalyzer formulas, BeatInterpolator, BeatSubdivider, reapplyDownbeatConfig, OSE parameters, subdivision playback, unifyBeatMap, subdivideBeatMap, SubdivisionPlaybackController, and any rhythm-related code.
>
> **Check first:** `docs/AUDIO_ANALYSIS.md`
> **Also check:** `USAGE_IN_OTHER_PROJECTS.md` (for integration examples)
>
> **Action if found:** Remove from reference, ensure cross-reference link exists
> **Action if NOT found:** Move to `docs/AUDIO_ANALYSIS.md`, add cross-reference in reference

### Task 1.1: GrooveAnalyzer Formulas (Lines 1722-1746)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "quadratic falloff", "consistency calculation", "BPM-aware window", "pocket", "groove", "hotness"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md at lines 3354-3369 (BPM-aware) and 3373-3385 (Consistency)
- [x] **Execute:** Removed code blocks, added cross-reference link to AUDIO_ANALYSIS.md

**Summary:** Both code blocks were already documented in AUDIO_ANALYSIS.md. Removed the TypeScript code blocks and replaced with cross-reference: "**For detailed formulas (BPM-aware window calculation, consistency quadratic falloff) and examples:** See [docs/AUDIO_ANALYSIS.md#groove-meter](docs/AUDIO_ANALYSIS.md#groove-meter)"

---

### Task 1.2: reapplyDownbeatConfig Example (Lines 1892-1910)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "reapplyDownbeatConfig", "downbeat", "measure"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 19-line usage example for reapplyDownbeatConfig

---

### Task 1.3: BeatInterpolator Example (Lines 1963-1997)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "BeatInterpolator", "interpolate", "gap", "anchor"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 35-line usage example for BeatInterpolator

---

### Task 1.4: BeatSubdivider Example (Lines 2068-2111)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "BeatSubdivider", "subdivide", "subdivision", "eighth", "triplet"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 43-line usage example for BeatSubdivider with SubdivisionConfig

---

### Task 1.5: unifyBeatMap Example (Lines 2157-2174)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "unifyBeatMap", "UnifiedBeatMap"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 17-line usage example for unifyBeatMap

---

### Task 1.6: subdivideBeatMap Example (Lines 2204-2225)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "subdivideBeatMap"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 21-line usage example for subdivideBeatMap convenience function

---

### Task 1.7: SubdivisionPlaybackController Example (Lines 2304-2366)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "SubdivisionPlaybackController", "practice mode", "playback"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 62-line usage example for SubdivisionPlaybackController (LARGEST BLOCK)

---

### Task 1.8: OSE Parameter Modes Example (Lines 2491-2514)
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "hopSize", "melBands", "gaussianSmooth", "OSE", "hop size", "mel bands"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to AUDIO_ANALYSIS.md
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 23-line usage example for OSE parameter mode configuration

---

### Task 1.9: Fix BeatSubdivider Methods Table (Lines 2044-2046)
- [ ] **Verify** the methods table is missing "Returns" column
- [ ] **Fix:** Add "Returns" column to match style guide convention #5
- [ ] **Execute:** Update table format

**Current (incorrect):**
```markdown
| Method | Description |
|--------|-------------|
| `subdivide(...)` | ... |
```

**Should be:**
```markdown
| Method | Returns | Description |
|--------|---------|-------------|
| `subdivide(...)` | `SubdividedBeatMap` | ... |
```

---

## Phase 2: Progression System Code Blocks (6 blocks)

> **📋 PRIMARY TARGET DOC:** `docs/XP_AND_STATS.md`
>
> All session tracking, XP calculation, experience system, rhythm XP, and game mode configuration examples belong in XP_AND_STATS.md.
>
> **Check first:** `docs/XP_AND_STATS.md`
> **Also check:** `USAGE_IN_OTHER_PROJECTS.md` (for integration examples)
> **If not found, check ALL docs:** `docs/PROGRESSION.md`, `docs/AUDIO_ANALYSIS.md` (rhythm XP)
>
> **Action if found:** Remove from reference, ensure cross-reference link exists
> **Action if NOT found:** Move to `docs/XP_AND_STATS.md`, add cross-reference in reference

### Task 2.1: ISessionTracker Interface (Lines 2584-2590)
- [ ] **Search** `docs/XP_AND_STATS.md` for "ISessionTracker", "session tracker interface"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the raw interface

**Code to check:** 6-line raw TypeScript interface for ISessionTracker

---

### Task 2.2: Zustand Adapter Example (Lines 2593-2604)
- [ ] **Search** `docs/XP_AND_STATS.md` for "Zustand", "adapter"
- [ ] **Search** `USAGE_IN_OTHER_PROJECTS.md` for "Zustand", "adapter"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 11-line Zustand adapter usage example

---

### Task 2.3: ListeningSession Interface (Lines 2612-2625)
- [ ] **Search** `docs/XP_AND_STATS.md` for "ListeningSession"
- [ ] **Decision:** Raw interface - should be described in table format per style guide
- [ ] **Execute:** Convert to table format or remove if redundant

**Code to check:** 13-line raw TypeScript interface

---

### Task 2.4: ExperienceSystem Interface (Lines 2648-2672)
- [ ] **Search** `docs/XP_AND_STATS.md` for "ExperienceSystem"
- [ ] **Decision:** Raw interface - should be described in table format per style guide
- [ ] **Execute:** Convert to table format or remove if redundant

**Code to check:** 24-line raw TypeScript interface

---

### Task 2.5: RhythmXPCalculator Examples (Lines 3006-3075)
- [ ] **Search** `docs/XP_AND_STATS.md` for "RhythmXPCalculator", "rhythm XP", "button press"
- [ ] **Search** `docs/AUDIO_ANALYSIS.md` for "rhythm XP"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the code blocks

**Code to check:**
- Lines 3006-3027: DEFAULT_RHYTHM_XP_CONFIG (21 lines)
- Lines 3043-3056: Stateless Usage example (13 lines)
- Lines 3060-3075: Stateful Session Tracking example (15 lines)

---

### Task 2.6: Game Mode Configuration Example (Lines 3162-3178)
- [ ] **Search** `docs/XP_AND_STATS.md` for "gameMode", "standard", "uncapped"
- [ ] **Search** `USAGE_IN_OTHER_PROJECTS.md` for "gameMode"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 16-line usage example for game mode configuration

---

## Phase 3: Equipment System Code Blocks (4 blocks)

> **📋 PRIMARY TARGET DOC:** `docs/EQUIPMENT_SYSTEM.md`
>
> All BoxOpener, enchantment, curse, equipment modification, and magic item examples belong in EQUIPMENT_SYSTEM.md.
>
> **Check first:** `docs/EQUIPMENT_SYSTEM.md`
> **Also check:** `USAGE_IN_OTHER_PROJECTS.md` (for integration examples)
>
> **Action if found:** Remove from reference, ensure cross-reference link exists
> **Action if NOT found:** Move to `docs/EQUIPMENT_SYSTEM.md`, add cross-reference in reference

### Task 3.1: BoxOpener Example (Lines 4366-4395)
- [ ] **Search** `docs/EQUIPMENT_SYSTEM.md` for "BoxOpener", "box", "open"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 30-line usage example for BoxOpener with locked chests

---

### Task 3.2: Stat Boosting Enchantment Functions (Lines 4540-4547)
- [ ] **Search** `docs/EQUIPMENT_SYSTEM.md` for "createStrengthEnchantment", "enchantment"
- [ ] **Decision:** Function signatures - minimal, may be acceptable. Check if table format would be better.
- [ ] **Execute:** Convert to table or keep as minimal signature

**Code to check:** 7 lines of function signatures

---

### Task 3.3: Enchantment Query Functions (Lines 4553-4568)
- [ ] **Search** `docs/EQUIPMENT_SYSTEM.md` for "getEnchantment", "getCurse", "query"
- [ ] **Decision:** Function signatures - minimal, may be acceptable. Check if table format would be better.
- [ ] **Execute:** Convert to table or keep as minimal signature

**Code to check:** 15 lines of function signatures with comments

---

### Task 3.4: Enchantment Usage Example (Lines 4572-4600)
- [ ] **Search** `docs/EQUIPMENT_SYSTEM.md` for "WEAPON_ENCHANTMENTS", "EquipmentModifier.enchant"
- [ ] **Search** `USAGE_IN_OTHER_PROJECTS.md` for "enchantment", "EquipmentModifier"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 28-line usage example for applying enchantments and curses

---

## Phase 4: Extensibility System Code Blocks (1 block)

> **📋 PRIMARY TARGET DOC:** `docs/EXTENSIBILITY_GUIDE.md`
>
> All ExtensionManager, batch image operations, custom content registration, and extensibility examples belong in EXTENSIBILITY_GUIDE.md.
>
> **Check first:** `docs/EXTENSIBILITY_GUIDE.md`
> **Also check:** `docs/CUSTOM_CONTENT.md` (for race/class examples), `docs/CONTENT_PACKS.md` (for pack examples)
>
> **Action if found:** Remove from reference, ensure cross-reference link exists
> **Action if NOT found:** Move to `docs/EXTENSIBILITY_GUIDE.md`, add cross-reference in reference

### Task 4.1: Batch Image Methods Example (Lines 4906-4933)
- [ ] **Search** `docs/EXTENSIBILITY_GUIDE.md` for "batchAddIcons", "batchUpdateImages", "batchByCategory"
- [ ] **Decision:** If found → Remove from reference; If not found → Move to appropriate doc
- [ ] **Execute:** Remove or relocate the code block

**Code to check:** 27-line usage example for batch image methods

---

## Phase 5: Final Cleanup

> **📋 CHECK ALL DOCS:** For any code blocks that don't clearly fit Phases 1-4, search ALL documentation files.
>
> **Full doc list to search:**
> ```
> USAGE_IN_OTHER_PROJECTS.md
> docs/AUDIO_ANALYSIS.md
> docs/BEAT_DETECTION.md
> docs/XP_AND_STATS.md
> docs/EQUIPMENT_SYSTEM.md
> docs/EXTENSIBILITY_GUIDE.md
> docs/COMBAT_SYSTEM.md
> docs/ENEMY_GENERATION.md
> docs/IRL_SENSORS.md
> docs/PREREQUISITES.md
> docs/CUSTOM_CONTENT.md
> docs/CONTENT_PACKS.md
> docs/ROLLS_AND_SEEDS.md
> ```
>
> **Decision process for orphan blocks:**
> 1. Identify the PRIMARY topic of the code block
> 2. Search the most relevant doc file first (see phase mappings above)
> 3. If not found, search `USAGE_IN_OTHER_PROJECTS.md` (catches integration examples)
> 4. If still not found, decide: move to most relevant doc OR leave as minimal reference (case-by-case)

### Task 5.1: Review All Changes
- [ ] Re-read DATA_ENGINE_REFERENCE.md to verify all code blocks removed
- [ ] Verify cross-references point to correct locations
- [ ] Check that no essential information was lost
- [ ] Run grep to confirm no ` ```typescript ` blocks remain (except minimal signatures)

### Task 5.2: Update Style Guide (Already Done)
- [x] Convention #7 added: "No code examples or implementation code blocks"

---

## Summary

| Phase | Task Count | Code Blocks | Notes |
|-------|------------|-------------|-------|
| Phase 1 | 9 | 8 blocks + 1 table fix | Beat Detection / Audio Analysis |
| Phase 2 | 6 | 6 blocks | Progression System |
| Phase 3 | 4 | 4 blocks | Equipment System |
| Phase 4 | 1 | 1 block | Extensibility |
| Phase 5 | 2 | N/A | Final review |

**Total:** 22 code blocks + 1 table fix across 22 tasks

---

## Execution Order

1. **Start with Phase 1** (largest category, most likely to have existing docs)
2. **Then Phase 2** (XP_AND_STATS.md is well-organized)
3. **Then Phase 3** (EQUIPMENT_SYSTEM.md is comprehensive)
4. **Then Phase 4** (single block)
5. **End with Phase 5** (verification)

---

## Decision Matrix

For each code block:

| Found in Docs? | Action |
|----------------|--------|
| Yes, identical | Remove from reference, add cross-reference if not present |
| Yes, similar | Remove from reference |
| No | Move to appropriate doc file, add cross-reference in reference |
| Raw interface | Convert to table format per style guide convention #3 |

---

## Dependencies

- Read access to all documentation files
- Edit access to DATA_ENGINE_REFERENCE.md
- Edit access to target doc files (if examples need to be moved)

## Questions/Unknowns

- Some raw interfaces may need to stay as minimal signatures - verify each case
- Constructor signatures were deemed acceptable in earlier discussion - verify this is correct
