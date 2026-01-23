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

**README.md Example Inventory with Line Numbers** (completed 2026-01-23):

README.md contains **10 code examples** (290 lines of example code total):

1. **Lines 54-77**: "Quick Start: Foundation (Phase 0)" example
   - Shows: PlaylistParser, AudioAnalyzer, CharacterGenerator basic workflow
   - Code block spans 24 lines
   - Demonstrates parse → analyze → generate flow with console logging

2. **Lines 83-101**: "Phase 1: Visual Analysis & Character Naming" example
   - Shows: ColorExtractor.extractColors() from artwork URL
   - Shows: NamingEngine.generateName() with (title, artist, audioProfile, class) params
   - Code block spans 19 lines
   - Demonstrates color palette extraction and RPG-style name generation

3. **Lines 105-130**: "Phase 2: Advanced Character Features" example
   - Shows: SkillAssigner.assignSkills() and filtering proficient skills
   - Shows: SpellManager.isSpellcaster() check and generateSpells()
   - Shows: EquipmentGenerator.generateStartingEquipment()
   - Shows: AppearanceGenerator.generateAppearance() from audioProfile and palette
   - Code block spans 26 lines
   - Demonstrates complete advanced character feature generation

4. **Lines 135-162**: "Phase 3: Progression & Leveling" example
   - Shows: SessionTracker.startSession(character.name) and endSession()
   - Shows: XPCalculator.calculateSessionXP(duration)
   - Shows: CharacterUpdater.applyListeningSession(character, session)
   - Shows: MasterySystem.recordPlaythrough() and isTrackMastered() checks
   - Code block spans 28 lines
   - Demonstrates full progression workflow with level-ups and mastery

5. **Lines 167-188**: "Phase 4: Environmental Sensors" example
   - Shows: EnvironmentalSensors constructor with OPTIONS OBJECT
     - enableLocation, enableMotion, enableWeather, weatherApiKey
   - Shows: requestPermissions() and getCurrentContext()
   - Shows: calculateXPModifier(context)
   - Code block spans 22 lines
   - **API DISCREPANCY**: Uses options object vs single API key in other docs

6. **Lines 192-217**: "Phase 5: Gaming Platform Integration" example
   - Shows: GamingPlatformSensors constructor with options object
     - steam: { apiKey, steamId, pollInterval }
     - discord: { clientId, enableRichPresence }
   - Shows: authenticate(userSteamId, discordUserId) - TWO PARAMS
   - Shows: startMonitoring(callback) with context access
   - Shows: calculateGamingBonus(context)
   - Code block spans 26 lines

7. **Lines 221-255**: "Phase 6: Combat System (Optional)" example
   - Shows: CombatEngine, AttackResolver, SpellCaster, InitiativeRoller imports
   - Shows: combatEngine.startCombat([player], [enemy]) - ARRAYS
   - Shows: executeAttack(combat, attacker, target, attack)
   - Shows: nextTurn(combat) and getCombatResult(combat)
   - Code block spans 35 lines
   - Demonstrates complete combat loop with initiative, attacks, results

8. **Lines 258-285**: "Complete Pipeline Example"
   - Shows: Full end-to-end workflow combining all systems
   - Shows: Environmental context + Gaming context integration
   - Shows: Compound bonus calculation (envMultiplier * gamingMultiplier)
   - Shows: updater.applyListeningSession() with modified session
   - Code block spans 28 lines
   - Demonstrates real-world usage with all features combined

9. **Lines 54-77 (repeated)**: Installation/Development section (not unique example)
   - Shows: npm install, npm test commands (bash commands, not TypeScript)

10. **Lines 288-311**: Development section (bash commands, not code examples)
    - Shows: npm test -- combat.test.ts (specific test file)
    - Shows: npm run test:ui, npm run test:coverage, npm run type-check
    - Shows: npm run dev (watch mode)

