# DATA_ENGINE_REFERENCE.md Cleanup Plan

> **Goal**: Fix all discrepancies between DATA_ENGINE_REFERENCE.md documentation and actual codebase identified during the comprehensive verification in DATA_ENGINE_REFERENCE_plan.md.

> **Origin**: This plan is derived from the "Items Requiring Follow-up" section of DATA_ENGINE_REFERENCE_plan.md, which documented ~400+ API verifications across 8 phases.

---

## Important Notes

### Resolution Strategy
For each discrepancy, the verification team determined whether:
- **Code is correct** → Update DATA_ENGINE_REFERENCE.md to match code
- **Docs are correct** → Code should be updated (rare)

Most discrepancies are **documentation issues** that need to be fixed in DATA_ENGINE_REFERENCE.md.

### Redundancy Notes
The following items are noted for awareness but should NOT be resolved:
- **ColorPalette** - Two definitions exist; the one in `src/core/types/AudioProfile.ts` is used throughout the codebase, while `src/core/types/ColorPalette.ts` is unused dead code.

---

## Phase 1: Foundation Type Location Updates
**Focus**: Update file paths for core character and utility types.
**Estimated Items**: 6 tasks

### Task 1.1: Character Types Location (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: Character types documented at `src/types/CharacterTypes.ts` → actual location is `src/core/types/Character.ts`
  - Types: Race, Class, Ability, Skill, ProficiencyLevel, GameMode, Attack, Spell, AbilityScores (9 types)

### Task 1.2: Character Interfaces Location (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: Character interfaces documented at `src/types/CharacterTypes.ts` → actual locations:
  - CharacterSheet → `src/core/types/Character.ts` (229-373)
  - CharacterEquipment → `src/core/types/Equipment.ts` (183-189)
  - InventoryItem → `src/core/generation/EquipmentGenerator.ts` (37-41); Enhanced version called `EnhancedInventoryItem` at `src/core/types/Equipment.ts` (164-177)
  - CharacterAppearance → `src/core/generation/AppearanceGenerator.ts` (8-21)

### Task 1.3: RNG Utility Functions Location (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: RNG functions documented at `src/utils/random.ts` → actual location is `src/utils/hash.ts`:
  - `generateSeed()` → `src/utils/hash.ts` (14)
  - `hashSeedToFloat()` → `src/utils/hash.ts` (27)
  - `hashSeedToInt()` → `src/utils/hash.ts` (40)
  - Note: `class SeededRNG` is correctly documented at `src/utils/random.ts` (7)

### Task 1.4: Validation Schemas Location (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: Schemas documented at `src/schemas/` → actual location is `src/utils/validators.ts`:
  - `PlaylistTrackSchema` → `src/utils/validators.ts` (14-48)
  - `ServerlessPlaylistSchema` → `src/utils/validators.ts` (53-61)
  - `AudioProfileSchema` → `src/utils/validators.ts` (66-89)
  - `CharacterSheetSchema` → `src/utils/validators.ts` (106-156)

### Task 1.5: Progression Types Location (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: Progression types documented at `src/types/ProgressionTypes.ts` and `src/types/StatTypes.ts` → actual locations:
  - ListeningSession → `src/core/types/Progression.ts` (60-71)
  - ExperienceSystem → `src/core/types/Progression.ts` (76-98)
  - LevelUpDetail → `src/core/types/Progression.ts` (219-254)
  - StatIncreaseResult → `src/core/types/Progression.ts` (190-214)
  - CharacterUpdateResult → `src/core/progression/CharacterUpdater.ts` (9-18)
  - LevelUpBenefits → `src/core/progression/LevelUpProcessor.ts` (25-63)

### Task 1.6: Stat Increase Types Location (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: Stat types documented at `src/types/StatTypes.ts` → actual locations:
  - StatIncreaseConfig → `src/core/types/Progression.ts` (173-185)
  - StatIncreaseStrategyType → `src/core/types/Progression.ts` (107-113)
  - UncappedProgressionConfig → `src/core/progression/LevelUpProcessor.ts` (75-82)

---

## Phase 2: Character Type Documentation Updates
**Focus**: Fix character type signatures and add missing properties.
**Estimated Items**: 3 tasks

