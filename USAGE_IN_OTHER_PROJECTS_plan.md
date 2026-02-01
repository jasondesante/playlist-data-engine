# Verification Plan: USAGE_IN_OTHER_PROJECTS.md

---

## Important Instruction for Ongoing Work

**If any additional problems are discovered where the documentation and code do not match:**

1. **Add a new phase** to the end of this plan
2. **Research the discrepancy** thoroughly by examining the relevant code and documentation
3. **Write detailed tasks** into the new phase documenting:
   - The specific problem discovered
   - The research findings (what the code actually does vs. what docs say)
   - The fix needed (update docs, update code, or both)
4. **Execute the fix** when reaching that phase in sequence

This ensures the plan remains a living document that captures all discovered issues and ensures systematic resolution.

---

## Mission Statement

**Goal**: Verify that every documented API item in `USAGE_IN_OTHER_PROJECTS.md` actually exists in the codebase, is correctly exported, and behaves as documented.

This verification plan ensures documentation-code alignment by systematically checking:
- **Existence**: Every documented class, function, type, and constant exists at the expected location
- **Exports**: All documented items are properly exported from the main index.ts
- **Signatures**: Method and function signatures match documentation (parameters, return types)
- **Type Accuracy**: Type annotations are accurate and complete
- **Behavior**: Functionality matches described behavior (where testable via code inspection)

---

## Overview

| Phase | Focus Area | Item Count | Estimated Scope |
|-------|-----------|------------|-----------------|
| 1 | Core Exports & Entry Point | ~50 | Main index.ts verification |
| 2 | Core Functionality | ~40 | Playlist parsing, audio analysis, character generation |
| 3 | Extensibility System | ~60 | Registries, validators, initialization |
| 4 | Generation Components | ~40 | Races, classes, skills, spells, equipment, appearance |
| 5 | Progression System | ~50 | XP, sessions, level-ups, stat management |
| 6 | Combat System | ~30 | Combat engine, dice rolling, attacks |
| 7 | Equipment System | ~30 | Equipment spawning, effects, modifications |
| 8 | Sensors & Monitoring | ~20 | Environmental and gaming sensors |
| 9 | Utilities & Constants | ~60 | Helper functions, dice rolling, game data |
| 10 | Type Definitions | ~80 | All TypeScript type exports |
| 11 | Documentation Issues | ~15 | Discrepancies and investigation items |
| **TOTAL** | | **~475** | |

---

## Phase 1: Core Exports & Entry Point

**Objective**: Verify the main public API surface from `src/index.ts`

### Task 1.1: Verify Export Statements in src/index.ts
- [x] All documented classes are exported
- [x] All documented functions are exported
- [x] All documented types are exported via `export type`
- [x] All documented constants are exported
- [x] No internal-only items are mistakenly documented as public

**Task 1.1 Summary - COMPLETED**:
- **VERIFIED**: All documented classes are properly exported from src/index.ts
- **VERIFIED**: All documented functions are properly exported
- **VERIFIED**: All documented types are exported via `export type` statements
- **VERIFIED**: All documented constants are exported
- **DISCREPANCY FOUND**: `SteamAPIClient` and `DiscordRPCClient` are documented as available exports in USAGE_IN_OTHER_PROJECTS.md (lines 1534-1535) but are NOT exported from src/index.ts
  - These classes exist in src/core/sensors/SteamAPIClient.ts and src/core/sensors/DiscordRPCClient.ts
  - They are used internally by GamingPlatformSensors but are not part of the public API
  - **RECOMMENDATION**: Update USAGE_IN_OTHER_PROJECTS.md to remove these from the "Available Exports" section (lines 1534-1535)
- **BUILD STATUS**: Clean - no compilation errors

### Task 1.2: Verify Core Classes (src/index.ts lines 1-200)
- [x] `PlaylistParser` → src/core/parser/PlaylistParser.ts (line 198)
- [x] `MetadataExtractor` → src/core/parser/MetadataExtractor.ts (line 199)
- [x] `AudioAnalyzer` → src/core/analysis/AudioAnalyzer.ts (line 200)
- [x] `SpectrumScanner` → src/core/analysis/SpectrumScanner.ts (line 201)
- [x] `ColorExtractor` → src/core/analysis/ColorExtractor.ts (line 202)
- [x] `CharacterGenerator` → src/core/generation/CharacterGenerator.ts (line 184)

**Task 1.2 Summary - COMPLETED**:
- **VERIFIED**: `PlaylistParser` class exists at src/core/parser/PlaylistParser.ts:18
  - Exported from src/index.ts at line 198
  - Has `parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist>` method
  - Type `RawArweavePlaylist` exists in src/core/types/Playlist.ts
  - Type `ServerlessPlaylist` exists in src/core/types/Playlist.ts
  - Type `PlaylistTrack` exists in src/core/types/Playlist.ts
- **VERIFIED**: `MetadataExtractor` class exists at src/core/parser/MetadataExtractor.ts:11
  - Exported from src/index.ts at line 199
  - Has static methods for extracting metadata: `extractAudioUrl()`, `extractImageUrl()`, `extractTitle()`, `extractArtist()`, `parseMetadata()`, `convertAttributes()`
- **VERIFIED**: `AudioAnalyzer` class exists at src/core/analysis/AudioAnalyzer.ts:50
  - Exported from src/index.ts at line 200
  - Has `extractSonicFingerprint(audioUrl: string): Promise<AudioProfile>` method
  - Type `AudioProfile` exists in src/core/types/AudioProfile.ts with properties: `bass_dominance`, `mid_dominance`, `treble_dominance`, `average_amplitude`
- **VERIFIED**: `SpectrumScanner` class exists at src/core/analysis/SpectrumScanner.ts:26
  - Exported from src/index.ts at line 201
  - Has static methods: `separateFrequencyBands()`, `calculateDominance()`
  - Type `FrequencyBands` exists in src/core/types/AudioProfile.ts
- **VERIFIED**: `ColorExtractor` class exists at src/core/analysis/ColorExtractor.ts:7
  - Exported from src/index.ts at line 202
  - Has `extractPalette(imageUrl: string): Promise<ColorPalette>` method
  - Type `ColorPalette` exists in src/core/types/AudioProfile.ts with properties: `colors`, `primary_color`, `secondary_color`, `accent_color`, `brightness`, `saturation`, `is_monochrome`
- **VERIFIED**: `CharacterGenerator` class exists at src/core/generation/CharacterGenerator.ts:128
  - Exported from src/index.ts at line 184 (note: actual export line is 184, not 181 as noted in task)
  - Has static method: `generate(seed: string, audioProfile: AudioProfile, name: string, options?: CharacterGeneratorOptions): CharacterSheet`
  - Type `CharacterGeneratorOptions` exists with properties: `level`, `forceClass`, `forceRace`, `gameMode`, `subrace`, `extensions`
  - Type `CharacterSheet` exists in src/core/types/Character.ts
- **BUILD STATUS**: Clean - no compilation errors
- **NOTE**: The character generator exports line was listed as 181 in the task but is actually 184 in the current code