**Summary for README.md**:
- Total TypeScript code examples: 8 blocks (180 lines of example code)
- Plus 2 bash command sections (not code examples per se)
- Key findings:
  - API DISCREPANCY 1: EnvironmentalSensors constructor uses options object with enableLocation/enableMotion/enableWeather/weatherApiKey
  - API DISCREPANCY 2: GamingPlatformSensors.authenticate() takes TWO params (userSteamId, discordUserId)
  - API DISCREPANCY 3: CharacterUpdater.applyListeningSession() vs updateCharacterFromSession()
  - API DISCREPANCY 4: MasterySystem.recordPlaythrough()/isTrackMastered() vs checkMastery()/isJustMastered()
  - SessionTracker.startSession() doesn't show return value in usage
- Action required: All examples should be migrated to USAGE_IN_OTHER_PROJECTS.md before README.md deletion

**API Discrepancies Found (VERIFIED 2026-01-23):**

The following discrepancies were identified by comparing documentation claims against actual source code. These must be fixed in Phase 4.

1. **CharacterUpdater Method Name** ❌
   - **Incorrect (README.md lines 135, 149)**: `applyListeningSession()`
   - **Correct (Source code)**: `updateCharacterFromSession()`
   - **Actual signature**: `updateCharacterFromSession(character: CharacterSheet, session: ListeningSession, track?: PlaylistTrack, previousListenCount: number = 0): CharacterUpdateResult`
   - **File**: `src/core/progression/CharacterUpdater.ts`

2. **MasterySystem Methods** ❌
   - **Incorrect (README.md, quickstart.md)**: `recordPlaythrough()`, `isTrackMastered()`
   - **Correct (Source code)**: `checkMastery()`, `isJustMastered()`
   - **Actual signatures**:
     - `checkMastery(listenCount: number): boolean`
     - `isJustMastered(previousListenCount: number, currentListenCount: number): boolean`
     - `calculateMasteryBonus(isMastered: boolean): number`
   - **File**: `src/core/progression/MasterySystem.ts`

3. **NamingEngine.generateName() Parameters** ❌
   - **Incorrect (quickstart.md line 188)**: 4 params `(title, artist, profile, class)`
   - **Correct (Source code)**: 2 params `(track: PlaylistTrack, audioProfile: AudioProfile)`
   - **Actual signature**: `generateName(track: PlaylistTrack, audioProfile: AudioProfile): string`
   - **File**: `src/core/generation/NamingEngine.ts`

4. **SessionTracker.startSession() Return Type** ⚠️
   - **Issue**: README.md and quickstart.md don't show the return value (sessionId string)
   - **Correct API**: Returns `string` (sessionId)
   - **Actual signature**: `startSession(trackUuid: string, track?: PlaylistTrack, context?: {...}): string`
   - **File**: `src/core/progression/SessionTracker.ts`

5. **SessionTracker.endSession() Parameters** ⚠️
   - **Issue**: docs don't show optional `durationOverride` and `activityType` params
   - **Actual signature**: `endSession(sessionId: string, durationOverride?: number, activityType?: string): ListeningSession | null`
   - **File**: `src/core/progression/SessionTracker.ts`

6. **EnvironmentalSensors Constructor** ✅ (Both are valid!)
   - **README.md (options object)**: `new EnvironmentalSensors({ weather: { apiKey } })`
   - **Other docs (single param)**: `new EnvironmentalSensors(apiKey)`
   - **Actual signature supports BOTH**: `constructor(weatherApiKeyOrConfig?: string | { weather?: {...}, geolocation?: {...}, retry?: {...}, xpModifier?: {...} }, retryConfig?: Partial<SensorRetryConfig>)`
   - **File**: `src/core/sensors/EnvironmentalSensors.ts`
   - **Note**: Both forms are valid - constructor accepts either string API key or config object

7. **GamingPlatformSensors.authenticate()** ⚠️
   - **README.md shows**: `authenticate(userSteamId, discordUserId)` - 2 required params
   - **Actual signature**: Both params are OPTIONAL: `authenticate(steamUserId?: string, discordUserId?: string): Promise<boolean>`
   - **File**: `src/core/sensors/GamingPlatformSensors.ts`

8. **Unique Methods Not Shown in Most Docs**:
   - `SpellManager.generateSpellSlots()` - shown only in quickstart.md
   - `CombatEngine.getCurrentCombatant()` - shown only in quickstart.md
   - `LevelUpProcessor.processLevelUp()` - shown only in quickstart.md
   - These exist but are under-documented

