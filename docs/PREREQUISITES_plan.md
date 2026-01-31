# PREREQUISITES.md - Documentation Verification Plan

## Important Note on Plan Evolution

If any additional problems with the code are discovered where the documentation and code don't match:

1. **Add a new phase** to the end of this plan
2. **Research the tasks** required to investigate and document the discrepancy
3. **Write the new phase and tasks** into this plan with checkboxes
4. **Fix the problem with the code** only when you reach that phase during execution

This approach ensures all issues are tracked systematically before fixes are implemented.

---

## Executive Summary

**Goal**: Verify that every documented item in `PREREQUISITES.md` actually exists in the codebase and is correctly described.

**Documentation File**: [PREREQUISITES.md](PREREQUISITES.md)

**Scope**: This plan validates the prerequisite system documentation covering:
- Skill prerequisites (`SkillPrerequisite`, `CustomSkill`)
- Spell prerequisites (`SpellPrerequisite`, `Spell`)
- Feature prerequisites (`FeaturePrerequisite`, `ValidationResult`)
- Validator classes (`SkillValidator`, `SpellValidator`)
- Registry classes (`FeatureRegistry`, `SkillRegistry`)
- Extension system (`ExtensionManager`)
- Public API exports

**Verification Approach**:
1. **Phase 1**: Verify all type definitions match their implementations
2. **Phase 2**: Verify all validator classes and methods exist with correct signatures
3. **Phase 3**: Verify all registry classes and methods exist with correct signatures
4. **Phase 4**: Verify helper functions are properly exported
5. **Phase 5**: Verify public API exports from main package
6. **Phase 6**: Resolve discrepancies and investigate inconsistencies
7. **Phase 7**: Test code examples from documentation

---

## Phase 1: Type Definitions Verification

Verify all prerequisite type definitions exist with correct properties and types.

### Task 1.1: Verify SkillPrerequisite Interface

