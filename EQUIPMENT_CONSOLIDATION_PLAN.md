# Equipment System Consolidation Plan

## Overview

This plan consolidates all equipment-related constants into a single file and converts `enchantmentLibrary.ts` to a static utility class matching the project's class-based pattern.

**Goal**: Single source of truth for all equipment constants, with class-based functions for easy importing.

---

## User Decisions Applied

1. **Enchantment Naming**: Remove redundant prefixes
   - `ENCHANTMENT_PLUS_ONE` → `PLUS_ONE`
   - Access: `ENCHANTMENT_LIBRARY.ENCHANTMENTS.PLUS_ONE` or `ENCHANTMENT_LIBRARY.CURSES.BERSERKER`

2. **Template Naming**: Use `ITEM_CREATION_TEMPLATES` (more descriptive than `ENCHANTMENT_TEMPLATES`)

3. **CLASS_STARTING_EQUIPMENT**: Move to equipmentConstants.ts, but add thorough research phase first

4. **EnchantmentLibrary Class API**: Use existing functions only, no static properties for direct access
   - Lookup: `EnchantmentLibrary.getEnchantment('PLUS_ONE')`
   - Direct access: Import `ENCHANTMENT_LIBRARY` from equipmentConstants

---

## Current State Analysis

### Files Involved

| File | Content | Lines |
|------|---------|-------|
| `src/utils/constants.ts` | `EQUIPMENT_DATABASE` (201 items), `CLASS_STARTING_EQUIPMENT` | ~450 |
| `src/utils/magicItemExamples.ts` | `MAGIC_ITEM_EXAMPLES` (34 items), `MAGIC_EQUIPMENT_TEMPLATES` (11 templates), helper functions | ~500 |
| `src/utils/enchantmentLibrary.ts` | 40+ enchantment/curses constants, factory functions, utility functions | ~400 |

### Import Locations (Files That Will Be Updated)

**From `constants.ts`:**
- `src/core/combat/CombatEngine.ts` - Uses `EQUIPMENT_DATABASE`
- `src/core/generation/EquipmentGenerator.ts` - Uses `EQUIPMENT_DATABASE` and `CLASS_STARTING_EQUIPMENT`
- `src/core/extensions/initializeDefaults.ts` - Uses `EQUIPMENT_DATABASE`
- `tests/unit/equipmentGenerator.test.ts` - Uses both constants
- `tests/unit/extensionManager.test.ts` - Uses `EQUIPMENT_DATABASE`

**From `magicItemExamples.ts`:**
- `src/index.ts` - Exports magic item helper functions
- `src/core/equipment/EquipmentSpawnHelper.ts` - Uses `MAGIC_EQUIPMENT_TEMPLATES`

**From `enchantmentLibrary.ts`:**
- `src/index.ts` - Exports enchantment functions (only direct import)

### Test Files to Update

- `tests/unit/equipmentSpawnHelper.test.ts`
- `tests/unit/equipmentGenerator.test.ts`
- `tests/integration/equipmentSystem.integration.test.ts`
- `tests/unit/equipmentModifier.test.ts`
- `tests/unit/equipmentEffectApplier.test.ts`
- `tests/unit/equipmentValidator.test.ts`

---

## Phase 0: Research CLASS_STARTING_EQUIPMENT Dependencies

**Goal**: Ensure moving `CLASS_STARTING_EQUIPMENT` won't break anything. Thoroughly investigate all usages.

### Task 1: Identify all files using CLASS_STARTING_EQUIPMENT
- [ ] Search codebase for all imports of `CLASS_STARTING_EQUIPMENT`
- [ ] Search for all imports of `getClassStartingEquipment` function
- [ ] Document every file that references these exports
- [ ] Check for any string-based references (like dynamic property access)

### Task 2: Analyze CLASS_STARTING_EQUIPMENT usage patterns
- [ ] Read `src/core/generation/EquipmentGenerator.ts` to understand how it's used
- [ ] Check if `CLASS_STARTING_EQUIPMENT` is used during character creation
- [ ] Check if it's used during character level-up
- [ ] Check if it's used in any serialization/deserialization
- [ ] Look for any JSON schema that references this structure

