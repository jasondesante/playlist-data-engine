# Plan Part 2: Discrepancies Found in USAGE_IN_OTHER_PROJECTS.md Verification

**Source**: This plan extracts all discrepancies and action items found during the verification of `USAGE_IN_OTHER_PROJECTS.md` documented in `USAGE_IN_OTHER_PROJECTS_plan.md`.

**Date**: 2026-02-01

---

## Overview

This plan lists all discrepancies, documentation errors, and action items discovered during the comprehensive verification of `USAGE_IN_OTHER_PROJECTS.md`. Items are organized by priority and category.

---

## High Priority: Documentation Errors

### 1. SteamAPIClient and DiscordRPCClient - Documented but Not Exported

**Location**: USAGE_IN_OTHER_PROJECTS.md lines 1536-1537

**Issue**: These classes are documented in the "Available Exports" section but are NOT exported from `src/index.ts`.

**Actual Status**:
- `SteamAPIClient` exists at `src/core/sensors/SteamAPIClient.ts:19`
- `DiscordRPCClient` exists at `src/core/sensors/DiscordRPCClient.ts:254`
- Both are used internally by `GamingPlatformSensors`
- Neither is exported from the main `src/index.ts`

**Action Required**:
- [ ] Export these classes if direct access should be part of the public API
- [ ] Make sure USAGE_IN_OTHER_PROJECTS.md matches the actual exports

**Impact**: Medium

---

### 2. CharacterSheet.attacks Property - Documented but Does Not Exist

**Location**: USAGE_IN_OTHER_PROJECTS.md line 377 (Task 2.6)

**Issue**: Documentation shows `CharacterSheet` having an `attacks?: Attack[]` property, but this property does NOT exist on the `CharacterSheet` type.

**Actual Status**:
- `Attack` type exists at `src/core/types/Character.ts:289`
- `CharacterSheet` interface exists at `src/core/types/Character.ts:333`
- `CharacterSheet` does NOT have an `attacks` property
- Attacks appear to be computed dynamically or derived from equipment/class features

**Action Required**:
- [ ] Document how attacks are actually computed/accessed and decide from there if the `attacks` property should be added to `CharacterSheet`. I am leaning towards getting rid of `attacks` if there is literally no use for it, and the engine uses `Attack`.
- [ ] Remove references to `attacks` property on `CharacterSheet` from documentation
- [ ] OR add the `attacks` property to `CharacterSheet` interface if it was intended to be there

**Impact**: Medium - Users may try to access `character.attacks` and get undefined

---

### 3. DiceRoller Function Signatures - Major Discrepancies

**Location**: USAGE_IN_OTHER_PROJECTS.md - DiceRoller not documented, but Task 6.5 found many signature issues

**Issue**: Multiple signature discrepancies between documented and actual implementations:

| Function | Documented Signature | Actual Signature | Issue |
|----------|---------------------|------------------|-------|
| `rollMultipleDice` | `(sides, count)` | `(count, sides)` | Parameter order reversed |
| `parseDiceFormula` | Returns `DiceFormula` | Returns inline object | No `DiceFormula` type exported |
| `rollWithAdvantage` | Returns `number` | Returns `{roll1, roll2, result}` | Returns object, not number |
| `rollWithDisadvantage` | Returns `number` | Returns `{roll1, roll2, result}` | Returns object, not number |
| `rollInitiative` | `()` | `(dexModifier)` | Requires parameter |
| `doubleDamage` | `(damage: number): number` | `(rolls: number[]): number[]` | Different signature entirely |
| `calculateDamage` | `(formula: DiceFormula): number` | `(formula, modifier, isCritical?): {...}` | Takes more parameters, returns object |
| `rollSavingThrow` | `(ability: Ability): number` | `(abilityModifier, proficiencyBonus): number` | Takes numbers, not types |
| `rollAbilityCheck` | `(ability: Ability): number` | `(abilityModifier, proficiencyBonus): number` | Takes numbers, not types |
| `seededRoll` | `(seed: string, sides: number): number` | `(seed: number): number` | Different parameter types |

**Action Required**:
- [ ] Is DiceRoller already documented in DATA_ENGINE_REFERENCE.md? If so then it doesn't need to be documented in USAGE_IN_OTHER_PROJECTS.md because DATA_ENGINE_REFERENCE.md is where the api documentation goes, and USAGE_IN_OTHER_PROJECTS.md is all about the examples.
- [ ] Add DiceRoller documentation to DATA_ENGINE_REFERENCE.md if it is not already documented in DATA_ENGINE_REFERENCE.md, and correct it's documentation in USAGE_IN_OTHER_PROJECTS.md if necessary too.
- [ ] Correct all function signatures in documentation
- [ ] Consider if `DiceFormula` type should be extracted and exported