### Task 1.3: Verify Extensibility Exports (src/index.ts lines 338-373)
- [x] `ExtensionManager` → src/core/extensions/ExtensionManager.ts (line 345)
- [x] `WeightedSelector` → src/core/extensions/WeightedSelector.ts (line 346)
- [x] `FeatureRegistry` → src/core/features/FeatureRegistry.ts (line 269)
- [x] `SkillRegistry` → src/core/skills/SkillRegistry.ts (line 298)
- [x] `SpellRegistry` → src/core/spells/SpellRegistry.ts (line 331)
- [x] All initialization functions exported (lines 351-376)

**Task 1.3 Summary - COMPLETED**:
- **VERIFIED**: `ExtensionManager` class exists at src/core/extensions/ExtensionManager.ts:161
  - Exported from src/index.ts at line 345
  - Has static method: `getInstance(): ExtensionManager`
  - Has method: `register(category: ExtensionCategory, data: any, options?: ExtensionOptions): void`
  - Has method: `setWeights(category: ExtensionCategory, weights: Record<string, number>): void`
  - Type `ExtensionCategory` exists (defined in ExtensionManager.ts at line 39)
  - Type `ExtensionOptions` exists (defined in ExtensionManager.ts at line 118)
  - Type `ValidationResult` exists (defined in ExtensionManager.ts at line 173)
- **VERIFIED**: `WeightedSelector` class exists at src/core/extensions/WeightedSelector.ts:30
  - Exported from src/index.ts at line 346
  - Has static methods: `select()`, `selectMultiple()`, `getFinalWeights()`, `calculateProbabilities()`
  - Type `SelectionMode` exists (defined in WeightedSelector.ts at line 18)
- **VERIFIED**: `FeatureRegistry` class exists at src/core/features/FeatureRegistry.ts:31
  - Exported from src/index.ts at line 269
  - Has static method: `getInstance(): FeatureRegistry`
  - Has methods for registering and querying class features
  - Has methods for registering and querying racial traits
  - Function `getFeatureRegistry()` exported from src/index.ts at line 269
  - Type `ClassFeature` exists (defined in features/FeatureTypes.ts)
  - Type `RacialTrait` exists (defined in features/FeatureTypes.ts)
- **VERIFIED**: `SkillRegistry` class exists at src/core/skills/SkillRegistry.ts:29
  - Exported from src/index.ts at line 298
  - Has static method: `getInstance(): SkillRegistry`
  - Has methods for registering and querying skills
  - Function `getSkillRegistry()` exported from src/index.ts at line 298
  - Type `CustomSkill` exists (defined in skills/SkillTypes.ts)
  - Type `SkillPrerequisite` exists (defined in skills/SkillTypes.ts)
- **VERIFIED**: `SpellRegistry` class exists at src/core/spells/SpellRegistry.ts:60
  - Exported from src/index.ts at line 331
  - Has static method: `getInstance(): SpellRegistry`
  - Has `initializeDefaults(): void` method
  - Has `registerSpell(spell: Spell): void` method
  - Has `getSpellsByLevel(level: number): Spell[]` method
  - Has `getSpellsBySchool(school: SpellSchool): Spell[]` method
  - Has `getSpellsForClass(className: string): Spell[]` method
  - Has `getAvailableSpells(character: CharacterSheet): Spell[]` method
  - Has `getSpell(id: string): Spell | undefined` method
  - Has `validatePrerequisites(spell: Spell, character: CharacterSheet): ValidationResult` method
  - Has `getRegistryStats(): { totalSpells: number, customSpells: number }` method
  - Function `getSpellRegistry()` exported from src/index.ts at line 331
  - Type `RegisteredSpell` exists (defined in SpellRegistry.ts at line 32)
  - Type `SpellSchool` exists (defined in SpellRegistry.ts at line 19)
- **VERIFIED**: All initialization functions exported from src/index.ts lines 351-376:
  - `initializeAppearanceDefaults`, `areAppearanceDefaultsInitialized`, `ensureAppearanceDefaultsInitialized`
  - `initializeSpellDefaults`, `areSpellDefaultsInitialized`, `ensureSpellDefaultsInitialized`
  - `initializeEquipmentDefaults`, `areEquipmentDefaultsInitialized`, `ensureEquipmentDefaultsInitialized`
  - `initializeRaceDefaults`, `areRaceDefaultsInitialized`, `ensureRaceDefaultsInitialized`
  - `initializeClassDefaults`, `areClassDefaultsInitialized`, `ensureClassDefaultsInitialized`
  - `initializeFeatureDefaults`, `areFeatureDefaultsInitialized`, `ensureFeatureDefaultsInitialized`
  - `initializeSkillDefaults`, `areSkillDefaultsInitialized`, `ensureSkillDefaultsInitialized`
  - `initializeAllDefaults`, `ensureAllDefaultsInitialized`
- **BUILD STATUS**: Clean - no compilation errors
- **NOTE**: Line numbers in task description (338-373) were slightly off; actual export lines are 345-376

### Task 1.4: Verify Sensor Exports (src/index.ts lines 379-380)
- [x] `EnvironmentalSensors` → src/core/sensors/EnvironmentalSensors.ts (line 382)
- [x] `GamingPlatformSensors` → src/core/sensors/GamingPlatformSensors.ts (line 383)
- [x] NOTE: `SteamAPIClient` and `DiscordRPCClient` NOT in exports - **CONFIRMED DISCREPANCY**

**Task 1.4 Summary - COMPLETED**:
- **VERIFIED**: `EnvironmentalSensors` is properly exported at line 382
- **VERIFIED**: `GamingPlatformSensors` is properly exported at line 383
- **CONFIRMED**: `SteamAPIClient` and `DiscordRPCClient` are NOT exported (as noted in Task 1.1)
  - These are internal implementation classes used by GamingPlatformSensors
  - Documentation needs updating to remove them from public exports list

---

## Phase 2: Core Functionality

**Objective**: Verify playlist parsing, audio analysis, and character generation APIs

### Task 2.1: PlaylistParser → src/core/parser/PlaylistParser.ts
- [x] class exists and is exported
- [x] `parse(rawPlaylistJSON: RawArweavePlaylist): Promise<ServerlessPlaylist>`
- [x] Returns ServerlessPlaylist with `tracks: PlaylistTrack[]`
- [x] Type `RawArweavePlaylist` exists
- [x] Type `ServerlessPlaylist` exists
- [x] Type `PlaylistTrack` exists

**Task 2.1 Summary - COMPLETED**:
- **VERIFIED**: `PlaylistParser` class exists at src/core/parser/PlaylistParser.ts:18
  - Exported from src/index.ts at line 198
  - Has `parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist>` method (line 33)
  - **MINOR NOTE**: Parameter name is `data` not `rawPlaylistJSON`, but type signature matches
- **VERIFIED**: Returns `ServerlessPlaylist` with `tracks: PlaylistTrack[]` (lines 60-68)
- **VERIFIED**: Type `RawArweavePlaylist` exists at src/core/types/Playlist.ts:64
- **VERIFIED**: Type `ServerlessPlaylist` exists at src/core/types/Playlist.ts:10
- **VERIFIED**: Type `PlaylistTrack` exists at src/core/types/Playlist.ts:27
- **BUILD STATUS**: To be verified

