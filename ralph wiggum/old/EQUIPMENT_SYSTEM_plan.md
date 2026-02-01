# Equipment System Documentation Verification Plan

> **Goal**: Verify that every item documented in `EQUIPMENT_SYSTEM.md` exists in the codebase with correct names, signatures, types, and exports. This plan ensures documentation-code consistency by systematically validating all exported types, classes, methods, and interfaces.

---

## Dynamic Phase Expansion Protocol

**If any problems are discovered where the documentation and code do not match:**

1. **Add a New Phase**: Create a new phase at the end of this plan (e.g., "Phase 7", "Phase 8", etc.) to address the specific discrepancy category.

2. **Research Tasks**: Investigate the codebase to understand:
   - What the code currently implements
   - What the documentation claims
   - The correct resolution approach (fix code vs. fix docs)

3. **Document the Phase**: Write the new phase into this plan with:
   - Clear objective describing what will be fixed
   - Detailed checklist of tasks to complete
   - Expected file paths and item names

4. **Execute When Reached**: When progressing through the plan sequentially, execute the fixes in that new phase only when you reach it. Do not attempt to fix issues from later phases prematurely.

This approach ensures all discrepancies are captured systematically and resolved in a controlled order, preventing partial fixes or breaking changes.

---

## Table of Contents

