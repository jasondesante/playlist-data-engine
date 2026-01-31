# DATA_ENGINE_REFERENCE.md - Verification Plan

> **Goal**: Systematically verify that every API element documented in DATA_ENGINE_REFERENCE.md exists in the codebase at the expected location, with matching signatures, correct exports, and accurate type annotations. This ensures documentation-code alignment and prevents breaking changes from going undetected.

---

## Important: Handling Discrepancies

**If any problems arise where the documentation and code do not match:**

1. **Add a new phase** to the end of this plan
2. **Research the tasks** required to fix the discrepancy
3. **Write the new phase and tasks** into this plan with appropriate detail
4. **Fix the problem with the code** when you reach that phase in execution

This ensures all discrepancies are tracked systematically and resolved with proper planning rather than ad-hoc fixes.

---

## Overview

This plan organizes verification tasks into **6 sequential phases** designed to validate the entire codebase systematically. Each phase focuses on a specific domain and builds upon previous verification work.

**Total Items to Verify**: ~400+ APIs, types, classes, and functions

**Verification Criteria per Item**:
- [ ] Exists in codebase at expected location
- [ ] Name matches exactly (case-sensitive)
- [ ] Signature/parameters match documentation
- [ ] Exported correctly (export / export default / internal)
- [ ] Type annotations are accurate
- [ ] Any generics or constraints are documented correctly

---

## Phase 1: Foundation Types & Utilities
**Focus**: Core data structures, type definitions, and utility functions that everything else depends on.
**Estimated Items**: ~60

### Task 1.1: Core Playlist & Audio Types (6 items) ✅ COMPLETED
- [x] ServerlessPlaylist → src/core/types/Playlist.ts ✅
- [x] PlaylistTrack → src/core/types/Playlist.ts ✅
- [x] RawArweavePlaylist → src/core/types/Playlist.ts ✅
- [x] AudioProfile → src/core/types/AudioProfile.ts ✅
- [x] ColorPalette → src/core/types/AudioProfile.ts ✅ (see notes)
- [x] FrequencyBands → src/core/types/AudioProfile.ts ✅

### Task 1.2: Character Type Definitions (9 items) ✅ COMPLETED
- [x] Race (type) → src/core/types/Character.ts (16) ✅ (location mismatch in plan)
- [x] Class (type) → src/core/types/Character.ts (49) ✅ (signature mismatch: branded type vs union; location mismatch)
- [x] Ability (type) → src/core/types/Character.ts (151) ✅ (location mismatch in plan)
- [x] Skill (type) → src/core/types/Character.ts (153-171) ✅ (location mismatch in plan)
- [x] ProficiencyLevel (type) → src/core/types/Character.ts (173) ✅ (location mismatch in plan)
- [x] GameMode (type) → src/core/types/Character.ts (180) ✅ (location mismatch in plan)
- [x] Attack (interface) → src/core/types/Character.ts (185-196) ✅ (location mismatch; missing `properties?: string[]` in DATA_ENGINE_REFERENCE.md)
- [x] Spell (interface) → src/core/types/Character.ts (201-214) ✅ (location mismatch in plan)
- [x] AbilityScores (interface) → src/core/types/Character.ts (216-227) ✅ (location mismatch in plan)

### Task 1.3: Character Interfaces (4 items) ✅ COMPLETED
- [x] CharacterSheet → src/core/types/Character.ts (229-373) ✅ (location mismatch; src/types/CharacterTypes.ts does not exist)
- [x] CharacterEquipment → src/core/types/Equipment.ts (183-189) ✅ (location mismatch)
- [x] InventoryItem → src/core/generation/EquipmentGenerator.ts (37-41) as basic version; EnhancedInventoryItem → src/core/types/Equipment.ts (164-177) ✅ (location mismatch; naming variation)
- [x] CharacterAppearance → src/core/generation/AppearanceGenerator.ts (8-21) ✅ (location mismatch)

### Task 1.4: Utility Functions & RNG (7 items) ✅ COMPLETED
- [x] generateSeed() → src/utils/hash.ts ✅ (location mismatch: documented as src/utils/random.ts)
- [x] hashSeedToFloat() → src/utils/hash.ts ✅ (location mismatch: documented as src/utils/random.ts)
- [x] hashSeedToInt() → src/utils/hash.ts ✅ (location mismatch: documented as src/utils/random.ts)
- [x] class SeededRNG → src/utils/random.ts ✅
  - [x] constructor(seed: string) ✅
  - [x] random(): number ✅
  - [x] randomInt(min: number, max: number): number ✅
  - [x] randomChoice<T>(array: T[]): T ✅
  - [x] weightedChoice<T>(choices: [T, number][]): T ✅
  - [x] shuffle<T>(array: T[]): T[] ✅

### Task 1.5: Validation Schemas (4 items) ✅ COMPLETED
- [x] PlaylistTrackSchema → src/utils/validators.ts (14-48) ✅ (location mismatch: documented as src/schemas/)
- [x] ServerlessPlaylistSchema → src/utils/validators.ts (53-61) ✅ (location mismatch: documented as src/schemas/)
- [x] AudioProfileSchema → src/utils/validators.ts (66-89) ✅ (location mismatch: documented as src/schemas/)
- [x] CharacterSheetSchema → src/utils/validators.ts (106-156) ✅ (location mismatch: documented as src/schemas/)

---

## Phase 2: Core Processing Modules
**Focus**: Parser, analyzer, and character generation - the heart of the engine.
**Estimated Items**: ~50