### Task 3: Check for related type dependencies
- [ ] Search for TypeScript types that reference the class starting equipment structure
- [ ] Check if any interfaces expect the specific property names (`weapons`, `armor`, `items`)
- [ ] Look for any validation schemas that validate this structure
- [ ] Check for any documentation that describes the structure location

### Task 4: Check test file dependencies
- [ ] Review all test files that use `CLASS_STARTING_EQUIPMENT`
- [ ] Check if any tests mock or stub this constant
- [ ] Check if any tests rely on the specific location in `constants.ts`
- [ ] Document any test fixtures that need updating

### Task 5: Check for circular dependency risks
- [ ] Verify `equipmentConstants.ts` won't create circular imports
- [ ] Check if `constants.ts` imports from equipment-related files
- [ ] Ensure import order won't cause initialization issues
- [ ] Test import chain manually if needed

### Task 6: Document findings and risks
- [ ] Create summary of all files that will be affected
- [ ] Identify any high-risk changes
- [ ] Document any assumptions about safe moves
- [ ] Update this plan if any new files are discovered

### Task 7: Verify no runtime lookups by name
- [ ] Search for any code that accesses constants via string keys
- [ ] Check ExtensionManager for any registration of this data
- [ ] Look for any configuration files that reference the path
- [ ] Check for any dynamic imports that might break

---

## Phase 1: Create Consolidated Constants File

**File**: `src/utils/equipmentConstants.ts`

### Task 8: Create file structure and add imports
- [ ] Create `src/utils/equipmentConstants.ts`
- [ ] Add necessary imports from types and existing files
- [ ] Add JSDoc header explaining the file's purpose

### Task 9: Move DEFAULT_EQUIPMENT from constants.ts
- [ ] Copy `EQUIPMENT_DATABASE` from `src/utils/constants.ts` (lines 1661-2108, ~450 lines)
- [ ] Rename to `DEFAULT_EQUIPMENT`
- [ ] Ensure all 201 equipment entries are included
- [ ] Verify types match `Equipment` interface

### Task 10: Move CLASS_STARTING_EQUIPMENT from constants.ts
- [ ] Copy `CLASS_STARTING_EQUIPMENT` from `src/utils/constants.ts`
- [ ] Keep same name and structure
- [ ] Include the `getClassStartingEquipment()` helper function
- [ ] Verify this is safe based on Phase 0 research

### Task 11: Move MAGIC_ITEMS from magicItemExamples.ts
- [ ] Copy `MAGIC_ITEM_EXAMPLES` from `src/utils/magicItemExamples.ts`
- [ ] Rename to `MAGIC_ITEMS`
- [ ] Ensure all 34 magic items are included
- [ ] Verify types match `EnhancedEquipment` interface

### Task 12: Move ITEM_CREATION_TEMPLATES from magicItemExamples.ts
- [ ] Copy `MAGIC_EQUIPMENT_TEMPLATES` from `src/utils/magicItemExamples.ts`
- [ ] Rename to `ITEM_CREATION_TEMPLATES` (more descriptive than ENCHANTMENT_TEMPLATES)
- [ ] Ensure all 11 templates are included:
  - `plus_one_weapon`, `plus_two_weapon`, `plus_three_weapon`
  - `flaming_weapon_template`, `frost_weapon_template`, `shocking_weapon_template`
  - `vicious_weapon_template`
  - `plus_one_armor`, `plus_two_armor`

### Task 13: Create ENCHANTMENT_LIBRARY sub-object with renamed constants

**IMPORTANT**: Remove redundant prefixes from constant names for cleaner access:
- `ENCHANTMENT_PLUS_ONE` → `PLUS_ONE` (access: `ENCHANTMENT_LIBRARY.ENCHANTMENTS.PLUS_ONE`)
- `CURSE_BERSERKER` → `BERSERKER` (access: `ENCHANTMENT_LIBRARY.CURSES.BERSERKER`)

- [ ] Create nested object structure:
  ```typescript
  export const ENCHANTMENT_LIBRARY = {
    ENCHANTMENTS: { ... },
    CURSES: { ... },
    COLLECTIONS: { ... }
  };
  ```