### Task 2.2: MetadataExtractor → src/core/parser/MetadataExtractor.ts
- [x] class exists and is exported
- [x] Methods for extracting metadata from track objects

**Task 2.2 Summary - COMPLETED**:
- **VERIFIED**: `MetadataExtractor` class exists at src/core/parser/MetadataExtractor.ts:11
  - Exported from src/index.ts at line 199
  - All methods are static utility methods for metadata extraction
- **VERIFIED METHODS**:
  - `extractAudioUrl(data: Record<string, unknown>): string | null` (line 20)
    - Priority order: mp3_url → lossy_audio → audio_url → lossless_audio → animation_url
  - `extractImageUrl(data: Record<string, unknown>): string | null` (line 39)
    - Priority order: image_small → image → image_large → image_thumb
  - `extractTitle(data: Record<string, unknown>): string | null` (line 56)
    - Priority order: name → title
  - `extractArtist(data: Record<string, unknown>): string | null` (line 72)
    - Priority order: artist → created_by → minter
  - `parseMetadata(metadata: unknown): Record<string, unknown> | null` (line 88)
    - Parses stringified JSON or returns object if already parsed
  - `convertAttributes(attributes: unknown): Record<string, string | number> | null` (line 118)
    - Converts OpenSea-style attributes array to key-value object
- **DISCREPANCY FOUND**: `MetadataExtractionOptions` interface is defined at line 6 but NOT exported from src/index.ts
  - The interface exists but has `strict?: boolean` property
  - Currently not used in any methods but defined for future use
  - **RECOMMENDATION**: Either export this type from src/index.ts or remove if not needed
- **DOCUMENTATION NOTE**: `MetadataExtractor` is mentioned in USAGE_IN_OTHER_PROJECTS.md line 1483 with brief description "Extract metadata from track objects" but lacks detailed API documentation
- **BUILD STATUS**: Clean - no compilation errors

### Task 2.3: AudioAnalyzer → src/core/analysis/AudioAnalyzer.ts
- [x] class exists and is exported
- [x] `extractSonicFingerprint(audioUrl: string): Promise<AudioProfile>`
- [x] Type `AudioProfile` exists with:
  - [x] `bass_dominance: number`
  - [x] `mid_dominance: number`
  - [x] `treble_dominance: number`

**Task 2.3 Summary - COMPLETED**:
- **VERIFIED**: `AudioAnalyzer` class exists at src/core/analysis/AudioAnalyzer.ts:50
  - Exported from src/index.ts at line 200
  - Has constructor accepting `AudioAnalyzerOptions` with properties: `includeAdvancedMetrics`, `sampleRate`, `fftSize`, `trebleAttenuation`, `bassBoost`, `midBoost`
- **VERIFIED**: `extractSonicFingerprint(audioUrl: string): Promise<AudioProfile>` method exists at line 88
  - Uses "Triple Tap" strategy (5%, 40%, 70% positions) for audio > 3 seconds
  - Analyzes full buffer for audio < 3 seconds
  - Returns `AudioProfile` object
- **VERIFIED**: Type `AudioProfile` exists at src/core/types/AudioProfile.ts:5 with properties:
  - `bass_dominance: number` (line 7)
  - `mid_dominance: number` (line 10)
  - `treble_dominance: number` (line 13)
  - `average_amplitude: number` (line 16)
  - Optional advanced metrics: `spectral_centroid`, `spectral_rolloff`, `zero_crossing_rate`
  - Optional `color_palette?: ColorPalette`
  - `analysis_metadata` object with duration, sample positions, timestamp
- **ADDITIONAL FINDINGS**: `AudioAnalyzerOptions` interface exists at line 8 but is NOT exported from src/index.ts
  - If this should be part of the public API, it may need to be exported
  - Currently only used internally for constructor options
- **BUILD STATUS**: Clean - no compilation errors

### Task 2.4: SpectrumScanner → src/core/analysis/SpectrumScanner.ts
- [x] class exists and is exported
- [x] Analyzes frequency bands
- [x] Type `FrequencyBands` exists

**Task 2.4 Summary - COMPLETED**:
- **VERIFIED**: `SpectrumScanner` class exists at src/core/analysis/SpectrumScanner.ts:26
  - Exported from src/index.ts at line 201
  - Has static method `separateFrequencyBands(frequencyData: Uint8Array, sampleRate: number): FrequencyBands`
  - Has static method `calculateDominance(band: number[], bandWidthHz?: number): number`
  - Constant `CURRENT_BAND_VERSION` exported (value: 2)
- **VERIFIED**: Type `FrequencyBands` exists at src/core/types/AudioProfile.ts:65
  - Exported from src/index.ts at line 21
  - Has properties: `bass: number[]`, `mid: number[]`, `treble: number[]`
- **DISCREPANCY FOUND**: Comments in `FrequencyBands` interface (lines 66-73) still reference the OLD v1 frequency bands:
  - Comment says "Bass frequencies (20Hz - 250Hz)" but code uses 20Hz-400Hz
  - Comment says "Mid frequencies (250Hz - 4kHz)" but code uses 400Hz-4kHz
  - Comment says "Treble frequencies (4kHz - 20kHz)" but code uses 4kHz-14kHz
  - **RECOMMENDATION**: Update comments to match v2 band ranges implemented in Phase 8.1
- **BUILD STATUS**: Clean - no compilation errors
- **NOTE**: Pre-existing lint errors exist in codebase but are unrelated to this verification

### Task 2.5: ColorExtractor → src/core/analysis/ColorExtractor.ts
- [x] class exists and is exported
- [x] `extractPalette(imageUrl: string): Promise<ColorPalette>`
- [x] Type `ColorPalette` exists with:
  - [x] `primary_color: string`
  - [x] `colors: string[]`
  - [x] `brightness: number`
  - [x] `saturation: number`
  - [x] `is_monochrome: boolean`

**Task 2.5 Summary - COMPLETED**:
- **VERIFIED**: `ColorExtractor` class exists at src/core/analysis/ColorExtractor.ts:7
  - Exported from src/index.ts at line 202
  - Has `extractPalette(imageUrl: string): Promise<ColorPalette>` method (line 40)
- **VERIFIED**: Type `ColorPalette` exists at src/core/types/AudioProfile.ts:42 with properties:
  - `colors: string[]` - Dominant colors ranked by frequency (hex format) (line 44)
  - `primary_color: string` - Primary color (most dominant) (line 47)
  - `secondary_color?: string` - Secondary color (line 50) - Optional
  - `accent_color?: string` - Accent color (line 53) - Optional
  - `brightness: number` - Average brightness (0.0 - 1.0) (line 56)
  - `saturation: number` - Average saturation (0.0 - 1.0) (line 59)
  - `is_monochrome: boolean` - Is the image monochrome? (line 62)
- **ADDITIONAL FINDINGS**: The class uses canvas-based image processing
  - Requires browser environment (HTMLCanvasElement)
  - Falls back gracefully with `getFallbackPalette()` on errors
  - Uses k-means clustering algorithm with median-cut fallback
  - Analyzes 4 dominant colors from images