### Task 2.1: Playlist Parser (8 items) ✅ COMPLETED
- [x] class PlaylistParser → src/core/parser/PlaylistParser.ts
  - [x] constructor(options?: PlaylistParserOptions) ✅
  - [x] parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist> ✅
- [x] class MetadataExtractor (static) → src/core/parser/MetadataExtractor.ts
  - [x] extractAudioUrl(data: Record<string, unknown>): string | null ✅
  - [x] extractImageUrl(data: Record<string, unknown>): string | null ✅
  - [x] extractTitle(data: Record<string, unknown>): string | null ✅
  - [x] extractArtist(data: Record<string, unknown>): string | null ✅
  - [x] parseMetadata(metadata: unknown): Record<string, unknown> | null ✅
  - [x] convertAttributes(attributes: unknown): Record<string, string | number> | null ✅

### Task 2.2: Audio Analyzer (5 items) ✅ COMPLETED
- [x] class AudioAnalyzer → src/core/analysis/AudioAnalyzer.ts ✅
  - [x] constructor(options?: AudioAnalyzerOptions) ✅
  - [x] extractSonicFingerprint(audioUrl: string): Promise<AudioProfile> ✅
- [x] class ColorExtractor → src/core/analysis/ColorExtractor.ts ✅
  - [x] extractPalette(imageUrl: string): Promise<ColorPalette> ✅
- [x] class SpectrumScanner (static) → src/core/analysis/SpectrumScanner.ts ✅
  - [x] separateFrequencyBands(frequencyData: Uint8Array, sampleRate: number): FrequencyBands ✅

### Task 2.3: Character Generation (35 items) 🔄 IN PROGRESS (3/~35 done)
- [x] class CharacterGenerator (static) → src/core/generation/CharacterGenerator.ts
  - [x] generate(seed, audioProfile, name, options?): CharacterSheet ✅
- [x] class RaceSelector (static) → src/core/generation/RaceSelector.ts
  - [x] select(rng: SeededRNG): Race ✅
- [x] class ClassSuggester (static) → src/core/generation/ClassSuggester.ts ✅
  - [x] suggest(audioProfile, rng): Class ✅
- [x] class AbilityScoreCalculator (static) → src/core/generation/AbilityScoreCalculator.ts ✅
  - [x] calculateBaseScores(audioProfile): AbilityScores ✅
  - [x] applyRacialBonuses(baseScores, race): AbilityScores ✅ (parameter type: string vs Race documented; both correct for custom race support)
  - [x] calculateModifiers(scores): AbilityScores ✅
- [x] class SkillAssigner (static) → src/core/generation/SkillAssigner.ts
  - [x] assignSkills(characterClass, rng, character?): Record<string, ProficiencyLevel> ✅ (return type: string vs Skill documented; third parameter missing from docs; both correct for custom skill/prerequisite support)
- [x] class SpellManager (static) → src/core/generation/SpellManager.ts ✅
  - [x] isSpellcaster(characterClass): boolean ✅
  - [x] getSpellSlots(characterClass, characterLevel): Record<number, { total; used }> ✅
  - [x] getCantrips(characterClass): string[] ✅
  - [x] getKnownSpells(characterClass, characterLevel): string[] ✅ (signature mismatch: actual has third parameter `character?: CharacterSheet` for prerequisite filtering; code is correct, documentation needs update)
  - [x] initializeSpells(characterClass, characterLevel): SpellSlots ✅ (signature mismatch: actual has third parameter `character?: CharacterSheet` for prerequisite filtering; code is correct, documentation needs update)
  - [x] getSpellCountAtLevel(spellLevel, spellSlots): number ✅
  - [x] useSpellSlot(spellSlots, spellLevel): Record<number, { total; used }> ✅
  - [x] restoreSpellSlots(spellSlots, spellLevel?): Record<number, { total; used }> ✅
  - [x] filterCharacterSpells(character): CharacterSheet ✅ (missing from documentation)
- [ ] class EquipmentGenerator (static) → src/core/generation/EquipmentGenerator.ts
  - [ ] getStartingEquipment(characterClass): { weapons; armor; items }
  - [ ] initializeEquipment(characterClass): CharacterEquipment
  - [ ] addItem(equipment, itemName, quantity?, character?): CharacterEquipment
  - [ ] removeItem(equipment, itemName, quantity?, character?): CharacterEquipment
  - [ ] equipItem(equipment, itemName, character?): CharacterEquipment
  - [ ] unequipItem(equipment, itemName, character?): CharacterEquipment
  - [ ] getEquipmentData(itemName): EnhancedEquipment | undefined
  - [ ] getInventoryList(equipment): EnhancedInventoryItem[]
  - [ ] getEquipmentByType(equipment, type): EnhancedInventoryItem[]
- [ ] class AppearanceGenerator (static) → src/core/generation/AppearanceGenerator.ts
  - [ ] generate(seed, characterClass, audioProfile): CharacterAppearance
- [ ] class NamingEngine → src/core/generation/NamingEngine.ts
  - [ ] generateName(track, audioProfile): string
  - [ ] cleanTitle(title): string

---

## Phase 3: Progression & Combat Systems
**Focus**: XP tracking, leveling, stat management, and combat mechanics.
**Estimated Items**: ~80

