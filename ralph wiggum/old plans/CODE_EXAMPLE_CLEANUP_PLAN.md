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
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "reapplyDownbeatConfig", "downbeat", "measure"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md at lines 1581-1673 (full section with multiple examples)
- [x] **Execute:** Removed code block from reference, added cross-reference link

**Summary:** The reapplyDownbeatConfig example was already well-documented in AUDIO_ANALYSIS.md with multiple usage examples (default, 3/4 waltz, time signature changes, pickup beats). Removed the 19-line code block from DATA_ENGINE_REFERENCE.md and added cross-reference: "**For usage examples:** See [docs/AUDIO_ANALYSIS.md#downbeat-configuration](docs/AUDIO_ANALYSIS.md#downbeat-configuration)"

---

### Task 1.3: BeatInterpolator Example (Lines 1963-1997)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "BeatInterpolator", "interpolate", "gap", "anchor"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md with comprehensive examples (basic, one-step, detected vs merged, BeatStream, custom options, serialization)
- [x] **Execute:** Removed code block, added cross-reference link

**Summary:** The 35-line BeatInterpolator usage example was redundant. AUDIO_ANALYSIS.md has comprehensive documentation including: Basic Interpolation with Defaults, One-Step Generation + Interpolation, Accessing Detected vs Merged Streams, Using Merged Beats with BeatStream, Customizing Options (with all options explained), and Serialization. Removed the code block and added cross-reference: "**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-interpolation](docs/AUDIO_ANALYSIS.md#beat-interpolation)"

---

### Task 1.4: BeatSubdivider Example (Lines 2068-2111)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "BeatSubdivider", "subdivide", "subdivision", "eighth", "triplet"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md with comprehensive documentation at lines 2098+ (basic subdivision, per-beat config, all subdivision types, BeatStream integration, real-time subdivision playground)
- [x] **Execute:** Removed code block, added cross-reference link

**Summary:** The 43-line BeatSubdivider usage example was redundant. AUDIO_ANALYSIS.md has extensive documentation including: Basic Subdivision, Per-Beat Configuration, Using BeatSubdivider Directly (with full pipeline example), Subdivision Types Reference, Detected Beat Tracking, Tempo-Aware Subdivision, Validation, BeatStream Integration, Runtime Subdivision Switching, and Real-Time Subdivision Playground. Removed the code block and added cross-reference: "**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-subdivision](docs/AUDIO_ANALYSIS.md#beat-subdivision)"

---

### Task 1.5: unifyBeatMap Example (Lines 2157-2174)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "unifyBeatMap", "UnifiedBeatMap"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md at lines 2624-2632 (utility function example) and 2206-2248 (comprehensive pipeline example)
- [x] **Execute:** Removed code block, added cross-reference link

**Summary:** The 17-line usage example was redundant. AUDIO_ANALYSIS.md has both a minimal utility function example and a comprehensive pipeline example showing `unifyBeatMap` in context. Removed the code block and added cross-reference: "**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-subdivision](docs/AUDIO_ANALYSIS.md#beat-subdivision)"

---

### Task 1.6: subdivideBeatMap Example (Lines 2204-2225)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "subdivideBeatMap"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md with comprehensive examples (convenience function, pipeline, runtime switching)
- [x] **Execute:** Removed code block, added cross-reference link

**Summary:** The 21-line subdivideBeatMap usage example was redundant. AUDIO_ANALYSIS.md has comprehensive documentation including: convenience function example (lines 2634-2642), comprehensive pipeline example (lines 2665-2682), and runtime subdivision switching example (lines 2715-2729). Removed the code block and added cross-reference: "**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-subdivision](docs/AUDIO_ANALYSIS.md#beat-subdivision)"

---

### Task 1.7: SubdivisionPlaybackController Example (Lines 2304-2366)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "SubdivisionPlaybackController", "practice mode", "playback"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md with comprehensive documentation (Basic Usage, Real-Time Subdivision Switching, Transition Modes, Playback Control, Beat Query Methods, Options Interface)
- [x] **Execute:** Removed code block, added cross-reference link