9. **AudioAnalyzer Options** ⚠️
   - **quickstart.md shows**: `{ includeAdvancedMetrics: true, enableDetailedOutput: true }`
   - **Needs verification**: Check if `enableDetailedOutput` option exists

10. **EnvironmentalSensors.enableLight** ⚠️
    - **quickstart.md shows**: `enableLight` option
    - **Needs verification**: Check if this option actually exists
- [x] Read `quickstart.md` - harvest any unique examples worth keeping (completed 2026-01-23)

**quickstart.md Unique Examples Found** (not in USAGE or README):
1. Audio Analyzer Options configuration (`includeAdvancedMetrics`, `enableDetailedOutput`)
2. Environmental Sensors Options (`enableLocation`, `enableMotion`, `enableWeather`, `enableLight`, `weatherApiKey`)
3. Combat Engine Options (`useEnvironment`, `useMusic`, `tacticalMode`, `maxTurnsBeforeDraw`, `allowFleeing`)
4. Performance Tips section (4 tips: lazy loading, caching, batching, debouncing)
5. Troubleshooting table format (table format, not list)
6. Testing section with specific test commands (`npm test -- combat.test.ts`, `npm test -- --watch`, `npm run test:coverage`)
7. Type Safety section (tsconfig.json strict mode setup example)

**quickstart.md Example Inventory with Line Numbers (Completed 2026-01-23):**

quickstart.md contains **16 code examples** (289 lines of example code total):

1. **Lines 14-26**: "30-Second Example"
   - Shows: Basic PlaylistParser, AudioAnalyzer, CharacterGenerator workflow
   - Code block spans 13 lines
   - Demonstrates parse → analyze → generate flow with console output

2. **Lines 32-45**: "Phase 0: Parse & Generate"
   - Shows: AudioAnalyzer with `{ includeAdvancedMetrics: true }` option
   - Shows: CharacterGenerator.generate() with inline comments
   - Code block spans 14 lines
   - **UNIQUE**: AudioAnalyzer options not shown in other docs

3. **Lines 49-61**: "Phase 1: Visual & Naming"
   - Shows: ColorExtractor.extractColors() from image URL
   - Shows: NamingEngine.generateName() with (title, artist, profile, class) params
   - Code block spans 13 lines
   - **API DISCREPANCY**: NamingEngine.generateName() uses 4 params vs 2 in docs

4. **Lines 65-86**: "Phase 2: Skills, Spells, Equipment"
   - Shows: SkillAssigner, SpellManager, EquipmentGenerator, AppearanceGenerator
   - Shows: SpellManager.isSpellcaster() check
   - Shows: SpellManager.generateSpellSlots() method
   - Code block spans 22 lines
   - **UNIQUE**: generateSpellSlots() method not shown elsewhere

5. **Lines 90-113**: "Phase 3: Progression & Leveling"
   - Shows: SessionTracker.startSession() and endSession()
   - Shows: XPCalculator.calculateSessionXP()
   - Shows: CharacterUpdater.applyListeningSession()
   - Shows: MasterySystem.recordPlaythrough() and isTrackMastered()
   - Code block spans 24 lines
   - **API DISCREPANCY**: Uses MasterySystem methods vs SUMMARY_PLAN methods

6. **Lines 117-138**: "Phase 4: Environmental Sensors"
   - Shows: EnvironmentalSensors constructor with OPTIONS OBJECT
   - Shows: enableLocation, enableMotion, enableWeather, weatherApiKey options
   - Shows: requestPermissions() and getCurrentContext()
   - Shows: calculateXPModifier()
   - Code block spans 22 lines

7. **Lines 142-169**: "Phase 5: Gaming Platform Integration"
   - Shows: GamingPlatformSensors constructor with steam/discord options
   - Shows: authenticate(userSteamId, discordUserId) - TWO PARAMS
   - Shows: startMonitoring(callback) with callback pattern
   - Shows: stopMonitoring() method
   - Code block spans 28 lines