### Task 3.1: Session & XP Tracking (22 items)
- [ ] class SessionTracker → src/core/progression/SessionTracker.ts
  - [ ] constructor(xpCalculator?)
  - [ ] startSession(trackUuid, track?, context?): string
  - [ ] endSession(sessionId, durationOverride?, activityType?): ListeningSession | null
  - [ ] getActiveSession(sessionId): ActiveSession | null
  - [ ] getActiveSessionDuration(sessionId): number | null
  - [ ] updateSessionContext(sessionId, context): boolean
  - [ ] getSessionHistory(): ListeningSession[]
  - [ ] getSessionsForTrack(trackUuid): ListeningSession[]
  - [ ] getTotalListeningTime(): number
  - [ ] getTotalXPEarned(): number
  - [ ] getTrackListeningTime(trackUuid): number
  - [ ] getTrackListenCount(trackUuid): number
  - [ ] isTrackMastered(trackUuid, masteryThreshold?): boolean
  - [ ] getSessionsInRange(startTime, endTime): ListeningSession[]
  - [ ] getAverageSessionLength(): number
  - [ ] getLongestSession(): ListeningSession | null
  - [ ] clearHistory(): void
  - [ ] clearActiveSessions(): void
  - [ ] getActiveSessionCount(): number
  - [ ] getActiveSessionIds(): string[]

### Task 3.2: Progression Types (6 items)
- [ ] ListeningSession → src/types/ProgressionTypes.ts
- [ ] ExperienceSystem → src/types/ProgressionTypes.ts
- [ ] CharacterUpdateResult → src/types/ProgressionTypes.ts
- [ ] LevelUpDetail → src/types/ProgressionTypes.ts
- [ ] LevelUpBenefits → src/types/ProgressionTypes.ts
- [ ] StatIncreaseResult → src/types/StatTypes.ts

### Task 3.3: XP Calculator & Level Up (14 items)
- [ ] class XPCalculator → src/core/progression/XPCalculator.ts
  - [ ] constructor(options?)
  - [ ] calculateSessionXP(session, track?): number
  - [ ] calculateTotalModifier(envContext?, gamingContext?): number
  - [ ] getXPThresholdForLevel(level): number
  - [ ] getXPToNextLevel(currentLevel): number
  - [ ] getLevelFromXP(totalXP): number
  - [ ] isTrackMastered(listenCount): boolean
  - [ ] getMasteryBonusXP(): number
  - [ ] getConfig(): ExperienceSystem
- [ ] class CharacterUpdater → src/core/progression/CharacterUpdater.ts
  - [ ] constructor(statManager?)
  - [ ] addXP(character, xpAmount, source?): Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'>
  - [ ] updateCharacterFromSession(character, session, track?, previousListenCount?): CharacterUpdateResult
  - [ ] applyPendingStatIncrease(character, primaryStat, secondaryStats?): ApplyPendingStatIncreaseResult
  - [ ] hasPendingStatIncreases(character): boolean
  - [ ] getPendingStatIncreaseCount(character): number
- [ ] class LevelUpProcessor (static) → src/core/progression/LevelUpProcessor.ts
  - [ ] applyLevelUp(character, benefits): CharacterSheet
  - [ ] getXPThreshold(level): number
  - [ ] setUncappedConfig(config): void
  - [ ] getUncappedConfig(): UncappedProgressionConfig | undefined
- [ ] class MasterySystem (static) → src/core/progression/MasterySystem.ts
  - [ ] checkMastery(listenCount): boolean
  - [ ] calculateMasteryBonus(isMastered): number
  - [ ] isJustMastered(previous, current): boolean

### Task 3.4: Stat Increase System (7 items)
- [ ] class StatManager → src/core/progression/stat/StatManager.ts
  - [ ] constructor(config?)
  - [ ] increaseStats(character, increases, source): StatIncreaseResult
  - [ ] decreaseStats(character, decreases, source): StatIncreaseResult
  - [ ] setStat(character, ability, value, source): StatIncreaseResult
  - [ ] processLevelUp(character, newLevel, options?): StatIncreaseResult | null
  - [ ] canIncrease(character, ability, amount): boolean
  - [ ] getStatCap(character, ability): number
  - [ ] updateConfig(config): void
- [ ] StatIncreaseConfig → src/types/StatTypes.ts
- [ ] StatIncreaseStrategyType → src/types/StatTypes.ts
- [ ] UncappedProgressionConfig → src/types/ProgressionTypes.ts

### Task 3.5: Combat System (30 items)
- [ ] CombatInstance, Combatant, CombatAction, StatusEffect, CombatActionResult, AttackRoll, DamageRoll, SpellCastResult, CombatResult, CombatConfig, DamageType, SavingThrowAbility, InitiativeResult, AttackResult, SpellSlots → src/types/CombatTypes.ts
- [ ] class CombatEngine → src/core/combat/CombatEngine.ts
  - [ ] constructor(config?)
  - [ ] startCombat(players, enemies, environment?): CombatInstance
  - [ ] getCurrentCombatant(combat): Combatant
  - [ ] executeAttack(combat, attacker, target, attack): CombatAction
  - [ ] executeCastSpell(combat, caster, spell, targets): CombatAction
  - [ ] executeDodge(combat, combatant): CombatAction
  - [ ] executeDash(combat, combatant): CombatAction
  - [ ] executeDisengage(combat, combatant): CombatAction
  - [ ] nextTurn(combat): CombatInstance
  - [ ] getCombatResult(combat): CombatResult | null
  - [ ] getCombatSummary(combat): string
  - [ ] applyDamage(combatant, damage): number
  - [ ] healCombatant(combatant, healing): number
  - [ ] applyTemporaryHP(combatant, tempHP): void
  - [ ] getLivingCombatants(combat): Combatant[]
  - [ ] getDefeatedCombatants(combat): Combatant[]
