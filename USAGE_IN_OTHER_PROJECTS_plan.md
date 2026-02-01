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
- [x] class exists and is exported
- [x] Static method: `generate(seed: string, audioProfile: AudioProfile, name: string, options?: CharacterGeneratorOptions): CharacterSheet`
- [x] Type `CharacterGeneratorOptions` exists with:
  - [x] `gameMode?: 'standard' | 'uncapped'`
- [x] Type `CharacterSheet` exists with:
  - [x] `name: string`
  - [x] `race: Race`
  - [x] `class: Class`
  - [x] `ability_scores: AbilityScores`
  - [x] `level: number`
  - [x] `seed: string`
  - [x] `attacks?: Attack[]` - **INVESTIGATED: Does NOT exist as property on CharacterSheet**

**Task 2.6 Summary - COMPLETED**:
- **VERIFIED**: `CharacterGenerator` class exists at src/core/generation/CharacterGenerator.ts:128
  - Exported from src/index.ts at line 184
  - Exported with `type CharacterGeneratorOptions` at line 184
- **VERIFIED**: Static method `generate(seed: string, audioProfile: AudioProfile, name: string, options?: CharacterGeneratorOptions): CharacterSheet` exists at line 259
  - Method accepts optional `CharacterGeneratorOptions` parameter
- **VERIFIED**: Type `CharacterGeneratorOptions` exists at src/core/generation/CharacterGenerator.ts:80 with properties:
  - `level?: number` - Starting level (default: 1)
  - `forceClass?: Class` - Override class suggestion
  - `forceRace?: Race` - Override race selection
  - `gameMode?: GameMode` - Game mode for stat progression (default: 'standard')
  - `subrace?: string` - Optional subrace selection
  - `extensions?: CharacterGeneratorExtensions` - Custom extensions
- **VERIFIED**: `GameMode` type exists at src/core/types/Character.ts:284 as `'standard' | 'uncapped'`
- **VERIFIED**: Type `CharacterSheet` exists at src/core/types/Character.ts:333 with properties:
  - `name: string` (line 335)
  - `race: Race` (line 338)
  - `subrace?: string` (line 341)
  - `class: Class` (line 344)
  - `level: number` (line 347)
  - `ability_scores: AbilityScores` (line 350)
  - `ability_modifiers: AbilityScores` (line 353)
  - `proficiency_bonus: number` (line 356)
  - `hp: { current, max, temp }` (line 359)
  - `armor_class: number` (line 366)
  - `initiative: number` (line 369)
  - `speed: number` (line 372)
  - `skills: Record<string, ProficiencyLevel>` (line 375)
  - `saving_throws: Record<Ability, boolean>` (line 378)
  - `racial_traits: string[]` (line 381)
  - `class_features: string[]` (line 384)
  - `spells?: { spell_slots, known_spells, cantrips }` (line 387)
  - `equipment?: { weapons, armor, items, totalWeight, equippedWeight }` (line 394)
  - `appearance?: { body_type, skin_tone, hair_style, hair_color, eye_color, facial_features, primary_color?, secondary_color?, aura_color? }` (line 403)
  - `xp: { current, next_level }` (line 419)
  - `seed: string` (line 425)
  - `generated_at: string` (line 428)
  - `gameMode?: GameMode` (line 431)
  - `pendingStatIncreases?: number` (line 434)
  - `feature_effects?: FeatureEffect[]` (line 448)
  - `equipment_effects?: EquipmentEffect[]` (line 457)
- **INVESTIGATED**: `attacks?: Attack[]` property **does NOT exist** on `CharacterSheet`
  - The `Attack` type IS defined at src/core/types/Character.ts:289 with properties:
    - `name: string`
    - `bonus?: number`
    - `attack_bonus?: number`
    - `damage?: string`
    - `damage_dice?: string`
    - `damage_type?: string`
    - `type?: 'melee' | 'ranged' | 'spell'`
    - `range?: number`
    - `properties?: string[]`
  - However, `CharacterSheet` does NOT have an `attacks` property
  - Attacks appear to be computed dynamically or derived from equipment/class features rather than stored directly on the character sheet
  - **RECOMMENDATION**: Update USAGE_IN_OTHER_PROJECTS.md to remove references to `attacks` property on `CharacterSheet`, or add it if it was intended to be part of the type
- **ADDITIONAL FINDINGS**: Several related types defined in CharacterGenerator.ts are NOT exported from src/index.ts:
  - `SpellExtension` (line 21) - for custom spells
  - `EquipmentExtension` (line 35) - for custom equipment
  - `CharacterGeneratorExtensions` (line 67) - for extension configuration
  - These are internal types used by the generator's extension system
- **BUILD STATUS**: Clean - no compilation errors

---

## Phase 3: Extensibility System

**Objective**: Verify all registries, validators, and initialization functions

### Task 3.1: ExtensionManager → src/core/extensions/ExtensionManager.ts
- [x] class exists and is exported
- [x] Static method: `getInstance(): ExtensionManager`
- [x] `register(category: ExtensionCategory, data: any, options?: ExtensionOptions): void`
- [x] `setWeights(category: ExtensionCategory, weights: Record<string, number>): void`
- [x] Type `ExtensionCategory` exists
- [x] Type `ExtensionOptions` exists

**Task 3.1 Summary - COMPLETED**:
- **VERIFIED**: `ExtensionManager` class exists at src/core/extensions/ExtensionManager.ts:224
  - Exported from src/index.ts at line 345
  - Type `ExtensionManager` is properly exported
- **VERIFIED**: Static method `getInstance(): ExtensionManager` exists at line 239
- **VERIFIED**: `register(category: ExtensionCategory, data: any, options?: ExtensionOptions): void` exists at line 270
  - **MINOR NOTE**: Parameter is `items: any[]` not `data: any`, but functionality matches
- **VERIFIED**: `setWeights(category: ExtensionCategory, weights: Record<string, number>): void` exists at line 437
- **VERIFIED**: Type `ExtensionCategory` exists at line 39 as a union type with many categories including:
  - `'equipment'`, `'equipment.properties'`, `'equipment.modifications'`, `'equipment.templates'`
  - `'appearance.bodyTypes'`, `'appearance.skinTones'`, `'appearance.hairColors'`, etc.
  - `'spells'`, `'races'`, `'races.data'`, `'classes'`, `'classes.data'`
  - `'classFeatures'`, `'classFeatures.${string}'` (for all classes)
  - `'racialTraits'`, `'racialTraits.${string}'` (for all races)
  - `'skills'`, `'skills.${Ability}'`
  - `'skillLists'`, `'skillLists.${string}'`
  - `'classSpellLists'`, `'classSpellSlots'`, `'classStartingEquipment'`
- **VERIFIED**: Type `ExtensionOptions` exists at line 118 with properties:
  - `mode?: SpawnMode` - Spawn mode ('relative', 'absolute', 'default', 'replace')
  - `weights?: Record<string, number>` - Custom spawn weights
  - `validate?: boolean` - Whether to validate items (default: true)
- **VERIFIED**: Type `SpawnMode` exists at line 34 as `'relative' | 'absolute' | 'default' | 'replace'`
- **VERIFIED**: Type `ValidationResult` exists at line 173 with properties:
  - `valid: boolean`
  - `errors?: string[]`
  - `warnings?: string[]`
- **VERIFIED**: Type `ContentPackData` exists at line 196 for exporting custom content packs
- **BUILD STATUS**: Clean - no compilation errors
- **NOTE**: Pre-existing lint errors exist in ExtensionManager.ts (unused imports and `any` types) but are unrelated to verification

### Task 3.2: FeatureRegistry → src/core/features/FeatureRegistry.ts
- [x] class exists and is exported
- [x] Static method: `getFeatureRegistry(): FeatureRegistry`
- [x] Methods for registering and querying class features
- [x] Methods for registering and querying racial traits
- [x] Type `ClassFeature` exists
- [x] Type `RacialTrait` exists

**Task 3.2 Summary - COMPLETED**:
- **VERIFIED**: `FeatureRegistry` class exists at src/core/features/FeatureRegistry.ts:31
  - Exported from src/index.ts at line 269
  - Type `FeatureRegistry` is properly exported
- **VERIFIED**: Static method `getInstance(): FeatureRegistry` exists at line 49
- **VERIFIED**: Function `getFeatureRegistry(): FeatureRegistry` exists at line 691 (also exported from src/index.ts at line 269)
- **VERIFIED**: Methods for registering and querying class features:
  - `registerClassFeature(feature: ClassFeature): void` (line 93)
  - `registerClassFeatures(features: ClassFeature[]): void` (line 120)
  - `getClassFeatures(className: Class, level: number): ClassFeature[]` (line 175)
  - `getFeaturesForLevel(className: Class, level: number): ClassFeature[]` (line 189)
  - `getClassFeaturesForLevel(className: Class, level: number): ClassFeature[]` (line 201)
  - `getClassFeatureById(featureId: string): ClassFeature | undefined` (line 211)
  - `getAllClassFeatures(): Map<string, ClassFeature[]>` (line 223)
  - `getRegisteredClasses(): Class[]` (line 511)
