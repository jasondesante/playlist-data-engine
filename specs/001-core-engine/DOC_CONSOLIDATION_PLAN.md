# Documentation Consolidation Plan

**Status**: 📋 In Progress
**Created**: 2026-01-23
**Goal**: Consolidate and reorganize project documentation into three distinct, complementary documents.

---

## The Trinity of Docs

| Document | Identity | Purpose | Has Examples? |
|----------|----------|---------|---------------|
| **SPEC.md** | The Atlas | Quick overview, feature summaries, source file links, keywords for context loading | **NO** |
| **DATA_ENGINE_REFERENCE.md** | The API Dictionary | All types, all classes, all methods with signatures, concise descriptions | Minimal (only when critical to explain API) |
| **USAGE_IN_OTHER_PROJECTS.md** | The Cookbook | Installation guide + comprehensive working examples showing creative possibilities | **YES - All of them** |

**To Remove After Consolidation:**
- `README.md` (main project README)
- `quickstart.md`
- `SUMMARY_PLAN.md` (after harvesting important spec information into SPEC.md)

---

## Execution Style

- **Fix as we go**: Verify and fix issues in one pass (Option B)
- **Keep best examples**: When duplicates exist, keep the clearest/most complete version, merge meaningfully different ones
- **Standardize formatting**: All examples in USAGE follow consistent format (Goal → Code → Explanation)
- **Remove historical notes**: Clean up meta-commentary, status dates, implementation notes
- **Quality over brevity**: No line count targets, focus on completeness and clarity
- **SPEC is pure specs**: No "How to Use" section - focus on what exists, where it is, what it does

## Success Criteria

1. ✅ SPEC.md contains NO code examples - only factual summaries and source links
2. ✅ SPEC.md has NO "How to Use" section - pure specs focus
3. ✅ SPEC.md contains important spec information harvested from SUMMARY_PLAN.md
4. ✅ DATA_ENGINE_REFERENCE.md contains complete API reference with minimal inline examples
5. ✅ USAGE_IN_OTHER_PROJECTS.md contains ALL usage examples and installation instructions
6. ✅ All examples in USAGE follow standardized format (Goal → Code → Explanation)
7. ✅ All code examples verified against actual source code (method signatures, imports, usage patterns)
8. ✅ No duplication of content across the three docs (redundancy removed, best versions kept)
9. ✅ Each doc has a clear, distinct purpose and "vibe"
10. ✅ Historical/meta commentary removed from all docs
11. ✅ README.md, quickstart.md, and SUMMARY_PLAN.md removed (content migrated)

---

## Phase 0: Document Analysis & Inventory

### Task 0.1: Read and catalog all existing docs
- [x] Read `SPEC.md` - note current structure, examples present, factual claims
- [x] Read `DATA_ENGINE_REFERENCE.md` - note API completeness, examples present, cookbook section
- [x] Read `USAGE_IN_OTHER_PROJECTS.md` - note examples present, installation section
- [x] Read `README.md` - harvest any unique examples worth keeping (completed 2026-01-23)

**README.md Unique Examples Found** (not in USAGE):
1. ColorExtractor example (extract color palette from artwork)
2. SkillAssigner example (assign and filter proficient skills)
3. SpellManager example (isSpellcaster check + generateSpells)
4. EquipmentGenerator + AppearanceGenerator examples
5. LevelUpProcessor/CharacterUpdater.applyListeningSession example
6. MasterySystem with recordPlaythrough/isTrackMastered
7. EnvironmentalSensors constructor with options object (vs single API key)
8. GamingPlatformSensors authenticate() method call
9. Full Combat System example (startCombat, executeAttack, nextTurn, getCombatResult)
10. Complete Pipeline Example

**API Discrepancies Found** (needs verification in Phase 4):
- `CharacterUpdater.applyListeningSession()` (README) vs `updateCharacterFromSession()` (USAGE)
- `MasterySystem.recordPlaythrough()/isTrackMastered()` (README) vs `checkMastery()/isJustMastered()` (USAGE)
- `EnvironmentalSensors` constructor options object (README) vs single API key param (USAGE)
- `SessionTracker.startSession()` - README doesn't show return value, both docs need verification
- [x] Read `quickstart.md` - harvest any unique examples worth keeping (completed 2026-01-23)