- **BUILD STATUS**: Clean - no compilation errors

### Task 2.6: CharacterGenerator → src/core/generation/CharacterGenerator.ts
- [ ] class exists and is exported
- [ ] Static method: `generate(seed: string, audioProfile: AudioProfile, name: string, options?: CharacterGeneratorOptions): CharacterSheet`
- [ ] Type `CharacterGeneratorOptions` exists with:
  - [ ] `gameMode?: 'standard' | 'uncapped'`
- [ ] Type `CharacterSheet` exists with:
  - [ ] `name: string`
  - [ ] `race: Race`
  - [ ] `class: Class`
  - [ ] `ability_scores: AbilityScores`
  - [ ] `level: number`
  - [ ] `seed: string`
  - [ ] `attacks?: Attack[]` - **NEEDS INVESTIGATION**

---

## Phase 3: Extensibility System

**Objective**: Verify all registries, validators, and initialization functions

### Task 3.1: ExtensionManager → src/core/extensions/ExtensionManager.ts
- [ ] class exists and is exported
- [ ] Static method: `getInstance(): ExtensionManager`
- [ ] `register(category: ExtensionCategory, data: any, options?: ExtensionOptions): void`
- [ ] `setWeights(category: ExtensionCategory, weights: Record<string, number>): void`
- [ ] Type `ExtensionCategory` exists
- [ ] Type `ExtensionOptions` exists

### Task 3.2: FeatureRegistry → src/core/features/FeatureRegistry.ts
- [ ] class exists and is exported
- [ ] Static method: `getFeatureRegistry(): FeatureRegistry`
- [ ] Methods for registering and querying class features
- [ ] Methods for registering and querying racial traits
- [ ] Type `ClassFeature` exists
- [ ] Type `RacialTrait` exists

### Task 3.3: SkillRegistry → src/core/skills/SkillRegistry.ts
- [ ] class exists and is exported
- [ ] Static method: `getSkillRegistry(): SkillRegistry`
- [ ] Methods for registering and querying skills
- [ ] Type `CustomSkill` exists
- [ ] Type `SkillPrerequisite` exists

### Task 3.4: SpellRegistry → src/core/spells/SpellRegistry.ts
- [ ] class exists and is exported
- [ ] Static method: `getSpellRegistry(): SpellRegistry`
- [ ] `initializeDefaults(): void`
- [ ] `registerSpell(spell: Spell): void`
- [ ] `getSpellsByLevel(level: number): Spell[]`
- [ ] `getSpellsBySchool(school: SpellSchool): Spell[]`
- [ ] `getSpellsForClass(className: string): Spell[]`
- [ ] `getAvailableSpells(character: CharacterSheet): Spell[]`
- [ ] `getSpell(id: string): Spell | undefined`
- [ ] `validatePrerequisites(spell: Spell, character: CharacterSheet): ValidationResult`
- [ ] `getRegistryStats(): { totalSpells: number, customSpells: number }`
- [ ] Type `RegisteredSpell` exists
- [ ] Type `SpellSchool` exists

### Task 3.5: Validators
- [ ] `FeatureValidator` → src/core/features/FeatureValidator.ts
  - [ ] `validateClassFeature(feature: ClassFeature): ValidationResult`
  - [ ] `validateRacialTrait(trait: RacialTrait): ValidationResult`
  - [ ] `validateClassFeatures(features: ClassFeature[]): ValidationResult`
  - [ ] `validateRacialTraits(traits: RacialTrait[]): ValidationResult`
- [ ] `SkillValidator` → src/core/skills/SkillValidator.ts
  - [ ] `validateSkill(skill: CustomSkill): ValidationResult`
  - [ ] `validateSkills(skills: CustomSkill[]): ValidationResult`
  - [ ] `validateSkillProficiency(proficiency: SkillProficiency): ValidationResult`
  - [ ] `validateSkillPrerequisites(prerequisites: SkillPrerequisite): ValidationResult`
- [ ] `SpellValidator` → src/core/spells/SpellValidator.ts
  - [ ] `validateSpell(spell: Spell): ValidationResult`
  - [ ] `validateSpells(spells: Spell[]): ValidationResult`
  - [ ] `validateSpellPrerequisitesSchema(prerequisites: SpellPrerequisite): ValidationResult`
  - [ ] `validateSpellPrerequisites(prerequisites: SpellPrerequisite, character: CharacterSheet): ValidationResult`

### Task 3.6: FeatureEffectApplier → src/core/features/FeatureEffectApplier.ts
- [ ] class exists and is exported
- [ ] Methods for applying feature effects to characters
- [ ] Type `EffectApplicationResult` exists
- [ ] Type `CharacterEffect` exists

### Task 3.7: WeightedSelector → src/core/extensions/WeightedSelector.ts
- [ ] class exists and is exported
- [ ] Weighted random selection with multiple modes
- [ ] Type `SelectionMode` exists

### Task 3.8: Initialization Functions → src/core/extensions/index.ts
- [ ] `ensureAllDefaultsInitialized(): void`
- [ ] `initializeAllDefaults(): void`
- [ ] Appearance defaults: initialize, check, ensure (3 functions)
- [ ] Spell defaults: initialize, check, ensure (3 functions)
- [ ] Equipment defaults: initialize, check, ensure (3 functions)
- [ ] Race defaults: initialize, check, ensure (3 functions)
- [ ] Class defaults: initialize, check, ensure (3 functions)
- [ ] Feature defaults: initialize, check, ensure (3 functions)
- [ ] Skill defaults: initialize, check, ensure (3 functions)

---

## Phase 4: Generation Components

**Objective**: Verify character generation building blocks

### Task 4.1: RaceSelector → src/core/generation/RaceSelector.ts
- [ ] class exists and is exported
- [ ] Methods for selecting character races

### Task 4.2: ClassSuggester → src/core/generation/ClassSuggester.ts
- [ ] class exists and is exported
- [ ] Methods for suggesting classes based on audio

### Task 4.3: AbilityScoreCalculator → src/core/generation/AbilityScoreCalculator.ts
- [ ] class exists and is exported
- [ ] Methods for calculating ability scores

### Task 4.4: SkillAssigner → src/core/generation/SkillAssigner.ts
- [ ] class exists and is exported
- [ ] `assignSkills(className: Class, rng: SeededRNG): Record<Skill, ProficiencyLevel>`
- [ ] Type `ProficiencyLevel` exists ('proficient', 'expertise', 'none')

### Task 4.5: SpellManager → src/core/generation/SpellManager.ts
- [ ] class exists and is exported
- [ ] Static method: `isSpellcaster(className: Class): boolean`
- [ ] `initializeSpells(className: Class, level: number): SpellConfig`
  - [ ] Type `SpellConfig` exists - **NEEDS INVESTIGATION**
- [ ] `getSpellSlots(className: Class, level: number): SpellSlots`
  - [ ] Type `SpellSlots` exists - **NEEDS INVESTIGATION**
- [ ] `getCantrips(className: Class): string[]`
- [ ] `getKnownSpells(className: Class, level: number): string[]`