- [ ] Move and rename individual enchantment constants into `ENCHANTMENT_LIBRARY.ENCHANTMENTS`:
  - [ ] Enhancement enchantments:
    - [ ] `ENCHANTMENT_PLUS_ONE` → `PLUS_ONE`
    - [ ] `ENCHANTMENT_PLUS_ONE_ARMOR` → `PLUS_ONE_ARMOR`
    - [ ] `ENCHANTMENT_PLUS_TWO` → `PLUS_TWO`
    - [ ] `ENCHANTMENT_PLUS_TWO_ARMOR` → `PLUS_TWO_ARMOR`
    - [ ] `ENCHANTMENT_PLUS_THREE` → `PLUS_THREE`
  - [ ] Elemental enchantments:
    - [ ] `ENCHANTMENT_FLAMING` → `FLAMING`
    - [ ] `ENCHANTMENT_FROST` → `FROST`
    - [ ] `ENCHANTMENT_SHOCKING` → `SHOCKING`
    - [ ] `ENCHANTMENT_THUNDERING` → `THUNDERING`
    - [ ] `ENCHANTMENT_ACIDIC` → `ACIDIC`
    - [ ] `ENCHANTMENT_POISON` → `POISON`
    - [ ] `ENCHANTMENT_HOLY` → `HOLY`
  - [ ] Special weapon enchantments:
    - [ ] `ENCHANTMENT_VAMPIRIC` → `VAMPIRIC`
    - [ ] `ENCHANTMENT_VORPAL_EDGE` → `VORPAL_EDGE`
    - [ ] `ENCHANTMENT_KEEN_EDGE` → `KEEN_EDGE`
    - [ ] `ENCHANTMENT_MIGHTY` → `MIGHTY`
    - [ ] `ENCHANTMENT_RETURNING` → `RETURNING`
    - [ ] `ENCHANTMENT_LIFESTEALING` → `LIFESTEALING`
  - [ ] Resistance enchantments:
    - [ ] `ENCHANTMENT_FIRE_RESISTANCE` → `FIRE_RESISTANCE`
    - [ ] `ENCHANTMENT_COLD_RESISTANCE` → `COLD_RESISTANCE`
    - [ ] `ENCHANTMENT_LIGHTNING_RESISTANCE` → `LIGHTNING_RESISTANCE`
    - [ ] `ENCHANTMENT_ACID_RESISTANCE` → `ACID_RESISTANCE`
    - [ ] `ENCHANTMENT_POISON_RESISTANCE` → `POISON_RESISTANCE`
    - [ ] `ENCHANTMENT_NECROTIC_RESISTANCE` → `NECROTIC_RESISTANCE`
    - [ ] `ENCHANTMENT_RADIANT_RESISTANCE` → `RADIANT_RESISTANCE`
    - [ ] `ENCHANTMENT_THUNDER_RESISTANCE` → `THUNDER_RESISTANCE`
    - [ ] `ENCHANTMENT_ALL_RESISTANCE` → `ALL_RESISTANCE`
  - [ ] Combo enchantments:
    - [ ] `ENCHANTMENT_HOLY_AVENGER` → `HOLY_AVENGER`
    - [ ] `ENCHANTMENT_DRAGON_SLAYER` → `DRAGON_SLAYER`
    - [ ] `ENCHANTMENT_DEMON_HUNTER` → `DEMON_HUNTER`
    - [ ] `ENCHANTMENT_UNDEAD_BANE` → `UNDEAD_BANE`