**Impact**: Medium - Users will get compilation errors when using documented signatures

---

## Medium Priority: Missing Type Exports

### 4. MetadataExtractionOptions - Defined but Not Exported

**Location**: src/core/parser/MetadataExtractor.ts:6

**Issue**: `MetadataExtractionOptions` interface is defined with `strict?: boolean` property but NOT exported from `src/index.ts`.

**Actual Status**:
- Interface exists at `src/core/parser/MetadataExtractor.ts:6`
- Currently not used in any methods but defined for future use
- Not included in public type exports

**Action Required**:
- [ ] Determine if this interface should be part of public API
- [ ] If yes, export from src/index.ts
- [ ] If no, remove the interface since it's currently unused

**Impact**: Low - Interface exists but is unused

---

### 5. AudioAnalyzerOptions - Defined but Not Exported

**Location**: src/core/analysis/AudioAnalyzer.ts:8

**Issue**: `AudioAnalyzerOptions` interface is defined for constructor options but NOT exported from `src/index.ts`.

**Actual Status**:
- Interface exists with properties: `includeAdvancedMetrics`, `sampleRate`, `fftSize`, `trebleAttenuation`, `bassBoost`, `midBoost`
- Used internally for constructor options
- Not included in public type exports

**Action Required**:
- [ ] Export `AudioAnalyzerOptions` from `src/index.ts` if public API consumers should configure audio analysis

**Impact**: Low - Only affects users who want to customize audio analysis behavior

---

### 6. SpellSlots Type - Exists but Not Exported

**Location**: src/core/generation/SpellManager.ts:24

**Issue**: `SpellSlots` interface is defined but NOT exported from `src/index.ts`.

**Actual Status**:
- Interface exists at `src/core/generation/SpellManager.ts:24`
- Properties: `spell_slots`, `known_spells`, `cantrips`
- Returned by `SpellManager.initializeSpells()` method
- Not in public type exports

**Action Required**:
- [ ] Add `export type { SpellSlots } from './core/generation/SpellManager.js';` to `src/index.ts`

**Impact**: Medium - Users working with spell data will want this type

---

## Medium Priority: Documentation Inaccuracies

### 7. FrequencyBands Comments - Reference Old v1 Bands

**Location**: src/core/types/AudioProfile.ts lines 66-73

**Issue**: Comments still reference the OLD v1 frequency bands, but code uses v2 bands.

**Documented in Comments**:
- Bass: 20Hz - 250Hz
- Mid: 250Hz - 4kHz
- Treble: 4kHz - 20kHz

**Actual Implementation** (v2):
- Bass: 20Hz - 400Hz
- Mid: 400Hz - 4kHz
- Treble: 4kHz - 14kHz

**Action Required**:
- [ ] Update comments in `src/core/types/AudioProfile.ts` lines 66-73 to match v2 implementation
- [ ] Update any documentation referencing old frequency ranges

**Impact**: Low - Code works correctly, comments are just misleading

---

### 8. EquipmentEffectApplier Method Signatures - Minor Documentation Issues

**Location**: USAGE_IN_OTHER_PROJECTS.md example code around line 1435

**Issue**: Documentation shows `instanceId` as required parameter and `unequipItem` returning `void`.

**Actual Signatures**:
- `equipItem(character, equipment, instanceId?: string): EffectApplicationResult` - instanceId is optional
- `unequipItem(character, equipmentName, instanceId?: string): EffectApplicationResult` - instanceId is optional, returns result

**Action Required**:
- [ ] Update example code to show `instanceId` as optional
- [ ] Update return type documentation for `unequipItem` to show `EffectApplicationResult`

**Impact**: Low - Code examples work, but documentation is misleading

---

### 9. Various Parameter Name Differences

**Location**: Throughout USAGE_IN_OTHER_PROJECTS.md

**Issue**: Documentation uses different parameter names than actual implementation.

**Examples**:
- `className` vs `characterClass` in multiple methods
- `trackId` vs `trackUuid` in SessionTracker methods
- `primaryAbility` vs `primaryStat` in StatManager methods
- `modification` vs `enchantment` in EquipmentModifier methods
- `type` vs `source` in EquipmentModifier.createModification

**Action Required**:
- [ ] Audit all method signatures in documentation against actual implementations
- [ ] Update parameter names in documentation to match code. The code is the law, the documentation needs to be updated if the code doesn't match.

**Impact**: Low - Functionality works, but documentation may confuse users

---

## Low Priority: Missing Documentation

### 10. Hash Utilities - Not Documented

**Location**: src/utils/hash.ts

**Issue**: Hash utility functions are exported but not mentioned in USAGE_IN_OTHER_PROJECTS.md.