- [ ] class InitiativeRoller (static) → src/core/combat/InitiativeRoller.ts
  - [ ] rollInitiativeForCombatant(combatant): InitiativeResult
  - [ ] rollInitiativeForAll(combatants): { results; sortedCombatants }
  - [ ] getNextCombatant(combatants, currentIndex): { combatant; index; isNewRound }
  - [ ] getInitiativeOrder(combatants): string[]
  - [ ] rerollInitiativeForCombatant(combatant): number
  - [ ] delayTurn(combatants, combatantId): Combatant[]
  - [ ] resortByInitiative(combatants): Combatant[]
- [ ] class AttackResolver (static) → src/core/combat/AttackResolver.ts
  - [ ] resolveAttack(attacker, target, attack): AttackResult
  - [ ] isInRange(attacker, target, attack): boolean
  - [ ] calculateAttackBonus(character, attackName, abilityModifier, isProficient): number
  - [ ] attackWithAdvantage(attacker, target, attack): AttackResult
  - [ ] attackWithDisadvantage(attacker, target, attack): AttackResult
- [ ] class SpellCaster (static) → src/core/combat/SpellCaster.ts
  - [ ] castSpell(caster, spell, targets): SpellCastResult
  - [ ] hasSpellSlot(caster, spellLevel): boolean
  - [ ] consumeSpellSlot(caster, spellLevel): void
  - [ ] restoreSpellSlots(caster): void
  - [ ] calculateSaveDC(caster, ability): number
  - [ ] makeSavingThrow(target, saveAbility, saveDC): boolean
  - [ ] getSpellSlotInfo(caster): string
  - [ ] canUpcast(caster, spell, targetSlotLevel): boolean
  - [ ] upcastSpell(caster, spell, targets, slotLevelUsed): SpellCastResult

---

## Phase 4: Environmental & Gaming Sensors
**Focus**: Real-world data integration and platform integrations.
**Estimated Items**: ~50

### Task 4.1: Environmental Types (16 items)
- [ ] EnvironmentalContext, GeolocationData, MotionData, WeatherData, LightData, ForecastData, SensorType, PerformanceMetrics, PerformanceStatistics, SensorPermission, SensorHealthStatus, SensorStatus, SensorFailureLog, SensorRetryConfig, SensorRecoveryNotification, SevereWeatherAlert → src/types/SensorTypes.ts

### Task 4.2: Environmental Sensors (24 items)
- [ ] class EnvironmentalSensors → src/core/sensors/EnvironmentalSensors.ts
  - [ ] constructor(weatherApiKeyOrConfig?, retryConfig?)
  - [ ] requestPermissions(types): Promise<SensorPermission[]>
  - [ ] startMonitoring(callback?): void
  - [ ] stopMonitoring(): void
  - [ ] updateSnapshot(): Promise<EnvironmentalContext>
  - [ ] calculateXPModifier(): number
  - [ ] calculateXPModifierWithForecast(forecastHours?): Promise<number>
  - [ ] calculateXPModifierWithSevereWeather(): Promise<{ modifier; severeWeatherAlert; safetyWarning }>
  - [ ] detectSevereWeather(): SevereWeatherAlert | null
  - [ ] getSevereWeatherWarning(): string | null
  - [ ] getSensorStatus(sensorType): SensorStatus | null
  - [ ] getAllSensorStatuses(): SensorStatus[]
  - [ ] getFailureLog(sensorType?, limit?): SensorFailureLog[]
  - [ ] getLastKnownGood(sensorType): any
  - [ ] clearFailureLog(): void
  - [ ] updateRetryConfig(config): void
  - [ ] onSensorRecovery(callback): () => void
  - [ ] getPermissions(): SensorPermission[]
  - [ ] checkAvailability(type): boolean
  - [ ] getCurrentActivity(): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
  - [ ] getDiagnostics(): {...}
  - [ ] enableDiagnosticMode(): void
  - [ ] disableDiagnosticMode(): void
  - [ ] printDashboard(config?): void
- [ ] class GeolocationProvider → src/core/sensors/GeolocationProvider.ts
  - [ ] getCurrentPosition(): Promise<GeolocationData | null>
  - [ ] getBiome(latitude, longitude): string
- [ ] class MotionDetector → src/core/sensors/MotionDetector.ts
  - [ ] startMonitoring(callback): void
  - [ ] detectActivity(data): 'stationary' | 'walking' | 'running' | 'driving'
- [ ] class WeatherAPIClient → src/core/sensors/WeatherAPIClient.ts
  - [ ] getWeather(lat, lon): Promise<WeatherData | null>
- [ ] class LightSensor → src/core/sensors/LightSensor.ts
  - [ ] startMonitoring(callback): void

### Task 4.3: Gaming Integration (10 items)
- [ ] GamingContext → src/types/GamingTypes.ts
- [ ] class GamingPlatformSensors → src/core/sensors/GamingPlatformSensors.ts
  - [ ] constructor(config)
  - [ ] authenticate(steamUserId?, discordUserId?): Promise<boolean>
  - [ ] startMonitoring(callback?): void
  - [ ] stopMonitoring(): void
  - [ ] isPlayingGame(gameName): boolean
  - [ ] calculateGamingBonus(): number
  - [ ] getContext(): GamingContext
  - [ ] recordGameSession(gameName, durationMinutes): void
  - [ ] getDiagnostics(): {...}
  - [ ] printDashboard(config?): void
- [ ] class SteamAPIClient → src/core/sensors/SteamAPIClient.ts
  - [ ] getCurrentGame(steamUserId): Promise<{ name; appId } | null>
  - [ ] getGameMetadata(gameName): Promise<{ genre? } | null>