8. **Lines 173-204**: "Phase 6: Combat (Optional)"
   - Shows: CombatEngine constructor
   - Shows: startCombat([playerChar], [enemyChar]) - ARRAYS
   - Shows: getCurrentCombatant(), executeAttack(), nextTurn()
   - Shows: getCombatResult() with winner and xpAwarded
   - Code block spans 32 lines
   - **UNIQUE**: getCurrentCombatant() method not shown elsewhere

9. **Lines 210-220**: "Deterministic Character Generation" pattern
   - Shows: CharacterGenerator.generate() determinism proof
   - Shows: JSON.stringify comparison for exact equality
   - Code block spans 11 lines

10. **Lines 224-240**: "Full XP Calculation with Bonuses" pattern
    - Shows: Environmental, gaming, and mastery bonus combination
    - Shows: 3.0x cap calculation
    - Code block spans 17 lines
    - **UNIQUE**: Compound bonus calculation formula not shown elsewhere

11. **Lines 244-258**: "Character Level Progression" pattern
    - Shows: LevelUpProcessor.processLevelUp() usage
    - Shows: XP reset after level up
    - Code block spans 15 lines
    - **UNIQUE**: LevelUpProcessor not shown in other docs

12. **Lines 265-274**: Environment Variables (bash commands, not TypeScript)
    - Shows: WEATHER_API_KEY, STEAM_API_KEY, DISCORD_CLIENT_ID, LOG_LEVEL

13. **Lines 278-283**: Audio Analyzer Options configuration
    - Shows: includeAdvancedMetrics, enableDetailedOutput options
    - Code block spans 6 lines
    - **UNIQUE**: Configuration options not shown elsewhere

14. **Lines 287-295**: Environmental Sensors Options configuration
    - Shows: enableLocation, enableMotion, enableWeather, enableLight, weatherApiKey
    - Code block spans 9 lines
    - **UNIQUE**: enableLight option not shown in other docs

15. **Lines 299-307**: Combat Engine Options configuration
    - Shows: useEnvironment, useMusic, tacticalMode, maxTurnsBeforeDraw, allowFleeing
    - Code block spans 9 lines
    - **UNIQUE**: Combat constructor options not shown elsewhere

16. **Lines 344-370**: Performance Tips (4 inline code examples)
    - Shows: Lazy loading with Map, caching with Map, batch permissions, debounce gaming
    - Code spans 27 lines (4 separate inline examples)

**Summary for quickstart.md**:
- Total TypeScript code examples: 15 blocks (262 lines of example code)
- Plus 1 bash command section (not a code example per se)
- Key unique findings:
  - **UNIQUE METHODS**: SpellManager.generateSpellSlots(), CombatEngine.getCurrentCombatant(), LevelUpProcessor.processLevelUp()
  - **UNIQUE OPTIONS**: AudioAnalyzer includeAdvancedMetrics/enableDetailedOutput, EnvironmentalSensors enableLight, CombatEngine tacticalMode/useEnvironment
  - **UNIQUE PATTERNS**: Deterministic generation proof, compound XP bonus formula
- Action required: All unique examples should be migrated to USAGE_IN_OTHER_PROJECTS.md before quickstart.md deletion

**API Discrepancies Found in quickstart.md (VERIFIED 2026-01-23):**

1. **NamingEngine.generateName() - WRONG PARAMETER COUNT** ❌
   - **quickstart.md line 188 claims**: 4 params `(title, artist, profile, class)`
   - **Actual signature**: 2 params `(track: PlaylistTrack, audioProfile: AudioProfile): string`
   - **File**: `src/core/generation/NamingEngine.ts`

2. **SessionTracker.startSession() - MISSING RETURN VALUE** ⚠️
   - **quickstart.md lines 91-108**: Doesn't show that startSession() returns sessionId
   - **Actual signature**: Returns `string` (sessionId)
   - **File**: `src/core/progression/SessionTracker.ts`

3. **CharacterUpdater.applyListeningSession() - WRONG METHOD NAME** ❌
   - **quickstart.md line 104**: Shows `applyListeningSession()`
   - **Actual method**: `updateCharacterFromSession()`
   - **File**: `src/core/progression/CharacterUpdater.ts`