1. [Phase 1: File Structure & Package Exports](#phase-1-file-structure--package-exports)
2. [Phase 2: Type Definitions](#phase-2-type-definitions)
3. [Phase 3: Core Classes](#phase-3-core-classes)
4. [Phase 4: Integration & Dependencies](#phase-4-integration--dependencies)
5. [Phase 5: Signature & Type Verification](#phase-5-signature--type-verification)
6. [Phase 6: Discrepancy Resolution](#phase-6-discrepancy-resolution)

---

## Phase 1: File Structure & Package Exports

**Objective**: Verify all expected files exist and the package exports match documentation.

### Task 1.1: Verify File Structure

- [x] `src/core/types/Equipment.ts` exists - Main equipment type definitions
- [x] `src/core/types/Character.ts` exists - Character sheet type definitions
- [x] `src/core/equipment/EquipmentEffectApplier.ts` exists - Effect application logic
- [x] `src/core/equipment/EquipmentValidator.ts` exists - Validation logic
- [x] `src/core/equipment/EquipmentModifier.ts` exists - Modification logic
- [x] `src/core/equipment/EquipmentSpawnHelper.ts` exists - Spawning utilities
- [x] `src/core/extensions/ExtensionManager.ts` exists - Extension registration
- [x] `src/utils/random.ts` exists - RNG utilities (SeededRNG class)

### Task 1.2: Verify Package Exports

Verify that the package exports (likely from `src/index.ts` or similar):

#### Classes
- [x] ExtensionManager
- [x] EquipmentSpawnHelper
- [x] SeededRNG
- [x] EquipmentEffectApplier
- [x] EquipmentValidator
- [x] EquipmentModifier

#### Types
- [x] EnhancedEquipment
- [x] EquipmentProperty
- [x] EquipmentModification
- [x] EquipmentMiniFeature
- [x] CharacterEquipment
- [x] CharacterSheet

---

## Phase 2: Type Definitions

**Objective**: Verify all equipment-related types and interfaces are correctly defined.

### Task 2.1: Core Equipment Types

- [x] `type EquipmentPropertyType` → src/core/types/Equipment.ts (VERIFIED)
  - [x] Value: 'stat_bonus'
  - [x] Value: 'skill_proficiency'
  - [x] Value: 'ability_unlock'
  - [x] Value: 'passive_modifier'
  - [x] Value: 'special_property'
  - [x] Value: 'damage_bonus'
  - [x] Value: 'stat_requirement'

- [x] `type EquipmentRarity` → src/core/types/Equipment.ts (FIXED in Phase 7)
  - [x] Value: 'common'
  - [x] Value: 'uncommon'
  - [x] Value: 'rare'
  - [x] Value: 'very_rare'
  - [x] Value: 'legendary'

- [x] `type EquipmentType` → src/core/types/Equipment.ts (FIXED in Phase 7)
  - [x] Value: 'weapon'
  - [x] Value: 'armor'
  - [x] Value: 'item'

### Task 2.2: Equipment Interfaces

- [x] `interface EquipmentProperty` → src/core/types/Equipment.ts (VERIFIED)
  - [x] `type: EquipmentPropertyType`
  - [x] `target: string`
  - [x] `value: number | string | boolean`
  - [x] `condition?: EquipmentCondition`
  - [x] `description?: string`
  - [x] `stackable?: boolean` (default: true)

- [x] `type EquipmentCondition` → src/core/types/Equipment.ts (VERIFIED - better than planned!)
  - [x] Implemented as discriminated union (not simple interface) for type safety
  - [x] Condition types: 'vs_creature_type', 'at_time_of_day', 'wielder_race', 'wielder_class', 'while_equipped', 'on_hit', 'on_damage_taken', 'custom'
  - [x] Each condition type has properly typed values

- [x] `interface EnhancedEquipment` → src/core/types/Equipment.ts (VERIFIED)
  - [x] **Base Properties:**
    - [x] `name: string`
    - [x] `type: 'weapon' | 'armor' | 'item'` (uses EquipmentType type)
    - [x] `rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'` (uses EquipmentRarity type)
    - [x] `weight: number`
  - [x] **Advanced Properties:**
    - [x] `properties?: EquipmentProperty[]`
    - [x] `grantsFeatures?: Array<string | EquipmentMiniFeature>`
    - [x] `grantsSkills?: Array<{ skillId, level: 'proficient' | 'expertise' }>`
    - [x] `grantsSpells?: Array<{ spellId, level?, uses?, recharge? }>`
  - [x] **D&D 5e Stats:**
    - [x] `damage?: { dice: string, damageType: string, versatile?: string }`
    - [x] `acBonus?: number`
    - [x] `weaponProperties?: string[]`
  - [x] **Other:**
    - [x] `spawnWeight?: number`
    - [x] `templateId?: string`
    - [x] `source: 'default' | 'custom'`
    - [x] `tags?: string[]`

### Task 2.3: Feature & Skill Interfaces

- [x] `interface EquipmentMiniFeature` → src/core/types/Equipment.ts (VERIFIED - lines 77-83)
  - [x] `id: string`
  - [x] `name: string`
  - [x] `description: string`
  - [x] `effects: EquipmentProperty[]`
  - [x] `source: 'equipment_inline'`

- [x] `interface EquipmentFeature` → src/core/types/Equipment.ts (VERIFIED - lines 182-188, implemented as interface not type)
  - Note: Plan requested `type` but code implements `interface` - this is equivalent and preferred TypeScript practice for object shapes
  - Properties: `featureId`, `source`, `equipmentName`, `instanceId`, `sourceType`

- [x] `interface EquipmentSkill` → src/core/types/Equipment.ts (VERIFIED - lines 193-200)
  - [x] `skillId: string`
  - [x] `level: 'proficient' | 'expertise'`
  - Additional properties: `source`, `equipmentName`, `instanceId`, `sourceType`

### Task 2.4: Modification Interfaces

- [x] `interface EquipmentModification` → src/core/types/Equipment.ts (VERIFIED - lines 142-159)
  - [x] `id: string`
  - [x] `name: string`
  - [x] `properties: EquipmentProperty[]`
  - [x] `addsFeatures?: Array<string | EquipmentMiniFeature>`
  - [x] `addsSkills?: Array<{ skillId, level: 'proficient' | 'expertise' }>`
  - [x] `addsSpells?: Array<{ spellId, level?, uses?, recharge? }>`
  - [x] `appliedAt: string`
  - [x] `source: string`

### Task 2.5: Result Type Interfaces

- [x] `type EffectApplicationResult` → src/core/types/Equipment.ts (VERIFIED - lines 180-187)
  - [x] `applied: boolean`
  - [x] `count: number`
  - [x] `errors: string[]`

- [x] `interface EquipmentValidationResult` → src/core/types/Equipment.ts (VERIFIED - lines 191-196)
  - [x] `valid: boolean`
  - [x] `errors?: string[]`

- [x] `interface SpawnRandomOptions` → src/core/types/Equipment.ts (VERIFIED - lines 200-209)
  - [x] `excludeZeroWeight?: boolean`
  - [x] `includeTypes?: ('weapon' | 'armor' | 'item')[]`
  - [x] `minRarity?: EquipmentRarity`
  - [x] `maxRarity?: EquipmentRarity`

- [x] `interface TreasureHoardResult` → src/core/types/Equipment.ts (VERIFIED - lines 213-220)
  - [x] `items: EnhancedEquipment[]`
  - [x] `totalValue: number`
  - [x] `cr: number`

---

## Phase 3: Core Classes

**Objective**: Verify all documented classes exist with correct methods.

### Task 3.1: ExtensionManager Class

- [x] `class ExtensionManager` → src/core/extensions/ExtensionManager.ts (VERIFIED - line 158)
  - [x] `static getInstance()` (VERIFIED - lines 173-178)
  - [x] `register('equipment', [equipment])` (VERIFIED - lines 204-311, 'equipment' is valid ExtensionCategory at line 30)
  - [x] `register('equipment.templates', [templates])` (VERIFIED - lines 204-311, 'equipment.templates' is valid ExtensionCategory at line 34)

### Task 3.2: EquipmentEffectApplier Class

- [x] `class EquipmentEffectApplier` → src/core/equipment/EquipmentEffectApplier.ts (VERIFIED - lines 36-909)
  - [x] `static equipItem(character: CharacterSheet, equipment: EnhancedEquipment, instanceId?: string): EffectApplicationResult` (VERIFIED - lines 45-141)
  - [x] `static unequipItem(character: CharacterSheet, equipmentName: string, instanceId?: string): EffectApplicationResult` (VERIFIED - lines 151-209)
  - [x] `static reapplyEquipmentEffects(character: CharacterSheet): EffectApplicationResult` (VERIFIED - lines 217-296)
  - [x] `static getActiveEffects(character: CharacterSheet): EquipmentProperty[]` (VERIFIED - lines 304-316)

### Task 3.3: EquipmentValidator Class

- [x] `class EquipmentValidator` → src/core/equipment/EquipmentValidator.ts (VERIFIED - lines 102-905)
  - [x] `static validateEquipment(equipment: EnhancedEquipment): EquipmentValidationResult` (VERIFIED - lines 113-258)
  - [x] `static validateProperty(property: EquipmentProperty): EquipmentValidationResult` (VERIFIED - lines 266-317)
  - [x] `static validateEquipmentFeatureReference(featureId: string): boolean` (VERIFIED - lines 555-560)
  - [x] `static validateEquipmentSkillReference(skillId: string): boolean` (VERIFIED - lines 604-606)
  - [x] `static validateDamageInfo(damage: EnhancedEquipment['damage']): EquipmentValidationResult` (VERIFIED - lines 618-669)
  - [x] `static validateSpawnWeight(weight: number): EquipmentValidationResult` (VERIFIED - lines 681-696)
  - [x] `static validateModification(modification: EquipmentModification): EquipmentValidationResult` (VERIFIED - lines 707-789)

### Task 3.4: EquipmentModifier Class

- [x] `class EquipmentModifier` → src/core/equipment/EquipmentModifier.ts (VERIFIED - lines 76-854)

  **Modification Operations:**
  - [x] `static enchant(equipment: CharacterEquipment, itemName: string, enchantment: EquipmentModification, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 89-106)
  - [x] `static applyTemplate(equipment: CharacterEquipment, itemName: string, templateId: string, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 120-160)
  - [x] `static curse(equipment: CharacterEquipment, itemName: string, curse: EquipmentModification, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 174-191)
  - [x] `static upgrade(equipment: CharacterEquipment, itemName: string, upgrade: EquipmentModification, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 205-212)
  - [x] `static removeModification(equipment: CharacterEquipment, itemName: string, modificationId: string, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 226-273)

  **Query Operations:**
  - [x] `static getModificationHistory(equipment: CharacterEquipment, itemName: string): EquipmentModification[]` (VERIFIED - lines 285-296)
  - [x] `static getCombinedEffects(equipment: CharacterEquipment, itemName: string, instanceId?: string): EquipmentProperty[]` (VERIFIED - lines 309-333)
  - [x] `static hasTemplate(equipment: CharacterEquipment, itemName: string, templateId: string): boolean` (VERIFIED - lines 343-366)
  - [x] `static isEnchanted(equipment: CharacterEquipment, itemName: string): boolean` (VERIFIED - lines 806-812)
  - [x] `static isCursed(equipment: CharacterEquipment, itemName: string): boolean` (VERIFIED - lines 792-797)
  - [x] `static getAppliedTemplates(equipment: CharacterEquipment, itemName: string): string[]` (VERIFIED - lines 375-403)
  - [x] `static getModificationSources(equipment: CharacterEquipment, itemName: string): string[]` (VERIFIED - lines 751-762)
  - [x] `static countModificationsBySource(equipment: CharacterEquipment, itemName: string): Record<string, number>` (VERIFIED - lines 772-787, FIXED signature to match plan)
  - [x] `static getItemSummary(equipment: CharacterEquipment, itemName: string): { name, modifications, isCursed, isEnchanted }` (VERIFIED - lines 821-853, returns enhanced summary)

  **Bulk Operations:**
  - [x] `static removeAllModifications(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 416-435)
  - [x] `static disenchant(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 448-469)
  - [x] `static liftCurse(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet): CharacterEquipment` (VERIFIED - lines 482-503)

  **Factory Methods:**
  - [x] `static createModification(id: string, name: string, properties: EquipmentProperty[], source: string): EquipmentModification` (VERIFIED - lines 632-645)
  - [x] `static generateModificationId(prefix?: string): string` (VERIFIED - lines 740-742)

### Task 3.5: EquipmentSpawnHelper Class

- [x] `class EquipmentSpawnHelper` → src/core/equipment/EquipmentSpawnHelper.ts (VERIFIED - line 57)

  **Spawning Operations:**
  - [x] `static spawnFromList(itemNames: string[], rng?: SeededRNG): (EnhancedEquipment | undefined)[]` (VERIFIED - lines 74-91)
  - [x] `static spawnByRarity(rarity: EquipmentRarity, count: number, rng?: SeededRNG): EnhancedEquipment[]` (VERIFIED - lines 111-147)
  - [x] `static spawnByTags(tags: string[], count: number, rng?: SeededRNG, options?: SpawnRandomOptions): EnhancedEquipment[]` (VERIFIED - lines 171-242)
  - [x] `static spawnRandom(count: number, rng: SeededRNG, options?: SpawnRandomOptions): EnhancedEquipment[]` (VERIFIED - lines 266-332)
  - [x] `static spawnFromTemplate(templateId: string, baseItemName?: string): EnhancedEquipment | null` (VERIFIED - lines 355-414)
  - [x] `static spawnTreasureHoard(cr: number, rng: SeededRNG): TreasureHoardResult` (VERIFIED - lines 433-469)

  **Character Operations:**
  - [x] `static addToCharacter(character: CharacterSheet, items: EnhancedEquipment[], equip?: boolean): CharacterSheet` (VERIFIED - lines 487-532)

### Task 3.6: SeededRNG Class

- [x] `class SeededRNG` → src/utils/random.ts (VERIFIED - line 7)
  - [x] `constructor(seed: string)` (VERIFIED - lines 11-14)

---

## Phase 4: Integration & Dependencies

**Objective**: Verify Character sheet integration and cross-module dependencies.

### Task 4.1: CharacterSheet Interface

- [x] `interface CharacterSheet` → src/core/types/Character.ts (VERIFIED - lines 228-377)
  - [x] `equipment?: CharacterEquipment` (VERIFIED - lines 289-295, uses inline type matching CharacterEquipment structure)
  - [x] `equipment_effects?: EquipmentEffectEntry[]` (VERIFIED - lines 352-375, uses inline type matching documentation structure)

**Note**: The `equipment` property uses an inline object type instead of the exported `CharacterEquipment` type from EquipmentGenerator.ts. The structures match exactly. The `equipment_effects` property also uses an inline type which matches the documentation structure. No `EquipmentEffectEntry` type is defined as a separate named type.

### Task 4.2: CharacterEquipment Type

- [x] `type CharacterEquipment` → src/core/generation/EquipmentGenerator.ts (VERIFIED - lines 46-52)

**Note**: The type is defined in `EquipmentGenerator.ts`, not in `Character.ts` as initially planned. It is properly exported and available through the package exports. The structure matches what's documented:
- `weapons: EnhancedInventoryItem[]`
- `armor: EnhancedInventoryItem[]`
- `items: EnhancedInventoryItem[]`
- `totalWeight: number`
- `equippedWeight: number`

### Task 4.3: Equipment Effects Structure

Verify `CharacterSheet.equipment_effects` structure:
- [x] `source: string` (VERIFIED - line 354 in Character.ts)
- [x] `instanceId?: string` (VERIFIED - line 356 in Character.ts)
- [x] `effects: EquipmentProperty[]` (VERIFIED - line 359 in Character.ts)
- [x] `features: EquipmentFeature[]` (VERIFIED - line 362 in Character.ts)
- [x] `skills: EquipmentSkill[]` (VERIFIED - line 365 in Character.ts)
- [x] `spells?: Array<{ spellId, level?, uses?, recharge? }>` (VERIFIED - lines 368-374 in Character.ts)

**Note**: The structure matches the documentation exactly. All required properties are present and correctly typed.

---

## Phase 5: Signature & Type Verification

**Objective**: For each verified item, confirm detailed signature accuracy.

### Verification Checklist

For every item listed in Phases 1-4, verify:
- [x] Exists in codebase at expected location
- [x] Name matches exactly (case-sensitive)
- [x] Signature/parameters match documentation
- [x] Exported correctly (export / export default / internal)
- [x] Type annotations are accurate
- [x] Any generics or constraints are documented correctly
- [x] Methods are static where documented
- [x] Optional properties are marked with `?`
- [x] Default values are correct
- [x] Union types match documentation

### Verification Summary

**Status**: COMPLETE - All items verified against documentation

**Findings**:
- All types and interfaces exist in correct files
- All classes are properly exported from their source files
- All public exports are present in src/index.ts
- All methods are static as documented
- All signatures match the documentation
- Type annotations are accurate throughout

**Build Verification**:
- Build completed successfully (978ms)
- No TypeScript errors
- All 181 modules transformed successfully

---

## Phase 6: Discrepancy Resolution

**Objective**: Document and categorize all issues found during verification.

### Redundancy / Potential Duplicates

(When you find similar functionality in multiple places, note it here - do not attempt to resolve)
- [x] Document any duplicate property definitions found
- [x] Document similar effect application methods across different classes
- [x] Note any overlapping validation methods

---

#### Duplicate Property Definitions Found

**1. `CharacterEquipment` Type** (RESOLVED in commit 7fbcabe)
   - ~~**Primary Definition**: [src/core/types/Equipment.ts:164-177](../src/core/types/Equipment.ts#L164-L177) - NOT present here~~
   - ~~**Actual Location**: [src/core/generation/EquipmentGenerator.ts:46-52](../src/core/generation/EquipmentGenerator.ts#L46-L52)~~
   - **New Primary Definition**: [src/core/types/Equipment.ts:177-185](../src/core/types/Equipment.ts#L177-L185)
   - **Status**: Moved from EquipmentGenerator.ts to Equipment.ts

   **Resolution**: CharacterEquipment has been consolidated to Equipment.ts as the single source of truth. All imports now point to Equipment.ts:
   - EquipmentGenerator.ts: imports from Equipment.ts
   - EquipmentModifier.ts: imports from Equipment.ts
   - equipmentModifier.test.ts: imports from Equipment.ts
   - src/index.ts: exports from Equipment.ts

**2. `EnhancedInventoryItem` Type** (ALREADY CORRECT - No duplicate)
   - **Primary Definition**: [src/core/types/Equipment.ts:164-176](../src/core/types/Equipment.ts#L164-L176)

   **Finding**: This was incorrectly marked as a duplicate. EquipmentModifier only imports `EnhancedInventoryItem` from Equipment.ts and does not re-export it. No action needed.

   **Status**: RESOLVED - Not actually a duplicate

**3. Equipment Spell Structure** (MINOR - Type exists but inline usage preferred)
   - **Type Definition**: [src/core/types/Equipment.ts:205-214](../src/core/types/Equipment.ts#L205-L214) - `interface EquipmentSpell`
   - **Inline Usage**: [src/core/types/Character.ts:369-374](../src/core/types/Character.ts#L369-L374) - spells array in `equipment_effects`

   **Finding**: `EquipmentSpell` type exists but `CharacterSheet.equipment_effects.spells` uses inline type instead. Structures are identical.

   **Recommendation**: Optional - Could use `EquipmentSpell[]` type in Character.ts for consistency, but inline type is self-documenting and acceptable.

**Summary**: ~~The duplicates are mostly import/re-export patterns that work correctly. No critical issues requiring immediate resolution. The codebase is consistent in its usage.~~

**Updated Summary (2025-01-31)**:
- `CharacterEquipment` duplicate RESOLVED: Consolidated to Equipment.ts as single source of truth
- `EnhancedInventoryItem` was never actually duplicated - EquipmentModifier was just importing from Equipment.ts
- `EquipmentSpell` inline usage in Character.ts is intentional for self-documentation

Remaining: 1 minor inline type preference issue (EquipmentSpell) which is acceptable.

---

#### Similar Effect Application Methods Found

**Analysis Date**: 2025-01-31

**Classes Analyzed**:
- [FeatureEffectApplier](../src/core/features/FeatureEffectApplier.ts) - Applies feature/trait effects
- [EquipmentEffectApplier](../src/core/equipment/EquipmentEffectApplier.ts) - Applies equipment effects
- [LevelUpProcessor](../src/core/progression/LevelUpProcessor.ts) - Orchestrates level-ups, delegates to both appliers

---

##### 1. Stat Bonus Application (NEAR-DUPLICATE)

**FeatureEffectApplier.applyStatBonus()** (lines 125-152):
```typescript
// Checks if target is an ability, adds to score, recalculates modifier
if (this.isAbility(target)) {
    character.ability_scores[target] += value;
    character.ability_modifiers[target] = Math.floor((newScore - 10) / 2);
    return;
}
// Non-ability bonuses stored in feature_effects array
```

**EquipmentEffectApplier.applyStatBonus()** (lines 391-409):
```typescript
// IDENTICAL logic for ability score handling
if (this.isAbility(target)) {
    character.ability_scores[target] += value;
    character.ability_modifiers[target] = Math.floor((newScore - 10) / 2);
    return;
}
// Custom bonuses tracked in equipment_effects
```

**Assessment**: Core logic is duplicated. Could be consolidated to a shared utility function.

---

##### 2. Skill Proficiency Application (SIMILAR)

**FeatureEffectApplier.applySkillProficiency()** (lines 160-171):
- Simple logic: Apply proficiency, expertise overrides all

**EquipmentEffectApplier.applySkillProficiency()** (lines 414-438):
- More nuanced: Implements proficiency hierarchy (none < proficient < expertise)
- Avoids downgrading (keeps expertise if already known)

**Assessment**: Equipment version is more robust. Could unify with hierarchy logic.

---

##### 3. Passive Modifier Application (OVERLAPPING)

**FeatureEffectApplier.applyPassiveModifier()** (lines 201-239):
- Handles: `speed`, `*_max` stat caps
- Stores other modifiers in `feature_effects`

**EquipmentEffectApplier.applyPassiveModifier()** (lines 457-484):
- Handles: `speed`, `ac`, `armor_class`, `max_hp`, `hp_max`
- Directly modifies character properties

**Assessment**: Different targets handled, but pattern is similar. Speed handling is duplicated.

---

##### 4. Ability Unlock Application (DIFFERENT)

**FeatureEffectApplier.applyAbilityUnlock()** (lines 179-193):
- Stores unlocks in `feature_effects` for tracking

**EquipmentEffectApplier.applyAbilityUnlock()** (lines 443-452):
- Currently a no-op (parameters suppressed)
- Comment indicates future implementation needed

**Assessment**: Inconsistent behavior. Equipment applier should likely store unlocks similar to features.

---

##### 5. isAbility() Helper (EXACT DUPLICATE)

**FeatureEffectApplier.isAbility()** (lines 292-294):
```typescript
private static isAbility(ability: string): ability is Ability {
    return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(ability);
}
```

**EquipmentEffectApplier.isAbility()** (lines 847-849):
```typescript
private static isAbility(ability: string): ability is Ability {
    return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(ability);
}
```

**Assessment**: EXACT duplicate. Should be extracted to a shared utility.

**Recommended Location**: `src/core/types/Character.ts` or new `src/core/utils/abilityUtils.ts`

---

#### Overlapping Validation Methods Found

**Analysis Date**: 2025-01-31

**Validators Analyzed**:
- [SkillValidator](../src/core/skills/SkillValidator.ts)
- [SpellValidator](../src/core/spells/SpellValidator.ts)
- [FeatureValidator](../src/core/features/FeatureValidator.ts)

---

##### 1. isValidAbility() Method (EXACT DUPLICATE)

All three validators define the same constant and helper:

**SkillValidator** (lines 20, 337-339):
```typescript
const VALID_ABILITIES: ReadonlyArray<string> = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
static isValidAbility(ability: string): ability is Ability {
    return VALID_ABILITIES.includes(ability);
}
```

**SpellValidator** (lines 20, 425-427): Identical

**FeatureValidator** (lines 77, 633-635): Identical

**Assessment**: TRIPLE duplicate. Should be extracted to shared constants file.

**Recommended Location**: `src/core/constants.ts` or `src/core/types/Character.ts`

---

##### 2. Prerequisite Validation Logic (NEAR-DUPLICATE)

All three validators have nearly identical `validateXxxPrerequisites()` methods that check:

**Common Pattern**:
1. Level requirement (same check)
2. Ability score requirements (same iteration logic)
3. Class requirement (same comparison)
4. Race requirement (same comparison)
5. Skills/spells/features array requirements (same pattern)
6. Custom conditions (same handling - note only)

**SkillValidator.validateSkillPrerequisites()** (lines 367-447)
**SpellValidator.validateSpellPrerequisites()** (lines 332-417)
**FeatureValidator.validatePrerequisites()** (via FeatureRegistry)

**Assessment**: Could be generalized to a single `PrerequisiteValidator` utility.

**Recommended Signature**:
```typescript
interface PrerequisiteSchema {
    level?: number;
    casterLevel?: number;  // spells only
    abilities?: Record<Ability, number>;
    class?: string;
    race?: string;
    subrace?: string;       // features only
    skills?: string[];
    spells?: string[];
    features?: string[];
    custom?: string;
}

function validatePrerequisites(
    prereqs: PrerequisiteSchema,
    character: CharacterSheet
): ValidationResult { /* ... */ }
```

---

#### Cross-Module Dependencies

**LevelUpProcessor** (lines 349, 717, 774):
- Calls `EquipmentEffectApplier.reapplyEquipmentEffects()` after level-ups
- This ensures equipment bonuses persist when stats change
- Proper separation of concerns: LevelUpProcessor orchestrates, delegates to appliers

**CharacterUpdater** (lines 117, 147):
- Uses `LevelUpProcessor` for level-up mechanics
- Does NOT directly apply effects (delegates appropriately)

**Assessment**: Good separation of concerns. No unnecessary duplication.

---

#### Summary of Redundancy Findings

| Category | Severity | Count | Recommendation |
|----------|----------|-------|----------------|
| Exact Duplicate (isAbility) | Low | 3 locations | Extract to shared utility |
| Near Duplicate (stat_bonus) | Low | 2 methods | Could consolidate |
| Near Duplicate (prerequisites) | Medium | 3 validators | Create PrerequisiteValidator |
| Inconsistent (ability_unlock) | Low | 2 methods | Align behavior |
| Overlapping (passive_modifier) | Low | 2 methods | Share common logic |

**Note**: These are documented for awareness. The current architecture works correctly. Consolidation is optional and should be weighed against the complexity of introducing shared utilities that may need to handle edge cases differently for features vs equipment.

---

### Discrepancies Found

- [x] SeededRNG path mismatch - FIXED in Phase 8: Updated documentation to reflect actual location `src/utils/random.ts`
- [x] EquipmentRarity type missing - Documented as separate type but only exists as inline union in EnhancedEquipment.rarity
- [x] EquipmentType type missing - Documented as separate type but only exists as inline union in EnhancedEquipment.type
- [ ] Items documented but not found in codebase
- [ ] Items exist in code but not documented
- [ ] Signature mismatches between documentation and code
- [ ] Export mismatches (documented as exported but is internal, or vice versa)
- [ ] Type annotation mismatches
- [ ] Method visibility mismatches (static vs instance, public vs private)

### Needs Investigation

- [ ] Items that require clarification of behavior
- [ ] Items with unclear ownership/responsibility
- [ ] Items that may be deprecated or scheduled for removal
- [ ] Items with incomplete implementations
- [ ] Items that depend on features not yet implemented

---

## Phase 7: Missing Type Definitions - EquipmentRarity & EquipmentType

**Objective**: Fix the discrepancy where `EquipmentRarity` and `EquipmentType` are documented as separate types but only exist as inline unions in the code.

### Research Findings

During Phase 2 Task 2.1 verification, the following discrepancies were discovered:

1. **`type EquipmentRarity`** - Documented as a separate type but not defined
   - Currently exists only as inline union: `'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'`
   - Used in `EnhancedEquipment.rarity` at line 75

2. **`type EquipmentType`** - Documented as a separate type but not defined
   - Currently exists only as inline union: `'weapon' | 'armor' | 'item'`
   - Used in `EnhancedEquipment.type` at line 74

### Resolution Approach

Create the missing types as proper type definitions in `src/core/types/Equipment.ts` and update `EnhancedEquipment` to use them. This improves:
- Code maintainability (single source of truth)
- Type reusability across the codebase
- Consistency with documentation

### Task 7.1: Add EquipmentRarity Type Definition

- [x] Add `export type EquipmentRarity` to src/core/types/Equipment.ts
- [x] Include all five rarity values: 'common', 'uncommon', 'rare', 'very_rare', 'legendary'
- [x] Update `EnhancedEquipment.rarity` to use the `EquipmentRarity` type
- [x] Verify no breaking changes to existing code

### Task 7.2: Add EquipmentType Type Definition

- [x] Add `export type EquipmentType` to src/core/types/Equipment.ts
- [x] Include all three type values: 'weapon', 'armor', 'item'
- [x] Update `EnhancedEquipment.type` to use the `EquipmentType` type
- [x] Verify no breaking changes to existing code

### Task 7.3: Verify Type Exports

- [x] Ensure new types are exported from Equipment.ts
- [x] Verify types are available through package exports
- [x] Run build to ensure no TypeScript errors (Build successful - 753ms)

---

## Phase 8: Documentation Path Correction - SeededRNG

**Objective**: Fix the discrepancy where `SeededRNG` was documented at the wrong path.

### Research Findings

During Phase 1 verification, the following discrepancy was discovered:

1. **`SeededRNG` class location** - Documented as `src/core/randomness/SeededRNG.ts` but actually located at `src/utils/random.ts`

### Resolution Approach

Since the class is already correctly implemented and likely imported throughout the codebase from `src/utils/random.ts`, the correct fix is to update the documentation to reflect the actual location rather than moving the file.

### Task 8.1: Update Documentation Path References

- [x] Update Task 1.1 file path reference from `src/core/randomness/SeededRNG.ts` to `src/utils/random.ts`
- [x] Update Task 3.6 class path reference from `src/core/randomness/SeededRNG.ts` to `src/utils/random.ts`
- [x] Update Phase 6 discrepancy note to mark as resolved
- [x] Fix import examples in EQUIPMENT_SYSTEM.md (2 occurrences updated from `./src/core/randomness/SeededRNG.js` to `./src/utils/random.js`)

---

## Completion Checklist

- [x] Phase 1: All files exist, all exports verified
- [x] Phase 2: All types and interfaces verified (COMPLETE - All 5 tasks done)
- [x] Phase 3: All classes and methods verified (COMPLETE - All 6 tasks done)
- [x] Phase 4: Integration points verified (COMPLETE - All 3 tasks done)
- [x] Phase 5: Detailed signature verification complete (COMPLETE - All 10 items verified)
- [ ] Phase 6: All discrepancies documented and categorized