- [ ] Move and rename curse constants into `ENCHANTMENT_LIBRARY.CURSES`:
  - [ ] Penalty curses:
    - [ ] `CURSE_MINUS_ONE` → `MINUS_ONE`
    - [ ] `CURSE_MINUS_TWO` → `MINUS_TWO`
  - [ ] Stat curses:
    - [ ] `CURSE_WEAKNESS` → `WEAKNESS`
    - [ ] `CURSE_FEEBLEMIND` → `FEEBLEMIND`
    - [ ] `CURSE_CLUMSINESS` → `CLUMSINESS`
    - [ ] `CURSE_FRAILTY` → `FRAILTY`
    - [ ] `CURSE_FOOLISHNESS` → `FOOLISHNESS`
    - [ ] `CURSE_REPULSIVENESS` → `REPULSIVENESS`
  - [ ] Vulnerability curses:
    - [ ] `CURSE_FIRE_VULNERABILITY` → `FIRE_VULNERABILITY`
    - [ ] `CURSE_COLD_VULNERABILITY` → `COLD_VULNERABILITY`
  - [ ] Special curses:
    - [ ] `CURSE_LIFESTEAL` → `LIFESTEAL`
    - [ ] `CURSE_ATTUNEMENT` → `ATTUNEMENT`
    - [ ] `CURSE_BERSERKER` → `BERSERKER`
    - [ ] `CURSE_HEAVY_BURDEN` → `HEAVY_BURDEN`
    - [ ] `CURSE_LIGHT_SENSITIVITY` → `LIGHT_SENSITIVITY`
    - [ ] `CURSE_INVISIBILITY` → `INVISIBILITY`
    - [ ] `CURSE_HALLUCINATIONS` → `HALLUCINATIONS`
    - [ ] `CURSE_BLOOD_MONEY` → `BLOOD_MONEY`

- [ ] Move collection constants into `ENCHANTMENT_LIBRARY.COLLECTIONS`:
  - [ ] `WEAPON_ENCHANTMENTS` (update to reference renamed constants)
  - [ ] `ARMOR_ENCHANTMENTS` (update to reference renamed constants)
  - [ ] `RESISTANCE_ENCHANTMENTS` (update to reference renamed constants)
  - [ ] `ALL_ENCHANTMENTS` (update to reference renamed constants)

### Task 14: Add named exports
- [ ] Export `DEFAULT_EQUIPMENT`
- [ ] Export `CLASS_STARTING_EQUIPMENT`
- [ ] Export `getClassStartingEquipment`
- [ ] Export `MAGIC_ITEMS`
- [ ] Export `ITEM_CREATION_TEMPLATES`
- [ ] Export `ENCHANTMENT_LIBRARY`

### Task 15: Verify file compiles
- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Fix any import or type issues

---

## Phase 2: Update Import References in Core Files

### Task 16: Update src/utils/constants.ts
- [ ] Remove `EQUIPMENT_DATABASE` constant (lines 1661-2108)
- [ ] Remove `CLASS_STARTING_EQUIPMENT` constant
- [ ] Remove `getClassStartingEquipment()` function
- [ ] Add comment indicating equipment moved to equipmentConstants.ts
- [ ] Keep all other constants (SPELL_DATABASE, DEFAULT_FEATURES, ability scores, etc.)

### Task 17: Update src/core/combat/CombatEngine.ts
- [ ] Change import from `import { EQUIPMENT_DATABASE } from '../../utils/constants'`
- [ ] To: `import { DEFAULT_EQUIPMENT } from '../../utils/equipmentConstants'`
- [ ] Update any references from `EQUIPMENT_DATABASE` to `DEFAULT_EQUIPMENT`

### Task 18: Update src/core/generation/EquipmentGenerator.ts
- [ ] Change imports from `constants.ts`:
  - [ ] `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`
  - [ ] `CLASS_STARTING_EQUIPMENT` → (keep same name)
- [ ] Update source file to `equipmentConstants.ts`
- [ ] Verify all references updated

### Task 19: Update src/core/extensions/initializeDefaults.ts
- [ ] Change import from `constants.ts`
- [ ] To: `equipmentConstants.ts`
- [ ] Update `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`

### Task 20: Update src/core/equipment/EquipmentSpawnHelper.ts
- [ ] Change import from `magicItemExamples.ts`
- [ ] To: `equipmentConstants.ts`
- [ ] Update `MAGIC_EQUIPMENT_TEMPLATES` → `ITEM_CREATION_TEMPLATES`

### Task 21: Update test files
- [ ] Update `tests/unit/equipmentGenerator.test.ts`:
  - [ ] Change imports to use `equipmentConstants.ts`
  - [ ] Update `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`
  - [ ] Update `CLASS_STARTING_EQUIPMENT` reference