### Task 4.6: EquipmentGenerator → src/core/generation/EquipmentGenerator.ts
- [ ] class exists and is exported
- [ ] `initializeEquipment(className: Class): CharacterEquipment`
- [ ] Returns CharacterEquipment with:
  - [ ] `weapons: InventoryItem[]`
  - [ ] `armor: InventoryItem[]`
  - [ ] `items: InventoryItem[]`
- [ ] Type `CharacterEquipment` exists
- [ ] Type `InventoryItem` exists

### Task 4.7: NamingEngine → src/core/generation/NamingEngine.ts
- [ ] class exists and is exported
- [ ] `generateName(track: PlaylistTrack, audioProfile: AudioProfile): string`

### Task 4.8: AppearanceGenerator → src/core/generation/AppearanceGenerator.ts
- [ ] class exists and is exported
- [ ] `generate(seed: string, className: Class, audioProfile: AudioProfile): CharacterAppearance`
- [ ] Type `CharacterAppearance` exists with:
  - [ ] `body_type: string`
  - [ ] `hair_color: string`
  - [ ] `hair_style: string`
  - [ ] `eye_color: string`
  - [ ] `skin_tone: string`
  - [ ] `facial_features: string[]`
  - [ ] `aura_color?: string`

---

## Phase 5: Progression System

**Objective**: Verify XP, leveling, and stat management APIs

### Task 5.1: XPCalculator → src/core/progression/XPCalculator.ts
- [ ] class exists and is exported
- [ ] `calculateSessionXP(session: ListeningSession, track: PlaylistTrack): number`
- [ ] Type `ListeningSession` exists

### Task 5.2: SessionTracker → src/core/progression/SessionTracker.ts
- [ ] class exists and is exported
- [ ] `startSession(trackId: string, track: PlaylistTrack, context?: SessionContext): string`
  - [ ] Type `SessionContext` exists - **NEEDS INVESTIGATION**
- [ ] `endSession(sessionId: string): ListeningSession | undefined`
- [ ] `getTrackListenCount(trackId: string): number`

### Task 5.3: LevelUpProcessor → src/core/progression/LevelUpProcessor.ts
- [ ] class exists and is exported
- [ ] `processLevelUp(character: CharacterSheet, newLevel: number, seed?: string): LevelUpBenefits`
- [ ] `applyLevelUp(character: CharacterSheet, benefits: LevelUpBenefits): CharacterSheet`
- [ ] `setUncappedConfig(config: UncappedProgressionConfig): void`
  - [ ] Config supports `xpFormula: (level: number) => number`
  - [ ] Config supports `proficiencyBonusFormula: (level: number) => number`
- [ ] Type `LevelUpBenefits` exists
- [ ] Type `UncappedProgressionConfig` exists

### Task 5.4: MasterySystem → src/core/progression/MasterySystem.ts
- [ ] class exists and is exported
- [ ] Methods for tracking track mastery

### Task 5.5: CharacterUpdater → src/core/progression/CharacterUpdater.ts
- [ ] class exists and is exported
- [ ] Constructor: `constructor(statManager?: StatManager)`
- [ ] `updateCharacterFromSession(character: CharacterSheet, session: ListeningSession, track: PlaylistTrack, previousListenCount: number): CharacterUpdateResult`
- [ ] `addXP(character: CharacterSheet, amount: number, source: string): CharacterUpdateResult`
- [ ] `hasPendingStatIncreases(character: CharacterSheet): boolean`
- [ ] `getPendingStatIncreaseCount(character: CharacterSheet): number`
- [ ] `applyPendingStatIncrease(character: CharacterSheet, primaryAbility: Ability, secondaryAbilities?: Ability[]): StatIncreaseResult`
- [ ] Type `CharacterUpdateResult` exists with:
  - [ ] `character: CharacterSheet`
  - [ ] `xpEarned: number`
  - [ ] `leveledUp: boolean`
  - [ ] `newLevel?: number`
  - [ ] `levelUpDetails?: LevelUpDetail[]`
  - [ ] `masteredTrack: boolean`
  - [ ] `masteryBonusXP: number`

### Task 5.6: StatManager → src/core/progression/stat/StatManager.ts
- [ ] class exists and is exported
- [ ] Constructor: `constructor(config?: StatIncreaseConfig)`
  - [ ] Config supports `strategy: StatIncreaseStrategyType | StatIncreaseStrategy | StatIncreaseFunction`
  - [ ] Config supports `maxStat?: number` (default: 20)
- [ ] `processLevelUp(character: CharacterSheet, newLevel: number, options?: StatIncreaseOptions): StatIncreaseResult`
  - [ ] Options supports `forcedAbilities?: Ability[]`
  - [ ] Options supports `excludedAbilities?: Ability[]`
- [ ] `increaseStats(character: CharacterSheet, increases: StatIncrease[], source: string): StatIncreaseResult`
  - [ ] Type `StatIncrease[]` exists - **NEEDS INVESTIGATION**
- [ ] `decreaseStats(character: CharacterSheet, decreases: StatIncrease[], source: string): StatIncreaseResult`
- [ ] `updateConfig(config: Partial<StatIncreaseConfig>): void`
- [ ] Type `StatIncreaseConfig` exists
- [ ] Type `StatIncreaseResult` exists with:
  - [ ] `character: CharacterSheet`
  - [ ] `increases: StatIncrease[]`
  - [ ] `capped: StatIncrease[]`

### Task 5.7: Stat Increase Strategies → src/core/progression/stat/StatIncreaseStrategy.ts
- [ ] `DnD5eStandardStrategy` - Default D&D 5e (manual selection)
- [ ] `DnD5eSmartStrategy` - Intelligent auto-selection
- [ ] `BalancedStrategy` - +1 to two lowest stats
- [ ] `PrimaryOnlyStrategy` - Always boosts class primary
- [ ] `RandomStrategy` - Random stat selection
- [ ] `ManualStrategy` - Pure manual mode
- [ ] `createStatIncreaseStrategy` - Factory function
- [ ] Type `StatIncreaseStrategy` exists
- [ ] Type `StatIncreaseStrategyType` exists
- [ ] Type `StatIncreaseFunction` exists
- [ ] Type `StatIncreaseOptions` exists

---

## Phase 6: Combat System

**Objective**: Verify combat engine and dice rolling APIs

### Task 6.1: CombatEngine → src/core/combat/CombatEngine.ts
- [ ] class exists and is exported
- [ ] Constructor: `constructor(config?: CombatConfig)`
  - [ ] Config supports `useEnvironment: boolean`
  - [ ] Config supports `useMusic: boolean`
  - [ ] Config supports `tacticalMode: boolean`
  - [ ] Config supports `maxTurnsBeforeDraw: number`
- [ ] `startCombat(players: CharacterSheet[], enemies: CharacterSheet[], environmentalContext?: EnvironmentalContext): CombatInstance`
- [ ] `getCurrentCombatant(instance: CombatInstance): Combatant`
  - [ ] Type `Combatant` has `isDefeated` property - **NEEDS INVESTIGATION**