**Functions**:
- `generateSeed(chainName, tokenAddress, tokenId)` - takes 3 parameters (not 1 as might be expected)
- `hashSeedToFloat(seed)` - hash seed to 0.0-1.0 range
- `hashSeedToInt(seed, min, max)` - hash to integer in range (has extra parameters)
- `deriveSeed(baseSeed, suffix)` - derive new seed (parameters named differently)

**Action Required**:
- [ ] Add hash utilities section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API. 
- [ ] Correct parameter documentation

**Impact**: Low - Useful utilities but not critical for basic usage

---

### 11. SeededRNG Class - Not Documented

**Location**: src/utils/random.ts

**Issue**: `SeededRNG` class is a key utility for deterministic randomness but not documented.

**Methods**:
- `random()` - Generate random float 0.0-1.0
- `randomInt(min, max)` - Generate random integer in range
- `randomChoice(array)` - Pick random element
- `weightedChoice(choices)` - Pick element with weights
- `shuffle(array)` - Shuffle array deterministically
- `reset()` - Reset counter

**Action Required**:
- [ ] Add SeededRNG section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API. 

**Impact**: Low - Core utility but internal use is documented elsewhere

---

### 12. Validation Schemas - Not Documented

**Location**: src/utils/validators.ts

**Issue**: Zod validation schemas are exported but not documented.

**Schemas**:
- `PlaylistTrackSchema`
- `ServerlessPlaylistSchema`
- `AudioProfileSchema`
- `AbilityScoresSchema`
- `CharacterSheetSchema`

**Action Required**:
- [ ] Add validation schemas section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API. 

**Impact**: Low - Useful for runtime validation but not essential

---

### 13. Logger Utility - Not Documented

**Location**: src/utils/logger.ts

**Issue**: Logger class and utilities are exported but not documented.

**Exports**:
- `Logger` class
- `createLogger()` function
- `LogLevel` enum
- `LogEntry` type
- `LoggerConfig` type

**Action Required**:
- [ ] Add Logger section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API. 

**Impact**: Low - Standard logging utility, API is self-explanatory

---

### 14. Sensor Dashboard - Not Documented

**Location**: src/utils/sensorDashboard.ts

**Issue**: Diagnostic dashboard utilities are exported but not documented.

**Functions**:
- `displayEnvironmentalDiagnostics()`
- `displayGamingDiagnostics()`
- `displaySystemDashboard()`
- `SensorDashboard` object
- `DashboardConfig` type

**Action Required**:
- [ ] Add Sensor Dashboard section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API. 

**Impact**: Low - Debugging utility, not needed for production use

---

### 15. Enchantment Library - Not Documented

**Location**: src/utils/enchantmentLibrary.ts

**Issue**: Comprehensive enchantment library is exported but not documented.

**Collections**:
- `WEAPON_ENCHANTMENTS` (16 enchantments)
- `ARMOR_ENCHANTMENTS` (2 enchantments)
- `RESISTANCE_ENCHANTMENTS` (9 enchantments)
- `CURSES` (17 curses)
- `ALL_ENCHANTMENTS`

**Functions**:
- `getEnchantment()`, `getCurse()`, `getAllEnchantments()`, etc.
- `createStrengthEnchantment()`, etc. (take `bonus` parameter 1-4)

**Action Required**:
- [ ] Add Enchantment Library section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API. 
- [ ] Document that `create*` functions take `bonus` parameter

**Impact**: Medium - Very useful for equipment system but needs documentation

---

### 16. Magic Item Examples - Not Documented

**Location**: src/utils/magicItemExamples.ts

**Issue**: 38 example magic items demonstrating all equipment capabilities are exported but not documented.

**Contents**:
- `MAGIC_ITEM_EXAMPLES` - 38 items
- `MAGIC_EQUIPMENT_TEMPLATES` - 7 templates (type is `Partial<EnhancedEquipment>`, not `EquipmentTemplate`)

**Functions**:
- `getMagicItem(name)` - parameter is `name`, not `id`
- `getMagicItemsByType(type)` - type has literal union
- `getMagicItemsByRarity(rarity)` - rarity has literal union
- `getCursedItems()`
- `getItemsWithProperty(propertyType)`
- `applyTemplate(baseEquipment, templateId)` - takes `templateId: string`, not template object

**Action Required**:
- [ ] Add Magic Item Examples section to USAGE_IN_OTHER_PROJECTS.md (if not already a part of DATA_ENGINE_REFERENCE.md) if intended as public API. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API.  Another important thing to note is that these examples might be in EQUIPMENT_SYSTEM.md. So you must check these other docs files first because if those examples are in EQUIPMENT_SYSTEM.md then you're good.
- [ ] Correct parameter names and types in documentation

**Impact**: Low - Examples are helpful but not essential

