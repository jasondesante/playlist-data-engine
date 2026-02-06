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

- [ ] **Task 13**: "Advanced Character Features" review
  - [ ] Subtask: **User note**: This could be written in a tighter way
  - [ ] Subtask: Link to EQUIPMENT_SYSTEM.md for equipment details
  - [ ] Subtask: Link to XP_AND_STATS.md for stat strategies

- [ ] **Task 14**: "Environmental Sensors" and "Gaming Platform Integration"
  - [ ] Subtask: These just link to IRL_SENSORS.md - good
  - [ ] Subtask: Could add one-line each about what they provide

- [ ] **Task 15**: "Combat System" link
  - [ ] Subtask: Just links to COMBAT_SYSTEM.md - correct approach

### Phase 5: Advanced Examples Section

**Goal**: Show pipeline without being verbose.

- [ ] **Task 16**: Review "Combining All Systems"
  - [ ] Subtask: **User note**: This full pipeline example is really good - shows the flow well
  - [ ] Subtask: A little redundancy is good here - reiterates and drives home the important parts
  - [ ] Subtask: Maybe note minor improvements, but don't suggest major changes
  - [ ] **Note**: Valuable reference that shows the complete flow

### Phase 6: Extensibility System Section

**Goal**: Hub section that points to deeper docs. Already cleaned up - just verify polish.

- [ ] **Task 17**: Review current state
  - [ ] Subtask: Is the one-sentence description clear and sufficient?
  - [ ] Subtask: Are the bullet points under "See EXTENSIBILITY_GUIDE.md for:" useful?

- [ ] **Task 18**: Verify all links work
  - [ ] Subtask: EXTENSIBILITY_GUIDE.md
  - [ ] Subtask: CUSTOM_CONTENT.md
  - [ ] Subtask: PREREQUISITES.md
  - [ ] Subtask: EQUIPMENT_SYSTEM.md
  - [ ] Subtask: DATA_ENGINE_REFERENCE.md

- [ ] **Task 19**: Check for any remaining redundancy
  - [ ] Subtask: Is there anything here that's duplicated elsewhere?
  - [ ] Subtask: Is the section doing its job as a "hub" or is it trying to do too much?

### Phase 7: Equipment System Section

**Goal**: Brief overview + link to EQUIPMENT_SYSTEM.md.

- [ ] **Task 20**: Review equipment section intro
  - [ ] Subtask: Is the link to EQUIPMENT_SYSTEM.md prominent?

- [ ] **Task 21**: Review "Registering, Spawning, and Enchanting Custom Equipment"
  - [ ] Subtask: This is covered in EQUIPMENT_SYSTEM.md - can be reduced to minimal example or link

- [ ] **Task 22**: Verify link to EQUIPMENT_SYSTEM.md

### Phase 8: Back-Matter Cleanup

**Goal**: Streamline everything after the main content.