**quickstart.md Unique Examples Found** (not in USAGE or README):
1. Audio Analyzer Options configuration (`includeAdvancedMetrics`, `enableDetailedOutput`)
2. Environmental Sensors Options (`enableLocation`, `enableMotion`, `enableWeather`, `enableLight`, `weatherApiKey`)
3. Combat Engine Options (`useEnvironment`, `useMusic`, `tacticalMode`, `maxTurnsBeforeDraw`, `allowFleeing`)
4. Performance Tips section (4 tips: lazy loading, caching, batching, debouncing)
5. Troubleshooting table format (table format, not list)
6. Testing section with specific test commands (`npm test -- combat.test.ts`, `npm test -- --watch`, `npm run test:coverage`)
7. Type Safety section (tsconfig.json strict mode setup example)
- [ ] Read `SUMMARY_PLAN.md` - harvest important spec information that should be in SPEC.md

### Task 0.2: Create example inventory
- [ ] List all examples currently in SPEC.md (with line numbers)
- [ ] List all examples currently in DATA_ENGINE_REFERENCE.md (with line numbers)
- [ ] List all examples currently in USAGE_IN_OTHER_PROJECTS.md (with line numbers)
- [ ] List all examples in README.md worth keeping (with line numbers)
- [ ] List all examples in quickstart.md worth keeping (with line numbers)

### Task 0.3: Create SUMMARY_PLAN.md spec inventory
- [ ] Identify all important spec information in SUMMARY_PLAN.md (not examples, but facts/specs)
- [ ] List each piece of spec info with line number
- [ ] Compare against current SPEC.md - note what's missing
- [ ] Create migration list: what from SUMMARY_PLAN.md should go into SPEC.md

### Task 0.4: Create type/method claim inventory
- [ ] List all type definitions claimed in DATA_ENGINE_REFERENCE.md
- [ ] List all method signatures claimed in DATA_ENGINE_REFERENCE.md
- [ ] List all class names claimed across all docs
- [ ] Note any discrepancies between docs (e.g., different method signatures described)

---

## Phase 1: Verification - SPEC.md

### Task 1.1: Verify factual claims in SPEC.md
- [ ] Verify "Core Features" list matches actual implemented features
- [ ] Verify all source file paths exist
- [ ] Verify ability score formulas match `AbilityScoreCalculator.ts`
- [ ] Verify XP modifier formulas match `XPCalculator.ts`
- [ ] Verify environment variable list matches `.env.example`
- [ ] Verify line count is under 300

### Task 1.2: Remove all examples from SPEC.md
- [ ] Remove "How to Use" section entirely
- [ ] Find and remove any remaining code snippets
- [ ] Replace removed examples with brief descriptions where appropriate
- [ ] Add cross-reference: "For usage examples, see USAGE_IN_OTHER_PROJECTS.md"