- **VERIFIED**: Methods for registering and querying racial traits:
  - `registerRacialTrait(trait: RacialTrait): void` (line 132)
  - `registerRacialTraits(traits: RacialTrait[]): void` (line 159)
  - `getRacialTraits(race: Race): RacialTrait[]` (line 233)
  - `getBaseRacialTraits(race: Race): RacialTrait[]` (line 245)
  - `getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[]` (line 257)
  - `getSubraceTraits(race: Race, subrace: string): RacialTrait[]` (line 271)
  - `getAvailableSubraces(race: Race): string[]` (line 285)
  - `getRaceForSubrace(subrace: string): Race | undefined` (line 306)
  - `getRacialTraitById(traitId: string): RacialTrait | undefined` (line 323)
  - `getAllRacialTraits(): Map<string, RacialTrait[]>` (line 335)
  - `getRegisteredRaces(): Race[]` (line 520)
- **VERIFIED**: Type `ClassFeature` exists at src/core/features/FeatureTypes.ts:121 with properties:
  - `id: string` - Unique identifier (e.g., 'barbarian_rage')
  - `name: string` - Display name
  - `description: string` - Detailed description
  - `type: FeatureType` - Feature type ('passive' | 'active' | 'resource' | 'trigger')
  - `class: Class` - Character class
  - `level: number` - Level gained
  - `prerequisites?: FeaturePrerequisite` - Prerequisites
  - `effects?: FeatureEffect[]` - Effects applied
  - `source: FeatureSource` - 'default' or 'custom'
  - `tags?: string[]` - Optional tags
  - `lore?: string` - Optional flavor text
- **VERIFIED**: Type `RacialTrait` exists at src/core/features/FeatureTypes.ts:162 with properties:
  - `id: string` - Unique identifier (e.g., 'elf_darkvision')
  - `name: string` - Display name
  - `description: string` - Detailed description
  - `race: Race` - Race this trait belongs to
  - `subrace?: string` - Optional subrace
  - `prerequisites?: FeaturePrerequisite` - Prerequisites
  - `effects?: FeatureEffect[]` - Effects applied
  - `source: FeatureSource` - 'default' or 'custom'
  - `tags?: string[]` - Optional tags
  - `lore?: string` - Optional flavor text
- **ADDITIONAL TYPES EXPORTED** from src/core/features/FeatureTypes.ts:
  - `FeatureEffectType` - Type of effect ('stat_bonus', 'skill_proficiency', 'ability_unlock', etc.)
  - `FeatureEffect` - Effect that applies a mechanical benefit
  - `FeaturePrerequisite` - Prerequisites for gaining a feature or trait
  - `FeatureType` - Feature classification ('passive', 'active', 'resource', 'trigger')
  - `FeatureSource` - Source of feature definition ('default' | 'custom')
  - `CharacterFeature` - Feature entry for character storage
  - `CharacterTrait` - Trait entry for character storage
  - `ValidationResult` - Validation result for feature prerequisites
- **ADDITIONAL METHODS**:
  - `validatePrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): ValidationResult` (line 348)
  - `validateFeaturePrerequisites(feature: ClassFeature, character: CharacterSheet): ValidationResult` (line 447)
  - `validateTraitPrerequisites(trait: RacialTrait, character: CharacterSheet): ValidationResult` (line 460)
  - `canGainFeature(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean` (line 488)
  - `meetsPrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean` (line 502)
  - `getRegistryStats(): { totalClassFeatures, totalRacialTraits, classesWithFeatures, racesWithTraits }` (line 529)
  - `reset(): void` - Reset registry to initial state (line 559)
  - `isInitialized(): boolean` - Check if registry has been initialized (line 572)
  - `exportRegistry(): { classFeatures, racialTraits }` - Export as JSON (line 663)
- **STATIC METHODS FOR EQUIPMENT FEATURES**:
  - `getEquipmentFeatures(equipmentName: string): ClassFeature[]` (line 590)
  - `isValidEquipmentFeature(featureId: string): boolean` (line 620)
  - `registerEquipmentFeature(feature: ClassFeature): void` (line 644)
- **BUILD STATUS**: Clean - no compilation errors

### Task 3.3: SkillRegistry → src/core/skills/SkillRegistry.ts
- [x] class exists and is exported
- [x] Static method: `getSkillRegistry(): SkillRegistry`
- [x] Methods for registering and querying skills
- [x] Type `CustomSkill` exists
- [x] Type `SkillPrerequisite` exists

**Task 3.3 Summary - COMPLETED**:
- **VERIFIED**: `SkillRegistry` class exists at src/core/skills/SkillRegistry.ts:29
  - Exported from src/index.ts at line 298
  - Type `SkillRegistry` is properly exported
- **VERIFIED**: Static method `getInstance(): SkillRegistry` exists at line 51
- **VERIFIED**: Function `getSkillRegistry(): SkillRegistry` exists at line 432 (also exported from src/index.ts at line 298)
- **VERIFIED**: Methods for registering and querying skills:
  - `registerSkill(skill: CustomSkill): void` (line 86)
  - `registerSkills(skills: CustomSkill[]): void` (line 124)
  - `getSkill(id: string): CustomSkill | undefined` (line 136)
  - `getAllSkills(): CustomSkill[]` (line 145)
  - `getSkillsByAbility(ability: Ability): CustomSkill[]` (line 155)
  - `getSkillsByCategory(category: string): CustomSkill[]` (line 172)
  - `getCategories(): string[]` (line 188)
  - `getSkillsBySource(source: 'default' | 'custom'): CustomSkill[]` (line 198)
  - `isValidSkill(id: string): boolean` (line 208)
  - `validateSkill(skill: CustomSkill): SkillValidationResult` (line 218)
  - `validatePrerequisites(skill: CustomSkill, character: CharacterSheet): SkillValidationResult` (line 266)
  - `getRegistryStats(): SkillRegistryStats` (line 278)
  - `reset(): void` - Reset registry to initial state (line 315)
  - `isInitialized(): boolean` - Check if registry has been initialized (line 334)
  - `exportRegistry(): CustomSkill[]` - Export as JSON (line 345)
  - `unregisterSkill(id: string): boolean` - Remove skill from registry (line 358)
  - `getSkillCount(): number` - Get total skill count (line 398)
  - `getAvailableSkills(character: CharacterSheet): CustomSkill[]` (line 411)
  - `initializeDefaults(defaultSkills?: CustomSkill[]): void` (line 64)
- **VERIFIED**: Type `CustomSkill` exists at src/core/skills/SkillTypes.ts:57 with properties:
  - `id: string` - Unique identifier (e.g., 'athletics', 'survival_cold')
  - `name: string` - Display name
  - `description?: string` - Optional description
  - `ability: Ability` - The ability score used (STR, DEX, CON, INT, WIS, CHA)
  - `armorPenalty?: boolean` - Whether affected by armor disadvantage
  - `customProperties?: Record<string, string | number | boolean | string[]>` - Optional custom properties
  - `categories?: string[]` - Optional categories for grouping/filtering
  - `source: 'default' | 'custom'` - Where this skill comes from
  - `tags?: string[]` - Optional tags for additional categorization
  - `lore?: string` - Optional flavor text
  - `prerequisites?: SkillPrerequisite` - Prerequisites for learning this skill
- **VERIFIED**: Type `SkillPrerequisite` exists at src/core/skills/SkillTypes.ts:25 with properties:
  - `level?: number` - Minimum character level required
  - `abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>` - Minimum ability scores
  - `class?: Class` - Specific class required
  - `race?: Race` - Specific race required
  - `skills?: string[]` - Skills that must be proficient first
  - `features?: string[]` - Features that must be learned first
  - `spells?: string[]` - Spells that must be known first
  - `custom?: string` - Custom condition description
- **ADDITIONAL TYPES EXPORTED** from src/core/skills/SkillTypes.ts:
  - `SkillProficiency` - Proficiency level for a specific skill (lines 139-170)
  - `SkillSelectionWeights` - Weights for controlling spawn rates (lines 178-194)
  - `SkillListDefinition` - Skill list definition for a class (lines 201-234)
  - `SkillValidationResult` - Validation result type (lines 241-246)
  - `SkillRegistryStats` - Registry statistics (lines 253-264)
- **ADDITIONAL EXPORTS** from src/index.ts:
  - `SkillValidator` class (line 299)
  - Validation functions: `validateSkill`, `validateSkills`, `validateSkillProficiency`, `validateSkillProficiencies`, `validateSkillListDefinition`, `validateSkillPrerequisites` (lines 303-308)
  - `DEFAULT_SKILLS` constant (line 315)
  - `DEFAULT_SKILL_CATEGORIES` constant (line 315)
  - All skill types exported (lines 319-323): `SkillProficiency`, `SkillSelectionWeights`, `SkillListDefinition`, `SkillValidationResult`, `SkillRegistryStats`