**Summary:** The 62-line SubdivisionPlaybackController usage example was redundant. AUDIO_ANALYSIS.md has extensive documentation including: Basic Usage, Real-Time Subdivision Switching, Transition Modes, Playback Control, Beat Query Methods, and Options Interface. Removed the code block and added cross-reference: "**For usage examples:** See [docs/AUDIO_ANALYSIS.md#real-time-subdivision-playground-practice-mode](docs/AUDIO_ANALYSIS.md#real-time-subdivision-playground-practice-mode)"

---

### Task 1.8: OSE Parameter Modes Example (Lines 2491-2514)
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "hopSize", "melBands", "gaussianSmooth", "OSE", "hop size", "mel bands"
- [x] **Decision:** Found in AUDIO_ANALYSIS.md with comprehensive documentation (lines 193-345)
- [x] **Execute:** Removed code block, added cross-reference link

**Summary:** The 23-line OSE Parameter Modes usage example was redundant. AUDIO_ANALYSIS.md has comprehensive documentation including: Tier 1 (Hop Size) and Tier 2 (Mel Bands, Gaussian Smooth) mode tables, multiple usage examples for each mode type, helper function examples, mode-to-value reference table, and precedence rules with examples. Removed the code block and added cross-reference: "**For detailed examples (mode-based configuration, helper functions, precedence rules):** See [docs/AUDIO_ANALYSIS.md#ose-parameter-modes](docs/AUDIO_ANALYSIS.md#ose-parameter-modes)"

---

### Task 1.9: Fix BeatSubdivider Methods Table (Lines 2044-2046)
- [x] **Verify** the methods table is missing "Returns" column
- [x] **Fix:** Add "Returns" column to match style guide convention #5
- [x] **Execute:** Update table format

**Summary:** The BeatSubdivider Methods table at lines 1953-1955 was missing the "Returns" column. Updated the table format from `| Method | Description |` to `| Method | Returns | Description |`. Also simplified the method signature in the Method column (moved full parameter types to be implicit) and extracted `SubdividedBeatMap` as the return type. Build verified clean.

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
- [x] **Search** `docs/XP_AND_STATS.md` for "ISessionTracker", "session tracker interface"
- [x] **Decision:** Not found in XP_AND_STATS.md - converted raw interface to table format per style guide convention #3
- [x] **Execute:** Converted raw interface to table format, added cross-reference link to XP_AND_STATS.md

**Summary:** The raw TypeScript interface was converted to table format (Method | Returns | Description). Also moved the Zustand adapter and mock examples to `docs/XP_AND_STATS.md#isessiontracker-adapter` and added a cross-reference link. This addresses both Task 2.1 and Task 2.2.

---

### Task 2.2: Zustand Adapter Example (Lines 2593-2604)
- [x] **Search** `docs/XP_AND_STATS.md` for "Zustand", "adapter" - Not found
- [x] **Search** `USAGE_IN_OTHER_PROJECTS.md` for "Zustand", "adapter" - Not found
- [x] **Decision:** Moved to docs/XP_AND_STATS.md#isessiontracker-adapter
- [x] **Execute:** Moved Zustand adapter example and mock testing example to XP_AND_STATS.md

**Summary:** Combined with Task 2.1. The Zustand adapter example and mock testing example were moved to `docs/XP_AND_STATS.md#isessiontracker-adapter`. Cross-reference link added in DATA_ENGINE_REFERENCE.md.

---

### Task 2.3: ListeningSession Interface (Lines 2612-2625)
- [x] **Search** `docs/XP_AND_STATS.md` for "ListeningSession"
- [x] **Decision:** Raw interface - converted to table format per style guide convention #3
- [x] **Execute:** Converted raw interface to table format (Property | Type | Description)