### Task 1.3: Ensure SPEC.md is example-free
- [ ] Search SPEC.md for ```` ``` ```` (code blocks) - remove all
- [ ] Search for any remaining inline code mentions - evaluate if factual reference or example
- [ ] Final review: Does SPEC.md contain ANY usage examples? Should be NO.

### Task 1.4: Migrate important spec info from SUMMARY_PLAN.md to SPEC.md
- [ ] Read SUMMARY_PLAN.md sections: Core Architecture, Data Flow, Key Implementation Details
- [ ] Extract important spec facts (e.g., algorithm details, design decisions, edge cases)
- [ ] Add extracted spec information to appropriate sections in SPEC.md
- [ ] Ensure new content follows SPEC.md style (factual, concise, no examples)
- [ ] Verify all migrated information is accurate and adds value
- [ ] Remove any redundant information that's already well-covered in SPEC.md

---

## Phase 2: Verification - DATA_ENGINE_REFERENCE.md

### Task 2.1: Verify all type definitions
- [ ] For each interface in `Data Types` section, verify it exists in `src/core/types/`
- [ ] Verify `AudioProfile` interface matches `src/core/types/AudioProfile.ts`
- [ ] Verify `ColorPalette` interface matches `src/core/types/ColorPalette.ts`
- [ ] Verify `CharacterSheet` interface matches `src/core/types/Character.ts`
- [ ] Verify `ServerlessPlaylist` and `PlaylistTrack` match `src/core/types/Playlist.ts`
- [ ] Verify `EnvironmentalContext` and subtypes match `src/core/types/Environmental.ts`
- [ ] Verify `GamingContext` matches `src/core/types/Progression.ts`
- [ ] Verify all Combat types match `src/core/types/Combat.ts`

### Task 2.2: Verify all class definitions
- [ ] Verify `PlaylistParser` class exists and has constructor/options as documented
- [ ] Verify `AudioAnalyzer` class exists and has constructor/options as documented
- [ ] Verify `CharacterGenerator` class and static `generate()` method signature
- [ ] Verify `SessionTracker` class and method signatures
- [ ] Verify `XPCalculator` class and method signatures
- [ ] Verify `EnvironmentalSensors` class and method signatures
- [ ] Verify `GamingPlatformSensors` class and method signatures
- [ ] Verify `CombatEngine` class and method signatures

### Task 2.3: Verify all helper class references
- [ ] Verify `NamingEngine` exists and `generateName()` signature matches
- [ ] Verify `RaceSelector`, `ClassSuggester`, `AbilityScoreCalculator` exist
- [ ] Verify `SkillAssigner`, `SpellManager`, `EquipmentGenerator`, `AppearanceGenerator` exist
- [ ] Verify `LevelUpProcessor`, `MasterySystem`, `CharacterUpdater` exist
- [ ] Verify `GeolocationProvider`, `MotionDetector`, `WeatherAPIClient`, `LightSensor` exist
- [ ] Verify `SteamAPIClient`, `DiscordRPCClient` exist
- [ ] Verify `AttackResolver`, `DiceRoller`, `InitiativeRoller`, `SpellCaster` exist

### Task 2.4: Verify code examples in DATA_ENGINE_REFERENCE.md
- [ ] Review code examples in "Usage" subsections
- [ ] Verify import statements are correct
- [ ] Verify constructor calls match actual constructors
- [ ] Verify method calls match actual signatures
- [ ] Note any examples that should be moved to USAGE_IN_OTHER_PROJECTS.md

### Task 2.5: Move cookbook examples to USAGE
- [ ] Move "Cookbook & Examples" section content to USAGE_IN_OTHER_PROJECTS.md
- [ ] Keep only minimal critical inline examples in DATA_ENGINE_REFERENCE.md
- [ ] Update cross-references in DATA_ENGINE_REFERENCE to point to USAGE

### Task 2.6: Verify utility functions section
- [ ] Verify hashing functions exist in `src/utils/hash.ts`
- [ ] Verify `SeededRNG` class exists in `src/utils/random.ts`
- [ ] Verify validation schemas exist
- [ ] Verify constants exports (`ALL_RACES`, `ALL_CLASSES`, `XP_THRESHOLDS`, etc.)

---

## Phase 3: Verification - USAGE_IN_OTHER_PROJECTS.md

### Task 3.1: Verify installation section
- [ ] Verify absolute path is correct (`/Users/jasondesante/playlist-data-engine`)
- [ ] Verify `file:` path syntax is correct
- [ ] Verify `npm link` instructions are correct
- [ ] Verify import examples use correct package name

### Task 3.2: Verify all code examples compile conceptually
- [ ] "Basic Playlist Parsing and Character Generation" example
  - [ ] Verify `PlaylistParser` constructor and `parse()` method
  - [ ] Verify `AudioAnalyzer` constructor and `extractSonicFingerprint()` method
  - [ ] Verify `CharacterGenerator.generate()` signature (seed, audioProfile, name)
- [ ] "Progression and XP Tracking" example
  - [ ] Verify `SessionTracker` usage pattern
  - [ ] Verify `XPCalculator` methods
  - [ ] Verify `CharacterUpdater` methods
- [ ] "Environmental Sensors" example
  - [ ] Verify `EnvironmentalSensors` constructor
  - [ ] Verify `requestPermissions()` and `updateSnapshot()` methods
- [ ] "Gaming Platform Integration" example
  - [ ] Verify `GamingPlatformSensors` constructor options
  - [ ] Verify `authenticate()` and `startMonitoring()` methods
- [ ] "Advanced: Combining All Systems" example
  - [ ] Verify the full pipeline integrates correctly

### Task 3.3: Harvest examples from README.md
- [ ] Review "Quick Start: Foundation (Phase 0)" example - add to USAGE if unique
- [ ] Review "Phase 1: Visual Analysis & Character Naming" example - add to USAGE if unique
- [ ] Review "Phase 2: Advanced Character Features" example - add to USAGE if unique
- [ ] Review "Phase 3: Progression & Leveling" example - add to USAGE if unique
- [ ] Review "Phase 4: Environmental Sensors" example - add to USAGE if unique
- [ ] Review "Phase 5: Gaming Platform Integration" example - add to USAGE if unique
- [ ] Review "Phase 6: Combat System" example - add to USAGE if unique
- [ ] Review "Complete Pipeline Example" - add to USAGE if unique

### Task 3.4: Harvest examples from quickstart.md
- [ ] Review "30-Second Example" - add to USAGE if unique
- [ ] Review phase-by-phase examples - add any unique ones to USAGE
- [ ] Review "Common Patterns" section - add to USAGE if unique
- [ ] Review configuration examples - add to USAGE if unique

### Task 3.5: Verify Discord RPC warning
- [ ] Ensure Discord RPC section clearly states it's for music presence ONLY
- [ ] Verify no examples show reading game state from Discord (not possible)

---

## Phase 4: Cross-Document Consistency

### Task 4.1: Resolve naming discrepancies
- [ ] Check for class name inconsistencies (e.g., `SessionTracker.startSession()` returning sessionId vs session object)
- [ ] Check for method signature inconsistencies across docs
- [ ] Check for type name inconsistencies
- [ ] Document all discrepancies found and create fixes

### Task 4.2: Resolve API changes (e.g., SessionTracker)
- [ ] Verify `SessionTracker.startSession()` returns `sessionId` (string)
- [ ] Verify `SessionTracker.endSession()` takes `sessionId` and returns `ListeningSession | null`
- [ ] Update all docs to reflect correct API
- [ ] Check for similar API changes in other classes

### Task 4.3: Resolve import statement inconsistencies
- [ ] Verify all import examples use correct paths
- [ ] Ensure consistency in import style (named vs default)
- [ ] Update all docs to use current package name

### Task 4.4: Verify source file references
- [ ] All source file paths in SPEC.md should be accurate
- [ ] All source file paths in DATA_ENGINE_REFERENCE.md should be accurate
- [ ] Check for files that moved or were renamed

---

## Phase 5: Content Organization & Trimming

### Task 5.1: Trim SPEC.md
- [ ] Remove any remaining "how to" language
- [ ] Replace with "what it does" language
- [ ] Ensure focus is on: what exists, where it is, what it does
- [ ] Keep "How to Use" section header but replace with "Quick Reference" pointing to USAGE

### Task 5.2: Trim DATA_ENGINE_REFERENCE.md
- [ ] Move verbose examples to USAGE
- [ ] Keep only minimal, essential inline examples
- [ ] Ensure focus is on: complete API catalog with signatures
- [ ] Add "For usage examples, see USAGE_IN_OTHER_PROJECTS.md" where appropriate

### Task 5.3: Enhance USAGE_IN_OTHER_PROJECTS.md
- [ ] Add table of contents for examples section
- [ ] Group examples logically (Basic, Advanced, Specific Features)
- [ ] Add "Troubleshooting" section if not present
- [ ] Add "Environment Variables" section if not present
- [ ] Ensure all harvested examples are integrated

### Task 5.4: Add cross-references between docs
- [ ] SPEC.md → Add "For API details, see DATA_ENGINE_REFERENCE.md"
- [ ] SPEC.md → Add "For usage examples, see USAGE_IN_OTHER_PROJECTS.md"
- [ ] DATA_ENGINE_REFERENCE.md → Add "For quick overview, see SPEC.md"
- [ ] DATA_ENGINE_REFERENCE.md → Add "For usage examples, see USAGE_IN_OTHER_PROJECTS.md"
- [ ] USAGE_IN_OTHER_PROJECTS.md → Add "For API details, see DATA_ENGINE_REFERENCE.md"

---

## Phase 6: Final Verification

### Task 6.1: SPEC.md final check
- [ ] Count lines - should be under 300
- [ ] Search for ```` ``` ```` (code blocks) - should be ZERO
- [ ] Verify every factual claim is accurate
- [ ] Verify all source file links are correct
- [ ] Ask: "Could I understand what this engine does without seeing examples?"