- [ ] `getLivingCombatants(instance: CombatInstance): Combatant[]`
- [ ] `executeAttack(instance: CombatInstance, attacker: Combatant, target: Combatant, attack: Attack): CombatActionResult`
  - [ ] Type `Attack` exists - **NEEDS INVESTIGATION**
- [ ] `nextTurn(instance: CombatInstance): void`
- [ ] `getCombatResult(instance: CombatInstance): CombatResult | null`
- [ ] Type `CombatResult` contains `description`, `xpAwarded`, `roundsElapsed`

### Task 6.2: InitiativeRoller → src/core/combat/InitiativeRoller.ts
- [ ] class exists and is exported
- [ ] Type `InitiativeResult` exists

### Task 6.3: AttackResolver → src/core/combat/AttackResolver.ts
- [ ] class exists and is exported
- [ ] Type `AttackResult` exists

### Task 6.4: SpellCaster → src/core/combat/SpellCaster.ts
- [ ] class exists and is exported

### Task 6.5: DiceRoller → src/core/combat/DiceRoller.ts
- [ ] `rollDie(sides: number): number`
- [ ] `rollMultipleDice(sides: number, count: number): number[]`
- [ ] `parseDiceFormula(formula: string): DiceFormula` - **Type needs investigation**
- [ ] `rollD20(): number`
- [ ] `rollWithAdvantage(): number`
- [ ] `rollWithDisadvantage(): number`
- [ ] `rollInitiative(): InitiativeResult`
- [ ] `isCriticalHit(roll: number): boolean`
- [ ] `isCriticalMiss(roll: number): boolean`
- [ ] `doubleDamage(damage: number): number`
- [ ] `calculateDamage(formula: DiceFormula): number`
- [ ] `rollSavingThrow(ability: Ability): number`
- [ ] `rollAbilityCheck(ability: Ability): number`
- [ ] `seededRoll(seed: string, sides: number): number`
- [ ] `rollPercentile(): number`

### Task 6.6: Combat Types → src/core/types/Combat.ts
- [ ] `StatusEffect`
- [ ] `CombatAction`
- [ ] `CombatActionResult`
- [ ] `AttackRoll`
- [ ] `DamageRoll`
- [ ] `SpellCastResult`
- [ ] `CombatInstance`
- [ ] `DamageType`
- [ ] `SavingThrowAbility`
- [ ] `CombatConfig`

---

## Phase 7: Equipment System

**Objective**: Verify equipment spawning, effects, and modification APIs

### Task 7.1: EquipmentEffectApplier → src/core/equipment/EquipmentEffectApplier.ts
- [ ] class exists and is exported
- [ ] `equipItem(character: CharacterSheet, equipment: EnhancedEquipment, instanceId: string): EffectApplicationResult`
- [ ] `unequipItem(character: CharacterSheet, itemName: string, instanceId: string): void`

### Task 7.2: EquipmentModifier → src/core/equipment/EquipmentModifier.ts
- [ ] class exists and is exported
- [ ] `createModification(id: string, name: string, properties: EquipmentProperty[], type: string): EquipmentModification`
- [ ] `enchant(equipment: CharacterEquipment, itemName: string, modification: EquipmentModification, character: CharacterSheet): CharacterEquipment`
- [ ] `isEnchanted(equipment: CharacterEquipment, itemName: string): boolean`
- [ ] `getItemSummary(equipment: CharacterEquipment, itemName: string): object`

### Task 7.3: EquipmentSpawnHelper → src/core/equipment/EquipmentSpawnHelper.ts
- [ ] class exists and is exported
- [ ] `spawnFromList(items: string[], rng?: SeededRNG): EnhancedEquipment[]`
- [ ] `spawnByRarity(rarity: string, count: number, rng: SeededRNG): EnhancedEquipment[]`
- [ ] `spawnRandom(count: number, rng: SeededRNG, options?: SpawnRandomOptions): EnhancedEquipment[]`
- [ ] `addToCharacter(character: CharacterSheet, items: EnhancedEquipment[], autoEquip: boolean): CharacterSheet`
- [ ] Type `SpawnRandomOptions` exists
- [ ] Type `TreasureHoardResult` exists

### Task 7.4: EquipmentValidator → src/core/equipment/EquipmentValidator.ts
- [ ] class exists and is exported

### Task 7.5: Equipment Types → src/core/types/Equipment.ts
- [ ] `EnhancedEquipment`
- [ ] `EquipmentProperty`
- [ ] `EquipmentCondition`
- [ ] `EquipmentModification`
- [ ] `EnhancedInventoryItem`
- [ ] `EquipmentMiniFeature`
- [ ] `EquipmentFeature`
- [ ] `EquipmentSkill`
- [ ] `EquipmentSpell`

---

## Phase 8: Sensors & Monitoring

**Objective**: Verify environmental and gaming platform sensor APIs

### Task 8.1: EnvironmentalSensors → src/core/sensors/EnvironmentalSensors.ts
- [ ] class exists and is exported
- [ ] Constructor: `constructor(apiKey?: string)`
- [ ] `requestPermissions(types: SensorType[]): Promise<SensorPermission[]>`
- [ ] `updateSnapshot(): Promise<EnvironmentalContext>`
- [ ] `calculateXPModifier(): number`

### Task 8.2: GamingPlatformSensors → src/core/sensors/GamingPlatformSensors.ts
- [ ] class exists and is exported
- [ ] Constructor accepts config:
  - [ ] `steam: { apiKey: string, steamId: string, pollInterval?: number }`
  - [ ] `discord: { clientId: string }`
- [ ] `startMonitoring(callback: (context: GamingContext) => void): void`
- [ ] `stopMonitoring(): void`
- [ ] `getContext(): GamingContext`
- [ ] `calculateGamingBonus(): number`

### Task 8.3: SteamAPIClient → src/core/sensors/SteamAPIClient.ts
- [ ] File exists
- [ ] **DISCREPANCY**: Not exported in src/index.ts but documented in USAGE_IN_OTHER_PROJECTS.md

### Task 8.4: DiscordRPCClient
- [ ] **DISCREPANCY**: Documented but may not exist as exportable class

### Task 8.5: Environmental Types → src/core/types/Environmental.ts
- [ ] `SensorType`
- [ ] `PerformanceMetrics`
- [ ] `PerformanceStatistics`
- [ ] `SensorPermission`
- [ ] `SensorHealthStatus`
- [ ] `SensorStatus`
- [ ] `SensorFailureLog`
- [ ] `SensorRetryConfig`
- [ ] `SensorRecoveryNotification`
- [ ] `ForecastData`
- [ ] `BiomeType`

---

## Phase 9: Utilities & Constants

**Objective**: Verify helper functions and game data constants

### Task 9.1: Hash Utilities → src/utils/hash.ts
- [ ] `generateSeed(input: string): string`
- [ ] `hashSeedToFloat(seed: string): number`
- [ ] `hashSeedToInt(seed: string): number`
- [ ] `deriveSeed(seed: string, salt: string): string`

### Task 9.2: Random Number Generation → src/utils/random.ts
- [ ] class `SeededRNG` exists and is exported
- [ ] Constructor: `constructor(seed: string)`
- [ ] Methods for generating random numbers