**Summary:** The 13-line raw TypeScript interface was converted to table format per style guide convention #3. The interface was not found in XP_AND_STATS.md (or anywhere else in docs), so the table format in DATA_ENGINE_REFERENCE.md is the canonical reference. Table includes all 10 properties with types and descriptions.

---

### Task 2.4: ExperienceSystem Interface (Lines 2648-2672)
- [x] **Search** `docs/XP_AND_STATS.md` for "ExperienceSystem"
- [x] **Decision:** Not found in XP_AND_STATS.md - converted raw interface to table format per style guide convention #3
- [x] **Execute:** Converted raw interface to table format (Property | Type | Description)

**Summary:** The 24-line raw TypeScript interface was converted to table format per style guide convention #3. Also discovered and added 3 missing properties (`rhythm_game_base`, `rhythm_game_combo`, `rhythm_game_groove`) that existed in the source but were missing from docs. Added section header "XPCalculator Methods" to clarify that the methods listed below the interface are for XPCalculator, not ExperienceSystem.

---

### Task 2.5: RhythmXPCalculator Examples (Lines 3006-3075)
- [x] **Search** `docs/XP_AND_STATS.md` for "RhythmXPCalculator", "rhythm XP", "button press"
- [x] **Search** `docs/AUDIO_ANALYSIS.md` for "rhythm XP"
- [x] **Decision:** Found in XP_AND_STATS.md - Remove from reference
- [x] **Execute:** Removed code blocks, kept cross-reference link

**Summary:** All three code blocks were already documented in XP_AND_STATS.md with comprehensive examples:
- DEFAULT_RHYTHM_XP_CONFIG (21 lines) → Covered in "Configuration Options" section (lines 357-410)
- Stateless Usage example (15 lines) → Covered in "Stateless Usage (Frontend Tracks Combo)" section (lines 571+)
- Stateful Session Tracking example (17 lines) → Covered in "Session Tracking for UI Display" section (lines 541-569)

Removed all three code blocks. The existing cross-reference link at line 2665 already points to XP_AND_STATS.md#rhythm-game-xp. Added additional cross-reference below the helper functions table.

---

### Task 2.6: Game Mode Configuration Example (Lines 2799-2837)
- [x] **Search** `docs/XP_AND_STATS.md` for "gameMode", "standard", "uncapped"
- [x] **Search** `USAGE_IN_OTHER_PROJECTS.md` for "gameMode"
- [x] **Decision:** Found in both XP_AND_STATS.md (lines 902-919 with comprehensive "GAME MODE SELECTION" section) and USAGE_IN_OTHER_PROJECTS.md (lines 312-313)
- [x] **Execute:** Removed 16-line code block, enhanced cross-reference link

**Summary:** The game mode configuration code example was redundant. Both `docs/XP_AND_STATS.md` (comprehensive section at lines 902-919 with detailed comments) and `USAGE_IN_OTHER_PROJECTS.md` (lines 312-313) already have the same examples. Removed the code block and updated the cross-reference to point to `docs/XP_AND_STATS.md#game-mode-selection`.

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
- [x] **Search** `docs/EQUIPMENT_SYSTEM.md` for "BoxOpener", "box", "open"
- [x] **Decision:** Found in EQUIPMENT_SYSTEM.md with comprehensive examples (openBox, isBox, previewContents, checkRequirements, canOpen, getRequirementsDescription, locked chests)
- [x] **Execute:** Removed 52-line code block, added cross-reference link

**Summary:** The BoxOpener usage example (52 lines) was redundant. EQUIPMENT_SYSTEM.md has comprehensive documentation with examples for all methods: openBox, isBox, previewContents, checkRequirements, canOpen, and getRequirementsDescription, plus locked chest examples and guaranteed container examples. Removed the code block and added cross-reference: "**For usage examples (openBox, isBox, previewContents, locked boxes with requirements):** See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md#boxopener-class)"

---