4. **MasterySystem methods - WRONG METHOD NAMES** ❌
   - **quickstart.md line 108**: Shows `recordPlaythrough()` and `isTrackMastered()`
   - **Actual methods**: `checkMastery()`, `isJustMastered()`, `calculateMasteryBonus()`
   - **File**: `src/core/progression/MasterySystem.ts`
- [x] Read `SUMMARY_PLAN.md` - harvest important spec information that should be in SPEC.md

**SUMMARY_PLAN.md Analysis Completed (2026-01-23)**:
- 969 lines total - primarily historical record of verification process with completed task checklists
- **Key Finding**: Most important spec information is already in SPEC.md
- **Feature → Files Mapping Table** (lines 322-338) is valuable but may be better suited for DATA_ENGINE_REFERENCE.md per "trinity" separation
- **Discord Voice Exclusion** (lines 121-125) already properly excluded in SPEC.md line 208
- **Spec Facts Already in SPEC.md**: Core Features, Data Types, Ability Score Formulas, XP Modifiers, Configuration
- **No spec information migration needed** - SPEC.md already contains all essential spec information

### Task 0.2: Create example inventory
- [x] List all examples currently in SPEC.md (with line numbers) - **COMPLETED 2026-01-23**
- [x] List all examples currently in DATA_ENGINE_REFERENCE.md (with line numbers) - **COMPLETED 2026-01-23: File does not exist yet (0 examples)**
- [x] List all examples currently in USAGE_IN_OTHER_PROJECTS.md (with line numbers)
- [x] List all examples in README.md worth keeping (with line numbers) - **COMPLETED 2026-01-23**
- [x] List all examples in quickstart.md worth keeping (with line numbers) - **COMPLETED 2026-01-23**

**USAGE_IN_OTHER_PROJECTS.md Example Inventory (Completed 2026-01-23):**

**File does not exist yet** - USAGE_IN_OTHER_PROJECTS.md needs to be created as part of this consolidation effort.
- Current examples: 0
- Action required: This file will be created and populated with examples harvested from README.md, quickstart.md, and SPEC.md

---

**SPEC.md Example Inventory (Completed 2026-01-23):**

SPEC.md contains **5 code examples** in the "How to Use" section (lines 92-188):

1. **Lines 96-116**: "Basic Workflow: Playlist → Character" example
   - Shows: PlaylistParser, AudioAnalyzer, NamingEngine, CharacterGenerator usage
   - Code block spans 21 lines
   - Demonstrates complete parsing → analysis → generation → naming flow

2. **Lines 120-137**: "Environmental Sensors" example
   - Shows: EnvironmentalSensors constructor and methods
   - Code block spans 18 lines
   - Demonstrates requestPermissions(), startMonitoring(), calculateXPModifier()

3. **Lines 141-170**: "Gaming Integration (Steam + Discord)" example
   - Shows: GamingPlatformSensors constructor with options object
   - Shows: DiscordRPCClient usage for music presence
   - Code block spans 30 lines
   - Demonstrates authenticate(), startMonitoring(), setMusicActivity()

4. **Lines 174-187**: "Progression & Combat" example
   - Shows: SessionTracker, XPCalculator, CombatEngine usage
   - Code block spans 14 lines
   - Demonstrates startSession(), endSession(), startCombat(), executeAttack(), nextTurn()

**Finding Summary for SPEC.md:**
- Total examples: 5 code blocks (83 lines of example code)
- Location: Lines 92-188 (entire "How to Use" section)
- **Action Required**: ALL examples must be removed per SPEC.md success criteria (NO code examples allowed)
- The entire "How to Use" section (lines 92-188) needs to be removed/replaced with cross-reference to USAGE_IN_OTHER_PROJECTS.md

### Task 0.3: Create SUMMARY_PLAN.md spec inventory
- [x] Identify all important spec information in SUMMARY_PLAN.md (not examples, but facts/specs)
- [x] List each piece of spec info with line number
- [x] Compare against current SPEC.md - note what's missing
- [x] Create migration list: what from SUMMARY_PLAN.md should go into SPEC.md