- **BUILD STATUS**: Clean - no compilation errors

### Task 3.4: SpellRegistry → src/core/spells/SpellRegistry.ts
- [x] class exists and is exported
- [x] Static method: `getSpellRegistry(): SpellRegistry`
- [x] `initializeDefaults(): void`
- [x] `registerSpell(spell: Spell): void`
- [x] `getSpellsByLevel(level: number): Spell[]`
- [x] `getSpellsBySchool(school: SpellSchool): Spell[]`
- [x] `getSpellsForClass(className: string): Spell[]`
- [x] `getAvailableSpells(character: CharacterSheet): Spell[]`
- [x] `getSpell(id: string): Spell | undefined`
- [x] `validatePrerequisites(spell: Spell, character: CharacterSheet): ValidationResult`
- [x] `getRegistryStats(): { totalSpells: number, customSpells: number }`
- [x] Type `RegisteredSpell` exists
- [x] Type `SpellSchool` exists

**Task 3.4 Summary - COMPLETED**:
- **VERIFIED**: `SpellRegistry` class exists at src/core/spells/SpellRegistry.ts:60
  - Exported from src/index.ts at line 331
  - Type `SpellRegistry` is properly exported
- **VERIFIED**: Static method `getInstance(): SpellRegistry` exists at line 94
- **VERIFIED**: Function `getSpellRegistry(): SpellRegistry` exists at line 576 (also exported from src/index.ts at line 331)
- **VERIFIED**: `initializeDefaults(defaultSpells?: Record<string, Spell>): void` exists at line 107
  - **MINOR NOTE**: Parameter is optional, accepts default spells or uses SPELL_DATABASE
- **VERIFIED**: `registerSpell(spell: RegisteredSpell): void` exists at line 137
  - **MINOR NOTE**: Parameter type is `RegisteredSpell`, not `Spell` as documented
  - Also has `registerSpells(spells: RegisteredSpell[]): void` for batch registration (line 189)
- **VERIFIED**: `getSpellsByLevel(level: number): RegisteredSpell[]` exists at line 220
  - **MINOR NOTE**: Return type is `RegisteredSpell[]`, not `Spell[]` as documented
- **VERIFIED**: `getSpellsBySchool(school: SpellSchool): RegisteredSpell[]` exists at line 237
  - **MINOR NOTE**: Return type is `RegisteredSpell[]`, not `Spell[]` as documented
- **VERIFIED**: `getSpellsForClass(characterClass: Class): RegisteredSpell[]` exists at line 254
  - **MINOR NOTE**: Parameter name is `characterClass` with type `Class`, not `className`
  - **MINOR NOTE**: Return type is `RegisteredSpell[]`, not `Spell[]` as documented
- **VERIFIED**: `getAvailableSpells(character: CharacterSheet): RegisteredSpell[]` exists at line 271
  - **MINOR NOTE**: Return type is `RegisteredSpell[]`, not `Spell[]` as documented
- **VERIFIED**: `getSpell(spellId: string): RegisteredSpell | undefined` exists at line 201
  - **MINOR NOTE**: Parameter name is `spellId`, not `id`
  - **MINOR NOTE**: Return type is `RegisteredSpell | undefined`, not `Spell | undefined` as documented
- **VERIFIED**: `validatePrerequisites(spell: RegisteredSpell, character: CharacterSheet): ValidationResult` exists at line 361
  - **MINOR NOTE**: First parameter type is `RegisteredSpell`, not `Spell` as documented
- **VERIFIED**: `getRegistryStats()` exists at line 427
  - Returns object with MORE fields than documented:
    - `totalSpells: number`
    - `defaultSpells: number` (not documented)
    - `customSpells: number`
    - `spellsByLevel: Record<number, number>` (not documented)
    - `spellsBySchool: Record<SpellSchool, number>` (not documented)
    - `classessWithSpells: number` (not documented)
- **VERIFIED**: Type `RegisteredSpell` exists at src/core/spells/SpellRegistry.ts:32 with properties:
  - `id: string` - Unique identifier (uses name as ID if not provided)
  - `classes?: Class[]` - Classes that can learn this spell
  - `source?: 'default' | 'custom'` - Source of the spell
  - Extends `Spell` type (includes name, level, school, casting_time, range, etc.)
- **VERIFIED**: Type `SpellSchool` exists at src/core/spells/SpellRegistry.ts:19 as a union type:
  - `'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation'`
- **ADDITIONAL METHODS FOUND** (not in original task list but documented in USAGE_IN_OTHER_PROJECTS.md):
  - `getSpells(): RegisteredSpell[]` - Get all registered spells (line 210)
  - `getClassSpellList(characterClass: Class): string[]` - Get spell list for a class (line 291)
  - `registerClassSpellList(characterClass: Class, spellIds: string[]): void` - Register spell list (line 301)
  - `getSpellSlotsForClass(characterClass: Class, level: number): number` - Get spell slots (line 337)
  - `validateSpell(spell: RegisteredSpell): ValidationResult` - Validate spell structure (line 383)
  - `hasSpell(spellId: string): boolean` - Check if spell exists (line 399)
  - `getSpellCount(): number` - Get total spell count (line 408)
  - `getSpellsBySource(source: 'default' | 'custom'): RegisteredSpell[]` - Filter by source (line 418)
  - `reset(): void` - Reset registry to initial state (line 473)
  - `isInitialized(): boolean` - Check if registry has been initialized (line 502)
  - `exportRegistry(): RegisteredSpell[]` - Export as JSON (line 513)
  - `unregisterSpell(spellId: string): boolean` - Remove spell from registry (line 526)
- **VERIFIED**: Type `ValidationResult` exists at line 44 with properties:
  - `valid: boolean`
  - `errors: string[]`
  - `warnings?: string[]`
- **BUILD STATUS**: Clean - no compilation errors
- **NOTE**: Pre-existing lint errors exist in codebase but are unrelated to SpellRegistry verification
- **DOCUMENTATION NOTES**:
  - Several methods in USAGE_IN_OTHER_PROJECTS.md may need type signature updates:
    - Documented `Spell` types should be `RegisteredSpell` for parameters and return types
    - `className: string` should be `characterClass: Class` for getSpellsForClass
    - `id` parameter should be `spellId` for getSpell
    - `getRegistryStats()` return type should document additional fields

### Task 3.5: Validators
- [x] `FeatureValidator` → src/core/features/FeatureValidator.ts
  - [x] `validateClassFeature(feature: ClassFeature): ValidationResult`
  - [x] `validateRacialTrait(trait: RacialTrait): ValidationResult`
  - [x] `validateClassFeatures(features: ClassFeature[]): ValidationResult`
  - [x] `validateRacialTraits(traits: RacialTrait[]): ValidationResult`
  - [x] `validateEffect(effect: unknown): ValidationResult` - Additional method found
  - [x] `validatePrerequisites(prerequisites: unknown): ValidationResult` - Additional method found
- [x] `SkillValidator` → src/core/skills/SkillValidator.ts
  - [x] `validateSkill(skill: CustomSkill): ValidationResult`
  - [x] `validateSkills(skills: CustomSkill[]): ValidationResult`
  - [x] `validateSkillProficiency(proficiency: SkillProficiency): ValidationResult`
  - [x] `validateSkillProficiencies(proficiencies: SkillProficiency[]): ValidationResult` - Additional method found
  - [x] `validateSkillListDefinition(skillList: SkillListDefinition): ValidationResult` - Additional method found
  - [x] `validateSkillPrerequisites(prerequisites: SkillPrerequisite): ValidationResult`
  - [x] `isValidSkillId(id: string): boolean` - Additional method found
  - [x] `isValidAbility(ability: string): ability is Ability` - Additional method found
- [x] `SpellValidator` → src/core/spells/SpellValidator.ts
  - [x] `validateSpell(spell: Spell): ValidationResult`
  - [x] `validateSpells(spells: Spell[]): ValidationResult`
  - [x] `validatePrerequisites(prerequisites: unknown): ValidationResult` - Method name differs from plan
  - [x] `validateSpellPrerequisites(prerequisites: SpellPrerequisite, character: CharacterSheet): ValidationResult`
  - [x] `isValidAbility(ability: string): ability is Ability` - Additional method found
  - [x] `isValidSchool(school: string): school is Spell['school']` - Additional method found
  - [x] `isValidSpellLevel(level: number): boolean` - Additional method found

**Task 3.5 Summary - COMPLETED**:
- **VERIFIED**: `FeatureValidator` class exists at src/core/features/FeatureValidator.ts:111
  - Exported from src/index.ts at line 271
  - Helper functions exported at lines 273-277: `validateClassFeature`, `validateRacialTrait`, `validateClassFeatures`, `validateRacialTraits`