- [ ] Update `tests/unit/extensionManager.test.ts`:
  - [ ] Change import to use `equipmentConstants.ts`
  - [ ] Update `EQUIPMENT_DATABASE` → `DEFAULT_EQUIPMENT`

- [ ] Update `tests/unit/equipmentSpawnHelper.test.ts`:
  - [ ] Change imports to use `equipmentConstants.ts`
  - [ ] Update template references to `ITEM_CREATION_TEMPLATES`

- [ ] Update `tests/integration/equipmentSystem.integration.test.ts`:
  - [ ] Review for any equipment constant imports
  - [ ] Update as needed

- [ ] Update `tests/unit/equipmentModifier.test.ts`:
  - [ ] Review for any enchantment library imports
  - [ ] Update as needed

- [ ] Update `tests/unit/equipmentEffectApplier.test.ts`:
  - [ ] Review for any equipment constant imports
  - [ ] Update as needed

- [ ] Update `tests/unit/equipmentValidator.test.ts`:
  - [ ] Review for any equipment constant imports
  - [ ] Update as needed

### Task 22: Verify all imports
- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Search for any remaining imports from old locations:
  - [ ] Search for `from './constants'` with `EQUIPMENT_DATABASE`
  - [ ] Search for `from './magicItemExamples'`
  - [ ] Search for `from './enchantmentLibrary'`
- [ ] Fix any remaining references

---

## Phase 3: Refactor enchantmentLibrary to EnchantmentLibrary Class

### Task 23: Rename file and create class structure
- [ ] Rename `src/utils/enchantmentLibrary.ts` to `src/utils/EnchantmentLibrary.ts`
- [ ] Create `export class EnchantmentLibrary` with static methods
- [ ] Add JSDoc class documentation

### Task 24: Move constants out and import from equipmentConstants.ts
- [ ] Remove all individual enchantment constants (now in equipmentConstants.ts)
- [ ] Remove all curse constants (now in equipmentConstants.ts)
- [ ] Remove all collection constants (now in equipmentConstants.ts)
- [ ] Add import: `import { ENCHANTMENT_LIBRARY as ENCHANTMENT_CONSTANTS } from './equipmentConstants.js'`

### Task 25: Convert factory functions to static methods
- [ ] Convert `createStrengthEnchantment(bonus)` to static method
- [ ] Convert `createDexterityEnchantment(bonus)` to static method
- [ ] Convert `createConstitutionEnchantment(bonus)` to static method
- [ ] Convert `createIntelligenceEnchantment(bonus)` to static method
- [ ] Convert `createWisdomEnchantment(bonus)` to static method
- [ ] Convert `createCharismaEnchantment(bonus)` to static method

### Task 26: Convert utility functions to static methods

**IMPORTANT**: These functions now use renamed constants (e.g., `PLUS_ONE` not `ENCHANTMENT_PLUS_ONE`)
- [ ] Convert `getEnchantment(id)` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.ENCHANTMENTS`
  - [ ] Note: ID lookup should work with new names (e.g., `getEnchantment('PLUS_ONE')`)
- [ ] Convert `getCurse(id)` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.CURSES`
  - [ ] Note: ID lookup should work with new names (e.g., `getCurse('BERSERKER')`)
- [ ] Convert `getAllEnchantments()` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.ENCHANTMENTS` (all renamed enchantments)
- [ ] Convert `getAllCurses()` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.CURSES` (all renamed curses)
- [ ] Convert `getEnchantmentsByType(type)` to static method
  - [ ] Update to read from `ENCHANTMENT_CONSTANTS.COLLECTIONS`
  - [ ] Ensure collections reference the renamed constants

### Task 27: Verify class compiles
- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Ensure all static methods are properly typed

---

## Phase 4: Update Public API and Clean Up

### Task 28: Update src/index.ts exports
- [ ] Update equipment-related imports:
  - [ ] Change from `constants.ts` to `equipmentConstants.ts` where needed
  - [ ] Change from `enchantmentLibrary.ts` to `EnchantmentLibrary.ts`
  - [ ] Change from `magicItemExamples.ts` to `equipmentConstants.ts` (for constants)