**Documentation**: [PREREQUISITES.md:50-76](PREREQUISITES.md#L50-L76)
**Implementation**: `src/core/skills/SkillTypes.ts:25-49`

#### Properties
- [x] `level?: number` exists at line 27
- [x] `abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>` exists at line 30
- [x] `class?: Class` exists at line 33
- [x] `race?: Race` exists at line 36
- [x] `skills?: string[]` exists at line 39
- [x] `features?: string[]` exists at line 42
- [x] `spells?: string[]` exists at line 45
- [x] `custom?: string` exists at line 48

#### Export Verification
- [x] Exported as `export interface SkillPrerequisite`
- [x] `Class` and `Race` types imported from `../types/Character.js`

---

### Task 1.2: Verify CustomSkill Interface

**Documentation**: [PREREQUISITES.md:80-96](PREREQUISITES.md#L80-L96)
**Implementation**: `src/core/skills/SkillTypes.ts:57-131`

#### Properties
- [x] `id: string` exists at line 63
- [x] `name: string` exists at line 68
- [x] `description?: string` exists at line 73
- [x] `ability: Ability` exists at line 78
- [x] `armorPenalty?: boolean` exists at line 85
- [x] `customProperties?: Record<string, string | number | boolean | string[]>` exists at line 92
- [x] `categories?: string[]` exists at line 99
- [x] `source: 'default' | 'custom'` exists at line 106
- [x] `tags?: string[]` exists at line 113
- [x] `lore?: string` exists at line 118
- [x] `prerequisites?: SkillPrerequisite` exists at line 130

#### Export Verification
- [x] Exported as `export interface CustomSkill`

---

### Task 1.3: Verify SpellPrerequisite Interface

**Documentation**: [PREREQUISITES.md:137-162](PREREQUISITES.md#L137-L162)
**Implementation**: `src/utils/constants.ts:873-900`

#### Properties
- [x] `level?: number` exists at line 875
- [x] `casterLevel?: number` exists at line 878
- [x] `abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>` exists at line 881
- [x] `class?: string` exists at line 884
- [x] `features?: string[]` exists at line 890
- [x] `spells?: string[]` exists at line 893
- [x] `skills?: string[]` exists at line 896
- [x] `custom?: string` exists at line 899
- [x] **FOUND**: `race?: string` exists at line 887 (undocumented - see Task 6.6)

#### Export Verification
- [x] Exported as `export interface SpellPrerequisite`
- [x] **NOTE**: `class` property is typed as `string`, not `Class` (unlike SkillPrerequisite)

---

### Task 1.4: Verify Spell Interface

**Documentation**: [PREREQUISITES.md:167-183](PREREQUISITES.md#L167-L183)
**Implementation**: `src/core/spells/SpellValidator.ts:57-74`

#### Properties
- [x] `id?: string` exists at line 59
- [x] `name: string` exists at line 61
- [x] `level: number` exists at line 62
- [x] `school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation'` exists at line 63
- [x] `casting_time: string` exists at line 64
- [x] `range: string` exists at line 65
- [x] `components: string[]` exists at line 66
- [x] `duration: string` exists at line 67
- [x] `description?: string` exists at line 70
- [x] `prerequisites?: SpellPrerequisite` exists at line 73

#### Export Verification
- [x] Exported as `export interface Spell` at line 57

---

### Task 1.5: Verify FeaturePrerequisite Interface

**Documentation**: [PREREQUISITES.md:226-254](PREREQUISITES.md#L226-L254)
**Implementation**: `src/core/features/FeatureTypes.ts:68-95`

#### Properties
- [x] `level?: number` exists at line 70
- [x] `features?: string[]` exists at line 73
- [x] `abilities?: Partial<Record<Ability, number>>` exists at line 76
- [x] `class?: Class` exists at line 79
- [x] `race?: Race` exists at line 82
- [x] `subrace?: string` exists at line 85
- [x] `skills?: string[]` exists at line 88
- [x] `spells?: string[]` exists at line 91
- [x] `custom?: string` exists at line 94

#### Export Verification
- [x] Exported as `export interface FeaturePrerequisite`
- [x] `Class`, `Race`, and `Ability` types imported from `../types/Character.js`

---

### Task 1.6: Verify ValidationResult Interface

**Documentation**: [PREREQUISITES.md:303-314](PREREQUISITES.md#L303-L314)
**Implementation**: `src/core/features/FeatureTypes.ts:239-248`

#### Properties
- [x] `valid: boolean` exists at line 241
- [x] `unmet?: string[]` exists at line 244
- [x] `errors?: string[]` exists at line 247

#### Export Verification
- [x] Exported as `export interface ValidationResult`
- [x] **NOTE**: There are actually THREE different ValidationResult types:
  1. `FeatureTypes.ts:239` - has `valid`, `unmet?`, `errors?` (used by FeatureRegistry)
  2. `ExtensionManager.ts:143` - has `valid`, `errors?` (used by ExtensionManager)
  3. `PrerequisiteValidator.ts:75` - has `valid`, `errors` (required, used by shared validator)
- [x] **NOTE**: `SkillValidationResult` (SkillTypes.ts:241) has `valid`, `errors` (required)
- [x] **NOTE**: `SpellValidationResult` (SpellValidator.ts:47) has `valid`, `errors` (required)

#### **IMPORTANT FINDING - Documentation Issue**:
The documentation example at PREREQUISITES.md:334 shows:
```typescript
if (!result.valid) {
    console.log('Unmet prerequisites:', result.unmet);
}
```

However, **only `FeatureRegistry.validatePrerequisites()` returns a result with `unmet` property**.
- `SkillValidator.validateSkillPrerequisites()` returns `SkillValidationResult` which only has `errors`
- `SpellValidator.validateSpellPrerequisites()` returns `SpellValidationResult` which only has `errors`

The shared `PrerequisiteValidator.validatePrerequisites()` also returns `ValidationResult` with only `valid` and `errors` (no `unmet`).

**See Task 6.2** for resolution of this discrepancy.

---

## Phase 2: Validator Classes Verification

Verify all validator classes and their methods exist with correct signatures.

### Task 2.1: Verify SkillValidator Class

**Documentation**: [PREREQUISITES.md:522-525](PREREQUISITES.md#L522-L525)
**Implementation**: `src/core/skills/SkillValidator.ts:41-437`

#### Class Verification
- [x] Class `SkillValidator` exists at line 41
- [x] Exported as `export class SkillValidator`

#### Method Verification
- [x] `validateSkillPrerequisites(prerequisites: SkillPrerequisite | undefined, character: CharacterSheet): SkillValidationResult` exists at lines 355-360
- [x] Method is static at line 355

#### Export Verification
- [x] Exported from `src/core/skills/index.ts:27`
- [x] Exported from `src/index.ts:299` (note: plan listed 296, actual is 299)

---

### Task 2.2: Verify SpellValidator Class

**Documentation**: [PREREQUISITES.md:526-530](PREREQUISITES.md#L526-L530)
**Implementation**: `src/core/spells/SpellValidator.ts:83-259`

#### Class Verification
- [x] Class `SpellValidator` exists at line 83
- [x] Exported as `export class SpellValidator`

#### Method Verification
- [x] `validateSpellPrerequisites(prerequisites: SpellPrerequisite | undefined, character: CharacterSheet): SpellValidationResult` exists at lines 221-226
- [x] `validateSpell(spell: unknown): SpellValidationResult` exists at lines 92-167
- [x] Methods are static (all methods use `static` keyword)

#### Export Verification
- [x] Exported from `src/core/spells/index.ts:10`
- [x] Exported from `src/index.ts:330` (note: plan listed 327, actual is 330)

---

## Phase 3: Registry Classes Verification

Verify all registry classes and their methods exist with correct signatures.

### Task 3.1: Verify FeatureRegistry Class

**Documentation**: [PREREQUISITES.md:531-536](PREREQUISITES.md#L531-L536)
**Implementation**: `src/core/features/FeatureRegistry.ts:31-572`

#### Class Verification
- [x] Class `FeatureRegistry` exists at line 31
- [x] Exported as `export class FeatureRegistry`

#### Static Methods
- [x] `getInstance(): FeatureRegistry` exists at lines 49-54
- [x] `validatePrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): ValidationResult` exists at lines 286-374 (note: instance method, not static - documentation doesn't specify so this is correct)
- [ ] ~~`meetsPrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean`~~ **DOES NOT EXIST** - See Phase 6 Task 6.1 (alternative: `canGainFeature` exists at lines 400-403)
- [x] `getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[]` exists at lines 221-224

#### Instance Methods
- [x] `registerClassFeature(feature: ClassFeature): void` exists at lines 93-113
- [x] `registerRacialTrait(trait: RacialTrait): void` exists at lines 132-152

#### Export Verification
- [x] Exported from `src/index.ts:269` (note: plan listed 266, actual is 269)

---

### Task 3.2: Verify SkillRegistry Class

**Documentation**: [PREREQUISITES.md:537-540](PREREQUISITES.md#L537-L540)
**Implementation**: `src/core/skills/SkillRegistry.ts:29-402`

#### Class Verification
- [ ] Class `SkillRegistry` exists
- [ ] Exported as `export class SkillRegistry`

#### Static Methods
- [ ] `getInstance(): SkillRegistry` exists at lines 51-56

#### Instance Methods
- [ ] `validatePrerequisites(skill: CustomSkill, character: CharacterSheet): SkillValidationResult` exists at lines 266-271
- [ ] `registerSkill(skill: CustomSkill): void` exists at lines 86-117

#### Export Verification
- [ ] Exported from `src/core/skills/index.ts:20`
- [ ] Exported from `src/index.ts:295`

---

## Phase 4: Extension System Verification

Verify ExtensionManager class and helper functions.

### Task 4.1: Verify ExtensionManager Class

**Documentation**: [PREREQUISITES.md:541-544](PREREQUISITES.md#L541-L544)
**Implementation**: `src/core/extensions/ExtensionManager.ts:158-757`

#### Class Verification
- [ ] Class `ExtensionManager` exists
- [ ] Exported as `export class ExtensionManager`

#### Static Methods
- [ ] `getInstance(): ExtensionManager` exists at lines 173-178

#### Instance Methods
- [ ] `register(category: ExtensionCategory, items: any[], options?: ExtensionOptions): void` exists at lines 204-311

#### Export Verification
- [ ] Exported from `src/index.ts:342`

---

### Task 4.2: Verify Helper Functions

**Documentation**: [PREREQUISITES.md:345-348](PREREQUISITES.md#L345-L348)

#### Spell Helper Function
- [ ] `validateSpellPrerequisites(prerequisites: SpellPrerequisite | undefined, character: CharacterSheet): SpellValidationResult` exists at `src/core/spells/SpellValidator.ts:495-500`
- [ ] Exported from `src/core/spells/index.ts:10`
- [ ] Exported from `src/index.ts:335`

#### Skill Helper Function
- [ ] `validateSkillPrerequisites(prerequisites: SkillPrerequisite | undefined, character: CharacterSheet): SkillValidationResult` exists at `src/core/skills/SkillValidator.ts:519-524`
- [ ] Exported from `src/core/skills/index.ts:33`
- [ ] Exported from `src/index.ts:305`

---

## Phase 5: Public API Exports Verification

Verify all documented items are exported from the main package.

### Task 5.1: Verify Type Exports from src/index.ts

- [ ] `SkillPrerequisite` type - Line 105
- [ ] `CustomSkill` type - Line 104
- [ ] `FeaturePrerequisite` type - Line 97
- [ ] `ClassFeature` type - Line 94
- [ ] `RacialTrait` type - Line 95
- [ ] `SpellPrerequisite` type - Line 114
- [ ] `Spell` type - Line 115
- [ ] `ValidationResult` type - Line 112 (from ExtensionManager)

### Task 5.2: Verify Class Exports from src/index.ts

- [ ] `SkillValidator` - Line 296
- [ ] `SpellValidator` - Line 327
- [ ] `FeatureRegistry` - Line 266
- [ ] `SkillRegistry` - Line 295
- [ ] `ExtensionManager` - Line 342

### Task 5.3: Verify Function Exports from src/index.ts

- [ ] `validateSkillPrerequisites` - Line 305
- [ ] `validateSpellPrerequisites` - Line 335

---

## Phase 6: Discrepancies & Issues Resolution

Address all discrepancies found during verification.

### Task 6.1: Missing `meetsPrerequisites` Method

**Status**: CRITICAL - Documentation is incorrect

- [ ] **Issue**: Documentation at lines 534 and 360 references `FeatureRegistry.meetsPrerequisites(feature, character): boolean`
- [ ] **Actual**: Method does NOT exist in the codebase
- [ ] **Alternative**: `FeatureRegistry.canGainFeature(feature, character): boolean` exists at lines 379-382
- [ ] **Resolution Options**:
  - [ ] Option A: Add `meetsPrerequisites` as an alias method
  - [ ] Option B: Update documentation to reference `canGainFeature`
  - [ ] Option C: Both (add alias and update docs)

---

### Task 6.2: ValidationResult Type Variants

**Status**: MEDIUM - Documentation may be confusing

- [ ] **Issue**: Documentation shows generic `ValidationResult`, but codebase has three types:
  - `ValidationResult` (FeatureTypes.ts) - used by FeatureRegistry
  - `SkillValidationResult` (SkillTypes.ts) - used by SkillValidator
  - `SpellValidationResult` (SpellValidator.ts) - used by SpellValidator
- [ ] **Investigation**: Compare the shapes of these three types
- [ ] **Resolution Options**:
  - [ ] Option A: Standardize all to `ValidationResult`
  - [ ] Option B: Document which type each validator returns
  - [ ] Option C: Create a generic `PrerequisiteValidationResult` type

---

### Task 6.3: SpellPrerequisite Location

**Status**: LOW - Minor organizational issue

- [ ] **Issue**: `SpellPrerequisite` is defined in `src/utils/constants.ts:873` instead of with spell types
- [ ] **Impact**: May confuse developers looking for spell-related types
- [ ] **Resolution Options**:
  - [ ] Option A: Move to `src/core/spells/` directory
  - [ ] Option B: Add a comment directing to its location
  - [ ] Option C: Re-export from `src/core/spells/index.ts`

---

### Task 6.4: Class Type Inconsistency in Prerequisites

**Status**: LOW - Type consistency issue

- [ ] **Issue**: `SpellPrerequisite.class?: string` uses plain string, while `SkillPrerequisite.class?: Class` and `FeaturePrerequisite.class?: Class` use the `Class` type
- [ ] **Investigation**: Determine why this difference exists
- [ ] **Resolution Options**:
  - [ ] Option A: Change `SpellPrerequisite.class` to `Class` type for consistency
  - [ ] Option B: Change all to use `string` for flexibility
  - [ ] Option C: Document the reason for the difference

---

### Task 6.5: Undocumented FeatureRegistry Methods

**Status**: LOW - Missing documentation

- [ ] **Issue**: These static methods exist but are not documented in PREREQUISITES.md:
  - `FeatureRegistry.getEquipmentFeatures(equipmentName: string): ClassFeature[]` - Line 468
  - `FeatureRegistry.isValidEquipmentFeature(featureId: string): boolean` - Line 498
  - `FeatureRegistry.registerEquipmentFeature(feature: ClassFeature): void` - Line 522
- [ ] **Investigation**: Should these be in PREREQUISITES.md or equipment documentation?
- [ ] **Resolution**: Decide on appropriate documentation location

---

### Task 6.6: Race Property in SpellPrerequisite

**Status**: ✅ RESOLVED - Property exists but is undocumented

- [x] **Issue**: Documentation examples may reference `race` property for `SpellPrerequisite`
- [x] **Action**: Verify if `race?: string` exists in `SpellPrerequisite` interface
- [x] **File**: `src/utils/constants.ts:873-900`
- [x] **Finding**: The `race?: string` property EXISTS at line 887 in `constants.ts` but is NOT documented in `PREREQUISITES.md:137-162`
- [ ] **Resolution Needed**: Add `race?: string` property to PREREQUISITES.md documentation at line ~148 (after `class?: string`)

---

## Phase 7: Code Examples Testing

Test all code examples from the documentation to ensure they work as written.

### Task 7.1: Test Skill with Prerequisites Example

**Documentation**: [PREREQUISITES.md:108-126](PREREQUISITES.md#L108-L126)

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const dragonSmithing = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT' as const,
    prerequisites: {
        features: ['draconic_bloodline'],
        level: 5,
        class: 'Sorcerer' as const
    },
    source: 'custom' as const
};

SkillRegistry.getInstance().registerSkill(dragonSmithing);
```

- [ ] Run example code
- [ ] Verify skill registers without errors
- [ ] Verify prerequisite validation works correctly

---

### Task 7.2: Test Spell with Prerequisites Example

**Documentation**: [PREREQUISITES.md:196-215](PREREQUISITES.md#L196-L215)

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const dragonBreath = {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation' as const,
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy',
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
};

ExtensionManager.getInstance().register('spells', [dragonBreath]);
```

- [ ] Run example code
- [ ] Verify spell registers without errors
- [ ] Verify prerequisite validation works correctly

---

### Task 7.3: Test Feature with Skill Prerequisite Example

**Documentation**: [PREREQUISITES.md:273-293](PREREQUISITES.md#L273-L293)

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const arcaneMastery = {
    id: 'arcane_mastery',
    name: 'Arcane Mastery',
    description: 'Bonus to spellcasting based on Arcana skill',
    type: 'passive' as const,
    level: 10,
    class: 'Wizard' as const,
    prerequisites: {
        skills: ['arcana'],
        level: 10
    },
    effects: [
        { type: 'passive_modifier' as const, target: 'spell_save_dc', value: 1 }
    ],
    source: 'custom' as const
};

FeatureRegistry.getInstance().registerClassFeature(arcaneMastery);
```

- [ ] Run example code
- [ ] Verify feature registers without errors
- [ ] Verify prerequisite validation works correctly

---

### Task 7.4: Test Complete Dragon-Themed Content Example

**Documentation**: [PREREQUISITES.md:369-445](PREREQUISITES.md#L369-L445)

- [ ] Run complete example
- [ ] Verify all components register successfully
- [ ] Verify integration between skills, spells, and features

---

## Cross-Module Dependencies

Verify type imports across modules are correct.

### Type Imports Verification

- [ ] `SkillPrerequisite` → imports `Class`, `Race` from `../types/Character.js` → `src/core/skills/SkillTypes.ts:10`
- [ ] `FeaturePrerequisite` → imports `Class`, `Race`, `Ability` from `../types/Character.js` → `src/core/features/FeatureTypes.ts:13`
- [ ] `SpellPrerequisite` → no type imports (uses string literals) → `src/utils/constants.ts:873`
- [ ] `SkillValidator` → imports `CharacterSheet` from `../types/Character.js` → `src/core/skills/SkillValidator.ts:15`
- [ ] `SpellValidator` → imports `CharacterSheet` from `../types/Character.js` → `src/core/spells/SpellValidator.ts:15`
- [ ] `FeatureRegistry` → imports `CharacterSheet` from `../types/Character.js` → `src/core/features/FeatureRegistry.ts:16`

---

## Quick Reference Summary

### Verified Items Counters

| Category | Total | Verified |
|----------|-------|----------|
| Core Interfaces | 6 | 6 |
| Supporting Interfaces | 0 | 0 |
| Validator Classes | 2 | 1 |
| Registry Classes | 2 | 0 |
| Extension Classes | 1 | 0 |
| Helper Functions | 2 | 0 |
| Public API Exports | 14 | 0 |

### Critical Discrepancies

| ID | Issue | Status |
|----|-------|--------|
| D1 | `meetsPrerequisites` method missing | Critical |
| D2 | Multiple ValidationResult types | Medium |
| D2a | `unmet` property missing from Skill/Spell validation results | Medium |
| D3 | SpellPrerequisite in constants file | Low |
| D4 | Class type inconsistency | Low |
| D5 | Undocumented FeatureRegistry methods | Low |

### Completion Checklist

#### Phase Completion
- [x] Phase 1: Type Definitions (All 6 tasks verified)
- [ ] Phase 2: Validator Classes
- [ ] Phase 3: Registry Classes
- [ ] Phase 4: Extension System
- [ ] Phase 5: Public API Exports
- [ ] Phase 6: Discrepancies Resolution
- [ ] Phase 7: Code Examples Testing

#### Overall Completion
- [ ] All phases complete
- [ ] All discrepancies resolved
- [ ] All examples tested
- [ ] Documentation updated (if needed)