- **VERIFIED**: All required `FeatureValidator` methods exist:
  - `validateClassFeature(feature: unknown): ValidationResult` (line 120)
  - `validateRacialTrait(trait: unknown): ValidationResult` (line 229)
  - `validateClassFeatures(features: unknown[]): ValidationResult` (line 572)
  - `validateRacialTraits(traits: unknown[]): ValidationResult` (line 601)
- **ADDITIONAL METHODS FOUND**:
  - `validateEffect(effect: unknown): ValidationResult` (line 352) - Validates feature effects
  - `validatePrerequisites(prerequisites: unknown): ValidationResult` (line 417) - Validates feature prerequisites
- **VERIFIED**: `SkillValidator` class exists at src/core/skills/SkillValidator.ts:41
  - Exported from src/index.ts at line 299
  - Helper functions exported at lines 303-308
- **VERIFIED**: All required `SkillValidator` methods exist:
  - `validateSkill(skill: unknown): SkillValidationResult` (line 50)
  - `validateSkills(skills: unknown[]): SkillValidationResult` (line 159)
  - `validateSkillProficiency(proficiency: unknown): SkillValidationResult` (line 188)
  - `validateSkillPrerequisites(prerequisites: SkillPrerequisite | undefined, character: CharacterSheet): SkillValidationResult` (line 368)
- **ADDITIONAL METHODS FOUND**:
  - `validateSkillProficiencies(proficiencies: unknown[]): SkillValidationResult` (line 237) - Validates multiple proficiencies
  - `validateSkillListDefinition(skillList: unknown): SkillValidationResult` (line 266) - Validates skill list definitions
  - `isValidSkillId(id: string): boolean` (line 338) - Checks if skill ID uses correct format
  - `isValidAbility(ability: string): ability is Ability` (line 354) - Re-exports shared ability validator
- **VERIFIED**: `SpellValidator` class exists at src/core/spells/SpellValidator.ts:61
  - Exported from src/index.ts at line 330
  - Helper functions exported at lines 334-339: `validateSpell`, `validateSpells`, `validateSpellPrerequisitesSchema`, `validateSpellPrerequisites`
- **VERIFIED**: All required `SpellValidator` methods exist:
  - `validateSpell(spell: unknown): SpellValidationResult` (line 70)
  - `validateSpells(spells: unknown[]): SpellValidationResult` (line 153)
  - `validatePrerequisites(prerequisites: unknown): SpellValidationResult` (line 185) - Note: Method name is `validatePrerequisites`, not `validateSpellPrerequisitesSchema`
  - `validateSpellPrerequisites(prerequisites: SpellPrerequisite | undefined, character: CharacterSheet): SpellValidationResult` (line 199)
- **ADDITIONAL METHODS FOUND**:
  - `isValidAbility(ability: string): ability is Ability` (line 214) - Re-exports shared ability validator
  - `isValidSchool(school: string): school is Spell['school']` (line 224) - Checks if valid spell school
  - `isValidSpellLevel(level: number): boolean` (line 234) - Checks if valid spell level (0-9)
- **VERIFIED**: Type `ValidationResult` exists in FeatureValidator.ts (line 25) and SpellValidator.ts (line 47)
  - Has properties: `valid: boolean`, `errors: string[]`
- **VERIFIED**: Type `SkillValidationResult` exists in SkillValidator.ts (exported from SkillTypes.ts)
  - Has properties: `valid: boolean`, `errors: string[]`, `warnings?: string[]`
- **VERIFIED**: Type `SpellValidationResult` exists in SpellValidator.ts (line 47)
  - Has properties: `valid: boolean`, `errors: string[]`
- **BUILD STATUS**: Clean - no compilation errors
- **DOCUMENTATION NOTE**: The validators are listed in USAGE_IN_OTHER_PROJECTS.md (lines 1494-1496) but individual methods are not documented

### Task 3.6: FeatureEffectApplier → src/core/features/FeatureEffectApplier.ts
- [x] class exists and is exported
- [x] Methods for applying feature effects to characters
- [x] Type `EffectApplicationResult` exists
- [x] Type `CharacterEffect` exists

**Task 3.6 Summary - COMPLETED**:
- **VERIFIED**: `FeatureEffectApplier` class exists at src/core/features/FeatureEffectApplier.ts:21
  - Exported from src/index.ts at line 270
  - Exported from src/core/features/index.ts at line 28
  - All methods are static utility methods for applying feature effects
- **VERIFIED METHODS**:
  - `applyFeatureEffects(character: CharacterSheet, feature: ClassFeature | RacialTrait): EffectApplicationResult` (line 29)
    - Applies all effects from a single feature to a character
    - Returns result with applied status, count, and errors
  - `applyMultipleEffects(character: CharacterSheet, features: (ClassFeature | RacialTrait)[]): EffectApplicationResult` (line 64)
    - Applies effects from multiple features to a character
    - Returns combined result
- **PRIVATE METHODS** (internal implementation):
  - `applySingleEffect()` - Routes to specific effect type handlers
  - `applyStatBonus()` - Handles stat bonus effects (ability scores, custom stats)
  - `applySkillProficiency()` - Handles skill proficiency with hierarchy (none < proficient < expertise)
  - `applyAbilityUnlock()` - Handles ability unlock effects (darkvision, flight, etc.)
  - `applyPassiveModifier()` - Handles passive modifiers (speed, max stat modifiers, etc.)
  - `applyResourceGrant()` - Handles resource grants (rage counts, ki points, etc.)
  - `applySpellSlotBonus()` - Handles spell slot bonus effects
- **VERIFIED**: Type `EffectApplicationResult` exists at src/core/types/Equipment.ts:231 with properties:
  - `applied: boolean` - Whether any effects were applied or removed
  - `count: number` - Number of effects affected
  - `errors: string[]` - Errors encountered during application
- **VERIFIED**: Type `CharacterEffect` exists at src/core/features/FeatureEffectApplier.ts:290 with properties:
  - `type: string` - Type of effect that was applied
  - `target: string` - Target stat, skill, or ability
  - `value: number | string | boolean` - Value that was applied
  - `condition?: string` - Optional condition for the effect
- **VERIFIED**: `CharacterEffect` is exported from src/index.ts at line 104
- **ADDITIONAL FINDINGS**:
  - Uses `EffectApplierUtils` for shared logic (ability bonuses, skill proficiency hierarchy)
  - Effects are stored in `character.feature_effects` array (or `character.equipment_effects` for equipment)
  - Handles 6 effect types: `stat_bonus`, `skill_proficiency`, `ability_unlock`, `passive_modifier`, `resource_grant`, `spell_slot_bonus`
  - The `EffectApplicationResult` type is also re-exported from src/core/features/index.ts:31 for API consistency
- **BUILD STATUS**: Clean - no compilation errors

### Task 3.7: WeightedSelector → src/core/extensions/WeightedSelector.ts
- [x] class exists and is exported
- [x] Weighted random selection with multiple modes
- [x] Type `SelectionMode` exists

**Task 3.7 Summary - COMPLETED**:
- **VERIFIED**: `WeightedSelector` class exists at src/core/extensions/WeightedSelector.ts:30
  - Exported from src/index.ts at line 346
  - Exported from src/core/extensions/index.ts at line 17 (type export)
- **VERIFIED**: Type `SelectionMode` exists at line 18 as `'relative' | 'absolute' | 'default' | 'replace'`
  - Exported from src/core/extensions/index.ts at line 17
  - Re-exported from src/index.ts at line 349
- **VERIFIED METHODS** (all static utility methods):
  - `select(items, weights, rng, mode): T` - Select single item (line 54)
  - `selectMultiple(items, weights, rng, count, mode): T[]` - Select multiple unique items (line 103)
  - `getProbabilities(items, weights, mode): Record<string, number>` - Get probability distribution (line 164)
    - **NOTE**: Documentation referenced `calculateProbabilities()` but actual method is `getProbabilities()`
  - `getFinalWeights(items, weights, mode): Record<string, number>` - Get final weights (line 289)
    - **NOTE**: This is a private method, not part of public API
  - `normalizeWeights(items, weights, mode): Record<string, number>` - Normalize weights to sum to 1.0 (line 218)
    - **ADDITIONAL METHOD** not in original task list
  - `getItemKey(item): string` - Extract unique key from item (line 267)
    - **ADDITIONAL METHOD** not in original task list
- **VERIFIED SELECTION MODES**:
  - `'relative'`: Use provided weights as-is, normalize to probabilities
  - `'absolute'`: All non-specified items get weight 1, then normalize
  - `'default'`: Equal weight for all items
  - `'replace'`: Alternative name for absolute mode
- **DOCUMENTATION NOTES**:
  - USAGE_IN_OTHER_PROJECTS.md line 1498 only has brief mention "Weighted random selection with multiple modes"
  - No detailed API documentation for individual methods
  - `calculateProbabilities()` in plan should be `getProbabilities()`