### Task 2.1: Class Type Documentation (1 item)
- [x] Update DATA_ENGINE_REFERENCE.md: `Class` type shown as simple union `'Barbarian' | ... | 'Wizard'` → actual code uses branded type `string & { readonly __ClassBrand: unique symbol }` for extensibility. The branded type is correct and intentional for supporting custom classes.

### Task 2.2: Attack Interface Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `properties?: string[]` property to Attack interface (exists in code at `src/core/types/Character.ts:195`)

### Task 2.3: CharacterSheet Interface Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: CharacterSheet properties documented as `abilities` and `modifiers` → actual code uses `ability_scores` and `ability_modifiers` (at `src/core/types/Character.ts:246-249`)

---

## Phase 3: Character Generation Documentation Updates
**Focus**: Fix CharacterGenerator, SkillAssigner, SpellManager, and EquipmentGenerator docs.
**Estimated Items**: 11 tasks

### Task 3.1: CharacterGeneratorOptions Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `extensions?: CharacterGeneratorExtensions` property to CharacterGeneratorOptions (exists in code at `src/core/generation/CharacterGenerator.ts:80-119`)

### Task 3.2: SkillAssigner.assignSkills Signature (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `assignSkills(characterClass, rng): Record<Skill, ProficiencyLevel>` → actual signature is `assignSkills(characterClass, rng, character?): Record<string, ProficiencyLevel>` (at `src/core/generation/SkillAssigner.ts:38-42`). Return type uses `string` to support custom skills; third parameter enables prerequisite validation.

### Task 3.3: SpellManager.getKnownSpells Signature (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `getKnownSpells(characterClass, characterLevel): string[]` → actual signature is `getKnownSpells(characterClass, characterLevel, character?: CharacterSheet): string[]` (at `src/core/generation/SpellManager.ts:140-221`)

### Task 3.4: SpellManager.initializeSpells Signature (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `initializeSpells(characterClass, characterLevel): SpellSlots` → actual signature is `initializeSpells(characterClass, characterLevel, character?: CharacterSheet): SpellSlots` (at `src/core/generation/SpellManager.ts:270-280`)

### Task 3.5: SpellManager.filterCharacterSpells Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `filterCharacterSpells(character: CharacterSheet): CharacterSheet` method (exists at `src/core/generation/SpellManager.ts:362-385`)

### Task 3.6: EquipmentGenerator.addItem Signature (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `addItem(equipment, itemName, quantity?, character?): CharacterEquipment` (4 params) → actual signature has only 3 params without `character` (at `src/core/generation/EquipmentGenerator.ts:212-216`)

### Task 3.7: EquipmentGenerator.removeItem Signature (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `removeItem(equipment, itemName, quantity?, character?): CharacterEquipment` (4 params) → actual signature has only 3 params without `character` (at `src/core/generation/EquipmentGenerator.ts:269-273`)

### Task 3.8: EquipmentGenerator.getEquipmentData Visibility (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Document `getEquipmentData` as private method; add public `getEquipmentDataStatic(itemName: string): EnhancedEquipment | undefined` method (exists at `src/core/generation/EquipmentGenerator.ts:60-62`)

### Task 3.9: EquipmentGenerator.getEquipmentDataStatic Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `getEquipmentDataStatic(itemName: string): EnhancedEquipment | undefined` method (exists at `src/core/generation/EquipmentGenerator.ts:60-62`)

### Task 3.10: EquipmentGenerator.addModification Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `addModification(equipment, itemName, modification, instanceId?, character?): CharacterEquipment` method (exists at `src/core/generation/EquipmentGenerator.ts:590-644`)

### Task 3.11: EquipmentGenerator.removeModification Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `removeModification(equipment, itemName, modificationId, character?): CharacterEquipment` method (exists at `src/core/generation/EquipmentGenerator.ts:655-709`)

### Task 3.12: EquipmentGenerator.getActiveEffects Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `getActiveEffects(equipment, itemName, instanceId?): EquipmentProperty[]` method (exists at `src/core/generation/EquipmentGenerator.ts:719-759`)

---

## Phase 4: Progression System Documentation Updates
**Focus**: Fix CharacterUpdater, LevelUpProcessor, and StatManager docs.
**Estimated Items**: 4 tasks

### Task 4.1: CharacterUpdater Constructor Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `constructor(statManager?: StatManager)` method for CharacterUpdater (exists at `src/core/progression/CharacterUpdater.ts:28`)