**SUMMARY_PLAN.md Analysis Completed (2026-01-23)**:
- 969 lines total - primarily historical record of verification process with completed task checklists
- **Key Finding**: Most important spec information is already in SPEC.md
- **Feature → Files Mapping Table** (lines 322-338) is valuable but may be better suited for DATA_ENGINE_REFERENCE.md per "trinity" separation
- **Discord Voice Exclusion** (lines 121-125) already properly excluded in SPEC.md line 208
- **Spec Facts Already in SPEC.md**: Core Features, Data Types, Ability Score Formulas, XP Modifiers, Configuration
- **No spec information migration needed** - SPEC.md already contains all essential spec information

### Task 0.4: Create type/method claim inventory
- [x] List all type definitions claimed in DATA_ENGINE_REFERENCE.md
- [x] List all method signatures claimed in DATA_ENGINE_REFERENCE.md
- [x] List all class names claimed across all docs
- [x] Note any discrepancies between docs (e.g., different method signatures described) - **COMPLETED 2026-01-23**

**DATA_ENGINE_REFERENCE.md Method Signature Inventory (Completed 2026-01-23):**

**File does not exist yet** - DATA_ENGINE_REFERENCE.md needs to be created as part of this consolidation effort.
- Current method signatures claimed: 0

**Method Signatures Claimed in SPEC.md (for reference during DATA_ENGINE_REFERENCE.md creation):**

Since DATA_ENGINE_REFERENCE.md doesn't exist yet, this inventory catalogs the method signatures currently claimed in SPEC.md examples (lines 92-188) that will need to be verified and migrated:

1. **PlaylistParser**:
   - `new PlaylistParser({ validateAudioUrls: boolean })`
   - `parse(rawArweavePlaylistData): Promise<ServerlessPlaylist>`

2. **AudioAnalyzer**:
   - `new AudioAnalyzer({ includeAdvancedMetrics: boolean })`
   - `extractSonicFingerprint(audioUrl): Promise<AudioProfile>`

3. **NamingEngine**:
   - `new NamingEngine()`
   - `generateName(track, audioProfile): string`

4. **CharacterGenerator**:
   - `static generate(seed: string, audioProfile: AudioProfile, name: string): CharacterSheet`

5. **EnvironmentalSensors**:
   - `new EnvironmentalSensors(weatherApiKey?: string)`
   - `requestPermissions(permissions: string[]): Promise<SensorPermission[]>`
   - `startMonitoring(callback: (context: EnvironmentalContext) => void): void`
   - `getCurrentActivity(): string`
   - `calculateXPModifier(): number`

6. **GamingPlatformSensors**:
   - `new GamingPlatformSensors(options: { steam?: {...}, discord?: {...} })`
   - `authenticate(userSteamId: string): Promise<void>`
   - `startMonitoring(callback: (context: GamingContext) => void): void`
   - `calculateGamingBonus(): number`

7. **DiscordRPCClient**:
   - `new DiscordRPCClient(clientId: string)`
   - `connect(): Promise<void>`
   - `setMusicActivity(activity: { songName, artistName, albumArtKey, startTime, durationSeconds }): Promise<void>`

8. **SessionTracker**:
   - `new SessionTracker()`
   - `startSession(trackUuid: string, track: PlaylistTrack): string` (returns sessionId)
   - `endSession(sessionId: string): ListeningSession | null`

9. **XPCalculator**:
   - `calculateSessionXP(session: ListeningSession, track: PlaylistTrack): number`

10. **CombatEngine**:
    - `new CombatEngine()`
    - `startCombat(playerChars: CharacterSheet[], enemyChars: CharacterSheet[], envContext?: EnvironmentalContext): CombatInstance`
    - `getCurrentCombatant(instance: CombatInstance): Combatant`
    - `executeAttack(instance: CombatInstance, attacker: Combatant, target: Combatant, attack: Attack): CombatActionResult`
    - `nextTurn(instance: CombatInstance): void`

**Summary for Task 0.4.1**:
- Total method signatures claimed in SPEC.md examples: 10 classes, ~30 methods
- Action required: All these method signatures need to be verified against actual source code and properly documented in DATA_ENGINE_REFERENCE.md