- **BUILD STATUS**: Clean - no compilation errors

### Task 3.8: Initialization Functions → src/core/extensions/index.ts
- [x] `ensureAllDefaultsInitialized(): void`
- [x] `initializeAllDefaults(): void`
- [x] Appearance defaults: initialize, check, ensure (3 functions)
- [x] Spell defaults: initialize, check, ensure (3 functions)
- [x] Equipment defaults: initialize, check, ensure (3 functions)
- [x] Race defaults: initialize, check, ensure (3 functions)
- [x] Class defaults: initialize, check, ensure (3 functions)
- [x] Feature defaults: initialize, check, ensure (3 functions)
- [x] Skill defaults: initialize, check, ensure (3 functions)

**Task 3.8 Summary - COMPLETED**:
- **VERIFIED**: All initialization functions are properly exported from src/core/extensions/index.ts
- **VERIFIED**: All initialization functions are properly exported from src/index.ts at lines 352-376

**APPEARANCE DEFAULTS** (lines 19-22 of index.ts, lines 84-114 of initializeDefaults.ts):
- `initializeAppearanceDefaults(): void` (line 84) - Initializes all appearance categories (bodyTypes, skinTones, hairColors, hairStyles, eyeColors, facialFeatures)
- `areAppearanceDefaultsInitialized(): boolean` (line 96) - Checks if appearance categories are registered
- `ensureAppearanceDefaultsInitialized(): void` (line 110) - Idempotent initialization, safe to call multiple times

**SPELL DEFAULTS** (lines 23-25 of index.ts, lines 137-172 of initializeDefaults.ts):
- `initializeSpellDefaults(): void` (line 137) - Initializes spells database and class-specific spell lists
- `areSpellDefaultsInitialized(): boolean` (line 154) - Checks if spells category is registered
- `ensureSpellDefaultsInitialized(): void` (line 168) - Idempotent initialization

**EQUIPMENT DEFAULTS** (lines 26-28 of index.ts, lines 192-220 of initializeDefaults.ts):
- `initializeEquipmentDefaults(): void` (line 192) - Initializes equipment database with EnhancedEquipment format (includes source field and spawnWeight)
- `areEquipmentDefaultsInitialized(): boolean` (line 202) - Checks if equipment category is registered
- `ensureEquipmentDefaultsInitialized(): void` (line 216) - Idempotent initialization

**RACE DEFAULTS** (lines 29-31 of index.ts, lines 227-255 of initializeDefaults.ts):
- `initializeRaceDefaults(): void` (line 227) - Initializes races with default data (ALL_RACES)
- `areRaceDefaultsInitialized(): boolean` (line 237) - Checks if races category is registered
- `ensureRaceDefaultsInitialized(): void` (line 251) - Idempotent initialization

**CLASS DEFAULTS** (lines 32-34 of index.ts, lines 262-290 of initializeDefaults.ts):
- `initializeClassDefaults(): void` (line 262) - Initializes classes with default data (ALL_CLASSES)
- `areClassDefaultsInitialized(): boolean` (line 272) - Checks if classes category is registered
- `ensureClassDefaultsInitialized(): void` (line 286) - Idempotent initialization

**FEATURE DEFAULTS** (lines 35-37 of index.ts, lines 328-391 of initializeDefaults.ts):
- `initializeFeatureDefaults(): void` (line 328) - Initializes FeatureRegistry with class features and racial traits, plus ExtensionManager for spawn rate management
- `areFeatureDefaultsInitialized(): boolean` (line 376) - Checks if FeatureRegistry is initialized
- `ensureFeatureDefaultsInitialized(): void` (line 387) - Idempotent initialization

**SKILL DEFAULTS** (lines 38-40 of index.ts, lines 400-450 of initializeDefaults.ts):
- `initializeSkillDefaults(): void` (line 400) - Initializes SkillRegistry with default D&D 5e skills, plus ExtensionManager for spawn rate management
- `areSkillDefaultsInitialized(): boolean` (line 435) - Checks if SkillRegistry is initialized
- `ensureSkillDefaultsInitialized(): void` (line 446) - Idempotent initialization

**CONVENIENCE FUNCTIONS** (lines 41-42 of index.ts):
- `initializeAllDefaults(): void` (line 298) - Calls all individual `initialize*Defaults()` functions (appearance, spell, equipment, race, class)
- `ensureAllDefaultsInitialized(): void` (line 312) - Calls all individual `ensure*DefaultsInitialized()` functions (appearance, spell, equipment, race, class, feature, skill)

**NOTE**: `initializeAllDefaults()` does NOT include feature and skill initialization (line 298-304), but `ensureAllDefaultsInitialized()` DOES include them (line 312-320). This is an intentional design difference - `initializeAllDefaults()` is for basic ExtensionManager data, while `ensureAllDefaultsInitialized()` ensures ALL registries (FeatureRegistry, SkillRegistry) are also initialized.

**BUILD STATUS**: Clean - build completed successfully with no errors
- **Phase 3 Status**: COMPLETE (all 8 tasks verified and documented)

---

## Phase 4: Generation Components

**Objective**: Verify character generation building blocks

### Task 4.1: RaceSelector → src/core/generation/RaceSelector.ts
- [x] class exists and is exported
- [x] Methods for selecting character races

**Task 4.1 Summary - COMPLETED**:
- **VERIFIED**: `RaceSelector` class exists at src/core/generation/RaceSelector.ts:20
  - Exported from src/index.ts at line 185
  - All methods are static utility methods for race selection
- **VERIFIED METHODS**:
  - `select(rng: SeededRNG): Race` (line 61)
    - Selects a random race deterministically from seeded RNG
    - Selects from available races (default 9 D&D 5e races plus any custom races):
      - Default: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
      - Custom: Any races registered via ExtensionManager
    - Uses weighted selection with spawn rate control
    - Same seed always selects the same race
    - Automatically ensures race defaults are initialized before selection
- **VERIFIED**: Type `Race` exists at src/core/types/Character.ts:38
  - Branded type for extensible Race names: `string & { readonly __RaceBrand: unique symbol }`
  - Helper function `asRace(value: string): Race` exported at line 55
  - Type guard `isValidRace(value: unknown): value is Race` exported at line 100
  - Constant `DEFAULT_RACES: readonly Race[]` exported at line 83
- **ADDITIONAL FINDINGS**:
  - The class uses ExtensionManager to get registered races and weights
  - Supports spawn modes: 'relative', 'absolute', 'default', 'replace'
  - Integrates with WeightedSelector for actual selection
  - Documentation includes comprehensive JSDoc with examples
- **BUILD STATUS**: Clean - build completed successfully with no errors
- **DOCUMENTATION NOTE**: RaceSelector is listed in USAGE_IN_OTHER_PROJECTS.md but lacks detailed API documentation

### Task 4.2: ClassSuggester → src/core/generation/ClassSuggester.ts
- [x] class exists and is exported
- [x] Methods for suggesting classes based on audio

**Task 4.2 Summary - COMPLETED**:
- **VERIFIED**: `ClassSuggester` class exists at src/core/generation/ClassSuggester.ts:41
  - Exported from src/index.ts at line 186
  - All methods are static utility methods for class suggestion based on audio
- **VERIFIED METHODS**:
  - `suggest(audioProfile: AudioProfile, rng: SeededRNG): Class` (line 100)
    - Suggests a class based on audio frequency dominance
    - Uses affinity-based system with 4% baseline probability
    - Maps audio characteristics to character classes:
      - High bass (strength) → Barbarian, Fighter, Paladin
      - High treble (dexterity) → Rogue, Ranger, Monk
      - High mid (intelligence/wisdom) → Wizard, Cleric, Druid
      - High amplitude (charisma) → Bard, Sorcerer, Warlock
    - Supports custom classes via ExtensionManager
    - Supports custom spawn rate weights
    - Same seed always suggests the same class (deterministic)
- **PRIVATE METHODS** (internal implementation):
  - `calculateAllAffinities()` - Calculate affinity for all classes based on audio profile
  - `calculateClassAffinity()` - Calculate affinity for a single class
  - `getCustomClassAudioPreferences()` - Get audio preferences for custom classes
  - `getTraitContribution()` - Get contribution of specific audio trait to affinity
  - `calculateProbabilities()` - Convert affinity scores to probabilities with 4% baseline
  - `applyCustomWeights()` - Apply custom spawn rate weights to probabilities
- **ALGORITHM DETAILS**:
  - Uses CLASS_AUDIO_PREFERENCES from constants for default D&D 5e classes
  - Each class has preferred audio traits (bass, treble, mid, amplitude, chaos)
  - Primary trait contributes 100% of its weight
  - Secondary trait contributes 50% of its weight
  - Tertiary trait contributes 25% of its weight
  - 4% baseline ensures every class has minimum chance
  - No class lockout - any class can be selected at any time