### Task 4.2: LevelUpProcessor.getXPThreshold Signature (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `getXPThreshold(level: number): number` → actual signature is `getXPThreshold(level: number, isUncapped: boolean = false): number` (at `src/core/progression/LevelUpProcessor.ts:463`)

### Task 4.3: StatManager.getConfig Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `getConfig(): Readonly<Required<StatIncreaseConfig>>` method (exists at `src/core/progression/stat/StatManager.ts:281`)

### Task 4.4: StatManager.validateDnD5eStatSelection Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Add missing `validateDnD5eStatSelection(character, selections, increaseAmount?): { valid: true } | StatSelectionValidationError` method (exists at `src/core/progression/stat/StatManager.ts:333`)

---

## Phase 5: Combat System Documentation Updates
**Focus**: Fix combat types and helper class documentation.
**Estimated Items**: 2 tasks

### Task 5.1: Combat Types Location (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Combat types documented at `src/types/CombatTypes.ts` → actual locations:
  - CombatInstance → `src/core/types/Combat.ts` (111-122)
  - Combatant → `src/core/types/Combat.ts` (23-41)
  - CombatAction → `src/core/types/Combat.ts` (46-54)
  - StatusEffect → `src/core/types/Combat.ts` (12-18)
  - CombatActionResult → `src/core/types/Combat.ts` (59-67)
  - AttackRoll → `src/core/types/Combat.ts` (72-80)
  - DamageRoll → `src/core/types/Combat.ts` (85-91)
  - SpellCastResult → `src/core/types/Combat.ts` (96-106)
  - CombatResult → `src/core/types/Combat.ts` (127-138)
  - CombatConfig → `src/core/types/Combat.ts` (156-162)
  - DamageType → `src/core/types/Combat.ts` (143-146)
  - SavingThrowAbility → `src/core/types/Combat.ts` (151)
  - InitiativeResult → `src/core/combat/InitiativeRoller.ts` (11-16)
  - AttackResult → `src/core/combat/AttackResolver.ts` (15-23)
  - SpellSlots → `src/core/generation/SpellManager.ts` (24-31) - NOT exported from src/index.ts

### Task 5.2: Combat Helper Classes Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Clarify that `InitiativeRoller`, `AttackResolver`, and `SpellCaster` are instance classes (not static). Documentation shows "Helper: InitiativeRoller (static)" which is misleading. All methods exist and work correctly.

---

## Phase 6: Environmental Types Documentation Updates
**Focus**: Fix environmental sensor type locations and signatures.
**Estimated Items**: 6 tasks

### Task 6.1: Environmental Types Location (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Environmental types documented at `src/types/SensorTypes.ts` → actual locations:
  - EnvironmentalContext → `src/core/types/Environmental.ts` (155-163)
  - GeolocationData → `src/core/types/Environmental.ts` (94-102)
  - MotionData → `src/core/types/Environmental.ts` (104-122)
  - WeatherData → `src/core/types/Environmental.ts` (124-134)
  - LightData → `src/core/types/Environmental.ts` (148-151)
  - ForecastData → `src/core/types/Environmental.ts` (136-146)
  - SensorType → `src/core/types/Environmental.ts` (1)
  - PerformanceMetrics → `src/core/types/Environmental.ts` (6-19)
  - PerformanceStatistics → `src/core/types/Environmental.ts` (24-35)
  - SensorPermission → `src/core/types/Environmental.ts` (37-41)
  - SensorHealthStatus → `src/core/types/Environmental.ts` (46)
  - SensorStatus → `src/core/types/Environmental.ts` (51-60)
  - SensorFailureLog → `src/core/types/Environmental.ts` (65-71)
  - SensorRetryConfig → `src/core/types/Environmental.ts` (76-81)
  - SensorRecoveryNotification → `src/core/types/Environmental.ts` (86-92)
  - SevereWeatherAlert → `src/core/sensors/WeatherAPIClient.ts` (50-56)

### Task 6.2: GeolocationData Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Remove `altitude_accuracy?: number` property (does not exist in code at `src/core/types/Environmental.ts:94-102`)

### Task 6.3: MotionData Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Fix multiple discrepancies at `src/core/types/Environmental.ts:104-122`:
  - `acceleration.x/y/z` are `number | null` in code (not `number`)
  - Property naming: `accelerationIncludingGravity` (not `acceleration_with_gravity`)
  - Property naming: `rotationRate` (not `rotation_rate`)
  - Add missing `interval: number` property
  - Remove `movement_intensity: number` and `activity_type` properties (not in code)
  - Note: Code uses camelCase; docs incorrectly show snake_case