- [ ] Update public API exports:
  - [ ] Export `DEFAULT_EQUIPMENT` (was `EQUIPMENT_DATABASE`)
  - [ ] Export `CLASS_STARTING_EQUIPMENT`
  - [ ] Export `MAGIC_ITEMS` (was `MAGIC_ITEM_EXAMPLES`)
  - [ ] Export `ITEM_CREATION_TEMPLATES` (was `MAGIC_EQUIPMENT_TEMPLATES`)
  - [ ] Export `ENCHANTMENT_LIBRARY`
  - [ ] Export `EnchantmentLibrary` class
  - [ ] Keep all function exports (factory functions now accessed via class)

- [ ] Update factory function exports to use class:
  - [ ] `createStrengthEnchantment` → `EnchantmentLibrary.createStrengthEnchantment`
  - [ ] `createDexterityEnchantment` → `EnchantmentLibrary.createDexterityEnchantment`
  - [ ] `createConstitutionEnchantment` → `EnchantmentLibrary.createConstitutionEnchantment`
  - [ ] `createIntelligenceEnchantment` → `EnchantmentLibrary.createIntelligenceEnchantment`
  - [ ] `createWisdomEnchantment` → `EnchantmentLibrary.createWisdomEnchantment`
  - [ ] `createCharismaEnchantment` → `EnchantmentLibrary.createCharismaEnchantment`

### Task 29: Clean up magicItemExamples.ts
- [ ] Remove all constants (moved to equipmentConstants.ts)
- [ ] Keep helper functions: `getMagicItem`, `getMagicItemsByType`, `getMagicItemsByRarity`, `getCursedItems`, `getItemsWithProperty`, `applyTemplate`
- [ ] Update functions to import from `equipmentConstants.ts`
- [ ] Add file documentation explaining it now only contains helper functions

### Task 30: Verify backward compatibility
- [ ] Run `tsc --noEmit` to ensure no breaking type errors
- [ ] Check that commonly-used exports are still accessible
- [ ] Document any breaking changes in API

---

## Phase 5: Testing and Verification

### Task 31: Type checking
- [ ] Run `tsc --noEmit` - should have 0 errors
- [ ] Fix any type errors that appear

### Task 32: Run equipment tests
- [ ] Run `tests/unit/equipmentGenerator.test.ts`
- [ ] Run `tests/unit/equipmentSpawnHelper.test.ts`
- [ ] Run `tests/unit/equipmentModifier.test.ts`
- [ ] Run `tests/unit/equipmentEffectApplier.test.ts`
- [ ] Run `tests/unit/equipmentValidator.test.ts`
- [ ] Run `tests/integration/equipmentSystem.integration.test.ts`
- [ ] Fix any failing tests

### Task 33: Run all tests
- [ ] Run full test suite
- [ ] Fix any failures related to import changes

### Task 34: Manual verification
- [ ] Verify equipment can be generated from DEFAULT_EQUIPMENT
- [ ] Verify magic items can be retrieved from MAGIC_ITEMS
- [ ] Verify item creation templates can be applied
- [ ] Verify enchantments can be created via EnchantmentLibrary class
- [ ] Verify curses can be created via EnchantmentLibrary class
- [ ] Test direct access: `ENCHANTMENT_LIBRARY.ENCHANTMENTS.PLUS_ONE`
- [ ] Test lookup: `EnchantmentLibrary.getEnchantment('PLUS_ONE')`

### Task 35: Documentation updates
- [ ] Update EQUIPMENT_SYSTEM.md if it references old file locations
- [ ] Update any other documentation that references the old structure
- [ ] Add migration notes for any external consumers

---

## Summary of Changes

### Files Created
- `src/utils/equipmentConstants.ts` - Consolidated equipment constants

### Files Modified
- `src/utils/constants.ts` - Remove equipment constants
- `src/utils/magicItemExamples.ts` - Remove constants, update imports
- `src/utils/enchantmentLibrary.ts` → `src/utils/EnchantmentLibrary.ts` - Convert to class
- `src/index.ts` - Update public API exports
- `src/core/combat/CombatEngine.ts` - Update imports
- `src/core/generation/EquipmentGenerator.ts` - Update imports
- `src/core/extensions/initializeDefaults.ts` - Update imports
- `src/core/equipment/EquipmentSpawnHelper.ts` - Update imports
- 6 test files - Update imports

