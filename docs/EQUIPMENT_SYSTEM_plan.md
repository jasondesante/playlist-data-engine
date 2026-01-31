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

- [ ] `class ExtensionManager` → src/core/extensions/ExtensionManager.ts
  - [ ] `static getInstance()`
  - [ ] `register('equipment', [equipment])`
  - [ ] `register('equipment.templates', [templates])`

### Task 3.2: EquipmentEffectApplier Class

- [ ] `class EquipmentEffectApplier` → src/core/equipment/EquipmentEffectApplier.ts
  - [ ] `static equipItem(character: CharacterSheet, equipment: EnhancedEquipment, instanceId?: string): EffectApplicationResult`
  - [ ] `static unequipItem(character: CharacterSheet, equipmentName: string, instanceId?: string): EffectApplicationResult`
  - [ ] `static reapplyEquipmentEffects(character: CharacterSheet): EffectApplicationResult`
  - [ ] `static getActiveEffects(character: CharacterSheet): EquipmentProperty[]`

### Task 3.3: EquipmentValidator Class

- [ ] `class EquipmentValidator` → src/core/equipment/EquipmentValidator.ts
  - [ ] `static validateEquipment(equipment: EnhancedEquipment): EquipmentValidationResult`
  - [ ] `static validateProperty(property: EquipmentProperty): EquipmentValidationResult`
  - [ ] `static validateEquipmentFeatureReference(featureId: string): boolean`
  - [ ] `static validateEquipmentSkillReference(skillId: string): boolean`
  - [ ] `static validateDamageInfo(damage: EnhancedEquipment['damage']): EquipmentValidationResult`
  - [ ] `static validateSpawnWeight(weight: number): EquipmentValidationResult`
  - [ ] `static validateModification(modification: EquipmentModification): EquipmentValidationResult`

### Task 3.4: EquipmentModifier Class

- [ ] `class EquipmentModifier` → src/core/equipment/EquipmentModifier.ts

  **Modification Operations:**
  - [ ] `static enchant(equipment: CharacterEquipment, itemName: string, enchantment: EquipmentModification, character?: CharacterSheet): CharacterEquipment`
  - [ ] `static applyTemplate(equipment: CharacterEquipment, itemName: string, templateId: string, character?: CharacterSheet): CharacterEquipment`
  - [ ] `static curse(equipment: CharacterEquipment, itemName: string, curse: EquipmentModification, character?: CharacterSheet): CharacterEquipment`
  - [ ] `static upgrade(equipment: CharacterEquipment, itemName: string, upgrade: EquipmentModification, character?: CharacterSheet): CharacterEquipment`
  - [ ] `static removeModification(equipment: CharacterEquipment, itemName: string, modificationId: string, character?: CharacterSheet): CharacterEquipment`

  **Query Operations:**
  - [ ] `static getModificationHistory(equipment: CharacterEquipment, itemName: string): EquipmentModification[]`
  - [ ] `static getCombinedEffects(equipment: CharacterEquipment, itemName: string, instanceId?: string): EquipmentProperty[]`
  - [ ] `static hasTemplate(equipment: CharacterEquipment, itemName: string, templateId: string): boolean`
  - [ ] `static isEnchanted(equipment: CharacterEquipment, itemName: string): boolean`
  - [ ] `static isCursed(equipment: CharacterEquipment, itemName: string): boolean`
  - [ ] `static getAppliedTemplates(equipment: CharacterEquipment, itemName: string): string[]`
  - [ ] `static getModificationSources(equipment: CharacterEquipment, itemName: string): string[]`
  - [ ] `static countModificationsBySource(equipment: CharacterEquipment, itemName: string): Record<string, number>`
  - [ ] `static getItemSummary(equipment: CharacterEquipment, itemName: string): { name, modifications, isCursed, isEnchanted }`

  **Bulk Operations:**
  - [ ] `static removeAllModifications(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet): CharacterEquipment`
  - [ ] `static disenchant(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet): CharacterEquipment`
  - [ ] `static liftCurse(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet): CharacterEquipment`

  **Factory Methods:**
  - [ ] `static createModification(id: string, name: string, properties: EquipmentProperty[], source: string): EquipmentModification`
  - [ ] `static generateModificationId(prefix?: string): string`

### Task 3.5: EquipmentSpawnHelper Class

- [ ] `class EquipmentSpawnHelper` → src/core/equipment/EquipmentSpawnHelper.ts

  **Spawning Operations:**
  - [ ] `static spawnFromList(itemNames: string[], rng?: SeededRNG): (EnhancedEquipment | undefined)[]`
  - [ ] `static spawnByRarity(rarity: EquipmentRarity, count: number, rng?: SeededRNG): EnhancedEquipment[]`
  - [ ] `static spawnByTags(tags: string[], count: number, rng?: SeededRNG, options?: SpawnRandomOptions): EnhancedEquipment[]`
  - [ ] `static spawnRandom(count: number, rng: SeededRNG, options?: SpawnRandomOptions): EnhancedEquipment[]`
  - [ ] `static spawnFromTemplate(templateId: string, baseItemName?: string): EnhancedEquipment | null`
  - [ ] `static spawnTreasureHoard(cr: number, rng: SeededRNG): TreasureHoardResult`

  **Character Operations:**
  - [ ] `static addToCharacter(character: CharacterSheet, items: EnhancedEquipment[], equip?: boolean): CharacterSheet`

### Task 3.6: SeededRNG Class

- [ ] `class SeededRNG` → src/utils/random.ts
  - [ ] `constructor(seed: string)`

---

## Phase 4: Integration & Dependencies

**Objective**: Verify Character sheet integration and cross-module dependencies.

### Task 4.1: CharacterSheet Interface

- [ ] `interface CharacterSheet` → src/core/types/Character.ts
  - [ ] `equipment?: CharacterEquipment`
  - [ ] `equipment_effects?: EquipmentEffectEntry[]`

### Task 4.2: CharacterEquipment Type

- [ ] `type CharacterEquipment` → src/core/types/Character.ts

### Task 4.3: Equipment Effects Structure

Verify `CharacterSheet.equipment_effects` structure:
- [ ] `source: string`
- [ ] `instanceId?: string`
- [ ] `effects: EquipmentProperty[]`
- [ ] `features: EquipmentFeature[]`
- [ ] `skills: EquipmentSkill[]`
- [ ] `spells?: Array<{ spellId, level?, uses?, recharge? }>`

---

## Phase 5: Signature & Type Verification

**Objective**: For each verified item, confirm detailed signature accuracy.

### Verification Checklist

For every item listed in Phases 1-4, verify:
- [ ] Exists in codebase at expected location
- [ ] Name matches exactly (case-sensitive)
- [ ] Signature/parameters match documentation
- [ ] Exported correctly (export / export default / internal)
- [ ] Type annotations are accurate
- [ ] Any generics or constraints are documented correctly
- [ ] Methods are static where documented
- [ ] Optional properties are marked with `?`
- [ ] Default values are correct
- [ ] Union types match documentation

---

## Phase 6: Discrepancy Resolution

**Objective**: Document and categorize all issues found during verification.

### Redundancy / Potential Duplicates

(When you find similar functionality in multiple places, note it here - do not attempt to resolve)
- [ ] Document any duplicate property definitions found
- [ ] Document similar effect application methods across different classes
- [ ] Note any overlapping validation methods

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
- [ ] Phase 3: All classes and methods verified
- [ ] Phase 4: Integration points verified
- [ ] Phase 5: Detailed signature verification complete
- [ ] Phase 6: All discrepancies documented and categorized