### Task 6.2: DATA_ENGINE_REFERENCE.md final check
- [ ] Verify every class is documented
- [ ] Verify every public method is documented
- [ ] Verify every type interface is documented
- [ ] Verify all code examples compile (conceptually)
- [ ] Ask: "Could I find the API for any class without digging into source?"

### Task 6.3: USAGE_IN_OTHER_PROJECTS.md final check
- [ ] Verify all examples are complete and runnable
- [ ] Verify all examples use correct API (post-fixes)
- [ ] Verify installation instructions are accurate
- [ ] Verify environment variables section is complete
- [ ] Ask: "Could I install and use this engine just from this doc?"

### Task 6.4: Cross-doc final check
- [ ] Read all three docs end-to-end
- [ ] Verify no duplication of core content
- [ ] Verify cross-references are accurate
- [ ] Verify each doc has distinct "vibe" and purpose
- [ ] Verify the "trinity" is complementary, not redundant

---

## Phase 7: Cleanup & Removal

### Task 7.1: Remove obsolete docs
- [ ] Delete `README.md` (main project README)
- [ ] Delete `quickstart.md`
- [ ] Delete `SUMMARY_PLAN.md` (after harvesting spec information into SPEC.md)
- [ ] Verify no other files reference these deleted docs

### Task 7.2: Update any remaining references
- [ ] Search codebase for references to deleted files
- [ ] Update any links in other docs
- [ ] Update package.json or config files if needed