### Task 9.3: Validation Schemas → src/utils/validators.ts
- [ ] `PlaylistTrackSchema`
- [ ] `ServerlessPlaylistSchema`
- [ ] `AudioProfileSchema`
- [ ] `CharacterSheetSchema`
- [ ] `AbilityScoresSchema`

### Task 9.4: Logger → src/utils/logger.ts
- [ ] class `Logger` exists and is exported
- [ ] `createLogger(config: LoggerConfig): Logger`
- [ ] enum `LogLevel` exists
- [ ] Type `LogEntry` exists
- [ ] Type `LoggerConfig` exists

### Task 9.5: Type Helpers → src/core/types/Character.ts
- [ ] `asClass(value: string): Class`

### Task 9.6: Sensor Dashboard → src/utils/sensorDashboard.ts
- [ ] `displayEnvironmentalDiagnostics(): void`
- [ ] `displayGamingDiagnostics(): void`
- [ ] `displaySystemDashboard(): void`
- [ ] class `SensorDashboard` exists
- [ ] Type `DashboardConfig` exists

### Task 9.7: Enchantment Library → src/utils/enchantmentLibrary.ts
- [ ] `WEAPON_ENCHANTMENTS: EquipmentModification[]`
- [ ] `ARMOR_ENCHANTMENTS: EquipmentModification[]`
- [ ] `RESISTANCE_ENCHANTMENTS: EquipmentModification[]`
- [ ] `CURSES: EquipmentModification[]`
- [ ] `ALL_ENCHANTMENTS: EquipmentModification[]`
- [ ] `getEnchantment(id: string): EquipmentModification | undefined`
- [ ] `getCurse(id: string): EquipmentModification | undefined`
- [ ] `getAllEnchantments(): EquipmentModification[]`
- [ ] `getAllCurses(): EquipmentModification[]`
- [ ] `getEnchantmentsByType(type: string): EquipmentModification[]`
- [ ] `createStrengthEnchantment(): EquipmentModification`
- [ ] `createDexterityEnchantment(): EquipmentModification`
- [ ] `createConstitutionEnchantment(): EquipmentModification`
- [ ] `createIntelligenceEnchantment(): EquipmentModification`
- [ ] `createWisdomEnchantment(): EquipmentModification`
- [ ] `createCharismaEnchantment(): EquipmentModification`

### Task 9.8: Magic Item Examples → src/utils/magicItemExamples.ts
- [ ] `MAGIC_ITEM_EXAMPLES: EnhancedEquipment[]`
- [ ] `MAGIC_EQUIPMENT_TEMPLATES: Record<string, EquipmentTemplate>`
  - [ ] Type `EquipmentTemplate` exists - **NEEDS INVESTIGATION**
- [ ] `getMagicItem(id: string): EnhancedEquipment | undefined`
- [ ] `getMagicItemsByType(type: string): EnhancedEquipment[]`
- [ ] `getMagicItemsByRarity(rarity: string): EnhancedEquipment[]`
- [ ] `getCursedItems(): EnhancedEquipment[]`
- [ ] `getItemsWithProperty(property: string): EnhancedEquipment[]`
- [ ] `applyTemplate(item: EnhancedEquipment, template: EquipmentTemplate): EnhancedEquipment`

### Task 9.9: Game Data Constants → src/utils/constants.ts
- [ ] `RACE_DATA: Record<Race, RaceInfo>` - **Type `RaceInfo` needs investigation**
- [ ] `CLASS_DATA: Record<Class, ClassInfo>` - **Type `ClassInfo` needs investigation**
- [ ] `ALL_RACES: Race[]`
- [ ] `ALL_CLASSES: Class[]`
- [ ] `XP_THRESHOLDS: Record<number, number>`
- [ ] `PROFICIENCY_BONUS: Record<number, number>`
- [ ] `SKILL_ABILITY_MAP: Record<Skill, Ability>`
- [ ] `SPELL_DATABASE: Spell[]`
- [ ] `CLASS_SPELL_LISTS: Record<Class, Spell[]>`
- [ ] `SPELL_SLOTS_BY_CLASS: Record<string, Record<number, SpellSlots>>`
- [ ] `CLASS_STARTING_EQUIPMENT: Record<Class, Equipment[]>`
  - [ ] Type `Equipment` vs `EnhancedEquipment` - **NEEDS INVESTIGATION**
- [ ] `EQUIPMENT_DATABASE: Equipment[]`
- [ ] `MASTERY_THRESHOLD: number`
- [ ] `MASTERY_BONUS_XP: number`
- [ ] Type `Spell` exists
- [ ] Type `SpellPrerequisite` exists

### Task 9.10: Configuration → src/core/config/
- [ ] `DEFAULT_SENSOR_CONFIG: SensorConfig`
- [ ] `loadConfigFromEnv(): SensorConfig`
- [ ] `mergeConfig(default: SensorConfig, user: Partial<SensorConfig>): SensorConfig`
- [ ] Type `SensorConfig` exists
- [ ] Type `CacheConfig` exists
- [ ] Type `GeolocationSensorConfig` exists
- [ ] Type `WeatherSensorConfig` exists
- [ ] Type `GamingSensorConfig` exists
- [ ] Type `XPModifierConfig` exists
- [ ] Type `RetryConfig` exists
- [ ] `DEFAULT_PROGRESSION_CONFIG: ProgressionConfig`
- [ ] `mergeProgressionConfig(...): ProgressionConfig`
- [ ] Type `ProgressionConfig` exists

---

## Phase 10: Type Definitions

**Objective**: Verify all TypeScript types are properly exported

### Task 10.1: Character Types → src/core/types/Character.ts
- [ ] `CharacterSheet`
- [ ] `AbilityScores`
- [ ] `Race`
- [ ] `Class`
- [ ] `Ability`
- [ ] `Skill`
- [ ] `ProficiencyLevel`
- [ ] `GameMode` ('standard' | 'uncapped')

### Task 10.2: Progression Types → src/core/types/Progression.ts
- [ ] `EnvironmentalContext`
- [ ] `GamingContext`
- [ ] `ListeningSession`
- [ ] `StatIncreaseConfig`
- [ ] `StatIncreaseResult`
- [ ] `StatIncreaseStrategy`
- [ ] `StatIncreaseOptions`
- [ ] `StatIncreaseStrategyType`
- [ ] `StatIncreaseFunction`
- [ ] `LevelUpDetail`

### Task 10.3: Audio Types → src/core/types/AudioProfile.ts
- [ ] `AudioProfile`
- [ ] `ColorPalette`
- [ ] `FrequencyBands`

### Task 10.4: Playlist Types → src/core/types/Playlist.ts
- [ ] `ServerlessPlaylist`
- [ ] `PlaylistTrack`
- [ ] `RawArweavePlaylist`

### Task 10.5: Equipment Types → src/core/types/Equipment.ts
- [ ] `EnhancedEquipment`
- [ ] `EquipmentProperty`
- [ ] `EquipmentCondition`
- [ ] `EquipmentModification`
- [ ] `EnhancedInventoryItem`
- [ ] `EquipmentMiniFeature`