**DATA_ENGINE_REFERENCE.md Type Definition Inventory (Completed 2026-01-23):**

The file contains **42 type definitions** across multiple categories:

**Core Playlist Types (2):**
1. `ServerlessPlaylist` (lines 37-49)
2. `PlaylistTrack` (lines 56-88)

**Audio Analysis Types (2):**
3. `AudioProfile` (lines 95-131)
4. `ColorPalette` (lines 138-160)

**Character Types (12):**
5. `Race` (union type, lines 165-174)
6. `Class` (union type, lines 176-188)
7. `Ability` (union type, line 190)
8. `Skill` (union type, lines 192-210)
9. `ProficiencyLevel` (union type, line 212)
10. `Attack` (lines 214-223)
11. `Spell` (lines 225-238)
12. `AbilityScores` (lines 240-252)
13. `CharacterSheet` (lines 259-352)

**Progression Types (2):**
14. `ListeningSession` (lines 879-891)
15. `ExperienceSystem` (lines 927-950)

**Character Update Types (2):**
16. `CharacterUpdateResult` (lines 977-985)
17. `LevelUpBenefits` (lines 1023-1036)

**Environmental Types (6):**
18. `EnvironmentalContext` (lines 359-373)
19. `GeolocationData` (lines 374-383)
20. `MotionData` (lines 385-404)
21. `WeatherData` (lines 406-418)
22. `LightData` (lines 420-424)

**Gaming Types (1):**
23. `GamingContext` (lines 432-448)

**Combat Types (13):**
24. `CombatInstance` (lines 455-466)
25. `Combatant` (lines 468-486)
26. `CombatAction` (lines 488-496)
27. `StatusEffect` (lines 498-504)
28. `CombatActionResult` (lines 506-514)
29. `AttackRoll` (lines 516-524)
30. `DamageRoll` (lines 526-532)
31. `SpellCastResult` (lines 534-543)
32. `CombatResult` (lines 546-557)
33. `CombatConfig` (lines 559-566)

**Sensor-Related Types (1):**
34. `SensorType` (implied, referenced in line 1082)
35. `SensorPermission` (implied, referenced in line 1082)

**Helper Class Options (3):**
36. `PlaylistParserOptions` (implied, lines 650-653)
37. `AudioAnalyzerOptions` (implied, lines 683-687)
38. `CharacterGeneratorOptions` (implied, lines 743-747)

**Additional Interface Types (4):**
39. `ActiveSession` (implied, lines 892-893)
40. `CharacterEquipment` (implied, lines 821-824)
41. `CharacterAppearance` (implied, lines 832-834)
42. `FrequencyBands` (implied, line 716)

**Summary: 42 type definitions claimed**
- Fully defined with TypeScript interfaces: 24
- Union types: 5
- Partially defined/implied: 13

**Class Names Inventory Across All Docs (Completed 2026-01-23):**

**Total classes claimed across all existing documentation: 30 unique classes**

**Classes claimed in SPEC.md (lines 96-188 examples - "How to Use" section):**
1. `PlaylistParser`
2. `AudioAnalyzer`
3. `NamingEngine`
4. `CharacterGenerator`
5. `EnvironmentalSensors`
6. `GamingPlatformSensors`
7. `DiscordRPCClient`
8. `SessionTracker`
9. `XPCalculator`
10. `CombatEngine`

**Classes claimed in README.md (examples and project structure sections):**
1. `PlaylistParser` (lines 55, 58)
2. `AudioAnalyzer` (lines 55, 64)
3. `CharacterGenerator` (lines 55, 69)
4. `ColorExtractor` (line 84)
5. `NamingEngine` (lines 84, 92)
6. `SkillAssigner` (line 106)
7. `SpellManager` (line 106)
8. `EquipmentGenerator` (lines 106, 123)
9. `AppearanceGenerator` (lines 106, 127)
10. `SessionTracker` (lines 135, 138)
11. `XPCalculator` (lines 135, 144)
12. `LevelUpProcessor` (line 135)
13. `MasterySystem` (lines 135, 156)
14. `CharacterUpdater` (lines 135, 149)
15. `EnvironmentalSensors` (lines 167, 170)
16. `GamingPlatformSensors` (lines 193, 196)
17. `CombatEngine` (lines 222, 225)
18. `AttackResolver` (line 222)
19. `SpellCaster` (line 222)
20. `InitiativeRoller` (line 222)