- [ ] DiscordUserInfo, MusicActivityDetails, DiscordActivity, DiscordConnectionState (enum) → src/types/DiscordTypes.ts
- [ ] class DiscordRPCClient → src/core/sensors/DiscordRPCClient.ts
  - [ ] connect(): Promise<boolean>
  - [ ] disconnect(): void
  - [ ] isConnectedToDiscord(): boolean
  - [ ] getConnectionState(): DiscordConnectionState
  - [ ] getLastError(): string | null
  - [ ] setMusicActivity(musicDetails): Promise<boolean>
  - [ ] clearMusicActivity(): Promise<boolean>
  - [ ] getUserInfo(): Promise<DiscordUserInfo | null>

---

## Phase 5: Equipment System
**Focus**: Equipment data structures, spawning, validation, and modification.
**Estimated Items**: ~60

### Task 5.1: Equipment Types (10 items)
- [ ] EquipmentProperty, EquipmentPropertyType, EquipmentCondition, EnhancedEquipment, EquipmentModification, EnhancedInventoryItem, EffectApplicationResult, EquipmentValidationResult → src/types/Equipment.ts
- [ ] SpawnRandomOptions, TreasureHoardResult → src/core/equipment/EquipmentSpawnHelper.ts

### Task 5.2: Equipment Core Classes (50 items)
- [ ] class EquipmentEffectApplier (static) → src/core/equipment/EquipmentEffectApplier.ts
  - [ ] equipItem(character, equipment, instanceId?): EffectApplicationResult
  - [ ] unequipItem(character, equipmentName, instanceId?): EffectApplicationResult
  - [ ] reapplyEquipmentEffects(character): EffectApplicationResult
  - [ ] getActiveEffects(character): EquipmentProperty[]
- [ ] class EquipmentValidator (static) → src/core/equipment/EquipmentValidator.ts
  - [ ] validateEquipment(equipment): EquipmentValidationResult
  - [ ] validateProperty(property): EquipmentValidationResult
  - [ ] validateEquipmentFeatureReference(featureId): boolean
  - [ ] validateEquipmentSkillReference(skillId): boolean
  - [ ] validateDamageInfo(damage): EquipmentValidationResult
  - [ ] validateSpawnWeight(weight): EquipmentValidationResult
  - [ ] validateModification(modification): EquipmentValidationResult
- [ ] class EquipmentModifier (static) → src/core/equipment/EquipmentModifier.ts
  - [ ] enchant(equipment, itemName, enchantment, character?): CharacterEquipment
  - [ ] applyTemplate(equipment, itemName, templateId, character?): CharacterEquipment
  - [ ] curse(equipment, itemName, curse, character?): CharacterEquipment
  - [ ] upgrade(equipment, itemName, upgrade, character?): CharacterEquipment
  - [ ] removeModification(equipment, itemName, modificationId, character?): CharacterEquipment
  - [ ] disenchant(equipment, itemName, character?): CharacterEquipment
  - [ ] liftCurse(equipment, itemName, character?): CharacterEquipment
  - [ ] getCombinedEffects(equipment, itemName, instanceId?): EquipmentProperty[]
  - [ ] hasTemplate(equipment, itemName, templateId): boolean
  - [ ] isCursed(equipment, itemName): boolean
  - [ ] isEnchanted(equipment, itemName): boolean
  - [ ] getAppliedTemplates(equipment, itemName): string[]
  - [ ] getModificationHistory(equipment, itemName): EquipmentModification[]
  - [ ] removeAllModifications(equipment, itemName, character?): CharacterEquipment
  - [ ] getModificationSources(equipment, itemName): string[]
  - [ ] countModificationsBySource(equipment, itemName): Record<string, number>
  - [ ] getItemSummary(equipment, itemName): { name; modifications; isCursed; isEnchanted }
  - [ ] createModification(id, name, properties, source): EquipmentModification
  - [ ] generateModificationId(prefix?): string
- [ ] class EquipmentSpawnHelper (static) → src/core/equipment/EquipmentSpawnHelper.ts
  - [ ] spawnFromList(itemNames, rng?): (EnhancedEquipment | undefined)[]
  - [ ] spawnByRarity(rarity, count, rng?): EnhancedEquipment[]
  - [ ] spawnByTags(tags, count, rng?, options?): EnhancedEquipment[]
  - [ ] spawnRandom(count, rng, options?): EnhancedEquipment[]
  - [ ] spawnFromTemplate(templateId, baseItemName?): EnhancedEquipment | null
  - [ ] spawnTreasureHoard(cr, rng): TreasureHoardResult
  - [ ] addToCharacter(character, items, equip?): CharacterSheet

---

## Phase 6: Extensibility System
**Focus**: Registries, validators, and customization infrastructure.
**Estimated Items**: ~120

### Task 6.1: Extensibility Types (5 items)
- [ ] ExtensionCategory, SpawnMode, ExtensionOptions, RegistrationEntry, ValidationResult → src/core/extensions/ExtensionManager.ts

### Task 6.2: ExtensionManager (16 items)
- [ ] class ExtensionManager (singleton) → src/core/extensions/ExtensionManager.ts
  - [ ] getInstance(): ExtensionManager
  - [ ] register(category, items, options?): void
  - [ ] registerMultiple(registrations): void
  - [ ] get(category): any[]
  - [ ] getDefaults(category): any[]
  - [ ] getCustom(category): any[]
  - [ ] setWeights(category, weights): void
  - [ ] getWeights(category): Record<string, number>
  - [ ] getDefaultWeights(category): Record<string, number>
  - [ ] setMode(category, mode): void
  - [ ] getMode(category): SpawnMode
  - [ ] hasCustomData(category): boolean
  - [ ] getInfo(category?): Record<string, any>
  - [ ] getRegisteredCategories(): ExtensionCategory[]
  - [ ] reset(category): void
  - [ ] resetAll(): void
  - [ ] validate(category, items): ValidationResult
  - [ ] exportCustomData(): Record<string, any>
  - [ ] exportCustomDataForCategory(category): any[]