### Task 6.4: WeatherData Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Fix multiple discrepancies at `src/core/types/Environmental.ts:124-134`:
  - Property naming: `weatherType`, `windSpeed`, `windDirection`, `isNight`, `moonPhase` (camelCase, not snake_case)
  - Remove `feels_like`, `visibility` properties (not in code)
  - Type: `weatherType: string` (not union type)
  - `moonPhase: number` is required (not optional)

### Task 6.5: LightData Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Remove `environment: 'bright_daylight' | 'indoor' | 'dim' | 'dark'` property (does not exist in code at `src/core/types/Environmental.ts:148-151`)

### Task 6.6: SevereWeatherAlert Documentation (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `type: 'Blizzard' | 'Hurricane' | 'Typhoon' | 'Tornado' | 'None'` (union) → actual code uses `type: SevereWeatherType` (enum) at `src/core/sensors/WeatherAPIClient.ts:50-56`. Functionality is equivalent.

---

## Phase 7: Gaming Integration Documentation Updates
**Focus**: Fix GamingContext, Discord, and Steam documentation.
**Estimated Items**: 4 tasks

### Task 7.1: GamingContext Location (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: `GamingContext` documented at `src/types/GamingTypes.ts` → actual location is `src/core/types/Progression.ts` (36-51)

### Task 7.2: Discord Types Location (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Discord types documented at `src/types/DiscordTypes.ts` → actual location is `src/core/sensors/DiscordRPCClient.ts`:
  - `DiscordUserInfo` → (103-109)
  - `MusicActivityDetails` → (191-199)
  - `DiscordActivity` → (161-186)
  - `DiscordConnectionState` (enum) → (87-98)

### Task 7.3: SteamAPIClient.getCurrentGame Return Type (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Return type documented as `Promise<{ name; appId } | null>` → actual return type is `Promise<{ name: string; appId: number; source: 'steam'; sessionDuration?: number } | null>` (at `src/core/sensors/SteamAPIClient.ts:215-261`)

### Task 7.4: SteamAPIClient.getGameMetadata Return Type (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Return type documented as `Promise<{ genre? } | null>` → actual return type is `Promise<{ appId?: number; name: string; genre?: string[]; description?: string } | null>` (at `src/core/sensors/SteamAPIClient.ts:267-313`)

---

## Phase 8: Equipment Types Documentation Updates
**Focus**: Fix equipment type locations.
**Estimated Items**: 1 task

### Task 8.1: Equipment Types Location (1 item)
- [ ] Update DATA_ENGINE_REFERENCE.md: Equipment types documented at `src/types/Equipment.ts` and `src/core/equipment/EquipmentSpawnHelper.ts` → actual location is `src/core/types/Equipment.ts`:
  - `EquipmentProperty` → (64-71)
  - `EquipmentPropertyType` → (38-45)
  - `EquipmentCondition` → (51-59)
  - `EnhancedEquipment` → (89-137)
  - `EquipmentModification` → (142-159)
  - `EnhancedInventoryItem` → (164-177)
  - `EffectApplicationResult` → (231-238)
  - `EquipmentValidationResult` → (243-248)
  - `SpawnRandomOptions` → (253-262)
  - `TreasureHoardResult` → (267-274)

---

## Summary Dashboard

| Phase | Focus Area | Est. Tasks | Status |
|-------|-----------|------------|--------|
| 1 | Foundation Type Location Updates | 6 | Pending |
| 2 | Character Type Documentation | 3 | Pending |
| 3 | Character Generation Documentation | 11 | Pending |
| 4 | Progression System Documentation | 4 | Pending |
| 5 | Combat System Documentation | 2 | Pending |
| 6 | Environmental Types Documentation | 6 | Pending |
| 7 | Gaming Integration Documentation | 4 | Pending |
| 8 | Equipment Types Documentation | 1 | Pending |
| **Total** | | **37** | |

---

## Reference: Resolved Items (No Action Needed)

The following items were already resolved during verification:
- **Task 2.3 - EquipmentGenerator.getEquipmentByType**: Method was missing, now implemented at `src/core/generation/EquipmentGenerator.ts:437-450` with proper signature and 5 unit tests added.