### Task 3.2: Stat Boosting Enchantment Functions (Lines 4540-4547)
- [x] **Search** `docs/EQUIPMENT_SYSTEM.md` for "createStrengthEnchantment", "enchantment"
- [x] **Decision:** Found in EQUIPMENT_SYSTEM.md (line 395 inline, lines 1308-1339 full examples) - Convert to table format
- [x] **Execute:** Removed code block, converted to table format with cross-reference

**Summary:** The 7-line TypeScript function signature block was converted to table format (Function | Parameter | Returns | Description). Added cross-reference to docs/EQUIPMENT_SYSTEM.md#creating-stat-boosting-enchantments for usage examples. The table format is more scannable and aligns with style guide convention #5.

---

### Task 3.3: Enchantment Query Functions (Lines 4553-4568)
- [x] **Search** `docs/EQUIPMENT_SYSTEM.md` for "getEnchantment", "getCurse", "query"
- [x] **Decision:** Found in EQUIPMENT_SYSTEM.md - Convert to table format per style guide convention #5
- [x] **Execute:** Converted function signatures to table format, added cross-reference link

**Summary:** The 15-line TypeScript function signature block was converted to table format (Function | Parameter | Returns | Description). Added cross-reference to docs/EQUIPMENT_SYSTEM.md#querying-enchantments for usage examples.

---

### Task 3.4: Enchantment Usage Example (Lines 4572-4600)
- [x] **Search** `docs/EQUIPMENT_SYSTEM.md` for "WEAPON_ENCHANTMENTS", "EquipmentModifier.enchant"
- [x] **Search** `USAGE_IN_OTHER_PROJECTS.md` for "enchantment", "EquipmentModifier"
- [x] **Decision:** Found in EQUIPMENT_SYSTEM.md with comprehensive examples (applying enchantments, curses, stat boosts)
- [x] **Execute:** Removed 30-line code block, added cross-reference link

**Summary:** The 30-line usage example was redundant. EQUIPMENT_SYSTEM.md has comprehensive documentation including: applying enchantments (lines 1270-1306), creating stat-boosting enchantments (lines 1308-1339), and applying curses (lines 1341+). Removed the code block and added cross-reference: "**For usage examples (applying enchantments, curses, stat boosts):** See [docs/EQUIPMENT_SYSTEM.md#applying-enchantments](docs/EQUIPMENT_SYSTEM.md#applying-enchantments)"

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
- [x] **Search** `docs/EXTENSIBILITY_GUIDE.md` for "batchAddIcons", "batchUpdateImages", "batchByCategory"
- [x] **Decision:** Found in EXTENSIBILITY_GUIDE.md (lines 744-804 with comprehensive examples) - Remove from reference
- [x] **Execute:** Removed 27-line code block, added cross-reference link

**Summary:** The batch image methods usage example was redundant. EXTENSIBILITY_GUIDE.md has comprehensive documentation including: batchAddIcons examples (spells, equipment), batchUpdateImages with predicates, batchByCategory by property (school, rarity), and error handling. Removed the code block and added cross-reference: "**For batch image usage examples (batchAddIcons, batchUpdateImages, batchByCategory):** See [docs/EXTENSIBILITY_GUIDE.md#batch-image-operations](docs/EXTENSIBILITY_GUIDE.md#batch-image-operations)"

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
- [x] Re-read DATA_ENGINE_REFERENCE.md to verify all code blocks removed
- [x] Verify cross-references point to correct locations
- [x] Check that no essential information was lost
- [x] Run grep to confirm no ` ```typescript ` blocks remain (except minimal signatures)

**Summary:**
- Removed 9 additional code blocks during final review:
  - EnemyGenerator usage examples (Single Enemy Generation, Encounter Generation)
  - PartyAnalysis interface converted to table format
  - XP_BUDGET_PER_LEVEL and CR_TO_XP inline usage examples
  - Magic Items Query Functions converted to table format
  - Magic Items Usage Example and Registration with ExtensionManager examples
  - StatManager override example
- All cross-references verified and point to correct locations
- 17 remaining TypeScript blocks are all minimal signatures (constructors/function signatures) - allowed per plan notes
- Build verified clean

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