### Task 10.6: Combat Types → src/core/types/Combat.ts
- [ ] `StatusEffect`
- [ ] `Combatant`
- [ ] `CombatAction`
- [ ] `CombatActionResult`
- [ ] `AttackRoll`
- [ ] `DamageRoll`
- [ ] `SpellCastResult`
- [ ] `CombatInstance`
- [ ] `CombatResult`
- [ ] `DamageType`
- [ ] `SavingThrowAbility`
- [ ] `CombatConfig`

### Task 10.7: Feature Types → src/core/features/
- [ ] `ClassFeature` → FeatureTypes.ts
- [ ] `RacialTrait` → FeatureTypes.ts
- [ ] `FeatureEffect` → FeatureTypes.ts
- [ ] `FeaturePrerequisite` → FeatureTypes.ts
- [ ] `FeatureEffectType` → index.ts
- [ ] `FeatureType` → index.ts
- [ ] `FeatureSource` → index.ts
- [ ] `CharacterFeature` → index.ts
- [ ] `CharacterTrait` → index.ts

### Task 10.8: Skill Types → src/core/skills/
- [ ] `CustomSkill` → SkillTypes.ts
- [ ] `SkillPrerequisite` → SkillTypes.ts
- [ ] `SkillProficiency` → index.ts
- [ ] `SkillSelectionWeights` → index.ts
- [ ] `SkillListDefinition` → index.ts
- [ ] `SkillValidationResult` → index.ts
- [ ] `SkillRegistryStats` → index.ts

### Task 10.9: Spell Types → src/core/spells/
- [ ] `RegisteredSpell` → SpellRegistry.ts
- [ ] `SpellSchool` → SpellRegistry.ts
- [ ] `ValidationResult as SpellValidationResult` → SpellRegistry.ts

### Task 10.10: Extensibility Types → src/core/extensions/
- [ ] `ExtensionOptions` → ExtensionManager.ts
- [ ] `ValidationResult` → ExtensionManager.ts
- [ ] `ExtensionCategory` → index.ts
- [ ] `SelectionMode` → index.ts

---

## Phase 11: Documentation Issues & Follow-up

**Objective**: Track discrepancies, missing items, and items requiring investigation

### Task 11.1: Discrepancies - Documented but Not Exported
- [ ] `SteamAPIClient` - Documented line 1398, not in src/index.ts exports
- [ ] `DiscordRPCClient` - Documented line 1399, not in src/index.ts exports
- [ ] Resolution: Update documentation to reflect internal-only status OR export if intended as public API

### Task 11.2: Types Needing Investigation
- [ ] `SpellConfig` - Return type from `SpellManager.initializeSpells()`
- [ ] `SpellSlots` - Return type from `SpellManager.getSpellSlots()`
- [ ] `SessionContext` - Parameter type for `SessionTracker.startSession()`
- [ ] `DiceFormula` - Return type from `parseDiceFormula()`
- [ ] `RaceInfo` - Value type in `RACE_DATA`
- [ ] `ClassInfo` - Value type in `CLASS_DATA`
- [ ] `EquipmentTemplate` - Value type in `MAGIC_EQUIPMENT_TEMPLATES`
- [ ] `StatIncrease` - Array element type in `StatManager` methods
- [ ] `Attack` - Parameter type in `CombatEngine.executeAttack()`

### Task 11.2a: Type Documentation Inaccuracies
- [x] ~~`FrequencyBands` comments in AudioProfile.ts (lines 66-73) reference OLD v1 bands~~
  - **FOUND**: Comments say "Bass: 20-250Hz, Mid: 250Hz-4kHz, Treble: 4kHz-20kHz"
  - **ACTUAL**: Code uses v2 bands "Bass: 20-400Hz, Mid: 400Hz-4kHz, Treble: 4kHz-14kHz"
  - **RECOMMENDATION**: Update comments to match implemented v2 band ranges

### Task 11.3: Properties Needing Verification
- [ ] `Combatant.isDefeated` - Used in combat examples, verify exists
- [ ] `CharacterSheet.attacks` - Used in combat examples, verify exists
- [ ] Uncapped mode stat increases - Verify "EVERY level" behavior matches documentation

### Task 11.4: Type Relationship Clarification
- [ ] `Equipment` (utils/constants.ts) vs `EnhancedEquipment` (core/types/Equipment.ts)
  - [ ] Document relationship and usage differences
  - [ ] Verify which is used where in the API

### Task 11.5: Redundancy Review
- [ ] `SpellValidator` class vs validation functions in `src/core/spells/index.ts`
- [ ] `SkillValidator` class vs validation functions in `src/core/skills/index.ts`
- [ ] `FeatureValidator` class vs validation functions in `src/core/features/index.ts`
- [ ] Individual `initialize*Defaults()` vs `ensureAllDefaultsInitialized()`
  - [ ] Document usage patterns and recommended approach

---

## Verification Criteria

For each item, verify:
- [ ] **Exists**: File/class/function exists at expected path
- [ ] **Exported**: Properly exported (export / export default)
- [ ] **Named correctly**: Case-sensitive name matches documentation
- [ ] **Signature matches**: Parameters and return types documented correctly
- [ ] **Type annotations**: TypeScript types are accurate and exported
- [ ] **Generics documented**: Generic parameters and constraints are correct

---

## Summary of Known Issues

### High Priority - Documentation Errors
1. `SteamAPIClient` and `DiscordRPCClient` documented as exported but not in index.ts
2. `Attack` type used but not verified as existing
3. `isDefeated` property on Combatant needs verification

### Medium Priority - Missing Type Documentation
1. `MetadataExtractionOptions` defined but NOT exported from src/index.ts (found in Task 2.2)
2. `AudioAnalyzerOptions` defined but NOT exported from src/index.ts (found in Task 2.3)
3. `SpellConfig` return type needs to be defined/exported
4. `SpellSlots` type needs to be defined/exported
5. `SessionContext` type needs to be defined/exported
6. `DiceFormula`, `RaceInfo`, `ClassInfo`, `EquipmentTemplate`, `StatIncrease` types need verification

### Low Priority - Consistency Review
1. Equipment vs EnhancedEquipment type usage
2. Validation function redundancy (class vs standalone functions)
3. Initialization function patterns (individual vs batch)

---

## Progress Tracking

| Phase | Status | Completed | Total | Last Updated |
|-------|--------|-----------|-------|--------------|
| 1 | Complete | 4 | ~50 | 2026-02-01 |
| 2 | In Progress | 5 | ~40 | 2026-02-01 |
| 3 | Not Started | 0 | ~60 | - |
| 4 | Not Started | 0 | ~40 | - |
| 5 | Not Started | 0 | ~50 | - |
| 6 | Not Started | 0 | ~30 | - |
| 7 | Not Started | 0 | ~30 | - |
| 8 | Not Started | 0 | ~20 | - |
| 9 | Not Started | 0 | ~60 | - |
| 10 | Not Started | 0 | ~80 | - |
| 11 | Not Started | 0 | ~15 | - |
| **ALL** | **In Progress** | **9** | **~475** | 2026-02-01 |