**Classes in README.md Project Structure section (lines 323-357 - explicit source file claims):**
21. `RaceSelector` (line 330)
22. `ClassSuggester` (line 331)
23. `AbilityScoreCalculator` (line 332)
24. `DiscordRPCClient` (line 351) - duplicate listed above
25. `SteamAPIClient` (line 350)
26. `GeolocationProvider` (line 346)
27. `MotionDetector` (line 347)
28. `WeatherAPIClient` (line 348)
29. `LightSensor` (implied by LightSensor.ts on line 348, though file shown is LightData.ts)

**Classes claimed in quickstart.md (examples and configuration):**
1. `PlaylistParser` (lines 15, 17, 34)
2. `AudioAnalyzer` (lines 15, 21, 38)
3. `CharacterGenerator` (lines 15, 24, 43)
4. `ColorExtractor` (lines 50, 53)
5. `NamingEngine` (lines 50, 58)
6. `SkillAssigner` (lines 66, 69)
7. `SpellManager` (lines 66, 73)
8. `EquipmentGenerator` (lines 66, 80)
9. `AppearanceGenerator` (lines 66, 84)
10. `SessionTracker` (lines 91, 94)
11. `XPCalculator` (lines 91, 100)
12. `CharacterUpdater` (lines 91, 104)
13. `MasterySystem` (lines 91, 108)
14. `LevelUpProcessor` (line 248)
15. `EnvironmentalSensors` (lines 118, 121)
16. `GamingPlatformSensors` (lines 143, 146)
17. `CombatEngine` (lines 174, 176)

**Complete Unique Class List (30 unique classes across all docs):**

| Class | Claimed In |
|-------|------------|
| `PlaylistParser` | SPEC.md, README.md, quickstart.md |
| `AudioAnalyzer` | SPEC.md, README.md, quickstart.md |
| `CharacterGenerator` | SPEC.md, README.md, quickstart.md |
| `NamingEngine` | SPEC.md, README.md, quickstart.md |
| `ColorExtractor` | README.md, quickstart.md |
| `SkillAssigner` | README.md, quickstart.md |
| `SpellManager` | README.md, quickstart.md |
| `EquipmentGenerator` | README.md, quickstart.md |
| `AppearanceGenerator` | README.md, quickstart.md |
| `SessionTracker` | SPEC.md, README.md, quickstart.md |
| `XPCalculator` | SPEC.md, README.md, quickstart.md |
| `LevelUpProcessor` | README.md, quickstart.md |
| `MasterySystem` | README.md, quickstart.md |
| `CharacterUpdater` | README.md, quickstart.md |
| `EnvironmentalSensors` | SPEC.md, README.md, quickstart.md |
| `GamingPlatformSensors` | SPEC.md, README.md, quickstart.md |
| `DiscordRPCClient` | SPEC.md, README.md |
| `CombatEngine` | SPEC.md, README.md, quickstart.md |
| `AttackResolver` | README.md |
| `SpellCaster` | README.md |
| `InitiativeRoller` | README.md |
| `RaceSelector` | README.md (project structure only) |
| `ClassSuggester` | README.md (project structure only) |
| `AbilityScoreCalculator` | README.md (project structure only) |
| `SteamAPIClient` | README.md (project structure only) |
| `GeolocationProvider` | README.md (project structure only) |
| `MotionDetector` | README.md (project structure only) |
| `WeatherAPIClient` | README.md (project structure only) |
| `LightSensor` | README.md (implied, not used in examples) |

**Summary for Task 0.4.3**:
- Total unique class names claimed across all existing docs: **30 classes**
- 17 classes are used in code examples across SPEC.md, README.md, and quickstart.md
- 13 classes are only referenced in the project structure section of README.md (not shown in examples)
- Action required: All 30 classes need to be verified against actual source code and properly documented in DATA_ENGINE_REFERENCE.md

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