### Task 6.3: FeatureRegistry & Types (30 items)
- [ ] ClassFeature, RacialTrait, FeatureType, FeatureEffectType, FeatureEffect, FeaturePrerequisite, CharacterFeature, CharacterTrait → src/core/features/FeatureRegistry.ts
- [ ] class FeatureRegistry (singleton) → src/core/features/FeatureRegistry.ts
  - [ ] getInstance(): FeatureRegistry
  - [ ] initializeDefaults(defaultClassFeatures?, defaultRacialTraits?): void
  - [ ] reset(): void
  - [ ] isInitialized(): boolean
  - [ ] registerClassFeature(feature): void
  - [ ] registerClassFeatures(features): void
  - [ ] getClassFeatures(characterClass, level?): ClassFeature[]
  - [ ] getClassFeaturesForLevel(characterClass, level): ClassFeature[]
  - [ ] getClassFeatureById(featureId): ClassFeature | undefined
  - [ ] getAllClassFeatures(): Map<string, ClassFeature[]>
  - [ ] registerRacialTrait(trait): void
  - [ ] registerRacialTraits(traits): void
  - [ ] getRacialTraits(race): RacialTrait[]
  - [ ] getRacialTraitsForSubrace(race, subrace): RacialTrait[]
  - [ ] getBaseRacialTraits(race): RacialTrait[]
  - [ ] getSubraceTraits(race, subrace): RacialTrait[]
  - [ ] getAvailableSubraces(race): string[]
  - [ ] getRacialTraitById(traitId): RacialTrait | undefined
  - [ ] getAllRacialTraits(): Map<string, RacialTrait[]>
  - [ ] validatePrerequisites(feature, character): ValidationResult
  - [ ] validateFeaturePrerequisites(feature, character): ValidationResult
  - [ ] validateTraitPrerequisites(trait, character): ValidationResult
  - [ ] canGainFeature(feature, character): boolean
  - [ ] getRegisteredClasses(): Class[]
  - [ ] getRegisteredRaces(): Race[]
  - [ ] getRegistryStats(): {...}
  - [ ] exportRegistry(): {...}
  - [ ] getEquipmentFeatures(equipmentName): ClassFeature[] (static)
  - [ ] isValidEquipmentFeature(featureId): boolean (static)
  - [ ] registerEquipmentFeature(feature): void (static)

### Task 6.4: FeatureValidator (6 items)
- [ ] class FeatureValidator (static) → src/core/features/FeatureValidator.ts
  - [ ] validateClassFeature(feature): ValidationResult
  - [ ] validateRacialTrait(trait): ValidationResult
  - [ ] validateClassFeatures(features): ValidationResult
  - [ ] validateRacialTraits(traits): ValidationResult
  - [ ] validateEffect(effect): ValidationResult
  - [ ] validatePrerequisites(prerequisites): ValidationResult

### Task 6.5: WeightedSelector (5 items)
- [ ] class WeightedSelector (static) → src/core/extensions/WeightedSelector.ts
  - [ ] select<T>(items, weights, rng, mode?): T | null
  - [ ] selectMultiple<T>(items, weights, rng, count, mode?): T[]
  - [ ] getProbabilities<T>(items, weights, mode?): Record<string, number>
  - [ ] normalizeWeights(weights, mode): Record<string, number>
  - [ ] getItemKey<T>(item): string

### Task 6.6: SkillRegistry & Types (20 items)
- [ ] CustomSkill, SkillPrerequisite, SkillValidationResult, SkillRegistryStats, SkillProficiency, SkillListDefinition, SkillSelectionWeights → src/core/skills/SkillRegistry.ts
- [ ] class SkillRegistry (singleton) → src/core/skills/SkillRegistry.ts
  - [ ] getInstance(): SkillRegistry
  - [ ] initializeDefaults(defaultSkills?): void
  - [ ] reset(): void
  - [ ] isInitialized(): boolean
  - [ ] registerSkill(skill): void
  - [ ] registerSkills(skills): void
  - [ ] getSkill(id): CustomSkill | undefined
  - [ ] getAllSkills(): CustomSkill[]
  - [ ] getSkillsByAbility(ability): CustomSkill[]
  - [ ] getSkillsByCategory(category): CustomSkill[]
  - [ ] getCategories(): string[]
  - [ ] getSkillsBySource(source): CustomSkill[]
  - [ ] getAvailableSkills(character): CustomSkill[]
  - [ ] validatePrerequisites(skill, character): SkillValidationResult
  - [ ] validateSkill(skill): SkillValidationResult
  - [ ] isValidSkill(id): boolean
  - [ ] getSkillCount(): number
  - [ ] getRegistryStats(): SkillRegistryStats
  - [ ] exportRegistry(): CustomSkill[]
  - [ ] unregisterSkill(id): boolean

### Task 6.7: SkillValidator (8 items)
- [ ] class SkillValidator (static) → src/core/skills/SkillValidator.ts
  - [ ] validateSkill(skill): SkillValidationResult
  - [ ] validateSkills(skills): SkillValidationResult
  - [ ] validateSkillProficiency(proficiency): SkillValidationResult
  - [ ] validateSkillProficiencies(proficiencies): SkillValidationResult
  - [ ] validateSkillListDefinition(skillList): SkillValidationResult
  - [ ] validateSkillPrerequisites(prerequisites, character): SkillValidationResult
  - [ ] isValidAbility(ability): ability is Ability
  - [ ] isValidSkillId(id): boolean