---

### 17. Configuration - Not Documented

**Location**: src/core/config/

**Issue**: Sensor and progression configuration utilities are exported but not documented.

**Sensor Config**:
- `SensorConfig` type
- `DEFAULT_SENSOR_CONFIG`
- `loadConfigFromEnv()`
- `mergeConfig()`

**Progression Config**:
- `ProgressionConfig` type
- `DEFAULT_PROGRESSION_CONFIG`
- `mergeProgressionConfig()`

**Action Required**:
- [ ] Add Configuration section to USAGE_IN_OTHER_PROJECTS.md. Remember the API documentation is written in DATA_ENGINE_REFERENCE.md so if it's already in there you are good. The USAGE_IN_OTHER_PROJECTS.md file is strictly for examples of how to use the API and for more in depth descriptions of the API.

**Impact**: Low - Advanced configuration, not needed for basic usage

---

## Low Priority: Type Clarifications

### 18. Equipment vs EnhancedEquipment - Two Types Exist

**Location**: src/utils/constants.ts vs src/core/types/Equipment.ts

**Issue**: Two equipment types exist with overlapping purposes.

**Equipment** (constants.ts):
- Base interface for equipment data
- Properties: name, type, rarity, weight, properties?, etc.
- Used in: DEFAULT_EQUIPMENT, EQUIPMENT_DATABASE
- Less strict typing

**EnhancedEquipment** (types/Equipment.ts):
- Enhanced interface with optional advanced properties
- Additional: spawnWeight, templateId, source (required), tags
- Stricter types: EquipmentType, EquipmentRarity, etc.
- Used in: EnhancedInventoryItem, equipment system
- Exported from src/index.ts

**Action Required**:
- [ ] Document relationship between Equipment and EnhancedEquipment
- [ ] Clarify which to use when

**Impact**: Low - Types are compatible, difference is internal

---

### 19. RaceDataEntry vs RaceInfo - Type Name Mismatch

**Location**: Documentation vs actual type

**Issue**: Documentation references `RaceInfo` type but actual type is `RaceDataEntry`.

**Actual Status**:
- `RaceDataEntry` interface exists at `src/utils/constants.ts:23`
- Properties: ability_bonuses, speed, traits, subraces?
- `RaceInfo` does NOT exist

**Action Required**:
- [ ] Update documentation to use correct type name `RaceDataEntry`

**Impact**: Low - Internal type, not commonly used by consumers

---

### 20. ClassDataEntry vs ClassInfo - Type Name Mismatch

**Location**: Documentation vs actual type

**Issue**: Documentation references `ClassInfo` type but actual type is `ClassDataEntry`.

**Actual Status**:
- `ClassDataEntry` interface exists at `src/utils/constants.ts:291`
- Properties: name?, primary_ability, hit_die, saving_throws, etc.
- `ClassInfo` does NOT exist

**Action Required**:
- [ ] Update documentation to use correct type name `ClassDataEntry`

**Impact**: Low - Internal type, not commonly used by consumers

---

## Summary Checklist

### Must Fix (High Priority)
- [ ] Remove SteamAPIClient and DiscordRPCClient from exports documentation
- [ ] Resolve CharacterSheet.attacks property discrepancy
- [ ] Fix DiceRoller documentation or add proper documentation with correct signatures

### Should Fix (Medium Priority)
- [ ] Export or remove MetadataExtractionOptions
- [ ] Export or document AudioAnalyzerOptions availability
- [ ] Export SpellSlots type from src/index.ts
- [ ] Update FrequencyBands comments to match v2 implementation
- [ ] Fix EquipmentEffectApplier method documentation
- [ ] Audit and fix parameter name differences throughout documentation

### Nice to Have (Low Priority)
- [ ] Add documentation for missing utilities (hash, SeededRNG, validators, logger, dashboard)
- [ ] Add documentation for enchantment library
- [ ] Add documentation for magic item examples
- [ ] Add documentation for configuration
- [ ] Document Equipment vs EnhancedEquipment relationship
- [ ] Fix type name mismatches in documentation (RaceInfo→RaceDataEntry, etc.)

---

## Notes

1. **All build statuses are clean** - No compilation errors exist in the codebase itself
2. **All types exist** - No missing types were found; issues are primarily documentation accuracy
3. **All exports work** - The actual exports from src/index.ts are correct and functional
4. **The main issues are documentation accuracy** - Code works correctly, but documentation doesn't always match

---

## Progress Tracking

| Category | Items | Completed | Remaining |
|----------|-------|-----------|-----------|
| High Priority | 3 | 0 | 3 |
| Medium Priority | 8 | 0 | 8 |
| Low Priority | 9 | 0 | 9 |
| **TOTAL** | **20** | **0** | **20** |