### Task 7.3: Final test run
- [ ] Run `npm test` to ensure nothing broke
- [ ] Verify all imports in examples still work
- [ ] Double-check no broken references

---

## Known Issues to Address (From Previous Review)

The following issues were identified during earlier work. These should be verified and fixed across all docs:

1. **SessionTracker API Change** - `startSession()` returns `sessionId`, not session object
2. **NamingEngine API** - `generateName()` takes `(track, audioProfile)`, not `(title, artist, audioProfile, class)`
3. **CombatEngine API** - `startCombat()` takes arrays of characters, not individual params
4. **Discord Voice Features** - Should NOT be documented (not supported by Discord RPC)
5. **Test Count** - Update any references from 426 to 837 tests

---

## Deliverables

After completing this plan:

1. ✅ **SPEC.md** - Concise, example-free spec document with complete information
2. ✅ **DATA_ENGINE_REFERENCE.md** - Complete API reference with minimal examples
3. ✅ **USAGE_IN_OTHER_PROJECTS.md** - Comprehensive cookbook with all examples
4. ✅ **README.md** - Deleted (content migrated)
5. ✅ **quickstart.md** - Deleted (content migrated)
6. ✅ **SUMMARY_PLAN.md** - Deleted (important spec info migrated to SPEC.md)
7. ✅ All code examples verified against actual source code
8. ✅ All method signatures and type definitions accurate
9. ✅ Clear cross-references between all three docs

---

## Estimated Task Count

- **Phase 0**: 11 tasks (inventory and analysis, including SUMMARY_PLAN review)
- **Phase 1**: 14 tasks (SPEC verification, cleanup, and SUMMARY_PLAN migration)
- **Phase 2**: 18 tasks (DATA_ENGINE_REFERENCE verification)
- **Phase 3**: 14 tasks (USAGE verification and enhancement)
- **Phase 4**: 8 tasks (cross-document consistency)
- **Phase 5**: 10 tasks (content organization and trimming)
- **Phase 6**: 12 tasks (final verification)
- **Phase 7**: 7 tasks (cleanup and removal including SUMMARY_PLAN)

**Total**: ~94 tasks

---

## Execution Notes

- Always verify against actual source code before making changes
- When moving examples, preserve the original content (don't rewrite)
- When trimming, be ruthless about removing duplication
- When in doubt about whether an example is "critical" to API docs, move it to USAGE
- Keep a log of all changes made for review
- Test examples conceptually by reading the source code