### New Import Patterns

```typescript
// Old
import { EQUIPMENT_DATABASE } from './utils/constants';
import { MAGIC_ITEM_EXAMPLES, MAGIC_EQUIPMENT_TEMPLATES } from './utils/magicItemExamples';
import { ENCHANTMENT_PLUS_ONE, createStrengthEnchantment } from './utils/enchantmentLibrary';

// New
import {
  DEFAULT_EQUIPMENT,
  MAGIC_ITEMS,
  ITEM_CREATION_TEMPLATES,
  ENCHANTMENT_LIBRARY
} from './utils/equipmentConstants';
import { EnchantmentLibrary } from './utils/EnchantmentLibrary';

// Usage
const item = DEFAULT_EQUIPMENT['Longsword'];
const magicItem = MAGIC_ITEMS.find(i => i.name === 'Flame Tongue');
const template = ITEM_CREATION_TEMPLATES['plus_one_weapon'];

// Access enchantments directly (from constants)
const plusOne = ENCHANTMENT_LIBRARY.ENCHANTMENTS.PLUS_ONE;
const berserkerCurse = ENCHANTMENT_LIBRARY.CURSES.BERSERKER;

// Or use lookup functions (from class)
const enchantment = EnchantmentLibrary.getEnchantment('PLUS_ONE');
const allEnchantments = EnchantmentLibrary.getAllEnchantments();
const statEnchantment = EnchantmentLibrary.createStrengthEnchantment(2);
```

### Enchantment Naming Changes

| Old Name | New Name | Access Pattern |
|----------|----------|----------------|
| `ENCHANTMENT_PLUS_ONE` | `PLUS_ONE` | `ENCHANTMENT_LIBRARY.ENCHANTMENTS.PLUS_ONE` |
| `ENCHANTMENT_FLAMING` | `FLAMING` | `ENCHANTMENT_LIBRARY.ENCHANTMENTS.FLAMING` |
| `CURSE_BERSERKER` | `BERSERKER` | `ENCHANTMENT_LIBRARY.CURSES.BERSERKER` |
| `CURSE_WEAKNESS` | `WEAKNESS` | `ENCHANTMENT_LIBRARY.CURSES.WEAKNESS` |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking external consumers' imports | Medium | Comprehensive export updates in index.ts |
| Test failures from import changes | Low | Systematic test file updates |
| Type errors from renamed constants | Low | Type checking between phases |
| Missing constant during move | Low | Checklist for each constant group |
| CLASS_STARTING_EQUIPMENT breaking something | Medium | Phase 0 research before move |
| Enchantment ID mismatches after rename | Medium | Update lookup functions to use new names |

---

## Completion Criteria

**Phase 0 (Research):**
- [ ] All files using `CLASS_STARTING_EQUIPMENT` identified
- [ ] Usage patterns documented
- [ ] No circular dependencies or runtime lookups found

**Phase 1 (Create Constants File):**
- [ ] All equipment constants in `equipmentConstants.ts`
- [ ] Enchantment/curses renamed (prefixes removed)
- [ ] File compiles without errors

**Phase 2 (Update Imports):**
- [ ] All core files updated with new imports
- [ ] All test files updated
- [ ] No remaining references to old import paths

**Phase 3 (Refactor EnchantmentLibrary):**
- [ ] `enchantmentLibrary.ts` converted to `EnchantmentLibrary` class
- [ ] All methods work with renamed constants
- [ ] Lookup functions use new naming (e.g., `getEnchantment('PLUS_ONE')`)

**Phase 4 (Public API):**
- [ ] `src/index.ts` exports updated
- [ ] Public API uses `ITEM_CREATION_TEMPLATES` name
- [ ] Backward compatibility verified

**Phase 5 (Testing):**
- [ ] All tests passing
- [ ] Type checking passes with 0 errors
- [ ] Documentation updated