### Task 6.8: SpellRegistry & Types (20 items)
- [ ] SpellSchool, RegisteredSpell, SpellPrerequisite, SpellValidationResult → src/core/spells/SpellRegistry.ts
- [ ] class SpellRegistry (singleton) → src/core/spells/SpellRegistry.ts
  - [ ] getInstance(): SpellRegistry
  - [ ] initializeDefaults(defaultSpells?): void
  - [ ] reset(): void
  - [ ] isInitialized(): boolean
  - [ ] registerSpell(spell): void
  - [ ] registerSpells(spells): void
  - [ ] getSpell(spellId): RegisteredSpell | undefined
  - [ ] getSpells(): RegisteredSpell[]
  - [ ] getSpellsByLevel(level): RegisteredSpell[]
  - [ ] getSpellsBySchool(school): RegisteredSpell[]
  - [ ] getSpellsForClass(characterClass): RegisteredSpell[]
  - [ ] getAvailableSpells(character): RegisteredSpell[]
  - [ ] getSpellsBySource(source): RegisteredSpell[]
  - [ ] getClassSpellList(characterClass): string[]
  - [ ] registerClassSpellList(characterClass, spellIds): void
  - [ ] getSpellSlotsForClass(characterClass, level): number
  - [ ] validatePrerequisites(spell, character): ValidationResult
  - [ ] validateSpell(spell): ValidationResult
  - [ ] hasSpell(spellId): boolean
  - [ ] getSpellCount(): number
  - [ ] getRegistryStats(): {...}
  - [ ] exportRegistry(): RegisteredSpell[]
  - [ ] unregisterSpell(spellId): boolean

### Task 6.9: SpellValidator (7 items)
- [ ] class SpellValidator (static) → src/core/spells/SpellValidator.ts
  - [ ] validateSpell(spell): SpellValidationResult
  - [ ] validateSpells(spells): SpellValidationResult
  - [ ] validatePrerequisites(prerequisites): SpellValidationResult
  - [ ] validateSpellPrerequisites(prerequisites, character): SpellValidationResult
  - [ ] isValidAbility(ability): ability is Ability
  - [ ] isValidSchool(school): school is Spell['school']
  - [ ] isValidSpellLevel(level): boolean

---

## Phase 7: Game Data Constants
**Focus**: Constants and helper functions for game data.
**Estimated Items**: ~15

### Task 7.1: Constants & Helpers (15 items)
- [ ] ALL_RACES → src/utils/constants.ts
- [ ] ALL_CLASSES → src/utils/constants.ts
- [ ] RACE_DATA → src/utils/constants.ts
- [ ] CLASS_DATA → src/utils/constants.ts
- [ ] XP_THRESHOLDS → src/utils/constants.ts
- [ ] SPELL_DATABASE → src/utils/constants.ts
- [ ] EQUIPMENT_DATABASE → src/utils/constants.ts
- [ ] RaceDataEntry → src/utils/constants.ts
- [ ] ClassDataEntry → src/utils/constants.ts
- [ ] getRaceData(race): RaceDataEntry | undefined
- [ ] getClassData(className): ClassDataEntry | undefined
- [ ] getClassSpellList(className): {...} | undefined
- [ ] getSpellSlotsForClass(className, characterLevel): Record<number, number> | undefined
- [ ] getClassStartingEquipment(className): {...} | undefined
- [ ] asClass(value): Class
- [ ] isValidClass(value): value is Class

---

## Summary Dashboard

| Phase | Focus Area | Est. Items | Status |
|-------|-----------|------------|--------|
| 1 | Foundation Types & Utilities | ~64 | ✅ COMPLETED |
| 2 | Core Processing Modules | ~50 | 🔄 In Progress (24/~50 done) |
| 3 | Progression & Combat | ~80 | ⬜ Not Started |
| 4 | Environmental & Gaming | ~50 | ⬜ Not Started |
| 5 | Equipment System | ~60 | ⬜ Not Started |
| 6 | Extensibility System | ~120 | ⬜ Not Started |
| 7 | Game Data Constants | ~15 | ⬜ Not Started |
| **Total** | | **~439** | |

---

## Notes - Items Requiring Follow-up

### Redundancy / Potential Duplicates
(When you find similar functionality in multiple places, note it here - do not attempt to resolve)
- [x] **ColorPalette** - Two different definitions exist:
  - `src/core/types/AudioProfile.ts` - properties: `colors`, `primary_color`, `secondary_color`, `accent_color`, `brightness`, `saturation`, `is_monochrome` (USED throughout codebase)
  - `src/core/types/ColorPalette.ts` - properties: `primary`, `secondary`, `tertiary`, `background`, `text`, `isMonochrome`, `brightness`, `saturation`, `colors` (NOT imported anywhere - dead code)
- [ ] [Item A] appears similar to [Item B] - [notes]
- [ ] [Function] in [Class] similar to standalone function at [path]
- [ ] Multiple implementations of [functionality] found