- **ADDITIONAL FINDINGS**:
  - Type `AudioProfile` exists at src/core/types/AudioProfile.ts:5
  - Type `Class` exists at src/core/types/Character.ts:72
  - Type `SeededRNG` exists at src/utils/random.ts
  - The class is used internally by CharacterGenerator for class selection
- **BUILD STATUS**: Clean - build completed successfully with no errors
- **DOCUMENTATION NOTE**: ClassSuggester is listed in USAGE_IN_OTHER_PROJECTS.md line 1503 with brief description "Suggest classes based on audio" but lacks detailed API documentation

### Task 4.3: AbilityScoreCalculator → src/core/generation/AbilityScoreCalculator.ts
- [x] class exists and is exported
- [x] Methods for calculating ability scores

**Task 4.3 Summary - COMPLETED**:
- **VERIFIED**: `AbilityScoreCalculator` class exists at src/core/generation/AbilityScoreCalculator.ts:21
  - Exported from src/index.ts at line 187
  - All methods are static utility methods for ability score calculation
- **VERIFIED METHODS**:
  - `calculateBaseScores(audioProfile: AudioProfile): AbilityScores` (line 40)
    - Calculates base ability scores (8-15 range) from audio profile frequencies
    - Maps audio characteristics to six D&D 5e ability scores:
      - High bass → High Strength (STR)
      - High treble → High Dexterity (DEX)
      - High amplitude → High Constitution (CON)
      - High mid-range → High Intelligence (INT)
      - Balanced (bass ≈ treble) → High Wisdom (WIS)
      - Combined mid + amplitude → High Charisma (CHA)
    - Formula: `8 + (dominance × 7)` for each ability
  - `applyRacialBonuses(baseScores: AbilityScores, race: string): AbilityScores` (line 76)
    - Applies racial ability bonuses to base scores
    - Supports both default D&D 5e races and custom races registered via ExtensionManager
    - Uses `getRaceData()` from utils/constants.ts to retrieve racial bonuses
    - Caps all abilities at 20 (D&D 5e standard maximum)
    - Returns warning to console for unknown races
  - `calculateModifiers(scores: AbilityScores): AbilityScores` (line 113)
    - Calculates ability modifiers from ability scores
    - Uses D&D 5e formula: `floor((score - 10) / 2)`
    - Returns modifiers used for d20 rolls and damage calculations
- **VERIFIED**: Type `AbilityScores` exists at src/core/types/Character.ts:320 with properties:
  - `STR: number` - Strength score
  - `DEX: number` - Dexterity score
  - `CON: number` - Constitution score
  - `INT: number` - Intelligence score
  - `WIS: number` - Wisdom score
  - `CHA: number` - Charisma score
  - Aliases for compatibility: `dexterity`, `strength`, `constitution`, `intelligence`, `wisdom`, `charisma`
- **VERIFIED**: Type `AudioProfile` exists at src/core/types/AudioProfile.ts:5 with properties:
  - `bass_dominance: number`
  - `mid_dominance: number`
  - `treble_dominance: number`
  - `average_amplitude: number`
- **BUILD STATUS**: Clean - build completed successfully with no errors
- **DOCUMENTATION NOTE**: AbilityScoreCalculator is listed in USAGE_IN_OTHER_PROJECTS.md but lacks detailed API documentation

### Task 4.4: SkillAssigner → src/core/generation/SkillAssigner.ts
- [x] class exists and is exported
- [x] `assignSkills(className: Class, rng: SeededRNG): Record<Skill, ProficiencyLevel>`
- [x] Type `ProficiencyLevel` exists ('proficient', 'expertise', 'none')

**Task 4.4 Summary - COMPLETED**:
- **VERIFIED**: `SkillAssigner` class exists at src/core/generation/SkillAssigner.ts:25
  - Exported from src/index.ts at line 188
  - All methods are static utility methods for skill assignment
