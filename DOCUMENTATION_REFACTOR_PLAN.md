# Documentation Refactor Plan
## Playlist Data Engine Documentation Optimization

**Status**: Planning Phase
**Created**: 2026-02-06
**Target**: AI-optimized documentation (90% AI, 10% human) with perfect flow

---

## Table of Contents

1. [Commandments](#commandments-hard-rules-for-documentation)
2. [Phase Structure](#phase-structure)
3. [Phases 1-8: USAGE_IN_OTHER_PROJECTS.md](#phases-1-8-usage_in_other_projectsmd-cleanup)
4. [Phases 9-10: Topic Docs Review](#phases-9-10-topic-docs-light-touch-review)
5. [Phases 11-20: DATA_ENGINE_REFERENCE.md](#phases-11-20-data_engine_referencemd-refactor)
6. [Phase 21: Final Verification](#phase-21-final-verification)
7. [Success Criteria](#success-criteria)

---

## Commandments (Hard Rules for Documentation)

### I. The Prime Directive
**Documentation serves AI comprehension, not human memory.**
- What an AI can find via code search → don't document exhaustively
- What requires architectural understanding → document with examples
- What is idiomatic pattern usage → document once, link everywhere

### II. The Location Principle
- **USAGE_IN_OTHER_PROJECTS.md** → Core getting-started examples, entry hub
- **docs/[TOPIC].md** → Deep-dive topic-specific examples
- **DATA_ENGINE_REFERENCE.md** → Concise reference tables + source links

### III. The Type Definition Rule
**Never duplicate complete type definitions.** Instead:
```markdown
### CharacterSheet

Complete character data structure.

**Location:** [src/core/types/Character.ts](src/core/types/Character.ts)

**Key Properties:**
| Property | Type | Description |
|----------|------|-------------|
| name | string | Character name |
| race | Race | Character race |
| class | Class | Character class |
| ability_scores | AbilityScores | STR, DEX, CON, INT, WIS, CHA |
```

**Note on line references**: Avoid specific line ranges like "(lines 229-373)" as they get out of sync with code changes. Link to the source file instead - AI can search within files efficiently.

### IV. The Synonym Rule
**Include alternate search terms for AI discoverability, discovered organically during refactoring.**

When you encounter a concept that might be searched for using different terms, add "Also known as" notes. Don't pre-define synonym lists - discover them naturally as you work through the content.

```markdown
## Equipment Properties
*Also known as: Item mods, enchantments, affixes, bonuses, stat boosts*
```

### V. The One-Example Rule
**One canonical example per pattern.** Reference instead of repeating:
```markdown
### Earning XP from Listening

For complete XP workflow, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md#earning-xp-from-listening-to-music).
```

### VI. The Table Preference
**Tables > verbose lists for reference material.**
- Use tables for method signatures, type properties, enum values
- Include only: name, parameters (brief), return type, description
- Link to source for full implementation

### VII. The Link Everything Rule
**Every cross-reference must be bidirectional.**
- If A references B, B should reference back to A
- All links use relative paths
- Links include descriptive anchor text

### VIII. The Example Relocation Rule
**Examples found in reference docs during refactoring are relocated, never deleted.**

When removing examples from DATA_ENGINE_REFERENCE.md:
- Determine which doc the example belongs to (USAGE or topic doc)
- Add it to the appropriate section if not already present
- If the pattern exists elsewhere, replace with link instead
- Only delete if truly redundant (exact duplicate)

---

## Phase Structure

| Phase Range | Focus | Approx. Tasks |
|-------------|-------|---------------|
| 1-8 | USAGE_IN_OTHER_PROJECTS.md cleanup | ~40 tasks |
| 9-10 | Topic docs (EXTENSIBILITY, EQUIPMENT) review | ~10 tasks |
| 11-20 | DATA_ENGINE_REFERENCE.md refactor (10 sections) | ~50 tasks |
| 21 | Final verification | ~10 tasks |

**Total**: ~110 tasks broken down into subtasks

---

## Phases 1-8: USAGE_IN_OTHER_PROJECTS.md Cleanup

**Goal**: Perfect the main entry documentation. Current: ~906 lines. Target: ~650 lines.

### Phase 1: Frontmatter and Table of Contents

**Goal**: Ensure the entry point is clean and scannable.

- [x] **Task 1**: Review and optimize title, description, and introductory text
  - [x] Subtask: Is the purpose clear in first 3 lines?
  - [x] Subtask: Are the links to other docs prominent?
  - [x] Subtask: Remove any redundant explanations

- [x] **Task 2**: Optimize Table of Contents structure
  - [x] Subtask: Group examples logically (Basic → Advanced → Specific → Extensibility → Other Docs)
  - [x] Subtask: Check for any missing important sections
  - [x] Subtask: Ensure "Other Docs" section links are accurate

- [x] **Task 3**: Verify all cross-links in TOC work
  - [x] Subtask: Check each anchor link
  - [x] Subtask: Update any broken links
  - [x] **CRITICAL**: User explicitly requested TOC verification - ensure every link in TOC is accurate

### Phase 2: Installation Options Section (lines 7-72)

**Goal**: Clean installation instructions with minimal detail - developers know how npm works.

- [x] **Task 4**: Review the three installation options
  - [x] Subtask: Is `file:` path explanation clear? ✓ Yes, minimal JSON example
  - [x] Subtask: Is `npm link` explanation necessary or could it be shortened? ✓ Kept minimal bash commands
  - [x] Subtask: Is `cp -r` option useful or can it be removed? ✓ Removed - unusual approach, developers know how to copy files
  - [x] **User note**: Lines 7-72 may be too detailed for things developers already know
  - **Summary**: Consolidated from 3 options to 2, removed `cp -r` option (unusual), kept `file:` (recommended) and `npm link` (common for dev). Changed headers to single "Installation" with indented options. Reduced from ~22 lines to ~18 lines.

- [x] **Task 5**: Simplify code blocks
  - [x] Subtask: Remove obvious comments ✓ No comments present - code blocks are already clean
  - [x] Subtask: Keep only essential notes ✓ Labels "(Recommended)" and "(for development)" are essential guidance

- [x] **Task 6**: Consider consolidating to fewer options
  - [x] Subtask: Could this be one option with alternatives mentioned? ✓ Removed "Option 1:" and "Option 2:" numbering, kept clear distinction
  - [x] Subtask: Is the distinction between options clear? ✓ Yes - primary method uses "recommended", dev alternative clearly labeled
  - **Summary**: Removed numbered option labels ("Option 1:", "Option 2:") for cleaner presentation. Kept both methods since they serve different purposes (production vs development). Made the section more scannable with simpler inline labels: "(recommended)" and "for development".

### Phase 3: Basic Examples Section

**Goal**: Core, essential examples only. Perfect clarity.

- [x] **Task 7**: Review "Basic Playlist Parsing and Character Generation"
  - [x] Subtask: Is this the absolute minimum working example? ✓ Yes, shows core flow (parse → analyze → generate)
  - [x] Subtask: Are all imports necessary? ✓ Yes, all three imports are essential
  - [x] Subtask: Is the output clear? ✓ Console.log statements are helpful and descriptive
  - **Summary**: Example is already optimal. No changes needed.

- [x] **Task 8**: Review "Earning XP from Listening to Music"
  - [x] Subtask: Is the workflow clear?
  - [x] Subtask: Mention default strategy depends on game mode (unlimited vs 20 level cap)
  - [x] Subtask: Mention you can change: stat strategies, how you earn XP, and level scaling
  - [x] Subtask: Summarize these options smartly - don't be verbose
  - [x] Subtask: Link to XP_AND_STATS.md for details - remove multiple TypeScript examples
  - [x] **User note**: The extra typescript implementation examples are unnecessary - just explain the concept and link
  - **Summary**: Streamlined from 56 lines to 25 lines. Removed duplicate workflow (now in XP_AND_STATS.md), removed extra TypeScript example for manual stat selection (replaced with concise bullet point listing customization options with link to XP_AND_STATS.md). Added clear mention of game modes (standard vs uncapped) affecting stat behavior.

- [x] **Task 9**: Add links to deeper dives
  - [x] Subtask: Link "Advanced Character Features" → relevant sections
  - [x] Subtask: Link "Deterministic Character Generation" → ROLLS_AND_SEEDS.md if details needed
  - **Summary**: Added link to ROLLS_AND_SEEDS.md in "Deterministic Character Generation" section. Added 3 topic links at the top of "Advanced Character Features" section (XP_AND_STATS for skills, EXTENSIBILITY_GUIDE for spells, EQUIPMENT_SYSTEM for equipment).

### Phase 4: Specific Features Section

**Goal**: Each feature has concise example + link to deep dive.

- [x] **Task 10**: "Color Extraction" review
  - [x] Subtask: **User note**: This is good as-is, keep it
  - **Summary**: Section is concise (13 lines), shows essential API usage, demonstrates key return properties. No changes needed.

- [x] **Task 11**: "Character Naming" review
  - [x] Subtask: Ensure manual vs deterministic naming is clearly mentioned
  - [x] Subtask: Can this be written cleaner while keeping the distinction?
  - **Summary**: Reduced from ~40 lines to ~25 lines. Replaced verbose examples with concise table showing three naming modes (Deterministic, Manual override, Non-deterministic). Removed verbose NamingEngine example (replaced with link to DATA_ENGINE_REFERENCE). Kept core example showing automatic name generation. The distinction between manual vs deterministic naming is now clearer in the table format.

- [x] **Task 12**: "Deterministic Character Generation" review
  - [x] Subtask: Example shows the concept well - keep minimal
  - [x] Subtask: Could reference ROLLS_AND_SEEDS.md for more detail?
  - **Summary**: Section is already in good shape. Link to ROLLS_AND_SEEDS.md was added in Task 9. Example is minimal and clearly shows the deterministic concept (same inputs = same output), the gameMode nuance, and a practical caching pattern. No changes needed.

- [x] **Task 13**: "Advanced Character Features" review
  - [x] Subtask: **User note**: This could be written in a tighter way
  - [x] Subtask: Link to EQUIPMENT_SYSTEM.md for equipment details
  - [x] Subtask: Link to XP_AND_STATS.md for stat strategies
  - **Summary**: Streamlined from ~56 lines to ~38 lines. Removed verbose console.log statements in example, replaced with concise inline comments showing what each function returns. Moved "For deeper dives" links to bottom of section for cleaner flow. All three topic docs (XP_AND_STATS, EXTENSIBILITY_GUIDE, EQUIPMENT_SYSTEM) are now linked.

- [x] **Task 14**: "Environmental Sensors" and "Gaming Platform Integration"
  - [x] Subtask: These just link to IRL_SENSORS.md - good
  - [x] Subtask: Could add one-line each about what they provide
  - **Summary**: Added concise one-line descriptions for each section. Environmental Sensors: "GPS, motion, weather, and light sensors that provide XP modifiers based on real-world conditions (running, night, storm, altitude)." Gaming Platform Integration: "Steam game detection and Discord Rich Presence integration that provide XP bonuses based on gaming activity."

- [x] **Task 15**: "Combat System" link
  - [x] Subtask: Just links to COMBAT_SYSTEM.md - correct approach
  - **Summary**: Added concise one-line description for consistency with other sections: "Turn-based D&D 5e-inspired combat with initiative, attacks, spell casting, and dice rolling." The link-only approach to COMBAT_SYSTEM.md is correct as it contains the complete example.

### Phase 5: Advanced Examples Section

**Goal**: Show pipeline without being verbose.

- [x] **Task 16**: Review "Combining All Systems"
  - [x] Subtask: **User note**: This full pipeline example is really good - shows the flow well
  - [x] Subtask: A little redundancy is good here - reiterates and drives home the important parts
  - [x] Subtask: Maybe note minor improvements, but don't suggest major changes
  - [x] **Note**: Valuable reference that shows the complete flow
  - **Summary**: Section is in excellent shape. Shows complete pipeline (Parse → Analyze → Generate → Track → Level Up) with clear numbered steps. Reinforces patterns from earlier examples appropriately. Good comments highlighting initialization outside loop and game mode selection. No changes needed - this section serves its purpose well as a comprehensive end-to-end reference.

### Phase 6: Extensibility System Section

**Goal**: Hub section that points to deeper docs. Already cleaned up - just verify polish.

- [x] **Task 17**: Review current state
  - [x] Subtask: Is the one-sentence description clear and sufficient? ✓ Yes
  - [x] Subtask: Are the bullet points under "See EXTENSIBILITY_GUIDE.md for:" useful? ✓ No - redundant and vague; consolidated all links into single "Detailed guides:" list
  - **Summary**: Streamlined section from ~17 lines to ~10 lines. Removed redundant "See... for:" subsection with vague bullets. Consolidated all links into a single clean "Detailed guides:" list with concise descriptions for each target doc.

- [x] **Task 18**: Verify all links work
  - [x] Subtask: EXTENSIBILITY_GUIDE.md ✓
  - [x] Subtask: CUSTOM_CONTENT.md ✓
  - [x] Subtask: PREREQUISITES.md ✓
  - [x] Subtask: EQUIPMENT_SYSTEM.md ✓
  - [x] Subtask: DATA_ENGINE_REFERENCE.md ✓

- [x] **Task 19**: Check for any remaining redundancy
  - [x] Subtask: Is there anything here that's duplicated elsewhere? ✓ Yes - TOC "Extensibility" subsection had redundant bullets
  - [x] Subtask: Is the section doing its job as a "hub" or is it trying to do too much? ✓ Now functions as clean hub; TOC simplified to single pointer
  - **Summary**: Simplified TOC "Extensibility" from 4 lines with bullets to 1 line pointing to detailed section. Reduced redundancy - detailed "Extensibility System" section is now the single source of truth for extensibility links.

### Phase 7: Equipment System Section

**Goal**: Brief overview + link to EQUIPMENT_SYSTEM.md.

- [x] **Task 20**: Review equipment section intro
  - [x] Subtask: Is the link to EQUIPMENT_SYSTEM.md prominent?
  - **Summary**: Streamlined from ~10 lines to ~9 lines. Removed redundant "Registering, Spawning, and Enchanting Custom Equipment" subsection (the content is fully covered in EQUIPMENT_SYSTEM.md). Changed section heading from "Equipment System Overview" to "Equipment System" for consistency with other sections. Replaced duplicate "For complete documentation/For more examples" links with single clean bullet list pointing to key EQUIPMENT_SYSTEM.md sections. The section now functions as a concise hub similar to the "Extensibility System" section.

- [x] **Task 21**: Review "Registering, Spawning, and Enchanting Custom Equipment"
  - [x] Subtask: This is covered in EQUIPMENT_SYSTEM.md - can be reduced to minimal example or link
  - **Summary**: Already completed in Task 20. The "Registering, Spawning, and Enchanting Custom Equipment" subsection was removed from USAGE_IN_OTHER_PROJECTS.md because the content is fully covered in EQUIPMENT_SYSTEM.md. The equipment section now provides a brief overview with a clean link to EQUIPMENT_SYSTEM.md for detailed documentation.

- [x] **Task 22**: Verify link to EQUIPMENT_SYSTEM.md
  - [x] Subtask: Link verified working
  - **Summary**: The link `docs/EQUIPMENT_SYSTEM.md` in the Equipment System section is correct and functional.

### Phase 8: Back-Matter Cleanup

**Goal**: Streamline everything after the main content.

- [x] **Task 23**: "Validation Schemas" section
  - [x] Subtask: Reduce to minimal hint: "All *Schema exports are Zod schemas for runtime validation"
  - [x] Subtask: Keep ONE example showing how to use schemas
  - [x] Subtask: Remove all schema definitions (they're in code)
  - [x] **User note**: Condense to hints - developers know what Zod schemas are
  - **Summary**: Reduced from ~122 lines to ~12 lines (90% reduction). Removed verbose data examples for three different schema types (playlist track, character sheet, audio profile). Removed redundant "Validating X Data" subsections and the verbose bullet list of use cases. Kept single concise example showing Zod's `safeParse` pattern. The section now provides a minimal hint about available schemas and one idiomatic usage example.

- [x] **Task 24**: "Available Exports" section (lines 401-548) - DRAGON BALL Z FUSION
  - [x] Subtask: This content is spiritually the same as DATA_ENGINE_REFERENCE - they should FUSE
  - [x] Subtask: DATA_ENGINE_REFERENCE becomes the ONE definitive API/export reference (tables + source links)
  - [x] Subtask: USAGE replaces "Available Exports" with brief pointer to DATA_ENGINE_REFERENCE
  - [x] Subtask: Ensure DATA_ENGINE_REFERENCE has complete, well-organized export tables first
  - [x] Subtask: Then remove "Available Exports" from USAGE entirely, add only a link section
  - **Summary**: FUSION COMPLETE! DATA_ENGINE_REFERENCE.md now has a "Quick Export Reference" section at the top with categorized tables of all exports (115 lines). USAGE_IN_OTHER_PROJECTS.md "Available Exports" section replaced with brief pointer (17 lines) - reduced from 148 lines to 17 lines (88% reduction). File overall went from 653 to 520 lines (20% reduction). DATA_ENGINE_REFERENCE is now the single source of truth for export documentation with both quick reference and detailed sections.

- [x] **Task 25**: "Development Workflow" section
  - [x] Subtask: Keep only project-specific workflow commands
  - [x] Subtask: Remove obvious npm commands (install, test, build)
  - [x] **User note**: Condense to hints - developers know standard npm commands
  - **Summary**: Combined "Development Workflow" and "Rebuilding After Changes" into a single concise section (6 lines). Removed verbose terminal examples, obvious `npm install`, and self-explanatory `cd` commands. Kept only the essential hint: `npm run dev` for watch mode and the concept of immediate availability with `file://` or `npm link`. Added link to `.env.example` for environment configuration. TOC updated with accurate description.

- [x] **Task 26**: "Rebuilding After Changes" section
  - [x] Subtask: Is this necessary? Can it be combined with Development Workflow?
  - **Summary**: Completed as part of Task 25. Section was merged into "Development Workflow" since both covered the same workflow concern. The rebuilding hint (`npm run dev`) is now part of the streamlined workflow section.

- [x] **Task 27**: "Environment Variables" section
  - [x] Subtask: Convert to minimal table format
  - [x] Subtask: Link to .env.example in project root for full details
  - [x] Subtask: Remove all verbose descriptions
  - [x] **User note**: Summarized in-place
  - **Summary**: Reduced from ~21 lines to ~11 lines (48% reduction). Converted verbose bash code block with comments to clean table format. Removed redundant sentences about optional variables (clear from context). Added prominent link to `.env.example` for complete configuration.

- [x] **Task 28**: "Troubleshooting" section
  - [x] Subtask: Keep only common/non-obvious issues
  - [x] Subtask: Remove obvious solutions (e.g., "did you run npm install?")
  - [x] Subtask: Link to relevant docs for detailed help
  - [x] **User note**: Summarized in-place, didn't create new files
  - **Summary**: Reduced from ~36 lines to ~12 lines (67% reduction). Condensed "Library changes not reflecting" to bulleted format. Condensed "Audio analysis not working" to numbered list. Combined "TypeScript errors about types" into one-line note at bottom. Removed verbose code blocks and bash commands - developers know how to run npm and edit tsconfig.json.

- [x] **Task 29**: "Building Status" section
  - [x] Subtask: Is this necessary? It's build output that changes
  - [x] Subtask: Could be in a separate BUILD.md or CONTRIBUTING.md?
  - **Summary**: REMOVED ENTIRELY. This section contained transient build output (file sizes, dates, build status messages) that doesn't belong in documentation. It's CI/build artifact information that changes with each build. Users can run `npm run build` themselves to see current output. If build status is needed, it belongs in CI/CD pipeline output, not user-facing documentation.

---

## Phases 9-10: Topic Docs Light-Touch Review

**Goal**: Light touch review of EXTENSIBILITY_GUIDE.md and EQUIPMENT_SYSTEM.md. Remove duplicate type definitions, keep examples.

### Phase 9: EXTENSIBILITY_GUIDE.md Review

**Current**: 2,961 lines. **Goal**: Remove redundancy, keep examples.

- [x] **Task 30**: Audit for duplicate type definitions
  - [x] Subtask: Find types that exist in source code
  - [x] Subtask: Mark which ones can be replaced with source links
  - [x] Subtask: Identify types that need explanation (custom augmentation patterns)
  - **Summary**: Streamlined Reference section from ~200 lines to ~90 lines (55% reduction). Replaced full type definitions with link table. Streamlined Validation section from ~250 lines to ~60 lines (76% reduction) - replaced full type definitions with key validation rules table.

- [x] **Task 31**: Audit for duplicate method signatures
  - [x] Subtask: Find methods that just repeat what's in source ✓ Found 14 documented methods - each had heading + description + full example, very repetitive
  - [x] Subtask: Mark which can be replaced with reference tables ✓ Converted to concise method reference table (19 methods → 1 table)
  - [x] Subtask: Keep methods that have non-obvious behavior ✓ Kept examples for registration, weights, and inspection with practical usage patterns
  - **Summary**: Reduced from ~160 lines to ~105 lines in "ExtensionManager API" section (34% reduction). Converted verbose method-by-method documentation (heading + description + example for each) into:
    - Single method reference table (19 methods including 5 previously undocumented)
    - Registration options table (3 options)
    - Spawn modes table (4 modes with use cases)
    - 3 focused examples showing practical patterns (registration, weights, inspection)
  - **Added missing methods**: `registerMultiple()`, `setMode()`, `getCurrentOptions()`, `validate()`, `exportCustomDataForCategory()`

- [x] **Task 32**: Review ExtensionManager documentation
  - [x] Subtask: Is the category table useful? ✓ Yes - essential reference for all extensible categories with clear examples
  - [x] Subtask: Are the registration examples clear? ✓ Yes - three focused patterns (registration, weights, inspection)
  - [x] Subtask: Any redundant examples that duplicate USAGE? ✓ No - USAGE only has brief overview with links
  - **Summary**: ExtensionManager documentation is in good shape. Category table is authoritative reference. Registration examples show distinct patterns. Spawn rate system has both quick-reference table (lines 119-127) and detailed explanations (lines 186-303) - this is intentional redundancy serving different purposes (quick lookup vs. understanding). No changes needed.

- [x] **Task 33**: Review spawn weight system docs
  - [x] Subtask: Is this clear and well-explained?
  - [x] Subtask: Any redundant with DATA_ENGINE_REFERENCE?
  - **Summary**: Streamlined spawn weight documentation by moving "Weight Values" table next to "Spawn Modes" table for better flow. Removed redundant detailed mode-by-mode explanations (Relative/Absolute/Default/Replace) in the "Spawn Rate System" section - these are now covered by the concise quick-reference table. The section now provides key behaviors summary and jumps directly to "Advanced Weight Configuration" examples which show practical patterns (hierarchical weights, per-class weights, zero weights, reset). Reduced from ~120 lines to ~40 lines (67% reduction) while keeping all practical examples.

- [x] **Task 34**: Create summary of changes (AUDIT TRAIL)
  - [x] Subtask: List what was removed (with reasoning - why was it redundant?)
  - [x] Subtask: List what was kept
  - [x] Subtask: Note any borderline calls (things that were close to being cut)
  - **Purpose**: If something was removed that you actually wanted, you can see what/why and restore it
  - **Where**: Summary appended below

#### Phase 9 Audit Trail Summary

**Total Changes**: EXTENSIBILITY_GUIDE.md reduced from 2,961 lines to 2,544 lines (~14% reduction, 417 lines removed)

---

**What Was Removed:**

1. **Reference Section (Task 30)** - ~110 lines removed
   - Full TypeScript type definitions for `ExtensionOptions`, `ClassFeature`, `RacialTrait`, `CustomSkill`, `SkillListDefinition`
   - **Reasoning**: AI can find these in source code via links. Full definitions duplicated information readily available in TypeScript files.
   - **Kept**: Link table showing type name → source file → description (essential for discoverability)

2. **Validation Section (Task 30)** - ~190 lines removed
   - Verbose validation error examples with full code blocks showing each validation failure case
   - Duplicate explanations of validation rules that were already in table format
   - **Reasoning**: Examples were repetitive and showed obvious error cases. The "Key Validation Rules" table already contained the essential information.

3. **ExtensionManager Method Documentation (Task 31)** - ~55 lines removed
   - Individual heading + description + example for each of 14 methods
   - **Reasoning**: Format was extremely repetitive (each method got same treatment). Reference table provides same information more concisely.
   - **Kept**: 3 focused examples showing practical usage patterns (registration, weights, inspection) instead of 14 individual examples

4. **Spawn Rate System Detailed Explanations (Task 33)** - ~80 lines removed
   - Detailed paragraphs for each spawn mode (Relative, Absolute, Default, Replace) explaining behavior
   - **Reasoning**: The "Spawn Modes" table already contained mode descriptions and use cases. Paragraphs were redundant with the table.
   - **Kept**: Key behaviors summary (one sentence each) and all "Advanced Weight Configuration" examples (practical patterns)

---

**What Was Kept:**

1. **Category Table** (lines 30-72) - Essential reference showing all extensible categories with examples
   - **Reasoning**: This is the authoritative reference for what can be extended. No other source has this comprehensive list with usage examples.

2. **Three Focused Examples** (lines 138-192) - Registration, weights, inspection patterns
   - **Reasoning**: Each shows a distinct, practical usage pattern. Not redundant with USAGE (which only has brief overview).

3. **Spawn Modes Table** (lines 119-127) - Quick reference for mode behaviors
   - **Reasoning**: Essential for understanding spawn rate system. Serves both quick lookup and detailed understanding needs.

4. **Weight Values Table** (lines 128-137) - Numerical spawn rate guide
   - **Reasoning**: Critical for users to understand how to set appropriate weights. No other source has this.

5. **All Category-Specific Examples** (Equipment, Spells, Races, Classes, Features, Skills, Appearance, etc.)
   - **Reasoning**: Each example demonstrates unique API patterns for that category. Not repetitive across categories.

6. **Content Pack Examples** (lines 1322-1612)
   - **Reasoning**: Show how to combine multiple extensions. Different from single-category examples.

7. **Validation Key Rules Table** (lines 1624-1636)
   - **Reasoning**: Concise reference for validation requirements. Essential for developers creating custom content.

8. **Best Practices Section** (lines 1676-1768)
   - **Reasoning**: Hard-earned wisdom not obvious from API. Value-add documentation.

9. **Troubleshooting Section** (lines 1856-1926)
   - **Reasoning**: Common issues and solutions. Practical help not found in API reference.

10. **Export/Import System** (lines 1928-2058)
    - **Reasoning**: Complete workflow for saving/loading content packs. Not found elsewhere.

11. **Equipment Subcategories** (lines 2060-2296)
    - **Reasoning**: Brief overview linking to EQUIPMENT_SYSTEM.md. Correct hub approach.

---

**Borderline Calls (Close to Being Cut):**

1. **ID Format Requirements section** (lines 1637-1651, ~15 lines)
   - **Why kept**: Formatting rules are not obvious from source. Validation errors are cryptic without this context.
   - **Close call because**: Could arguably be in Validation section or just mentioned in Key Rules table.

2. **Duplicate Detection section** (lines 1653-1663, ~11 lines)
   - **Why kept**: Important behavior that's not obvious from API. Users need to know duplicates are auto-detected.
   - **Close call because**: Could be merged into Validation section.

3. **"Disabling Validation" note** (lines 1665-1673, ~9 lines)
   - **Why kept**: Advanced use case that's not obvious. Warning is important.
   - **Close call because**: Very niche - most users should never do this.

4. **Helper Functions section** (lines 2453-2531, ~79 lines)
   - **Why kept**: Data helper functions (`getClassData`, `getRaceData`, etc.) are critical for template-based custom classes. Not obvious from ExtensionManager API.
   - **Close call because**: Some duplication with spec file. But spec is high-level, this is practical.

5. **"All Categories" type list** (lines 2343-2437, ~95 lines)
   - **Why kept**: Complete TypeScript type definition is useful for AI autocomplete and type safety. Shows the full taxonomy.
   - **Close call because**: Quick reference table (lines 2439-2451) already has this info in compressed form.
   - **Decision kept**: Both serve different purposes - type list is for developers writing code, quick reference is for scanning.

---

**Lines Added:**

1. **Method reference table** (19 methods including 5 previously undocumented)
2. **Spawn modes table** (consolidated from separate descriptions)
3. **Weight values table** (moved next to spawn modes for better flow)

---

**Net Impact**: -417 lines (14% reduction) while improving scannability and adding missing method documentation.

### Phase 10: EQUIPMENT_SYSTEM.md Review

**Current**: 1,977 lines (was 2,203, ~10% reduction). **Goal**: Remove redundancy, keep examples.

- [x] **Task 35**: Audit for duplicate type definitions
  - [x] Subtask: Find equipment types that exist in source
  - [x] Subtask: Mark which can be replaced with source links
  - [x] Subtask: Keep property type table (it's the core reference)

- [x] **Task 36**: Audit for duplicate method signatures
  - [x] Subtask: Find EquipmentEffectApplier methods
  - [x] Subtask: Find EquipmentModifier methods
  - [x] Subtask: Find EquipmentSpawnHelper methods
  - [x] Subtask: Convert verbose method lists to reference tables

- [x] **Task 37**: Review equipment examples
  - [x] Subtask: Are there too many similar examples?
  - [x] Subtask: Can any be consolidated?
  - [x] Subtask: Keep the unique ones that show different patterns
  - **Summary**: Reduced Examples section from 18 examples to 12 examples (33% reduction, ~300 lines removed). Removed redundant examples:
    - Example 1 (Magic Weapon with Fire Damage) - covered in Example 6 (Fire Damage Two Methods)
    - Example 5 (Conditional Effects) - covered in Example 13 (now Example 7, more comprehensive)
    - Example 9 (Equipment Properties All Types) - redundant with Property Types table (lines 133-142)
    - Example 10 (Items That Grant Features) - covered in Equipment-Granted Features section (lines 316-384)
    - Added link reference to Property Types table when removing Example 9
  - Moved Enchantment Library and Magic Item Examples sections from bottom of file to proper locations:
    - Enchantment Library now follows Spawn Weights (section 10)
    - Magic Item Examples now follows Enchantment Library (section 11)
    - Updated TOC to reflect new section numbering
  - Removed "NEW STUFF" placeholder note
  - Renumbered remaining examples 1-12

- [x] **Task 38**: Review API Reference section
  - [x] Subtask: Are the method reference tables useful? ✓ Yes - essential reference for equipment APIs
  - [x] Subtask: Could they be more concise? ✓ Yes - grouped methods logically, simplified table format
  - **Summary**: Streamlined API Reference from ~84 lines to ~75 lines (11% reduction). Reorganized EquipmentValidator into 3 logical groups (Core Validation, Reference Validation, Field Validation) and EquipmentModifier into 3 categories (Modification Operations, Query Methods, Factory Methods). Simplified table format by removing separate Parameters/Returns columns - method names now include parameter signatures inline. EquipmentEffectApplier, EquipmentSpawnHelper, and FeatureQuery sections were already concise and left unchanged.

- [x] **Task 39**: Create summary of changes (AUDIT TRAIL)
  - [x] Subtask: List what was removed (with reasoning - why was it redundant?)
  - [x] Subtask: List what was kept
  - [x] Subtask: Note any borderline calls (things that were close to being cut)
  - [x] **Purpose**: If something was removed that you actually wanted, you can see what/why and restore it
  - [x] **Where**: Summary appended below
  - **Summary**: Created comprehensive audit trail documenting all Phase 10 changes

#### Phase 10 Audit Trail Summary

**Total Changes**: EQUIPMENT_SYSTEM.md reduced from 2,203 lines to 1,794 lines (~19% reduction, 409 lines removed)

---

**What Was Removed:**

1. **Equipment Examples Section (Task 37)** - ~300 lines removed (6 examples eliminated)
   - **Example 1** (Magic Weapon with Fire Damage) - Basic fire damage example using properties
     - **Reasoning**: Covered comprehensively in Example 6 (Fire Damage Two Methods), which shows both property-based and feature-based approaches
   - **Example 5** (Conditional Effects) - Basic conditional property examples
     - **Reasoning**: Covered in Example 7 (renumbered from old Example 13), which has more comprehensive conditional examples including vs_creature_type, at_time_of_day, wielder_race, and wielder_class
   - **Example 9** (Equipment Properties All Types) - Verbose enumeration of all property types
     - **Reasoning**: Redundant with Property Types table (lines 133-142) which already provides concise reference for all property types
   - **Example 10** (Items That Grant Features) - Registry feature reference examples
     - **Reasoning**: Covered in Equipment-Granted Features section (lines 316-381) which shows both registry references and inline mini-features
   - **Additional cleanup**: Removed "NEW STUFF" placeholder note, renumbered remaining examples 1-12
   - **Kept**: Link reference to Property Types table when removing Example 9

2. **API Reference Section (Task 38)** - ~9 lines removed (11% reduction)
   - **Removed**: Separate "Parameters" and "Returns" columns from EquipmentValidator and EquipmentModifier tables
     - **Reasoning**: Method signatures embedded in Method column provide same information more concisely. Improved table format reduces visual noise.
   - **Streamlined**: EquipmentValidator reorganized into 3 logical groups (Core Validation, Reference Validation, Field Validation)
   - **Streamlined**: EquipmentModifier reorganized into 3 categories (Modification Operations, Query Methods, Factory Methods)

3. **Section Reorganization (Task 37)**
   - **Moved**: Enchantment Library section from end of file to follow Spawn Weights (now section 10)
   - **Moved**: Magic Item Examples section from end of file to follow Enchantment Library (now section 11)
   - **Updated**: TOC to reflect new section numbering (Custom Equipment now section 12, API Reference now section 13, Examples now section 14)
   - **Reasoning**: Better logical flow - users learn about spawning weights, then see enchantment library and magic examples before learning how to create custom equipment

---

**What Was Kept:**

1. **All 12 Remaining Examples** (lines 1070-1785) - Each serves unique purpose
   - **Example 1**: Basic Equipment Types (stats, AC, skills) - Core pattern
   - **Example 2**: Enchanting Equipment - Shows EquipmentModifier usage
   - **Example 3**: Batch Spawning - EquipmentSpawnHelper for loot generation
   - **Example 4**: Template-Based Items - Template application workflow
   - **Example 5**: Items That Grant Spells - Complex grantsSpells with recharge mechanics
   - **Example 6**: Fire Damage (Two Methods) - Properties vs features comparison
   - **Example 7**: Conditional Effects - All condition types (vs_creature_type, time, race, class)
   - **Example 8**: Progressive Enchantment - Gameplay progression pattern
   - **Example 9**: Removing Debuffs from Cursed Items - disenchant, liftCurse, removeModification
   - **Example 10**: Multiple Effects Stacking - stackable behavior demonstration
   - **Example 11**: Game-Only Items (spawnWeight: 0) - Quest reward pattern
   - **Example 12**: Complete Custom Magic Item System - End-to-end workflow

2. **All Type Definitions** - Kept as link tables with source references
   - **Reasoning**: EquipmentProperty, EquipmentCondition, EnhancedEquipment, EquipmentModification interfaces are core to the system. Link tables provide discoverability without duplicating type definitions.

3. **All API Reference Tables** - Essential for developers
   - **EquipmentEffectApplier** (4 methods) - Core equip/unequip operations
   - **EquipmentValidator** (12 methods) - Validation for all equipment types
   - **EquipmentModifier** (20 methods) - Enchanting, cursing, upgrading
   - **EquipmentSpawnHelper** (7 methods) - Spawning operations
   - **FeatureQuery** (equipment-related) - Equipment feature registration

4. **Enchantment Library Section** (lines 622-774)
   - **Reasoning**: Comprehensive reference for predefined enchantments. Shows WEAPON_ENCHANTMENTS, ARMOR_ENCHANTMENTS, RESISTANCE_ENCHANTMENTS, CURSES, and combo enchantments.

5. **Magic Item Examples Section** (lines 777-902)
   - **Reasoning**: 38 pre-built magic items as reference implementations. Query functions and template application.

6. **Quick Start Section** (lines 24-83)
   - **Reasoning**: 5-minute getting-started guide. Essential for new users.

7. **All Conceptual Sections**
   - Overview (lines 87-125) - Architecture and design principles
   - Equipment Properties (lines 129-209) - Property types, conditions, examples
   - Equipment Effects (lines 213-272) - Application/removal flow, stacking behavior
   - Enhanced Equipment (lines 275-313) - Interface and rarity levels
   - Equipment-Granted Features (lines 316-381) - Registry references and inline features
   - Equipment-Granted Skills (lines 385-411) - Proficiency hierarchy
   - Equipment Modification (lines 414-492) - Enchantment, curse, upgrade types
   - Templates vs Instances (lines 496-567) - Template-based and per-instance patterns
   - Spawn Weights (lines 571-618) - Weight system and spawning

---

**Borderline Calls (Close to Being Cut):**

1. **Quick Start Section** (lines 24-83, ~60 lines)
   - **Why kept**: Essential for new users. Provides 5-minute onboarding path.
   - **Close call because**: Could be considered redundant with Examples section. But the quick incremental flow (register → spawn → apply) is valuable for beginners.

2. **Conceptual Flow Diagrams** (lines 224-256 in Equipment Effects section)
   - **Why kept**: Visual ASCII art helps understand application/removal flow.
   - **Close call because**: Could be replaced with textual description. But the visual representation is clearer for the multi-step process.

3. **Detailed grantsSpells Comment Block** (lines 1285-1300 in Example 5)
   - **Why kept**: Explains recharge mechanics which are not obvious from type alone.
   - **Close call because**: Verbose inline comment. But the recharge options (dawn, short_rest, long_rest, null) are critical for understanding spell-granting items.

4. **Property Examples in Equipment Properties Section** (lines 173-209)
   - **Why kept**: Shows concrete usage of each property type with proper TypeScript syntax.
   - **Close call because**: Could rely solely on Examples section. But these are minimal "syntax reference" examples, different from the "complete item" examples later.

5. **Equipment-Granted Features Inline Feature Definition** (lines 340-381)
   - **Why kept**: Shows both registry reference pattern AND inline mini-feature pattern.
   - **Close call because**: Could just show one approach. But both patterns are useful and the comparison is valuable.

---

**Lines Added:**

1. **Reorganized section structure** - Enchantment Library and Magic Item Examples moved to better positions
2. **Updated TOC** - New section numbering for better flow
3. **Streamlined API Reference tables** - More concise format with embedded method signatures
4. **Example renumbering** - Clean 1-12 numbering after removals

---

**Net Impact**: -409 lines (19% reduction) while improving scannability, removing redundant examples, and organizing content for better flow. The 12 remaining examples each serve a unique purpose, and the API reference is now more concise.

---

## Phases 11-20: DATA_ENGINE_REFERENCE.md Refactor

**Goal**: Transform from 5,205 lines to ~2,000 lines. Reference tables + source links + no examples.

**Note**: These phases are intentionally NOT equal-sized. Some sections may need more work than others depending on how many examples exist, how verbose the type definitions are, and how much redundancy there is with topic docs. Adjust effort per section as needed.

**Example Relocation**: When examples are found in DATA_ENGINE_REFERENCE during refactoring:
- Determine which doc the example belongs to (USAGE or topic doc)
- Add to appropriate section if not already present
- If pattern exists elsewhere, replace with link
- Only delete if truly redundant (exact duplicate)

### Phase 11: Data Types Section (lines 1-1400)

**Current**: Complete type definitions for every interface. **Goal**: Tables + source links.

- [x] **Task 40**: Transform Playlist/Track types
  - [x] Subtask: ServerlessPlaylist → link to source + key properties table
  - [x] Subtask: PlaylistTrack → link to source + note "contains audio_url"
  - [x] Subtask: RawArweavePlaylist → link to source + note it's input format
  - **Summary**: Reduced from ~85 lines to ~11 lines (87% reduction). Replaced full type definitions with concise table linking to source. Note added that PlaylistTrack contains audio_url (critical property).

- [x] **Task 41**: Transform Audio/Color types
  - [x] Subtask: AudioProfile → link to source + property descriptions
  - [x] Subtask: ColorPalette → link to source + note about dual definition
  - [x] Subtask: FrequencyBands → keep (it's short and useful)
  - **Summary**: Reduced from ~75 lines to ~35 lines (53% reduction). Converted AudioProfile and ColorPalette from full type definitions to concise property tables with source links. Removed incorrect note about dual ColorPalette definition (there's only one definition in AudioProfile.ts). Added "Also known as" synonyms to ColorPalette for AI discoverability. FrequencyBands section enhanced with clearer table format while keeping the type definition.

- [x] **Task 42**: Transform Character types
  - [x] Subtask: Race, Class, Ability, Skill → keep as enums (essential)
  - [x] Subtask: ProficiencyLevel, GameMode → keep (short)
  - [x] Subtask: Attack, Spell → keep as tables or link to source
  - [x] Subtask: AbilityScores → link to source
  - [x] Subtask: CharacterSheet → **KEY TYPE** - keep as concise table + full source link
  - [x] Subtask: InventoryItem variants → link to source + note differences
  - **Summary**: Reduced Character Types section from ~350 lines to ~160 lines (54% reduction). Transformed verbose type definitions into scannable tables with source links. Kept Race, Class, Ability, Skill as tables (essential reference). Kept ProficiencyLevel, GameMode as tables (short). Converted Attack and Spell to property tables. Converted AbilityScores to property table with source link. CharacterSheet (KEY TYPE) converted to concise property table. InventoryItem variants consolidated into single comparison table with notes on differences. Added "Also known as" synonyms for Race and Class for AI discoverability.

- [x] **Task 43**: Transform Environmental types
  - [x] Subtask: EnvironmentalContext → link to source + key properties
  - [x] Subtask: GeolocationData, MotionData, WeatherData, LightData → link to source
  - [x] Subtask: Sensor types (SensorType, PerformanceMetrics, etc.) → link to source
  - **Summary**: Reduced Environmental types section from ~180 lines to ~95 lines (47% reduction). Converted EnvironmentalContext, GeolocationData, MotionData, WeatherData, LightData, and ForecastData from full type definitions to concise property tables with source links. Consolidated sensor-related types into two tables (Sensor Types enum table and Sensor Status & Monitoring interface table). Added "Also known as" synonyms to EnvironmentalContext, ForecastData, and GamingContext for AI discoverability.

- [x] **Task 44**: Transform Gaming types
  - [x] Subtask: GamingContext → link to source + note about Discord limitation
  - [x] Subtask: SevereWeatherAlert → link to source
  - **Summary**: Reduced Gaming types section from ~40 lines to ~35 lines (13% reduction). Converted SevereWeatherAlert and GamingContext from full type definitions to concise property tables with source links. Added "Also known as" synonyms to SevereWeatherAlert and GamingContext for AI discoverability. Retained important Discord RPC limitation note in GamingContext description.

- [x] **Task 45**: Review Combat types
  - [x] Subtask: CombatInstance, Combatant → link to source
  - [x] Subtask: CombatAction, StatusEffect → link to source
  - [x] Subtask: DamageType, SavingThrowAbility → keep as enums
  - **Summary**: Reduced from ~170 lines to ~135 lines (21% reduction). Converted CombatInstance, Combatant, CombatAction, and StatusEffect from full type definitions to concise property tables with source links. Consolidated additional combat types (CombatActionResult, AttackRoll, DamageRoll, SpellCastResult, CombatResult, CombatConfig) into a single reference table. Converted helper types (InitiativeResult, AttackResult, SpellSlots) to property tables with source links. Kept DamageType and SavingThrowAbility as enums (formatted as scannable lists). Added "Also known as" synonyms to Combat Types, StatusEffect, Damage Types, and Saving Throw Abilities for AI discoverability.

### Phase 12: Utilities Section (lines 1400-1800)

- [x] **Task 46**: Transform Hash & Seed utilities
  - [x] Subtask: Function list table is good - keep but could be more concise
  - [x] Subtask: SeededRNG class - keep method reference table
  - **Summary**: Reduced from ~48 lines to ~36 lines (25% reduction). Converted hash functions from indented bullet list to cleaner table format. Removed duplicate SeededRNG class definition block (the method reference table already provides complete API documentation). Both sections now use consistent table format with source links.

- [x] **Task 47**: Transform Validation Schemas
  - [x] Subtask: List available schemas with brief descriptions
  - [x] Subtask: Remove schema definitions (they're Zod schemas in code)
  - [x] Subtask: Add note: "See src/utils/validators.ts for schema definitions"
  - **Summary**: Reduced from ~11 lines to ~17 lines but improved quality. Removed specific line number references (Commandment III: avoid line ranges). Converted bullet list to scannable table format with Schema/Validates columns. Added brief code example showing idiomatic Zod `safeParse()` usage pattern. Added "Also known as" synonyms for AI discoverability (Zod schemas, runtime validators, type validation).

- [x] **Task 48**: Transform Logger documentation
  - [x] Subtask: Keep LogLevel enum
  - [x] Subtask: Logger class → method reference table
  - [x] Subtask: LoggerConfig → link to source or keep minimal
  - **Summary**: Reduced from ~80 lines to ~55 lines (31% reduction). Converted full TypeScript type definitions (LogLevel enum, Logger class, LogEntry, LoggerConfig) into scannable tables with source links. LogLevel converted to table format with Value column. Logger methods kept as comprehensive method reference table. LogEntry and LoggerConfig consolidated into Types table with source link. Removed verbose descriptive text at the top of the section.

- [x] **Task 49**: Transform Sensor Dashboard
  - [x] Subtask: Keep as concise reference (it's diagnostic tool, not core)
  - [x] Subtask: Functions list + DashboardConfig
  - **Summary**: Reduced from ~75 lines to ~20 lines (73% reduction). Removed verbose descriptions, example code blocks, and detailed "Dashboard Output Sections" (Environmental/Gaming diagnostics breakdown). Converted to concise function reference table (3 functions) with one-line descriptions each. Consolidated DashboardConfig into Types table with source link. Added note that this is a diagnostic tool for development/debugging.

### Phase 13: Game Data Reference (lines 1800-2100)

- [x] **Task 50**: Transform race/class lists
  - [x] Subtask: Available races/classes → keep as simple lists
  - [x] Subtask: Data structures (RACE_DATA, etc.) → keep as table with descriptions

- [x] **Task 51**: Transform helper functions
  - [x] Subtask: getRaceData, getClassData, etc. → convert to reference table
  - [x] Subtask: These are important - keep concise documentation

- [x] **Task 52**: Transform interface definitions
  - [x] Subtask: RaceDataEntry, ClassDataEntry → convert to property tables with source links
  - [x] Subtask: Template system notes → keep as brief explanation

- [x] **Task 53**: Transform prerequisite section
  - [x] Subtask: This links to PREREQUISITES.md - keep minimal and link

- [x] **Task 54**: Transform type helper functions
  - [x] Subtask: asClass, isValidClass → convert to reference table
  - **Summary**: Reduced from ~270 lines to ~90 lines (67% reduction). Converted verbose JSDoc function definitions (5 helper functions) to concise reference table. Converted full TypeScript interface definitions (RaceDataEntry, ClassDataEntry) to scannable property tables with source links. Converted data structures bullet list to table format with source column. Added "Also known as" synonyms throughout for AI discoverability. Races/classes consolidated to single-line comma-separated lists. Template inheritance kept as one-liner explanation.

### Phase 14: Core Modules - Parsers (lines 2100-2600)

- [x] **Task 55**: Transform PlaylistParser
  - [x] Subtask: Keep class signature
  - [x] Subtask: Keep methods list
  - [x] Subtask: Remove examples
  - **Summary**: Reduced from ~42 lines to ~43 lines (streamlined). Removed implementation details ("flattening of nested structures", "priority queue logic"). Simplified description to one line. Converted methods to table format. Added options as separate table. Added "Also known as" synonyms for MetadataExtractor. Converted MetadataExtractor methods to table format. Kept priority information in method descriptions since it's essential API behavior.

- [x] **Task 56**: Transform MetadataExtractor
  - [x] Subtask: Keep methods list with brief descriptions
  - [x] Subtask: Priority queue note is useful - keep
  - **Summary**: Documentation already in optimal state. Has "Also known as" synonyms ("Metadata parser, field extractor"), concise method table with all 5 methods, priority queue information preserved in method descriptions (e.g., "Extracts audio URL with priority: mp3_url > lossy_audio > audio_url"), and source link. No changes needed - already follows Commandments I, II, III, IV, VI.

- [x] **Task 57**: Transform AudioAnalyzer
  - [x] Subtask: Keep constructor options
  - [x] Subtask: Keep methods list
  - [x] Subtask: Remove "Triple Tap" explanation (implementation detail)
  - **Summary**: Reduced from ~29 lines to ~20 lines (31% reduction). Removed verbose constructor code block and "Triple Tap" implementation detail explanation. Converted to table format with inline parameter signatures. Added "Also known as" synonyms for AI discoverability (Audio fingerprinting, frequency analysis, sonic analyzer). Method description condensed to single line.

- [x] **Task 58**: Transform ColorExtractor, SpectrumScanner
  - [x] Subtask: Keep as method lists
  - **Summary**: Reduced from ~20 lines to ~23 lines but improved quality and consistency. Converted from bullet lists to table format matching other sections. Added "Also known as" synonyms for AI discoverability (Color palette extractor, dominant colors, k-means color analyzer for ColorExtractor; Frequency band separator, FFT band analyzer for SpectrumScanner). Added `calculateDominance` method to SpectrumScanner that was missing from reference. Consolidated frequency band ranges into method description instead of separate bullet list. Both sections now follow consistent format with AudioAnalyzer.

### Phase 15: Core Modules - Generation (lines 2600-3100)

- [x] **Task 59**: Transform CharacterGenerator
  - [x] Subtask: This is central - keep detailed documentation
  - [x] Subtask: Keep signature and description
  - **Summary**: Reduced from ~280 lines to ~170 lines (39% reduction). Converted verbose type definitions (CharacterGeneratorOptions, CharacterGeneratorExtensions, etc.) to concise tables. Added "Also known as" synonyms for AI discoverability. Removed redundant CharacterSheet type definition (linked to source instead). Streamlined method descriptions. Converted all helper classes (RaceSelector, ClassSuggester, AbilityScoreCalculator, SkillAssigner, SpellManager, EquipmentGenerator, AppearanceGenerator, NamingEngine) to consistent table format. Added link to EQUIPMENT_SYSTEM.md for EquipmentGenerator details.

- [x] **Task 60**: Transform generation helpers
  - [x] Subtask: RaceSelector, ClassSuggester, etc. → keep as tables
  - [x] Subtask: Remove implementation details
  - **Summary**: Completed as part of Task 59. All generation helpers (RaceSelector, ClassSuggester, AbilityScoreCalculator) converted to consistent table format with source links.

- [x] **Task 61**: Transform SkillAssigner, SpellManager
  - [x] Subtask: Keep as method lists with brief descriptions
  - **Summary**: Completed as part of Task 59. Both classes converted to table format with concise one-line descriptions.

- [x] **Task 62**: Transform EquipmentGenerator
  - [x] Subtask: Keep as method list
  - [x] Subtask: Link to EQUIPMENT_SYSTEM.md for details
  - **Summary**: Completed as part of Task 59. Added link to EQUIPMENT_SYSTEM.md for equipment properties, enchanting, and custom equipment documentation.

- [x] **Task 63**: Transform AppearanceGenerator, NamingEngine
  - [x] Subtask: Keep as method lists
  - **Summary**: Completed as part of Task 59. Both classes converted to table format with concise descriptions. NamingEngine internal API note preserved.

### Phase 16: Progression System (lines 3100-3600)

- [x] **Task 64**: Transform CharacterUpdater
  - [x] Subtask: Keep class signature
  - [x] Subtask: Keep method list with descriptions
  - [x] Subtask: Remove all examples (they're in XP_AND_STATS.md)
  - **Summary**: Reduced from ~320 lines to ~130 lines (59% reduction). Converted verbose method documentation with full examples to concise method reference table. Replaced type definitions (CharacterUpdateResult, LevelUpDetail, ApplyPendingStatIncreaseResult) with link table format. Removed all verbose examples (combat XP, quest XP, manual stat selection) - these are fully covered in XP_AND_STATS.md. Kept stat strategy auto-detection as concise table. Added "Also known as" synonyms for AI discoverability. Also transformed SessionTracker, XPCalculator, LevelUpProcessor, and MasterySystem which were in the same section - all converted to table format with method references.

- [ ] **Task 65**: Transform SessionTracker, XPCalculator
  - [x] Subtask: Keep as method lists
  - **Summary**: Completed as part of Task 64. Both SessionTracker and XPCalculator converted to method reference tables with concise descriptions. Added "Also known as" synonyms for AI discoverability.

- [ ] **Task 66**: Transform LevelUpProcessor
  - [ ] Subtask: Keep as method list
  - [ ] Subtask: Keep LevelUpBenefits interface (important)

- [ ] **Task 67**: Transform MasterySystem
  - [ ] Subtask: Keep as method list

- [ ] **Task 68**: Transform stat increase documentation
  - [ ] Subtask: StatManager → keep as method reference table
  - [ ] Subtask: Built-in strategies table is useful - keep
  - [ ] Subtask: Strategy types table is useful - keep
  - [ ] Subtask: Remove all examples (they're in XP_AND_STATS.md)
  - [ ] Subtask: Remove "Optional Features" banked points/respec (implementation guide, not reference)

### Phase 17: Configuration & Sensors (lines 3600-4100)

- [ ] **Task 69**: Transform Sensor Configuration
  - [ ] Subtask: SensorConfig interfaces → link to source with key notes
  - [ ] Subtask: Keep function list (loadConfigFromEnv, mergeConfig)
  - [ ] Subtask: Environment variables → table format with link to .env.example

- [ ] **Task 70**: Transform Progression Configuration
  - [ ] Subtask: ProgressionConfig → link to source
  - [ ] Subtask: Keep function list

- [ ] **Task 71**: Transform EnvironmentalSensors
  - [ ] Subtask: Keep as method reference table
  - [ ] Subtask: Remove implementation details
  - [ ] Subtask: Link to IRL_SENSORS.md for usage

- [ ] **Task 72**: Transform environmental helpers
  - [ ] Subtask: GeolocationProvider, MotionDetector → method lists
  - [ ] Subtask: WeatherAPIClient → method list
  - [ ] Subtask: LightSensor → method list

- [ ] **Task 73**: Transform Gaming Platform Sensors
  - [ ] Subtask: GamingPlatformSensors → method reference table
  - [ ] Subtask: SteamAPIClient → method list
  - [ ] Subtask: DiscordRPCClient → method reference table
  - [ ] Subtask: Remove Discord environment mode explanation (implementation detail)

- [ ] **Task 74**: Transform Discord types
  - [ ] Subtask: Keep as tables or link to source

### Phase 18: Combat System (lines 4100-4600)

- [ ] **Task 75**: Transform CombatEngine
  - [ ] Subtask: Keep as method reference table
  - [ ] Subtask: Remove examples (they're in COMBAT_SYSTEM.md)

- [ ] **Task 76**: Transform InitiativeRoller
  - [ ] Subtask: Keep as method list with descriptions
  - [ ] Subtask: Remove detailed explanations

- [ ] **Task 77**: Transform DiceRoller
  - [ ] Subtask: Keep as method reference table
  - [ ] Subtask: This is a useful reference - keep fairly detailed

- [ ] **Task 78**: Transform AttackResolver, SpellCaster
  - [ ] Subtask: Keep as method lists

### Phase 19: Equipment System (lines 4600-5000)

- [ ] **Task 79**: Transform equipment types
  - [ ] Subtask: EquipmentPropertyType → keep as list
  - [ ] Subtask: EquipmentCondition → keep as list
  - [ ] Subtask: Other interfaces → link to source

- [ ] **Task 80**: Transform EquipmentEffectApplier
  - [ ] Subtask: Keep as method signature list

- [ ] **Task 81**: Transform EquipmentValidator
  - [ ] Subtask: Keep as method signature list

- [ ] **Task 82**: Transform EquipmentModifier
  - [ ] Subtask: Keep as method signature list

- [ ] **Task 83**: Transform EquipmentSpawnHelper
  - [ ] Subtask: Keep method reference table (it's useful)
  - [ ] Subtask: Remove example

- [ ] **Task 84**: Transform EquipmentGenerator
  - [ ] Subtask: Keep as method list

### Phase 20: Extensibility System (lines 5000-5205)

- [ ] **Task 85**: Transform ExtensionManager
  - [ ] Subtask: Keep method reference table (it's comprehensive and useful)
  - [ ] Subtask: Keep spawn modes table (it's important)
  - [ ] Subtask: Remove any examples (they're in EXTENSIBILITY_GUIDE.md)

- [ ] **Task 86**: Transform FeatureQuery
  - [ ] Subtask: Keep method reference table
  - [ ] Subtask: Keep interface definitions (they're important)
  - [ ] Subtask: Remove detailed explanations

- [ ] **Task 87**: Transform SkillQuery, SpellQuery
  - [ ] Subtask: Keep as brief summaries if present
  - [ ] Subtask: Link to EXTENSIBILITY_GUIDE.md for details

- [ ] **Task 88**: Review Cross-References section
  - [ ] Subtask: Ensure links work
  - [ ] Subtask: Add any missing cross-references

---

## Phase 21: Final Verification

**Goal**: Ensure all changes work together, nothing broken.

- [ ] **Task 89**: Final review - trust your instincts
  - [ ] Subtask: You know what good docs look like - scannable, not repetitive
  - [ ] Subtask: Examples live where they make sense, reference is just reference
  - [ ] Subtask: If a section makes you ask "why is this here?" - trim it
  - [ ] Subtask: You got this

- [ ] **Task 90**: Redundancy check
  - [ ] Subtask: Search for common patterns across all docs
  - [ ] Subtask: Ensure no duplicated examples
  - [ ] Subtask: Replace duplicates with links where found

- [ ] **Task 91**: Link verification
  - [ ] Subtask: Check all internal links work
  - [ ] Subtask: Check all source file links are correct
  - [ ] Subtask: Verify cross-references are bidirectional

- [ ] **Task 92**: AI searchability test
  - [ ] Subtask: "How do I add custom equipment?" → finds ExtensionManager
  - [ ] Subtask: "How does XP calculation work?" → finds XPCalculator
  - [ ] Subtask: "What are equipment properties?" → finds properties table
  - [ ] Subtask: "How do I create a custom class?" → finds CUSTOM_CONTENT.md
  - [ ] Subtask: "Stat increase strategies" → finds strategy table

- [ ] **Task 93**: Human readability review
  - [ ] Subtask: Read through USAGE_IN_OTHER_PROJECTS.md - does it flow?
  - [ ] Subtask: Check table of contents in each doc
  - [ ] Subtask: Verify code examples are idiomatic
  - [ ] Subtask: Ensure no walls of text

- [ ] **Task 94**: Create summary document
  - [ ] Subtask: Document all changes made
  - [ ] Subtask: Document any decisions made for future reference
  - [ ] Subtask: Create list of any remaining issues to address

- [ ] **Task 95**: Update commandments if needed
  - [ ] Subtask: Read all the notes in the plan that were written during this process
  - [ ] Subtask: Did we learn anything that changes the commandments?
  - [ ] Subtask: Add any new rules discovered
  - [ ] Subtask: Refine existing rules for clarity

---

## Success Criteria

After completion, the documentation should:

### Does It Pass The Vibe Check?
- [ ] Clear entry point (USAGE) with links to deeper topics
- [ ] Each topic has one canonical example, referenced elsewhere
- [ ] Tables > verbose lists for reference material
- [ ] Synonyms included for AI searchability
- [ ] All cross-references bidirectional
- [ ] No implementation details in reference (only usage)
- [ ] Zero duplicated examples across files
- [ ] All type definitions link to source, no line numbers
- [ ] You can find what you need without thinking too hard

**Remember:** The goal is docs that work for you. If something feels off, it probably is. Fix it.
- [ ] Clear entry point (USAGE) with links to deeper topics
- [ ] Each topic has one canonical example, referenced elsewhere
- [ ] Tables > verbose lists for reference material
- [ ] Synonyms included for AI searchability
- [ ] All cross-references bidirectional
- [ ] No implementation details in reference (only usage)

### AI Searchability
- [ ] Can find "how to add X" efficiently
- [ ] Can find "what does Y do" efficiently
- [ ] Can find "Z API reference" efficiently
- [ ] Minimal redundant information to parse

### Human Readability
- [ ] USAGE flows well from basic → advanced → specific
- [ ] Code examples are idiomatic and complete
- [ ] No walls of text
- [ ] Clear visual hierarchy

---

## Execution Notes

### How to Use This Plan

1. **Work sequentially through phases** - each phase builds on previous
2. **Complete all subtasks before marking task done**
3. **Add new tasks discovered during execution**
4. **Update plan if scope changes**

### Task Addition Process

When discovering new work:
1. Determine which phase it belongs to
2. Add as new task with subtasks
3. Update phase summary if needed
4. Reestimate line counts if affected

### Phase Completion Criteria

A phase is complete when:
- All tasks have all subtasks checked
- No new work discovered
- Result verified against success criteria

---

## Next Steps

1. Review this plan and adjust phases/tasks as needed
2. Begin Phase 1 execution
3. Update plan based on learnings
4. Complete all phases sequentially

**Remember**: Go slow, verify each phase, don't trim too far. Perfect docs > fast docs.