- [ ] **Task 23**: "Validation Schemas" section
  - [ ] Subtask: Reduce to minimal hint: "All *Schema exports are Zod schemas for runtime validation"
  - [ ] Subtask: Keep ONE example showing how to use schemas
  - [ ] Subtask: Remove all schema definitions (they're in code)
  - [ ] **User note**: Condense to hints - developers know what Zod schemas are

- [ ] **Task 24**: "Available Exports" section (lines 654-802) - DRAGON BALL Z FUSION
  - [ ] Subtask: This content is spiritually the same as DATA_ENGINE_REFERENCE - they should FUSE
  - [ ] Subtask: DATA_ENGINE_REFERENCE becomes the ONE definitive API/export reference (tables + source links)
  - [ ] Subtask: USAGE replaces "Available Exports" with brief pointer to DATA_ENGINE_REFERENCE
  - [ ] Subtask: Ensure DATA_ENGINE_REFERENCE has complete, well-organized export tables first
  - [ ] Subtask: Then remove "Available Exports" from USAGE entirely, add only a link section

- [ ] **Task 25**: "Development Workflow" section
  - [ ] Subtask: Keep only project-specific workflow commands
  - [ ] Subtask: Remove obvious npm commands (install, test, build)
  - [ ] **User note**: Condense to hints - developers know standard npm commands

- [ ] **Task 26**: "Rebuilding After Changes" section
  - [ ] Subtask: Is this necessary? Can it be combined with Development Workflow?

- [ ] **Task 27**: "Environment Variables" section
  - [ ] Subtask: Convert to minimal table format
  - [ ] Subtask: Link to .env.example in project root for full details
  - [ ] Subtask: Remove all verbose descriptions
  - [ ] **User note**: Summarize in-place, don't create new files

- [ ] **Task 28**: "Troubleshooting" section
  - [ ] Subtask: Keep only common/non-obvious issues
  - [ ] Subtask: Remove obvious solutions (e.g., "did you run npm install?")
  - [ ] Subtask: Link to relevant docs for detailed help
  - [ ] **User note**: Summarize in-place, don't create new files

- [ ] **Task 29**: "Building Status" section
  - [ ] Subtask: Is this necessary? It's build output that changes
  - [ ] Subtask: Could be in a separate BUILD.md or CONTRIBUTING.md?

---

## Phases 9-10: Topic Docs Light-Touch Review

**Goal**: Light touch review of EXTENSIBILITY_GUIDE.md and EQUIPMENT_SYSTEM.md. Remove duplicate type definitions, keep examples.

### Phase 9: EXTENSIBILITY_GUIDE.md Review

**Current**: 2,961 lines. **Goal**: Remove redundancy, keep examples.

- [ ] **Task 30**: Audit for duplicate type definitions
  - [ ] Subtask: Find types that exist in source code
  - [ ] Subtask: Mark which ones can be replaced with source links
  - [ ] Subtask: Identify types that need explanation (custom augmentation patterns)

- [ ] **Task 31**: Audit for duplicate method signatures
  - [ ] Subtask: Find methods that just repeat what's in source
  - [ ] Subtask: Mark which can be replaced with reference tables
  - [ ] Subtask: Keep methods that have non-obvious behavior

- [ ] **Task 32**: Review ExtensionManager documentation
  - [ ] Subtask: Is the category table useful?
  - [ ] Subtask: Are the registration examples clear?
  - [ ] Subtask: Any redundant examples that duplicate USAGE?

- [ ] **Task 33**: Review spawn weight system docs
  - [ ] Subtask: Is this clear and well-explained?
  - [ ] Subtask: Any redundant with DATA_ENGINE_REFERENCE?

- [ ] **Task 34**: Create summary of changes (AUDIT TRAIL)
  - [ ] Subtask: List what was removed (with reasoning - why was it redundant?)
  - [ ] Subtask: List what was kept
  - [ ] Subtask: Note any borderline calls (things that were close to being cut)
  - [ ] **Purpose**: If something was removed that you actually wanted, you can see what/why and restore it
  - [ ] **Where**: Append summary to this phase's section in plan file

### Phase 10: EQUIPMENT_SYSTEM.md Review

**Current**: 2,203 lines. **Goal**: Remove redundancy, keep examples.

- [ ] **Task 35**: Audit for duplicate type definitions
  - [ ] Subtask: Find equipment types that exist in source
  - [ ] Subtask: Mark which can be replaced with source links
  - [ ] Subtask: Keep property type table (it's the core reference)

- [ ] **Task 36**: Audit for duplicate method signatures
  - [ ] Subtask: Find EquipmentEffectApplier methods
  - [ ] Subtask: Find EquipmentModifier methods
  - [ ] Subtask: Find EquipmentSpawnHelper methods
  - [ ] Subtask: Convert verbose method lists to reference tables

- [ ] **Task 37**: Review equipment examples
  - [ ] Subtask: Are there too many similar examples?
  - [ ] Subtask: Can any be consolidated?
  - [ ] Subtask: Keep the unique ones that show different patterns

- [ ] **Task 38**: Review API Reference section
  - [ ] Subtask: Are the method reference tables useful?
  - [ ] Subtask: Could they be more concise?

- [ ] **Task 39**: Create summary of changes (AUDIT TRAIL)
  - [ ] Subtask: List what was removed (with reasoning - why was it redundant?)
  - [ ] Subtask: List what was kept
  - [ ] Subtask: Note any borderline calls (things that were close to being cut)
  - [ ] **Purpose**: If something was removed that you actually wanted, you can see what/why and restore it
  - [ ] **Where**: Append summary to this phase's section in plan file

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

- [ ] **Task 40**: Transform Playlist/Track types
  - [ ] Subtask: ServerlessPlaylist → link to source + key properties table
  - [ ] Subtask: PlaylistTrack → link to source + note "contains audio_url"
  - [ ] Subtask: RawArweavePlaylist → link to source + note it's input format

- [ ] **Task 41**: Transform Audio/Color types
  - [ ] Subtask: AudioProfile → link to source + property descriptions
  - [ ] Subtask: ColorPalette → link to source + note about dual definition
  - [ ] Subtask: FrequencyBands → keep (it's short and useful)

- [ ] **Task 42**: Transform Character types
  - [ ] Subtask: Race, Class, Ability, Skill → keep as enums (essential)
  - [ ] Subtask: ProficiencyLevel, GameMode → keep (short)
  - [ ] Subtask: Attack, Spell → keep as tables or link to source
  - [ ] Subtask: AbilityScores → link to source
  - [ ] Subtask: CharacterSheet → **KEY TYPE** - keep as concise table + full source link
  - [ ] Subtask: InventoryItem variants → link to source + note differences

- [ ] **Task 43**: Transform Environmental types
  - [ ] Subtask: EnvironmentalContext → link to source + key properties
  - [ ] Subtask: GeolocationData, MotionData, WeatherData, LightData → link to source
  - [ ] Subtask: Sensor types (SensorType, PerformanceMetrics, etc.) → link to source

- [ ] **Task 44**: Transform Gaming types
  - [ ] Subtask: GamingContext → link to source + note about Discord limitation
  - [ ] Subtask: SevereWeatherAlert → link to source

- [ ] **Task 45**: Review Combat types
  - [ ] Subtask: CombatInstance, Combatant → link to source
  - [ ] Subtask: CombatAction, StatusEffect → link to source
  - [ ] Subtask: DamageType, SavingThrowAbility → keep as enums

### Phase 12: Utilities Section (lines 1400-1800)

- [ ] **Task 46**: Transform Hash & Seed utilities
  - [ ] Subtask: Function list table is good - keep but could be more concise
  - [ ] Subtask: SeededRNG class - keep method reference table

- [ ] **Task 47**: Transform Validation Schemas
  - [ ] Subtask: List available schemas with brief descriptions
  - [ ] Subtask: Remove schema definitions (they're Zod schemas in code)
  - [ ] Subtask: Add note: "See src/utils/validators.ts for schema definitions"

- [ ] **Task 48**: Transform Logger documentation
  - [ ] Subtask: Keep LogLevel enum
  - [ ] Subtask: Logger class → method reference table
  - [ ] Subtask: LoggerConfig → link to source or keep minimal

- [ ] **Task 49**: Transform Sensor Dashboard
  - [ ] Subtask: Keep as concise reference (it's diagnostic tool, not core)
  - [ ] Subtask: Functions list + DashboardConfig

### Phase 13: Game Data Reference (lines 1800-2100)

- [ ] **Task 50**: Transform race/class lists
  - [ ] Subtask: Available races/classes → keep as simple lists
  - [ ] Subtask: Data structures (RACE_DATA, etc.) → keep as table with descriptions

- [ ] **Task 51**: Transform helper functions
  - [ ] Subtask: getRaceData, getClassData, etc. → keep with JSDoc
  - [ ] Subtask: These are important - keep full documentation

- [ ] **Task 52**: Transform interface definitions
  - [ ] Subtask: RaceDataEntry, ClassDataEntry → keep with JSDoc
  - [ ] Subtask: Template system notes are important - keep

- [ ] **Task 53**: Transform prerequisite section
  - [ ] Subtask: This links to PREREQUISITES.md - keep minimal and link

- [ ] **Task 54**: Transform type helper functions
  - [ ] Subtask: asClass, isValidClass → keep with JSDoc

### Phase 14: Core Modules - Parsers (lines 2100-2600)

- [ ] **Task 55**: Transform PlaylistParser
  - [ ] Subtask: Keep class signature
  - [ ] Subtask: Keep methods list
  - [ ] Subtask: Remove examples

- [ ] **Task 56**: Transform MetadataExtractor
  - [ ] Subtask: Keep methods list with brief descriptions
  - [ ] Subtask: Priority queue note is useful - keep

- [ ] **Task 57**: Transform AudioAnalyzer
  - [ ] Subtask: Keep constructor options
  - [ ] Subtask: Keep methods list
  - [ ] Subtask: Remove "Triple Tap" explanation (implementation detail)

- [ ] **Task 58**: Transform ColorExtractor, SpectrumScanner
  - [ ] Subtask: Keep as method lists

### Phase 15: Core Modules - Generation (lines 2600-3100)

- [ ] **Task 59**: Transform CharacterGenerator
  - [ ] Subtask: This is central - keep detailed documentation
  - [ ] Subtask: Keep signature and description

- [ ] **Task 60**: Transform generation helpers
  - [ ] Subtask: RaceSelector, ClassSuggester, etc. → keep as tables
  - [ ] Subtask: Remove implementation details

- [ ] **Task 61**: Transform SkillAssigner, SpellManager
  - [ ] Subtask: Keep as method lists with brief descriptions

- [ ] **Task 62**: Transform EquipmentGenerator
  - [ ] Subtask: Keep as method list
  - [ ] Subtask: Link to EQUIPMENT_SYSTEM.md for details

- [ ] **Task 63**: Transform AppearanceGenerator, NamingEngine
  - [ ] Subtask: Keep as method lists

### Phase 16: Progression System (lines 3100-3600)

- [ ] **Task 64**: Transform CharacterUpdater
  - [ ] Subtask: Keep class signature
  - [ ] Subtask: Keep method list with descriptions
  - [ ] Subtask: Remove all examples (they're in XP_AND_STATS.md)

- [ ] **Task 65**: Transform SessionTracker, XPCalculator
  - [ ] Subtask: Keep as method lists

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