### Discrepancies Found
- [x] **Location mismatch (Task 1.2)** - DATA_ENGINE_REFERENCE_plan.md documents character types at `src/types/CharacterTypes.ts` and `src/types/CombatTypes.ts`, but actual location is `src/core/types/Character.ts`. All 9 types (Race, Class, Ability, Skill, ProficiencyLevel, GameMode, Attack, Spell, AbilityScores) exist at the correct location in the codebase.
- [x] **Location mismatch (Task 1.3)** - DATA_ENGINE_REFERENCE_plan.md documents character interfaces at `src/types/CharacterTypes.ts`, but this file does not exist. All 4 interfaces exist at different locations:
  - CharacterSheet → `src/core/types/Character.ts` (229-373)
  - CharacterEquipment → `src/core/types/Equipment.ts` (183-189)
  - InventoryItem → Basic version at `src/core/generation/EquipmentGenerator.ts` (37-41); Enhanced version called `EnhancedInventoryItem` at `src/core/types/Equipment.ts` (164-177)
  - CharacterAppearance → `src/core/generation/AppearanceGenerator.ts` (8-21)
- [x] **Signature mismatch (Class type)** - DATA_ENGINE_REFERENCE.md shows `Class` as simple union type `'Barbarian' | ... | 'Wizard'`, but actual code uses branded type `string & { readonly __ClassBrand: unique symbol }` for extensibility. The branded type is correct and intentional for supporting custom classes.
- [x] **Missing documentation (Attack interface)** - DATA_ENGINE_REFERENCE.md is missing the `properties?: string[]` property on the Attack interface. The actual code at `src/core/types/Character.ts:195` includes this property.
- [x] **Naming variation (InventoryItem)** - DATA_ENGINE_REFERENCE.md documents `InventoryItem` but the enhanced version in the codebase is called `EnhancedInventoryItem` at `src/core/types/Equipment.ts`. A basic `InventoryItem` interface exists at `src/core/generation/EquipmentGenerator.ts` for backward compatibility.
- [x] **Location mismatch (Task 1.4)** - DATA_ENGINE_REFERENCE_plan.md documents RNG utility functions at `src/utils/random.ts`, but the actual location is `src/utils/hash.ts`:
  - `generateSeed()` → `src/utils/hash.ts` (14)
  - `hashSeedToFloat()` → `src/utils/hash.ts` (27)
  - `hashSeedToInt()` → `src/utils/hash.ts` (40)
  - `class SeededRNG` is correctly documented at `src/utils/random.ts` (7)
- [x] **Location mismatch (Task 1.5)** - DATA_ENGINE_REFERENCE_plan.md documents validation schemas at `src/schemas/`, but no such directory exists. All 4 Zod schemas exist at `src/utils/validators.ts`:
  - `PlaylistTrackSchema` → `src/utils/validators.ts` (14-48)
  - `ServerlessPlaylistSchema` → `src/utils/validators.ts` (53-61)
  - `AudioProfileSchema` → `src/utils/validators.ts` (66-89)
  - `CharacterSheetSchema` → `src/utils/validators.ts` (106-156)
- [x] **Signature mismatch (Task 2.3 - CharacterSheet interface)** - DATA_ENGINE_REFERENCE.md shows CharacterSheet with properties `abilities` and `modifiers`, but actual code at `src/core/types/Character.ts:246-249` uses `ability_scores` and `ability_modifiers`. The code is correct; documentation needs to be updated.
- [x] **Missing documentation (Task 2.3 - CharacterGeneratorOptions)** - DATA_ENGINE_REFERENCE.md is missing the `extensions?: CharacterGeneratorExtensions` property in CharacterGeneratorOptions. The actual code at `src/core/generation/CharacterGenerator.ts:80-119` includes this property which allows registering custom spells, equipment, races, classes, and appearance options.
- [x] **Signature mismatch (Task 2.3 - SkillAssigner.assignSkills)** - DATA_ENGINE_REFERENCE.md documents `assignSkills(characterClass, rng): Record<Skill, ProficiencyLevel>`, but actual code at `src/core/generation/SkillAssigner.ts:38-42` shows `assignSkills(characterClass, rng, character?): Record<string, ProficiencyLevel>`. The code is correct: (1) Return type uses `string` instead of `Skill` to support custom skills registered via SkillRegistry; (2) Third parameter `character?: CharacterSheet` enables prerequisite validation. Documentation needs to be updated.
- [x] **Signature mismatch (Task 2.3 - SpellManager.getKnownSpells)** - DATA_ENGINE_REFERENCE.md documents `getKnownSpells(characterClass, characterLevel): string[]`, but actual code at `src/core/generation/SpellManager.ts:140-221` shows `getKnownSpells(characterClass, characterLevel, character?: CharacterSheet): string[]`. The code is correct: third parameter `character?: CharacterSheet` enables prerequisite filtering. Documentation needs to be updated.
- [x] **Signature mismatch (Task 2.3 - SpellManager.initializeSpells)** - DATA_ENGINE_REFERENCE.md documents `initializeSpells(characterClass, characterLevel): SpellSlots`, but actual code at `src/core/generation/SpellManager.ts:270-280` shows `initializeSpells(characterClass, characterLevel, character?: CharacterSheet): SpellSlots`. The code is correct: third parameter `character?: CharacterSheet` enables prerequisite filtering. Documentation needs to be updated.
- [x] **Missing documentation (Task 2.3 - SpellManager.filterCharacterSpells)** - DATA_ENGINE_REFERENCE.md is missing the `filterCharacterSpells(character: CharacterSheet): CharacterSheet` method. The actual code at `src/core/generation/SpellManager.ts:362-385` includes this method which updates a character's known_spells and cantrips arrays to only include spells whose prerequisites are met. Documentation needs to be updated.
- [ ] [Item] documented but not found in codebase
- [ ] [Item] exists in code but not documented
- [ ] [Signature mismatch: [Item] documented as [X] but code shows [Y]
- [ ] Export mismatch: documented as exported but is internal (or vice versa)

### Needs Investigation
- [ ] [Item] - [describe what needs clarification]