- **VERIFIED**: `assignSkills(characterClass: Class, rng: SeededRNG, character?: CharacterSheet): Record<string, ProficiencyLevel>` exists at line 38
  - **MINOR NOTE**: Return type uses `Record<string, ProficiencyLevel>` not `Record<Skill, ProficiencyLevel>` as documented
  - The return type uses string keys to support custom skills, which is more flexible than the branded `Skill` type
  - Accepts optional `character` parameter for prerequisite validation (filtering skills by character's level/abilities/features)
- **VERIFIED**: Type `ProficiencyLevel` exists at src/core/types/Character.ts:277 as `'none' | 'proficient' | 'expertise'`
  - Exported from src/index.ts at line 32
- **VERIFIED**: Type `Skill` exists at src/core/types/Character.ts:257 as a union of 18 D&D 5e skills
  - Exported from src/index.ts at line 31
  - Skills: athletics, acrobatics, sleight_of_hand, stealth, arcana, history, investigation, nature, religion, animal_handling, insight, medicine, perception, survival, deception, intimidation, performance, persuasion
- **ADDITIONAL FINDINGS**:
  - The class uses SkillRegistry to support custom skills beyond the default 18 D&D 5e skills
  - Validates all skill IDs against the SkillRegistry before assignment
  - Filters skills by prerequisites when a character is provided (e.g., skills requiring certain levels, abilities, or features)
  - Handles expertise for Bard and Rogue classes (selected from proficient skills)
  - Uses Fisher-Yates shuffle with seeded RNG for deterministic skill selection
  - Integrates with ExtensionManager for custom class data
  - Comments indicate future enhancement: spawn rate weights via ExtensionManager for skill selection
- **BUILD STATUS**: Clean - build completed successfully with no errors
- **DOCUMENTATION NOTE**: The plan referenced `Record<Skill, ProficiencyLevel>` but actual implementation uses `Record<string, ProficiencyLevel>` to support custom skills

### Task 4.5: SpellManager → src/core/generation/SpellManager.ts
- [x] class exists and is exported
- [x] Static method: `isSpellcaster(className: Class): boolean`
- [x] `initializeSpells(className: Class, level: number): SpellSlots`
  - [x] **INVESTIGATED**: Return type is `SpellSlots`, not `SpellConfig` (task documentation was incorrect)
- [x] `getSpellSlots(className: Class, level: number): SpellSlots`
  - [x] Type `SpellSlots` exists at src/core/generation/SpellManager.ts:24
- [x] `getCantrips(className: Class): string[]`
- [x] `getKnownSpells(className: Class, level: number): string[]`

**Task 4.5 Summary - COMPLETED**:
- **VERIFIED**: `SpellManager` class exists at src/core/generation/SpellManager.ts:33
  - Exported from src/index.ts at line 189
- **VERIFIED**: Static method `isSpellcaster(characterClass: Class): boolean` exists at line 40
  - Returns true for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard
  - Returns false for non-spellcasting classes
- **INVESTIGATED**: Method signature is `initializeSpells(className: Class, level: number): SpellSlots`
  - **DISCREPANCY FOUND**: Task documentation listed return type as `SpellConfig` but actual return type is `SpellSlots`
  - Actual signature includes optional third parameter: `initializeSpells(characterClass: Class, characterLevel: number, character?: CharacterSheet): SpellSlots`
  - The optional `character` parameter enables prerequisite filtering for spells
- **VERIFIED**: Type `SpellSlots` exists at src/core/generation/SpellManager.ts:24 with properties:
  - `spell_slots: Record<number, { total: number; used: number }>` - Spell slots by level (0-9)
  - `known_spells: string[]` - Array of known spell names
  - `cantrips: string[]` - Array of cantrip names
- **DISCREPANCY FOUND**: `SpellSlots` type is NOT exported from src/index.ts
  - The type is defined as `export interface SpellSlots` in SpellManager.ts:24
  - However, it is NOT included in the public type exports in src/index.ts
  - **RECOMMENDATION**: Add `export type { SpellSlots } from './core/generation/SpellManager.js';` to src/index.ts for API consumers
- **VERIFIED**: `getSpellSlots(characterClass: Class, characterLevel: number): Record<number, { total: number; used: number }>` exists at line 55
  - Returns empty object for non-spellcasting classes
  - Uses `getSpellSlotsForClass()` helper function for default and custom spell slot progression
  - Returns 0-based slots (all start with `used: 0`)
- **VERIFIED**: `getCantrips(characterClass: Class): string[]` exists at line 93
  - Returns empty array for non-spellcasting classes
  - Uses `getClassSpellList()` helper for default and custom spell lists
  - Checks `spells.${ClassName}` category in ExtensionManager for extended spell data
- **VERIFIED**: `getKnownSpells(characterClass: Class, characterLevel: number, character?: CharacterSheet): string[]` exists at line 140
  - Returns empty array for non-spellcasting classes
  - Collects all spells available up to the character's level
  - Filters spells by prerequisites when a character is provided
  - Uses `getClassSpellList()` helper for default and custom spell lists
  - Checks `spells.${ClassName}` category in ExtensionManager for extended spell data
- **ADDITIONAL METHODS** (not in task description but part of the public API):
  - `getSpellCountAtLevel(spellLevel: number, spellSlots: Record<number, { total: number; used: number }>): number` (line 289)
  - `useSpellSlot(spellSlots: Record<number, { total: number; used: number }>, spellLevel: number): Record<number, { total: number; used: number }>` (line 303)
  - `restoreSpellSlots(spellSlots: Record<number, { total: number; used: number }>, spellLevel?: number): Record<number, { total: number; used: number }>` (line 328)
  - `filterCharacterSpells(character: CharacterSheet): CharacterSheet` (line 362)
- **BUILD STATUS**: Clean - build completed successfully with no errors
- **DOCUMENTATION NOTES**:
  - Task documentation incorrectly listed return type as `SpellConfig` - should be `SpellSlots`
  - Task documentation listed parameter as `className` but actual parameter is `characterClass`
  - `getKnownSpells` has an optional third parameter `character?: CharacterSheet` that was not documented

### Task 4.6: EquipmentGenerator → src/core/generation/EquipmentGenerator.ts
- [x] class exists and is exported
- [x] `initializeEquipment(className: Class): CharacterEquipment`
- [x] Returns CharacterEquipment with:
  - [x] `weapons: InventoryItem[]`
  - [x] `armor: InventoryItem[]`
  - [x] `items: InventoryItem[]`
- [x] Type `CharacterEquipment` exists
- [x] Type `InventoryItem` exists

- **VERIFIED**: Class `EquipmentGenerator` exists at src/core/generation/EquipmentGenerator.ts:43
- **VERIFIED**: Exported from src/index.ts line 190
- **VERIFIED**: Method `initializeEquipment` exists at line 136
- **DISCREPANCY FOUND**: Parameter name is `characterClass` (not `className` as listed in task)
- **VERIFIED**: Type `CharacterEquipment` exists at src/core/types/Equipment.ts:183-189, exported from src/index.ts:64
- **VERIFIED**: Type `InventoryItem` exists at src/core/generation/EquipmentGenerator.ts:37-41, exported from src/index.ts:60
- **BUILD STATUS**: Clean - build completed successfully with no errors
- **DOCUMENTATION NOTES**:
  - Task documentation listed parameter as `className` but actual parameter is `characterClass`
  - Actual return uses `EnhancedInventoryItem[]` which is compatible with `InventoryItem[]` for consumers

### Task 4.7: NamingEngine → src/core/generation/NamingEngine.ts
- [x] class exists and is exported
- [x] `generateName(track: PlaylistTrack, audioProfile: AudioProfile): string`

**Task 4.7 Summary - COMPLETED**:
- **VERIFIED**: `NamingEngine` class exists at src/core/generation/NamingEngine.ts:15
  - Exported from src/index.ts at line 192
  - All methods are instance methods (not static)
- **VERIFIED**: `generateName(track: PlaylistTrack, audioProfile: AudioProfile): string` exists at line 40
  - Takes a `PlaylistTrack` (from src/core/types/Playlist.ts) and `AudioProfile` (from src/core/types/AudioProfile.ts)
  - Returns a generated RPG-style character name (20-50 characters)
  - Uses three name formats weighted: 50% Class Title, 30% Adjective Construct, 20% Clan Construct
  - Cleans track title by removing metadata (Official Video, Remix, etc.)
  - Uses seeded RNG with track UUID for deterministic name generation
- **VERIFIED**: Type `PlaylistTrack` exists at src/core/types/Playlist.ts:27
  - Has properties: `uuid`, `title`, `artist`, `genre`, etc.
- **VERIFIED**: Type `AudioProfile` exists at src/core/types/AudioProfile.ts:5
  - Has properties: `bass_dominance`, `mid_dominance`, `treble_dominance`, `average_amplitude`
- **ADDITIONAL PUBLIC METHOD**:
  - `cleanTitle(title: string): string` (line 72) - Cleans track title by removing metadata and noise
- **BUILD STATUS**: Clean - no compilation errors
- **DOCUMENTATION NOTE**: NamingEngine is listed in USAGE_IN_OTHER_PROJECTS.md but lacks detailed API documentation

### Task 4.8: AppearanceGenerator → src/core/generation/AppearanceGenerator.ts
- [x] class exists and is exported
- [x] `generate(seed: string, className: Class, audioProfile: AudioProfile): CharacterAppearance`
- [x] Type `CharacterAppearance` exists with:
  - [x] `body_type: string` (actually: `'slender' | 'athletic' | 'muscular' | 'stocky'`)
  - [x] `hair_color: string`
  - [x] `hair_style: string`
  - [x] `eye_color: string`
  - [x] `skin_tone: string`
  - [x] `facial_features: string[]`
  - [x] `aura_color?: string`
  - [x] **ADDITIONAL**: `primary_color?: string` - from audio profile palette
  - [x] **ADDITIONAL**: `secondary_color?: string` - from audio profile palette

**Task 4.8 Summary - COMPLETED**:
- **VERIFIED**: `AppearanceGenerator` class exists at src/core/generation/AppearanceGenerator.ts:34
  - Exported from src/index.ts at line 191
  - Has static method: `generate(seed: string, characterClass: Class, audioProfile: AudioProfile): CharacterAppearance`
  - Note: The parameter is named `characterClass` in the code, not `className` as documented
- **VERIFIED**: Type `CharacterAppearance` exists at src/core/generation/AppearanceGenerator.ts:8
  - Exported from src/index.ts at line 59 as `export type`
  - Has all documented properties plus additional ones
  - `body_type` is actually a union type: `'slender' | 'athletic' | 'muscular' | 'stocky'` (not just `string`)
  - Has additional properties `primary_color?: string` and `secondary_color?: string` that come from the audio profile's color palette
- **BUILD STATUS**: Clean - no compilation errors

---

## Phase 5: Progression System

**Objective**: Verify XP, leveling, and stat management APIs

### Task 5.1: XPCalculator → src/core/progression/XPCalculator.ts
- [x] class exists and is exported
- [x] `calculateSessionXP(session: ListeningSession, track: PlaylistTrack): number`
- [x] Type `ListeningSession` exists

**Task 5.1 Summary - COMPLETED**:
- **VERIFIED**: `XPCalculator` class exists at src/core/progression/XPCalculator.ts:54
  - Exported from src/index.ts at line 208
- **VERIFIED**: `calculateSessionXP(session: ListeningSession, track?: PlaylistTrack): number` method exists at line 83
  - **MINOR DISCREPANCY**: The `track` parameter is **optional** (`track?: PlaylistTrack`) in the implementation, but the documentation in USAGE_IN_OTHER_PROJECTS.md shows it as required
  - The method accepts optional track parameter and only uses it for track completion bonus (95%+ listened)
- **VERIFIED**: Type `ListeningSession` exists at src/core/types/Progression.ts:60
  - Exported from src/index.ts at line 44
  - Has properties: `track_uuid`, `start_time`, `end_time`, `duration_seconds`, `base_xp_earned`, `bonus_xp`, `environmental_context`, `gaming_context`, `activity_type`, `total_xp_earned`
- **VERIFIED**: Type `PlaylistTrack` exists and is exported from src/index.ts at line 13
- **BUILD STATUS**: Clean - no compilation errors

### Task 5.2: SessionTracker → src/core/progression/SessionTracker.ts
- [x] class exists and is exported
- [x] `startSession(trackUuid: string, track?: PlaylistTrack, context?: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): string`
  - [x] **INVESTIGATED**: Type `SessionContext` does NOT exist - the implementation uses inline object type
  - **MINOR NOTE**: Parameter name is `trackUuid` (not `trackId` as listed in task)
  - **MINOR NOTE**: `track` parameter is optional (not required as shown in task)
- [x] `endSession(sessionId: string, durationOverride?: number, activityType?: string): ListeningSession | null`
  - **MINOR NOTE**: Returns `null` (not `undefined` as shown in task)
  - **ADDITIONAL**: Has optional `durationOverride` and `activityType` parameters not documented in task
- [x] `getTrackListenCount(trackUuid: string): number`
  - **MINOR NOTE**: Parameter name is `trackUuid` (not `trackId` as listed in task)

**Task 5.2 Summary - COMPLETED**:
- **VERIFIED**: `SessionTracker` class exists at src/core/progression/SessionTracker.ts:29
  - Exported from src/index.ts at line 209
  - Has constructor: `constructor(xpCalculator?: XPCalculator)`
- **VERIFIED**: `startSession(trackUuid: string, track?: PlaylistTrack, context?: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): string` exists at line 50
  - **MINOR DISCREPANCY**: Parameter name is `trackUuid` not `trackId` as documented in task
  - **MINOR DISCREPANCY**: `track` parameter is optional (`track?:`) not required as shown in task
  - **INVESTIGATED**: The `SessionContext` type does NOT exist in the codebase
    - The implementation uses inline object type: `{ environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }`
    - **RECOMMENDATION**: No action needed - the inline type is clear and sufficient. If a named type is desired for consumers, a `SessionContext` type alias could be added but is not necessary
- **VERIFIED**: `endSession(sessionId: string, durationOverride?: number, activityType?: string): ListeningSession | null` exists at line 79
  - Returns `ListeningSession | null` (not `undefined` as shown in task)
  - **ADDITIONAL PARAMETERS** not documented in task:
    - `durationOverride?: number` - Override for session duration in seconds
    - `activityType?: string` - Activity type (stationary, walking, running, driving)
- **VERIFIED**: `getTrackListenCount(trackUuid: string): number` exists at line 223
  - **MINOR NOTE**: Parameter name is `trackUuid` not `trackId` as documented in task
- **VERIFIED**: Type `ListeningSession` exists at src/core/types/Progression.ts:60
  - Exported from src/index.ts at line 44
  - Has properties: `track_uuid`, `start_time`, `end_time`, `duration_seconds`, `base_xp_earned`, `bonus_xp`, `environmental_context`, `gaming_context`, `activity_type`, `total_xp_earned`
- **ADDITIONAL METHODS** (not in task description but part of the public API):
  - `getActiveSession(sessionId: string): ActiveSession | null` (line 132)
  - `getActiveSessionDuration(sessionId: string): number | null` (line 141)
  - `updateSessionContext(sessionId: string, context: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): boolean` (line 153)
  - `getSessionHistory(): ListeningSession[]` (line 177)
  - `getSessionsForTrack(trackUuid: string): ListeningSession[]` (line 186)
  - `getTotalListeningTime(): number` (line 194)
  - `getTotalXPEarned(): number` (line 202)
  - `getTrackListeningTime(trackUuid: string): number` (line 211)
  - `isTrackMastered(trackUuid: string, masteryThreshold?: number): boolean` (line 233)
  - `getSessionsInRange(startTime: number, endTime: number): ListeningSession[]` (line 243)
  - `getAverageSessionLength(): number` (line 253)
  - `getLongestSession(): ListeningSession | null` (line 262)
  - `clearHistory(): void` (line 273)
  - `clearActiveSessions(): void` (line 281)
  - `getActiveSessionCount(): number` (line 289)
  - `getActiveSessionIds(): string[]` (line 297)
- **BUILD STATUS**: Clean - build completed successfully with no compilation errors
- **DOCUMENTATION NOTES**:
  - Task documentation parameter names (`trackId`, `track` as required) differ slightly from implementation (`trackUuid`, `track` as optional)
  - Task documentation shows `SessionContext` type which doesn't exist - implementation uses inline object type
  - Task documentation shows `undefined` return type for `endSession` but actual implementation returns `null`
  - DATA_ENGINE_REFERENCE.md correctly documents the actual API with proper parameter names and types

### Task 5.3: LevelUpProcessor → src/core/progression/LevelUpProcessor.ts
- [x] class exists and is exported
- [x] `processLevelUp(character: CharacterSheet, newLevel: number, seed?: string): LevelUpBenefits`
- [x] `applyLevelUp(character: CharacterSheet, benefits: LevelUpBenefits): CharacterSheet`
- [x] `setUncappedConfig(config: UncappedProgressionConfig): void`
  - [x] Config supports `xpFormula: (level: number) => number`
  - [x] Config supports `proficiencyBonusFormula: (level: number) => number`
- [x] Type `LevelUpBenefits` exists
- [x] Type `UncappedProgressionConfig` exists

**Task 5.3 Summary - COMPLETED**:
- **VERIFIED**: `LevelUpProcessor` class exists at src/core/progression/LevelUpProcessor.ts:86
  - Exported from src/index.ts at line 210
- **VERIFIED**: `processLevelUp(character: CharacterSheet, newLevel: number, seed?: string): LevelUpBenefits` exists at line 130
  - Processes character level-up with HP increases, proficiency bonus, ability scores, spell slots, and class features
  - Uses FeatureRegistry for class feature lookup (Phase 11.5)
  - Validates prerequisite chains on level up
  - Returns feature IDs instead of display strings
- **VERIFIED**: `applyLevelUp(character: CharacterSheet, benefits: LevelUpBenefits): CharacterSheet` exists at line 295
  - Updates character with level-up benefits
  - Applies ability score increases with stat cap handling (20 for standard, Infinity for uncapped)
  - Updates spell slots and class features
  - Re-applies equipment effects after level-up (Phase 9.2)
- **VERIFIED**: `setUncappedConfig(config: UncappedProgressionConfig): void` exists at line 96
- **VERIFIED**: Type `UncappedProgressionConfig` exists at line 75 with properties:
  - `xpFormula?: (level: number) => number` - Custom formula for calculating XP threshold for ANY level (line 77)
  - `proficiencyBonusFormula?: (level: number) => number` - Custom formula for calculating proficiency bonus for ANY level (line 79)
- **VERIFIED**: Type `LevelUpBenefits` exists at line 25 with properties:
  - `newLevel: number` (line 26)
  - `hitPointIncrease: number` (line 27)
  - `newHitPointsTotal: number` (line 28)
  - `proficiencyBonusIncrease: number` (line 29)
  - `newProficiencyBonus: number` (line 30)
  - `abilityScoreIncreases?: Array<{ ability: Ability; increase: number }>` (line 33) - New: Support multiple stat increases
  - `abilityScoreIncrease?: { ability: Ability; increase: number }` (line 39) - Deprecated: Kept for backward compatibility
  - `newSpellSlots?: Record<number, { total: number; used: number }>` (line 44)
  - `classFeatures?: string[]` (line 52) - Phase 11.5: Returns feature IDs instead of display strings
  - `featureEffects?: Array<{ featureId: string; featureName: string; effectsApplied: number }>` (line 58) - Phase 11.5: Effects applied during level-up
- **ADDITIONAL METHODS NOT IN TASK BUT VERIFIED**:
  - `getUncappedConfig(): UncappedProgressionConfig | undefined` (line 103)
  - `setStatManager(statManager: StatManager): void` (line 113)
  - `getStatManager(): StatManager | undefined` (line 120)
  - `getXPThreshold(level: number, isUncapped: boolean): number` (line 463) - Get XP threshold for a specific level
  - `getProficiencyBonus(level: number, isUncapped: boolean): number` (line 508) - Get proficiency bonus for a specific level
  - `calculateLevel(totalXP: number, isUncapped: boolean): number` (line 538) - Calculate level from total XP
  - `getXPToNextLevel(currentLevel: number, isUncapped: boolean): number` (line 563) - Get XP needed to reach next level
  - `getProgressPercentage(currentLevel: number, currentXP: number, isUncapped: boolean): number` (line 581) - Get progress percentage to next level
  - `processLevelUpWithoutStats(character, newLevel, seed?)` (line 604) - Process level-up without stat increases (for pending system)
  - `applyAutomaticBenefitsOnly(character, benefits)` (line 691) - Apply automatic benefits only (no stats)
  - `applyStatIncreasesOnly(character, statIncreases)` (line 730) - Apply only stat increases
- **BUILD STATUS**: Clean - build completed successfully with no compilation errors

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
- [x] `Attack` - **INVESTIGATED in Task 2.6**: Type exists at src/core/types/Character.ts:289 but `CharacterSheet.attacks` property does NOT exist

### Task 11.2a: Type Documentation Inaccuracies
- [x] ~~`FrequencyBands` comments in AudioProfile.ts (lines 66-73) reference OLD v1 bands~~
  - **FOUND**: Comments say "Bass: 20-250Hz, Mid: 250Hz-4kHz, Treble: 4kHz-20kHz"
  - **ACTUAL**: Code uses v2 bands "Bass: 20-400Hz, Mid: 400Hz-4kHz, Treble: 4kHz-14kHz"
  - **RECOMMENDATION**: Update comments to match implemented v2 band ranges

### Task 11.3: Properties Needing Verification
- [ ] `Combatant.isDefeated` - Used in combat examples, verify exists
- [x] `CharacterSheet.attacks` - **INVESTIGATED in Task 2.6**: Property does NOT exist on CharacterSheet type
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
| 2 | Complete | 6 | ~40 | 2026-02-01 |
| 3 | Complete | 8 | ~60 | 2026-02-01 |
| 4 | In Progress | 4 | ~40 | 2026-02-01 |
| 5 | Not Started | 0 | ~50 | - |
| 6 | Not Started | 0 | ~30 | - |
| 7 | Not Started | 0 | ~30 | - |
| 8 | Not Started | 0 | ~20 | - |
| 9 | Not Started | 0 | ~60 | - |
| 10 | Not Started | 0 | ~80 | - |
| 11 | Not Started | 0 | ~15 | - |
| **ALL** | **In Progress** | **22** | **~475** | 2026-02-01 |
